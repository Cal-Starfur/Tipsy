# Tipsy door map (read-only audit, game/index.html @ working tree, 118,916 lines)

Method: read the code at every line quoted below, plus one headless boot (tools/review/harness.js, pinned date
2026-09-30) to count what the door lists actually hold in the Flats. Anything marked **[unverified]** was reasoned
from code/numbers but not seen on screen.

Boot counts (Flats = hood 0): 120 hood shops on blocks (incl. 32 rim/mall/Cove stores listed as hood shops);
`shopDoorsOf` = **39** swing doors; `homeDoorsOf` = **40** house doors; `nssHomeDoorsOf` = **30** strand doors;
`nssGaragesOf` = **19** garages; `depotsOf` = **37** depots (city-wide); HOSP_EDOORS 2, HOSP_IDOORS 1,
HOSP_MDOORS 1; POCKETS doors: Ballroom `front`; Mall `front`,`front2`,`bridge`,`Tdoor0/1`,`Ddoor0/1`;
Trophies `front`; Marina General `main`,`erN`,`erS`,`bridge`. No page errors.
`LIB.doorOf` records **0** doors for 43 Flats entries (6 block landmarks, 32 rim/mall/Cove stores, and 5 small
shops: Palmline Savings, Tidewater Tea House, Sandpiper Shoes, Surfside Diner, Seabreeze Picture House) and >1 for
2 (Marina Flats 5, Seabreeze Playhouse 4). 42 of the Flats' hood shops stand on rear (away) edges.

---------------------------------------------------------------------------------------------------------------

## 1. DOOR SYSTEMS

