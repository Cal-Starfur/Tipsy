
## Walk-ins: outside vs inside (2026-11-06)

**Footprint check (the key one): all 7 shells match their rooms, no game change needed.** Pelican Drug, Sun Deck Motor Lodge Office, KTDE 98.1, Tidewater Kart Works, Seabreeze Trophies, Tidewater Maritime Museum and Vista Ridge Security Post: the red/orange outline sits on the shell (same corners, same door side). Pelican is NOT a mismatch: its lab rect is exactly the store box (523.6..1063.6 x -1240..-880, = LIB.vol foot).

**PROBLEM (tooling, FIXED): the red footprint overlay drifted.** tools/run_sheet.js drew the outline once with scrollFactor 0 while the camera was still settling, so it appeared shifted ~50 px toward the street on Pelican, the Motel, Vista Ridge and Kart Works (this is what made Pelican look like it stuck out). Fixed: the outline is now redrawn every frame (postupdate); re-run photos confirm it sits on the walls.

Notes on the rect: the kit's walls stand 30 outside the lab rect (walkinRoom), so lab = shell inset by 30 (Vista Ridge, KTDE) is correct per W18. KTDE's front-right corner is a rounded wall run (arc c1346 r170/R200 in KTDE_IN); the debug outline is a plain rectangle so it shows a square corner there, which is the overlay, not the room.

**OK:** inside vs outside same walls, door and windows on all 7; floors run wall to wall, furniture and people stand on the floor, nothing in the doorways; night interiors lit sensibly, no black voids or glow through walls (Seabreeze's dark strip at the alley gate is the gate base, same outside).

**Hands-on (for Sir):** doors sliding as you drive up, walking through each door, people giving way, opening hours, driving round the T. rex.
