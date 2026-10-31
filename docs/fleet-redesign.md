# The Fleet: a redesign

Proposal for Sir, 30 Oct 2026. **Approved** ("Yes"). **P0, P1 and P2 are built** (see "P0 as built", "P1 as built", "P2 as built" and "P2 fix: the Fleet Station's site and the height controls" at the end); P3 onwards is not. Read from `game/index.html` at 7e28c25 (branch consistency-pass). The game was booted headless with each fleet vehicle driven in place, and there were no page errors.

Sir's brief: "the fleet hasn't been really worked over yet ... they were all basically drafted on top of Tipsy so they don't drive correctly, and the flying options and boat options obviously need to be in the air and water respectively ... my original concept was about players building their fleet ... unlock by completing missions with them ... once unlocked they will need to launch from their own locations if they are too large for the Tipsy charge station ... the system needs a redesign."

## Sir's decisions (round 2): answers to the first draft
1. **Launching: no camera glide.** The garage stays as it is now: pick, paint and customise there.
   - Press Play and a door opens at that vehicle's launch place, and you pull out of its bay, exactly as Tipsey does from his charging station today.
   - Small robots use Tipsey's charging stations. Boats and big vehicles have bigger bays of their own (hangars, boathouses, roller-door bays). Every class starts the same way: the door opens and it pulls out.
   - "Send home" means driving back into a bay.
2. **Bases all over the city.** One or more per hood and edge region, mapped now while the city beyond the Flats is unbuilt. The Flats' bases are built first.
3. **Flying height: build both**, auto terrain following and a manual climb and descend control, behind a toggle. Sir tests both on the iPad (P2).
4. **Planes: automatic take-off and landing**, and the player flies only the cruise. Lowest priority, last in the plan: the world isn't big enough for planes yet.
5. **Road vehicles respect the kerb and never tip.** A hard enough hit blows a tyre. The vehicle limps, and the rescue crew (`RESCUE_VAN`) comes and changes the wheel.
6. **Fleet vehicles earn no tips.** Unlocked vehicles appear working in the world, which shows the business growing. There is no income from business growth and no units to buy.
   - "Building your fleet" now means customising it in the garage, and the town filling with your fleet as you unlock it.

At the lock flip: re-lock everyone, and missions already done still count (Sir: "lets go with your idea"). The garage: a picked big vehicle shows at full size in its own bay straight away (Sir: "i dont like the tiny versions"), P1.

## Sir's decisions (round 1)
1. **The whole fleet stays unlocked for testing.** Mission unlocks are designed in full, but they sit behind one testing switch, `FLEET_TESTING`, which defaults to everything unlocked. See section 4 for how and when it flips.
2. **The fleet is all autonomous.** Two vehicles are not fleet because they are crewed: the Tipsey work van (the rescue van, whose crew get out) and the harbour patrol boat. Neither joins the Fleet tab.
3. **Time-of-day missions run on the real clock.** A mission that needs a time of day is only *available* when the device's clock (`NIGHT_CLOCK`) is there: dusk missions at real sunset, night missions after dark. The mission board shows them as "Comes at dusk" or "After dark", with the time they open. A mission that has started keeps its time until it ends, even if the clock moves on. This is a feature: the fleet's night jobs belong to it (the patrol robot, the sweeper).
4. **The edge strips are owned stretch by stretch** (the boardwalk, the beaches, the foothills). Each stretch belongs to the hood it borders. So a fleet vehicle's reach follows the hoods the player owns.

---

## 1. Diagnosis: how the fleet works today

- `FLEET` (line 6841) lists 20 kinds as `[name, drawProp kind]`. Picking one in the garage's Fleet tab (`renderFleet`, 122183) writes `tpProfile.fleetKind`, and only localStorage keeps it.
- `drawRobotOrSunk` (98030) still runs Tipsey's whole `drawRobot` into a hidden sink graphics, for his pose, camera and clocks. It then draws `drawFleetAvatar` (98062) at his `botX/botY` and his yaw.
- The vehicle moves by Tipsey's `owStep` (10756). `FLEET_PHYS` (6866) changes three things:
  - `fly` skips kerbs, water and short furniture.
  - `big` never tips, stops dead on a car and brings the police.
  - `tune` overrides `vMax`.
- Everything else is Tipsey's: a 30-unit disc (`OW_D.botR`), his turn curve (`turnMax` 0.0034 rad/ms, peaking at 0.085 speed), his tilt and tipping, and his kerb and edge tests.
- `fleetPhys()` is read from about 20 places: the tip, the knocks, the riders, the hazards and the police.

| Class (kinds) | What goes wrong | Why (code) |
|---|---|---|
| Sidewalk robots (courier, cargo, patrol, AMR, humanoid) | They work, but every one drives exactly like Tipsey: same speed, turn and tip. | No per-kind numbers. `fleetBody()` reads only `RIGS / PLANT / AV_PODS` lengths, so the cargo bot (100) and the AMR (110) are a 30-unit disc. |
| Driverless forklift (220 long) | It drives on pavements, can tip, and its forks pass through walls. | There is no `FLEET_PHYS` entry, and its `BOTS` length is not in `fleetBody()`. |
| Road (robotaxi, pod, shuttle) | It pivots almost on the spot, climbs kerbs at a crawl, and its nose and tail pass through walls and parked cars. | `owStep` collides the disc only (`W.solidAt(x, y, D.botR)`). `fleetBody()` feeds just the riders and traffic (`botAxisPt`). Turning is Tipsey's. |
| Heavy (semi, garbage, dump, sweeper) | It has the same faults, plus a rigid 780-long semi that swings round its middle in a junction. | The trailer has no articulation: `drawRig` takes one yaw. |
| Air (quad, lift drone, air taxi) | The hover height exists only in the art. A one-storey shop, the estate wall or the city's north rim stop it at any height. Lamp posts stop it. It has no take-off, no landing and no camera change. | `DRONES` gets `hover: 70 + sin` in `drawFleetAvatarAt`, while `botZ` stays 0. `blockAt` uses `W.solidAt`, `sierraBlocks` and `owNorthEdgeBlocks` for flyers too. `FLY_TALL` holds the lamps. |
| Fixed-wing (UAV plane, cargo drone) | They hover, stop and reverse like a quad. There is no runway, no minimum speed and no climb. | The same `fly` entry as the quad. |
| Water (survey boat, water taxi) | Boats drive on the road. The quay edge is a kerb at a crawl, and at speed they go over the side and splash. They can tip. | There is no `FLEET_PHYS` entry, so it is land physics. `owSplashCheck` is skipped only for `fly`. |
| All | The swap happens in place, anywhere: a semi appears inside the charging station (`FLEET_FIT` shrinks it to fit). Missions never know which vehicle is out. There is one global kind. | `tpProfile.fleetKind` is read everywhere through `fleetPhys()`. |

Screenshots (on the page):
- the delivery drone stopped by the Maritime Museum it should fly over;
- the air taxi pinned to a two-storey wall at the north rim;
- the water taxi on the harbour road, and on the quay planks;
- the autonomous semi swung rigid across a junction.

---

## 2. Seven classes, seven controllers

