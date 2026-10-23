# People: what can be unified without breaking the game

Read against `game/index.html` at 874476a. Line numbers are from that build.

## Already shared, and working. Build on these, do not replace them.

| Shared piece | Where | Who uses it |
|---|---|---|
| `drawPersonHull` | 80853 | every person drawn, 50 call sites |
| `npcSay` / `updateSays` | 95313 | every speech bubble, 42 call sites |
| `meetWalk` + `meetTick` + `hospWalkAt` (walk up to Tipsey, face him, go back) | 28603 | hospital doctor and medic, cake baker, Walter, Gus, store reps, Marisol, Forno's cook, knock-down confrontations |
| `cakeMeet` (meetWalk with trees avoided and the short side) | 18827 | baker, Gus |
| `chatPick` + `crowdTalkFree` + `scene._chatRecent` | 15962 | street shoppers, mall shoppers (since Oct 23) |
| `knockDown` / `knockEnd` / `knockStand` | ~94180 | every knock-down |
| `partyLook` | 5215 | wedding, mall staff, Marisol, cook, most cast |

The "walk up to Tipsey" problem was solved once and reused seven times. That is
the pattern to repeat for walking, talking and colliding.

## What is duplicated

### A. Two kinds of walker, each written several times

**Stateful loop walkers** (step toward the next point each frame, wait for
Tipsey if he is in the way, say excuse me after a second):

- ballroom `BALL_WALK` loop, 23549 to 23575
- derby `DERBY_WALK` loop, 26329 to 26350
- kitchen runners, 23691 onward (adds floors and right-of-way)

Ballroom and derby are the same twenty lines with different constants: stop
radius 58 vs 70, excuse after 1200 vs 1100 ms, `BALL_EXCUSE` vs `DERBY_EXCUSE`,
`pk.x0 + a` vs `derbyW(a, n)`, wait-facing as an angle vs as a point. Same
record shape `{d, i, x, y, th, wait, moving, stuck, excT}`.

**Pure functions of time** (where is this person at t, no state):

- `mallStaffAt` (loop of stops with waits), 24539
- `hospWalkerAt` (ping-pong between two x), 28068
- `mallJailAt` (a grid path, used by store reps, Gus's crew, the guard), 25315
- `tixWalkAt` (a way of points ending at a meet spot), 19831
- `shopperAt`, `mallWalkerAt`, `walkPlanAt` (the three crowd engines)

`mallStaffAt` already generalizes `hospWalkerAt`: a ping-pong is a two-point
loop. `mallJailAt` and `tixWalkAt` are the same "walk a polyline over ms"
function in room and world frames.

### B. Three "who talks now" loops

`BALL_LIFE` and `DERBY_LIFE` are the same object (`w, convos, nextAt, cool,
recent, lastT`) with the same 15-line runner: pick a free group, pick fresh
lines, push a convo, advance each convo every 2600 ms, set a cooldown when
done. Each keeps its own `recent` (8 and 6 lines). The shared town-wide
memory and the two-at-a-time cap added Oct 23 cover shoppers only; a wedding
guest and a derby parent can still both talk while two shoppers do.

### C. Excuse-me lines in five places

`BOT_PASS` + `SAY.passRude/passPolite` (street, 9822), `BALL_EXCUSE` (23450),
`DERBY_EXCUSE` (26295), `SAY_CHAT.bot` through `chatPick` (shoppers and mall),
and the hospital's four strings pushed through `tpToast` (a toast at the top
of the screen, not a bubble over the person, 29100).

### D. Look generators in six places

`partyLook`, `staffLook` (18719), `storeRepLook` (25632), `mallJailLook`
(25604), `tixLooks` (19819), and an inline `lookOf` closure in `updateKnocks`
(94214). All produce the same `{build, skin, shirt, pants, hair, shoe}`.

### E. Knock-downs enumerate populations by hand

