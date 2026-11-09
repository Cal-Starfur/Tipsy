# Tipsy look rules (v2)

How the world must look and be put together, distilled from **2,132 individual drawing corrections**: 2,231 commits and 1,635 of Sir's notes, July–October 2026. The numbers come from the code and from fixes Sir accepted.

- Each section has a contract with its rule IDs, evidence, approved values and kit flaws: `docs/kits/<kit>.md`.
- Each rule's checker runs with `node tools/world_review.js`.
- What "right" looks like is in `tools/review/approved.json`.

**Read this before building anything visible, and run the pre-flight before showing Sir.** When Sir corrects something that isn't here, add a line. When he corrects the same thing twice, it goes into a kit contract and gets a check.

---

## Sir's taste (the target)
- **Real thing first.** Build from a real reference (a real ER, West Elm, Hot Topic, a NYC sidewalk lift, a regulation court). Ask how the real one works: sliding doors, the hatch on the kerb side, benches facing the water.
- **Alive.** Every room, counter, bed and desk has someone at it doing its job. Variety, seeded from position, never clones.
- **Seamless.** No cut, no fade to black, no pop. Shells fade, people walk in, and interiors stand on the street's lines.
- **One family.** Reuse the game's own kits. A lookalike is always rejected.
- **Subtle over busy.** Fewer, wanted things. If something competes with the read or sits on the pavement, remove it; don't move it.
- **Strictly 2D iso.** People are faceless. The UI is minimal: no emoji, no pulse, orange buttons, sized for the iPad.

## 0. Kits: fix the kit, then use it
- Most past polishing was a workaround for a kit flaw, repeated building by building. Never draw a lookalike, and never copy a kit's flaw.
- A rule every caller has to remember is a flaw in the kit. Fix it once, inside the kit. Each contract lists the known flaws.
- **Where things live** (start here; each contract says what is still a flaw):

| Need | Kit (contract) |
|---|---|
| A person | `drawPersonHull` on a roster look, listed in `CITY_PEOPLE` (people.md) |
| Arrive or leave | a door that opens, a car, a lift, or past the edge of the view (people.md, doors.md) |
| Someone who lives here | `householdOf` |
| A door | `shopDoor` / `houseDoorway` / a declared slide or lift door (doors.md) |
| A vehicle or robot | `drawProp` → `vehKit` drawers; `gameCar` in a library entry; `drawBotBody` (vehicles.md) |
| A shopfront or house | the library primitives (shops.md, houses.md) |
| A street prop | the city's registry `cityFurnitureForEdge` (props.md) |
| Ground and streets | the lattice and `KERB_STONE` (ground.md) |
| A landmark, garage or big building | `lmDepth` + `bcDraw` + `parkLandmarkVol`, `LIFT_SITES` (landmarks.md) |
| A walk-in interior | the walk-in kit: `walkinDefine`, `walkinRoom`, `walkinStaff` + `walkinLife`, `openings` + `walkinThrough` (walkin.md, walkin_recipe.md 6) |
| A story mission | the missions kit: a `MISSIONS` record, `missionBusy`, `missionWindowOpen`, `missionComplete`, `missionTipOver`, the meet kit (missions.md) |

## 1. Depth and draw order (depth.md)
- **Ground first, then one sort.**
  - Flat things (mats, pads, decals, floods, crossing ramps, floor cells) go in the ground pass.
  - Everything standing goes into the one world sort (`worldVQ`, which merges `hazVQ`, roofs and landmark pieces), keyed at world `x+y` of where it stands now. A knocked thing is keyed at its laid-down outline.
  - Nothing is drawn first, last, or in a pass of its own.
- **Raised ground is a body.** Terraces, a kerb in front of a car, lift platforms and escalator flights sort as solids.
- **Buildings stay whole.** A house or shop unit is ONE entry, keyed at its footprint centre `min+(W+D)/2`, on one layer. Never slice a building or key it at a corner: the near-corner key drew houses over Tipsey 4,743 times, and slices reshuffled round him.
- **Runs are split** at 150 or less (108–124 for landmark runs he touches; floor cells 300 or less; a low fence 600 or less under `lmDepth`).
  - Each piece is keyed at its own base, and every collidable post is its own entry.
  - Only the run's real ends are capped.
  - Far runs go before the building and near runs after it.
- **An attachment is never split from its mount** (signal head and mast; awning or doors on a tower). It's one entry, mount first. If separate, its key is ≥ its host's.
- **Inside one object, order by projection.** Roof items, grouped stock and furniture go through `depthSort` (screen y + base z), never through a loop's call order.
- **Faces by normal.** Draw a face only when its outward normal faces the eye. Never use a hard-coded `fdir`, a lab frame, or `a+b` in a landmark frame.
- **Moving parts by normal at every pose** (wheels, lid, visor, flag). Never use a z-weighted point or an array order. An attachment shows exactly when its host face shows, and parts that swap order sit flush.
- **Contact interleaves:** far arms, bodies, near arms, heads. At a counter: back parts, the person, front parts.
- **No plates inside a tall body.** A band or ledge round a tower is strips on its seen faces, never a box: a box's top drawn after the tower shows through its walls (the fire yard's drill tower, 2026-11-01).
- **Every body counts.** An order worked out against Tipsey must also hold for people, crew and other robots.

