// Matka – az ablak: macskaarc, hangok, buborék, simogatás, keresés
// Az arc ugyanaz, mint a XIAO-n és a szimulátorban (faces.Face._cat / web/sim.js drawCat).
'use strict';
const K = window.kocka || { on() {}, send() {} };   // böngészős előnézetben nincs Electron-híd
const $ = id => document.getElementById(id);
const cube = $('cube'), bubble = $('bubble'), sayEl = $('say'), find = $('find'), q = $('q');
const ICON = location.hash === '#icon';             // npm run icon: nagy, éles kép az alkalmazásikonhoz
const SCALE = ICON ? 3 : 1;
if (ICON) { document.body.classList.add('icon'); $('face').width = $('face').height = 240 * SCALE; }
const g = $('face').getContext('2d');

const CAT = { eye: '#c4f06e', nose: '#ff8caa', ear: '#783c50' };
const PURR_LEN = 3.2;
const F = { hearts: 0, mode: 'face', look: { x: 0, y: 0 }, target: { x: 0, y: 0 }, blink: 0, nextBlink: 2, talkUntil: 0, hover: false };
let settings = { muted: false, mac: /Mac/.test(navigator.platform) };

// ------------------------------------------------------------------ hangok (kódból, mint a szimulátorban)
let audio, master;
function ensureAudio() {
  if (!audio) { audio = new AudioContext(); master = audio.createGain(); master.gain.value = 0.7; master.connect(audio.destination); }
  if (audio.state === 'suspended') audio.resume();
}
function tone(f, t0, dur, type, vol, f2) {
  const o = audio.createOscillator(), gn = audio.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
  gn.gain.setValueAtTime(0.0001, t0); gn.gain.exponentialRampToValueAtTime(vol, t0 + 0.02); gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(gn); gn.connect(master); o.start(t0); o.stop(t0 + dur + 0.05);
}
const SFX = {
  meow() { const t = audio.currentTime; tone(560, t, 0.16, 'sawtooth', 0.16, 820); tone(820, t + 0.14, 0.42, 'sawtooth', 0.16, 430); tone(1120, t + 0.14, 0.42, 'sine', 0.07, 640); },
  mrrp() { const t = audio.currentTime; tone(420, t, 0.12, 'sawtooth', 0.1, 640); tone(640, t + 0.1, 0.18, 'sine', 0.08, 760); },
  purr() {                       // dorombolás: mély, ~26 Hz-es lüktető berregés, két légzésnyi
    const sr = audio.sampleRate, dur = PURR_LEN, n = Math.floor(sr * dur), b = audio.createBuffer(1, n, sr), d = b.getChannelData(0);
    let l1 = 0, l2 = 0, l3 = 0; const a = 1 - Math.exp(-2 * Math.PI * 300 / sr);
    for (let i = 0; i < n; i++) {
      const t = i / sr; l1 += a * (Math.random() * 2 - 1 - l1); l2 += a * (l1 - l2); l3 += a * (l2 - l3);
      const body = Math.sin(2 * Math.PI * 55 * t) * 0.5 + Math.sin(2 * Math.PI * 110 * t) * 0.2;
      const am = Math.pow(0.5 + 0.5 * Math.sin(2 * Math.PI * 26 * t), 3), ph = (t % 1.6) / 1.6;
      const br = ph < 0.42 ? 0.55 * Math.sqrt(Math.abs(Math.sin(Math.PI * ph / 0.42))) : ph >= 0.5 ? Math.sqrt(Math.abs(Math.sin(Math.PI * (ph - 0.5) / 0.5))) : 0;
      d[i] = (l3 * 8 + body) * am * br * Math.min(1, t * 4, (dur - t) * 4) * 0.5;
    }
    const s = audio.createBufferSource(); s.buffer = b; s.connect(master); s.start();
  },
};
function sound(name) { if (settings.muted) return; try { ensureAudio(); SFX[name](); } catch {} }

// ------------------------------------------------------------------ buborék
let bubbleTimer;
function say(text, ms = 5000, { meow = false } = {}) {
  clearTimeout(bubbleTimer);
  find.hidden = true; sayEl.textContent = text; bubble.hidden = false;
  F.talkUntil = performance.now() + Math.min(2200, 300 + text.length * 45);
  if (meow) sound('meow');
  bubbleTimer = setTimeout(hideBubble, ms);
}
function hideBubble() { bubble.hidden = true; find.hidden = true; sayEl.textContent = ''; setInside(F.hover); if (F.mode === 'think') F.mode = 'face'; }

