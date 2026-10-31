# Challenge missions: a plan (v2)

Proposal for Sir, 31 Oct 2026. This is v2, reworked after Sir's notes on v1: "the challange missions are ment to be 'fun' they should engage with the fleet ... it doesn't need to include existing parts of the world ... incorporate tipsy's wheel styles and fleet options. they have a rug but they also need a floating icon like deliveries". v1 is kept in `v1/`.

The code was read on branch consistency-pass, with fleet P0 and P1 as built. I booted the game headless, played both legacy challenges, and photographed the fleet, the wheel rigs and the venues. The repo was not changed.

## 1. What a challenge is

**A challenge is a toy, not a chore.** It is a short, silly, skill-based run of 30 to 90 seconds. It is played in a fleet vehicle or on a set of Tipsey's wheels, on a set piece built for it. You get juice for everything you do, a medal, and a retry that takes one second.

| | Story | Delivery | **Challenge** |
|---|---|---|---|
| Feel | A little tale | The daily job | **An arcade toy** |
| In | Tipsey | Tipsey | **Mostly the fleet, or Tipsey on special wheels** |
| Where | Real places, real people | Shops and doors | **Its own venue**: an arena, a pop-up course, a proving ground, a pocket room. Some use real places |
| Played | Once | Every day | Again and again |
| Scored | Done | Tip and time | Points or time, combos, near-misses; bronze, silver and gold; a daily board |
| Starts | Bay and beacon | Rug and shop icon | **Rug and its own floating icon** |

**Five rules of fun:**
1. **Under 90 seconds**, with retry in one tap.
2. **Every action answers back.** A pop-up word, particles, a sound and the crowd.
3. **Combos and near-misses** pay more than playing it safe.
4. **The vehicle's own trick is the game.** The arm grabs, the forks lift, the sling swings.
5. **Silly physics is welcome.** Bins flip, pins scatter, cardboard cars squash, a hydrant geysers.

## 2. What's left of the old code (unchanged from v1)

- **Both legacy challenges still run** (about 5,700 lines). They swap the live city for a frozen August route, turn off free-roam driving (`ow.on` false) and run the old lane runner.
  - **Hydrant Jump:** a rug on Pelican St at 5th, a map screen with GO, then an auto-run tap meter. The course hardly reads. Quitting teleports him to a charge pad.
  - **Cone Slalom:** a rug on bare grass in Market Dist., far outside the Flats.
- **Server:** `TS_MISSIONS` keeps `jump-hydrant` (best of 10) and `cone-slalom` (1). The trophies Hydrant Hopper (Fire Chief) and Slalom Master (Cone Dodger) work. Stunt Jump (Daredevil) can't be earned. `ClaimSlalomTip` is still on the server.
- **Being removed:** the Reddit win/fail gates, by another session. The daily leaderboard is deliveries only.
- **Beacons:** the challenge rugs already get a beacon, but it is the generic `"flag"` icon (`getMissionMats` → the beacon queue: `mm.id === "pickup" ? beaconIconOf(shop) : "flag"`). The map pins are emoji.
- **Worth keeping:** the jump maths (`HJ_JUMP`/`HJ_CH`), the red/blue gates, the 3-2-1-GO, the two ids, the trophies and the skins.

## 3. What there is to play with

**The fleet** (`FLEET`, 20 kinds). Each kind's own ability is in the registry:

| Class | Kinds and abilities |
|---|---|
| walk | humanoid (`hands`), cargobot, courierbot (`lid`), patrolbot (`patrol`), amr (`platform`) |
| road | robotaxi (`passengers`), avpod (`lockers`), avshuttle (`passengers`) |
| heavy | avsemi (`dock`), avgarbage (`binArm`), avdump (`tip`), avsweeper (`sweep`) |
| site | avforklift (`forks`) |
| rotor | dronequad (`winch`), dronelift (`sling`), airtaxi (`passengers`) |
| wing | uavplane, uavcargo (`airdrop`) |
| sail | boat:drone (`sonar`), boat:watertaxi (`passengers`, `dock`) |

