# The object library: reference it first (L0)

**The rule** (Sir, 2026-11-20: "we can create new objects but referencing what we already have will help to keep everything
consistent"; "i think its nice to draw new stuff but referencing what we have is important to get it done correct the first time. the
variations are good but the draw issues can be cut down"):

1. **Look here first.** Before drawing something, find the nearest thing the game already draws and reference it -- its drawer, its
   proportions against a person (`PERSON_H` 124), its colours and toning, how its parts are ordered and fitted. The library's pieces have
   already been through the draw-order and alignment fixes; starting from them gets a new object right the first time.
2. **New things and variations are welcome.** Draw a new object, or a new take on one we have, freely -- built the way its nearest
   library relative is built, to the kit's rules (W37: back to front, a base before what stands on it, the far side first, parts
   meeting, never running into each other). Where it is a variant of a library thing (another breed, another car, another door), adding
   it to that thing's table (`DOG_BREEDS`, `CAT_BREEDS`, `CAR_KINDS`, `SHOP_DOOR_LOOKS`, a `*Look`) gives it the drawer's fixes for free.
3. **Add what you make to this list**, so the next one can reference it.
4. **In a room** (walk-in kit) a library thing can go in as the room's fx piece, which calls its drawer in the room's order and caches it
   while still: `fx.car` / `fx.svc` (cars), `fx.pod` (robots), `fx.dog` (dogs and cats, `cat: true`); people are the room's staff and
   visitors (`walkinStaff`, `walkinLife`).

**The database:** `docs/kits/library.json`, built from the game by `node tools/library_index.js` (rerun it after adding something). One
entry per thing: people (the standard body), every dog breed and cat, every car and van kind, every street prop kind, the door looks --
each with its build numbers (length, width, roof or height; 124 is a person), its colours (coats, paints), its marks or add-ons, and its
size measured off its own drawing (`measured`: how far it rises on screen, its silhouette, and that against a person); then every drawer,
look function and table with its line in `game/index.html`. To start something new, look up its nearest relative there and build to its
numbers.

**Counters: 65 to 75.** A counter's top (a shop counter, a bar, a till, a back counter) is 65..75 against a person's 124 (Sir,
2026-11-20). Build a new one in the range; an old one out of it is brought in by `COUNTER_FIT` in the shop library (its room, its
counters' solid names, the top it was drawn to and the top it is drawn to now -- `zFit` scales the counter and moves what stands on it).

**Chairs: an adult's seat at 38, a child's at 28** (Sir, 2026-11-20), the sitter's seat (`*_SEATS` z, `sit`) a little under it (35 on
38). Old chairs are brought to it through the same `COUNTER_FIT` table.

**Tables and desks one sits at: 60 to 66** (Sir, 2026-11-20), against a 38 seat; low and coffee tables, a child's desk, a bar-height
table with stools and a standing work table are their own kinds. Old ones brought in by `COUNTER_FIT`.

**Stools: a stool at a table one sits at is a chair, 38; a bar stool (at a 65..75 counter or a bar-height table) 48. Benches one sits on: 40**, a child's 28 (Sir, 2026-11-20). Each set in its room's own drawing.

**Beds: the mattress's top at 50** (Sir, 2026-11-20); a patient or sleeper lies on it at 50.

**Sofas: the seat at 38**, as a chair's (Sir, 2026-11-20); a sofa is built as the ballroom lounge's is -- feet, a base the whole footprint, the back on its own side of the base, the arms from the back forward, the seat's cushions between them (Palmline Tower's `sofaOf`).

**Workbenches** (standing work surfaces: a lab bench, a potting bench, an engraving bench) are left as built, 70..86 (Sir, 2026-11-21: "lets leave them all") -- each suits its work; a new one builds within that span.

**Hunting inconsistencies:** `node tools/review/consistency.js [room]` measures every walk-in room's fixtures by kind (chairs, stools,
benches, sofas, tables, desks, counters, workbenches, shelves, cabinets, lockers, beds -- by what their solids are called) and lists the
ones well off their kind's typical size; the typical sizes go into `library.json` (`fixtures`). A review list, not a gate: a low table or
a child's desk is meant to differ -- an armchair counted to its back in one room and to its seat in the next is not.

Find a drawer: `grep -n "^  draw<Name>(" game/index.html`; its kind lists and looks are the `const ..._KINDS / _BREEDS / _LOOKS`
tables. The labs (`labs/`) are where most of them were built and can be opened on their own.

## Living things

