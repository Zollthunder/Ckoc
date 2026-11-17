// GENERÁLT FÁJL – ne szerkeszd kézzel. Forrás: video/scene.js + video/catmode/scene_catmode_part.js (tools/build_catmode_scene.js)
// C-kocka videó – animált 3D jelenet és képfeliratok.
// Minden képkocka kizárólag az időből (t) számolódik, így a felvétel képkockáról képkockára pontos.
import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';

const W = 1080, H = 1920;
const RENDER = new URLSearchParams(location.search).has('render');
if (RENDER) document.body.classList.add('render');

// ---------------------------------------------------------------- segédek
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const smooth = x => x * x * (3 - 2 * x);
const ease = (t, a, b) => smooth(seg(t, a, b));
const lerp = (a, b, k) => a + (b - a) * k;
const inR = (t, a, b) => t >= a && t < b;
const hsl = (h, s, l) => new THREE.Color().setHSL(((h % 1) + 1) % 1, s, l);
const C = hex => new THREE.Color(hex);
const BEAT = 60 / 110;

// ---------------------------------------------------------------- betöltés
const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error(src)); i.src = src; });
const TL = await (await fetch('catmode/timeline_catmode.json')).json();
const DUR = {};
const LINES = [];
const BODIES = await (await fetch('../web/model/bodies.json')).json();
const IMG = {
  fusionIso: await loadImg('../assets/fusion/iso-top-right.png'),
};
// a robbantott ábra időzítése az N08 mondathoz: egy szó kezdete ≈ a mondat kezdete + hossz × (karakterhely / szöveghossz)
const EX = { a: 0, b: 0, c: 0, d: 0, word: () => 0 };
const voiceAt = t => {
  for (const v of TL.voices) if (t >= v.t && t < v.t + DUR[v.id]) return { ...v, line: LINES.find(l => l.id === v.id), local: t - v.t };
  return null;
};

// ---------------------------------------------------------------- three.js alap
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.85;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = C(0x0c0e12);
scene.fog = new THREE.Fog(0x0c0e12, 45, 130);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(32, W / H, 0.1, 500);
const composer = new EffectComposer(renderer);
composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.5, 0.35, 0.92);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// fények
const key = new THREE.DirectionalLight(0xfff3e6, 2.0);
key.position.set(12, 20, 14);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 80 });
key.shadow.bias = -0.0004;
scene.add(key);
const rim = new THREE.DirectionalLight(0x8fb6ff, 2.0);
rim.position.set(-14, 9, -12);
scene.add(rim);
const fill = new THREE.HemisphereLight(0x9aa7c0, 0x101014, 0.35);
scene.add(fill);
const under = new THREE.PointLight(0xffffff, 0, 26, 1.6); // a fénygyűrű fénye az asztalon
scene.add(under);

// asztal
const desk = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0x17191e, roughness: 0.38, metalness: 0.0 }));
desk.rotation.x = -Math.PI / 2;
desk.position.y = -0.45;
desk.receiveShadow = true;
scene.add(desk);

