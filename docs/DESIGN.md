# TIPSY — Design Document

*Living doc. Update when decisions change. Last updated: 2026-07-11 (v10).*

## Concept

**One sentence:** You are the routing AI of a top-heavy sidewalk delivery robot;
deliver one address a day without tipping over.

**The hook:** every obstacle hands the player the same real-time constraint problem
the real robot's pathfinding solves — lane × speed × timing — with two seconds to
solve it. The comedy of the source video (a delivery bot stuck on a pavement while
pedestrians flow around it) is the fail state: tip over, lid flops open, cargo
spills across the pavement.

**Name:** TIPSY (the robot, the game, the failure state).

## Format

- **Daily seeded route** — date string seeds everything; every player gets the
  identical street. Community glue for Devvit: shared fails, shared leaderboard.
- **One address per day** (decided over multi-stop shifts): targeting
  ~140-second runs, Wordle energy. Multi-delivery "shifts" are a possible
  later mode.
  **Not yet hit consistently (audited 2026-07-11):** actual generated
  routes vary enormously — measured across 100 seeds, playable distance
  (pickup to door) at max speed alone ranges from ~3s to ~490s, median
  ~250s. Route-generation randomness (`nTurns = 5+random(6)`, 1-3 blocks
  per leg) needs actual tuning against this target, not just a number
  change here.

## The city: Costa Palma (fictional)

Real-city version (LA) was built and cut: real streets invite unfavorable
comparison, and ranking real neighborhoods by difficulty is a community-relations
risk. Attribute system survives unchanged.

**Guardrail:** difficulty is always framed as INFRASTRUCTURE — pavement quality,
scooter litter, grades — never residents or safety.

12 districts, each with 4 gameplay attributes (hill, pave, litter, palms) and a
street-name pool. Roster lives in `game/index.html` (`HOODS`).

**Audit (2026-07-11) — attributes aren't equally tapped into:**
- `pave`, `litter`, `palms` are genuinely used: hazard density, crack/litter
  spawn mix, palm spawn rate, palette selection, a steering-jitter effect,
  and the tip multiplier.
- **`hill` is not** — it only touches palette selection and the tip
  multiplier formula. The actual terrain heightmap (`route.tiles`, read by
  `groundZ`) is hardcoded flat (`tiles.push(0)` for every tile, every
  route) — a district named for hilliness has zero effect on the ground
  actually driven on. **This is a real, wanted feature, not just an
  under-used stat** — real slope (grade affecting speed/tilt, hills adding
  a genuine difficulty axis distinct from hazard density) is planned and
  hasn't been built yet. See Roadmap.

## What makes you tip (tilt sources)

1. **Impacts** — hazard hit at speed: impulse = speed × severity
   (dog 5, cone 6, trash 7, bin 8, scooter 9, dwarf palm 6). Scooter/bin also
   halve speed; dwarf palms halve it too (fronds drag) — the bush is the
   SOFT counterpart to the solid tall palm: ~25% of building-side
   plantings, passable at a price.
   Dogs are now MOVING hazards: each spawn seeds coat, scar side, and
   behavior (sit vs patrol). Wanderers move within their spawn tile via
   `dogSpotAt(t, seed)` — deterministic, stateless — and the impact check
   shifts by the same function's along-offset, so a dog can walk into the
   robot's path (or bump a parked robot) and the hitbox always matches
   what's drawn. On impact the dog LEAVES (`dogFleeAt`, 2.6s): launches away
   from the robot along the route, angled toward the buildings and off
   the road, flat-out with tail tucked and shock marks at launch, then
   he's gone for the rest of the route — a hit dog does not loiter.
   Still stateless: just hitT + flee direction stamped on the hazard;
   once stamped the hazard is inert to further impacts.
   Cracks (spall redesign, crack lab v3) scale severity with their seeded
   size instead: 4 × (len/46), clamped 2–8 — a hairline is a shiver, a big
   break-off is a real lurch. Road rows also get decorative spalls in
   asphalt tones (rows 2–3, unreachable, zero physics).
