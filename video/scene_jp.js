// GENERÁLT FÁJL – ne szerkeszd kézzel. Forrás: video/scene.js + video/jp/scene_jp_part.js (tools/build_jp_scene.js)
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
const TL = await (await fetch('jp/timeline_jp.json')).json();
const DUR = await (await fetch('jp/durations_jp.json')).json();
const JP_LINES = await (await fetch('jp/lines_jp.json')).json();
const CUBE_TEXT = Object.fromEntries((await (await fetch('../web/voice/lines.json')).json()).map(l => [l.id, l.text]));
const LINES = [...JP_LINES.map(l => ({ id: l.id, text: l.ja, style: 'narrator' })), ...Object.entries(CUBE_TEXT).map(([id, text]) => ({ id, text, style: 'cube' }))];
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

function renderAt(t) {
  const s = stateAt(t);
  drawBg(s.bg, t);
  camera.position.copy(s.cam.pos); camera.lookAt(s.cam.target);
  camera.fov = s.cam.fov || 32; camera.updateProjectionMatrix();
  cubeRoot.position.copy(s.root); cube.rotation.copy(s.rot);
  cube.visible = !s.inside; inside.visible = s.inside;
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
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.18)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  overlays(t, s);
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
