// A videó felvétele: a jelenetet fejnélküli Edge-ben futtatja, minden képkockát lekér, és ffmpeg-gel MP4-be fűzi a hanggal.
// Használat:
//   node tools/render_video.js test 8,20,36.5      -> próbaképek: video/test/t_<idő>.jpg
//   node tools/render_video.js full [kezdet] [vég]  -> video/c-kocka.mp4
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const ffmpeg = require('ffmpeg-static');

const ROOT = path.join(__dirname, '..');
const PORT = 8090;
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

(async () => {
  const [mode = 'test', arg1, arg2] = process.argv.slice(2);
  const server = spawn(process.execPath, [path.join(ROOT, 'serve.js')], { env: { ...process.env, PORT }, stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 800));
  const browser = await puppeteer.launch({
    executablePath: EDGE, headless: 'new',
    args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--window-size=1920,1080', '--autoplay-policy=no-user-gesture-required'],
    defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
  });
  try {
    const page = await browser.newPage();
    page.on('console', m => { if (m.type() === 'error') console.log('[oldal hiba]', m.text()); });
    page.on('pageerror', e => console.log('[oldal kivétel]', e.message));
    await page.goto(`http://localhost:${PORT}/video/scene.html?render`, { waitUntil: 'load' });
    await page.waitForFunction('window.ready === true', { timeout: 120000 });
    const renderer = await page.evaluate(() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
      return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'ismeretlen';
    });
    console.log('GPU:', renderer);
    const grab = async t => Buffer.from((await page.evaluate(tt => window.grabFrame(tt, 0.93), t)).split(',')[1], 'base64');

    if (mode === 'test') {
      const dir = path.join(ROOT, 'video/test');
      fs.mkdirSync(dir, { recursive: true });
      for (const t of (arg1 || '8').split(',').map(Number)) {
        fs.writeFileSync(path.join(dir, `t_${t.toFixed(1).padStart(5, '0')}.jpg`), await grab(t));
      }
      console.log('Próbaképek kész:', dir);
    } else {
      const duration = await page.evaluate(() => window.duration);
      const fps = 30, t0 = +(arg1 || 0), t1 = +(arg2 || duration);
      const outFile = path.join(ROOT, t0 === 0 && t1 === duration ? 'video/c-kocka.mp4' : `video/c-kocka_${t0}-${t1}.mp4`);
      const ff = spawn(ffmpeg, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
        '-ss', String(t0), '-t', String(t1 - t0), '-i', path.join(ROOT, 'video/audio_mix.wav'),
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
        '-c:a', 'aac', '-b:a', '192k', '-shortest', outFile], { stdio: ['pipe', 'inherit', 'inherit'] });
      const frames = Math.round((t1 - t0) * fps), start = Date.now();
      for (let i = 0; i < frames; i++) {
        const buf = await grab(t0 + i / fps);
        if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
        if (i % 150 === 0) {
          const el = (Date.now() - start) / 1000, eta = i ? el / i * (frames - i) : 0;
          console.log(`${i}/${frames} képkocka · ${(t0 + i / fps).toFixed(1)} s · hátralévő idő kb. ${Math.round(eta)} s`);
        }
      }
      ff.stdin.end();
      await new Promise(r => ff.on('close', r));
      console.log('Kész:', outFile, `(${Math.round((Date.now() - start) / 1000)} s alatt)`);
    }
  } finally {
    await browser.close();
    server.kill();
  }
})().catch(e => { console.error('Hiba:', e); process.exit(1); });
