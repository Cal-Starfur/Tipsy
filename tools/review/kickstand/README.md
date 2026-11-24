# Kickstand Scooter Co. review scripts

Headless helpers for the factory hall (`?go=cratewell`). Run from the repo root.

- `node tools/review/kickstand/boot_errors.js` -- boots the game, prints any page error.
- `node tools/review/kickstand/golink.js` -- opens `?go=cratewell&view=1`, prints where Tipsey lands (inside the hall? lock off?).
- `node tools/review/kickstand/clip.js OUT PER PH NF CA CB ZM` -- frames of the hall: OUT dir, PER clock period (ms of scene
  time), PH phase in it to start at, NF frames (each 500 ms), CA/CB camera spot in hall coords, ZM zoom. 2x screenshots
  (2560x1600). Then `ffmpeg -framerate 8 -i OUT/f%03d.png -vf scale=1180:-2 -c:v libx264 -pix_fmt yuv420p -profile:v baseline -movflags +faststart clip.mp4`.
  Crop the 2560 frames with PIL to the spot -- the zoom arg barely changes the framing.
  Useful: `clip.js d 15000 2600 1 1300 600 2.6` (parts robots and stations 1-4), `clip.js d 90000 13500 44 180 470 2` (row A pick face).
- `node tools/review/kickstand/clip_deck_lay.js OUT 15000 0 100 2250 820 1.0` -- station 0 (the loader): starts when he turns to the
  feeder; frames ~60-100 are the deck lay-down and press.
- `node tools/review/kickstand/trails.js && python3 tools/review/kickstand/trails_map.py` -- steps a full cycle, records every robot
  (CREW_TAP) to trails.json and draws robots_map.png (each robot's path). Also check overlaps: pairs of amr/bot within 75.
- `node tools/review/crew_spacing.js --secs 270 --step 500` -- robots' footprints overlapping.

Session 2026-11-24 (stations 2-7, the loader, the bale round) added:
- `node tools/review/kickstand/at.js T1,T2,... a0,a1,b0,b1 "regex"` -- calls the hall's crew functions directly (LIB.collect, no stepping)
  at hall times T and prints every item in the box whose `kind:stage|build` matches. Fast: the way to see where anything is at a moment.
- `node tools/review/kickstand/jumps.js [T0 T1 step]` -- every humanoid's pose and every scooter piece's middle frame to frame; prints
  jumps (place > 4 a 20 ms step, facing > 0.12, arm angles > 0.2/0.3, waist, drop). Run after any crew timing or pose change.
- `node tools/review/kickstand/track_loader.js T0 T1` -- the same, following station 0's loader wherever he goes (his cardboard spells).
- `node tools/review/kickstand/swaps.js` -- when each station's parts robot leaves / is back at its bench, line time (mod 9000): the
  worker's pick (PKU) must fall while it is parked.
- `node tools/review/kickstand/occupancy.js '{"name":[a0,a1,b0,b1]}'` -- quiet windows (no robot or person) in boxes over three pallet
  cycles: time a new robot's trip through the busy door lane by it.
- `FS=1000 node tools/review/kickstand/clip_step.js OUT PER PH NF CA CB ZM` -- clip.js with FS ms of scene time a frame (long events).
  Note clip.js parks Tipsey at (CA, CB): pick an empty spot (e.g. 1150,1000 mid-loop, 1450,290 the north floor) or he stands in the shot.
  Scene time = hall time / 0.6 (HALL_TS). Early game time (t < PAL0) is an edge case: film a later cycle (PER 540000, PH + 270000).