2. **Heaved slabs** (`prop.slab`, live in-game; replaced `prop.driveway`,
   removed V19 — slabs are the cross-slope hazard now, lane-specific and
   dodgeable where driveways spanned all lanes undodgeably) — the ramp concept redesigned
   (ramp lab v2) into a single sidewalk tile lifted along one side edge (root
   heave). Lane-specific, unlike driveways. Two-stage physics, physically
   ordered: (a) lip kick at the leading joint, one-shot, `side × speed × lift × 0.9`
   (+ cargo damage ×30) — the raised-side wheels climb first, mass swings to the
   low side; (b) sustained cross-slope while on the wedge,
   `side × speed × 0.030 × (lift/5)` per ms. The spring makes slow crossings
   safe (steady-state tilt ∝ speed), so the counterplay is creep or lane-hop.
   Underfoot the robot rides `lift/2` height + the honest wedge angle
   (`atan(lift/92)`), both smoothed. Generator spawns runs of 1–3 consecutive
   slabs (spacing 92) with row drift, rarity `0.18 + (1−pave)×0.75` per spawn
   window — bad-pavement districts get bad sidewalks. Lift 3–8 seeded per slab:
   at full speed lift 7+ is near-certain death; crept over, all survivable.
2c. **Hydrants + hydroplane** (`prop.hydrant`, live in-game; dialed in the
   hydrant hit lab) — sparse curb-side (row 1) fixtures, ~0.6/route. Cast
   iron: hard blocker, palm contract (stop 26 out); arriving > 0.035 adds
   the bonk (sev 10 × speed + damage). Hit speed ≥ 0.055 shears the nozzle:
   burst persists for the route — water arc + a flood pooling around the
   base (grows 1.8s to r41.4). Entering the flood with speed > 0.02
   hydroplanes: eased pirouette of spin × (entry/0.05) turns over
   0.8–1.1s (slipYaw layered into facing yaw), hydro drag, tilt wobble,
   then grip (0.012 rad/ms) unwinds the shortest way straight. Robot eyes
   go alert-orange for the whole slide. One slide per soaking; re-arms
   after leaving the flood. The trap: the flood covers where a blocked
   robot stands, so re-approaching your own burst is how most spins start.
3. **Lane changes** — 0.16 + speed × 4.5 stability cost, bled in over ~0.3s of the
   maneuver (not a spike). Changing lanes at speed is a gamble.
3b. **Palms are solid.** Lane −1 (building side) is planted with palm trunks that
   fully block movement: hard stop 30 units out; arriving fast adds a one-time bonk
   (tilt + cargo damage, re-armed if you back off 40+). Escape is always lateral.
4. **Hills** — gravity adds/removes speed (slope × 0.0003/ms); downhill overspeed
   feeds every other tilt source.
5. **Rough pavement rumble** — constant noise scaled by speed × (1 − pave).

Tilt spring-returns (decay 0.0021/ms). |tilt| ≥ 1 → tipped. Cornering-lean
coefficient is 0.115 as of 2026-07-10 (was 0.08 — see "Cornering physics &
rotation" below; the old value made full-speed cornering asymptote just
under the tip threshold and never actually cross it).

## Win / lose / payout

- **Win:** `doorS - botS` within (-60, 34), speed < 0.02, |tilt| < 0.5 —
  distance-along-route only.
  **Known issue (found 2026-07-11, not yet fixed):** a same-day-earlier
  session added an `onLane(3)` check here specifically to stop the robot
  "winning" from out in the road at the right distance but the wrong
  lateral position — but the current code doesn't have it, and even if it
  did, `onLane(3)`/lane-3 was tied to the OLD `MAT_PERP`/`DOOR_PERP`
  address system, which is now fully retired (see block-wrap section
  below) in favor of a real house unit whose position doesn't correspond
  to a fixed lane number anymore. In the current 4-lane system (see
  Controls) the mat is conceptually lane 3 (building side) and the robot
  spawns at lane 1, so the right check is likely lane 2 or 3 — needs
  confirming against `this.addrDoorPos` (the real door's actual position,
  already computed each frame the address block is visible) before
  picking the exact number.
- **Lose:** tip over → 3D roll, lid hinges open, burrito + cup + fries spill
  with physics, X eyes. (The pratfall is the share moment.)
