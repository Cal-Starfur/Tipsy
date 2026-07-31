/* ============================================================================
   CRIME SCENE — bench lab
   Two cruisers parked in a real lot, on a real block, in the real world.

   WHERE IT GOES, AND WHY
   NORTH_WALL_CUT_EDGE = [null, 3, 0, null] — an f=1 leg cuts a block's edge 3,
   an f=2 leg cuts edge 0. Where a CUT edge lands on a COMMERCIAL block, the
   game replaces the culled storefront with drawParkingRow: painted stalls along
   the curb. The wall is already gone on those headings, so the lot reads as an
   open scene you can see straight into. That is the site.

   THE CARS SIT IN REAL STALLS
   The stall geometry below is the same arithmetic drawParkingRow uses — same
   stallW, stallDepth, seeded stall count, same centred cluster, same nose-in
   facing. It is duplicated here ONLY because this is a lab. When this ports,
   that math must come out of drawParkingRow into a shared pure helper
   (parkingStallAt(edge, i)) that both the renderer and the scene call, exactly
   like dogSpotAt and trafficWorldAt. Two copies of stall math is precisely how
   art and placement drift apart.

   NOT camera-anchored. These are fixed world positions. Drive past them, zoom
   out, orbit — they stay where they were put, because they are IN the world.
   ============================================================================ */

/* four stalls: cruiser, gap, gap, cruiser — the two middle bays are where the
   officers and the taped-off area go. */
const CRIME_STALLS = 4;
const CRIME_CAR_STALLS = [0, 3];

/* Third cruiser: out in the road, turned across the lane so traffic can't get
   past the scene. Kept on the quadrant grid (fdir is an integer, and the car
   renderer snaps yaw to 90 degrees anyway) — a 90-degree turn already reads as
   blocking without needing a fractional heading. */
const ROADBLOCK = {
  lane: 0.55,   // share of ROAD_HALF out from the centreline — middle of the
                // near traffic lane, not the crown of the road
  along: 0      // nudge fore/aft along the route if it wants to sit further up
};

const POLICE_LIVERY = { n:"police", body:0xeceef2, bodyDk:0x23262e, roof:0xdfe2e7 };

const POLC = {
  barH:  13, barA: 12, barBF: 0.60,
  housing: 0x1b1e25, housingDk: 0x0f1116,
  red: 0xe03a2f, redHot: 0xff8a7a,
  blue: 0x3358d8, blueHot: 0x8fa8ff,
  lensDim: 0x5a616e, flashHz: 2.4,
  decal: 0x22304a
};

/* ---- roof light bar + door decal, in the car's own local frame ---- */
function drawPoliceHardware(sc, g, x, y, z, fdir, t, phaseOff){
  const CR = CARC;
  const hl = CR.len/2, hw = CR.wid/2, cz = CR.wheelR;
  const chassisTop = cz + CR.chassisH, cabinTop = chassisTop + CR.cabinH;
  const cl = hl*0.62;

  const th = fdir*(Math.PI/2), cTh = Math.cos(th), sTh = Math.sin(th);
  const T = (a,b,h) => ({ x:a*cTh - b*sTh, y:a*sTh + b*cTh, z:h });
  const P = (a,b,h) => { const q = T(a,b,h); return sc.W(x+q.x, y+q.y, z+q.z); };
  const D = (a,b,h) => { const q = T(a,b,h); return q.x + q.y + q.z*0.4; };

  const ts = (t > 1000 ? t/1000 : t) + (phaseOff || 0);
  const ph = (ts*POLC.flashHz) % 2;
  const redOn  = ph < 0.82;
  const blueOn = ph >= 1.0 && ph < 1.82;

  const bB = hw*POLC.barBF;
  const h0 = cabinTop, h1 = cabinTop + POLC.barH;
  const aF = POLC.barA, aR = -POLC.barA;

  const corners = [];
  for(const a of [aR, aF]) for(const b of [-bB, bB]) for(const h of [h0, h1])
    corners.push(P(a, b, h));
  sc.quadOn(g, convexHull(corners), POLC.housing);

  const lensTop = (b0, b1, col) => sc.quadOn(g,
    [P(aR,b0,h1), P(aF,b0,h1), P(aF,b1,h1), P(aR,b1,h1)], col);

  /* housing -> camera-facing side -> top LAST. The top of a bar can never be
     occluded by that same bar's own side at any heading, so this order is
     correct by construction rather than by luck at three headings of four. */
  const sideB = D(0, bB, (h0+h1)/2) > D(0, -bB, (h0+h1)/2) ? bB : -bB;
  const sideLit = sideB > 0 ? blueOn : redOn;
  const sideCol = sideB > 0 ? (blueOn ? POLC.blueHot : POLC.blue)
                            : (redOn  ? POLC.redHot  : POLC.red);
  const sideQuad = [P(aR,sideB,h0), P(aF,sideB,h0), P(aF,sideB,h1), P(aR,sideB,h1)];
  sc.quadOn(g, sideQuad, sideCol);
  sc.edgeOn(g, sideQuad, POLC.housingDk, 1);

  lensTop(-bB, 0, redOn  ? POLC.redHot  : POLC.lensDim);
  lensTop(0,  bB, blueOn ? POLC.blueHot : POLC.lensDim);

  if(sideLit){
    const c = P(0, sideB, (h0+h1)/2);
    g.fillStyle(sideB > 0 ? POLC.blueHot : POLC.redHot, 0.26);
    g.fillCircle(c.x, c.y, POLC.barH*sc.K*0.9);
  }

  /* ---- door decal ----
     Sized off the REAL wheel geometry rather than the cabin length. The wheels
     sit at a=+38.8 and a=-41.6 (16 + wheelR*0.95 / -20 - wheelR*0.9) and span
     z=-6.7 to 41.3 (centre wheelR*0.72, radius wheelR). The first version ran
     a=-59..+59 at z=31.6..64 — wider than the wheelbase and starting below the
     tyre tops, so it painted straight over both wheels.
     Now it sits BETWEEN the arches and ABOVE the tyres, in the door band under
     the glass. One dark shape on the light body: a dark block with a lighter
     shield inside it read as a hole punched in the door at this scale. */
  const wheelTop = CR.wheelR*0.72 + CR.wheelR;      // 41.3
  const dB = D(0, hw, chassisTop) > D(0, -hw, chassisTop) ? hw : -hw;
  const dB1 = dB * 1.015;                            // a hair proud of the skin
  const dh0 = wheelTop + 5;                          // clear of the tyre
  const dh1 = chassisTop - 5;                        // under the glass line
  const da  = 26;                                    // inside both wheel arches
  sc.quadOn(g, [P(-da,dB1,dh0), P(da,dB1,dh0), P(da,dB1,dh1), P(-da,dB1,dh1)],
            POLC.decal);
}