// a fénygyűrű "foltja" az asztalon
function radialTex(inner = 'rgba(255,255,255,1)') {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, inner); gr.addColorStop(0.35, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}
const glow = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), new THREE.MeshBasicMaterial({ map: radialTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
glow.rotation.x = -Math.PI / 2;
glow.position.y = -0.44;
scene.add(glow);

// rezgés hullámai az asztalon (Ne zavarj mód)
const ripples = [0, 1, 2].map(() => {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.96, 1, 96), new THREE.MeshBasicMaterial({ color: 0x9fb8ff, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = -0.43; scene.add(m); return m;
});

// ---------------------------------------------------------------- anyagok
function woodTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#9a6a3c'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 70; i++) {
    g.strokeStyle = `rgba(${60 + Math.random() * 40},${35 + Math.random() * 20},15,${0.25 + Math.random() * 0.35})`;
    g.lineWidth = 1 + Math.random() * 3; g.beginPath();
    const y = Math.random() * 256; g.moveTo(0, y);
    for (let x = 0; x <= 256; x += 16) g.lineTo(x, y + Math.sin(x / 30 + i) * 6);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const MAT = {
  house: new THREE.MeshPhysicalMaterial({ color: 0x30333a, roughness: 0.5, metalness: 0.05, clearcoat: 0.35, clearcoatRoughness: 0.4 }),
  alu: new THREE.MeshStandardMaterial({ color: 0xc9ccd1, roughness: 0.42, metalness: 1.0 }),
  logo: new THREE.MeshStandardMaterial({ color: 0xd8dbe0, roughness: 0.35, metalness: 0.45 }),
  wood: new THREE.MeshStandardMaterial({ map: woodTexture(), roughness: 0.55 }),
  cyan: new THREE.MeshPhysicalMaterial({ color: 0x78e6ff, roughness: 0.25, clearcoat: 0.6 }),
  mint: new THREE.MeshPhysicalMaterial({ color: 0x8ce6aa, roughness: 0.25, clearcoat: 0.6 }),
  pink: new THREE.MeshPhysicalMaterial({ color: 0xff6e96, roughness: 0.25, clearcoat: 0.6 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0x050608, roughness: 0.08, metalness: 0.2, clearcoat: 1 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.85 }),
  orange: new THREE.MeshStandardMaterial({ color: 0xff8020, roughness: 0.62 }),
  light: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
};
const MAT_OF = n =>
  n === 'haz' ? MAT.house : /logo/.test(n) ? MAT.logo : n === 'tetolap' ? MAT.alu : n === 'gomb_1' ? MAT.wood :
  n === 'gomb_2' ? MAT.cyan : n === 'gomb_3' ? MAT.mint : n === 'gomb_4' ? MAT.pink :
  /kijelzo|kamera/.test(n) ? MAT.glass : n === 'gumitalp' ? MAT.rubber : /gumi_sarok/.test(n) ? MAT.orange : null;

// ---------------------------------------------------------------- a kocka
const cubeRoot = new THREE.Group();   // a kocka közepe
scene.add(cubeRoot);
const cube = new THREE.Group();
cubeRoot.add(cube);
const parts = {};
const stl = new STLLoader();
for (const b of BODIES) {
  const key = b.file.replace('.stl', '');
  const buf = await (await fetch('../web/model/' + b.file)).arrayBuffer();
  let geo = stl.parse(buf);
  geo.scale(0.1, 0.1, 0.1);           // mm -> cm
  geo.translate(0, -4, 0);            // a kocka közepe az origóban
  if (/^arc/.test(key)) continue;     // az arcot élő kijelzőkép helyettesíti
  geo = toCreasedNormals(geo, THREE.MathUtils.degToRad(35));
  let mat = MAT_OF(key);
  if (key === 'c_fenycsatorna' || key === 'rgb_fenygyuru') {
    const pos = geo.attributes.position, n = pos.count;
    const param = new Float32Array(n), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      if (key === 'c_fenycsatorna') {
        let a = Math.atan2(pos.getY(i), pos.getX(i)) * 180 / Math.PI; if (a < 0) a += 360;
        param[i] = clamp(((a - 36 + 360) % 360) / 288);   // 0..1 a C ívén végig
      } else {
        let a = Math.atan2(pos.getZ(i), pos.getX(i)); if (a < 0) a += Math.PI * 2;
        param[i] = a / (Math.PI * 2);
      }
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.userData.param = param;
    mat = MAT.light.clone();
  }
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true; m.receiveShadow = true;
  cube.add(m); parts[key] = m;
}
// élő kijelző (vászon textúra)
const faceCanvas = document.createElement('canvas'); faceCanvas.width = faceCanvas.height = 512;
const faceCtx = faceCanvas.getContext('2d');
const faceTex = new THREE.CanvasTexture(faceCanvas); faceTex.colorSpace = THREE.SRGBColorSpace;
const screen = new THREE.Mesh(new THREE.CircleGeometry(1.6, 96), new THREE.MeshBasicMaterial({ map: faceTex, toneMapped: false }));
screen.position.set(0, 0, 4.104);
cube.add(screen);
// a kamera adatvédelmi jelzőfénye
const led = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
led.position.set(2.2, -0.42, 4.08);
cube.add(led);
// "hibás" első verzió: a hangszórórács helyén sima lap
const patch = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 6.0), MAT.house.clone());
patch.position.set(4.003, 0, 0); patch.rotation.y = Math.PI / 2;
patch.material.transparent = true;
cube.add(patch);
// ujj a gombnyomáshoz
const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 3.2, 8, 24), new THREE.MeshStandardMaterial({ color: 0xe0ac8a, roughness: 0.6 }));
scene.add(finger);
const btn1Y = parts.gomb_1 ? parts.gomb_1.position.y : 0;

