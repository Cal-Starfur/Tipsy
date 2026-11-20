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
| Seabreeze Ballroom Interior | 0 (fixed 2026-11-20) | Heights still off: the bar 110 (to 75) and its stools' seats 72 (to 48, four guests on them, the bartenders' drinks with it); the coat counter 104 (to 75); the lounge's armchairs and sofa seats 46 (to 38, a couple on the sofa). The banquet tables 66 and chairs 38 done. |
| Seabreeze Ballroom Basement | 0 (fixed 2026-11-20) | Not yet measured for heights. |
| Maritime Mall Interior | 205 | The biggest. |
| Marina General Interior | 82 | The hospital. |
| Palmline Tower Floors | 50 | |
| Brew & Bolt Roof | 1 | |

Run per room: `node tools/review/w37.js "<room>" --png <dir>` and `node tools/review/consistency.js "<room>" --kind <kind>`.

## 2. Waiting on Sir's decision

- People: long sleeves for suits (and which uniforms)?
- People: the hands-forward pose seen from behind -- the hands show as stubs at the shoulders; change it or leave it?
- Shelves: check none taller than its room's walls pokes past them.
