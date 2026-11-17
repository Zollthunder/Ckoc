// A „90-es évekbeli amerikai tévéreklám” hangsávja teljesen kódból: 120 BPM-es, swingelő („new jack swing” jellegű)
// dob, slap-basszus, „zenekari ütés” (orchestra hit), szintetizátor-rezes dallam, hanghatások (scratch, lézer,
// szalagmegállás, telefoncsörgés…), alatta az angol bemondó (XTTS) és a kocka saját mondatai; a zene beszéd alatt lehalkul.
// Nincs külső zene vagy hangminta – minden itt születik, jogdíjmentes.
// Használat: node tools/ad90_audio.js  ->  video/ad90/audio_mix_ad90.wav (+ video/ad90/durations_ad90.json)
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');

const ROOT = path.join(__dirname, '..');
const AD = path.join(ROOT, 'video/ad90');
const TL = JSON.parse(fs.readFileSync(path.join(AD, 'timeline_ad90.json'), 'utf8'));
const SR = 48000;
const N = Math.ceil(TL.duration * SR);
const out = { L: new Float32Array(N), R: new Float32Array(N) };
const music = { L: new Float32Array(N), R: new Float32Array(N) };

// ---------- segédek ----------
const TAU = Math.PI * 2;
let seed = 1996;
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
const env = (t, a, d) => (t < a ? t / a : Math.exp(-(t - a) / d));
const saw = ph => 2 * (ph % 1) - 1;
// egyszerű egypólusú aluláteresztő szűrő zajhoz
const lpNoise = (c) => { let lp = 0; return () => (lp += c * (rnd() - lp)); };