// ---------------------------------------------------------------- robbantott ábra: a 90 mm-es gyártható modell belseje
// (Fusionből: tools/export_inside.py -> video/model_inside/), a koncepciókockával azonos méretűre kicsinyítve
const INSIDE = await (await fetch('model_inside/inside.json')).json();
const IK = 0.1 * 8 / 9;                          // mm -> jelenet (a 90 mm-es kocka 8 egység széles, mint a koncepció)
const inside = new THREE.Group();
inside.visible = false;
cubeRoot.add(inside);
const IMAT = {
  petg: new THREE.MeshStandardMaterial({ color: 0xb4b9c2, roughness: 0.7 }),
  pcb: new THREE.MeshStandardMaterial({ color: 0x1f6e3c, roughness: 0.5, metalness: 0.1 }),
  pcbDark: new THREE.MeshStandardMaterial({ color: 0x1b2230, roughness: 0.45, metalness: 0.1 }),
  batt: new THREE.MeshStandardMaterial({ color: 0x2f62b0, roughness: 0.4, metalness: 0.2 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x8c9099, roughness: 0.35, metalness: 0.9 }),
  black: new THREE.MeshStandardMaterial({ color: 0x1a1b1f, roughness: 0.6 }),
  ghost: new THREE.MeshPhysicalMaterial({ color: 0x30333a, roughness: 0.5, transparent: true, opacity: 1, depthWrite: true }),
  ring: new THREE.MeshBasicMaterial({ color: 0xffd9a8, toneMapped: false }),
  strip: new THREE.MeshBasicMaterial({ color: 0xffb878, toneMapped: false }),
  opal: new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.3, emissive: 0xffb878, emissiveIntensity: 0.12, transparent: true, opacity: 0.92 }),
};
// név -> [anyag, robbantási eltolás (jelenet-egység), csoport]
function insideRole(n, c) {
  if (/^Arc/.test(n)) return null;                                              // az arc helyett élő kijelzőkép
  if (n === 'Haz (SLS)') return [IMAT.ghost, [0, 0, 0]];
  if (n === 'Tetolap') return [MAT.alu, [0, 6.2, 0]];
  if (n === 'Erinto betet') return [IMAT.opal, [0, 6.2, 0]];
  if (n === 'Andor fa betet' || n === 'Gomb 1') return [MAT.wood, [0, 6.2, 0]];
  if (n === 'Gomb 2') return [MAT.cyan, [0, 6.2, 0]];
  if (n === 'Gomb 3') return [MAT.mint, [0, 6.2, 0]];
  if (n === 'Gomb 4') return [MAT.pink, [0, 6.2, 0]];
  if (/Tetotarto/.test(n)) return [IMAT.petg, [0, 4.4, 0]];
  if (/kapcsolo/.test(n)) return [IMAT.black, [0, 4.4, 0]];
  if (/Erintes/.test(n)) return [IMAT.pcb, [0, 4.4, 0]];
  if (n === 'C fenycsatorna') return [IMAT.opal, [0, 0, 7.4]];
  if (n === 'Kamera') return [MAT.glass, [0, 0, 7.4]];
  if (/Elolapi tarto/.test(n)) return [IMAT.petg, [0, 0, 5.4]];
  if (/Kerek kijelzo/.test(n)) return [IMAT.pcbDark, [0, 0, 5.4]];
  if (/Mini kamera/.test(n)) return [IMAT.black, [0, 0, 5.4]];
  if (/C LED/.test(n)) return [IMAT.strip, [0, 0, 6.3]];
  if (/Hangszoro/.test(n)) {
    const sx = /bal/.test(n) ? -1 : 1;
    return [/rogzito/.test(n) ? IMAT.petg : /perem/.test(n) ? IMAT.black : IMAT.metal, [sx * (/rogzito/.test(n) ? 4.6 : 5.8), 0, 0]];
  }
  if (/Voice Bonnet/.test(n)) return [IMAT.pcb, [0, 2.7, 0]];
  if (/Raspberry/.test(n)) return [IMAT.pcb, [0, 1.35, 0]];
  if (/UPS/.test(n)) return [IMAT.batt, [0, 0, 0]];
  if (/Szan/.test(n)) return [IMAT.petg, [0, 0, 0]];
  if (/XIAO|IMU|Rezgo|USB-C/.test(n)) return [IMAT.pcb, [0, -1.5, 0]];
  if (/NeoPixel/.test(n)) return [IMAT.ring, [0, -2.5, 0]];
  if (/Also talca/.test(n)) return [MAT.house, [0, -3.4, 0]];
  if (n === 'RGB fenygyuru') return [IMAT.opal, [0, -4.6, 0]];
  if (n === 'Gumitalp') return [MAT.rubber, [0, -5.5, 0]];
  if (/Gumi sarok/.test(n)) return [MAT.orange, null];                          // kifelé, a saját sarka irányába
  return [IMAT.petg, [0, 0, 0]];
}
const insideParts = [];
for (const b of INSIDE) {
  const role = insideRole(b.name, b.comp);
  if (!role) continue;
  const buf = await (await fetch('model_inside/' + b.file)).arrayBuffer();
  let geo = stl.parse(buf);
  geo.scale(IK, IK, IK);
  geo.translate(0, -45 * IK, 0);                  // a kocka közepe az origóban
  geo = toCreasedNormals(geo, THREE.MathUtils.degToRad(35));
  const m = new THREE.Mesh(geo, role[0]);
  m.castShadow = true; m.receiveShadow = true;
  const c = new THREE.Vector3(b.center[0] * IK, (b.center[1] - 45) * IK, b.center[2] * IK);
  const off = role[1] ? new THREE.Vector3(...role[1]) : c.clone().normalize().multiplyScalar(2.6);
  inside.add(m);
  insideParts.push({ name: b.name, mesh: m, center: c, off });
}
// élő kijelzőkép a kerek kijelzőn (a látható terület Ø32,4 mm)
const insideScreen = new THREE.Mesh(new THREE.CircleGeometry(16.2 * IK, 96), new THREE.MeshBasicMaterial({ map: faceTex, toneMapped: false }));
insideScreen.position.set(0, 0, 42.62 * IK);
inside.add(insideScreen);
const insideScreenOff = new THREE.Vector3(0, 0, 5.4);
function insidePart(re) { return insideParts.find(p => re.test(p.name)); }

