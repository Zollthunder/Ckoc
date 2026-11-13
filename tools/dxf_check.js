// DXF-ellenőrző: mértékegység, zárt kontúrok, nyitott végek, befoglaló méret
// Használat: node tools/dxf_check.js [mappa]   (alapértelmezés: dxf/vagas)
const fs = require('fs');
const path = require('path');
const dir = process.argv[2] || path.join(__dirname, '..', 'dxf', 'vagas');
const TOL = 0.01; // mm

function parse(text) {
  const lines = text.split(/\r?\n/).map(s => s.trim());
  const pairs = [];
  for (let i = 0; i + 1 < lines.length; i += 2) pairs.push([parseInt(lines[i], 10), lines[i + 1]]);
  let units = null, inEnt = false, cur = null;
  const ents = [];
  for (let i = 0; i < pairs.length; i++) {
    const [c, v] = pairs[i];
    if (c === 9 && v === '$INSUNITS') units = parseInt(pairs[i + 1][1], 10);
    if (c === 2 && v === 'ENTITIES') { inEnt = true; continue; }
    if (!inEnt) continue;
    if (c === 0) {
      if (cur) ents.push(cur);
      if (v === 'ENDSEC') { inEnt = false; cur = null; continue; }
      cur = { type: v, x: [], y: [], b: [] };
      continue;
    }
    if (!cur) continue;
    if (c === 10) { cur.x.push(+v); cur.b.push(0); } else if (c === 20) cur.y.push(+v);
    else if (c === 11) cur.x2 = +v; else if (c === 21) cur.y2 = +v;
    else if (c === 40) cur.r = +v; else if (c === 50) cur.a1 = +v; else if (c === 51) cur.a2 = +v;
    else if (c === 42) cur.b[cur.b.length - 1] = +v; else if (c === 70) cur.flags = +v;
  }
  return { units, ents };
}

function analyse(ents) {
  const segs = [];   // nyitott elemek végpontjai
  let closed = 0, pts = [];
  const add = (x, y) => pts.push([x, y]);
  for (const e of ents) {
    if (e.type === 'CIRCLE') { closed++; add(e.x[0] - e.r, e.y[0] - e.r); add(e.x[0] + e.r, e.y[0] + e.r); }
    else if (e.type === 'LINE') { segs.push([[e.x[0], e.y[0]], [e.x2, e.y2]]); add(e.x[0], e.y[0]); add(e.x2, e.y2); }
    else if (e.type === 'ARC') {
      let sweep = (e.a2 - e.a1 + 360) % 360; if (sweep === 0) sweep = 360;
      const p = a => [e.x[0] + e.r * Math.cos(a * Math.PI / 180), e.y[0] + e.r * Math.sin(a * Math.PI / 180)];
      for (let k = 0; k <= 32; k++) add(...p(e.a1 + sweep * k / 32));
      segs.push([p(e.a1), p(e.a2)]);
    } else if (e.type === 'LWPOLYLINE') {
      // csúcsok + a domború (bulge) szakaszok ívpontjai
      const n = e.x.length, cl = e.flags & 1;
      for (let i = 0; i < n; i++) {
        add(e.x[i], e.y[i]);
        const j = (i + 1) % n, bu = e.b[i] || 0;
        if (!bu || (j === 0 && !cl)) continue;
        const x1 = e.x[i], y1 = e.y[i], x2 = e.x[j], y2 = e.y[j];
        const th = 4 * Math.atan(bu), dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy);
        const r = d / (2 * Math.sin(th / 2)), h = r * Math.cos(th / 2);
        const cx = (x1 + x2) / 2 - h * dy / d, cy = (y1 + y2) / 2 + h * dx / d;
        const a0 = Math.atan2(y1 - cy, x1 - cx);
        for (let k = 1; k < 32; k++) add(cx + Math.abs(r) * Math.cos(a0 + th * k / 32), cy + Math.abs(r) * Math.sin(a0 + th * k / 32));
      }
      const first = [e.x[0], e.y[0]], last = [e.x[e.x.length - 1], e.y[e.y.length - 1]];
      if ((e.flags & 1) || Math.hypot(first[0] - last[0], first[1] - last[1]) < TOL) closed++;
      else segs.push([first, last]);
    } else if (e.type === 'SPLINE') {
      e.x.forEach((x, i) => add(x, e.y[i]));
      if (e.flags & 1) closed++; else segs.push([[e.x[0], e.y[0]], [e.x[e.x.length - 1], e.y[e.y.length - 1]]]);
    }
  }
  // nyitott elemek láncolása: minden végpontnak pontosan egy párja kell legyen
  const ends = [];
  segs.forEach(s => ends.push(s[0], s[1]));
  let open = 0;
  for (let i = 0; i < ends.length; i++) {
    let n = 0;
    for (let j = 0; j < ends.length; j++) if (i !== j && Math.hypot(ends[i][0] - ends[j][0], ends[i][1] - ends[j][1]) < TOL) n++;
    if (n === 0) open++;
  }
  // láncolt hurkok száma (union-find a nyitott elemeken)
  const parent = segs.map((_, i) => i);
  const find = i => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++)
    for (const a of segs[i]) for (const b of segs[j]) if (Math.hypot(a[0] - b[0], a[1] - b[1]) < TOL) parent[find(i)] = find(j);
  const chains = new Set(segs.map((_, i) => find(i))).size;
  const sig = e => e.type + ':' + [...e.x, ...e.y, e.r, e.x2, e.y2, e.a1, e.a2, ...e.b].map(v => v === undefined ? '' : (+v).toFixed(2)).join(',');
  const seen = new Set(); let dup = 0;
  for (const e of ents) { const k = sig(e); if (seen.has(k)) dup++; else seen.add(k); }
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  return { dup, loops: closed + (open === 0 ? chains : 0), open, w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys), n: ents.length };
}

let bad = 0;
const UNITS = { 4: 'mm', 5: 'cm', 1: 'inch', 0: 'nincs megadva' };
for (const f of fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.dxf')).sort()) {
  const { units, ents } = parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const r = analyse(ents.filter(e => e.type !== 'POINT'));
  const problems = [];
  if (units !== 4) problems.push('mértékegység: ' + (UNITS[units] || units));
  if (r.open > 0) problems.push(r.open + ' nyitott végpont');
  if (r.n === 0) problems.push('üres');
  if (r.dup > 0) problems.push(r.dup + ' duplikált (kétszer vágott) elem');
  bad += problems.length ? 1 : 0;
  console.log(`${problems.length ? 'HIBA' : 'OK  '} ${f.padEnd(52)} ${r.w.toFixed(1)} × ${r.h.toFixed(1)} mm · ${r.loops} zárt kontúr · ${r.n} elem${problems.length ? ' · ' + problems.join(', ') : ''}`);
}
console.log(bad ? `${bad} fájlban hiba` : 'minden DXF rendben');
