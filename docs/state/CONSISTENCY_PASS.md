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
- Test: [trophy shop door](https://cal-starfur.github.io/Tipsy/consistency-pass/?go=4244,15060&view=2) · [small shops](https://cal-starfur.github.io/Tipsy/consistency-pass/?go=shops&view=2) · [Marina General (doctor and medic)](https://cal-starfur.github.io/Tipsy/consistency-pass/?go=18000,5670&view=1)

### Doors (batch 2)
- **The mall's plaza doors (MALL_ENT)** are declared sliding pairs.
  - They part for the crowd, and for Tipsey only with the password.
  - Inside, the atrium pairs slide too; they stood painted open.
- **The mall's street bays and Palmline Tower's stores** each have their own door state. They are parted for the crowd and anyone listed, and drawn live over the front while open.
- **No pickup at a shop the kit cannot open** (Surfside Diner, Sandpiper Shoes).
- Test: [mall plaza doors](https://cal-starfur.github.io/Tipsy/consistency-pass/?go=14076,-746&view=2) · [Palmline Tower stores](https://cal-starfur.github.io/Tipsy/consistency-pass/?go=5060,-560&view=2)

### Pops and fades (batch 3)
- **Nobody fades.** The hospital cast's fade steps are cuts at the car, door, lift or street end they stand at.
- **The ambulance and the hospital crew's van** drive in from x 26,400 and away out of sight, with no alpha.
- **Posts, not pops.** The store reps stand at their tills when not out. The Sierra Vista guard stands at his booth's door; his walk is the street's, his run a jog, his legs at his pace.
- **Seekers** come from off the screen or not at all, and ride on until out of sight.
- Test: [Marina General](https://cal-starfur.github.io/Tipsy/consistency-pass/?go=18000,5670&view=1) · [Sierra Vista gate](https://cal-starfur.github.io/Tipsy/consistency-pass/?go=3128,-3700&view=2) (Palmline Tower hides the guard booth from the south)

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
- Test: [Lagoon Market Hall](https://cal-starfur.github.io/Tipsy/consistency-pass/?go=10900,27700&view=2) · [Pelican Harbor Port Office](https://cal-starfur.github.io/Tipsy/consistency-pass/?go=-3500,-13800&view=2) · [Marina General drive](https://cal-starfur.github.io/Tipsy/consistency-pass/?go=18000,5670&view=1)

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

## Checked and left as they are
- **The mall junction Sir circled** is fixed on `main` by the hospital session's 2026-10-29 clip (`shopsCut`). The mall body is still one 9,384-long image (U1l); splitting it waits for a fault that shows.

## Still to do (each needs new art or a bigger change; Sir to see first)
- **Working doors** for the Seabreeze Ballroom (its `doorF` must record itself), the Animal Shelter, the harbour boat's cabin, Surfside Diner and Sandpiper Shoes.
- **Tide Pool Elementary in pieces** (U1k/U1c), and Palmline Tower's key and vol: its forecourt is in its one image.
- **Props:**
  - collision taken from the art (lamp, hydrant, palm, bin, the bench capsule);
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
