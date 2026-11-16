// A „japán reklám” hangsávja kódból: 150 BPM-es pörgős zene, hanghatások, japán narráció + a kocka angol mondatai,
// a zene a beszéd alatt lehalkul. Nincs külső zene vagy minta – jogdíjmentes.
// Használat: node tools/jp_audio.js  ->  video/jp/audio_mix_jp.wav
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');

const ROOT = path.join(__dirname, '..');
const JP = path.join(ROOT, 'video/jp');
const TL = JSON.parse(fs.readFileSync(path.join(JP, 'timeline_jp.json'), 'utf8'));
const SR = 48000;
const N = Math.ceil(TL.duration * SR);
const out = { L: new Float32Array(N), R: new Float32Array(N) };
const music = { L: new Float32Array(N), R: new Float32Array(N) };

// ---------- segédek ----------
const TAU = Math.PI * 2;
let seed = 4242;
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

// ---------- hangszerek ----------
function lead(buf, t0, note, len, gain, pan = 0) {          // „chiptune” négyszögjel enyhe vibratóval
  const f = midi(note); let ph = 0;
  add(buf, t0, t => { ph += TAU * f * (1 + 0.006 * Math.sin(TAU * 6 * t) * Math.min(1, t * 4)) / SR; const sq = Math.sin(ph) > 0 ? 1 : -1; return (sq * 0.6 + Math.sin(ph) * 0.4) * Math.min(1, t / 0.005) * Math.min(1, (len - t) / 0.03); }, len, gain, pan);
}
function stab(buf, t0, notes, len, gain) {
  add(buf, t0, t => { let v = 0; for (const n of notes) { const f = midi(n); v += 2 * ((f * t) % 1) - 1; } return v / notes.length * env(t, 0.004, len * 0.5); }, len, gain, 0);
}
function bell(buf, t0, note, gain, pan = 0) {
  const f = midi(note);
  add(buf, t0, t => (Math.sin(TAU * f * t) + 0.5 * Math.sin(TAU * f * 2.76 * t) * Math.exp(-t * 6) + 0.3 * Math.sin(TAU * f * 5.4 * t) * Math.exp(-t * 12)) * env(t, 0.002, 0.6), 2.0, gain, pan);
}
function bass(buf, t0, note, len, gain) {
  const f = midi(note);
  add(buf, t0, t => env(t, 0.005, len * 0.6) * (Math.sin(TAU * f * t) + 0.35 * (2 * ((f * t) % 1) - 1)), len, gain, 0);
}
function kick(buf, t0, gain) { let ph = 0; add(buf, t0, t => { const f = 48 + 110 * Math.exp(-t * 32); ph += TAU * f / SR; return Math.sin(ph) * Math.exp(-t * 10); }, 0.4, gain, 0); }
function snare(buf, t0, gain, pan = 0) { add(buf, t0, t => (rnd() * 0.75 + Math.sin(TAU * 200 * t) * 0.35) * Math.exp(-t * 20), 0.25, gain, pan); }
function clap(buf, t0, gain) { for (const d of [0, 0.012, 0.024]) add(buf, t0 + d, t => rnd() * Math.exp(-t * 45), 0.15, gain * 0.6, 0.1); }
function hat(buf, t0, gain, pan = 0.25) { let prev = 0; add(buf, t0, t => { const n = rnd(); const hp = n - prev; prev = n; return hp * Math.exp(-t * 70); }, 0.06, gain, pan); }
function crash(buf, t0, gain) { let prev = 0; add(buf, t0, t => { const n = rnd(); const hp = n - prev; prev = n; return hp * Math.exp(-t * 2.6); }, 2.0, gain, 0.1); }
function pluck(buf, t0, note, gain, pan, dec = 0.2) { const f = midi(note); add(buf, t0, t => env(t, 0.003, dec) * (Math.sin(TAU * f * t) * 0.7 + Math.sin(TAU * 2 * f * t) * 0.3 * Math.exp(-t * 10)), dec * 5, gain, pan); }

