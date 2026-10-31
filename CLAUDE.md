# Tipsy workflow

Before building anything visible, read `docs/LOOK_RULES.md` (how the world must look,
distilled from every past correction) and run its pre-flight before showing me. When I
correct something it doesn't cover, add a one-line rule to it.

## Every change
1. Edit only `game/index.html`. Then run `python3 tools/build_devvit.py`, which regenerates
   `tipsey-delivery/public/game-logic.js` and `game.html`. Never hand-edit those two files.
2. Boot the game headless (Playwright + Chromium) and check: no page errors, and a
   screenshot of the thing that changed. If the change moves (people, cars, animation),
   also send a short MP4 clip of it: Playwright screenshots every ~250 ms, then
   `ffmpeg -framerate 8 -i f%03d.png -vf scale=1180:-2 -c:v libx264 -pix_fmt yuv420p
   -profile:v baseline -movflags +faststart clip.mp4`. MP4, not GIF or APNG (APNG
   doesn't play in the app). Trim it to the action. When a lot is going on, send
   several clips, one per spot or moment, rather than one long one.
3. Only when I ask for a perf check: run `node tools/perf_check.js` (several
   minutes). Don't run it on every change. When it runs it must PASS. If it FAILS, run
   `node tools/perf_check.js --why <spot@view>` to see what is drawing, fix it, and
   rerun. Tell me the result either way. Only refresh the baseline
   (`--update`) when I've agreed the new cost is worth it, and commit
   `tools/perf_baseline.json` with that change.
4. Publish the full `game/index.html` as an Artifact so I can play it on my iPad.
   Keep ONE preview per session: republish to the same artifact after changes.
5. Wait. I test in the artifact. Do not commit or push until I say "push".

## On "push"
- Commit and push straight to `main`. No side branches, no PRs.
- Several sessions push to `main`, so expect it to have moved. Fetch and rebase
  this session's commit onto `origin/main`:
  - `game-logic.js` / `game.html` conflicts: never merge by hand. Take either side,
    rerun `python3 tools/build_devvit.py`, and stage the result.
  - A conflict in `game/index.html` (two sessions changed the same lines): stop
    and tell me which part of the game collided. Don't guess.
- After a clean rebase, rebuild, boot headless again (no page errors, a screenshot
  of the change), then push. If the push is refused because `main` moved again,
  repeat from the fetch.
- After pushing, fetch `main` and confirm the SHA-256 of `game/index.html` and
  `game-logic.js` matches what was pushed (the rebuilt, rebased files), and tell
  me which other sessions' commits came in with it.
- Tell me it's landed so I can test again on the live GitHub Pages build
  (the iPad home-screen app runs `game.html` / `game-logic.js` from main).

## Performance (keep the game at 60 fps)
- Anything that does not move goes through a cache, never a live draw every frame:
  flat ground in the ground pass (ground cache), buildings, landmarks, porch pieces and
  still props through `bcDraw` (building cache). Only moving or animated things draw live.
- Split moving parts out: a waving flag or blinking sign on a building is its own small
  live item; the rest of the building stays cached.
- Draw into the `g` you are handed (or `this.g`), never straight into `this.gWorld`:
  the cache interleaves images with world layers, and `gWorld` sits under all of them.
- `bcDraw` keys must be stable: what the thing is and where, never time, the robot's
  position or a random value. If the perf panel's building cache `live` count keeps
  rising while the robot stands still, something is repainting every frame.
- Collect or build once, not per frame (e.g. `LIB.collect` results go in a Map).
- Anything bigger than a block culls what is off screen (`inView`, as the mall's bays do).

## People who talk to Tipsey
- Anyone who walks up to Tipsey to talk, hand something over or give a card meets him
  FACE TO FACE: they come up with `meetWalk(ow, from, t0, side)` and every frame they
  stand there call `meetTick(scene, ow, M)`, which turns Tipsey to them and holds him.
  They stand side by side across the screen, each turned to the other and cheated
  toward the camera so both faces show. Pick `side` (-1 left, +1 right) so neither
  stands behind a pole, wing or wall. Screenshot the meeting to confirm both faces show.

## Other rules
- Fix root causes, not symptoms. Measure before patching.
- Any change has to work in both the web and Reddit (Devvit) builds.
- Changes that depend on saved state: say so, and give a console line to seed it
  (the artifact boots with empty localStorage).
- No secondary grass: a house, shop or landmark never paints its own lawn over the
  block's ground. The game's house kit keeps `houseLawn` empty (NO HOUSE LAWNS);
  when copying from `labs/houses.js`, never restore it or add grass plates.
