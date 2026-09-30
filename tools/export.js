// Turn optimiser drafts into editable designs.js entries
const C = require('../core.js'); const drafts = require('./drafts.json');
for (const id of process.argv.slice(2)) {
  const d = C.LEVELS.find((l) => l.id === id), L = C.buildLevel(d), P = C.makePieces(L).filter((p) => !p.fixed);
  const rows = drafts[id].layout.map(([cx, cy, ang], i) => { const p = P[i]; p.ang = ang;
    if (ang % 90) return `['${p.type}', ${cx}, ${cy}, ${ang}]`;
    const [w, h] = C.dims(p, ang); return `['${p.type}', ${cx - w / 2}, ${cy - h / 2}, '${'SWNE'[ang / 90]}']`; });
  console.log(`  ${id}: [\n    ${rows.join(', ')},\n  ],`);
}
