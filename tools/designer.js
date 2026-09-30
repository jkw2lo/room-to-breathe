// Hand-made designer layouts. Each entry: [type, x, y, facing] with x,y = top-left of the piece as placed
// and facing = the direction its front faces (S, W, N, E). Writes tools/optimal.json and ../optimal.js.
const C = require('../core.js'), fs = require('fs'), path = require('path');
const DESIGNS = require('./designs.js');
const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const only = process.argv[2]; const verbose = process.argv[3];
const outFile = path.join(__dirname, 'optimal.json');
const out = only && fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile)) : {};
for (const d of C.LEVELS) {
  const plan = DESIGNS[d.id]; if (!plan || (only && only !== d.id)) continue;
  const L = C.buildLevel(d), P = C.makePieces(L), mov = P.filter((p) => !p.fixed), used = new Set(), errs = [];
  for (const p of mov) p.base = p.type;
  for (const [type, x, y, f, style] of plan) {
    const p = mov.find((q) => q.base === type && !used.has(q)); if (!p) { errs.push(`extra ${type}`); continue; } used.add(p);
    if (style) { if (C.slotOptions(type).includes(style)) p.type = style; else errs.push(`${style} is not a style of ${type}`); }
    // facing is a compass letter (x,y = top-left) or an angle in degrees (x,y = centre)
    const ang = typeof f === 'number' ? f : 'SWNE'.indexOf(f) * 90, [w, h] = C.dims(p, ang);
    const cx = typeof f === 'number' ? x : x + w / 2, cy = typeof f === 'number' ? y : y + h / 2, why = C.placeProblem(L, C.occupancy(L, P, p), p, cx, cy, ang);
    p._want = [cx, cy, ang];
    if (why) errs.push(`${type} at ${x},${y} ${f}: ${why}`); else { p.cx = cx; p.cy = cy; p.ang = ang; p.placed = true; }
  }
  for (const p of mov) if (!used.has(p)) errs.push(`missing ${p.type}`);
  // unplaced (blocked) pieces: find the nearest valid spot to the intended one, same facing
  for (const p of mov) if (!p.placed && p._want) { const [cx, cy, ang] = p._want; const occ = C.occupancy(L, P, p);
    let done = false; for (let r = 1; r <= 4 && !done; r++) for (let dy = -r; dy <= r && !done; dy++) for (let dx = -r; dx <= r && !done; dx++)
      if (C.canPlace(L, occ, p, cx + dx, cy + dy, ang)) { p.cx = cx + dx; p.cy = cy + dy; p.ang = ang; p.placed = true; done = true; } }
  // repair: anneal small shifts (max 2 cells from the hand position, same facing) to clear walkway problems,
  // paying for every cell moved so the hand design is kept wherever it already works
  let seed = 1; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const start = mov.map((p) => [p.cx, p.cy]); let bestTry = null;
  for (let attempt = 0; attempt < 6; attempt++) { seed = 1 + attempt * 7919; mov.forEach((p, i) => { [p.cx, p.cy] = start[i]; });
  { const hand = new Map(mov.filter((p) => p.placed).map((p) => [p, [p.cx, p.cy]]));
    const J = () => { const r = C.evaluate(L, P); let d = 0; for (const [p, [hx, hy]] of hand) d += Math.abs(p.cx - hx) + Math.abs(p.cy - hy);
      return r.issues.length * 40 + (30 - r.pts.walk) * 4 + d * 3; };
    let cur = J(), best = cur, bestPos = mov.map((p) => [p.cx, p.cy]);
    const N = +(process.env.REPAIR || 6000);
    for (let it = 0; it < N && C.evaluate(L, P).issues.length; it++) {
      const T = 20 * Math.pow(0.002, it / N);
      const p = mov[Math.floor(rnd() * mov.length)]; if (!hand.has(p)) continue;
      const [hx, hy] = hand.get(p), st = C.axis(p.ang) ? 1 : 0.5;
      const nx = p.cx + (Math.floor(rnd() * 3) - 1) * st, ny = p.cy + (Math.floor(rnd() * 3) - 1) * st;
      if (Math.abs(nx - hx) > 2 || Math.abs(ny - hy) > 2) continue;
      if (!C.canPlace(L, C.occupancy(L, P, p), p, nx, ny, p.ang)) continue;
      const ox = p.cx, oy = p.cy; p.cx = nx; p.cy = ny; const j = J();
      if (j <= cur || rnd() < Math.exp((cur - j) / T)) { cur = j; if (j < best) { best = j; bestPos = mov.map((q) => [q.cx, q.cy]); } } else { p.cx = ox; p.cy = oy; }
    }
    mov.forEach((p, i) => { [p.cx, p.cy] = bestPos[i]; });
    const r = C.evaluate(L, P), key = r.issues.length * 1000 - r.total;
    if (!bestTry || key < bestTry.key) bestTry = { key, pos: mov.map((q) => [q.cx, q.cy]) };
  } }
  mov.forEach((p, i) => { [p.cx, p.cy] = bestTry.pos[i]; });
  // polish: small nudges (max 3 cells from the hand position, same room, same facing) that raise the score
  const home = new Map(mov.filter((p) => p.placed).map((p) => [p, [p.cx, p.cy, L.room[Math.floor(p.cy) * L.W + Math.floor(p.cx)]]]));
  let cur = C.evaluate(L, P).total;
  for (let it = 0; it < (process.env.POLISH || 0); it++) {
    const p = mov[Math.floor(Math.random() * mov.length)]; if (!p.placed) continue;
    const [hx, hy, hr] = home.get(p), nx = p.cx + Math.floor(Math.random() * 3) - 1, ny = p.cy + Math.floor(Math.random() * 3) - 1;
    if (Math.abs(nx - hx) > 3 || Math.abs(ny - hy) > 3 || L.room[Math.floor(ny) * L.W + Math.floor(nx)] !== hr) continue;
    if (!C.canPlace(L, C.occupancy(L, P, p), p, nx, ny, p.ang)) continue;
    const ox = p.cx, oy = p.cy; p.cx = nx; p.cy = ny; const t = C.evaluate(L, P).total;
    if (t >= cur) cur = t; else { p.cx = ox; p.cy = oy; }
  }
  const r = C.evaluate(L, P);
  if (!only || only === d.id) {
    console.log(`== ${d.id}: ${r.total.toFixed(1)} (fit ${r.pts.fit.toFixed(0)} walk ${r.pts.walk.toFixed(1)} harm ${r.pts.harmony.toFixed(1)})`, errs.length ? errs : '');
    for (const x of r.rules.filter((x) => x.s < 0.9)) console.log('   -', x.pid != null ? P[x.pid].id : '', x.label, x.s.toFixed(2), 'w' + x.w);
    if (r.issues.length) console.log('   issues:', r.issues.map((i) => i.label).join('; '));
    if (verbose) { const g = []; for (let y = 0; y < L.H; y++) { g.push([]); for (let x = 0; x < L.W; x++) { const k = L.kind[y * L.W + x]; g[y].push(k === 2 ? (r.reach[y * L.W + x] ? '.' : ' ') : [' ', '#', '.', '+', 'E', '=', 'O'][k]); } }
      P.forEach((p, i) => { if (!p.placed) return; const c = C.CAT[p.type]; for (const [x, y] of C.footprint(p).xy) { if (c.layer === 'block') g[y][x] = p.fixed ? '%' : letters[i % letters.length]; else if (c.layer === 'floor' && (g[y][x] === '.' || g[y][x] === ' ')) g[y][x] = '~'; } });
      console.log(g.map((row, y) => String(y).padStart(3) + ' ' + row.join('')).join('\n')); mov.forEach((p, i) => process.stdout.write(`${letters[i]}=${p.type} `)); console.log(); }
  }
  if (mov.every((p) => p.placed)) out[d.id] = { v: 2, score: +r.total.toFixed(2), layout: mov.map((p) => p.type !== p.base ? [p.cx, p.cy, p.ang, 1, p.type] : [p.cx, p.cy, p.ang]) };
}
fs.writeFileSync(path.join(__dirname, 'optimal.json'), JSON.stringify(out));
fs.writeFileSync(path.join(__dirname, '..', 'optimal.js'), 'window.OPTIMAL = ' + JSON.stringify(out) + ';\n');
console.log('wrote', Object.keys(out).length, 'layouts');
