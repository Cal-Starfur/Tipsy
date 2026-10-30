# Mission audit (2026-10-30, branch consistency-pass; fix status in section 5)

Scope: every story mission in `game/index.html`: Cake Run (`CAKE_RUN`), Gus's anniversary (`MALL_GUARD` + `ANNIV`), Luna's uniform (`GOTH`), lost dogs and the shelter (`LOST`, `SHELTER`), High Tide's door (`TIX`), Fourth Place (`FOURTH`), the heart run (`HOSP_RUN`). The consequence flows (`MALL_JAIL`, `HOSP_JAIL`) are mentioned where they share a fault. The side missions (Hydrant Jump, Cone Slalom) are courses, not stories, and are out of scope.

Line numbers move (another session is editing), so evidence is given as function or const plus a grep-able snippet.

Evidence images are in `/tmp/claude-0/-home-user-Tipsy/ba48993d-c3a4-502b-a1e7-e93bda303261/scratchpad/missions/img/`. Headless note: `zoomSet` needs an integer (1, 2 or 3). A fractional zoom blanks the world, and Playwright's page screenshot misses the WebGL world, so `game.renderer.snapshot` is used (`lib.js`).

Severity:
- **H**: Sir has complained about this before (a pop, a fade, a teleport), or saved progress is lost.
- **M**: visible but subtle, or a rule broken in a way that will be copied.
- **L**: data or consistency.

---

## 0. Shared machinery (what every mission uses)

| Piece | What it does | Status |
|---|---|---|
| `meetWalk` / `meetSpot` / `meetTick` / `hospWalkAt` | The face-to-face kit. | The pace was fixed today: `meetWalkMs` runs at `PEOPLE_WALK_V`, and the measured peak is 0.065. The arrival turn eases. **The leave turn still snaps** (see X1). |
| `cakeMeet` / `shopDoorMeet` | A second spot picker: both arcs barred, scored on least turn for Tipsey, palms as cover. | Used by Gus, Walter, Margot, the baker and florist, Rosa, Luna, Luna's mom and the dog owner. `meetSpot` is used by the doctor, medic, officer, Marisol and the engraver. There are still two pickers (state/people.md 3.5), and neither knows about walls, fascias or glass (X2). |
| `hospSayCard` | The one speech card for every mission: a typed rhythm, the answer button over Tipsey, `no` as a second answer. | Good: it is shared. The name is misleading. The answer is red `#e0303c` with an infinite `dcNudge` (X9). |
| `gothDrive` / `gothAutoTick` | The autopilot that GOTH, TIX, FOURTH, the vault and the lifts all use. | Stuck for 1.8 s, it teleports Tipsey (`if(d >= 28){ ow.px = A.x; ow.py = A.y; }`) (X7). |
| `xxxNav` / `xxxNavClear` | Seven copies (`cakeNav`, `annivNav`, `gothNav`, `tixNav`, `fourthNav`, `hospNav`, lost dog) over the one `gpsNav` slot. | The missions overwrite each other's GPS (X5). |
| `cineBars` | Letterbox for the scenes GOTH, TIX, FOURTH and the heart ending take over. | OK. |
| Trigger | Stop on a bay or mat (`matHighlightState(...)==="armed"`), re-armed only once off it (`R.armed`). | Consistent in every mission: a norm to write down (R2). |
| Completion | `tpProfile.missionsCompleted.add(id)` + `tpSaveProfile()`. | Only `heart-run` is on the server (`TS_MISSIONS` in `tipsey-delivery/src/server/tpcatalog.ts`). See X3. |
| Tip-over | `owDispatchTipFail`: `collectLose(); hospHeartDrop(scene); cakeRunDrop(scene);` | Only two missions have a policy (X4). |

---

## 1. Per mission

### 1.1 Cake Run (`CAKE_RUN`, Sandpiper Bakery to the Seabreeze Ballroom kitchen)

**Beats:**
1. idle: the bay on the bakery's own pickup rug, with a cake beacon.
2. brief: the baker comes out of the shop door (`shopDoorMeet`, via the doorway) with the box. Card, "Got it!".
3. carry: GPS to the ballroom front. Walter is on his burgundy mat (`BALL_MAT`), and he comes over (`cakeMeet`): "round the back".
4. back: GPS to the sidewalk lift (`VAULT`, `sceneDissolve`, no black). Down to the kitchen; Margot (`cakeMeet`) takes it.
5. done.

**People:** the baker (`SHOP_STAFF`, shared with pickups: good), Walter (`DOORMAN_UNIFORM`, post), Margot (post in the kitchen). All three are registered ('shop door walkers', 'Walter and Margot').

**Items:** the cake (carried; spills on a tip: `cakeRunDrop` + `CAKE_SPILL`). Reward: the Gala Pass (`galaPassGive` to `tpCollect`, `KEY_ITEMS`), `missionsCompleted 'cake-run'`, and the bakery's orders unlock (`shopTakesOrders`).

**Save:** only the pass. A run in progress is not saved, which is stated.

**Timers:** none, though the story is "the reception starts any minute".

| Sev | Violation | Evidence | Fix |
|---|---|---|---|
| H | **Devvit loses the reward.** `cakeDone` only does `tpProfile.missionsCompleted.add('cake-run'); tpSaveProfile()`. There is no `tpCompleteMission`, and 'cake-run' is not in `TS_MISSIONS`. The Gala Pass lives in `localStorage 'tp_collect1'` (`collectSave`). The Devvit webview's storage "does not reliably persist" (the code's own slalom comment says so). | `cakeDone`, `galaPassGive`, `tpcatalog.ts TS_MISSIONS` | Add 'cake-run' to `TS_MISSIONS`, call `tpCompleteMission('cake-run',1)`, and rebuild the pass from `missionsCompleted` (as `galaPassMigrate` already does). |
| M | **A tip mid-meeting pops Walter or Margot.** `cakeRunDrop` sets `R.door = null; R.planner = null`, so `cakeDoormanAt` jumps him to `B.post`. Measured: a 49-unit jump at the end of his walk, and more mid-walk. | `cakeRunDrop`: `R.stage = 'idle'; R.armed = true; R.door = null; R.planner = null;` | Set `.leave = now` and let them walk back (as `cakeDoorDone` does). |
| M | **Time of day.** Walter says "Good evening… a private event tonight", and the reception "starts any minute". But the bakery's card hours are **6–15** and the ballroom's are **18–24**. The run starts at any hour: the baker comes out at 3 a.m. and the wedding is on at 10 a.m. | `cakeRunTick` (no clock test), `TP_PLACE_COPY` hours (measured) | Owner decision: gate the trigger on `nightLevel()` (dusk/evening window) and let a started run keep its time. A pick-up place must be open, or the story names why it isn't (the baker stayed late, as `pk.late()`). |
| L | The bays draw live every frame: `drawPickupBay(...)` in `hazVQ` for the cake bay. The ring animates, but the bay itself is still. | the `bk` block in the world queue | Cache the bay with `bcDraw` and keep only `drawMatHighlight` live. (Ordinary pickup rugs do the same, so fix it in the kit.) |
| L | The card and toast talk about an emergency, but there is no clock. Compare the heart run, which has a par. | `cakeTake` toast "before the reception" | Either a par, or drop the urgency. |

