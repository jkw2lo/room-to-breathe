/* Room to Breathe - core engine: furniture catalog, floor-plan builder, placement and scoring.
   Shared by the browser game and the offline layout optimiser. One grid cell = 25 cm.
   A piece is { type, cx, cy, ang, placed }: its centre in cells and its angle in degrees (clockwise, 15 degree steps).
   At ang 0 its front faces south. Footprints are rasterised onto the grid, so any angle works with the same rules. */
(function (root) {
'use strict';

const LEVELS = (typeof module !== 'undefined' && module.exports) ? require('./levels.js') : root.RTB_LEVELS;
const CELL_CM = 25;
const OUT = 0, WALL = 1, FLOOR = 2, DOOR = 3, ENTRY = 4, WIN = 5, PILLAR = 6;
const DIRV = [[0, 1], [-1, 0], [0, -1], [1, 0]]; // S W N E
const PERSON = 3; // a person needs a 75 cm square to walk through
const ANG_STEP = 15;

/* ---------------- Furniture catalog ----------------
   w = width across the front, h = depth (cells). tall = can't go under a sloped ceiling.
   kind = what the piece is for (rules key off it). slot = style group: pieces in one slot can be swapped for each other.
   access: sides a person must be able to stand at. zones: clearance that must stay free of furniture. */
const FRONT = { sides: ['front'], need: 1 }, SIDES2 = { sides: ['left', 'right'], need: 1 };
const CAT = {
  // Sleep
  bed_queen:    { name: 'Queen bed', group: 'Sleep', kind: 'bed', slot: 'bed2', w: 6, h: 8, access: { sides: ['left', 'right'], need: 2 }, imp: 3 },
  bed_king:     { name: 'King bed', group: 'Sleep', kind: 'bed', slot: 'bed2', w: 8, h: 8, access: { sides: ['left', 'right'], need: 2 }, imp: 3 },
  bed_platform: { name: 'Platform bed', group: 'Sleep', kind: 'bed', slot: 'bed2', w: 7, h: 9, access: { sides: ['left', 'right'], need: 2 }, imp: 3 },
  bed_canopy:   { name: 'Canopy bed', group: 'Sleep', kind: 'bed', slot: 'bed2', w: 7, h: 9, tall: 1, access: { sides: ['left', 'right'], need: 2 }, imp: 3 },
  bed_single:   { name: 'Single bed', group: 'Sleep', kind: 'bed', slot: 'bed1', w: 4, h: 8, access: SIDES2, imp: 3 },
  daybed:       { name: 'Daybed', group: 'Sleep', kind: 'bed', slot: 'bed1', w: 4, h: 8, access: SIDES2, imp: 3 },
  bunk_bed:     { name: 'Bunk bed', group: 'Kids', kind: 'bed', w: 4, h: 8, tall: 1, access: SIDES2, imp: 3 },
  crib:         { name: 'Crib', group: 'Kids', kind: 'crib', w: 3, h: 5, access: SIDES2, imp: 2 },
  nightstand:   { name: 'Nightstand', group: 'Sleep', kind: 'nightstand', w: 2, h: 2, imp: 1 },
  // Storage
  wardrobe:     { name: 'Wardrobe', group: 'Storage', kind: 'wardrobe', slot: 'wardrobe', w: 6, h: 3, tall: 1, access: FRONT, zones: [['front', 2]], imp: 2 },
  armoire:      { name: 'Armoire', group: 'Storage', kind: 'wardrobe', slot: 'wardrobe', w: 5, h: 3, tall: 1, access: FRONT, zones: [['front', 2]], imp: 2 },
  dresser:      { name: 'Dresser', group: 'Storage', kind: 'dresser', w: 5, h: 2, access: FRONT, zones: [['front', 2]], imp: 1.5 },
  bookshelf:    { name: 'Bookshelf', group: 'Storage', kind: 'bookshelf', slot: 'shelf', w: 4, h: 2, tall: 1, access: FRONT, imp: 1.5 },
  tall_bookcase:{ name: 'Library bookcase', group: 'Reading', kind: 'bookshelf', slot: 'shelf', w: 6, h: 2, tall: 1, access: FRONT, imp: 1.5 },
  shoe_rack:    { name: 'Shoe rack', group: 'Storage', kind: 'shoe_rack', w: 4, h: 2, access: FRONT, imp: 1 },
  sideboard:    { name: 'Sideboard', group: 'Dining', kind: 'sideboard', w: 7, h: 2, access: FRONT, imp: 1 },
  toy_chest:    { name: 'Toy chest', group: 'Kids', kind: 'toy_chest', w: 4, h: 2, access: FRONT, imp: 1 },
  // Living
  couch:        { name: 'Sofa', group: 'Living', kind: 'sofa', slot: 'sofa3', w: 8, h: 4, access: FRONT, imp: 3 },
  chesterfield: { name: 'Chesterfield', group: 'Living', kind: 'sofa', slot: 'sofa3', w: 8, h: 4, access: FRONT, imp: 3 },
  sofa_chaise:  { name: 'Sofa with chaise', group: 'Living', kind: 'sofa', slot: 'sofa3', w: 9, h: 6, access: FRONT, imp: 3 },
  loveseat:     { name: 'Loveseat', group: 'Living', kind: 'sofa', slot: 'sofa2', w: 6, h: 4, access: FRONT, imp: 2 },
  armchair:     { name: 'Armchair', group: 'Living', kind: 'chair', slot: 'chair', w: 3, h: 3, access: FRONT, imp: 1.5 },
  reading_chair:{ name: 'Wingback & ottoman', group: 'Reading', kind: 'chair', slot: 'chair', rule: 'reading', w: 4, h: 5, access: SIDES2, imp: 1.5 },
  rocking_chair:{ name: 'Rocking chair', group: 'Living', kind: 'chair', slot: 'chair', w: 3, h: 4, access: FRONT, imp: 1.5 },
  coffee_table: { name: 'Coffee table', group: 'Living', kind: 'coffee', slot: 'coffee', w: 5, h: 2, imp: 1.5 },
  coffee_round: { name: 'Round coffee table', group: 'Living', kind: 'coffee', slot: 'coffee', w: 4, h: 4, imp: 1.5 },
  ottoman:      { name: 'Tufted ottoman', group: 'Living', kind: 'coffee', slot: 'coffee', w: 3, h: 3, imp: 1.5 },
  side_table:   { name: 'Side table', group: 'Living', kind: 'side_table', w: 2, h: 2, imp: 1 },
  tv:           { name: 'TV console', group: 'Living', kind: 'tv', w: 6, h: 2, imp: 2 },
  rug:          { name: 'Area rug', group: 'Living', kind: 'rug', slot: 'rug', w: 10, h: 7, layer: 'floor', imp: 1 },
  rug_round:    { name: 'Round rug', group: 'Living', kind: 'rug', slot: 'rug', w: 8, h: 8, layer: 'floor', imp: 1 },
  runner:       { name: 'Runner rug', group: 'Decor', kind: 'runner', w: 3, h: 10, layer: 'floor', imp: 1 },
  aquarium:     { name: 'Aquarium', group: 'Pets', kind: 'aquarium', w: 5, h: 2, access: FRONT, imp: 1.5 },
  // Dining & kitchen
  dining_table: { name: 'Dining set (6)', group: 'Dining', kind: 'dining', slot: 'dining', seats: 6, w: 7, h: 6, access: { sides: ['front', 'back'], need: 2 }, imp: 2 },
  dining_round: { name: 'Round dining (4)', group: 'Dining', kind: 'dining', slot: 'dining', seats: 4, w: 6, h: 6, access: { sides: ['front', 'back', 'left', 'right'], need: 2 }, imp: 2 },
  dining_bench: { name: 'Bench dining (6)', group: 'Dining', kind: 'dining', slot: 'dining', seats: 6, w: 8, h: 6, access: { sides: ['front', 'back'], need: 2 }, imp: 2 },
  dining_bistro:{ name: 'Bistro set (2)', group: 'Dining', kind: 'dining', slot: 'dining', seats: 2, w: 4, h: 4, access: { sides: ['left', 'right'], need: 1 }, imp: 2 },
  dining_long:  { name: 'Banquet table (8)', group: 'Dining', kind: 'dining', seats: 8, w: 10, h: 6, access: { sides: ['front', 'back'], need: 2 }, imp: 2 },
  kitchen_island:{ name: 'Kitchen island', group: 'Cooking', kind: 'island', w: 7, h: 4, access: { sides: ['front', 'back'], need: 2 }, imp: 2 },
  wine_rack:    { name: 'Wine rack', group: 'Cooking', kind: 'wine_rack', w: 3, h: 2, tall: 1, access: FRONT, imp: 1 },
  // Work & making
  desk:         { name: 'Work desk', group: 'Work', kind: 'desk', slot: 'desk', w: 5, h: 3, access: FRONT, zones: [['front', 3]], imp: 2 },
  standing_desk:{ name: 'Standing desk', group: 'Work', kind: 'desk', slot: 'desk', w: 6, h: 3, access: FRONT, zones: [['front', 3]], imp: 2 },
  writing_desk: { name: 'Writing desk', group: 'Work', kind: 'desk', slot: 'desk', w: 4, h: 2, access: FRONT, zones: [['front', 3]], imp: 2 },
  sewing_table: { name: 'Sewing table', group: 'Crafts', kind: 'craft', w: 5, h: 3, access: FRONT, zones: [['front', 3]], imp: 1.5 },
  // Light
  floor_lamp:   { name: 'Floor lamp', group: 'Light', kind: 'lamp', slot: 'lamp', w: 2, h: 2, imp: 1, light: 6 },
  arc_lamp:     { name: 'Arc lamp', group: 'Light', kind: 'lamp', slot: 'lamp', w: 2, h: 2, imp: 1, light: 7 },
  ceiling_light:{ name: 'Ceiling light', group: 'Light', kind: 'ceiling', slot: 'ceil', w: 2, h: 2, layer: 'ceiling', imp: 1, light: 11 },
  chandelier:   { name: 'Chandelier', group: 'Light', kind: 'ceiling', slot: 'ceil', w: 3, h: 3, layer: 'ceiling', imp: 1, light: 12 },
  // Decor & plants
  plant:        { name: 'Floor plant', group: 'Plants', kind: 'plant', w: 2, h: 2, imp: 1 },
  plant_shelf:  { name: 'Plant shelf', group: 'Plants', kind: 'plant_shelf', w: 4, h: 2, tall: 1, access: FRONT, imp: 1 },
  mirror:       { name: 'Floor mirror', group: 'Decor', kind: 'mirror', w: 3, h: 1, access: FRONT, imp: 1 },
  piano:        { name: 'Upright piano', group: 'Music', kind: 'piano', w: 6, h: 3, tall: 1, access: FRONT, zones: [['front', 2]], imp: 2 },
  // Fitness & wellness
  treadmill:    { name: 'Treadmill', group: 'Fitness', kind: 'treadmill', w: 3, h: 8, tall: 1, access: { sides: ['back'], need: 1 }, zones: [['back', 4]], imp: 2 },
  exercise_bike:{ name: 'Exercise bike', group: 'Fitness', kind: 'gym', w: 2, h: 5, access: SIDES2, imp: 1.5 },
  rowing_machine:{ name: 'Rowing machine', group: 'Fitness', kind: 'gym', w: 3, h: 9, access: SIDES2, imp: 1.5 },
  weight_bench: { name: 'Weight bench', group: 'Fitness', kind: 'gym', w: 4, h: 6, access: SIDES2, zones: [['left', 2], ['right', 2]], imp: 1.5 },
  punching_bag: { name: 'Punching bag', group: 'Fitness', kind: 'gym', w: 3, h: 3, tall: 1, access: FRONT, zones: [['front', 2], ['left', 2], ['right', 2]], imp: 1.5 },
  yoga_mat:     { name: 'Yoga mat', group: 'Wellness', kind: 'mat', w: 3, h: 7, layer: 'floor', noUnder: 1, imp: 1 },
  meditation:   { name: 'Meditation cushion', group: 'Wellness', kind: 'mat', w: 2, h: 2, layer: 'floor', noUnder: 1, imp: 1 },
  bicycle:      { name: 'Bicycle', group: 'Fitness', kind: 'bicycle', w: 7, h: 2, access: FRONT, imp: 1 },
  // Music
  drum_kit:     { name: 'Drum kit', group: 'Music', kind: 'drums', w: 7, h: 6, access: FRONT, imp: 2 },
  guitar_stand: { name: 'Guitar on stand', group: 'Music', kind: 'guitar', w: 2, h: 2, imp: 1 },
  amp:          { name: 'Guitar amp', group: 'Music', kind: 'amp', w: 2, h: 2, imp: 1 },
  record_player:{ name: 'Record console', group: 'Music', kind: 'vinyl', w: 5, h: 2, access: FRONT, imp: 1.5 },
  // Art
  easel:        { name: 'Easel', group: 'Art', kind: 'easel', w: 3, h: 3, tall: 1, access: FRONT, zones: [['front', 3]], imp: 1.5 },
  drafting_table:{ name: 'Drafting table', group: 'Art', kind: 'drafting', w: 5, h: 4, access: FRONT, zones: [['front', 3]], imp: 1.5 },
  art_cart:     { name: 'Art supply cart', group: 'Art', kind: 'art_cart', w: 2, h: 2, imp: 1 },
  // Gaming
  gaming_desk:  { name: 'Gaming battlestation', group: 'Gaming', kind: 'gaming', w: 6, h: 3, access: FRONT, zones: [['front', 3]], imp: 2 },
  bean_bag:     { name: 'Bean bag', group: 'Gaming', kind: 'chair', rule: 'beanbag', w: 3, h: 3, imp: 1 },
  arcade:       { name: 'Arcade cabinet', group: 'Gaming', kind: 'arcade', w: 3, h: 3, tall: 1, access: FRONT, imp: 1.5 },
  // Pets & kids
  pet_bed:      { name: 'Pet bed', group: 'Pets', kind: 'pet_bed', w: 3, h: 3, imp: 1 },
  cat_tree:     { name: 'Cat tree', group: 'Pets', kind: 'cat_tree', w: 3, h: 3, tall: 1, imp: 1 },
  litter_box:   { name: 'Litter box', group: 'Pets', kind: 'litter', w: 2, h: 2, access: FRONT, imp: 1 },
  play_mat:     { name: 'Play mat', group: 'Kids', kind: 'play_mat', w: 8, h: 8, layer: 'floor', imp: 1 },
  // fixed fixtures (pre-installed, cannot be moved)
  counter:      { name: 'Kitchen counter', group: 'Fixed', kind: 'counter', w: 8, h: 2, fixed: 1, access: FRONT },
  fridge:       { name: 'Fridge', group: 'Fixed', kind: 'fridge', w: 3, h: 3, fixed: 1, tall: 1, access: FRONT },
  tub:          { name: 'Bathtub', group: 'Fixed', kind: 'tub', w: 7, h: 3, fixed: 1, access: FRONT },
  toilet:       { name: 'Toilet', group: 'Fixed', kind: 'toilet', w: 2, h: 3, fixed: 1, access: FRONT },
  vanity:       { name: 'Vanity', group: 'Fixed', kind: 'vanity', w: 3, h: 2, fixed: 1, access: FRONT },
  shower:       { name: 'Shower', group: 'Fixed', kind: 'shower', w: 4, h: 4, fixed: 1, access: FRONT },
  washer:       { name: 'Washer', group: 'Fixed', kind: 'washer', w: 3, h: 3, fixed: 1, access: FRONT },
  fireplace:    { name: 'Fireplace', group: 'Fixed', kind: 'fireplace', w: 3, h: 2, fixed: 1 },
};
for (const k in CAT) { const c = CAT[k]; c.layer = c.layer || 'block'; c.kind = c.kind || k; }
const GROUPS = ['Sleep', 'Living', 'Dining', 'Storage', 'Work', 'Light', 'Plants', 'Decor', 'Reading', 'Music', 'Art', 'Gaming', 'Fitness', 'Wellness', 'Pets', 'Kids', 'Cooking', 'Crafts'];
const slotOptions = (t) => { const s = CAT[t].slot; return s ? Object.keys(CAT).filter((k) => CAT[k].slot === s) : [t]; };
const kindOptions = (t) => Object.keys(CAT).filter((k) => !CAT[k].fixed && (CAT[k].kind === CAT[t].kind || (CAT[t].slot && CAT[k].slot === CAT[t].slot)));

/* ---------------- Level builder ---------------- */
function buildLevel(def) {
  const W = def.W, H = def.H, n = W * H;
  const kind = new Uint8Array(n), room = new Int8Array(n).fill(-1), low = new Uint8Array(n), sky = new Uint8Array(n);
  const rooms = [], doors = [], entries = [], wins = [], winFns = [], pillars = [], errors = [], lows = [], skies = [];
  const set = (x, y, r) => { if (x >= 0 && y >= 0 && x < W && y < H) { kind[y * W + x] = r < 0 ? OUT : FLOOR; room[y * W + x] = r; } };
  const api = {
    room(name, tags) { rooms.push({ name, tags }); return rooms.length - 1; },
    rect(r, x, y, w, h) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, r); },
    tri(x0, y0, s, corner) {
      for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) {
        const di = corner.includes('e') ? s - 1 - i : i, dj = corner.includes('s') ? s - 1 - j : j;
        if (di + dj < s - 1) set(x0 + i, y0 + j, -1);
      }
    },
    cutIf(fn) { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (kind[y * W + x] === FLOOR && fn(x, y)) set(x, y, -1); },
    circle(r, cx, cy, rad, y0, y1, x0 = 0, x1 = W - 1) {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
        if (dx * dx + dy * dy <= rad * rad) set(x, y, r);
      }
    },
    pillar(x, y, w, h) { pillars.push([x, y, w, h]); },
    door(x, y, len, o) { doors.push([x, y, len, o]); },
    entry(x, y, len, o) { entries.push([x, y, len, o]); },
    win(x, y, len, o) { wins.push([x, y, len, o]); },
    winIf(fn) { winFns.push(fn); },
    low(x, y, w, h) { lows.push([x, y, w, h]); },
    sky(x, y, w, h) { skies.push([x, y, w, h]); },
  };
  def.build(api);
  if (def.retag) for (const r of rooms) if (def.retag[r.name]) r.tags = [...r.tags, ...def.retag[r.name]];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (kind[i] === FLOOR) continue;
    let near = false;
    for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) {
      const X = x + dx, Y = y + dy;
      if (X >= 0 && Y >= 0 && X < W && Y < H && kind[Y * W + X] === FLOOR) { near = true; break; }
    }
    if (near) kind[i] = WALL;
  }
  const runCells = ([x, y, len, o]) => { const c = []; for (let k = 0; k < len; k++) c.push(o === 'h' ? [x + k, y] : [x, y + k]); return c; };
  for (const [x, y, w, h] of pillars) for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) { kind[j * W + i] = PILLAR; room[j * W + i] = -1; }
  const mark = (list, k, label) => { for (const d of list) for (const [x, y] of runCells(d)) {
    const i = y * W + x; if (kind[i] !== WALL) errors.push(`${label} at ${x},${y} is not on a wall`); kind[i] = k; } };
  mark(doors, DOOR, 'door'); mark(entries, ENTRY, 'entry'); mark(wins, WIN, 'window');
  for (const fn of winFns) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (kind[y * W + x] === WALL && fn(x, y)) kind[y * W + x] = WIN;
  for (const [x, y, w, h] of lows) for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (kind[j * W + i] === FLOOR) low[j * W + i] = 1;
  for (const [x, y, w, h] of skies) for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (kind[j * W + i] === FLOOR) sky[j * W + i] = 1;

  const noPlace = new Uint8Array(n);
  const isWalk = (k) => k === FLOOR || k === DOOR || k === ENTRY;
  for (let i = 0; i < n; i++) if (kind[i] === DOOR || kind[i] === ENTRY) {
    const x = i % W, y = (i / W) | 0;
    for (const [dx, dy] of DIRV) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < W && Y < H && kind[Y * W + X] === FLOOR) noPlace[Y * W + X] = 1; }
  }
  const swings = [];
  for (const [x, y, len, o] of entries) {
    let dx = 0, dy = 0;
    if (o === 'h') dy = (y + 1 < H && kind[(y + 1) * W + x] === FLOOR) ? 1 : -1;
    else dx = (x + 1 < W && kind[y * W + x + 1] === FLOOR) ? 1 : -1;
    for (let a = 1; a <= len; a++) for (let k = 0; k < len; k++) {
      const X = o === 'h' ? x + k : x + dx * a, Y = o === 'h' ? y + dy * a : y + k;
      if (X >= 0 && Y >= 0 && X < W && Y < H && kind[Y * W + X] === FLOOR) noPlace[Y * W + X] = 1;
    }
    swings.push({ x, y, len, o, dx, dy });
  }
  const seen = new Uint8Array(n), clusters = [];
  for (let i = 0; i < n; i++) if ((kind[i] === DOOR || kind[i] === ENTRY) && !seen[i]) {
    const cells = [], stack = [i]; seen[i] = 1; const rs = new Set();
    while (stack.length) {
      const c = stack.pop(); cells.push(c); const x = c % W, y = (c / W) | 0;
      for (const [dx, dy] of DIRV) {
        const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
        const j = Y * W + X;
        if ((kind[j] === DOOR || kind[j] === ENTRY) && !seen[j]) { seen[j] = 1; stack.push(j); }
        if (kind[j] === FLOOR) rs.add(room[j]);
      }
    }
    let sx = 0, sy = 0; for (const c of cells) { sx += c % W + 0.5; sy += ((c / W) | 0) + 0.5; }
    const xs = cells.map((c) => c % W), horiz = Math.max(...xs) > Math.min(...xs);
    clusters.push({ cells, entry: kind[i] === ENTRY, rooms: [...rs], cx: sx / cells.length, cy: sy / cells.length, horiz });
  }
  for (const r of rooms) r.cells = [];
  for (let i = 0; i < n; i++) if (kind[i] === FLOOR && room[i] >= 0) rooms[room[i]].cells.push(i);
  rooms.forEach((r, ri) => {
    let sx = 0, sy = 0; for (const c of r.cells) { sx += c % W + 0.5; sy += ((c / W) | 0) + 0.5; }
    r.cx = sx / r.cells.length; r.cy = sy / r.cells.length; r.area = r.cells.length * (CELL_CM / 100) ** 2;
    r.service = r.tags.some((t) => t === 'bath' || t === 'hall' || t === 'kitchen');
    r.doors = clusters.filter((c) => c.rooms.includes(ri));
  });
  const bfs = (sources) => {
    const d = new Int16Array(n).fill(999), q = [];
    for (const s of sources) if (d[s] > 0) { d[s] = 0; q.push(s); }
    for (let h = 0; h < q.length; h++) {
      const c = q[h], x = c % W, y = (c / W) | 0;
      for (const [dx, dy] of DIRV) {
        const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
        const j = Y * W + X; if (!isWalk(kind[j]) || d[j] <= d[c] + 1) continue;
        d[j] = d[c] + 1; q.push(j);
      }
    }
    return d;
  };
  const adjTo = (pred, withSky) => { const s = []; for (let i = 0; i < n; i++) if (kind[i] === FLOOR) {
    if (withSky && sky[i]) { s.push(i); continue; }
    const x = i % W, y = (i / W) | 0;
    for (const [dx, dy] of DIRV) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < W && Y < H && pred(kind[Y * W + X])) { s.push(i); break; } } }
    return s; };
  const winDist = bfs(adjTo((k) => k === WIN, true));
  const entryDist = bfs(adjTo((k) => k === ENTRY, false));

  const L = { def, W, H, kind, room, rooms, noPlace, low, sky, clusters, swings, winDist, entryDist, errors, fixtures: [] };
  for (const f of def.fixtures || []) {
    const rot = 'SWNE'.indexOf(f.front);
    const p = { type: f.t, cx: f.x + f.w / 2, cy: f.y + f.h / 2, ang: rot * 90, fixed: true, placed: true, feat: f.feat || '' };
    p.w0 = rot % 2 ? f.h : f.w; p.h0 = rot % 2 ? f.w : f.h;
    L.fixtures.push(p);
    for (const [x, y] of footprint(p).xy) { const i = y * W + x; if (x < 0 || y < 0 || x >= W || y >= H || kind[i] !== FLOOR) errors.push(`${f.t} off the floor at ${x},${y}`); }
  }
  const kSrc = [];
  for (const p of L.fixtures) if (p.type === 'counter' || p.type === 'fridge')
    for (const [x, y] of strip(p, 'front', 1)) if (inb(L, x, y) && kind[y * W + x] === FLOOR) kSrc.push(y * W + x);
  L.kitchenDist = bfs(kSrc);
  L.isKitchenSrc = kSrc.length > 0;
  L.hasFire = L.fixtures.some((p) => p.type === 'fireplace');
  return L;
}

