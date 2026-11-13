// Fusion MCP parancssori segéd (a Fusion beépített MCP szerveréhez)
// Használat:
//   node tools/fusion-mcp.js list                      -> eszközök listája
//   node tools/fusion-mcp.js schema <eszköz>           -> az eszköz teljes leírása
//   node tools/fusion-mcp.js call <eszköz> <json|@fájl> -> eszköz hívása
//   node tools/fusion-mcp.js script <fájl.py>          -> Python szkript futtatása a Fusionben
const fs = require('fs');
const http = require('http');
const URL = new (require('url').URL)(process.env.FUSION_MCP_URL || 'http://127.0.0.1:27182/mcp');

// egyszerű POST kérés (a gépen Node 14 van, abban még nincs beépített fetch)
function post(headers, data) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: URL.hostname, port: URL.port, path: URL.pathname, method: 'POST',
      headers: Object.assign({ 'Content-Length': Buffer.byteLength(data) }, headers), timeout: 900000 }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ headers: res.headers, text: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('időtúllépés')));
    req.end(data);
  });
}

let session = null, nextId = 1;
async function rpc(method, params, notify = false) {
  const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' };
  if (session) headers['MCP-Session-Id'] = session;
  const body = { jsonrpc: '2.0', method, params };
  if (!notify) body.id = nextId++;
  const res = await post(headers, JSON.stringify(body));
  session = res.headers['mcp-session-id'] || session;
  const text = res.text;
  if (notify) return null;
  const m = text.match(/^data: (.*)$/m);
  const json = JSON.parse(m ? m[1] : text);
  if (json.error) throw new Error(JSON.stringify(json.error));
  return json.result;
}

async function connect() {
  await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'ckocka-cli', version: '1' } });
  await rpc('notifications/initialized', {}, true);
}

function printResult(r) {
  for (const c of r.content || []) {
    if (c.type === 'text') console.log(c.text);
    else if (c.type === 'image') {
      const out = process.env.IMG_OUT || 'fusion-screenshot.png';
      fs.writeFileSync(out, Buffer.from(c.data, 'base64'));
      console.log('[kép mentve: ' + out + ']');
    } else console.log(JSON.stringify(c).slice(0, 500));
  }
}

(async () => {
  const [cmd, a, b] = process.argv.slice(2);
  await connect();
  if (cmd === 'list') {
    const r = await rpc('tools/list', {});
    for (const t of r.tools) console.log(t.name);
  } else if (cmd === 'schema') {
    const r = await rpc('tools/list', {});
    const t = r.tools.find(t => t.name === a);
    console.log(t.description); console.log(JSON.stringify(t.inputSchema, null, 1));
  } else if (cmd === 'call') {
    const args = JSON.parse(b.startsWith('@') ? fs.readFileSync(b.slice(1), 'utf8') : b);
    printResult(await rpc('tools/call', { name: a, arguments: args }));
  } else if (cmd === 'script' || cmd === 'script-ro') {
    const code = fs.readFileSync(a, 'utf8');
    const object = { script: code };
    if (cmd === 'script-ro') object.readOnly = true;   // csak olvas, a modellt nem módosíthatja
    printResult(await rpc('tools/call', { name: 'fusion_mcp_execute', arguments: { featureType: 'script', object } }));
  } else if (cmd === 'shot') {
    // képernyőkép: node tools/fusion-mcp.js shot <irány> <kimenet.png> [szélesség] [magasság]
    process.env.IMG_OUT = b || 'fusion-screenshot.png';
    const args = { queryType: 'screenshot', direction: a || 'current', width: +(process.argv[5] || 1280), height: +(process.argv[6] || 960), transparentBackground: false };
    printResult(await rpc('tools/call', { name: 'fusion_mcp_read', arguments: args }));
  } else {
    console.log('Parancsok: list | schema <eszköz> | call <eszköz> <json|@fájl> | script <fájl.py>');
  }
})().catch(e => { console.error('Hiba:', e.message); process.exit(1); });