// ---------- hangszerek ----------
function kick(buf, t0, gain) { let ph = 0; add(buf, t0, t => { const f = 45 + 120 * Math.exp(-t * 30); ph += TAU * f / SR; return Math.tanh(1.6 * Math.sin(ph)) * Math.exp(-t * 8); }, 0.45, gain, 0); }
function snare(buf, t0, gain, pan = 0) {        // vastag 90-es pergő, hosszú „termes” lecsengéssel
  const nz = lpNoise(0.6);
  add(buf, t0, t => (nz() * 1.2 * (Math.exp(-t * 14) + 0.25 * Math.exp(-t * 4)) + Math.sin(TAU * 185 * t) * 0.5 * Math.exp(-t * 25)), 0.7, gain, pan);
  for (const [d, g] of [[0.045, 0.3], [0.09, 0.18], [0.14, 0.1]]) { const n2 = lpNoise(0.3); add(buf, t0 + d, t => n2() * Math.exp(-t * 9), 0.4, gain * g, -pan + (d > 0.08 ? 0.4 : -0.4)); }
}
function hat(buf, t0, gain, pan = 0.25, open = false) { let prev = 0; add(buf, t0, t => { const n = rnd(); const hp = n - prev; prev = n; return hp * Math.exp(-t * (open ? 14 : 70)); }, open ? 0.25 : 0.06, gain, pan); }
function crash(buf, t0, gain) { let prev = 0; add(buf, t0, t => { const n = rnd(); const hp = n - prev; prev = n; return hp * Math.exp(-t * 2.4); }, 2.2, gain, 0.1); }
function slap(buf, t0, note, len, gain) {        // „slap” basszus: fűrész + gyorsan lecsengő felhangok
  const f = midi(note);
  add(buf, t0, t => { const p = f * t; return env(t, 0.003, len * 0.7) * (Math.sin(TAU * p) + 0.5 * saw(p) * Math.exp(-t * 18) + 0.4 * Math.sin(TAU * 3 * p) * Math.exp(-t * 30)); }, len, gain, 0);
}
function orch(buf, t0, gain, root = 52) {         // „zenekari ütés”: oktávokban halmozott fűrészek + zaj, gyors hangmagasság-esés
  const notes = [root - 12, root, root + 7, root + 12, root + 19, root + 24];
  const nz = lpNoise(0.5);
  add(buf, t0, t => {
    const bend = 1 + 0.06 * Math.exp(-t * 40); let v = 0;
    for (const n of notes) { const f = midi(n) * bend; v += saw(f * t) + saw(f * 1.006 * t + 0.3); }
    return (v / notes.length * 0.6 + nz() * 0.5 * Math.exp(-t * 30)) * env(t, 0.002, 0.16);
  }, 0.8, gain, 0);
  for (const [d, g, p] of [[0.08, 0.25, -0.5], [0.16, 0.14, 0.5]]) add(buf, t0 + d, t => { let v = 0; for (const n of notes) v += saw(midi(n) * t); return v / notes.length * 0.5 * env(t, 0.002, 0.14); }, 0.6, gain * g, p);
}
function brass(buf, t0, note, len, gain, pan = 0) {   // szinti-rezes: két elhangolt fűrész, lassú indulás, vibrato
  const f = midi(note); let p1 = 0, p2 = 0;
  add(buf, t0, t => { const vib = 1 + 0.005 * Math.sin(TAU * 5.5 * t) * Math.min(1, t * 3); p1 += f * vib / SR; p2 += f * 1.008 * vib / SR;
    const a = Math.min(1, t / 0.03) * Math.min(1, (len - t) / 0.05); const br = 0.5 + 0.5 * Math.min(1, t / 0.08);
    return a * (saw(p1) * br + saw(p2) * br + Math.sin(TAU * p1) * (1 - br)) * 0.5; }, len, gain, pan);
}
function pad(buf, t0, notes, len, gain) {
  add(buf, t0, t => { let v = 0; for (const n of notes) { const f = midi(n); v += saw(f * t) * 0.3 + Math.sin(TAU * f * t); } return v / notes.length * Math.min(1, t / 0.15) * Math.min(1, (len - t) / 0.2); }, len, gain, 0);
}
function bell(buf, t0, note, gain, pan = 0) {
  const f = midi(note);
  add(buf, t0, t => (Math.sin(TAU * f * t) + 0.5 * Math.sin(TAU * f * 2.76 * t) * Math.exp(-t * 6)) * env(t, 0.002, 0.5), 1.6, gain, pan);
}
function organ(buf, t0, notes, len, gain) {        // „liftzene”: vékony orgona, lassú tremolóval, kissé elhangolva
  add(buf, t0, t => { let v = 0; for (const n of notes) { const f = midi(n) * (1 + 0.004 * Math.sin(TAU * 0.7 * t)); v += Math.sin(TAU * f * t) + 0.3 * Math.sin(TAU * 2 * f * t); } return v / notes.length * (0.75 + 0.25 * Math.sin(TAU * 5 * t)) * Math.min(1, t / 0.08) * Math.min(1, (len - t) / 0.1); }, len, gain, 0);
}

