// A „pörgős” bemutatóvideó összerakása az eredeti 2:56-os videó jelenetéből, vágólista alapján.
//  1) video/porgos/edl_porgos.json + a mondatok hossza -> video/porgos/timeline_porgos.json
//     (szakaszok új kezdőideje és hossza ütemrácsra igazítva, a megtartott és az új hangok, a hanghatások és a zenei részek)
//  2) video/scene.js + video/catmode/cat_shared.js + video/porgos/scene_porgos_part.js -> video/scene_porgos.js / .html
// Utána: node tools/audio_mix.js --tl video/porgos/timeline_porgos.json --out video/porgos/audio_mix_porgos.wav
// Használat: node tools/build_porgos.js
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process'), ffmpeg = require('ffmpeg-static');
const ROOT = path.join(__dirname, '..'), V = path.join(ROOT, 'video'), P = path.join(V, 'porgos');
const EDL = JSON.parse(fs.readFileSync(path.join(P, 'edl_porgos.json'), 'utf8'));
const TL = JSON.parse(fs.readFileSync(path.join(V, 'timeline.json'), 'utf8'));
const DUR = JSON.parse(fs.readFileSync(path.join(V, 'voice/durations.json'), 'utf8'));
const GRID = 30 / EDL.bpm;                   // vágás ütemre: minden szakasz vége egy nyolcadra esik (120 BPM: 0,25 s)
const r2 = x => Math.round(x * 1000) / 1000;

// az új narrátor-mondatok: hol kezdődik bennük a beszéd, és meddig tart
function wavInfo(file) {
  const b = fs.readFileSync(file); let p = 12, sr = 24000, ch = 1;
  while (p < b.length - 8) {
    const id = b.toString('ascii', p, p + 4), len = b.readUInt32LE(p + 4);
    if (id === 'fmt ') { ch = b.readUInt16LE(p + 10); sr = b.readUInt32LE(p + 12); }
    if (id === 'data') {
      const n = Math.floor(len / 2 / ch); let pk = 0; const a = new Float32Array(n);
      for (let i = 0; i < n; i++) { a[i] = b.readInt16LE(p + 8 + i * 2 * ch) / 32768; pk = Math.max(pk, Math.abs(a[i])); }
      let i0 = 0, i1 = n - 1; while (i0 < n && Math.abs(a[i0]) < pk * 0.03) i0++; while (i1 > 0 && Math.abs(a[i1]) < pk * 0.03) i1--;
      return { total: n / sr, lead: i0 / sr, end: (i1 + 1) / sr };
    }
    p += 8 + len + (len % 2);
  }
  throw new Error('nem WAV: ' + file);
}
const partAt = t => (TL.music.find(m => t >= m.from && t < m.to) || { part: 'main' }).part;

let T = 0, prevB = null;
const segs = [], voices = [], sfx = [], parts = [];
let cat = null;
for (const e of EDL.segs) {
  let nv = null;
  if (e.nv) {
    // a keverő 48 kHz-es mono WAV-ot vár (az XTTS 24 kHz-en ad) – átalakítás a video/porgos/voice48 mappába
    const src = path.join(P, 'voice', e.nv + '.wav'), file = path.join(P, 'voice48', e.nv + '.wav');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', src, '-ac', '1', '-ar', '48000', '-c:a', 'pcm_s16le', file]);
    nv ={ id: e.nv, file: path.relative(ROOT, file).replace(/\\/g, '/'), ...wavInfo(file) }; }
  let len, minLen;
  if (e.cat) {
    const L = { pop: 0.5, close: 1.3 };
    L.pet = Math.max(3.2, e.at + (nv.end - nv.lead) - 1.0); L.purr = L.pet + 0.6; L.meow = L.purr + 2.5; L.len = L.meow + 0.9;
    len = minLen = L.len; cat = L;
  } else if (e.nv) { len = e.at + (nv.end - nv.lead) + 0.2; minLen = e.at + (nv.end - nv.lead) + 0.08; }
  else if (e.keep) {
    len = e.b - e.a; minLen = 0.3;
    for (const v of TL.voices) if (v.t >= e.a && v.t < e.b && !EDL.drop.includes(v.id)) minLen = Math.max(minLen, v.t - e.a + DUR[v.id] + 0.1);
    if (minLen > 0.3 && !e.full) len = Math.min(len, minLen + 0.15);     // a mondat utáni üresjárat le
  } else { len = e.len; minLen = e.len * 0.7; }
  // ütemrácsra igazítás: a szakasz vége a legközelebbi negyedre esik (de a benne szóló mondat nem vágódhat le)
  let end = Math.round((T + len) / GRID) * GRID; while (end - T < minLen - 1e-6) end += GRID;
  len = r2(end - T);
  const s = { T: r2(T), len, note: e.note };
  if (e.cat) { s.cat = true; cat.len = len; }
  else { s.a = e.a; s.b = e.keep ? r2(e.a + len) : e.b; }
  s.punch = e.cat || prevB === null || Math.abs((s.a ?? -9) - prevB) > 0.05;
  segs.push(s);
  // hangok
  if (nv) voices.push({ id: nv.id, t: r2(T + e.at - nv.lead), file: nv.file, dur: r2(nv.total) });
  if (e.keep) for (const v of TL.voices) if (v.t >= s.a && v.t < s.b && !EDL.drop.includes(v.id)) voices.push({ id: v.id, t: r2(T + v.t - s.a) });
  // hanghatások (az eredetiek a szakasz sebességével átszámolva) és a cat mode saját hangjai
  if (e.cat) {
    sfx.push({ id: 'pop', t: r2(T + cat.pop) }, { id: 'meow', t: r2(T + cat.pop + 0.05) }, { id: 'rub', t: r2(T + cat.pet + 0.3) },
      { id: 'purr', t: r2(T + cat.purr), len: r2(cat.meow - cat.purr + 0.4) }, { id: 'meow', t: r2(T + cat.meow + 0.05) });
  } else {
    for (const x of TL.sfx) if (x.t >= s.a && x.t < s.b) sfx.push({ id: x.id, t: r2(T + (x.t - s.a) * len / (s.b - s.a)) });
    if (s.punch && segs.length > 1 && !TL.sfx.some(x => x.t >= s.a && x.t < s.a + 0.3)) sfx.push({ id: 'tick', t: r2(T) });   // halk ütés a vágásra
  }
  const part = e.cat ? 'party' : partAt((s.a + s.b) / 2);
  if (parts.length && parts[parts.length - 1].part === part) parts[parts.length - 1].to = r2(T + len); else parts.push({ from: r2(T), to: r2(T + len), part });
  prevB = e.cat ? null : s.b; T += len;
}
const out = { fps: 30, duration: r2(T), bpm: EDL.bpm, voices, sfx, music: parts, segs, cat };
fs.writeFileSync(path.join(P, 'timeline_porgos.json'), JSON.stringify(out, null, 1));
console.log(`idővonal: ${segs.length} szakasz, ${voices.length} mondat, ${sfx.length} hanghatás, hossz ${T.toFixed(1)} s`);

