# Walk-in kit fit: every built interior against W22-W24 (2026-11-07)

**kf-check (2026-11-09):** every walk-in now declares its exterior's body (`body`, read by `walkinBody()` from the exterior's own constants), so `walkinCoverage()` measures all 19 rooms (`cover ok` on each, none short, none undeclared) and `run_sheet.js --walkins` exits 1 on a SHORT or a NOT DECLARED. The "photo" entries below were read by eye before; the measure agrees with every one.

Method: `node tools/run_sheet.js --walkins` photographs each room from its door with the room's floor in red, the wall-top in orange and the WALLS' OUTER FACE (floor + `WALKIN_WALL` 30 on every side) in magenta, and prints `walkinCoverage()`. **W22: the shell's body must reach the magenta lines.** "Measured" = `walkinCoverage()` from the exterior's declared footprint; "photo" = read by eye from the outside photo (the exterior declares no comparable footprint). W23 (the doorway is the wall's own end) and W24 (nothing floats; fixtures 60 clear of a low near wall) are looked at inside, at the door, zoomed.

| Room | W22 shell covers the walls | How | W23 / W24 |
|---|---|---|---|
| Pelican Drug | **fits** (grown 30 each side 2026-11-07) | measured | fixed 2026-11-07 (piers gone, baskets moved) |
| Seabreeze Trophies | **fits** | photo (red footprint inside the magenta shell, 2026-11-09) | looked at inside at the door 2026-11-09: the front wall runs to the gap with its own gold cap, nothing stands out in front of it, rug and counter clear of the near walls; no change needed |
| Dune Home & Garden | **fits** (grown 30 each side 2026-11-07; `cover ok`) | measured | fixed 2026-11-07 (no piers, trolleys 60 clear); also given W11 see-through (entrance and shopfront show the room) and its car park's night lamps |
| Tide Pool Elementary | **fits** (grown 30 each side 2026-11-08; `cover ok`) | measured | looked at inside at the door 2026-11-08: the doorway is the wall's own end, nothing near the near wall |
| Tidewater Museum | **fits** (grown 30 each side 2026-11-08; `cover ok`) | measured | looked at inside at the door 2026-11-08: portico, bay and doors read right against the room; night box still in `kf-night` |
| Costa Palma Animal Shelter | **fits** (grown 30 each side 2026-11-08; body reaches the magenta in the photo) | photo | looked at inside at the door 2026-11-08: the front wall runs to the gap; door, canopy, windows, vol, swing door and the worker's step/gate marks follow the new front |
| Brew & Bolt | **fits** (grown 30 each side 2026-11-08, both legs; the body reaches the magenta in the photo) | photo | looked at inside at the door: the front wall runs to the gap; door, pair, windows and flank glass follow the new front |
| KTDE 98.1 The Tide | **fits** (read 2026-11-08: the body's four corners, lab 40..1616 x -1616..-40, land exactly on the magenta world 16416..17992 x 25800..27376; the earlier 'short' was a misread of the photo, the exterior already stood on the walls' outer face; its rounded corner sits inside the magenta's square corner as it should) | measured by hand (the entry declares no `vol.foot`) | looked at inside at the door 2026-11-08: lobby glass pair, doorway at the wall's own end, desk 244 and couch clear of the near wall, studio glass and DJ desk read right against the room; no change needed |
| Sun Deck Motor Lodge Office | **fits** (grown 30 each side 2026-11-08, `office.sh`; the body's corners land on the magenta in the photo) | photo | looked at inside at the door 2026-11-08: front wall runs to the gap; glass door, storefront, picture window, slide pair, walk, vol and openings follow the new face |
| Tidewater Kart Works | **fits** (measured 2026-11-09 with `landmarkLabWorld` against the magenta box: the body's four corners land exactly on world 4839.9..5520 x 13248..14068.5; the earlier 'short on the front' was a misread of the photo, Brew & Bolt hides the barn's near corner) | measured by hand (no `vol.foot`) | looked at inside at the door 2026-11-09: front wall runs to the roll-up's gap, nothing stands out in front of it, bench, counter and mechanic's bench clear of the near walls; no change needed |
| Vista Ridge Security Post | **fits** (2026-11-09: the earlier 'floor in front of the building' was the red overlay drawn at ground z 0 under a lawn graded to z 180; the real gap was 30 short on the east and south; the body `SP_PLAN.POST` now x 8960..9430, y -6420..-6030 = floor grown 30; door, openings, forecourt follow) | measured by hand (worldFrame, no `vol.foot`) | looked at inside 2026-11-09: walls, door and windows line up |

Fits: 11 of 11 (Vista Ridge added; was 10 of 11 (Pelican Drug, Trophies, Dune Home, Tide Pool, Museum, Animal Shelter, Brew & Bolt, KTDE, Sun Deck Office, Kart Works). Short: 0. Does not fit: 0).

The fix for each short room is Pelican Drug's (commit "Pelican Drug: the shell is 30 bigger on every side..."): grow the exterior's body 30 on every side from `plan.shell`; the tower or door follows it out; the glass openings, `slideDoors`, the collision `vol` and anything on the body's faces (the band, the sign) move with it; the lot (bays, lanes, hedges) stays where it was. Then look inside at the door for W23 and W24 and fix what shows.

## Night cut (W25), 2026-11-08
`walkinNightCheck()` over every walk-in: all pass but two that write their own boxes. Ten rooms that had hand-written night lines (the old door box reaching 30 to 60 over the near wall) now take the kit's default, which includes the doorway: Pelican Drug, Dune Home, the Animal Shelter, Tide Pool Elementary, Sun Deck Motor Lodge, KTDE, the Kart Works, Brew & Bolt and the others. Still to do (queue `kf-night`): the Seabreeze Ballroom (its hall's front strips reach over its near walls) and the Tidewater Museum (the portico bay box, b 856..956 past D).

## Rooms built since (read 2026-11-08, `wk2`-`wk10` and Seaglass Coffee)
| Room | W22 shell covers the walls | How | W23 / W24 |
|---|---|---|---|
| Saltwater Brewing | **fits** | measured (`cover ok`) | not audited |
| Lagoon Baths | **fits** | measured (`cover ok`) | not audited |
| Driftwood Chapel | **fits** | measured (`cover ok`) | not audited |
| Palmline Nursery | **fits** | measured (`cover ok`) | not audited |
| Lagoon Market Hall | looks to fit on the front (the facade's base is on the magenta); the market side not checked | photo | not audited |
| Ferris Taylor Cottage | looks to fit (the shopfront's base is on the magenta) | photo | not audited |
| Seaglass Coffee | looks to fit (the glass front's base is on the magenta) | photo | not audited |
| Cove Grove, Airfield terminal (`wk9`, `wk10`) | not in the walk-in sheet yet: no measurement | none | not audited |
All of them take the kit's night cut (`night ok`).

## Left out of the sheet (queue `kf-big`)
The Seabreeze Ballroom, Marina General Hospital and the Maritime Mall are not `walkin` pockets (they predate the kit and keep their own frames), so `walkinCoverage()` does not read them and `run_sheet.js --walkins` does not photograph them. Their W22 (shell covers the walls) and W23/W24 are not audited. The Ballroom's night boxes are also in `kf-night`.

## W26 audit, neighbours over the room (2026-11-09)
Every walk-in's inside photo (view 2, `run_sheet.js --walkins`) looked at for a neighbouring building standing over its floor or walls. Found and fixed: the Tidewater Kart Works (`ghosts` Brew & Bolt, Brew & Bolt East) and Seabreeze Trophies (same two, Brew's roof and east leg covered its east end, the engraver bench and ribbons). Clear, nothing to list: Brew & Bolt, Costa Palma Animal Shelter, Driftwood Chapel, Dune Home & Garden, Ferris Taylor Cottage, KTDE, Lagoon Baths, Lagoon Market Hall, Palmline Nursery, Pelican Drug, Saltwater Brewing, Seaglass Coffee, Sun Deck Airfield Terminal, Sun Deck Motor Lodge Office, Tide Pool Elementary, Tidewater Museum, Vista Ridge Security Post. Not covered: the Ballroom, Marina General Hospital and the Maritime Mall (not `walkin` pockets, queue `kf-big`); Cove Grove (not in the sheet); views at other camera angles (only view 2 and 3 photographed, view 3 not re-read for this).

## kf-new audit (2026-11-09)
`run_sheet.js --walkins`: `cover ok` and `night ok` on all 17 declared rooms, including the Airfield terminal (now in the sheet). Looked at the inside photo (view 2, from the door) of the seven rooms built since the audit, for W22 (red footprint in the shell), W23 (doorway is the wall's own end) and W24 (nothing floats, fixtures 60 clear of the near wall):
- Saltwater Brewing, Lagoon Baths, Driftwood Chapel, Palmline Nursery, Seaglass Coffee: front wall runs to the gap with its own cap, nothing stands in front of it, fixtures clear of the near walls. OK.
- Ferris Taylor Cottage: cutaway room sits on the shell, doorway is the wall's end, table and dresser clear of the near wall. OK.
- Lagoon Market Hall: the room is an open market, its front is a low glass rail with the gap; stalls clear. Far side is ghosted by see-through (W11), as intended. OK.
No change to the game. Not done: Cove Grove is still not in the walk-in sheet. The sheet run crashed (page closed) partway through the later pockets (after Tide Pool), so Tidewater Museum, Airfield and Security Post photos were not re-read this pass.