/* ---------------- Geometry ---------------- */
const inb = (L, x, y) => x >= 0 && y >= 0 && x < L.W && y < L.H;
const TRIG = [];
for (let a = 0; a < 360; a++) { const r = a * Math.PI / 180; let c = Math.cos(r), s = Math.sin(r); if (a % 90 === 0) { c = Math.round(c); s = Math.round(s); } TRIG[a] = [c, s]; }
const norm = (a) => ((Math.round(a) % 360) + 360) % 360;
const trig = (a) => TRIG[norm(a)];
function base(p) { const c = CAT[p.type]; return [p.w0 || c.w, p.h0 || c.h]; }
const axis = (ang) => norm(ang) % 90 === 0;
// axis-aligned bounding size at an angle
function dims(p, ang = p.ang) {
  const [w, h] = base(p); if (axis(ang)) return (norm(ang) / 90) % 2 ? [h, w] : [w, h];
  const [c, s] = trig(ang); return [Math.abs(w * c) + Math.abs(h * s), Math.abs(w * s) + Math.abs(h * c)];
}
// snap a centre so axis-aligned pieces sit exactly on the grid and angled pieces on half cells
function snap(p, cx, cy, ang = p.ang) {
  if (axis(ang)) { const [w, h] = dims(p, ang); return [Math.round(cx - w / 2) + w / 2, Math.round(cy - h / 2) + h / 2]; }
  return [Math.round(cx * 2) / 2, Math.round(cy * 2) / 2];
}
function toWorld(p, u, v, cx = p.cx, cy = p.cy, ang = p.ang) {
  const [w0, h0] = base(p), [c, s] = trig(ang), du = u - w0 / 2, dv = v - h0 / 2;
  return [cx + du * c - dv * s, cy + du * s + dv * c];
}
function corners(p, cx = p.cx, cy = p.cy, ang = p.ang, pad = 0) {
  const [w0, h0] = base(p);
  return [[-pad, -pad], [w0 + pad, -pad], [w0 + pad, h0 + pad], [-pad, h0 + pad]].map(([u, v]) => toWorld(p, u, v, cx, cy, ang));
}
// cells covered by a rectangle given in the piece's own frame (u across, v from back to front)
function localCells(p, u0, v0, uw, vh, cx = p.cx, cy = p.cy, ang = p.ang) {
  const [w0, h0] = base(p), [c, s] = trig(ang);
  const pts = [[u0, v0], [u0 + uw, v0], [u0 + uw, v0 + vh], [u0, v0 + vh]].map(([u, v]) => toWorld(p, u, v, cx, cy, ang));
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const out = [], e = 1e-6;
  for (let y = Math.floor(y0 + e); y < Math.ceil(y1 - e); y++) for (let x = Math.floor(x0 + e); x < Math.ceil(x1 - e); x++) {
    let hit = false;
    for (let k = 0; k < 4 && !hit; k++) {
      const px = x + (k & 1 ? 0.75 : 0.25) - cx, py = y + (k & 2 ? 0.75 : 0.25) - cy;
      const u = px * c + py * s + w0 / 2, v = -px * s + py * c + h0 / 2;
      if (u > u0 + e && u < u0 + uw - e && v > v0 + e && v < v0 + vh - e) hit = true;
    }
    if (hit) out.push([x, y]);
  }
  return out;
}
function footprintAt(p, cx, cy, ang) { const [w0, h0] = base(p); return localCells(p, 0, 0, w0, h0, cx, cy, ang); }
function footprint(p) {
  const key = p.type + ',' + p.cx + ',' + p.cy + ',' + p.ang + ',' + (p.w0 || 0);
  if (p._fk !== key) { p._fk = key; const xy = footprintAt(p, p.cx, p.cy, p.ang); p._fp = { xy, key }; }
  return p._fp;
}
const SIDES = { front: [0, 1], back: [0, -1], left: [-1, 0], right: [1, 0] };
function sideVec(p, side) { const [c, s] = trig(p.ang), [a, b] = SIDES[side]; return [a * c - b * s, a * s + b * c]; }
function sideBand(p, side, k) {
  const [w0, h0] = base(p);
  if (side === 'front') return [0, h0, w0, k]; if (side === 'back') return [0, -k, w0, k];
  if (side === 'left') return [-k, 0, k, h0]; return [w0, 0, k, h0];
}
// cells just outside one edge of the piece, k deep
function strip(p, side, k) {
  const own = new Set(footprint(p).xy.map(([x, y]) => x * 4096 + y));
  return localCells(p, ...sideBand(p, side, k)).filter(([x, y]) => !own.has(x * 4096 + y));
}
function zoneCells(p) {
  const c = CAT[p.type], [w0, h0] = base(p), out = [];
  for (const [side, d] of c.zones || []) out.push({ side, d, cells: strip(p, side, d), band: sideBand(p, side, d) });
  void w0; void h0; return out;
}
// distance between two pieces' outlines (0 when touching or overlapping)
function segDist(px, py, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy; let t = l ? ((px - ax) * dx + (py - ay) * dy) / l : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(px - ax - t * dx, py - ay - t * dy); }
function polyOverlap(A, B) {
  for (const P of [A, B]) for (let i = 0; i < 4; i++) {
    const [x1, y1] = P[i], [x2, y2] = P[(i + 1) % 4], nx = y1 - y2, ny = x2 - x1;
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
    for (const [x, y] of A) { const d = x * nx + y * ny; a0 = Math.min(a0, d); a1 = Math.max(a1, d); }
    for (const [x, y] of B) { const d = x * nx + y * ny; b0 = Math.min(b0, d); b1 = Math.max(b1, d); }
    if (a1 <= b0 + 1e-9 || b1 <= a0 + 1e-9) return false;
  }
  return true;
}
function gap(a, b) {
  const A = corners(a), B = corners(b); if (polyOverlap(A, B)) return 0;
  let m = Infinity;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    m = Math.min(m, segDist(A[i][0], A[i][1], B[j][0], B[j][1], B[(j + 1) % 4][0], B[(j + 1) % 4][1]),
      segDist(B[j][0], B[j][1], A[i][0], A[i][1], A[(i + 1) % 4][0], A[(i + 1) % 4][1]));
  }
  return m;
}
function center(p) { return [p.cx, p.cy]; }
function cellSet(xy) { const s = new Set(); for (const [x, y] of xy) s.add(x * 4096 + y); return s; }
function overlapCount(xy, set) { let n = 0; for (const [x, y] of xy) if (set.has(x * 4096 + y)) n++; return n; }
function containsPoint(p, x, y) { const [w0, h0] = base(p), [c, s] = trig(p.ang), px = x - p.cx, py = y - p.cy;
  const u = px * c + py * s + w0 / 2, v = -px * s + py * c + h0 / 2; return u >= 0 && u <= w0 && v >= 0 && v <= h0; }

