// A függőleges „Cat mode” klip hangsávja teljesen kódból: 120 BPM-es, pattogós saját dallam (F–Am–Dm–B♭), ütemre vágott
// hanghatások, egy formánsszűrős szintetikus „miaú” és dorombolás (a kocka saját hangjainak – firmware/pi/ckocka/synth.py
// purr()/meow() – bővített változata, hogy telefonhangszórón is hallatszódjon). Beszéd nincs: a klip feliratokkal működik.
// A vége halkan kifut, mert az eleje is csendből indul -> újrajátszáskor észrevétlen a hurok.
// Használat: node tools/catmode_audio.js  ->  video/catmode/audio_mix_catmode.wav
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'video/catmode');
const TL = JSON.parse(fs.readFileSync(path.join(DIR, 'timeline_catmode.json'), 'utf8'));
const SR = 48000, N = Math.ceil(TL.duration * SR), TAU = Math.PI * 2;
const mk = () => ({ L: new Float32Array(N), R: new Float32Array(N) });
const music = mk(), fx = mk();

let seed = 2026;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;
const midi = n => 440 * Math.pow(2, (n - 69) / 12);
const saw = ph => 2 * (ph % 1) - 1;
const env = (t, a, d) => (t < a ? t / a : Math.exp(-(t - a) / d));
function add(buf, t0, fn, len, gain = 1, pan = 0) {
  const s0 = Math.floor(t0 * SR), n = Math.floor(len * SR);
  const gl = gain * Math.cos((pan + 1) * Math.PI / 4), gr = gain * Math.sin((pan + 1) * Math.PI / 4);
  for (let i = 0; i < n; i++) { const k = s0 + i; if (k < 0 || k >= N) continue; const v = fn(i / SR, i); buf.L[k] += v * gl; buf.R[k] += v * gr; }
}
// állítható sáváteresztő (biquad, RBJ) – formánsokhoz és szűrt zajhoz
function bp() {
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x, f, q) => {
    const w = TAU * Math.min(f, SR * 0.45) / SR, al = Math.sin(w) / (2 * q), a0 = 1 + al;
    const b0 = al / a0, b2 = -al / a0, a1 = -2 * Math.cos(w) / a0, a2 = (1 - al) / a0;
    const y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y;
  };
}
const lerp = (a, b, k) => a + (b - a) * k;
const curve = (pts, u) => { for (let i = 1; i < pts.length; i++) if (u <= pts[i][0]) { const [a, va] = pts[i - 1], [b, vb] = pts[i]; return lerp(va, vb, (u - a) / (b - a)); } return pts[pts.length - 1][1]; };

// ---------- hangszerek ----------
function kick(t0, g) { let ph = 0; add(music, t0, t => { ph += TAU * (48 + 110 * Math.exp(-t * 32)) / SR; return Math.tanh(1.8 * Math.sin(ph)) * Math.exp(-t * 9); }, 0.4, g); }
function clap(t0, g) { const f = bp(); add(music, t0, t => { const e = Math.exp(-t * 22) + 0.6 * Math.exp(-Math.max(0, t - 0.012) * 30) * (t > 0.012) + 0.5 * Math.exp(-Math.max(0, t - 0.024) * 14) * (t > 0.024); return f(rnd(), 1500, 0.9) * e * 2.2; }, 0.3, g, 0.05); }
function hat(t0, g, pan = 0.3) { let p = 0; add(music, t0, t => { const n = rnd(), h = n - p; p = n; return h * Math.exp(-t * 60); }, 0.06, g, pan); }
function bass(t0, note, len, g) { const f = midi(note); add(music, t0, t => { const p = f * t; return (Math.sin(TAU * p) + 0.35 * Math.sin(TAU * 2 * p) * Math.exp(-t * 8)) * Math.min(1, t / 0.005) * Math.min(1, (len - t) / 0.03); }, len, g); }
function pluck(t0, note, g, pan = 0) {          // marimbaszerű pengetés (két szinusz + rövid fémes felhang)
  const f = midi(note);
  add(music, t0, t => (Math.sin(TAU * f * t) + 0.3 * Math.sin(TAU * f * 4 * t) * Math.exp(-t * 30) + 0.2 * Math.sin(TAU * f * 2 * t)) * env(t, 0.002, 0.16), 0.6, g, pan);
}
function chordStab(t0, notes, len, g) {
  add(music, t0, t => { let v = 0; for (const n of notes) { const f = midi(n); v += saw(f * t) * 0.4 + saw(f * 1.007 * t) * 0.4; } return v / notes.length * env(t, 0.004, 0.09) * Math.min(1, (len - t) / 0.02); }, len, g, 0);
}

