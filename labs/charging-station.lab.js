/* ===========================================================================
   CHARGING STATION — labs/_bench.html?lab=charging-station
   ===========================================================================
   Where Tipsey wakes up after he goes over in free play.

   THE PROBLEM THIS EXISTS TO SOLVE. Open world made tipping cheap to do
   and expensive to recover from: the rail game's tip is a FAILED
   DELIVERY, which is the right answer when you accepted a delivery and
   the wrong one when you were just driving around. Sir's call is a
   charging center — you go down, you wake up on a pad, you carry on.

   TWELVE, NOT ONE. A single city-wide station would put a respawn up to
   five minutes of driving from where you fell, which is the same
   "cannot get there from here" that made the open-world lab move its
   own spawn to the boardwalk. One per district means the walk of shame
   is always short, and it gives the map twelve real landmarks it did
   not have.

   PLACEMENT IS NOT RANDOM AND NOT AUTHORED. It mirrors buildPickupShops
   exactly — same districts, same seeded shuffle over the district's own
   commercial blocks, same blockEdgesOf/packEdgeNoGap edge math — so a
   station's stored x/y is bug-compatible with where the game
   independently thinks that block's frontage is. The one difference is
   that it deliberately takes a block the three shops did NOT, so a
   charging pad never lands on top of a bakery door.

   CITY_SEED is frozen, so this table is the same forever.

   WHAT IS TUNABLE HERE: the art. Placement is derived and moving it
   would only put a pad through a wall. Every value is read fresh each
   frame, so drags land immediately.

   TO PORT: tap `copy` and hand the line back.
   =========================================================================== */
