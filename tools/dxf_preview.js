// DXF előnézet: a dxf/ mappa összes fájljából SVG-t és egy áttekintő HTML oldalt készít (dxf/index.html).
// Csak a gyakori 2D elemeket kezeli (LINE, CIRCLE, ARC, LWPOLYLINE, SPLINE vezérlőpontok) – ellenőrzésre elég.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', 'dxf');

function parse(text) {
  const lines = text.split(/\r?\n/), pairs = [];
  for (let i = 0; i + 1 < lines.length; i += 2) pairs.push([parseInt(lines[i].trim(), 10), lines[i + 1].trim()]);
  const ents = []; let inEnt = false, cur = null;
  for (const [c, v] of pairs) {
    if (c === 2 && v === 'ENTITIES') inEnt = true;
    if (!inEnt) continue;
    if (c === 0) { if (cur) ents.push(cur); cur = { type: v, x: [], y: [] }; if (v === 'ENDSEC') { inEnt = false; cur = null; } continue; }
    if (!cur) continue;
    if (c === 10) { cur.x.push(+v); (cur.b = cur.b || []).push(0); } else if (c === 20) cur.y.push(+v);
    else if (c === 42 && cur.b) cur.b[cur.b.length - 1] = +v;
    else if (c === 70) cur.flags = +v;
    else if (c === 11) cur.x2 = +v; else if (c === 21) cur.y2 = +v;
    else if (c === 40) cur.r = +v; else if (c === 50) cur.a1 = +v; else if (c === 51) cur.a2 = +v;
  }
  return ents;
}

function expandBulges(e) {
  if (e.type !== 'LWPOLYLINE' || !e.b || !e.b.some(b => b)) return e;
  const n = e.x.length, closed = (e.flags & 1) === 1, X = [], Y = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n; X.push(e.x[i]); Y.push(e.y[i]);
    if (!closed && i === n - 1) break;
    const b = e.b[i]; if (!b) continue;
    const x1 = e.x[i], y1 = e.y[i], x2 = e.x[j], y2 = e.y[j];
    const th = 4 * Math.atan(b), c = Math.hypot(x2 - x1, y2 - y1), r = c / (2 * Math.sin(th / 2));
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, d = Math.sqrt(Math.max(0, r * r - c * c / 4)) * Math.sign(b);
    const cx = mx - d * (y2 - y1) / c * (Math.abs(th) > Math.PI ? -1 : 1), cy = my + d * (x2 - x1) / c * (Math.abs(th) > Math.PI ? -1 : 1);
    const a1 = Math.atan2(y1 - cy, x1 - cx);
    for (let k = 1; k < 24; k++) { const a = a1 + th * k / 24; X.push(cx + Math.abs(r) * Math.cos(a)); Y.push(cy + Math.abs(r) * Math.sin(a)); }
  }
  if (closed) { X.push(e.x[0]); Y.push(e.y[0]); }
  return Object.assign({}, e, { x: X, y: Y });
}

function toSvg(ents) {
  ents = ents.filter(e => e.type !== 'POINT').map(expandBulges);
  const pts = [];
  const add = (x, y) => pts.push([x, y]);
  for (const e of ents) {
    if (e.type === 'LINE') { add(e.x[0], e.y[0]); add(e.x2, e.y2); }
    else if (e.type === 'CIRCLE' || e.type === 'ARC') { add(e.x[0] - e.r, e.y[0] - e.r); add(e.x[0] + e.r, e.y[0] + e.r); }
    else e.x.forEach((x, i) => add(x, e.y[i]));
  }
  if (!pts.length) return { svg: '<svg xmlns="http://www.w3.org/2000/svg"/>', w: 0, h: 0, n: 0 };
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = maxX - minX || 1, h = maxY - minY || 1, pad = Math.max(w, h) * 0.05;
  const Y = y => maxY - y + pad, X = x => x - minX + pad;  // DXF y felfelé, SVG y lefelé
  const sw = Math.max(w, h) / 400;
  let body = '';
  for (const e of ents) {
    if (e.type === 'LINE') body += `<line x1="${X(e.x[0])}" y1="${Y(e.y[0])}" x2="${X(e.x2)}" y2="${Y(e.y2)}"/>`;
    else if (e.type === 'CIRCLE') body += `<circle cx="${X(e.x[0])}" cy="${Y(e.y[0])}" r="${e.r}"/>`;
    else if (e.type === 'ARC') {
      const a1 = e.a1 * Math.PI / 180, a2 = e.a2 * Math.PI / 180;
      let sweep = (e.a2 - e.a1 + 360) % 360; if (sweep === 0) sweep = 360;
      const x1 = e.x[0] + e.r * Math.cos(a1), y1 = e.y[0] + e.r * Math.sin(a1), x2 = e.x[0] + e.r * Math.cos(a2), y2 = e.y[0] + e.r * Math.sin(a2);
      body += `<path d="M${X(x1)} ${Y(y1)} A${e.r} ${e.r} 0 ${sweep > 180 ? 1 : 0} 0 ${X(x2)} ${Y(y2)}"/>`;
    } else if (e.x.length > 1) body += `<polyline points="${e.x.map((x, i) => X(x) + ',' + Y(e.y[i])).join(' ')}"/>`;
  }
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w + 2 * pad} ${h + 2 * pad}"><g fill="none" stroke="#111" stroke-width="${sw}">${body}</g></svg>`,
    w, h, n: ents.length,
  };
}

let html = '<!doctype html><meta charset="utf-8"><title>C-kocka DXF előnézet</title><style>body{font:14px system-ui;margin:20px;background:#fafafa}section{margin-bottom:28px}div.g{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}figure{margin:0;background:#fff;border:1px solid #ddd;padding:8px}img{width:100%;height:180px;object-fit:contain}figcaption{font-size:12px;color:#555}</style><h1>C-kocka – DXF előnézet</h1>';
const summary = [];
for (const part of fs.readdirSync(ROOT).filter(d => fs.statSync(path.join(ROOT, d)).isDirectory()).sort()) {
  html += `<section><h2>${part}</h2><div class="g">`;
  for (const f of fs.readdirSync(path.join(ROOT, part)).filter(f => f.endsWith('.dxf')).sort()) {
    const r = toSvg(parse(fs.readFileSync(path.join(ROOT, part, f), 'utf8')));
    const svgName = f.replace('.dxf', '.svg');
    fs.writeFileSync(path.join(ROOT, part, svgName), r.svg);
    html += `<figure><img src="${part}/${svgName}"><figcaption>${f} · ${r.n} elem · ${r.w.toFixed(1)} × ${r.h.toFixed(1)}</figcaption></figure>`;
    summary.push(`${f}: ${r.n} elem, ${r.w.toFixed(1)} x ${r.h.toFixed(1)}`);
  }
  html += '</div></section>';
}
fs.writeFileSync(path.join(ROOT, 'index.html'), html);
console.log(summary.join('\n'));
