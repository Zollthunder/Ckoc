// A „retró magyar tévéreklám” hangsávja teljesen kódból, korszakonként más zenével (mind 120 BPM, saját dallamokkal):
//   1978 – kedves reklámzene: „oom-pah” basszus, elektromos zongora, seprűs pergő, csilingelő harangjáték
//   1993 – „házi” house: négynegyedes lábdob, taps, nyitott cin, orgonás akkordütések, szinti-basszus
//   2004 – korai 2000-es pop: pumpáló pad, pengetett arpeggio, „swoosh”-ok
// Közben csatornaváltó-zaj, a végén csilingelő szignál. A narráció (F5-TTS, magyar) korszakhoz illő hangszínt kap.
// Nincs külső zene vagy hangminta – jogdíjmentes, saját. Használat: node tools/hu_retro_audio.js
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');

const ROOT = path.join(__dirname, '..');
const D = path.join(ROOT, 'video/hu_retro');
const TL = JSON.parse(fs.readFileSync(path.join(D, 'timeline_hu_retro.json'), 'utf8'));
const SR = 48000;
const N = Math.ceil(TL.duration * SR);
const out = { L: new Float32Array(N), R: new Float32Array(N) };
const music = { L: new Float32Array(N), R: new Float32Array(N) };

const TAU = Math.PI * 2;
let seed = 1978;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;
const midi = n => 440 * Math.pow(2, (n - 69) / 12);
const saw = ph => 2 * (ph % 1) - 1;
const lpNoise = c => { let lp = 0; return () => (lp += c * (rnd() - lp)); };
function add(buf, t0, fn, len, gain = 1, pan = 0) {
  const s0 = Math.floor(t0 * SR), n = Math.floor(len * SR);
  const gl = gain * Math.cos((pan + 1) * Math.PI / 4), gr = gain * Math.sin((pan + 1) * Math.PI / 4);
  for (let i = 0; i < n; i++) { const k = s0 + i; if (k < 0 || k >= N) continue; const v = fn(i / SR, i); buf.L[k] += v * gl; buf.R[k] += v * gr; }
}
const env = (t, a, d) => (t < a ? t / a : Math.exp(-(t - a) / d));

// ---------- hangszerek ----------
function kick(b, t0, g, soft = false) { let ph = 0; add(b, t0, t => { ph += TAU * (45 + (soft ? 60 : 110) * Math.exp(-t * 30)) / SR; return Math.sin(ph) * Math.exp(-t * (soft ? 12 : 8)); }, 0.4, g); }
function brush(b, t0, g) { const nz = lpNoise(0.35); add(b, t0, t => nz() * 2 * env(t, 0.02, 0.09), 0.3, g, 0.15); }
function clap(b, t0, g) { for (const d of [0, 0.011, 0.022]) add(b, t0 + d, () => rnd() * 1, 0.012, g * 0.5, 0.1); const nz = lpNoise(0.5); add(b, t0 + 0.03, t => nz() * Math.exp(-t * 18), 0.25, g * 0.8, 0.1); }
function hat(b, t0, g, open = false, pan = 0.25) { let prev = 0; add(b, t0, t => { const n = rnd(); const hp = n - prev; prev = n; return hp * Math.exp(-t * (open ? 12 : 70)); }, open ? 0.3 : 0.06, g, pan); }
function crash(b, t0, g) { let prev = 0; add(b, t0, t => { const n = rnd(); const hp = n - prev; prev = n; return hp * Math.exp(-t * 2.4); }, 2.0, g, 0.1); }
function ep(b, t0, notes, len, g) {        // elektromos zongora: szinusz + enyhe tremoló
  add(b, t0, t => { let v = 0; for (const n of notes) { const f = midi(n); v += Math.sin(TAU * f * t) + 0.25 * Math.sin(TAU * 2 * f * t) * Math.exp(-t * 6); } return v / notes.length * env(t, 0.004, len * 0.6) * (0.85 + 0.15 * Math.sin(TAU * 5 * t)); }, len, g, -0.15);
}
function bell(b, t0, n, g, pan = 0.2) { const f = midi(n); add(b, t0, t => (Math.sin(TAU * f * t) + 0.45 * Math.sin(TAU * f * 3.01 * t) * Math.exp(-t * 8)) * env(t, 0.002, 0.45), 1.4, g, pan); }
function tuba(b, t0, n, len, g) { const f = midi(n); add(b, t0, t => env(t, 0.01, len * 0.5) * (Math.sin(TAU * f * t) + 0.3 * Math.sin(TAU * 2 * f * t)), len, g); }
function organStab(b, t0, notes, len, g) {  // 90-es „house-orgona”: négyszög + szinusz, rövid
  add(b, t0, t => { let v = 0; for (const n of notes) { const f = midi(n); v += (Math.sin(TAU * f * t) > 0 ? 0.5 : -0.5) + Math.sin(TAU * 2 * f * t) * 0.5; } return v / notes.length * env(t, 0.003, len * 0.4); }, len, g, 0.1);
}
function sbass(b, t0, n, len, g) { const f = midi(n); add(b, t0, t => env(t, 0.004, len * 0.6) * (saw(f * t) * 0.6 + Math.sin(TAU * f * t)), len, g); }
function pad(b, t0, notes, len, g, pump = 0) {
  add(b, t0, t => { let v = 0; for (const n of notes) { const f = midi(n); v += saw(f * t) * 0.25 + saw(f * 1.005 * t) * 0.25 + Math.sin(TAU * f * t) * 0.5; } const p = pump ? 1 - pump * Math.exp(-((t % 0.5) * 12)) : 1; return v / notes.length * Math.min(1, t / 0.08) * Math.min(1, (len - t) / 0.1) * p; }, len, g);
}
function pluck(b, t0, n, g, pan) { const f = midi(n); add(b, t0, t => env(t, 0.002, 0.12) * (saw(f * t) * 0.5 + Math.sin(TAU * f * t)), 0.4, g, pan); }

