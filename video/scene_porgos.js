// GENERÁLT FÁJL – ne szerkeszd kézzel. Forrás: video/scene.js + video/catmode/cat_shared.js + video/porgos/scene_porgos_part.js (tools/build_porgos.js)
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
const TL = await (await fetch('timeline.json')).json();
const DUR = await (await fetch('voice/durations.json')).json();
const LINES = await (await fetch('lines.json')).json();
const BODIES = await (await fetch('../web/model/bodies.json')).json();
const IMG = {
  fusionIso: await loadImg('../assets/fusion/iso-top-right.png'),
  build: await Promise.all(Array.from({ length: 51 }, (_, i) => loadImg(`fusion_build/build_${String(i + 1).padStart(3, '0')}.png`))),
};
// a robbantott ábra időzítése az N08 mondathoz: egy szó kezdete ≈ a mondat kezdete + hossz × (karakterhely / szöveghossz)
const EX = (() => {
  const v = TL.voices.find(x => x.id === 'N08'), text = LINES.find(l => l.id === 'N08').text, d = DUR.N08;
  const word = w => v.t + d * Math.max(0, text.indexOf(w)) / text.length;
  const a = v.t, c = Math.min(word('Why?'), 67.0);
  return { a, b: a + 1.7, c, d: Math.min(c + 1.4, 68.2), word };
})();
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

