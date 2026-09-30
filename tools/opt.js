// Simulated-annealing layout search. Usage: node tools/opt.js [ids,comma,separated] [iterations] [restarts]
// Writes tools/optimal.json and ../optimal.js (the designer targets the game loads).
const C = require('../core.js'); const fs = require('fs'); const path = require('path');
const R = (n) => Math.floor(Math.random() * n);
const ok = (L, P, p, cx, cy, ang) => C.canPlace(L, C.occupancy(L, P, p), p, cx, cy, ang);
function set(p, cx, cy, ang) { p.cx = cx; p.cy = cy; p.ang = ang; p.placed = true; }
function randomSpot(L, p) { const ang = R(4) * 90; const [w, h] = C.dims(p, ang); return [p, ...C.snap(p, w / 2 + Math.random() * (L.W - w), h / 2 + Math.random() * (L.H - h), ang), ang]; }
function propose(L, P, mov) {
  const p = mov[R(mov.length)];
  if (!p.placed) return randomSpot(L, p);
  const m = Math.random();
  if (m < 0.35) { const s = Math.random() < 0.7 ? 1 : 3; return [p, ...C.snap(p, p.cx + R(2 * s + 1) - s, p.cy + R(2 * s + 1) - s), p.ang]; }
  if (m < 0.5) { const a = C.norm(p.ang + [90, 180, 270][R(3)]); return [p, ...C.snap(p, p.cx, p.cy, a), a]; }
  if (m < 0.54 && L.def.angled) { const a = C.norm(p.ang + (Math.random() < 0.5 ? -45 : 45)); return [p, ...C.snap(p, p.cx, p.cy, a), a]; }
  if (m < 0.68) { const [dx, dy] = C.DIRV[R(4)], occ = C.occupancy(L, P, p); let x = p.cx, y = p.cy;
    while (C.canPlace(L, occ, p, x + dx, y + dy, p.ang)) { x += dx; y += dy; } return [p, x, y, p.ang]; }
  if (m < 0.86) { const others = P.filter((q) => q.placed && q !== p), q = others[R(others.length)];
    const a = R(4) * 90, [w, h] = C.dims(p, a), [qw, qh] = C.dims(q, q.ang), side = R(4);
    let x = q.cx, y = q.cy;
    if (side < 2) { x += (Math.random() - 0.5) * (qw + w); y += (side ? 1 : -1) * (qh + h) / 2; } else { y += (Math.random() - 0.5) * (qh + h); x += (side === 3 ? 1 : -1) * (qw + w) / 2; }
    return [p, ...C.snap(p, x, y, a), a]; }
  return randomSpot(L, p);
}
function anneal(L, iters) {
  const P = C.makePieces(L), mov = P.filter((p) => !p.fixed);
  const order = [...mov].sort((a, b) => C.base(b)[0] * C.base(b)[1] - C.base(a)[0] * C.base(a)[1]);
  for (const p of order) for (let t = 0; t < 3000; t++) { const [, x, y, a] = randomSpot(L, p); if (ok(L, P, p, x, y, a)) { set(p, x, y, a); break; } }
  let cur = C.evaluate(L, P).total, best = cur, bestS = mov.map((p) => [p.cx, p.cy, p.ang, p.placed ? 1 : 0]);
  const T0 = 6, T1 = 0.03;
  for (let it = 0; it < iters; it++) {
    const T = T0 * Math.pow(T1 / T0, it / iters);
    const [p, x, y, a] = propose(L, P, mov);
    if (!ok(L, P, p, x, y, a)) continue;
    const old = [p.cx, p.cy, p.ang, p.placed]; set(p, x, y, a);
    const s = C.evaluate(L, P).total;
    if (s >= cur || Math.random() < Math.exp((s - cur) / T)) { cur = s; if (s > best) { best = s; bestS = mov.map((q) => [q.cx, q.cy, q.ang, q.placed ? 1 : 0]); } }
    else [p.cx, p.cy, p.ang, p.placed] = old;
  }
  return { best, bestS };
}
const file = path.join(__dirname, 'drafts.json');
const out = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : {};
const ids = process.argv[2] ? process.argv[2].split(',') : C.LEVELS.map((l) => l.id);
const iters = +process.argv[3] || 150000, restarts = +process.argv[4] || 3;
for (const d of C.LEVELS) {
  if (!ids.includes(d.id)) continue;
  const L = C.buildLevel(d), t0 = Date.now();
  for (let r = 0; r < restarts; r++) {
    const { best, bestS } = anneal(L, iters), all = bestS.every((s) => s[3]);
    console.log(d.id, 'restart', r, best.toFixed(2), all ? '' : '(unplaced!)', ((Date.now() - t0) / 1000).toFixed(1) + 's');
    if (all && (!out[d.id] || best > out[d.id].score)) out[d.id] = { score: +best.toFixed(2), layout: bestS.map((s) => s.slice(0, 3)) };
  }
  fs.writeFileSync(file, JSON.stringify(out));
}
