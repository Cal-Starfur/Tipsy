# How buildings are drawn in Tipsy: one map, the norms, the outliers, a recipe

Source: `/home/user/Tipsy/game/index.html` (line numbers as of this read), `docs/LOOK_RULES.md`, `docs/kits/{depth,landmarks,shops,houses,walkin}.md`, and the runtime census in `state/census_sites.txt`. Read-only audit. **[V]** means verified in code. **[U]** means unverified or inferred: the code points that way, but I did not check the pixels.

---

## 0. The shared machinery every pipeline sits on

| Piece | Where | What it does |
|---|---|---|
| World queue | `vq`/`blockVQ` → `worldVQ` (Sierra bodies joined at L81379) | One sort on `depth` (world x+y) [V]. **The sort key is the `depth` field of the push, not the `bcDraw` anchor.** Most "keyed outside its footprint" findings are a push depth that differs from the image's anchor. |
| `bcDraw(g, key, ax, ay, drawFn)` | L77844 | Caches the drawFn into an image anchored at world (ax, ay). The cache key is `key|K|night` (L77852): night is a separate image, and zoom K is part of the key. The image is culled by its painted box (L77870–77884). An image over 1024 px goes to tiles (`bcTiles`, L77945): this is how the 9,384-long mall body survives. `_bcAlpha`/`_bcTint` fade or x-ray the placed image without repainting it [V]. |
| `lmDepth(key, it, draw, zBase)` | L77817 | A piece keeps its own key unless Tipsey's screen box meets the piece's measured footprint (`lmFootprint`, L77798, measured lazily within a 3 ms/frame budget). Then the piece goes **under** him if he is past its far x1 or y1, or if it is flat, and **over** him otherwise (L77837–77838) [V]. It reads only Tipsey (depth.md flaw 2 / S6) [V]. |
| `LIB.collect / drawItem / ground` | L72219 / 72231 / 72240 | An entry that ends in `depthSort(items)` (L40913) or calls `state.emit` hands its items to the host. `ground()` draws **everything the entry draws directly, with the items dropped** [V]. Note that "ground" is a misnomer: for the Maritime Mall it is the whole building body (§2.6). |
| `queueUnitStrips` | L84175 | Whole-unit funnel for houses and shops. Key = footprint centre `ux + dv·w/2 + rv·(−D/2)`, pushed at L84321 [V]. The comment at L84292–84320 carries the measurement: near-corner key 4,743 violations, centre key 0. |

**Why the centre key works, and when no single key can.** For a convex box of W×D, the keys that order it correctly against a point *outside* it are the band [min+min(W,D), min+max(W,D)] (L84300–84305). The centre min+(W+D)/2 always lies in that band. **No single key works when a mover can stand inside the box's footprint** (a yard, a plaza, a room). That is the real dividing line between "draw whole" and "split into pieces". The rim sites' origin key (§3) is the *low end* of that band for the site's bounding box. It is valid for movers outside the site and wrong for anything on the plaza or in the yard, and for the site's own separately keyed pieces.

---

## 1. Pipelines, one by one

### 1.1 `lu`: library house or garage on a housing edge (NORM, house)
- **Code:** `queueHousingEdgeAt` L84434 → `queueUnitStrips(..., hoodShopD(lib), 0, drawLibUnit)` at L84571. `drawLibUnit` L84332.
- **Who uses it:** every authored Maritime and Flats house row (`houseEdgeUnits`), e.g. Beach Modern Cantilever/Tower. 209 queue items in the census.
- **Split and key:** whole unit, one entry, key at the footprint centre [V]. The census measures key fraction 0.45–0.55.
- **Cache:** `lu|lib|ux,uy|pal|host|flank rear` (L84345). Stable: what and where, plus livery [V].
- **Collision:** the entry's `vol` via `hoodShopVol*`/`hoodShopLab` (L19195ff); an undeclared lot stays the block rectangle [V comment].
- **Address house:** `addrFn` (L84471). `drawLibUnit(...,'body')`, then the live door, mat and customer, then `'fore'` (porch, hood, fence) **live**, not cached (L84346). It is still one queue entry at the centre key. A rear door draws first under the body and is x-rayed via `xrayMirror` (L84463–84469) [V].
- **Night:** `bcDraw` night key.
- **Sir's reason:** "houses drawing over tipsey" (L84292). The near-corner key was rolled back to the centre.

