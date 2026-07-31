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

/* ---- find a site: a CUT edge on a COMMERCIAL block with room for stalls ---- */
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

  /* Hold the robot still so it does not wander out of the scene while you
     look at it. The CAMERA is no longer the reason for this — the bench camera
     owns the projection now — so releasing it just lets you drive past.
     window.__labDrive = true to release. */
  if(!window.__labDrive){ sc.speed = 0; sc.throttle = 0; }

  const g = sc.gFront;
  const saved = CAR_COLORS.slice();
  for(let i = 0; i < CAR_COLORS.length; i++) CAR_COLORS[i] = POLICE_LIVERY;
  try {
    /* two cruisers, in the first two real stalls */
    for(const si of CRIME_CAR_STALLS){
      const st = site.stalls[si];
      if(st) sc.drawProp(g, "car", st.x, st.y, t, st.fdir, 0, null, 0);
    }
  } finally {
    for(let i = 0; i < CAR_COLORS.length; i++) CAR_COLORS[i] = saved[i];
  }
  CRIME_CAR_STALLS.forEach((si, i) => {
    const st = site.stalls[si];
    /* offset the strobe phase per car so the two bars are not in lockstep */
    if(st) drawPoliceHardware(sc, g, st.x, st.y, 0, st.fdir, t, i*0.37);
  });
});