// ---------- zene ----------
const BEAT = TL.beat, BAR = BEAT * 4, E8 = BEAT / 2;
const CH = [[53, [65, 69, 72]], [57, [64, 69, 72]], [50, [62, 65, 69]], [46, [62, 65, 70]]];   // F, Am, Dm, B♭ (gyökhang + akkord)
// saját dallam (nyolcadokban, 16 lépés = 2 ütem; null = szünet) – pentaton, „macskás” felfelé ugró motívum
const MEL = [72, null, 77, 76, 72, null, 69, 72, null, 74, 72, null, 69, 67, 69, null];
const MEL2 = [77, null, 81, 79, 77, null, 76, 74, null, 72, 74, null, 76, null, 77, null];
const start = 0.4, end = 19.55;
for (let bar = 0; start + bar * BAR < end; bar++) {
  const b0 = start + bar * BAR, [root, notes] = CH[bar % 4];
  const quiet = b0 >= 6.8 && b0 < 10.0;                      // dorombolás alatt csak lüktetés (a purr legyen a főszereplő)
  for (let q = 0; q < 4; q++) {
    const tq = b0 + q * BEAT; if (tq >= end) break;
    kick(tq, quiet ? 0.45 : 0.85);
    if (q % 2) clap(tq, quiet ? 0.12 : 0.32);
    for (let e = 0; e < 2; e++) hat(tq + e * E8 + (e ? 0.012 : 0), e ? 0.16 : 0.09, e ? 0.35 : -0.3);
    if (!quiet) { bass(tq, root - 12, BEAT * 0.45, 0.42); bass(tq + E8, root, E8 * 0.8, 0.22); }
    if (!quiet && q !== 0) chordStab(tq + E8, notes, E8 * 0.9, 0.09);
  }
  if (!quiet && b0 >= 1.2) {
    const mel = Math.floor(bar / 2) % 2 ? MEL2 : MEL, half = (bar % 2) * 8;
    for (let i = 0; i < 8; i++) { const n = mel[half + i], tn = b0 + i * E8; if (n != null && tn < end) pluck(tn, n, 0.2, (i % 2 ? 0.25 : -0.25)); }
  }
}