/* ---- stall geometry: MUST match drawParkingRow exactly ---- */
function stallsForEdge(sc, e, want){
  const eseed = ((Math.round(e.ox*3+e.dv.x)*7919) ^
                 (Math.round(e.oy*3+e.dv.y)*104729) ^ 0x6f2a) >>> 0;
  const rng = mulberry32(eseed);
  const stallW = CARC.wid + 40;
  const stallDepth = CARC.len + 50;
  /* drawParkingRow only lays 2-3 stalls, which leaves nowhere to stand the
     officers. The crime scene lays its OWN wider row on the same geometry, so
     the cruisers can sit at either end with clear stalls between them.
     On port this row replaces the normal one on the scene's edge. */
  const nStalls = want || (2 + Math.floor(rng()*2));
  const clusterW = nStalls * stallW;
  if(e.len < clusterW + T2) return null;
  const startAlong = (e.len - clusterW) / 2;
  const depthNear = -6, depthFar = depthNear - stallDepth;
  const cDepth = (depthNear + depthFar) / 2;
  const fdirIn = DIRV.findIndex(d => d.x === -e.rv.x && d.y === -e.rv.y);
  const out = [];
  for(let i = 0; i < nStalls; i++){
    const a = startAlong + (i+0.5)*stallW;
    out.push({ x: e.ox + e.dv.x*a + e.rv.x*cDepth,
               y: e.oy + e.dv.y*a + e.rv.y*cDepth, fdir: fdirIn });
  }
  return out;
}

/* ---------------------------------------------------------------------------
   ROADBLOCK CRUISER — on the traffic walk, in a real lane

   The first attempt offset it laterally from the ROBOT'S route and turned it a
   quadrant across. Both were wrong, for the same underlying reason: traffic
   does not run on the robot's route at all. Each traffic car carries its own
   `walk` and sits at laneOffset = +/-CAR_LANE on it. Offsetting from the
   sidewalk path put the cruiser on the wrong side of the road, and turning it
   across the route heading left it 90 degrees off the actual traffic direction.

   So it is placed the way a traffic car is placed: pick the walk that passes
   nearest the scene, take the s on that walk closest to it, and sit in one
   lane facing ALONG the road. Same geometry the cars themselves use, so it
   cannot land in the wrong lane or the wrong facing.
   --------------------------------------------------------------------------- */
/* Full road closure. Both lanes stop and queue behind the cruiser.

   HOW A CAR IS STOPPED AT ALL
   Traffic position is closed-form: s = sBase + t*speed*dir. There is no
   per-car velocity to zero. So each car carries a time LAG, and its position is
   evaluated at (t - lag). Advancing lag at exactly the rate t advances holds
   the car still; leaving lag alone lets it roll again. No change to the traffic
   model's shape, and it resumes cleanly rather than teleporting. */
/* Uniform is fixed — that is what makes them read as police rather than
   pedestrians. Build, skin and hair are still position-seeded per officer, so
   four of them are not four copies of one man. */
const OFFICER = {
  shirt: { c:0x2b3a55, dk:0x1f2b40 },
  pants: { c:0x222a3a, dk:0x18202c },
  shoe:  { c:0x1c1c1c, dk:0x121212 }
};

/* Cap: a lighter blue than the shirt on purpose. Matched to the uniform it
   just read as a dark blob on top of a dark body at normal zoom. */
const CAP = { top:0x4064a0, c:0x33507f, dk:0x24395c, brim:0x1b2740, badge:0xe8c96a };

/* FACING CONVENTION.
   A person at thW=0 faces world +y, because forward is the b axis (see the cap
   note above). So to face world direction (ux,uy) the angle is atan2(-ux, uy),
   NOT atan2(uy, ux). Cross-checked against peopleSpotAt: walking along +a there
   uses th = -PI/2, and atan2(-1, 0) = -PI/2. */
const faceDir = (ux, uy) => Math.atan2(-ux, uy);

/* Matches the game's own pedestrians: peopleSpotAt walks at 0.02 units/ms and
   pauses 900ms at each end of its range. Officers use the same numbers so they
   read as the same species of person. */
const WALK = { speed: 0.02, pause: 900 };

