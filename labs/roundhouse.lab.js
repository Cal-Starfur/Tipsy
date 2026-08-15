/* ===========================================================================
   ROUNDHOUSE — aquarium, railings and pier lamps (bench lab)
   ===========================================================================
   Modelled from two reference photos of the Manhattan Beach pier that Sir
   supplied (2026-08-14): the Roundhouse Aquarium close up, and the pier
   looking seaward with its railings and lamp posts.

   PALETTE IS SAMPLED, NOT EYEBALLED
   Both photos were masked by hue and averaged, so these are the building's
   own colours rather than a guess at them. Values agreed across the two
   shots to within a few points on every family:

       teal trim    #6faab0   dark #3d7d82
       stucco       #f2f0e8   dark #dcd9cf
       sign navy    #2f3e5e   dark #0d1a3b
       roof tile    #824945   dark #62322f

   The roof sample is the honest weak one. Both photos are late-day and
   backlit, so the terracotta reads darker and greyer than it does at noon
   -- the close-up's roof pixels average #5a4042, which is clearly shadow,
   not tile. RH.roof is seeded from the pier shot's #824945 and put on a
   slider rather than pretending the sample settled it.

   ALSO WORTH KNOWING: the real pier deck is CONCRETE, mid grey (#8f908f).
   Ours is 0xb98a5e, a wood brown. Not changed here -- flagged, because it
   is a shipped-art decision and this lab is not the place to make it
   quietly.

   WHAT THIS DEFINES
   Three prop functions written in exactly the shape drawProp's own
   branches take -- (g, W, t, o), where W(dx,dy,dz) is the caller's local
   frame and every fill goes through this.quadOn. drawLampHull is the
   model. Porting is pasting the function and adding a drawProp branch;
   there is no translation step and no second copy of the geometry.

       drawRoundhouse  octagonal two-tier aquarium
       drawPierRail    railing run between two points
       drawPierLamp    globe lamp on a fluted column

   THE FOUR-HEADING RULE APPLIES AND IS NOT OPTIONAL
   An octagonal prism has eight faces and this file depth-sorts them by
   hand, which is precisely the gWorld/g/gFront failure mode labs/README.md
   says nothing ships without clearing. Use the bench's f0/f1/f2/f3 row, or
   `cycle all 4`, before any of this is considered done.
   =========================================================================== */

