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
    n:    24,     // cones in the course, split across the two legs
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

  const run = {
    course: null, cones: [], started: false, done: false,
    t0: 0, elapsed: 0, pen: 0, cleared: 0, faults: [], msg: '', msgT: 0,
    phase: 'idle', countT0: 0, gates: [],
  };

  /* =========================================================================
     COURSE
     ========================================================================= */
  const splitN = () => [Math.ceil(SL.n / 2), Math.floor(SL.n / 2)];

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

  function slFindCorridor(route){
    const [nA, nB] = splitN();
    const needA = (SL.lead + (nA - 1) * SL.gap + SL.turn) * T2;
    const needB = (SL.turn + (nB - 1) * SL.gap + SL.tail) * T2;
    const segs = route.segs;
    let best = null, fitButUphill = 0, turnFits = 0;

    for (let i = 0; i + 2 < segs.length; i++){
      const a = segs[i], m = segs[i + 1], b = segs[i + 2];
      if (a.type !== 'line' || m.type !== 'arc' || b.type !== 'line') continue;
      if ((a.s1 - a.s0) < needA || (b.s1 - b.s0) < needB) continue;
      if (!DOWNHILL_F.includes(a.f) || !DOWNHILL_F.includes(b.f)){ fitButUphill++; continue; }
      turnFits++;
      /* length-weighted mean of the two weave legs */
      const la = a.s1 - a.s0, lb = b.s1 - b.s0;
      const score = (gradeOver(route, a.s0, a.s1) * la +
                     gradeOver(route, b.s0, b.s1) * lb) / (la + lb);
      if (!best || score < best.score)
        best = { a, m, b, score, gA: gradeOver(route, a.s0, a.s1),
                 gB: gradeOver(route, b.s0, b.s1) };
    }
    /* Report the near-misses rather than silently falling back to a corridor
       that reads as a climb. A wrong-heading course is worse than no course:
       it looks like the grade is broken when the grade is fine. */
    if (best){ best.kind = 'turn'; return best; }

    /* FALLBACK: one straight, no turn.
       The turn and the downhill read compete for the same heading budget — a
       line->arc->line where BOTH legs are f=0/f=1 is a narrow ask, and plenty
       of routes simply do not contain one. Reading as downhill is the harder
       requirement and the one that cannot be faked, so the turn is what gets
       dropped. A straight course that looks right beats a turning course that
       looks like a climb, and beats no course at all by a mile. */
    const needStraight = (SL.lead + (SL.n - 1) * SL.gap + SL.tail) * T2;
    let flat = null;
    for (const g of segs){
      if (g.type !== 'line' || !DOWNHILL_F.includes(g.f)) continue;
      if ((g.s1 - g.s0) < needStraight) continue;
      const score = gradeOver(route, g.s0, g.s1);
      if (!flat || score < flat.score)
        flat = { a: g, m: null, b: null, score, gA: score, gB: 0, kind: 'straight' };
    }
    lastDiag = { turnFits, fitButUphill, straight: !!flat };
    return flat;
  }

  function slBuildCourse(){
    const cor = slFindCorridor(scene.route);
    if (!cor){
      /* Clear any gates left over from a previous successful build. Stale cones
         standing on a route with no course is the single most misleading thing
         this lab can put on screen — it looks like a course that stopped
         working rather than a course that was never placed. */
      scene.route.hazards = scene.route.hazards.filter(h => !h.slRole);
      run.cones = [];
      const dg = lastDiag || {};
      run.fail = `no course: ${dg.fitButUphill || 0} corridor(s) fit but ran ` +
                 `f=2/f=3, 0 straights long enough on f=0/f=1. ` +
                 `drop cones or gap, or reroute`;
      run.msg = run.fail; run.msgT = performance.now();
      console.log('slalom corridor search', dg,
        scene.route.segs.map(g => `${g.type} f=${g.f} len=${Math.round(g.s1-g.s0)}`));
      return null;
    }

    const straight = cor.kind === 'straight';
    const [nA, nB] = straight ? [SL.n, 0] : splitN();

    /* SPAWN ON ACTUAL SIDEWALK — asked, not inferred.
       The first attempt walked route.crossings and pushed past any span the
       spawn overlapped. It kept putting the robot in the road, because that is
       a model of where the walk is missing rather than the answer, and a single
       unordered pass can also step out of one span straight into the next.

       grid.classify(x, y) IS the answer — classifyAt over the same grid.edges
       the world is built from. So walk forward until the spawn point AND the
       whole run-up behind the first cone classify as sidewalk, testing the
       exact world point the robot will occupy at his own lane offset. Verify
       through the call the game actually makes, not a parallel copy of it. */
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
    let spawnS = Math.round(cor.a.s0);
    const spawnLimit = cor.a.s1 - (nA - 1) * SL.gap * T2 - SL.turn * T2;
    while (spawnS < spawnLimit && !clearRun(spawnS)) spawnS += TILE;
    if (spawnS >= spawnLimit){
      run.fail = 'no continuous sidewalk on the leg — reseek';
      return null;
    }
    spawnS = Math.round(spawnS);
    const aStart = Math.round(spawnS + SL.lead * T2);
    const bStart = straight ? 0 : Math.round(cor.b.s0 + SL.turn * T2);
    const course = {
      cor, straight,
      spawnS,
      lineS:   Math.round(aStart - SL.gap * T2 * 0.5),
      /* with no arc, the turn markers sit past the finish so the "in the turn"
         test below can never fire — one branch, not a second code path */
      arcS0:   straight ? Infinity : cor.m.s0,
      arcS1:   straight ? Infinity : cor.m.s1,
      finishS: straight
        ? Math.round(aStart + (SL.n - 1) * SL.gap * T2 + SL.tail * T2)
        : Math.round(bStart + (nB - 1) * SL.gap * T2 + SL.tail * T2),
      gA: cor.gA, gB: cor.gB, grade: cor.score,
      fA: cor.a.f, fB: straight ? cor.a.f : cor.b.f,
    };

    /* Clear the WHOLE corridor, arc included, every row. Same reasoning
       hjBuildCourse gives for the hydrant lane: you would weave twenty-four
       cones clean and then land on a crack. */
    const from = course.spawnS - T2, to = course.finishS + T2;
    scene.route.hazards = scene.route.hazards.filter(h =>
      !h.slRole && !(h.s >= from && h.s <= to));
    scene.route.props = (scene.route.props || []).filter(pr =>
      !(pr.s >= from && pr.s <= to));

    /* Cone hazard objects mirror the generator's own cone branch field for
       field (phi/phase/angVel/moving/pose/slide/slideVel), so the existing
       rigid pivot-fall integrator and hit code drive them with no special case.
       Always standing — a pre-knocked cone in a slalom is a free gate.

       Numbering runs unbroken across the turn (1..n) so a fault message names
       the cone the player just saw, not "leg B, number three". */
    let k = 0;
    const plant = (s0, count) => {
      for (let i = 0; i < count; i++, k++){
        const row   = (k % 2 === 0) ? SL.rowA : SL.rowB;
        const other = (k % 2 === 0) ? SL.rowB : SL.rowA;
        const at   = Math.round(s0 + i * SL.gap * T2);
        const want = Math.sign(other - row);          // row-space: the open side
        /* row-space want -> screen-space want, via hop()'s own flip */
        const screenWant = want * (rowPlusDownAt(at) ? 1 : -1);
        scene.route.hazards.push({
          type:'cone', s: at, row, f:0, hit:false,
          phi:0, phase:1, angVel:0, moving:false, pose:'standing',
          slide:0, slideVel:0,
          slRole:'gate', slIndex:k,
          slWant: want,
          slScreenWant: screenWant,
          cone: screenWant > 0 ? GATE_BLUE : GATE_RED,
          slKnocked:false, slJudged:false,
        });
      }
    };
    plant(aStart, nA);
    if (nB) plant(bStart, nB);

    /* ============ THE TURN IS NO LONGER A DEAD GAP ============
       The arc used to be empty road between two cone fields, which read as the
       course having stopped. It cannot hold GATES — hop() refuses to fire
       mid-arc, so a cone you must change lanes around is a gate you are
       physically unable to answer.

       So the arc gets a CHUTE instead: cones lining the rows either side of the
       lane the last gate committed you to. They are not gates and are never
       side-judged. They make the turn's actual rule visible — you are in this
       lane until the arc is behind you — and they punish drifting, which is
       exactly what hop()'s refusal already meant but never showed. Tighter
       spacing than the gates so it reads as a wall, not as more gates. */
    if (!straight && nA > 0){
      const gates = scene.route.hazards.filter(h => h.slRole === 'gate')
                                       .sort((x, y) => x.s - y.s);
      const lastA  = gates.filter(h => h.s < cor.m.s0).slice(-1)[0];
      const firstB = gates.filter(h => h.s > cor.m.s1)[0];
      const lane = lastA ? Phaser.Math.Clamp(lastA.row + lastA.slWant, 0, 3) : SL.rowB;

      /* CONTINUITY, TWO SEPARATE FIXES.

         1. SPAN. The chute used to run from the ARC's own extent outward, so
            whatever was left between the last gate and the start of the arc
            stayed empty. It now runs gate-to-gate: from half a gap after the
            last leg-1 gate to half a gap before the first leg-2 gate. There is
            nowhere left for a hole to be, by construction.

         2. SPACING IS MEASURED IN WORLD DISTANCE, NOT IN s. On an arc the two
            walls sit at different radii, so a constant step in route-s bunches
            the inner wall and stretches the outer one — which is exactly the
            unevenness on screen, because the eye reads world distance. Each
            wall is therefore walked independently in small increments and drops
            a cone whenever the accumulated WORLD distance for THAT row crosses
            the target. Radius-agnostic, heading-agnostic, and it needs no arc
            geometry: it asks posAt/headingAt where the cone would actually be. */
      const want = SL.gap * T2 * 0.55;          // target world spacing
      const from = (lastA  ? lastA.s  : cor.m.s0) + SL.gap * T2 * 0.5;
      const to   = (firstB ? firstB.s : cor.m.s1) - SL.gap * T2 * 0.5;
      const posOf = (at, row) => {
        const p = scene.posAt(at), h = scene.headingAt(at), off = offOf(row);
        return { x: p.x + (-Math.sin(h)) * off, y: p.y + Math.cos(h) * off };
      };

      let placed = 0;
      for (const r of [lane - 1, lane + 1]){
        if (r < 0 || r > 3) continue;
        let acc = want, prev = posOf(from, r);      // acc primed so one lands at `from`
        for (let at = from; at <= to; at += TILE * 0.25){
          const q = posOf(at, r);
          acc += Math.hypot(q.x - prev.x, q.y - prev.y);
          prev = q;
          if (acc < want) continue;
          acc = 0;
          scene.route.hazards.push({
            type:'cone', s: Math.round(at), row: r, f:0, hit:false,
            phi:0, phase:1, angVel:0, moving:false, pose:'standing',
            slide:0, slideVel:0,
            slRole:'chute', cone: GATE_WALL,
            slKnocked:false, slJudged:true,     // never side-judged
          });
          placed++;
        }
      }
      course.chuteLane = lane;
      course.chuteN = placed;
    }
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
    run.msg = (run.course.straight ? 'straight (no turn available)  ' : '') +
              `f=${run.course.fA}\u2192f=${run.course.fB}  ` +
              `${(run.course.grade * 100).toFixed(1)}% — red: pass above, blue: pass below`;
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
       ${row('headings', `f=${run.course.fA} \u2192 f=${run.course.fB}`)}
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

  function slCountdown(){
    if (run.phase !== 'count') return null;
    const left = COUNT_MS - (performance.now() - run.countT0);
    if (left <= 0){
      run.phase = 'live'; run.started = true; run.t0 = performance.now();
      return null;
    }
    return Math.ceil(left / 1000);
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
    if (run.phase === 'count'){ scene.throttle = 0; scene.speed = 0; slPinCam(); }
  };
  const onPost = () => { try { slJudge(); } catch(e){ console.log('slJudge', e); } };
  scene.events.on('preupdate',  onPre);
  scene.events.on('postupdate', onPost);
  scene._slRestore = () => {
    scene.events.off('preupdate',  onPre);
    scene.events.off('postupdate', onPost);
    delete scene._slRestore;
  };

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
      clk.textContent = `${total.toFixed(2)}s  ${run.cleared}/${SL.n}` +
                        (run.pen ? `  +${run.pen.toFixed(1)}` : '') +
                        `  par ${SL.par.toFixed(0)}`;
    }
    const m = $('slMsg');
    if (m){
      const c = run.course;
      const where = !c ? '—'
        : scene.botS < c.arcS0 ? 'leg 1'
        : scene.botS < c.arcS1 ? 'TURN — hold your lane'
        : 'leg 2';
      if (run.fail){ m.textContent = run.fail; m.style.color = '#ff6b6b'; return; }
      m.style.color = '#ffb04d';
      if (run.phase === 'count'){ m.textContent = 'hold — starting'; return; }
      m.textContent = (performance.now() - run.msgT < 2200) ? run.msg
        : `${where}   row ${scene.botRow}   v ${scene.speed.toFixed(3)}` +
          `   left ${run.cones.filter(c2 => !c2.slJudged).length}`;
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
  function slSeek(maxTries = 120){
    const t0 = performance.now();
    const base = Date.UTC(2026, 0, 1);
    let scanned = 0, bestSoFar = null;
    for (let i = 0; i < maxTries; i++){
      const dateStr = new Date(base + i * 86400000).toISOString().slice(0, 10);
      let r;
      try { r = generateRoute(dateStr, { hoodIndex: HOOD_BLUFFS }); }
      catch(e){ continue; }
      scanned++;
      const cor = slFindCorridor(r);
      if (cor && cor.kind === 'turn'){
        console.log(`slalom seed seek: ${dateStr} after ${scanned} routes, ` +
                    `${Math.round(performance.now() - t0)}ms`);
        return { dateStr, kind: 'turn' };
      }
      if (cor && !bestSoFar) bestSoFar = { dateStr, kind: cor.kind };
    }
    return bestSoFar;   // a straight, if that is all the city offered
  }

  /* =========================================================================
     NO DELIVERY OPENING
     -------------------------------------------------------------------------
     The camera was not confused, it was obeying orders. In delivery mode the
     pickup timeline pins this.pickupWalk to 1 for the whole loading beat, and
     the camera branch fires on pickupWalk > 0.75 — so it blends its target
     across door + bot + worker + the worker's raised hand and sits on the shop
     doorway while the slalom countdown plays out somewhere else entirely.

     loadRoute's challenge branch already solves this by nulling the three route
     pickup fields, and the timeline comment is explicit that challenge mode
     SKIPS the pickup rather than fast-forwarding it, "because every downstream
     effect keys off these same flags".

     Deliberately NOT setting mode = "challenge" to get it. That flag also arms
     hjUpdateMeter, hjSlabZ, hjOwnsTip and the hydrant draw paths, none of which
     have a route.challenge behind them here. Take the three fields, not the
     mode: with pickupSpot/pickupBlock null the shop door never draws, so
     pickupDoorDV (assigned inside that draw, every frame) stays null, and the
     camera branch requires it. The worker has nothing to stand on either. */
  function slQuietOpening(){
    const r = scene.route;
    r.pickupSpot = null; r.pickupShopName = null; r.pickupBlock = null;
    scene.pickupDoorDV = null; scene.pickupDoorRV = null;
    scene.pickupWalk = 0; scene.walkAt = null;
    scene.loadDone = true; scene.bagOnBoard = true; scene.doorSwing = 0;
  }

  function slArm(){
    run.fail = ''; run.msg = 'searching for a downhill corridor…';
    run.msgT = performance.now();
    const hit = slSeek();
    if (!hit){
      run.fail = 'no date in 120 gave an f=0/f=1 corridor — lower cones or gap';
      syncUI();
      return;
    }
    SEED = hit.dateStr;
    scene.loadRoute(SEED, { hoodIndex: HOOD_BLUFFS });
    slQuietOpening();
    setTimeout(() => {
      syncUI(); slResetRun();
      console.log(`cone slalom armed — SL_SEED_DATE = "${SEED}" (${hit.kind})`, portLine());
    }, 60);
  }

  let SEED = null;
  setTimeout(slArm, 0);   // let the panel paint before the seek blocks the thread
  console.log('cone slalom arming —', portLine());
})();
