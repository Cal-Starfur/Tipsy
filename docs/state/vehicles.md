# Vehicles: systems map, norm, outliers (reader report)

Source: `/home/user/Tipsy/game/index.html` (118,916 lines). Read-only. Line numbers are from the current file.
Contract: `docs/kits/vehicles.md` (V1–V16), `docs/LOOK_RULES.md` §6b.
Legend: **[V]** verified in code; **[U]** unverified (inferred, needs a screenshot or runtime check).

---

## 0. Shared kit (what every system ought to go through)

| Piece | Where | Notes |
|---|---|---|
| `CARC` 225 × 90, wheel 24 | 6277 | the car's size. `CAR_BODIES` (6370) lets bodies change length (crewcab 272, microcar 150 …) |
| `vehLen(kind)` | 35387 | length by kind (VAN_KINDS / RIGS / CAR_BODIES). No entry for firetruck/fueltruck (they fall back to 225) |
| `carPalette(kind)` / `CAR_COLORS` (12) | 6677 / 6346 | the paint. drawCar/drawVan/drawRig… pick it with `colorSeed`, or **from (x,y) when colorSeed is null** (89243, 89683, 91110 …) |
| `drawProp(g, kind, …)` | 92832 → dispatch 94250–94276 | the single funnel: x-ray, then drawCar/drawVan/drawRig/drawWorkTruck/drawJet/drawAircraft/drawPlane/drawHeli/drawPlant/drawAvPod/drawBot |
| `vehKit(g,x,y,z,fdir)` | 90602 | normals, prisms, chamfer, wheels, shadow (`drawVehicleShadow`) |
| `LIB.gameCar(a,b,z,fdir,seed,kind)` | 39990, art set by `LIB.setCarArt` 73039 | a landmark/shop entry parks **drawProp's** car inside its own cached art, handedness fixed (`mir`) |
| `trafficSprite` | 92788 | moving traffic on a straight drawn from an LRU image cache (48 headings, max 160) |
| `trafficWorldAt` / `trafficActive` | 102667 (activeR 9000, view ~3584) | traffic pose is pure in t: cars are simulated well off screen, so they drive into view |
| `carAxisPoint(wp, fc, px, py, len)` | 6305 | the car capsule used by Tipsey's collision and the tip test |
| `updateTrafficSpacing` | 102456 | traffic↔traffic yield, plus Tipsey, plus `hospCastCarsWorld` obstacles |
| `updateRescueVanTraffic` | 102601 | crew van↔traffic yield (only `_rescueVan`) |
| `updateRiderTraffic` | 102087 | scooter riders↔traffic yield |
| `bcDraw(g, key, x, y, fn)` | 77872 | the building cache. Still vehicles must go through it |

---

## 1. Systems, one by one