### 1.2 `hs`: library shop on a commercial edge (NORM, shop)
- **Code:** `queueCommercialEdgeAt` L84650; whole body at L84782–84783; porch parts at L84784–84808.
- **Who uses it:** HOOD_SHOP_SITES shops (Palmline Garage, Surfside Fitness, Palmline Savings, Tidewater Tea House …). 82 + porch items in the census.
- **Split and key:** whole body through `queueUnitStrips`, keyed at the centre with D = max(STORE_DEPTH, hoodShopD) [V].
  - **Porch:** an entry with `porch` gets a second entry keyed on the column line (`px+py`).
  - **Posts:** with `posts`, `porchBack` at px+py, **each post `c`+i at its own base**, and `porchTop` at the nearest post + 0.5 (L84795–84804) [V]. This is S4: attachments ordered after their mount.
- **Cache:** `hs|lib|ux,uy|flank rear|b` (+`|pb|c<i>|pt|p`). The porch images are anchored at the unit corner (ux, uy) but sorted at the post. That is fine, because the anchor is only for placement [V].
- **Doors:** today's pickup is a separate entry a tile out on the pavement (L84694–84720), with the door opened live by `LIB.drawDoorOpen`. A rear shop's worker is x-rayed [V].
- **Sir's reasons:** "move when tipsey moves" (whole units, L84176); "tipsey is drawing over the posts" and "you missed at least 1 pillar" (porch split, L84764, L84788).

### 1.3 `hi`: whole-block landmark placed on a shop edge (NORM, landmark split)
- **Code:** L84733–84772, inside `queueCommercialEdgeAt`, taken when the entry has `block:true` and the edge is **not rear**.
- **Who uses it:** block-edge landmarks in HOOD_SHOP_SITES (census: Lagoon Baths, 581 pieces) [V for Lagoon Baths; the full list is U].
- **Split and key:**
  - Items are collected once per unit (`_lmItems` Map, L84744–84747) [V].
  - **Ground:** `LIB.ground` keyed at the lot's true **far corner** (`far` = min x+y of the four corners, L84752).
  - **Each item:** `lmDepth(q.x+q.y+z)` at its own lab point (L84767). This is the approved landmark norm; the census measures ~108 long pieces keyed at centre [V].
- **Cache:** `hi|lib|ux,uy|flank|n`, stable by collect order [V].
- **Doors:** `slideDoors`, **live every frame** (L84770–84773).
- **OUTLIERS inside this pipeline:** see O6 and O7 (ground drawn live, slide doors never cached), and O8 (a rear edge falls back to a whole unit).

### 1.4 `hl`: hood block landmark, one cell per entry (NORM, landmark split; Marina General is the big-site template)
- **Code:** `queueParkBlock` L85453–85583.
- **Who uses it:** HOOD_BLOCK_LANDMARKS (L19433) [V]:
  - Tidewater Maritime Museum, Seabreeze Ballroom, Ferris Taylor Cottages, Costa Palma Animal Shelter, Marina Parking, Crate Yard Building Site, **Lagoon Market Hall**;
  - Cove Grove ×3; Marina General Parking/Hospital/Tower/ER; Sun Deck Airfield ×8.
- **Split and key:**
  - Items are collected once per cell (L85466–85475).
  - Ground through `bcDraw` at the cell's far corner `blk.i*BLOCK + blk.j*BLOCK` (L85485). Its comment says "it was drawn live every frame", so it was fixed here, but not in `hi`.
  - Items use `lmDepth` at their own point (L85536), **unless** a hand override applies: `it.depth`, `wardFront`/`_wardDep`, `deckAB` → `garageDeckDepthLab`, `liftTower` → `_ltShell`/`_ltCar`, or a pocket cut (`_ct`) (L85533–85536) [V].