- **Payout:** tipMult × cargo% × 0.14 − seconds × 0.1, floored at $1.
  tipMult = 1 + hill×1.2 + (1−pave)×1.0 + litter×0.8. Cargo damage accrues per impact.

## Controls

Hold right = throttle · hold left = brake · swipe vertical = lane change
(**4 lanes**, `SIDEWALK_ROWS=4`: lane 0 curbside → lane 3 building side
w/ palms; robot spawns on lane 1).
The lane change is a 480ms smoothstep maneuver: forward motion continues
(diagonal path), the robot yaws its nose into the turn (peaks mid-crossing),
and the stability cost bleeds onto the tilt meter across the maneuver.
Arrow keys on desktop. Tilt-the-phone controls were prototyped and cut
(iOS permission friction + Devvit webview gyro uncertainty).

**Camera:** two-axis iso tracker — follows botX (+95 look-ahead), botY (lane), and
ground height, so the robot stays anchored on screen and lanes pan the world.
Default zoom K=1.5, view centered on the middle of the lane band.

## Rendering

Procedural isometric, zero image assets (CSP-safe for Devvit):
tiny 3D models (boxes/discs) → pitch/roll/facing transforms → 2:1 iso projection
→ Phaser Graphics. Face visibility culled against view axis (1,1,1).
Robot approved at sprite-lab v9: solid at all facings, chunky wheel cylinders,
undercarriage (belly plate, axles, battery) revealed on tip, hinged lid,
insulated-liner interior, sagging flag, spill physics.

**Known debt:** hand-managed draw order between parts. If layering bugs reappear,
move to a single global depth-sorted face renderer.

## Cornering physics & rotation (rewritten 2026-07-10)

Built and dialed in `labs/corner-robot-lab.html` — a standalone bench with the
verbatim robot rig and a real fillet-arc corner, isolated from route
generation/hazards specifically so the rotation math could be scrubbed
frame-by-frame. Four real bugs found this way, all ported into
`game/index.html`:

- **Cross-turn ground-speed asymmetry (fixed).** `botS` parameterizes the
  route's CENTERLINE arc length, but the robot draws offset sideways by
  `laneOff`. On an arc, the robot's actual traced radius is
  `R − seg.sign*laneOff` — smaller toward the turn's inside (crawls), larger
  toward the outside (speeds up). Measured up to a **30× real ground-speed
  difference** between turn directions at a fixed lane before the fix, purely
  from parameterizing motion by the wrong arc length. Fix: scale `botS`'s
  per-frame advance by `R / effectiveR` (clamped 0.05–20) so real ground
  speed matches the throttle-controlled speed regardless of which way the
  lane sits relative to the curve.
- **Rotation snap at every facing-quadrant boundary (fixed).** The robot's
  draw orientation used to be `this.f` (a discrete 0–3 facing, swapped in
  90° steps) plus `this.yaw` (a residual angle reset every time `f`
  incremented). That reset is a real, unavoidable discontinuity in the raw
  yaw number, and several downstream draw decisions were hard-thresholded on
  continuous quantities that happened to cross zero at exactly that same
  moment — a body panel's shading swatch and visibility, and which side's
  wheels draw in front of vs. behind the chassis — all popping in a single
  frame. Fix: replaced the `f`/`yaw` split entirely with one continuous
  `drawAngle`, eased toward the true heading every frame
  (`Phaser.Math.Linear(this.drawAngle, target, 0.12)`), with the target
  angle **unwrapped** to the representation closest to the current
  `drawAngle` first — `headingAt()` can report the same physical direction
  a full 2π apart depending which route segment it reads from (the exit leg
  of a turn computes heading as `f*90°` in canonical `[0, 2π)`, while the
  arc feeding into it may have swept negative), and without unwrapping,
  `drawAngle` chased that fake 360° jump instead of the real heading.
  `this.f` is kept around for hazard/HUD logic only; nothing in the draw
  pipeline uses it anymore.
  - *Explored and reverted:* smoothing the hard-threshold draw decisions
    directly (alpha-blend the shading/visibility crossings, cross-fade the
    wheel draw order) fixed the pop as a standalone patch, but became
    unnecessary once `drawAngle` removed the underlying discontinuity —
    kept as *more* code for a benefit that's now imperceptible, so both were
    reverted back to the original hard-threshold versions. One exception
    surfaced during that work: alpha-blending the LID's draw order actively
    made things worse, because unlike the body/wheel crossings (fast,
    few-frame passes) the lid's near/far delta can *plateau* near zero for
    hundreds of units during a sustained lean — both crossfade passes fire
    for that whole stretch, and the far-layer copy gets fully painted over
    by the body's opaque top face regardless of alpha, leaving only a
    washed-out near-layer remainder visible. Lesson for any future crossfade
    fix: check whether the underlying delta *crosses* quickly or *hovers*
    before picking blend vs. clean binary.
