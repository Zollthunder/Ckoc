// ================================================================ „RETRÓ MAGYAR TÉVÉREKLÁM” – három korszak egy kockában (1978 · 1993 · 2004)
// (a fenti rész a fő videó jelenetéből jön: a kocka modellje, anyagai, fényei és az arc rajzolása)
// Minden saját: a stílus idézi a korszakot (szupergrafika és filmszemcse, „házi” videótechnika, korai digitális fény),
// de nem utánoz létező reklámot, márkát, szlogent vagy figurát.
const CUTS = TL.cuts.map((c, i) => ({ ...c, end: (TL.cuts[i + 1] || { t: TL.duration }).t }));
const cutAt = t => CUTS.find(c => t >= c.t && t < c.end) || CUTS[CUTS.length - 1];
const VT = Object.fromEntries(TL.voices.map(v => [v.id, v.t]));
const outBounce = x => { const n = 7.5625, d = 2.75; if (x < 1 / d) return n * x * x; if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75; if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375; return n * (x -= 2.625 / d) * x + 0.984375; };
const TAU = Math.PI * 2;
const popScale = (u, a, len = 0.2) => { const k = clamp((u - a) / len); return k <= 0 ? 0 : k < 1 ? Math.sin(k * Math.PI / 2) + 0.3 * Math.sin(k * Math.PI) : 1; };
const hash = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const F70 = '"Bauhaus 93", "Bookman Old Style", Georgia, serif';
const F70B = '"Bookman Old Style", Georgia, serif';
const F93 = '"Showcard Gothic", "Arial Black", Impact, sans-serif';
const F04 = 'Tahoma, Verdana, "Segoe UI", sans-serif';
const ERA_OF = c => c.era || 0;
const L43 = (W - H * 4 / 3) / 2;              // a 4:3-as kép bal széle (1978 és 1993 „régi tévé” képaránya)
// stop-motion („bábfilm”) 1978-ban: az animáció 12 kép/s-mal lép
const eraQ = t => (ERA_OF(cutAt(t)) === 1978 ? Math.floor(t * 12) / 12 : t);