// ---------- zene: 120 BPM, Em7 – Em7 – Cmaj7 – D, swingelő tizenhatodok ----------
const BEAT = TL.beat, BAR = BEAT * 4, S16 = BEAT / 4, SWING = 0.035;
const sw = i => i * S16 + (i % 2 ? SWING : 0);
const CH = [[64, 67, 71, 74], [64, 67, 71, 74], [60, 64, 67, 71], [62, 66, 69, 74]];
const BROOT = [40, 40, 36, 38];
// basszus: (tizenhatod, hang a gyökhöz képest, hossz tizenhatodban)
const BASS = [[0, 0, 2], [3, 0, 1], [4, 12, 1], [6, 0, 2], [8, 0, 1], [10, 10, 1], [11, 12, 2], [14, 7, 2]];
// rezes „hook”: (nyolcad, hang, hossz nyolcadban) – két ütemenként, E-moll pentaton
const HOOK = [[0, 76, 1], [1, 79, 1], [2, 81, 2], [5, 79, 1], [6, 76, 2], [8, 83, 1], [9, 81, 1], [10, 79, 1], [11, 76, 1], [12, 74, 2], [14, 76, 2]];
const partAt = t => (TL.music.find(m => t >= m.from && t < m.to) || { part: 'none' }).part;
for (let bar = 0; bar * BAR < TL.duration; bar++) {
  const tb = bar * BAR, ci = bar % 4, ch = CH[ci];
  for (let i = 0; i < 16; i++) {
    const t = tb + sw(i), p = partAt(t + 0.001);
    if (p === 'main') {
      if (i === 0 || i === 6 || i === 10) kick(music, t, 0.75);
      if (i === 4 || i === 12) snare(music, t, 0.42, 0.05);
      if (i === 15) snare(music, t, 0.1, -0.2);                           // „ghost note”
      hat(music, t, i % 2 ? 0.05 : 0.09, i % 4 === 2 ? -0.3 : 0.3, i === 14);
      const b = BASS.find(x => x[0] === i); if (b) slap(music, t, BROOT[ci] + b[1], b[2] * S16 * 0.9, 0.34);
      if (i === 2 || i === 10) pad(music, t, ch.map(n => n), S16 * 1.6, 0.05);   // rövid akkord-„stab”
    } else if (p === 'outro') {
      if (i === 0) kick(music, t, 0.5);
      if (i % 4 === 2) hat(music, t, 0.04, 0.3);
      if (i === 0) pad(music, t, ch, BAR * 0.95, 0.06);
      const b = BASS.find(x => x[0] === i); if (b && i % 4 === 0) slap(music, t, BROOT[ci] + b[1], S16 * 2, 0.22);
    } else if (p === 'lame' && i === 0 && (bar * BAR) >= 2.5 - BAR) {
      // (a liftzene külön, lent)
    }
  }
  if (partAt(tb + 0.01) === 'main' && bar % 2 === 1) for (const [s, n, l] of HOOK) brass(music, tb - BAR + s * BEAT / 2, n, l * BEAT / 2 * 0.9, 0.05, 0.15);
  if (partAt(tb + 0.01) === 'main' && bar % 2 === 0) orch(music, tb, 0.12, BROOT[ci] + 12);
}
// liftzene a „Is your desk boring?” alatt (2.5–5.0 s): lassú, álmos orgona
{ const m = TL.music.find(x => x.part === 'lame'); const L = m.to - m.from;
  organ(music, m.from, [60, 64, 67, 71], L / 2, 0.16); organ(music, m.from + L / 2, [57, 60, 64, 67], L / 2 - 0.15, 0.16);
  [[0, 79], [0.6, 76], [1.2, 72], [1.9, 74]].forEach(([d, n]) => bell(music, m.from + 0.1 + d, n, 0.05)); }
// záró „C-Cube!” fanfár a szlogennél
{ const J = TL.voices.find(v => v.id === 'A12').t;
  [[0, 76, 0.18], [0.2, 79, 0.18], [0.4, 83, 0.7]].forEach(([d, n, l]) => { brass(music, J + d, n, l, 0.09, -0.1); brass(music, J + d, n - 12, l, 0.06, 0.1); }); }

