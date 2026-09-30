(function () {
'use strict';
const C = window.Core, CAT = C.CAT, K = C.K;
const OPT = window.OPTIMAL || {};
const $ = (s) => document.querySelector(s);
const cv = $('#plan'), g = cv.getContext('2d');
const TAU = Math.PI * 2, M = 2; // M = cells of exterior margin drawn around every plan
const now = () => performance.now();

const S = { li: 0, L: null, P: null, res: null, sel: -1, drag: null, rotDrag: null, pending: null, flow: false, light: false, peek: false,
  hover: -1, undo: [], designer: null, mode: 'free', rush: null, fx: [], bg: null };
let cell = 16, T = {};

const store = {
  get() { try { return JSON.parse(localStorage.getItem('rtb-v2')) || {}; } catch (e) { return {}; } },
  set(v) { try { localStorage.setItem('rtb-v2', JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
};
let saved = store.get(); saved.levels = saved.levels || {}; saved.rush = saved.rush || {}; saved.sandbox = saved.sandbox || {};
S.mode = ['rush', 'sandbox'].includes(saved.mode) ? saved.mode : 'free';
let uid = 0;

/* ---------- colour helpers ---------- */
const mixCache = new Map();
function rgb(h) { if (h.startsWith('rgb')) return h.slice(h.indexOf('(') + 1, -1).split(',').slice(0, 3).map(Number); h = h.replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mix(a, b, t) { const k = a + b + t; let v = mixCache.get(k); if (!v) { const A = rgb(a), B = rgb(b); v = `rgb(${A.map((x, i) => Math.round(x + (B[i] - x) * t)).join(',')})`; mixCache.set(k, v); } return v; }
const lt = (c, t = 0.18) => mix(c, '#ffffff', t), dk = (c, t = 0.18) => mix(c, '#000000', t);
function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* ---------- theme ---------- */
function readTheme() {
  const cs = getComputedStyle(document.documentElement), v = (n) => cs.getPropertyValue(n).trim();
  const root = document.documentElement.dataset.theme;
  const dark = root === 'dark' || (root !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  T = { ink: v('--ink'), ink2: v('--ink-2'), ink3: v('--ink-3'), line: v('--line'), jade: v('--jade'), gold: v('--gold'), red: v('--red'),
    wall: v('--wall'), glass: v('--glass'), label: v('--label'), panel: v('--panel'), dark };
  T.floor = dark
    ? { wood: '#3F3529', woodAlt: '#473B2D', woodLine: 'rgba(0,0,0,.38)', carpet: '#37332E', speck: 'rgba(255,255,255,.05)', tileA: '#2D3433', tileB: '#262C2B', grout: 'rgba(0,0,0,.35)', bath: '#28302F', hall: '#43382A', ao: 'rgba(0,0,0,.45)', sun: 'rgba(255,214,140,.10)' }
    : { wood: '#E3CFAC', woodAlt: '#D9C39C', woodLine: 'rgba(120,85,40,.20)', carpet: '#DFD8CC', speck: 'rgba(90,80,60,.10)', tileA: '#EBEEEC', tileB: '#DCE2E0', grout: 'rgba(60,70,70,.16)', bath: '#E3EBEE', hall: '#DDC6A0', ao: 'rgba(40,30,20,.22)', sun: 'rgba(255,230,170,.45)' };
  S.bg = null;
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { readTheme(); renderTray(); draw(); });
new MutationObserver(() => { readTheme(); renderTray(); draw(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

/* ---------- level lifecycle ---------- */
const movable = () => S.P.filter((p) => !p.fixed);
const layoutOf = (P = S.P) => P.filter((p) => !p.fixed).map((p) => [p.cx, p.cy, p.ang, p.placed ? 1 : 0, p.type]);
function applyLayout(P, l) { P.filter((p) => !p.fixed).forEach((p, i) => { const s = l[i]; if (!s) return; [p.cx, p.cy, p.ang] = s; p.placed = s[3] === undefined ? true : !!s[3];
  if (s[4] && CAT[s[4]] && C.slotOptions(p.base || p.type).includes(s[4])) p.type = s[4]; }); }
const rushOn = () => S.mode === 'rush', sandboxOn = () => S.mode === 'sandbox';
const levelList = () => C.LEVELS.map((d, i) => [d, i]).filter(([d]) => (sandboxOn() ? !d.persona : !d.sandboxOnly));
function reindex() { S.P.forEach((p, i) => { p.idx = i; }); }
function newPiece(type) { return { id: `${type}-u${++uid}-${Date.now() % 100000}`, type, cx: 0, cy: 0, ang: 0, placed: false }; }
function sandboxPieces(L, list) { const P = (list || []).filter((e) => CAT[e[0]]).map(([type, cx, cy, ang]) => ({ ...newPiece(type), cx, cy, ang, placed: true })); return [...P, ...L.fixtures.map((f, i) => ({ ...f, id: `fx-${i}` }))]; }
function saveSandbox() { saved.sandbox[C.LEVELS[S.li].id] = movable().filter((p) => p.placed).map((p) => [p.type, p.cx, p.cy, p.ang]); store.set(saved); }

function loadLevel(i) {
  S.li = i; const def = C.LEVELS[i];
  S.L = C.buildLevel(def);
  S.P = sandboxOn() ? sandboxPieces(S.L, saved.sandbox[def.id]) : C.makePieces(S.L); reindex();
  for (const p of S.P) p.base = p.type;
  Object.assign(S, { sel: -1, undo: [], peek: false, pending: null, drag: null, rotDrag: null, fx: [], bg: null, rush: null });
  S.designer = null;
  const o = OPT[def.id];
  if (o && o.v === 2 && !sandboxOn()) { const P2 = C.makePieces(S.L); applyLayout(P2, o.layout); S.designer = { P: P2, score: C.evaluate(S.L, P2).total }; }
  if (rushOn()) setupRush();
  else if (!sandboxOn()) { const sv = saved.levels[def.id]; if (sv && sv.layout) { applyLayout(S.P, sv.layout); sanitize(); } }
  saved.last = i; store.set(saved);
  const list = levelList(), pos = list.findIndex(([, k]) => k === i) + 1;
  $('#lvlMeta').textContent = sandboxOn() ? `Sandbox \u00b7 ${def.persona ? '' : 'plan ' + pos + ' of ' + list.length} \u00b7 unlimited furniture`
    : `${def.persona ? 'Household' : 'Plan'} ${pos} of ${list.length} \u00b7 ${['', 'Easy', 'Medium', 'Hard', 'Expert'][def.diff]} \u00b7 ${movable().length} pieces`;
  $('#lvlName').textContent = def.name;
  $('#lvlBlurb').textContent = def.blurb;
  S.res = C.evaluate(S.L, S.P);
  S.slotConfirm = null; renderLevels(); renderModes(); renderSlots(); resize(); update(false);
}
function sanitize() {
  for (const p of movable()) if (p.placed) { const occ = C.occupancy(S.L, S.P, p); if (!C.canPlace(S.L, occ, p, p.cx, p.cy, p.ang)) p.placed = false; }
}
function starsFor(res) {
  if (res.placedCount < res.movableCount) return 0;
  const opt = S.designer ? S.designer.score : 100, r = res.total / opt;
  return r >= 0.9 ? 3 : r >= 0.75 ? 2 : 1;
}
function update(save = true) {
  S.res = C.evaluate(S.L, S.P);
  if (sandboxOn()) { if (save) saveSandbox(); }
  else if (!rushOn()) {
    const id = C.LEVELS[S.li].id, sv = saved.levels[id] || (saved.levels[id] = {});
    const stars = starsFor(S.res);
    if (save) sv.layout = layoutOf();
    if (stars && (!sv.best || S.res.total > sv.best)) sv.best = +S.res.total.toFixed(1);
    sv.stars = Math.max(sv.stars || 0, stars);
    store.set(saved);
  }
  renderTray(); renderScore(); renderNotes(); renderSel(); renderLevels(); draw();
}
function snapshot() { return sandboxOn() ? movable().filter((p) => p.placed).map((p) => [p.type, p.cx, p.cy, p.ang]) : layoutOf(); }
function pushUndo() { if (rushOn()) return; S.undo.push(snapshot()); if (S.undo.length > 60) S.undo.shift(); }
function undo() {
  if (rushOn()) { toast('No undo on moving day. Keep going!'); return; }
  const l = S.undo.pop(); if (!l) { toast('Nothing to undo.'); return; }
  if (sandboxOn()) { S.P = sandboxPieces(S.L, l); reindex(); } else applyLayout(S.P, l);
  S.sel = -1; update();
}

/* ---------- sizing ---------- */
function resize() {
  const wrap = $('#wrap'), L = S.L; if (!L) return;
  const w = wrap.clientWidth - 16, GW = L.W + 2 * M, GH = L.H + 2 * M;
  let h = window.innerHeight - wrap.getBoundingClientRect().top - window.scrollY - 70;
  if (window.innerWidth < 760) h = Infinity;
  const nc = Math.max(6, Math.min(30, Math.floor(Math.min(w / GW, Math.max(260, h) / GH))));
  if (nc !== cell) S.bg = null;
  cell = nc;
  const dpr = window.devicePixelRatio || 1;
  cv.style.width = GW * cell + 'px'; cv.style.height = GH * cell + 'px';
  cv.width = Math.round(GW * cell * dpr); cv.height = Math.round(GH * cell * dpr);
  resizeScale(); draw();
}
window.addEventListener('resize', () => { S.bg = null; resize(); });

/* ---------- drawing primitives ---------- */
function rr(c, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function box(c, x, y, w, h, r, fill, stroke = true) { rr(c, x, y, w, h, r); c.fillStyle = fill; c.fill(); if (stroke) c.stroke(); }
function shd(c, x, y, w, h, col, t = 0.12) { const gr = c.createLinearGradient(x, y, x + w * 0.35, y + h); gr.addColorStop(0, lt(col, t)); gr.addColorStop(1, dk(col, t)); return gr; }
function sbox(c, x, y, w, h, r, col, stroke = true, t) { box(c, x, y, w, h, r, shd(c, x, y, w, h, col, t), stroke); }
function circ(c, x, y, r, fill, stroke = true) { c.beginPath(); c.arc(x, y, Math.max(0.1, r), 0, TAU); c.fillStyle = fill; c.fill(); if (stroke) c.stroke(); }
function scirc(c, x, y, r, col, stroke = true) { const gr = c.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r); gr.addColorStop(0, lt(col, 0.22)); gr.addColorStop(1, dk(col, 0.1)); circ(c, x, y, r, gr, stroke); }
function line(c, x1, y1, x2, y2) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
function faint(c, a, fn) { c.save(); c.globalAlpha *= a; fn(); c.restore(); }
function glow(c, x, y, r, col, a) { const gr = c.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(1, `rgba(${col},0)`); c.save(); c.fillStyle = gr; c.fillRect(x - r, y - r, r * 2, r * 2); c.restore(); }

const F = {
  wood: '#B98B60', woodD: '#8A6344', woodL: '#DABF98', walnut: '#6E4E38', linen: '#F2ECE1', pillow: '#FBF8F2',
  sofa: '#7E97A9', sage: '#98AA8C', rose: '#CC9A90', ochre: '#D4A65A', metal: '#A7AEB1', steel: '#C9CFD1', dark: '#3A4144', screen: '#1C2224',
  leaf: '#5E8E55', leaf2: '#86B173', leaf3: '#3F6E45', pot: '#C28A6B', potB: '#E9E4DA', water: '#7FB8D0', stone: '#D9DAD5', white: '#F6F6F3',
  brass: '#D6AE5A', piano: '#2C2725', mat: '#9E8AC0', brick: '#A86A55', fire: '255,150,60',
};
const DUVETS = ['#B7CAD6', '#CDB9A4', '#AEC2A5', '#D6B7B1', '#C2BCD6'];
const ACCENT = ['#D4A65A', '#C46B5A', '#5C7F99', '#7E9C6B', '#A58BB0'];
const RUGS = [['#C9B395', '#9DAE9F', '#E8DCC8'], ['#B98A7A', '#E7D7C1', '#6F8391'], ['#8FA3B0', '#E2DCCD', '#C9A46A'], ['#A8B59A', '#F0E8D8', '#7D6B5A']];
const variant = (p, n) => hash(p.id || p.type) % n;

/* Each drawer paints a piece in its own frame: origin top-left, back edge on top, front edge at the bottom (y = H). */
const DRAW = {
  bed_queen(c, W, H, s, p) {
    sbox(c, 0, 0, W, H, s * 0.22, F.wood);
    sbox(c, 0, 0, W, s * 0.62, s * 0.2, F.woodD);
    faint(c, 0.5, () => { c.fillStyle = dk(F.woodD, 0.3); for (let x = s * 0.55; x < W - s * 0.3; x += s * 0.7) { c.beginPath(); c.arc(x, s * 0.31, s * 0.05, 0, TAU); c.fill(); } });
    const pad = s * 0.22;
    sbox(c, pad, s * 0.62, W - pad * 2, H - s * 0.62 - pad, s * 0.28, F.linen, true, 0.05);
    const n = W > 4.5 * s ? 2 : 1, gp = s * 0.28, pw = (W - pad * 2 - gp * (n + 1)) / n;
    for (let i = 0; i < n; i++) { const x = pad + gp + i * (pw + gp); sbox(c, x, s * 0.85, pw, s * 1.25, s * 0.45, F.pillow, true, 0.07); faint(c, 0.25, () => line(c, x + pw * 0.15, s * 1.47, x + pw * 0.85, s * 1.47)); }
    const duv = DUVETS[variant(p, DUVETS.length)], dy = s * 2.45, dh = H - dy - pad;
    sbox(c, pad, dy, W - pad * 2, dh, s * 0.28, duv, true, 0.08);
    c.save(); rr(c, pad, dy, W - pad * 2, dh, s * 0.28); c.clip();
    c.fillStyle = lt(duv, 0.28); c.fillRect(pad, dy, W, s * 0.62);
    faint(c, 0.18, () => { for (let k = -H; k < W + H; k += s * 0.9) line(c, pad + k, dy + s * 0.62, pad + k + dh, dy + s * 0.62 + dh); });
    const acc = ACCENT[variant(p, ACCENT.length)]; c.fillStyle = acc; c.fillRect(pad, H - pad - s * 1.9, W, s * 0.9);
    faint(c, 0.35, () => { c.strokeStyle = lt(acc, 0.4); for (let x = pad; x < W; x += s * 0.35) line(c, x, H - pad - s * 1.9, x, H - pad - s * 1.0); });
    c.restore();
    faint(c, 0.4, () => line(c, pad, dy + s * 0.62, W - pad, dy + s * 0.62));
  },
  bunk_bed(c, W, H, s, p) {
    DRAW.bed_queen(c, W, H, s, p);
    c.save(); c.setLineDash([s * 0.3, s * 0.2]); c.lineWidth *= 1.3; rr(c, s * 0.08, s * 0.08, W - s * 0.16, H - s * 0.16, s * 0.2); c.stroke(); c.restore();
    c.save(); c.strokeStyle = F.woodD; c.lineWidth = s * 0.14; line(c, W - s * 0.15, H * 0.35, W - s * 0.15, H * 0.8); line(c, W - s * 0.6, H * 0.35, W - s * 0.6, H * 0.8);
    for (let y = H * 0.4; y < H * 0.8; y += s * 0.6) line(c, W - s * 0.6, y, W - s * 0.15, y); c.restore();
    for (const [x, y] of [[0, 0], [W - s * 0.45, 0], [0, H - s * 0.45], [W - s * 0.45, H - s * 0.45]]) sbox(c, x, y, s * 0.45, s * 0.45, s * 0.1, F.woodD);
  },
  nightstand(c, W, H, s, p) {
    sbox(c, 0, 0, W, H, s * 0.2, F.woodL);
    faint(c, 0.3, () => line(c, s * 0.15, H - s * 0.3, W - s * 0.15, H - s * 0.3));
    glow(c, W * 0.55, H * 0.42, W * 0.9, '255,214,120', 0.35);
    scirc(c, W * 0.55, H * 0.42, s * 0.5, F.linen); circ(c, W * 0.55, H * 0.42, s * 0.12, F.brass, false);
    c.save(); c.translate(W * 0.25, H * 0.75); c.rotate(-0.25); box(c, -s * 0.3, -s * 0.2, s * 0.6, s * 0.4, s * 0.04, ACCENT[variant(p, 5)]); c.restore();
  },
  wardrobe(c, W, H, s) {
    sbox(c, 0, 0, W, H, s * 0.1, F.wood);
    const n = Math.max(2, Math.round(W / (2.5 * s)));
    for (let i = 0; i < n; i++) sbox(c, (W * i) / n + s * 0.08, s * 0.3, W / n - s * 0.16, H - s * 0.42, s * 0.06, i % 2 ? F.woodL : lt(F.woodL, 0.06), true, 0.06);
    c.save(); c.lineWidth *= 1.8; c.strokeStyle = F.brass; for (let i = 0; i < n; i++) { const x = (W * (i + 0.5)) / n; line(c, x - s * 0.3, H - s * 0.3, x + s * 0.3, H - s * 0.3); } c.restore();
    faint(c, 0.3, () => line(c, s * 0.2, s * 0.2, W - s * 0.2, s * 0.2));
  },
  dresser(c, W, H, s, p) {
    sbox(c, 0, 0, W, H, s * 0.12, F.woodL);
    faint(c, 0.35, () => { line(c, 0, H - s * 0.35, W, H - s * 0.35); for (const f of [0.33, 0.66]) line(c, W * f, H - s * 0.35, W * f, H); });
    for (const f of [0.17, 0.5, 0.83]) circ(c, W * f, H - s * 0.17, s * 0.07, F.brass, false);
    sbox(c, W * 0.1, s * 0.25, s * 0.95, s * 0.7, s * 0.06, F.white);
    faint(c, 0.8, () => { c.fillStyle = '#9FB6C4'; c.fillRect(W * 0.1 + s * 0.12, s * 0.37, s * 0.7, s * 0.46); });
    scirc(c, W * 0.55, s * 0.62, s * 0.25, F.potB); for (let i = 0; i < 5; i++) { const a = i * 1.3; circ(c, W * 0.55 + Math.cos(a) * s * 0.18, s * 0.62 + Math.sin(a) * s * 0.18, s * 0.14, F.leaf2); }
    circ(c, W * 0.82, s * 0.6, s * 0.2, ACCENT[variant(p, 5)]);
  },
  bookshelf(c, W, H, s, p) {
    sbox(c, 0, 0, W, H, s * 0.08, F.walnut);
    const cols = ['#C46B5A', '#5C7F99', '#D9B25E', '#7E9C6B', '#A58BB0', '#E6DCC8', '#556068', '#C98F86'];
    const r = rng(hash(p.id || 'b'));
    let x = s * 0.18, i = 0;
    c.save(); c.lineWidth *= 0.55;
    while (x < W - s * 0.25) {
      if (r() < 0.1 && x < W - s * 0.9) { scirc(c, x + s * 0.3, H * 0.5, s * 0.25, F.potB); circ(c, x + s * 0.3, H * 0.5, s * 0.16, F.leaf2); x += s * 0.65; continue; }
      const bw = s * (0.16 + r() * 0.16), bh = H * (0.5 + r() * 0.35);
      c.fillStyle = shd(c, x, H - bh - s * 0.12, bw, bh, cols[(i * 5 + (r() * 3 | 0)) % cols.length], 0.1);
      c.fillRect(x, H - bh - s * 0.12, bw, bh); c.strokeRect(x, H - bh - s * 0.12, bw, bh); x += bw + (r() < 0.2 ? s * 0.05 : 0); i++;
    }
    c.restore();
  },
  shoe_rack(c, W, H, s) {
    sbox(c, 0, 0, W, H, s * 0.1, F.metal);
    const n = Math.floor(W / (1.3 * s));
    for (let i = 0; i < n; i++) { const x = s * 0.35 + i * (W - s * 0.7) / n; const col = ['#3A4144', '#C46B5A', '#F5F5F2', '#5C7F99'][i % 4];
      for (const dx of [0, s * 0.42]) { c.beginPath(); c.ellipse(x + dx + s * 0.18, H / 2, s * 0.17, H * 0.36, 0, 0, TAU); c.fillStyle = shd(c, x, 0, s * 0.4, H, col, 0.15); c.fill(); c.stroke(); } }
  },
  toy_chest(c, W, H, s, p) {
    sbox(c, 0, 0, W, H, s * 0.15, ['#E3B25B', '#7FA7C5', '#D9897A'][variant(p, 3)]);
    faint(c, 0.4, () => line(c, s * 0.1, s * 0.35, W - s * 0.1, s * 0.35));
    scirc(c, W * 0.25, H * 0.6, s * 0.35, '#C44B3A'); sbox(c, W * 0.5, H * 0.35, s * 0.5, s * 0.5, s * 0.06, '#5C8F5A'); sbox(c, W * 0.68, H * 0.45, s * 0.45, s * 0.45, s * 0.06, '#F0C35A');
  },
  couch(c, W, H, s, p) { sofa(c, W, H, s, 3, F.sofa, p); },
  loveseat(c, W, H, s, p) { sofa(c, W, H, s, 2, F.sage, p); },
  armchair(c, W, H, s, p) { sofa(c, W, H, s, 1, [F.rose, F.ochre, F.sage][variant(p, 3)], p); },
  coffee_table(c, W, H, s, p) {
    sbox(c, 0, 0, W, H, s * 0.5, F.woodL);
    faint(c, 0.18, () => { for (let y = s * 0.35; y < H - s * 0.2; y += s * 0.3) line(c, s * 0.4, y, W - s * 0.4, y + s * 0.05); });
    c.save(); c.translate(W * 0.28, H / 2); c.rotate(-0.18); sbox(c, -s * 0.55, -s * 0.38, s * 1.1, s * 0.76, s * 0.05, '#5C7F99'); c.rotate(0.3); sbox(c, -s * 0.45, -s * 0.3, s * 0.9, s * 0.6, s * 0.05, '#E6DCC8'); c.restore();
    scirc(c, W * 0.62, H / 2, s * 0.22, F.white); circ(c, W * 0.62, H / 2, s * 0.13, '#8A5A3C', false);
    scirc(c, W * 0.82, H / 2, s * 0.26, F.potB); for (let i = 0; i < 6; i++) { const a = i; circ(c, W * 0.82 + Math.cos(a) * s * 0.14, H / 2 + Math.sin(a) * s * 0.14, s * 0.1, F.leaf2); }
    void p;
  },
  side_table(c, W, H, s) { scirc(c, W / 2, H / 2, Math.min(W, H) / 2 - s * 0.05, F.woodL); scirc(c, W / 2, H / 2, s * 0.28, F.white); circ(c, W / 2, H / 2, s * 0.1, F.brass, false); },
  tv(c, W, H, s) {
    sbox(c, 0, 0, W, H, s * 0.1, F.walnut);
    faint(c, 0.3, () => { for (const f of [0.33, 0.66]) line(c, W * f, s * 0.9, W * f, H - s * 0.1); });
    const sg = c.createLinearGradient(0, 0, W, 0); sg.addColorStop(0, '#2A3236'); sg.addColorStop(0.5, '#11171A'); sg.addColorStop(1, '#2A3236');
    box(c, W * 0.07, s * 0.28, W * 0.86, s * 0.3, s * 0.06, sg);
    box(c, W * 0.42, s * 0.58, W * 0.16, s * 0.3, s * 0.05, F.dark);
    box(c, W * 0.2, H - s * 0.75, s * 0.9, s * 0.35, s * 0.08, F.dark);
    scirc(c, W * 0.86, H * 0.66, s * 0.26, F.potB); for (let i = 0; i < 6; i++) circ(c, W * 0.86 + Math.cos(i) * s * 0.16, H * 0.66 + Math.sin(i) * s * 0.16, s * 0.12, F.leaf2);
  },
  rug(c, W, H, s, p) {
    const [a, b, e] = RUGS[variant(p, RUGS.length)], inset = s * 0.35, k = variant(p, 3);
    box(c, inset, 0, W - inset * 2, H, s * 0.1, a);
    c.save(); rr(c, inset, 0, W - inset * 2, H, s * 0.1); c.clip();
    c.strokeStyle = b; c.lineWidth = s * 0.22; rr(c, inset + s * 0.45, s * 0.45, W - inset * 2 - s * 0.9, H - s * 0.9, s * 0.05); c.stroke();
    if (k === 0) { c.fillStyle = b; c.beginPath(); c.moveTo(W / 2, s * 1.3); c.lineTo(W - inset - s * 1.6, H / 2); c.lineTo(W / 2, H - s * 1.3); c.lineTo(inset + s * 1.6, H / 2); c.closePath(); c.fill();
      c.fillStyle = e; c.beginPath(); c.moveTo(W / 2, s * 2.2); c.lineTo(W / 2 + s * 1.6, H / 2); c.lineTo(W / 2, H - s * 2.2); c.lineTo(W / 2 - s * 1.6, H / 2); c.closePath(); c.fill(); }
    else if (k === 1) { c.fillStyle = b; for (let x = inset + s * 1.2; x < W - inset - s; x += s * 1.1) c.fillRect(x, s * 0.9, s * 0.35, H - s * 1.8); c.fillStyle = e; for (let x = inset + s * 1.7; x < W - inset - s; x += s * 2.2) c.fillRect(x, s * 0.9, s * 0.15, H - s * 1.8); }
    else { c.strokeStyle = e; c.lineWidth = s * 0.12; for (let x = inset + s; x < W - inset; x += s) for (let y = s; y < H - s * 0.6; y += s) { c.beginPath(); c.arc(x, y, s * 0.3, 0, TAU); c.stroke(); } }
    c.restore();
    faint(c, 0.55, () => { c.strokeStyle = e; for (let y = s * 0.25; y < H - s * 0.15; y += s * 0.3) { line(c, 0, y, inset, y); line(c, W - inset, y, W, y); } });
  },
  piano(c, W, H, s) {
    c.save(); c.globalAlpha *= 0.9; sbox(c, W * 0.3, H + s * 0.25, W * 0.4, s * 1.1, s * 0.15, F.piano); c.restore();
    sbox(c, 0, 0, W, H, s * 0.12, F.piano, true, 0.2);
    faint(c, 0.5, () => { c.strokeStyle = '#6D6360'; line(c, s * 0.3, s * 0.25, W - s * 0.3, s * 0.25); });
    c.save(); c.fillStyle = F.white; c.fillRect(s * 0.3, H - s * 0.9, W - s * 0.6, s * 0.7); c.strokeRect(s * 0.3, H - s * 0.9, W - s * 0.6, s * 0.7);
    c.fillStyle = F.screen; const kw = (W - s * 0.6) / 28; for (let i = 0; i < 28; i++) if ([1, 2, 4, 5, 6].includes(i % 7)) c.fillRect(s * 0.3 + i * kw - kw * 0.3, H - s * 0.9, kw * 0.6, s * 0.42);
    c.restore();
    sbox(c, W * 0.4, s * 0.45, s * 1.2, s * 0.8, s * 0.04, F.white, true, 0.02);
    glow(c, W * 0.14, s * 0.8, s * 1.1, '255,214,120', 0.35); circ(c, W * 0.14, s * 0.8, s * 0.22, F.brass);
  },
  aquarium(c, W, H, s, p) {
    sbox(c, 0, 0, W, H, s * 0.08, F.dark);
    const wg = c.createLinearGradient(0, 0, 0, H); wg.addColorStop(0, '#9DD0E2'); wg.addColorStop(1, '#4E93AE');
    box(c, s * 0.15, s * 0.15, W - s * 0.3, H - s * 0.3, s * 0.05, wg, false);
    c.save(); c.strokeStyle = F.leaf; c.lineWidth = s * 0.1; for (const x of [0.1, 0.45, 0.88]) { c.beginPath(); c.moveTo(W * x, H - s * 0.2); c.quadraticCurveTo(W * x + s * 0.3, H / 2, W * x, s * 0.3); c.stroke(); } c.restore();
    const r = rng(hash(p.id || 'a'));
    for (let i = 0; i < 4; i++) { const fx = W * (0.2 + r() * 0.6), fy = H * (0.3 + r() * 0.4); c.fillStyle = ['#E8913F', '#F2C94C', '#E05B5B'][i % 3]; c.beginPath(); c.ellipse(fx, fy, s * 0.22, s * 0.1, 0, 0, TAU); c.fill(); c.beginPath(); c.moveTo(fx - s * 0.2, fy); c.lineTo(fx - s * 0.36, fy - s * 0.1); c.lineTo(fx - s * 0.36, fy + s * 0.1); c.fill(); }
    faint(c, 0.7, () => { c.fillStyle = '#fff'; for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(W * 0.7 + (i % 2) * s * 0.1, H * 0.8 - i * s * 0.25, s * 0.05, 0, TAU); c.fill(); } });
  },
  desk(c, W, H, s, p) {
    const cx = W / 2, cy = H + s * 1.15;
    c.save(); c.strokeStyle = F.dark; c.lineWidth = s * 0.1; for (let i = 0; i < 5; i++) { const a = i * TAU / 5 + 0.3; line(c, cx, cy, cx + Math.cos(a) * s * 0.85, cy + Math.sin(a) * s * 0.85); } c.restore();
    sbox(c, cx - s * 0.75, cy - s * 0.7, s * 1.5, s * 1.35, s * 0.5, '#454C50');
    sbox(c, cx - s * 0.85, cy + s * 0.45, s * 1.7, s * 0.4, s * 0.2, '#363C3F');
    sbox(c, 0, 0, W, H, s * 0.12, F.woodL);
    faint(c, 0.15, () => { for (let y = s * 0.3; y < H; y += s * 0.35) line(c, s * 0.2, y, W - s * 0.2, y); });
    sbox(c, W * 0.3, H * 0.45, W * 0.4, s * 0.85, s * 0.08, F.steel);
    const sg = c.createLinearGradient(0, 0, 0, s); sg.addColorStop(0, '#30393D'); sg.addColorStop(1, '#171C1F');
    box(c, W * 0.3, H * 0.45 - s * 0.35, W * 0.4, s * 0.32, s * 0.05, sg);
    faint(c, 0.4, () => { c.strokeStyle = '#8FA0A6'; for (let k = 0; k < 3; k++) line(c, W * 0.34, H * 0.55 + k * s * 0.2, W * 0.66, H * 0.55 + k * s * 0.2); });
    glow(c, W * 0.12, s * 0.55, s * 1.2, '255,214,120', 0.35); scirc(c, W * 0.12, s * 0.55, s * 0.3, F.linen);
    scirc(c, W * 0.86, H * 0.4, s * 0.2, F.white); circ(c, W * 0.86, H * 0.4, s * 0.12, '#8A5A3C', false);
    c.save(); c.translate(W * 0.84, H * 0.75); c.rotate(0.2); sbox(c, -s * 0.35, -s * 0.25, s * 0.7, s * 0.5, s * 0.04, ACCENT[variant(p, 5)]); c.restore();
  },
  dining_table(c, W, H, s, p) {
    const cd = s * 1.1, n = Math.max(2, Math.floor(W / (2.2 * s))), chair = [F.sage, F.woodD, F.rose][variant(p, 3)];
    for (let i = 0; i < n; i++) { const x = W * (i + 0.5) / n - s * 0.7;
      sbox(c, x, s * 0.1, s * 1.4, cd + s * 0.35, s * 0.3, chair); sbox(c, x + s * 0.1, s * 0.05, s * 1.2, s * 0.3, s * 0.12, dk(chair, 0.15));
      sbox(c, x, H - cd - s * 0.45, s * 1.4, cd + s * 0.35, s * 0.3, chair); sbox(c, x + s * 0.1, H - s * 0.35, s * 1.2, s * 0.3, s * 0.12, dk(chair, 0.15)); }
    sbox(c, s * 0.25, cd, W - s * 0.5, H - cd * 2, s * 0.3, F.wood);
    faint(c, 0.7, () => { c.fillStyle = '#EDE6D8'; c.fillRect(s * 0.9, H / 2 - s * 0.35, W - s * 1.8, s * 0.7); });
    for (let i = 0; i < n; i++) { const x = W * (i + 0.5) / n; for (const y of [cd + s * 0.55, H - cd - s * 0.55]) { scirc(c, x, y, s * 0.36, F.white); faint(c, 0.4, () => { c.beginPath(); c.arc(x, y, s * 0.22, 0, TAU); c.stroke(); }); } }
    scirc(c, W / 2, H / 2, s * 0.3, '#DCE8EC'); for (let i = 0; i < 5; i++) circ(c, W / 2 + Math.cos(i * 1.26) * s * 0.2, H / 2 + Math.sin(i * 1.26) * s * 0.2, s * 0.12, ['#E07A5F', '#F2CC8F', '#E6A0B0'][i % 3]);
  },
  floor_lamp(c, W, H, s) {
    glow(c, W / 2, H / 2, W * 1.3, '255,214,120', 0.5);
    circ(c, W * 0.25, H * 0.8, s * 0.2, F.dark);
    scirc(c, W / 2, H / 2, Math.min(W, H) * 0.42, F.linen);
    faint(c, 0.5, () => { c.beginPath(); c.arc(W / 2, H / 2, Math.min(W, H) * 0.28, 0, TAU); c.stroke(); });
    circ(c, W / 2, H / 2, s * 0.14, F.brass, false);
  },
  ceiling_light(c, W, H, s) {
    glow(c, W / 2, H / 2, W * 1.8, '255,220,130', 0.45);
    c.save(); c.setLineDash([s * 0.2, s * 0.15]); circ(c, W / 2, H / 2, W * 0.44, 'rgba(255,248,225,.75)'); c.restore();
    scirc(c, W / 2, H / 2, W * 0.24, '#FFF3CF');
    c.save(); c.lineWidth *= 1.2; for (let a = 0; a < 8; a++) { const an = a * Math.PI / 4; line(c, W / 2 + Math.cos(an) * W * 0.3, H / 2 + Math.sin(an) * W * 0.3, W / 2 + Math.cos(an) * W * 0.4, H / 2 + Math.sin(an) * W * 0.4); } c.restore();
  },
  plant(c, W, H, s, p) {
    const k = variant(p, 3), R = Math.min(W, H) / 2;
    scirc(c, W / 2, H / 2, R * 0.62, k === 1 ? F.potB : F.pot);
    faint(c, 0.4, () => { c.beginPath(); c.arc(W / 2, H / 2, R * 0.5, 0, TAU); c.stroke(); });
    if (k === 0) { // monstera
      for (let i = 0; i < 7; i++) { const a = i * TAU / 7 + 0.4; c.save(); c.translate(W / 2, H / 2); c.rotate(a); c.beginPath(); c.ellipse(R * 0.55, 0, R * 0.5, R * 0.3, 0, 0, TAU);
        c.fillStyle = shd(c, 0, -R * 0.3, R, R * 0.6, i % 2 ? F.leaf : F.leaf3, 0.15); c.fill(); c.stroke();
        faint(c, 0.5, () => { c.strokeStyle = lt(F.leaf2, 0.3); line(c, R * 0.1, 0, R * 0.95, 0); }); c.restore(); }
    } else if (k === 1) { // palm
      c.save(); c.strokeStyle = F.leaf3; for (let i = 0; i < 9; i++) { const a = i * TAU / 9; c.lineWidth = s * 0.14; line(c, W / 2, H / 2, W / 2 + Math.cos(a) * R * 1.05, H / 2 + Math.sin(a) * R * 1.05);
        c.lineWidth = s * 0.05; c.strokeStyle = F.leaf2; for (let t = 0.3; t < 1; t += 0.18) { const x = W / 2 + Math.cos(a) * R * t, y = H / 2 + Math.sin(a) * R * t; line(c, x, y, x + Math.cos(a + 0.9) * R * 0.25, y + Math.sin(a + 0.9) * R * 0.25); line(c, x, y, x + Math.cos(a - 0.9) * R * 0.25, y + Math.sin(a - 0.9) * R * 0.25); } c.strokeStyle = F.leaf3; } c.restore();
    } else { // ficus
      const r = rng(hash(p.id || 'f'));
      for (let i = 0; i < 22; i++) { const a = r() * TAU, d = r() * R * 0.85; scirc(c, W / 2 + Math.cos(a) * d, H / 2 + Math.sin(a) * d, R * (0.16 + r() * 0.1), [F.leaf, F.leaf2, F.leaf3][i % 3], false); }
    }
  },
  mirror(c, W, H, s) {
    sbox(c, 0, 0, W, H, s * 0.12, F.brass);
    const gr = c.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#EEF3F5'); gr.addColorStop(0.5, '#B6C6CD'); gr.addColorStop(1, '#EEF3F5');
    box(c, s * 0.12, s * 0.12, W - s * 0.24, H - s * 0.24, s * 0.06, gr, false);
    c.save(); c.strokeStyle = 'rgba(255,255,255,.9)'; line(c, W * 0.25, H * 0.8, W * 0.4, H * 0.2); line(c, W * 0.45, H * 0.8, W * 0.55, H * 0.2); c.restore();
  },
  treadmill(c, W, H, s) {
    sbox(c, 0, 0, W, H, s * 0.3, F.dark);
    box(c, s * 0.35, s * 0.3, W - s * 0.7, H - s * 1.8, s * 0.15, '#565B5E', false);
    c.save(); c.strokeStyle = '#6E7477'; for (let y = s * 0.6; y < H - s * 1.6; y += s * 0.5) line(c, s * 0.4, y, W - s * 0.4, y); c.restore();
    sbox(c, -s * 0.05, H - s * 1.3, W + s * 0.1, s * 1.1, s * 0.3, F.metal);
    const sg = c.createLinearGradient(0, 0, W, 0); sg.addColorStop(0, '#1C2A33'); sg.addColorStop(1, '#2E4A5A');
    box(c, W * 0.22, H - s * 1.05, W * 0.56, s * 0.55, s * 0.08, sg);
    faint(c, 0.9, () => { c.fillStyle = '#6FE3B5'; c.fillRect(W * 0.3, H - s * 0.85, W * 0.2, s * 0.1); });
  },
  exercise_bike(c, W, H, s) {
    sbox(c, W * 0.1, s * 0.2, W * 0.8, H - s * 0.4, s * 0.3, F.metal);
    scirc(c, W / 2, H * 0.72, s * 0.75, F.dark);
    faint(c, 0.5, () => { c.strokeStyle = '#8A9295'; c.beginPath(); c.arc(W / 2, H * 0.72, s * 0.5, 0, TAU); c.stroke(); });
    sbox(c, W * 0.2, s * 0.4, W * 0.6, s * 0.9, s * 0.3, '#2E3336');
    sbox(c, -s * 0.1, H - s * 0.6, W + s * 0.2, s * 0.35, s * 0.15, F.dark);
  },
  weight_bench(c, W, H, s) {
    c.save(); c.lineWidth *= 2.4; c.strokeStyle = F.steel; line(c, -s * 0.3, s * 1.2, W + s * 0.3, s * 1.2); c.restore();
    for (const x of [-s * 0.1, W - s * 0.35]) sbox(c, x, s * 0.45, s * 0.45, s * 1.5, s * 0.1, F.dark);
    for (const x of [s * 0.6, W - s * 0.9]) sbox(c, x, s * 0.2, s * 0.3, s * 0.5, s * 0.05, F.metal);
    sbox(c, W / 2 - s * 0.6, s * 1.6, s * 1.2, H - s * 2, s * 0.3, '#34464F');
    faint(c, 0.3, () => line(c, W / 2, s * 1.8, W / 2, H - s * 0.6));
    sbox(c, W / 2 - s * 0.9, H - s * 0.6, s * 1.8, s * 0.4, s * 0.15, F.metal);
  },
  yoga_mat(c, W, H, s) {
    sbox(c, 0, s * 0.3, W, H - s * 0.3, s * 0.2, F.mat, true, 0.06);
    faint(c, 0.3, () => { c.strokeStyle = lt(F.mat, 0.4); for (let y = s * 1.2; y < H; y += s * 0.8) line(c, s * 0.3, y, W - s * 0.3, y); });
    const gr = c.createLinearGradient(0, 0, 0, s * 0.75); gr.addColorStop(0, lt(F.mat, 0.3)); gr.addColorStop(1, dk(F.mat, 0.2));
    box(c, -s * 0.05, 0, W + s * 0.1, s * 0.75, s * 0.37, gr);
  },
  bicycle(c, W, H, s) {
    for (const x of [s * 1.1, W - s * 1.1]) { c.save(); c.lineWidth = s * 0.22; c.strokeStyle = F.dark; line(c, x - s * 1.05, H / 2, x + s * 1.05, H / 2); c.restore(); }
    c.save(); c.lineWidth = s * 0.16; c.strokeStyle = '#C46B5A'; line(c, s * 1.1, H / 2, W - s * 1.1, H / 2); c.restore();
    sbox(c, W * 0.36, H / 2 - s * 0.25, s * 0.85, s * 0.5, s * 0.25, F.dark);
    c.save(); c.lineWidth = s * 0.14; line(c, W - s * 1.6, H / 2 - s * 0.75, W - s * 1.6, H / 2 + s * 0.75); c.restore();
  },
  counter(c, W, H, s, p) {
    sbox(c, 0, 0, W, H, s * 0.05, F.stone, true, 0.05);
    const r = rng(hash('c' + W)); faint(c, 0.35, () => { c.fillStyle = '#9DA19C'; for (let i = 0; i < W * H / (s * s) * 4; i++) c.fillRect(r() * W, r() * H, 1, 1); });
    faint(c, 0.4, () => line(c, 0, H - s * 0.15, W, H - s * 0.15));
    const feat = p.feat || '';
    if (feat.includes('sink')) { const x = Math.min(W * 0.14, W - s * 4.4); sbox(c, x, s * 0.3, s * 1.7, H - s * 0.6, s * 0.2, F.steel); box(c, x + s * 0.15, s * 0.45, s * 1.4, H - s * 0.9, s * 0.18, '#AEB6B9', false);
      circ(c, x + s * 0.85, H * 0.55, s * 0.1, F.dark, false); c.save(); c.lineWidth = s * 0.12; c.strokeStyle = F.metal; line(c, x + s * 0.85, s * 0.2, x + s * 0.85, s * 0.6); c.restore(); }
    if (feat.includes('stove')) { const x0 = W - s * 2.6; sbox(c, x0, s * 0.15, s * 2.3, H - s * 0.3, s * 0.08, '#2A2F31');
      const hh = H - s * 0.3; for (const [dx, dy] of [[0.55, 0.28], [1.7, 0.28], [0.55, 0.72], [1.7, 0.72]]) { c.save(); c.strokeStyle = '#8A9194'; c.lineWidth = s * 0.07; c.beginPath(); c.arc(x0 + dx * s, s * 0.15 + dy * hh, s * 0.32, 0, TAU); c.stroke(); c.beginPath(); c.arc(x0 + dx * s, s * 0.15 + dy * hh, s * 0.16, 0, TAU); c.stroke(); c.restore(); } }
    if (W > 7 * s) { const x = W * 0.45; sbox(c, x, s * 0.35, s * 1.2, s * 0.8, s * 0.1, F.woodL); scirc(c, x + s * 1.8, H * 0.45, s * 0.35, '#E9E4DA'); circ(c, x + s * 1.7, H * 0.4, s * 0.12, '#E07A5F', false); circ(c, x + s * 1.9, H * 0.52, s * 0.12, '#F2CC8F', false); }
  },
  fridge(c, W, H, s) { sbox(c, 0, 0, W, H, s * 0.15, F.steel, true, 0.1); line(c, W * 0.55, s * 0.2, W * 0.55, H - s * 0.2); c.save(); c.lineWidth *= 2; line(c, W * 0.45, H - s * 0.25, W * 0.65, H - s * 0.25); c.restore(); },
  tub(c, W, H, s) { sbox(c, 0, 0, W, H, s * 0.3, F.white); const wg = c.createLinearGradient(0, 0, W, H); wg.addColorStop(0, '#DDEEF4'); wg.addColorStop(1, '#BBD8E3'); box(c, s * 0.35, s * 0.3, W - s * 0.7, H - s * 0.6, s * 0.8, wg); circ(c, W - s * 1, H / 2, s * 0.12, F.metal); circ(c, s * 0.25, H / 2, s * 0.12, F.metal, false); },
  toilet(c, W, H, s) { sbox(c, s * 0.05, 0, W - s * 0.1, H * 0.3, s * 0.12, F.white); c.beginPath(); c.ellipse(W / 2, H * 0.62, W * 0.4, H * 0.34, 0, 0, TAU); c.fillStyle = shd(c, 0, H * 0.3, W, H * 0.7, F.white, 0.06); c.fill(); c.stroke(); c.beginPath(); c.ellipse(W / 2, H * 0.64, W * 0.25, H * 0.22, 0, 0, TAU); c.fillStyle = '#E1EEF2'; c.fill(); c.stroke(); },
  vanity(c, W, H, s) { sbox(c, 0, 0, W, H, s * 0.1, F.stone); c.beginPath(); c.ellipse(W / 2, H * 0.55, W * 0.3, H * 0.3, 0, 0, TAU); c.fillStyle = shd(c, 0, 0, W, H, F.white, 0.08); c.fill(); c.stroke(); circ(c, W / 2, s * 0.25, s * 0.1, F.metal); },
  shower(c, W, H, s) { box(c, 0, 0, W, H, s * 0.05, '#DCE6EA'); faint(c, 0.4, () => { for (let i = s * 0.5; i < W; i += s * 0.5) line(c, i, 0, i, H); for (let i = s * 0.5; i < H; i += s * 0.5) line(c, 0, i, W, i); });
    circ(c, W / 2, H / 2, s * 0.25, F.metal); c.save(); c.strokeStyle = '#8FC2D6'; c.lineWidth *= 2.5; line(c, 0, H - s * 0.1, W, H - s * 0.1); c.restore(); },
  washer(c, W, H, s) { sbox(c, 0, 0, W, H, s * 0.15, F.white); scirc(c, W / 2, H / 2 + s * 0.1, Math.min(W, H) * 0.32, '#A9C9D6'); circ(c, W / 2, H / 2 + s * 0.1, Math.min(W, H) * 0.2, '#E9F2F6'); },
  fireplace(c, W, H, s) {
    glow(c, W / 2, H, W * 1.1, F.fire, 0.35);
    sbox(c, 0, 0, W, H, s * 0.08, '#B8AFA3');
    faint(c, 0.35, () => { for (let y = s * 0.35; y < H; y += s * 0.35) line(c, 0, y, W, y); });
    box(c, W * 0.18, s * 0.2, W * 0.64, H * 0.6, s * 0.1, '#2A2422');
    const fg = c.createRadialGradient(W / 2, H * 0.5, 0, W / 2, H * 0.5, W * 0.35); fg.addColorStop(0, '#FFE08A'); fg.addColorStop(0.5, '#F28C38'); fg.addColorStop(1, 'rgba(180,60,30,0)');
    c.save(); c.fillStyle = fg; c.fillRect(W * 0.18, s * 0.2, W * 0.64, H * 0.6); c.restore();
    c.save(); c.strokeStyle = '#5A3A28'; c.lineWidth = s * 0.14; line(c, W * 0.3, H * 0.6, W * 0.7, H * 0.45); line(c, W * 0.3, H * 0.45, W * 0.7, H * 0.6); c.restore();
  },
};
DRAW.bed_single = DRAW.bed_queen;
if (window.RTB_MORE) window.RTB_MORE(DRAW, { sbox, box, circ, scirc, line, faint, glow, shd, rr, lt, dk, F, ACCENT, DUVETS, RUGS, variant, sofa, rng, hash });
function sofa(c, W, H, s, seats, col, p) {
  const arm = Math.min(s * 0.8, W * 0.2), back = Math.min(s * 1.1, H * 0.3);
  sbox(c, 0, 0, W, H, s * 0.4, dk(col, 0.14));
  sbox(c, arm * 0.5, 0, W - arm, back + s * 0.1, s * 0.35, col);
  const cw = (W - arm * 2) / seats;
  for (let i = 0; i < seats; i++) { const x = arm + i * cw + s * 0.05; sbox(c, x, back - s * 0.05, cw - s * 0.1, H - back - s * 0.15, s * 0.3, lt(col, 0.05), true, 0.1);
    faint(c, 0.2, () => line(c, x + s * 0.2, H - s * 0.45, x + cw - s * 0.3, H - s * 0.45)); }
  sbox(c, 0, s * 0.2, arm, H - s * 0.2, s * 0.35, dk(col, 0.05)); sbox(c, W - arm, s * 0.2, arm, H - s * 0.2, s * 0.35, dk(col, 0.05));
  const acc = ACCENT[variant(p, ACCENT.length)];
  const pil = (x, rot) => { c.save(); c.translate(x, back + s * 0.35); c.rotate(rot); sbox(c, -s * 0.45, -s * 0.4, s * 0.9, s * 0.8, s * 0.25, acc, true, 0.15); c.restore(); };
  if (seats >= 2) { pil(arm + s * 0.6, -0.35); pil(W - arm - s * 0.6, 0.35); } else pil(W / 2, 0.1);
}

function paintPiece(c, p, s, o = {}) {
  const cx = o.cx != null ? o.cx : p.cx, cy = o.cy != null ? o.cy : p.cy, ang = o.ang != null ? o.ang : p.ang;
  const [w0, h0] = C.base(p);
  c.save();
  c.translate(cx * s, cy * s); c.rotate(ang * Math.PI / 180);
  if (p._t && !o.noAnim) { const t = (now() - p._t) / 280; if (t < 1) { const k = 1 + 0.12 * (1 - t) * (1 - t); c.scale(k, k); S.anim = true; } }
  c.translate(-w0 * s / 2, -h0 * s / 2);
  c.lineWidth = Math.max(0.7, s * 0.06); c.strokeStyle = o.stroke || (T.dark ? '#161B19' : '#2E322F'); c.lineJoin = 'round'; c.lineCap = 'round';
  if (o.alpha != null) c.globalAlpha = o.alpha;
  if (CAT[p.type].layer === 'block' && !o.flat) { c.save(); c.shadowColor = T.dark ? 'rgba(0,0,0,.55)' : 'rgba(30,35,25,.3)'; c.shadowBlur = s * 0.7; c.shadowOffsetX = s * 0.12; c.shadowOffsetY = s * 0.22;
    rr(c, s * 0.1, s * 0.1, w0 * s - s * 0.2, h0 * s - s * 0.2, s * 0.25); c.fillStyle = 'rgba(0,0,0,.35)'; c.fill(); c.restore(); }
  (DRAW[p.type] || ((cc, W, H) => box(cc, 0, 0, W, H, 2, '#ccc')))(c, w0 * s, h0 * s, s, p);
  c.restore();
}

/* ---------- background: exterior, floors, light, walls (cached per level, size and theme) ---------- */
function tile(w, h, fn) { const dpr = window.devicePixelRatio || 1, t = document.createElement('canvas'); t.width = Math.ceil(w * dpr); t.height = Math.ceil(h * dpr); const x = t.getContext('2d'); x.scale(dpr, dpr); fn(x); return t; }
function pattern(ctx, t) { const p = ctx.createPattern(t, 'repeat'); const dpr = window.devicePixelRatio || 1; if (p.setTransform) p.setTransform(new DOMMatrix([1 / dpr, 0, 0, 1 / dpr, 0, 0])); return p; }
function floorPatterns(ctx, s) {
  const f = T.floor;
  const parquet = tile(2 * s, 2 * s, (x) => {
    for (let q = 0; q < 4; q++) { const ox = (q % 2) * s, oy = (q >> 1) * s, vert = (q === 1 || q === 2);
      for (let k = 0; k < 3; k++) { x.fillStyle = (q + k) % 2 ? f.wood : f.woodAlt;
        if (vert) x.fillRect(ox + k * s / 3, oy, s / 3, s); else x.fillRect(ox, oy + k * s / 3, s, s / 3); }
      x.strokeStyle = f.woodLine; x.lineWidth = 1;
      for (let k = 0; k <= 3; k++) { x.beginPath(); if (vert) { x.moveTo(ox + k * s / 3, oy); x.lineTo(ox + k * s / 3, oy + s); } else { x.moveTo(ox, oy + k * s / 3); x.lineTo(ox + s, oy + k * s / 3); } x.stroke(); } }
  });
  const planks = tile(4 * s, s, (x) => {
    for (let r = 0; r < 2; r++) { x.fillStyle = r ? f.hall : mix(f.hall, '#000000', 0.04); x.fillRect(0, r * s / 2, 4 * s, s / 2); }
    x.strokeStyle = f.woodLine; x.lineWidth = 1; x.beginPath(); x.moveTo(0, 0.5); x.lineTo(4 * s, 0.5); x.moveTo(0, s / 2); x.lineTo(4 * s, s / 2);
    x.moveTo(s * 1.3, 0); x.lineTo(s * 1.3, s / 2); x.moveTo(s * 3.1, s / 2); x.lineTo(s * 3.1, s); x.stroke();
  });
  const carpet = tile(3 * s, 3 * s, (x) => { x.fillStyle = f.carpet; x.fillRect(0, 0, 3 * s, 3 * s); const r = rng(7); x.fillStyle = f.speck; for (let i = 0; i < 9 * s * 2; i++) x.fillRect(r() * 3 * s, r() * 3 * s, 1.2, 1.2); });
  const checker = tile(4 * s, 4 * s, (x) => { for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { x.fillStyle = (i + j) % 2 ? f.tileA : f.tileB; x.fillRect(i * 2 * s, j * 2 * s, 2 * s, 2 * s); }
    x.strokeStyle = f.grout; x.lineWidth = 1; x.strokeRect(0.5, 0.5, 2 * s, 2 * s); x.strokeRect(2 * s + 0.5, 2 * s + 0.5, 2 * s, 2 * s); });
  const mosaic = tile(s, s, (x) => { x.fillStyle = f.bath; x.fillRect(0, 0, s, s); x.strokeStyle = f.grout; x.lineWidth = 1; x.beginPath(); x.moveTo(0, 0.5); x.lineTo(s, 0.5); x.moveTo(0.5, 0); x.lineTo(0.5, s); x.moveTo(0, s / 2); x.lineTo(s, s / 2); x.moveTo(s / 2, 0); x.lineTo(s / 2, s); x.stroke(); });
  return { parquet: pattern(ctx, parquet), planks: pattern(ctx, planks), carpet: pattern(ctx, carpet), checker: pattern(ctx, checker), mosaic: pattern(ctx, mosaic) };
}
function floorKind(tags) {
  if (tags.includes('bath')) return 'mosaic';
  if (tags.includes('kitchen')) return 'checker';
  if (tags.includes('hall')) return 'planks';
  if (tags.includes('bedroom') && !tags.includes('living')) return 'carpet';
  return 'parquet';
}
const OUTSIDE = {
  garden: { light: ['#B9CBA1', '#A8BD8E'], dark: ['#1C281D', '#223023'] },
  street: { light: ['#D5D5CF', '#C6C6BF'], dark: ['#1A1E1E', '#222727'] },
  water: { light: ['#9CC7D6', '#8BBACB'], dark: ['#0F2D38', '#133845'] },
  city: { light: ['#D0CCC4', '#C2BDB3'], dark: ['#1B1D1C', '#232625'] },
  roof: { light: ['#C98A6C', '#B97A5E'], dark: ['#3A2620', '#442C24'] },
};
function buildBg() {
  const L = S.L, s = cell, GW = L.W + 2 * M, GH = L.H + 2 * M, dpr = window.devicePixelRatio || 1;
  const bg = document.createElement('canvas'); bg.width = Math.round(GW * s * dpr); bg.height = Math.round(GH * s * dpr);
  const c = bg.getContext('2d'); c.scale(dpr, dpr);
  const theme = L.def.outside || 'street', [o1, o2] = OUTSIDE[theme][T.dark ? 'dark' : 'light'], r = rng(hash(L.def.id));
  // exterior
  c.fillStyle = o1; c.fillRect(0, 0, GW * s, GH * s);
  const outCell = (x, y) => { const X = x - M, Y = y - M; return X < 0 || Y < 0 || X >= L.W || Y >= L.H || L.kind[Y * L.W + X] === K.OUT; };
  const distB = new Int16Array(GW * GH).fill(99), q = [];
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (!outCell(x, y)) { distB[y * GW + x] = 0; q.push(y * GW + x); }
  for (let h = 0; h < q.length; h++) { const i = q[h], x = i % GW, y = (i / GW) | 0; for (const [dx, dy] of C.DIRV) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= GW || Y >= GH) continue; const j = Y * GW + X; if (distB[j] > distB[i] + 1) { distB[j] = distB[i] + 1; q.push(j); } } }
  c.save();
  if (theme === 'garden') { c.fillStyle = o2; for (let i = 0; i < GW * GH * 3; i++) c.fillRect(r() * GW * s, r() * GH * s, 1.5, s * 0.25); }
  if (theme === 'street' || theme === 'city') { c.strokeStyle = o2; c.lineWidth = 1; for (let x = 0; x <= GW; x += theme === 'city' ? 3 : 2) line(c, x * s, 0, x * s, GH * s); for (let y = 0; y <= GH; y += theme === 'city' ? 3 : 2) line(c, 0, y * s, GW * s, y * s);
    if (theme === 'city') { c.fillStyle = o2; for (let i = 0; i < GW * GH * 2; i++) c.fillRect(r() * GW * s, r() * GH * s, 1.3, 1.3); } }
  if (theme === 'water') { c.strokeStyle = o2; c.lineWidth = Math.max(1, s * 0.08); for (let i = 0; i < GW * GH / 5; i++) { const x = r() * GW * s, y = r() * GH * s; c.beginPath(); c.arc(x, y, s * 0.6, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); } }
  if (theme === 'roof') { c.strokeStyle = o2; c.lineWidth = 1; for (let y = 0; y < GH * 2; y++) { line(c, 0, y * s / 2, GW * s, y * s / 2); for (let x = (y % 2) * 0.5; x < GW; x += 1) line(c, x * s, y * s / 2, x * s, (y + 1) * s / 2); } }
  c.restore();
  if (theme === 'garden' || theme === 'street') {
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { const d = distB[y * GW + x]; if (d < 2) continue;
      if (theme === 'garden' && r() < (d >= 3 ? 0.05 : 0.025)) tree(c, (x + 0.5) * s, (y + 0.5) * s, s * (d >= 3 ? 1 + r() * 0.8 : 0.6), r);
      if (theme === 'street' && d >= 2 && r() < 0.012) tree(c, (x + 0.5) * s, (y + 0.5) * s, s * 0.9, r); }
  }
  c.save(); c.translate(M * s, M * s);
  // floors
  const pats = floorPatterns(c, s);
  for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) {
    const i = y * L.W + x, k = L.kind[i]; if (k !== K.FLOOR && k !== K.DOOR && k !== K.ENTRY) continue;
    let ri = L.room[i]; if (ri < 0) ri = neighborRoom(x, y);
    c.fillStyle = pats[floorKind(ri >= 0 ? L.rooms[ri].tags : [])]; c.fillRect(x * s, y * s, s + 0.6, s + 0.6);
  }
  const floorPath = new Path2D(); for (let i = 0; i < L.W * L.H; i++) if (L.kind[i] === K.FLOOR) floorPath.rect((i % L.W) * s, ((i / L.W) | 0) * s, s + 0.5, s + 0.5);
  c.save(); c.clip(floorPath);
  // daylight pools through windows and skylights
  for (let i = 0; i < L.W * L.H; i++) if (L.kind[i] === K.WIN) {
    const x = i % L.W, y = (i / L.W) | 0;
    for (const [dx, dy] of C.DIRV) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= L.W || Y >= L.H || L.kind[Y * L.W + X] !== K.FLOOR) continue;
      const gr = c.createLinearGradient((x + 0.5) * s, (y + 0.5) * s, (x + 0.5 + dx * 5) * s, (y + 0.5 + dy * 5) * s);
      gr.addColorStop(0, T.floor.sun); gr.addColorStop(1, 'rgba(255,230,170,0)'); c.fillStyle = gr;
      c.fillRect(Math.min(x, x + dx * 5) * s - s * 0.6, Math.min(y, y + dy * 5) * s - s * 0.6, (Math.abs(dx) * 5 + 1) * s + s * 1.2, (Math.abs(dy) * 5 + 1) * s + s * 1.2); }
  }
  for (const [x, y, w, h] of components(L.sky)) { const gr = c.createRadialGradient((x + w / 2) * s, (y + h / 2) * s, 0, (x + w / 2) * s, (y + h / 2) * s, Math.max(w, h) * s * 1.1); gr.addColorStop(0, T.floor.sun); gr.addColorStop(1, 'rgba(255,230,170,0)'); c.fillStyle = gr; c.fillRect((x - w) * s, (y - h) * s, w * 3 * s, h * 3 * s); }
  // ambient occlusion along walls
  const ao = s * 0.7;
  for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) { if (L.kind[y * L.W + x] !== K.FLOOR) continue;
    for (const [dx, dy] of C.DIRV) { const X = x + dx, Y = y + dy; const k = X < 0 || Y < 0 || X >= L.W || Y >= L.H ? K.OUT : L.kind[Y * L.W + X];
      if (k !== K.WALL && k !== K.WIN && k !== K.PILLAR && k !== K.OUT) continue;
      const ex = dx > 0 ? (x + 1) * s : x * s, ey = dy > 0 ? (y + 1) * s : y * s;
      const gr = dx ? c.createLinearGradient(ex, 0, ex - dx * ao, 0) : c.createLinearGradient(0, ey, 0, ey - dy * ao);
      gr.addColorStop(0, T.floor.ao); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr;
      if (dx) c.fillRect(dx > 0 ? ex - ao : ex, y * s, ao, s); else c.fillRect(x * s, dy > 0 ? ey - ao : ey, s, ao); } }
  // low ceiling
  if (L.low.some((v) => v)) { c.save(); c.strokeStyle = T.dark ? 'rgba(255,255,255,.07)' : 'rgba(70,50,30,.13)'; c.lineWidth = Math.max(1, s * 0.12);
    for (let i = 0; i < L.W * L.H; i++) if (L.low[i]) { const x = (i % L.W) * s, y = ((i / L.W) | 0) * s; line(c, x, y + s, x + s, y); }
    c.fillStyle = T.dark ? 'rgba(0,0,0,.18)' : 'rgba(70,50,30,.06)'; for (let i = 0; i < L.W * L.H; i++) if (L.low[i]) c.fillRect((i % L.W) * s, ((i / L.W) | 0) * s, s + 0.5, s + 0.5);
    c.restore(); }
  c.restore(); // floor clip
  roomLabels(c, s);
  if (L.low.some((v) => v)) for (const [x, y, w, h] of components(L.low)) if (w * h > 30) { c.save(); c.fillStyle = T.label; c.globalAlpha = 0.7; c.font = `600 ${Math.max(8, s * 0.42)}px "JetBrains Mono", monospace`; c.textAlign = 'center'; c.fillText('LOW CEILING \u00b7 1.2 m \u00b7 no tall pieces', (x + w / 2) * s, (y + h / 2) * s + s * 0.15); c.restore(); }
  drawWalls(c, s);
  c.restore();
  return bg;
}
function tree(c, x, y, R, r) {
  c.save(); c.fillStyle = 'rgba(0,0,0,.14)'; c.beginPath(); c.arc(x + R * 0.25, y + R * 0.3, R, 0, TAU); c.fill();
  for (let i = 0; i < 5; i++) { const a = r() * TAU, d = R * 0.35 * r(); scirc(c, x + Math.cos(a) * d, y + Math.sin(a) * d, R * (0.55 + r() * 0.3), [T.dark ? '#2E4A2F' : '#7FA36B', T.dark ? '#27402A' : '#6E955D', T.dark ? '#355638' : '#8DB27A'][i % 3], false); }
  c.restore();
}
function components(mask) {
  const L = S.L, seen = new Uint8Array(L.W * L.H), out = [];
  for (let i = 0; i < L.W * L.H; i++) if (mask[i] && !seen[i]) {
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1; const st = [i]; seen[i] = 1;
    while (st.length) { const c = st.pop(), x = c % L.W, y = (c / L.W) | 0; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      for (const [dx, dy] of C.DIRV) { const X = x + dx, Y = y + dy, j = Y * L.W + X; if (X >= 0 && Y >= 0 && X < L.W && Y < L.H && mask[j] && !seen[j]) { seen[j] = 1; st.push(j); } } }
    out.push([x0, y0, x1 - x0 + 1, y1 - y0 + 1]);
  }
  return out;
}
function neighborRoom(x, y) { const L = S.L; for (const [dx, dy] of C.DIRV) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < L.W && Y < L.H && L.room[Y * L.W + X] >= 0) return L.room[Y * L.W + X]; } return -1; }
function roomLabels(c, s) {
  const L = S.L; c.save(); c.textAlign = 'center'; c.fillStyle = T.label; c.globalAlpha = 0.75;
  for (const r of L.rooms) {
    const fs = Math.max(8, Math.min(14, s * 0.58));
    c.font = `700 ${fs}px "Bricolage Grotesque", system-ui`; if (c.letterSpacing !== undefined) c.letterSpacing = '1.5px';
    c.fillText(r.name.toUpperCase(), r.cx * s, r.cy * s);
    c.font = `400 ${fs * 0.8}px "JetBrains Mono", monospace`; if (c.letterSpacing !== undefined) c.letterSpacing = '0px';
    c.fillText(`${r.area.toFixed(1)} m\u00b2`, r.cx * s, r.cy * s + fs * 1.15);
  }
  c.restore();
}
function isKind(x, y, ks) { const L = S.L; return x >= 0 && y >= 0 && x < L.W && y < L.H && ks.includes(L.kind[y * L.W + x]); }
function drawWalls(c, s) {
  const L = S.L, W = L.W;
  for (let i = 0; i < L.W * L.H; i++) {
    const k = L.kind[i], cx = i % W, cy = (i / W) | 0, x = cx * s, y = cy * s;
    if (k === K.WALL || k === K.PILLAR) { c.fillStyle = T.wall; c.fillRect(x, y, s + 0.6, s + 0.6); }
    else if (k === K.WIN) {
      const horiz = isKind(cx - 1, cy, [K.WALL, K.WIN]) || isKind(cx + 1, cy, [K.WALL, K.WIN]);
      c.fillStyle = T.wall; c.fillRect(x, y, s + 0.6, s + 0.6);
      c.fillStyle = T.glass;
      if (horiz) { c.fillRect(x - 0.3, y + s * 0.2, s + 1, s * 0.6); c.fillStyle = T.dark ? '#9EC4D2' : '#FFFFFF'; c.fillRect(x - 0.3, y + s * 0.46, s + 1, Math.max(1, s * 0.08)); }
      else { c.fillRect(x + s * 0.2, y - 0.3, s * 0.6, s + 1); c.fillStyle = T.dark ? '#9EC4D2' : '#FFFFFF'; c.fillRect(x + s * 0.46, y - 0.3, Math.max(1, s * 0.08), s + 1); }
    }
  }
  // pillars: concrete cross-hatch
  c.save(); c.strokeStyle = T.dark ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.35)'; c.lineWidth = 1;
  for (const [px, py, pw, ph] of components(L.kind.map((k) => k === K.PILLAR ? 1 : 0))) { line(c, px * s + 2, py * s + 2, (px + pw) * s - 2, (py + ph) * s - 2); line(c, (px + pw) * s - 2, py * s + 2, px * s + 2, (py + ph) * s - 2); }
  c.restore();
  // interior doors: leaf + swing into the smaller room
  c.save(); c.strokeStyle = T.wall; c.fillStyle = T.dark ? '#5B524A' : '#FFFFFF';
  for (const cl of L.clusters) {
    const xs = cl.cells.map((q) => q % W), ys = cl.cells.map((q) => (q / W) | 0);
    const x0 = Math.min(...xs), x1 = Math.max(...xs) + 1, y0 = Math.min(...ys), y1 = Math.max(...ys) + 1, len = cl.horiz ? x1 - x0 : y1 - y0;
    if (cl.entry) continue;
    if (len >= 5) { c.save(); c.globalAlpha = 0.3; c.lineWidth = Math.max(1, s * 0.08); if (cl.horiz) line(c, x0 * s, (y0 + 0.5) * s, x1 * s, (y0 + 0.5) * s); else line(c, (x0 + 0.5) * s, y0 * s, (x0 + 0.5) * s, y1 * s); c.restore(); continue; }
    const sides = cl.horiz ? [[0, -1], [0, 1]] : [[-1, 0], [1, 0]];
    let best = sides[0], bestN = 1e9;
    for (const sd of sides) { const X = x0 + (sd[0] > 0 ? 1 : sd[0]), Y = y0 + (sd[1] > 0 ? 1 : sd[1]); if (X < 0 || Y < 0 || X >= L.W || Y >= L.H) continue; const ri = L.room[Y * W + X]; const n = ri >= 0 ? L.rooms[ri].cells.length : 1e9; if (n < bestN) { bestN = n; best = sd; } }
    const hx = x0 * s, hy = y0 * s, L2 = len * s;
    const [dx, dy] = best;
    const hingeX = cl.horiz ? hx : (dx > 0 ? (x0 + 1) * s : hx), hingeY = cl.horiz ? (dy > 0 ? (y0 + 1) * s : hy) : hy;
    const leafX = hingeX + (cl.horiz ? 0 : dx * L2), leafY = hingeY + (cl.horiz ? dy * L2 : 0);
    c.save(); c.lineWidth = Math.max(1.5, s * 0.14); line(c, hingeX, hingeY, leafX, leafY);
    c.lineWidth = 1; c.globalAlpha = 0.45; c.setLineDash([3, 3]); c.beginPath();
    const ex = hingeX + (cl.horiz ? L2 : 0), ey = hingeY + (cl.horiz ? 0 : L2);
    const a0 = Math.atan2(leafY - hingeY, leafX - hingeX), a1 = Math.atan2(ey - hingeY, ex - hingeX);
    let d = a1 - a0; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
    c.arc(hingeX, hingeY, L2, a0, a1, d < 0); c.stroke(); c.restore();
  }
  // front door
  for (const sw of L.swings) {
    const len = sw.len * s;
    const hx = sw.o === 'h' ? sw.x * s : (sw.dx > 0 ? (sw.x + 1) * s : sw.x * s), hy = sw.o === 'h' ? (sw.dy > 0 ? (sw.y + 1) * s : sw.y * s) : sw.y * s;
    const lx = sw.o === 'h' ? hx : hx + sw.dx * len, ly = sw.o === 'h' ? hy + sw.dy * len : hy;
    const ex = sw.o === 'h' ? hx + len : hx, ey = sw.o === 'h' ? hy : hy + len;
    // doormat outside
    const mx = sw.o === 'h' ? sw.x * s + s * 0.3 : (sw.dx > 0 ? (sw.x - 1.6) * s : (sw.x + 1.1) * s), my = sw.o === 'h' ? (sw.dy > 0 ? (sw.y - 1.6) * s : (sw.y + 1.1) * s) : sw.y * s + s * 0.3;
    const mw = sw.o === 'h' ? len - s * 0.6 : s * 1.5, mh = sw.o === 'h' ? s * 1.5 : len - s * 0.6;
    c.save(); c.fillStyle = T.dark ? '#5C4A36' : '#9C7B55'; rr(c, mx, my, mw, mh, s * 0.15); c.fill();
    c.fillStyle = T.dark ? '#E3D2B8' : '#F5ECDD'; c.font = `700 ${Math.max(7, s * 0.42)}px "JetBrains Mono", monospace`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.translate(mx + mw / 2, my + mh / 2); if (sw.o === 'v') c.rotate(-Math.PI / 2); c.fillText('ENTRY', 0, 0); c.restore();
    c.save(); c.strokeStyle = T.jade; c.lineWidth = Math.max(2, s * 0.18); line(c, hx, hy, lx, ly);
    c.lineWidth = 1.2; c.setLineDash([4, 3]); const a0 = Math.atan2(ly - hy, lx - hx), a1 = Math.atan2(ey - hy, ex - hx); let d = a1 - a0; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
    c.beginPath(); c.arc(hx, hy, len, a0, a1, d < 0); c.stroke(); c.restore();
  }
  c.restore();
}