- **A multi-cell site is one entry per cell.** Marina General's podium is cut into 550-square tiles (L28802, `hospTileD` L32870), each keyed at its NE corner. For a square tile that NE corner equals the centre key (x1+y0 = min+W = min+(W+D)/2 when W = D) [V arithmetic]. This is the existing template for a big mass done right.
- **Cache:** `hl|name|i,j[|deck]|n[|cut<z>]`, plus `|ground` [V].
- **Live parts:**
  - `_le.live` (windsock, beacon) are small live items (L85541–85544): approved CLAUDE.md "split moving parts".
  - `liftDoor` and `wardDoor` are live every frame (L85560, L85569).
  - The lift canopy is cached per level (L85565).
- **X-ray and shell:** pocket shells fade by `pocketShellK` through `_bcAlpha` (L85521, L85536). They are cut at the floor with `LIB.setCut` when viewed from an upper floor (L85527).
- **Fallback:** an entry that hands over no items is drawn **whole at the cell's far corner** (L85578–85580). See O2.

### 1.5 `pl`: park landmark over a park component (`queueFramePieces`)
- **Code:** L85584–85597 → `queueFramePieces` L77689.
- **Who uses it:** `parkLandmarkAt` landmarks (census: Tidewater Green Park derby, 153 pieces) [V]. The cemetery and school are U.
- **Split and key:**
  - Ground through `bcDraw` at the `groundDepth` the caller passes.
  - Items use `lmDepth` at `x0+a + y0+sb·b + z`, or at the declared `it.dk` (L77753–77754).
  - Optional modifiers: `it.under` (L77757), `frontOf`/`backOf` holds (L77786–77796) [V].
- **Culling:** per item, by `_fp` or a 1400·K box (L77724–77727).
- **Queued once a frame from whichever cell is in view** (L85587–85592, the L7 fix) [V].
- **RISK:** `groundDepth` = `blk.x0+blk.y0` of *that* cell, not of the component's far corner (L85595). See O9.

### 1.6 `rim`: HOOD_RIM_SITES (the outlier family)
- **Code:**
  - Site table L25596. Frame `hoodRimFrame` L25718: origin (from, at), so `ox+oy` = from − 736. a runs east, b is 0 on the pavement and negative outward.
  - Queue: `queueExteriorLot` L86090–86225.
- **Who uses it:** Tide Pool Elementary (`pieces:true`), Maritime Mall (`pieces:true`, MALL_DEP 1880), Maritime Mall Parking, Palmline Tower (no items, **no vol**) [V, L25596–25615, entry flags checked].
- **Split and key:**
  - **Whole site image keyed at the site origin `fr.ox + fr.oy`** (L86147). For entries with items, that image is `LIB.ground` = *everything not handed over*. For the mall, that is the whole building: masses, concourses, atrium, roofs and awnings, one 9,384 × 1,880 image in tiles. For Palmline Tower it is `LIB.draw`, the whole tower.
  - **Items:**
    - TPE: `occ` → `occDepth`. Every item sits at the origin (`under = min(base, bd−0.5)`) + n·1e-3, and jumps to bd+0.5 only while Tipsey is on its far side (L86160–86164, L86175) [V]. Hence the census "keyed at 18032, standing at 18270..24157".
    - Mall: anchor-shell strips (≤300, a = c1 near end, L64909–64923), palms (`fpLab`), benches, flags and pylons go through `lmDepth` at their own points (L86175). That is always above the origin key [V arithmetic: anchor strip key = 8318 + c1 > 8648 for c1 > 330].
  - **Garage (Maritime Mall Parking):** `_mallSplit` (L86129–86145).
    - A "ground" pass at D0−2 and an "upper" pass at the origin.
    - `groundItems` at `groundGarageDepth` or under D0.
    - Barrier arms are live.
    - On the deck, items come from `garageDeckDepthLab` [V].
  - **Gates (TPE):** cached shut/open, live while moving, slotted between their piers through occDepth (L86186–86194).
  - **Slide doors (mall):** cached shut/open, live while moving, at the door point + 0.5 (L86197–86202) [V]. This is the right door pattern (contrast `hi`, O7).
  - **Lift doors and canopy (garage):** bespoke Tipsey-relative depths (L86205–86222).
