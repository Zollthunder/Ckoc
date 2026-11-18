// A szimulátor hangjai: web/voice/<id>.mp3 (a hangerő-kezelés és a buktatók: tools/voice_mp3_lib.js)
// Használat: node tools/sim_voice_mp3.js [forrásmappa=video/test/sim_pick]
const path = require('path');
const { convertAll } = require('./voice_mp3_lib');
const ROOT = path.join(__dirname, '..'), OUT = path.join(ROOT, 'web/voice');
convertAll(path.join(OUT, 'lines.json'), path.resolve(ROOT, process.argv[2] || 'video/test/sim_pick'), OUT);