// ------------------------------------------------------------------ egér: az átlátszó rész átengedi a kattintást
function setInside(v) { K.send('mouse', v || !bubble.hidden && !find.hidden); }
for (const el of [cube, bubble]) {
  el.addEventListener('mouseenter', () => { F.hover = true; K.send('mouse', true); });
  el.addEventListener('mouseleave', () => { F.hover = false; setInside(false); });
}

// húzás, kattintás (simogatás), dupla kattintás (keresés), jobb gomb (menü)
let drag = null, clickTimer = null;
cube.addEventListener('mousedown', e => { if (e.button === 0 && !e.ctrlKey) drag = { x: e.screenX, y: e.screenY, moved: false }; });
addEventListener('mousemove', e => {
  if (!drag || !(e.buttons & 1)) return;
  const dx = e.screenX - drag.x, dy = e.screenY - drag.y;
  if (!drag.moved && Math.hypot(dx, dy) < 4) return;
  drag.moved = true; cube.style.cursor = 'grabbing';
  K.send('drag', { dx, dy }); drag.x = e.screenX; drag.y = e.screenY;
});
addEventListener('mouseup', () => {
  if (!drag) return;
  const moved = drag.moved; drag = null; cube.style.cursor = '';
  if (moved) { K.send('drag-end'); return; }
  clearTimeout(clickTimer);
  clickTimer = setTimeout(pet, 260);              // ha jön a második kattintás, az keresés lesz
});
cube.addEventListener('dblclick', () => { clearTimeout(clickTimer); openSearch(); });
cube.addEventListener('contextmenu', e => { e.preventDefault(); K.send('menu'); });

// ------------------------------------------------------------------ viselkedés
let purring = false;
// kattintás (simogatás): dorombol, szívecskék, és egy bíztató mondat
async function pet() {
  if (F.mode === 'sleep') { wake(true); return; }
  say(nextCheer(), 8000);
  F.hearts = performance.now() + 4500;
  if (purring) return;
  purring = true; F.mode = 'purr'; cube.classList.add('purr'); sound('purr');
  await new Promise(r => setTimeout(r, PURR_LEN * 1000));
  cube.classList.remove('purr'); purring = false; if (F.mode === 'purr') F.mode = 'face';
}
function wake(byUser) {
  F.mode = 'face'; if (byUser) sound('mrrp'); cube.classList.add('wiggle'); setTimeout(() => cube.classList.remove('wiggle'), 600);
  if (byUser) say('Mi? Ja, csak szundítottam. 😸', 3000);            // magától ébredve csendben marad, nem zavar
}
const pick = a => a[Math.floor(Math.random() * a.length)];
let cheerBag = [];
function nextCheer() {                 // mindegyik sorra kerül, mielőtt bármelyik megismétlődne
  if (!cheerBag.length) cheerBag = CHEER.slice().sort(() => Math.random() - 0.5);
  return cheerBag.pop();
}
const REMIND = [
  'Nyújtózz egyet, ahogy a macskák! 🐾', 'Igyál egy pohár vizet! 💧', 'Nézz ki az ablakon 20 másodpercig. 👀',
  'Állj fel egy percre, sétálj egyet! 🚶', 'Lazítsd el a vállad… így. 😌', 'Pislogj nagyokat, a szemed is pihenne. 😽',
];

