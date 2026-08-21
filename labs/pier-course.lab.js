/* ===========================================================================
   PIER COURSE — the drivable circuit on the shore lattice (bench lab)
   ===========================================================================
   PAGE 2 OF 2. Page 1 (labs/waterfront.lab.js) models the GROUND. This file
   models the LINE DRIVEN OVER IT, and answers one question: does every
   corner in the circuit fit, at every lane, with the robot's real width.

   It does not build its own lattice. `waterfront` must be loaded first; this
   lab reads `scene._wfAPI` and fails loudly rather than quietly building a
   second copy of the shore, which is the one rule labs/README.md is loudest
   about.

   THE TOPOLOGY
       top of the west boardwalk, heading south
         -> down to pierY
         -> west onto the pier
         -> teardrop around the aquarium, back east
         -> south on the boardwalk to the south end
         -> east off the deck into the grid, BLOCK LOOP, back on heading north
         -> north the length of the boardwalk
         -> BLOCK LOOP at the north end, back on heading south
         -> repeat

   The aquarium sits MID-course, not at an end: pierY = (Y0+Y1)/2 lands on
   row 13 of the shipped 36x27, the middle of the coast. So the pier is the
   mid-course turnaround and the two block loops are the end turnarounds.

   WHY A BLOCK LOOP AND NOT A U-TURN
   buildSegsFromLegs has no fillet for a 180 -- a reversal is not expressible
   as a leg pair at any radius, which is exactly why graftShore is southbound
   only today. Four ordinary 90deg corners around one city block reverse the
   heading instead, and put the robot back on the boardwalk one block along.
   Every one of those four is a real grid corner on a real sidewalk, so the
   469-wide deck is never asked to do anything it cannot.

   It is also geometrically periodic -- the circuit closes on itself with the
   same heading at the same x -- so the existing loop.sEnd wrap works as
   designed and the seam is invisible.

   WHAT THIS LAB IS FOR: THE TEN CORNERS
   cornerSign = ((f1 - f0 + 4) % 4 === 1) ? +1 : -1, and the robot's own
   turning radius is NOT R:

       sign +1  ->  radius = R + |laneOffset|     widens with lane
       sign -1  ->  radius = R - |laneOffset|     COLLAPSES with lane

   The sign -1 corners are the ones that bite. |laneOffset| tops out at 690,
   so R must clear 690 or the outer lanes invert and run the corner
   backwards. That is exactly what pinned the robot in place at
   SHORE_JUNCTION_R = 506, where lane 1 came out at radius zero.

   But the sign +1 corners fail the OTHER way and no radius floor catches
   them: radius R + 690 is a wide sweep, and a wide sweep has to land on a
   469 deck. Big R fixes one and breaks the other. So this lab checks the
   RADIUS PER LANE PER CORNER, not just where the robot ends up -- a
   containment scan cannot see an inverted arc, because a zero-radius arc
   still returns a perfectly valid position.

   The eight block-loop corners split cleanly, and not the way "both deck
   corners are the tight ones" predicts:

       S1  S->E  off deck   -1   tight    radius R-690
       S2  E->N  grid       -1   tight    radius R-690
       S3  N->W  grid       -1   tight    radius R-690
       S4  W->N  onto deck  +1   WIDE     radius R+690 onto a 469 deck
       N1  N->E  off deck   +1   WIDE
       N2  E->S  grid       +1   wide, ordinary street
       N3  S->W  grid       +1   wide, ordinary street
       N4  W->S  onto deck  -1   tight -- identical to the shipped junction

   Plus the two pier corners (both +1) and the aquarium teardrop, which is
   not a corner pair at all and comes straight out of page 1's buildLoopPath.

   THE SPUR PROBLEM, FLAGGED NOT HIDDEN
   The boardwalk's east edge is at X0 = -EXT*BLOCK = -1720 and the grid's
   column 0 is at x = 0. The connector between them crosses ~1720 units of
   extension strip that is neither shore nor sidewalk. This is NOT new here:
   the shipped graftShore spur has exactly the same gap and no surface tag.
   The fit report counts those samples in their own column ("link") rather
   than folding them into the failure count, so the number stays visible
   instead of drowning the corners this lab exists to measure.

   TO PORT: tap `copy` for the one-line summary and hand it back.
   =========================================================================== */