**One rule: a controller per class, not Tipsey with a skin.**
- `owStep` stays Tipsey's own, untouched, and the sidewalk robots use it with their own numbers.
- Every other class gets a `FLEET_CTRL[cls].step(scene, ow, input, dt)` that owStep hands off to at its top.
- The driven vehicle *is* `ow` (its `px/py/yaw/vel`, plus a real `z` for flyers). The camera, the x-ray ghost, the people's reactions and the map all keep following `ow` with no change.
- Tipsey himself stays parked (section 3).
- Input is the same floating stick (`ow.stick`, `owScreenToWorld`) and the keys. Each class adds at most one context button (Take off / Land, Dock, Drop, Lift), shown only when it applies.
- **Flyers' height:** an auto mode and a manual mode, behind a toggle (see rotor below).
- **Reach:** each class keeps to the owned hoods and their edge stretches (decision 4). At an unowned border it meets a soft fence: `owGeofenceTick`'s autopilot turns it back, and a card names the hood to buy. A mission's own route is always open.

| Class | Kinds | Movement model | Collides with | Delivers by | Camera |
|---|---|---|---|---|---|
| walk: sidewalk robots | courierbot, cargobot, patrolbot, amr, humanoid | Tipsey's owStep with per-kind `vMax`, accel, turn, tilt gain and a capsule body | Tipsey's world: kerbs, furniture, people, cars. They can tip. | Lid (cargo, courier), hands (humanoid), platform (AMR) | As Tipsey |
| road | robotaxi, avpod, avshuttle | Kinematic bicycle: wheelbase from length, max steer, so a minimum turn radius (taxi about 420, shuttle about 650). No pivot. Reverse. 0.30 to 0.34. Never tips. | Oriented box (`vehicleSolid`). **Kerbs respected:** walls except at driveway mouths and dropped crossings. A hard hit blows a tyre (below). Traffic queues behind it. | Pod: lockers, and the customer walks to the side door (meetWalk). Taxi and shuttle: passengers board at the kerb door. | One step out (view 2) |
| heavy | avsemi, avgarbage, avdump, avsweeper | Never tips. Bicycle with a long wheelbase, low accel, long braking, 0.20 to 0.24, turn radius 700 to 900. The semi's trailer follows its kingpin (dθt/dt = v/Lt · sin(θc − θt)), and reverse is limited before it jackknifes. | Two boxes on the semi (tractor and trailer), one box on the others. Kerbs respected; blowouts at a lower speed. | Semi: back onto a dock. Garbage: the arm lifts bins as it passes. Sweeper: it sweeps litter. Dump: tips at a drop. | View 2, or view 1 on the semi |
| site | avforklift (and avdump on site) | Rear-wheel steer (it turns about the front axle, tight), slow, 0.10 to 0.12, inside a site polygon. The forklift never leaves the site. The dump leaves by the gate onto the road (heavy). | The site's stacks, the plant and the fence. | Forks pick and put pallets at marked spots. Dump tips its tub. | As Tipsey |
| rotor: air, VTOL | dronequad, dronelift, airtaxi | 2D hover dynamics plus a real altitude `z`. **Two modes behind a toggle** (`?fly=auto` / `?fly=manual`, plus a garage setting). Auto: target z = max(cruise, roof or ground below or ahead + clearance), at a limited climb rate. Manual: a climb and descend slider on the right edge; it holds height when released, with a floor at clearance above the ground. It banks with the yaw rate. Take-off and landing only on pads or open ground. | A building only if it is taller than the flyer's ceiling (quad about 650, lift 500, taxi 900; the towers, hospital and Cove Grove stay solid). The world edge. The airfield's airspace. Corridors past the north rim and over the mountains. | Quad: winch a parcel to a porch or pad. Lift: a sling load (the letters). Taxi: lands, and the passenger walks to its door, face to face. | View 2 airborne, centred on the craft at its height; ground shadow at the real surface height (roof or street) |
| wing: air, fixed (last) | uavplane, uavcargo | Automatic take-off and landing; the player flies only the cruise. It cannot stop: minimum speed, the stick banks it, the stick's length is the throttle. Lowest priority: the world isn't big enough yet. | Like the rotors, at a higher cruise. | Air-drop at a marked field; cargo to the airfield, the lookout or Mirador. | View 1 airborne |
| sail: water | boat:drone, boat:watertaxi | Displacement hull. Thrust from the stick; turning needs headway (a small bow thruster on the taxi). The velocity lags the heading (drift). Water drag. A wake. A gentle pitch and roll. | Water only: bow, stern and beam samples must all be water (`owWaterFn`). Quay, docks and beach are soft walls with no splash. Moored boats (`_harborFleetFor`) are boxes. Breakwater rocks (`harborGeo().rocks`) are circles. A "turn back" fence out in Palma Bay. | Taxi: Dock at a landing stage (harbour slipway, pier landing, Driftwood jetty); passengers walk the gangway. Survey: tow the sonar along marked lines. | View 2 |


**Kerbs, knocks and blowouts (road and heavy).** A road vehicle never tips, but it can blow a tyre.
- **The hit:** only the speed *into* the hit counts (the normal component, as `owSplashCheck` measures it). Sliding along a kerb is free.
- **Below the line:** a bump. It stops, rocks and scuffs, and a nudged car honks.
- **Over the line:** the tyre nearest the hit blows, with a bang and a puff of rubber, and the wheel drops flat. Starting points to tune on the iPad: road about 60% of top speed (~0.19), heavy about 55% (~0.12).
- **The limp:** top speed drops to about a third, the steering pulls to the flat side, and the wheel flaps. A second hard hit stops it dead.
- **The crew:** the same rescue as a tipped Tipsey (`RESCUE_VAN`, `rescueVanPlan`, `owRescue`), called by a "Call the crew" card, or straight away if it is stopped. The van drives in from off screen and parks at the kerb. The crew walk to the wheel (`rescueWalkable`) and play a **tyre change** (jack, wheel off, spare on, jack down, about 6 s) instead of lifting him. Then the van leaves.
- **Costs:** no fine and no lost tips. Cargo damage counts as for Tipsey's knocks. A timed mission may count a blowout as a fail. A hard hit on a moving car still brings `POLICE_CALL` and a ticket.

**Traffic and people.**
- **Road and heavy** join `updateTrafficSpacing` as an obstacle, so cars yield to them and queue behind them, limping or stopped. They stop for a person on a zebra (a soft auto-brake).
- **Walk robots** keep Tipsey's knocks.
- **Flyers and boats** never touch traffic or people.

**Perf.**
- The driven vehicle is one live draw, as Tipsey is now.
- New live pieces stay small and culled: the flyer's shadow, the boat's wake (a ring buffer of about 20 quads) and the trailer.
- Bases, pads and moored fleet boats are cached through `bcDraw`, with stable keys.
- The real risk is altitude: view 2 over the hills and mountains draws more ground and buildings. The ground cache has to cover the corridor, and the perf check runs when Sir asks.

---

## 3. Launch bays and bases

**The rule: every vehicle starts the way Tipsey does.** Press Play, a door opens in front of it, and it pulls out of its own bay. There is no camera glide.

