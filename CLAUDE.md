# Tipsy workflow

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
## Pushing
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

## Mission talk (keep it short)
- Mission speech is a line or two a bubble: only what is needed to move on. No backstory, no
  explaining the plot or mechanics, no recap. ("Here she is. Careful, she's heavy.") Let the
  staging tell the rest: she fetches it, walks off with it, goes inside. Cut dialogue first
  when a mission drags. Applies to every mission's cards (`hospSayCard`); Lighthouse Run is
  the reference.

## Other rules
- Reference the object library first: `docs/kits/library.md` lists what the game already draws (people, dogs, cats, cars, vans,
  robots, doors, street props, room kit). Drawing new things and variations is welcome -- build them from their nearest library relative
  (its drawer, proportions, toning, part order), which has already been through the draw fixes, so they come out right the first time;
  a variant can go in its relative's table (a breed, a kind, a look). Add what you make to the library.
- Fix root causes, not symptoms. Measure before patching.
- Any change has to work in both the web and Reddit (Devvit) builds.
- A live door (sliding or swinging leaves, lift doors) is queued at its own point. Anything that stands out over it -- a canopy,
  an awning, a sign, a transom piece -- must sort AFTER the door, or the leaves paint over it: key that piece at its nearest corner
  (the largest a + b it covers) and mark it `overDoors` (the rim queue puts the leaves just under it, even when lmDepth moves it round
  Tipsey), or queue it just after the door as the garage lift's canopy does. Check it with the doors open and Tipsey beside them.
- A pair of door leaves (sliding, lift, glass) is never one item keyed at the doorway's middle: queue each leaf at its own side of the
  doorway, or the far leaf flips over Tipsey as he crosses (doors kit D12).
- Inside one drawn piece nothing is depth-sorted: paint back to front and only faces the eye sees (tops, south, east -- never a west
  end or north face by hand), legs behind a shelf before it and the front legs after; a base before what stands on it; a fixture's far side (its working face turned away: an espresso machine's group heads, a till's screen, a piano's keys) before the fixture; parts meet face to face, never run into each other (an arm stops at the sofa's back, a shelf between its posts); a `runPiece` fixture's `zTop` is its real top,
  never higher (walk-in kit W37).
- A long fixture in a room (a counter, a shelf run, a bar, a bookcase against a wall) is never one piece keyed at its middle: people
  behind its far end and walls behind it sort wrong. Build it with `runPiece` (runs of ~50, each keyed at its own stretch, the
  whole drawn clipped per run), as the kit's walls are.
- A walk-in's room may be bigger than its building (walk-in kit W31): it runs back into the block, never toward the street; its door, front
  wall and street face match the outside; what it covers is drawn under it, faint, while he is inside, and the world round it dims. The
  exterior is never rearranged for a room. Its door is the door kit's: a half door from inside (doors D13), and he is taken in only once
  he is in the doorway (W32). Tidewater Tea House is the exemplar.
- Every shop walk-in is built by `docs/kits/walkin-shop-recipe.md` (walk-in kit W33): read it before starting one, copy Tidewater Tea House,
  and run its checks -- in particular, while he is inside no one from outside (passers-by, another walk-in's staff walking to work) may be
  drawn over the room, and nothing in it paints over its own people.
- People: build a new person off the people we have and vary them through the roll (people kit P19, P20: a `streetLook` kind or
  a `rosterBody` in a uniform, clothes from the hull's wardrobe, a new option on its own roll so no look already in the game changes).
  Inside a body, back to front and parts meeting, as W37 is for furniture (P21, P22: the far arm before the torso, the shoulder along
  the arm); check with `node tools/review/people_hull.js --png <dir>`.
- Changes that depend on saved state: say so, and give a console line to seed it
  (the artifact boots with empty localStorage).
- No secondary grass: a house, shop or landmark never paints its own lawn over the
  block's ground. The game's house kit keeps `houseLawn` empty (NO HOUSE LAWNS);
  when copying from `labs/houses.js`, never restore it or add grass plates.