## 2. Sizes, coordinates and the sign of b (shops.md)
- **Real constants:**
  - `PERSON_H` 124.
  - Shop door `SHOP_DOOR_W` × `SHOP_DOOR_H` = 66.24 × 161.92 (lab 107.95; the surround head is at 114.95).
  - House door 92 × 184 at any scale.
  - Main entrances about 1.5–2 people wide (the mall's double door is 104 × 180).
  - A shop storey is `STORE_H` 252 (lab 168); approved one-storey shops are 150–184 lab, and upper floors are 130 or more.
  - Cars `CARC` 225 × 90; bays 120 × 260.
  - Tipsey `botR` 30. Gates are at least 82 clear.
  - Lab z × `ZSCALE` (1.5) = game z.
- **Sign of b first.**
  - Street-seen fixtures (sign, lamp, clock, pipe, emblem) have their whole b-range ≥ 0.
  - Lettering sits on its board's front (approved: board −1, panel −0.5, letters −0.2), never behind the board's back face.
  - Glass goes between its surround's back and the wall face. Goods go behind the glass.
  - "Looks right" can be paint order hiding a wrong sign, so check the numbers.
- **Lay out in screen space** (lab x = a − b): centre and gap by projected span.
  - A recess shifts content by its depth: usable width = opening − 2 × depth.
- **Own lot.**
  - Every piece's a-range stays in 0..WW. Approved signs and hoods overhang the return on screen by as much as 27.
  - A set-back piece below the wall head must not land past the return: a1 − bBack ≤ WW. Otherwise it's "return +N".
  - Full-width bands run 0..WW with bBack 0. The wall-head cornice may run −1..−12.
  - Nothing stands on the footway or projects past the canopy line, and overhead items clear 110 game.
- **Shapes on a face** divide z by `ZSCALE`, so a circle reads h:w ≈ 1.12, not an egg. Curves go through P(); strokes are world tubes.
- **Helpers take the entry's WW**, never the global `W`.

## 3. Faces, seams, attachment, contrast
- The kit picks the seen faces (`box`, `slab`, `prism`, `body`, `houseFace`, `FLANK_RIGHT`). A building on an away edge draws its rear elevation (`back()`), and entrances face the camera.
- **A rear view sets `state.back`** (2026-11-01, the Miami Deco Tower House: front fins, windows and porthole showed through its walls). `LIB.draw` sets it whenever it calls `back()`; anything drawn on one face picks `state.back ? bb : bf`, never a fixed front face.
- **One piece, no seams.**
  - Trace joined shapes as one outline.
  - Bands of one elevation share one face plane.
  - Corner joins either overlap by projection + 2, or butt where an overlap would paint a face across the next run (the corner shelves).
  - Pad cache tiles by 2 px. No white slivers, no sky showing.
- **Contact reads, proximity doesn't.** Rooftop items start at z0 = H, finials sit on the apex, bulbs on the fascia, globes on the collar, and a trunk runs up inside the crown.
- The roof deck takes the body's palette (never trim, never lighter than the wall). Gable ends are wall material.
- Static props cast no shadow. A vehicle's shadow is its footprint, turned with it.
- Contrast: at least ΔE 10 against the backing. Check dark on dark, gold on gold, and teal on blue glass.

## 4. Ground and streets (ground.md)
- **No secondary ground.**
  - No lawn, yard base, lot slab, apron, paving plate or rug. Declare `ground:'grass'`; `houseLawn` stays empty.
  - Landscaping is gravel beds and planting.
  - A site's forecourt, car park or floor is part of the site.
- **The street section:**
  - asphalt to ±`ROAD_HALF` 368;
  - the gutter, `CURB_W` 46;
  - the 8 × 22 `KERB_STONE` with its face on ±ROAD_HALF;
  - then `SIDEWALK_W` 368.
  - The kerb starts 392 from the node (`KERB_ARC_R` 24). No kerb across a junction or a street mouth. Build every new road from the lattice, with the city's stone.
- **Ramps in pairs across every crossing** (`WORLD_RAMP` 460/598), with a zebra between them and the stop line at `STOP_LINE_D` 454. Ramps only go where a real cross street exists. The landing meets the kerb at 0.8, with no apron, and the slopes at a corner abut.
- **Kerb cuts** come from the record they serve, with T2 flares that replace the stone. The seam, paint and gutter run on through.
- **Collision is the drawn kerb:** at ±ROAD_HALF wherever stone is drawn, open at every cut, and never where there's no stone.
- **Drives** cross the whole footway at one width, with a dropped kerb and flares. Cuts are merged, or at least `DRIVE_CLEAR` 244 apart.
- **One T2 paving lattice** on `paveParity`, one sidewalk grey, one grass checker phase.
- **Layer order:** block ground, then roads, drives and ramps, then the kerb, then walls, then bodies. Decals are clipped to their surface.
- **Every region, not just the hood grid.** A survey, a map or a placement table covers every region in `WORLD_REGIONS` (the 12 hoods, the edge districts of The Flats, the mountains and the sea; `node tools/review/regions.js <out>`), never just `HOODS`.
- **The backdrop never shows** (check portrait too). A gap under a street is pavement, and past the last sidewalk is grass. Every edge between land and water has a treatment, and a level change shows a face.

## 4b. Street props (props.md)
- **Use the city's registry.** No route copies, no private scatter. What's drawn is solid, and what's solid is drawn.
- **Lanes:**
  - Lamps go on lane 0 (about 2 per block, arm over the walk). Trees go on lane 0 in a one-tile grate between lamps. Bins go at the corners past the ramp, and hydrants on the corner apex.
  - Planters go on lane 0 or 3. Stations and seating go against the frontage.
  - Lanes 1–2 are a clear walk, and the long axis runs along the kerb.
- **Keep clear** (world space, drawn footprint): ramp pads and flares, drive mouths, doors out to the kerb, rugs and mats, and charging pads (padR + 40).
- **Size as a ratio of PERSON_H 124:**
  - lamp 315;
  - lamp vs signal mast: girth 0.60, reach 0.73, height 0.93;
  - palm 297, bin 68, bench seat 0.35.
  - The hydrant (20) and cone (38) are open questions for Sir.
- Signal heads and arms are overhead, so they aren't solid. Variation is seeded from position. Use one bench, tree and lamp kit.

## 5. Doors, windows, openings (doors.md, shops.md)
- **Every door is a kit door** that opens. A painted door can't open, so whoever uses it pops (the mall's street bays).
- **Set the frontage out from the door.** Use `shopDoor`'s returned span. Piers between openings are 9–13 on approved shops, and at least 4.5 at a return. Never copy a window placed as a fraction of W.
- **Nothing crosses an opening.** No band, panel, sign, rail, plant, mat or parked person over a door or window. An approved hood or fascia touches the door head by 7 at most.
- **Windows come from the window kit** (`reveal` + `glaze`, or `houseWin`). Glass with goods behind it has a tint of .30–.46; an empty or barred pane may be opaque. No flat-panel windows.
- **Doors open live for anyone going through** and shut after. They're never baked into a cache. Automatic doors slide, and lift doors open at each landing.
- **Nobody walks through a shut door.** A walker in a doorway is drawn between the room and the leaf.
- **No flat dark fills for doorways, archways or gateways** (Sir, 2026-11-06, the Ferris Taylor almshouses' carriage arch: "we dont want flat dark fills"). An opening that can be seen into shows a passage: the side wall the camera sees, the vault's underside, the floor, the lit way out at the far end, a lantern hung inside. In the almshouses that is `tunnelView(fc, centre, halfWidth, springing, rise, depth)`; reuse it or its equivalent, never `poly(opening, dark)`. Gate leaves hang inside the opening and are cut to its mouth by hand (the Phaser canvas emulates `clip()` for fills only, so strokes ignore it).
- **An open door shows depth** (a lit tunnel clipped to the opening). A shut solid door hides the room completely; a walk-in's doorway and glazed leaves show its live room (section 8).
- **A walk-in's glazed pair slides and fills its opening to the head** (Sir, 2026-11-05, Seabreeze Trophies: "i can still see two sets of doors"). Leaves stopping short of the shell's hole, or swinging out across the doorway, read as a second door.

## 6. Collision matches the art (landmarks.md)
- **One source.** Art, `vol`, x-ray, classifier, mats, spawn, routes and labs read one plan or entry. Never re-derive.
- **Every lot declares its walkable ground** (`vol.opens`) from its drawing's numbers. An undeclared lot should refuse to load, not become a whole-block solid.
- **Every piece standing to Tipsey's height is solid**, even past the block edge, and that includes anything standing on the footway in front of a shop. Overhead arms, pads and gulls aren't solid. Every gate opens.
- **Declared heights are the drawn heights**, per mass: the podium isn't the tower. A stack clears its roof.
- **There's a Tipsey-width path** from the street to every entrance.

## 6b. Vehicles (vehicles.md)
- Only `vehKit` bodies and `drawBotBody` robots. Size from `CARC`, `PERSON_H` and `BOAT_SC`.
- Collision is the footprint (`vehicleSolid` once it exists; today a box is hand-copied).
- **Nothing overlaps a vehicle.** Moving bodies yield hull to hull. Parked cars are cleared by at least 84. Nothing stops on a person, a zebra, the pavement or a drive mouth.
- Faces and wheels come from normals. Wheels sit flush or in arches. Heading is continuous. Hatches are shut while moving.

- **A base or bay has real room** (Sir, 2026-10-31, the Fleet Station on the plaza: "this spot has a ton of issues"): its own site, never wedged between a plaza's props. No statue, lamp, flag, bench, awning, park or turning circle within its footprint or its pads' take-off margin, a drive in from a street, and nothing tall poking up behind its roof on screen.
- **An open hall's eave is set from what must show under it** (2026-11-01, the fish market: Nell vanished behind her own beds). On screen y = (x + y)/2 - z, so a thing d behind an eave of height ze shows only up to z < ze - d: set the eave so the staff behind the street-side counter show from the street, and let the roof ease off when he is under it.
- **A site behind a tall building stands clear of it on screen** (2026-11-01, the Vista Ridge Security Post behind Maritime Mall's 418-high anchor: its first forecourt was under the anchor's roof): on screen y = (x + y)/2 - z, so ground behind a mass of height h along its back line y0 shows only where y < y0 - h; put every bay and meeting spot at least h + a person (124) past it, and when new ground opens beside an edge that was never seen (the estate's east wall), draw that edge.
- **A story's supplier is near when it makes trips** (2026-11-01, the Surf School: Palmline Surf Co.'s shop was 15.4k of road each way, two trips about 14 minutes; Sir rejected a 14-minute mission): measure the GPS legs before choosing a place, and keep a story with trips to about 5 minutes at a fair pace -- a nearer branch of the same place (its beach stand) before a far shop.
- **Light on a white face goes above the night's tint** (2026-11-01, the Costa Palma letters: their flood wash, added in the world's order under the tint, never showed: white is already as bright as anything under the multiply can be): a floodlit or glowing face draws its wash into `gGlow` (as his eyes' light); only its pool on the ground goes through `glowInWorld`, at the ground's own height (a shelf's, not the street's).
- **Use what the game already has** (Sir, 2026-11-01, the training yard's hand-drawn 1950s pumper: "this is not our fire truck. you need to build but use things that exist if we already have them"): a vehicle, prop, person or sign that the game already draws (the vehicle art's kinds through `gameCar`, the kits, the uniforms) is reused, never redrawn as a one-off look-alike; build new only what doesn't exist.
- **A row of flags reads only across the eye** (2026-11-01, the Veterans Memorial: three poles on an arc round the plaza's north-east stood one behind another on screen, two cloths hidden): set a row of poles (flags, lamps, statues) along a screen line, x + y the same for each (in the north-east or south-west of a plaza that is the radius), and give the middle one the extra height.
- **A base stands in the hood that plays it** (2026-10-31, the Fleet hangar to Sun Deck Airfield: two of the three spots Sir circled were past the Flats' hood line, x or y 28560, where the geofence turns Tipsey and every flyer back): check `hoodCellAt` for the bay, its pads, its gate and its visitor bay before choosing a site.
- **Flyers go over what they meet** (Sir, 2026-10-31: "he doesnt go high enough to clear buildings"): auto clears ordinary shops and houses unasked, UP / DOWN are always on screen in the air with a height bar, a push into anything under the ceiling hops over it, and only a building over the ceiling stops it (with a toast).
- **A sports ground has room to use it** (Sir, 2026-11-05, Driftwood Skate Park: "all the obsiclses need realistic runup area to use them properly"; "get rid of the land scaping and put a fence around"): every obstacle, ramp or court gets open flat in front of each face it is used from (3 to 6 m: 200 to 430 units), its people's lines run through that room, nothing planted inside its fence.

## 7. People (people.md)
- **One body:** every human is `drawPersonHull` on a roster look, faceless. Pass the heading − π/2 (dogs: no turn).
- **Nobody pops, fades or teleports.** People come and go through an open door, a car, a lift, or past the edge of the view. Every move is walked.
- **One person, one look, one home or job.** Everyone is in `CITY_PEOPLE`.
- **Walk at `PEOPLE_WALK_V`** 0.065 (accepted band 0.06–0.075). Legs step from distance walked (about 68 units per cycle), so nobody marches on the spot or slides.
- **Nobody stands in anybody:** body radius 15 + 7, Tipsey 30, and off every solid. Groups walk offset, never stacked. Check the whole path.
- **Turn smoothly, on one clock.** A pose lasts only for its action. Falls are jointed and come from the impact direction.
- **Seated:** hips on the seat. On a far chair they face us; on a near chair their back is to us. **Lying:** near the screen diagonal, the face to the eye.
- **Rooms, tables, beds and counters have their cast.** Nobody stands in a doorway.
- **Every interior opens with its people, unasked** (Sir, 2026-10-30). One member of staff per counter, till, desk or post, in the place's own uniform (a named `*_UNIFORM` on the roster body). Visitors only where the floor has room past the lanes: a hall takes about one visitor per 400,000, a shop one or two shoppers where its aisles are off the door's lane, in a townsfolk look. Staff stand behind their counter or at a post out of the 80 lane, and each post is solid. They're declared with `walkinStaff` and listed in `CITY_PEOPLE` (section 8).
- **People have life** (Sir, 2026-10-30: "as they are now the just stay still"). Nobody stands frozen: staff live at their station (weight shifts, glances, busy hands) and step to its tasks and back; guards walk their gallery and pause to look; visitors go from look point to look point, dwell 4–12 s, point, talk in pairs. All of it walked on the kit's paths at `PEOPLE_WALK_V`, clear of solids, 15 + 7 from each other, yielding to Tipsey and holding him (`walkinStaff` with `life`, `walkinLife` looks: walkin.md W16).
- **No shadow on people** (Sir, 2026-11-01): no disc at the feet, standing, sitting, riding or lying. (Vehicles and the scooter itself keep theirs.)
- **People are built for the zoom** (Sir, 2026-11-01, `PERSON_DRAW`): full detail at view 1 (close-ups, meetings); at view 2 each rounded piece is its silhouette in its shade plus one lit strip (`hullRuns`), hair 8 a ring and 4 rings; at view 3 the same less what is under a pixel (cuffs, knee and elbow hinges, hems, collar, toes, bands, the parting; hair 8 x 3). A new body part goes through `limb` / `prism` / `ringSeg`, or it has no fused level.
- **Nobody off screen is drawn**: a person whose box (feet to crown, what they hold or ride, ±90 across, 190 laid down) is over `PERSON_DRAW.cullM` (70 px) past the edge. The margin is what keeps the pan pop-free; never cull at the edge itself.
- **Hidden people: decided by what is drawn**, never the block model (Sir, 2026-11-01: "too many people are x-rayed"). `personVis` tests 11 points of the body against the opaque shapes of the cached pieces drawn after them, holes (`HOLE`) cut out. Wholly hidden and nobody he needs: not drawn. That covers interiors: a room's people under its roof or behind its walls are not drawn while Tipsey is outside, and still are where its doorway or glass shows them.
- **Talking to Tipsey:** `meetWalk` + `meetTick` (gap 85, turn 450 ms), from their own side, the short way round, with both faces showing.
- **Speech** is `npcSay`, never through a floor.
- **Hats and headwear are painter-ordered pieces** (Sir, 2026-11-07, Gideon's top hat, brim, band and headphones; the people's peaked cap already did this). Three rules, checked at all four headings (`faceB` is the sign: below zero, his back is to the eye):
  1. **A brim, peak or any piece that sticks out past the crown goes down BEFORE the crown whenever it is on the far side** (a brim: always first, the crown stands on it; a peak: first when `faceB < 0`, or by the cap's `peakNearer` depth test). Drawn after, its far half paints over the crown.
  2. **A band, cuff or sleeve on a crown is `noTop: true`.** A prism's lid is always drawn, so a band without one lays a disc across the crown (read as "the base showing through the top").
  2b. **The same rule for anything that wraps something drawn before it** (Sir, 2026-11-07, hat bands, then Gideon's boots drawn over the shin): `prism` and `limb` fill the convex hull of both ends first, which for a sleeve or ring is a flat plane over what it sits on. Such a piece is `{ ring: true }` / `noTop: true` in `prism`, `fill = false` and caps 0 in `limb`. If a lid or disc shows over a neighbour, look for a filled silhouette first.
  2b-check. **`node tools/review/fillcheck.js` finds these** (rule D-FILL; `--set gideon|people|bots`, `--only <prefix>`, `--rev <ref>`): each case is drawn at four headings with and without the hull fill and the two pictures diffed; a blob that survives a 5x5 erosion is a hull painted over something. It exits 1 on any flag not listed in `tools/review/fill_known.json`. Run it after touching `prism`, `limb` or any piece that wraps another. First pass (2026-11-08, 211 cases, 43 flagged, all cleared): the stab vest (`uniform.vest`, `noTop` but not `ring`) laid a disc across the neck of 37 uniforms; Gideon's round pack bands were `noTop` without `ring`; the vehicle tyre's tread (`wheel` in `drawBot`'s kit) is a deliberate filled drum and calls `convexHullKeep`, as a flame or a pouch does. Three bots (courier, patrol, AMR) leave a 5 px sliver along their outline just over the threshold: listed in `fill_known.json`, nothing painted over a neighbour. Second pass (2026-11-09) added `--set props` (27 `drawProp` kinds, vehicles included): bins, hydrants, cones, the scooter's stem and bars, the vehicle kit's `solid` bodies and the vans' roof beacons are built AS their hull, so they call `convexHullKeep`; scooter and drone-lift leave an outline sliver (known). `--set shops` (2026-11-09) draws every shop-library entry alone (230: shops, houses, landmarks; one frame, or up to 3 x 3 tiles at scale >= 0.3 for a big site, so only the middle of the biggest sites is seen) and found nothing: with the hull faked off the pictures do not change at all, the library's prism fill is always under its faces. **`noTop` alone does not stop the hull fill: a band, vest or sleeve needs `ring: true` as well.**
  2c. **Stacks go up, and a covered lid is never drawn** (Sir, 2026-11-07, the jet pack's nozzle under its tank, then the same on every multi-part piece): the eye looks down, so what is higher is nearer. Segments stacked on one another (a nozzle, a tank, a valve; a foot, a column, a cap) are drawn from the BOTTOM up, and every segment that has another standing on it is `noTop: true`: its lid is under the next one. Segments side by side (two tanks) go far one first. Never draw the upper segment first and the lower one after it: the lower one's lid lands across the foot of the one above.
  3. **A piece on the far side of the head (a headphone cup, an ear, an antenna's far half) goes down before the head** (`!sees3(side, 0, 0)`), the near side after. Build the piece as a function of its side, as `phones(sd)` does.
  Check a new hat by rendering it facing the eye, away, and both sides, and look for a lid, a brim over the crown, or a far piece over the head.

## 8. Walk-in buildings (walkin.md)
- **One plan for inside and outside.** Interior faces are the exterior's own drawing, cut to the dado, so doors, glass, piers, signs, footprint and floor heights line up.
- **Seamless crossing.** The interior stands on the street's lines, and the view out is the live city.
- **Shell:** every piece over the interior, in every cell it touches, goes on one hide list and eases as one set (450 ms).
- **Walls:** the outline of the union of the floor rooms, at one thickness (20), with filled tops. A shared wall is one piece, never added or removed per room. Outer walls are full height.
- **Levels:** lower levels are clipped by the upper floor's edge. An opening takes the outline of what passes through it.
- **Glass:** ground-floor glass shows the live interior and its people, in framed panes.
- **Every opening shows the room** (Sir, 2026-10-30: "we should see the interior through the door. it shouldn't be a dark rectangle"). A walk-in's doorway, shopfront glass and windows are holes in its shell (`HOLE`, entry `see`) with the live room drawn under them, clipped by the shell, its people moving; glass is a tint (.30–.46), never a dark or opaque fill. Declare each opening once on the pocket (`openings`); `walkinThrough` does the rest (walkin.md W11).
- **Floors** run wall to wall, with a threshold at every door.
- **Furniture** faces away from its wall, with an 80-wide lane from each door to the back wall, clear of doors and lobbies. A long piece (counter, shelf run, cooler, gondola) is cut into runs of 50 or less, each keyed at its own stretch, so nobody beside it is painted over.
- **People come with the room** (section 7): `walkinStaff(room, [{ role, seed, U, posts }])` beside the pocket, `walkinStaffSolids(items, room)` in the interior entry. The kit draws them on the street's lines and lists them in `CITY_PEOPLE`. Show the room with its people in the photos and the clip.
- **Rooms keep their hours and lock when shut** (Sir, 2026-10-30: "Lock when shut"). Shut, the door is locked: it doesn't open for him, he's held at it and told when it opens (its place card's hours), and through its glass the room is dark and empty. He's never shut in: inside at closing, he's let out.
- **People come and go through the front door** (Sir, 2026-10-30: "lets let them go home and lock the door behind them"). At closing the visitors, then the staff, walk out through the door (it opens for them) and off along the pavement past the view's edge; the last of them turns and locks it. At opening the keyholder walks in from past the view's edge and unlocks it, and the rest follow. While open, visitors arrive and leave over the day, how many are in rising and falling with the hour inside the room's W15 band. Declared once on the pocket (`street`), lived by the kit (walkin.md W17).
- **People behind a walk-in's glass are drawn from the street** (2026-11-01, KTDE's studio: its DJ was never seen through the window). Someone drawn `_seenThrough` skips the hidden-by-what-is-drawn test (the cover test knows the shell, not the hole in it); and set the room so who matters stands within the glass's view, not behind a counter as tall as the sill (check a person's head under the opening's head, looked back along the view).
- **The room is the shell's footprint** (Sir, 2026-11-01, KTDE: "the interior and exterior don't line up"). A walk-in's walls stand on the shell's own lines, wall to wall, and follow its outline (a rounded corner is a curved wall run on the same arc, its floor cut to it); and the landmark's ground never paints under its footprint, or it covers the room's floor while he is in.
- **A worker stands on the working side of what he works at, facing it** (Sir, 2026-11-01, KTDE: "the dj is facing wrong and so are the other two"). The working face (screens, faders, decks, a mic, a till) points at him and his heading points at it; turn that face away from the camera, so we see the equipment's back and the worker faces us. Don't draw the equipment's busy face toward the camera and then stand him behind it: he would be looking at its back. Check with the shell faded, zoomed in on each person.
- **Lifts:** one surround function on every floor and one complete car kit. Cars run on their own, the panel faces the camera, and the shaft below shows. Test every state.

## 8b. X-ray, night and light (xray.md)
- **Never cut buildings away to show him; ghost him.** Ghosts are flat teal (`XRAY.col` 0x8fe3d0), built from the object's own shapes.
- **Tipsey ghosts at 5 of 5 rays** across his width (±34) at head height 60, or 3 of 5 on a mat. Never in the open; off in the garage, cut-away rooms and behind glass. Ghost strength is 0.55 on the street and 0.85 in the hospital, lift and under the mall slab.
- **Props** ghost only below their cover line.
- **Who gets an x-ray ghost** (Sir, 2026-11-01): only people who matter to play -- anyone within `PERSON_DRAW.keyR` (320) of him, and anyone drawn through `keyPerson` (the stories' speakers and targets, the delivery's customer, the pickup worker, the crew, the police, a lost thing's owner, the lost dog's owner, William). They ghost when their head is hidden by what is drawn, and are drawn ONCE, as the ghost (`drawPersonGhost`). Everyone else hidden is simply not drawn; a walked dog goes with its walker (no ghost). A new story's person: draw them inside `keyPerson`.
- **The wall trace is where he collides**, on his floor. Over glass it's teal with a white edge.
- **Lights** are layered (wash, mid, core) plus a pool on the ground under them, with no bands, built in world space from the full pose.
  - They're masked by what's in front.
  - A light's layer and brightness never depend on where Tipsey is.
- **Landmark lamps glow at night through the lamp kit** (Sir, 2026-10-30: "YES add this"). A lamp painted into a cached landmark declares its light once on its entry (`lamps: [{ a, b, z, r }]`); `queueLandmarkLamps` draws its pool and layered glow as a small live item in the world's order, culled off screen. Never repaint the cached piece for it.
- **Over the cover is in the open** (2026-10-31, the drone in teal over the museum's roof): a prop's x-ray cover line is a world height, never stacked on its base; a flyer over a roof draws solid, and in the air it takes no door (no walk-in opens under it).
- **Night:** one navy multiply. A lit interior's cut covers its whole footprint up to its real wall heights, the street stays night, and lights ease over 900 ms.

## 9. Still things stay still (perf, camera)
- Anything still goes through `bcDraw` or the ground cache with stable keys (include content). Moving parts are split out and drawn live. Cull each item.
- **One camera per frame, on whole pixels** (`camPixelSnap`), easing per ms. Clamp the target, never the eased camera.
- Draw into the `g` you're handed. File solids by grid cell, and watch boot time.

## 10. Missions (missions.md)
Approved by Sir, 2026-10-30 ("fix them to the rules"). R7 is his: beacons everywhere, as the pickups.
- **R1 A mission never deletes a person.** Starting, aborting, failing or resetting walks its people off (`leave`, back through their door or past the view's edge); its extras exist before it and stay after it.
- **R2 Every beat starts the same way:** he stops on a drawn, armed bay, mat or rug (`matHighlightState === "armed"`), and it re-arms only once he has left it.
- **R3 One story at a time.** A mission starts only when `missionBusy()` is false and owns the GPS and the speech card till it ends; free-roam extras (lost dogs) wait.
- **R4 A mission keeps the real clock.** It declares its window on `NIGHT_CLOCK` (`day`, `evening` "comes at dusk", `night` "after dark", `any`), is offered only then and keeps its time once started; every place it uses is open then, lines that name a time come from the clock, and there is no "hours later".
- **R5 Every carried item declares its tip-over rule:** `spill` (a fail, the spill drawn), `keep`, or `crewReturns` (the crew hand it back as they lift him: "Dropped this, buddy.").
- **R6 One item per step, seen:** in the giver's hand, named in the step's toast, gone when handed over or used; a spent keepsake leaves the wall for good.
- **R7 Where to go is the GPS and the bay's beacon**, one rule for every mission, the same as a pickup's: a beacon over the bay he is sent to, the GPS leading into the place it means (lift, door, room).
- **R8 Ask, then accept.** The giver states the problem face to face, Tipsey promises, the player chooses (Accept / Not now); the ending is the asker's thanks face to face and one completion card.
- **R9 Every mission is in one registry** (`MISSIONS`: giver, places, window, steps, items, reward, server id); the mission board shows its state and next step, and what it needs if he hasn't got it.
- **R10 What a mission gives is the server's.** Completion through `missionComplete` (`tpCompleteMission`, the id in `TS_MISSIONS`), money paid once by the server, skins, trophies and key items in its catalogs; nothing of value only in `localStorage`; give the console seed line.
- **R11 A story borrows the place's own people:** the shop's or room's staff (`SHOP_STAFF`, `walkinStaff` `awayAt`), the house's household (`householdOf`), out of a real door that opens and back to their post; never a new person at a typed point.
- **R12 The mission's camera and wheel are seamless too.** Cine bars and an autopilot may take over, but the autopilot never sets his position (it steps round or hands back); no fade, cut or zoom snap: lifts dissolve, endings happen where the item is delivered.
- **R13 World changes wait until he can't see them.** What a mission ends or leaves behind (a derby, a crash, a crowd) holds until it is out of sight, then goes the city's way.
- **R14 Every speaker meets him with the one meet kit**, people already standing too (`meetApproach` + `meetStand`): the spot is tested against what is drawn (`meetCoverAt`), and every walk is the kit's walker (`hospWalkAt`, `walkPathAt`: one pace, eased ends, eased turns arriving and leaving).
- **R15 Mission UI is the game's UI:** one speech card (`hospSayCard` / `missionSay`), orange answers, no emoji, no looping nudge or pulse; toasts say the next step in one line.
- **R16 Still mission props are cached** (`bcDraw`): a bay, mat, wreck or tape; only its ring, lights and people draw live.
- **R17 Focus, one thing at a time:** whatever Tipsey is doing hides everything that cannot go with it; only deliveries stack. A story under way (`storyFocus`) is exclusive: deliveries (`deliveryHidden`), every other story and the challenges (`storiesHidden`: bays, beacons, offers, board rows, map pins, search rows) are hidden and refused ("Finish <story> first." only on a delivery tried), and no lost dog or stray can be taken on (`dogsLocked`: it stays in the world, nothing starts). An order aboard hides the stories and challenges; more orders can be added and one dog rescued. A dog being taken home hides the stories and challenges, not the deliveries; one dog at a time. Coming back is always quiet: no toast, no card.
- **A loan swap keeps the camera** (2026-11-01, Adoption Day): handing control to a lent vehicle or back (`FLEET_LOAN`) keeps `camX`/`camY` across `owStandUpAt`, so the view eases to the new body instead of snapping; the one handed over stands where it was drawn, so nothing pops.
- **Mats are an AR overlay, not a thing on the pavement** (Sir, 2026-11-01: "an AR overlay type thing that tipsy can see but no one else ... get rid of the red fill"; "do them all, the icon tells you the shop already"). Every delivery doormat, pickup bay, story bay and challenge mat draws only its ring (`drawMatAR`, dials in `MAT_AR`): faint corner brackets far, the rim near, green when armed, easing off rather than vanishing. The beacon icon says what it is. No red rug, no hatched or tinted bay (the slalom's checker finish stays). A rescued dog's home gets the same ring and a paw beacon (`lostDogHomeMat`); stopping on it, armed, brings the owner out (R2).
- **Gifts lie in the world, sparse, and are not missions** (Sir, 2026-10-30: "so that we have them but they arnt to thick"). The four gift kinds are scattered daily by `GIFT_WORLD` and nowhere else (docs/state/gifts.md): one table sets the density, the hood's own survey decides the ground (reachable, off the running lanes, never inside a driven landmark), and a seeded day decides the set. Each draws as the hospital's gift art, small and low, with a soft glow only when he is near, live but culled, never a cached piece. A gift is picked up any time (R17 hides it never), with the hospital's card and items panel, and any money goes through the server once.
- **Lost items are the people's own** (Sir, 2026-10-31: "it has good karma written all over it"; "no new karma count"). A few a day per hood from the gifts' survey (`LOST_ITEMS`), each tagged with a real house door and one of its household; returned at that door face to face (the door opens, `meetWalk` + `meetTick`, thanks, a small server-paid tip once per item, back in with it in hand). Carry-only, kept through a tip-over, a beacon and pin at the owner's door, not during a story; no new profile stat (docs/state/gifts.md).

---

## Building something big: order of work
Show Sir at each **gate**, and don't move on with a gate failing.
1. **Site and plan.** Pick the cells; a multi-cell site gets one site box. Use a right-handed frame and game constants, entrances on camera-facing faces, a rear elevation for away edges. Use one plan constant (rooms, halls, doors, glass, lifts, levels, per-mass heights), based on a real reference.
2. **Volume from the plan, before any art:** `vol.foot`, solids, `opens` (walkable ground), and a path to every entrance. *Gate: drive the perimeter and every entrance; L1/L2 clean.*
3. **Shell.** Whole units keyed at their centre; split only long runs. Rims all round, heights declared. *Gate: 4 headings, day and night.*
4. **Facade.** Set it out from the door, with real windows and fitted signs, all inside the lot. *Gate: the shop checker is clean; close-ups of every face.*
5. **Interior from the same plan.** Faces cut to the dado, union walls, lower levels clipped, a complete hide list, see-through glass. *Gate: stand on every floor and room, cross every door both ways.*
6. **Lifts and doors** from the one kit. *Gate: a photo of each state.*
7. **Furniture and people.** Lanes clear, people arriving by doors. *Gate: a photo per room type; the people checker is clean.*
8. **Vehicles round it.** Bays sized from `CARC`, mouths clear. *Gate: the vehicle checker is clean.*
9. **Perf:** one site cache, culled as one. Run the perf check when Sir asks.

## Pre-flight (before showing Sir anything)
- [ ] **The gate passes**: `node tools/review/gate.js --only "<the new thing>"` (or `--area x0,y0,x1,y1` for a new site, `--spots <where>` for new people or vehicles). A NEW finding means the piece doesn't fit the system: fix the piece, or fix the kit and its norm, never add it to `known.json` by hand. After fixing a known outlier, `--accept` takes it off the list.
- [ ] Built from the norm for its class (`docs/STATE.md`): the approved pipeline, door, life (how it arrives and leaves), speed and collision. Never copied from an outlier.
- [ ] `node tools/world_review.js --kit <kits touched> --spots <where>` is clean, or every finding is explained. Library changes: `--kit shops,landmarks --spots zzz`, with the answer key green.
- [ ] Seen at **all four headings** (eight facings for anything that turns), **day and night**.
- [ ] Sign of b and lot bounds checked numerically on both mirrored edges.
- [ ] No seams, black holes, sky gaps, floating or sunk parts.
- [ ] Nothing crosses a door; doorways and aisles are clear.
- [ ] Drove Tipsey into it: he collides where it's drawn, the x-ray works when he's hidden, and he's never drawn wrongly over or under it.
- [ ] People: nobody pops, faces show in meetings, nobody stands in a wall or door.
- [ ] A mission: played start to finish headless, plus a tip-over at each carried step, a quit and a reload; a screenshot of every meeting (both faces), a clip of its walks; `missionState` right on the board; its id in `TS_MISSIONS` and the seed line given (missions.md checks).
- [ ] No secondary ground. Reused the kits; no lookalikes: every vehicle, prop, uniform and sign the game already draws is the game's own (`gameCar` kinds, the kits), checked by grep before drawing anything new.
- [ ] Walk-ins: with the shell faded, no ground shows inside the building's outline (the room is the shell's footprint), and zoomed on each worker, every one stands on the working side of their equipment facing it, the equipment's busy face turned away from the camera (walk-in kit W18, W19).
- [ ] Building cache `live` count steady with the robot still.
