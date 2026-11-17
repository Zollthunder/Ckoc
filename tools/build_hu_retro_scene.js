// A „retró magyar tévéreklám” (1978 · 1993 · 2004) jelenetének összerakása: a fő videó jelenetének „motorja” (modell,
// anyagok, fények, arc) + a reklám forgatókönyve (video/hu_retro/scene_hu_retro_part.js) + korszakonkénti utómunka.
// Kimenet: video/scene_hu_retro.js és video/scene_hu_retro.html.  Használat: node tools/build_hu_retro_scene.js
const fs = require('fs'), path = require('path');
const V = path.join(__dirname, '..', 'video');
let s = fs.readFileSync(path.join(V, 'scene.js'), 'utf8').replace(/\r\n/g, '\n');   // Windows-checkoutban CRLF
const cut = (a, b) => { const i = s.indexOf(a), j = s.indexOf(b, i); if (i < 0 || j < 0) throw new Error('nincs: ' + a); return [i, j]; };
const once = (src, pairs) => { for (const [a, b] of pairs) { if (src.split(a).length !== 2) throw new Error('nem egyszer: ' + a.slice(0, 60)); src = src.replace(a, b); } return src; };

// 1) adatok: a reklám idővonala, a hangok hossza, a mondatok
s = once(s, [
  ["const TL = await (await fetch('timeline.json')).json();", "const TL = await (await fetch('hu_retro/timeline_hu_retro.json')).json();"],
  ["const DUR = await (await fetch('voice/durations.json')).json();", "const DUR = await (await fetch('hu_retro/durations_hu_retro.json')).json();"],
  ["const LINES = await (await fetch('lines.json')).json();",
   "const LINES = (await (await fetch('hu_retro/lines_hu_retro.json')).json()).map(l => ({ id: l.id, text: l.text, style: 'narrator' }));"],
  ["  build: await Promise.all(Array.from({ length: 51 }, (_, i) => loadImg(`fusion_build/build_${String(i + 1).padStart(3, '0')}.png`))),\n", ""],
]);
// 2) a robbantott ábra időzítése (a fő videó N08 mondatához kötött) itt nem kell
{ const [i, j] = cut('const EX = (() => {', '})();'); s = s.slice(0, i) + 'const EX = { a: 0, b: 0, c: 0, d: 0, word: () => 0 };' + s.slice(j + 5); }
// 3) a régi forgatókönyv és képfeliratok helyére a reklámé
{ const [i, j] = cut('// ---------------------------------------------------------------- az idő -> állapot', 'function renderAt(t) {');
  s = s.slice(0, i) + fs.readFileSync(path.join(V, 'hu_retro', 'scene_hu_retro_part.js'), 'utf8').replace(/\r\n/g, '\n') + '\n' + s.slice(j); }
// 4) renderAt: stop-motion időkvantálás (1978), háttér, elrejtés (hangyás kép), rázkódás, új feliratok, korszakos utómunka
s = once(s, [
  ["function renderAt(t) {\n  const s = stateAt(t);\n  camera.position.copy(s.cam.pos);",
   "function renderAt(tReal) {\n  const t = eraQ(tReal);\n  const s = stateAt(t);\n  drawBg(s.bg, t);\n  camera.position.copy(s.cam.pos);"],
  ["  cube.visible = !s.inside;", "  cube.visible = !s.inside && !s.hidden;"],
  ["  ctx.globalAlpha = 1;\n  ctx.drawImage(renderer.domElement, 0, 0, W, H);",
   "  ctx.globalAlpha = 1;\n  const sh = (s.shake || 0) * 26;\n  ctx.drawImage(renderer.domElement, sh ? Math.sin(t * 97) * sh : 0, sh ? Math.cos(t * 83) * sh : 0, W, H);"],
  ["  overlays(t);\n  if (s.inside) insideLabels(t, s);", "  overlays(t, s);"],
  ["  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');", "  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.12)');"],
  ["  if (s.fade < 1) { ctx.fillStyle = `rgba(0,0,0,${1 - s.fade})`; ctx.fillRect(0, 0, W, H); }\n}",
   "  post(tReal, s);\n  if (s.fade < 1) { ctx.fillStyle = `rgba(0,0,0,${1 - s.fade})`; ctx.fillRect(0, 0, W, H); }\n}"],
]);
s = '// GENERÁLT FÁJL – ne szerkeszd kézzel. Forrás: video/scene.js + video/hu_retro/scene_hu_retro_part.js (tools/build_hu_retro_scene.js)\n' + s;
fs.writeFileSync(path.join(V, 'scene_hu_retro.js'), s);
let h = fs.readFileSync(path.join(V, 'scene.html'), 'utf8').replace(/\r\n/g, '\n');
h = once(h, [['<title>C-Cube video</title>', '<title>C-kocka – retró magyar reklám</title>'], ['src="audio_mix.wav"', 'src="hu_retro/audio_mix_hu_retro.wav"'], ['src="scene.js"', 'src="scene_hu_retro.js"'], ['max="176"', 'max="45"'], ['lang="en"', 'lang="hu"']]);
fs.writeFileSync(path.join(V, 'scene_hu_retro.html'), h);
console.log('kész: video/scene_hu_retro.js, video/scene_hu_retro.html');