// ---------------------------------------------------------------- fények (C és gyűrű) színezése
function paintLight(mesh, fn, t) {
  if (!mesh) return;
  const geo = mesh.geometry, p = geo.userData.param, col = geo.attributes.color.array;
  for (let i = 0; i < p.length; i++) { const c = fn(p[i], t); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  geo.attributes.color.needsUpdate = true;
}

// ---------------------------------------------------------------- kijelző rajzolása
function drawFace(s) {
  const g = faceCtx; const R = 256;
  g.save();
  g.fillStyle = '#020305'; g.fillRect(0, 0, 512, 512);
  const col = s.color || '#78e6ff';
  g.shadowColor = col; g.shadowBlur = 24; g.fillStyle = col; g.strokeStyle = col;
  g.translate(R, R);
  const b = s.bright == null ? 1 : s.bright;
  g.globalAlpha = b;
  if (s.mode === 'off' || b <= 0) { g.restore(); faceTex.needsUpdate = true; return; }
  if (s.mode === 'cat') drawCatFace(g, s);
  else if (s.mode === 'face') {
    const lx = (s.lookX || 0) * 46, ly = (s.lookY || 0) * 34;
    const es = s.eyeScale || 1, open = 1 - clamp(s.blink || 0);
    for (const side of [-1, 1]) {
      const wink = side === 1 && s.wink ? 1 - s.wink : 1;
      const lid = side === -1 ? (s.lidL ?? 0) : (s.lidR ?? 0);
      g.save();
      g.translate(side * 78 + lx, -38 + ly);
      const h = 40 * es * Math.max(0.08, open * wink * (1 - lid));
      g.beginPath(); g.ellipse(0, 0, 36 * es, h, 0, 0, Math.PI * 2); g.fill();
      if (s.sparkle) { g.save(); g.shadowBlur = 0; g.fillStyle = '#ffffff'; g.beginPath(); g.arc(-11 * es, -12 * es, 9 * es * open, 0, 7); g.fill(); g.restore(); }
      g.restore();
      if (s.brow && s.brow[side === -1 ? 0 : 1]) { // szemöldök
        const bv = s.brow[side === -1 ? 0 : 1];
        g.save(); g.lineWidth = 16; g.lineCap = 'round';
        g.beginPath(); g.moveTo(side * 78 + lx - 38, -100 + ly - bv * 20 + side * bv * 6); g.lineTo(side * 78 + lx + 38, -100 + ly - bv * 20 - side * bv * 6); g.stroke(); g.restore();
      }
    }
    g.lineWidth = 22; g.lineCap = 'round';
    const mx = lx * 0.6, my = 70 + ly * 0.5;
    if (s.mouth === 'talk') {
      const a = s.talk || 0;
      g.beginPath(); g.ellipse(mx, my + 6, 58, 12 + a * 40, 0, 0, Math.PI); g.lineTo(mx - 58, my + 6); g.fill();
    } else if (s.mouth === 'worried') {
      g.beginPath(); g.arc(mx, my + 70, 62, -Math.PI * 0.78, -Math.PI * 0.22); g.stroke();
    } else if (s.mouth === 'flat') {
      g.beginPath(); g.moveTo(mx - 52, my + 14); g.lineTo(mx + 52, my + 6); g.stroke();
    } else if (s.mouth === 'o') {
      g.beginPath(); g.ellipse(mx + 30, my + 14, 16, 20, 0, 0, Math.PI * 2); g.stroke();
    } else if (s.mouth === 'grin') {
      g.beginPath(); g.arc(mx, my - 30, 96, Math.PI * 0.18, Math.PI * 0.82); g.closePath(); g.fill();
    } else { // mosoly
      const k = s.smile == null ? 1 : s.smile;
      g.beginPath(); g.arc(mx, my - 40 * k, 86, Math.PI * (0.5 - 0.32 * k), Math.PI * (0.5 + 0.32 * k)); g.stroke();
    }
  } else if (s.mode === 'dizzy') {
    g.lineWidth = 10; g.lineCap = 'round';
    for (const side of [-1, 1]) {
      g.save(); g.translate(side * 80, -36); g.rotate(s.t * 9 * side);
      g.beginPath(); for (let a = 0; a < 14; a += 0.15) { const r = a * 3.2; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.stroke(); g.restore();
    }
    g.lineWidth = 16; g.beginPath();
    for (let x = -70; x <= 70; x += 5) g.lineTo(x, 84 + Math.sin(x / 12 + s.t * 10) * 10); g.stroke();
  } else if (s.mode === 'eq') {
    const n = 28;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, v = s.levels[i % s.levels.length];
      g.save(); g.rotate(a); g.fillStyle = hsl(i / n + s.t * 0.2, 1, 0.6).getStyle();
      g.shadowColor = g.fillStyle; g.fillRect(-9, 80, 18, 30 + v * 120); g.restore();
    }
    g.beginPath(); g.arc(0, 0, 60 + (s.levels[0] || 0) * 14, 0, 7); g.fill();
  } else if (s.mode === 'swirl') {
    g.shadowBlur = 0;
    for (let i = 0; i < 9; i++) {
      const a = s.t * (2 + i * 0.4) + i * 0.7, r = 60 + i * 18;
      const gr = g.createRadialGradient(Math.cos(a) * r, Math.sin(a) * r, 0, Math.cos(a) * r, Math.sin(a) * r, 130);
      gr.addColorStop(0, `hsla(${200 + i * 20},90%,65%,0.35)`); gr.addColorStop(1, 'hsla(220,90%,60%,0)');
      g.fillStyle = gr; g.fillRect(-256, -256, 512, 512);
    }
  } else if (s.mode === 'text') {
    g.font = `800 ${s.size || 150}px "Segoe UI"`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(s.text, 0, s.sub ? -24 : 8);
    if (s.sub) { g.font = '600 46px "Segoe UI"'; g.globalAlpha = b * 0.85; g.fillText(s.sub, 0, 92); }
  } else if (s.mode === 'dnd') {
    g.globalAlpha = b * 0.6; g.beginPath(); g.arc(0, 0, 70, 0, 7); g.fill();
    g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(34, -26, 64, 0, 7); g.fill();
    g.globalCompositeOperation = 'source-over'; g.font = '600 40px "Segoe UI"'; g.textAlign = 'center'; g.fillText('Do not disturb', 0, 140);
  } else if (s.mode === 'call') {
    const p = 1 + 0.08 * Math.sin(s.t * 8);
    g.save(); g.scale(p, p); g.lineWidth = 12; g.beginPath(); g.arc(0, -60, 70, 0, 7); g.stroke(); g.restore();
    g.font = '800 64px "Segoe UI"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('BRO', 0, -58);
    g.font = '600 40px "Segoe UI"'; g.fillText('Calling…', 0, 62);
    g.font = '600 34px "Segoe UI"'; g.globalAlpha = b * 0.75; g.fillText('📞 Bluetooth', 0, 122);
  }
  g.restore();
  // üveg csillanás
  const gl = faceCtx.createLinearGradient(0, 0, 512, 512);
  gl.addColorStop(0, 'rgba(255,255,255,0.06)'); gl.addColorStop(0.45, 'rgba(255,255,255,0)');
  faceCtx.fillStyle = gl; faceCtx.fillRect(0, 0, 512, 512);
  faceTex.needsUpdate = true;
}

// ---------------------------------------------------------------- 2D képfeliratok
const out = document.getElementById('out');
const ctx = out.getContext('2d');
const FONT = '"Segoe UI", "Segoe UI Emoji", system-ui, sans-serif';
const ACC = '#ff9a3c';
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function wrap(g, text, maxW) {
  const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur); return lines;
}
function caption(t, a, b, text, sub, top = false) {
  if (!inR(t, a, b)) return;
  const k = ease(t, a, a + 0.35) * (1 - ease(t, b - 0.35, b));
  ctx.save(); ctx.globalAlpha = k;
  ctx.font = `700 46px ${FONT}`;
  const w1 = ctx.measureText(text).width;
  ctx.font = `500 30px ${FONT}`;
  const w2 = sub ? ctx.measureText(sub).width : 0;
  const w = Math.max(w1, w2) + 70, h = sub ? 128 : 86;
  const x = 90 - (1 - k) * 40, y = top ? 80 : H - 110 - h;
  ctx.fillStyle = 'rgba(12,14,18,0.78)'; rr(ctx, x, y, w, h, 18); ctx.fill();
  ctx.fillStyle = ACC; rr(ctx, x, y, 8, h, 4); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = `700 46px ${FONT}`; ctx.textBaseline = 'top'; ctx.fillText(text, x + 36, y + 18);
  if (sub) { ctx.fillStyle = '#c9ccd1'; ctx.font = `500 30px ${FONT}`; ctx.fillText(sub, x + 36, y + 76); }
  ctx.restore();
}
function title(t, a, b, text, sub, dim = 0.55) {
  if (!inR(t, a, b)) return;
  const k = ease(t, a, a + 0.3) * (1 - ease(t, b - 0.3, b));
  ctx.save(); ctx.globalAlpha = k * dim; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = k; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const sc = 0.92 + 0.08 * ease(t, a, a + 0.5);
  ctx.translate(W / 2, H / 2 - (sub ? 30 : 0)); ctx.scale(sc, sc);
  ctx.fillStyle = '#fff'; ctx.font = `800 120px ${FONT}`; ctx.fillText(text, 0, 0);
  const tw = ctx.measureText(text).width;
  ctx.fillStyle = ACC; ctx.fillRect(-tw / 2 * ease(t, a + 0.1, a + 0.6), 78, tw * ease(t, a + 0.1, a + 0.6), 8);
  if (sub) { ctx.fillStyle = '#c9ccd1'; ctx.font = `500 44px ${FONT}`; ctx.fillText(sub, 0, 140); }
  ctx.restore();
}
function subtitle(t) { // a kocka mondatai feliratként
  const v = voiceAt(t);
  if (!v || v.line.style === 'narrator') return;
  const k = clamp(v.local / 0.15) * clamp((DUR[v.id] - v.local) / 0.15);
  ctx.save(); ctx.globalAlpha = k; ctx.font = `italic 600 40px ${FONT}`; ctx.textAlign = 'center';
  const txt = '“' + v.line.text + '”', w = Math.min(1500, ctx.measureText(txt).width + 60);
  const lines = wrap(ctx, txt, 1440);
  const h = lines.length * 52 + 26, y = H - 70 - h;
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; rr(ctx, W / 2 - w / 2, y, w, h, 14); ctx.fill();
  ctx.fillStyle = '#ffe2c4'; lines.forEach((l, i) => ctx.fillText(l, W / 2, y + 50 + i * 52));
  ctx.restore();
}
function windowFrame(t, a, b, label, drawContent, x = 170, y = 90, w = 1580, h = 889) {
  if (!inR(t, a, b)) return;
  const k = ease(t, a, a + 0.35) * (1 - ease(t, b - 0.35, b));
  ctx.save(); ctx.globalAlpha = k;
  const sc = 0.94 + 0.06 * k; ctx.translate(W / 2, H / 2); ctx.scale(sc, sc); ctx.translate(-W / 2, -H / 2);
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 50;
  ctx.fillStyle = '#1b1e24'; rr(ctx, x, y, w, h, 16); ctx.fill(); ctx.shadowBlur = 0;
  ctx.fillStyle = '#2a2e36'; rr(ctx, x, y, w, 46, 16); ctx.fill(); ctx.fillRect(x, y + 30, w, 16);
  ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + 28 + i * 26, y + 23, 8, 0, 7); ctx.fill(); });
  ctx.fillStyle = '#c9ccd1'; ctx.font = `600 22px ${FONT}`; ctx.textBaseline = 'middle'; ctx.fillText(label, x + 120, y + 24);
  ctx.save(); rr(ctx, x, y + 46, w, h - 46, 0); ctx.clip(); drawContent(x, y + 46, w, h - 46); ctx.restore();
  ctx.restore();
}
function chat(t, a, b, msgs) {
  windowFrame(t, a, b, 'Claude Code – conversation', (x, y, w, h) => {
    ctx.fillStyle = '#15171c'; ctx.fillRect(x, y, w, h);
    let cy = y + 50;
    msgs.forEach((m, i) => {
      const appear = ease(t, a + 0.3 + i * 1.1, a + 0.7 + i * 1.1);
      if (appear <= 0) return;
      ctx.save(); ctx.globalAlpha *= appear; ctx.font = `500 34px ${FONT}`;
      const lines = wrap(ctx, m.text, 1000), bw = Math.min(1100, Math.max(...lines.map(l => ctx.measureText(l).width)) + 60), bh = lines.length * 46 + 40;
      const bx = m.me ? x + w - bw - 60 : x + 60;
      ctx.fillStyle = m.me ? '#3a2a1c' : '#23272f'; rr(ctx, bx, cy + (1 - appear) * 20, bw, bh, 20); ctx.fill();
      ctx.fillStyle = m.me ? ACC : '#78e6ff'; ctx.font = `700 24px ${FONT}`; ctx.textBaseline = 'bottom';
      ctx.fillText(m.me ? 'Zollo' : 'C (Claude)', bx + 4, cy - 6);
      ctx.fillStyle = '#eee'; ctx.font = `500 34px ${FONT}`; ctx.textBaseline = 'top';
      lines.forEach((l, j) => ctx.fillText(l, bx + 30, cy + 20 + j * 46 + (1 - appear) * 20));
      ctx.restore(); cy += bh + 70;
    });
  });
}
function phone(t, a, b, draw) {
  if (!inR(t, a, b)) return;
  const k = ease(t, a, a + 0.4) * (1 - ease(t, b - 0.35, b));
  const x = W - 520 + (1 - k) * 200, y = 150, w = 360, h = 720;
  ctx.save(); ctx.globalAlpha = k;
  ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 50; ctx.fillStyle = '#0b0c0f'; rr(ctx, x, y, w, h, 46); ctx.fill(); ctx.shadowBlur = 0;
  ctx.fillStyle = '#16191f'; rr(ctx, x + 14, y + 14, w - 28, h - 28, 36); ctx.fill();
  ctx.fillStyle = '#000'; rr(ctx, x + w / 2 - 50, y + 26, 100, 22, 11); ctx.fill();
  draw(x + 14, y + 14, w - 28, h - 28);
  ctx.restore();
}
function terminal(t, a, b, lines) {
  if (!inR(t, a, b)) return;
  const k = ease(t, a, a + 0.3) * (1 - ease(t, b - 0.3, b));
  const x = 80, y = 80, w = 860, h = 60 + lines.length * 46;
  ctx.save(); ctx.globalAlpha = k;
  ctx.fillStyle = 'rgba(10,12,16,0.88)'; rr(ctx, x, y, w, h, 14); ctx.fill();
  ctx.strokeStyle = 'rgba(255,154,60,0.6)'; ctx.lineWidth = 2; rr(ctx, x, y, w, h, 14); ctx.stroke();
  ctx.font = `500 26px Consolas, monospace`; ctx.textBaseline = 'top';
  let chars = Math.floor((t - a - 0.3) * 38);
  lines.forEach((l, i) => {
    if (chars <= 0) return;
    const s = l.slice(0, chars); chars -= l.length + 8;
    ctx.fillStyle = l.startsWith('>') ? '#78e6ff' : '#8ce6aa'; ctx.fillText(s, x + 28, y + 30 + i * 46);
  });
  ctx.restore();
}

