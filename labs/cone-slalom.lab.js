/* ===========================================================================
   CONE SLALOM — paste into the Lab console in labs/_bench.html
   ===========================================================================
   Bench code, not a standalone lab: labs/README.md is explicit that new work
   belongs in the bench, because the bench compiles inside the game's own realm.
   This closes over T2/laneOffset/CONE_HIT directly, exactly as game/index.html
   does, so the port is a copy rather than a translation.

   WHAT IS BEING PROTOTYPED
   The "Cone Slalom Challenge" side mission behind the slalom-master trophy
   (reward skin: cone-dodger). Both have been declared in the profile/trophy
   tables since 2026-07-29 with status "available" and a note that no course was
   built. This is that course.

   ---------------------------------------------------------------------------
   REVISION: THE ANALOG STEER IS GONE
   ---------------------------------------------------------------------------
   v1 replaced lane hops with a free analog steer — a continuous integrator
   written into laneOff every frame. It worked, and on-device it read as SLOPPY,
   which is the correct verdict: the whole game is built around a discrete
   4-row band. hop() has an eased 480ms smoothstep, a nose-steer yaw, a
   speed-scaled stability cost (hopKick), and a hard refusal to fire mid-arc.
   An analog integrator laid over that is a second, worse steering model
   competing with a tuned one, and it inherits none of its feel.

   So the slalom now uses the game's steering UNTOUCHED. No input hooks, no
   throttle override, no laneOff writes, no hop() stub. Swipe up/down to hop,
   hold to roll — identical to a delivery. The lab only builds the course and
   judges it.

   WHAT THAT CHANGES IN THE COURSE
   Cones must sit on INTEGER rows, because the lanes the player can actually
   occupy are integer rows. v1 put them at 1.5 +/- amp, which meant the gate and
   the lane disagreed about where "past the cone" was. Cones now alternate
   between rowA and rowB, and the side you must pass on is simply the side the
   OTHER row is on — one fact, derived, not a second rule that can drift.

   With rowA=1 / rowB=2 the course is genuinely a weave: a cone on row 1 can
   only be cleared from rows 2-3, a cone on row 2 only from rows 0-1, so parking
   on one edge of the band fails every other gate.

   TIMING NOTE
   A hop takes 480ms. At speed ~0.15 units/ms that is ~72 units of travel, and
   gap 2.10 is 193 units — comfortably one hop per gate with room to settle.
   Drop gap below ~1.4 and the course becomes unclearable rather than hard,
   which is a different thing and not the good kind.

   TO PORT: tap `copy` for the tuned constant line, hand it back, and it gets
   written into an SL block in game/index.html and synced to game-logic.js.
   =========================================================================== */