**How Tipsey's start works today (reused):**
- **The bay:** each charging station is the LIB entry `'Charge depot'`. Its volume (`depotVol()`) carries the marks the game reads: the `spawn` pad (back wall, square to the door), the `mat`, the `room` opening and the `door` zone.
- **The garage:** `garageOpen` pins the camera on his pad while the door is down (`_doorShut`), and he stands on the turntable to be painted.
- **Play:** `garageClose` clears `_doorShut`. He swings to face the door (the station's heading from `nearestChargeStation`), the door eases up (`_doorTs`), and he drives out.
- **Coming home:** drive into the door zone and the door opens (`depotDoorWants`). Stop on the pad and press the pad button: the door rolls down over `DOOR_SHUT_MS` (900 ms) and the garage opens (`tpAvatarPadGate`).

**One bay kit, several sizes.** The depot's marks become `BAY_KITS`: each bay is a LIB entry with the same marks, its own door and its own size. The door code, the pad button and the garage work on all of them unchanged.

| Bay | For | Door | Pull-out |
|---|---|---|---|
| Charging station (exists) | walk | Tipsey's shutter | Drive out, as Tipsey |
| Road bay | road | Wide roller door | Out forward over a dropped kerb |
| Heavy bay | heavy | Tall roller door | Drive-through: in at the back, out at the front, so the semi never backs its trailer out |
| Hangar | rotor | Sliding doors | Rolls out on its pad cart to the apron pad, takes off |
| Boathouse | sail | Roller door over the slipway | Slides down the slipway into the water |
| Site shed | site | Roller door | Out into the yard |
| Plane hangar (last) | wing | Big hangar doors | Taxis out and takes off by itself |

**How launching works:**
- **Which bay:** each vehicle uses the nearest bay of its kind in an owned hood, measured from where Tipsey is parked. The card names it ("Launches from: Pelican Harbor Fleet Station, hangar 1"), with a picker if you own several.
- **The garage, as now:** pick, paint, customise. Picking a vehicle that lives elsewhere turns the room behind the panel into its bay, door down. That is a cut under the panel, not a glide. A big vehicle is framed at full size in its own bay, so `FLEET_FIT`'s shrinking goes.
- **Play:** exactly Tipsey's Play. The door rolls up, the vehicle faces it and pulls out.
- **Tipsey:** he stays on his own pad, door down, drawn still (cached).
- **Send home:** drive, fly or sail back into any bay of its kind that you own. The door opens as you arrive, you stop on the pad, and the pad button brings the door down and opens the garage. Picking Tipsey there turns the room back into his station.
- **Missions:** a mission lends its vehicle at its base. Tipsey parks on the visitor pad there (drawn still, `bcDraw('tpark|...')`), then the bay door opens and the vehicle pulls out, the same start as above. At the end it drives back in and the door comes down. The borrowed kind is never saved.
- **Perf:** as the depot. Each bay is cached, and its door state is handed to the entry. Only a moving door and the vehicle are live.

**Bases across the city (a planning map).**
- The Flats is the only hood built and playable, so its bases (F) are built first. The rest of the city is unbuilt, generic blocks: each hood gets its bays when it is built out, on these blocks or ones like them.
- Each hood's base number 1 is its three charging stations (`DEPOT_SITES`), for the small robots.
- Every whole-block site must pass `depotsOf` / `wholeBlockLandmarkIJ`, as the Chapel does.

| # | Hood | Where | Serves | What |
|---|---|---|---|---|
| F2 | The Flats (first) | Tipsey Fleet Station, Pelican Harbor headland | rotor, sail | Drone hangars, the air-taxi hangar and the apron pads; a boathouse on a slipway into the basin. |
| F3 | The Flats (first) | Marina Parking, ground floor (0,6) | road | Roller-door bays off its forecourt for the robotaxi, pod and shuttle (check the shuttle's height). |
| F4 | The Flats (first) | Sun Deck Airfield Fuel Farm (8,8) | heavy | Drive-through heavy bays on the airfield's service road: semi, garbage, sweeper, dump. |
| F5 | The Flats (first) | Lagoon Market Hall loading dock (3,8) | site | The forklift's shed in the dock yard. |
| F6 | The Flats (first) | Sunset Pier landing | sail | A landing stage for the water taxi (a stop, not a bay). |
| F7 | The Flats (first) | Sun Deck Airfield, the Flats' field (7,6) | wing | A plane hangar beside the runway (last of all). |
| B2 | Boardwalk | Sun Deck Airfield Hangars (9,7) | wing, rotor | The existing hangar: the planes' second home and an air-taxi pad. |
| B3 | Boardwalk | Commercial block 10,4 | road | Road bays. |
| B4 | Boardwalk | Its stretch of the foothills | rotor | A drone hangar on the terraces, at the corridor north. |
| O2 | Old Town | Commercial block 22,6 | road | Road bays. |
| O3 | Old Town | Its stretch of the foothills | rotor | A hilltop drone hangar. |
| S2 | Scooter Row | Commercial block 28,5 | road | Road bays. |
| S3 | Scooter Row | The north-east foothills | rotor | The air taxi's ridge hangar, the door to the mountains (Fire Watch's lookout). |
| U2 | University | Crate Yard Building Site (8,10) | site | The plant shed: forklift and dump truck. |
| U3 | University | Its stretch of Sunset Shore | sail | A boathouse and jetty on the west coast. |
| U4 | University | Commercial block 3,12 | road | Road bays. |
| W2 | Warehouse Dist. | Block 9,10, beside the Crate Yard | heavy, road | The city's main heavy yard: tall roller doors and a loading dock. |
| W3 | Warehouse Dist. | Block 13,13 | rotor | A rooftop drone hangar on a warehouse. |
| T2 | Sunset Terrace | Commercial block 21,12 | road | Road bays. |
| L2 | The Bluffs | Commercial block 28,10 | road | Road bays. |
| L3 | The Bluffs | Mirador Heights site | site, heavy, rotor | The site shed (dump, forklift), a heavy bay for Moving Day, a drop pad for air mail. |
| M2 | Meridian Hts. | Commercial block 6,21 | road | Road bays. |
| M3 | Meridian Hts. | Its south-west corner of the beach | sail | A boathouse where Sunset Shore meets Driftwood Beach. |
| K2 | Market Dist. | Commercial block 13,21 | heavy, road | A market service yard: garbage truck and sweeper. |
| K3 | Market Dist. | Its stretch of Driftwood Beach | sail | A jetty stage for the water taxi. |
| H2 | Little Harbor | Its stretch of Driftwood Beach | sail | The second boathouse; the water taxi's south base, near the Beach Club. |
| H3 | Little Harbor | Commercial block 23,21 | road, rotor | Road bays and a drone hangar. |
| G2 | Palm Gardens | Commercial block 31,20 | road | Road bays. |
| G3 | Palm Gardens | Its stretch of Driftwood Beach | sail | A jetty stage. |

---

## 4. Unlocks, testing switch, saves

- **Rule:** a mission lends the vehicle it plays in, and finishing it keeps that vehicle. The courier bot and the cargo bot are open from the start.
- **The ladder** follows the evaluation page:

  | Mission | Unlocks |
  |---|---|
  | Lighthouse Run | dronequad |
  | Number 4 Builds a Winner | amr |
  | Adoption Day | humanoid |
  | Night Watch (after dark) | patrolbot |
  | The Getaway | robotaxi |
  | Beach Fest | avpod |
  | Sunset Salute (at dusk) | avshuttle and avsweeper |
  | Contest Day | avgarbage |
  | Letters on the Hill | dronelift |
  | Topping Out | avdump and avforklift |
  | Moving Day | avsemi |
  | Air mail to Mirador | uavplane |
  | Fire Watch | airtaxi |
  | 3 lookout supply runs | uavcargo |
  | Feeding Time | boat:watertaxi |
  | Harbour survey | boat:drone |

- **Fleet tab:** cards are grouped by class and show their base.
  - Locked cards are silhouettes that name the mission ("Unlocks in The Lighthouse Run · Pelican Harbor").
  - While testing, the card reads "Testing: unlocked", and underneath it shows the mission that will unlock it.
- **The testing switch:** `let FLEET_TESTING = true` (with `?fleet=locked` to preview the locks).
  - `fleetUnlocked(k) = FLEET_TESTING || !F[k].unlock || missionsCompleted.has(F[k].unlock)`.
  - **When it flips:** on Sir's word, once enough fleet missions are playable that a new player has a ladder to climb. Suggestion: after the Lighthouse Run, The Getaway and Night Watch ship.
  - It is one line, and every vehicle whose mission is not built yet then reads "Coming with <mission>".
- **Save model:** there is no new unlock list. Unlocks *derive* from `missionsCompleted`, which already round-trips for Devvit.
  - But the server only records missions listed in `TS_MISSIONS` (tipsey-delivery/src/server/tpcatalog.ts). Today that is only jump-hydrant, cone-slalom and heart-run. cake-run, goth-uniform and the rest stay on the device only.
  - So every unlocking mission id must be added there, and must report through `tpCompleteMission(id, 1)`.
  - `fleetKind` stays local (the last pick). A pick that is locked or gone falls back to Tipsey. A borrowed kind is never saved.
- **Existing testers:** nothing changes while testing. At the flip, recommend no grandfathering: everyone re-earns the vehicles by mission, and missions already completed count.
- **Console seeds (artifact build, empty localStorage):**
  ```js
  tpProfile.missionsCompleted.add('lighthouse-run'); tpSaveProfile();                // one unlock
  Object.values(FLEET).forEach(f => f.unlock && tpProfile.missionsCompleted.add(f.unlock)); tpSaveProfile();   // all
  FLEET_TESTING = false; window.garageOpen();                 // see the locks
  NIGHT_CLOCK.force = true;   // (or ?night=1) open the after-dark missions; false for day
  ```

**Building your fleet (Sir's original idea).** Neither part earns tips: business-growth income is "a bridge too far".
1. **Customise it in the garage.** Tipsey's paint rows for every vehicle: body, stripe, livery or plain; later decals and a name. Saved per vehicle as `fleetLooks` on the profile, locally and on the server like `equipped`. It wears the paint everywhere.
2. **Watch it fill the town.** Every vehicle you unlock starts working in the world in your paint (section 5). The city grows busier with your company: that is the business growing.

**Units are dropped.** There is nothing to buy. The game sets how many of each unlocked vehicle work in town: a few of each, in the hoods you own.

**Time of day (round 1, decision 3):**
- Night Watch (patrol robot) is "After dark · opens 7 pm". Sunset Salute (shuttle and sweeper) is "Comes at dusk".
- The board reads `nightLevel()`. On start the mission pins `NIGHT_CLOCK.time` for its length, and releases it at the end.
- The fleet's own night jobs come with it: the patrol robots round Sierra Vista's wall, the sweeper on the top street, the garbage truck's dawn round.

---

## 5. The fleet in the world

- **Rule:** once a vehicle is unlocked (or while testing), it works in town in your paint. It earns nothing; it shows the company growing. A few of each kind are out, set by the game. Ambient vehicles start and end their shifts in the bays, through the same doors. Everything ambient is a loop that depends only on time, like traffic, so it is simulated off screen and never pops or fades.
  - The vehicle you are driving takes the place of one of its kind, so it is never shown twice.
  - Ambient units appear only in the owned hoods.
- **Road:** robotaxis, pods and shuttles join `TRAFFIC_MIX` through `rollTrafficKind`, gated on unlock. The RIGS kinds already draw from a sprite on the straights (`trafficSpriteKind`). They follow schedules: the sweeper at night, the garbage truck at dawn, the shuttle airfield to Motor Lodge by day.
- **Kerb:** a delivery pod parked at a house, with a resident at its lockers. A cached kerb car plus one live person.
- **Sidewalks:** courier bots on rider-style loops.
- **Air:** drones on fixed corridors (Fleet Station to Marina General, the airfield to Mirador, the Station to the light). They are small, drawn live, culled with `inView`, and fly at cruise height with a shadow.
- **Water:** the water taxi crossing Harbor to Pier landing to Driftwood jetty, and the survey boat running lines in the basin. Moored at the slipway when idle (cached).
- **Sites:** the forklift and the dump truck at the Crate Yard (and at Mirador later).

---

## 6. The data model: one registry

`FLEET` becomes an object keyed by kind. It replaces the `FLEET` list, `FLEET_PHYS`, `fleetBody()`'s table lookups, `FLEET_FIT`'s keys and the Fleet tab's hard-coded order.
- The art tables (`RIGS`, `AV_PODS`, `DRONES`, `BOTS`, `BOAT_LEN`) stay as they are, as the art. An entry points at its drawProp kind, and `drawFleetAvatar` keeps drawing through `drawProp` and the Harbor Boat LIB entry.
- `fleetPhys()` and `fleetBody()` become shims over the registry, so the 20 call sites move one at a time.

```js
const FLEET = {
  dronequad: {
    name: 'Delivery drone', cls: 'rotor', art: 'dronequad',
    body: { len: 164, wid: 164 },                              // footprint: collision and shadow
    ctl:  { vMax: 0.26, accel: 0.0005, turn: 0.004, cruiseZ: 220, ceilZ: 650, climb: 0.12 },
    bay: 'hangar',                                             // its BAY_KITS kind; FLEET_BASES says where
    unlock: 'lighthouse-run',                                  // a missionsCompleted id (in TS_MISSIONS)
    abilities: ['winch'], cargo: 'parcel',
    ambient: { corridors: ['station-marina', 'station-light'], night: false },
    looks: ['body', 'stripe', 'livery']                        // garage paint rows (fleetLooks)
  },
  avsemi: { name: 'Autonomous semi', cls: 'heavy', art: 'avsemi',
    body: { len: 780, wid: 104, hitch: 250, trailer: 520 },
    ctl: { vMax: 0.22, wheelbase: 230, steerMax: 0.55, accel: 0.00018, brake: 0.0004 },
    bay: 'heavy', blow: 0.12, unlock: 'moving-day', abilities: ['dock'], ambient: { mix: 0.01 } },   // blow: tyre blows above this hit speed
  // ...one per vehicle; cls in walk | road | heavy | site | rotor | wing | sail
};
const BAY_KITS = { station: 'Charge depot', road: {...}, heavy: {...}, hangar: {...}, boathouse: {...}, shed: {...}, planeHangar: {...} };  // depotVol()'s marks
const FLEET_BASES = [ { id: 'F2', hood: 'The Flats', name: 'Pelican Harbor Fleet Station', bays: ['hangar', 'hangar', 'hangar', 'boathouse'] }, /* ... */ ];
```

Not fleet (crewed): `tipseyvan`, `boat:patrol`, and the police, ambulance and fire vehicles.

---

## 7. Phased build plan

Each phase ships on its own and works in both the web and Devvit builds.

| Phase | Work | Effort | What Sir sees at the end |
|---|---|---|---|
| P0 Registry (**done**) | `FLEET` registry, `FLEET_TESTING` on, shims, `fleetBody` fixes (forklift, cargo bot, AMR), Fleet tab grouped by class with each vehicle's bay and mission | S | The Fleet tab reorganised. Driving is unchanged. `?fleet=locked` shows the silhouettes. |
| P1 Launch doors and bays | The bay kit (Tipsey's door, pad and pad button, generalised). The Flats' bases: F2 Fleet Station hangars and boathouse, F3 Marina Parking road bays, F4 airfield heavy bays, F5 Market Hall shed. The garage room follows the picked vehicle. Play, door, pull out; Send home into a bay. No glide. | M to L | Pick the drone: its hangar is behind the panel. Play: the hangar door slides open and it rolls out. A semi drives out of its bay. |
| P2 Air (rotor) | Real z, **both height modes behind a toggle**, height-aware walls, shadow, bank, camera, apron pads, the north corridor; then the Lighthouse Run | M to L | Drones and the air taxi fly over shops and round towers in either mode, and Sir picks one. The first mission played in a fleet vehicle. |
| P3 Road and heavy | Bicycle controller, `vehicleSolid` (closes the kit's V3 flaw for everyone), kerbs respected, never tips, **tyre blowout, limp and the crew's tyre change** (`RESCUE_VAN`), traffic yield, the semi's trailer joint; then The Getaway | L | The robotaxi drives like a car. Hit a kerb hard and it limps on a flat until the crew swaps the wheel. |
| P4 Robots and site | Per-kind walk tuning, the site controller, forks and dump | M | Each robot feels different. The forklift works the Market Hall dock. |
| P5 Water | Sail controller, water mask, wake, landing stages, moored-boat and rock collisions; then Feeding Time | L | The water taxi slides down the slipway, sails past the light and docks at the pier. |
| P6 Fleet in town | Ambient vehicles to and from their bays, corridors, the taxi route, night jobs, the time-of-day mission board, the fleet's garage paint (`fleetLooks`) | M to L | Your painted fleet at work in town, day and night. |
| P7 Bases beyond the Flats | Each hood's bays from the map, built with that hood | S to M a hood | Bays wherever you own and the city is built. |
| P8 Lock flip | `FLEET_TESTING = false`, on Sir's word (any time after P2) | S | New players earn the fleet. |
| P9 Planes (last) | The wing class: automatic take-off and landing, the player flies the cruise. It waits for a bigger world. | M | The drone plane taxis out, takes off, and lands itself. |

**Risks:**
- *Perf:* the altitude view and corridors over the hills draw more. The ground cache has to cover them. Use `perf_check --why` on new views when Sir asks.
- *Tipsey's driving:* his `owStep` stays untouched. Controllers dispatch above it, so the risk is the ~20 `fleetPhys()` call sites, which move behind shims.
- *Devvit:* the unlocking mission ids must go into `TS_MISSIONS`, and `fleetLooks` rides the profile as `equipped` does.
- *Saves:* a stale `fleetKind` falls back to Tipsey, and a borrowed kind is never saved.
- *Sites:* whole-block bases must pass `depotsOf` and `wholeBlockLandmarkIJ`. Marina Parking's ground floor must clear the shuttle (172 tall); if it doesn't, the shuttle's bay goes on the forecourt.
- *The tyre change:* it is the crew's existing plan with a new last act. The van's drive and the never-pop rules stay.

---

## 8. Open questions for Sir
Round 2 answered six of the seven. Still open:
1. **At the lock flip:** re-lock for everyone (recommended: missions already completed still count), or let today's testers keep everything?
2. **One check on the garage:** when you pick, say, the semi, should the room behind the panel become the semi's own bay (proposed, so it is framed at full size)? Or should it stay in Tipsey's room, shrunk as now, with the cut to its bay at Play? The doors work the same either way.

---

## P0 as built (2026-10-30)
In `game/index.html`, where the old `FLEET` list was (search `THE AUTONOMOUS FLEET: ONE REGISTRY`):
- **`FLEET`** is the one registry, keyed by drawProp kind, 20 entries in the tab's order: `name`, `cls`, `art`, `body` { len, wid, h, cap }, `fit`, `ctl`, `bay`, `unlock`, `abilities`, `cargo`, `ambient`, `looks`. It replaces the old list, `FLEET_PHYS`, `fleetBody()`'s RIGS/PLANT/AV_PODS lookups, `FLEET_FIT` and the tab's hard-coded order. `body` is the true size (read from BOTS, AV_PODS, RIGS and DRONES where they are declared; planes and boats as literals from PLANES and BOAT_LEN x BOAT_SC / `harborBoatBeam`), so P1 can size each bay (`fleetBayNeed(bay)`).
- **`FLEET_CLASSES`**, **`FLEET_MISSIONS`** (id: name, place, `when` night/dusk, `built`), **`BAY_KITS`** and **`FLEET_BASES`** (F1 the charging stations, F2 to F5, and F7) are data for P1.
- **`FLEET_TESTING`** (a `let`, true; `?fleet=locked` makes it false). `fleetUnlocked(k)` is as designed. `fleetCur()` is the kind he drives: the pick, or Tipsey when the pick is locked or unknown.
- **Shims:** `fleetPhys()` derives `fly` (rotor, wing) and `big` (road, heavy) from `cls`, and `D` = OW_D with `ctl` over it. `fleetBody()` is the capsule for a body with `cap`. `drawRobotOrSunk`, `policeMeet` (the cab's length), `policeTicket` (the kind) and the garage frame read the registry through `fleetCur()`. No other caller changed.
- **Body fixes (intended):** the forklift is a 220 x 84 capsule (was none), the cargo bot 100 x 88, the AMR 110 x 76 (were Tipsey's disc). The other 17 bodies are unchanged.
- **The Fleet tab:** Tipsey, then one section per class. Each card names its base and bay ("From Tipsey Fleet Station · hangar") and its mission and place; while testing it reads "Testing: unlocked". A locked card is a grey silhouette that cannot be picked: "Coming with <mission>" (or "Unlocks in" once its mission is `built`), then the place, and "after dark" / "at dusk".
- **Proof of no play change** (headless, the harness, before = a9ff1b6, both builds, page errors []): for Tipsey and all 20 vehicles, `fleetPhys()` (fly, big, D) is identical, and 2 scripted drives (270 and 260 steps of `owStep`, kerbs and turns) give identical positions and headings at every sample. `fleetBody()` differs only for the forklift, cargo bot and AMR. The daily route and `hoodAt` / `hoodAtWorld` are identical. The garage frame for the semi is the same (scale 0.240).

**Deviations from the plan:**
- The mission ids are new slugs (`lighthouse-run`, `number-4-builds`, `night-watch`, ...): none of the missions exists yet. Each goes into `TS_MISSIONS` (tpcatalog.ts) when its mission ships, so Devvit keeps the unlock. Not added now.
- The bases: F1 and F7 are included beside F2 to F5 so every card names a base. F6 (the Sunset Pier landing) is left out: Sir has since made the pier University's edge.
- `ctl` holds only today's live numbers (the flyers' vMax). The class controllers' numbers (turn radius, climb, cruise) come with P2 to P5.
- `fit` (the shrunken garage frame) stays in each entry until P1's bays frame vehicles at full size.
- The forklift's capsule is centred on its origin; its art runs -70..126 (forks forward). P4 can offset it.
- A card's base is the first base with its kind of bay. P1 picks the nearest owned one, with a picker.
- `tools/review/kits.js` reads the registry (it iterated the old list).


---

## P1 as built (2026-10-30)
In `game/index.html`, search `THE BAYS (fleet P1`:
- **The kit.** `BAY_SPEC` (road, heavy, hangar, boathouse, shed: height, door height, wall, jamb, door kind, colours) and one LIB entry, `'Fleet Bay'`, drawn by part. A bay is a lane of a HALL (`FLEET_HALL_DEFS` -> `fleetHalls()`): the hall's frame is o (its door face's corner), u along the face, n into it; every hall's door face and seen side wall face the camera. Each lane has the depot's marks: a pad square to its door (`pb`, facing out), its door zone in front (`fleetBayDoorWants`), its room, its key in the scene's `_doorTs` (`bay|<hall>|<lane>`, a drive-through's back door `|back`).
  - Doors: roller doors (road, heavy, boathouse, shed), folding leaves on the hangar; the heavy hall is drive-through (a door each end, its jambs in hazard stripes). They open for a vehicle of their own kind as it comes up, and shut from the pad as a depot's (`DOOR_SHUT_MS`).
  - Pieces (`queueFleetBays`): `room` (floor, the lanes' paint, the far walls from inside, chargers, the boathouse's slipway and cradles) keyed behind the hall; `front` (door face, doors, roof, the sign in a frame of its own so it reads) keyed at the door face's far end; `side` at its far end; each raised past him only while he is inside its plane and over it on screen (the depot's rule). All `bcDraw` images keyed by hall, part, door states (0/1) and garage cut; a face draws live only while one of its doors moves.
  - Collision (`fleetBaySolidAt`, first in the world's `solidAt`): side walls, the door face's piers and lintel, a door that is down, the back wall; the floor open over whatever ground it stands on; the boathouse's slipway closed. The x-ray reads the roof (`fleetBayBuiltHeight`), and nothing while the garage has the hall.
  - Drives off the street to the doors: `FLEET_BAY_DRIVES` (through `hoodDrivewaysOf`).
- **The bases** (`FLEET_HALL_DEFS`):
  - **F2 Tipsey Fleet Station**, Pelican Harbor's plaza (`HARBOR.FLEET_HANGAR`, `FLEET_BOAT`): the hangar hall, three lanes (delivery drone, heavy-lift drone, air taxi), folding doors east to the turning circle; the boathouse on the basin's north wall, two slips (survey boat, water taxi), its roller door over a slipway out on the water.
  - **F3 Marina Parking**, on its forecourt: the shuttle's bay west of the ENTER lane (door east to it), the robotaxi's and the pod's east of the lift tower (doors south to a new drive). Numbered road bay 1-3.
  - **F4 Sun Deck Airfield Fuel Farm**: a drive-through hall of four lanes (semi, garbage truck, dump truck, sweeper) from the north fence to the south one, a drive off each street.
  - **F5 Lagoon Market Hall**: the site shed in the yard's north-east corner (forklift), door east to a drive off the street.
  - None is an address: each is on a whole-block landmark's cell or off the grid; the daily route is unchanged (all route fields identical to 93cf61f, both builds).
- **The garage.** Picking a vehicle in the Fleet tab cuts the room behind the panel to its own lane (`fleetGarageCut`): he (`ow`) moves to its pad, its door down, `_garage.key` the lane; Tipsey stays on the station he was on (`_tpPark`), its door down, not drawn. The frame is FULL SIZE (`fit()`: the vehicle's screen box at the way it faces; `FLEET_FIT`'s shrink is gone, `_garageScale` stays 1); in a hall the other lanes' vehicles stand on their pads (images). A vehicle too long to turn round in its lane does not spin. Picking Tipsey takes the room back to his station. The small robots use a charging station that is not the one he is parked on. The card says where it launches from ("Launches from Tipsey Fleet Station, hangar 2").
- **Play** (`garageClose`): exactly Tipsey's; the vehicle swings to its door (`fleetLaunchPad`), the door rolls up, and it drives out on P0's controls.
- **Send home**: drive back into a lane of its kind; the door opens as it comes up; stop on the pad (`fleetPadAt`, the pad button's test now); the pad button rolls the door down and the garage opens there.
- **Boot and the tow**: a saved pick wakes in its own bay with Tipsey parked at home; a tow or respawn puts it back in its bay (`owPlaceOnPad`).
- **World changes made for the bases** (each in the geometry that owns the ground): the harbour's flags moved east of the hangar doors and two benches under the boathouse left out, the rocks under the boathouse and its slipway left out, the rescue van's lane across the plaza moved north of the hangar (`rescueOffGridEdges`); the airfield's fuel tanks in a row east of the hall, its fuel truck on the south apron, its fence open where the hall stands (`AIR`).

**Deviations from the plan:**
- **F3 is on Marina Parking's forecourt, not its ground floor.** The ground floor is 150 clear under the first deck (`LH` 100 x 1.5): lower than the shuttle (172) and no taller than the robotaxi (150) or the pod (146) with their sensor domes, so none of the three fits under it. The forecourt (260 deep) takes the shuttle's bay lengthwise (door east to the ENTER lane) and the robotaxi's and pod's side by side east of the lift tower.
- **F2 stood on the plaza's west end** (between the basin and the harbor house) at first; on 2026-10-31 its hangar hall moved behind the harbor house (see "P2 fix" below). The boathouse stays on the basin.
- **Boats stay in the boathouse (P5).** P0's boats drive on land and would splash off the slipway, so the slipway is closed and a boat waits on its cradle at the slipway's head with the door up. P5's water controller opens it.
- **Flyers roll out** on P0's controls; their apron pads and take-off are P2.
- Doors open for a vehicle of their own kind only (Tipsey passing does not open the hangar).
- In a long hall a full-size vehicle cannot also have the view inside the room (a long hall is a thin diamond on screen), so the garage's "no dark border" clamp yields to the full-size frame there: a sliver of the dark round the room can show (the semi).
- The vehicles parked in the other lanes show only in the garage's cut view (through an open door a lane shows only its own vehicle's space).
- Mission loans (Tipsey on a visitor pad at the mission's base) wait for the first fleet mission (P2's Lighthouse Run).

**Console seed (artifact build):** `tpProfile.fleetKind = 'avsemi'; tpSaveProfile(); location.reload();` boots in the semi's bay at the fuel farm (Tipsey parked at home); `tpProfile.fleetKind = ''` for Tipsey.


---

## P2 as built (2026-10-31)
In `game/index.html`, search `FLYING (fleet P2` (the controller) and `THE LIGHTHOUSE RUN` (the mission).

**The rotor controller** (`FLEET_CTRL.rotor`, handed off from `owStep`'s top by `owFleetCtrl`, right after the garage lift; Tipsey and every class without a controller fall through to `owStep` unchanged):
- **Numbers** in the registry, `FLEET[k].ctl.fly`: accel, brake, turn (rad/ms), cruiseZ, ceilZ, climb (units/ms), clear (auto clearance), floor (manual floor), r (collision radius). Delivery drone: cruise 220, ceiling 650; heavy-lift: 240 / 500; air taxi: 320 / 900. `vMax` stays P0's.
- **State on `ow`:** `ow.z` is the real height (world z, the hills' ground included); `ow.fly` holds the phase (`ground`, `out`, `takeoff`, `air`, `land`, `in`), the velocity in the plane (`vx`, `vy`, a hover: the stick asks a velocity, it eases to it, let go and it hangs), `vz`, the rotors' `spin` and phase, `bank` and `pitch`. `owStandUpAt` clears it (a tow or a respawn puts it on its skids).
- **Height, two modes behind one toggle** (`flyMode()`: `?fly=auto` / `?fly=manual`, else the Fleet tab's new **Flying height** row, kept on this device as `tipsy.flyMode`; default auto). Auto: the target is the higher of cruise and what is under it and ahead of it on its path (120 to 600 out) plus clearance, under the ceiling. Manual: a slim slider on the right edge at mid height (`#flySlider`, the free thumb's side; Q / E on a keyboard): up climbs, down descends, let go and the thumb springs back and it holds its height; a floor keeps it clear of the roof or ground under it. One controller; only the target differs.
- **What stops it** (`flyBlocked`): a solid only if it stands taller than the flyer flies (`W.solidAt`, then the x-ray's own `builtHeightAt` round the contact, `flyObstH`; a solid the x-ray does not know counts as two storeys), the harbour house and the breakwater light, Sierra Vista's walls and North Sunset Shore's houses at their heights, ground that rises to it (`flyTerrainZ`: Sierra Vista's shelves, Cove Grove, the dunes, and the foothills' terraces, `flyHillsZ`), and the world's edge (`flyEdgeBlocks`: off the region index, The Mountains past the last terrace, the sea 1600 west of the light). Kerbs, water, traffic, people and short furniture never stop it; below 330 the lamp posts, palms and signal masts turn it aside (`owFlyTallContact`, P0's list). Touching a wall it slides along it (the test shrinks a hair while it grazes).
- **The north corridor:** past the north rim over the Flats' foothills, each flyer climbs the terraces as far as its ceiling clears them (measured: the delivery drone stops at y -5755 where the shelves pass 640; the air taxi goes on further); the mountains stay closed.
- **Look:** banked into the turn and pitched as it pushes on (`drawDrone`'s new `roll` / `pitch`, a transform in its own frame), rotors spinning up and down (`spin`, `rot`), a gentle bob in the air. Its **shadow** is its own small live item (`drawFlyShadow`): the footprint on whatever is under it, street or roof (`flySurfaceZ`), wider and softer with the height; on the street it sorts where it falls, on a roof just under the craft.
- **Sort and camera:** in the air it sorts 2 x its height past its own spot (`flyDepthLift`: a point at height z lies on screen where the ground 2z nearer the camera does), so it draws over the roofs it is over and behind the towers in front of it. The camera follows `botZ` (the pose takes `ow.z`), its height target 60% of the way from the ground to the craft so both stay on screen at any height. Taking off sets **view 2** (not saved as the player's view); it goes back once it is on its skids again (in its lane, after the roll in). The x-ray asks at its height.

**Launch and landing** (Sir: "Play opens the hangar door, the vehicle rolls out to its apron pad, then takes off"):
- **The apron pads** (`flyApronPads`): one in front of each hangar lane's door at the Fleet Station, sized to its vehicle, painted in the plaza's paving in the ground pass (`drawHarborGround`: a concrete disc, an orange ring, a white H). The harbour's three flags moved 180 east to keep clear of the drone's pad.
- **Play** in a hangar lane (`garageClose` -> `flyOnPlay`): once the door is up it rolls out by itself to its apron pad (a hand's-height hover taxi), spins up, lifts straight to its working height and is the player's. A push on the stick during the roll out hands it over on its skids.
- **The take-off choice:** automatic on the apron pad at launch; anywhere else a context button (`#flyBtn`, orange, bottom right): **Take off** on its skids on open ground, **Land** in the air over a pad or open ground (`flyLandOk`: never a roof, a road or kerb, the water or inside a hall).
- **Send home:** land on its own apron pad and it rolls back into its lane by itself (the door opens as it comes, its nose turned to the door on the pad); the pad button then brings the door down and opens the garage (P1's flow). Landing anywhere else leaves it on its skids, on P0's taxi.

**The Lighthouse Run** (`MISSIONS['lighthouse-run']`, `LH`, `LH_RUN`; the first mission played in a fleet vehicle):
- A fog bank rolls in and the breakwater light has gone dark (the Harbor Light is drawn without its lamp till the run is done: `lhLightOn`). Tipsey stops on the bay at the quay's head; the harbour master comes over from the quay wall, face to face, and asks (I'm on it / Not now). The Marina Chandlery's clerk brings the spare lamp out to him (in her hand). He parks on the Fleet Station's **visitor bay**: the mission **lends** the delivery drone (`FLEET_LOAN`, read first by `fleetCur`, never saved as his pick; Tipsey stays on the bay, still, through the building cache), and the drone rolls out of its lane and takes off as any launch does, the lamp slung under it. The fog thickens over 75 s (`#lhFog`, `#lhTimer`); over the light's bay it comes down to a hover and Ines, the keeper, comes round the tower to it, face to face (at the drone's own gap, off its rotors). She takes the lamp up and the light comes on (its glow and a slow beam, a small live item). It flies home to its pad, lands, rolls in, the door comes down, and he is Tipsey again on the visitor bay; the harbour master (waiting on the plaza since) thanks him face to face. Reward: $50 once (server `lighthouse`), Ines's brass key (a key item, rebuilt from the record: `lhKeyMigrate`) and the drone (`FLEET.dronequad.unlock`). Missed the fog: the light stays dark, he brings the drone home and the harbour master says they will try again (back to idle, nothing kept).
- Focus (R17): a story like the others (`busy()`); its start is hidden while anything else holds him, and it is Tipsey's (no start while he drives a fleet vehicle). The harbour master, the clerk and Ines are always about (`CITY_PEOPLE` 'The Lighthouse Run'), with a glance now and then.
- Server: `lighthouse-run` in `TS_MISSIONS` (tpcatalog.ts); `LIGHTHOUSE_TIP_ID` 'lighthouse', 5000 cents, in `ONCE_TIP_CENTS` / `GIFT_TIP_IDS` (db.ts).

**Deviations from the plan:**
- **The roll out is a hover taxi**, a hand's height off the paving with the rotors idling, not a pad cart: the hangar's pad cart would be left on the apron at every launch.
- **Fly pads elsewhere** (step 6, optional) are not built: landing is on the apron pads and open ground. Later: pads on the hospital's roof, the airfield, B4/O3/S3's hangars.
- **The flight legs have no street GPS**: the beacon leads (over the light's bay, then over the drone's apron pad). The GPS still leads Tipsey's own legs (the chandlery, the visitor bay).
- **The mission's camera eases between Tipsey and the drone** at the loan and its end (about 950 units, half a second): the drone lives in its lane, he parks on the visitor bay beside the pads.
- **The harbour house's doors are painted**, so the harbour master and the clerk are people already standing (the quay wall, the chandlery's awning) who walk up to him, not out of a door (R11's open flaw, as the shelter's).
- The building cache stays flat while it hovers (no new keyed images move with it); the perf check was not run (Sir's call).

**Console seeds (artifact build):**
```js
tpProfile.missionsCompleted.add('lighthouse-run'); tpSaveProfile();   // the run done: the light on, the brass key, the drone kept
localStorage.setItem('tipsy.flyMode', 'manual');                       // manual height (or ?fly=manual); 'auto' back
tpProfile.fleetKind = 'dronequad'; tpSaveProfile(); location.reload(); // wake in the drone's hangar lane: Play rolls out and takes off
```


---

## P2 fix: the Fleet Station's site and the height controls (2026-10-31)
Sir, on the iPad at view 3, night: "the palcement of the drones bay is bad this spot has a ton of issuers also the flying isnt working i push take of he goes up but then he doesnt go high enough to clea buidlings ints not a good mechanic we need a way to control him to go over". Then: "put the fleet station behind" (behind the harbor house).

**The site** (`HARBOR.FLEET_HANGAR`, `FLEET_YARD`, `FLEET_DRIVE`, `FLEET_VISIT`; `FLEET_HALL_DEFS` F2h):
- On the plaza the hangar had the Sea Lion Point anchor showing over its roof, its third pad in the turning circle, the pads against the white lamp, the flags and the chandlery's awning, a bench at its west wall, and no room.
- The hangar hall now stands **behind the harbor house**, on the headland strip between the house's back wall (y -16500) and the first riser of the hills (its foot wobbles to y -18152): x -5100..-3660, y -18100..-17600, doors **south** (u +x, n -y), its east wall the seen side wall. W 1440 (three lanes of 480), D 500.
- **Its yard** (x -5520..-3460, y -18150..-16500) is the site's own floor, the plaza's stone with the park paths' kerb-grey edging, painted in the ground pass (`drawHarborGround`), surface `lot` (`harborSurface`). The three apron pads lie 680 out from the house's back (the house hides the ground about 420 behind it at view 3).
- **Its drive** (x -5520..-5240, y -16500..-14100) runs up the house's west side (the chandlery wing) from the plaza, beside the park's path in.
- **The visitor bay** (`FLEET_VISIT`, -5380, -16960) at the drive's head, west of the pads.
- Sea Lion Point: the planting on the yard and the drive is taken out after the scatter (every other plant keeps its place); the park's back path stops at the yard each side; the bench that stood at x -3500 is at -2900, east of the yard. The hills' toe reads a constant (`HARBOR.BACK_PATH_X1`), so the drawn hills are unchanged.
- **The plaza restored:** the three flags back at x -4700 / -4480 / -4260 (their place before P1). The two benches under the boathouse stay out (the boathouse stays on the basin; its spot is clean). The anchor stays. The rescue van's lane runs along the house's front (the plaza's middle line runs into the boathouse) and on **up the drive into the yard** (`rescueOffGridEdges`), so the van reaches the station and the park's back.
- Candidates looked at (photos `cand_*` in the session scratchpad): the plaza (no room: the turning circle fills its middle), the strip behind the house (chosen by Sir; Sea Lion Point's planting, no drive till now), the NW rim lot (Sir's fish market), Airfield Corner 8,5 (bare paving, the motel's, 40,000 from the light), the airfield's own cells (full: runway, apron, hangar 1, the F4 hall and tanks), the sand south of the basin (dunes).

**Flight** (`FLEET_CTRL.rotor`, the height section):
- **Diagnosis (measured, 140,000 points over the Flats, every 80):** 12.6% of the ground is built over; built heights p50 460, p75 570, p90 900, p95 1041, max 1074; 87% of built ground is over the delivery drone's old cruise (220) and 17% over its old ceiling (650). The auto look-ahead reached 600 at most: at 0.26 a unit/ms that is 2.3 s, and at its climb (0.14) it could rise 320 in that time, so anything taller than about 530 stopped it dead; and anything over 638 stopped it for good (its ceiling). `flyBuiltZ` asked `builtHeightAt` with the blocks on screen only. A wall test at the contact blocked it before it climbed. Below 330 (the old cruise) the lamp posts and palms turned it aside.
- **Now:** heights come from the whole city (each point's own block cell, the rim lots), kept per 40-unit cell (`FLY_BZ`). Look-ahead out to the climb's reach at its speed (`sp*(ceil - z)/climb + 2.2R + 260`, every 110, along its middle and either side). Numbers (cruise / auto top / ceiling / climb): drone 340 / 740 / 800 / 0.30; heavy-lift 350 / 680 / 700 / 0.22; air taxi 400 / 800 / 980 / 0.24. Cruise over the posts (330).
- **Auto** climbs over anything whose top plus clearance is under its auto top (ordinary shops and houses), and keeps at it once it has set out. **UP / DOWN** raise or lower its cruise (`fl.cruiseAdd`). **Manual**: UP / DOWN set the height (`fl.zHold`), it holds it. Both modes stay (the Fleet tab's Flying height): auto is the default.
- **The hop over** (both modes): pushed into anything under its ceiling (`FLY_HIT.h` from `flyBlocked`), it climbs over at full rate and goes on (`fl.hopZ`; manual keeps the height). Over the ceiling it slides along and says "Too tall for the delivery drone. Go round." once a contact.
- **The controls** (`#flyAlt`): two round orange buttons on the right edge at mid height, UP over DOWN, press and hold (72 px); beside them a height bar: the craft (orange), its ceiling (red), what is under it (grey) and the tallest thing ahead (light grey, red when over the ceiling), the target line, its height in m. Shown whenever it is up, in either mode. Keys: Q or Space climbs, E or Shift comes down. The slider is gone.
- **The harbour's terraces** count for flight now (`flyHillsZ` west of X0, the harbour strip's toe), so it climbs over them rather than through.
- **Measured** (headless, no input): over the shop row at x 1564 (roofs to 648) in auto: no wall hits, 67 clear over the roofs at least (the old build stopped dead at y 3918 for good). Over Tidewater Maritime Museum (its roof 660, x 10948) in manual with UP (held at 800), and down with DOWN. Into Marina General (1074): slides along, the toast. The Lighthouse Run from the new base: out over the harbor house at 500 (its roof 420), no wall hits, 11,770 there and 11,780 back (about 45 s each at the drone's pace); timer 90 s (was 75 s from the plaza). Tipsey's own driving: a scripted `owStep` run identical before and after (both builds).
- **The Lighthouse Run:** the visitor bay at the drive's head; the harbour master waits on the plaza by the drive's mouth (`LH_RUN.wait`) and walks up it to thank him; his way back goes by the drive's mouth (`lhWalkHome`, a `via`), not through the house. `LH_RUN.limitMs` 90 s.

**Done after (2026-10-31, the leftovers):**
- **The hangar's night lights** (`FLEET_BAY_LAMP`): a floodlight bar over each door on the lintel (the Fleet Bay kit's `front`, cached) and eight edge lights round each apron pad (painted with the pad in the ground pass, `flyPadLights`). At night `queueFleetBays` lights them: the bars through the lamp kit (`queueLandmarkLamps`, an entry of the hall's own, `Hh._lampEnt`), each pad's ring as one small glow item keyed at its far rim.
- **The yard's dark joint:** the kerb-grey edging was a plate under the yard and the drive sharing their edges, so along y -16500 (the yard against the house's paving) its grey bled through the yard's anti-aliased edge (a dark dotted line), and the drive's east edging ran across the house's paving. Now strips only on the sand sides (north, west, the east down to the house's paving, the drive's west).
- **The drone in teal over the museum:** two causes. (1) The prop x-ray (`drawProp`) laid its cover line at the prop's base plus how high the cover reaches, as if the cover stood on the prop: the drone is drawn from the roof under it (`flySurfaceZ`) with its height as `hover`, so the museum's own height was stacked on its roof and all of it ghosted. The cover line is a world height now, and a prop whose lowest point (base plus hover) is over it is in the open (props on the ground: unchanged). (2) Flying over the museum's front mat at any height handed it into the walk-in (`pocketDoorStep` tested the plan only): the shell cut away round it. A flyer in the air takes no door now (on its skids it goes in as Tipsey does). Tipsey and a low drone behind the museum still ghost (the robot's x-ray at its height).

**Console seeds:** as P2 (`tpProfile.fleetKind = 'dronequad'; tpSaveProfile(); location.reload();` wakes in its lane behind the harbor house; `localStorage.setItem('tipsy.flyMode', 'manual')` for manual).
