
## Section: walkins (every walk-in, outside vs inside) - 2026-11-06

Judged by eye from the sheet photos (snaps/sheet/walkins/). Nothing was fixed this run: the mismatches below need a plan decision or measured numbers, and I would not guess at them. Estimates are from pixels, not measured in the world.

### Problems (all NOT FIXED)
1. **Tidewater Museum** - `...museum-interior-v3-outside-room-footprint-in-red.jpg`. Rule W18. The red outline (LAB 1460 x 856) covers only the front ~55% of the shell's depth, though the inside photo shows the whole building. It also sits ~25px (~35 units) in front of the long face's wall base. NOT FIXED: needs a decision on whether the rear is part of the room.
2. **Vista Ridge Security Post** - `...vista-ridge...-v2-outside-room-footprint-in-red.jpg`, right end. Rule W18. The red ends ~45px (~55 units) short of the east wall; the front and the door side match. NOT FIXED: the plan constant needs measuring.
3. **Seabreeze Trophies** - `...trophies-v2-outside-room-footprint-in-red.jpg`, west end. Rule W18. Red is ~25-30px (~35 units) forward of the wall base; size matches (760 x 600). NOT FIXED.
4. **Pelican Drug** - `...pelican-drug...-v2-outside-room-footprint-in-red.jpg`. The footprint is not out: front and right corners match the store box. But the orange wall-top (H 232) is ~80px (~110 units) below the shell's cornice, so the room reads shorter than the outside (W4). NOT FIXED: check the store's exterior height first.

### OK
- KTDE: footprint on the shell, door side right (the rounded corner is a square in the footprint, which is fine). Inside night is lit sensibly.
- Tidewater Kart Works: corners and wall-top match the shell.
- Tide Pool Elementary: front edge on the school's front; the rest is off-screen in the close views.
- Sun Deck Motor Lodge Office: close match, small overhang at the west corner (~25px).
- Insides viewed: Pelican (day, night), Trophies, KTDE (night), Vista Ridge (night), Museum: floors wall to wall, no black voids, nothing in the doorway.
- Not opened: Kart Works, Tide Pool and Motor Lodge inside photos and the other night shots.

### Hands-on (cannot be judged from stills)
- Walking through each door: the crossing is seamless and the shell eases off.
- Walk-in people's life and facing (W16, W19).

## museum-footprint follow-up (2026-11-06)
Measured in world units: the shell rect (hoodLandmarkFrame toWorld of LAB) is x 10218..11678, y 832..1688, and the room's footprint
(MUS_IN.x0/y0 + museumInShift, W 1460 x D 856) is the identical rect. LAB already IS the full shell, so the rear is part of the room
and nothing needs resizing; the "front ~55% / 35 units forward" reading in the photo is the taller shell roof plus the portico, fence
and hedge hiding the wall base. The one real mismatch is HEIGHT (W4): room walls MUS_IN.H = 340, the shell's cornice is 440 lab x 1.5 = 660 world
(checked by drawing wall-top outlines at 340/440/510/660: the roof edge sits on 660). Raising H changes the whole interior's look
(frieze, cornice, window heights up to 402 already exceed 340), so it is left for Sir to decide: keep the low-wall room, or raise H to 660.
No game code changed.


## Build: vista-footprint - 2026-11-06
Vista Ridge Security Post room lab rect was [8990,9370,-4090,-3790]; the shell's south/east faces stand at -3760 / 9400 (its openings were already declared at 9400.6 and -3759.4, outside the room). Now [8990,9400,-4090,-3760] with the door at b -3760: red footprint's front and east corners sit on the shell's wall bases; interior content (anchored from the west/north) unchanged and still reads right. Remaining: the west/north edges still sit ~30 units inside the shell (parapet/plinth); not moved because it shifts every SP_ROOM constant.

## drug (Pelican Drug) - 2026-11-06
Photos: snaps/sheet/drug/car-park-{day,night,wide}.jpg, snaps/sheet/walkins/pelican-drug-interior-*.jpg.

### Problems
1. **Room walls shorter than the shell** (W4/W18, walkins photo `...v3-outside-room-footprint-in-red.jpg`, orange outline ~80px below the cornice). PELICAN_IN `H: 232` is in room units (zs 1); the shell's PZ 232 is kit units drawn at ZSCALE 1.5 = 348 world. **FIXED**: `H: 348` in the walkinDefine; re-shot inside day/night: the two far walls now rise to the cornice, floor/fixtures/night light unchanged, no voids.
2. **Footprint "out" reading was a test-harness artefact.** The red/orange overlay was drawn once while the camera was still easing after the jump (camX drifts ~60 units over 4 s), so it sat ~(9,13) px off. Measured with live overlay: red sits exactly on the shell base (front, right and back corners; lab 540x360, door side matches). **FIXED in tools/run_sheet.js** (overlay redrawn every frame). The earlier "not fixed" footprint findings for Museum, Vista Ridge and Trophies were read from the lagging overlay and should be re-shot with the new script before anyone resizes a room.

### OK
- Car park drawn round the store; sliding doors and shopfront glass show the room (people at the desk visible from the car park); pharmacy corner/PHARMACY sign/pickup hatch inside; three masts glow at night.

### Hands-on
- Doors fade/slide as you drive up; walking through the door is seamless; staff life and facing.

