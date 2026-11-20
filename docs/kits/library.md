# The object library: reuse first (L0)

**The rule** (Sir, 2026-11-20: "we need to also make a rule that points to the library of objects we have. we can create new
objects but referencing what we already have will help to keep everything consistent"):

1. **Before drawing anything, look here.** If the game already draws the thing -- a person, a dog, a cat, a car, a van, a robot,
   a door, a lamp, a bench, a palm, a kart wheel -- use its drawer, with its own look/kind/seed. Never redraw it in boxes for one
   room (the animal shelter's box dogs and cats, 2026-11-20, were exactly this).
2. **Need a variant? Extend the library, not the room.** A new breed goes in `DOG_BREEDS`/`CAT_BREEDS`, a new car in `CAR_KINDS`,
   a new door look in `SHOP_DOOR_LOOKS`, a new street look through `streetLook`/a `*Look` in the people kit -- so every place gets it.
3. **A genuinely new object** is fine -- build it to the kit's rules (W37: back to front, a base before what stands on it, the far
   side first, parts meeting never running into each other) as a named drawer or kind others can call, and **add it to this list**.
4. **In a room** (walk-in kit) the library's moving or living things go in as the room's fx pieces, which call the real drawer in
   the room's order and cache it while still: `fx.car` / `fx.svc` (cars), `fx.pod` (robots), `fx.dog` (dogs and cats, `cat: true`).
   People are the room's staff and visitors (`walkinStaff`, `walkinLife`), never drawn by hand.

Find a drawer: `grep -n "^  draw<Name>(" game/index.html`; its kind lists and looks are the `const ..._KINDS / _BREEDS / _LOOKS`
tables. The labs (`labs/`) are where most of them were built and can be opened on their own.

## Living things

| Thing | Drawer | Looks / kinds | Notes |
|---|---|---|---|
| People (everyone) | `drawPersonHull` (`drawPersonHullBody` sat/posed), `drawWalkinPerson` in rooms | `streetLook(seed, opts)`, `rosterBody`, the `*Look` functions (`staffLook`, `custLook`, `crowdLook`, `folkLook`, ...) | `docs/kits/people.md`. Seated in a vehicle: `vehRider` / `vehRiderLook`. Holding things: `pose.hold`. |
| Dogs | `drawDogHull` (pairs with an owner: `drawDogPair`, `drawProp('dog')`) | `DOG_BREEDS` (9), `dogLookOf(seed, breed)` | labs/dog-lab.html, dog-gallery.html |
| Cats | `drawDogHull` with a cat look | `CAT_BREEDS` (cat, kitten), `catLookOf(seed, kitten)` | tail `'cat'`, `eyeC`, no collar |
| Horses | `drawHorseHull` | | |
| Humanoid robots | `drawHumanoid`, `drawProp('humanoid')` | | Cratewell's line |
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
| Primitives | `box`, `cyl`, `tube`, `ball`, `prism`, `F` / `S` / `T` faces | only for the room's own fixtures, never for a library thing above |
| An exemplar room | Tidewater Tea House | `docs/kits/walkin-shop-recipe.md` |

When you add a drawer, a kind, a breed or a look, add its row here.
