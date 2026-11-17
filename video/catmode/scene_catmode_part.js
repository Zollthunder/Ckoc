// ================================================================ „CAT MODE” – függőleges (9:16) rövid klip forgatókönyve és képi elemei
// (a fenti rész a fő videó jelenetéből jön: a kocka modellje, anyagai, fényei és az arc rajzolása)
// Pörgős, ~1 s-os vágások 120 BPM-re, nagy, vastag feliratok végig (sokan hang nélkül nézik), a végén hurokba illő zárás:
// az utolsó képkocka ugyanaz a „sima arc”, amivel a klip kezdődik.
const CUTS = TL.cuts.map((c, i) => ({ ...c, end: (TL.cuts[i + 1] || { t: TL.duration }).t }));
const cutAt = t => CUTS.find(c => t >= c.t && t < c.end) || CUTS[CUTS.length - 1];
const TAU = Math.PI * 2;
const hash = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const popScale = (u, a, len = 0.22) => { const k = clamp((u - a) / len); return k <= 0 ? 0 : k < 1 ? Math.sin(k * Math.PI / 2) + 0.35 * Math.sin(k * Math.PI) : 1; };
const FB = '"Segoe UI Black", "Arial Black", "Segoe UI", "Segoe UI Emoji", sans-serif';
const CATC = { eye: '#c4f06e', nose: '#ff8caa', ear: '#783c50' };
const PLAIN = '#78e6ff';

// ---------------------------------------------------------------- háttér: puha színátmenet + lassan úszó mancsnyomok
const bgCanvas = document.createElement('canvas'); bgCanvas.width = 540; bgCanvas.height = 960;
const bgCtx = bgCanvas.getContext('2d');
const bgTex = new THREE.CanvasTexture(bgCanvas); bgTex.colorSpace = THREE.SRGBColorSpace;
scene.background = bgTex; scene.fog = null; desk.visible = false;

function paw(g, x, y, r, rot) {
  g.save(); g.translate(x, y); g.rotate(rot); g.beginPath();
  g.ellipse(0, r * 0.35, r * 0.62, r * 0.5, 0, 0, TAU);
  for (const [dx, dy] of [[-0.62, -0.32], [-0.22, -0.68], [0.22, -0.68], [0.62, -0.32]]) { g.moveTo(dx * r + r * 0.22, dy * r); g.ellipse(dx * r, dy * r, r * 0.22, r * 0.28, 0, 0, TAU); }
  g.fill(); g.restore();
}
function drawBg(b, t) {
  const g = bgCtx, w = 540, h = 960;
  const gr = g.createLinearGradient(0, 0, w * 0.3, h); gr.addColorStop(0, b.c1); gr.addColorStop(1, b.c2);
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  if (b.rays) {                                   // napsugaras „ütés” a nagy pillanatokra
    g.save(); g.globalAlpha = 0.18; g.fillStyle = '#ffffff'; const cx = w / 2, cy = h * (b.cy ?? 0.45), n = 16, rot = t * 0.6;
    for (let i = 0; i < n; i++) { const a0 = rot + i * TAU / n; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a0) * 1400, cy + Math.sin(a0) * 1400); g.lineTo(cx + Math.cos(a0 + TAU / n / 2) * 1400, cy + Math.sin(a0 + TAU / n / 2) * 1400); g.closePath(); g.fill(); }
    g.restore();
  }
  if (b.paws !== false) {
    g.save(); g.fillStyle = b.pawCol || 'rgba(255,255,255,0.16)';
    for (let i = 0; i < 22; i++) {
      const x = (hash(i) * w * 1.2 + Math.sin(t * 0.7 + i) * 10) % (w * 1.2) - w * 0.1;
      const y = ((hash(i + 3) * h * 1.2 - t * 45 * (0.5 + hash(i + 9))) % (h * 1.2) + h * 1.2) % (h * 1.2) - h * 0.1;
      paw(g, x, y, 14 + hash(i + 5) * 14, hash(i + 11) * TAU);
    }
    g.restore();
  }
  bgTex.needsUpdate = true;
}

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

