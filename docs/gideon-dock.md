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
**Still to build:** Finish and Decals (gloss, matte, chrome, two-tone; stripes, stars, number, the bolt) `gd4d`; ready-made Skins, earned and bought, as Tipsey's `gd4e`.

## The back room's door (preview, 2026-11-07)
A coffee shop's: a pair of waist-high louvred swing doors (wood, cream cap, a copper push plate) in the gap of the back room's south partition, on two wood posts. No sign, no shutter. They stand swung open against the sides while Gideon is about, and swing shut over 900 ms while his garage is open, open again on Play. The avatar button on his pad swings them shut first and the garage opens when they land (as Tipsey's waits for his door); Play swings them open. Still to decide: whether they also close by themselves (night, a mission).