// ---------- zene ----------
const BEAT = TL.beat, BAR = BEAT * 4;
const partAt = t => (TL.music.find(m => t >= m.from && t < m.to) || { part: 'none' }).part;
const P70 = { ch: [[60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67]], root: [48, 53, 55, 48] };
// saját harangjáték-dallam 1978-hoz (nyolcadok: [lépés, hang])
const MEL70 = [[0, 76], [1, 79], [2, 84], [4, 81], [5, 79], [6, 76], [8, 77], [9, 81], [10, 84], [12, 83], [14, 79], [16, 76], [17, 79], [18, 84], [20, 86], [22, 84], [24, 79], [26, 83], [28, 84]];
const P93 = { ch: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]], root: [45, 41, 43, 40] };
const P04 = { ch: [[62, 66, 69, 74], [59, 62, 66, 69], [55, 59, 62, 67], [57, 61, 64, 69]], root: [38, 35, 31, 33] };
for (const m of TL.music) {
  for (let t = m.from, i = 0; t < m.to - 0.01; t += BEAT, i++) {
    const bar = Math.floor(i / 4), b = i % 4;
    if (m.part === 'p70') {
      const ci = bar % 4;
      tuba(music, t, P70.root[ci] - (b % 2 ? -7 : 0), BEAT * 0.8, b % 2 ? 0.16 : 0.22);
      if (b % 2 === 1) { ep(music, t, P70.ch[ci], BEAT * 0.8, 0.12); brush(music, t, 0.18); }
      else kick(music, t, 0.3, true);
    } else if (m.part === 'p93') {
      const ci = bar % 4;
      kick(music, t, 0.6); hat(music, t + BEAT / 2, 0.08, true); hat(music, t + BEAT / 4, 0.04);
      if (b % 2 === 1) clap(music, t, 0.35);
      sbass(music, t + BEAT / 2, P93.root[ci], BEAT * 0.45, 0.24); sbass(music, t + BEAT * 0.75, P93.root[ci] + 12, BEAT * 0.2, 0.12);
      if (b === 0 || b === 2) organStab(music, t + (b === 2 ? BEAT * 0.75 : 0), P93.ch[ci].map(x => x + 12), BEAT * 0.5, 0.1);
    } else if (m.part === 'p04') {
      const ci = bar % 4;
      kick(music, t, 0.55); if (b % 2 === 1) clap(music, t, 0.25); hat(music, t + BEAT / 2, 0.06);
      if (b === 0) pad(music, t, P04.ch[ci], BAR, 0.07, 0.7);
      sbass(music, t, P04.root[ci], BEAT * 0.45, 0.22);
      for (let k = 0; k < 4; k++) pluck(music, t + k * BEAT / 4, P04.ch[ci][(i * 4 + k) % 4] + 12, 0.05, k % 2 ? 0.4 : -0.4);
    } else if (m.part === 'end') {
      if (b === 0) pad(music, t, P04.ch[bar % 2 ? 2 : 0], BAR, 0.06);
      if (b === 0) kick(music, t, 0.3, true);
    }
  }
  if (m.part === 'p70') for (let rep = 0; m.from + rep * 8 * BAR / 2 < m.to; rep++) for (const [st, n] of MEL70) { const tt = m.from + rep * 16 * BEAT + st * BEAT / 2; if (tt < m.to - 0.1) bell(music, tt, n, 0.06); }
}
// a szignál: saját háromhangos „C-kocka” motívum, minden korszak elején más hangszínnel, a végén harangon
const SIG = [[0, 76], [0.25, 79], [0.5, 84]];
for (const m of TL.music) {
  if (m.part === 'p70') SIG.forEach(([d, n]) => bell(music, m.from + d, n, 0.12));
  if (m.part === 'p93') SIG.forEach(([d, n]) => organStab(music, m.from + d, [n - 12, n], 0.25, 0.18));
  if (m.part === 'p04') SIG.forEach(([d, n]) => pluck(music, m.from + d, n, 0.2, 0));
}
{ const J = TL.voices.find(v => v.id === 'H10').t; SIG.forEach(([d, n]) => { bell(music, J - 0.05 + d * 1.4, n, 0.13); bell(music, J - 0.05 + d * 1.4, n + 12, 0.05); }); }

