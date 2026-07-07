# TIPSY — Asset Inventory

*Reference doc. Every piece of art in the game, individually named, so it can be
addressed precisely ("make `prop.hydrant` taller", "brighten `robot.eye`").
All art is procedural — drawn in code, zero image files. Update this doc when
assets are added or renamed. Last audited against `game/index.html` v7, 2026-07-07.*

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
| `prop.palm` | `trunk` (thick swaying line), `fronds` (6 rotating triangles), `coconuts` (brown circle at crown) | trunk `0x8a6a48`, fronds `0x4e8f4a`, coconuts `0x6b4f33` |
| `prop.scooter` | `deck` (teal quad, lying flat), `stem` + `handlebar` (lines), `wheels` (2 dark ellipses) | deck `0x2ec4b6`, stem `0x1f857c`, wheels `0x24262c` |
| `prop.trash` | Two overlapping dark bag ellipses, outlined | `0x3b3f47` / `0x2b2e34` |
| `prop.cone` | `base` quad, `body` triangle, `stripe` white band | `0xd85f0a`, `0xff7a1a`, white |
| `prop.hydrant` | Yellow post + dome cap + base ellipse, outlined | `0xd8b23a` / `0xb5933a` |
| `prop.planter` | Concrete box (3 shaded faces) + `shrub` green ellipse | `0x8f8577`/`0x7a7164`/`0x6b6357`, shrub `0x4e8f4a` |
| `prop.dog` | `body` ellipse, `head` circle, `ear` triangle, `eye` dot, `tail` line | `0xc98d4b`, eye `0x2e3138` |
| `prop.car` | Parked on road: `side`/`front` faces, `roofline` quad, `cabin` window quad, `wheels` ×2 | grays `0x9aa7b5`/`0x8695a5`/`0x76839a`, cabin `0x5b6a7a` |
| `prop.bin` | Green cylinder-ish: post rect + top/bottom ellipses, outlined | `0x3f5147` / `0x2e3d35` |
| `prop.driveway` | `apron` light concrete quad cutting across all lanes + 3 `seam` lines | `0xb5afa2` / `0x968f81` |
| `prop.crack` | Dark jagged polyline on the pavement | `0x5d574c` |

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
- No `?!` stuck indicator in the game build (exists in sprite lab).
