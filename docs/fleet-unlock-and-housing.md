# The Fleet: how it is unlocked and where it is housed (plan, 2026-11-11)

Written for Sir after the fleet polish: every vehicle is drawn, wears his paint and has its own hit box (boats now have their own water dynamics too). What is left is the game around them. This does not replace `docs/fleet-redesign.md` (sections 3 to 5 stand: bays, the unlock ladder, the fleet in the world); it says where each of those stands today, what has moved since, and what to build and decide next. Nothing here is built.

## 1. Where it stands

**Unlocks.** `FLEET_TESTING` is on, so every vehicle is open. With it off, the ladder in section 4 of the redesign decides. 6 of its 16 missions exist:

| Built (6) | Unlocks |
|---|---|
| Lighthouse Run | delivery drone |
| Minding the Shop | Gideon |
| Night Watch (after dark) | patrol robot |
| The Getaway | robotaxi |
| Sunset Salute (dusk) | shuttle, street sweeper |
| Letters on the Hill (dusk) | heavy-lift drone |

| Not built (10 missions, 10 vehicles) | Unlocks |
|---|---|
| Number 4 Builds a Winner | warehouse robot |
| Beach Fest | delivery pod |
| Contest Day | garbage truck |
| Topping Out | dump truck, forklift |
| Moving Day | semi |
| Air mail to Mirador | delivery plane |
| Fire Watch | air taxi |
| Three lookout supply runs | cargo drone |
| Harbour survey | survey boat |
| Feeding Time | water taxi |

The cargo bot and courier bot are open from the start. Saves: unlocks derive from `missionsCompleted`; each unlocking mission id must be in `TS_MISSIONS` (`tpcatalog.ts`) to reach the Reddit build. The six built ones are there.

**Housing.** Every bay is switched off (`FLEET_BAYS_BUILT = false`, Sir 2026-11-05: "placed very poorly"). Defined, waiting to be re-sited (`FLEET_HALL_DEFS_ALL`): F2b boathouse (harbor basin), F3s and F3t road bays (Marina Parking), F4 heavy hall (airfield fuel farm), F5 site shed (Lagoon Market Hall), F7h hangar (Sun Deck Airfield). With no bay a vehicle starts at a charging station. Boats are now put on the harbor basin off the boathouse's front instead (`fleetBoatLaunchAt`). The planes have no hall and no kit at all (`planeHangar` is named in `FLEET` but not in `BAY_SPEC`), and no flight controller (P9).

**Fit.** The polish changed sizes since the halls were drawn. Checked against the defined lanes:

| Vehicle | Size (long x wide) | Lane today | Fits? |
|---|---|---|---|
| Air taxi | 392 x 392, 230 tall | hangar lane 440 | yes |
| Delivery drone, heavy-lift | 240, 328 | hangar lanes 360, 480 | yes |
| Survey boat | 560 x 202 | boathouse lane 300 | yes |
| Water taxi | 880 x 317 | boathouse lane 400, hall 1008 deep | yes |
| Semi, garbage, dump, sweeper | 780, 410, 420, 300 long, 108 wide | heavy hall, 210 per lane, 1656 deep | yes |
| Shuttle, robotaxi, pod | 380 / 214 / 196 long | Marina road bays | to re-check against the first deck's 150 clear (the shuttle is 176 tall) |
| Delivery plane | 392 x 660 span | none | needs a lane of 700+ |
| Cargo drone | 568 x 840 span | none | needs a lane of 900+ |

**Ambient fleet.** Section 5 of the redesign (unlocked vehicles working in town) is not built: the `ambient` field on each `FLEET` entry is data only.

## 2. The plan

**Principle: housing and unlocking are one thing.** A vehicle's bay stands in the world from the start, shuttered and dark; finishing its mission lights the lane, rolls its door up for the first time and the vehicle pulls out. That is the "town fills with your fleet" idea: you can see what is still to earn.

**Phase A: re-site and switch on the bays, few at a time.** Not all six at once (that is what went wrong on 2026-11-05).
1. **Boathouse (F2b)**, since boats now live on the water: it gives the water taxi and survey boat their slipway start, and the dynamics already work from there. Also removes today's "launch spot in the basin".
2. **Sun Deck Airfield Fleet Yard**: F7h hangar (air taxi, drones) plus F4 heavy hall and a new plane lane set. One compound, one gate, the airfield already being the fleet's air home.
3. **Marina road bays (F3)** for the robotaxi, pod and shuttle, after the height check.
4. **Site shed (F5)** last; it is the forklift's only home.
Each: one kit change at a time, a screenshot in the world, and a perf pass (cached halls, only the doors and the vehicle live).

**Phase B: the planes' hangar.** A `planeHangar` kit (lanes 700 and 900 wide, big doors) beside F7h, and a taxi route to the field. Held until the planes have a flight controller (P9); until then the two planes stay parked in their lanes, door shut, unlocked but not drivable.

**Phase C: the unlock ladder, mission by mission.** Turn `FLEET_TESTING` off once three missions that unlock something are playable (the redesign suggests Lighthouse Run, The Getaway, Night Watch: all three are built, so the lock can flip now). Locked cards read "Coming with <mission>" for the ten that are not built. Build the unbuilt missions in the order of what they hand over and what is ready:
1. Harbour survey and Feeding Time (survey boat, water taxi: dynamics, water-only and boathouse all ready).
2. Fire Watch (air taxi; the door and rider drawing exist, the riders are not wired).
3. Air mail to Mirador, Three lookout supply runs (planes; after P9).
4. Number 4, Beach Fest, Contest Day, Topping Out, Moving Day (the ground vehicles).
Each mission id goes into `TS_MISSIONS` with it.

**Phase D: the ambient fleet** (redesign section 5), per class as each unlocks, always the vehicle he drives replacing one of its kind. Water first (the taxi crossing the harbor, the survey boat in the basin), then air corridors, then road schedules.

## 3. Decisions for Sir

1. **Flip the lock now?** Three missions are built; ten vehicles would show "Coming with ...". Or stay unlocked a while longer.
2. **One Fleet Yard at the airfield, or a base per hood?** The redesign spreads bases over every hood; only the Flats exists. This plan builds the Flats' four only.
3. **Boats: build the boathouse next** (Phase A.1), or keep launching from the basin?
4. **Mission order** in Phase C: boats first (ready) or air taxi first (riders)?
