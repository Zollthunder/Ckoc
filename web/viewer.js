// C-kocka – interaktív 3D néző a weboldalra (three.js)
// A modell a Fusion 360-ból exportált STL testekből áll; a kijelző arca élőben rajzolódik.
import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';

const box = document.getElementById('viewer');
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const hsl = (h, s, l) => new THREE.Color().setHSL(((h % 1) + 1) % 1, s, l);
const C = h => new THREE.Color(h);

// ---------- alap ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
box.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 300);
camera.position.set(15, 11, 23);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 3.6, 0);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 16; controls.maxDistance = 45;
controls.maxPolarAngle = Math.PI * 0.52;
controls.autoRotate = true; controls.autoRotateSpeed = 0.8;
renderer.domElement.addEventListener('pointerdown', () => { controls.autoRotate = false; clearTimeout(window.__ar); });
renderer.domElement.addEventListener('pointerup', () => { window.__ar = setTimeout(() => (controls.autoRotate = true), 4000); });

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.5, 0.35, 0.9);
composer.addPass(bloom);
composer.addPass(new OutputPass());

const key = new THREE.DirectionalLight(0xfff3e6, 2.0);
key.position.set(12, 20, 14); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
Object.assign(key.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14 });
scene.add(key);
const rim = new THREE.DirectionalLight(0x8fb6ff, 1.8); rim.position.set(-14, 9, -12); scene.add(rim);
scene.add(new THREE.HemisphereLight(0x9aa7c0, 0x101014, 0.35));
const under = new THREE.PointLight(0xffffff, 4, 24, 1.6); under.position.set(0, 0.6, 0); scene.add(under);

const floor = new THREE.Mesh(new THREE.CircleGeometry(40, 64), new THREE.ShadowMaterial({ opacity: 0.45 }));
floor.rotation.x = -Math.PI / 2; floor.position.y = -0.45; floor.receiveShadow = true; scene.add(floor);
const glowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c);
})();
const glow = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
glow.rotation.x = -Math.PI / 2; glow.position.y = -0.44; scene.add(glow);

