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
5. Publish the test page (see above). Send Sir the clip. **Standing permission (Sir, 2026-10-31): "i dont want to get in the way of you publishing the test page in the future i want you go to ahead with that on your own". Publish the test page without asking, after each merged and checked change (boot clean, web and Devvit).** It touches only the `consistency-pass/` folder on main. The live game still waits for Sir's "push".

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
**Fleet P2, done (2026-10-31):** the rotorcraft fly (`FLEET_CTRL.rotor`): a real height, auto or manual (the Fleet tab's Flying height, `?fly=`), walls only when taller than it flies, the shadow on roofs and streets, view 2 in the air, the apron pads, Play rolls out and takes off, Land / Take off, home rolls back into its lane; then The Lighthouse Run (`lighthouse-run`: the drone lent at the Fleet Station, the fog, Ines at the light) (docs/fleet-redesign.md "P2 as built").
**Lost items (2026-10-31, Sir: "Lost items ... good karma written all over it", then "no new karma count"):** four a day per owned hood from the gifts' survey (wallet, phone, keys, purse, dog's collar, lunchbox), each tagged with a real house and one of its household; carry two, RETURN in the bag routes the GPS, a beacon and pin at the door; stopped there the owner comes out face to face, thanks, tips $1-$5 (server once per item: `api/tipsy/lost/return`) and goes back in with it. No karma stat: the collect save counts returns for the Good Samaritan trophy (10). Docs: docs/state/gifts.md "Lost items".
**Fleet P2 fix (2026-10-31, Sir: "put the fleet station behind"; "he doesnt go high enough to clear buildings"):** the hangar hall and its pads behind the harbor house in their own yard with a drive up the house's west side (the plaza's flags back, the van's lane up the drive, the Lighthouse Run's visitor bay there, 90 s); flight clears ordinary buildings in auto, hops over what it is pushed into, says "too tall" over its ceiling, and has UP / DOWN buttons and a height bar in both modes (docs/fleet-redesign.md "P2 fix").
**Fleet Station leftovers (2026-10-31):** the hangar lit at night (a floodlight bar over each door through the lamp kit, edge lights round each apron pad: `FLEET_BAY_LAMP`), the yard's dark joint gone (its kerb edging only on the sand sides), and the drone over Tidewater Maritime Museum draws solid and no longer opens the walk-in (the prop x-ray's cover line is a world height; a flyer in the air takes no door) (docs/fleet-redesign.md "P2 fix", "Done after").
**Fleet hangar to Sun Deck Airfield (2026-10-31, Sir: not behind the harbor house, at the airfield):** the rotorcraft hall (F7h, base F7 "Tipsey Fleet at Sun Deck Airfield") on the grass east of the terminal, doors south onto three pads on the airfield's own concrete, a compound with its own street gate (`AIR.fleet`, `AIR.drives[1]`, `FLEET_GATE`: no code) and the visitor bay inside it; Sea Lion Point and the plaza as before f9c9ce8 (flags and boathouse kept; F2 is the boathouse alone; the van's lane to the plaza's west end); the Lighthouse Run re-planned (drive to the airfield, Joss the crew chief lends the drone, 4:00 fog timer for a 170 s flight, the harbour master thanks the drone over the quay, then home) (docs/fleet-redesign.md "The Fleet hangar moves to Sun Deck Airfield").
**Pelican Harbor: the back lot is park, the shop is open (2026-11-01, Sir: "get that parking lot off ... a park with plants and sand, but the shop itself should be active"):** the grey slab behind the harbor house was the paving under the whole `bldg` box (700 behind the hall, 1,150 behind the wing); the house now has its own footprint (`harborGeo().house` from `PH_PLAN`, solid / fly / map / regions / x-ray `harborHouseHeightAt`) and Sea Lion Point runs on over the rest (rects D, E, own seed: sand, cypress, agaves, ice plant, sage, dune grass; a path hugging the back walls round to the plaza path, a link north to the sea-side path, two benches, a picnic table and bin on a seating spot; the house drawn after him behind it, ghosted). The shop keeps the Chandlery's hours (8-18, latched while unseen: `harborOpen`): open = lit windows and OPEN, the clerk (the Lighthouse Run's, now in `CHANDLERY_UNIFORM`) under the awning, two visitors (`PH_LIFE`) from past the view's edge into the chandlery through its kit door (`shopDoor`, which now records its set-back: `boff`) and out with rope / a lifejacket / a bag, or to the new tide board and the basin rail; shut = dark, CLOSED, clerk home (she comes out of the door if the run needs her). The watch officer walks the tower's gallery round the clock, its lantern room lit at night; the Port Office's two lanterns through the lamp kit.

