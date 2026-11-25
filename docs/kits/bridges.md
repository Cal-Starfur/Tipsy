# Kit: Bridges and water in the town (contract v1, new)

**What this covers:** anything that carries a way over water -- a street, the boardwalk, a promenade or trail -- and the water it
crosses (THE PALMA RIVER's channel, `riverRuns` / `riverPieces` / `riverParapets` / `riverTiles` in `game/index.html`).

**Evidence:** Sir, 2026-11-25, on the river's first bridges ("lets learn first how to elevate road ways over water", then "lets dial
these bridges in and fix them and use the misses to make the rules"). Each rule below is one of those misses.

| ID | Rule | The miss it comes from |
|---|---|---|
| B1 | **Water in the town is sunk, never flat in the street.** It runs `RIVER.depth` below street height in a channel; the wall the eye sees (west on a north-south reach, north on an east-west one) goes down to it, with its wet line. A way over it stays at its own height, so it stands above the water: driving and the collision never change. | The river painted flat with the road laid on it read as a puddle, not a bridge. |
| B2 | **Every way over water is a bridge**, with all of it: a deck, a parapet along each edge over the water, its edge face (`kinds[k].F` thick) and its shadow on the water where the eye looks down the reach past it. Streets, the boardwalk, the promenade, a trail: no walk lies flat over sunk water. | The beach promenade ran over the mouth as a strip of gravel floating on the water; the boardwalk's south edge had no parapet or face. |
| B3 | **A street's deck is the street:** its road and both sidewalks, the sidewalks in the city's own slabs (`paveSlabOn`, on the city's T2 grid) out to the parapets, round a corner's outside too. Never a flat grey square. | The decks and the corner outside an L were flat paint; the sidewalk stopped short of the bridge. |
| B4 | **A street that ends at the water ends kerbed**: the city's kerb (`kerbPath`) round from one side across the road's end to the other, the slabs on past it to the parapet. | A dead-end street's asphalt stopped square at the water with no kerb. |
| B5 | **Any street that reaches the water stands over it** -- a crossing, a corner the river turns at, a street's end -- so each gets its deck and its parapets (`perp`: any conn at the node). | The corner where a street dead-ended at a bend had no parapet on its open side. |
| B6 | **Quays are sidewalk**: the city's slabs, a coping along the water. | The quays were flat paint beside slabbed sidewalks. |
| B7 | **Layer order across the whole river:** the water, then the shadows and the walls, then every bank at street height (quays, coping, the sand), then every deck, then every deck's edge face. What stands at street height is laid after the sunk water it hides; a deck after every bank, so no ground-level piece paints over a deck's edge. | The sand of the mouth's east bank painted over the boardwalk deck's corner. |
| B8 | **Nothing else stands in the channel or on a deck's edge**: the planting, the verge's sand and lamps, the hills' trees keep off the water (`riverHillClaims`, the verge's `rvCut`). | Palms and a lamp stood in the river at the mouth; trees and scrub grew in the falls. |
| B9 | **A parapet is pieces of `RIVER.piece` along**, each in the world queue at its own middle and cached (`bcDraw`, stable key) -- W37's long-piece rule. | (from the start: a 1000-long wall keyed at its middle sorts wrong round him at its ends) |

**Check:** screenshot each kind of crossing -- a straight crossing, a corner bridge, a street's end, the boardwalk over the mouth,
the promenade's footbridge -- with Tipsey on the deck; then `w37.js --every --gate`, `props_depth.js` and `stale_seg.js --rooms`.
