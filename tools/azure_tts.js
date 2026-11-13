// Microsoft neurális hangok a hivatalos Azure AI Speech REST API-n keresztül.
// A kulcs a projekt gyökerében lévő .azure-speech.json fájlból jön (ez nem kerül fel a GitHubra):
//   { "key": "<a Speech erőforrás kulcsa>", "region": "westeurope" }
// Használat:
//   node tools/azure_tts.js samples   -> video/samples/*.mp3 (hangminták választáshoz)
//   node tools/azure_tts.js all       -> video/voice_neural/<id>.mp3 (mind a 28 mondat, a voice_cast.json szerint)
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const cfgFile = path.join(ROOT, '.azure-speech.json');
if (!fs.existsSync(cfgFile)) { console.error('Hiányzik a .azure-speech.json (kulcs és régió).'); process.exit(1); }
const { key, region } = JSON.parse(fs.readFileSync(cfgFile, 'utf8'));

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&apos;').replace(/"/g, '&quot;');

function synth(text, voice, { rate = '+0%', pitch = '+0Hz' } = {}) {
  const ssml = `<speak version='1.0' xml:lang='${voice.slice(0, 5)}'><voice name='${voice}'>` +
    `<prosody rate='${rate}' pitch='${pitch}'>${esc(text)}</prosody></voice></speak>`;
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: `${region}.tts.speech.microsoft.com`, path: '/cognitiveservices/v1', method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-96kbitrate-mono-mp3',
        'User-Agent': 'c-kocka-video',
        'Content-Length': Buffer.byteLength(ssml),
      },
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => res.statusCode === 200 ? resolve(Buffer.concat(chunks))
        : reject(new Error(`HTTP ${res.statusCode} ${Buffer.concat(chunks).toString().slice(0, 200)}`)));
    });
    req.on('error', reject);
    req.end(ssml);
  });
}

(async () => {
  const mode = process.argv[2] || 'samples';
  if (mode === 'samples') {
    const dir = path.join(ROOT, 'video/samples'); fs.mkdirSync(dir, { recursive: true });
    const hu = 'Ez a C-kocka. Egy tenyérnyi asztali AI-asszisztens. Beszélhetsz hozzá, és mindig jókedvű.';
    const en = "Welcome back, Captain! I haven't seen you for 14 hours, 3 minutes and 12 seconds. Not that I was counting.";
    const samples = [
      ['narrator_Tamas', 'hu-HU-TamasNeural', hu], ['narrator_Noemi', 'hu-HU-NoemiNeural', hu],
      ['kocka_Ana', 'en-US-AnaNeural', en], ['kocka_Aria', 'en-US-AriaNeural', en], ['kocka_Maisie', 'en-GB-MaisieNeural', en],
    ];
    for (const [name, voice, text] of samples) {
      fs.writeFileSync(path.join(dir, name + '.mp3'), await synth(text, voice));
      console.log('kész:', name);
    }
  } else {
    const CAST = JSON.parse(fs.readFileSync(path.join(ROOT, 'video/voice_cast.json'), 'utf8'));
    const lines = JSON.parse(fs.readFileSync(path.join(ROOT, 'video/lines.json'), 'utf8'));
    const dir = path.join(ROOT, 'video/voice_neural'); fs.mkdirSync(dir, { recursive: true });
    for (const l of lines) {
      const role = l.style === 'narrator' ? 'narrator' : l.voice === 'szabolcs' ? 'cube_hu' : 'cube_en';
      const c = Object.assign({}, CAST[role], (CAST.styles || {})[l.style] || {});
      fs.writeFileSync(path.join(dir, l.id + '.mp3'), await synth(l.text, c.voice, c));
      console.log(l.id, c.voice, '·', l.text);
    }
  }
})().catch(e => { console.error('Hiba:', e.message); process.exit(1); });