// ---------------------------------------------------------------- az idő -> állapot
function stateAt(t) {
  const s = {
    cam: orbit(0.5, 22, 8), fov: 32,
    root: V3(0, 4, 0), rot: new THREE.Euler(0, 0, 0),
    cColor: (p, t) => C(0xffd9a8).multiplyScalar(1.1), ringColor: (p, t) => C(0xffd9a8).multiplyScalar(0.9),
    glowColor: C(0xffd9a8), glowI: 0.55,
    face: { mode: 'face', t, smile: 1, blink: 0 },
    corner: C(0xff8020), patch: 0, led: 0, btn: 0, finger: null, ripple: null, fade: 1,
    inside: false, explode: 0,
  };
  // pislogás alapból
  const bl = (t * 0.37) % 1; s.face.blink = bl > 0.96 ? Math.sin((bl - 0.96) / 0.04 * Math.PI) : 0;
  // beszéd: a kocka szája mozog, ha ő beszél
  const v = voiceAt(t);
  const talking = v && v.line.style !== 'narrator';
  const talkAmp = 0.35 + 0.65 * Math.abs(Math.sin(t * 17) * Math.sin(t * 6.3 + 1));
  const warm = C(0xffb878), breathe = 0.75 + 0.25 * Math.sin(t * 1.6);

  // ===== 1. Ébredés (0–15.5)
  if (t < 15.5) {
    s.cam = orbit(0.28 - t * 0.008, lerp(25, 19, ease(t, 0, 15)), 6.2, V3(0, 3.8, 0));
    const sweep = ease(t, 0.5, 2.0);
    s.cColor = (p) => (p <= sweep ? warm.clone().multiplyScalar(1.25) : C(0x000000));
    const r = ease(t, 1.0, 2.6);
    s.ringColor = () => warm.clone().multiplyScalar(r);
    s.glowI = 0.6 * r; s.glowColor = warm;
    if (t < 2.0) s.face = { mode: 'off' };
    else {
      s.face.blink = Math.max(s.face.blink, 1 - ease(t, 2.0, 2.5));
      if (talking) { s.face.mouth = 'talk'; s.face.talk = talkAmp; }
      if (inR(t, 6.5, 12.5)) { s.face.eyeScale = 1.12; s.face.sparkle = true; }
      if (inR(t, 12.7, 13.9)) { s.face.lookX = -0.7; s.face.lookY = 0.3; }
    }
    s.fade = ease(t, 0, 0.6);
  }
  // ===== 2. Ki ez? (15.5–24)
  else if (t < 24) {
    s.cam = orbit(-0.35 + (t - 15.5) * 0.16, 21, 8.5, V3(0, 3.6, 0));
    s.ringColor = (p, tt) => hsl(p + tt * 0.08, 0.9, 0.55);
    s.glowColor = hsl(t * 0.08, 0.9, 0.55); s.glowI = 0.75;
    s.cColor = () => warm.clone().multiplyScalar(0.85 + 0.4 * breathe);
  }
  // ===== 3. Hogyan készült? (24–55.5)
  else if (t < 55.5) {
    s.cam = orbit(-0.5 + (t - 24) * 0.05, 26, 9, V3(0, 3.6, 0));
    s.cColor = () => warm.clone().multiplyScalar(0.85 + 0.4 * breathe);
    if (inR(t, 40.5, 46)) { // hiba és javítás: oldalnézet
      s.cam = shot(V3(17, 7.5, 6), V3(2, 3.8, 0));
      s.patch = 1 - ease(t, 43.4, 44.0);
    }
    if (inR(t, 46, 52)) { // Fusion MCP átnézés, a sarkok kiszínezése
      s.cam = orbit(0.75 + (t - 46) * 0.05, 20, 11, V3(0, 3.6, 0));
      s.corner = C(0x111111).lerp(C(0xff8020), ease(t, 48.6, 49.4));
    }
  }
  // ===== 4. Közelről (55.5–69)
  else if (t < 69) {
    s.cColor = () => warm.clone().multiplyScalar(0.85 + 0.4 * breathe);
    if (t < EX.a) s.cam = shot(V3(lerp(1.5, 0.5, seg(t, 55.5, EX.a)), 4.6, 12.5), V3(0, 4, 0));
    else if (t < EX.d) {
      // robbantott ábra: a gyártható modell belseje, a feliratok a narrációhoz időzítve
      const e = ease(t, EX.a + 0.15, EX.b) * (1 - ease(t, EX.c, EX.d));
      s.explode = e; s.inside = true;
      s.root = V3(0, 4 + 5.6 * e, 0);
      const ang = lerp(0.62, 0.98, seg(t, EX.a, EX.d));
      s.cam = orbit(ang, lerp(17, 43, e), lerp(7.5, 21, e), V3(0, 4 + 6.3 * e, 0));
      s.led = 1;
      if (t >= EX.word('RGB') - 0.2) { s.ringColor = (p, tt) => hsl(p + tt * 0.5, 1, 0.55); s.glowColor = hsl(t * 0.5, 1, 0.55); s.glowI = 1.1; }
    } else s.cam = shot(V3(lerp(-9.5, -7.8, seg(t, EX.d, 69)), lerp(10.5, 9.8, seg(t, EX.d, 69)), lerp(9.5, 7.8, seg(t, EX.d, 69))), V3(-3.6, 7.6, 3.6));
  }
  // ===== 5. Szórakoztat (69–117)
  else if (t < 117) {
    s.cam = orbit(0.4, 21, 8);
    if (inR(t, 70.5, 79)) { // party
      const beat = t / BEAT, ph = beat % 1, pulse = Math.exp(-ph * 5);
      const hue = Math.floor(beat) * 0.17;
      s.cam = orbit(-0.45 + (t - 70.5) * 0.1, 19 - 1.2 * pulse, 7);
      s.cColor = (p) => hsl(hue + p * 0.3, 1, 0.5).multiplyScalar(0.6 + pulse * 0.9);
      s.ringColor = (p) => hsl(hue + 0.5 + p, 1, 0.5).multiplyScalar(0.5 + pulse);
      s.glowColor = hsl(hue + 0.5, 1, 0.55); s.glowI = 0.6 + pulse * 0.9;
      const levels = Array.from({ length: 7 }, (_, i) => clamp(0.3 + 0.7 * Math.abs(Math.sin(t * (3 + i * 1.7) + i)) * (0.5 + pulse * 0.5)));
      s.face = { mode: 'eq', levels, t };
    } else if (inR(t, 79, 89)) { // Andor
      const press = inR(t, 79.0, 80.3);
      if (t < 80.3) {
        s.cam = shot(V3(-6.5, 15.5, 9), V3(-2.3, 8.1, 2.3));
        const dn = ease(t, 79.1, 79.6) * (1 - ease(t, 79.85, 80.25));
        s.finger = { pos: V3(-2.3, 8.2 + 1.9 + (1 - dn) * 2.5, 2.3), tilt: 0.25 };
        s.btn = dn;
      } else {
        s.cam = shot(V3(1.2, 5.2, lerp(15, 13, seg(t, 80.3, 89))), V3(0, 4, 0));
        if (talking) { s.face.mouth = 'talk'; s.face.talk = talkAmp; }
        if (t > 85.2) { s.face.mouth = 'grin'; s.face.lidL = 0.45; s.face.lidR = 0.45; }
      }
      s.cColor = () => C(0xc8894f).multiplyScalar(1.1);
    } else if (inR(t, 89, 97.5)) { // leskelődés
      if (t < 94.4) {
        s.cam = shot(V3(-11, 7, 16), V3(0, 4, 0));
        const st = ease(t, 90.2, 93.2);
        s.face.lookX = lerp(0.9, -0.55, st); s.face.lookY = lerp(-0.2, 0.05, st); s.face.smile = lerp(0.6, 0.2, st);
      } else {
        s.cam = shot(V3(-2.5, 4.6, 10.5), V3(0, 4, 0));
        s.face.lookX = 1; s.face.lookY = -0.35; s.face.mouth = 'o'; s.face.blink = 0;
      }
      s.cColor = () => C(0x8fa3ff).multiplyScalar(0.9);
    } else if (inR(t, 97.5, 108)) { // dobás
      s.cam = shot(V3(0, 8, 36), V3(0, 5, 0));
      if (t < 99.2) {
        const k = seg(t, 97.5, 99.2);
        s.root = V3(lerp(-17, 0, k), 4 + 6.5 * Math.sin(Math.PI * k), 0);
        s.rot = new THREE.Euler(k * 4.2, k * 2.3, k * 5.1);
      } else {
        const k = t - 99.2;
        const hop = Math.abs(Math.sin(k * 6)) * 2.2 * Math.exp(-k * 4);
        s.root = V3(0, 4 + hop, 0);
        const wob = Math.sin(k * 14) * 0.35 * Math.exp(-k * 3.5);
        s.rot = new THREE.Euler(wob, 0, wob * 0.6);
        s.face = { mode: 'dizzy', t };
        if (t > 104.5) s.face = { mode: 'face', t, mouth: talking ? 'talk' : 'flat', talk: talkAmp, lidL: 0.35, lidR: 0.35 };
        if (inR(t, 101.6, 104.6)) s.face = { mode: 'dizzy', t };
      }
      s.ringColor = (p, tt) => hsl(p - tt * 1.5, 1, 0.55); s.glowColor = hsl(-t * 1.5, 1, 0.55); s.glowI = 0.9;
      s.cColor = (p, tt) => hsl(p + tt, 1, 0.55);
    } else if (inR(t, 108, 117)) { // Shake to Decide
      s.cam = shot(V3(2, 5.5, 15), V3(0, 4, 0));
      if (inR(t, 110, 112.2)) {
        const k = (t - 110);
        s.rot = new THREE.Euler(Math.sin(k * 41) * 0.12, Math.sin(k * 37) * 0.1, Math.sin(k * 45) * 0.14);
        s.root = V3(Math.sin(k * 33) * 0.4, 4 + Math.abs(Math.sin(k * 29)) * 0.5, 0);
        s.face = { mode: 'swirl', t };
      } else if (t >= 112.2) {
        s.face = { mode: 'text', text: 'YES', color: '#5cf28a', size: 170, bright: ease(t, 112.2, 112.7), sub: t > 112.8 ? 'Obviously.' : null };
        const f = Math.exp(-Math.max(0, t - 112.3) * 1.2);
        s.cColor = () => C(0x3ef07a).multiplyScalar(0.6 + f);
        s.ringColor = () => C(0x3ef07a).multiplyScalar(0.5 + f * 0.6); s.glowColor = C(0x3ef07a); s.glowI = 0.6 + f;
      }
    }
  }
  // ===== 6. Segít (117–138)
  else if (t < 138) {
    s.cam = orbit(0.35, 20, 7.5);
    if (inR(t, 118.5, 124.5)) { // ne zavarj
      s.cam = shot(V3(9, 9, 17), V3(0, 3, 0));
      s.face = { mode: 'dnd', color: '#9fb8ff', bright: 0.8 };
      s.cColor = () => C(0x6d7fd9).multiplyScalar(0.25); s.ringColor = () => C(0x6d7fd9).multiplyScalar(0.15); s.glowI = 0.15; s.glowColor = C(0x6d7fd9);
      for (const vt of [119.6, 121.0]) if (inR(t, vt, vt + 0.5)) { const k = t - vt; s.root = V3(Math.sin(k * 190) * 0.05, 4, Math.cos(k * 170) * 0.04); }
      for (const vt of [119.6, 121.0]) if (inR(t, vt, vt + 1.6)) s.ripple = t - vt;
    } else if (inR(t, 124.5, 132.5)) { // telefon
      s.cam = shot(V3(1.5, 5.5, 19), V3(4.2, 4, 0));
      s.face = { mode: 'call', color: '#5cf28a', t };
      const p = 0.5 + 0.5 * Math.sin(t * 8);
      s.cColor = () => C(0x3ef07a).multiplyScalar(0.4 + p * 0.8); s.ringColor = () => C(0x3ef07a).multiplyScalar(0.3 + p * 0.5); s.glowColor = C(0x3ef07a); s.glowI = 0.5 + p * 0.4;
    } else if (inR(t, 132.5, 138)) { // felvidít
      s.cam = shot(V3(0.8, 4.8, lerp(13.5, 12, seg(t, 132.5, 138))), V3(0, 4, 0));
      if (t < 133.6) { s.face.mouth = 'worried'; s.face.brow = [0.6, 0.6]; s.face.lookY = 0.1; }
      else { s.face.mouth = talking ? 'talk' : 'smile'; s.face.talk = talkAmp; s.face.eyeScale = 1.1; s.face.sparkle = true; }
      s.cColor = () => C(0xffc46b).multiplyScalar(1.1);
    }
  }
  // ===== 7. Vigyáz rád (138–147)
  else if (t < 147) {
    s.cam = shot(V3(10, 10, 22), V3(0, 4, 0));
    if (t >= 139.5) {
      const k = ease(t, 139.5, 141.0);
      s.root = V3(0, 4 + Math.sin(Math.PI * k) * 5, 0);
      s.rot = new THREE.Euler(Math.PI * k, 0, 0);
      const off = 1 - ease(t, 141.0, 142.5);
      s.cColor = () => warm.clone().multiplyScalar(1.1 * off); s.ringColor = () => warm.clone().multiplyScalar(0.9 * off); s.glowI = 0.55 * off;
      s.face.bright = off; s.led = 0;
      if (off <= 0) s.face = { mode: 'off' };
    }
  }
  // ===== 8. Személyiségek (147–160)
  else if (t < 160) {
    const P = [
      [147.0, 149.8, '#ffd9a8', 0xffd9a8, { smile: 1, eyeScale: 1.1, sparkle: true }],
      [149.8, 153.4, '#7fb0ff', 0x5a8cff, { lidL: 0.55, lidR: 0.55, smile: 0.5 }],
      [153.4, 154.9, '#ffa040', 0xff7a1a, { eyeScale: 1.3, mouth: 'grin' }],
      [154.9, 157.5, '#c79bff', 0x9b5cff, { brow: [0, 0.9], mouth: 'flat', lidL: 0.3 }],
    ];
    const cur = P.find(p => inR(t, p[0], p[1]));
    if (cur) {
      const [, , fc, lc, extra] = cur;
      const idx = P.indexOf(cur);
      s.cam = [shot(V3(2.5, 5, 13), V3(0, 4, 0)), shot(V3(-3, 4.4, 12.5), V3(0, 4, 0)), shot(V3(0, 4.2, 10.5 + Math.sin(t * 40) * 0.12), V3(0, 4, 0)), shot(V3(4, 5.6, 12), V3(0, 4, 0))][idx];
      s.face = Object.assign({ mode: 'face', t, color: fc, blink: s.face.blink }, extra);
      if (talking && extra.mouth !== 'grin') { s.face.mouth = 'talk'; s.face.talk = talkAmp; }
      const col = C(lc);
      if (idx === 1) { s.cColor = (p, tt) => col.clone().multiplyScalar(0.6 + 0.4 * Math.sin(p * 6 - tt * 2)); s.ringColor = (p, tt) => col.clone().multiplyScalar(0.5 + 0.4 * Math.sin(p * 12 - tt * 2)); }
      else if (idx === 2) { s.cColor = (p, tt) => col.clone().multiplyScalar(0.5 + Math.max(0, Math.sin(p * 20 - tt * 25))); s.ringColor = (p, tt) => col.clone().multiplyScalar(0.4 + Math.max(0, Math.sin(p * 30 - tt * 25))); }
      else { s.cColor = () => col.clone().multiplyScalar(1.1); s.ringColor = () => col.clone().multiplyScalar(0.9); }
      s.glowColor = col; s.glowI = 0.8;
    } else s.cam = orbit(0.4, 22, 8);
  }
  // ===== 9. Zárás (160–176)
  else {
    s.cam = shot(V3(-6.5, 8, lerp(29, 32, seg(t, 160, 176))), V3(-6.5, 3.6, 0));
    s.rot = new THREE.Euler(0, 0.35 * Math.sin((t - 160) * 0.4), 0);
    s.cColor = () => warm.clone().multiplyScalar(0.85 + 0.4 * breathe); s.ringColor = () => warm.clone().multiplyScalar(breathe);
    s.glowI = 0.5 * breathe;
    if (inR(t, 170.4, 171.1)) s.face.wink = Math.sin(seg(t, 170.4, 171.1) * Math.PI);
    if (talking) { s.face.mouth = 'talk'; s.face.talk = talkAmp; }
    s.fade = 1 - ease(t, 174, 176);
  }
  return s;
}

