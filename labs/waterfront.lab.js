/* ===========================================================================
   WATERFRONT — shore lattice model (bench lab)
   ===========================================================================
   PAGE 1 OF 2. This file models the GEOMETRY only. The course that runs on
   it (down the boardwalk, out the pier, around the aquarium, back) is
   labs/pier-course.lab.js and does not exist yet on purpose -- widths get
   judged before a course is drawn on top of them.

   WHAT THE AUDIT FOUND (2026-08-14)
   The entire waterfront is decorative and lives OUTSIDE the lattice. The
   36x27 grid occupies x [0,109480] y [0,81328]; every coast quad is drawn
   from X0 = -EXT*BLOCK = -1720 westward. There is no node, no edge, no
   block and no surface tag anywhere in it. grid.classify() is
   classifyAt(grid.edges, x, y), a pure scan over grid.edges, so every point
   on the boardwalk, the sand, the marina and the pier returns "block" --
   the same value a lawn returns. The pathing grid genuinely cannot address
   any of it.

   WHAT THIS LAB ADDS
   A SHORE lattice: real polyline data (boardwalk runs, pier spur, aquarium
   ring) with a classifyShore(x,y) that answers the way classifyAt does.
   Built as a pure function of WG_COAST and the live grid, so it can never
   drift from the ground it describes -- same reasoning worldgenLandmarks
   already uses for reading WG_COAST rather than re-deriving the fractions.

   WHY NOTHING IS PUSHED INTO grid.edges
   grid.edges is consumed by buildSidewalkGeometry, buildWorldCurbRamps,
   buildWorldSignals, buildExteriorLots, classifyAt, buildWalk, buildTraffic
   and route generation. Pushing one edge into it reorders rng consumption
   and drifts BOTH frozen courses (SL_SEED_DATE, HJ_SEED_DATE). So the shore
   is a PARALLEL lattice, built after the main one is sealed, and this lab
   never writes to grid.edges at all. Run the bench census before and after:
   it must not move.

   THE WIDTHS, WHICH ARE THE POINT
   Tipsey's lateral pitch is laneOffset(lane) = ROBOT_SIDE * (ROAD_HALF +
   (lane+0.5)*T2) -- SIDEWALK_ROWS lanes at T2 apart, so one ordinary
   sidewalk he drives on is SIDEWALK_W = 368 wide. Measured off WG_COAST at
   the shipped values:

       west boardwalk   BOARD*BLOCK  = 1095   11.9 lanes
       pier deck        PIER_W*BLOCK =  688    7.5 lanes
       aquarium annulus              =  595    6.5 lanes

   Both are already WIDER than a normal sidewalk. No widening is required
   and no art has to move for the boardwalk to become a drivable surface.
   The sliders exist so that stays true if the art is ever retuned, not
   because anything currently needs changing.

   THE TWO NUMBERS THAT ARE NOT IN WG_COAST
   The aquarium's deck ring (0.36) and roof ring (0.17) are literals inside
   drawWorld's terrain pass, not WG_COAST entries. This lab keeps them in
   WF.aqDeck / WF.aqRoof and draws its own overlay rings at those values, so
   dragging them changes what you SEE here but not the underlying art quad.
   At port time they move into WG_COAST alongside PIER_W so there is one
   table again -- flagged, not silently worked around.

   TO PORT: tap `copy` for the one-line summary and hand it back.
   =========================================================================== */