// ---------------------------------------------------------------- kamera segédek
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
function orbit(angle, dist, height, target = V3(0, 4, 0)) {
  return { pos: V3(Math.sin(angle) * dist, height, Math.cos(angle) * dist), target };
}
function shot(pos, target, fov = 32) { return { pos, target, fov }; }

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


// ================================================================ „CAT MODE” – függőleges (9:16) rövid klip forgatókönyve és képi elemei
// (a fenti rész a fő videó jelenetéből jön: a kocka modellje, anyagai, fényei és az arc rajzolása)
// Pörgős, ~1 s-os vágások 120 BPM-re, nagy, vastag feliratok végig (sokan hang nélkül nézik), a végén hurokba illő zárás:
// az utolsó képkocka ugyanaz a „sima arc”, amivel a klip kezdődik.
const CUTS = TL.cuts.map((c, i) => ({ ...c, end: (TL.cuts[i + 1] || { t: TL.duration }).t }));
const cutAt = t => CUTS.find(c => t >= c.t && t < c.end) || CUTS[CUTS.length - 1];
const hash = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const popScale = (u, a, len = 0.22) => { const k = clamp((u - a) / len); return k <= 0 ? 0 : k < 1 ? Math.sin(k * Math.PI / 2) + 0.35 * Math.sin(k * Math.PI) : 1; };
const FB = '"Segoe UI Black", "Arial Black", "Segoe UI", "Segoe UI Emoji", sans-serif';
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

