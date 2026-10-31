# Handoff: the consistency pass and walk-in interiors (from session 2026-10-30)

Work branch: **`consistency-pass`**. Test page: https://cal-starfur.github.io/Tipsy/consistency-pass/. It is a copy kept on
`main` under the `consistency-pass/` folder, built by `python3 tools/publish_consistency.py <worktree of origin/main> <commit>`
and committed to main touching only that folder. Sir allowed that publish. The live game on `main` is untouched until
Sir says "push" (then follow CLAUDE.md: merge to main, rebuild, verify hashes).

Read first:
- `CLAUDE.md`
- `docs/LOOK_RULES.md`
- `docs/STATE.md`
- `docs/state/CONSISTENCY_PASS.md` (what changed, what's left)
- `docs/state/walkin_recipe.md` (how walk-ins work)

## Per-change routine (the user's rules + this pass)
1. Edit `game/index.html`, then `python3 tools/build_devvit.py`.
2. Boot headless with no page errors. Take photos, plus an MP4 clip for anything that moves.
3. Gate the commit: `node tools/review/gate.js --rev <commit>` (about 40 min, one browser at a time). NEW findings must be explained, or
   fixed. Add explained ones to `tools/review/known.json` with a note.
4. Merge `origin/main` into `consistency-pass` before publishing. Another session works on main.
5. Publish the test page (see above). Send Sir the clip.

## State at handoff (session 2, 2026-10-30)
**Pushed to `consistency-pass`:**
- Pelican Drug walk-in.
- The walk-in staff kit and rule W15.
- The museum rework.
- The 22-point review of Pelican and Trophies.

**Test page:** published at `407374c` (main `a27b1f9`, only the `consistency-pass/` folder).

**Sir's feedback this session (keep it in mind on every room):**
- **"There should at least be staff... people that fit the place and the correct amount and how they should be dressed... added into our people set."**
  - This is now rule W15: LOOK_RULES 7/8, kits/walkin.md, walkin_recipe 6.5, people.md 4b.
  - Use `walkinStaff(room, list)` and `walkinStaffSolids(items, room)`; new uniforms are `*_UNIFORM`.
  - Every new room ships with its people from the first photo.
- **"A ton of polishing errors that I would normally have to fix myself."** Before showing anything, run a harsh visual QA:
  - zoom 1 and 3;
  - both crossings, frames through the shell fade;
  - beside every fixture;
  - night;
  - collision by driving into things.
  - A QA agent found 22 issues in Pelican and Trophies that I had missed: `docs/state/walkin_review_pelican_trophies.md`.
- **On the museum:**
  - the doorway had no door;
  - the cut through the steps looked poor;
  - the front could be better;
  - the inside was cramped;
  - the art was too square;
  - the pillars overlapped the dinosaur's ropes.
  - All of this was reworked (commit `407374c`): an entrance bay with cheek walls, rails and lanterns; live bronze doors (a `slideDoors` hook on the hl path); the building 100 bigger each way (`MUS_IN.LAB`); 100+ lanes; rounder art.

**The 22 Pelican/Trophies findings are fixed** (`8e082e8`; test page published at main `0733ae3`). Kit additions: `WALKIN_NEAR_RUN`, wall tops, `winS`/`winE`, `WALKIN_WORK`, `walkinNightBoxes`, place-card hours (shut rooms are dark with no staff but still enterable: Sir to decide), and `withFade`.
- **Open:** the Trophies alley fence still looks heavy over the room (it should be at 0.3); the museum's lanterns don't glow at night.
- **Perf check:** not run since the shorter wall runs, which add cached pieces. Run it when Sir asks.

**Gate:**
- **L1 false positive:** on pocket rooms, L1 ("something round ... on the footway") is a checker false positive. `tools/review/landmarks.js` is written for shops without `vol`. Fix the checker, or add these to `known.json` with a note.
- **Pelican commit `faae994`:** 11 new findings; only the two L1s are ours. The rest are census noise: hospital see-through, crew, lifeguards, trucks, and KC6 on Palmline Nursery and Driftwood Antiques.

**The walk-in kit** (in game/index.html):
- `landmarkLabWorld(name)`: a landmark's lab frame to the world (`hl` and `hi`).
- `walkinDefine(spec)`: pushes a pocket from a building rect and door (seamless, keep, nofade, apron). Pelican uses it.
- `walkinRoom(items, R)`: in LIB scope; far walls in clipped runs, near walls low, door gap (`gapsS` for stretches the room fills itself).
- **People:** `walkinStaff` / `walkinStaffAt` / `walkinStaffView` / `walkinStaffSolids`, `drawWalkinPerson`, CITY_PEOPLE 'walk-in staff'.
- **Long pieces:** split into runs of 50 or less, each keyed at its own stretch (counters, shelves, ropes, cases); otherwise they paint over people beside them.
- **Shell fade hooks:** `hs`, `hi` and `hl`. The hs whole-unit fade skips whole-block landmarks (they fade per piece). The hi slideDoors go when the shell is half faded.

**Done:** Seabreeze Trophies, the Tidewater Maritime Museum (reworked), Pelican Drug: all waiting on Sir's test.

**Next landmarks** (walkin_recipe.md §5; I had started reading Dune Home & Garden: store SA 343.6..1063.6 × SB −1390..−880, two door pairs at a 663.6 and 751.6 (each 62 wide) on the tower front b −814; its store item is not yet `shell:true`):
- the other `hi` ones: Dune Home & Garden, Saltwater Brewing, Lagoon Baths, Driftwood Chapel, Palmline Nursery;
- then the `hl` ones: Animal Shelter, Lagoon Market Hall, Ferris Taylor Cottages;
- large later: Tide Pool Elementary, Palmline Tower, Cove Grove, the airfield terminal.

**Gotchas learned:**
- **The trophy door wouldn't fire.** A shop's front holds Tipsey about 44 off its door line, so use `glass: 60`.
- **Entering then exiting at once.** With `keep`, he lands on the apron, so the door needs its own `out` test past the apron (`walkinDefine` does this).
- **The autopilot is a bad test driver.** `gothDrive` drops him at its target when stuck, so it can fake an entry. Watch `_inside`.
- **Back walls drawn under the railing.** A single back-wall piece keyed at the room's corner draws under exterior things behind the building, so split it into runs (`walkinRoom` does).
- **Library constants aren't global.** Constants inside the LIB closure (40615..~73040) aren't global. Export them via `window.__X` (as `TIDEWATER_MUSEUM`).

## Museum gate result (finished after the handoff was written)
`GATE FAIL: 11 new, 11 fixed, 0 page errors`. Only one finding is about the museum:
- **L1, 'Tidewater Maritime Museum Interior' (a 542..586, b 182..226):** the lobby column at (560, 200). Its solid is
  the circle form `{ c, r, h }`. Check that `parkLandmarkVol` and the L1 checker both read circle solids. If not,
  give the four lobby columns a `volRect` square instead.

The other ten are the usual actor-census noise and hospital pairs, none caused by the museum:
- hospital see-through walkers;
- crew lifting at the beach;
- lifeguards' heading;
- a minibus at a light;
- vehicles handing over between draw paths.

Add them to `known.json` with that note. Then publish the test page from the museum commit, or from HEAD (`ce30ca2`, Pelican off).

## World regions (step 1, 2026-10-30)
Sir's call: the edge of Costa Palma (Pelican Harbor, the beaches, the boardwalk, the pier, North Sunset Shore, Sierra
Vista, Mirador Heights, the foothills) are districts of The Flats, open from the start; the mountains and the sea belong
to nobody. Step 1 is done: `WORLD_REGIONS` names every region and a cell index tags every cell (`regionAtWorld`,
`regionAt`, `districtAt`, `districtAtWorld`, `window.__WORLD_REGIONS`). Nothing reads it in play and `hoodAt` is
unchanged. The table and what each region holds: `docs/state/world_regions.md`. Survey: `node tools/review/regions.js <out>`.
Update (Sir, 2026-10-30): the wrap strips (The Boardwalk, Sunset Shore, Driftwood Beach, The Foothills) are owned stretch
by stretch by the hood each borders (`ownerAt` / `ownerAtWorld`, per-hood cells in `worldRegionsList`, `owners.png` in
the survey); every north terrace is The Foothills, The Mountains start behind them (`northHillsTopY`).