/* ---------- plan rendering ---------- */
function toC(x) { return (x + M) * cell; }
function polyPath(c, pts, s) { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x * s, y * s) : c.moveTo(x * s, y * s))); c.closePath(); }
function bandPoly(p, band, cx, cy, ang) { const [u, v, uw, vh] = band; return [[u, v], [u + uw, v], [u + uw, v + vh], [u, v + vh]].map(([a, b]) => C.toWorld(p, a, b, cx, cy, ang)); }
function handlePos(p) { const [w0, h0] = C.base(p); return C.toWorld(p, w0 / 2, h0 + 1.4); }

function draw() {
  const L = S.L; if (!L || !T.ink) return;
  const s = cell, dpr = window.devicePixelRatio || 1;
  S.anim = false;
  if (!S.bg) S.bg = buildBg();
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); g.drawImage(S.bg, 0, 0);
  g.setTransform(dpr, 0, 0, dpr, M * s * dpr, M * s * dpr);
  const W = L.W, H = L.H;
  const dragging = (S.drag && S.drag.moved) || !!S.pending || !!S.rotDrag;
  if (dragging) {
    g.save(); g.strokeStyle = T.ink; g.globalAlpha = 0.06; g.lineWidth = 1;
    for (let x = 0; x <= W; x++) line(g, x * s, 0, x * s, H * s); for (let y = 0; y <= H; y++) line(g, 0, y * s, W * s, y * s);
    g.globalAlpha = 0.13; for (let x = 0; x <= W; x += 4) line(g, x * s, 0, x * s, H * s); for (let y = 0; y <= H; y += 4) line(g, 0, y * s, W * s, y * s);
    g.restore();
    g.save(); g.strokeStyle = T.red; g.globalAlpha = 0.35; g.lineWidth = 1;
    for (let i = 0; i < W * H; i++) if (L.noPlace[i]) { const x = (i % W) * s, y = ((i / W) | 0) * s; line(g, x, y + s, x + s, y); }
    g.restore();
  }
  const P = S.peek && S.designer ? S.designer.P : S.P;
  const res = S.peek && S.designer ? C.evaluate(L, S.designer.P) : S.res;
  if (S.flow && res) {
    const occF = C.occupancy(L, P, null);
    for (let i = 0; i < W * H; i++) { const k = L.kind[i]; if (k !== K.FLOOR && k !== K.DOOR && k !== K.ENTRY) continue;
      const x = i % W, y = (i / W) | 0;
      if (res.reach[i]) { g.fillStyle = 'rgba(64,150,190,.24)'; g.fillRect(x * s, y * s, s, s); }
      else if (occF.blk[i] < 0) { g.fillStyle = 'rgba(200,70,60,.16)'; g.fillRect(x * s, y * s, s, s); } }
  }
  if (S.light && res) for (let i = 0; i < W * H; i++) if (L.kind[i] === K.FLOOR && L.room[i] >= 0 && !L.rooms[L.room[i]].service) {
    const x = i % W, y = (i / W) | 0; g.fillStyle = res.lit[i] ? 'rgba(255,205,90,.28)' : 'rgba(30,40,80,.2)'; g.fillRect(x * s, y * s, s, s); }
  const moving = S.drag && S.drag.moved && !S.drag.fromTray ? S.drag.p : S.rotDrag ? S.rotDrag.p : null;
  const layer = (ly) => P.filter((p) => p.placed && CAT[p.type].layer === ly);
  for (const ly of ['floor', 'block', 'ceiling']) for (const p of layer(ly)) paintPiece(g, p, s, { alpha: p === moving ? 0.22 : ly === 'ceiling' ? 0.95 : 1, stroke: ly === 'ceiling' ? '#8A6A1E' : undefined });
  // skylights sit in the roof above everything
  for (const [x, y, w, h] of components(L.sky)) { g.save(); g.globalAlpha = 0.5; g.fillStyle = T.glass; g.fillRect(x * s, y * s, w * s, h * s); g.globalAlpha = 0.9; g.strokeStyle = T.wall; g.lineWidth = Math.max(1, s * 0.1); g.strokeRect(x * s, y * s, w * s, h * s); line(g, (x + w / 2) * s, y * s, (x + w / 2) * s, (y + h) * s); g.restore(); }
  if (S.light && res) for (const p of P) if (p.placed && CAT[p.type].light) { g.save(); g.strokeStyle = T.gold; g.setLineDash([4, 4]); g.beginPath(); g.arc(p.cx * s, p.cy * s, CAT[p.type].light * s, 0, TAU); g.stroke(); g.restore(); }
  if (!S.peek) {
    for (const p of S.P) if (p.placed && !p.fixed && p !== moving) { const sc = S.res.pieceScore[p.idx]; if (sc != null && sc < 0.6) { const [x, y] = C.corners(p)[1]; circ(g, x * s, y * s, Math.max(3.5, s * 0.22), T.red, false); } }
    if (S.flow) for (const k in S.res.access) { const a = S.res.access[k], p = S.P[k]; if (p === moving) continue; for (const side of a.bad) edgeLine(p, side, T.red); }
    if (S.hover >= 0 && S.P[S.hover] && S.P[S.hover].placed) outline(S.P[S.hover], T.gold, 2.5);
    const sp = S.P[S.sel];
    if (sp && sp.placed && !(S.drag && S.drag.moved) && !S.rotDrag) { outline(sp, T.jade, 2.5); zones(sp, T.jade); if (!sp.fixed) rotHandle(sp); }
    if (S.rotDrag) { const d = S.rotDrag; ghostAt(d.p, d.cx, d.cy, d.ang, d.valid); }
    const d = S.drag; if (d && d.moved && d.over) ghostAt(d.p, d.gx, d.gy, d.ang, d.valid);
  } else {
    g.save(); g.fillStyle = T.ink; g.globalAlpha = 0.85; g.font = `600 ${Math.max(11, s * 0.6)}px Figtree, system-ui`; g.fillText(`Designer layout \u00b7 ${S.designer.score.toFixed(0)} pts`, 0, -s * 0.6); g.restore();
  }
  drawFx(s);
}
function outline(p, col, w) { g.save(); g.strokeStyle = col; g.lineWidth = w; g.lineJoin = 'round'; polyPath(g, C.corners(p, p.cx, p.cy, p.ang, 0.12), cell); g.stroke(); g.restore(); }
function zones(p, col, cx = p.cx, cy = p.cy, ang = p.ang) {
  const s = cell; g.save(); g.strokeStyle = col; g.fillStyle = col; g.setLineDash([4, 3]); g.lineWidth = 1.5;
  for (const [side, d] of CAT[p.type].zones || []) { polyPath(g, bandPoly(p, C.sideBand(p, side, d), cx, cy, ang), s); g.globalAlpha = 0.12; g.fill(); g.globalAlpha = 0.9; g.stroke(); }
  g.restore();
}
function edgeLine(p, side, col) {
  const cs = C.corners(p), idx = { back: [0, 1], right: [1, 2], front: [2, 3], left: [3, 0] }[side], s = cell;
  const [a, b] = [cs[idx[0]], cs[idx[1]]], sh = 0.12;
  g.save(); g.strokeStyle = col; g.lineWidth = 3.5; g.lineCap = 'round';
  line(g, (a[0] + (b[0] - a[0]) * sh) * s, (a[1] + (b[1] - a[1]) * sh) * s, (b[0] - (b[0] - a[0]) * sh) * s, (b[1] - (b[1] - a[1]) * sh) * s); g.restore();
}
function rotHandle(p) {
  const s = cell, [hx, hy] = handlePos(p);
  g.save(); g.strokeStyle = T.jade; g.lineWidth = 1.5; g.setLineDash([3, 3]); line(g, p.cx * s, p.cy * s, hx * s, hy * s); g.setLineDash([]);
  const r = Math.max(8, s * 0.55); circ(g, hx * s, hy * s, r, T.jade, false);
  g.strokeStyle = '#fff'; g.lineWidth = 1.6; g.beginPath(); g.arc(hx * s, hy * s, r * 0.5, -0.3, Math.PI * 1.3); g.stroke();
  const ex = hx * s + Math.cos(Math.PI * 1.3) * r * 0.5, ey = hy * s + Math.sin(Math.PI * 1.3) * r * 0.5; line(g, ex, ey, ex - r * 0.3, ey + r * 0.05); line(g, ex, ey, ex + r * 0.02, ey + r * 0.32);
  g.restore();
}
function ghostAt(p, cx, cy, ang, valid) {
  const s = cell;
  paintPiece(g, p, s, { cx, cy, ang, alpha: 0.88, noAnim: true, stroke: valid ? T.jade : T.red });
  g.save(); g.strokeStyle = valid ? T.jade : T.red; g.lineWidth = 2; g.setLineDash(valid ? [] : [5, 4]);
  polyPath(g, C.corners(p, cx, cy, ang), s); g.fillStyle = valid ? 'rgba(40,150,110,.12)' : 'rgba(200,60,50,.2)'; g.fill(); g.stroke(); g.restore();
  zones(p, valid ? T.jade : T.red, cx, cy, ang);
  const [w0, h0] = C.base(p), a = C.norm(ang);
  g.save(); g.font = `600 ${Math.max(10, s * 0.5)}px "JetBrains Mono", monospace`; const txt = `${w0 * 25}\u00d7${h0 * 25}${a % 90 ? ` \u00b7 ${a}\u00b0` : ''}`;
  const tw = g.measureText(txt).width + 8, ys = C.corners(p, cx, cy, ang).map((q) => q[1]), xs = C.corners(p, cx, cy, ang).map((q) => q[0]);
  const tx = Math.max(-M * s, Math.min(Math.min(...xs) * s, S.L.W * s - tw)), ty = Math.max(-M * s, Math.min(...ys) * s - s * 0.95);
  g.fillStyle = valid ? T.jade : T.red; rr(g, tx, ty, tw, Math.max(14, s * 0.8), 3); g.fill(); g.fillStyle = '#fff'; g.fillText(txt, tx + 4, ty + Math.max(11, s * 0.6)); g.restore();
}
function drawFx(s) {
  const t = now(); S.fx = S.fx.filter((f) => t - f.t0 < 1400);
  for (const f of S.fx) {
    const k = (t - f.t0) / 1400;
    if (f.puff) { g.save(); g.globalAlpha = (1 - k) * 0.5; g.fillStyle = T.dark ? '#ddd' : '#B8AE9C'; for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + f.seed; g.beginPath(); g.arc((f.x + Math.cos(a) * (0.6 + k * 2.2)) * s, (f.y + Math.sin(a) * (0.6 + k * 2.2)) * s, s * 0.35 * (1 - k * 0.5), 0, TAU); g.fill(); } g.restore(); continue; }
    g.save(); g.globalAlpha = Math.min(1, (1 - k) * 1.6); g.font = `800 ${Math.max(13, s * 0.85)}px "Bricolage Grotesque", system-ui`; g.textAlign = 'center';
    const y = (f.y - k * 1.8) * s; g.lineWidth = 4; g.strokeStyle = T.dark ? '#000' : '#fff'; g.strokeText(f.text, f.x * s, y); g.fillStyle = f.color; g.fillText(f.text, f.x * s, y); g.restore();
  }
  if (S.fx.length) S.anim = true;
}
function popup(x, y, text, color) { S.fx.push({ x, y, text, color, t0: now() }); }
function puff(x, y) { S.fx.push({ x, y, puff: 1, seed: Math.random() * 6, t0: now() }); }

