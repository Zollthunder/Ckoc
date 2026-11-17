// Egyszerű helyi webszerver előnézethez: node serve.js  ->  http://localhost:8080
// /api/talk: a szimulátor beszélgetése Claude-dal (lásd talk.js). Csak erről a gépről hívható,
// hogy a hálózaton más ne beszélgethessen a te API-kulcsoddal.
const http = require('http');
const fs = require('fs');
const path = require('path');
const talk = require('./talk');

const root = __dirname;
const port = process.env.PORT || 8080;
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.stl': 'model/stl', '.glb': 'model/gltf-binary',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.wav': 'audio/wav', '.mjs': 'text/javascript', '.md': 'text/plain; charset=utf-8',
};
const isLocal = req => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };

function api(req, res) {
  if (!isLocal(req)) return json(res, 403, { error: 'csak helyben' });
  if (req.method === 'GET') return json(res, 200, talk.status());
  if (req.method !== 'POST') return json(res, 405, { error: 'method' });
  let raw = '';
  req.on('data', c => { raw += c; if (raw.length > 20000) req.destroy(); });
  req.on('end', async () => {
    let body;
    try { body = JSON.parse(raw); } catch { return json(res, 400, { error: 'json' }); }
    const st = talk.status();
    if (!st.ready) return json(res, 503, st);
    try { json(res, 200, await talk.reply(body)); }
    catch (e) {
      console.error('talk hiba:', e.status || '', e.message);
      json(res, e.status === 400 ? 400 : 502, { error: e.status === 400 ? 'bad-request' : 'upstream', status: e.status || null });
    }
  });
}

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/api/talk') return api(req, res);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.normalize(path.join(root, p));
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Nincs ilyen fájl'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(port, () => {
  const st = talk.status();
  console.log('Fut: http://localhost:' + port);
  console.log('Beszélgetés (/api/talk):', st.ready ? (st.mock ? 'próbamód' : 'Claude, élesben') : 'ki – ' + st.reason);
});