// ---------------------------------------------------------------- háttér (a 3D jelenet mögött)
const bgCanvas = document.createElement('canvas'); bgCanvas.width = 1280; bgCanvas.height = 720;
const bgCtx = bgCanvas.getContext('2d');
const bgTex = new THREE.CanvasTexture(bgCanvas); bgTex.colorSpace = THREE.SRGBColorSpace;
scene.background = bgTex; scene.fog = null; desk.visible = false;
function daisy(g, x, y, r, rot, petal, mid) {
  g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = petal;
  for (let i = 0; i < 8; i++) { g.save(); g.rotate(i * TAU / 8); g.beginPath(); g.ellipse(0, -r * 0.62, r * 0.26, r * 0.45, 0, 0, TAU); g.fill(); g.restore(); }
  g.fillStyle = mid; g.beginPath(); g.arc(0, 0, r * 0.32, 0, TAU); g.fill(); g.restore();
}
function drawBg(b, t) {
  const g = bgCtx, w = 1280, h = 720;
  g.fillStyle = b.c1 || '#000'; g.fillRect(0, 0, w, h);
  if (b.type === 'seventies') {                       // 70-es „szupergrafika”: vastag, lekerekített színcsíkok + virágok
    const cols = b.cols || ['#c8501e', '#e07b22', '#efb43a', '#7a4a24'];
    const cx = w * (b.cx ?? 0.08), cy = h * (b.cy ?? 1.05);
    for (let i = 9; i >= 0; i--) { g.fillStyle = cols[i % cols.length]; g.beginPath(); g.arc(cx, cy, 160 + i * 95, 0, TAU); g.fill(); }
    g.fillStyle = b.c1; g.beginPath(); g.arc(cx, cy, 140, 0, TAU); g.fill();
    for (let i = 0; i < (b.daisies ?? 7); i++) daisy(g, w * (0.55 + 0.42 * hash(i)), h * (0.1 + 0.8 * hash(i + 3)), 40 + 30 * hash(i + 5), t * (hash(i + 7) - 0.5) * 1.2, i % 2 ? '#fff6e0' : '#f6d27a', '#c8501e');
  } else if (b.type === 'card70') {                   // 70-es tablókép: sima színes alap, dupla keret
    g.strokeStyle = b.c2; g.lineWidth = 16; g.strokeRect(150 + 0, 40, w - 300, h - 80); g.lineWidth = 5; g.strokeRect(178, 68, w - 356, h - 136);
  } else if (b.type === 'chroma') {                   // 90-es „házi stúdió”: kék színátmenet, sakktábla-padló, csillogás
    const sk = g.createLinearGradient(0, 0, 0, h); sk.addColorStop(0, b.c1); sk.addColorStop(0.6, b.c2); g.fillStyle = sk; g.fillRect(0, 0, w, h);
    const hz = h * 0.62; g.save(); g.beginPath(); g.rect(0, hz, w, h - hz); g.clip();
    const off = (t * 1.2) % 2;
    for (let r = 0; r < 18; r++) {
      const z0 = (r + off) / 18, z1 = (r + 1 + off) / 18, y0 = hz + (h - hz) * z0 * z0, y1 = hz + (h - hz) * z1 * z1;
      for (let c = -16; c < 16; c++) {
        if ((c + r) % 2) continue;
        const sx = q => w / 2 + c * (q * 160 + 8), sx1 = q => w / 2 + (c + 1) * (q * 160 + 8);
        g.fillStyle = b.c3 || '#ff3fb4'; g.beginPath(); g.moveTo(sx(z0), y0); g.lineTo(sx1(z0), y0); g.lineTo(sx1(z1), y1); g.lineTo(sx(z1), y1); g.closePath(); g.fill();
      }
    }
    g.restore();
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 24; i++) { const tw = Math.max(0, Math.sin(t * 5 + i * 1.3)); const x = w * hash(i + 20), y = h * 0.55 * hash(i + 21), r = 2 + 9 * tw; g.globalAlpha = tw; g.beginPath(); g.moveTo(x, y - r * 2); g.lineTo(x + r * 0.4, y); g.lineTo(x, y + r * 2); g.lineTo(x - r * 0.4, y); g.closePath(); g.fill(); g.beginPath(); g.moveTo(x - r * 2, y); g.lineTo(x, y + r * 0.4); g.lineTo(x + r * 2, y); g.lineTo(x, y - r * 0.4); g.closePath(); g.fill(); }
    g.globalAlpha = 1;
  } else if (b.type === 'aqua') {                     // 2004: fényes, „üveges” fehér-kék, úszó ívek („swoosh”)
    const rg = g.createRadialGradient(w * 0.5, h * 0.35, 40, w * 0.5, h * 0.4, 900); rg.addColorStop(0, '#ffffff'); rg.addColorStop(0.5, b.c2 || '#bfe4ff'); rg.addColorStop(1, b.c3 || '#2f7fd8'); g.fillStyle = rg; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 4; k++) {
      const ph = t * (0.5 + k * 0.15) + k * 1.7, col = ['rgba(255,140,0,0.55)', 'rgba(0,120,255,0.45)', 'rgba(255,255,255,0.7)', 'rgba(120,200,255,0.5)'][k];
      g.strokeStyle = col; g.lineWidth = 26 - k * 5; g.lineCap = 'round'; g.beginPath();
      for (let x = -50; x <= w + 50; x += 20) g.lineTo(x, h * (0.72 + 0.06 * k) + Math.sin(x / 260 + ph) * 60 - x * 0.12);
      g.stroke();
    }
    const fl = g.createLinearGradient(0, h * 0.8, 0, h); fl.addColorStop(0, 'rgba(255,255,255,0)'); fl.addColorStop(1, 'rgba(255,255,255,0.5)'); g.fillStyle = fl; g.fillRect(0, h * 0.8, w, h * 0.2);
  } else if (b.type === 'static') {
    const id = g.createImageData(320, 180), d = id.data; let sd = Math.floor(t * 30) * 7919 + 1;
    for (let i = 0; i < d.length; i += 4) { sd = (sd * 16807) % 2147483647; const v = sd % 256; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
    const tc = document.createElement('canvas'); tc.width = 320; tc.height = 180; tc.getContext('2d').putImageData(id, 0, 0);
    g.imageSmoothingEnabled = false; g.drawImage(tc, 0, 0, w, h); g.imageSmoothingEnabled = true;
  }
  bgTex.needsUpdate = true;
}