/* Follow a polyline. Ping-pong with a pause at each end, or loop it. */
function pathAt(pts, tms, phase, speed, pause, loop){
  const segs = []; let total = 0;
  const push = (A, B) => {
    const dx = B.x-A.x, dy = B.y-A.y, L = Math.hypot(dx, dy);
    if(L < 1e-6) return;
    segs.push({ x:A.x, y:A.y, dx:dx/L, dy:dy/L, L }); total += L;
  };
  for(let i = 0; i < pts.length-1; i++) push(pts[i], pts[i+1]);
  if(loop) push(pts[pts.length-1], pts[0]);
  if(!segs.length) return { x:pts[0].x, y:pts[0].y, ux:0, uy:1, walking:false };

  let d, walking = true, rev = false;
  if(loop){
    d = (((tms + phase)*speed) % total + total) % total;
  } else {
    const legMs = total/speed, cyc = legMs*2 + pause*2;
    const u = ((tms + phase) % cyc + cyc) % cyc;
    if(u < legMs){                      d = u*speed;                       walking = true;  }
    else if(u < legMs + pause){         d = total;                         walking = false; }
    else if(u < legMs*2 + pause){       d = total - (u-legMs-pause)*speed; walking = true; rev = true; }
    else {                              d = 0;                             walking = false; rev = true; }
  }

  let rem = Math.max(0, Math.min(total, d));
  for(const sg of segs){
    if(rem <= sg.L){
      const k = rev ? -1 : 1;
      return { x: sg.x + sg.dx*rem, y: sg.y + sg.dy*rem,
               ux: sg.dx*k, uy: sg.dy*k, walking };
    }
    rem -= sg.L;
  }
  const L = segs[segs.length-1], k = rev ? -1 : 1;
  return { x:L.x + L.dx*L.L, y:L.y + L.dy*L.L, ux:L.dx*k, uy:L.dy*k, walking };
}

/* ROADBLOCK CRUISER — on the traffic walk, in a real lane.
   Traffic does not run on the robot's route; each car carries its own walk and
   sits at +/-CAR_LANE on it. Placing this from the sidewalk route put it on the
   wrong side of the road and ninety degrees off the traffic direction, so it is
   placed the way a traffic car is placed instead. */
function roadblockSpot(sc, site){
  const r = sc.route;
  if(!r.traffic || !r.traffic.length) return null;

  const seen = new Set(); let best = null;
  for(const tr of r.traffic){
    if(seen.has(tr.walk)) continue;
    seen.add(tr.walk);
    const total = tr.walk.totalLen;
    const step = Math.max(30, total/1200);
    for(let s = 0; s < total; s += step){
      const w = segsWorldOf(tr.walk.segs, s, 0);
      const d = (w.x-site.gx)**2 + (w.y-site.gy)**2;
      if(!best || d < best.d) best = { d, walk: tr.walk, s };
    }
  }
  if(!best) return null;

  const a = segsWorldOf(best.walk.segs, best.s,  CAR_LANE);
  const b = segsWorldOf(best.walk.segs, best.s, -CAR_LANE);
  const da = (a.x-site.gx)**2 + (a.y-site.gy)**2;
  const db = (b.x-site.gx)**2 + (b.y-site.gy)**2;
  const lane = da < db ? CAR_LANE : -CAR_LANE;
  const wp   = da < db ? a : b;

  const hdg  = segsHeadingAt(best.walk.segs, best.s);
  const fdir = (((Math.round(hdg/(Math.PI/2))) % 4) + 4) % 4;
  return { x: wp.x, y: wp.y, fdir, walk: best.walk, s: best.s, lane };
}

function drawPoliceCap(sc, g, ax, ay, z, thW, build){
  const cs = Math.cos(thW), sn = Math.sin(thW);
  const G = (a,b,h) => sc.W(ax + a*cs - b*sn, ay + a*sn + b*cs, z + h);
  const faceA = Math.sign(cs + sn) || 1, faceB = Math.sign(-sn + cs) || 1;
  const box = (aC,bC,ha,hb,z0,z1,cTop,cA,cB) => {
    const corner = (sa,sb,zz) => G(aC+sa*ha, bC+sb*hb, zz);
    sc.quadOn(g, [corner(-1,-1,z1), corner(1,-1,z1), corner(1,1,z1), corner(-1,1,z1)], cTop);
    sc.quadOn(g, [corner(faceA,-1,z1), corner(faceA,1,z1), corner(faceA,1,z0), corner(faceA,-1,z0)], cA);
    sc.quadOn(g, [corner(-1,faceB,z1), corner(1,faceB,z1), corner(1,faceB,z0), corner(-1,faceB,z0)], cB);
  };
  const hipH = build.legH, shoulderH = hipH + build.torsoH;
  const headH = shoulderH + build.headR*2, r = build.headR;

  const crown = () =>
    box(0, 0, r*1.14, r*1.14, headH - r*0.50, headH + r*0.34, CAP.top, CAP.dk, CAP.c);
  const front = () => {
    /* PEAK GOES ON +b, NOT +a.
       drawPersonHull separates the legs along a (side*hipW*0.3) and STRIDES
       along b (walkPhase*side*walkStride). b is the body's forward axis. The
       peak was on +a, i.e. ninety degrees round the head from the direction
       the man is facing — which is what read as the head being on wrong. */
    box(0, r*1.05, r*1.02, r*0.52, headH - r*0.54, headH - r*0.40, CAP.brim, CAP.brim, CAP.brim);
    box(0, r*1.10, r*0.26, r*0.10, headH - r*0.30, headH + r*0.10, CAP.badge, CAP.badge, CAP.badge);
  };

  /* ORDER BY DEPTH, NOT BY HABIT.
     Peak and badge sit forward of the crown at +a. Drawn unconditionally after
     it, they painted straight over the head whenever the officer turned away
     from the camera — the cap visibly came apart on those facings. Compare
     depths and put the far part down first, so the peak is correctly hidden
     behind the head when he faces away and correctly in front when he does not.
     Same rule as the light bar: correct by construction, not by luck. */
  const dep = (a, b, h) => (a*cs - b*sn) + (a*sn + b*cs) + h*0.4;
  const frontNear = dep(0, r*1.05, headH - r*0.47) > dep(0, 0, headH - r*0.08);
  if(frontNear){ crown(); front(); } else { front(); crown(); }
}


