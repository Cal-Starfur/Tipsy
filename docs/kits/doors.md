# Kit 2: Doors (contract v2)

**What this covers:** every door: swing, slide, garage roll-up and lift; who opens it, and what shows behind it.

**Evidence:** 82 past corrections.

**Checker:** `node tools/world_review.js --kit doors,people`. The shop checker also catches doors drawn by hand.

## Rules
| ID | Rule | Ev | Status | Check |
|---|---|---|---|---|
| D0 | **Every door is a kit door.** Use the shop kit's `shopDoor`, `houseDoorway`, or a declared slide or lift door. A door painted on (a dark panel) can't open, so whoever uses it pops. | 13 | C | ✅ hand-drawn doors (shop checker) |
| D1 | **A door opens live for anyone going through it** (Tipsey, anyone listed, a pushed chair) and shuts after. It is never baked into a cache. Lift doors open at every landing, and gates work. | 16 | C (each door system has its own list of who may open it) | ✅ a pop at a shut door |
| D2 | **Nobody walks through a shut door or its glass.** | 1+ | C | ☐ crossing the door plane while shut |
| D3 | **An open door shows depth**: a short lit tunnel clipped to the opening. A shut door hides the interior completely. | 6 | C | ☐ black-hole pixels |
| D4 | **Nothing crosses a door**: window, band, counter stripe, glazing bar, header, rail, plant, mat, canopy or parked person. | 24 | C | ✅ shop kit K2 |
| D5 | **One door, one eased k, one leaf drawer per type** (swing, slide, roll-up, lift). The door keeps the same detail open and shut, and automatic doors slide. | 9 | C (5 slide drawers) | ☐ timing |
| D6 | **A walker in a doorway is drawn between the room and the leaf**, by which side of the door plane they're on. | 6 | C | ☐ |
| D7 | **Real size first:** shop 66.24 × 161.92, house 92 × 184, main entrances about 2 people wide. Only as many doors as fit with piers, and no silent clamp. | 17 | C | ✅ shop kit K12 |
| D8 | **A door sits on its own wall's set-back**, not at b 0. | 4 | C | shop kit K19 |
| D9 | **Each unit declares exactly one working entrance**, used by the art, the walker and Tipsey, and facing the way in. | 5 | C | ☐ |
| D10 | **Door pieces are layered in depth**, the glass is in the shop palette, and there is one surround per opening. | 6 | K (`shopDoor`) | shop kit |

## Approved values
- **House doors:** open in 280 ms, shut in 480 ms (`HOUSE_DOOR_OPEN`).
- **Lift doors:** open in 480 ms, close in 520 ms (`OW_LIFT`).
- **Shop sliding doors:** open in 380 ms, shut in 650 ms.
- **Marina General's main doors:** widened to fit Tipsey plus a person.
- **Exemplars:** house doors opening for their residents; the pickup shops' glass doors opening for workers; the strand's lit doorways.

## Known kit flaws
1. **Who opens a door is a hand-written list in each door system**, so any group left off the list meets a shut door. Fix: every door asks `CITY_PEOPLE.near` plus Tipsey.
2. **Five sliding-door drawings and about ten easings**, with no world list of doors.
3. **`shopDoor` clamps silently and is fixed to b 0** (owned by the shop kit).
4. **The open-door interior is drawn per caller.** Fix: one `doorDepth(opening)` for every leaf drawer.
5. **`wallFrames().doorF` is a copy of the door that never records itself**, so it never opens and the checkers can't see it.