// ---------- hanghatások ----------
const SFX = {
  chan(t0, len = 0.5) {                     // csatornaváltás: kattanás + zaj
    add(out, t0, t => rnd() * Math.exp(-t * 200), 0.03, 0.6);
    let prev = 0; add(out, t0 + 0.01, t => { const n = rnd(); const hp = n - prev; prev = n; return hp * 0.7 * Math.min(1, t / 0.02, (len - t) / 0.04); }, len, 0.3);
  },
  projector(t0, len) { add(out, t0, t => (Math.sin(TAU * 24 * t) > 0.6 ? 1 : 0) * rnd() * 0.25 * Math.min(1, t / 0.3, (len - t) / 0.3), len, 0.12, -0.3); },
  boing(t0) { let ph = 0; add(out, t0, t => { ph += TAU * (220 + 150 * Math.sin(TAU * 11 * t) * Math.exp(-t * 5)) / SR; return Math.sin(ph) * Math.exp(-t * 6); }, 0.7, 0.28); },
  slide(t0) { let ph = 0; add(out, t0, t => { ph += TAU * (300 + 1200 * t / 0.4) / SR; return Math.sin(ph) * Math.min(1, t / 0.02, (0.4 - t) / 0.05); }, 0.4, 0.12); },   // „csúszófütty”
  laser(t0) { for (let i = 0; i < 2; i++) { let ph = 0; add(out, t0 + i * 0.12, t => { ph += (2000 - 5000 * t) / SR; return (ph % 1 > 0.5 ? 1 : -1) * Math.exp(-t * 12); }, 0.2, 0.08, i ? 0.5 : -0.5); } },
  whoosh(t0) { const nz = lpNoise(0.12); add(out, t0, t => nz() * Math.sin(Math.PI * Math.min(1, t / 0.5)) * 4, 0.5, 0.3); },
  thud(t0) { kick(out, t0, 0.6); },
  sparkle(t0) { [88, 91, 95, 100, 103].forEach((n, i) => bell(out, t0 + i * 0.04, n, 0.05, (i - 2) * 0.3)); },
  ding(t0) { bell(out, t0, 84, 0.18); bell(out, t0 + 0.12, 91, 0.12); crash(out, t0, 0.12); },
  register(t0) { add(out, t0, t => rnd() * Math.exp(-t * 80), 0.05, 0.4); bell(out, t0 + 0.06, 96, 0.14); bell(out, t0 + 0.06, 100, 0.1); },   // „pénztárgép”
};
for (const s of TL.sfx) SFX[s.id](s.t, s.len);