### 1.2 Gus's anniversary (`MALL_GUARD`, `ANNIV`)

**Beats:**
1. idle: stop on the mall doors' blue mats without the password. Gus walks over (`cakeMeet`) and asks the favour. "I'll do it!" / "Not now" (good: a second answer).
2. flowers: the Seabreeze Florist bay; the florist comes out of the door with the roses.
3. cake: the bakery bay; the baker brings out a cake.
4. deliver: Rosa's mat on Hollyhock Lane. Rosa comes out of her house door (`houseDoorsOpen` includes `annivRosaAt`: fixed since the last audit) and gives a note.
5. note: back to Gus. He reads it and cries (`drawTears`). The password (`'mall-password'`), and the front doors open.

**Items:** roses, then cake, then a note (`has` in hand), and the password (saved).

| Sev | Violation | Evidence | Fix |
|---|---|---|---|
| H | **Devvit loses the password.** It is the same as the cake: `annivDone` only adds `'mall-password'` locally, with no `tpCompleteMission` and no `TS_MISSIONS` entry. The mall's front doors and the whole GOTH chain hang on it (`gothTick`: `!mallPasswordOwned()`). | `annivDone` | As for the cake. |
| M | **Night story with no clock.** "Tonight's ten years… I'm stuck on this door till close", and Rosa is "dressed for the dinner". It plays at noon. The florist closes at 18 and the bakery at 15. | `annivGuardSays` | Gate on the evening window. The florist and bakery need to be open at that hour, or the pick-ups move. |
| M | **Tip-over policy is undefined.** Roses, cake and the note survive any tip, while the cake run's cake spills. Nothing is said or shown. | `owDispatchTipFail` calls only `hospHeartDrop`, `cakeRunDrop` | Declare a per-item policy (R5). keepsakes.md says story items are handed back by the crew, face to face. |
| L | The roses and the cake are two items in one bag, with no visual of what is aboard (the cake run shows the box). | `annivTake` | One item per step, shown (R6). |
| L | No reward card: a toast only ("You and Gus are friends now!"). The heart run has `heartWin`, and the cake run has `collectCard`. | `annivDone` | One completion card (R8). |

### 1.3 Luna's uniform (`GOTH`)

**Beats:**
1. drive: the first time in the mall with the password, the autopilot takes him to the fountain, with cine bars.
2. taunt: Luna (`gothStand`).
3. friend: Raven.
4. walk: autopilot away.
5. ask: Luna catches up (`cakeMeet`).
6. fetch: GPS to her mom's in "Sierra Vista". The mom comes out with the bag.
7. return / meet: Luna is upstairs in the arcade's far corner. $100 and the Goth skin (`'goth-uniform'`).
8. done: Luna walks out to Gelateria Onda and is later at its doorway in pink.

**Evidence images:**
- `img/cmp_g_start.png` (outside; first frame inside; taunt)
- `img/cmp_g_accept.png` (ask, accept, +6 s)
- `img/g3_ask.png`

| Sev | Violation | Evidence | Fix |
|---|---|---|---|
| H | **Devvit loses the reward.** `gothFinish` calls `tpCompleteMission('goth-uniform',1)`, but the server rejects it: 'goth-uniform' is not in `TS_MISSIONS`, so it is "not a recordable mission". It then claims `'luna-favour'` (not in the server trophy catalog) and equips `'goth'` (not in `TS_SKINS`). The **$100 goes to the local `walletCents` only**, but on Devvit the server owns the wallet (`heartPayTip` and the dog rescue both go through the server). The next profile sync takes back the money, the skin and the completion, and the mission replays. | `gothFinish`; `tpcatalog.ts` TS_MISSIONS / TS_SKINS | Add the mission, trophy and skin to the server, and pay through a server endpoint (`api/tipsy/gift/tip`-style, once ever). |
| H | **The crew pop.** They are created at full alpha the instant he crosses the door (`gothStart`: `GOTH.crew = { mem, px, py }`) and dropped the instant he accepts (`queueGoth` draws them only while `intro`). Luna's walk back ends at the crew's spot and she vanishes (`gothAt` returns null when `!M.stay`); in the same instant she is drawn waiting upstairs (`if((st === 'fetch' \|\| st === 'return') && !R.luna)`). | `img/cmp_g_start.png`: the crew are already standing in the first frame inside. `gothStart`, `queueGoth` | Make the crew a mall population that exists before and after: they hang out at the fountain, and after the favour they wander off the view's edge or into American Gothic. Luna walks to the escalator and up to the arcade (her exit path code, `gothExitPath`, already does this kind of walk). |
| H | **Luna's mom comes out of a door that never opens.** `GOTH_HOME_SPOT` is hand-typed world coordinates (`{ x: 3540, y: -5244, door: {...} }`). Measured: the nearest `homeDoorsOf` door is **7,970 units** away, so `houseDoorsOpen`'s new `gothMomAt` entry can never open anything. She is also not in `CITY_PEOPLE`. | `GOTH_HOME_SPOT`, `houseDoorsOpen` (`for(const f of [annivRosaAt, gothMomAt])`) | Pick the house from the library (as `annivHome` does), use its `houseDoorOf`, take the mom from that house's `householdOf`, and register her. |
| M | **Faces in the meetings.** At the taunt, `gothStand` places Luna "to the camera's side of him" (`if(px + py < 0){ px = -px; py = -py; }`), which is the front arc `meetSpot` forbids, so her back is to the camera. At the ask, `cakeMeet` put her behind the SWELL shopfront's fascia: only her hair shows, and Tipsey is half under it too. | `img/g3_ask.png`; `gothStart`, `gothStand` (no `meetCheat`) | Use the one meet kit for every speaker, and make it test the real scene (X2). |
| M | **The crew stand where nothing was checked.** `C = F + d*300 + p*230` and the members at fixed offsets, with no `owSpotClear` (the way-on point `T2` *is* checked). In the shots they stand against the entrance vestibule's glass. | `gothStart` | Clear each spot (r 22) and keep them out of the door lanes. |
| M | **Luna stands in Onda's doorway** "handing out tasters (the counter hid her)". LOOK_RULES 7: "Nobody stands in a doorway." After the 5 s change she appears there in pink, with no walk from the back (`{ pink: true }`): a pop. | `GOTH_ONDA` comment, `gothExitAt` | Give Onda a counter post (`walkinStaff`-style) where she is seen through its opening (W11), and walk her from the back to it. |
| M | **Autopilot teleport** (X7) during drive and walk. | `gothAutoTick` | |
| L | Not registered: the crew, the mom, Luna on her exit walk and Luna at Onda. The registry's 'Luna' entry reads only `gothLunaAt`. | `CITY_PEOPLE.add({ name: 'Luna'` | |
| L | The return GPS points at the mall's front door (`mallGuardPost`) even when he is already inside. | `gothMomDone` | Navigate to the arcade (the GPS works in the mall: TIX uses it). |

