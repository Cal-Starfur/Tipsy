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
