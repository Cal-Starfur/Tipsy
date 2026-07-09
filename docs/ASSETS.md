# TIPSY — Asset Inventory

*Reference doc. Every piece of art in the game, individually named, so it can be
addressed precisely ("make `prop.hydrant` taller", "brighten `robot.eye`").
All art is procedural — drawn in code, zero image files. Update this doc when
assets are added or renamed. Last audited against `game/index.html` v17, 2026-07-07.*

**Naming convention:** `category.asset.part` — use these names in change requests.

---

## 1. ROBOT — "Tipsy" (`drawRobot()` + helpers)

Drawn in model space, projected through yaw → pitch → roll → facing.
Dimensions in the `BODY` / `LID` / `STRIPE` / `WHEEL` / `FLAG` constants.

| Asset name | What it is | Palette keys |
|---|---|---|
| `robot.shadow` | Ground ellipse; never pitches/rolls; spreads during tip-over | `shadow` @ 0.16 alpha |
| `robot.wheel.barrel` | Tire cylinder (5 stacked disc slices per wheel, ×6 wheels) | `wheelDark` |
| `robot.wheel.face` | Outlined outer tire disc | `wheel`, outline `outline` |
| `robot.wheel.hubPlate` | Recessed hub circle on the face | `wheelHubFace` |
| `robot.wheel.hubDot` | Small dot that orbits to show wheel spin | `wheelHub` |
| `robot.skirt` | Dark chassis box closing the wheel gap; solid all 6 faces | tops `0x3f434c`, sides `0x3a3d45`/`0x2e3138`, bottom `belly` |
| `robot.body` | Main cargo box (BODY: 52×40×40) | `bodyTop`, `bodyRight`, `bodyLeft`, outline `outline`, bottom `belly` |
| `robot.stripe` | Red brand band, decal (camera-facing sides only, no top/bottom) | `stripe`, `stripeDk` |
| `robot.lid` | Hinged top box (LID); swings open on `lidAng` when tipped | body colors; underside `lidInner` |
| `robot.cavity.wall` | Insulated liner rim visible when lid opens | `cavityWall` |
| `robot.cavity.floor` | Inset shadowed interior floor | `cavityFloor` |
| `robot.visor` | Dark face panel on the front (+x) face | `visor`, outline |
| `robot.eye` | Two ellipses; blink via height squash | `eye` (cyan) |
| `robot.eye.alert` | Eye color swap when tilt > 0.6 | `eyeAlert` (orange) |
| `robot.eye.dead` | X-shaped strokes when tipped | `eyeAlert` |
| `robot.headlight` | Pale strip low on the front face | `0xfff3b0` |
| `robot.flag.pole` | 6-segment bending polyline; sways driving, sags when tipped | `flagPole` |
| `robot.flag.pennant` | Triangle following the pole tip direction | `flag` |
| `robot.stuckIndicator` | Floating bobbing "?!" above the robot while pinned against a palm with throttle held; body jitter + wheel churn + alert eyes ramp with stuck intensity | `#ffb04d` |

### Robot undercarriage (revealed on tip-over)
| Asset name | What it is | Palette keys |
|---|---|---|
| `robot.belly` | Bottom faces of skirt/body | `belly` |

*(Sprite-lab v9 also has `axle` housings ×2 + `battery` pack under the skirt —
present in `labs/sprite-lab.html`, **not yet ported into the game build**.)*

### Spilled cargo (`spillCargo()` / `drawItems()`)
| Asset name | What it is | Colors |
|---|---|---|
| `cargo.burrito` | Outlined tan ellipse | `0xe8b04b` / `0xb5813a` |
| `cargo.burrito.lettuce` | Small green flap on the burrito | `0x7fae4e` |
| `cargo.cup` | White outlined rectangle | `0xf4f5f7` / `0xc9ccd2` |
| `cargo.cup.puddle` | Brown ellipse leaked once the cup rests | `0x8b5a3c` |
| `cargo.fry` | Thin yellow rotated stick, ×3 | `0xf2c94c` |
| `cargo.itemShadow` | Small ground ellipse under each item | `shadow` @ 0.15 |

---

## 2. WORLD (`drawWorld()`)

Palette comes from the route's district (`route.pal`): three palette sets chosen
by neighborhood attributes (hills / rough / default), keys:
`sky, pave, paveB, paveEdge, road, roadLine`.