- **Cornering roll leaking into false forward pitch (fixed).** Local
  vehicle-frame tilts (hop nose-steer yaw, hill pitch, cornering lean/roll)
  have to apply BEFORE the heading rotation, not after — pitch/roll rotate
  around the robot's own current axes, and the heading rotation then points
  that already-tilted shape the right way on screen. The first pass at the
  `drawAngle` rewrite applied heading first by mistake, which is fine at
  the start/end of a turn (heading ≈ cardinal) but wrong mid-turn: roll's
  banking axis gets rotated by however far into the turn the robot is,
  bleeding cornering lean into an apparent nose-down/up tilt instead of a
  clean left-right bank. Verified numerically in the lab: same 0.35 rad
  roll, zero pitch — buggy order gave the body's front and back corners a
  14-unit height difference (a fake pitch); corrected order gives exactly
  0.00, with the full lean correctly concentrated left-right instead.
- **Full-speed cornering couldn't tip (fixed).** The cornering-lean tilt
  accumulator (`tilt += seg.sign * speed² * COEF * dt`) fights the stability
  spring (`tilt -= tilt * 0.0021 * dt`) every frame — a stable equilibrium,
  not a ramp, at `tilt_eq = speed² * COEF/0.0021`. At the old `COEF = 0.08`
  and max speed 0.15, that equilibrium was **0.857** — mathematically
  incapable of ever reaching the `|tilt| ≥ 1` tip threshold no matter how
  long the corner, confirmed both algebraically and by driving real routes
  at full throttle (peak measured: 0.854). Raised to `COEF = 0.115`
  (equilibrium ≈ 1.23 at max speed) so sustained full-speed cornering now
  genuinely tips, while moderate cornering speed (~0.10) stays well clear
  (eq. ≈ 0.56) — only reckless full-speed turns are punished.

Two smaller fixes landed alongside the above, found while driving the lab:
- **Wheel spin direction.** `wheelPhase` was incrementing with forward
  motion, which put the top of each wheel moving backward relative to
  travel — physically backwards for rolling-without-slipping (the top
  should move forward, the bottom backward, relative to the body). Flipped
  to decrement instead.
- **Flag anchor moved from the lid to the body.** Previously anchored
  exactly at `LID.z1` with its base inside the lid's own footprint —
  visually mounted on the lid. Moved to a body corner just outside the
  lid's footprint (`LID` is `hx:22/hy:16`, `BODY` is `hx:26/hy:20`) so it
  doesn't clash with the lid now cracking open mid-corner (see below).

**New, unresolved by design:** the lid now cracks open partway
(`lidAng` eases toward `0.4` rad) whenever cornering fast (`seg.type ===
"arc" && speed > 0.11`), as a cornering-speed tell. Added as an experiment
(hypothesis: changing the lid's geometry mid-turn would affect residual
draw-order behavior around it); kept because it reads well, not because it
was confirmed to fix anything specific.

Predicted conflict with the cargo-spill lid-hinge animation on tip was
confirmed during the same-day consistency pass: since tipping can now
happen mid-corner (see the tip-threshold fix above), the lid can be
mid-crack (`lidAng ≈ 0.4`) at the exact instant `state` flips to
`"tipped"`. The tip animation's own target (`tipT > 0.5 ? 2.35 : 0`)
overrides that with `0` until `tipT` crosses 0.5, so the lid briefly
**closes** before swinging open — confirmed frame-by-frame
(`0.396 → 0.362` right at the transition). A fix was drafted (clamp the
tip animation's target to never go below the lid's current angle) but not
yet applied to `game/index.html` — still open.

