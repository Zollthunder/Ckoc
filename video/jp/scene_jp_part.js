// ================================================================ „JAPÁN REKLÁM” – forgatókönyv és képi elemek
// (a fenti rész a fő videó jelenetéből jön: a kocka modellje, anyagai, fényei és az arc rajzolása)
const JPF = '"Yu Gothic UI", "Yu Gothic", "Meiryo", "Segoe UI", sans-serif';
const CUTS = TL.cuts.map((c, i) => ({ ...c, end: (TL.cuts[i + 1] || { t: TL.duration }).t }));
const cutAt = t => CUTS.find(c => t >= c.t && t < c.end) || CUTS[CUTS.length - 1];
const JPL = Object.fromEntries(JP_LINES.map(l => [l.id, l]));
const outBounce = x => { const n = 7.5625, d = 2.75; if (x < 1 / d) return n * x * x; if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75; if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375; return n * (x -= 2.625 / d) * x + 0.984375; };
const TAU = Math.PI * 2;
// beugrás: 0 -> ~1,2 túllövés -> 1, folytonosan (a feliratok „pop”-ja)
const popScale = (u, a) => { const k = clamp((u - a) / 0.22); return k <= 0 ? 0 : k < 1 ? Math.sin(k * Math.PI / 2) + 0.3 * Math.sin(k * Math.PI) : 1; };

// ---------------------------------------------------------------- háttér (a 3D jelenet mögött): napsugár, csíkok, pöttyök
const bgCanvas = document.createElement('canvas'); bgCanvas.width = 1280; bgCanvas.height = 720;
const bgCtx = bgCanvas.getContext('2d');
const bgTex = new THREE.CanvasTexture(bgCanvas); bgTex.colorSpace = THREE.SRGBColorSpace;
scene.background = bgTex; scene.fog = null; desk.visible = false;
function drawBg(b, t) {
  const g = bgCtx, w = 1280, h = 720, cx = w * (b.cx ?? 0.5), cy = h * (b.cy ?? 0.5);
  g.fillStyle = b.c1; g.fillRect(0, 0, w, h);
  if (b.type === 'burst') {
    const n = b.n || 20, rot = (b.spin || 0.25) * t;
    g.fillStyle = b.c2;
    for (let i = 0; i < n; i++) { const a0 = rot + i * TAU / n, a1 = a0 + TAU / n / 2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a0) * 2000, cy + Math.sin(a0) * 2000); g.lineTo(cx + Math.cos(a1) * 2000, cy + Math.sin(a1) * 2000); g.closePath(); g.fill(); }
  } else if (b.type === 'speed') {
    g.strokeStyle = b.c2; g.lineCap = 'round';
    for (let i = 0; i < 70; i++) { const a = i * 2.39996 + Math.floor(t * 18) * 0.7, r0 = 180 + ((i * 97) % 160); g.lineWidth = 2 + (i % 4) * 2; g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * 1400, cy + Math.sin(a) * 1400); g.stroke(); }
  } else if (b.type === 'dots') {
    g.fillStyle = b.c2; const s = 36, off = (t * 40) % s;
    for (let y = -s; y < h + s; y += s) for (let x = -s; x < w + s; x += s) { const r = 7 + 5 * Math.sin((x + y) * 0.01 + t * 3); g.beginPath(); g.arc(x + off + ((y / s) % 2) * s / 2, y + off, Math.max(1, r), 0, TAU); g.fill(); }
  } else if (b.type === 'stripes') {
    g.fillStyle = b.c2; const s = 80, off = (t * 160) % (s * 2);
    g.save(); g.translate(w / 2, h / 2); g.rotate(-0.5); for (let x = -1600; x < 1600; x += s * 2) g.fillRect(x + off, -1200, s, 2400); g.restore();
  } else if (b.type === 'rainbow') {
    const n = 24, rot = t * 0.6;
    for (let i = 0; i < n; i++) { const a0 = rot + i * TAU / n, a1 = a0 + TAU / n; g.fillStyle = `hsl(${(i * 15 + t * 120) % 360} 90% ${i % 2 ? 55 : 35}%)`; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a0) * 2000, cy + Math.sin(a0) * 2000); g.lineTo(cx + Math.cos(a1) * 2000, cy + Math.sin(a1) * 2000); g.closePath(); g.fill(); }
  }
  // középen világos „reflektor”
  const rg = g.createRadialGradient(cx, cy, 0, cx, cy, 520); rg.addColorStop(0, b.glow || 'rgba(255,255,255,0.55)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = rg; g.fillRect(0, 0, w, h);
  bgTex.needsUpdate = true;
}

