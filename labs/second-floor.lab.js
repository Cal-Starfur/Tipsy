/* ===========================================================================
   SECOND FLOOR — commercial buildings, first-pass prototype
   labs/_bench.html?lab=second-floor
   ===========================================================================
   MONKEYPATCHES sc.drawStoreUnit for the duration of this bench session, so
   every ordinary commercial edge unit in view gets a second floor -- a whole
   street at once, not one address. This is a full REPLACEMENT of the
   function body (same signature, same call sites, same slice contract), not
   a wrapper: the roof has to sit at the new taller H, and H is computed
   inside the original with no way to intercept it from outside. Everything
   through the sign band is byte-for-byte the original drawStoreUnit -- only
   the tier between sign and roof, and H itself, are new.

   SCOPE: drawCornerStoreUnit (the chamfered corner buildings) is NOT
   touched here. Its height stack and geometry are considerably more
   involved (chamfer faces, flank windows, backface culling by camera
   normal) and deserve their own pass once this shape is approved -- corner
   buildings will look like the OLD one-story style next to these until
   then. Expected, not a bug.

   NEW TIER: a cornice/ledge dividing the floors, then 2-3 evenly spaced
   upper windows sized for a residential scale (smaller than the ground
   floor's display glass), then the same style parapet cap the original
   used, just higher up. Window glass reuses the same two blue tones the
   ground floor already uses (0x6b93a8 / 0x86adc0) for palette consistency
   rather than inventing a new color language.

   THIRD STORY (Sir's correction, second pass): the plaza-fill removal
   left bare open ground visible in commercial block interiors once the
   1-2 standalone plaza buildings stopped being drawn. Not fixed with a
   ground-tone change -- fixed architecturally. A recessed, deeper third
   story sits on top of the second floor's roofline, set back from the
   facade and reaching further into the block than the lower floors do,
   so ITS roof covers open interior ground instead of leaving it bare.
   Conservative reach (see f3depth's own comment) to avoid buildings on
   opposite sides of the same block colliding mid-interior.

   PORT NOTE: this will show as a monkeypatched method in "port check" --
   expected. Porting means replacing drawStoreUnit's body in game/index.html
   (and game-logic.js) with this one, not adding a call site.
   =========================================================================== */
