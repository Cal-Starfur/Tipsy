/* ===========================================================================
   CONE SLALOM — paste into the Lab console in labs/_bench.html
   ===========================================================================
   Bench code, not a standalone lab: labs/README.md is explicit that new work
   belongs in the bench, because the bench compiles inside the game's own realm.
   This closes over TILE/T2/laneOffset/CONE_HIT/TILT_SENS/DIRV directly, exactly
   as game/index.html does, so the port is a copy rather than a translation.

   WHAT IS BEING PROTOTYPED
   The "Cone Slalom Challenge" side mission behind the slalom-master trophy
   (reward skin: cone-dodger). Both have been declared in the profile/trophy
   tables since 2026-07-29 with status "available" and a note that no course
   was built. This is that course.

   THREE DESIGN CALLS, LOCKED BEFORE BUILD
     1. FREE ANALOG STEER, not lane hops.
     2. HITTING A CONE = TIME PENALTY, run continues.
     3. WIN = clear every cone under par.

   WHY ANALOG STEER IS A SMALL CHANGE
   this.laneOff is ALREADY a continuous scalar. hopAnim only smoothsteps it
   between laneOffset(row) values and then nulls itself. Nothing downstream
   knows about rows: every hazard proximity test in update() is a distance test
   of the form |laneOff - laneOffset(hz.row)| < k. So steering is one
   integrator written where the hopAnim block would have run, and the whole
   existing collision surface comes along unchanged.

   THE ONE INPUT TRAP
   hop() does not map dy straight to a row delta. It computes rowPlusDown from
   the lane axis's screen-y projection at the QUANTIZED heading, because the
   lane axis rotates under a fixed camera — without it the same swipe moves the
   robot up-screen on one street and down-screen on the next (that bug shipped
   once already). Steer input goes through the identical flip, via slScreenSign()
   below. World-space logic (cone sides, clamps) does NOT get flipped; only the
   player's raw left/right does.

   TO PORT: tap `copy` for the tuned constant line, hand it back, and it gets
   written into a SL_ block in game/index.html and synced to game-logic.js.
   =========================================================================== */

