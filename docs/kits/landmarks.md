# Kit 8: Landmarks and large buildings (contract v2)

**What this covers:** `lmDepth`, `bcDraw`, `parkLandmarkVol`, `vol` solids and heights, collision against the art, and caches.

**Evidence:** 127 past corrections.

**Checker:** `--kit landmarks`. The library check is answer-keyed against the game's own `cTodo` flag ("N pavement props need collision volumes").

| ID | Rule | Ev | Status | Check |
|---|---|---|---|---|
| L1 | **What you see is what you hit.** Every piece standing to Tipsey's height is solid, even past the block edge, and every drawn gate works. Overhead arms, pads and gulls are exempt. | 24 | C | ✅ (boxes and slabs, plus every drawn point of any shape); ☐ pieces outside the library |
| L2 | **No invisible walls.** Every lot declares its walkable ground (`vol.opens`) from the same numbers as its drawing. An undeclared lot refuses to load instead of defaulting to a whole-block solid. | 14 | C (the default is still a block solid) | ✅ solid with nothing drawn on it; ☐ boot assert |
| L3 | **Still things stay cached**, with stable `bcDraw` keys. | — | C | ✅ (judged once painting has stopped) |
| L4 | **Declared heights are real**, per mass (the podium isn't the tower), and a stack clears its roof. | 2+14 (x-ray) | C | ✅ the drawn height of the walls and roof vs the declared height |
| L5 | **One shape source:** collision, classifier, x-ray, mats, pads and spawn all read the entry's `vol`. | 7 | C | ☐ |
| L6 | **A building on an away edge draws its rear elevation.** Entrances face the camera. | 10 | C | ☐ static |
| L7 | **A multi-cell site is culled and drawn as one box**, from whichever of its cells is in view. | 6 | C | ☐ |
| L8 | **Lab entries use the game's constants**, and a lot's frame is right-handed. | 8 | C | static |
| L9 | **Rims and parapets run all round** and break exactly at a door or bridge. | 7 | C | eye |
| L10 | **Every walk ends at a door or gate.** Gates are at least 82 clear, and there's a Tipsey-width path from the street to every entrance. | 7 | C | ☐ reachability |
| L11 | **Rails and fences come from the outline they enclose**, as one mitred path. | 4 | C | eye |
| L12 | **An attachment shares its host's floor lines and bands.** | 4 | C | eye |
| L13 | **Every solid draws all its real faces and caps.** An empty face is skipped, never inverted. | 5 | part | eye |
| L14 | **Garages come from the one garage plan kit.** | 5 | part (two copies of the plan) | — |
| L15 | **Street faces stand on the building line** unless a set-back is declared. | 2 | C | static |
| L16 | **Small props are smooth outlined shapes at real size** (no voxels). | 5 | C | eye |

**Approved values:**
- **Clearance:** gates ≥ 82 clear (60 + 20). Tipsey's `botR` is 30.
- **Exemplars:**
  - the Charge depot reads its `vol` for everything (4d91d47);
  - the Seabreeze Fuel forecourt (1fee8ef);
  - Tide Pool Elementary, culled as one site (803e9b3);
  - the cemetery and school made solid (baa4640).

## Known kit flaws
1. **An undeclared lot defaults to a whole-block solid** (see the comment at line ~19203 of `game/index.html`).
2. **L1 only sees library entries with a `vol`.** Parks, garages, pockets and rim sites built outside the library aren't checked.
3. **Two floor schemes** in `parkLandmarkVol` (`lvl` and `fl`), and two copies of the garage plan.
4. **Multi-cell sites cull by their anchor cell.**
