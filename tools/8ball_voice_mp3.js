// A „Rázd meg!” program hangjai: a Whisperrel kiválasztott WAV-okból hangerő-kiegyenlített MP3 (8ball/voice/<id>.mp3)
// Használat: node tools/8ball_voice_mp3.js [forrásmappa=video/test/8ball_pick]
// Előtte: xtts_generate.py 8ball/voice/lines.json --speaker "Daisy Studious" → pick_best.py (video-narration skill)
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const ROOT = path.join(__dirname, '..'), SRC = path.resolve(ROOT, process.argv[2] || 'video/test/8ball_pick'), OUT = path.join(ROOT, '8ball/voice');
const lines = JSON.parse(fs.readFileSync(path.join(OUT, 'lines.json'), 'utf8'));
let n = 0, bytes = 0;
for (const l of lines) {
  const src = path.join(SRC, l.id + '.wav');
  if (!fs.existsSync(src)) { console.log('HIÁNYZIK:', l.id); continue; }
  const dst = path.join(OUT, l.id + '.mp3');
  execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', src, '-af', 'highpass=f=80,loudnorm=I=-16:TP=-1.5:LRA=7', '-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', '64k', dst]);
  n++; bytes += fs.statSync(dst).size;
}
console.log(`${n} MP3 kész, összesen ${(bytes / 1024).toFixed(0)} KB`);