// ---------------------------------------------------------------- idő -> állapot
function stateAt(t) {
  const c = cutAt(t), u = t - c.t;
  const s = {
    cam: shot(V3(0, 4.6, 16), V3(0, 4.0, 0), 42), root: V3(0, 4, 0), rot: new THREE.Euler(0, 0, 0),
    cColor: () => C(0xc4f06e).multiplyScalar(1.1), ringColor: () => C(0xc4f06e), glowColor: C(0xc4f06e), glowI: 0.6,
    face: { mode: 'cat', t, color: CATC.eye }, corner: C(0xff8020), patch: 0, led: 0, btn: 0, finger: null, ripple: null, fade: 1,
    inside: false, explode: 0, bg: { c1: '#ffb3cf', c2: '#8a7dff' }, shake: 0, cut: c, u, hidden: false, hand: null, flash: 0,
  };
  const bl = (t * 0.45) % 1; s.face.blink = bl > 0.95 ? Math.sin((bl - 0.95) / 0.05 * Math.PI) : 0;
  const punch = (a, k = 0.1) => 1 - k * Math.exp(-Math.max(0, u - a) * 9) * (u >= a ? 1 : 0);    // „zoom-ütés” ütemre
  const plain = () => { s.face = { mode: 'face', t, smile: 1, blink: 0, color: PLAIN }; s.cColor = () => C(0x78e6ff); s.ringColor = () => C(0x78e6ff); s.glowColor = C(0x78e6ff); s.bg = { c1: '#3a4a66', c2: '#151a26', pawCol: 'rgba(255,255,255,0.05)' }; };
  const purring = (amt = 1) => { s.face.purr = true; s.rot = new THREE.Euler(Math.sin(t * 61) * 0.012 * amt, Math.sin(t * 47) * 0.01 * amt, Math.sin(t * 53) * 0.014 * amt); s.ripple = ((t - 7.0) % 1.1); };
  switch (c.id) {
    case 'hook': {     // sima arc -> villanás -> macskafülek „pop” (+ miaú)
      s.cam = shot(V3(0, 4.6, 16 * punch(0.4, 0.14)), V3(0, 4.0, 0), 42);
      if (u < 0.4) plain();
      else { s.face.pop = popScale(u, 0.4, 0.25); s.face.buzz = Math.exp(-(u - 0.4) * 5); s.bg = { c1: '#ffb3cf', c2: '#8a7dff', rays: true }; s.shake = u < 0.7 ? (0.7 - u) * 1.6 : 0; }
      s.flash = Math.max(0, 1 - Math.abs(u - 0.4) / 0.12);
      break;
    }
    case 'app': {      // egy koppintás az appban
      s.cam = shot(V3(4, 8, 40), V3(0, 1.0, 0), 42);
      s.bg = { c1: '#ffd36e', c2: '#ff7aa8' };
      if (u < 0.5) { s.face = { mode: 'face', t, smile: 1, color: PLAIN }; s.cColor = () => C(0x78e6ff); s.ringColor = () => C(0x78e6ff); s.face.pop = 0; }
      else s.face.pop = popScale(u, 0.5, 0.2);
      break;
    }
    case 'eyes': {     // közeli: réspupilla, ide-oda néz
      s.cam = shot(V3(0, 4.4, 9.6 * punch(0)), V3(0, 4.3, 4), 40);
      s.face.lookX = u < 0.35 ? -1 : u < 0.7 ? 1 : 0; s.face.blink = 0;
      s.bg = { c1: '#9ef0c0', c2: '#2c8c8c' };
      break;
    }
    case 'nose': {
      s.cam = shot(V3(1.2, 3.8, 9.0 * punch(0)), V3(0, 3.7, 4), 40);
      s.face.lookY = -0.3; s.bg = { c1: '#ffc2d6', c2: '#ff6e9c' };
      break;
    }
    case 'whisk': {
      s.cam = shot(V3(-1.4, 4.0, 9.4 * punch(0)), V3(0, 3.8, 4), 40);
      s.face.buzz = u > 0.4 ? Math.exp(-(u - 0.4) * 4) : 0; s.bg = { c1: '#c9b8ff', c2: '#5a46c8' };
      break;
    }
    case 'pet': {      // a kéz megsimogatja a tetőt
      s.cam = shot(V3(12, 18, 27), V3(0, 4.8, 0), 42);
      s.bg = { c1: '#ffe2b0', c2: '#ff9f6e' };
      const k = clamp((u - 0.15) / 1.3), stroke = Math.sin(k * TAU * 1.5);
      if (u > 0.05) s.hand = { pos: V3(0.3, 0, 1.2 + stroke * 2.4), rot: new THREE.Euler(-0.08, 0.15, 0), y: lerp(16, 9.25, ease(u, 0.05, 0.3)) };
      s.face.lookY = -0.9; s.face.blink = u > 0.9 ? clamp((u - 0.9) / 0.3) * 0.6 : 0;
      break;
    }
    case 'purr1': {    // dorombol: a kocka remeg, az asztalon rezgéshullámok
      s.cam = shot(V3(5, 8, 34 * punch(0, 0.12)), V3(0, 3.0, 0), 42); purring(1.6);
      s.bg = { c1: '#ff9ec4', c2: '#ffcf6e', rays: true, cy: 0.5 }; s.glowI = 1.0;
      break;
    }
    case 'purr2': {
      s.cam = shot(V3(0.4, 4.3, 9.2), V3(0, 4.1, 4), 40); purring(0.8);
      s.bg = { c1: '#ffd0e4', c2: '#ff86b4' };
      break;
    }
    case 'purr3': {    // alacsony szög: a rezgőmotor „berregése” hullámokban
      s.cam = shot(V3(-13, 1.4, 26 * punch(0, 0.1)), V3(0, 3.0, 0), 44); purring(1.8);
      s.bg = { c1: '#7ef0ff', c2: '#6a5cff' }; s.glowI = 1.2; s.ripple = (u % 0.5) * 2.2;
      break;
    }
    case 'hu': {
      s.cam = shot(V3(-4, 7, 33), V3(0, 2.6, 0), 42); purring(0.7);
      s.bg = { c1: '#d9f7e2', c2: '#7fd6a4', pawCol: 'rgba(196,90,120,0.14)' };
      s.cColor = () => C(0xff8caa).multiplyScalar(1.1); s.ringColor = () => C(0xff8caa);
      break;
    }
    case 'nofur': {
      s.cam = shot(V3(8, 6, 33 * punch(0)), V3(0, 2.8, 0), 42); s.rot = new THREE.Euler(0, -0.25, 0);
      s.bg = { c1: '#ffe680', c2: '#ffa94d' }; s.face.lookX = -0.6;
      break;
    }
    case 'litter': {
      s.cam = shot(V3(-8, 6, 33 * punch(0)), V3(0, 2.8, 0), 42); s.rot = new THREE.Euler(0, 0.25, 0);
      s.bg = { c1: '#a0e8ff', c2: '#4d8dff' }; s.face.lookX = 0.6;
      break;
    }
    case 'zoom': {     // „No 3 a.m. zoomies.” … aztán mégis pörög egyet: „…mostly.”
      s.cam = shot(V3(0, 7, 37), V3(0, 3.0, 0), 42);
      s.bg = { c1: '#2b2f6e', c2: '#0e0f24', pawCol: 'rgba(196,240,110,0.10)' };
      const k = ease(u, 0.75, 1.25);
      s.rot = new THREE.Euler(0, k * TAU * 2, 0); s.root = V3(Math.sin(k * Math.PI) * 3.5, 4 + Math.sin(k * Math.PI) * 2.5, 0);
      s.face.lookX = u < 0.75 ? 0 : 0.8; s.face.perk = u > 0.75 ? 1 : 0; s.shake = u > 1.25 && u < 1.45 ? (1.45 - u) * 4 : 0;
      break;
    }
    case 'cicc': {     // „cicc-cicc!” – a fülek felhegyeződnek
      s.cam = shot(V3(2, 5.2, 13 * punch(0.4, 0.12)), V3(0, 4.6, 0), 42);
      s.bg = { c1: '#d6ffb0', c2: '#5cc87a' };
      s.face.perk = ease(u, 0.38, 0.55); s.face.lookX = -0.4 + 0.8 * ease(u, 0.38, 0.6); s.face.blink = 0;
      break;
    }
    case 'meow2': {
      s.cam = shot(V3(0, 4.6, 14 * punch(0.05, 0.16)), V3(0, 4.2, 0), 42);
      s.bg = { c1: '#ffb3cf', c2: '#8a7dff', rays: true };
      s.face.pop = 0.75 + 0.25 * popScale(u, 0.0, 0.2); s.face.buzz = Math.exp(-u * 4); s.shake = u < 0.25 ? 0.6 : 0;
      break;
    }
    case 'end': {      // „Hi, C! 🐱” / „Cat mode. Now purring.”
      s.cam = shot(V3(Math.sin(u * 0.25) * 5, 7, 35 - u * 1.6), V3(0, 3.6, 0), 42);
      s.bg = { c1: '#ffb3cf', c2: '#8a7dff', rays: true, cy: 0.62 };
      if (u > 0.4) purring(0.6);
      s.glowI = 1.0;
      break;
    }
    case 'loop': {     // vissza a nyitó sima archoz -> a klip újrakezdése észrevétlen
      plain(); s.flash = Math.max(0, 1 - Math.abs(u + c.t - 19.55) / 0.12);
      break;
    }
  }
  if (c.id === 'hook' && u < 0.4) s.cam = shot(V3(0, 4.6, 16), V3(0, 4.0, 0), 42);
  return s;
}

