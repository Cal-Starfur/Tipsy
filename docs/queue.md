# The work queue

What is agreed and waiting, in order. Add to the end; take from the top unless Sir says otherwise. Each line: what, why, where it
stands.

## 1. Upgrade the older rooms to the walk-in standard (Sir, 2026-11-20: "we need to upgrade the ball room and all the older rooms")

The rooms built before the walk-in kit are POCKETS without `walkin`: they never went through the walk-in recipe
(`docs/kits/walkin-shop-recipe.md`), W37's draw-order checks or the furniture standards. `tools/review/w37.js` and
`tools/review/consistency.js` now look at them too (2026-11-20). Each is brought to what a walk-in is held to: the recipe's checks,
W37 clean, the heights in `docs/kits/library.md` (counters 65..75, chairs 38 / a child's 28, tables one sits at 60..66, bar stools 48,
benches 40), the people kit's rules for who is in it.

| Room | W37 flags (2026-11-20) | Notes |
|---|---|---|
| Seabreeze Ballroom Interior | 0 | Done 2026-11-20: W37 clean; the banquet tables 66 and chairs 38, the bar 75 and its stools 48, the coat counter 75, the lounge's seats 38. Left: the walk-in recipe's people checks. |
| Seabreeze Ballroom Basement | 0 (fixed 2026-11-20) | Done 2026-11-21: the ovens and the island at a kitchen counter's 75 (were 96, 92), what stands on them with them, the chopper's knife hand to the board; the cake table left at 76 (a display table, as the hall's). Left: the recipe's people checks. |
| Maritime Mall Interior | 205 | The biggest. |
| Marina General Interior | 82 | The hospital. |
| Palmline Tower Floors | 4 (the doorways' light: drawn last on purpose) | Done 2026-11-21: W37; the sofas rebuilt; chairs 38, dining tables and the desk 66, the kitchen counter, island and bar 75, their stools 48, the armchairs 38. Left: the recipe's people checks. |
| Brew & Bolt Roof | 1 | |

Sizes: the full-block rooms (the ballroom, the mall, the hospital) keep their size and stay on the street's lines (POCKET_VIEW). Moving
them off the map to grow them was tried and dropped (Sir, 2026-11-21: "lets just leave the full block rooms alone for now this is going to
be a tone of extra work for very little reason"). Upgrade them in place; don't grow or move them.

Order: the small ones first (the Basement's heights, Brew & Bolt Roof's one flag), then Marina General, then the Mall. Each room is its
own commit to `main`, with before/after sheets shown to Sir before any height change lands.

Run per room: `node tools/review/w37.js "<room>" --png <dir>` and `node tools/review/consistency.js "<room>" --kind <kind>`.

## 2. Waiting on Sir's decision

- People: long sleeves for suits (and which uniforms)?
- People: the hands-forward pose seen from behind -- the hands show as stubs at the shoulders; change it or leave it?
- Shelves: check none taller than its room's walls pokes past them.
