# Walk-in polish review: Pelican Drug and Seabreeze Trophies (2026-10-30)

Reviewed headless at zoom 1 and 3, both crossings, day and night. Images: session scratchpad `review2/` (not kept). (a, b) are room coordinates. **Status: all open.**

## Severe
1. **Trophies: the street door's open leaf and its dark box stay standing in the doorway while he is inside**, and he is hidden behind them.
   - Cause: the `for(const d of sDoors)` loop (`LIB.drawDoorOpen`) has no pocket check, and `SHOP_DOOR_USE.tipsey` stays open because `botX` is shifted onto the street.
   - Fix: skip the door, or fade it by `pocketShellK`, when `POCKET_VIEW && pocketHiding(d.lib) === POCKET_VIEW.pk`.
2. **Both: during the shell fade, the room's near half paints crisp over the still-opaque front.** Each shell is one depth item: Pelican's store item is keyed at the store's centre, and Trophies' is the hs unit. Fix: while k is above 0, draw the shell after every room item, or key its front face at the near edge.
3. **Pelican: the drive-through window doesn't match the inside.** The window is on the east flank at about b 128–210 (`PW0/PW1`); inside, that stretch is the magazine rack behind a knee wall. Fix: put the pharmacy, or a pickup hatch, at the window's b range, and cut the window into the east wall.
4. **Pelican: fixtures paint over the knee walls.** The magazines and the counter's east end paint over the east cap, and the baskets over the south wall. Cause: `walkinRoom` cuts walls into runs of up to 150, keyed at each run's middle, while the fixtures use runs of 40–50. Fix: give the near walls runs of 40 or less, or key each run at its far end.
5. **Pelican: the cashier blocks the aisles.** Her posts are at (296,280) and (246,282), in the 50-wide gap between the gondola ends (b 250) and the checkout (b 300), and her solids leave lanes under 80. Fix: re-plan the checkout and gondolas.
6. **Trophies: he drives through the engraver** (idle at `TROPHY_IN.idle` (118,330)), and nobody stands at the till (W15). Fix: declare the engraver and a counter clerk with `walkinStaff`, so they get solids.

## High
7. **Pelican: the apron is 110 out but the tower is only about 40 deep**, so a slab sticks out into the car park. Fix: OUT about 40, and draw the tower's jambs.
8. **Trophies: the alley fence and gate vanish while he is in.** `queueCommercialEdgeAt` drops the edge gates for a hidden unit. Fix: keep them.
9. **Trophies: the front windows of cups have nothing behind them inside, and the door widths differ.** The exterior door is about 86 wide, the inside opening 120. Fix: put window displays on the inside of the south wall, and match the door widths.
10. **Both: walls have no top or thickness (W7).** Pelican's back wall also runs 30 past the west wall, leaving a paper-thin tab at the north-west corner. Fix: cap the tops, and clip paintN to start at a 0.
11. **The staff "work" pose sticks both arms straight out into the air.** Fix: lower and shorten the arms onto the counter, and face the posts toward the till or screen.
12. **Screens face the wrong way:** Pelican's pharmacy screen, the till screen (`S(a1-9.6…)`), and the Trophies till screen, which lies flat.

## Medium
13. **Wall heights and back doors.**
    - Trophies' inside walls are 240 high, the exterior about 208.
    - Pelican's staff door (SA0+250..292) is missing inside.
    - Trophies' rear door and rear window are missing inside.
14. **Trophies' championship cups are boxy**; at scale 3.2 they read as white blocks.
15. **The engraver has his back to the camera** and never moves.
16. **Pelican's cooler bottles read as books.**
17. **The PICK UP sign covers the "PHARMACY" lettering**, and its rods rise into the sky.
18. **Hairline seams show on the knee-wall caps** at run joints. Fix: overlap the run tops by 1.
19. **Night.**
    - Both rooms are lit like day.
    - Pelican's lit box ends at D+30, so its apron is half lit.
    - Trophies is shut outside (hours 9–17) but lit and staffed inside.
20. **Trophies: shoppers walk in and out of its door, but nobody is inside.**
21. **Trophies has no threshold at the door (W13).**
22. **The knee walls differ:** Pelican's are 66 high, Trophies' 78.

**The gate on the Pelican commit (L1)** flags Pelican's south-west corner (a −30..14, b 360..390): the west wall's full-height end stands beside the low front wall. The museum's lobby column at (560,200) is flagged too (its circle solid).