// ---------- anyagok ----------
function woodTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); g.fillStyle = '#9a6a3c'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(70,40,15,${0.2 + Math.random() * 0.3})`; g.lineWidth = 1 + Math.random() * 2; g.beginPath(); const y = Math.random() * 128; g.moveTo(0, y); g.lineTo(128, y + Math.sin(i) * 5); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const MAT = {
  house: new THREE.MeshPhysicalMaterial({ color: 0x30333a, roughness: 0.5, metalness: 0.05, clearcoat: 0.35, clearcoatRoughness: 0.4, envMapIntensity: 0.45 }),
  alu: new THREE.MeshStandardMaterial({ color: 0xc9ccd1, roughness: 0.42, metalness: 1, envMapIntensity: 0.4 }),
  logo: new THREE.MeshStandardMaterial({ color: 0xd8dbe0, roughness: 0.35, metalness: 0.45, envMapIntensity: 0.45 }),
  wood: new THREE.MeshStandardMaterial({ map: woodTexture(), roughness: 0.55, envMapIntensity: 0.45 }),
  cyan: new THREE.MeshPhysicalMaterial({ color: 0x78e6ff, roughness: 0.25, clearcoat: 0.6, envMapIntensity: 0.45 }),
  mint: new THREE.MeshPhysicalMaterial({ color: 0x8ce6aa, roughness: 0.25, clearcoat: 0.6, envMapIntensity: 0.45 }),
  pink: new THREE.MeshPhysicalMaterial({ color: 0xff6e96, roughness: 0.25, clearcoat: 0.6, envMapIntensity: 0.45 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0x050608, roughness: 0.08, metalness: 0.2, clearcoat: 1, envMapIntensity: 0.6 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.85, envMapIntensity: 0.45 }),
  orange: new THREE.MeshStandardMaterial({ color: 0xff8020, roughness: 0.62, envMapIntensity: 0.45 }),
  light: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
};
const MAT_OF = n =>
  n === 'haz' ? MAT.house : /logo/.test(n) ? MAT.logo : n === 'tetolap' ? MAT.alu : n === 'gomb_1' ? MAT.wood :
  n === 'gomb_2' ? MAT.cyan : n === 'gomb_3' ? MAT.mint : n === 'gomb_4' ? MAT.pink :
  /kijelzo|kamera/.test(n) ? MAT.glass : n === 'gumitalp' ? MAT.rubber : /gumi_sarok/.test(n) ? MAT.orange : null;

// ---------- a kocka ----------
const root = new THREE.Group(); root.position.y = 4; scene.add(root);
const cube = new THREE.Group(); root.add(cube);
const parts = {};
const BODIES = await (await fetch('web/model/bodies.json')).json();
const loader = new STLLoader();
await Promise.all(BODIES.map(async b => {
  const key = b.file.replace('.stl', '');
  if (/^arc/.test(key)) return;                       // az arcot élő kijelzőkép helyettesíti
  let geo = loader.parse(await (await fetch('web/model/' + b.file)).arrayBuffer());
  geo.scale(0.1, 0.1, 0.1); geo.translate(0, -4, 0);
  geo = toCreasedNormals(geo, THREE.MathUtils.degToRad(35));
  let mat = MAT_OF(key);
  if (key === 'c_fenycsatorna' || key === 'rgb_fenygyuru') {
    const pos = geo.attributes.position, n = pos.count, p = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      if (key === 'c_fenycsatorna') { let a = Math.atan2(pos.getY(i), pos.getX(i)) * 180 / Math.PI; if (a < 0) a += 360; p[i] = clamp(((a - 36 + 360) % 360) / 288); }
      else { let a = Math.atan2(pos.getZ(i), pos.getX(i)); if (a < 0) a += Math.PI * 2; p[i] = a / (Math.PI * 2); }
    }
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    geo.userData.param = p; mat = MAT.light.clone();
  }
  const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true;
  cube.add(m); parts[key] = m;
}));
const faceCanvas = document.createElement('canvas'); faceCanvas.width = faceCanvas.height = 512;
const fx = faceCanvas.getContext('2d');
const faceTex = new THREE.CanvasTexture(faceCanvas); faceTex.colorSpace = THREE.SRGBColorSpace;
const screen = new THREE.Mesh(new THREE.CircleGeometry(1.6, 96), new THREE.MeshBasicMaterial({ map: faceTex, toneMapped: false }));
screen.position.set(0, 0, 4.104); cube.add(screen);
box.querySelector('.viewer-loading')?.remove();

function paint(mesh, fn, t) {
  if (!mesh) return;
  const g = mesh.geometry, p = g.userData.param, c = g.attributes.color.array;
  for (let i = 0; i < p.length; i++) { const col = fn(p[i], t); c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b; }
  g.attributes.color.needsUpdate = true;
}

// ---------- kijelző ----------
function drawFace(s) {
  const g = fx; g.save(); g.fillStyle = '#020305'; g.fillRect(0, 0, 512, 512);
  const col = s.color || '#78e6ff'; g.shadowColor = col; g.shadowBlur = 24; g.fillStyle = col; g.strokeStyle = col;
  g.translate(256, 256); g.globalAlpha = s.bright ?? 1;
  if (s.mode === 'face') {
    const lx = (s.lookX || 0) * 46, ly = (s.lookY || 0) * 34, open = 1 - clamp(s.blink || 0);
    for (const side of [-1, 1]) { g.beginPath(); g.ellipse(side * 78 + lx, -38 + ly, 36, 40 * Math.max(0.08, open), 0, 0, Math.PI * 2); g.fill(); }
    g.lineWidth = 22; g.lineCap = 'round'; g.beginPath(); g.arc(lx * 0.6, 30 + ly * 0.5, 86, Math.PI * 0.18, Math.PI * 0.82); g.stroke();
  } else if (s.mode === 'dizzy') {
    g.lineWidth = 10; g.lineCap = 'round';
    for (const side of [-1, 1]) { g.save(); g.translate(side * 80, -36); g.rotate(s.t * 9 * side); g.beginPath(); for (let a = 0; a < 14; a += 0.15) g.lineTo(Math.cos(a) * a * 3.2, Math.sin(a) * a * 3.2); g.stroke(); g.restore(); }
    g.lineWidth = 16; g.beginPath(); for (let x = -70; x <= 70; x += 5) g.lineTo(x, 84 + Math.sin(x / 12 + s.t * 10) * 10); g.stroke();
  } else if (s.mode === 'eq') {
    for (let i = 0; i < 28; i++) { const v = 0.3 + 0.7 * Math.abs(Math.sin(s.t * (3 + (i % 7) * 1.7) + i)); g.save(); g.rotate(i / 28 * Math.PI * 2); g.fillStyle = hsl(i / 28 + s.t * 0.2, 1, 0.6).getStyle(); g.shadowColor = g.fillStyle; g.fillRect(-9, 80, 18, 30 + v * 110); g.restore(); }
    g.beginPath(); g.arc(0, 0, 60, 0, 7); g.fill();
  } else if (s.mode === 'swirl') {
    g.shadowBlur = 0;
    for (let i = 0; i < 9; i++) { const a = s.t * (2 + i * 0.4) + i * 0.7, r = 60 + i * 18, gr = g.createRadialGradient(Math.cos(a) * r, Math.sin(a) * r, 0, Math.cos(a) * r, Math.sin(a) * r, 130); gr.addColorStop(0, `hsla(${200 + i * 20},90%,65%,.35)`); gr.addColorStop(1, 'hsla(220,90%,60%,0)'); g.fillStyle = gr; g.fillRect(-256, -256, 512, 512); }
  } else if (s.mode === 'text') {
    g.font = '800 170px "Segoe UI", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s.text, 0, 8);
  } else if (s.mode === 'dnd') {
    g.globalAlpha = 0.6; g.beginPath(); g.arc(0, 0, 70, 0, 7); g.fill();
    g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(34, -26, 64, 0, 7); g.fill();
  }
  g.restore(); faceTex.needsUpdate = true;
}

// ---------- módok ----------
let mode = 'sunny', modeT0 = 0, shakeAnswer = 'YES';
const btns = document.querySelectorAll('.modes button');
btns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
function setMode(m) {
  mode = m; modeT0 = performance.now() / 1000;
  if (m === 'shake') shakeAnswer = Math.random() < 0.6 ? 'YES' : 'NO';
  btns.forEach(b => b.classList.toggle('on', b.dataset.mode === m));
}
// a szem követi az egeret / ujjat
const pointer = { x: 0, y: 0 };
addEventListener('pointermove', e => {
  const r = box.getBoundingClientRect();
  pointer.x = clamp(((e.clientX - r.left) / r.width - 0.5) * 2, -1, 1);
  pointer.y = clamp(((e.clientY - r.top) / r.height - 0.45) * 2, -1, 1);
});

// ---------- rajzolás ----------
let visible = true;
new IntersectionObserver(es => (visible = es[0].isIntersecting)).observe(box);
function resize() {
  const w = box.clientWidth, h = box.clientHeight;
  renderer.setSize(w, h, false); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(box); resize();

const warm = C(0xffb878);
const look = new THREE.Vector2();
renderer.setAnimationLoop(() => {
  if (!visible) return;
  const t = performance.now() / 1000, lt = t - modeT0;
  controls.update();
  // a kamera felől nézve hová mutasson a tekintet
  const toCam = Math.atan2(camera.position.x, camera.position.z) - cube.rotation.y;
  look.lerp(new THREE.Vector2(clamp(pointer.x * 0.9 + Math.sin(toCam) * 0.6, -1, 1), clamp(pointer.y * 0.8, -1, 1)), 0.12);
  const bl = (t * 0.37) % 1, blink = bl > 0.96 ? Math.sin((bl - 0.96) / 0.04 * Math.PI) : 0;
  let face = { mode: 'face', lookX: look.x, lookY: look.y, blink, t };
  let cFn = () => warm.clone().multiplyScalar(0.85 + 0.4 * (0.75 + 0.25 * Math.sin(t * 1.6)));
  let rFn = (p, tt) => hsl(p + tt * 0.08, 0.9, 0.55).multiplyScalar(0.8);
  let glowC = hsl(t * 0.08, 0.9, 0.55), glowI = 0.6;
  root.position.set(0, 4, 0); cube.rotation.set(0, 0, 0);

  if (mode === 'party') {
    const beat = t / (60 / 110), pulse = Math.exp(-(beat % 1) * 5), hue = Math.floor(beat) * 0.17;
    cFn = p => hsl(hue + p * 0.3, 1, 0.5).multiplyScalar(0.6 + pulse * 0.9);
    rFn = p => hsl(hue + 0.5 + p, 1, 0.5).multiplyScalar(0.5 + pulse);
    glowC = hsl(hue + 0.5, 1, 0.55); glowI = 0.6 + pulse; face = { mode: 'eq', t };
    root.position.y = 4 + pulse * 0.15;
  } else if (mode === 'shake') {
    if (lt < 1.8) {
      cube.rotation.set(Math.sin(lt * 41) * 0.12, Math.sin(lt * 37) * 0.1, Math.sin(lt * 45) * 0.14);
      root.position.set(Math.sin(lt * 33) * 0.4, 4 + Math.abs(Math.sin(lt * 29)) * 0.5, 0);
      face = { mode: 'swirl', t };
    } else if (lt < 5) {
      const yes = shakeAnswer === 'YES', col = yes ? C(0x3ef07a) : C(0xff4d5a), f = Math.exp(-(lt - 1.8) * 1.2);
      face = { mode: 'text', text: shakeAnswer, color: yes ? '#5cf28a' : '#ff6b74', bright: clamp((lt - 1.8) / 0.4) };
      cFn = () => col.clone().multiplyScalar(0.6 + f); rFn = () => col.clone().multiplyScalar(0.5 + f * 0.6); glowC = col; glowI = 0.6 + f;
    } else setMode('sunny');
  } else if (mode === 'dizzy') {
    if (lt < 1.2) { const k = lt / 1.2; root.position.y = 4 + Math.sin(Math.PI * k) * 5; cube.rotation.set(k * Math.PI * 2, k * 1.4, 0); }
    else if (lt < 4.5) {
      const k = lt - 1.2; root.position.y = 4 + Math.abs(Math.sin(k * 6)) * 1.6 * Math.exp(-k * 4);
      const w = Math.sin(k * 14) * 0.3 * Math.exp(-k * 3); cube.rotation.set(w, 0, w * 0.6); face = { mode: 'dizzy', t };
      rFn = (p, tt) => hsl(p - tt * 1.5, 1, 0.55); cFn = (p, tt) => hsl(p + tt, 1, 0.55); glowC = hsl(-t * 1.5, 1, 0.55); glowI = 0.9;
    } else setMode('sunny');
  } else if (mode === 'dnd') {
    face = { mode: 'dnd', color: '#9fb8ff' };
    cFn = () => C(0x6d7fd9).multiplyScalar(0.25); rFn = () => C(0x6d7fd9).multiplyScalar(0.15); glowC = C(0x6d7fd9); glowI = 0.15;
    const v = lt % 3; if (v < 0.4) root.position.set(Math.sin(v * 190) * 0.05, 4, Math.cos(v * 170) * 0.04);
  }
  paint(parts.c_fenycsatorna, cFn, t); paint(parts.rgb_fenygyuru, rFn, t);
  const hgt = clamp(1 - (root.position.y - 4) / 6);
  glow.material.color.copy(glowC).multiplyScalar(glowI * hgt); glow.position.x = root.position.x;
  under.color.copy(glowC); under.intensity = 9 * glowI * hgt;
  drawFace(face);
  composer.render();
});
