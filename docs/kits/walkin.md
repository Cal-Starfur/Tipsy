# Kit 9: Walk-in buildings (contract v2)

**What this covers:** the walk-in buildings (pockets): Marina General, Maritime Mall, Seabreeze Ballroom and Seabreeze Trophies. That means shells, glass you see in through, floors, lifts, furniture and interior walls.

**Evidence:** 151 past corrections.

**Checker:** the other kits run at the `hosp-in` spot (Tipsey is driven in through the main doors). There's no walk-in kit yet: each building rolled its own.

| ID | Rule | Ev | Status | Check |
|---|---|---|---|---|
| W1 | **Every shell piece over the interior is on one hide list** (roofs, canopies, skybridge, podium ends, pylons) and eases off as a set through one shell-fade service. Things outside stay drawn, and nothing pops. | 22 | C (each pocket keeps its own list) | ✅ S1o inside (notes); ☐ pop watch while crossing |
| W3 | **Doorways, lift lobbies and aisles stay clear.** Furniture leaves an 80-wide lane from every door to the back wall. | 13 | C | ☐ furniture vs plan |
| W4 | **Inside matches outside:** interior faces reuse the exterior's own drawing, cut to the dado, and doors, glass, piers, signs, footprint and floor heights come from one plan. | 33 | C | ☐ interior vs exterior |
| W5 | **Crossing is seamless:** no fade, cut, black or nudge. The view out is the live city. | 14 | part (the basement lift still fades) | ✅ people and vehicles at `hosp-in` |
| W6 | **Walls are never added or removed per room.** A shared wall is one piece, cut to the dado on the near side. | 9 | C | ☐ |
| W7 | **Every wall's thickness and top is filled**, with no slot showing ground or the room behind. | 6 | C | ☐ magenta backstop |
| W8 | **Lower levels are clipped by the upper floor's edge.** | 7 | C | ☐ |
| W9 | **Walls are the outline of the union of the floor rooms**, at one thickness (20), drawn full height outside. | 12 | part (`hospWallOutline`) | ☐ |
| W10 | **One lift-surround function on every floor**, and one complete car kit. Cars run on their own, the panel faces the camera, and the shaft below shows. | 22 | C | ☐ |
| W11 | **Ground-floor glass shows the live interior and its people**, in framed panes. | 12 | part (two separate see-through queues) | ☐ |
| W12 | **Furniture faces away from its wall**, sized from `PERSON_H`. Anything wall-hung needs a wall tall enough for it. | 11 | C | ☐ |
| W13 | **Floors run wall to wall** in one pattern, with a threshold at every door. | 4 | C | eye |
| W14 | **An opening in a floor takes the exact outline** of what passes through it. | 3 | C | eye |

**Approved values:**
- **Walls:** thickness 20, smallest room 120, interior door 120.
- **Hospital:** walls 64 high (low enough to see into the rooms).
- **Mall:** dado at 80, upper floor at 330.
- **Hospital glass lift:** shaft 320 × 400, cars 320 × 195.
- **Shell ease:** 450 ms, smoothstep.
- **Exemplars:**
  - the mall's shell fade (01f7145);
  - the mall's shared walls (218eba4);
  - the hospital's union-outline walls (4bffb37);
  - its framed panes (df5c4bc);
  - the independent lift cars (268ec23, provisional: confirm on the iPad).

## What one walk-in kit would hold (the mall and the hospital each built these)
- One plan constant (rooms, doors, glass, levels, lifts, shell cells).
- One pocket record (view, hides, floors, night).
- One shell-fade service.
- One see-through queue.
- One automatic glass door.
- One floor model, and one lift-car kit.
- Interior x-ray.
- A staff framework on the people kit.
