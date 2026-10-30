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
| W11 | **Every opening shows the live room** -- the doorway, shopfront glass, ground-floor windows: its floor, fixtures and people, clipped to the opening by the shell, at the right depth, never a dark or opaque fill. The shell's art makes a hole there (`HOLE` in a `see` entry; glass a .30–.46 tint over it; live leaves drawn over it). The pocket declares its `openings` once; `walkinThrough` draws the room's pieces that can be seen through one (its cached `pkx\|` images, culled to them), its floor inside its walls and its people, live, just under the shell's first piece; at night, open, its light through them. Not while the shell fades (the whole room is drawn then). | 12+1 | kit (`walkinThrough`; the hospital and mall keep their own queues) | photo from outside, zoom 1 and 3, day and night |
| W12 | **Furniture faces away from its wall**, sized from `PERSON_H`. Anything wall-hung needs a wall tall enough for it. | 11 | C | ☐ |
| W13 | **Floors run wall to wall** in one pattern, with a threshold at every door. | 4 | C | eye |
| W14 | **An opening in a floor takes the exact outline** of what passes through it. | 3 | C | eye |
| W15 | **The room comes with its people.** One staff member per counter, till, desk or post, dressed for the job (a named `*_UNIFORM`). Visitors in halls (about one per 400,000 square of floor); a shop takes one or two shoppers only where its aisles are off the door's lane. They are there while the room is open (W17: they come and go through its door), out of the lanes, solid where they stand (a fixed post's a solid; everyone else holds him live, W16), declared through `walkinStaff` and listed in `CITY_PEOPLE`. | 1 | kit (`walkinStaff`) | photo + clip with them in |
| W16 | **People have life.** Each person declares what they do, from one vocabulary: `life:'post'` (staff at posts[0], living there -- weight, glances, sway, busy hands at work posts -- and stepping to their other posts now and then), `'patrol'` (a `route` of `[a, b, look, pauseMs]`, walked slowly, looking round at each), `'browse'` (visitors between the room's look points: `walkinLife(room, { looks: [{ id, spots: [[a, b, facing]], up }], keep: [lanes] })`, dwelling 4–12 s, pointing, never two at one spot), `with:'id'` (a pair: the spot beside, talking, leaving together). The kit moves them: paths on a grid of the room's solids built once, straightened; `PEOPLE_WALK_V`, legs from distance, turns eased (`MEET.turnMs`); 15 + 7 apart (the lower seed steps aside when two meet); stopping for Tipsey and going round him; he is held by them live (`walkinPeopleBlock`); a post solid only for `fixed` staff behind a counter. Seeded, so a room plays the same way; they live while the room is seen. Bad declarations (a spot in a solid or a kept lane) are warned at load. | 1 | kit (`walkinLifeTick`) | clip per room: nobody through anything, nobody pops, legs match, he is held |
| W17 | **The room keeps its day** (Sir, 2026-10-30: "Lock when shut", "lets let them go home and lock the door behind them", visitors "what ever feels more real"). Its hours are its place card's (`walkinOpenNow`; `pk.late` keeps it open for a story). **Closing:** visitors walk out through the front door (it opens for them) and along the pavement past the view's edge, then the staff; the keyholder (`keys: true`, or the first of the staff) goes last, turns at the door outside and locks it (`m.beat`, a hand at the lock); the lights go off with the lock. He's never shut in: while he's inside, the keyholder waits by the door, and the door always opens for him going out. **Shut:** the door is locked (`walkinLocked`): it doesn't part for him, he's held at it (`walkinDoorBlock`) and told when it opens (`walkinLockedToast`); the room behind the glass is dark and empty. **Opening:** the keyholder walks in from past the view's edge and unlocks it; the others follow `stagger` apart. **Open:** visitors come and go, how many are in rising and falling with the hour inside the W15 band (`walkinVisitorsWant`: a third of the declared visitors at opening, all at the day's height, none in its last `last` hours); each stays a visit (`visitMs`, browsing) and leaves; whoever comes next is somebody new (the look seeded by the visit); a pair comes and goes together. **The way:** the room's paths to the inside of its doorway, a lane each way (kept right, `lane` 20: the two ways pass a body apart), out through the door, round whatever stands in front to the pavement (A* on `owSpotClear`, once: `walkinStreetPlan`), along it and round a corner (`pk.street.routes`) till past the view's edge. Lived while the room is near the view (`walkinDayTicks`); a room nobody saw for `gapMs` starts where the hour puts it. Out on the street they're the street's: drawn in its order, solid to him (`walkinStreetBlock`), listed in `CITY_PEOPLE` at their world point. | 1 | kit (`walkinDayStep`, `WALKIN_DAY`) | clip per room: closing (out, the lock), opening (in, the unlock), visitors over a day; the locked door refusing him |

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
- One see-through queue (`walkinThrough`, from the pocket's `openings`).
- One automatic glass door.
- One floor model, and one lift-car kit.
- Interior x-ray.
- A staff framework on the people kit, with life (`walkinStaff` `life`/`route`/`with`, `walkinLife` looks).
- The room's day (W17): hours, the lock, the way in and out (`street`), visitors over the day (`walkinDayStep`).
- Its building's lamps at night: the lamp kit (`lamps` on the exterior entry, `queueLandmarkLamps`; LOOK_RULES 8b).