/* ---------------- Pieces & placement ---------------- */
function makePieces(L) {
  const P = [];
  for (const [t, n] of Object.entries(L.def.items)) for (let k = 0; k < n; k++) P.push({ id: `${t}-${k}`, type: t, cx: 0, cy: 0, ang: 0, placed: false });
  for (const f of L.fixtures) P.push({ ...f, id: `fx-${P.length}` });
  P.forEach((p, i) => { p.idx = i; });
  return P;
}
function occupancy(L, P, skip) {
  const n = L.W * L.H;
  const blk = new Int16Array(n).fill(-1), flr = new Int16Array(n).fill(-1), ceil = new Int16Array(n).fill(-1), noUnder = new Uint8Array(n);
  for (const p of P) {
    if (!p.placed || p === skip) continue;
    const c = CAT[p.type], arr = c.layer === 'block' ? blk : c.layer === 'floor' ? flr : ceil;
    for (const [x, y] of footprint(p).xy) { if (!inb(L, x, y)) continue; const i = y * L.W + x; arr[i] = p.idx; if (c.noUnder) noUnder[i] = 1; }
  }
  return { blk, flr, ceil, noUnder };
}
// returns '' when the spot is fine, otherwise the reason it isn't
function placeProblem(L, occ, p, cx, cy, ang) {
  const c = CAT[p.type], cells = footprintAt(p, cx, cy, ang);
  let why = '';
  for (const [x, y] of cells) {
    if (!inb(L, x, y)) return 'wall';
    const k = y * L.W + x;
    if (L.kind[k] !== FLOOR) return 'wall';
    if (c.layer === 'ceiling') { if (occ.ceil[k] >= 0) why = 'furniture'; continue; }
    if (L.noPlace[k]) return 'door';
    if (c.tall && L.low[k]) return 'low';
    if (c.layer === 'block') { if (occ.blk[k] >= 0 || occ.noUnder[k]) why = 'furniture'; }
    else if (occ.flr[k] >= 0 || (c.noUnder && occ.blk[k] >= 0)) why = 'furniture';
  }
  return why;
}
function canPlace(L, occ, p, cx, cy, ang) { return placeProblem(L, occ, p, cx, cy, ang) === ''; }

