# World regions (step 1: numbered and tagged, 2026-10-30)

Sir's decision: Costa Palma's edge (the harbour, the coast, North Sunset Shore, Sierra Vista, the foothills) lies outside
the 12-hood block grid, so surveys, the map and the placement tables never saw it. These areas become **districts of
The Flats**: open from the start (no hood lock), each with its own name. **The mountains are scenery owned by nobody**:
not drivable (lookouts and drone routes come later). The sea is scenery too.

Step 1 changes no gameplay and no visuals. It names every region and tags every cell.

## The code (game/index.html, after `worldgenLandmarks`)
- `WORLD_REGIONS`: one entry per region (`id`, `name`, `owner`, `kind`, `parts`, `geo`). It holds the 12 hoods
  (`kind: 'hood'`) and the edge regions. `FLATS_DISTRICTS` is the edge districts. `REGION_KINDS` lists the cell kinds.
- `worldRegionIndex(grid?)` builds the cell index **once**, lazily, on the first question, cached per grid. It is a
  raster of `BLOCK/8` cells (391 units), 384 x 320 cells over block cells i -7..40, j -8..31, and takes about 180 ms.
  Nothing calls it in play. Under `?worldgen=classic` it returns null.
- `regionAtWorld(x, y)` returns `{ region, kind }` at a world point.
- `regionAt(i, j)` takes a block cell as `hoodAt` counts them (node (i, j)'s square). It returns the region and kind
  that hold most of the cell, and the full mix.
- `districtAtWorld(x, y)` and `districtAt(i, j)` return the edge district's name out past the grid and the hood's
  name in the city. In the city that is exactly `hoodAt`'s answer.
- `worldRegionsList()` lists each region's cells, kinds, bounds (block cells and world units), centre and photo points.
- `window.__WORLD_REGIONS` holds `{ regions, districts, kinds, index, at, atIJ, district, districtIJ, list }`.
- `miradorGeo(grid)` holds Mirador Heights' stub, drive and lots box. drawWorld and the minimap used to restate these
  inline. Both now paint from it, with the same expressions, so the output is unchanged.

**`hoodAt` / `hoodAtWorld` are untouched.** Note that a negative cell does NOT always clamp to The Flats: `hoodAt`
clamps i and j separately, so (10, -3) answers Boardwalk and (-2, 13) answers University. Every caller keeps that
answer. Callers audited: `hoodOwnsIJ`; the lost dog and the shelter (`lostDogLeft`, `shelterAddr`); the hood
palettes; `generateRoute` (hood filter, address hood); the park names (`mapParkRaw`, `mapParkName`); the map's Flats
footprint; `drawRouteMap`'s street labels. Use `districtAt` when the edge's own name is wanted.

## How a cell is classified (first match wins)
Every test reads the geometry that the ground, the surfaces and the map already use. Nothing is restated.
1. **Sierra Vista**: `sierraRoundSurface` (the gate round) is road. `sierraInside` is road where `sierraSurface` says
   road/curb/sidewalk, otherwise estate.
2. **The Flats' rim landmarks** (`hoodRimRects`: the mall runs out past the city edge) are the hood's, kind city.
3. **Pelican Harbor**:
   - road is `harborRoundSurface`, `hg.road`, and the Palmline stub west of X0;
   - `harborSurface` gives the quay and docks (quay), the beach walk (boardwalk), and the apron, plaza, park and jetty
     (quay);
   - then, inside the zone (x <= X0, y <= zone.y1): `bldg` is landmark, `basin` is harbour, the `arm` and light are
     quay, and the rest of `head` is buildable;
   - north of the headland is mountain from `HARBOR.COAST_X` east, and sea west of it;
   - the rest is sea.
4. **The pier**: `classifyShore(grid.shore)` gives the aquarium's octagon (landmark) and the round deck and pier run
   (boardwalk), plus the `FLARE_*` throat. The boardwalk's two shore runs go to The Boardwalk.
5. **Mirador's stub** across the east rim is road.
6. **The city box** [X0, X1] x [Y0, Y1]:
   - North Sunset Shore's lots (`nssRowsOf`, `lotRect` to X0) are estate;
   - the lattice out to its outer sidewalk is the hood (`hoodAtWorld`), kind city;
   - the ring of rim lots beyond that is the hood too: road where `classifyAt` finds a street, city on a park rim lot
     (`grid.extLots`), buildable otherwise.
7. **The coast bands** (drawWorld / `mapCoastBands`): the boardwalk, then Sunset Shore (west sand), then Driftwood Beach
   (south sand). Past the sand is sea.
8. **Sierra Vista's street** north of Y0 up to the gate (`classifyAt`) is road.
9. **Mirador Heights' lots box** (`miradorGeo`) is estate.
10. **North**: from Y0 to Y0 - FOOTW, and the Sierra Vista bench (`WG_HILLS.SV_TOE`, `SV_X`, `SV_EASE`), is foothill.
    Beyond is mountain. **East**: from X1 to X1 + FOOTW is foothill, and beyond is mountain.

Units: BLOCK 3128. X0 = Y0 = -1720 (the city's ground edge, -EXT). X1 = 111200, Y1 = 83048. Bounds below are the index's
cells (snapped to 391), so they run up to a cell past the geometry.

## The regions
| Region | Owner | Cells | Kinds (cells) | Blocks i / j | World x / y | Geometry source |
|---|---|---|---|---|---|---|
| Pelican Harbor | The Flats | 757 | quay 283, harbour 207, road 164, landmark 48, buildable 44, boardwalk 11 | -3..-1 / -6..0 | -8602..-1564 / -18377..1173 | `harborGeo`, `harborSurface`, `harborRoundSurface` |
| The Boardwalk | The Flats | 1000 | boardwalk | -1..35 / 0..27 | -2346..111044 / 782..83674 | `buildShore` west and south runs (`WG_COAST.BOARD`) |
| Sunset Shore | The Flats | 2341 | beach | -2..-1 / 0..27 | -6647..-2346 / -1564..83674 | west sand band (`SANDW`) |
| Driftwood Beach | The Flats | 3311 | beach | -2..35 / 27..28 | -6647..111044 / 83674..87975 | south sand band (`SANDW`) |
| Sunset Pier (+ Roundhouse Aquarium) | The Flats | 78 | boardwalk 72, landmark 6 | -5..-1 / 13 | -14467..-2346 / 39491..41837 | `buildShore` pier and ring, `FLARE_*` |
| North Sunset Shore | The Flats | 140 | estate | 0 / 0..9 | -1564..-782 / 782..28152 | `nssRowsOf` (west rim lots j 0..8) |
| Sierra Vista | The Flats | 916 | estate 564, road 352 | 0..3 / -5..-1 | -1173..8602 / -17204..-1564 | `sierraGeo`, `sierraInside`, `sierraRoundSurface`, `classifyAt` |
| Mirador Heights | The Flats | 1434 | estate 1428, road 6 | 35..37 / 10..24 | 110262..116909 / 30889..76245 | `miradorGeo` |
| The Foothills | The Flats | 4084 | foothill | 0..37 / -6..28 | -1564..114563 / -18377..87975 | `FOOTW` bands north and east, the Sierra Vista bench |
| The Mountains | nobody | 23923 | mountain | -2..40 / -8..28 | -6647..126684 / -26588..87975 | past the foothill bands; behind the harbour from `COAST_X` |
| The Sea | nobody | 22760 | sea | -7..40 / -8..31 | -23460..126684 / -26588..98532 | west of the sand, south of Driftwood Beach, west of the breakwater |
| 12 hoods | themselves | ~5180 each | city (park rim lots included), plus buildable 0..188 (empty rim lots), road (The Flats 16) | 9 x 9 each | | `hoodAt` |

The Mountains and The Sea run to the edge of the index (2 blocks of margin). The real bands go on past it (FAR).

## What is there now, and what is empty
- **Pelican Harbor** is complete: the road, turning circle, quay, six fingers, the day's boats, the apron with trailers,
  the plaza, the harbor house, Sea Lion Point, the breakwater and light. Empty: 44 cells of bare headland (sand and rock
  round the plaza, north to the hills).
- **The Boardwalk** has strollers and joggers along its west and south runs. Its top (north of Y0 to Palmline) lies
  under the harbour's apron and counts as harbour. Note the name clash with the **Boardwalk** hood (hood 1, i 9..17,
  j 0..8): different places, different ids (`hood:Boardwalk`, `the-boardwalk`).
- **Sunset Shore** has the lifeguard stations every 4 blocks, the dunes, and the access walks across North Sunset
  Shore. Otherwise it is open sand.
- **Driftwood Beach** is open sand along the whole south. Nothing is built on it.
- **Sunset Pier** has the deck and the Roundhouse Aquarium on its round deck.
- **North Sunset Shore** has the modern beach houses and bungalows, with gardens and paths, on the west rim lots j 0..8.
- **Sierra Vista** has the gate round, four shelves, the zigzag street, the lots and the grand estate.
- **Mirador Heights is paint only**: a road stub and lots drawn flat on the east foothills, with no lattice, nothing
  drivable and no surfaces. The index gives it the box its lots stay in, which reaches into the east range.
- **The Foothills** are flat foothill ground (north, east, and the bench beside Sierra Vista). The north terraces
  (`WG_HILLS`) climb across the FOOTW line. The index splits foothill from mountain where the map and drawWorld paint
  it, not where the terraces end. Nothing is built here, and he can't drive here (`owNorthEdgeBlocks`).
- **The Mountains** are Sierra Palma (north), the Mirador Hills (east), and the range behind the harbour down to the
  sea cliffs. Scenery.
- **Buildable**: the empty rim lots round the hood grid (bare grass or plaza yards drawn by `fillExteriorLotGround`,
  about 20 to 190 cells per edge hood) and the harbour's bare headland.

## Uncertain (for Sir)
- **Mirador Heights**, the far east, has The Flats as owner under the "edge districts belong to The Flats" call, but it
  borders Scooter Row, The Bluffs and Palm Gardens rather than The Flats.
- **"The Sea"** is a placeholder name. The game has no name for the open water.
- **The rim lots round the grid** stay with the hood that `hoodAt` gives them, not with The Flats.