`updateKnocks` (94208) has six hard-coded loops: shoppers, seekers, errand
drivers, mall crowd, mall staff, mall play cast. Each has its own clock-hold
line while someone is down: `ref.t0 += dt`, `p.dly += dt; G.until += dt`,
`ref.tOff += dt`, `errand.pause += dt`. Anyone added to the game without a
loop here cannot be knocked down. That is exactly the Oct 20 bug ("people in
Shelly's and the arcade don't have collision").

### F. Collision with Tipsey is two philosophies in four code paths

- **Solid**: ballroom (`ballroomWalkerBlock` in `owStep` when in a pocket),
  derby (`derbyWalkerBlock`), hospital ward cast (`hospPeopleSolids` as
  volume solids).
- **Knockable**: street shoppers and the mall crowd (no block; above knockV
  they go down, below it they step round him).
- **Shove**: hospital hall walkers push him off them and toast.

Solid at a wedding and knockable in a mall is a fine design. Three mechanisms
for it is not.

### G. The mall applies its sidestep offset in three places

`mallWalkerAt` returns the path position; the caller adds `(m.oa, m.ob)` in
the draw (82245), in `updateKnocks` (94244), and in the say() closure
(25248). `shopperAt` folds `_avX/_avY` in before returning. One day a fourth
caller forgets, and someone is drawn here and hit there.

### H. Two clocks

`derbyLifeTick` and `derbyLeaveTick` run on `performance.now()`. Every other
people tick and `npcSay` itself run on `scene.time.now`. They agree while the
tab is foreground. When the iPad backgrounds the app or the Devvit feed
throttles frames they drift, and a derby bubble can outlive or precede its
speaker.

## Plan, by risk

### Tier 1: mechanical, same output, one session each

1. **Fold the mall offset** into `mallWalkerAt`'s return (G). Three call
   sites stop adding `m.oa/m.ob`. Zero behavior change.
2. **One `loopWalkStep(w, path, toWorld, bot, dt, opts)`** for the ballroom and
   derby walkers (A). `opts` carries stop radius, excuse delay and the excuse
   kind. Both systems keep their constants, so positions are identical.
   Kitchen runners stay as they are: their right-of-way rule is their own.
3. **One `pathAt(path, t, opts)`** replacing `mallStaffAt` and `hospWalkerAt`
   (A). `hospWalkerAt` becomes a two-point loop with no waits. Same output.
4. **One `talkRun(L, t, say, pools)`** for the ballroom and derby chatter (B),
   and both switch from their private `recent` to `scene._chatRecent` and
   `crowdTalkFree`. This is a deliberate visible change: the Oct 23 "talk
   less, repeat less" rule starts covering the wedding and the derby.
5. **One `EXCUSE` table and `excuseSay(scene, who, pos, kind, mood)`** (C).
   Kinds: adult, kid, staff, waiter. Street `BOT_PASS` moods (rude, polite,
   quiet) become the shared mood model. The hospital's toast becomes a bubble
   over the walker. Visible change in the hospital only.
6. **Looks through `partyLook`** (D). Each old generator becomes a one-line
   alias that keeps its exact seed derivation, so a knocked-down shopper still
   matches the shopper who was walking. No visible change.
7. **Derby onto `scene.time.now`** (H). Two lines.

### Tier 2: a registry, moderate, one session

8. **`PEOPLE` registry.** Each system registers a provider once:

   ```
   PEOPLE.add('mall', { each(t, fn) { ... fn(entry) ... } })
   entry = { x, y, z, th, moving, hidden, h, kind, mood, look, ref,
             solid: false, hold(dt) { /* this system's clock pause */ } }
   ```

   Then `updateKnocks` becomes one loop over `PEOPLE.each(t)` (E), `owStep`'s
   `blockAt` asks `PEOPLE.solidAt(x, y, r)` instead of naming
   `ballroomWalkerBlock` and `derbyWalkerBlock` (F), and hospital hall walkers
   become `solid: true` with an excuse bubble instead of the shove. The
   per-system `hold(dt)` closures carry the four clock-hold semantics exactly
   as they are today, so nothing about how a knocked-down person resumes
   changes. The registry is also what a headless people census reads.

   Order matters: providers must be read at the same `t` the ticks ran on.
   Keep `updateKnocks` where it is in `update()`, after the ticks.

### Tier 3: not now

9. **The three avoidance solvers** (street bands at 94470, mall wait-and-ease
   at 25170, kitchen right-of-way at 23633). Different frames, different
   free-space tests (`W.solidAt` vs `mallFreeOut` vs the kitchen's own), each
   tuned from your on-device feedback between Oct 14 and 22. Merging them now
   risks re-opening all three. The one preparatory step worth taking: let the
   street solver take a `free(x, y)` callback and a movers list, which it
   nearly does already. Then the mall can adopt it later, in its own session,
   with before and after clips.
10. **Room frames vs world frames.** Leave them. The registry converts at the
    boundary.

## What stays different on purpose

- Ballroom and derby people are solid; street and mall people are knockable.
  The registry makes that one flag, not two mechanisms.
- Ballroom and derby walkers only wait for Tipsey and never step round him.
  If he parks on a waiter's line the waiter says excuse me every six seconds
  for ever. Worth fixing later with "after N seconds, path round him", which
  the shared `loopWalkStep` makes a one-place change.

## How each step is checked

- Boot headless at six spots: a shopping street with groups out, the mall
  plaza, the mall ground floor, the play floor, the ballroom hall, the derby
  park, hospital floor 4. Same pinned date each time.
- For tiers 1.1 to 1.3 and 1.6 (meant to be identical): sample every walker's
  `{x, y, th, moving}` each frame for ten seconds before and after, and diff.
  The ballroom and derby waits use `Math.random`, so the check needs a seeded
  random under a debug flag for the comparison run only.
- For 1.4, 1.5 and tier 2 (meant to change): the same clips before and after,
  and you judge them in the artifact.
- Each tier-1 item is its own commit and its own push, so any regression
  bisects to one change.

## Order

1.1 (mall offset, trivial, mall is the current hot spot) → 1.2 → 1.3 → 1.4 →
1.5 → 1.6 → 1.7 → 2.8. Tier 3 waits until the mall is quiet.

## The target: a people fleet, built like the car fleet

Cars work because they share one road network: the fleet is built once over
the whole street graph (`buildCityTraffic`), each car is a record with a loop
and a clock, and each frame `trafficActive` asks which are near Tipsey. Adding a
street adds cars. Errands, kerb parking and the special vans branch off that
one fleet.

People never got that because they have no shared network. Each walkable
space (route pavement, city frontage, mall walk grid, pocket room, derby park,
hospital hall) arrived in its own session with its own frame, no shared layer
existed, and the behavior was rewritten alongside each path source.

The fleet has two halves:

1. **Walk maps**, one per place, the people equivalent of the street graph:
   `{ free(x, y), path(a, b), toWorld(a, b), fromWorld(x, y), floorZ }`. The
   mall has this already (`mallPath`, `mallFreeOut`); the street has it
   implicitly (`W.solidAt`, `W.surfaceAt`); ballroom, derby and hospital get
   thin ones.
2. **One population**: a person is `{ look, kind, mood, map, plan, clock,
   solid, hold(dt) }`. Plans are loop, errand/plan, or scripted meet. The game
   asks `PEOPLE.near(t, x, y, R)` as it asks `trafficActive`.

The behavior layer (yield solver, talk scheduler, excuse lines, knock-downs,
collision, meet) is written once over the population. A new place is then
data: walk map, count, spots, talk pools, kinds. Story characters stay
scripted but are fleet members, so they draw, collide and talk the same way.

Tier 2's registry is half 1 of the population. Walk maps are the missing
piece: the street and the mall are the first two, ballroom and derby next,
hospital last, each keeping its tuned constants.

CLAUDE.md rule to add once the fleet exists: *People live in the PEOPLE fleet.
A new place registers a walk map and a population. Never a new walker, excuse,
block or talk loop.*

## Interiors: what the built ones share, and the rules to set now

Exteriors are covered by the street grid. Interiors are not, but the ones
built so far already share more than it looks.

### What exists

| Interior | Model | Levels | Walkable test today | People today |
|---|---|---|---|---|
| Maritime Mall (concourse, anchors, play floors, security) | pocket (`POCKETS`, 25695) | L0 / L1 by escalator, anchors with own rooms (`MALL_HERE`) | `mallWalkGrid` built from `parkLandmarkVol` solids, with hand rules for the concourse edges | crowd engine, staff loops, baked cast at games |
| Seabreeze Ballroom hall | pocket (18421) | one | `W.solidAt` → `volBlockedAt(parkLandmarkVol)` | 3 loop walkers, 2 kitchen runners, baked seated cast, bartenders |
| Ballroom basement | pocket (18438) | one, service lift to the hall | same | kitchen runners, chef |
| Seabreeze Trophies | pocket (25952) | one | same | none |
| Marina General | deck floors (`ow.deck`, `HOSP_FLOORS`), not a pocket | 8 floors by lift | `garageDeckBlocked` → `volBlockedAt(hospLowerVol)`; rooms as rects | ping-pong hall walkers, static cast as solids |
| Mall garage levels | deck floors | 3 by lift | `volBlockedAt(mallGarageMidVol)` | none |

**The shared part is the collision model.** Every interior's furniture and
walls are LIB items declaring `solids`. `parkLandmarkVol(name)` collects them
into tiled volumes (with a per-level split when solids carry `lvl`), and
`volBlockedAt` answers "is a disc of radius R blocked here". Tipsey's
movement uses exactly that in every interior. The mall's people walk grid is
built from the same volumes: `mallWalkWarm` samples the room at 30-unit
cells, asks `volBlockedAt` at the person radius, and adds a few hand rules
(concourse edges, past the entrance glass). Strip the hand rules and that is a
generic interior walk map generator. The hospital is the one odd case: not a
pocket, but its floors are rect rooms plus a volume, so the same generator
works through a thin adapter.

### Rules for interiors (from the built cases)

1. **An interior is a pocket.** Frame (`x0, y0`), bounds, `levels` each with a
   `z`, `doors` with `at, half, side, spawn, world()`, solids from its LIB
   entry. The mall, ballroom, basement and trophy room are this already. The
   hospital exposes the same five things through an adapter; new interiors
   are pockets from the start.
2. **The walk map is derived, never drawn by hand.** `walkMapOf(pocket)`
   builds the grid from the pocket's solids at person radius, per level,
   warmed as Tipsey approaches (the mall does this). First test: it must
   reproduce `mallWalkGrid`'s two arrays exactly. Then the ballroom and the
   basement get one with no new geometry, and the kitchen runners' hand-listed
   waypoints can become a path.
3. **"People may not go here" is declared, not coded.** The mall's concourse
   edge rules become no-go rects flagged `people: true` (walk map only, not
   Tipsey). Staff-only areas (behind Forno's counter, the ticket exchange,
   the kitchen island) are the same flag.
4. **Spots are data.** `spots: [{ id, a, b, L, n, dwell, talk, kinds, face }]`
   per interior. The mall has this (`MALL_SHOPPER_SPOTS`, `MALL_KIDS` spots,
   `MALL_QUOTA`), the ballroom has it implicitly in its cast groups (tables,
   bar), the derby in its crowd rows. Population is a quota per spot plus a
   wandering count, which is the mall's model.
5. **Arrivals and departures go through declared doors**, from and to a point
   outside the pocket (`door.world()`), past the screen edge. The no-popping
   rule lives in that one function.
6. **Levels change only at declared connectors**: escalator lanes, lifts,
   stairs, each with its ride speed and hidden-while-riding flag (`mallRoute`
   is the model). A walker on L0 under an L1 slab is hidden unless Tipsey is
   on L0 in that room (`mallHiddenByFloor`, generalized); hidden means no
   draw, no bubble, no collision.
7. **Baked cast stays baked** (seated guests, players at games: 11 `cast:`
   arrays) for performance, but each is registered in the fleet as a static
   solid entry so collision and knock-downs work. The `MALL_CAST_DOWN`
   repaint is the one way a baked person leaves their piece.
8. **Staff walk one path format**: `[a, b, waitMs, face, line]` stops on a
   loop (`MALL_STAFF`, `BALL_WALK`, `KITCHEN` are all this shape already), run
   by the shared loop walker with the pocket's walk map between stops.
9. **Talk pools are per interior**, fed to the shared `chatPick` with the
   town-wide memory and the one cap; speaker positions come from the fleet;
   hidden by a floor means no bubble.
10. **Solid or knockable is one flag per interior.** Wedding: solid. Mall:
    knockable. Hospital halls: solid with an excuse bubble.
11. **Interior walkers live in room coordinates** `(a, b, L)` and convert to
    world at the fleet boundary with the pocket's `x0, y0` and the level's
    `z`, as `inRoomCoords` already does for drawing.

### What to build first on the interiors we have

1. `walkMapOf(pocket)` and prove it against the mall grid (exact match).
2. Give the ballroom hall and basement walk maps; move the three ballroom
   walkers and the kitchen runners onto the shared loop walker with the walk
   map between stops. Their stop lists and constants stay.
3. Hospital adapter: floors as pockets-by-adapter, hall walkers onto the
   loop walker, solid with excuse bubbles.
4. Then the registry (tier 2) reads all of them.

New interiors after that are a pocket, a LIB entry with solids and no-go
rects, a spots list and talk pools. No new engine.
