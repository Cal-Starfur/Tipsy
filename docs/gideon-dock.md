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
Standing on his pad opens his garage (the avatar button, as Tipsey's); with the humanoid chosen its tabs are his own, not Tipsey's. He is on **Tipsey's own paint system** (Sir: "the exact same system as Tipsey for paint"): the same rows (`colourRow`, the colour wheel with its Pick swatch and the touch-to-pick-from-the-screen drop), the same try-on, Add / Equip tags, cart and Check out, the same flat price a row (shell $5, band $3, eyes/parts/ears/shoes $2.50, screen $2), stock free; shape cards cost $3-4. His fields (`gShell`, `gEye`, `gBand`...) sit on the same paint look (`tipsy.look`), and `paintOver` sets `GD_LIVE`, which `gideonParts()` reads for every draw of him: the garage turntable, the street, the scooter, the Gideon NPC.
**Tranche 1 (built):** Shell (16 shell colours, joints, hands), Face (eye colour, 6 eye shapes, 7 mouths, screen colour, ear style and colour), Band & pack (the chest band or none, the battery pack), Feet (4 shoe kinds, 8 shoe colours); every colour row has a colour wheel of its own. "Try Gideon stock" tries the stock look on, as any pick.
**gd4b Head (built):** a Head tab with 12 headwear styles -- flat cap, beanie, bowler, top hat, chef's hat, headphones, antenna, twin antennas, visor, party hat, crown, propeller cap ($3-12) -- and a hat colour (flat $2.50), drawn from the hull's own prisms on the crown.
**gd4c Outfit (built):** an Outfit tab -- apron or vest, scarf / bow tie / tie, a chest badge (dot, bolt, star, diamond, cross), glasses (round, square, shades, visor, monocle), each with a colour of its own -- and pack styles (box, wide, round, twin tanks, jet, none) on the Band & pack tab. Front pieces draw only while he faces the eye.
**gd4d Finish and Decals (built):** a Finish tab (satin, matte, gloss, chrome, two-tone with a second colour for the legs) and a Decals tab (racing stripes, chevron, star, bolt, heart, race numbers 1/4/7/9, in any colour) -- drawn on the torso's front at each height, only while he faces the eye.
**gd4e Looks (built):** a Looks tab, first, with 10 ready-made looks (Stock, Barista, Night Shift, Chrome, Workshop, Sunset, Racer, Chef, Royal, Party): one tap tries the whole look on, "Add all" puts its unpaid parts in the cart together at their own prices, Equip wears one you own. (Looks earned in missions, as Tipsey's trophy skins are, are still to come, with Gideon's second mission.)

## His garage is the back room (Sir, 2026-11-07)
Picking the humanoid in the garage's Fleet tab cuts the room behind the turntable to the cafe's back room: he stands on his own pad in it, the doors swung shut, no depot mask (`fleetGarageCut`, key `gideon-pad`). Picking Tipsey or any other vehicle cuts back to the depot.