## Session 2, later: planning pages and decisions (2026-10-30)
**Pages, published as Claude artifacts. The sources are in the session scratchpad and are not kept, so republish from the repo docs if they are lost:**
- **Flats dead-space report** (v3): https://claude.ai/artifact/NeZfQ6ZNFHyjwMY8xo6PsD. It has 13 Flats areas plus 14 (waiting on Sir), and areas 9 and 12 moved "beyond the Flats". New areas: 15 (Pelican Fish Market, fishmonger Nell) and 16 (Sunset Shore Surf School).
- **Fleet redesign** (round 2): https://claude.ai/artifact/YRa9PS1rRjfLr4HWyUZmWS. The doc is `docs/fleet-redesign.md` (DRAFT, awaiting Sir's approval).
- **Mission audit**: `docs/state/mission_audit.md`. It covers 7 missions and proposes rules R1–R16 for a new "10. Missions" section of LOOK_RULES. These are NOT yet approved, and R7 (markers: GPS only or beacons?) is Sir's call.

**Sir's decisions:**
- Palma Bay is the sea's name.
- Mirador Heights belongs to The Bluffs, not the Flats.
- Wrap strips are owned stretch by stretch (the hood each stretch borders).
- All the terraces are foothills.
- The fleet stays unlocked for testing.
- The fleet is autonomous only (no work van, no patrol boat).
- Night and sunset missions are available only at the real time of day; a started one keeps its time.
- **Fleet launch:** no camera glide. Use the garage as now; Play opens the door of the vehicle's own bay and it pulls out, the way Tipsey does.
- **Fleet bases:** several across the city.
- **Flying height:** build both auto and manual, behind a toggle.
- **Planes:** automatic take-off and landing, and they come last.
- **Road vehicles:** they respect kerbs and never tip; a hard hit blows a tyre and the crew changes it.
- **Fleet units:** unlocked units appear in town and earn no tips.