**Tidewater Kart Works + Number 4 Builds a Winner (2026-11-01, Flats build order area 3):** the soapbox club's red gambrel barn on block 1,4's north-east (an hs shop on edge 1, `KW_PLAN`), a walk-in through its roll-up (`walkinDefine`, mechanic, parts clerk, two club kids; the roll-up down at closing), its yard on the bare paving (test chute, kart bays, plywood store, tables: `KW_YARD`, cached, solid); the derby's course and ramp now stay after Fourth Place (its dressing goes); the story after Fourth Place: number 4 by his bale, the mechanic, a wheel set from Palmline Nursery (across the street) and racing red from Dune Home & Garden (0,5), each clerk out of his door to a post by the bay (`kwPostAt`), so the whole story runs about 6 to 7 minutes at a fair pace, the build, the test run down the ramp against the derby's best, his #4 bib and the Racing Stripe skin (`kart-winner`, `pit-crew`, `racing-stripe`, server too). The fleet AMR carrying the chassis is left for later (docs/kits/missions.md, walkin_recipe.md 6.9).

**Standing instruction (Sir, 2026-11-01):** after the Motor Lodge, keep working down the approved Flats build order until it is done (Kart Works, Pelican Fish Market, Paw Point, Veterans Memorial, Surf School, Security Post, KTDE radio, Fire Training Yard, then the foothill flyer corridor + the letters, then the Skate Park as scenery; no lookout). Add interiors where they make sense and missions where they fit. Publish the test page after each lands.
**People drawn for what shows (2026-11-01, Sir's six decisions):** `PERSON_DRAW` -- fused pieces at view 2 and a far level at view 3 (full at view 1), lean `quadOn`, no person shadows, culled off screen with a 70 px margin, hidden-ness decided by what is drawn (the cached pieces' opaque shapes, walk-in holes cut out) so hidden walkers and interior people are not drawn, ghosts only for people who matter (`keyPerson`, or within 320 of him) and drawn once (docs/state/people.md, LOOK_RULES 7 and 8b).
**Pelican Fish Market and Catch of the Day (2026-11-01, area 15, Sir: the fish market on the PELICAN HARBOR lot, "i want to make it large enough to drive around inside too"):** the Flats' NW housing rim lot, its rim corner and the foothill toe strip behind are one rim landmark (`HOOD_RIM_SITES` 'Pelican Fish Market', x -1720..2392, y -2900..-736), one plan in world units (`FM_PLAN`) read by the drawing (LIB 'Pelican Fish Market', `queueFishMarket`: every post, truss, bed piece of 150 or less, the taco counter, tables, cold store and pylon cached through `bcDraw`; the neon fish, the bell while it swings and the ice truck live), the collision (`fmSolidAt`, first in solidAt as the fleet's halls), the ground (`fmSurface`: the toe strip now answers 'sidewalk'; `fillFishMarketGround`: paving, the hall's concrete, the yard to the gate round's curve, no grass), the x-ray and flyers (`fmHeightAt`, `fmRoofZ`). An open-sided tin-roofed hall 3200 x 1020 on green steel posts (eaves 520: set so Nell shows behind her beds from the street), ice beds on the street side (bays C and F open to drive in), island beds, back benches, a taco counter and picnic tables at the east end, a neon fish pylon on the corner, the cold store and the market's delivery pod in the yard; he drives in and round the aisles and the roof eases off over him (`FM_LIFE.roofK`, 450 ms). Hours 6-19 (`fmOpen`, latched while unseen; TP_PLACE_COPY 'Fish market'): open, Nell, Teo, the taco cook, the porter (dock to filleting bench), four shoppers on trips from past the view's edge and two pairs eating; shut, the beds under tarps, CLOSED lit, Nell on the dock for the late trawler. The harbour's ice truck (`FM_TRUCK`) comes down Harbor Road, crosses the apron, backs onto the cold store's dock and goes, yielding to him. The mission **Catch of the Day** (`catch-of-the-day`, window any; `FMR`): Nell at the forecourt bay, the market's pod lent from the yard (`FLEET_LOAN` 'avpod'), the three orders into its lockers, Saltwater Brewing, the Lagoon Market Hall and the Grand Pelican against an 8:00 ice timer (the Lighthouse Run's pill), each chef out to the pod's seen side opening their own locker (`fmLockerOpen`, `fmPodData` -> drawAvPod's open locker), Marco's plate back for Nell, her bell and the market's claps, the heart run's card; a hard bump spills (fail), the melt fails; reward $50 once (`fishmkt`), the Catch of the Day trophy, the Fishmonger skin (worn). Server: TS_MISSIONS, TS_SKINS 'fishmonger', the trophy's claim, db.ts `FISHMKT_TIP_ID`. Seed: `tpProfile.missionsCompleted.add('catch-of-the-day'); tpSaveProfile()`. Open: Saltwater Brewing's door is painted (its cook comes out of a door that does not open, as the shelter's); the kitchens' card hours do not cover a 3 a.m. run (the window is 'any' as asked); the ice limit is computed from the route (about 75,000 at 0.225), not driven.

