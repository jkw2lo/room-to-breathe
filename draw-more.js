/* Room to Breathe - illustrations for style variants and interest packs. Extends window.RTB_DRAW (set up by game.js helpers). */
(function (root) {
'use strict';
root.RTB_MORE = function (DRAW, h) {
  const { sbox, box, circ, scirc, line, faint, glow, shd, rr, lt, dk, F, ACCENT, variant, sofa, rng, hash } = h;
  const TAU = Math.PI * 2;
  const inset = (c, W, H, s, p, pad, fn) => { c.save(); c.translate(pad, pad); fn(c, W - pad * 2, H - pad * 2, s, p); c.restore(); };

  DRAW.bed_king = DRAW.bed_queen;
  DRAW.bed_platform = (c, W, H, s, p) => { sbox(c, 0, s * 0.3, W, H - s * 0.3, s * 0.15, F.walnut, true, 0.08); inset(c, W, H, s, p, s * 0.5, DRAW.bed_queen); };
  DRAW.bed_canopy = (c, W, H, s, p) => {
    inset(c, W, H, s, p, s * 0.35, DRAW.bed_queen);
    c.save(); c.setLineDash([s * 0.35, s * 0.2]); c.globalAlpha *= 0.7; rr(c, s * 0.2, s * 0.2, W - s * 0.4, H - s * 0.4, s * 0.1); c.stroke(); c.restore();
    faint(c, 0.25, () => { c.fillStyle = '#FFFFFF'; c.fillRect(s * 0.2, s * 0.2, s * 0.5, H - s * 0.4); c.fillRect(W - s * 0.7, s * 0.2, s * 0.5, H - s * 0.4); });
    for (const [x, y] of [[0, 0], [W - s * 0.5, 0], [0, H - s * 0.5], [W - s * 0.5, H - s * 0.5]]) sbox(c, x, y, s * 0.5, s * 0.5, s * 0.25, F.woodD);
  };
  DRAW.daybed = (c, W, H, s, p) => {
    sbox(c, 0, 0, W, H, s * 0.3, F.metal);
    sbox(c, s * 0.25, s * 0.25, W - s * 0.25, H - s * 0.5, s * 0.25, h.DUVETS[variant(p, 5)]);
    for (const y of [s * 0.5, H - s * 1.4]) sbox(c, W * 0.2, y, W * 0.65, s * 0.9, s * 0.45, F.pillow);
    const acc = ACCENT[variant(p, 5)]; for (let i = 0; i < 3; i++) { c.save(); c.translate(s * 0.9, H * (0.3 + i * 0.2)); c.rotate(-0.2); sbox(c, -s * 0.5, -s * 0.5, s, s, s * 0.3, i === 1 ? acc : lt(acc, 0.3)); c.restore(); }
  };
  DRAW.crib = (c, W, H, s) => {
    sbox(c, 0, 0, W, H, s * 0.15, F.white);
    box(c, s * 0.25, s * 0.25, W - s * 0.5, H - s * 0.5, s * 0.15, '#E9F1F4');
    faint(c, 0.4, () => { for (let x = s * 0.25; x < W - s * 0.2; x += s * 0.3) { line(c, x, 0, x, s * 0.25); line(c, x, H - s * 0.25, x, H); } });
    sbox(c, s * 0.4, H * 0.45, W - s * 0.8, H * 0.45, s * 0.15, '#F4C9C1'); circ(c, W / 2, s * 0.8, s * 0.35, '#F7E0A3');
  };
  DRAW.armoire = (c, W, H, s) => {
    sbox(c, 0, 0, W, H, s * 0.25, F.walnut, true, 0.15);
    for (let i = 0; i < 2; i++) { sbox(c, s * 0.2 + i * (W / 2 - s * 0.1), s * 0.35, W / 2 - s * 0.3, H - s * 0.55, s * 0.15, lt(F.walnut, 0.08));
      faint(c, 0.5, () => { c.strokeStyle = F.brass; rr(c, s * 0.4 + i * (W / 2 - s * 0.1), s * 0.55, W / 2 - s * 0.7, H - s * 0.95, s * 0.1); c.stroke(); }); }
    circ(c, W / 2 - s * 0.2, H - s * 0.35, s * 0.1, F.brass, false); circ(c, W / 2 + s * 0.2, H - s * 0.35, s * 0.1, F.brass, false);
  };
  DRAW.tall_bookcase = DRAW.bookshelf;
  DRAW.sideboard = (c, W, H, s, p) => {
    sbox(c, 0, 0, W, H, s * 0.1, F.walnut);
    faint(c, 0.3, () => { for (let k = 1; k < 4; k++) line(c, W * k / 4, H - s * 0.3, W * k / 4, H); });
    glow(c, W * 0.15, H * 0.45, s * 1.2, '255,214,120', 0.35); scirc(c, W * 0.15, H * 0.45, s * 0.4, h.F.linen);
    sbox(c, W * 0.35, s * 0.25, s * 1.6, s * 0.6, s * 0.3, '#E6DCC8'); for (let i = 0; i < 3; i++) circ(c, W * 0.35 + s * 0.35 + i * s * 0.45, s * 0.55, s * 0.18, ['#E07A5F', '#F2CC8F', '#81B29A'][i]);
    scirc(c, W * 0.82, H * 0.45, s * 0.35, ACCENT[variant(p, 5)]); for (let i = 0; i < 4; i++) line(c, W * 0.82, H * 0.45, W * 0.82 + Math.cos(i * 1.6) * s * 0.6, H * 0.45 + Math.sin(i * 1.6) * s * 0.5);
  };
  DRAW.wine_rack = (c, W, H, s) => {
    sbox(c, 0, 0, W, H, s * 0.06, F.woodD);
    for (let y = s * 0.35; y < H; y += s * 0.55) for (let x = s * 0.35; x < W; x += s * 0.55) circ(c, x, y, s * 0.2, ['#5A1E2A', '#2F4A2A', '#6B2230'][Math.floor(x + y) % 3]);
  };
  DRAW.chesterfield = (c, W, H, s, p) => {
    sofa(c, W, H, s, 3, '#8A5A3C', p);
    faint(c, 0.6, () => { c.fillStyle = '#5E3B26'; for (let x = s * 1.2; x < W - s; x += s * 0.6) for (const y of [s * 0.35, s * 0.75]) { c.beginPath(); c.arc(x + (y > s * 0.5 ? s * 0.3 : 0), y, s * 0.05, 0, TAU); c.fill(); } });
  };
  DRAW.sofa_chaise = (c, W, H, s, p) => {
    const col = [h.F.sofa, '#B7A99A', '#6F8A7A'][variant(p, 3)];
    sbox(c, W - s * 3, s, s * 3, H - s, s * 0.4, lt(col, 0.05));
    faint(c, 0.25, () => line(c, W - s * 2.6, H - s * 0.5, W - s * 0.6, H - s * 0.5));
    sofa(c, W, s * 4, s, 3, col, p);
    sbox(c, W - s * 3, s * 1.1, s * 2.4, H - s * 1.4, s * 0.35, lt(col, 0.08), true, 0.06);
  };
  DRAW.reading_chair = (c, W, H, s, p) => {
    const col = ['#6F8A7A', '#9C4F48', '#4B607A'][variant(p, 3)];
    sbox(c, 0, 0, W, s * 3.4, s * 0.5, dk(col, 0.12));
    sbox(c, 0, 0, W, s * 1, s * 0.45, col); sbox(c, 0, s * 0.3, s * 0.8, s * 2.9, s * 0.4, col); sbox(c, W - s * 0.8, s * 0.3, s * 0.8, s * 2.9, s * 0.4, col);
    sbox(c, s * 0.8, s * 0.95, W - s * 1.6, s * 2.3, s * 0.35, lt(col, 0.08));
    sbox(c, s * 0.5, s * 3.6, W - s, H - s * 3.7, s * 0.4, lt(col, 0.05));
    c.save(); c.translate(W * 0.55, s * 2.1); c.rotate(0.3); sbox(c, -s * 0.45, -s * 0.3, s * 0.9, s * 0.6, s * 0.04, '#E6DCC8'); c.restore();
  };
  DRAW.rocking_chair = (c, W, H, s, p) => {
    c.save(); c.strokeStyle = F.woodD; c.lineWidth = s * 0.16; for (const x of [s * 0.3, W - s * 0.3]) { c.beginPath(); c.moveTo(x, -s * 0.1); c.quadraticCurveTo(x - s * 0.15, H / 2, x, H + s * 0.1); c.stroke(); } c.restore();
    sbox(c, s * 0.35, 0, W - s * 0.7, s * 0.8, s * 0.2, F.wood);
    sbox(c, s * 0.35, s * 0.7, W - s * 0.7, H - s * 1.2, s * 0.3, F.woodL);
    sbox(c, s * 0.55, s * 0.9, W - s * 1.1, H - s * 1.6, s * 0.3, ACCENT[variant(p, 5)]);
  };
  DRAW.coffee_round = (c, W, H, s) => {
    scirc(c, W / 2, H / 2, W / 2 - s * 0.05, F.woodL);
    faint(c, 0.2, () => { for (let r = s * 0.5; r < W / 2; r += s * 0.4) { c.beginPath(); c.arc(W / 2, H / 2, r, 0, TAU); c.stroke(); } });
    c.save(); c.translate(W * 0.4, H * 0.45); c.rotate(0.4); sbox(c, -s * 0.5, -s * 0.35, s, s * 0.7, s * 0.05, '#5C7F99'); c.restore();
    scirc(c, W * 0.65, H * 0.62, s * 0.3, F.potB); for (let i = 0; i < 6; i++) circ(c, W * 0.65 + Math.cos(i) * s * 0.17, H * 0.62 + Math.sin(i) * s * 0.17, s * 0.12, F.leaf2);
  };
  DRAW.ottoman = (c, W, H, s, p) => {
    const col = ['#B38B6D', '#7E97A9', '#C9A46A'][variant(p, 3)];
    sbox(c, 0, 0, W, H, s * 0.6, col);
    faint(c, 0.5, () => { c.fillStyle = dk(col, 0.3); for (let x = s * 0.75; x < W; x += s * 0.75) for (let y = s * 0.75; y < H; y += s * 0.75) { c.beginPath(); c.arc(x, y, s * 0.06, 0, TAU); c.fill(); } });
    sbox(c, W * 0.25, H * 0.3, W * 0.5, H * 0.4, s * 0.1, F.woodD); scirc(c, W * 0.42, H * 0.5, s * 0.15, F.white);
  };
  DRAW.rug_round = (c, W, H, s, p) => {
    const [a, b, e] = h.RUGS[variant(p, h.RUGS.length)], R = W / 2;
    circ(c, R, R, R, a);
    c.save(); c.strokeStyle = b; c.lineWidth = s * 0.3; c.beginPath(); c.arc(R, R, R - s * 0.5, 0, TAU); c.stroke();
    c.strokeStyle = e; c.lineWidth = s * 0.15; c.beginPath(); c.arc(R, R, R - s * 1.3, 0, TAU); c.stroke();
    c.fillStyle = b; for (let i = 0; i < 8; i++) { const an = i * TAU / 8; c.beginPath(); c.ellipse(R + Math.cos(an) * R * 0.45, R + Math.sin(an) * R * 0.45, s * 0.6, s * 0.25, an, 0, TAU); c.fill(); }
    c.fillStyle = e; c.beginPath(); c.arc(R, R, s * 0.8, 0, TAU); c.fill(); c.restore();
  };
  DRAW.runner = (c, W, H, s, p) => {
    const [a, b, e] = h.RUGS[variant(p, h.RUGS.length)];
    box(c, 0, s * 0.3, W, H - s * 0.6, s * 0.08, a);
    c.save(); c.strokeStyle = b; c.lineWidth = s * 0.18; rr(c, s * 0.3, s * 0.6, W - s * 0.6, H - s * 1.2, s * 0.04); c.stroke();
    c.fillStyle = e; for (let y = s * 1.3; y < H - s; y += s * 1.1) { c.beginPath(); c.moveTo(W / 2, y - s * 0.4); c.lineTo(W / 2 + s * 0.5, y); c.lineTo(W / 2, y + s * 0.4); c.lineTo(W / 2 - s * 0.5, y); c.closePath(); c.fill(); }
    c.restore(); faint(c, 0.5, () => { for (let x = s * 0.2; x < W; x += s * 0.3) { line(c, x, 0, x, s * 0.3); line(c, x, H - s * 0.3, x, H); } });
  };
  function diningSet(c, W, H, s, p, o) {
    const chair = [h.F.sage, F.woodD, h.F.rose, '#2E3336'][variant(p, 4)];
    const seat = (x, y, rot) => { c.save(); c.translate(x, y); c.rotate(rot); sbox(c, -s * 0.65, -s * 0.6, s * 1.3, s * 1.2, s * 0.3, chair); sbox(c, -s * 0.6, s * 0.35, s * 1.2, s * 0.3, s * 0.12, dk(chair, 0.15)); c.restore(); };
    if (o.round) {
      const n = o.n, R = Math.min(W, H) / 2 - s * 0.7;
      for (let i = 0; i < n; i++) { const a = i * TAU / n + Math.PI / 4; seat(W / 2 + Math.cos(a) * R, H / 2 + Math.sin(a) * R, a - Math.PI / 2 + Math.PI); }
      scirc(c, W / 2, H / 2, R - s * 0.35, F.wood);
      for (let i = 0; i < n; i++) { const a = i * TAU / n + Math.PI / 4; scirc(c, W / 2 + Math.cos(a) * (R - s * 1.05), H / 2 + Math.sin(a) * (R - s * 1.05), s * 0.3, F.white); }
      scirc(c, W / 2, H / 2, s * 0.25, '#DCE8EC'); circ(c, W / 2, H / 2, s * 0.12, '#E07A5F', false);
      return;
    }
    const cd = s * 1.1, n = o.n;
    for (let i = 0; i < n; i++) { const x = W * (i + 0.5) / n; if (!o.bench) { seat(x, s * 0.7, Math.PI); seat(x, H - s * 0.7, 0); } }
    if (o.bench) { sbox(c, s * 0.6, s * 0.15, W - s * 1.2, s * 0.9, s * 0.2, F.woodD); sbox(c, s * 0.6, H - s * 1.05, W - s * 1.2, s * 0.9, s * 0.2, F.woodD); }
    if (o.ends) { seat(s * 0.6, H / 2, Math.PI / 2); seat(W - s * 0.6, H / 2, -Math.PI / 2); }
    const tx = o.ends ? s * 1.3 : s * 0.25;
    sbox(c, tx, cd, W - tx * 2, H - cd * 2, s * 0.25, o.bench ? F.woodL : F.wood);
    faint(c, 0.7, () => { c.fillStyle = '#EDE6D8'; c.fillRect(tx + s * 0.6, H / 2 - s * 0.35, W - tx * 2 - s * 1.2, s * 0.7); });
    for (let i = 0; i < n; i++) { const x = W * (i + 0.5) / n; for (const y of [cd + s * 0.5, H - cd - s * 0.5]) scirc(c, x, y, s * 0.32, F.white); }
    scirc(c, W / 2, H / 2, s * 0.28, '#DCE8EC'); for (let i = 0; i < 5; i++) circ(c, W / 2 + Math.cos(i * 1.26) * s * 0.18, H / 2 + Math.sin(i * 1.26) * s * 0.18, s * 0.11, ['#E07A5F', '#F2CC8F', '#E6A0B0'][i % 3]);
  }
  DRAW.dining_round = (c, W, H, s, p) => diningSet(c, W, H, s, p, { round: 1, n: 4 });
  DRAW.dining_bistro = (c, W, H, s, p) => diningSet(c, W, H, s, p, { round: 1, n: 2 });
  DRAW.dining_bench = (c, W, H, s, p) => diningSet(c, W, H, s, p, { bench: 1, n: 3 });
  DRAW.dining_long = (c, W, H, s, p) => diningSet(c, W, H, s, p, { n: 3, ends: 1 });
  DRAW.kitchen_island = (c, W, H, s, p) => {
    for (let i = 0; i < 3; i++) scirc(c, W * (i + 0.5) / 3, H - s * 0.55, s * 0.5, F.dark);
    sbox(c, 0, 0, W, H - s * 1, s * 0.08, F.stone, true, 0.05);
    const r = rng(hash('isl')); faint(c, 0.35, () => { c.fillStyle = '#9DA19C'; for (let i = 0; i < 120; i++) c.fillRect(r() * W, r() * (H - s), 1, 1); });
    sbox(c, W * 0.1, s * 0.4, s * 1.4, s * 0.9, s * 0.1, F.woodL); scirc(c, W * 0.7, s * 1.1, s * 0.45, '#E9E4DA');
    for (let i = 0; i < 3; i++) circ(c, W * 0.7 + Math.cos(i * 2) * s * 0.2, s * 1.1 + Math.sin(i * 2) * s * 0.2, s * 0.14, ['#E07A5F', '#F2CC8F', '#81B29A'][i], false);
    void p;
  };
  DRAW.standing_desk = (c, W, H, s, p) => {
    sbox(c, W / 2 - s * 1.2, H + s * 0.4, s * 2.4, s * 1.4, s * 0.4, '#3C4A52');
    sbox(c, 0, 0, W, H, s * 0.12, '#E8E4DC');
    c.save(); c.strokeStyle = F.dark; c.lineWidth = s * 0.12; line(c, W / 2, s * 0.25, W / 2, s * 0.7); c.restore();
    const sg = c.createLinearGradient(0, 0, 0, s); sg.addColorStop(0, '#30393D'); sg.addColorStop(1, '#171C1F');
    box(c, W * 0.22, s * 0.3, W * 0.56, s * 0.35, s * 0.05, sg);
    sbox(c, W * 0.3, H * 0.6, W * 0.4, s * 0.45, s * 0.06, F.white); scirc(c, W * 0.85, H * 0.5, s * 0.2, F.white);
    scirc(c, W * 0.12, H * 0.5, s * 0.3, F.potB); circ(c, W * 0.12, H * 0.5, s * 0.2, F.leaf2); void p;
  };
  DRAW.writing_desk = (c, W, H, s, p) => {
    const cx = W / 2, cy = H + s * 1.1;
    sbox(c, cx - s * 0.7, cy - s * 0.6, s * 1.4, s * 1.3, s * 0.3, F.woodD); sbox(c, cx - s * 0.7, cy + s * 0.45, s * 1.4, s * 0.3, s * 0.1, dk(F.woodD, 0.1));
    sbox(c, 0, 0, W, H, s * 0.15, F.walnut);
    c.save(); c.translate(W * 0.45, H * 0.55); c.rotate(-0.1); sbox(c, -s * 0.6, -s * 0.4, s * 1.2, s * 0.8, s * 0.04, '#F3EDE0');
    faint(c, 0.4, () => { for (let k = 0; k < 3; k++) line(c, -s * 0.45, -s * 0.2 + k * s * 0.18, s * 0.45, -s * 0.2 + k * s * 0.18); }); c.restore();
    glow(c, W * 0.15, H * 0.4, s * 1.1, '255,214,120', 0.35); scirc(c, W * 0.15, H * 0.4, s * 0.28, F.brass); void p;
  };
  DRAW.sewing_table = (c, W, H, s, p) => {
    const cx = W / 2, cy = H + s * 1.1; sbox(c, cx - s * 0.7, cy - s * 0.6, s * 1.4, s * 1.2, s * 0.6, F.woodL);
    sbox(c, 0, 0, W, H, s * 0.12, F.woodL);
    c.save(); c.translate(W * 0.28, H * 0.55); c.rotate(0.15); box(c, -s * 0.9, -s * 0.6, s * 1.8, s * 1.1, s * 0.05, ACCENT[variant(p, 5)]);
    faint(c, 0.4, () => { c.strokeStyle = '#fff'; for (let k = -s * 0.8; k < s * 0.9; k += s * 0.35) line(c, k, -s * 0.6, k + s * 0.3, s * 0.5); }); c.restore();
    sbox(c, W * 0.55, s * 0.4, W * 0.35, s * 1.2, s * 0.25, F.white); sbox(c, W * 0.55, s * 0.4, s * 0.45, s * 1.2, s * 0.15, '#DDE3E6');
    circ(c, W * 0.88, H * 0.8, s * 0.2, '#C44B3A'); circ(c, W * 0.78, H * 0.82, s * 0.16, '#5C7F99');
  };
  DRAW.arc_lamp = (c, W, H, s) => {
    const ex = W / 2 + s * 2.4, ey = H / 2 - s * 0.4;
    glow(c, ex, ey, s * 2.2, '255,214,120', 0.45);
    scirc(c, W / 2, H / 2, W * 0.36, '#6E7478');
    c.save(); c.strokeStyle = h.F.steel; c.lineWidth = s * 0.14; c.beginPath(); c.moveTo(W / 2, H / 2); c.quadraticCurveTo(W / 2 + s * 1.2, -s * 1.2, ex, ey); c.stroke(); c.restore();
    scirc(c, ex, ey, s * 0.55, h.F.steel); circ(c, ex, ey, s * 0.2, '#FFF3CF', false);
  };
  DRAW.chandelier = (c, W, H, s) => {
    glow(c, W / 2, H / 2, W * 1.6, '255,220,130', 0.5);
    c.save(); c.strokeStyle = F.brass; c.lineWidth = s * 0.1; c.beginPath(); c.arc(W / 2, H / 2, W * 0.32, 0, TAU); c.stroke();
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6; line(c, W / 2, H / 2, W / 2 + Math.cos(a) * W * 0.32, H / 2 + Math.sin(a) * W * 0.32); } c.restore();
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6; scirc(c, W / 2 + Math.cos(a) * W * 0.32, H / 2 + Math.sin(a) * W * 0.32, s * 0.22, '#FFF3CF'); }
    scirc(c, W / 2, H / 2, s * 0.25, F.brass);
  };
  DRAW.plant_shelf = (c, W, H, s, p) => {
    sbox(c, 0, 0, W, H, s * 0.08, F.woodL);
    const r = rng(hash(p.id || 'ps')), n = Math.floor(W / s);
    for (let i = 0; i < n; i++) { const x = s * 0.5 + i * (W - s) / Math.max(1, n - 1), y = H / 2 + (i % 2 ? s * 0.15 : -s * 0.15);
      scirc(c, x, y, s * 0.35, i % 2 ? F.potB : F.pot, true);
      for (let k = 0; k < 6; k++) { const a = r() * TAU; scirc(c, x + Math.cos(a) * s * 0.25, y + Math.sin(a) * s * 0.25, s * (0.15 + r() * 0.1), [F.leaf, F.leaf2, F.leaf3][k % 3], false); } }
  };
  DRAW.rowing_machine = (c, W, H, s) => {
    sbox(c, W / 2 - s * 0.35, 0, s * 0.7, H, s * 0.2, h.F.steel);
    scirc(c, W / 2, H - s * 1, s * 1.1, F.dark); faint(c, 0.5, () => { c.strokeStyle = '#8A9295'; c.beginPath(); c.arc(W / 2, H - s, s * 0.7, 0, TAU); c.stroke(); });
    sbox(c, W / 2 - s * 0.55, H * 0.35, s * 1.1, s * 0.9, s * 0.3, '#2E3336');
    for (const x of [s * 0.1, W - s * 0.9]) sbox(c, x, H - s * 2.6, s * 0.8, s * 0.5, s * 0.15, F.dark);
    c.save(); c.lineWidth = s * 0.14; line(c, s * 0.2, H - s * 3.2, W - s * 0.2, H - s * 3.2); c.restore();
  };
  DRAW.punching_bag = (c, W, H, s) => {
    circ(c, W / 2 + s * 0.2, H / 2 + s * 0.25, W * 0.38, 'rgba(0,0,0,.15)', false);
    scirc(c, W / 2, H / 2, W * 0.36, '#A33A2E'); faint(c, 0.5, () => { c.strokeStyle = '#6E2219'; c.beginPath(); c.arc(W / 2, H / 2, W * 0.2, 0, TAU); c.stroke(); });
    circ(c, W / 2, H / 2, s * 0.12, h.F.steel);
  };
  DRAW.meditation = (c, W, H, s, p) => {
    const col = ['#7A6BA8', '#C98F5A', '#5E8C7A'][variant(p, 3)];
    sbox(c, 0, 0, W, H, s * 0.2, lt(col, 0.3), true, 0.05); scirc(c, W / 2, H / 2, W * 0.35, col);
    faint(c, 0.5, () => { for (let i = 0; i < 8; i++) { const a = i * TAU / 8; line(c, W / 2, H / 2, W / 2 + Math.cos(a) * W * 0.33, H / 2 + Math.sin(a) * W * 0.33); } });
  };
  DRAW.drum_kit = (c, W, H, s) => {
    const shell = '#A2372F', head = '#F2EEE6';
    c.save(); c.strokeStyle = h.F.steel; c.lineWidth = s * 0.08; line(c, W * 0.15, H * 0.25, W * 0.85, H * 0.25); c.restore();
    for (const [x, y, r] of [[0.14, 0.2, 0.85], [0.86, 0.2, 0.95], [0.9, 0.6, 0.75]]) { scirc(c, W * x, H * y, s * r, '#D9B25E'); faint(c, 0.4, () => { c.beginPath(); c.arc(W * x, H * y, s * r * 0.5, 0, TAU); c.stroke(); }); }
    sbox(c, W * 0.34, s * 0.1, W * 0.32, s * 1.6, s * 0.4, shell); faint(c, 0.9, () => { c.fillStyle = head; c.fillRect(W * 0.36, s * 0.2, W * 0.28, s * 0.25); });
    for (const [x, y, r] of [[0.38, 0.4, 0.55], [0.62, 0.4, 0.55], [0.76, 0.66, 0.75], [0.27, 0.62, 0.55]]) { circ(c, W * x, H * y, s * r, shell); circ(c, W * x, H * y, s * r * 0.82, head); }
    scirc(c, W * 0.5, H * 0.8, s * 0.6, '#2E3336');
  };
  DRAW.guitar_stand = (c, W, H, s, p) => {
    const col = ['#C8763A', '#2F2F33', '#B8322B'][variant(p, 3)];
    c.save(); c.translate(W / 2, H / 2); c.rotate(-0.5);
    c.fillStyle = shd(c, -s * 0.6, -s * 0.2, s * 1.2, s * 1.6, col, 0.15); c.beginPath(); c.ellipse(0, s * 0.35, s * 0.55, s * 0.5, 0, 0, TAU); c.ellipse(0, -s * 0.15, s * 0.42, s * 0.38, 0, 0, TAU); c.fill(); c.stroke();
    circ(c, 0, s * 0.15, s * 0.16, '#2A2422', false);
    c.fillStyle = F.walnut; c.fillRect(-s * 0.08, -s * 1.3, s * 0.16, s * 1.0); c.strokeRect(-s * 0.08, -s * 1.3, s * 0.16, s * 1.0);
    c.restore();
  };
  DRAW.amp = (c, W, H, s) => {
    sbox(c, 0, 0, W, H, s * 0.1, '#2A2A2C');
    faint(c, 0.8, () => { c.fillStyle = '#C9B48A'; c.fillRect(s * 0.2, s * 0.25, W - s * 0.4, H * 0.55); c.fillStyle = '#9E8A62'; for (let x = s * 0.25; x < W - s * 0.2; x += s * 0.15) c.fillRect(x, s * 0.25, 1, H * 0.55); });
    for (let i = 0; i < 4; i++) circ(c, s * 0.35 + i * s * 0.4, H - s * 0.3, s * 0.08, F.brass, false);
  };
  DRAW.record_player = (c, W, H, s, p) => {
    sbox(c, 0, 0, W, H, s * 0.1, F.walnut);
    sbox(c, s * 0.25, s * 0.2, s * 1.9, H - s * 0.4, s * 0.1, '#D9D2C6');
    circ(c, s * 1.1, H / 2, s * 0.62, '#1A1A1A'); circ(c, s * 1.1, H / 2, s * 0.2, ACCENT[variant(p, 5)], false);
    c.save(); c.strokeStyle = h.F.steel; c.lineWidth = s * 0.07; line(c, s * 1.95, s * 0.35, s * 1.45, H / 2 + s * 0.1); c.restore();
    for (let i = 0; i < 7; i++) { c.fillStyle = ['#C46B5A', '#5C7F99', '#E6DCC8', '#2F2F33', '#D9B25E', '#7E9C6B', '#A58BB0'][i]; c.fillRect(W * 0.55 + i * s * 0.28, s * 0.25, s * 0.2, H - s * 0.5); }
  };
  DRAW.easel = (c, W, H, s, p) => {
    c.save(); c.strokeStyle = F.woodD; c.lineWidth = s * 0.16; line(c, W * 0.15, H * 0.9, W / 2, H * 0.35); line(c, W * 0.85, H * 0.9, W / 2, H * 0.35); line(c, W / 2, H * 0.35, W / 2, s * 0.1); c.restore();
    const cols = [['#F2CC8F', '#E07A5F', '#81B29A'], ['#A8DADC', '#457B9D', '#F1FAEE'], ['#F4A261', '#2A9D8F', '#E9C46A']][variant(p, 3)];
    const gr = c.createLinearGradient(s * 0.2, 0, W - s * 0.2, 0); gr.addColorStop(0, cols[0]); gr.addColorStop(0.5, cols[1]); gr.addColorStop(1, cols[2]);
    box(c, s * 0.2, H * 0.35, W - s * 0.4, s * 0.45, s * 0.04, gr);
    scirc(c, W * 0.8, H * 0.75, s * 0.28, '#F3EDE0'); for (let i = 0; i < 3; i++) circ(c, W * 0.8 + Math.cos(i * 2) * s * 0.14, H * 0.75 + Math.sin(i * 2) * s * 0.14, s * 0.07, cols[i], false);
  };
  DRAW.drafting_table = (c, W, H, s) => {
    scirc(c, W / 2, H + s * 1.1, s * 0.6, F.dark);
    sbox(c, 0, 0, W, H, s * 0.1, F.woodL);
    box(c, s * 0.4, s * 0.35, W - s * 0.8, H - s * 0.9, s * 0.04, '#FBFAF6');
    faint(c, 0.35, () => { c.strokeStyle = '#4B6A88'; for (let k = 0; k < 4; k++) line(c, s * 0.8, s * 0.8 + k * s * 0.45, W - s * 0.9, s * 0.8 + k * s * 0.45); c.beginPath(); c.arc(W * 0.6, H * 0.45, s * 0.6, 0, TAU); c.stroke(); });
    c.save(); c.strokeStyle = F.dark; c.lineWidth = s * 0.08; line(c, s * 0.3, H - s * 0.35, W - s * 0.3, H - s * 0.35); c.restore();
    glow(c, W - s * 0.5, s * 0.5, s * 1.3, '255,214,120', 0.35); scirc(c, W - s * 0.5, s * 0.5, s * 0.3, h.F.steel);
  };
  DRAW.art_cart = (c, W, H, s) => {
    sbox(c, 0, 0, W, H, s * 0.2, '#E3B25B');
    const cols = ['#E07A5F', '#3D5A80', '#81B29A', '#F2CC8F'];
    for (let i = 0; i < 4; i++) scirc(c, W * (0.28 + (i % 2) * 0.44), H * (0.28 + (i >> 1) * 0.44), s * 0.28, cols[i]);
  };
  DRAW.gaming_desk = (c, W, H, s) => {
    const cx = W / 2, cy = H + s * 1.2;
    sbox(c, cx - s * 0.9, cy - s * 0.8, s * 1.8, s * 1.7, s * 0.4, '#1F2326'); sbox(c, cx - s * 0.6, cy - s * 0.6, s * 1.2, s * 1.2, s * 0.3, '#C43B3B');
    sbox(c, 0, 0, W, H, s * 0.12, '#24292C');
    c.save(); c.strokeStyle = '#7C5CFF'; c.lineWidth = s * 0.08; c.shadowColor = '#7C5CFF'; c.shadowBlur = s * 0.4; line(c, s * 0.2, H - s * 0.12, W - s * 0.2, H - s * 0.12); c.restore();
    const scr = (x, a) => { c.save(); c.translate(x, s * 0.6); c.rotate(a); const sg = c.createLinearGradient(-s, 0, s, 0); sg.addColorStop(0, '#1E3A5F'); sg.addColorStop(1, '#3B1E5F'); box(c, -s * 0.95, -s * 0.15, s * 1.9, s * 0.3, s * 0.05, sg); c.restore(); };
    scr(W * 0.18, 0.35); scr(W * 0.5, 0); scr(W * 0.82, -0.35);
    sbox(c, W * 0.3, H * 0.6, W * 0.28, s * 0.4, s * 0.05, '#3A3F42'); sbox(c, W * 0.64, H * 0.58, s * 0.9, s * 0.8, s * 0.1, '#3A3F42'); scirc(c, W * 0.64 + s * 0.45, H * 0.58 + s * 0.4, s * 0.15, '#9AA1A4');
  };
  DRAW.bean_bag = (c, W, H, s, p) => {
    const col = ['#E07A5F', '#3D5A80', '#81B29A', '#7C5CFF'][variant(p, 4)];
    c.beginPath(); c.moveTo(W * 0.5, s * 0.1); c.bezierCurveTo(W * 1.02, s * 0.1, W * 1.02, H * 0.95, W * 0.5, H * 0.95); c.bezierCurveTo(-W * 0.02, H * 0.95, -W * 0.02, s * 0.1, W * 0.5, s * 0.1);
    c.fillStyle = shd(c, 0, 0, W, H, col, 0.18); c.fill(); c.stroke();
    faint(c, 0.35, () => { c.beginPath(); c.ellipse(W / 2, H * 0.62, W * 0.25, H * 0.2, 0, 0, TAU); c.stroke(); });
  };
  DRAW.arcade = (c, W, H, s) => {
    sbox(c, 0, 0, W, H, s * 0.1, '#1F2A5A');
    box(c, s * 0.3, s * 0.3, W - s * 0.6, H * 0.45, s * 0.05, '#0E1122');
    faint(c, 0.9, () => { c.fillStyle = '#FFD166'; c.fillRect(W * 0.3, s * 0.55, s * 0.25, s * 0.25); c.fillStyle = '#EF476F'; c.fillRect(W * 0.55, s * 0.9, s * 0.25, s * 0.25); c.fillStyle = '#06D6A0'; c.fillRect(W * 0.4, s * 1.1, s * 0.2, s * 0.2); });
    circ(c, W * 0.3, H * 0.78, s * 0.18, '#EF476F'); for (let i = 0; i < 3; i++) circ(c, W * 0.55 + i * s * 0.32, H * 0.78, s * 0.12, ['#FFD166', '#06D6A0', '#118AB2'][i]);
  };
  DRAW.pet_bed = (c, W, H, s, p) => {
    const col = ['#B8A48C', '#8FA3B0', '#C98F86'][variant(p, 3)];
    scirc(c, W / 2, H / 2, W / 2 - s * 0.05, col); scirc(c, W / 2, H / 2, W / 2 - s * 0.45, lt(col, 0.35));
    const fur = ['#D9A066', '#3A3A3A', '#F2F0EB'][variant(p, 3)];
    c.save(); c.translate(W / 2, H / 2); c.fillStyle = fur; c.beginPath(); c.ellipse(0, 0, s * 0.62, s * 0.45, 0.4, 0, TAU); c.fill(); c.stroke();
    c.beginPath(); c.arc(s * 0.45, -s * 0.3, s * 0.25, 0, TAU); c.fill(); c.stroke(); c.restore();
  };
  DRAW.cat_tree = (c, W, H, s) => {
    scirc(c, W * 0.35, H * 0.65, W * 0.33, '#CBB79A'); scirc(c, W * 0.68, H * 0.35, W * 0.28, '#CBB79A');
    faint(c, 0.5, () => { c.fillStyle = '#E7DCC8'; c.beginPath(); c.arc(W * 0.68, H * 0.35, W * 0.18, 0, TAU); c.fill(); });
    scirc(c, W * 0.5, H * 0.5, s * 0.25, '#B89B72');
    c.save(); c.fillStyle = '#4A4A4A'; c.beginPath(); c.ellipse(W * 0.68, H * 0.35, s * 0.35, s * 0.25, -0.5, 0, TAU); c.fill(); c.restore();
  };
  DRAW.litter_box = (c, W, H, s) => {
    sbox(c, 0, 0, W, H, s * 0.3, '#D4E0E6'); box(c, s * 0.2, s * 0.2, W - s * 0.4, H - s * 0.4, s * 0.2, '#E8DCC0', false);
    const r = rng(3); faint(c, 0.5, () => { c.fillStyle = '#B9A77F'; for (let i = 0; i < 40; i++) c.fillRect(s * 0.25 + r() * (W - s * 0.5), s * 0.25 + r() * (H - s * 0.5), 1.2, 1.2); });
  };
  DRAW.play_mat = (c, W, H, s) => {
    const cols = ['#F2CC8F', '#81B29A', '#E07A5F', '#A8DADC'];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { c.fillStyle = cols[(i + j * 2) % 4]; c.fillRect(i * W / 4, j * H / 4, W / 4, H / 4); }
    c.strokeRect(0, 0, W, H);
    faint(c, 0.5, () => { c.strokeStyle = '#fff'; for (let i = 1; i < 4; i++) { line(c, i * W / 4, 0, i * W / 4, H); line(c, 0, i * H / 4, W, i * H / 4); } });
    sbox(c, W * 0.2, H * 0.25, s * 0.7, s * 0.7, s * 0.08, '#5C8F5A'); sbox(c, W * 0.3, H * 0.35, s * 0.6, s * 0.6, s * 0.08, '#F0C35A'); scirc(c, W * 0.7, H * 0.65, s * 0.45, '#C44B3A');
  };
};
})(window);
