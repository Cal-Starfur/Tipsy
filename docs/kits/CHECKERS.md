# The review tools: what checks what, how well, and what's next

**Commands:**
- `node tools/world_review.js`: every kit at every spot, plus the library (about 30 min).
- `--kit shops,landmarks --spots zzz`: the library only, about 3 min. Use this after changing any LIB entry.
- `--kit people --spots hosp`: one kit, one place.
- `--rev <commit>`: review an older build (the backtest).
- `node tools/review/validate_fixes.js`: runs the checkers before and after each accepted fix in `tools/review/approved.json`. A rule should fire before the fix and stay quiet after it.

**How a finding is judged (in this order):**
1. **The game's own answer key.** The library flags its measured open defects: `fTodo` ("lettering behind board", "return +N") and `cTodo` ("N pavement props need collision volumes"). A rule must catch the flagged entries.
2. **The approved state.** The 13 clean shops (no `*Todo`) that Sir signed off must stay quiet. A rule that fires there has a threshold bug, not a finding.
3. **Accepted fixes.** Before a fix, the rule fires; after it, the rule stays quiet.
4. **By eye.** Every photo in a report is checked before it's sent. False alarms are listed, not shown.

## Built, and how well it does (2026-10-29, current build)
| Kit | Checks | Calibration |
|---|---|---|
| People | P1 pop (appear visibility measured by drawing the frame with and without the person), P2 fade, P3 teleport, P4 recast, P5 unlisted, P6 pace, P9 overlap | Found the hospital fades Sir reported. Backtest e601f1d: 2 pops before, 0 after. Known false alarm: vanishings can't be measured (the person is already gone) |
| Doors | D1 pop at a shut door; D0 door drawn by hand | the mall's painted bay doors |
| Depth | S1o/S1u over/under at 20–30 stands per spot, filtered for people, props, parked and moving cars in front | the open-stand median is the reference; inside rooms, findings become notes |
| X-ray | X1 ghost vs coverage | — |
| Shops | K1, K2, K3, K4, K5, K7, K8, K12, K16, D0, H1, H1b, H2 | **Answer key:** K5 3/3, K16 3/3. Clean shops: 3 K16 findings (The Sandpiper Arms) |
| Landmarks | L1 (boxes and slabs, any drawn point, footway pieces of vol-less shops), L2, L3 (once painting has stopped), L4 (big masses, drawn taller than declared) | **Answer key:** L1 9/11. Backtest: L1 misses baa4640, L4 27d1226 |
| Vehicles | V1 pop (with the traffic list), V2 fade, V6 overlap (moving and kerb-parked) | the ambulance fade |
| Ground | G1 sky holes (outdoors only) | — |

## Next, ranked by evidence × feasibility (details in each kit's contract)
1. **Depth U1, the world-queue audit:** item length > 150, key outside its own box, flat items after bodies, definite misorder. About 90 corrections behind it.
2. **People overlap with solids, heading continuity, stride vs speed** (P9/P10, P12, P11). About 40.
3. **Walk-in D1/D2:** a pop watch while driving through every pocket door, and standing on every floor and room. About 64.
4. **Shops K11 storeys, K14 footway, K3 flat-panel windows, K10 window contents, K9 window stack.** About 160.
5. **Vehicle hull overlap via the full footprint**, plus a parked-car hitbox drive test (V3, V6). About 22.
6. **Ground D1 kerb collision vs drawn kerb, D2 ramp pairs** (G7, G5). About 25 + 55.
7. **Props:** keep-clear and lane census (SP2–SP4), size vs PERSON_H (SP5), static shadows (SP6). About 50.
8. **X-ray and night:** lights over occluders, a night run for strips of daytime, a height audit, mat/deck/lift stands. About 60.
9. **Mutation tests:** reintroduce reverted states (the near-corner key, slicing, the car bias, lamp-glow layering) and require the checkers to catch them.

## The census and the gate (2026-10-30)
These measure the whole game against its own norms, not a list of rules written in advance. The norm per class and the recipe are in `docs/STATE.md`; the maps behind them are in `docs/state/`.

| Command | What it does |
|---|---|
| `node tools/review/census.js --out <dir>` | Every world-queue piece over the Flats and the rim: 225 stops, about 4 min. |
| `node tools/review/u1.js <census.json> <out.json>` | Draw-order audit: U1k keyed off its footprint, U1l oversized for its pipeline, U1c one piece inside another, U1o drawn in the wrong order (only pairs on screen together). |
| `node tools/review/u1photo.js <u1.json> <dir> [n]` | Before/after pixels per finding, with the footprints outlined. A U1c swap only proves the order matters; judge it by eye. |
| `node tools/review/actors.js --secs 40` | People and vehicles at 12 spots, grouped by drawing system: P1 pop, P2 fade, P3 size, P5 unlisted, P6 pace, P10 glide, P11 stride, P12 heading, V1, V2, V9. Headless runs at about 9 fps, so short fades can be missed. |
| `node tools/review/kits.js --census <census.json>` | The sources: KC1 no vol, KC2 no kit door, KC3 spills off the lot, KC4 drawn taller than declared, KC5 self-flagged todo, KC6 slow draw; PK person types; VK vehicle kinds (turns true, length and width vs declared). |
| `node tools/review/gate.js [--only name] [--area ...] [--spots ...] [--accept]` | All of the above against `tools/review/known.json`: NEW fails, KNOWN is legacy, FIXED comes off the list with `--accept`. |