/* ---------------- Scoring ---------------- */
function evaluate(L, P) {
  const W = L.W, H = L.H, n = W * H, occ = occupancy(L, P, null);
  const placed = P.filter((p) => p.placed && !p.fixed), movable = P.filter((p) => !p.fixed);
  const placedFrac = movable.length ? placed.length / movable.length : 1;

  // walkability: flood a 75 cm person-square from the front door
  const free = new Uint8Array(n);
  for (let i = 0; i < n; i++) { const k = L.kind[i]; free[i] = (k === FLOOR || k === DOOR || k === ENTRY) && occ.blk[i] < 0 ? 1 : 0; }
  const S = new Int32Array((W + 1) * (H + 1));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
    S[(y + 1) * (W + 1) + x + 1] = free[y * W + x] + S[y * (W + 1) + x + 1] + S[(y + 1) * (W + 1) + x] - S[y * (W + 1) + x];
  const fits = (x, y) => x >= 0 && y >= 0 && x + PERSON <= W && y + PERSON <= H &&
    S[(y + PERSON) * (W + 1) + x + PERSON] - S[y * (W + 1) + x + PERSON] - S[(y + PERSON) * (W + 1) + x] + S[y * (W + 1) + x] === PERSON * PERSON;
  const seen = new Uint8Array(n), q = [];
  for (let y = 0; y <= H - PERSON; y++) for (let x = 0; x <= W - PERSON; x++) {
    if (!fits(x, y)) continue;
    let hit = false;
    for (let j = 0; j < PERSON && !hit; j++) for (let i = 0; i < PERSON; i++) if (L.kind[(y + j) * W + x + i] === ENTRY) { hit = true; break; }
    if (hit) { seen[y * W + x] = 1; q.push(y * W + x); }
  }
  for (let h = 0; h < q.length; h++) {
    const c = q[h], x = c % W, y = (c / W) | 0;
    for (const [dx, dy] of DIRV) { const X = x + dx, Y = y + dy, j = Y * W + X; if (fits(X, Y) && !seen[j]) { seen[j] = 1; q.push(j); } }
  }
  const reach = new Uint8Array(n);
  for (const c of q) { const x = c % W, y = (c / W) | 0; for (let j = 0; j < PERSON; j++) for (let i = 0; i < PERSON; i++) reach[(y + j) * W + x + i] = 1; }

  const issues = [];
  let doorOK = 0;
  for (const cl of L.clusters) { if (cl.cells.some((c) => reach[c])) doorOK++; else issues.push({ kind: 'door', cl, label: 'Doorway cut off', msg: `No clear 75 cm path reaches the doorway into ${cl.rooms.map((r) => L.rooms[r].name).join(' / ')}.` }); }
  const doorFrac = L.clusters.length ? doorOK / L.clusters.length : 1;

  const access = {}; let accSum = 0, accN = 0;
  for (const p of P) {
    if (!p.placed) continue;
    const a = CAT[p.type].access; if (!a) continue;
    let ok = 0; const bad = [];
    for (const side of a.sides) {
      const cells = strip(p, side, 1);
      const hits = cells.filter(([x, y]) => inb(L, x, y) && reach[y * W + x]).length;
      if (hits >= Math.min(2, cells.length)) ok++; else bad.push(side);
    }
    const s = Math.min(1, ok / a.need), wt = p.fixed ? 1 : 1.5;
    access[p.idx] = { s, bad }; accSum += s * wt; accN += wt;
    if (s < 1) issues.push({ kind: 'access', pid: p.idx, label: `${CAT[p.type].name}: hard to reach`,
      msg: a.need > 1 && ok > 0 ? 'Only one side can be reached; both sides should be.' : `There is no 75 cm path to its ${bad.join(' or ')} side.` });
  }
  const accFrac = accN ? accSum / accN : 1;

  let zoneFree = 0, zoneAll = 0;
  for (const p of placed) for (const z of zoneCells(p)) {
    let f = 0; const t = z.cells.length;
    for (const [i, j] of z.cells) {
      if (!inb(L, i, j)) continue; const k = j * W + i;
      if ((L.kind[k] === FLOOR || L.kind[k] === DOOR) && occ.blk[k] < 0) f++;
    }
    zoneFree += f; zoneAll += t;
    if (t && f / t < 0.95) issues.push({ kind: 'zone', pid: p.idx, label: `${CAT[p.type].name}: no elbow room`, msg: zoneMsg(p.type) });
  }
  const zoneFrac = zoneAll ? zoneFree / zoneAll : 1;

  let freeFloor = 0, reachFloor = 0;
  for (let i = 0; i < n; i++) if (L.kind[i] === FLOOR && occ.blk[i] < 0) { freeFloor++; if (reach[i]) reachFloor++; }
  const openFrac = freeFloor ? reachFloor / freeFloor : 1;
  const walk = 0.3 * doorFrac + 0.35 * accFrac + 0.2 * zoneFrac + 0.15 * openFrac;

  // harmony
  const ctx = makeCtx(L, P, occ);
  const rules = [];
  const add = (pid, label, s, w, tip) => rules.push({ pid, label, s: Math.max(0, Math.min(1, s)), w, tip });
  for (const p of movable) {
    if (!p.placed) { add(p.idx, 'Not placed yet', 0, 3 * CAT[p.type].imp, 'Drag it from the tray onto the plan.'); continue; }
    const fn = RULES[CAT[p.type].rule || CAT[p.type].kind]; if (fn) fn(ctx, p, (label, s, w, tip) => add(p.idx, label, s, w, tip));
    if (!axis(p.ang) && CAT[p.type].layer !== 'ceiling') add(p.idx, 'Squared up with the room', ctx.wall(p, 'back').wall >= 0.5 || ctx.support(p, 'back') >= 0.6 ? 1 : 0.3, 2, 'Tilted furniture only works when it lines up with an angled wall or frames a corner. Otherwise square it up.');
    if (ctx.tags(p).includes('hall') && !HALL_OK.includes(CAT[p.type].kind)) add(p.idx, 'Keeps the hallway clear', 0.1, 3, 'Hallways are for walking. Only slim things like a shoe rack, mirror, bike or runner belong here.');
    if (ctx.tags(p).includes('bath') && !BATH_OK.includes(CAT[p.type].kind)) add(p.idx, 'Kept out of the bathroom', 0, 4, 'Bathrooms are for fixtures. Move this piece into a living space.');
  }
  const lit = new Uint8Array(n);
  for (const p of placed) {
    const R = CAT[p.type].light; if (!R) continue;
    const [cx, cy] = center(p), rr = ctx.roomOf(p);
    for (let y = Math.max(0, Math.floor(cy - R)); y < Math.min(H, cy + R); y++) for (let x = Math.max(0, Math.floor(cx - R)); x < Math.min(W, cx + R); x++) {
      const i = y * W + x; if (L.room[i] !== rr || L.kind[i] !== FLOOR) continue;
      if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= R * R) lit[i] = 1;
    }
  }
  L.rooms.forEach((r) => {
    if (r.service) return;
    let l = 0, b = 0; for (const c of r.cells) { if (lit[c]) l++; if (occ.blk[c] >= 0) b++; }
    add(null, `${r.name} is well lit`, (l / r.cells.length) / 0.75, 2.5, 'Ceiling lights cover about 2.75 m around them and floor lamps 1.5 m. Aim to light three quarters of each room.');
    add(null, `${r.name} has breathing room`, (0.65 - b / r.cells.length) / 0.25, 1.5, 'Keep at least half of a room\u2019s floor open. Crowded rooms trap stale energy.');
  });
  for (const sw of L.swings) {
    let f = 0, t = 0;
    for (let a = 1; a <= 8; a++) for (let k = 0; k < sw.len; k++) {
      const X = sw.o === 'h' ? sw.x + k : sw.x + sw.dx * a, Y = sw.o === 'h' ? sw.y + sw.dy * a : sw.y + k;
      if (!inb(L, X, Y) || L.kind[Y * W + X] !== FLOOR) continue; t++; if (occ.blk[Y * W + X] < 0) f++;
    }
    add(null, 'Open, welcoming entry', t ? (f / t - 0.4) / 0.6 : 1, 2, 'Qi enters through the front door. Leave the first two metres inside it open.');
  }
  let hw = 0, hs = 0; for (const r of rules) { hw += r.w; hs += r.w * r.s; }
  const harmony = hw ? hs / hw : 1;
  const pieceScore = {};
  for (const r of rules) if (r.pid != null) { const o = pieceScore[r.pid] || (pieceScore[r.pid] = { w: 0, s: 0 }); o.w += r.w; o.s += r.w * r.s; }
  for (const k in pieceScore) pieceScore[k] = pieceScore[k].s / pieceScore[k].w;

  const pts = { fit: 30 * placedFrac, walk: 30 * walk * placedFrac, harmony: 40 * harmony };
  const total = pts.fit + pts.walk + pts.harmony;
  return { total, pts, placedFrac, placedCount: placed.length, movableCount: movable.length, walk, harmony, rules, issues,
    reach, lit, access, pieceScore, parts: { doorFrac, accFrac, zoneFrac, openFrac } };
}
function zoneMsg(t) {
  return ({ desk: 'Leave 75 cm in front of the desk for the chair.', wardrobe: 'Wardrobe doors need 50 cm to swing open.',
    dresser: 'Drawers need 50 cm in front to pull out.', treadmill: 'Leave 1 m of clear floor behind the belt for safety.',
    weight_bench: 'Leave 50 cm on both sides of the bench for loading plates.', piano: 'Leave room in front for the bench.' })[t] || 'Needs clear space around it.';
}

