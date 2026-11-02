# Kit 10: Missions (contract v1)

**What this covers:** the story missions (the heart run, the Cake Run, Gus's anniversary, Luna's uniform, High Tide's door, Fourth Place) and anything that becomes one: who asks, where it starts, when it is offered, what is carried, how it ends, and what it gives.

**Evidence:** the mission audit (`docs/state/mission_audit.md`, 2026-10-30): 7 missions, 11 cross-mission faults (X1-X11), the rules R1-R16 Sir approved the same day ("fix them to the rules"; R7: "i think we need the beacons ... keeps it consistent with the pick ups in the game").

**Status codes:** **K** the kit enforces it. **C** each mission has to remember it (a kit flaw).

## The shared pieces (all in `game/index.html`, "THE MISSIONS KIT", beside the meet kit)

| Piece | What it does |
|---|---|
| `MISSIONS` | The registry (R9). One record per story: `name`, `giver`, `window`, `needs`, `places`, `steps`, `reward` (`cents` + `payId`, `trophy`, `skin`, `wear`, `item`, `credits`), and four functions: `busy()`, `item()` (what is carried now and its tip rule), `next()` (the next step, in words), `start(scene)` (where it begins). The mission board (`tpRenderMissions`, "Stories") reads it through `missionState(id)`. |
| `missionBusy(except)` | One story at a time (R3). Every start asks it; the lost dogs' spawn and the shelter pickup wait while it is true. |
| `MISSION_WINDOWS`, `missionWindowOpen(id)`, `missionWindowSay` | The real clock (R4), `NIGHT_CLOCK.time` when set: `any`, `day` 7-17, `evening` 17-20 ("comes at dusk"), `night` 19-5 ("after dark"), `shops` 9-16 ("in shop hours": a story whose places are shops that shut at 6), `dusk` 18:30-19:30 ("comes at dusk": the sky's own fade, `NIGHT_CLOCK.from` +- `fade/2`; Sunset Salute, the Surf School next; started, the sky is held at its level by `NIGHT_HOLD` and eased back at the end). Offered only in its window; a started story keeps its time. `missionDayPart()` / `missionMeal()` for lines that name the time. |
| `missionComplete(id)` | What it gives is the server's (R10): `tpCompleteMission(id, 1)` (local, and on Devvit `api/tipsy/mission/complete`, the id in `TS_MISSIONS`), the money once through the server (`missionPay` → `api/tipsy/gift/tip` by `payId`; db.ts `ONCE_TIP_CENTS`), the trophy's claim (`TS_CLAIMABLE_TROPHIES` grants the skin) and the skin worn when `reward.wear`. Prints the console seed line. |
| `missionTipOver(scene)` | A tip-over with a mission's item aboard (R5): `spill` runs the item's `drop` (the heart, the cake), `crewReturns` is handed back by the crew as they lift him ("Dropped this, buddy."), `keep` stays. Called by `owDispatchTipFail`; a crew pass keeps everything. |
| `missionSay` | The one speech card (`hospSayCard`): orange answer, no loop, a grey second answer (R8, R15). |
| `meetSpot` | The one spot picker (R14): both arcs barred, least turn for him, short walk, clear (`owSpotClear`), not hidden by what is drawn (`meetCoverAt`: the x-ray's building heights on the street; the gallery and the front row's shopfronts in the mall), the street's poles and palms a mild cost. `cakeMeet` is its meeting. |
| `meetApproach` + `meetStand` | Someone already standing (a crew, a judge): where he stops so both faces show, and the meeting with no walk (eased turns both ways). |
| `meetWalk` / `meetTick` / `hospWalkAt` | Walk up at `PEOPLE_WALK_V`, eased ends, eased turn on arrival **and on leaving** (the 158° snap is gone). |
| `walkPathAt(P, now)` | The one path walker: polylines (escalators ridden: `ride`), one pace, rounded corners, eased turns at the start (`th0`), the end (`faceTh`) and on the way back (`leave`). TIX, Fourth Place, Luna's walks and the ER doctor use it. |
| `gothDrive` / `gothAutoTick` | The autopilot. Never sets his position: stuck, it steps round (twice, each side), then hands the beat on where he is. |
| `storyFocus` / `dogFocus` / `tipseyFocus` / `orderAboard` / `deliveryHidden` / `storiesHidden` / `dogsLocked` / `deliveryRefused` / `focusTick` | Focus (R17): one thing at a time, only deliveries stack. A story under way hides the deliveries (`tpPickupOffers` and `getMissionMats` empty, no search rows, the card the story's, a pickup GPS leg dropped; `tpRouteToPickup`, `tpPickupHere` refuse: "Finish <story> first."), every other story and the challenges (`storiesHidden`: each story's start bay, beacon and offer, the board's rows, the challenges' mats, map pins and search rows), and no dog can be taken on (`dogsLocked`). An order aboard, or a dog being taken home, hides the stories and challenges only: orders still stack, and one dog can be rescued with orders aboard. It ends quietly: everything back as it was, no toast. |
| `drawPickupBayCached` | A mission's bay through the building cache (R16); its ring and beacon live. |

## The contract (what a mission must do)

| ID | Rule | Status | Check |
|---|---|---|---|
| R1 | Never delete a person: abort, tip, reset and finish walk people off (`leave`); extras exist before and after (Luna's crew). | C | appear/vanish census; a tip mid-meeting |
| R2 | Every beat starts on a drawn, armed bay or mat, re-armed only once he has left it. | C (copied per mission) | headless: stop on it |
| R3 | `missionBusy(id)` before every start. | K (registry) / C (the call) | start two at once: the second waits |
| R4 | A window from `MISSION_WINDOWS`; its places open then (TP_PLACE_COPY hours); time words from the clock. | K / C | `NIGHT_CLOCK.time = 12` and `= 18` |
| R5 | `item()` names the carried thing and its `tip`. | K | tip at each carried step |
| R6 | One item per step, shown in the giver's hand. | C | eye |
| R7 | A beacon over where it sends him, as a pickup's; the GPS into the place. | C | eye |
| R8 | Ask (Accept / Not now), thanks face to face, one completion card (`collectCard`, `#heartWin`). | C | eye |
| R9 | A `MISSIONS` record. | K | the board |
| R10 | `missionComplete(id)`; the id in `TS_MISSIONS`; money, skins, trophies, key items, lists and credits on the server. | K | Devvit: reload with cleared storage |
| R11 | The giver is the place's own person, out of a door that opens. | C | eye; `householdOf` |
| R12 | No fade, cut, zoom snap or teleport; the autopilot never sets his place. | K (autopilot) / C | frame-to-frame jump < 40 |
| R13 | What it leaves behind holds till out of sight (`hospCrashUp`, `FOURTH.hold`). | C | tip beside the crash |
| R14 | Every speaker through the meet kit; every walk through `hospWalkAt` / `walkPathAt`. | K | pace ≤ 0.075, turn ≤ π per 450 ms |
| R15 | Orange answers, no emoji, no loop. | K (CSS) | eye |
| R16 | Still props cached; ring, lights, people live. | C | building cache `live` steady |
| R17 | Focus: one thing at a time; only deliveries stack. A story hides deliveries, other stories, challenges and dog rescues; an order aboard or a dog under way hides stories and challenges; deliveries and one dog mix. Back quietly. | K (`deliveryHidden`, `storiesHidden`, `dogsLocked`) | heart run: no rugs, pins, pickup GPS, other stories' bays or board rows, challenge pins; a lost dog stays put. Order aboard: no story shows, a dog can be rescued. After: all back, no toast |
| R18 | **Built from what exists** (Sir, 2026-11-01): the mission's vehicles are the fleet's and the vehicle art's (`gameCar` kinds), its people the kits' looks and uniforms, its props the kits'; new art only for what doesn't exist. | C | grep before drawing |
| R19 | **Its workers face their work** (Sir, 2026-11-01, KTDE): a giver or clerk at a desk, console or counter stands on its working side facing it (walk-in kit W19); the meeting then turns them to Tipsey. | C | still, zoomed, shell faded |
| R20 | **Its suppliers are near** (the Kart Works re-route, 14 min to 6.5): measure the GPS legs; target 5 min total, swap to a nearer shop of the same kind when one is far. | C | GPS route lengths in the report |

## What each mission gives, and where it is kept

| Mission (`MISSIONS` id) | Window | Gives | Server (Devvit) |
|---|---|---|---|
| The Heart Run (`heart-run`) | any | Lifeline trophy, Medic skin, $100 once | `TS_MISSIONS`, `heart-hero`, gift/tip `heart` |
| The Cake Run (`cake-run`) | evening | Gala Pass (key item), the bakery's orders | `TS_MISSIONS`; the pass rebuilt from it (`galaPassMigrate`) |
| Gus's Anniversary (`mall-password`) | evening | the mall's front doors | `TS_MISSIONS` |
| Luna's Uniform (`goth-uniform`) | any, after `mall-password` | One of Us trophy, Goth skin (worn), $100 once | `TS_MISSIONS`, `luna-favour` → `goth` (`TS_SKINS`), gift/tip `luna` |
| High Tide's Door (`arcade-card`) | any | the game card, 30 credits | `TS_MISSIONS`; credits and top-ups `api/tipsy/arcade` (db.ts `dbArcade`, `TS_ARCADE`) |
| Fourth Place (`fourth-place`) | any | the First Delivery trophy given away | `TS_MISSIONS` |
| Number 4 Builds a Winner (`kart-winner`, after `fourth-place`) | shops | number 4's race bib (key item `bib4`), the Pit Crew trophy, the Racing Stripe skin (worn) | `TS_MISSIONS`, `pit-crew` in `TS_CLAIMABLE_TROPHIES` → `racing-stripe` in `TS_SKINS`; the bib rebuilt from the record (`kwBibMigrate`) |
| The Lighthouse Run (`lighthouse-run`) | any | $50 once, Ines's brass key (key item), the delivery drone (fleet unlock) | `TS_MISSIONS`, gift/tip `lighthouse`; the key rebuilt from the record (`lhKeyMigrate`) |
| Catch of the Day (`catch-of-the-day`) | any | $50 once, the Catch of the Day trophy, the Fishmonger skin (worn), the market's delivery pod lent for the run | `TS_MISSIONS`, `catch-of-the-day` -> `fishmonger` (`TS_SKINS`), gift/tip `fishmkt` |
| Adoption Day (`adoption-day`) | shops (9-16), after 5 dogs sheltered (`lock`) | the Adoption Day trophy, the Paw Print skin (worn), the Dog Rescuer's gold tag (key item; the Dog Rescuer trophy shows gold), the humanoid (fleet unlock, lent for the run) | `TS_MISSIONS`, `adoption-day` -> `pawprint` (`TS_SKINS`); the tag rebuilt from the record (`adTagMigrate`) |
| Sunset Session (`sunset-session`) | dusk | $50 once, the Sunset Session trophy, the Board Shorts skin (worn); the fleet's cargo bot lent for the run | `TS_MISSIONS`, `sunset-session` -> `board-shorts` (`TS_CLAIMABLE_TROPHIES`, `TS_SKINS`), gift/tip `surfschool` (db.ts `SURF_TIP_ID`) |
| The Getaway (`the-getaway`) | day, after `cake-run` | $50 once, Wheels Up trophy, Just Married skin (tin cans), the robotaxi (fleet unlock); spends the Gala Pass | `TS_MISSIONS`, gift/tip `getaway`, `wheels-up` -> `just-married` (`TS_CLAIMABLE_TROPHIES`, `TS_SKINS`); the pass is never rebuilt once spent (`galaPassMigrate` asks `tpCollect.used` and the record) |
| Night Watch (`night-watch`, after `goth-uniform`) | night (19-6, "after dark"; keeps its night once started) | $40 once, Luna's spare gate fob (key item `vistafob`, meant to open Sierra Vista's side gate for later errands), the security patrol robot (fleet unlock, lent for the run) | `TS_MISSIONS`, gift/tip `nightwatch` (db.ts `NIGHTWATCH_TIP_ID`); the fob rebuilt from the record (`nwFobMigrate`) |
| Sunset Salute (`sunset-salute`) | dusk | Walt's challenge coin (key item `coin`), the autonomous shuttle (fleet unlock) | `TS_MISSIONS`; the coin rebuilt from the record (`ssCoinMigrate`) |
| Request Line (`request-line`) | any | $40 once, KTDE's sticker (key item `ktdesticker`); a 3:00 song clock in the timer pill | `TS_MISSIONS`, gift/tip `requestline` (db.ts `REQUEST_TIP_ID`); the sticker rebuilt from the record (`rlStickerMigrate`) |
| Open House (`open-house`, once he has the Fire helmet keepsake: `lock`) | day (7-17) | $40 once, the Open House trophy, the Engine Red skin (worn); spends Tipsey's Fire helmet keepsake (key item `firehelmet`, on the shelf after his first cleared Hydrant Jump: `ohHelmetMigrate`) | `TS_MISSIONS`, `open-house` -> `engine-red` (`TS_CLAIMABLE_TROPHIES`, `TS_SKINS`), gift/tip `openhouse` (db.ts `OPENHOUSE_TIP_ID`); the helmet never rebuilt once spent (`tpCollect.used`, the record) |
| Letters on the Hill (`letters-on-hill`) | dusk (keeps its dusk once started) | $50 once, the Letters on the Hill trophy, the Costa Palma skin (worn); the Fleet's heavy-lift drone lent for the run, flown by the player from its hangar at Sun Deck Airfield (its fleet unlock); the hillside letters all up and floodlit every night after (before: COSTA's S and PALMA's two A's off, the floods dark) | `TS_MISSIONS`, `letters-on-hill` -> `costa-palma` (`TS_CLAIMABLE_TROPHIES`, `TS_SKINS`), gift/tip `letters` (db.ts `LETTERS_TIP_ID`); the letters' state is the record (`cplDone`) |
| Lost dogs, the shelter (free roam) | any | $20 a dog (capped a day), the homed and sheltered lists | `api/tipsy/dog/rescue` `{key}`, `api/tipsy/dog/shelter` `{key}`; the profile's `dogsHomed`, `shelteredDogs` |

**Console seed lines** (the artifact boots with empty storage):
- `tpProfile.missionsCompleted.add('mall-password'); tpSaveProfile()` (the mall's doors; Luna's story on entering)
- `tpProfile.missionsCompleted.add('cake-run'); tpSaveProfile()` (the Gala Pass, rebuilt on the next frame; the bakery's orders)
- `tpProfile.missionsCompleted.add('goth-uniform'); tpSaveProfile()` (Luna at Onda)
- `tpProfile.missionsCompleted.add('arcade-card'); tpSaveProfile()` (the arcade card; credits: `localStorage.setItem('tipsyArcade', JSON.stringify({pass:true, credits:30}))`)
- `tpProfile.missionsCompleted.add('fourth-place'); tpSaveProfile()` (the derby gone)
- `tpProfile.missionsCompleted.add('heart-run'); tpSaveProfile()` (Lifeline; claim the Medic in the Trophy Case)
- `tpProfile.missionsCompleted.add('lighthouse-run'); tpSaveProfile()` (the breakwater light on, Ines's brass key, the drone kept)
- `tpProfile.missionsCompleted.add('catch-of-the-day'); tpSaveProfile()` (the Pelican Fish Market's bay gone; claim the Fishmonger in the Trophy Case)
- `tpProfile.dogsSheltered = 5; tpSaveProfile()` (Adoption Day offered at the animal shelter's bay, in shop hours: `NIGHT_CLOCK.time = 11`)
- `tpProfile.missionsCompleted.add('adoption-day'); tpSaveProfile()` (the banner hung at Paw Point, the Dog Rescuer's gold tag on the shelf, the Dog Rescuer trophy gold; claim the Paw Print in the Trophy Case)
- `tpProfile.missionsCompleted.add('cake-run'); tpSaveProfile(); galaPassMigrate(); NIGHT_CLOCK.time = 10` (The Getaway offered: the Gala Pass in the bag, daytime; stop on the bay east of Sun Deck Airfield's terminal doors)
- `tpProfile.missionsCompleted.add('the-getaway'); tpSaveProfile()` (done: Wheels Up to claim, the robotaxi at Sun Deck Motor Lodge)
- `tpProfile.missionsCompleted.add('fourth-place'); tpSaveProfile(); NIGHT_CLOCK.time = 11` (Number 4 Builds a Winner offered: number 4 by his bale at the derby's course, 9 to 4)
- `tpProfile.missionsCompleted.add('kart-winner'); tpSaveProfile()` (done: number 4's bib in the stash, the Pit Crew trophy to claim, his red kart by his bale)
- `tpProfile.missionsCompleted.add('mall-password'); tpProfile.missionsCompleted.add('goth-uniform'); tpSaveProfile(); NIGHT_CLOCK.time = 22` (Night Watch offered: stop on the bay on the Vista Ridge Security Post's forecourt, up the mall's west-end service way; by day the bay says "after dark")
- `tpProfile.missionsCompleted.add('night-watch'); tpSaveProfile()` (done: the spare gate fob on the shelf, the patrol robot kept, the post's robot charged green)
- `NIGHT_CLOCK.time = 19` (real dusk, 18:30-19:30: Sunset Salute offered; stop on the bay by Walt's bench at the Veterans Memorial, the middle of Veterans Memorial Park, cell 5,5; outside the window Walt says "Come back at dusk, son.")
- `tpProfile.missionsCompleted.add('sunset-salute'); tpSaveProfile()` (done: Eddie Navarro's brass plate and the wreath on the wall, Walt's coin in the stash, the shuttle kept; Walt waves as Tipsey passes)
- `NIGHT_CLOCK.time = 19` (real dusk: Sunset Session offered; Mele walks up to the top of the surf school's walk off Sunset Shore's boardwalk, y 12000, and the bay on the boardwalk beside it (x -1960, y 11800) gets its beacon; at other hours the bay alone and "Sunset Session: comes at dusk.")
- `tpProfile.missionsCompleted.add('sunset-session'); tpSaveProfile()` (done: the bay gone; claim the Board Shorts in the Trophy Case)
- Request Line needs no seed: Ollie waits on the pavement east of Tidewater & Co.'s door (block 4,7's south front, about x 14830, y 24470), any time; stop on the bay by him
- `tpProfile.missionsCompleted.add('request-line'); tpSaveProfile()` (done: Ollie gone home, the KTDE sticker on the shelf)
- `tpProfile.hjBest = 1; tpSaveProfile(); NIGHT_CLOCK.time = 11` (Open House offered: the Fire helmet on the depot's shelf; stop on the bay on The Flats Fire Station's pavement, x 5650, y 20420, and Captain Brennan comes out of its door; grab the helmet from the garage at The Flats Charging 4)
- `tpProfile.missionsCompleted.add('open-house'); tpSaveProfile()` (done: the helmet spent, the captain back at her timing post in the training yard; claim the Engine Red in the Trophy Case)
- `NIGHT_CLOCK.time = 19` (real dusk: Letters on the Hill offered; Hollis Vance, the sign contractor, and Wren Ochoa, the rigger, on the letters' park's pavement east of Tide Pool Elementary, the first semiflat with its letter at the kerb and the hillside crew on the shelves (all latched in only while unseen) -- and the bay is on the park's pavement, x 29180, y -620; before it the second A of PALMA is off and the floods are dark)
- `tpProfile.missionsCompleted.add('letters-on-hill'); tpSaveProfile(); NIGHT_CLOCK.time = 22` (done: COSTA PALMA all up and floodlit; claim the Costa Palma skin in the Trophy Case)
- `NIGHT_CLOCK.time = 18` (dusk: the Cake Run and Gus's favour are offered), `NIGHT_CLOCK.time = null` (the real clock)

## Checks (headless, `tools/review/harness.js`)
- Play each mission start to finish; `h.errs` is `[]`.
- A screenshot at every card: both faces show (the speaker in one of the two side arcs, nothing drawn over either).
- An MP4 of every walk (arrivals, leaves, Luna's escalator, the ER doctor).
- A tip-over at each carried step: `spill` fails it with the spill drawn, `crewReturns` says the line and keeps the step.
- Quit (leave the mall, drive off) and reload: nothing of a run in progress is kept; everything earned is.
- Devvit: `python3 tools/build_devvit.py`, `cd tipsey-delivery && npx tsc --build && npm run test:unit` (the 3 `server.test.ts` failures predate this kit: they need a live Redis).

**A locker handover** (Catch of the Day): the pod's upper locker k opens as the person stands at its seen side (`fmPodSide`: the flank toward the eye), what goes in or out changes at the door's widest (`fmLockerOpen`, `fmPodData` read by drawAvPod), and it shuts before they leave.
**A clock in the story's own words** (The Getaway): the heart run's way -- a start time (`GETAWAY.t0`, at the ask), a limit (`GW_RUN.limitMs`, the bride's six minutes), the time and par on the one card (`#heartWin`); the pill is the Lighthouse Run's `#lhTimer` (whoever's clock runs owns it: `gwClockOn`); extra time gifts add to it (`giftClockRunning`). A story that ends with a departure eases the camera toward it (`gwCamLook`: the follow's own ease toward a point, never a cut) while he stays where it is watched from.

**A mission lock of its own** (Adoption Day): a record's `lock()` returns the board's line while it is not offered ("After 5 dogs at the shelter (3 so far)"), or null; `missionState` reads it after `needs`.

**A walked escort** (Adoption Day): the humanoid lent (`FLEET_LOAN 'humanoid'`, Tipsey parked still and cached, the camera kept across the swap so it eases: no snap), the dog on a lead from his hand (`ppLeash`), LOST_DOG's rules for pace: over `AD_RUN.fastV` for `fastMs` and she slips it and bolts along the pavement; back with LOST_DOG's slow approach and hold. The loan ends beside Tipsey and the humanoid walks off past the view's edge.

**A mission that lends a fleet vehicle** (The Lighthouse Run): `FLEET_LOAN` names the kind (`fleetCur` reads it first; never saved), Tipsey parks still on a visitor bay (cached), the vehicle launches from its own bay as Play does (`flyOnPlay`), and the loan ends with it back in its bay, door down, and him where he parked. Whoever meets a drone stands off its rotors (`lhMeetWalk`'s gap).

## Known kit flaws (open)
1. `missionNav` is still the per-mission copies (`cakeNav`, `annivNav`, `gothNav`, `tixNav`, `fourthNav`, `hospNav`); with `missionBusy` they no longer fight, but the GPS owner is not enforced.
2. `meetCoverAt` knows the street's buildings and the mall's gallery and front row; other interiors (the ballroom, the hospital, a walk-in) are not yet asked.
3. R2's bay arming is copied in each mission (`R.armed` + `matHighlightState`).
4. The Costa Palma Animal Shelter's door is painted (the worker comes out of a door that does not open): the shelter's entry needs a live door piece (doors.md), out of this kit's reach.
5. R6 on Tipsey himself: what he carries is not drawn on him (only the heart's and cake's spills are drawn).

**A clerk who waits at a post** (Number 4 Builds a Winner: Palmline Nursery's, out of the potting hut through the front
gate; Dune Home & Garden's, out of the slide doors into the forecourt): he walks out of his door along a path to a post
by the story's bay (`KW_RUN.nur` / `KW_RUN.dune`: path, face, bay; `kwPostAt`, set off as Tipsey comes within 7000; the
bay arms only once the clerk is at his post), so the meeting shows both faces, even where the door itself faces away or
sits back behind a gate; afterwards he walks back the same way and in. Keep a story's shops within a couple of blocks:
Number 4 Builds a Winner went from about 112k units of road (Palmline Bikes, Breakwater Hardware) to about 35k.
**A story at real dusk** (Sunset Salute): `window: 'dusk'` (`MISSION_WINDOWS.dusk`, the sky's 18:30-19:30 fade); outside it
the bay is drawn without its beacon and the giver says when to come back. Once accepted the sky keeps its dusk to the end
(`NIGHT_HOLD.v` held, eased back over 2.5 s at the end) and a set piece waits on the story's own clock (`SS.salT`,
`SS.tapsT`), never on the sky. Shops a story needs after their hours stay open for it (`missionLatePlace`: the place card
reads "Open late tonight"). Keep its shops near: the brief's Seabreeze Library / Trophies / Florist were 33k-38k of road
from the memorial each; the Marina Office, Cove Locksmith and Tidewater & Co. on block 4,7 make the whole run about 17k (GPS legs 4.6k + 0.7k + 1.5k + 7.0k, and 1.6k of lawn each way between the park's corner and the bench).
**A giver who sits** (Walt): seated on the city's bench (`pose.sit`), he rises over `SS_RUN.riseMs` (sitting, leaning
forward, then standing with `pose.drop` easing out), walks round the bench's end (`walkPathAt`), and only then the meet kit
takes him (`meetWalk` from the bench's end; `meetTick` waits for `M.t0`); afterwards back round the end and down again.
**A story with a set piece on a slope** (its test run down the derby's ramp): the bay up on the start platform takes the
deck's height (`drawPickupBay`'s `bz`, the beacon's `dz`), and the autopilot can take him at his full pace
(`GOTH.auto.max`).

**A loan into a robot that is already there** (Night Watch): the post's patrol robot sits flat on its dock (pad 1, red light);
Tipsey stops on the pad beside it (pad 2), shares his charge (2.6 s, its light amber) and the loan starts *in that robot*
(`FLEET_LOAN 'patrolbot'`, `owStandUpAt` at its pad, camera kept), Tipsey parked and cached on pad 2. The patrol's camera
points are passes, not stops: a pair of the Cone Slalom's blue-banded cones each (cached), the beacon alone over the next,
crossed northbound between them. After dark a torch (three glow layers and a pool, `glowInWorld`, keyed just under the
robot) lights the gravel ahead. Someone met mid-patrol walks to the meet kit's spot beside the robot (`meetWalk`, side
toward the wall) rather than being met where they stood behind it.
**A fleet loan on the sand, two trips** (Sunset Session): the cargo bot called in from past the view's edge to a bay beside
Tipsey (`FLEET_LOAN 'cargobot'`, Tipsey parked and cached, the camera kept), its lid opened on the story's own clock for a
bulky load (`surfLid`, `SSN.lid`: open, the load in or out at the widest, back to resting) and resting open on what it carries
(`surfBotData` -> the cargobot art's `data.boards`); whoever loads it walks round to its seen flank (`surfWalkToBot`). Keep
the supplier within a couple of thousand of the bay when there are two trips: Palmline Surf Co.'s shop is 15.4k of road
from the school each way (two trips about 14 minutes), so its beach stand up the sand supplies it (legs 1,220 by the GPS).


**A song on the clock** (Request Line): the story's set piece runs on a timer the player can see (`#lhTimer`, whoever's clock runs owns it: `rlClockOn`, as `gwClockOn`); the errand races it, and running out starts the story over at its giver, nothing kept. Extra time gifts add to it (`giftClockRunning`). Its shops were swapped for the nearest of each kind (Cove Creamery and Low Tide Records, block 3,1, are ~28k of road from KTDE): Tidewater & Co.'s pavement for the kid, Low Tide Music (4,7, its door away from the camera: the clerk walks round the corner to a post on the east pavement, `rlClerkPath`).

**KTDE on its whole block** (Sir, 2026-11-01): the station fills block 5,8 and its walk-in the whole ground floor (`KTDE_ROOM`, 1516 x 1516, wall to wall with the shell, its rounded corner a curved wall): the Request Line's bays are `KTDE_ROOM.lobbyBay` (in front of the reception desk, where the receptionist shows at zoom 1) and `studioBay` (across the screen from the DJ: a + b the same as his post). Its GPS legs re-measured: 1.7k + 6.6k + 4.8k + 2.9k (ETA about 3.5 min).
**A drill against the clock** (Open House): Cone Slalom's gates (a pair of cones across a lane, cached while the drill runs, solid; the beacon alone over the next, reached within `GATE_W/2`) and a stopwatch counting up in the timer pill (`#lhTimer`, `ohClockOn`; the Lighthouse Run's pill steps aside for it), the record on the captain's card. A keepsake spent by a story (Fourth Place's trophy, The Getaway's pass, Open House's helmet) stays in the bag until the story ends, so a reload mid-run never loses it.

**A set piece in a lent flyer, several times over** (Letters on the Hill, Sir's round of 2026-11-02): the giver is the one in charge of the job -- Hollis Vance, the sign contractor, stood up by the air-lift company -- and on Accept the player is at once the fleet vehicle at its own base (FLEET_LOAN at the hangar, flyOnPlay, the camera easing across; Tipsey parked on the bay, cached), flying it to the site as the player. The loads come on a convoy: three of the vehicle art's `semiflat` (an 18-wheeler with an open flatbed trailer), one letter each on an A-frame, parked in turn at the kerb; the rigger (Wren Ochoa) hooks each to the sling face to face with the drone; as it lifts, the empty truck pulls away along the street past the view's edge and the next pulls up in its place (eased, never popping). Each letter's beacon is its own gap's; a wrong gap is a crew line, never a fail; the hillside crew (Pilar Quintero, Lowell Duarte) walk to the gap as the letter lifts, catch it, bolt it, facing it. Timing (headless runs slow, below 25 fps, and owStep takes at most 40 ms a frame, so the flights are timed in the physics' own clock -- the frames' capped steps summed -- and the walks, cards, lift, set piece and lights in game time): his walk and card 5 s, the drone out of its lane and up 7 s, the hangar to the kerb (21.1k) 97 s, each hook-up 5 s and lift 2.3 s, kerb to gap 12-19 s, each set piece 7-16 s (the S's 34 s: the crew walk down to the first shelf), back to the kerb 13-17 s, the lights 7 s: about 4:30 at a straight stick on a 60 fps device, plus reading the cards. Par 6:00. Headless wall clock for the same run: 5:59.