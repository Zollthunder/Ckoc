// C-kocka szimulátor: a kocka "firmware"-e (arc, fények, hang, viselkedés) + a telefonos vezérlőapp.
// Az app parancsokat küld a kockának (ugyanazon az oldalon, vagy külön ablakból BroadcastChannel-en át),
// a kocka eseményeket küld vissza. Minden üzenet megjelenik a protokollnaplóban.
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const APP_ONLY = new URLSearchParams(location.search).has('app');
if (APP_ONLY) document.body.classList.add('app-only');
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
const JOKE_COUNT = 8;
let jokeIdx = Math.floor(Math.random() * JOKE_COUNT);
const nextJoke = () => (jokeIdx++ % JOKE_COUNT) + 1;
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
function stopVoice() { try { voiceSrc?.stop(); } catch { /* már leállt */ } voiceSrc = null; speechSynthesis?.cancel(); F.talking = false; }
// say(id): a kocka kimondja a lines.json adott mondatát; a feliratban a "Captain" helyére a beállított megszólítás kerül
async function say(id, { mouthAfter = 'smile', sub = null } = {}) {
  if (S.flipped || !S.on) return;
  if (S.dnd) { subtitle('📳 (Ne zavarj: csak finoman rezeg)'); vibrate(); return; }
  await linesReady;
  const text = LINES[id] || id;
  log('kocka', 'speech.say', { id, text });
  subtitle(sub || '“' + text.replace(/Captain/g, S.nick) + '”');
  ensureAudio(); stopVoice();
  F.talking = true;
  const token = ++sayToken;          // ha egy újabb mondat megszakítja ezt, a régi vége ne zárja be az új száját
  const p = persona();
  const buf = S.voice ? await clip(id) : null;
  if (token !== sayToken) return;
  await new Promise(res => {
    let fin = false;
    const done = () => { if (fin) return; fin = true; if (token === sayToken) { F.talking = false; F.mouth = mouthAfter; voiceSrc = null; } res(); };
    if (buf) {
      voiceAn = voiceAn || Object.assign(audio.createAnalyser(), { fftSize: 256 });
      const src = audio.createBufferSource(), gn = audio.createGain();
      src.buffer = buf; src.playbackRate.value = p.rate; gn.gain.value = 1.6;
      src.connect(voiceAn); voiceAn.connect(gn); gn.connect(master);
      src.onended = done; voiceSrc = src; src.start();
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
  const el = $('#subtitle'); el.textContent = txt; el.classList.add('on');
  clearTimeout(subTimer); subTimer = setTimeout(() => el.classList.remove('on'), ms);
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
function vibrate() { cubeEl.classList.remove('buzz'); void cubeEl.offsetWidth; cubeEl.classList.add('buzz'); ensureAudio(); SFX.buzz(); }
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
  if (!F.peeking) return;
  F.peeking = false; F.lookAway = true; F.snap = true; F.target = { x: 1, y: -0.6 }; $('#camLed').classList.remove('on');
  emit('event.caught_peeking', {});
  await say(S.persona === 'sarcastic' ? 'peek_2' : 'peek_1');
  await sleep(500); F.lookAway = false; F.snap = false; F.target = F.pointer ? { ...F.pointer } : { x: 0, y: 0 };
});

// ------------------------------------------------------------------ viselkedés
async function boot() {
  if (S.on) return;
  ensureAudio(); S.on = true; cubeEl.classList.remove('off'); $('#power').textContent = '⏻ Kikapcsolás';
  log('kocka', 'power.on', {});
  SFX.boot(); F.mode = 'face'; F.mouth = 'smile';
  S.busy = true;
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
  S.busy = false; schedulePeek(); broadcastState();
}
function powerOff() {
  S.on = false; S.party = false; partyStop(); stopVoice(); F.mode = 'off';
  cubeEl.classList.add('off'); $('#power').textContent = '⏻ Bekapcsolás'; $('#party').checked = false;
  log('kocka', 'power.off', {}); broadcastState();
}
async function needOn() { if (!S.on) await boot(); return !S.flipped; }

async function pressButton(n) {
  const cap = $(`.cap[data-btn="${n}"]`); cap?.classList.add('pressed'); setTimeout(() => cap?.classList.remove('pressed'), 150);
  if (!(await needOn())) return;
  emit('event.button', { id: n });
  if (S.dnd) return vibrate();
  if (n === 1) {   // Andor: dad joke
    const j = nextJoke();
    S.busy = true; await say(`joke_${j}q`); await sleep(700); await say(`joke_${j}a`, { mouthAfter: 'grin' }); SFX.drum(); await sleep(1200); F.mouth = 'smile'; S.busy = false;
    return;
  }
  const snd = S.assign[n];
  if (snd === 'horn') { SFX.horn(); F.mouth = 'o'; setTimeout(() => F.mouth = 'smile', 600); }
  else if (snd === 'drum') { SFX.drum(); F.mouth = 'grin'; setTimeout(() => F.mouth = 'smile', 900); }
  else if (snd === 'gooo') { F.mode = 'text'; F.text = '🔥'; F.textSize = 120; F.sub = ''; await say('btn_gooo'); F.mode = 'face'; }
  else if (snd === 'coffee') { await say('btn_coffee'); F.mode = 'text'; F.text = 'YES'; F.sub = 'Obviously.'; F.textSize = 96; F.textColor = '#5cf28a'; SFX.ding(); await sleep(1800); F.mode = 'face'; F.textColor = null; }
}
async function throwCube() {
  if (!(await needOn())) return;
  S.throws++; emit('event.throw', { count: S.throws });
  cubeEl.classList.remove('throw'); void cubeEl.offsetWidth; cubeEl.classList.add('throw');
  SFX.whoosh(); F.mode = 'dizzy'; S.busy = true;
  await sleep(1300);
  if (!S.dnd) await say(S.throws === 1 ? 'throw_1' : 'throw_n', { sub: S.throws === 1 ? null : `“Ouch! Again? That's ${S.throws} throws today. Okay, coffee break.”` });
  await sleep(1200); F.mode = S.party ? 'eq' : 'face'; S.busy = false;
}
async function shakeCube() {
  if (!(await needOn())) return;
  cubeEl.classList.remove('shake'); void cubeEl.offsetWidth; cubeEl.classList.add('shake');
  S.busy = true; F.mode = 'text'; F.text = '…'; F.sub = ''; F.textSize = 110; F.textColor = null;
  await sleep(900);
  const yes = Math.random() < 0.5; F.text = yes ? 'YES' : 'NO'; F.textColor = yes ? '#5cf28a' : '#ff6b6b';
  emit('event.shake', { answer: F.text }); SFX.ding();
  await sleep(2200); F.mode = S.party ? 'eq' : 'face'; F.textColor = null; S.busy = false;
}
async function flipCube() {
  if (!S.on) await boot();
  S.flipped = !S.flipped; cubeEl.classList.toggle('flipped', S.flipped); $('#flip').classList.toggle('on', S.flipped);
  emit('event.orientation', { upsideDown: S.flipped, microphone: !S.flipped, camera: !S.flipped });
  if (S.flipped) {
    stopVoice(); if (S.party) setParty(false);
    F.mode = 'privacy'; $('#camLed').classList.remove('on'); subtitle('🔒 Fejjel lefelé: mikrofon és kamera kikapcsolva', 3000);
  } else { F.mode = S.dnd ? 'dnd' : 'face'; subtitle('Mikrofon és kamera újra bekapcsolva', 2200); }
  broadcastState();
}
async function tired() {
  if (!(await needOn())) return;
  $('#camLed').classList.add('on'); emit('event.camera', { face: 'tired' });
  F.mouth = 'worried'; S.busy = true; await sleep(800);
  await say('tired');
  $('#camLed').classList.remove('on');
  const j = nextJoke();
  await sleep(400); await say(`joke_${j}q`); await sleep(700); await say(`joke_${j}a`, { mouthAfter: 'grin' }); SFX.drum();
  await sleep(1200); F.mouth = 'smile'; S.busy = false;
}
async function incomingCall() {
  if (!(await needOn())) return;
  S.call = { from: 'BRO', live: false }; emit('event.call', { from: 'BRO' });
  if (S.dnd) { vibrate(); subtitle('📳 Hívás: BRO – Ne zavarj módban csak rezeg'); S.call = null; return; }
  F.mode = 'call'; SFX.ring();
  await sleep(4500);
  if (S.call && !S.call.live) { S.call = null; F.mode = 'face'; subtitle('Nem fogadott hívás: BRO', 2500); }
}
async function touch() {
  if (!(await needOn())) return;
  if (S.call && !S.call.live) {   // hívás fogadása
    S.call.live = true; emit('event.call_answered', { from: S.call.from }); subtitle('🔊 Kihangosítás: a hívás a kockán keresztül megy', 3500);
    await sleep(4000); S.call = null; F.mode = 'face'; emit('event.call_ended', {}); return;
  }
  if (S.dnd) return vibrate();
  $('#touch').classList.add('listening'); F.mode = 'listen'; F.target = { x: 0, y: -0.7 };
  emit('event.touch', { action: 'listen' });
  await sleep(1600);
  $('#touch').classList.remove('listening'); F.mode = 'face'; F.target = F.pointer ? { ...F.pointer } : { x: 0, y: 0 };
  const p = persona(), time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (Math.random() < 0.5) { F.mode = 'text'; F.text = time; F.sub = ''; F.textSize = 84; F.textColor = null; await say('time', { sub: `“It's ${time}, ${S.nick}.”` }); await sleep(900); F.mode = 'face'; }
  else await say(`idle_${p.key}_${pick(3)}`);
}
function setParty(on) {
  S.party = on; $('#party').checked = on; cubeEl.classList.toggle('party', on);
  if (on && S.on && !S.flipped && !S.dnd) { partyStart(); F.mode = 'eq'; }
  else { partyStop(); S.party = false; $('#party').checked = false; cubeEl.classList.remove('party'); if (S.on && !S.flipped) F.mode = S.dnd ? 'dnd' : 'face'; }
}

// ------------------------------------------------------------------ parancsok az apptól
async function handle(type, d) {
  switch (type) {
    case 'persona.set': S.persona = d.name; store.set('persona', d.name); if (d.name !== 'custom') S.hue = PERSONAS[d.name].hue;
      if (S.on && !S.flipped && !S.dnd) { while (S.busy) await sleep(200); await say('greet_' + persona().key); } break;
    case 'persona.custom': S.sliders = { ...S.sliders, ...d }; store.set('sliders', S.sliders); break;
    case 'mode.party': if (!S.on && d.on) await boot(); setParty(d.on); break;
    case 'mode.dnd': S.dnd = d.on; if (d.on) { setParty(false); stopVoice(); if (S.on && !S.flipped) F.mode = 'dnd'; }
      else if (S.on && !S.flipped) F.mode = 'face'; break;
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
  bt.textContent = !st.on ? 'ᛒ kocka kikapcsolva' : st.flipped ? '🔒 mikrofon, kamera KI' : 'ᛒ csatlakoztatva';
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
$('#popout').addEventListener('click', () => window.open('sim.html?app', 'ckocka-app', 'width=440,height=900'));
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
