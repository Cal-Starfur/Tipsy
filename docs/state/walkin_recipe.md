# Walk-in interiors in Tipsy: how they work, and a recipe for the museum and the trophy shop

Source: `/home/user/Tipsy/game/index.html` (119,764 lines, read 2026-10-30). Line numbers are as of this read. The
docs' own line numbers (buildings.md) have drifted by +700..+800; the ones here are current.
**[V]** = verified in code. **[U]** = unverified or inferred.

---

## 0. The one thing to know first

**Every walk-in is an off-map POCKET drawn on the street's lines.** None of them, the hospital included, puts
its interior geometry "under the building" in world coordinates. The interior is a LIB entry that lives
in its own frame far off the map (`x0, y0` ≈ 400000..470000). The pocket then gets a `view()`: one
`{dx, dy}` translation from that frame to where the building stands. While he is inside, `drawWorld` adds that offset
to the camera and the robot, so the whole city draws round the room at its real place.

`drawWorld` is at L81004–81021 [V]:
- `POCKET_VIEW = { pk, dx, dy }`;
- `camX/camY/botX/botY += dx/dy`;
- then `drawWorldIn`, with everything restored in `finally`.

The exterior then **persists** through three things:
1. The city is drawn normally round the room.
2. The building's own shell pieces fade off (`pocketShellK`, hl pipeline only).
3. On upper floors, the shell is drawn cut at the floor (`LIB.setCut`).

The frames share their axes, because the pocket frame is world-aligned (a = +x, b = +y). So a shift is all it takes, even for a
mirrored edge-2 landmark (ballroom, museum).

Pocket origins in use [V]:

| Pocket | x0 | y0 |
|---|---|---|
| Ballroom | 400000 | 400000 |
| Mall | 400000 | 404000 |
| Trophies | 410000 | 400000 |
| Ballroom Basement | 430000 | 430000 |
| Hospital | 470000 | 470000 |

`pocketAt` (L19845) takes ±300 round each pocket (plus `ax0/ax1/out`), and the first match wins. **A new pocket needs a free square**: 450000,400000 is free [V by the list above].

---

## 1. HOW THE HOSPITAL DOES IT (Marina General, the cleaner model)

### 1.1 The plan constant, shared by draw, vol and pocket
- **`HOSP`** (L29027–29105) [V]: the site.
  - `cells` (4 HOOD_BLOCK_LANDMARKS cells, 4..7 × 1);
  - `podium {x0 15250, x1 21300, y0 3864, y1 5520, top 196}`;
  - `tower`, `entrance`, `mainSets`, `er.eDoors`.
- **`HOSP_LOWER`** (L29723) and **`HOSP_FLOORS`** (L29803): the rooms of each floor as world rects `{n, r:[x0,x1,y0,y1]}`, and each floor's `z` [V].
- **`HOSP_IN`** (L29979–29983) [V]:
  - `{ name 'Marina General Interior', x0 470000, y0 470000, PX0 = podium.x0, PY0 = podium.y0, W, D (the podium's size), H 300, WH 64, floor, cars, erMat, bridgeStub }`.
  - **The pocket frame is the podium's own square**: a = x − PX0, b = y − PY0 (`hospInA/B/R`, L32705–32707). The world plans read straight into it.
- **`hospInFoot(f)`** (L32711): the floor's footprint.
- **`hospInPlan(f)`** (L32877–): the walls, found from the plan. The rule is footprint less walkable rects, merged; the north and west outer strip is full height and the rest is low.
- **`hospWallOutline(mode)`** (L32441): the union outline of the rooms (W9).

### 1.2 The interior's geometry
- **LIB entry `'Marina General Interior'`** (L49898) [V]:
  - `place:'pocket', zs:1, mirror:false, ww 6050, dd 1656`;
  - frame a east, b south, z up, in world units.
- **Ground:** only the lift-car floors and the bridge stub. Room floors are 300-cells, each its own piece (comment L49914–49920).
- **Pieces:**
  - every floor's pieces are collected once, and `it.when` shows the current floor's;
  - pieces carry `solids` with `fl` (the floor number);
  - wall pieces carry `wseg` for `hospHold`.
