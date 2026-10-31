# Kit 6: Vehicles (contract v2)

**What this covers:** `vehKit`, the vehicle drawers called from `drawProp`, collision, wheels, shadows, and the rule that every vehicle is one of ours.

**Evidence:** 122 past corrections.

**Checker:** `--kit vehicles`.

| ID | Rule | Ev | Status | Check |
|---|---|---|---|---|
| V1 | **No vehicle pops.** Layout decides what exists, before any culling. | 4 | part | ✅ (the traffic list rules out parked/moving switches) |
| V2 | **No vehicle fades.** | — | C (`hospAmbVanAt` fades) | ✅ |
| V3 | **Collision is the full footprint** (length × width × facing) from one `vehicleSolid(kind, x, y, dir)`. | 4 | C (the ±48 × ±112 box is hand-copied at 5 sites) | ☐ parked-car hitbox |
| V4 | **Our vehicles only:** every vehicle is a `vehKit` body with livery, and every Tipsey-style robot is `drawBotBody`. | 19 | C | ☐ static |
| V5 | **Faces, near wheels and bumpers come from normals.** The shadow is the footprint, turned with the vehicle. Added parts sort far to near. | 18 | part | ☐ pose sweep |
| V6 | **Vehicles never overlap anything.** Moving bodies yield hull to hull. A moving lane clears parked bodies by ≥ 84. No vehicle stops on a person, a zebra, the pavement or a drive mouth. | 18 | C | ✅ overlap census |
| V7 | **Wheels sit flush outside the body or inside an arch.** | 7 | C | ☐ |
| V8 | **Size from constants:** `CARC` 225 × 90, `BOAT_SC` 2, bays 120 × 260. | 11 | C | static |
| V9 | **Heading and pose are continuous.** A cached sprite is used only at its exact heading. | 4 | part | ☐ |
| V10 | **The kit chamfers every prism** above `CHAMFER.min` (18). | 5 | K | — |
| V11 | **Wells and cockpits are openings with far walls**, and occupants sit inside them. | 7 | C | eye |
| V12 | **Looks are seeded from identity**, never from position or time. | 2 | C | ☐ |
| V13 | **Hatches and doors are shut while moving**, and the service hatch is on the kerb side. | 3 | C | eye |
| V14 | **The autonomous fleet** has Tipsey's face at the front only. | 8 | C | eye |
| V15 | **Wheel phase advances from distance travelled.** | 3 | C | eye |
| V16 | **Vehicle art reads its frame's handedness.** | 2 | C | static |

**Approved values:**
- `CARC` 225 × 90 (chassis 42 + cabin 48, wheel radius 24).
- Flatbed and beer truck: 280 long.
- Gap from a moving lane to parked bodies: 84; between opposing cars: 150.
- Bays 120 × 260, aisles 240.
- Exemplars:
  - the crew van giving way (126927d);
  - flush tyres (7fea604, 5c87e06);
  - truck tyres in arches (ffc65a0).

## Known kit flaws
1. **No `vehicleSolid`.** The parked-car box is hand-copied 5 times and ignores kind and facing.
2. **No shared yield service.** Traffic, the crew van, the rescue van and the riders each avoid on their own.
3. **No flush-or-arch guarantee for wheels.**
4. **`drawBotBody` draws into `this.g`.** The ambulance van fades.