/* ============================================================================
   CRIME SCENE TAPE
   Spans the pavement across the robot's path. Purely cosmetic: he goes
   straight through, no jostle and no speed scrub. The halves snap back and
   dangle from their stakes.

   TWO DELIBERATE DEPARTURES FROM THE PROP RULES, both worth naming:

   1. IT CARRIES MUTABLE STATE. Every other prop is position-seeded and
      stateless — draw it from its coordinates and time, get the same thing
      every frame. A broken tape has to STAY broken for the rest of the route,
      which no pure function of (position, t) can express. So this one keeps a
      broken flag and a break timestamp. Deliberate exception, not drift.

   2. BREAK DETECTION IS SEGMENT-CROSSING, NOT A BOX TEST. The tape is a thin
      line. At the robot's top speed a box test around it would be stepped
      clean over between frames — classic tunnelling. Testing the robot's
      previous-to-current travel segment against the span cannot miss,
      whatever the frame rate.
   ============================================================================ */
const TAPE = {
  z: 60,            // ribbon centre height
  half: 6,          // ribbon half-height
  sag: 9,           // droop at mid-span while taut
  segs: 14,         // subdivisions, for the sag curve and the dangle
  inset: 10,        // pull the stakes in from the kerb and the wall
  halfLen: 330,     // how far up and down the walk the cordon reaches
  snapMs: 520,      // how long the halves take to fall
  hang: 0.46,       // how much of its length a torn half keeps when hanging
                    // (0.30 read stubby on device)
  yellow: 0xf0c53a, yellowDk: 0xc39d22,
  band: 0x23252b,
  stake: 0x585d66, stakeDk: 0x3c414a, stakeH: 74, stakeR: 3.5
};

/* Pure: the CORDON. Three spans, not one line — two crossing the pavement and
   one long run along the kerb, closing off a section of walk that only the
   police are inside. Derived from the route alone so it travels with the scene.

   Lateral convention: laneOffset() is ROBOT_SIDE*(ROAD_HALF + ...), so a larger
   magnitude is further from the road. Kerb side is the small offset, building
   side the large one. The cordon is open on the building side, which is where
   the lot and the officers are. */
function tapeSpansAt(sc, site){
  const kerb  = ROBOT_SIDE*(ROAD_HALF + TAPE.inset);
  const bldg  = ROBOT_SIDE*(ROAD_HALF + SIDEWALK_W - TAPE.inset);
  const at = (s, off) => {
    const p = sc.posAt(s), h = sc.headingAt(s);
    return { x: p.x - Math.sin(h)*off, y: p.y + Math.cos(h)*off };
  };
  const s0 = site.s - TAPE.halfLen, s1 = site.s + TAPE.halfLen;
  const P0 = at(s0, bldg), P1 = at(s0, kerb);
  const P2 = at(s1, kerb), P3 = at(s1, bldg);
  return [
    { a: P0, b: P1, post: [true, true] },    // across the walk, upstream
    { a: P1, b: P2, post: [false, true] },   // the long run along the kerb
    { a: P2, b: P3, post: [false, true] }    // across the walk, downstream
  ];
}

/* Do segments p1p2 and p3p4 cross? */
function segCross(p1, p2, p3, p4){
  const d = (p2.x-p1.x)*(p4.y-p3.y) - (p2.y-p1.y)*(p4.x-p3.x);
  if(Math.abs(d) < 1e-9) return false;
  const u = ((p3.x-p1.x)*(p4.y-p3.y) - (p3.y-p1.y)*(p4.x-p3.x)) / d;
  const v = ((p3.x-p1.x)*(p2.y-p1.y) - (p3.y-p1.y)*(p2.x-p1.x)) / d;
  return u >= 0 && u <= 1 && v >= 0 && v <= 1;
}

function updateTape(sc, site, t){
  const spans = site.tape || (site.tape = tapeSpansAt(sc, site));
  if(!site.tapeBroken) site.tapeBroken = spans.map(() => false);
  if(!site.tapeBrokeAt) site.tapeBrokeAt = spans.map(() => 0);

  const cur = { x: sc.botX, y: sc.botY };
  const prev = sc.__tapePrev || cur;
  sc.__tapePrev = cur;

  /* every span tested independently — walking in through one and out through
     another should leave two torn spans, not one */
  spans.forEach((sp, i) => {
    if(site.tapeBroken[i]) return;
    if(segCross(prev, cur, sp.a, sp.b)){
      site.tapeBroken[i] = true;
      site.tapeBrokeAt[i] = t;
    }
  });
}

/* Draw ONE span of the cordon. Split per span so each can be queued at its own
   depth — the long kerb run and the two cross-walk spans need to sort against
   the cars and officers individually, not all at one averaged depth. */