## Sidewalkend curb ramps (prototyped, not yet in game)

Started as `prop.driveway` (a flat cross-slope apron), rethought entirely into
an ADA-style curb ramp system. Fully built and physics-tested in
`labs/sidewalkend-lab.html` — nothing here is wired into `game/index.html`
yet. This section is the port spec.

**Geometry — exactly 2×3 sidewalk tiles (184×276 units):**
- Cross-width (perpendicular to travel) is fixed at exactly 3 sidewalk tiles
  (276 units = `1.5*T2` each side), matching the real 3-lane sidewalk.
- Along-travel depth is exactly 2 tiles (184 units = `T2` each side of the
  anchor), snapped to whole tile-row boundaries (anchor at a half-integer
  `s`, e.g. `s=3.5` spans tile-rows 3+4 with no fractional overlap).
- Only the **center lane** has a ramp. Outer lanes are flat sidewalk the
  whole way, with a real curb (no ramp) where the sidewalk ends.
- Two mirrored variants, each its own function (`drawRampDown` /
  `drawRampUp` in the lab) — not one function with an "inverse" flag, that
  approach kept producing mismatches. Real ADA design in both directions:
  the detectable warning pad sits on a flat landing, never on the active
  slope. Down-ramp: tile 1 slopes sidewalk→street, tile 2 (pad) flat at
  street height. Up-ramp: tile 1 (pad) flat at street height, tile 2 slopes
  street→sidewalk. `sidewalkZ=2`, `streetZ=-3` (5-unit drop) — **not yet
  matched by the base tile system**, which renders sidewalk and road at the
  same flat z=0 (see open issue below).
- Yellow ADA pad is exactly one sidewalk tile (92×92), always the tile that
  touches the street, with a 5×5 truncated-dome dot grid and a lighter
  highlight dot per bump for texture.
- Curb walls bridge the sloped strip to the flat outer columns — needed
  because a lone sloped tile next to untouched flat columns otherwise reads
  as a floating/glitched edge, not a real curb.

**Physics (all confirmed working in the lab, needs porting + tuning):**
- **Tilt (roll):** `tilt += botRow * speed * 0.055 * dt` while within the
  ramp's along-travel extent. `botRow` (−1/0/1) is already the correct sign
  — opposite lean in the two outer lanes, zero in the center lane (the
  center sits on the pad's straight slope: pure pitch, no side-to-side
  lean). Same `0.055` coefficient the game already uses for driveway tilt.
- **Pitch:** `pitch = -atan(groundSlopeAt(s, row))`, identical formula to
  the game's own hill pitch, just fed a ramp-aware slope sample instead of
  terrain grade.
- **Jitter:** small random roll wobble (`±0.05`) while crossing the yellow
  pad specifically, layered on top of tilt-derived roll but *not* folded
  into the `tilt` accumulator itself — simulates rolling over the dome
  texture without affecting the tip-over threshold or lingering past the pad.
- **Outer-lane curb block:** no ramp under the outer lanes, so the far curb
  is a real wall — position clamps right at the boundary, `stuckAmt` ramps
  up same as the game's palm-tree stuck mechanic (jitLoop position offset +
  a "?!" bubble past `stuckAmt > 0.5`), decays back down if not blocked.
- **Curb-drop tip trigger:** dropping off an unramped curb while *already*
  leaning hard (`|tilt| > 0.55`) is enough to fully tip, same direction as
  the existing lean — works either side. Otherwise it's a stumble kick
  (`tilt += sign * 0.35`) without a full tip.

