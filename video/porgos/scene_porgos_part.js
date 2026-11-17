// ================================================================ „PÖRGŐS” BEMUTATÓ – vágólista + új cat mode-blokk
// A fő videó jelenete (stateAt / overlays) változatlan; ez a rész az új idővonal (tNew) minden pillanatához megmondja,
// hogy az eredeti videó melyik pillanatát kell mutatni (gyorsítva is lehet), vagy az új cat mode-blokkot.
// A vágólistát a tools/build_porgos.js számolja ki (video/porgos/edl_porgos.json + a mondatok hossza) -> timeline_porgos.json.
const PG = await (await fetch('porgos/timeline_porgos.json')).json();
function mapT(tn) {
  let g = PG.segs[PG.segs.length - 1];
  for (const x of PG.segs) if (tn >= x.T && tn < x.T + x.len) { g = x; break; }
  const u = Math.min(tn - g.T, g.len);
  return g.cat ? { cat: true, u, t: 1000 + u, since: u, seg: g } : { cat: false, u, t: g.a + u * (g.b - g.a) / g.len, since: u, seg: g };
}
const popK = (u, a, len = 0.22) => { const k = clamp((u - a) / len); return k <= 0 ? 0 : k < 1 ? Math.sin(k * Math.PI / 2) + 0.35 * Math.sin(k * Math.PI) : 1; };

// ---------------------------------------------------------------- cat mode-blokk (u: idő a blokk elejétől)
function catState(u, t) {
  const s = stateAt(162.0);                          // alap: a záró asztali jelenet (fények, asztal)
  const L = PG.cat;                                  // a blokk belső időpontjai (build_porgos.js)
  s.root = V3(0, 4, 0); s.rot = new THREE.Euler(0, 0, 0); s.ripple = null; s.fade = 1; s.hand = null; s.flash = 0;
  s.face = { mode: 'cat', t: u, color: CATC.eye };
  s.cColor = () => C(0xc4f06e).multiplyScalar(1.1); s.ringColor = () => C(0xc4f06e); s.glowColor = C(0xc4f06e); s.glowI = 0.8;
  const bl = (u * 0.45) % 1; s.face.blink = bl > 0.95 ? Math.sin((bl - 0.95) / 0.05 * Math.PI) : 0;
  if (u < L.close) {                                  // sima arc -> villanás -> macskafülek „pop” + miaú
    s.cam = shot(V3(5, 7.5, 24), V3(0, 4.2, 0), 32);
    if (u < L.pop) { s.face = { mode: 'face', t: u, smile: 1, color: '#78e6ff' }; s.cColor = () => C(0x78e6ff); s.ringColor = () => C(0x78e6ff); s.glowColor = C(0xffd9a8); }
    else { s.face.pop = popK(u, L.pop, 0.25); s.face.buzz = Math.exp(-(u - L.pop) * 5); }
    s.flash = Math.max(0, 1 - Math.abs(u - L.pop) / 0.12);
  } else if (u < L.pet) {                             // közeli: fülek, réspupilla, orr, bajusz
    const k = u - L.close;
    s.cam = shot(V3(0.6 - k * 0.3, 4.5, 10.5 - k * 0.4), V3(0, 4.15, 4), 30);
    s.face.lookX = k < 0.7 ? -0.9 : k < 1.4 ? 0.9 : 0; s.face.buzz = k > 1.5 ? 0.4 : 0;
  } else if (u < L.meow) {                            // simogatás a tetőn -> dorombol, a rezgőmotor berreg
    const k = u - L.pet;
    s.cam = shot(V3(11, 15, 22), V3(0, 5.0, 0), 32);
    const st = Math.sin(clamp((k - 0.1) / 2.4) * TAU * 2);
    s.hand = { pos: V3(0.3, 0, 1.2 + st * 2.4), rot: new THREE.Euler(-0.08, 0.15, 0), y: lerp(16, 9.25, ease(k, 0, 0.3)) };
    if (u >= L.purr) {
      s.face.purr = true; const a = 1.2;
      s.rot = new THREE.Euler(Math.sin(u * 61) * 0.012 * a, Math.sin(u * 47) * 0.01 * a, Math.sin(u * 53) * 0.014 * a);
      s.ripple = ((u - L.purr) % 1.1);
    } else s.face.lookY = -0.9;
  } else {                                            // zárás: még egy miaú
    const k = u - L.meow;
    s.cam = shot(V3(-3, 6, 19 - k * 0.8), V3(0, 4.3, 0), 32);
    s.face.pop = 0.75 + 0.25 * popK(k, 0.05, 0.2); s.face.buzz = Math.exp(-k * 4);
  }
  return s;
}
function catOverlays(u) {
  const L = PG.cat;
  if (u < L.close) title(u, Math.max(0.0, L.pop - 0.05), L.close, 'NEW: CAT MODE 🐱', 'switch it on in the app – it says meow', 0.6);
  caption(u, L.close + 0.05, L.pet, '🐱 Cat mode', 'ears · slit pupils · pink nose · ω mouth · whiskers');
  caption(u, L.pet + 0.2, L.meow, '😺 Pet the roof – it purrs', 'and the vibration motor purrs along');
  if (u >= L.meow) caption(u, L.meow + 0.05, L.len + 0.4, 'Meow.', 'the same cat face on the cube and in the simulator');
}
// vágásnál egy rövid „zoom-ütés” (a kép 3,5 %-ról visszaugrik) és halvány villanás – ettől pörgős a ritmus
function cutPunch(M) { return M.seg.punch ? 1 + 0.035 * Math.max(0, 1 - M.since / 0.2) : 1; }
function cutFlash(M) { if (M.seg.punch && M.since < 0.1) { ctx.fillStyle = `rgba(255,255,255,${0.18 * (1 - M.since / 0.1)})`; ctx.fillRect(0, 0, W, H); } }
function catFlash(s) { if (s.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${0.8 * s.flash})`; ctx.fillRect(0, 0, W, H); } }