function drawTapeSpan(sc, g, site, i, t){
  const spans = site.tape;
  if(!spans || !spans[i]) return;
  const sp = spans[i], A = sp.a, B = sp.b;

  const post = (P) => {
    const c = [];
    for(const dx of [-TAPE.stakeR, TAPE.stakeR])
      for(const dy of [-TAPE.stakeR, TAPE.stakeR])
        for(const h of [0, TAPE.stakeH])
          c.push(sc.W(P.x+dx, P.y+dy, h));
    const hull = convexHull(c);
    sc.quadOn(g, hull, TAPE.stake);
    sc.edgeOn(g, hull, TAPE.stakeDk, 1);
  };
  if(sp.post[0]) post(A);
  if(sp.post[1]) post(B);

  const ribbon = (pts) => {
    for(let k = 0; k < pts.length-1; k++){
      const p = pts[k], q = pts[k+1];
      sc.quadOn(g, [ sc.W(p.x, p.y, p.z - TAPE.half), sc.W(q.x, q.y, q.z - TAPE.half),
                     sc.W(q.x, q.y, q.z + TAPE.half), sc.W(p.x, p.y, p.z + TAPE.half) ],
                (k % 3 === 2) ? TAPE.band : TAPE.yellow);
    }
  };

  const len = Math.hypot(B.x-A.x, B.y-A.y);
  const segs = Math.max(6, Math.round(TAPE.segs * Math.min(2.4, len/260)));

  if(!site.tapeBroken || !site.tapeBroken[i]){
    const pts = [];
    for(let k = 0; k <= segs; k++){
      const u = k/segs;
      pts.push({ x: A.x + (B.x-A.x)*u, y: A.y + (B.y-A.y)*u,
                 z: TAPE.z - TAPE.sag*Math.sin(Math.PI*u) });
    }
    ribbon(pts);
    return;
  }

  /* BROKEN: each half snaps back to its own end post and hangs. The anchored
     end never moves, which is what sells it as tape that tore rather than
     tape that vanished. */
  const k0 = Math.min(1, (t - (site.tapeBrokeAt[i] || t)) / TAPE.snapMs);
  const e = 1 - Math.pow(1-k0, 3);
  const mid = { x: (A.x+B.x)/2, y: (A.y+B.y)/2 };
  for(const S of [A, B]){
    const pts = [];
    for(let k = 0; k <= segs; k++){
      const u = k/segs;
      const tx = S.x + (mid.x-S.x)*u, ty = S.y + (mid.y-S.y)*u;
      const tz = TAPE.z - TAPE.sag*Math.sin(Math.PI*(u*0.5));
      const hx = S.x + (mid.x-S.x)*u*TAPE.hang;
      const hy = S.y + (mid.y-S.y)*u*TAPE.hang;
      const hz = TAPE.z - (TAPE.z - 5)*(u*u);
      pts.push({ x: tx + (hx-tx)*e, y: ty + (hy-ty)*e, z: tz + (hz-tz)*e });
    }
    ribbon(pts);
  }
}

function drawOfficer(sc, g, x, y, thW, seed, walkPhase, moving, liftT){
  const r = mulberry32(seed >>> 0);
  const build = PEOPLE_BUILD[r() < 0.5 ? 0 : 1];
  const skin  = PEOPLE_SKIN[Math.floor(r()*PEOPLE_SKIN.length)];
  const hair  = PEOPLE_HAIR[Math.floor(r()*PEOPLE_HAIR.length)];
  sc.drawPersonHull(g, x, y, 0, thW, build, skin,
                    OFFICER.shirt, OFFICER.pants, hair, OFFICER.shoe,
                    walkPhase || 0, !!moving, 0, liftT || 0, null);
  drawPoliceCap(sc, g, x, y, 0, thW, build);
}

/* Where the four of them stand. Derived from the lot edge frame and the
   traffic walk, so they land with the scene rather than at baked coordinates.
   rv points OUT of the lot toward the road (stalls sit at -rv, which is why
   the cars nose in that way), so facing +rv is facing the street. */
function officerSpots(sc, site){
  const e = site.e, rb = site.roadblock;
  const at = (a, d) => ({ x: e.ox + e.dv.x*a + e.rv.x*d,
                          y: e.oy + e.dv.y*a + e.rv.y*d });
  const a0 = alongOf(e, site.stalls[0]), a3 = alongOf(e, site.stalls[3]);
  const lo = Math.min(a0, a3) - 80, hi = Math.max(a0, a3) + 80;
  const spots = [];

  /* 1 — TAPING OFF. Walks the perimeter of the scene, a closed loop round the
     whole stall cluster, which is the path you would actually take running
     tape from post to post. */
  spots.push({
    role: "tape", loop: true, speed: WALK.speed*0.8,
    path: [ at(lo, -20), at(hi, -20), at(hi, -260), at(lo, -260) ]
  });

  /* 2 — SEARCHING. Works the pavement corner to corner across the whole block
     frontage, head down, back and forth. rv is out toward the road, so a
     positive depth puts him on the pavement rather than in the lot. */
  spots.push({
    role: "evidence", loop: false, speed: WALK.speed,
    path: [ at(e.len*0.08, 78), at(e.len*0.92, 78) ]
  });

  /* 3 — POSTED. Stands off the far cruiser and shifts his weight about, rather
     than pacing anywhere. Short leash, slow. */
  spots.push({
    role: "posted", loop: false, speed: WALK.speed*0.35,
    path: [ at(a3 + 95, -95), at(a3 + 95, -170) ]
  });

  /* 4 — DIRECTING TRAFFIC. Holds the road. */
  if(rb){
    const hdg = segsHeadingAt(rb.walk.segs, rb.s);
    const dirSign = Math.sign(rb.lane) || 1;
    const p = segsWorldOf(rb.walk.segs,
                (rb.s - 200*dirSign + rb.walk.totalLen) % rb.walk.totalLen, rb.lane*0.35);
    /* face back down the road at the queue */
    spots.push({ role:"traffic", fixed:true, x:p.x, y:p.y,
                 th: faceDir(-Math.cos(hdg)*dirSign, -Math.sin(hdg)*dirSign) });
  }

  spots.forEach((o, i) => { o.phase = i*3100; });
  return spots;
}

/* distance along the edge of a stall centre — inverse of the placement above */
function alongOf(e, st){
  return (st.x - e.ox)*e.dv.x + (st.y - e.oy)*e.dv.y;
}

/* ============================================================================
   ROAD CLOSURE — stop and queue

   TWO EARLIER MISTAKES, both worth recording because they made the feature look
   like it worked when it did not:

   1. WRONG SET OF CARS. It filtered by walk identity — cars whose .walk matched
      the cruiser's. But there are 36 cars on 12 different walks, several of
      which run down the SAME physical street. Only 3 cars were ever considered;
      the other 33 drove straight through. Closure is a property of a place, not
      of a walk, so it is now decided in world space: is the cruiser ahead of
      this car, on this car's road, within stopping distance.

   2. THE HOLD WAS INVISIBLE. Cars were held by a private __lag and their
      positions recomputed at (t - lag) for my own checks. But the game renders
      and collides via trafficWorldAt(tr, t) with the REAL t, so it never saw
      the lag — the cars on screen never slowed at all, and my verification was
      measuring my own arithmetic rather than the world. A held car now has its
      sBase wound back by exactly the distance it would have travelled, so
      trafficWorldAt returns the held position for the renderer AND the
      collision test, which is the only way art and hitbox stay together.
   ============================================================================ */