/* ---------- tray (free design) ---------- */
function thumb(type, cw, ch, p) {
  const c = document.createElement('canvas'), dpr = window.devicePixelRatio || 1;
  c.width = cw * dpr; c.height = ch * dpr; c.style.width = cw + 'px'; c.style.height = ch + 'px'; const x = c.getContext('2d'); x.scale(dpr, dpr);
  const cat = CAT[type], extra = type === 'desk' ? 2.2 : type === 'piano' ? 1.4 : 0, s = Math.min((cw - 6) / cat.w, (ch - 6) / (cat.h + extra), 9);
  x.translate((cw - cat.w * s) / 2, (ch - (cat.h + extra) * s) / 2);
  x.lineWidth = Math.max(0.6, s * 0.06); x.strokeStyle = '#2E322F'; x.lineJoin = 'round'; x.lineCap = 'round';
  DRAW[type](x, cat.w * s, cat.h * s, s, p || { id: type, feat: '' });
  return c;
}
function renderTray() {
  if (!S.P) return;
  if (rushOn()) { renderRushTray(); return; }
  if (sandboxOn()) { renderLibrary(); return; }
  $('#trayTitle').textContent = 'Furniture';
  const groups = {};
  for (const p of movable()) { const c = CAT[p.base]; groups[c.group] = groups[c.group] || {}; const o = groups[c.group][p.base] || (groups[c.group][p.base] = { n: 0, left: 0, p }); o.n++; if (!p.placed) o.left++; }
  const host = $('#trayGroups'); host.textContent = '';
  for (const [gname, types] of Object.entries(groups)) {
    const sec = document.createElement('div'); sec.className = 'group';
    sec.innerHTML = `<div class="eyebrow">${gname}</div>`;
    const items = document.createElement('div'); items.className = 'items';
    for (const [type, o] of Object.entries(types)) {
      const c = CAT[type], b = document.createElement('button'); b.type = 'button';
      b.dataset.grab = ''; b.className = 'item' + (o.left ? '' : ' done') + (S.pending && S.pending.type === type ? ' pending' : ''); b.dataset.type = type;
      b.setAttribute('aria-label', `${c.name}, ${o.left} of ${o.n} left to place`);
      b.appendChild(thumb(type, window.innerWidth < 760 ? 40 : 48, window.innerWidth < 760 ? 34 : 40, o.p));
      const nOpt = C.slotOptions(type).length;
      const t = document.createElement('div'); t.innerHTML = `<div class="nm">${c.name}${c.tall ? ' <span class="tag">tall</span>' : ''}</div><div class="dm">${c.w * 25}\u00d7${c.h * 25} cm${nOpt > 1 ? ` \u00b7 ${nOpt} styles` : ''}</div>`; b.appendChild(t);
      const ct = document.createElement('span'); ct.className = 'ct'; ct.textContent = o.left ? `\u00d7${o.left}` : '\u2713'; b.appendChild(ct);
      items.appendChild(b);
    }
    sec.appendChild(items); host.appendChild(sec);
  }
  const m = movable(), left = m.filter((p) => !p.placed).length;
  $('#trayCount').textContent = `${m.length - left}/${m.length}`;
  $('#trayHint').textContent = left ? (S.pending ? `Tap the plan to drop the ${CAT[S.pending.type].name.toLowerCase()}.` : 'Drag a piece onto the plan. Drag it back here to remove it.') : 'Everything is in. Keep refining for a higher score.';
}
function renderLibrary() {
  $('#trayTitle').textContent = 'Library';
  const host = $('#trayGroups');
  if (!host.querySelector('#libList')) {
    host.innerHTML = `<input id="libSearch" class="search" type="search" placeholder="Search 70+ pieces" aria-label="Search the furniture library">
      <div class="chips" id="libChips">${['All', ...C.GROUPS].map((gname) => `<button class="chip" data-g="${gname}" aria-pressed="${(S.libGroup || 'All') === gname}">${gname}</button>`).join('')}</div>
      <div id="libList"></div>`;
    $('#libSearch').value = S.libQuery || '';
    $('#libSearch').addEventListener('input', (e) => { S.libQuery = e.target.value; renderLibList(); });
    $('#libChips').addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (!b) return; S.libGroup = b.dataset.g;
      host.querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-pressed', x === b)); renderLibList(); });
  }
  renderLibList();
  const n = movable().filter((p) => p.placed).length;
  $('#trayCount').textContent = `${n} placed`;
  $('#trayHint').textContent = S.pending ? `Tap the plan to drop the ${CAT[S.pending.type].name.toLowerCase()}.` : 'Drag anything onto the plan, as many as you like. Drag a piece back here to delete it.';
}
function renderLibList() {
  const host = $('#libList'); if (!host) return;
  const q = (S.libQuery || '').trim().toLowerCase(), gsel = S.libGroup || 'All';
  const types = Object.keys(CAT).filter((t) => !CAT[t].fixed && (gsel === 'All' || CAT[t].group === gsel) && (!q || (CAT[t].name + ' ' + CAT[t].group + ' ' + CAT[t].kind).toLowerCase().includes(q)));
  const count = {}; for (const p of movable()) if (p.placed) count[p.type] = (count[p.type] || 0) + 1;
  host.textContent = '';
  const byGroup = {}; for (const t of types) (byGroup[CAT[t].group] = byGroup[CAT[t].group] || []).push(t);
  for (const gname of C.GROUPS) { const list = byGroup[gname]; if (!list) continue;
    const sec = document.createElement('div'); sec.className = 'group'; sec.innerHTML = `<div class="eyebrow">${gname}</div>`;
    const items = document.createElement('div'); items.className = 'items';
    for (const t of list) { const c = CAT[t], b = document.createElement('button'); b.type = 'button'; b.dataset.grab = ''; b.dataset.new = t;
      b.className = 'item' + (S.pending && S.pending.type === t ? ' pending' : ''); b.setAttribute('aria-label', `Add ${c.name}`);
      b.appendChild(thumb(t, window.innerWidth < 760 ? 40 : 48, window.innerWidth < 760 ? 34 : 40, { id: t + '-lib', type: t, feat: '' }));
      const d = document.createElement('div'); d.innerHTML = `<div class="nm">${c.name}${c.tall ? ' <span class="tag">tall</span>' : ''}</div><div class="dm">${c.w * 25}\u00d7${c.h * 25} cm</div>`; b.appendChild(d);
      const ct = document.createElement('span'); ct.className = 'ct' + (count[t] ? '' : ' zero'); ct.textContent = count[t] ? `${count[t]}` : '+'; b.appendChild(ct);
      items.appendChild(b); }
    sec.appendChild(items); host.appendChild(sec); }
  if (!types.length) host.innerHTML = '<p class="good">Nothing matches. Try another word.</p>';
}
let lastPtr = 'mouse';
function pieceForCard(b) {
  if (b.dataset.new) { const p = newPiece(b.dataset.new); S.P.unshift(p); reindex(); p.base = p.type; p.fresh = true; return p; }
  if (b.dataset.idx) { const p = S.P[+b.dataset.idx]; return p && !p.placed ? p : null; }
  return movable().find((q) => q.type === b.dataset.type && !q.placed) || null;
}
$('#tray').addEventListener('pointerdown', (e) => {
  lastPtr = e.pointerType;
  const b = e.target.closest('[data-grab]'); if (!b || b.classList.contains('done') || e.pointerType === 'touch' || S.peek) return;
  if (rushOn() && (!S.rush.running || S.rush.paused)) return;
  const p = pieceForCard(b); if (!p) return;
  e.preventDefault();
  if (!p.ang) p.ang = 0;
  S.drag = { p, fromTray: true, offX: 0, offY: 0, ang: p.ang, gx: 0, gy: 0, valid: false, moved: true, over: false, occ: C.occupancy(S.L, S.P, p) };
  S.sel = -1; showCarry(e); draw();
});
$('#tray').addEventListener('click', (e) => {
  const act = e.target.closest('[data-act]'); if (act) { rushAction(act.dataset.act); return; }
  if (lastPtr !== 'touch') return;
  const b = e.target.closest('[data-grab]'); if (!b || b.classList.contains('done') || S.peek) return;
  if (b.dataset.new) { S.pending = S.pending && S.pending.type === b.dataset.new ? null : { type: b.dataset.new, p: null }; S.sel = -1; renderTray(); draw(); return; }
  const p = pieceForCard(b); if (!p) return;
  S.pending = S.pending && S.pending.p === p ? null : { type: p.type, p }; S.sel = -1; renderTray(); draw();
});

