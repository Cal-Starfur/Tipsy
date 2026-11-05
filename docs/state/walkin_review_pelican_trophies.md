# Walk-in polish review: Pelican Drug and Seabreeze Trophies (2026-10-30)

Reviewed headless at zoom 1 and 3, both crossings, day and night. Images: session scratchpad `review2/` (not kept). (a, b) are room coordinates. **Status: all 22 fixed (2026-10-30, branch consistency-pass, uncommitted); see each "Fixed:" line.**

## Severe
1. **Trophies: the street door's open leaf and its dark box stay standing in the doorway while he is inside**, and he is hidden behind them.
   - Cause: the `for(const d of sDoors)` loop (`LIB.drawDoorOpen`) has no pocket check, and `SHOP_DOOR_USE.tipsey` stays open because `botX` is shifted onto the street.
   - Fix: skip the door, or fade it by `pocketShellK`, when `POCKET_VIEW && pocketHiding(d.lib) === POCKET_VIEW.pk`.
   - **Fixed: the `sDoors` loop now skips a door whose shop a pocket hides (`pocketHiding(d.lib)`) once its shell is gone, and draws it at the shell's k while it fades (`withAlpha`). The same goes for the pickup unit's live door and worker: the hs unit's fade now uses `withFade`, which fades both the cached images and the live drawing.**
2. **Both: during the shell fade, the room's near half paints crisp over the still-opaque front.** Each shell is one depth item: Pelican's store item is keyed at the store's centre, and Trophies' is the hs unit. Fix: while k is above 0, draw the shell after every room item, or key its front face at the near edge.
   - **Fixed: in the AN INTERIOR queue, while the shell is there at all (`walkinShellK`), the room's pieces nearer than the shell's middle key come in at 1 − k (`withFade`). The room's staff come in the same way and are never x-rayed through the shell (`_seenThrough`). Pelican's sliding pair now eases with the shell too; it used to vanish at the half-way point.**
3. **Pelican: the drive-through window doesn't match the inside.** The window is on the east flank at about b 128–210 (`PW0/PW1`); inside, that stretch is the magazine rack behind a knee wall. Fix: put the pharmacy, or a pickup hatch, at the window's b range, and cut the window into the east wall.
   - **Fixed: Pelican is re-planned. The pharmacy is now in the east corner (a 430..540, b 0..242). Its counter faces the store, and a pickup hatch stands under the drive-through window. The window (b 128..210, sill 40) is cut into the east knee wall with the kit's new `winE`.**
4. **Pelican: fixtures paint over the knee walls.** The magazines and the counter's east end paint over the east cap, and the baskets over the south wall. Cause: `walkinRoom` cuts walls into runs of up to 150, keyed at each run's middle, while the fixtures use runs of 40–50. Fix: give the near walls runs of 40 or less, or key each run at its far end.
   - **Fixed in the kit: `walkinRoom` cuts the near walls into runs of 40 or less (`WALKIN_NEAR_RUN`), and the window ends are cuts. Pelican's and Trophies' fixtures are runs of 40 or less, each keyed at its middle.**
5. **Pelican: the cashier blocks the aisles.** Her posts are at (296,280) and (246,282), in the 50-wide gap between the gondola ends (b 250) and the checkout (b 300), and her solids leave lanes under 80. Fix: re-plan the checkout and gondolas.
   - **Fixed: the checkout is a station of its own (a 225..330, b 275..360). It has a counter along b, a bagging shelf and a sweets rack, and the cashier stands inside them facing east. The gondolas are a 190..225 and 310..345, b 110..190. Every lane is now 84 or more: 146 for the door lane, 85 between the gondolas, 84 north and 85 south of them, and 85 to the pharmacy.**
6. **Trophies: he drives through the engraver** (idle at `TROPHY_IN.idle` (118,330)), and nobody stands at the till (W15). Fix: declare the engraver and a counter clerk with `walkinStaff`, so they get solids.
   - **Fixed: the engraver, a counter clerk (`TROPHY_SHOP_UNIFORM`) and a visitor are declared with `walkinStaff`, so all three have solids. The engraver's machine spot is solid too (`also`). The engraver keeps Fourth Place's look (`lookFn`), and while the mission walks him he is the mission's (`away`), so there is no double draw. Collision was checked by driving into each of them.**

## High
7. **Pelican: the apron is 110 out but the tower is only about 40 deep**, so a slab sticks out into the car park. Fix: OUT about 40, and draw the tower's jambs.
   - **Fixed: Pelican's room floor stops at the tower front (`apron: 40`), and the tower's piers are drawn and solid, cut low. The street's foot is now open across the sliding pair (a notch between the piers), so he drives into the tower and is taken in at the pair (`glass: 4`, out 15 past the front).**
8. **Trophies: the alley fence and gate vanish while he is in.** `queueCommercialEdgeAt` drops the edge gates for a hidden unit. Fix: keep them.
   - **Fixed: the gates are kept. They ease down with the shell to `WALKIN_GATE_K` 0.3 and never vanish, because at full strength the tall alley fence stood across the room's east half.**
9. **Trophies: the front windows of cups have nothing behind them inside, and the door widths differ.** The exterior door is about 86 wide, the inside opening 120. Fix: put window displays on the inside of the south wall, and match the door widths.
   - **Fixed: stepped window displays of cups stand inside both front windows, and the windows are cut into the south knee wall (`winS`, sill 28.6, matching the exterior). The doors match: the shop's door is now a pair 120 across (`flatsShop doorW`, the new `shopDoor` opts `{w, pair}` with live pair leaves), the same as the room's 320..440. At 86 he got stuck in the room's gap.**