// ---------- hanghatások ----------
const SFX = {
  tvon(t0) { let prev = 0; add(out, t0, t => { const n = rnd(); const hp = n - prev; prev = n; return hp * 0.6 * Math.min(1, (0.5 - t) / 0.05); }, 0.5, 0.35); add(out, t0, t => Math.sin(TAU * 15734 * t) * 0.05 + Math.sin(TAU * 60 * t) * Math.exp(-t * 12) * 0.6, 0.5, 0.4); },
  orchhit(t0) { orch(out, t0, 0.32); kick(out, t0, 0.4); },
  zap(t0) { let ph = 0; add(out, t0, t => { ph += (2400 * Math.exp(-t * 18) + 120) / SR; return (ph % 1 > 0.5 ? 1 : -1) * Math.exp(-t * 8); }, 0.3, 0.12); },
  laser(t0) { for (let i = 0; i < 3; i++) { let ph = 0; add(out, t0 + i * 0.12, t => { ph += (1800 - 5000 * t) / SR; return Math.sin(TAU * ph) * Math.exp(-t * 10); }, 0.2, 0.14, i % 2 ? 0.5 : -0.5); } },
  tapestop(t0) { const ch = [52, 59, 64, 67]; const ph = ch.map(() => 0); add(out, t0, t => { const r = Math.max(0, 1 - t / 0.55) ** 1.5; let v = 0; ch.forEach((n, i) => { ph[i] += midi(n) * r / SR; v += saw(ph[i]); }); return v / ch.length * (0.3 + 0.7 * r); }, 0.55, 0.3); },
  scratch(t0) { const nz = lpNoise(0.25); add(out, t0, t => { const w = Math.sin(TAU * 7 * t); return nz() * 3 * Math.abs(w) * (0.6 + 0.4 * Math.sin(TAU * (300 + 900 * Math.abs(w)) * t)); }, 0.32, 0.4); },
  explode(t0) { const nz = lpNoise(0.08); add(out, t0, t => nz() * 4 * Math.exp(-t * 3.5) + Math.sin(TAU * (40 + 30 * Math.exp(-t * 8)) * t) * Math.exp(-t * 4), 1.4, 0.5); crash(out, t0, 0.3); },
  boing(t0) { let ph = 0; add(out, t0, t => { ph += TAU * (200 + 140 * Math.sin(TAU * 12 * t) * Math.exp(-t * 5)) / SR; return Math.sin(ph) * Math.exp(-t * 6); }, 0.7, 0.3); },
  pop(t0) { let ph = 0; add(out, t0, t => { ph += TAU * (950 - 600 * t / 0.08) / SR; return Math.sin(ph) * Math.exp(-t * 35); }, 0.1, 0.3); },
  sparkle(t0) { [86, 90, 93, 98, 102, 105].forEach((n, i) => bell(out, t0 + i * 0.04, n, 0.05, (i - 2.5) * 0.25)); },
  whoosh(t0) { const nz = lpNoise(0.1); add(out, t0, t => nz() * Math.sin(Math.PI * Math.min(1, t / 0.5)) * 4, 0.5, 0.35); },
  thud(t0) { kick(out, t0, 0.6); const nz = lpNoise(0.2); add(out, t0, t => nz() * Math.exp(-t * 20) * 2, 0.15, 0.3); },
  click(t0) { add(out, t0, t => (rnd() * 0.5 + Math.sin(TAU * 1800 * t)) * Math.exp(-t * 90), 0.05, 0.4); add(out, t0, t => Math.sin(TAU * 520 * t) * Math.exp(-t * 40), 0.12, 0.15); },
  badumtss(t0) { snare(out, t0, 0.45, -0.2); add(out, t0 + 0.2, t => Math.sin(TAU * (110 + 60 * Math.exp(-t * 20)) * t) * Math.exp(-t * 7), 0.4, 0.5); kick(out, t0 + 0.2, 0.35); crash(out, t0 + 0.45, 0.35); },
  ring(t0) { for (const d of [0, 0.5]) add(out, t0 + d, t => (Math.sin(TAU * 440 * t) + Math.sin(TAU * 480 * t)) * 0.5 * (Math.sin(TAU * 20 * t) > 0 ? 1 : 0.15) * Math.min(1, (0.4 - t) / 0.02), 0.4, 0.13, 0.2); },
  ding(t0) { bell(out, t0, 84, 0.2); bell(out, t0, 91, 0.12); orch(out, t0, 0.25, 52); crash(out, t0, 0.2); },
};
for (const s of TL.sfx) SFX[s.id](s.t);

