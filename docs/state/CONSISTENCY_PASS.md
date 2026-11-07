# The consistency pass (2026-10-30)

This pass works on the `consistency-pass` branch. Its test page is https://cal-starfur.github.io/Tipsy/consistency-pass/: `main`'s `consistency-pass/` folder, built from a gated commit, with saves kept under their own `tipsy-consistency:` prefix. The live game and `main`'s game files are untouched until Sir says "push".

**Jump links.** Each batch's `Test:` line opens the test page with Tipsey already standing at the change (`?go=<x>,<y>` or a named spot, `&view=` the zoom; `tpGoHere()` in the console gives the link for where he stands). Open them in Safari: the home-screen app drops the end of the link.

Each batch is:
1. rebuilt;
2. booted headless (no page errors);
3. photographed or filmed;
4. judged by the gate (`tools/review/gate.js --rev <commit>`): no NEW finding caused by the change;
5. published.

## Done

### People registry and the strand's garages (2026-11-05)
- Pavement walkers wait (`dly` hold, drawn standing) while a Strand garage's errand car is pulling in or backing out across the pavement (`holdForGarageCars`, `GAR_WAIT`). Anyone already across the car's line walks on out.
- Listed in `CITY_PEOPLE`: food truck customers, the Sierra Vista gate guard, Marina General's walkers and pushed patients seen from the street, the derby's drivers, the pickup shop's worker, the park landmarks' cast.
- Listed too: the drop-off customer and the ball pit kids (their draws now record where they stand each frame). Not listed on purpose: the food-truck vendor inside the hatch (a person in a vehicle).
- Checker notes: run `--kit doors,people` together, since the people kit alone reports every door entry as a pop. In the headless run frames are ~600 ms apart, so a jogger (0.21 u/ms) shows as a 126-unit "jump" (P3): not real.

### The shared rules (batch 1)
- **One door rule.**
  - Small shops' doors open for anyone listed in `CITY_PEOPLE` going through them (`doorPeople`, `shopDoorUsedBy`), and for anyone drawn in their doorway.
  - Route walkers calling at a shop go in through the open door, drawn between its lit room and leaf. In the doorway they are not an x-ray ghost.
  - Tipsey opens only the trophy shop's door (`SHOP_DOOR_USE.tipsey`).
  - House doors open for Rosa and Luna's mom.
  - The hospital's glass opens for the heart run's doctor and medic.
  - Automatic doors part for anyone listed.
- **One walk to Tipsey.** Every meet walk goes at the street's 0.065, eased only over its first and last 220 ms (`MEET_WALK`, `meetWalkMs`, `meetWalkFrac`). It was 0.16, up to 0.24. Arrived, they turn to face him over `MEET.turnMs`.
- **The crew at the street's pace.**
  - They walk at 0.065; it was 0.3, jogging 1.2.
  - Their van drives in the traffic's lane at 0.29, brakes over its last 520, and gives way. A wait it is stuck in is let go only after 30 s.
  - It parks within 800 of the fall. With no kerb gap there, it double-parks by him.
  - The hospital crew's van and walk follow the same pace.
