# Build queue

Scheduled sessions: take the FIRST item marked `[ ]`, build it per CLAUDE.md (edit `game/index.html`, run `python3 tools/build_devvit.py`, boot headless, no page errors, screenshot/clip), mark it `[x]`, commit, and push to the `consistency-pass` branch. One item per run. Stop and report instead of guessing if blocked.

## People unification (`docs/people-unification.md`, Tier 1 → 2, in order, one commit each)
- [ ] 1.1 Fold mall offset into `mallWalkerAt` return; drop `m.oa/m.ob` at the 3 call sites (no behavior change)
- [ ] 1.2 One `loopWalkStep` for ballroom + derby walkers (identical positions)
- [ ] 1.3 One `pathAt` replacing `mallStaffAt` + `hospWalkerAt` (identical output)
- [ ] 1.4 One `talkRun` for ballroom/derby chatter, on `scene._chatRecent` + `crowdTalkFree` (visible change)
- [ ] 1.5 One `EXCUSE` table + `excuseSay` (visible change in hospital only)
- [ ] 1.6 Looks through `partyLook`, old generators become aliases (no visible change)
- [ ] 1.7 Derby onto `scene.time.now`
- [ ] 2.8 `PEOPLE` registry (`updateKnocks`, `blockAt`, hospital walkers solid)

## Roadmap (`docs/roadmap.md`)
- [ ] Phase 1: dev challenge routes, data plumbing `{id, seed, modifiers, parTimeOverride, name}`
- [ ] Phase 2: ramp/kicker lab bench per `docs/ramp-jump-spec.md`, all 4 headings
- [ ] Phase 2: port ramp/kicker + ring of fire into `game/index.html`, debut in a hand-placed challenge route
- [ ] Phase 3: community route editor (grid-snapped, test-run before export, code-string sharing)

## Specs
- [ ] Onboarding level "Learn the Ropes" per `docs/onboarding-spec.md`
- [ ] Skins: redemption-code model per `docs/skins-spec.md`
- [ ] Keepsakes: item/mission data shape + first story "Fourth Place" per `docs/keepsakes.md`

## Wishlist (`docs/ASSETS.md`)
- [ ] Add `robot.axle` + `robot.battery` from sprite-lab v9 into the game build
- [ ] Building fronts behind the sidewalk (bare upper sky band)
- [ ] Wandering dog (`prop.dog` is static)

## Needs your decision before they can be queued
- Challenge rotation model + leaderboard scope (Phase 1)
- Kicker = placed prop? Depth-sort workaround vs `setDepth()` rearchitecture
- Route-length regression (3.56mi vs ~3mi) blocks par-time changes
- Onboarding hazard choice / menu label; skins price, launch count, code format
- Keepsakes: save-across-devices, Trophy Case, mission data