// ---------------------------------------------------------------- idő -> állapot
function stateAt(t) {
  const c = cutAt(t), u = t - c.t, era = ERA_OF(c);
  const s = {
    cam: orbit(0, 20, 5.5, V3(0, 4, 0)), root: V3(0, 4, 0), rot: new THREE.Euler(0, 0, 0),
    cColor: () => C(0xffd9a8).multiplyScalar(1.15), ringColor: () => C(0xffd9a8), glowColor: C(0xffd9a8), glowI: 0.2,
    face: { mode: 'face', t, smile: 1, blink: 0 }, corner: C(0xff8020), patch: 0, led: 0, btn: 0, finger: null, ripple: null, fade: 1,
    inside: false, explode: 0, bg: { type: 'static' }, shake: 0, cut: c, u, era, hidden: false,
  };
  const bl = (t * 0.45) % 1; s.face.blink = bl > 0.95 ? Math.sin((bl - 0.95) / 0.05 * Math.PI) : 0;
  const punch = (a, k = 0.12) => 1 - k * Math.exp(-Math.max(0, u - a) * 9) * (u >= a ? 1 : 0);
  const warm = () => C(0xffb35a).multiplyScalar(1.2);
  switch (c.id) {
    case 'snow': s.hidden = true; s.glowI = 0; s.bg = { type: 'static' }; break;
    // ----- 1978
    case 'e1_title': {
      const k = clamp(u / 1.2);
      s.root = V3(lerp(-16, 6.6, ease(u, 0, 1.2)), 4 + Math.abs(Math.sin(k * Math.PI * 3)) * 2 * (1 - k), 0);   // „besétál” ugrálva
      s.rot = new THREE.Euler(0, 0.35, Math.sin(u * 9) * 0.12 * (1 - k));
      s.cam = orbit(0.1, 36, 6, V3(0, 4.4, 0)); s.cam.fov = 30;
      s.bg = { type: 'seventies', c1: '#f1e3c4', cx: 0.06, cy: 1.08 };
      s.cColor = warm; s.ringColor = warm; s.face.sparkle = true; s.face.mouth = u > 1.2 ? 'grin' : 'smile';
      break;
    }
    case 'e1_rhyme': {
      const hop = Math.abs(Math.sin(u * Math.PI * 2));                       // ütemre szökken
      s.root = V3(0, 4 + hop * 1.4, 0); s.rot = new THREE.Euler(0, Math.sin(u * Math.PI) * 0.35, Math.sin(u * Math.PI * 2) * 0.08);
      s.cam = orbit(-0.15, 33, 5.6, V3(0, 4.4, 0)); s.cam.fov = 30;
      s.bg = { type: 'seventies', c1: '#efe0bd', cols: ['#2f6f5e', '#e2a33b', '#c8501e', '#6b3d22'], cx: 0.95, cy: -0.1, daisies: 6 };
      s.cColor = warm; s.ringColor = warm; s.face.mouth = 'grin'; s.face.sparkle = true; s.face.eyeScale = 1.1;
      break;
    }
    case 'e1_card': {
      s.root = V3(-8.2, 3.6, 0); s.rot = new THREE.Euler(0, 0.55, 0);
      s.cam = orbit(0, 38, 5, V3(0, 4.4, 0)); s.cam.fov = 30;
      s.bg = { type: 'card70', c1: '#d9572a', c2: '#f6e7c8' };
      s.cColor = warm; s.ringColor = warm;
      s.face.wink = u > 0.9 ? Math.sin(clamp((u - 0.9) / 0.4) * Math.PI) : 0;
      break;
    }
    // ----- 1993
    case 'e2_alert': {
      const k = clamp(u / 0.5);
      s.rot = new THREE.Euler(0, (1 - k) * 8 + Math.sin(u * 3) * 0.2, 0);    // „digitális” pörgés-beúszás
      s.cam = orbit(0.2, lerp(40, 22, ease(u, 0, 0.5)), 6, V3(0, 4.3, 0));
      s.bg = { type: 'chroma', c1: '#000a6e', c2: '#1d7cff', c3: '#ff3fb4' };
      s.cColor = () => C(0x40c8ff).multiplyScalar(1.4); s.ringColor = () => C(0xff3fb4);
      s.face.eyeScale = 1.3; s.face.mouth = 'o';
      if (u > 0.9) { s.face.mouth = 'grin'; s.face.sparkle = true; }
      break;
    }
    case 'e2_feat': {
      const drop = VT.H05 - c.t + 2.0;                 // „…és ha leejti”
      s.cam = orbit(0.35 - u * 0.05, 24, 6, V3(0, 4.3, 0)); s.cam.fov = 32 * punch(0, 0.1);
      s.bg = { type: 'chroma', c1: '#2a006e', c2: '#9b2cff', c3: '#ffe400' };
      s.cColor = () => hsl(t * 0.8, 1, 0.55); s.ringColor = () => hsl(t * 0.8 + 0.5, 1, 0.55); s.glowI = 1;
      if (u < 1.1) { s.face.mouth = 'talk'; s.face.talk = 0.4 + 0.6 * Math.abs(Math.sin(t * 15)); }
      if (u > drop) {
        const d = u - drop, k = clamp(d / 0.45);
        s.root = d < 0.45 ? V3(0, 4 + 9 * (1 - k * k), 0) : V3(0, 4 + Math.abs(Math.sin((d - 0.45) * 10)) * 1.2 * Math.exp(-(d - 0.45) * 4), 0);
        s.rot = new THREE.Euler(d < 0.45 ? k * 3 : 0, d < 0.45 ? k * 2 : 0, 0);
        s.face = d < 0.45 ? { mode: 'face', t, mouth: 'o', eyeScale: 1.3 } : { mode: 'face', t, mouth: 'grin', sparkle: true, eyeScale: 1.15 };
        s.shake = d > 0.45 && d < 0.8 ? 1 - (d - 0.45) / 0.35 : 0;
        if (d < 0.1) s.root = V3(0, 13, 0);
      }
      break;
    }
    case 'e2_order': {
      s.root = V3(4.2, 4, 0); s.rot = new THREE.Euler(0, -0.5 + Math.sin(u * 2) * 0.15, 0);
      s.cam = orbit(0, 25, 5.5, V3(0, 4.3, 0));
      s.bg = { type: 'chroma', c1: '#00346e', c2: '#00b0d8', c3: '#ffffff' };
      s.face = { mode: 'text', t, text: '☎', size: 210, color: '#ffe400' };
      s.cColor = () => C(0xffe400).multiplyScalar(1.3); s.ringColor = () => C(0xffe400);
      break;
    }
    // ----- 2004
    case 'e3_sale': {
      const gift = VT.H08 - c.t;
      if (u < gift) { s.cam = orbit(0.4 - u * 0.1, 22 * punch(0, 0.08), 6, V3(0, 4.3, 0)); s.rot = new THREE.Euler(0, -0.35 + Math.sin(u * 1.5) * 0.25, 0); }
      else { s.cam = shot(V3(-5.5, 14.5, 10.5), V3(-1.8, 7.6, 1.6), 30); s.cam.fov = 30 * punch(gift, 0.12); }
      s.bg = { type: 'aqua', c2: '#bfe4ff', c3: '#2f7fd8' };
      s.cColor = () => C(0x3aa0ff).multiplyScalar(1.4); s.ringColor = () => C(0xff9a1f).multiplyScalar(1.2); s.glowI = 0.8;
      s.face.sparkle = true; s.face.mouth = 'grin';
      break;
    }
    case 'e3_last': {
      s.cam = orbit(-0.3 + u * 0.15, 27 * punch(0, 0.12), 5.4, V3(0, 3.8, 0));
      s.rot = new THREE.Euler(0, Math.sin(u * 2) * 0.2, 0);
      s.bg = { type: 'aqua', c2: '#ffe0b8', c3: '#e8641a' };
      s.cColor = () => C(0xff9a1f).multiplyScalar(1.4); s.ringColor = () => C(0x3aa0ff); s.glowI = 0.8;
      s.face.eyeScale = 1.2; s.face.mouth = 'grin'; s.face.sparkle = true;
      break;
    }
    // ----- zárókép
    case 'end': {
      s.cam = orbit(0.42 - u * 0.02, 24, 5.6, V3(-4.6, 4.3, 0));
      s.bg = { type: 'aqua', c2: '#cfe4f8', c3: '#4f86c6' };
      s.cColor = () => C(0xffb878).multiplyScalar(1.3); s.ringColor = () => C(0xffb878);
      s.face.sparkle = true;
      const wk = VT.H11 - c.t + 1.4; s.face.wink = u > wk ? Math.sin(clamp((u - wk) / 0.45) * Math.PI) : 0;
      s.fade = 1 - ease(t, TL.duration - 0.5, TL.duration);
      break;
    }
  }
  return s;
}