function renderAt(t) {
  const s = stateAt(t);
  drawBg(s.bg, t);
  camera.position.copy(s.cam.pos); camera.lookAt(s.cam.target);
  camera.fov = s.cam.fov || 32; camera.updateProjectionMatrix();
  cubeRoot.position.copy(s.root); cube.rotation.copy(s.rot);
  cube.visible = !s.inside && !s.hidden;
  hand.visible = !!s.hand;
  if (s.hand) { hand.position.set(s.hand.pos.x, s.hand.y, s.hand.pos.z); hand.rotation.copy(s.hand.rot); } inside.visible = s.inside;
  if (s.inside) {
    for (const p of insideParts) p.mesh.position.copy(p.off).multiplyScalar(s.explode);
    IMAT.ghost.opacity = lerp(1, 0.14, s.explode); IMAT.ghost.depthWrite = s.explode < 0.3;
    insideScreen.position.set(0, 0, 42.62 * IK).addScaledVector(insideScreenOff, s.explode);
    IMAT.ring.color.copy(s.ringColor(0.3, t)).multiplyScalar(0.8); IMAT.strip.color.copy(s.cColor(0.5, t)).multiplyScalar(0.8);
    IMAT.opal.emissive.copy(s.cColor(0.5, t));
  }
  paintLight(parts.c_fenycsatorna, s.cColor, t);
  paintLight(parts.rgb_fenygyuru, s.ringColor, t);
  // asztali fényfolt követi a kockát, eltűnik, ha magasan van
  const height = clamp(1 - (s.root.y - 4) / 6);
  glow.position.set(s.root.x, -0.44, s.root.z);
  glow.material.color.copy(s.glowColor).multiplyScalar(s.glowI * height);
  under.position.set(s.root.x, 0.6, s.root.z); under.color.copy(s.glowColor); under.intensity = 9 * s.glowI * height * (1 - 0.85 * s.explode);
  MAT.orange.color.copy(s.corner);
  patch.visible = s.patch > 0; patch.material.opacity = s.patch;
  led.material.color.setScalar(s.led ? 1.5 : 0.05);
  if (parts.gomb_1) parts.gomb_1.position.y = btn1Y - 0.09 * s.btn;
  finger.visible = !!s.finger;
  if (s.finger) { finger.position.copy(s.finger.pos); finger.rotation.set(s.finger.tilt, 0, 0.2); }
  ripples.forEach((r, i) => {
    if (s.ripple == null) { r.material.opacity = 0; return; }
    const k = s.ripple - i * 0.25; const sc = 4.5 + Math.max(0, k) * 7;
    r.scale.setScalar(sc); r.position.set(s.root.x, -0.43, s.root.z); r.material.opacity = k > 0 ? 0.5 * (1 - clamp(k / 1.2)) : 0;
  });
  drawFace(Object.assign({ t, color: '#78e6ff' }, s.face));
  composer.render();
  ctx.globalAlpha = 1;
  const sh = (s.shake || 0) * 22;
  ctx.drawImage(renderer.domElement, sh ? Math.sin(t * 97) * sh : 0, sh ? Math.cos(t * 83) * sh : 0, W, H);
  // finom vignetta
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.05);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.18)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  overlays(t, s);
  post(t, s);
  if (s.fade < 1) { ctx.fillStyle = `rgba(0,0,0,${1 - s.fade})`; ctx.fillRect(0, 0, W, H); }
}

