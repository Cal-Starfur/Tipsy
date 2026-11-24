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
| Seated people in a shop's cached image | `gamePerson(a, b, z, face, { sit, look, pose })` in the kit (the scene's person drawer, `LIB.setPersonArt`, as `gameCar` is the car) | Low Tide Juice Bar's patio customers (`ltPatioSitters`) |
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
| Lamps, signals, hydrants, bins, cones, planters, palms, trash | `drawProp(kind)`: `lamp`, `signalpost`, `signalhead`, `hydrant`, `bin`, `cone`, `planter`, `palm`, `palmDwarf`, `trash`, `paper`, `can`; `drawLampHull`, `drawPlant`, `drawAgave`, `drawCypress`; `arcStrip` (a band, collar or shaded side round a round prop: only the arc the eye sees, asked of the normal in world -- the cone's collars, the bin's band) | `docs/kits/props.md` (SP1: one registry) |
| Park trees (shade trees, kinds, size classes) | `drawShadeTree(g, x, y, h, col, rr, sp)` (no `sp`: the round / spreading / upright shade tree, a tapered trunk lit left, limbs, a crown of clumps in three coats -- the whole mass in shade, each clump's body, each clump's lit face); with `sp` it goes to `drawParkTreeSp`: `olive` (gnarled twin stems, open grey-green crown silvered on the lit side), `citrus` (short trunk, dense dark round crown hung with oranges or lemons), `birch` (two or three white stems with lenticels, airy light crown), `pepper` (leaning trunk, spreading crown, curtains of weeping foliage, pink berries), `jacaranda` (umbrella crown flushed and flecked purple), `flame` (round crown flushed red-orange), `conifer` (straight trunk under stacked shallow-cone tiers to a spire, blue-green); size classes `PARK_TREE_SIZE` (`sapling` 0.5 with `drawTreeStakes`, `young` 0.74, `mature` 1 -- the art about its foot, never the collider); `labTree(..., { form: 'olive' })` for a lab/house olive | Through `queueParkPlants` (kind `tree`: cached, keyed at the foot). Seeded off position (`rr`), never per frame |
| Park planting variety (themes) | `PARK_THEMES` / `parkThemeAt(x, y)` / `parkPlantVariety(p, theme, gx, gy)`: a park takes a theme off its own place -- `classic` (the first pass's look), `coastal` (olive, pepper, conifer; lavender, agave, grass, rosemary; succulent and cottage beds, kidney/oval, steel edge), `bloom` (jacaranda, flame; hydrangea, bougainvillea; rose and drift beds, round/oval, brick), `formal` (conifer, citrus; cone, spiral, ball topiary; bulb (tulip) and rose beds, rect planters/oval, brick), `woodland` (birch, conifer; fern, hydrangea; cottage and drift beds, kidney/round, timber), `orchard` (citrus, olive; rosemary, lavender, cone; cottage and bulb beds, rect/oval, timber), `tropical` (flame, jacaranda, pepper; cycad, bougainvillea, agave, grass; tropical (canna, bird of paradise) and succulent beds, kidney/round, no edging). Shrub kinds `p.sk` (`drawParkShrubSp`): hydrangea, lavender, rosemary, agave, cycad, fern, cone, spiral, grass, bougainvillea, ball. Bed schemes `p.bs` / shapes `p.shape` / edgings `p.edge` (`drawParkBedSp`): drift, cottage, succulent, rose (with standards), bulb (tulips), tropical; oval, round, kidney, rect (raised planter); stone, brick, timber, steel, none | Picked once when the park's list is built (Veterans trail cells, the Costa Palma letters' park), the same spot always the same plant; a border run's shrubs share one kind. Paint only: positions, radii and colliders unchanged |
| Park planting: shrubs, flower beds | `drawParkShrub(g, p, rr)` (a clump of foliage puffs: the whole mass in shade, then each puff's lit side far to near, lit left (SP13); its kind from its green -- `0x46743f` a clipped boxwood ball, `0x6a9a52` an upright shrub, the rest loose mounds; blooms as small trusses on the lit faces), `drawParkBed(g, p, rr)` (a raised oval: stone edging set stone by stone, a soil rim, a foliage carpet, the planting in drifts of its two colours and a pale third, a low edging row, spires or bigger mounds down its middle; flower heads are two-triangle rosettes, not circles, to keep its cache paint cheap); both through `queueParkPlants` (kind `shrub`, `bed`: cached, keyed at the foot); colours `parkPlantShade`, `parkPlantMix` | Seeded off position (`rr`), never per frame. Hedged beds in Ferris Field's flower garden: `queueFlowers` (top lit, the +b face lit, the +a face in shade) |
| Pavement: paving slabs, kerb and gutter, heaved slab, spall, kerb-ramp pad | the ground pass (ground cache): `paveSlabOn` (a slab: the calmed chequer tone + seeded per-slab roll `paveRoll` within pave/paveB, the control joint's groove and lit lip inside its far edges, quarter scoring by frontage, the odd weathered/patched slab, utility covers off the kerb row -- dials in `PAVE_ART`), `kerbPath(g, sections, o)` -- the ONE kerb drawer (every straight via `kerbRun`, flares, corner sweeps, L fillets and caps, the estate's streets, bends and circle, the gate/harbor rounds, `drawKerbStoneOver`): sections { rx, ry, px, py, h, z } along the path, faces only where seen in the white paint shaded by facing (SP13, dials in `KERB_ART`), the lower face shading to a dark foot, one top per sweep, the lit rounded arris (`KERB_ARRIS`), the dark seam on the road edge, joints (`kerbLatticeJoints`: the paving's T2 lattice), square-end caps, gully inlets (`kerbMouthOn`); culled to the screen / cache tile, the gutter `band` (grime along the kerb's foot, a dark joint at the asphalt), the gullies' kerb inlet (`GULLY_MOUTH`); `drawProp(kind)`: `slab` (`slabGeo`), `crack` (`crackGeo`: the hole's walls only where seen, the near rim keeps the floor at grade), `sidewalkend`/`sidewalkbegin`/`sidewalkbeginTurn` with `tactilePad` (domes in the pad's plane); a world ramp's run and flares are toned by their tilt against the light (the fall line's screen direction), the flares broomed along their contours, a tooled joint with the walk and a lit break-over at the run's back edge -- dials in `RAMP_ART`; its collision mouth (`owAtRampMouth`) is the same pad + flares, +/-`WORLD_RAMP.baseCross` across | `docs/kits/props.md` |
| Benches, fences, gates, flags | `drawBenchProp`, `drawWoodFence`, `drawChainFence`, `drawGateFence`, `drawFlag` | |
| Wheels and tyres | `drawWheel`, `soapWheel` | |
| Park grounds: mown lawn, walks, park furniture | the ground pass: `parkMowTone` (a park's lawn mown in stripes, `PARK_MOW`, along x or y by the park), `fillParkPaths` / `parkPathsOf` (a bare park cell's walks -- plus, x or ring, gravel or concrete, `PARK_PATH`; `parkPathOff` keeps things off them), `fillParkTrail` (the Veterans trail's chips: timber edging, trodden tread); `drawPicnicTable(g, x, y, dv)` (built off the bench: BENCH_ART's timber and steel), `drawDrinkFountain(g, x, y)` (`queueParkFurniture`, solids `parkPathPosts`) | no secondary grass: the lawn is the block's own ground |

## Room furniture (walk-in kit)

| Thing | Where | Notes |
|---|---|---|
| Walls, windows, the door hole | `walkinRoom` (`runBox`, `winIn`) | `docs/kits/walkin.md` |
| Long fixtures (counters, shelves, bars) | `runPiece` | W28; W37 for what goes inside |
| Runs round corners (walls and caps, fences, hedges, parapets, kerbs, counters with returns) | `pathRun(pts, t, z0, z1, top, front, side, legs)` | One piece, mitred: the corner rule (CLAUDE.md). Rancho Hacienda's yard wall (`yardFence.join`) is the exemplar |
| Primitives | `box`, `cyl`, `tube`, `ball`, `prism`, `F` / `S` / `T` faces | the room's own fixtures, and anything new -- referencing the library's relative |
| An exemplar room | Tidewater Tea House | `docs/kits/walkin-shop-recipe.md` |
| Flowers: a galvanised bucket of stems (roses, a mixed bunch, sunflowers, eucalyptus, gladioli), a terracotta pot (fern, succulent, orchid, little palm), a glass-doored flower cooler, a tiered bucket stand | `bucket`, `pot` in the LIB entry 'Seabreeze Florist Interior'; held: `flHold` (a bunch, the same wrapped in kraft, a pot, a bucket of stems) | heads drawn far first (W37 inside); each stand's column of buckets its own piece |
| Juice bar: a glass-doored juice fridge of bottles, blenders, a citrus press, a pineapple, heaps of fruit in crates and jars, a jar of infused water, round tables at 66 with chairs at 38 | `heap`, `pineapple` in the LIB entry 'Low Tide Juice Bar Interior'; held: `ltHold` (a smoothie in a lidded cup with a straw, a bottle of juice, a crate of oranges) | Its door is in the far west wall (walkinRoom `gapsW`, the night's 'w'): a west-edge shop's walk-in |
| Gym: treadmills (deck, belt, motor hood, uprights, console with its screen to the runner), spin bikes (flywheel, bars, saddle at 38), a power rack with its bar and plates, a plate tree, a flat bench at 40, a kettlebell rack and a two-tier dumbbell rack, a drinks fridge, cubbies of rolled towels, a front desk at 75, exercise balls, stretching mats | `kbell`, `dbell`, `disc` (a disc in the plane a) in the LIB entry 'Surfside Fitness Interior'; held: `sfHold` (a folded towel, a hex dumbbell, a kettlebell, a bottle of water, a stack of towels); stations: `SF_SEATS` (a treadmill run in place, a bike, the bench) | Its door is in the far west wall, as the juice bar's (walkinRoom gapsW); its two windows painted on the west wall's inner face at their own places. Members on a treadmill are drawn moving where they stand (sfDrawState) |
| Furniture showroom: a sofa facing the room (`sofa`: feet, base, back on its far side, arms, two cushions at 38, pillows -- Palmline Tower's sofaOf), a low table on four legs (`lowTable`), a made bed (driftwood headboard, frame, mattress at 50, pillows, duvet and its hem, a throw), bedside tables with lamps, a walnut wardrobe (doors on its east face), a dining table at 66 for six (legs, apron between them, top) and its chairs at 38 (legs, the seat's frame, the back on its far or near side, the cushion), open homewares shelves (bay by bay: the upright, its shelves, the goods -- vases, folded throws, seagrass baskets, cushions stood up, candles), a stack of folded rugs on a platform, a driftwood bench at 40, a floor lamp, a jug of dried grasses | the LIB entry 'Driftwood Home Interior'; held: `dfHold` (a cushion before them in both hands, a glazed vase by its neck, a seagrass basket by its handle, a stack of three cushions); seats: `DF_SEATS` (sofas, the bed's edge at 47, dining chairs, the bench) | Its door is in the far north wall (walkinRoom's gapsN, the night's 'n'): a north-edge shop's walk-in, as Palmline Garage |
| Shoe shop: six kinds of shoe from one parts table (`SS_PARTS`: low skate shoe, high-top, runner, slip-on, chelsea boot, slide sandal; colours `ssShoeCols`, which at a shelf place `ssShoeAt`), drawn in room parts (`shoeB` along b, toe south -- a wall shelf's; `shoeA` along a, toe east -- a riser's) and in the hand (`ssHold`'s shoe) from the same table, a shoe wall (bay by bay along b: plinth, far upright, five shelves of two shoes, near upright, a header), a stock wall of shoebox cubbies (stacks of three boxes, the lid's band and end label to the room), a backless try-on bench (toe kick, frame, cushion at 40, a bolster laid on it), a tall leaning mirror, stepped display risers, a till counter (navy front, coral line), a sock gondola (spine, packs on pegs on its seen face, a tray of rolled laces) | the LIB entry 'Sandpiper Shoes Interior'; held: `ssHold` (a sneaker before them in both hands, the shop's carrier bag by its handles, two shoeboxes stacked, the display shoe); seats: `SS_SEATS` (the bench under the window, at 37) | Its door is in the far north wall, as Driftwood Home's next door (walkinRoom's gapsN): a north-edge shop's walk-in |

When you add a drawer, a kind, a breed or a look, add its row here.
