# Recipe: a shop walk-in, small outside and big inside (walk-in kit W31-W33)

The pattern every shop walk-in follows from now on. The shop stays its own size on the street; the room inside is as big as it needs to be,
running back into the block; while Tipsey is in it the room is a lit set and the rest of the block drops back. **Tidewater Tea House is the
exemplar** (`TH_IN`, `TH_PLAN`, `TH_FAMILY`, the LIB entry 'Tidewater Tea House Interior'). Copy it.

## 1. The exterior never changes
- The shop's street face, height, colours and lot stay as they are. No lengthening, no wings, no moving neighbours (W30 is retired).
- The shop declares its real outline as `vol.foot` (the building, not the whole lot) with its **doorway open through the wall** in
  `vol.opens` (`walk: true`), a body's depth deep, so Tipsey can drive into the doorway (W32).
- It is marked `see: true`; its doorway is a `HOLE` onto the room.

## 2. The door is the door kit's (D0, D12, D13)
- Draw it with `shopDoor(..., { pair: true, w, h, ... })` on the wall's own set-back (`BOFF`), never by hand. Pick a style: glass
  (slides), or a solid style such as `studs` (lacquered leaves that swing in).
- It is at least ~100 wide (Tipsey plus a person).
- Each leaf is its own piece at its own side of the doorway (handled by the kit: `shopDoorLeafKeys`).
- From inside it is a **half door**: the same leaves cut to the front wall's height, swinging for whoever uses them (the kit does it).

## 3. The room (walkinDefine)
- `lab`: the room runs **back into the block** from the shop's front wall, never toward the street. Its front wall and door stay on the
  shop's own front; where the room reaches the block's edge, its wall sits on the pavement line (no strip of yard).
- Size: about 850 x 700 is the target -- it fills the screen at view 2. Bigger is too big.
- `door.glass` negative (about -14): he is taken in once he is IN the doorway, not before (W32).
- `displace = true` on the pocket, and `ghosts` lists every shop it covers (and 'Charge depot' if one is under it).
- `openings` names the doorway (and any front glass) so the street sees the room through it; the street sees only the part inside the
  shop's own body (the kit clips it: `walkinBodyClip`).

## 4. What the kit does for a displacing room (nothing to write -- check it works)
- The buildings it covers are ghosted and drawn **under** the room; the room's floor and walls cover them (`displacedLib`).
- The yard's planters, benches, alley gates and a depot under it are not drawn (`displacedAt`).
- **No one from outside is drawn over the room** while he is in it: passers-by, and other walk-ins' people walking to and from work
  (the bank's tellers behind the tea house) -- only this room's own people (`behindRoomSet`, `drawWalkinPerson`'s `_roomPerson`).
- The world outside dims, snug to the room's own outline (`roomDimDraw`).
- The camera holds the room's middle (floor and walls) at view 2 and leans to him at view 1; view 3 steps to 2 for the visit and back
  on the way out; the zoom button offers 1 and 2 inside.

## 5. The front wall inside matches the outside (W4)
- The low front wall uses the exterior's own colours, and its windows/screens are cut in at their real sill (`winE` / `winS`).
- Where the room's front wall is on a street corner, `cornerLow: true` so the far wall's corner over it is cut low.

## 6. Furnishing the room
- Lay it out in **zones** for its size: counters and shelving along the far walls, a seating area, tables in the middle with aisles a
  body wide, a corner by the door. Keep the door's lane clear from the door to the back wall (`walkinLife` keep).
- Give things **real volume** -- boxes and cylinders with tops and sides, never flat paint on a wall for shelves of goods.
- Long fixtures (counters, shelf runs) are built with `runPiece` (W28):
  - against a far wall: `keyStart: true` and a snug `pad` (3);
  - a counter with things standing on it: `pad: 5`, and the things on it (urns, tills) are **their own pieces**, never drawn inside
    the runs;
  - leave **at least 52** between a shelf and the counter in front of it, so the staff can walk behind it.
- Size things to what holds them (a jar narrower than its shelf is deep).
- Draw parts of one object back to front in one piece (cushions behind a table, the table, cushions in front).

## 7. The people
- Staff are the shop's own people, with their own looks set by hand (`lookFn`) and their own dress, fitting the shop -- the tea house's
  are the Morita family. Visitors stay random (`look: 'visitor'`).
- One per counter or station, posts on the working side of their station (W19), plus a server who moves and visitors who browse.
- Check they all walk in at opening: nobody stuck at the door.

## 8. The checks, every time
- Headless: drive in from the street at view 2 and view 1; the frame before the switch shows him **in the doorway**.
- A 40-frame run inside with the family working: nothing paints over anyone (heads clear of shelves and urns), no outsider in the room.
- From the street at view 3: nothing of the room shows past the shop's own body.
- `walkinCoverage` / `walkinNightCheck` clean; at night the room lit, the street dark.
