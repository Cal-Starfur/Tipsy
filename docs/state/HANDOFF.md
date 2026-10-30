# Handoff: the consistency pass and walk-in interiors (from session 2026-10-30)

Work branch: **`consistency-pass`**. Test page: https://cal-starfur.github.io/Tipsy/consistency-pass/. It is a copy kept on
`main` under the `consistency-pass/` folder, built by `python3 tools/publish_consistency.py <worktree of origin/main> <commit>`
and committed to main touching only that folder. Sir allowed that publish. The live game on `main` is untouched until
Sir says "push" (then follow CLAUDE.md: merge to main, rebuild, verify hashes).

Read first:
- `CLAUDE.md`
- `docs/LOOK_RULES.md`
- `docs/STATE.md`
- `docs/state/CONSISTENCY_PASS.md` (what changed, what's left)
- `docs/state/walkin_recipe.md` (how walk-ins work)

## Per-change routine (the user's rules + this pass)
1. Edit `game/index.html`, then `python3 tools/build_devvit.py`.
2. Boot headless with no page errors. Take photos, plus an MP4 clip for anything that moves.
3. Gate the commit: `node tools/review/gate.js --rev <commit>` (about 40 min, one browser at a time). NEW findings must be explained, or
   fixed. Add explained ones to `tools/review/known.json` with a note.
4. Merge `origin/main` into `consistency-pass` before publishing. Another session works on main.
5. Publish the test page (see above). Send Sir the clip.

## State at handoff
**Pushed:** batches 1–6 first part, the seekers and signal posts, the trophy shop cutaway, and the museum interior.
- The test page was last published at `cb97fcb`, so it does NOT have the trophy cutaway or the museum yet.
- The museum commit's gate run was in progress when the session ended. Rerun it with
  `node tools/review/gate.js --rev <museum commit>`, then publish.

**The walk-in kit** (in game/index.html):
- `landmarkLabWorld(name)`: a landmark's lab frame to the world, for both `hl` and `hi` placements.
- `walkinDefine(spec)`: pushes a pocket from a landmark's building rectangle and door (seamless, keep, nofade, apron).
- `walkinRoom(items, R)`, in LIB scope: far walls full height in clipped runs of ≤150, near walls low, the door's gap.
- Shell fade hooks in the `hs` and `hi` pipelines (pocketShellK), plus `hl` as before. `pocketHiding` re-indexes when pockets are added.

**Done:**
- **Seabreeze Trophies:** a cutaway with a seamless door.
- **Tidewater Maritime Museum:**
  - `MUS_IN` and its own pocket;
  - Egypt, the lobby and the T. rex;
  - a colonnade with a 200 middle bay;
  - a 160 doorway;
  - the portico solid split.

**In progress: Pelican Drug.**
- Door widened to 110; store item marked `shell:true`.
- `PELICAN_IN = null && walkinDefine(...)` is switched OFF until its interior exists.
- Next: write the LIB entry `'Pelican Drug Interior'` (place:'pocket', zs:1, mirror:false, ww/dd = PELICAN_IN.W/D). Insert it after
  `'Tidewater Maritime Museum Interior'`, reading `PELICAN_IN.door.at` for the door lane, and use `walkinRoom(items, {...})`.
  Contents: aisles of shelves, a pharmacy counter on the back wall, a checkout by the door, a drinks cooler.
- Then remove `null &&`, and test the drive-in with the headless pattern: autopilot `gothDrive` to the door, and on
  `_inside` re-target inside the room (the scripts are in the old session's scratchpad; easy to rewrite).

**Next landmarks** (walkin_recipe.md §5):
- the other `hi` ones: Dune Home & Garden, Saltwater Brewing, Lagoon Baths, Driftwood Chapel, Palmline Nursery;
- then the `hl` ones: Animal Shelter, Lagoon Market Hall, Ferris Taylor Cottages;
- large later: Tide Pool Elementary, Palmline Tower, Cove Grove, the airfield terminal.

**Gotchas learned:**
- **The trophy door wouldn't fire.** A shop's front holds Tipsey about 44 off its door line, so use `glass: 60`.
- **Entering then exiting at once.** With `keep`, he lands on the apron, so the door needs its own `out` test past the apron (`walkinDefine` does this).
- **The autopilot is a bad test driver.** `gothDrive` drops him at its target when stuck, so it can fake an entry. Watch `_inside`.
- **Back walls drawn under the railing.** A single back-wall piece keyed at the room's corner draws under exterior things behind the building, so split it into runs (`walkinRoom` does).
- **Library constants aren't global.** Constants inside the LIB closure (40615..~73040) aren't global. Export them via `window.__X` (as `TIDEWATER_MUSEUM`).

## Museum gate result (finished after the handoff was written)
`GATE FAIL: 11 new, 11 fixed, 0 page errors`. Only one finding is about the museum:
- **L1, 'Tidewater Maritime Museum Interior' (a 542..586, b 182..226):** the lobby column at (560, 200). Its solid is
  the circle form `{ c, r, h }`. Check that `parkLandmarkVol` and the L1 checker both read circle solids. If not,
  give the four lobby columns a `volRect` square instead.

The other ten are the usual actor-census noise and hospital pairs, none caused by the museum:
- hospital see-through walkers;
- crew lifting at the beach;
- lifeguards' heading;
- a minibus at a light;
- vehicles handing over between draw paths.

Add them to `known.json` with that note. Then publish the test page from the museum commit, or from HEAD (`ce30ca2`, Pelican off).
