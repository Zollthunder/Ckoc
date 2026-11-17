// A videó teljes hangsávja kódból: saját szintetizált zene + hangeffektek + gépi hangok, elnémítással (ducking).
// Nincs külső zene, így jogdíjproblémák sincsenek.
// Használat: node tools/audio_mix.js  ->  video/audio_mix.wav
//   más idővonallal: node tools/audio_mix.js --tl video/porgos/timeline_porgos.json --out video/porgos/audio_mix_porgos.wav
//   (az idővonalban: bpm, és a mondatoknál file/dur, ha nem a video/voice-ból jönnek)
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ARG = k => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : null; };
const TL = JSON.parse(fs.readFileSync(path.join(ROOT, ARG('tl') || 'video/timeline.json'), 'utf8'));
const OUT = ARG('out') || 'video/audio_mix.wav';
const DUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'video/voice/durations.json'), 'utf8'));
const SR = 48000;
const N = Math.ceil(TL.duration * SR);
const L = new Float32Array(N), R = new Float32Array(N);
const music = { L: new Float32Array(N), R: new Float32Array(N) };

// ---------- segédek ----------
const TAU = Math.PI * 2;
let seed = 12345;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;
const midi = n => 440 * Math.pow(2, (n - 69) / 12);
function add(buf, t0, fn, len, gain = 1, pan = 0) {
  const s0 = Math.floor(t0 * SR), n = Math.floor(len * SR);
  const gl = gain * Math.cos((pan + 1) * Math.PI / 4), gr = gain * Math.sin((pan + 1) * Math.PI / 4);
  for (let i = 0; i < n; i++) {
    const k = s0 + i; if (k < 0 || k >= N) continue;
    const v = fn(i / SR, i);
    buf.L[k] += v * gl; buf.R[k] += v * gr;
  }
}
const out = { L, R };
const env = (t, a, d) => (t < a ? t / a : Math.exp(-(t - a) / d));

// ---------- hangszerek ----------
function pluck(buf, t0, note, gain, pan, dec = 0.35) {
  const f = midi(note);
  add(buf, t0, t => {
    const e = env(t, 0.004, dec);
    return e * (Math.sin(TAU * f * t) * 0.6 + Math.sin(TAU * 2 * f * t) * 0.25 * Math.exp(-t * 8) + Math.sin(TAU * 3 * f * t) * 0.1 * Math.exp(-t * 14));
  }, dec * 5, gain, pan);
}
function pad(buf, t0, notes, len, gain) {
  add(buf, t0, t => {
    const e = Math.min(1, t / 0.6) * Math.min(1, (len - t) / 0.6);
    let v = 0;
    for (const n of notes) {
      const f = midi(n);
      v += Math.sin(TAU * f * t) + 0.5 * Math.sin(TAU * f * 1.003 * t) + 0.25 * Math.sin(TAU * 2 * f * t + 0.3);
    }
    return e * v / notes.length;
  }, len, gain, 0);
}
function bass(buf, t0, note, len, gain) {
  const f = midi(note);
  add(buf, t0, t => env(t, 0.01, len * 0.7) * (Math.sin(TAU * f * t) + 0.3 * Math.sign(Math.sin(TAU * f * t)) * 0.4), len, gain, 0);
}
function kick(buf, t0, gain) {
  let ph = 0;
  add(buf, t0, (t) => { const f = 45 + 90 * Math.exp(-t * 30); ph += TAU * f / SR; return Math.sin(ph) * Math.exp(-t * 9); }, 0.45, gain, 0);
}
function snare(buf, t0, gain, pan = 0) {
  add(buf, t0, t => (rnd() * 0.7 + Math.sin(TAU * 190 * t) * 0.4) * Math.exp(-t * 18), 0.3, gain, pan);
}
function hat(buf, t0, gain, pan = 0.2) {
  let prev = 0;
  add(buf, t0, t => { const n = rnd(); const hp = n - prev; prev = n; return hp * Math.exp(-t * 60); }, 0.08, gain, pan);
}
function crash(buf, t0, gain) {
  let prev = 0;
  add(buf, t0, t => { const n = rnd(); const hp = n - prev; prev = n; return hp * Math.exp(-t * 3.2); }, 1.6, gain, 0.1);
}