// cuki üzenetek – időnként, csak úgy
const CUTE = [
  'Csak szólok: szeretlek nézni, ahogy dolgozol. 😽', 'Mrrp? Semmi, csak köszöntem. 🐾', 'Ha kell egy ölelés, itt vagyok. (Kicsi, de szőrös.) 💛',
  'Ma is te vagy a kedvenc emberem. 😺', 'Megtartom a sarkot neked. Senki nem jön át. 😼', 'Tudtad? A macskák napi 16 órát alszanak. Én csak 15-öt, miattad. 😸',
  'Dorombolok egy kicsit, hátha jólesik. 💤', 'Ügyes vagy. Csak úgy mondom. ✨', 'Mosolyogj! Én is ezt csinálom. ω',
  'Hoztam neked egy láthatatlan egeret. 🐭 Szívesen.', 'Pacsi! 🐾', 'Ez a nap is jobb, mert itt vagy. 🌤️',
];
// lelket tartó mondatok – ha nehéz a meló, vagy ha kéred
const CHEER = [
    'Meg tudod csinálni. Láttalak már nehezebbel is elbánni! 💪', 'Egyszerre csak egy lépés. A következő. Aztán még egy. 🐾',
    'Nem kell tökéletesnek lennie, csak elkészülnie. Te pedig haladsz! ✨', 'Mély levegő… és fújd ki. Megy ez neked. 😌',
    'Büszke vagyok rád. Komolyan, macskabecsszóra. 😽', 'Ha elakadtál, az csak azt jelenti, hogy épp tanulsz valamit. 🧠',
    'A nehéz feladat is véget ér egyszer. Addig itt drukkolok. 📣', 'Te vagy a csapat legjobb embere. Én csak a legszőrösebb. 😸',
    'Kicsi lépés is lépés. És te ma már sokat léptél. 🐾', 'Hiszek benned. Nagyon. Macskamód. 😼',
  'Nem baj, ha lassan haladsz. Az a lényeg, hogy haladsz. 🐢✨',
  'A mai nehéz rész holnapra már csak egy jó sztori lesz. 📖',
  'Minden nagy dolog egy „na jó, nekiállok”-kal kezdődött. 💪',
  'Már több mindent megoldottál, mint amennyire most emlékszel. 🧠',
  'Ha ma csak ennyi fér bele, az is elég. Holnap is lesz nap. 🌅',
  'A hegy is kisebbnek látszik, ha már félúton vagy. ⛰️',
  'Elfáradni szabad. Feladni nem kell. 🐾',
  'A hibák nem kudarcok, hanem térképek. Most már tudod, merre ne. 🗺️',
  'Lépésről lépésre. Egérről egérre. 🐭',
  'Ami most nehéz, attól leszel holnap ügyesebb. 📈',
  'Még egy kicsit! Mindjárt átjutsz a nehezén. 🚀',
  'Nem kell mindent ma megoldani. Csak a következő darabot. 🧩',
  'A legjobbak is elakadnak. Ők csak nem állnak meg ott. 🏃',
  'Kitartó vagy, mint egy macska a hűtő előtt. Ez komoly dicséret. 😼',
  'Okosabb vagy, mint gondolod. Én csak tudom. 😽',
  'Tudod, mit csinálsz. Bízz magadban egy kicsit jobban. ✨',
  'Erre a feladatra te vagy a legjobb ember. Nem véletlenül a tiéd. 🎯',
  'Ha valaki meg tudja csinálni, az te vagy. 🌟',
  'Láttam már, hogy megoldottál lehetetlennek tűnő dolgokat. 👀',
  'A képességeid nem tűntek el, csak egy kicsit fáradtak. Pihenj, és visszajönnek. 🔋',
  'Jó munkát végzel. Akkor is, ha most nem érzed. 💛',
  'Nem kell tökéletesnek lenned. Elég, ha te vagy. 😺',
  'Te ennél sokkal nehezebbet is kibírtál már. Ez menni fog. 💪',
  'Lazíts a vállaidon. Na, ugye, hogy feszültek voltak? 😌',
  'Légy olyan kedves magadhoz, mint egy barátodhoz lennél. 💛',
  'Egy korty víz, egy mély levegő, és mehet tovább. 💧',
  'Szabad szünetet tartani. A macskák is így csinálják, és nézd, milyen jól vagyunk. 😸',
  'Néha a legjobb ötlet a kávé mellett jön. ☕',
  'Ha nagyon belefáradtál, nézz ki egy percre az ablakon. Megvárlak. 🪟',
  'Ne felejts el mosolyogni. Legalább egy kicsit. Így: ω',
  'Nem minden napnak kell tökéletesnek lennie. Ez is egy jó nap lehet még. 🌤️',
  'Nem vagy egyedül. Itt vagyok. (Kicsi vagyok, de lelkes.) 🐾',
  'Ha nagyon nehéz, lökd le az asztalról. Mi így oldjuk meg. 😼 (Csak vicceltem. Majdnem.)',
  'Ha én megtanultam kinyitni a fiókot mancsokkal, te ezt is meg tudod oldani. 🐾',
  'Hivatalos macskavélemény: ügyes vagy. Pecsét: 🐾',
  'Kilenc életem van, és mindegyikben drukkolnék neked. 😽',
  'Most dorombolok egyet a sikeredért. Előre. Mert biztos lesz. 💛',
  'Ha nekem sikerült beférnem egy túl kicsi dobozba, neked is sikerül ez. 📦',
  'Purr-fekt munkát végzel. Bocs, ezt muszáj volt. 😸',
  'Ma te vagy a nap macskája. Ez a legnagyobb kitüntetés. 🏅',
  'A macskák sosem kételkednek magukban. Próbáld ki te is! 😼',
  'Én csak alszom és eszem, te meg ennyi mindent csinálsz. Le a kalappal! 🎩',
  'Köszönöm, hogy ilyen keményen dolgozol. Látom ám. 👀💛',
  'Sokat tettél ma bele. Ezt nem mindenki veszi észre, de én igen. 😽',
  'Büszke lehetsz arra, amit eddig elértél. Én az vagyok. 🌟',
  'A kitartásod lenyűgöző. Komolyan. 🐾',
  'Ma is sokat adtál magadból. Este jár egy kis pihenés. 🌙',
  'Ügyes vagy. Pont. Nincs „de”. ✨',
  'Hajrá! Az utolsó kör mindig a legszebb. 🏁',
  'Hajrá, hajrá, hajrá! (Ez itt a szurkolói zászlóm: 🚩)',
  'Rajta! Ezt is kipipálod mindjárt. ✅',
  'Mindjárt kész, és utána jöhet egy jól megérdemelt simogatás. Nekem. Mármint neked. 😸',
];
const HELP = () => `Kattints rám: dorombolok és bíztatlak 😺 · Dupla katt vagy ${settings.mac ? '⌘⌥K' : 'Ctrl+Alt+K'}: keresés 🔎 · ${settings.mac ? 'Ctrl+katt vagy jobb gomb' : 'Jobb gomb'}: menü (néma mód is) · Húzz arrébb, ha útban vagyok!`;
function cheer() { pet(true); }

