// A „90-es évekbeli amerikai tévéreklám” jelenetének összerakása: a fő videó jelenetének „motorja” (modell, anyagok,
// fények, arc) + a reklám forgatókönyve (video/ad90/scene_ad90_part.js) + VHS-utómunka.
// Kimenet: video/scene_ad90.js és video/scene_ad90.html.  Használat: node tools/build_ad90_scene.js
const fs = require('fs'), path = require('path');
const V = path.join(__dirname, '..', 'video');
let s = fs.readFileSync(path.join(V, 'scene.js'), 'utf8').replace(/\r\n/g, '\n');   // Windows-checkoutban CRLF
const cut = (a, b) => { const i = s.indexOf(a), j = s.indexOf(b, i); if (i < 0 || j < 0) throw new Error('nincs: ' + a); return [i, j]; };
const once = (src, pairs) => { for (const [a, b] of pairs) { if (src.split(a).length !== 2) throw new Error('nem egyszer: ' + a.slice(0, 60)); src = src.replace(a, b); } return src; };

// 1) adatok: a reklám idővonala, a hangok hossza, a mondatok (bemondó + a kocka saját angol mondatai)
s = once(s, [
  ["const TL = await (await fetch('timeline.json')).json();", "const TL = await (await fetch('ad90/timeline_ad90.json')).json();"],
  ["const DUR = await (await fetch('voice/durations.json')).json();", "const DUR = await (await fetch('ad90/durations_ad90.json')).json();"],
  ["const LINES = await (await fetch('lines.json')).json();",
   "const AD_LINES = await (await fetch('ad90/lines_ad90.json')).json();\nconst CUBE_TEXT = Object.fromEntries((await (await fetch('../web/voice/lines.json')).json()).map(l => [l.id, l.text]));\nconst LINES = [...AD_LINES.map(l => ({ id: l.id, text: l.text, style: 'narrator' })), ...Object.entries(CUBE_TEXT).map(([id, text]) => ({ id, text, style: 'cube' }))];"],
  ["  build: await Promise.all(Array.from({ length: 51 }, (_, i) => loadImg(`fusion_build/build_${String(i + 1).padStart(3, '0')}.png`))),\n", ""],
]);
// 2) a robbantott ábra időzítése (a fő videó N08 mondatához kötött) itt nem kell
{ const [i, j] = cut('const EX = (() => {', '})();'); s = s.slice(0, i) + 'const EX = { a: 0, b: 0, c: 0, d: 0, word: () => 0 };' + s.slice(j + 5); }
// 3) a régi forgatókönyv és képfeliratok helyére a reklámé
{ const [i, j] = cut('// ---------------------------------------------------------------- az idő -> állapot', 'function renderAt(t) {');
  s = s.slice(0, i) + fs.readFileSync(path.join(V, 'ad90', 'scene_ad90_part.js'), 'utf8') + '\n' + s.slice(j); }
// 4) renderAt: háttér, elrejtés (a nyitó „hangyás” képnél), rázkódás, új feliratok, a végén VHS-utómunka
s = once(s, [
  ["  const s = stateAt(t);\n  camera.position.copy(s.cam.pos);", "  const s = stateAt(t);\n  drawBg(s.bg, t);\n  camera.position.copy(s.cam.pos);"],
  ["  cube.visible = !s.inside;", "  cube.visible = !s.inside && !s.hidden;"],
  ["  ctx.globalAlpha = 1;\n  ctx.drawImage(renderer.domElement, 0, 0, W, H);",
   "  ctx.globalAlpha = 1;\n  const sh = (s.shake || 0) * 26;\n  ctx.drawImage(renderer.domElement, sh ? Math.sin(t * 97) * sh : 0, sh ? Math.cos(t * 83) * sh : 0, W, H);"],
  ["  overlays(t);\n  if (s.inside) insideLabels(t, s);", "  overlays(t, s);"],
  ["  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');", "  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.15)');"],
  ["  if (s.fade < 1) { ctx.fillStyle = `rgba(0,0,0,${1 - s.fade})`; ctx.fillRect(0, 0, W, H); }\n}",
   "  if (s.fade < 1) { ctx.fillStyle = `rgba(0,0,0,${1 - s.fade})`; ctx.fillRect(0, 0, W, H); }\n  vhs(t, s);\n}"],
]);
s = '// GENERÁLT FÁJL – ne szerkeszd kézzel. Forrás: video/scene.js + video/ad90/scene_ad90_part.js (tools/build_ad90_scene.js)\n' + s;
fs.writeFileSync(path.join(V, 'scene_ad90.js'), s);
let h = fs.readFileSync(path.join(V, 'scene.html'), 'utf8').replace(/\r\n/g, '\n');
h = once(h, [['<title>C-Cube video</title>', '<title>C-Cube – 90s TV ad</title>'], ['src="audio_mix.wav"', 'src="ad90/audio_mix_ad90.wav"'], ['src="scene.js"', 'src="scene_ad90.js"'], ['max="176"', 'max="42"']]);
fs.writeFileSync(path.join(V, 'scene_ad90.html'), h);
console.log('kész: video/scene_ad90.js, video/scene_ad90.html');
