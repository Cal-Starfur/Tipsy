# Walk-in kit fit: every built interior against W22-W24 (2026-11-07)

Method: `node tools/run_sheet.js --walkins` photographs each room from its door with the room's floor in red, the wall-top in orange and the WALLS' OUTER FACE (floor + `WALKIN_WALL` 30 on every side) in magenta, and prints `walkinCoverage()`. **W22: the shell's body must reach the magenta lines.** "Measured" = `walkinCoverage()` from the exterior's declared footprint; "photo" = read by eye from the outside photo (the exterior declares no comparable footprint). W23 (the doorway is the wall's own end) and W24 (nothing floats; fixtures 60 clear of a low near wall) are looked at inside, at the door, zoomed.

| Room | W22 shell covers the walls | How | W23 / W24 |
|---|---|---|---|
| Pelican Drug | **fits** (grown 30 each side 2026-11-07) | measured | fixed 2026-11-07 (piers gone, baskets moved) |
| Seabreeze Trophies | **fits** | photo | not audited |
| Dune Home & Garden | **fits** (grown 30 each side 2026-11-07; `cover ok`) | measured | fixed 2026-11-07 (no piers, trolleys 60 clear); also given W11 see-through (entrance and shopfront show the room) and its car park's night lamps |
| Tide Pool Elementary | **fits** (grown 30 each side 2026-11-08; `cover ok`) | measured | looked at inside at the door 2026-11-08: the doorway is the wall's own end, nothing near the near wall |
| Tidewater Museum | **fits** (grown 30 each side 2026-11-08; `cover ok`) | measured | looked at inside at the door 2026-11-08: portico, bay and doors read right against the room; night box still in `kf-night` |
| Costa Palma Animal Shelter | **short**, the body stands at the floor's line, the magenta is in front of it | photo | not audited |
| Brew & Bolt | **short**, the base stands at the floor's line | photo | not audited |
| KTDE 98.1 The Tide | **short**, the street wall stands at the floor's line | photo | not audited |
| Sun Deck Motor Lodge Office | **short**, the office's base is at about the floor's line | photo | not audited |
| Tidewater Kart Works | **short on the front** (the barn's front stands inside the magenta), the east end reads right | photo | not audited |
| Vista Ridge Security Post | **does not fit at all**: the room's floor stands well in front of the building (it is outside it, not under it) | photo | not audited |

Fits: 4 of 11 (Pelican Drug, Trophies, Dune Home, Tide Pool). Short: 6. Does not fit: 1 (Vista Ridge, a footprint error, not a 30 growth).

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