// ---------- zene ----------
const BPM = TL.bpm || 110, BEAT = 60 / BPM, BAR = BEAT * 4;
// C - G - Am - F (vidám pop-akkordmenet)
const CHORDS = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]];
const STEALTH = [[57, 60, 64], [52, 55, 59]]; // Am - Em a lopakodáshoz
const partAt = t => (TL.music.find(m => t >= m.from && t < m.to) || { part: 'main' }).part;

for (let bar = 0; bar * BAR < TL.duration; bar++) {
  const tb = bar * BAR;
  const part = partAt(tb + 0.01);
  const ch = part === 'stealth' ? STEALTH[bar % 2] : CHORDS[bar % 4];
  const fadeOut = Math.max(0, Math.min(1, (TL.duration - tb) / 6));
  if (part !== 'stealth') pad(music, tb, ch.map(n => n - 12), BAR + 0.3, (part === 'intro' ? 0.05 + 0.02 * bar : 0.08) * fadeOut);
  if (part === 'intro') continue;
  if (part !== 'outro' || true) bass(music, tb, ch[0] - 24, BEAT * 1.8, (part === 'party' ? 0.28 : 0.2) * fadeOut);
  bass(music, tb + BEAT * 2, ch[0] - 24, BEAT * 1.8, (part === 'party' ? 0.28 : 0.18) * fadeOut);
  for (let b = 0; b < 4; b++) {
    const t = tb + b * BEAT;
    if (part === 'party') {
      kick(music, t, 0.55); hat(music, t + BEAT / 2, 0.16); hat(music, t + BEAT / 4, 0.07, -0.3); hat(music, t + 3 * BEAT / 4, 0.07, 0.3);
      if (b % 2 === 1) snare(music, t, 0.3);
    } else if (part === 'stealth') {
      if (b % 2 === 0) kick(music, t, 0.2);
      pluck(music, t, ch[b % 3] + 12, 0.16, -0.4, 0.08);           // pizzicato "lábujjhegyen"
      pluck(music, t + BEAT * 0.5, ch[(b + 1) % 3] + 12, 0.1, 0.4, 0.08);
    } else if (part === 'main') {
      if (b % 2 === 0) kick(music, t, 0.32);
      if (b % 2 === 1) snare(music, t, 0.12);
      hat(music, t + BEAT / 2, 0.08);
    } else if (part === 'outro') {
      if (b === 0) kick(music, t, 0.2 * fadeOut);
    }
    // arpeggio
    if (part === 'main' || part === 'party' || part === 'outro') {
      const steps = part === 'party' ? 4 : 2;
      for (let s = 0; s < steps; s++) {
        const n = ch[(b * steps + s) % 3] + 12 + (s % 2 ? 12 : 0);
        pluck(music, t + s * BEAT / steps, n, (part === 'party' ? 0.09 : 0.07) * fadeOut, (s % 2 ? 0.35 : -0.35), part === 'party' ? 0.15 : 0.3);
      }
    }
  }
}