**Open architecture question — placement isn't resolved.** The original
assumption (ramps at every corner, robot experiences the physics crossing
each intersection) doesn't fit the current route: corners are smooth
filleted arcs, not street crossings — the robot never actually leaves its
own sidewalk or changes elevation going around one. Two directions were
explored in the labs:
  1. **Built** — `prop.sidewalkendTurn`, in its own dedicated lab
     (`labs/sidewalkendturn-lab.html`, pushed): a full rewrite of one
     corner as a real perpendicular intersection. Curb ramp down, a wide
     tile-aligned arc turn (radius `1.5*T2`, deliberately a multiple of
     the tile size — a non-aligned radius was the actual cause of an
     earlier grid-misalignment bug), a full road crossing with its own
     down/up ramp pair on the new heading, sidewalk continuing after.
     All the tilt/pitch/jitter/curb-drop physics from the section above
     are mirrored onto this second crossing and confirmed working. The
     junction's whole geometry (arc center, end point, new heading) is
     computed once from its own config (`{s, radius, sign}`) rather than
     lazily when the robot approaches, so it exists as one complete piece
     instead of assembling itself in front of the player. Turn-state is
     consolidated into a single `this.sidewalkendTurn` object rather than
     scattered properties, specifically so a second instance could be
     dropped onto another corner later without a rebuild.
  2. **Not pursued further, likely moot now** — random background
     cross-streets not on the robot's own path (explored briefly in
     `labs/world-lab.html`), meant to make the city feel populated.
     Superseded by direction 1 (below) once it proved out, and now
     further superseded by the block-wrap city (houses/storefronts/parks
     behind the sidewalk — see "City block-wrap" below), which solves the
     same "feels like a real place" goal a different way. Worth an
     explicit call on whether this is dead or just deprioritized.
  Still open: **none of this is ported into `game/index.html`.** It's a
  fully working, physics-complete prototype for ONE corner. Placing it at
  actual route corners (and deciding whether every corner gets one, or
  only some) is unstarted.

**Known issue to resolve before porting:** the base tile system (both in
`game/index.html` and the labs) renders sidewalk and road at identical flat
z=0 — only a cosmetic curb-lip line marks the boundary, no real elevation
difference. The ramps assume a real 5-unit drop. Needs a decision: model
real sidewalk elevation everywhere, or make the ramps a color/texture cue
only with no actual height change.

## Road/sidewalk architecture: unified (resolved)

Was flagged as a genuine architecture problem — the road, sidewalk, and
traffic systems used to be independently-tuned pieces that happened to line
up by hand, not because they referenced a shared layout. **Resolved**:
verified against the current `game/index.html` that all of it now derives
from one shared system.

- **`buildGrid(cols, rows)`** constructs a real planar graph — actual
  intersection nodes (`nodeShape` classifies each as cross/t/straight/
  corner/end), not independently-placed pieces that coincidentally sit next
  to each other.
- **`classifyAt(edges, x, y)`** is the single source of truth for
  road-vs-sidewalk-vs-block at any point, read by tile rendering,
  `buildSidewalkGeometry()`, and route generation alike — one function,
  not three systems trusted to agree.
- **Sidewalk tiles are generated by iterating the road's own `grid.edges`**
  (`buildSidewalkGeometry`), not placed at an independently-computed offset
  — alignment is guaranteed by construction instead of by hand-tuning.
- **Traffic is road-derived**: `CAR_LANE = ROAD_HALF / 2`, not the old
  fixed disconnected row (`row:3.0`). If `ROAD_HALF` ever changes, traffic
  placement follows automatically.
