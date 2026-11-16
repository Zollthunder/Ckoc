// A japán reklám jelenetének összerakása: a fő videó jelenetének „motorja” (modell, anyagok, fények, arc)
// + a japán forgatókönyv (video/jp/scene_jp_part.js). Kimenet: video/scene_jp.js és video/scene_jp.html
// Használat: node tools/build_jp_scene.js
const fs = require('fs'), path = require('path');
const V = path.join(__dirname, '..', 'video');
let s = fs.readFileSync(path.join(V, 'scene.js'), 'utf8');
const cut = (a, b) => { const i = s.indexOf(a), j = s.indexOf(b, i); if (i < 0 || j < 0) throw new Error('nincs: ' + a); return [i, j]; };

// 1) adatok: japán idővonal, hosszak, mondatok
const R = [
  ["const TL = await (await fetch('timeline.json')).json();", "const TL = await (await fetch('jp/timeline_jp.json')).json();"],
  ["const DUR = await (await fetch('voice/durations.json')).json();", "const DUR = await (await fetch('jp/durations_jp.json')).json();"],
  ["const LINES = await (await fetch('lines.json')).json();",
   "const JP_LINES = await (await fetch('jp/lines_jp.json')).json();\nconst CUBE_TEXT = Object.fromEntries((await (await fetch('../web/voice/lines.json')).json()).map(l => [l.id, l.text]));\nconst LINES = [...JP_LINES.map(l => ({ id: l.id, text: l.ja, style: 'narrator' })), ...Object.entries(CUBE_TEXT).map(([id, text]) => ({ id, text, style: 'cube' }))];"],
  ["  build: await Promise.all(Array.from({ length: 51 }, (_, i) => loadImg(`fusion_build/build_${String(i + 1).padStart(3, '0')}.png`))),\n", ""],
  ["  for (const v of TL.voices) if (t >= v.t && t < v.t + DUR[v.id]) return { ...v, line: LINES.find(l => l.id === v.id), local: t - v.t };",
   "  for (const v of TL.voices) if (t >= v.t && t < v.t + DUR[v.id]) return { ...v, line: LINES.find(l => l.id === v.id), local: t - v.t };"],
];
for (const [a, b] of R) { if (s.split(a).length !== 2) throw new Error('nem egyszer: ' + a.slice(0, 60)); s = s.replace(a, b); }
// 2) a robbantott ábra időzítése (az N08 mondathoz kötött) itt nem kell
{ const [i, j] = cut('const EX = (() => {', '})();'); s = s.slice(0, i) + 'const EX = { a: 0, b: 0, c: 0, d: 0, word: () => 0 };' + s.slice(j + 5); }
// 3) a régi forgatókönyv és képfeliratok helyére a japán
{ const [i, j] = cut('// ---------------------------------------------------------------- az idő -> állapot', 'function renderAt(t) {');
  s = s.slice(0, i) + fs.readFileSync(path.join(V, 'jp', 'scene_jp_part.js'), 'utf8') + '\n' + s.slice(j); }
// 4) renderAt: háttér rajzolása, rázkódás, az új képfeliratok
const R2 = [
  ["  const s = stateAt(t);\n  camera.position.copy(s.cam.pos);", "  const s = stateAt(t);\n  drawBg(s.bg, t);\n  camera.position.copy(s.cam.pos);"],
  ["  ctx.globalAlpha = 1;\n  ctx.drawImage(renderer.domElement, 0, 0, W, H);",
   "  ctx.globalAlpha = 1;\n  const sh = (s.shake || 0) * 26;\n  ctx.drawImage(renderer.domElement, sh ? Math.sin(t * 97) * sh : 0, sh ? Math.cos(t * 83) * sh : 0, W, H);"],
  ["  overlays(t);\n  if (s.inside) insideLabels(t, s);", "  overlays(t, s);"],
  ["  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');", "  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.18)');"],
];
for (const [a, b] of R2) { if (s.split(a).length !== 2) throw new Error('nem egyszer: ' + a.slice(0, 60)); s = s.replace(a, b); }
s = '// GENERÁLT FÁJL – ne szerkeszd kézzel. Forrás: video/scene.js + video/jp/scene_jp_part.js (tools/build_jp_scene.js)\n' + s;
fs.writeFileSync(path.join(V, 'scene_jp.js'), s);
let h = fs.readFileSync(path.join(V, 'scene.html'), 'utf8');
h = h.replace('<title>C-Cube video</title>', '<title>C-Cube – Japanese ad</title>').replace('src="audio_mix.wav"', 'src="jp/audio_mix_jp.wav"').replace('src="scene.js"', 'src="scene_jp.js"').replace('max="176"', 'max="31.6"');
fs.writeFileSync(path.join(V, 'scene_jp.html'), h);
console.log('kész: video/scene_jp.js, video/scene_jp.html');
