/* Room to Breathe \u2014 floor plans. Each level carves rooms into a 25 cm grid; walls grow automatically
   around floor, and a one-cell gap between room rectangles becomes an interior wall. */
(function (root) {
'use strict';
const LIST = [
  {
    id: 'studio', outside: 'garden', name: 'Garden Studio', diff: 1, W: 30, H: 22,
    blurb: 'One bright room that has to be bedroom, lounge and office at once. Keep the kitchenette usable.',
    build(a) {
      const S = a.room('Studio', ['living', 'bedroom', 'office', 'dining']);
      const b = a.room('Bath', ['bath']);
      a.rect(b, 1, 1, 8, 7);
      a.rect(S, 10, 1, 19, 8); a.rect(S, 1, 9, 28, 12);
      a.door(3, 8, 3, 'h');
      a.entry(22, 21, 4, 'h');
      a.win(13, 0, 6, 'h'); a.win(21, 0, 5, 'h'); a.win(0, 12, 6, 'v');
    },
    fixtures: [
      { t: 'counter', x: 27, y: 1, w: 2, h: 9, front: 'W', feat: 'sink stove' },
      { t: 'fridge', x: 26, y: 10, w: 3, h: 3, front: 'W' },
      { t: 'tub', x: 1, y: 1, w: 7, h: 3, front: 'S' },
      { t: 'toilet', x: 6, y: 5, w: 3, h: 2, front: 'W' },
      { t: 'vanity', x: 1, y: 4, w: 2, h: 3, front: 'E' },
    ],
    items: { bed_queen: 1, nightstand: 2, wardrobe: 1, couch: 1, tv: 1, desk: 1, floor_lamp: 1, ceiling_light: 2, plant: 1, rug: 1 },
  },
  {
    id: 'onebed', outside: 'street', name: 'Classic One-Bed', diff: 1, W: 38, H: 28,
    blurb: 'A proper bedroom, a living room that opens to the kitchen, and a narrow entry hall.',
    build(a) {
      const B = a.room('Bedroom', ['bedroom']);
      const L = a.room('Living room', ['living']);
      const K = a.room('Kitchen', ['kitchen', 'dining']);
      const b = a.room('Bath', ['bath']);
      const H = a.room('Hall', ['hall']);
      a.rect(B, 1, 1, 14, 14); a.rect(L, 16, 1, 21, 16); a.rect(K, 16, 18, 21, 9);
      a.rect(b, 1, 16, 9, 11); a.rect(H, 11, 16, 4, 11);
      a.door(11, 15, 3, 'h'); a.door(15, 19, 3, 'v'); a.door(10, 20, 3, 'v'); a.door(20, 17, 14, 'h');
      a.entry(11, 27, 4, 'h');
      a.win(4, 0, 7, 'h'); a.win(0, 4, 7, 'v'); a.win(19, 0, 6, 'h'); a.win(28, 0, 6, 'h');
      a.win(37, 4, 9, 'v'); a.win(37, 20, 5, 'v'); a.win(0, 19, 4, 'v');
    },
    fixtures: [
      { t: 'counter', x: 17, y: 25, w: 14, h: 2, front: 'N', feat: 'sink stove' },
      { t: 'fridge', x: 32, y: 24, w: 3, h: 3, front: 'N' },
      { t: 'tub', x: 1, y: 24, w: 7, h: 3, front: 'N' },
      { t: 'toilet', x: 1, y: 17, w: 3, h: 2, front: 'E' },
      { t: 'vanity', x: 8, y: 16, w: 2, h: 3, front: 'W' },
    ],
    items: { bed_queen: 1, nightstand: 2, wardrobe: 1, dresser: 1, couch: 1, armchair: 1, tv: 1, coffee_table: 1, rug: 1,
      bookshelf: 1, dining_table: 1, ceiling_light: 3, floor_lamp: 1, plant: 2, mirror: 1 },
  },
  {
    id: 'lloft', outside: 'city', name: 'The L-Shaped Loft', diff: 2, W: 40, H: 32,
    blurb: 'A long open loft that bends around a courtyard. Zone it into lounge, dining and study without walls.',
    build(a) {
      const L = a.room('Loft', ['living', 'dining', 'office']);
      const B = a.room('Bedroom', ['bedroom']);
      const b = a.room('Bath', ['bath']);
      const U = a.room('Laundry', ['hall']);
      a.rect(L, 1, 1, 28, 13); a.rect(L, 1, 14, 16, 6);
      a.rect(B, 1, 21, 16, 10);
      a.rect(b, 30, 1, 9, 8); a.rect(U, 30, 10, 9, 4);
      a.door(12, 20, 3, 'h'); a.door(29, 4, 3, 'v'); a.door(29, 10, 3, 'v');
      a.entry(20, 14, 4, 'h');
      a.win(4, 0, 6, 'h'); a.win(10, 0, 5, 'h'); a.win(0, 4, 7, 'v'); a.win(0, 23, 6, 'v'); a.win(5, 31, 7, 'h');
      a.win(17, 15, 4, 'v'); a.win(25, 14, 4, 'h'); a.win(33, 0, 3, 'h');
    },
    fixtures: [
      { t: 'counter', x: 19, y: 1, w: 10, h: 2, front: 'S', feat: 'sink stove' },
      { t: 'fridge', x: 16, y: 1, w: 3, h: 3, front: 'S' },
      { t: 'tub', x: 32, y: 1, w: 7, h: 3, front: 'S' },
      { t: 'toilet', x: 36, y: 6, w: 3, h: 2, front: 'W' },
      { t: 'vanity', x: 30, y: 7, w: 3, h: 2, front: 'N' },
      { t: 'washer', x: 36, y: 10, w: 3, h: 3, front: 'W' },
    ],
    items: { bed_queen: 1, nightstand: 2, wardrobe: 1, couch: 1, tv: 1, coffee_table: 1, rug: 1, dining_table: 1,
      desk: 1, bookshelf: 2, aquarium: 1, floor_lamp: 2, ceiling_light: 4, plant: 2 },
  },
  {
    id: 'railroad', outside: 'street', name: 'Railroad Flat', diff: 2, W: 56, H: 16,
    blurb: 'Five rooms in a row, each one a hallway to the next. The doors zigzag, so your walking line does too.',
    build(a) {
      const P = a.room('Parlor', ['living']);
      const K = a.room('Kitchen', ['kitchen', 'dining']);
      const B = a.room('Bedroom', ['bedroom']);
      const O = a.room('Study', ['office']);
      const b = a.room('Bath', ['bath']);
      a.rect(P, 1, 1, 14, 14); a.rect(K, 16, 1, 10, 14); a.rect(B, 27, 1, 12, 14);
      a.rect(O, 40, 1, 8, 14); a.rect(b, 49, 1, 6, 14);
      a.door(15, 10, 3, 'v'); a.door(26, 3, 3, 'v'); a.door(39, 10, 3, 'v'); a.door(48, 3, 3, 'v');
      a.entry(0, 5, 4, 'v');
      a.win(4, 0, 7, 'h'); a.win(4, 15, 7, 'h'); a.win(18, 0, 5, 'h'); a.win(29, 15, 8, 'h');
      a.win(41, 0, 6, 'h'); a.win(51, 0, 3, 'h');
    },
    fixtures: [
      { t: 'counter', x: 16, y: 1, w: 9, h: 2, front: 'S', feat: 'sink stove' },
      { t: 'fridge', x: 23, y: 12, w: 3, h: 3, front: 'N' },
      { t: 'vanity', x: 53, y: 1, w: 2, h: 3, front: 'W' },
      { t: 'toilet', x: 52, y: 6, w: 3, h: 2, front: 'W' },
      { t: 'shower', x: 51, y: 11, w: 4, h: 4, front: 'N' },
    ],
    items: { couch: 1, armchair: 1, tv: 1, coffee_table: 1, bookshelf: 2, dining_table: 1, bed_queen: 1, nightstand: 2,
      dresser: 1, desk: 1, floor_lamp: 1, ceiling_light: 4, plant: 1, mirror: 1, shoe_rack: 1 },
  },
  {
    id: 'pillars', outside: 'street', name: 'Warehouse Conversion', diff: 3, W: 40, H: 30,
    blurb: 'Concrete columns you cannot move and one wall that cuts across the corner at an angle.',
    build(a) {
      const M = a.room('Great room', ['living', 'dining', 'office']);
      const B = a.room('Bedroom', ['bedroom']);
      const b = a.room('Bath', ['bath']);
      const D = a.room('Den', ['office', 'gym']);
      a.rect(M, 1, 1, 38, 18); a.tri(29, 1, 10, 'ne');
      a.rect(B, 1, 20, 20, 9); a.rect(b, 22, 20, 9, 9); a.rect(D, 32, 20, 7, 9);
      a.pillar(11, 6, 2, 2); a.pillar(23, 6, 2, 2); a.pillar(11, 13, 2, 2); a.pillar(23, 13, 2, 2);
      a.door(4, 19, 3, 'h'); a.door(25, 19, 3, 'h'); a.door(34, 19, 3, 'h');
      a.entry(0, 8, 4, 'v');
      a.win(3, 0, 6, 'h'); a.win(13, 0, 8, 'h'); a.win(23, 0, 5, 'h'); a.win(39, 12, 5, 'v');
      a.win(4, 29, 7, 'h'); a.win(13, 29, 5, 'h'); a.win(0, 22, 5, 'v'); a.win(25, 29, 3, 'h'); a.win(39, 22, 5, 'v');
    },
    fixtures: [
      { t: 'counter', x: 1, y: 1, w: 10, h: 2, front: 'S', feat: 'sink stove' },
      { t: 'fridge', x: 12, y: 1, w: 3, h: 3, front: 'S' },
      { t: 'tub', x: 22, y: 26, w: 7, h: 3, front: 'N' },
      { t: 'toilet', x: 28, y: 21, w: 3, h: 2, front: 'W' },
      { t: 'vanity', x: 22, y: 21, w: 2, h: 3, front: 'E' },
    ],
    items: { couch: 1, armchair: 2, tv: 1, coffee_table: 1, rug: 1, dining_table: 1, desk: 1, bookshelf: 2, bed_queen: 1,
      nightstand: 2, wardrobe: 1, treadmill: 1, yoga_mat: 1, plant: 3, floor_lamp: 1, ceiling_light: 4, aquarium: 1 },
  },
  {
    id: 'gym', outside: 'garden', name: 'Two-Bed Gym Rat', diff: 3, W: 40, H: 30,
    blurb: 'A household that owns a treadmill, a bench, a bike and a yoga habit. The spare room is only 3 m square.',
    build(a) {
      const L = a.room('Living room', ['living', 'dining']);
      const K = a.room('Kitchen', ['kitchen']);
      const H = a.room('Hall', ['hall']);
      const B = a.room('Bedroom', ['bedroom']);
      const G = a.room('Gym room', ['gym', 'office']);
      const b = a.room('Bath', ['bath']);
      a.rect(L, 1, 1, 22, 15); a.rect(K, 24, 1, 15, 9); a.rect(H, 24, 11, 15, 5);
      a.rect(B, 1, 17, 14, 12); a.rect(G, 16, 17, 12, 12); a.rect(b, 29, 17, 10, 12);
      a.door(23, 3, 5, 'v'); a.door(23, 12, 3, 'v'); a.door(30, 16, 3, 'h'); a.door(25, 16, 3, 'h'); a.door(10, 16, 3, 'h');
      a.entry(39, 11, 4, 'v');
      a.win(4, 0, 6, 'h'); a.win(13, 0, 6, 'h'); a.win(0, 4, 8, 'v'); a.win(28, 0, 7, 'h'); a.win(39, 3, 5, 'v');
      a.win(0, 20, 6, 'v'); a.win(4, 29, 7, 'h'); a.win(18, 29, 8, 'h'); a.win(39, 21, 4, 'v');
    },
    fixtures: [
      { t: 'counter', x: 24, y: 1, w: 12, h: 2, front: 'S', feat: 'sink stove' },
      { t: 'fridge', x: 36, y: 1, w: 3, h: 3, front: 'S' },
      { t: 'tub', x: 32, y: 26, w: 7, h: 3, front: 'N' },
      { t: 'shower', x: 35, y: 17, w: 4, h: 4, front: 'W' },
      { t: 'toilet', x: 36, y: 22, w: 3, h: 2, front: 'W' },
      { t: 'vanity', x: 29, y: 21, w: 2, h: 3, front: 'E' },
    ],
    items: { couch: 1, tv: 1, coffee_table: 1, armchair: 1, rug: 1, bookshelf: 1, dining_table: 1, bed_queen: 1, nightstand: 2,
      wardrobe: 1, dresser: 1, treadmill: 1, exercise_bike: 1, weight_bench: 1, yoga_mat: 1, bicycle: 1, shoe_rack: 1,
      mirror: 1, floor_lamp: 1, ceiling_light: 4, plant: 2 },
  },
  {
    id: 'tower', angled: true, outside: 'water', name: 'Lighthouse Keeper', diff: 4, W: 34, H: 33,
    blurb: 'A round tower room. Curved walls give nothing flat to lean a bed or bookshelf against.',
    build(a) {
      const S = a.room('Tower room', ['living', 'bedroom', 'dining', 'office']);
      const b = a.room('Bath', ['bath']);
      a.circle(S, 17, 17, 15.5, 0, 21); a.circle(b, 17, 17, 15.5, 23, 33);
      a.door(15, 22, 3, 'h');
      a.entry(1, 15, 4, 'v');
      a.win(13, 1, 8, 'h'); a.win(1, 12, 2, 'v'); a.win(1, 20, 2, 'v');
      a.win(4, 6, 1, 'h'); a.win(5, 5, 1, 'h'); a.win(28, 5, 1, 'h'); a.win(29, 6, 1, 'h');
    },
    fixtures: [
      { t: 'counter', x: 30, y: 12, w: 2, h: 10, front: 'W', feat: 'sink stove' },
      { t: 'vanity', x: 6, y: 23, w: 3, h: 2, front: 'S' },
      { t: 'toilet', x: 10, y: 23, w: 2, h: 3, front: 'S' },
      { t: 'shower', x: 22, y: 23, w: 4, h: 4, front: 'W' },
    ],
    items: { bed_queen: 1, nightstand: 2, dresser: 1, couch: 1, armchair: 1, tv: 1, coffee_table: 1, rug: 1, dining_table: 1,
      desk: 1, bookshelf: 2, floor_lamp: 2, ceiling_light: 3, plant: 2, aquarium: 1 },
  },
  {
    id: 'micro', outside: 'city', name: 'Shoebox Studio', diff: 1, W: 20, H: 22,
    blurb: 'Nineteen square metres on the fifth floor. Every centimetre has to earn its place.',
    build(a) {
      const S = a.room('Studio', ['living', 'bedroom', 'office', 'dining']);
      const b = a.room('Bath', ['bath']);
      a.rect(S, 1, 1, 18, 13); a.rect(S, 9, 14, 10, 7); a.rect(b, 1, 15, 7, 6);
      a.door(2, 14, 3, 'h'); a.entry(14, 21, 4, 'h');
      a.win(5, 0, 9, 'h'); a.win(0, 3, 7, 'v'); a.win(19, 3, 6, 'v');
    },
    fixtures: [
      { t: 'counter', x: 9, y: 19, w: 4, h: 2, front: 'N', feat: 'sink stove' },
      { t: 'fridge', x: 16, y: 14, w: 3, h: 3, front: 'S' },
      { t: 'shower', x: 1, y: 18, w: 3, h: 3, front: 'N' },
      { t: 'toilet', x: 4, y: 18, w: 2, h: 3, front: 'N' },
      { t: 'vanity', x: 6, y: 15, w: 2, h: 3, front: 'W' },
    ],
    items: { bed_single: 1, nightstand: 1, dresser: 1, loveseat: 1, tv: 1, desk: 1, floor_lamp: 1, ceiling_light: 1, plant: 1 },
  },
  {
    id: 'houseboat', outside: 'water', name: 'Canal Houseboat', diff: 2, W: 60, H: 16,
    blurb: 'Three and a half metres wide, seventeen long, with a rounded bow. Portholes instead of picture windows.',
    build(a) {
      const L = a.room('Saloon', ['living', 'dining']);
      const K = a.room('Galley', ['kitchen', 'dining']);
      const b = a.room('Head', ['bath']);
      const H = a.room('Passage', ['hall']);
      const B = a.room('Cabin', ['bedroom']);
      a.rect(L, 1, 1, 20, 14); a.rect(K, 22, 1, 10, 14); a.rect(b, 33, 1, 6, 6); a.rect(H, 33, 8, 6, 7);
      a.rect(B, 40, 1, 12, 14); a.circle(B, 51, 8, 7.5, 0, 15, 51, 59);
      a.door(21, 9, 3, 'v'); a.door(32, 8, 3, 'v'); a.door(34, 7, 3, 'h'); a.door(39, 10, 3, 'v');
      a.entry(0, 5, 4, 'v');
      a.win(4, 0, 3, 'h'); a.win(10, 0, 3, 'h'); a.win(16, 0, 3, 'h'); a.win(4, 15, 3, 'h'); a.win(10, 15, 3, 'h'); a.win(16, 15, 3, 'h');
      a.win(25, 0, 4, 'h'); a.win(43, 0, 4, 'h'); a.win(43, 15, 4, 'h'); a.win(26, 15, 2, 'h');
    },
    fixtures: [
      { t: 'counter', x: 22, y: 1, w: 10, h: 2, front: 'S', feat: 'sink stove' },
      { t: 'counter', x: 22, y: 13, w: 7, h: 2, front: 'N' },
      { t: 'fridge', x: 29, y: 12, w: 3, h: 3, front: 'N' },
      { t: 'vanity', x: 33, y: 1, w: 3, h: 2, front: 'S' },
      { t: 'toilet', x: 37, y: 1, w: 2, h: 3, front: 'S' },
    ],
    items: { couch: 1, armchair: 1, tv: 1, coffee_table: 1, rug: 1, dining_table: 1, bookshelf: 1, bed_queen: 1, nightstand: 2,
      dresser: 1, plant: 2, floor_lamp: 1, ceiling_light: 4, shoe_rack: 1 },
  },
  {
    id: 'attic', outside: 'roof', name: 'Attic Hideaway', diff: 3, W: 40, H: 28,
    blurb: 'The roof slopes down to 1.2 m along both long walls. Tall furniture only fits where you can stand up.',
    build(a) {
      const A = a.room('Attic room', ['living', 'office', 'dining']);
      const B = a.room('Bedroom', ['bedroom']);
      const b = a.room('Bath', ['bath']);
      a.rect(A, 1, 1, 26, 26); a.rect(B, 28, 1, 11, 14); a.rect(b, 28, 16, 11, 11);
      a.pillar(12, 10, 3, 3);
      a.door(27, 8, 3, 'v'); a.door(27, 19, 3, 'v');
      a.entry(0, 12, 4, 'v');
      a.low(1, 1, 38, 4); a.low(1, 23, 38, 4);
      a.sky(5, 1, 4, 3); a.sky(18, 1, 4, 3); a.sky(5, 24, 4, 3); a.sky(18, 24, 4, 3); a.sky(31, 1, 4, 3);
      a.win(39, 5, 6, 'v'); a.win(0, 5, 4, 'v'); a.win(0, 18, 4, 'v');
    },
    fixtures: [
      { t: 'fireplace', x: 12, y: 13, w: 3, h: 2, front: 'S' },
      { t: 'counter', x: 25, y: 11, w: 2, h: 7, front: 'W', feat: 'sink stove' },
      { t: 'tub', x: 32, y: 24, w: 7, h: 3, front: 'N' },
      { t: 'toilet', x: 37, y: 16, w: 2, h: 3, front: 'S' },
      { t: 'vanity', x: 32, y: 16, w: 3, h: 2, front: 'S' },
    ],
    items: { bed_queen: 1, nightstand: 2, wardrobe: 1, dresser: 1, couch: 1, armchair: 2, coffee_table: 1, rug: 1, bookshelf: 2,
      desk: 1, dining_table: 1, plant: 2, floor_lamp: 2, ceiling_light: 3, yoga_mat: 1 },
  },
  {
    id: 'flatiron', angled: true, outside: 'street', name: 'Flatiron Wedge', diff: 4, W: 40, H: 34,
    blurb: 'A triangular corner building that narrows to a two-metre point. Angled furniture is your friend here.',
    build(a) {
      const O = a.room('Study', ['office']);
      const B = a.room('Bedroom', ['bedroom']);
      const b = a.room('Bath', ['bath']);
      const L = a.room('Living room', ['living', 'dining']);
      a.rect(O, 1, 1, 38, 9); a.rect(B, 1, 11, 38, 9); a.rect(b, 1, 21, 8, 8); a.rect(L, 10, 21, 29, 12);
      a.cutIf((x, y) => x > y + 6);
      a.door(4, 10, 3, 'h'); a.door(14, 20, 3, 'h'); a.door(9, 24, 3, 'v');
      a.entry(28, 33, 4, 'h');
      a.winIf((x, y) => x === y + 7 && ((y >= 2 && y <= 7) || (y >= 12 && y <= 17) || (y >= 22 && y <= 28)));
      a.win(0, 3, 5, 'v'); a.win(0, 13, 5, 'v'); a.win(3, 29, 4, 'h');
    },
    fixtures: [
      { t: 'counter', x: 10, y: 31, w: 9, h: 2, front: 'N', feat: 'sink stove' },
      { t: 'fridge', x: 19, y: 30, w: 3, h: 3, front: 'N' },
      { t: 'tub', x: 1, y: 21, w: 7, h: 3, front: 'S' },
      { t: 'toilet', x: 1, y: 25, w: 3, h: 2, front: 'E' },
      { t: 'vanity', x: 5, y: 27, w: 3, h: 2, front: 'N' },
    ],
    items: { couch: 1, armchair: 1, tv: 1, coffee_table: 1, rug: 1, dining_bistro: 1, bed_queen: 1, nightstand: 2, wardrobe: 1,
      desk: 1, bookshelf: 1, plant: 2, floor_lamp: 1, ceiling_light: 4 },
  },
  {
    id: 'family', outside: 'garden', name: 'Family of Four', diff: 4, W: 53, H: 36,
    blurb: 'Two parents, two kids, one long hallway and thirty-eight pieces of furniture. Nobody gets a room to themselves for free.',
    build(a) {
      const L = a.room('Living room', ['living']);
      const K = a.room('Kitchen', ['kitchen', 'dining']);
      const M = a.room('Main bedroom', ['bedroom']);
      const H = a.room('Hallway', ['hall']);
      const C1 = a.room('Kids room', ['bedroom', 'kids']);
      const C2 = a.room('Nursery', ['bedroom', 'kids']);
      const b = a.room('Bath', ['bath']);
      const O = a.room('Study', ['office', 'gym']);
      a.rect(L, 1, 1, 22, 14); a.rect(K, 24, 1, 15, 14); a.rect(M, 40, 1, 12, 14); a.rect(H, 1, 16, 51, 4);
      a.rect(C1, 1, 21, 12, 14); a.rect(C2, 14, 21, 12, 14); a.rect(b, 27, 21, 8, 14); a.rect(O, 36, 21, 16, 14);
      a.door(10, 15, 4, 'h'); a.door(28, 15, 3, 'h'); a.door(44, 15, 3, 'h'); a.door(5, 20, 3, 'h'); a.door(18, 20, 3, 'h');
      a.door(29, 20, 3, 'h'); a.door(40, 20, 3, 'h'); a.door(23, 4, 6, 'v');
      a.entry(0, 16, 4, 'v');
      a.win(4, 0, 6, 'h'); a.win(13, 0, 6, 'h'); a.win(0, 4, 7, 'v'); a.win(27, 0, 7, 'h'); a.win(43, 0, 6, 'h'); a.win(52, 4, 7, 'v');
      a.win(0, 24, 7, 'v'); a.win(4, 35, 6, 'h'); a.win(16, 35, 8, 'h'); a.win(29, 35, 3, 'h'); a.win(40, 35, 8, 'h'); a.win(52, 24, 7, 'v');
    },
    fixtures: [
      { t: 'counter', x: 24, y: 1, w: 12, h: 2, front: 'S', feat: 'sink stove' },
      { t: 'fridge', x: 36, y: 1, w: 3, h: 3, front: 'S' },
      { t: 'tub', x: 27, y: 32, w: 7, h: 3, front: 'N' },
      { t: 'toilet', x: 32, y: 21, w: 3, h: 2, front: 'W' },
      { t: 'vanity', x: 27, y: 23, w: 2, h: 3, front: 'E' },
      { t: 'washer', x: 32, y: 25, w: 3, h: 3, front: 'W' },
    ],
    items: { bed_queen: 1, bed_single: 1, bunk_bed: 1, nightstand: 2, wardrobe: 2, dresser: 1, desk: 3, toy_chest: 2, bookshelf: 2,
      couch: 1, loveseat: 1, armchair: 1, tv: 1, coffee_table: 1, rug: 2, dining_table: 1, exercise_bike: 1, plant: 3,
      floor_lamp: 2, ceiling_light: 7, shoe_rack: 1, mirror: 1 },
  },
];
const ORDER = ['studio', 'micro', 'onebed', 'houseboat', 'lloft', 'railroad', 'attic', 'pillars', 'gym', 'flatiron', 'tower', 'family'];
const MAIN = ORDER.map((id) => LIST.find((l) => l.id === id));
// Households: an existing floor plan furnished for someone's interests
const persona = (baseId, extra) => ({ ...LIST.find((l) => l.id === baseId), persona: baseId, ...extra });
const HOUSEHOLDS = [
  persona('lloft', { id: 'musician', name: 'The Musician\u2019s Loft', diff: 2, retag: { Loft: ['music'] },
    blurb: 'A drummer and a pianist share the loft. Keep the drums away from the bedroom and give the records a listening chair.',
    items: { bed_queen: 1, nightstand: 2, wardrobe: 1, couch: 1, coffee_table: 1, rug: 2, drum_kit: 1, piano: 1, guitar_stand: 2, amp: 1,
      record_player: 1, bookshelf: 1, dining_round: 1, floor_lamp: 2, ceiling_light: 4, plant: 2 } }),
  persona('onebed', { id: 'gamer', name: 'Gamer & Two Cats', diff: 2, retag: { 'Living room': ['gaming'] },
    blurb: 'A battlestation, an arcade cabinet and two cats who need a window perch and a litter box nowhere near dinner.',
    items: { bed_queen: 1, nightstand: 2, wardrobe: 1, gaming_desk: 1, bean_bag: 2, tv: 1, couch: 1, arcade: 1, cat_tree: 2, litter_box: 1,
      pet_bed: 1, bookshelf: 1, dining_round: 1, floor_lamp: 1, ceiling_light: 3, plant: 1 } }),
  persona('attic', { id: 'artist', name: 'The Artist\u2019s Garret', diff: 3, retag: { 'Attic room': ['art'] },
    blurb: 'Two easels and a drafting table all want the skylights, and easels are too tall for the sloped edges.',
    items: { bed_queen: 1, nightstand: 2, dresser: 1, easel: 2, drafting_table: 1, art_cart: 2, loveseat: 1, armchair: 1, coffee_round: 1, rug: 1,
      plant_shelf: 1, plant: 3, floor_lamp: 2, ceiling_light: 3, dining_bistro: 1, bookshelf: 1 } }),
  persona('tower', { id: 'reader', name: 'Plant Parent\u2019s Lighthouse', diff: 3,
    blurb: 'Two library bookcases, a wingback reading chair and a jungle of plants, all fighting for the same few windows.',
    items: { bed_queen: 1, nightstand: 2, dresser: 1, reading_chair: 1, tall_bookcase: 2, plant_shelf: 2, plant: 4, floor_lamp: 2, meditation: 1,
      loveseat: 1, coffee_round: 1, dining_round: 1, ceiling_light: 3 } }),
];
const BLANK = {
  id: 'blank', outside: 'garden', name: 'Blank Canvas', diff: 1, W: 46, H: 34, sandboxOnly: true,
  blurb: 'An empty 11 \u00d7 8 m shell with windows on three sides. Build whatever you like.',
  build(a) {
    const O = a.room('Open space', ['living', 'bedroom', 'office', 'dining', 'gym', 'kids', 'music', 'art', 'gaming']);
    a.rect(O, 1, 1, 44, 32);
    a.entry(21, 33, 4, 'h');
    a.win(5, 0, 8, 'h'); a.win(19, 0, 8, 'h'); a.win(33, 0, 8, 'h'); a.win(0, 6, 8, 'v'); a.win(0, 20, 8, 'v'); a.win(45, 6, 8, 'v'); a.win(45, 20, 8, 'v');
  },
  fixtures: [], items: {},
};
const LEVELS = [...MAIN, ...HOUSEHOLDS, BLANK];
if (typeof module !== 'undefined' && module.exports) module.exports = LEVELS; else root.RTB_LEVELS = LEVELS;
})(typeof window !== 'undefined' ? window : globalThis);