### 1.4 Lost dogs and the shelter (`LOST`, `SHELTER`)

**Beats (lost dog):**
1. lost: spawned off-screen, pacing and whimpering.
2. Roll up slowly (a bolt if too fast).
3. greet, then tag: the card shows the address.
4. follow: GPS home.
5. owner: out of the house (`cakeMeet`) through the door (`lostDogAtDoor` opens it). A tip of $20, the count `dogsRescued`, `dogsHomed` (permanent).

**Shelter:** the same flow, the worker in scrubs, no tip; `dogsSheltered`, `shelteredDogs` (permanent).

**Good:**
- It spawns off-screen (`offScreen`).
- It is Devvit-paid through the server (`api/tipsy/dog/rescue`, capped per day).
- The tag-read turn copies `meetTick`.

| Sev | Violation | Evidence | Fix |
|---|---|---|---|
| M | **The shelter worker walks out of a painted door.** The shelter's LIB entry has only `marks: { door: [1564, -1000] }` and no live door. `houseDoorsOpen` only opens `homeDoorsOf` doors, so `lostDogAtDoor` opens nothing. LOOK 5: "A painted door can't open, so whoever uses it pops." | `SHELTER`, the 'Costa Palma Animal Shelter' entry | Give it a kit door (`shopDoor`/`slideDoors`) and add the worker to its opener. |
| M | **The owner is a stranger to the house.** `seed: (D.seed ^ 0x0d06)` with `streetLook`, not the house's `householdOf` (P4, still open from state/people.md 3.4). | `lostDogTick` 'owner' | Pick from `householdOf(door).people`. |
| M | **Devvit loses `dogsHomed` and `shelteredDogs`.** The server keeps only `dogsRescued` (`db.ts`). After a storage loss, homed dogs are lost again and sheltered strays walk the streets again. The tally lines ("3 of 8 loose dogs safe") go wrong. | `tpSaveProfile`, `db.ts` | Store both lists server-side. |
| L | The dialogue ignores the clock: "the kids have been crying all morning" at 11 p.m. | `lostDogSays` | Choose lines by `nightLevel()`/hour (R4). |
| L | `lostDogTagRead` sets the GPS only if no GPS is running (`!(gpsNav)`), so with another mission's GPS active the dog's home is silently not navigated. | `lostDogTagRead` | One mission at a time (R3), or tell the player. |

### 1.5 High Tide's door (`TIX`, Marisol, Forno's cook)

**Beats:**
1. stop: past `TIX_GATE_A` upstairs without a card. Cine bars; autopilot to a talk spot. Marisol comes round the island (`tixWalk`, a `meetWalk` side).
2. lunch: he is put back out; GPS to Forno Marino.
3. pickup: Forno's bay; the cook comes out with the pizza. No words (deliberate: none through the floor).
4. deliver.
5. thanks: 30 credits on a High Tide card (`localStorage 'tipsyArcade'`).

| Sev | Violation | Evidence | Fix |
|---|---|---|---|
| H | **Devvit: the pass and the credits are browser-only** (`tixState`/`tixSave` on `TIX_KEY`). The top-up takes $5 from the local `walletCents` (`tixSpend`), which the server owns on Devvit, so the server refunds it on sync or the two disagree. | `tixSpend`, `tixFinish` | Put the pass in `missionsCompleted` (server), and the credits and top-up through a server endpoint. |
| M | **Marisol and the cook skate and snap.** `tixWalkAt` eases the whole walk with smoothstep (`e = k*k*(3 - 2*k)`). Measured peak **0.096** against `PEOPLE_WALK_V` 0.065, average 0.064 (P6). Heading: `th: moving ? … : M.faceTh` with no eased turn on arrival, and dir+π at once on leave (P12). | `tixWalkAt` | Read the walk with `hospWalkAt` (it takes `via`; extend it to a polyline), not a private reader. |
| M | **The cook appears from the kitchen behind Forno's counter.** Unverified whether a cook stands at Forno's counter at other times. If not, he pops and the counter is unstaffed (W15: "One staff member per counter"). | `TIX_COOK_WAY` | Give every food-court counter a `walkinStaff` post, and let TIX borrow the cook (`awayAt`, as FOURTH borrows the engraver). |
| L | The registry lists Marisol only while she is on the mission walk, not at work at her counter (`queueTix` 'AT WORK' loop, whose heading jumps 0↔π). | `CITY_PEOPLE 'Marisol and the cook'` | |
| L | Lunch at any hour ("I'm starving… lunch") (R4). | `tixTick` card | |
| L | **Emoji in the PLAY card** (`ARC_GAMES` names `'\u{1F98C} BUCK RIDGE'` …), against the taste rule "no emoji". | `ARC_GAMES` | Plain names. |

### 1.6 Fourth Place (`FOURTH`: judges, engraver, Seabreeze Trophies)

