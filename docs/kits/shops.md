# Kit 4: The shop library (contract v2)

**What this covers:** the LIB primitives (`slab`/`F`/`S`/`T`/`box`/`prism`/`glaze`/`reveal`/`shopDoor`/`blockWord`), facades, windows, signs and lettering.

**Evidence:** 621 past corrections, the largest kit.

**Checker:** `node tools/world_review.js --kit shops`. It draws every library entry offscreen at both flanks and checks every primitive call in numbers. The game's own `fTodo` flags are the answer key.

**Units:** lab z × 1.5 (`ZSCALE`) = game z.
- `SHOP_DOOR_W` × `SHOP_DOOR_H` = 66.24 × 161.92 game, which is 107.95 lab with the surround head at 114.95.
- `STORE_H` 252 = 168 lab per storey.
- `W` 230, `D` 276, `PERSON_H` 124.

## Rules
| ID | Rule | Ev | Status | Check |
|---|---|---|---|---|
| K0 | **Every shop calls `shopDoor` once** at its pickup door and carries a name board with lettering. | 4 | C | ☐ |
| K1 | **Boxes are never inside out**: `slab(…, bFront, bBack)` with bFront > bBack. Faces come from P(). | 12 | faces K; argument order C | ✅ |
| K2 | **Nothing crosses an opening.** No band, panel, sign, pier, rail, prop or window over a door surround (a0−4..a1+4, up to the head + 7), or over a window except its own frame and cill. Lay windows out from the **returned, clamped** door, never as a fraction of W. | 85 | C (the clamp is silent) | ✅ for doors; ☐ windows and `doorF` |
| K3 | **A window is the window kit** (`reveal` + `glaze`, or `houseWin`), never a flat panel. Glass with goods behind it has tint ≤ .45; an empty or barred pane may stay opaque. | 32 | C (.92 default) | ✅ (v2: fires only with goods behind); ☐ flat-panel windows |
| K4 | **Own lot, on both mirrored edges.** The a-range stays in 0..WW. A proud piece needs a−b−r ≥ 0 and a+b+r ≤ WW. A set-back board needs \|b\|+6 of margin. A canopy may overhang the return by ≤ 12. Full-width bands run 0..WW with bBack 0, and a wrapped band is drawn on the flank face. | 95 | C | ✅ (key: fTodo "return +N") |
| K5 | **Lettering sits proud of its board**: pass bb = the board's front (the panel +0.5, the letters +0.3), and fit it inside the board both ways. | 43 | C | ✅ (key: fTodo "lettering behind board"); ☐ fit; ☐ lettering drawn as plain rectangles |
| K6 | **Shapes on a face are true:** z extents are ÷ `ZSCALE`, so a face circle reads h:w ≈ 1.12. | 21 | C (`faceT` makes eggs) | ☐ |
| K7 | **Contact:** everything rests on, hangs from or fixes to a drawn solid. | 24 | C | ✅ (street faces) |
| K8 | **Sign of b:** street-seen fixtures (sign, lamp, clock, pipe, emblem) have their whole b-range ≥ 0. | 41 | C | ✅ (lettering and mounted boxes); ☐ round primitives |
| K9 | **Window layer stack:** backing < goods < glass (behind the wall face, in front of the surround's back) < reflections < bars and frame. | 21 | `glaze` K; hand-built C | ☐ |
| K10 | **Window contents** stand behind the glass, inside the opening. Usable width = opening − 2 × depth. | 22 | C | ☐ |
| K11 | **Real size:** H ≥ 150 × storeys (lab; approved 150–184), upper floors ≥ 130, the wall above the door head ≥ 15. | 45 | C | ☐ |
| K12 | **Set out from the door:** piers ≥ 10 between openings (approved 10–14) and ≥ 4.5 at a return. | 18 | C (the clamp allows 1) | ✅ |
| K13 | **Lay out in screen space** (lab x = a − b): items sharing a centre line share their projected centre. Roof items never overlap on screen. | 16 | C | ☐ |
| K14 | **Nothing on the footway, nothing past the canopy.** No solid at b > 8 below z 40, unless it's under the entry's own canopy. Anything over the footway clears 110 game. | 45 | C | ☐ |
| K15 | **Seen faces only:** ends and flanks come from the projection. An entry on an away edge draws `back()`. | 18 | K for box/slab/body; C for a hand-drawn `S()` | ☐ (4 headings) |
| K16 | **Bands to the corner** run 0..WW with bBack 0 (`slab(0,W,z0,z1,4,0)`). The wall-head cornice may run −1..−12. Only a run's true ends are capped. | 13 | C | ☐ |
| K17 | **Helpers take the entry's WW** (`kerb`, `body`, `shopDoor`), never the global `W`. | 5 (severe) | flaw | ☐ |
| K18 | **The roof deck takes the body's palette:** never trim, never lighter than the wall. | 9 | flaw (`body`) | ☐ |
| K19 | **Openings sit on their wall's plane** on a set-back front. | 6 | flaw | ☐ |
| K20 | **Contrast:** at least ΔE 10 against the backing. | 7 | C | ☐ (pixels) |
| K21 | **Repeats** share one z0 and one b line, spaced wider than their projected width. | 8 | C | ☐ |
| K22 | **World-space curves only:** arcs and domes go through P(). Strokes are world tubes. | 10 | C | ☐ |
| K23 | **Facade content stays below the line where the canopy crosses the wall.** | 4 | C | ☐ |

## Approved values (from accepted fixes; also in `tools/review/approved.json`)
- **Glass with goods behind:** tint .30–.46.
  - Saltwater Sweets .30, Driftwood Books .32, Marina Optical .36, Tidewater News .38, Low Tide TV & Radio .46.
  - Empty or barred panes: .80–.90.
- **Piers:** 10–14 between openings.
  - Cove Locksmith: 12 / window / 10 / door / 10.
  - At a return, 4.76 is accepted (Marina Tailors).
- **Lettering:** Tidewater News has the board at −1, the panel at −0.5 and the letters at −0.2.
- **A set-back board's margin:** \|b\| + 6 (Tidewater News: 16 for a depth of 9).
- **Storey height (lab):**

  | Shop | H |
  |---|---|
  | Seabreeze Grocer | 150 |
  | Marina Optical | 166 |
  | Tidewater News | 184 |
  | Driftwood Books (2 storeys) | 336 |
  | Driftwood Lofts (3 storeys) | 460 |
  | The Sandpiper Arms (3 storeys) | 504 |

- **Bands:** `slab(0, W, z0, z1, 4, 0)` (Seabreeze Fabrics).
- **Clean exemplars** (entries with no `fTodo`, `cTodo` or `kTodo`): Driftwood Books, Driftwood Lofts, Cove Locksmith, Marina Tailors, Tidewater News, Low Tide TV & Radio, Sea Glass Exchange, Saltwater Sweets, Marina Optical, Seabreeze Hats, The Sandpiper Arms, Seabreeze Library and Low Tide Music.
  - A rule that fires on one of these has a threshold bug.

## Known kit flaws
1. **`shopDoor` clamps silently** (38 corrections). Fix: return the span and warn, and add `LIB.frontage(WW, doorMid, n, pier=10)`.
2. **`glaze` defaults to .92.** Fix: default .38, with opaque as an opt-in.
3. **No window kit.** Fix: `window(a0, a1, z0, z1, {wb, deep, frame, bars, tint, sill})` with the stack fixed.
4. **`slab`'s argument order differs from `box`**, so it draws inside out. Fix: normalise and warn, and add `{wrap: true}`.
5. **The lettering convention.** Fix: `blockWordOn(board, …)`.
6. **`faceT`/`faceCircle` make eggs.** Fix: a z step of `1/ZSCALE`.
7. **Openings are fixed at b 0.** Also, `wallFrames` keeps its own copies (`doorF`, `glz`), which never record and never open.
8. **Global W**, **the `body` roof plate in trim**, and **`LIB.doorOf` skipping `fore()`**.
