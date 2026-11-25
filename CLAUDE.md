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
## Splitting work across agents
- Parallel agents (side by side, each in its own worktree) are the default for speed -- when each has its own area of code: its
  own drawer or function, its own part of the file. Give each its own named spot for any NEW functions it adds (e.g. just above
  its own drawer), so two agents never add code at the same point (Sir, 2026-11-24: the park trees and planting both added
  methods above queueParkPlants and collided).
- Stack instead (one after another, the second built on the first's commit) when the pieces share a function or sit close in
  the file: those collide side by side.

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
  After a `bcDraw` in the same queue item, draw into `this.g`: laying its image opens a new segment on top, and the `g`
  you were handed (or `layerFor(...)`) is now UNDER the image (Sir, 2026-11-23: the stop lights' heads under their arms,
  the pickup mats' highlight under the mat). `node tools/review/stale_seg.js --rooms` must report 0 sites.
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
  the arm); check with `node tools/review/people_hull.js --png <dir>` and the depth test `node tools/review/people_depth.js --png <dir>`.
  After any change to how people are drawn (the person drawer, a look, a pose, a garment), `node tools/review/people_depth.js --gate`
  must PASS: no depth fault new or grown against `tools/review/people_depth_baseline.json`. After a fix, `--update` and commit the
  baseline with it; a new fault is locked in only when I've agreed.
- Draw order everywhere (Sir, 2026-11-22: "create a rule to keep everything in the future consistent"): after any change to how
  something is drawn -- a building, shop, house, landmark, room piece or street prop -- `node tools/review/w37.js --every --gate` and
  `node tools/review/props_depth.js` must PASS: no draw-order fault new or grown against `tools/review/w37_baseline.json` (W37:
  back to front, faces the eye sees, parts meeting; the props kit's SP13 for street props, faces asked of W since they turn; and
  `sort`, BETWEEN pieces: no piece the game paints later may stand behind one it painted earlier where they overlap on screen --
  a long piece runPiece'd, what sits on a piece keyed after it). After a
  fix, `--every --update` and commit the baseline with it; a new fault is locked in only when I've agreed.
- A corner is one piece (Sir, 2026-11-22: "place a rule so that the consistency is there for future builds"): anything that runs round
  a corner -- a wall and its cap, a fence, a hedge, a parapet, a roof cap, a kerb, a counter with a return -- is drawn with `pathRun`
  along its path of corner points (mitred, one top, its outer lines straight round, only the faces the eye sees), never as boxes
  butted at the corner. Where a house or a room must be drawn between its far and near legs, split it with `legs` on a straight
  stretch, not at a corner. `w37.js` lists any two runs meeting at a corner as two boxes (`corner`); the gate holds it.
- Anything that wraps round another piece (a band, a hem, a cuff, a collar, a brim, a hat's band) is a ring -- only its faces toward
  the eye -- never a filled solid, whose silhouette lays a flat lid over what it wraps; a piece that wraps round another is split by depth
  (its part behind, the thing, its part in front), as a cap's bill round its crown.
- Bridges and water in the town (Sir, 2026-11-25: "use the misses to make the rules"): `docs/kits/bridges.md` (B1-B12). Water in
  the town is sunk in a channel, never flat in the street; every way over it (street, boardwalk, promenade, trail) is a whole bridge
  -- deck, parapets, edge face, shadow -- weighted to what it carries (a street's stone wall, a footbridge's light rail); a street's
  deck is its road and sidewalks in the city's slabs out to the parapets; a street ending at the water ends round and kerbed; quays
  are sidewalk; layers: water, shadows and walls, deck edge faces, banks, decks (every bank within the channel's depth east or south
  of the water laid over it); shadows fall away from the light (+y, a touch of -x); a deck edge is used up only by the reach that
  walls it; nothing is planted in the channel. Screenshot each kind of crossing with Tipsey on the deck.
- Changes that depend on saved state: say so, and give a console line to seed it
  (the artifact boots with empty localStorage).
- No secondary grass: a house, shop or landmark never paints its own lawn over the
  block's ground. The game's house kit keeps `houseLawn` empty (NO HOUSE LAWNS);
  when copying from `labs/houses.js`, never restore it or add grass plates.