/* ---------- plan interaction ---------- */
function toCell(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / cell - M, (e.clientY - r.top) / cell - M, e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom]; }
function hitTest(x, y) {
  for (const layer of ['ceiling', 'block', 'floor']) for (let i = S.P.length - 1; i >= 0; i--) {
    const p = S.P[i]; if (!p.placed || CAT[p.type].layer !== layer) continue;
    if (C.containsPoint(p, x, y)) return i;
  }
  return -1;
}
function nearestValid(occ, p, cx, cy, ang, R) {
  const st = C.axis(ang) ? 1 : 0.5, n = Math.round(R / st);
  for (let r = 0; r <= n; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const x = cx + dx * st, y = cy + dy * st;
    if (C.canPlace(S.L, occ, p, x, y, ang)) return [x, y];
  }
  return null;
}
function discardFresh(p) { if (p && p.fresh && !p.placed) { S.P.splice(S.P.indexOf(p), 1); reindex(); } }
function commitPlace(p, cx, cy, ang) {
  if (p.fresh) { delete p.fresh; if (sandboxOn()) pushUndo(); }
  const wasPlaced = p.placed;
  pushUndo(); p.cx = cx; p.cy = cy; p.ang = C.norm(ang); p.placed = true; p._t = now(); S.sel = p.idx;
  puff(cx, cy);
  update();
  if (rushOn() && !wasPlaced && S.rush && S.rush.cur === p.idx) onRushPlaced(p);
  kick();
}
cv.addEventListener('pointerdown', (e) => {
  if (S.peek || (rushOn() && S.rush && (!S.rush.running || S.rush.paused))) return;
  lastPtr = e.pointerType;
  const [x, y] = toCell(e);
  if (S.pending) {
    let p = S.pending.p; const ptype = S.pending.type; S.pending = null;
    if (!p && sandboxOn()) { p = newPiece(ptype); S.P.unshift(p); reindex(); p.base = ptype; p.fresh = true; }
    if (p && !p.placed) { const occ = C.occupancy(S.L, S.P, p), [sx, sy] = C.snap(p, x, y, p.ang);
      const spot = nearestValid(occ, p, sx, sy, p.ang, 4);
      if (spot) { commitPlace(p, spot[0], spot[1], p.ang); return; }
      toast(`The ${CAT[p.type].name.toLowerCase()} doesn't fit there. Try an emptier spot.`); discardFresh(p); }
    renderTray(); draw(); return;
  }
  const sp = S.P[S.sel];
  if (sp && sp.placed && !sp.fixed) { const [hx, hy] = handlePos(sp); if (Math.hypot(hx - x, hy - y) < Math.max(0.9, 10 / cell)) {
    S.rotDrag = { p: sp, occ: C.occupancy(S.L, S.P, sp), cx: sp.cx, cy: sp.cy, ang: sp.ang, valid: true, ox: sp.cx, oy: sp.cy };
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* optional */ } draw(); return; } }
  const hit = hitTest(x, y);
  if (hit < 0) { S.sel = -1; renderSel(); renderNotes(); draw(); return; }
  const p = S.P[hit]; S.sel = hit;
  if (!p.fixed) {
    S.drag = { p, fromTray: false, offX: x - p.cx, offY: y - p.cy, ang: p.ang, gx: p.cx, gy: p.cy, valid: true, moved: false, over: true, sx: e.clientX, sy: e.clientY, occ: C.occupancy(S.L, S.P, p) };
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* optional */ }
  }
  renderSel(); renderNotes(); draw();
});
cv.addEventListener('dblclick', (e) => { const [x, y] = toCell(e); const h = hitTest(x, y); if (h >= 0 && !S.P[h].fixed) { S.sel = h; rotateBy(90); } });
function overTrayAt(e) { const el = document.elementFromPoint(e.clientX, e.clientY); return !!(el && el.closest('#tray')); }
function moveDrag(e) {
  const d = S.drag;
  if (!d.moved) { if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 5) return; d.moved = true; }
  const [x, y, inside] = toCell(e);
  d.over = inside;
  [d.gx, d.gy] = C.snap(d.p, x - d.offX, y - d.offY, d.ang);
  d.valid = inside && C.canPlace(S.L, d.occ, d.p, d.gx, d.gy, d.ang);
  const overTray = !inside && overTrayAt(e);
  $('#tray').classList.toggle('drop', overTray && !d.fromTray && !rushOn());
  if (inside) hideCarry(); else showCarry(e, overTray && !d.fromTray ? (rushOn() ? 'Already off the truck' : 'Release to return to tray') : null);
  draw();
}
function moveRot(e) {
  const d = S.rotDrag, [x, y] = toCell(e), vx = x - d.ox, vy = y - d.oy;
  if (Math.hypot(vx, vy) < 0.4) return;
  const step = e.shiftKey ? 5 : C.ANG_STEP;
  const raw = Math.atan2(-vx, vy) * 180 / Math.PI; let ang = C.norm(Math.round(raw / step) * step);
  if (step !== 5 && C.norm(ang) % 90 !== 0 && Math.abs(((raw % 90) + 90) % 90 - 0) < 4) ang = C.norm(Math.round(raw / 90) * 90);
  d.ang = ang; [d.cx, d.cy] = C.snap(d.p, d.ox, d.oy, ang);
  d.valid = C.canPlace(S.L, d.occ, d.p, d.cx, d.cy, ang);
  draw();
}
window.addEventListener('pointermove', (e) => {
  if (S.drag) { moveDrag(e); return; }
  if (S.rotDrag) { moveRot(e); return; }
  if (e.pointerType === 'mouse' && e.target === cv && !S.peek) {
    const [x, y] = toCell(e); const sp = S.P[S.sel];
    if (sp && sp.placed && !sp.fixed) { const [hx, hy] = handlePos(sp); if (Math.hypot(hx - x, hy - y) < 0.9) { cv.style.cursor = 'alias'; return; } }
    const h = hitTest(x, y); cv.style.cursor = h >= 0 && !S.P[h].fixed ? 'grab' : 'default';
  }
});
window.addEventListener('pointerup', (e) => {
  if (S.rotDrag) {
    const d = S.rotDrag; S.rotDrag = null;
    if (d.ang === d.p.ang) { draw(); return; }
    const spot = d.valid ? [d.cx, d.cy] : nearestValid(d.occ, d.p, d.cx, d.cy, d.ang, 1.5);
    if (spot) commitPlace(d.p, spot[0], spot[1], d.ang); else { toast('No room to turn it that far here.'); draw(); }
    return;
  }
  const d = S.drag; if (!d) return; S.drag = null; hideCarry(); $('#tray').classList.remove('drop');
  if (!d.moved) { discardFresh(d.p); draw(); return; }
  const [, , inside] = toCell(e);
  if (!inside) {
    if (!d.fromTray && overTrayAt(e)) {
      if (rushOn()) { toast('It\u2019s already off the truck. Find it a spot inside.'); draw(); return; }
      pushUndo(); d.p.placed = false; if (sandboxOn()) { S.P.splice(S.P.indexOf(d.p), 1); reindex(); } S.sel = -1; update(); return;
    }
    discardFresh(d.p); draw(); return;
  }
  const spot = d.valid ? [d.gx, d.gy] : nearestValid(d.occ, d.p, d.gx, d.gy, d.ang, 1);
  if (!spot) { toast(whyNot(d)); discardFresh(d.p); draw(); return; }
  commitPlace(d.p, spot[0], spot[1], d.ang);
});
window.addEventListener('pointercancel', () => { if (S.drag) discardFresh(S.drag.p); S.drag = null; S.rotDrag = null; hideCarry(); draw(); });
function whyNot(d) {
  return ({ wall: 'That spot runs into a wall.', door: 'Keep doorways and the front door\u2019s swing clear.', low: 'Too tall for the sloped ceiling. Tall pieces need full head height.',
    furniture: 'Something is already there.' })[C.placeProblem(S.L, d.occ, d.p, d.gx, d.gy, d.ang)] || 'It doesn\u2019t fit there.';
}
function showCarry(e, text) { const c = $('#carry'); c.hidden = false; c.textContent = text || `${CAT[S.drag.p.type].name} \u00b7 R rotate \u00b7 Q/E tilt`; c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px'; }
function hideCarry() { $('#carry').hidden = true; }

function rotateBy(delta) {
  if (S.drag && S.drag.moved) {
    const d = S.drag; d.ang = C.norm(d.ang + delta); [d.gx, d.gy] = C.snap(d.p, d.gx, d.gy, d.ang);
    d.valid = C.canPlace(S.L, d.occ, d.p, d.gx, d.gy, d.ang); draw(); return;
  }
  const p = S.P[S.sel]; if (!p || p.fixed || !p.placed) return;
  const na = C.norm(p.ang + delta), occ = C.occupancy(S.L, S.P, p), [sx, sy] = C.snap(p, p.cx, p.cy, na);
  const spot = nearestValid(occ, p, sx, sy, na, 3);
  if (!spot) { toast('No room to turn it here. Move it somewhere roomier first.'); return; }
  commitPlace(p, spot[0], spot[1], na);
}
function removeSel() {
  if (rushOn()) { toast('It\u2019s already off the truck. Find it a spot inside.'); return; }
  const p = S.P[S.sel]; if (!p || p.fixed || !p.placed) return; pushUndo(); p.placed = false;
  if (sandboxOn()) { S.P.splice(S.P.indexOf(p), 1); reindex(); }
  S.sel = -1; update();
}
function duplicateSel() {
  const p = S.P[S.sel]; if (!sandboxOn() || !p || p.fixed || !p.placed) return;
  const q = newPiece(p.type); q.base = p.type; q.ang = p.ang; S.P.unshift(q); reindex();
  const occ = C.occupancy(S.L, S.P, q), [sx, sy] = C.snap(q, p.cx + 1, p.cy + 1, q.ang);
  const spot = nearestValid(occ, q, sx, sy, q.ang, 8);
  if (!spot) { S.P.shift(); reindex(); toast('No room nearby for a copy.'); return; }
  q.fresh = true; commitPlace(q, spot[0], spot[1], q.ang);
}
function styleOptions(p) { return sandboxOn() ? C.kindOptions(p.type) : C.slotOptions(p.base || p.type); }
function swapStyle(p, type) {
  if (type === p.type) return;
  const old = p.type; p.type = type; const occ = C.occupancy(S.L, S.P, p), [sx, sy] = C.snap(p, p.cx, p.cy, p.ang);
  const spot = !p.placed ? [p.cx, p.cy] : nearestValid(occ, p, sx, sy, p.ang, 3);
  if (!spot) { p.type = old; toast(`The ${CAT[type].name.toLowerCase()} doesn\u2019t fit here. Make some room first.`); renderSel(); return; }
  p.type = old; pushUndo(); p.type = type; if (p.placed) { p.cx = spot[0]; p.cy = spot[1]; p._t = now(); puff(p.cx, p.cy); }
  update(); kick();
}
function nudge(dx, dy) {
  const p = S.P[S.sel]; if (!p || p.fixed || !p.placed) return; const occ = C.occupancy(S.L, S.P, p), st = C.axis(p.ang) ? 1 : 0.5;
  if (C.canPlace(S.L, occ, p, p.cx + dx * st, p.cy + dy * st, p.ang)) { pushUndo(); p.cx += dx * st; p.cy += dy * st; update(); } else toast('Blocked.');
}
window.addEventListener('keydown', (e) => {
  if (e.target.closest && e.target.closest('input,textarea')) return;
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return; }
  if (!$('#intro').hidden) { if (e.key === 'Escape') closeIntro(); return; }
  const k = e.key.toLowerCase();
  if (k === 'r') { e.preventDefault(); rotateBy(e.shiftKey ? -90 : 90); }
  else if (k === 'q') { e.preventDefault(); rotateBy(-C.ANG_STEP); }
  else if (k === 'e') { e.preventDefault(); rotateBy(C.ANG_STEP); }
  else if (k === 'd' && sandboxOn() && !(e.metaKey || e.ctrlKey)) { e.preventDefault(); duplicateSel(); }
  else if (k === 'h' && rushOn()) { e.preventDefault(); rushAction('hold'); }
  else if (k === 'p' && rushOn()) { e.preventDefault(); rushAction('pause'); }
  else if (e.key === 'Delete' || e.key === 'Backspace') { if (S.sel >= 0) { e.preventDefault(); removeSel(); } }
  else if (e.key === 'Escape') { if (S.drag) { S.drag = null; hideCarry(); } S.rotDrag = null; S.pending = null; S.sel = -1; renderTray(); renderSel(); draw(); }
  else if (S.sel >= 0 && e.key.startsWith('Arrow')) { e.preventDefault(); const m = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]; nudge(...m); }
});

