/* ===========================================================================
   CORNER TRAFFIC SIGNALS — labs/_bench.html?lab=corner-light
   ===========================================================================
   Mast-arm signals on the apex tile the curb ramps left free, four per
   intersection, cycling, with traffic that actually stops for them.

   WHERE THEY GO
   With WORLD_RAMP.cross at 598 the two ramps at a corner occupy u in
   [368,552] and v in [368,552] on their own axis but start at 460 on the
   other, leaving u,v in [368,460] — one 92x92 tile at the apex, centre
   414/414. Checked against the robot's whole route (4,666 samples): its path
   never enters that tile, and comes no closer than 91 to the centre. So these
   are visual + traffic-logic only, no collision, like the ramps.

   WHICH CORNER SERVES WHICH STREET
   One signal per corner, arm reaching ACROSS the road it serves — a pole at
   414/414 is outside the roadway (ROAD_HALF 368), so an arm parallel to a
   street would hang over pavement, not tarmac. It has to point at the node.
   Corners are assigned diagonally: (-,-) and (+,+) serve the x street,
   (-,+) and (+,-) serve the y street. That covers all four approaches — the
   +x traffic stopping on the west side sees the west x-signal, -y traffic
   stopping on the north sees the north y-signal, and so on.

   The head looks back down the street at the cars it is stopping, which is
   the corner's own outward direction on the served axis. No lane-side
   arithmetic needed, so it holds however the route laid that street out.

   TRAFFIC
   signalPhaseAt is pure and time-seeded per node, so the renderer and the
   sim read the same light with no shared state. Cars hold on the same
   `hold` field trafficWorldAt already subtracts — the mechanism curb queues
   and the crime scene both use — stepped by real elapsed t, not dt, and
   guarded by holdFrame so no car takes two steps in a frame.

   A car only holds inside a short band just before the stop line, so it
   rolls up to the line rather than freezing wherever it happened to be when
   the light changed. Once past the line it is committed and clears the box.

   NOTE FOR PORT CHECK: this lab moves tr.hold, so the bench census will
   report a mutable diff. That is the feature, not drift.
   =========================================================================== */

