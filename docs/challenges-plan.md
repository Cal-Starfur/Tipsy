# Challenge missions: a plan

Proposal for Sir, 31 Oct 2026. Read from `game/index.html` on branch consistency-pass (e9be773 plus another session's uncommitted removal of the win/fail screens). I booted the game headless, played both legacy challenges and photographed the places proposed below. Nothing in the repo was changed.

Sir's brief: "missions like the slalom and the hydrant jump ... are legacy and have all but been pulled out ... now that we have a world they could be done much differently. this is not story its not delivery its challenge missions."

## 1. What a challenge is

| | Story | Delivery | **Challenge** |
|---|---|---|---|
| What it is | Someone's problem, in steps | An order from a shop to a door | A skill run on a course in the real world |
| People | Givers and the place's own people (R11) | Shop staff, the customer | One host or attendant at the start: one line, no plot |
| Played | Once | Every day, many | Again and again, for a better time |
| Scored by | Done or not | Tip and time | Time or points, against a par: bronze, silver, gold. A personal best and a daily board |
| Stacks? | Exclusive (R17) | Orders stack | Exclusive while running. Not offered with an order aboard |
| Pays | Its reward, once (R10) | Tips | Medals, trophies, keepsakes, liveries. No tips |

**The rule:** a challenge never leaves the world. It starts on a marked gate in the live city, Tipsey drives it with his own controls (`owStep`), and when it ends he is standing where it ended. There is no frozen route, no map screen, no teleport (R12).

## 2. What's left of the old code

**About 5,700 lines are still live, and both challenges are playable today.**

| Piece | Where (name) | Still runs? |
|---|---|---|
| Two frozen rugs | `MISSION_MAT_SITES` → `getMissionMats` | Yes. Hydrant Jump on Pelican St at 5th (The Flats, 12572, 11868). Cone Slalom at 15th St and Stall (**Market Dist.**, 44528, 75072), on bare grass far outside the Flats. Hidden by `storiesHidden` (R17). |
| Entry from the world | the mat branch in `update()`, `gpsNavLaunch` | Yes. Stop on a rug: `hjStart()` (map screen and GO) or `tpSlalomStart()` (straight into 3-2-1). |
| Board, search, pins | `TP_SIDE_MISSIONS`, `tpRenderMissions`, the search index, the map pins (`tpMissionPin`) | Yes. The map pins are emoji (🧯 🚧), against R15. |
| Hydrant engine | `HJ_*` (`HJ_JUMP`, `HJ_CH`, `HJ_CRASH`), scene methods `hjTap`, `hjSim`, `hjBuildCourse`, `hjResetRun`, `hjSaveProgress`, `hjClear`, `loadChallenge`; chrome `hjStart`, `hjBegin`, `hjQuit`, `hjChrome`, `hjShowCrash`, `hjShowWin`, `hjUpdateMeter` | Yes, on the **old route runner**. |
| Slalom engine | `SL`, `slFindChain`, `tpSlalomOn` (~2,500 lines: gates, chutes, kickers, the William penalty lap, the victory lap); chrome `slalomMapSelect`, `tpSlalomStart`, `tpSlalomUI`, `tpSlalomQuit`, `slShowCard` | Yes, on the **old route runner**. |
| Route modes | `loadRoute(HJ_SEED_DATE, {challenge, classic})`, `loadRoute(SL_SEED_DATE, {unanchoredStart})`, `classic:true` (the pre-coast lattice, kept only for the hydrant) | Yes. This is the legacy part. |
| Saves | `tpProfile.hjLevel/hjBest`; server `TS_MISSIONS['jump-hydrant'] {bestMax:10}` and `['cone-slalom'] {bestMax:1}`; `slBestMs` local only | Yes |
| Trophies | `hydrant-hop` → Fire Chief skin; `slalom-master` → Cone Dodger skin (both claimable on the server); `stunt-jump` → Daredevil, **can't be earned** | Yes / dead |
| Money | `ClaimSlalomTip` (server, $20 a day cap) | Endpoint still there |
| Reddit win/fail gates | `SubmitSlalomWin/Fail`, `SubmitHydrantFail`, their comment and follow gates, `tsFx*`, `tdFxHydrantBlocked` | **Being removed now** by another session (uncommitted) |
| Daily leaderboard | `GetDailyBest` / `SubmitDailyBest` | Kept. Fed by deliveries only (tip, then time). No challenge feeds it |
| Coming soon rows | "Stunt Jump Challenge", "???" ("Challenge routes are on the way") | Dead rows |
| Roadmap | Phase 1 "challenge routes" (seeds + modifiers), Phase 2 ramp/jump (`docs/ramp-jump-spec.md`) | Never built. The daily route itself is gone (057ae13) |

**What I saw played headless:**
- Hydrant Jump. Stop on the rug and the map screen comes up with GO. Press it and the live city is swapped for the 30 July route: the free-roam controller is switched off (`ow.on` false) and the old lane runner takes over. Tipsey auto-runs down the sidewalk while you tap TAP. The course hardly reads: two pale heaved slabs and a red hydrant. Forty fast taps gave "OVERSHOT THE RAMP". Quitting puts him back in free roam on a charge pad, about 10,000 units from where he was (a teleport).
- Cone Slalom. The rug is on bare grass in Market Dist., an unbuilt hood far from the Flats. Starting it reloads the 9 August route, runs 3-2-1 and a 75-second clock, and lays cones on the sidewalk band. Nothing moves without the old swipe-hop controls.
- One page error in the working tree, `tdFxLoadSnaps is not defined`, from the in-progress win/fail removal. It isn't from the challenges.

**What's worth keeping:** the jump maths in `HJ_JUMP`/`HJ_CH` (the arc, the charge-to-speed curve, the solved ten-level table, the airborne depth bias of 2.0 tuned at all four headings), the slalom's red/blue gate rule and its 2-second cone penalty, the 3-2-1-GO countdown, the two trophies and skins, and the two server ids. The rest is the route runner, and it goes.

## 3. The challenge kit

One registry, one runner, one card. It sits beside the missions kit (`MISSIONS`) and borrows its meet kit, beacons, clock and focus.

```js
const CHALLENGES = {
  'cone-slalom': {
    name: 'Cone Slalom', place: 'Veterans Memorial Park', host: 'roadCrew',  // a crew lead by the work van
    vehicle: 'tipsey',              // or a FLEET kind; lent for the run, never saved (fleet doc s4)
    window: 'any',                  // R4: any | day | evening | night
    gate: { x, y, yaw },            // the start gate: rug, arch, beacon, host's spot
    loop: true,                     // finishes at the start gate, so Retry needs no move
    course: [                       // world points, snapped to the street/trail lattice
      { k: 'gate', a: [x, y], b: [x, y], side: 'red' },   // pass between, or on the flagged side
      { k: 'cone', x, y }, { k: 'check', x, y, r }, { k: 'ramp', x, y, yaw, preset: 'kicker' },
      { k: 'hydrant', x, y }, { k: 'ring', x, y, z, r }, { k: 'stop', mat }, { k: 'finish', a, b } ],
    rules: { limitMs: 90000, pen: { cone: 2000, gate: 5000 }, tip: 'time',  // 'time' crew lifts him, clock runs | 'fail'
             carry: null, bounds: 600 },                // off the course by more than this: DNF
    score: 'time',                  // time | points | jumps
    medals: { gold: 52000, silver: 60000, bronze: 'finish' },
    daily: { mirror: true, gateSets: 3 },               // today's variation from the date seed
    reward: { trophy: 'slalom-master', at: 'gold', keepsake: 'gold-cone', livery: null },
    server: 'cone-slalom'           // its TS_MISSIONS id and its board id
  }
};
```

**How it starts (R2, R7, R8, R14).**
- The start gate is always in the world while the challenge is offered: a rug with an arch (start/finish gantry), cached through `bcDraw`, and the beacon over it when the GPS sends him there. Hidden by focus as the old rugs are.
- Stop on the rug (armed) and the host walks up face to face (`meetWalk` / `meetTick`). The card says one line and the numbers: "Cone Slalom. 18 gates through the park. Gold is 52 seconds. Today it runs clockwise." Answers: **Run it** / Not now. Your best and today's rank sit under it.
- The street or park course is set out when you accept: the host's crew drop the cones as you line up. Venues that are built for it (the training yard, the skate park, the derby ramp) stay out all the time.

**How it runs.**
- 3-2-1-GO (the slalom's countdown, kept). The clock starts on GO; the first move before it is a false start (+1 s).
- `CH_RUN = { id, seed, t0, phase, next, pen, faults, splits }`, ticked by `challengeTick(scene, dt)` off `ow` (position, speed, tilt). Crossing tests are segment tests between frames, so nothing is missed at speed.
- Course pieces are still props through `bcDraw` (keys like `ch|cone-slalom|g07|cw`: what and where, never time). Only a knocked cone (it tumbles, then lies where it fell), the next gate's glow, the beacon and the host draw live. The course culls with `inView`.
- Where to go: a beacon over the next gate or checkpoint, and the GPS line through the next two (R7).
- HUD (R15): one small strip, top centre: the time, gates done of the total, penalty seconds. No emoji, no pulse.
- Focus (R17): `challengeFocus()` joins `tipseyFocus()`. While a run is live, deliveries, stories, other challenges and dogs are hidden and refused, and traffic keeps off a closed street. It ends quietly.
- The real clock (R4): each challenge has a window. A run that has started keeps its time.

**How it ends.**
- **Finish:** across the finish line, or stopped on the stop mat for courses that end like a delivery (the old slalom's best bit). The host (or the captain with the stopwatch) says the time face to face. One result card: time, penalties, medal, personal best, today's rank. **Retry** (he is already at the start: every course is a loop or finishes by its start) and **Done**.
- **Fail:** timeout, off the course (`bounds`), or a tip-over where the rule is `fail` (jumps, a carried tray: R5 `spill`). Where the rule is `time`, the crew lift him where he fell (`owRescue`) and the clock keeps running: the time lost is the penalty.
- **Quit:** drive off the course, or the card's Done. The crew pick the cones up out of sight (R13).

**Saves (R10).**
- The server keeps a best per challenge: a new `SubmitChallengeRun { id, seed, ms | points, pen }`. It answers with the best, the medal and today's rank. It clamps an impossible time against the course's own minimum (its length at top speed), as `bestMax` clamps a jump count.
- Medals are written into the record. `tpCompleteMission(id, n)` keeps working for the trophy claims (`TS_CLAIMABLE_TROPHIES`).
- Each challenge has its own daily board (`tp:ch:<id>:<date>`, a sorted set, lower is better) and an all-time board.
- Local: `tpProfile.chBest[id]` for the card, rebuilt from the server on `requestTpProfile`.
- Seed line for the artifact: `tpProfile.chBest = {'cone-slalom': {ms: 58000, medal: 'silver'}}; tpSaveProfile()`.

**Daily variation.** The date seeds each course's variation: direction, mirror, which of 3 gate sets, where the lanterns are. Everyone plays the same course on a day, so the board is fair.

**Perf.** Course props cached; a run adds at most a dozen live items (knocked cones, the glow, the host, the beacon). Course props are present only while the challenge is set out. The perf check runs when Sir asks.

## 4. The two legacy challenges, rebuilt in the world

### Hydrant Jump (`jump-hydrant`), at the Fire Training Yard
- **Where:** the firehouse lawn (park cell 2,6), across the street from The Flats Fire Station (1,6). The Flats plan's area 7 builds the Fire Training Yard there: a drill tower, a hose lane with hydrants and the old engine on its plinth. This challenge is the yard's lane.
- **Course:** a straight run-up lane, a kicker ramp, N hydrants in a row, a catch ramp, a run-out. Level N has N hydrants and the catch ramp 0.55 tile-pairs further out, the old solved table. Ten levels, and the level you're on is kept.
- **Host:** Captain Reyes with the stopwatch (as in the area 7 plan). The firefighters on their drill loop watch.
- **Control:** real speed off the run-up, with Tipsey's own stick. The launch reads `ow` speed at the lip. If his top speed can't make level 10, the yard's lane gets a "hose boost" strip before the kicker (a fixed speed-up, the same for everyone). The tap meter retires (see the open questions).
- **Rules:** clear every hydrant and land on the catch ramp. Clipping a hydrant bursts it (the water plume is a live item) and the run fails; landing off the ramp tips him and fails. Score: jumps cleared.
- **Carry-over:** the server's `jump-hydrant` best (0 to 10 jumps) means the same thing here. The Fire Chief at 10 stays. Hydrant Hopper becomes the Fire helmet keepsake (`docs/keepsakes.md`), which the yard's own story (Open House) spends.
- **Window:** any (the yard is floodlit). Effort: **M** for the course, after the jump physics (L, shared with the Skate Park) and the yard (M, the Flats plan).

### Cone Slalom (`cone-slalom`), on the Veterans Park trail
- **Where:** Veterans Memorial Park's wood-chip trail (park cells round 5,5). It is car-free and long, in the middle of the Flats, and Sir asked for the trail. It replaces the Market Dist. rug.
- **Course:** about 18 gates on a loop of the trail arms. Red flag: pass on the left of the cone; blue: on the right (the old rule, now in the world: the flag is on the cone, so it reads at any heading). It finishes on the host's stop mat beside the start.
- **Host:** the road crew's lead, by the Tipsey work van at the trailhead. The crew set the cones out when you accept.
- **Rules:** +2 s a knocked cone, +5 s a gate passed on the wrong side, DNF at 90 s. A tip-over costs the crew's lift time. Gold, silver, bronze by par (gold about 52 s after tuning).
- **Daily:** clockwise or anticlockwise, one of three gate sets.
- **Carry-over:** a player with `cone-slalom` complete keeps Slalom Master and the Cone Dodger. Their best time was only ever local, so medals are earned fresh. The Gold cone keepsake ("the road crew opens a closed street") comes with the gold medal.
- **Window:** any. Effort: **S to M** after the kit. It is the kit's first real course.

## 5. New challenges for the Flats

| # | Challenge | Where | Vehicle | Window | Effort | Engine work |
|---|---|---|---|---|---|---|
| 1 | Harbour Sprint | Pelican Harbor: the harbour road, along the quay, round the plaza and out to the jetty | Tipsey | any | **S** | Kit only (checkpoints). The quay edge already splashes him at speed |
| 2 | Derby Ramp Run | Tidewater Green: down the soapbox ramp and round the dirt course | Tipsey | day | **S to M** | Ramp terrain exists (`derbyZ`, grade pull); the ramp has to stay after Fourth Place; ghost karts as the par |
| 3 | Sierra Vista Switchbacks | the zigzag street from the gate round to the top shelf and back | Tipsey | day | **S** | Kit only: corners at speed tip him, and kerbs are the hazard |
| 4 | Precision Park | Marina Parking: stop dead-centre in five marked bays, the ground floor and the roof by the car lift | Tipsey, later the robotaxi | any | **S** | A stop score (distance off the bay's centre, time). Robotaxi after fleet P3 |
| 5 | Tray Run | Cove Grove Plaza: a tower of cups on his lid across the plaza's ramps and steps | Tipsey | day | **S to M** | The carried item with `spill` (R5) and a lean meter off `ow` tilt |
| 6 | Lights Out | the downtown Flats streets after dark: eight lanterns, any order | Tipsey | night | **M** | Lantern positions from the seed; his headlight; score by time |
| 7 | Courier Trial | from the charge station: five parcels to five doors against the clock | Tipsey | day | **M** | Reuses the drop-off mats, but its own parcels: no tips, no shop, no order aboard |
| 8 | Sunset Shore Beach Run | flags between the dunes and the lifeguard towers on the sand | Tipsey | day (a dusk variant) | **M** | Sand surface: less grip and a slower top speed |
| 9 | Skate Park Line (the **Stunt Jump**) | Driftwood Skate Park (park leaf 5,6, to build) | Tipsey | day | **L** | The jump physics and the park as terrain. Points for airs and clean landings in 60 s. Earns Stunt Jump Master and the Daredevil |
| 10 | Drone Rings | from the Fleet Station pads over the basin, the moored boats and round the breakwater light | Delivery drone | any | **M** | Flying over water works now (a flat version); rings at height after fleet P2 (real `z`) |
| 11 | Harbour Buoys (later) | the basin, round buoys | Water taxi | day | **M** | After fleet P5 (boats on water) |

## 6. Rewards and progression
- **Medals** per challenge: bronze for finishing, silver and gold against par. They show on the board row and on the card.
- **Trophies:** Hydrant Hopper (all ten jumps), Slalom Master (gold, Cone Slalom), Stunt Jump Master (finally earnable: gold in the Skate Park Line). Possibly a new "Challenger" trophy: gold in five challenges.
- **Keepsakes:** Fire helmet (Hydrant Hopper), Gold cone (Slalom Master), a skate sticker (Stunt Jump Master), as `docs/keepsakes.md` plans.
- **Skins and liveries:** Fire Chief, Cone Dodger, Daredevil stay trophy rewards. A fleet challenge's gold gives that vehicle a garage livery (`fleetLooks`).
- **Fleet:** challenges **lend** a vehicle for the run (the drone, the robotaxi). Stories unlock vehicles (the fleet doc's ladder). Challenges don't, so the two never compete.
- **Money:** none per run, so nothing to farm. A one-off payment the first time each gold is won, paid by the server (open question).
- **The daily leaderboard stays** as the delivery board. Beside it, a **Today's Challenge** board: one challenge a day, picked by the date, with the day's variation. Every challenge also has its own daily and all-time boards on its card.
- **Regular** (play five different days) stays. A day with a challenge run counts as a day played.

## 7. Phased build plan

| Phase | Work | Effort | What Sir sees |
|---|---|---|---|
| C0 Kit | `CHALLENGES`, `challengeFocus`, start gate (rug, arch, beacon, host meet, Run it / Not now), course pieces (gate, cone, checkpoint, finish, stop mat) cached, the runner, HUD strip, result card, Retry, fail rules, `SubmitChallengeRun` + per-challenge boards, a **Challenges** section on the board (SVG icons, no emoji), map pins, search. Proof course: **Harbour Sprint** | M | Drive to the harbour, the beacon, the harbourmaster's line, 3-2-1, the checkpoints along the quay, the result card with a medal and the board |
| C1 Cone Slalom | On the park trail, with the crew setting out cones, the stop mat finish and daily direction. Then delete the slalom engine, `SL_SEED_DATE`, `slalomMapSelect`, the Market Dist. rug and the route-mode branches | S to M | The slalom in the park, in the live world; Retry from where he stopped |
| C2 Jump physics | Airborne `ow` (the `HJ_JUMP` arc, the depth bias, landing, crash), kicker and catch ramps as terrain like `derbyZ`. Bench at four headings, then into the game | L | Tipsey jumps a kicker on a real street, all four headings, day and night |
| C3 Hydrant Jump | The Fire Training Yard (Flats plan area 7) and its lane, ten levels, the captain. Then delete `loadChallenge`, `HJ_SEED_DATE`, `classic:true`, the tap meter and route mode | M (+M for the yard) | The ten-hydrant lane at the yard; the Fire Chief at 10 |
| C4 Today's Challenge | The daily pick, the variation, the board tab beside the delivery board | S to M | Today's challenge on the board, and the day's top ten |
| C5 World courses | Derby Ramp Run, Switchbacks, Precision Park, Tray Run, then Lights Out, Courier Trial, Beach Run | S to M each | One at a time, each with its photo and clip |
| C6 Skate Park | The park as terrain (Flats plan area 6), the Line, Stunt Jump Master | L | Airs in the bowl; the Daredevil earnable |
| C7 Fleet challenges | Drone Rings (flat now, rings at height after P2), Precision Park in the robotaxi (P3), Harbour Buoys (P5) | M each | Challenges in fleet vehicles |

C0 and C1 need no new physics and can start now. C2 is the one hard piece, and the Skate Park needs it too.

## 8. Open questions for Sir
1. **Courses always out, or set out on accept?** Recommended: built venues (the yard, the skate park, the derby ramp) always; street and park courses set out by the road crew when you accept, and picked up out of sight after.
2. **Hydrant Jump control:** real speed off the run-up (recommended), or keep the tap-to-charge meter?
3. **Leaderboard:** a Today's Challenge board beside the delivery board (recommended), or challenge times on the existing daily board?
4. **Money:** nothing per run and a one-off first-gold payment (recommended), or keep the slalom's capped daily tip (`ClaimSlalomTip`, $20 a day)?
5. **Fleet:** challenges lend a vehicle and give a livery (recommended), or may a challenge unlock one?
6. **The derby ramp:** keep it standing after Fourth Place, for the Derby Ramp Run?
7. **Retry:** every course a loop, so Retry starts where he stops (recommended), or is a quick move back to the start allowed?