// ---------------------------------------------------------------- vezérlés (előnézet és felvétel)
window.renderAt = renderAt;
window.grabFrame = (t, q = 0.92) => { renderAt(t); return out.toDataURL('image/jpeg', q); };
window.duration = TL.duration;
window.ready = true;
document.getElementById('load').remove();

if (!RENDER) {
  const audio = document.getElementById('audio'), seek = document.getElementById('seek'), play = document.getElementById('play'), time = document.getElementById('time');
  const start = +(new URLSearchParams(location.search).get('t') || 0);
  let playing = false;
  seek.value = start; audio.currentTime = start;
  const fmt = x => `${Math.floor(x / 60)}:${(x % 60).toFixed(1).padStart(4, '0')}`;
  play.onclick = () => { playing = !playing; play.textContent = playing ? '⏸ Pause' : '▶ Play'; if (playing) audio.play(); else audio.pause(); };
  seek.oninput = () => { audio.currentTime = +seek.value; if (!playing) { renderAt(+seek.value); time.textContent = fmt(+seek.value); } };
  (function loop() {
    if (playing) { seek.value = audio.currentTime; renderAt(audio.currentTime); time.textContent = fmt(audio.currentTime); }
    requestAnimationFrame(loop);
  })();
  renderAt(start); time.textContent = fmt(start);
}
// a környezeti tükröződés visszafogása (különben a sötét ház is túl világos)
for (const m of Object.values(MAT)) if ('envMapIntensity' in m) m.envMapIntensity = 0.45;
MAT.alu.envMapIntensity = 0.35; MAT.glass.envMapIntensity = 0.6;
renderAt(+(new URLSearchParams(location.search).get('t') || 0));