(() => {
  const scene = game.scene.scenes.find(s => s.route);
  if (!scene) { console.log('no scene with a route yet'); return; }

  document.getElementById('slPanel')?.remove();
  if (scene._slRestore) { scene._slRestore(); }

  /* ---------- tunables — every one of these is a slider ---------- */
  const SL = {
    n:       12,      // cones in the course
    gap:     2.10,    // along-route spacing between cones, in T2
    amp:     0.55,    // cone lateral alternation about the band centre, in rows
    lead:    6.0,     // run-up before the first cone, in T2
    tail:    3.0,     // run-out after the last cone, in T2
    steer:   3.0,     // lateral units per ms, per unit of forward speed
    lag:     0.010,   // steer input -> actual, per ms (first-order)
    lean:    0.10,    // steer lean coefficient — read against CORNER_TILT_COEF (0.07)
    pen:     2.0,     // seconds added per knocked cone / missed side
    par:     26.0,    // seconds to beat
  };
  const SL0 = { ...SL };

  const CENTRE = 1.5;                         // band centre in row space (rows 0..3)
  const offOf  = row => laneOffset(row);
  const LO = Math.min(offOf(0), offOf(3)), HI = Math.max(offOf(0), offOf(3));

  /* run state */
  const run = {
    course: null, cones: [], started: false, done: false,
    t0: 0, elapsed: 0, pen: 0, cleared: 0, faults: [], msg: '', msgT: 0,
  };

  /* ---------- screen-relative steer sign ----------
     Lifted verbatim in spirit from hop(): sample the lane axis's screen-y
     projection across one row step at the quantized heading. Sign is all we
     need; row spacing is uniform. */
  function slScreenSign(){
    const hdg = scene.headingAt(scene.botS);
    const fq  = ((Math.round(hdg / (Math.PI/2)) % 4) + 4) % 4;
    const rv  = DIRV[(fq + 1) % 4];
    const rowPlusDown = (rv.x + rv.y) * (offOf(1) - offOf(0)) > 0;
    /* screen-right should read as screen-down-ish on this iso camera, which is
       the same axis rowPlusDown answers for. +1 means "drag right -> row +1". */
    return rowPlusDown ? 1 : -1;
  }

  /* =========================================================================
     COURSE
     Cones alternate to either side of the band centre by SL.amp rows. The side
     you must pass on is the side the cone leans AWAY from — so the required
     side falls out of the layout instead of being a second parallel rule that
     can disagree with it. (One constant, one question.)
     ========================================================================= */
  function slFindLeg(){
    const need = (SL.lead + (SL.n - 1) * SL.gap + SL.tail) * T2;
    const segs = scene.route.segs.filter(g => g.type === 'line' && (g.s1 - g.s0) >= need);
    if (!segs.length) return null;
    /* nearest straight ahead of the robot, else the longest one */
    const ahead = segs.filter(g => g.s1 > scene.botS);
    return (ahead.length ? ahead[0] : segs.sort((a,b) => (b.s1-b.s0)-(a.s1-a.s0))[0]);
  }

  function slBuildCourse(){
    const leg = slFindLeg();
    if (!leg) { run.msg = 'no straight long enough — shorten n/gap'; return null; }

    const startS = Math.round(leg.s0 + SL.lead * T2);
    const cones  = [];
    for (let i = 0; i < SL.n; i++){
      const sign = (i % 2 === 0) ? -1 : 1;           // world-space, never flipped
      cones.push({
        i, s: Math.round(startS + i * SL.gap * T2),
        row: CENTRE + sign * SL.amp,
        wantSide: -sign,                             // pass on the open side
        hz: null, knocked: false, judged: false,
      });
    }
    const lastS = cones[cones.length - 1].s;
    const course = {
      leg, startS, lastS,
      lineS:   Math.round(startS - SL.gap * T2 * 0.5),   // timer starts here
      finishS: Math.round(lastS + SL.tail * T2),
      spawnS:  Math.round(startS - SL.lead * T2),
    };

    /* Clear the whole leg of ordinary street furniture, run-up and run-out
       included — same reasoning hjBuildCourse gives for the hydrant lane:
       you would weave ten cones clean and then land on a crack. Every row is
       cleared, not just the cone row, because analog steer means the player
       genuinely owns the full band width. */
    const from = course.spawnS - T2, to = course.finishS + T2;
    scene.route.hazards = scene.route.hazards.filter(h =>
      !h.slRole && !(h.s >= from && h.s <= to));
    scene.route.props = (scene.route.props || []).filter(pr =>
      !(pr.s >= from && pr.s <= to));

    /* Cone hazard objects mirror the generator's own cone branch field for
       field (phi/phase/angVel/moving/pose/slide/slideVel), so the existing
       rigid pivot-fall integrator and hit code drive them with no special
       case. Always standing — a pre-knocked cone in a slalom is a free gate. */
    for (const c of cones){
      const hz = {
        type:'cone', s:c.s, row:c.row, f:0, hit:false,
        phi:0, phase:1, angVel:0, moving:false, pose:'standing',
        slide:0, slideVel:0,
        slRole:'gate', slIndex:c.i,
      };
      c.hz = hz;
      scene.route.hazards.push(hz);
    }
    return course;
  }

  function slResetRun(){
    run.course = slBuildCourse();
    if (!run.course) return;
    run.cones = run.course ? scene.route.hazards.filter(h => h.slRole === 'gate') : [];
    run.started = false; run.done = false;
    run.elapsed = 0; run.pen = 0; run.cleared = 0; run.faults = [];
    run.msg = 'roll to the line'; run.msgT = performance.now();

    scene.botS   = run.course.spawnS;
    scene.laneOff = offOf(CENTRE);
    scene.botRow = 1;
    scene.hopAnim = null; scene.hopYaw = 0; scene.hopKick = 0;
    scene.speed = 0; scene.tilt = 0; scene.roll = 0;
    scene.state = 'play'; scene.tipT = 0; scene.damage = 0;
    const sp = scene.posAt(scene.botS), hdg = scene.headingAt(scene.botS);
    scene.botX = sp.x + (-Math.sin(hdg)) * scene.laneOff;
    scene.botY = sp.y + Math.cos(hdg) * scene.laneOff;
    scene.camX = scene.botX; scene.camY = scene.botY;
    scene.drawAngle = hdg;
    slSteerIn = 0; slSteerA = 0; prevS = scene.botS;
  }

  /* =========================================================================
     STEER + JUDGING, wrapped around the scene's own update
     pre  : write laneOff BEFORE update()'s hazard pass reads it
     post : write hopYaw AFTER update()'s else-branch decays it to zero
     ========================================================================= */
  let slSteerIn = 0, slSteerA = 0, prevS = scene.botS;

  function slPre(dt){
    if (scene.state !== 'play' || !run.course) return;

    slSteerA += (slSteerIn - slSteerA) * Math.min(1, SL.lag * dt);

    const seg = scene.segAt(scene.botS);
    if (seg.type === 'arc'){ slSteerA *= 0.9; return; }   // no steering mid-turn, same rule hop() has

    const world = slSteerA * slScreenSign();             // player-space -> world row-space
    /* row-space -> laneOff units is one sign (ROBOT_SIDE); magnitude is
       deliberately NOT scaled by T2, because steer rate is expressed in the
       same units/ms currency as this.speed, so the two stay comparable while
       tuning. steer=3 at speed 0.15 crosses the whole band in ~0.6s. */
    const dir = Math.sign(offOf(1) - offOf(0));
    scene.laneOff = Phaser.Math.Clamp(
      scene.laneOff + world * dir * SL.steer * scene.speed * dt, LO, HI);

    /* The top-heavy cost, in the SAME currency corner lean spends:
       corner is  sign * v^2 * CORNER_TILT_COEF(0.07) * taper * dt * TILT_SENS.
       Steer is the same shape with its own coefficient, so SL.lean reads
       directly against 0.07 — at lean 0.10 a hard steer costs ~1.4x a
       full-strength corner. Raw speed, not corneringSpeedSmooth: a steer input
       is a deliberate act, not a curve you were already committed to. */
    scene.tilt += world * scene.speed * scene.speed * SL.lean * dt * TILT_SENS;
  }

  function slPost(dt){
    if (!run.course) return;
    scene.hopYaw = slSteerA * slScreenSign() * 0.30;

    const s = scene.botS, c = run.course;
    if (scene.state !== 'play') { prevS = s; return; }

    if (!run.started && prevS < c.lineS && s >= c.lineS){
      run.started = true; run.t0 = performance.now();
      run.msg = 'GO'; run.msgT = performance.now();
    }
    if (run.started && !run.done) run.elapsed = (performance.now() - run.t0) / 1000;

    /* knock detection — the cone's own integrator owns pose/moving; we only
       read it, and only score the transition once. */
    for (const cone of run.cones){
      if (!cone.slKnocked && (cone.moving || cone.pose !== 'standing' || cone.phi > 0.02)){
        cone.slKnocked = true;
        run.pen += SL.pen; run.faults.push(`#${cone.slIndex + 1} knocked`);
        run.msg = `cone ${cone.slIndex + 1} — +${SL.pen.toFixed(1)}s`; run.msgT = performance.now();
      }
    }

    /* side judging at the moment botS crosses the cone */
    for (const cone of run.cones){
      if (cone.slJudged || !(prevS < cone.s && s >= cone.s)) continue;
      cone.slJudged = true;
      const want = (cone.row < CENTRE) ? 1 : -1;         // pass on the open side
      const got  = Math.sign(scene.laneOff - offOf(cone.row)) * Math.sign(offOf(1) - offOf(0));
      if (got === want){
        run.cleared++;
      } else {
        run.pen += SL.pen; run.faults.push(`#${cone.slIndex + 1} wrong side`);
        run.msg = `wrong side — +${SL.pen.toFixed(1)}s`; run.msgT = performance.now();
      }
    }

    if (!run.done && prevS < c.finishS && s >= c.finishS){
      run.done = true;
      const total = run.elapsed + run.pen;
      const clean = run.cleared === run.cones.length && run.pen === 0;
      run.msg = total <= SL.par
        ? (clean ? `CLEAN ${total.toFixed(2)}s — TROPHY` : `PASS ${total.toFixed(2)}s`)
        : `OVER PAR ${total.toFixed(2)}s`;
      run.msgT = performance.now();
    }
    prevS = s;
  }

  const origUpdate = scene.update.bind(scene);
  const origHop    = scene.hop.bind(scene);
  scene.update = (time, delta) => {
    const dt = Math.min(delta, 34);
    try { slPre(dt); } catch(e){ console.log('slPre', e); }
    origUpdate(time, delta);
    try { slPost(dt); } catch(e){ console.log('slPost', e); }
  };
  scene.hop = () => {};                    // lane hops are off — steering replaces them
  scene._slRestore = () => { scene.update = origUpdate; scene.hop = origHop; delete scene._slRestore; };

  /* ---------- input: drag x = steer, hold = throttle, arrows on desktop ---------- */
  const canvas = scene.game.canvas;
  let downX = 0, dragging = false;
  const onDown = e => { downX = (e.touches ? e.touches[0].clientX : e.clientX); dragging = true; };
  const onMove = e => {
    if (!dragging) return;
    const x = (e.touches ? e.touches[0].clientX : e.clientX);
    slSteerIn = Phaser.Math.Clamp((x - downX) / (canvas.clientWidth * 0.22), -1, 1);
  };
  const onUp = () => { dragging = false; slSteerIn = 0; };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  const onKey = e => {
    const d = e.type === 'keydown' ? 1 : 0;
    if (e.key === 'ArrowLeft')  slSteerIn = -d;
    if (e.key === 'ArrowRight') slSteerIn =  d;
    if (e.key === 'ArrowUp')    scene.throttle = d ? 1 : 0;
    if (e.key === 'ArrowDown')  scene.throttle = d ? -1 : 0;
  };
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKey);

  /* =========================================================================
     PANEL
     ========================================================================= */
  const FIELDS = [
    { key:'n',     label:'cones',  min:4,   max:20,  step:1 },
    { key:'gap',   label:'gap',    min:1.2, max:4.0, step:0.05, build:1 },
    { key:'amp',   label:'amp',    min:0,   max:1.2, step:0.05, build:1 },
    { key:'steer', label:'steer',  min:0.5, max:8,   step:0.1 },
    { key:'lag',   label:'lag',    min:0.002, max:0.05, step:0.002 },
    { key:'lean',  label:'lean',   min:0,   max:0.40, step:0.01 },
    { key:'pen',   label:'penalty',min:0.5, max:5,   step:0.5 },
    { key:'par',   label:'par',    min:8,   max:60,  step:0.5 },
  ];

  const panel = document.createElement('div');
  panel.id = 'slPanel';
  panel.style.cssText = [
    'position:fixed','left:8px','right:8px','bottom:8px','z-index:99999',
    'background:#12141a','border:1px solid #2b2f38','border-radius:12px',
    'padding:10px 12px calc(10px + env(safe-area-inset-bottom))',
    'font:12px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace','color:#e8eaef',
    '-webkit-user-select:none','user-select:none',
  ].join(';');

  panel.innerHTML =
    `<div style="display:flex;align-items:baseline;gap:8px;margin-bottom:8px">
       <b style="color:#ff7a1a;letter-spacing:2px">CONE SLALOM</b>
       <span id="slClock" style="margin-left:auto;font-weight:700;font-variant-numeric:tabular-nums"></span>
     </div>
     <div id="slMsg" style="min-height:16px;margin-bottom:8px;color:#ffb04d"></div>` +
    FIELDS.map(f =>
      `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
         <span style="width:52px;color:#8f95a1">${f.label}</span>
         <input type="range" id="sl-${f.key}" min="${f.min}" max="${f.max}"
                step="${f.step}" style="flex:1;accent-color:#ff7a1a">
         <span id="slv-${f.key}" style="width:42px;text-align:right;
               font-variant-numeric:tabular-nums">0</span>
       </div>`).join('') +
    `<div style="display:flex;gap:8px;margin-top:8px">
       <button id="slRun"   style="flex:2">restart run</button>
       <button id="slBuild" style="flex:2">rebuild course</button>
       <button id="slReset" style="flex:1">reset</button>
       <button id="slOff"   style="flex:1">off</button>
     </div>
     <div style="display:flex;gap:8px;align-items:center;margin-top:8px">
       <code id="slPort" style="flex:1;background:#0e0d0c;border:1px solid #2b2f38;
             border-radius:7px;padding:7px 8px;color:#ff9c4d;overflow-x:auto;
             white-space:nowrap;-webkit-user-select:text;user-select:text"></code>
       <button id="slCopy" style="flex:0 0 62px">copy</button>
     </div>`;
  document.body.appendChild(panel);

  const portLine = () =>
    `const SL = { n:${SL.n}, gap:${(+SL.gap).toFixed(2)}, amp:${(+SL.amp).toFixed(2)}, ` +
    `lead:${SL.lead}, tail:${SL.tail}, steer:${(+SL.steer).toFixed(1)}, ` +
    `lag:${(+SL.lag).toFixed(3)}, lean:${(+SL.lean).toFixed(2)}, ` +
    `pen:${(+SL.pen).toFixed(1)}, par:${(+SL.par).toFixed(1)} };`;

  function syncUI(){
    for (const f of FIELDS){
      document.getElementById(`sl-${f.key}`).value = SL[f.key];
      document.getElementById(`slv-${f.key}`).textContent =
        (f.step < 1 ? (+SL[f.key]).toFixed(f.step < 0.01 ? 3 : 2) : SL[f.key]);
    }
    document.getElementById('slPort').textContent = portLine();
  }
  for (const f of FIELDS){
    document.getElementById(`sl-${f.key}`).addEventListener('input', e => {
      SL[f.key] = parseFloat(e.target.value);
      syncUI();
      if (f.build || f.key === 'n') slResetRun();
    });
  }
  document.getElementById('slRun').onclick   = () => slResetRun();
  document.getElementById('slBuild').onclick = () => slResetRun();
  document.getElementById('slReset').onclick = () => { Object.assign(SL, SL0); syncUI(); slResetRun(); };
  document.getElementById('slOff').onclick   = () => {
    scene._slRestore && scene._slRestore();
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('keyup', onKey);
    panel.remove();
  };
  document.getElementById('slCopy').onclick  = () => {
    navigator.clipboard?.writeText(portLine());
    document.getElementById('slCopy').textContent = 'ok';
    setTimeout(() => document.getElementById('slCopy').textContent = 'copy', 900);
  };

  /* live readout */
  setInterval(() => {
    const total = run.elapsed + run.pen;
    const col = run.done ? (total <= SL.par ? '#7fe08a' : '#ff6b6b') : '#e8eaef';
    const clk = document.getElementById('slClock');
    if (clk){
      clk.style.color = col;
      clk.textContent = `${total.toFixed(2)}s  ${run.cleared}/${SL.n}` +
                        (run.pen ? `  +${run.pen.toFixed(1)}` : '') +
                        `  par ${SL.par.toFixed(1)}`;
    }
    const m = document.getElementById('slMsg');
    if (m) m.textContent = (performance.now() - run.msgT < 2200) ? run.msg : '';
  }, 100);

  syncUI();
  slResetRun();
  console.log('cone slalom armed —', portLine());
})();