// ---------------------------------------------------------------- egy képkocka
function overlays(t) {
  // 1.
  title(t, 13.0, 15.5, 'C-Cube', 'desktop AI assistant', 0.35);
  // 2.
  caption(t, 17.0, 23.6, '9 × 9 × 9 cm', 'voice control · RGB lights · always cheerful');
  // 3.
  chat(t, 24.0, 29.2, [
    { me: true, text: 'I got a task and could use some help… any good ideas?' },
    { me: false, text: 'Four ideas: … ⭐ C-Cube – a desktop AI assistant with a glowing letter C.' },
  ]);
  chat(t, 29.2, 33.3, [
    { me: true, text: 'I like the C-Cube idea, but we also have to design it' },
    { me: false, text: 'I wrote the concept and a Fusion 360 script that builds the model.' },
  ]);
  windowFrame(t, 33.3, 40.5, 'Autodesk Fusion – running CKocka.py', (x, y, w, h) => {
    const i = Math.min(50, Math.floor(seg(t, 33.7, 39.6) * 51));
    ctx.drawImage(IMG.build[i], x, y, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; rr(ctx, x + w - 330, y + h - 80, 300, 56, 12); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `700 28px ${FONT}`; ctx.textBaseline = 'middle'; ctx.fillText(`step ${i + 1} / 51`, x + w - 300, y + h - 52);
  });
  caption(t, 34.0, 40.2, 'A 3D model built from code', 'Fusion 360 · Python script · 51 steps');
  if (inR(t, 41.2, 43.6)) { // hibajelölés
    const k = ease(t, 41.2, 41.5);
    ctx.save(); ctx.strokeStyle = '#ff4d4d'; ctx.lineWidth = 10; ctx.globalAlpha = k;
    ctx.beginPath(); ctx.ellipse(1110, 470, 260 * k, 250 * k, 0, 0, 7); ctx.stroke(); ctx.restore();
  }
  caption(t, 41.2, 43.6, 'Bug: the speaker grille is missing', 'in the first version the whole side panel sank in');
  caption(t, 43.8, 46.0, 'Fixed ✓', 'we found the bug together');
  terminal(t, 46.2, 52.0, [
    '> fusion_mcp_read  document.open',
    '  active document: C-kocka ✓',
    '> fusion_mcp_execute  inspect_ckocka.py',
    '  24 bodies · 51 timeline items · 0 errors ✓',
    '> fusion_mcp_read  screenshot iso-top-right',
    '  suggestion: make the corners orange 🟠',
  ]);
  caption(t, 49.6, 52.0, 'Fusion MCP', 'the AI reviews the model by itself');
  windowFrame(t, 52.0, 55.5, 'NAPLO.md – the project log', (x, y, w, h) => {
    ctx.fillStyle = '#15171c'; ctx.fillRect(x, y, w, h);
    const rows = [
      ['h1', '# Log – AI Challenge: C-Cube'],
      ['h2', '## Kick-off and choosing a topic'], ['p', 'Example prompt: “I got a task and could use some help…”'],
      ['h2', '## Design'], ['p', 'Stuck #2: no Blender on the PC → modelling from code'],
      ['h2', '## Switching to Fusion 360'], ['p', 'Stuck #4: speaker grille missing → addWithoutEdges'],
      ['h2', "## Fusion's official MCP"], ['p', 'Lesson: if the AI says “there is no such thing”, ask where it looked'],
      ['h2', '## Making the video'], ['p', 'Stuck: headless Edge would not start from Bash → PowerShell'],
      ['h2', '## This website'], ['p', 'GitHub Pages · interactive 3D cube · downloads'],
    ];
    const scroll = ease(t, 52.6, 55.2) * 260;
    rows.forEach(([k, txt], i) => {
      const yy = y + 70 + i * 62 - scroll;
      if (yy < y + 20 || yy > y + h - 20) return;
      ctx.font = k === 'h1' ? `800 46px ${FONT}` : k === 'h2' ? `700 36px ${FONT}` : `500 30px ${FONT}`;
      ctx.fillStyle = k === 'p' ? '#c9ccd1' : k === 'h1' ? '#fff' : ACC;
      ctx.textBaseline = 'middle'; ctx.fillText(txt, x + 70, yy);
    });
  });
  caption(t, 52.4, 55.4, 'Work log', 'tools · example prompts · where we got stuck and how we got out');
  // 4.
  caption(t, 55.7, EX.a, 'Round LCD display and glowing C');
  caption(t, EX.a + 0.2, EX.a + 2.8, 'Inside', 'the manufacturable 90 mm model', true);   // a robbantott ábra címkéi: insideLabels()
  caption(t, EX.d + 0.1, 68.8, 'Orange rubber corners', 'you will see why in a moment 😏');
  // 5.
  title(t, 69.0, 70.6, 'ENTERTAINS');
  caption(t, 71.6, 78.8, '🎵 Party mode', 'the lights dance to the music');
  caption(t, 86.0, 88.9, '🌳 Andor, the dad-joke button', '4 buttons · any sound · one just for (wooden) dad jokes');
  caption(t, 95.0, 97.4, '👀 Sometimes it watches you.', 'Look back, and it denies everything.');
  caption(t, 103.5, 107.9, '🤾 Bad day? Throw it!', 'the orange rubber corners can take it');
  if (inR(t, 108.2, 110.6)) {
    const k = ease(t, 108.2, 108.5) * (1 - ease(t, 110.3, 110.6));
    ctx.save(); ctx.globalAlpha = k; ctx.font = `700 54px ${FONT}`; ctx.textAlign = 'center';
    const txt = '“Should I get another coffee?”', w = ctx.measureText(txt).width + 80;
    ctx.fillStyle = 'rgba(58,42,28,0.92)'; rr(ctx, W / 2 - w / 2, 110, w, 100, 24); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(txt, W / 2, 178); ctx.restore();
  }
  caption(t, 114.0, 116.9, '🎱 Shake to Decide', 'shake it, and it decides for you');
  // 6.
  title(t, 117.0, 118.6, 'HELPS');
  caption(t, 119.0, 124.4, '📳 Do Not Disturb mode', 'it only vibrates gently');
  phone(t, 125.0, 132.3, (x, y, w, h) => {
    ctx.fillStyle = '#10261a'; rr(ctx, x, y, w, h, 36); ctx.fill();
    ctx.textAlign = 'center'; ctx.fillStyle = '#9fe8b9'; ctx.font = `600 24px ${FONT}`; ctx.fillText('ᛒ  C-Cube connected', x + w / 2, y + 90);
    const p = 1 + 0.06 * Math.sin(t * 8);
    ctx.fillStyle = '#3ef07a'; ctx.beginPath(); ctx.arc(x + w / 2, y + 250, 80 * p, 0, 7); ctx.fill();
    ctx.fillStyle = '#062010'; ctx.font = `800 48px ${FONT}`; ctx.fillText('BRO', x + w / 2, y + 266);
    ctx.fillStyle = '#fff'; ctx.font = `700 40px ${FONT}`; ctx.fillText('BRO', x + w / 2, y + 400);
    ctx.fillStyle = '#9fe8b9'; ctx.font = `500 26px ${FONT}`; ctx.fillText('calling through the cube…', x + w / 2, y + 446);
    ctx.fillStyle = '#e04444'; ctx.beginPath(); ctx.arc(x + w / 2 - 80, y + h - 110, 42, 0, 7); ctx.fill();
    ctx.fillStyle = '#3ef07a'; ctx.beginPath(); ctx.arc(x + w / 2 + 80, y + h - 110, 42, 0, 7); ctx.fill();
    ctx.textAlign = 'left';
  });
  caption(t, 125.4, 132.2, '📱 App · Bluetooth · speakerphone');
  caption(t, 133.8, 137.8, '😊 Cheers you up', 'it notices when you are having a bad day');
  // 7.
  title(t, 138.0, 139.6, 'LOOKS AFTER YOU');
  caption(t, 142.4, 146.8, '🔒 Privacy in one move', 'upside down: microphone and camera off · no images go to the cloud');
  // 8.
  if (inR(t, 147.0, 160)) {
    const k = ease(t, 147.0, 147.4) * (1 - ease(t, 159.6, 160));
    ctx.save(); ctx.globalAlpha = k; ctx.font = `700 46px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
    ctx.fillText('Pick a personality – or build your own', W / 2, 110); ctx.restore();
  }
  const pers = [[147.0, 149.8, '☀️ Sunny'], [149.8, 153.4, '🧘 Chill'], [153.4, 154.9, '🔥 Hype'], [154.9, 157.5, '😏 Sarcastic']];
  for (const [a, b, n] of pers) if (inR(t, a, b)) {
    ctx.save(); ctx.font = `800 64px ${FONT}`; ctx.fillStyle = '#fff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 20;
    ctx.fillText(n, 110, H - 150); ctx.restore();
  }
  phone(t, 157.4, 160.0, (x, y, w, h) => {
    ctx.fillStyle = '#16191f'; rr(ctx, x, y, w, h, 36); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `700 30px ${FONT}`; ctx.fillText('C-Cube app', x + 30, y + 90);
    ctx.fillStyle = ACC; ctx.font = `600 22px ${FONT}`; ctx.fillText('Personality: Custom ✨', x + 30, y + 130);
    const sl = [['Humor', 0.8, 0.95], ['Energy', 0.5, 0.75], ['Chattiness', 0.6, 0.4], ['Sarcasm', 0.2, 0.65], ['Kindness', 0.9, 0.85]];
    sl.forEach(([n, a, b], i) => {
      const v = lerp(a, b, ease(t, 157.8 + i * 0.25, 158.8 + i * 0.25)), yy = y + 200 + i * 86;
      ctx.fillStyle = '#c9ccd1'; ctx.font = `500 22px ${FONT}`; ctx.fillText(n, x + 30, yy);
      ctx.fillStyle = '#2a2e36'; rr(ctx, x + 30, yy + 18, w - 60, 10, 5); ctx.fill();
      ctx.fillStyle = ACC; rr(ctx, x + 30, yy + 18, (w - 60) * v, 10, 5); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + 30 + (w - 60) * v, yy + 23, 14, 0, 7); ctx.fill();
    });
    ctx.fillStyle = '#c9ccd1'; ctx.font = `500 22px ${FONT}`; ctx.fillText('Nickname: “Captain”', x + 30, y + h - 60);
  });
  // 9.
  if (inR(t, 165.0, 176)) {
    const k = ease(t, 165, 166) * (1 - ease(t, 174, 176));
    ctx.save(); ctx.globalAlpha = k; ctx.textAlign = 'left'; ctx.shadowColor = '#000'; ctx.shadowBlur = 24;
    ctx.fillStyle = '#fff'; ctx.font = `800 110px ${FONT}`; ctx.fillText('C-Cube', 110, 330);
    ctx.fillStyle = ACC; ctx.fillRect(114, 360, 300 * ease(t, 165.3, 166.3), 8);
    ctx.fillStyle = '#e8e6e3'; ctx.font = `500 44px ${FONT}`; ctx.fillText('A little friend for your desk.', 112, 440);
    ctx.fillStyle = '#c9ccd1'; ctx.font = `500 32px ${FONT}`; ctx.fillText('Designed by Zollo & C (Claude)', 112, 520);
    ctx.fillText('AI Challenge · 2026', 112, 566);
    ctx.restore();
  }
  subtitle(t);
}

// robbantott ábra feliratai: [cím, alcím, alkatrész, a narráció szava, ami előhívja (+ késleltetés)]
const INSIDE_LABELS = [
  ['Round display', '1.28" · 240 × 240', /Kerek kijelzo/, 'Round display', 0],
  ['Camera', 'OV5647 · inside the C opening', /Mini kamera/, 'Camera', 0, [0, 120]],
  ['Two microphones', 'Voice Bonnet · stereo audio', /Voice Bonnet/, 'Two microphones', 0],
  ['Raspberry Pi Zero 2 W', 'Wi-Fi · Bluetooth · Linux', /Raspberry/, 'Two microphones', 0.7],
  ['Stereo speakers', '2 × 36 mm', /Hangszoro jobb – test/, 'Stereo', 0],
  ['RGB lights', '24-LED ring + glowing C', /NeoPixel/, 'RGB', 0, [0, 0], [0, 0, 0], 1],   // fix jobb oldal: a gyűrű a kép közepén van, különben a címke ide-oda ugrálna
  ['Battery', '18650 · USB-C charging', /UPS/, 'Battery', 0, [0, -90], [-1.1, -0.3, 1.2], 1],
  ['Orange rubber corners', 'TPU · throwable', /Gumi sarok 6/, 'orange', 0],
];
function insideLabels(t, s) {
  const v = new THREE.Vector3();
  for (const [text, sub, re, word, delay, shift = [0, 0], aOff = [0, 0, 0], side = 0] of INSIDE_LABELS) {
    const p = insidePart(re);
    const t0 = EX.word(word) + delay;
    if (!p || t < t0 || t > EX.c + 0.4) continue;
    const k = ease(t, t0, t0 + 0.35) * (1 - ease(t, EX.c, EX.c + 0.4)) * s.explode;
    if (k <= 0.01) continue;
    v.copy(p.center).addScaledVector(p.off, s.explode).add(new THREE.Vector3(...aOff));
    inside.localToWorld(v); v.project(camera);
    const ax = (v.x + 1) / 2 * W, ay = (1 - v.y) / 2 * H;
    let dx = ax - W / 2, dy = ay - H / 2; const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
    if (side) dx = side;
    ctx.save(); ctx.globalAlpha = k;
    ctx.font = `700 34px ${FONT}`; const w1 = ctx.measureText(text).width;
    ctx.font = `500 22px ${FONT}`; const w2 = ctx.measureText(sub).width;
    const bw = Math.max(w1, w2) + 44, bh = 84;
    let lx = ax + dx * 170 + shift[0], ly = ay + dy * 110 + shift[1];
    let bx = dx >= 0 ? lx : lx - bw, by = ly - bh / 2;
    bx = clamp(bx, 30, W - bw - 30); by = clamp(by, 30, H - bh - 160);
    const ex = dx >= 0 ? bx : bx + bw, ey = by + bh / 2;
    ctx.strokeStyle = ACC; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.fillStyle = ACC; ctx.beginPath(); ctx.arc(ax, ay, 7, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(12,14,18,0.82)'; rr(ctx, bx, by, bw, bh, 14); ctx.fill();
    ctx.fillStyle = ACC; rr(ctx, dx >= 0 ? bx : bx + bw - 6, by, 6, bh, 3); ctx.fill();
    ctx.textBaseline = 'top'; ctx.fillStyle = '#fff'; ctx.font = `700 34px ${FONT}`; ctx.fillText(text, bx + 22, by + 10);
    ctx.fillStyle = '#c9ccd1'; ctx.font = `500 22px ${FONT}`; ctx.fillText(sub, bx + 22, by + 52);
    ctx.restore();
  }
}

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

function renderAt(tNew) {
  const M = mapT(tNew), t = M.t;
  const s = M.cat ? catState(M.u, t) : stateAt(t);
  camera.position.copy(s.cam.pos); camera.lookAt(s.cam.target);
  camera.fov = s.cam.fov || 32; camera.updateProjectionMatrix();
  cubeRoot.position.copy(s.root); cube.rotation.copy(s.rot);
  cube.visible = !s.inside;
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
  const z = cutPunch(M);
  ctx.drawImage(renderer.domElement, -(z - 1) * W / 2, -(z - 1) * H / 2, W * z, H * z);
  // finom vignetta
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.05);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  if (M.cat) { catFlash(s); catOverlays(M.u); } else { overlays(t); if (s.inside) insideLabels(t, s); }
  cutFlash(M);
  if (s.fade < 1) { ctx.fillStyle = `rgba(0,0,0,${1 - s.fade})`; ctx.fillRect(0, 0, W, H); }
}

// ---------------------------------------------------------------- vezérlés (előnézet és felvétel)
window.renderAt = renderAt;
window.grabFrame = (t, q = 0.92) => { renderAt(t); return out.toDataURL('image/jpeg', q); };
window.duration = PG.duration;
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