// ---------- zene: 150 BPM, D – A – Hm – G ----------
const BPM = TL.bpm, BEAT = 60 / BPM, BAR = BEAT * 4;
const CH = [[62, 66, 69], [57, 61, 64], [59, 62, 66], [55, 59, 62]];
// a „hook”: pentaton, kétütemes motívum (lépés, hang) – nyolcadokban
const HOOK = [[0, 74], [1, 76], [2, 78], [3, 81], [4, 78], [6, 76], [7, 74], [8, 71], [9, 74], [10, 76], [12, 78], [13, 76], [14, 74]];
const partAt = t => (TL.music.find(m => t >= m.from && t < m.to) || { part: 'main' }).part;
for (let bar = 0; bar * BAR < TL.duration; bar++) {
  const tb = bar * BAR, part = partAt(tb + 0.01), ch = CH[bar % 4];
  for (let b = 0; b < 4; b++) {
    const t = tb + b * BEAT, p = partAt(t + 0.01);
    if (p === 'main') {
      kick(music, t, 0.6); hat(music, t + BEAT / 2, 0.12); hat(music, t + BEAT / 4, 0.05, -0.3); hat(music, t + 3 * BEAT / 4, 0.05, 0.3);
      if (b % 2 === 1) { snare(music, t, 0.32); clap(music, t, 0.25); }
      bass(music, t, ch[0] - 24, BEAT * 0.45, 0.28); bass(music, t + BEAT / 2, ch[0] - 12, BEAT * 0.45, 0.2);
      if (b === 0 || b === 2) stab(music, t + BEAT / 2, ch.map(n => n + 12), BEAT * 0.4, 0.1);
    } else if (p === 'stealth') {                      // „lábujjhegyen”: pengetés + óra-tiktak
      pluck(music, t, [59, 62][b % 2] + 12, 0.14, -0.4, 0.1); pluck(music, t + BEAT / 2, 66, 0.08, 0.4, 0.08);
      add(music, t, tt => Math.sin(TAU * 2400 * tt) * Math.exp(-tt * 300), 0.02, 0.08, b % 2 ? 0.5 : -0.5);
    } else if (p === 'roll') {                         // dobpergés felfelé
      for (let k = 0; k < 8; k++) snare(music, t + k * BEAT / 8, 0.1 + 0.25 * ((t - 24.8) / 1.2 + k / 40), (k % 2 ? 0.2 : -0.2));
    } else if (p === 'jingle') {
      if (b === 0) kick(music, t, 0.5);
      if (b % 2 === 0) pluck(music, t, ch[1] + 12, 0.1, 0, 0.3);
    }
  }
  // a dallam a fő részekben, kétütemenként
  if (part === 'main' && bar % 2 === 0) for (const [s, n] of HOOK) lead(music, tb + s * BEAT / 2, n, BEAT / 2 * 0.85, 0.07, 0.1);
}
// szlogen-zene a végén: „C – Cube!” csilingelő motívum + záró akkord
const J = TL.voices.find(v => v.id === 'J12').t;
[[0, 79], [0.18, 83], [0.36, 86], [0.62, 91]].forEach(([d, n]) => bell(music, J + d, n, 0.14));
stab(music, J + 0.62, [62, 66, 69, 74], 1.6, 0.18); kick(music, J + 0.62, 0.6); crash(music, J + 0.62, 0.3);

// ---------- hanghatások ----------
const SFX = {
  taiko(t0) { for (const d of [0, 0.19]) { let ph = 0; add(out, t0 + d, t => { ph += TAU * (62 + 40 * Math.exp(-t * 25)) / SR; return (Math.sin(ph) + rnd() * 0.25 * Math.exp(-t * 40)) * Math.exp(-t * 5); }, 0.9, d ? 0.75 : 0.6); } },
  taiko1(t0) { let ph = 0; add(out, t0, t => { ph += TAU * (70 + 40 * Math.exp(-t * 25)) / SR; return (Math.sin(ph) + rnd() * 0.25 * Math.exp(-t * 40)) * Math.exp(-t * 5); }, 0.9, 0.6); },
  flash(t0) { let prev = 0; add(out, t0, t => { const n = rnd(); const hp = n - prev; prev = n; return hp * Math.exp(-t * 9); }, 0.5, 0.25); },
  sparkle(t0) { [86, 90, 93, 98, 102, 105].forEach((n, i) => bell(out, t0 + i * 0.045, n, 0.05, (i - 2.5) * 0.25)); },
  pop(t0) { let ph = 0; add(out, t0, t => { ph += TAU * (900 - 600 * t / 0.08) / SR; return Math.sin(ph) * Math.exp(-t * 35); }, 0.1, 0.35); },
  sweep(t0) { let lp = 0; add(out, t0, t => { lp += (0.02 + t * 0.4) * (rnd() - lp); return lp * Math.min(1, t / 0.35) * 3; }, 0.4, 0.3); },
  whoosh(t0) { let lp = 0; add(out, t0, t => { lp += 0.09 * (rnd() - lp); return lp * Math.sin(Math.PI * Math.min(1, t / 0.6)) * 4; }, 0.6, 0.4); },
  boing(t0) { let ph = 0; add(out, t0, t => { ph += TAU * (220 + 160 * Math.sin(TAU * 11 * t) * Math.exp(-t * 5)) / SR; return Math.sin(ph) * Math.exp(-t * 6); }, 0.7, 0.35); kick(out, t0, 0.35); },
  tweet(t0) { for (let i = 0; i < 4; i++) { let ph = 0; add(out, t0 + i * 0.16, t => { ph += TAU * (2600 + 900 * Math.sin(TAU * 18 * t)) / SR; return Math.sin(ph) * Math.min(1, t / 0.01) * Math.exp(-t * 18); }, 0.12, 0.05, i % 2 ? 0.5 : -0.5); } },
  badumtss(t0) { snare(out, t0, 0.5, -0.2); add(out, t0 + 0.2, t => Math.sin(TAU * (110 + 60 * Math.exp(-t * 20)) * t) * Math.exp(-t * 7), 0.4, 0.55); kick(out, t0 + 0.2, 0.35); crash(out, t0 + 0.45, 0.35); },
  dundun(t0) { for (const [d, ns] of [[0, [45, 52, 57]], [0.42, [44, 51, 56]]]) stab(out, t0 + d, ns, 0.6, 0.35); },
  zip(t0) { let ph = 0; add(out, t0, t => { ph += TAU * (400 + 3000 * t / 0.18) / SR; return Math.sin(ph) * Math.min(1, (0.18 - t) * 30); }, 0.18, 0.12); },
  shutter(t0) { for (const d of [0, 0.07]) add(out, t0 + d, t => rnd() * Math.exp(-t * 120), 0.05, 0.45); },
  drumroll() { /* a zenében („roll” rész) */ },
  crash(t0) { crash(out, t0, 0.45); kick(out, t0, 0.5); stab(out, t0, [62, 66, 69, 74], 0.8, 0.2); },
  chime(t0) { /* a szlogen-zenében */ },
};
for (const s of TL.sfx) SFX[s.id](s.t);