(() => {
  const sc = game.scene.scenes.find(s => s.route);
  if (!sc || !sc.route) { console.log('charging-station: no route yet — press "start run" first'); return; }
  if (sc._csRestore) sc._csRestore();
  document.getElementById('csPanel')?.remove();

  const CS_BUILD = 'cs1';

  /* ---------- art dials ----------
     A pad you park on plus a bollard that charges you. The bollard is
     what reads at distance in an isometric view — a flat pad alone
     disappears into the sidewalk at any real camera height, which is
     why the marker is vertical and the pad is only the footprint. */
  const CS = {
    padR:      44,        // pad radius, model units. Robot is botR 30, so this is "park on it"
    padH:      2.0,       // pad lip height — enough to catch a shadow edge, not enough to be a curb
    poleH:     96,        // bollard height
    poleW:     15,        // bollard width (square section)
    headH:     26,        // the charging head on top
    headW:     21,
    armLen:    0,         // 0 = no cable arm. Dial it up for a hanging cable variant
    glowR:     7,         // indicator lamp radius
    pulseMs:   1700,      // indicator breathing period
    ringW:     5,         // painted ring width on the pad
  };
  const CSC = {
    pad:     0x2f3540, padDk: 0x232833,
    ring:    0xffb454, ringDk: 0xd98f34,
    pole:    0xe8eaef, poleDk: 0xb9bcc6,
    head:    0x3a4150, headDk: 0x2b313d,
    glow:    0x7fe3ff, glowHot: 0xd8f7ff,
    shadow:  0x000000,
  };

  /* ---------- the twelve, derived from the frozen seed ----------
     Deliberately calls the GAME's own helpers (blockEdgesOf,
     packEdgeNoGap, getPickupShops, hoodAt) rather than reimplementing
     them: a parallel copy of the edge math is exactly how a lab ends up
     approving a position production cannot reproduce. */
  const grid = sc.route.grid;
  const shops = (typeof getPickupShops === 'function') ? getPickupShops(grid) : [];

  function buildStations(){
    const out = [];
    for (let hoodIdx = 0; hoodIdx < HOODS.length; hoodIdx++) {
      const dc = hoodIdx % DISTRICT_COLS, dr = Math.floor(hoodIdx / DISTRICT_COLS);
      const i0 = dc*DISTRICT_W, i1 = i0 + DISTRICT_W - 1;
      const j0 = dr*DISTRICT_H, j1 = j0 + DISTRICT_H - 1;
      /* the district's own commercial blocks, in the same stable order
         buildPickupShops sorts them into */
      const cand = grid.blocks
        .filter(b => b.type === 'commercial' && b.i >= i0 && b.i <= i1 && b.j >= j0 && b.j <= j1)
        .sort((a,b) => a.j - b.j || a.i - b.i);
      if (!cand.length) continue;
      /* the three this district's shops already took — a pad must not
         land on a shop's own frontage */
      const taken = new Set(shops.filter(s => s.hoodIndex === hoodIdx)
                                 .map(s => s.blockI + ',' + s.blockJ));
      /* its OWN seeded shuffle (different salt from the shops') so the
         twelve are not all in the same corner of their districts */
      const rng = mulberry32(((hoodIdx*2654435761) ^ 0xc0ffee) >>> 0);
      const pool = cand.slice();
      for (let k = pool.length-1; k > 0; k--) {
        const r = Math.floor(rng()*(k+1));
        const t = pool[k]; pool[k] = pool[r]; pool[r] = t;
      }
      const blk = pool.find(b => !taken.has(b.i + ',' + b.j)) || pool[0];
      if (!blk) continue;

      /* SAME EDGE MATH AS THE SHOPS, on purpose. f picks which frontage,
         and the unit is the middle of that edge's packing — so the pad
         sits centred on a real shopfront-width slot, out at the same
         T2*2.1 standoff the pickup robot parks at, which is on the
         sidewalk and therefore drivable. */
      const fRng = mulberry32(((blk.i*7919) ^ (blk.j*104729) ^ 0x5eed) >>> 0);
      const f = fRng() < 0.5 ? 0 : 3;
      const edgeIdx = (f + 2) % 4;
      const pe = blockEdgesOf(blk)[edgeIdx];
      const seed = ((Math.round(pe.ox*3+pe.dv.x)*7919) ^ (Math.round(pe.oy*3+pe.dv.y)*104729) ^ 0x51b3) >>> 0;
      const units = packEdgeNoGap(pe.len, mulberry32(seed));
      const u = units[Math.floor(units.length/2)] || { start:0, w: pe.len };
      const ux = pe.ox + pe.dv.x*u.start, uy = pe.oy + pe.dv.y*u.start;
      const x = ux + pe.dv.x*(u.w/2) + pe.rv.x*(T2*2.1);
      const y = uy + pe.dv.y*(u.w/2) + pe.rv.y*(T2*2.1);
      /* facing: the bollard's back is to the building, so it looks the
         way the frontage does */
      const fa = Math.atan2(pe.rv.y, pe.rv.x);
      out.push({ hoodIndex: hoodIdx, name: HOODS[hoodIdx].n + ' Charging',
                 blockI: blk.i, blockJ: blk.j, edgeIdx, x, y, a: fa });
    }
    return out;
  }

  const STATIONS = buildStations();
  console.log('charging-station ' + CS_BUILD + ': ' + STATIONS.length + ' stations');
  for (const s of STATIONS)
    console.log('   ' + s.name.padEnd(26) + ' (' + Math.round(s.x) + ', ' + Math.round(s.y) + ')');

  /* nearest by straight-line distance. Not road distance: the point is a
     short recovery, and the pad you can SEE from where you fell is the
     one that should catch you even if the drive there curls around a
     block. */
  const nearestStation = (x, y) => {
    let best = null, bd = Infinity;
    for (const s of STATIONS) {
      const d = Math.hypot(s.x - x, s.y - y);
      if (d < bd) { bd = d; best = s; }
    }
    return best ? { station: best, dist: bd } : null;
  };

  /* ---------- the art ----------
     Hull idiom, same as every other prop: one geometry, an orientation
     transform, per-part depth so the bollard sorts against the world
     rather than against itself. */
  function drawStation(g, st, t) {
    const cs = Math.cos(st.a), sn = Math.sin(st.a);
    const W = (a, b, h) => sc.W(st.x + a*cs - b*sn, st.y + a*sn + b*cs, h);
    const dep = (a, b, h) => (st.x + a*cs - b*sn) + (st.y + a*sn + b*cs) + h*0.4;
    const K = sc.K;

    /* ground shadow, then the pad, then the ring — flat fills first so
       the order between them cannot depend on the sort */
    const o = W(0, 0, 0);
    g.fillStyle(CSC.shadow, 0.16);
    g.fillEllipse(o.x, o.y + 3, CS.padR*2.1*K, CS.padR*1.05*K);

    g.fillStyle(CSC.padDk, 1);
    g.fillEllipse(o.x, o.y + CS.padH*0.5, CS.padR*2*K, CS.padR*1.0*K);
    g.fillStyle(CSC.pad, 1);
    g.fillEllipse(o.x, o.y, CS.padR*2*K, CS.padR*1.0*K);

    /* the painted ring: two ellipses, outer minus inner */
    g.fillStyle(CSC.ring, 0.9);
    g.fillEllipse(o.x, o.y, CS.padR*2*K, CS.padR*1.0*K);
    g.fillStyle(CSC.pad, 1);
    g.fillEllipse(o.x, o.y, (CS.padR - CS.ringW)*2*K, (CS.padR - CS.ringW)*1.0*K);

    /* the bollard, set at the back of the pad so the robot parks in
       front of it rather than inside it */
    const bx = -CS.padR*0.62;
    const hw = CS.poleW/2;
    const box = (x0, x1, y0, y1, z0, z1, top, side) => {
      const pts = [[x0,y0],[x1,y0],[x1,y1],[x0,y1]].map(p => W(p[0], p[1], z1));
      g.fillStyle(top, 1);
      g.beginPath(); g.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < 4; i++) g.lineTo(pts[i].x, pts[i].y);
      g.closePath(); g.fillPath();
      /* the two camera-facing sides */
      const lo = [[x1,y0],[x1,y1]].map(p => W(p[0], p[1], z0));
      const hi = [[x1,y0],[x1,y1]].map(p => W(p[0], p[1], z1));
      g.fillStyle(side, 1);
      g.beginPath(); g.moveTo(hi[0].x, hi[0].y); g.lineTo(hi[1].x, hi[1].y);
      g.lineTo(lo[1].x, lo[1].y); g.lineTo(lo[0].x, lo[0].y);
      g.closePath(); g.fillPath();
      const lo2 = [[x0,y1],[x1,y1]].map(p => W(p[0], p[1], z0));
      const hi2 = [[x0,y1],[x1,y1]].map(p => W(p[0], p[1], z1));
      g.beginPath(); g.moveTo(hi2[0].x, hi2[0].y); g.lineTo(hi2[1].x, hi2[1].y);
      g.lineTo(lo2[1].x, lo2[1].y); g.lineTo(lo2[0].x, lo2[0].y);
      g.closePath(); g.fillPath();
    };

    box(bx-hw, bx+hw, -hw, hw, 0, CS.poleH, CSC.pole, CSC.poleDk);
    const hh = CS.headW/2;
    box(bx-hh, bx+hh, -hh, hh, CS.poleH, CS.poleH + CS.headH, CSC.head, CSC.headDk);

    /* the indicator: breathing, because a charger that is doing nothing
       still reads as live */
    const u = (Math.sin(t / CS.pulseMs * Math.PI*2) + 1) / 2;
    const gp = W(bx, -hh, CS.poleH + CS.headH*0.55);
    g.fillStyle(CSC.glow, 0.30 + 0.25*u);
    g.fillCircle(gp.x, gp.y, CS.glowR*2.1*K);
    g.fillStyle(CSC.glowHot, 0.75 + 0.25*u);
    g.fillCircle(gp.x, gp.y, CS.glowR*K);

    return dep(bx, 0, CS.poleH);
  }

  /* ---------- the frame ----------
     PRE, NOT HOOK, AND THIS IS NOT A STYLE CHOICE. The bench's drawWorld
     wrapper does, in order: clear __benchVQ -> run __benchPre -> run the
     real drawWorld (whose queueBlockContent wrap is what FLUSHES the
     queue) -> run __benchHook. So anything queued from a hook lands in
     an array that the next frame clears before the flush can ever see
     it. Cost an hour: the hook ran, the queue filled, the respawn
     logic in it worked perfectly, and not one pixel was ever drawn.

     Chained, never clobbered: __benchPre is a single slot, and a lab
     loaded alongside this one (the whole point of
     ?lab=open-world,charging-station) may own it already. */
  const prevPre = sc.__benchPre || null;
  BENCH.pre(function (s, t) {
    if (prevPre) { try { prevPre(s, t); } catch (e) {} }
    for (const st of STATIONS) {
      /* cull: same test the game's own draw loop uses, so the bench
         cannot show a scene the game would not */
      if (Math.hypot(st.x - s.botX, st.y - s.botY) > BLOCK * 3) continue;
      BENCH.queue(st.x + st.y, (g, tt) => drawStation(BENCH.layerFor(st.x, st.y), st, tt));
    }
    csRespawnTick(s, t);
  });

  /* ---------- RESPAWN ----------
     The behaviour this lab exists to prove. When the robot goes down in
     free play, hold the pose long enough to read as a fall, then set him
     upright on the nearest pad.

     It writes the OPEN-WORLD pose (ow.px/py/yaw) when that lab or the
     production flag is live, and falls back to botX/botY otherwise, so
     this can be judged with ?lab=open-world,charging-station without
     either lab knowing about the other. */
  /* SHORTER THAN THE OPEN-WORLD LAB'S OWN AUTO-RIGHT (900ms). That
     auto-right is scaffolding — it exists so a locomotion lab does not
     have to be hand-reset — and it would otherwise pick the robot up
     where he fell before this ever ran, making the charging respawn
     look like it silently did nothing. Layered labs share one robot;
     whichever recovery is faster is the one you see. Production has no
     auto-right, so this number is free to grow on the port. */
  const CS_HOLD = 700;                       // ms on the ground before the pickup
  let downT = 0, lastTip = null;
  function csRespawnTick(s, t) {
    if (s.state !== 'tipped') { downT = 0; return; }
    if (!downT) { downT = t; return; }
    if (t - downT < CS_HOLD) return;
    downT = 0;
    const ow = s.ow || (s._owAPI && s._owAPI.pose && { px: s._owAPI.pose().px, py: s._owAPI.pose().py });
    const px = ow ? ow.px : s.botX, py = ow ? ow.py : s.botY;
    const near = nearestStation(px, py);
    if (!near) return;
    lastTip = { x: px, y: py, dist: Math.round(near.dist), name: near.station.name };
    const st = near.station;
    /* on the pad, facing out of it — nose pointed at the street, not at
       the wall he would otherwise have to reverse away from */
    if (s.ow) { s.ow.px = st.x; s.ow.py = st.y; s.ow.yaw = st.a; s.ow.vel = 0;
                s.ow.reversing = false; s.ow.latchSign = 0;
                s.ow.solidOn = new Set(); s.ow.flatOn = new Set(); }
    if (s._owAPI && s._owAPI.place) s._owAPI.place(st.x, st.y, st.a, 0, false);
    s.botX = st.x; s.botY = st.y;
    s.state = 'play'; s.tilt = 0; s.roll = 0; s.pitch = 0;
    s.tipT = 0; s.tipStartRoll = 0; s.speed = 0;
    s.damage = 0;                            // a charge is a repair; that is the point of the stop
    paint();
  }

  /* ---------- panel ---------- */
  const F = [
    { k:'padR',    lo:20, hi:90,   st:1 },
    { k:'padH',    lo:0,  hi:8,    st:0.5 },
    { k:'poleH',   lo:40, hi:200,  st:2 },
    { k:'poleW',   lo:6,  hi:36,   st:1 },
    { k:'headH',   lo:8,  hi:60,   st:1 },
    { k:'headW',   lo:8,  hi:48,   st:1 },
    { k:'glowR',   lo:2,  hi:18,   st:1 },
    { k:'ringW',   lo:1,  hi:20,   st:1 },
    { k:'pulseMs', lo:400,hi:4000, st:50 },
  ];
  const p = document.createElement('div');
  p.id = 'csPanel';
  p.setAttribute('data-lab-panel', '1');
  p.style.cssText = 'position:fixed;left:8px;right:8px;bottom:8px;z-index:99999;' +
    'background:#12141a;border:1px solid #2b2f38;border-radius:12px;' +
    'padding:10px 12px calc(10px + env(safe-area-inset-bottom));' +
    'font:12px/1.3 ui-monospace,Menlo,monospace;color:#e8eaef;user-select:none';
  p.innerHTML =
    `<div style="display:flex;gap:8px;margin-bottom:8px">
       <b style="color:#ff9c4d;letter-spacing:2px">CHARGING ${CS_BUILD}</b>
       <span id="csLive" style="margin-left:auto;color:#8f95a1"></span></div>` +
    F.map(f => `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
        <span style="width:58px;color:#8f95a1">${f.k}</span>
        <input type="range" id="cs-${f.k}" min="${f.lo}" max="${f.hi}" step="${f.st}"
               style="flex:1;accent-color:#ff7a1a">
        <span id="csv-${f.k}" style="width:44px;text-align:right"></span></div>`).join('') +
    `<div style="display:flex;gap:8px;margin-top:8px">
       <button id="csGo" style="flex:1">go to nearest</button>
       <button id="csTip" style="flex:1">tip me over</button>
     </div>
     <div style="display:flex;gap:8px;align-items:center;margin-top:8px">
       <code id="csPort" style="flex:1;background:#0e0d0c;border:1px solid #2b2f38;
             border-radius:7px;padding:7px 8px;color:#ff9c4d;white-space:nowrap;
             overflow-x:auto;user-select:text"></code>
       <button id="csCopy" style="flex:0 0 62px">copy</button>
     </div>`;
  for (const b of p.querySelectorAll('button'))
    b.style.cssText += ';background:#1b1e26;color:#e8eaef;border:1px solid #2b2f38;' +
      'border-radius:7px;padding:7px 4px;font:inherit';
  document.body.appendChild(p);

  const paint = () => {
    for (const f of F) {
      const el = document.getElementById('cs-' + f.k);
      const vv = document.getElementById('csv-' + f.k);
      if (el) el.value = CS[f.k];
      if (vv) vv.textContent = CS[f.k];
    }
    const live = document.getElementById('csLive');
    if (live) live.textContent = lastTip
      ? `fell ${lastTip.dist}u from ${lastTip.name}` : `${STATIONS.length} stations`;
    const port = document.getElementById('csPort');
    if (port) port.textContent = 'CHARGE = ' + JSON.stringify(CS).replace(/"/g, '');
  };
  for (const f of F) {
    const el = document.getElementById('cs-' + f.k);
    if (el) el.addEventListener('input', e => { CS[f.k] = +e.target.value; paint(); });
  }
  document.getElementById('csGo').onclick = () => {
    const near = nearestStation(sc.ow ? sc.ow.px : sc.botX, sc.ow ? sc.ow.py : sc.botY);
    if (!near) return;
    const st = near.station;
    if (sc.ow) { sc.ow.px = st.x - Math.cos(st.a)*120; sc.ow.py = st.y - Math.sin(st.a)*120;
                 sc.ow.yaw = st.a; sc.ow.vel = 0; }
    sc.botX = st.x - Math.cos(st.a)*120; sc.botY = st.y - Math.sin(st.a)*120;
    BENCH.lookAt(st.x, st.y, 1.4);
  };
  document.getElementById('csTip').onclick = () => {
    sc.state = 'tipped'; sc.tilt = 1.1; sc.tipDir = 1;
    sc.tipStartRoll = sc.roll || 0; sc.tipT = 0;
  };
  document.getElementById('csCopy').onclick = () => {
    navigator.clipboard?.writeText(document.getElementById('csPort').textContent);
  };
  paint();

  sc._csRestore = () => {
    BENCH.pre(prevPre || (() => {}));
    document.getElementById('csPanel')?.remove();
    delete sc._csRestore;
  };
  sc._csAPI = { CS, CSC, STATIONS, nearestStation, buildStations };
})();