**Airfield Corner, area 1 (2026-11-01):** Sun Deck Motor Lodge on block 8,5 (a whole-block hi landmark, `MOTOR_LODGE`: the L of rooms round the pool court, walkways and stairs, the office pavilion as a walk-in `MOTEL_IN` with clerk / night manager, the housekeeper and two guests, the crew van, a Googie pylon with live chasing arrow and VACANCY, lamps at night) and THE GETAWAY (`the-getaway`, the Cake Run's sequel: the bride at the terminal, the Gala Pass spent at the desk, a six-minute clock, the charter's take-off; Wheels Up / Just Married with tin cans / $50 / robotaxi); the terminal's doors are a live sliding pair now; `LIB.ground`'s clip no longer leaks into the next piece (docs/kits/missions.md, docs/state/people.md).
**Paw Point Dog Park and Adoption Day (2026-11-01, area 5 "Shelter lawn", the approved Flats build order):** Veterans Memorial Park's cell 1,2 beside the Costa Palma Animal Shelter (2,2), the park kept a park (its lawn is the block's ground, no plate). One plan in world units (`PP_PLAN`) read by the drawing (LIB 'Paw Point Dog Park', `queuePawPoint`: every fence piece of 300 or less, gate post, agility piece, pavilion post, the table, sign, bag station and benches cached through `bcDraw` as `paw|...`; the gate leaves live, the banner live only while it drops, the roof over all of it eased off while he is under it), the collision (`ppSolidAt` in solidAt after the fish market's: fence runs, shut gates, the agility set, fountain, pavilion, the park's people), the ground (`fillPawPointGround`: the run's chips and timber edging, the pen's and pavilion's concrete, the fountain's apron, the chip path) and the x-ray/flyers (`ppHeightAt`: the pavilion roof). The trail runs round the fence: `vetTrailOf` cuts the cell's hub, makes its two crossing spurs the ring's north (y 6854) and east (x 5658) runs at full width, drops the planting in the run and against the new runs, and plants the ring's outer sides on their own seed; no other cell's planting moves. A 1440 x 1400 chain-link run (the shelter's own mesh, posts and rail) with a double gate (a pen: the outer leaf swings north into it, the inner into the run; each opens for anyone at it with a dog, the story's people, Tipsey and the humanoid, and is solid shut), an A-frame and three jumps in a line, a tunnel, eight weave poles, a stone dog fountain with its bowl, two city benches, the sign (PAW POINT, OFF LEASH AREA) and a bag station by the path, and the shelter's open-sided adoption pavilion (teal tin gable, eave 285 so the volunteer behind her table shows; its lamp at night through the lamp kit). Life (`ppLifeTick`, `ppQueue`, `PP_LIFE`; CITY_PEOPLE 'Paw Point'): the shelter volunteer at the pavilion (`SHELTER_UNIFORM`, 9-17), three Flats households with dogs (`householdOf`: the person marked out and the dog with them while they are here) from past the view's edge along the pavement, one pair through the pen at a time (`PP_LIFE.token`), unclipped inside; the dogs play off-leash (`ppDogPlan`: the course over the A-frame and jumps, the tunnel, the weave, a drink, a chase, back to their person, a run round; `ppRingWay` routes them round the agility set), their person watching from a spot turned to them, then clipped on and home; open 6-21, latched while unseen. **Adoption Day** (`adoption-day`, window 'shops' 9-17, `lock` until 5 dogs sheltered; `ADOPT`, `AD_PLAN`): Maeve Ashby, the shelter manager, out of the shelter's door to its pavement bay face to face (meetWalk on his right), the banner from Pelican Photo and the treats from Pelican Pets, round the corner of the same block (3,1), each on its own pickup rug, each out of their shop's door with it (`shopDoorWalkers`; the printer and clerk are their shops' `SHOP_STAFF`). Tidewater Press (1,6) was the first choice and made the run 14 minutes on the GPS, so the banner moved to Pelican Photo; and the GPS now knows Veterans Memorial Park's trail (`gpsTrailNet`, hooked into `gpsWalkGraph` as the beach's walk is), which took the shelter -> Pelican Pets leg from 31,472 to about 7,600 units. Route: shelter -> Pelican Photo 6,209, -> Pelican Pets 1,470, -> shelter 7,635, -> Paw Point 3,354 (GPS ETA 241 s; about 4.5-5 min with the meetings at a fair pace), back to Maeve: Biscuit will only come to a robot, so Tipsey calls the fleet's humanoid in from past the view's edge (to his left), Maeve brings Biscuit out and she goes to it; the humanoid lent (`FLEET_LOAN`, Tipsey parked and cached, the camera kept so it eases), Biscuit on her lead (`ppLeash`) to Paw Point -- over `AD_RUN.fastV` 0.12 for 0.5 s and she slips it and bolts along the pavement, LOST_DOG's slow approach and hold to win her back; Maeve walks over and hangs the ADOPTION DAY banner (it unrolls); a Flats household's parent and kid wait at the gate; on the gate bay Biscuit goes to the kid, the parent (already standing: meetStand) says she's chosen them; in through the double gate to the bay by the pavilion, Maeve's thanks face to face, the card; then the humanoid back to Tipsey (the loan ends beside him, the humanoid walks off). Reward: the Adoption Day trophy -> Paw Print skin (worn; `SK_PAWPRINT`, HULL_PRINTS 'paws'), the Dog Rescuer's gold tag (KEY_ITEMS 'rescuetag', shelf model, rebuilt by `adTagMigrate`), the Dog Rescuer trophy shown gold, the humanoid unlocked (FLEET_MISSIONS 'adoption-day' built). Server: TS_MISSIONS 'adoption-day', TS_SKINS 'pawprint', TS_CLAIMABLE_TROPHIES 'adoption-day'. Seed: `tpProfile.dogsSheltered = 5; tpSaveProfile()` (and `NIGHT_CLOCK.time = 11` outside 9-17); done: `tpProfile.missionsCompleted.add('adoption-day'); tpSaveProfile()`. Open: the shelter's door is still painted (kit flaw 4: Maeve and Biscuit come out of a door that does not open); the family arrive and leave past the view's edge rather than from their own door (their house is a Flats house, `householdOf`, the kid is theirs by seed); dogs are not solid (as the lost dogs).

**Vista Ridge Security Post and Night Watch (2026-11-01, area 11 "Sierra Vista bench", the approved Flats build order):** the bare foothill bench east of Sierra Vista's east wall (x 8602) over Maritime Mall's back, where WG_HILLS' Sierra Vista notch eases back. One plan in world units (`SP_PLAN`) read by the drawing (LIB 'Vista Ridge Security Post', worldFrame + `see`; `queueSecPost`: the post whole, the mast, the dock, each charge post, each bed and the patrol's cones cached as `sp|...`; live and culled: the CCTV head sweeping, the charge posts' lights, the door's leaves, the monitor wall's flicker and REC light; lamps through the lamp kit), the ground (`sierraSurface` asks `spSurface` first: the gravel SITE x 8640..10100, y -4500..-2596 and the patrol TRACK up the wall to y -6100 are 'lot', the drive/forecourt/dock 'sidewalk', the post 'building'; `fillSecPostGround`: edged, flecked gravel, concrete drive and forecourt, no grass), the collision (`spSolidAt` in solidAt after Paw Point's), the x-ray (`spHeightAt`) and the GPS (`spGpsSegs` joined to `gpsTrailNet`: the service way, the drive, the track, and 2nd St's east pavement up to the gate round, which the walk graph never had). The way up is the mall's west-end service way (a 0..WA[0], 160 wide, between the parking garage and Tidewater & Co.): `mallVol`'s foot no longer shuts its last 40 at the back line. The estate's east wall is now drawn (`drawSierraVista`, the perimeter wall's stone and cap, wallY to e[1]); it was collision only, never seen. The post: white stucco on a stone plinth, red tile hip roof, a curved Mission parapet (VISTA RIDGE SECURITY) over the door bay, arched windows south and east, a lantern; the walk-in monitor room (`SP_IN` via `walkinDefine` -- `landmarkLabWorld` now answers a worldFrame entry as world -- pocket 490000,430000 (450000,400000 is the museum's); `SP_ROOM`: terracotta floor, eight screens on the north wall (gate round, the mall's loading dock, the east wall, the dock), the console facing the door, key cabinet, spare batteries, coffee counter), its door and both windows show the room (W11). People: the night guard Ray Dominguez (19-6) and a day guard at the console (`walkinStaff`, SECURITY_UNIFORM: the gate guard's company; `spShiftNow` changes over only unseen); two patrol robots on a loop along the outside of the front wall (`SP_LIFE`, yielding, eased corners). **Night Watch** (`night-watch`, window 'night' now 19-6, after `goth-uniform`; `NW`, `NW_PLAN`): Ray out of the door to the forecourt bay (meetWalk on Tipsey's left: the door's side), the dock (pad 2: his charge shared 2.6 s with the flat robot on pad 1), the loan (`FLEET_LOAN 'patrolbot'`, Tipsey parked and cached, camera kept), three camera points up the east wall (pairs of the slalom's blue-banded cones, beacon only, crossed northbound), a torch after dark (`glowInWorld`, three layers and a pool), Luna (GOTH, in Onda's pink) at the wall's foot climbing; she comes over (meetWalk beside the robot), begs; the robot home to pad 1 (loan ends); Gus at the mall's front doors with the fob from lost property (`MALL_GUARD.meet` set with `card` so his own card waits; 'fob' in `drawHandGift`/`drawCakePerson`); Luna waiting on 2nd St's pavement by the gate round (she walks there round the outside of the front wall), her thanks and her spare fob, the gate guard's "Logged in" and both booms up (`nwGateUp` in `sierraGateStep`), she walks in past the view's edge. Reward: $40 once (`nightwatch`, db.ts `NIGHTWATCH_TIP_ID`), the spare gate fob (KEY_ITEMS `vistafob`, beacon icon and shelf model, `nwFobMigrate`; meant to open Sierra Vista's side gate for later errands -- not built), the patrol robot (FLEET_MISSIONS `night-watch` built). Server: TS_MISSIONS `night-watch`. Seed: `tpProfile.missionsCompleted.add('mall-password'); tpProfile.missionsCompleted.add('goth-uniform'); tpSaveProfile(); NIGHT_CLOCK.time = 22`. Open: the service way is 160 wide and runs behind the anchor (he is ghosted there); the post is not on the map or the place sheet's search; Luna's Uniform put her mom in a Flats house near the gate, this story has her living inside the estate (Sir's first word: "she lives in sierra vista"); the brief said her shift was at High Tide, the game's Luna works at Onda (GOTH_ONDA), so the lines say Onda.

**The Veterans Memorial + Sunset Salute (2026-11-01, Flats build order area 4, "Veterans Park heart"):** cell 5,5 of
Veterans Memorial Park, the trail's four-way crossing (`VET_MEMORIAL`, `vmOf`): the hub's chip disc is a paved granite circle
(R 600, the ground pass: `fillVmPlaza` in `fillParkTrail`), a curved black granite name wall on its north-west side (five runs
of about 90, rows of engraved names as fine lines, a bronze seal from the Ferris Taylor monument's cast palette, now the
shared `FERRIS_BRONZE`), the eternal flame on a granite drum in the middle of the crossing (the runs go round it), three
flags in a row on the north-east (state, national, Costa Palma's: teal sea, gold sun and a white palm, sand below), two
benches facing the wall (the city's bench kit), and an octagonal bandstand on the south-west lawn (deck, far posts and rail
one piece, near posts, rail and roof another, the band between them). One LIB entry ('Veterans Memorial', a landmark in
pieces through `queueFramePieces` / `bcDraw`, `queueVetMemorial`), its solids filed in `owBuildWorld`, the trail's planting
kept off it (`vmReserved` in `vetTrailOf`'s `put`); live only the three cloths (`drawVmFlag`) and the flame
(`drawVmFlame`); at night the lamp kit (uplights at the wall's foot, the flame's glow, a lamp on each pole, the
bandstand's). People (`VM_LIFE`, latched while unseen): Walt (91, a Navy veteran of '52) on his bench every day 8-21, the
caretaker at his post by the flags and over to the flame, two pairs of visitors (W16 looks), the Costa Palma Community Band
on Friday and Saturday evenings 6-9 (`VM_CONCERT`). SUNSET SALUTE (`sunset-salute`, window `dusk`, 18:30-19:30): Walt gets
up off his bench to ask; the 1952 roll from the Marina Office, the brass plate cut by Cove Locksmith (he goes in to the
engraver, 7 s, and comes out with it), a wreath from Tidewater & Co.'s flower counter (all three on block 4,7, their clerks
out of their doors to camera-facing posts, open late for Walt), the autonomous shuttle bringing his old crew and a bugler
to the park's south-west corner; back at the bench, Walt sets the plate and the wreath, Taps (`sfxTaps`) from the bandstand
while the caretaker lowers the national flag and everyone salutes; Walt's challenge coin (key item `coin`) and the shuttle
(fleet unlock), server `TS_MISSIONS`. The brief's Seabreeze Library / Trophies / Florist were 33k-38k of road each from the
memorial and shut at dusk (but the florist): swapped for the nearest of each kind (docs/kits/missions.md). Paw Point (cell
1,2) untouched.

**Sunset Shore Surf School + Sunset Session (2026-11-01, Flats build order area 16, "Sunset Shore sand"):** the Flats' stretch
of Sunset Shore between Lifeguard Towers 1 and 2 (y 6256 / 18768), at y 12000 (`SURF`, one plan in world units). A new
access walk off the boardwalk: a dune path through the dunes (`duneField`'s own path and ropes, key `'ss'`; the mounds that
stood across it are left out, no other mound moves) and a plank walk across the sand (`buildShore`'s run `surfwalk`, so
`classifyShore` calls it boardwalk) to a weathered aqua surf shack on a short raised deck (`classifyShore` calls the deck and
its steps 'building', so `beachBlocks` keeps him off; not walk-in: a serving hatch, its shutter propped open 8-8, down at
night); the school's board rack, the lesson circle traced in the sand by the water with six boards drawn in it (pop-ups are
drilled on board shapes drawn in the sand), the junior-lifeguard flag post (red over yellow), a fire ring with two driftwood
seats lit 7.15-11 p.m. (the lamp kit's glow), Palmline Surf Co.'s beach stand up the sand (umbrella, table, board rack, a
feather flag; its clerk Kai), sunbathers on towels under umbrellas (9 to 7.45). Still pieces cached through `bcDraw`
(`srf|...` keys by piece, place and board counts); live only the two flags, the fire, the people, the cargo bot coming and
going, a dropped board. Solids: `surfBlocks` in owStep's blockAt. People (`ssnQueue`, CITY_PEOPLE 'Sunset Shore Surf
School', latched while unseen: `SURF_LIFE`): Mele the instructor at her post facing the class, six kids in pairs doing
pop-up drills on the drawn boards (prone paddling, the pop to a sideways stance, down again; `surfDrillAt`), the nearest
tower's lifeguard at the flag post, two surfers carrying boards to the water and back (after dark on the logs by the fire),
Kai at the stand. GPS: `gpsBeachNet` knows the walk and the sand legs (the boardwalk run between towers split at its head).
SUNSET SESSION (`sunset-session`, window `dusk`; `SSN`): at dusk Mele walks up to the top of the walk; Tipsey on the bay on
the boardwalk, she comes up the last of it to him (meetWalk on his left, meetTick); down to the bay by the circle, the
fleet's cargo bot rolls down the sand from past the view's edge and is his (`FLEET_LOAN 'cargobot'`, Tipsey parked);
Palmline Surf Co.'s stand: Kai brings three boards to its seen flank, the lid opens for the bulky load and rests open on
them; back round the sunbathers to Mele, who lifts them out and lays them by the drawings; twice. A hard bump (over
`SSN_RUN.bumpV`) drops a board on the sand (spill: a fail, Mele's sorry, the loan ends). After the second, the loan ends and
the bot rolls off; Tipsey drives to the water's edge: the kids carry their boards in, paddle out and sit out past the
break as the sun goes (the held sky set deeper over 14 s), the fire is lit, the lifeguard waves his flag; Mele's thanks face
to face, the card. Reward $50 once (`surfschool`), the Sunset Session trophy -> Board Shorts skin (worn; `SK_BOARDSHORTS`,
HULL_PRINTS 'shorts', emblem 'hibiscus'). Server: TS_MISSIONS, TS_SKINS 'board-shorts', TS_CLAIMABLE_TROPHIES
'sunset-session', db.ts `SURF_TIP_ID`. Supplier: Palmline Surf Co.'s shop (0,7) is 15.4k of road from the walk's head each
way (two trips about 14 minutes), so its beach stand on the sand supplies the boards. Seeds: `NIGHT_CLOCK.time = 19`;
`tpProfile.missionsCompleted.add('sunset-session'); tpSaveProfile()`. Open: Kai and the stand have no door (a post, as the
lifeguards'); the class is there all school day and its kids arrive and leave only while the sand is unseen (latched);
sunbathers lie still but for a knee now and then.


**Flats build order: where it stopped (2026-11-01, Sir: "Finish what we have started but don't open any new tasks"):** built and on consistency-pass, all on the test page: Sun Deck Motor Lodge + The Getaway (1), Tidewater Kart Works + Number 4 Builds a Winner (3), Pelican Fish Market + Catch of the Day (15), Paw Point + Adoption Day (5), the Veterans Memorial + Sunset Salute (4), Sunset Shore Surf School + Sunset Session (16), Vista Ridge Security Post + Night Watch (11). NOT started, waiting on Sir: KTDE radio + Request Line (2), the Fire Training Yard + Open House (7), the flyer corridor over the foothills and fly pads, then the School hill letters + Letters on the Hill (10), the Skate Park as scenery (6); no lookout (14); the pier (13) waits on the hood lock. None of this is on main yet: Sir says when to push. Open timing notes: Kart Works about 6.5-7 min, Night Watch about 4.5 min at a fair pace (7 by GPS ETA; the mall -> gate round leg is the long one). The plan text is in the dead-space report (scratchpad flats/eval_text.html, not in the repo).

**KTDE 98.1 The Tide, phase 1 of 4 (2026-11-01, Flats build order area 2, "South Plaza"):** the station on block 5,8 (`KTDE` plan, LIB entry, HOOD_SHOP_SITES 5,8 edge 2): Streamline Moderne block with a rounded corner, speed lines, ribbon windows, glass-block stair tower, lattice mast (own piece) with a live beacon, studio glass with a live ON AIR light, the lobby's live glass pair, the van parked in its lot, gravel beds, night lamps; solid. NEXT: phase 2 the walk-in (lobby + studio seen through the glass, receptionist / DJ / producer), phase 3 Request Line, phase 4 docs + proof.
**KTDE phase 2 of 4:** the walk-in (`KTDE_IN` / `KTDE_ROOM`, LIB pocket entry 'KTDE 98.1 The Tide Studios', pocket 500000,440000): lobby (reception desk, couch, gold records) and the on-air studio behind a glass partition (DJ's desk at the street glass, board, record shelf, speakers), seen from the street through the doors and the studio glass (W11); staff: receptionist, DJ, producer (`walkinStaff`, busy hands). Kit fix: `drawPersonHull` no longer hides someone `_seenThrough` (the cover test knew the building, not the hole: walk-in staff behind glass were never drawn from the street). NEXT: phase 3 Request Line (`RL`), phase 4 docs + proof.
**KTDE phase 3 of 4: Request Line** (`request-line`, any time; `RL`, `RL_RUN`): Ollie outside Tidewater & Co. (meetWalk/meetTick), Low Tide Music's clerk out to a post on 4,7's east pavement (the record), KTDE's receptionist (meetStand in the lobby), the DJ across the screen in the studio (meetStand), the dedication and a 3:00 song clock in `#lhTimer`, Maya at her gate (5,7 south, Maple Split-Level), her note back to Ollie; $40 once (`requestline`, db.ts `REQUEST_TIP_ID`), KTDE sticker (KEY_ITEMS `ktdesticker`, `rlStickerMigrate`); TS_MISSIONS `request-line`. GPS legs 1.7k + 6.5k + 4.9k + 2.9k = 16k (ETA ~3.5 min). Swapped: Cove Creamery / Low Tide Records (3,1, ~28k away) for Tidewater & Co. / Low Tide Music (4,7). Not built: the DJ calling in side missions. NEXT: phase 4 docs + proof.
**KTDE phase 4 of 4 (done):** docs (missions.md row, seeds, "a song on the clock"; LOOK_RULES 8: people behind a walk-in's glass are drawn) and proof stills / studio clip in the session scratchpad. Open: the DJ calling in side missions over the air (later work); the station van never drives off; Maya shares her name with the hospital teddy's tag (a different Maya, age 6); Low Tide Music's door faces away, so its clerk appears round the back of the block (no door seen opening).

**Flats Fire Training Yard + Open House, phase 1 of 3 (2026-11-01, Flats build order area 7, "Firehouse lawn"):** the yard on Veterans Memorial Park's cell 2,6 (`FY_PLAN`, LIB 'Flats Fire Training Yard', `queueFireYard`, `fillFireYardGround`, `fySolidAt`, `fyHeightAt`): chain-link with a top wire and a double gate in its west side facing The Flats Fire Station (live leaves, open for Tipsey and the captain), the concrete apron to the pavement; a four-storey drill tower (brick over concrete bands, windows lit at night), the hose-drill lane (asphalt ring, start line), three hydrants and their hose lines, the burn prop, the retired 1950s engine on its plinth, the captain's timing post, two flood poles lit at night (lamp kit). The trail's leaf turnaround and exit gave way: the run from 3,6 now ends in a turnaround at x 8540 (`vetTrailOf`). People (`fyQueue`, CITY_PEOPLE, latched 8-19 while unseen): two firefighters running the lane, one on the nozzle at the burn prop (live water), Captain Dana Brennan at her post with a stopwatch. NEXT: phase 2 the mission Open House (`OH`, `ohTick`), phase 3 docs + proof.
**Open House, phase 2 of 3: the mission** (`open-house`, window `day`; `OH`, `OH_PLAN`, `ohTick` from `fyTick`): Captain Dana Brennan out of The Flats Fire Station's door (shopDoorWalkers, meetWalk/meetTick) at the bay on its pavement (5650, 20420); she walks across to her timing post; The Flats Charging 4 (helmet off the shelf: KEY_ITEMS `firehelmet`, Tipsey's keepsake once he has cleared a Hydrant Jump, `ohHelmetMigrate`; the mission's `lock` until then); the brief at the yard's start bay; one lap of the hose-drill lane through four cone gates and back over the start line on a stopwatch in `#lhTimer` (record 0:40); tower smoke, kids cheering at the south fence; she hands the helmet over the fence to a junior; thanks face to face; $40 once (`openhouse`, db.ts `OPENHOUSE_TIP_ID`), Open House trophy -> Engine Red skin worn (`SK_ENGINE_RED`, TS_SKINS 'engine-red', TS_CLAIMABLE_TROPHIES 'open-house', TS_MISSIONS). The helmet is spent at the end (`tpCollect.used`). GPS: station -> Charging 4 5.5k (ETA 69 s), Charging 4 -> yard 6.9k (89 s). NEXT: phase 3 docs + proof.
