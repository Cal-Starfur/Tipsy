# Kit 10: X-ray, night and light (contract v2)

**Evidence:** 135 past corrections (86 x-ray, 49 night and light).

**Checker:** X1 is measured at every depth stand.

| ID | Rule | Ev | Status | Check |
|---|---|---|---|---|
| X1 | **Tipsey ghosts at 5 of 5 rays** (3 of 5 on a mat), never at 0. The ghost is off in the garage, in cut-away rooms and behind glass. | 31 | K | ✅ (no stands on mats, decks or in the lift yet) |
| X1h | **Coverage reaches the tallest declared height**, marching in steps of 8. | 4 | K | ✅ |
| X1w | **The rays span his width (±34)**, so a gap you can see him through keeps the ghost off. | 4 | K | ✅ |
| X3 | **Only the covered part ghosts.** Props are clipped at their cover line, and people are tested at the head (z + 125). | 9 | K | ☐ |
| X4 | **One x-ray test for everyone:** people, props, mats, rugs, customers and room furniture. | 11 | part (mats, customers and furniture opt in themselves) | ☐ |
| X5 | **A ghost is plain teal** (`XRAY.col` 0x8fe3d0) built from the object's own shapes. | 7 | C (hand strokes) | ☐ palette |
| X6 | **No pop or pulse:** the ghost eases, and features grow in. | 5 | K | ☐ stability |
| X7 | **Never cut buildings away to show him.** Ghost him instead. | 4 | K | eye |
| X8 | **The wall trace is the collision edge**, on his floor, using reachable faces only. | 11 | part | ☐ |
| X9 | **X-ray people and items stay within the trace's radius.** | 3 | hospital only (street people: radius 1400, an open question) | ☐ |
| X10 | **Things under floors draw as x-ray silhouettes.** | 3 | C | eye |
| X11 | **The trace stays readable on its backing:** teal, with a white edge over glass. | 2 | hospital only | ☐ contrast |
| X12 | **Hidden kerbs and ramps near him are traced**, and grow in. | 3 | K | — |
| X2 | **Light is masked by what's in front of it** (his eyes and beams; a lamp's pool under nearer trees and cars). | 14 | K for him and the lamp pool; C for lamp bloom and shaft lights | ☐ lights on vs off |
| X2s | **A light's layer and brightness never depend on where Tipsey is.** Masking only removes pixels. | 1 (a revert) | K | ☐ |
| LG1 | **Every light is layered** (wash, mid, core) plus a ground pool, with no bands or hard ends. | 6 | C (no light kit) | ☐ |
| LG2 | **Lights on a moving thing are built from its full pose:** beams start at the eyes. | 7 | K | ☐ pose sweep |
| LG3 | **A light pool lies on the ground under it** (terrace, deck), never at z 0. | 4 | K | ☐ |
| LG4 | **Only night gates a pool.** Fixture detail fades with facing (floor 0.4). | 2 | K | ☐ |
| N1 | **Night is consistent:** the lit cut covers the whole footprint up to the real wall heights, and the street outside stays night. | 9 | C (night boxes typed in per building) | ☐ night run |
| N2 | **Lights ease** (900 ms), never switch in one frame. | 2 | K | ☐ |
| N3 | **The kerb keeps its contrast at night.** | 2 | C | ☐ |

**Approved values:**
- **Rays:** at 0, ±17 and ±34, at head height 60 (plus the deck height on the garage roof).
- **Ghost strength:**
  - street: 0.55 × hits/5 (rises 0.14, falls 0.09);
  - 0.85 in the hospital, the lift and under the mall slab;
  - 0 in the garage and behind glass.
- **Props:** 0.38, below their cover line.
- **People:** tested at the head, radius 1400.
- **Trace:** teal 0x8fe3d0 with a white edge in the ward; trace radius 420.
- **Lamp pool:** radius 70, layers 0.34 / 0.20 / 0.10, cone 0.07.
- **Headlights:** facing floor 0.4, pool 100 ahead.
- **Night:** navy at 0.65; pocket lights ease up over 900 ms.
- **Superseded fixes** (the checker must not use them as references):
  - 5b3ef60, the amber trace;
  - the lamp-layer part of 0a2a19b;
  - the route cutaway (62139f2 and 1e6a2ff).

## Known kit flaws
1. **Two truths for height:** coverage reads a declared copy, not the drawing (landmarks L4).
2. **The ghost alpha is one long special-case expression**, and every walk-in building adds a branch.
3. **Mats, customers and furniture opt in to the ghost themselves.**
4. **Three glow paths and no light kit.**
5. **Each building's night cut is typed in by hand.**
6. **A radius mismatch:** 420 inside versus 1400 on the street.