| Thing | Drawer | Looks / kinds | Notes |
|---|---|---|---|
| People (everyone) | `drawPersonHull` (`drawPersonHullBody` sat/posed), `drawWalkinPerson` in rooms | `streetLook(seed, opts)`, `rosterBody`, the `*Look` functions (`staffLook`, `custLook`, `crowdLook`, `folkLook`, ...) | `docs/kits/people.md` (P19 model off these, P20 vary by the roll, P21/P22 draw order and fit: `tools/review/people_hull.js`). Seated in a vehicle: `vehRider` / `vehRiderLook`. Holding things: `pose.hold`. |
| Dogs | `drawDogHull` (pairs with an owner: `drawDogPair`, `drawProp('dog')`) | `DOG_BREEDS` (9), `dogLookOf(seed, breed)` | labs/dog-lab.html, dog-gallery.html |
| Cats | `drawDogHull` with a cat look | `CAT_BREEDS` (cat, kitten), `catLookOf(seed, kitten)` | tail `'cat'`, `eyeC`, no collar |
| Horses | `drawHorseHull` | | |
| Humanoid robots | `drawHumanoid`, `drawProp('humanoid')` | | Kickstand's line |
| Pigeons | `drawProp('pigeons')` | | |

## Vehicles and robots

| Thing | Drawer | Kinds | Notes |
|---|---|---|---|
| Cars | `drawCar(g, kind, x, y, z, t, fdir, wheelPhase, seed, data)` | `CAR_KINDS`, `CAR_BODIES` | `data.doorOpen`, `data.wheelOff`, `data.cabin { rider }` (see-through glass), `data.doorOut`. In a room: `fx.car`, `fx.svc`. |
| Vans and trucks | `drawVan`, `drawWorkTruck`, `drawProp('firetruck' / 'flatbed' / 'beertruck' / ...)` | `VAN_KINDS` | |
| Tipsey and other delivery robots | `drawRobot`, `drawBot`, `drawRoomBot` (rooms: `fx.pod`), `drawNpcRobotBody` | `drawProp('robot' / 'courierbot' / 'cargobot' / 'patrolbot' / 'amr')` | |
| AV fleet | `drawAvPod`, `drawProp('avpod' / 'avshuttle' / 'avsweeper' / ...)` | | |
| Aircraft, boats, drones | `drawAircraft`, `drawPlane`, `drawJet`, `drawHeli`, `drawAutoBoat`, `drawDrone` | | |
| Soapbox karts | `soapKartS`, `soapWheel` | | Tidewater Kart Works |
| Scooters | `drawProp('scooter')`, `drawScooterRider` | | |

## Building parts and street props

| Thing | Drawer / kit | Notes |
|---|---|---|
| Shop doors (every door) | `drawShopDoor`, `shopDoor` looks `SHOP_DOOR_LOOKS` (six, panel, lite, french, bank, ...) | `docs/kits/doors.md` -- leaves, half doors, away doors |
| Houses | `drawHouseUnit`, `labs/houses.js` | `docs/kits/houses.md` -- no house lawns |
| Shopfronts | `drawStoreUnit`, `drawCornerStoreUnit`, `labs/flats-shops.js` | `docs/kits/shops.md` |
| Lamps, signals, hydrants, bins, cones, planters, palms, trash | `drawProp(kind)`: `lamp`, `signalpost`, `signalhead`, `hydrant`, `bin`, `cone`, `planter`, `palm`, `palmDwarf`, `trash`, `paper`, `can`; `drawLampHull`, `drawPlant`, `drawAgave`, `drawCypress` | `docs/kits/props.md` (SP1: one registry) |
| Benches, fences, gates, flags | `drawBenchProp`, `drawWoodFence`, `drawChainFence`, `drawGateFence`, `drawFlag` | |
| Wheels and tyres | `drawWheel`, `soapWheel` | |

## Room furniture (walk-in kit)

| Thing | Where | Notes |
|---|---|---|
| Walls, windows, the door hole | `walkinRoom` (`runBox`, `winIn`) | `docs/kits/walkin.md` |
| Long fixtures (counters, shelves, bars) | `runPiece` | W28; W37 for what goes inside |
| Runs round corners (walls and caps, fences, hedges, parapets, kerbs, counters with returns) | `pathRun(pts, t, z0, z1, top, front, side, legs)` | One piece, mitred: the corner rule (CLAUDE.md). Rancho Hacienda's yard wall (`yardFence.join`) is the exemplar |
| Primitives | `box`, `cyl`, `tube`, `ball`, `prism`, `F` / `S` / `T` faces | the room's own fixtures, and anything new -- referencing the library's relative |
| An exemplar room | Tidewater Tea House | `docs/kits/walkin-shop-recipe.md` |
| Flowers: a galvanised bucket of stems (roses, a mixed bunch, sunflowers, eucalyptus, gladioli), a terracotta pot (fern, succulent, orchid, little palm), a glass-doored flower cooler, a tiered bucket stand | `bucket`, `pot` in the LIB entry 'Seabreeze Florist Interior'; held: `flHold` (a bunch, the same wrapped in kraft, a pot, a bucket of stems) | heads drawn far first (W37 inside); each stand's column of buckets its own piece |

When you add a drawer, a kind, a breed or a look, add its row here.