### S1. City traffic (`route.trafficFleet`)
- **Code:** build `buildCityTraffic` (CITY_TRAFFIC 35434, TRAFFIC_MIX 35370); active set `trafficActive` 102667; spacing 102456; queue 80825–80916; collision 11061–11086 (stopped cars only, capsule with `tr.len`).
- **Appear/leave:** [V] pose is a pure function of t, simulated within Manhattan 9000 of Tipsey (view ~3584), so cars **drive in from off screen**. Drawing culls only by `visProp`, after the per-frame dedup (80861–80875: parked dedup first, then cull, moving cars never deduped: "cars cut in and out" fix).
- **Art:** `drawProp(kind)`; on a straight, `trafficSprite` image (80903–80911, "Sir, 2026-10-12: when vehicles make turns now they have a tick"); through a corner, live.
- **Colour:** `tr.colorSeed` (identity). [V]
- **Collision:** stopped cars are solid capsules (`carIsStopped`, `carAxisPoint(..., tr.len)`); moving ones go through the tip test. Width is the fixed `OW_HZ_R.car` (8180: 50) for every kind. [V]
- **Yield:** each other, Tipsey (following cone), errand cars and `hospCastCarsWorld` (porter's car, ambulances only while off the podium). [V]
- **Depth:** `x+y`; in a garage on an errand `groundGarageDepth`. [V]
- **Cache:** moving → sprite (cached image) or live. Census: 80909 sprite x77 vs 80910 live fallback **x422** — most straight-running cars fell back to live in that run [V counts, U cause: probably LRU churn — up to ~40 kinds × 12 paints × 4 headings ≫ `TRAFFIC_SPRITE.max` 160, then `bc.budget <= 0` returns false at 92798].

### S2. Errand cars (`tr.errand`: drive-thru, lot visits, kerb visits, food trucks, Strand garages, kerb departures)
- **Code:** sites `errandSitesOf` 36600ff, `errandKerbSites` 36574; pose `trafficWorldAt` errand branch 36380–36394; finish `errandFinish` 36420; Strand garage door `queueNssGarages` 78081 / `drawNssGarageOpen` 78095.
- **Appear/leave:** [V] a traffic car takes the errand from its lane and rejoins a loop; inside a Strand garage it is hidden **past the door line** and the garage draws it clipped through its opening (78125–) — no pop. Kerb departure `kerbDepart` 101969 swaps the parked kerb car for an **unseen** traffic car (off screen or > 5000 away) of the same kind/paint: seamless.
- **Art/colour:** `drawProp`, `tr.colorSeed`; food trucks live (hatch data). [V]
- **Collision:** as traffic (stopped = solid). Traffic treats errand cars as obstacles (`a.tr.errand` never a follower). [V]

### S3. Kerb-parked cars, The Flats (`KERB_PARK`, `kerbCarsOf`)
- **Code:** layout 16993–17054 (Sir 2026-10-06); draw `queueKerbCars` 85759; collision owStep 11102–11108; rescue spot test 11629, stand-up test 12663; returns 101620; derby fill `derbyKerbFill` 28109 / tidy 28127.
- **Appear/leave:** [V] layout decides (seeded per slot, drives and non-road dropped). Leave by `kerbDepart` (drive off). Return only when Tipsey is > 4500 away and 90 s passed (101620: distance, not a screen test). Derby fill adds cars to free slots **without a visibility test** (28113–28124) [U whether that can happen on screen].
- **Art:** `drawProp(c.kind)` + `drawKerbStoneOver` on near kerbs, kinds car/truck/van. Colour `c.colorSeed`. [V]
- **Cache:** `bcDraw(c.key = "kerb|i,j|edge|k")` (census 85766 `kerb` x642). [V] ✔
- **Collision:** capsule `carAxisPoint(v, v.fdir, …)` **without `len`** (11104) — fine today (car, pickup, van are all 225). [V]
- **Clearance:** inner body edge 248.6 off road centre vs traffic lane body edge 165: **83.6 ≈ the approved 84**. [V]

### S4. Route parked car (`route.props` kind car/truck)
- **Code:** spawn 38590–38594 (one, 50 %, at `roadOffset = -T2*1.5 = -138` from the road centre line); draw 80819–80823 + 80886–80894 (`pcar|` cache).
- **Appear:** layout. **Colour:** `colorSeed: null` → seeded from position. **Cache:** `bcDraw("pcar|…")` ✔.
- **Collision:** **none** — nothing but the draw reads `route.props` cars (80820, 81172) [V by grep].
- **Placement:** -138 off the centre line is inside the opposite traffic lane (lane centre 120, bodies 75–165) and traffic spacing does not see it [V numbers; U on screen].

### S5. Cut-edge parking rows (`drawParkingRow`, permanent cut lots / police lot)
- **Code:** `parkingStallsAt` 13757 (stall 130 × 275, 2–3 stalls); `drawParkingRow` 83975; queue 80631–80637 (cars pushed into `topLayer` **from inside a draw callback**), drawn 81410–81412.
- **Appear:** layout (rng from edge seed). **Art:** `drawProp(c.kind)`, `colorSeed` absent → position. [V]
- **Cache:** **live every frame**: stripes `lineBetween` into g and each car `drawProp` live (census 80633 live x12) — no `bcDraw`. [V]
- **Collision:** no car hitbox [V by grep]; the edge's commercial footprint rectangles (`commercialFootprintsOf` 7985, no cut test) probably still stand there [U].

### S6. Landmark / shop lots and garages via `gameCar` (cached inside LIB art)
| Place | Draw | Solids |
|---|---|---|
| Maritime Mall Parking (GARAGE_PLAN) ground stalls | 65340–65342 | 29235 ±48×±112 |
| …roof deck (`garageRoof`) | 65409 | 29253 ±48×±114 |
| …level 2 | 65409 | 29268 **re-derives** the draw's hash (`i*7+131+3`) |
| Marina General: car park / garage ground / deck | 44055–44058, 44190–44193, 43567–43570 | 43400, 43382, 44099, 31975 (hosp deck), 31933 (marina deck) |
| Pelican Drug lot | 61509–61511 | 61151 |
| Dune lot | 61114–61116 | 60780 |
| Sun Deck Airfield: 9 planes, fire engine, fuel truck, tugs, forklift | 44685–44742 | 44380–44398 hand-made per part (body, wing, engines, wheels) |
| Saltwater Brewing forklift + flatbed | 59026, 59030 | — [U] |
| Crate Yard Building Site | 66026 | [U] |
- **Appear:** layout (hash per stall). **Colour:** seed `n*2654435761`. **Cache:** part of the entry's cached pieces (census `hs|`, `pl|`, `rim|`, `garage|`). **Sir-approved** ("A PARKED CAR IS ONE OF OURS", Sir 2026-10-06, 65403; 39973).
- **Collision:** the ±48 × ±112 box (96 × 224 vs CARC 90 × 225), hand-copied **10 times** (29235, 29253, 29268, 31933, 31975, 43382, 43400, 44099, 60780, 61151). It assumes a car facing along b and kind car/pickup.

### S7. Crew van (`RESCUE_VAN`, `_rescueVan`)
- **Code:** plan `rescueVanPlan` 11707 (`reach = max(1600, viewport/K*0.7)` 11653), pose `rescueVanAt` 12218, yield `updateRescueVanTraffic` 102601 (Sir 2026-10-09), queue 80833–80839, collision only while parked (11092–11101).
- **Appear/leave:** drives in from off screen down the centre line, pulls to a clear kerb slot (clear test against kerb cars), leaves the same way. ✔ Live (moving). Parked = capsule. Exemplar "crew van giving way" (126927d).

### S8. Police cruiser (`POLICE_CALL`, `_police`)
- **Code:** 101500–101563; uses `rescueVanAt` (same drive); queue 80850–80853 (`drawProp("policecar")`).
- **Differences:** **not** in `updateRescueVanTraffic` (only `_rescueVan`) → no yield to traffic or riders; **no collision** in owStep. [V by grep]

### S9. Ambulances (`HOSP_AMB_RUN`, Sir 2026-10-29)
- **Code:** plan 29936–29984, pose `hospAmbVanAt` 29987–29995, draw 81906–81909 (hazVQ, `withAlpha`).
- **Appear/leave:** **fades** in over 1200 ms at A.from (23500, 6072) and out at A.to (23900, 3312): `alpha: min(1, tt/1200, (T.end-tt)/1200)` (29994). V2 breach (known flaw).
- **Yield:** never yields; traffic waits for it only when it is > 300 off the podium (30242). **Collision:** none for Tipsey, including the minutes it stands in the bay (old bay solids removed, 43398–43399) [V by grep].
- **Cache:** live the whole time, also while standing (T.park..T.leave ≈ minutes).

### S10. Porter's patient's ride (`HOSP_CAST_CAR`)
- **Code:** car spec 29887 (from 20300 → kerb 18600 → to 16700, y 5950), pose `hospCastCarAt` 30228, draws 77670–77671 (pocket view) and 81820–81822 (`drawCar` directly, not drawProp).
- **Appear/leave:** **pops** in at x 20300 and out at x 16700, ±1700 from the kerb spot (`return null` outside `T.in[0]..T.out[1]`, 30230) [V code; U whether that is on screen at every zoom].
- **Yield:** traffic waits behind it (30238–30240); it never yields. **Collision:** none for Tipsey. **Cache:** live, also while parked. Seed from the cast index (identity) ✔.

### S11. Mall / hospital security van (`MALL_JAIL.van`, `HOSP_JAIL.van`)
- **Code:** set 27208 / 33149, motion `mallJailVanA` 27258 (`0.00012·e²`), drop at 27240 (`t - V.t0 > 5200` → `J.van = null`), draw 81911–81914.
- **Appear/leave:** stands at the kerb when the hand-off ends (behind the pocket transition); **pops out** after 5.2 s, about 1,825 units down the street [V maths; U on screen]. No yield, no collision, live.

### S12. Scooter riders (`STREET_RIDER`) and standing scooters
- **Code:** riders `ridersActive` 100754, motion `updateStreetRiders`, yield `updateRiderTraffic` 102087, draw 81089–81150 → `drawScooterRider` 87561 (vehKit, census 81147 x262).
- **Appear:** same pure-in-t loops as traffic (activeR 5000). Colour/brand from `rd.seed` ✔. Wheel phase from `trS` ✔.
- **Clearance:** lane 222 off the centre vs kerb-car inner edge 248.6 → ~27 to the body before the rider's own width; V6 wants 84. Riders do not test kerb cars, the crew van, police, ambulance or porter's car (only `trafficActive`).

### S13. Boats (`Harbor Boat` LIB entry, `BOAT_SC` 2)
- **Code:** fleet `_harborFleetFor`, queue 78533–78545 (`hb|boat|…` cache, census x12), trailer 78708, fleet avatar 95098–95104.
- Moored only, seeded by date ✔; cached ✔; depth keyed at the near/far end (78537–78541). Art is the LIB kit, not `vehKit` (accepted by §6b, "BOAT_SC").

### S14. Aircraft
- Only the airfield's still planes (S6) and the showroom / fleet avatar. Nothing flies in the city. `drawJet` 92400, `drawAircraft` 92234, `drawPlane` 92058, `drawHeli` 91899 are reached through drawProp.

### S15. Fleet avatar (Tipsey as a vehicle)
- `drawFleetAvatar` 95074: draws into `this.g` (the robot's layer; same as `drawBotBody`). Wheel phase from speed × dt ✔. Long bodies via `fleetBody()` 6751 (capsule, `hw` fixed 52 unless an AV pod).

### S16. Vehicles painted inside shop/landmark art **without** the game car
- **Palmline Motors** showroom: `flatsGameCar` 41857 with `FLATS_CR` (41734) and `FLATS_CAR_COLORS` (41738, 4 colours), called 61812/61883 — a forked car (its own wheel ring, its own palette).
- **Palmline Garage**: the "truck in the open bay" is `box()` slabs (53834–53842).
- **Tidewater Green Park derby karts**: `kart` / `kartS` 71717–71741 (own art; probably fine as karts are not road vehicles).
- **Car carrier** cargo: drawCar via drawRig 91447 ✔.

---

## 2. THE NORM

What most systems do, and what Sir has signed off:
1. **One art:** every road vehicle is `drawProp(kind)` → kit drawer on `vehKit`; inside a building's art it is `LIB.gameCar` (Sir 2026-10-06, "it has the wrong kind of cars not our cars from the game"; 65403 "A PARKED CAR IS ONE OF OURS").
2. **Size from constants:** CARC 225 × 90 plus `vehLen(kind)`.
3. **Colour from identity:** `colorSeed` (traffic, kerb, riders, lots via stall n). Position seeding only as the fallback.
4. **Never pop:** moving vehicles are simulated off screen (pure in t, activeR 9000) and **drive in and out**; a car into a garage goes through the door clipped (78118–); a kerb car leaves by becoming an unseen traffic car (101963–101999); nothing is deduped or faded at draw time (80855–80875 "cars cut in and out", Sir 2026-10-13 "disappearing and appearing all at once").
5. **Still = cached:** kerb cars `bcDraw("kerb|…")`, route car `bcDraw("pcar|…")` (2026-10-11 note at 80884), lot/garage/airfield vehicles inside the entry's cached pieces, boats `hb|boat|…`. Moving on a straight = sprite image; live only in a corner, a ghost or with live data.
6. **Collision:** standing car = `carAxisPoint` capsule (traffic stopped, kerb, crew van parked) or the ±48 × ±112 lab box in lots; moving car = tip test.
7. **Yield:** traffic yields to traffic, Tipsey and errand / cast cars (`updateTrafficSpacing`); the crew van and riders have their own pass (Sir 2026-10-09: "not be able to go through other cars").
8. **Depth:** `x + y` of the centre (garage floors: `groundGarageDepth` / `garageDeckDepth`).
9. **Clearance:** moving lane to parked bodies 84 (kerb layout hits 83.6).

---

## 3. OUTLIERS (system × property)

| # | System × property | Lines | What you see | Fix (reuse) | Risk |
|---|---|---|---|---|---|
| O1 | **Ambulance × fade (V2)** | 29994, 81908 `withAlpha` | ambulance ghosts in/out on the south and north streets | Start/end the van paths off screen: extend `vin`/`vout` (29959–29960) to points `reach` off screen (as `rescueVanPlan` 11653), drop `alpha` and `withAlpha` | Low. The paramedics' timetable keys off `T.park`, so a longer `vin` shifts every step; rebuild T from the longer path (it already does) |
| O2 | **Ambulance × collision and yield (V3, V6)** | 43398 (solids removed), no owStep use, 30242 | Tipsey drives through a standing ambulance for minutes; ambulance drives through traffic and riders in the drive and street | While `!V.moving` push `{x,y,fdir:V.th/(π/2)}` into the owStep capsule loop (copy `solidVan`, 11092); add it to `updateRescueVanTraffic`'s pattern as a slowed clock (`HOSP_AMB_RUN` would need an offset clock like `rescueClock`) | Medium: the run is one global clock shared with the people; slowing the van means slowing their scripts too |
| O3 | **Police cruiser × yield + collision (V6, V3)** | 101505, 102601 (only `_rescueVan`), owStep 11092–11101 | the cruiser crosses cars at junctions and is non-solid when stopped | Generalise `updateRescueVanTraffic(v)` to take the van and call it for `_police` too; add `_police` to `solidVan` | Low (same pose function) |
| O4 | **Porter's car × pop (V1)** | 29887, 30230 | car appears at x 20300 and vanishes at 16700 (1700 either side of the kerb) [U on screen] | Run in/out from off screen like `rescueVanOnStreet`, or make it a real kerb errand (`kerbDepart`-style: borrow an unseen traffic car, `errandPath` to the kerb, `errandFinish` back into the loop) | Low–medium (timetable `car:'in'` 5200 ms must stay) |
| O5 | **Porter's car × collision, cache, art funnel** | 77671, 81822 (`drawCar` direct), no owStep use | Tipsey drives through it while parked; parked = live redraw every frame; no x-ray | Use `drawProp`; when `!c.moving` draw through `bcDraw("pcast|"+kind+"|"+x+","+y)`; add to owStep capsules | Low |
| O6 | **Security van × pop (V1)** | 27240, 33149 | van gone after 5.2 s, ~1,825 down the street [U on screen] | Keep it until `visProp("tipseyvan")` is false, or until `a > reach` | Low |
| O7 | **Route parked car × collision + placement (V3, V6)** | 38590–38594, 80820, 80886 | car parked in the far traffic lane (−138 vs lane 120); traffic passes through it; Tipsey drives through it | Place it at `KERB_CAR_OUT` on its kerb (or drop it: the Flats has `KERB_PARK`); push it into `pos` in `updateTrafficSpacing` as an errand obstacle (as `hospCastCarsWorld` does, 102479); add to the owStep capsule loop | Low. Rail mode still reads `route.props` for clearing (106250) |
| O8 | **Cut-edge parking rows × cache (perf rule)** | 80631–80637, 81410–81412, 83975 | every lot's stripes and 2–3 cars drawn live every frame | Queue each car as its own `bcDraw("prow|"+x+","+y+"|"+fdir)` item (as `queueKerbCars` 85765) and the stripes as one ground item; also stop pushing into `topLayer` from inside a draw fn (build the car list at queue time from `parkingStallsAt`) | Low. Crime lot passes `forceN` and must keep zero civilian cars |
| O9 | **Cut-edge parking rows × collision + bay size (V3, V8)** | 13757 (130 × 275), no hitbox | cars with no hitbox (or an invisible shop footprint) [U]; bays not 120 × 260 | Reuse the lot pattern: solids from the same stall list (`parkingStallsAt`) feeding a `vehicleSolid`; stallW `CARC.wid+30`, depth 260 | Medium: `parkingStallsAt` drives `findCrimeSite` and the police lot ("all 107 fit the 4-bay row"), so resizing re-picks sites |
| O10 | **Parked-car box × hand-copied 10× (V3)** | 29235, 29253, 29268, 31933, 31975, 43382, 43400, 44099, 60780, 61151 | none today (all car/pickup along b); breaks the moment a van/SUV/crewcab or an a-facing car parks | Write `vehicleSolid(kind, a, b, fdir)` → `{poly, h}` from `vehLen(kind)`, `CARC.wid`, fdir; replace all ten. Level 2 (29268) should read the draw's stall list, not re-derive its hash | Low; pure refactor. Box is ±48/±112 at most sites but ±114 at 29253/29268/31975 — pick one |
| O11 | **Kerb capsule × no length (V3)** | 11104, 11630, 12665 | fine today; wrong if KERB_PARK.kinds gains a longer kind | pass `vehLen(v.kind)` to `carAxisPoint` | Trivial |
| O12 | **Traffic sprite × frozen wheels (V15)** | 92809 (`wheelPhase` null in the sprite) | wheels don't turn on any car on a straight | Accept (perf) or key 2–3 wheel phases into the sprite; Sir's call | Perf cost |
| O13 | **Traffic sprite × occupant looks (V12/V9)** | key 92796 (palette index only) vs drawCar occupants seeded off the full seed (89579) | convertible/open cars: driver and passenger change clothes when the car leaves a straight for a corner; same-colour convertibles share one couple | Put the full `colorSeed` (or an occupant index) in the sprite key for kinds with occupants, or seed occupants from the palette index | Low; more sprite keys |
| O14 | **Traffic sprite × census fallback (perf)** | 92798, census 80910 x422 vs 80909 x77 | most straight-running cars drawn live in the census run [U cause] | Measure `ts.map.size` and budget hits; raise `TRAFFIC_SPRITE.max` or drop the night bit for unlit kinds | Memory |
| O15 | **Riders × clearance to kerb cars (V6)** | STREET_RIDER.lane 222 (35420) vs kerb body edge 248.6 | riders brush the parked cars' flanks | Lane ≈ 248.6 − 84 − rider half-width ≈ 150, or have riders treat kerb cars as obstacles in `updateRiderTraffic` | Medium: 150 is close to the car lane (165 body edge); might need the traffic lane offset reviewed |
| O16 | **Riders × other vehicles (V6)** | 102087 (only `trafficActive`) | riders ride through the crew van, police, ambulance, porter's car | Feed one obstacle list (traffic + `hospCastCarsWorld` + crew van + police) to riders and traffic: the missing "shared yield service" | Medium |
| O17 | **Showroom cars × forked art (V4)** | 41734–41742, 41857, 61812, 61883 | Palmline Motors' cars are an older 4-colour car, not the street's | `gameCar(a, b, z, fdir, seed, kind)` (as Pelican/Dune lots) with the showroom's 4 stands | Low; broadside facing is fdir 0/2 |
| O18 | **Palmline Garage truck × boxes (V4)** | 53834–53842 | a box truck that is not one of ours | `gameCar(..., 'truck')` nose-in, tail to the street | Low; clip to the bay as now |
| O19 | **Parked/standing vehicles drawn live** | ambulance in bay, porter's car at kerb, crew van/police parked, errand cars stopped | perf only | When `parked`/`!moving`, route through `bcDraw` keyed by kind + rounded pose (same trick as `pcar|`) | Low |
| O20 | **Derby fill × possible pop (V1)** | 28109–28124 | families' cars may appear in free kerb slots on screen [U: when the fill first runs] | Fill only slots not on screen (as `derbyKerbTidy` tests, 28131–28134), retrying each tick | Low |
| O21 | **Colour from position (V12)** | drawCar 89243, drawVan 89683, drawRig 91110 … fallback; used by route car (S4) and parking rows (S5) | none visible (static), but violates "seeded from identity" | Give those callers a seed from their slot key (`hashStr`) | Trivial |
| O22 | **`vehLen` missing work trucks** | 35387 | firetruck/fueltruck report 225 (true 400/420) | add `RIGS`-style lengths for drawWorkTruck kinds | Trivial |

Not outliers (checked): kerb cars (cached, capsule, 84 clearance), crew van (drives in, yields, capsule), errand / Strand garage cars (clip through the door), lot and garage cars (gameCar, cached), airfield (gameCar, per-part solids that match the art: fire engine 400 × 104 vs solid 404 × 112, fuel truck 420 × 100 vs 424 × 108), boats (cached, date-seeded).

---

## 4. RECIPE: a new vehicle source

Pick the kind from `VEHICLES` (it must draw through `drawProp`). Give each vehicle an identity seed (`hashStr(sourceKey)`) and pass it as `colorSeed`. If it **stands still**, place it from layout data before any culling (V1), draw it through `bcDraw(g, "<src>|kind|x,y|fdir", x, y, gg => this.drawProp(gg, kind, x, y, 0, fdir, z, null, seed))`, or inside a LIB entry with `gameCar(a, b, z, fdir, seed, kind)`. Make it solid from the same list with the car box (today copy ±48 × ±112, or the capsule `carAxisPoint(v, fdir, px, py, vehLen(kind))` in owStep), and keep it ≥ 84 from any moving lane. If it **moves**, make its pose a pure function of time on a path that starts and ends off screen (`reach = max(1600, (vpW+vpH)/K*0.7)`, as `rescueVanPlan`), or borrow an unseen traffic car and give it an errand (`kerbDepart` / `errandPath` / `errandFinish`). Never fade it and never drop it at draw time. Queue it at depth `x + y` with `visProp(kind, x, y)`, draw it with `drawProp(layerFor(x,y), kind, x, y, t, fdir, z, distance*0.28, seed)`, add it to the traffic obstacle list (`pos` in `updateTrafficSpacing`, as `hospCastCarsWorld`), and solidify it while stopped (owStep capsule loop). Then screenshot it parked and record a clip of it arriving and leaving.