// ------------------------------------------------------------------ keresés és számolás
function openSearch() {
  if (F.mode === 'sleep') F.mode = 'face';
  clearTimeout(bubbleTimer);
  sayEl.textContent = ''; find.hidden = false; bubble.hidden = false; q.value = '';
  F.mode = 'think'; K.send('mouse', true); sound('mrrp');
  setTimeout(() => q.focus(), 30);
}
find.addEventListener('submit', e => {
  e.preventDefault();
  const t = q.value.trim(); if (!t) return;
  const n = calc(t);
  if (n !== null) { F.mode = 'face'; say(`${t} = ${fmt(n)}`, 9000); return; }
  K.send('search', t); K.send('search-done');
  F.mode = 'face'; say(pick(['Már nyitom is! 🐾', 'Utánanézek… 🔎', 'Ugrok! 😼']), 2500);
});
q.addEventListener('keydown', e => { if (e.key === 'Escape') { hideBubble(); K.send('search-done'); } });
q.addEventListener('blur', () => setTimeout(() => { if (!find.hidden && document.activeElement !== q) hideBubble(); }, 200));

const fmt = n => (Math.round(n * 1e10) / 1e10).toLocaleString('hu-HU', { maximumFractionDigits: 10 });
// egyszerű számológép (+ − × ÷ ^ % zárójelek), eval nélkül
function calc(s) {
  if (!/^[\d\s.,+\-*/×x÷:^%()]+$/.test(s) || !/\d/.test(s) || !/[+\-*/×x÷:^%]/.test(s.replace(/^\s*-/, ''))) return null;
  const src = s.replace(/,/g, '.').replace(/[×x]/g, '*').replace(/[÷:]/g, '/').replace(/\s+/g, '');
  let i = 0;
  const peek = () => src[i], eat = c => (src[i] === c ? (i++, true) : false);
  function num() {
    if (eat('(')) { const v = expr(); if (!eat(')')) throw 0; return v; }
    if (eat('-')) return -num();
    if (eat('+')) return num();
    const m = src.slice(i).match(/^\d+(\.\d+)?|^\.\d+/); if (!m) throw 0; i += m[0].length;
    let v = parseFloat(m[0]); if (eat('%')) v /= 100; return v;
  }
  function pow() { const b = num(); return eat('^') ? Math.pow(b, pow()) : b; }
  function term() { let v = pow(); for (;;) { if (eat('*')) v *= pow(); else if (eat('/')) v /= pow(); else return v; } }
  function expr() { let v = term(); for (;;) { if (eat('+')) v += term(); else if (eat('-')) v -= term(); else return v; } }
  try { const v = expr(); if (i !== src.length || !isFinite(v)) return null; return v; } catch { return null; }
}