const STOP = {
  line: 300,    // how far back from the cruiser the first car halts
  gap:  260,    // queue spacing (a car is 225 long)
  lane: 520     // Lateral tolerance, measured from the CRUISER.
                // Must cover a car that has pulled into the far lane: the
                // cruiser sits at -CAR_LANE and a detouring car reaches
                // +CAR_LANE, so they are ~368 apart at full swing. At 300 the
                // manoeuvring car fell OUT of the corridor mid-pass, its
                // commitment cleared, and it snapped back to its lane — the
                // bounce. Still nowhere near the next street (blocks ~3128).
};

/* ---------------------------------------------------------------------------
   THE OFFICER DIRECTING TRAFFIC

   He holds the blocked lane, watches the opposing lane, and waves a batch
   through when it is clear. Waved cars pull around the cruiser using the far
   lane and settle back afterwards.

   The lateral shift is applied to tr.laneOffset for the same reason the hold
   is applied to sBase: trafficWorldAt reads both, so the renderer and the
   collision test see the swerve. Anything kept in private bookkeeping is
   invisible to the game — the mistake that made the first closure do nothing.
   --------------------------------------------------------------------------- */
const DIRECT = {
  clearMargin:  140,  // corridor = detourRange + this. At 420 the corridor ran
                      // 1040 units and, with 36 cars looping the city, was
                      // essentially never empty — he waved nobody through.  // how far past the detour zone the far lane must also be
                      // empty, so a car does not arrive mid-manoeuvre
  waveMs:      3400,  // how long a wave-through lasts
  holdMs:      2200,  // minimum hold between waves, so it reads as directing
  detourRange:  620,  // distance either side of the cruiser to be pulled over
  detourEase:   0.13,
  armHz:        2.2   // wave speed
};

function updateDirect(sc, site, t){
  const rb = site.roadblock;
  if(!rb) return;
  if(!site.wave) site.wave = { on:false, t0:t };
  const w = site.wave;

  /* IS THE FAR LANE EMPTY?
     A CORRIDOR test, not a directional one. Directional was wrong twice over:
     it ignored cars that had already passed the cruiser, but those cars are
     still sitting in the lane he would be sending people into. What matters is
     simply whether the stretch of far lane the detour uses is occupied — either
     side of the cruiser, coming or going.

     Cars whose ORIGINAL lane is the blocked one are excluded: they are the
     batch he is already waving through, and counting them would mean a wave
     could never continue once the first car pulled out. */
  /* NOTE ON THE TOLERANCE THAT CAUSED A FALSE PASS:
     opposing-lane cars sit about 368 units laterally from the cruiser. While
     STOP.lane was 300 they were never counted at all, so this test reported
     "empty" unconditionally and he waved without ever looking. STOP.lane is now
     520, wide enough to actually see the far lane. */
  const corridor = DIRECT.detourRange + DIRECT.clearMargin;
  const clear = !sc.route.traffic.some(tr => {
    const lane0 = (tr.__lane0 !== undefined) ? tr.__lane0 : tr.laneOffset;
    if(Math.sign(lane0) === Math.sign(rb.lane)) return false;   // our own batch
    const w = trafficWorldAt(tr, t);
    const d = DIRV[w.f];
    const dx = rb.x - w.wp.x, dy = rb.y - w.wp.y;
    if(Math.abs(-dx*d.y + dy*d.x) > STOP.lane) return false;    // another street
    return Math.abs(dx*d.x + dy*d.y) < corridor;                // in the corridor
  });

  const el = t - w.t0;
  if(w.on){
    if(!clear || el > DIRECT.waveMs){ w.on = false; w.t0 = t; }
  } else {
    if(clear && el > DIRECT.holdMs){ w.on = true; w.t0 = t; }
  }
}

/* Pull WAVED cars around the cruiser via the far lane, and let them drift back
   once past. Only cars in the blocked lane detour, and only cars that are not
   being held.

   THE HELD CHECK IS WHAT STOPS THE BOUNCE. Previously the detour looked only at
   distance, so a car waiting at the line would edge out toward the far lane,
   get held, ease back, and edge out again — a visible wobble while it queued.
   A held car now sits squarely in its own lane and only pulls out once he
   actually waves it through.

   Easing is normalised against dt so the manoeuvre reads the same regardless of
   frame rate, rather than snapping on fast frames and crawling on slow ones. */
function updateDetour(sc, site, t, st, dt){
  const rb = site.roadblock;
  const k = 1 - Math.pow(1 - DIRECT.detourEase, Math.max(0.001, dt/16.7));
  for(const c of st){
    const tr = c.tr;
    if(tr.__lane0 === undefined) tr.__lane0 = tr.laneOffset;
    if(Math.sign(tr.__lane0) !== Math.sign(rb.lane)) continue;

    let want = 0;
    if(!c.held){
      const dx = rb.x - c.x, dy = rb.y - c.y;
      const along = dx*c.d.x + dy*c.d.y;
      const lat   = Math.abs(-dx*c.d.y + dy*c.d.x);
      if(lat < STOP.lane && Math.abs(along) < DIRECT.detourRange){
        const u = 1 - Math.abs(along)/DIRECT.detourRange;
        want = u*u*(3 - 2*u);
      }
    }
    const target = tr.__lane0 * (1 - 2*want);
    tr.laneOffset += (target - tr.laneOffset) * k;
  }
}