// ---------------------------------------------------------------- idő -> állapot
function stateAt(t) {
  const c = cutAt(t), u = t - c.t;
  const s = {
    cam: orbit(0, 19, 5.5, V3(0, 4, 0)), root: V3(0, 4, 0), rot: new THREE.Euler(0, 0, 0),
    cColor: () => C(0xffd9a8).multiplyScalar(1.15), ringColor: () => C(0xffd9a8), glowColor: C(0xffd9a8), glowI: 0.2,
    face: { mode: 'face', t, smile: 1, blink: 0 }, corner: C(0xff8020), patch: 0, led: 0, btn: 0, finger: null, ripple: null, fade: 1,
    inside: false, explode: 0, bg: { type: 'burst', c1: '#ff2d55', c2: '#ffd23f' }, shake: 0, cut: c, u,
  };
  const bl = (t * 0.5) % 1; s.face.blink = bl > 0.95 ? Math.sin((bl - 0.95) / 0.05 * Math.PI) : 0;
  const v = voiceAt(t);
  if (v && v.src === 'cube') { s.face.mouth = 'talk'; s.face.talk = 0.35 + 0.65 * Math.abs(Math.sin(t * 17) * Math.sin(t * 6.3 + 1)); }
  const punch = (a, k = 0.12) => 1 - k * Math.exp(-Math.max(0, u - a) * 9) * (u >= a ? 1 : 0);   // „zoom-ütés” a vágásoknál
  const rainbow = (p, tt) => hsl(p + tt * 0.9, 1, 0.55);
  switch (c.id) {
    case 'new': {
      const k = clamp(u / 0.55);
      s.root = V3(0, 4 + 13 * (1 - outBounce(k)), 0);
      s.cam = orbit(0.15, 23 * punch(0.55, 0.1), 5.2, V3(0, 4.0, 0));
      s.face.sparkle = true; s.face.eyeScale = 1.15; s.face.mouth = 'grin';
      s.bg = { type: 'burst', c1: '#ff1f4b', c2: '#ffd400', spin: 0.6 }; s.shake = u < 0.7 ? Math.exp(-(u - 0.55) * 12) * (u > 0.55) : 0;
      break;
    }
    case 'name': {
      s.cam = orbit(-0.25 + u * 0.15, lerp(21, 15, ease(u, 0, 0.3)), 5, V3(0, 4.1, 0));
      s.cam.fov = 30 * punch(0, 0.25);
      s.face.sparkle = true; s.face.eyeScale = 1.2; s.face.wink = u > 1.1 ? Math.sin(clamp((u - 1.1) / 0.35) * Math.PI) : 0;
      s.bg = { type: 'burst', c1: '#0a6cff', c2: '#38e1ff', spin: -0.5, n: 16 };
      s.cColor = () => C(0xffb050).multiplyScalar(1.6);
      break;
    }
    case 'talk': {
      s.cam = orbit(0.55, 22, 5.4, V3(-1.6, 4.2, 0)); s.cam.fov = 30 * punch(0, 0.12);
      s.rot = new THREE.Euler(0, Math.sin(u * 6) * 0.06, Math.sin(u * 8) * 0.03);
      s.bg = { type: 'dots', c1: '#ffcf1f', c2: '#ff5fa2', cx: 0.62 };
      if (!(v && v.src === 'cube')) { s.face.mouth = u < 1.2 ? 'talk' : 'grin'; s.face.talk = 0.5 + 0.5 * Math.abs(Math.sin(t * 15)); if (u >= 1.2) s.face.mouth = 'grin'; }
      break;
    }
    case 'glow': {
      s.cam = orbit(u * 0.5 - 0.3, 24, 6, V3(0, 4, 0)); s.cam.fov = 32 * punch(0, 0.15);
      s.cColor = rainbow; s.ringColor = rainbow; s.glowColor = hsl(t * 0.9, 1, 0.55); s.glowI = 1.2;
      s.face = { mode: 'eq', t, levels: Array.from({ length: 12 }, (_, i) => 0.3 + 0.7 * Math.abs(Math.sin(t * 9 + i * 1.7))) };
      s.bg = { type: 'rainbow', c1: '#111', glow: 'rgba(255,255,255,0.25)' };
      break;
    }
    case 'throw': {
      const k = clamp(u / 1.15);
      s.root = u < 1.15 ? V3(lerp(14, -0.5, k), 4 + 7 * Math.sin(k * Math.PI), 0) : V3(-0.5 * Math.exp(-(u - 1.15) * 6), 4 + Math.abs(Math.sin((u - 1.15) * 9)) * 1.6 * Math.exp(-(u - 1.15) * 3), 0);
      s.rot = new THREE.Euler(u < 1.15 ? k * 7 : 0, u < 1.15 ? k * 4 : 0, u < 1.15 ? -k * 9 : Math.sin((u - 1.15) * 14) * 0.2 * Math.exp(-(u - 1.15) * 2));
      s.cam = orbit(0, 27, 5.5, V3(0, 4.5, 0));
      s.face = u < 1.15 ? { mode: 'face', t, mouth: 'o', eyeScale: 1.3 } : { mode: 'dizzy', t };
      s.bg = { type: 'speed', c1: '#ffffff', c2: 'rgba(20,20,40,0.85)', glow: 'rgba(255,240,180,0.6)' };
      s.shake = u > 1.15 && u < 1.6 ? 1 - (u - 1.15) / 0.45 : 0;
      break;
    }
    case 'joke': {
      s.cam = u < 2.0 ? shot(V3(-6.5, 15.5, 12), V3(-1.6, 7.0, 1.6), 30) : orbit(-0.2, 21, 5.2, V3(0, 4.2, 0));
      if (u < 2.0) { const dn = ease(u, 1.5, 1.75) * (1 - ease(u, 1.85, 2.0)); s.btn = dn; s.finger = { pos: V3(-2.3, 8.2 + 1.9 + (1 - dn) * 2.5, 2.3), tilt: 0.25 }; }
      s.bg = { type: 'burst', c1: '#2e9e3a', c2: '#a8e05f', spin: 0.3 };
      if (u > 6.3) { s.face.mouth = 'grin'; s.face.eyeScale = 1.1; s.shake = Math.exp(-(u - 6.3) * 6) * 0.6; }
      break;
    }
    case 'peek': {
      s.cam = orbit(0, lerp(22, 13, ease(u, 0, 1.7)), 4.8, V3(0, 4.3, 0)); s.cam.fov = 30;
      s.bg = { type: 'stripes', c1: '#1b0b33', c2: '#2c1252', glow: 'rgba(160,90,255,0.35)' };
      s.cColor = () => C(0x8a5cff).multiplyScalar(0.9); s.ringColor = () => C(0x5b2bff);
      s.face.lidL = 0.45; s.face.lidR = 0.45; s.face.mouth = 'flat';
      if (u > 1.75) { s.face.lookX = 1; s.face.lookY = -0.6; s.face.lidL = 0; s.face.lidR = 0; s.face.mouth = 'o'; }
      s.led = u < 1.75 ? 1 : 0;
      break;
    }
    case 'flip': {
      const k = ease(u, 0.2, 0.75);
      s.rot = new THREE.Euler(0, 0, Math.PI * k); s.root = V3(0, 4 + Math.sin(k * Math.PI) * 2, 0);
      s.cam = orbit(0.3, 24, 6, V3(0, 4.5, 0));
      s.bg = { type: 'stripes', c1: '#00b4d8', c2: '#48e5c2' };
      s.face = k > 0.5 ? { mode: 'face', t, mouth: 'flat', blink: 1, bright: 0.35 } : s.face;
      s.cColor = () => C(0x48e5c2).multiplyScalar(k > 0.5 ? 0.25 : 1);
      s.ringColor = () => C(0x48e5c2).multiplyScalar(k > 0.5 ? 0.25 : 1);
      break;
    }
    case 'persona': {
      const i = Math.min(3, Math.floor(u / 0.5)), P = [
        { c1: '#ffcc00', c2: '#fff27a', col: 0xffb000, face: { mouth: 'grin', sparkle: true, eyeScale: 1.2 } },
        { c1: '#1fb6a6', c2: '#79e3d6', col: 0x2fe0c8, face: { lidL: 0.5, lidR: 0.5, smile: 0.4 } },
        { c1: '#ff2d95', c2: '#ffa0d2', col: 0xff3da0, face: { mouth: 'grin', eyeScale: 1.35, sparkle: true } },
        { c1: '#5b3bd6', c2: '#9c86ff', col: 0x8a6cff, face: { lidL: 0.35, lidR: 0, mouth: 'flat', brow: [0, 0.8] } },
      ][i];
      s.cam = orbit([-0.4, 0.3, -0.15, 0.45][i], 21, 5, V3(0, 4.1, 0)); s.cam.fov = 30 * punch(i * 0.5, 0.15);
      s.bg = { type: 'burst', c1: P.c1, c2: P.c2, spin: 0.8 * (i % 2 ? -1 : 1), n: 14 };
      Object.assign(s.face, P.face); s.cColor = () => C(P.col).multiplyScalar(1.3); s.ringColor = () => C(P.col);
      break;
    }
    case 'price': {
      s.rot = new THREE.Euler(0, u * (u > 1.2 ? 2.5 : 6), 0);
      s.cam = orbit(0, u > 1.2 ? 20 : 25, 6, V3(0, 4.2, 0)); s.cam.fov = 32 * punch(1.2, 0.2);
      s.bg = { type: 'burst', c1: '#c4001a', c2: '#ffcc33', spin: u > 1.2 ? 1.6 : 0.4, n: 24 };
      s.cColor = () => C(0xffd040).multiplyScalar(1.6); s.ringColor = () => C(0xffd040).multiplyScalar(1.4); s.glowI = 1;
      s.face.sparkle = true; s.face.eyeScale = 1.25; s.face.mouth = u > 1.2 ? 'grin' : 'o';
      s.shake = u > 1.2 && u < 1.6 ? 1 - (u - 1.2) / 0.4 : 0;
      break;
    }
    case 'end': {
      s.cam = orbit(0.42 - u * 0.03, 24, 5.6, V3(-4.6, 4.3, 0));
      s.bg = { type: 'burst', c1: '#fff6ec', c2: '#ffe2c2', spin: 0.12, cx: 0.72, glow: 'rgba(255,170,90,0.35)' };
      s.cColor = () => C(0xffb878).multiplyScalar(1.3); s.ringColor = () => C(0xffb878);
      s.face.sparkle = true; s.face.wink = u > 3.2 ? Math.sin(clamp((u - 3.2) / 0.4) * Math.PI) : 0;
      s.fade = 1 - ease(t, TL.duration - 0.45, TL.duration);
      break;
    }
  }
  if (c.id !== 'end') s.fade = Math.min(1, t / 0.08 + 0.15);   // a legelején egy villanás feketéből
  return s;
}