(() => {
  const scene = game.scene.scenes.find(s => s.route);
  if (!scene) { console.log('no scene with a route yet -- press start run'); return; }

  document.getElementById('wfPanel')?.remove();
  scene.__wfOff && scene.__wfOff();

  /* ---------------- lab state ----------------
     aqDeck/aqRoof mirror drawWorld's two literals; junction turn radius and
     the lane pitch are the lab's own. Everything else is read live out of
     WG_COAST every rebuild, never copied. */
  const WF = {
    aqDeck: 0.36,          // fraction of BLOCK -- drawWorld literal
    aqRoof: 0.17,          // fraction of BLOCK -- drawWorld literal
    turnR: ROAD_HALF + SIDEWALK_W,   // = CORNER_R, the game's own corner radius
    showLanes: true,
    showFit: true,
    collapsed: false,
    /* SCHEMATIC (2026-08-14, Sir: "I want to zoom out 3x more").
       The bench zoom slider floors at K=0.15 and that floor is not
       arbitrary: drawWorld's cullSpan is (width/K)*0.9 + ... , so span
       goes as 1/K and the culled AREA -- which is what ground paint
       costs -- goes as its square. Pulling from 0.15 to 0.05 is 3x the
       span and ~9x the ground paint, which is exactly the zoom-out lag
       the FLAT_CULL_PAD note in index.html is about.
       So the extra range does not come from just widening the slider.
       Below schematicK the lab empties the arrays drawWorld iterates for
       the duration of ONE frame -- stashed in the pre hook, restored as
       the first statement of the post hook -- and draws the lattice plus
       a city outline instead. Nothing to cull means the cost stops
       depending on K at all, and the shore's full 85,000-unit run
       becomes something you can actually frame. */
    schematic: true,
    schematicK: 0.12,
    k: 1.0,
  };

  /* ---------------- the shore lattice ----------------
     A run is a straight centreline with a half-width. A ring is an annulus.
     Deliberately the same shape classifyAt works in (along/perp against a
     directed segment) so the port is a copy, not a translation. */
  function buildShore(grid){
    const B = BLOCK, W = WG_COAST;
    const gEndX = (grid.cols - 1) * B, gEndY = (grid.rows - 1) * B;
    const EXT = W.EXT * B, SANDW = W.SANDW * B, BOARD = W.BOARD * B;
    const X0 = -EXT, X1 = gEndX + EXT, Y0 = -EXT, Y1 = gEndY + EXT;

    /* west boardwalk: the band x in [X0-BOARD, X0], y in [Y0, Y1].
       Centreline is vertical at its mid-x, half-width BOARD/2. */
    const wbX = X0 - BOARD / 2, wbHalf = BOARD / 2;
    /* south boardwalk owns the corner, same as its beach does on the survey
       (drawWorld's own comment) -- so the west run stops at Y1 and the south
       run starts at X0-BOARD. */
    const sbY = Y1 + BOARD / 2, sbHalf = BOARD / 2;

    /* the pier: PIER_W wide, running west off the boardwalk's west edge at
       pierY. pierY = (Y0+Y1)/2 which lands on exactly 13*BLOCK on the
       shipped 36x27 -- the pier centreline is already on a grid row. */
    const PIER_W = W.PIER_W * B, PIER_LEN = W.PIER_LEN * B;
    const pierY = (Y0 + Y1) / 2;
    const pierX1 = X0 - BOARD, pierX0 = X0 - BOARD - SANDW - PIER_LEN;

    const runs = [
      { id: 'west',  kind: 'boardwalk',
        a: { x: wbX, y: Y0 }, b: { x: wbX, y: Y1 }, half: wbHalf },
      { id: 'south', kind: 'boardwalk',
        a: { x: X0 - BOARD, y: sbY }, b: { x: X1, y: sbY }, half: sbHalf },
      { id: 'pier',  kind: 'pier',
        a: { x: pierX1, y: pierY }, b: { x: pierX0, y: pierY }, half: PIER_W / 2 },
    ];
    const ring = {
      id: 'aquarium', kind: 'deck',
      cx: pierX0, cy: pierY,
      rOuter: WF.aqDeck * B, rInner: WF.aqRoof * B,
    };
    return { runs, ring, X0, X1, Y0, Y1, BOARD, pierY, pierX0, pierX1, PIER_W };
  }

  /* ---------------- classifyShore ----------------
     Same along/perp test classifyAt uses, generalised to a per-run
     half-width. Returns the run kind, or 'deck' inside the aquarium
     annulus, or null off-surface. No OVERSHOOT term: these runs butt into
     each other by construction rather than crossing at nodes.

     RING BEFORE RUNS (caught in the first bench smoke test): the pier run
     ends AT pierX0, which is exactly the ring's centre, so the run test
     covers the whole round deck and the aquarium building along with it --
     first pass had classifyShore reporting 'pier' while standing on the
     roof. The ring is the more specific shape and owns the pier's far end,
     so it is asked first and the run only answers what the ring didn't. */
  function classifyShore(sh, x, y) {
    const d = Math.hypot(x - sh.ring.cx, y - sh.ring.cy);
    if (d <= sh.ring.rOuter) return d >= sh.ring.rInner ? 'deck' : 'building';
    for (const r of sh.runs) {
      const dx = r.b.x - r.a.x, dy = r.b.y - r.a.y;
      const L = Math.hypot(dx, dy) || 1;
      const ux = dx / L, uy = dy / L;
      const rx = x - r.a.x, ry = y - r.a.y;
      const along = rx * ux + ry * uy;
      const perp = rx * -uy + ry * ux;
      if (along >= 0 && along <= L && Math.abs(perp) <= r.half) return r.kind;
    }
    return null;
  }

  /* ---------------- the junction fit test ----------------
     Southbound on the west boardwalk, right turn west onto the pier. The
     arc is tangent to both centrelines, so its centre sits one radius back
     along each. Its worst excursion off the corner is at 45deg, at
     R*(1 - 1/sqrt2) = 0.293R from each centreline -- that single number is
     what has to fit inside both bands, plus half the robot's own lane band
     so the OUTER wheel stays on deck too. */
  function junctionFit(sh, R) {
    const bulge = R * (1 - Math.SQRT1_2);
    const robotHalf = SIDEWALK_W / 2;
    const intoBoardwalk = sh.BOARD / 2;       // room west of the boardwalk centreline
    const intoPier = sh.PIER_W / 2;           // room north of the pier centreline
    const need = bulge + robotHalf;
    /* the largest R that clears BOTH bands -- invert bulge = R*(1-1/sqrt2) */
    const room = Math.min(intoBoardwalk, intoPier) - robotHalf;
    return {
      R, bulge, need,
      needBoardwalk: need, haveBoardwalk: intoBoardwalk,
      needPier: need, havePier: intoPier,
      binding: intoPier < intoBoardwalk ? 'pier' : 'boardwalk',
      maxR: Math.max(0, room / (1 - Math.SQRT1_2)),
      /* ...or keep CORNER_R and widen the pier instead. Both ends of the
         same trade, so both are reported rather than one being assumed. */
      minPierW: (2 * need) / BLOCK,
      ok: need <= intoBoardwalk && need <= intoPier,
    };
  }

  /* ring centreline: midway through the annulus. Compared against CORNER_R
     because that is the radius the robot and traffic already corner at --
     a ring wider than that drives GENTLER than a normal street corner. */
  function ringFit(sh) {
    const rMid = (sh.ring.rInner + sh.ring.rOuter) / 2;
    const band = sh.ring.rOuter - sh.ring.rInner;
    return { rMid, band, lanes: band / T2, ok: rMid >= CORNER_R };
  }

  /* ---------------- draw ---------------- */
  const COL = { boardwalk: 0xffb45c, pier: 0xff7a1a, deck: 0x4ad07a, lane: 0x2d5a6d };

  function drawRun(sc, g, r) {
    const dx = r.b.x - r.a.x, dy = r.b.y - r.a.y;
    const L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
    const nx = -uy, ny = ux;
    const q = (p) => sc.W(p.x, p.y, 0);
    /* footprint outline */
    const c = [
      { x: r.a.x + nx * r.half, y: r.a.y + ny * r.half },
      { x: r.b.x + nx * r.half, y: r.b.y + ny * r.half },
      { x: r.b.x - nx * r.half, y: r.b.y - ny * r.half },
      { x: r.a.x - nx * r.half, y: r.a.y - ny * r.half },
    ].map(q);
    g.lineStyle(3, COL[r.kind], 0.9);
    for (let i = 0; i < 4; i++) {
      const a = c[i], b = c[(i + 1) % 4];
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
    /* centreline */
    const a0 = q(r.a), b0 = q(r.b);
    g.lineStyle(2, COL[r.kind], 0.45);
    g.lineBetween(a0.x, a0.y, b0.x, b0.y);
    /* lane rails at the game's own T2 pitch, symmetric about the centreline */
    if (!WF.showLanes) return;
    g.lineStyle(1, COL.lane, 0.55);
    const n = Math.floor(r.half / T2);
    for (let k = -n; k <= n; k++) {
      if (k === 0) continue;
      const o = k * T2;
      const p1 = sc.W(r.a.x + nx * o, r.a.y + ny * o, 0);
      const p2 = sc.W(r.b.x + nx * o, r.b.y + ny * o, 0);
      g.lineBetween(p1.x, p1.y, p2.x, p2.y);
    }
  }

  function drawRing(sc, g, ring) {
    const arc = (rad, col, alpha, width) => {
      g.lineStyle(width, col, alpha);
      let prev = null;
      for (let k = 0; k <= 48; k++) {
        const a = k / 48 * Math.PI * 2;
        const p = sc.W(ring.cx + Math.cos(a) * rad, ring.cy + Math.sin(a) * rad, 0);
        if (prev) g.lineBetween(prev.x, prev.y, p.x, p.y);
        prev = p;
      }
    };
    arc(ring.rOuter, COL.deck, 0.9, 3);
    arc(ring.rInner, COL.deck, 0.9, 3);
    arc((ring.rInner + ring.rOuter) / 2, COL.deck, 0.5, 2);   // the drivable centreline
  }

  function drawJunction(sc, g, sh, R) {
    /* southbound boardwalk -> westbound pier. Centre one radius west of the
       boardwalk centreline and one radius north of the pier centreline. */
    const bcx = sh.runs[0].a.x;
    const cx = bcx - R, cy = sh.pierY - R;
    const fit = junctionFit(sh, R);
    g.lineStyle(3, fit.ok ? 0x4ad07a : 0xff5c5c, 0.95);
    let prev = null;
    for (let k = 0; k <= 24; k++) {
      /* from tangent-on-boardwalk (angle 0, due east of centre) round to
         tangent-on-pier (angle -90, due north of centre) */
      const a = (k / 24) * (Math.PI / 2);
      const p = sc.W(cx + Math.cos(a) * R, cy + Math.sin(a) * R, 0);
      if (prev) g.lineBetween(prev.x, prev.y, p.x, p.y);
      prev = p;
    }
  }

  function drawCity(sc, g, sh) {
    /* the 36x27 lattice's own footprint, so the shore has something to be
       west OF once the world itself isn't being drawn */
    const grid = sc.route.grid;
    const ex = (grid.cols - 1) * BLOCK, ey = (grid.rows - 1) * BLOCK;
    const c = [{ x: 0, y: 0 }, { x: ex, y: 0 }, { x: ex, y: ey }, { x: 0, y: ey }]
      .map(p => sc.W(p.x, p.y, 0));
    g.lineStyle(2, 0x8f95a1, 0.7);
    for (let i = 0; i < 4; i++) g.lineBetween(c[i].x, c[i].y, c[(i + 1) % 4].x, c[(i + 1) % 4].y);
    /* district seams -- 4x3, DISTRICT_W/H apart, the same lines hoodAt cuts on */
    g.lineStyle(1, 0x8f95a1, 0.28);
    for (let i = DISTRICT_W; i < grid.cols - 1; i += DISTRICT_W) {
      const a = sc.W(i * BLOCK, 0, 0), b = sc.W(i * BLOCK, ey, 0);
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
    for (let j = DISTRICT_H; j < grid.rows - 1; j += DISTRICT_H) {
      const a = sc.W(0, j * BLOCK, 0), b = sc.W(ex, j * BLOCK, 0);
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
  }

  let SH = buildShore(scene.route.grid);

  /* ---------------- schematic strip / restore ----------------
     Stash-and-empty in the PRE hook (which the bench runs before
     drawWorld), restore as the FIRST statement of the post hook. The pair
     is symmetric within a single frame, so nothing outside the draw ever
     observes an emptied array -- BENCH.census(), which reads counts, runs
     outside the draw and is unaffected. Restore also runs in teardown, so
     an exception mid-frame can't leave the world stripped.

     The bench installs its own __benchPre (BENCH.applyCam). Chained rather
     than replaced -- overwriting it silently kills the bench camera, which
     is the thing driving the zoom this feature exists to serve. */
  const STRIP_ROUTE = ['props', 'traffic', 'hazards', 'crossings'];
  const STRIP_GRID = ['edges', 'blocks', 'sidewalkRuns', 'sidewalkCornerCells',
                      'curbRamps', 'signals', 'extLots'];
  let stash = null;

  function stripWorld(sc) {
    if (stash) return;
    const r = sc.route, g = r.grid;
    stash = { r: {}, g: {} };
    for (const k of STRIP_ROUTE) if (Array.isArray(r[k])) { stash.r[k] = r[k]; r[k] = []; }
    for (const k of STRIP_GRID) if (Array.isArray(g[k])) { stash.g[k] = g[k]; g[k] = []; }
  }
  function restoreWorld(sc) {
    if (!stash) return;
    const r = sc.route, g = r.grid;
    for (const k in stash.r) r[k] = stash.r[k];
    for (const k in stash.g) g[k] = stash.g[k];
    stash = null;
  }
  const schematicOn = sc => WF.schematic && sc.K < WF.schematicK;

  const prevPre = scene.__benchPre;
  scene.__benchPre = function (sc, t) {
    if (prevPre) prevPre(sc, t);
    if (schematicOn(sc)) stripWorld(sc); else restoreWorld(sc);
  };

  BENCH.hook(function (sc) {
    restoreWorld(sc);              // FIRST, before anything can throw
    const g = sc.gFront;
    if (schematicOn(sc)) drawCity(sc, g, SH);
    for (const r of SH.runs) drawRun(sc, g, r);
    drawRing(sc, g, SH.ring);
    if (WF.showFit) drawJunction(sc, g, SH, WF.turnR);
  });

  /* ---------------- panel ---------------- */
  const FIELDS = [
    { key: 'BOARD',   src: 'wg', label: 'board',  min: 0.15, max: 0.90, step: 0.01 },
    { key: 'PIER_W',  src: 'wg', label: 'pier w', min: 0.12, max: 0.60, step: 0.01 },
    { key: 'PIER_LEN',src: 'wg', label: 'pier L', min: 1.0,  max: 5.0,  step: 0.1 },
    { key: 'SANDW',   src: 'wg', label: 'sand',   min: 0.4,  max: 3.0,  step: 0.1 },
    { key: 'aqDeck',  src: 'wf', label: 'aq deck',min: 0.20, max: 0.70, step: 0.01 },
    { key: 'aqRoof',  src: 'wf', label: 'aq roof',min: 0.06, max: 0.45, step: 0.01 },
    { key: 'turnR',   src: 'wf', label: 'turn R', min: 200,  max: 1600, step: 23 },
  ];
  const get = f => (f.src === 'wg' ? WG_COAST : WF)[f.key];
  const set = (f, v) => { (f.src === 'wg' ? WG_COAST : WF)[f.key] = v; };

  const panel = document.createElement('div');
  panel.id = 'wfPanel';
  panel.style.cssText = [
    'position:fixed', 'left:8px', 'right:8px', 'bottom:8px', 'z-index:99999',
    'background:#12141a', 'border:1px solid #2b2f38', 'border-radius:12px',
    'padding:10px 12px calc(10px + env(safe-area-inset-bottom))',
    'font:12px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace', 'color:#e8eaef',
    '-webkit-user-select:none', 'user-select:none',
  ].join(';');

  panel.innerHTML =
    `<div id="wfBar" style="display:flex;align-items:baseline;gap:8px">
       <b style="color:#ff9c4d;letter-spacing:2px">WATERFRONT</b>
       <span id="wfHint" style="color:#5c626d">tap to hide</span>
       <span id="wfVerdict" style="margin-left:auto;font-weight:700"></span>
     </div>
     <div id="wfBody" style="margin-top:8px">` +
    FIELDS.map(f =>
      `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
         <span style="width:54px;color:#8f95a1">${f.label}</span>
         <input type="range" id="wf-${f.key}" min="${f.min}" max="${f.max}"
                step="${f.step}" style="flex:1;accent-color:#ff7a1a">
         <span id="wfv-${f.key}" style="width:52px;text-align:right;
               font-variant-numeric:tabular-nums">0</span>
       </div>`).join('') +
    `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
       <span style="width:54px;color:#4ad07a">zoom</span>
       <input type="range" id="wf-k" min="0.02" max="1.60" step="0.01"
              style="flex:1;accent-color:#4ad07a">
       <span id="wfv-k" style="width:52px;text-align:right;
             font-variant-numeric:tabular-nums">0</span>
     </div>
     <div style="display:flex;gap:6px;margin-top:8px">
       <button id="wfGoTop"  style="flex:1">top</button>
       <button id="wfGoJunc" style="flex:1">junction</button>
       <button id="wfGoAq"   style="flex:1">aquarium</button>
       <button id="wfGoAll"  style="flex:1">whole shore</button>
     </div>
     <div style="display:flex;gap:6px;margin-top:6px">
       <button id="wfFit"    style="flex:1">fit turn</button>
       <button id="wfLanes"  style="flex:1">lanes</button>
       <button id="wfSchem"  style="flex:1">schematic</button>
       <button id="wfReset"  style="flex:1">reset</button>
     </div>
     <div id="wfStat" style="margin-top:8px;color:#8f95a1;white-space:pre-line"></div>
     <div style="display:flex;gap:8px;align-items:center;margin-top:8px">
       <code id="wfPort" style="flex:1;background:#0e0d0c;border:1px solid #2b2f38;
             border-radius:7px;padding:7px 8px;color:#ff9c4d;overflow-x:auto;
             white-space:nowrap;-webkit-user-select:text;user-select:text"></code>
       <button id="wfCopy" style="flex:0 0 62px">copy</button>
     </div>
     </div>`;

  for (const b of panel.querySelectorAll('button')) {
    b.style.cssText = 'background:#262a33;color:#e8eaef;border:1px solid #363b46;' +
                      'border-radius:9px;padding:9px 3px;font:inherit;font-weight:600';
  }
  document.body.appendChild(panel);

  const lanes = w => (w / T2).toFixed(1);

  function portLine() {
    return `WG_COAST BOARD:${WG_COAST.BOARD} PIER_W:${WG_COAST.PIER_W} ` +
           `PIER_LEN:${WG_COAST.PIER_LEN} SANDW:${WG_COAST.SANDW} | ` +
           `AQ_DECK:${WF.aqDeck} AQ_ROOF:${WF.aqRoof} turnR:${WF.turnR}`;
  }

  function rebuild() {
    SH = buildShore(scene.route.grid);
    const jf = junctionFit(SH, WF.turnR);
    const rf = ringFit(SH);
    const bw = SH.BOARD, pw = SH.PIER_W;

    const ok = jf.ok && rf.ok && bw >= SIDEWALK_W && pw >= SIDEWALK_W;
    const v = document.getElementById('wfVerdict');
    v.textContent = ok ? 'DRIVABLE' : 'TOO TIGHT';
    v.style.color = ok ? '#4ad07a' : '#ff5c5c';

    document.getElementById('wfStat').textContent =
      `boardwalk ${Math.round(bw)}  ${lanes(bw)} lanes   (sidewalk = ${SIDEWALK_W}, 4)\n` +
      `pier      ${Math.round(pw)}  ${lanes(pw)} lanes\n` +
      `annulus   ${Math.round(rf.band)}  ${rf.lanes.toFixed(1)} lanes   ` +
      `mid R ${Math.round(rf.rMid)} vs CORNER_R ${CORNER_R} ` +
      `${rf.ok ? '(gentler)' : '(TIGHTER)'}\n` +
      `junction  R ${jf.R} bulge ${Math.round(jf.bulge)} +robot ${SIDEWALK_W / 2} ` +
      `= ${Math.round(jf.need)}  vs board ${Math.round(jf.haveBoardwalk)} / ` +
      `pier ${Math.round(jf.havePier)}  ${jf.ok ? 'FITS' : 'OVERRUNS (' + jf.binding + ')'}\n` +
      `          fix either way: turnR <= ${Math.round(jf.maxR)}  ` +
      `or PIER_W >= ${jf.minPierW.toFixed(3)}\n` +
      `pier len  ${Math.round(SH.pierX1 - SH.pierX0)}  ` +
      `(${((SH.pierX1 - SH.pierX0) / BLOCK).toFixed(2)} blocks)  ` +
      `pierY ${Math.round(SH.pierY)} = ${(SH.pierY / BLOCK).toFixed(2)} BLOCK\n` +
      `zoom      K ${(+WF.k).toFixed(2)}  ` +
      `${WF.schematic ? (WF.k < WF.schematicK ? 'SCHEMATIC (world off)' :
        'art (schematic below ' + WF.schematicK + ')') : 'art (schematic off)'}`;

    document.getElementById('wfPort').textContent = portLine();
  }

  function sync() {
    for (const f of FIELDS) {
      const val = get(f);
      document.getElementById('wf-' + f.key).value = val;
      document.getElementById('wfv-' + f.key).textContent =
        f.src === 'wg' || f.key !== 'turnR' ? (+val).toFixed(2) : val;
    }
    document.getElementById('wfLanes').style.background = WF.showLanes ? '#ff7a1a' : '#262a33';
    document.getElementById('wfSchem').style.background = WF.schematic ? '#ff7a1a' : '#262a33';
    document.getElementById('wf-k').value = WF.k;
    document.getElementById('wfv-k').textContent = (+WF.k).toFixed(2);
    rebuild();
  }

  for (const f of FIELDS) {
    document.getElementById('wf-' + f.key).addEventListener('input', e => {
      set(f, +e.target.value);
      document.getElementById('wfv-' + f.key).textContent =
        f.key === 'turnR' ? e.target.value : (+e.target.value).toFixed(2);
      rebuild();
    });
  }

  /* the panel is the whole bottom half of a phone when open, which is
     exactly the geometry it exists to let you look at -- so the bar
     collapses it to one line rather than the lab needing to be unloaded */
  function setCollapsed(on) {
    WF.collapsed = on;
    document.getElementById('wfBody').style.display = on ? 'none' : '';
    document.getElementById('wfHint').textContent = on ? 'tap to show' : 'tap to hide';
  }
  document.getElementById('wfBar').onclick = () => setCollapsed(!WF.collapsed);

  /* camera K the bench and the game share. Lower is further out; the lab
     floor is 0.02 against the bench slider's 0.15. */
  function setK(k) {
    WF.k = k;
    BENCH.camZoom(k);
    document.getElementById('wf-k').value = k;
    document.getElementById('wfv-k').textContent = k.toFixed(2);
    rebuild();
  }
  document.getElementById('wf-k').addEventListener('input', e => setK(+e.target.value));

  const look = (x, y, k) => { BENCH.lookAt(x, y, k); setK(k); };

  document.getElementById('wfGoTop').onclick = () =>
    look(SH.runs[0].a.x, SH.Y0 + BLOCK * 0.6, 0.55);
  document.getElementById('wfGoJunc').onclick = () =>
    look(SH.runs[0].a.x - BLOCK * 0.4, SH.pierY, 1.1);
  document.getElementById('wfGoAq').onclick = () =>
    look(SH.pierX0, SH.pierY, 1.3);
  /* frame the entire shore: the west run is ~85,000 units tall, and W()'s
     vertical term is (xr+yr)*0.5*K, so the span that has to fit the screen
     height is half the run's Manhattan extent. Solved for K rather than
     dialled in by hand so it stays right if BOARD/PIER_LEN move. */
  document.getElementById('wfGoAll').onclick = () => {
    const h = scene.scale.gameSize.height, w = scene.scale.gameSize.width;
    const cx = (SH.pierX0 + SH.X0) / 2, cy = (SH.Y0 + SH.Y1) / 2;
    const spanX = (SH.X0 - SH.pierX0);
    const spanY = (SH.Y1 - SH.Y0);
    const k = Math.min(w / (spanX + spanY), h / ((spanX + spanY) * 0.5)) * 0.85;
    look(cx, cy, Math.max(0.02, k));
  };
  /* largest radius that clears the binding band, rounded down to the T2
     grain everything else in this file is measured in */
  document.getElementById('wfFit').onclick = () => {
    const m = junctionFit(SH, WF.turnR).maxR;
    WF.turnR = Math.max(200, Math.floor(m / 23) * 23);
    sync();
  };
  document.getElementById('wfLanes').onclick = () => { WF.showLanes = !WF.showLanes; sync(); };
  document.getElementById('wfSchem').onclick = () => { WF.schematic = !WF.schematic; sync(); };
  document.getElementById('wfReset').onclick = () => {
    Object.assign(WG_COAST, { BOARD: 0.35, PIER_W: 0.22, PIER_LEN: 2.2, SANDW: 1.4 });
    Object.assign(WF, { aqDeck: 0.36, aqRoof: 0.17, turnR: ROAD_HALF + SIDEWALK_W });
    sync();
  };
  document.getElementById('wfCopy').onclick = async () => {
    const btn = document.getElementById('wfCopy');
    try { await navigator.clipboard.writeText(portLine()); btn.textContent = 'copied'; }
    catch (e) {
      const r = document.createRange();
      r.selectNodeContents(document.getElementById('wfPort'));
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      btn.textContent = 'selected';
    }
    setTimeout(() => { btn.textContent = 'copy'; }, 1400);
  };

  /* teardown: reloading the lab twice must not stack hooks or panels, and
     must never leave the world stripped or the bench camera unhooked */
  scene.__wfOff = () => {
    restoreWorld(scene);
    scene.__benchPre = prevPre || null;
    BENCH.clear();
    document.getElementById('wfPanel')?.remove();
  };

  /* exposed so pier-course.lab.js (page 2) consumes THIS lattice rather than
     building a second copy of it -- the one rule labs/README.md is loudest
     about. */
  scene._wfAPI = { WF, buildShore, classifyShore, junctionFit, ringFit, get shore() { return SH; } };

  sync();
  /* boot on the whole-shore framing rather than the junction: the junction
     is the decision, but a 85,000-unit run you cannot see the ends of was
     the actual complaint. */
  document.getElementById('wfGoAll').click();
  console.log('waterfront ready -- tap the WATERFRONT bar to collapse the panel');
})();