| # | System | Code | Covers (Flats) | Drawn by | Animates | WHO opens it | People at it | Robot enters? |
|---|---|---|---|---|---|---|---|---|
| 1 | **Shop swing** `shopDoorSwing` + `LIB.drawDoorOpen` | kit `shopDoor` L41198 (records into `DOOR_REC`), `LIB.doorOf/doorNear/drawDoorOpen/doorLeaves/doorOpening` L72103-72170, leaf drawer `shopDoorOpen` (module fn) L41311, depth tunnel `shopInterior` L41270, list `shopDoorsOf` L16091, state `shopDoorSwing` L102040, draw loop L81026-81037 | 39 front-edge small shops (one door each, `doorNear` the middle) | kit (`shopDoor`), replayed open live over the cached shop | yes, 280 ms open / 480 ms shut (L102055) | `_shoppers` whose `p.door === d`; errand drivers on foot (`errandPerson`); `shopDoorWalkers` (cake baker, ANNIV florist/baker giver) only while `ow.on` (L102049-102053). **Not** Tipsey, **not** the pickup worker (own clock, #2). Only computed when `grid._kerbCars` exists (L80921) | walk through; drawn between lit tunnel and leaf, clipped to opening (`queuePerson`/`between`, L80924-80941, 81029-81036) | no (only Seabreeze Trophies via pocket #12) |
| 2 | **Pickup worker's door** (`this.doorSwing`) | eased per frame by `SHOPDOOR_ART.openEase` L95816-95823 (frame-rate dependent), consumed in `drawPickupUnit` L83788; 4 drawers: real shop → `LIB.drawDoorOpen` (L84704-84720); generic hood pickup → `drawShopDoor` L83659 (SHOPDOOR_ART, other hoods); mall street bays / Palmline / Cove → `glassPairDoor` L83763 (calls L85577, 86236); anchors → the slide (#3) via `_pickupWorkerAt` L83842 | today's one pickup shop | per variant above | yes | pickup worker only | walks through, between room and leaf (L83919-83941); **rear-edge shops and atrium stores pass `noDoor=true`: worker simply appears at the glass line** (L84719, 86236 `: true`) | n/a |
| 3 | **Declared slides** `slideDoors` + `shopDoorOpen(key,x,y,also)` | state L102060; block-landmark loop L84769-84774 (key `lib|ux,uy|flank|d<i>`); rim loop L86195-86202 (key `rim|<site>|d<i>`, cached when 0/1); leaf drawer `slidePairDraw` L40300 | Dune Home & Garden 2 pairs (L60794), Pelican Drug 1 pair (L61128), Maritime Mall anchors 4 pairs (L64796) | declared entry `slideDoors` + `doorDraw` (bespoke leaves) | yes, 380 / 650 ms | Tipsey (R 125), errand drivers, pickup worker, `also` = `mallCrowdNear` (mall only, crowd on L0 in the street frame, L77575) | walk through (errand drivers at Dune/Pelican, `doorAt` L36711; mall crowd) | anchors yes (pocket doors `Tdoor*`,`Ddoor*`); Dune/Pelican no **[unverified]** |
| 4 | **Mall interior slides** `mallSlideOpen` | L87874, drawer `drawSlideFx` L87860 (fx `'slide'`, L48549) | the same 4 anchor pairs, from inside | bespoke fx | yes, 380 / 650 ms | Tipsey, mall crowd on L0 (L87880-87882) | walk through | yes |
| 5 | **House doors** `houseDoorsOpen` | L102004; draw L81045-81094 (lit hall + leaf in the house's own `liv.leaf` colour); kit art `houseDoorway` L42126; position `houseDoorOf` L17957 (from `ent.door`, not the recorded doorway); `HOUSE_DOOR_OPEN` L16201 | 40 home doors + 30 strand doors | bespoke leaf over the painted `houseDoorway` | yes, 280 / 480 ms | home `_shoppers`/`_seekers` (`p.door.home`), `lostDogAtDoor` (L21119), strand residents `nssResAt`, pavement walkers/dogs/dog owners with a `_plan` (L102011-102026). **Not** Tipsey, Rosa, Luna's mom, the delivery customer | walk in / out; vanish at the step (open door); not drawn between hall and leaf | no |
| 6 | **Delivery address door** `drawDoorAssembly` | L82521 (DOOR_ART "hull door", L13309), clock `this.doorTheta`; called L84409, 84542 | the day's one address | bespoke DOOR_ART (frame + slab + knob), **over** the library house's own painted door | yes | drop-off customer only | walks through, `inside` clip | no |
| 7 | **Marina General glass** HOSP_EDOORS / HOSP_IDOORS / HOSP_MDOORS | L32861-32875, tick `hospEdoorTick` L32879 (outside L32180, inside L33351); leaves `drawEdoorLeaves/drawMdoorLeaves → drawGlassLeaves` L88899-88901; queued L81782-81791 (outside), L81853-81870 (inside) | 2 ER entrances, 1 inner ER door, 1 main set | bespoke glass leaves | yes, 340 ms | Tipsey (reachR 210 / mainR 190), ground-floor hall walkers incl. a pushed chair (`hospInHaz(1).walk`, walkR 130) | walk through | yes (pocket doors `main`,`erN`,`erS`; k forced to 1 at hand-off L19822-19823) |
| 8 | **Depot roll-up** | `_doorTs` L80593-80612, `depotDoorWants` L33668, `LIB.setDoor` L72178, `wallImg` L84865-84870 | 37 depots | the Charge depot entry's own door | yes (~700 ms ease, `DOOR_SHUT_MS` from the pad) | Tipsey only | — | yes |
| 9 | **Strand garages** `NSS_GDOOR` | L18242, `updateNssGarages` L78053, `drawNssGarageOpen` L78095 | 19 | bespoke roll-up + lit inside | yes, 1100 / 1400 ms | its own errand car only | cars | no |
| 10 | **Lifts** | `OW_LIFT` L29348; ballroom `SVC` L20186 / `drawSvcDoors` L88875; `VAULT` L20189 (fade 450 ms); garage & Cove/Marina lift `liftDoor()` L65357, 43430, 44125; `wardDoor()` L43445 | mall garage, Cove/hospital lifts, ballroom service lift, sidewalk vault | bespoke per lift | yes | Tipsey (riders) | — | yes |
| 11 | **Gates / arms** | `CY_GATES` L19059 (`courtyardGateStep` L19075), `RIM_GATES` L25671 (school, `TPE_PLAN.GATES`), `GATE_ARMS` L36288 (car park barriers), alley gates `drawAlleyGate` L75972 (`agate|` cache L84677) | courtyards, Tide Pool Elementary 2 gates, lots | bespoke | yes | CY/RIM: Tipsey only if debug or his trip ends inside ("Nothing sends him to a courtyard yet", L19055-19057) — so in play they never open; arms: cars | — | via gates |
| 12 | **Pocket doors** (transit, no art of their own) | `POCKETS` L19600, `pocketDoorStep` L19687, gates `POCKET_GATES` L19645 / L20134-20136 / L27617; mall doors L27355-27365; hospital L33405-33416; trophies L27612 | see boot counts | none: they rely on whatever the outside draws | — | Tipsey only (gated: mall front needs `mallPasswordOwned`, ballroom `cakePassOwned`, trophies FOURTH stage) | — | yes |
| 13 | **Painted doors (no system)** | see inventory | MALL_ENT 2 pairs, 6 mall street bays, 2 Palmline stores + lobby, 12 Cove stores + 4 plaza shops + 2 lobbies, ballroom/museum/school `doorF`, shelter, boats, block landmarks, the 2nd..Nth door of multi-door shops, rear `rearDoor`s | `F()` dark panels, `doorF`, hand-rolled | **no** (except glassPairDoor for the pickup worker) | nobody | **pop / walk through glass** | — |

Distinct leaf drawers today: shop swing (`shopDoorOpen` fn), `drawShopDoor`, `drawDoorAssembly`, house leaf (inline L81084-81090), `slidePairDraw`, `drawSlideFx`, `glassPairDoor`, `drawGlassLeaves`, depot, garage, 4+ lifts = **≥ 12**, against doors.md D5 "one leaf drawer per type". Distinct open/shut clocks: 280/480 (shop, house), 380/650 (slides), 340 (hospital), per-frame 0.09 ease (pickup, address), 700 (depot), 1100/1400 (garage), 480/520 (OW_LIFT).

The checker `tools/review/doors.js` hooks only #1, #3, #4, #5, #7. It cannot see #2, #6, #8-#13, so a pop at a painted door (MALL_ENT, bays, shelter, boats, ballroom) is never judged as a door event.

---------------------------------------------------------------------------------------------------------------

## 2. DOOR INVENTORY (the Flats, plus the landmarks with doors people use)

Legend: W = working (opens live for its users), P = painted (never opens), W* = opens only for the pickup worker.

### Small shops (LIB entries L49958-60548, flatsShop L71330-71642)
| Building | Doors | System | State | Notes |
|---|---|---|---|---|
| 39 front-edge small shops (`shopDoorsOf`) | 1 kit `shopDoor` each | #1 (+#2 when pickup) | W | the norm. Opens for shoppers/errand/door-walkers, **not for Tipsey** |
| 42 rear-edge small shops | front `shopDoor` faces away; `rearDoor` (L41421) on the seen back | none | P (back), unseen front | pickup at a rear shop: `noDoor=true` (L84719), worker appears at the glass line behind the building, x-rayed |
| Marina Flats (L61521) | 5 recorded (`shopDoor` x4 + flank `doorF`s L61606) | #1 for the one nearest mid | 1 W, rest P | extra doors are kit art that can never open (D9) |
| Seabreeze Playhouse (L57288-57290) | 4 `shopDoor` under the marquee | #1 for one | 1 W, 3 P | |
| Palmline Motors, Tidewater & Co., Seawall Chambers, Seabreeze Library, Lagoon Market Hall, Tide Gazette, Flats Police, Palmline Surf Co. | 2 `shopDoor` calls each in source (some are mirror/flank variants) | #1 for one | 1 W, others P **[count unverified per entry; boot only flagged Marina Flats and Playhouse as >1 recorded]** | Lagoon Market Hall is a block landmark, not in `shopDoorsOf`: both P |
| Surfside Diner (L52950) | drum door hand-drawn on `plateSweep` | none | **P** | **a pickup extra** (`HOOD_PICKUP_MENU.Diner`, boot doorA 149.5 = lotW/2): worker pops from mid-lot |
| Sandpiper Shoes (L59392-59403) | hand-rolled glass pair in a reveal | none | **P** | **a pickup extra** (Shoe shop, doorA 263.12 fallback): worker pops |
| Seabreeze Picture House (L53185-53212) | 5-leaf door bank in a recessed lobby | none | P | no users |
| Palmline Savings (L54355-54390) | portico doorway | none | P | no users |
| Tidewater Tea House (L50879-50890) | hand-rolled double door at set-back wall | none | P | no users (not in `shopDoorsOf`) |
| Seabreeze Trophies (L71642) | kit `shopDoor`, doorMid | #1 + pocket #12 (`auto`) | W for shoppers; **does not swing for Tipsey** as he auto-drives in (crossfade, `pocketAutoIn` L19860) | gated by FOURTH stage |

### Block landmarks (whole block, `block:true`)
| Building | Doors | System | State | Users |
|---|---|---|---|---|
| Dune Home & Garden (L60760) | 2 slide pairs | #3 | W | errand drivers from its car park, pickup worker, Tipsey |
| Pelican Drug (L61126) | 1 slide pair (painted opening L61414 + live leaves) | #3 | W | as above |
| Driftwood Chapel (L54783) | 4 doors (west, chancel, nave, tower) hand-drawn | none | P | none |
| Lagoon Baths (L55989) | 4 entrances, arched portal (L56142, 56198) | none | P | none |
| Palmline Nursery (L56627) | hut doorway (L56883) | none | P | none |
| Saltwater Brewing (L58687) | tap-room door (L58969), personnel door (L58921), roller doors | none | P | beer trucks stop at the dock, nobody goes in |
| Tidewater Maritime Museum (L63508) | `doorF` (L63595) | none | P | none |
| **Seabreeze Ballroom** (L63719) | `doorF` front (L63823-63824), mark `door` (L63727) | pocket #12 `front` (seamless, gated `cakePassOwned`) | **P** | **Tipsey drives through a shut painted door**; doorman (Walter) stands beside it |
| **Costa Palma Animal Shelter** (L64058) | glazed double door, push bars (L64136-64146) | none | **P** | **shelter worker walks out of / back into it with the dog** (SHELTER L21196, `stepB` -978, L21361-21397): appears and vanishes at a shut door |
| Ferris Taylor Cottages (L64164) | a door per cottage | none | P | none |
| Tide Pool Elementary (rim, L64487) | recessed porch doors (L64632) | none; gates #11 | P | none |
| School / Undertaker (park entries L45218 / L44813, other hoods) | `doorF` | none | P | none |
| Pelican Harbor (L65871) | shop door (L65934), pavilion doors (L65979) | none | P | none |

### Rim sites
| Site | Doors | System | State | Users |
|---|---|---|---|---|
| **Maritime Mall plaza front (MALL_ENT)** | 2 glass pairs, painted shut outside (L65093-65103), painted permanently open inside (L47609-47631) | pocket #12 `front`,`front2` (seamless, gated by password L20134-20135) | **P** | **mall crowd walks in/out through them** (`sp.IN` gates L26408); Tipsey drives through them; atrium-store pickups would use them (`mallDoorA` L25840) |
| **Mall street bays** (6: Obscura, American Gothic, Swell, Onda, Marea, Riva) | glass pair each, painted outside (L65027-65037) and inside (L47399-47417, with a **solid wall across the doorway** `wallSolid(a0,a1,…)` L47399) | #2 `glassPairDoor` | **W\*** | **MALL_QUOTA shoppers enter/leave through them** (`sp.STREET` L26411-26412, `MALL_QUOTA` L26597): walk through shut glass and a solid wall |
| Mall anchors (Tidewater & Co., Dune) | 2 slide pairs each | #3 outside, #4 inside (two clocks for one door) | W | crowd, Tipsey, pickup worker |
| Mall skybridge (`bridge`) | garage level 2 | pocket #12 (fade) | n/a | Tipsey |
| Maritime Mall Parking (L65318) | lift | #10 | W | Tipsey |
| Palmline Tower stores (Coral Cafe, Marina Deli) | glass pair each (L65782-65785) | #2 `glassPairDoor` | **W\*** | pickup worker only |
| Palmline Tower lobby | revolving door + 2 pairs (L65804-65813) | none | P | none |

### Park landmarks
| Site | Doors | System | State | Users |
|---|---|---|---|---|
| Cove Grove 12 stores (COVE_STORES L27496) | glass pair each, `shopfront()` L43003-43022 | #2 `glassPairDoor` (L85577) | **W\*** | pickup worker only |
| Cove Grove 4 plaza shops + 2 lobbies (L27512) | painted pairs / `lobby()` | none | P | none |
| Cove towers / Marina General lifts | `liftDoor`, `wardDoor` | #10 | W | Tipsey |
| **Marina General** main set, 2 ER entrances, inner ER door | glass | #7 | W | Tipsey, hall walkers, pushed chairs. **Not**: the heart-run doctor `HOSP_DOC` (L30834) who starts 10 out from the main glass, x 18130, while Tipsey waits on the bay 250 from the door's middle (> mainR 190) → walks out of shut glass **[by numbers, unverified on screen]**; the crew (`HOSP_RESCUE_T.fadeMs` 450 L32907, entry 60 inside the main doors L32909-32911; jail crew L33036-33039) **fade** in/out behind the door |

### Houses, strand, harbor, depots
| Site | Doors | System | State | Users / gaps |
|---|---|---|---|---|
| 40 Flats/Maritime houses | `houseDoorway` art; live leaf | #5 | W | residents, walkers. **Rosa** (ANNIV home, `annivHome` L20520) and **Luna's mom** (GOTH_HOME_SPOT L20695, door fixed at 3540,-5690) come out to Tipsey but are on no who-list (`houseDoorsOpen` L102011-102026; drawn plain via hazVQ L81938-81953): they appear at a shut door. Luna's mom is not even in `CITY_PEOPLE` |
| 30 strand houses | as above | #5 | W | the exemplar "strand's lit doorways" |
| Delivery address house | DOOR_ART door drawn **over** the house's own door | #6 | W | a different leaf/look from #5 for the same house door |
| 19 strand garages | roll-up | #9 | W | cars |
| Harbor boats (motor/sail/yacht) | cabin door in the aft face, painted (`door()` L66191-66201, BOAT_DOOR L110844) | none | **P** | **the boat delivery customer comes out of it and goes back in** (L110835-110839, `harborBoatBoarding` L110875) |
| Charge depots (37) | roll-up | #8 | W | Tipsey |

---------------------------------------------------------------------------------------------------------------

## 3. THE NORM, OUTLIERS, WHO-OPENS

### The norm (owner-approved)
- **Swing (shops):** kit `shopDoor` → `DOOR_REC` → `LIB.drawDoorOpen` replaying the *same* leaf open (Sir on-device 2026-10-06: "the doors on pick up ... dont open or close when used", fixed L41190-41196; "the door is losing its detail when it opens" fixed L41314-41324), the lit tunnel `shopInterior` (Sir: "the blank black behind the door thats not very good" L41258), walkers drawn between tunnel and leaf and clipped to the opening (Sir 2026-10-13 "disappearing and appearing all at once" L80916-80920, Sir 2026-10-18 baker "isn't coming out of the door" L19930). This is the one door that satisfies D0, D1, D3, D6, D10 at once.
- **House:** `houseDoorsOpen` + lit hall (Sir 2026-10-17 "the door on the houses arent opening for the people" L81039-81040; 2026-10-25 "the house needs an entrance not a black entrance" L81049). doors.md exemplar.
- **Automatic glass:** declared `slideDoors` + `shopDoorOpen` + `slidePairDraw`, cached at 0/1 (Sir 2026-10-22 "they dont seem like they work for customers ... exterior and interior versions should match" L64793); Marina General's glass (Sir 2026-10-26 "an operating door system", 2026-10-27 "can we get the sliding doors?", "we want this same effect main entrance too").
- doors.md exemplars: house doors for residents; pickup shops' glass doors for workers (glassPairDoor, Sir 2026-10-27 L83749); the strand's lit doorways.

### Outliers (ranked by what a player sees)

| # | Outlier | Lines | Visible consequence | Concrete fix (reuse) | Risk |
|---|---|---|---|---|---|
| O1 | **Mall front doors MALL_ENT** painted shut outside, painted open inside; only POCKETS knows them | draw L65093-65103 (out), L47609-47631 (in); pocket L27357-27360; gate L20134-20135; crowd gates L26408 | the crowd and Tipsey pass through shut glass from the plaza; inside they are always open; the shell crossfade is the only "door" | add the two pairs to `'Maritime Mall'.slideDoors` (same shape as the anchors' L64796: `a: d0+4, w: d1-d0-8, b: MALL_PLAN.BF+2.2, z0: 3, z1: MALL_ENT.H-4`), drop the leaf `F()`s at L65097-65098 (keep frame, mullion, transom); inside, replace `pair()`'s fixed open leaves (L47630) with fx `'slide'` items keyed to the same state (`drawSlideFx`/`mallSlideOpen`). The rim loop L86195-86202 then draws/caches them and opens them via `shopDoorOpen(..., mallCrowdNear)`. For the password: open for Tipsey only when `mallPasswordOwned()` (otherwise they open for the crowd beside him and stay shut for him) | depth vs. the glass canopy and WELCOME band (MALL_ENT.can), the seamless hand-off (`pocketHandOff`) assumes he drives through glass; keep the leaves under the canopy's lip (the clip `glassPairDoor` uses for awnings) |
| O2 | **Mall street bays (6)** painted; live only for the pickup worker; inside a solid wall spans the doorway | out L65027-65037, in L47399-47417 (`wallSolid(a0, a1, …)`), quota gates L26411-26412, L26597 | MALL_QUOTA shoppers walk through shut glass and through a wall; the doors open only on pickup days | make the bay a declared door: key `bay|<wing><k>` with `shopDoorOpen(key, x, y, mallCrowdNear)` (crowd + Tipsey-irrelevant + pickup worker already handled) and draw `glassPairDoor(...)(k, between)` every frame it is visible and k>0 (cache at 0 like L86201); inside, cut the doorway out of the wall solid and draw the same leaves (or an fx `'slide'`); pass the walker in the doorway as `between` | glassPairDoor is screen-space live per frame: must be cached at k 0/1 (perf rule), and needs the awning clip; inside/outside must share one key |
| O3 | **Palmline Tower stores (2) + Cove Grove stores (12)**: painted; open only for the pickup worker; lobbies and plaza shops painted | Palmline L65782-65785, lobby L65804-65813; Cove `shopfront` L43017-43020, `lobby`; pickup L85577, L86236 | today harmless (nobody else uses them), but they are three more copies of the same painted pair (mall L65031, inside L47412, Palmline, Cove) | one `glassPairDoor`-shaped kit door that records itself (like `DOOR_REC`) and one key per store; drop the painted leaves from the three cached drawings | low; cache keys |
| O4 | **Seabreeze Ballroom front door** is `doorF` (painted), Tipsey drives through it seamlessly | L63823-63824; pocket L19618; `doorF` L41996 | he drives into a shut door until the shell drops | fix doors.md kit flaw 5: make `doorF` push into `DOOR_REC` (with its frame) so `LIB.doorOf` sees it, then swing it with the #1 path keyed off Tipsey + Walter + guests near the mark | `doorF` is in a frame (`R(fr,…)`), so the replay needs the frame transform; also used by the museum, school, Marina Flats, Grand Pelican |
| O5 | **Animal Shelter double door** painted; the shelter worker and the dog appear/vanish at it | door L64136-64146; SHELTER L21196; walk L21361-21397 | pop at a shut door every shelter drop-off | give the entry a declared door (`door` + a recorded `houseDoorway`- or `shopDoor(..., base)`-style opening at b -1000), list it beside `homeDoorsOf` (a `landmarkDoorsOf`), and let `houseDoorsOpen`'s who (already includes `lostDogAtDoor`) open it | needs `shopDoor` to take a set-back (kit flaw 3) or a hand-declared door in the shelter frame |
| O6 | **Surfside Diner, Sandpiper Shoes** have no recorded door but are pickup extras | Diner L52990-53056, Shoes L59392-59403; menu L16649-16668; `hoodExtraPickups` L16670-16679; fallback L16076-16077 | the worker walks out of the wall at mid-lot (boot: doorA 149.5 / 263.12) | short term: in `hoodExtraPickups` skip entries with no `LIB.doorNear`; proper: Shoes → a declared glass pair (`slideDoors`-style) at 268..384 b -17; Diner → `shopDoor` on the flat wall | changing the menu changes which shops offer orders (saved state: none) |
| O7 | **Rosa, Luna's mom**: come out of house doors no system opens | `annivHome` L20520, `cakeMeet(ow, bay.door)` L20635; `GOTH_HOME_SPOT` L20695, L20943; draw L81938-81953; who-list L102011-102026 | pop at a shut house door | add them to `houseDoorsOpen`'s `who` (or, better, the shared rule below); add Luna's mom to `CITY_PEOPLE` | none |
| O8 | **Harbor boat cabin doors** painted; the delivery customer uses them | L66191-66201, L110835-110880 | pop at a shut cabin door | a swing leaf on the cabin's aft face driven by the boat customer's position (`boatCustomerPos`), same 280/480 ease | boat art is in its own frame |
| O9 | **Marina General** doors ignore the heart-run doctor and the crews | `HOSP_DOC` L30834, R.doc L31051; `HOSP_RESCUE_T.fadeMs` L32907, entries L32909-32911, L33036-33039; tick L32879-32903 | doctor out of shut glass **[unverified]**; crews fade behind the door instead of walking through it | `hospEdoorTick`'s `ppl` += `CITY_PEOPLE.near` (heart run, rescue crew are listed, L72952, 72972); replace the crew fade with a walk from past the door | crews currently spawn inside; walking them in from the street needs a path |
| O10 | **Seabreeze Trophies** door does not swing for Tipsey | `shopDoorSwing` L102040 (no robot); `pocketAutoIn` L19860 | he drives into a shut kit door (crossfade covers it) | add Tipsey to the swing's who (shared rule) | the door would then swing for him at every small shop he brushes past (R = `SHOPPERS.doorR`); acceptable/desired |
| O11 | **Pickup door is a second clock and a second drawer** for the same shop door | `doorSwing` per-frame ease L95816-95823; `drawShopDoor` L83659; `drawPickupUnit` L83788 | timing differs from the shop's own swing (frame-rate dependent); a shopper and the worker at once can draw two leaves at two angles **[unverified]**; rear and atrium pickups `noDoor=true` pop | expose the worker (`_pickupWorkerAt`, `CITY_PEOPLE 'pickup worker' each: null` L72753) and let #1/#3 open the door; delete the `doorSwing` door draw for real shops | pickup choreography timing (walk waits on `doorSwing`) |
| O12 | **Delivery address door** is DOOR_ART over the house's own door | L84400-84412, L82521 | the address house's door looks different from every other house door when it opens | drive the customer through `houseDoorsOpen` and its leaf (L81045-81094); expose the customer (`'drop-off customer' each: null` L72754) | the win sequence keys off `doorTheta` |
| O13 | **Anchors: two clocks for one door** | outside `shopDoorOpen("rim|Maritime Mall|d"+i)` L86198, inside `mallSlideOpen(fx.key)` L87874 | can disagree at the crossing (one open, one shut) **[unverified]** | key the inside fx by the same `rim|...|d<i>` and read one state | none |
| O14 | **Gates never open in play** | L19050-19058, L25664-25670 | LOOK_RULES §6 "Every gate opens" is only true in debug | open for anyone in the shared who-list whose path crosses the gate | collision reads the same state (solid while shut) |
| O15 | Multi-door entries: only the door nearest the middle can open | `doorNear` L72119; Marina Flats 5, Playhouse 4 | extra kit doors are painted (D9) | mark decorative doors (`opts.fixed`) or make each a working door with its own key | low |

### WHO-OPENS matrix (today)

| Who \ door | shop swing #1 | pickup #2 | slide #3 | mall slide #4 | house #5 | address #6 | hospital #7 | depot #8 | painted |
|---|---|---|---|---|---|---|---|---|---|
| Tipsey | — | — | ✓ | ✓ | — | — | ✓ | ✓ | — |
| shoppers / seekers | ✓ (own door) | — | — | — | ✓ (home) | — | — | — | — |
| errand drivers on foot | ✓ | — | ✓ | — | — | — | — | — | — |
| pickup worker | — | ✓ | ✓ | — | — | — | — | — | — |
| mission door walkers (baker, florist) | ✓ (ow.on only) | — | — | — | — | — | — | — | — |
| mall crowd | — | — | ✓ (mall only, `also`) | ✓ | — | — | — | — | MALL_ENT, bays ✗ |
| residents, strand, pavement walkers, dog owners, lost-dog owner | — | — | — | — | ✓ | — | — | — | shelter ✗ |
| hospital hall walkers, pushed chairs | — | — | — | — | — | — | ✓ | — | — |
| drop-off / boat customer | — | — | — | — | — | ✓ | — | — | boat ✗ |
| Rosa, Luna's mom, doctor, crews, shelter worker | — | — | — | — | ✗ | — | ✗ | — | ✗ |

**Proposed rule (one function, every door):** `doorWants(door, t) = tipseyAt(door) || CITY_PEOPLE.near(scene, t, door.x, door.y, R).some(p => crosses(p, door))`, where `crosses` is "within R and on/approaching the door's line" (the shop swing's `lat`/`al` test, L80926-80927). Every door system keeps its own leaf drawer for now but reads its k from one keyed state `DOOR_K.get(key)` eased with one pair of rates per type (swing 280/480, slide 380/650). Gates on who may *enter* (POCKET_GATES, password, cake pass) decide whether Tipsey counts, not whether the door exists. Prerequisite: list the unlisted populations in `CITY_PEOPLE` (pickup worker, drop-off customer, boat customer, Luna's mom, shelter worker as lost-dog owner already is). This is doors.md "Known kit flaw 1" made concrete.

---------------------------------------------------------------------------------------------------------------

## 4. RECIPE: adding a door to a new building

Draw it with the kit, never with `F()`: a shop or any opening on the frontage plane calls `shopDoor(aMid, wall, trim, glass, ww, base)` (the opening, surround, fanlight and leaf; it records itself into `DOOR_REC`, so `LIB.doorOf`/`doorNear` find it and the shop joins `shopDoorsOf` automatically if it is a small front-edge shop), a house calls `houseDoorway(...)` and declares `door: [a, b]` so `houseDoorOf`/`homeDoorsOf` pick it up, and automatic glass is declared as `slideDoors: [{ a, w, b, z0, z1, walk }]` plus `doorDraw(i, u){ slidePairDraw(this.slideDoors[i], u, frame); }` (the block-landmark and rim loops then key, cache and open it via `shopDoorOpen`). Paint only the dark opening and frame in the cached image; the leaves are drawn live by the system. Declare exactly one working entrance per unit (D9) and keep everything else off the opening (D4). Whoever uses it must be an entry in `CITY_PEOPLE` with a live `x, y`, and must be on that system's who-list today (until the shared rule lands, add them by hand: `shopDoorSwing` L102047-102053, `shopDoorOpen` L102068-102074 or its `also`, `houseDoorsOpen` L102011-102026); walk them from past the door's line through it (they are drawn between tunnel and leaf by `queuePerson`/`between`), never spawn or fade them at the step. If Tipsey goes in, add a POCKETS door whose `world()` is that same door's point and let the same door state open for him. Then check with `node tools/world_review.js --kit doors,people` and a headless screenshot of the door open with someone in it. Gaps to know: `shopDoor` is fixed to b 0 (set-back fronts need `base`/a frame door, kit flaw 3), and `doorF` does not record itself (flaw 5), so neither a set-back door nor a `doorF` will open until those are fixed.