// ---------------------------------------------------------------- a jelenet: az eredeti + vágólista-leképezés + cat mode-blokk
let s = fs.readFileSync(path.join(V, 'scene.js'), 'utf8').replace(/\r\n/g, '\n');
const once = (src, pairs) => { for (const [a, b] of pairs) { if (src.split(a).length !== 2) throw new Error('nem egyszer: ' + a.slice(0, 60)); src = src.replace(a, b); } return src; };
const part = ['catmode/cat_shared.js', 'porgos/scene_porgos_part.js'].map(f => fs.readFileSync(path.join(V, f), 'utf8').replace(/\r\n/g, '\n')).join('\n');
s = once(s, [
  ["  if (s.mode === 'face') {", "  if (s.mode === 'cat') drawCatFace(g, s);\n  else if (s.mode === 'face') {"],
  ['function renderAt(t) {\n  const s = stateAt(t);', part + '\nfunction renderAt(tNew) {\n  const M = mapT(tNew), t = M.t;\n  const s = M.cat ? catState(M.u, t) : stateAt(t);'],
  ['  cube.visible = !s.inside;', '  cube.visible = !s.inside;\n  hand.visible = !!s.hand;\n  if (s.hand) { hand.position.set(s.hand.pos.x, s.hand.y, s.hand.pos.z); hand.rotation.copy(s.hand.rot); }'],
  ['  ctx.drawImage(renderer.domElement, 0, 0, W, H);', '  const z = cutPunch(M);\n  ctx.drawImage(renderer.domElement, -(z - 1) * W / 2, -(z - 1) * H / 2, W * z, H * z);'],
  ['  overlays(t);\n  if (s.inside) insideLabels(t, s);', '  if (M.cat) { catFlash(s); catOverlays(M.u); } else { overlays(t); if (s.inside) insideLabels(t, s); }\n  cutFlash(M);'],
  ['window.duration = TL.duration;', 'window.duration = PG.duration;'],
]);
s = '// GENERÁLT FÁJL – ne szerkeszd kézzel. Forrás: video/scene.js + video/catmode/cat_shared.js + video/porgos/scene_porgos_part.js (tools/build_porgos.js)\n' + s;
fs.writeFileSync(path.join(V, 'scene_porgos.js'), s);
let h = fs.readFileSync(path.join(V, 'scene.html'), 'utf8').replace(/\r\n/g, '\n');
h = h.replace('<title>C-Cube video</title>', '<title>C-Cube – fast cut</title>').replace('src="audio_mix.wav"', 'src="porgos/audio_mix_porgos.wav"')
  .replace('src="scene.js"', 'src="scene_porgos.js"').replace('max="176"', `max="${Math.ceil(T)}"`);
fs.writeFileSync(path.join(V, 'scene_porgos.html'), h);
console.log('kész: video/porgos/timeline_porgos.json, video/scene_porgos.js, video/scene_porgos.html');