## trophies-footprint re-check (2026-11-06)
Re-shot `--walkins --pocket "Seabreeze Trophies"` with the live-overlay run_sheet. Shell is 585x462 lab x1.3 = 760.5x600.6, room 760x600, door mid, both on the shell's wall plane (shopDoor b=0.4; flatsShop doorMid). At 3x zoom of the west end the red footprint's west corner and front edge sit on the shell's wall base (within ~3px). The earlier "~35 units forward" was the lagging-overlay artefact (see above). No game change needed; item left for Sir to confirm at the test link. Right/gate side is hidden behind the fence and was not judged.

## trophies look test (2026-11-06)
Photos: snaps/sheet/trophies/door-day.jpg, door-night.jpg, door-wide.jpg (the section has only street-side shots; no inside or footprint photos, so W4/W18 were not judged here; see the footprint re-check above).

Problems: none found that need a fix.

OK
- Street door: glazed pair sits in the door line, nothing standing in the doorway in day; at night a visitor is seen through the glass inside the shop, behind the leaves, not in the opening.
- Awning, sign band, trophy sign and corner pilaster line up; no seams or dark strips on the front or the east wall (wide shot).
- Cups show behind both front windows at night (x-ray/night light), on glass shelves, correct side of the glass. Back-door/window inside not visible from these views.
- Spiked alley gate reads at knee-to-hip height beside the shop; sorts behind the shop's corner properly. Still looks heavy (already listed as known open).
- Lamp, palm, cars and bins sort correctly against the kerb and the shop; night lamp cones present.

Watch (not changed): in the day shot the windows show only dark/reflective glass, no cups (they appear at night only). Looks deliberate (glare vs night glow) but Sir may want cups readable by day.
In the day shot a pedestrian stands against the robot at the door, robot drawn in front; transient, not a draw bug.

Hands-on (cannot judge from stills): engraver faces the camera at his bench; clerk at the till; one visitor browses; back door and window inside; alley gate dropping to knee height as the door opens.

## Stories — 2026-11-06

Photos: snaps/sheet/stories/ (heart run, cake run, gus mall; day, night, wide).

### Problems
None confirmed as DRAW problems. Nothing fixed, nothing left pending.

Watch-points (judged OK, not defects):
- heart-run-day: the grey-shirted bystander under the MAIN ENTRANCE canopy has his upper body covered by the canopy fascia. Reads as correct occlusion (he stands behind the canopy's front edge), not a depth error (LOOK_RULES 1).
- cake-run-night: customer and the cake-drop scooters/bin sit close together but do not overlap wrongly.
- The "night" photos at NIGHT_CLOCK.time = 18 are still bright (dusk), so night lighting (8b) can't be judged from this sheet; worth a later look at a later clock time.

### OK
- Heart run: Dr. Okafor, courier robot, signal pole and sign all sort correctly; speech bubbles/gate code show; faces visible.
- Cake run: robot, cake, palm, tree grate, shops, vans and street all sit correctly; no seams or floating objects.
- Gus mall: mall entrance, mats, Gus, pickup icon and neighbouring shops sort correctly.

### Hands-on (Sir to test)
- Heart run ends with Dr. Okafor meeting Tipsey face to face in the ER; no fade, no 'hours later'.
- Luna's mom comes out of a real front door at 776 Marina Way (not on this sheet's spots).
- Every speaker's face shows; nobody snaps round when they walk away.
- Cake Run and Gus's favour only open at dusk.

## fleet — Fleet bays and garage (2026-11-06)

### Problems
1. **Test spots miss the bays** (Marina-Parking-bays-*, fuel-farm-hall-*, harbour-boathouse-*): the three photos show a parking-garage ramp, fuel tanks and a yacht; no fleet bay, bay door or pad is in frame. Rule: test must show the item. NOT FIXED: needs Sir to give the real bay coordinates (spots in tools/test_sheet.json).
2. **Marina Parking apron** (Marina-Parking-bays-wide.jpg, left of ENTER sign): a pale flat rectangle reads lighter than neighbouring slabs and the asphalt apron ends in a diagonal flat cut (LOOK_RULES 4 ground). NOT FIXED: may be intentional, needs Sir's eye.

### OK
- Garage ENTER/EXIT signs, lift canopy, barrier, lane arrows: clean, lit at night, no overlaps.
- Fuel farm: tanks, pipes, fence, lamp and its night light cone, plane and tanker: correct depth order, no clipping.
- Harbour: yacht, pier, bench, rocks, anchor: no sorting or seam problems; night tint fine.

### Hands-on (Sir)
- Fleet tab grouping, launch and send-home.

## flying: Flying and The Lighthouse Run (2026-11-06)

Photos: snaps/sheet/flying/ (harbour master and museum, day, night, wide).

**Problems:** none found in the draw. No fixes made.

**Not judgeable (not a draw problem):** items 1-3 (fleet station behind the harbour house, hangar lights, van lane and drive) describe a station that is currently OFF. `FLEET_BAYS_BUILT = false` (Sir, 2026-11-05: depots "placed very poorly", left out until re-sited), so no hangar, pads, drive or compound are drawn. The harbour-master photos show the plaza with the pier, bench and sailor, and nothing is overlapping or cut off. Re-run this section once the depots are re-sited. The test sheet text is stale until then.

**OK (from the photos):**
- Harbour master plaza: bench, flagpoles and lamp are present and sorted correctly, pier and water edge are clean, kerb curve is clean, and the sailor and the cars are not overlapping scenery. Night lighting is consistent.
- Museum: the fence, gate piers, lamps, anchor statue, steps and columns sort correctly. Cars, the van and the signal pole are in the right order. The night lamps and the street-light cone are present and there is no flat seam.

**Hands-on (for Sir):** take-off, UP/DOWN buttons, too-tall slide, landing, the full Lighthouse Run (waits for the depots), fog timer feel.