/* ---------- Moving Day ---------- */
const DIFF_T = [1, 1.3, 1.12, 1, 0.9];
function pieceTime(p) { const [w, h] = C.base(p); return Math.max(8, Math.min(18, 7 + w * h * 0.12)) * DIFF_T[S.L.def.diff]; }
function setupRush() {
  const mov = movable(); mov.forEach((p) => { p.placed = false; p.type = p.base || p.type; });
  const order = mov.map((p) => { const [w, h] = C.base(p); return { p, k: w * h * (0.55 + Math.random() * 0.9) + (p.type === 'ceiling_light' ? -20 : 0) }; }).sort((a, b) => b.k - a.k).map((o) => o.p.idx);
  const total = order.reduce((a, i) => a + pieceTime(S.P[i]), 0);
  S.rush = { queue: order, cur: null, hold: null, holdUsed: false, t: 0, tMax: 1, bank: 0, perfect: 0, good: 0, dumped: 0, curb: 0, bonus: 0,
    phase: 'ready', running: false, paused: false, finalT: 20, total, n: order.length, result: null };
  $('#rushIntro').hidden = false; renderRushIntro();
}
function renderRushIntro() {
  const r = S.rush, best = saved.rush[C.LEVELS[S.li].id];
  $('#rushIntro').innerHTML = `<div class="ri-box"><div class="eyebrow">Moving Day \u00b7 ${esc(C.LEVELS[S.li].name)}</div>
    <h3>${r.n} pieces are on the truck.</h3>
    <p>The movers carry in one piece at a time. Place it before the timer runs out or they\u2019ll dump it by the front door. You can shuffle anything already inside.</p>
    <ul><li>Unused seconds go in the time bank (up to +25)</li><li><b>+2</b> for every piece that ends up in a perfect spot, <b>+1</b> for a good one</li><li><b>\u22122</b> for every piece the movers dump</li><li><kbd>H</kbd> puts a piece in the hallway to deal with later</li></ul>
    ${best ? `<p class="mono">Your best: ${best.best} \u00b7 ${'\u2605'.repeat(best.stars)}${'\u2606'.repeat(3 - best.stars)}</p>` : ''}
    <button class="primary" data-go>Start the move</button></div>`;
  $('#rushIntro [data-go]').addEventListener('click', startRush);
}
function startRush() {
  const r = S.rush; $('#rushIntro').hidden = true; r.phase = 'count'; r.count = 3; r.running = true; r.countT = now();
  kick();
}
function nextPiece() {
  const r = S.rush;
  if (r.queue.length) { r.cur = r.queue.shift(); }
  else if (r.hold != null) { r.cur = r.hold; r.hold = null; }
  else { r.cur = null; r.phase = 'final'; r.finalT = 20; toast('The truck is empty. 20 seconds for finishing touches.'); renderTray(); return; }
  r.holdUsed = false; r.tMax = pieceTime(S.P[r.cur]); r.t = r.tMax; r.arrive = now();
  renderTray();
}
function onRushPlaced(p) {
  const r = S.rush, sc = S.res.pieceScore[p.idx] || 0;
  if (sc >= 0.9) popup(p.cx, p.cy - 1, 'Perfect spot!', T.gold);
  else if (sc >= 0.75) popup(p.cx, p.cy - 1, 'Nice', T.jade);
  else popup(p.cx, p.cy - 1, r.t > r.tMax * 0.6 ? 'Quick!' : 'Placed', T.ink2);
  r.bank += r.t; r.cur = null; S.pending = null;
  setTimeout(() => { if (S.rush === r && r.phase === 'deliver') nextPiece(); }, 350);
  renderTray();
}
function dumpPiece() {
  const r = S.rush, p = S.P[r.cur], L = S.L, occ = C.occupancy(L, S.P, p);
  const cells = []; for (let i = 0; i < L.W * L.H; i++) if (L.kind[i] === K.FLOOR && L.entryDist[i] < 999) cells.push(i);
  cells.sort((a, b) => L.entryDist[a] - L.entryDist[b]);
  let spot = null;
  for (const i of cells) { const x = i % L.W, y = (i / L.W) | 0;
    for (const ang of [0, 90]) { const [w, h] = C.dims(p, ang), cx = x + w / 2, cy = y + h / 2; if (C.canPlace(L, occ, p, cx, cy, ang)) { spot = [cx, cy, ang]; break; } }
    if (spot) break; }
  if (spot) { p.cx = spot[0]; p.cy = spot[1]; p.ang = spot[2]; p.placed = true; p._t = now(); r.dumped++; r.bonus -= 2; puff(p.cx, p.cy); popup(p.cx, p.cy - 1, 'Dumped by the door \u22122', T.red); }
  else { r.curb++; r.bonus -= 5; toast(`No room anywhere. The ${CAT[p.type].name.toLowerCase()} is left on the curb (\u22125).`); }
  r.cur = null; S.pending = null; if (S.drag && S.drag.p === p) { S.drag = null; hideCarry(); }
  update(false);
  setTimeout(() => { if (S.rush === r && r.phase === 'deliver') nextPiece(); }, 500);
}
function finishRush() {
  const r = S.rush; r.phase = 'done'; r.running = false;
  S.res = C.evaluate(S.L, S.P);
  const design = S.res.total, speed = Math.min(25, r.bank * 0.4), q = quality();
  r.perfect = q.perfect; r.good = q.good;
  const score = Math.max(0, Math.round(design + speed + q.pts + r.bonus));
  const stars = r.curb ? 0 : score >= 120 ? 3 : score >= 100 ? 2 : score >= 70 ? 1 : 0;
  r.result = { design, speed, score, stars, q };
  const id = C.LEVELS[S.li].id, sv = saved.rush[id] || (saved.rush[id] = { best: 0, stars: 0 });
  r.result.newBest = score > sv.best; sv.best = Math.max(sv.best, score); sv.stars = Math.max(sv.stars, stars); store.set(saved);
  update(false);
}
// spot bonus: every piece that ends up in a great spot in the finished home
function quality() {
  let perfect = 0, good = 0;
  for (const p of movable()) if (p.placed) { const sc = S.res.pieceScore[p.idx] || 0; if (sc >= 0.9) perfect++; else if (sc >= 0.75) good++; }
  return { perfect, good, pts: perfect * 2 + good };
}
function rushAction(a) {
  const r = S.rush; if (!r) return;
  if (a === 'pause') { if (!r.running) return; r.paused = !r.paused; $('#pauseOverlay').hidden = !r.paused; renderTray(); kick(); return; }
  if (a === 'hold') { if (r.phase !== 'deliver' || r.cur == null || r.holdUsed) return;
    const c = r.cur; if (r.hold != null) { r.cur = r.hold; r.hold = c; } else { r.hold = c; r.cur = r.queue.shift(); if (r.cur == null) { r.cur = r.hold; r.hold = null; toast('Nothing else on the truck.'); return; } }
    r.holdUsed = true; S.pending = null; renderTray(); return; }
  if (a === 'done') { if (r.phase === 'final') finishRush(); return; }
  if (a === 'again') { setupRush(); S.res = C.evaluate(S.L, S.P); S.sel = -1; update(false); return; }
}
let lastTick = now(), rafOn = false;
function kick() { if (!rafOn) { rafOn = true; lastTick = now(); requestAnimationFrame(frame); } }
function frame() {
  const t = now(), dt = Math.min(0.1, (t - lastTick) / 1000); lastTick = t;
  const r = S.rush; let live = false;
  if (rushOn() && r && r.running && !r.paused) {
    live = true;
    if (r.phase === 'count') { const k = 3 - Math.floor((t - r.countT) / 700); if (k !== r.count) { r.count = k; } if (k <= 0) { r.phase = 'deliver'; nextPiece(); } }
    else if (r.phase === 'deliver' && r.cur != null && !(S.drag && S.drag.fromTray && S.drag.p.idx === r.cur && false)) { r.t -= dt; if (r.t <= 0) { r.t = 0; dumpPiece(); } }
    else if (r.phase === 'final') { r.finalT -= dt; if (r.finalT <= 0) finishRush(); }
    tickRushUI();
  }
  if (S.anim || S.fx.length || live) draw();
  if (S.anim || S.fx.length || live) requestAnimationFrame(frame); else rafOn = false;
}
document.addEventListener('visibilitychange', () => { if (document.hidden && S.rush && S.rush.running && !S.rush.paused) rushAction('pause'); });

