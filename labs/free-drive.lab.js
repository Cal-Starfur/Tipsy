/* ========================================================================
   FREE DRIVE — the rail chooses itself
   ========================================================================
   The open-world question, answered the rail-switching way: Tipsey never
   leaves a rail, but the rail is built as he drives. The chain is a leg
   list — direction + length from a start node — fed through
   buildSegsFromLegs, the SAME builder every route in the game goes
   through, so the corners here are tangent for exactly the reasons the
   daily's corners are. Steering intent (left / straight / right, arrows
   or buttons) decides each next leg as the chain end approaches; legs
   behind fall off and the start node walks forward, so the chain stays
   a couple dozen legs long forever.

   Everything s-parameterized runs unchanged on the rolling chain:
   throttle, tilt, lane hops, the camera. Route-keyed content (hazards,
   crossings, ramps) is empty in v1 — the streets are bare and the
   intersections are flat — but the CITY is all there, because blocks,
   roads, sidewalks and furniture render from the grid by camera
   position, not by route. Open world is this chain plus per-edge
   content generation; that part is a design question this lab exists
   to make askable.

   This closes over game scope (BLOCK, T2, DIRV, buildSegsFromLegs,
   CORNER_R) exactly as every lab does. Re-entrant via scene._fdRestore.
   ======================================================================== */