(() => {
  const scene = game.scene.scenes.find(s => s.route);
  if (!scene) { console.log('no scene with a route yet -- press start run'); return; }
  if (!scene._wfAPI) {
    console.log('pier-course needs the shore lattice: load `waterfront` first, then this.');
    return;
  }

  document.getElementById('pcPanel')?.remove();
  scene.__pcOff && scene.__pcOff();

  const WFAPI = scene._wfAPI;
  const { classifyShore, buildLoopPath } = WFAPI;

  /* ---------------- lab state ----------------
     Five radii, because the circuit genuinely wants five different ones and
     pretending otherwise is what produced the last three bugs.

     tightR  the sign -1 corners. Floor is 690 + margin; SHORE_JUNCTION_R's
             820 is the shipped value that measures clean and is the default.
     wideR   the sign +1 deck corners. Wants to be SMALL for the opposite
             reason -- PIER_TURN_R's 300 is the shipped precedent.
     gridR   the two sign +1 corners that happen entirely on ordinary street
             (N2, N3). No deck constraint, so CORNER_R.
     pierR   boardwalk <-> pier, the shipped PIER_TURN_R.
     filletR the aquarium teardrop, page 1's own value. */
  const PC = {
    tightR: 820,
    wideR: 300,
    gridR: CORNER_R,
    pierR: 300,
    filletR: 340,
    deckShift: -110,     // SHORE_DECK_SHIFT: world +x offset of the lane band off deck centre
    lane: -1,            // -1 = show all four; 0..3 = isolate one
    showLanes: true,
    showWheels: false,
    collapsed: false,
    k: 1.0,
  };

  /* ---------------- the circuit ----------------
     Legs in the same shape buildSegsFromLegs eats: { f, units, turnRAfter }.
     f: 0=E 1=S 2=W 3=N. Lengths are measured to the CORNER POINT, which lies
     on both centrelines -- the fillet is paid for out of the trims at either
     end, so a turn radius must never be subtracted here as well. Getting
     that wrong is the "leg is short by one radius" class of bug.

     Block loops ride column 0 and the two rows nearest each end, so every
     one of their four corners is a real intersection on a real sidewalk. */
  function buildCourse(sh, grid) {
    const B = BLOCK;
    const bwX = sh.runs[0].a.x;              // west boardwalk centreline
    const colX = 0;                          // grid column 0
    const ySouth = (grid.rows - 1) * B;      // southmost grid row
    const yNorth = 0;                        // northmost grid row
    const spur = colX - bwX;                 // boardwalk -> column 0, eastbound (positive)

    /* south loop turns east on the last row and comes back one row up;
       north loop turns east on row 0 and comes back one row down. Both
       reverse the heading in four 90s. */
    const ySouthBack = ySouth - B;
    const yNorthBack = yNorth + B;

    const legs = [
      /* 1  southbound boardwalk, from where the north loop drops us */
      { f: 1, units: sh.pierY - yNorthBack, surface: 'boardwalk', turnRAfter: PC.pierR, tag: 'bw-S-upper' },
      /* 2  west onto the pier -- ends at the teardrop, which is spliced in */
      { f: 2, units: 0, surface: 'pier', tag: 'pier-out', teardropAfter: true },
      /* 3  east back off the pier */
      { f: 0, units: 0, surface: 'pier', turnRAfter: PC.pierR, tag: 'pier-in' },
      /* 4  southbound boardwalk to the south end */
      { f: 1, units: ySouth - sh.pierY, surface: 'boardwalk', turnRAfter: PC.tightR, tag: 'bw-S-lower' },
      /* --- south block loop: S->E->N->W->N --- */
      { f: 0, units: spur, turnRAfter: PC.gridR, tag: 'S1 spur-E', link: true },
      { f: 3, units: B,    turnRAfter: PC.gridR, tag: 'S2 blk-N' },
      { f: 2, units: spur, turnRAfter: PC.wideR, tag: 'S3 spur-W', link: true },
      /* 5  northbound the length of the boardwalk */
      { f: 3, units: ySouthBack - yNorth, surface: 'boardwalk', turnRAfter: PC.wideR, tag: 'bw-N' },
      /* --- north block loop: N->E->S->W->S --- */
      { f: 0, units: spur, turnRAfter: PC.gridR, tag: 'N1 spur-E', link: true },
      { f: 1, units: B,    turnRAfter: PC.gridR, tag: 'N2 blk-S' },
      { f: 2, units: spur, turnRAfter: PC.tightR, tag: 'N3 spur-W', link: true },
      /* wraps to leg 1 */
    ];

    /* the two pier legs' lengths depend on the teardrop's own start, which
       buildLoopPath solves from the fillet radius. xf = sqrt(R^2 + 2*R*rf)
       measured out from the ring centre -- the straight ends there. */
    const R = (sh.ring.rInner + sh.ring.rOuter) / 2;
    const xf = Math.sqrt(R * R + 2 * R * PC.filletR);
    const pierRun = (sh.pierX1 - (sh.ring.cx + xf));
    legs[1].units = pierRun;
    legs[2].units = pierRun;

    return { legs, bwX, colX, ySouth, yNorth, ySouthBack, yNorthBack, spur, xf, R };
  }

  /* ---------------- segs, verbatim from buildSegsFromLegs ----------------
     Copied rather than called because the game's own is scoped to a route
     walk and wants a startNode. Same arc construction, same cornerSign, same
     trim rule -- if this drifts from the game's, the port stops being a copy
     and the lab stops being evidence. */
  function courseSegs(cs, startP) {
    const L = cs.legs;
    const cornerSign = [];
    for (let c = 0; c < L.length; c++) {
      const f0 = L[c].f, f1 = L[(c + 1) % L.length].f;
      cornerSign.push(((f1 - f0 + 4) % 4 === 1) ? 1 : -1);
    }
    const cornerR = L.map((l, c) => l.turnRAfter != null ? l.turnRAfter : CORNER_R);

    const segs = [];
    let s = 0, p = { x: startP.x, y: startP.y };
    for (let i = 0; i < L.length; i++) {
      const f = L[i].f, d = DIRV[f], rv = DIRV[(f + 1) % 4];
      const prev = (i - 1 + L.length) % L.length;
      const trimS = L[i].teardropAfter || L[prev].teardropAfter ? 0 : cornerR[prev];
      const trimE = L[i].teardropAfter ? 0 : cornerR[i];
      const lineLen = L[i].units - trimS - trimE;
      segs.push({
        type: 'line', s0: s, s1: s + lineLen, f, i,
        tag: L[i].tag, link: !!L[i].link, surface: L[i].surface,
        start: { x: p.x + d.x * trimS, y: p.y + d.y * trimS },
        end: { x: p.x + d.x * (L[i].units - trimE), y: p.y + d.y * (L[i].units - trimE) },
        len: lineLen,
      });
      s += lineLen;
      const cornerP = { x: p.x + d.x * L[i].units, y: p.y + d.y * L[i].units };

      if (L[i].teardropAfter) {
        segs.push({ type: 'teardrop', s0: s, s1: s, i, tag: 'aquarium' });
      } else {
        const sign = cornerSign[i], R = cornerR[i];
        const center = { x: cornerP.x - d.x * R + sign * rv.x * R,
                         y: cornerP.y - d.y * R + sign * rv.y * R };
        const startPt = { x: cornerP.x - d.x * R, y: cornerP.y - d.y * R };
        const a0 = Math.atan2(startPt.y - center.y, startPt.x - center.x);
        const arcLen = Math.PI / 2 * R;
        segs.push({ type: 'arc', s0: s, s1: s + arcLen, center, a0, sign, R, f, i,
                    tag: L[i].tag, len: arcLen });
        s += arcLen;
      }
      p = cornerP;
    }
    return { segs, totalLen: s, endP: p };
  }

  /* ---------------- the lane band ----------------
     The seg centreline is NOT the deck centreline. The robot rides
     laneOffset(lane) off its seg along the seg's own right vector, so the
     seg has to be pushed the opposite way by exactly that much for the band
     to land on the planks. Solving c + rv*lo = deckC + shift gives this.

     WORTH KNOWING, because the shipped comment at graftShore says northbound
     "cannot be made to work at any radius": the -rv*lo term already absorbs
     the direction flip, so the band's WORLD footprint is identical either
     way -- only the lane ORDER reverses (lane 0 is the seaward lane
     southbound and the landward lane northbound). Which lane is nearest the
     water matters later for fail volumes; it does not make northbound
     unbuildable. */
  const BAND_LANE = 1;          // the lane the band centres itself on -- the robot's default botRow
  function segCentre(deckC, f) {
    const rv = DIRV[(f + 1) % 4];
    const lo = laneOffset(BAND_LANE);
    return deckC - rv.x * lo + PC.deckShift;
  }

  /* robot's own turning radius on a corner, per lane. This is the number the
     whole lab exists to print. */
  function laneRadius(sign, R, lane) {
    return R - sign * laneOffset(lane);
  }

  /* sample one lane's driven line as a polyline */
  function lanePath(segs, lane, sh) {
    const lo = laneOffset(lane);
    const pts = [];
    for (const sg of segs) {
      if (sg.type === 'line') {
        const rv = DIRV[(sg.f + 1) % 4];
        const n = Math.max(2, Math.ceil(Math.abs(sg.len) / (T2 * 2)));
        for (let k = 0; k <= n; k++) {
          const t = k / n;
          pts.push({ x: sg.start.x + (sg.end.x - sg.start.x) * t + rv.x * lo,
                     y: sg.start.y + (sg.end.y - sg.start.y) * t + rv.y * lo,
                     tag: sg.tag, link: sg.link, kind: 'line' });
        }
      } else if (sg.type === 'arc') {
        const rr = laneRadius(sg.sign, sg.R, lane);
        const n = 24;
        for (let k = 0; k <= n; k++) {
          const a = sg.a0 + sg.sign * (Math.PI / 2) * (k / n);
          pts.push({ x: sg.center.x + Math.cos(a) * rr,
                     y: sg.center.y + Math.sin(a) * rr,
                     tag: sg.tag, kind: 'arc', radius: rr });
        }
      } else if (sg.type === 'teardrop') {
        const tp = buildLoopPath(sh, PC.filletR).pts;
        for (let i = 0; i < tp.length; i++) {
          const a = tp[i], b = tp[Math.min(i + 1, tp.length - 1)];
          const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
          pts.push({ x: a.x + (-dy / L) * lo, y: a.y + (dx / L) * lo,
                     tag: 'aquarium', kind: 'loop' });
        }
      }
    }
    return pts;
  }

  /* ---------------- the fit test ----------------
     Same honesty page 1 uses: sample both WHEEL LINES against the real
     classifiers rather than trusting a formula, and ask the union of the
     shore lattice and the grid's own sidewalk. 'road' and 'block' are off.

     Link samples (the extension-strip connectors) are counted separately --
     see the spur note in the header. */
  function classifyAny(sh, grid, x, y) {
    const s = classifyShore(sh, x, y);
    if (s && s !== 'building') return s;
    const g = grid.classify ? grid.classify(x, y) : classifyAt(grid.edges, x, y);
    return g === 'sidewalk' ? 'sidewalk' : null;
  }

  function courseFit(sh, grid, segs) {
    const half = SIDEWALK_W / 2;
    const perCorner = [];
    for (const sg of segs) {
      if (sg.type !== 'arc') continue;
      const lanes = [0, 1, 2, 3].map(l => laneRadius(sg.sign, sg.R, l));
      perCorner.push({
        tag: sg.tag, sign: sg.sign, R: sg.R,
        minLane: Math.min(...lanes), maxLane: Math.max(...lanes),
        inverted: lanes.some(r => r <= 0),
        lanes,
      });
    }
    let off = 0, link = 0, total = 0;
    const worst = [];
    for (let lane = 0; lane < 4; lane++) {
      const p = lanePath(segs, lane, sh);
      for (let i = 0; i < p.length - 1; i++) {
        const a = p[i], b = p[i + 1];
        const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
        const nx = -dy / L, ny = dx / L;
        for (const s of [-1, 1]) {
          const x = a.x + nx * half * s, y = a.y + ny * half * s;
          total++;
          if (classifyAny(sh, grid, x, y)) continue;
          if (a.link) { link++; continue; }
          off++;
          if (worst.length < 400) worst.push({ x, y, tag: a.tag, lane });
        }
      }
    }
    const inverted = perCorner.filter(c => c.inverted);
    return { off, link, total, worst, perCorner, inverted,
             ok: off === 0 && inverted.length === 0,
             pct: total ? (off / total) * 100 : 0 };
  }

  /* ---------------- draw ---------------- */
  const COL = { ok: 0x4ad07a, bad: 0xff5c5c, link: 0xffc44d, lane: 0x6fd0ff, ctr: 0xff9c4d };

  function drawCourse(sc, g, sh, grid, segs, fit) {
    /* centreline first, dim, so the lanes read on top of it */
    g.lineStyle(2, COL.ctr, 0.35);
    const c = lanePathCentre(segs, sh);
    for (let i = 0; i < c.length - 1; i++) {
      const a = sc.W(c[i].x, c[i].y, 0), b = sc.W(c[i + 1].x, c[i + 1].y, 0);
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
    if (!PC.showLanes) return;
    const lanes = PC.lane < 0 ? [0, 1, 2, 3] : [PC.lane];
    for (const lane of lanes) {
      const p = lanePath(segs, lane, sh);
      for (let i = 0; i < p.length - 1; i++) {
        const a = p[i], b = p[i + 1];
        const bad = a.kind === 'arc' && a.radius <= 0;
        g.lineStyle(bad ? 4 : 2, bad ? COL.bad : (a.link ? COL.link : COL.lane), 0.9);
        const wa = sc.W(a.x, a.y, 0), wb = sc.W(b.x, b.y, 0);
        g.lineBetween(wa.x, wa.y, wb.x, wb.y);
      }
    }
    /* off-surface samples, so a failure has a location and not just a count */
    g.fillStyle(COL.bad, 0.9);
    for (const w of fit.worst) {
      const p = sc.W(w.x, w.y, 0);
      g.fillCircle(p.x, p.y, 2.5);
    }
  }
  function lanePathCentre(segs, sh) {
    const pts = [];
    for (const sg of segs) {
      if (sg.type === 'line') { pts.push(sg.start, sg.end); }
      else if (sg.type === 'arc') {
        for (let k = 0; k <= 12; k++) {
          const a = sg.a0 + sg.sign * (Math.PI / 2) * (k / 12);
          pts.push({ x: sg.center.x + Math.cos(a) * sg.R, y: sg.center.y + Math.sin(a) * sg.R });
        }
      } else if (sg.type === 'teardrop') {
        for (const q of buildLoopPath(sh, PC.filletR).pts) pts.push(q);
      }
    }
    return pts;
  }

  /* ---------------- build ---------------- */
  let SH = WFAPI.shore, CS = null, SEGS = null, FIT = null;

  function rebuildAll() {
    SH = WFAPI.shore;
    const grid = scene.route.grid;
    CS = buildCourse(SH, grid);
    /* start at the top of the upper southbound leg, on the seg centreline
       for a southbound run */
    const startP = { x: segCentre(CS.bwX, 1), y: CS.yNorthBack };
    SEGS = courseSegs(CS, startP).segs;
    FIT = courseFit(SH, grid, SEGS);
    return FIT;
  }

  /* CHAIN, DO NOT REPLACE. BENCH.hook is a SINGLE SLOT (bench line 393:
     `s.__benchHook = fn`), so installing ours plainly deletes waterfront's
     and the shore lattice this course is drawn over simply vanishes. Page 1
     documents the same trap for __benchPre and solves it the same way.
     Captured AFTER __pcOff has run, so reloading this lab on top of itself
     recaptures waterfront's hook rather than nesting our own. */
  const prevHook = scene.__benchHook || null;
  BENCH.hook(function (sc, t) {
    if (prevHook) { try { prevHook(sc, t); } catch (e) { /* page 1's problem, not ours */ } }
    if (!SEGS) return;
    drawCourse(sc, sc.gFront, SH, sc.route.grid, SEGS, FIT);
  });

  /* ---------------- panel ---------------- */
  const FIELDS = [
    { key: 'tightR',  label: 'tight R', min: 138, max: 1600, step: 23 },
    { key: 'wideR',   label: 'wide R',  min: 138, max: 1600, step: 23 },
    { key: 'gridR',   label: 'grid R',  min: 138, max: 1600, step: 23 },
    { key: 'pierR',   label: 'pier R',  min: 138, max: 1600, step: 23 },
    { key: 'filletR', label: 'fillet',  min: 60,  max: 900,  step: 20 },
    { key: 'deckShift', label: 'shift', min: -400, max: 400, step: 10 },
  ];

  const panel = document.createElement('div');
  panel.id = 'pcPanel';
  panel.dataset.labPanel = '1';
  panel.style.cssText = [
    'position:fixed', 'left:8px', 'right:8px', 'bottom:8px', 'z-index:99999',
    'background:#12141a', 'border:1px solid #2b2f38', 'border-radius:12px',
    'padding:10px 12px calc(10px + env(safe-area-inset-bottom))',
    'font:12px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace', 'color:#e8eaef',
    '-webkit-user-select:none', 'user-select:none',
  ].join(';');

  panel.innerHTML =
    `<div id="pcBar" style="display:flex;align-items:baseline;gap:8px">
       <b style="color:#6fd0ff;letter-spacing:2px">PIER COURSE</b>
       <span style="color:#5c626d">tap to hide</span>
       <span id="pcVerdict" style="margin-left:auto;font-weight:700"></span>
     </div>
     <div id="pcBody" style="margin-top:8px">` +
    FIELDS.map(f =>
      `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
         <span style="width:54px;color:#8f95a1">${f.label}</span>
         <input type="range" id="pc-${f.key}" min="${f.min}" max="${f.max}"
                step="${f.step}" style="flex:1;accent-color:#6fd0ff">
         <span id="pcv-${f.key}" style="width:52px;text-align:right;
               font-variant-numeric:tabular-nums">0</span>
       </div>`).join('') +
    `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
       <span style="width:54px;color:#4ad07a">zoom</span>
       <input type="range" id="pc-k" min="0.02" max="1.60" step="0.01"
              style="flex:1;accent-color:#4ad07a">
       <span id="pcv-k" style="width:52px;text-align:right;
             font-variant-numeric:tabular-nums">0</span>
     </div>
     <div style="display:flex;gap:6px;margin-top:8px">
       <button id="pcGoS"   style="flex:1">S loop</button>
       <button id="pcGoN"   style="flex:1">N loop</button>
       <button id="pcGoAq"  style="flex:1">aquarium</button>
       <button id="pcGoAll" style="flex:1">whole</button>
     </div>
     <div style="display:flex;gap:6px;margin-top:6px">
       <button id="pcFit"   style="flex:1">solve</button>
       <button id="pcLane"  style="flex:1">lane: all</button>
       <button id="pcReset" style="flex:1">reset</button>
     </div>
     <div id="pcStat" style="margin-top:8px;color:#8f95a1;white-space:pre-line"></div>
     <div style="display:flex;gap:8px;align-items:center;margin-top:8px">
       <code id="pcPort" style="flex:1;background:#0e0d0c;border:1px solid #2b2f38;
             border-radius:7px;padding:7px 8px;color:#6fd0ff;overflow-x:auto;
             white-space:nowrap;-webkit-user-select:text;user-select:text"></code>
       <button id="pcCopy" style="flex:0 0 62px">copy</button>
     </div>
     </div>`;

  for (const b of panel.querySelectorAll('button')) {
    b.style.cssText = 'background:#262a33;color:#e8eaef;border:1px solid #363b46;' +
                      'border-radius:9px;padding:9px 3px;font:inherit;font-weight:600';
  }
  document.body.appendChild(panel);

  function portLine() {
    return `PC tight:${PC.tightR} wide:${PC.wideR} grid:${PC.gridR} ` +
           `pier:${PC.pierR} fillet:${PC.filletR} shift:${PC.deckShift}`;
  }

  function sync() {
    for (const f of FIELDS) {
      const el = document.getElementById('pc-' + f.key);
      if (document.activeElement !== el) el.value = PC[f.key];
      document.getElementById('pcv-' + f.key).textContent = Math.round(PC[f.key]);
    }
    document.getElementById('pcv-k').textContent = PC.k.toFixed(2);

    const fit = rebuildAll();
    const v = document.getElementById('pcVerdict');
    v.textContent = fit.ok ? 'DRIVABLE' : (fit.inverted.length ? 'INVERTED' : 'OVERRUNS');
    v.style.color = fit.ok ? '#4ad07a' : '#ff5c5c';

    const rows = fit.perCorner.map(c => {
      const bad = c.inverted || c.minLane < T2;
      return `  ${c.tag.padEnd(10)} ${c.sign > 0 ? '+1' : '-1'} R${String(Math.round(c.R)).padStart(5)}` +
             `  lanes ${String(Math.round(c.minLane)).padStart(5)}..${String(Math.round(c.maxLane)).padStart(5)}` +
             `  ${c.inverted ? 'INVERTED' : bad ? 'tight' : 'ok'}`;
    }).join('\n');

    document.getElementById('pcStat').textContent =
      `corners ${fit.perCorner.length}   off-surface ${fit.off}/${fit.total}` +
      `  link ${fit.link}\n` +
      `laneOffset 414/506/598/690   floor for sign -1 is R > 690\n` +
      rows + `\n` +
      `spur ${Math.round(CS.spur)} across the extension strip (unsurfaced, pre-existing)\n` +
      `period ${Math.round(courseSegs(CS, { x: segCentre(CS.bwX, 1), y: CS.yNorthBack }).totalLen)} units`;

    document.getElementById('pcPort').textContent = portLine();
  }

  for (const f of FIELDS) {
    document.getElementById('pc-' + f.key).oninput = e => { PC[f.key] = +e.target.value; sync(); };
  }
  const kEl = document.getElementById('pc-k');
  kEl.value = PC.k;
  kEl.oninput = e => { PC.k = +e.target.value; BENCH.camZoom(PC.k); sync(); };

  const look = (x, y, k) => { PC.k = k; kEl.value = k; BENCH.lookAt(x, y, k); sync(); };
  document.getElementById('pcGoS').onclick   = () => look(CS.bwX + CS.spur / 2, CS.ySouth - BLOCK / 2, 0.10);
  document.getElementById('pcGoN').onclick   = () => look(CS.bwX + CS.spur / 2, CS.yNorth + BLOCK / 2, 0.10);
  document.getElementById('pcGoAq').onclick  = () => look(SH.pierX0, SH.pierY, 0.35);
  document.getElementById('pcGoAll').onclick = () => {
    const h = scene.scale.gameSize.height, w = scene.scale.gameSize.width;
    const spanX = (CS.colX - SH.pierX0), spanY = (CS.ySouth - CS.yNorth);
    const k = Math.min(w / (spanX + spanY), h / ((spanX + spanY) * 0.5)) * 0.85;
    look((SH.pierX0 + CS.colX) / 2, (CS.yNorth + CS.ySouth) / 2, Math.max(0.02, k));
  };

  /* solve: widest tight R that leaves no inverted lane, and the widest wide R
     that still lands on the deck. Scanned, not solved -- the surface union has
     no closed form once the block loop crosses into the grid. */
  document.getElementById('pcFit').onclick = () => {
    const grid = scene.route.grid;
    const try_ = (key, lo, hi, step) => {
      const keep = PC[key]; let best = null;
      for (let v = lo; v <= hi; v += step) {
        PC[key] = v;
        CS = buildCourse(SH, grid);
        const sp = { x: segCentre(CS.bwX, 1), y: CS.yNorthBack };
        const f = courseFit(SH, grid, courseSegs(CS, sp).segs);
        if (f.off === 0 && f.inverted.length === 0) best = v;
      }
      PC[key] = best != null ? best : keep;
    };
    try_('tightR', 713, 1600, 23);
    try_('wideR', 138, 900, 23);
    sync();
  };

  document.getElementById('pcLane').onclick = () => {
    PC.lane = PC.lane >= 3 ? -1 : PC.lane + 1;
    document.getElementById('pcLane').textContent =
      'lane: ' + (PC.lane < 0 ? 'all' : PC.lane);
    sync();
  };
  document.getElementById('pcReset').onclick = () => {
    Object.assign(PC, { tightR: 820, wideR: 300, gridR: CORNER_R, pierR: 300,
                        filletR: 340, deckShift: -110, lane: -1 });
    document.getElementById('pcLane').textContent = 'lane: all';
    sync();
  };
  document.getElementById('pcCopy').onclick = async () => {
    const btn = document.getElementById('pcCopy');
    try { await navigator.clipboard.writeText(portLine()); btn.textContent = 'copied'; }
    catch (e) {
      const r = document.createRange();
      r.selectNodeContents(document.getElementById('pcPort'));
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      btn.textContent = 'selected';
    }
    setTimeout(() => { btn.textContent = 'copy'; }, 1400);
  };

  /* collapse, same reason page 1 boots collapsed: the panel is most of a
     phone screen and the first thing wanted on load is the geometry */
  let collapsed = false;
  const setCollapsed = c => {
    collapsed = c;
    document.getElementById('pcBody').style.display = c ? 'none' : '';
  };
  document.getElementById('pcBar').onclick = () => setCollapsed(!collapsed);

  scene.__pcOff = () => {
    document.getElementById('pcPanel')?.remove();
    /* hand the slot back to whoever had it, so unloading this lab leaves the
       shore lattice drawing rather than a blank world */
    scene.__benchHook = prevHook;
  };

  sync();
  document.getElementById('pcGoAll').click();
  setCollapsed(true);
  console.log('pier-course ready -- tap the PIER COURSE bar for the dials');
})();