function renderRushTray() {
  const r = S.rush, host = $('#trayGroups');
  $('#trayTitle').textContent = 'Moving Day';
  $('#trayCount').textContent = r ? `${r.n - r.queue.length - (r.cur != null ? 1 : 0) - (r.hold != null ? 1 : 0)}/${r.n}` : '';
  if (!r) { host.textContent = ''; return; }
  const hint = { ready: 'Press Start when you\u2019re ready.', count: 'Here they come\u2026', deliver: 'Drag the piece at the door onto the plan.', final: 'Movers are leaving. Tidy up!', done: 'Moved in.' }[r.phase];
  $('#trayHint').textContent = r.paused ? 'Paused.' : hint;
  const cur = r.cur != null ? S.P[r.cur] : null, next = r.queue.slice(0, 3).map((i) => S.P[i]), hold = r.hold != null ? S.P[r.hold] : null;
  host.innerHTML = `
    ${r.phase === 'count' ? `<div class="rush-now count"><div class="big mono" id="rushCount">3</div><div class="nm">Movers at the door</div></div>` : ''}
    ${cur ? `<div class="rush-now ${S.pending && S.pending.p === cur ? 'pending' : ''}" data-grab data-idx="${cur.idx}"><div class="eyebrow">At the door</div><div class="thumbwrap"></div>
      <div class="nm">${esc(CAT[cur.type].name)}${CAT[cur.type].tall ? ' <span class="tag">tall</span>' : ''}</div><div class="dm">${C.base(cur)[0] * 25}\u00d7${C.base(cur)[1] * 25} cm</div>
      <div class="timer"><i id="rushBar"></i></div><div class="tsec mono" id="rushSec"></div></div>` : ''}
    ${r.phase === 'final' ? `<div class="rush-now final"><div class="eyebrow">Finishing touches</div><div class="big mono" id="rushFinal">20</div><button class="primary" data-act="done">I\u2019m done</button></div>` : ''}
    ${r.phase === 'deliver' || r.phase === 'count' ? `<div class="rush-row"><div><div class="eyebrow">Up next</div><div class="nexts">${next.map((p) => `<span class="mini" title="${esc(CAT[p.type].name)}" data-mini="${p.idx}"></span>`).join('') || '<span class="dm">Last one</span>'}</div></div>
      <div><div class="eyebrow">Hallway <kbd>H</kbd></div><button class="mini hold ${r.holdUsed ? 'used' : ''}" data-act="hold" title="Swap the piece at the door into the hallway" ${hold ? `data-mini="${hold.idx}"` : ''}>${hold ? '' : '<span class="dm">empty</span>'}</button></div></div>` : ''}
    ${r.phase !== 'ready' && r.phase !== 'done' ? `<div class="rush-stats"><span><b class="mono" id="rushBank">${Math.round(r.bank)}s</b> time bank</span><span><b class="mono">${quality().perfect}</b> perfect spots</span><span><b class="mono">${r.dumped}</b> dumped</span></div>
      <button class="tool" data-act="pause">${r.paused ? 'Resume' : 'Pause'} <kbd>P</kbd></button>` : ''}
    ${r.phase === 'done' ? `<div class="rush-now final"><div class="eyebrow">Moved in</div><div class="big mono">${r.result.score}</div><button class="primary" data-act="again">Play again</button></div>` : ''}`;
  const tw = host.querySelector('.thumbwrap'); if (tw && cur) tw.appendChild(thumb(cur.type, 180, 96, cur));
  host.querySelectorAll('[data-mini]').forEach((el) => { const p = S.P[+el.dataset.mini]; el.appendChild(thumb(p.type, 44, 36, p)); });
  tickRushUI();
}
function tickRushUI() {
  const r = S.rush; if (!r) return;
  const bar = $('#rushBar'), sec = $('#rushSec');
  if (bar) { const f = Math.max(0, r.t / r.tMax); bar.style.width = f * 100 + '%'; bar.style.background = f < 0.3 ? T.red : f < 0.6 ? T.gold : T.jade; }
  if (sec) sec.textContent = `${r.t.toFixed(1)}s`;
  const cnt = $('#rushCount'); if (cnt) cnt.textContent = Math.max(1, r.count);
  const fin = $('#rushFinal'); if (fin) fin.textContent = Math.ceil(r.finalT);
  const bank = $('#rushBank'); if (bank) bank.textContent = `${Math.round(r.bank)}s`;
}