| Asset name | What it is | Palette keys |
|---|---|---|
| `world.sky` | Full-screen backdrop fill | `sky` |
| `world.tile.sidewalk` | Checkerboard pavement quads, rows −1..1, corner heights from heightmap | `pave` / `paveB`, joints `paveEdge` |
| `world.tile.road` | Asphalt quads, rows 2..4 | `road` |
| `world.road.dash` | Center-line dashes on row 3, every other tile | `roadLine` |
| `world.curb` | Raised lip strip between sidewalk and road | `paveEdge` |
| `world.door` | Brown door slab at the address | `0x5a3d2b` |
| `world.door.knob` | Gold dot | `0xd8b23a` |
| `world.mat` | Red delivery mat quad (the win zone) | `0xc2452e` |
| `world.addressLabel` | Floating bobbing text over the door (Phaser Text) | `#2e3138` |

---

## 3. HAZARDS & PROPS (`drawProp(kind)`)

Each is addressable as `prop.<kind>`. Hazard behavior (severity, blocking) lives
in the sim loop, not here — this is the art only.

| Asset name | Parts | Colors |
|---|---|---|
| `prop.palm` | Tall Costa Palma palm (PALM preset: h165 · f8 · droop 1.0). Parts: `trunk` (curved tapered segments + ring marks), `fronds` (leaflet pairs on drooping spines, front/back greens), `coconuts` (3-cluster in crown), per-tree seeded variety (lean, height, sway phase) | `PALM` const: trunk `0x8a6a48`/`0x6f5439`, fronds `0x4e8f4a`/`0x3f7a3e`, coco `0x6b4f33` |
| `prop.palmDwarf` | Bush-type dwarf palm (PALM_DWARF preset: h55 · f8 · droop 0.3 · wind 0.3). Same renderer as `prop.palm`. Gallery-registered; not yet placed in routes | `PALM_DWARF` const (same palette) |
| `prop.scooter` | Dumped rental (SCOOT preset: stem42 · bar13 · wheel5). ONE rigid standing build; seeded per-scooter: ~80% laid on its side, scatter rotation, rental brand (teal/lime/coral). Parts: `deck` (brand slab + grip tape), `stem` (tapered capsule), `bar` + `grips`, 2 hull-barrel `wheels`, `kickstand` | `SCOOT` + `BRANDS` consts |
| `prop.scooterStanding` | Forced-upright variant of the same build (reference/gallery kind) | same |
| `prop.trash` | Litter cluster (trash lab v1): seeded composition (~85% each bottle/bag, bits always), depth-sorted. Parts: `bottle` (side-lying translucent body, crush dent, label band, neck + blue cap, highlight streak), `bag` (lumpy blob + raised crumple + crease facets + knot), `bits` (paper balls / cans in soda-red or silver / bright wrapper scraps), per-item shadows. Per-instance: spread, bit count, bag/bottle size. Physics unchanged: sev 7 impact + speed ×0.65 drag | `TRASH_ART`: bag `0xe9eaec`, bottle `0xd8eef4`/cap `0x2d7dd2`, cans `0xc2452e`/`0x9aa7b5`, wraps `0xf2c94c`/`0x7fae4e`/`0xff7a1a` |
| `prop.cone` | Traffic cone (CONE preset: h38 · base18 · no band). Parts: `baseSlab` (hull box, orange top), `body` (frustum hull, seeded height variance), `tipCap` | `CONE` const: `0xff7a1a` / `0xd85f0a` |
| `prop.coneTipped` | The same rigid cone resting on its slant side (tip low, base plate on edge). Generator mixes ~40% of cones as pre-knocked | same |
| `prop.hydrant` | Yellow post + dome cap + base ellipse, outlined | `0xd8b23a` / `0xb5933a` |
| `prop.planter` | Concrete box (3 shaded faces) + `shrub` green ellipse | `0x8f8577`/`0x7a7164`/`0x6b6357`, shrub `0x4e8f4a` |
| `prop.dog` | One-eyed sidewalk chihuahua (dog lab v2), size unchanged from prior approval (DOG preset, 0.8 scale). Seeded per spawn: coat (fawn / cream / blk&tan), scar side (closed-lid stroke + scar nick where the missing bug eye was), behavior (~40% sit at a fixed spot, ~60% patrol their spawn tile). Wander is `dogSpotAt(t, seed)` — a pure function, so the sim moves the impact hitbox with the art. Diagonal-pair trot legs; trembles when standing. On robot impact: he RUNS — 2.6s flat-out bolt away from the robot, angled toward the buildings, tail tucked, shock marks at launch, then gone for the rest of the route (`dogFleeAt(t, hz)`, pure function; hit dogs are inert to further impacts) | `DOG` + `DOG_COATS`; eye `0x1c1e24`, glint `0xf4f2ec`, collar `0xd94f3d` |
| `prop.car` | Parked on road: `side`/`front` faces, `roofline` quad, `cabin` window quad, `wheels` ×2 | grays `0x9aa7b5`/`0x8695a5`/`0x76839a`, cabin `0x5b6a7a` |
| `prop.bin` | Green cylinder-ish: post rect + top/bottom ellipses, outlined | `0x3f5147` / `0x2e3d35` |
| `prop.slab` | Heaved sidewalk slab (ramp lab v2): exactly ONE sidewalk tile (92×92), lifted along one side edge, flush at the other. Parts: `topWedge` (cross-sloped panel + seeded hairline cracks), `jointWalls` (exposed concrete at both travel joints + full raised-side wall), `soilGap` (dark opened joint), `root` (seeded ~55%: palm root bulge, the culprit), `chips` (bitten lip). Per-instance: lift 3–8, side ±1, root — carried on the hazard object. LIVE tilt hazard: lip kick on entry + sustained cross-slope (see DESIGN.md) | `SLAB_ART`: top `0xc4bdae`/`0x9d9687`, gap `0x4a4238`, root `0x8a6a48`/`0x6f5439` |
| `prop.crack` | Broken-off piece / spall (crack lab v3): jagged fracture between two seeded tile-boundary points; the cut-off region is a sunken fragment. Parts: `piece` (sunken top + own hairline when big), `fractureWall` (intact slab's exposed broken face), `lip` (ragged top-level stroke), `rubble` (seeded chips), `hairlines` (radiating into intact concrete). Per-instance: len 24–72 (drives impact severity 2–8), jag, branches, drop — corner break-offs and edge bites from the same code. Two palettes by surface; decorative road-row instances are physics-free | `CRACK_ART`: sidewalk `0x5d574c`/`0x453f36`/piece `0xa89f8f`; road `0x2c2e34`/`0x14161a`/piece `0x3a3d44` |

---

## 4. HUD & UI

| Asset name | What it is | Colors |
|---|---|---|
| `hud.progress.track` | Rounded bar across the top | white @ 0.5 |
| `hud.progress.fill` | Distance-to-door fill | `0xff7a1a` |
| `hud.progress.doorMarker` | Red tick at the bar's end | `0xc2452e` |
| `hud.progress.botDot` | Dark dot showing your position | `0x2e3138` |
| `hud.tiltMeter.track` | Semicircle arc | white @ 0.55 |
| `hud.tiltMeter.arc` | Colored danger arc (green → orange → red) | `0x3f7d43` / `0xff7a1a` / `0xc2452e` |
| `hud.tiltMeter.needle` | Line showing current lean | `0x2e3138` |
| `hud.stats` | Timer + cargo % text (Phaser Text) | `#2e3138` |

### DOM overlays (HTML/CSS, not canvas)
| Asset name | What it is |
|---|---|
| `ui.titleOverlay` | Boot screen: TIPSY logo text, `ui.orderCard` (day's route), controls copy, START SHIFT button |
| `ui.failOverlay` | 🤖💥, randomized fail line pair, RETRY ROUTE button |
| `ui.winOverlay` | 🌯✅, `ui.winCard` (time / cargo / payout), RUN IT AGAIN button |
| `ui.panel` | Bottom bar: TODAY / RANDOM DAY route buttons |
| `ui.header` | TIPSY · Costa Palma strapline + `ui.blurb` route line |

---

## 5. Palette master (`SKIN`)

`bodyTop 0xf7f8fa · bodyRight 0xe3e6ea · bodyLeft 0xc9cdd4 · outline 0x30343d ·
stripe 0xc2452e · stripeDk 0xa03824 · wheel 0x24262c · wheelDark 0x1a1c21 ·
wheelHubFace 0x3d424c · wheelHub 0x8a919c · visor 0x22242b · eye 0x7fe3ff ·
eyeAlert 0xffb04d · lidInner 0xb2b7bf · cavityWall 0x9ba1a9 · cavityFloor 0x7b818a ·
belly 0x494e58 · flagPole 0x2e3138 · flag 0xff5722 · shadow 0x000000`

Signature accent (UI + brand): **orange `#ff7a1a`**, danger red `#c2452e`.

---

## Known gaps / wishlist

- `robot.axle` + `robot.battery` exist in sprite-lab v9 but aren't in the game build.
- No building fronts behind the sidewalk yet (upper band of the frame is bare sky).
- `prop.dog` is static; a wandering dog is on the wishlist.
