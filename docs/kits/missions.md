# Kit 10: Missions (contract v1)

**What this covers:** the story missions (the heart run, the Cake Run, Gus's anniversary, Luna's uniform, High Tide's door, Fourth Place) and anything that becomes one: who asks, where it starts, when it is offered, what is carried, how it ends, and what it gives.

**Evidence:** the mission audit (`docs/state/mission_audit.md`, 2026-10-30): 7 missions, 11 cross-mission faults (X1-X11), the rules R1-R16 Sir approved the same day ("fix them to the rules"; R7: "i think we need the beacons ... keeps it consistent with the pick ups in the game").

**Status codes:** **K** the kit enforces it. **C** each mission has to remember it (a kit flaw).

## The shared pieces (all in `game/index.html`, "THE MISSIONS KIT", beside the meet kit)

| Piece | What it does |
|---|---|
| `MISSIONS` | The registry (R9). One record per story: `name`, `giver`, `window`, `needs`, `places`, `steps`, `reward` (`cents` + `payId`, `trophy`, `skin`, `wear`, `item`, `credits`), and four functions: `busy()`, `item()` (what is carried now and its tip rule), `next()` (the next step, in words), `start(scene)` (where it begins). The mission board (`tpRenderMissions`, "Stories") reads it through `missionState(id)`. |
| `missionBusy(except)` | One story at a time (R3). Every start asks it; the lost dogs' spawn and the shelter pickup wait while it is true. |
| `MISSION_WINDOWS`, `missionWindowOpen(id)`, `missionWindowSay` | The real clock (R4), `NIGHT_CLOCK.time` when set: `any`, `day` 7-17, `evening` 17-20 ("comes at dusk"), `night` 19-5 ("after dark"). Offered only in its window; a started story keeps its time. `missionDayPart()` / `missionMeal()` for lines that name the time. |
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

## What each mission gives, and where it is kept

| Mission (`MISSIONS` id) | Window | Gives | Server (Devvit) |
|---|---|---|---|
| The Heart Run (`heart-run`) | any | Lifeline trophy, Medic skin, $100 once | `TS_MISSIONS`, `heart-hero`, gift/tip `heart` |
| The Cake Run (`cake-run`) | evening | Gala Pass (key item), the bakery's orders | `TS_MISSIONS`; the pass rebuilt from it (`galaPassMigrate`) |
| Gus's Anniversary (`mall-password`) | evening | the mall's front doors | `TS_MISSIONS` |
| Luna's Uniform (`goth-uniform`) | any, after `mall-password` | One of Us trophy, Goth skin (worn), $100 once | `TS_MISSIONS`, `luna-favour` → `goth` (`TS_SKINS`), gift/tip `luna` |
| High Tide's Door (`arcade-card`) | any | the game card, 30 credits | `TS_MISSIONS`; credits and top-ups `api/tipsy/arcade` (db.ts `dbArcade`, `TS_ARCADE`) |
| Fourth Place (`fourth-place`) | any | the First Delivery trophy given away | `TS_MISSIONS` |
| Lost dogs, the shelter (free roam) | any | $20 a dog (capped a day), the homed and sheltered lists | `api/tipsy/dog/rescue` `{key}`, `api/tipsy/dog/shelter` `{key}`; the profile's `dogsHomed`, `shelteredDogs` |

**Console seed lines** (the artifact boots with empty storage):
- `tpProfile.missionsCompleted.add('mall-password'); tpSaveProfile()` (the mall's doors; Luna's story on entering)
- `tpProfile.missionsCompleted.add('cake-run'); tpSaveProfile()` (the Gala Pass, rebuilt on the next frame; the bakery's orders)
- `tpProfile.missionsCompleted.add('goth-uniform'); tpSaveProfile()` (Luna at Onda)
- `tpProfile.missionsCompleted.add('arcade-card'); tpSaveProfile()` (the arcade card; credits: `localStorage.setItem('tipsyArcade', JSON.stringify({pass:true, credits:30}))`)
- `tpProfile.missionsCompleted.add('fourth-place'); tpSaveProfile()` (the derby gone)
- `tpProfile.missionsCompleted.add('heart-run'); tpSaveProfile()` (Lifeline; claim the Medic in the Trophy Case)
- `NIGHT_CLOCK.time = 18` (dusk: the Cake Run and Gus's favour are offered), `NIGHT_CLOCK.time = null` (the real clock)

## Checks (headless, `tools/review/harness.js`)
- Play each mission start to finish; `h.errs` is `[]`.
- A screenshot at every card: both faces show (the speaker in one of the two side arcs, nothing drawn over either).
- An MP4 of every walk (arrivals, leaves, Luna's escalator, the ER doctor).
- A tip-over at each carried step: `spill` fails it with the spill drawn, `crewReturns` says the line and keeps the step.
- Quit (leave the mall, drive off) and reload: nothing of a run in progress is kept; everything earned is.
- Devvit: `python3 tools/build_devvit.py`, `cd tipsey-delivery && npx tsc --build && npm run test:unit` (the 3 `server.test.ts` failures predate this kit: they need a live Redis).

## Known kit flaws (open)
1. `missionNav` is still the per-mission copies (`cakeNav`, `annivNav`, `gothNav`, `tixNav`, `fourthNav`, `hospNav`); with `missionBusy` they no longer fight, but the GPS owner is not enforced.
2. `meetCoverAt` knows the street's buildings and the mall's gallery and front row; other interiors (the ballroom, the hospital, a walk-in) are not yet asked.
3. R2's bay arming is copied in each mission (`R.armed` + `matHighlightState`).
4. The Costa Palma Animal Shelter's door is painted (the worker comes out of a door that does not open): the shelter's entry needs a live door piece (doors.md), out of this kit's reach.
5. R6 on Tipsey himself: what he carries is not drawn on him (only the heart's and cake's spills are drawn).
