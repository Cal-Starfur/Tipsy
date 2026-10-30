# Kit 1: People (contract v2)

**What this covers:** bodies, looks, facing, gait and poses; seated and lying people; knockdowns; crowds; meetings with Tipsey; speech; and how people come and go.

**Evidence:** 187 past corrections. "Ev" is how many of them each rule would have prevented.

**Checker:** `node tools/world_review.js --kit doors,people`.

**Status codes:** **K** means the kit enforces the rule. **C** means every caller has to remember it, which is a flaw in the kit.

## Rules
| ID | Rule | Ev | Status | Check |
|---|---|---|---|---|
| P1 | **Nobody pops.** A person starts or stops being drawn only behind an open door (k ≥ .25), in a car or lift, or past the edge of the view. | 28 | C | ✅ appear/vanish; appear visibility is measured by drawing the frame with and without them |
| P2 | **Nobody fades.** Alpha is always 1, except for x-ray ghosts. No fade, hide or fade-to-black covers a move. | 6 | C | ✅ |
| P3 | **Every move is walked.** No cut to a pad, podium or cell, and no skid after landing. | 7 | C | ✅ teleport |
| P4 | **One person, one look, one home or job.** Nobody is recast. A look changes only off camera. One shop has one staff look. | 5 | C | ✅ recast |
| P5 | **Everyone drawn is in `CITY_PEOPLE`**, and crowd, knocks, doors, bubbles and x-ray all read it. | 2 (+~40 downstream) | C (no readers yet) | ✅ unlisted; ☐ "the registry is read" |
| P6 | **Shared pace:** `PEOPLE_WALK_V` with a role factor allowed, eased only at the start and stop. Joggers run. | 11 | C | ✅ pace |
| P7a | **One body:** every human in every view is `drawPersonHull` on a roster look, faceless. | 13 | C | ☐ drawer check |
| P7b | **The caller passes the heading** and the kit turns it (−π/2 for humans, not for dogs). | 9 | C (60 sites) | ☐ heading vs motion |
| P8 | **Talking to Tipsey:** `meetWalk` + `meetTick`, from their own side, in the front arc, turning the short way round, with nothing between them and the eye, and both faces showing. | 9 | K spot / C call | ☐ meeting check |
| P9 | **Nobody stands in anybody.** Keep body r 15 apart from each other, r 30 from Tipsey, and off every solid. Groups walk offset (in a line with a step), never stacked. | 18 | C | ✅ overlap census (people) |
| P10 | **A path is checked against solids over its whole length**, not just at the spawn point. Route, art and hitbox read one position function. | 8 | C | ☐ |
| P11 | **Motion drives animation.** Legs step from distance walked and wheels turn from distance rolled. Turning and facing run on one clock. | 11 | C (leg phase is a clock) | ☐ stride vs speed |
| P12 | **Poses are continuous.** Heading, pitch and roll never jump (a turn takes at least `MEET.turnMs` per π). Falls are jointed and come from the direction of the impact. | 9 | C | ☐ heading snap |
| P13 | **A pose lasts only for its action.** A handover goes hand to hand. A pusher stays at the handle. | 6 | C | eye |
| P14 | **Seated:** hips on the seat and shins from it. On a far chair they face us; on a near chair their back is to us. **Lying:** near the screen diagonal, with a shadow along the body and the face to the eye. Patients wear a knee-length gown. | 11 | C | pose sheet (eye) |
| P15 | **Places with a job have their cast**, standing where their furniture says. Nobody stands in a doorway, wall or furniture. | 16 | C | ✅ via P9 + census |
| P16 | **Hull art:** near limbs are drawn over far ones, back items before the body when the front faces the eye, nothing under a hat drawn over it, no caps at joints. | 37 | K | pose sheet |
| P17 | **Speech is `npcSay`.** Never through a floor, and never for a hidden speaker. | 3 | C | ☐ |
| P18 | **Anyone listed can be knocked down.** A knocked carrier keeps their passenger. | 4 | C | ✅ via P5 |

## Approved values (from fixes Sir accepted)
- **Pace:** 0.065 (`PEOPLE_WALK_V`). The accepted band is 0.06–0.075: shoppers 0.075, the mall crowd 0.07, hospital walkers 0.06. 0.16 was rejected as "sprinted".
- **Meeting:** `MEET` gap 85, cheat 0.55, turn 450 ms. The meeting spot is on their side, never behind Tipsey or in front of him.
- **Spacing:** body radius 15 + 7 padding (`CROWD.bodyR`). Tipsey's `botR` is 30.
- **Stride:** about 68 units per cycle (the 0.006 clock at 0.065).
- **Height:** `PERSON_H` 124.
- **Exemplars:** the mall crowd, which comes and goes past the screen edge (`mallPaveFar`); street residents, who come out of their own door (`householdOf` + `houseDoorsOpen`); hospital walkers, who face their walk.

## Known kit flaws (fix in the kit, not per caller)
1. **The registry has no readers.** Doors, crowd, knocks and bubbles each keep private lists.
2. **Each group has its own lifecycle.**
   - `hospCastCompile` still has `fade`/`hide` steps.
   - Seven `fade:'in'` steps remain.
   - `MALL_JAIL` fades.
   - There are fades to black at pocket entry, the heart-run ending and the holding cell.
   - Fix: one `spawnVia(door|car|lift|offscreen) → walk → leaveVia` with no fade verb at all.
3. **Leg phase comes from the clock**, so any speed other than 0.065 marches on the spot or slides. Fix: phase = distance ÷ stride.
4. **`meetWalk`, `MALL_JAIL` and `HOSP_JAIL` walk at 0.16.**
5. **`hospWalkAt` snaps the heading on arrival.**
6. **The −π/2 is written at each caller** (27 of 60 call sites leave it out). Fix: `drawPerson(heading, look, state)`.
7. **No separation off the street.** Only route and city walkers step round each other.