function updateStop(sc, t){
  const site = sc.__crime, rb = site && site.roadblock;
  if(!rb) return;
  const dt = Math.max(0, Math.min(200, t - (sc.__stopT === undefined ? t : sc.__stopT)));
  sc.__stopT = t;
  if(dt <= 0) return;

  /* live world state for EVERY car in the city, not just one walk */
  const st = sc.route.traffic.map(tr => {
    const w = trafficWorldAt(tr, t);
    return { tr, x: w.wp.x, y: w.wp.y, d: DIRV[w.f], held: false };
  });

  /* is (tx,ty) ahead of this car, on its road, within `dist`? */
  const ahead = (c, tx, ty, dist) => {
    const dx = tx - c.x, dy = ty - c.y;
    const along = dx*c.d.x + dy*c.d.y;
    if(along <= 0 || along > dist) return false;
    return Math.abs(-dx*c.d.y + dy*c.d.x) < STOP.lane;
  };

  updateDirect(sc, site, t);

  /* While he is waving the blocked lane through, nobody is held — that is what
     the wave MEANS. Cars still pull around the cruiser via updateDetour. */
  const waving = site.wave && site.wave.on;

  /* COMMITMENT — the real cure for the bouncing.
     A wave lasts a few seconds; a car takes longer than that to pull out, pass
     the cruiser and tuck back in. When the wave ended mid-manoeuvre the car was
     re-held and snapped back to its lane, then pulled out again on the next
     wave — the wobble seen on device. So once he has waved a car and it is
     close enough to be committed, it finishes the pass regardless of what the
     wave does behind it. Cleared once it is well past. */
  for(const c of st){
    const tr = c.tr;
    if(Math.sign(tr.__lane0 !== undefined ? tr.__lane0 : tr.laneOffset) !== Math.sign(rb.lane)) continue;
    const dx = rb.x - c.x, dy = rb.y - c.y;
    const along = dx*c.d.x + dy*c.d.y;
    const lat   = Math.abs(-dx*c.d.y + dy*c.d.x);
    if(lat > STOP.lane){ tr.__commit = false; continue; }
    if(waving && along < DIRECT.detourRange) tr.__commit = true;   // sent, and close
    if(along < -DIRECT.detourRange)          tr.__commit = false;  // well clear
  }

  /* the cruiser stops the front car; a stopped car stops the one behind it.
     Two propagation passes is enough for the queue depths we ever see. */
  for(const c of st) c.held = !waving && !c.tr.__commit && ahead(c, rb.x, rb.y, STOP.line);
  for(let pass = 0; pass < 3; pass++){
    for(const c of st){
      if(c.held || c.tr.__commit) continue;
      for(const o of st){
        if(o === c || !o.held) continue;
        if(ahead(c, o.x, o.y, STOP.gap)){ c.held = true; break; }
      }
    }
  }

  /* Detour AFTER the hold is decided, so it can honour it. */
  updateDetour(sc, site, t, st, dt);

  /* Apply by winding sBase back exactly the distance this car would have
     covered. trafficWorldAt reads sBase, so this is what actually stops the
     car the player sees — and the one the collision test uses. */
  for(const c of st){
    if(!c.held) continue;
    const total = c.tr.walk.totalLen;
    c.tr.sBase = ((c.tr.sBase - c.tr.speed*c.tr.dir*dt) % total + total) % total;
  }
}

function findCrimeSite(sc){
  const r = sc.route;
  if(!r || !r.cutEdges || !r.grid) return null;
  const byKey = {};
  for(const b of r.grid.blocks) byKey[b.i + "," + b.j] = b;

  const cands = [];
  for(const key of Object.keys(r.cutEdges)){
    const blk = byKey[key];
    if(!blk || blk.type !== "commercial") continue;
    for(const idx of r.cutEdges[key]){
      const e = sc.blockEdges(blk)[idx];
      const stalls = stallsForEdge(sc, e, CRIME_STALLS);
      if(stalls && stalls.length >= CRIME_STALLS) cands.push({ blk, idx, e, stalls });
    }
  }
  if(!cands.length) return null;

  /* Anchor to the STALL CLUSTER, not the block centre. A block box is ~1656
     units across and the route wraps around it, so "closest to block centre"
     happily landed the robot on the opposite corner, 1700 units from the lot
     with the camera's look-ahead pushing it further still. The cluster is what
     you actually want to be standing next to. */
  let best = null;
  const step = Math.max(30, r.totalLen/1400);
  for(const c of cands){
    const gx = c.stalls.reduce((a,s)=>a+s.x,0)/c.stalls.length;
    const gy = c.stalls.reduce((a,s)=>a+s.y,0)/c.stalls.length;
    let bs = 0, bd = Infinity;
    for(let s = 0; s < r.totalLen; s += step){
      const p = sc.posAt(s);
      const d = (p.x-gx)**2 + (p.y-gy)**2;
      if(d < bd){ bd = d; bs = s; }
    }
    c.s = bs; c.dist = Math.sqrt(bd); c.gx = gx; c.gy = gy;
    /* prefer sites the route genuinely passes close to; break ties by
       earliest along the route so you reach it without a long drive. */
    if(!best || c.dist < best.dist - 200 ||
       (Math.abs(c.dist - best.dist) <= 200 && c.s < best.s)) best = c;
  }
  return best;
}