// ---------------------------------------------------------------- 2D feliratok korszakonként
function txt(text, x, y, size, k, o = {}) {
  if (k <= 0.01) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.scale(k, k);
  ctx.font = `${o.weight || 400} ${size}px ${o.font || F70}`; ctx.textAlign = o.align || 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  if (o.shadow) { ctx.fillStyle = o.shadow; ctx.fillText(text, o.sd ?? size * 0.06, o.sd ?? size * 0.06); if (o.stroke) { ctx.lineWidth = o.lw ?? size * 0.12; ctx.strokeStyle = o.shadow; ctx.strokeText(text, o.sd ?? size * 0.06, o.sd ?? size * 0.06); } }
  if (o.stroke) { ctx.lineWidth = o.lw ?? size * 0.12; ctx.strokeStyle = o.stroke; ctx.strokeText(text, 0, 0); }
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.gb || 24; }
  const f = o.fill || '#fff';
  if (Array.isArray(f)) { const gr = ctx.createLinearGradient(0, -size / 2, 0, size / 2); f.forEach((c, i) => gr.addColorStop(i / (f.length - 1), c)); ctx.fillStyle = gr; } else ctx.fillStyle = f;
  ctx.fillText(text, 0, 0);
  if (o.gloss) { ctx.save(); ctx.shadowBlur = 0; ctx.beginPath(); ctx.rect(-W, -size, W * 2, size * 0.92); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillText(text, 0, 0); ctx.restore(); }
  ctx.restore();
}
// 1993: „WordArt”-szerű szivárványbetű, vastag sötétkék kontúrral és kemény árnyékkal
const WA = (text, x, y, size, k, rot = -0.06, fill = ['#fff35c', '#ffb000', '#ff3b1f']) => txt(text, x, y, size, k, { font: F93, fill, stroke: '#0a0a5a', shadow: '#000033', sd: size * 0.08, rot, lw: size * 0.14 });
// 2004: fényes kék dőlt betű
const AQ = (text, x, y, size, k, o = {}) => txt(text, x, y, size, k, { font: F04, weight: 700, fill: o.fill || ['#5fc3ff', '#0b5fd6', '#073a8e'], stroke: '#ffffff', lw: size * 0.1, glow: 'rgba(0,60,160,0.45)', gb: 18, gloss: true, rot: o.rot || 0, ...o });
function starburst(x, y, r, k, t, l1, l2, col = '#e3001b', tcol = '#ffffff', spikes = 18) {
  if (k <= 0.01) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.rotate(Math.sin(t * 3) * 0.06);
  ctx.beginPath(); for (let j = 0; j < spikes * 2; j++) { const rr2 = j % 2 ? r * 0.8 : r, aa = j * Math.PI / spikes; ctx.lineTo(Math.cos(aa) * rr2, Math.sin(aa) * rr2); } ctx.closePath();
  ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6; ctx.fillStyle = col; ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.lineWidth = 6; ctx.strokeStyle = '#ffffff'; ctx.stroke();
  ctx.fillStyle = tcol; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `700 ${r * 0.42}px ${F04}`; ctx.fillText(l1, 0, l2 ? -r * 0.18 : 4);
  if (l2) { ctx.font = `700 ${r * 0.3}px ${F04}`; ctx.fillText(l2, 0, r * 0.26); }
  ctx.restore();
}
function lensFlare(x, y, k) {
  if (k <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = k;
  const g = ctx.createRadialGradient(x, y, 0, x, y, 260); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.2, 'rgba(255,220,160,0.35)'); g.addColorStop(1, 'rgba(255,200,120,0)');
  ctx.fillStyle = g; ctx.fillRect(x - 260, y - 260, 520, 520);
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(x - 500, y - 2, 1000, 4);
  const dx = W / 2 - x, dy = H / 2 - y;
  [[0.5, 40, 'rgba(120,200,255,0.25)'], [0.8, 22, 'rgba(255,160,60,0.3)'], [1.3, 70, 'rgba(160,255,200,0.15)'], [1.7, 30, 'rgba(255,255,255,0.2)']].forEach(([m, r, c]) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + dx * m, y + dy * m, r, 0, TAU); ctx.fill(); });
  ctx.restore();
}
// 1978: rajzolt, papírkivágás-szerű napocska arccal
function cutoutSun(x, y, r, t) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 2) * 0.15);
  ctx.fillStyle = '#efb43a'; for (let i = 0; i < 12; i++) { ctx.save(); ctx.rotate(i * TAU / 12); ctx.beginPath(); ctx.moveTo(-r * 0.18, -r * 0.95); ctx.lineTo(0, -r * 1.45); ctx.lineTo(r * 0.18, -r * 0.95); ctx.fill(); ctx.restore(); }
  ctx.fillStyle = '#f6c84a'; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = '#7a4a24'; ctx.stroke();
  ctx.fillStyle = '#7a4a24'; ctx.beginPath(); ctx.arc(-r * 0.35, -r * 0.15, r * 0.1, 0, TAU); ctx.arc(r * 0.35, -r * 0.15, r * 0.1, 0, TAU); ctx.fill();
  ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, r * 0.1, r * 0.45, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  ctx.fillStyle = 'rgba(232,96,60,0.5)'; ctx.beginPath(); ctx.arc(-r * 0.6, r * 0.2, r * 0.14, 0, TAU); ctx.arc(r * 0.6, r * 0.2, r * 0.14, 0, TAU); ctx.fill();
  ctx.restore();
}
// csillag alakú „áttűnés” (1993-as videókeverő-effekt): a színes lap közepén egyre nagyobb csillag-lyuk
function starWipe(u, col = '#ffe400') {
  const k = clamp(u / 0.4); if (k >= 1) return;
  const r = k * k * 1500;
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H);
  for (let j = 0; j <= 10; j++) { const rr2 = j % 2 ? r * 0.45 : r, aa = j * Math.PI / 5 - Math.PI / 2 + k; (j ? ctx.lineTo : ctx.moveTo).call(ctx, W / 2 + Math.cos(aa) * rr2, H / 2 + Math.sin(aa) * rr2); }
  ctx.closePath(); ctx.fillStyle = col; ctx.fill('evenodd'); ctx.restore();
}
function flash(t, a, len = 0.1, col = '255,255,255') { const k = 1 - clamp((t - a) / len); if (t >= a && k > 0) { ctx.fillStyle = `rgba(${col},${0.8 * k})`; ctx.fillRect(0, 0, W, H); } }

