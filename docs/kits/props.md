# Kit 11: Street props (contract v1, new)

**What this covers:** anything standing on the street: lamps, signal posts and heads, benches, bins, hydrants, palms and trees, planters, cones, bollards, scooters, trash, charging stations and scatter.

**Evidence:** 194 past corrections. No kit existed for these before.

| ID | Rule | Ev | Status | Check |
|---|---|---|---|---|
| SP1 | **One registry.** Every placed prop lives in the city's list (`cityFurnitureForEdge` → `cityFurnitureNear`), and the art, solids, clear zones and culling all read it. What's drawn is solid, and what's solid is drawn. | 12 | part (the pier, park benches and library benches sit outside it) | ✅ L2 |
| SP2 | **Placed by street rules, not scatter.** Lamps, trees, bins and hydrants go on lane 0 (lamps about 2 per block, trees in a one-tile grate between lamps, bins at the corners past the ramp). Planters go on lane 0 or 3. Lanes 1–2 stay clear. The long axis runs along the kerb. | 17 | K for the fixed kinds; C for cones, scooters and trash | ☐ lane census |
| SP3 | **No free-standing clutter on the footway unless it's wanted.** If a prop competes with the read, remove it. | 10 | C | ☐ |
| SP4 | **Keep-clear zones**, in world space, against the drawn extent: ramp pads and flares, drive mouths, charging pads (padR + 40), doors out to the kerb, rugs and mats, the depot approach. | 22 | part (doors and mats are unknown to the placer) | ☐ |
| SP5 | **Real relative size:** height as a ratio of `PERSON_H` 124. Lamp vs signal mast: girth 0.60, reach 0.73, height 0.93. | 10 | C | ☐ sizes |
| SP6 | **Static props cast no shadow.** | 7 | C (**breached today:** the standing hydrant and bin) | ☐ |
| SP7 | **One source of position** (`hazSpotWorld`) for art, hitbox, slip zone and AI. | 15 | K | ☐ |
| SP8 | **Faces from normals.** A base wider than its post draws all its visible faces. | 9 | C | ☐ |
| SP9 | **Contact:** the head hangs from its arm, the globe sits on its collar, the trunk runs up inside the crown. | 17 | C | ✅ K7 (partly) |
| SP10 | **Signals only for real approaches**, one entry each, never split. The head and arm are overhead and not solid. | 6 | K | ☐ |
| SP11 | **Variation is seeded from world position.** | 3 | K | static |
| SP12 | **One bench kit, one tree kit, one lamp kit** (variants are options, not copies). | 12 | C (4 bench drawers, 2+ lamp drawers) | static |

**Approved values:**
- **Lamp:** 315 high (2.54 × person), pole 12, arm 88.
- **Signal mast:** 330, arm 120.
- **Palm:** 297 (2.4 × person).
- **Bin:** 68 (0.55 × person).
- **Bench:** seat 0.35 × person (`BENCH_ART`).
- **Corner clearance:** 230.
- **Open question for Sir:** the hydrant is 20 (0.16 × person) and the cone 38 (0.31 × person). Both were approved in their labs, but real ones are about 0.4 × person.

**Exemplars:** any Flats frontage after cf03c37, fa2aa02, 3ea00e9 and 4a2c46f: lamps and palms on lane 0, bins at the corners, nothing on the pads.

## Known kit flaws
1. **The placement guards live only in `cityFurnitureForEdge`.** The route, landmark frontages, the pier, the mall and the parks skip them.
2. **The placer doesn't know about doors or mats.**
3. **Heights aren't declared per kind.**
4. **Several drawers per object** (bench, lamp, palm).
5. **The shadow fields remain**, and the hydrant and bin still draw shadow ellipses.