// ---------- hangok: japán narráció (video/jp/voice) + a kocka angol mondatai (web/voice mp3 -> 48 kHz WAV) ----------
function readWav(file) {
  const b = fs.readFileSync(file);
  let p = 12;
  while (p < b.length - 8) {
    const id = b.toString('ascii', p, p + 4), len = b.readUInt32LE(p + 4);
    if (id === 'data') { const n = len / 2, a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = b.readInt16LE(p + 8 + i * 2) / 32768; return a; }
    p += 8 + len + (len % 2);
  }
}
const durations = {};
const duck = new Float32Array(N).fill(1);
for (const v of TL.voices) {
  let file = path.join(JP, 'voice', v.id + '.wav');
  if (v.src === 'cube') {
    const mp3 = path.join(ROOT, 'web/voice', v.id + '.mp3');
    file = path.join(JP, 'voice', 'cube_' + v.id + '.wav');
    execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', mp3, '-ac', '1', '-ar', String(SR), '-c:a', 'pcm_s16le', file]);
  }
  const a = readWav(file);
  durations[v.id] = +(a.length / SR).toFixed(2);
  const s0 = Math.floor(v.t * SR), g = v.src === 'jp' ? 1.25 : 1.0, pan = v.src === 'cube' ? 0.08 : 0;
  for (let i = 0; i < a.length && s0 + i < N; i++) { out.L[s0 + i] += a[i] * g * (1 - pan); out.R[s0 + i] += a[i] * g * (1 + pan); }
  for (let k = Math.floor((v.t - 0.1) * SR); k < Math.floor((v.t + a.length / SR + 0.15) * SR) && k < N; k++) if (k >= 0) duck[k] = 0.32;
}
fs.writeFileSync(path.join(JP, 'durations_jp.json'), JSON.stringify(durations, null, 1));
let g = 1;
for (let k = 0; k < N; k++) { g += (duck[k] - g) * (duck[k] < g ? 0.002 : 0.0004); out.L[k] += music.L[k] * g; out.R[k] += music.R[k] * g; }

// ---------- végső szint, WAV ----------
let peak = 0;
for (let k = 0; k < N; k++) { out.L[k] = Math.tanh(out.L[k] * 1.15); out.R[k] = Math.tanh(out.R[k] * 1.15); peak = Math.max(peak, Math.abs(out.L[k]), Math.abs(out.R[k])); }
const norm = 0.89 / peak, buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let k = 0; k < N; k++) { buf.writeInt16LE(Math.round(out.L[k] * norm * 32767), 44 + k * 4); buf.writeInt16LE(Math.round(out.R[k] * norm * 32767), 46 + k * 4); }
fs.writeFileSync(path.join(JP, 'audio_mix_jp.wav'), buf);
console.log('Kész: video/jp/audio_mix_jp.wav', TL.duration + ' s', 'csúcs: ' + peak.toFixed(2));