(() => {
  const scene = game.scene.scenes.find(s => s.route);
  if (!scene) { console.log('free-drive: no scene with a route'); return; }
  if (scene._fdRestore) scene._fdRestore();
  if (scene._slRestore) scene._slRestore();   // the two labs share the robot

  const r = scene.route;
  const g2 = r.grid;

  /* ---------- stash what the facade replaces ---------- */
  const orig = {
    segs: r.segs, totalLen: r.totalLen, hazards: r.hazards, props: r.props,
    crossings: r.crossings, loop: r.loop, doorS: r.doorS, parMs: r.parMs,
    challenge: r.challenge, botS: scene.botS, state: scene.state,
  };

  /* ---------- the rolling chain ---------- */
  /* start mid-grid so every direction has somewhere to go */
  let startIJ = { i: Math.floor(g2.cols/2) - 2, j: Math.floor(g2.rows/2) };
  let legs = [];
  let intent = 'straight';                    // latched until changed

  const nodeAtIJ = (i, j) => g2.nodeAt(i, j);
  const stepIJ = (ij, f) => f === 0 ? { i: ij.i + 1, j: ij.j }
                : f === 1 ? { i: ij.i, j: ij.j + 1 }
                : f === 2 ? { i: ij.i - 1, j: ij.j }
                :           { i: ij.i, j: ij.j - 1 };
  const endIJ = () => legs.reduce((ij, L) => stepIJ(ij, L.f), startIJ);

  /* pick the next direction at a node: intent first, then straight,
     then anything that isn't a U-turn. conn order matches DIRV/f. */
  const pickF = (node, fIn) => {
    const want = intent === 'left'  ? (fIn + 3) % 4
               : intent === 'right' ? (fIn + 1) % 4
               : fIn;
    if (node.conn[want]) return want;
    if (node.conn[fIn]) return fIn;
    for (const f of [(fIn + 1) % 4, (fIn + 3) % 4]) if (node.conn[f]) return f;
    return (fIn + 2) % 4;                     // dead end: about face
  };

  const rebuild = () => {
    const built = buildSegsFromLegs(nodeAtIJ(startIJ.i, startIJ.j), legs, CORNER_R);
    r.segs = built.segs;
    r.totalLen = built.totalLen;
    /* the delivery win check must never fire: the door rides just past
       the chain end, forever out of reach, exactly the old slalom trick */
    r.doorS = r.totalLen + 4 * T2;
    return built;
  };

  /* seed: three legs in whatever direction is open from the start */
  {
    const n0 = nodeAtIJ(startIJ.i, startIJ.j);
    let f = [0, 1, 2, 3].find(f2 => n0.conn[f2]) ?? 0;
    let ij = startIJ;
    for (let k = 0; k < 3; k++) {
      const node = nodeAtIJ(ij.i, ij.j);
      f = node.conn[f] ? f : pickF(node, f);
      legs.push({ f, blocks: 1 });
      ij = stepIJ(ij, f);
    }
    rebuild();
  }

  /* the facade: bare streets, live city */
  r.hazards = [];
  r.props = [];
  r.crossings = [];
  r.loop = null;
  r.challenge = null;
  if (r._fdPar === undefined) r._fdPar = orig.parMs;
  r.parMs = 1e9;
  /* mode = 'challenge' is the switch the game itself uses: the delivery
     pickup timeline never engages, so the robot answers the throttle
     from frame one — the slalom lab learned this the same way. */
  const origMode = scene.mode;
  scene.mode = 'challenge';
  scene.state = 'play';
  scene.botS = T2 * 2;
  scene.speed = 0;

  /* ---------- extend ahead, drop behind ---------- */
  const LOOKAHEAD = BLOCK * 1.6;
  const MAX_LEGS = 22, DROP = 8;
  const onPre = () => {
    scene.pickupWalk = 0;
    if (scene.runT < LOAD_ART.ms + 1) scene.runT = LOAD_ART.ms + 1;
    while (r.totalLen - scene.botS < LOOKAHEAD) {
      const ij = endIJ();
      const fIn = legs[legs.length - 1].f;
      const f = pickF(nodeAtIJ(ij.i, ij.j), fIn);
      legs.push({ f, blocks: 1 });
      rebuild();                               // arcs re-trim the joined leg
      /* one steer per corner: a taken turn snaps the latch back to
         straight, so a single tap means a single turn */
      if (f !== fIn && intent !== 'straight') setIntent('straight');
    }
    if (legs.length > MAX_LEGS) {
      const before = r.totalLen;
      for (let k = 0; k < DROP; k++) startIJ = stepIJ(startIJ, legs[k].f);
      legs = legs.slice(DROP);
      rebuild();
      /* same end point, shorter chain: the difference is exactly what
         the robot has already driven past */
      scene.botS -= (before - r.totalLen);
    }
  };
  scene.events.on('preupdate', onPre);

  /* ---------- steering UI ---------- */
  document.getElementById('fdUI')?.remove();
  const ui = document.createElement('div');
  ui.id = 'fdUI';
  ui.style.cssText = 'position:fixed;left:0;right:0;bottom:18px;z-index:9990;display:flex;justify-content:center;gap:10px;pointer-events:none';
  const mkBtn = (id, label) => `<button id="${id}" style="pointer-events:auto;width:64px;height:52px;border-radius:12px;border:1px solid #4a4a52;background:rgba(20,21,26,0.85);color:#eee;font:700 22px/1 ui-monospace,monospace">${label}</button>`;
  ui.innerHTML = mkBtn('fdL', '\u25c0') + mkBtn('fdS', '\u25b2') + mkBtn('fdR', '\u25b6')
    + '<div id="fdTag" style="pointer-events:none;position:fixed;top:10px;left:0;right:0;text-align:center;color:#ffb04d;font:700 14px/1 ui-monospace,monospace">FREE DRIVE \u2014 next turn: straight</div>';
  document.body.appendChild(ui);
  const setIntent = which => {
    intent = which;
    for (const [id, w] of [['fdL','left'],['fdS','straight'],['fdR','right']]){
      const b2 = document.getElementById(id);
      b2.style.background = w === which ? '#ff7a1a' : 'rgba(20,21,26,0.85)';
      b2.style.color = w === which ? '#1a1b20' : '#eee';
    }
    const tag = document.getElementById('fdTag');
    if (tag) tag.textContent = 'FREE DRIVE \u2014 next turn: ' + which;
  };
  document.getElementById('fdL').onclick = () => setIntent('left');
  document.getElementById('fdS').onclick = () => setIntent('straight');
  document.getElementById('fdR').onclick = () => setIntent('right');
  const onKey = e => {
    if (e.key === 'ArrowLeft') setIntent('left');
    else if (e.key === 'ArrowRight') setIntent('right');
    else if (e.key === 'ArrowUp') setIntent('straight');
  };
  window.addEventListener('keydown', onKey);
  setIntent('straight');

  /* ---------- restore ---------- */
  scene._fdRestore = () => {
    scene.events.off('preupdate', onPre);
    window.removeEventListener('keydown', onKey);
    document.getElementById('fdUI')?.remove();
    r.segs = orig.segs; r.totalLen = orig.totalLen;
    r.hazards = orig.hazards; r.props = orig.props;
    r.crossings = orig.crossings; r.loop = orig.loop;
    r.doorS = orig.doorS; r.challenge = orig.challenge;
    if (r._fdPar !== undefined) { r.parMs = r._fdPar; delete r._fdPar; }
    scene.botS = orig.botS; scene.state = orig.state; scene.mode = origMode;
    delete scene._fdRestore;
  };

  console.log('free-drive: chain live —', legs.length, 'legs,', Math.round(r.totalLen), 'units');
})();
