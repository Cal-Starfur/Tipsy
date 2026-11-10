# Fleet polish: handoff for a new session

Read this, then `docs/fleet-redesign.md` section "Fleet polish: the standing rules" (the rules are binding), then `CLAUDE.md` (the workflow: edit `game/index.html` only, `python3 tools/build_devvit.py`, headless check, publish the Artifact, commit and push straight to `main`, SHA check after the push).

## How Sir works with you
- Replies: one or two lines, what changed and the link. No caveats or offers unless something needs his decision.
- He answers from pictures he is sent: send a render of what changed (MP4 if it moves). He often circles a problem on a render: take the circle literally.
- Fix draw problems from Tipsey's code and numbers, not from pictures (a standing rule). Look at the picture last.
- The stop hook complains about `claude/sleepy-pascal-xpo0sw` having "unpushed commits": ignore it, `main` is what counts (check with `git fetch origin main && git log --oneline origin/main..HEAD`). Do not explain it each time.
- One vehicle per pass, then he signs off; mark it built in the queue (`python3 tools/queue.py built fp-<id> <artifact link>`).

## Where the fleet polish stands
Done (built, awaiting his tests): Cargo bot, Courier bot, Security patrol robot (with Police / Sheriff / Security skins from Night Watch, flashing light bar and camera), Warehouse robot (runs empty), Robotaxi (sliding doors, cabin cavity, convex nose, Yellow Cab / Tokyo Taxi / Airport Shuttle skins). The shuttle and pod share the robotaxi's drawer (`drawAvPod`) so they have the paint and doors, but they have not had their own pass.

Next in the queue order (`build_queue.md`, `fp-*`): Delivery pod, Autonomous shuttle, Autonomous semi, Robo garbage truck, Autonomous dump truck, Robo street sweeper, Driverless forklift, the three drones, the two planes, the two boats. Road, heavy and site vehicles never tip; walkers and (probably) boats do.

Open thread on the robotaxi: **the riders**. The doors are driven by `data.door` (0..1), set today only by hand (`scene._taxiDoor`). Sir asked for "the door and riders, starting with doors": wire riders walking up and in (the Getaway's motel robotaxi, the Sunset Salute shuttle, or the one he drives: ask which first).

## The mechanisms (all in `game/index.html`)
- **Paint and skins on a vehicle:** the drawer reads `data.paint`; `WEAR`, `BPW = this.bodyPaint()`, `STRIPEC`, `paintOf()` give the body tones, finish, print, two-tone and stripe. `botSkinWear(g, V, spec)` lends Tipsey's drawers the vehicle's frame for the stripe pattern and flank badge (spec: hx, hy, ch, s0, s1 stripe rows, dz badge height, da / dk badge offset and scale). `botTopper(g, V, a, b, h)` puts a skin's topper on a pole tip. A lid's print is stretched to the lid's own plan in `printLayout`. Skins that only one vehicle wears: `TP_SKINS` `fleet:`, mirrored in `tipsey-delivery/src/server/tpcatalog.ts`.
- **A look per vehicle:** `window.tpLookForCurrent()` (called from the Fleet tab and every `owStep`) swaps `look` and `tpProfile.equipped` to the vehicle's own (`tipsy.fleetLooks`). In a test, set `tpProfile.fleetKind = kind`, call `tpLookForCurrent()`, then `tpApplySkin(id)`, or the swap resets your skin.
- **Hit box:** `FLEET.<kind>.ctl.botR` = half its width, tyres included (a walker with `ctl` gets `phys {}`); steered road/heavy vehicles are in `FLEET_STEER`. A walker's body needs `cap: true`.
- **Tipping (walkers):** `ROLL_PIVOT` / `PITCH_PIVOT` in `drawBot`, the avatar data carries `roll`, `pitch`, `pitchSg`; `botHull` composes the same roll and pitch. Copy Tipsey's `P()` (a positive roll goes over toward -b). Prove faces with `V.sees` against the scene's `this.R` (sum > 0) over a whole fall; the lid draws by `lidNear` (body top face seen), the flag by `flagNear` (rear face seen), the shadow stays on the ground.
- **Bodies swept from a profile** (`prismB`) must be convex: an inward bend breaks the bevels, the outline and the seams. `V.fillSilhouette` fills the outline's inside first.
- **Hollows:** `botHollow` is Tipsey's cavity (octagon drawn in from the body's chamfer, walls, floor). Vehicles run empty: loads come from `data.load`, `data.boards`.

## Testing without a device
Boot headless (Playwright, Chromium at `/opt/pw-browsers/chromium`), serve the repo over http, route the Phaser CDN to `tipsey-delivery/public/phaser.min.js` and abort font requests. Load `game/index.html?go=-3600,-9000,4.71&view=1`, wait for `game.scene.getScene('world').route`, call `window.garageClose()`, then drive state from the page: `tpProfile.fleetKind = kind; window.tpLookForCurrent(); tpApplySkin('fire-chief'); owStandUpAt(scene, x, y, yaw)`, screenshot. Good skins to check each vehicle in: Fire Chief, Porch Pirate, Daredevil, Sunset Cruiser. A fall: `owTip(scene, 1, {a: 1})` (nose), `{a: -1}` (tail), `owTip(scene, 1)` (roll), frames every 150-250 ms. Use a temporary copy of the game for any debug patch, never the repo file.
