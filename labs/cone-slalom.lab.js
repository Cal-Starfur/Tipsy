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
  let slSteerIn = 0, slSteerA = 0, slThrottle = 0, prevS = scene.botS;

  function slPre(dt){
    if (scene.state !== 'play' || !run.course) return;

    /* THROTTLE OWNERSHIP.
       bindInput() reads throttle off the pointer's x half (right = go, left =
       brake) and then ZEROES it the moment a drag passes the hop threshold.
       Both behaviours are wrong for a one-thumb steering game: a drag left from
       the right half became a brake, and any decisive steer killed the throttle
       outright. Since steer distance scales with speed, that reads on-device as
       "the steering does not work" even once the frame hook is fixed.
       One writer, every frame, ours. */
    scene.throttle = slThrottle;

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

  /* ---------- HOOKING THE FRAME ----------
     NOT by reassigning scene.update. Phaser 3's Systems.init caches the scene's
     update method into sys.sceneUpdate at boot, and step() calls the CACHED
     reference:

         this.sceneUpdate.call(this.scene, time, delta);

     so a monkeypatched scene.update is simply never called. That cost a whole
     on-device session: the panel worked, the sliders worked, and the robot
     would not steer, because slPre had never run once.

     The scene's own event bus is the supported seam and it brackets sceneUpdate
     exactly where this needs to sit — PRE_UPDATE writes laneOff before the
     hazard pass reads it, POST_UPDATE writes hopYaw after update()'s else-branch
     has decayed it to zero. */
  const origHop = scene.hop.bind(scene);
  const onPre  = (time, delta) => { try { slPre(Math.min(delta, 34)); }  catch(e){ console.log('slPre', e); } };
  const onPost = (time, delta) => { try { slPost(Math.min(delta, 34)); } catch(e){ console.log('slPost', e); } };
  scene.events.on('preupdate',  onPre);
  scene.events.on('postupdate', onPost);
  scene.hop = () => {};                    // lane hops are off — steering replaces them
  scene._slRestore = () => {
    scene.events.off('preupdate',  onPre);
    scene.events.off('postupdate', onPost);
    scene.hop = origHop;
    delete scene._slRestore;
  };

  /* ---------- input: drag x = steer, hold = throttle, arrows on desktop ---------- */
  const canvas = scene.game.canvas;
  let downX = 0, dragging = false;
  const onDown = e => { downX = e.clientX; dragging = true; slThrottle = 1; };
  const onMove = e => {
    if (!dragging) return;
    /* Full-lock at ~22% of the screen width, so the thumb never has to leave
       the pad it started on. The anchor is where you pressed, not screen
       centre — steering that depends on absolute finger position is unusable
       when the same finger is also holding the throttle. */
    slSteerIn = Phaser.Math.Clamp((e.clientX - downX) / (canvas.clientWidth * 0.22), -1, 1);
  };
  const onUp = () => { dragging = false; slSteerIn = 0; slThrottle = 0; };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  const onKey = e => {
    const d = e.type === 'keydown' ? 1 : 0;
    if (e.key === 'ArrowLeft')  slSteerIn = -d;
    if (e.key === 'ArrowRight') slSteerIn =  d;
    if (e.key === 'ArrowUp')    slThrottle = d ? 1 : 0;
    if (e.key === 'ArrowDown')  slThrottle = d ? -1 : 0;
  };
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKey);

  /* =========================================================================
     PANEL — phone first

     The first cut was a desktop layout wearing a phone's clothes: eight
     simultaneous sliders docked to the BOTTOM of the screen, over the exact
     region a drag-to-steer game needs. On-device it covered the canvas and ate
     the steering touches, which is the one interaction this lab exists to test.

     Three rules now:
       DOCK TOP     — never under the steering thumb.
       COLLAPSE     — during a run it is a single strip: clock, cones, message.
       ONE CONTROL  — a chip row picks WHICH value the single big slider edits,
                      so there is exactly one thumb-sized target at a time.
     ========================================================================= */
  const FIELDS = [
    { key:'n',     label:'cones',  min:4,     max:20,   step:1,    build:1 },
    { key:'gap',   label:'gap',    min:1.2,   max:4.0,  step:0.05, build:1 },
    { key:'amp',   label:'amp',    min:0,     max:1.2,  step:0.05, build:1 },
    { key:'steer', label:'steer',  min:0.5,   max:8,    step:0.1  },
    { key:'lag',   label:'lag',    min:0.002, max:0.05, step:0.002 },
    { key:'lean',  label:'lean',   min:0,     max:0.40, step:0.01 },
    { key:'pen',   label:'pen',    min:0.5,   max:5,    step:0.5  },
    { key:'par',   label:'par',    min:8,     max:60,   step:0.5  },
  ];
  const fieldOf = k => FIELDS.find(f => f.key === k);
  const fmt = f => f.step >= 1 ? String(SL[f.key])
                 : (+SL[f.key]).toFixed(f.step < 0.01 ? 3 : 2);

  let sel = 'steer', open = false;

  /* the drag-steer surface must not compete with Safari's scroll/zoom */
  canvas.style.touchAction = 'none';

  const panel = document.createElement('div');
  panel.id = 'slPanel';
  panel.style.cssText = [
    'position:fixed','left:0','right:0','top:0','z-index:99999',
    'background:rgba(14,16,21,0.94)','border-bottom:1px solid #2b2f38',
    'padding:calc(6px + env(safe-area-inset-top)) 10px 8px',
    'font:12px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace','color:#e8eaef',
    '-webkit-user-select:none','user-select:none','touch-action:manipulation',
  ].join(';');

  const BTN = 'font:inherit;color:#e8eaef;background:#232220;border:1px solid #2b2f38;' +
              'border-radius:7px;min-height:38px;padding:0 10px;';

  panel.innerHTML =
    `<div id="slBar" style="display:flex;align-items:center;gap:10px">
       <b style="color:#ff7a1a;letter-spacing:2px;flex:0 0 auto">SLALOM</b>
       <span id="slClock" style="flex:1 1 auto;font-weight:700;
             font-variant-numeric:tabular-nums;text-align:right"></span>
       <button id="slTog" style="${BTN}flex:0 0 44px">▾</button>
     </div>
     <div id="slMsg" style="min-height:15px;margin-top:4px;color:#ffb04d;
          text-align:center"></div>
     <div id="slBody" style="display:none;margin-top:8px">
       <div id="slChips" style="display:flex;flex-wrap:wrap;gap:6px"></div>
       <div style="display:flex;align-items:center;gap:8px;margin-top:10px">
         <button id="slDn" style="${BTN}flex:0 0 44px">−</button>
         <input type="range" id="slSlider" style="flex:1 1 auto;accent-color:#ff7a1a;
                height:38px">
         <button id="slUp" style="${BTN}flex:0 0 44px">+</button>
       </div>
       <div id="slNow" style="text-align:center;margin-top:2px;color:#ff9c4d;
            font-variant-numeric:tabular-nums"></div>
       <div style="display:flex;gap:6px;margin-top:10px">
         <button id="slRun"   style="${BTN}flex:2">restart</button>
         <button id="slBuild" style="${BTN}flex:2">rebuild</button>
         <button id="slReset" style="${BTN}flex:1">reset</button>
         <button id="slOff"   style="${BTN}flex:1">off</button>
       </div>
       <div style="display:flex;gap:6px;align-items:center;margin-top:8px">
         <code id="slPort" style="flex:1 1 auto;background:#0e0d0c;
               border:1px solid #2b2f38;border-radius:7px;padding:8px;
               color:#ff9c4d;overflow-x:auto;white-space:nowrap;
               -webkit-user-select:text;user-select:text"></code>
         <button id="slCopy" style="${BTN}flex:0 0 62px">copy</button>
       </div>
     </div>`;
  document.body.appendChild(panel);

  const $ = id => document.getElementById(id);

  const portLine = () =>
    `const SL = { n:${SL.n}, gap:${(+SL.gap).toFixed(2)}, amp:${(+SL.amp).toFixed(2)}, ` +
    `lead:${SL.lead}, tail:${SL.tail}, steer:${(+SL.steer).toFixed(1)}, ` +
    `lag:${(+SL.lag).toFixed(3)}, lean:${(+SL.lean).toFixed(2)}, ` +
    `pen:${(+SL.pen).toFixed(1)}, par:${(+SL.par).toFixed(1)} };`;

  function drawChips(){
    $('slChips').innerHTML = FIELDS.map(f =>
      `<button data-k="${f.key}" style="${BTN}flex:1 1 22%;min-width:74px;
        padding:0 6px;${f.key === sel ? 'border-color:#ff7a1a;color:#ff9c4d;' : ''}">
        <span style="color:#8f95a1">${f.label}</span> ${fmt(f)}
       </button>`).join('');
    $('slChips').querySelectorAll('button').forEach(b => {
      b.onclick = () => { sel = b.dataset.k; syncUI(); };
    });
  }

  function syncUI(){
    const f = fieldOf(sel), sl = $('slSlider');
    sl.min = f.min; sl.max = f.max; sl.step = f.step; sl.value = SL[f.key];
    $('slNow').textContent = `${f.label}  ${fmt(f)}`;
    $('slPort').textContent = portLine();
    drawChips();
  }

  function setVal(v, rebuild){
    const f = fieldOf(sel);
    SL[f.key] = Phaser.Math.Clamp(
      Math.round(v / f.step) * f.step, f.min, f.max);
    syncUI();
    if (rebuild && f.build) slResetRun();
  }

  $('slTog').onclick = () => {
    open = !open;
    $('slBody').style.display = open ? 'block' : 'none';
    $('slTog').textContent = open ? '▴' : '▾';
    if (open) syncUI();
  };
  $('slSlider').addEventListener('input', e => setVal(parseFloat(e.target.value), 0));
  $('slSlider').addEventListener('change', e => setVal(parseFloat(e.target.value), 1));
  $('slDn').onclick = () => setVal(SL[sel] - fieldOf(sel).step, 1);
  $('slUp').onclick = () => setVal(SL[sel] + fieldOf(sel).step, 1);

  $('slRun').onclick   = () => slResetRun();
  $('slBuild').onclick = () => slResetRun();
  $('slReset').onclick = () => { Object.assign(SL, SL0); syncUI(); slResetRun(); };
  $('slCopy').onclick  = () => {
    navigator.clipboard?.writeText(portLine());
    $('slCopy').textContent = 'ok';
    setTimeout(() => $('slCopy').textContent = 'copy', 900);
  };
  $('slOff').onclick = () => {
    scene._slRestore && scene._slRestore();
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('keyup', onKey);
    canvas.style.touchAction = '';
    clearInterval(tick);
    panel.remove();
  };

  /* live readout — the strip is the whole HUD while collapsed */
  const tick = setInterval(() => {
    const total = run.elapsed + run.pen;
    const clk = $('slClock');
    if (clk){
      clk.style.color = run.done ? (total <= SL.par ? '#7fe08a' : '#ff6b6b') : '#e8eaef';
      clk.textContent = `${total.toFixed(2)}s  ${run.cleared}/${SL.n}` +
                        (run.pen ? `  +${run.pen.toFixed(1)}` : '') +
                        `  par ${SL.par.toFixed(0)}`;
    }
    const m = $('slMsg');
    if (m){
      /* When the input is dead there is nothing on screen to say so. This is
         the cheapest possible answer to "am I even reaching the steer?" —
         raw input, smoothed input, speed, live lane offset. */
      m.textContent = (performance.now() - run.msgT < 2200) ? run.msg
        : `steer ${slSteerA >= 0 ? '+' : ''}${slSteerA.toFixed(2)}` +
          `   thr ${slThrottle}   v ${scene.speed.toFixed(3)}` +
          `   row ${(((scene.laneOff - offOf(0)) / (offOf(1) - offOf(0)))).toFixed(2)}`;
    }
  }, 100);

  syncUI();
  slResetRun();
  console.log('cone slalom armed —', portLine());
})();
