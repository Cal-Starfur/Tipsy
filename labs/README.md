# labs/

## The bench is where work happens now

**`_bench.html`** is the only lab that should be used for new features.

It does not imitate the game world — it **loads** it. `game/index.html` runs
unmodified inside an iframe, and the bench bridges into its realm via
`contentWindow.eval`, which is the one way to reach the game's global lexical
bindings (`const game` and the ~136 top-level `const`s are *not* `window`
properties, so `contentWindow.game` is undefined and always will be).

Because lab code is compiled inside the game's realm, it closes over the game's
own lexical scope. A prop function prototyped in the bench has exactly the
access it will have once pasted into `index.html`. **The port is a copy, not a
translation.**

Serve the repo root over http and open `/labs/_bench.html`. It needs
same-origin — `file://` gives the iframe an opaque origin and the bridge dies.

What it gives you:

| Control | What it does |
|---|---|
| pinned date | Seeds the route through the game's own `scene.loadRoute` — same world every reload |
| f0 / f1 / f2 / f3 | Hunts the real route for positions where heading lands on each quarter, then moves the robot there. Real camera, real geometry |
| cycle all 4 | Holds each heading long enough to actually look at it on a phone |
| freeze / step 1 | Pauses update, keeps the last frame rendered — for reading geometry |
| scrub botS | Slides along the route |
| Lab console | Compiles your code inside the game's realm. `BENCH.hook(fn)` draws every frame after `drawWorld`, with errors caught and reported instead of killing the run |

---

## Everything else here is archived

The other 32 files each carry an `ARCHIVED PROTOTYPE` banner. They are **not
deleted and not broken** — they are kept deliberately, because the prototype
inside each one is still good. The geometry, the tuning constants, the math are
all worth reading and lifting from.

What has gone stale is the *world around* the prototype. Each of these labs
hand-copies the game's constants, iso projection, `gWorld`/`g`/`gFront` stack,
and camera. Nothing keeps those copies in step with `game/index.html`, so they
drift, and they will keep drifting.

That drift is the actual cost. It meant every port out of a lab was a
translation, and translation is where the heading bugs got in.

**Read them. Lift from them. Do not build new features in them.**

---

## The four-heading rule

Unchanged, and it outranks everything else here.

The `gWorld`/`g`/`gFront` manual depth-sort architecture is the root cause of a
recurring class of heading-dependent rendering bugs. **Nothing rendering-related
ships until it has been seen at f=0, 1, 2 and 3.** The bench's heading row exists
to make that one button instead of a chore.

`heading-reference.html` was the canonical diagnostic for this class of bug. It
is archived like the rest, but its diagnostic value is real — if a facing bug
resists the bench, it is still worth opening.

---

## Archived labs

Props and hazards
`bin-lab` · `cone-lab` · `cone-hit-lab` · `crack-lab` · `dog-lab` ·
`dog-hit-lab` · `hydrant-lab` · `hydrant-hit-lab` · `hydrant-jump-lab` ·
`hydrant-challenge-lab` · `lamp-lab` · `palm-lab` · `pigeon-lab` ·
`planter-lab` · `scooter-lab` · `scooter-hit-lab` · `trash-lab` · `car-lab`

World, route and layout
`address-lab` · `block-wrap` · `layout-lab` · `route-lab` · `sidewalkend-lab` ·
`sidewalkendturn-lab` · `world-lab` · `night-lab`

Robot, motion and rendering
`corner-robot-lab` · `heading-reference` · `kicker-lab` · `ramp-lab` ·
`pickup-lab` · `sprite-lab`
