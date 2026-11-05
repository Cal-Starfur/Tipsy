# Street props and ground: how they are built today (reader report)

File: /home/user/Tipsy/game/index.html (118,916 lines). All line numbers are from that file at the time of reading.
Read-only survey. Unless marked otherwise, every claim was checked in the code. **[unverified]** marks inference that was not checked.
Census: /tmp/claude-0/-home-user-Tipsy/47112600-655e-54ea-8b69-bb22cbde2d14/scratchpad/state/census_sites.txt (Flats run).

---

## 0. The machinery every prop shares

| Piece | Where | What it does |
|---|---|---|
| Registry | `cityFurnitureForEdge` L34129, cached by `cityFurnitureForEdgeCached` L34829, queried by `cityFurnitureNear` L34883 | Builds each frontage's props once, seeded from the edge (`cityFurnEdgeSeed` L34044). Draw, collision, crowds, seekers and the route harvest all read this list. |
| Lanes | `lateralOf(lane) = (3 - lane + .5)*T2` L34176 | Lane 0 is at the kerb and lane 3 against the building. |
| Keep-clear | `inClear` (corners, `cornerClear` T2*2.5 = 230) L34186; `onRamp` (±(TILE+T2+20) = 158 along, ±(TILE+50) = 96 across) L34225; `onDrive` (drive al0−T2−120 … al1+T2+120, whole footway) L34236; depot door approach (r 150+40) L34243; `blocked` (60 apart in s, within one lane) L34249; `onWalk` = `grid.classify === "sidewalk"` L34259 | There is **no door, mat or crossing-zebra test**: only ramps, drives, corners and the depot. |
| Draw dispatch | `drawProp` L92832: one `if kind ===` chain (lamp L92886, palm L92888, scooter, trash L93138, cone L93285, hydrant L93442, planter L93786, signalpost L94035, bin L94276, slab L94480, sidewalkend L94563, pigeons, grade, crack L94913) | The x-ray hook sits at the top of drawProp (L92855), so every prop gets it. |
| Queue | `queueCityFurniture` L85891 → the block's `vq`, depth `ebx+eby` (foot), `propLayer` (now a no-op that returns g, L85823) | Each prop sorts on its own foot. |
| Cache | `pristine = CF_STILL_KINDS.has(ct) && !eff && !cp.hit && !cp.phi && !cp.slide …` L85952 → `bcDraw(lg, "cf|"+cp.key …)` L85957. `CF_STILL_KINDS = cone, bin, hydrant, planter, trash` (L33962) | The key is stable (block, edge, order). `bcDraw` adds K and the night flag (L77852). |
| Cull | `visProp(kind,x,y)` L75938 against `PROP_EXT` L7299 (pad ×1.25 + 24) | |
| Ground kinds | `GROUND_KINDS_CF` (crack, slab, sidewalkend/begin, grade, burnoutMark) L33963 → `groundVQ` L81199–81330, pinned to `g`, drawn **live** each frame | |
| Collision (A): the rail loop | `OW_LOOP_TYPES` L8686 (lamp, palm, palmDwarf, hydrant, bin, cone, planter, scooter, trash, robot, william, dog, people, pigeons, crack, slab) → the hazard loop L96184. `owSep` L96303 gives dx (along the prop's f axis) and lat. Hit test: `onLaneHz = |lat| < T2*0.5 (46)` L96395, then `hzWithin(R) = |dx| < R` L96505 | A **box** set in the prop's frame. Lamp L96748 is 14 along × 46 across; palm L96764 is 30 × 46; hydrant L96905 is 26 × 46; bin uses BOT_CLEAR 26→16 L97069; the generic case (trash, dwarf palm, people, dog) L97590 is 26 × 46. |
| Collision (B): discs | `OW_HZ_R` L8156 (lamp 22, palm 30, hydrant 26, bin 60, planter 44, bench 30, cone 18, parktree 26, shrub 30, signalpost 16) through `owContact` L8475 (reach = R + 0.72·botR) | Used by the stand-in pass (non-loop types), signal poles (`sgNear` L11034), shop posts, scatter and park "posts" (`PO` L8122–8133), `owSpotClear` L12640 and crowds L101311. |
| Collision (C): harbour | `harborBlocks` L111002 reads `hg.props[].r` (lamp 26, bollard 20, bench **90**) L110707–110791 | Its own discs. |
| Collision (D): pier | `pierFurnitureOf` L111713 → lamps as `owContact` discs and benches as **capsules** (closest point on the axis) L8612–8625 | The best model in the file for a long prop. |
| Collision (E): beach | `duneBlocked` L18711 (rope lines), `nssBlocked` L18467 (garden rocks only) | |

---

## 1. Per prop kind

Ratios use PERSON_H 124 (L13446).

### Lamp (city)
- **Code:** `LAMP` L4785 (height 315, poleW 12, baseW 20, arm 88). Variation from `LAMP_VARY` L4821 (height ×0.92–1.10). Drawn by `drawLampHull` L86307.
- **Size:** 290–347 (2.3–2.8× a person). This matches the approved 315. SP5: girth, reach and height against the signal are documented in the LAMP comment.
- **Placement:** lane 0 only, `armSign` −1, on a citywide phased stride (`LAMP_ACT.spacing*T2*lampInfra*cal.lamp`, about 952) L34470–34499, through every keep-clear. This is the norm.
- **Collision:** loop box 14 along × 46 across (L96748). The art's base is ±10. Along the street the robot centre stops 14 from the pole, so its 26-wide half-body overlaps the pole by about 12. Across the street the trigger reaches 46 out, and then `hzWallStop` moves him **along** the street, not back. This is anisotropic and does not match the art. The disc model (B) says 22. Two models.
- **Cache:** **live every frame.** Lamp is not in `CF_STILL_KINDS`, because the night glow and flicker live inside the same function (L86399–86420, into `gGlow`). This is in the census bucket 85956 "live x1389" (chain `drawLampHull`).
- **Shadow:** none (removed, quoting Sir, L86346). Depth key: the foot.

### Palm / palmDwarf (city)
- **Code:** `PALM` L4657 (165 × scale 1.8), `PALM_DWARF` L4664 (55 × 1.3), `palmSpec` L4696. Drawn at L92888.
- **Size:** palm 297 nominal at 0.85–1.15 (250–341). **But 12% roll ×1.6–2.1 = 475–624, which is 3.8–5× a person** (L4700). `PROP_EXT.palm` up 639 confirms it. Dwarf ≈ 61–82 (0.5–0.66×).
- **Placement:** lane 0, on the lamps' stride offset by half a step, snapped to a tile centre (PALM_WELL), gated by `hood.palms` (L34531–34562). 25% dwarf.
- **Collision:** palm uses a loop box 30 × 46 (trunk ±6.75 at the base). The dwarf is not a wall: it slows him (`speed *= 0.5`, L97599), which is owner-approved behaviour.
- **Cache:** **live**. The fronds sway with t (L92895). This is legitimately animated.
- **Shadow:** none (Sir, 2026-09-29, L92896). The tree well (`drawPalmGround` L89152) is ground, but it is drawn **live in groundVQ every frame** (L81286–81293): two quads plus rings of slots per well.

### Hydrant (city plus outbound corners)
- **Code:** `HYD` L6141 (height 20, baseR 8). Drawn at L93442.
- **Size:** 20 (0.16×). This is the open question for Sir (props.md).
- **Placement:** lane 0, citywide stride `1628*infra*cal.hydrant` L34503–34520, 55% gate, 35% start burst. Outbound corners use a **separate list** `buildOutboundFurniture` L14163 (corner apex, `SIGNAL_APEX`).
- **Orientation:** `hth = rng()*2π` (free rotation, L93469), not squared to the kerb. The bin was squared (L94289); the hydrant was not.
- **Collision:** loop box 26 × 46 against art ±8, so 3× wider than the art in each axis. The disc model says 26 (+21.6 reach). Outbound hydrants only become solid **when on screen**: they are pushed into `_owFurn` inside the draw loop (L81577) and read at L11119. The comment at L11114 says the list is empty, which is wrong.
- **Cache:** city hydrants are cached when pristine. Outbound hydrants are **live** in hazVQ (L81578). A burst flood is live in groundVQ, which is correct because the water animates.
- **Shadow:** **yes**, `fillEllipse` at L93488–93489. This breaches SP6.

### Bin
- **Code:** `BIN` L6063 (height 68, baseR 22, lidR 26; scale 2 for details). Drawn at L94276.
- **Size:** 68 (0.55×). Approved.
- **Placement:** the dice placements are thrown away (L34393). One bin per chosen corner: lane 0, just past `cornerClear+TILE`, stepping by T2 until clear (L34728–34748). This is a good norm.
- **Collision:** loop BOT_CLEAR 26→16 along × 46 across (L97069). The disc model says **60** (L7825; doubled with the art per L6061). 60 + 21.6 reach puts the robot centre 81.6 out against a 26 lid, so the disc model (spot-clear, crowds) keeps people about 30 off the bin.
- **Cache:** cached when pristine. Bins always spawn upright (L37451).
- **Shadow:** **yes**, L94340–94343 (`B.shadow`, 0.14). This breaches SP6.

### Planter (city)
- **Code:** `PLANTER` L6219, `PLANTER_VARIANTS` L6230, `PLANTER_BASE` L6237. Drawn at L93786.
- **Size:** for a hazard planter, `scale` 1.5–2.9 (L37465) gives box height 21–41 plus bush 30–58, about 50–100 (0.4–0.8×).
- **Placement:** from the clutter dice. Lanes 1 and 2 are moved to lane 0 or 3 (L34413–34421, Sir 2026-10-08). Lane 3 is the storefront row, and the placer has no door test, so **a planter can stand on a doorstep**.
- **Collision:** a planter-specific loop `planterSpanS` (L97374) **[thresholds not read in detail]**. The disc model says 44 fixed, against a footprint half-width of 16–32 that varies with scale.
- **Cache:** cached when pristine. But **25% spawn pre-knocked** (`phi = phiRest`, L37468). `!cp.phi` then fails, so those draw **live forever** although they never move.
- **Shadow:** body shadow removed (L93851). Spilled leaves have one, which is fine because they move.

### Cone
- **Code:** `CONE` L4862 (height 38, base 18). Drawn at L93285.
- **Size:** 38 (0.31×). This is the open question for Sir.
- **Placement:** from the clutter dice on **any lane 0–3** (`lane = floor(R()*4)`, L34385). This breaks SP2/4b ("lanes 1–2 a clear walk").
- **Collision:** its own tip integrator (L96977). The disc model says 18.
- **Cache:** **40% spawn pre-knocked** (L37431). They are never pristine, so they draw live forever (same flaw as the planter).
- **Shadow:** none (L93342).

### Scooter, trash, robot, people, dog, william, pigeons (clutter and creatures)
- **Placement:** the clutter dice put them on any lane. Parked robots go on lane 3 (L34640), and pigeons on lanes 1–2 (L34665).
- **Scooter:** not in `CF_STILL_KINDS`, so it is **always live**, even though 50% lie still on the ground (L37485).
- **Trash:** cached. But it draws **static shadow ellipses** for every litter item (L93278–93281), a breach of SP6.
- **Creatures:** they move, so live is correct.

### Signal post and head
- **Code:** `SIGNAL` L14036 (poleH 330). Branch at L94035. Queued at L81542–81572 into **hazVQ** (post and head in one entry, depth = pole foot).
- **Size:** 330 plus head (2.66×). Approved.
- **Placement:** one per real approach (`buildSignals` **[function name unverified]**). SP10 is met.
- **Collision:** a pole disc of 16 through `sgNear` (L11034). The head and arm are not solid. This matches the art and the rule.
- **Cache:** **live every frame**: census 81570, live ×413 quads. The pole and mast never move, and the head lamps change state only every few seconds (`signalPhaseAt`).
- **Shadow:** none seen.

### Benches: four drawers, three collision models
| Drawer | Line | Size | Used by | Collision | Cache |
|---|---|---|---|---|---|
| `drawBenchProp` (`BENCH_ART` L13701: w 161, seat 43 = 0.35×) | L84019 | approved | commercial plaza scatter L84967, Vet park L85190 | **disc 30** at the centre (`PO`/`OW_HZ_R.bench`). The bench is 161 long, so both ends can be driven through | cached (`scat|`, `pp|`) |
| `drawPierBench` (`RH_D` bench 300×0.62 = 186 long, seat 46, back 104) | L111397 | close | pier L80763, harbour L78572 | pier: **capsule** (L8619, good). Harbour: **disc 90** (L110712/110791), which is solid 90 across the 73-deep bench | **live** (census 80763 ×10) |
| LIB landmark bench (124 long), written twice | L64672 and L65216 (copy-paste) | own | two landmarks | landmark `vol` **[unverified]** | cached with the landmark |

The commercial scatter benches get no `dv`. `scatterBlockProp` defaults `dv = DIRV[0]` (L84146), and L84972/84973 never pass it, so **every plaza bench faces the same way**.

### Commercial plaza scatter (`commercialScatterOf` L19161)
- A list outside the registry (SP1). Positions are random anywhere in the block (`roll`, L19181), avoiding only the depot and whole-block shops.
- The planters are the **decoration planter**: no `data`, so the scale is 0.85–1.35 (L93799). That is about half the size of the city planter (1.5–2.9). Same kind, two sizes.
- Collision is `PO` discs (planter 44, bench 30) (L8127). Cached as `scat|`.
- Census 84972 shows live ×122. That is the x-ray path, because plaza interiors sit behind buildings (L84972).

### Vet Memorial Park (`vetTrailOf` L17591, drawn by `queueParkTrail` L85109)
- Kinds: shrub, bed, tree, bench, palm.
- Tree trunk height is 140h with the crown to about 256h. h is 0.8–1.25, so the tree is 2.1–2.7×.
- Trees, shrubs, beds and benches are cached (`pp|`, L85195). Palms go through drawProp **live**.
- **Shrubs draw a ground shadow** (`shadow(r)`, L85163–85166), a breach of SP6. Trees had theirs removed ("lose the shadows under the trees", L85178).
- **The bed is flat** (stone edging at z 0.8, mulch at z 1, flowers at 8–16) but it is queued in the **body** vq at its centre depth (L85162). A body standing on its far half sorts first and gets painted over.
- Collision: `posts` discs (parktree 26, shrub 30, bench 30) (L17768–17770). Beds have none, which is correct.

### Ferris Taylor monument plaza
- A flat ground ring (L85209–85215) queued in the body vq at `x+y−2R` and drawn **live** every frame (census 85212 live ×1). It is neither in the ground cache nor in bcDraw.

### Pier and harbour (`RH_D` L111173, `queueHarbor` L78465)
- **Pier lamp** (`drawPierLamp` L111589): **430 high (3.47×)**, against the street lamp's 315. Base half-width 30. **Draws a shadow** (L111633–111634). Collision disc 22 on the pier (L8616: `owContact` 'lamp', smaller than the 30 base) and 26 in the harbour. Drawn **live** (census 80759 ×20 and 78568 ×5) under only a coarse area guard (L80712), with no `visProp` per item. Its glow is static (`lampGlow`), so the whole lamp could be cached.
- **Pier rail** (`drawPierRail` L111558): 118 high (0.95×), chunked by post spacing for depth (L80735). **Live** (80747 ×70). Collision is the deck edge in `owShoreCollide`, which matches the art.
- **Harbour dock piles** (`post` L78475): **live** (78562 ×78). **Bollards:** live (78570 ×12). **Palm in a tub:** live (78590 ×5), and its tub is two live `post`s.
- **Flag, anchor, sign, kiosk, trailer, rack, cypress:** cached (`hb|`). This is the norm inside the same function.
- **Seagulls:** live, which is correct because they animate.

### Beach props
- **Dune rope posts** (`drawDuneRope` L78312): 58 high (0.47×), half-width 5. Cached (`dr|`). Collision is the rope line (`duneBlocked` L18717). Good.
- **Dune path decks** (`dp|`): flat, cached, but in the body vq at depth −1e6 (L78254), not the ground pass.
- **NSS strand gardens** (`nsg|`, L78165–78175): ground cached at depth −1e6. Items are cached per cell. The garden list builds `doors` (L18398) and keeps walks to them, so **it is the only placer that knows doors** (an exemplar). Rocks are solid; the grasses can be driven through (Sir, 2026-10-25, L18469).
- **Lifeguard tower and ramp:** cached; the flag is live and waves (`lg|`). Good split.

### Alley gates (`agate|`, L84677)
- Cached when shut or open (states 0 and 1); live while moving **[inferred from the `ot === 0 || ot === 1` guard]**.

### Landmark-local trees, palms and bollards (SP12)
- Every landmark draws its own copy: `tree` at L45553, 56107, 56823, 60926, 61352, 63695 (and 24167); `palm` at L65161 (with an `fpLab` footprint z1 300); `bollard` at L65224.
- They are cached with their landmark. Their size and collision come from each landmark's `vol` **[not audited per entry]**.

---

## 2. Ground systems

| System | Code | Pass / cache | Notes |
|---|---|---|---|
| Ground cache | `GROUND_CACHE` L7070, `groundCacheFrame` L77324, `groundCachePaint` L77382 (runs `drawGroundPass` into 1024² tiles) | cached; rebuilt on a change of K, date or palette | The norm for flat ground. |
| Ground pass | `drawGroundPass` L79219–80284 | inside the cache | Order: coast bands → harbour, Sierra → paving lattice (`paveParity`, GRASS beyond the walk L79576) → road → curb ramps (`drawProp "sidewalkend"`, L79738–79740, *before* the stone) → drive aprons (L79747–79797) → gutter → kerb (`kerbRun`, `KERB_STONE` L7209) → corner arcs → `drawSierraRound`/`drawHarborRound` → `fillBlockGround` per block (L85666) → `fillParkTrail` → `fillExteriorLot`. This is G10 order. |
| Block ground | `fillBlockGround` L85666: park → GRASS (with corner fills L85712–85725); commercial → GRASS or PLAZA from `hoodBlockGroundOf`; housing → GRASS | cached | `GRASS` and `PLAZA` at L13708–13709. No secondary grass here. |
| Kerb stone, three copies | (1) `kerbRun` in the ground pass (L79855–79880, reads `KERB_STONE`); (2) `drawKerbRound` L76991 **hard-codes** KH 8, KW 22 and the same three colours (L76998) for the Sierra roundabout and the harbour circle; (3) `drawKerbStoneOver` L85771 repaints the stone **inside each kerb car's cached image** (`kerb|` ×642 in the census) | 1 and 2 cached in the ground cache, 3 in bcDraw | ground.md flaws 1 and 3. |
| Roundabout island | `drawKerbRound` L76999, L77169–77171: `LAWN 0x9fbd6a` / `LAWN2 0x97b563` | cached | **A second, lighter green** than GRASS (0x5a9c52/0x519246). Breaks G9 (one grass checker), and is arguably secondary grass on a raised island. |
| Curb ramps | `buildWorldCurbRamps` L14179, `WORLD_RAMP` L14000, drawn as `sidewalkend` L94563 | ground cache | **Three ramp boxes:** drawn pad ±46 with flares to ±138; `owAtRampMouth` L10491 is a square ±92 × ±92 regardless of heading; the furniture exclusion is 158 × 96 (L34224). None reads the ramp record (G7, ground.md flaw 2). |
| Drive aprons | `hoodDrivewaysOf` L19319, painted at L79747 | ground cache | Collision mouth at L10503 (`|lat − SW| ≤ T2`, al0..al1, which matches the paint). The furniture exclusion pads al ± (T2+120) (L34238). |
| Route flats and cf flats (crack, slab, grade, sidewalkend on the route) | groundVQ L81199–81330 | **live every frame**, pinned to g | Still, but live. Possible reasons: `owCorridorHas`/`cfTaken` change per course and route, and the ground-cache key does not include them. |
| Palm tree wells | `drawPalmGround` L89152 | **live in groundVQ** | Per well: frame, plate and rings of radial slots. |
| Hydrant flood | `queueHydrantFlood` L75905 | live (animated) | Correct. |
| Landmark ground (`LIB.ground`) | cached as `hl|…|ground` L85485 and `pl|…|ground` | cached | The norm. |
| **Hood-shop LIB ground** | L84762 `vq.push({depth: far, fn: g => LIB.ground(lib, g, …)})` | **live** (census 84762 live ×6) | Same call as L85485 but without bcDraw. |
| NSS garden ground and dune paths | L78169, L78254 | bcDraw at depth −1e6 in the body vq | Cached, but outside the ground pass (G10 workaround). |
| Vet park chips | `fillParkTrail` L85052 in the ground pass | cached | Correct. The beds next to them are not (above). |
| Ferris plaza | L85209 | **live**, body vq | Should be ground. |

**Secondary grass:** the kit's `houseLawn` is empty (L42267), and every landmark comment shows lawns removed (NO LAWNS notes at L44355, 45304, 54866, 56081, 64054, 64507). The only extra green found is the roundabout island (above). The census of LIB entries is the shop checker's job (`tools/review/ground.js`). **[Not re-run here.]**

---

## 3. The norm (what most props do, or what Sir approved)

1. **One registry:** a kind is placed in `cityFurnitureForEdge` with a salted `mulberry32(cityFurnEdgeSeed(e, salt))` stream. The pass is appended at the end so existing keys do not move (L34604).
2. **Street rules:** fixed infrastructure goes on lane 0, on a citywide phased stride (`a0 = (-proj0 % step + step) % step`). Every spot passes `inClear`, `onWalk`, `onPad` (ramp, drive, depot) and `blocked`. Bins go at corners and palms between the lamps. Lanes 1–2 stay clear.
3. **Size:** a constant table per kind, approved in a lab, with heights stated against the person (`LAMP`, `PALM`, `BIN`, `CONE`, `HYD`, `BENCH_ART` in PERSON_H units).
4. **Draw:** one branch in `drawProp`, queued in the block vq at its foot (x+y), culled by `visProp` + `PROP_EXT`.
5. **Still means cached:** `bcDraw(g, "cf|"+key)` while pristine, live once touched or ghosted by the x-ray.
6. **No shadow** on anything static (Sir removed it from palms, lamps, trees, cones and planters).
7. **Collision** from the same record and the same `hazSpotWorld` (SP7). The overhead parts are not solid.
8. **Flat things** in the ground pass, through the ground cache.

---

## 4. Outliers: consequence, fix, risk

| # | Outlier (lines) | Consequence | Fix (reuse) | Risk |
|---|---|---|---|---|
| O1 | **Collision is a rail box, not the art.** Loop types are `|dx|<R` along × `|lat|<46` across (L96395, L96505). Lamp 14 × 46, hydrant 26 × 46, palm 30 × 46 against art radii of 10, 8 and ~7. A second disc model (`OW_HZ_R`) answers spot-clear and crowds with other numbers (bin 60, planter 44). | He clips into poles along the street; side-on he is shunted along the street from 46 away. Crowds and rescues avoid a bin from 80 away. | Add `PROP_FOOT[kind] = {r}` (or a box `{a,b}`) derived from the constants (LAMP.baseW/2, HYD.baseR, binR(0), planter boxW*scale/2). Use it in `hzWithin` (radial: `hypot(dx,lat) < r + botR*0.72`) and in `OW_HZ_R`. `hzWallStop` already takes a standoff. | Medium. It changes feel and tip rates; route oracles gate the rail path (keep `!owSep` byte-identical). |
| O2 | **Static shadows**: hydrant L93488, bin L94340, trash L93280, Vet shrub L85163, pier lamp L111633. | Breaches SP6. Smudges under props. | Delete those fills (as was done for the palm and lamp). | Low. Cached images re-key automatically? No: the `bcDraw` key does not hold content, so a reload is needed (the cache is per session, so this is fine). |
| O3 | **Pre-knocked props never cache**: cones 40% (L37431), planters 25% (L37468), scooters 50% (L37485, and scooter is not in `CF_STILL_KINDS`). `pristine` needs `!cp.phi` (L85952). | Live draws of props that never move (~650 commands each, per the comment at L85947). | `pristine` = untouched since spawn (`!cp.moving && cp.hitT===undefined && !cp.slide…`). Put pose in the key: `"cf|"+key+"|"+(cp.pose||"")`. Add scooter to `CF_STILL_KINDS`. | Low. |
| O4 | **Lamps live every frame** (in the 85956 live bucket) because the glow shares `drawLampHull`. | The largest still-but-live kind on every street. | Split it: hull and day lens through `bcDraw("cf|"+key)` (the key already holds night), and glow and flicker as a small live item into gGlow. That is CLAUDE.md "split moving parts out". Same for the pier lamps (cache whole; the glow is static). | Low–medium: the glow layer order (comment at L86402). |
| O5 | **Signal post and mast live** (81570 ×413) in hazVQ. | Still steel redrawn every frame at every corner on screen. | `bcDraw("sgp|"+x+","+y+"|"+armF)` for the post and arm; the head as `bcDraw("sgh|…|"+state)` keyed on `signalPhaseAt` state, or live. | Low. Keep the single entry, post then head (L81553). |
| O6 | **Pier and harbour props live** (pier lamp, rail, bench, piles, bollards, tub palm: L80747–80763, L78562–78590). | ~200 live items when at the beach. | `bcDraw("pier|rail|k|s")`, `"pier|lamp|i"`, `"hb|post|x,y"`, `"hb|bollard|x,y"`, as the neighbouring `hb|flag` already does. The palm sways, so cache only its tub. | Low. |
| O7 | **Ground drawn live**: groundVQ cracks and slabs (L81308), palm wells (L81292), route flats (L81264), hood-shop `LIB.ground` (L84762), Ferris plaza (L85209). | Live flat paint every frame. | Palm wells, cf cracks and slabs: `bcDraw(g, "pw|x,y")` / `"cfg|"+key` (stable; the corridor skip stays outside the cached fn). LIB.ground: copy L85485's bcDraw wrapper. Ferris plaza: move into `drawGroundPass` (ground cache). | Low. bcDraw interleaves with world layers, so it must keep the `g` handed in (it does). |
| O8 | **Flat things in the body sort**: Vet bed (L85162 depth = centre), Ferris plaza, dune paths and NSS ground at −1e6. | The bed paints over the feet of anyone on its far half. The −1e6 key is a per-site workaround. | Beds and plaza: draw in `fillParkTrail` / the ground pass. Keep −1e6 only where the surface is raised (dune decks, which carry z). | Low. |
| O9 | **No door or mat keep-clear** in `cityFurnitureForEdge` (L34129–34748). Planters go to lane 3, robots park on lane 3, and cones, scooters and people use any lane. | Props on doorsteps and pickup mats (props.md flaw 2). | Add `onDoor(p)` to `onPad`, from the frontage's units (the same source `nssGardensOf` uses for `doors`, L18398; shop units via `hoodShopEdgeUnits`). Clear ±(door half-width + T2) along and lanes 2–3 across. Run the rolls anyway, as the bin pass does, so keys do not move. | Medium. It must not renumber keys (`cfTaken` relies on them). |
| O10 | **Cones (and scooters, trash) on lanes 1–2** (L34385). | Breaks "lanes 1–2 clear walk" (4b). | Route a cone onto lane 0 or 3 with the same edge-lane fold planters use (L34413). | Low. Keeps the stream. |
| O11 | **Commercial plaza scatter outside the registry** (`commercialScatterOf` L19161): random spots, every bench faces `DIRV[0]` (L84146/84972), decoration planter at 0.85–1.35 against city 1.5–2.9, disc collision. | Wrong-facing benches; two planter sizes; a third collision path. | Seed `dv` from the nearer block edge (as `queueParkBlock`'s dead code did, L85652); pass a `data:{scale,variantIdx}` drawn from the same `propSpawnState("planter")`; bench collision as a capsule (pier pattern, L8619). | Low. |
| O12 | **Bench collision is a disc** of 30 (plaza, Vet) and **90** (harbour, L110712/110791) against a 161–186 long bench. | Ends you can drive through, or a solid halo. | The capsule from the pier (closest point on the bench axis, then `owContact`). Store `dv` on the record. | Low. |
| O13 | **Outbound-corner hydrants solid only when visible** (`_owFurn` filled in the draw loop L81577, read at L11119; the comment at L11114 is stale). Not in the registry; drawn live. | Collision depends on the camera. | Add `grid.outFurn` to `W.hzNear` / the PO bucket at build time (the L8122 pattern); cache the draw as `bcDraw("of|x,y")`. | Low. |
| O14 | **Hydrant free rotation** `hth = rng()*2π` (L93469). | Nozzles aimed anywhere, unlike bins squared to the kerb (L94289). | A seeded quarter turn plus slop, as for the bin. Keep the rng draw count. | Low. A burst hydrant's spray direction comes from hth: check `forceVisible`. |
| O15 | **Tall palm roll 1.6–2.1×** gives 475–624 (3.8–5× a person) (L4700). | Palms twice the lamp; `PROP_EXT` 639 costs culling. | Ask Sir: cap at ~1.3× (390), or keep. | Taste. |
| O16 | **Pier lamp 430, base half 30, and it draws a shadow** against the street lamp's 315. Collision 22 on the pier (under the art), 26 in the harbour. | Two lamp families; bump inside the base. | Either declare the pier lamp a separate approved kind with `OW_HZ_R` ≥ 30, or draw it with `drawLampHull` with options (SP12). | Taste (ask Sir). |
| O17 | **Several drawers per object:** benches ×4 (L84019, L111397, L64672, L65216 duplicate), lamps ×2, trees ×8 (park trail L85177, cypress L78761, landmark trees L45553/56107/56823/60926/61352/63695), and `post()` helpers ×4 (L78475, L78315, pier `col`, LIB `box`). | Drift in size and style; SP12. | Fold into `drawBenchProp(g,x,y,dv,{len,scale})` and `drawLampHull(…,{H,baseW})`; give landmarks a `kit.tree(a,b,h)`. | Medium (visual churn; approval needed). |
| O18 | **Three kerb stones** (`drawKerbRound` hard-codes 8/22 and the colours at L76998; `drawKerbStoneOver` repaints the stone inside each car cache). | A change to `KERB_STONE` misses the roundabouts. Car caches carry ground. | Read `KERB_STONE` in `drawKerbRound`. For kerb cars, draw the car only and let the ground-cache kerb show: needs a depth split of the car vs the stone, which is why it was done this way **[the reason is inferred from the `kerbFront` flag]**. | Low for the first, medium for the second. |
| O19 | **Three ramp boxes** (drawn ±46+flares, `owAtRampMouth` ±92 square L10498, furniture 158×96 L34224). | The opening and the exclusion can disagree with the paint at turned headings. | One `rampFoot(rp)` (pad and flares in the ramp's frame) used by the draw, `owAtRampMouth` and `onRamp`. | Medium (kerb physics). |
| O20 | **Roundabout island green** 0x9fbd6a (L76999, L77169). | A second grass tone (G9). | Use `GRASS.a/b` on `paveParity`, or a planted bed (gravel and shrubs) per "no secondary grass". | Taste. |
| O21 | **Dead scatter code** behind `WORLD_SCATTER = false` (L4562): park clusters and benches L85626–85663 and `queueStreetFurniture` menu L85960+. | A trap: turning it on brings back unregistered, unsolid props. | Delete it. | None. |

---

## 5. Recipe: adding a new prop kind or ground surface without polishing

**A new street prop** (e.g. a newspaper box or a bike rack):
1. Add one constant table in world units, with the height stated as a multiple of `PERSON_H` in its comment. The lab-approved numbers go there, and `PROP_EXT.<kind>` is derived from them (left, right, up, down at K=1).
2. Place it **only** in `cityFurnitureForEdge`, as a new block **appended at the end** (L34748) with its own salt: `const R = mulberry32(cityFurnEdgeSeed(e, 0xNEW))`. Choose a lane by rule: 0 for kerb furniture, 3 for frontage seating. Use a citywide phased stride (`a0 = ((-proj0 % step)+step)%step`). Every spot must pass `inClear(aR) || !onWalk(p) || onPad(p) || blocked(aR, lane)` (plus `onDoor` once O9 lands). Store it with `place(kind, aR, lane, p, extra)` and nothing else. The kind then gets draw, cull, collision, the route harvest, keys and the corridor skip for free.
3. Draw it as one `else if(kind === "...")` branch in `drawProp` (L92832). Build it from the local `W(dx,dy,dz)` (the f-frame) with boxes that draw only camera-facing faces (top, plus faces whose world normal has +x/+y; see the signal `box`, L94055). Seed variation from x,y (`mulberry32((x*7919)^(y*104729)^salt)`). **No ground ellipse.** Square it to the kerb (a seeded quarter turn plus a few degrees), never a free 2π.
4. Cache it: add the kind to `CF_STILL_KINDS` (L33962) if it never moves on its own. If part of it animates (a light, a flag), draw that part as a separate small live item and keep the body in `bcDraw`.
5. Collision: add `OW_HZ_R.<kind>` equal to the drawn footprint radius (half the base width, not padded), and leave it out of `OW_LOOP_TYPES` unless it falls or slides. A long prop is a capsule (the pier-bench pattern, L8619). Overhead parts are never solid.
6. Check it: boot headless, take a screenshot beside a standing person (ratio by eye against the declared one), look at the perf panel's bc `live` count while standing still (it must not rise), and drive into it from along the street and from across it (he must stop at the drawn surface both ways).

**A new ground surface** (a plaza paving, a planted bed, a court):
1. Never paint grass. Declare `ground:'grass'` and let the block ground show, or use gravel or planting.
2. Draw it **inside `drawGroundPass`** (L79219), in G10 order: after `fillBlockGround`, before the kerb if it meets the kerb. The ground cache then holds it with no extra work. Cull each quad with the pass's `onScreen(pts)`. Use `paveParity` and `d.pave`/`d.paveB` for anything paved, so the lattice and tone match.
3. If it must depend on per-route state (corridor, taken), draw it from groundVQ through `bcDraw(g, "<prefix>|"+stableKey)` with the state test outside the cached function. Never draw it live.
4. If it cuts the kerb (a drive, a ramp), take its box from one record (as `hoodDrivewaysOf` does) and use that same record for the paint, `owAtRampMouth`/the drive mouth, and `onPad`.
5. Check it: a screenshot at portrait and landscape (no sky), the seam and lattice continuous across its edge, and `node tools/world_review.js --kit ground`.
