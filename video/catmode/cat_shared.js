// Közös macskás elemek (cat mode): a macskaarc a kijelzőn és a simogató kéz. Használja: tools/build_catmode_scene.js, tools/build_porgos_scene.js
// (a fő videó jelenetének motorja után illesztve: THREE, scene, clamp elérhető)
const TAU = Math.PI * 2;
const CATC = { eye: '#c4f06e', nose: '#ff8caa', ear: '#783c50' };

// ---------------------------------------------------------------- a macskaarc a kocka kijelzőjén (ugyanaz, mint a XIAO-n / a szimulátorban)
// A 240 px-es XIAO-rajz koordinátái, 512 px-es kijelzőképre nagyítva. Mezők: purr, perk (fülhegyezés), pop (a fülek kiugrása),
// lookX/lookY, blink, buzz (bajusz remegése).
function drawCatFace(g, s) {
  const k = 2.0, P = (x, y) => [x * k, y * k], now = s.t, purr = !!s.purr, perk = (s.perk || 0) * 8, pop = s.pop == null ? 1 : s.pop;
  const ex = (s.lookX || 0) * 14, ey = (s.lookY || 0) * 8, open = 1 - clamp(s.blink || 0);
  const poly = (pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y], i) => { const [px, py] = P(x, y); i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.closePath(); g.fill(); };
  g.shadowColor = CATC.eye; g.shadowBlur = 26;
  for (const sx of [-1, 1]) {
    const bx = sx * 52, tw = purr ? Math.sin(now * 3 + sx) * 2 : 0, tip = -66 - (30 + perk) * pop;
    if (pop > 0.02) {
      poly([[bx - 30, -66], [bx + 30, -66], [bx + sx * 10 + tw, tip]], CATC.eye);
      g.shadowBlur = 0; poly([[bx - 17, -70], [bx + 17, -70], [bx + sx * 7 + tw, -70 - (18 + perk) * pop]], CATC.ear); g.shadowBlur = 26;
    }
    const [x, y] = P(sx * 40 + ex, -24 + ey);
    if (purr) { g.strokeStyle = CATC.eye; g.lineWidth = 12; g.lineCap = 'round'; g.beginPath(); g.arc(x, y + 8 * k, 15 * k, 1.11 * Math.PI, 1.89 * Math.PI); g.stroke(); continue; }
    const h = Math.max(3, 36 * open * (s.perk ? 1.1 : 1)) * k;
    g.fillStyle = CATC.eye; g.beginPath(); g.ellipse(x, y, 18 * k, h / 2, 0, 0, TAU); g.fill();
    if (h > 10 * k) { g.shadowBlur = 0; g.fillStyle = '#050608'; g.beginPath(); g.ellipse(x + ex * 0.15 * k, y, (s.perk ? 6 : 3.5) * k, h / 2 - 3 * k, 0, 0, TAU); g.fill(); g.shadowBlur = 26; }
  }
  const nx = ex * 0.4, ny = 10 + ey * 0.4, my = ny + 14;
  g.shadowColor = CATC.nose; poly([[nx - 8, ny - 4], [nx + 8, ny - 4], [nx, ny + 5]], CATC.nose); g.shadowColor = CATC.eye;
  g.strokeStyle = CATC.eye; g.fillStyle = CATC.eye; g.lineWidth = 9; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); for (let i = -6; i <= 6; i++) { const [x, y] = P(nx + 16 * i / 6, my + 6 * Math.abs(Math.sin(Math.PI * i / 6))); i > -6 ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
  g.lineWidth = 4; g.globalAlpha = 0.85; g.shadowBlur = 10;
  const buzz = purr ? Math.sin(now * 40) * 1.4 : (s.buzz || 0) * Math.sin(now * 60) * 3;
  [[-1, -6], [-1, 8], [1, -6], [1, 8]].forEach(([sx, dy], i) => {
    const [x0, y0] = P(nx + sx * 26, ny + 6 + dy * 0.3), [x1, y1] = P(nx + sx * 88, ny + 6 + dy + buzz * (i % 2 ? 1 : -1));
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  });
  g.globalAlpha = 1; g.shadowBlur = 20;
  if (purr) for (let i = 0; i < 5; i++) { const [px, py] = P(-28 + i * 14, 66); g.globalAlpha = 0.25 + 0.75 * Math.max(0, Math.sin(now * 5 - i * 0.9)); g.beginPath(); g.arc(px, py, 4 * k, 0, TAU); g.fill(); }
  g.globalAlpha = 1;
}

// ---------------------------------------------------------------- simogató kéz (stilizált: tenyér + négy ujj + hüvelykujj)
const skin = new THREE.MeshStandardMaterial({ color: 0xb87a5c, roughness: 0.7 });
const hand = new THREE.Group();
{
  const palm = new THREE.Mesh(new THREE.CapsuleGeometry(1.55, 1.6, 8, 24), skin); palm.rotation.x = Math.PI / 2; palm.scale.set(1, 1, 0.48); hand.add(palm);
  [-1.35, -0.45, 0.45, 1.3].forEach((x, i) => { const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, [2.0, 2.5, 2.4, 1.8][i], 8, 16), skin); f.rotation.x = Math.PI / 2; f.position.set(x, -0.05, -2.6 - [2.0, 2.5, 2.4, 1.8][i] / 2 + 0.6); hand.add(f); });
  const th = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 1.7, 8, 16), skin); th.rotation.set(Math.PI / 2, 0, 0.9); th.position.set(-2.2, -0.15, -0.6); th.rotation.y = 0.6; hand.add(th);
  hand.traverse(m => { m.castShadow = true; });
  hand.visible = false; scene.add(hand);
}