/* ---------- panels ---------- */
function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }
function renderModes() {
  document.querySelectorAll('#modes button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.mode === S.mode));
  document.body.classList.toggle('rush', rushOn());
  document.body.classList.toggle('sandbox', sandboxOn());
  $('#tUndo').disabled = rushOn(); $('#tClear').disabled = rushOn(); $('#tSaves').disabled = rushOn();
  if (rushOn()) { $('#slots').hidden = true; $('#tSaves').setAttribute('aria-pressed', 'false'); }
  if (!sandboxOn()) { const h = $('#trayGroups'); if (h.querySelector('#libList')) h.textContent = ''; }
  if (!rushOn()) { $('#rushIntro').hidden = true; $('#pauseOverlay').hidden = true; }
}
document.querySelectorAll('#modes button').forEach((b) => b.addEventListener('click', () => {
  if (b.dataset.mode === S.mode) return; switchMode(b.dataset.mode);
}));
function switchMode(m) {
  S.mode = m; saved.mode = m; store.set(saved);
  let li = S.li; const d = C.LEVELS[li];
  if (m === 'sandbox' && d.persona) li = C.LEVELS.findIndex((x) => x.id === d.persona);
  if (m !== 'sandbox' && d.sandboxOnly) li = 0;
  $('#trayGroups').textContent = ''; loadLevel(li);
}
function renderLevels() {
  const host = $('#levels'); host.textContent = '';
  let lastPersona = false;
  levelList().forEach(([d, i], n) => {
    if (d.persona && !lastPersona) { const sep = document.createElement('span'); sep.className = 'lvl-sep'; sep.textContent = 'Households'; host.appendChild(sep); }
    lastPersona = !!d.persona;
    const src = rushOn() ? saved.rush : saved.levels, st = (src[d.id] && src[d.id].stars) || 0, b = document.createElement('button');
    b.className = 'lvl'; b.setAttribute('aria-current', i === S.li ? 'true' : 'false');
    const cnt = sandboxOn() ? ((saved.sandbox[d.id] || []).length) : 0;
    b.innerHTML = `<b>${String(n + 1).padStart(2, '0')}</b><span class="n">${esc(d.name)}</span><span class="st">${sandboxOn() ? `<span class="cnt">${cnt ? cnt + ' pieces' : 'empty'}</span>` : `${'\u2605'.repeat(st)}<i>${'\u2605'.repeat(3 - st)}</i>`}</span>`;
    b.setAttribute('aria-label', `${d.name}, ${st} of 3 stars`);
    b.addEventListener('click', () => { if (i !== S.li) loadLevel(i); });
    host.appendChild(b);
  });
  const cur = host.querySelector('[aria-current="true"]'); if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
function meters(r) {
  const pct = (v) => Math.round(v * 100);
  return `<div class="meters">
    <div class="meter fit"><div class="row"><b>Fit</b><span>${r.placedCount}/${r.movableCount} placed \u00b7 ${r.pts.fit.toFixed(0)}/30</span></div><div class="bar"><i style="width:${pct(r.placedFrac)}%"></i></div></div>
    <div class="meter flow"><div class="row"><b>Flow</b><span>${pct(r.walk)}% \u00b7 ${r.pts.walk.toFixed(0)}/30</span></div><div class="bar"><i style="width:${pct(r.walk)}%"></i></div>
      <p>Doorways ${pct(r.parts.doorFrac)}% \u00b7 reach ${pct(r.parts.accFrac)}% \u00b7 elbow room ${pct(r.parts.zoneFrac)}%</p></div>
    <div class="meter harm"><div class="row"><b>Harmony</b><span>${pct(r.harmony)}% \u00b7 ${r.pts.harmony.toFixed(0)}/40</span></div><div class="bar"><i style="width:${pct(r.harmony)}%"></i></div>
      <p>Feng shui and design sense, weighted by piece</p></div></div>`;
}
function nextLevel() { const l = levelList(), k = l.findIndex(([, i]) => i === S.li); if (l[k + 1]) loadLevel(l[k + 1][1]); }
function starRow(n) { return `<div class="stars" aria-label="${n} of 3 stars">${[1, 2, 3].map((k) => `<span class="${k <= n ? 'on' : ''}">\u2605</span>`).join('')}</div>`; }
function renderScore() {
  const r = S.res;
  if (sandboxOn()) {
    const n = movable().filter((p) => p.placed).length, live = n ? Math.round(100 * (0.45 * r.walk + 0.55 * r.harmony)) : 0;
    const pct = (v) => Math.round(v * 100);
    $('#score').innerHTML = `<div class="eyebrow">Home check \u00b7 sandbox</div>
      <div class="score-top"><div class="big mono">${live}<small>/100</small></div><div class="mono small">${n} pieces<br>no stars, no rules<br>just feedback</div></div>
      <div class="target">How livable it is: walkability and feng shui. Nothing here is required.</div>
      <div class="meters"><div class="meter flow"><div class="row"><b>Flow</b><span>${pct(r.walk)}%</span></div><div class="bar"><i style="width:${pct(r.walk)}%"></i></div>
        <p>Doorways ${pct(r.parts.doorFrac)}% \u00b7 reach ${pct(r.parts.accFrac)}% \u00b7 elbow room ${pct(r.parts.zoneFrac)}%</p></div>
      <div class="meter harm"><div class="row"><b>Harmony</b><span>${pct(r.harmony)}%</span></div><div class="bar"><i style="width:${pct(r.harmony)}%"></i></div></div></div>
      <div class="done-banner"><p>Tip: select a piece and use <b>Style</b> to try every variant of it. <kbd>D</kbd> duplicates.</p>
      <div class="btns"><button class="tool" id="bClearAll" ${n ? '' : 'disabled'}>Empty the plan</button></div></div>`;
    const bc = $('#bClearAll'); if (bc) bc.addEventListener('click', () => { pushUndo(); S.P = S.P.filter((p) => p.fixed); reindex(); S.sel = -1; update(); toast('Plan emptied. Undo brings it back.'); });
    return;
  }
  if (rushOn()) {
    const ru = S.rush;
    if (ru && ru.phase === 'done') {
      const x = ru.result;
      $('#score').innerHTML = `<div class="eyebrow">Moving Day result</div><div class="score-top"><div class="big mono">${x.score}</div>${starRow(x.stars)}</div>
        <div class="target">${x.newBest ? '<b>New best!</b> \u00b7 ' : ''}\u2605 70 \u00b7 \u2605\u2605 100 \u00b7 \u2605\u2605\u2605 120${ru.curb ? ' \u00b7 no stars with pieces left on the curb' : ''}</div>
        <table class="tally"><tr><td>Design score</td><td class="mono">${x.design.toFixed(0)}</td></tr><tr><td>Time bank (${Math.round(ru.bank)}s)</td><td class="mono">+${x.speed.toFixed(0)}</td></tr>
        <tr><td>${ru.perfect} perfect, ${ru.good} good spots</td><td class="mono">+${x.q.pts}</td></tr>
        ${ru.dumped ? `<tr><td>${ru.dumped} dumped by the door</td><td class="mono">\u2212${ru.dumped * 2}</td></tr>` : ''}${ru.curb ? `<tr><td>${ru.curb} left on the curb</td><td class="mono">\u2212${ru.curb * 5}</td></tr>` : ''}</table>
        ${meters(r)}<div class="done-banner"><div class="btns"><button class="primary" id="bAgain">Play again</button>${levelList().findIndex(([, i]) => i === S.li) < levelList().length - 1 ? '<button class="tool" id="bNext">Next plan \u2192</button>' : ''}</div></div>`;
      $('#bAgain').addEventListener('click', () => rushAction('again'));
      const bn = $('#bNext'); if (bn) bn.addEventListener('click', nextLevel);
      return;
    }
    const q = quality(), live = ru ? Math.round(r.total + Math.min(25, ru.bank * 0.4) + q.pts + ru.bonus) : 0;
    $('#score').innerHTML = `<div class="eyebrow">Moving Day \u00b7 running score</div><div class="score-top"><div class="big mono">${live}</div>
      <div class="mono small">design ${Math.round(r.total)}<br>speed +${ru ? Math.round(Math.min(25, ru.bank * 0.4)) : 0}<br>spots +${q.pts}${ru && ru.bonus ? `<br>dumped ${ru.bonus}` : ''}</div></div>
      <div class="target">\u2605 70 \u00b7 \u2605\u2605 100 \u00b7 \u2605\u2605\u2605 120</div>${meters(r)}`;
    return;
  }
  const stars = starsFor(r), opt = S.designer ? S.designer.score : null, sv = saved.levels[C.LEVELS[S.li].id] || {};
  const all = r.placedCount === r.movableCount;
  let banner = '';
  if (all) {
    const beat = opt && r.total > opt + 0.05;
    const head = stars === 3 ? (beat ? 'You beat the designer.' : 'Designer\u2019s eye.') : stars === 2 ? 'Livable and lovely.' : 'Everything fits.';
    const body = !opt ? 'Everything is in.' : stars === 3 ? (beat ? `Your layout outscores the best one our optimiser found (${opt.toFixed(0)}).` : 'You\u2019re within 90% of the best layout we found.')
      : `Reach ${Math.ceil(opt * (stars === 2 ? 0.9 : 0.75))} for ${stars === 2 ? 'three' : 'two'} stars. The notes below show where the points are.`;
    banner = `<div class="done-banner"><h3>${head}</h3><p>${body}</p><div class="btns">
      ${S.designer ? `<button class="tool" id="bPeek" aria-pressed="${S.peek}">${S.peek ? 'Back to my layout' : 'Compare with designer'}</button>` : ''}
      ${levelList().findIndex(([, i]) => i === S.li) < levelList().length - 1 ? '<button class="primary" id="bNext">Next plan \u2192</button>' : ''}
      <button class="tool" id="bRush">Try it on Moving Day</button></div></div>`;
  }
  $('#score').innerHTML = `
    <div class="eyebrow">Design score</div>
    <div class="score-top"><div class="big mono">${Math.round(r.total)}<small>/100</small></div>${starRow(stars)}</div>
    <div class="target">${opt ? `Designer layout: <b class="mono">${opt.toFixed(0)}</b> \u00b7 \u2605\u2605\u2605 at <b class="mono">${Math.ceil(opt * 0.9)}</b>` : ''}${sv.best ? ` \u00b7 Your best: <b class="mono">${Math.round(sv.best)}</b>` : ''}</div>
    ${meters(r)}${banner}`;
  const bp = $('#bPeek'); if (bp) bp.addEventListener('click', () => { S.peek = !S.peek; S.sel = -1; renderScore(); renderSel(); draw(); });
  const bn = $('#bNext'); if (bn) bn.addEventListener('click', nextLevel);
  const br = $('#bRush'); if (br) br.addEventListener('click', () => switchMode('rush'));
}
function renderNotes() {
  const r = S.res, P = S.P, host = $('#notes');
  const tw = r.rules.reduce((a, x) => a + x.w, 0);
  if (S.sel >= 0 && P[S.sel] && P[S.sel].placed && !P[S.sel].fixed) {
    const p = P[S.sel], mine = r.rules.filter((x) => x.pid === p.idx), acc = r.access[p.idx], iss = r.issues.filter((x) => x.pid === p.idx);
    const mark = (s) => s >= 0.9 ? '<span class="ok">\u2713</span>' : s >= 0.5 ? '<span class="meh">~</span>' : '<span class="no">\u2717</span>';
    host.innerHTML = `<h3>${esc(CAT[p.type].name)}</h3><div class="eyebrow">What this piece wants</div>
      <ul class="check">${mine.map((x) => `<li title="${esc(x.tip || '')}">${mark(x.s)}<span>${esc(x.label)}</span><span>${Math.round(x.s * 100)}%</span></li>`).join('')}
      ${acc ? `<li>${mark(acc.s)}<span>Reachable on foot</span><span>${Math.round(acc.s * 100)}%</span></li>` : ''}
      ${iss.filter((x) => x.kind === 'zone').map(() => `<li>${mark(0)}<span>Clearance kept free</span><span></span></li>`).join('')}</ul>
      ${mine.filter((x) => x.s < 0.9).slice(0, 2).map((x) => `<p class="good">${esc(x.tip)}</p>`).join('')}
      ${iss.map((x) => `<p class="good">${esc(x.msg)}</p>`).join('')}`;
    return;
  }
  const flow = r.issues.map((x) => ({ flow: 1, pid: x.pid != null ? x.pid : -1, t: x.label, d: x.msg }));
  const harm = r.rules.filter((x) => x.s < 0.95 && x.label !== 'Not placed yet').map((x) => ({ pid: x.pid != null ? x.pid : -1, t: (x.pid != null ? CAT[P[x.pid].type].name + ': ' : '') + x.label, d: x.tip, lost: 40 * x.w * (1 - x.s) / tw, bad: x.s < 0.4 }))
    .filter((x) => x.lost > 0.12).sort((a, b) => b.lost - a.lost);
  const unplaced = movable().filter((p) => !p.placed).length;
  const list = [...flow, ...harm].slice(0, 9), good = r.rules.filter((x) => x.s >= 0.95 && x.pid != null).length;
  host.innerHTML = `<h3>Designer\u2019s notes</h3>
    ${unplaced && !rushOn() ? `<div class="note bad"><span class="dot"></span><div><div class="t">${unplaced} piece${unplaced > 1 ? 's' : ''} still in the tray</div><div class="d">Everything has to fit before stars count.</div></div><span class="l">\u2212${(30 * unplaced / r.movableCount).toFixed(0)}</span></div>` : ''}
    ${list.map((x) => `<div class="note ${x.flow ? 'flow' : ''} ${x.bad ? 'bad' : ''}" data-pid="${x.pid}"><span class="dot"></span><div><div class="t">${esc(x.t)}</div><div class="d">${esc(x.d)}</div></div><span class="l">${x.flow ? 'flow' : '\u2212' + x.lost.toFixed(1)}</span></div>`).join('')}
    ${!list.length && !unplaced ? '<p class="good">No complaints. This is a well-arranged home.</p>' : ''}
    <p class="good">${good ? `${good} rule${good > 1 ? 's' : ''} already satisfied. ` : ''}Click any piece to see its checklist.</p>`;
  host.querySelectorAll('.note[data-pid]').forEach((n) => {
    const pid = +n.dataset.pid; if (pid < 0) return;
    n.addEventListener('mouseenter', () => { S.hover = pid; n.classList.add('hl'); draw(); });
    n.addEventListener('mouseleave', () => { S.hover = -1; n.classList.remove('hl'); draw(); });
    n.addEventListener('click', () => { S.sel = pid; S.hover = -1; renderSel(); renderNotes(); draw(); });
  });
}
const ICON = {
  ccw: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 3v3h3"/><path d="M3 6a5.5 5.5 0 1 1 1 5"/></svg>',
  cw: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M13 3v3h-3"/><path d="M13 6a5.5 5.5 0 1 0-1 5"/></svg>',
};
function renderSel() {
  const host = $('#selbar'), p = S.P[S.sel];
  const scale = `<span class="scale"><i></i>1 m \u00b7 grid 25 cm</span>`;
  if (S.peek) { host.innerHTML = `<span class="what">Viewing the designer layout.</span><span class="sp"></span>${scale}`; resizeScale(); return; }
  if (!p || !p.placed) { host.innerHTML = `<span class="meta">${S.pending ? 'Tap the plan to drop it.' : 'Select a piece to rotate it. Drag the green handle to set any angle.'}</span><span class="sp"></span>${scale}`; resizeScale(); return; }
  const [w0, h0] = C.base(p), sc = S.res.pieceScore[p.idx];
  host.innerHTML = `<span class="what">${esc(CAT[p.type].name)}</span><span class="meta">${w0 * 25}\u00d7${h0 * 25} cm \u00b7 ${C.norm(p.ang)}\u00b0${sc != null ? ` \u00b7 harmony ${Math.round(sc * 100)}%` : ''}${p.fixed ? ' \u00b7 built in' : ''}</span>
    ${p.fixed ? '' : `<span class="seg"><button class="tool" id="sQ" title="Tilt 15\u00b0 left (Q)">${ICON.ccw}15\u00b0</button><button class="tool" id="sR" title="Turn 90\u00b0 (R)">${ICON.cw}90\u00b0</button><button class="tool" id="sE" title="Tilt 15\u00b0 right (E)">15\u00b0${ICON.cw}</button></span>
    ${styleOptions(p).length > 1 ? `<label class="style">Style <select id="sStyle">${styleOptions(p).map((t) => `<option value="${t}" ${t === p.type ? 'selected' : ''}>${esc(CAT[t].name)} \u00b7 ${CAT[t].w * 25}\u00d7${CAT[t].h * 25}</option>`).join('')}</select></label>` : ''}
    ${sandboxOn() ? '<button class="tool" id="sDup" title="Duplicate (D)">Duplicate</button>' : ''}
    ${rushOn() ? '' : `<button class="tool" id="sDel">${sandboxOn() ? 'Delete' : 'Back to tray'}</button>`}`}<span class="sp"></span>${scale}`;
  const on = (id, fn) => { const el = $(id); if (el) el.addEventListener('click', fn); };
  on('#sQ', () => rotateBy(-C.ANG_STEP)); on('#sR', () => rotateBy(90)); on('#sE', () => rotateBy(C.ANG_STEP)); on('#sDel', removeSel); on('#sDup', duplicateSel);
  const st = $('#sStyle'); if (st) st.addEventListener('change', () => swapStyle(p, st.value));
  resizeScale();
}
function resizeScale() { const sc = $('.scale i'); if (sc) sc.style.width = 4 * cell + 'px'; }

/* ---------- save slots (3 per plan, per mode) ---------- */
function slotList() {
  const m = sandboxOn() ? 'sandbox' : 'free', id = C.LEVELS[S.li].id;
  saved.slots = saved.slots || {}; saved.slots[m] = saved.slots[m] || {};
  return saved.slots[m][id] || (saved.slots[m][id] = [null, null, null]);
}
function piecesFrom(data) {
  if (sandboxOn()) return sandboxPieces(S.L, data);
  const P = C.makePieces(S.L); P.forEach((p) => { p.base = p.type; }); applyLayout(P, data); return P;
}
function liveScore() { const r = S.res; if (!movable().some((p) => p.placed)) return 0; return sandboxOn() ? Math.round(100 * (0.45 * r.walk + 0.55 * r.harmony)) : Math.round(r.total); }
function miniPlan(P, w) {
  const L = S.L, s = w / L.W, c = document.createElement('canvas'), dpr = window.devicePixelRatio || 1;
  c.width = Math.round(w * dpr); c.height = Math.round(L.H * s * dpr); c.style.width = w + 'px'; c.style.height = L.H * s + 'px';
  const x = c.getContext('2d'); x.scale(dpr, dpr);
  for (let i = 0; i < L.W * L.H; i++) { const k = L.kind[i]; if (k === K.OUT) continue;
    x.fillStyle = k === K.FLOOR || k === K.DOOR || k === K.ENTRY ? T.floor.wood : k === K.WIN ? T.glass : T.wall;
    x.fillRect((i % L.W) * s, ((i / L.W) | 0) * s, s + 0.3, s + 0.3); }
  for (const ly of ['floor', 'block']) for (const p of P) if (p.placed && CAT[p.type].layer === ly) paintPiece(x, p, s, { noAnim: true, flat: true });
  return c;
}
function renderSlots() {
  const host = $('#slots'); if (host.hidden) return;
  const list = slotList(), cf = S.slotConfirm;
  host.innerHTML = `<div class="slots-head"><b>Saved arrangements</b><span>${sandboxOn() ? 'Sandbox' : 'Puzzle'} \u00b7 ${esc(C.LEVELS[S.li].name)}</span></div><div class="slot-row"></div>`;
  const row = host.querySelector('.slot-row');
  list.forEach((sl, i) => {
    const card = document.createElement('div'); card.className = 'slot' + (sl ? '' : ' empty');
    const th = document.createElement('div'); th.className = 'sl-thumb';
    if (sl) th.appendChild(miniPlan(piecesFrom(sl.data), 150)); else th.textContent = 'Empty';
    card.appendChild(th);
    const when = sl ? new Date(sl.t).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
    const meta = document.createElement('div'); meta.className = 'sl-meta';
    meta.innerHTML = `<b>Slot ${i + 1}</b><span>${sl ? `${sl.score} pts \u00b7 ${sl.n} pieces<br>${when}` : 'Nothing saved yet'}</span>`;
    card.appendChild(meta);
    const btns = document.createElement('div'); btns.className = 'sl-btns';
    if (cf && cf.i === i) {
      btns.innerHTML = `<span class="sl-q">${cf.act === 'save' ? 'Replace this save?' : 'Delete this save?'}</span><button class="primary" data-sa="yes">${cf.act === 'save' ? 'Replace' : 'Delete'}</button><button class="tool" data-sa="no">Cancel</button>`;
    } else {
      btns.innerHTML = `<button class="tool" data-sa="save">${sl ? 'Overwrite' : 'Save here'}</button>${sl ? '<button class="primary" data-sa="load">Load</button><button class="tool" data-sa="del" aria-label="Delete slot">\u2715</button>' : ''}`;
    }
    btns.addEventListener('click', (e) => { const b = e.target.closest('[data-sa]'); if (b) slotAction(i, b.dataset.sa); });
    card.appendChild(btns); row.appendChild(card);
  });
}
function slotAction(i, a) {
  const list = slotList(), sl = list[i];
  const write = () => { list[i] = { data: snapshot(), score: liveScore(), n: movable().filter((p) => p.placed).length, t: Date.now() }; store.set(saved); toast(`Saved to slot ${i + 1}.`); };
  if (a === 'save') { if (sl) S.slotConfirm = { i, act: 'save' }; else write(); }
  else if (a === 'del') S.slotConfirm = { i, act: 'del' };
  else if (a === 'no') S.slotConfirm = null;
  else if (a === 'yes') { if (S.slotConfirm.act === 'save') write(); else { list[i] = null; store.set(saved); toast(`Slot ${i + 1} cleared.`); } S.slotConfirm = null; }
  else if (a === 'load' && sl) {
    pushUndo();
    if (sandboxOn()) S.P = sandboxPieces(S.L, sl.data); else { movable().forEach((p) => { p.placed = false; p.type = p.base; }); applyLayout(S.P, sl.data); sanitize(); }
    reindex(); for (const p of S.P) p.base = p.base || p.type; S.sel = -1; update(); toast(`Loaded slot ${i + 1}. Undo takes you back.`);
  }
  renderSlots();
}
$('#tSaves').addEventListener('click', (e) => { const h = $('#slots'); h.hidden = !h.hidden; e.currentTarget.setAttribute('aria-pressed', !h.hidden); S.slotConfirm = null; renderSlots(); });

let toastT = 0;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2600); }