(() => {
  const sc = game.scene.scenes[0];
  if(!sc){ console.log('bridge not up'); return; }

  if(!sc.__origDrawStoreUnit) sc.__origDrawStoreUnit = sc.drawStoreUnit;

  sc.drawStoreUnit = function(g, ox, oy, dv, rv, w, seed, isFirst, isLast, part='all', a0=0, a1=w, opts=null){
    const rng = mulberry32(seed);
    const G = (a,b,h) => this.W(ox + dv.x*a + rv.x*b, oy + dv.y*a + rv.y*b, h);
    const inS = c => c >= a0 && (c < a1 || a1 >= w);
    const clipQ = (lo, hi, bOff, z0, z1, color, alpha) => {
      const q0 = Math.max(lo, a0), q1 = Math.min(hi, a1);
      if(q1 - q0 < 0.5) return;
      this.quadOn(g, [G(q0,bOff,z1),G(q1,bOff,z1),G(q1,bOff,z0),G(q0,bOff,z0)], color, alpha);
    };
    const C = STORE_PALETTES[Math.floor(rng()*STORE_PALETTES.length)];
    const D = STORE_DEPTH;
    const doorLeft = rng() < 0.5;

    // ground floor -- unchanged from the original
    const kickH = 18;
    const dZ1 = DOOR_H*0.88;
    const winZ0 = kickH+2, winZ1 = dZ1 + 14 + rng()*16;
    const awnZ0 = winZ1+4, awnZ1 = awnZ0+18;
    const signZ0 = awnZ1+8, signZ1 = signZ0+16;

    // NEW: second floor tier
    const corniceZ0 = signZ1+6, corniceZ1 = corniceZ0+6;
    const f2winZ0 = corniceZ1+16, f2winZ1 = f2winZ0+52;
    const parapetZ0 = f2winZ1+14;
    const H = parapetZ0 + 16 + rng()*10;   // was signZ1+16+rng()*12 -- same rng() call count preserved below

    if(part !== 'roof'){
      const back = [G(a0,-D,H), G(a1,-D,H), G(a1,-D,0), G(a0,-D,0)];
      this.quadOn(g, back, C.wallDk);
      if(isFirst && a0 === 0){ const l=[G(0,0,H),G(0,-D,H),G(0,-D,0),G(0,0,0)]; this.quadOn(g,l,C.wallDk); this.edgeOn(g,l,C.trim,1); }
      if(isLast && a1 >= w){  const r=[G(w,0,H),G(w,-D,H),G(w,-D,0),G(w,0,0)]; this.quadOn(g,r,C.wallLt); this.edgeOn(g,r,C.trim,1); }
    }

    /* ---------- THIRD STORY: recessed, shallow ----------
       Sir's call: stop trying to make each unit's own roof reach deep
       enough to tile with its neighbors' -- that's what caused the
       building-over-building z-fighting mess (queueCommercialEdgeAt
       gives each unit ONE depth key based on its own shallow position;
       stretching geometry far past that position breaks the sort for
       exactly the stretched part, and multiple units' stretched roofs
       overlapping compounds it). Not worth chasing a per-unit sort fix
       for this. Third story goes back to a normal shallow box -- set
       back from the facade for the step-back read, but no deeper than
       the ground floor's own D. The block-level canopy added below
       (queueCommercialBlock) covers the actual interior gap instead,
       as ONE quad per block instead of N competing ones. */
    const f3setback = 60, f3wallH = 90;
    const f3b0 = -f3setback, f3b1 = -D;
    const f3z0 = H, f3z1 = f3z0 + f3wallH;

    if(part !== 'body'){
      const ov = isFirst||isLast ? 5 : 0;
      const rL = a0 === 0 ? (isFirst?-ov:0) : a0, rR = a1 >= w ? (isLast?w+ov:w) : a1;
      const roof = [G(rL,ov,H), G(rR,ov,H), G(rR,-D-ov,H), G(rL,-D-ov,H)];
      this.quadOn(g, roof, C.trim);
      g.lineStyle(1, C.wallDk, 1);
      g.lineBetween(roof[0].x,roof[0].y,roof[1].x,roof[1].y);
      g.lineBetween(roof[3].x,roof[3].y,roof[2].x,roof[2].y);
      if(a0 === 0) g.lineBetween(roof[0].x,roof[0].y,roof[3].x,roof[3].y);
      if(a1 >= w) g.lineBetween(roof[1].x,roof[1].y,roof[2].x,roof[2].y);

      // third story's own roof cap -- shallow now, matches its own
      // recessed-but-not-deep footprint. Covering the gap is the new
      // block-level canopy's job, not this.
      const f3roof = [G(0,f3b0+8,f3z1), G(w,f3b0+8,f3z1), G(w,f3b1,f3z1), G(0,f3b1,f3z1)];
      this.quadOn(g, f3roof, C.trim);
      this.edgeOn(g, f3roof, C.wallDk, 1);
    }

    if(part !== 'roof'){
      // recessed front wall -- reads as a real step-back, not a taller floor in place
      const f3front = [G(6,f3b0,f3z1), G(w-6,f3b0,f3z1), G(w-6,f3b0,f3z0), G(6,f3b0,f3z0)];
      this.quadOn(g, f3front, C.wallLt);
      this.edgeOn(g, f3front, C.trim, 1);
      if(isFirst && a0 === 0){ const l=[G(6,f3b0,f3z1),G(6,f3b1,f3z1),G(6,f3b1,f3z0),G(6,f3b0,f3z0)]; this.quadOn(g,l,C.wallDk); }
      if(isLast && a1 >= w){  const r=[G(w-6,f3b0,f3z1),G(w-6,f3b1,f3z1),G(w-6,f3b1,f3z0),G(w-6,f3b0,f3z0)]; this.quadOn(g,r,C.wallDk); }
      // a couple of plain windows -- upper massing, not another shopfront
      const f3winN = 2;
      for(let i=0;i<f3winN;i++){
        const cx = w*(i+0.5)/f3winN, ww2 = 24;
        this.quadOn(g, [G(cx-ww2/2,f3b0-0.5,f3z0+60), G(cx+ww2/2,f3b0-0.5,f3z0+60), G(cx+ww2/2,f3b0-0.5,f3z0+18), G(cx-ww2/2,f3b0-0.5,f3z0+18)], 0x6b93a8);
      }
    }

    if(part === 'roof') return;

    const face = [G(a0,0.4,H), G(a1,0.4,H), G(a1,0.4,0), G(a0,0.4,0)];
    this.quadOn(g, face, C.wall);

    clipQ(2, w-2, 0.42, 0, kickH, C.wallDk);

    const doorW = Math.min(DOOR_W*0.72, w*0.3);
    const doorX = doorLeft ? 6 : w - doorW - 6;
    const noDoor = !!(opts && opts.noDoor);
    const glassX0 = noDoor ? 6 : (doorLeft ? doorX+doorW+4 : 6);
    const glassX1 = noDoor ? w-6 : (doorLeft ? w-6 : doorX-4);

    if(!noDoor && inS(doorX + doorW/2)){
      this.quadOn(g, [G(doorX,0.5,dZ1),G(doorX+doorW,0.5,dZ1),G(doorX+doorW,0.5,0),G(doorX,0.5,0)], C.wallDk);
      this.quadOn(g, [G(doorX+3,0.53,dZ1-4),G(doorX+doorW-3,0.53,dZ1-4),G(doorX+doorW-3,0.53,4),G(doorX+3,0.53,4)], 0x6b93a8, 0.85);
    }

    if(glassX1 - glassX0 > 12){
      clipQ(glassX0, glassX1, 0.5, winZ0-3, winZ1+3, 0xd8d0bd);
      clipQ(glassX0+2, glassX1-2, 0.54, winZ0, winZ1, 0x6b93a8);
      clipQ(glassX0+3, glassX0+(glassX1-glassX0)*0.4, 0.55, winZ0+3, winZ1-3, 0x86adc0, 0.55);
    }

    const awnOut = 20, stripeN = 6;
    for(let i=0;i<stripeN;i++){
      const sx0 = Math.max(w*i/stripeN, a0), sx1 = Math.min(w*(i+1)/stripeN, a1);
      const col = AWNING_STRIPES[i%2===0?0:1] === 0xffffff ? 0xf0ece0 : C.wallLt;
      if(sx1 - sx0 < 0.5) continue;
      this.quadOn(g, [G(sx0,0.5,awnZ1),G(sx1,0.5,awnZ1),G(sx1,0.5+awnOut*0.01,awnZ0),G(sx0,0.5+awnOut*0.01,awnZ0)], col);
    }
    clipQ(0, w, 0.42, awnZ1, awnZ1+3, C.trim);

    const gx0 = Math.max(4, a0), gx1 = Math.min(w-4, a1);
    if(gx1 - gx0 > 0.5){
      const sq = [G(gx0,0.44,signZ1),G(gx1,0.44,signZ1),G(gx1,0.44,signZ0),G(gx0,0.44,signZ0)];
      this.quadOn(g, sq, C.sign);
      g.lineStyle(1, C.trim, 1);
      g.lineBetween(sq[0].x,sq[0].y,sq[1].x,sq[1].y);
      g.lineBetween(sq[3].x,sq[3].y,sq[2].x,sq[2].y);
      if(a0 <= 4) g.lineBetween(sq[0].x,sq[0].y,sq[3].x,sq[3].y);
      if(a1 >= w-4) g.lineBetween(sq[1].x,sq[1].y,sq[2].x,sq[2].y);
    }

    /* ---------- NEW: second floor ---------- */
    // cornice/ledge dividing ground floor from the floor above
    clipQ(0, w, 0.43, corniceZ0, corniceZ1, C.trim);
    clipQ(1, w-1, 0.41, corniceZ1-2, corniceZ1, C.wallLt);

    // upper-floor windows -- 2 for a narrow unit, 3 for a wide one
    const f2n = w > T2*3.2 ? 3 : 2;
    const f2margin = w*0.1, f2usable = w - f2margin*2;
    const f2winW = Math.min(38, f2usable/f2n - 10);
    for(let i=0;i<f2n;i++){
      const cx = f2margin + f2usable*(i+0.5)/f2n;
      const wx0 = cx - f2winW/2, wx1 = cx + f2winW/2;
      clipQ(wx0-3, wx1+3, 0.48, f2winZ0-3, f2winZ1+3, 0xd8d0bd);
      clipQ(wx0, wx1, 0.5, f2winZ0, f2winZ1, 0x6b93a8);
      clipQ(wx0+2, wx0+f2winW*0.4, 0.52, f2winZ0+3, f2winZ1-3, 0x86adc0, 0.55);
    }

    // parapet cap band, same style language as the roof trim
    clipQ(0, w, 0.42, parapetZ0, parapetZ0+4, C.trim);
  };

  console.log('drawStoreUnit patched -- second floor active on ordinary commercial units. drawCornerStoreUnit untouched.');
})();

