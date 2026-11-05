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

# Lost items (wallet, phone, keys, purse, dog's collar, lunchbox)

Sir, 2026-10-31: "Lost items. A wallet, phone or keys with an address tag. Return it to the owner's door, where they
meet Tipsey face to face, for a reward. It's a tiny side errand that uses the people and doors we already have." Then:
"no new karma count".

All in `LOST_ITEMS` / `LOST_ITEM_KINDS` (game/index.html, after `giftWorldTick`).

| Key | Value | Meaning |
|---|---|---|
| `perHood` | 4 | a hood a day (slots 0..3: the server's `LOST_SLOTS`) |
| `apart` | 3 | blocks between two of them |
| `giftGap` | 0.8 | blocks from any of the day's gifts |
| `mix` | wallet 22, phone 20, keys 24, purse 12, collar 10, lunch 12 | how likely each kind is |
| `ownerR0`, `ownerR1` | 1500, 7000 | the owner's door this far from the item if one is, else the nearest few |
| `hold` | 2 | in the bag at once; a third stays where it lies (a card says why) |
| `r`, `nearR` | 95, 1300 | pick-up radius; the glow shows within this |
| `s`, `dz` | 0.6, -62 | drawn smaller and lower than a gift |
| `glintMs`, `glintOn` | 2600, 300 | a white four-point glint, 300 ms every 2.6 s |
| `homeR` | 240 | stopped this close to the owner's front path, the owner comes out |
| `trophyAt` | 10 | Good Samaritan |

Kinds and tips (`LOST_ITEM_KINDS`, must match db.ts `LOST_RETURN_CENTS`): wallet $5, phone $4, purse $4, keys $3,
dog's collar $2, lunchbox $1.

- **Where.** Chosen in the gifts' daily survey (`giftWorldSurvey` hands its candidates and fine tests to
  `lostItemPickSet`), so the same reachable ground, the same lanes kept clear, the same seeded day (its own seed
  stream: the gifts' scatter is unchanged). Stored on the hood's set as `GW.sets.get(hood).lost`.
- **Whose.** Each has an owner door: a real house front door (`homeDoorsOf`) whose owner and address hood are the
  item's hood, never two of the day's at one door, and one person of that house (`householdOf(door).people[who]`,
  drawn with `folkLook`). The tag's address is `lostDogAddress(door)` (e.g. "134 Marina Way, The Flats").
- **Ids.** `'l' + YYYYMMDD + '.' + hood + '.' + kind + '.' + slot`, e.g. `l20261031.0.wallet.2`. Carried items keep
  their door, person and address in `tpCollect.lostMeta[id]`, so they survive reloads and the day turning.
- **Pick up.** Driven over (`lostItemPick`), as a gift: a card with its icon and the tag's address. With no other
  GPS errand in free roam, the GPS is set at once. Carry-only: never stashed (`collectStashable`); a tip-over keeps
  it (R5 `keep`: `collectLose` skips `c.lost`). It stays in the bag until returned, across days.
- **The bag.** One row a lost thing: "Lost wallet", "Tag: 134 Marina Way, The Flats", RETURN (GPS
  "Return to 134 Marina Way", `lostItemRoute`) or GUIDING.
- **Beacon and pin (R7).** While carried: a beacon in the item's own icon over the owner's front path
  (`lostItemGate`, 70 out from the building line) and a teal map pin with the icon at the door. Neither during a story.
- **The return (`lostItemTick`).** Stopped (|v| < 0.02) within `homeR` of the path: the owner's door opens
  (`houseDoorsOpen` reads `lostItemAtDoor`), the owner walks out to him with `meetWalk(ow, step, t, side)`: side by
  side across the screen, on their door's side unless that spot is blocked or covered (`meetCoverAt`) and `meetTick` holds and turns him; their thanks in character on the speech
  card (`lostItemSays`, by kind, the time of day in it; the collar names the house's own dog); "Happy to help!" pays
  (`lostItemDone`) and they walk back in with it in their hand, the door shutting behind them. Listed in `CITY_PEOPLE`
  ('lost item owners'); the house is quiet while they come out (`addrQuiet`). Leaving trip mode mid-meeting walks them
  back in and keeps the item in the bag (R1).
- **The count and the trophy.** No profile stat (Sir: "no new karma count"). The collect save counts the returns
  (`tpCollect.returned`); the Good Samaritan trophy (silver, ten returned) reads it.
- **Expiry.** Unreturned in the bag: kept until returned. Left in the world: gone with the day's scatter. Returned ids
  sit in `tpCollect.used` for their day and are pruned when the day turns (`giftWorldDay`).

## Server (Devvit)

`api/tipsy/lost/return` `{ id }` (`dbClaimLostReturn`, db.ts) pays the kind's `LOST_RETURN_CENTS` once per item:
one `hIncrBy` on `tplostret:<user>:<item day>` field `<hood>.<slot>` (expires after 4 days). The slot must be below
`LOST_SLOTS` (4), the hood owned (The Flats or `tpHoodsKey`), and the item's day today or up to `LOST_RETURN_DAYS` (2)
before the server's today; an older one is thanked in the game but unpaid. A forged kind on a paid slot pays nothing.
Most a forged webview can take: 4 x $5 a hood a day. The server's balance replaces the client's. Tests in
`gifts.test.ts`.

## Focus (R17)

Like a dog rescue: picked up and returned with orders aboard or a dog in tow (one dog and lost things mix). During a
story they stay in the world and cannot be picked up, and a carried one's beacon, pin, RETURN and the return itself
wait till the story ends ("Finish <story> first." on RETURN). Carrying one hides nothing: it can wait in the bag.

## Console seeds (the artifact boots with empty storage)

- Nine returned, so the next return earns Good Samaritan: `tpCollect.returned = 9; collectSave()`
- A lost thing straight into the bag (today's first in The Flats):
  `(() => { const c = GW.sets.get(0).lost[0]; tpCollect.lostMeta[c.id] = { door: c.door, who: c.who, addr: c.addr }; tpCollect.carried.push(c.id); collectSave(); })()`