(() => {
  const scene = game.scene.scenes.find(s => s.route);
  if (!scene) { console.log('no scene with a route yet'); return; }

  document.getElementById('slPanel')?.remove();
  if (scene._slRestore) scene._slRestore();

  /* ---------- tunables — every one of these is a chip ---------- */
  const SL = {
    n:    12,     // cones in the course
    gap:  2.10,   // along-route spacing between cones, in T2
    rowA: 1,      // even cones sit here
    rowB: 2,      // odd cones sit here
    lead: 6.0,    // run-up before the first cone, in T2
    tail: 3.0,    // run-out after the last cone, in T2
    pen:  2.0,    // seconds added per knocked cone / missed side
    par:  26.0,   // seconds to beat
  };
  const SL0 = { ...SL };

  const offOf = row => laneOffset(row);
  /* laneOff delta -> row-space delta is one sign (ROBOT_SIDE), and this is the
     ONLY place world offsets get converted back to rows. */
  const rowDir = Math.sign(offOf(1) - offOf(0));

  const run = {
    course: null, cones: [], started: false, done: false,
    t0: 0, elapsed: 0, pen: 0, cleared: 0, faults: [], msg: '', msgT: 0,
  };

  /* =========================================================================
     COURSE
     ========================================================================= */
  function slFindLeg(){
    const need = (SL.lead + (SL.n - 1) * SL.gap + SL.tail) * T2;
    const segs = scene.route.segs.filter(g => g.type === 'line' && (g.s1 - g.s0) >= need);
    if (!segs.length) return null;
    const ahead = segs.filter(g => g.s1 > scene.botS);
    return ahead.length ? ahead[0]
                        : segs.sort((a, b) => (b.s1 - b.s0) - (a.s1 - a.s0))[0];
  }

  function slBuildCourse(){
    const leg = slFindLeg();
    if (!leg){
      run.msg = 'no straight long enough — drop cones or gap';
      run.msgT = performance.now();
      return null;
    }

    const startS = Math.round(leg.s0 + SL.lead * T2);
    const course = {
      leg, startS,
      lastS:  Math.round(startS + (SL.n - 1) * SL.gap * T2),
      lineS:  Math.round(startS - SL.gap * T2 * 0.5),
      spawnS: Math.round(startS - SL.lead * T2),
    };
    course.finishS = Math.round(course.lastS + SL.tail * T2);

    /* Clear the whole leg — run-up and run-out included, every row. Same
       reasoning hjBuildCourse gives for the hydrant lane: you would weave
       twelve cones clean and then land on a crack. */
    const from = course.spawnS - T2, to = course.finishS + T2;
    scene.route.hazards = scene.route.hazards.filter(h =>
      !h.slRole && !(h.s >= from && h.s <= to));
    scene.route.props = (scene.route.props || []).filter(pr =>
      !(pr.s >= from && pr.s <= to));

    /* Cone hazard objects mirror the generator's own cone branch field for
       field (phi/phase/angVel/moving/pose/slide/slideVel), so the existing
       rigid pivot-fall integrator and hit code drive them with no special case.
       Always standing — a pre-knocked cone in a slalom is a free gate. */
    for (let i = 0; i < SL.n; i++){
      const row   = (i % 2 === 0) ? SL.rowA : SL.rowB;
      const other = (i % 2 === 0) ? SL.rowB : SL.rowA;
      scene.route.hazards.push({
        type:'cone', s: Math.round(startS + i * SL.gap * T2), row, f:0, hit:false,
        phi:0, phase:1, angVel:0, moving:false, pose:'standing',
        slide:0, slideVel:0,
        slRole:'gate', slIndex:i,
        slWant: Math.sign(other - row),      // pass on the side the other row is on
        slKnocked:false, slJudged:false,
      });
    }
    return course;
  }

  function slResetRun(){
    run.course = slBuildCourse();
    run.cones  = scene.route.hazards.filter(h => h.slRole === 'gate');
    run.started = false; run.done = false;
    run.elapsed = 0; run.pen = 0; run.cleared = 0; run.faults = [];
    if (!run.course) return;
    run.msg = 'roll to the line'; run.msgT = performance.now();

    /* Start on rowA — the row the FIRST gate does not want. Starting on the
       clear side would make gate one free, and a slalom whose opening gate is
       free teaches the wrong first move. */
    scene.botRow = SL.rowA;
    scene.laneOff = offOf(scene.botRow);
    scene.botS = run.course.spawnS;
    scene.hopAnim = null; scene.hopYaw = 0; scene.hopKick = 0;
    scene.speed = 0; scene.tilt = 0; scene.roll = 0;
    scene.state = 'play'; scene.tipT = 0; scene.damage = 0;
    const sp = scene.posAt(scene.botS), hdg = scene.headingAt(scene.botS);
    scene.botX = sp.x + (-Math.sin(hdg)) * scene.laneOff;
    scene.botY = sp.y + Math.cos(hdg) * scene.laneOff;
    scene.camX = scene.botX; scene.camY = scene.botY;
    scene.drawAngle = hdg;
    prevS = scene.botS;
  }

  /* =========================================================================
     JUDGING
     Read-only. Nothing here writes to the robot — the game drives itself.

     Hooked on the scene's event bus rather than by reassigning scene.update:
     Phaser 3's Systems.init caches the scene's update method into
     sys.sceneUpdate at boot and step() calls the CACHED reference, so a
     monkeypatched scene.update is never called at all. That cost a whole
     on-device session in v1.
     ========================================================================= */
  let prevS = scene.botS;

  function slJudge(){
    const c = run.course; if (!c) return;
    const s = scene.botS;
    if (scene.state !== 'play'){ prevS = s; return; }

    if (!run.started && prevS < c.lineS && s >= c.lineS){
      run.started = true; run.t0 = performance.now();
      run.msg = 'GO'; run.msgT = performance.now();
    }
    if (run.started && !run.done) run.elapsed = (performance.now() - run.t0) / 1000;

    /* Knocks. The cone's own integrator owns pose/phi/moving; this only reads
       them, and only scores the transition once. */
    for (const cone of run.cones){
      if (!cone.slKnocked && (cone.moving || cone.pose !== 'standing' || cone.phi > 0.02)){
        cone.slKnocked = true;
        run.pen += SL.pen; run.faults.push(`#${cone.slIndex + 1} knocked`);
        run.msg = `cone ${cone.slIndex + 1} — +${SL.pen.toFixed(1)}s`;
        run.msgT = performance.now();
      }
    }

    /* Side, judged at the frame botS crosses the cone. laneOff is mid-hop for
       part of every gate, which is correct: commit early or clip the gate. */
    for (const cone of run.cones){
      if (cone.slJudged || !(prevS < cone.s && s >= cone.s)) continue;
      cone.slJudged = true;
      const got = Math.sign(scene.laneOff - offOf(cone.row)) * rowDir;
      if (got === cone.slWant){
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

  const onPost = () => { try { slJudge(); } catch(e){ console.log('slJudge', e); } };
  scene.events.on('postupdate', onPost);
  scene._slRestore = () => { scene.events.off('postupdate', onPost); delete scene._slRestore; };

  /* =========================================================================
     PANEL — phone first
       DOCK TOP     — never under the steering thumb.
       COLLAPSE     — during a run it is a single strip: clock, cones, message.
       ONE CONTROL  — a chip row picks WHICH value the single big slider edits.
     ========================================================================= */
  const FIELDS = [
    { key:'n',    label:'cones', min:4,   max:20,  step:1    },
    { key:'gap',  label:'gap',   min:1.4, max:4.0, step:0.05 },
    { key:'rowA', label:'row A', min:0,   max:3,   step:1    },
    { key:'rowB', label:'row B', min:0,   max:3,   step:1    },
    { key:'lead', label:'lead',  min:2,   max:12,  step:0.5  },
    { key:'tail', label:'tail',  min:1,   max:8,   step:0.5  },
    { key:'pen',  label:'pen',   min:0.5, max:5,   step:0.5  },
    { key:'par',  label:'par',   min:8,   max:60,  step:0.5  },
  ];
  const fieldOf = k => FIELDS.find(f => f.key === k);
  const fmt = f => f.step >= 1 ? String(SL[f.key]) : (+SL[f.key]).toFixed(2);

  let sel = 'gap', open = false;

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
    `<div style="display:flex;align-items:center;gap:10px">
       <b style="color:#ff7a1a;letter-spacing:2px;flex:0 0 auto">SLALOM</b>
       <span id="slClock" style="flex:1 1 auto;font-weight:700;
             font-variant-numeric:tabular-nums;text-align:right"></span>
       <button id="slTog" style="${BTN}flex:0 0 44px">&#9662;</button>
     </div>
     <div id="slMsg" style="min-height:15px;margin-top:4px;color:#ffb04d;
          text-align:center"></div>
     <div id="slBody" style="display:none;margin-top:8px">
       <div id="slChips" style="display:flex;flex-wrap:wrap;gap:6px"></div>
       <div style="display:flex;align-items:center;gap:8px;margin-top:10px">
         <button id="slDn" style="${BTN}flex:0 0 44px">&minus;</button>
         <input type="range" id="slSlider" style="flex:1 1 auto;accent-color:#ff7a1a;height:38px">
         <button id="slUp" style="${BTN}flex:0 0 44px">+</button>
       </div>
       <div id="slNow" style="text-align:center;margin-top:2px;color:#ff9c4d;
            font-variant-numeric:tabular-nums"></div>
       <div style="display:flex;gap:6px;margin-top:10px">
         <button id="slRun"   style="${BTN}flex:2">restart</button>
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
    `const SL = { n:${SL.n}, gap:${(+SL.gap).toFixed(2)}, rowA:${SL.rowA}, rowB:${SL.rowB}, ` +
    `lead:${(+SL.lead).toFixed(1)}, tail:${(+SL.tail).toFixed(1)}, ` +
    `pen:${(+SL.pen).toFixed(1)}, par:${(+SL.par).toFixed(1)} };`;

  function drawChips(){
    $('slChips').innerHTML = FIELDS.map(f =>
      `<button data-k="${f.key}" style="${BTN}flex:1 1 22%;min-width:76px;padding:0 6px;` +
      `${f.key === sel ? 'border-color:#ff7a1a;color:#ff9c4d;' : ''}">` +
      `<span style="color:#8f95a1">${f.label}</span> ${fmt(f)}</button>`).join('');
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

  /* rebuild on release, not while dragging — the course should not thrash
     under the thumb that is setting it */
  function setVal(v, rebuild){
    const f = fieldOf(sel);
    SL[f.key] = Phaser.Math.Clamp(Math.round(v / f.step) * f.step, f.min, f.max);
    syncUI();
    if (rebuild) slResetRun();
  }

  $('slTog').onclick = () => {
    open = !open;
    $('slBody').style.display = open ? 'block' : 'none';
    $('slTog').innerHTML = open ? '&#9652;' : '&#9662;';
    if (open) syncUI();
  };
  $('slSlider').addEventListener('input',  e => setVal(parseFloat(e.target.value), 0));
  $('slSlider').addEventListener('change', e => setVal(parseFloat(e.target.value), 1));
  $('slDn').onclick = () => setVal(SL[sel] - fieldOf(sel).step, 1);
  $('slUp').onclick = () => setVal(SL[sel] + fieldOf(sel).step, 1);

  $('slRun').onclick   = () => slResetRun();
  $('slReset').onclick = () => { Object.assign(SL, SL0); syncUI(); slResetRun(); };
  $('slCopy').onclick  = () => {
    navigator.clipboard?.writeText(portLine());
    $('slCopy').textContent = 'ok';
    setTimeout(() => $('slCopy').textContent = 'copy', 900);
  };
  $('slOff').onclick = () => {
    scene._slRestore && scene._slRestore();
    clearInterval(tick);
    panel.remove();
  };

  const tick = setInterval(() => {
    const total = run.elapsed + run.pen, clk = $('slClock');
    if (clk){
      clk.style.color = run.done ? (total <= SL.par ? '#7fe08a' : '#ff6b6b') : '#e8eaef';
      clk.textContent = `${total.toFixed(2)}s  ${run.cleared}/${SL.n}` +
                        (run.pen ? `  +${run.pen.toFixed(1)}` : '') +
                        `  par ${SL.par.toFixed(0)}`;
    }
    const m = $('slMsg');
    if (m){
      m.textContent = (performance.now() - run.msgT < 2200) ? run.msg
        : `row ${scene.botRow}   v ${scene.speed.toFixed(3)}` +
          `   left ${run.cones.filter(c => !c.slJudged).length}`;
    }
  }, 100);

  syncUI();
  slResetRun();
  console.log('cone slalom armed —', portLine());
})();