// ---------------------------------------------------------------- 2D: feliratok, effektek
function bigText(text, x, y, size, k, fill, stroke = '#ffffff', rot = -0.06, font = JPF) {
  if (k <= 0.01) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(k, k);
  ctx.font = `900 ${size}px ${font}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.22; ctx.strokeStyle = '#1a1020'; ctx.strokeText(text, 0, size * 0.06);
  ctx.lineWidth = size * 0.13; ctx.strokeStyle = stroke; ctx.strokeText(text, 0, 0);
  if (Array.isArray(fill)) { const gr = ctx.createLinearGradient(0, -size / 2, 0, size / 2); fill.forEach((c, i) => gr.addColorStop(i / (fill.length - 1), c)); ctx.fillStyle = gr; } else ctx.fillStyle = fill;
  ctx.fillText(text, 0, 0); ctx.restore();
}
function enSub(text, k = 1) {
  if (!text || k <= 0) return;
  ctx.save(); ctx.globalAlpha = k; ctx.font = `800 46px ${FONT}`; ctx.textAlign = 'center';
  const w = ctx.measureText(text).width + 60;
  ctx.fillStyle = 'rgba(10,10,20,0.78)'; rr(ctx, W / 2 - w / 2, H - 130, w, 74, 37); ctx.fill();
  ctx.fillStyle = '#ffe14d'; ctx.textBaseline = 'middle'; ctx.fillText(text, W / 2, H - 92); ctx.restore();
}
function bubble(text, x, y, k) {
  if (k <= 0) return;
  ctx.save(); ctx.globalAlpha = Math.min(1, k * 2); ctx.font = `800 44px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width + 70, h = 92;
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#1a1020'; ctx.lineWidth = 7;
  rr(ctx, x - w / 2, y - h / 2, w, h, 40); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 30, y + h / 2 - 3); ctx.lineTo(x - 55, y + h / 2 + 45); ctx.lineTo(x + 5, y + h / 2 - 3); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#1a1020'; ctx.fillText(text, x, y + 2); ctx.restore();
}
function stars(t, x, y, r, n = 6, col = '#fff38a') {
  ctx.save(); ctx.fillStyle = col; ctx.strokeStyle = '#1a1020'; ctx.lineWidth = 4;
  for (let i = 0; i < n; i++) {
    const a = t * 2 + i * TAU / n, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r * 0.45, sc = 18 + 8 * Math.sin(t * 8 + i);
    ctx.beginPath(); for (let j = 0; j < 10; j++) { const rr2 = j % 2 ? sc * 0.45 : sc, aa = j * Math.PI / 5 - Math.PI / 2; ctx.lineTo(px + Math.cos(aa) * rr2, py + Math.sin(aa) * rr2); } ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}
function burstTag(x, y, r, k, t) {
  if (k <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.8); ctx.scale(k, k);
  ctx.beginPath(); for (let j = 0; j < 32; j++) { const rr2 = j % 2 ? r * 0.78 : r, aa = j * Math.PI / 16; ctx.lineTo(Math.cos(aa) * rr2, Math.sin(aa) * rr2); } ctx.closePath();
  ctx.fillStyle = '#ffe100'; ctx.fill(); ctx.lineWidth = 10; ctx.strokeStyle = '#c4001a'; ctx.stroke(); ctx.restore();
}
function flash(t, a, len = 0.12) { const k = 1 - clamp((t - a) / len); if (t >= a && k > 0) { ctx.fillStyle = `rgba(255,255,255,${0.85 * k})`; ctx.fillRect(0, 0, W, H); } }

function overlays(t, s) {
  const c = s.cut, u = s.u;
  for (const cc of CUTS) flash(t, cc.t, cc.id === 'new' ? 0.25 : 0.1);
  const v = voiceAt(t);
  switch (c.id) {
    case 'new':
      bigText('新発売！', W * 0.5, H * 0.2, 190, popScale(u, 0.25), ['#fff36b', '#ffb000'], '#ffffff', -0.08);
      bigText('NEW!', W * 0.78, H * 0.78, 110, popScale(u, 0.6), '#ffffff', '#ff1f4b', 0.12, FONT);
      break;
    case 'name':
      bigText('シーキューブ！', W * 0.5, H * 0.18, 170, popScale(u, 0.08), ['#ffffff', '#bff4ff'], '#0a3cff', -0.05);
      bigText('C-CUBE', W * 0.5, H * 0.86, 120, popScale(u, 0.35), ['#ffd23f', '#ff8a1f'], '#ffffff', 0.03, FONT);
      stars(t, W * 0.5, H * 0.5, 470, 7);
      break;
    case 'talk':
      bigText('おしゃべり', W * 0.22, H * 0.3, 130, popScale(u, 0.05), '#ff2d78', '#ffffff', -0.12);
      bigText('できる！', W * 0.24, H * 0.47, 130, popScale(u, 0.22), '#ff2d78', '#ffffff', -0.12);
      if (v && v.id === 'btn_gooo') bubble("Let's gooooo!", W * 0.66, H * 0.2, 1);
      break;
    case 'glow':
      bigText('光る！', W * 0.5, H * 0.2, 220, popScale(u, 0.05), ['#ffffff', `hsl(${(t * 300) % 360} 100% 70%)`], '#ffffff', -0.05);
      stars(t * 1.5, W * 0.5, H * 0.55, 520, 9, `hsl(${(t * 200) % 360} 100% 75%)`);
      break;
    case 'throw':
      bigText('投げても', W * 0.27, H * 0.22, 140, popScale(u, 0.35), '#ff3b30', '#ffffff', -0.1);
      bigText('大丈夫！', W * 0.73, H * 0.8, 150, popScale(u, 0.75), '#ff3b30', '#ffffff', 0.06);
      if (u > 1.2) stars(t, W * 0.5, H * 0.3, 160, 5);
      if (u > 1.15 && u < 1.6) bigText('ボヨーン!', W * 0.66, H * 0.42, 90, popScale(u, 1.15), '#ffffff', '#1a1020', 0.2);
      break;
    case 'joke':
      bigText('ダジャレも', W * 0.5, H * 0.14, 130, popScale(u, 0.05) * (u < 2.2 ? 1 : 0), ['#ffffff', '#d7ff9a'], '#2e7d32', -0.05);
      bigText('言う！', W * 0.5, H * 0.3, 130, popScale(u, 0.25) * (u < 2.2 ? 1 : 0), ['#ffffff', '#d7ff9a'], '#2e7d32', -0.05);
      if (v && v.src === 'cube') bubble(CUBE_TEXT[v.id], W * 0.5, H * 0.17, 1);
      if (u > 6.3) { bigText('ドッ！', W * 0.8, H * 0.3, 160, popScale(u, 6.3), '#ffde3b', '#c4001a', 0.15); bigText('ドッ！', W * 0.2, H * 0.62, 120, popScale(u, 6.45), '#ffde3b', '#c4001a', -0.15); }
      break;
    case 'peek':
      ctx.save(); const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.85); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.75)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H); ctx.restore();
      bigText('こっそり…', W * 0.25, H * 0.2, 110, Math.min(1, u / 0.6), '#d9c2ff', '#2c1252', 0);
      bigText('見てる？', W * 0.76, H * 0.8, 120, Math.min(1, Math.max(0, (u - 0.6) / 0.6)), '#d9c2ff', '#2c1252', 0);
      if (u > 1.75) bigText('!?', W * 0.66, H * 0.36, 150, popScale(u, 1.75), '#ffffff', '#ff2d55', 0.2, FONT);
      break;
    case 'flip':
      bigText('ひっくり返すと…', W * 0.5, H * 0.16, 110, popScale(u, 0.05), '#ffffff', '#007a99', -0.04);
      bigText('プライバシーモード！', W * 0.5, H * 0.84, 110, popScale(u, 0.9), ['#ffffff', '#c9fff3'], '#007a99', 0.03);
      if (u > 0.9) bigText('🔒', W * 0.82, H * 0.45, 130, popScale(u, 0.95), '#ffffff', '#ffffff', 0.15, FONT);
      break;
    case 'persona': {
      const i = Math.min(3, Math.floor(u / 0.5));
      bigText('性格も選べる！', W * 0.5, H * 0.14, 110, popScale(u, 0.02), '#ffffff', '#1a1020', -0.03);
      const L2 = [['元気！', 'SUNNY'], ['のんびり', 'CHILL'], ['アゲアゲ！', 'HYPE'], ['皮肉屋', 'SARCASTIC']][i];
      bigText(L2[0], W * (i % 2 ? 0.75 : 0.25), H * 0.6, 120, popScale(u - i * 0.5, 0.02), '#ffffff', '#1a1020', i % 2 ? 0.1 : -0.1);
      bigText(L2[1], W * (i % 2 ? 0.75 : 0.25), H * 0.75, 60, popScale(u - i * 0.5, 0.1), '#ffe14d', '#1a1020', i % 2 ? 0.1 : -0.1, FONT);
      break;
    }
    case 'price':
      bigText('今なら…', W * 0.5, H * 0.18, 140, popScale(u, 0.05) * (u < 1.2 ? 1 : 0), '#ffffff', '#c4001a', -0.04);
      if (u > 1.2) {
        burstTag(W * 0.24, H * 0.55, 230, popScale(u, 1.2), t);
        bigText('プライスレス！', W * 0.5, H * 0.18, 150, popScale(u, 1.2), ['#fff7b0', '#ffc400'], '#c4001a', -0.05);
        ctx.save(); ctx.translate(W * 0.24, H * 0.55); ctx.rotate(-0.15); ctx.scale(popScale(u, 1.3), popScale(u, 1.3));
        ctx.font = `900 64px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#c4001a'; ctx.fillText('PRICE', 0, -18); ctx.fillText('LESS!', 0, 50); ctx.restore();
        stars(t, W * 0.5, H * 0.5, 600, 10);
      }
      break;
    case 'end': {
      const k = ease(u, 0.1, 0.6);
      ctx.save(); ctx.globalAlpha = k;
      ctx.font = `900 150px ${FONT}`; ctx.fillStyle = '#1a1020'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillText('C-Cube', 120, 330); ctx.fillStyle = '#ff8a1f'; ctx.fillRect(126, 360, 420 * ease(u, 0.3, 1.0), 12);
      ctx.font = `800 60px ${JPF}`; ctx.fillStyle = '#ff5a1f'; ctx.fillText('シーキューブ', 124, 440);
      ctx.font = `700 46px ${JPF}`; ctx.fillStyle = '#2a2230'; ctx.globalAlpha = k * ease(u, 0.4, 0.9); ctx.fillText('あなたのデスクに、小さな友だち。', 124, 540);
      ctx.font = `600 34px ${FONT}`; ctx.fillStyle = '#5a5060'; ctx.fillText('A little friend for your desk.', 124, 592);
      ctx.globalAlpha = k * 0.75; ctx.font = `500 22px ${JPF}`; ctx.fillStyle = '#5a5060';
      ctx.fillText('※コンセプト製品です。実際には販売していません。  *Concept product – not actually for sale.', 124, H - 46);
      ctx.restore();
      if (u > 2.7) bigText('シーキューブ！', W * 0.72, H * 0.14, 90, popScale(u, 2.7), ['#fff36b', '#ffb000'], '#ff5a1f', 0.08);
      break;
    }
  }
  // angol felirat a japán narrációhoz
  if (v && v.src === 'jp') enSub(JPL[v.id].en, Math.min(1, (t - v.t) / 0.08));
}
