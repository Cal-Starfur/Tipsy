# TIPSY — Design Document

*Living doc. Update when decisions change. Last updated: 2026-07-08 (v8).*

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
- **One address per day** (decided over multi-stop shifts): 60-second runs,
  Wordle energy. Multi-delivery "shifts" are a possible later mode.

## The city: Costa Palma (fictional)

Real-city version (LA) was built and cut: real streets invite unfavorable
comparison, and ranking real neighborhoods by difficulty is a community-relations
risk. Attribute system survives unchanged.

**Guardrail:** difficulty is always framed as INFRASTRUCTURE — pavement quality,
scooter litter, grades — never residents or safety.

12 districts, each with 4 gameplay attributes (hill, pave, litter, palms) and a
street-name pool. Roster lives in `game/index.html` (`HOODS`).

## What makes you tip (tilt sources)

1. **Impacts** — hazard hit at speed: impulse = speed × severity
   (dog 5, cone 6, trash 7, bin 8, scooter 9). Scooter/bin also halve speed.
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
3. **Lane changes** — 0.16 + speed × 4.5 stability cost, bled in over ~0.3s of the
   maneuver (not a spike). Changing lanes at speed is a gamble.
3b. **Palms are solid.** Lane −1 (building side) is planted with palm trunks that
   fully block movement: hard stop 30 units out; arriving fast adds a one-time bonk
   (tilt + cargo damage, re-armed if you back off 40+). Escape is always lateral.
4. **Hills** — gravity adds/removes speed (slope × 0.0003/ms); downhill overspeed
   feeds every other tilt source.
5. **Rough pavement rumble** — constant noise scaled by speed × (1 − pave).

Tilt spring-returns (decay 0.0021/ms). |tilt| ≥ 1 → tipped.

## Win / lose / payout

- **Win:** within the door zone, speed < 0.02, |tilt| < 0.5.
- **Lose:** tip over → 3D roll, lid hinges open, burrito + cup + fries spill
  with physics, X eyes. (The pratfall is the share moment.)
- **Payout:** tipMult × cargo% × 0.14 − seconds × 0.1, floored at $1.
  tipMult = 1 + hill×1.2 + (1−pave)×1.0 + litter×0.8. Cargo damage accrues per impact.

## Controls

Hold right = throttle · hold left = brake · swipe vertical = lane change
(**3 lanes**: −1 building side w/ palms, 0 middle, +1 curbside).
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
  2. **Not pursued further** — random background cross-streets not on
     the robot's own path (explored briefly in `labs/world-lab.html`).
     Superseded by direction 1 once it proved out.
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

## Known architecture problem: road/sidewalk generation isn't coherent

Flagged directly, not softened: **the road and sidewalk systems don't
actually know about each other.** Building `sidewalkendTurn` surfaced this
repeatedly rather than being a one-off bug. Concretely:

- **The road isn't one continuous thing.** It's assembled from separate,
  independently-sized pieces — the near-sidewalk's parallel road, a
  cross-street at the intersection, and the turn junction's own road —
  each with its own width computed in isolation. They happen to sit next
  to each other, not because they reference a shared layout, but because
  their numbers were hand-tuned to line up. Change one and the others
  don't know to follow.
- **Sidewalks don't spawn tile-aligned by default.** The turn junction's
  own grid-alignment bug (arc radius not a multiple of `T2`, silently
  producing a fractional-offset tile grid) was only caught because it was
  visually obvious. Nothing in the system *guarantees* alignment — it's
  something each new piece has to get right by hand, and it's been gotten
  wrong more than once this session.
- **Roads and sidewalks aren't mutually aware.** Neither one is generated
  with knowledge of where the other actually is; they're placed at
  fixed offsets and trusted to match up. A real system would derive both
  from one shared description of "here's the street," not compute a
  sidewalk and a road as separate acts that happen to agree today.
- **Traffic (`prop.car`/`prop.truck`) isn't road-aware either.** Cars spawn
  along a fixed row (`row:3.0`) rather than referencing the road's actual
  current width or lane structure — same disconnected-systems problem,
  just in the prop layer instead of the tile layer. If road width ever
  becomes dynamic (per the point above), traffic placement breaks
  immediately since it isn't derived from the same source.

This isn't a quick fix — it's a genuine redesign: one shared road/sidewalk
description that tile generation, ramp placement, AND traffic all read
from, instead of three-plus independent systems that currently coincide
by careful tuning. Worth a dedicated pass before building more junction
types on top of the current foundation, since each new piece is currently
paying the alignment tax by hand.

## Reference docs

- `docs/ASSETS.md` — canonical name for every art element (address art by these names).
- `/live.html` — live asset gallery on Pages; drawn by the game's own code.
  **Rule: change an asset in the game → re-inject into live.html → push both together.**

## Roadmap (hackathon: July 15)

1. Feel pass — tune tilt/brake/hop numbers from playtests. **← current**
2. Juice pass — hazard "!" telegraphs, hit shake, dust, sound, near-miss reward.
   - Idea: robot does a spin-out animation on puddle contact (hydrant burst
     variant spills a puddle — see prop.hydrantBurst in hydrant lab). Not
     wired into the game yet; hydrant is still decorative-only.
3. Devvit port — bundle phaser.min.js locally (CSP), server date for seed,
   Redis leaderboard (time + cargo + payout).
4. Share card — "I earned $31 in Scooter Row 🌯" + day's route.
5. Stretch: order choice as difficulty select (flat pizza vs boba tray = CoM).
6. Not scheduled, flagged for whenever junction work resumes: the road/
   sidewalk coherence redesign — see "Known architecture problem" above.
   Blocks porting `prop.sidewalkendTurn` cleanly and any future junction
   type; not blocking the July 15 hackathon deadline itself.

## History

- v1 side-scroller (Matter.js compound-body physics) — proved the tipping feel,
  wrong perspective; kept in `prototypes/`.
- Labs pipeline: sprite lab (9 iterations) → world lab → route lab → playable.
  Since then: per-prop labs for each new asset (car, sidewalkend,
  sidewalkendturn, etc.) — see `docs/ASSETS.md` and the `labs/` folder for
  the current full roster.