- Test: [trophy shop door](https://cal-starfur.github.io/Tipsy/consistency-pass/?go=4244,15060&view=2 "Look for: one door in the trophy shop's front, opening for Tipsey (the only shop door he opens) and for anyone walking in") · [small shops](https://cal-starfur.github.io/Tipsy/consistency-pass/?go=shops&view=2 "Look for: shop doors opening for people walking through them; walkers go in through an open door, never through a shut one") · [Marina General (doctor and medic)](https://cal-starfur.github.io/Tipsy/consistency-pass/?go=18000,5670&view=1 "Look for: the main entrance glass opening for the heart run's doctor and medic")

### Doors (batch 2)
- **The mall's plaza doors (MALL_ENT)** are declared sliding pairs.
  - They part for the crowd, and for Tipsey only with the password.
  - Inside, the atrium pairs slide too; they stood painted open.
- **The mall's street bays and Palmline Tower's stores** each have their own door state. They are parted for the crowd and anyone listed, and drawn live over the front while open.
- **No pickup at a shop the kit cannot open** (Surfside Diner, Sandpiper Shoes).
- Test: [mall plaza doors](https://cal-starfur.github.io/Tipsy/consistency-pass/?go=14076,-746&view=2 "Look for: the plaza doors sliding apart for the crowd, and for Tipsey only once he has the password") · [Palmline Tower stores](https://cal-starfur.github.io/Tipsy/consistency-pass/?go=5060,-560&view=2 "Look for: each store's door opening for shoppers and staying drawn over the shopfront while open")

### Doors and a shack (d3-d5, fleet-apron; 2026-11-07)
- **Marina Parking has an attendant shack** on the pale paving west of the ENTER lane (it replaces the grey rectangle): glazed on the lane and street faces, a room inside (desk, monitor, ticket printer, chair, notice board), and its attendant standing at the east window. Two pieces (the room at the far corner, the shell at the near) so he sorts between and shows through the glass; the shack's solid is `prop: true` and the roof is tall enough (140) that the people-visibility test does not ghost him. `MARINA_SHACK`, `MARINA_ATTENDANT`.
- **d3, the harbour boat's cabin door works.** The painted door is covered live by its opening and a leaf swung out on a hinge (`boatDoorStep`, `drawBoatDoorLive`; 280 ms open, 480 ms shut), wanted open while the customer is inside or within 90 of it; he waits inside until it is open. Only where the stern is seen.
- **d4, Surfside Diner and Sandpiper Shoes have kit doors** (a door on the diner's flat wall, a glazed pair at the shoe shop's portal), so they are offered as pickups. Both stand on rear-facing block edges today, so the game shows their backs and the new fronts are not seen in play.
- **d5, Palmline Surf Co.'s stand has a board hut** (`SURF.stand.hut`), the attendant shack's size and built the same way, twice as deep, with a shop floor in its south half and a door that swings for Kai (`surfHutDoorStep`). Every so often Kai walks in and works at the counter, seen through the glass. The stand's bay moved to y 11440 to clear it. Low Tide Music's away-facing door is left as it is (Sir's call).
- Test: [Marina Parking shack](https://cal-starfur.github.io/Tipsy/consistency-pass/?go=1600,21300&view=3 "Look for: the glazed shack on the paving west of the ENTER lane, its attendant inside") · [surf stand hut](https://cal-starfur.github.io/Tipsy/consistency-pass/?go=-4900,11450&view=2 "Look for: the glazed hut with Kai going in and out of its door (daytime, 8 to 20)")

### Pops and fades (batch 3)
- **Nobody fades.** The hospital cast's fade steps are cuts at the car, door, lift or street end they stand at.
- **The ambulance and the hospital crew's van** drive in from x 26,400 and away out of sight, with no alpha.
- **Posts, not pops.** The store reps stand at their tills when not out. The Sierra Vista guard stands at his booth's door; his walk is the street's, his run a jog, his legs at his pace.
- **Seekers** come from off the screen or not at all, and ride on until out of sight.
- Test: [Marina General](https://cal-starfur.github.io/Tipsy/consistency-pass/?go=18000,5670&view=1 "Look for: no fading; the hospital's people arrive and leave by car, door or lift, and the ambulance drives in from off screen") · [Sierra Vista gate](https://cal-starfur.github.io/Tipsy/consistency-pass/?go=3128,-3700&view=2 "Look for: the guard standing at his booth's door and walking at street pace (the tower hides the booth from the south)") (Palmline Tower hides the guard booth from the south)

### Order, solids, kits (batches 4-6, first part)
- **Order.** A landmark drawn whole (Lagoon Market Hall) is keyed at the middle of what it draws, and the Pelican Harbor house at its footprint's middle; both were keyed at a far corner.
- **Solids.**
  - The police cruiser gives way and is solid when stopped.
  - Marina General's ambulances and crew van are solid standing in its drive.
- **The vehicle kit.** `vehLen` knows the fire engine, fuel tanker and shuttle (400, 420, 300).
- **The cache.**
  - Cones, planters and scooters lying where they were left are cached.
  - A seeker's parked scooter is cached.
  - Signal posts are cached, their heads live.
- Test: [Lagoon Market Hall](https://cal-starfur.github.io/Tipsy/consistency-pass/?go=10900,27700&view=2 "Look for: the hall sorting in front of and behind things correctly (it was keyed at a far corner)") · [Pelican Harbor Port Office](https://cal-starfur.github.io/Tipsy/consistency-pass/?go=-3500,-13800&view=2 "Look for: the harbor house sorting in front of and behind things correctly") · [Marina General drive](https://cal-starfur.github.io/Tipsy/consistency-pass/?go=18000,5670&view=1 "Look for: ambulances and the crew van are solid while standing in the drive (Tipsey can't drive through them)")

### Driftwood Skate Park (Flats build order area 6, "Park south leaf", as scenery; 2026-11-05)
- **Where.** Veterans Memorial Park's cell 5,6, the trail's dead-end leaf. The park fills the whole cell out to the pavement. No lawn or planting is left inside it. A chain-link fence runs round it, with a gateway north (the trail from the memorial ends there) and south (the street). One plan, `SK_PLAN`; LIB entry 'Driftwood Skate Park'.
- **Obstacles.** Each has 3 to 6 m of open flat in front of every face it's ridden from (Sir: "realistic runup area"):
  - a kidney bowl let into the pad, with blue pool tile under a steel coping;
  - quarter pipes on the north and west edges;
  - a fun box and a flat rail;
  - a flat-top pyramid in the north-west corner (it replaced the bleacher).
- **He rides them.** The bowl and the ramps are terrain (`skZ` in `coveZ`), and the grade pulls him downhill (`skGrade`, beside the soapbox ramp's). The bowl's near lip is pad drawn in the world's order, so down in the bowl his lower half is hidden. A ramp he is on goes under him.
- **People.** Four skaters in the `skater` look on a new skateboard (`skDrawBoard`). The board tilts with the slope. One carves the bowl, one goes over the fun box and up the north quarter pipe, one pumps the west quarter pipe, and one goes over the pyramid. They hold when he's in the way. They are out 7am to 9pm, latched while the park is unseen. Two flood poles are lit at night.
- **Checked.** Booted headless with no page errors. Photographed by day and night, and filmed: the skaters, the bowl and the quarter pipe. The gate on the bleacher version passed (0 new).
- Test: [whole park](https://cal-starfur.github.io/Tipsy/consistency-pass/?go=17204,21060,-1.57&view=3) · [north quarter pipe run-up](https://cal-starfur.github.io/Tipsy/consistency-pass/?go=17650,20250,-1.57&view=2) · [into the bowl](https://cal-starfur.github.io/Tipsy/consistency-pass/?go=17140,20800,-2.36&view=2) · [pyramid and north gate](https://cal-starfur.github.io/Tipsy/consistency-pass/?go=17200,19700,3.14&view=2)

### Tidewater Museum: no drive, smaller lantern light (2026-11-05)
- **Drive removed.** The museum's `drive` entry is gone (Sir: "no need for this drive way"). The footway in front of its gate is plain pavement and the kerb runs on unbroken. The gate and the walk inside the railing are unchanged.
- **Lantern light halved.** The walk's four lamp standards went from a throw of 120 to 60, and the two bronze lanterns on the entrance bay from 105 to 52 (the `lamps` list, drawn at night by `queueLandmarkLamps`).
- **Checked.** Booted headless with no page errors, photographed at night at the gate.
- Test: [museum gate](https://cal-starfur.github.io/Tipsy/consistency-pass/?go=10948,2700,0.73&view=3)

### Tidewater Museum: knock-downs, a busier door, grass, a story (2026-11-06)
- **Knocked down, and put out.** Its people can be knocked down (`ban: true` on the pocket; the walk-in staff's knock spec; kit rule W21). After one, once they are up and have had their say, the attendant walks up, speaks, and sees him out through the door; it is locked to him after (he is told why). Nothing is saved: it holds for the visit to the game.
- **People come and go.** Its visitors were three, each staying two and a half to six minutes, so the door was quiet. Seven now (pairs among them), staying one to two and a half minutes, the next in soon after (`pk.day`, a room's own pace; `walkinDayT`).
- **Grass, not grey.** The forecourt's painted grey plate is gone; the entry declares `ground:'grass'` and the ground pass lays the city's lawn (the Chapel's way). The walk, the band at the building's foot and the compass rose stay.
- **A story, designed** (not built): [The Last Bone](../museum-mission.md), waiting on your decisions (queue `s4`).
### Tidewater Museum: footprint confirmed (2026-11-06)
- **Columns no longer draw over the frieze.** The entablature and pediment are one item at the building's middle, and the world queue sorts by x + y + z, so the outer columns' capitals outranked it as he came up to the door. Its z is lifted (440 to 1040) so it draws after all six. Same change in `game/index.html`.
- **Back fence behind the back corner.** The railing runs at the building's rear (the back run and the first segment of each side) are sent back past the building's depth (z -900), so they no longer draw over its back corner.
- **Desk monitor faces the attendant.** Its screen was on the lane side, turned to visitors; it is now on the west face, toward the attendant, so from the street side of the room we see its back.
- Test: [museum door](https://cal-starfur.github.io/Tipsy/consistency-pass/?go=10948,1700,0.73&view=2)
- **Decision (Sir):** the rear of the shell is not a room. `MUS_IN.LAB` (1460 x 856) stays as the room's footprint; no code change.

### Tide Pool Elementary: a walk-in school with its people, redesigned (2026-11-06)
- **Walk-in.** The whole range (west wing, main block, east wing) is one room, 6984 x 540 (`TPE_IN`, `TPE_PK`, the LIB entry `Tide Pool Elementary Interior`), through the porch's glass doors. A corridor runs its length behind a low partition, with the rooms off it: the cafeteria and its kitchen, the library, two classrooms (desks, whiteboards, a reading rug), the entrance hall with its trophy case, the office, the nurse, the gym (court, hoops, bleachers) and the art room (easels). The three blocks, the porch steps and the canopy are the shell: they ease off as he goes in (`shell`, the generic `pocketShellK`, now used by a rim site's pieces too).
- **Hours.** 8 to 4, the place card's. The gates open with them (`rimGateStep`); the door is locked outside them. Pupils and staff come in at the bell and go home at the end of the day, the janitor (`keys`) unlocking and locking.
- **People inside (93; the front tier's 40 are listed under the depth item).** Teachers, 12 pupils at desks (sat: `s.sit`), a librarian, lunch for ten, a duty teacher, two cooks and a dinner lady, the secretary and the principal, the nurse, a PE teacher and eight pupils playing in the gym, the art teacher and four painters, the janitor, two on a hall pass, a parent and a grandfather. All in `CITY_PEOPLE` ('walk-in staff'). The kit gained `sit` (a seated post), `only` (a person keeps to some of the room's look points) and `stagger` (the school's bell).
- **People in the yard.** The crossing guard, a duty teacher, and the pupils at play (`tpeQueue`, `CITY_PEOPLE` 'Tide Pool Elementary yard'): the PE class at the hoops, tetherball and hopscotch all day; at recess, lunch and the first and last quarter hour the swings, slide, dome, sandbox, jump rope (the rope turned live), four-square and the benches.
- **Design.** A brick main block with a stone pediment and clock over the porch, quoins, stringcourse and dentils, stone-framed windows, a bellcote behind; a cream cafeteria wing under coral awnings; a taller gym (clerestory, turtle mural) and the art room under its skylights; a monument sign, a promenade, a terracotta playground, a painted basketball court, four-square, tetherball, bike racks and planters (all solids in `tpeVol`).
- **As deep as the mall, building to building.** The range is 1540 deep: its front stays where it was and its back wall is the mall's (`MALL_PLAN.BB`, -1840), so the two line up along the whole run. The foothills are notched back behind it (`hillNotchToe`; `notchTo`/`notchEase` keep the Letters on the Hill on their shelves). Inside, the old rooms are the back tier on the middle corridor; the new front tier (a second partition band, b 540..552) holds the auditorium (stage, curtain, 144 seats), the computer lab, the music room (piano, drums, a choir), two more classrooms, the garden club's greenhouse room and the science lab, with the entrance hall's spine (a touch tank, benches) running the whole depth. 93 people in all. Beside the building, the west end strip is a school garden with two portable classrooms; the east end strip a track and pitch (runners, a pickup game, a keeper).
- **Not done.** The windows do not show the room from the street (W11 `openings`).
- Test: [front gate and porch](https://cal-starfur.github.io/Tipsy/consistency-pass/?go=23468,-640&view=2 "Look for: the pediment and clock, the porch's glass doors, the gates open (8 to 4); drive in at the doors and the roof eases off") · [playground](https://cal-starfur.github.io/Tipsy/consistency-pass/?go=20700,-400&view=2 "Look for: pupils on the swings, slide and dome at recess (10 to 10:30, noon to 1)") · [gym and court](https://cal-starfur.github.io/Tipsy/consistency-pass/?go=26800,-400&view=2 "Look for: the hoops, the court's paint and the pupils playing")

## Checked and left as they are
- **The mall junction Sir circled** is fixed on `main` by the hospital session's 2026-10-29 clip (`shopsCut`). The mall body is still one 9,384-long image (U1l); splitting it waits for a fault that shows.

## Build queue
The work to do next, and the work built but not yet tested, is in `build_queue.md` (the readable plan) and `build_queue.json` (what the scheduled sessions read), both on this branch. `python3 tools/queue.py next` gives the next item. Test results and fixes from the scheduled look tests are in `docs/state/TEST_FINDINGS.md`. The test sheet the look tests use is `tools/test_sheet.json`.

## Still to do (each needs new art or a bigger change; Sir to see first)
- **Working doors** for the Seabreeze Ballroom (its `doorF` must record itself). (The Animal Shelter's, the harbour boat's cabin, Surfside Diner's and Sandpiper Shoes' are done.)
- **Tide Pool Elementary in pieces** (U1k/U1c), and Palmline Tower's key and vol: its forecourt is in its one image.
- **Props:**
  - collision taken from the art: lamp, hydrant, palm now a disc the size of the art (`OW_D.hz*`, `propWall` in the hazard loop; built, awaiting test). Bin's loop clearance and the bench capsule (O12) still to do;
  - keep-clear of doors and mats;
  - static shadows;
  - the pier and harbour still props cached.
- **Vehicles:**
  - one `vehicleSolid(kind)` for the ten hand-copied parked-car boxes;
  - riders' obstacle list and clearance;
  - parking rows cached, with one bay size;
  - the showroom cars on `gameCar`;
  - the route car out of the far lane.
- **People:**
  - legs driven by distance walked (all 47 `walkSin` calls);
  - the unlisted populations added to `CITY_PEOPLE`;
  - the two meet spot pickers merged.
- **Sir's calls left open:** the pier lamp and tall palm sizes, and the traffic sprites' wheels.