- **Cache:** `rim|name[|deck][|cut]`, `rim|name|n`, `|low|n`, `|gate|g0|t`, `|door|i|u`, `rim|mallground|n` [V]. Stable.
- **Culling:** the body is one image (tiled); items cull through the entry's `inView` (L65288) [V].
- **Collision:** `hoodRimVolOf` (L25722) → `tpeVol`, `mallVol`, the garage plan. Palmline Tower declares none, so "its run stays one solid rect" (L25719–25720), and builtHeightAt falls to the generic band (L75164–75170) [V].
- **Pockets coupled to the origin key:** `queueMallThrough` (L77575–77630) queues the anchors' interior pieces and shoppers at `fr.ox+fr.oy − 1 + i·1e-7` (L77628–77629). They sit *just under the body image*, whose front has holes (MALL_THROUGH) [V]. These are the census `pkx|Maritime Mall Interior` items "keyed outside" their footprint.

### 1.7 `sv`: Sierra Vista estate
- **Code:** `drawSierraVista` L76022. Bodies go to `this._sierraBodies` (L76717) and are joined to `worldVQ` at L81379.
- **Lots:** one image per lot, keyed at the **lot** centre `(x0+x1)/2 + (yF+yB)/2` (L76833–76841) [V]. Census: 13 lots (Terrazza Split-Level …).
- **Blocks in front:** the lot image re-lays the terrace blocks in front of it (`occl`, L76849–76860). This hand-baked occlusion exists because terrace blocks are ground: "the garage is painting over the retaining wall" [V].
- **Edges and walls:**
  - `sv|edge|k|ya` sections (L78527) are keyed at their **near** end, deliberately: "a far-end key let a palm by its middle draw over its cap" [V].
  - Walls are 420 runs (L76871) [V].
- **Status:** NORM-ish (whole unit, centre key), with two caveats in O10.

### 1.8 `pkx` / `pk` / `pkv`: POCKETS (walk-in interiors)
- **Code:** POCKETS L19600 (Ballroom, Ballroom Basement), plus pushes at L27355 (Mall Interior), L27612 (Trophies) and L33389 (Hospital).
- **Queueing:**
  - From the scene: L80654–80667 → `queueFramePieces` with groundDepth `x0+y0+min(0,ax0) − 200`.
  - Mall through-glass: `queueMallThrough` L77575, under the rim body.
  - Hospital through the emergency doors: `queueHospThrough` L77636. Pieces go under their own podium tile (`hospTileD(a−150, b) − 1`, L77651–77686) [V].
- **Split and key:**
  - Every piece goes through `lmDepth`, or a hand `dk` (bar stool and bar).
  - Mall rooms use `mallRoomOf` / `MALL_HERE`. Under the gallery the depth is re-keyed to `x0+y0+mallRoomA1(room)+SF1+3` (L77768).
  - Escalator steps are forced under him (L77762–77765).
  - `frontOf`/`backOf` hold pieces between walls [V].
- **Fades:**
  - X-ray under the gallery: `_bcAlpha` + `_bcTint` (L77769–77771).
  - Shell or cut: `mallCutK` / `mallShellK` (L77712–77716) [V].
- **Status:** per walkin.md, "no walk-in kit yet: each building rolled its own" [V doc].

### 1.9 `depot`: Charge depot (a walk-in by planes)
- **Code:** L84844–84945.
- **Split and key:** one image per wall, keyed at its **farthest end**, then raised past the nearest occupant inside its plane who overlaps it on screen. "Occupant" means Tipsey or the rescue crew (L84895–84922) [V]. The room and mat are keyed at min(...)−1; the door is keyed on the chamfer (constant x+y) [V].
- **Cache:** `depot|key|part|cut|doorT[|room state]`. Content is in the key (trophies, stash). The wall is live only while the door rolls (L84867–84870) [V].
- **Census:** keyed near a corner (0.06). This is **deliberate and correct for a plane**: it is the far-end key plus the which-side test that depth.md S3b asks for. It is not an outlier to fix. It is also the only building whose order reads more than Tipsey (the crew).

### 1.10 `hb`: harbour
- **Code:** L78482–78590.
- **Pelican Harbor house:** whole, keyed at its **far corner** `B.x0+B.y0`, anchored at (x0, y1) (L78485–78487): "so everything on the plaza in front of it sorts after it" [V]. See O4.
- **Harbor Light:** at its own point.
- **Rocks:** in 500-deep bands keyed at the band start (+1 for k ≥ 0) (L78494–78510).
- **Boats:** keyed at the end by side (`side·L/2`). A 1,500 boat "keyed at its centre would cover him at one end".
- **Gangways:** at the far end.
- **Props:** at their own point, cached [V].

