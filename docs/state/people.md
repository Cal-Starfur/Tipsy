# People systems map (game/index.html)

Read-only survey, 2026-10-29. Line numbers are `game/index.html`. "Verified" = read in code; "unverified" = inferred, not run.
Contract: `docs/kits/people.md` (P1-P18), `docs/LOOK_RULES.md` section 7, CLAUDE.md "People who talk to Tipsey".

## 0. The kit (what exists to share)

| Piece | Line | What it is |
|---|---|---|
| `PEOPLE_WALK_V = 0.065` | 4929 | shared pace (band 0.06-0.075) |
| `PEOPLE_ART.walkSpeed = 0.006` | 5218 | leg clock rate; `walkSin(a)` 5226 stores the gait angle |
| `PEOPLE_BUILD` / `PEOPLE_CHILD` | 5227- | bodies; height 52+44+28 = 124 = `PERSON_H` (13446). `PERSON_H` itself is only read by furniture sizing (13702, 83575...) |
| `drawPersonHull` -> `drawPersonHullBody` | 86549 / 86572 | the one body (x-ray mirror inside) |
| `streetLook(seed, opts)` | 72565 | THE roster. Everything else wraps it: `crowdLook`/`folkLook` (16232/16230), `partyLook` (5402, body off streetLook + venue clothes), `rosterBody` (72666), `custLook` (72668), `mallLook` (mallLook fn), `bwLook` (18817), `staffLook`, `mallJailLook` (27263), `storeRepLook` (27291), `hospFolkLook` (29818), `williamLook`, `cpStreetLook` (72669) |
| `CITY_PEOPLE` registry | 72372 (+ `.add` 72678-73025) | list of populations; **only reader is `census()`** (grep: no `CITY_PEOPLE.each/near` call anywhere, tools included) |
| `MEET`, `meetSpot`, `meetWalk`, `meetTick` | 30891, 30921, 30944, 30954 | face-to-face kit; walk read by `hospWalkAt` 30965 |
| `cakeMeet` (+`shopDoorMeet`) | 20031 (19941) | a second copy of `meetSpot` with stricter arcs and a "least turn for Tipsey" score |
| `CROWD` + `updateCrowd` | 5870, 101302 | street separation (people-people, people-Tipsey, people-solids) |
| door openers | `shopDoorSwing` 102040, `houseDoorsOpen` 102004, `shopDoorOpen` (slide doors) 102055, `hospEdoorTick` 32879, `MALL_JAIL.door`, lifts | each keeps its own private "who is near" list |
| `queuePerson` (street) | 80931 | routes a person standing in a shop doorway into that door's draw (clip + swing) |

### Universal facts (verified)
- **Every human on the street, in the mall, ballroom, derby, hospital uses `drawPersonHull`** (≈70 call sites, list in section 3). Only non-hull "people": the mascot is still a hull in a green costume (88671, Sir-approved), the humanoid crew bot is `drawProp "humanoid"` (not a person).
- **Leg phase is clock-based everywhere.** All 47 `walkSin(` calls are `t*PEOPLE_ART.walkSpeed*(factor)+phase`; none derive phase from distance (kit flaw 3 confirmed). So every system not walking at 0.065 slides or marches (P11).
- **Depth key is feet x+y** for almost every live person (exceptions in section 2).

---

## 1. System-by-system

Legend for columns: **Reg** = listed in CITY_PEOPLE with a live `each`; **Look** = look function; **v** = walk speed (u/ms); **Legs** = walkSin factor; **Head** = heading passed as `th - π/2` (Y) or other; **Life** = how they appear/leave; **Door** = which door opens for them; **Meet** = meetWalk/meetTick; **Sep** = avoidance.

### A. Street

