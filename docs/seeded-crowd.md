# Seeded crowd: every person tied to the daily seed (plan, 2026-11-06)

Sir's call: all the people tie to the daily seed (date + ladder rung, `routeSeedStr`), **same person, same place and time for everyone**.

## Where it stands
- Seeded already: the route's own walkers (`route.hazards`, the route roll), the delivery's lifeguard / boat customer, the crime scene's officers; the city's frontage walkers come off the fixed `CITY_SEED`; mission and staff people are fixed characters.
- Live, random, near-him-only (`Math.random`, ~55 rolls in `updateCrowd` and its spawners alone): the shoppers (`updateCrowd`, SHOPPERS), the houses' people (`spawnHomes` / `spawnResident`, HOME_FOLK), scooter trips (`scootTrip`), the seekers (`updateSeekers`), the errand drivers (`updateErrands`), the food trucks' customers, the strand and boardwalk people, the mall crowd, the derby and ballroom guests. Each spawns when he is near, on a session clock, with paths that end at off-screen points (the camera decides), and takes parked cars that nobody else has claimed. None of that is the same twice.

## The mechanism (one for all)
1. **A world clock.** UTC ms: `worldMs(t) = crowdEpoch + scene.time.now`, `crowdEpoch` taken at load. Everything below is a function of it, never of the session.
2. **A visit schedule per door.** For each shop door, house and any other stand: time slots (a visit window ~30-90 s); for slot k, `rng = mulberry32(hash(seed | doorKey | k))` decides whether a party visits, who (n, looks, personal seeds, pace), by foot / car / scooter, which way along the pavement, how long inside. No `Math.random`, no `offScreen`: the in and out points are a fixed distance along the pavement (the paveRoute's own corner), so a visit is the same wherever the camera is.
3. **Lazy people.** A party exists (a `shopperAt`-style record with `t0` = its scheduled start on the world clock) only while it is near him, created when its path first enters the near zone from outside it; whoever is already out when he arrives is placed where the schedule has them (the start of a session, a teleport: one arrival, not a pop each frame). The record is the same one `shopperAt`, knocks, bubbles and CITY_PEOPLE already read.
4. **Cars.** A kerb car is claimed by a visit's key (`car.claim = visitKey`), the visit that wants it decided by the schedule, so two parties never want the same car and the same car always leaves with the same people.
5. **Houses** (HOME_FOLK) are a slotted schedule too: a household's people out / home flips by the same hash, so the same person is out at the same time of day.

## Order of work (queue group "People: seeded crowd")
- **sc1** the world clock, the slot scheduler and the shoppers (shop doors): the pilot, checked by a headless double run (two boots, the same seed and world time, the same people at the same places every second).
- **sc2** residents (houses, scooter trips, dog walkers).
- **sc3** seekers, errand drivers, the food trucks' customers.
- **sc4** the strand, boardwalk, almshouse court and the other populations that roll live.
- **sc5** the census: a headless "same seed, two boots" diff over every CITY_PEOPLE group, so a new unseeded population is caught.

## Risks
- Visits that depend on live state today (a parked car taken, a door busy, he is standing in the way) become schedule decisions; some visits will now be skipped or shifted by slot rather than by what happens to be free. That is the cost of "same for everyone".
- Pop-in at arrival (people already out when he gets there): placed on the schedule, not faded; the first frame after a teleport shows the street as the clock has it.
- `max` (8 shoppers at once) stops being a live cap; the slot rates are tuned so the near zone averages about what it does now.

## sc6: seeded traffic (added 2026-11-06)
sc3 seeded who goes on an errand and what they do, but not whether a car is at the site: a car's position is its loop clock minus `hold`, and `hold` comes from live yielding (spacing, signals, Tipsey), so it differs per player.
- Loop clocks on `worldMs`; `hold` applies only to cars near him and decays to zero once a car is far and out of sight, so it is back on the shared schedule before anyone sees it.
- Errand starts only where the schedule has the car (the seeded roll from sc3); food-truck post-up sessions become scheduled events.
- Risk: on the shared clock, cars on shared streets can overlap (what `hold` was hiding). Stagger loop offsets, or check no two schedules collide.