**Beats:**
1. ask: under the judges' tent after the presentation. Tipsey overhears the two judges (`FOURTH_TALK`, `npcSay`, cine bars).
2. idea: a thought bubble with Accept / Not now (good).
3. need: no First Delivery trophy yet, so he is told how to earn it (good, as keepsakes.md asks).
4. garage: the depot pad, the door down, tap the cup on the wall ("Take it"). The GPS flag is cleared on the pad (Sir: "we dont need the red flag").
5. shop: drive in through the mat (pocket, `POCKET_VIEW`). The engraver meets him (`meetWalk`, `trophyMeetSide`): a conversation in `npcSay` lines, then the card.
6. engrave: the engraver walks to the bench (`FOURTH_V` 0.07).
7. engraved / deliver: back to the judge under the tent.
8. thanks / give: the judge walks it to number 4, with Tipsey's autopilot following to watch.
9. done: `'fourth-place'`; the derby is held (`FOURTH.hold`) until he leaves, then the families leave by car (`DERBY_LEAVE`).

**Good (norms to mandate):**
- `walkinStaff` 'engraver' has `awayAt: now => fourthEngAt(now)` and `lookFn` (the story borrows the room's own person, in the same body).
- The shop stays open for him (`pk.late()`).
- The world change waits off camera (`FOURTH.hold`, `derbyLeaveDone`).
- The trophy leaves the wall for good (`fourthTrophyTaken`).
- He is told what's missing (`'need'`).
- No marker flags.

| Sev | Violation | Evidence | Fix |
|---|---|---|---|
| H | **Devvit loses it.** `tpCompleteMission('fourth-place',1)` is rejected (not in `TS_MISSIONS`). After a storage loss, the derby comes back, the First Delivery trophy is back on the wall, and the story replays. | `fourthFinish` | Add it to the server catalog. |
| M | **Path walkers snap their heading** on arrival (`return { … th: M.faceTh, moving: false, there: true }`) and turn instantly at each path corner: the judge to the kid, and the engraver to and from the bench. | `fourthAt` (path branch) | Read paths through one walker (`hospWalkAt` with a polyline, `natLeg` rounding, eased arrival turn). |
| L | The header says "$50 from the judge"; the code says "No tip for now". The doc is stale. | `FOURTH PLACE` header vs `fourthFinish` | Settle the reward, or fix the comment. |
| L | `'derby racers and number 4'` is registered with `each: null`, and the walking judge (`fourthJudgeAt`) is not registered. | `CITY_PEOPLE.add({ name: 'derby racers and number 4'` | |
| L | Inconsistent markers: FOURTH has no beacons (Sir removed the flags), while every other mission floats a beacon over its bay (`queueBeacon(... "cake" / "flower" / "heart" / "house")`). | the world queue | Ask Sir which is the rule (R7). |

### 1.7 The heart run (`HOSP_RUN`: Dr. Okafor, Flight Medic Reyes, Officer Diaz)

**Beats:**
1. idle: the bay outside the main doors.
2. brief: the doctor comes out of the main doors (`hospEdoorTick` now opens them for him: fixed). The gate code.
3. airport: the keypad (Tipsey types the code himself).
4. handoff: the medic comes down the twin's step (`meetWalk` with `hospTwinWing` avoid). The clock starts.
5. carry: the crash at the main doors (tape, wrecks, cruiser, officers); an officer walks over. Garage lift, skybridge, ward, glass lift, the ER mat.
6. thanks: the ending.

**Reward:** the Lifeline trophy, the Medic skin, and $100 once (server-paid on Devvit: good).

| Sev | Violation | Evidence | Fix |
|---|---|---|---|
| H | **The ending is a fade to black and a teleport.** `hospThanksStart`: `cineBars(true); cineFade(true)`. Then, in black, `owStandUpAt(scene, H.spot.x, H.spot.y, …)` out of the building, `scene.K = H.K` (a zoom cut), "A few hours later". It breaks "Seamless: no cut, no fade to black, no pop" and people.md kit flaw 2. The doctor "waiting in the ER" is never there to take the heart: nobody receives it face to face. | `hospThanksStart`, `hospThanksTick` | End it in the ER: Dr. Okafor (a hospital post, `walkinStaff`) is at the trauma bay, meets him (`meetWalk`/`meetTick`) and takes the cooler hand to hand. Thanks and reward card there; no time skip (it also contradicts the real-time clock). |
| H | **A tip near the crash pops the whole scene.** The crash (two wrecks, cruiser, two officers, tape) is drawn only `if(this.ow && this.ow.on && HOSP_RUN.live)`, and `hospHeartDrop` sets `R.live = false`, so it vanishes in front of him. The officer walking to him also jumps (`R.cop = null`). It also appears from nothing when the heart comes aboard (off screen at the airfield, so that half is harmless). | `hospHeartDrop`, the `HOSP_CRASH` draw block | Keep the crash for a while after a spill. Clear it only when it is off screen, or tow it with the city's own tow and police cars. Walk the officer back (`leave`). |
| M | Every speaker turns **158°** in one frame when they leave (measured). `hospWalkAt`: `th = moving ? (back ? dir + Math.PI : dir) …`, and on leave `moving` is true at once. This is the kit, so it hits all seven missions. | `hospWalkAt`; `kin.js` | Ease from `faceTh` to the way back over `MEET.turnMs` from `W.leave` (mirror of the arrival ease). |
| L | The best time is only in `localStorage 'tp_heart_best4'`. | `hospDeckTick` | Server, or say it's local. |
| L | **"No pulse":** the x-ray goal cross on the ER floor pulses (`k = 40 + 14*pulse`). **"No emoji":** the reward row uses `\u{1F4B5}` (`heartWinShow`). | `heartWinShow`, xray block | |
| L | `HOSP_THANKS.spot`/`from` are hand-typed world coordinates. | `HOSP_THANKS` | Derive them from `HOSP` (goes away with the fix above). |

### 1.8 Consequence flows (for completeness)
- `mallJailFade` still fades to black over the walk to the cell (`scene.cameras.main.fadeOut(J.fadeMs…)`).
- A store rep's send-off uses `pocketGo`, which is `fadeOut(POCKET_FADE_MS…)`, from the mall's front door.

Both are H in state/people.md 3.1 and are still open.

---

## 2. Cross-mission violations (ranked)

| # | Sev | What | Where | Fix |
|---|---|---|---|---|
| X3 | H | **Four of seven story completions don't survive on Reddit.** The server records only `heart-run`. `cake-run` and `mall-password` are never sent. `goth-uniform` and `fourth-place` are sent but rejected. The Goth skin, the Luna trophy, Luna's $100, the Gala Pass, the arcade card and credits, and `dogsHomed`/`shelteredDogs` are local only. | `tpcatalog.ts`, `gothFinish`, `cakeDone`, `annivDone`, `fourthFinish`, `tixFinish` | One `missionComplete(id, reward)` that records on the server and pays through it (R10). |
| X1 | H | **The heart run ends in a fade to black**, plus a teleport, a zoom cut and a time skip. | `hospThanksStart` | See 1.7. |
| X6 | H | **Pops when a mission starts, aborts or resets:** the GOTH crew (in and out), Luna's double, the heart crash scene on a tip, Walter/Margot/officer on a tip (`= null` instead of `.leave`), Luna in pink at Onda. | 1.1, 1.3, 1.7 | R1: a reset never deletes a person. |
| X2 | M | **Both meet pickers ignore walls, fascias, glass and counters.** `meetHiddenBy` tests only the `avoid` list it is handed (signals, palms, a wing). Luna stood under the SWELL fascia (`img/g3_ask.png`). `gothStand` skips the picker altogether. | `meetSpot`, `cakeMeet`, `gothStand` | Merge into one `meetSpot` (cakeMeet's scoring). Test cover against the queued world pieces (or the x-ray coverage test `xrayCoverageAt` at head height), and require it of every speaker, including people already standing. |
| X4 | M | **No tip-over policy.** The heart and the cake spill and fail. Roses, cake, note, uniform, trophy, pizza and the dog are kept silently. keepsakes.md: story items are handed back by the crew, face to face, and none do that. | `owDispatchTipFail` | R5. |
| X5 | M | **Missions can overlap.** The start guards are ad hoc: GOTH checks anniv and cake; FOURTH checks goth, anniv and cake; CAKE checks anniv; HOSP_RUN checks nothing; LOST checks three. All share one `gpsNav` and one `hospSayCard`, so a heart run started mid-anniversary steals its GPS. | each `*Tick` start | R3: one `missionBusy()` registry. |
| X8 | M | **Story clock against the real clock.** Evening stories (cake/wedding, anniversary) play at any hour, while their shops' hours (bakery 6–15, florist 8–18, ballroom 18–24) contradict each other. Lunch at 2 a.m. "All morning" at night. "A few hours later". | 1.1, 1.2, 1.4, 1.5, 1.7 | R4. |
| X7 | M | **The autopilot teleports Tipsey** when stuck for 1.8 s (`gothAutoTick`). | `gothAutoTick` | Re-route round the obstacle (the GPS grid), or hand control back with a hint. Never set `ow.px`. |
| X9 | L | Mission UI against the taste rules: the answer button is red with an endless nudge (`#docReply … dcNudge 1.6s … infinite`), Accept is red (`#ideaGo #e0303c`), and there are emoji (heart reward, `ARC_GAMES`, the mission list's `&#128230;` row). | CSS, `heartWinShow`, `ARC_GAMES`, `tpRenderMissions` | Ask Sir whether the red answer bubble is an approved exception; otherwise use orange, no loop, no emoji. |
| X10 | L | **Missions are invisible on the mission board.** `TP_SIDE_MISSIONS` lists only courses. Story missions have no row, progress or "where next". Only heart and Luna have trophies. | `TP_SIDE_MISSIONS` | R9. |
| X11 | L | **Seven copies of the same code:** nav and nav-clear, `*At` walker readers (`cakeWalkerAt`, `annivAt`, `gothAt`, `fourthAt`, `tixWalkAt`, `hospDocAt`/`hospMedicAt`/`hospCopAt`), bay arming, the "card on arrival" block. | throughout | The Missions kit (section 4). |

---

## 3. Proposed new rules (one line each)

Section: a new **"## 10. Missions (missions.md)"** in LOOK_RULES, plus a kit contract `docs/kits/missions.md` (outline in section 4). Rules marked * also go in an existing section.

| # | Rule (book style) | Evidence | Where |
|---|---|---|---|
| R1 | **A mission never deletes a person.** Starting, aborting, failing or resetting a mission walks its people off (`leave`, back through their door or past the view's edge). Nobody is created or nulled in view; a mission's extras exist before it and stay after it. | `cakeRunDrop` (`R.door = null`), `hospHeartDrop` (`R.cop = null`, crash gone with `live`), `gothStart`/`gothAccept` crew, Luna double | 10, and *7 (people.md P1: add "missions" to the coming-and-going list) |
| R2 | **Every beat starts the same way:** he stops on a bay, mat or rug that is drawn and armed (`matHighlightState === "armed"`), and it re-arms only once he has left it. No proximity triggers in the open, except a walk-in's way-in line. | all seven missions already do this (`R.armed`, `annivBay`, `ballOnDoorMat`, `annivOnDoorMat`) | 10 |
| R3 | **One story at a time.** A mission starts only when `missionBusy()` is false, and owns the GPS and the speech card until it ends. Free-roam extras (lost dogs) wait. A fleet robot's mission is that robot's, with its own GPS leg. | ad hoc guards in `gothTick`/`fourthTick`/`cakeRunTick`, none in `hospHeartTick`; one `gpsNav` | 10 |
| R4 | **A mission keeps the real clock.** It declares its window (`day`, `evening`, `night`, `any`, on `NIGHT_CLOCK`). It is offered only in that window, and once started it keeps its time (Sir, 2026-10-30). Every place it uses is open then, or the story says why (`pk.late()`). Lines that name a time of day come from the clock. No "hours later" skips. | cake (bakery 6–15 against ballroom 18–24, "Good evening"), anniversary ("tonight", "till close"), "lunch", "all morning", heart "A few hours later" | 10, and *8b (Night) |
| R5 | **Every carried item declares its tip-over rule:** `spill` (a fail, with the spill drawn, as the heart and the cake do), `keep`, or `crewReturns` (the rescue crew hands it back face to face: keepsakes.md). Nothing is left undeclared. | `owDispatchTipFail` covers 2 of 9 carried things | 10 + keepsakes.md |
| R6 | **One item per step, seen.** What he carries is shown (in hand on the giver, on him while carried), named in the step's toast, and gone when it is handed over or used. A spent keepsake leaves the wall for good. | the anniversary's roses and cake ride at once, unseen; FOURTH's trophy (good: `fourthTrophyTaken`) | 10 |
| R7 | **Where to go is the GPS and the bay's own ring**, nothing else. One marker rule for every mission (Sir removed FOURTH's flags; the others still float beacons: confirm which). The GPS leads into the place it means (lift, door, room). | `fourthNavClear` on the pad, Sir's "we dont need the red flag" against `queueBeacon` in cake, anniversary, heart and goth; `hospNav` tail into the lift | 10 |
| R8 | **Ask, then accept.** The giver states the problem face to face, Tipsey promises, and the player chooses (Accept / Not now; Not now re-asks next time at the same mat). The ending is the asker's thanks face to face, and one completion card (what was earned) on the shared card. | Gus's `no:` answer, FOURTH's idea card (good); the cake and heart runs fire with no choice; the endings are toast, collectCard and heartWin by turns | 10 |
| R9 | **Every mission is in one registry**: id, giver, places, window, steps, items, reward, save key and server key. The mission board shows its state and next step, and if a step needs something he hasn't got, it says what and how (FOURTH 'need'). | `TP_SIDE_MISSIONS` lists only courses; 'need' in FOURTH | 10 |
| R10 | **What a mission gives is the server's.** Completion goes through `tpCompleteMission(id)` with the id in `TS_MISSIONS`. Money is paid by the server (once). Skins, trophies and key items are in its catalogs. No mission state of value lives only in `localStorage`. Give the console seed line for testing in the artifact. | X3 (4 of 7 lost on Devvit) | 10 + CLAUDE.md "Other rules" (web + Devvit) |
| R11 | **A story borrows the place's own people.** The giver is the shop's or room's staff (`SHOP_STAFF`, `walkinStaff` with `awayAt` + `lookFn`) or the house's household (`householdOf`), walked out of their real, opening door and back to their post. Never a new person at a typed coordinate. | good: the engraver `awayAt`, the baker `SHOP_STAFF`, Gus = the mall guard; bad: `GOTH_HOME_SPOT` (door 7,970 from any house door), the dog owner not of the household, the shelter's painted door, Forno's cook | 10, and *7 |
| R12 | **The mission's camera and wheel are seamless too.** Cine bars and an autopilot may take over, but the autopilot never sets his position (it re-routes or hands back). No fade, cut or zoom snap at a beat or ending: lifts and scene changes dissolve (`sceneDissolve`), and endings happen where the item is delivered. | `gothAutoTick` teleport; `hospThanksStart` fade, teleport and zoom; good: `sceneDissolve` in the vault and service lifts | 10, and *9 (camera) |
| R13 | **World changes wait until he can't see them.** What a mission ends (a derby, a crash, a crowd) is held until he has left (`FOURTH.hold`), then goes the city's way (families leave by car, `DERBY_LEAVE`; wrecks towed). Nothing switches on a flag in view. | FOURTH (good); `HOSP_CRASH` drawn only while `HOSP_RUN.live` (bad) | 10 |
| R14 | **Every speaker in a mission meets him with the one meet kit, including people already standing** (a crew, a judge at his table). The spot is tested against what is drawn there (walls, fascias, glass, counters, poles), not a hand list. A mission walker is read by the kit's one walker (`hospWalkAt`: pace, eased ends, eased turns at arrival **and leave**). | `gothStand`; `tixWalkAt` 0.096 peak; `fourthAt` snaps; the `hospWalkAt` leave snap of 158°; Luna under the SWELL fascia | *7 (people.md P8/P12) |
| R15 | **Mission UI is the game's UI:** one speech card (`hospSayCard`, renamed), orange answers, no emoji, no looping nudge or pulse. Toasts say the next step in one line ("Roses aboard. Next door to Sandpiper Bakery for the cake."). | X9; the toast pattern is already consistent | Taste and 10 |
| R16 | **Still mission props are cached.** A bay, mat, wreck or tape goes through `bcDraw`, and only its ring, lights and people draw live. | the crash (good: `hcr\|wreck`), Walter's mat (good: `ball\|mat`); `drawPickupBay` live for every mission bay | *9 |

---

## 4. Proposed Missions kit (`docs/kits/missions.md`): the shared pieces

1. **`MISSIONS` registry** (data, not code), one record per story:
   - `{ id, name, giver, window: 'day'|'evening'|'night'|'any', places: [...], steps: [...], reward: {cents, skin, trophy, item}, server: true, fleet: bool }`;
   - each step: `{ kind: 'meet'|'go'|'carry'|'use'|'scene', at: bay|door|room, who, item, say, btn, no, tip: 'spill'|'keep'|'crewReturns' }`;
   - the board (`tpRenderMissions`) and the trophy case read it.
2. **`missionStart(id)` / `missionBusy()` / `missionEnd(id, ok)`**: one owner for the GPS (`missionNav(step)`/`missionNavClear`), the speech card, the cine bars and the autopilot. They check the window (R4) and the hours of each place, and hold the started run's time.
3. **`missionBay(place)`**: the bay or mat from the place's own record (`realPickupMat`, `houseDoorOf`, a pocket's way-in). Armed and re-armed (R2), cached base and live ring (R16), and one marker rule (R7).
4. **`missionPerson(source)`**: borrow a person, never make one:
   - a sources-of-people adapter over `SHOP_STAFF`, `walkinStaff` (`awayAt`/`lookFn`), `householdOf` and named posts (Gus, Walter, Margot);
   - a door that opens for them (the door kit's opener reads `CITY_PEOPLE`, people.md flaw 1);
   - the registry entry comes with it.
5. **`missionMeet(ow, person)`**: the one `meetSpot`, with cover tested against the scene (R14), `meetWalk` / `hospWalkAt` (pace, eased ends, eased arrival and leave turns), `meetTick` holding him, the card on arrival, and `leave` to go back. It takes `ow` (any robot: fleet-ready).
6. **`missionWalker(path)`**: polyline walks for judges, cooks, exits and Luna (replaces `fourthAt`, `tixWalkAt`, `gothExitAt`), and hands the person back to their post or the edge (R1).
7. **`missionItem(id)`**: carried / shown / handed / spent, with a tip policy (R5), drawn in hand (`drawHandGift`, the box, the cooler) and on the robot.
8. **`missionComplete(id)`**: `tpCompleteMission` on the server catalog, server-paid money, skin, trophy and key item (R10), one completion card (R8), and a console seed line printed for testing (`tpProfile.missionsCompleted.add('…')`).
9. **`missionAbort(reason)`**: tip, leave area, mode change, reload. People walk off, the world holds (R13), and GPS and cards are cleared. Reload: a run in progress is never saved (state it); what was earned is.
10. **Checker** (`tools/review/missions.js`, extending `people.js`): run each mission's steps headless from the registry. Assert no appear/vanish/teleport, both faces showing at every card (screen box of each body not covered), walker pace ≤ 0.075, heading change ≤ π per `MEET.turnMs`, and server ids present in `TS_MISSIONS`.

**Console seed lines** (the artifact boots empty):
- `tpProfile.missionsCompleted.add('mall-password'); tpSaveProfile()` (GOTH available on entering the mall)
- `tpProfile.missionsCompleted.add('cake-run'); tpSaveProfile()` (Gala Pass and the bakery's orders)
- `tpProfile.missionsCompleted.add('goth-uniform'); tpSaveProfile()` (Luna at Onda)
- `tpProfile.missionsCompleted.add('fourth-place'); tpSaveProfile()` (the derby gone)
- `localStorage.setItem('tipsyArcade', JSON.stringify({pass:true, credits:30}))` (the arcade card)
- `NIGHT_CLOCK.time = 20` (evening, to test R4)

**Scripts used:**
- `goth2.js` (GOTH start, ask, accept)
- `cake.js` (baker and Walter meetings, the tip pop: Walter 49 units)
- `kin.js` (meet pace 0.065, leave snap 158°, TIX peak 0.096)
- `places.js` (hoods, hours, the mom's door 7,970 from any house door)

All of these are in `/tmp/claude-0/-home-user-Tipsy/ba48993d-c3a4-502b-a1e7-e93bda303261/scratchpad/missions/`.


---

## 5. Fix status (2026-10-30, the missions fix; Sir: "fix them to the rules", R1-R16 approved, R7 = beacons)

The rules are written as LOOK_RULES section 10 and the kit contract `docs/kits/missions.md`. The kit lives in `game/index.html` under "THE MISSIONS KIT" (beside the meet kit). Evidence for this pass (stills and MP4s) is in `/tmp/claude-0/-home-user-Tipsy/ba48993d-c3a4-502b-a1e7-e93bda303261/scratchpad/mfix/img/`, scripts beside it (`heart.js`, `goth.js`, `cake.js`, `anniv.js`, `tix.js`, `kin.js`, `reload.js`).

### Cross-mission
| # | Status | How (or why open) |
|---|---|---|
| X3 Devvit saves | **fixed** | `missionComplete(id)` for every story: `tpCompleteMission(id, 1)` with `cake-run`, `mall-password`, `goth-uniform`, `arcade-card`, `fourth-place` added to `TS_MISSIONS` (heart-run already there). Money once through the server: gift/tip `luna` ($100, db.ts `LUNA_TIP_CENTS`, `ONCE_TIP_CENTS`) beside `heart`. `goth` in `TS_SKINS`, `luna-favour` in `TS_CLAIMABLE_TROPHIES`. The Gala Pass is rebuilt from `cake-run` (`galaPassMigrate`). Dogs: `api/tipsy/dog/rescue` takes `{key}` (dogsHomed) and a new `api/tipsy/dog/shelter` keeps shelteredDogs; the profile returns both and the client merges them. The arcade card: the pass is `arcade-card`, the credits and the $5 top-up go through a new `api/tipsy/arcade` (db.ts `dbArcade`, `TS_ARCADE`). `tsc --build` clean, the server builds, unit tests 18 pass / 3 fail (the same 3 as before: they need Redis). |
| X1 heart ending | **fixed** | No `#cineFade`, no "A few hours later", no `owStandUpAt`, no `scene.K` cut. On the ER mat Dr. Okafor (the ER doctor's post, `HOSP_PEOPLE.lower` role `okafor`, one look `okaforLook` on the street and in the ER) walks over (`meetWalk`/`meetTick`, `walkPathAt`), takes the cooler hand to hand (drawn in his hand: `drawHeartCooler`), thanks him, `#heartWin` is the one card, and he walks back with it. Stills `heart_end_meet.png`, `heart_end_card.png`; clips `heart_end_walk.mp4`, `heart_end_back.mp4`. |
| X6 pops | **fixed** | Cake: a tip sets `leave` on Walter and Margot (measured jump 0, `cake_4_tip_walter_back.mp4`). Heart: the officer walks back; the crash stays until none of it is on screen and the officer is back (`hospCrashUp`); its tape holds him while it stands. Luna: the crew are a fixture at the fountain (`gothCrew`, before and after); Luna is one person in one place (`gothLunaAt`): with the crew, walking to him, up the escalator to the arcade (`gothArcadePath`, ridden), waiting there, down to Onda, changing in its back corner only while it is off screen, then walking out front of the case in the pink. `gothReset` walks her back instead of deleting her. |
| X2 meet pickers | **fixed** (kit flaw 2 open) | One picker `meetSpot` (cakeMeet's scoring, both arcs barred) for every speaker; `cakeMeet` is its meeting. Cover against what is drawn: `meetCoverAt` (the x-ray's building heights on the street, the mall's gallery and front-row shopfronts). People already standing: `meetApproach` + `meetStand` (Luna's taunt). Other interiors are not yet asked (missions.md flaw 2). |
| X4 tip policy | **fixed** | `item()` in each `MISSIONS` record; `owDispatchTipFail` calls `missionTipOver`: heart and cake `spill`; roses/parcel/note, the uniform, the pizza and the trophy `crewReturns` (the crew's line at the lift: "Dropped this, buddy." and what they hand back). |
| X5 overlap | **fixed** | `missionBusy(id)` at every start (heart, cake, Gus's favour, Luna, TIX, Fourth Place); lost dogs and the shelter pickup wait. GPS copies still per mission (missions.md flaw 1), but no longer fight. |
| X8 clock | **fixed** | `MISSION_WINDOWS` on `NIGHT_CLOCK`: the Cake Run and Gus's favour are `evening` (17-20, "comes at dusk"); out of it the bay says so and Gus only tells him the rules. Bakery 6-20, florist 8-20, ballroom 17-24 (TP_PLACE_COPY). Marisol's meal and the dog owner's "all morning" come from the clock; no "hours later". A started run keeps its time. |
| X7 autopilot teleport | **fixed** | `gothAutoTick` never sets `ow.px`: stuck, it steps round (a way point each side, clear of solids), then hands the beat on where he is. Luna's drive goes round the fountain by a way point. |
| X9 UI | **fixed** | `#docReply`, `#ideaGo` and the heart card's wear button are the game's orange `#ff7a1a`; the infinite `dcNudge` is gone; no emoji in the arcade's PLAY card, the heart reward row or the mission list. The ER goal cross no longer pulses. |
| X10 board | **fixed** | `MISSIONS` registry; the mission board has a "Stories" list (`missionState`: done / under way and the next step / after X / "Comes at dusk" / where it starts, tapping an open one sets the GPS there). |
| X11 copies | **partly** | One walker (`hospWalkAt` + `walkPathAt`) for TIX, Fourth Place, Luna and the ER doctor; one picker; one tip policy; one completion. Still copied: the nav helpers and bay arming (missions.md flaws 1, 3). |

### Per mission
| Mission | Violation | Status |
|---|---|---|
| Cake Run | Devvit loses the reward | fixed (`missionComplete('cake-run')`) |
| | tip mid-meeting pops Walter/Margot | fixed (`leave`; jump 0) |
| | time of day | fixed (`evening`; bakery and ballroom hours) |
| | bays drawn live | fixed for the mission bays (`drawPickupBayCached`); ordinary pickup rugs still live (the kit's `drawPickupBay` is called inside x-ray, fade and room transforms) |
| | urgency without a clock | open (L): the story still says "any minute" without a par |
| | ask/accept | fixed: the baker's card has "Not now" (R8) |
| Gus | Devvit loses the password | fixed |
| | night story with no clock | fixed (`evening`; florist and bakery open then) |
| | tip policy | fixed (`crewReturns`) |
| | two items at once | fixed: the baker ties the roses on the cake box -- one parcel (R6) |
| | no reward card | fixed (one `collectCard`) |
| Luna | Devvit loses the reward | fixed (record, `luna` $100, `luna-favour` -> `goth`, worn) |
| | crew pop, Luna double | fixed (see X6) |
| | mom's door never opens | fixed: a real Flats house (the library's, `homeDoorsOf`, nearest the Sierra Vista gate: 776 Marina Way, a Seabreeze Bungalow), one of its household (`householdOf` + `folkLook`), out of its own door (`houseDoorsOpen` reads `gothMomAt`). Luna's line names the address. Registered |
| | faces in the meetings | fixed: taunt by `meetApproach`/`meetStand`; ask by the one picker with `meetCoverAt` (not under SWELL) |
| | crew spots unchecked | fixed (`owSpotClear` r 22, beside the fountain off the doors' lane) |
| | Luna in Onda's doorway, pink pop | fixed (her post out front of the case, off the lane; she changes off screen and walks out) |
| | autopilot teleport | fixed (X7) |
| | not registered | fixed: Luna (all of her), the crew, the mom |
| | return GPS to the front door when inside | fixed (to the arcade) |
| Lost dogs / shelter | shelter worker's painted door | **open**: the shelter's LIB entry paints its double door into the cached building; a live door needs the doors kit on that entry (missions.md flaw 4) |
| | owner a stranger | fixed (`householdOf` + `folkLook`) |
| | Devvit loses dogsHomed / shelteredDogs | fixed (server lists) |
| | dialogue clock | fixed |
| | GPS silently not set | fixed by R3 (no dog spawns during a story) |
| High Tide | Devvit: pass and credits | fixed (`arcade-card`, `api/tipsy/arcade`) |
| | Marisol and the cook skate and snap | fixed (`walkPathAt`: peak 0.065, turns eased; `kin.js`) |
| | the cook from behind Forno's counter | open (M): Forno's counter has no `walkinStaff` post to borrow him from |
| | Marisol registered only on her walk | open (L) |
| | lunch at any hour | fixed (`missionMeal`) |
| | emoji in PLAY | fixed |
| Fourth Place | Devvit loses it | fixed |
| | path walkers snap | fixed (`walkPathAt`, peak 0.07) |
| | "$50 from the judge" header | fixed (the comment) |
| | registration | fixed (the judge and the engraver while the story has them) |
| | markers | fixed: beacons again (R7) over the depot's mat out front of its door (over the pad itself it stood behind the facade: moved after the verification run, `beacon_depot_run.mp4`), the shop's mat and the tent; the GPS's own flag still goes on the pad |
| Heart run | ending | fixed (X1) |
| | crash pops on a tip | fixed (`hospCrashUp`, the officer walks back) |
| | 158 degree leave snap | fixed in the kit (`hospWalkAt` eases the leave: max 8-9 degrees a frame) |
| | best time only in localStorage | open (L): kept local, as a personal best |
| | pulse, emoji | fixed |
| | typed coordinates | gone with the ending |
| Consequence flows | `mallJailFade`, `pocketGo` fades | open: not missions; people.md 3.1 |

### Open from the verification run
| Case | Status |
|---|---|
| Today's Delivery mid-story (`tpBackToDailyRoute` while `missionBusy()`) | **fixed (2026-10-30, Sir: "you cant pick up a delivery in the middle of a story ... a level of focus")**: FOCUS (`tipseyFocus` / `deliveryHidden` in the missions kit). A story under way (or a lost dog he is taking home) hides every pickup (rugs, rings, beacons, the map's pulsing pins, the place sheet's order, search rows) and refuses every way to take one with "Finish <story> first."; the GPS stays the story's (a pickup leg is dropped; closing the map no longer swaps the story's leg for the last GO'd trip). The other way round, a story's start met with an order aboard waits ("<story> can wait: deliver the order first."; the arcade's way in holds him). When it ends everything comes back quietly; a rug under him then waits till he leaves it. |
| Passers-by across a meeting | not a fault: the mall's walkers cross in front of Marisol for a moment (`tix_2_marisol_meet.png`); the steady frames show both faces (`tixm_stop_*.png`, `tixm_thanks_*.png`). |

### Verification (2026-10-30, after the restart)
Every story start to finish headless (`heart.js`, `cake.js`, `anniv.js`, `goth.js`, `tix.js`, `fourth.js`, `lost.js` for the lost dogs and the shelter), the tip-overs (cake: spill, Walter and Margot walk off; heart at the crash: spill, the officer walks back, the crash holds till out of sight; anniv roses, Luna's uniform, the pizza and the trophy: the crew hand it back), reloads (`reload.js`, `reload2.js`: a run under way comes back idle, every completion and reward survives, money paid once), Today's Delivery mid-story (`quit.js`). Page errors: none in any run. `tsc --build` clean, server bundle builds, unit tests 18 pass / 3 fail (the Redis ones, as before).