/* ============================ bench driver ============================ */
BENCH.hook(function(sc, t){
  if(sc.__crimeRoute !== sc.route){          // recompute only on route change
    sc.__crimeRoute = sc.route;
    sc.__crime = findCrimeSite(sc);
    if(sc.__crime) sc.__crime.roadblock = roadblockSpot(sc, sc.__crime);
    window.__crime = sc.__crime
      ? { s: Math.round(sc.__crime.s), block: sc.__crime.blk.i + "," + sc.__crime.blk.j,
          edge: sc.__crime.idx, stalls: sc.__crime.stalls.length }
      : null;
    /* Land the robot just short of the scene so it comes up ahead of you
       rather than needing the whole leg driven to find out if it worked.
       Once per route, never per frame — place() moves the camera too. */
    if(sc.__crime && window.BENCH){
      const cr = sc.__crime;
      /* stand the robot beside the lot so it is in shot too */
      if(BENCH.place) BENCH.place(Math.max(0, cr.s - 120));
      /* publish where the interesting thing is, then look at it. The bench
         camera owns camX/camY/K in a PRE-draw hook, so this survives update()
         easing instead of being overwritten before the frame is drawn. */
      sc.__benchFocus = { x: cr.gx, y: cr.gy, k: 0.85 };
      if(BENCH.lookAt) BENCH.lookAt(cr.gx, cr.gy, 0.85);
    }
  }
  const site = sc.__crime;
  if(!site) return;
  /* Publish the frame time. The bench and any diagnostic need a REAL t: an
     earlier probe read a field that no longer existed, silently got 0, and
     reported cars as stationary when they were moving. */
  sc.__labT = t;

  /* THE SCENE OWNS THIS LOT.
     drawParkingRow spawns its own civilian cars into some stalls, and one was
     parked in the middle of the scene — the perimeter officer walked straight
     through it. The method RETURNS its cars for the caller to queue rather than
     drawing them itself, so returning an empty list for this one edge removes
     them while leaving the painted bays untouched. Every other lot in the city
     is unaffected. */
  if(!sc.__crimeRowPatched && site.e){
    const orig = sc.drawParkingRow.bind(sc);
    sc.drawParkingRow = function(g, ox, oy, dv, rv, w, seed, tt){
      const cars = orig(g, ox, oy, dv, rv, w, seed, tt);
      const cr = sc.__crime;
      if(cr && cr.e && Math.abs(ox - cr.e.ox) < 1 && Math.abs(oy - cr.e.oy) < 1) return [];
      return cars;
    };
    sc.__crimeRowPatched = true;
  }

  /* Hold the robot still so it does not wander out of the scene while you
     look at it. The CAMERA is no longer the reason for this — the bench camera
     owns the projection now — so releasing it just lets you drive past.
     window.__labDrive = true to release. */
  if(!window.__labDrive){ sc.speed = 0; sc.throttle = 0; }

  const g = sc.gFront;

  if(!site.officers) site.officers = officerSpots(sc, site);
  updateStop(sc, t);

  /* ---------------------------------------------------------------------
     ONE DEPTH-SORTED PASS over cars AND officers.
     Drawing every car and then every officer meant a man standing behind a
     cruiser still painted over its roof. Both are ground objects in the same
     space, so they go in one list keyed by iso depth (x + y) and are drawn
     back to front. Same reason the car's own panels sort by depth rather than
     by a fixed order.
     --------------------------------------------------------------------- */
  const items = [];

  const car = (x, y, fdir, phase) => items.push({ d: x + y, draw: () => {
    const saved = CAR_COLORS.slice();
    for(let i = 0; i < CAR_COLORS.length; i++) CAR_COLORS[i] = POLICE_LIVERY;
    try { sc.drawProp(g, "car", x, y, t, fdir, 0, null, 0); }
    finally { for(let i = 0; i < CAR_COLORS.length; i++) CAR_COLORS[i] = saved[i]; }
    drawPoliceHardware(sc, g, x, y, 0, fdir, t, phase);
  }});

  CRIME_CAR_STALLS.forEach((si, i) => {
    const st = site.stalls[si];
    if(st) car(st.x, st.y, st.fdir, i*0.37);      // strobes offset per car
  });
  if(site.roadblock) car(site.roadblock.x, site.roadblock.y, site.roadblock.fdir, 0.74);

  site.officers.forEach((o, i) => {
    let x, y, th, moving;
    if(o.fixed){
      x = o.x; y = o.y; th = o.th; moving = false;
    } else {
      const w = pathAt(o.path, t, o.phase, o.speed, WALK.pause, o.loop);
      x = w.x; y = w.y; moving = w.walking;
      th = moving ? faceDir(w.ux, w.uy) : (o.__lastTh !== undefined ? o.__lastTh : faceDir(w.ux, w.uy));
      if(moving) o.__lastTh = th;                 // hold the last heading through a pause
    }
    /* seed off the ROUTE, not the live position — seeding off a moving point
       rerolled build/skin/hair every frame and the man flickered between
       four different people. */
    if(o.__seed === undefined){
      const h = o.fixed ? o : o.path[0];
      o.__seed = ((Math.round(h.x)*73856093) ^ (Math.round(h.y)*19349663) ^ i) >>> 0;
    }
    const wp = moving ? Math.sin(t*PEOPLE_ART.walkSpeed) : 0;
    /* the man on the road raises an arm and waves it while he is sending cars
       through, and drops it while he is holding them. liftT rotates the arm
       about a fixed shoulder pivot, so the arm stays rigid at every value. */
    let lift = 0;
    if(o.role === "traffic"){
      const waving = site.wave && site.wave.on;
      const targ = waving ? 0.62 + 0.28*Math.sin(t*0.001*DIRECT.armHz*Math.PI*2) : 0;
      o.__lift = (o.__lift === undefined) ? targ : o.__lift + (targ - o.__lift)*0.12;
      lift = o.__lift;
    }
    items.push({ d: x + y,
                 draw: () => drawOfficer(sc, g, x, y, th, o.__seed, wp, moving, lift) });
  });

  updateTape(sc, site, t);
  if(site.tape){
    /* one queue entry per span, each at its own depth, so the kerb run and the
       two cross-walk spans sort against the cars and officers individually
       rather than all at one averaged depth */
    site.tape.forEach((sp, i) => {
      items.push({ d: (sp.a.x + sp.a.y + sp.b.x + sp.b.y)/2,
                   draw: () => drawTapeSpan(sc, g, site, i, t) });
    });
  }

  items.sort((a, b) => a.d - b.d);
  items.forEach(it => it.draw());
});
