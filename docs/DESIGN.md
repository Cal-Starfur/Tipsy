# TIPSY — Design Document

*Living doc. Update when decisions change. Last updated: 2026-07-07.*

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
   (crack 4, dog 5, cone 6, trash 7, bin 8, scooter 9). Scooter/bin also halve speed.
2. **Driveways** — cross-slope, spans both lanes; continuous tilt while crossing,
   proportional to speed. The only counter is arriving slow.
3. **Lane hops** — 0.16 + speed × 4.5 stability cost. Hopping at speed is a gamble.
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

Hold right = throttle · hold left = brake · swipe vertical = lane hop (2 lanes).
Arrow keys on desktop. Tilt-the-phone controls were prototyped and cut
(iOS permission friction + Devvit webview gyro uncertainty).

## Rendering

Procedural isometric, zero image assets (CSP-safe for Devvit):
tiny 3D models (boxes/discs) → pitch/roll/facing transforms → 2:1 iso projection
→ Phaser Graphics. Face visibility culled against view axis (1,1,1).
Robot approved at sprite-lab v9: solid at all facings, chunky wheel cylinders,
undercarriage (belly plate, axles, battery) revealed on tip, hinged lid,
insulated-liner interior, sagging flag, spill physics.

**Known debt:** hand-managed draw order between parts. If layering bugs reappear,
move to a single global depth-sorted face renderer.

## Roadmap (hackathon: July 15)

1. Feel pass — tune tilt/brake/hop numbers from playtests. **← current**
2. Juice pass — hazard "!" telegraphs, hit shake, dust, sound, near-miss reward.
3. Devvit port — bundle phaser.min.js locally (CSP), server date for seed,
   Redis leaderboard (time + cargo + payout).
4. Share card — "I earned $31 in Scooter Row 🌯" + day's route.
5. Stretch: order choice as difficulty select (flat pizza vs boba tray = CoM).

## History

- v1 side-scroller (Matter.js compound-body physics) — proved the tipping feel,
  wrong perspective; kept in `prototypes/`.
- Labs pipeline: sprite lab (9 iterations) → world lab → route lab → playable.