// ---------------------------------------------------------------- 2D: feliratok és a telefon
// Nagy, vastag felirat: fehér (vagy színes) kitöltés, vastag fekete körvonal, „pop” belépés, enyhe döntés.
function cap(text, y, k, o = {}) {
  if (k <= 0.01) return;
  const size = o.size || 104, col = o.col || '#ffffff', rot = o.rot ?? -0.03, maxW = o.maxW || 940;
  ctx.save(); ctx.font = `900 ${size}px ${FB}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  const lines = wrap(ctx, text, maxW), lh = size * 1.08;
  ctx.translate(W / 2 + (o.dx || 0), y); ctx.rotate(rot); ctx.scale(k, k);
  lines.forEach((l, i) => {
    const yy = (i - (lines.length - 1) / 2) * lh;
    if (o.box) { const w = ctx.measureText(l).width + size * 0.6; ctx.fillStyle = o.box; rr(ctx, -w / 2, yy - lh / 2, w, lh, size * 0.22); ctx.fill(); }
    ctx.lineWidth = size * 0.2; ctx.strokeStyle = o.stroke || '#14101e'; ctx.strokeText(l, 0, yy);
    ctx.fillStyle = col; ctx.fillText(l, 0, yy);
  });
  ctx.restore();
}
const inK = (u, a, b = 99) => popScale(u, a, 0.18) * (u < b ? 1 : 0);
function phoneUI(u) {      // a C-kocka saját appjának stilizált kapcsolója (nem létező felület utánzata)
  const k = clamp(u / 0.18), x = W / 2 - 400, y = 1080 + (1 - k) * 300, w = 800, h = 560;
  ctx.save(); ctx.globalAlpha = k;
  ctx.fillStyle = 'rgba(20,18,30,0.92)'; rr(ctx, x, y, w, h, 60); ctx.fill();
  ctx.fillStyle = '#2a2738'; rr(ctx, x + 30, y + 30, w - 60, h - 60, 40); ctx.fill();
  ctx.fillStyle = '#9aa0b4'; ctx.font = `700 40px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('C-Cube · modes', x + 70, y + 95);
  const on = ease(u, 0.45, 0.55);
  ctx.fillStyle = '#ffffff'; ctx.font = `800 60px ${FONT}`; ctx.fillText('🐱 Cat mode', x + 70, y + 230);
  const sx = x + w - 230, sy = y + 195;
  ctx.fillStyle = on > 0.5 ? CATC.eye : '#4a4658'; rr(ctx, sx, sy, 150, 76, 38); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sx + 38 + on * 74, sy + 38, 30, 0, TAU); ctx.fill();
  ctx.fillStyle = '#6f6a82'; ctx.font = `600 40px ${FONT}`;
  ctx.fillText('🎉 Party', x + 70, y + 360); ctx.fillText('🌙 Do not disturb', x + 70, y + 450);
  // koppintó ujjhegy
  const tp = ease(u, 0.3, 0.45) * (1 - ease(u, 0.6, 0.8));
  if (tp > 0) { ctx.globalAlpha = tp * 0.85; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(sx + 75, sy + 38, 46 + (1 - tp) * 30, 0, TAU); ctx.fill(); }
  ctx.restore();
}
function overlays(t, s) {
  const c = s.cut, u = s.u;
  const Y1 = 330, Y2 = 1520;                               // felső és alsó feliratsáv (a 9:16-os felületek szélei szabadon maradnak)
  switch (c.id) {
    case 'hook':
      if (u < 0.4) cap('POV: your desk cube…', Y1, 1, { size: 84, rot: 0 });
      else { cap('…has a', Y1 - 30, inK(u, 0.4), { size: 84 }); cap('CAT MODE 🐱', Y2, inK(u, 0.45), { size: 132, col: CATC.eye, rot: -0.05 }); }
      break;
    case 'app': cap('One tap in the app', Y1, inK(u, 0), { size: 92 }); phoneUI(u); break;
    case 'eyes': cap('slit pupils ✔', Y2, inK(u, 0.05), { col: CATC.eye }); break;
    case 'nose': cap('pink nose ✔', Y1, inK(u, 0.0), { col: CATC.nose }); cap('ω mouth ✔', Y2, inK(u, 0.45)); break;
    case 'whisk': cap('whiskers ✔', Y2, inK(u, 0.05), { col: '#ffffff' }); break;
    case 'pet': cap('now… pet the roof', Y1, inK(u, 0.05), { size: 96 }); cap('👋', Y2 - 40, inK(u, 0.5), { size: 150, rot: Math.sin(u * 9) * 0.2 }); break;
    case 'purr1': case 'purr2': case 'purr3': {
      const j = (t * 37) % 1 < 0.5 ? 1 : -1;
      cap('PRRRRR', Y1, inK(u, 0), { size: 150, col: CATC.nose, rot: -0.05, dx: j * 4 });
      cap(c.id === 'purr1' ? 'it actually purrs' : c.id === 'purr2' ? '(eyes: ^ ^)' : '+ vibration motor 〰', Y2, inK(u, 0.1), { size: 88 });
      break;
    }
    case 'hu': cap('Hungarian for purr:', Y1 - 70, inK(u, 0), { size: 76 }); cap('„DOROMBOL”', Y1 + 75, inK(u, 0.15), { size: 120, col: CATC.nose }); cap('(say it 3× fast)', Y2, inK(u, 0.55), { size: 70 }); break;
    case 'nofur': cap('no fur 🧶', Y1, inK(u, 0)); break;
    case 'litter': cap('no litter box 📦', Y1, inK(u, 0)); break;
    case 'zoom': cap('no 3 a.m. zoomies', Y1, inK(u, 0)); cap('…mostly.', Y2, inK(u, 0.8), { col: CATC.eye, size: 120 }); break;
    case 'cicc': cap('„cicc-cicc!”', Y1, inK(u, 0), { col: CATC.eye, size: 120 }); cap('(how Hungarians call a cat)', Y1 + 120, inK(u, 0.05), { size: 56, rot: -0.02 }); cap('ears up ▲▲', Y2, inK(u, 0.4)); break;
    case 'meow2': cap('MEOW.', Y1, inK(u, 0.05), { size: 170, col: CATC.nose, rot: 0.04 }); break;
    case 'end':
      cap('Hi, C! 🐱', Y1, inK(u, 0.05), { size: 150, col: CATC.eye });
      cap('Cat mode.', Y2 - 70, inK(u, 0.9), { size: 104 });
      cap('Now purring.', Y2 + 60, inK(u, 1.3), { size: 104, col: CATC.nose });
      break;
    case 'loop': cap('POV: your desk cube…', Y1, ease(u, 0.0, 0.2), { size: 84, rot: 0 }); break;
  }
}
// villanás és rázkódás után: fehér villanás a „pop” pillanatokra
function post(t, s) { if (s.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${0.85 * s.flash})`; ctx.fillRect(0, 0, W, H); } }
