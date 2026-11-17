// C-kocka szimulátor: a kocka "firmware"-e (arc, fények, hang, viselkedés) + a telefonos vezérlőapp.
// Az app parancsokat küld a kockának (ugyanazon az oldalon, vagy külön ablakból BroadcastChannel-en át),
// a kocka eseményeket küld vissza. Minden üzenet megjelenik a protokollnaplóban.
import { LANG, T, applyStatic, addLangSwitch } from './i18n.js';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const APP_ONLY = new URLSearchParams(location.search).has('app');
if (APP_ONLY) document.body.classList.add('app-only');
applyStatic(); addLangSwitch(document.querySelector('.nav nav'));
// beágyazva (a főoldal iframe-jében): a magasságot elküldjük a szülőnek, hogy ne legyen belső görgetősáv
if (new URLSearchParams(location.search).has('embed') && window.parent !== window) {
  document.body.classList.add('embed');
  const report = () => window.parent.postMessage({ ckockaHeight: document.documentElement.scrollHeight }, '*');
  new ResizeObserver(report).observe(document.body); report();
}
const chan = 'BroadcastChannel' in window ? new BroadcastChannel('ckocka') : null;
const store = {
  get(k, d) { try { const v = localStorage.getItem('ckocka.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('ckocka.' + k, JSON.stringify(v)); } catch { /* privát mód: nem baj */ } },
};

// ------------------------------------------------------------------ állapot
const S = {
  on: false, persona: store.get('persona', 'sunny'), sliders: store.get('sliders', { humor: 80, energy: 60, chatty: 50, sarcasm: 30, kind: 90 }),
  party: false, dnd: false, peek: true, voice: true, hue: 28, bright: 0.8, nick: store.get('nick', 'Captain'),
  assign: { 2: 'horn', 3: 'gooo', 4: 'coffee' }, flipped: false, throws: 0, busy: false, call: null,
};
// A kocka mondatai előre generált hangfájlok (XTTS-v2, Whisperrel ellenőrizve): web/voice/<id>.mp3, szövegük: web/voice/lines.json.
// A böngésző beépített hangja magyar Windowson gyakran magyarul olvasta fel az angol szöveget – ezért nem arra támaszkodunk.
// rate: lejátszási sebesség (kicsit a hangmagasságot is emeli) – személyiségenként más
const PERSONAS = {
  sunny: { key: 'sunny', hue: 45, eye: '#8fe8ff', rate: 1.04 },
  chill: { key: 'chill', hue: 187, eye: '#9fd9ff', rate: 0.94 },
  hype: { key: 'hype', hue: 330, eye: '#ff9bd2', rate: 1.09 },
  sarcastic: { key: 'sarcastic', hue: 250, eye: '#b3a8ff', rate: 0.97 },
  pro: { key: 'pro', hue: 28, eye: '#8fe8ff', rate: 1.0 },
};
function persona() {
  if (S.persona !== 'custom') return PERSONAS[S.persona];
  const s = S.sliders, base = s.sarcasm > 60 ? PERSONAS.sarcastic : s.energy > 70 ? PERSONAS.hype : s.energy < 30 ? PERSONAS.chill : PERSONAS.sunny;
  return { ...base, hue: S.hue, rate: 0.94 + s.energy / 666 };
}
// viccek: "zsákból húzás" – véletlen sorrend, és egyik sem ismétlődik, amíg mind el nem hangzott
// (új kör után sem jöhet rögtön ugyanaz, mint ami utoljára volt)
let jokeBag = [], lastJoke = 0;
function nextJoke() {
  if (!jokeBag.length) {
    const n = Object.keys(LINES).filter(k => /^joke_\d+q$/.test(k)).length || 8;
    jokeBag = Array.from({ length: n }, (_, i) => i + 1);
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [jokeBag[i], jokeBag[j]] = [jokeBag[j], jokeBag[i]]; }
    if (n > 1 && jokeBag[n - 1] === lastJoke) [jokeBag[0], jokeBag[n - 1]] = [jokeBag[n - 1], jokeBag[0]];
  }
  return (lastJoke = jokeBag.pop());
}
const pick = n => 1 + Math.floor(Math.random() * n);
let LINES = {};
const linesReady = fetch('web/voice/lines.json').then(r => r.json()).then(a => { for (const l of a) LINES[l.id] = l.text; }).catch(() => {});

// ------------------------------------------------------------------ protokollnapló
function log(dir, type, data) {
  const ol = $('#log');
  if (!ol) return;
  const li = document.createElement('li');
  const t = new Date().toTimeString().slice(0, 8);
  li.innerHTML = `${t} ${dir} <b>${type}</b> ${data && Object.keys(data).length ? JSON.stringify(data) : ''}`;
  ol.prepend(li);
  while (ol.children.length > 80) ol.lastChild.remove();
}

// ================================================================== A KOCKA (firmware)
const cubeEl = $('#cube'), faceCv = $('#face'), g = faceCv?.getContext('2d');
const F = { mode: 'off', mouth: 'smile', talking: false, text: '', sub: '', look: { x: 0, y: 0 }, target: { x: 0, y: 0 }, blink: 0, nextBlink: 2, pointer: null, peeking: false, eq: null };
let audio = null, master = null, analyser = null;

// minden kattintás felébreszti a hangrendszert (a böngészők felfüggesztik, ha nem közvetlen kattintásra indult)
addEventListener('pointerdown', () => { if (audio && audio.state !== 'running') audio.resume(); }, { capture: true });
function ensureAudio() {
  if (audio) return;
  audio = new (window.AudioContext || window.webkitAudioContext)();
  master = audio.createGain(); master.gain.value = 0.5;
  analyser = audio.createAnalyser(); analyser.fftSize = 64;
  master.connect(analyser); analyser.connect(audio.destination);
}
function tone(freq, t0, dur, type = 'sine', vol = 0.3, slide = 0) {
  const o = audio.createOscillator(), gn = audio.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
  gn.gain.setValueAtTime(0, t0); gn.gain.linearRampToValueAtTime(vol, t0 + 0.01); gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(gn); gn.connect(master); o.start(t0); o.stop(t0 + dur + 0.05);
}
function noise(t0, dur, vol = 0.3, hp = 1000) {
  const b = audio.createBuffer(1, audio.sampleRate * dur, audio.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = audio.createBufferSource(), f = audio.createBiquadFilter(), gn = audio.createGain();
  f.type = 'highpass'; f.frequency.value = hp; s.buffer = b;
  gn.gain.setValueAtTime(vol, t0); gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f); f.connect(gn); gn.connect(master); s.start(t0);
}
const SFX = {
  boot() { const t = audio.currentTime; [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.12, 0.35, 'triangle', 0.18)); },
  horn() { const t = audio.currentTime; tone(233, t, 0.5, 'sawtooth', 0.18); tone(311, t + 0.05, 0.45, 'square', 0.08); },
  drum() { const t = audio.currentTime; tone(160, t, 0.12, 'sine', 0.4, 60); noise(t + 0.18, 0.12, 0.25, 1500); tone(140, t + 0.18, 0.1, 'sine', 0.3, 70); noise(t + 0.42, 0.5, 0.18, 6000); },
  whoosh() { const t = audio.currentTime; noise(t, 0.4, 0.2, 400); tone(300, t + 0.45, 0.25, 'sine', 0.3, 90); },
  ding() { const t = audio.currentTime; tone(880, t, 0.5, 'sine', 0.2); tone(1320, t + 0.08, 0.5, 'sine', 0.12); },
  buzz() { const t = audio.currentTime; for (let i = 0; i < 3; i++) tone(55, t + i * 0.3, 0.2, 'square', 0.06); },
  ring() { const t = audio.currentTime; for (let i = 0; i < 4; i++) { tone(988, t + i * 0.5, 0.18, 'square', 0.06); tone(784, t + i * 0.5 + 0.2, 0.18, 'square', 0.06); } },
};

// party: saját zene (C–G–Am–F, 110 BPM), a fények az ütemre
const PARTY = { timer: null, next: 0, step: 0, beatAt: [] };
function partyStart() {
  if (PARTY.timer) return;          // már szól – ne induljon el kétszer (dupla zene, ami kikapcsolás után is szólna)
  ensureAudio(); PARTY.next = audio.currentTime + 0.1; PARTY.step = 0;
  const chords = [[261.6, 329.6, 392], [196, 246.9, 293.7], [220, 261.6, 329.6], [174.6, 220, 261.6]];
  const spb = 60 / 110 / 2;   // nyolcad
  PARTY.timer = setInterval(() => {
    while (PARTY.next < audio.currentTime + 0.2) {
      const s = PARTY.step, t = PARTY.next, ch = chords[Math.floor(s / 8) % 4];
      if (s % 4 === 0) { tone(110, t, 0.18, 'sine', 0.5, 45); PARTY.beatAt.push(t); }
      if (s % 2 === 1) noise(t, 0.05, 0.08, 7000);
      if (s % 8 === 4) noise(t, 0.12, 0.15, 1800);
      if (s % 4 === 0) ch.forEach(f => tone(f, t, spb * 3.5, 'triangle', 0.05));
      tone(ch[0] / 2, t, spb * 0.9, 'sawtooth', 0.05);
      PARTY.step++; PARTY.next += spb;
    }
  }, 50);
}
function partyStop() { clearInterval(PARTY.timer); PARTY.timer = null; PARTY.beatAt = []; }

// beszéd: a böngésző angol hangja + felirat a kocka fölött
let enVoice = null;
function pickVoice() {
  const vs = speechSynthesis?.getVoices?.() || [];
  enVoice = vs.find(v => /en-US/i.test(v.lang) && /Aria|Jenny|Guy|Natural/i.test(v.name)) || vs.find(v => /en-US/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || null;
}
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
let subTimer = null;
let sayToken = 0;
const clips = {};                 // id -> AudioBuffer (első használatkor töltjük be)
let voiceSrc = null, voiceAn = null;
async function clip(id) {
  if (clips[id] !== undefined) return clips[id];
  try {
    const r = await fetch(`web/voice/${id}.mp3`);
    if (!r.ok) throw new Error(r.status);
    clips[id] = await audio.decodeAudioData(await r.arrayBuffer());
  } catch { clips[id] = null; }
  return clips[id];
}
// a leállítás minden folyamatban lévő (akár még töltődő) mondatot érvénytelenít
function stopVoice() { sayToken++; try { voiceSrc?.stop(); } catch { /* már leállt */ } voiceSrc = null; speechSynthesis?.cancel(); F.talking = false; }
let voiceGain = null;
function voiceChain() {           // a beszéd útja EGYSZER kötve: forrás -> mérő -> erősítő -> master (különben mondatonként hangosodna)
  if (!voiceAn) {
    voiceAn = Object.assign(audio.createAnalyser(), { fftSize: 256 });
    voiceGain = audio.createGain(); voiceGain.gain.value = 1.6;
    voiceAn.connect(voiceGain); voiceGain.connect(master);
  }
  return voiceAn;
}
const canSpeak = () => S.on && !S.flipped && !S.dnd;
// say(id): a kocka kimondja a lines.json adott mondatát; a feliratban a "Captain" helyére a beállított megszólítás kerül
// sayText(text): szabad szöveg (pl. Claude válasza) – ehhez nincs előre generált hangfájl, a böngésző angol hangja mondja
const say = (id, opts) => speak({ id, ...opts });
const sayText = (text, opts) => speak({ text, ...opts });
async function speak({ id = null, text = null, mouthAfter = 'smile', sub = null } = {}) {
  if (S.flipped || !S.on) return;
  if (S.dnd) { subtitle('📳 (Ne zavarj: csak finoman rezeg)'); vibrate(); return; }
  if (id) { await linesReady; text = LINES[id] || id; }
  log('kocka', 'speech.say', id ? { id, text } : { text });
  subtitle(sub || '“' + text.replace(/Captain/g, S.nick) + '”', Math.max(4200, 1500 + text.length * 75));
  ensureAudio(); stopVoice();
  F.talking = true;
  const token = ++sayToken;          // ha egy újabb mondat megszakítja ezt, a régi vége ne zárja be az új száját
  const p = persona();
  const buf = S.voice && id ? await clip(id) : null;
  if (token !== sayToken) return;
  if (!canSpeak()) { F.talking = false; return; }   // betöltés közben megfordították / Ne zavarj / kikapcsolták
  await new Promise(res => {
    let fin = false;
    const done = () => { if (fin) return; fin = true; if (token === sayToken) { F.talking = false; F.mouth = mouthAfter; voiceSrc = null; } res(); };
    if (buf) {
      const src = audio.createBufferSource();
      src.buffer = buf; src.playbackRate.value = p.rate;
      src.connect(voiceChain());
      src.onended = done; voiceSrc = src;
      if (audio.state !== 'running') audio.resume();
      src.start();
      // biztonsági időkorlát: ha a böngésző nem küldi el a "vége" jelzést (pl. felfüggesztett hang), a hossz alapján lépünk tovább –
      // különben a vicc csattanója a következő kattintásig várna
      setTimeout(done, (buf.duration / p.rate) * 1000 + 600);
    } else if (S.voice && enVoice && 'speechSynthesis' in window) {   // tartalék: csak valódi angol hanggal
      const u = new SpeechSynthesisUtterance(text);
      u.voice = enVoice; u.lang = enVoice.lang; u.rate = p.rate;
      u.onend = done; u.onerror = done; speechSynthesis.speak(u);
    } else setTimeout(done, 600 + text.length * 55);   // hang nélkül: csak felirat
  });
}
function voiceLevel() {   // a száj nyitása a hang valódi hangereje szerint
  if (!voiceAn || !voiceSrc) return null;
  const d = new Uint8Array(voiceAn.fftSize); voiceAn.getByteTimeDomainData(d);
  let s = 0; for (const v of d) s += (v - 128) ** 2;
  return Math.min(1, Math.sqrt(s / d.length) / 40);
}
function subtitle(txt, ms = 4200) {
  const el = $('#subtitle'); el.textContent = T(txt); el.classList.add('on');
  clearTimeout(subTimer); subTimer = setTimeout(() => el.classList.remove('on'), ms);
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
function vibrate() { cubeEl.classList.remove('buzz'); void cubeEl.offsetWidth; cubeEl.classList.add('buzz'); ensureAudio(); SFX.buzz(); subtitle('📳 (Ne zavarj: csak finoman rezeg)', 2200); }
// jelenetek: mindegyik kap egy sorszámot; a végén csak a LEGUTÓBBI jelenet állítja vissza az arcot, és az állapotnak megfelelően
let sceneId = 0;
const newScene = () => ++sceneId;
function backToFace(scene) {
  if (scene !== undefined && scene !== sceneId) return;
  F.mode = !S.on ? 'off' : S.flipped ? 'privacy' : S.dnd ? 'dnd' : S.party ? 'eq' : 'face';
  F.textColor = null;
}
function emit(type, data = {}) { log('kocka → app', type, data); chan?.postMessage({ dir: 'event', type, data }); }

// fények
function applyLights() {
  const r = document.documentElement.style;
  const p = persona();
  const hue = S.party ? S.partyHue : S.hue;
  let glow = S.bright;
  if (!S.on) glow = 0; else if (S.flipped) glow = 0.08; else if (S.dnd) glow = 0.15; else if (S.party) glow = S.partyPulse;
  r.setProperty('--light', `hsl(${hue} 100% 58%)`);
  r.setProperty('--glow', glow.toFixed(3));
  F.eye = p.eye;
}
S.partyHue = 28; S.partyPulse = 0.8;

// ------------------------------------------------------------------ arc rajzolása
function drawFace(dt, now) {
  if (!g) return;
  const W = 320, c = W / 2;
  g.clearRect(0, 0, W, W);
  g.fillStyle = '#050608'; g.fillRect(0, 0, W, W);
  if (F.mode === 'off') return;
  const eye = F.eye || '#8fe8ff';
  g.shadowColor = eye; g.shadowBlur = 18; g.fillStyle = eye; g.strokeStyle = eye; g.lineCap = 'round';
  // tekintet: egér követése / leskelődés / elnézés
  F.look.x += (F.target.x - F.look.x) * Math.min(1, dt * (F.snap ? 18 : 6));
  F.look.y += (F.target.y - F.look.y) * Math.min(1, dt * (F.snap ? 18 : 6));
  // pislogás
  F.nextBlink -= dt;
  if (F.nextBlink < 0) { F.blink = 1; F.nextBlink = 2.5 + Math.random() * 3.5; }
  F.blink = Math.max(0, F.blink - dt * 7);
  const open = 1 - Math.sin(Math.min(1, F.blink) * Math.PI);
  const ex = F.look.x * 22, ey = F.look.y * 16;

  if (F.mode === 'face' || F.mode === 'listen') {
    const lid = F.peeking ? 0.55 : 1;
    for (const sx of [-1, 1]) {
      const h = 46 * open * lid;
      rrect(c + sx * 52 + ex - 20, c - 34 + ey - h / 2, 40, Math.max(4, h), 18); g.fill();
    }
    // száj
    const my = c + 48 + ey * 0.4, mx = c + ex * 0.4;
    g.lineWidth = 10;
    if (F.talking) {
      const lv = voiceLevel(), a = 6 + (lv == null ? Math.abs(Math.sin(now * 17) * Math.sin(now * 7.3)) : lv) * 30;
      g.beginPath(); g.ellipse(mx, my, 26, a / 2, 0, 0, Math.PI * 2); g.fill();
    } else if (F.mouth === 'grin') {
      g.beginPath(); g.arc(mx, my - 14, 40, 0.15 * Math.PI, 0.85 * Math.PI); g.closePath(); g.fill();
    } else if (F.mouth === 'flat') {
      g.beginPath(); g.moveTo(mx - 26, my); g.lineTo(mx + 26, my); g.stroke();
    } else if (F.mouth === 'worried') {
      g.beginPath(); g.arc(mx, my + 26, 28, 1.2 * Math.PI, 1.8 * Math.PI); g.stroke();
    } else if (F.mouth === 'o') {
      g.beginPath(); g.arc(mx, my, 12, 0, Math.PI * 2); g.stroke();
    } else {
      g.beginPath(); g.arc(mx, my - 16, 30, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
    }
    if (F.mode === 'listen') {   // hallgatózik: pontok a száj helyén
      for (let i = 0; i < 3; i++) { g.globalAlpha = 0.3 + 0.7 * Math.max(0, Math.sin(now * 6 - i)); g.beginPath(); g.arc(c - 24 + i * 24, c + 60, 7, 0, 7); g.fill(); }
      g.globalAlpha = 1;
    }
  } else if (F.mode === 'dizzy') {
    g.lineWidth = 6;
    for (const sx of [-1, 1]) {
      g.beginPath();
      for (let a = 0; a < 14; a += 0.2) { const r = a * 2.2, x = c + sx * 52 + Math.cos(a + now * 8) * r, y = c - 30 + Math.sin(a + now * 8) * r; a ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
    }
    g.beginPath(); g.moveTo(c - 30, c + 56); for (let i = 1; i <= 6; i++) g.lineTo(c - 30 + i * 10, c + 56 + (i % 2 ? -8 : 8)); g.stroke();
  } else if (F.mode === 'text') {
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `800 ${F.textSize || 96}px Manrope, Segoe UI, sans-serif`; g.fillStyle = F.textColor || eye; g.shadowColor = g.fillStyle;
    g.fillText(F.text, c, F.sub ? c - 18 : c + 4);
    if (F.sub) { g.font = '600 26px Manrope, Segoe UI, sans-serif'; g.fillText(F.sub, c, c + 58); }
  } else if (F.mode === 'eq') {
    const d = new Uint8Array(analyser ? analyser.frequencyBinCount : 32);
    analyser?.getByteFrequencyData(d);
    g.shadowBlur = 12;
    for (let i = 0; i < 9; i++) {
      const v = (d[i + 1] || 0) / 255, h = 14 + v * 120 * (1 - Math.abs(i - 4) / 9);   // középen magasabb: beleférjen a kerek kijelzőbe
      g.fillStyle = `hsl(${(S.partyHue + i * 25) % 360} 100% 62%)`; g.shadowColor = g.fillStyle;
      rrect(c - 110 + i * 25, c + 48 - h, 18, h, 8); g.fill();
    }
  } else if (F.mode === 'privacy') {
    g.lineWidth = 8; g.shadowBlur = 6; g.globalAlpha = 0.5;
    for (const sx of [-1, 1]) { g.beginPath(); g.arc(c + sx * 52, c - 40, 22, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); }
    g.font = '600 26px Manrope, sans-serif'; g.textAlign = 'center'; g.fillText('🎙️✕ 📷✕', c, c + 50); g.globalAlpha = 1;
  } else if (F.mode === 'dnd') {
    g.lineWidth = 8; g.globalAlpha = 0.55;
    for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(c + sx * 52 - 20, c - 30); g.lineTo(c + sx * 52 + 20, c - 30); g.stroke(); }
    g.font = '700 24px Manrope, sans-serif'; g.textAlign = 'center'; g.fillText('Do not disturb', c, c + 52); g.globalAlpha = 1;
  } else if (F.mode === 'call') {
    const pz = 1 + 0.08 * Math.sin(now * 9);
    g.textAlign = 'center'; g.font = `${Math.round(70 * pz)}px sans-serif`; g.fillText('📞', c, c - 26);
    g.font = '800 40px Manrope, sans-serif'; g.fillText(S.call?.from || '', c, c + 52);
    g.font = '600 18px Manrope, sans-serif'; g.fillText(S.call?.live ? 'speakerphone' : 'tap to answer', c, c + 88);
  }
  g.shadowBlur = 0;
}
function rrect(x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

let last = performance.now();
function frame(t) {
  const dt = Math.min(0.1, (t - last) / 1000); last = t;
  const now = t / 1000;
  if (S.party && audio) {   // ütemre: színváltás és fényimpulzus
    while (PARTY.beatAt.length && PARTY.beatAt[0] <= audio.currentTime) { PARTY.beatAt.shift(); S.partyHue = (S.partyHue + 47) % 360; S.partyPulse = 1; }
    S.partyPulse = Math.max(0.35, S.partyPulse - dt * 1.6);
  }
  if (!APP_ONLY) { applyLights(); drawFace(dt, now); }
  requestAnimationFrame(frame);
}

// tekintet: követi az egeret a színpadon
$('#stage')?.addEventListener('pointermove', e => {
  const r = cubeEl.getBoundingClientRect();
  const x = (e.clientX - (r.left + r.width / 2)) / (r.width * 1.2), y = (e.clientY - (r.top + r.height / 2)) / (r.height * 1.2);
  F.pointer = { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) };
  if (!F.peeking && !F.lookAway) F.target = { ...F.pointer };
});
$('#stage')?.addEventListener('pointerleave', () => { F.pointer = null; if (!F.peeking) F.target = { x: 0, y: 0 }; });

// leskelődés: néha titokban rád néz – ha "visszanézel" (az egér a kockára megy), gyorsan elnéz
let peekTimer = null;
function schedulePeek() {
  clearTimeout(peekTimer);
  peekTimer = setTimeout(async () => {
    if (S.on && S.peek && !S.busy && !S.flipped && !S.dnd && !S.party && F.mode === 'face') {
      F.peeking = true; F.target = { x: 0, y: -0.05 }; $('#camLed').classList.add('on');
      log('kocka', 'camera.peek', {});
      await sleep(2600);
      if (F.peeking) { F.peeking = false; F.target = F.pointer ? { ...F.pointer } : { x: 0, y: 0 }; $('#camLed').classList.remove('on'); }
    }
    schedulePeek();
  }, 9000 + Math.random() * 9000);
}
cubeEl?.addEventListener('pointerenter', async () => {
  if (!F.peeking || S.busy) return;
  F.peeking = false; F.lookAway = true; F.snap = true; F.target = { x: 1, y: -0.6 }; $('#camLed').classList.remove('on');
  emit('event.caught_peeking', {});
  await say(S.persona === 'sarcastic' ? 'peek_2' : 'peek_1');
  await sleep(500); F.lookAway = false; F.snap = false; F.target = F.pointer ? { ...F.pointer } : { x: 0, y: 0 };
});

// ------------------------------------------------------------------ viselkedés
async function boot() {
  if (S.on) return;
  ensureAudio(); S.on = true; cubeEl.classList.remove('off'); $('#power').textContent = T('⏻ Kikapcsolás');
  log('kocka', 'power.on', {});
  SFX.boot(); F.mode = 'face'; F.mouth = 'smile';
  S.busy = true;
  try {
  await sleep(600);
  await say('boot1');
  const lastSeen = store.get('lastSeen', null), nowMs = Date.now();
  store.set('lastSeen', nowMs);
  let since = '14 hours, 3 minutes and 12 seconds';
  if (lastSeen) {
    const s = Math.max(1, Math.round((nowMs - lastSeen) / 1000)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
    since = (h ? `${h} hours, ` : '') + (m ? `${m} minutes and ` : '') + `${sec} seconds`;
  }
  emit('event.welcome', { lastSeenAgo: since });
  await say('boot2', { sub: `“Welcome back, ${S.nick}! I haven't seen you for ${since}.”` });
  await sleep(200); await say('boot3', { mouthAfter: 'grin' });
  await sleep(700); F.mouth = 'smile';
  } finally { S.busy = false; }
  schedulePeek(); broadcastState();
}
function powerOff() {
  S.on = false; S.party = false; partyStop(); stopVoice(); newScene(); F.mode = 'off'; S.call = null;
  cubeEl.classList.add('off'); $('#power').textContent = T('⏻ Bekapcsolás'); $('#party').checked = false;
  log('kocka', 'power.off', {}); broadcastState();
}
async function needOn() { if (!S.on) await boot(); return !S.flipped; }

async function pressButton(n) {
  const cap = $(`.cap[data-btn="${n}"]`); cap?.classList.add('pressed'); setTimeout(() => cap?.classList.remove('pressed'), 150);
  if (!(await needOn())) return;
  if (S.busy) { log('kocka', 'button.ignored', { id: n, reason: 'busy' }); return; }   // egy vicc vagy mondat közben nem vágunk bele
  emit('event.button', { id: n });
  if (S.dnd) return vibrate();
  const sc = newScene();
  if (n === 1) {   // Andor: dad joke
    const j = nextJoke();
    S.busy = true;
    try { await say(`joke_${j}q`); await sleep(700); await say(`joke_${j}a`, { mouthAfter: 'grin' }); if (canSpeak()) SFX.drum(); await sleep(1200); F.mouth = 'smile'; }
    finally { S.busy = false; }
    return;
  }
  const snd = S.assign[n];
  if (snd === 'horn') { SFX.horn(); F.mouth = 'o'; setTimeout(() => F.mouth = 'smile', 600); }
  else if (snd === 'drum') { SFX.drum(); F.mouth = 'grin'; setTimeout(() => F.mouth = 'smile', 900); }
  else if (snd === 'gooo') { F.mode = 'text'; F.text = '🔥'; F.textSize = 120; F.sub = ''; await say('btn_gooo'); backToFace(sc); }
  else if (snd === 'coffee') {
    await say('btn_coffee'); if (sc !== sceneId || !canSpeak()) return;
    F.mode = 'text'; F.text = 'YES'; F.sub = 'Obviously.'; F.textSize = 96; F.textColor = '#5cf28a'; SFX.ding(); await sleep(1800); backToFace(sc);
  }
}
async function throwCube() {
  if (!(await needOn())) return;
  S.throws++; emit('event.throw', { count: S.throws });
  cubeEl.classList.remove('throw'); void cubeEl.offsetWidth; cubeEl.classList.add('throw');
  const sc = newScene();
  SFX.whoosh(); F.mode = 'dizzy'; S.busy = true;
  try {
    await sleep(1300);
    await say(S.throws === 1 ? 'throw_1' : 'throw_n', { sub: S.throws === 1 ? null : `“Ouch! Again? That's ${S.throws} throws today. Okay, coffee break.”` });
    await sleep(1200); backToFace(sc);
  } finally { S.busy = false; }
}
async function shakeCube() {
  if (!(await needOn())) return;
  cubeEl.classList.remove('shake'); void cubeEl.offsetWidth; cubeEl.classList.add('shake');
  const sc = newScene();
  S.busy = true; F.mode = 'text'; F.text = '…'; F.sub = ''; F.textSize = 110; F.textColor = null;
  try {
    await sleep(900); if (sc !== sceneId || !canSpeak()) return backToFace(sc);
    const yes = Math.random() < 0.5; F.text = yes ? 'YES' : 'NO'; F.textColor = yes ? '#5cf28a' : '#ff6b6b';
    emit('event.shake', { answer: F.text }); SFX.ding();
    await sleep(2200); backToFace(sc);
  } finally { S.busy = false; }
}
async function flipCube() {
  // kikapcsolt kockát a fordítás NEM kapcsol be (különben fejjel lefelé köszönne, bekapcsolt mikrofonnal)
  S.flipped = !S.flipped; cubeEl.classList.toggle('flipped', S.flipped); $('#flip').classList.toggle('on', S.flipped);
  newScene();
  emit('event.orientation', { upsideDown: S.flipped, microphone: !S.flipped, camera: !S.flipped });
  if (S.flipped) {
    stopVoice(); if (S.party) setParty(false); TALK.rec?.abort();
    $('#camLed').classList.remove('on'); subtitle('🔒 Fejjel lefelé: mikrofon és kamera kikapcsolva', 3000);
  } else subtitle('Mikrofon és kamera újra bekapcsolva', 2200);
  backToFace();
  syncAppUI(); broadcastState();
}
async function tired() {
  if (!(await needOn())) return;
  if (S.busy || S.dnd) return;
  $('#camLed').classList.add('on'); emit('event.camera', { face: 'tired' });
  newScene();
  F.mouth = 'worried'; S.busy = true;
  try {
    await sleep(800);
    await say('tired');
    $('#camLed').classList.remove('on');
    const j = nextJoke();
    await sleep(400); await say(`joke_${j}q`); await sleep(700); await say(`joke_${j}a`, { mouthAfter: 'grin' }); if (canSpeak()) SFX.drum();
    await sleep(1200); F.mouth = 'smile';
  } finally { S.busy = false; $('#camLed').classList.remove('on'); }
}
async function incomingCall() {
  if (!(await needOn())) return;
  S.call = { from: 'BRO', live: false }; emit('event.call', { from: 'BRO' });
  if (S.dnd) { vibrate(); subtitle('📳 Hívás: BRO – Ne zavarj módban csak rezeg'); S.call = null; return; }
  const sc = newScene();
  F.mode = 'call'; SFX.ring();
  await sleep(4500);
  if (S.call && !S.call.live) { S.call = null; backToFace(sc); subtitle('Nem fogadott hívás: BRO', 2500); }
}
async function touch() {
  if (!(await needOn())) return;
  if (S.call && !S.call.live) {   // hívás fogadása
    const sc = newScene();
    S.call.live = true; emit('event.call_answered', { from: S.call.from }); subtitle('🔊 Kihangosítás: a hívás a kockán keresztül megy', 3500);
    await sleep(4000); S.call = null; backToFace(sc); emit('event.call_ended', {}); return;
  }
  if (S.dnd) return vibrate();
  if (S.busy) return;
  if (TALK.ready && SR) return listen();   // ha él a beszélgetés, az érintés tényleg hallgatni kezd
  const sc = newScene();
  $('#touch').classList.add('listening'); F.mode = 'listen'; F.target = { x: 0, y: -0.7 };
  emit('event.touch', { action: 'listen' });
  await sleep(1600);
  $('#touch').classList.remove('listening'); F.target = F.pointer ? { ...F.pointer } : { x: 0, y: 0 };
  if (sc !== sceneId) return;
  backToFace(sc);
  const p = persona(), time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (Math.random() < 0.5) { F.mode = 'text'; F.text = time; F.sub = ''; F.textSize = 84; F.textColor = null; await say('time', { sub: `“It's ${time}, ${S.nick}.”` }); await sleep(900); backToFace(sc); }
  else await say(`idle_${p.key}_${pick(3)}`);
}
// ------------------------------------------------------------------ beszélgetés Claude-dal
// A böngésző felismeri, amit mondasz (vagy beírod), a helyi szerver (serve.js → talk.js) Claude-tól kér rá választ,
// a kocka pedig kimondja. A kulcs a szerveren marad; a nyilvános oldalon (GitHub Pages) ez a rész nem él.
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const TALK = { ready: false, mock: false, reason: null, history: [], rec: null };
const TALK_NOTES = {
  offline: 'A beszélgetéshez a kocka „agya” kell: töltsd le a projektet, és indítsd el helyben a <code>node serve.js</code> paranccsal, Claude API-kulccsal. A nyilvános oldalon ez nem fut, mert a kulcs nem kerülhet egy weboldalba.',
  'no-key': 'A szerver fut, de nincs Claude API-kulcs. Állítsd be az <code>ANTHROPIC_API_KEY</code> környezeti változót, és indítsd újra a <code>node serve.js</code>-t. Kulcs nélküli próbához: <code>CKOCKA_TALK_MOCK=1</code>.',
  'old-node': 'A Claude SDK-hoz Node 18 vagy újabb kell, ezen a gépen régebbi fut.',
  'no-sdk': 'Hiányzik a Claude SDK: futtasd az <code>npm install</code> parancsot, majd indítsd újra a szervert.',
};
function updateTalkUI() {
  const ok = TALK.ready && !APP_ONLY;
  $('#say').disabled = $('#send').disabled = !ok;
  $('#mic').disabled = !ok || !SR;
  let note = ok ? '' : T(TALK_NOTES[TALK.reason] || TALK_NOTES.offline);
  if (ok && TALK.mock) note = T('Próbamód: a válaszok előre megírtak, nem Claude-tól jönnek.');
  if (ok && !SR) note += (note ? ' ' : '') + T('Ez a böngésző nem ismeri a beszédfelismerést, írd be, mit mondanál.');
  if (ok && !TALK.mock) note += (note ? ' ' : '') + T('A kocka angolul válaszol. Ha leveszed a hangját, a választ feliratként olvashatod.');
  $('#talkNote').innerHTML = note;
}
async function talkStatus() {
  try {
    const r = await fetch('api/talk', { cache: 'no-store' });
    if (!r.ok) throw new Error(r.status);
    Object.assign(TALK, { reason: null }, await r.json());
  } catch { TALK.ready = false; TALK.reason = 'offline'; }
  updateTalkUI();
}
function listen() {
  if (TALK.rec) { TALK.rec.stop(); return; }           // második kattintás: elég, feldolgozhatod
  if (!SR || S.flipped || S.dnd || S.busy) return;
  const rec = new SR();
  rec.lang = $('#lang').value; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
  let heard = '', err = null;
  const sc = newScene();
  TALK.rec = rec;
  rec.onstart = () => {
    $('#mic').classList.add('on'); $('#touch').classList.add('listening');
    F.mode = 'listen'; F.target = { x: 0, y: -0.7 }; F.snap = false;
    emit('event.listen', { lang: rec.lang });
    subtitle('🎙️ Hallgatlak…', 8000);
  };
  rec.onresult = e => {
    heard = [...e.results].map(r => r[0].transcript).join(' ').trim();
    if (heard) subtitle('🎙️ ' + heard, 8000);
  };
  rec.onerror = e => { err = e.error; };
  rec.onend = () => {
    TALK.rec = null;
    $('#mic').classList.remove('on'); $('#touch').classList.remove('listening');
    F.target = F.pointer ? { ...F.pointer } : { x: 0, y: 0 };
    backToFace(sc);
    if (S.flipped) return;                               // fejjel lefelé: amit hallott, eldobjuk
    if (heard) return converse(heard);
    if (err === 'not-allowed' || err === 'service-not-allowed') subtitle('🔇 Nem kaptam engedélyt a mikrofonhoz. Gépelj, vagy engedélyezd a böngészőben.', 5000);
    else if (err === 'network') subtitle('🔇 A böngésző beszédfelismerője most nem érhető el. Gépelj inkább!', 5000);
    else if (err !== 'aborted') subtitle('🤷 Nem hallottam semmit.', 2200);
  };
  try { rec.start(); } catch { TALK.rec = null; }
}
async function converse(text) {
  text = String(text || '').trim().slice(0, 300);
  if (!text || !TALK.ready) return;
  if (!(await needOn())) return;
  if (S.dnd) return vibrate();
  if (S.busy) { subtitle('Egy pillanat, még mondok valamit…', 1800); return; }
  S.busy = true;
  const sc = newScene();
  stopVoice(); if (S.party) setParty(false);
  TALK.history.push({ role: 'user', content: text });
  emit('event.voice_query', { text });
  // gondolkodik: felfelé néz, a fény lüktet
  backToFace(sc); F.mouth = 'flat'; F.target = { x: 0.55, y: -0.65 }; cubeEl.classList.add('thinking');
  subtitle(T('Te: „{0}”   🤔', text), 20000);
  let res = null, why = '';
  try {
    const r = await fetch('api/talk', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ persona: S.persona, sliders: S.sliders, nick: S.nick, history: TALK.history }),
    });
    const d = await r.json().catch(() => ({}));
    if (r.ok && d.reply) res = d; else why = d.reason || d.error || r.status;
  } catch { why = 'hálózat'; }
  cubeEl.classList.remove('thinking');
  F.target = F.pointer ? { ...F.pointer } : { x: 0, y: 0 };
  try {
    if (sc !== sceneId || !canSpeak()) { TALK.history.pop(); return; }   // közben megfordították / kikapcsolták
    if (!res) {
      TALK.history.pop();
      log('kocka', 'talk.error', { why });
      F.mouth = 'worried'; subtitle(T('😵 Most nem értem el az agyamat ({0}). Próbáld újra!', why), 4000);
      await sleep(2500); if (sc === sceneId) F.mouth = 'smile';
      return;
    }
    TALK.history.push({ role: 'assistant', content: res.reply });
    TALK.history = TALK.history.slice(-12);
    emit('event.voice_reply', { text: res.reply, mood: res.mood });
    F.mouth = res.mood;
    await sayText(res.reply, { mouthAfter: res.mood });
    await sleep(1500); if (sc === sceneId && F.mouth === res.mood) F.mouth = 'smile';
  } finally { S.busy = false; }
}
if (!APP_ONLY) {
  $('#talk').addEventListener('submit', e => { e.preventDefault(); const t = $('#say').value; $('#say').value = ''; converse(t); });
  $('#mic').addEventListener('click', listen);
  $('#lang').value = store.get('lang', navigator.language?.startsWith('hu') ? 'hu-HU' : 'en-US');
  $('#lang').addEventListener('change', e => store.set('lang', e.target.value));
  talkStatus();
} else $('#talk').hidden = true;

function setParty(on) {
  S.party = !!(on && S.on && !S.flipped && !S.dnd);
  $('#party').checked = S.party; cubeEl.classList.toggle('party', S.party);
  if (S.party) partyStart(); else partyStop();
  newScene(); backToFace();
}

// ------------------------------------------------------------------ parancsok az apptól
async function handle(type, d) {
  switch (type) {
    case 'persona.set': {
      S.persona = d.name; store.set('persona', d.name); if (d.name !== 'custom') S.hue = PERSONAS[d.name].hue;
      syncAppUI(); broadcastState();                 // az app azonnal frissüljön – a köszönés csak utána jön
      if (canSpeak()) { while (S.busy) await sleep(200); if (S.persona === d.name && canSpeak()) await say('greet_' + persona().key); }
      return;
    }
    case 'persona.custom': S.sliders = { ...S.sliders, ...d }; store.set('sliders', S.sliders); break;
    case 'mode.party':                               // a legutolsó kérés számít (ha közben bekapcsol a kocka)
      S.partyWanted = d.on;
      if (!S.on && d.on) await boot();
      setParty(S.partyWanted); break;
    case 'mode.dnd': S.dnd = d.on; if (d.on) { setParty(false); stopVoice(); } newScene(); backToFace(); break;
    case 'peek.set': S.peek = d.on; break;
    case 'voice.set': S.voice = d.on; if (!d.on) stopVoice(); break;
    case 'led.color': S.hue = d.hue; break;
    case 'led.brightness': S.bright = d.value; break;
    case 'user.nickname': S.nick = d.name || 'Captain'; store.set('nick', S.nick); break;
    case 'button.assign': S.assign[d.button] = d.sound; break;
    case 'state.request': broadcastState(); return;
  }
  syncAppUI(); broadcastState();
}
function broadcastState() {
  if (APP_ONLY || !chan) return;
  const { on, persona: p, sliders, party, dnd, peek, voice, hue, bright, nick, assign, flipped } = S;
  chan.postMessage({ dir: 'state', data: { on, persona: p, sliders, party, dnd, peek, voice, hue, bright, nick, assign, flipped } });
}

// ================================================================== AZ APP
function send(type, data = {}) {
  log('app → kocka', type, data);
  if (APP_ONLY) chan?.postMessage({ dir: 'cmd', type, data });
  else handle(type, data);
}
function syncAppUI(st = S) {
  $$('#persona button').forEach(b => b.classList.toggle('sel', b.dataset.p === st.persona));
  $('#sliders').hidden = st.persona !== 'custom';
  $$('#sliders input').forEach(i => { i.value = st.sliders[i.dataset.s]; });
  $('#party').checked = st.party; $('#dnd').checked = st.dnd; $('#peek').checked = st.peek; $('#voice').checked = st.voice;
  $$('#swatches button').forEach(b => b.classList.toggle('sel', +b.dataset.h === st.hue));
  $('#bright').value = Math.round(st.bright * 100);
  if (document.activeElement !== $('#nick')) $('#nick').value = st.nick;
  $$('.assign select').forEach(s => { s.value = st.assign[s.dataset.a]; });
  const bt = $('#bt');
  bt.textContent = T(!st.on ? 'ᛒ kocka kikapcsolva' : st.flipped ? '🔒 mikrofon, kamera KI' : 'ᛒ csatlakoztatva');
  bt.classList.toggle('off', !st.on || st.flipped);
}
$$('#persona button').forEach(b => b.addEventListener('click', () => send('persona.set', { name: b.dataset.p })));
$$('#sliders input').forEach(i => i.addEventListener('change', () => send('persona.custom', { [i.dataset.s]: +i.value })));
$('#party').addEventListener('change', e => send('mode.party', { on: e.target.checked }));
$('#dnd').addEventListener('change', e => send('mode.dnd', { on: e.target.checked }));
$('#peek').addEventListener('change', e => send('peek.set', { on: e.target.checked }));
$('#voice').addEventListener('change', e => send('voice.set', { on: e.target.checked }));
$$('#swatches button').forEach(b => b.addEventListener('click', () => send('led.color', { hue: +b.dataset.h })));
$('#bright').addEventListener('input', e => send('led.brightness', { value: +e.target.value / 100 }));
$('#nick').addEventListener('change', e => send('user.nickname', { name: e.target.value.trim() }));
$$('.assign select').forEach(s => s.addEventListener('change', () => send('button.assign', { button: +s.dataset.a, sound: s.value })));
$('#popout').addEventListener('click', () => window.open('sim.html?app' + (LANG === 'en' ? '&lang=en' : ''), 'ckocka-app', 'width=440,height=900'));
if (APP_ONLY) $('#popout').hidden = true;

// csatorna: a kocka-oldal parancsot kap, az app-ablak állapotot
chan?.addEventListener('message', ({ data: m }) => {
  if (!APP_ONLY && m.dir === 'cmd') { log('app (ablak) → kocka', m.type, m.data); handle(m.type, m.data); }
  if (APP_ONLY && m.dir === 'state') syncAppUI(m.data);
  if (APP_ONLY && m.dir === 'event') log('kocka → app', m.type, m.data);
});

// ================================================================== a kocka kezelőszervei
if (!APP_ONLY) {
  $('#power').addEventListener('click', () => (S.on ? powerOff() : boot()));
  $$('.cap').forEach(b => b.addEventListener('click', () => pressButton(+b.dataset.btn)));
  $('#touch').addEventListener('click', touch);
  $('#throw').addEventListener('click', throwCube);
  $('#shake').addEventListener('click', shakeCube);
  $('#flip').addEventListener('click', flipCube);
  $('#tired').addEventListener('click', tired);
  $('#call').addEventListener('click', incomingCall);
  cubeEl.addEventListener('click', () => { if (S.call && !S.call.live) touch(); });
  cubeEl.classList.add('off');
  subtitle('Kapcsold be a kockát (⏻), vagy nyomd meg bármelyik gombját!', 6000);
} else {
  chan?.postMessage({ dir: 'cmd', type: 'state.request', data: {} });
}
S.hue = S.persona === 'custom' ? S.hue : PERSONAS[S.persona].hue;
syncAppUI();
requestAnimationFrame(frame);
window.ckocka = { S, F, handle };   // hibakereséshez
