# Kit 7: Streets and ground (contract v2)

**Evidence:** 201 past corrections.

**Checker:** `--kit ground` (holes). The shop checker covers secondary ground.

**Constants (checked):**
- `ROAD_HALF` 368, `CURB_W` 46, `SIDEWALK_W` 368 (4 lanes of `T2` 92).
- `KERB_STONE` 8 high × 22 wide, with its pavement face on ±`ROAD_HALF`.
- `KERB_ARC_R` 24, so the tangent is at 392.
- `WORLD_RAMP` along 460, across 598, landing 0.8.
- `STOP_LINE_D` 454, `DRIVE_CLEAR` 244.

| ID | Rule | Ev | Status | Check |
|---|---|---|---|---|
| G1 | **No backdrop:** `pal.sky` never shows inside the frame (landscape or portrait, at the edge ring, at corners, in gaps). | 15 | C | ✅ (outdoors) |
| G1b | **A gap under or between streets is pavement**, on the `paveParity` lattice. Past the last sidewalk it is grass. | 6 | K | ☐ |
| G2 | **No secondary ground:** no lawn, plate, slab, apron, lot paving or rug. Declare `ground:'grass'`. Ramps have no apron. | 28 | C | ✅ H1 |
| G3 | **The street section, always:** asphalt to ±ROAD_HALF, the gutter, the 8 × 22 stone, then SIDEWALK_W of paving. The kerb starts at 392 from the node. No kerb across a junction or a street mouth. | 55 | K for lattice streets; C for Sierra and the harbour circle | ☐ kerb census |
| G4 | **A kerb cut matches what it serves:** the pad is ±TILE, with T2 flares that replace the stone. The seam and paint run on through flares and arcs. | 22 | K | eye |
| G5 | **Ramps come in pairs across every crossing**, with a zebra between them, and only where a real cross street exists. | 15 | K | ☐ pair check |
| G6 | **Ramp fit:** the landing is at 0.8, and the slopes at a corner abut, never overlap. | 15 | K | eye |
| G7 | **Collision is the drawn kerb:** the step is at ±ROAD_HALF ±4 wherever stone is drawn, open wherever it's cut, and never where there's no stone. | 10 | K (but a second box decides the opening) | ☐ kerb probe |
| G8 | **Drives cross the whole footway** at one width, with a dropped kerb and flares. Cuts are merged, or ≥ DRIVE_CLEAR apart. | 14 | C | ☐ |
| G9 | **One paving lattice:** T2 on `paveParity`, one sidewalk grey, one grass checker phase. | 13 | C | ☐ pixels |
| G10 | **Order:** block ground, then roads, drives and ramps, then the kerb, then walls, then bodies. Flat things go in the ground pass. | 18 | K | ☐ |
| G11 | **Decals are clipped to their surface** (a puddle never crosses the kerb). | 4 | C | ☐ |
| G12 | **Landforms:** a level change shows a camera-facing face, and every edge between land and water has a treatment. | 20 | C | eye |

**Approved:**
- **Exemplars:** any 4-way junction in the Flats near the `shops` spot: stone, arc, paired ramps with flares, zebra, stop line.
- **Drives:** the hospital garage drive (1afc654).
- **Edges:** the city's edge ring after f2cb1f9 and 648d73f.
- **Not references:** d45c23f (a 15-high stone, later cut to 8) was reopened, so it doesn't count.

## Known kit flaws
1. **Three kerb stones** (the city's, Sierra's and the harbour circle's).
2. **Three ramp boxes** (the drawn cut, `owAtRampMouth`, and the furniture exclusion), none read from the ramp record.
3. **The kerb in front of parked cars is repainted inside each car's cache.**
4. **No `driveKit`.** Each site rolls its own drive.
