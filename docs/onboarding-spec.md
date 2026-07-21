# Tipsy — Beginner/Onboarding Level Spec (v1)

## Goal
A fixed, always-easy level that teaches core controls, is reliably completable by a brand-new player, and gives them a personal record worth chasing — separate from the 3-route threshold that unlocks the editor, and not forced on first launch.

---

## Placement & Discovery
- **Optional, discoverable** — not a forced first-run gate. Surfaced as a clearly-labeled menu option (e.g. "Learn the Ropes"), distinct from "Today's Route."
- **Does not count** toward the 3 routes needed to unlock the editor — that threshold should reflect real procedural-route reps, not a single fixed tutorial.
- Recommend leaving it permanently available rather than one-time-only — it doubles as a low-stakes warm-up level for returning players too, not just newcomers.

---

## Data Shape
Reuses Phase 1's challenge-route infrastructure directly — no new systems.

```json
{
  "id": "onboarding_v1",
  "seed": "<fixed>",
  "modifiers": {
    "hazardDensity": "minimal",
    "distance": "short",
    "parTimeMultiplier": "generous"
  },
  "parTimeOverride": "<generous>",
  "name": "Learn the Ropes"
}
```

Same route-gen, tip engine, and par-time HUD as every other route — no new rendering or physics required.

---

## Difficulty Tuning
- **Distance:** well under a normal daily route
- **Hazards:** none, or one or two at most, placed with generous clearance — a miss should teach the mechanic, not fail the run
- **Par time:** generous — finishing is the bar for a first-timer, not speed
- **No ramps/kickers/ring-of-fire** — that content belongs in later challenge routes, not the onboarding level

---

## Personal Best Tracking (the core hook)
Since this level is fixed rather than daily-rotating, it needs its own **all-time personal best**, tracked separately from the daily leaderboard:

```
onboardingBest: { time, tip }
```

Shown immediately after each run — "Your best: 0:52" / "New best!" — using the same tip-ranked, time-as-tiebreak comparison already used elsewhere, just scoped to one fixed level instead of resetting daily.

On completion (especially a new best), prompt toward the daily route as the natural next step — one clear nudge, not a hard gate.

---

## Open Decisions
- [ ] Exact hazard choice for the teaching moment (e.g. a single cone vs. a bin)
- [ ] Menu placement / label for discoverability
- [ ] Whether the completion prompt links directly into "play today's route" or just returns to the menu