- **`CORNER_R = ROAD_HALF + SIDEWALK_W`** — the robot's turning radius
  through an intersection is itself derived from the same road/sidewalk
  constants, not a separately-tuned number (this is also the invariant
  that had to hold for the cross-turn ground-speed fix above: `CORNER_R`
  must exceed the widest lane offset or the offset math folds through the
  arc's center).

Worth noting this is a different, narrower thing than the
`prop.sidewalkendTurn` open question below (curb ramps at corners) — that's
about whether the robot's own smooth fillet-arc path should ever cross a
real street boundary at all, which is a route-construction decision, not a
road/sidewalk-coherence one. Still open, unrelated to this fix.

## City block-wrap: houses, storefronts, parks, address & pickup (built)

Previously flagged as "known design debt" — the road/sidewalk was real but
the space behind it was bare sky/ground. **Resolved.** Every block in the
grid now renders as housing, park, or commercial (seeded 1/3 each), with a
full prop ecosystem, and the day's address and pickup are real locations
within it rather than a floating set piece.

**Architecture:**
- `buildBlockLayout`/`buildExteriorLots` assign a type to every interior
  block and every perimeter lot around the world's outer edge.
- `packEdge`/`packEdgeNoGap` pack houses (with yard-fence gaps) or
  storefronts (edge-to-edge, no gaps) along a block's 4 edges, with corner
  clearance (`cornerMargin = HOUSE_DEPTH+T2*0.3`) so perpendicular edges'
  buildings never overlap at the corner.
- **Hull volumes + per-part depth sorting + single geometry with
  orientation transforms** is the standing pattern for every prop — not
  pose interpolation or rendering hacks.
- Roofs draw as a **separate, globally-last pass** (`isRoof` tag on queued
  items, flushed after every body) — the per-unit depth sort is too coarse
  (one number per unit) to guarantee a roof never gets painted over by a
  neighboring unit otherwise.

**Wall cutaway (f===1/f===2 headings only):** the fixed iso camera means
only two of the four travel directions can put a nearby block's near wall
between the camera and the robot. That block's near edge (`(f+2)%4`) gets
excluded from normal rendering and replaced: a single continuous wood
fence for housing (grass stays), painted parking stalls with real
`car`/`truck` props (nose-in, sized to the actual prop dimensions, capped
to a small 2-3 stall cluster, ~85% occupancy) for commercial. The
replacement fence is the one piece of block-wrap content routed through
proper depth occlusion (`layerFor`) rather than always-behind-the-robot —
it sits right at the robot's own sidewalk line, unlike a house which is
set back, so "always behind" made him look like he was standing through it.

**Address & pickup are real locations, not floating points:**
- `findGoodS` picks `doorS`/`pickupS` only on `f===0`/`f===3` legs (the
  two headings the cutaway never touches), so the delivery/pickup point
  can never collide with its own building being cut away.
- `findAdjacentBlock` derives which real block borders that route
  position (same `(f+2)%4` relationship the cutaway uses, read in the
  other direction) and forces it to `housing`/`commercial`.
- `closestUnitIndex` picks whichever packed house/store unit is actually
  closest to where the route crosses that block's edge — not just the
  first one. On a 1600+-unit block face, "always unit 0" could put the
  door/shop over a thousand units from the route; this was a real,
  confirmed bug, fixed for both address and pickup.
- The address's real door/mat/`world.customer` now render as part of that
  specific house unit (`drawHouseUnit`'s `isAddress` flag, wired for the
  first time). The old floating system (`drawHouseFacade`, `HOUSE_ART`,
  `NEIGHBOR_L_ART`, `NEIGHBOR_R_ART`, plus the `ROBOT_ROW`/`MAT_PERP`/
  `DOOR_PERP`/`DOOR_ALONG` route-relative constants it depended on) is
  fully retired, not kept as a fallback.
- The robot now spawns at `pickupSpot` — the real position just outside
  the pickup shop, computed once in `generateRoute` and refined so
  `pickupS` lands on the closest matching on-route point (fast analytical
  per-segment projection, not brute-force stepping — that cost ~320ms/
  route before being replaced). Progress bar now measures
  `pickupS → doorS`, not the old fixed `SPAWN_S → doorS`.
- The pickup shop itself is a stationary worker standing beside the
  robot's real spawn point, facing it — position and facing computed
  directly from the two known world points rather than edge-relative
  axis assumptions, after an animated out-and-back walk went through
  several rounds of direction/timing bugs (wrong facing, walk distance
  drifting from the robot's actual position, landing behind instead of
  beside). No cargo-pickup game state exists yet, so this is ambient set
  dressing, not gated on an actual pickup event.

**Prop variety fixes (2026-07-11):**
- Park trees: were always an isolated single `palmDwarf`, now cluster
  into groups of 1-3 with an occasional tall `palm` mixed in, and heights
  vary more widely (~12% chance of a dramatically tall specimen).
- Sidewalk hazard palms: same clustering added as decorative-only
  companions (never added to the hazard array, so collision/spacing
  balance is untouched).
- `prop.planter` had two real bugs: hardcoded face selection only correct
  for one of four possible orientations (fixed with the same direction-
  aware formula `drawPersonHull` already used), and the fallen/tipped-over
  pose called a locally-shadowed relative-offset `W()` with already-
  absolute coordinates, doubling its position on anything but the origin
  (invisible in the lab, which tested near the origin).
- `prop.car`/`prop.truck` halved in size (450×180 → 225×90) — full-size
  was disproportionate once seen parked in the new stalls.

**Known follow-up, not yet fixed:** `buildSidewalkGeometry`'s corner-cell
loop calls `classifyAt` (itself O(edges)) for a large candidate set —
roughly O(edges²), costing ~310ms per route generation on a 15×15 grid.
Found while investigating an unrelated performance question; unrelated to
anything in this section, but real and worth a look before the deadline.

## Reference docs

- `docs/ASSETS.md` — canonical name for every art element (address art by these names).
- `/live.html` — live asset gallery on Pages; drawn by the game's own code.
  **Rule: change an asset in the game → re-inject into live.html → push both together.**
- `labs/corner-robot-lab.html` — standalone dial bench for the robot's own
  drawing + cornering rotation/physics, isolated from route generation and
  hazards. Drive/scrub controls, ghost onion-skinning for catching
  frame-by-frame draw glitches, both turn directions, all four lanes.

## Roadmap (hackathon: July 15)

1. **Fix the win-condition lateral check** — see "Known issue" under
   Win/lose/payout above. Small, scoped, but affects whether a delivery
   can complete without the robot actually being at the door. **← current**
2. **Real hills** — `hood.hill` currently only affects palette and the tip
   multiplier; `route.tiles` (the terrain heightmap `groundZ` reads) is
   hardcoded flat for every route regardless of district. Wanted as a
   genuine difficulty axis (grade affecting speed/tilt), not just an
   under-used stat — see district audit above.
3. **Route-length tuning** — targeting ~140s runs; actual generated
   routes currently range ~3s to ~490s at max speed (median ~250s,
   measured across 100 seeds). Needs tuning against `nTurns`/blocks-per-leg
   in `buildWalk`, not just a target-number change.
4. Feel pass — tune tilt/brake/hop numbers from playtests.
5. Juice pass — hazard "!" telegraphs, hit shake, dust, sound, near-miss reward.
   - Idea: robot does a spin-out animation on puddle contact (hydrant burst
     variant spills a puddle — see prop.hydrantBurst in hydrant lab). Not
     wired into the game yet; hydrant is still decorative-only.
6. Devvit port — bundle phaser.min.js locally (CSP), server date for seed,
   Redis leaderboard (time + cargo + payout).
7. Share card — "I earned $31 in Scooter Row 🌯" + day's route.
8. Stretch: order choice as difficulty select (flat pizza vs boba tray = CoM).
9. `prop.sidewalkendTurn` port is unblocked now that road/sidewalk
   architecture is unified (see above) — the remaining open question is
   the route-construction one in "Sidewalkend curb ramps" (whether/where
   the robot's own fillet-arc path should cross a real street boundary),
   not an architecture blocker. Not scheduled before July 15.
10. `buildSidewalkGeometry` performance (~310ms/route, see block-wrap
    section) — not urgent for a once-a-day route load, but worth fixing if
    time allows; O(edges²) from an unbounded `classifyAt` call per
    candidate cell.

**Done since last update:** the block-wrap city (houses/storefronts/parks/
address/pickup) — see new section above. This was the bulk of the "planter
and car makeovers" line item from the previous roadmap; planter had two
real bugs fixed, car/truck halved in size, but "makeover" as a visual
redesign wasn't otherwise pursued.

## History

- v1 side-scroller (Matter.js compound-body physics) — proved the tipping feel,
  wrong perspective; kept in `prototypes/`.
- Labs pipeline: sprite lab (9 iterations) → world lab → route lab → playable.
  Since then: per-prop labs for each new asset (car, sidewalkend,
  sidewalkendturn, etc.) — see `docs/ASSETS.md` and the `labs/` folder for
  the current full roster.
- 2026-07-10: cornering physics + rotation rewrite (V29/V30) — see
  "Cornering physics & rotation" above. New lab:
  `labs/corner-robot-lab.html`.
- 2026-07-11: block-wrap city (houses/storefronts/parks/fences/parking),
  real address & pickup locations, roof/planter/palm/car fixes — see
  "City block-wrap" above.
