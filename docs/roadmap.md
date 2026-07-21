# Tipsy Roadmap — Route Builder, Challenge Levels, Ramp/Jump System

Sequencing of everything discussed this session, with dependencies called out. Technical detail for the jump system lives in `docs/ramp-jump-spec.md` — this doc is about order and why.

---

## Phase 1 — Dev Challenge Routes
**Status: scoped, not started. Cheapest phase, ship first.**

- Data shape: `{ id, seed, modifiers, parTimeOverride, name }`
- Curated seeds + a modifier layer (tighter par time, extra hazard density, optional weather/lighting flag) on top of the existing route-gen, tip engine, and par-time HUD — no new rendering, no new physics
- Open decisions: rotation model (daily pick / fixed rotating set of 5 / manual weekly drop), leaderboard scope beyond local daily-best

Ships independently of everything below. Good first target since it validates the challenge-route concept without any new systems.

---

## Phase 2 — Ramp/Kicker Jump System
**Status: spec written and pushed (`docs/ramp-jump-spec.md`). Next step is the lab bench.**

- Shared launch/arc/landing physics, kicker and ramp presets
- Isometric height rendering (sprite offset + ground shadow)
- Ring of fire as a gate-hazard hazard type
- Forward-compatible placement schema (`{id, type, position, heading, presetOverrides}`)

**Why it's before the editor, not after:** ramps and fire rings are exactly the kind of hand-placed, tuned content that shouldn't be a random player's first draft — same reasoning that put dev challenges before the editor. Once stable, ramps debut inside a Phase 1 challenge route, not in the editor.

**Dependencies / blockers:**
- Route-length cap regression (3.56mi vs ~3mi intended) should be understood before jump data feeds into par-time math — don't tangle two open unknowns together
- Depth-sort workaround (§2 of the spec) must pass the all-4-headings check in the lab bench before this goes anywhere near `game/index.html`. If it doesn't hold up, this becomes the forcing function for the `setDepth()` rearchitecture that's been deferred since the depth/draw-order issue was first flagged
- Hill elevation system was pure future-work before this; the jump system's height axis is effectively the first real slice of it, scoped narrowly (arc height only, not full terrain)

**Gate to close before porting into the main file:** lab bench clean at kicker-scale and ramp-scale, all 4 headings, then a headless census run same as any other change.

---

## Phase 3 — Community Route Editor
**Status: direction agreed (dev-first, editor later), not scoped in detail yet.**

- Grid-snapped object placement, not freeform — sidesteps the depth-sort risk rather than requiring the `setDepth()` rearchitecture up front
- Palette: existing hazard props (cones/bins/scooters/planters/hydrants) plus kicker/ramp/firegate once Phase 2 has shipped and proven stable — editor should not ship jump objects before the base game has them tested
- Placement constrained to the same road-adjacent location network procedural gen already uses
- Mandatory test-run before export — reuses the existing route-runner, doubles as free validation (an unplayable route just won't complete)
- Sharing: export/import code strings, PolyTrack-style — no backend needed, consistent with the local-storage pattern already in use for the daily-best leaderboard
- Explicitly deferred: cloud upload + browse/discover/ratings (Level Maker-style) — that needs a backend and isn't in scope unless priorities change

Data shape reuses Phase 1's challenge-route schema plus a `placedObjects: [...]` array using the Phase 2 object schema — no migration needed between phases.

---

## Adjacent, not sequenced yet — Skins/Cosmetics
Raised as a pattern seen in Reddit UGC games (unlocked via play/publish, sometimes IAP on top). Deliberately kept off this roadmap's critical path — worth its own scoping conversation, shouldn't get tangled into the editor timeline.

---

## Consolidated Open Decisions
- [ ] Challenge route rotation model + leaderboard scope (Phase 1)
- [ ] Kicker = placed prop, not tile variation — recommended, needs sign-off (Phase 2)
- [ ] Depth-sort workaround vs. forcing `setDepth()` now (Phase 2)
- [ ] Route-length regression — needs resolution before par-time formula changes (Phase 2 blocker)
- [ ] Ring-of-fire art/particle scope (Phase 2)
- [ ] Editor placement UI details + object cap per route (Phase 3)
- [ ] Skins/cosmetics — separate scoping session, not yet started

---

## Suggested Order of Work
1. Phase 1 challenge-route data plumbing (fastest win, de-risks nothing but ships something)
2. Phase 2 lab bench — the depth-sort check here is the highest-uncertainty item in the whole roadmap, worth resolving early
3. Phase 2 port to `game/index.html`, debut via a hand-placed challenge route
4. Phase 3 editor, once Phase 2's object types are proven in the wild