// ---------- hanghatások ----------
function meow(t0, g, pitch = 1, len = 0.62) {   // szintetikus miaú: fűrész-forrás, mozgó formánsok („i”->„a”->„u”), vibrato
  const f1 = bp(), f2 = bp(), f3 = bp(); let ph = 0;
  add(fx, t0, (t) => {
    const u = t / len;
    const f0 = pitch * curve([[0, 560], [0.22, 860], [0.55, 760], [1, 470]], u) * (1 + 0.025 * Math.sin(TAU * 6.5 * t) * Math.min(1, u * 3));
    ph += f0 / SR;
    const src = saw(ph) * 0.7 + Math.sin(TAU * ph) * 0.3 + rnd() * 0.04;
    const F1 = curve([[0, 420], [0.3, 950], [0.7, 800], [1, 450]], u), F2 = curve([[0, 2500], [0.3, 1700], [0.7, 1200], [1, 900]], u);
    const v = f1(src, F1 * pitch, 5) * 1.0 + f2(src, F2 * pitch, 7) * 0.7 + f3(src, 3300 * pitch, 9) * 0.25;
    const a = Math.min(1, t / 0.03) * Math.pow(Math.max(0, 1 - u), 0.6) * (0.75 + 0.25 * Math.sin(Math.PI * Math.min(1, u * 1.6)));
    return v * a * 1.6;
  }, len, g, 0);
}
function purr(t0, dur, g) {                    // dorombolás: ~26 Hz-es lüktetés, légzésnyi hullámzás, alsó „test” + hallható zörej-sáv
  const nb = bp(), nb2 = bp();
  add(fx, t0, t => {
    const n = rnd();
    const rasp = nb(n, 260, 1.1) * 2.2 + nb2(n, 520, 1.6) * 0.9;
    const body = Math.sin(TAU * 55 * t) * 0.5 + Math.sin(TAU * 110 * t) * 0.35 + Math.sin(TAU * 165 * t) * 0.12;
    const am = Math.pow(0.5 + 0.5 * Math.sin(TAU * 26 * t), 3);
    const ph = (t % 1.6) / 1.6;
    const br = ph < 0.42 ? 0.55 * Math.sqrt(Math.abs(Math.sin(Math.PI * ph / 0.42))) : ph >= 0.5 ? Math.sqrt(Math.abs(Math.sin(Math.PI * (ph - 0.5) / 0.5))) : 0;
    return (rasp + body) * am * (0.25 + 0.75 * br) * Math.min(1, t * 4, (dur - t) * 3);
  }, dur, g, 0);
}
function noiseSweep(t0, len, f0, f1, g, q = 1.2, pan = 0) { const f = bp(); add(fx, t0, t => f(rnd(), f0 * Math.pow(f1 / f0, t / len), q) * Math.sin(Math.PI * t / len), len, g, pan); }
function blip(t0, fa, fb, len, g, type = 'sine') { let ph = 0; add(fx, t0, t => { ph += fa * Math.pow(fb / fa, t / len) / SR; return (type === 'sq' ? Math.sign(Math.sin(TAU * ph)) * 0.5 : Math.sin(TAU * ph)) * env(t, 0.003, len / 3); }, len, g); }
const SFX = {
  flash: t => { noiseSweep(t - 0.12, 0.2, 800, 9000, 0.5, 0.8); blip(t, 2400, 3600, 0.25, 0.12); },
  pop: t => blip(t, 280, 1100, 0.12, 0.6),
  meow: t => meow(t, 0.85),
  meowsmall: t => meow(t, 0.45, 1.25, 0.38),
  tap: t => add(fx, t, tt => rnd() * Math.exp(-tt * 400), 0.02, 0.5),
  toggle: t => { blip(t, 900, 1300, 0.07, 0.25); blip(t + 0.07, 1300, 1800, 0.09, 0.22); },
  swish: t => noiseSweep(t - 0.1, 0.18, 1200, 5000, 0.35, 1.0, 0.2),
  tick: t => { blip(t, 1568, 1568, 0.35, 0.16); blip(t + 0.06, 2093, 2093, 0.4, 0.12); },
  boing: t => { let ph = 0; add(fx, t, tt => { ph += (300 + 140 * Math.sin(TAU * 9 * tt) * Math.exp(-tt * 4)) / SR; return Math.sin(TAU * ph) * env(tt, 0.004, 0.18); }, 0.45, 0.3); },
  twang: t => { const f = 196; add(fx, t, tt => (saw(f * tt * (1 + 0.04 * Math.sin(TAU * 7 * tt))) * 0.4 + Math.sin(TAU * f * tt)) * env(tt, 0.002, 0.25), 0.6, 0.18, 0.3); },
  rub: t => noiseSweep(t, 0.45, 600, 1400, 0.3, 0.7, -0.2),
  purr: (t, e) => purr(t, e.len || 3.2, 0.75),
  hit: t => { kick(t, 0.6); let p = 0; add(fx, t, tt => { const n = rnd(), h = n - p; p = n; return h * Math.exp(-tt * 3); }, 1.2, 0.12, 0.1); },
  zoomies: t => { noiseSweep(t - 0.05, 0.55, 300, 6000, 0.55, 1.4); for (let i = 0; i < 8; i++) add(fx, t + i * 0.055, tt => rnd() * Math.exp(-tt * 250), 0.02, 0.35, i % 2 ? 0.5 : -0.5); },
  cicc: t => { for (const d of [0, 0.22]) { const f = bp(); add(fx, t + d, tt => (tt < 0.025 ? rnd() * 0.6 * Math.exp(-tt * 200) : f(rnd(), 6500, 2) * 1.4) * Math.min(1, (0.13 - tt) / 0.03), 0.13, 0.45, d ? 0.15 : -0.15); } },
  perk: t => { blip(t, 700, 1400, 0.1, 0.25); blip(t + 0.09, 1050, 2100, 0.1, 0.22); },
};
for (const e of TL.sfx) { if (!SFX[e.id]) throw new Error('ismeretlen hanghatás: ' + e.id); SFX[e.id](e.t, e); }

// ---------- keverés: a zene lehalkul a miaú alatt, a végén halk kifutás a hurokhoz ----------
const duck = new Float32Array(N).fill(1);
for (const e of TL.sfx) if (/meow/.test(e.id)) for (let k = Math.floor((e.t - 0.03) * SR); k < Math.floor((e.t + 0.7) * SR) && k < N; k++) if (k >= 0) duck[k] = 0.45;
let g = 1, hpL = 0, hpR = 0, xl = 0, xr = 0, peak = 0;
const out = mk();
for (let k = 0; k < N; k++) {
  g += (duck[k] - g) * (duck[k] < g ? 0.004 : 0.0006);
  const l = music.L[k] * g * 0.8 + fx.L[k], r = music.R[k] * g * 0.8 + fx.R[k];
  hpL = 0.9985 * (hpL + l - xl); hpR = 0.9985 * (hpR + r - xr); xl = l; xr = r;          // 12 Hz alatti egyenáram/zúgás le
  const t = k / SR, fade = t > TL.duration - 0.35 ? (TL.duration - t) / 0.35 : 1;
  out.L[k] = Math.tanh(hpL * 1.3) * fade; out.R[k] = Math.tanh(hpR * 1.3) * fade;
  peak = Math.max(peak, Math.abs(out.L[k]), Math.abs(out.R[k]));
}
const norm = 0.9 / peak, buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let k = 0; k < N; k++) { buf.writeInt16LE(Math.round(out.L[k] * norm * 32767), 44 + k * 4); buf.writeInt16LE(Math.round(out.R[k] * norm * 32767), 46 + k * 4); }
fs.writeFileSync(path.join(DIR, 'audio_mix_catmode.wav'), buf);
console.log('Kész: video/catmode/audio_mix_catmode.wav', TL.duration + ' s', 'csúcs: ' + peak.toFixed(2));
