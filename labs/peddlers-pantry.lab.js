/* ===========================================================================
   PEDDLER'S PANTRY — first-pass bespoke building
   labs/_bench.html?lab=peddlers-pantry
   ===========================================================================
   Loads via the bench's own lab picker or the URL param above. The date in
   that URL (or typed into the bench) only boots the scene into a running
   state -- it has no bearing on this address. The camera flies to the shop
   automatically once this loads.

   Geometry is NOT guessed and is NOT tied to a route or a day --
   it's the shop's permanent address on the CITY_SEED grid: block
   (12,22), edge dv={0,1}, w=205.9, unit origin (39928.0, 70287.4).
   queueCommercialEdgeAt computes these same numbers from the same
   fixed inputs whenever this block happens to be someone's pickup;
   this paints over that same footprint independent of whether it
   is today.

   Design: a produce-market stall, not a glass-front shop —
   crated fruit/veg on open-air shelving instead of windows, a
   two-tone canvas awning (warmer/rustier than the generic
   AWNING_STRIPES grey), a signage board reading distinct from
   the standard STORE_PALETTES set. No painted text yet (the game
   has never rendered text onto a building — only UI — so a
   literal "PEDDLER'S PANTRY" sign is a separate follow-up if you
   want it; this pass is shape + palette + motif only).
   ============================================================ */
// Camera goes straight to the address -- fixed world coordinates on the
// permanent city grid, independent of whatever date/route is loaded.
// Any pinned date works for booting the bench; this does not care.
BENCH.lookAt(39928.0, 70287.4, 220);

BENCH.hook(function(sc, t){
  const g = sc.gFront;

  // Peddler's Pantry's fixed unit geometry -- block (12,22) on the
  // permanent CITY_SEED grid. Not derived from route, not derived from
  // date. This spot exists in the world whether or not it's anyone's
  // pickup today.
  const ox = 39928.0, oy = 70287.4;
  const dv = { x:0, y:1 }, rv = { x:1, y:0 };
  const w = 205.9;
  const D = STORE_DEPTH;

  const G = (a,b,h) => sc.W(ox + dv.x*a + rv.x*b, oy + dv.y*a + rv.y*b, h);

  // PANTRY palette — warm crate-wood + rust awning, distinct from
  // every STORE_PALETTES entry (all of which run brick/teal/charcoal/
  // mustard/forest — none of them read as "produce stall")
  const C = {
    wall:   0xb6884f, wallDk: 0x8f6a3c, wallLt: 0xc89c62,
    trim:   0x4a3420, sign:   0xe8ddc0,
    awnA:   0xc4623f, awnB:   0xe8d6a8,      // rust / cream stripes
    crate:  0x9a6b3a, crateDk:0x7a5228,
    produce:[0xc8523a, 0xd8a13a, 0x6a9a4a, 0xd6d048]  // tomato/orange/leafy/lemon
  };

  const kickH = 18;
  const dZ1 = DOOR_H*0.88;
  const shelfZ0 = kickH+4, shelfZ1 = shelfZ0 + 46;
  const awnZ0 = shelfZ1+6, awnZ1 = awnZ0+20;
  const signZ0 = awnZ1+8, signZ1 = signZ0+18;
  const H = signZ1 + 16;

  // back + roof (same shell logic as drawStoreUnit, unsliced — this
  // unit is drawn whole, same as the real pickup unit is)
  sc.quadOn(g, [G(0,-D,H), G(w,-D,H), G(w,-D,0), G(0,-D,0)], C.wallDk);
  const roof = [G(-5,5,H), G(w+5,5,H), G(w+5,-D-5,H), G(-5,-D-5,H)];
  sc.quadOn(g, roof, C.trim);
  sc.edgeOn(g, roof, C.wallDk, 1);

  // front face
  sc.quadOn(g, [G(0,0.4,H), G(w,0.4,H), G(w,0.4,0), G(0,0.4,0)], C.wall);
  sc.quadOn(g, [G(2,0.42,0), G(w-2,0.42,0), G(w-2,0.42,kickH), G(2,0.42,kickH)], C.wallDk);

  // open-air produce shelving — three tiers of crates instead of glass,
  // each tier a slightly different depth so it reads as stacked, not flat
  const shelves = 3;
  for(let s = 0; s < shelves; s++){
    const sx0 = 10 + w*0.06, sx1 = w - 10 - w*0.06;
    const tierW = (sx1 - sx0) / shelves;
    const cx0 = sx0 + s*tierW + 3, cx1 = sx0 + (s+1)*tierW - 3;
    const bOff = 0.5 + s*0.015;
    sc.quadOn(g, [G(cx0,bOff,shelfZ1),G(cx1,bOff,shelfZ1),G(cx1,bOff,shelfZ0),G(cx0,bOff,shelfZ0)], C.crate);
    sc.quadOn(g, [G(cx0,bOff+0.01,shelfZ0+6),G(cx1,bOff+0.01,shelfZ0+6),G(cx1,bOff+0.01,shelfZ0),G(cx0,bOff+0.01,shelfZ0)], C.crateDk);
    // produce mound on top of each crate tier
    const pcol = C.produce[s % C.produce.length];
    const midX = (cx0+cx1)/2, spread = (cx1-cx0)*0.32;
    sc.quadOn(g, [
      G(midX-spread, bOff+0.02, shelfZ1+16), G(midX+spread, bOff+0.02, shelfZ1+16),
      G(midX+spread*0.6, bOff+0.02, shelfZ1+2), G(midX-spread*0.6, bOff+0.02, shelfZ1+2)
    ], pcol);
  }

  // awning — rust/cream stripes, warmer than the generic grey pair
  const stripeN = 6;
  for(let i=0;i<stripeN;i++){
    const sx0 = w*i/stripeN, sx1 = w*(i+1)/stripeN;
    sc.quadOn(g, [G(sx0,0.5,awnZ1),G(sx1,0.5,awnZ1),G(sx1,0.52,awnZ0),G(sx0,0.52,awnZ0)],
      i%2===0 ? C.awnA : C.awnB);
  }
  sc.quadOn(g, [G(0,0.42,awnZ1),G(w,0.42,awnZ1),G(w,0.42,awnZ1+3),G(0,0.42,awnZ1+3)], C.trim);

  // signage board (blank block for now -- see note above on text)
  const sq = [G(6,0.44,signZ1),G(w-6,0.44,signZ1),G(w-6,0.44,signZ0),G(6,0.44,signZ0)];
  sc.quadOn(g, sq, C.sign);
  sc.edgeOn(g, sq, C.trim, 1);
});