- **Pocket row** (`POCKETS.push`, L34051–34086) [V]:
  - `{ name, from 'Marina General Hospital', x0, y0, w: W, d: D, out: 140, h: H }`;
  - `view: hospInView` (L34048: `{dx: PX0 − x0, dy: PY0 − y0}`);
  - **`hides: ['Marina General Parking','Marina General Hospital','Marina General Tower']`**: every hl cell holding a piece of its shell;
  - `z: hospInZ` (the floor's height: pieces drawn up there, L34049);
  - **`cut: () => (z − 24)/1.5`** on upper floors: the shell is drawn up to the slab;
  - `night: () => [...]` (the boxes lit at night, see 1.8);
  - doors (see 1.4).

### 1.3 The exterior shell, cut and faded
- **The exterior is `hl`** (one HOOD_BLOCK_LANDMARKS row per cell, L19654–19657). It is drawn in pieces by `queueParkBlock` (L86173).
- **Shell pieces** in the hospital exterior entry [V]:
  - podium tiles 550 square, `{a: A(tx1), b: B(ty0), shell:true, wing}` (L44511), keyed at their NE corner;
  - the tower (L44664/44672);
  - the skybridge `{shell, wing, cutTop: z0}` (L44473);
  - ER canopy posts and roof `{shell, cutTop: 210}` (L44694/44695).
- **In `queueParkBlock`** (L86273–86296) [V]:
  - `_hp = pocketHiding(_hl)` (L26251: name → pocket via `pk.hides`).
  - `_hsk = pocketShellK(this, _hp)` (L26255): a 0..1 ease over `MALL_CUT_MS` 450 with smoothstep. It wants 0 while `scene._inside === pk`.
  - `_cut = pk.cut()` when he is in that pocket on an upper floor.
  - The rules:
    - `shell && _cut<=0 && _hsk<0.002` → skipped;
    - `shell && cutTop && _cut < cutTop` → skipped (whole or nothing);
    - `_fa` = faded, drawn with `this._bcAlpha = _hsk` (no repaint);
    - `_ct` = cut, drawn with `LIB.setCut(_cut)` under a separate cache key `|cut<z>`, at depth `_cutDep` (just under the room's ground) or, for `wing`, `min(own, bot−1)`.
- **`LIB.setCut`** (L72882; semantics at L40600–40615, 40927, 41113, 41403, 41416) [V]: `P()` clamps z to CUT, and faces or primitives fully above it are skipped.
- **While he walks back out**, the AN INTERIOR queue (L81377–81393) keeps drawing the room under the fading shell. It does this when `!this._inside && pk.hides && pk.view && pocketShellK < 1` [V].
- **Street x-ray height** (`builtHeightAt`) ignores the hidden landmark's vol while he is inside it (L75772, L75844) [V].

### 1.4 The doorway hand-off (seamless)
- **Doors** (L34066–34085) [V]:
  - main doors `{side 's', at, half, seamless:true, glass 56, clear 52, spawn, yaw, floor 1, mdoor, world: () => podium south face point + out (0,1), out: (a,b) => floor 1 && b > D + 70 && |a−at| < half+40, keep: true}`;
  - ER doors on side 'e', the same shape;
  - the skybridge door (`deck 'hosp'`, floor 4, not seamless: the fade path).
- **`pocketDoorStep`** (L19885–19956), every frame [V]:
  - **Outside:** for each pocket door, `d = pocketOutsideDoor` (L19853: `door.world()`, else the hl row + `vol.marks.door`).
    - With `door.half`, `near` = across < half+20 and deep < 70.
    - On the right floor (`pocketDoorFloorOk`).
    - At the glass (projection < `door.glass`).
    - If the gate passes (`POCKET_GATES[from|id]`) → `pocketHandOff(scene, q, door, true)`.
  - **Inside:** `door.out(a,b)` or the side test → `pocketHandOff(..., false)`.
- **`pocketHandOff`** (L20003–20043) [V]:
  - `viewCrossfade(scene)` (L19976): it snapshots the current frame into a RenderTexture and fades it out over 420 ms. It is skipped only for the mall's anchor doors.
  - **In:** `nx = px − dx`. Without `door.keep` he is clamped 30 inside the wall. **The hospital uses `keep:true`**, so he lands exactly where he is (the pocket's floor extends `out: 140` past D as the apron), with no jump.
  - The door leaves are marked open (`HOSP_EDOORS/MDOORS[k].k = 1`) and `hospInSetFloor(scene, door.floor)` runs.
  - **Out:** `nx = px + dx`, nudged to `door.clear` outside the glass; `door._rest = true`.
  - The camera moves by the offset only (`camX += ±dx`), so the street holds still. `scene._inside = pk`, the `tpInside` body class is set, and `pocketInsideChanged` resets the x-ray prop cache.
- **Sliding glass leaves:** `HOSP_EDOORS` (L33298), `HOSP_MDOORS` (L33312), opened by `hospEdoorTick` (L33317). They are live leaves.

### 1.5 People and props inside: queued and ordered
- **Static pieces:** `queueFramePieces(blockVQ, pk.name, x0+dx, y0+dy, 1, "pkv|"+name, x0+y0+min(0,ax0)−200, null, pk.z())`. The call is at L81389 and the function at L78406 [V].
  - ground → `bcDraw(lk|ground)` at `groundDepth`;
  - each piece → `lmDepth(key)` (L78535) at its own a+b (or `dk`);
  - culled by `_fp`/1400·K;
  - `it.live` cast is drawn next to its piece (±1e-3), `it.fx` likewise;
  - **`frontOf/backOf`**: furniture held between wall pieces by the depths this frame queued them at (L78480–78491).
- **Hospital walkers** (live): L82546–82563 [V]. They are shifted into the street's lines by `hv = POCKET_VIEW` and ordered by **`hospHold(f, a, b, d, ox, oy)`** (L78387). That function holds a walker between the wall pieces (`it.wseg`) in front of and behind them on screen. Lift doors are live too.
- **From the street through the glass:** `queueHospThrough` (L78330–78384) [V], called from L81396 when outside. It is skipped while the shell is still fading (`pocketShellK<1`, L78331).
  - It queues floor 1's pieces near the visible ER doors and the south face (`win(a,b)`), outer-wall pieces excluded, plus live walkers.
  - Each goes **just under its own podium tile**: depth `hospTileD(a−150, b) − 1 + i·1e-7` (`hospTileD` L33307: the tile's NE-corner key).
  - The tile's faces have holes there, so the floor shows only through them.

### 1.6 Collision inside
- **Where the solids come from** [V]: at world build, POCKETS → `parkLandmarkVol(pk.name)` → blocks with `pl:{v, vL, vF, ox: pk.x0, oy: pk.y0, sb: 1}` (L8030–8035).
  - `parkLandmarkVol` (L19747–19776) collects `it.solids` from the entry's items and tiles them 800-square.
  - It builds a set per `lvl` (mall) and per `fl` (hospital).
- **The test:** `solidAt` (L8077–8086) picks `vF[HOSP_IN.floor]` or `vL[MALL_LVL?1:0]`. **These are globals, not per pocket** [V].
- **Movement** (L10918–10923) [V]: in a pocket (`pocketAt`) the world is only `W.solidAt`, plus `ballroomWalkerBlock` and `hospLiftBlocks`. There are no kerbs, sea or city.
- **Ordering:** POCKETS must all be pushed (top-level) before the world grid is built [U ordering, inferred from L8031 being in the build].

### 1.7 Camera
- The camera follows him as usual. At hand-off it jumps by exactly the view offset, so on screen nothing moves (L20038–20041) [V].
- **Height:** `owLiftZ` returns `hospInZ()` inside (L29573). camZ follows botZ (L75403) [V]. Upper floors are drawn at their height (`pk.z`), and the camera climbs.

### 1.8 X-ray and night
- **X-ray:** `xrayWant` = 0 whenever `POCKET_VIEW` (L83199) [V]. The 0.85 cases are the legacy garage-deck maze (`_inHosp`), the lift, and the mall slab/escalator.
  - **LOOK_RULES 8b says 0.85 in the hospital. The code gives 0 inside the pocket.** [V code, doc stale]
  - `xrayWayUp` is off under POCKET_VIEW (L83213).
- **Night** (L81141–81162) [V]:
  - the street keeps its night multiply;
  - `pocketNightCut` (L81108) cuts the room out of the mask, as the hull of each `pk.night` box `[a0,a1,b0,b1,z1,z0]` (default `[0,w,0,d,h]`);
  - the room's lights ease up over `POCKET_LIGHTS_MS` 900 (`gNightIn`, L81155–81164).
  - The hospital's `night()` stops 100 short of the near walls (`HOSP_NIGHT_IN`) and adds the doorways (L34057–34063).

### 1.9 Floors and lift (hospital only)
- `hospInSetFloor` (L33705) sets the floor and evicts the cached `pk|/pkv|/pkx| …|ground` images.
- `it.when` picks the floor's pieces, and `pk.z` raises them.

---

## 2. HOW THE MALL DOES IT, AND WHICH MODEL IS CLEANER

### 2.1 The pieces
- **Exterior:** a RIM site (`HOOD_RIM_SITES` L25794, `queueExteriorLot` L86867). The body is **one `LIB.ground` image** (9,384 long, tiled) keyed at the site origin, plus anchor pieces.
- **Interior:** `MALL_IN` (L26071, x0 400000 y0 404000) with `ax0/ax1` for the anchors' rooms. The pocket push is at L27596.
- **View:** `mallInShift()` (L26287) via `mallInWorld` (rim frame). It is special-cased by name in `drawWorld` (L81006), `pocketHandOff` (L20004) and `pocketDoorStep` (L19899).

### 2.2 Two different shell mechanisms
1. The centre (concourses, atrium, awnings) is **left out of the body image** by the global `MALL_SHELL_CUT` (L65498, 65827, 65842; cache key `|cut`, L86888). This is instant, masked only by `viewCrossfade`.
2. The anchors' `shell` pieces fade by their own **`mallShellK`** (L26195, a separate copy of pocketShellK's ease), with `shellIn` pieces fading the other way (L78434). On top of that come `mallCutK` (upper floors lift off per room, L26181), `mallCutSnap`, `MALL_SHELL.room`, `MALL_HERE`, and `MALL_LVL`.

### 2.3 The rest
- **See-through:** `queueMallThrough` (L78272–78327). Every interior piece goes under the **whole site's origin key** (`fr.ox+fr.oy − 1 + i·1e-7`). This is the census's "keyed outside its footprint" problem.
- **Levels and x-ray:** `lvl` solids (`vL`), escalators, and x-ray under the gallery (`mallXrayUnder`, `_bcTint`).
- **Anchor doors:** these are the only truly crossfade-free door. `pocketHandOff` skips `viewCrossfade` for `anch` and relies on the shell fade alone (L20007–20011).

### 2.4 Verdict: the hospital is the cleaner model
1. **Generic hooks.** Its shell goes through the generic `pocketHiding`/`pocketShellK`/`pk.cut` path that any `hl` landmark gets for free. The mall needs bespoke globals (`MALL_VIEW`, `MALL_SHELL_CUT`, `MALL_SHELL`, `mallShellK`, `MALL_HERE`).
2. **Shell in pieces.** Its exterior is pieces (550 tiles, centre-keyed), so cut and fade work per piece. The mall's body is one image that has to be re-rendered with holes (`|cut`).
3. **Correct see-through order.** Its see-through sorts under each piece's own tile (`hospTileD`). The mall's sorts under the site origin.
4. **No jump at the door.** Its doors use `keep:true` plus an `out` apron.
5. **One plan.** One plan feeds draw, vol and pocket (W4).

**What the mall does better:** the anchor doors' no-crossfade entry (shell fade only). That is the W5 target, and the kit should make it the default once the shell fade covers the whole building.

The **Ballroom** (`POCKETS[0]`, L19805–19820; exterior hl entry L64374 with `shell:true` hall, canopy and lamps at L64492–64535) is the **same hospital path at single-cell scale**. **It is the closest existing template for the museum.**

---

## 3. HOW TROPHIES DOES IT TODAY, AND WHAT MUST CHANGE

### 3.1 Today [V]
- **Exterior:** `flatsShop({name:'Seabreeze Trophies', ww:585, dd:462, doorMid:true, sc 1.3})` (L72330). This is an **hs whole-unit shop**, placed by HOOD_SHOP_SITES `[1,4, 2, ["Seabreeze Trophies"], {start: 1656 − 585·1.3}]` (L17347). It is 760.5 × 600.6 world, sized to the room.
- **Interior:** `TROPHY_IN` (L27820: x0 410000, y0 400000, W 760, D 600, H 240, DOOR [320,440]). The LIB entry `'Seabreeze Trophies Interior'` (L47015) has full back and west walls and knee-high (78) near walls with the door gap.
- **It is ALREADY on the street's lines:** `view: trophyInShift` (L27848; the room's door to `shopDoorsOf(...)` "Seabreeze Trophies", lazily cached, null before the grid exists) and `hides: 'Seabreeze Trophies'` (L27853–27857).
- **Shell:** in `queueCommercialEdgeAt`, `if(u.shop && POCKET_VIEW && POCKET_VIEW.pk.hides === u.shop.lib) return;` (L85448). The **whole shop unit vanishes in one frame**, and the edge's alley gates are dropped too (L85426). **There is no `pocketShellK` fade** in the hs pipeline (only hl calls it, L86273). On the way out the shop pops back whole: `pocketShellK` for this pocket is first called only from L81382 when outside, and initialises at 1.
- **Door:** `{id 'front', world: trophyShopMat (the pickup mat, ~120 out), side 's', auto: true, drive: [...], spawn}`. `pocketAutoIn` (L20058) runs on the mat, if the gate passes:
  - `viewCrossfade`;
  - `pocketShift` by −view;
  - `pk._entering = true`;
  - `gothDrive` drives him in automatically.
  - The way out is `pocketAutoOut` (L20069).
- **Gate:** `POCKET_GATES['Seabreeze Trophies|front']` lets him in only in FOURTH stages shop, engrave or engraved (L27858).
- **Mission code** waits on `_entering` (L28937). The engraver is drawn shifted by `POCKET_VIEW` (L82711–82716). `SHOP_DOOR_USE.tipsey` lets the shop door swing for him (L16382).

### 3.2 What changes for a hospital/mall-style cutaway
1. **Door: auto → seamless** (L27855–27857).
   - Replace `auto/drive/world: trophyShopMat` with `seamless:true, half: 60, glass: 45, clear: 44, keep: true, world: () => the shop's door point on the glass line + out (rv), spawn [380, D−130], yaw −π/2`.
   - Set the pocket's `out` to about 60 so the threshold is in the room. This is the ballroom/hospital door shape.
   - `trophyShopMat` stays for the mission's mat beacon only.
   - [U] The width of the shop's drawn door: `flatsShop` doorMid. The room's DOOR is 120 wide (320..440). The doorway lane must be ≥ 80 clear (W3).
2. **Gate policy.** Decide whether the shop is open any time (the owner wants walk-in buildings). Then drop or relax `POCKET_GATES['Seabreeze Trophies|front']`, or keep it for the mission only.
3. **Mission code:** remove the `_entering` dependency (L28937 `scene._inside._entering`), which is always false with seamless doors (harmless). Check `fourthNav`/toasts that say "roll onto the mat" (L28753).
4. **Shell fade for hs (and hi) shops.** At L85448, instead of `return`:
   - `const hp = pocketHiding(u.shop.lib); const sk = hp ? pocketShellK(this, hp) : 1;`
   - `if (sk < 0.002) return;`
   - draw the unit with `this._bcAlpha = sk`.
   - Apply the same to the alley-gate cut (L85426).
   - **Note:** `pocketHiding` only indexes pockets with `view` and `hides` (L26252). Trophies has both [V].
5. **Cutaway instead of vanish.** For a true cutaway (front walls cut to the dado, back walls staying), the shop must be split into shell pieces. Two options:
   - **(a)** give `flatsShop` a `block:true`-style items path. That would require it to be hl/hi.
   - **(b)** **simplest:** keep it whole and fade it while the interior draws its own walls. The interior already draws far walls full height and near walls at 78, so (b) gives the hospital/ballroom look exactly. The ballroom also removes its whole shell.
   - **Recommendation: (b).**
6. **Reuse:**
   - `trophyInShift` can become a generic `walkinView` (see §6). It must not be called before `scn().route.grid` exists; it is guarded today [V].
   - The interior's people already shift by the view (L82711). No change.
7. **Night:** the pocket has `h: 240` and no `night`, so it gets the default box `[0,760,0,600,240]` [V]. Fine.

---

## 4. THE MUSEUM TODAY, AND HOW TO MAKE IT A WALK-IN

### 4.1 Today [V]
- **Placement:** `HOOD_BLOCK_LANDMARKS` row `[3,0, "Tidewater Maritime Museum", 2]` (L19632). It is block i 3, j 0, in the `hl` pipeline. Edge 2 frame (`hoodLandmarkFrame` L19714; `blockEdgesOf` L13908; DIRV L4551):
  - origin (x1, y1) = (12512, 3128);
  - dv = (−1, 0), rv = (0, 1).
  - So **world x = 12512 − a and y = 3128 + b** (b negative into the cell). The front faces south, toward the camera.
- **LIB entry** (L64163): `ww 3128, dd 3128` (a whole cell; no `sc`, world plan units). Also `xh 440, block:true, tall:true, vol: TIDEWATER_MUSEUM.vol, drive` (the axis walk).
- **Geometry constant `TIDEWATER_MUSEUM`** (L42679–42726), lab units:
  - forecourt lot a 736..2392, b −2392..−736 (1656 square);
  - **building a 880..2250, b −2200..−1480 (1370 × 720), H 440 lab (= 660 world, ×1.5)**;
  - DMID 685 (the building's own u);
  - portico PA0..PA1 285..1085;
  - GATE, PLINTHS ×5, TREES ×4, HEDGES ×2.
- **vol:**
  - foot = the building rect, h 440;
  - solids: the portico + steps as one block `[BA0+PA0−60 .. BA0+PA1+60] × [BB1 .. BB1+90]`, h 300 (the comment says its columns are "not a gap a robot goes through");
  - railing ×5 (open at the gate), gate piers, plinths, trees, hedges;
  - zone: forecourt walk;
  - **`marks: { gate: [1565, −736], door: [1565, −1390] }`**. The door mark is the portico's front edge, 90 proud of the façade.
- **World position of the building:** x 10262..11632, y 928..1648. The front face is at y 1648, the portico front at y 1738, and the door axis is at x 10947 [V arithmetic].
- **Front door:** `doorF(fr, DMID, wall, trim)` (L64250, the factory at L42643). It is a **painted** door `SHOP_DOOR_W` 66.24 wide × `SHOP_DOOR_H` 161.92 (L40877–40878) on the front face. **It is not an opening.**
- **The colonnade:** `NCOL = 9` columns over PA0..PA1, so the step is 100. **Column 4 stands at u 685 = DMID, dead on the door axis** [V arithmetic]. There are also 4 steps.
- **Items (pieces):**
  - **one** building item `{a: (BA0+BA1)/2, b: (BB0+BB1)/2}`: all four elevations, roof, lantern and colonnade, **no `shell` flag** (L64272);
  - railing segments ≤300 (chopped);
  - 2 gate piers, plinths, trees, hedges.
  - Ground = the forecourt + the axis walk.

### 4.2 Where the interior fits
Pocket frame = world-aligned. Take `MUS_IN = { x0: 450000, y0: 400000, W: 1370, D: 720, H: 660 }` (a 0..1370, b 0..720). Then:
- `view = { dx: 10262 − 450000, dy: 928 − 400000 }`, i.e. the building's NW corner. It is better derived from `hoodLandmarkFrame(3,0).toWorld(BA1, BB0)` so it can never drift.
- **The front door is at a = 685 on the south wall (b = 720).** With walls 30 thick, the floor is a 30..1340, b 30..690 (1310 × 660).
- **A floor plan that fits** [proposal]:
  - **Central hall / lobby:** a 560..810 from the door to the back wall. This is the 80+ lane (W3), a desk off to one side.
  - **West gallery: EGYPT**, a 30..560 × b 30..690 (530 × 660). Inside it:
    - a sarcophagus on a plinth in the middle;
    - two seated statues against the back (far) wall, which is full height so they can be tall;
    - glass cases of jars and amulets facing away from the walls (W12);
    - a hieroglyph frieze on the far west wall;
    - an obelisk in a corner.
  - **East gallery: DINOSAUR**, a 810..1340 × b 30..690 (530 × 660). A skeleton about 480 long on a low platform runs a 840..1310, its skull toward the door. The height budget is about 330 world (under the 660 walls; the near walls are cut to the dado, so it shows). Add a rope barrier and a fossil-wall case on the far east wall.
  - **Partitions:** low arches or partial walls at a 560 and 810, each with a 120+ interior door (W6: one shared piece each).
  - **Portico apron:** b 720..810 (`pk.out` ≈ 100) as the outside step, with `door.keep` so there is no clamp jump.

### 4.3 Steps to make it walk-in
1. **Plan constant** `MUS_IN` (rooms, doors, the H 660 walls, the dado ~80, the shell list), next to `TIDEWATER_MUSEUM`. It is read by the interior LIB entry, the exterior and the pocket (W4).
2. **Exterior entry** (L64163):
   - Mark the building item **`shell: true`**.
   - Split the colonnade, banners and steps into their own `shell:true` item at the portico (they stand over the apron and must fade too). Optionally split the building into four elevations as pieces; one shell piece is fine, as the ballroom does.
   - **Re-space the colonnade:** an even count with the middle bay on DMID, widened to ≥ 200 clear. Say NCOL 8 with a wide centre intercolumniation, or 10 with columns off-axis.
   - Replace `doorF` with a real doorway about 160 wide (the ballroom's door is 160) and glass doors, drawn as the shell's opening. The interior's south wall has the same gap.
3. **vol:**
   - **Open a lane through the portico solid**: split 'portico' into two blocks either side of [DMID−100, DMID+100].
   - Make the steps a ramp, or a walk/`opens` zone (the steps are a kerb today).
   - Move `marks.door` to the façade `[1565, −1480]`, or keep it at the portico with an apron.
   - [U] Whether `opens` is needed or splitting the solid is enough. Splitting is enough for `volBlockedAt`.
4. **Interior LIB entry `'Tidewater Maritime Museum Interior'`:**
   - `place:'pocket', zs:1, mirror:false, ww 1370, dd 720`;
   - ground = the floor (stone or marble), wall to wall, with a threshold at the door (W13);
   - far walls (north and west) full height with their inside faces; near walls (south and east) at the dado (80) (the ballroom/trophies pattern);
   - every standing thing a piece `{a, b, z, solids, draw}`, ending in `depthSort(items)`;
   - `frontOf/backOf` for cases against walls;
   - optionally live staff (`it.live`) or visitors.
5. **POCKETS.push** (top level, beside the trophies push):
   `{ name, from: 'Tidewater Maritime Museum', x0, y0, w: 1370, d: 720, out: 100, h: 660, view: museumInView, hides: 'Tidewater Maritime Museum', night: [...], doors: [{ id:'front', mark:'door' (or world()), side:'s', at: 685, half: 80, seamless: true, glass: 45, clear: 44, keep: true, spawn: [685, 600], yaw: −π/2 }] }`.
   Optionally add a `POCKET_GATES` entry; with none, the door is open.
6. **Nothing else is needed in `queueParkBlock`.** `pocketHiding('Tidewater Maritime Museum')` → the shell fades or skips, and builtHeightAt ignores its vol while he is inside (L75772).
7. **Optional, W11:** windows showing the live interior. This means a `queueHospThrough`-style pass under the building piece, which needs the shell to have holes behind its windows.
8. **Pre-flight:** a screenshot at the door from outside, a crossing clip (MP4), the inside at day and at night, a perf check if asked.

---

## 5. EVERY LANDMARK-TYPE BUILD

Sizes are world units. A "cell" is 3128 node to node, with 1656 buildable. **Full lot** means the whole buildable square (1656²) of a cell or block. **Half lot / rim** means a 940-deep rim lot.

| # | Name | Pipeline / placement (line) | Footprint | Enterable building? | Interior today | Effort |
|---|---|---|---|---|---|---|
| 1 | Tidewater Maritime Museum | hl [3,0] e2 (L19632; LIB L64163) | full lot (cell); bldg 1370×720 | yes | no | **M** (colonnade/door rework, new interior) |
| 2 | Seabreeze Ballroom | hl [8,0] e2 (L19640; L64374) | full lot, hall 1656² | yes | **yes** (pocket + basement, seamless) | done |
| 3 | Ferris Taylor Cottages | hl [8,3] e2 (L64819) | full lot; court driven | almshouses: one cottage could be | no | M |
| 4 | Costa Palma Animal Shelter | hl [2,2] e2 (L64713) | full lot, with runs | yes (kennels / reception) | no | M |
| 5 | Marina Parking | hl [0,6] (marinaEntry, L63603) | cell | garage (drive-on decks, `LIFT_SITES`) | n/a | – |
| 6 | Crate Yard Building Site | hl [8,10] e2 (L66704) | full lot | no (open site, steel frame) | no | – |
| 7 | Lagoon Market Hall | hl [3,8] e2 inset 736 (L63605, sc 0.6923) | full lot; nave 460 wide | yes (a nave + stalls) | no | M |
| 8 | Cove Grove North Tower / Plaza / West Tower | hl, 3 cells (L19650–19652, COVE L27643) | cells | towers: lobby only plausible | no | L |
| 9 | Marina General Parking / Hospital / Tower / ER | hl, 4 cells (L19654–19657) | site 11040 long | yes | **yes** (8 floors) | done |
| 10 | Sun Deck Airfield (+Terminal, Cargo, East, Fire Station, Hangars, South Apron, Fuel Farm) | hl, 8 cells (L19659–19668) | cells | Terminal, Fire Station, Hangars yes; the rest are aprons | no | M each (Terminal L) |
| 11 | Driftwood Chapel | hi [2,3] e2 (L17302; L55438) | full lot 1656² | yes | no | M (hi has no pocket-shell path: +S to add it) |
| 12 | Lagoon Baths | hi [0,2] e2 (L17303; L56644) | full lot 1656² | yes | no | M+ |
| 13 | Palmline Nursery | hi [1,3] e2 (L17304; L57282) | full lot 1656² | partly (greenhouse) | no | M |
| 14 | Saltwater Brewing | hi [5,2] e2 (L17305; L59342) | full lot 1656² | yes (taproom) | no | M |
| 15 | Dune Home & Garden | hi [0,5] e2 (L17306; L61415) | full lot 1656² | yes (store) | no (its mall branch is the mall's anchor room) | M |
| 16 | Pelican Drug | hi [6,4] e2 (L17307; L61781) | full lot 1656² | yes (store) | no | M |
| 17 | Seabreeze Trophies | hs [1,4] e2 (L17347; L72330) | shop 760×600 | yes | **yes** (pocket, auto door, no fade) | **S** (§3) |
| 18 | Maritime Mall | rim (L25801; L65446), 3 lots | 9384 × MALL_DEP | yes | **yes** | done (model debt) |
| 19 | Maritime Mall Parking | rim (L25805; L66006) | 3128 × 940 (half/rim lot) | garage | n/a | – |
| 20 | Tide Pool Elementary | rim (L25795; L65142, pieces) | 9384 × 940 (rim) | yes (school) | no | L (its body is `occ`-keyed at the origin; needs the hl-style rework first) |
| 21 | Palmline Tower | rim (L25812; L66346) | 2392 × 940 (rim) | ground-floor shops | no | L (whole image, no items, no vol) |
| 22 | Undertaker (Gantry Cemetery) | park landmark (L40222; L45465) | 4×5 cells | chapel/office only | no | L |
| 23 | School (Driftwood Elementary) | park landmark (L40224; L45870) | 3×2 cells | yes | no | L |
| 24 | Tidewater Green Park (derby) | park landmark (L40229; L72355) | 1×2 cells | no (park) | no | – |
| 25 | Pelican Harbor | harbour pipeline (L66559) | 3400 × 2400 | harbour building | no | L [U pipeline details] |
| 26 | Charge depot | corner shop, walk-in by planes (buildings.md 1.9) | corner lot | already walk-in (no pocket) | partial | – |

Effort key:
- **S:** door/shell flags on an existing pocket.
- **M:** a new pocket + interior entry on an hl/hi landmark with simple geometry.
- **L:** the exterior must first be re-cut into pieces (rim, park or tower), or there are multiple floors.

`hi` landmarks (#11–16) also need the shell-fade hook added to the `hi` path (L85506–85535): one `pocketHiding(lib)` + `_bcAlpha` or skip, mirroring L86273–86283. That is about S once, then free for all six.

---

## 6. THE RECIPE, AND A SMALL SHARED "WALK-IN KIT"

### 6.1 What a new walk-in must provide today (the minimum, the ballroom/hospital path)
1. **A plan constant:** frame size W, D, H; doors (side, at, half); the dado height; rooms. It is read by all three of draw, vol and pocket.
2. **The exterior** as an **hl** landmark (or hi/hs, once those get the hook). Its items over the interior carry **`shell: true`** (and `cutTop` for multi-floor), and the doorway is a real opening in the art and in `vol` (solids split, `marks.door`).
3. **An interior LIB entry**, `place:'pocket', zs:1, mirror:false`, with:
   - a frame a east, b south;
   - ground = the floor;
   - items with `solids` (`fl`/`lvl` for floors);
   - far walls full height and near walls at the dado;
   - `depthSort(items)`.
4. **A `POCKETS.push` row:**
   - `name, from, x0, y0` (a free square), `w, d, out, h`;
   - `view()`: one offset, derived from the exterior frame;
   - `hides` (every landmark cell holding a shell piece);
   - `night`;
   - `doors[{ id, side, at, half, seamless: true, glass, clear, keep: true, spawn, yaw, world() | mark:'door', out?() }]`;
   - for multi-floor, `z()` and `cut()`.
5. **Optional:** a `POCKET_GATES[from|id]`; live people drawn at `+POCKET_VIEW.dx/dy`; a through-glass queue.

### 6.2 Name-specific code to fold into the kit (found in generic paths) [V]
- **`pocketHandOff`:** branches on `'Maritime Mall Interior'` and `HOSP_IN` (L20004, 20007, 20029–20032).
- **`pocketDoorStep` fade:** the same two names (L19899–19900).
- **`drawWorld`:** the mall's view (L81006–81015).
- **`queueFramePieces`:** `isMall`, `HOSP_IN.name` (L78415–78417).
- **`solidAt`:** global `HOSP_IN.floor` / `MALL_LVL` (L8086).
- **`owLiftZ`:** `hospInsideNow` (L29573).
- **The duplicated ease:** `mallShellK` vs `pocketShellK`.
- **The duplicated views:** `ballroomInShift`, `hospInView`, `trophyInShift`, `mallInShift`.

### 6.3 The proposed kit (`WALKIN`): small functions extracted from the hospital and mall code

| Function | What it does | Replaces / generalizes |
|---|---|---|
| `walkinDefine(spec)` | **One call per building.** It takes `{name, from, plan, origin:{x0,y0}, anchor(), hides, doors, night?, floors?, gate?}`, validates the plan (the door lane ≥ 80, solids = drawn), pushes the `POCKETS` row, and registers the gate. | the hand-written `POCKETS.push` rows |
| `walkinView(pk)` | Cached `{dx, dy}` = `pk.anchor()` (the world point of plan (0,0), from `hoodLandmarkFrame`, `hoodRimFrame` or `shopDoorsOf`) minus `(x0, y0)`. Null until the grid exists. | `ballroomInShift`, `hospInView`, `trophyInShift`, `mallInShift` |
| `walkinDoor(pk, d)` | Builds a seamless door: `world()` from the plan + anchor, `out(a, b)` from side/at/half, `glass`/`clear` defaults 45/44, `keep:true` (the apron is `pk.out`), spawn and yaw from the side. Takes an `onEnter`/`onExit` hook (floor set, leaves open), so `pocketHandOff` loses its name checks. | the door literals and the name branches in `pocketHandOff` |
| `walkinShellK(scene, pk)` | The one shell ease (450 ms smoothstep), 0 inside and 1 outside. | merges `pocketShellK` and `mallShellK` |
| `walkinShellDraw(scene, lib, it, drawFn)` | The one hook every exterior pipeline (`hl`, `hi`, `hs`, `rim`) calls per piece or unit: `pocketHiding(lib)` → skip, fade (`_bcAlpha`), or cut (`LIB.setCut(pk.cut())`, with the `|cut<z>` key and `cutTop`). | the `hl` code at L86273–86296; the missing `hi`/`hs` paths (L85448, L85506) |
| `walkinLevel(pk)` | The pocket's current floor/level (`pk.level()`), read by `solidAt` (`vF`/`vL`) and the item `when` tests. | the global `HOSP_IN.floor` / `MALL_LVL` in L8086 |
| `walkinWalls(plan)` | Union-outline walls at thickness 20 (`hospWallOutline`): far walls full height, near walls at the dado, door gaps, filled tops. It returns pieces with `solids` and `wseg`. | `hospInPlan` / `hospWallOutline` and the ballroom/trophies hand walls (W6, W7, W9) |
| `walkinNight(pk)` | The lit boxes from the plan rooms + wall heights (with `HOSP_NIGHT_IN`-style near-wall inset), for `pocketNightCut`. | the per-pocket `night` arrays |
| `walkinThrough(vq, pk, coverD)` | The through-glass pass: the interior pieces + people near the glass, each under the depth of the exterior piece that covers it (`coverD(a,b)`, e.g. `hospTileD`), `_seenThrough`. Skipped while the shell is fading. | `queueHospThrough` (the model) and `queueMallThrough` (its origin key replaced) |
| `walkinPeople(vq, pk, list, now)` | Draws pocket-frame people at `+view`, culled by `visProp`, held between walls by `walkinHold`. | the hospital walker loop L82546–82563, trophies L82711, ballroom L82784/82811 |
| `walkinHold(pk, f, a, b, d)` | Generic `hospHold` over the pocket's `wseg` pieces. | `hospHold` (L78387) |

### 6.4 The order to build it (lowest risk)
1. **Shell hook in `hs` and `hi`:** `walkinShellDraw`. This makes Trophies fade, and it unblocks the six `hi` landmarks.
2. **Trophies:** auto → seamless door with `keep` (§3.2).
3. **Museum:** shell flags, colonnade/door/vol rework, `MUS_IN` plan, interior entry, pocket row via `walkinDefine` (§4.3).
4. **Fold the hospital and ballroom** onto `walkinView`/`walkinDoor`/`walkinLevel` with no visual change. A headless crossing clip at `hosp-in` must show no regressions.
5. **Mall last:** its body image needs the piece split first (buildings.md O1/O11).

### 6.5 Unverified or open items
- **[U] Ordering:** does the world grid build (L8031) run after all `POCKETS.push` calls? The pushes at L27596, 27853 and 34051 are top level, and the grid is built at runtime, so yes in practice. A kit row must also be top level.
- **[U] The museum's portico steps** after the lane is opened: whether the robot can climb a step of 12 lab (≈18 world). Safer to make them a ramp or flat.
- **[U] Stale doc:** LOOK_RULES 8b says x-ray 0.85 in the hospital, but the code gives 0 inside any POCKET_VIEW (L83199).
- **[U]** `pocketHandOff` always crossfades (`viewCrossfade`) except at the mall's anchor doors. That conflicts with W5 ("no fade"). The kit's default should be shell-fade only, as the anchors do, once every pipeline fades its shell.