**What works today:**
- **P1 is built:** every vehicle launches from its own bay.
  - F2 Fleet Station: the drone hangars and the boathouse.
  - F3 Marina Parking: the road bays.
  - F4 Sun Deck Airfield Fuel Farm: the heavy hall.
  - F5 Lagoon Market Hall: the forklift shed.
- **Driving is still P0:** Tipsey's `owStep` with per-class shims.
  - Flyers skip kerbs and water, but buildings stop them.
  - Road and heavy vehicles never tip.
  - Boats wait in the boathouse until P5.
- **Real flight (P2), car steering (P3), forks (P4) and sailing (P5) are still to come.**

**Tipsey's wheels** (the garage's Wheels tab):
- Rims: `WHEEL_STYLES`, nine of them.
- Treads: Street, Slick, All-terrain, Knobby.
- Sidewalls: Plain, Whitewall, Redline, Neon.
- Sizes: Low-profile, Stock, Chunky, Big.
- **Specialty rigs** (`gearSpec`): Monster truck, Tank treads, Lowrider (`hop: true`), Hover pads, Ball bot, Shopping cart, Walker.

**All of it is cosmetic, with one exception.** `duneTyres()` lets the Monster rig or Knobby and All-terrain treads ride over the Sunset Shore dunes, which are solid to street tyres. That is the precedent for wheel traits.

## 4. Proposal: wheel traits, for challenges only

The wheels would carry a light trait inside a challenge only, so free roam and deliveries are unchanged. **This is a proposal, not a decision.**

**Why:**
- It makes wheel choice a real choice and gives the 400 to 4,000-cent wheel purchases a use.
- It gives the same course a different line on each set of wheels.
- The dunes already prove the idea.

**The card:**
- It shows which wheels suit the course ("Best on: Slicks · Monster").
- A run on "joke" wheels pays a score multiplier.

| Wheels | Trait in a challenge | Shines in |
|---|---|---|
| Slick tread | Less side grip: he drifts, and a held drift builds a drift meter | Cone Zone |
| Knobby / All-terrain | Full grip on sand, dirt and grass; rides the dunes (as today) | Dune Dash |
| Big / Chunky size | More bounce and a softer landing (a wider landing window) | Hydrant Hop, Dune Dash |
| Low-profile | +5% top speed on tarmac; harsher on bumps | Cone Zone |
| Monster truck | Rides dunes; **crushes** junk props; soft landings; tips sooner in fast corners (high body) | Junkyard Crush, Dune Dash |
| Tank treads | Never tips on a kerb; slow; **pushes** heavy things (pins, crates) further | Strike Lane, Junkyard Crush |
| Lowrider | **Hop button** (the rig already has `hop: true`): a small jump on demand | Hydrant Hop (small levels), Cone Zone (hop the cones) |
| Hover pads | Nearly no friction (ice drift); longer airtime; can skim 2 seconds over water | Dune Dash, Hydrant Hop |
| Ball bot | Turns on the spot and moves sideways (no heading lag); pins scatter wider | Strike Lane |
| Shopping cart | A wobbly caster that pulls at random. Hard mode: ×1.5 score | any (joke run) |
| Walker | Steps over cones and kerbs (no knocks); slow | Cone Zone (a no-penalty, low-score line) |

## 5. Start markers: rug and floating icon

**Every challenge has its rug and a floating icon over it**, exactly like a pickup's bay beacon:
- A **rug** at the venue's start, cached through `bcDraw`, armed when he stops on it (R2).
- A **beacon** bobbing over it (`BEACON`, `drawBeacon`, `beaconPolys`). It is a solid icon in the challenge's own colour, x-rayed only when a building covers it.
  - Today the challenge rugs get the generic `"flag"`. The change is one line: `mm.id === "pickup" ? beaconIconOf(shop) : (CHALLENGES[mm.id]?.icon || "flag")`.
