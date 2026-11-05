# Kit 3: Depth sort, draw order and camera (contract v2)

**Evidence:** 278 past corrections.

**Checker:** `node tools/world_review.js --kit depth`. It stands Tipsey round buildings, renders the frame with and without him, and compares what shows against the game's own x-ray coverage.

## How the code works today (checked)
- **The world queue** is keyed on world `x + y`. The prop queue (`hazVQ`) and the roofs are merged into one `worldVQ` flush. The old "roofs drawn last" and "third pass" comments describe retired behaviour.
- **The ground** (`groundVQ`) is sorted and drawn first.
- **`depthSort`** keys on `P(a,b,0).y + z·u`: the screen projection plus base height.
- **Building units** (`queueUnitStrips`) are one entry each, keyed at their footprint centre.
- **The camera:** `camPixelSnap` runs once at the top of `update`, and the ease runs per ms.

## Rules
| ID | Rule | Ev | Status | Check |
|---|---|---|---|---|
| S0 | **Ground first.** Flat things (mats, pads, decals, cracks, floods, crossing ramps, floor cells) go in `groundVQ`, or get a key below every body standing on them. | 13 | C (mats and floods in `hazVQ` are keyed by hand) | ☐ queue audit |
| S0b | **Raised ground is a body.** Terraces, a kerb in front of a car, lift platforms and escalator flights sort as solids with height. | 7 | C | ☐ |
| S1 | **One world sort.** Everything standing goes into `worldVQ` once, keyed at world `x+y`. Nothing is drawn first or last by call order, and there is no pass after the flush. | 14 | K | ✅ **S1o**: something paints over him in the open; **S1u**: he paints over what he's behind |
| S1b | **Keyed where it stands now**: the live base point, or the laid-down outline once knocked. Never the spawn point, the crown, a bias or the centre height. | 10 | C | ☐ key inside its own box |
| S2 | **Buildings stay whole**: one entry per unit, keyed at its footprint centre `min+(W+D)/2`, on one layer. Never slice a building or key it at a corner. | 16 | K (`queueUnitStrips`) | ✅ S1o/S1u; ☐ one entry per unit |
| S3 | **Runs are split**: fences, rails, low walls, kerbs, hedges, counters, colonnades and pier rails, at **150 or less**. Landmark runs Tipsey touches: 108–124. A low fence (h ≈ 34) of 600 or less is fine under `lmDepth`. Each collidable post is its own entry. Floor cells are 300 or less. | 45 | C (no splitter in the kit) | ☐ queue item length |
| S3b | **Far runs are keyed at their far end** and drawn before the building; near runs come after it. A wall's sides are ordered by which side of its plane the body is on. | 6 | C | ☐ |
| S3c | **Split joins have no seams.** Only the run's real ends are capped. | 3 | C | ☐ |
| S4 | **An attachment is never split from its mount** (signal head and mast; awning, doors or canopy on a lift tower): one entry, mount first. If they must be separate, the attachment's key is ≥ its host's. | 11 | C | ☐ |
| S5 | **Inside one object, order by projection.** Roof items, grouped stock and furniture go through `depthSort` (base z), never through a loop's call order. | 32 | C (loops bypass `depthSort`) | ☐ order inside an entry |
| S5b | **Faces by normal.** Draw a face only when its outward normal faces the eye. Never use a hard-coded `fdir`, a lab frame, or `a+b` in a landmark frame. | 14 | K for `box`/`slab`; C for faces built by hand | ☐ backface fills |
| S5c | **Moving parts by normal at every pose** (wheels, lid, visor, flag, decals). Never use a z-weighted point or a fixed array order. An attachment shows exactly when its host face shows. | 16 | C | ☐ pose sweep |
| S5d | **Contact interleaves**: far arms, bodies, near arms, heads. At a counter: back parts, then the person, then front parts. | 8 | C | eye |
| S5e | **Interiors:** back walls sort under everything in the room. Lower levels are clipped by the upper floor's edge. | 8 | C | ✅ S1o inside (as notes) |
| S6 | **Every body counts.** An order worked out against Tipsey (`lmDepth`) must also hold for people, crew and robots. | 7 | C (`lmDepth` reads only Tipsey) | ☐ the same stand test with a person |
| C1 | **One camera per frame, on whole pixels.** Ease per ms, and clamp the target, never the eased camera. Loads never jump the camera. | 15 | K | ☐ camera audit |
| C2 | **Draw into the `g` you are handed.** `bcDraw` keys are stable and include content. Big builders cull by world box. | 6 | C | ✅ landmarks L3 |
| O1 | **Poses are continuous.** Heading, roll, pitch and hinges never snap. Previews and the minimap use the real drawers. | 30 | C | ☐ |

## Approved values
- **Building keys:** the centre key gave 0 violations across 11,475 probes; the near-corner key gave 4,743 (commit acb6e4e).
- **Runs:** 150 or less (fault); 140 is a warning for runs Tipsey touches.
- **Escalator lane:** under him only on the lane itself.
- **Stand checks:** S1o fires below 60% visible; S1u fires above 50% visible while behind.
- **Mutation tests** (the checker must fire on these reverted states):
  - the near-corner key;
  - slicing turned on;
  - the car bumper bias (6dd71af);
  - lamp-glow layering (71df87c).

## Known kit flaws
1. **No splitter.** Callers cut runs by hand (45 corrections). Fix: `queueRun(vq, kind, p0, p1, h, drawSeg)`.
2. **`lmDepth` only knows Tipsey.** Fix: `lmDepthAgainst(movers)`.
3. **About eight special cases by name** in the robot's own key (glass lift, deck, escalator). Fix: a generic `onSurface(x, y)`.
4. **Loops inside library entries draw in call order.** Fix: `LIB.draw` sorts every top-level item.
5. **Flat things are keyed by hand in `hazVQ`.** Fix: `{flat: true}` routes them to `groundVQ`.
6. **The kerb in front of a parked car is repainted inside each car's cache.**
7. **Out-of-date comments** about the flush order.