// ---------- hangok: bemondó (video/ad90/voice, 24 kHz) + a kocka mondatai (web/voice mp3) -> 48 kHz ----------
function readWav(file) {
  const b = fs.readFileSync(file);
  let p = 12;
  while (p < b.length - 8) {
    const id = b.toString('ascii', p, p + 4), len = b.readUInt32LE(p + 4);
    if (id === 'data') { const n = len / 2, a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = b.readInt16LE(p + 8 + i * 2) / 32768; return a; }
    p += 8 + len + (len % 2);
  }
}
const TMP = path.join(AD, 'voice48');
fs.mkdirSync(TMP, { recursive: true });
const durations = {};
const duck = new Float32Array(N).fill(1);
for (const v of TL.voices) {
  const src = v.src === 'cube' ? path.join(ROOT, 'web/voice', v.id + '.mp3') : path.join(AD, 'voice', v.id + '.wav');
  const file = path.join(TMP, v.id + '.wav');
  const af = ['aresample=' + SR]; if (v.tempo) af.push('atempo=' + v.tempo);    // a hadart apróbetűs szöveg gyorsítva
  execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', src, '-ac', '1', '-af', af.join(','), '-ar', String(SR), '-c:a', 'pcm_s16le', file]);
  let a = readWav(file);
  // a csend levágása a hang elejéről (a bemondó fájljaiban ~0,35 s) – így a megadott időpont = a beszéd kezdete
  let pk = 0; for (const x of a) pk = Math.max(pk, Math.abs(x));
  let i0 = a.findIndex(x => Math.abs(x) > pk * 0.03); i0 = Math.max(0, i0 - Math.floor(0.03 * SR)); a = a.subarray(i0);
  durations[v.id] = +(a.length / SR).toFixed(2);
  const s0 = Math.floor(v.t * SR), g = v.src === 'ann' ? 1.2 : 1.0, pan = v.src === 'cube' ? 0.08 : 0;
  for (let i = 0; i < a.length && s0 + i < N; i++) {
    const x = Math.tanh(a[i] * g * 1.6) / 1.2;                                       // a bemondó „rádiós” tömörítése
    out.L[s0 + i] += (v.src === 'ann' ? x : a[i]) * (1 - pan); out.R[s0 + i] += (v.src === 'ann' ? x : a[i]) * (1 + pan);
  }
  for (let k = Math.floor((v.t - 0.08) * SR); k < Math.floor((v.t + a.length / SR + 0.1) * SR) && k < N; k++) if (k >= 0) duck[k] = 0.42;
}
fs.writeFileSync(path.join(AD, 'durations_ad90.json'), JSON.stringify(durations, null, 1));
let g = 1;
for (let k = 0; k < N; k++) { g += (duck[k] - g) * (duck[k] < g ? 0.003 : 0.0005); out.L[k] += music.L[k] * g; out.R[k] += music.R[k] * g; }

// ---------- végső szint, enyhe „tévés” sávszűrés (hogy kicsit VHS-szerű legyen), WAV ----------
const tail = Math.floor(0.4 * SR);
let hpL = 0, hpR = 0, xl = 0, xr = 0, peak = 0;
for (let k = 0; k < N; k++) {
  // 70 Hz alatti zúgás le
  const l = out.L[k], r = out.R[k]; hpL = 0.995 * (hpL + l - xl); hpR = 0.995 * (hpR + r - xr); xl = l; xr = r;
  const fadeOut = k > N - tail ? (N - k) / tail : 1;
  out.L[k] = Math.tanh(hpL * 1.2) * fadeOut; out.R[k] = Math.tanh(hpR * 1.2) * fadeOut;
  peak = Math.max(peak, Math.abs(out.L[k]), Math.abs(out.R[k]));
}
const norm = 0.89 / peak, buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let k = 0; k < N; k++) { buf.writeInt16LE(Math.round(out.L[k] * norm * 32767), 44 + k * 4); buf.writeInt16LE(Math.round(out.R[k] * norm * 32767), 46 + k * 4); }
fs.writeFileSync(path.join(AD, 'audio_mix_ad90.wav'), buf);
console.log('Kész: video/ad90/audio_mix_ad90.wav', TL.duration + ' s', 'csúcs: ' + peak.toFixed(2));
console.log('hosszak:', JSON.stringify(durations));