### 1.11 `dng` / `dp` / `dr` / `lg` / `nsg` (beach dressing, not buildings)
- **Dunes:** keyed at the mound nearest Tipsey (L78241–78249).
- **Dune paths and NSS garden ground:** flat, pushed into the **world queue at −1e6** (L78254, L78169) rather than the ground pass. This is S0 (flat things in `hazVQ`/`vq` by hand); it is not a building.
- **Lifeguard tower:** at its point; ramp and flag offset by hand (L78350–78354).

### 1.12 Legacy and generic (not in the Flats census)
- Generic houses and stores (`drawHouseUnit`/`drawStoreUnit`) go through `queueUnitStrips` whole but are **not cached** (L84574–84580, L84822–84826).
- The generic **address** house and the generic **pickup** store are keyed at the frontage midpoint `hx+hy`, with a separate `isRoof` entry (L84558–84559, L84812–84819).
- Corner stores are behind `CORNER_ART_LEGACY` (L84618).
- [U: whether any live district still uses them. The Flats census shows none.]

---

## 2. The NORMS (approved by Sir, with measurements)

1. **House or shop = one unit, one entry, key at the footprint centre** (`queueUnitStrips`, whole; `lu`/`hs`), cached as one image with a what+where key. Porch posts are split only as attachments, each on its own base, with the top past the nearest post. (LOOK_RULES §1, depth.md S2/S4, measured 0 vs 4,743.)
2. **Landmark = items via `LIB.collect`, each cached and keyed at its own lab point through `lmDepth`, with ground under all of it** (`hi`, `hl`, `pl`). Pieces ~108–150 long for runs Tipsey touches (S3). Moving parts are their own live items (`_le.live`).
3. **Flat ground** goes to the ground cache, or at minimum a cached image keyed below everything on it (the `hl|…|ground` at the cell's far corner).
4. **A big mass = square-ish tiles keyed at their centre**, as Marina General's 550 podium tiles are.
5. **Doors:** a cached image when shut or open, drawn live only while moving (rim slide doors and gates, alley gates `agate`, the depot's walls) [V].
6. **A wall seen as a plane** may key at its far end and rise past an occupant on its inside (depot). This is the S3b rule.

---

## 3. Why rim sites key at the site origin, and whether they can move to `hi`/lmDepth

**Why (from the code and its history):**
1. **It was the first default.** Commit 1cbc73d added `vq.push({ depth: fr.ox + fr.oy, fn: LIB.draw(rim.name …) })`: one whole entry, like an exterior lot [V git].
2. **It is a separating line.** The site lies wholly north of the pavement line y = at (−736). Every street body along the frontage has x ≥ from and y > at, so its key is above `from + at`, and the whole site paints under all of them. For movers **outside** the site's box, that key is the low end of the valid band [min+D, min+W] (§0). So it was correct for a solid lot.
3. **It became load-bearing.**
   - TPE items fall back to it off-site: "all of them sit at the site's far corner as the one image did, under the cars and everything else in front" (L86154–86158).
   - MALL_THROUGH's interior is slotted at origin − 1, under the body's holed front (L77628).
   - The site is culled and cached as one (L7; TPE exemplar 803e9b3; the mall body is tiled).
4. **TPE uses `occ` rather than `lmDepth` on purpose:** "a run of railing or a wing 2000 long has no one depth" (L86150–86153). Its pieces are not split to S3 lengths, so it orders them by paint order plus a far-side test against Tipsey only.

**What breaks:**
- Anything standing *inside* the site's box (the plaza, the school yard, the mall front) cannot be ordered by the body's single key.
- **Every separately keyed piece of the same site sorts after the body**, because its own point is always above the origin. That is the Maritime Mall's west anchor shell painting its east end and coping over the nearer concourse roof that lives in the body image. [V for the key order. The described visual is U, inferred from the geometry: WA1 = 2240, HA 400 > HC 300, L64885–64923.]

**Is moving them to the `hi`/lmDepth way feasible? Yes, in two steps per site.**

The `hi` pipeline already does exactly this for a block-edge landmark: ground at the true far corner, items at their own points through lmDepth. The rim pipeline even already uses lmDepth for the mall's items. The blocker is what is left in "ground".

- **Maritime Mall:**
  - Move the masses into `canopyItems`, the way the anchors already are: the concourse W and E, the atrium, the entrance ceiling and the awnings, in strips of 300 or less keyed at their near end, or 550 squares keyed at the centre as the hospital podium is.
  - `LIB.ground` then holds only paving. Key it at the site's true far corner `from + at − depth`, or move it to the ground pass.
  - Re-slot MALL_THROUGH per strip, the way `queueHospThrough` already slots through-pieces "under its own tile" (L77651–77686, `hospTileD`). That code is the template.
  - **Risk.**
    - Perf: about 30–60 more cached images, each culled by `inView`. The body image is tiles today anyway.
    - Seams at strip joins (S3c; the anchors already handle this with `c0/c1` clipping, L64938–64939).
    - The `|cut` variant (MALL_SHELL_CUT) must stay a per-strip key.
    - The mall's fade (`shell`, `cutHide`, `drawLow`) already works per item.
    - X-ray is unaffected: it reads `mallVol`, not images.
- **Tide Pool Elementary:**
  - Split the wings (MA0..WB, WA..MA0 2000 long) and the railings (9,384) into pieces of 150 or less (S3; needs the `queueRun` splitter, depth.md flaw 1).
  - Drop `occ`, and key each piece through `lmDepth`.
  - **Risk:** seams on the railing joins, and many more cache entries. The gates already slot by pier and would key at their own point + 0.5.
- **Palmline Tower:** a single solid building, so treat it as a unit: centre key (`fr.ox + W/2 + fr.oy − D/2`). It also needs a `vol` (L2) and an x-ray height (it is 1300 tall, xh at L65658, and has no rim vol) [V: no `vol:`].
- **Maritime Mall Parking:** its ground/upper/deck split works and is Sir-approved (MALL_GARAGE_PASS). Only the "upper" pass at the origin would move to a centre or tile key.

---

## 4. OUTLIERS, each with a fix and its risk

| # | Where (lines) | What departs | Visible consequence | Fix: route through | Risk |
|---|---|---|---|---|---|
| **O1** | rim body L86147; mall entry L64791–65290 | Maritime Mall: the whole body (9,384×1,880, tiled) is one entry at the site origin 8648, while its anchor strips, palms and pylons key at their own points through lmDepth | Every anchor piece paints over the body, including nearer concourse roof and coping at WA1 [U visual]. Tipsey or shoppers on the plaza inside the box can't be ordered against the body | §3: masses become items (≤300 strips / 550 tiles, centre or near-end keys via lmDepth); ground = paving at the far corner; MALL_THROUGH per strip like `queueHospThrough` | Perf (more images), seams, `|cut` keys, re-slotting through-glass pieces |
| **O2** | L85578–85580 | **Lagoon Market Hall** (no `depthSort`, no `block`, no `vol`; L62950) is drawn whole at the **cell's far corner** `blk.x0+blk.y0` (census `hl|Lagoon Market Hall|3,8`) | Tipsey (and every car or person) on the hall's back or side pavement has a larger key and draws **over** the hall while behind it. This is the very bug the comment at L85460 describes for pieces | Either key it as a unit at its footprint centre (cell origin + 736 inset + ww·sc/2, dd·sc/2), or give it `block:true` + `depthSort` items for the `hl` path. Add a `vol` (L2) | Low. One entry; it needs a vol or it stays a whole-block solid |
| **O3** | L86160–86194, TPE L64487–64735 | TPE items all keyed at the origin 18032 (+n·1e-3), reordered only against Tipsey (occ) | People or vehicles inside the yard aren't ordered against the wings or railings (S6). Long pieces (wings 2000, railing 9384) break S3 | §3: split runs to ≤150 and wings to ≤550, then lmDepth | Seams, cache count; the gate slots need rekeying |
| **O4** | L78485–78487 | Pelican Harbor house: a whole building keyed at its **far corner** | Anything standing beside or behind it (north or west, key > x0+y0) paints over it. S2 says "never key at a corner" | Centre key (B.x0+B.x1)/2+(B.y0+B.y1)/2 as `queueUnitStrips` does. If the plaza is walkable inside its box, split it as a landmark | Low |
| **O5** | L86147 (Palmline Tower) | Whole tower at the site origin, no `vol`, no rim x-ray height | Collision is the whole run rect (L25719). The x-ray band is wrong for a 1300-tall tower [U on-screen effect; little stands behind it] | Unit centre key + a `vol` through `hoodRimVolOf` | Low |
| **O6** | L84752 (`hi` ground) | `LIB.ground` for a block-edge landmark is pushed **live** (no `bcDraw`); census `84762 live x6` | Perf only: repainted every frame (the `hl` path fixed the same thing at L85483) | `bcDraw(g, _lk+"|ground", ...)` as at L85485 | None |
| **O7** | L84770–84773 (`hi` slideDoors), L85560/85569 (hl lift and ward doors) | Doors drawn live every frame, even when shut; census `84773 live x3`, `85560 live x2` | Perf | Cache shut/open as rim doors do (L86197–86202) | None |
| **O8** | L84737 `_e.block && !rear` | A block landmark on a **rear** edge falls back to the whole `hs` unit (centre key) | A walkable landmark lot drawn as one key on away edges: Tipsey inside its railing is ordered by one point [U which entries sit on rear edges] | Collect items on rear edges too (with `back()`), or forbid block entries on rear edges | Needs a rear elevation per entry |
| **O9** | L85595 (`pl` groundDepth = `blk.x0+blk.y0` of whichever cell queued it) | The park ground image's key depends on which cell is in view, not the component's far corner `lm.x0+lm.y0` | When a non-anchor cell queues it, the whole park's ground can paint over the feet of pieces in farther cells [U: not reproduced] | Pass `lm.x0+lm.y0` (or the min corner) or move it to the ground pass | None |
| **O10** | L76833–76841 (sv) | Keyed at the **lot** centre (yard included), not the house footprint; terrace blocks re-laid inside the lot image (`occl`) | The key drifts from the footprint centre by about half the yard depth [U size]. Baked occlusion is a hand workaround for terraces being ground (S0b "raised ground is a body") | Key at the footprint (from `LIB.vol(name).foot`); make terrace blocks bodies | Low / medium |
| **O11** | L77628, L77651–77686, L77768 (pkx/hospital/mall interior) | Interior pieces keyed off their footprint by design: under the rim origin (mall), under a podium tile (hospital), at the gallery line (under-gallery x-ray) | Correct today, but coupled to O1's key: changing the mall body's key without these moves the shoppers over or under the wrong face | Move together with O1 (per-strip slot) | Medium (MALL_THROUGH regressions) |
| **O12** | L85533–85536, L86205–86222 | Hand depth overrides per building: `liftTower`, `wardFront`, `deckAB`, `it.depth`, lift doors and canopies (`bd±0.5`), escalator, `dk` | Each is a one-off Tipsey-relative rule that ignores other bodies (S6), so a crew member or shopper can be mis-ordered [U] | depth.md flaws 2+3: `lmDepthAgainst(movers)` and a generic `onSurface(x,y)` | Medium; wide reach |
| **O13** | L78169, L78254, L84783-area mats, depot mat L84935 | Flat things (garden ground, dune paths, mats) pushed into the world queue at −1e6 or min−1 | None today; violates "nothing in a pass of its own / flat in groundVQ" (S0) | `{flat:true}` → groundVQ (depth.md flaw 5) | Low |
| **O14** | L84558–84559, L84812–84819 | Generic address house and pickup store: keyed at the frontage midpoint, roof as its own `isRoof` entry, live (uncached) | A face-line key is a near-side key, the bug S2 retired [U: whether any route still uses generic units] | `queueUnitStrips` + `bcDraw` like `lu`/`hs` | Low |

Lower-priority notes:
- `lmDepth` only knows Tipsey (S6). This is a kit flaw shared by all landmark pipelines.
- `lmFootprint` is measured lazily (3 ms/frame budget). Until measured, a piece sorts by its own key [V L77821–77830].

---

## 5. RECIPE: the one pipeline per class, and what each must declare

**Rule of thumb:** draw whole if and only if nothing can stand inside its footprint; otherwise it is a landmark and goes in pieces.

### House
- **Pipeline:** an authored housing row → `queueHousingEdgeAt` → `queueUnitStrips(vq, ux, uy, dv, rv, w, hoodShopD(lib), 0, g => drawLibUnit(...))`. That is whole, centre-keyed, `bcDraw` `lu|…`.
- **Declare** in the `LIB` entry:
  - `ww`/`dd` at true size, and `vol` (foot, h, `opens` for drive/path) with drawn = declared (H6);
  - `door` via `houseDoorway` (92×184);
  - `fore()` for the porch, fence and door hood;
  - `back()` for away edges;
  - `liv` liveries;
  - `houseLawn` empty, ground `'grass'`.
- **Never** a lawn, key override, or per-house sort.

### Shop
- **Pipeline:** HOOD_SHOP_SITES → `queueCommercialEdgeAt` → `hs` (`queueUnitStrips` whole + `bcDraw`).
- **Declare:**
  - `shopDoor` once (the pickup door);
  - `vol` if it has open ground (a forecourt), else the block solid;
  - `xh` (x-ray height);
  - `back()`;
  - if anything stands out on the pavement: `porch` (b of the column line) **and** `posts` [{a,b}] with `state.part` support for `porchBack`/`col`/`porchTop`;
  - `slideDoors` + `doorDraw(i,u)` for automatic doors.

### Landmark (one cell, or a block-edge lot, that you can walk into)
- **Pipeline:** `hl` (HOOD_BLOCK_LANDMARKS row) or `hi` (`block:true` on a shop edge); the lab is `queueFramePieces` for park components.
- **Declare:**
  - the entry ends in `depthSort(items)` with every standing thing an item `{a, b, z?, draw}`. Runs ≤150 (≤124 where Tipsey touches), masses ≤550 square, each keyed at its own base point;
  - optional `fpLab` when the paint reaches beyond the base (palms);
  - `ground` = flat paving only;
  - `vol` with `opens` (L2) and per-mass heights (L4);
  - `live` [{x, y, draw}] for moving parts;
  - doors as `slideDoors`/`gateLeaves`, cached shut or open (after O7 is fixed);
  - no `it.depth`/`dk` override unless a plane or a deck needs it, with the reason in a comment.

### Big multi-part site (several cells or rim lots)
- **Pipeline (today's working template):** Marina General. One HOOD_BLOCK_LANDMARKS entry **per cell**, each in pieces via `hl`, with big masses tiled at 550 squares keyed at the centre (`hospTileD`), and one plan constant shared by draw, vol and pockets.
- **Rim sites** must reach the same state before more are added:
  - a body made of items (no "ground" that is a building);
  - ground at the site's far corner or in the ground pass;
  - items through lmDepth;
  - one site box for culling (L7).
- **Declare:** a site table row, a plan constant, `vol` per cell/site (`opens`, gates ≥82 clear), and `LIFT_SITES`/garage plan if it has decks.
- **Do not** add a whole-site image keyed at the origin, and do not mix a whole body with separately keyed pieces of itself.

### Walk-in interior
- **Pipeline:** a POCKETS row (`name, from, x0, y0, w, d, doors[...], view, hides, night`) + a LIB entry in the pocket frame that hands items to `queueFramePieces` (lmDepth; `frontOf`/`backOf` for wall holds; `lvl`/`fl` for floors).
- The exterior must be an `hl`-style landmark whose shell items carry `shell`/`cutTop`, so `pocketShellK` fades them and `LIB.setCut` cuts them.
- See-through from the street goes **under its own exterior piece** (the `queueHospThrough` per-tile pattern), not under a site-origin key.
- **Declare:**
  - `vol` solids with `lvl`/`fl`;
  - a `night` cut list;
  - `doors` with `seamless`, `glass` and `clear`;
  - the plan shared with the exterior (W4).
- No walk-in kit exists yet (walkin.md). Until it does, the hospital (`hl` + tiles + `queueHospThrough`) is the cleaner model; the mall's (O1/O11) is not.

### All classes
- Draw into the `g` handed in.
- Use `bcDraw` keys of what + where (+ content).
- Draw live only what moves.
- Cull pieces with `inView`.
- Never key on time, robot position or random values.
- Check the building cache `live` count stays steady with the robot still.