function makeCtx(L, P, occ) {
  const W = L.W;
  const kindAt = (x, y) => inb(L, x, y) ? L.kind[y * W + x] : OUT;
  const solid = (k) => k === WALL || k === WIN || k === PILLAR || k === OUT;
  const fpSets = new Map();
  const setOf = (q) => { let s = fpSets.get(q); if (!s) { s = cellSet(footprint(q).xy); fpSets.set(q, s); } return s; };
  const ctx = {
    L, P, occ, setOf,
    roomOf(p) { let ri = inb(L, Math.floor(p.cx), Math.floor(p.cy)) ? L.room[Math.floor(p.cy) * W + Math.floor(p.cx)] : -1;
      if (ri < 0) { const f = footprint(p).xy[0]; if (f && inb(L, f[0], f[1])) ri = L.room[f[1] * W + f[0]]; } return ri; },
    tags(p) { const ri = ctx.roomOf(p); return ri >= 0 ? L.rooms[ri].tags : []; },
    inRoom(p, good, ok = [], okScore = 0.55) { const t = ctx.tags(p); if (good.some((g) => t.includes(g))) return 1; if (ok.some((g) => t.includes(g))) return okScore; return 0.15; },
    wall(p, side) { const c = strip(p, side, 1); if (!c.length) return { wall: 0, win: 0 }; let w = 0, win = 0;
      for (const [x, y] of c) { const k = kindAt(x, y); if (solid(k)) w++; if (k === WIN) win++; }
      return { wall: w / c.length, win: win / c.length }; },
    support(p, side) { const c = strip(p, side, 1); if (!c.length) return 0; let s = 0;
      for (const [x, y] of c) { const k = kindAt(x, y); if (solid(k) && k !== WIN) s++; else if (k === FLOOR && occ.blk[y * W + x] >= 0 && occ.blk[y * W + x] !== p.idx) s++; }
      return s / c.length; },
    inLineWithDoor(p, side) {
      const [dx, dy] = sideVec(p, side);
      for (const [sx, sy] of strip(p, side, 1)) { let x = sx + 0.5, y = sy + 0.5;
        for (let s = 0; s < 120; s++) { const k = kindAt(Math.floor(x), Math.floor(y)); if (k === DOOR || k === ENTRY) return true; if (k !== FLOOR) break; x += dx * 0.5; y += dy * 0.5; } }
      return false; },
    seesDoor(p, side) {
      const ri = ctx.roomOf(p); if (ri < 0) return 1; const doors = L.rooms[ri].doors; if (!doors.length) return 1;
      const [fx, fy] = sideVec(p, side); let best = -1;
      for (const d of doors) { const vx = d.cx - p.cx, vy = d.cy - p.cy, m = Math.hypot(vx, vy) || 1; best = Math.max(best, (vx * fx + vy * fy) / m); }
      return best > 0.15 ? 1 : best > -0.35 ? 0.6 : 0.15; },
    nearestGap(p, types, kinds = []) { let best = Infinity; const r = Math.hypot(...base(p)) / 2;
      for (const q of P) if (q.placed && q !== p && (types.includes(q.type) || kinds.includes(CAT[q.type].kind))) {
        if (Math.hypot(q.cx - p.cx, q.cy - p.cy) - r - Math.hypot(...base(q)) / 2 > best) continue; best = Math.min(best, gap(p, q)); }
      return best; },
    near(p, types, maxGap, kinds) { return ctx.nearestGap(p, types, kinds) <= maxGap; },
    has(kind) { return P.some((q) => CAT[q.type].kind === kind); },
    minField(p, field) { let m = 999; for (const [x, y] of footprint(p).xy) if (inb(L, x, y)) m = Math.min(m, field[y * W + x]); return m; },
    corner(p) { let s = 0; for (const side of ['front', 'left', 'back', 'right']) if (ctx.support(p, side) >= 0.5) s++; return s >= 2 ? 1 : s === 1 ? 0.5 : 0.15; },
    facing(a, b) {
      const vx = b.cx - a.cx, vy = b.cy - a.cy, d = Math.hypot(vx, vy) || 1;
      const [fx, fy] = sideVec(a, 'front'), [gx, gy] = sideVec(b, 'front');
      const c1 = (vx * fx + vy * fy) / d, c2 = -(vx * gx + vy * gy) / d;
      if (c1 < 0.5 || c2 < 0.5) return 0;
      const dist = d * CELL_CM / 100, ds = dist >= 1.8 && dist <= 3.6 ? 1 : dist >= 1.2 && dist <= 4.5 ? 0.6 : 0.3;
      return (c1 > 0.85 && c2 > 0.85 ? 1 : 0.6) * ds; },
    blocksWindow(p) { let w = 0; for (const side of ['back', 'left', 'right']) w = Math.max(w, ctx.wall(p, side).win); return w; },
    zoneHit(p, band, kinds) { const cells = localCells(p, ...band); for (const q of P) if (q.placed && q !== p && kinds.includes(CAT[q.type].kind) && overlapCount(cells, setOf(q))) return q; return null; },
  };
  return ctx;
}

