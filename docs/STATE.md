# The state of the game: what's there, the norm, the recipe

The census (2026-10-30) measured the Flats as it is:
- **9,425** drawn pieces;
- **10** building pipelines;
- about **40** people systems;
- **16** vehicle systems;
- **12+** door drawers;
- **198** library entries, **32** person types and **103** vehicle kinds.

Each class has one **norm**: the way Sir has approved, and the way most of them do it. A new piece is built on the norm, never copied from an outlier. The full maps, with line numbers, every system, the outliers and their fixes, are in `docs/state/`:
- `buildings.md`
- `doors.md`
- `people.md`
- `vehicles.md`
- `props_ground.md`

**The tools that measure it** (`tools/review/`):

| Tool | What it does |
|---|---|
| `census.js` | Every world-queue piece on the map: key, footprint, height, sort key. |
| `u1.js` | Draw-order audit of that census: keyed outside its footprint, oversized for its pipeline, one piece inside another, drawn in the wrong order. |
| `u1photo.js` | Proves those findings in pixels, with before/after photos. |
| `actors.js` | Every person and vehicle drawn, grouped by the system that drew them: size, speed, step, heading, fades, pops, listed or not, still-but-live. |
| `kits.js` | The sources: every library entry, person type and vehicle kind, what each declares against what it draws. |
| `gate.js` | All of the above against `known.json`. A NEW finding fails. |

## The norm and recipe, per class

**Anything (the dividing rule).** It is drawn as one piece only if nothing can stand inside its footprint. Otherwise it goes in pieces, each sorted where it stands.

**House.**
- **Route:** the house row → `queueUnitStrips` whole, centre key → `drawLibUnit`, cached as `lu|`.
- **The entry declares:**
  - true `ww`/`dd`;
  - `vol`, with drawn = declared;
  - `door` (`houseDoorway`, 92×184);
  - `fore()` and `back()`;
  - `liv`;
  - no lawn.

**Shop.**
- **Route:** HOOD_SHOP_SITES → `queueCommercialEdgeAt` → `queueUnitStrips` whole, cached as `hs|`.
- **The entry declares:**
  - one kit `shopDoor` (or `slideDoors` + `doorDraw` for automatic glass);
  - `xh`;
  - `back()`;
  - `porch` + `posts` if anything stands on the pavement.

**Landmark (walk-in or walk-across).**
- **Route:** a HOOD_BLOCK_LANDMARKS row (`hl`) or `block:true` (`hi`).
- **The entry declares:**
  - items through `depthSort`: runs of 150 or less (124 or less where Tipsey touches), masses in 550 squares, each keyed at its own base through `lmDepth`;
  - flat paving only as ground;
  - `vol` with `opens` and per-mass heights;
  - `live` for moving parts;
  - doors as declared doors.

**Big multi-part site.**
- **Model:** Marina General, one entry per cell in pieces, big masses in 550 tiles, one plan constant shared by draw, vol and pockets.
- **Never** a whole-site image keyed at its corner alongside separately keyed pieces of itself. The Maritime Mall and Tide Pool Elementary are the outliers.

**Walk-in interior.**
- **Route:** a POCKETS row + a library entry in the pocket's frame through `queueFramePieces`.
- **The exterior** is a landmark whose shell items fade and cut.
- **See-through** from the street is slotted under its own exterior piece (`queueHospThrough`).

**Door.**
- **Drawn** with the kit: `shopDoor`, `houseDoorway` + `door`, or `slideDoors`. Never with `F()`.
- **The cached image** holds the opening and frame. The leaves are live, drawn shut or open from one state per door.
- **One working entrance** per unit.
- **Opens** when Tipsey, or anyone listed in `CITY_PEOPLE`, goes through it. A password only decides whether Tipsey counts.
- **Whoever uses it** is listed in `CITY_PEOPLE`.

**Person.**
- **Look:** one look from the roster, stored on the record.
- **Path:** one position function `xxxAt(p, t)` → `{x, y, z, th (a heading), moving, hidden}`, walked at `PEOPLE_WALK_V` 0.065 (0.06–0.075 by role).
- **Arrives and leaves** past the screen edge, through a door that opens for them, out of a car or lift, or at a post they always stand at. Never a fade, never a jump.
- **Listed** in `CITY_PEOPLE` with the same position function and look.
- **Drawn** at feet `x + y` with `drawPersonHull(heading − π/2)`.
- **Talking to Tipsey:** `meetWalk` / `meetTick`, faces both showing.

**Vehicle.**
- **Art:** a kind from `VEHICLES` through `drawProp` (or `gameCar` in building art); colour from its own seed.
- **Standing still:** cached (`bcDraw`), solid with the car box from `vehLen(kind)`, at least 84 from a moving lane.
- **Moving:** its pose is a pure function of time on a path that starts and ends off screen (or an errand borrowing an unseen traffic car). Never faded, never dropped at draw time.
- **Shares** the traffic's obstacle list.

**Street prop.**
- **Placed** by the citywide street furniture rules, clear of doors, mats, ramps and crossings.
- **Drawn** at its foot, cached while untouched, culled.
- **No** static shadow.
- **Collision** taken from its own art (a capsule for long things).
- **Sized** against a person (130 to the hair).

**Ground.** Flat things go in the ground pass. Raised ground is a body. No secondary grass.

## Before showing anything new

`node tools/review/gate.js --only "<name>"` must pass (see the LOOK_RULES pre-flight).
