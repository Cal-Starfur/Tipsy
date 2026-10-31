# Kit 5: Houses (contract v2)

**What this covers:** the house kit inside the shop library (LIB): `houseDoorway`, `houseWin`, `houseFace` and the roofs, yards and garages.

**Evidence:** 34 past corrections, plus the shop rules that apply to houses too.

**Checker:** `--kit shops` (the H rules) and `--kit landmarks` (collision).

| ID | Rule | Ev | Status | Check |
|---|---|---|---|---|
| H1 | **No secondary ground.** `houseLawn` stays empty: no lawn, yard base, lot slab or paving plate. Only paths, drives and courts sit on the block's own ground. | 11 | K (lawn); C (plates) | ✅ H1 (green plates), H1b (a house's yard base) |
| H2 | **A house has a working door at true size.** `houseDoorway` gives 92 × 184 game at any scale, and the entry declares `door`. | 3 | K for size; C to declare | ✅ declared door; ☐ size |
| H3 | **Every declared layer is drawn** (draw, fore, back) in the game, in `roofOf` and in `doorOf`. | 2 (severe) | K (`LIB.draw`); flaw: `doorOf` skips `fore()` | ☐ |
| H4 | **Roofs are closed convex solids.** Gable ends are wall material, and there's no eaves plate drawn over the slopes. | 5 | K (`houseFace`) | ☐ |
| H5 | **A garage belongs to its house:** in the house's livery, flush with its front and back lines, and its drive ends inside its own door. | 6 | C | ☐ |
| H6 | **Drawn size = declared size** (the drawn box is within ±4% of the `vol` footprint). Scale the house, not the door. | 4 | C | ☐ |
| H7 | **Wall tone comes from the world normal** (+x lit .78, otherwise .72). | 2 | K | — |
| H8 | **Access:** the front path runs from the door to the sidewalk, and a declared fence encloses the lot. | 3 | C | eye |

**Approved:**
- **Exemplars:** the Flats houses after "no fake grass or yard bases" (b9092e4).
- **Garages:** the strand's attached garages (07bfd55).
- **Sizing:** Brenta Palladian Villa (588428f).
