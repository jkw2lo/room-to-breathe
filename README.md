# Room to Breathe

A floor-plan puzzle game in the browser. Fit every piece of furniture into an apartment, keep it walkable, and arrange it with good feng shui.

## Modes

- **Puzzle**: place the furniture you're given, at any 15° angle, and swap pieces for other styles. Score within 90% of the hand-made designer layout for three stars.
- **Moving Day**: the movers bring one piece at a time on a timer. Too slow and they dump it by the front door.
- **Sandbox**: design freely with the full 70-piece library, across interest packs like music, art, gaming, pets, fitness and reading.

Each plan has three save slots.

## Scoring

- **Fit** (30): pieces placed.
- **Flow** (30): a 75 cm walking path from the front door to every doorway, bed side, sofa and appliance, plus clearance for chairs, drawers and doors.
- **Harmony** (40): feng shui and design rules. Beds against solid walls and out of the door line, seating facing the TV, desks by windows, plants in daylight, every room lit.

## Run it

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

## Files

| File | What it holds |
| --- | --- |
| `levels.js` | The 17 floor plans, built on a 25 cm grid |
| `core.js` | Furniture catalog, placement, walkability and scoring (runs in the browser and Node) |
| `game.js`, `draw-more.js` | UI, rendering and illustrations |
| `optimal.js` | Designer target layouts, generated from `tools/designs.js` |
| `tools/designs.js` | Hand-made designer layouts |
| `tools/designer.js` | Checks the designer layouts, lightly repairs walkways and writes `optimal.js` |
| `tools/check.js`, `tools/map.js` | Validate plans and print them with coordinates |
| `tools/opt.js` | Optimiser that drafts layouts (not used for the targets) |

After editing `tools/designs.js`, regenerate the targets:

```bash
node tools/designer.js
```