function overlays(t, s) {
  const c = s.cut, u = s.u, v = voiceAt(t);
  const X0 = L43, X1 = W - L43, CX = W / 2;          // a 4:3-as „biztonsági” terület
  switch (c.id) {
    case 'e1_title': {
      txt('Bemutatjuk:', X0 + 290, H * 0.24, 64, clamp((u - 0.2) / 0.4), { font: F70B, weight: 400, fill: '#7a4a24', rot: -0.04 });
      txt('az új', X0 + 330, H * 0.37, 92, clamp((u - 0.5) / 0.3), { font: F70, fill: '#c8501e', shadow: '#7a4a24', sd: 5 });
      txt('C-KOCKA', X0 + 420, H * 0.55, 170, clamp((u - 0.9) / 0.3), { font: F70, fill: '#c8501e', stroke: '#fff6e0', lw: 16, shadow: '#7a4a24', sd: 9 });
      cutoutSun(X1 - 130, 150, 70, t);
      break;
    }
    case 'e1_rhyme': {
      const L = ['Kicsi kocka,', 'nagy barát:', 'mesél, nevet', 'egész nap át!'];
      const d = DUR.H02 || 3, step = d / 4;
      L.forEach((ln, i) => {
        const a = VT.H02 - c.t + i * step * 0.95;
        const left = i % 2 === 0, x = left ? X0 + 290 : X1 - 290, y = H * (i < 2 ? 0.13 : 0.87);
        const k = clamp((u - a) / 0.25);
        if (k > 0) { ctx.save(); ctx.globalAlpha = k; ctx.translate(x, y); ctx.rotate(left ? -0.05 : 0.05); ctx.fillStyle = '#7a4a24'; rr(ctx, -250 + 6, -58 + 6, 500, 116, 18); ctx.fill(); ctx.fillStyle = '#fff6e0'; rr(ctx, -250, -58, 500, 116, 18); ctx.fill(); ctx.restore(); }
        txt(ln, x, y, 76, k, { font: F70B, weight: 700, fill: i < 2 ? '#2f6f5e' : '#c8501e', rot: left ? -0.05 : 0.05 });
      });
      break;
    }
    case 'e1_card': {
      txt('Kérje a', CX + 310, H * 0.36, 90, clamp((u - 0.1) / 0.3), { font: F70B, weight: 700, fill: '#f6e7c8', shadow: '#7a2a10', sd: 5 });
      txt('szaküzletekben!', CX + 310, H * 0.53, 88, clamp((u - 0.35) / 0.3), { font: F70B, weight: 700, fill: '#ffe08a', shadow: '#7a2a10', sd: 5 });
      txt('Kapható a kockaosztályon is.', CX + 310, H * 0.72, 34, clamp((u - 0.8) / 0.3) * 0.9, { font: F70B, fill: '#f6e7c8' });
      break;
    }
    case 'e2_alert': {
      starWipe(u, '#ffe400');
      const blink = Math.floor(t * 4) % 2 ? 1 : 0.85;
      WA('FIGYELEM!', CX, H * 0.18, 150, popScale(u, 0.15) * blink, -0.05);
      WA('ÚJ!', X0 + 170, H * 0.62, 150, popScale(u, VT.H04 - c.t + 1.1), 0.2, ['#ffffff', '#7fffd4', '#00b0ff']);
      if (u > VT.H04 - c.t + 1.1) WA('C-KOCKA', CX, H * 0.86, 140, popScale(u, VT.H04 - c.t + 1.2), 0.03);
      break;
    }
    case 'e2_feat': {
      starWipe(u, '#ff3fb4');
      const a = VT.H05 - c.t, drop = a + 2.0;
      WA('BESZÉL!', X0 + 230, H * 0.2, 110, popScale(u, a + 0.05), -0.12);
      WA('VILÁGÍT!', X1 - 230, H * 0.2, 110, popScale(u, a + 1.0), 0.1, ['#ffffff', '#ffe400', '#ff9a00']);
      if (u > drop + 0.45) WA('TÖRHETETLEN!', CX, H * 0.86, 120, popScale(u, drop + 0.45), -0.03, ['#c6ff00', '#36d000', '#007a2a']);
      break;
    }
    case 'e2_order': {
      starWipe(u, '#00e0ff');
      WA('RENDELJE MEG', X0 + 360, H * 0.2, 96, popScale(u, 0.1), -0.04);
      WA('MOST!', X0 + 360, H * 0.36, 130, popScale(u, 0.35) * (Math.floor(t * 4) % 2 ? 1 : 0.9), -0.04, ['#ffffff', '#ff8ad8', '#ff0080']);
      // kitalált „telefonszám” – betűkkel, hogy biztosan ne legyen valódi
      const k = popScale(u, 0.8);
      if (k > 0) { ctx.save(); ctx.translate(X0 + 360, H * 0.56); ctx.scale(k, k); ctx.fillStyle = '#0a0a5a'; rr(ctx, -300, -62, 600, 124, 14); ctx.fill(); ctx.fillStyle = '#ffe400'; ctx.font = `400 70px ${F93}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('☎ 06-KOCKA', 0, 4); ctx.restore(); }
      WA('HÁZHOZ SZÁLLÍTJUK!', X0 + 360, H * 0.74, 64, popScale(u, VT.H06 - c.t + 1.3), -0.02, ['#ffffff', '#c8f4ff', '#7fd0ff']);
      // futó szöveg alul
      ctx.save(); ctx.fillStyle = '#0a0a5a'; ctx.fillRect(X0, H - 92, X1 - X0, 64); ctx.beginPath(); ctx.rect(X0, H - 92, X1 - X0, 64); ctx.clip();
      ctx.font = `400 40px ${F93}`; ctx.fillStyle = '#ffe400'; ctx.textBaseline = 'middle';
      const msg = '★ RENDELJE MEG MOST ★ UTÁNVÉTTEL IS ★ AZ ÁRAK AZ ÁFÁT TARTALMAZZÁK ★ AMÍG A KÉSZLET TART ★ ';
      const mw = ctx.measureText(msg).width, xs = X1 - ((u * 300) % mw);
      ctx.fillText(msg, xs, H - 58); ctx.fillText(msg, xs - mw, H - 58); ctx.fillText(msg, xs + mw, H - 58); ctx.restore();
      break;
    }
    case 'e3_sale': {
      const gift = VT.H08 - c.t;
      AQ('Az új C-kocka', W * 0.3, H * 0.17, 96, popScale(u, 0.1, 0.35), { rot: -0.03 });
      starburst(W * 0.78, H * 0.3, 170, popScale(u, VT.H07 - c.t + 1.0), t, 'AKCIÓ!', '−30%');
      if (u > gift) {
        AQ('+ AJÁNDÉK FAGOMB!', W * 0.5, H * 0.86, 92, popScale(u, gift + 0.05, 0.3), { fill: ['#ffd9a0', '#c27a2c', '#7a4a1a'] });
        starburst(W * 0.2, H * 0.55, 110, popScale(u, gift + 0.3), t, 'INGYEN!', null, '#ff8a00');
      }
      lensFlare(W * (0.15 + 0.5 * clamp(u / 2.5)), H * 0.12, 0.9);
      break;
    }
    case 'e3_last': {
      AQ('NE MARADJON LE!', W * 0.5, H * 0.17, 120, popScale(u, 0.05, 0.3), { fill: ['#ffd27a', '#ff7a00', '#c43a00'] });
      AQ('Csak a készlet erejéig!*', W * 0.5, H * 0.86, 56, popScale(u, 0.5, 0.3), { weight: 400, lw: 6 });
      lensFlare(W * 0.82, H * 0.2, 0.7 + 0.2 * Math.sin(t * 6));
      break;
    }
    case 'end': {
      const k = ease(u, 0.05, 0.4);
      AQ('C-kocka', W * 0.3, H * 0.3, 170, popScale(u, 0.05, 0.35), { fill: ['#ffc58a', '#ff7a1f', '#b8420a'] });
      txt('Egy kis barát az asztalára.', W * 0.3, H * 0.46, 54, k * clamp((u - 0.5) / 0.4), { font: F04, weight: 400, fill: '#20406e' });
      // apróbetű – a magyar tévéreklámok kötelező figyelmeztetésének kacsintó paródiája
      const fp = ease(t, VT.H11 - 0.2, VT.H11 + 0.1);
      if (fp > 0) {
        ctx.save(); ctx.globalAlpha = fp; ctx.fillStyle = 'rgba(255,255,255,0.88)'; ctx.fillRect(0, H - 168, W, 168);
        ctx.fillStyle = '#20406e'; ctx.textAlign = 'left'; ctx.font = `700 36px ${F04}`;
        ctx.fillText('A kockázatokról és mellékhatásokról kérdezze a kockát!', 70, H - 108);
        ctx.font = `400 30px ${F04}`; ctx.fillStyle = '#4a5a74';
        ctx.fillText('*Koncepciótermék, nem kerül forgalomba. Szaküzletben se kérje. ;)', 70, H - 52);
        ctx.restore();
      }
      lensFlare(W * 0.62, H * 0.16, 0.5);
      break;
    }
  }
  // korszak-felirat a sarokban (az új korszak első másfél másodpercében)
  if (s.era && s.era !== 0) {
    const first = CUTS.find(cc => cc.era === s.era), a = t - first.t;
    if (a < 1.8) { ctx.save(); ctx.globalAlpha = Math.min(1, a / 0.15, (1.8 - a) / 0.3); ctx.font = `700 46px ${VCR}`; ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#000'; ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 3; ctx.textAlign = 'right'; ctx.fillText(String(s.era), (s.era === 2004 ? W : X1) - 50, 80); ctx.restore(); }
  }
}
const VCR = '"Consolas", "Lucida Console", "Courier New", monospace';

// ---------------------------------------------------------------- korszakonkénti utómunka
const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H; const tctx = tmp.getContext('2d');
const grains = [0, 1, 2, 3].map(k => {
  const c = document.createElement('canvas'); c.width = 640; c.height = 360; const g = c.getContext('2d'), id = g.createImageData(640, 360);
  let sd = 991 + k * 7777; for (let i = 0; i < id.data.length; i += 4) { sd = (sd * 16807) % 2147483647; const v = 128 + ((sd % 256) - 128) * 0.9; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
  g.putImageData(id, 0, 0); return c;
});
const small = document.createElement('canvas'); small.width = 768; small.height = 432; const sctx = small.getContext('2d');
const scan = (() => { const c = document.createElement('canvas'); c.width = 4; c.height = 4; const g = c.getContext('2d'); g.fillStyle = 'rgba(0,0,0,0.16)'; g.fillRect(0, 0, 4, 2); return ctx.createPattern(c, 'repeat'); })();
function pillarbox() { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, L43, H); ctx.fillRect(W - L43, 0, L43, H); }
function filmLook(t) {                                  // 1978: filmszemcse, karcok, por, villódzás, képremegés, fakult meleg színek
  const f = Math.floor(t * 24);
  tctx.drawImage(out, 0, 0);
  ctx.save(); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.drawImage(tmp, Math.sin(f * 1.7) * 3, Math.sin(f * 2.3) * 4 + (hash(f) > 0.97 ? 10 : 0));       // képremegés
  ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = 'rgba(128,128,128,0.35)'; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(255,226,180,0.55)'; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'lighten'; ctx.fillStyle = 'rgb(46,30,22)'; ctx.fillRect(0, 0, W, H);           // „felemelt” feketék
  ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.45; ctx.drawImage(grains[f % 4], (f * 37) % 40 - 40, (f * 53) % 40 - 40, W + 80, H + 80);
  ctx.restore();
  ctx.save();
  for (let i = 0; i < 2; i++) if (hash(f * 3 + i) > 0.4) { const x = L43 + hash(f * 5 + i) * (W - 2 * L43); ctx.fillStyle = `rgba(250,240,220,${0.15 + 0.25 * hash(f + i)})`; ctx.fillRect(x, 0, 1.5 + hash(f + 9) * 2, H); }
  for (let i = 0; i < 7; i++) { const x = L43 + hash(f * 7 + i) * (W - 2 * L43), y = hash(f * 11 + i) * H; ctx.fillStyle = hash(f + i * 3) > 0.5 ? 'rgba(20,12,8,0.6)' : 'rgba(255,250,235,0.5)'; ctx.beginPath(); ctx.arc(x, y, 1 + hash(f * 13 + i) * 3.5, 0, TAU); ctx.fill(); }
  if (hash(f * 17) > 0.8) { ctx.strokeStyle = 'rgba(20,12,8,0.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); const x = L43 + hash(f * 19) * (W - 2 * L43), y = hash(f * 23) * H; ctx.moveTo(x, y); ctx.bezierCurveTo(x + 20, y + 10, x - 10, y + 30, x + 15, y + 45); ctx.stroke(); }
  ctx.fillStyle = `rgba(0,0,0,${0.04 + 0.06 * hash(f * 29)})`; ctx.fillRect(0, 0, W, H);                         // villódzás
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.9); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(30,15,5,0.65)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  ctx.restore();
  pillarbox();
}
function homeVideo(t) {                                 // 1993: „házi” videótechnika – lágyabb kép, színcsúszás, szkenvonalak
  sctx.drawImage(out, 0, 0, 768, 432);
  ctx.save(); ctx.drawImage(small, 0, 0, W, H);
  ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.35; ctx.drawImage(small, 6, 0, W, H);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.fillStyle = scan; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = 'rgba(255,0,0,0.12)'; ctx.fillRect(0, 0, W, H);     // „túltolt” színek
  ctx.restore();
  const by = ((t * 0.5) % 1.2) * H; ctx.drawImage(out, 0, by, W, 30, Math.sin(t * 77) * 8, by, W, 30);
  pillarbox();
}
function digital(t) {                                   // 2004: tiszta, kicsit „ragyogó” korai digitális kép
  sctx.drawImage(out, 0, 0, 768, 432);
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.22; ctx.filter = 'blur(10px)'; ctx.drawImage(small, 0, 0, W, H); ctx.restore();
}
function post(t, s) {
  const c = s.cut;
  if (c.id === 'snow') {                                // csatornaváltás: hangyás kép, fekete keret, „gombnyomás”-villanás
    ctx.fillStyle = scan; ctx.fillRect(0, 0, W, H);
    const nx = CUTS.find(cc => cc.t >= c.end - 0.001);
    if (nx && nx.era) { ctx.save(); ctx.font = `700 64px ${VCR}`; ctx.fillStyle = '#7dff7d'; ctx.shadowColor = '#000'; ctx.shadowBlur = 8; ctx.textAlign = 'center'; ctx.fillText('▶ ' + nx.era, W / 2, H / 2 + 20); ctx.restore(); }
    return;
  }
  if (s.era === 1978) filmLook(t); else if (s.era === 1993) homeVideo(t); else digital(t);
  for (const cc of CUTS) if (cc.era === 2004 || cc.id === 'end') flash(t, cc.t, 0.12);
}
