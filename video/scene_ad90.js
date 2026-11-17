// GENERÁLT FÁJL – ne szerkeszd kézzel. Forrás: video/scene.js + video/ad90/scene_ad90_part.js (tools/build_ad90_scene.js)
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

const W = 1920, H = 1080;
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
const TL = await (await fetch('ad90/timeline_ad90.json')).json();
const DUR = await (await fetch('ad90/durations_ad90.json')).json();
const AD_LINES = await (await fetch('ad90/lines_ad90.json')).json();
const CUBE_TEXT = Object.fromEntries((await (await fetch('../web/voice/lines.json')).json()).map(l => [l.id, l.text]));
const LINES = [...AD_LINES.map(l => ({ id: l.id, text: l.text, style: 'narrator' })), ...Object.entries(CUBE_TEXT).map(([id, text]) => ({ id, text, style: 'cube' }))];
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
  if (s.mode === 'face') {
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

// ================================================================ „90-ES ÉVEKBELI AMERIKAI TÉVÉREKLÁM” – forgatókönyv és képi elemek
// (a fenti rész a fő videó jelenetéből jön: a kocka modellje, anyagai, fényei és az arc rajzolása)
// Képi világ: neon színek, Memphis-stílusú geometrikus minták, krómfeliratok, villanó címkék, és a végén VHS-hatás
// (alacsonyabb felbontás, színcsúszás, szkenvonalak, sávzaj, képernyő-időbélyeg).
const F90 = 'Impact, "Arial Black", "Segoe UI", sans-serif';
const VCR = '"Consolas", "Lucida Console", "Courier New", monospace';
const CUTS = TL.cuts.map((c, i) => ({ ...c, end: (TL.cuts[i + 1] || { t: TL.duration }).t }));
const cutAt = t => CUTS.find(c => t >= c.t && t < c.end) || CUTS[CUTS.length - 1];
const VT = Object.fromEntries(TL.voices.map(v => [v.id, v.t]));        // a mondatok kezdete (s)
const outBounce = x => { const n = 7.5625, d = 2.75; if (x < 1 / d) return n * x * x; if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75; if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375; return n * (x -= 2.625 / d) * x + 0.984375; };
const TAU = Math.PI * 2;
const popScale = (u, a) => { const k = clamp((u - a) / 0.2); return k <= 0 ? 0 : k < 1 ? Math.sin(k * Math.PI / 2) + 0.35 * Math.sin(k * Math.PI) : 1; };
const NEON = ['#ff2bd6', '#00e5ff', '#fff200', '#7cff4f', '#8b5cff', '#ff7a00'];
const hash = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// ---------------------------------------------------------------- háttér (a 3D jelenet mögött)
const bgCanvas = document.createElement('canvas'); bgCanvas.width = 1280; bgCanvas.height = 720;
const bgCtx = bgCanvas.getContext('2d');
const bgTex = new THREE.CanvasTexture(bgCanvas); bgTex.colorSpace = THREE.SRGBColorSpace;
scene.background = bgTex; scene.fog = null; desk.visible = false;

// Memphis-alakzat: háromszög, karika, cikcakk, hullám, pöttyhalmaz, félkör
function shape(g, kind, x, y, sz, rot, col, lw = 7) {
  g.save(); g.translate(x, y); g.rotate(rot); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath();
  if (kind === 0) { g.moveTo(0, -sz); g.lineTo(sz * 0.87, sz * 0.5); g.lineTo(-sz * 0.87, sz * 0.5); g.closePath(); g.fill(); }
  else if (kind === 1) { g.arc(0, 0, sz * 0.7, 0, TAU); g.stroke(); }
  else if (kind === 2) { for (let i = 0; i <= 6; i++) g.lineTo(-sz + i * sz / 3, i % 2 ? -sz * 0.3 : sz * 0.3); g.stroke(); }
  else if (kind === 3) { for (let i = 0; i <= 40; i++) { const xx = -sz + i * sz / 20; g.lineTo(xx, Math.sin(i / 40 * TAU * 1.5) * sz * 0.3); } g.stroke(); }
  else if (kind === 4) { for (let i = 0; i < 9; i++) { g.moveTo((i % 3 - 1) * sz * 0.45 + 6, (Math.floor(i / 3) - 1) * sz * 0.45); g.arc((i % 3 - 1) * sz * 0.45, (Math.floor(i / 3) - 1) * sz * 0.45, 6, 0, TAU); } g.fill(); }
  else { g.arc(0, 0, sz * 0.6, Math.PI, TAU); g.closePath(); g.fill(); }
  g.restore();
}
function memphis(g, w, h, t, n, alpha = 1, pal = NEON, speed = 1) {
  g.save(); g.globalAlpha = alpha;
  for (let i = 0; i < n; i++) {
    const x = ((hash(i) * w * 1.3 + t * 40 * speed * (hash(i + 7) - 0.5)) % (w * 1.3) + w * 1.3) % (w * 1.3) - w * 0.15;
    const y = ((hash(i + 3) * h * 1.3 - t * 30 * speed * (0.4 + hash(i + 9))) % (h * 1.3) + h * 1.3) % (h * 1.3) - h * 0.15;
    shape(g, i % 6, x, y, 26 + hash(i + 5) * 34, hash(i + 11) * TAU + t * (hash(i + 13) - 0.5) * 2 * speed, pal[i % pal.length], 6 + (i % 3) * 2);
  }
  g.restore();
}
function drawBg(b, t) {
  const g = bgCtx, w = 1280, h = 720, cx = w * (b.cx ?? 0.5), cy = h * (b.cy ?? 0.5);
  g.fillStyle = b.c1; g.fillRect(0, 0, w, h);
  if (b.type === 'burst') {
    const n = b.n || 20, rot = (b.spin || 0.25) * t;
    g.fillStyle = b.c2;
    for (let i = 0; i < n; i++) { const a0 = rot + i * TAU / n, a1 = a0 + TAU / n / 2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a0) * 2000, cy + Math.sin(a0) * 2000); g.lineTo(cx + Math.cos(a1) * 2000, cy + Math.sin(a1) * 2000); g.closePath(); g.fill(); }
  } else if (b.type === 'grid') {                       // neon „naplemente” és perspektivikus rács
    const hz = h * 0.55, sk = g.createLinearGradient(0, 0, 0, hz);
    sk.addColorStop(0, b.c1); sk.addColorStop(1, b.c3 || '#ff2bd6'); g.fillStyle = sk; g.fillRect(0, 0, w, hz);
    g.save(); g.beginPath(); g.arc(w / 2, hz, 190, Math.PI, TAU); g.clip();
    const sg = g.createLinearGradient(0, hz - 190, 0, hz); sg.addColorStop(0, '#fff200'); sg.addColorStop(1, '#ff2b6a'); g.fillStyle = sg; g.fillRect(0, 0, w, h);
    g.fillStyle = b.c3 || '#ff2bd6'; for (let i = 0; i < 6; i++) g.fillRect(0, hz - 20 - i * 26, w, 4 + i * 1.5);
    g.restore();
    g.fillStyle = '#0b0420'; g.fillRect(0, hz, w, h - hz);
    g.strokeStyle = b.c2; g.lineWidth = 3; g.shadowColor = b.c2; g.shadowBlur = 12;
    for (let i = -20; i <= 20; i++) { g.beginPath(); g.moveTo(w / 2 + i * 18, hz); g.lineTo(w / 2 + i * 260, h); g.stroke(); }
    const off = (t * 1.6) % 1;
    for (let i = 0; i < 14; i++) { const z = (i + off) / 14, y = hz + (h - hz) * z * z; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.shadowBlur = 0;
  } else if (b.type === 'checker') {
    const s = 90, off = (t * 70) % (s * 2);
    g.save(); g.translate(w / 2, h / 2); g.rotate(0.2 + Math.sin(t) * 0.05); g.fillStyle = b.c2;
    for (let y = -900; y < 900; y += s) for (let x = -1300; x < 1300; x += s) if (((x + y) / s) % 2 === 0) g.fillRect(x + off, y, s, s);
    g.restore();
  } else if (b.type === 'zigzag') {
    g.strokeStyle = b.c2; g.lineWidth = 26; g.lineJoin = 'miter';
    const off = (t * 120) % 120;
    for (let r = -1; r < 9; r++) { g.beginPath(); for (let x = -120; x < w + 120; x += 60) g.lineTo(x + off, r * 100 + ((x / 60) % 2 ? -26 : 26)); g.stroke(); }
  } else if (b.type === 'rainbow') {
    const n = 24, rot = t * 0.8;
    for (let i = 0; i < n; i++) { const a0 = rot + i * TAU / n, a1 = a0 + TAU / n; g.fillStyle = `hsl(${(i * 15 + t * 160) % 360} 100% ${i % 2 ? 58 : 42}%)`; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a0) * 2000, cy + Math.sin(a0) * 2000); g.lineTo(cx + Math.cos(a1) * 2000, cy + Math.sin(a1) * 2000); g.closePath(); g.fill(); }
  } else if (b.type === 'grey') {                       // az „unalmas asztal”: szürke irodai csempe
    g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 3;
    for (let x = 0; x < w; x += 80) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = 0; y < h; y += 80) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  } else if (b.type === 'static') {
    const id = g.createImageData(320, 180), d = id.data; let sd = Math.floor(t * 30) * 7919 + 1;
    for (let i = 0; i < d.length; i += 4) { sd = (sd * 16807) % 2147483647; const v = sd % 256; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
    const tc = document.createElement('canvas'); tc.width = 320; tc.height = 180; tc.getContext('2d').putImageData(id, 0, 0);
    g.imageSmoothingEnabled = false; g.drawImage(tc, 0, 0, w, h); g.imageSmoothingEnabled = true;
  }
  if (b.memphis) memphis(g, w, h, t, b.memphis, b.mAlpha ?? 0.9, b.pal || NEON, b.mSpeed || 1);
  if (b.glow !== 'none') {
    const rg = g.createRadialGradient(cx, cy, 0, cx, cy, 480); rg.addColorStop(0, b.glow || 'rgba(255,255,255,0.45)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg; g.fillRect(0, 0, w, h);
  }
  bgTex.needsUpdate = true;
}

// ---------------------------------------------------------------- idő -> állapot
function stateAt(t) {
  const c = cutAt(t), u = t - c.t;
  const s = {
    cam: orbit(0, 19, 5.5, V3(0, 4, 0)), root: V3(0, 4, 0), rot: new THREE.Euler(0, 0, 0),
    cColor: () => C(0xffd9a8).multiplyScalar(1.15), ringColor: () => C(0xffd9a8), glowColor: C(0xffd9a8), glowI: 0.2,
    face: { mode: 'face', t, smile: 1, blink: 0 }, corner: C(0xff8020), patch: 0, led: 0, btn: 0, finger: null, ripple: null, fade: 1,
    inside: false, explode: 0, bg: { type: 'burst', c1: '#ff2bd6', c2: '#fff200' }, shake: 0, cut: c, u, hidden: false,
  };
  const bl = (t * 0.5) % 1; s.face.blink = bl > 0.95 ? Math.sin((bl - 0.95) / 0.05 * Math.PI) : 0;
  const v = voiceAt(t);
  if (v && v.src === 'cube') { s.face.mouth = 'talk'; s.face.talk = 0.35 + 0.65 * Math.abs(Math.sin(t * 17) * Math.sin(t * 6.3 + 1)); }
  const punch = (a, k = 0.12) => 1 - k * Math.exp(-Math.max(0, u - a) * 9) * (u >= a ? 1 : 0);   // „zoom-ütés” ütemre
  const neonCol = (p, tt) => hsl(p * 0.6 + tt * 1.4, 1, 0.55);
  const beat = TL.beat;
  switch (c.id) {
    case 'static': {
      s.hidden = true; s.glowI = 0; s.bg = { type: 'static', c1: '#000', glow: 'none' };
      break;
    }
    case 'hey': {   // a kocka „berobban” a kamerába
      const k = clamp(u / 0.35);
      s.cam = orbit(0.2 * Math.sin(u * 3), lerp(9, 15, ease(u, 0, 0.35)) * punch(VT.A01 + 0.62 - c.t, 0.12), 5.0, V3(0, 4.1, 0)); s.cam.fov = 34;
      s.rot = new THREE.Euler(0, (1 - k) * 2.2, (1 - k) * -0.6);
      s.face.eyeScale = 1.3; s.face.sparkle = true; s.face.mouth = 'grin';
      s.bg = { type: 'zigzag', c1: '#00e5ff', c2: '#ff2bd6', memphis: 14 };
      s.cColor = neonCol; s.ringColor = neonCol; s.shake = u < 0.5 ? (0.5 - u) * 1.4 : 0;
      break;
    }
    case 'boring': {  // szürke, unalmas asztal: a kocka még kikapcsolva, minden színtelen
      s.cam = orbit(0.6, 38, 7, V3(0, 4.0, 0)); s.cam.fov = 30;
      s.bg = { type: 'grey', c1: '#8d8f93', glow: 'rgba(255,255,255,0.12)' };
      s.face = { mode: 'off' }; s.cColor = () => C(0x000000); s.ringColor = () => C(0x000000); s.glowI = 0; s.corner = C(0x6a6a6a);
      s.gray = 1;
      break;
    }
    case 'intro': {   // robbanás: „NEW!” – a kocka pörögve leesik, felragyog
      const k = clamp(u / 0.6);
      s.root = V3(0, 4 + 14 * (1 - outBounce(k)), 0);
      s.rot = new THREE.Euler(0, (1 - k) * 6, 0);
      s.cam = orbit(0.15 + u * 0.08, 22 * punch(0.6, 0.12), 5.2, V3(0, 4.2, 0));
      s.face.sparkle = true; s.face.eyeScale = 1.2; s.face.mouth = 'grin';
      s.bg = { type: 'burst', c1: '#ff2bd6', c2: '#fff200', spin: 0.7, n: 18, memphis: 18 };
      s.cColor = () => C(0xffd040).multiplyScalar(1.6); s.ringColor = neonCol; s.glowI = 1;
      s.shake = u > 0.6 && u < 1.0 ? 1 - (u - 0.6) / 0.4 : 0;
      break;
    }
    case 'talks': {
      s.cam = orbit(0.55, 20, 5.2, V3(-1.8, 4.2, 0)); s.cam.fov = 30 * punch(0, 0.14);
      s.rot = new THREE.Euler(0, Math.sin(u * 6) * 0.07, Math.sin(u * 8) * 0.035);
      s.bg = { type: 'checker', c1: '#fff200', c2: '#ff2bd6', cx: 0.62, memphis: 10, mAlpha: 0.8, pal: ['#00e5ff', '#1a1020', '#7cff4f'] };
      if (!(v && v.src === 'cube')) { s.face.mouth = 'grin'; s.face.eyeScale = 1.15; }
      s.cColor = () => C(0xff2bd6).multiplyScalar(1.3); s.ringColor = () => C(0x00e5ff);
      break;
    }
    case 'glows': {
      s.cam = orbit(u * 0.7 - 0.4, 23, 6, V3(0, 4, 0)); s.cam.fov = 32 * punch(0, 0.15);
      s.cColor = neonCol; s.ringColor = neonCol; s.glowColor = hsl(t * 1.4, 1, 0.55); s.glowI = 1.4;
      s.face = { mode: 'eq', t, levels: Array.from({ length: 12 }, (_, i) => 0.3 + 0.7 * Math.abs(Math.sin(t * 9 + i * 1.7))) };
      s.bg = { type: 'rainbow', c1: '#111', glow: 'rgba(255,255,255,0.2)' };
      break;
    }
    case 'toss': {   // három ütemre: feldobás, leesés, pattanás
      const ph = Math.min(2, Math.floor(u / (beat * 2))), uu = u - ph * beat * 2;
      const k = clamp(uu / (beat * 1.6));
      const fromX = [14, -14, 12][ph];
      s.root = uu < beat * 1.6 ? V3(lerp(fromX, 0, k), 4 + 7 * Math.sin(k * Math.PI), 0) : V3(0, 4 + Math.abs(Math.sin((uu - beat * 1.6) * 10)) * 1.2 * Math.exp(-(uu - beat * 1.6) * 4), 0);
      s.rot = new THREE.Euler(k * 6 * (ph % 2 ? -1 : 1), k * 3, -k * 8);
      s.cam = orbit([0, 0.5, -0.4][ph], 27, 5.5, V3(0, 4.5, 0));
      s.face = uu < beat * 1.6 ? { mode: 'face', t, mouth: 'o', eyeScale: 1.3 } : (ph === 2 ? { mode: 'dizzy', t } : { mode: 'face', t, mouth: 'grin', sparkle: true });
      s.bg = { type: 'burst', c1: ['#00e5ff', '#7cff4f', '#ff7a00'][ph], c2: ['#8b5cff', '#00a86b', '#fff200'][ph], spin: 1.2, n: 14, memphis: 8 };
      s.cColor = () => C([0x00e5ff, 0x7cff4f, 0xff7a00][ph]).multiplyScalar(1.4); s.ringColor = s.cColor;
      const land = uu - beat * 1.6; s.shake = land > 0 && land < 0.35 ? 1 - land / 0.35 : 0;
      break;
    }
    case 'joke': {   // ujj megnyomja a fa „Andor”-gombot, a kocka elmondja a viccet
      const press = VT.A07 + 0.9 - c.t;
      s.cam = u < press + 0.6 ? shot(V3(-6.5, 15.5, 12), V3(-1.6, 7.0, 1.6), 30) : orbit(-0.2, 20, 5.2, V3(0, 4.2, 0));
      if (u < press + 0.6) { const dn = ease(u, press - 0.25, press) * (1 - ease(u, press + 0.1, press + 0.3)); s.btn = dn; s.finger = { pos: V3(-2.3, 8.2 + 1.9 + (1 - dn) * 2.5, 2.3), tilt: 0.25 }; }
      s.bg = { type: 'zigzag', c1: '#7cff4f', c2: '#00a86b', memphis: 12, pal: ['#fff200', '#ff2bd6', '#1a1020'] };
      s.cColor = () => C(0xb06a2a).multiplyScalar(1.8); s.ringColor = () => C(0x7cff4f);
      const pl = VT.joke_8a + 0.9 - c.t;
      if (u > pl) { s.face.mouth = 'grin'; s.face.eyeScale = 1.15; s.face.sparkle = true; s.shake = Math.exp(-(u - pl) * 6) * 0.6; }
      break;
    }
    case 'flip': {
      const fl = VT.A08 + 1.0 - c.t, k = ease(u, fl, fl + 0.5);
      s.rot = new THREE.Euler(0, 0, Math.PI * k); s.root = V3(0, 4 + Math.sin(k * Math.PI) * 2, 0);
      s.cam = orbit(0.3, 24, 6, V3(0, 4.5, 0)); s.cam.fov = 32 * punch(fl + 0.5, 0.15);
      s.bg = { type: 'grid', c1: '#1a0640', c2: '#00e5ff', c3: '#ff2bd6', cy: 0.45, glow: 'none' };
      s.face = k > 0.5 ? { mode: 'face', t, mouth: 'flat', blink: 1, bright: 0.35 } : { ...s.face, lookX: 0.8, lidL: 0.3, lidR: 0.3 };
      s.cColor = () => C(0x00e5ff).multiplyScalar(k > 0.5 ? 0.2 : 1.2);
      s.ringColor = () => C(0xff2bd6).multiplyScalar(k > 0.5 ? 0.2 : 1.2);
      break;
    }
    case 'persona': {   // négy személyiség, ütemre váltva
      const n = (c.end - c.t) / 4, i = Math.min(3, Math.floor(u / n)), P = [
        { c1: '#fff200', c2: '#ff7a00', col: 0xffb000, face: { mouth: 'grin', sparkle: true, eyeScale: 1.2 } },
        { c1: '#00e5ff', c2: '#7cff4f', col: 0x2fe0c8, face: { lidL: 0.5, lidR: 0.5, smile: 0.4 } },
        { c1: '#ff2bd6', c2: '#fff200', col: 0xff3da0, face: { mouth: 'grin', eyeScale: 1.35, sparkle: true } },
        { c1: '#3a1a8c', c2: '#8b5cff', col: 0x8a6cff, face: { lidL: 0.35, lidR: 0, mouth: 'flat', brow: [0, 0.8] } },
      ][i];
      s.cam = orbit([-0.4, 0.3, -0.15, 0.45][i], 21, 5, V3(0, 4.1, 0)); s.cam.fov = 30 * punch(i * n, 0.15);
      s.bg = { type: i % 2 ? 'checker' : 'burst', c1: P.c1, c2: P.c2, spin: 0.9 * (i % 2 ? -1 : 1), n: 14, memphis: 8, pal: ['#1a1020', '#ffffff'] };
      Object.assign(s.face, P.face); s.cColor = () => C(P.col).multiplyScalar(1.3); s.ringColor = () => C(P.col);
      break;
    }
    case 'tastic': {   // „TOTALLY CUBE-TASTIC!” – minden forog
      s.rot = new THREE.Euler(Math.sin(u * 3) * 0.3, u * 5, Math.sin(u * 4) * 0.2);
      s.cam = orbit(0, 21 * punch(0, 0.2), 5.5, V3(0, 4.2, 0)); s.cam.fov = 32;
      s.bg = { type: 'rainbow', c1: '#000', memphis: 22, mSpeed: 2.5, pal: ['#ffffff', '#1a1020', '#fff200'] };
      s.cColor = neonCol; s.ringColor = neonCol; s.glowI = 1.4; s.glowColor = hsl(t, 1, 0.55);
      s.face.sparkle = true; s.face.eyeScale = 1.3; s.face.mouth = 'grin';
      s.shake = u < 0.4 ? 1 - u / 0.4 : 0;
      break;
    }
    case 'call': {    // „CALL NOW!” – a kocka arcán telefon
      s.cam = orbit(0.45, 23, 5.4, V3(-5.0, 4.3, 0)); s.cam.fov = 32 * punch(0, 0.12);
      s.rot = new THREE.Euler(0, Math.sin(u * 20) * 0.04 * (u < 1 ? 1 : 0.3), Math.sin(u * 23) * 0.04);
      s.bg = { type: 'burst', c1: '#c4001a', c2: '#ff2bd6', spin: 1.0, n: 22, cx: 0.7, memphis: 10, pal: ['#fff200', '#00e5ff'] };
      s.face = { mode: 'text', t, text: 'CALL', sub: 'NOW!', size: 140, color: '#fff200' };
      s.cColor = () => C(0xfff200).multiplyScalar(1.5); s.ringColor = () => C(0xfff200);
      break;
    }
    case 'end': {     // záróképernyő: logó, „Available wherever cool stuff is sold”, kacsintó apróbetű
      s.cam = orbit(0.42 - u * 0.03, 24, 5.6, V3(-4.6, 4.3, 0));
      s.bg = { type: 'grid', c1: '#1a0640', c2: '#ff2bd6', c3: '#8b5cff', cx: 0.72, cy: 0.45, glow: 'none', memphis: 6, mAlpha: 0.5 };
      s.cColor = neonCol; s.ringColor = neonCol; s.glowI = 1;
      s.face.sparkle = true; s.face.mouth = 'grin';
      const wk = VT.A13 - c.t + 0.2;
      s.face.wink = u > wk ? Math.sin(clamp((u - wk) / 0.45) * Math.PI) : 0;
      s.fade = 1 - ease(t, TL.duration - 0.5, TL.duration);
      break;
    }
  }
  return s;
}

// ---------------------------------------------------------------- 2D: feliratok, effektek
// 90-es krómbetű: kihúzott (extrudált) árnyék, vastag körvonal, színátmenetes kitöltés
function txt90(text, x, y, size, k, o = {}) {
  if (k <= 0.01) return;
  const fill = o.fill || ['#ffffff', '#bfe9ff', '#3a6bbf', '#ffffff', '#c9c9ff'], font = o.font || F90;
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? -0.07); ctx.scale(k, k);
  ctx.font = `${o.weight || 400} ${size}px ${font}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  const depth = o.depth ?? Math.round(size * 0.09);
  ctx.fillStyle = o.ext || '#1a0640';
  for (let i = depth; i > 0; i--) { ctx.lineWidth = size * 0.16; ctx.strokeStyle = ctx.fillStyle; ctx.strokeText(text, i, i); ctx.fillText(text, i, i); }
  ctx.lineWidth = size * 0.12; ctx.strokeStyle = o.stroke || '#ff2bd6'; ctx.strokeText(text, 0, 0);
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = 30; }
  if (Array.isArray(fill)) { const gr = ctx.createLinearGradient(0, -size / 2, 0, size / 2); fill.forEach((c, i) => gr.addColorStop(i / (fill.length - 1), c)); ctx.fillStyle = gr; } else ctx.fillStyle = fill;
  ctx.fillText(text, 0, 0); ctx.restore();
}
const CHROME = ['#ffffff', '#c8f4ff', '#3b5fa8', '#ffe4ff', '#ffffff'];
const GOLD = ['#fffbd0', '#ffd400', '#b35c00', '#ffe680', '#fff7c0'];
// csillagkitörés-címke („NEW!”)
function starTag(x, y, r, k, t, text, col = '#fff200', tcol = '#ff2bd6', rot = -0.2) {
  if (k <= 0.01) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  ctx.save(); ctx.rotate(t * 1.2);
  ctx.beginPath(); for (let j = 0; j < 28; j++) { const rr2 = j % 2 ? r * 0.74 : r, aa = j * Math.PI / 14; ctx.lineTo(Math.cos(aa) * rr2, Math.sin(aa) * rr2); } ctx.closePath();
  ctx.fillStyle = '#1a0640'; ctx.save(); ctx.translate(10, 10); ctx.fill(); ctx.restore();
  ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = '#1a0640'; ctx.stroke(); ctx.restore();
  ctx.rotate(rot); ctx.font = `400 ${r * 0.52}px ${F90}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = tcol; ctx.fillText(text, 0, 4); ctx.restore();
}
// villogó szalag (pl. „AS SEEN ON TV-ISH”)
function banner(text, y, k, col = '#fff200', tcol = '#1a0640', rot = -0.04) {
  if (k <= 0) return;
  ctx.save(); ctx.translate(W / 2, y); ctx.rotate(rot); ctx.globalAlpha = Math.min(1, k);
  ctx.fillStyle = col; ctx.fillRect(-W, -46, W * 2 * Math.min(1, k), 92);
  ctx.font = `400 64px ${F90}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = tcol;
  ctx.fillText(text, 0, 4); ctx.restore();
}
function bubble(text, x, y, k) {
  if (k <= 0) return;
  ctx.save(); ctx.globalAlpha = Math.min(1, k * 2); ctx.font = `800 46px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width + 70, h = 96;
  ctx.fillStyle = '#1a0640'; rr(ctx, x - w / 2 + 10, y - h / 2 + 10, w, h, 40); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#1a0640'; ctx.lineWidth = 7;
  rr(ctx, x - w / 2, y - h / 2, w, h, 40); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 30, y + h / 2 - 3); ctx.lineTo(x - 55, y + h / 2 + 45); ctx.lineTo(x + 5, y + h / 2 - 3); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#1a0640'; ctx.fillText(text, x, y + 2); ctx.restore();
}
function flash(t, a, len = 0.1, col = '255,255,255') { const k = 1 - clamp((t - a) / len); if (t >= a && k > 0) { ctx.fillStyle = `rgba(${col},${0.8 * k})`; ctx.fillRect(0, 0, W, H); } }
// előtér: néhány nagy, gyorsan úszó Memphis-alakzat a kép szélén
function fgShapes(t, n = 6, alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha;
  for (let i = 0; i < n; i++) {
    const side = i % 2, x = side ? W - 80 - hash(i + 40) * 160 : 80 + hash(i + 40) * 160;
    const y = ((hash(i + 41) * H + t * (120 + hash(i + 42) * 160)) % (H + 200)) - 100;
    shape(ctx, (i * 5) % 6, x, y, 50 + hash(i + 43) * 30, t * (1 + hash(i)) * (side ? 1 : -1), NEON[(i * 2) % NEON.length], 12);
  }
  ctx.restore();
}

