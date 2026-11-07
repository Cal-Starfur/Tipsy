# Walk-in kit fit: every built interior against W22-W24 (2026-11-07)

Method: `node tools/run_sheet.js --walkins` photographs each room from its door with the room's floor in red, the wall-top in orange and the WALLS' OUTER FACE (floor + `WALKIN_WALL` 30 on every side) in magenta, and prints `walkinCoverage()`. **W22: the shell's body must reach the magenta lines.** "Measured" = `walkinCoverage()` from the exterior's declared footprint; "photo" = read by eye from the outside photo (the exterior declares no comparable footprint). W23 (the doorway is the wall's own end) and W24 (nothing floats; fixtures 60 clear of a low near wall) are looked at inside, at the door, zoomed.

| Room | W22 shell covers the walls | How | W23 / W24 |
|---|---|---|---|
| Pelican Drug | **fits** (grown 30 each side 2026-11-07) | measured | fixed 2026-11-07 (piers gone, baskets moved) |
| Seabreeze Trophies | **fits** | photo | not audited |
| Dune Home & Garden | **fits** (grown 30 each side 2026-11-07; `cover ok`) | measured | fixed 2026-11-07 (no piers, trolleys 60 clear); also given W11 see-through (entrance and shopfront show the room) and its car park's night lamps |
| Tide Pool Elementary | **short**, 30 on all four sides | measured | not audited |
| Tidewater Museum | **short**, 30 on all four sides | measured | not audited |
| Costa Palma Animal Shelter | **short**, the body stands at the floor's line, the magenta is in front of it | photo | not audited |
| Brew & Bolt | **short**, the base stands at the floor's line | photo | not audited |
| KTDE 98.1 The Tide | **short**, the street wall stands at the floor's line | photo | not audited |
| Sun Deck Motor Lodge Office | **short**, the office's base is at about the floor's line | photo | not audited |
| Tidewater Kart Works | **short on the front** (the barn's front stands inside the magenta), the east end reads right | photo | not audited |
| Vista Ridge Security Post | **does not fit at all**: the room's floor stands well in front of the building (it is outside it, not under it) | photo | not audited |

Fits: 3 of 11 (Pelican Drug, Trophies, Dune Home). Short: 7. Does not fit: 1 (Vista Ridge, a footprint error, not a 30 growth).

The fix for each short room is Pelican Drug's (commit "Pelican Drug: the shell is 30 bigger on every side..."): grow the exterior's body 30 on every side from `plan.shell`; the tower or door follows it out; the glass openings, `slideDoors`, the collision `vol` and anything on the body's faces (the band, the sign) move with it; the lot (bays, lanes, hedges) stays where it was. Then look inside at the door for W23 and W24 and fix what shows.
