# Gifts (charge pack, tip envelope, extra time, crew pass)

Sir, 2026-10-30: "look at how the time bonus batter bonus and tip folder are in the hospital. and figure out how to
scatter these into the game world so that we have them but they arnt to thick".

There are two kinds of gift:

- **The hospital's** (`HOSP_GIFTS`): story gifts. One of each kind per Marina General floor, in the halls. Each is
  found once, for good. These are unchanged.
- **The world's** (`GIFT_WORLD`, game/index.html, next to `giftPayTip`): a fresh scatter every day across the hoods
  Tipsey owns. The Flats is the only owned hood today.

Both kinds are the same items once found. They go through `collectPick`, and they show as one card style and one row
in the items panel:

| Kind | Does | Held | On pickup |
|---|---|---|---|
| tip envelope | $2.50 into the wallet | never carried | paid at once (`giftPayTip`) |
| charge pack | +25% battery | up to 4 (`GIFT_HOLD`) | into the bag. USE in the items panel |
| extra time | 15 s back on a running clock | up to 4 | into the bag. USE in the items panel |
| crew pass | the next tip-over is free | up to 4 | into the bag, spent by the tip-over |

When Tipsey already holds the cap of a kind, a gift of that kind stays where it lies. A genuine tip-over drops what
he carries (`collectLose`), and each dropped world gift goes back to its spot for the rest of that day.

## Density (all in `GIFT_WORLD`, one table)

| Key | Value | Meaning |
|---|---|---|
| `perBlocks` | 2.5 | one gift for every 2.5 blocks of ground he can reach in a hood |
| `apart` | 1.5 | never two gifts within 1.5 blocks of each other |
| `mix` | tips 36, charge 30, time 20, crew 14 | how likely each kind is |
| `tipMax` | 14 | at most 14 envelopes a hood a day. Extra envelopes become charge packs. Must match the server's `WORLD_TIP_SLOTS` |
| `interest` | plaza 3, boardwalk 3, quay 3, landmark 2.5, park 2.5, lot 2, beach 1.5, estate 1, buildable 1, sidewalk 0.5 | how much each kind of spot is worth. "landmark" is the grounds of a built landmark, such as an office tower's plaza |
| `skipBases` | Car park, Airfield, Hospital | landmarks whose ground is driven: no gift on their cells |
| `front` | 0.3 | a spot with a building standing right in front of it (toward the camera) is worth this fraction |
| `r` | 95 | how close he must drive to pick one up |
| `nearR` | 1300 | how close he must be for the glow to show |
| `s`, `dz` | 0.7, -50 | the drawn size, and how far below a pickup beacon's height it floats |

The Flats on 2026-09-30 (the harness's pinned date) gets 40 gifts: 13 tips, 12 charge, 8 time and 7 crew. They
land as 25 in the city, 5 in Sierra Vista, 4 in Pelican Harbor, 5 on Sunset Shore and 1 on the boardwalk. The closest
two are 1.53 blocks apart.

## Placement (`giftWorldSurvey`)

1. **The hood's own ground.** The survey covers the box round the hood's cells in the region index. It keeps only
   the points that `ownerAtWorld` gives to that hood: its city blocks plus its districts and wrap-strip stretches
   (Pelican Harbor, North Sunset Shore, Sierra Vista, its stretch of the boardwalk and Sunset Shore). It skips sea,
   harbour water, foothill and mountain points.
2. **A raster** of `step` (200) units. Each point is road, open ground or blocked. "Blocked" uses the same walls
   that stop him in `owStep`: `solidAt`, the harbour, the Sierra Vista walls, the North Sunset Shore houses, the
   beach's sea and dunes, the north edge and a walk-in's locked door. Courtyard gates count as shut, so the result
   never depends on where Tipsey is standing.
3. **Joined to the streets.** A flood fill starts from every road point and steps one raster point at a time. A step
   needs the point halfway along to be clear too, so no wall can slip between two points. Anything shut inside a
   courtyard or a garden is never reached, so it is never chosen.
   The cells of a `skipBases` landmark (a car park's lanes, an airfield's apron, the hospital's ER drive) can be
   driven through, but no gift is placed on them.
4. **The dart throw.** Candidates sit on every other raster point (400 units apart). Each is weighted by `interest`.
   A seeded pick (`clientTodayUTC` + hood + `seed`) chooses one. It then has to pass the fine tests: clear of walls
   by `clear` (70), at least `roadGap` (140) from any road or kerb (never on a running lane), clear of posts and
   street furniture, and at least `depotGap` (520) from a charge depot's pad. The `front` test only lowers a spot's
   chance. After a pick, every candidate within `apart` of it is removed. The throw stops at the hood's count.
5. **The kinds** are drawn by `mix`, with envelopes capped at `tipMax`.

It runs once a day per hood, `budgetMs` (4 ms) a frame, so nothing is surveyed per frame. On the first call,
`worldRegionIndex` builds itself, which is a one-time cost of about 250 ms headless. That happens behind the opening
garage.

## Respawn

- **A daily set.** The same day gives the same scatter on every device. A new UTC day (`giftWorldDay`) gives a new one.
- **Ids** look like `'w' + YYYYMMDD + '.' + hood + '.' + kind + n`, for example `w20261030.0.tips3`. `n` counts that
  kind within the hood's set. Because the day is in the id, yesterday's ids never match today's. When the day
  turns, yesterday's spent ids are pruned from `tpCollect.used`. Gifts still being carried stay in the bag
  (`giftWorldItem` reads an id back into its item).
- **Each world gift can be picked up once a day.** It is gone once used, or once paid in the case of an envelope.
  The hospital's gifts stay found once, for good.
- **Saved** in localStorage (`tpCollect`, as for the hospital's). Clearing storage brings back the day's charge,
  time and crew gifts, but not its money: the server pays each envelope only once.

## Server (Devvit)

An envelope pays through `api/tipsy/gift/tip` with the id `'w<hood>.<slot>'` (`giftServerId`), where the slot is
the envelope's `n`. `dbClaimGiftTip` (tipsey-delivery/src/server/db.ts) pays `GIFT_TIP_CENTS` once per slot per
**server** day. The claim is one `hIncrBy` on `tpworldtip:<user>:<date>`, a key that expires after 3 days. The slot
must be below `WORLD_TIP_SLOTS` (14), and the hood must be The Flats or one the player owns (`tpHoodsKey`). So the
most a forged webview can take in a day is 14 x $2.50 for each hood owned. The server's balance replaces the
client's, as for the hospital envelopes. The tests are in `gifts.test.ts`.

## Focus (R17)

Gifts belong to the world, not to a story. They show and can be picked up at any time in free roam: on a delivery,
during a story, or with a dog in tow. They never show indoors, on a garage roof deck, or while a fleet vehicle is
flying. Picking one up starts nothing and asks for nothing, so it cannot break a story's focus.

## Look

The hospital's gift art (`beaconPolys` of the kind's icon) is drawn at 0.7 scale, low over its shadow, bobbing and
turning as a beacon does. When Tipsey is within `nearR`, a soft glow of the kind's colour sits on the ground under
the gift, fading with distance. It has no pulse. It is a live draw (it moves) but tiny. It is culled off screen
(`visProp`), and it shows as a ghost when a building stands over it (`xrayMirror`, tested once per spot). It is
never a cached piece, so the building cache stays flat. There are no map pins.