// ------------------------------------------------------------------ üzenetek a fő folyamattól
K.on('settings', s => { settings = s; });
K.on('look', p => { F.target.x = p.x; F.target.y = p.y; });
K.on('pet', () => pet());
K.on('search', () => openSearch());
K.on('remind', () => { if (F.mode !== 'sleep') say(pick(REMIND), 12000, { meow: true }); });
K.on('sleep', on => { if (on) { hideBubble(); F.mode = 'sleep'; } else if (F.mode === 'sleep') wake(false); });
K.on('cheer', () => cheer());
K.on('cute', () => { if (F.mode !== 'sleep' && bubble.hidden) say(pick(CUTE), 9000, { meow: Math.random() < 0.5 }); });
K.on('help', () => say(HELP(), 15000));
K.on('hello', () => !ICON && say('Miaú! Matka vagyok. 😺 Kattints rám, ha jólesne egy kis bíztatás, vagy duplán, ha keresnél valamit.', 7000, { meow: true }));

// ------------------------------------------------------------------ az arc rajzolása (240 px, mint a XIAO kijelzője)
function poly(pts, col) { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(120 + x, 120 + y) : g.moveTo(120 + x, 120 + y))); g.closePath(); g.fill(); }
function draw(now) {
  const t = now / 1000, dt = Math.min(0.1, (now - (draw.last || now)) / 1000); draw.last = now;
  g.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  g.clearRect(0, 0, 240, 240); g.fillStyle = '#050608'; g.fillRect(0, 0, 240, 240);
  g.lineCap = 'round'; g.shadowBlur = 18; g.shadowColor = CAT.eye;
  const sleep = F.mode === 'sleep', purr = F.mode === 'purr', listen = F.hover && !sleep && !purr, think = F.mode === 'think';
  // tekintet
  const tx = sleep ? 0 : think ? 0.45 : F.target.x, ty = sleep ? 0.3 : think ? -0.55 : F.target.y;
  F.look.x += (tx - F.look.x) * Math.min(1, dt * 6); F.look.y += (ty - F.look.y) * Math.min(1, dt * 6);
  const ex = F.look.x * 16, ey = F.look.y * 12;
  // pislogás
  F.nextBlink -= dt; if (F.nextBlink < 0) { F.blink = 1; F.nextBlink = 2.5 + Math.random() * 3.5; }
  F.blink = Math.max(0, F.blink - dt * 7);
  const open = 1 - Math.sin(Math.min(1, F.blink) * Math.PI);
  const perk = listen ? 6 : 0, droop = sleep ? 6 : 0;
  // fülek
  for (const sx of [-1, 1]) {
    const bx = sx * 52, tw = purr ? Math.sin(t * 3 + sx) * 2 : 0;
    poly([[bx - 30, -66], [bx + 30, -66], [bx + sx * (10 + droop) + tw, -96 - perk + droop]], CAT.eye);
    g.shadowBlur = 0; poly([[bx - 17, -70], [bx + 17, -70], [bx + sx * (7 + droop) + tw, -88 - perk + droop]], CAT.ear); g.shadowBlur = 18;
  }
  // szemek
  g.strokeStyle = CAT.eye; g.fillStyle = CAT.eye; g.lineWidth = 6;
  for (const sx of [-1, 1]) {
    const x = 120 + sx * 40 + ex, y = 120 - 24 + ey;
    if (purr) { g.lineWidth = 6; g.beginPath(); g.arc(x, y + 8, 15, 1.11 * Math.PI, 1.89 * Math.PI); g.stroke(); continue; }
    if (sleep) { g.lineWidth = 5; g.beginPath(); g.arc(x, y - 6, 15, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke(); continue; }
    const h = Math.max(3, 36 * open * (listen ? 1.1 : 1));
    g.beginPath(); g.ellipse(x, y, 18, h / 2, 0, 0, 7); g.fill();
    if (h > 10) { g.shadowBlur = 0; g.fillStyle = '#050608'; g.beginPath(); g.ellipse(x + ex * 0.15, y, listen ? 6 : 3.5, h / 2 - 3, 0, 0, 7); g.fill(); g.fillStyle = CAT.eye; g.shadowBlur = 18; }
  }
  // orr, száj
  const nx = ex * 0.4, ny = 10 + ey * 0.4, my = ny + 14;
  g.shadowColor = CAT.nose; poly([[nx - 8, ny - 4], [nx + 8, ny - 4], [nx, ny + 5]], CAT.nose); g.shadowColor = CAT.eye;
  g.fillStyle = CAT.eye; g.lineWidth = 5;
  if (now < F.talkUntil && !purr && !sleep) {
    const a = 4 + Math.abs(Math.sin(t * 17)) * 14;
    g.beginPath(); g.ellipse(120 + nx, 120 + my + 2, 8, a / 2, 0, 0, 7); g.fill();
  } else {
    g.beginPath();
    for (let s = -6; s <= 6; s++) { const x = 120 + nx + 16 * s / 6, y = 120 + my + 6 * Math.abs(Math.sin(Math.PI * s / 6)); s > -6 ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
  }
  // bajusz
  g.lineWidth = 2; g.globalAlpha = 0.8; g.shadowBlur = 8;
  const buzz = purr ? Math.sin(t * 40) * 1.2 : 0;
  [[-1, -6], [-1, 8], [1, -6], [1, 8]].forEach(([sx, dy], i) => {
    g.beginPath(); g.moveTo(120 + nx + sx * 26, 120 + ny + 6 + dy * 0.3); g.lineTo(120 + nx + sx * 88, 120 + ny + 6 + dy + buzz * (i % 2 ? 1 : -1)); g.stroke();
  });
  g.globalAlpha = 1; g.shadowBlur = 18;
  // pöttyök: gondolkodik / dorombol
  const dots = think ? [0, 1, 2].map(i => { const a = t * 4 + i * 2.1; return [Math.cos(a) * 14, -70 + Math.sin(a) * 6, 0.35 + 0.65 * (i + 1) / 3]; })
    : purr ? [0, 1, 2, 3, 4].map(i => [-28 + i * 14, 66, 0.25 + 0.75 * Math.max(0, Math.sin(t * 5 - i * 0.9))]) : [];
  for (const [x, y, a] of dots) { g.globalAlpha = a; g.beginPath(); g.arc(120 + x, 120 + y, 4, 0, 7); g.fill(); }
  g.globalAlpha = 1;
  // szívecskék bátorításkor
  if (now < F.hearts) {
    g.shadowColor = CAT.nose; g.shadowBlur = 10; g.fillStyle = CAT.nose;
    for (let i = 0; i < 4; i++) {
      const p = ((F.hearts - now) / 4500 + i * 0.27) % 1, x = 120 + [-70, 64, -40, 80][i] + Math.sin(p * 8 + i) * 5, y = 200 - (1 - p) * 150, s = 5 + i % 2 * 2;
      g.globalAlpha = Math.sin(p * Math.PI);
      g.beginPath(); g.moveTo(x, y + s * 1.2); g.bezierCurveTo(x - s * 2, y - s * 0.2, x - s, y - s * 1.6, x, y - s * 0.6); g.bezierCurveTo(x + s, y - s * 1.6, x + s * 2, y - s * 0.2, x, y + s * 1.2); g.fill();
    }
    g.globalAlpha = 1; g.shadowColor = CAT.eye; g.fillStyle = CAT.eye;
  }
  // alvás: lebegő z betűk
  if (sleep) {
    g.shadowBlur = 6; g.font = '700 22px Segoe UI, sans-serif';
    for (let i = 0; i < 3; i++) {
      const p = (t * 0.35 + i / 3) % 1;
      g.globalAlpha = Math.sin(p * Math.PI); g.font = `700 ${14 + p * 14}px Segoe UI, sans-serif`;
      g.fillText('z', 150 + p * 40 + Math.sin(p * 6) * 4, 80 - p * 55);
    }
    g.globalAlpha = 1;
  }
  g.shadowBlur = 0;
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
