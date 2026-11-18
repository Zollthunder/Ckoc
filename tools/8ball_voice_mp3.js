// A „Rázd meg!” program hangjai: 8ball/voice/<id>.mp3 (a hangerő-kezelés és a buktatók: tools/voice_mp3_lib.js)
// Használat: node tools/8ball_voice_mp3.js [forrásmappa=video/test/8ball_pick]
// Előtte: xtts_generate.py 8ball/voice/lines.json --speaker "Daisy Studious" → pick_best.py (video-narration skill)
const path = require('path');
const { convertAll } = require('./voice_mp3_lib');
const ROOT = path.join(__dirname, '..'), OUT = path.join(ROOT, '8ball/voice');
convertAll(path.join(OUT, 'lines.json'), path.resolve(ROOT, process.argv[2] || 'video/test/8ball_pick'), OUT);
