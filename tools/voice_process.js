// A nyers gépi hangok utómunkája: hangmagasság és tempó stílusonként, 48 kHz mono WAV, hosszak mérése
// Használat: node tools/voice_process.js
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');

const ROOT = path.join(__dirname, '..');
const lines = JSON.parse(fs.readFileSync(path.join(ROOT, 'video/lines.json'), 'utf8'));
const RAW = path.join(ROOT, 'video/voice_raw');
const OUT = path.join(ROOT, 'video/voice');
fs.mkdirSync(OUT, { recursive: true });

// stílus -> [hangmagasság-szorzó, tempó, hangerő]
const STYLE = {
  // [hangmagasság, tempó, hangerő] – a hangmagasság × tempó szorzat ugyanaz, mint az első változatban,
  // így a mondatok hossza (és a videóban a szájmozgás) nem változik
  narrator: [1.0, 1.0, 1.0],
  cube: [1.08, 1.02, 1.0],
  sunny: [1.1, 1.036, 1.0],
  chill: [1.0, 0.853, 0.95],
  hype: [1.12, 1.144, 1.2],
  sarcastic: [0.97, 0.907, 1.0],
};
// finomítás: zajos mélyek és tompa közepek ki, érthetőség (jelenlét) be, enyhe tömörítés, kis "szobahang"
const POLISH = {
  narrator: 'highpass=f=90,equalizer=f=260:t=q:w=1.2:g=-3,equalizer=f=1200:t=q:w=1:g=-1.5,equalizer=f=3200:t=q:w=1.4:g=3.5,deesser=i=0.4,acompressor=threshold=-20dB:ratio=2.5:attack=8:release=120:makeup=2,aecho=0.85:0.5:28|47:0.10|0.06',
  cube: 'highpass=f=140,equalizer=f=350:t=q:w=1.2:g=-2.5,equalizer=f=2800:t=q:w=1.2:g=2.5,deesser=i=0.5,acompressor=threshold=-20dB:ratio=2.5:attack=8:release=120:makeup=2,aecho=0.85:0.45:22|37:0.10|0.05',
};

function wavInfo(file) {
  const b = fs.readFileSync(file);
  let p = 12, sr = 0, ch = 1, bits = 16, dataLen = 0;
  while (p < b.length - 8) {
    const id = b.toString('ascii', p, p + 4), len = b.readUInt32LE(p + 4);
    if (id === 'fmt ') { ch = b.readUInt16LE(p + 10); sr = b.readUInt32LE(p + 12); bits = b.readUInt16LE(p + 22); }
    if (id === 'data') { dataLen = len; break; }
    p += 8 + len + (len % 2);
  }
  return { sr, ch, bits, dur: dataLen / (sr * ch * bits / 8) };
}

// hangforrás a magyar mondatokhoz: alapból helyi F5-TTS GPU-n, az XTTS-v2 „Ludvig Milivoj” stúdióhangjával mint referenciával
// (video/voice_raw_f5_ludvig) – Zollo ezt választotta 2026-11-16-án;
// VOICE_SRC=szabolcs -> Windows beépített hang (video/voice_raw), VOICE_SRC=f5anna -> F5 a régi, szintetikus Anna-referenciával
// a FreeTTS ingyenes hangja reklámot mond be a felvételbe, ezért NEM használjuk (VOICE_SRC=freetts csak összehasonlításhoz)
const FREETTS = path.join(ROOT, 'video/voice_raw_freetts');
const VSRC = process.env.VOICE_SRC || 'ludvig';
const F5 = path.join(ROOT, VSRC === 'f5anna' ? 'video/voice_raw_f5' : 'video/voice_raw_f5_ludvig');
const durations = {};
for (const l of lines) {
  let src = path.join(RAW, l.id + '.wav');
  let info;
  const alt = path.join(FREETTS, l.id + '.mp3');
  const f5 = path.join(F5, l.id + '.wav');
  if (VSRC === 'freetts' && fs.existsSync(alt)) { src = alt; info = { sr: 24000 }; }
  else if (VSRC !== 'szabolcs' && fs.existsSync(f5)) { src = f5; info = wavInfo(src); }
  else info = wavInfo(src);
  const [pitch, tempo, vol] = STYLE[l.style] || STYLE.narrator;
  const filters = [
    // csak a hosszú (0,6 s feletti), valóban csendes szüneteket rövidítjük – a -40 dB-es küszöb a halk szóvégeket is levágta
    ...(src.endsWith('.mp3') || src.startsWith(F5) ? ['silenceremove=stop_periods=-1:stop_duration=0.6:stop_threshold=-55dB:stop_silence=0.35'] : []),
    `asetrate=${Math.round(info.sr * pitch)}`, 'aresample=48000', `atempo=${(tempo / pitch * pitch).toFixed(3)}`,
    'silenceremove=start_periods=1:start_threshold=-50dB', 'areverse',
    'silenceremove=start_periods=1:start_threshold=-50dB', 'areverse',
    `volume=${vol}`,
    POLISH[l.style === 'narrator' ? 'narrator' : 'cube'],
  ];
  const dst = path.join(OUT, l.id + '.wav');
  execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', src, '-af', filters.join(','), '-ac', '1', '-ar', '48000', '-c:a', 'pcm_s16le', dst]);
  durations[l.id] = +wavInfo(dst).dur.toFixed(2);
  console.log(l.id, durations[l.id] + ' s', `(${info.sr} Hz)`);
}
// illesztés az időzítéshez: ha egy mondat a következő megszólalásba lógna, kicsit gyorsítunk rajta
const TL = JSON.parse(fs.readFileSync(path.join(ROOT, 'video/timeline.json'), 'utf8'));
TL.voices.forEach((v, i) => {
  const next = (TL.voices[i + 1] || { t: TL.duration }).t, room = next - v.t - 0.2;
  if (durations[v.id] > room) {
    const k = Math.min(1.15, durations[v.id] / room), p = path.join(OUT, v.id + '.wav'), tmp = p + '.tmp.wav';
    execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', p, '-af', 'atempo=' + k.toFixed(3), '-ar', '48000', '-c:a', 'pcm_s16le', tmp]);
    fs.renameSync(tmp, p);
    durations[v.id] = +wavInfo(p).dur.toFixed(2);
    console.log('illesztve:', v.id, 'x' + k.toFixed(2), '->', durations[v.id] + ' s', durations[v.id] > room ? '(MÉG MINDIG HOSSZÚ)' : '');
  }
});
fs.writeFileSync(path.join(OUT, 'durations.json'), JSON.stringify(durations, null, 1));
