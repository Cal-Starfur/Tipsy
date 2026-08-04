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
    legs: 4,      // how many legs the course runs through — walk this up
                  // with the chip and watch the cone total in the strip
    gap:  1.50,   // TIGHTEST along-route spacing between cones, in T2
    vary: 0.55,   // how far above gap the spacing opens up (0 = uniform)
    trafficWaits: 1,   // cars queue at coned junctions instead of driving through
    kickers: 1,   // kicker ramps per leg (0 = none)
    kLift: 26,    // ramp lip height
    kPow:  0.052, // launch: vz = speed * kPow
    kGrav: 0.00019,
    rowA: 0,      // low edge of the sidewalk band the course uses
    rowB: 3,      // high edge — 0..3 is the whole walk
    lead: 4.0,    // run-up before the first cone, in T2
    turn: 2.5,    // clearance either side of the arc — no cones on the turn
    tail: 2.0,    // run-out after the last cone, in T2
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

  /* THE RAMP ROW IS A FACT ABOUT THE WORLD, so it lives with the other world
     facts rather than inside the chute code that first needed it. Declared down
     there it was read by the gate loop above it and threw "Cannot access
     'RAMP_ROW' before initialization" — const is hoisted but not initialised,
     and the gate loop runs first.

     generateRoute plants BOTH ramp props at row 1, straight crossings and turn
     crossings alike, and says why: the prop is 3 tiles wide against a 4-row
     walk, so laneOffset(1) centres it on rows 0-2 exactly on tile seams,
     "leaving row 3 (building side) as plain flat walk".

     So the lane a crossing must be taken in is row 1, always, and row 3 is the
     one row NOT on the ramp. Chute walls at rows 0 and 2 mark the ramp centre
     and put a wall between the robot and row 3 — the lane that would drop him
     off the side of the ramp entirely. */
  const RAMP_ROW = 1;

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
    const endS = route.totalLen;
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
    const GAP_MIN = 1.40;
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
      .map(cx => [cx.sA - RAMP, cx.sB + RAMP]);
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
    const RUNUP = 7 * T2, LANDING = 6 * T2;
    const kickers = [];
    ch.lines.forEach((L, i) => {
      const room = (L.s1 - L.s0) - (RUNUP + LANDING + 4 * T2);
      if (room <= 0) return;
      for (let j = 0; j < SL.kickers; j++){
        const at = Math.round(L.s0 + RUNUP + (room * (j + 0.5)) / SL.kickers);
        if (blocked.some(([a, b]) => at > a - RUNUP && at < b + LANDING)) continue;
        kickers.push({ s: at, leg: i });
        blocked.push([at - RUNUP, at + LANDING]);
      }
    });
    blocked.sort((x, y) => x[0] - y[0]);

    const isBlocked = (at) => blocked.some(([a, b]) => at >= a && at <= b);

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
          at = span[1] + SL.turn * T2; n = 0; continue;
        }
        const nextRow = pickRow(i + ':' + n, curRow);
        plantAt(at, nextRow);
        at += stepFor(i, n) * (1 + (lastDelta - 1) * 0.75);
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
    const plantChute = (from, to) => {
      const lane = RAMP_ROW;
      for (let at = from; at <= to; at += cstep){
        for (const r of [lane - 1, lane + 1]){
          if (r < 0 || r > 3 || chuteN >= CHUTE_MAX) continue;
          chuteN++;
          scene.route.hazards.push({
            type:'cone', s: Math.round(at), row: r, f:0, hit:false,
            phi:0, phase:1, angVel:0, moving:false, pose:'standing',
            slide:0, slideVel:0,
            slRole:'chute', cone: GATE_WALL,
            slKnocked:false, slJudged:true,
          });
        }
      }
    };
    /* SL.n caps GATES; the chute was uncapped, and at ten legs it adds ~110
       cones of its own. Every cone is a physics body and a depth-sorted draw
       every frame, so the total is what costs, not the gate count. */
    let chuteN = 0;
    const CHUTE_MAX = Math.round(SL.n * 0.75);
    for (const M of ch.arcs) plantChute(M.s0 - SL.turn * T2 * 0.5,
                                       M.s1 + SL.turn * T2 * 0.5);
    for (const [a, b] of blocked){
      if (b < course.spawnS || a > (ch.lines[ch.lines.length-1].s1)) continue;
      plantChute(a, b);
    }

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
    for (const [a, b] of blocked){
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
      const hyd = [kk.s + 2.0 * T2, kk.s + 3.1 * T2];
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
      /* CHEVRONS SIT BEHIND THE RAMP, NOT ON IT. The first pass ran them to
         within 1.0*T2 of the lip at kRow +/- 0.4 — which is the ramp deck and
         the racing line, so the run-up you are meant to hit flat out was full
         of cones. They now stop a full 2 tiles short and never come closer
         than one row off the lane. */
      for (let c = 0; c < 4; c++){
        const at = kk.s - (6.0 - c * 0.9) * T2;
        for (const d of [-1, 1]){
          const r = kRow + d * (1.5 - c * 0.15);
          if (r < 0 || r > 3) continue;
          scene.route.hazards.push({
            type:'cone', s: Math.round(at), row: r, f:0, hit:false,
            phi:0, phase:1, angVel:0, moving:false, pose:'standing',
            slide:0, slideVel:0, slRole:'chute', cone: GATE_WALL,
            slKnocked:false, slJudged:true,
          });
        }
      }
      /* CATCH RAMP. Without one the arc ends by dropping onto flat walk past
         the second hydrant, which is a fall, not a landing — and hjSlabZ
         already understands hjRole "catch", so the down-slope is free. hjDir is
         negated so the wedge is raised at the near edge and flush at the far
         one: you touch down high and ride it back to ground level, the mirror
         of the kicker. Placed just past the last hydrant, where the arc is
         still descending. */
      const catchS = Math.round(hyd[hyd.length - 1] + 1.4 * T2);
      scene.route.hazards.push({
        type:'slab', hjRole:'catch', s: catchS, row: kRow, f,
        lift: SL.kLift, hjDir: -1, root: false, hit: true, slRole:'jump',
      });
      course.kickers.push({ s: kk.s, lip: kk.s + TILE, hyd, row: kRow, catchS });
    }

    course.startRow = RAMP_ROW;
    course.nGates = k;
    course.nChute = chuteN;
    course.finishS = Math.round(gatesNow().reduce((m, h) => Math.max(m, h.s), 0)
                                + SL.tail * T2);

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
    run.msg = `${run.course.nLines} legs · ${run.course.nGates} gates · ` +
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
  function slFlight(dt){
    const c = run.course;
    if (!c || !c.kickers || !c.kickers.length){ flightPrevS = scene.botS; return; }
    const s0 = flightPrevS, s1 = scene.botS;
    flightPrevS = s1;

    if (!scene.hjAir){
      for (const kk of c.kickers){
        if (s0 < kk.lip && s1 >= kk.lip && scene.speed >= 0.10){
          scene.hjAir = { vz: scene.speed * SL.kPow, z: SL.kLift, idx: 0, kk, clipped:false };
          run.msg = 'AIR'; run.msgT = performance.now();
          break;
        }
      }
      return;
    }

    const A = scene.hjAir;
    A.vz -= SL.kGrav * dt;
    A.z  += A.vz * dt;

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

    scene.pitch = Math.atan2(A.vz, Math.max(scene.speed, 1e-4)) * 0.6;

    /* Ground height under the robot is whatever hjSlabZ says — which is the
       catch ramp's deck while he is over it. Landing against 0 instead would
       sink him through the ramp he is supposed to touch down on. */
    const gz = scene.hjSlabZ ? scene.hjSlabZ(s1) : 0;
    if (A.vz < 0 && A.z <= gz){
      const clean = !A.clipped;
      scene.hjAir = null;
      scene.pitch = 0;
      A.z = gz;
      if (clean){ run.msg = 'clean landing'; run.msgT = performance.now(); }
      else scene.tilt += 0.25;      // a clipped landing costs stability, not the run
    }
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

  const onPost = (time, delta) => {
    try { slJudge(); } catch(e){ console.log('slJudge', e); }
    try { slFlight(Math.min(delta, 34)); } catch(e){ console.log('slFlight', e); }
    try { slHoldTraffic(time, Math.min(delta, 34)); } catch(e){ console.log('slHoldTraffic', e); }
  };
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
    { key:'legs', label:'legs',  min:2,   max:20,  step:1    },
    { key:'kickers',label:'jumps',min:0,  max:3,   step:1    },
    { key:'kLift',label:'lift',  min:10,  max:44,  step:2    },
    { key:'kPow', label:'pow',   min:0.03,max:0.09,step:0.002 },
    { key:'gap',  label:'gap',   min:1.4, max:4.0, step:0.05 },
    { key:'vary', label:'vary',  min:0,   max:1.2, step:0.05 },
    { key:'rowA', label:'row lo',min:0,   max:3,   step:1    },
    { key:'rowB', label:'row hi',min:0,   max:3,   step:1    },
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
    `turn:${(+SL.turn).toFixed(1)}, ` +
    `tail:${(+SL.tail).toFixed(1)}, ` +
    `pen:${(+SL.pen).toFixed(1)}, par:${(+SL.par).toFixed(1)}, legs:${SL.legs} };`;

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
  setTimeout(() => {
    try { slArm(); }
    catch(e){
      console.log('slalom arm failed', e);
      run.fail = 'arm failed: ' + (e && e.message ? e.message : e);
    }
  }, 0);
  console.log('cone slalom arming —', portLine());
})();