/* ===========================================================================
   ROOFTOP CANOPY -- covers the block interior gap, no per-unit sorting
   ===========================================================================
   Sir's call after seeing the per-unit deep-roof approach z-fight: stop
   trying to make N units' roofs tile together (each gets ONE depth key
   from its own shallow position -- queueCommercialEdgeAt's vq.push(depth:
   hx+hy, ...) -- and stretching geometry far past that position breaks the
   sort for exactly the stretched part). One quad per BLOCK instead, queued
   with isRoof:true so it lands in the same global-last roof pass every
   other roof already uses (confirmed at blockVQ's own filter: bodies vs
   roofs, roofs drawn after all bodies regardless of individual depth) --
   piggybacking on an existing correct mechanism instead of inventing a
   new one.

   Interior rect reuses queueCommercialInterior's own RING inset math (that
   function is disabled, not deleted -- see its doc comment) so the canopy
   lines up with the same "one tile of walkway past the perimeter ring"
   logic the game already established.

   CANOPY_Z=460 is picked to clear every building's own roofline
   (H + f3wallH, ~422-448 across drawStoreUnit's rng() range) with margin,
   not tied to any one building's actual height.

   Rooftop clutter (AC units, satellite dishes, vents) is genuinely rough
   -- flat-shaded boxes and a stick-and-ellipse dish, not anything close to
   the polish of the building work above. Sir asked for it to break up the
   canopy visually, not for finished art; treat it as a placeholder pass.
   =========================================================================== */