10. **Both: walls have no top or thickness (W7).** Pelican's back wall also runs 30 past the west wall, leaving a paper-thin tab at the north-west corner. Fix: cap the tops, and clip paintN to start at a 0.
   - **Fixed in the kit: the far walls have tops (`ftop`). The north wall's face starts at a 0, so the tab is gone. The north-east corner block is full height with its end face, and the west wall stops at the south wall with its end face shown. The east wall now starts at b 0.**
11. **The staff "work" pose sticks both arms straight out into the air.** Fix: lower and shorten the arms onto the counter, and face the posts toward the till or screen.
   - **Fixed: a single kit pose, `WALKIN_WORK` (upper arms 0.38, forearms bent 1.0..1.1: hands at the counter). The engraver uses it too. The posts face the till, the screen or the hatch.**
12. **Screens face the wrong way:** Pelican's pharmacy screen, the till screen (`S(a1-9.6…)`), and the Trophies till screen, which lies flat.
   - **Fixed: Pelican's pharmacy screen faces the pharmacist (north), and the till's screen faces the cashier (west). Trophies' till screen now stands up and faces the clerk. A face drawn only from the side it faces is hidden from the camera.**

## Medium
13. **Wall heights and back doors.**
   - **Fixed: Trophies' walls are 208 (160 lab × 1.3). Pelican's are 232, the store's. Pelican's staff door is on the back wall (a 250..292). Trophies' rear door (a 506..590) and rear window (a 34..125, z 109..172) are on its back wall, with the sign moved over the door.**
    - Trophies' inside walls are 240 high, the exterior about 208.
    - Pelican's staff door (SA0+250..292) is missing inside.
    - Trophies' rear door and rear window are missing inside.
14. **Trophies' championship cups are boxy**; at scale 3.2 they read as white blocks.
   - **Fixed: the cups are turned (`lathe`: a profile swept round its axis in three tones), with an open mouth and tube handles, on every shelf, window and stand.**
15. **The engraver has his back to the camera** and never moves.
   - **Fixed: the bench is now on the east wall. The engraver stands west of it facing east (toward the camera) and polishes in the working pose. The mission's bench and spindle points moved with it.**
16. **Pelican's cooler bottles read as books.**
   - **Fixed: the bottles have round shoulders, a neck, a cap, a label band and a glint.**
17. **The PICK UP sign covers the "PHARMACY" lettering**, and its rods rise into the sky.
   - **Fixed: the PICK UP sign stands on the pharmacy counter's west end, on two posts, with no rods. PHARMACY is in the wall band over the pharmacy.**
18. **Hairline seams show on the knee-wall caps** at run joints. Fix: overlap the run tops by 1.
   - **Fixed in the kit: a near-wall run's top and face reach 0.6 into the next run, and into the south wall at the south-east corner.**
19. **Night.**
   - **Fixed in the kit: walk-in rooms (`walkin: true`: Pelican, Trophies, museum) keep their building's hours (`walkinShut`: the place card's hours on the night's clock), latched while he is inside. When open at night they are lit warm (`WALKIN_NIGHT.lit`); when shut they are dark (0.85 of the night) with no staff and no staff solids. Trophies stays open late while Fourth Place needs it (`late`). The night cut is now the floor up to the knee walls plus the far walls full height (`walkinNightBoxes`), plus Pelican's vestibule, so the street over the near walls stays night. The door stays his when shut, which was Sir's earlier "open any time".**
    - Both rooms are lit like day.
    - Pelican's lit box ends at D+30, so its apron is half lit.
    - Trophies is shut outside (hours 9–17) but lit and staffed inside.
20. **Trophies: shoppers walk in and out of its door, but nobody is inside.**
   - **Fixed: shoppers, kerb errands and pavement callers no longer pick a shop a pocket hides. One browsing visitor is inside instead (456,000 square: one).**
21. **Trophies has no threshold at the door (W13).**
   - **Fixed: a brass threshold at Trophies' door. Pelican has one at the store wall and one at the tower's pair.**
22. **The knee walls differ:** Pelican's are 66 high, Trophies' 78.
   - **Fixed: both rooms use the kit's 66.**

**The gate on the Pelican commit (L1)** flags Pelican's south-west corner (a −30..14, b 360..390): the west wall's full-height end stands beside the low front wall. The museum's lobby column at (560,200) is flagged too (its circle solid).
   - **After the fixes (2026-10-30): `gate.js --phases library --only "Seabreeze Trophies"` PASSES (0 new, 1 known). `--only "Pelican Drug"` reports 1 new L1 on Pelican Drug Interior, "something round or helper-drawn standing on the footway" at a −30..30, b 360..375. That spot is the room's south-west corner, where the west wall now ends at the south wall's inner face (b 360) and shows its end face over the low wall. This is the known false positive for a pocket room: the wall's solid is declared, but the checker reads the corner as the street's footway.**

## Also found and fixed in the same pass
- Trophies' street door is now a pair, 120 across, matching the room. With the single 86 door he stuck in the room's gap, and the autopilot dropped him through it.
- The pickup unit's live door and worker did not fade with an hs shop's shell, because only its cached images did (`withFade`).
- Errand drivers and pavement callers walked into Seabreeze Trophies and were in no room. They now skip any shop a pocket hides.
- The Fourth Place engraver met him in the doorway, over the window display. The meeting now waits until he is inside, past the displays, and the meet side keeps clear of them.
- The walk-in staff were x-rayed (teal ghosts) through the shell as it came back. They now fade with it and are never x-rayed.
- The pocket's shut state is now asked afresh on entry; it was stale from boot.