(() => {
  const sc = game.scene.scenes[0];
  if (!sc || !sc.route) { console.log('no route yet — press "start run" first'); return; }

  /* ---------- tunables: one mutable object, same shape as WORLD_RAMP ---------- */
  const SIGNAL = {
    cycle: 14000,   // full both-axes cycle, ms
    amber: 2200,    // amber at the tail of each green
    allRed: 700,    // both red between phases
    poleH: 250,     // pole height
    armLen: 300,    // arm reach from pole toward the node
    headR: 15,      // lamp radius
    stopBand: 70,   // how far back from the stop line a car will hold
    arm: true,      // false = pole-mounted head, no mast
    aware: true,    // false = lights cycle but traffic ignores them
  };

  const APEX = 414;                 // corner tile centre, out from the node on both axes
  const POLE_R = 11;
  const C = { pole: 0x3c4048, poleTop: 0x4a4f58, housing: 0x24272d, hood: 0x181a1e,
              dark: 0x1b1d22, red: 0xd8392b, amber: 0xe8a021, green: 0x3fbf62 };

  /* ---------- phase: pure, node-seeded, no stored state ---------- */
  function signalPhaseAt(node, t) {
    const off = (((node.i * 73856093) ^ (node.j * 19349663)) >>> 0) % SIGNAL.cycle;
    const half = SIGNAL.cycle / 2;
    const u = (t + off) % SIGNAL.cycle;
    const axis = u < half ? 0 : 1;          // the axis holding green
    const inHalf = u % half;
    const g = half - SIGNAL.amber - SIGNAL.allRed;
    const state = inHalf < g ? 'green' : (inHalf < g + SIGNAL.amber ? 'amber' : 'red');
    return { axis, state };
  }
  /* one predicate, read by both the lamp and the car */
  const axisGo = (node, t, axis) => {
    const p = signalPhaseAt(node, t);
    return p.axis === axis && p.state !== 'red';
  };
  const axisState = (node, t, axis) => {
    const p = signalPhaseAt(node, t);
    return p.axis === axis ? p.state : 'red';
  };

  /* ---------- placement ---------- */
  function buildWorldSignals(grid) {
    const out = [];
    for (const n of grid.nodes) {
      for (const su of [-1, 1]) for (const sv of [-1, 1]) {
        const x = n.x + su * APEX, y = n.y + sv * APEX;
        const bi = Math.floor(x / BLOCK), bj = Math.floor(y / BLOCK);
        if (bi < 0 || bi > grid.cols - 2 || bj < 0 || bj > grid.rows - 2) continue;
        const axis = (su === sv) ? 0 : 1;           // diagonal assignment, see header
        /* arm points at the node on the axis it must cross */
        const armF = axis === 0 ? (sv < 0 ? 1 : 3) : (su < 0 ? 0 : 2);
        /* head looks back down the served street at the stopping cars */
        const headF = axis === 0 ? (su < 0 ? 2 : 0) : (sv < 0 ? 3 : 1);
        out.push({ x, y, node: n, axis, armF, headF });
      }
    }
    return out;
  }

  /* ---------- art ---------- */
  /* Fixed iso: +x runs down-right, +y down-left, so the two camera-facing
     vertical faces of any world-axis box are always its +x and +y sides.
     Nothing here branches on heading, which is what keeps it identical at
     f0..f3 — the only per-instance orientation is armF/headF, and those
     come through DIRV exactly as drawProp's dv/rv do. */
  function boxOn(g, cx, cy, z0, z1, hx, hy) {
    const W = (x, y, z) => sc.W(x, y, z);
    const top = [W(cx - hx, cy - hy, z1), W(cx + hx, cy - hy, z1),
                 W(cx + hx, cy + hy, z1), W(cx - hx, cy + hy, z1)];
    const fx  = [W(cx + hx, cy - hy, z1), W(cx + hx, cy + hy, z1),
                 W(cx + hx, cy + hy, z0), W(cx + hx, cy - hy, z0)];
    const fy  = [W(cx - hx, cy + hy, z1), W(cx + hx, cy + hy, z1),
                 W(cx + hx, cy + hy, z0), W(cx - hx, cy + hy, z0)];
    return { top, fx, fy };
  }
  const paint = (g, b, cTop, cSide) => {
    sc.quadOn(g, b.fx, cSide);
    sc.quadOn(g, b.fy, cSide);
    sc.quadOn(g, b.top, cTop);
  };

  function drawPole(g, s) {
    paint(g, boxOn(g, s.x, s.y, 0, SIGNAL.poleH, POLE_R, POLE_R), C.poleTop, C.pole);
  }

  function drawArmAndHead(g, s, t) {
    const d = DIRV[s.armF];
    const armZ = SIGNAL.poleH - 18;
    const reach = SIGNAL.arm ? SIGNAL.armLen : 0;
    if (SIGNAL.arm) {
      const mx = s.x + d.x * reach / 2, my = s.y + d.y * reach / 2;
      paint(g, boxOn(g, mx, my, armZ - 9, armZ + 9,
                     Math.abs(d.x) ? reach / 2 : 7, Math.abs(d.y) ? reach / 2 : 7),
            C.poleTop, C.pole);
    }
    /* head hangs at the arm's far end, lamps stacked down its face */
    const hx = s.x + d.x * reach, hy = s.y + d.y * reach;
    const hd = DIRV[s.headF];
    const R = SIGNAL.headR, gap = R * 2.3;
    const topZ = armZ - 12, botZ = topZ - gap * 3.1;
    paint(g, boxOn(g, hx, hy, botZ, topZ, R * 1.5, R * 1.5), C.hood, C.housing);

    const st = axisState(s.node, t, s.axis);
    const lamps = [['red', C.red], ['amber', C.amber], ['green', C.green]];
    for (let i = 0; i < 3; i++) {
      const [name, col] = lamps[i];
      const z = topZ - gap * (0.75 + i);
      const p = sc.W(hx + hd.x * R * 1.6, hy + hd.y * R * 1.6, z);
      g.fillStyle(st === name ? col : C.dark, 1);
      g.fillCircle(p.x, p.y, R * sc.K);
    }
  }

  /* ---------- traffic obeys the light ---------- */
  function updateSignalHolds(t) {
    if (!SIGNAL.aware) return 0;
    const traffic = sc.route && sc.route.traffic;
    if (!traffic) return 0;
    /* hold must step with t, not dt: Phaser clamps delta to ~50ms while
       time.now is wall clock, so on a dropped frame a dt-stepped hold lets a
       "stopped" car keep rolling by the difference. */
    const prev = sc.__sigPrevT;
    sc.__sigPrevT = t;
    const hDt = prev === undefined ? 0 : Math.max(0, Math.min(250, t - prev));
    let held = 0;

    for (const tr of traffic) {
      const { wp, fc } = trafficWorldAt(tr, t);
      if (Math.abs(fc - Math.round(fc)) > 0.1) continue;   // mid-corner: not approaching a line
      const f = ((Math.round(fc) % 4) + 4) % 4, d = DIRV[f];
      const onX = d.x !== 0;
      const pos = onX ? wp.x : wp.y, dir = onX ? d.x : d.y;
      const nodeCoord = dir > 0 ? Math.ceil(pos / BLOCK) * BLOCK : Math.floor(pos / BLOCK) * BLOCK;
      const dist = Math.abs(nodeCoord - pos);
      /* only in the short band just before the line — a car further back
         keeps rolling until it gets there, and one already past it is
         committed and clears the box rather than parking in the middle. */
      if (dist < ROAD_HALF || dist > ROAD_HALF + SIGNAL.stopBand) continue;
      const node = onX
        ? { i: Math.round(nodeCoord / BLOCK), j: Math.round(wp.y / BLOCK) }
        : { i: Math.round(wp.x / BLOCK), j: Math.round(nodeCoord / BLOCK) };
      if (axisGo(node, t, onX ? 0 : 1)) continue;
      if (tr.holdFrame !== t) { tr.hold = (tr.hold || 0) + hDt; tr.holdFrame = t; }
      held++;
      sc.__sigStops = (sc.__sigStops || 0) + 1;
    }
    return held;
  }

  /* ---------- wire into the frame ---------- */
  let signals = buildWorldSignals(sc.route.grid);
  let lastHeld = 0;

  /* pre-hook, because __benchVQ is cleared at the top of drawWorld and only
     flushed into blockVQ on the first queueBlockContent of that same frame.
     The bench installs its own pre-hook for the camera, so chain it rather
     than replace it — dropping it silently kills pan and zoom. */
  const prevPre = sc.__benchPre;
  BENCH.pre((s, t) => {
    if (prevPre) prevPre(s, t);
    lastHeld = updateSignalHolds(t);
    const span = (sc.scale.width / sc.K) * 0.9 + TILE * 6 + 4000;
    for (const sg of signals) {
      if (Math.abs(sg.x - sc.camX) + Math.abs(sg.y - sc.camY) > span) continue;
      /* two entries, not one: the pole sorts on its own ground spot, the
         head on the spot it actually hangs over. Queued whole, a head out
         above a lane would sort against cars by the POLE's depth, which is
         a car's width back on the pavement. */
      const d = DIRV[sg.armF], reach = SIGNAL.arm ? SIGNAL.armLen : 0;
      BENCH.queue(sg.x + sg.y, (g) => drawPole(g, sg));
      BENCH.queue((sg.x + d.x * reach) + (sg.y + d.y * reach),
                  (g, t2) => drawArmAndHead(g, sg, t2));
    }
  });

  /* ---------- panel ---------- */
  document.getElementById('cltPanel')?.remove();
  const F = [
    { k: 'cycle',    lo: 6000, hi: 24000, st: 500 },
    { k: 'amber',    lo: 800,  hi: 4000,  st: 100 },
    { k: 'poleH',    lo: 140,  hi: 380,   st: 10 },
    { k: 'armLen',   lo: 120,  hi: 420,   st: 10 },
    { k: 'headR',    lo: 8,    hi: 26,    st: 1 },
    { k: 'stopBand', lo: 30,   hi: 200,   st: 10 },
  ];
  const p = document.createElement('div');
  p.id = 'cltPanel';
  p.style.cssText = 'position:fixed;left:8px;right:8px;bottom:8px;z-index:99999;' +
    'background:#12141a;border:1px solid #2b2f38;border-radius:12px;' +
    'padding:10px 12px calc(10px + env(safe-area-inset-bottom));' +
    'font:12px/1.3 ui-monospace,Menlo,monospace;color:#e8eaef;user-select:none';
  p.innerHTML =
    `<div style="display:flex;gap:8px;margin-bottom:8px">
       <b style="color:#ff9c4d;letter-spacing:2px">SIGNALS</b>
       <span id="cltLive" style="margin-left:auto"></span></div>` +
    F.map(f => `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
        <span style="width:58px;color:#8f95a1">${f.k}</span>
        <input type="range" id="clt-${f.k}" min="${f.lo}" max="${f.hi}" step="${f.st}"
               style="flex:1;accent-color:#ff7a1a">
        <span id="cltv-${f.k}" style="width:44px;text-align:right"></span></div>`).join('') +
    `<div style="display:flex;gap:8px;margin-top:8px">
       <button id="cltArm" style="flex:1">mast</button>
       <button id="cltAware" style="flex:1">traffic aware</button>
       <button id="cltLook" style="flex:1">look at one</button>
     </div>
     <div style="display:flex;gap:8px;align-items:center;margin-top:8px">
       <code id="cltPort" style="flex:1;background:#0e0d0c;border:1px solid #2b2f38;
             border-radius:7px;padding:7px 8px;color:#ff9c4d;white-space:nowrap;
             overflow-x:auto;user-select:text"></code>
       <button id="cltCopy" style="flex:0 0 62px">copy</button>
     </div>`;
  for (const b of p.querySelectorAll('button'))
    b.style.cssText = 'background:#262a33;color:#e8eaef;border:1px solid #363b46;' +
                      'border-radius:9px;padding:9px 4px;font:inherit;font-weight:600';
  document.body.appendChild(p);

  const portLine = () =>
    `SIGNAL cycle:${SIGNAL.cycle} amber:${SIGNAL.amber} poleH:${SIGNAL.poleH} ` +
    `armLen:${SIGNAL.armLen} headR:${SIGNAL.headR} stopBand:${SIGNAL.stopBand} ` +
    `arm:${SIGNAL.arm} aware:${SIGNAL.aware}`;

  const sync = () => {
    for (const f of F) {
      document.getElementById('clt-' + f.k).value = SIGNAL[f.k];
      document.getElementById('cltv-' + f.k).textContent = SIGNAL[f.k];
    }
    for (const [id, on] of [['cltArm', SIGNAL.arm], ['cltAware', SIGNAL.aware]])
      document.getElementById(id).style.background = on ? '#ff7a1a' : '#262a33';
    document.getElementById('cltPort').textContent = portLine();
  };
  for (const f of F)
    document.getElementById('clt-' + f.k).addEventListener('input', e => {
      SIGNAL[f.k] = +e.target.value; sync();
    });
  document.getElementById('cltArm').onclick = () => { SIGNAL.arm = !SIGNAL.arm; sync(); };
  document.getElementById('cltAware').onclick = () => { SIGNAL.aware = !SIGNAL.aware; sync(); };
  document.getElementById('cltLook').onclick = () => {
    const n = sc.route.grid.nodes.find(nd => nd.i === 3 && nd.j === 3) || sc.route.grid.nodes[0];
    BENCH.lookAt(n.x, n.y, 0.9);
  };
  document.getElementById('cltCopy').onclick = async () => {
    const b = document.getElementById('cltCopy');
    try { await navigator.clipboard.writeText(portLine()); b.textContent = 'copied'; }
    catch (e) {
      const r = document.createRange();
      r.selectNodeContents(document.getElementById('cltPort'));
      const s2 = getSelection(); s2.removeAllRanges(); s2.addRange(r);
      b.textContent = 'selected';
    }
    setTimeout(() => { b.textContent = 'copy'; }, 1400);
  };

  setInterval(() => {
    const n = sc.route.grid.nodes[0];
    const ph = signalPhaseAt(n, sc.time.now);
    /* cumulative, not a snapshot. The stop band is 70 units of a 3128
       block, so at any instant about one car citywide is inside one --
       an instantaneous count reads 0 almost always and looks broken. */
    document.getElementById('cltLive').textContent =
      `${signals.length} · ${ph.axis ? 'y' : 'x'} ${ph.state} · ` +
      `${lastHeld} holding · ${sc.__sigStops || 0} stops`;
  }, 250);

  sync();
  console.log('signals up:', signals.length);
})();
