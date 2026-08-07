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
    n:    400,    // CAP on gates; the course fills every leg up to this
    legs: 12,     // how many legs the course runs through — walk this up
                  // with the chip and watch the cone total in the strip
    gap:  1.40,   // TIGHTEST along-route spacing between cones, in T2
    vary: 0.30,   // how far above gap the spacing opens up (0 = uniform)
    wide: 0.35,   // extra road a 2-3 row lane change buys itself. Was a hard
                  // 0.75 in the spacing line, and at 0.75 a three-row lunge
                  // ate nearly two gates' worth of straight — which is where
                  // the red/blue count was going. It is a dial now because it
                  // trades gate COUNT against gate FAIRNESS directly.
    trafficWaits: 1,   // cars queue at coned junctions instead of driving through
    kickers: 1,   // kicker ramps per leg (0 = none)
    kLift: 26,    // ramp lip height
    kRunup: 2.5,  // clear road before the lip, in T2. Was a hardcoded 5.5, and
                  // 5.5 tiles is ~500 units of nothing in front of every ramp.
    kReach: 5.0,  // how far the jump carries at full speed, in T2
    kPeak:  40,   // apex height above the lip, in world units
    rowA: 0,      // low edge of the sidewalk band the course uses
    rowB: 3,      // high edge — 0..3 is the whole walk
    lead: 3.0,    // run-up before the first cone, in T2
    turn: 2.0,    // clearance either side of the arc — no cones on the turn
    tail: 1.5,    // run-out after the last cone, in T2
    vmul: 2.00,   // top speed as a multiple of delivery's 0.225. Carries the
                  // jump ballistics and the spacing floor with it — see V_BASE.
    grip: 1.60,   // corner-tilt compensation, in two regimes. Up to 1.0 it
                  // cancels the speed multiplier's share (tilt goes with v²,
                  // so 2x speed is 4x tilt; 1.0 nets exactly delivery-speed
                  // corners). But delivery corners TIP at full throttle by
                  // design — corners need braking there — and the slalom is
                  // a weave, not a braking test. So above 1.0 the dial keeps
                  // going: 2.0 removes corner lean entirely. 1.6 default
                  // keeps some lean in the picture without the funeral.
    clean:10.0,   // how far PAST the finish the street stays swept, in T2. The
                  // corridor used to end 2 T2 after the last gate, which is the
                  // size of the COURSE — the frame is the size of the CAMERA.
    pen:  2.0,    // seconds added per knocked cone / missed side
    par:  52.0,   // seconds to beat
  };
  const HOOD_BLUFFS = 7;         // HOODS[7] — hill 1.0, the steepest in the city

  /* GATE FLAGS, in the ski-slalom convention: a coloured band tells you which
     side of the cone you owe it.

       RED  — pass on the ROAD side (row 0 side, the kerb)
       BLUE — pass on the BUILDING side (row 3 side, the shopfronts)

     THIS WAS SCREEN SPACE AND IS NOW ROW SPACE, and the reasoning that put it
     in screen space was half right, which is the dangerous kind.

     The true half: the row axis rotates under a camera that does not, so screen
     and world disagree by 180 degrees on half the legs. Any rule of the form
     "colour means side" has to pick one of them to break. There is no third
     sign to hide it in, and flipping the rule does not remove the flip — it
     only moves it.

     The half that was wrong: it assumed the two costs were equivalent, so it
     picked the one nearer the controller. They are not equivalent. A row-space
     flag flips against the SIDEWALK, and the sidewalk is on screen — road on
     one side, shopfronts on the other, both visible in every frame. Read "red
     means road side", look at the picture, swipe toward the road; hop() lands
     that swipe correctly whichever way the row axis happens to be facing,
     because translating the swipe is exactly what hop() is for. A screen-space
     flag flips against nothing you can see. "Red means swipe up" is a fact you
     can only hold in your head, with no reference in the frame to check it
     against, and on-device that read as the flags changing their minds.

     So the flag names a place in the world, and the existing screen-space
     translation in hop() carries it to the thumb — one flip, in the one piece
     of code whose job is flipping, instead of a second copy of it here. */
  const GATE_RED  = { ...CONE, band: 7, band_c: 0xe03131 };
  const GATE_BLUE = { ...CONE, band: 7, band_c: 0x2f6fd0 };
  /* CHUTE WALLS WEAR THE SAME TWO COLOURS, and they obey the same sentence.

     They were white on the grounds that a wall has no side to choose. True, and
     it skipped the more useful fact: a wall has a side you must pass it ON, and
     that side is knowable. The rule is "the colour names the side you take it
     on", so a wall at row 0 — which can only ever be passed on its building
     side — is BLUE, and a wall at row 2 is RED. Every cone in the corridor then
     states something true, where painting the road-side line red would have had
     every cone in it asserting a pass that is off the walk entirely.

     Reading it back: the road-side line goes blue, the building-side line goes
     red, and the gap runs between them. That is the paired-gate idiom — drive
     through the hole between the colours — which was costed out earlier at
     roughly double the cones and is free here, because the cones already exist.

     Kept as a narrow band (5 against a gate's 7) so a wall still reads as a
     wall at a glance. Colour says which side; band width says whether it is
     asking you to choose one. */
  const CHUTE_BLUE = { ...CONE, band: 5, band_c: 0x2f6fd0 };
  const CHUTE_RED  = { ...CONE, band: 5, band_c: 0xe03131 };

  /* rowPlusDownAt is gone with the screen-space colour rule. It was a second
     copy of hop()'s flip living outside hop(), and a lifted copy of a rule is
     a rule that can drift from the original without anything failing loudly.
     The one place that flip belongs is hop(), which still has it. */
  const SL0 = { ...SL };

  /* THE RAMP ROW IS A FACT ABOUT THE WORLD, so it lives with the other world
     facts rather than inside the chute code that first needed it. Declared down
     there it was read by the gate loop above it and threw "Cannot access
     'RAMP_ROW' before initialization" — const is hoisted but not initialised,
     and the gate loop runs first.

     generateRoute plants BOTH ramp props on CROSSING_RAMP_ROW, straight
     crossings and turn crossings alike — and the game NAMES that constant
     precisely so callers can ask "which lane takes a crossing" in the same
     words the geometry answers it in. This lab used to carry its own copy
     of the number (1, with the old rows-0-2 rationale quoted here), which
     is exactly the second-copy problem the constant exists to kill: when
     the strip moved a lane off the kerb (row 1 -> 2, f4dfe15, on-device
     call 2026-08-07), the course kept threading crossings on the old row —
     now a flank lane with a curb drop and a wall — so the robot tipped at
     every crossing and ploughed the gate cones into the street. One
     constant answers one question; the lab now reads the game's.

     Chute walls at RAMP_ROW±1 bracket whatever lane the strip occupies,
     so the walls, the handoff, the kicker lane and the parked-car checks
     all follow the constant wherever the game dials it next. */
  const RAMP_ROW = CROSSING_RAMP_ROW;

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
     THE CHAIN — N consecutive legs, any heading
     -------------------------------------------------------------------------
     The f=0/f=1 rule is GONE, on purpose. It existed because W() puts screen-y
     at (x + y)*0.5 - z, so travelling +x/+y reads as coming toward the viewer
     and therefore as descending, while f=2/f=3 read as a climb. That is still
     true — but it capped the course at two sides of one block, because a route
     that keeps turning the same way runs f0 -> f1 -> f2 -> f3 and only two of
     four qualify. Length wins over the downhill read.

     Dropping it also removes the seed seek, which is what actually broke this
     last time: with a heading filter there was a shape to hunt for, so the lab
     generated up to 160 whole cities on the main thread looking for one. With
     no filter there is nothing to search — every route already has ten legs.
     No generateRoute loop, no frozen tab.
     ========================================================================= */
  function slFindChain(route){
    const segs = route.segs;
    const firstLine = segs.findIndex(g => g.type === 'line');
    if (firstLine < 0) return null;

    /* Walk forward from the first line collecting segments until SL.legs lines
       are in hand, then trim any trailing arc — a chain ending on a turn has a
       corner leading nowhere and gates cannot live on it. */
    /* Stop at the route's own end as well as at the leg target. A looping route
       wraps, and a chain that runs past totalLen asks posAt for an s it has no
       geometry for — which does not throw, it returns nonsense, and nonsense
       coordinates are far worse than an error because they look like a bug in
       the cones. */
    /* NOT totalLen. totalLen is loop.sEnd on any route with a reroute lap
       welded in, and everything past loop.sCut is the ring — geometry that
       physically retraces blocks the course has already used. A chain that
       runs into it lays a second set of cones over the first and puts the
       finish tape back beside the start line. _slEndS is set in
       slQuietOpening and is the last s of original road. */
    const endS = route._slEndS !== undefined ? route._slEndS : route.totalLen;
    const chain = [];
    let nLines = 0;
    for (let i = firstLine; i < segs.length && nLines < SL.legs; i++){
      if (segs[i].s1 > endS) break;
      chain.push(segs[i]);
      if (segs[i].type === 'line') nLines++;
    }
    while (chain.length && chain[chain.length - 1].type !== 'line') chain.pop();

    const linesArr = chain.filter(g => g.type === 'line');
    if (!linesArr.length) return null;

    lastDiag = { asked: SL.legs, got: linesArr.length,
                 arcs: chain.filter(g => g.type === 'arc').length };
    return {
      segs: chain,
      lines: linesArr,
      arcs: chain.filter(g => g.type === 'arc'),
      nLines: linesArr.length,
      span: linesArr.reduce((m, g) => m + (g.s1 - g.s0), 0),
      score: gradeOver(route, chain[0].s0, chain[chain.length - 1].s1),
      fList: linesArr.map(g => g.f),
    };
  }

  /* ============ THE FURNITURE IS NOT IN ANY ARRAY ============
     The corridor sweep below empties hazards[] and props[], and the last
     leg still grew lamps, palms and planters — because block furniture is
     DECORATION: queueStreetFurniture draws it per visible block, per
     frame, from a seeded rng, and it never enters an array a filter could
     reach. Deleting it is meaningless; it is back next frame.

     The game already has the right mechanism: routeCells, the exclusion
     hash the scatter consults before planting anything. The walk rows
     stamp FURNISH_CLEAR (340) around themselves and the verge begins just
     past that — which is the point of the verge, and exactly why the
     course still read cluttered: every surviving piece was legal, thirty
     units outside a boundary drawn for delivery, in frame the whole way.

     So the lab stamps MORE cells into the SAME Set the draw pass reads —
     no second gate to drift against — along the sweep's own [from, to]
     corridor, both frontages of the street, pushed past the verge. Only
     cells not already present are recorded, and unstamping removes
     exactly those, so the delivery town outside the lab keeps every
     piece of furniture it arrived with. Re-stamping starts by unstamping:
     a rebuild with a shorter corridor must not leave the old one bald. */
  let stampedCells = [];
  function slUnstampFurnish(){
    const cells = scene.route && scene.route.routeCells;
    if (cells) for (const c of stampedCells) cells.delete(c);
    stampedCells = [];
  }
  function slStampFurnish(from, to){
    slUnstampFurnish();
    const cells = scene.route && scene.route.routeCells;
    if (!cells) return;
    /* offOf carries ROBOT_SIDE's sign, so negating it crosses the road:
       four anchors span both walk bands, near frontage and far. */
    const offs = [offOf(0), offOf(3), -offOf(0), -offOf(3)];
    /* +150 reaches past the verge (46 + up to 34 of jitter) with margin,
       measured from anchors already sitting at the band edges. */
    const R = Math.ceil((FURNISH_CLEAR + 150) / FURNISH_CELL);
    for (let s = from; s <= to; s += TILE){
      const p = scene.posAt(s), h = scene.headingAt(s);
      for (const off of offs){
        const ci = Math.round((p.x + (-Math.sin(h)) * off) / FURNISH_CELL);
        const cj = Math.round((p.y + Math.cos(h) * off) / FURNISH_CELL);
        for (let a = -R; a <= R; a++) for (let b = -R; b <= R; b++){
          const key = (ci + a) + "," + (cj + b);
          if (!cells.has(key)){ cells.add(key); stampedCells.push(key); }
        }
      }
    }
  }

  function slBuildCourse(){
    const ch = slFindChain(scene.route);
    if (!ch){
      /* Clear any gates left over from a previous build. Stale cones on a route
         with no course is the most misleading thing this lab can put on screen:
         it looks like a course that stopped working rather than one that was
         never placed. */
      scene.route.hazards = scene.route.hazards.filter(h => !h.slRole);
      run.cones = []; run.gates = [];
      run.fail = 'no legs found on this route';
      return null;
    }
    run.fail = '';

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
      run.fail = 'no continuous sidewalk on the opening leg';
      return null;
    }

    const course = {
      chain: ch, spawnS, nLines: ch.nLines,
      grade: ch.score, fList: ch.fList,
      arcSpans: ch.arcs.map(M => [M.s0, M.s1]),
    };

    /* Alternation runs on ONE counter for the whole chain, so the weave never
       repeats a side at a handoff and the colours stay honest across every
       turn, not just the first. */
    /* ============ THE WHOLE BAND, NOT TWO LANES ============
       With two rows, "pass on the side the OTHER row is on" is well defined
       because there is only one other row. With four it is not, so the rule
       generalises: each cone must be passed on the side of the NEXT gate. The
       row sequence becomes a path, and every cone is an obstacle sitting on the
       line you are leaving — which is what a slalom actually is.

       Row choice is a seeded random walk across [rowLo, rowHi], weighted 1/|d|
       so single-row moves stay common and a three-row lunge is rare. Same row
       twice running is excluded: a gate you can take without moving is not a
       gate.

       SPACING IS COUPLED TO THE MOVE. A hop crosses one row in 480ms, so a
       two-row change needs two hops and about twice the road. Uncoupled, wide
       moves at tight spacing would be unanswerable in exactly the way the
       mid-arc gates were — physically impossible rather than hard. Each gate's
       interval is therefore scaled by its own row delta. */
    const rowLo = Math.min(SL.rowA, SL.rowB), rowHi = Math.max(SL.rowA, SL.rowB);
    const pickRow = (tag, cur) => {
      const opts = [];
      for (let x = rowLo; x <= rowHi; x++) if (x !== cur) opts.push(x);
      if (!opts.length) return cur;
      const w = opts.map(x => 1 / Math.abs(x - cur));
      const total = w.reduce((a, b) => a + b, 0);
      let r = hash01(seedStr + ':row:' + tag) * total;
      for (let i = 0; i < opts.length; i++){ r -= w[i]; if (r <= 0) return opts[i]; }
      return opts[opts.length - 1];
    };

    let k = 0;
    let curRow = RAMP_ROW;          // start on the ramp row, where the spawn sits
    let lastDelta = 1;
    const plantAt = (at, nextRow) => {
      const row  = curRow;
      const want = Math.sign(nextRow - row) || 1;
      lastDelta  = Math.max(1, Math.abs(nextRow - row));
      curRow = nextRow;
      scene.route.hazards.push({
        type:'cone', s: Math.round(at), row, f:0, hit:false,
        phi:0, phase:1, angVel:0, moving:false, pose:'standing',
        slide:0, slideVel:0,
        slRole:'gate', slIndex:k,
        slWant: want,
        /* want is a row delta: +1 heads toward row 3 (buildings), -1 toward
           row 0 (kerb). The colour is that fact and nothing else — no stored
           screen-space twin, because a second field saying almost the same
           thing is what let the two answers drift apart in the first place. */
        cone: want > 0 ? GATE_BLUE : GATE_RED,
        slKnocked:false, slJudged:false,
      });
      k++;
    };

    /* ============ SPACING VARIES, IN PHRASES ============
       SL.gap is the MEAN now, not the interval. SL.vary is how far either side
       of it the course is allowed to breathe.

       WHY A WAVE AND NOT JITTER. Per-gate randomness reads as sloppy placement
       rather than as design — the eye cannot tell an intentional tight section
       from a mistake if every gate differs from its neighbour. A slow sine over
       gate index gives RUNS of tight gates and runs of open ones, so the course
       has phrases: wind up, breathe, wind up again. The period is deliberately
       not a whole number of gates, so the pattern does not line up with the
       red/blue alternation and produce a visual moire.

       WHY IT IS SEEDED AND NOT RANDOM. Each leg's phase comes from a hash of
       the route date and the leg index, so one route always builds the same
       course. A slalom whose spacing changes between attempts cannot be raced
       against a par time or a previous best.

       WHY THE FLOOR IS HARD. A hop is 480ms; at ~0.15 units/ms that is 72 units
       of travel, and gap 1.40 is 129 units — about two hop-durations. Below
       that a gate stops being difficult and becomes unanswerable, because
       hop() physically cannot fire twice in the distance available. The clamp
       is at the same 1.40 the slider floors at, for the same reason. */
    /* One hop's road, at whatever the ceiling currently is. See V_BASE. */
    const GAP_MIN = 1.40 * SL.vmul;
    const hash01 = (str) => {
      let h = 2166136261;
      for (let i = 0; i < str.length; i++){
        h ^= str.charCodeAt(i); h = Math.imul(h, 16777619);
      }
      return ((h >>> 0) % 10000) / 10000;
    };
    const seedStr = (scene.route.dateStr || 'x');
    /* The wave only ever OPENS the spacing: mult runs 1 .. 1+vary, so gap is
       the TIGHTEST interval on the course rather than the average.

       A symmetric swing around the mean sounded right and clipped badly. At
       gap 1.60 with vary 0.35 the low half wants 1.04, which the floor rejects,
       so a third of the gates flat-lined at exactly 1.40 — the phrasing turned
       into stretches of identical minimum spacing, which is worse than uniform
       because it looks like the wave broke. Keeping the swing one-sided means
       the floor is a design decision instead of a clamp that fires. */
    const stepFor = (legIdx, n) => {
      const phase = hash01(seedStr + ':' + legIdx) * Math.PI * 2;
      const mult  = 1 + SL.vary * (0.5 + 0.5 * Math.sin(phase + n / 3.7));
      return Math.max(GAP_MIN, SL.gap * mult) * T2;
    };

    /* ============ NO GATES ON A CURB RAMP ============
       sidewalkend / sidewalkbegin are not decoration: crossingGroundAt drives
       botZ off them, and the ramp only works if the robot enters and leaves it
       in ONE lane. A gate demands a lane change, so a gate on a ramp asks for
       the one thing the geometry forbids — the same contradiction hop()'s
       mid-arc refusal already settles for turns.

       So an intersection is the SAME case as a turn, not a second rule: both
       are stretches where your lane is decided before you arrive. Blocked spans
       cover the crossing plus the two tiles of ramp either side of it. */
    const RAMP = 2 * T2;
    const blocked = (scene.route.crossings || [])
      .filter(cx => cx.kind !== 'turn')          // turn crossings ARE the arcs
      .map(cx => [cx.sA - RAMP, cx.sB + RAMP, 'crossing']);
    /* ============ KICKER RAMPS ============
       Reuses the hydrant challenge's pieces rather than inventing any:
         type "slab" + hjRole routes to hjDrawWedge — a TRAVEL-AXIS wedge you
           ride up, not the cross-slope trip heave the plain slab draws;
         hjSlabZ lifts the robot off any hjRole "kicker", and it is already
           live because the slalom runs in challenge mode;
         a hydrant carrying hjRole skips normal collision entirely — the game's
           own comment says leaving it on "would stop the robot dead at the
           first one instead of letting him fly over it".

       THE RUN-UP IS THE POINT. Clearing at full speed is only fair if you
       ARRIVE at full speed, and every gate costs a hop. So a kicker's approach
       and landing join `blocked`, the same list the crossings use — no gates
       from the run-up through the touchdown. One list, one rule. */
    /* LANDING follows the jump instead of being a flat 6 T2. A fixed reserve
       meant a short jump still blanked six tiles of road that could hold gates,
       and a long one could land past the end of its own exclusion. The run-up
       is trimmed too: 5.5 T2 is ~2.2s of clear road at full speed, ample to be
       back at the cap after the previous gate. */
    const RUNUP = SL.kRunup * T2, LANDING = SL.kReach * T2 * 1.15;
    const kickers = [];
    ch.lines.forEach((L, i) => {
      const room = (L.s1 - L.s0) - (RUNUP + LANDING + 4 * T2);
      if (room <= 0) return;
      /* ============ JUMPS BELONG EARLY IN THE LEG ============
         `room * (j + 0.5) / kickers` put a single kicker at the MIDDLE of its
         leg, and the landing reserve then ran on from there — on a short leg
         the touchdown and the corner's turn chute arrived at the same place,
         which is what "jumps at the end block" was. Two changes, and they are
         separate facts rather than one fudge:

         WHERE it goes — the divisor is tripled, so the spread is over the
         first THIRD of the leg. The jump is an opening beat now: run up, fly,
         then weave the rest of the block.

         WHERE it may NOT go — `latest` is a hard ceiling derived from what has
         to fit after it: the landing, the corner clearance, and the run-out.
         Anything past that is not a late jump, it is a jump landing on the
         turn, so it is dropped rather than nudged. */
      const latest = L.s1 - (LANDING + (SL.turn + SL.tail) * T2);
      for (let j = 0; j < SL.kickers; j++){
        const at = Math.round(L.s0 + RUNUP + (room * (j + 0.5)) / (SL.kickers * 3));
        if (at > latest) continue;
        if (blocked.some(([a, b]) => at > a - RUNUP && at < b + LANDING)) continue;
        kickers.push({ s: at, leg: i });
        blocked.push([at - RUNUP, at + LANDING, 'jump']);
      }
    });
    blocked.sort((x, y) => x[0] - y[0]);

    const isBlocked = (at) => blocked.some(([a, b]) => at >= a && at <= b);

    /* ============ THE GATES AIM YOU AT THE RAMP ============
       A jump used to arrive at the end of a corridor of nothing, and the row
       you took it in was decided by `curRow = RAMP_ROW` on the skip branch —
       which moves the bookkeeping row without planting a gate that ASKS for
       the move. The player got no cue that a lane mattered and no requirement
       to be in it; the lane was simply asserted behind his back.

       So the last two gates before a kicker are chosen rather than rolled. The
       one before last puts you on a row ADJACENT to the ramp lane; the last
       one puts you IN it. Read forwards that is a ladder that funnels into the
       lip, and because a gate's required side is derived from the next gate's
       row, the correct line through those two gates IS the line over the ramp.
       Taking the jump is now what happens when you play the gates properly,
       instead of a thing that happens to you in a gap.

       DISTANCE, NOT COUNT. The ladder is measured against the nominal step, so
       it stays two gates wide whatever the spacing dial says — at gap 1.4 it
       is a tight double-hop, at gap 3.0 it is a long committed setup, and
       neither needs its own number. */
    const jumpGapAt = (a) => {
      let best = Infinity;
      for (const sp of blocked)
        if (sp[2] === 'jump' && sp[0] >= a) best = Math.min(best, sp[0] - a);
      return best;
    };
    /* A row one off the ramp lane, preferring one inside the band the course
       is using and never the row we are already on — a gate you can take
       without moving is not a gate. */
    const setupRowFor = (cur, tag) => {
      const opts = [RAMP_ROW - 1, RAMP_ROW + 1]
        .filter(r => r >= rowLo && r <= rowHi && r !== cur);
      if (!opts.length) return null;
      /* Seeded, not opts[0]. Always taking the low side made every ramp on the
         course approach from the same lane, so the ladder read as one scripted
         move repeated rather than as a setup — and a course whose spacing is
         seeded for repeatability should not have a hand-picked constant in the
         middle of it. */
      return opts[Math.floor(hash01(seedStr + ":setup:" + tag) * opts.length) % opts.length];
    };

    /* GATES ON EVERY LINE. First line starts after the run-up, last ends before
       the run-out, everything between is bounded by the turn clearance — the
       chute owns those. Blocked spans are stepped over, not stopped at, so the
       weave picks straight back up on the far side of the crossing. */
    ch.lines.forEach((L, i) => {
      const isFirst = i === 0, isLast = i === ch.lines.length - 1;
      const from = isFirst ? spawnS + SL.lead * T2 : L.s0 + SL.turn * T2;
      const to   = isLast  ? L.s1 - SL.tail * T2   : L.s1 - SL.turn * T2;
      let n = 0;
      for (let at = from; at <= to && k < SL.n; n++){
        /* Jump the whole span plus turn clearance rather than stepping across
           it. Merely skipping blocked positions kept the alternation running,
           so the first gate past a crossing could land a few units off the exit
           ramp and demand a lane change while the robot was still on it — the
           exact thing excluding ramp gates was meant to prevent. A crossing now
           gets the same breathing room a turn does, on both sides. */
        const span = blocked.find(([a, b]) => at >= a - SL.turn * T2 && at <= b);
        if (span){
          /* Hand the player to the ramp row before the crossing and resume from
             it after. The ramp spans rows 0-2 only, so arriving on row 3 puts
             him off the side of it — and the chute walls at 0 and 2 would then
             sit somewhere he is not. */
          curRow = RAMP_ROW;
          /* Resume ONE tile past the span, not a full turn clearance past it.
             SL.turn was being spent on both sides of every crossing and every
             jump — and with a crossing on most legs that is two corner-widths
             of empty walk per block, taken straight out of the gate count. The
             far side of a crossing is a plain straight; the reason gates were
             excluded was the RAMP, and the ramp is already inside the span. */
          at = span[1] + T2; n = 0; continue;
        }
        /* nominal step, before the multi-row stretch — the ladder asks "how
           many gates from here", and the stretch is a consequence of the row
           choice this line is about to make, so using it here would be
           circular. */
        const step = stepFor(i, n);
        const dJump = jumpGapAt(at);
        let nextRow = null;
        if (dJump <= step * 1.35)      nextRow = RAMP_ROW;            // last gate
        else if (dJump <= step * 2.70) nextRow = setupRowFor(curRow, i + ":" + n); // the one before
        /* Fall through to the random walk whenever the ladder has nothing to
           say, INCLUDING when it names the row we are already standing in. */
        if (nextRow === null || nextRow === curRow)
          nextRow = pickRow(i + ':' + n, curRow);
        plantAt(at, nextRow);
        at += stepFor(i, n) * (1 + (lastDelta - 1) * SL.wide);
      }
    });

    /* THE CHUTE, on every arc in the chain.
       An arc cannot hold gates — hop() refuses to fire mid-arc, so a cone you
       must change lanes around is a gate you are physically unable to answer.
       It gets a wall instead, lining the rows either side of the lane the last
       gate committed you to.

       Spacing is a plain step in route-s at 0.55 of a gate gap. An earlier pass
       "corrected" this to even world spacing, on the theory that equal s is not
       equal world distance at different arc radii. True, and it looked worse —
       it stretched the wall out and lost the tight read that made the corner
       work. The bunching on the inner radius IS the look. Reverted
       deliberately; do not re-fix it. */
    const gatesNow = () => scene.route.hazards
      .filter(h => h.slRole === 'gate').sort((x, y) => x.s - y.s);
    const cstep = SL.gap * T2 * 0.55;

    /* ONE chute routine for both cases. An intersection and a turn pose the
       identical problem — hold the lane you arrived in — so they get identical
       marking rather than two near-copies that can drift apart. The lane is
       whichever one the last gate before the span committed you to, so the
       walls always open where the player already is. */
    /* CROSSINGS GET A LONGER STRIDE THAN CORNERS, and that is a statement
       about the two shapes rather than a budget dodge.

       A corner's bunching on the inner radius IS the look — the note above says
       so and says not to re-fix it. A crossing is a straight run and it is
       LONG: sA/sB span the full road width, plus two tiles of ramp either side,
       which is twelve tiles. At the corner's own step that is 32 cones for one
       junction, and twelve legs of it is 384 — more than the whole cone budget,
       so with crossings planted first the corners would now starve instead.
       Neither is worth 32 cones: the wall only has to READ as a wall, and a
       dashed one does that at speed while a solid one just costs frames.

       Budgets are split rather than shared for the same reason the order was
       changed — whichever ran second was getting nothing. */
    const plantChute = (from, to, step, cap) => {
      const lane = RAMP_ROW;
      for (let at = from; at <= to; at += step){
        for (const r of [lane - 1, lane + 1]){
          if (r < 0 || r > 3 || chuteN >= cap) continue;
          chuteN++;
          scene.route.hazards.push({
            type:'cone', s: Math.round(at), row: r, f:0, hit:false,
            phi:0, phase:1, angVel:0, moving:false, pose:'standing',
            slide:0, slideVel:0,
            /* r < lane sits between the robot and the road, so it is taken on
               its building side; r > lane is taken on its road side. Derived
               from the wall's own row rather than stored, so it cannot fall out
               of step with where the wall actually is. */
            slRole:'chute', cone: r < lane ? CHUTE_BLUE : CHUTE_RED,
            slKnocked:false, slJudged:true,
          });
        }
      }
    };
    /* SL.n caps GATES; the chute was uncapped, and at ten legs it adds ~110
       cones of its own. Every cone is a physics body and a depth-sorted draw
       every frame, so the total is what costs, not the gate count. */
    let chuteN = 0;
    const CHUTE_MAX  = Math.round(SL.n * 0.90);
    const CROSS_STEP = cstep * 1.9;                       // dashed, not solid
    const CROSS_MAX  = Math.round(CHUTE_MAX * 0.55);      // junctions get first call
    /* ============ ORDER IS THE FIX, AND SO IS THE FILTER ============
       The crossing chutes were missing on-device, and neither cause was in the
       crossing code.

       CAUSE ONE — `blocked` is not a list of crossings. The kicker loop pushes
       its run-up and landing into the same array, so this loop was walling both
       sides of every jump approach: RUNUP + LANDING is ~11 T2, which at a
       0.55-gap step is about 28 cones PER KICKER. Twelve legs of that is ~336
       cones against a CHUTE_MAX of 300 — the budget was gone before the loop
       ever reached a real junction. A jump does not need walls either: the
       run-up is already gate-free by the same `blocked` list, and the wedge has
       its own silhouette. Jump spans are skipped outright.

       CAUSE TWO — the arcs ran first and they are uncapped in their own right.
       Even with the jumps gone, a long chain's corners can spend the budget.
       Crossings are planted FIRST now, because a coned junction is what stops
       the cars (course.coneNodes is built from the same spans) and a corner
       that runs a little short of cones is cosmetic where a junction that does
       is a car driving through the course. */
    const chainEndS = ch.lines[ch.lines.length - 1].s1;
    for (const [a, b, kind] of blocked){
      if (kind !== 'crossing') continue;
      if (b < course.spawnS || a > chainEndS) continue;
      plantChute(a, b, CROSS_STEP, CROSS_MAX);
    }
    for (const M of ch.arcs) plantChute(M.s0 - SL.turn * T2 * 0.5,
                                       M.s1 + SL.turn * T2 * 0.5,
                                       cstep, CHUTE_MAX);

    /* WHERE THE CONES ARE, NOT WHERE THE ROAD CROSSES.
       This used to be posAt(midpoint) — a point on our own road's CENTRELINE.
       The cones are not there: they sit out on the walk band at
       laneOffset(RAMP_ROW), roughly ROAD_HALF + 1.5*T2 to the side. So cars
       were stopping 1.3*T2 short of the junction centre, which is well past the
       cone line — they drove over the cones and then halted on top of them.

       The node is now built with the SAME expression the cones were placed
       with, so the stop line cannot drift away from the thing it is protecting.
       Sampled at both ends of the span as well as the middle: a car crossing at
       an angle can slip between two widely spaced points. */
    const conePos = (at) => {
      const p = scene.posAt(at), h = scene.headingAt(at), off = offOf(RAMP_ROW);
      return { x: p.x + (-Math.sin(h)) * off, y: p.y + Math.cos(h) * off };
    };
    course.coneNodes = [];
    const addSpan = (a, b) => {
      for (const u of [0, 0.5, 1]) course.coneNodes.push(conePos(a + (b - a) * u));
    };
    for (const M of ch.arcs) addSpan(M.s0, M.s1);
    for (const [a, b, kind] of blocked){
      if (kind !== 'crossing') continue;   // a jump run-up is not a junction
      if (b < course.spawnS) continue;
      addSpan(a, b);
    }

    /* Ramp, its two hydrants, and chevrons. All on RAMP_ROW: the jump lane has
       to be one the crossings also use, or the course would demand a lane
       change inside a run-up that forbids gates. */
    const kRow = RAMP_ROW;
    course.kickers = [];
    for (const kk of kickers){
      const f = ((Math.round(scene.headingAt(kk.s) / (Math.PI/2)) % 4) + 4) % 4;
      scene.route.hazards.push({
        type:'slab', hjRole:'kicker', s: kk.s, row: kRow, f,
        lift: SL.kLift, hjDir: 1, root: false, hit: true, slRole:'jump',
      });
      /* two hydrants under the arc, past the lip */
      /* EVERYTHING DOWNRANGE IS MEASURED FROM THE LIP.
         The arc measures its reach from lipS = kk.s + TILE, but these were laid
         out from kk.s — one TILE adrift — and the catch ramp then took a 0.88
         factor on top. Touchdown at kk.s+506 against a deck spanning 359..451:
         he cleared the catch ramp by 55 units every single jump. Not physics, a
         coordinate mismatch between the code that builds the course and the
         code that flies it.

         Same origin for both now, so the arc and the furniture cannot disagree. */
      const reach = SL.kReach * T2;
      const lipS  = kk.s + TILE;
      const hyd = [lipS + reach * 0.34, lipS + reach * 0.56];
      for (const hs of hyd)
        scene.route.hazards.push({
          /* facingAt is a LOCAL inside generateRoute, not a global — and a
             `facingAt ? ... : 0` guard does not save you, because referencing
             an undeclared identifier throws before the ternary is evaluated.
             The facing is just the quantized heading, computed above for the
             ramp; the hydrant shares it. */
          type:'hydrant', hjRole:'hydrant', s: Math.round(hs), row: kRow,
          f, burst:false, hit:true, slRole:'jump',
        });
      /* CHEVRONS out of the chute cones. A V of white cones narrowing into the
         lip reads as a ramp marking at speed and costs no new renderer — the
         alternative was a bespoke draw hook for four painted triangles. */
      /* NO CHEVRON CONES. They were white chute cones in a narrowing V, and
         on a course that already carries a few hundred cones they read as more
         slalom rather than as a marking — the ramp got lost in its own warning.
         The wedge is a distinct silhouette with its own renderer; if it needs
         calling out, that is a job for paint on the deck, not more cones. */

      /* Catch deck centred just short of touchdown (lipS + reach), so the
         landing happens ON the deck rather than at its far lip. The deck is
         2 TILE wide, so 0.96 puts touchdown comfortably inside it. */
      const catchS = Math.round(lipS + reach * 0.96);
      scene.route.hazards.push({
        type:'slab', hjRole:'catch', s: catchS, row: kRow, f,
        lift: SL.kLift, hjDir: -1, root: false, hit: true, slRole:'jump',
      });
      course.kickers.push({ s: kk.s, lip: lipS, hyd, row: kRow, catchS });
    }

    course.startRow = RAMP_ROW;
    course.nGates = k;
    course.nChute = chuteN;
    course.finishS = Math.round(gatesNow().reduce((m, h) => Math.max(m, h.s), 0)
                                + SL.tail * T2);
    /* Built HERE, not earlier: the tape is placed at course.finishS, and
       finishS is only known once the last gate is planted. Called before this
       line it read undefined, posAt(undefined) returned NaN, and the ribbon was
       built at nowhere — present in the data, invisible on screen. */
    slBuildFinish(course);

    /* ============ A SPECIALITY COURSE IS EMPTY ============
       Speed-and-agility run: everything that is not a cone comes out of the
       corridor. Runs AFTER planting and preserves slRole, so it cannot eat its
       own gates.

       STRUCTURE IS NOT CLUTTER. The curb ramps are HAZARDS, not props, so
       clearing every hazard in range deleted the ramp ART while the ramp
       PHYSICS carried on from route.crossings — the wheels climbed a ramp that
       was not drawn. It also starved buildWorldCurbRamps, which filters these
       same hazards.

       Traffic is left alone: the cars are on the road, the course is on the
       walk, and an empty street reads as a dead city. */
    /* ============ THE CORRIDOR IS SIZED TO THE FRAME, NOT THE COURSE ============
       This window ended at finishS + 2 T2 — two tiles past the last gate. Two
       tiles is the right margin for the COURSE, and it is nowhere near the
       right margin for the PICTURE: on the final leg the camera is pointed
       down the street you are about to stop in, and everything it shows past
       the finish was never in the corridor. On-device that read as the last
       leg being cluttered, and the props were not misbehaving — they were
       outside a boundary drawn for a different purpose.

       So the end is whichever is further, the finish tape or the end of the
       last leg, plus SL.clean tiles of sightline. The chain end matters
       independently: the tape can sit well short of the leg's own s1, and the
       rest of that leg is still in shot.

       The start keeps its two tiles. You are facing away from it. */
    const from = course.spawnS - T2 * 2;
    const to   = Math.max(course.finishS, chainEndS) + SL.clean * T2;
    const inRange = v => v >= from && v <= to;
    const STRUCTURE = { sidewalkend:1, sidewalkbegin:1, sidewalkbeginTurn:1, grade:1 };
    const before = scene.route.hazards.length + (scene.route.props || []).length;
    scene.route.hazards = scene.route.hazards.filter(h =>
      h.slRole || STRUCTURE[h.type] || !inRange(h.s));
    scene.route.props   = (scene.route.props || []).filter(pr => !inRange(pr.s));
    if (scene.route.crime && inRange(scene.route.crime.s)) scene.route.crime = null;
    slStampFurnish(from, to);
    course.cleared = before - (scene.route.hazards.length + scene.route.props.length);
    return course;
  }

  /* A throw in the build used to take the whole lab with it: no panel update,
     no message, nothing on screen to say what happened — which reads exactly
     like the page failing to load. Whatever goes wrong now ends up in the red
     strip with its message intact. */
  function slBuild(){
    try { return slBuildCourse(); }
    catch(e){
      console.log('slalom build failed', e);
      run.fail = 'build failed: ' + (e && e.message ? e.message : e);
      scene.route.hazards = (scene.route.hazards || []).filter(h => !h.slRole);
      run.cones = []; run.gates = [];
      return null;
    }
  }

  function slResetRun(){
    document.getElementById('slCard')?.remove();
    /* State reset happens BEFORE the course build, unconditionally. It used to
       sit after the early return, so a failed corridor search left the robot in
       whatever state he was already in — frozen, with an error that flashed for
       2.2s and vanished. A lab that fails should fail loudly and leave you able
       to drive. */
    scene.state = 'play'; scene.tipT = 0; scene.damage = 0;
    scene.hjSkidV = 0; scene.hjTipT = 0; scene.hjFace = false; slPrevState = 'play'; slPrevSpeed = 0;
    scene.hopAnim = null; scene.hopYaw = 0; scene.hopKick = 0;
    slQuietOpening();
    run.done = false;
    run.course = slBuild();
    /* knock-watch covers chute cones too; gate-only counts read slRole */
    run.cones  = scene.route.hazards.filter(h => h.slRole);
    run.gates  = scene.route.hazards.filter(h => h.slRole === 'gate');
    run.started = false; run.done = false;
    run.phase = 'count'; run.countT0 = performance.now();
    run.elapsed = 0; run.pen = 0; run.cleared = 0; run.faults = [];
    if (!run.course){ run.phase = 'idle'; return; }
    run.fail = '';
    /* Asked-vs-got, in the strip. `legs 12` on the chip with a seven-leg
       course looks like the chip is broken; it is the road running out at the
       lap cut, and that is worth saying out loud rather than leaving the
       number to be discovered by counting corners. */
    const short = lastDiag.got < lastDiag.asked ? ` (asked ${lastDiag.asked})` : '';
    run.msg = `${run.course.nLines} legs${short} · ${run.course.nGates} gates · ` +
              `${run.course.nChute} chute · ${run.course.nGates + run.course.nChute} cones`;
    run.msgT = performance.now();

    /* Start on the row the course was BUILT from. The first gate's required
       side is computed against this row, so spawning anywhere else makes gate
       one either free or impossible. It is the ramp row for the same reason the
       chute is: rowA is now the low edge of the band, not a lane. */
    scene.botRow = (run.course && run.course.startRow !== undefined)
      ? run.course.startRow : 1;
    scene.laneOff = offOf(scene.botRow);
    scene.botS = run.course.spawnS;
    scene.speed = 0; scene.tilt = 0; scene.roll = 0;
    scene.hjAir = null; scene.pitch = 0; flightPrevS = scene.botS;
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
        const side = cone.slWant > 0 ? 'the building side' : 'the road side';
        const col  = cone.slWant > 0 ? 'blue' : 'red';
        run.pen += SL.pen;
        run.faults.push(`#${cone.slIndex + 1} ${col} — should have passed on ${side}`);
        run.msg = `${col}: pass on ${side} — +${SL.pen.toFixed(1)}s`;
        run.msgT = performance.now();
      }
    }

    /* Break the tape rather than pass an s value. segCross tests the robot's
       actual travel segment this frame against the ribbon, so a fast finish
       cannot tunnel through it between frames — which is the whole reason the
       crime scene does it this way. */
    if (!run.done && c.finishTape){
      const p0 = { x: run.lastX !== undefined ? run.lastX : scene.botX,
                   y: run.lastY !== undefined ? run.lastY : scene.botY };
      const p1 = { x: scene.botX, y: scene.botY };
      if (segCross(p0, p1, c.finishTape.a, c.finishTape.b)){
        c.finishTape.broken = true;
        c.finishTape.brokeAt = performance.now();
        run.done = true;
        slShowCard();
      }
    }
    run.lastX = scene.botX; run.lastY = scene.botY;
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
  /* =========================================================================
     THE FLIGHT — lab-owned, so the slalom keeps its throttle
     -------------------------------------------------------------------------
     hjSim has all of this already and it is tuned, but it returns immediately
     unless route.challenge exists — and setting that also arms the tap-meter
     override at 10963, which dictates this.speed every frame and takes the
     controls away from the course. So the arc is re-derived here instead.

     It writes scene.hjAir, which is the game's OWN air state: the draw path
     reads it for height and the landing/pitch logic keys off it. Since hjSim is
     dormant, nothing else touches it — the field is free to borrow, and
     borrowing it means the robot leaves the ground through the same channel the
     hydrant challenge uses rather than a second parallel one.

     THE CLEARANCE TEST IS THE JUMP. Two hydrants sit under the arc, and the
     game skips their normal collision because they carry hjRole. Height is
     checked as each is crossed, exactly as hjSim does it: below HYD.height plus
     clearance and you clip, which kills the arc rather than merely costing
     time. Clean at full speed, short if you hopped late and bled speed on the
     run-up.
     ========================================================================= */
  /* slFlight keeps its OWN previous-s. It used to read prevS, which slJudge
     owns — and slJudge runs first in onPost and sets prevS = botS at its end.
     So by the time this ran, s0 === s1 and the lip-crossing test
     (s0 < lip && s1 >= lip) could never be true. The launch never fired once.
     Two consumers, two cursors: sharing one was the bug. */
  let flightPrevS = 0;
  /* REACH AND PEAK ARE THE DIALS; pow and grav are DERIVED.
     The first pass exposed pow and grav directly and I picked 0.052 and
     0.00019 by eye. HJ_JUMP states the actual relationships —
     reach = 2*v^2*pow/grav and peak = v^2*pow^2/(2*grav) — and those numbers
     work out to an apex of 0.36 world units. A hydrant is 20 tall. He never
     left the ground; the wedge lift was doing all the visible work, which is
     exactly what "not clearing cleanly" looks like.

     Inverting the pair gives pow = 4*peak/reach and grav = 8*v^2*peak/reach^2,
     so the two things actually worth choosing are the two things exposed. It
     also makes the constants answer one question each instead of two people
     arguing about the same trajectory.

     vTop() is the speed the jump is BUILT for — full throttle. Arrive slower
     and you land short, which is the mechanic: the run-up has no gates so
     there is no excuse for arriving slow. */
  /* ============ ONE SPEED, THREE THINGS THAT DEPEND ON IT ============
     V_BASE is delivery's ceiling and the number every other constant in this
     file was quietly calibrated against. SL.vmul raises the ceiling, and three
     things have to follow it up or the course stops being a course:

       THE JUMP. Reach goes as (v / vTop())^2. Leave that at 0.225 and
       arrive at 0.45 and you fly FOUR times the designed distance, straight
       past the catch deck. So vTop() IS the raised ceiling, and jumpGrav
       re-solves against it — the ramp is rebuilt for the new speed rather than
       being overshot at it.

       THE SPACING FLOOR. GAP_MIN is not a taste value, it is one hop's worth
       of road: a hop takes 480ms, which at 0.225 covers 1.17 T2, hence 1.40
       with margin. Double the speed and a hop covers 2.35, so a gate on the
       old floor is unanswerable — unclearable rather than hard, which is the
       exact failure this file already warns about at the gap dial. The floor
       scales with the ceiling.

       CORNERING TILT, which deliberately does NOT get compensated. It scales
       with speed squared against a fixed 1.0 fail line, so the equilibrium is
       0.85 at 0.225 and about 3.4 at 0.45 — a corner taken flat out tips you
       in ~166ms. That is the point: the fail line sits just above delivery's
       top speed, so the event's skill is sprint the straights and brake into
       the corners. Braking sheds 0.45 to a survivable 0.25 in ~270ms, roughly
       one tile, so it is a demand rather than a wall.

     PAR IS NOT SCALED. It is a dial you set, and silently rewriting a number
     the player chose is how a panel starts lying. Faster runs will beat 52 by
     a mile until you retune it. */
  const V_BASE = 0.225;
  const vTop = () => V_BASE * SL.vmul;

  /* THE LAUNCH HEIGHT IS PART OF THE TRAJECTORY.
     reach = 2*v^2*pow/grav is the symmetric case — launch and landing at the
     same height. He leaves the LIP, at z = kLift, and lands at ground, so there
     is an extra kLift to fall and the flight runs long: 525 units against a
     designed 460, and the catch ramp sat at 0.94 of 460. He flew past it.

     Solving the real thing instead. With apex P above the lip and launch height
     z0, flight time is sqrt(2/g)*(sqrt(P) + sqrt(P+z0)), so

         grav = 2 * ( v*(sqrt(P) + sqrt(P+z0)) / reach )^2
         pow  = sqrt(2*grav*P) / v

     Now `reach` means the distance he actually travels, which is what the word
     was supposed to mean all along and what the catch ramp is placed against. */
  const jumpGrav = () => {
    const P = SL.kPeak, z0 = SL.kLift, R = SL.kReach * T2;
    return 2 * Math.pow(vTop() * (Math.sqrt(P) + Math.sqrt(P + z0)) / R, 2);
  };
  const jumpPow = () => Math.sqrt(2 * jumpGrav() * SL.kPeak) / vTop();

  /* =========================================================================
     THE LANE IS THE GATE
     -------------------------------------------------------------------------
     A kicker sits on ONE row and its wedge is drawn on one row — hjDrawWedge
     lays the deck across +/-TILE cross-wise about laneOffset(hz.row), which is
     half a row either side of the centre and therefore exactly that row and no
     other. Crossing the lip from row 3 launched anyway, so the ramp was a
     trigger at an s value wearing a picture of a ramp.

     ONE PREDICATE, BOTH CONSUMERS. The same test decides whether you fly and
     whether the deck holds you up, because they are the same question — am I
     on the ramp — and answering it twice is how the two drift apart. It is
     written against the wedge's own draw geometry rather than a row equality,
     so a mid-hop laneOff resolves the way the picture does: clip the edge of
     the deck and you get the deck's answer, not a rounded row's.

     hjSlabZ is the second consumer and it lives on the scene, not here. It
     loops kicker and catch hazards on `s` alone and returns hjWedgeTop for any
     within a TILE — row-blind — so a robot in row 3 was being lifted onto a
     deck drawn a lane and a half away. It is wrapped for the duration of the
     lab and handed back by slOff, in preference to editing the game file for
     something only a speciality course can currently reach. */
  const onWedgeLane = hz => Math.abs(scene.laneOff - offOf(hz.row)) < TILE;

  const slSlabZ0 = scene.hjSlabZ.bind(scene);
  scene.hjSlabZ = function(ss){
    if (!run.course) return slSlabZ0(ss);
    for (const hz of this.route.hazards){
      if (hz.hjRole !== 'kicker' && hz.hjRole !== 'catch') continue;
      if (Math.abs(ss - hz.s) >= TILE) continue;
      return onWedgeLane(hz) ? this.hjWedgeTop(hz, ss - hz.s) : 0;
    }
    return 0;
  };

  function slFlight(dt){
    const c = run.course;
    if (!c || !c.kickers || !c.kickers.length){ flightPrevS = scene.botS; return; }
    const s0 = flightPrevS, s1 = scene.botS;
    flightPrevS = s1;

    if (!scene.hjAir){
      for (const kk of c.kickers){
        if (!(s0 < kk.lip && s1 >= kk.lip)) continue;
        /* Told, not silently dropped. A ramp that does nothing reads as a
           broken ramp; a ramp that says you were in the wrong lane reads as a
           rule, and it is the rule the chute cones were already drawing. */
        if (!onWedgeLane(kk)){
          run.msg = 'wrong lane — no jump';
          run.msgT = performance.now();
          continue;
        }
        if (scene.speed >= 0.10){
          /* THE ARC IS A FUNCTION OF DISTANCE, NOT OF TIME.
             Integrating vz and z against dt kept landing long. Horizontal
             travel comes from the game's own botS integration using ITS delta;
             the fall was using mine, clamped at 34ms. On any frame the two
             disagree he travels further than he falls, and the error only ever
             accumulates one way.

             So the height is evaluated from how far he has gone. Same parabola
             — z0 + vz*T*u - g*(T*u)^2/2 with T = R/v and u the fraction of the
             reach covered — but with dt algebraically gone, touchdown lands at
             exactly R however the frame rate behaves.

             R scales with the SQUARE of launch speed, which is the real
             relationship for projectile range. Arrive under vTop() and you
             land short; that is still the mechanic, and now it is exact rather
             than emergent from an integrator. */
          const v = scene.speed;
          const R = SL.kReach * T2 * Math.pow(v / vTop(), 2);
          const g = jumpGrav(), vz = v * jumpPow(), T = R / Math.max(v, 1e-6);
          scene.hjAir = {
            lipS: kk.lip, R, T, vz, g, z: SL.kLift, z0: SL.kLift,
            idx: 0, kk, clipped: false,
          };
          run.msg = 'AIR'; run.msgT = performance.now();
          break;
        }
      }
      return;
    }

    const A = scene.hjAir;
    const u  = Phaser.Math.Clamp((s1 - A.lipS) / A.R, 0, 1.4);
    const tt = A.T * u;
    A.z  = A.z0 + A.vz * tt - 0.5 * A.g * tt * tt;
    A.vz_now = A.vz - A.g * tt;          // sign only, for the pitch and the landing test

    while (A.idx < A.kk.hyd.length){
      const hs = A.kk.hyd[A.idx];
      if (s1 < hs) break;
      A.idx++;
      if (A.z < HYD.height + 6){
        A.vz = -Math.abs(A.vz) - 0.01;
        A.clipped = true;
        run.pen += SL.pen;
        run.faults.push('clipped a hydrant');
        run.msg = `clipped — +${SL.pen.toFixed(1)}s`; run.msgT = performance.now();
      }
    }

    scene.pitch = Math.atan2(A.vz_now, Math.max(scene.speed, 1e-4)) * 0.6;

    /* Ground height under the robot is whatever hjSlabZ says — which is the
       catch ramp's deck while he is over it. Landing against 0 instead would
       sink him through the ramp he is supposed to touch down on. */
    const gz = scene.hjSlabZ ? scene.hjSlabZ(s1) : 0;
    if (A.vz_now < 0 && A.z <= gz){
      const clean = !A.clipped;
      scene.hjAir = null;
      scene.pitch = 0;
      A.z = gz;
      const flew = (s1 - A.lipS) / T2;
      if (clean){
        run.msg = `clean landing — ${flew.toFixed(2)} T2 flown (target ${(A.R/T2).toFixed(2)})`;
        run.msgT = performance.now();
      }
      else scene.tilt += 0.25;      // a clipped landing costs stability, not the run
    }
  }

  /* =========================================================================
     FINISH LINE — the crime tape, restated
     -------------------------------------------------------------------------
     WHAT IS REUSED: segCross, verbatim. Its comment gives the reason it exists
     and it is the same reason a finish line needs it — "the ribbon is a thin
     line and the robot is fast enough to step clean over a box between frames;
     testing the robot's previous-to-current travel segment against the span
     cannot tunnel at any frame rate." A finish tested by s-position alone is a
     box test wearing different clothes; this one cannot be skipped past.

     WHAT IS NOT: drawTapeSpan indexes route.crime.tape[i] and reads the crime
     scene's own break timers, so it cannot draw a ribbon that is not part of a
     crime scene. The ribbon is drawn here instead, through BENCH.queue so it
     depth-sorts against the world like anything else.

     ONE span, not three. The crime cordon is a U — across the walk, along the
     kerb, back across — because it seals an area. A finish line seals nothing;
     it marks a moment, so it is the single cross-walk span and no more.

     It hangs at TAPE.z and snaps on contact using TAPE.snapMs, so it reads as
     the same object the city already uses.
     ========================================================================= */
  function slBuildFinish(course){
    const at = (ss, off) => {
      const p = scene.posAt(ss), h = scene.headingAt(ss);
      return { x: p.x + (-Math.sin(h)) * off, y: p.y + Math.cos(h) * off };
    };
    const kerb = ROBOT_SIDE * (ROAD_HALF + TAPE.inset);
    const bldg = ROBOT_SIDE * (ROAD_HALF + SIDEWALK_W - TAPE.inset);
    course.finishTape = { a: at(course.finishS, bldg), b: at(course.finishS, kerb),
                          broken: false, brokeAt: 0 };
  }

  /* Drawn from BENCH.hook, which fires DURING the frame, rather than from
     postupdate. BENCH.queue pushes into scene.__benchVQ, and drawWorld drains
     that list while it runs — so anything queued from postupdate has already
     missed the pass that consumes it. */
  function slDrawFinish(){
    const c = run.course;
    if (!c || !c.finishTape || typeof BENCH === 'undefined' || !BENCH.queue) return;
    if (!isFinite(c.finishTape.a.x)) return;
    const T = c.finishTape;
    const mx = (T.a.x + T.b.x) / 2, my = (T.a.y + T.b.y) / 2;
    BENCH.queue(mx + my, (g) => {
      /* snap: the ribbon drops and swings aside once broken, on TAPE.snapMs */
      const k = T.broken
        ? Phaser.Math.Clamp((performance.now() - T.brokeAt) / TAPE.snapMs, 0, 1) : 0;
      const drop = k * TAPE.z * TAPE.hang;
      const N = TAPE.segs;
      for (let i = 0; i < N; i++){
        const t0 = i / N, t1 = (i + 1) / N;
        const px = (t) => T.a.x + (T.b.x - T.a.x) * t;
        const py = (t) => T.a.y + (T.b.y - T.a.y) * t;
        /* sag is a parabola across the span, plus the drop once it is cut */
        const zf = (t) => TAPE.z - TAPE.sag * 4 * t * (1 - t) - drop * (T.broken ? (1 - Math.abs(0.5 - t) * 2) : 0);
        const quad = [
          scene.W(px(t0), py(t0), zf(t0) + TAPE.half),
          scene.W(px(t1), py(t1), zf(t1) + TAPE.half),
          scene.W(px(t1), py(t1), zf(t1) - TAPE.half),
          scene.W(px(t0), py(t0), zf(t0) - TAPE.half),
        ];
        scene.quadOn(g, quad, i % 2 ? TAPE.band : TAPE.yellow, T.broken ? 0.75 : 1);
      }
      /* two stakes */
      for (const P of [T.a, T.b]){
        const post = [
          scene.W(P.x - 2, P.y - 2, TAPE.z + 6), scene.W(P.x + 2, P.y + 2, TAPE.z + 6),
          scene.W(P.x + 2, P.y + 2, 0),          scene.W(P.x - 2, P.y - 2, 0),
        ];
        scene.quadOn(g, post, TAPE.band);
      }
    });
  }

  const onPre  = () => {
    /* pickupWalk is rewritten by the timeline every frame, so it is held down
       every frame rather than once at reset — cheap, and it means a stray
       re-entry into the loading beat can never drag the camera off again. */
    scene.pickupWalk = 0;
    /* the speed the crash will inherit — stashed BEFORE update() runs,
       because the tilt-fail zeroes this.speed on the very frame it tips */
    if (scene.state === 'play') slPrevSpeed = scene.speed;
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
    }
  };
  /* =========================================================================
     TRAFFIC RESPECTS THE CONES
     -------------------------------------------------------------------------
     The chute at a crossing lies across the side street's roadway, so cars were
     driving straight through a coned-off junction.

     tr.hold is the entire mechanism, and it is the RIGHT one: trafficWorldAt
     subtracts it inside the single function the renderer and the collision
     check both call, so a held car is stopped everywhere at once. Its own
     comment warns that a stop implemented anywhere else — a flag the draw pass
     consults, a shadow position in the sim's bookkeeping — leaves that function
     returning the car's unstopped position.

     Two details lifted from updateCrimeTraffic, which solved this same problem
     for the cruiser:
       - holdFrame guards double-increment. Whichever pass reaches a car first
         owns its hold for that frame; two passes both adding dt push hold past
         t and the car drives BACKWARDS.
       - _trafHoldDt is the real elapsed time updateTrafficSpacing computed, not
         Phaser's clamped dt. Using dt here would drift against the spacing pass.

     This runs in postupdate, after the game's own traffic passes, so it only
     ever holds cars nothing else has already claimed this frame.

     No phase, unlike the crime scene: the cones do not clear, so the cars
     simply queue. That is the ask — they wait.
     ========================================================================= */
  const STOP_R    = 6 * T2;    // start looking this far back
  const STOP_LAT  = 1.6 * T2;  // ignore cars not actually aimed at it

  function slHoldTraffic(t, dt){
    const c = run.course;
    if (!c || !SL.trafficWaits || !scene.route.traffic) return;
    const nodes = c.coneNodes || [];
    if (!nodes.length) return;

    const hDt = scene._trafHoldDt !== undefined ? scene._trafHoldDt : dt;
    for (const tr of scene.route.traffic){
      if (tr.holdFrame === t) continue;              // someone else owns it
      const { wp, f } = trafficWorldAt(tr, t);
      const dv = DIRV[f], rv = DIRV[(f + 1) % 4];
      for (const nd of nodes){
        const dx = nd.x - wp.x, dy = nd.y - wp.y;
        const along = dx * dv.x + dy * dv.y;         // + means the node is ahead
        /* HOLD WHILE THE CONES ARE AHEAD AT ALL — no lower bound.
           The first version held only cars between STOP_LINE and STOP_R. A car
           creeps to a stop right AT STOP_LINE, and from there the least drift
           puts `along` under it, which released the car permanently: it eased
           over the line and drove on. That is a slow leak, not a missing hold,
           and it is why cars kept ending up parked on the cones.

           The bound is now simply "is the cone line still in front of me". A
           car past it (along <= 0) is released, so nothing is ever frozen ON
           the cones; a car short of it waits, indefinitely. The cones do not
           clear, so indefinitely is the correct answer. */
        if (along <= 0 || along > STOP_R) continue;
        if (Math.abs(dx * rv.x + dy * rv.y) > STOP_LAT) continue;
        tr.hold = (tr.hold || 0) + hDt; tr.holdFrame = t;
        break;
      }
    }
  }

  /* ============ THE THROTTLE FOLLOWS THE CEILING ============
     The lid moved but the engine did not. Delivery's integration is
     +0.00042/ms of throttle against v*0.0009/ms of friction — a terminal
     velocity of 0.4667. Delivery's 0.225 cap sits far under that, so it
     pins in ~730ms of full throttle. At vmul 2.0 the cap is 0.45 and the
     terminal is still 0.4667: 3.6% headroom, 0.000015/ms of net accel at
     the cap, ~3.7 seconds of flat uninterrupted throttle to touch it —
     road the course does not have — and any grade over ~0.05 drops the
     terminal BELOW the cap, making the double unreachable rather than
     slow. Arriving at 0.42 instead also prices every kicker at
     (0.42/0.45)^2 = 87% of designed reach, which is the "lands short"
     half of the same report.

     The supplement scales throttle by the same factor as the lid: an
     extra 0.00042*(vmul-1)/ms, so the effective terminal is 0.4667*vmul
     and the sprint to the cap is the same ~730ms whatever the ceiling.
     Applied in postupdate ON TOP of the game's own integration — the
     game's constants stay delivery's alone, exactly as the speedCap
     comment there promises. Skipped while airborne (the flight has no
     air control and reach was priced at launch) and during the count
     (onPre pins speed anyway). Braking untouched: shedding 0.45 to a
     corner-survivable 0.25 still costs roughly one tile, which is the
     demand the un-compensated corner tilt is built on. */
  /* ============ THE GRIP FOLLOWS THE CEILING TOO ============
     slThrottleBoost above made the cap reachable; reaching it made every
     corner a crash. The game's cornering tilt is v² · CORNER_TILT_COEF ·
     taper · dt · TILT_SENS — quadratic in speed, so vmul 2.0 is 4x the
     tilt of delivery and the spring never had a chance. The dial removes
     the multiplier's share: subtracting the fraction (1 − 1/vmul²) of
     the game's own contribution, recomputed here term for term, leaves
     exactly the baseline tilt at cap speed — corners at 2x feel like
     corners at 1x. SL.grip blends it: 1 is full compensation, 0 is raw
     physics for anyone who wants the original dare. Same postupdate
     pattern and the same 34ms dt clamp as the boost; a one-frame dt
     disagreement with the game's own integrator shades a feel dial, not
     a geometry invariant. */
  /* ============ THE CRASH KEEPS ITS MOMENTUM ============
     Delivery's tilt-fail throws the speed away on the spot (state =
     "tipped"; speed = 0) — a hard stop mid-corner. The hydrant jump
     crashes better: it banks the speed into hjSkidV and the game's own
     update loop slides him out with friction that rises as he goes flat
     (HJ_SKID.base + bite·tipT). That loop is gated on mode ===
     "challenge" — which this lab already sets — so the whole port is a
     HANDOFF, not a copy: onPre stashes the live speed while state is
     still play, and the frame the game flips play -> tipped, the stash
     goes into hjSkidV with a fresh grip ramp. The real HJ skid does all
     the sliding; if its tuning ever changes, this follows for free. */
  let slPrevSpeed = 0, slPrevState = 'play';
  function slSkidHandoff(){
    if (scene.state === 'tipped' && slPrevState !== 'tipped' && run.phase === 'live'){
      scene.hjSkidV = slPrevSpeed;
      scene.hjFace = false;
      scene.hjTipT = 0;
    }
    slPrevState = scene.state;
  }

  function slGripComp(dt){
    if (run.phase !== 'live' || scene.state !== 'play') return;
    const seg = scene.segAt(scene.botS);
    if (!seg || seg.type !== 'arc') return;
    /* two regimes: up to 1.0 the dial cancels the multiplier's share
       (fraction 1 − 1/vmul² of the game's contribution — nets delivery-
       baseline corners at cap speed). Above 1.0 it walks the REST of the
       way: at 2.0 the whole contribution is removed and corners are
       lean-free, because baseline delivery corners tip at full throttle
       by design and the slalom is a weave, not a braking test. */
    const base = 1 - 1/(SL.vmul*SL.vmul);
    const g2 = SL.grip <= 1 ? SL.grip * base
                            : Math.min(1, base + (SL.grip - 1) * (1 - base));
    if (g2 <= 0) return;
    const prog = Phaser.Math.Clamp((scene.botS - seg.s0)/(seg.s1 - seg.s0), 0, 1);
    const taper = prog < 0.4 ? 1 : Phaser.Math.Linear(1, 0.35, (prog - 0.4)/0.6);
    const v = scene.corneringSpeedSmooth;
    scene.tilt -= seg.sign * v*v * CORNER_TILT_COEF * taper * dt * TILT_SENS * g2;
  }

  function slThrottleBoost(dt){
    if (run.phase !== 'live' || scene.state !== 'play') return;
    if (scene.throttle !== 1 || scene.hjAir) return;
    const extra = 0.00042 * Math.max(0, SL.vmul - 1);
    if (!extra) return;
    scene.speed = Math.min(scene.speed + extra * dt, scene.speedCap || 0.225);
  }

  const onPost = (time, delta) => {
    try { slJudge(); } catch(e){ console.log('slJudge', e); }
    try { slFlight(Math.min(delta, 34)); } catch(e){ console.log('slFlight', e); }
    try { slThrottleBoost(Math.min(delta, 34)); } catch(e){ console.log('slThrottleBoost', e); }
    try { slGripComp(Math.min(delta, 34)); } catch(e){ console.log('slGripComp', e); }
    try { slSkidHandoff(); } catch(e){ console.log('slSkidHandoff', e); }

    try { slHoldTraffic(time, Math.min(delta, 34)); } catch(e){ console.log('slHoldTraffic', e); }
  };
  scene.events.on('preupdate',  onPre);
  scene.events.on('postupdate', onPost);
  scene._slRestore = () => {
    scene.events.off('preupdate',  onPre);
    scene.events.off('postupdate', onPost);
    slUnstampFurnish();
    scene.mode = origMode;
    scene.hjSlabZ = slSlabZ0;
    if (scene._slCap !== undefined){
      scene.speedCap = scene._slCap || undefined;
      delete scene._slCap;
    }
    const r = scene.route;
    if (r && r._slDoor !== undefined){
      r.doorS = r._slDoor; r.loop = r._slLoop;
      delete r._slDoor; delete r._slLoop; delete r._slEndS;
    }
    delete scene._slRestore;
  };

  /* =========================================================================
     PANEL — phone first
       DOCK TOP     — never under the steering thumb.
       COLLAPSE     — during a run it is a single strip: clock, cones, message.
       ONE CONTROL  — a chip row picks WHICH value the single big slider edits.
     ========================================================================= */
  /* ============ THE CHIPS SAY WHAT THEY DO ============
     `gap` / `vary` / `lead` / `turn` / `tail` / `pen` / `par` are the names the
     constants have in code, and a chip row of seven four-letter words is not a
     control panel, it is a reminder that you already know the code. On-device
     the report was blunt: the dials never make sense.

     So every chip carries the plain word for the THING, and every chip carries
     a `help` line stating what moving it does — in the direction you move it,
     because "spacing" does not tell you whether bigger is harder. The `key` is
     untouched: portLine still emits the code names, so the port is still a copy
     and not a translation.

     `unit` is spelled out too. T2 is two tiles and means nothing off-screen;
     "tiles" is a distance you can see out the window. */
  const FIELDS = [
    { key:'gap',    label:'cone spacing',  unit:'tiles', min:1.4, max:4.0, step:0.05,
      help:'tightest gap between gates. 1.4 is one hop — lower is unclearable, not harder.' },
    { key:'vary',   label:'spacing swing', unit:'',      min:0,   max:1.2, step:0.05,
      help:'how far the spacing opens up between phrases. 0 is a metronome.' },
    { key:'wide',   label:'big-move room', unit:'',      min:0,   max:1.0, step:0.05,
      help:'extra road a 2-3 lane change buys. Higher is fairer and means fewer gates.' },
    { key:'legs',   label:'blocks long',   unit:'legs',  min:2,   max:20,  step:1,
      help:'how many streets the course runs through before the finish tape.' },
    { key:'n',      label:'max cones',     unit:'',      min:8,   max:600, step:4,
      help:'hard cap on gates. Every cone costs a body and a sorted draw each frame.' },
    { key:'rowA',   label:'kerb lane',     unit:'row',   min:0,   max:3,   step:1,
      help:'lane nearest the road the weave is allowed to use. 0 is the kerb.' },
    { key:'rowB',   label:'wall lane',     unit:'row',   min:0,   max:3,   step:1,
      help:'lane nearest the buildings the weave may use. 3 is the whole walk.' },
    { key:'kickers',label:'jumps per block',unit:'',     min:0,   max:3,   step:1,
      help:'ramps per street. They sit in the first third, never near a corner.' },
    { key:'kRunup', label:'ramp run-up',   unit:'tiles', min:1.5, max:8,   step:0.5,
      help:'clear road before the lip. The last two gates aim you into the ramp lane.' },
    { key:'kReach', label:'jump distance', unit:'tiles', min:3,   max:9,   step:0.25,
      help:'how far the ramp carries at full speed. Sets where the catch deck goes.' },
    { key:'kPeak',  label:'jump height',   unit:'',      min:20,  max:70,  step:2,
      help:'apex above the lip. Taller looks bigger and lands no further away.' },
    { key:'kLift',  label:'ramp height',   unit:'',      min:10,  max:44,  step:2,
      help:'height of the ramp lip itself — the wedge you ride up.' },
    { key:'lead',   label:'start run-up',  unit:'tiles', min:2,   max:12,  step:0.5,
      help:'clear road between the start line and the first gate.' },
    { key:'turn',   label:'corner room',   unit:'tiles', min:1.5, max:8,   step:0.5,
      help:'gate-free road either side of a turn. Hops are refused mid-corner.' },
    { key:'tail',   label:'run-out',       unit:'tiles', min:1,   max:8,   step:0.5,
      help:'road between the last gate and the finish tape.' },
    { key:'vmul',   label:'top speed',     unit:'x normal', min:1, max:2.5, step:0.05,
      help:'raises the speed ceiling. Jump ballistics and the gate spacing floor follow it; corner tilt follows only as far as cornering grip allows.' },
    { key:'grip',   label:'cornering grip', unit:'',     min:0,   max:2,   step:0.05,
      help:'corner-tilt help. 1 corners like normal speed (which still tips at full throttle), 2 removes corner lean entirely. 0 is raw physics.' },
    { key:'clean',  label:'swept ahead',   unit:'tiles', min:0,   max:24,  step:1,
      help:'how far past the finish the street is emptied. Sized to what the camera shows, not to the course.' },
    { key:'pen',    label:'cone penalty',  unit:'sec',   min:0.5, max:5,   step:0.5,
      help:'seconds added for each cone knocked or gate taken on the wrong side.' },
    { key:'par',    label:'time to beat',  unit:'sec',   min:8,   max:60,  step:0.5,
      help:'the par. Under it is a pass; under it with no faults is a clean run.' },
  ];
  const fieldOf = k => FIELDS.find(f => f.key === k);
  const fmt = f => f.step >= 1 ? String(SL[f.key]) : (+SL[f.key]).toFixed(2);
  const fmtU = f => fmt(f) + (f.unit ? ' ' + f.unit : '');

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
       <div id="slHelp" style="text-align:center;margin-top:3px;color:#8f95a1;
            font-size:11px;line-height:1.4;min-height:30px"></div>
       <div style="display:flex;gap:6px;margin-top:10px">
         <button id="slTraf"  style="${BTN}flex:2">cars: wait</button>
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
    `vary:${(+SL.vary).toFixed(2)}, lead:${(+SL.lead).toFixed(1)}, ` +
    `turn:${(+SL.turn).toFixed(1)}, wide:${(+SL.wide).toFixed(2)}, ` +
    `kickers:${SL.kickers}, kRunup:${(+SL.kRunup).toFixed(1)}, ` +
    `kReach:${(+SL.kReach).toFixed(2)}, ` +
    `kPeak:${SL.kPeak}, kLift:${SL.kLift}, ` +
    `tail:${(+SL.tail).toFixed(1)}, clean:${(+SL.clean).toFixed(0)}, ` +
    `vmul:${(+SL.vmul).toFixed(2)}, ` +
    `pen:${(+SL.pen).toFixed(1)}, par:${(+SL.par).toFixed(1)}, legs:${SL.legs} };`;

  function drawChips(){
    $('slChips').innerHTML = FIELDS.map(f =>
      `<button data-k="${f.key}" style="${BTN}flex:1 1 30%;min-width:96px;padding:4px 6px;` +
      `line-height:1.25;min-height:44px;font-size:11px;` +
      `${f.key === sel ? 'border-color:#ff7a1a;color:#ff9c4d;' : ''}">` +
      `<span style="color:#8f95a1">${f.label}</span><br>${fmt(f)}</button>`).join('');
    $('slChips').querySelectorAll('button').forEach(b => {
      b.onclick = () => { sel = b.dataset.k; syncUI(); };
    });
  }

  function syncUI(){
    const f = fieldOf(sel), sl = $('slSlider');
    sl.min = f.min; sl.max = f.max; sl.step = f.step; sl.value = SL[f.key];
    $('slNow').textContent = `${f.label}  ${fmtU(f)}`;
    $('slHelp').textContent = f.help || '';
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

  $('slTraf').onclick = () => {
    SL.trafficWaits = SL.trafficWaits ? 0 : 1;
    $('slTraf').textContent = 'cars: ' + (SL.trafficWaits ? 'wait' : 'go');
  };
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
  /* NO DELIVERY OPENING.
     mode = "challenge" is the switch the game itself uses: its pickup timeline
     skips wholesale in that mode rather than fast-forwarding, "because every
     downstream effect (lid hinge, shop door, worker walk-back, cargo spill)
     keys off these same flags", and the camera's pickup branch is gated on
     `mode !== "challenge"` — not on pickupWalk, which challenge mode sets to 1
     itself. Safe without a hydrant course behind it: every hj path either tests
     route.challenge (null here) or finds no kicker hazards. It also hides the
     GPS HUD, which is delivery chrome a lab has no use for. */
  function slQuietOpening(){
    scene.mode = 'challenge';
    const r = scene.route;
    r.pickupSpot = null; r.pickupShopName = null; r.pickupBlock = null;
    scene.pickupDoorDV = null; scene.pickupDoorRV = null;
    scene.walkAt = null; scene.doorSwing = 0;

    /* ============ THE DELIVERY IS NOT THE ENDING ============
       Two live pieces of delivery logic were still running underneath the
       course, and between them they owned the end of the run:

       THE DOOR. update()'s win test is `remain = route.doorS - botS` inside a
       34/-60 window with speed under 0.02. The tape sets run.done and then
       coasts the robot at 0.94/frame — which is exactly "slow" — so finishing
       anywhere near doorS handed the ending to showWin() instead. That is the
       "customer door is the finish line" report: the tape WAS breaking, the
       delivery just got there first. doorS is pushed past the far end of the
       road so the window can never be entered.

       THE REROUTE LAP. route.loop welds the street into a ring and update()
       wraps botS back a period at lp.sEnd. A course laid across ten legs runs
       straight into that weld, so the robot re-entered geometry he had already
       driven — the block-end wrap-around, with the turn chute and a kicker
       arriving together because both were simply being visited twice. A lap is
       a delivery's second chance at a missed door; a timed run has no door and
       no second chance, so the loop comes out entirely.

       Both are restored by slOff along with scene.mode. */
    /* ============ THE LAP IS GEOMETRY, NOT JUST A FLAG ============
       Nulling route.loop stopped update() wrapping botS, and the course still
       came back over its own opening leg — because the lap is not a flag with
       some geometry attached, it IS geometry. generateRoute truncates the door
       leg at loop.sCut and then welds four corners and four legs into
       route.segs that ring the block back to where they started, and it
       returns `totalLen: loop ? loop.sEnd : totalLen`. So walking segments up
       to totalLen walks the ring. The flag was never the thing to remove.

       route._slEndS is the last s that is ORIGINAL road, and the chain stops
       there. Stashed on the ROUTE rather than the scene, because loadRoute
       hands back a whole new route object: a scene-scoped stash taken once
       would describe the previous city, and restoring it would write a stale
       doorS onto a route that never had it. Route-scoped, a new route simply
       has no stash yet and takes a fresh one. */
    if (r._slDoor === undefined){
      r._slDoor = r.doorS;
      r._slLoop = r.loop;
      r._slEndS = r.loop ? r.loop.sCut : r.totalLen;
    }
    if (scene._slCap === undefined) scene._slCap = scene.speedCap || 0;
    scene.speedCap = vTop();
    r.loop  = null;
    /* Just past the end of the road, not absurdly past it: doorS is also read
       by queueHousingEdgeAt as groundZ(doorS) for the address door's height,
       and a wild value there clamps to the last tile and lifts a door the
       course never visits. totalLen + 4 tiles puts the win window ~334 units
       beyond the furthest s any leg can reach, which is unreachable, while
       keeping the elevation sample honest. */
    r.doorS = r.totalLen + 4 * T2;
  }

  /* No seed seek. With the heading filter gone there is no shape to hunt for —
     every route already has ten legs — so the lab uses the route the bench
     loaded. The 160-city search that froze the tab last time existed only to
     satisfy the f=0/f=1 constraint that is now dropped.

     The Bluffs reload stays: it is ONE generateRoute, and the hood still gives
     the steepest virtual grade. */
  function slArm(){
    if (scene.route.hood.hill >= 0.9){ slQuietOpening(); syncUI(); slResetRun(); return; }
    run.msg = 'relocating to The Bluffs…'; run.msgT = performance.now();
    SEED = scene.route.dateStr;
    scene.loadRoute(SEED, { hoodIndex: HOOD_BLUFFS });
    slQuietOpening();
    setTimeout(() => {
      syncUI(); slResetRun();
      console.log('cone slalom armed —', lastDiag, portLine());
    }, 60);
  }

  let SEED = null;
  /* A throw inside a bare setTimeout callback goes nowhere the panel can show
     it: the lab looks armed, the strip shows an empty course, and there is no
     message anywhere. That is exactly how a deleted function definition hid
     itself. Arm failures now land in the red strip. */
  if (typeof BENCH !== 'undefined' && BENCH.hook)
    /* A bare `catch(e){}` here cost a session: if the ribbon threw, the tape
       simply was not on screen and there was nothing anywhere to say so — it
       looked like a finish line that had never been built. Reported once, then
       muted, so a per-frame throw cannot flood the strip. */
    BENCH.hook(() => {
      try { slDrawFinish(); }
      catch(e){
        if (!slDrawFinish._told){
          slDrawFinish._told = 1;
          console.log('finish tape draw failed', e);
          run.fail = 'tape draw: ' + (e && e.message ? e.message : e);
        }
      }
    });

  setTimeout(() => {
    try { slArm(); }
    catch(e){
      console.log('slalom arm failed', e);
      run.fail = 'arm failed: ' + (e && e.message ? e.message : e);
    }
  }, 0);
  console.log('cone slalom arming —', portLine());
})();