- **New `SHOP_ICONS` entries**, in the same 24 x 24 quads format:
  - `hydrant`, `balloon`, `broom`, `bin`, `pin` (bowling), `buggy`, `crushedCar`, `taxiSign`, `piano`, `crate`, `trailer`, `laserEye`, `duck`
  - plus the existing `cone`, `trophy` and `anchor`.
- **Medal tint:** the icon rides a thin ring in the best medal won: none, bronze, silver or gold. A gold one sparkles.
- **Map pins** and **search rows** draw the same icon (an SVG from `beaconPolys`), replacing the emoji (R15).
- **Focus (R17):** hidden with the stories while a story runs, an order is aboard or a dog is being taken home; `storiesHidden()` already does this for the rugs and pins.

## 6. The kit (kept from v1, plus juice and loans)

The kit is v1's, with three changes:
- **The vehicle.** `vehicle: 'avgarbage'` lends that vehicle for the run, whatever the lock state. At the start rug the host waves the challenge's vehicle out of a pop-up bay, and Tipsey parks on the visitor pad (the mission-loan rule from the fleet doc). After the run, the vehicle drives itself back and Tipsey takes over. A Tipsey challenge reads `wheels: ['slick', 'lowrider']` for its "Best on" line.
- **Juice kit** (`chFx`), shared by every challenge:
  - pop-up words ("CLOSE!", "×4 COMBO", "STRIKE!", "SLAM DUNK!");
  - particle bursts (confetti, sparks, water spray, trash, sand), all small live items in a ring buffer;
  - a combo counter and meter;
  - synth sounds like `sfxThump`, `sfxBell` and `sfxSplash`;
  - a **crowd** (seated and standing extras, from the derby crowd) that cheers on combos and groans on a miss;
  - a tiny screen shake on big hits. No zoom snaps (R12).
- **Instant retry.** Venue courses reset in place; the crowd shouts "Again!". Street courses are loops.