**Open with Sir:**
- the fleet lock flip (re-lock everyone?);
- the garage: show a big vehicle in its own bay as soon as it is picked?;
- the lookout on the mountains, or the Flats' harbour terrace;
- the pier is behind University's lock: let Flats players onto it?;
- the region index and the lock disagree by half a block on the Flats' east and south edges (proposed: the index follows the lock);
- the fish market on a housing rim lot;
- the Mirador developer (Alta Mira Land Co. recommended);
- approval of mission rules R1–R16, and fixing the missions (Devvit saves first).

**Next build, once approved:** fleet P0 (the registry and testing switch), then P1 (launch bays and the Flats' bases), then P2 (rotor flight and The Lighthouse Run at the Fleet Station).


## Sir's answers to all open questions (2026-10-30, latest)
**Fleet:**
- Lock flip: re-lock everyone; missions already done still count.
- The garage shows a big vehicle in its own bay at full size as soon as it is picked ("i dont like the tiny versions").
- The redesign is APPROVED: build P0 onwards.

**Missions:**
- Rules R1–R16 are approved, to be written into LOOK_RULES §10.
- R7 is BEACONS everywhere, consistent with the pickups ("cleaner").
- Fix the old missions to the rules.
- The heart run ends with the doctor meeting Tipsey face to face in the ER (no fade, no "hours later").

**Flats builds:**
- No lookout for now (the mountains come later; area 14 is dropped from the plan).
- The fish market on the PELICAN HARBOR lot is approved, as a walk-in big enough to drive round inside.
- The half-block edge: Claude's discretion; make the index follow the lock.
- The build order is approved.
- The Mirador developer is **Alta Mira Land Co.**
- Sunset Pier is not the Flats': later work (an edge of University).

**Walk-ins:**
- Lock rooms when shut.
- At closing, people walk home through the front door and it is locked behind them.
- Visitors: whatever feels most real (arrive and leave through the door over the day).
- Fix the Trophies alley fence.
- Add a night glow for landmark lamps (the museum's lanterns).

**Not now:** the perf check, and pushing to main (Sir says when).

**Built (2026-10-30):** fleet P0 (the `FLEET` registry, `FLEET_TESTING` on, `?fleet=locked`, the Fleet tab by class with base and mission; driving unchanged) and the region index edge fix (the index follows the lock: `hoodCellAt`); see docs/fleet-redesign.md "P0 as built" and docs/state/world_regions.md.

## The missions fix (2026-10-30, after Sir's answers)
- Rules R1-R16 are LOOK_RULES section 10; the kit contract is `docs/kits/missions.md`; what was fixed and what is open is `docs/state/mission_audit.md` section 5.
- The kit (`game/index.html`, "THE MISSIONS KIT"): `MISSIONS` (the board's Stories), `missionBusy`, `missionWindowOpen` (the Cake Run and Gus's favour at dusk, 17-20), `missionComplete` (server: `TS_MISSIONS` + once-ever tips `heart`, `luna`), `missionTipOver` (spill / crewReturns), one `meetSpot` with `meetCoverAt`, `meetApproach`/`meetStand`, `walkPathAt`.
- The heart run ends face to face in the ER (Dr. Okafor from the trauma bay); Luna walks everywhere; her mom is a Flats house's household (776 Marina Way).
- Server additions: `api/tipsy/dog/shelter`, `api/tipsy/arcade`, the profile's `dogsHomed`, `shelteredDogs`, `arcadeCredits`.
- Open: the shelter's painted door, Forno's cook has no counter post, the nav and bay-arming copies, `meetCoverAt` beyond the street and the mall, R6 on Tipsey himself.
**Walk-ins, done (2026-10-30):** the rooms keep their day (W17: lock when shut, staff and visitors out through the door at closing and the keyholder locks it, in at opening, visitors over the day), Seabreeze Trophies' alley gate is cut to the dado while he is in, and landmark lamps glow at night through the lamp kit (`lamps` + `queueLandmarkLamps`: the museum's lanterns and standards).
**Focus, done (2026-10-30):** a story under way hides the deliveries (world, map, GPS) and refuses taking one ("Finish <story> first."); a story's start waits while an order is aboard; all back quietly when it ends (`tipseyFocus` / `deliveryHidden`, missions kit; LOOK_RULES R17).
**Today's Delivery removed (2026-10-30, Sir: "a remnant that never got deleted"):** orders at shops are the only delivery loop. Gone: the drawer's "Pick up ready" row, the map's daily-delivery pin (the order aboard keeps a plain drop-off marker, `tpDropoffPin`), the search rows "Today's Delivery" / "Next Delivery" / "Drop-off", the no-shop path of `tpBackToDailyRoute` (now `tpRouteToPickup(shop)`), the free-roam "TODAY" order card, and the hydrant/slalom "Today's route" exits (now "Explore", landing in free roam, so GO no longer restarts a day's route). Kept: `generateRoute`/`loadRoute` (the world), the rung and `pickupShopName` seeding `tpPickupSpread`, the daily best.
**Focus, one thing at a time (2026-10-30, Sir: "the only thing possible to do multiple is deliveries"; "while carrying an order tipsy can rescue a dog just not if its a mission"):** whatever Tipsey is doing hides everything else; only deliveries stack. A story hides deliveries, every other story and the challenges (bays, beacons, offers, board rows, map pins, search rows) and no lost dog or stray can be taken on; an order aboard or a dog being taken home hides the stories and challenges, while orders still stack and one dog can be rescued with orders aboard (lost dogs now run in delivery mode too). The "<story> can wait: deliver the order first." toast is gone; coming back is always quiet (`storyFocus` / `storiesHidden` / `dogsLocked`, missions kit; LOOK_RULES R17).
**Reddit win/fail removed (2026-10-30, Sir: "keep the daily leader board. Keep the Regular trophy ... get rid of the Reddit win/fail altogether"):** on Reddit a delivery, hydrant jump or cone slalom now ends as on the web (receipt / the game's own card, then free roam). Gone client-side: the Delivery Log composers on every fail and win card (tdFx/twFx/tsFx/tsfFx), the unposted-win/-fail blocks on GO, pickups, map, mission starts and quits, the restored crash scenes (`tpRestoreFailScene`, `tpRestoreHydrantCrash`, `tpRestoreSlalomCrash`, `tpRestoreWinScreen`), the follow-for-$25 prompts and the 5-tap fail debug readout; the ladder rung now advances on every build at the delivery's end. Server: endpoints `fail`, `fail/comment`, `fail/resolve`, `follow`, `win`, `win/comment`, `slalom/win(/comment)`, `slalom/fail(/comment)`, `hydrant/fail(/comment)` and their db/types (fail-pending, comment and follow bonuses, `TS_CONTINUE_CENTS`) are gone, and `SUBSCRIBE_TO_SUBREDDIT` left devvit.json. Kept: `api/tipsy/best` + `best/submit` (showWin's scoring), `api/tipsy/play` (countPlay), the history row `tipsyProfileOnDelivery` writes (the Regular trophy reads it), milestone comments (`postScoreComment`).
**Fleet P1, done (2026-10-30):** the bay kit (`'Fleet Bay'`, `fleetHalls`) and the Flats' bases F2 (harbour plaza: hangar hall + boathouse), F3 (Marina Parking's forecourt: its ground floor is too low), F4 (a drive-through hall across the fuel farm), F5 (Market Hall yard shed); picking a vehicle cuts the garage to its own bay at full size, Play opens its door, Send home into any bay of its kind; boats wait in the boathouse for P5 (docs/fleet-redesign.md "P1 as built").
**Lost items (2026-10-31, Sir: "Lost items ... good karma written all over it", then "no new karma count"):** four a day per owned hood from the gifts' survey (wallet, phone, keys, purse, dog's collar, lunchbox), each tagged with a real house and one of its household; carry two, RETURN in the bag routes the GPS, a beacon and pin at the door; stopped there the owner comes out face to face, thanks, tips $1-$5 (server once per item: `api/tipsy/lost/return`) and goes back in with it. No karma stat: the collect save counts returns for the Good Samaritan trophy (10). Docs: docs/state/gifts.md "Lost items".
