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
       FIRST PASS PUT IT ABOVE THE WALL and it was never visible: at
       v > zTop it sits behind the roof's own oversail and the tile faces
       paint straight over it. In the photo the sign is mounted ON the
       wall, in the frieze between the arch heads and the teal cornice,
       overlapping the cornice slightly. That is where it goes. */
    {
      let best = null;
      for (let i = 0; i < OCT; i++) {
        const p = wall[i], q = wall[(i + 1) % OCT];
        const m = W((p.x + q.x) / 2, (p.y + q.y) / 2, zTop);
        if (!best || m.y > best.m.y) best = { i, m, p, q };
      }
      const { p, q } = best;
      const P = (u, v) => W(p.x + (q.x - p.x) * u, p.y + (q.y - p.y) * u, v);
      const archTop = d.baseH + (zTop - d.baseH) * d.archH;
      const s0 = 0.5 - d.signW / 2, s1 = 0.5 + d.signW / 2;
      const v0 = archTop + (zTop - d.corniceH - archTop) * 0.12;
      const v1 = zTop - d.corniceH * 0.25;
      Q([P(s0, v0), P(s1, v0), P(s1, v1), P(s0, v1)], RH.navy);
      /* the lettering reads as one light band at game zoom -- drawn as a
         band, not as glyphs, which would be illegible and cost 8 quads */
      const lp = 0.06, lv = (v1 - v0);
      Q([P(s0 + lp, v0 + lv * 0.26), P(s1 - lp, v0 + lv * 0.26),
         P(s1 - lp, v0 + lv * 0.74), P(s0 + lp, v0 + lv * 0.74)], 0xf2f0e8, 0.94);
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
  function drawPierRail(scn, g, W, t, a, b, o) {
    const d = Object.assign({}, D, o || {});
    const dx = b.x - a.x, dy = b.y - a.y;
    const L = Math.hypot(dx, dy) || 1;
    const ux = dx / L, uy = dy / L;
    const n = Math.max(1, Math.round(L / d.railPost));
    const H = d.railH, thick = 9;
    const at = u => ({ x: a.x + dx * u, y: a.y + dy * u });

    /* rails: thin horizontal slabs, drawn as quads so they take the same
       depth treatment as everything else rather than being hairlines */
    const slab = (z, h, col) => {
      const p0 = at(0), p1 = at(1);
      scn.quadOn(g, [W(p0.x, p0.y, z), W(p1.x, p1.y, z),
                     W(p1.x, p1.y, z + h), W(p0.x, p0.y, z + h)], col);
    };
    /* diamond lattice between the rails */
    g.lineStyle(Math.max(1, 1.1 * scn.K), RH.railDk, 0.75);
    const cells = Math.max(2, Math.round(L / (d.railPost / 3)));
    for (let k = 0; k < cells; k++) {
      const p0 = at(k / cells), p1 = at((k + 1) / cells);
      const q0 = W(p0.x, p0.y, H * 0.18), q1 = W(p1.x, p1.y, H * 0.82);
      const r0 = W(p0.x, p0.y, H * 0.82), r1 = W(p1.x, p1.y, H * 0.18);
      g.lineBetween(q0.x, q0.y, q1.x, q1.y);
      g.lineBetween(r0.x, r0.y, r1.x, r1.y);
    }
    slab(H * 0.14, thick, RH.railDk);
    slab(H - thick, thick * 1.5, RH.rail);
    /* posts */
    for (let k = 0; k <= n; k++) {
      const p = at(k / n);
      const pw = 11;
      scn.quadOn(g, [W(p.x - ux * pw, p.y - uy * pw, 0), W(p.x + ux * pw, p.y + uy * pw, 0),
                     W(p.x + ux * pw, p.y + uy * pw, H), W(p.x - ux * pw, p.y - uy * pw, H)], RH.rail);
      const cap = W(p.x, p.y, H + 10);
      g.fillStyle(RH.railDk, 1);
      g.fillCircle(cap.x, cap.y, Math.max(1, 3 * scn.K));
    }
  }

  /* =======================================================================
     PIER LAMP
     Stepped base, fluted tapered column, collar, single globe. The photo's
     posts are cream, not white, and the globe reads warm even by day.
     ======================================================================= */
  function drawPierLamp(scn, g, W, t, o) {
    const d = Object.assign({}, D, o || {});
    const H = d.lampH, K = scn.K;
    const col = (w, z0, z1, c, cd) => {
      scn.quadOn(g, [W(-w, -w, z0), W(w, -w, z0), W(w, -w, z1), W(-w, -w, z1)], c);
      scn.quadOn(g, [W(w, -w, z0), W(w, w, z0), W(w, w, z1), W(w, -w, z1)], cd);
    };
    const sh = W(0, 0, 0);
    g.fillStyle(RH.shadow, 0.15);
    g.fillEllipse(sh.x, sh.y + 2 * K, 46 * K, 20 * K);
    /* stepped base */
    col(30, 0, H * 0.055, RH.lamp, RH.lampDk);
    col(22, H * 0.055, H * 0.12, RH.lamp, RH.lampDk);
    /* tapered shaft in segments, each narrower than the last */
    const segs = 5;
    for (let i = 0; i < segs; i++) {
      const z0 = H * 0.12 + (H * 0.72) * (i / segs), z1 = H * 0.12 + (H * 0.72) * ((i + 1) / segs);
      const w = 15 - 5 * (i / segs);
      col(w, z0, z1, i % 2 ? RH.lamp : RH.lampDk, RH.lampDk);
    }
    /* collar under the globe */
    col(19, H * 0.84, H * 0.90, RH.lamp, RH.lampDk);
    /* the globe, plus a soft halo so it reads as a light source */
    const gp = W(0, 0, H);
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

  const RHS = { showRail: true, showLamps: true, showBuilding: true, rot: 0 };

  /* CHAIN, DON'T REPLACE (2026-08-14). BENCH.hook is a single slot, so
     taking it outright silently switches off whatever lab was already
     drawing -- loading this on top of waterfront made its whole overlay
     disappear. Capturing the incumbent and calling it first lets the two
     labs compose, which is the point of sitting this building on the
     other one's pier in the first place. */
  const prevHook = scene.__benchHook;
  BENCH.hook(function (sc, t) {
    if (prevHook) { try { prevHook(sc, t); } catch (e) { /* the incumbent's problem, not ours */ } }
    const A = anchor();
    /* Every piece goes through BENCH.queue so it lands in the game's own
       depth sort against houses and props, not a private one -- the
       crime-scene port is the cautionary tale here. */
    const frame = (ox, oy) => (dx, dy, dz) => sc.W(ox + dx, oy + dy, dz);

    if (RHS.showBuilding) {
      BENCH.queue(A.cx + A.cy, (g) =>
        drawRoundhouse(sc, g, frame(A.cx, A.cy), t, { rWall: D.rWall }));
    }
    if (RHS.showRail) {
      /* both pier edges, from the deck out to the round end */
      for (const s of [-1, 1]) {
        const y = A.pierY + s * A.pierHalf;
        BENCH.queue(A.pierX1 + y, (g) =>
          drawPierRail(sc, g, (dx, dy, dz) => sc.W(dx, dy, dz),
            { x: A.pierX1, y }, { x: A.pierX0 + (A.sh ? A.sh.ring.rOuter : 0), y }, {}));
      }
    }
    if (RHS.showLamps) {
      const x0 = A.pierX0 + (A.sh ? A.sh.ring.rOuter : 0), x1 = A.pierX1;
      const n = Math.max(1, Math.floor((x1 - x0) / D.lampSpacing));
      for (let k = 0; k <= n; k++) {
        const x = x0 + (x1 - x0) * (k / n);
        for (const s of [-1, 1]) {
          const y = A.pierY + s * (A.pierHalf - 40);
          BENCH.queue(x + y, (g) => drawPierLamp(sc, g, frame(x, y), t, {}));
        }
      }
    }
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
  document.body.appendChild(panel);

  const portLine = () => `RH ${FIELDS.map(f => f.k + ':' + D[f.k]).join(' ')}`;
  function refresh() {
    const A = anchor();
    document.getElementById('rhStat').textContent =
      `${A.onShore ? 'on the shore lattice' : 'STANDALONE (load ?lab=waterfront first for the real pier)'}\n` +
      `octagon R ${D.rWall}  vs classifyShore building R ` +
      `${A.sh ? Math.round(A.sh.ring.rInner) : 'n/a'}` +
      `${A.sh && Math.abs(D.rWall - A.sh.ring.rInner) > 40 ? '   <-- MISMATCH' : '   match'}\n` +
      `overall height ${D.wallH + D.roofH + D.drumH + D.drumRoofH + D.finialH}\n` +
      `SEE IT AT ALL FOUR HEADINGS before this ships (f0..f3)`;
    document.getElementById('rhPort').textContent = portLine();
  }
  function sync() {
    for (const f of FIELDS) {
      document.getElementById('rh-' + f.k).value = D[f.k];
      document.getElementById('rhv-' + f.k).textContent = D[f.k];
    }
    for (const [id, on] of [['rhB', RHS.showBuilding], ['rhR', RHS.showRail], ['rhL', RHS.showLamps]])
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
  document.getElementById('rhBar').onclick = () => {
    const b = document.getElementById('rhBody');
    const on = b.style.display === 'none';
    b.style.display = on ? '' : 'none';
    document.getElementById('rhHint').textContent = on ? 'tap to hide' : 'tap to show';
  };
  document.getElementById('rhGo').onclick = () => {
    const A = anchor();
    BENCH.lookAt(A.cx, A.cy, 1.6);
    /* if waterfront is loaded it owns a schematic mode that blanks the
       world below its own K threshold -- pointless when the whole reason
       to be here is looking at a building, so lift its zoom with ours */
    const wf = scene._wfAPI;
    if (wf) { wf.WF.k = 1.6; }
  };
  document.getElementById('rhB').onclick = () => { RHS.showBuilding = !RHS.showBuilding; sync(); };
  document.getElementById('rhR').onclick = () => { RHS.showRail = !RHS.showRail; sync(); };
  document.getElementById('rhL').onclick = () => { RHS.showLamps = !RHS.showLamps; sync(); };
  document.getElementById('rhReset').onclick = () => {
    Object.assign(D, { rWall: 520, wallH: 300, eave: 90, roofH: 165, drumR: 175,
                       drumH: 130, railH: 118, lampH: 430, lampSpacing: 1100 });
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
    document.getElementById('rhPanel')?.remove();
  };
  scene._rhAPI = { RH, D, RHS, drawRoundhouse, drawPierRail, drawPierLamp, anchor };

  sync();
  document.getElementById('rhGo').click();
  console.log('roundhouse ready -- load ?lab=waterfront first to sit it on the real pier');
})();
