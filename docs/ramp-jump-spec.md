# Tipsy — Ramp/Kicker Jump System Spec (v1)

## Goal
One shared launch/arc/landing physics system, driven by two magnitude presets:
- **Kickers** — natural sidewalk imperfections (cracked slabs, curb lips, root bumps)
- **Skate ramps** — deliberately built structures

Both feed the same math. Kickers are frequent/subtle, ramps are rare/dramatic. Ring of fire (and future stunt gates) rides on top of this system rather than being a separate one.

---

## 1. Launch / Arc / Landing Physics

**Trigger:** robot contacts a launch-type prop at approach velocity ≥ some threshold. Below threshold = normal collision (bump/stop), not a launch — prevents accidental micro-hops.

**Inputs (per prop instance):**
- `launchAngle` — degrees off ground plane
- `launchPower` — initial vertical velocity magnitude
- Horizontal velocity carries over from approach speed + heading (unchanged mid-air, no air control)

**Trajectory:** standard parabolic arc —
```
h(t) = v0 * t - 0.5 * g * t²
```
`v0` and `g` tuned per preset, not physically literal — tuned for game feel (hang time readable at isometric scale, not real-world physics).

**Presets (starting points, tune in lab):**
| | Kicker | Ramp |
|---|---|---|
| Launch angle | ~15–20° | ~35–45° |
| Air time | 0.3–0.5s | 0.8–1.4s |
| Peak height | small, barely clears props | full prop-height clearance |
| Landing tolerance | forgiving | tighter |

**Landing plane:** heightmap is currently flat (0) everywhere, so landing = arc returns to 0. Written so a non-flat heightmap later just changes the landing-height lookup, not the launch/arc logic — don't hardcode 0 as a magic constant, reference a `groundHeightAt(x,y)` stub now even though it always returns 0 today.

**Landing outcomes:**
- **Clean landing** — arc completes within tolerance window, robot resumes normal ground movement
- **Bad landing** — landed off-angle, overshot/undershot target zone, or landed on an obstacle → feeds into existing tip-over/damage vocabulary (top-heavy robot identity does the work here, no new fail-state category needed)
- **Miss/undershoot on a gate hazard** (ring of fire) — distinct fail state, see §4

---

## 2. Isometric Height Rendering

Height (Z) has no native representation in the current 2D isometric pipeline — this is new.

- **Robot sprite:** offset upward in screen-space proportional to `h(t)`. True (x,y) world position keeps moving normally underneath.
- **Ground shadow:** separate sprite pinned to the true (x,y) ground position, scales down as height increases, scales back up on descent. Standard isometric jump-fake — sells height without needing true 3D.
- **Optional polish (not v1):** slight squash on launch, stretch at peak, squash on landing.

**Depth-sort interaction (the real risk):** the three-canvas painter's-algorithm stacking currently sorts on ground-plane position. An airborne robot needs to draw correctly against props both under the arc and beside it, across all 4 headings, without a proper `setDepth()` system. Two options:
1. Compute a depth key that factors in `h(t)` as a bias (airborne robot draws "in front of" ground props whose depth it's passing over) — a workaround, not a fix.
2. Treat this as the forcing function for the `setDepth()` rearchitecture already flagged as the long-term fix.

Recommend prototyping option 1 in the lab bench first since it's cheaper, but flag in the census run if it produces visible artifacts at any heading — that's the signal to stop patching and do `setDepth()` for real.

---

## 3. Object Types

**Kicker**
- Small footprint, placed like existing small hazards (cone/bin scale)
- Minimal art — a subtle prop or mesh variant, not a new large asset
- High placement frequency expected (sidewalk texture, not a set-piece)
- Implement as a placed prop object (not baked into tile rendering) — keeps the tile system untouched and reuses the existing prop-collision pipeline

**Skate Ramp**
- Larger footprint, taller — planter/hydrant prop scale or bigger
- Needs real "looks-built" isometric art: visible ramp face, must read correctly at all 4 headings (new asset work, not just a physics config)
- Low placement frequency — deliberate set-piece, dev-placed in challenge routes first

---

## 4. Ring of Fire (Gate Hazard)

A pass-through volume, not a solid collider. New hazard category: **gate hazard.**

- Defined as a volume positioned at some point along a ramp's expected arc
- Pass condition: robot's arc trajectory intersects the gate volume during air time (not before/after — must be genuinely mid-jump)
- Fail condition: robot is grounded when it reaches the gate's (x,y), or arc height at that point is below the gate's minimum clearance → miss/undershoot fail state, distinct from a bad landing
- Visual: fire ring needs a simple particle/animated effect — scope as its own small art task, not blocking on physics

This is the first of a "gate hazard" category — same shape could later cover hoops, gaps to clear, etc. Worth naming the category generically now rather than hardcoding "fire ring" logic.

---

## 5. Data Schema (forward-compatible)

Same shape needs to work for: dev-placed challenge routes now, and player-placed editor objects later.

```json
{
  "id": "kicker_003",
  "type": "kicker | ramp | firegate",
  "position": { "x": 0, "y": 0 },
  "heading": 0,
  "presetOverrides": {
    "launchAngle": null,
    "launchPower": null
  }
}
```

- `type` selects the base preset; `presetOverrides` allows per-instance tuning without new types
- Route/challenge data (`{ seed, modifiers, parTimeOverride, name }` from the challenge-level spec) gains an optional `placedObjects: [...]` array using this shape
- Editor (phase 2) writes to the same array — no schema migration needed later

---

## 6. Par-Time / Route-Length Impact

Jumps change effective traversal — a cleared ramp likely covers ground faster than walking it, kickers barely affect it. This needs to feed into the par-time countdown calc, and matters more given the route-length cap regression is already an open, unexplained item — don't tune par-time math against jump data until that regression is understood, or the two open issues will get tangled together.

---

## 7. Lab Bench Plan

Standalone bench (`labs/ramp-jump.html` or similar), not touching `game/index.html`:

1. Parametrized launch component: angle + power in → arc/hang-time/landing-plane out
2. Test kicker-scale and ramp-scale simultaneously, side by side
3. Sprite height-offset + ground shadow rendering
4. Depth-sort workaround (§2, option 1) validated across all 4 headings — this is the pass/fail gate for the whole approach
5. Once physics + rendering read correctly: bad-landing tip-over hook, then gate-hazard pass/fail detection (ring of fire) as a second bench pass

Only after the bench is clean at all 4 headings does this get ported into `game/index.html`, per the usual lab-first / headless-verification workflow.

---

## Open Decisions
- [ ] Confirm kicker = placed prop (not tile variation) — recommended above, needs sign-off
- [ ] Depth-sort workaround vs. forcing the `setDepth()` rearchitecture now
- [ ] Par-time formula changes — blocked on route-length regression being understood first
- [ ] Ring-of-fire art scope (particle effect complexity)