(() => {
  const scene = game.scene.scenes.find(s => s.route);
  if (!scene) { console.log('no scene with a route yet -- press start run'); return; }

  document.getElementById('rhPanel')?.remove();
  scene.__rhOff && scene.__rhOff();

  /* ---------------- palette (sampled, see header) ---------------- */
  const RH = {
    stucco: 0xf2f0e8, stuccoDk: 0xdcd9cf, stuccoSh: 0xc6c3ba,
    teal: 0x6faab0, tealDk: 0x3d7d82,
    navy: 0x2f3e5e, navyDk: 0x0d1a3b,
    roof: 0xa8553f, roofDk: 0x7d3c2d, roofRidge: 0xc9705a,
    glass: 0x2f6f9e, glassHi: 0x74b9dd,
    rail: 0x5fa39f, railDk: 0x3a7370,
    lamp: 0xf6f2df, lampDk: 0xd9d3bd,
    globe: 0xfffdf0, globeGlow: 0xffe9a8,
    /* sampled from the pier-bench reference, 2026-08-14 */
    bench: 0x96645e, benchDk: 0x764e4c, benchLt: 0xb57a73,
    gullBody: 0xf7f6f2, gullMantle: 0xb9c2c8, gullTip: 0x33383d,
    gullBill: 0xe8b13c, gullLeg: 0xdba98c, gullEye: 0x22262a,
    shadow: 0x2a2a2a,
  };

  /* ---------------- dimensions, all tunable ----------------
     rWall is the octagon's circumradius. Defaults are pinned to the
     shore lattice's own aquarium roof radius (WG_COAST-derived, via the
     waterfront lab's ring.rInner) so the building fills the footprint
     classifyShore already calls 'building' -- the model and the collision
     shape are the same object, not two that have to be kept in step. */
  const D = {
    rWall: 520,        // octagon circumradius at the wall
    wallH: 300,        // wall height
    baseH: 26,         // teal skirt at the bottom
    corniceH: 34,      // teal band at the top of the wall
    eave: 90,          // how far the roof oversails the wall
    roofH: 165,        // wall top -> roof apex ring
    drumR: 175,        // cupola drum circumradius
    drumH: 130,
    drumRoofH: 80,
    finialH: 95,
    archW: 0.62,       // arch width as a fraction of each face
    archH: 0.72,       // arch height as a fraction of wall height
    signW: 0.86,       // sign band width as a fraction of the face
    railH: 118,        // railing height
    railPost: 300,     // spacing between railing posts
    lampH: 430,        // lamp overall height
    lampSpacing: 1100, // spacing along the pier
    lampGlow: 1,
    pylonDepth: 460,   // how far the piles run below the deck
    pileW: 26,         // pile half-width
    bentGap: 900,      // spacing between bents along the pier
    pilesPerBent: 4,
    ringPiles: 10,
    braceDrop: 40,
    wetFrac: 0.34,     // lower fraction of each pile that reads as wet
    fascia: 44,        // deck edge beam depth
    benchLen: 300, benchDepth: 118, benchSeat: 74,
    benchBack: 168, benchSlab: 26, benchEnd: 34,
    benchScale: 0.62,
    benchGap: 2200,    // spacing along the pier
    gullSize: 46,
    gullEvery: 3,      // one gull per this many rail posts
  };

  /* ---------------- shared: octagon in the caller's local frame ----------------
     Flat-to-camera at rot=0. The +0.5 half-step is what puts a FACE toward
     the viewer rather than a corner, which is how both photos read. */
  const OCT = 8;
  function octPts(r, rot) {
    const p = [];
    for (let i = 0; i < OCT; i++) {
      const a = ((i + 0.5) / OCT) * Math.PI * 2 + (rot || 0);
      p.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
    }
    return p;
  }

  /* Faces have to be drawn far-to-near or a near wall gets painted over by
     a far one. The caller's W() folds dv/rv in, so local (dx,dy) is NOT
     world (x,y) and the depth key has to be computed through W itself.
     Projected screen y is monotonic in world (x+y) for this fixed iso
     camera, so the projected midpoint's y IS the depth key -- no need to
     reconstruct world coordinates or know the heading. */
  function faceOrder(pts, W, z) {
    return pts.map((p, i) => {
      const q = pts[(i + 1) % pts.length];
      const m = W((p.x + q.x) / 2, (p.y + q.y) / 2, z);
      return { i, depth: m.y };
    }).sort((a, b) => a.depth - b.depth);
  }

  /* per-face shade: outward normal's screen direction decides whether a
     face is lit, half-lit or in shadow. Same three-tone treatment the
     block-wrap houses use, just driven by the octagon's own normal. */
  function faceShade(pts, i, W, base, dk, sh) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
    const o = W(0, 0, 0), m = W(mx, my, 0);
    const nx = m.x - o.x, ny = m.y - o.y;
    const L = Math.hypot(nx, ny) || 1;
    /* light from up-screen-left, the same direction every other prop in
       the file is lit from */
    const d = (nx / L) * -0.55 + (ny / L) * -0.84;
    return d > 0.35 ? base : (d > -0.25 ? dk : sh);
  }

  /* =======================================================================
     THE ROUNDHOUSE
     Octagonal wall drum -> tiled hip roof -> cupola drum -> cupola roof ->
     finial. Arches, teal bands and the sign are drawn ON the wall faces in
     face-local (u along the face, v up) coordinates, which stays correct
     because a plane maps through W affinely.
     ======================================================================= */
  /* =======================================================================
     PIER PYLONS
     (2026-08-14, Sir: "the pier need pylons for support".)

     THE HARD PART IS NOT THE PILES, IT IS DRAW ORDER. Pylons hang BELOW
     the deck, so they have to be painted before the deck band or they
     paint over it. The bench cannot do that: drawWorld opens with
     g.clear() on gWorld, so anything a pre-hook draws is wiped, and the
     lab hook only ever runs after. Ordering is not available.

     It does not need to be, because the occlusion is exactly solvable.
     W() gives screen y proportional to ((x+y)/2 - z), so at a fixed screen
     column (x - y = const, which is what a vertical pile occupies) the
     deck's own near edge sits below the pile's top by (u_edge - u_top)/2,
     where u = x + y. A pile at depth d has moved down by d. So the pile
     emerges from under the deck at exactly

         d = (u_edge - u_top) / 2

     and drawing it from there downward is correctly occluded with no
     ordering at all. For the straight band that collapses to
     pierY + half - py: a pile on the near edge shows immediately, one on
     the far edge only appears PIER_W further down. Both the band and the
     round deck's disc are solved below and the deeper of the two wins,
     so a pile under the aquarium is hidden by the disc as it should be.

     PORT NOTE: in game/index.html this belongs INSIDE the coast terrain
     pass, emitted before the deck band, where ordinary painter's order
     handles it and none of this is needed. The solve exists because the
     bench draws last, not because the game will have to. */
  const PYL = {
    pile: 0xd8d2c4, pileDk: 0xb0a998,
    wet: 0x9aa39b, wetDk: 0x74807a,
    beam: 0xc4bcac, beamDk: 0x968d7e,
  };

  /* largest u = x+y on the disc, along the screen column x - y = c */
  function discEdgeU(cx, cy, R, c) {
    const p = c / 2 - cx, q = -c / 2 - cy;
    const disc = (p + q) * (p + q) - 2 * (p * p + q * q - R * R);
    if (disc < 0) return -Infinity;               // column misses the disc
    return 2 * ((-(p + q) + Math.sqrt(disc)) / 2);
  }

  function drawPierPylons(scn, g, A, o) {
    const d = Object.assign({}, D, o || {});
    const half = A.pierHalf;
    const x0 = A.pierX0, x1 = A.pierX1;
    const ringR = A.sh ? A.sh.ring.rOuter : 0;
    const K = scn.K;

    /* how far a pile at (px,py) must descend before it clears the deck */
    const emerge = (px, py) => {
      const c = px - py, uTop = px + py;
      let uEdge = -Infinity;
      /* straight band, but only where the band actually exists in x */
      const yE = A.pierY + half, xE = c + yE;
      if (xE >= x0 - ringR && xE <= x1) uEdge = xE + yE;
      /* the round deck's disc */
      if (ringR > 0) uEdge = Math.max(uEdge, discEdgeU(A.cx, A.cy, ringR, c));
      if (uEdge === -Infinity) return 0;
      return Math.max(0, (uEdge - uTop) / 2);
    };

    const pile = (px, py, top, bottom) => {
      /* FULLY HIDDEN PILES MUST BE SKIPPED, NOT DRAWN INVERTED
         (2026-08-14, Sir: "pylons are looking bad they are drawing over
         the surface of the pier").
         emerge() can exceed the pile's own length: under the round deck it
         runs up to R*sqrt(2) ~= 1592, against a default pylonDepth of 300.
         When it does, top = -e sits BELOW bottom = -depth, every quad is
         wound inside out, and an inverted quad does not vanish -- it draws,
         in the wrong place, reading exactly like a pile standing on top of
         the deck. That was the whole reported symptom.
         A pile that only emerges deeper than it is long is genuinely
         invisible from this camera -- the deck is over it -- so the honest
         answer is to draw nothing. */
      if (top <= bottom) return false;
      const w = d.pileW;
      /* two near faces, same standalone-box convention drawLampHull uses */
      scn.quadOn(g, [scn.W(px + w, py - w, top), scn.W(px + w, py + w, top),
                     scn.W(px + w, py + w, bottom), scn.W(px + w, py - w, bottom)], PYL.pileDk);
      scn.quadOn(g, [scn.W(px - w, py + w, top), scn.W(px + w, py + w, top),
                     scn.W(px + w, py + w, bottom), scn.W(px - w, py + w, bottom)], PYL.pile);
      /* waterline stain toward the bottom -- the photos' piles are darker
         and greener for the last stretch, which is what sells them as
         standing IN water rather than resting on it */
      const wl = bottom + (top - bottom) * d.wetFrac;
      scn.quadOn(g, [scn.W(px + w, py - w, wl), scn.W(px + w, py + w, wl),
                     scn.W(px + w, py + w, bottom), scn.W(px + w, py - w, bottom)], PYL.wetDk);
      scn.quadOn(g, [scn.W(px - w, py + w, wl), scn.W(px + w, py + w, wl),
                     scn.W(px + w, py + w, bottom), scn.W(px - w, py + w, bottom)], PYL.wet);
      return true;
    };

    /* bents across the straight run */
    const nBent = Math.max(1, Math.round((x1 - (x0 + ringR)) / d.bentGap));
    const perBent = Math.max(2, d.pilesPerBent);
    for (let b = 0; b <= nBent; b++) {
      const px = (x0 + ringR) + ((x1 - (x0 + ringR)) * b) / nBent;
      const bent = [];
      for (let i = 0; i < perBent; i++) {
        const py = A.pierY - half + (2 * half * i) / (perBent - 1);
        const e = emerge(px, py);
        bent.push({ py, e, drawn: pile(px, py, -e, -d.pylonDepth) });
      }
      /* cross bracing between adjacent piles, below whichever of the two
         emerges later so a brace never pokes through the deck */
      g.lineStyle(Math.max(1, 2 * K), PYL.beamDk, 0.8);
      for (let i = 0; i < bent.length - 1; i++) {
        const a2 = bent[i], b2 = bent[i + 1];
        /* a brace between a drawn pile and a hidden one would hang off
           nothing, so both ends have to be real */
        if (!a2.drawn || !b2.drawn) continue;
        const z0 = -Math.max(a2.e, b2.e) - d.braceDrop;
        const z1 = -d.pylonDepth + d.braceDrop;
        if (z0 <= z1) continue;
        const p1 = scn.W(px, a2.py, z0), p2 = scn.W(px, b2.py, z1);
        const p3 = scn.W(px, a2.py, z1), p4 = scn.W(px, b2.py, z0);
        g.lineBetween(p1.x, p1.y, p2.x, p2.y);
        g.lineBetween(p3.x, p3.y, p4.x, p4.y);
      }
    }

    /* a ring of piles under the round deck */
    if (ringR > 0) {
      const n = Math.max(4, d.ringPiles);
      for (let i = 0; i < n; i++) {
        const a2 = (i / n) * Math.PI * 2;
        const px = A.cx + Math.cos(a2) * ringR * 0.82;
        const py = A.cy + Math.sin(a2) * ringR * 0.82;
        pile(px, py, -emerge(px, py), -d.pylonDepth);
      }
    }

    /* fascia beam along the near deck edge -- the dark band under the lip
       that gives the deck thickness instead of reading as paper */
    const yE = A.pierY + half;
    scn.quadOn(g, [scn.W(x0 + ringR, yE, 0), scn.W(x1, yE, 0),
                   scn.W(x1, yE, -d.fascia), scn.W(x0 + ringR, yE, -d.fascia)], PYL.beam);

    /* ...AND THE SAME SKIRT AROUND THE ROUND END (2026-08-14, Sir: "the end
       of the pier needs a skirt like the rest of the pier"). Without it the
       straight run has thickness and the deck it leads to does not, which
       reads as the pier ending in a sheet of paper.

       ONLY PART OF THE RING IS VISIBLE, and drawing the rest would paint
       over the deck, since the lab draws after drawWorld. Which part is
       solvable rather than guessable. Screen position around the ring is

           sx ~ cos0 - sin0 = sqrt2*cos(0+45)
           sy ~ (cos0 + sin0)/2 = (sqrt2/2)*sin(0+45)

       i.e. an ellipse in phi = theta + 45. The lower half of that ellipse
       -- the edge the skirt hangs below -- is sin(phi) > 0, which is
       exactly theta in (-45deg, +135deg). Outside it the edge is the far
       rim and its skirt is behind the deck.

       The pier's own mouth is cut out of that range too: within +/-gap of
       theta 0 the ring's skirt sits directly under the approach deck, so
       drawing it would paint over the very surface it hangs from. */
    if (ringR > 0) {
      const gap = Math.asin(Math.min(0.999, half / ringR));
      const arcs = [[-Math.PI / 4, -gap], [gap, Math.PI * 0.75]];
      const N = 26;
      for (const [a0, a1] of arcs) {
        if (a1 <= a0) continue;
        for (let k = 0; k < N; k++) {
          const t0 = a0 + (a1 - a0) * (k / N), t1 = a0 + (a1 - a0) * ((k + 1) / N);
          const p0x = A.cx + Math.cos(t0) * ringR, p0y = A.cy + Math.sin(t0) * ringR;
          const p1x = A.cx + Math.cos(t1) * ringR, p1y = A.cy + Math.sin(t1) * ringR;
          /* shade by how square the segment faces the light, same treatment
             the octagon's own walls get */
          const mid = (t0 + t1) / 2;
          const lit = Math.cos(mid) * -0.55 + Math.sin(mid) * -0.84;
          scn.quadOn(g, [scn.W(p0x, p0y, 0), scn.W(p1x, p1y, 0),
                         scn.W(p1x, p1y, -d.fascia), scn.W(p0x, p0y, -d.fascia)],
                     lit > 0 ? PYL.beam : PYL.beamDk);
        }
      }
    }
  }

  /* =======================================================================
     ONE BOX HELPER, SHARED
     The lamp shipped with its own hand-written box that drew the -y wall
     instead of the +y wall -- a back face, so the post was missing a side
     and wasting a quad on one nothing can see. The cause was not the typo,
     it was that this convention existed in three separately hand-written
     places in this file and in drawLampHull in the game. Written once here
     so a fourth copy cannot disagree with the other three.

     With a FIXED iso camera the two visible walls of a standalone box are
     always +x and +y. The top cap is drawn unless something of the same
     footprint sits flush on top of it.
     ======================================================================= */
  function boxNear(scn, g, W, cx, cy, hx, hy, z0, z1, top, faceX, faceY, noTop) {
    const P = (sx, sy, z) => W(cx + sx * hx, cy + sy * hy, z);
    if (!noTop) scn.quadOn(g, [P(-1, -1, z1), P(1, -1, z1), P(1, 1, z1), P(-1, 1, z1)], top);
    scn.quadOn(g, [P(1, -1, z1), P(1, 1, z1), P(1, 1, z0), P(1, -1, z0)], faceX);
    scn.quadOn(g, [P(-1, 1, z1), P(1, 1, z1), P(1, 1, z0), P(-1, 1, z0)], faceY);
  }

  /* =======================================================================
     PIER BENCH
     Sampled from Sir's third reference (2026-08-14): a heavy precast
     concrete bench in terracotta -- two solid end slabs, a seat spanning
     them, and a solid back panel. Not a slatted park bench; there is no
     timber anywhere on it.

         terracotta  #b57a73 light, #96645e mean, #764e4c dark

     `face` is the direction the SEAT looks. In the photo the back sits
     toward the deck centreline and the seat faces the rail, which is the
     only arrangement that makes sense on a pier -- you sit to look at the
     water, not at the deck.
     ======================================================================= */
  function drawPierBench(scn, g, W, cx, cy, face, o) {
    const d = Object.assign({}, D, o || {});
    /* SCALE. Sized against the lamp, which is the one prop out here with a
       real-world anchor: a pier bench's back is about 0.22 of a lamp post's
       height, not the 0.39 this shipped at. benchScale drives every bench
       dimension together so the proportions cannot drift apart while it is
       being tuned. */
    const S = d.benchScale;
    const L = d.benchLen * S / 2, Dp = d.benchDepth * S / 2;
    const seatZ = d.benchSeat * S, backZ = d.benchBack * S;
    const slab = d.benchSlab * S, endW = d.benchEnd * S;
    /* FACE IS AN AXIS **AND** A SIGN (2026-08-14, Sir: "they all face the
       same direction"). The first version took only the axis, so every
       bench on the pier had its back on the same side -- the north row sat
       looking inland at the deck instead of out at the water. `face` is now
       0/1 for the axis and `d.benchFacing` (+1/-1) for which way the seat
       looks along it, and the caller passes the side it placed the bench
       on. On a pier the seat always faces the nearer rail. */
    const sgn = (o && o.facing) || 1;
    const along = face ? { x: 0, y: 1 } : { x: 1, y: 0 };
    const out = face ? { x: sgn, y: 0 } : { x: 0, y: sgn };
    const at = (a2, o2) => ({ x: cx + along.x * a2 + out.x * o2,
                              y: cy + along.y * a2 + out.y * o2 });
    const hx = face ? Dp : L, hy = face ? L : Dp;
    const B = RH.bench, BD = RH.benchDk, BL = RH.benchLt;
    /* two end slabs */
    for (const s2 of [-1, 1]) {
      const e = at(s2 * (L - endW / 2), 0);
      boxNear(scn, g, W, e.x, e.y, face ? Dp : endW / 2,
              face ? endW / 2 : Dp, 0, seatZ, BL, BD, B);
    }
    /* the seat spanning them */
    const c0 = at(0, 0);
    boxNear(scn, g, W, c0.x, c0.y, hx, hy, seatZ - slab, seatZ, BL, BD, B);
    /* the back panel, at the inboard edge -- opposite the way the seat looks */
    const bk = at(0, -(Dp - slab / 2));
    boxNear(scn, g, W, bk.x, bk.y,
            face ? slab / 2 : L, face ? L : slab / 2,
            seatZ, backZ, BL, BD, B);
  }

  /* =======================================================================
     SEAGULL
     Perched, which is what they do on a pier rail. Body and head white,
     mantle grey, black wingtips, yellow bill, and the idle is a slow head
     turn rather than a flap -- a bird that flaps forever on the spot reads
     as broken. Seeded off position so a given gull always faces the same
     way and they do not all bob in unison.
     ======================================================================= */
  function drawSeagull(scn, g, W, cx, cy, z, t, o) {
    const d = Object.assign({}, D, o || {});
    const K = scn.K, S = d.gullSize;
    const seed = ((Math.round(cx) * 7919) ^ (Math.round(cy) * 104729)) >>> 0;
    const rng = mulberry32(seed);
    const dir = rng() < 0.5 ? -1 : 1;
    const phase = rng() * Math.PI * 2;
    /* slow head turn, plus the smallest body bob -- alive, not animated */
    const turn = Math.sin(t * 0.0006 + phase) * 0.5;
    const bob = Math.sin(t * 0.0011 + phase) * S * 0.03;
    const o0 = W(cx, cy, z + bob);
    /* legs */
    g.lineStyle(Math.max(1, 1.3 * K), RH.gullLeg, 1);
    for (const lo of [-0.18, 0.18]) {
      const a2 = W(cx + lo * S * dir, cy + lo * S, z);
      const b2 = W(cx + lo * S * dir, cy + lo * S, z + S * 0.22 + bob);
      g.lineBetween(a2.x, a2.y, b2.x, b2.y);
    }
    /* body: an ellipse with the tail drawn as a wedge behind it */
    g.fillStyle(RH.gullBody, 1);
    g.fillEllipse(o0.x, o0.y - S * 0.30 * K, S * 0.92 * K, S * 0.58 * K);
    g.fillStyle(RH.gullMantle, 1);
    g.fillEllipse(o0.x - dir * S * 0.10 * K, o0.y - S * 0.34 * K, S * 0.62 * K, S * 0.36 * K);
    /* black wingtip, the detail that makes it read as a gull and not a dove */
    g.fillStyle(RH.gullTip, 1);
    g.fillTriangle(o0.x - dir * S * 0.34 * K, o0.y - S * 0.34 * K,
                   o0.x - dir * S * 0.62 * K, o0.y - S * 0.22 * K,
                   o0.x - dir * S * 0.30 * K, o0.y - S * 0.20 * K);
    /* head + bill, turning slowly */
    const hx2 = o0.x + dir * (S * 0.34 + turn * S * 0.10) * K;
    const hy2 = o0.y - S * 0.60 * K;
    g.fillStyle(RH.gullBody, 1);
    g.fillCircle(hx2, hy2, S * 0.24 * K);
    g.fillStyle(RH.gullBill, 1);
    g.fillTriangle(hx2 + dir * S * 0.20 * K, hy2,
                   hx2 + dir * S * 0.46 * K, hy2 + S * 0.04 * K,
                   hx2 + dir * S * 0.20 * K, hy2 + S * 0.10 * K);
    g.fillStyle(RH.gullEye, 1);
    g.fillCircle(hx2 + dir * S * 0.10 * K, hy2 - S * 0.04 * K, Math.max(0.8, S * 0.045 * K));
  }

  function drawRoundhouse(scn, g, W, t, o) {
    const d = Object.assign({}, D, o || {});
    const wall = octPts(d.rWall, 0);
    const eave = octPts(d.rWall + d.eave, 0);
    const drum = octPts(d.drumR, 0);
    const drumEave = octPts(d.drumR + d.eave * 0.35, 0);
    const Q = (pts, col, alpha) => scn.quadOn(g, pts, col, alpha);

    /* ground shadow */
    const sh0 = W(0, 0, 0);
    g.fillStyle(RH.shadow, 0.16);
    g.fillEllipse(sh0.x, sh0.y + 6 * scn.K, (d.rWall + d.eave) * 2.1 * scn.K,
                  (d.rWall + d.eave) * 0.95 * scn.K);

    /* ---- wall faces, far to near ---- */
    const zTop = d.wallH;
    for (const f of faceOrder(wall, W, zTop / 2)) {
      const i = f.i, p = wall[i], q = wall[(i + 1) % OCT];
      const col = faceShade(wall, i, W, RH.stucco, RH.stuccoDk, RH.stuccoSh);
      /* the face itself */
      Q([W(p.x, p.y, 0), W(q.x, q.y, 0), W(q.x, q.y, zTop), W(p.x, p.y, zTop)], col);

      /* face-local helper: u across the face, v up it */
      const P = (u, v) => W(p.x + (q.x - p.x) * u, p.y + (q.y - p.y) * u, v);

      /* teal skirt along the bottom, teal cornice along the top */
      const tealFace = (col === RH.stucco) ? RH.teal : RH.tealDk;
      Q([P(0, 0), P(1, 0), P(1, d.baseH), P(0, d.baseH)], tealFace);
      Q([P(0, zTop - d.corniceH), P(1, zTop - d.corniceH), P(1, zTop), P(0, zTop)], tealFace);

      /* the arched opening: a rectangle capped with a semicircle, walked
         as one polygon in face-local coords so it lands on the plane */
      const aw = d.archW, u0 = 0.5 - aw / 2, u1 = 0.5 + aw / 2;
      const springV = d.baseH + (zTop - d.baseH) * 0.42;
      const topV = d.baseH + (zTop - d.baseH) * d.archH;
      const rU = (u1 - u0) / 2, rV = topV - springV;
      const arch = [P(u0, d.baseH), P(u0, springV)];
      for (let k = 1; k < 12; k++) {
        const a = Math.PI * (1 - k / 12);
        arch.push(P(0.5 + Math.cos(a) * rU, springV + Math.sin(a) * rV));
      }
      arch.push(P(u1, springV), P(u1, d.baseH));
      /* teal surround, then the glass inset a little inside it */
      Q(arch, tealFace === RH.teal ? RH.teal : RH.tealDk);
      const inset = 0.055, vin = (zTop - d.baseH) * 0.035;
      const gi0 = u0 + inset, gi1 = u1 - inset;
      const gRU = (gi1 - gi0) / 2, gRV = rV - vin;
      const glass = [P(gi0, d.baseH + vin), P(gi0, springV)];
      for (let k = 1; k < 12; k++) {
        const a = Math.PI * (1 - k / 12);
        glass.push(P(0.5 + Math.cos(a) * gRU, springV + Math.sin(a) * gRV));
      }
      glass.push(P(gi1, springV), P(gi1, d.baseH + vin));
      Q(glass, col === RH.stucco ? RH.glassHi : RH.glass);
      /* fanlight mullions: radial bars in the arch head, as the photo has */
      g.lineStyle(Math.max(1, 1.6 * scn.K), tealFace, 0.9);
      for (let k = 1; k < 5; k++) {
        const a = Math.PI * (1 - k / 5);
        const c = P(0.5, springV);
        const e = P(0.5 + Math.cos(a) * gRU, springV + Math.sin(a) * gRV);
        g.lineBetween(c.x, c.y, e.x, e.y);
      }
      /* diamond accents in the frieze between arch head and cornice */
      const dv2 = (zTop - d.corniceH + topV) / 2, dU = 0.055, dV = (zTop - topV) * 0.22;
      for (const du of [0.5 - aw / 2 - 0.075, 0.5 + aw / 2 + 0.075]) {
        if (du < 0.04 || du > 0.96) continue;
        Q([P(du, dv2 - dV), P(du + dU, dv2), P(du, dv2 + dV), P(du - dU, dv2)], tealFace);
      }
    }

    /* ---- the AQUARIUM sign, on the face nearest the camera ----
       TWICE WRONG BEFORE THIS. First pass put it above the wall, where
       the roof paints over it. Second pass moved it onto the frieze --
       correct per the photo, still invisible, because the EAVE hides the
       top of the wall in this projection and nobody had worked out by
       how much.

       W() gives screen y = ((xr+yr)*0.5 - z)*K, so a point on the wall at
       height z is hidden by the eave directly outboard of it when

           (S*0.5 - z)  <  ((S + e)*0.5 - zTop)      =>   z > zTop - e/2

       where e is the eave's own contribution to (x+y). For the face most
       square to the camera e approaches eave*sqrt(2), so the occluded
       band is the top eave*0.71 of the wall -- 64 units at the shipped
       eave of 90. signCeil is that limit; the band hangs below it, and
       archH is defaulted low enough to leave the room. */
    {
      let best = null;
      for (let i = 0; i < OCT; i++) {
        const p = wall[i], q = wall[(i + 1) % OCT];
        const m = W((p.x + q.x) / 2, (p.y + q.y) / 2, zTop);
        if (!best || m.y > best.m.y) best = { i, m, p, q };
      }
      const { p, q } = best;
      const P = (u, v) => W(p.x + (q.x - p.x) * u, p.y + (q.y - p.y) * u, v);
      const signCeil = zTop - d.eave * Math.SQRT1_2;
      const bandH = (zTop - d.baseH) * 0.19;
      const v1 = signCeil - bandH * 0.12, v0 = v1 - bandH;
      const s0 = 0.5 - d.signW / 2, s1 = 0.5 + d.signW / 2;
      Q([P(s0, v0), P(s1, v0), P(s1, v1), P(s0, v1)], RH.navy);
      /* the lettering reads as one light band at game zoom -- drawn as a
         band, not as glyphs, which would be illegible and cost 8 quads */
      const lp = 0.06, lv = v1 - v0;
      Q([P(s0 + lp, v0 + lv * 0.28), P(s1 - lp, v0 + lv * 0.28),
         P(s1 - lp, v0 + lv * 0.72), P(s0 + lp, v0 + lv * 0.72)], 0xf2f0e8, 0.94);
    }

    /* ---- tiled hip roof: wall top -> eave ring -> apex ring ---- */
    const apexR = d.drumR * 1.06, apex = octPts(apexR, 0);
    const zEave = zTop, zApex = zTop + d.roofH;
    for (const f of faceOrder(eave, W, zEave)) {
      const i = f.i;
      const e0 = eave[i], e1 = eave[(i + 1) % OCT];
      const a0 = apex[i], a1 = apex[(i + 1) % OCT];
      const w0 = wall[i], w1 = wall[(i + 1) % OCT];
      const col = faceShade(eave, i, W, RH.roof, RH.roofDk, RH.roofDk);
      /* the oversailing soffit under the eave */
      Q([W(w0.x, w0.y, zEave), W(w1.x, w1.y, zEave),
         W(e1.x, e1.y, zEave - 18), W(e0.x, e0.y, zEave - 18)], RH.stuccoSh);
      /* the pitched face */
      Q([W(e0.x, e0.y, zEave), W(e1.x, e1.y, zEave),
         W(a1.x, a1.y, zApex), W(a0.x, a0.y, zApex)], col);
      /* barrel-tile ribs, running up the slope */
      g.lineStyle(Math.max(1, 1.2 * scn.K), RH.roofDk, 0.5);
      for (let k = 1; k < 7; k++) {
        const u = k / 7;
        const b0 = W(e0.x + (e1.x - e0.x) * u, e0.y + (e1.y - e0.y) * u, zEave);
        const b1 = W(a0.x + (a1.x - a0.x) * u, a0.y + (a1.y - a0.y) * u, zApex);
        g.lineBetween(b0.x, b0.y, b1.x, b1.y);
      }
      /* hip ridge along the leading edge */
      g.lineStyle(Math.max(1, 1.8 * scn.K), RH.roofRidge, 0.85);
      const r0 = W(e0.x, e0.y, zEave), r1 = W(a0.x, a0.y, zApex);
      g.lineBetween(r0.x, r0.y, r1.x, r1.y);
    }

    /* ---- cupola drum, its own little roof, and the finial ---- */
    const zD0 = zApex, zD1 = zApex + d.drumH;
    for (const f of faceOrder(drum, W, (zD0 + zD1) / 2)) {
      const i = f.i, p = drum[i], q = drum[(i + 1) % OCT];
      const col = faceShade(drum, i, W, RH.stucco, RH.stuccoDk, RH.stuccoSh);
      Q([W(p.x, p.y, zD0), W(q.x, q.y, zD0), W(q.x, q.y, zD1), W(p.x, p.y, zD1)], col);
      /* louvre slots, the dark vertical openings in the photo */
      const P = (u, v) => W(p.x + (q.x - p.x) * u, p.y + (q.y - p.y) * u, v);
      Q([P(0.28, zD0 + d.drumH * 0.18), P(0.72, zD0 + d.drumH * 0.18),
         P(0.72, zD1 - d.drumH * 0.18), P(0.28, zD1 - d.drumH * 0.18)],
        col === RH.stucco ? RH.tealDk : RH.navyDk);
    }
    const zC1 = zD1 + d.drumRoofH;
    for (const f of faceOrder(drumEave, W, zD1)) {
      const i = f.i;
      const e0 = drumEave[i], e1 = drumEave[(i + 1) % OCT];
      const col = faceShade(drumEave, i, W, RH.roof, RH.roofDk, RH.roofDk);
      Q([W(e0.x, e0.y, zD1), W(e1.x, e1.y, zD1), W(0, 0, zC1)], col);
    }
    /* finial: a thin mast with the weathervane's crossbar */
    {
      const a = W(0, 0, zC1), b = W(0, 0, zC1 + d.finialH);
      g.lineStyle(Math.max(1.5, 2.4 * scn.K), RH.tealDk, 1);
      g.lineBetween(a.x, a.y, b.x, b.y);
      const c0 = W(-d.drumR * 0.28, 0, zC1 + d.finialH * 0.72);
      const c1 = W(d.drumR * 0.28, 0, zC1 + d.finialH * 0.72);
      g.lineStyle(Math.max(1, 1.6 * scn.K), RH.tealDk, 1);
      g.lineBetween(c0.x, c0.y, c1.x, c1.y);
      g.fillStyle(RH.teal, 1);
      g.fillCircle(b.x, b.y, Math.max(1.5, 3.2 * scn.K));
    }
  }

  /* =======================================================================
     PIER RAILING
     A run between two points in the caller's local frame. Top rail, bottom
     rail, posts on a fixed pitch, and the diamond infill the photo shows
     between them.
     ======================================================================= */
  /* NOTE THE SIGNATURE: no `t`. It used to take one, to match
     drawRoundhouse/drawPierLamp, and the call site passed six arguments
     for a seven-argument function -- so `t` swallowed point a, `a`
     swallowed point b, and `b` arrived as {}. b.x was undefined, every
     coordinate came out NaN, and Phaser silently drew nothing: no error,
     no warning, no rails. Nothing here animates, so the honest fix is to
     not take a time parameter it never used. */
  /* A RAIL IS A PATH, NOT TWO ENDPOINTS (2026-08-14, Sir: "can we get the
     rail to continue around the end of the pier?").

     The straight runs and the curve around the round deck are the same
     railing -- same posts, same top and bottom rails, same diamond infill
     -- differing only in the points they follow. Writing a second arc
     version would have been a second copy of the railing, which is the one
     thing labs/README.md is loudest about. So this takes a polyline and
     walks it by ARC LENGTH, which is what keeps post spacing and lattice
     cell size even whether the path is a line or a circle. A straight run
     is just a two-point path. */
  function drawRailPath(scn, g, W, pts, o) {
    const d = Object.assign({}, D, o || {});
    /* NaN GUARD. An earlier arity bug fed this non-finite coordinates, and
       Phaser's response to those is to draw nothing at all -- no throw, no
       warning, just an empty pier that looks like a placement problem
       rather than a maths one. Any future miswiring names itself instead. */
    if (!Array.isArray(pts) || pts.length < 2) return;
    for (const p of pts) {
      if (!p || !isFinite(p.x) || !isFinite(p.y)) {
        scn.__rhDrawErr = 'rail path got a non-finite point: ' + JSON.stringify(p);
        return;
      }
    }
    const H = d.railH, thick = 9;

    /* cumulative arc length, so everything below is placed in world units
       along the path rather than in per-segment fractions */
    const cum = [0];
    for (let i = 0; i < pts.length - 1; i++)
      cum.push(cum[i] + Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y));
    const total = cum[cum.length - 1] || 1;
    const at = (s2) => {
      let i = 0;
      while (i < cum.length - 2 && cum[i + 1] < s2) i++;
      const span = (cum[i + 1] - cum[i]) || 1;
      const t2 = (s2 - cum[i]) / span;
      const a2 = pts[i], b2 = pts[i + 1];
      const ux = (b2.x - a2.x) / span, uy = (b2.y - a2.y) / span;
      return { x: a2.x + (b2.x - a2.x) * t2, y: a2.y + (b2.y - a2.y) * t2, ux, uy };
    };

    /* rails: one quad per segment, so a curve gets a faceted rail that
       follows it instead of a chord across it */
    const slab = (z, h, col) => {
      for (let i = 0; i < pts.length - 1; i++) {
        const a2 = pts[i], b2 = pts[i + 1];
        scn.quadOn(g, [W(a2.x, a2.y, z), W(b2.x, b2.y, z),
                       W(b2.x, b2.y, z + h), W(a2.x, a2.y, z + h)], col);
      }
    };

    /* diamond lattice between the rails, on a fixed world-space pitch */
    g.lineStyle(Math.max(1, 1.1 * scn.K), RH.railDk, 0.75);
    const cells = Math.max(2, Math.round(total / (d.railPost / 3)));
    for (let k = 0; k < cells; k++) {
      const p0 = at(total * k / cells), p1 = at(total * (k + 1) / cells);
      const q0 = W(p0.x, p0.y, H * 0.18), q1 = W(p1.x, p1.y, H * 0.82);
      const r0 = W(p0.x, p0.y, H * 0.82), r1 = W(p1.x, p1.y, H * 0.18);
      g.lineBetween(q0.x, q0.y, q1.x, q1.y);
      g.lineBetween(r0.x, r0.y, r1.x, r1.y);
    }
    slab(H * 0.14, thick, RH.railDk);
    slab(H - thick, thick * 1.5, RH.rail);

    /* posts, oriented to the LOCAL tangent -- on the arc that rotates each
       post to face along the curve, which a single global tangent could
       not do */
    const n = Math.max(1, Math.round(total / d.railPost));
    for (let k = 0; k <= n; k++) {
      const p = at(total * k / n), pw = 11;
      scn.quadOn(g, [W(p.x - p.ux * pw, p.y - p.uy * pw, 0), W(p.x + p.ux * pw, p.y + p.uy * pw, 0),
                     W(p.x + p.ux * pw, p.y + p.uy * pw, H), W(p.x - p.ux * pw, p.y - p.uy * pw, H)], RH.rail);
      const cap = W(p.x, p.y, H + 10);
      g.fillStyle(RH.railDk, 1);
      g.fillCircle(cap.x, cap.y, Math.max(1, 3 * scn.K));
    }
  }

  /* straight run: the same path function with a two-point path */
  function drawPierRail(scn, g, W, a, b, o) {
    drawRailPath(scn, g, W, [a, b], o);
  }

  /* the curve around the round deck. It cannot be a full circle -- the pier
     joins the disc on its east side, and railing across that opening would
     wall the deck off from its own approach. The half-angle of the opening
     is asin(half / R) exactly, so the arc runs from +that round to -that
     the long way, and the straight runs meet it at the same two points. */
  function deckRailArc(scn, g, W, A, o) {
    const R = (A.sh ? A.sh.ring.rOuter : 0) * 0.97;
    if (!(R > 0)) return null;
    const half = A.pierHalf;
    const gap = Math.asin(Math.min(0.999, half / R));
    const pts = [];
    const N = 56;
    for (let k = 0; k <= N; k++) {
      const a2 = gap + (Math.PI * 2 - 2 * gap) * (k / N);
      pts.push({ x: A.cx + Math.cos(a2) * R, y: A.cy + Math.sin(a2) * R });
    }
    drawRailPath(scn, g, W, pts, o);
    return { R, gap };
  }

  /* =======================================================================
     PIER LAMP
     Stepped base, fluted tapered column, collar, single globe. The photo's
     posts are cream, not white, and the globe reads warm even by day.
     ======================================================================= */
  function drawPierLamp(scn, g, W, t, o) {
    const d = Object.assign({}, D, o || {});
    const H = d.lampH, K = scn.K;
    /* WHICH TWO FACES ARE "NEAR" IS NOT A FREE CHOICE (2026-08-14, Sir:
       "lamps are still not drawing all the faces").

       A standalone box in this engine draws only its two visible walls,
       and with a FIXED iso camera those are always +x and +y -- that is
       what drawLampHull's own box() does in game/index.html, and what the
       pylons above do. This drew the -y wall and the +x wall. -y is a BACK
       face, so the post was missing its +y side entirely and wasting a
       quad on a face that can never be seen: a post that reads as a flat
       sheet with a seam down it, exactly as reported.

       Top caps were missing too. The base steps DOWN in width twice, so
       each step's top is a genuinely visible ledge, not a stacking
       artifact -- without it there is a notch where the ledge should be.
       noTop exists for the one case that doesn't apply to: a segment with
       another of the same footprint flush on top of it. */
    const col = (w, z0, z1, c, cd, noTop) => {
      if (!noTop)
        scn.quadOn(g, [W(-w, -w, z1), W(w, -w, z1), W(w, w, z1), W(-w, w, z1)], c);
      scn.quadOn(g, [W(w, -w, z1), W(w, w, z1), W(w, w, z0), W(w, -w, z0)], cd);
      scn.quadOn(g, [W(-w, w, z1), W(w, w, z1), W(w, w, z0), W(-w, w, z0)], c);
    };
    const sh = W(0, 0, 0);
    g.fillStyle(RH.shadow, 0.15);
    g.fillEllipse(sh.x, sh.y + 2 * K, 46 * K, 20 * K);
    /* stepped base */
    col(30, 0, H * 0.055, RH.lamp, RH.lampDk);
    col(22, H * 0.055, H * 0.12, RH.lamp, RH.lampDk);
    /* Tapered shaft. The per-segment colour used to ALTERNATE, meant to
       suggest fluting; at any real zoom it just read as horizontal banding
       and made the post look broken into pieces. Shading is per-FACE now
       -- +y lit, +x shaded, the same treatment every other prop here uses
       -- so the taper reads as one continuous column. */
    const segs = 5;
    for (let i = 0; i < segs; i++) {
      const z0 = H * 0.12 + (H * 0.72) * (i / segs), z1 = H * 0.12 + (H * 0.72) * ((i + 1) / segs);
      col(15 - 5 * (i / segs), z0, z1, RH.lamp, RH.lampDk);
    }
    /* collar, then a short neck the globe actually sits ON. The collar
       used to stop at H*0.90 with the globe drawn at H*1.00, leaving a
       tenth of the lamp's height as open air -- the globe floated above
       the post (Sir, on-device: "the lamps arent rendering all the way").
       The neck now runs up to globeZ and the globe is centred there. */
    col(19, H * 0.84, H * 0.90, RH.lamp, RH.lampDk);
    const globeZ = H * 0.945;
    col(9, H * 0.90, globeZ, RH.lamp, RH.lampDk);
    /* the globe, plus a soft halo so it reads as a light source */
    const gp = W(0, 0, globeZ);
    if (d.lampGlow) {
      g.fillStyle(RH.globeGlow, 0.16);
      g.fillCircle(gp.x, gp.y, 44 * K);
      g.fillStyle(RH.globeGlow, 0.22);
      g.fillCircle(gp.x, gp.y, 28 * K);
    }
    g.fillStyle(RH.globe, 1);
    g.fillCircle(gp.x, gp.y, 17 * K);
    g.fillStyle(0xffffff, 0.85);
    g.fillCircle(gp.x - 5 * K, gp.y - 6 * K, 6 * K);
  }

  /* =======================================================================
     PLACEMENT — on the real shore lattice if the waterfront lab is loaded,
     otherwise on a bare patch next to the robot so this lab is useful on
     its own. Deliberately reads the OTHER lab's shore rather than rebuilding
     one: two copies of the pier is exactly the thing labs/README.md warns
     about.
     ======================================================================= */
  function anchor() {
    const wf = scene._wfAPI;
    if (wf && wf.shore) {
      const sh = wf.shore;
      return { onShore: true, sh,
               cx: sh.ring.cx, cy: sh.ring.cy,
               pierY: sh.pierY, pierX0: sh.pierX0, pierX1: sh.pierX1,
               pierHalf: sh.PIER_W / 2 };
    }
    /* standalone: park it a couple of blocks off the robot */
    const x = scene.botX + BLOCK * 1.2, y = scene.botY;
    return { onShore: false, cx: x, cy: y, pierY: y,
             pierX0: x, pierX1: x + BLOCK * 2.2, pierHalf: 344 };
  }

  const RHS = { showRail: true, showLamps: true, showBuilding: true, showPylons: true, showBench: true, showGulls: true, rot: 0 };

  /* Waterfront's schematic mode blanks the world below its own K threshold,
     which is right when you are reading lattice shape and wrong when you
     are looking at a building. Switched off while this lab is loaded, and
     put back exactly as found on teardown. */
  const wfLab = scene._wfAPI;
  const wfSchematicWas = wfLab ? wfLab.WF.schematic : null;
  if (wfLab) wfLab.WF.schematic = false;

  /* DRAWN FROM A PRIVATE SORT, NOT BENCH.queue (2026-08-14, Sir: "i dont
     see any buiulding or rails or lamps").

     BENCH.queue is the right default -- it lands items in the game's own
     depth sort against houses and props, which is the shape the code takes
     once it ports into drawProp. But the bench flushes that queue from
     inside queueBlockContent, and queueBlockContent only runs if there are
     BLOCKS. The waterfront lab's schematic mode empties grid.blocks, so
     with both labs loaded every item queued here was dropped on the floor
     and nothing drew at all -- silently, with no error.

     So this sorts and draws its own items. That is a genuine downside and
     worth stating plainly: these props are not depth-sorted against the
     city. It is honest HERE because the pier is bare deck -- there is
     nothing out there to sort against but each other. When this ports into
     drawProp as real route props it goes through the real vq and gets the
     real sort, which is the only place it would matter. */
  function flush(sc, t, items) {
    items.sort((a, b) => a.depth - b.depth);
    for (const it of items) {
      try { it.fn(sc.gFront, t); }
      catch (e) { sc.__rhDrawErr = String(e); }
    }
  }

  const prevHook = scene.__benchHook;
  BENCH.hook(function (sc, t) {
    if (prevHook) { try { prevHook(sc, t); } catch (e) { /* the incumbent's problem, not ours */ } }
    const A = anchor();
    const items = [];
    const Q = (depth, fn) => items.push({ depth, fn });
    const frame = (ox, oy) => (dx, dy, dz) => sc.W(ox + dx, oy + dy, dz);

    if (RHS.showBuilding) {
      Q(A.cx + A.cy, (g) =>
        drawRoundhouse(sc, g, frame(A.cx, A.cy), t, { rWall: D.rWall }));
    }
    if (RHS.showPylons) {
      /* one item, drawn before the rails and lamps of the same run -- the
         piles are structurally under everything else out there */
      Q(A.pierX1 + A.pierY - 1e6, (g) => drawPierPylons(sc, g, A, {}));
    }
    if (RHS.showRail) {
      const Wr = (dx, dy, dz) => sc.W(dx, dy, dz);
      const R = (A.sh ? A.sh.ring.rOuter : 0) * 0.97;
      /* WHERE THE STRAIGHT RUN ACTUALLY MEETS THE DISC. It used to stop at
         cx + rOuter, which is the disc's easternmost point -- but the rail
         sits at y = pierY +/- half, not on the centreline, so at that y the
         disc's edge is at cx + sqrt(R^2 - half^2), ~54 units short. The old
         end overshot into the deck. Solved rather than nudged, so it stays
         right if PIER_W or the deck radius ever move. */
      const meetX = R > 0 ? A.cx + Math.sqrt(Math.max(0, R * R - A.pierHalf * A.pierHalf))
                          : A.pierX0;
      for (const s of [-1, 1]) {
        const y = A.pierY + s * A.pierHalf;
        Q(A.pierX1 + y, (g) =>
          drawPierRail(sc, g, Wr, { x: A.pierX1, y }, { x: meetX, y }, {}));
      }
      /* ...and the curve around the deck, picking up exactly where the two
         straight runs stop */
      if (R > 0) Q(A.cx + A.cy + 1, (g) => deckRailArc(sc, g, Wr, A, {}));
    }
    if (RHS.showLamps) {
      const x0 = A.pierX0 + (A.sh ? A.sh.ring.rOuter : 0), x1 = A.pierX1;
      const n = Math.max(1, Math.floor((x1 - x0) / D.lampSpacing));
      for (let k = 0; k <= n; k++) {
        const x = x0 + (x1 - x0) * (k / n);
        for (const s of [-1, 1]) {
          const y = A.pierY + s * (A.pierHalf - 40);
          Q(x + y, (g) => drawPierLamp(sc, g, frame(x, y), t, {}));
        }
      }
    }
    if (RHS.showBench) {
      /* set in from the rail by half the bench depth plus a walking gap,
         backs to the centreline so the seat looks at the water */
      const x0 = A.pierX0 + (A.sh ? A.sh.ring.rOuter : 0), x1 = A.pierX1;
      const n = Math.max(1, Math.floor((x1 - x0) / D.benchGap));
      for (let k = 0; k <= n; k++) {
        const x = x0 + (x1 - x0) * (k / n);
        for (const s of [-1, 1]) {
          /* inset from the rail by the bench's own depth plus a walking gap,
             and facing THAT rail -- s is both the side and the seat's
             direction, which is what stops both rows facing the same way */
          const y = A.pierY + s * (A.pierHalf - D.benchDepth * D.benchScale * 0.9);
          Q(x + y, (g) => drawPierBench(sc, g, (dx, dy, dz) => sc.W(dx, dy, dz),
                                        x, y, 0, { facing: s }));
        }
      }
    }
    if (RHS.showGulls) {
      /* perched on the rail cap, which is where they actually sit */
      const x0 = A.pierX0 + (A.sh ? A.sh.ring.rOuter : 0), x1 = A.pierX1;
      const step = D.railPost * D.gullEvery;
      for (let x = x0 + step * 0.5; x < x1; x += step) {
        for (const s of [-1, 1]) {
          const y = A.pierY + s * A.pierHalf;
          /* seeded thinning so the rail is not a picket line of birds */
          if (mulberry32(((Math.round(x) * 7919) ^ (Math.round(y) * 104729)) >>> 0)() < 0.45) continue;
          Q(x + y + 2, (g) => drawSeagull(sc, g, (dx, dy, dz) => sc.W(dx, dy, dz),
                                          x, y, D.railH + 10, t, {}));
        }
      }
    }
    flush(sc, t, items);
  });

  /* ---------------- panel ---------------- */
  const FIELDS = [
    { k: 'rWall', label: 'wall R', min: 200, max: 900, step: 10 },
    { k: 'wallH', label: 'wall H', min: 120, max: 600, step: 10 },
    { k: 'eave', label: 'eave', min: 0, max: 220, step: 5 },
    { k: 'roofH', label: 'roof H', min: 60, max: 400, step: 5 },
    { k: 'drumR', label: 'drum R', min: 60, max: 400, step: 5 },
    { k: 'drumH', label: 'drum H', min: 40, max: 300, step: 5 },
    { k: 'railH', label: 'rail H', min: 50, max: 260, step: 4 },
    { k: 'lampH', label: 'lamp H', min: 200, max: 800, step: 10 },
    { k: 'lampSpacing', label: 'lamp gap', min: 400, max: 3000, step: 50 },
    { k: 'pylonDepth', label: 'pile deep', min: 80, max: 1800, step: 20 },
    { k: 'bentGap', label: 'bent gap', min: 300, max: 2500, step: 50 },
    { k: 'pilesPerBent', label: 'per bent', min: 2, max: 7, step: 1 },
    { k: 'benchScale', label: 'bench sz', min: 0.25, max: 1.6, step: 0.02 },
    { k: 'benchLen', label: 'bench L', min: 150, max: 600, step: 10 },
    { k: 'benchGap', label: 'bench gap', min: 800, max: 6000, step: 100 },
    { k: 'gullSize', label: 'gull', min: 20, max: 110, step: 2 },
  ];

  const panel = document.createElement('div');
  panel.id = 'rhPanel';
  panel.style.cssText = [
    'position:fixed', 'left:8px', 'right:8px', 'bottom:8px', 'z-index:99999',
    'background:#12141a', 'border:1px solid #2b2f38', 'border-radius:12px',
    'padding:10px 12px calc(10px + env(safe-area-inset-bottom))',
    'font:12px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace', 'color:#e8eaef',
    '-webkit-user-select:none', 'user-select:none',
  ].join(';');
  panel.innerHTML =
    `<div id="rhBar" style="display:flex;align-items:baseline;gap:8px">
       <b style="color:#6faab0;letter-spacing:2px">ROUNDHOUSE</b>
       <span id="rhHint" style="color:#5c626d">tap to hide</span>
     </div>
     <div id="rhBody" style="margin-top:8px">` +
    FIELDS.map(f =>
      `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
         <span style="width:58px;color:#8f95a1">${f.label}</span>
         <input type="range" id="rh-${f.k}" min="${f.min}" max="${f.max}"
                step="${f.step}" style="flex:1;accent-color:#6faab0">
         <span id="rhv-${f.k}" style="width:44px;text-align:right;
               font-variant-numeric:tabular-nums">0</span>
       </div>`).join('') +
    `<div style="display:flex;gap:6px;margin-top:8px">
       <button id="rhGo">frame it</button>
       <button id="rhB">building</button>
       <button id="rhR">rails</button>
       <button id="rhL">lamps</button>
       <button id="rhP">pylons</button>
       <button id="rhBe">bench</button>
       <button id="rhG">gulls</button>
       <button id="rhReset">reset</button>
     </div>
     <div id="rhStat" style="margin-top:8px;color:#8f95a1;white-space:pre-line"></div>
     <div style="display:flex;gap:8px;align-items:center;margin-top:8px">
       <code id="rhPort" style="flex:1;background:#0e0d0c;border:1px solid #2b2f38;
             border-radius:7px;padding:7px 8px;color:#6faab0;overflow-x:auto;
             white-space:nowrap;-webkit-user-select:text;user-select:text"></code>
       <button id="rhCopy" style="flex:0 0 62px">copy</button>
     </div></div>`;
  for (const b of panel.querySelectorAll('button')) {
    b.style.cssText = 'background:#262a33;color:#e8eaef;border:1px solid #363b46;' +
                      'border-radius:9px;padding:9px 4px;font:inherit;font-weight:600;flex:1';
  }
  /* opt in to the bench's "hide lab dials" toggle. Marked with an attribute
     rather than relying on the element id, because the game ships its own
     *Panel ids and an id-suffix match would hide those too. */
  panel.dataset.labPanel = '1';
  document.body.appendChild(panel);

  const portLine = () => `RH ${FIELDS.map(f => f.k + ':' + D[f.k]).join(' ')}`;

  /* "i dont see any buiulding or rails or lamps" was, the second time, just
     zoom: at K=0.03 this whole building is about 25 screen pixels. Nothing
     is wrong and nothing says so, which is the actual problem -- so the
     readout now measures it and names the fix. */
  function visibilityNote() {
    const A = anchor();
    /* MUST READ THE PENDING CAMERA, NOT scene.K/scene.W. The bench applies
       BENCH.cam to the scene in its PRE hook, i.e. at the start of the next
       draw -- so immediately after frameIt() the scene still holds the old
       camera, and a note computed from it reported OFF SCREEN about a
       building sitting dead centre. Measured: said OFF SCREEN at K 0.399
       with the thing filling the frame. */
    const cam = BENCH.cam;
    const K = (cam && cam.on) ? cam.k : (scene.K || 1);
    const camX = (cam && cam.on) ? cam.x : scene.camX;
    const camY = (cam && cam.on) ? cam.y : scene.camY;
    const camZ = (cam && cam.on) ? (cam.z || 0) : scene.camZ;
    const px = Math.round(2 * (D.rWall + D.eave) * Math.SQRT2 * K);
    const gs = scene.scale.gameSize;
    const xr = A.cx - camX, yr = A.cy - camY;
    const sx = (xr - yr) * K + gs.width / 2;
    const sy = ((xr + yr) * 0.5 + camZ) * K + gs.height / 2;
    const onScreen = sx > -px && sx < gs.width + px && sy > -px && sy < gs.height + px;
    if (!onScreen) return `OFF SCREEN at K ${K.toFixed(3)} -- tap "frame it"`;
    if (px < 60) return `only ${px}px wide at K ${K.toFixed(3)} -- tap "frame it"`;
    return `${px}px wide at K ${K.toFixed(3)}`;
  }
  function refresh() {
    const A = anchor();
    document.getElementById('rhStat').textContent =
      `${A.onShore ? 'on the shore lattice' : 'STANDALONE (load ?lab=waterfront first for the real pier)'}\n` +
      `octagon R ${D.rWall}  vs classifyShore building R ` +
      `${A.sh ? Math.round(A.sh.ring.rInner) : 'n/a'}` +
      `${A.sh && Math.abs(D.rWall - A.sh.ring.rInner) > 40 ? '   <-- MISMATCH' : '   match'}\n` +
      `overall height ${D.wallH + D.roofH + D.drumH + D.drumRoofH + D.finialH}\n` +
      `SEE IT AT ALL FOUR HEADINGS before this ships (f0..f3)\n` +
      visibilityNote() +
      (scene.__rhDrawErr ? '\nDRAW ERROR: ' + scene.__rhDrawErr : '');
    document.getElementById('rhPort').textContent = portLine();
  }
  function sync() {
    for (const f of FIELDS) {
      document.getElementById('rh-' + f.k).value = D[f.k];
      document.getElementById('rhv-' + f.k).textContent = D[f.k];
    }
    for (const [id, on] of [['rhB', RHS.showBuilding], ['rhR', RHS.showRail],
                            ['rhL', RHS.showLamps], ['rhP', RHS.showPylons],
                            ['rhBe', RHS.showBench], ['rhG', RHS.showGulls]])
      document.getElementById(id).style.background = on ? '#6faab0' : '#262a33';
    refresh();
  }
  for (const f of FIELDS) {
    document.getElementById('rh-' + f.k).addEventListener('input', e => {
      D[f.k] = +e.target.value;
      document.getElementById('rhv-' + f.k).textContent = D[f.k];
      refresh();
    });
  }
  /* Re-framing on every collapse/expand is the point: the free strip
     changes size when the panel does, so the fit has to change with it. */
  function setCollapsed(on) {
    document.getElementById('rhBody').style.display = on ? 'none' : '';
    document.getElementById('rhHint').textContent = on ? 'tap to show' : 'tap to hide';
    frameIt();
  }
  document.getElementById('rhBar').onclick = () =>
    setCollapsed(document.getElementById('rhBody').style.display !== 'none');
  /* FRAME IT, PROPERLY (2026-08-14, Sir: "same issue as before i cant see
     it"). First pass hard-coded K=1.6, which is roughly 4x too close for a
     building 2*(rWall+eave) across -- the thing filled the screen and what
     little fit landed behind the panel.
     This solves K from the geometry instead. W() projects a ground circle
     of radius R to a screen width of 2*R*sqrt(2)*K and a depth of
     R*sqrt(2)*K, and height adds H*K on top of that, so the fit is a
     straight min of the two axes. The vertical budget is the canvas MINUS
     whatever the panel is currently covering, and the camera is then
     lifted by half that panel so the building centres in the gap rather
     than behind the dials -- camZ enters W() as (-z + camZ), so a negative
     camZ moves the world UP the screen. */
  function frameIt() {
    const A = anchor();
    const d = D;
    const R = d.rWall + d.eave;
    const Hh = d.wallH + d.roofH + d.drumH + d.drumRoofH + d.finialH;
    const gs = scene.scale.gameSize;
    const panel = document.getElementById('rhPanel');
    const panelH = panel ? panel.getBoundingClientRect().height : 0;
    const visW = gs.width, visH = Math.max(120, gs.height - panelH);
    const k = Math.min(visW * 0.8 / (2 * R * Math.SQRT2),
                       visH * 0.8 / (R * Math.SQRT2 + Hh));
    const c = BENCH.lookAt(A.cx, A.cy, k);
    /* pull the whole thing up out from behind the panel, and lift again by
       half the building's own height so its middle -- not its base -- is
       what ends up centred in the free strip */
    c.z = -(panelH / 2) / k - Hh * 0.42;
    const wf = scene._wfAPI;
    if (wf) wf.WF.k = k;   // keep waterfront's schematic from re-engaging
    refresh();
  }
  document.getElementById('rhGo').onclick = frameIt;
  document.getElementById('rhB').onclick = () => { RHS.showBuilding = !RHS.showBuilding; sync(); };
  document.getElementById('rhR').onclick = () => { RHS.showRail = !RHS.showRail; sync(); };
  document.getElementById('rhL').onclick = () => { RHS.showLamps = !RHS.showLamps; sync(); };
  document.getElementById('rhP').onclick = () => { RHS.showPylons = !RHS.showPylons; sync(); };
  document.getElementById('rhBe').onclick = () => { RHS.showBench = !RHS.showBench; sync(); };
  document.getElementById('rhG').onclick = () => { RHS.showGulls = !RHS.showGulls; sync(); };
  document.getElementById('rhReset').onclick = () => {
    Object.assign(D, { rWall: 520, wallH: 300, eave: 90, roofH: 165, drumR: 175,
                       drumH: 130, railH: 118, lampH: 430, lampSpacing: 1100,
                       pylonDepth: 460, bentGap: 900, pilesPerBent: 4,
                       benchScale: 0.62, benchGap: 2200 });
    sync();
  };
  document.getElementById('rhCopy').onclick = async () => {
    const btn = document.getElementById('rhCopy');
    try { await navigator.clipboard.writeText(portLine()); btn.textContent = 'copied'; }
    catch (e) {
      const r = document.createRange();
      r.selectNodeContents(document.getElementById('rhPort'));
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      btn.textContent = 'selected';
    }
    setTimeout(() => { btn.textContent = 'copy'; }, 1400);
  };

  scene.__rhOff = () => {
    /* hand the hook back to whoever had it, rather than clearing it and
       taking the incumbent lab down with us */
    if (prevHook) BENCH.hook(prevHook); else BENCH.clear();
    if (wfLab && wfSchematicWas !== null) wfLab.WF.schematic = wfSchematicWas;
    document.getElementById('rhPanel')?.remove();
  };
  scene._rhAPI = { RH, D, RHS, PYL, boxNear, drawRoundhouse, drawPierRail, drawRailPath,
                   deckRailArc, drawPierLamp, drawPierPylons, drawPierBench,
                   drawSeagull, discEdgeU, anchor };

  sync();
  /* STARTS COLLAPSED. Nine sliders is most of a phone screen, and the
     first thing anyone wants on load is to SEE the building, not tune it.
     Tap the bar to get the dials back. */
  setCollapsed(true);
  console.log('roundhouse ready -- load ?lab=waterfront first to sit it on the real pier');
})();