/* ---------- toolbar ---------- */
$('#tFlow').addEventListener('click', (e) => { S.flow = !S.flow; e.currentTarget.setAttribute('aria-pressed', S.flow); draw(); });
$('#tLight').addEventListener('click', (e) => { S.light = !S.light; e.currentTarget.setAttribute('aria-pressed', S.light); draw(); });
$('#tUndo').addEventListener('click', undo);
$('#tClear').addEventListener('click', () => { if (rushOn() || !movable().some((p) => p.placed)) return; pushUndo(); movable().forEach((p) => { p.placed = false; }); if (sandboxOn()) { S.P = S.P.filter((p) => p.fixed); reindex(); } S.sel = -1; update(); toast('Plan cleared. Undo brings it back.'); });
$('#pauseOverlay').addEventListener('click', () => rushAction('pause'));
function closeIntro() { $('#intro').hidden = true; saved.intro = 1; store.set(saved); }
$('#introGo').addEventListener('click', closeIntro);
$('#help').addEventListener('click', () => { $('#intro').hidden = false; $('#introGo').focus(); });

/* ---------- boot ---------- */
function start(data) {
  readTheme();
  let li = data && data.li != null ? data.li : saved.last || 0; if (!(li >= 0 && li < C.LEVELS.length)) li = 0;
  if (!levelList().some(([, i]) => i === li)) li = levelList()[0][1];
  loadLevel(li);
  if (data && data.layout && S.mode === 'free') { applyLayout(S.P, data.layout); sanitize(); update(); }
  if (!saved.intro) $('#intro').hidden = false;
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { S.bg = null; renderTray(); draw(); });
}
if (window.claude && window.claude.hot && window.claude.hot.snapshot) window.claude.hot.snapshot(() => ({ li: S.li, layout: rushOn() ? null : layoutOf() }));
if (window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(start); else start((window.claude && window.claude.hot && window.claude.hot.data) || {});
})();
