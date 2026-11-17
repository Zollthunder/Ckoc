// A függőleges (9:16) „Cat mode” rövid klip jelenetének összerakása: a fő videó jelenetének „motorja” (modell, anyagok,
// fények, arc) + a klip forgatókönyve (video/catmode/scene_catmode_part.js), álló 1080×1920-as képre.
// Kimenet: video/scene_catmode.js és video/scene_catmode.html.  Használat: node tools/build_catmode_scene.js
const fs = require('fs'), path = require('path');
const V = path.join(__dirname, '..', 'video');
let s = fs.readFileSync(path.join(V, 'scene.js'), 'utf8').replace(/\r\n/g, '\n');   // Windows-checkoutban CRLF
const cut = (a, b) => { const i = s.indexOf(a), j = s.indexOf(b, i); if (i < 0 || j < 0) throw new Error('nincs: ' + a); return [i, j]; };
const once = (src, pairs) => { for (const [a, b] of pairs) { if (src.split(a).length !== 2) throw new Error('nem egyszer: ' + a.slice(0, 60)); src = src.replace(a, b); } return src; };

// 1) álló kép, adatok: a klip idővonala (beszéd nincs, csak felirat, zene és hanghatás)
s = once(s, [
  ['const W = 1920, H = 1080;', 'const W = 1080, H = 1920;'],
  ["const TL = await (await fetch('timeline.json')).json();", "const TL = await (await fetch('catmode/timeline_catmode.json')).json();"],
  ["const DUR = await (await fetch('voice/durations.json')).json();", "const DUR = {};"],
  ["const LINES = await (await fetch('lines.json')).json();", 'const LINES = [];'],
  ["  build: await Promise.all(Array.from({ length: 51 }, (_, i) => loadImg(`fusion_build/build_${String(i + 1).padStart(3, '0')}.png`))),\n", ""],
  // a kijelzőn macskaarc is lehet
  ["  if (s.mode === 'face') {", "  if (s.mode === 'cat') drawCatFace(g, s);\n  else if (s.mode === 'face') {"],
]);
// 2) a robbantott ábra időzítése (a fő videó N08 mondatához kötött) itt nem kell
{ const [i, j] = cut('const EX = (() => {', '})();'); s = s.slice(0, i) + 'const EX = { a: 0, b: 0, c: 0, d: 0, word: () => 0 };' + s.slice(j + 5); }
// 3) a régi forgatókönyv és képfeliratok helyére a klipé
{ const [i, j] = cut('// ---------------------------------------------------------------- az idő -> állapot', 'function renderAt(t) {');
  s = s.slice(0, i) + ['cat_shared.js', 'scene_catmode_part.js'].map(f => fs.readFileSync(path.join(V, 'catmode', f), 'utf8').replace(/\r\n/g, '\n')).join('\n') + '\n' + s.slice(j); }
// 4) renderAt: háttér, simogató kéz, rázkódás, új feliratok, villanás
s = once(s, [
  ["  const s = stateAt(t);\n  camera.position.copy(s.cam.pos);", "  const s = stateAt(t);\n  drawBg(s.bg, t);\n  camera.position.copy(s.cam.pos);"],
  ["  cube.visible = !s.inside;", "  cube.visible = !s.inside && !s.hidden;\n  hand.visible = !!s.hand;\n  if (s.hand) { hand.position.set(s.hand.pos.x, s.hand.y, s.hand.pos.z); hand.rotation.copy(s.hand.rot); }"],
  ["  ctx.globalAlpha = 1;\n  ctx.drawImage(renderer.domElement, 0, 0, W, H);",
   "  ctx.globalAlpha = 1;\n  const sh = (s.shake || 0) * 22;\n  ctx.drawImage(renderer.domElement, sh ? Math.sin(t * 97) * sh : 0, sh ? Math.cos(t * 83) * sh : 0, W, H);"],
  ["  overlays(t);\n  if (s.inside) insideLabels(t, s);", "  overlays(t, s);"],
  ["  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');", "  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.18)');"],
  ["  if (s.fade < 1) { ctx.fillStyle = `rgba(0,0,0,${1 - s.fade})`; ctx.fillRect(0, 0, W, H); }\n}",
   "  post(t, s);\n  if (s.fade < 1) { ctx.fillStyle = `rgba(0,0,0,${1 - s.fade})`; ctx.fillRect(0, 0, W, H); }\n}"],
]);
s = '// GENERÁLT FÁJL – ne szerkeszd kézzel. Forrás: video/scene.js + video/catmode/scene_catmode_part.js (tools/build_catmode_scene.js)\n' + s;
fs.writeFileSync(path.join(V, 'scene_catmode.js'), s);
let h = fs.readFileSync(path.join(V, 'scene.html'), 'utf8').replace(/\r\n/g, '\n');
h = once(h, [['<title>C-Cube video</title>', '<title>C-Cube – Cat mode (9:16)</title>'], ['src="audio_mix.wav"', 'src="catmode/audio_mix_catmode.wav"'],
  ['src="scene.js"', 'src="scene_catmode.js"'], ['max="176"', 'max="20"'], ['aspect-ratio: 16 / 9;', 'aspect-ratio: 9 / 16;'], ['width="1920" height="1080"', 'width="1080" height="1920"']]);
fs.writeFileSync(path.join(V, 'scene_catmode.html'), h);
console.log('kész: video/scene_catmode.js, video/scene_catmode.html');