// ---------- hangeffektek ----------
// cat mode: miaú (fűrész mozgó formánsokkal: „i” -> „a” -> „u”) és dorombolás (~26 Hz-es lüktetés, légzésnyi hullámzás,
// mint a kocka synth.purr()-je, egy hallható zörejsávval kiegészítve) – ugyanaz, mint tools/catmode_audio.js-ben
function bpf() { let x1 = 0, x2 = 0, y1 = 0, y2 = 0; return (x, f, q) => { const w = TAU * f / SR, al = Math.sin(w) / (2 * q), a0 = 1 + al, b0 = al / a0, b2 = -al / a0, a1 = -2 * Math.cos(w) / a0, a2 = (1 - al) / a0; const y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; }; }
const curve = (pts, u) => { for (let i = 1; i < pts.length; i++) if (u <= pts[i][0]) { const [a, va] = pts[i - 1], [b, vb] = pts[i]; return va + (vb - va) * (u - a) / (b - a); } return pts[pts.length - 1][1]; };
function meowSynth(t0, g, pitch = 1, len = 0.62) {
  const f1 = bpf(), f2 = bpf(), f3 = bpf(); let ph = 0;
  add(out, t0, t => {
    const u = t / len, f0 = pitch * curve([[0, 560], [0.22, 860], [0.55, 760], [1, 470]], u) * (1 + 0.025 * Math.sin(TAU * 6.5 * t) * Math.min(1, u * 3));
    ph += f0 / SR; const src = 2 * (ph % 1) - 1;
    const v = f1(src * 0.7 + Math.sin(TAU * ph) * 0.3, curve([[0, 420], [0.3, 950], [0.7, 800], [1, 450]], u) * pitch, 5) + f2(src, curve([[0, 2500], [0.3, 1700], [0.7, 1200], [1, 900]], u) * pitch, 7) * 0.7 + f3(src, 3300 * pitch, 9) * 0.25;
    return v * Math.min(1, t / 0.03) * Math.pow(Math.max(0, 1 - u), 0.6) * 1.6;
  }, len, g, 0);
}
function purrSynth(t0, dur, g) {
  const nb = bpf(), nb2 = bpf();
  add(out, t0, t => {
    const n = rnd(), rasp = nb(n, 260, 1.1) * 2.2 + nb2(n, 520, 1.6) * 0.9;
    const body = Math.sin(TAU * 55 * t) * 0.5 + Math.sin(TAU * 110 * t) * 0.35 + Math.sin(TAU * 165 * t) * 0.12;
    const am = Math.pow(0.5 + 0.5 * Math.sin(TAU * 26 * t), 3), ph = (t % 1.6) / 1.6;
    const br = ph < 0.42 ? 0.55 * Math.sqrt(Math.abs(Math.sin(Math.PI * ph / 0.42))) : ph >= 0.5 ? Math.sqrt(Math.abs(Math.sin(Math.PI * (ph - 0.5) / 0.5))) : 0;
    return (rasp + body) * am * (0.25 + 0.75 * br) * Math.min(1, t * 4, (dur - t) * 3);
  }, dur, g, 0);
}
const SFX = {
  boot(t0) { let ph = 0; add(out, t0, t => { const f = 180 + 700 * Math.min(1, t / 1.2); ph += TAU * f / SR; return Math.sin(ph) * Math.min(1, t * 4) * Math.exp(-Math.max(0, t - 1.0) * 4); }, 1.8, 0.15); SFX.sparkle(t0 + 1.1); },
  sparkle(t0) { [84, 88, 91, 96, 100].forEach((n, i) => pluck(out, t0 + i * 0.06, n, 0.08, (i - 2) * 0.25, 0.25)); },
  whoosh(t0) { let lp = 0; add(out, t0, t => { lp += 0.08 * (rnd() - lp); return lp * Math.sin(Math.PI * Math.min(1, t / 0.7)) * 4; }, 0.7, 0.35, 0); },
  pop(t0) { let ph = 0; add(out, t0, t => { ph += TAU * (700 - 400 * t / 0.09) / SR; return Math.sin(ph) * Math.exp(-t * 30); }, 0.12, 0.3); },
  error(t0) { [0, 0.22].forEach((d, i) => add(out, t0 + d, t => Math.sign(Math.sin(TAU * (i ? 150 : 190) * t)) * 0.5 * Math.exp(-t * 6), 0.2, 0.18)); },
  success(t0) { [72, 76, 79, 84].forEach((n, i) => pluck(out, t0 + i * 0.09, n, 0.16, 0, 0.3)); },
  click(t0) { add(out, t0, t => (rnd() * 0.5 + Math.sin(TAU * 2200 * t)) * Math.exp(-t * 250), 0.03, 0.4); },
  badumtss(t0) { snare(out, t0, 0.45, -0.2); add(out, t0 + 0.2, t => Math.sin(TAU * (110 + 60 * Math.exp(-t * 20)) * t) * Math.exp(-t * 7), 0.4, 0.5); kick(out, t0 + 0.2, 0.3); crash(out, t0 + 0.45, 0.35); },
  whistle(t0) {
    let ph = 0;
    const notes = [[0, 0.32, 79], [0.36, 0.3, 84], [0.72, 0.5, 81], [1.3, 0.25, 79], [1.58, 0.45, 76]];
    for (const [d, len, n] of notes) { ph = 0; add(out, t0 + d, t => { ph += TAU * midi(n) * (1 + 0.012 * Math.sin(TAU * 6 * t)) / SR; return Math.sin(ph) * Math.min(1, t / 0.03) * Math.min(1, (len - t) / 0.05); }, len, 0.12, 0.2); }
  },
  bounce(t0) { let ph = 0; add(out, t0, t => { ph += TAU * (260 + 120 * Math.sin(TAU * 9 * t) * Math.exp(-t * 6)) / SR; return Math.sin(ph) * Math.exp(-t * 7); }, 0.6, 0.25); kick(out, t0, 0.3); },
  shake(t0) { add(out, t0, t => rnd() * (0.5 + 0.5 * Math.sin(TAU * 12 * t)) * Math.min(1, t * 8) * Math.min(1, (2 - t) * 4), 2.0, 0.12); },
  buzz(t0) { add(out, t0, t => Math.sin(TAU * 170 * t) * (0.6 + 0.4 * Math.sign(Math.sin(TAU * 170 * t))) * (t % 0.25 < 0.17 ? 1 : 0), 0.5, 0.18); },
  ring(t0) { for (const d of [0, 1.4]) add(out, t0 + d, t => (Math.sin(TAU * 1000 * t) + Math.sin(TAU * 1400 * t)) * 0.5 * (Math.sin(TAU * 20 * t) > 0 ? 1 : 0.2) * Math.min(1, t * 30), 1.0, 0.1); },
  tick(t0) { add(out, t0, t => Math.sin(TAU * (900 - 500 * t / 0.05) * t) * Math.exp(-t * 60), 0.06, 0.12); },
  rub(t0) { let lp = 0; add(out, t0, t => { lp += 0.12 * (rnd() - lp); return lp * 3 * Math.sin(Math.PI * t / 2.4) * (0.6 + 0.4 * Math.sin(TAU * 0.85 * t)); }, 2.4, 0.25, -0.2); },
  meow(t0) { meowSynth(t0, 0.5); },
  purr(t0, e) { purrSynth(t0, (e && e.len) || 3.2, 0.55); },
  powerdown(t0) { let ph = 0; add(out, t0, t => { ph += TAU * (600 * Math.exp(-t * 2.5) + 60) / SR; return Math.sin(ph) * Math.min(1, (1.2 - t) * 4); }, 1.2, 0.2); },
};
for (const s of TL.sfx) { if (!SFX[s.id]) throw new Error('ismeretlen hanghatás: ' + s.id); SFX[s.id](s.t, s); }