// ---------- narráció ----------
function readWav(file) {
  const b = fs.readFileSync(file); let p = 12;
  while (p < b.length - 8) { const id = b.toString('ascii', p, p + 4), len = b.readUInt32LE(p + 4);
    if (id === 'data') { const n = len / 2, a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = b.readInt16LE(p + 8 + i * 2) / 32768; return a; }
    p += 8 + len + (len % 2); }
}
const TMP = path.join(D, 'voice48'); fs.mkdirSync(TMP, { recursive: true });
const durations = {}, duck = new Float32Array(N).fill(1);
for (const v of TL.voices) {
  const file = path.join(TMP, v.id + '.wav');
  // korhű hangszín: 1978 = optikai filmhang (keskeny sáv), 1993 = tévéhangszóró, 2004 és a zárás = tiszta
  const eq = { film: 'highpass=f=280,lowpass=f=5200,acompressor=threshold=0.1:ratio=4', tv: 'highpass=f=150,lowpass=f=7000,acompressor=threshold=0.12:ratio=3', clean: 'highpass=f=70,acompressor=threshold=0.15:ratio=2.5' }[v.fx || 'clean'];
  const af = ['aresample=' + SR, eq]; if (v.tempo) af.push('atempo=' + v.tempo);
  execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', path.join(D, 'voice', v.id + '.wav'), '-ac', '1', '-af', af.join(','), '-ar', String(SR), '-c:a', 'pcm_s16le', file]);
  let a = readWav(file);
  let pk = 0; for (const x of a) pk = Math.max(pk, Math.abs(x));
  let i0 = a.findIndex(x => Math.abs(x) > pk * 0.03); i0 = Math.max(0, i0 - Math.floor(0.03 * SR)); a = a.subarray(i0);
  // a 0,35 s-nál hosszabb belső szünetek 0,28 s-ra rövidítése (az XTTS a vesszőknél sokat vár) – 10 ms-os ablakokkal
  { const w = Math.floor(0.01 * SR), keep = [], quiet = [];
    for (let i = 0; i < a.length; i += w) { let m = 0; for (let j = i; j < Math.min(a.length, i + w); j++) m = Math.max(m, Math.abs(a[j])); quiet.push(m < pk * 0.03); }
    let run = 0;
    quiet.forEach((q, b) => { run = q ? run + 1 : 0; if (!q || run <= 28) keep.push(b); });
    const o = new Float32Array(keep.length * w); keep.forEach((b, k) => o.set(a.subarray(b * w, Math.min(a.length, b * w + w)), k * w)); a = o; }
  durations[v.id] = +(a.length / SR).toFixed(2);
  const g = 0.9 / pk, s0 = Math.floor(v.t * SR);
  for (let i = 0; i < a.length && s0 + i < N; i++) { out.L[s0 + i] += a[i] * g; out.R[s0 + i] += a[i] * g; }
  for (let k = Math.floor((v.t - 0.08) * SR); k < Math.floor((v.t + a.length / SR + 0.1) * SR) && k < N; k++) if (k >= 0) duck[k] = 0.38;
}
fs.writeFileSync(path.join(D, 'durations_hu_retro.json'), JSON.stringify(durations, null, 1));
let g = 1;
for (let k = 0; k < N; k++) { g += (duck[k] - g) * (duck[k] < g ? 0.003 : 0.0005); out.L[k] += music.L[k] * g; out.R[k] += music.R[k] * g; }

// ---------- korszakonkénti „adás-hangszín” a teljes keverékre (a narrációval együtt): 1978 tompább, sercegő ----------
const eraAt = t => (TL.cuts.filter(c => c.t <= t).pop() || {}).era || 0;
let lpL = 0, lpR = 0;
for (let k = 0; k < N; k++) {
  const e = eraAt(k / SR);
  if (e === 1978) { lpL += 0.55 * (out.L[k] - lpL); lpR += 0.55 * (out.R[k] - lpR); const crackle = rnd() > 0.9996 ? rnd() * 0.25 : 0; out.L[k] = lpL + crackle + rnd() * 0.004; out.R[k] = lpR + crackle + rnd() * 0.004; }
  else { lpL = out.L[k]; lpR = out.R[k]; }
}
const tail = Math.floor(0.4 * SR); let hpL = 0, hpR = 0, xl = 0, xr = 0, peak = 0;
for (let k = 0; k < N; k++) {
  const l = out.L[k], r = out.R[k]; hpL = 0.995 * (hpL + l - xl); hpR = 0.995 * (hpR + r - xr); xl = l; xr = r;
  const f = k > N - tail ? (N - k) / tail : 1;
  out.L[k] = Math.tanh(hpL * 1.1) * f; out.R[k] = Math.tanh(hpR * 1.1) * f; peak = Math.max(peak, Math.abs(out.L[k]), Math.abs(out.R[k]));
}
const norm = 0.89 / peak, buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let k = 0; k < N; k++) { buf.writeInt16LE(Math.round(out.L[k] * norm * 32767), 44 + k * 4); buf.writeInt16LE(Math.round(out.R[k] * norm * 32767), 46 + k * 4); }
fs.writeFileSync(path.join(D, 'audio_mix_hu_retro.wav'), buf);
console.log('Kész: video/hu_retro/audio_mix_hu_retro.wav', TL.duration + ' s', 'csúcs: ' + peak.toFixed(2));
console.log('hosszak:', JSON.stringify(durations));
