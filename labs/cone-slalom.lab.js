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

   ---------------------------------------------------------------------------
   v3: A TURN, A HILL, AND AN ACTUAL ENDING
   ---------------------------------------------------------------------------
   THE TURN IS NOT OPTIONAL GEOMETRY, IT IS FORCED BY hop().
   hop() refuses outright while segAt(botS).type === "arc" — a hop's lateral
   swing is up to 276 units, near the turn's own radius, and firing one mid-arc
   hooks the robot's real path. So cones CANNOT sit on the turn: a gate you are
   physically unable to answer is a bug wearing a difficulty costume.

   That constraint is the design. The course is line -> arc -> line: a cone
   group, then a turn you must enter already in the right lane, then a second
   group. The turn becomes a commit-your-lane beat between two weaves, which is
   the same rule real driving has and the same rule hop()'s comment cites.

   THE HILL IS REAL PHYSICS, NOT DRESSING.
   route.tiles is a virtual grade profile — consumed as SLOPE only, never as
   geometry (groundZ stays hard-zero). groundSlope() feeds pitch AND the speed
   term in update(), so a downhill genuinely runs the robot faster than he wants
   to go. That is exactly the pressure a slalom needs: the cost of the weave is
   paid in a lane change you have less time to make.

   Costa Palma already has hills — HOODS carries a per-hood `hill` knob and The
   Bluffs (index 7) is the 1.0, tuned to top out near a 5% grade. Nothing needed
   building. The lab reloads the route with hoodIndex 7, the same door
   loadRoute() already opens for the hydrant challenge, then picks the corridor
   with the steepest net DESCENT rather than merely the first straight that fit.
   GRADE_BIAS ties downhill to headings f=0/f=1, and GOOD_LEG_HEADING is
   [f0, f3], so f=0 legs tend to be both well-dressed and downhill.

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
    n:    400,    // CAP on gates; the course fills the whole chain up to this
    legs: 12,     // target legs to find — the seek stops once a route has this many
    gap:  2.10,   // along-route spacing between cones, in T2
    rowA: 1,      // even cones sit here
    rowB: 2,      // odd cones sit here
    lead: 6.0,    // run-up before the first cone, in T2
    turn: 3.0,    // clearance either side of the arc — no cones on the turn
    tail: 3.0,    // run-out after the last cone, in T2
    pen:  2.0,    // seconds added per knocked cone / missed side
    par:  52.0,   // seconds to beat
  };
  const HOOD_BLUFFS = 7;         // HOODS[7] — hill 1.0, the steepest in the city

  /* GATE FLAGS, in the ski-slalom convention: a coloured band tells you which
     side of the cone you owe it.

     The colour has to be decided in SCREEN space, not row space. slWant lives
     in rows, and the row axis flips its screen direction with heading — that is
     the whole reason hop() computes rowPlusDown instead of mapping a swipe
     straight to a row delta. The course turns a corner halfway through, so a
     row-space colour rule would silently invert at the arc and every flag on
     leg 2 would lie. Colour is therefore assigned per cone, through the SAME
     flip hop() uses, at the cone's own heading.

       RED  — pass ABOVE it on screen (swipe up)
       BLUE — pass BELOW it on screen (swipe down)

     Swipe direction is exactly the control the player holds, so the flag names
     the input rather than a fact about the world they have to translate. */
  const GATE_RED  = { ...CONE, band: 7, band_c: 0xe03131 };
  const GATE_BLUE = { ...CONE, band: 7, band_c: 0x2f6fd0 };
  /* chute cones are walls, not gates — white band, no side to choose */
  const GATE_WALL = { ...CONE, band: 5, band_c: 0xf4f5f7 };

  /* rowPlusDown at s, lifted from hop() — screen-down is +1 row when true */
  const rowPlusDownAt = s => {
    const hdg = scene.headingAt(s);
    const fq  = ((Math.round(hdg / (Math.PI/2)) % 4) + 4) % 4;
    const rv  = DIRV[(fq + 1) % 4];
    return (rv.x + rv.y) * (offOf(1) - offOf(0)) > 0;
  };
  const SL0 = { ...SL };

  const offOf = row => laneOffset(row);
  /* laneOff delta -> row-space delta is one sign (ROBOT_SIDE), and this is the
     ONLY place world offsets get converted back to rows. */
  const rowDir = Math.sign(offOf(1) - offOf(0));

  const origMode = scene.mode;   // restored by slOff

  const run = {
    course: null, cones: [], started: false, done: false,
    t0: 0, elapsed: 0, pen: 0, cleared: 0, faults: [], msg: '', msgT: 0,
    phase: 'idle', countT0: 0, gates: [],
  };

  /* =========================================================================
     COURSE
     ========================================================================= */

  /* Net grade over an s-range, in rise/run. Negative is downhill.
     elevAt() is the scene's own sampler over route.tiles, so this asks the
     grade question through the exact call the physics asks it through — not a
     parallel copy of the same math over the tile array. */
  /* elevAt, but over ANY route object rather than the loaded one — the search
     has to grade candidate routes before committing to loading them. Same
     interpolation the scene's own elevAt does over route.tiles. */
  const elevOf = (route, s) => {
    const t = route.tiles, fx = s / (TILE*2), i = Math.floor(fx);
    if (i < 0) return t[0];
    if (i >= t.length - 1) return t[t.length - 1];
    return Phaser.Math.Linear(t[i], t[i+1], fx - i);
  };
  const gradeOver = (route, s0, s1) =>
    (s1 - s0) > 0 ? (elevOf(route, s1) - elevOf(route, s0)) / (s1 - s0) : 0;

  /* Find every line -> arc -> line corridor long enough to hold both cone
     groups, and return the STEEPEST DESCENT among them. Scored on the two
     straights only: the arc's own grade is irrelevant because no cone sits on
     it, and including it would let a plunging turn disguise two flat weaves. */
  /* HEADING IS NOT A PREFERENCE HERE, IT IS THE WHOLE EFFECT.
     W() puts screen-y at (x + y)*0.5 - z, so travelling +x/+y — headings f=0
     and f=1 — increases screen-y: you move DOWN the screen, which reads as
     coming toward the viewer, and therefore reads as descending. f=2/f=3 move
     you up-screen and read as a climb no matter what the grade number says.

     generateRoute already knows this — GRADE_BIAS exists precisely so real
     elevation agrees with the camera's own depth cue rather than being
     coin-flip noise, and it subtracts a term in (x + y). The corridor picker
     simply was not honouring it, so a legitimately steep descent could be laid
     down a heading that reads as uphill, and no amount of grade fixed that.

     Both legs must therefore be f=0 or f=1. They are perpendicular, so
     f=0 -> turn -> f=1 is a legal corridor and the descent reads on both sides
     of the turn.

     TENSION WORTH KNOWING: GOOD_LEG_HEADING is [f0, f3], so f=1 is not a
     "good" leg for storefront dressing and the block-wrap cutaway. Reading as
     downhill wins — a slalom that looks like a climb is broken, a slalom with
     plainer buildings on one leg is not. */
  const DOWNHILL_F = [0, 1];
  let lastDiag = {};

  /* =========================================================================
     THE CHAIN — as long as the route will hold f=0/f=1
     -------------------------------------------------------------------------
     One line -> arc -> line is two sides of a block, and that was the ceiling
     because the search only ever looked at a triple. The real limit is
     different and worth stating plainly:

       A route that keeps turning the same way runs f0 -> f1 -> f2 -> f3, and
       only f0/f1 read as descending. So a long course needs the route to
       ZIGZAG — f0 -> f1 -> f0 -> f1 — which on this camera is a staircase
       running diagonally down-screen. How far a given route holds that is
       luck, so the seek hunts for the LONGEST such chain across many dates
       instead of taking the first corner that fits.

     A chain is a maximal run of consecutive segments that starts and ends on a
     line, where every LINE is f=0 or f=1. Arcs pass through untested: nothing
     is judged on them, they carry the chute.
     ========================================================================= */
  function slFindChain(route){
    const segs = route.segs;
    const ok = g => g.type !== 'line' || DOWNHILL_F.includes(g.f);
    const chains = [];
    let cur = [];
    for (const g of segs){
      if (ok(g)){ cur.push(g); continue; }
      if (cur.length) chains.push(cur);
      cur = [];
    }
    if (cur.length) chains.push(cur);

    let best = null;
    for (let c of chains){
      /* trim to line ... line — a chain ending on an arc has a turn leading
         nowhere, and gates cannot live on it */
      while (c.length && c[0].type !== 'line') c = c.slice(1);
      while (c.length && c[c.length-1].type !== 'line') c = c.slice(0, -1);
      const lines = c.filter(g => g.type === 'line');
      if (lines.length < 1) continue;

      const span = lines.reduce((m, g) => m + (g.s1 - g.s0), 0);
      const need = (SL.lead + 4 * SL.gap + SL.tail) * T2;
      if (span < need) continue;

      const s0 = c[0].s0, s1 = c[c.length-1].s1;
      const cand = { segs: c, lines, span, nLines: lines.length,
                     score: gradeOver(route, s0, s1), kind: 'chain' };
      if (!best || cand.span > best.span) best = cand;
    }
    lastDiag = { chains: chains.length, best: best ? best.nLines : 0 };
    return best;
  }

  function slBuildCourse(){
    const ch = slFindChain(scene.route);
    if (!ch){
      run.fail = 'no f=0/f=1 chain long enough on this route — reseek';
      scene.route.hazards = scene.route.hazards.filter(h => !h.slRole);
      run.cones = []; run.gates = [];
      return null;
    }

    /* SPAWN ON ACTUAL SIDEWALK — asked, not inferred. grid.classify is
       classifyAt over the same grid.edges the world is built from, so this
       tests the exact world point the robot will occupy at his lane offset
       rather than modelling where the walk ought to be. */
    const first = ch.lines[0];
    const walkAt = (at, row) => {
      const p = scene.posAt(at), h = scene.headingAt(at), off = offOf(row);
      return scene.route.grid.classify(p.x + (-Math.sin(h)) * off,
                                       p.y + Math.cos(h) * off) === 'sidewalk';
    };
    const clearRun = (at) => {
      for (let u = 0; u <= SL.lead * T2; u += TILE)
        for (const row of [SL.rowA, SL.rowB])
          if (!walkAt(at + u, row)) return false;
      return true;
    };
    let spawnS = Math.round(first.s0);
    const spawnLimit = first.s1 - 4 * SL.gap * T2;
    while (spawnS < spawnLimit && !clearRun(spawnS)) spawnS += TILE;
    if (spawnS >= spawnLimit){
      run.fail = 'no continuous sidewalk on the opening leg — reseek';
      return null;
    }

    const course = { chain: ch, spawnS, nLines: ch.nLines,
                     grade: ch.score, fList: ch.lines.map(g => g.f) };

    /* alternation runs on ONE counter for the whole chain, so the weave never
       repeats a side at a handoff and the colours stay honest across every
       turn, not just the first */
    let k = 0;
    const plantAt = (at) => {
      const row   = (k % 2 === 0) ? SL.rowA : SL.rowB;
      const other = (k % 2 === 0) ? SL.rowB : SL.rowA;
      const want  = Math.sign(other - row);
      const screenWant = want * (rowPlusDownAt(at) ? 1 : -1);
      scene.route.hazards.push({
        type:'cone', s: Math.round(at), row, f:0, hit:false,
        phi:0, phase:1, angVel:0, moving:false, pose:'standing',
        slide:0, slideVel:0,
        slRole:'gate', slIndex:k,
        slWant: want, slScreenWant: screenWant,
        cone: screenWant > 0 ? GATE_BLUE : GATE_RED,
        slKnocked:false, slJudged:false,
      });
      k++;
    };

    const step = SL.gap * T2;
    const arcs = ch.segs.filter(g => g.type === 'arc');

    ch.lines.forEach((L, i) => {
      const isFirst = i === 0, isLast = i === ch.lines.length - 1;
      const from = isFirst ? spawnS + SL.lead * T2 : L.s0 + SL.turn * T2;
      const to   = isLast  ? L.s1 - SL.tail * T2   : L.s1 - SL.turn * T2;
      for (let at = from; at <= to && k < SL.n; at += step) plantAt(at);
    });

    /* THE CHUTE, on every arc in the chain.
       An arc cannot hold gates — hop() refuses to fire mid-arc, so a cone you
       must change lanes around is a gate you are physically unable to answer.
       It gets a wall instead, lining the rows either side of the lane the last
       gate committed you to. Spacing is a plain step in route-s at 0.55 of a
       gate gap: an earlier pass "corrected" this to even world spacing on the
       theory that equal s is not equal world distance at different arc radii.
       True, and it looked worse — the bunching on the inner radius IS the look.
       Reverted deliberately; do not re-fix it. */
    const gatesNow = () => scene.route.hazards
      .filter(h => h.slRole === 'gate').sort((x, y) => x.s - y.s);
    const cstep = SL.gap * T2 * 0.55;
    for (const M of arcs){
      const lastG = gatesNow().filter(h => h.s < M.s0).slice(-1)[0];
      const lane = lastG ? Phaser.Math.Clamp(lastG.row + lastG.slWant, 0, 3) : SL.rowB;
      for (let at = M.s0 - SL.turn * T2 * 0.5; at <= M.s1 + SL.turn * T2 * 0.5; at += cstep){
        for (const r of [lane - 1, lane + 1]){
          if (r < 0 || r > 3) continue;
          scene.route.hazards.push({
            type:'cone', s: Math.round(at), row: r, f:0, hit:false,
            phi:0, phase:1, angVel:0, moving:false, pose:'standing',
            slide:0, slideVel:0,
            slRole:'chute', cone: GATE_WALL,
            slKnocked:false, slJudged:true,
          });
        }
      }
    }

    course.nGates = k;
    course.finishS = Math.round(gatesNow().reduce((m, h) => Math.max(m, h.s), 0)
                                + SL.tail * T2);
    course.arcSpans = arcs.map(M => [M.s0, M.s1]);

    /* ============ A SPECIALITY COURSE IS EMPTY ============
       Speed-and-agility run: everything that is not a cone comes out of the
       corridor. Runs AFTER planting and preserves slRole, so it cannot eat its
       own gates.

       STRUCTURE IS NOT CLUTTER. The curb ramps are HAZARDS, not props, so
       clearing every hazard in range deleted the ramp ART while the ramp
       PHYSICS carried on from route.crossings — the wheels climbed a ramp that
       was not drawn. It also starved buildWorldCurbRamps, which filters these
       same hazards. Ground structure stays wherever it falls.

       Traffic is left alone: the cars are on the road, the course is on the
       walk, and an empty street reads as a dead city. */
    const from = course.spawnS - T2 * 2, to = course.finishS + T2 * 2;
    const inRange = v => v >= from && v <= to;
    const STRUCTURE = { sidewalkend:1, sidewalkbegin:1, sidewalkbeginTurn:1, grade:1 };
    const before = scene.route.hazards.length + (scene.route.props || []).length;
    scene.route.hazards = scene.route.hazards.filter(h =>
      h.slRole || STRUCTURE[h.type] || !inRange(h.s));
    scene.route.props   = (scene.route.props || []).filter(pr => !inRange(pr.s));
    if (scene.route.crime && inRange(scene.route.crime.s)) scene.route.crime = null;
    course.cleared = before - (scene.route.hazards.length + scene.route.props.length);
    return course;
  }


  function slResetRun(){
    document.getElementById('slCard')?.remove();
    /* State reset happens BEFORE the course build, unconditionally. It used to
       sit after the early return, so a failed corridor search left the robot in
       whatever state he was already in — frozen, with an error that flashed for
       2.2s and vanished. A lab that fails should fail loudly and leave you able
       to drive. */
    scene.state = 'play'; scene.tipT = 0; scene.damage = 0;
    scene.hopAnim = null; scene.hopYaw = 0; scene.hopKick = 0;
    slQuietOpening();
    run.done = false;
    run.course = slBuildCourse();
    /* knock-watch covers chute cones too; gate-only counts read slRole */
    run.cones  = scene.route.hazards.filter(h => h.slRole);
    run.gates  = scene.route.hazards.filter(h => h.slRole === 'gate');
    run.started = false; run.done = false;
    run.phase = 'count'; run.countT0 = performance.now();
    run.elapsed = 0; run.pen = 0; run.cleared = 0; run.faults = [];
    if (!run.course){ run.phase = 'idle'; return; }
    run.fail = '';
    run.msg = `${run.course.nLines} legs, ${run.course.nGates} gates  ` +
              `f=${run.course.fList.join('/')}  —  red: pass above, blue: pass below`;
    run.msgT = performance.now();

    /* Start on rowA — the row the FIRST gate does not want. Starting on the
       clear side would make gate one free, and a slalom whose opening gate is
       free teaches the wrong first move. */
    scene.botRow = SL.rowA;
    scene.laneOff = offOf(scene.botRow);
    scene.botS = run.course.spawnS;
    scene.speed = 0; scene.tilt = 0; scene.roll = 0;
    const sp = scene.posAt(scene.botS), hdg = scene.headingAt(scene.botS);
    scene.botX = sp.x + (-Math.sin(hdg)) * scene.laneOff;
    scene.botY = sp.y + Math.cos(hdg) * scene.laneOff;
    scene.drawAngle = hdg;
    slPinCam();
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

    /* clock is owned by the countdown now, not by crossing an invisible line */
    if (run.phase === 'count'){ prevS = s; return; }
    if (run.started && !run.done) run.elapsed = (performance.now() - run.t0) / 1000;

    /* Knocks. The cone's own integrator owns pose/phi/moving; this only reads
       them, and only scores the transition once. */
    for (const cone of run.cones){
      if (!cone.slKnocked && (cone.moving || cone.pose !== 'standing' || cone.phi > 0.02)){
        cone.slKnocked = true;
        run.pen += SL.pen;
        const name = cone.slRole === 'chute'
          ? 'turn chute' : `cone ${cone.slIndex + 1}`;
        run.faults.push(`${name} knocked`);
        run.msg = `${name} — +${SL.pen.toFixed(1)}s`;
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
        const side = cone.slScreenWant > 0 ? 'below' : 'above';
        const col  = cone.slScreenWant > 0 ? 'blue' : 'red';
        run.pen += SL.pen;
        run.faults.push(`#${cone.slIndex + 1} ${col} — should have passed ${side}`);
        run.msg = `${col}: pass ${side} — +${SL.pen.toFixed(1)}s`;
        run.msgT = performance.now();
      }
    }

    if (!run.done && prevS < c.finishS && s >= c.finishS){
      run.done = true;
      slShowCard();
    }
    /* Coast to a stop once the run is scored. This is the ONLY write this lab
       makes to the robot during play, and it happens strictly after the last
       gate is judged — a run that ends with the player still holding throttle
       into traffic has no clear outcome, which was the complaint. */
    if (run.done) scene.speed *= 0.94;
    prevS = s;
  }

  /* =========================================================================
     THE OUTCOME
     v2 ended a run by flashing a line of text for 2.2 seconds and then going
     back to a debug readout, which is not an ending — you could finish and not
     know you had. A run now stops the robot and puts up a card that states the
     verdict, the arithmetic behind it, and every fault by name.
     ========================================================================= */
  const BEST_KEY = 'tipsy.lab.slalomBest';   // lab-only; NOT the protected tipsy-best-* namespace

  function slShowCard(){
    const raw   = run.elapsed;
    const total = raw + run.pen;
    const clean = run.cleared === run.cones.length && run.pen === 0;
    const won   = total <= SL.par;

    let best = parseFloat(localStorage.getItem(BEST_KEY) || '0') || 0;
    const isBest = won && (!best || total < best);
    if (isBest){ best = total; localStorage.setItem(BEST_KEY, String(total)); }

    const verdict = !won ? 'OVER PAR' : (clean ? 'CLEAN RUN' : 'PASS');
    const col     = !won ? '#ff6b6b' : (clean ? '#7fe08a' : '#ffb04d');

    const row = (k, v, c) =>
      `<div style="display:flex;justify-content:space-between;gap:16px;padding:3px 0">
         <span style="color:#8f95a1">${k}</span>
         <span style="color:${c || '#e8eaef'};font-variant-numeric:tabular-nums">${v}</span>
       </div>`;

    const faults = run.faults.length
      ? `<div style="margin-top:8px;padding-top:8px;border-top:1px solid #2b2f38;
              max-height:22vh;overflow:auto">
           ${run.faults.map(f => `<div style="color:#ff9c4d">${f}</div>`).join('')}
         </div>`
      : `<div style="margin-top:8px;padding-top:8px;border-top:1px solid #2b2f38;
              color:#7fe08a">no faults</div>`;

    document.getElementById('slCard')?.remove();
    const card = document.createElement('div');
    card.id = 'slCard';
    card.style.cssText = [
      'position:fixed','left:12px','right:12px','top:50%','transform:translateY(-50%)',
      'z-index:100000','background:rgba(14,16,21,0.97)',`border:1px solid ${col}`,
      'border-radius:14px','padding:16px','max-width:460px','margin:0 auto',
      'font:13px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace','color:#e8eaef',
    ].join(';');
    card.innerHTML =
      `<div style="color:${col};font-size:22px;font-weight:800;letter-spacing:2px;
            text-align:center;margin-bottom:4px">${verdict}</div>
       <div style="text-align:center;font-size:30px;font-weight:800;
            font-variant-numeric:tabular-nums;margin-bottom:12px">${total.toFixed(2)}s</div>
       ${row('run time', raw.toFixed(2) + 's')}
       ${row('penalties', (run.pen ? '+' : '') + run.pen.toFixed(1) + 's',
             run.pen ? '#ff9c4d' : '#7fe08a')}
       ${row('par', SL.par.toFixed(1) + 's')}
       ${row('margin', (SL.par - total >= 0 ? '−' : '+') +
             Math.abs(SL.par - total).toFixed(2) + 's', col)}
       ${row('gates cleared', `${run.cleared} / ${run.gates.length}`)}
       ${row('grade', (run.course.grade * 100).toFixed(1) + '% downhill')}
       ${row('legs', `${run.course.nLines}  (f=${run.course.fList.join('/')})`)}
       ${row('seed', SEED || '—')}
       ${row('best', best ? best.toFixed(2) + 's' : '—', isBest ? '#7fe08a' : null)}
       ${isBest ? `<div style="text-align:center;color:#7fe08a;margin-top:6px">
                     new best</div>` : ''}
       <div style="display:flex;gap:12px;justify-content:center;margin-top:8px;
            font-size:11px;color:#8f95a1">
         <span><b style="color:#e03131">red</b> pass above</span>
         <span><b style="color:#2f6fd0">blue</b> pass below</span>
       </div>
       ${faults}
       ${clean && won ? `<div style="text-align:center;color:#7fe08a;margin-top:10px">
             slalom-master would unlock here</div>` : ''}
       <div style="display:flex;gap:8px;margin-top:14px">
         <button id="slAgain" style="${'font:inherit;color:#e8eaef;background:#232220;' +
           'border:1px solid #2b2f38;border-radius:7px;min-height:44px;'}flex:2">run again</button>
         <button id="slClose" style="${'font:inherit;color:#e8eaef;background:#232220;' +
           'border:1px solid #2b2f38;border-radius:7px;min-height:44px;'}flex:1">close</button>
       </div>`;
    document.body.appendChild(card);
    document.getElementById('slAgain').onclick = () => { card.remove(); slResetRun(); };
    document.getElementById('slClose').onclick = () => card.remove();
  }

  /* ============ 3 - 2 - 1 - GO ============
     "Roll to the line" was not a start, it was the absence of one: the clock
     began at an invisible s value while you were already moving, so a run had
     no moment of beginning any more than it had a moment of ending.

     The robot is HELD at the spawn during the count, and holding him needs a
     PRE-update hook. Throttle and speed are integrated inside update(), so
     zeroing them afterwards would still let him creep one frame's worth every
     frame. Zero the input before the sim reads it and he does not move at all. */
  const COUNT_MS = 3000;

  /* read-only now — the phase flip lives in onPre, on the frame clock */
  function slCountdown(){
    if (run.phase !== 'count') return null;
    return Math.max(1, Math.ceil((COUNT_MS - (performance.now() - run.countT0)) / 1000));
  }

  /* The camera eases at Linear(camX, target, 0.08) per frame, which over
     block-scale distance is seconds of drift — so after a reseek the countdown
     played out over whatever the camera happened to be looking at, and Tipsey
     slid into frame well after GO. Snapping camX once in slResetRun was not
     enough: the ease starts from wherever the scene puts it next.
     During the count the camera is simply PINNED, using the game's own target
     formula (botX + cos(hdg)*95) so there is no jump at GO. */
  function slPinCam(){
    const hdg = scene.headingAt(scene.botS);
    scene.camX = scene.botX + Math.cos(hdg) * 95;
    scene.camY = scene.botY + Math.sin(hdg) * 95;
  }
  const onPre  = () => {
    /* pickupWalk is rewritten by the timeline every frame, so it is held down
       every frame rather than once at reset — cheap, and it means a stray
       re-entry into the loading beat can never drag the camera off again. */
    scene.pickupWalk = 0;
    /* runT drives the 1400ms lid-and-bag loading beat. Jump past it so the
       course never opens with a delivery animation it has no delivery for. */
    if (scene.runT < LOAD_ART.ms + 1) scene.runT = LOAD_ART.ms + 1;

    if (run.phase !== 'count') return;

    /* THE HOLD IS BY POSITION, NOT BY ZEROING THROTTLE.
       bindInput sets this.throttle on pointer EVENTS only. Holding the screen
       through the countdown fires no pointerdown at GO, so zeroing throttle
       each frame threw the held input away and the robot sat there until you
       lifted and pressed again — read on-device as "he can't get to full speed
       right away". Pinning botS and speed instead holds him just as still while
       leaving his finger's input intact, so he launches on the GO frame. */
    scene.speed = 0;
    if (run.course) scene.botS = run.course.spawnS;
    slPinCam();

    /* Flip the phase HERE rather than from the 100ms panel tick, so the release
       is frame-accurate instead of up to a tenth of a second late. */
    if (performance.now() - run.countT0 >= COUNT_MS){
      run.phase = 'live'; run.started = true; run.t0 = performance.now();
      prevS = scene.botS;

      /* LAUNCH ON A HELD THUMB, WHEREVER IT IS.
         bindInput reads the pointer's screen half: right is gas, LEFT IS BRAKE.
         During a countdown the thumb rests wherever it rests, so a player
         holding the left half got throttle -1 at GO and sat there braking until
         they moved it — a few seconds of "he won't go" with no signal as to
         why. Same shape as the earlier bug where zeroing throttle each frame
         threw the held press away: the input model assumes an event will
         arrive, and during a hold none does.

         A held press through a countdown means GO. On this course there is
         nothing to brake for on the start line. */
      if (scene.input.activePointer.isDown) scene.throttle = 1;

      /* runT is the delivery clock, and at runT > parMs + CANCEL_GRACE_MS the
         order cancels: state goes "canceled", input dies. A lab session sitting
         on one route for a few minutes would trip it mid-run for no visible
         reason. Reset it with the run. */
      scene.runT = 0;
    }
  };
  const onPost = () => { try { slJudge(); } catch(e){ console.log('slJudge', e); } };
  scene.events.on('preupdate',  onPre);
  scene.events.on('postupdate', onPost);
  scene._slRestore = () => {
    scene.events.off('preupdate',  onPre);
    scene.events.off('postupdate', onPost);
    scene.mode = origMode;
    delete scene._slRestore;
  };

  /* =========================================================================
     PANEL — phone first
       DOCK TOP     — never under the steering thumb.
       COLLAPSE     — during a run it is a single strip: clock, cones, message.
       ONE CONTROL  — a chip row picks WHICH value the single big slider edits.
     ========================================================================= */
  const FIELDS = [
    { key:'n',    label:'cap',   min:8,   max:600, step:4    },
    { key:'legs', label:'legs',  min:2,   max:24,  step:1    },
    { key:'gap',  label:'gap',   min:1.4, max:4.0, step:0.05 },
    { key:'rowA', label:'row A', min:0,   max:3,   step:1    },
    { key:'rowB', label:'row B', min:0,   max:3,   step:1    },
    { key:'lead', label:'lead',  min:2,   max:12,  step:0.5  },
    { key:'turn', label:'turn',  min:1.5, max:8,   step:0.5  },
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
         <button id="slSeek"  style="${BTN}flex:2">find course</button>
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
    (SEED ? `const SL_SEED_DATE = "${SEED}";  ` : '') +
    `const SL = { n:${SL.n}, gap:${(+SL.gap).toFixed(2)}, rowA:${SL.rowA}, rowB:${SL.rowB}, ` +
    `lead:${(+SL.lead).toFixed(1)}, turn:${(+SL.turn).toFixed(1)}, ` +
    `tail:${(+SL.tail).toFixed(1)}, ` +
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

  $('slSeek').onclick  = () => slArm();
  $('slRun').onclick   = () => slResetRun();
  $('slReset').onclick = () => { Object.assign(SL, SL0); syncUI(); slResetRun(); };
  $('slCopy').onclick  = () => {
    navigator.clipboard?.writeText(portLine());
    $('slCopy').textContent = 'ok';
    setTimeout(() => $('slCopy').textContent = 'copy', 900);
  };
  $('slOff').onclick = () => {
    document.getElementById('slCard')?.remove();
    count.remove();
    scene._slRestore && scene._slRestore();
    clearInterval(tick);
    panel.remove();
  };

  const count = document.createElement('div');
  count.id = 'slCount';
  count.style.cssText = [
    'position:fixed','left:0','right:0','top:38%','z-index:99998',
    'text-align:center','pointer-events:none',
    'font:800 84px/1 ui-monospace,SFMono-Regular,Menlo,monospace',
    'color:#ff7a1a','text-shadow:0 3px 18px rgba(0,0,0,0.75)','display:none',
  ].join(';');
  document.body.appendChild(count);

  let goShownAt = 0;
  const tick = setInterval(() => {
    const n = slCountdown();
    if (n !== null){
      count.style.display = 'block'; count.style.color = '#ff7a1a';
      count.textContent = String(n); goShownAt = 0;
    } else if (run.phase === 'live' && !goShownAt){
      goShownAt = performance.now();
      count.style.display = 'block'; count.style.color = '#7fe08a';
      count.textContent = 'GO';
    } else if (run.phase !== 'live' || performance.now() - goShownAt > 700){
      count.style.display = 'none';
    }

    const total = run.elapsed + run.pen, clk = $('slClock');
    if (clk){
      clk.style.color = run.done ? (total <= SL.par ? '#7fe08a' : '#ff6b6b') : '#e8eaef';
      clk.textContent = `${total.toFixed(2)}s  ${run.cleared}/${run.gates.length}` +
                        (run.pen ? `  +${run.pen.toFixed(1)}` : '') +
                        `  par ${SL.par.toFixed(0)}`;
    }
    const m = $('slMsg');
    if (m){
      const c = run.course;
      const inArc = c && (c.arcSpans || []).some(([a, b]) => scene.botS >= a && scene.botS <= b);
      const where = !c ? '—' : inArc ? 'TURN — hold your lane'
        : `leg ${(c.arcSpans || []).filter(([a]) => scene.botS > a).length + 1}/${c.nLines}`;
      if (run.fail){ m.textContent = run.fail; m.style.color = '#ff6b6b'; return; }
      m.style.color = '#ffb04d';
      if (run.phase === 'count'){ m.textContent = 'hold — starting'; return; }
      /* thr and state are here because "he won't go" has had three different
         causes now, and each time the screen showed nothing that distinguished
         them. thr -1 is braking, thr 0 is no input reaching the sim. */
      m.textContent = (performance.now() - run.msgT < 2200) ? run.msg
        : `${where}  row ${scene.botRow}  v ${scene.speed.toFixed(3)}` +
          `  thr ${scene.throttle}  ${scene.state}` +
          `  left ${run.gates.filter(c2 => !c2.slJudged).length}`;
    }
  }, 100);

  /* Costa Palma's grade comes from the hood's `hill` knob, and a slalom on The
     Flats (hill 0) is a slalom on a table. If the loaded route is not already a
     steep hood, reload it onto The Bluffs first — loadRoute(dateStr, opts)
     takes hoodIndex, the same door the hydrant challenge uses. The route
     rebuild is async in effect (it re-runs generateRoute and resets the scene),
     so the course is built on the NEXT tick, not inline. */
  /* =========================================================================
     SEED SEEK — stop hunting for a shape inside a route that was not built
     for one.
     -------------------------------------------------------------------------
     Today's route simply may not contain a line->arc->line whose BOTH legs run
     f=0/f=1, and with 24 cones the straight fallback needs ~5300 units on a
     single leg — more than the 3128 of a one-block leg, so it almost never
     fits either. Searching harder inside one route cannot fix that.

     The hydrant challenge already solved this: it does not search, it PINS
     (HJ_SEED_DATE) a date whose route it knows has the shape. generateRoute is
     a free function returning a route object, so candidate dates can be graded
     without touching the scene, and only the winner gets loaded.

     The date this finds is the thing to hardcode as SL_SEED_DATE when this
     ships — same as HJ_SEED_DATE. It is logged and shown for exactly that. */
  /* ASYNC, TIME-BUDGETED, AND IT YIELDS.
     The first version of this ran up to 160 generateRoute calls in one
     synchronous loop. Each builds a whole city, and the early-out only fired
     when a route hit the leg target — which it usually does not. On device that
     is a frozen tab, which reads as "it's not loading" rather than as a slow
     search, because nothing gets a frame to paint a message in.

     So: a wall-clock budget rather than a trial count, a yield every few
     candidates so the page keeps breathing and the progress line updates, and
     it keeps the best chain found so far no matter when the budget runs out. */
  const SEEK_MS = 2500;

  async function slSeek(){
    const t0 = performance.now();
    const base = Date.UTC(2026, 0, 1);
    let scanned = 0, best = null;

    for (let i = 0; i < 400; i++){
      if (performance.now() - t0 > SEEK_MS) break;

      const dateStr = new Date(base + i * 86400000).toISOString().slice(0, 10);
      let r;
      try { r = generateRoute(dateStr, { hoodIndex: HOOD_BLUFFS }); }
      catch(e){ continue; }
      scanned++;

      const ch = slFindChain(r);
      if (ch && (!best || ch.nLines > best.nLines ||
                 (ch.nLines === best.nLines && ch.span > best.span)))
        best = { dateStr, nLines: ch.nLines, span: ch.span };

      if (best && best.nLines >= SL.legs) break;

      if (scanned % 4 === 0){
        run.msg = `searching… ${scanned} routes, best ${best ? best.nLines : 0} legs`;
        run.msgT = performance.now();
        await new Promise(r2 => setTimeout(r2, 0));   // let the page breathe
      }
    }

    if (best) console.log(`slalom seed seek: ${best.dateStr} — ${best.nLines} legs, ` +
      `${Math.round(best.span / T2)} tiles, from ${scanned} routes in ` +
      `${Math.round(performance.now() - t0)}ms`);
    else console.log(`slalom seed seek: nothing in ${scanned} routes`);
    return best;
  }

  async function slArm(){
    run.fail = ''; run.msg = 'searching for a downhill corridor…';
    run.msgT = performance.now();
    const hit = await slSeek();
    if (!hit){
      run.fail = 'no date gave an f=0/f=1 chain — lower gap or cap';
      syncUI();
      return;
    }
    run.seekN = hit.nLines;
    SEED = hit.dateStr;
    scene.loadRoute(SEED, { hoodIndex: HOOD_BLUFFS });
    slQuietOpening();
    setTimeout(() => {
      syncUI(); slResetRun();
      console.log(`cone slalom armed — SL_SEED_DATE = "${SEED}" (${hit.nLines} legs)`, portLine());
    }, 60);
  }

  let SEED = null;
  setTimeout(slArm, 0);   // let the panel paint before the seek blocks the thread
  console.log('cone slalom arming —', portLine());
})();
