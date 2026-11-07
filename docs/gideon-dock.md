# Gideon's charging pad (design, Sir 2026-11-07)

Choosing the humanoid in the fleet starts you as **Gideon, in the cafe's back room**, not at Tipsey's charging station. He has his own pad back there.

## Built (gd1)
The same pad Tipsey has in his garage and at every street charging station (the depot's `charger`: an 88-wide circle, a dark rim, the painted amber ring, the grey pad inside), on the back room's floor. After dark it throws a soft cool wash on the concrete, as Tipsey's glows. Centre (124, 266) in the room frame; he stands on it. The Gideon NPC rests on it when he is not out serving.
It sits in the open middle of the back room: clear of the roaster, the workbench and the bean shelves, so nothing needs moving. (An alcove on the north wall, with posts and a wardrobe locker, was tried and dropped: the roaster stands in front of that wall.)

## Still to build
- **gd2 Start on the pad (built).** Fleet "Play" with the humanoid puts the player on the pad in the back room, facing out; the shop and the room are his world. His way out is the back room's door gap and the shop's front door.
- **gd3 Charge on the pad (built).** The pad's glow is live: it breathes while he charges (battery rising); the battery bar fills only while he stands on it; going back to the pad is how he recharges, as Tipsey does at his station.
- **gd4 Customise.** Where the humanoid's looks and parts are changed (the garage's Skins for him) -- a wardrobe/mirror, placement to decide.

## Rule (Sir, 2026-11-07)
Every game starts as Tipsey, whoever was driven last: the Fleet tab's pick is held for the visit only and never saved (tpLoadProfile / tpSaveProfile). The humanoid is always chosen on purpose, and Play then starts Gideon on his pad.

## gd4 Customising Gideon (Sir: "fully customisable like Tipsey, build out a lot of possibilities")
Standing on his pad opens his garage (the avatar button, as Tipsey's); with the humanoid chosen its tabs are his own, not Tipsey's. Picks are kept in `tpProfile.gideon` and read by `gideonParts()` for every draw of him: the garage turntable, the street, the scooter, the Gideon NPC.
**Tranche 1 (built):** Shell (16 shell colours, joints, hands), Face (eye colour, 6 eye shapes, 7 mouths, screen colour, ear style and colour), Band & pack (the chest band or none, the battery pack), Feet (4 shoe kinds, 8 shoe colours); every colour row has a colour wheel of its own. Reset Gideon puts it all back to stock.
**Still to build:** Head (antennas, hats, caps, headphones, visors) `gd4b`; Outfit (aprons, scarves, vests, badges, glasses) `gd4c`; Finish and Decals (gloss, matte, chrome, two-tone; stripes, stars, number, the bolt) `gd4d`; ready-made Skins, earned and bought, as Tipsey's `gd4e`.