const kindOf = (q) => CAT[q.type].kind;
const isK = (q, ...ks) => ks.includes(kindOf(q));
const SEATS = ['sofa', 'chair'];
const BATH_OK = ['plant', 'ceiling', 'mirror', 'litter', 'runner'];
const HALL_OK = ['shoe_rack', 'mirror', 'bicycle', 'runner', 'ceiling', 'plant', 'litter', 'pet_bed'];
const QUIET = ['bedroom', 'kids'];
function metres(c, p, field) { return c.minField(p, field) * CELL_CM / 100; }
function bedRules(c, p, add) {
  add('Sleeps in a bedroom', c.inRoom(p, ['bedroom']), 4, 'Beds belong in a room meant for rest, away from the lounge.');
  const hw = c.wall(p, 'back');
  add('Headboard against a solid wall', hw.wall - hw.win * 0.7, 3, 'A solid wall behind your head gives support. Avoid floating beds and windows behind the headboard.');
  add('Not in the coffin position', c.inLineWithDoor(p, 'front') ? 0 : 1, 2, 'Feet pointing straight out a doorway is the classic feng shui mistake. Shift the bed off the door line.');
  add('Door visible from bed (commanding position)', c.seesDoor(p, 'front'), 2, 'From bed you should see the door without being in line with it, ideally diagonally across the room.');
  const [w0] = base(p); if (w0 < 6 || !c.has('nightstand')) return;
  let l = 0, r = 0;
  for (const q of c.P) if (q.placed && isK(q, 'nightstand')) { const f = footprint(q).xy;
    if (overlapCount(f, cellSet(localCells(p, -2, 0, 2, 3)))) l = 1; if (overlapCount(f, cellSet(localCells(p, w0, 0, 2, 3)))) r = 1; }
  add('Balanced nightstands', (l + r) / 2, 1, 'A matching nightstand on each side of a double bed creates balance for a couple.');
}
function seatRules(c, p, add) {
  add('In the living room', c.inRoom(p, ['living'], ['office', 'dining', 'gaming']), 3, 'The sofa is the heart of the lounge.');
  let s = 0; for (const q of c.P) if (q.placed && isK(q, 'tv', 'fireplace')) s = Math.max(s, c.facing(p, q));
  if (c.has('tv') || c.L.hasFire) add(c.L.hasFire && !c.has('tv') ? 'Gathers round the fireplace' : 'Faces the TV', s, 3, 'Point seating straight at the focal point, 2 to 3.5 m away.');
  const back = c.support(p, 'back');
  add('Solid support behind', back >= 0.7 ? 1 : back >= 0.3 ? 0.7 : 0.35, 2, 'Sofas feel secure with a wall, or at least a console or shelf, behind them.');
  add('Not sitting with its back to the door', c.seesDoor(p, 'front') < 0.3 ? 0.2 : 1, 1, 'Seating that turns its back on the entrance feels uneasy.');
}
function wallRule(c, p, add, label = 'Against a wall', w = 1, tip = 'Give it a wall to lean on.') { add(label, c.wall(p, 'back').wall, w, tip); }
function lightRule(c, p, add, near = 1.5, w = 1, label = 'Natural light', tip = 'Keep it within 1.5 m of a window.') {
  const d = metres(c, p, c.L.winDist); add(label, d <= near ? 1 : d <= near * 2 ? 0.6 : 0.2, w, tip);
}
function activeRule(c, p, add, good = ['gym', 'office', 'living']) {
  add('Active zone, not the bedroom', c.inRoom(p, good, ['hall', 'kids'], 0.6) * (c.tags(p).includes('bedroom') && !c.tags(p).includes('living') ? 0.3 : 1), 2, 'Energetic hobbies are the opposite of what a bedroom needs.');
}
const RULES = {
  bed: bedRules,
  crib(c, p, add) {
    add('In a bedroom or nursery', c.inRoom(p, ['kids', 'bedroom']), 2, 'Babies sleep where it\u2019s quiet.');
    add('Away from windows and radiators', 1 - c.wall(p, 'back').win - c.wall(p, 'left').win * 0.5, 2, 'Keep cribs clear of windows, drafts and blind cords.');
    wallRule(c, p, add);
  },
  nightstand(c, p, add) {
    let s = 0; const f = footprint(p).xy;
    for (const b of c.P) if (b.placed && isK(b, 'bed')) {
      const [w0] = base(b);
      if (overlapCount(f, cellSet(localCells(b, -2, 0, 2, 3))) || overlapCount(f, cellSet(localCells(b, w0, 0, 2, 3)))) s = 1;
      else if (gap(p, b) <= 1) s = Math.max(s, 0.4);
    }
    add('Beside the head of the bed', s, 3, 'Nightstands sit right next to the pillows, within arm\u2019s reach.');
  },
  wardrobe(c, p, add) {
    wallRule(c, p, add, 'Back against a wall', 2, 'Tall storage should stand flat against a wall.');
    add('In a bedroom', c.inRoom(p, ['bedroom'], ['hall', 'office']), 3, 'Clothes storage works best where you dress.');
    add('Keeps windows clear', 1 - c.blocksWindow(p), 1, 'Tall furniture in front of a window blocks light and chi.');
  },
  dresser(c, p, add) {
    wallRule(c, p, add, 'Back against a wall', 2, 'A dresser should stand against a wall.');
    add('In a bedroom', c.inRoom(p, ['bedroom'], ['hall']), 3, 'Clothes storage works best where you dress.');
  },
  bookshelf(c, p, add) {
    wallRule(c, p, add, 'Back against a wall', 3, 'Bookshelves need a wall behind them, both for stability and so they read as part of the room.');
    add('Keeps windows clear', 1 - c.blocksWindow(p), 1, 'Tall furniture in front of a window blocks light.');
    add('In a living room or study', c.inRoom(p, ['living', 'office', 'kids'], ['bedroom', 'hall']), 1, 'Books feel at home where people sit and read.');
  },
  sideboard(c, p, add) {
    wallRule(c, p, add, 'Against a wall', 2);
    add('Next to the dining table', c.near(p, [], 8, ['dining']) ? 1 : 0.3, 2, 'A sideboard holds plates and serving dishes, so keep it within a couple of metres of the table.');
  },
  toy_chest(c, p, add) {
    add('In a kids room', c.inRoom(p, ['kids'], ['living', 'bedroom']), 2, 'Toys live where the kids play.');
    wallRule(c, p, add, 'Against a wall', 1, 'Keep the floor clear for playing.');
  },
  shoe_rack(c, p, add) {
    const d = metres(c, p, c.L.entryDist);
    add('Right by the front door', d <= 2 ? 1 : d <= 4 ? 0.5 : 0.1, 3, 'Shoes come off at the entrance. Keep the rack within 2 m of the door.');
    wallRule(c, p, add, 'Against a wall', 1, 'Tuck it against a wall so it does not trip anyone.');
  },
  sofa: seatRules,
  chair(c, p, add) {
    const s = Math.max(c.near(p, [], 5, ['sofa', 'coffee', 'fireplace']) ? 1 : 0, c.near(p, [], 2, ['lamp']) && c.near(p, [], 6, ['bookshelf']) ? 1 : 0,
      c.near(p, [], 8, ['sofa', 'coffee', 'tv', 'bookshelf', 'desk']) ? 0.5 : 0.1);
    add('Part of a conversation group or reading nook', s, 2, 'Pull chairs close to the sofa and coffee table, or pair one with a lamp and bookshelf.');
    add('In a living space', c.inRoom(p, ['living'], ['bedroom', 'office']), 1, 'Chairs belong where people gather.');
    add('Solid support behind', Math.max(c.support(p, 'back'), 0.4), 1, 'A chair with nothing behind it feels exposed.');
  },
  reading(c, p, add) {
    add('A lamp within reach', c.near(p, [], 1.5, ['lamp']) ? 1 : 0.2, 2, 'Every reading chair needs a lamp right beside it.');
    add('Books close by', c.near(p, [], 4, ['bookshelf']) ? 1 : 0.3, 2, 'Keep the bookcase within a metre or so.');
    lightRule(c, p, add, 2, 1, 'Daylight for reading', 'By a window is the dream reading spot.');
    add('Solid support behind', Math.max(c.support(p, 'back'), 0.3), 1, 'A wingback wants a wall or corner behind it.');
  },
  beanbag(c, p, add) {
    let s = 0; for (const q of c.P) if (q.placed && isK(q, 'tv')) s = Math.max(s, c.facing(p, q));
    add('Faces a screen', Math.max(s, c.near(p, [], 2, ['gaming']) ? 0.8 : 0), 2, 'Bean bags are for gaming and films. Point it at the TV.');
    add('In a living or games room', c.inRoom(p, ['living', 'gaming', 'kids'], ['bedroom', 'office']), 1, 'Keep it where people hang out.');
  },
  coffee(c, p, add) {
    let s = 0; const f = footprint(p).xy;
    for (const q of c.P) if (q.placed && isK(q, 'sofa')) {
      const [w0, h0] = base(q);
      if (overlapCount(f, cellSet(localCells(q, 0, h0 + 1, w0, 3))) >= f.length * 0.5) s = 1;
      else if (overlapCount(f, cellSet(localCells(q, 0, h0, w0, 5)))) s = Math.max(s, 0.5);
    }
    add('In front of the sofa', s, 3, 'A coffee table sits 25 to 75 cm in front of the sofa, centred on it.');
    add('In the living room', c.inRoom(p, ['living']), 1, 'Coffee tables anchor the lounge.');
  },
  side_table(c, p, add) { add('Next to a seat or bed', c.near(p, [], 1, [...SEATS, 'bed']) ? 1 : 0.2, 3, 'Side tables go right beside a seat.'); },
  tv(c, p, add) {
    let s = 0; for (const q of c.P) if (q.placed && isK(q, ...SEATS)) s = Math.max(s, c.facing(q, p));
    add('Faces a seat at a good distance', s, 3, 'Put the TV straight across from the sofa, about 2 to 3.5 m away.');
    wallRule(c, p, add, 'Back against a wall', 2, 'A TV console belongs against a wall so cables stay hidden.');
    add('No window glare', 1 - c.wall(p, 'back').win, 1, 'A window directly behind the screen strains the eyes.');
    add('In the living room, not the bedroom', c.inRoom(p, ['living', 'gaming'], ['office', 'dining']), 2.5, 'Screens in the bedroom disturb sleep energy.');
  },
  rug(c, p, add) {
    const f = footprint(p).xy, fs = cellSet(f);
    const onRug = (...ks) => { let best = 0; for (const q of c.P) if (q.placed && isK(q, ...ks)) { const qf = footprint(q).xy; best = Math.max(best, overlapCount(qf, fs) / qf.length); } return best; };
    let covered = 0; for (const [x, y] of f) if (inb(c.L, x, y) && c.occ.blk[y * c.L.W + x] >= 0) covered++;
    const vis = 1 - covered / f.length;
    let s = 0.1;
    if (onRug('sofa') > 0.1 && onRug('coffee') > 0.6) s = 1;
    else if (onRug('dining') > 0.85) s = 1;
    else if (onRug('bed') > 0.25 && vis > 0.3) s = 1;
    else if (onRug('drums') > 0.5) s = 1;
    else if (onRug('sofa', 'chair', 'coffee', 'desk', 'bed') > 0.15) s = 0.5;
    add('Anchors a furniture group', s, 3, 'A rug belongs under the front legs of the sofa with the coffee table fully on it, fully under a dining set, or poking out around a bed.');
    add('Visible, not buried', vis > 0.3 ? 1 : vis / 0.3, 1, 'If furniture hides almost all of the rug, it isn\u2019t doing anything.');
  },
  runner(c, p, add) {
    add('Along a hallway or beside a bed', c.inRoom(p, ['hall', 'kitchen']) === 1 || c.near(p, [], 0.5, ['bed']) ? 1 : 0.4, 2, 'Runners soften hallways, galley kitchens and the side of a bed.');
  },
  piano(c, p, add) {
    add('Back against a wall', c.wall(p, 'back').wall - c.wall(p, 'back').win, 2, 'Pianos stand against a solid wall, away from windows that swing temperature.');
    add('In a living space', c.inRoom(p, ['living', 'music'], ['office', 'dining']), 1, 'A piano is a gathering point.');
  },
  aquarium(c, p, add) {
    add('In the living area (never the bedroom)', c.inRoom(p, ['living', 'office', 'hall'], ['dining'], 0.6), 2, 'Moving water draws wealth in living spaces but is too active for a bedroom.');
    wallRule(c, p, add, 'Against a wall', 1, 'Tanks are heavy. Give them a wall.');
  },
  desk(c, p, add) {
    add('In a study or office corner', c.inRoom(p, ['office', 'kids'], ['living', 'bedroom'], 0.6), 2, 'Keep work in its own zone, away from the bed if you can.');
    add('Door in view while you work', c.seesDoor(p, 'back'), 2, 'Sitting with your back to the door is the weakest position. Face it or see it from the side.');
    lightRule(c, p, add, 1.5, 1, 'Natural light', 'Place the desk within 1.5 m of a window.');
  },
  gaming(c, p, add) {
    add('In a den, office or living room', c.inRoom(p, ['gaming', 'office', 'living'], ['bedroom', 'kids'], 0.5), 2, 'Keep late-night gaming out of the bedroom if you can.');
    add('No window behind the screens', 1 - c.wall(p, 'back').win, 2, 'Daylight behind a monitor causes glare and eye strain. Put windows to your side.');
    add('Door in view', c.seesDoor(p, 'back'), 1, 'Nobody likes being snuck up on mid-match.');
  },
  craft(c, p, add) {
    lightRule(c, p, add, 2, 2, 'Good daylight', 'Detailed work needs light. Keep it within 2 m of a window.');
    add('A task lamp close by', c.near(p, [], 2, ['lamp']) ? 1 : 0.4, 1, 'Add a lamp for evenings.');
  },
  dining(c, p, add) {
    add('In a dining space', c.inRoom(p, ['dining', 'kitchen'], ['living'], 0.4), 3, 'Eat in the kitchen or a dining zone.');
    const d = metres(c, p, c.L.kitchenDist);
    add('Close to the kitchen', d <= 2 ? 1 : d <= 4 ? 0.6 : 0.2, 2, 'Keep the table within a few steps of the counters.');
    add('Seats the household', (CAT[p.type].seats || 4) >= 4 ? 1 : 0.5, 2, 'A two-seat bistro is cosy, but most homes need four seats or more.');
    if (c.has('ceiling')) add('A light over the table', c.P.some((q) => q.placed && isK(q, 'ceiling') && containsPoint(p, q.cx, q.cy)) ? 1 : 0.5, 1, 'Hang a pendant or chandelier over the table.');
  },
  island(c, p, add) {
    add('In the kitchen', c.inRoom(p, ['kitchen'], ['dining', 'living']), 2, 'Islands belong in the kitchen work zone.');
    const d = metres(c, p, c.L.kitchenDist);
    add('One step from the counters', d <= 1.25 ? 1 : d <= 2 ? 0.6 : 0.2, 2, 'Keep about a metre between the island and the counters: close enough to turn around, wide enough to pass.');
  },
  wine_rack(c, p, add) { wallRule(c, p, add, 'Against a wall', 1); add('Out of the sun', lightDist(c, p) > 1.5 ? 1 : 0.3, 1, 'Sunlight and heat spoil wine. Keep it away from windows.'); },
  lamp(c, p, add) {
    const t = [...SEATS, 'desk', 'bed', 'piano', 'craft', 'drafting', 'easel'];
    add('Lights a seat, bed or desk', c.near(p, [], 1, t) ? 1 : c.near(p, [], 3, t) ? 0.5 : 0.1, 2, 'A floor lamp belongs right beside the seat it lights.');
    add('Tucked into a corner', c.corner(p), 1, 'Lamps glow best in corners, where they also chase away stagnant energy.');
  },
  ceiling(c, p, add) {
    const ri = c.roomOf(p); const r = c.L.rooms[ri];
    const span = Math.sqrt(r.cells.length) / 2, d = Math.hypot(p.cx - r.cx, p.cy - r.cy);
    let share = 1; for (const q of c.P) if (q !== p && q.placed && isK(q, 'ceiling') && c.roomOf(q) === ri && Math.hypot(q.cx - p.cx, q.cy - p.cy) < 8) share = 0.3;
    const overTable = c.P.some((q) => q.placed && isK(q, 'dining', 'island') && containsPoint(q, p.cx, p.cy));
    add('Spreads light evenly', overTable ? 1 : share * (r.service ? 1 : Math.max(0.2, 1 - Math.max(0, d - span * 0.5) / span)), 1.5, 'Hang lights near the centre of a room, over the table, or spread several apart to light different zones.');
  },
  plant(c, p, add) {
    lightRule(c, p, add, 1, 2, 'Near daylight', 'Plants bring wood energy and need light. Keep them within 1 m of a window.');
    add('Softens a corner or edge', c.corner(p), 1, 'Plants soften sharp corners and edges.');
  },
  plant_shelf(c, p, add) { lightRule(c, p, add, 1, 3, 'In the sunniest spot', 'A shelf of plants needs to be right by a window.'); wallRule(c, p, add); },
  mirror(c, p, add) {
    const [w0] = base(p);
    add('Does not reflect the bed', c.zoneHit(p, [-1, 1, w0 + 2, 30], ['bed']) ? 0 : 1, 2, 'A mirror facing the bed is said to disturb sleep.');
    add('Does not face the front door', c.inLineWithDoor(p, 'front') && c.L.clusters.some((cl) => cl.entry) ? 0.2 : 1, 2, 'A mirror facing the entrance bounces good energy straight back out.');
    wallRule(c, p, add, 'Against a wall', 1, 'Lean it against a wall.');
  },
  treadmill(c, p, add) {
    activeRule(c, p, add);
    const [w0, h0] = base(p);
    let view = c.zoneHit(p, [-1, h0, w0 + 2, 16], ['tv']) ? 1 : 0;
    if (metres(c, p, c.L.winDist) <= 1.5 && c.wall(p, 'front').win > 0) view = 1;
    add('Something to look at', view ? 1 : c.wall(p, 'front').wall > 0.5 ? 0.4 : 0.6, 1, 'Face a window or a TV. Staring at a blank wall makes a long run longer.');
  },
  gym(c, p, add) { activeRule(c, p, add, ['gym', 'office', 'living']); lightRule(c, p, add, 2, 1, 'Fresh air nearby', 'A window nearby keeps workouts cool.'); },
  mat(c, p, add) {
    const d = metres(c, p, c.L.winDist);
    add('A calm, bright spot', Math.max(d <= 1.5 ? 1 : d <= 3 ? 0.6 : 0.2, c.near(p, [], 2, ['plant']) ? 0.9 : 0), 2, 'Roll out by a window or next to a plant.');
    add('Away from screens and the kitchen', c.tags(p).includes('kitchen') || c.near(p, [], 6, ['tv', 'gaming']) ? 0.3 : 1, 1, 'Stillness needs distance from cooking smells and screens.');
  },
  bicycle(c, p, add) {
    const d = metres(c, p, c.L.entryDist);
    add('Parked near the entrance', d <= 2.5 ? 1 : d <= 5 ? 0.5 : 0.1, 2, 'Nobody wants to wheel a muddy bike through the flat.');
    wallRule(c, p, add, 'Leaning on a wall', 1, 'Stand it against a wall.');
  },
  drums(c, p, add) {
    add('Away from the bedrooms', c.tags(p).some((t) => QUIET.includes(t)) && !c.tags(p).includes('living') ? 0.1 : 1, 3, 'Drums are loud. Keep them out of the rooms where people sleep.');
    add('On a rug', c.P.some((q) => q.placed && isK(q, 'rug') && overlapCount(footprint(p).xy, c.setOf(q)) > footprint(p).xy.length * 0.5) ? 1 : 0.2, 2, 'A thick rug stops the kit creeping and deadens the sound.');
    add('In a corner', c.corner(p), 1, 'Tuck the kit into a corner so it doesn\u2019t dominate the room.');
  },
  guitar(c, p, add) {
    add('Near a seat or the amp', c.near(p, [], 2, [...SEATS, 'amp', 'bed']) ? 1 : 0.3, 2, 'Keep the guitar where you can grab it and play.');
    add('Out of direct sun', lightDist(c, p) > 1 ? 1 : 0.3, 1, 'Sun and heat warp guitar necks. Keep it back from the window.');
  },
  amp(c, p, add) { add('Next to the instruments', c.near(p, [], 2, ['guitar', 'drums', 'piano']) ? 1 : 0.2, 2, 'Keep the amp beside the guitars.'); wallRule(c, p, add); },
  vinyl(c, p, add) {
    wallRule(c, p, add, 'Against a wall', 2, 'Turntables skip on wobbly floors. Put the console on a wall.');
    add('A listening seat nearby', c.near(p, [], 5, SEATS) ? 1 : 0.3, 2, 'Records are for sitting and listening. Put a chair or sofa within a few steps.');
    add('Out of direct sun', lightDist(c, p) > 1 ? 1 : 0.4, 1, 'Sunlight warps vinyl.');
  },
  easel(c, p, add) {
    lightRule(c, p, add, 1.5, 3, 'Good painting light', 'Painters want steady daylight. Stand the easel within 1.5 m of a window.');
    add('Not in the bedroom', c.inRoom(p, ['office', 'living', 'art'], ['bedroom'], 0.4), 1, 'Paint fumes and sleep don\u2019t mix.');
  },
  drafting(c, p, add) { lightRule(c, p, add, 1.5, 3, 'Good drawing light', 'Put the drafting table right by a window.'); add('A lamp for evenings', c.near(p, [], 2, ['lamp']) ? 1 : 0.4, 1, 'Add a floor lamp beside it.'); },
  art_cart(c, p, add) { add('Beside the easel or table', c.near(p, [], 1, ['easel', 'drafting', 'craft', 'desk']) ? 1 : 0.2, 3, 'Keep supplies within arm\u2019s reach of where you work.'); },
  arcade(c, p, add) { wallRule(c, p, add, 'Against a wall', 2); add('In a games or living room', c.inRoom(p, ['gaming', 'living'], ['office', 'hall']), 2, 'The arcade cabinet is a party piece. Put it where friends gather.'); },
  pet_bed(c, p, add) {
    add('Close to the family', c.near(p, [], 3, [...SEATS, 'bed']) ? 1 : 0.4, 2, 'Pets want to be near their people.');
    add('Out of the kitchen and bathroom', c.tags(p).some((t) => t === 'kitchen' || t === 'bath') ? 0.1 : 1, 1, 'Keep pet beds away from hot stoves and wet floors.');
    add('A cosy corner', c.corner(p), 1, 'Animals feel safest with a wall at their back.');
  },
  cat_tree(c, p, add) { lightRule(c, p, add, 1, 3, 'Window view for bird-watching', 'Cats love a perch at a window.'); wallRule(c, p, add, 'Against a wall', 1, 'Tall cat trees need a wall for stability.'); },
  litter(c, p, add) {
    const d = metres(c, p, c.L.kitchenDist);
    add('Far from where you eat', d >= 4 && !c.near(p, [], 12, ['dining']) ? 1 : 0.2, 3, 'Keep the litter box at least 4 m from the kitchen and dining table.');
    add('In a bathroom, hall or laundry', c.inRoom(p, ['bath', 'hall'], ['office'], 0.5), 1, 'A quiet, tiled room is ideal.');
  },
  play_mat(c, p, add) {
    add('In a kids room or the lounge', c.inRoom(p, ['kids', 'living']), 2, 'Keep play where grown-ups can keep an eye on it.');
    lightRule(c, p, add, 2, 1, 'Sunny spot', 'Kids play best in daylight.');
  },
};
function lightDist(c, p) { return metres(c, p, c.L.winDist); }

const Core = { GROUPS, slotOptions, kindOptions, CELL_CM, K: { OUT, WALL, FLOOR, DOOR, ENTRY, WIN, PILLAR }, DIRV, CAT, LEVELS, RULES, ANG_STEP,
  buildLevel, makePieces, occupancy, canPlace, placeProblem, evaluate, dims, base, snap, footprint, footprintAt, strip, localCells,
  zoneCells, sideBand, corners, center, sideVec, gap, containsPoint, toWorld, norm, axis };
if (typeof module !== 'undefined' && module.exports) module.exports = Core; else root.Core = Core;
})(typeof window !== 'undefined' ? window : globalThis);
