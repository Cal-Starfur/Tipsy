# Tidewater Maritime Museum: a story mission (design, v1, for Sir's decisions)

The museum has a whole interior (Egyptian gallery, the T. rex hall, a model ship, a desk, guards) and no story. This is one, built from the missions kit (`docs/kits/missions.md`, R1-R20) and the walk-in kit (`docs/kits/walkin.md`).

## The story: "The Last Bone" (`museum-bone`)
The museum's tyrannosaur has stood for years without the last bone of its tail. A crate from the dig has finally come in on the morning boat and is waiting on Pelican Harbor's quay. The curator, **Dr. Okoro** (the front desk's own attendant, the person Tipsy already sees there), cannot leave the desk with the hall open and asks Tipsy to bring it, gently: it is old, and it is fragile.

1. **Ask.** Walk in to the desk (the attendant already faces the lane). Card: Accept / Not now. Window: **shops** (the museum's own hours, 10 to 5: R4). The museum must not have put him out (WALKIN_BAN) or the story waits: Dr. Okoro rings the harbor instead and he is told "Come back tomorrow."
2. **Collect.** A beacon over Pelican Harbor's quay (a pickup bay: R2, R7). The dock hand hands the crate over the gunwale; the crate rides in the cargo bay, shown in her hand (R6).
3. **Carry it gently.** The crate is **fragile**: a tip-over spills it (`missionTipOver`, `spill`), the crew hand it back ("Dropped this, buddy.": `crewReturns`), as the Cake Run's cake. New in this story: *bumps* count too. Each hard bump (speed over a threshold into a person or a prop) cracks a pip on a 3-pip crate meter; at 3 the dock hand repacks it and he goes back for it. No time limit.
4. **Deliver.** A beacon over the museum's mat. The doors slide for him; Dr. Okoro meets him at the door (meetStand), takes the crate, and says thanks face to face (R8).
5. **The reveal.** Inside the same visit: the new bone is on the skeleton when he next looks (`MUS_IN` dino piece repainted, `pocketPieceRepaint`), the sign says "Donated by Tipsy Delivery", and a visitor reads it aloud. One completion card (`collectCard`).

## Why this shape
- **Built from what exists (R18).** Giver: the museum desk's own staff entry (`walkinStaff`, id `desk`; `MUSEUM_DESK_UNIFORM`). Dock hand: the harbor's cast. Crate: the cake's carry-and-spill (`MISSIONS.item().tip`), the crate prop from the vehicle and prop kits. Beacons, GPS, bays: the pickup kit.
- **Uses the room's day (W17).** Starts only while it is open. If he is put out for knocking someone down, the story pauses, never fails (R3, R17).
- **Near (R20).** Pelican Harbor's quay to the museum is under 5 minutes by the GPS; measure it before building.
- **One at a time (R17).** `missionBusy` as every story.

## What it gives (needs Sir)
| | Proposal |
|---|---|
| Money | $100 once, `payId: 'museum'` (like the others) |
| Trophy | **Fossil Finder** |
| Skin | **Curator** (a tweed jacket), worn on completion, or none |
| Place | The T. rex gains its last bone for good (stays after the story) |

## Server and board
`museum-bone` goes in `TS_MISSIONS`; the board card reads `MISSIONS` (name, giver, window, steps, reward).

## Decisions needed
1. Is "The Last Bone" the story you want, or something else (a stolen painting, a night-time sleepover, a school trip, the model ship's sail)?
2. Pickup place: Pelican Harbor's quay (proposed), the airfield's cargo apron (needs the fleet), or the fish market.
3. Reward: money, trophy and skin as above?
4. Bumps crack the crate (new), or tip-over only (as the cake)?