(() => {
  const sc = game.scene.scenes[0];
  if(!sc){ console.log('bridge not up'); return; }

  if(!sc.__origQueueCommercialBlock) sc.__origQueueCommercialBlock = sc.queueCommercialBlock;

  sc.queueCommercialBlock = function(vq, blk, excludeEdges=null, cornerSkip=null){
    this.__origQueueCommercialBlock(vq, blk, excludeEdges, cornerSkip);

    const RING = HOUSE_DEPTH + T2*0.3 + T2;
    const ix0 = blk.x0 + RING, ix1 = blk.x1 - RING;
    const iy0 = blk.y0 + RING, iy1 = blk.y1 - RING;
    if(ix1 - ix0 < T2*2 || iy1 - iy0 < T2*2) return;   // degenerate block, skip

    const CANOPY_Z = 460;
    const cx = (ix0+ix1)/2, cy = (iy0+iy1)/2;
    const canopy = [
      this.W(ix0, iy0, CANOPY_Z), this.W(ix1, iy0, CANOPY_Z),
      this.W(ix1, iy1, CANOPY_Z), this.W(ix0, iy1, CANOPY_Z)
    ];
    vq.push({ depth: cx+cy, isRoof: true, fn: (g) => {
      this.quadOn(g, canopy, 0x4a4a4a);
      this.edgeOn(g, canopy, 0x333333, 1);
    }});

    // rooftop clutter -- seeded off block center so it's stable per block
    const rng = mulberry32(((Math.round(cx)*7919) ^ (Math.round(cy)*104729) ^ 0x9a7c) >>> 0);
    const nProps = 3 + Math.floor(rng()*5);
    for(let i=0;i<nProps;i++){
      const px = ix0 + 40 + rng()*Math.max(1,(ix1-ix0-80));
      const py = iy0 + 40 + rng()*Math.max(1,(iy1-iy0-80));
      const kind = rng();
      const pdepth = px+py+0.1;   // just above the canopy's own depth
      if(kind < 0.4){
        const s = 26 + rng()*14;
        vq.push({ depth: pdepth, fn: (g) => {
          const top = [this.W(px-s/2,py-s/2,CANOPY_Z+s*0.6), this.W(px+s/2,py-s/2,CANOPY_Z+s*0.6),
                       this.W(px+s/2,py+s/2,CANOPY_Z+s*0.6), this.W(px-s/2,py+s/2,CANOPY_Z+s*0.6)];
          const front = [this.W(px-s/2,py+s/2,CANOPY_Z+s*0.6), this.W(px+s/2,py+s/2,CANOPY_Z+s*0.6),
                         this.W(px+s/2,py+s/2,CANOPY_Z), this.W(px-s/2,py+s/2,CANOPY_Z)];
          const side = [this.W(px+s/2,py-s/2,CANOPY_Z+s*0.6), this.W(px+s/2,py+s/2,CANOPY_Z+s*0.6),
                       this.W(px+s/2,py+s/2,CANOPY_Z), this.W(px+s/2,py-s/2,CANOPY_Z)];
          this.quadOn(g, top, 0xc4c4bc);
          this.quadOn(g, front, 0x9a9a92);
          this.quadOn(g, side, 0x8a8a82);
        }});
      } else if(kind < 0.7){
        const r = 12 + rng()*6;
        vq.push({ depth: pdepth, fn: (g) => {
          const base = this.W(px, py, CANOPY_Z);
          const tip = this.W(px, py, CANOPY_Z+24);
          g.lineStyle(3, 0x444444, 1);
          g.lineBetween(base.x, base.y, tip.x, tip.y);
          g.fillStyle(0x666666, 1);
          g.fillEllipse(tip.x, tip.y, r*1.6, r);
        }});
      } else {
        const s = 14 + rng()*8;
        vq.push({ depth: pdepth, fn: (g) => {
          const top = [this.W(px-s/2,py-s/2,CANOPY_Z+s), this.W(px+s/2,py-s/2,CANOPY_Z+s),
                       this.W(px+s/2,py+s/2,CANOPY_Z+s), this.W(px-s/2,py+s/2,CANOPY_Z+s)];
          this.quadOn(g, top, 0x333333);
        }});
      }
    }
  };

  console.log('queueCommercialBlock patched -- rooftop canopy + AC/satellite/vent clutter active.');
})();