**Kept as in v1:** the `CHALLENGES` registry, the host meeting face to face with Run it / Not now, 3-2-1-GO, the one-line HUD, medals, the result card (score, medal, best, today's rank), `challengeFocus()` in `tipseyFocus()`, `SubmitChallengeRun` plus a daily and an all-time board per challenge, daily variation from the date seed, course pieces cached through `bcDraw` and the live bits culled, and the real-clock windows.

## 7. Venues

Challenges get their own places. Each one is reachable from the Flats.

| Venue | What | Entrance | Hosts |
|---|---|---|---|
| **The Proving Ground** | A purpose-built fleet test arena with five pads: Bin Alley, Strike Lane, Crush Pit, Dock Yard, Laser Maze. Bleachers and a control tower. A **pocket** (walk-in kit), so it needs no map space | A big striped gate, "TIPSEY PROVING GROUND", on Sun Deck Airfield's south apron beside the F4 heavy hall. Drive through it into the pocket | Bin Blitz, Strike Lane, Junkyard Crush, Dock Dash, Laser Maze |
| **The Sky Course** | Balloons, rings and wind socks floating over the harbour basin | F2 Fleet Station hangar pads | Balloon Pop, Sling Swing |
| **Pop-up courses** | A crew rolls one out from the Tipsey work van: cones, ramps, a start arch, bleachers. Packed away out of sight (R13) | Its rug where it pops up | Cone Zone (airfield south apron), Confetti Sweep (Cove Grove Plaza) |
| **Fire Training Yard** | The drill lane with hydrants and kicker ramps (Flats plan, area 7) | Its gate opposite The Flats Fire Station (1,6), on the firehouse lawn (2,6) | Hydrant Hop |
| **Sunset Shore dunes** | The dunes that exist today | The lifeguard station path | Dune Dash |
| **The whole Flats** | Street play | F3 Marina Parking road bays | Taxi Frenzy |
| **Lagoon Market Hall yard** | The forklift's own shed and the yard | F5 shed door | Crate Tower |
| **The basin** | Water | F2 boathouse slipway | Duck Herding |

## 8. The challenges (14)

Effort: S, M or L. "Waits on" names the fleet phase.

| # | Challenge | Hook | Vehicle or wheels | Venue | Effort | Waits on |
|---|---|---|---|---|---|---|
| 1 | **Balloon Pop** | Pop balloons over the harbour before they drift away | Delivery drone | Sky Course | **S** | nothing (flat today) |
| 2 | **Cone Zone** (keeps `cone-slalom`) | Drift a cone course for near-misses and streaks | Tipsey on any wheels, or robotaxi or pod | Pop-up, airfield south apron | **S to M** | nothing |
| 3 | **Confetti Sweep** | Clean a parade's confetti off the plaza | Robo sweeper | Pop-up, Cove Grove Plaza | **M** | nothing |
| 4 | **Bin Blitz** | Grab bins at speed with the arm | Robo garbage truck | Proving Ground, Bin Alley | **M** | nothing (better after P3) |
| 5 | **Strike Lane** | Bowling, with a robot for the ball | Tipsey (Ball bot, Tank), or any vehicle | Proving Ground | **M** | nothing |
| 6 | **Junkyard Crush** | Crush cardboard cars | Tipsey (Monster, Tank) or dump truck | Proving Ground, Crush Pit | **M** | nothing |
| 7 | **Dune Dash** | Air off the dunes | Tipsey (dune wheels, Hover) | Sunset Shore | **M** | jump physics (C4) for big air |
| 8 | **Taxi Frenzy** | Crazy-taxi fares round the Flats | Robotaxi (or shuttle) | The Flats, from F3 | **M** | nothing (better after P3) |
| 9 | **Laser Maze** | Sneak past sweeping searchlights | Security patrol robot | Proving Ground pocket | **M** | nothing; night window |
| 10 | **Hydrant Hop** (keeps `jump-hydrant`) | Ten jumps over hydrants | Tipsey (wheel traits) | Fire Training Yard | **L** | jump physics (C4), the yard |
| 11 | **Sling Swing** | Fly a swinging piano onto rooftops | Heavy-lift drone | Sky Course | **M** | P2 (real z) |
| 12 | **Dock Dash** | Back a semi's trailer into shrinking docks | Autonomous semi | Proving Ground, Dock Yard | **M** | P3 (trailer joint) |
| 13 | **Crate Tower** | Stack a wobbling tower | Driverless forklift | Market Hall yard | **L** | P4 (forks) |
| 14 | **Duck Herding** | Herd giant rubber ducks with your wake | Water taxi | The basin | **M** | P5 (sailing) |

### 1 Balloon Pop
- **Vehicle:** the delivery drone.
- **Venue:** the Sky Course over the harbour basin. Start at the F2 hangar pads.
- **Plays:** 40 coloured balloons drift up from a boat on the basin. Fly through them to pop them. Gold balloons are worth 5; a black one is a −3 "oops". Today flyers skip water at P0, so it plays flat now; after P2 the balloons sit at heights.
- **Scores:** pops in 60 s. Each pop within 1.5 s of the last raises a chain multiplier.
- **Juice:** a pop sound per colour, rising in pitch through a chain; confetti puffs; gulls scatter; the hangar crew cheer on gold.
- **Engine:** balloon drift (a sine on a path), live small quads, culled. **S**. Ships first.

### 2 Cone Zone (`cone-slalom`)
- **Vehicle:** Tipsey on any wheels (best on Slick or Lowrider), the robotaxi or the pod.
- **Venue:** a pop-up on Sun Deck Airfield's south apron, rolled out by the road crew.
- **Plays:** a tight cone course on open tarmac. Red flag: pass the cone on its left; blue: on its right. Kiss a cone without touching it for "CLOSE!". Knock one and it spins away across the apron. Finish by stopping on the delivery mat ("DELIVERED" stamp).
- **Scores:** time, minus 0.5 s per near-miss and per drift-meter bar; +2 s a knock, +5 s a wrong side.
- **Juice:** tyre squeal and smoke on drifts (`PEEL` exists); the knocked cone's tumble; the crew's flag-waver.
- **Engine:** cones as live props when knocked; the drift trait (slick); the Lowrider hop. **S to M**.
- **Carry-over:** keeps the `cone-slalom` id and the Slalom Master trophy.

### 3 Confetti Sweep
- **Vehicle:** the Robo street sweeper.
- **Venue:** Cove Grove Plaza after the Palma Parade. A pop-up: confetti, streamers and a parked float. Host: the parade marshal.
- **Plays:** sweep the plaza clean. A "mess" meter runs from 100% to 0. Gold glitter piles are worth double. A balloon arch pops if touched (a bonus).
- **Scores:** % cleaned in 90 s, plus a time bonus if 100%.
- **Juice:** the brushes spin, swept confetti sprays into the hopper, and the crowd claps as you pass 50%, 75% and 100%. A night variant has glow glitter.
- **Engine:** a coverage grid over the plaza (cells of about 40 units), drawn as cached ground chunks re-baked per changed chunk (perf: a handful a frame); the brush footprint off `ow`. **M**.

### 4 Bin Blitz
- **Vehicle:** the Robo garbage truck.
- **Venue:** the Proving Ground's Bin Alley, a looping street with kerbs and pop-up bins.
- **Plays:** bins stand at the kerb. Press GRAB as you pass; the arm swings out. Centred and fast is a "SLAM DUNK" (the bin flips into the hopper). Late, and the bin skittles across the road spilling trash, and a raccoon pops out. Each lap adds bins and speed.
- **Scores:** bins × streak in 60 s.
- **Juice:** the hydraulic hiss, the clang, flying trash, swooping gulls, and the crowd on the bleachers counting the streak.
- **Engine:** the arm action (a button, a timing window that shrinks with speed, the arm animation); a bin tumble. **M**. Better steering after P3.

### 5 Strike Lane
- **Vehicle:** Tipsey (Ball bot, Tank treads; the cart for laughs) or any vehicle ("bowling with a semi").
- **Venue:** the Proving Ground's long lane with gutters and ten giant inflatable pins.
- **Plays:** line up, roll, hit the pins. The stick curves the roll (a hook). Five frames, played fast.
- **Scores:** real bowling rules, with strikes and spares.
- **Juice:** the pin crash, the pins bouncing and wobbling back up, the scoreboard animating "STRIKE!", the crowd stomping.
- **Engine:** simple pin physics (disc impulses, topple, settle), a pin reset. Vehicle mass scales the hit. **M**.

### 6 Junkyard Crush
- **Vehicle:** Tipsey on the Monster rig or Tank treads, or the dump truck.
- **Venue:** the Proving Ground's Crush Pit: rows of cardboard cars, stacked tyres, a ramp.
- **Plays:** drive over the cars to flatten them. Monster wheels crush, Tank treads flatten slowly, normal wheels just bounce off (a joke). The dump truck tips a load of sand to bury a row.
- **Scores:** crushes in 45 s; a chain inside 2 s multiplies.
- **Juice:** the crunch, a squash animation, flying paper bits, the crowd chanting.
- **Engine:** crushable props (a squash state), the wheel trait. **M**.

### 7 Dune Dash
- **Vehicle:** Tipsey with dune wheels (Monster, Knobby, All-terrain) or Hover pads.
- **Venue:** the Sunset Shore dunes. They exist, and they are solid to street tyres today.
- **Plays:** flags weave over the mounds. Catch air off the crests: small hops now on `beachZ`, big air after the jump physics. Hover pads skim the shallows for a shortcut.
- **Scores:** time, minus airtime bonuses.
- **Juice:** sand spray, a beach crowd at the lifeguard tower, a gull dive-bomb.
- **Engine:** an airtime counter now; big air at C4. **M**.

### 8 Taxi Frenzy
- **Vehicle:** the robotaxi (or the shuttle: more seats, slower).
- **Venue:** the whole Flats, from the F3 Marina Parking bay.
- **Plays:** people wave at kerbs, each with a floating fare icon. Pick one up (stop by them; they walk to the door with `meetWalk`), get them to their spot in time, and they shout "Faster!" and tip on near-misses with traffic. It isn't a delivery: no shop, no tips to the wallet, only points.
- **Scores:** fares and time bonuses in 3 minutes, with the clock topped up per fare.
- **Juice:** passenger chatter, the meter ticking, "NEAR MISS +$" pops.
- **Engine:** fare spawns from street spots, the boarding walk. **M**. P3 steering makes it better.

### 9 Laser Maze
- **Vehicle:** the Security patrol robot.
- **Venue:** a dark Proving Ground room (a pocket), open after dark (R4).
- **Plays:** reach the vault through sweeping searchlight cones and laser grids. Lit means alarm and a restart from the last door. Timed doors and a cat that wanders through the beams.
- **Scores:** time and the number of alarms.
- **Juice:** an alarm klaxon, red flash, the guard dog bark, a "SNEAKY!" streak.
- **Engine:** light-cone tests and a pocket room (walk-in kit). **M**.

### 10 Hydrant Hop (`jump-hydrant`)
- **Vehicle:** Tipsey; the wheels matter. Big or Monster for softer landings, Hover for glide, the Lowrider's hop for the small levels.
- **Venue:** the Fire Training Yard. Host: Captain Reyes with the stopwatch; junior firefighters at the fence.
- **Plays:** the ten-level lane, with N hydrants and a kicker. Each hydrant cleared salutes with a water arc. Clip one and it geysers and launches him skyward (a fail, but a funny one).
- **Scores:** jumps cleared (kept; the server's 0 to 10 carries over), plus style for airtime.
- **Juice:** water arcs and mist rainbows, the kids cheering, the siren on level 10.
- **Engine:** jump physics (airborne `ow` from `HJ_JUMP`) and the yard. **L**.

### 11 Sling Swing
- **Vehicle:** the heavy-lift drone.
- **Venue:** the Sky Course. Rooftop pads round the harbour, with gusts.
- **Plays:** "Piano Movers". Fly a swinging load (piano, hot tub, statue) and set it down on pads. Let the pendulum settle before you drop it.
- **Scores:** placements × gentleness. A smash scores 0, with a big puff.
- **Juice:** the piano's twang on each bump, the sway, the crowd gasping on near-smashes.
- **Engine:** a pendulum on the sling and real z (P2). **M** after P2.

### 12 Dock Dash
- **Vehicle:** the autonomous semi.
- **Venue:** the Proving Ground's Dock Yard: three docks, each narrower.
- **Plays:** reverse the trailer in. The dockhand shouts "Back... back... STOP!".
- **Scores:** time plus accuracy; bumper touches cost.
- **Juice:** reversing beeps, the squeaky bumpers, the dockhand's thumbs-up.
- **Engine:** the trailer joint (P3). **M** after P3.

### 13 Crate Tower
- **Vehicle:** the driverless forklift.
- **Venue:** the Lagoon Market Hall yard, by its F5 shed.
- **Plays:** stack crates as high as you can in 90 s. The tower sways; tilt it too far and it topples. Some crates are melons (heavy), some eggs (fragile).
- **Scores:** height. The daily seed sets the crate mix.
- **Juice:** creaks as the tower sways, a crash of crates, melons rolling.
- **Engine:** forks (P4) and a stack sim (1D stack with sway). **L** after P4.

### 14 Duck Herding
- **Vehicle:** the water taxi.
- **Venue:** the harbour basin.
- **Plays:** steer giant rubber ducks into a floating pen with your bow wave.
- **Scores:** ducks in 90 s.
- **Juice:** squeaks, splashes, a duckling that follows you.
- **Engine:** water (P5), wake-push on floating props. **M** after P5.

## 9. Rewards and progression

- **Medals** per challenge (bronze, silver, gold), shown on the rug's ring.
- **Trophies:**
  - Kept: Hydrant Hopper (all ten jumps), Slalom Master (gold in Cone Zone).
  - **Stunt Jump Master**, earnable at last (gold in Dune Dash or Hydrant Hop style points).
  - New: **Fleet Ace** (gold in five vehicles' challenges).
- **Keepsakes:** the Fire helmet, the Gold cone, a bowling pin, a rubber duck.
- **Liveries:** gold in a vehicle's challenge gives that vehicle a garage livery (racing stripes, flames).
- **Fleet:** challenges **lend** their vehicle. Even before the lock flip (`FLEET_TESTING = false`) a player can try every vehicle there, which gives them a reason to want it. Stories unlock vehicles.
- **Money:** none per run; a one-off server payment for each first gold.
- **The daily leaderboard stays** for deliveries. Beside it goes **Today's Challenge**: one challenge a day, picked by the date, in that day's variation, with its own top ten.
- **Regular stays.** A challenge day counts.

## 10. Phased build (something fun in the fleet ships first)

| Phase | Work | Effort | What Sir sees |
|---|---|---|---|
| **C0 Kit + Balloon Pop** | The registry, rug **and floating icon** (new `SHOP_ICONS`, medal ring, SVG map pins), host meet, the vehicle loan, HUD, result card, server runs and boards, the juice kit's core (pop-ups, particles, sounds). **Balloon Pop** with the drone on today's flight | M | Drive to the hangar: a balloon icon bobs over the rug. The crew hand him the drone, balloons rise off the basin, pops chain with rising notes, a gold medal |
| **C1 Cone Zone + Confetti Sweep** | The pop-up course kit (the crew rolls it out). Cone Zone (retire the slalom engine and the Market Dist. rug). Confetti Sweep with the sweeper | M | Drift the cones on slicks; sweep a confetti plaza clean to cheers |
| **C2 Wheel traits + Proving Ground** | The wheel traits (proposal), the Proving Ground pocket and its gate, the crowd. Strike Lane, Bin Blitz, Junkyard Crush | L | Bowl with the Ball bot, slam-dunk bins with the garbage truck, flatten cardboard cars on monster wheels |
| **C3 Today's Challenge** | The daily pick, the board tab | S to M | Today's challenge and its top ten |
| **C4 Jump physics** | Airborne `ow` (`HJ_JUMP`), kickers. **Hydrant Hop** at the Fire Training Yard (retire the hydrant route mode, `classic:true`, the tap meter). **Dune Dash** with big air | L (+M yard) | Ten hydrants with water salutes; air off the dunes |
| **C5 Street and night** | Taxi Frenzy, Laser Maze | M each | Fares across the Flats; the searchlight maze after dark |
| **C6 With the fleet phases** | P2: Sling Swing (and Balloon Pop at heights). P3: Dock Dash (and Cone Zone and Taxi in real car handling). P4: Crate Tower. P5: Duck Herding | M to L each | Each new controller arrives with a toy to play it in |

The legacy code (about 5,700 lines) goes in C1 (the slalom) and C4 (the hydrant).

## 11. Open questions for Sir

1. **Wheel traits:** inside challenges only (recommended, so free roam stays as it is), or everywhere?
2. **The Proving Ground:** a pocket venue behind a gate at the airfield's south apron (recommended: no map space), or built on the bare paving east of the airfield?
3. **Hydrant Hop control:** real speed off the run-up plus the wheel traits (recommended), or keep the tap-to-charge meter?
4. **Leaderboard:** Today's Challenge beside the delivery board (recommended), or challenge scores on the existing daily board?
5. **Money:** nothing per run and a one-off first-gold payment (recommended), or keep the slalom's capped daily tip?
6. **Fleet:** challenges lend their vehicle and give a livery (recommended), or may a challenge unlock one?
7. **Retry:** an instant in-place reset inside venues (recommended; a venue is its own space, and the crowd shouts "Again!"), with loops on the street? And a new one: is a light screen shake on big hits OK under R12?