function overlays(t, s) {
  const c = s.cut, u = s.u;
  for (const cc of CUTS) if (cc.id !== 'static' && cc.id !== 'boring') flash(t, cc.t, 0.09);
  const v = voiceAt(t), beat = TL.beat;
  switch (c.id) {
    case 'static': {
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, 0, W, H);
      break;
    }
    case 'hey':
      txt90('HEY', W * 0.24, H * 0.26, 230, popScale(u, VT.A01 - c.t), { fill: GOLD, rot: -0.14 });
      txt90('YOU!', W * 0.76, H * 0.26, 230, popScale(u, VT.A01 - c.t + 0.3), { fill: GOLD, rot: 0.1 });
      txt90('YEAH, YOU!', W * 0.5, H * 0.84, 150, popScale(u, VT.A01 - c.t + 0.75), { fill: CHROME, stroke: '#00e5ff', rot: -0.04 });
      fgShapes(t, 6);
      break;
    case 'boring': {
      const k = clamp((u - 0.15) / 0.3);
      ctx.save(); ctx.globalAlpha = k; ctx.font = `400 120px ${F90}`; ctx.textAlign = 'center'; ctx.fillStyle = '#2e3034';
      ctx.fillText('IS YOUR DESK…', W / 2, H * 0.17); ctx.restore();
      if (u > 0.9) { ctx.save(); ctx.globalAlpha = clamp((u - 0.9) / 0.25); ctx.font = `400 200px ${F90}`; ctx.textAlign = 'center'; ctx.fillStyle = '#2e3034'; ctx.fillText('BORING?', W / 2 + Math.sin(u * 2) * 6, H * 0.9); ctx.restore(); }
      // „zzz”
      ctx.save(); ctx.font = `400 70px ${F90}`; ctx.fillStyle = 'rgba(60,62,66,0.8)';
      for (let i = 0; i < 3; i++) { const p = ((u * 0.6 + i / 3) % 1); ctx.globalAlpha = Math.sin(p * Math.PI) * k; ctx.fillText('z', W * 0.6 + p * 90 + i * 10, H * 0.5 - p * 160); }
      ctx.restore();
      break;
    }
    case 'intro':
      starTag(W * 0.2, H * 0.28, 190, popScale(u, 0.6), t, 'NEW!');
      txt90('THE', W * 0.5, H * 0.13, 80, popScale(u, VT.A03 - c.t + 0.6), { fill: '#ffffff', stroke: '#00e5ff', rot: -0.03 });
      txt90('C-CUBE!', W * 0.5, H * 0.84, 210, popScale(u, VT.A03 - c.t + 1.0), { fill: CHROME, rot: -0.05, glow: '#00e5ff' });
      starTag(W * 0.82, H * 0.3, 140, popScale(u, 1.3), -t, 'WOW!', '#00e5ff', '#1a0640', 0.15);
      fgShapes(t, 8);
      break;
    case 'talks':
      txt90('IT', W * 0.22, H * 0.25, 140, popScale(u, 0.05), { fill: GOLD, rot: -0.12 });
      txt90('TALKS!', W * 0.24, H * 0.45, 190, popScale(u, 0.2), { fill: GOLD, rot: -0.12 });
      if (v && v.src === 'cube') bubble("Let's gooooo!", W * 0.66, H * 0.18, 1);
      if (u > beat * 4) starTag(W * 0.2, H * 0.75, 130, popScale(u, beat * 4), t, 'NEW!', '#00e5ff', '#ff2bd6', -0.25);
      break;
    case 'glows':
      txt90('IT GLOWS!', W * 0.5, H * 0.17, 190, popScale(u, 0.05), { fill: ['#ffffff', `hsl(${(t * 300) % 360} 100% 70%)`, '#ffffff'], rot: -0.05, glow: '#ffffff' });
      txt90('RADICAL!', W * 0.5, H * 0.86, 170, popScale(u, beat * 2), { fill: CHROME, stroke: '#7cff4f', rot: 0.05 });
      break;
    case 'toss': {
      const W3 = ['TOSS IT!', 'DROP IT!', 'BOUNCE IT!'], ph = Math.min(2, Math.floor(u / (beat * 2)));
      txt90(W3[ph], W * [0.27, 0.73, 0.5][ph], H * [0.2, 0.2, 0.17][ph], 170, popScale(u - ph * beat * 2, 0.02), { fill: GOLD, rot: [-0.12, 0.1, -0.04][ph] });
      if (ph === 2 && u - ph * beat * 2 > beat * 1.6) txt90('EXTREME!', W * 0.72, H * 0.82, 130, popScale(u - ph * beat * 2, beat * 1.6), { fill: CHROME, stroke: '#ff7a00', rot: 0.1 });
      fgShapes(t, 6, 0.9);
      break;
    }
    case 'joke': {
      const press = VT.A07 + 0.9 - c.t;
      if (u < press + 0.6) {
        txt90('REAL WOOD', W * 0.5, H * 0.14, 120, popScale(u, 0.05), { fill: ['#ffe2b0', '#b06a2a', '#ffe2b0'], stroke: '#1a0640', rot: -0.04 });
        txt90('BUTTON!', W * 0.5, H * 0.87, 140, popScale(u, 0.3), { fill: ['#ffe2b0', '#b06a2a', '#ffe2b0'], stroke: '#1a0640', rot: 0.03 });
      }
      if (v && v.src === 'cube') bubble(CUBE_TEXT[v.id], W * 0.5, H * 0.16, 1);
      const pl = VT.joke_8a + 0.9 - c.t;
      if (u > pl) { txt90('HA!', W * 0.82, H * 0.32, 170, popScale(u, pl), { fill: GOLD, rot: 0.15 }); txt90('HA!', W * 0.18, H * 0.64, 130, popScale(u, pl + 0.15), { fill: GOLD, rot: -0.15 }); }
      break;
    }
    case 'flip': {
      const fl = VT.A08 + 1.0 - c.t;
      txt90('NEED PRIVACY?', W * 0.5, H * 0.15, 130, popScale(u, 0.05), { fill: CHROME, stroke: '#00e5ff', rot: -0.04 });
      if (u > fl + 0.5) { txt90('FLIP IT!', W * 0.5, H * 0.85, 170, popScale(u, fl + 0.5), { fill: CHROME, rot: 0.04, glow: '#ff2bd6' }); starTag(W * 0.84, H * 0.48, 120, popScale(u, fl + 0.7), t, 'BAM!', '#ff2bd6', '#fff200', 0.2); }
      break;
    }
    case 'persona': {
      const n = (c.end - c.t) / 4, i = Math.min(3, Math.floor(u / n));
      txt90('4 RADICAL PERSONALITIES!', W * 0.5, H * 0.12, 96, popScale(u, 0.02), { fill: '#ffffff', stroke: '#1a0640', rot: -0.03 });
      const L2 = ['SUNNY', 'CHILL', 'HYPE', 'SARCASTIC'][i];
      txt90(L2, W * (i % 2 ? 0.76 : 0.24), H * 0.62, 150, popScale(u - i * n, 0.02), { fill: GOLD, rot: i % 2 ? 0.1 : -0.1 });
      break;
    }
    case 'tastic': {
      const k1 = popScale(u, 0.05), k2 = popScale(u, 0.45);
      txt90('TOTALLY', W * 0.5, H * 0.17, 170, k1, { fill: GOLD, rot: -0.06 + Math.sin(t * 6) * 0.02 });
      txt90('CUBE-TASTIC!', W * 0.5, H * 0.83, 210, k2, { fill: CHROME, rot: 0.04 + Math.sin(t * 7) * 0.02, glow: '#ff2bd6', stroke: '#ff2bd6' });
      fgShapes(t * 1.6, 10);
      break;
    }
    case 'call': {
      txt90('CALL NOW!', W * 0.66, H * 0.2, 200, popScale(u, 0.05), { fill: GOLD, rot: -0.05 + (Math.floor(t * 4) % 2) * 0.02 });
      const k = popScale(u, beat);
      if (k > 0) {
        ctx.save(); ctx.translate(W * 0.66, H * 0.52); ctx.scale(k, k);
        ctx.fillStyle = '#1a0640'; rr(ctx, -470 + 12, -80 + 12, 940, 160, 26); ctx.fill();
        ctx.fillStyle = Math.floor(t * 3) % 2 ? '#fff200' : '#00e5ff'; rr(ctx, -470, -80, 940, 160, 26); ctx.fill();
        ctx.lineWidth = 8; ctx.strokeStyle = '#1a0640'; ctx.stroke();
        ctx.font = `400 110px ${F90}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#1a0640';
        ctx.fillText('1-800-555-CUBE', 0, 6); ctx.restore();
      }
      banner('OPERATORS ARE STANDING BY!', H * 0.83, (u - 1.0) / 0.25, '#ff2bd6', '#ffffff', 0.02);
      break;
    }
    case 'end': {
      const k = ease(u, 0.05, 0.4);
      txt90('C-CUBE', W * 0.29, H * 0.25, 210, popScale(u, 0.05), { fill: CHROME, rot: -0.05, glow: '#00e5ff' });
      ctx.save(); ctx.globalAlpha = k; ctx.font = `400 64px ${F90}`; ctx.textAlign = 'center'; ctx.fillStyle = '#fff200';
      ctx.shadowColor = '#ff2bd6'; ctx.shadowBlur = 0; ctx.fillStyle = '#1a0640'; ctx.fillText('AVAILABLE WHEREVER', W * 0.29 + 5, H * 0.47 + 5); ctx.fillText('COOL STUFF IS SOLD!*', W * 0.29 + 5, H * 0.56 + 5);
      ctx.fillStyle = '#fff200'; ctx.fillText('AVAILABLE WHEREVER', W * 0.29, H * 0.47); ctx.fillStyle = '#00e5ff'; ctx.fillText('COOL STUFF IS SOLD!*', W * 0.29, H * 0.56);
      ctx.restore();
      if (u > 0.5) starTag(W * 0.52, H * 0.13, 105, popScale(u, 0.5), t, 'NEW!');
      break;
    }
  }
}

// apróbetű a záróképen – a bemondó hadarva felolvassa; a VHS-utómunka UTÁN rajzolva, hogy olvasható maradjon
function finePrint(t) {
  const fp = ease(t, VT.A13 - 0.2, VT.A13 + 0.1);
  if (fp <= 0) return;
  ctx.save(); ctx.globalAlpha = fp; ctx.fillStyle = 'rgba(10,4,30,0.86)'; ctx.fillRect(0, H - 176, W, 176);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.font = `600 31px ${FONT}`; ctx.fillStyle = '#ffffff';
  ctx.fillText('*Concept product. Not actually for sale. Not sold anywhere, cool or otherwise.', 60, H - 122);
  ctx.fillText('Cube may become sarcastic. Batteries sold separately.  ;)', 60, H - 80);
  ctx.font = `500 27px ${FONT}`; ctx.fillStyle = '#c9c0ff';
  ctx.fillText('(Koncepciótermék, nem kerül forgalomba.)', 60, H - 36);
  ctx.restore();
}

// ---------------------------------------------------------------- VHS-utómunka: az egész képre, a feliratokkal együtt
const vhsSmall = document.createElement('canvas'); vhsSmall.width = 768; vhsSmall.height = 432;
const vsx = vhsSmall.getContext('2d');
const chan = [0, 1, 2].map(() => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; });
const scan = (() => { const c = document.createElement('canvas'); c.width = 4; c.height = 6; const g = c.getContext('2d'); g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(0, 0, 4, 2); g.fillStyle = 'rgba(255,255,255,0.03)'; g.fillRect(0, 3, 4, 1); return ctx.createPattern(c, 'repeat'); })();
// a sávzaj („tracking”) erőssége: a vágásoknál felvillan, a legelején és a végén erős
function trackingAt(t) {
  let k = 0.12;
  for (const cc of CUTS) { const d = t - cc.t; if (d >= 0 && d < 0.12) k = Math.max(k, 0.7 * (1 - d / 0.12)); }
  if (t < 0.9) k = Math.max(k, 1 - t / 0.9);
  if (t > TL.duration - 0.7) k = Math.max(k, (t - (TL.duration - 0.7)) / 0.7);
  return k;
}
function vhs(t, s) {
  // 1) puhább, „szalagos” kép: kisebb felbontásra, majd vissza
  vsx.drawImage(out, 0, 0, 768, 432);
  // 2) színcsatornák szétválasztása és eltolása (a vörös balra, a kék jobbra)
  const tr = trackingAt(t), shift = 5 + tr * 14;
  const cols = ['#ff0000', '#00ff00', '#0000ff'], dx = [-shift, 0, shift * 0.7];
  chan.forEach((cv, i) => {
    const g = cv.getContext('2d'); g.globalCompositeOperation = 'source-over'; g.drawImage(vhsSmall, 0, 0, W, H);
    g.globalCompositeOperation = 'multiply'; g.fillStyle = cols[i]; g.fillRect(0, 0, W, H);
  });
  ctx.save(); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'lighter';
  chan.forEach((cv, i) => ctx.drawImage(cv, dx[i], 0));
  ctx.restore();
  // 3) vízszintes „rángás” egy sávban + fehér zajcsíkok
  const bandY = ((t * 0.37) % 1.3 - 0.15) * H, bandH = 40 + tr * 160;
  const jit = (Math.sin(t * 91) + Math.sin(t * 37)) * (6 + tr * 50);
  ctx.drawImage(out, 0, bandY, W, bandH, jit, bandY, W, bandH);
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 6 + tr * 30; i++) {
    const yy = bandY + hash(i + Math.floor(t * 30) * 13) * bandH, xx = hash(i * 3 + Math.floor(t * 30)) * W;
    ctx.fillStyle = `rgba(255,255,255,${0.15 + 0.5 * hash(i + 5 + Math.floor(t * 30))})`; ctx.fillRect(xx, yy, 60 + hash(i + 9) * 400, 2);
  }
  if (tr > 0.3) { const ny = H - 70 - tr * 80; ctx.fillStyle = `rgba(255,255,255,${0.25 * tr})`; for (let x = 0; x < W; x += 6) ctx.fillRect(x, ny + hash(x + Math.floor(t * 30)) * 30, 4, 2); }
  ctx.restore();
  // 4) szkenvonalak, enyhe színfakulás, sarok-vignetta
  ctx.save(); ctx.fillStyle = scan; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = 'rgba(255,170,220,0.12)'; ctx.fillRect(0, 0, W, H);
  ctx.restore();
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.5, W / 2, H / 2, H * 1.0);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.5)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  // 5) a videómagnó képernyő-kijelzése: PLAY, SP, időbélyeg, számláló
  ctx.save(); ctx.font = `700 52px ${VCR}`; ctx.textBaseline = 'top'; ctx.fillStyle = '#ffffff'; ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowOffsetX = 4; ctx.shadowOffsetY = 4;
  if (t < 3.2 && Math.floor(t * 2) % 2 === 0) ctx.fillText('PLAY ▶', 70, 56);
  ctx.textAlign = 'right'; ctx.fillText('SP', W - 70, 56);
  const sec = 42 * 60 + 37 + Math.floor(t), clock = `PM 7:${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
  ctx.textAlign = 'left'; ctx.font = `700 46px ${VCR}`; ctx.fillText(clock, 70, H - 160);
  ctx.fillText('NOV.17 1996', 70, H - 108);
  ctx.textAlign = 'right'; ctx.fillText(`0:00:${String(Math.floor(t)).padStart(2, '0')}`, W - 70, H - 108);
  ctx.restore();
  if (s.gray) { ctx.save(); ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = '#808080'; ctx.globalAlpha = 0.85; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  if (s.cut.id === 'end') finePrint(t);
}

function renderAt(t) {
  const s = stateAt(t);
  drawBg(s.bg, t);
  camera.position.copy(s.cam.pos); camera.lookAt(s.cam.target);
  camera.fov = s.cam.fov || 32; camera.updateProjectionMatrix();
  cubeRoot.position.copy(s.root); cube.rotation.copy(s.rot);
  cube.visible = !s.inside && !s.hidden; inside.visible = s.inside;
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
  const sh = (s.shake || 0) * 26;
  ctx.drawImage(renderer.domElement, sh ? Math.sin(t * 97) * sh : 0, sh ? Math.cos(t * 83) * sh : 0, W, H);
  // finom vignetta
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.05);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.15)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  overlays(t, s);
  if (s.fade < 1) { ctx.fillStyle = `rgba(0,0,0,${1 - s.fade})`; ctx.fillRect(0, 0, W, H); }
  vhs(t, s);
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
