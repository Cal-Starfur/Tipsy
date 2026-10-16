# Keepsakes: items that unlock the story

Design note, agreed 2026-10-16. Nothing here is built yet. This is the plan
other sessions should build to.

## The idea

The garage wall's "trophies" stop being generic cups. Each one is an **item**:
something Tipsey earned that a person in the world will one day need. Using it
spends it, and spending it moves the story forward. Achievements now unlock
gameplay instead of only decorating the garage.

## The loop

1. **Earn it.** You earn an item by finishing an achievement or mission, or by
   finding it in the world (the Marina General items already work this way).
   **Each achievement is earned once.** No repeats, no second copies.
2. **It goes on the wall** (the garage's trophy and stash shelves). Each item is
   its own little model, not a cup. Tap it to read its card: what it is, where
   it came from, and (once it's known) who needs it.
3. **Someone has a problem.** People in the world, like Luna or the Seabreeze
   Ballroom's doorman, meet Tipsey face to face (`meetWalk` / `meetTick`) and
   tell him what's wrong. Tipsey tells them not to worry: he knows how to help.
   That starts a **story mission** (see below).
4. **Items play a part in the fix, not a 1-to-1 swap.** An item is one step in
   a chain of things that have to happen to solve the problem. If the step needs
   an item that's on the shelf, Tipsey drives to a charge depot, takes it off
   the wall into his bag, and carries on.
5. **Used up, it's gone.** An item used in a step leaves the wall for good,
   which frees its spot. Finishing the story often earns a new item.
6. Because items are spent, **10 spots is enough**. The wall holds what you've
   earned and haven't spent yet. Nothing more.

## Story missions

A story mission is a short story with a problem, a plan and a chain of steps.
It is not a "bring me X" fetch quest.

- **The problem:** someone Tipsey meets is stuck. What they say is about their
  trouble, not about an item.
- **The promise:** Tipsey reassures them ("Don't worry, I know what to do").
  The mission card shows the goal ("Help Rosa open the café on time"), not a
  shopping list.
- **The chain:** a series of steps, each one a place to go, a person to meet,
  something to deliver or do, or an item to use. Steps can:
  - use an item somewhere other than with the person who asked (e.g. use the
    fire helmet to get past a smoky alley),
  - hand an item to a *different* person, who does something in return,
  - need more than one item over the whole story,
  - turn one thing into another (deliver the punch card and get a key back),
  - bring in other people, who meet Tipsey face to face too.
- **The fix:** the last step solves the problem. The person who asked thanks
  Tipsey face to face, and the reward can be money, a skin, a new item, or a
  door opening somewhere in the world.

**Example (illustrative only):** the doorman says the gala's lights are out and
the band can't play. Tipsey says he'll sort it.
1. The electrician won't come out without the right paperwork, so Tipsey
   collects a VIP card from the shelf. (The card is a story item; earning it
   comes from the High Roller achievement.)
2. Tipsey shows the VIP card at the mall's back room, and the manager lends him
   a generator.
3. He delivers the generator to the ballroom's back door. It's heavy, and a
   tip-over means the crew helps him back up.
4. The lights come on, the doorman thanks him, and he earns the Gala Pass.

The VIP card was used in step 2, with a different person from the one who asked.

Each story mission is played once, the same as each achievement is earned once.
If a step needs an item the player hasn't earned yet, the mission says what's
missing and how to get it (e.g. "You'll need a VIP card: earn $500 in lifetime
tips"), so the wall and the achievements point at each other.

## Tipping while carrying an item

No penalty. The crew that rights Tipsey picks up anything he dropped and
**hands it back to him** face to face (meetWalk/meetTick). The crew member says
something like "Dropped this, buddy." and Tipsey says thank you. The mission
continues.

- Reuse the crew that already shows up after a tip-over, not a new character.
- This replaces the hospital items' current rule (`collectLose`: a tip sends
  carried items back to the rooms they came from) for story items.
- Gifts (charge pack, tip envelope, extra time, crew pass) are separate. They
  are bag consumables, not story items, and keep their own rules.

## Skins

A skin unlocked by an achievement stays owned forever. Spending the item never
takes the skin away.

## Achievements become items (draft, to refine)

| Achievement | Item | Could unlock |
|---|---|---|
| First Delivery | First parcel stub | The opening story mission |
| Regular (5 days) | Diner punch card | A regulars-only errand |
| 5-Day Streak | Palm air freshener | (open) |
| Big Tipper | Gold coin | Pay someone off or get past a gate |
| Speed Demon | Stopwatch | A rush delivery with a tight clock |
| High Roller | VIP card | The mall's back rooms |
| Hydrant Hopper | Fire helmet | A firehouse mission and the Stunt Jump |
| Slalom Master | Gold cone | The road crew opens a closed street |
| Lifeline (heart run) | (open) | (open) |
| One of Us (Luna) | Bat pin | Luna's next errand at American Gothic |
| Hospital finds | Teddy, pills, test tube, scalpel | Marina General story errands |

The doorman's GALA PASS (cake run) is already an item of this kind and should
fold into the system.

## What's already in the code

- `COLLECT` / `tpCollect` (`game/index.html`, around line 21288): found,
  carried, stashed on the shelf, taken back down.
- `COLLECT_USES`: a slot for each item's uses (`at` + `run`), currently
  empty. It's where "someone needs this" is meant to go.
- `collectApply`: the USE button. It already removes a used item for good
  (`tpCollect.used`).
- `TP_TROPHIES` and `depotTrophyWall`: the current achievement list and the
  generic cups to be replaced.
- Known bugs on the current wall: 11 trophies but 10 slots (Slalom Master is
  never shown), and Stunt Jump Master can't be earned.

## Still to decide when we build

- **Saving across devices:** items carry the story, so they have to be saved
  on the server for Devvit, like `missionsCompleted`, not only in
  localStorage.
- **The profile Trophy Case:** probably becomes an item log (earned, used,
  what each one unlocked).
- **The wall's look:** a model for each item, with a tap-to-read card.
- **The story missions:** each problem, its chain of steps, and which items each step uses.
- **Data shape:** probably a mission as an ordered list of steps (go / meet / deliver / use item), so new stories are data, not new code.

## First story: "Fourth Place" (agreed outline, 2026-10-16)

**The item:** the First Delivery trophy, now **gold**: a small cup with a
parcel on top, engraved "First Delivery". It's a participation trophy,
awarded for starting, not winning. It's earned on Tipsey's first completed
route (today that trophy has `reward: null` and arrives silently, so earning
it needs a proper moment).

**The setup:** the town's **soapbox car race** at **Tidewater Green** (the park
on blocks 0,3 and 0,4, by North Sunset Shore) is already over. Trophies went to
the top three. The judge notices the kid who came **fourth**, one place off the
podium and with nothing to take home, and sees how upset he is.

**The chain:**
1. **The judge's problem.** The judge meets Tipsey face to face
   (`meetWalk` / `meetTick`) at the park and explains. Tipsey: "Don't worry, I
   know what to do."
2. **The trophy.** If Tipsey isn't carrying it, the GPS sends him to the garage
   to take the gold First Delivery trophy off the wall.
3. **The trophy shop.** He takes it to the trophy shop, where the engraver
   rebrands it for fourth place. The item changes from "First Delivery trophy"
   to the kid's trophy.
4. **Back to the judge.** He delivers it to the park. It's a carried item, so
   if he tips over, the crew hands it back and the story continues.
5. **The giving.** The judge presents it to the kid while Tipsey watches, and
   the kid lights up. The judge thanks Tipsey. The story ends there: no
   recurring character (Tipsey will have plenty of other friends).

**The empty slot:** the trophy's spot on the wall just waits for the next item
a mission needs, which isn't known yet. Nothing special fills it.

**Built (2026-10-16, preview only):** Seabreeze Trophies on block 1,4's south
side, on the park corner, and a charge depot (The Flats Charging 4) on the
same block's near corner. The rest of the block is meant to fill with more
shops later.

**The trophy shop (new):** there isn't one in the game. Proposed site: block
**1,4**, the commercial block directly east of Tidewater Green across the road.
It has no shops at all today (a bare paved lot, checked headless 2026-10-16),
so a shop there touches nothing else. Only edges 1 and 2 face the camera
(the HOOD_SHOP_SITES rule), so it goes on **edge 2** (the south frontage),
near the corner closest to the park. It needs:
- a new shop model in `labs/flats-shops.js` (none of the existing art is a
  trophy shop),
- a `HOOD_SHOP_SITES` row, e.g. `[1,4, 2, ["<name> Trophies"]]`, which gives it
  a map pin and search entry,
- a name: something in the Flats' style (Tidewater / Seabreeze / Sandpiper /
  Pelican ...), e.g. "Seabreeze Trophies & Engraving".

No other block nearby is free: 1,3 (Palmline Nursery: greenhouses and growing
beds) and 0,5 (Dune Home & Garden and its car park) each fill their whole block,
even though the shop list names only one edge.

**Still open:**
- The judge and the kid: names and looks.
- What the new engraving says.
- The trophy shop's name and look.
- Where the race scene is set up inside Tidewater Green (the finish line,
  the podium, the parked soapbox cars).
- The reward (a tip, a skin or decal, or nothing beyond the moment).