| # | System | Lines (spawn / pos / draw) | What it is | Reg | Look | v | Legs | Head | Life | Door | Meet | Sep |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A1 | Route + city walkers (`h.type==="people"`, WALK_PLAN) | plan 5900-5965; pos `peopleSpotAtRaw` 5986, `hazWorldAt` 7671; draw `drawProp` people 94147-94195 | pavement walkers ping-ponging a block edge, calling at a house or shop door | Y (72678, 72688) | `streetLook(pSeed, {jobs: jobsAt})` 94155 | 0.065 (5958) | 1.0 | spot `th = ang - π/2` already (6001), hull gets `fdir*π/2 + spotTh` (94163) | always present on their range (ping-pong, no spawn); call = walk to step, walk 62 in, then **jump to b=-60000** (`hideB`, 5947/5973) | house: yes (`houseDoorsOpen` reads planned walkers via `cityFurnitureNear`, 102022-102027). **Shop: no** (`shopDoorSwing` 102040 only checks shoppers, errand drivers, shopDoorWalkers) | n/a | CROWD (101355-101360) |
| A2 | Dog owners (DOG_PAIR) | `dogOwnerAt` 5154; draw `drawDogPair` 92739 | owner on a lead behind half the walking dogs | Y (72698) | (inside drawDogPair) | dog pace `DOG_WALK_V` 0.05 (5921) | 1.0 (unverified) | thW computed in drawDogPair | as A1 (dog's plan) | house only (102027) | n/a | dogs are movers, owners not in CROWD `ws` (unverified) |
| A3 | Shoppers (SHOPPERS) | spawn `updateShoppers` 101611-101775; pos `shopperAt` 16603; draw 80953-80975 | shoppers in/out of small shops, alone or 2-3, to/from kerb cars | Y (72708) | `crowdLook(sp,0x5b0b,…)` | 0.075 (16273) | 1.0 | Y | **from off-screen** (`paveRoute … offScreen`, 101727/101763), from/to a kerb car (no car-door animation; unverified whether any exists), into shop: `hide` at -60 inside (101736) | shop: `shopDoorSwing` + drawn in the doorway clip (`queuePerson`, 80931) | n/a | CROWD (101345) |
| A4 | Residents (HOME_FOLK, householdOf) | `spawnHomes` 101788, `spawnResident` 101815; `householdOf` 16219 | 2-6 named people per house, out/in by foot, car, scooter, with the dog | Y (as shoppers/seekers) | `folkLook(who)` | 0.075 | 1.0 | Y | out of / into their own front door; to/from off-screen or a car | house: `houseDoorsOpen` (102012) | n/a | CROWD |
| A5 | Seekers + scooter trips (SEEKERS, SCOOT_TRIP) | `updateSeekers`; draw 81000-81015 | walk up to an e-scooter and ride off | Y (72718) | `crowdLook(sp,0x5c007,{adult,aid:'none'})` | 0.075 walk, ride 0.17 | 1.0 | Y | as shoppers; ride off | house (home trips) | n/a | CROWD (101346) |
| A6 | Errand drivers (HOSP_ERRANDS) | path 36494-36509; pos `errandPerson` 36405; draw 80938-80946 | driver gets out of a car in a bay, walks to a door and back | Y (72728) | `streetLook(seed^0x5eed7,{adult,aid:'noWheel'})` | 0.075 (`ERRAND.walkV` 36237) | 1.0 | Y | appear 62 to the car's side 500 ms after stop (36414-36419); vanish at `st.door` | shop doors (`shopDoorSwing` + `shopDoorOpen`); other doors none (unverified) | n/a | CROWD (101348) |
| A7 | Food-truck customers (VEND_CUST) | 36267, spawn ~101567, draw 80990-80997 | walk up the pavement to a truck's hatch, queue, order, walk on | **N** | `streetLook(seed^0x7ac0)` (no opts) | unverified (shopper walk) | 1.0 | Y | in from off screen, off it again (comment 36263) | n/a | n/a | **not in CROWD** (101345-101360 omit `_vendCust`) |
| A8 | Derby families going home (DERBY_LEAVE) | 28088; draw 80978-80988 | race families to the gates and their kerb cars | Y (72924) | `partyLook(seed,kind)` | shopper pace | 1.0 (kids too) | Y | handed over from the crowd/cast in place, off in a car | gates (none to open) | n/a | CROWD (101347) |
| A9 | Street riders on foot / having words | 81140-81160, `_riderMeet` 102182 | rider off the scooter after a crash, walks over to Tipsey | Y (72739, 72986) | `streetLook(rd.seed,{adult,aid:'none'})` | **0.16** (meetWalk) | 1.0 | Y | from where they fell | n/a | meetWalk + meetTick (100500-100508, 102182) | none |
| A10 | Knocked down (any) | `queueKnocks` 101191-101300, `knockEnd` 101162 | fall, lie, get up | Y (72981) | K.look | n/a | n/a | Y (stores thW) | **after get-up, a route walker gets `hitT` → old flee run 250 u in 2.6 s then "settled" frozen for the rest of the route** (101169 → `peopleFleeAt` 6035, `peopleSettledSpot` 6045) | n/a | knockMeet via meetWalk | n/a |
| A11 | Lost-dog owner (LOST) | owner 21365, draw `lostDogQueue` 21416-21441 | owner out of the house to Tipsey and back in with the dog | Y (72765) | `streetLook(M.seed,{adult,aid:'none'})`, seed from the dog (21365) — **not a `householdOf` member** | **0.16** (cakeMeet) | 1.0 | Y | from `step` at their door | house: yes (`lostDogAtDoor`, 102016) | cakeMeet + meetTick (21384) | none |
| A12 | Shop-door walkers: baker, florist (CAKE_RUN, ANNIV giver) | `shopDoorMeet` 19941, `shopDoorWalkers` 19950, draw 81019-81024 | shopkeeper out of their own door to Tipsey | Y (72756) | `staffLook` = `rosterBody` + uniform (`drawCakePerson` 87639) | **0.16, clamped 800-4200 ms** (19946) | 1.0 | Y | out of their shop door, back in | shop: `shopDoorSwing` (102052) + doorway clip | cakeMeet + meetTick | none |
| A13 | Walter (doorman) / Margot (planner) | `cakeWalkerAt` 19990-19998; draw 82012, 82042, 82069 | at a post; walk over to talk | Y (72891) | staffLook + uniform | 0.16 (cakeMeet) | 1.0 | Y | always at post (good) | n/a | cakeMeet + meetTick | none |
| A14 | Rosa (ANNIV) | `annivAt` 20545, draw 81940 `drawAnnivRosa` 87716 | out of her house with the note | Y (72847) | `partyLook(0x7051,'woman')` | 0.16 (cakeMeet from `hm.door`) | 1.0 | Y | from a point at her house door | **none** (`houseDoorsOpen` "who" list 102010-102028 omits ANNIV) | cakeMeet + meetTick | none |
| A15 | Gus (mall guard, outside) | `mallGuardAt` 20094, `mallGuardTick` 20104 | stands at his post, walks over when Tipsey stops on the mat | Y (72816) | (drawCakePerson/security) | 0.16 (cakeMeet 20127) | 1.0 | Y | always at post | n/a | cakeMeet + meetTick | none |
| A16 | Strand residents (NSS_RES) | `nssResidentAt` 18341, `nssResAt` 18281; draw `queueNssResidents` 78149-78161 | each strand house's resident out and back on a clock | Y (73003) | `folkLook(q.who)` else `streetLook(d.seed,{adult})` | 0.075 (18288) | 1.0 | Y | out of their front door (opens: 102017), away 3200 along the pavement (off screen? **unverified at wide views**), back | house | n/a | swerve round Tipsey only (18352-18359); none people-people |
| A17 | Boardwalk strollers (BW_STROLL) | 18791-18830; `bwAt` 18287; draw `queueBoardwalkStrollers` 78331-78343 | walkers/joggers/tourists ping-pong the boardwalk | Y (73014) | `bwLook` → streetLook by kind | walker 0.075, jogger 0.21, tourist 0.05, each ×0.85-1.15 (18795, 18832) | per-kind stride 1 / 2.1 / 0.85 (not scaled by each one's ±15% speed) | Y | ping-pong, never pop (comment 18785) | n/a | n/a | swerve round Tipsey only |
| A18 | Police: crime-scene officers, crash officer | 80797, 80856, 81748-81752; `drawOfficer` 89140 | posted officers; one walks over from a crash | Y (72962) | `rosterBody` + POLICE_UNIFORM | 0.16 (meetWalk 31092) | 1.0 | crime officers stored as hull-frame `o.thW` (81748); the walker Y | posted officers are just there (route-built) | n/a | meetWalk + meetTick (31095) | none |
| A19 | Rescue crew (RESCUE_VAN) | 11303, `rescueCrewAt` 12090, `drawCrew` 88981, draw 80846 | crew out of the van, lift him, back in | Y (72972) | `rosterBody` + crew uniform | **0.3 walk (`walkSpeed: 300` u/s, 11309), jog 1.2 past 600 u (`RESCUE_WALK` 11455)**, walkMs clamped 600-2000 | walkSin × min(2.2, pace) (88995) where pace=1 at 0.3 u/ms | Y | out of the van's kerb doors (exitMs 250) | van | n/a (they lift him) | RESCUE_WALK grid path (cell 90, r 22) |
| A20 | Sierra Vista gate guard (SV_GATE) | 110209-110300; draw 76948-76957 | guard leaves his booth to block the pavement | **N** | `rosterBody(0x5e7a)` + SECURITY | **run 0.5, walk 0.14** (110218), stepped per frame | ×1.8 (76954) | **N: stores hull-frame th (`atan2(-fx, fy)`, 110283) and passes `gd.th` raw (76955); snaps each frame** | **appears at `home` beside the booth** (`mode 'booth' → 'out'`, gd.x/y set, 110263) and vanishes there | none | n/a (toast only) | keeps 60 off Tipsey only |
| A21 | Boat customer (marina pickup) | `drawBoatCustomer` 78878 | customer on a boat deck taking the bag | **N** (`each: null` family) | `custLook` + **`hb.shirt/hb.pants` override** (78882) | n/a | 1.0 | raw `cp.th` (hull frame) | (unverified) | n/a | rug handoff (no meetWalk) | none |
| A22 | Pickup worker / drop-off customer | `drawPickupUnit` 83788-83910; `queueHousingEdgeAt` 84413-84528 | the shop worker brings the bag out; the customer at the address door | listed `each: null` (72753-72754) | staff/`custLook` | time-based (`PICKUP_ART.walkMs` 1000, 13326), speed unverified | 1.0 | thW computed (83845) | out of the door (door swing drawn with them, 83796) | own door | **no meetWalk/meetTick** — legacy rug handoff | none |
| A23 | Van vendor (ice-cream hatch) | `drawVanDress` 89997-90007 | vendor framed in the truck hatch | N (registry "next step") | `rosterBody` + accent shirt | static | 0 | Y (`out - π/2`) | inside vehicle | hatch | n/a | n/a |

### B. Maritime Mall

| # | System | Lines | What | Reg | Look | v | Legs | Head | Life | Door | Meet | Sep |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | Mall crowd (MALL_CROWD) | 26191; arrive/leave `mallPlanArrive` 26628, `mallPlanLeave` 26641, `mallPaveFar` 26621; draw `queueMallCrowd` 88426-88446, outside `queueMallThrough` 77612-77626 | shoppers + kid cliques, both floors, plaza, pavement | Y (72773) | `mallLook` (streetLook, aid 'walk') | **0.07** | 1.0 + per-member phase `m.ph` | Y | **exemplar**: pavement gates from past the view's edge (`seen` camera test, 26621-26626); bridge/other gates `hide` at the gate (26647-26651) | street doors via `shopDoorOpen(…, also)` (102072) | n/a | own: passR/sidePed/sideBot (26193-26196); group lat 40 (26631) |
| B2 | Mall staff (server, Shelly mascot, attendant) | 26203; draw 88417-88424, `drawMallStaff` 88668 | loops of stops on the play floors | Y (72789) | `partyLook`; mascot costume | 0.06 / **0.035** / **0.05** | 1.0 (+seed phase) | Y | always there (fixed loop) | n/a | n/a | none |
| B3 | Mall play cast (arcade players, claw kids, Shelly's line) | `mallPlayCast`, drawn by `drawCast` in pieces | standing at games | Y (72799) | `partyLook` | static | n/a | via drawCast | always there | n/a | n/a | n/a |
| B4 | Store reps (STORE_REPS) | 27278-27345; draw 88466-88472 | rep walks from the till to show him out | Y (72808) | `storeRepLook` (rosterBody) | **0.16** (`mallJailWalk` uses `MALL_JAIL.walkV`, 26970) | 1.0 | Y | **appears at the till when he comes in, vanishes at the till when back** (`storeRepAt` returns null when `!R.W` / back+stopped, 27296-27300); no one stands at the till otherwise | n/a | meetWalk (spot) + meetTick (27328-27336) | none |
| B5 | Mall security (MALL_JAIL) + mall rescue crew | 26960-27040, 27043-27080; draw `queueMallJail` 88477-88540, 88452-88463 | guard walks him to the cell; crew walk in from the front doors | Y (72823) | `mallJailLook` = rosterBody + uniforms | **0.16** (26962); rescue 0.18 (27056) | 1.0 | Y | crew from inside the front doors (`b: M.D - 40`, 27053) — doors: unverified; **camera `fadeOut` to black over the walk to the cell** (`mallJailFade` 26995-26999) | office slide doors (MALL_JAIL.door) | meetWalk + meetTick (27113-27139) | none |
| B6 | Marisol, Forno's cook, the ticket line (TIX) | 21470-21640; `queueTix` 88580-88660 via `queueRoomPerson` 88545 | attendant at the ticket exchange; cook walks pizza out | Y only while walking (72834: `tixHerAt` null when at work → **at-work Marisol and the kids' line unlisted**) | `partyLook` | **0.16** walking out (`tixWalk` 21507); at work: ~0.054 | 1.0 | Y, but **at-work heading snaps 0 ↔ π** (88592-88596) | at her counter always | n/a | meetWalk + meetTick (21504, 21597-21603) | none |
| B7 | Luna / goth crew / Luna's mom (GOTH) | 20694-20880; `gothAt` 20727 | mission: crew at the fountain, Luna walks over, later walks to Onda | Y Luna only (72841); crew, mom, `GOTH.exit` walk unlisted (unverified for mom) | `mallLook('goth')` | 0.16 (cakeMeet) / 0.075 exit (20743) | 1.0 | Y | `gothStand` (stand where they are, 20792); mom from `gothHome().door` (Sierra Vista) — door opening: **none found** | n/a | cakeMeet/gothStand + meetTick | none |
| B8 | Ball-pit waders (mall play fx) | `drawPlayFx` 88200-88215 | kids wading the ball pit | N (`beach waders` each null, 73001) | `partyLook(…,'kid')` | Lissajous, not a walk | ×0.6 | via `thW()` helper | always there | n/a | n/a | n/a |

### C. Seabreeze Ballroom

| # | System | Lines | What | Reg | Look | v | Legs | Head | Life | Door | Meet | Sep |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| C1 | Ballroom walkers (BALL_WALK) | 25115-25125, `BALL_LIFE` 25167; draw 82035/82047 → `drawBallWalker` 88749 | waiter + two guests loop the hall | Y (72855) | `partyLook` | 0.07 / 0.06 / 0.065 | 1.0 | Y | always in the hall | n/a | n/a | hold for him (unverified details) |
| C2 | Ballroom guests, bartenders | piece cast via `drawCast` 87742 | seated, at the bar | Y (72862) | `partyLook` | static / bar `BAR_SERVE.v` **0.09** (5493) | pose | via drawCast (`atan2(sb·sinθ, cosθ) - π/2`, 87749) | always there | n/a | n/a | n/a |
| C3 | Kitchen runners (KITCHEN) | 25288-25330; `queueKitchenRunners` 88863 | trays up and down by service lift | Y (72874) | `partyLook(seed,'waiter')` | **0.08** (25289) | 1.0 | Y (via drawBallWalker) | ride the lift (hidden while riding) — good | SVC lift doors | n/a | none |
| C4 | Cake crew (CAKE_UP) | 25439-25530 | Margot + trolley man bring the cake up | Y (72883) | — | **0.085** (25440) | 1.0 | Y | lift | lift | n/a | none |

### D. Tidewater Green (derby)

| # | System | Lines | What | Reg | Look | v | Legs | Head | Life | Door | Meet | Sep |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| D1 | Derby walkers (DERBY_WALK) | 27948-27955, `derbyLifeTick` 27983 (on `performance.now()`); draw 85017-85021 | lemonade queue, kids, a mum | Y (72900) | `partyLook` | 0.055-0.065, kids `DERBY_KID_V` 0.09 (unverified which) | kids ×1.6 | Y | always there; leave via DERBY_LEAVE | gates | n/a | `derbyWalkerBlock` (vs Tipsey) |
| D2 | Derby crowd + judges | `DERBY_CROWD` 27976; drawn as park cast (`drawCast`) | crowd along the run | Y (72909) — **registry th hard-coded 0** (72915) | `partyLook` | static | n/a | via drawCast | always there; leave as D1/A8 | n/a | judge: meetWalk (28719) | n/a |
| D3 | Derby racers walking (DERBY_RACE.walk) + FOURTH judge/engraver | `derbyKidAt` 27811; draw 85025-85039; `drawFourthPerson` 87725 | kids out of the karts to the podium; judge/engraver over to Tipsey | **N** (`each: null`, 73024) | `partyLook(…,'kid')`; judge/engraver partyLook 'dad' | kids **0.09** (27808); judge 0.07 (27619) / meetWalk 0.16 (28701-28719) | kids ×1.0 (not 1.6) and **`moving` forced true** (85038) | Y | out of the kart | n/a | meetWalk + meetTick (28633-28719) | none; **depth +200 hack** on the podium steps (85037) |

### E. Marina General (hospital)

| # | System | Lines | What | Reg | Look | v | Legs | Head | Life | Door | Meet | Sep |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| E1 | Hall walkers (HOSP_HAZ.walk ranges) | 30240-30262; `hospWalkerAt` 30268; `drawHospWalker` 88916; draw 81818-81829, through glass 77666-77684 | people pacing halls | Y (72936) | `streetLook(w.seed,{adult})` (30013) | 0.065 (`WALK.v` 30262, Sir-approved fix) | `q.stride` | Y | always on their range | `hospEdoorTick` reads them (32881) | n/a | HOSP_SEP (30266) |
| E2 | Ground-floor cast (HOSP_CAST: visitor, nurse, porter, patient, paramedics A/B, gurney G, nurse N) | 29855-30060, compile `hospCastCompile` 30014 | scripted loops | Y (as E1) | `hospCastLook` | 0.065 / porter 0.055 / patient 0.03 (stride 0.55) | stride factor | Y | **`fade:'in'` / `fade:'out'` steps** (29877, 29881, 29888, 29890, 29973-29981) drawn through `withAlpha(q.alpha)` (88920, 88948) | E-doors, main doors, glass lift (`nearCar`, 29947) | n/a | HOSP_SEP |
| E3 | Waiting patients (HOSP_WAIT seats) | 30060-30125 | walk in from the pavement, desk, seat, called to a room | Y (as E1) | `hospFolkLook` | 0.065 / slow 0.034 (stride 0.6) | stride | Y | **in from down the street but `fade:'in'` on the way (30114) and `fade:'out'` into the room door (30120)** | main doors | n/a | HOSP_SEP |
| E4 | Room workers (HOSP_WORK) | 30136-30200 | one per room at their furniture | Y (as E1) | hospFolkLook | 0.065×0.85 = 0.055 (30162) | stride | Y | always there | n/a | n/a | HOSP_SEP |
| E5 | Room people (hospInPlan.people) | plan; drawCast | beds, chairs | Y (72945) | `partyLook` | static | n/a | drawCast | always there | n/a | n/a | n/a |
| E6 | Heart run: doctor, flight medic, officer (HOSP_RUN) | 30793-31100; draw 81797-81803, 81752 | out to Tipsey and back | Y (72952) | `rosterBody` + uniforms (87608-87650) | **0.16** (meetWalk) | 1.0 | Y | doctor from `HOSP_DOC.door` (30834, just outside the entrance); **main doors not opened for him** (`hospEdoorTick` lists only `hospInHaz(1).walk`, 32881-32883) — likely pop at the doors (unverified visually); medic from the helicopter step (ok) | none for doctor | meetWalk + meetTick (31029-31095) | none |
| E7 | Hospital errand person (HOSP_ERRAND) | 31300-31320; draw 81830-81834 | someone walks out to Tipsey for an errand | **N** | `partyLook` | `R.v` (31315, unverified value) | 1.0 | Y | from `home` | n/a | meetWalk + meetTick (31292-31313) | none |
| E8 | Hospital security (HOSP_JAIL) | 32988; draw 81836-81845 | guard + crew | **N** | partyLook / mallJailLook | **0.16** (32988) | 1.0 | Y | — | lift/doors unverified | meetWalk + meetTick (33064-33088) | none |
| E9 | Hospital rescue crew (HOSP_RESCUE) | 32907-32975; draw 81847-81852 | two crew walk in through the main doors / out of the glass lift | **N** | mallJailLook | **0.12** (32907) | 1.0 | Y | **alpha ramp 450 ms in/out (32970), drawn at full alpha once > 0.05 (81849): a pop at the doors** | doors not opened for them (32881 lists `hospInHaz(1).walk` only) | n/a | none |
| E10 | X-ray ghosts | `xrayHospHaz` 75346, `xrayHospPeople` 75415 | teal ghosts | — | flat teal | — | — | Y | — | — | — | — (alpha allowed: ghost) |

### F. Not in the world view
- `drawPerson` 22619 (arcade hockey/pop-a-shot mini-canvas): hull on its own projection, `partyLook`. Out of scope for CITY_PEOPLE.
- William (`drawWilliamHull` 86287) = route hazard; listed under route walkers; `williamLook`.

---

## 2. THE NORM

| Property | Norm (most systems / Sir-approved) | Evidence |
|---|---|---|
| Body | `drawPersonHull` with the heading − π/2, look off `streetLook` (directly, or `partyLook`/`rosterBody` + a uniform) | 70 sites; Sir 2026-10-24 "make the mall and ballroom sets of our people" (5408) |
| Look | one look per person, cached on the record (`who.L`, `p.look`, `R.look`); street = `crowdLook`/`folkLook`; venue = `partyLook(seed, kind)`; job = `rosterBody(seed)` + `withAid(UNIFORM)` | 16230-16232, 72666-72667 |
| Pace | `PEOPLE_WALK_V` 0.065; accepted 0.06-0.075 (shoppers 0.075, mall 0.07, hospital 0.065 after Sir's 2026-10-27 fix at 30259) | people.md approved values |
| Legs | `walkSin(t*PEOPLE_ART.walkSpeed + phase)` while `moving`, 0 when standing (clock; correct only at 0.065) | 47 calls |
| Coming and going | **walked in from past the view's edge** (mall `mallPaveFar` 26621, shoppers `offScreen` 101727), **out of their own door that opens for them** (residents `houseDoorsOpen`, shops `shopDoorSwing` + doorway clip `queuePerson`), **out of a car / lift** (errand cars, kitchen runners), or **standing at a post** and walking out/back (Gus, Walter, Margot) | Sir 2026-10-12, 10-22, 10-23 quotes at 101722, 26614-26619 |
| Registry | each population `CITY_PEOPLE.add({ each })` with `cpEntry`, `th` a heading | 72372-73025 |
| Meeting | `meetWalk` → `hospWalkAt` each frame → `meetTick` while standing; leave by setting `M.leave` | CLAUDE.md, 30944-30960 |
| Depth | feet `x + y` (plus room keys indoors) | all queue sites |
| Separation | street: CROWD (`updateCrowd` 101302; r 15+7, Tipsey botR); mall: MALL_CROWD side/pass; hospital: HOSP_SEP | |
| Speech | `npcSay` (51 calls) for chatter, `hospSayCard` for a card | |

---

## 3. OUTLIERS (system × property)

Severity: **H** = visible pop/teleport/fade or wrong pace the owner has complained about; **M** = visible but subtle; **L** = data/consistency.

### 3.1 Coming and going (P1/P2/P3) — owner's #1 complaint
| Sev | System | Lines | What happens | Fix (reuse) | Risk |
|---|---|---|---|---|---|
| H | Hospital cast scripts (E2) | 29877-29981 (7 `fade:'in'`, matching `fade:'out'`), alpha 30030-30043, draw `withAlpha` 88920/88948 | paramedics, visitor, nurse fade in/out at ambulance cab, lift, doorways | replace fade steps with `hide` behind an open door/lift k ≥ .25 (the lift already has `lift:1`; ambulance: hide while the cab door is open) and drop `withAlpha` from `drawHospWalker`/`drawHospPushed`; delete `fade` verb from `hospCastCompile` | M: timings of the scripts shift (fade steps carry ms); HOSP_SEP filters on `alpha < 0.05` (30276) |
| H | Waiting patients (E3) | 30114, 30120 | fade in on the pavement, fade out into the room's door | start further down the pavement off screen (the comment already intends it); end with `hide` once inside the room door (as shoppers' `inside` point) | L |
| H | Hospital rescue crew (E9) | 32970, 81849 | alpha computed then ignored → appear at full alpha at the doors 450 ms after start, doors stay shut | spawn from outside the main doors walking in; add `HOSP_RESCUE` people to `hospEdoorTick`'s `ppl` (32881); remove `alpha` | L |
| H | Mall jail (B5) | 26995-26999 `mallJailFade` | camera fade to black covers the walk to the cell (P2 "no fade to black covers a move") | walk it on screen (already has `mallTrek` paths); same for heart-run end/holding cell (kit flaw 2) | M: mission flow timings |
| H | Store reps (B4) | 27296-27300, 27306-27318 | rep pops into existence at the till when he enters and vanishes there when back; till unmanned otherwise | make the rep a post person like Gus/Walter: `storeRepAt` returns the till post when `!R.W` (copy `cakeWalkerAt` 19990 pattern) | L |
| H | Route/city walkers calling at a SHOP (A1) | 5943-5948, `shopDoorSwing` 102040-102052 | walk 62 into a shut shop door then jump to b=-60000 | add planned walkers (`cityFurnitureNear` people with `_plan`) to `shopDoorSwing`'s want test as `houseDoorsOpen` does (102022-102027), and route them through `queuePerson` doorway clip (they are drawn via `drawProp`, not `queuePerson`) | M: drawProp path is cached-prop-adjacent; check perf |
| H | Knocked route walkers (A1/A10) | 101169 → 6035-6055 | after getting up: legacy flee 250 u in 2.6 s (avg 0.096, peak ~0.13, not checked against solids — P10), then frozen "settled" for the rest of the route, their WALK_PLAN life over | in `knockEnd` for `hazard`, don't set `hitT`; hold the clock instead (`hz._dly += downMs`, as NSS/BW `dly` 18281-18287 and shoppers `hold`) so they walk on from where they fell | M: `hitT` is also read by CROWD (101359 skips `hitT !== undefined`) and knock re-arm |
| H | Sierra Vista guard (A20) | 110259-110263, 110297 | pops out beside the booth and vanishes there; not listed | give the booth a door (or treat the booth as a lift: hide while inside with the door k ≥ .25); add to CITY_PEOPLE | L |
| M | Rosa (A14) | 20530-20540, `houseDoorsOpen` 102010-102028 | walks out of / back into a door that never opens (and isn't drawn through the doorway clip) | add `annivRosaAt` to `houseDoorsOpen`'s `who`; queue her via `queuePerson` | L |
| M | Heart-run doctor (E6) | 30834, 32881 | comes out of / goes back through main doors that don't open for him | include `HOSP_RUN.doc` in `hospEdoorTick` ppl | L |
| M | Errand drivers (A6) | 36414-36419 | appear 62 beside a car with no car-door animation; vanish at non-shop doors | P1 allows "in a car"; a door swing on the car would finish it (none exists — unverified) | M |
| M | Mall seated/booth cast after a knock | 101163-101166 | `knockEnd` repaints them "back in their seat" — the stood-up body jumps to the seat (likely teleport, unverified on screen) | walk back to the seat (seat approach point) before `MALL_CAST_DOWN.delete` | M |
| M | Luna's mom (B7) / GOTH crew | 20708-20710, 20823 | mom from `gothHome().door` — no door opening found; `GOTH.luna = null` at stage 'walk' (20839) then re-created by `cakeMeet` from the crew member's spot (unverified whether she is double-drawn or pops) | verify on screen; add to `houseDoorsOpen` | L |
| L | Boardwalk/NSS "away" ends | 18288 (`away: 3200`) | fixed distance may be inside the view zoomed out (Sir's 2026-10-23 complaint about MALL_PAVE_FAR) | use `mallPaveFar`-style camera test | L |

### 3.2 Pace and legs (P6/P11)
| Sev | System | Lines | Speed | Visible | Fix | Risk |
|---|---|---|---|---|---|---|
| H | Every meet walk: `meetWalk`, `cakeMeet`, `shopDoorMeet`, `tixWalk`, rider meet | 30947, 20047, 19946, 21507, 101534 | `walk/0.16` clamped to 800-3600 ms (short walks slower, long faster) + smoothstep ease in `hospWalkAt` (30969) → peak 1.5×: up to 0.24 u/ms | legs at the 0.065 clock: skate ~3× ("sprinted", already rejected) | replace `/0.16` with `/PEOPLE_WALK_V`, drop the 3600 clamp, ease only the first/last ~200 ms (P6) | **M-H: mission timing.** Meetings take ~2.5× longer; cards open on arrival (`now - G.t0 > G.walkMs`), so waits grow |
| H | `MALL_JAIL.walkV` 0.16 (store reps, guard, mall rescue 0.18), `HOSP_JAIL.walkV` 0.16 | 26962, 27056, 32988 | 0.16-0.18 | skating | `PEOPLE_WALK_V` | as above |
| H | Rescue van crew | 11309 (`walkSpeed: 300` u/s), 11455 (jog 1200 u/s), clamp 600-2000 ms (11887) | 0.3 walk, 1.2 jog | legs: `walkSin(t·0.006·min(2.2,pace))` with pace 1 at 0.3 → ~314 u per stride vs 68 | either slow to a jog (~0.15-0.2) with stride from distance, or keep the hurry but drive legs from distance | M: Sir liked the van's hurry (11320 quote is about the van, not the crew — unverified that crew pace was approved) |
| M | Sierra guard | 110218 | run 0.5, walk 0.14, legs ×1.8 | slide | PEOPLE_WALK_V (+ "joggers run" factor for the run) | L |
| M | Kitchen runners 0.08, cake crew 0.085, bartenders 0.09, derby racer kids 0.09 (legs ×1 not ×1.6), hospital rescue 0.12 | 25289, 25440, 5493, 27808/85038, 32907 | above band | slide | `PEOPLE_WALK_V`×role factor and legs ×(v/0.065) until phase-from-distance lands | L |
| M | Slow walkers: mascot 0.035, attendant 0.05, tourists 0.05, patients 0.03/0.034 | 26206-26208, 18795, 29892, 30093 | below band | march on the spot unless stride set (patients/tourists have a stride factor; mall staff do not) | stride = v/0.065 | L |
| L | Boardwalk per-person speed ×0.85-1.15 but stride per kind | 18832 vs 18795 | ±15% slide | stride × (v/v0) | L |
| ROOT | All systems | 5218, 47 `walkSin` calls | clock phase | — | **kit fix (flaw 3): phase = distance walked ÷ ~68·(1/2π); give `drawPersonHull` a `stepDist` or compute in a `personGait(p, t)` helper** | M: touches every site, but mechanical |

### 3.3 Heading and turning (P7b/P12)
| Sev | System | Lines | Issue | Fix |
|---|---|---|---|---|
| M | `hospWalkAt` (every meet walk, Gus, Walter, Rosa, baker, doctor, officer, rider…) | 30976-30978 | heading snaps from walk direction to `faceTh` on arrival (kit flaw 5) | ease to faceTh over `MEET.turnMs` per π from arrival time |
| M | Marisol at work | 88592-88596 | th jumps 0 ↔ π at each turn of her loop | ease th through the turn |
| M | Sierra guard | 110283 | per-frame hard set, hull-frame th (no −π/2 convention) | store a heading, pass `th − π/2`, ease |
| L | Hull-frame `th` stored by the caller: route walkers (`ang − π/2` at 6001, used raw 94163), crime officers (`o.thW` 81748), boat customer (`cp.th` 78901), Sierra guard (76955), dog owners (in drawDogPair) | | two conventions in one kit (flaw 6) | one `drawPerson(heading, look, state)` wrapper |
| L | Registry `th` wrong for route + city walkers and dog owners | 72684/72694 (`hazWorldAt` th = fq·π/2 + spot.th, spot.th hull frame), 72704 | registry says "a heading"; these are heading − π/2. Police convert (+π/2, 72965), route walkers don't. Derby crowd `th: 0` (72915). A future reader (meet check, bubbles) would face them wrong | add π/2 in those `each`, real facing for the crowd |

### 3.4 Registry and looks (P4/P5)
| Sev | Item | Lines | Fix |
|---|---|---|---|
| H (systemic) | **CITY_PEOPLE has no readers** except `census()`; doors (`shopDoorSwing`, `houseDoorsOpen`, `hospEdoorTick`, `shopDoorOpen`), CROWD (`updateCrowd`), knocks, bubbles each keep private lists — which is exactly why Rosa, the doctor, the hospital crew, VEND_CUST, planned shop callers are missed by doors/separation | 72372 | make the door openers and `updateCrowd` iterate `CITY_PEOPLE.each` (entries carry x, y, moving, hidden, ref) |
| M | Unlisted populations: VEND_CUST (A7), Sierra guard (A20), HOSP_ERRAND (E7), HOSP_JAIL (E8), HOSP_RESCUE (E9), at-work Marisol + ticket kids (B6), GOTH crew/exit/mom (B7), derby racers + FOURTH (D3, `each: null`), pickup worker / drop-off / boat customer (`each: null`), landmark cast, ball-pit/beach waders, van vendor | see tables | add `each` from the same position functions the draws use |
| L | Registry look ≠ drawn look: seekers (`cpStreetLook(seed^0x5c007)` 72723 vs drawn `{adult, aid:'none'}` 81011), errand drivers (72733 vs `{adult, aid:'noWheel'}` 80943), shoppers with a dog (72713 vs `aid:'dog'`), mall mascot (`partyLook 'server'` 72795 vs green costume) | | build the registry look with the draw's own call (store it on the record once: `p._look`) |
| M | Lost-dog owner not a household member | 21365 | seed from the dog → a stranger comes out of a house whose `householdOf` lists other people (P4 "one home") | pick from `householdOf(door).people` (as residents) |
| L | Boat customer clothes overridden by `hb.shirt/hb.pants` | 78882 | a recolour of a roster look (P4) | drop override or make it the look |
| L | Bubble heights in the registry vary (h 102-160) while bodies are 124 (+head) | 72381ff | derive `h` from the build |

### 3.5 Meeting Tipsey (P8 / CLAUDE.md)
| Sev | Item | Lines | Note |
|---|---|---|---|
| M | Two spot pickers: `meetSpot` (30921) and `cakeMeet` (20031) | | cakeMeet forbids the front arc too and scores Tipsey's turn; used by Gus, baker, florist, Rosa, Luna, lost-dog owner. Behaviour differs from meetWalk users (doctor, officer, reps, Marisol). Merge into one `meetSpot` with the cakeMeet rules (Sir's later corrections are in cakeMeet: 2026-10-13, 10-18) |
| M | Pickup worker, drop-off customer, boat customer hand over without meetWalk/meetTick | 83788-83910, 84413-84530, 78878 | legacy rug handoff (Tipsey aligned by the rug). Faces cheated? unverified. Candidates for meetTick at least while standing |
| L | `gothStand` (20792) builds an M with `walkMs: 1` | | fine (stand in place) |
| L | Dog tag read copies meetTick inline | 21338-21350 | could call `meetTick` |

### 3.6 Separation (P9/P10)
| Sev | Item | Lines |
|---|---|---|
| M | Not in CROWD: VEND_CUST customers (queue at a hatch on the pavement), shop-door walkers, lost-dog owner, rider-on-foot, police walker, mall reps/security, hospital doctor/medic | 101345-101360 |
| M | NSS residents and boardwalk strollers swerve round Tipsey only, never each other | 18352-18359, `bwStrollAt` |
| L | Mall group lateral spacing 40 < 2·(15+7)=44 | 26631 |
| L | Legacy flee path not checked against solids | 6035-6055 |

### 3.7 Depth (x+y feet) exceptions
- Derby racer on the podium steps: `+200` (85037) — hack; should be the podium's own ordering.
- Landmark cast is drawn at its piece's depth ± 1e-3 (77784), not their feet (by design, inside the piece).
- Mall/hospital through-glass people are re-sorted under the frame/tile depth (77627-77630, 77688-77689) — by design.
- Mall indoors: room-key `dk` (88437-88441) — by design.

---

## 4. RECIPE: adding a person or crowd so it needs no polishing

Give each person a record with a seed and **one look made once** from the roster (`folkLook`/`crowdLook` for townsfolk, `partyLook(seed, kind)` for a venue, `rosterBody(seed)` + `withAid(UNIFORM, body)` for a job) and store it on the record; give them a **path of points with waits** read by one position function `xxxAt(p, t)` → `{ x, y, z, th (a heading), moving, hidden }` timed at `PEOPLE_WALK_V` (role factor inside 0.06-0.075, joggers excepted) with `dly` for holds — reuse `shopperAt`'s point/wait/`hide` format so CROWD sidesteps them for free (add them to `updateCrowd`'s `ws`). **Start and end every path either past the view's edge (test the camera as `mallPaveFar` does), inside a door that the door system opens for them (add the record to `shopDoorSwing` / `houseDoorsOpen` / `hospEdoorTick`, and queue through `queuePerson` so the doorway clips them), in a car or a lift, or at a fixed post they always stand at** — never a `fade`, never a jump. Register the population with `CITY_PEOPLE.add({ name, where, solid, each })` using the same `xxxAt` and the same look. Draw with `vq.push({ depth: x + y, fn: (g, tt) => this.drawPersonHull(g, x, y, z, th - Math.PI/2, L.build, L.skin, L.shirt, L.pants, L.hair, L.shoe, moving ? walkSin(tt*PEOPLE_ART.walkSpeed + phase) : 0, moving, 0, lift, carry, L.uniform, false, { dress: L.dress, … }) })`, culled with `visProp("people", …)`, drawing into the `g` handed in. If they talk or hand something over, walk them up with `meetWalk(ow, from, t, side, scene)` (read with `hospWalkAt`), call `meetTick(scene, ow, M)` every frame they stand there, set `M.leave` to walk back, speak with `npcSay`/`hospSayCard`, and screenshot the meeting for both faces. Then run `node tools/world_review.js --kit doors,people`.
