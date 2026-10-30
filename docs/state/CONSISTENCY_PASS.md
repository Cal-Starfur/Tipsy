# The consistency pass (2026-10-30)

This pass works on the `consistency-pass` branch. Its test page is https://cal-starfur.github.io/Tipsy/consistency-pass/: `main`'s `consistency-pass/` folder, built from a gated commit, with saves kept under their own `tipsy-consistency:` prefix. The live game and `main`'s game files are untouched until Sir says "push".

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

### Doors (batch 2)
- **The mall's plaza doors (MALL_ENT)** are declared sliding pairs.
  - They part for the crowd, and for Tipsey only with the password.
  - Inside, the atrium pairs slide too; they stood painted open.
- **The mall's street bays and Palmline Tower's stores** each have their own door state. They are parted for the crowd and anyone listed, and drawn live over the front while open.
- **No pickup at a shop the kit cannot open** (Surfside Diner, Sandpiper Shoes).

### Pops and fades (batch 3)
- **Nobody fades.** The hospital cast's fade steps are cuts at the car, door, lift or street end they stand at.
- **The ambulance and the hospital crew's van** drive in from x 26,400 and away out of sight, with no alpha.
- **Posts, not pops.** The store reps stand at their tills when not out. The Sierra Vista guard stands at his booth's door; his walk is the street's, his run a jog, his legs at his pace.
- **Seekers** come from off the screen or not at all, and ride on until out of sight.

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