// ---------- gépi hangok + zene halkítása alattuk ----------
function readWav(file) {
  const b = fs.readFileSync(file);
  let p = 12;
  while (p < b.length - 8) {
    const id = b.toString('ascii', p, p + 4), len = b.readUInt32LE(p + 4);
    if (id === 'data') { const n = len / 2, a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = b.readInt16LE(p + 8 + i * 2) / 32768; return a; }
    p += 8 + len + (len % 2);
  }
}
const duck = new Float32Array(N).fill(1);
for (const v of TL.voices) {
  const a = readWav(path.join(ROOT, v.file || path.join('video/voice', v.id + '.wav')));
  const s0 = Math.floor(v.t * SR);
  const g = /^[NP]/.test(v.id) ? 1.15 : 1.0;
  for (let i = 0; i < a.length && s0 + i < N; i++) { L[s0 + i] += a[i] * g; R[s0 + i] += a[i] * g; }
  const d = v.dur || DUR[v.id];
  for (let k = Math.floor((v.t - 0.25) * SR); k < Math.floor((v.t + d + 0.35) * SR) && k < N; k++) if (k >= 0) duck[k] = 0.3;
}
// a halkítás simítása
let g = 1;
for (let k = 0; k < N; k++) { g += (duck[k] - g) * (duck[k] < g ? 0.0008 : 0.00015); L[k] += music.L[k] * g; R[k] += music.R[k] * g; }

// ---------- végső szint, WAV írás ----------
let peak = 0;
for (let k = 0; k < N; k++) { L[k] = Math.tanh(L[k] * 1.1); R[k] = Math.tanh(R[k] * 1.1); peak = Math.max(peak, Math.abs(L[k]), Math.abs(R[k])); }
const norm = 0.89 / peak;
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let k = 0; k < N; k++) { buf.writeInt16LE(Math.round(L[k] * norm * 32767), 44 + k * 4); buf.writeInt16LE(Math.round(R[k] * norm * 32767), 46 + k * 4); }
fs.writeFileSync(path.join(ROOT, OUT), buf);
console.log('Kész: ' + OUT, TL.duration + ' s', 'csúcs: ' + peak.toFixed(2));
