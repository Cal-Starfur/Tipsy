/* =====================================================================
   THE HOUSES -- the house library (Sir, 2026-09-21).
   =====================================================================
   "do the same thing we did with the shops for the houses ... we need to
   have 83 different houses by the end of it." The legacy generator
   (drawHouseUnit) is switched off in game/index.html by HOUSE_ART_LEGACY;
   this file is what replaces it, dialled one house at a time in
   labs/house-lab.html.

   SAME HOST CONTRACT AS THE SHOPS. Same kit (shopfront-kit.js), same
   frame -- a along the frontage, b 0 at the LOT FRONT (the back of the
   pavement) and negative into the block, z up -- same P(), same benches,
   same vol (shopfront-vol.js). An entry is { name, draw(p), back(p), vol,
   ... } exactly like a shop, so everything the shop port learned carries.

   THE GRID IS THE SHOPS' GRID (Sir, 2026-09-21: "lets use the shops grid
   that we developed"). Measured from the live build before choosing:

     tier     lab ww    sc     in game
     single   460       1.3    598   x 717.6
     double   809.6     1.3    1052.5 x 717.6

   Depth doubled 2026-09-21 (Sir): lab dd 552, not the shops' 276. The
   fronts did not move -- yards, facades and doors stay where they were;
   every house grew 276 backward.
   Width doubled the same day (Sir). Done as a rewrite of every
   along-frontage coordinate (xf/widen.js, AST-driven): structure
   doubled; the delivery door, every prop, and small fixed features
   (chimneys, posts, mullions -- pairs 40 wide or less) moved as rigid
   bodies to their doubled centres, so nothing that has a true size in
   the game got stretched, and no circle went oval.

   A body is written in its OWN units (ww x 552, the lab's 1.5 vertical
   factor) and carries sc:1.3; the host scales it on the ground. Never
   pre-scale a body by hand.

   WHAT A HOUSE HAS THAT A SHOP DID NOT
   ------------------------------------
   1. A DELIVERY DOOR. Every house is a possible address. The game draws
      the real, animated door (drawDoorAssembly, DOOR_ART 92 x 184 world)
      and the mat (92 x 92 world, in front of it) ITSELF, on top of the
      art. So an entry DECLARES where that door is:

        door: [a, b]      centre of the doorway at floor level, own units

      and draws its opening with houseDoorway(), which sizes the hole to
      the game's door at the entry's scale -- 92/sc wide, 184/(ZSCALE*sc)
      tall -- so the port's door lands in the hole exactly. No clamping:
      shopDoor() silently clamps its centre and the doors ended up
      somewhere their source did not say. The lab census checks the drawn
      doorway against the declared one.

   2. A FRONT YARD. The old houses stood on the lot front; a house here
      may be set back behind a garden, a path and a fence. The yard is
      real ground: vol.foot is the house MASS only, so everything else on
      the lot is drivable, and fences are vol.solids with a gate gap. The
      mat has to be reachable -- the census drives a straight line from
      the lot front to the mat at the robot's radius and fails the entry
      if it is blocked.

        vol.marks.door  = door
        vol.marks.mat   = centre of the mat, 35.4/ (92/2/sc) in front of it

   3. A FORE LAYER. In the game the door is drawn AFTER the house body,
      so anything standing between the door and the street -- a porch
      post, a porch roof, a door hood, a fence -- would be painted over by
      the door if it lived in draw(). Those go in fore(p), which the host
      draws after the door. The lab keeps the same order (draw, delivery
      ghost, fore), so what you see here is what the port will stack.

   4. A BACK. Houses go on every edge, so back(p) exists from day one --
      the lesson of the 21 shops that had to get theirs after the fact.

   THE CENSUS (in the lab, every entry, every load) -- the shop faults
   found by hand, made mechanical. Front AND back, props ON:
     - declared door present, drawn doorway matches it
     - no window drawn across the doorway
     - nothing drawn outside the lot, props included, front or back
     - every prop drawn through houseProp() has a vol solid of the same
       name with prop:true -- no decorative-only props
     - back() present
     - vol declared; mat reachable at the robot's radius
   Face-plane circles: use faceCircle/plateCircle from the kit, never
   ctx.arc, for anything lying in a plane.

   HOODS. Like the Flats shops, a hood's houses are individual entries
   edited by hand (name, palette, detail) -- not a shared recolour table.
   `liv` is an entry's own palette set; the lab's Palette button steps it.
   ===================================================================== */

const HOUSE_SC = 1.3;
/* Sir, 2026-09-21: "now lets also make them twice as wide". Singles
   230 -> 460 (598 in game), doubles 404.8 -> 809.6 (1052.5). A 1656
   edge holds a double + a single (1650.5) or two singles. */
const HOUSE_SINGLE = 460;        // 460   -> 598 in game
/* Sir, 2026-09-21: "lets just double their depth". 276 -> 552 own
   units, 717.6 in game. At that depth two back-to-back lots use 1435 of a
   1656 block, and an edge that also has houses on both side streets keeps
   only ~166 of frontage between the corner lots -- placement decides
   which edges carry houses. */
const HOUSE_DEPTH_LAB = 552;     // 552   -> 717.6 in game
const HOUSE_DOUBLE = 809.6;      // 809.6 -> 1052.5 in game

/* census recorder: the lab sets this to [] while it audits an entry */
let HOUSE_REC = null;

/* A PROP IS A THING HE CAN HIT. Every kerb/yard prop goes through here
   under a name, and the entry's vol must carry a solid of the SAME name
   with prop:true -- the census fails any prop drawn without one. That is
   the gap the shops had: pavement props that looked solid and were not
   (cTodo), found on-device one at a time. */
function houseProp(name, fn){
  if(!state.props) return;
  if(HOUSE_REC) HOUSE_REC.push({ kind:'prop', name });
  if(typeof HOUSE_TREE_PROP !== 'undefined' && HOUSE_TREE_PROP.test(name)) houseCanopy(fn);   // trees: see TREES
  else fn();
}

/* the game's door, in an entry's own units */
function houseDoorDims(sc){ return { w: DOOR_W / sc, h: DOOR_H / (ZSCALE * sc) }; }
/* the game's mat depth (T2 world), in own units */
function houseMatDepth(sc){ return T2 / sc; }

/* THE DELIVERY DOORWAY. dir +1 on a front face (viewer toward +b), -1 on
   a rear face. Casing, dark opening, a closed leaf in DOOR_ART's panel
   layout so the art reads right before the game's door lands on it. */
function houseDoorway(aMid, bf, sc, casing, leaf, dir){
  const d = dir || 1, { w, h } = houseDoorDims(sc);
  const a0 = aMid - w/2, a1 = aMid + w/2;
  if(HOUSE_REC) HOUSE_REC.push({ kind:'door', a0, a1, z0:0, z1:h, b:bf });
  F(a0-7, a1+7, 0, h+7, casing, shade(casing,.7), 1, bf + 0.3*d);
  F(a0, a1, 0, h, '#2b2118', null, 0, bf + 0.4*d);
  F(a0+1.5, a1-1.5, 0, h-1.5, leaf, null, 0, bf + 0.6*d);
  const ins = 8/sc;
  F(a0+ins, a1-ins, h*0.46, h*0.90, shade(leaf,1.14), shade(leaf,.72), 1, bf + 0.8*d);
  F(a0+ins, a1-ins, h*0.10, h*0.38, shade(leaf,1.14), shade(leaf,.72), 1, bf + 0.8*d);
  F(a1-ins-4, a1-ins, h*0.44, h*0.48, '#d8c28a', null, 0, bf + 1.0*d);   // knob
  return { a0, a1, h };
}

/* a sash window on the plane b = bf. Frame proud of the glass, sky band
   at the head, glazing bars, a real sill that projects toward the eye. */
function houseWin(a0, a1, z0, z1, bf, frame, sill, dir, opts){
  const d = dir || 1, o = opts || {};
  if(HOUSE_REC) HOUSE_REC.push({ kind:'win', a0: a0-4, a1: a1+4, z0: z0-4, z1: z1+4, b:bf });
  if(o.shutter){
    const sw = (a1-a0)*0.42;
    for(const [s0,s1] of [[a0-6-sw, a0-6], [a1+6, a1+6+sw]]){
      F(s0, s1, z0-2, z1+2, o.shutter, shade(o.shutter,.7), 1, bf + 0.3*d);
      for(let z = z0+6; z < z1-2; z += 7) F(s0+2, s1-2, z, z+1.6, shade(o.shutter,.78), null, 0, bf + 0.5*d);
    }
  }
  F(a0-4, a1+4, z0-4, z1+4, frame, shade(frame,.7), 1, bf + 0.3*d);
  F(a0, a1, z0, z1, '#34424b', null, 0, bf + 0.5*d);
  F(a0, a1, z1 - (z1-z0)*0.40, z1, 'rgba(170,205,220,.38)', null, 0, bf + 0.6*d);
  poly([P(a0+2, bf+0.7*d, z1-2), P(a0+(a1-a0)*0.45, bf+0.7*d, z1-2),
        P(a0+(a1-a0)*0.18, bf+0.7*d, z0+2), P(a0+2, bf+0.7*d, z0+2)], 'rgba(240,250,254,.14)');
  const am = (a0+a1)/2, zm = (z0+z1)/2;
  if(o.lead){                                                 // leaded diamond panes
    const st = 10;
    for(let t = -(z1-z0); t < (a1-a0); t += st){
      const c0 = Math.max(0, t), c1 = Math.min(a1-a0, t + (z1-z0));
      if(c1 > c0) poly([P(a0+c0, bf+0.7*d, z0 + (c0-t)), P(a0+c1, bf+0.7*d, z0 + (c1-t))], null, 'rgba(40,40,44,.55)', 0.8);
      const e0 = Math.max(0, t), e1 = Math.min(a1-a0, t + (z1-z0));
      if(e1 > e0) poly([P(a0+e0, bf+0.7*d, z1 - (e0-t)), P(a0+e1, bf+0.7*d, z1 - (e1-t))], null, 'rgba(40,40,44,.55)', 0.8);
    }
  }
  if(!o.plain){
    F(am-1.5, am+1.5, z0, z1, frame, null, 0, bf + 0.8*d);
    F(a0, a1, zm-1.5, zm+1.5, frame, null, 0, bf + 0.8*d);
  }
  if(d > 0) slab(a0-7, a1+7, z0-9, z0-4, bf+7, bf, sill);
  else      slab(a0-7, a1+7, z0-9, z0-4, bf-7, bf, sill);
  if(o.box){                                                  // window box, flowers on top
    if(d > 0) slab(a0-2, a1+2, z0-24, z0-10, bf+12, bf, o.box);
    else      slab(a0-2, a1+2, z0-24, z0-10, bf-12, bf, o.box);
    const bb = bf + 7*d;
    for(let k = 0; k < 5; k++){
      const aa = a0 + 3 + (a1-a0-6)*k/4;
      ball(aa, bb, z0-8, 4.2, k % 2 ? '#e2748c' : '#f2d36a');
    }
  }
}

/* the walls of a rectangular mass: the seen face, the seen end, a plinth.
   dir +1 draws the front face at bf, -1 the rear face at bb. */
function houseMass(a0, a1, bf, bb, H, wall, dir, z0){
  const d = dir || 1, zb = z0 || 0, face = d > 0 ? bf : bb;
  if(FLANK_RIGHT) S(a1, bb, bf, zb, H, shade(wall,.78));
  else            S(a0, bb, bf, zb, H, shade(wall,.72));
  F(a0, a1, zb, H, d > 0 ? wall : shade(wall,.93), null, 0, face);
  poly([P(a0,face,H),P(a1,face,H),P(a1,face,zb),P(a0,face,zb)], null, shade(wall,.6), 1.2);
  F(a0, a1, zb, zb+10, shade(wall,.68), null, 0, face + 0.5*d);
}

/* WINDOWS ON THE SEEN END. At 552 deep the flank a viewer sees is twice
   as long as the front; left blank it reads as a warehouse. Spaced along
   b, on whichever end is seen (a1 from the street, a0 from behind). */
function houseSideWins(a0, a1, bf, bb, rows, frame, opts){
  const o = opts || {}, aE = FLANK_RIGHT ? a1 : a0, s = FLANK_RIGHT ? 1 : -1;
  const f0 = bf - (o.skipFront || 30), f1 = bb + (o.skipBack || 30);
  const n = Math.max(1, Math.floor((f0 - f1) / (o.pitch || 80)));
  const st = (f0 - f1) / n, w = o.w || 38;
  for(const [z0, z1] of rows) for(let k = 0; k < n; k++){
    const bc = f0 - st*(k + 0.5), b0 = bc - w/2, b1 = bc + w/2;
    S(aE + 0.3*s, b0-4, b1+4, z0-4, z1+4, frame);
    S(aE + 0.5*s, b0, b1, z0, z1, '#34424b');
    S(aE + 0.6*s, b0, b1, z1 - (z1-z0)*0.4, z1, 'rgba(170,205,220,.35)');
    if(!o.plain){ S(aE + 0.7*s, bc-1.5, bc+1.5, z0, z1, frame); S(aE + 0.7*s, b0, b1, (z0+z1)/2-1.5, (z0+z1)/2+1.5, frame); }
    S(aE + 0.8*s, b0-6, b1+6, z0-9, z0-4, shade(frame,.9));
  }
}

/* a pitched roof, ridge parallel to the frontage, gable at the ends.
   Only the slope toward the eye is drawn (dir), plus the seen gable. */
function houseGableRoof(a0, a1, bf, bb, He, Hr, o, roof, wall, dir){
  /* 2026-09-21: rewritten on houseFace. The first version drew only the
     slope toward the eye and trusted the pitch to hide the other one --
     true at 276 deep, false at 552, where the same ridge over twice the
     run is half the pitch and the far slope comes into view. dir is kept
     for the call sites and no longer used: each face decides. */
  const mid = (bf+bb)/2, run = (bf-bb)/2, k = (Hr-He)/run, zE = He - o*k;
  const A0 = a0-o, A1 = a1+o, Bf = bf+o, Bb = bb-o;
  const wc = [(a0+a1)/2, mid, He + (Hr-He)*0.3];
  houseFace([[a0,bf,He],[a0,bb,He],[a0,mid,Hr]], wc, shade(wall,.8), shade(wall,.6));
  houseFace([[a1,bf,He],[a1,bb,He],[a1,mid,Hr]], wc, shade(wall,.8), shade(wall,.6));
  const ctr = [(a0+a1)/2, mid, zE + (Hr-zE)*0.25], cc = shade(roof,.8), fctr = [(a0+a1)/2, mid, zE-3];
  const Fq = [[A0,Bf,zE],[A1,Bf,zE],[A1,mid,Hr],[A0,mid,Hr]], Bq = [[A0,Bb,zE],[A1,Bb,zE],[A1,mid,Hr],[A0,mid,Hr]];
  if(houseFace(Fq, ctr, roof)){ houseCourses(Fq[0], Fq[3], Fq[1], Fq[2], cc, 0.16);
    houseFace([[A0,Bf,zE],[A1,Bf,zE],[A1,Bf,zE-7],[A0,Bf,zE-7]], fctr, shade(roof,.7)); }
  if(houseFace(Bq, ctr, roof)){ houseCourses(Bq[0], Bq[3], Bq[1], Bq[2], cc, 0.16);
    houseFace([[A0,Bb,zE],[A1,Bb,zE],[A1,Bb,zE-7],[A0,Bb,zE-7]], fctr, shade(roof,.7)); }
  for(const A of [A0, A1]){                                    // barge boards, culled like the rest
    houseFace([[A,Bf,zE],[A,mid,Hr],[A,mid,Hr-7],[A,Bf,zE-7]], fctr, shade(roof,.66));
    houseFace([[A,mid,Hr],[A,Bb,zE],[A,Bb,zE-7],[A,mid,Hr-7]], fctr, shade(roof,.58));
  }
}

/* a hipped roof over a rectangular mass. ends.lo / ends.hi false means
   that end dies into a taller neighbour instead of hipping. */
function houseHipRoof(a0, a1, bf, bb, He, Hr, o, roof, dir, ends){
  /* now a thin wrapper on houseHip (all faces culled) -- same reason as
     houseGableRoof above. */
  houseHip(a0, a1, bf, bb, He, Hr, o, roof, ends);
}

/* a white picket fence along b, a0..a1 */
function housePickets(a0, a1, b, h, col){
  F(a0, a1, h*0.28, h*0.28+3, shade(col,.86), null, 0, b - 0.4);
  F(a0, a1, h*0.66, h*0.66+3, shade(col,.86), null, 0, b - 0.4);
  for(let a = a0 + 2; a < a1 - 3; a += 10.5)
    poly([P(a,b,0), P(a+5,b,0), P(a+5,b,h-3), P(a+2.5,b,h), P(a,b,h-3)], col, shade(col,.7), 0.8);
}
/* a square fence / gate post */
function housePost(a, b, h, col){ box(a-4, a+4, b-4, b+4, 0, h, shade(col,1.05), col, shade(col,.8)); }

/* a lawn with mown stripes, a0..a1 by b0..b1 (b0 deeper) */
function houseLawn(a0, a1, b0, b1, col){
  T(a0, a1, b0, b1, 0.4, col);
  for(let a = a0; a < a1; a += 24) T(a, Math.min(a+12, a1), b0, b1, 0.45, shade(col,1.06));
}


/* ================= CONVEX FACES =================
   The first two roofs drew only "the slope toward the eye" and relied on
   the pitch being steep enough that the far slope stays hidden. That is
   an assumption about pitch, and it is false for any low roof: a slope
   is hidden only when 1.5 x rise > run (the lab's 1.5 vertical factor).
   A ranch hip or a craftsman gable fails it and would show a hole where
   the far slope should be.

   So a roof is a convex solid, and each face decides for itself. A face
   is given as world points plus a point inside the solid; it is turned
   to face outward (Newell normal against the interior point), projected,
   and drawn only if its screen winding matches the winding of an upward
   plate -- which is always seen. Measuring the reference through P()
   makes the test survive every host transform, including the game's
   mirrored edges, where a hard-coded sign would invert. Faces of one
   convex solid never overlap on screen, so no ordering is needed. */
function houseArea(q){ let s = 0; for(let i = 0; i < q.length; i++){ const p = q[i], r = q[(i+1) % q.length]; s += p.x*r.y - r.x*p.y; } return s; }
function houseSeenSign(){ return Math.sign(houseArea([P(0,0,0), P(1,0,0), P(1,1,0), P(0,1,0)])); }
function houseFace(pts, ctr, fill, stroke){
  let nx = 0, ny = 0, nz = 0, cx = 0, cy = 0, cz = 0;
  for(let i = 0; i < pts.length; i++){
    const p = pts[i], q = pts[(i+1) % pts.length];
    nx += (p[1]-q[1])*(p[2]+q[2]); ny += (p[2]-q[2])*(p[0]+q[0]); nz += (p[0]-q[0])*(p[1]+q[1]);
    cx += p[0]; cy += p[1]; cz += p[2];
  }
  cx /= pts.length; cy /= pts.length; cz /= pts.length;
  if(nx*(cx-ctr[0]) + ny*(cy-ctr[1]) + nz*(cz-ctr[2]) < 0) pts = pts.slice().reverse();
  const q = pts.map(p => P(p[0], p[1], p[2]));
  if(Math.sign(houseArea(q)) !== houseSeenSign()) return false;
  poly(q, fill, stroke === undefined ? shade(fill,.6) : stroke, 1);
  return true;
}
/* courses (tiles, shingles) between two edges of a face, p0->p1 and q0->q1 */
function houseCourses(p0, p1, q0, q1, col, step){
  for(let t = step || 0.14; t < 0.99; t += step || 0.14){
    const L = (u, v) => P(u[0]+(v[0]-u[0])*t, u[1]+(v[1]-u[1])*t, u[2]+(v[2]-u[2])*t);
    poly([L(p0,p1), L(q0,q1)], null, col, 1);
  }
}

/* A FULL HIP, every face culled -- for low pitches. lo/hi:false stops an
   end at the wall line (it dies into a neighbour) and draws no face there. */
function houseHip(a0, a1, bf, bb, He, Hr, o, roof, opts){
  const e = opts || {}, lo = e.lo !== false, hi = e.hi !== false;
  const mid = (bf+bb)/2, run = (bf-bb)/2, k = (Hr-He)/run, zE = He - o*k;
  const Lo = lo ? a0-o : a0, Hi = hi ? a1+o : a1, Bf = bf+o, Bb = bb-o;
  const i = Math.min(run+o, (Hi-Lo)/2);
  const R0 = lo ? Lo+i : Lo, R1 = hi ? Hi-i : Hi;
  const ctr = [(a0+a1)/2, mid, zE + (Hr-zE)*0.25], cc = shade(roof,.78);
  const E0 = [Lo,Bf,zE], E1 = [Hi,Bf,zE], E2 = [Hi,Bb,zE], E3 = [Lo,Bb,zE], Q0 = [R0,mid,Hr], Q1 = [R1,mid,Hr];
  const fctr = [(a0+a1)/2, mid, zE-3];
  const fasc = (A, B) => houseFace([[A[0],A[1],zE],[B[0],B[1],zE],[B[0],B[1],zE-7],[A[0],A[1],zE-7]], fctr, shade(roof,.62));
  if(houseFace([E0,E1,Q1,Q0], ctr, roof)){ houseCourses(E0,Q0,E1,Q1,cc); fasc(E0,E1); }
  if(houseFace([E2,E3,Q0,Q1], ctr, roof)){ houseCourses(E3,Q0,E2,Q1,cc); fasc(E2,E3); }
  if(hi && houseFace([E1,E2,Q1], ctr, shade(roof,.84))){ houseCourses(E1,Q1,E2,Q1,cc); fasc(E1,E2); }
  if(lo && houseFace([E3,E0,Q0], ctr, shade(roof,.84))){ houseCourses(E0,Q0,E3,Q0,cc); fasc(E3,E0); }
  if(R1 > R0) poly([P(R0,mid,Hr), P(R1,mid,Hr)], null, shade(roof,1.15), 2);
}

/* A FRONT GABLE: ridge runs INTO the block (along b), the gable triangle
   stands on the street face. back0:true stops the roof at bb with no
   overhang (a porch gable dying into the main wall). */
function houseFrontGable(a0, a1, bf, bb, He, Hr, o, roof, wall, dir, opts){
  const d = dir || 1, e = opts || {}, am = (a0+a1)/2, run = (a1-a0)/2, k = (Hr-He)/run, zE = He - o*k;
  const A0 = a0-o, A1 = a1+o, Bf = bf + (e.front0 ? 0 : o), Bb = bb - (e.back0 ? 0 : o);
  const face = d > 0 ? bf : bb;
  poly([P(a0,face,He), P(a1,face,He), P(am,face,Hr)], e.gable || (d > 0 ? wall : shade(wall,.93)), shade(wall,.6), 1);
  if(e.shingle) for(let z = He+8; z < Hr-6; z += 8){                 // shingles in the gable
    const w = run*(Hr-z)/(Hr-He);
    poly([P(am-w, face + 0.3*d, z), P(am+w, face + 0.3*d, z)], null, shade(e.gable || wall,.82), 1);
  }
  const ctr = [am, (bf+bb)/2, zE + (Hr-zE)*0.25], cc = shade(roof,.8);
  /* valley: a wing's roof running back into a main slope -- eave and
     ridge stop at different depths, where each meets that slope */
  const bE = e.valley ? e.valley[0] : Bb, bR = e.valley ? e.valley[1] : Bb;
  const L = [[A0,Bf,zE],[A0,bE,zE],[am,bR,Hr],[am,Bf,Hr]], R = [[A1,Bf,zE],[A1,bE,zE],[am,bR,Hr],[am,Bf,Hr]];
  if(houseFace(L, ctr, roof)) houseCourses(L[0], L[3], L[1], L[2], cc);
  if(houseFace(R, ctr, roof)) houseCourses(R[0], R[3], R[1], R[2], cc);
  const Bx = d > 0 ? Bf + 0.3 : Bb - 0.3, bc = e.barge || shade(roof,.66);
  if(d > 0 || !e.back0){
    poly([P(A0,Bx,zE), P(am,Bx,Hr), P(am,Bx,Hr-8), P(A0,Bx,zE-8)], bc);
    poly([P(A1,Bx,zE), P(am,Bx,Hr), P(am,Bx,Hr-8), P(A1,Bx,zE-8)], bc);
  }
}

/* A DORMER on a side-gable's front slope. The slope is described by the
   main roof's front wall line bf and eave He, and k = rise per unit of b
   going back. Its cheeks follow the slope, so nothing is drawn inside
   the roof. Draw it AFTER the main roof. */
function houseDormer(a0, a1, bD, z1, zr, slope, wall, roof, trim){
  const zs = b => slope.He + (slope.bf - b)*slope.k;
  const z0 = zs(bD), bI = slope.bf - (z1 - slope.He)/slope.k, bR = slope.bf - (zr - slope.He)/slope.k;
  const am = (a0+a1)/2, o = 5;
  F(a0, a1, z0, z1, wall, shade(wall,.6), 1, bD);
  const aS = FLANK_RIGHT ? a1 : a0;
  poly([P(aS,bD,z0), P(aS,bD,z1), P(aS,bI,z1)], shade(wall,.76), shade(wall,.6), 1);
  houseWin(a0+8, a1-8, z0+8, z1-6, bD, trim, trim, 1);
  poly([P(a0,bD,z1), P(a1,bD,z1), P(am,bD,zr)], wall, shade(wall,.6), 1);
  const ctr = [am, (bD+bR)/2, z1 + (zr-z1)*0.3];
  houseFace([[a0-o,bD+o,z1],[a0-o,bI,z1],[am,bR,zr],[am,bD+o,zr]], ctr, roof);
  houseFace([[a1+o,bD+o,z1],[a1+o,bI,z1],[am,bR,zr],[am,bD+o,zr]], ctr, roof);
  poly([P(a0-o,bD+5.3,z1), P(am,bD+5.3,zr), P(am,bD+5.3,zr-5), P(a0-o,bD+5.3,z1-5)], trim);
  poly([P(a1+o,bD+5.3,z1), P(am,bD+5.3,zr), P(am,bD+5.3,zr-5), P(a1+o,bD+5.3,z1-5)], trim);
}

/* an arched surround round a doorway, on its wall plane */
function houseArch(aMid, bf, h, r, rise, col, d){
  const pts = [];
  for(let k = 0; k <= 12; k++){ const t = Math.PI*k/12; pts.push(P(aMid + r*Math.cos(t), bf + 0.25*(d||1), h + rise*Math.sin(t))); }
  pts.push(P(aMid - r, bf + 0.25*(d||1), 0), P(aMid + r, bf + 0.25*(d||1), 0));
  poly(pts, col, shade(col,.7), 1);
}
/* a flat roof inside a parapet: plate, then the ring far-to-near */
function houseParapetRoof(a0, a1, bf, bb, H, h, t, wall){
  T(a0, a1, bb, bf, H, shade(wall,.8));
  const nearF = !state.back;                                   // near b face: front view bf, back view bb
  const ringB = (b0, b1) => box(a0, a1, b0, b1, H, H+h, shade(wall,1.04), wall, shade(wall,.8));
  const sideA = a => box(a-t/2, a+t/2, bb, bf, H, H+h, shade(wall,1.04), wall, shade(wall,.8));
  if(nearF) ringB(bb, bb+t); else ringB(bf-t, bf);
  sideA(FLANK_RIGHT ? a0 + t/2 : a1 - t/2);
  sideA(FLANK_RIGHT ? a1 - t/2 : a0 + t/2);
  if(nearF) ringB(bf-t, bf); else ringB(bb, bb+t);
}

/* brick courses on a face plane */
function houseBrick(a0, a1, z0, z1, b, col, d){
  F(a0, a1, z0, z1, col, null, 0, b);
  for(let z = z0 + 6; z < z1; z += 6) poly([P(a0, b + 0.2*(d||1), z), P(a1, b + 0.2*(d||1), z)], null, shade(col,.8), 1);
}
/* a small tree: trunk and a canopy of balls */
function houseTree(a, b, h, leaf){
  cyl(a, b, 0, h*0.55, 4, '#6b5038');
  ball(a, b, h*0.7, h*0.28, leaf); ball(a-8, b+4, h*0.6, h*0.2, shade(leaf,1.1)); ball(a+7, b-3, h*0.82, h*0.18, shade(leaf,.92));
}
/* a saguaro */
function houseCactus(a, b, h, col){
  cyl(a, b, 0, h, 6, col, shade(col,1.15)); ball(a, b, h, 6, shade(col,1.1));
  cyl(a-14, b, h*0.45, h*0.75, 4.5, col, shade(col,1.15)); F(a-14, a, h*0.43, h*0.5, col, null, 0, b);
  cyl(a+13, b, h*0.55, h*0.85, 4.5, col, shade(col,1.15)); F(a, a+13, h*0.53, h*0.6, col, null, 0, b);
}


/* ================= MORE SHAPES (houses 12-20) =================
   All convex solids through houseFace, so every one survives the back
   view and the game's mirrored edges without a hand-written order. */

/* A ROOF ON ANY CONVEX PROFILE across the frontage: prof is [[b, z], ...]
   from the front eave to the back eave. Two points = a shed, three = a
   gable or a saltbox, five = a gambrel. The gable ends at a0 / a1 are
   filled down to the lower eave; a wall strip fills up to a taller eave.
   ext0 / ext1 false: no overhang at that eave (a porch roof that dies
   into a wall). lo / hi false: no gable at that end (dies into a mass). */
function houseProfileRoof(a0, a1, prof, o, roof, wall, opts){
  const e = opts || {}, n = prof.length;
  const zlow = Math.min(prof[0][1], prof[n-1][1]), ztop = Math.max(...prof.map(p => p[1]));
  const ext = (p, q, on) => { if(!on) return p; const db = p[0]-q[0], dz = p[1]-q[1], L = Math.hypot(db, dz) || 1; return [p[0] + o*db/L, p[1] + o*dz/L]; };
  const pr = [ext(prof[0], prof[1], e.ext0 !== false), ...prof.slice(1, n-1), ext(prof[n-1], prof[n-2], e.ext1 !== false)];
  const ctr = [(a0+a1)/2, (prof[0][0] + prof[n-1][0])/2, zlow + (ztop - zlow)*0.3];
  const dd = pts => pts.filter((p, i) => i === 0 || Math.hypot(p[0]-pts[i-1][0], p[1]-pts[i-1][1], p[2]-pts[i-1][2]) > 0.01);
  const endPts = a => dd([[a, prof[0][0], zlow], ...prof.map(p => [a, p[0], p[1]]), [a, prof[n-1][0], zlow]]);
  const gc = e.gable || shade(wall,.8);
  /* noEnds: the entry draws its own gable ends (a roof that runs out over
     an open gallery must not fill the gallery with wall) */
  if(e.lo !== false && !e.noEnds) houseFace(endPts(a0), ctr, gc, shade(wall,.6));
  if(e.hi !== false && !e.noEnds) houseFace(endPts(a1), ctr, gc, shade(wall,.6));
  /* wall strips up to a taller eave; onFront / onBack draw their detail
     (windows, siding) before the slopes, so the eave overhang stays on top */
  /* noStrips: the entry draws its own walls (a roof that overhangs its
     eave far out over the street has no wall under that eave) */
  if(!e.noStrips && prof[0][1] > zlow + 0.5 &&
     houseFace([[a0,prof[0][0],zlow],[a1,prof[0][0],zlow],[a1,prof[0][0],prof[0][1]],[a0,prof[0][0],prof[0][1]]], ctr, e.front || wall, null) && e.onFront) e.onFront();
  if(!e.noStrips && prof[n-1][1] > zlow + 0.5 &&
     houseFace([[a0,prof[n-1][0],zlow],[a1,prof[n-1][0],zlow],[a1,prof[n-1][0],prof[n-1][1]],[a0,prof[n-1][0],prof[n-1][1]]], ctr, shade(e.front || wall,.93), null) && e.onBack) e.onBack();
  const A0 = a0 - (e.lo === false ? 0 : o), A1 = a1 + (e.hi === false ? 0 : o);
  for(let i = 0; i < pr.length-1; i++){
    const p = pr[i], q = pr[i+1];
    const f = [[A0,p[0],p[1]],[A1,p[0],p[1]],[A1,q[0],q[1]],[A0,q[0],q[1]]];
    if(houseFace(f, ctr, roof)){
      if(e.seams) for(let a = A0 + e.seams; a < A1 - 1; a += e.seams) poly([P(a,p[0],p[1]), P(a,q[0],q[1])], null, shade(roof,.78), 1);
      else houseCourses(f[0], f[3], f[1], f[2], shade(roof,.8), 0.2);
    }
    for(const A of [A0, A1]) if((A === A0 && e.lo !== false) || (A === A1 && e.hi !== false))
      houseFace([[A,p[0],p[1]],[A,q[0],q[1]],[A,q[0],q[1]-7],[A,p[0],p[1]-7]], [ctr[0], ctr[1], ctr[2]-4], e.barge || shade(roof,.62));
  }
}

/* A VERTICAL PRISM on a convex footprint [[a, b], ...]: walls lit by
   which way they face, a top plate. Returns the visible wall faces so
   windows and bands can go on them. */
function housePrism(foot, z0, z1, wall, opts){
  const o = opts || {}, n = foot.length;
  const ca = foot.reduce((s, p) => s + p[0], 0)/n, cb = foot.reduce((s, p) => s + p[1], 0)/n;
  const ctr = [ca, cb, (z0+z1)/2], seen = [];
  for(let i = 0; i < n; i++){
    const p = foot[i], q = foot[(i+1) % n];
    let na = q[1]-p[1], nb = -(q[0]-p[0]); const L = Math.hypot(na, nb) || 1; na /= L; nb /= L;
    const mx = (p[0]+q[0])/2 - ca, my = (p[1]+q[1])/2 - cb; if(na*mx + nb*my < 0){ na = -na; nb = -nb; }
    const t = Math.abs(nb)/(Math.abs(na) + Math.abs(nb) + 1e-9);
    const col = shade(wall, 0.76 + 0.24*t);
    if(houseFace([[p[0],p[1],z0],[q[0],q[1],z0],[q[0],q[1],z1],[p[0],p[1],z1]], ctr, col, o.stroke === undefined ? shade(wall,.6) : o.stroke))
      seen.push({ p, q, na, nb, col });
  }
  if(o.top !== false) houseFace(foot.map(p => [p[0], p[1], z1]), ctr, o.top || shade(wall,1.05));
  return seen;
}
/* a window (or a band) on one prism face, t0..t1 along it */
function houseFaceWin(f, t0, t1, z0, z1, frame, opts){
  const o = opts || {}, { p, q, na, nb } = f;
  const at = (t, z, d) => P(p[0] + (q[0]-p[0])*t + na*d, p[1] + (q[1]-p[1])*t + nb*d, z);
  const len = Math.hypot(q[0]-p[0], q[1]-p[1]), pad = o.band ? 0 : 4/len;
  poly([at(t0-pad,z0-(o.band?0:4),0.4), at(t1+pad,z0-(o.band?0:4),0.4), at(t1+pad,z1+(o.band?0:4),0.4), at(t0-pad,z1+(o.band?0:4),0.4)], frame);
  if(o.band) return;
  poly([at(t0,z0,0.7), at(t1,z0,0.7), at(t1,z1,0.7), at(t0,z1,0.7)], '#34424b');
  poly([at(t0,z1-(z1-z0)*0.4,0.8), at(t1,z1-(z1-z0)*0.4,0.8), at(t1,z1,0.8), at(t0,z1,0.8)], 'rgba(170,205,220,.35)');
  if(!o.plain){ const tm = (t0+t1)/2; poly([at(tm,z0,0.9), at(tm,z1,0.9)], null, frame, 2.4); }
}
/* a cone (n-sided) roof, apex over (ca, cb) */
function houseCone(ca, cb, r, n, z0, z1, roof){
  const ctr = [ca, cb, z0 + (z1-z0)*0.2], pts = [];
  for(let k = 0; k < n; k++){ const t = (k + 0.5)/n*Math.PI*2; pts.push([ca + r*Math.cos(t), cb + r*Math.sin(t), z0]); }
  for(let k = 0; k < n; k++){
    const f = [pts[k], pts[(k+1) % n], [ca, cb, z1]];
    if(houseFace(f, ctr, shade(roof, 0.84 + 0.16*Math.sin((k+1)/n*Math.PI*2))))
      houseCourses(pts[k], [ca,cb,z1], pts[(k+1)%n], [ca,cb,z1], shade(roof,.78), 0.2);
  }
}
/* the regular n-gon footprint of a tower */
function houseRing(ca, cb, r, n){
  const out = []; for(let k = 0; k < n; k++){ const t = (k + 0.5)/n*Math.PI*2; out.push([ca + r*Math.cos(t), cb + r*Math.sin(t)]); } return out;
}
/* log courses on a face plane, with log ends proud of both corners */
function houseLogs(a0, a1, z0, z1, b, col, d){
  const s = d || 1;
  F(a0, a1, z0, z1, col, null, 0, b);
  for(let z = z0; z < z1; z += 11){
    F(a0, a1, z, z+2, shade(col,.72), null, 0, b + 0.3*s);
    F(a0, a1, z+6, z+8, shade(col,1.12), null, 0, b + 0.3*s);
  }
  for(let z = z0 + 5.5; z < z1; z += 11) for(const a of [a0 - 5, a1 + 5])
    faceCircle(a, b + 1*s, z, 5.4, shade(col,1.2), shade(col,.66), 1);
}
/* a palm */
function housePalm(a, b, h, leaf){
  for(let z = 0; z < h; z += 12) cyl(a + z*0.04, b, z, z+12, 4.5 - z/h*1.5, z % 24 ? '#8a7258' : '#7a6448');
  const ta = a + h*0.04, cy = P(ta, b, 0).y;
  /* fronds far to near around the crown (see TREES): the far ones, the
     crown, then the near ones -- written in angle order, a back frond
     could lie over a front one */
  const fronds = [];
  for(let k = 0; k < 7; k++){
    const t = k/7*Math.PI*2, da = Math.cos(t)*38, db = Math.sin(t)*38;
    fronds.push({ k: P(ta + da, b + db, 0).y, draw: () => poly([P(ta, b, h), P(ta + da*0.5, b + db*0.5, h + 10), P(ta + da, b + db, h - 14), P(ta + da*0.55, b + db*0.55, h + 2)], k % 2 ? leaf : shade(leaf,.85), shade(leaf,.6), 0.8) });
  }
  fronds.sort((p, q) => p.k - q.k);
  for(const f of fronds) if(f.k <= cy) f.draw();
  ball(ta, b, h, 5, '#6b5038');
  for(const f of fronds) if(f.k > cy) f.draw();
}
/* the footprint of the Streamline Moderne: a rectangle whose street-side
   seen corner is rounded, radius 70, in six facets */
const MODERNE_FOOT = (() => {
  const f = [[40,-110], [350,-110]];
  for(let k = 1; k <= 6; k++){ const t = k/6*Math.PI/2; f.push([350 + 70*Math.sin(t), -180 + 70*Math.cos(t)]); }
  f.push([420,-500], [40,-500]);
  return f;
})();
/* log courses along the seen end */
function houseEndLogs(a0, a1, bf, bb, z0, z1, col){
  const aE = FLANK_RIGHT ? a1 : a0, s = FLANK_RIGHT ? 1 : -1;
  for(let z = z0; z < z1; z += 11){ S(aE + 0.3*s, bb, bf, z, z+2, shade(col,.62)); S(aE + 0.3*s, bb, bf, z+6, z+8, shade(col,.9)); }
}

/* a porch rocker */
function houseRocker(a, b, col){
  box(a-11, a+11, b-9, b+9, 14, 18, col, shade(col,.88), shade(col,.76));
  box(a-11, a+11, b-9, b-5, 18, 48, col, shade(col,.88), shade(col,.76));
  for(const aa of [a-9, a+9]) box(aa-1.5, aa+1.5, b-8, b+8, 0, 14, shade(col,.8), shade(col,.7), shade(col,.6));
}


/* ================= MORE SHAPES (houses 21-29) ================= */

/* A PROFILE ROOF ALONG b: the same idea as houseProfileRoof turned 90
   degrees -- prof is [[a, z], ...] from a0 to a1 and is extruded from the
   street (bf) back to bb, so the profile IS the street gable. Symmetric
   gables, gambrels, sheds off a taller wall. seams: standing-seam lines
   running down the slope at that spacing in b. onFront: detail on the
   street gable before the slopes go on. */
function houseProfileRoofB(bf, bb, prof, o, roof, wall, opts){
  const e = opts || {}, n = prof.length;
  const zlow = Math.min(prof[0][1], prof[n-1][1]), ztop = Math.max(...prof.map(p => p[1]));
  const ext = (p, q, on) => { if(!on) return p; const da = p[0]-q[0], dz = p[1]-q[1], L = Math.hypot(da, dz) || 1; return [p[0] + o*da/L, p[1] + o*dz/L]; };
  const pr = [ext(prof[0], prof[1], e.ext0 !== false), ...prof.slice(1, n-1), ext(prof[n-1], prof[n-2], e.ext1 !== false)];
  const ctr = [(prof[0][0] + prof[n-1][0])/2, (bf+bb)/2, zlow + (ztop - zlow)*0.3];
  const dd = pts => pts.filter((p, i) => i === 0 || Math.hypot(p[0]-pts[i-1][0], p[1]-pts[i-1][1], p[2]-pts[i-1][2]) > 0.01);
  const endPts = b => dd([[prof[0][0], b, zlow], ...prof.map(p => [p[0], b, p[1]]), [prof[n-1][0], b, zlow]]);
  if(houseFace(endPts(bf), ctr, e.gable || wall, shade(wall,.6)) && e.onFront) e.onFront();
  if(!e.back0 && houseFace(endPts(bb), ctr, shade(e.gable || wall,.93), shade(wall,.6)) && e.onBack) e.onBack();
  for(const [ix, sgn] of [[0, 1], [n-1, -1]]) if(prof[ix][1] > zlow + 0.5){
    const a = prof[ix][0];
    houseFace([[a,bf,zlow],[a,bb,zlow],[a,bb,prof[ix][1]],[a,bf,prof[ix][1]]], ctr, shade(wall,.8), null);
  }
  const Bf = bf + o, Bb = bb - (e.back0 ? 0 : o);
  for(let i = 0; i < pr.length-1; i++){
    const p = pr[i], q = pr[i+1];
    const f = [[p[0],Bf,p[1]],[q[0],Bf,q[1]],[q[0],Bb,q[1]],[p[0],Bb,p[1]]];
    if(houseFace(f, ctr, roof)){
      if(e.seams) for(let b = Bf - e.seams; b > Bb + 1; b -= e.seams) poly([P(p[0],b,p[1]), P(q[0],b,q[1])], null, shade(roof,.78), 1);
      else houseCourses(f[0], f[1], f[3], f[2], shade(roof,.8), 0.2);
    }
    houseFace([[p[0],Bf,p[1]],[q[0],Bf,q[1]],[q[0],Bf,q[1]-7],[p[0],Bf,p[1]-7]], [ctr[0], ctr[1], ctr[2]-4], e.barge || shade(roof,.62));
    if(!e.back0) houseFace([[p[0],Bb,p[1]],[q[0],Bb,q[1]],[q[0],Bb,q[1]-7],[p[0],Bb,p[1]-7]], [ctr[0], ctr[1], ctr[2]-4], e.barge || shade(roof,.62));
  }
}

/* A MANSARD: a steep frustum from the eave rectangle up to an inset top */
function houseMansard(a0, a1, bf, bb, He, Hm, i, roof, top){
  const ctr = [(a0+a1)/2, (bf+bb)/2, He + (Hm-He)*0.3];
  const E = [[a0,bf,He],[a1,bf,He],[a1,bb,He],[a0,bb,He]];
  const Tt = [[a0+i,bf-i,Hm],[a1-i,bf-i,Hm],[a1-i,bb+i,Hm],[a0+i,bb+i,Hm]], cc = shade(roof,.78);
  for(let k = 0; k < 4; k++){
    const f = [E[k], E[(k+1)%4], Tt[(k+1)%4], Tt[k]];
    if(houseFace(f, ctr, k % 2 ? shade(roof,.86) : roof)) houseCourses(f[0], f[3], f[1], f[2], cc, 0.16);
  }
  houseFace(Tt, ctr, top || shade(roof,1.1));
}

/* A FACETED DOME, rings of latitude by segs of longitude. glass(i, j)
   picks the glazed facets. rz is the vertical radius in lab z. */
function houseDome(ac, bc, r, rz, rings, segs, col, glass, z0){
  const zb = z0 || 0;                                           // base height: a dome on a roof
  const pt = (i, j) => { const ph = Math.PI/2*i/rings, th = 2*Math.PI*j/segs + Math.PI/segs;
    return [ac + r*Math.cos(ph)*Math.cos(th), bc + r*Math.cos(ph)*Math.sin(th), zb + rz*Math.sin(ph)]; };
  const ctr = [ac, bc, zb + rz*0.3], apex = [ac, bc, zb + rz];
  for(let i = 0; i < rings; i++) for(let j = 0; j < segs; j++){
    const f = i === rings-1 ? [pt(i,j), pt(i,j+1), apex] : [pt(i,j), pt(i,j+1), pt(i+1,j+1), pt(i+1,j)];
    const m = f.reduce((s, p) => [s[0]+p[0]/f.length, s[1]+p[1]/f.length, s[2]+p[2]/f.length], [0,0,0]);
    const nb = (m[1]-bc)/r, na = (m[0]-ac)/r, nz = (m[2]-zb)/rz;
    const g = glass && glass(i, j);
    const lit = g ? '#34424b' : shade(col, 0.72 + 0.18*Math.max(0, nb) + 0.08*Math.max(0, na) + 0.14*nz);
    if(houseFace(f, ctr, lit, g ? '#d8d4c8' : shade(col,.62)) && g)
      poly([P(f[0][0],f[0][1],f[0][2]), P(m[0],m[1],m[2])], null, 'rgba(170,205,220,.35)', 1.5);
  }
}

/* a thatch fringe hanging off an eave line, at plane b = B (a0..a1) */
function houseFringe(a0, a1, B, z, col){
  for(let a = a0; a < a1 - 1; a += 8) poly([P(a,B,z), P(a+8,B,z), P(a+4,B,z-9 - ((a/8) % 3)*2)], col, null);
}


/* ================= MORE SHAPES (houses 30-38) ================= */

/* an arched window on the plane b: round-headed, or pointed (Gothic).
   The rise is in lab z, so it reads round after the 1.5 vertical factor. */
function houseArchWin(a0, a1, z0, z1, b, frame, dir, opts){
  const d = dir || 1, o = opts || {}, w = a1 - a0, am = (a0+a1)/2;
  const rise = o.pointed ? w*0.62 : w*0.34, zs = z1 - rise;
  if(HOUSE_REC) HOUSE_REC.push({ kind:'win', a0: a0-4, a1: a1+4, z0: z0-4, z1: z1+4, b });
  const head = (x0, x1, zb, r) => {
    const pts = [], hw = (x1-x0)/2, xm = (x0+x1)/2;
    for(let k = 0; k <= 12; k++){ const t = k/12;
      if(o.pointed){ const s = t < 0.5 ? t*2 : (1-t)*2, ax = t < 0.5 ? x0 + hw*(1 - Math.cos(s*Math.PI/2)) : x1 - hw*(1 - Math.cos(s*Math.PI/2));
        pts.push([ax, zb + r*Math.sin(s*Math.PI/2)]); }
      else { const th = Math.PI*(1-t); pts.push([xm + hw*Math.cos(th), zb + r*Math.sin(th)]); }
    }
    return pts;
  };
  const draw = (x0, x1, zb0, zb, r, bb, fill, st) => poly([P(x0,bb,zb0), ...head(x0, x1, zb, r).map(([a, z]) => P(a, bb, z)), P(x1,bb,zb0)], fill, st, 1);
  draw(a0-4, a1+4, z0-4, zs, rise+4, b + 0.3*d, frame, shade(frame,.7));
  draw(a0, a1, z0, zs, rise, b + 0.5*d, '#34424b');
  draw(a0+2, a1-2, zs - (zs-z0)*0.2, zs, rise-2, b + 0.6*d, 'rgba(170,205,220,.3)');
  F(am-1.4, am+1.4, z0, z1 - 1, frame, null, 0, b + 0.8*d);
  if(!o.pointed) F(a0, a1, zs-1.4, zs+1.4, frame, null, 0, b + 0.8*d);
  if(d > 0) slab(a0-7, a1+7, z0-9, z0-4, b+7, b, frame); else slab(a0-7, a1+7, z0-9, z0-4, b-7, b, frame);
}
/* shoji: a paper screen with a timber grid, a0..a1 on the plane b */
function houseShoji(a0, a1, z0, z1, b, wood, d){
  const s = d || 1;
  F(a0, a1, z0, z1, '#f2eee2', wood, 1.4, b + 0.3*s);
  for(let a = a0 + 14; a < a1 - 2; a += 14) F(a-0.8, a+0.8, z0, z1, wood, null, 0, b + 0.5*s);
  for(let z = z0 + 16; z < z1 - 2; z += 16) F(a0, a1, z-0.8, z+0.8, wood, null, 0, b + 0.5*s);
  for(let a = a0 + 56; a < a1 - 4; a += 56) F(a-2, a+2, z0, z1, wood, null, 0, b + 0.6*s);
}
/* corrugated steel on a face plane */
function houseCorrugated(a0, a1, z0, z1, b, col, d){
  F(a0, a1, z0, z1, col, shade(col,.6), 1, b);
  for(let a = a0 + 4; a < a1; a += 6) F(a, a+2, z0 + 2, z1 - 2, shade(col,.82), null, 0, b + 0.3*(d||1));
}
/* a cypress: a tall narrow cone of foliage on a stub trunk */
function houseCypress(a, b, h, col){
  cyl(a, b, 0, 14, 3, '#6b5038');
  houseCone(a, b, 14, 8, 12, h, col);
}


/* ================= MORE SHAPES (houses 39-47) ================= */
/* a birch: white trunk with dark marks, a light open crown */
function houseBirch(a, b, h, leaf){
  cyl(a, b, 0, h*0.62, 3.2, '#ece8de');
  for(let z = 10; z < h*0.6; z += 13) F(a-3, a+1, z, z+2, '#3a3a3e', null, 0, b + 3.4);
  ball(a, b, h*0.72, h*0.2, leaf); ball(a-9, b+4, h*0.62, h*0.14, shade(leaf,1.1)); ball(a+8, b-3, h*0.84, h*0.13, shade(leaf,.92));
}
/* a railing round a rectangle at height z: far sides first, near last */
function houseRailRing(a0, a1, b0, b1, z, h, col){
  const nearB = state.back ? b0 : b1, farB = state.back ? b1 : b0;
  const nearA = FLANK_RIGHT ? a1 : a0, farA = FLANK_RIGHT ? a0 : a1;
  const bars = (fn, from, to) => { for(let t = from; t < to; t += 9) fn(t); };
  F(a0, a1, z + h - 2, z + h, col, null, 0, farB);
  bars(t => F(t, t+1.4, z, z + h, col, null, 0, farB), a0, a1);
  S(farA, b0, b1, z + h - 2, z + h, col);
  bars(t => S(farA, t, t+1.4, z, z + h, col), b0, b1);
  S(nearA, b0, b1, z + h - 2, z + h, col);
  bars(t => S(nearA, t, t+1.4, z, z + h, col), b0, b1);
  F(a0, a1, z + h - 2, z + h, col, null, 0, nearB);
  bars(t => F(t, t+1.4, z, z + h, col, null, 0, nearB), a0, a1);
}


/* ================= MORE SHAPES (houses 48-56) ================= */
/* crow steps up both rakes of a gable on the seen end (a = a0 or a1) */
function houseCrowSteps(a0, a1, bf, bb, He, Hr, n, col){
  const aE = FLANK_RIGHT ? a1 : a0, mid = (bf+bb)/2, st = (bf-mid)/n;
  const step = (b0, b1, z) => box(aE-7, aE+7, Math.min(b0,b1), Math.max(b0,b1), He, z, shade(col,1.06), col, shade(col,.8));
  for(let k = n-1; k >= 0; k--) step(bb + k*st, bb + (k+1)*st, He + (Hr-He)*(k+1)/n + 8);
  for(let k = n-1; k >= 0; k--) step(bf - k*st, bf - (k+1)*st, He + (Hr-He)*(k+1)/n + 8);
}
/* a half-round bay (a faceted half prism) standing proud of the wall line b */
function houseHalfBay(ac, b, r, n, z0, z1, wall){
  const foot = [];
  for(let k = 0; k <= n; k++){ const t = Math.PI*k/n; foot.push([ac + r*Math.cos(t), b + r*Math.sin(t)]); }
  return housePrism(foot, z0, z1, wall, { top:false });
}
function houseHalfCone(ac, b, r, n, z0, z1, roof){
  const ctr = [ac, b + r*0.3, z0 + (z1-z0)*0.2];
  for(let k = 0; k < n; k++){
    const t0 = Math.PI*k/n, t1 = Math.PI*(k+1)/n;
    houseFace([[ac + r*Math.cos(t0), b + r*Math.sin(t0), z0], [ac + r*Math.cos(t1), b + r*Math.sin(t1), z0], [ac, b, z1]], ctr, shade(roof, 0.84 + 0.16*Math.sin((t0+t1)/2)));
  }
}


/* ================= THE YARD FENCE (bulk fix, 2026-09-21) =================
   Sir: "houses with fences don't have a fence around their entire yard."
   Every entry that fences its street front now declares

     yardFence: { style, h, col, cap, pier }      colours: a liv key or a hex

   and gets the same fence carried down both sides of the lot and across
   the back, in its own style, from one helper -- no per-house fence code.
   The runs sit just inside the lot line (7 in from the sides, 5 in from the
   back) and their collision is added to the entry's vol at load.

   ORDER. From the street the far side and the back are behind the house
   and are drawn with the yard ('far', straight after this.yard); the near
   side is in front of it and goes last in fore() ('near'). From behind the
   roles swap: the near side and the back go last in back(). */
function houseYardRun(f, col, axis, fixed, u0, u1){
  const Q = (a, b, z0, z1, cl) => axis === 'a' ? F(a, b, z0, z1, cl, null, 0, fixed) : S(fixed, a, b, z0, z1, cl);
  const pt = (u, z) => axis === 'a' ? P(u, fixed, z) : P(fixed, u, z);
  const bx = (a, b, t, z0, z1, cl) => axis === 'a' ? box(a, b, fixed - t, fixed + t, z0, z1, shade(cl,1.04), cl, shade(cl,.8))
                                                   : box(fixed - t, fixed + t, a, b, z0, z1, shade(cl,1.04), cl, shade(cl,.8));
  const ball2 = (u, z, r, cl) => axis === 'a' ? ball(u, fixed, z, r, cl) : ball(fixed, u, z, r, cl);
  const h = f.h, c1 = col(f.col), cap = col(f.cap);
  /* posts never overhang the run's ends, so a run that starts at the lot line stays in the lot */
  const posts = (every, ph, cl, t) => { for(let u = u0; u <= u1 + 0.1; u += every){ const m = Math.min(Math.max(u, u0 + t), u1 - t); bx(m - t, m + t, t, 0, ph, cl); } };
  switch(f.style){
    case 'picket':
      Q(u0, u1, h*0.28, h*0.28 + 3, shade(c1,.86)); Q(u0, u1, h*0.66, h*0.66 + 3, shade(c1,.86));
      for(let u = u0 + 2; u < u1 - 3; u += 10.5) poly([pt(u,0), pt(u+5,0), pt(u+5,h-3), pt(u+2.5,h), pt(u,h-3)], c1, shade(c1,.7), 0.8);
      posts(110, h + 6, c1, axis === 'a' ? 2 : 4); break;
    case 'iron':
      Q(u0, u1, 6, 8, c1); Q(u0, u1, h - 6, h - 3, c1);
      for(let u = u0 + 3; u < u1; u += 7) poly([pt(u,0), pt(u+1.6,0), pt(u+1.6,h), pt(u+0.8,h+4), pt(u,h)], c1);
      if(f.pier) posts(118, h + 8, col(f.pier), axis === 'a' ? 2 : 6); else posts(120, h + 2, shade(c1,1.3), axis === 'a' ? 2 : 3);
      break;
    case 'hedge':
      bx(u0, u1, 5, 0, h, c1);
      for(let u = u0 + 8; u < u1; u += 16) ball2(u, h, 5, c1);
      break;
    case 'wall':
      bx(u0, u1, 4, 0, h, c1);
      if(f.stones) for(let u = u0 + 6; u < u1 - 8; u += 13) Q(u, u + 8, 4 + (u % 3)*3, 11 + (u % 3)*3, shade(c1,.8));
      if(cap) bx(u0 - 1, u1 + 1, 5, h, h + 4, cap);
      if(f.balls) for(let u = u0 + 6; u < u1; u += 12) ball2(u, h, 4.2, c1);
      break;
    case 'bamboo':
      Q(u0, u1, 0, h, c1);
      for(let u = u0 + 3; u < u1; u += 5) Q(u, u + 1.2, 0, h, shade(c1,.84));
      for(const z of [h*0.3, h*0.7]) Q(u0, u1, z, z + 2.4, col(f.cap) || '#5a4a30');
      break;
    case 'wattle':
      for(let z = 6; z < h; z += 6) Q(u0, u1, z, z + 3.6, (z % 12) ? c1 : shade(c1,.88));
      posts(24, h + 2, shade(c1,.7), 2);
      break;
  }
}
/* how far in from the back of the lot each style's rear run stands, and
   its half-thickness: thin fences hug the lot line, solid ones sit in */
const HOUSE_YARD_BACK = { picket:[2,2], iron:[2,2], bamboo:[2,2], wattle:[2,2], hedge:[6,5], wall:[6,5] };
function houseYardFence(sh, c, part){
  const f = sh.yardFence; if(!f) return;
  const col = k => (k && c[k]) || k;
  const W = sh.ww || HOUSE_SINGLE, D = sh.dd || HOUSE_DEPTH_LAB;
  const aL = 7, aR = W - 7, bF = -8, bR = -(D - HOUSE_YARD_BACK[f.style][0]);
  const nearA = FLANK_RIGHT ? aR : aL, farA = FLANK_RIGHT ? aL : aR;
  const side = a => houseYardRun(f, col, 'b', a, bR, bF);
  const rear = () => houseYardRun(f, col, 'a', bR, aL, aR);
  if(part === 'far'){ if(!state.back){ rear(); side(farA); } else side(farA); }
  else { if(!state.back) side(nearA); else { side(nearA); rear(); } }
}
/* the fence's collision, added to an entry's vol when HOUSES loads */
function houseYardSolids(sh){
  const W = sh.ww || HOUSE_SINGLE, D = sh.dd || HOUSE_DEPTH_LAB, t = 6, h = sh.yardFence.h;
  const [inb, half] = HOUSE_YARD_BACK[sh.yardFence.style], bc = -(D - inb);
  return [ { name:'yard fence L', poly:[[1,bc-half],[7+t,bc-half],[7+t,-6],[1,-6]], h },
           { name:'yard fence R', poly:[[W-7-t,bc-half],[W-1,bc-half],[W-1,-6],[W-7-t,-6]], h },
           { name:'yard fence back', poly:[[1,bc-half],[W-1,bc-half],[W-1,bc+half],[1,bc+half]], h } ];
}


/* ================= TREES (bulk fix, 2026-09-21) =================
   The museum-yard fix in the game (2026-09-18) applied to every house
   tree: THE TRUNK RUNS UP INTO THE CROWN, AND THE CROWN IS DRAWN FAR TO
   NEAR. Two faults, both in every hand-built tree here:
     1. a trunk that stops below the lowest leaf ball shows its flat top
        cap in the gap under the crown;
     2. balls drawn in the order they were written -- a ball behind the
        trunk can land over one in front of it.
   houseCanopy(fn) runs a tree's drawing code with ball / cyl / tube / F
   captured instead of drawn, lifts any trunk (a cyl or tube of radius <= 9
   that ends above 40) whose top stops short of the crown up to just inside
   the lowest leaf ball, then draws everything far to near. Depth is the
   screen height of the point on the ground under each piece -- measured
   through P(), so it holds from the back and on mirrored edges too.
   houseProp applies it to every prop whose name is a tree. */
const HOUSE_TREE_PROP = /^(tree|oak|pine|olive|breadfruit|pomegranate|acacia|lemon|planter|frangipani|plumeria|birch)/;
function houseCanopy(fn){
  const items = [], saved = { ball, cyl, tube, F };
  const key = (a, b) => P(a, b, 0).y;
  ball = (...g) => items.push({ kind:'ball', k:key(g[0], g[1]), z:g[2], g });
  cyl  = (...g) => items.push({ kind:'cyl',  k:key(g[0], g[1]), z:g[2], g });
  tube = (...g) => items.push({ kind:'tube', k:key(g[0], g[1]), z:g[2], g });
  F    = (...g) => items.push({ kind:'F',    k:key((g[0]+g[1])/2, g[7] || 0) + 0.01, z:g[2], g });
  try { fn(); } finally { ball = saved.ball; cyl = saved.cyl; tube = saved.tube; F = saved.F; }
  const leaves = items.filter(t => t.kind === 'ball' && t.g[3] >= 8);
  /* A BALL'S RADIUS IS IN SCREEN UNITS (r*K), BUT ITS HEIGHT IS SCALED BY
     ZSCALE and the entry's own sc like everything else -- so a ball of
     radius r only covers r / (ZSCALE*SC) of lab height either side of its
     centre (Sir, on-device, circling the Brownstone's street tree: "this
     tree looks disconnected"). The first pass lifted trunks to just inside
     the lowest ball by its raw r, which at 1.3x leaves the trunk's top cap
     still showing under the crown. Each trunk now runs up under the leaf
     ball nearest its axis, to 40% of that ball's true reach below its
     centre -- where the ball, drawn after it, covers the cap. */
  if(leaves.length){
    const reach = r => r / ((typeof ZSCALE === 'number' ? ZSCALE : 1.5) * (typeof SC === 'number' ? SC : 1));
    const target = (a, b) => { let best = null, d = 1e9;
      for(const t of leaves){ const e = Math.hypot(t.g[0]-a, t.g[1]-b); if(e < d){ d = e; best = t; } }
      return best.g[2] - 0.4*reach(best.g[3]); };
    for(const t of items){
      if(t.kind === 'cyl' && t.g[4] <= 9 && t.g[3] >= 40){ const zt = target(t.g[0], t.g[1]); if(t.g[3] < zt) t.g[3] = zt; }
      if(t.kind === 'tube' && t.g[6] <= 9 && t.g[5] >= 40){
        const [a0, b0, z0, a1, b1, z1] = t.g, zt = target(a1, b1);
        if(z1 < zt){ const u = (zt - z0)/((z1 - z0) || 1); t.g[3] = a0 + (a1 - a0)*u; t.g[4] = b0 + (b1 - b0)*u; t.g[5] = zt; }
      }
    }
  }
  items.map((t, i) => (t.i = i, t)).sort((p, q) => (p.k - q.k) || (p.z - q.z) || (p.i - q.i))
       .forEach(t => saved[t.kind](...t.g));
}

const HOUSES = [
/* ------------------------------------------------------------------ 1 */
{
  name:'Seabreeze Bungalow', hood:'The Flats', tier:'single', sc:HOUSE_SC, ww:HOUSE_SINGLE, dd:HOUSE_DEPTH_LAB,
  head:'Beach bungalow: picket fence, porch, gable roof',
  desc:'Starter single. Set back 80 behind a lawn and a picket fence with an open gate; path to a shed-roofed porch; delivery door under the porch.',
  tags:['single','yard','porch','gable'],
  yardFence:{ style:'picket', h:36, col:'#f7f4ec' },
  door:[160, -80],
  liv:[ { wall:'#e9dfc8', trim:'#f7f4ec', roof:'#5d6f7c', leaf:'#3f7f86', shut:'#3f7f86', box:'#8a6246' },
        { wall:'#bcd6d2', trim:'#f7f4ec', roof:'#6b5a4e', leaf:'#c4553f', shut:'#c4553f', box:'#8a6246' },
        { wall:'#f1c9a7', trim:'#fbf6ee', roof:'#4a5560', leaf:'#2e4d68', shut:'#2e4d68', box:'#7a5a40' } ],
  vol:{
    foot:[[24,-80],[436,-80],[436,-516],[24,-516]],
    h:240,
    solids:[ { name:'fence L', poly:[[2,-9],[98,-9],[98,-1],[2,-1]], h:36 },
             { name:'fence R', poly:[[222,-9],[458,-9],[458,-1],[222,-1]], h:36 },
             { name:'mailbox', poly:[[239.5,-28],[254.5,-28],[254.5,-17],[239.5,-17]], h:52, prop:true },
             { name:'ac unit', poly:[[366,-544],[418,-544],[418,-516],[366,-516]], h:36, prop:true } ],
    marks:{ door:[160,-80], mat:[160,-80+35.4] }
  },
  yard(c){
    houseLawn(0, 460, -80, 0, '#7fa35a');
    T(90, 230, -34, 0, 0.6, '#d8d2c2');                        // path
    T(56, 264, -80, -34, 1.2, shade(c.trim,.9));               // porch deck, flush with the path
    F(56, 264, 0, 1.2, shade(c.trim,.7), null, 0, -34);
    for(let b = -30; b < 0; b += 12) poly([P(90,b,0.7), P(230,b,0.7)], null, '#c4bdab', 1);
  },
  beds(c){
    for(const aa of [300, 344, 388]){                          // bed along the facade
      box(aa-9, aa+9, -79, -66, 0, 7, '#6b5038', '#5a4230', '#4d3828');
      ball(aa, -72, 12, 7, '#4f7a4a'); ball(aa+4, -70, 15, 4, '#e2748c');
    }
  },
  porch(c){
    for(const aa of [64, 256]) box(aa-3, aa+3, -40, -34, 2, 104, c.trim, shade(c.trim,.9), shade(c.trim,.75));
    poly([P(48,-80,120), P(272,-80,120), P(272,-30,104), P(48,-30,104)], c.roof, shade(c.roof,.6), 1);
    F(48, 272, 98, 104, shade(c.roof,.72), null, 0, -30);     // porch fascia
    if(FLANK_RIGHT) poly([P(272,-80,120), P(272,-30,104), P(272,-30,98), P(272,-80,114)], shade(c.roof,.6));
    else            poly([P(48,-80,120), P(48,-30,104), P(48,-30,98), P(48,-80,114)], shade(c.roof,.6));
  },
  fence(c){
    housePickets(10, 90, -5, 36, '#f7f4ec');
    housePickets(230, 450, -5, 36, '#f7f4ec');
    for(const aa of [10, 90, 230, 450]) housePost(aa, -5, 42, '#f7f4ec');
    houseProp('mailbox', () => {                               // by the gate, inside the fence
      box(245.5, 248.5, -24, -21, 0, 40, '#6b5038', '#5a4230', '#4d3828');
      box(239.5, 254.5, -28, -17, 40, 52, '#2e4d68', '#22394e', '#1a2a3a');
    });
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far');
    houseMass(24, 436, -80, -516, 118, c.wall, 1);
    houseSideWins(24, 436, -80, -516, [[38,96]], c.trim);
    for(let z = 16; z < 116; z += 9) poly([P(24,-80.2,z), P(436,-80.2,z)], null, shade(c.wall,.9), 1);   // lap siding
    houseDoorway(160, -80, HOUSE_SC, c.trim, c.leaf, 1);
    houseWin(300, 400, 38, 96, -80, c.trim, shade(c.trim,.9), 1, { shutter:c.shut, box:c.box });
    houseGableRoof(24, 436, -80, -516, 118, 240, 12, c.roof, c.wall, 1);
    if(state.roof) box(90, 110, -310, -286, 220, 272, '#b8715a', '#9c5e4a', '#84503f');   // chimney
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    this.beds(c); this.porch(c); this.fence(c);
    if(!state.back) houseYardFence(this, this.liv[state.pal % this.liv.length], 'near');
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far'); this.beds(c); this.fence(c); this.porch(c);  // far side first
    houseMass(24, 436, -80, -516, 118, c.wall, -1);
    houseSideWins(24, 436, -80, -516, [[38,96]], c.trim);
    for(let z = 16; z < 116; z += 9) poly([P(24,-516.2,z), P(436,-516.2,z)], null, shade(c.wall,.86), 1);
    houseWin(80, 168, 44, 96, -516, c.trim, shade(c.trim,.9), -1);
    houseWin(340, 400, 60, 96, -516, c.trim, shade(c.trim,.9), -1);
    rearDoor(256, c.wall, c.leaf, 516, 92);
    houseGableRoof(24, 436, -80, -516, 118, 240, 12, c.roof, c.wall, -1);
    if(state.roof) box(90, 110, -310, -286, 220, 272, '#b8715a', '#9c5e4a', '#84503f');
    houseProp('ac unit', () => acUnit(392, 0, 516));
    houseYardFence(this, c, 'near');
  }
},
/* ------------------------------------------------------------------ 2 */
{
  name:'Palmline Casita', hood:'The Flats', tier:'double', sc:HOUSE_SC, dd:HOUSE_DEPTH_LAB, ww:HOUSE_DOUBLE,
  head:'Two-storey Spanish revival: tile hip roofs, garage wing, arched door',
  desc:'Starter double. Two-storey stucco block with a single-storey garage wing and driveway; low garden wall with a gap for the path; arched delivery door under a tiled hood; iron balconette above it.',
  tags:['double','two-storey','garage','tile roof'],
  yardFence:{ style:'wall', h:26, col:'wall', cap:'roof' },
  door:[500, -60],
  liv:[ { wall:'#f2e6d2', trim:'#6b4a36', roof:'#c0613f', leaf:'#5a3a28', iron:'#2a2a2e', gar:'#e6dccb' },
        { wall:'#f4d8c4', trim:'#3f5a4a', roof:'#b85a3c', leaf:'#3f5a4a', iron:'#2a2a2e', gar:'#efe4d4' },
        { wall:'#e8eef0', trim:'#2e4d68', roof:'#a9553a', leaf:'#2e4d68', iron:'#1f2226', gar:'#dde5e8' } ],
  vol:{
    foot:[[24,-60],[784,-60],[784,-498],[24,-498]],
    h:285,
    solids:[ { name:'wall L', poly:[[280,-10],[430,-10],[430,-2],[280,-2]], h:30 },
             { name:'wall R', poly:[[570,-10],[800,-10],[800,-2],[570,-2]], h:30 },
             { name:'pot L', c:[320,-32], r:11, h:37, prop:true },
             { name:'pot R', c:[760,-32], r:11, h:37, prop:true },
             { name:'bin', poly:[[222,-536],[258,-536],[258,-500],[222,-500]], h:52, prop:true },
             { name:'ac unit', poly:[[554,-526],[606,-526],[606,-498],[554,-498]], h:36, prop:true } ],
    marks:{ door:[500,-60], mat:[500,-60+35.4] }
  },
  yard(c){
    houseLawn(280, 809.6, -60, 0, '#86a85e');
    T(36, 280, -60, 0, 0.6, '#b3aea3');                        // driveway
    poly([P(158,-60,0.7), P(158,0,0.7)], null, '#98938a', 1);
    for(let b = -45; b < 0; b += 15) poly([P(36,b,0.7), P(280,b,0.7)], null, '#a29d93', 1);
    T(430, 570, -60, 0, 0.7, '#c9a07a');                       // terracotta path
    for(let b = -54; b < 0; b += 11) poly([P(430,b,0.8), P(570,b,0.8)], null, '#a8825f', 1);
  },
  gwall(c){                                                    // low stucco garden wall, tile cap
    for(const [a0,a1] of [[280,430],[570,800]]){
      box(a0, a1, -10, -2, 0, 26, shade(c.wall,.95), c.wall, shade(c.wall,.8));
      box(a0-1, a1+1, -11, -1, 26, 30, shade(c.roof,1.05), c.roof, shade(c.roof,.8));
    }
    for(const [nm, aa] of [['pot L', 320], ['pot R', 760]])     // terracotta pots in the lawn
      houseProp(nm, () => { cyl(aa, -32, 0, 20, 10, '#b86a4a', shade('#b86a4a',1.15)); ball(aa, -32, 26, 11, '#4f7a4a'); });
  },
  arch(aMid, bf, h, col, d){                                   // arched surround over the doorway
    const r = 44, pts = [];
    for(let k = 0; k <= 12; k++){ const t = Math.PI*k/12; pts.push(P(aMid + r*Math.cos(t), bf + 0.25*d, h - 2 + r*0.36*Math.sin(t))); }
    pts.push(P(aMid - r, bf + 0.25*d, 0), P(aMid + r, bf + 0.25*d, 0));
    poly(pts, shade(col,.93), shade(col,.7), 1);
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far');
    /* garage wing: its hi end dies into the two-storey block */
    houseMass(24, 300, -60, -498, 124, c.wall, 1);
    F(52, 268, 0, 92, c.gar, shade(c.gar,.72), 1.2, -59.6);   // up-and-over door
    for(let z = 18; z < 92; z += 18) F(52, 268, z-1.5, z, shade(c.gar,.8), null, 0, -59.4);
    houseHipRoof(24, 300, -60, -498, 124, 176, 10, c.roof, 1, { lo:true, hi:false });
    /* the two-storey block */
    houseMass(300, 784, -60, -498, 232, c.wall, 1);
    houseSideWins(300, 784, -60, -498, [[40,96],[150,204]], c.trim);
    this.arch(500, -60, houseDoorDims(HOUSE_SC).h, c.wall, 1);
    houseDoorway(500, -60, HOUSE_SC, c.trim, c.leaf, 1);
    houseWin(636, 744, 36, 96, -60, c.trim, shade(c.wall,.88), 1, { box:c.trim });
    houseWin(340, 428, 150, 204, -60, c.trim, shade(c.wall,.88), 1);
    houseWin(456, 544, 150, 204, -60, c.trim, shade(c.wall,.88), 1);
    houseWin(636, 744, 150, 204, -60, c.trim, shade(c.wall,.88), 1);
    houseHipRoof(300, 784, -60, -498, 232, 290, 12, c.roof, 1);
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    slab(452, 548, 110, 116, -34, -60, shade(c.roof,.8));      // tiled door hood
    poly([P(452,-34,116), P(548,-34,116), P(548,-60,128), P(452,-60,128)], c.roof, shade(c.roof,.6), 1);
    slab(440, 560, 136, 140, -44, -60, shade(c.wall,.85));    // balconette floor
    for(let a = 444; a <= 556; a += 7) F(a, a+1.6, 140, 168, c.iron, null, 0, -44);
    F(440, 560, 166, 169, c.iron, null, 0, -43.8);
    this.gwall(c);
    if(!state.back) houseYardFence(this, this.liv[state.pal % this.liv.length], 'near');
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far'); this.gwall(c);
    houseMass(300, 784, -60, -498, 232, c.wall, -1);           // far block first: its a0 end rises over the garage
    houseSideWins(300, 784, -60, -498, [[150,204]], c.trim);
    houseWin(352, 440, 150, 204, -498, c.trim, shade(c.wall,.88), -1);
    houseWin(500, 588, 150, 204, -498, c.trim, shade(c.wall,.88), -1);
    houseWin(660, 748, 150, 204, -498, c.trim, shade(c.wall,.88), -1);
    houseWin(660, 748, 40, 96, -498, c.trim, shade(c.wall,.88), -1);
    rearDoor(472, c.wall, c.leaf, 498, 92);
    houseHipRoof(300, 784, -60, -498, 232, 290, 12, c.roof, -1);
    houseMass(24, 300, -60, -498, 124, c.wall, -1);
    houseSideWins(24, 300, -60, -498, [[40,94]], c.trim);
    houseWin(100, 192, 44, 90, -498, c.trim, shade(c.wall,.88), -1);
    houseHipRoof(24, 300, -60, -498, 124, 176, 10, c.roof, -1, { lo:true, hi:false });
    houseProp('bin', () => wheelieBin(240, '#3f6b4a', -12, 498));
    houseProp('ac unit', () => acUnit(580, 0, 498));
    houseYardFence(this, c, 'near');
  }
},
/* ------------------------------------------------------------------ 3 */
{
  name:'Driftwood Craftsman', hood:'The Flats', tier:'single', sc:HOUSE_SC, ww:HOUSE_SINGLE, dd:HOUSE_DEPTH_LAB,
  head:'Craftsman bungalow: front gable, porch gable on stone piers',
  desc:'Low front-gabled bungalow with a shingled porch gable on tapered columns and river-stone piers; lap siding; potted plants by the walk.',
  tags:['single','front gable','porch','craftsman'],
  door:[230, -70],
  liv:[ { wall:'#7d8f6e', trim:'#efe6d2', roof:'#5b4a3e', leaf:'#8a4e2e', stone:'#a39b8d', shing:'#b98a58' },
        { wall:'#8a6b52', trim:'#f0e4c8', roof:'#3e4448', leaf:'#2f5a4a', stone:'#9c978c', shing:'#c49a62' },
        { wall:'#5f7482', trim:'#f2ece0', roof:'#4a3e36', leaf:'#a2432f', stone:'#aaa396', shing:'#a8845c' } ],
  vol:{
    foot:[[32,-70],[428,-70],[428,-520],[32,-520]], h:172,
    solids:[ { name:'pier L', poly:[[77,-42],[99,-42],[99,-26],[77,-26]], h:92 },
             { name:'pier R', poly:[[361,-42],[383,-42],[383,-26],[361,-26]], h:92 },
             { name:'pot L', c:[110,-12], r:10, h:30, prop:true },
             { name:'pot R', c:[350,-12], r:10, h:30, prop:true },
             { name:'ac unit', poly:[[94,-548],[146,-548],[146,-520],[94,-520]], h:36, prop:true } ],
    marks:{ door:[230,-70], mat:[230,-70+35.4] }
  },
  yard(c){
    houseLawn(0, 460, -70, 0, '#7fa35a');
    T(160, 300, -26, 0, 0.6, '#cbc4b2');
    T(60, 400, -70, -26, 1.2, shade(c.trim,.86));
    F(60, 400, 0, 1.2, shade(c.trim,.66), null, 0, -26);
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    for(const aa of [88, 372]){
      box(aa-11, aa+11, -42, -26, 0, 38, shade(c.stone,1.06), c.stone, shade(c.stone,.8));
      for(let z = 8; z < 38; z += 9) F(aa-11, aa+11, z, z+1.2, shade(c.stone,.78), null, 0, -25.6);
      box(aa-7, aa+7, -39, -29, 38, 92, c.trim, shade(c.trim,.92), shade(c.trim,.78));
    }
    F(68, 392, 92, 100, c.trim, shade(c.trim,.7), 1, -28);
    houseFrontGable(68, 392, -28, -70, 100, 142, 8, c.roof, c.trim, 1, { back0:true, gable:c.shing, shingle:true, barge:c.trim });
    for(const [nm, aa] of [['pot L', 110], ['pot R', 350]])
      houseProp(nm, () => { cyl(aa, -12, 0, 18, 9, '#b86a4a', shade('#b86a4a',1.15)); ball(aa, -12, 24, 10, '#5c8a56'); });
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    houseMass(32, 428, -70, -520, 116, c.wall, 1);
    houseSideWins(32, 428, -70, -520, [[36,94]], c.trim);
    for(let z = 16; z < 114; z += 8) poly([P(32,-70.2,z), P(428,-70.2,z)], null, shade(c.wall,.88), 1);
    houseDoorway(230, -70, HOUSE_SC, c.trim, c.leaf, 1);
    houseWin(56, 128, 34, 96, -70, c.trim, c.trim, 1);
    houseWin(332, 404, 34, 96, -70, c.trim, c.trim, 1);
    houseFrontGable(32, 428, -70, -520, 116, 172, 12, c.roof, c.wall, 1, { gable:c.shing, shingle:true, barge:c.trim });
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); this.fore(p);
    houseMass(32, 428, -70, -520, 116, c.wall, -1);
    houseSideWins(32, 428, -70, -520, [[36,94]], c.trim);
    for(let z = 16; z < 114; z += 8) poly([P(32,-520.2,z), P(428,-520.2,z)], null, shade(c.wall,.84), 1);
    houseWin(80, 160, 44, 96, -520, c.trim, c.trim, -1);
    rearDoor(300, c.wall, c.leaf, 520, 92);
    houseFrontGable(32, 428, -70, -520, 116, 172, 12, c.roof, c.wall, -1, { gable:c.shing, shingle:true, barge:c.trim });
    houseProp('ac unit', () => acUnit(120, 0, 520));
  }
},
/* ------------------------------------------------------------------ 4 */
{
  name:'Sandpiper A-Frame', hood:'The Flats', tier:'single', sc:HOUSE_SC, ww:HOUSE_SINGLE, dd:HOUSE_DEPTH_LAB,
  head:'A-frame beach cabin: roof to the ground, glazed gable, deck',
  desc:'Steep A-frame whose roof runs down to knee walls; the street gable is timber with a tall glazed apex; a deck with rails either side of the walk; a surfboard against the rail.',
  tags:['single','a-frame','deck','cabin'],
  door:[230, -70],
  liv:[ { wall:'#b98a5e', roof:'#3d4a52', trim:'#f1e8d8', leaf:'#d9573c', deck:'#a8835c', board:'#f0c64a' },
        { wall:'#9c7250', roof:'#5a3a2e', trim:'#efe6d6', leaf:'#2f6f7a', deck:'#9a7a58', board:'#e46a5a' },
        { wall:'#c9b08a', roof:'#2f3a36', trim:'#f5f0e6', leaf:'#3f5f8a', deck:'#b0906a', board:'#6ac0c8' } ],
  vol:{
    foot:[[52,-70],[408,-70],[408,-522],[52,-522]], h:236,
    solids:[ { name:'rail L', poly:[[48,-26],[160,-26],[160,-20],[48,-20]], h:30 },
             { name:'rail R', poly:[[300,-26],[412,-26],[412,-20],[300,-20]], h:30 },
             { name:'surfboard', poly:[[399,-18],[413,-18],[413,-8],[399,-8]], h:80, prop:true },
             { name:'woodpile', poly:[[323,-544],[369,-544],[369,-524],[323,-524]], h:26, prop:true } ],
    marks:{ door:[230,-70], mat:[230,-70+35.4] }
  },
  yard(c){
    T(0, 460, -70, 0, 0.4, '#d9ceb2');                          // sand
    T(160, 300, -22, 0, 0.6, '#c9b99a');
    T(48, 412, -70, -22, 1.4, c.deck);
    for(let a = 60; a < 412; a += 10) poly([P(a,-70,1.5), P(a,-22,1.5)], null, shade(c.deck,.82), 1);
  },
  glass(c, b, d){                                               // the glazed apex
    const pts = [[160,112],[300,112],[230,196]];
    poly(pts.map(([a,z]) => P(a, b + 0.5*d, z)), '#34424b', shade(c.trim,.7), 1);
    poly([[168,116],[236,116],[196,160]].map(([a,z]) => P(a, b + 0.6*d, z)), 'rgba(170,205,220,.35)');
    for(const aa of [195, 230, 265]){ const zt = 112 + 84*(1 - Math.abs(aa-230)/70); F(aa-1.2, aa+1.2, 112, zt, c.trim, null, 0, b + 0.8*d); }
    F(160, 300, 110, 114, c.trim, null, 0, b + 0.8*d);
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    for(const [a0, a1] of [[48, 160], [300, 412]]){
      F(a0, a1, 26, 30, shade(c.deck,1.08), shade(c.deck,.7), 1, -23);
      for(let a = a0 + 2; a < a1; a += 9) F(a, a+2.4, 0, 26, shade(c.deck,.9), null, 0, -23);
      for(const aa of [a0 + 3, a1 - 3]) box(aa-3, aa+3, -26, -20, 0, 32, shade(c.deck,1.05), shade(c.deck,.9), shade(c.deck,.75));
    }
    houseProp('surfboard', () => {
      poly([P(403,-12,0), P(409,-12,4), P(409,-12,70), P(406,-12,78), P(403,-12,70)], c.board, shade(c.board,.7), 1);
      F(405.6, 406.4, 4, 72, shade(c.board,.7), null, 0, -11.6);
    });
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    houseMass(52, 408, -70, -522, 24, c.wall, 1);
    houseFrontGable(52, 408, -70, -522, 24, 236, 10, c.roof, c.wall, 1, { barge:c.trim });
    for(let z = 40; z < 230; z += 11){ const w = 178*(236-z)/212; poly([P(230-w,-69.8,z), P(230+w,-69.8,z)], null, shade(c.wall,.86), 1); }
    this.glass(c, -70, 1);
    houseDoorway(230, -70, HOUSE_SC, c.trim, c.leaf, 1);
    houseWin(108, 140, 24, 70, -70, c.trim, c.trim, 1, { plain:true });
    houseWin(320, 352, 24, 70, -70, c.trim, c.trim, 1, { plain:true });
    if(state.roof) cyl(304, -296, 150, 206, 5, '#3a3a3e', '#56565c');
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); this.fore(p);
    houseMass(52, 408, -70, -522, 24, c.wall, -1);
    houseFrontGable(52, 408, -70, -522, 24, 236, 10, c.roof, c.wall, -1, { barge:c.trim });
    for(let z = 40; z < 230; z += 11){ const w = 178*(236-z)/212; poly([P(230-w,-522.2,z), P(230+w,-522.2,z)], null, shade(c.wall,.82), 1); }
    houseWin(200, 260, 130, 170, -522, c.trim, c.trim, -1);
    rearDoor(230, c.wall, c.leaf, 522, 92);
    if(state.roof) cyl(304, -296, 150, 206, 5, '#3a3a3e', '#56565c');
    houseProp('woodpile', () => {
      box(323, 369, -544, -524, 0, 24, '#8a6848', '#7a5a3c', '#6a4e34');
      for(let a = 329; a < 367; a += 10) for(const z of [6, 17]) faceCircle(a, -544.4, z, 4.4, '#c9a878', '#7a5a3c', 1);
    });
  }
},
/* ------------------------------------------------------------------ 5 */
{
  name:'Palm Springs Modern', hood:'The Flats', tier:'double', sc:HOUSE_SC, dd:HOUSE_DEPTH_LAB, ww:HOUSE_DOUBLE,
  head:'Mid-century modern: flat roof, carport, breeze blocks, glass wall',
  desc:'Low flat-roofed mid-century house with a thin roof slab that runs out over an open carport on steel posts; breeze-block screen at the back of the carport; floor-to-ceiling glass behind an agave planter; orange front door; pool out back.',
  tags:['double','mid-century','carport','flat roof','pool'],
  door:[380, -76],
  liv:[ { wall:'#f2efe6', roof:'#f7f5ef', accent:'#2f8f8a', leaf:'#e0782a', block:'#e8e2d4' },
        { wall:'#ede6d8', roof:'#f5f1e8', accent:'#d9a23a', leaf:'#2f8f8a', block:'#e6ddcc' },
        { wall:'#e9ecee', roof:'#f4f6f7', accent:'#d9573c', leaf:'#f0c64a', block:'#e2e5e8' } ],
  vol:{
    foot:[[280,-76],[776,-76],[776,-502],[280,-502]], h:128,
    solids:[ { name:'post L', poly:[[45,-35],[55,-35],[55,-25],[45,-25]], h:116 },
             { name:'post R', poly:[[261,-35],[271,-35],[271,-25],[261,-25]], h:116 },
             { name:'breeze wall', poly:[[36,-124],[280,-124],[280,-116],[36,-116]], h:110 },
             { name:'planter', poly:[[508,-58],[760,-58],[760,-46],[508,-46]], h:16 },
             { name:'pot', c:[528,-20], r:10, h:34, prop:true },
             { name:'ac unit', poly:[[134,-530],[186,-530],[186,-502],[134,-502]], h:36, prop:true } ],
    zones:[ { name:'pool', poly:[[500,-546],[760,-546],[760,-516],[500,-516]], kind:'water' } ],
    marks:{ door:[380,-76], mat:[380,-76+35.4] }
  },
  yard(c){
    T(0, 809.6, -512, 0, 0.3, '#d8d1c0');                       // gravel
    T(36, 280, -512, 0, 0.6, '#c3beb3');                        // carport / drive
    for(let b = -40; b > -512; b -= 40) poly([P(36,b,0.7), P(280,b,0.7)], null, '#aaa59b', 1);
    T(320, 440, -76, 0, 0.6, '#e4ded2');                        // entry walk
    houseLawn(464, 800, -46, -6, '#8aaa5e');
  },
  breeze(c, b){
    F(36, 280, 0, 110, c.block, shade(c.block,.7), 1, b);
    for(let a = 56; a < 280; a += 20) for(let z = 10; z < 110; z += 20){
      faceCircle(a, b + 0.4, z, 7, '#6f6a60');
      faceCircle(a, b + 0.6, z, 3, c.block);
    }
  },
  roofSlab(c){
    box(20, 792, -512, -26, 116, 128, c.roof, shade(c.roof,.9), shade(c.roof,.78));
    if(!state.back) F(20, 792, 116, 120, c.accent, null, 0, -25.6);   // street edge only: from behind it is the far face
    else            F(20, 792, 116, 120, c.accent, null, 0, -512.4);
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    for(const aa of [50, 266]) box(aa-5, aa+5, -35, -25, 0, 116, '#3a3a3e', '#2c2c30', '#222226');
    this.roofSlab(c);
    houseProp('pot', () => { cyl(528, -20, 0, 26, 10, '#2f2f33', '#4a4a50'); ball(528, -20, 34, 11, '#4f7a4a'); });
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.breeze(c, -120);
    houseMass(280, 776, -76, -502, 116, c.wall, 1);
    houseSideWins(280, 776, -76, -502, [[44,100]], '#2a2a2e', { plain:true, w:60 });
    F(280, 476, 0, 116, shade(c.wall,.96), null, 0, -76);
    houseDoorway(380, -76, HOUSE_SC, shade(c.wall,.86), c.leaf, 1);
    if(HOUSE_REC) HOUSE_REC.push({ kind:'win', a0:492, a1:768, z0:4, z1:106, b:-76 });
    F(492, 768, 4, 106, '#2c3a42', '#1f262b', 1, -75.6);
    F(496, 764, 60, 104, 'rgba(170,205,220,.3)', null, 0, -75.4);
    for(let a = 544; a < 764; a += 26) F(a-1.2, a+1.2, 4, 106, '#1f262b', null, 0, -75.2);
    box(508, 760, -58, -46, 0, 16, '#d8d2c4', '#c7c0b0', '#b3ab9a');
    for(let a = 532; a < 752; a += 22) for(const [dx, dz] of [[-6,10],[0,16],[6,10]])
      poly([P(a, -52, 16), P(a+dx, -52, 16+dz), P(a+dx+2, -52, 16+dz-3)], '#6b9a7a', '#4f7a5e', 0.8);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    T(492, 768, -550, -512, 0.5, '#e8e4da');
    T(500, 760, -546, -516, 0.7, '#5fb4d0');
    poly([P(512,-538,0.8), P(600,-538,0.8)], null, 'rgba(255,255,255,.5)', 1.5);
    this.breeze(c, -120);
    for(const aa of [50, 266]) box(aa-5, aa+5, -35, -25, 0, 116, '#3a3a3e', '#2c2c30', '#222226');
    houseMass(280, 776, -76, -502, 116, c.wall, -1);
    houseSideWins(280, 776, -76, -502, [[44,100]], '#2a2a2e', { plain:true, w:60 });
    if(HOUSE_REC) HOUSE_REC.push({ kind:'win', a0:500, a1:740, z0:4, z1:104, b:-226 });
    F(500, 740, 4, 104, '#2c3a42', '#1f262b', 1, -502.4);
    for(let a = 560; a < 740; a += 30) F(a-1.2, a+1.2, 4, 104, '#1f262b', null, 0, -502.8);
    rearDoor(380, c.wall, c.leaf, 502, 92);
    this.roofSlab(c);
    houseProp('ac unit', () => acUnit(160, 0, 502));
  }
},
/* ------------------------------------------------------------------ 6 */
{
  name:'Gingerbread Victorian', hood:'The Flats', tier:'single', sc:HOUSE_SC, ww:HOUSE_SINGLE, dd:HOUSE_DEPTH_LAB,
  head:'Victorian: two storeys, steep front gable, bay window, spindle porch',
  desc:'Narrow two-storey painted lady: steep front gable with fish-scale shingles, a canted-roof bay window, a spindle-frieze porch over the door and an iron fence with a gate gap.',
  tags:['single','two-storey','victorian','bay window','porch'],
  yardFence:{ style:'iron', h:32, col:'#2a2a2e' },
  door:[300, -80],
  liv:[ { wall:'#8fa98c', trim:'#f4ecd8', roof:'#4a4652', leaf:'#7a2e3a', gable:'#b0506a', accent:'#7a2e3a' },
        { wall:'#d9a6a6', trim:'#f7f1e4', roof:'#3e4a56', leaf:'#2e4d68', gable:'#5a7a9a', accent:'#2e4d68' },
        { wall:'#e2c77a', trim:'#fbf6ea', roof:'#4a3e3a', leaf:'#3f6b4a', gable:'#3f6b4a', accent:'#9c3b34' } ],
  vol:{
    foot:[[60,-80],[400,-80],[400,-520],[60,-520]], h:318,
    solids:[ { name:'bay', poly:[[80,-80],[200,-80],[200,-52],[80,-52]], h:132 },
             { name:'post L', poly:[[216,-46],[224,-46],[224,-38],[216,-38]], h:104 },
             { name:'post R', poly:[[388,-46],[396,-46],[396,-38],[388,-38]], h:104 },
             { name:'fence L', poly:[[12,-9],[240,-9],[240,-3],[12,-3]], h:34 },
             { name:'fence R', poly:[[360,-9],[448,-9],[448,-3],[360,-3]], h:34 },
             { name:'lamp', c:[52,-24], r:6, h:96, prop:true },
             { name:'ac unit', poly:[[314,-548],[366,-548],[366,-520],[314,-520]], h:36, prop:true } ],
    marks:{ door:[300,-80], mat:[300,-80+35.4] }
  },
  yard(c){
    houseLawn(0, 460, -80, 0, '#7fa35a');
    T(236, 364, -40, 0, 0.6, '#c9c1b0');
    T(212, 400, -80, -40, 1.2, shade(c.trim,.86));
  },
  fence(c){
    for(const [a0, a1] of [[12, 240], [360, 448]]){
      F(a0, a1, 26, 29, '#2a2a2e', null, 0, -6);
      F(a0, a1, 6, 8, '#2a2a2e', null, 0, -6);
      for(let a = a0 + 3; a < a1; a += 7) poly([P(a,-6,0), P(a+1.6,-6,0), P(a+1.6,-6,30), P(a+0.8,-6,34), P(a,-6,30)], '#2a2a2e');
      for(const aa of [a0, a1]) box(aa-3, aa+3, -9, -3, 0, 36, '#3a3a3e', '#2a2a2e', '#1f1f22');
    }
  },
  porch(c){
    for(const aa of [220, 392]){
      box(aa-4, aa+4, -46, -38, 0, 104, c.trim, shade(c.trim,.92), shade(c.trim,.78));
      for(const z of [20, 50, 80]) box(aa-5.5, aa+5.5, -47.5, -36.5, z, z+5, c.trim, shade(c.trim,.88), shade(c.trim,.74));
    }
    F(212, 400, 88, 104, shade(c.trim,.96), shade(c.trim,.7), 1, -40);
    for(let a = 220; a < 396; a += 6) F(a, a+2, 90, 102, c.accent, null, 0, -39.6);
    houseHip(208, 404, -40, -80, 104, 118, 5, c.roof, { hi:false, lo:false });
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    this.porch(c); this.fence(c);
    houseProp('lamp', () => {
      cyl(52, -24, 0, 84, 2.5, '#2a2a2e');
      box(46, 58, -30, -18, 84, 98, '#3a3a3e', 'rgba(250,230,160,.85)', 'rgba(230,205,140,.85)');
    });
    if(!state.back) houseYardFence(this, this.liv[state.pal % this.liv.length], 'near');
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far');
    houseMass(60, 400, -80, -520, 232, c.wall, 1);
    houseSideWins(60, 400, -80, -520, [[36,96],[140,196]], c.trim);
    for(let z = 16; z < 230; z += 8) poly([P(60,-80.2,z), P(400,-80.2,z)], null, shade(c.wall,.9), 1);
    F(60, 400, 118, 124, c.trim, null, 0, -79.6);                 // belt course
    houseDoorway(300, -80, HOUSE_SC, c.trim, c.leaf, 1);
    houseWin(92, 184, 140, 200, -80, c.trim, c.trim, 1);
    houseWin(256, 348, 140, 200, -80, c.trim, c.trim, 1);
    houseFrontGable(60, 400, -80, -520, 232, 318, 10, c.roof, c.wall, 1, { gable:c.gable, shingle:true, barge:c.trim });
    houseWin(208, 252, 250, 280, -80, c.trim, c.trim, 1, { plain:true });
    /* the bay: a box on the ground floor with its own low hip */
    box(80, 200, -80, -52, 0, 112, shade(c.wall,1.02), c.wall, shade(c.wall,.78));
    houseWin(96, 184, 30, 94, -52, c.trim, c.trim, 1);
    houseHip(80, 200, -52, -80, 112, 132, 4, c.roof, { hi:true, lo:true });
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far'); this.fore(p);
    box(80, 200, -80, -52, 0, 112, shade(c.wall,1.02), c.wall, shade(c.wall,.78));
    houseHip(80, 200, -52, -80, 112, 132, 4, c.roof, { hi:true, lo:true });
    houseMass(60, 400, -80, -520, 232, c.wall, -1);
    houseSideWins(60, 400, -80, -520, [[36,96],[140,196]], c.trim);
    for(let z = 16; z < 230; z += 8) poly([P(60,-520.2,z), P(400,-520.2,z)], null, shade(c.wall,.86), 1);
    houseWin(112, 192, 140, 196, -520, c.trim, c.trim, -1);
    houseWin(268, 348, 140, 196, -520, c.trim, c.trim, -1);
    houseWin(260, 352, 40, 96, -520, c.trim, c.trim, -1);
    rearDoor(140, c.wall, c.leaf, 520, 92);
    houseFrontGable(60, 400, -80, -520, 232, 318, 10, c.roof, c.wall, -1, { gable:c.gable, shingle:true, barge:c.trim });
    houseProp('ac unit', () => acUnit(340, 0, 520));
    houseYardFence(this, c, 'near');
  }
},
/* ------------------------------------------------------------------ 7 */
{
  name:'Nantucket Cape', hood:'The Flats', tier:'single', sc:HOUSE_SC, ww:HOUSE_SINGLE, dd:HOUSE_DEPTH_LAB,
  head:'Cape Cod: steep side gable, two dormers, cedar shingle, centre chimney',
  desc:'Storey-and-a-half cape with grey cedar shingle, white trim, two gabled dormers, a big centre chimney, a pedimented hood over the door, hydrangeas and a fieldstone wall.',
  tags:['single','cape cod','dormers','shingle'],
  yardFence:{ style:'wall', h:22, col:'#b3ada2', stones:true },
  door:[230, -76],
  liv:[ { wall:'#9ea3a3', trim:'#f7f5ef', roof:'#4f5456', leaf:'#2e4d68', bloom:'#8aa6d6' },
        { wall:'#b8a88e', trim:'#f7f5ef', roof:'#55504a', leaf:'#8a2f2f', bloom:'#d68aa8' },
        { wall:'#8e9a8c', trim:'#fbf8f2', roof:'#474c4e', leaf:'#3f6b4a', bloom:'#a88ad6' } ],
  vol:{
    foot:[[32,-76],[428,-76],[428,-512],[32,-512]], h:270,
    solids:[ { name:'wall L', poly:[[12,-10],[160,-10],[160,-2],[12,-2]], h:22 },
             { name:'wall R', poly:[[300,-10],[448,-10],[448,-2],[300,-2]], h:22 },
             { name:'hydrangea L', poly:[[36,-92],[128,-92],[128,-76],[36,-76]], h:30 },
             { name:'hydrangea R', poly:[[332,-92],[424,-92],[424,-76],[332,-76]], h:30 },
             { name:'bench', poly:[[71,-50],[117,-50],[117,-38],[71,-38]], h:24, prop:true },
             { name:'ac unit', poly:[[94,-540],[146,-540],[146,-512],[94,-512]], h:36, prop:true } ],
    marks:{ door:[230,-76], mat:[230,-76+35.4] }
  },
  slope:{ bf:-76, He:100, k:170/218 },
  yard(c){
    houseLawn(0, 460, -76, 0, '#7fa35a');
    T(160, 300, -76, 0, 0.6, '#b0654a');
    for(let b = -70; b < 0; b += 9) poly([P(160,b,0.7), P(300,b,0.7)], null, '#8f5038', 1);
  },
  stonewall(){
    for(const [a0, a1] of [[12, 160], [300, 448]]){
      box(a0, a1, -10, -2, 0, 22, '#b3ada2', '#a19b90', '#8a857b');
      for(let a = a0 + 6; a < a1; a += 13) F(a, a+8, 4 + (a % 3)*3, 11 + (a % 3)*3, '#8f897e', null, 0, -1.6);
    }
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    for(const [a0, a1] of [[36, 128], [332, 424]])
      for(let a = a0 + 8; a < a1; a += 12){ ball(a, -84, 14, 11, '#4f7a4a'); ball(a+2, -83, 22, 7, c.bloom); }
    for(const aa of [168, 292]) box(aa-3, aa+3, -72, -62, 76, 98, c.trim, shade(c.trim,.9), shade(c.trim,.76));
    houseFrontGable(160, 300, -62, -76, 98, 120, 4, c.roof, c.trim, 1, { back0:true, barge:c.trim });
    this.stonewall();
    houseProp('bench', () => {
      box(71, 117, -50, -38, 16, 20, '#a8835c', '#96744f', '#836544');
      for(const aa of [75, 113]) box(aa-2, aa+2, -48, -40, 0, 16, '#6b5038', '#5a4230', '#4d3828');
    });
    if(!state.back) houseYardFence(this, this.liv[state.pal % this.liv.length], 'near');
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far');
    houseMass(32, 428, -76, -512, 100, c.wall, 1);
    houseSideWins(32, 428, -76, -512, [[30,84]], c.trim);
    for(let z = 14; z < 98; z += 7) poly([P(32,-76.2,z), P(428,-76.2,z)], null, shade(c.wall,.86), 1);
    houseDoorway(230, -76, HOUSE_SC, c.trim, c.leaf, 1);
    houseWin(52, 128, 30, 86, -76, c.trim, c.trim, 1, { shutter:c.leaf });
    houseWin(332, 408, 30, 86, -76, c.trim, c.trim, 1, { shutter:c.leaf });
    houseGableRoof(32, 428, -76, -512, 100, 270, 8, c.roof, c.wall, 1);
    houseDormer(72, 168, -96, 170, 190, this.slope, c.wall, c.roof, c.trim);
    houseDormer(292, 388, -96, 170, 190, this.slope, c.wall, c.roof, c.trim);
    if(state.roof) box(217, 243, -307, -281, 250, 320, '#a8604a', '#8f513e', '#7a4535');
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far'); this.fore(p);
    houseMass(32, 428, -76, -512, 100, c.wall, -1);
    houseSideWins(32, 428, -76, -512, [[30,84]], c.trim);
    for(let z = 14; z < 98; z += 7) poly([P(32,-512.2,z), P(428,-512.2,z)], null, shade(c.wall,.82), 1);
    houseWin(68, 144, 34, 86, -512, c.trim, c.trim, -1);
    houseWin(200, 260, 50, 86, -512, c.trim, c.trim, -1);
    rearDoor(340, c.wall, c.leaf, 512, 90);
    houseGableRoof(32, 428, -76, -512, 100, 270, 8, c.roof, c.wall, -1);
    if(state.roof) box(217, 243, -307, -281, 250, 320, '#a8604a', '#8f513e', '#7a4535');
    houseProp('ac unit', () => acUnit(120, 0, 512));
    houseYardFence(this, c, 'near');
  }
},
/* ------------------------------------------------------------------ 8 */
{
  name:'Sunset Ranch', hood:'The Flats', tier:'double', sc:HOUSE_SC, dd:HOUSE_DEPTH_LAB, ww:HOUSE_DOUBLE,
  head:'Ranch: long low hip roof, brick wainscot, two-car garage, picture window',
  desc:'Single-storey ranch under one long low hip -- a pitch low enough that every face is culled on its own -- with brick wainscot, a two-car garage on the drive, a shuttered picture window, shrubs and a lamp post.',
  tags:['double','ranch','garage','low hip'],
  door:[400, -80],
  liv:[ { wall:'#efe4cf', trim:'#fbf7ee', roof:'#6b5a4e', leaf:'#2e4d68', brick:'#a5584a', gar:'#f2ece0' },
        { wall:'#dde3e0', trim:'#fbfbf8', roof:'#4e5358', leaf:'#8a2f2f', brick:'#9a6a52', gar:'#eef0ee' },
        { wall:'#e9d8bc', trim:'#fbf5ea', roof:'#5a4a3e', leaf:'#3f6b4a', brick:'#b36a4f', gar:'#f4ead8' } ],
  vol:{
    foot:[[28,-80],[784,-80],[784,-512],[28,-512]], h:160,
    solids:[ { name:'shrubs', poly:[[528,-94],[772,-94],[772,-80],[528,-80]], h:24 },
             { name:'lamp', c:[512,-24], r:6, h:84, prop:true },
             { name:'ac unit', poly:[[154,-540],[206,-540],[206,-512],[154,-512]], h:36, prop:true },
             { name:'grill', poly:[[653,-538],[679,-538],[679,-522],[653,-522]], h:40, prop:true } ],
    marks:{ door:[400,-80], mat:[400,-80+35.4] }
  },
  yard(c){
    houseLawn(300, 809.6, -80, 0, '#86a85e');
    T(56, 300, -80, 0, 0.6, '#bdb8ae');
    poly([P(178,-80,0.7), P(178,0,0.7)], null, '#a29d93', 1);
    T(340, 460, -80, 0, 0.7, '#d4cdbd');
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    for(let a = 544; a < 768; a += 14) ball(a, -87, 12, 10, a % 28 ? '#4f7a4a' : '#5c8a56');
    houseProp('lamp', () => {
      cyl(512, -24, 0, 70, 2.5, '#2a2a2e');
      box(506, 518, -30, -18, 70, 84, '#3a3a3e', 'rgba(250,230,160,.85)', 'rgba(230,205,140,.85)');
    });
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    houseMass(28, 784, -80, -512, 110, c.wall, 1);
    houseSideWins(28, 784, -80, -512, [[40,96]], c.trim);
    houseBrick(308, 784, 10, 36, -79.8, c.brick);
    F(56, 300, 0, 86, c.gar, shade(c.gar,.7), 1.2, -79.6);
    for(let z = 17; z < 86; z += 17) F(56, 300, z-1.2, z, shade(c.gar,.82), null, 0, -79.4);
    for(let a = 117; a < 300; a += 30.5) F(a-0.8, a+0.8, 0, 86, shade(c.gar,.86), null, 0, -79.4);
    houseDoorway(400, -80, HOUSE_SC, c.trim, c.leaf, 1);
    houseWin(592, 712, 34, 96, -80, c.trim, c.trim, 1, { shutter:c.leaf, plain:true });
    houseHip(28, 784, -80, -512, 110, 160, 10, c.roof);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); this.fore(p);
    T(320, 600, -546, -512, 0.6, '#cfc8b8');
    houseMass(28, 784, -80, -512, 110, c.wall, -1);
    houseSideWins(28, 784, -80, -512, [[40,96]], c.trim);
    houseBrick(28, 784, 10, 36, -512.2, c.brick, -1);
    houseWin(80, 180, 40, 96, -512, c.trim, c.trim, -1);
    houseWin(600, 720, 40, 96, -512, c.trim, c.trim, -1);
    if(HOUSE_REC) HOUSE_REC.push({ kind:'win', a0:360, a1:560, z0:0, z1:100, b:-236 });
    F(360, 560, 0, 100, shade(c.trim,.9), null, 0, -512.4);
    F(372, 548, 0, 94, '#2c3a42', null, 0, -512.8);
    F(459, 461, 0, 94, shade(c.trim,.9), null, 0, -513.1);
    houseHip(28, 784, -80, -512, 110, 160, 10, c.roof);
    houseProp('ac unit', () => acUnit(180, 0, 512));
    houseProp('grill', () => {
      for(const aa of [656, 676]) box(aa-1.5, aa+1.5, -534, -526, 0, 26, '#3a3a3e', '#2a2a2e', '#1f1f22');
      box(653, 679, -538, -522, 26, 40, '#2a2a2e', '#1f1f22', '#161618');
    });
  }
},
/* ------------------------------------------------------------------ 9 */
{
  name:'Coastline Modern', hood:'The Flats', tier:'single', sc:HOUSE_SC, ww:HOUSE_SINGLE, dd:HOUSE_DEPTH_LAB,
  head:'Modern: two-storey flat box, timber-clad upper floor cantilevered over the entry',
  desc:'Charcoal ground floor with a glass wall; a cedar-slatted upper box cantilevers forward over the entry; ribbon window; glass roof-deck rail; gravel, stepping pads and an olive tree.',
  tags:['single','modern','cantilever','flat roof'],
  door:[140, -84],
  liv:[ { wall:'#3a3d42', clad:'#b07a4a', roof:'#d8d6d0', leaf:'#e8e2d4', grav:'#d2cec4' },
        { wall:'#e8e6e0', clad:'#8a5a3a', roof:'#cfccc4', leaf:'#2a2a2e', grav:'#c9c5bb' },
        { wall:'#4a5560', clad:'#c9a070', roof:'#dcd8cf', leaf:'#d9573c', grav:'#d6d2c8' } ],
  vol:{
    foot:[[40,-84],[428,-84],[428,-506],[40,-506]], h:232,
    solids:[ { name:'olive', c:[364,-26], r:7, h:110, prop:true },
             { name:'ac unit', poly:[[274,-534],[326,-534],[326,-506],[274,-506]], h:36, prop:true } ],
    marks:{ door:[140,-84], mat:[140,-84+35.4] }
  },
  yard(c){
    T(0, 460, -84, 0, 0.4, c.grav);
    for(let b = -78; b < -4; b += 16) T(92, 188, b, b+11, 0.8, '#b8b4aa');
  },
  upper(c){
    box(24, 436, -506, -44, 118, 232, c.roof, c.clad, shade(c.clad,.78));
    houseSideWins(24, 436, -44, -506, [[150,204]], '#2a2a2e', { plain:true, w:90, pitch:140 });
  },
  upperFront(c){
    for(let a = 32; a < 432; a += 7) F(a, a+1.2, 120, 230, shade(c.clad,.78), null, 0, -43.6);
    houseWin(80, 380, 152, 204, -44, '#2a2a2e', '#2a2a2e', 1, { plain:true });
    for(let a = 140; a < 380; a += 30) F(a-1, a+1, 152, 204, '#2a2a2e', null, 0, -43.2);
  },
  rail(c){
    if(!state.roof) return;
    F(28, 432, 232, 256, 'rgba(190,220,230,.35)', 'rgba(120,150,160,.8)', 1, state.back ? -504 : -46);
    const aS = FLANK_RIGHT ? 432 : 28;
    S(aS, -504, -46, 232, 256, 'rgba(190,220,230,.3)', 'rgba(120,150,160,.8)', 1);
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    this.upper(c); this.upperFront(c); this.rail(c);
    houseProp('olive', () => houseTree(364, -26, 110, '#7f9a6a'));
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    houseMass(40, 428, -84, -506, 118, c.wall, 1);
    houseSideWins(40, 428, -84, -506, [[20,104]], '#1f262b', { plain:true, w:70, pitch:110 });
    houseDoorway(140, -84, HOUSE_SC, shade(c.wall,.8), c.leaf, 1);
    if(HOUSE_REC) HOUSE_REC.push({ kind:'win', a0:240, a1:420, z0:4, z1:110, b:-84 });
    F(240, 420, 4, 110, '#2c3a42', '#1f262b', 1, -83.6);
    F(244, 416, 64, 108, 'rgba(170,205,220,.28)', null, 0, -83.4);
    F(329, 331, 4, 110, '#1f262b', null, 0, -83.2);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    houseProp('olive', () => houseTree(364, -26, 110, '#7f9a6a'));
    houseMass(40, 428, -84, -506, 118, c.wall, -1);
    houseSideWins(40, 428, -84, -506, [[20,104]], '#1f262b', { plain:true, w:70, pitch:110 });
    if(HOUSE_REC) HOUSE_REC.push({ kind:'win', a0:80, a1:260, z0:4, z1:108, b:-230 });
    F(80, 260, 4, 108, '#2c3a42', '#1f262b', 1, -506.4);
    F(169, 171, 4, 108, '#1f262b', null, 0, -506.8);
    this.upper(c);
    for(let a = 32; a < 432; a += 7) F(a, a+1.2, 120, 230, shade(c.clad,.74), null, 0, -506.4);
    houseWin(120, 340, 156, 200, -506, '#2a2a2e', '#2a2a2e', -1, { plain:true });
    this.rail(c);
    houseProp('ac unit', () => acUnit(300, 0, 506));
  }
},
/* ------------------------------------------------------------------ 10 */
{
  name:'Heron Tudor', hood:'The Flats', tier:'double', sc:HOUSE_SC, dd:HOUSE_DEPTH_LAB, ww:HOUSE_DOUBLE,
  head:'Tudor revival: steep side gable, half-timbered cross wing, front chimney',
  desc:'Brick ground floor, stucco and dark half-timber above, a steep cross-gabled wing that runs back into the main roof in a valley, a tall brick chimney on the front, leaded windows, an arched door and a clipped hedge.',
  tags:['double','tudor','cross gable','half-timber','chimney'],
  yardFence:{ style:'hedge', h:26, col:'#5c8a4c' },
  door:[280, -80],
  liv:[ { brick:'#9c5a44', stucco:'#efe6d2', timber:'#3e2e24', roof:'#4a4442', leaf:'#5a3a28', stone:'#c9bfae' },
        { brick:'#8a4e3e', stucco:'#e9e2d0', timber:'#2e2a26', roof:'#3e3a3c', leaf:'#2f5a4a', stone:'#c4bca9' },
        { brick:'#a8664c', stucco:'#f2ead8', timber:'#4a3626', roof:'#55504c', leaf:'#7a2e3a', stone:'#cfc6b4' } ],
  vol:{
    foot:[[28,-80],[784,-80],[784,-512],[28,-512],[28,-80]], h:322,
    solids:[ { name:'wing', poly:[[560,-80],[784,-80],[784,-54],[560,-54]], h:300 },
             { name:'chimney', poly:[[434,-80],[462,-80],[462,-62],[434,-62]], h:360 },
             { name:'hedge L', poly:[[16,-18],[200,-18],[200,-6],[16,-6]], h:26 },
             { name:'hedge R', poly:[[360,-18],[792,-18],[792,-6],[360,-6]], h:26 },
             { name:'birdbath', c:[120,-44], r:10, h:36, prop:true },
             { name:'ac unit', poly:[[134,-540],[186,-540],[186,-512],[134,-512]], h:36, prop:true } ],
    marks:{ door:[280,-80], mat:[280,-80+35.4] }
  },
  yard(c){
    houseLawn(0, 809.6, -80, 0, '#7a9e58');
    T(200, 360, -80, 0, 0.6, c.stone);
    for(let b = -72; b < 0; b += 12) poly([P(200,b,0.7), P(360,b,0.7)], null, shade(c.stone,.8), 1);
  },
  timber(a0, a1, z0, z1, b, c){
    F(a0, a1, z0, z1, c.stucco, null, 0, b);
    F(a0, a1, z0, z0+5, c.timber, null, 0, b+0.3); F(a0, a1, z1-5, z1, c.timber, null, 0, b+0.3);
    const n = Math.max(2, Math.round((a1-a0)/30));
    for(let k = 0; k <= n; k++){ const a = a0 + (a1-a0)*k/n; F(a-2.5, a+2.5, z0, z1, c.timber, null, 0, b+0.3);
      if(k < n && k % 2 === 0){ const a2 = a0 + (a1-a0)*(k+1)/n;
        poly([P(a+2,b+0.4,z0+5), P(a+6,b+0.4,z0+5), P(a2-2,b+0.4,z1-5), P(a2-6,b+0.4,z1-5)], c.timber); } }
  },
  hedge(){
    for(const [a0, a1] of [[16, 200], [360, 792]]){
      box(a0, a1, -18, -6, 0, 26, '#5c8a4c', '#4f7a42', '#426a38');
      for(let a = a0 + 8; a < a1; a += 16) ball(a, -12, 26, 7, '#5c8a4c');
    }
  },
  wing(c, dir){
    houseMass(560, 784, -54, -80, 220, c.brick, 1);
    houseBrick(560, 784, 0, 112, -54, c.brick);
    this.timber(560, 784, 112, 220, -54, c);
    houseWin(612, 732, 34, 96, -54, '#e8e0cc', '#e8e0cc', 1, { lead:true, plain:true });
    houseWin(624, 720, 140, 196, -54, '#e8e0cc', '#e8e0cc', 1, { lead:true, plain:true });
    const k = 102/216, bR = -80 - (300-220)/k;
    houseFrontGable(560, 784, -54, -80, 220, 300, 8, c.roof, c.stucco, 1, { gable:c.stucco, barge:c.timber, valley:[-80, bR] });
    for(const aa of [616, 672, 728]){ const zt = 220 + 80*(1 - Math.abs(aa-672)/112); F(aa-2.5, aa+2.5, 220, zt - 3, c.timber, null, 0, -53.6); }
    houseWin(652, 692, 238, 262, -54, '#e8e0cc', '#e8e0cc', 1, { lead:true, plain:true });
  },
  chimney(c){
    box(434, 462, -80, -62, 0, 360, shade(c.brick,1.08), c.brick, shade(c.brick,.78));
    for(let z = 8; z < 360; z += 8) F(434, 462, z, z+1, shade(c.brick,.78), null, 0, -61.6);
    box(431, 465, -83, -59, 346, 356, shade(c.brick,1.1), shade(c.brick,.9), shade(c.brick,.72));
    for(const aa of [434, 462]) cyl(aa, -71, 356, 372, 4, '#8a5040', '#6a3a2e');
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    this.hedge();
    houseProp('birdbath', () => { cyl(120, -44, 0, 28, 4, c.stone); plateCircle(120, -44, 28, 11, shade(c.stone,1.06), shade(c.stone,.7), 1); plateCircle(120, -44, 29, 8, '#8fc4d6'); });
    if(!state.back) houseYardFence(this, this.liv[state.pal % this.liv.length], 'near');
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far');
    houseMass(28, 784, -80, -512, 220, c.brick, 1);
    houseSideWins(28, 784, -80, -512, [[36,96],[136,196]], '#e8e0cc');
    houseBrick(28, 560, 0, 112, -80, c.brick);
    this.timber(28, 560, 112, 220, -80, c);
    houseArch(280, -80, houseDoorDims(HOUSE_SC).h, 44, 14, c.stone, 1);
    houseDoorway(280, -80, HOUSE_SC, c.stone, c.leaf, 1);
    houseWin(60, 152, 34, 96, -80, '#e8e0cc', '#e8e0cc', 1, { lead:true, plain:true });
    houseWin(80, 172, 136, 196, -80, '#e8e0cc', '#e8e0cc', 1, { lead:true, plain:true });
    houseWin(240, 332, 136, 196, -80, '#e8e0cc', '#e8e0cc', 1, { lead:true, plain:true });
    houseGableRoof(28, 784, -80, -512, 220, 322, 10, c.roof, c.stucco, 1);
    this.wing(c, 1);
    this.chimney(c);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far'); this.fore(p);
    this.wing(c, 1);
    this.chimney(c);
    houseMass(28, 784, -80, -512, 220, c.brick, -1);
    houseSideWins(28, 784, -80, -512, [[36,96],[136,196]], '#e8e0cc');
    houseBrick(28, 784, 0, 112, -512, c.brick, -1);
    this.timber(28, 784, 112, 220, -512.2, c);
    houseWin(100, 192, 136, 196, -512, '#e8e0cc', '#e8e0cc', -1, { lead:true, plain:true });
    houseWin(600, 692, 136, 196, -512, '#e8e0cc', '#e8e0cc', -1, { lead:true, plain:true });
    houseWin(600, 692, 34, 96, -512, '#e8e0cc', '#e8e0cc', -1, { lead:true, plain:true });
    rearDoor(400, c.brick, c.leaf, 512, 92);
    houseGableRoof(28, 784, -80, -512, 220, 322, 10, c.roof, c.stucco, -1);
    box(434, 462, -80, -62, 250, 360, shade(c.brick,1.08), c.brick, shade(c.brick,.78));
    houseProp('ac unit', () => acUnit(160, 0, 512));
    houseYardFence(this, c, 'near');
  }
},
/* ------------------------------------------------------------------ 11 */
{
  name:'Mesa Adobe', hood:'The Flats', tier:'single', sc:HOUSE_SC, ww:HOUSE_SINGLE, dd:HOUSE_DEPTH_LAB,
  head:'Pueblo revival: stepped flat roofs, parapets, vigas, turquoise door',
  desc:'Two stepped adobe blocks with soft parapets and projecting vigas, a deep-set turquoise door under an arched surround with a chile ristra beside it, a low adobe wall, a saguaro, an olla and a ladder; a horno in the back yard.',
  tags:['single','adobe','flat roof','southwest'],
  yardFence:{ style:'wall', h:24, col:'wall', balls:true },
  door:[166, -76],
  liv:[ { wall:'#d4a07a', trim:'#3fa3a0', leaf:'#3fa3a0', viga:'#8a6a4a', grav:'#e2cfb0' },
        { wall:'#e0b890', trim:'#2e6f9a', leaf:'#2e6f9a', viga:'#7a5a3e', grav:'#e6d6ba' },
        { wall:'#c98f6a', trim:'#5aa37a', leaf:'#5aa37a', viga:'#806246', grav:'#dcc8a8' } ],
  vol:{
    foot:[[32,-76],[300,-76],[300,-96],[428,-96],[428,-512],[32,-512]], h:162,
    solids:[ { name:'wall L', poly:[[12,-10],[100,-10],[100,-2],[12,-2]], h:28 },
             { name:'wall R', poly:[[232,-10],[448,-10],[448,-2],[232,-2]], h:28 },
             { name:'saguaro', c:[380,-40], r:8, h:96, prop:true },
             { name:'olla', c:[60,-40], r:11, h:24, prop:true },
             { name:'ladder', poly:[[341,-104],[367,-104],[367,-80],[341,-80]], h:130, prop:true },
             { name:'horno', c:[80,-527], r:13, h:26, prop:true } ],
    marks:{ door:[166,-76], mat:[166,-76+35.4] }
  },
  yard(c){
    T(0, 460, -96, 0, 0.4, c.grav);
    for(let b = -70; b < -8; b += 14) T(149, 183, b, b+10, 0.7, '#b89a78');
  },
  lowwall(c){
    for(const [a0, a1] of [[12, 100], [232, 448]]){
      box(a0, a1, -10, -2, 0, 24, shade(c.wall,1.04), c.wall, shade(c.wall,.8));
      for(let a = a0 + 6; a < a1; a += 12) ball(a, -6, 24, 4.2, c.wall);
    }
  },
  vigas(c, a0, a1, z, b, d){
    for(let a = a0; a <= a1; a += 22){ tube(a, b, z, a, b + 10*d, z, 4.5, c.viga); faceCircle(a, b + 10*d, z, 4.5, shade(c.viga,1.2), shade(c.viga,.7), 1); }
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    this.lowwall(c);
    houseProp('saguaro', () => houseCactus(380, -40, 90, '#5f8a4f'));
    houseProp('olla', () => { ball(60, -40, 12, 11, '#b86a4a'); cyl(60, -40, 18, 24, 5, '#a55a3c'); });
    houseProp('ladder', () => {
      for(const aa of [345, 363]) tube(aa, -82, 0, aa, -100, 130, 2, c.viga);
      for(let t = 0.12; t < 1; t += 0.14) tube(345, -82 - 18*t, 130*t, 363, -82 - 18*t, 130*t, 1.5, c.viga);
    });
    if(!state.back) houseYardFence(this, this.liv[state.pal % this.liv.length], 'near');
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far');
    houseMass(32, 300, -76, -512, 150, c.wall, 1);
    houseParapetRoof(32, 300, -76, -512, 150, 12, 8, c.wall);
    this.vigas(c, 60, 280, 138, -76, 1);
    houseArch(166, -76, houseDoorDims(HOUSE_SC).h, 42, 12, shade(c.wall,.9), 1);
    houseDoorway(166, -76, HOUSE_SC, c.trim, c.leaf, 1);
    houseWin(208, 256, 108, 128, -76, c.trim, shade(c.wall,.86), 1, { plain:true });
    for(let k = 0; k < 8; k++) ball(264 + (k%2)*2, -74, 110 - k*6, 3.2, k % 3 ? '#c8352a' : '#a82a22');
    houseMass(300, 428, -96, -512, 110, shade(c.wall,.97), 1);
    houseSideWins(300, 428, -96, -512, [[36,84]], c.trim);
    houseParapetRoof(300, 428, -96, -512, 110, 10, 8, shade(c.wall,.97));
    houseWin(328, 400, 34, 84, -96, c.trim, shade(c.wall,.86), 1);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far'); this.fore(p);
    houseMass(300, 428, -96, -512, 110, shade(c.wall,.97), -1);
    houseParapetRoof(300, 428, -96, -512, 110, 10, 8, shade(c.wall,.97));
    houseMass(32, 300, -76, -512, 150, c.wall, -1);
    houseSideWins(32, 300, -76, -512, [[40,96]], c.trim);
    houseParapetRoof(32, 300, -76, -512, 150, 12, 8, c.wall);
    this.vigas(c, 60, 280, 138, -512, -1);
    houseWin(80, 140, 60, 100, -512, c.trim, shade(c.wall,.86), -1);
    rearDoor(220, c.wall, c.leaf, 512, 92);
    houseWin(340, 392, 40, 80, -512, c.trim, shade(c.wall,.86), -1);
    houseProp('horno', () => { ball(80, -527, 13, 13, shade(c.wall,.95)); faceCircle(80, -539.6, 8, 5, '#3a2a20'); });
    houseYardFence(this, c, 'near');
  }
},
/* ------------------------------------------------------------------ 12 */
{
  name:'Rosewood Queen Anne', hood:'The Flats', tier:'single', sc:HOUSE_SC, ww:HOUSE_SINGLE, dd:HOUSE_DEPTH_LAB,
  head:'Queen Anne: octagonal turret, fish-scale cross gable, spindle porch',
  desc:'Two-storey Queen Anne under a big hip: an octagonal turret with a tall cone on the street corner, a projecting cross-gabled wing in fish-scale shingle, a spindle-frieze porch at the door, pickets and a gas lamp.',
  tags:['single','queen anne','turret','cross gable','porch'],
  yardFence:{ style:'picket', h:36, col:'#f7f4ec' },
  door:[270, -110],
  liv:[ { wall:'#6f5a7a', trim:'#f3ead6', roof:'#3e3a44', leaf:'#2f6f6a', gable:'#c9a24a', accent:'#2f6f6a' },
        { wall:'#4f7f7a', trim:'#f5eedc', roof:'#44383a', leaf:'#9c3b34', gable:'#d98a5a', accent:'#9c3b34' },
        { wall:'#b5645a', trim:'#f7f0de', roof:'#3a3f44', leaf:'#2e4d68', gable:'#e2c77a', accent:'#2e4d68' } ],
  vol:{
    foot:[[40,-70],[210,-70],[210,-110],[400,-110],[400,-500],[30,-500],[30,-110],[40,-110]], h:396,
    solids:[ { name:'turret', poly:houseRing(380,-110,50,8), h:380 },
             { name:'post L', poly:[[216,-70],[224,-70],[224,-62],[216,-62]], h:104 },
             { name:'post R', poly:[[316,-70],[324,-70],[324,-62],[316,-62]], h:104 },
             { name:'fence L', poly:[[4,-9],[234,-9],[234,-1],[4,-1]], h:36 },
             { name:'fence R', poly:[[306,-9],[456,-9],[456,-1],[306,-1]], h:36 },
             { name:'lamp', c:[26,-30], r:6, h:96, prop:true },
             { name:'bench', poly:[[90,-52],[140,-52],[140,-38],[90,-38]], h:24, prop:true },
             { name:'ac unit', poly:[[274,-528],[326,-528],[326,-500],[274,-500]], h:36, prop:true } ],
    marks:{ door:[270,-110], mat:[270,-110+35.4] }
  },
  yard(c){
    houseLawn(0, 460, -110, 0, '#7fa35a');
    T(234, 306, -64, 0, 0.6, '#c9c1b0');
    T(214, 326, -110, -64, 1.2, shade(c.trim,.86));
  },
  wing(c){
    houseMass(40, 210, -70, -110, 226, c.wall, 1);
    for(let z = 16; z < 224; z += 8) poly([P(40,-70.2,z), P(210,-70.2,z)], null, shade(c.wall,.88), 1);
    F(40, 210, 116, 122, c.trim, null, 0, -69.6);
    houseWin(80, 170, 34, 100, -70, c.trim, c.trim, 1);
    houseWin(90, 160, 140, 200, -70, c.trim, c.trim, 1);
    houseFrontGable(40, 210, -70, -110, 226, 290, 10, c.roof, c.wall, 1, { gable:c.gable, shingle:true, barge:c.trim, valley:[-110, -279] });
    houseWin(110, 140, 238, 262, -70, c.trim, c.trim, 1, { plain:true });
  },
  turret(c){
    const seen = housePrism(houseRing(380,-110,50,8), 0, 262, c.wall, { top:false });
    for(const f of seen){
      houseFaceWin(f, 0.26, 0.74, 40, 100, c.trim);
      houseFaceWin(f, 0.26, 0.74, 150, 210, c.trim);
      houseFaceWin(f, 0, 1, 116, 122, c.trim, { band:true });
    }
    houseCone(380, -110, 58, 8, 256, 380, c.roof);
    if(state.roof){ cyl(380, -110, 380, 396, 1.5, '#2a2a2e'); ball(380, -110, 398, 3, '#c9a24a'); }
  },
  porch(c){
    for(const aa of [220, 320]){
      box(aa-4, aa+4, -70, -62, 0, 104, c.trim, shade(c.trim,.92), shade(c.trim,.78));
      for(const z of [20, 50, 80]) box(aa-5.5, aa+5.5, -71.5, -60.5, z, z+5, c.trim, shade(c.trim,.88), shade(c.trim,.74));
    }
    F(214, 326, 88, 104, shade(c.trim,.96), shade(c.trim,.7), 1, -64);
    for(let a = 218; a < 324; a += 6) F(a, a+2, 90, 102, c.accent, null, 0, -63.6);
    houseHip(214, 326, -64, -110, 104, 120, 5, c.roof, { lo:false, hi:false });
  },
  fence(){
    for(const [a0, a1] of [[4, 234], [306, 456]]){
      housePickets(a0, a1, -5, 36, '#f7f4ec');
      for(const aa of [a0 + 4, a1 - 4]) housePost(aa, -5, 42, '#f7f4ec');
    }
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    this.porch(c); this.fence();
    houseProp('lamp', () => { cyl(26, -30, 0, 84, 2.5, '#2a2a2e'); box(20, 32, -36, -24, 84, 98, '#3a3a3e', 'rgba(250,230,160,.85)', 'rgba(230,205,140,.85)'); });
    houseProp('bench', () => {
      box(90, 140, -52, -38, 16, 20, '#a8835c', '#96744f', '#836544');
      for(const aa of [94, 136]) box(aa-2, aa+2, -50, -40, 0, 16, '#6b5038', '#5a4230', '#4d3828');
    });
    if(!state.back) houseYardFence(this, this.liv[state.pal % this.liv.length], 'near');
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far');
    houseMass(30, 400, -110, -500, 226, c.wall, 1);
    for(let z = 16; z < 224; z += 8) poly([P(30,-110.2,z), P(400,-110.2,z)], null, shade(c.wall,.88), 1);
    F(30, 400, 116, 122, c.trim, null, 0, -109.6);
    houseSideWins(30, 400, -110, -500, [[36,96],[140,196]], c.trim, { skipFront:90 });
    houseDoorway(270, -110, HOUSE_SC, c.trim, c.leaf, 1);
    houseWin(240, 300, 140, 200, -110, c.trim, c.trim, 1);
    houseHip(30, 400, -110, -500, 226, 300, 12, c.roof);
    this.wing(c);
    this.turret(c);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far'); this.fore(p);
    this.turret(c); this.wing(c);
    houseMass(30, 400, -110, -500, 226, c.wall, -1);
    for(let z = 16; z < 224; z += 8) poly([P(30,-500.2,z), P(400,-500.2,z)], null, shade(c.wall,.84), 1);
    houseSideWins(30, 400, -110, -500, [[36,96],[140,196]], c.trim, { skipFront:60 });
    houseWin(70, 130, 140, 200, -500, c.trim, c.trim, -1);
    houseWin(260, 320, 140, 200, -500, c.trim, c.trim, -1);
    houseWin(260, 320, 40, 96, -500, c.trim, c.trim, -1);
    rearDoor(150, c.wall, c.leaf, 500, 92);
    houseHip(30, 400, -110, -500, 226, 300, 12, c.roof);
    houseProp('ac unit', () => acUnit(300, 0, 500));
    houseYardFence(this, c, 'near');
  }
},
/* ------------------------------------------------------------------ 13 */
{
  name:'Harvest Farmhouse', hood:'The Flats', tier:'double', sc:HOUSE_SC, ww:HOUSE_DOUBLE, dd:HOUSE_DEPTH_LAB,
  head:'Farmhouse: board-and-batten, standing-seam roof, centre gable, full porch',
  desc:'Long white two-storey farmhouse in board-and-batten under a standing-seam metal roof, a centre cross gable over the door, a full-width porch with a shed roof, posts and a spindle rail, two rockers and a mailbox by the walk.',
  tags:['double','farmhouse','porch','metal roof','cross gable'],
  door:[405, -150],
  liv:[ { wall:'#f4f1ea', trim:'#ffffff', roof:'#6b6f73', leaf:'#2f3a44', accent:'#2f3a44', deck:'#a8835c' },
        { wall:'#e9e2cf', trim:'#fbfaf5', roof:'#8a3a30', leaf:'#8a3a30', accent:'#3f4a3e', deck:'#9a7a58' },
        { wall:'#dfe6e2', trim:'#fbfbf8', roof:'#3e4a44', leaf:'#3e4a44', accent:'#5a4030', deck:'#a88a64' } ],
  vol:{
    foot:[[30,-150],[780,-150],[780,-500],[30,-500]], h:380,
    solids:[ { name:'rail L', poly:[[32,-88],[374,-88],[374,-80],[32,-80]], h:36 },
             { name:'rail R', poly:[[436,-88],[778,-88],[778,-80],[436,-80]], h:36 },
             { name:'rocker L', c:[200,-118], r:14, h:48, prop:true },
             { name:'rocker R', c:[610,-118], r:14, h:48, prop:true },
             { name:'mailbox', poly:[[470,-18],[486,-18],[486,-4],[470,-4]], h:52, prop:true },
             { name:'ac unit', poly:[[94,-528],[146,-528],[146,-500],[94,-500]], h:36, prop:true },
             { name:'bin', poly:[[682,-550],[718,-550],[718,-514],[682,-514]], h:52, prop:true } ],
    marks:{ door:[405,-150], mat:[405,-150+35.4] }
  },
  prof:[[-150,226],[-325,330],[-500,226]],
  yard(c){
    houseLawn(0, 809.6, -150, 0, '#86a85e');
    T(370, 440, -80, 0, 0.6, '#cbbf9f');
    T(30, 780, -150, -80, 1.4, c.deck);
    for(let a = 40; a < 780; a += 10) poly([P(a,-150,1.5), P(a,-80,1.5)], null, shade(c.deck,.84), 1);
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    for(const aa of [36, 150, 260, 370, 440, 550, 660, 774]) box(aa-4, aa+4, -88, -80, 0, 112, c.trim, shade(c.trim,.9), shade(c.trim,.76));
    for(const [a0, a1] of [[40, 366], [444, 770]]){
      F(a0, a1, 30, 34, c.trim, null, 0, -84); F(a0, a1, 6, 9, c.trim, null, 0, -84);
      for(let a = a0 + 5; a < a1 - 2; a += 8) F(a, a+2, 9, 30, c.trim, null, 0, -84);
    }
    houseProfileRoof(30, 780, [[-80,112],[-150,136]], 8, c.roof, c.wall, { seams:14, ext1:false, gable:shade(c.trim,.9) });
    houseProp('rocker L', () => houseRocker(200, -118, '#8a5a3a'));
    houseProp('rocker R', () => houseRocker(610, -118, '#8a5a3a'));
    houseProp('mailbox', () => {
      box(476, 480, -13, -9, 0, 40, '#6b5038', '#5a4230', '#4d3828');
      box(470, 486, -18, -4, 40, 52, c.accent, shade(c.accent,.8), shade(c.accent,.65));
    });
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    houseMass(30, 780, -150, -500, 226, c.wall, 1);
    for(let a = 42; a < 780; a += 12) F(a, a+1.4, 10, 226, shade(c.wall,.9), null, 0, -149.8);
    houseSideWins(30, 780, -150, -500, [[36,100],[140,200]], c.trim);
    houseDoorway(405, -150, HOUSE_SC, c.trim, c.leaf, 1);
    for(const [a0, a1] of [[90,150],[230,290],[520,580],[660,720]]){
      houseWin(a0, a1, 30, 100, -150, c.trim, c.trim, 1, { shutter:c.accent });
      houseWin(a0, a1, 140, 200, -150, c.trim, c.trim, 1, { shutter:c.accent });
    }
    houseProfileRoof(30, 780, this.prof, 14, c.roof, c.wall, { seams:14 });
    const k = 104/175, bR = -150 - (320-226)/k;
    houseFrontGable(330, 480, -150, -150, 226, 320, 8, c.roof, c.wall, 1, { valley:[-150, bR], barge:c.trim });
    houseWin(390, 420, 240, 280, -150, c.trim, c.trim, 1, { plain:true });
    if(state.roof) box(630, 660, -340, -310, 300, 380, '#a8604a', '#8f513e', '#7a4535');
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); this.fore(p);
    houseMass(30, 780, -150, -500, 226, c.wall, -1);
    for(let a = 42; a < 780; a += 12) F(a, a+1.4, 10, 226, shade(c.wall,.86), null, 0, -500.2);
    houseSideWins(30, 780, -150, -500, [[36,100],[140,200]], c.trim);
    for(const [a0, a1] of [[120,180],[300,360],[450,510],[630,690]]) houseWin(a0, a1, 140, 200, -500, c.trim, c.trim, -1);
    houseWin(120, 180, 36, 100, -500, c.trim, c.trim, -1);
    houseWin(630, 690, 36, 100, -500, c.trim, c.trim, -1);
    rearDoor(400, c.wall, c.leaf, 500, 92);
    houseProfileRoof(30, 780, this.prof, 14, c.roof, c.wall, { seams:14 });
    if(state.roof) box(630, 660, -340, -310, 300, 380, '#a8604a', '#8f513e', '#7a4535');
    houseProp('ac unit', () => acUnit(120, 0, 500));
    houseProp('bin', () => wheelieBin(700, '#3f6b4a', 0, 500));
  }
},
/* ------------------------------------------------------------------ 14 */
{
  name:'Gambrel Dutch Colonial', hood:'The Flats', tier:'single', sc:HOUSE_SC, ww:HOUSE_SINGLE, dd:HOUSE_DEPTH_LAB,
  head:'Dutch Colonial: gambrel roof, long shed dormer, stone end chimney',
  desc:'Clapboard Dutch Colonial under a flared gambrel: a long shed dormer with three windows across the lower slope, a fanlit door under a small hood, shutters, a fieldstone chimney up the seen end and a clipped hedge.',
  tags:['single','dutch colonial','gambrel','dormer','chimney'],
  yardFence:{ style:'hedge', h:24, col:'#5c8a4c' },
  door:[230, -110],
  liv:[ { wall:'#efe0b0', trim:'#fbf8f0', roof:'#4a4e52', leaf:'#2e4d68', shut:'#3f5a4a', stone:'#a8a296' },
        { wall:'#c9d6da', trim:'#fbfaf6', roof:'#44403c', leaf:'#8a2f2f', shut:'#2e4d68', stone:'#9c978c' },
        { wall:'#e8c9c0', trim:'#fbf8f2', roof:'#474c4e', leaf:'#2f3a30', shut:'#6b3a3a', stone:'#aaa396' } ],
  vol:{
    foot:[[40,-110],[420,-110],[420,-500],[40,-500]], h:330,
    solids:[ { name:'chimney', poly:[[420,-320],[444,-320],[444,-290],[420,-290]], h:330 },
             { name:'hedge L', poly:[[6,-18],[195,-18],[195,-6],[6,-6]], h:26 },
             { name:'hedge R', poly:[[265,-18],[454,-18],[454,-6],[265,-6]], h:26 },
             { name:'bench', poly:[[70,-62],[116,-62],[116,-48],[70,-48]], h:24, prop:true },
             { name:'ac unit', poly:[[94,-528],[146,-528],[146,-500],[94,-500]], h:36, prop:true },
             { name:'bin', poly:[[382,-538],[418,-538],[418,-502],[382,-502]], h:52, prop:true } ],
    marks:{ door:[230,-110], mat:[230,-110+35.4] }
  },
  prof:[[-110,120],[-150,210],[-305,262],[-460,210],[-500,120]],
  yard(c){
    houseLawn(0, 460, -110, 0, '#7fa35a');
    T(195, 265, -110, 0, 0.6, '#b0654a');
    for(let b = -104; b < 0; b += 9) poly([P(195,b,0.7), P(265,b,0.7)], null, '#8f5038', 1);
  },
  chimney(c){
    box(420, 444, -320, -290, 0, 330, shade(c.stone,1.06), c.stone, shade(c.stone,.8));
    for(let z = 10; z < 330; z += 14) S(444.3, -320, -290, z, z+1.4, shade(c.stone,.74));
  },
  dormer(c){
    const zs = b => 120 + (-110 - b)*90/40, z0 = zs(-126);
    F(90, 370, z0, 200, c.wall, shade(c.wall,.6), 1, -126);
    const aS = FLANK_RIGHT ? 370 : 90;
    poly([P(aS,-126,z0), P(aS,-126,200), P(aS,-145.6,200)], shade(c.wall,.76), shade(c.wall,.6), 1);
    for(const [a0, a1] of [[110,160],[205,255],[300,350]]) houseWin(a0, a1, 166, 194, -126, c.trim, c.trim, 1, { plain:true });
    poly([P(84,-120,206), P(376,-120,206), P(376,-152,211), P(84,-152,211)], c.roof, shade(c.roof,.6), 1);
    F(84, 376, 200, 206, shade(c.roof,.7), null, 0, -120);
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    slab(188, 272, 110, 116, -88, -110, shade(c.roof,.85));
    for(const aa of [192, 268]) poly([P(aa,-109,100), P(aa,-89,110), P(aa,-109,110)], c.trim);
    for(const [a0, a1] of [[6, 195], [265, 454]]){
      box(a0, a1, -18, -6, 0, 24, '#5c8a4c', '#4f7a42', '#426a38');
      for(let a = a0 + 8; a < a1; a += 16) ball(a, -12, 24, 7, '#5c8a4c');
    }
    houseProp('bench', () => {
      box(70, 116, -62, -48, 16, 20, '#a8835c', '#96744f', '#836544');
      for(const aa of [74, 112]) box(aa-2, aa+2, -60, -50, 0, 16, '#6b5038', '#5a4230', '#4d3828');
    });
    if(!state.back) houseYardFence(this, this.liv[state.pal % this.liv.length], 'near');
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far');
    houseMass(40, 420, -110, -500, 120, c.wall, 1);
    for(let z = 12; z < 118; z += 7) poly([P(40,-110.2,z), P(420,-110.2,z)], null, shade(c.wall,.86), 1);
    houseSideWins(40, 420, -110, -500, [[36,96]], c.trim);
    const dh = houseDoorDims(HOUSE_SC).h, fan = [];
    for(let k = 0; k <= 10; k++){ const t = Math.PI*k/10; fan.push(P(230 + 30*Math.cos(t), -109.6, dh + 8 + 14*Math.sin(t))); }
    poly(fan, '#34424b', c.trim, 2);
    houseDoorway(230, -110, HOUSE_SC, c.trim, c.leaf, 1);
    houseWin(80, 140, 30, 96, -110, c.trim, c.trim, 1, { shutter:c.shut });
    houseWin(320, 380, 30, 96, -110, c.trim, c.trim, 1, { shutter:c.shut });
    houseProfileRoof(40, 420, this.prof, 12, c.roof, c.wall);
    this.dormer(c);
    this.chimney(c);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far'); this.fore(p); this.chimney(c);
    houseMass(40, 420, -110, -500, 120, c.wall, -1);
    for(let z = 12; z < 118; z += 7) poly([P(40,-500.2,z), P(420,-500.2,z)], null, shade(c.wall,.82), 1);
    houseSideWins(40, 420, -110, -500, [[36,96]], c.trim);
    houseWin(80, 140, 34, 96, -500, c.trim, c.trim, -1);
    rearDoor(300, c.wall, c.leaf, 500, 92);
    houseProfileRoof(40, 420, this.prof, 12, c.roof, c.wall);
    houseProp('ac unit', () => acUnit(120, 0, 500));
    houseProp('bin', () => wheelieBin(400, '#3f6b4a', -12, 500));
    houseYardFence(this, c, 'near');
  }
},
/* ------------------------------------------------------------------ 15 */
{
  name:'Maple Split-Level', hood:'The Flats', tier:'double', sc:HOUSE_SC, ww:HOUSE_DOUBLE, dd:HOUSE_DEPTH_LAB,
  head:'Split-level: two-storey garage wing beside a low entry wing',
  desc:'Sixties split-level: a two-storey wing with brick below and siding above over a two-car garage, stepped down to a single-storey entry wing set further back with a picture window; driveway with a basketball hoop, shrubs and a lamp.',
  tags:['double','split-level','garage','mid-century'],
  door:[560, -120],
  liv:[ { brick:'#b0684e', wall:'#d9d2c0', trim:'#fbf8f0', roof:'#56504a', leaf:'#8a3a30', gar:'#efe9dc' },
        { brick:'#9c7a5a', wall:'#c8d4cc', trim:'#fbfbf6', roof:'#4a4e52', leaf:'#2e4d68', gar:'#eef0ea' },
        { brick:'#a55a4a', wall:'#e6dcc4', trim:'#fffaf0', roof:'#5e4a3e', leaf:'#3f6b4a', gar:'#f4ecdc' } ],
  vol:{
    foot:[[30,-90],[400,-90],[400,-120],[780,-120],[780,-480],[30,-480]], h:290,
    solids:[ { name:'shrubs', poly:[[610,-134],[762,-134],[762,-120],[610,-120]], h:24 },
             { name:'lamp', c:[660,-40], r:6, h:84, prop:true },
             { name:'hoop', c:[22,-30], r:6, h:160, prop:true },
             { name:'ac unit', poly:[[94,-508],[146,-508],[146,-480],[94,-480]], h:36, prop:true },
             { name:'bin', poly:[[682,-530],[718,-530],[718,-494],[682,-494]], h:52, prop:true } ],
    marks:{ door:[560,-120], mat:[560,-120+35.4] }
  },
  profL:[[-90,220],[-285,290],[-480,220]],
  profR:[[-120,124],[-300,190],[-480,124]],
  yard(c){
    houseLawn(300, 809.6, -120, 0, '#86a85e');
    houseLawn(0, 60, -90, 0, '#86a85e');
    T(60, 300, -90, 0, 0.6, '#bdb8ae');
    poly([P(180,-90,0.7), P(180,0,0.7)], null, '#a29d93', 1);
    T(525, 595, -120, 0, 0.7, '#d4cdbd');
  },
  left(c, d){
    houseMass(30, 400, -90, -480, 220, c.brick, d);
    const face = d > 0 ? -90 : -480;
    houseBrick(30, 400, 0, 110, face + 0.2*d, c.brick, d);
    F(30, 400, 110, 220, c.wall, null, 0, face + 0.2*d);
    for(let z = 118; z < 218; z += 8) poly([P(30,face+0.3*d,z), P(400,face+0.3*d,z)], null, shade(c.wall,.88), 1);
    houseSideWins(30, 400, -90, -480, [[140,200]], c.trim);
    if(d > 0){
      F(60, 300, 0, 86, c.gar, shade(c.gar,.7), 1.2, -89.6);
      for(let z = 17; z < 86; z += 17) F(60, 300, z-1.2, z, shade(c.gar,.82), null, 0, -89.4);
      F(179, 181, 0, 86, shade(c.gar,.7), null, 0, -89.3);
      for(const [a0, a1] of [[80,160],[175,255],[270,350]]) houseWin(a0, a1, 136, 196, -90, c.trim, c.trim, 1);
    } else {
      for(const [a0, a1] of [[80,160],[270,350]]) houseWin(a0, a1, 136, 196, -480, c.trim, c.trim, -1);
      houseWin(100, 160, 40, 96, -480, c.trim, c.trim, -1);
    }
    houseProfileRoof(30, 400, this.profL, 12, c.roof, c.wall);
  },
  right(c, d){
    houseMass(400, 780, -120, -480, 124, c.wall, d);
    const face = d > 0 ? -120 : -480;
    for(let z = 12; z < 122; z += 8) poly([P(400,face+0.3*d,z), P(780,face+0.3*d,z)], null, shade(c.wall,.88), 1);
    houseSideWins(400, 780, -120, -480, [[40,96]], c.trim);
    if(d > 0){
      houseDoorway(560, -120, HOUSE_SC, c.trim, c.leaf, 1);
      houseWin(620, 760, 34, 100, -120, c.trim, c.trim, 1);
      houseWin(430, 480, 40, 96, -120, c.trim, c.trim, 1);
    } else {
      houseWin(640, 720, 40, 96, -480, c.trim, c.trim, -1);
      rearDoor(520, c.wall, c.leaf, 480, 92);
    }
    houseProfileRoof(400, 780, this.profR, 12, c.roof, c.wall, { lo:false });
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    for(let a = 618; a < 760; a += 14) ball(a, -127, 12, 10, a % 28 ? '#4f7a4a' : '#5c8a56');
    houseProp('lamp', () => { cyl(660, -40, 0, 70, 2.5, '#2a2a2e'); box(654, 666, -46, -34, 70, 84, '#3a3a3e', 'rgba(250,230,160,.85)', 'rgba(230,205,140,.85)'); });
    houseProp('hoop', () => {
      cyl(22, -30, 0, 150, 2.5, '#5a5a60');
      box(24, 28, -48, -12, 128, 160, '#f7f7f4', '#e8e8e4', '#d0d0cc');
      plateCircle(40, -30, 134, 9, 'rgba(0,0,0,0)', '#e0602a', 2);
    });
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.left(c, 1);
    this.right(c, 1);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); this.fore(p);
    this.right(c, -1);
    this.left(c, -1);
    houseProp('ac unit', () => acUnit(120, 0, 480));
    houseProp('bin', () => wheelieBin(700, '#3f6b4a', 0, 480));
  }
},
/* ------------------------------------------------------------------ 16 */
{
  name:'Oakpark Prairie', hood:'The Flats', tier:'double', sc:HOUSE_SC, ww:HOUSE_DOUBLE, dd:HOUSE_DEPTH_LAB,
  head:'Prairie style: stacked low hips, deep eaves, ribbon windows, urns',
  desc:'Wright-flavoured Prairie house: a long ground floor and a narrower upper floor, each under a low hip with a deep overhang, dark timber bands, ribbon windows, a broad low chimney, a low garden wall and two planter urns flanking the walk.',
  tags:['double','prairie','hip','deep eaves'],
  yardFence:{ style:'wall', h:22, col:'wall', cap:'wood' },
  door:[405, -120],
  liv:[ { wall:'#e2d2b0', wood:'#5a4030', roof:'#4e5a52', leaf:'#5a4030', urn:'#a89a80' },
        { wall:'#d8c7a8', wood:'#3f4a3e', roof:'#5a4a3e', leaf:'#3f4a3e', urn:'#9c9280' },
        { wall:'#e8dcc4', wood:'#6b3a2a', roof:'#44525a', leaf:'#6b3a2a', urn:'#b0a088' } ],
  vol:{
    foot:[[50,-120],[760,-120],[760,-470],[50,-470]], h:280,
    solids:[ { name:'wall L', poly:[[8,-14],[360,-14],[360,-4],[8,-4]], h:26 },
             { name:'wall R', poly:[[450,-14],[802,-14],[802,-4],[450,-4]], h:26 },
             { name:'urn L', c:[300,-44], r:14, h:40, prop:true },
             { name:'urn R', c:[510,-44], r:14, h:40, prop:true },
             { name:'ac unit', poly:[[94,-498],[146,-498],[146,-470],[94,-470]], h:36, prop:true },
             { name:'bin', poly:[[682,-520],[718,-520],[718,-484],[682,-484]], h:52, prop:true } ],
    marks:{ door:[405,-120], mat:[405,-120+35.4] }
  },
  yard(c){
    houseLawn(0, 809.6, -120, 0, '#7fa35a');
    T(370, 440, -120, 0, 0.6, '#cfc6b0');
  },
  lower(c, d){
    houseMass(50, 760, -120, -470, 110, c.wall, d);
    const face = d > 0 ? -120 : -470;
    F(50, 760, 0, 12, c.wood, null, 0, face + 0.4*d);
    F(50, 760, 96, 104, c.wood, null, 0, face + 0.4*d);
    houseSideWins(50, 760, -120, -470, [[40,90]], c.wood, { plain:true, w:50 });
    if(d > 0){
      for(const a0 of [90, 145, 200, 255, 510, 565, 620, 675]) houseWin(a0, a0+48, 40, 90, -120, c.wood, c.wood, 1, { plain:true });
      houseDoorway(405, -120, HOUSE_SC, c.wood, c.leaf, 1);
    } else {
      for(const a0 of [100, 155, 560, 615]) houseWin(a0, a0+48, 40, 90, -470, c.wood, c.wood, -1, { plain:true });
      rearDoor(400, c.wall, c.leaf, 470, 92);
    }
  },
  roofs(c, d){
    houseHip(50, 760, -120, -470, 110, 150, 40, c.roof);
    houseMass(220, 590, -170, -420, 210, c.wall, d, 121);
    const face = d > 0 ? -170 : -420;
    F(220, 590, 196, 204, c.wood, null, 0, face + 0.4*d);
    F(220, 590, 138, 144, c.wood, null, 0, face + 0.4*d);
    for(const a0 of [250, 310, 370, 430, 490]) houseWin(a0, a0+54, 150, 192, face, c.wood, c.wood, d, { plain:true });
    houseSideWins(220, 590, -170, -420, [[150,192]], c.wood, { plain:true, w:50 });
    houseHip(220, 590, -170, -420, 210, 245, 34, c.roof);
    if(state.roof) box(380, 430, -310, -280, 225, 275, '#9c6a52', '#8a5a44', '#744a38');
  },
  gwall(c){
    for(const [a0, a1] of [[8, 360], [450, 802]]){
      box(a0, a1, -14, -4, 0, 22, shade(c.wall,1.02), c.wall, shade(c.wall,.8));
      box(a0-1, a1+1, -15, -3, 22, 26, c.wood, shade(c.wood,.9), shade(c.wood,.75));
    }
  },
  urns(c){
    for(const [nm, aa] of [['urn L', 300], ['urn R', 510]])
      houseProp(nm, () => { cyl(aa, -44, 0, 10, 7, shade(c.urn,.85)); cyl(aa, -44, 10, 30, 14, c.urn, shade(c.urn,1.1)); ball(aa, -44, 34, 12, '#5c8a56'); });
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    this.roofs(c, 1); this.gwall(c); this.urns(c);
    if(!state.back) houseYardFence(this, this.liv[state.pal % this.liv.length], 'near');
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far');
    this.lower(c, 1);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far'); this.gwall(c); this.urns(c);
    this.lower(c, -1);
    this.roofs(c, -1);
    houseProp('ac unit', () => acUnit(120, 0, 470));
    houseProp('bin', () => wheelieBin(700, '#3f6b4a', 0, 470));
    houseYardFence(this, c, 'near');
  }
},
/* ------------------------------------------------------------------ 17 */
{
  name:'Streamline Moderne', hood:'The Flats', tier:'single', sc:HOUSE_SC, ww:HOUSE_SINGLE, dd:HOUSE_DEPTH_LAB,
  head:'Streamline Moderne: rounded glass corner, speed lines, porthole',
  desc:'Thirties Moderne: a flat-roofed two-storey block whose street corner curves in six facets of wraparound glass, three speed lines round the top, a porthole, a glass-block panel by the door under a thin canopy, terrazzo walk and a palm.',
  tags:['single','moderne','art deco','flat roof','curved corner'],
  door:[150, -110],
  liv:[ { wall:'#f4efe4', band:'#2f8f8a', leaf:'#2f8f8a', coping:'#e6dfd0' },
        { wall:'#f6e6e0', band:'#d97a8a', leaf:'#d97a8a', coping:'#eadbd4' },
        { wall:'#eef0ec', band:'#3a5a8a', leaf:'#3a5a8a', coping:'#dde0dc' } ],
  vol:{
    foot:MODERNE_FOOT, h:238,
    solids:[ { name:'palm', c:[400,-40], r:7, h:190, prop:true },
             { name:'ac unit', poly:[[274,-528],[326,-528],[326,-500],[274,-500]], h:36, prop:true } ],
    marks:{ door:[150,-110], mat:[150,-110+35.4] }
  },
  yard(c){
    houseLawn(0, 460, -110, 0, '#86a85e');
    T(115, 185, -110, 0, 0.6, '#e6e0d4');
    for(let b = -100; b < 0; b += 20) poly([P(115,b,0.7), P(185,b,0.7)], null, c.band, 1.2);
  },
  body(c){
    const seen = housePrism(MODERNE_FOOT, 0, 230, c.wall, { top:false });
    for(const f of seen){
      const arc = Math.abs(f.na) > 0.05 && Math.abs(f.nb) > 0.05;
      for(const z of [108, 116, 124]) houseFaceWin(f, 0, 1, z, z+4, c.band, { band:true });
      if(arc){ houseFaceWin(f, 0.03, 0.97, 146, 200, '#2a2a2e', { plain:true }); houseFaceWin(f, 0.03, 0.97, 36, 92, '#2a2a2e', { plain:true }); }
      else if(Math.abs(f.na) > 0.9) for(const [t0, t1] of [[0.12,0.3],[0.45,0.63],[0.78,0.94]]){
        houseFaceWin(f, t0, t1, 146, 200, '#2a2a2e', { plain:true });
        houseFaceWin(f, t0, t1, 40, 94, '#2a2a2e', { plain:true });
      }
    }
    housePrism(MODERNE_FOOT, 230, 238, c.coping);
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    box(96, 214, -110, -66, 112, 118, c.coping, shade(c.coping,.9), shade(c.coping,.78));
    F(96, 214, 112, 114, c.band, null, 0, -65.6);
    houseProp('palm', () => housePalm(400, -40, 180, '#5f8f4f'));
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.body(c);
    houseDoorway(150, -110, HOUSE_SC, shade(c.wall,.88), c.leaf, 1);
    if(HOUSE_REC) HOUSE_REC.push({ kind:'win', a0:200, a1:244, z0:10, z1:100, b:-110 });
    F(200, 244, 10, 100, '#cfe2e6', '#9fb8be', 1, -109.6);
    for(let a = 211; a < 244; a += 11) F(a-0.6, a+0.6, 10, 100, '#9fb8be', null, 0, -109.4);
    for(let z = 21; z < 100; z += 11) F(200, 244, z-0.6, z+0.6, '#9fb8be', null, 0, -109.4);
    faceCircle(300, -109.5, 168, 20, c.band);
    faceCircle(300, -109.3, 168, 15, '#34424b');
    faceCircle(296, -109.1, 172, 7, 'rgba(170,205,220,.35)');
    houseWin(40 + 20, 150, 146, 200, -110, '#2a2a2e', '#2a2a2e', 1, { plain:true });
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); this.fore(p);
    this.body(c);
    houseWin(80, 160, 146, 200, -500, '#2a2a2e', '#2a2a2e', -1, { plain:true });
    houseWin(260, 340, 146, 200, -500, '#2a2a2e', '#2a2a2e', -1, { plain:true });
    houseWin(80, 140, 40, 94, -500, '#2a2a2e', '#2a2a2e', -1, { plain:true });
    rearDoor(200, c.wall, c.leaf, 500, 92);
    houseProp('ac unit', () => acUnit(300, 0, 500));
  }
},
/* ------------------------------------------------------------------ 18 */
{
  name:'Timber Ridge Log Cabin', hood:'The Flats', tier:'single', sc:HOUSE_SC, ww:HOUSE_SINGLE, dd:HOUSE_DEPTH_LAB,
  head:'Log cabin: round-log walls, green metal roof, stone chimney, porch',
  desc:'Round-log cabin with the log ends proud of the corners, a steep green standing-seam roof, a fieldstone chimney up the seen end, a full-width porch on log posts with a rocker, and a chopping stump in the yard.',
  tags:['single','log cabin','porch','metal roof','chimney'],
  door:[230, -130],
  liv:[ { log:'#8a6440', roof:'#3f5a44', trim:'#e8dcc4', leaf:'#5a3a28', stone:'#9c968a' },
        { log:'#a07a50', roof:'#6b3a30', trim:'#efe4cc', leaf:'#2f4a3a', stone:'#a8a296' },
        { log:'#6f5238', roof:'#454b52', trim:'#e0d4bc', leaf:'#7a2e2a', stone:'#8f8a80' } ],
  vol:{
    foot:[[50,-130],[410,-130],[410,-480],[50,-480]], h:300,
    solids:[ { name:'chimney', poly:[[410,-320],[440,-320],[440,-280],[410,-280]], h:300 },
             { name:'post 1', c:[60,-72], r:5, h:108 }, { name:'post 2', c:[176,-72], r:5, h:108 },
             { name:'post 3', c:[284,-72], r:5, h:108 }, { name:'post 4', c:[400,-72], r:5, h:108 },
             { name:'rocker', c:[110,-100], r:14, h:48, prop:true },
             { name:'stump', c:[40,-36], r:12, h:30, prop:true },
             { name:'woodpile', poly:[[150,-512],[230,-512],[230,-484],[150,-484]], h:28, prop:true },
             { name:'barrel', c:[90,-500], r:12, h:36, prop:true } ],
    marks:{ door:[230,-130], mat:[230,-130+35.4] }
  },
  prof:[[-130,116],[-305,256],[-480,116]],
  yard(c){
    houseLawn(0, 460, -130, 0, '#7a9a56');
    for(let b = -58; b < -4; b += 16) T(206, 254, b, b+10, 0.7, '#a8a296');
    T(50, 410, -130, -66, 3, '#8a6a48');
    F(50, 410, 0, 3, '#6a5038', null, 0, -66);
  },
  chimney(c){
    box(410, 440, -320, -280, 0, 300, shade(c.stone,1.06), c.stone, shade(c.stone,.8));
    for(let z = 10; z < 300; z += 13) S(440.3, -320, -280, z, z+1.6, shade(c.stone,.72));
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    for(const aa of [60, 176, 284, 400]) cyl(aa, -72, 3, 108, 5, c.log, shade(c.log,1.1));
    houseProfileRoof(50, 410, [[-66,104],[-130,124]], 8, c.roof, c.log, { seams:14, ext1:false, gable:shade(c.log,.8) });
    houseProp('rocker', () => houseRocker(110, -100, shade(c.log,.9)));
    houseProp('stump', () => { cyl(40, -36, 0, 22, 12, '#7a5a3c', '#c9a878'); poly([P(38,-36,22), P(48,-36,40), P(52,-36,38), P(42,-36,22)], '#4a4a4e'); });
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    houseMass(50, 410, -130, -480, 116, c.log, 1);
    houseLogs(50, 410, 0, 116, -130, c.log, 1);
    houseEndLogs(50, 410, -130, -480, 0, 116, c.log);
    houseSideWins(50, 410, -130, -480, [[36,90]], c.trim);
    houseDoorway(230, -130, HOUSE_SC, c.trim, c.leaf, 1);
    houseWin(90, 150, 34, 92, -130, c.trim, c.trim, 1);
    houseWin(310, 370, 34, 92, -130, c.trim, c.trim, 1);
    houseProfileRoof(50, 410, this.prof, 16, c.roof, c.log, { seams:16, gable:shade(c.log,.85) });
    this.chimney(c);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); this.fore(p); this.chimney(c);
    houseMass(50, 410, -130, -480, 116, c.log, -1);
    houseLogs(50, 410, 0, 116, -480, c.log, -1);
    houseEndLogs(50, 410, -130, -480, 0, 116, c.log);
    houseSideWins(50, 410, -130, -480, [[36,90]], c.trim);
    houseWin(260, 310, 40, 92, -480, c.trim, c.trim, -1);
    rearDoor(360, c.log, c.leaf, 480, 92);
    houseProfileRoof(50, 410, this.prof, 16, c.roof, c.log, { seams:16, gable:shade(c.log,.85) });
    houseProp('woodpile', () => {
      box(150, 230, -512, -484, 0, 28, '#8a6848', '#7a5a3c', '#6a4e34');
      for(let a = 156; a < 228; a += 10) for(const z of [7, 20]) faceCircle(a, -512.4, z, 5, '#c9a878', '#7a5a3c', 1);
    });
    houseProp('barrel', () => { cyl(90, -500, 0, 36, 12, '#7a5a3c', '#5a8aa0'); for(const z of [8, 28]) cyl(90, -500, z, z+2, 12.4, '#4a4a4e'); });
  }
},
/* ------------------------------------------------------------------ 19 */
{
  name:'Cranberry Saltbox', hood:'The Flats', tier:'single', sc:HOUSE_SC, ww:HOUSE_SINGLE, dd:HOUSE_DEPTH_LAB,
  head:'Saltbox: two storeys in front, one behind, a long catslide roof',
  desc:'New England saltbox in cranberry clapboard: two storeys on the street, the roof running long and low to a single storey at the back, a big centre chimney, a pedimented door between pilasters, and a fieldstone wall.',
  tags:['single','saltbox','colonial','chimney'],
  yardFence:{ style:'wall', h:22, col:'#b3ada2', stones:true },
  door:[230, -110],
  liv:[ { wall:'#9c3b34', trim:'#f4ecdc', roof:'#4a4642', leaf:'#2f3a30', stone:'#b3ada2' },
        { wall:'#5a6f7a', trim:'#f4efe4', roof:'#44403c', leaf:'#8a3a30', stone:'#a8a296' },
        { wall:'#c8b89a', trim:'#fbf6ea', roof:'#4e4a44', leaf:'#2e4d68', stone:'#b8b2a6' } ],
  vol:{
    foot:[[50,-110],[410,-110],[410,-500],[50,-500]], h:350,
    solids:[ { name:'wall L', poly:[[6,-12],[195,-12],[195,-2],[6,-2]], h:22 },
             { name:'wall R', poly:[[265,-12],[454,-12],[454,-2],[265,-2]], h:22 },
             { name:'lantern', c:[330,-34], r:6, h:84, prop:true },
             { name:'ac unit', poly:[[94,-528],[146,-528],[146,-500],[94,-500]], h:36, prop:true },
             { name:'woodpile', poly:[[300,-528],[380,-528],[380,-504],[300,-504]], h:26, prop:true } ],
    marks:{ door:[230,-110], mat:[230,-110+35.4] }
  },
  prof:[[-110,220],[-200,300],[-500,110]],
  yard(c){
    houseLawn(0, 460, -110, 0, '#7fa35a');
    T(195, 265, -110, 0, 0.6, '#b0654a');
    for(let b = -104; b < 0; b += 9) poly([P(195,b,0.7), P(265,b,0.7)], null, '#8f5038', 1);
  },
  upper(c){
    for(let z = 116; z < 214; z += 7) poly([P(50,-110.2,z), P(410,-110.2,z)], null, shade(c.wall,.84), 1);
    for(const [a0, a1] of [[80,130],[205,255],[330,380]]) houseWin(a0, a1, 140, 196, -110, c.trim, c.trim, 1);
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    houseFrontGable(186, 274, -96, -110, 102, 122, 4, c.roof, c.trim, 1, { back0:true, barge:c.trim });
    for(const [a0, a1] of [[6, 195], [265, 454]]){
      box(a0, a1, -12, -2, 0, 22, '#b3ada2', '#a19b90', '#8a857b');
      for(let a = a0 + 6; a < a1; a += 13) F(a, a+8, 4 + (a % 3)*3, 11 + (a % 3)*3, '#8f897e', null, 0, -1.6);
    }
    houseProp('lantern', () => { cyl(330, -34, 0, 70, 2.5, '#2a2a2e'); box(324, 336, -40, -28, 70, 84, '#2a2a2e', 'rgba(250,220,150,.85)', 'rgba(225,195,130,.85)'); });
    if(!state.back) houseYardFence(this, this.liv[state.pal % this.liv.length], 'near');
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far');
    houseMass(50, 410, -110, -500, 110, c.wall, 1);
    for(let z = 12; z < 110; z += 7) poly([P(50,-110.2,z), P(410,-110.2,z)], null, shade(c.wall,.84), 1);
    houseSideWins(50, 410, -110, -500, [[34,90]], c.trim);
    F(180, 186, 0, 102, c.trim, null, 0, -109.6); F(274, 280, 0, 102, c.trim, null, 0, -109.6);
    houseDoorway(230, -110, HOUSE_SC, c.trim, c.leaf, 1);
    houseWin(80, 130, 34, 94, -110, c.trim, c.trim, 1);
    houseWin(330, 380, 34, 94, -110, c.trim, c.trim, 1);
    houseProfileRoof(50, 410, this.prof, 12, c.roof, c.wall, { onFront: () => this.upper(c) });
    houseSideWins(50, 410, -110, -500, [[140,196]], c.trim, { skipBack:300 });
    if(state.roof) box(215, 245, -215, -185, 280, 350, '#a8604a', '#8f513e', '#7a4535');
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far'); this.fore(p);
    houseMass(50, 410, -110, -500, 110, c.wall, -1);
    for(let z = 12; z < 110; z += 7) poly([P(50,-500.2,z), P(410,-500.2,z)], null, shade(c.wall,.8), 1);
    houseSideWins(50, 410, -110, -500, [[34,90]], c.trim);
    houseWin(80, 130, 36, 90, -500, c.trim, c.trim, -1);
    houseWin(320, 370, 36, 90, -500, c.trim, c.trim, -1);
    rearDoor(230, c.wall, c.leaf, 500, 92);
    houseProfileRoof(50, 410, this.prof, 12, c.roof, c.wall);
    houseSideWins(50, 410, -110, -500, [[140,196]], c.trim, { skipBack:300 });
    if(state.roof) box(215, 245, -215, -185, 280, 350, '#a8604a', '#8f513e', '#7a4535');
    houseProp('ac unit', () => acUnit(120, 0, 500));
    houseProp('woodpile', () => {
      box(300, 380, -528, -504, 0, 26, '#8a6848', '#7a5a3c', '#6a4e34');
      for(let a = 306; a < 378; a += 10) for(const z of [7, 19]) faceCircle(a, -528.4, z, 4.6, '#c9a878', '#7a5a3c', 1);
    });
    houseYardFence(this, c, 'near');
  }
},
/* ------------------------------------------------------------------ 20 */
{
  name:'Beacon Hill Georgian', hood:'The Flats', tier:'double', sc:HOUSE_SC, ww:HOUSE_DOUBLE, dd:HOUSE_DEPTH_LAB,
  head:'Georgian: symmetrical brick, hip roof, dormers, columned portico',
  desc:'Five-bay Georgian in red brick with white quoins and a belt course, a hipped roof with three dormers and twin chimneys, a fanlit door under a columned, pedimented portico, topiaries, and iron railings on brick piers.',
  tags:['double','georgian','brick','portico','dormers'],
  yardFence:{ style:'iron', h:34, col:'iron', pier:'brick' },
  door:[405, -120],
  liv:[ { brick:'#9c4a3a', trim:'#f7f4ec', roof:'#3e4448', leaf:'#1f2a24', iron:'#1f1f22' },
        { brick:'#b0664e', trim:'#fbf8f0', roof:'#44403c', leaf:'#2e3a5a', iron:'#222226' },
        { brick:'#8a5444', trim:'#f5f2ea', roof:'#3a4046', leaf:'#5a1f24', iron:'#1f1f22' } ],
  vol:{
    foot:[[60,-120],[750,-120],[750,-480],[60,-480]], h:380,
    solids:[ { name:'column L', c:[362,-84], r:7, h:124 },
             { name:'column R', c:[448,-84], r:7, h:124 },
             { name:'fence L', poly:[[6,-10],[365,-10],[365,-2],[6,-2]], h:40 },
             { name:'fence R', poly:[[445,-10],[804,-10],[804,-2],[445,-2]], h:40 },
             { name:'topiary L', c:[318,-100], r:13, h:56, prop:true },
             { name:'topiary R', c:[492,-100], r:13, h:56, prop:true },
             { name:'ac unit', poly:[[94,-508],[146,-508],[146,-480],[94,-480]], h:36, prop:true },
             { name:'bin', poly:[[682,-530],[718,-530],[718,-494],[682,-494]], h:52, prop:true } ],
    marks:{ door:[405,-120], mat:[405,-120+35.4] }
  },
  slope:{ bf:-120, He:240, k:80/180 },
  yard(c){
    houseLawn(0, 809.6, -120, 0, '#7a9e58');
    T(370, 440, -76, 0, 0.6, '#b0654a');
    for(let b = -70; b < 0; b += 9) poly([P(370,b,0.7), P(440,b,0.7)], null, '#8f5038', 1);
    T(346, 464, -120, -76, 2, '#d8d2c4');
  },
  facade(c){
    houseBrick(60, 750, 0, 240, -120, c.brick);
    for(let z = 0, k = 0; z < 240; z += 16, k++){
      F(60, 60 + (k % 2 ? 14 : 24), z+1, z+15, c.trim, null, 0, -119.6);
      F(750 - (k % 2 ? 14 : 24), 750, z+1, z+15, c.trim, null, 0, -119.6);
    }
    F(60, 750, 124, 130, c.trim, null, 0, -119.5);
    const dh = houseDoorDims(HOUSE_SC).h, fan = [], spokes = [];
    for(let k = 0; k <= 12; k++){ const t = Math.PI*k/12; fan.push(P(405 + 34*Math.cos(t), -119.5, dh + 8 + 20*Math.sin(t))); }
    poly(fan, '#34424b', c.trim, 2.5);
    for(let k = 1; k < 6; k++){ const t = Math.PI*k/6; poly([P(405,-119.3,dh+8), P(405 + 34*Math.cos(t), -119.3, dh + 8 + 20*Math.sin(t))], null, c.trim, 1.2); }
    houseDoorway(405, -120, HOUSE_SC, c.trim, c.leaf, 1);
    for(const [a0, a1] of [[120,180],[240,300],[510,570],[630,690]]){
      houseWin(a0, a1, 36, 110, -120, c.trim, c.trim, 1);
      F((a0+a1)/2 - 5, (a0+a1)/2 + 5, 114, 124, c.trim, null, 0, -119.4);
    }
    for(const [a0, a1] of [[120,180],[240,300],[375,435],[510,570],[630,690]]) houseWin(a0, a1, 150, 220, -120, c.trim, c.trim, 1);
  },
  chimneys(){
    if(!state.roof) return;
    for(const a of [236, 544]){ box(a, a+30, -315, -285, 300, 380, '#a8604a', '#8f513e', '#7a4535'); box(a-3, a+33, -318, -282, 372, 380, '#b86a52', '#9c5a46', '#844c3c'); }
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    for(const aa of [362, 448]){ cyl(aa, -84, 2, 114, 6, c.trim, shade(c.trim,1.02)); cyl(aa, -84, 110, 114, 8, shade(c.trim,.95)); }
    box(346, 464, -90, -76, 114, 124, c.trim, shade(c.trim,.92), shade(c.trim,.8));
    houseFrontGable(346, 464, -76, -120, 124, 150, 4, c.roof, c.trim, 1, { back0:true, barge:c.trim });
    for(const [a0, a1] of [[6, 365], [445, 804]]){
      F(a0, a1, 30, 33, c.iron, null, 0, -6); F(a0, a1, 8, 10, c.iron, null, 0, -6);
      for(let a = a0 + 3; a < a1; a += 7) poly([P(a,-6,0), P(a+1.6,-6,0), P(a+1.6,-6,34), P(a+0.8,-6,38), P(a,-6,34)], c.iron);
      for(let a = a0 + 6; a < a1; a += 118) box(a-6, a+6, -12, 0, 0, 44, shade(c.brick,1.08), c.brick, shade(c.brick,.8));
      box(a1-12, a1, -12, 0, 0, 44, shade(c.brick,1.08), c.brick, shade(c.brick,.8));
    }
    for(const [nm, aa] of [['topiary L', 318], ['topiary R', 492]])
      houseProp(nm, () => { cyl(aa, -100, 0, 18, 11, '#3a3a3e', '#4a4a50'); ball(aa, -100, 32, 13, '#3f6b3e'); ball(aa, -100, 50, 7, '#4a7a48'); });
    if(!state.back) houseYardFence(this, this.liv[state.pal % this.liv.length], 'near');
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far');
    houseMass(60, 750, -120, -480, 240, c.brick, 1);
    this.facade(c);
    houseSideWins(60, 750, -120, -480, [[40,110],[150,220]], c.trim);
    houseHip(60, 750, -120, -480, 240, 320, 10, c.roof);
    for(const a0 of [220, 380, 540]) houseDormer(a0, a0 + 50, -150, 290, 305, this.slope, c.trim, c.roof, c.trim);
    this.chimneys();
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far'); this.fore(p);
    houseMass(60, 750, -120, -480, 240, c.brick, -1);
    houseBrick(60, 750, 0, 240, -480, c.brick, -1);
    F(60, 750, 124, 130, c.trim, null, 0, -480.5);
    houseSideWins(60, 750, -120, -480, [[40,110],[150,220]], c.trim);
    for(const [a0, a1] of [[120,180],[240,300],[510,570],[630,690]]) houseWin(a0, a1, 150, 220, -480, c.trim, c.trim, -1);
    houseWin(120, 180, 40, 110, -480, c.trim, c.trim, -1);
    houseWin(630, 690, 40, 110, -480, c.trim, c.trim, -1);
    rearDoor(405, c.brick, c.leaf, 480, 92);
    houseHip(60, 750, -120, -480, 240, 320, 10, c.roof);
    this.chimneys();
    houseProp('ac unit', () => acUnit(120, 0, 480));
    houseProp('bin', () => wheelieBin(700, '#3f6b4a', 0, 480));
    houseYardFence(this, c, 'near');
  }
},
/* ------------------------------------------------------------------ 21 */
{
  name:'Marigny Creole Cottage', hood:'The Flats', tier:'single', sc:HOUSE_SC, ww:HOUSE_SINGLE, dd:HOUSE_DEPTH_LAB,
  head:'Creole cottage: steep side gable run out over a front gallery, four shuttered openings',
  desc:'Low pastel Creole cottage whose steep roof carries straight on over a full-width front gallery on slender posts; four tall shuttered openings across the front (one is the door), a low iron fence and a gas lamp.',
  tags:['single','creole','gallery','side gable'],
  yardFence:{ style:'iron', h:30, col:'#2a2a2e' },
  door:[180, -140],
  liv:[ { wall:'#c9b3d6', trim:'#f7f2e8', roof:'#4a4e52', leaf:'#3f6b4a', shut:'#3f6b4a', floor:'#8f8a80' },
        { wall:'#b9dcc8', trim:'#f7f4ec', roof:'#55504a', leaf:'#8a3a30', shut:'#2e4d68', floor:'#a0968a' },
        { wall:'#f0b9a0', trim:'#fbf6ee', roof:'#474c4e', leaf:'#2e4d68', shut:'#2f5a4a', floor:'#8a8478' } ],
  vol:{
    foot:[[30,-140],[430,-140],[430,-500],[30,-500]], h:300,
    solids:[ { name:'post 1', c:[36,-66], r:4, h:108 }, { name:'post 2', c:[130,-66], r:4, h:108 },
             { name:'post 3', c:[230,-66], r:4, h:108 }, { name:'post 4', c:[330,-66], r:4, h:108 },
             { name:'post 5', c:[424,-66], r:4, h:108 },
             { name:'fence L', poly:[[4,-9],[145,-9],[145,-1],[4,-1]], h:34 },
             { name:'fence R', poly:[[215,-9],[456,-9],[456,-1],[215,-1]], h:34 },
             { name:'pot L', c:[70,-110], r:11, h:34, prop:true },
             { name:'pot R', c:[300,-110], r:11, h:34, prop:true },
             { name:'lamp', c:[420,-30], r:6, h:96, prop:true },
             { name:'ac unit', poly:[[94,-528],[146,-528],[146,-500],[94,-500]], h:36, prop:true } ],
    marks:{ door:[180,-140], mat:[180,-140+35.4] }
  },
  prof:[[-60,108],[-300,300],[-500,130]],
  yard(c){
    houseLawn(0, 460, -60, 0, '#7fa35a');
    T(145, 215, -60, 0, 0.6, '#b8b0a0');
    T(30, 430, -140, -60, 3, c.floor);
    for(let a = 40; a < 430; a += 20) poly([P(a,-140,3.1), P(a,-60,3.1)], null, shade(c.floor,.84), 1);
    F(30, 430, 0, 3, shade(c.floor,.7), null, 0, -60);
  },
  ends(c){
    const g = a => [[a,-140,0],[a,-140,172],[a,-300,300],[a,-500,130],[a,-500,0]];
    const ctr = [230, -320, 100];
    houseFace(g(30), ctr, shade(c.wall,.78), shade(c.wall,.6));
    houseFace(g(430), ctr, shade(c.wall,.78), shade(c.wall,.6));
  },
  front(c){
    F(30, 430, 0, 172, c.wall, shade(c.wall,.6), 1, -140);
    for(let z = 12; z < 170; z += 8) poly([P(30,-139.8,z), P(430,-139.8,z)], null, shade(c.wall,.9), 1);
    for(const [a0, a1] of [[60,100],[260,300],[360,400]]) houseWin(a0, a1, 8, 100, -140, c.trim, c.trim, 1, { shutter:c.shut });
    for(const a of [131, 223]) F(a, a+11, 0, 100, c.shut, shade(c.shut,.7), 1, -139.6);
    houseDoorway(180, -140, HOUSE_SC, c.trim, c.leaf, 1);
    F(138, 222, 104, 118, 'rgba(170,205,220,.45)', c.trim, 1.5, -139.5);
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    for(const aa of [36, 130, 230, 330, 424]) box(aa-3, aa+3, -69, -63, 3, 108, c.trim, shade(c.trim,.9), shade(c.trim,.76));
    houseProfileRoof(30, 430, this.prof, 10, c.roof, c.wall, { noEnds:true });
    for(const [a0, a1] of [[4, 145], [215, 456]]){
      F(a0, a1, 26, 29, '#2a2a2e', null, 0, -5); F(a0, a1, 6, 8, '#2a2a2e', null, 0, -5);
      for(let a = a0 + 3; a < a1; a += 7) poly([P(a,-5,0), P(a+1.6,-5,0), P(a+1.6,-5,30), P(a+0.8,-5,34), P(a,-5,30)], '#2a2a2e');
    }
    for(const [nm, aa] of [['pot L', 70], ['pot R', 300]])
      houseProp(nm, () => { cyl(aa, -110, 3, 22, 11, '#b86a4a', shade('#b86a4a',1.15)); ball(aa, -110, 30, 12, '#4f8a4a'); });
    houseProp('lamp', () => { cyl(420, -30, 0, 84, 2.5, '#2a2a2e'); box(414, 426, -36, -24, 84, 98, '#3a3a3e', 'rgba(250,210,120,.85)', 'rgba(225,185,100,.85)'); });
    if(!state.back) houseYardFence(this, this.liv[state.pal % this.liv.length], 'near');
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far');
    this.front(c);
    this.ends(c);
    houseSideWins(30, 430, -140, -500, [[30,100]], c.trim, { skipFront:40 });
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far');
    this.front(c);
    this.fore(p);
    houseMass(30, 430, -140, -500, 130, c.wall, -1);
    for(let z = 12; z < 128; z += 8) poly([P(30,-500.2,z), P(430,-500.2,z)], null, shade(c.wall,.86), 1);
    this.ends(c);
    houseSideWins(30, 430, -140, -500, [[30,100]], c.trim, { skipFront:40 });
    houseWin(80, 130, 30, 100, -500, c.trim, c.trim, -1, { shutter:c.shut });
    houseWin(320, 370, 30, 100, -500, c.trim, c.trim, -1, { shutter:c.shut });
    rearDoor(230, c.wall, c.leaf, 500, 92);
    houseProfileRoof(30, 430, this.prof, 10, c.roof, c.wall, { noEnds:true });
    houseProp('ac unit', () => acUnit(120, 0, 500));
    houseYardFence(this, c, 'near');
  }
},
/* ------------------------------------------------------------------ 22 */
{
  name:'Lafayette Second Empire', hood:'The Flats', tier:'double', sc:HOUSE_SC, ww:HOUSE_DOUBLE, dd:HOUSE_DEPTH_LAB,
  head:'Second Empire: slate mansard, taller centre pavilion, bracketed cornice',
  desc:'Two storeys under a fish-scale slate mansard with box dormers, a bracketed cornice, tall hooded windows, and a projecting centre pavilion that rises into its own taller mansard with iron cresting; urns and iron railings out front.',
  tags:['double','second empire','mansard','pavilion'],
  yardFence:{ style:'iron', h:30, col:'iron' },
  door:[405, -100],
  liv:[ { wall:'#d8d0c0', trim:'#f5f0e6', roof:'#4e5058', leaf:'#3a2a22', iron:'#1f1f22', top:'#6a6c72' },
        { wall:'#c8bca8', trim:'#f2ece0', roof:'#5a4e58', leaf:'#2e3a30', iron:'#222226', top:'#76686e' },
        { wall:'#e2d6c6', trim:'#fbf6ee', roof:'#44525a', leaf:'#5a2a24', iron:'#1f1f22', top:'#5e6a70' } ],
  vol:{
    foot:[[50,-130],[330,-130],[330,-100],[480,-100],[480,-130],[760,-130],[760,-480],[50,-480]], h:390,
    solids:[ { name:'fence L', poly:[[6,-9],[365,-9],[365,-1],[6,-1]], h:36 },
             { name:'fence R', poly:[[445,-9],[804,-9],[804,-1],[445,-1]], h:36 },
             { name:'urn L', c:[300,-50], r:13, h:40, prop:true },
             { name:'urn R', c:[510,-50], r:13, h:40, prop:true },
             { name:'ac unit', poly:[[94,-508],[146,-508],[146,-480],[94,-480]], h:36, prop:true },
             { name:'bin', poly:[[682,-530],[718,-530],[718,-494],[682,-494]], h:52, prop:true } ],
    marks:{ door:[405,-100], mat:[405,-100+35.4] }
  },
  yard(c){
    houseLawn(0, 809.6, -130, 0, '#7a9e58');
    T(370, 440, -100, 0, 0.6, '#c9c1b0');
  },
  cornice(a0, a1, b, c){
    F(a0, a1, 222, 230, c.trim, shade(c.trim,.7), 1, b);
    for(let a = a0 + 8; a < a1 - 4; a += 20) F(a, a+5, 212, 222, c.trim, null, 0, b + 0.3);
  },
  hooded(a0, a1, z0, z1, b, c, d){
    houseWin(a0, a1, z0, z1, b, c.trim, c.trim, d);
    F(a0-8, a1+8, z1+6, z1+12, c.trim, shade(c.trim,.7), 1, b + 0.4*(d||1));
  },
  main(c, d){
    houseMass(50, 760, -130, -480, 230, c.wall, d);
    const face = d > 0 ? -130 : -480;
    this.cornice(50, 760, face + 0.4*d, c);
    houseSideWins(50, 760, -130, -480, [[36,116],[146,210]], c.trim);
    const cols = d > 0 ? [[100,150],[190,240],[570,620],[660,710]] : [[100,150],[190,240],[300,350],[460,510],[570,620],[660,710]];
    for(const [a0, a1] of cols){ this.hooded(a0, a1, 36, 116, face, c, d); this.hooded(a0, a1, 146, 206, face, c, d); }
    if(d < 0) rearDoor(405, c.wall, c.leaf, 480, 92);
    houseMansard(50, 760, -130, -480, 230, 320, 34, c.roof, c.top);
    const dz = d > 0 ? -150 : -460, dw = d > 0 ? -138 : -472;
    for(const a0 of [110, 200, 560, 650]){
      box(a0, a0 + 44, Math.min(dz, dw), Math.max(dz, dw), 244, 300, c.trim, shade(c.trim,.94), shade(c.trim,.8));
      houseWin(a0 + 8, a0 + 36, 254, 290, dw, c.trim, c.trim, d, { plain:true });
    }
  },
  pavilion(c){
    houseMass(330, 480, -100, -160, 230, c.wall, 1);
    this.cornice(330, 480, -99.6, c);
    houseDoorway(405, -100, HOUSE_SC, c.trim, c.leaf, 1);
    F(360, 450, 104, 110, c.trim, shade(c.trim,.7), 1, -99.5);
    this.hooded(380, 430, 146, 206, -100, c, 1);
    houseMansard(330, 480, -100, -160, 230, 370, 26, c.roof, c.top);
    box(386, 424, -120, -108, 262, 330, c.trim, shade(c.trim,.94), shade(c.trim,.8));
    houseWin(394, 416, 276, 318, -108, c.trim, c.trim, 1, { plain:true });
    if(state.roof) for(let a = 360; a <= 450; a += 10) F(a, a+1.5, 370, 384, c.iron, null, 0, -126);
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    for(const [a0, a1] of [[6, 365], [445, 804]]){
      F(a0, a1, 26, 29, c.iron, null, 0, -5); F(a0, a1, 6, 8, c.iron, null, 0, -5);
      for(let a = a0 + 3; a < a1; a += 7) poly([P(a,-5,0), P(a+1.6,-5,0), P(a+1.6,-5,30), P(a+0.8,-5,34), P(a,-5,30)], c.iron);
    }
    for(const [nm, aa] of [['urn L', 300], ['urn R', 510]])
      houseProp(nm, () => { cyl(aa, -50, 0, 10, 7, '#9c968a'); cyl(aa, -50, 10, 28, 13, '#b3ada2', '#c9c3b8'); ball(aa, -50, 32, 11, '#4f7a4a'); });
    if(!state.back) houseYardFence(this, this.liv[state.pal % this.liv.length], 'near');
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far');
    this.main(c, 1);
    this.pavilion(c);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far'); this.fore(p);
    this.pavilion(c);
    this.main(c, -1);
    houseProp('ac unit', () => acUnit(120, 0, 480));
    houseProp('bin', () => wheelieBin(700, '#3f6b4a', 0, 480));
    houseYardFence(this, c, 'near');
  }
},
/* ------------------------------------------------------------------ 23 */
{
  name:'Magnolia Greek Revival', hood:'The Flats', tier:'double', sc:HOUSE_SC, ww:HOUSE_DOUBLE, dd:HOUSE_DEPTH_LAB,
  head:'Greek Revival: full-height temple portico, four columns, pediment',
  desc:'White clapboard Greek Revival: a two-storey temple portico on four big columns with an entablature and a pediment carrying an oculus, a door with sidelights and transom, black shutters, end chimneys, two broad shade trees and boxwood hedges.',
  tags:['double','greek revival','portico','columns'],
  yardFence:{ style:'hedge', h:22, col:'#4f7a42' },
  door:[405, -170],
  liv:[ { wall:'#f4f1ea', trim:'#ffffff', roof:'#4a4e52', leaf:'#1f2a24', shut:'#1f2a24' },
        { wall:'#efe6d2', trim:'#fbf8f0', roof:'#55504a', leaf:'#2e3a5a', shut:'#2e3a5a' },
        { wall:'#e8ecec', trim:'#fbfbf8', roof:'#3e4448', leaf:'#5a1f24', shut:'#3f4a3e' } ],
  vol:{
    foot:[[60,-170],[750,-170],[750,-490],[60,-490]], h:380,
    solids:[ { name:'column 1', c:[250,-82], r:12, h:242 }, { name:'column 2', c:[350,-82], r:12, h:242 },
             { name:'column 3', c:[460,-82], r:12, h:242 }, { name:'column 4', c:[560,-82], r:12, h:242 },
             { name:'hedge L', poly:[[8,-20],[370,-20],[370,-8],[8,-8]], h:26 },
             { name:'hedge R', poly:[[440,-20],[802,-20],[802,-8],[440,-8]], h:26 },
             { name:'tree L', c:[110,-70], r:9, h:230, prop:true },
             { name:'tree R', c:[700,-70], r:9, h:230, prop:true },
             { name:'ac unit', poly:[[94,-518],[146,-518],[146,-490],[94,-490]], h:36, prop:true },
             { name:'bin', poly:[[682,-540],[718,-540],[718,-504],[682,-504]], h:52, prop:true } ],
    marks:{ door:[405,-170], mat:[405,-170+35.4] }
  },
  prof:[[-170,240],[-330,330],[-490,240]],
  yard(c){
    houseLawn(0, 809.6, -170, 0, '#7a9e58');
    T(370, 440, -76, 0, 0.6, '#b0654a');
    T(222, 588, -170, -76, 3, '#dcd6c8');
    F(222, 588, 0, 3, '#c4bdae', null, 0, -76);
  },
  facade(c){
    for(let z = 12; z < 238; z += 8) poly([P(60,-170.2,z), P(750,-170.2,z)], null, shade(c.wall,.9), 1);
    for(const a of [60, 744]) F(a, a+6, 0, 240, c.trim, null, 0, -169.6);
    houseDoorway(405, -170, HOUSE_SC, c.trim, c.leaf, 1);
    if(HOUSE_REC) HOUSE_REC.push({ kind:'win', a0:350, a1:460, z0:100, z1:118, b:-170 });
    for(const [a0, a1] of [[352,360],[450,458]]) F(a0, a1, 6, 96, 'rgba(170,205,220,.5)', c.trim, 1, -169.5);
    F(352, 458, 102, 118, 'rgba(170,205,220,.5)', c.trim, 1.5, -169.5);
    for(const [a0, a1] of [[100,160],[240,300],[510,570],[650,710]]) houseWin(a0, a1, 36, 120, -170, c.trim, c.trim, 1, { shutter:c.shut });
    for(const [a0, a1] of [[100,160],[240,300],[375,435],[510,570],[650,710]]) houseWin(a0, a1, 150, 225, -170, c.trim, c.trim, 1, { shutter: a0 === 375 ? null : c.shut });
  },
  chimneys(){
    if(!state.roof) return;
    for(const a of [70, 710]) box(a, a+30, -345, -315, 300, 380, '#a8604a', '#8f513e', '#7a4535');
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    for(const aa of [250, 350, 460, 560]){
      cyl(aa, -82, 3, 226, 11, c.trim, shade(c.trim,1.02));
      for(let da = -8; da <= 8; da += 4) poly([P(aa+da,-70.5,6), P(aa+da,-70.5,224)], null, shade(c.trim,.86), 1);
      box(aa-14, aa+14, -96, -68, 226, 232, c.trim, shade(c.trim,.9), shade(c.trim,.78));
      box(aa-14, aa+14, -96, -68, 0, 5, c.trim, shade(c.trim,.9), shade(c.trim,.78));
    }
    box(222, 588, -96, -68, 232, 254, c.trim, shade(c.trim,.94), shade(c.trim,.8));
    const k = 90/160, bR = -170 - (320-254)/k;
    houseFrontGable(222, 588, -68, -170, 254, 320, 8, c.roof, c.trim, 1, { valley:[-170, bR], barge:c.trim, gable:shade(c.trim,.96) });
    faceCircle(405, -67.6, 280, 13, c.trim, shade(c.trim,.7), 1);
    faceCircle(405, -67.4, 280, 9, '#34424b');
    for(const [a0, a1] of [[8, 370], [440, 802]]){
      box(a0, a1, -20, -8, 0, 22, '#4f7a42', '#426a38', '#3a5e32');
      for(let a = a0 + 8; a < a1; a += 16) ball(a, -14, 22, 7, '#4f7a42');
    }
    for(const [nm, aa] of [['tree L', 110], ['tree R', 700]])
      houseProp(nm, () => { cyl(aa, -70, 0, 120, 8, '#6b5038'); ball(aa, -70, 170, 60, '#3f6b3e'); ball(aa-30, -60, 150, 40, '#4a7a48'); ball(aa+28, -78, 190, 36, '#36603a'); });
    if(!state.back) houseYardFence(this, this.liv[state.pal % this.liv.length], 'near');
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far');
    houseMass(60, 750, -170, -490, 240, c.wall, 1);
    this.facade(c);
    houseSideWins(60, 750, -170, -490, [[40,120],[150,225]], c.trim);
    houseProfileRoof(60, 750, this.prof, 10, c.roof, c.wall, { barge:c.trim });
    this.chimneys();
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far'); this.fore(p);
    houseMass(60, 750, -170, -490, 240, c.wall, -1);
    for(let z = 12; z < 238; z += 8) poly([P(60,-490.2,z), P(750,-490.2,z)], null, shade(c.wall,.86), 1);
    houseSideWins(60, 750, -170, -490, [[40,120],[150,225]], c.trim);
    for(const [a0, a1] of [[100,160],[240,300],[510,570],[650,710]]) houseWin(a0, a1, 150, 225, -490, c.trim, c.trim, -1, { shutter:c.shut });
    houseWin(100, 160, 40, 120, -490, c.trim, c.trim, -1, { shutter:c.shut });
    houseWin(650, 710, 40, 120, -490, c.trim, c.trim, -1, { shutter:c.shut });
    rearDoor(405, c.wall, c.leaf, 490, 92);
    houseProfileRoof(60, 750, this.prof, 10, c.roof, c.wall, { barge:c.trim });
    this.chimneys();
    houseProp('ac unit', () => acUnit(120, 0, 490));
    houseProp('bin', () => wheelieBin(700, '#3f6b4a', 0, 490));
    houseYardFence(this, c, 'near');
  }
},
/* ------------------------------------------------------------------ 24 */
{
  name:'Edelweiss Chalet', hood:'The Flats', tier:'single', sc:HOUSE_SC, ww:HOUSE_SINGLE, dd:HOUSE_DEPTH_LAB,
  head:'Alpine chalet: stone ground floor, timber above, deep low gable, balcony',
  desc:'Swiss chalet: a fieldstone ground floor with an arched door, a timber upper floor with heart-cut shutters, a full-width balcony with a cut-out balustrade and geraniums, and a wide low front gable with deep eaves and carved barge boards.',
  tags:['single','chalet','balcony','front gable','alpine'],
  door:[230, -140],
  liv:[ { stone:'#a8a296', wood:'#8a5a34', trim:'#f2e6cc', roof:'#4a3a30', leaf:'#5a2a1e', shut:'#2f5a3a' },
        { stone:'#9c978c', wood:'#6f4a2e', trim:'#efe2c8', roof:'#3a3f44', leaf:'#2f4a5a', shut:'#8a2f2f' },
        { stone:'#b3ada2', wood:'#a06a3e', trim:'#f5ead2', roof:'#5a4a3a', leaf:'#3f2a1e', shut:'#2e4d68' } ],
  vol:{
    foot:[[40,-140],[420,-140],[420,-480],[40,-480]], h:300,
    solids:[ { name:'bench', poly:[[80,-66],[126,-66],[126,-52],[80,-52]], h:24, prop:true },
             { name:'lantern', c:[340,-30], r:6, h:84, prop:true },
             { name:'woodpile', poly:[[300,-512],[380,-512],[380,-484],[300,-484]], h:28, prop:true },
             { name:'ac unit', poly:[[94,-508],[146,-508],[146,-480],[94,-480]], h:36, prop:true } ],
    marks:{ door:[230,-140], mat:[230,-140+35.4] }
  },
  yard(c){
    houseLawn(0, 460, -140, 0, '#7a9e58');
    for(let b = -130; b < -4; b += 18) T(208, 252, b, b+12, 0.7, '#a8a296');
  },
  walls(c, d){
    houseMass(40, 420, -140, -480, 226, c.wood, d);
    const face = d > 0 ? -140 : -480;
    F(40, 420, 0, 110, c.stone, null, 0, face + 0.2*d);
    for(let z = 10; z < 110; z += 12) for(let a = 44 + (z % 24 ? 0 : 14); a < 416; a += 28) F(a, a+22, z, z+9, shade(c.stone, 0.9 + ((a+z) % 3)*0.05), null, 0, face + 0.4*d);
    for(let a = 46; a < 420; a += 9) F(a, a+1.2, 110, 226, shade(c.wood,.8), null, 0, face + 0.3*d);
    houseSideWins(40, 420, -140, -480, [[36,90],[140,196]], c.trim);
  },
  roof(c, d){
    houseFrontGable(40, 420, -140, -480, 226, 300, 40, c.roof, c.wood, d, { barge:c.trim });
    if(d > 0) for(const [a0, a1] of [[170,215],[245,290]]) houseWin(a0, a1, 238, 276, -140, c.trim, c.trim, 1);
    if(d > 0 && !state.back)                                    // carved rosettes along the barge boards
      for(let t = 0.08; t < 0.95; t += 0.09) for(const s of [-1, 1]) ball(230 + s*230*t, -99.4, 300 - 90*t - 12, 3.6, c.trim);
  },
  balcony(c){
    slab(40, 420, 110, 118, -100, -140, shade(c.wood,.9));
    F(40, 420, 118, 152, c.wood, shade(c.wood,.6), 1, -100);
    for(let a = 50; a < 414; a += 16) poly([P(a+4,-99.6,126), P(a+8,-99.6,130), P(a+12,-99.6,126), P(a+8,-99.6,142)], '#2a1e16');
    F(40, 420, 150, 156, shade(c.wood,1.1), null, 0, -99.4);
    for(let a = 56; a < 412; a += 24){ ball(a, -104, 160, 6, '#4f7a4a'); ball(a+2, -103, 165, 4, '#d8352a'); }
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    this.balcony(c);
    this.roof(c, 1);
    houseProp('bench', () => {
      box(80, 126, -66, -52, 16, 20, c.wood, shade(c.wood,.88), shade(c.wood,.76));
      for(const aa of [84, 122]) box(aa-2, aa+2, -64, -54, 0, 16, shade(c.wood,.7), shade(c.wood,.6), shade(c.wood,.5));
    });
    houseProp('lantern', () => { cyl(340, -30, 0, 70, 2.5, '#2a2a2e'); box(334, 346, -36, -24, 70, 84, '#2a2a2e', 'rgba(250,220,150,.85)', 'rgba(225,195,130,.85)'); });
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.walls(c, 1);
    houseArch(230, -140, houseDoorDims(HOUSE_SC).h, 46, 18, shade(c.stone,1.08), 1);
    houseDoorway(230, -140, HOUSE_SC, c.wood, c.leaf, 1);
    houseWin(80, 130, 36, 90, -140, c.trim, c.trim, 1, { box:c.wood });
    houseWin(330, 380, 36, 90, -140, c.trim, c.trim, 1, { box:c.wood });
    for(const [a0, a1] of [[80,130],[205,255],[330,380]]){
      houseWin(a0, a1, 160, 206, -140, c.trim, c.trim, 1, { shutter:c.shut });
    }
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); this.fore(p);
    this.walls(c, -1);
    houseWin(80, 130, 40, 90, -480, c.trim, c.trim, -1);
    for(const [a0, a1] of [[80,130],[330,380]]) houseWin(a0, a1, 160, 206, -480, c.trim, c.trim, -1, { shutter:c.shut });
    rearDoor(230, c.stone, c.leaf, 480, 92);
    this.roof(c, -1);
    houseProp('woodpile', () => {
      box(300, 380, -512, -484, 0, 28, '#8a6848', '#7a5a3c', '#6a4e34');
      for(let a = 306; a < 378; a += 10) for(const z of [7, 20]) faceCircle(a, -512.4, z, 5, '#c9a878', '#7a5a3c', 1);
    });
    houseProp('ac unit', () => acUnit(120, 0, 480));
  }
},
/* ------------------------------------------------------------------ 25 */
{
  name:'Sunstone Dome', hood:'The Flats', tier:'single', sc:HOUSE_SC, ww:HOUSE_SINGLE, dd:HOUSE_DEPTH_LAB,
  head:'Geodesic dome: faceted shell, glazed street facets, entry vestibule',
  desc:'A faceted dome house with its street-facing facets glazed, a small flat-roofed entry vestibule carrying the door, a xeriscape yard of gravel, boulders and yucca, and a water tank out back.',
  tags:['single','dome','modern','xeriscape'],
  door:[230, -110],
  liv:[ { shell:'#e8e2d4', trim:'#f7f4ec', leaf:'#d9573c', vest:'#c9b08a' },
        { shell:'#d8dde0', trim:'#f4f6f7', leaf:'#2f8f8a', vest:'#8a9aa6' },
        { shell:'#e6d6c0', trim:'#faf4ea', leaf:'#3a5a8a', vest:'#b8906a' } ],
  vol:{
    foot:[[180,-160],[280,-160],[280,-110],[180,-110]], h:170,
    solids:[ { name:'dome', poly:houseRing(230,-320,190,12), h:170 },
             { name:'boulder', c:[90,-60], r:18, h:26, prop:true },
             { name:'yucca', c:[370,-70], r:12, h:50, prop:true },
             { name:'water tank', c:[380,-515], r:22, h:70, prop:true } ],
    marks:{ door:[230,-110], mat:[230,-110+35.4] }
  },
  yard(c){
    T(0, 460, -552, 0, 0.3, '#ddd2bc');
    for(let b = -100; b < -4; b += 18) plateCircle(230, b + 6, 0.8, 11, '#bdb2a0');
  },
  dome(c){
    houseDome(230, -320, 190, 170, 5, 12, c.shell, (i, j) => i > 0 && i < 4 && (j === 2 || j === 3 || j === 4 || (i === 2 && j === 1)));
  },
  vest(c, d){
    box(180, 280, -160, -110, 0, 110, shade(c.vest,1.06), c.vest, shade(c.vest,.8));
    box(174, 286, -164, -106, 110, 118, c.trim, shade(c.trim,.92), shade(c.trim,.8));
    if(d > 0) houseDoorway(230, -110, HOUSE_SC, c.trim, c.leaf, 1);
  },
  props(){
    houseProp('boulder', () => { ball(90, -60, 10, 18, '#a39a8a'); ball(106, -54, 6, 10, '#958c7c'); });
    houseProp('yucca', () => { for(let k = 0; k < 9; k++){ const t = k/9*Math.PI*2; poly([P(370,-70,4), P(370 + Math.cos(t)*14, -70 + Math.sin(t)*14, 44), P(370 + Math.cos(t)*16, -70 + Math.sin(t)*16, 40)], k % 2 ? '#6b8a5a' : '#5a7a4a'); } });
  },
  fore(p){ this.props(); },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.dome(c);
    this.vest(c, 1);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); this.props();
    this.vest(c, -1);
    this.dome(c);
    houseProp('water tank', () => { cyl(380, -515, 0, 70, 22, '#6f7a70', '#8a968a'); for(const z of [20, 45]) cyl(380, -515, z, z+2, 22.4, '#5a645c'); });
  }
},
/* ------------------------------------------------------------------ 26 */
{
  name:'Hollyhock Storybook', hood:'The Flats', tier:'single', sc:HOUSE_SC, ww:HOUSE_SINGLE, dd:HOUSE_DEPTH_LAB,
  head:'Storybook cottage: very steep roofs, arched door in a tall front gable, tapered chimney',
  desc:'Fairy-tale cottage: very steep side gable and a tall, steep entry gable with an arched plank door in a stone surround, diamond-leaded casements, a tapering stone chimney on the front, a cottage garden and an arbour gate in the picket fence.',
  tags:['single','storybook','steep roof','chimney'],
  yardFence:{ style:'picket', h:36, col:'#f4efe4' },
  door:[215, -90],
  liv:[ { wall:'#efe2c4', roof:'#5a4e5e', trim:'#6b4a36', leaf:'#6b4a36', stone:'#a8a296' },
        { wall:'#e8d8c8', roof:'#4a5a52', trim:'#4a3a2e', leaf:'#3a4a3a', stone:'#9c968a' },
        { wall:'#f2e8d0', roof:'#6a4a3a', trim:'#5a3a2a', leaf:'#8a3a2a', stone:'#b3ada2' } ],
  vol:{
    foot:[[40,-120],[140,-120],[140,-90],[290,-90],[290,-120],[400,-120],[400,-480],[40,-480]], h:340,
    solids:[ { name:'chimney', poly:[[100,-120],[134,-120],[134,-100],[100,-100]], h:360 },
             { name:'fence L', poly:[[4,-9],[180,-9],[180,-1],[4,-1]], h:36 },
             { name:'fence R', poly:[[250,-9],[456,-9],[456,-1],[250,-1]], h:36 },
             { name:'birdbath', c:[360,-54], r:10, h:36, prop:true },
             { name:'ac unit', poly:[[274,-508],[326,-508],[326,-480],[274,-480]], h:36, prop:true } ],
    marks:{ door:[215,-90], mat:[215,-90+35.4] }
  },
  prof:[[-120,110],[-300,330],[-480,110]],
  yard(c){
    houseLawn(0, 460, -120, 0, '#7a9e58');
    for(const [a, b] of [[210,-80],[222,-62],[214,-44],[224,-26],[216,-10]]) plateCircle(a, b, 0.8, 10, c.stone);
  },
  garden(c){
    const cols = ['#e2748c','#f2d36a','#a88ad6','#f29a5a','#e8e8f0'];
    for(let a = 20; a < 440; a += 14){ if(a > 170 && a < 260) continue;
      ball(a, -24, 10, 8, '#4f7a4a'); ball(a + 2, -23, 18, 4.5, cols[(a/14|0) % cols.length]); }
  },
  chimney(c){
    box(100, 134, -120, -100, 0, 120, shade(c.stone,1.06), c.stone, shade(c.stone,.8));
    box(104, 130, -118, -102, 120, 250, shade(c.stone,1.06), c.stone, shade(c.stone,.8));
    box(108, 126, -116, -104, 250, 360, shade(c.stone,1.06), c.stone, shade(c.stone,.8));
    box(106, 128, -118, -102, 352, 362, shade(c.stone,1.1), shade(c.stone,.9), shade(c.stone,.72));
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    this.garden(c);
    for(const [a0, a1] of [[4, 180], [250, 456]]) housePickets(a0, a1, -5, 36, '#f4efe4');
    for(const aa of [180, 250]) box(aa-4, aa+4, -9, -1, 0, 78, '#8a6848', '#7a5a3c', '#6a4e34');
    const arch = []; for(let k = 0; k <= 12; k++){ const t = Math.PI*k/12; arch.push(P(215 + 35*Math.cos(t), -5, 78 + 22*Math.sin(t))); }
    for(let k = 0; k < 12; k++) poly([arch[k], arch[k+1]], null, '#7a5a3c', 4);
    for(let k = 1; k < 12; k += 2) ball(215 + 35*Math.cos(Math.PI*k/12), -5, 78 + 22*Math.sin(Math.PI*k/12), 4, '#e2748c');
    houseProp('birdbath', () => { cyl(360, -54, 0, 28, 4, c.stone); plateCircle(360, -54, 28, 11, shade(c.stone,1.06), shade(c.stone,.7), 1); plateCircle(360, -54, 29, 8, '#8fc4d6'); });
    if(!state.back) houseYardFence(this, this.liv[state.pal % this.liv.length], 'near');
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far');
    houseMass(40, 400, -120, -480, 110, c.wall, 1);
    houseSideWins(40, 400, -120, -480, [[30,86]], c.trim);
    houseWin(60, 96, 30, 86, -120, c.trim, c.trim, 1, { lead:true, plain:true });
    houseWin(320, 370, 30, 86, -120, c.trim, c.trim, 1, { lead:true, plain:true });
    houseProfileRoof(40, 400, this.prof, 10, c.roof, c.wall);
    houseMass(140, 290, -90, -120, 110, c.wall, 1);
    const k = 220/180, bR = -120 - (300-110)/k;
    houseFrontGable(140, 290, -90, -120, 110, 300, 8, c.roof, c.wall, 1, { valley:[-120, bR], barge:c.trim });
    houseArch(215, -90, houseDoorDims(HOUSE_SC).h, 46, 26, c.stone, 1);
    houseDoorway(215, -90, HOUSE_SC, c.trim, c.leaf, 1);
    houseWin(202, 228, 150, 196, -90, c.trim, c.trim, 1, { lead:true, plain:true });
    this.chimney(c);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far'); this.fore(p); this.chimney(c);
    houseMass(140, 290, -90, -120, 110, c.wall, 1);
    houseFrontGable(140, 290, -90, -120, 110, 300, 8, c.roof, c.wall, 1, { valley:[-120, -120 - 190/(220/180)], barge:c.trim });
    houseMass(40, 400, -120, -480, 110, c.wall, -1);
    houseSideWins(40, 400, -120, -480, [[30,86]], c.trim);
    houseWin(80, 130, 30, 86, -480, c.trim, c.trim, -1, { lead:true, plain:true });
    rearDoor(200, c.wall, c.leaf, 480, 92);
    houseProfileRoof(40, 400, this.prof, 10, c.roof, c.wall);
    houseProp('ac unit', () => acUnit(300, 0, 480));
    houseYardFence(this, c, 'near');
  }
},
/* ------------------------------------------------------------------ 27 */
{
  name:'Juniper Modern Farmhouse', hood:'The Flats', tier:'double', sc:HOUSE_SC, ww:HOUSE_DOUBLE, dd:HOUSE_DEPTH_LAB,
  head:'Modern farmhouse: two front gables, white batten, black steel windows and roof',
  desc:'Contemporary farmhouse: a tall two-storey front gable beside a lower one, white board-and-batten, black standing-seam roofs, black steel windows, a black steel porch canopy over a warm wood door and two cube planters with olive trees.',
  tags:['double','modern farmhouse','front gable','metal roof'],
  door:[560, -170],
  liv:[ { wall:'#f4f2ec', roof:'#2a2c30', frame:'#1f2023', leaf:'#a0703e', plant:'#2a2c30' },
        { wall:'#e6e2d8', roof:'#3a3530', frame:'#222226', leaf:'#6b4a2e', plant:'#e6e2d8' },
        { wall:'#dfe4e2', roof:'#2e3a40', frame:'#1f2426', leaf:'#b07a4a', plant:'#2e3a40' } ],
  vol:{
    foot:[[60,-130],[380,-130],[380,-170],[740,-170],[740,-470],[60,-470]], h:350,
    solids:[ { name:'post L', c:[404,-124], r:4, h:112 }, { name:'post R', c:[716,-124], r:4, h:112 },
             { name:'planter L', poly:[[476,-116],[504,-116],[504,-88],[476,-88]], h:90, prop:true },
             { name:'planter R', poly:[[616,-116],[644,-116],[644,-88],[616,-88]], h:90, prop:true },
             { name:'ac unit', poly:[[94,-498],[146,-498],[146,-470],[94,-470]], h:36, prop:true },
             { name:'bin', poly:[[682,-520],[718,-520],[718,-484],[682,-484]], h:52, prop:true } ],
    marks:{ door:[560,-170], mat:[560,-170+35.4] }
  },
  yard(c){
    houseLawn(0, 809.6, -170, 0, '#86a85e');
    for(let b = -160; b < -4; b += 20) T(525, 595, b, b+14, 0.7, '#c9c5bb');
  },
  batten(a0, a1, z0, z1, b, c){ for(let a = a0 + 10; a < a1; a += 14) F(a, a+1.6, z0, z1, shade(c.wall,.9), null, 0, b); },
  blockA(c, d){
    houseMass(60, 380, -130, -470, 220, c.wall, d);
    const face = d > 0 ? -130 : -470;
    this.batten(60, 380, 0, 220, face + 0.2*d, c);
    houseSideWins(60, 380, -130, -470, [[40,100],[140,200]], c.frame, { plain:true });
    houseProfileRoofB(-130, -470, [[60,220],[220,350],[380,220]], 12, c.roof, c.wall, { seams:12,
      onFront: () => { for(let a = 70; a < 372; a += 14){ const zt = 220 + 130*(1 - Math.abs(a+0.8-220)/160); if(zt > 226) F(a, a+1.6, 220, zt - 4, shade(c.wall,.9), null, 0, -129.8); } houseWin(190, 250, 250, 300, -130, c.frame, c.frame, 1, { plain:true }); },
      onBack: () => houseWin(190, 250, 250, 300, -470, c.frame, c.frame, -1, { plain:true }) });
    if(d > 0){
      houseWin(110, 170, 30, 110, -130, c.frame, c.frame, 1, { plain:true });
      houseWin(270, 330, 30, 110, -130, c.frame, c.frame, 1, { plain:true });
      houseWin(110, 170, 140, 206, -130, c.frame, c.frame, 1, { plain:true });
      houseWin(270, 330, 140, 206, -130, c.frame, c.frame, 1, { plain:true });
    } else {
      houseWin(110, 170, 140, 206, -470, c.frame, c.frame, -1, { plain:true });
      houseWin(270, 330, 40, 110, -470, c.frame, c.frame, -1, { plain:true });
    }
  },
  blockB(c, d){
    houseMass(380, 740, -170, -470, 120, c.wall, d);
    const face = d > 0 ? -170 : -470;
    this.batten(380, 740, 0, 120, face + 0.2*d, c);
    houseSideWins(380, 740, -170, -470, [[36,100]], c.frame, { plain:true });
    if(d > 0){
      houseDoorway(560, -170, HOUSE_SC, c.frame, c.leaf, 1);
      houseWin(420, 490, 30, 100, -170, c.frame, c.frame, 1, { plain:true });
      houseWin(630, 700, 30, 100, -170, c.frame, c.frame, 1, { plain:true });
    } else {
      houseWin(430, 500, 30, 100, -470, c.frame, c.frame, -1, { plain:true });
      rearDoor(620, c.wall, c.leaf, 470, 92);
    }
    houseProfileRoofB(-170, -470, [[380,120],[560,210],[740,120]], 12, c.roof, c.wall, { seams:12, ext0:false,
      onFront: () => houseWin(540, 580, 140, 176, -170, c.frame, c.frame, 1, { plain:true }) });
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    for(const aa of [404, 716]) box(aa-3, aa+3, -127, -121, 0, 106, c.frame, shade(c.frame,1.2), shade(c.frame,1.1));
    box(396, 724, -170, -118, 106, 112, c.frame, shade(c.frame,1.3), shade(c.frame,1.15));
    for(const [nm, aa] of [['planter L', 490], ['planter R', 630]])
      houseProp(nm, () => { box(aa-14, aa+14, -116, -88, 0, 28, shade(c.plant,1.1), c.plant, shade(c.plant,.8)); cyl(aa, -102, 28, 56, 2.5, '#6b5038'); ball(aa, -102, 70, 18, '#7f9a6a'); ball(aa+8, -98, 62, 11, '#8aa874'); });
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.blockA(c, 1);
    this.blockB(c, 1);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); this.fore(p);
    this.blockB(c, -1);
    this.blockA(c, -1);
    houseProp('ac unit', () => acUnit(120, 0, 470));
    houseProp('bin', () => wheelieBin(700, '#3f6b4a', 0, 470));
  }
},
/* ------------------------------------------------------------------ 28 */
{
  name:'Hayfield Barn House', hood:'The Flats', tier:'double', sc:HOUSE_SC, ww:HOUSE_DOUBLE, dd:HOUSE_DEPTH_LAB,
  head:'Barn house: red gambrel barn with lean-tos, X-braced doors, hayloft, cupola',
  desc:'A converted red barn: a gambrel barn body facing the street with X-braced sliding doors, a hayloft door under a hoist beam and a cupola with a weathervane, flanked by two lean-to wings under shed roofs; round hay bales and a wagon wheel in the yard.',
  tags:['double','barn','gambrel','cupola'],
  door:[470, -110],
  liv:[ { wall:'#a8342a', trim:'#f4efe4', roof:'#6f747a', leaf:'#f4efe4', hay:'#d9b86a' },
        { wall:'#5a6f5a', trim:'#f4efe4', roof:'#4a4e52', leaf:'#f4efe4', hay:'#d4b060' },
        { wall:'#8a5a3a', trim:'#f2ead8', roof:'#3e4a52', leaf:'#f2ead8', hay:'#dcc070' } ],
  vol:{
    foot:[[40,-110],[780,-110],[780,-490],[40,-490]], h:370,
    solids:[ { name:'bale L', c:[110,-50], r:22, h:40, prop:true },
             { name:'bale R', c:[700,-50], r:22, h:40, prop:true },
             { name:'wheel', poly:[[180,-102],[216,-102],[216,-94],[180,-94]], h:40, prop:true },
             { name:'ac unit', poly:[[94,-518],[146,-518],[146,-490],[94,-490]], h:36, prop:true },
             { name:'bin', poly:[[682,-540],[718,-540],[718,-504],[682,-504]], h:52, prop:true } ],
    marks:{ door:[470,-110], mat:[470,-110+35.4] }
  },
  barnProf:[[180,150],[230,270],[410,330],[590,270],[640,150]],
  yard(c){
    houseLawn(0, 809.6, -110, 0, '#8aa85e');
    T(300, 420, -110, 0, 0.6, '#c9bfa8');
    T(440, 500, -110, 0, 0.7, '#d4cdbd');
  },
  leanL(c, d){
    houseMass(40, 180, -110, -490, 110, c.wall, d);
    const face = d > 0 ? -110 : -490;
    for(let a = 48; a < 180; a += 12) F(a, a+1.6, 0, 110, shade(c.wall,.86), null, 0, face + 0.2*d);
    houseSideWins(40, 180, -110, -490, [[36,90]], c.trim);
    houseWin(80, 140, 36, 90, face, c.trim, c.trim, d);
    houseProfileRoofB(-110, -490, [[40,110],[180,150]], 12, c.roof, c.wall, { seams:14, ext1:false });
  },
  leanR(c, d){
    houseMass(640, 780, -110, -490, 110, c.wall, d);
    const face = d > 0 ? -110 : -490;
    for(let a = 648; a < 780; a += 12) F(a, a+1.6, 0, 110, shade(c.wall,.86), null, 0, face + 0.2*d);
    houseSideWins(640, 780, -110, -490, [[36,90]], c.trim);
    houseWin(680, 740, 36, 90, face, c.trim, c.trim, d);
    houseProfileRoofB(-110, -490, [[640,150],[780,110]], 12, c.roof, c.wall, { seams:14, ext0:false });
  },
  barn(c, d){
    houseMass(180, 640, -110, -490, 150, c.wall, d);
    const face = d > 0 ? -110 : -490;
    for(let a = 188; a < 640; a += 12) F(a, a+1.6, 0, 150, shade(c.wall,.86), null, 0, face + 0.2*d);
    houseSideWins(180, 640, -110, -490, [[40,100]], c.trim);
    const gable = () => {
      for(let a = 236; a < 586; a += 12){ const zt = a < 230 ? 150 : a < 410 ? 270 + (a-230)*60/180 : 330 - (a-410)*60/180; F(a, a+1.6, 150, Math.min(zt, 330) - 3, shade(c.wall,.86), null, 0, face + 0.2*d); }
      F(380, 440, 196, 262, shade(c.wall,.8), c.trim, 2, face + 0.3*d);
      poly([P(380,face+0.5*d,196), P(440,face+0.5*d,262)], null, c.trim, 2.5);
      poly([P(440,face+0.5*d,196), P(380,face+0.5*d,262)], null, c.trim, 2.5);
    };
    if(d > 0){
      for(const [a0, a1] of [[300,360],[360,420]]){
        F(a0, a1, 0, 130, shade(c.wall,.92), c.trim, 2.5, -109.6);
        poly([P(a0,-109.4,0), P(a1,-109.4,130)], null, c.trim, 2.5); poly([P(a1,-109.4,0), P(a0,-109.4,130)], null, c.trim, 2.5);
      }
      F(290, 430, 132, 136, '#3a3a3e', null, 0, -109.2);
      houseDoorway(470, -110, HOUSE_SC, c.trim, shade(c.wall,.9), 1);
      houseWin(540, 600, 40, 100, -110, c.trim, c.trim, 1);
    } else {
      houseWin(260, 320, 40, 100, -490, c.trim, c.trim, -1);
      rearDoor(470, c.wall, shade(c.wall,.85), 490, 92);
    }
    houseProfileRoofB(-110, -490, this.barnProf, 14, c.roof, c.wall, { seams:14, onFront: d > 0 ? gable : null, onBack: d < 0 ? gable : null });
    if(state.roof){
      box(390, 430, -320, -280, 318, 362, c.trim, shade(c.trim,.92), shade(c.trim,.8));
      F(396, 424, 330, 354, '#3a3a3e', null, 0, -279.6);
      houseCone(410, -300, 30, 4, 362, 392, c.roof);
      cyl(410, -300, 392, 410, 1.2, '#2a2a2e'); F(400, 420, 404, 406, '#2a2a2e', null, 0, -300);
    }
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    box(404, 416, -110, -76, 294, 304, shade(c.wall,.7), shade(c.wall,.6), shade(c.wall,.5));
    cyl(410, -80, 250, 294, 0.8, '#3a3a3e');
    for(const [nm, aa] of [['bale L', 110], ['bale R', 700]])
      houseProp(nm, () => { cyl(aa, -50, 0, 40, 22, c.hay, shade(c.hay,1.1)); for(let z = 8; z < 40; z += 10) cyl(aa, -50, z, z+1, 22.3, shade(c.hay,.8)); });
    houseProp('wheel', () => { faceCircle(198, -98, 20, 20, 'rgba(0,0,0,0)', '#6b4a2e', 3); faceCircle(198, -97.8, 20, 4, '#6b4a2e'); for(let k = 0; k < 6; k++){ const t = k/6*Math.PI; poly([P(198 + 20*Math.cos(t), -97.6, 20 + 20*Math.sin(t)*1/1.5), P(198 - 20*Math.cos(t), -97.6, 20 - 20*Math.sin(t)/1.5)], null, '#6b4a2e', 1.6); } });
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.leanL(c, 1);
    this.barn(c, 1);
    this.leanR(c, 1);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); this.fore(p);
    this.leanR(c, -1);
    this.barn(c, -1);
    this.leanL(c, -1);
    houseProp('ac unit', () => acUnit(120, 0, 490));
    houseProp('bin', () => wheelieBin(700, '#3f6b4a', 0, 490));
  }
},
/* ------------------------------------------------------------------ 29 */
{
  name:'Lanai Tiki Bungalow', hood:'The Flats', tier:'single', sc:HOUSE_SC, ww:HOUSE_SINGLE, dd:HOUSE_DEPTH_LAB,
  head:'Tiki bungalow: steep thatched hip with a fringe, bamboo walls, torches',
  desc:'Tropical tiki bungalow: bamboo walls under a big steep thatched hip whose deep eave shades a lanai on bamboo posts, bamboo-blind windows, two carved tikis by the door, a lava-rock walk, tiki torches and a palm.',
  tags:['single','tiki','thatch','tropical'],
  door:[230, -130],
  liv:[ { wall:'#d9c08a', thatch:'#b8955a', trim:'#6b4a2e', leaf:'#6b4a2e', tiki:'#7a5a3c' },
        { wall:'#cdb07a', thatch:'#a8885a', trim:'#4a3a2a', leaf:'#2f6f6a', tiki:'#6b4a30' },
        { wall:'#e0c898', thatch:'#c4a068', trim:'#5a3a26', leaf:'#8a3a2a', tiki:'#83603e' } ],
  vol:{
    foot:[[60,-130],[400,-130],[400,-470],[60,-470]], h:230,
    solids:[ { name:'post L', c:[70,-106], r:5, h:92 }, { name:'post R', c:[390,-106], r:5, h:92 },
             { name:'tiki L', c:[170,-104], r:10, h:70, prop:true },
             { name:'tiki R', c:[290,-104], r:10, h:70, prop:true },
             { name:'torch L', c:[150,-30], r:4, h:100, prop:true },
             { name:'torch R', c:[310,-30], r:4, h:100, prop:true },
             { name:'palm', c:[40,-50], r:7, h:190, prop:true },
             { name:'ac unit', poly:[[274,-498],[326,-498],[326,-470],[274,-470]], h:36, prop:true } ],
    marks:{ door:[230,-130], mat:[230,-130+35.4] }
  },
  yard(c){
    T(0, 460, -130, 0, 0.3, '#e2d4b0');
    for(const [a, b] of [[226,-110],[236,-90],[224,-70],[234,-50],[226,-30],[232,-12]]) ball(a, b, 1, 9, '#4a3e3a');
    for(const a of [100, 360]){ ball(a, -60, 10, 14, '#3f7a3e'); ball(a+10, -54, 18, 8, '#e0602a'); }
  },
  walls(c, d){
    houseMass(60, 400, -130, -470, 100, c.wall, d);
    const face = d > 0 ? -130 : -470;
    for(let a = 64; a < 400; a += 7) F(a, a+1.2, 0, 100, shade(c.wall,.82), null, 0, face + 0.2*d);
    for(const z of [30, 70]) F(60, 400, z, z+2, shade(c.wall,.7), null, 0, face + 0.3*d);
    houseSideWins(60, 400, -130, -470, [[30,84]], c.trim, { plain:true });
  },
  blinds(a0, a1, b, c, d){
    houseWin(a0, a1, 30, 86, b, c.trim, c.trim, d, { plain:true });
    for(let z = 34; z < 84; z += 5) F(a0, a1, z, z+1.6, shade(c.thatch,.9), null, 0, b + 0.9*d);
  },
  roof(c, d){
    houseHip(60, 400, -130, -470, 100, 230, 30, c.thatch);
    const k = 130/170, zE = 100 - 30*k;
    houseFringe(30, 430, d > 0 ? -100.3 : -499.7, zE - 7, shade(c.thatch,.82));
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    for(const aa of [70, 390]){ cyl(aa, -106, 0, 92, 5, '#c9a868', '#d9b878'); for(let z = 18; z < 92; z += 20) cyl(aa, -106, z, z+2, 5.4, '#8a6a3e'); }
    this.roof(c, 1);
    for(const [nm, aa] of [['tiki L', 170], ['tiki R', 290]])
      houseProp(nm, () => { cyl(aa, -104, 0, 70, 10, c.tiki, shade(c.tiki,1.1)); for(const z of [22, 46]) F(aa-7, aa+7, z, z+6, '#2a1e16', null, 0, -93.8); F(aa-5, aa+5, 58, 62, '#e8d8b0', null, 0, -93.8); });
    for(const [nm, aa] of [['torch L', 150], ['torch R', 310]])
      houseProp(nm, () => { cyl(aa, -30, 0, 88, 2.5, '#c9a868'); cyl(aa, -30, 88, 98, 4.5, '#6b4a2e'); ball(aa, -30, 104, 5, '#f29a3a'); ball(aa, -30, 108, 3, '#fbe07a'); });
    houseProp('palm', () => housePalm(40, -50, 180, '#5f8f4f'));
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.walls(c, 1);
    houseDoorway(230, -130, HOUSE_SC, c.trim, c.leaf, 1);
    this.blinds(90, 150, -130, c, 1);
    this.blinds(310, 370, -130, c, 1);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    for(const aa of [70, 390]) cyl(aa, -106, 0, 92, 5, '#c9a868', '#d9b878');
    houseProp('tiki L', () => cyl(170, -104, 0, 70, 10, c.tiki, shade(c.tiki,1.1)));
    houseProp('tiki R', () => cyl(290, -104, 0, 70, 10, c.tiki, shade(c.tiki,1.1)));
    houseProp('torch L', () => cyl(150, -30, 0, 88, 2.5, '#c9a868'));
    houseProp('torch R', () => cyl(310, -30, 0, 88, 2.5, '#c9a868'));
    houseProp('palm', () => housePalm(40, -50, 180, '#5f8f4f'));
    this.walls(c, -1);
    this.blinds(100, 160, -470, c, -1);
    rearDoor(300, c.wall, c.leaf, 470, 92);
    this.roof(c, -1);
    houseProp('ac unit', () => acUnit(300, 0, 470));
  }
},
/* ------------------------------------------------------------------ 30 */
{
  name:'Elmhurst Foursquare', hood:'The Flats', tier:'single', sc:HOUSE_SC, ww:HOUSE_SINGLE, dd:HOUSE_DEPTH_LAB,
  head:'American Foursquare: boxy two storeys, hip roof, dormer, full porch',
  desc:'A square two-storey Foursquare under a broad hip with a gabled dormer, clapboard below and shingle above, and a full-width porch on square columns over brick piers with a rail either side of the steps.',
  tags:['single','foursquare','hip','porch','dormer'],
  yardFence:{ style:'hedge', h:24, col:'#5c8a4c' },
  door:[230, -160],
  liv:[ { wall:'#c9b98f', upper:'#8a9a7a', trim:'#f5f0e2', roof:'#4a4642', leaf:'#5a3a28', brick:'#9c5a44' },
        { wall:'#b8c4cc', upper:'#6f7f8a', trim:'#f7f4ec', roof:'#44403c', leaf:'#8a2f2f', brick:'#8a5444' },
        { wall:'#e2cfa6', upper:'#b08a5a', trim:'#fbf6ea', roof:'#3e4448', leaf:'#2e4d68', brick:'#a5604a' } ],
  vol:{
    foot:[[60,-160],[400,-160],[400,-480],[60,-480]], h:300,
    solids:[ { name:'pier 1', poly:[[61,-106],[79,-106],[79,-92],[61,-92]], h:106 },
             { name:'pier 2', poly:[[161,-106],[179,-106],[179,-92],[161,-92]], h:106 },
             { name:'pier 3', poly:[[281,-106],[299,-106],[299,-92],[281,-92]], h:106 },
             { name:'pier 4', poly:[[381,-106],[399,-106],[399,-92],[381,-92]], h:106 },
             { name:'rail L', poly:[[70,-100],[170,-100],[170,-94],[70,-94]], h:34 },
             { name:'rail R', poly:[[290,-100],[390,-100],[390,-94],[290,-94]], h:34 },
             { name:'hedge L', poly:[[6,-18],[190,-18],[190,-6],[6,-6]], h:26 },
             { name:'hedge R', poly:[[270,-18],[454,-18],[454,-6],[270,-6]], h:26 },
             { name:'rocker', c:[110,-130], r:14, h:48, prop:true },
             { name:'planter', c:[350,-130], r:12, h:34, prop:true },
             { name:'ac unit', poly:[[94,-508],[146,-508],[146,-480],[94,-480]], h:36, prop:true } ],
    marks:{ door:[230,-160], mat:[230,-160+35.4] }
  },
  yard(c){
    houseLawn(0, 460, -160, 0, '#7fa35a');
    T(195, 265, -96, 0, 0.6, '#c9c1b0');
    T(60, 400, -160, -96, 3, shade(c.trim,.84));
    F(60, 400, 0, 3, shade(c.trim,.66), null, 0, -96);
  },
  walls(c, d){
    houseMass(60, 400, -160, -480, 230, c.wall, d);
    const face = d > 0 ? -160 : -480;
    F(60, 400, 118, 230, c.upper, null, 0, face + 0.2*d);
    for(let z = 12; z < 116; z += 7) poly([P(60,face+0.3*d,z), P(400,face+0.3*d,z)], null, shade(c.wall,.86), 1);
    for(let z = 124; z < 228; z += 6) poly([P(60,face+0.3*d,z), P(400,face+0.3*d,z)], null, shade(c.upper,.84), 1);
    F(60, 400, 114, 120, c.trim, null, 0, face + 0.4*d);
    houseSideWins(60, 400, -160, -480, [[36,96],[146,206]], c.trim);
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    for(const aa of [70, 170, 290, 390]){
      box(aa-9, aa+9, -106, -92, 3, 38, shade(c.brick,1.06), c.brick, shade(c.brick,.8));
      box(aa-6, aa+6, -104, -94, 38, 106, c.trim, shade(c.trim,.92), shade(c.trim,.78));
    }
    for(const [a0, a1] of [[79, 161], [299, 381]]){
      F(a0, a1, 30, 34, c.trim, null, 0, -97); F(a0, a1, 8, 11, c.trim, null, 0, -97);
      for(let a = a0 + 5; a < a1 - 2; a += 8) F(a, a+2, 11, 30, c.trim, null, 0, -97);
    }
    houseProfileRoof(60, 400, [[-96,106],[-160,128]], 8, c.roof, c.wall, { ext1:false, gable:shade(c.trim,.9) });
    for(const [a0, a1] of [[6, 190], [270, 454]]){
      box(a0, a1, -18, -6, 0, 24, '#5c8a4c', '#4f7a42', '#426a38');
      for(let a = a0 + 8; a < a1; a += 16) ball(a, -12, 24, 7, '#5c8a4c');
    }
    houseProp('rocker', () => houseRocker(110, -130, '#8a5a3a'));
    houseProp('planter', () => { cyl(350, -130, 3, 24, 12, '#6b6660', '#7a756e'); ball(350, -130, 32, 12, '#4f8a4a'); });
    if(!state.back) houseYardFence(this, this.liv[state.pal % this.liv.length], 'near');
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far');
    this.walls(c, 1);
    houseDoorway(230, -160, HOUSE_SC, c.trim, c.leaf, 1);
    for(const [a0, a1] of [[90,150],[310,370]]) houseWin(a0, a1, 34, 96, -160, c.trim, c.trim, 1);
    for(const [a0, a1] of [[90,150],[200,260],[310,370]]) houseWin(a0, a1, 146, 206, -160, c.trim, c.trim, 1);
    houseHip(60, 400, -160, -480, 230, 300, 16, c.roof);
    houseDormer(200, 260, -180, 272, 290, { bf:-160, He:230, k:70/160 }, c.upper, c.roof, c.trim);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far'); this.fore(p);
    this.walls(c, -1);
    houseWin(90, 150, 146, 206, -480, c.trim, c.trim, -1);
    houseWin(310, 370, 146, 206, -480, c.trim, c.trim, -1);
    houseWin(310, 370, 36, 96, -480, c.trim, c.trim, -1);
    rearDoor(170, c.wall, c.leaf, 480, 92);
    houseHip(60, 400, -160, -480, 230, 300, 16, c.roof);
    houseProp('ac unit', () => acUnit(120, 0, 480));
    houseYardFence(this, c, 'near');
  }
},
/* ------------------------------------------------------------------ 31 */
{
  name:'Fowler Octagon House', hood:'The Flats', tier:'single', sc:HOUSE_SC, ww:HOUSE_SINGLE, dd:HOUSE_DEPTH_LAB,
  head:'Octagon house: eight-sided, two storeys, low roof, glazed cupola',
  desc:'An 1850s octagon house: eight flat walls two storeys high with windows on every face, a low eight-sided roof topped by a glazed octagonal cupola, and a small porch on the street face.',
  tags:['single','octagon','cupola','victorian'],
  door:[230, -160],
  liv:[ { wall:'#e8dcc0', trim:'#f7f2e6', roof:'#4a4e52', leaf:'#2e4d68', accent:'#2e4d68' },
        { wall:'#c9d6c8', trim:'#f7f4ec', roof:'#44403c', leaf:'#8a2f2f', accent:'#8a2f2f' },
        { wall:'#e6c8b0', trim:'#fbf6ee', roof:'#3e4448', leaf:'#3f5a4a', accent:'#3f5a4a' } ],
  vol:{
    foot:houseRing(230,-320,160/Math.cos(Math.PI/8),8), h:350,
    solids:[ { name:'post L', c:[156,-114], r:4, h:106 }, { name:'post R', c:[304,-114], r:4, h:106 },
             { name:'lamp', c:[400,-40], r:6, h:96, prop:true },
             { name:'bench', poly:[[40,-70],[86,-70],[86,-56],[40,-56]], h:24, prop:true } ],
    marks:{ door:[230,-160], mat:[230,-160+35.4] }
  },
  R:160/Math.cos(Math.PI/8),
  yard(c){
    houseLawn(0, 460, -160, 0, '#7fa35a');
    T(195, 265, -110, 0, 0.6, '#c9c1b0');
    T(150, 310, -160, -110, 3, shade(c.trim,.84));
    F(150, 310, 0, 3, shade(c.trim,.66), null, 0, -110);
  },
  body(c){
    const seen = housePrism(houseRing(230,-320,this.R,8), 0, 230, c.wall, { top:false });
    for(const f of seen){
      const front = f.nb > 0.9 && !state.back;
      if(!front) houseFaceWin(f, 0.3, 0.7, 36, 100, c.trim);
      houseFaceWin(f, 0.3, 0.7, 146, 206, c.trim);
      houseFaceWin(f, 0, 1, 116, 122, c.trim, { band:true });
      houseFaceWin(f, 0, 1, 222, 230, c.trim, { band:true });
    }
    houseCone(230, -320, this.R + 16, 8, 226, 286, c.roof);
    if(state.roof){
      const cs = housePrism(houseRing(230,-320,36,8), 280, 318, c.trim, { top:false });
      for(const f of cs) houseFaceWin(f, 0.15, 0.85, 288, 312, c.trim, { plain:true });
      houseCone(230, -320, 42, 8, 316, 348, c.roof);
      ball(230, -320, 350, 3, '#c9a24a');
    }
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    for(const aa of [156, 304]) box(aa-3, aa+3, -117, -111, 3, 106, c.trim, shade(c.trim,.9), shade(c.trim,.76));
    houseProfileRoof(150, 310, [[-110,104],[-160,122]], 6, c.roof, c.wall, { ext1:false, gable:shade(c.trim,.9) });
    houseProp('lamp', () => { cyl(400, -40, 0, 84, 2.5, '#2a2a2e'); box(394, 406, -46, -34, 84, 98, '#3a3a3e', 'rgba(250,230,160,.85)', 'rgba(230,205,140,.85)'); });
    houseProp('bench', () => {
      box(40, 86, -70, -56, 16, 20, '#a8835c', '#96744f', '#836544');
      for(const aa of [44, 82]) box(aa-2, aa+2, -68, -58, 0, 16, '#6b5038', '#5a4230', '#4d3828');
    });
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.body(c);
    houseDoorway(230, -160, HOUSE_SC, c.trim, c.leaf, 1);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); this.fore(p);
    this.body(c);
    rearDoor(230, c.wall, c.leaf, 480, 92);
  }
},
/* ------------------------------------------------------------------ 32 */
{
  name:'Belvedere Italianate', hood:'The Flats', tier:'double', sc:HOUSE_SC, ww:HOUSE_DOUBLE, dd:HOUSE_DEPTH_LAB,
  head:'Italianate: low hip on paired brackets, round-headed windows, belvedere tower',
  desc:'An Italianate villa: a two-storey block under a low hip with deep eaves on paired brackets, tall round-headed windows, a bracketed entrance porch, and a square three-storey belvedere tower on the corner with paired arched windows at the top.',
  tags:['double','italianate','tower','brackets'],
  door:[340, -140],
  liv:[ { wall:'#e2c89a', trim:'#f5ecd8', roof:'#5a4a42', leaf:'#4a3020', accent:'#6b4a36' },
        { wall:'#d8d0c0', trim:'#f7f2e8', roof:'#4a4e52', leaf:'#2e3a30', accent:'#4a5a52' },
        { wall:'#c9a888', trim:'#f5ead6', roof:'#6b4a3e', leaf:'#3a2a22', accent:'#5a3a2a' } ],
  vol:{
    foot:[[60,-140],[620,-140],[620,-120],[760,-120],[760,-260],[620,-260],[620,-480],[60,-480]], h:390,
    solids:[ { name:'column L', poly:[[292,-100],[304,-100],[304,-88],[292,-88]], h:110 },
             { name:'column R', poly:[[376,-100],[388,-100],[388,-88],[376,-88]], h:110 },
             { name:'urn L', c:[240,-50], r:13, h:40, prop:true },
             { name:'urn R', c:[440,-50], r:13, h:40, prop:true },
             { name:'ac unit', poly:[[94,-508],[146,-508],[146,-480],[94,-480]], h:36, prop:true },
             { name:'bin', poly:[[482,-530],[518,-530],[518,-494],[482,-494]], h:52, prop:true } ],
    marks:{ door:[340,-140], mat:[340,-140+35.4] }
  },
  yard(c){
    houseLawn(0, 809.6, -140, 0, '#7a9e58');
    T(305, 375, -94, 0, 0.6, '#c9c1b0');
    T(286, 394, -140, -94, 3, '#d8d2c4');
  },
  brackets(a0, a1, b, z, c){ for(let a = a0 + 14; a < a1 - 10; a += 40){ F(a, a+4, z-14, z, c.accent, null, 0, b); F(a+7, a+11, z-14, z, c.accent, null, 0, b); } },
  main(c, d){
    houseMass(60, 620, -140, -480, 240, c.wall, d);
    const face = d > 0 ? -140 : -480;
    F(60, 620, 120, 126, c.trim, null, 0, face + 0.4*d);
    this.brackets(60, 620, face + 0.5*d, 240, c);
    houseSideWins(60, 620, -140, -480, [[40,136],[166,226]], c.trim, { w:34 });
    if(d > 0){
      houseDoorway(340, -140, HOUSE_SC, c.trim, c.leaf, 1);
      for(const [a0, a1] of [[100,150],[200,250],[440,490],[540,590]]) houseArchWin(a0, a1, 36, 140, -140, c.trim, 1);
      for(const [a0, a1] of [[100,150],[200,250],[315,365],[440,490],[540,590]]) houseArchWin(a0, a1, 166, 228, -140, c.trim, 1);
    } else {
      for(const [a0, a1] of [[120,170],[300,350],[480,530]]) houseArchWin(a0, a1, 166, 228, -480, c.trim, -1);
      houseArchWin(480, 530, 40, 140, -480, c.trim, -1);
      rearDoor(250, c.wall, c.leaf, 480, 92);
    }
    houseHip(60, 620, -140, -480, 240, 290, 30, c.roof);
  },
  tower(c){
    houseMass(620, 760, -120, -260, 340, c.wall, 1);
    const face = state.back ? -260 : -120, d = state.back ? -1 : 1;
    F(620, 760, 120, 126, c.trim, null, 0, face + 0.4*d);
    F(620, 760, 236, 242, c.trim, null, 0, face + 0.4*d);
    this.brackets(620, 760, face + 0.5*d, 340, c);
    houseArchWin(660, 720, 40, 140, face, c.trim, d);
    houseArchWin(660, 720, 166, 228, face, c.trim, d);
    houseArchWin(644, 684, 266, 326, face, c.trim, d);
    houseArchWin(696, 736, 266, 326, face, c.trim, d);
    houseSideWins(620, 760, -120, -260, [[166,228],[266,326]], c.trim, { w:40 });
    houseHip(620, 760, -120, -260, 340, 380, 20, c.roof);
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    for(const aa of [298, 382]) box(aa-6, aa+6, -100, -88, 3, 110, c.trim, shade(c.trim,.92), shade(c.trim,.78));
    box(286, 394, -140, -84, 110, 120, c.trim, shade(c.trim,.94), shade(c.trim,.8));
    this.brackets(286, 394, -83.6, 110, c);
    for(const [nm, aa] of [['urn L', 240], ['urn R', 440]])
      houseProp(nm, () => { cyl(aa, -50, 0, 10, 7, '#9c968a'); cyl(aa, -50, 10, 28, 13, '#b3ada2', '#c9c3b8'); ball(aa, -50, 32, 11, '#4f7a4a'); });
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.main(c, 1);
    this.tower(c);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); this.fore(p);
    this.tower(c);
    this.main(c, -1);
    houseProp('ac unit', () => acUnit(120, 0, 480));
    houseProp('bin', () => wheelieBin(500, '#3f6b4a', 0, 480));
  }
},
/* ------------------------------------------------------------------ 33 */
{
  name:'Wickham Gothic Cottage', hood:'The Flats', tier:'single', sc:HOUSE_SC, ww:HOUSE_SINGLE, dd:HOUSE_DEPTH_LAB,
  head:'Gothic Revival: board-and-batten, steep centre gable, pointed window, gingerbread',
  desc:'Carpenter Gothic cottage: board-and-batten walls under a steep side gable, a tall centre cross gable with gingerbread barge boards and a finial, a pointed-arch window above the door, hooded windows and a picket fence.',
  tags:['single','gothic revival','cross gable','board and batten'],
  yardFence:{ style:'picket', h:36, col:'#f7f5ee' },
  door:[230, -130],
  liv:[ { wall:'#d8dcd2', trim:'#f7f5ee', roof:'#4a4652', leaf:'#7a2e3a', accent:'#7a2e3a' },
        { wall:'#e6d6b8', trim:'#fbf8f0', roof:'#3e4a44', leaf:'#2e4d68', accent:'#2e4d68' },
        { wall:'#c9b4c8', trim:'#f7f2ec', roof:'#44403c', leaf:'#3f5a4a', accent:'#3f5a4a' } ],
  vol:{
    foot:[[50,-130],[410,-130],[410,-480],[50,-480]], h:320,
    solids:[ { name:'fence L', poly:[[4,-9],[195,-9],[195,-1],[4,-1]], h:36 },
             { name:'fence R', poly:[[265,-9],[456,-9],[456,-1],[265,-1]], h:36 },
             { name:'lamp', c:[40,-40], r:6, h:96, prop:true },
             { name:'ac unit', poly:[[294,-508],[346,-508],[346,-480],[294,-480]], h:36, prop:true } ],
    marks:{ door:[230,-130], mat:[230,-130+35.4] }
  },
  prof:[[-130,118],[-305,300],[-480,118]],
  yard(c){
    houseLawn(0, 460, -130, 0, '#7fa35a');
    T(195, 265, -130, 0, 0.6, '#c9c1b0');
  },
  walls(c, d){
    houseMass(50, 410, -130, -480, 118, c.wall, d);
    const face = d > 0 ? -130 : -480;
    for(let a = 58; a < 410; a += 12) F(a, a+2, 0, 118, shade(c.wall,.88), null, 0, face + 0.2*d);
    houseSideWins(50, 410, -130, -480, [[30,92]], c.trim);
  },
  hood(a0, a1, z, b){ poly([P(a0-8,b+0.5,z), P((a0+a1)/2,b+0.5,z+14), P(a1+8,b+0.5,z), P(a1+8,b+0.5,z-4), P((a0+a1)/2,b+0.5,z+10), P(a0-8,b+0.5,z-4)], '#f7f5ee', '#b8b4ac', 1); },
  gable(c){
    const k = 182/175, bR = -130 - (290-118)/k;
    houseFrontGable(160, 300, -130, -130, 118, 290, 10, c.roof, c.wall, 1, { valley:[-130, bR], barge:c.trim });
    for(let a = 168; a < 292; a += 12){ const zt = 118 + 172*(1 - Math.abs(a+1-230)/70); if(zt > 124) F(a, a+2, 118, zt - 4, shade(c.wall,.88), null, 0, -129.8); }
    houseArchWin(212, 248, 150, 236, -130, c.trim, 1, { pointed:true });
    if(!state.back) for(let t = 0.06; t < 0.94; t += 0.08) for(const s of [-1, 1]){
      const a = 230 + s*80*t, z = 290 + 10 - (182)*t*(80/70) ;
      poly([P(a-3,-120.4,z-8), P(a+3,-120.4,z-8), P(a,-120.4,z-15)], c.trim);
    }
    if(state.roof){ cyl(230, -124, 290, 318, 1.8, c.trim); ball(230, -124, 320, 3.4, c.trim); }
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    for(const [a0, a1] of [[4, 195], [265, 456]]){
      housePickets(a0, a1, -5, 36, '#f7f5ee');
      for(const aa of [a0 + 4, a1 - 4]) housePost(aa, -5, 42, '#f7f5ee');
    }
    houseProp('lamp', () => { cyl(40, -40, 0, 84, 2.5, '#2a2a2e'); box(34, 46, -46, -34, 84, 98, '#3a3a3e', 'rgba(250,230,160,.85)', 'rgba(230,205,140,.85)'); });
    if(!state.back) houseYardFence(this, this.liv[state.pal % this.liv.length], 'near');
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far');
    this.walls(c, 1);
    houseDoorway(230, -130, HOUSE_SC, c.trim, c.leaf, 1);
    for(const [a0, a1] of [[80,130],[330,380]]){ houseWin(a0, a1, 30, 92, -130, c.trim, c.trim, 1); this.hood(a0, a1, 100, -130); }
    houseProfileRoof(50, 410, this.prof, 12, c.roof, c.wall, { barge:c.trim });
    this.gable(c);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far'); this.fore(p);
    this.gable(c);
    this.walls(c, -1);
    houseWin(80, 130, 30, 92, -480, c.trim, c.trim, -1);
    rearDoor(230, c.wall, c.leaf, 480, 92);
    houseProfileRoof(50, 410, this.prof, 12, c.roof, c.wall, { barge:c.trim });
    houseProp('ac unit', () => acUnit(320, 0, 480));
    houseYardFence(this, c, 'near');
  }
},
/* ------------------------------------------------------------------ 34 */
{
  name:'Rancho Hacienda', hood:'The Flats', tier:'double', sc:HOUSE_SC, ww:HOUSE_DOUBLE, dd:HOUSE_DEPTH_LAB,
  head:'Hacienda: long tile roof over a seven-arch front arcade, courtyard wall',
  desc:'A long single-storey Spanish hacienda: a red-tile roof running out over a front arcade of seven arches on thick piers, deep-set grilled windows and a plank door in the shade behind, terracotta floor, a low courtyard wall with an open timber gate, and big clay pots.',
  tags:['double','hacienda','arcade','tile roof','spanish'],
  yardFence:{ style:'wall', h:26, col:'wall', cap:'roof' },
  door:[405, -150],
  liv:[ { wall:'#efe2cc', roof:'#b8583a', trim:'#5a3a28', leaf:'#5a3a28', floor:'#b86a4a' },
        { wall:'#f2dcc4', roof:'#a84e34', trim:'#3f4a3e', leaf:'#3f4a3e', floor:'#a8604a' },
        { wall:'#e8e4da', roof:'#c0613f', trim:'#2e4d68', leaf:'#2e4d68', floor:'#b87050' } ],
  vol:{
    foot:[[60,-150],[750,-150],[750,-470],[60,-470]], h:210,
    solids:[ ...[[60,70],[140,170],[240,270],[340,365],[445,470],[540,570],[640,670],[740,750]].map(([a0, a1], i) =>
               ({ name:'pier ' + (i+1), poly:[[a0,-96],[a1,-96],[a1,-84],[a0,-84]], h:140 })),
             { name:'wall L', poly:[[6,-14],[370,-14],[370,-4],[6,-4]], h:30 },
             { name:'wall R', poly:[[440,-14],[804,-14],[804,-4],[440,-4]], h:30 },
             { name:'pot L', c:[300,-50], r:14, h:44, prop:true },
             { name:'pot R', c:[520,-50], r:14, h:44, prop:true },
             { name:'ac unit', poly:[[94,-498],[146,-498],[146,-470],[94,-470]], h:36, prop:true },
             { name:'bin', poly:[[682,-520],[718,-520],[718,-484],[682,-484]], h:52, prop:true } ],
    marks:{ door:[405,-150], mat:[405,-150+35.4] }
  },
  prof:[[-84,140],[-280,210],[-470,140]],
  bays:[[70,140],[170,240],[270,340],[365,445],[470,540],[570,640],[670,740]],
  yard(c){
    T(0, 809.6, -84, 0, 0.3, '#ddd2bc');
    T(60, 750, -150, -84, 1.2, c.floor);
    for(let a = 72; a < 750; a += 16) poly([P(a,-150,1.3), P(a,-84,1.3)], null, shade(c.floor,.82), 1);
    for(let b = -140; b < -84; b += 16) poly([P(60,b,1.3), P(750,b,1.3)], null, shade(c.floor,.82), 1);
    T(370, 440, -84, 0, 0.6, '#c9a07a');
  },
  back_wall(c, d){
    houseMass(60, 750, -150, -470, 140, c.wall, d);
    const face = d > 0 ? -150 : -470;
    if(d > 0){
      houseDoorway(405, -150, HOUSE_SC, c.trim, c.leaf, 1);
      for(const [a0, a1] of [[180,230],[580,630]]){ houseWin(a0, a1, 36, 100, -150, c.trim, c.trim, 1, { plain:true }); for(let a = a0 + 6; a < a1; a += 9) F(a, a+1.6, 36, 100, '#2a2a2e', null, 0, -149); }
    } else {
      for(const [a0, a1] of [[180,230],[580,630]]) houseWin(a0, a1, 36, 100, -470, c.trim, c.trim, -1, { plain:true });
      rearDoor(405, c.wall, c.leaf, 470, 92);
    }
    houseSideWins(60, 750, -150, -470, [[36,100]], c.trim, { plain:true, w:40 });
    const g = a => [[a,-150,0],[a,-150,162],[a,-280,210],[a,-470,140],[a,-470,0]];
    houseFace(g(60), [405,-310,90], shade(c.wall,.78), shade(c.wall,.6));
    houseFace(g(750), [405,-310,90], shade(c.wall,.78), shade(c.wall,.6));
  },
  arcade(c){
    const b = -84, z1 = 140, rise = 24;
    const piers = [[60,70],[140,170],[240,270],[340,365],[445,470],[540,570],[640,670],[740,750]];
    for(const [a0, a1] of piers) box(a0, a1, -96, -84, 0, z1, shade(c.wall,1.02), c.wall, shade(c.wall,.8));
    for(const [a0, a1] of this.bays){
      const zs = 96, pts = [P(a0,b,z1)];
      for(let k = 0; k <= 12; k++){ const t = Math.PI*k/12; pts.push(P((a0+a1)/2 - (a1-a0)/2*Math.cos(t), b, zs + rise*Math.sin(t))); }
      pts.push(P(a1,b,z1));
      poly(pts, c.wall, shade(c.wall,.7), 1);
    }
    F(60, 750, 132, 140, shade(c.wall,.9), null, 0, b + 0.3);
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    this.arcade(c);
    houseProfileRoof(60, 750, this.prof, 12, c.roof, c.wall, { noEnds:true });
    for(const [a0, a1] of [[6, 370], [440, 804]]){
      box(a0, a1, -14, -4, 0, 26, shade(c.wall,1.02), c.wall, shade(c.wall,.8));
      box(a0-1, a1+1, -15, -3, 26, 30, c.roof, shade(c.roof,.9), shade(c.roof,.75));
    }
    F(372, 378, 0, 44, c.trim, null, 0, -9); F(432, 438, 0, 44, c.trim, null, 0, -9);
    for(const [nm, aa] of [['pot L', 300], ['pot R', 520]])
      houseProp(nm, () => { ball(aa, -50, 18, 16, '#b86a4a'); cyl(aa, -50, 26, 36, 9, '#a55a3c'); ball(aa, -50, 44, 10, '#6b9a5a'); });
    if(!state.back) houseYardFence(this, this.liv[state.pal % this.liv.length], 'near');
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far');
    this.back_wall(c, 1);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far');
    this.arcade(c);
    for(const [a0, a1] of [[6, 370], [440, 804]]) box(a0, a1, -14, -4, 0, 26, shade(c.wall,1.02), c.wall, shade(c.wall,.8));
    houseProp('pot L', () => ball(300, -50, 18, 16, '#b86a4a'));
    houseProp('pot R', () => ball(520, -50, 18, 16, '#b86a4a'));
    this.back_wall(c, -1);
    houseProfileRoof(60, 750, this.prof, 12, c.roof, c.wall, { noEnds:true });
    houseProp('ac unit', () => acUnit(120, 0, 470));
    houseProp('bin', () => wheelieBin(700, '#3f6b4a', 0, 470));
    houseYardFence(this, c, 'near');
  }
},
/* ------------------------------------------------------------------ 35 */
{
  name:'Kyoto Modern', hood:'The Flats', tier:'double', sc:HOUSE_SC, ww:HOUSE_DOUBLE, dd:HOUSE_DEPTH_LAB,
  head:'Japanese modern: low hip with very deep eaves, shoji front, engawa, garden',
  desc:'A long low Japanese-style house: dark timber and white plaster under a wide low hip with very deep eaves, a front of shoji screens behind a timber engawa, a raked gravel garden with stepping stones, a stone lantern, a cloud-pruned pine and a bamboo fence.',
  tags:['double','japanese','shoji','deep eaves','garden'],
  yardFence:{ style:'bamboo', h:40, col:'#c9b078', cap:'#5a4a30' },
  door:[405, -170],
  liv:[ { wall:'#efe9da', wood:'#3a2e26', roof:'#3e4448', leaf:'#5a4030', deck:'#9a7a58' },
        { wall:'#e8e2d2', wood:'#4a3a2e', roof:'#4a4642', leaf:'#3a2e26', deck:'#8a6a4a' },
        { wall:'#f2ede0', wood:'#2e2a26', roof:'#35393c', leaf:'#6b4a2e', deck:'#a8835c' } ],
  vol:{
    foot:[[80,-170],[730,-170],[730,-460],[80,-460]], h:200,
    solids:[ { name:'fence L', poly:[[6,-10],[370,-10],[370,-2],[6,-2]], h:40 },
             { name:'fence R', poly:[[440,-10],[804,-10],[804,-2],[440,-2]], h:40 },
             { name:'lantern', c:[250,-70], r:12, h:60, prop:true },
             { name:'pine', c:[620,-70], r:8, h:130, prop:true },
             { name:'basin', c:[160,-100], r:12, h:18, prop:true },
             { name:'ac unit', poly:[[94,-488],[146,-488],[146,-460],[94,-460]], h:36, prop:true },
             { name:'bin', poly:[[682,-510],[718,-510],[718,-474],[682,-474]], h:52, prop:true } ],
    marks:{ door:[405,-170], mat:[405,-170+35.4] }
  },
  yard(c){
    T(0, 809.6, -130, 0, 0.3, '#dedad0');
    for(let b = -124; b < -6; b += 8) poly([P(4,b,0.4), P(806,b,0.4)], null, '#c9c4b8', 1);
    for(const [a, b] of [[400,-118],[412,-96],[398,-74],[410,-52],[402,-30],[408,-10]]) plateCircle(a, b, 0.8, 11, '#8f8a80', '#6f6a60', 1);
    for(const [a, b] of [[560,-110],[700,-40],[100,-40]]) ball(a, b, 2, 16, '#5c7a4a');
    T(80, 730, -170, -130, 1.4, c.deck);
    for(let a = 90; a < 730; a += 10) poly([P(a,-170,1.5), P(a,-130,1.5)], null, shade(c.deck,.84), 1);
  },
  walls(c, d){
    houseMass(80, 730, -170, -460, 120, c.wall, d);
    const face = d > 0 ? -170 : -460;
    F(80, 730, 110, 120, c.wood, null, 0, face + 0.3*d);
    F(80, 730, 0, 10, c.wood, null, 0, face + 0.3*d);
    for(let a = 80; a <= 730; a += 72) F(a-3, a+3, 0, 120, c.wood, null, 0, face + 0.4*d);
    houseSideWins(80, 730, -170, -460, [[20,104]], c.wood, { plain:true, w:56, pitch:90 });
    if(d > 0){
      houseShoji(100, 355, 12, 108, -170, c.wood, 1);
      houseShoji(455, 710, 12, 108, -170, c.wood, 1);
      houseDoorway(405, -170, HOUSE_SC, c.wood, c.leaf, 1);
    } else {
      houseShoji(120, 380, 12, 108, -460, c.wood, -1);
      houseShoji(520, 700, 12, 108, -460, c.wood, -1);
      rearDoor(450, c.wall, c.leaf, 460, 92);
    }
  },
  roof(c){
    houseHip(80, 730, -170, -460, 120, 196, 50, c.roof);
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    this.roof(c);
    for(const [a0, a1] of [[6, 370], [440, 804]]){
      F(a0, a1, 0, 40, '#c9b078', '#8a7448', 1, -6);
      for(let a = a0 + 3; a < a1; a += 5) F(a, a+1.2, 0, 40, '#a8905c', null, 0, -5.8);
      for(const z of [12, 28]) F(a0, a1, z, z+2.4, '#5a4a30', null, 0, -5.6);
    }
    houseProp('lantern', () => {
      box(244, 256, -76, -64, 0, 26, '#a8a296', '#9c968a', '#8a857b');
      box(238, 262, -82, -58, 26, 34, '#b3ada2', '#a8a296', '#9c968a');
      box(242, 258, -78, -62, 34, 46, '#a8a296', 'rgba(250,220,150,.8)', '#8a857b');
      houseCone(250, -70, 18, 4, 46, 60, '#9c968a');
    });
    houseProp('pine', () => { tube(620, -70, 0, 610, -64, 80, 4, '#5a4030'); ball(606, -62, 90, 26, '#3f5a3a'); ball(640, -80, 70, 20, '#48653f'); ball(618, -70, 122, 16, '#3a5a36'); });
    houseProp('basin', () => { cyl(160, -100, 0, 16, 12, '#8f8a80', '#5a8aa0'); tube(160, -100, 24, 174, -100, 20, 1.6, '#c9b078'); });
    if(!state.back) houseYardFence(this, this.liv[state.pal % this.liv.length], 'near');
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far');
    this.walls(c, 1);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far');
    for(const [a0, a1] of [[6, 370], [440, 804]]) F(a0, a1, 0, 40, '#c9b078', '#8a7448', 1, -6);
    houseProp('lantern', () => box(244, 256, -76, -64, 0, 46, '#a8a296', '#9c968a', '#8a857b'));
    houseProp('pine', () => ball(606, -62, 90, 26, '#3f5a3a'));
    houseProp('basin', () => cyl(160, -100, 0, 16, 12, '#8f8a80', '#5a8aa0'));
    this.walls(c, -1);
    this.roof(c);
    houseProp('ac unit', () => acUnit(120, 0, 460));
    houseProp('bin', () => wheelieBin(700, '#3f6b4a', 0, 460));
    houseYardFence(this, c, 'near');
  }
},
/* ------------------------------------------------------------------ 36 */
{
  name:'Dockside Container House', hood:'The Flats', tier:'single', sc:HOUSE_SC, ww:HOUSE_SINGLE, dd:HOUSE_DEPTH_LAB,
  head:'Container house: stacked shipping containers, cantilevered top box, steel stair',
  desc:'Three shipping containers: two side by side on the ground and a third on top cantilevered out over the entry, corrugated walls, cargo-door ends, big glazed cut-outs, an exterior steel stair up the seen side, a pallet bench and a tote planter.',
  tags:['single','container','industrial','cantilever'],
  door:[120, -150],
  liv:[ { a:'#c9622a', b:'#2f5a7a', c:'#8a9096', leaf:'#2a2a2e' },
        { a:'#3f6b4a', b:'#c9a23a', c:'#a83a30', leaf:'#2a2a2e' },
        { a:'#8a9096', b:'#c9622a', c:'#2f5a7a', leaf:'#f0c64a' } ],
  vol:{
    foot:[[60,-150],[400,-150],[400,-380],[60,-380]], h:244,
    solids:[ { name:'stair', poly:[[404,-300],[444,-300],[444,-160],[404,-160]], h:124 },
             { name:'planter', poly:[[282,-78],[318,-78],[318,-42],[282,-42]], h:50, prop:true },
             { name:'bench', poly:[[230,-80],[276,-80],[276,-62],[230,-62]], h:24, prop:true },
             { name:'ac unit', poly:[[124,-408],[176,-408],[176,-380],[124,-380]], h:36, prop:true } ],
    marks:{ door:[120,-150], mat:[120,-150+35.4] }
  },
  yard(c){
    T(0, 460, -552, 0, 0.3, '#cfcac0');
    for(let b = -140; b < -4; b += 24) T(90, 150, b, b+16, 0.7, '#a8a39a');
  },
  container(a0, a1, b0, b1, z0, col, c){
    box(a0, a1, b0, b1, z0, z0+120, shade(col,1.08), col, shade(col,.8));
    const nearB = state.back ? b0 : b1, s = state.back ? -1 : 1;
    for(let a = a0 + 4; a < a1; a += 6) F(a, a+2, z0 + 3, z0 + 117, shade(col,.82), null, 0, nearB + 0.3*s);
    const aE = FLANK_RIGHT ? a1 : a0, t = FLANK_RIGHT ? 1 : -1;
    for(let b = b0 + 10; b < b1 - 4; b += 22){ S(aE + 0.4*t, b, b+2.4, z0 + 4, z0 + 116, shade(col,.62)); }
    S(aE + 0.4*t, b0 + 2, b1 - 2, z0 + 58, z0 + 62, shade(col,.62));
  },
  stair(c){
    for(const b of [-166, -294]) box(404, 444, b-3, b+3, 0, 4, '#3a3a3e', '#2a2a2e', '#1f1f22');
    tube(424, -166, 0, 424, -290, 120, 2.6, '#2a2a2e');
    tube(440, -166, 30, 440, -290, 150, 1.6, '#2a2a2e');
    for(let t = 0.08; t < 1; t += 0.08) F(406, 442, 120*t - 1.5, 120*t + 1.5, '#4a4a50', null, 0, -166 - 124*t);
    box(404, 444, -300, -276, 118, 124, '#3a3a3e', '#2a2a2e', '#1f1f22');
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    this.container(40, 380, -240, -110, 124, c.c, c);
    if(!state.back){
      F(80, 300, 140, 230, '#2c3a42', '#1f262b', 1.4, -109.4);
      F(82, 298, 190, 228, 'rgba(170,205,220,.28)', null, 0, -109.2);
      for(let a = 135; a < 300; a += 55) F(a-1, a+1, 140, 230, '#1f262b', null, 0, -109);
    }
    houseProp('planter', () => { box(282, 318, -78, -42, 0, 36, '#e8e8e4', '#d8d8d4', '#c0c0bc'); for(let a = 286; a < 318; a += 8) F(a, a+1, 0, 36, '#8a8a86', null, 0, -41.6); ball(300, -60, 44, 14, '#5c8a56'); });
    houseProp('bench', () => {
      for(const z of [0, 7]) box(230, 276, -80, -62, z, z+5, '#c9a878', '#b8966a', '#a0845a');
      box(230, 276, -80, -62, 14, 20, '#c9a878', '#b8966a', '#a0845a');
    });
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.container(60, 400, -380, -270, 0, c.b, c);
    this.container(60, 400, -260, -150, 0, c.a, c);
    if(HOUSE_REC) HOUSE_REC.push({ kind:'win', a0:246, a1:384, z0:6, z1:112, b:-150 });
    F(250, 380, 10, 108, '#2c3a42', '#1f262b', 1.4, -149.4);
    F(252, 378, 64, 106, 'rgba(170,205,220,.28)', null, 0, -149.2);
    F(314, 316, 10, 108, '#1f262b', null, 0, -149);
    houseDoorway(120, -150, HOUSE_SC, '#2a2a2e', c.leaf, 1);
    this.stair(c);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    houseProp('planter', () => box(282, 318, -78, -42, 0, 36, '#e8e8e4', '#d8d8d4', '#c0c0bc'));
    houseProp('bench', () => box(230, 276, -80, -62, 0, 20, '#c9a878', '#b8966a', '#a0845a'));
    this.stair(c);
    this.container(60, 400, -260, -150, 0, c.a, c);
    this.container(40, 380, -240, -110, 124, c.c, c);            // the top box: after the far one, before the near one
    this.container(60, 400, -380, -270, 0, c.b, c);
    F(120, 250, 10, 108, '#2c3a42', '#1f262b', 1.4, -380.6);
    houseProp('ac unit', () => acUnit(150, 0, 380));
  }
},
/* ------------------------------------------------------------------ 37 */
{
  name:'Montalcino Tuscan Villa', hood:'The Flats', tier:'double', sc:HOUSE_SC, ww:HOUSE_DOUBLE, dd:HOUSE_DEPTH_LAB,
  head:'Tuscan villa: ochre stucco, tile hips, loggia tower, cypresses',
  desc:'A Tuscan farmhouse villa: an ochre two-storey block with green shutters under a terracotta hip, a stone-arched door, a set-back square tower with an arched loggia at the top, a low wing, and two tall cypresses at the ends of the lot.',
  tags:['double','tuscan','tower','tile roof','cypress'],
  door:[310, -150],
  liv:[ { wall:'#d9a868', roof:'#b8583a', trim:'#efe2c8', leaf:'#5a3a28', shut:'#4f6b3e', stone:'#c9bfae' },
        { wall:'#e2c49a', roof:'#a84e34', trim:'#f2e6cc', leaf:'#3f2a1e', shut:'#5a7a8a', stone:'#c4bca9' },
        { wall:'#c98f5a', roof:'#c0613f', trim:'#f5ead6', leaf:'#4a3020', shut:'#3f5a4a', stone:'#cfc6b4' } ],
  vol:{
    foot:[[60,-150],[560,-150],[560,-190],[700,-190],[700,-210],[780,-210],[780,-480],[60,-480]], h:380,
    solids:[ { name:'cypress L', c:[30,-60], r:14, h:260, prop:true },
             { name:'cypress R', c:[790,-60], r:14, h:260, prop:true },
             { name:'pot L', c:[250,-80], r:12, h:40, prop:true },
             { name:'pot R', c:[370,-80], r:12, h:40, prop:true },
             { name:'ac unit', poly:[[94,-508],[146,-508],[146,-480],[94,-480]], h:36, prop:true },
             { name:'bin', poly:[[482,-530],[518,-530],[518,-494],[482,-494]], h:52, prop:true } ],
    marks:{ door:[310,-150], mat:[310,-150+35.4] }
  },
  yard(c){
    T(0, 809.6, -150, 0, 0.3, '#d8ccb0');
    houseLawn(430, 780, -150, -20, '#8aa05e');
    T(275, 345, -150, 0, 0.6, c.stone);
  },
  main(c, d){
    houseMass(60, 560, -150, -480, 230, c.wall, d);
    const face = d > 0 ? -150 : -480;
    houseSideWins(60, 560, -150, -480, [[40,100],[150,210]], c.trim);
    if(d > 0){
      houseArch(310, -150, houseDoorDims(HOUSE_SC).h, 46, 18, c.stone, 1);
      houseDoorway(310, -150, HOUSE_SC, c.stone, c.leaf, 1);
      for(const [a0, a1] of [[100,150],[190,238],[384,430],[470,520]]) houseWin(a0, a1, 36, 100, -150, c.trim, c.trim, 1, { shutter:c.shut });
      for(const [a0, a1] of [[100,150],[190,238],[288,332],[384,430],[470,520]]) houseWin(a0, a1, 150, 210, -150, c.trim, c.trim, 1, { shutter:c.shut });
    } else {
      for(const [a0, a1] of [[120,170],[300,350],[440,490]]) houseWin(a0, a1, 150, 210, -480, c.trim, c.trim, -1, { shutter:c.shut });
      rearDoor(220, c.wall, c.leaf, 480, 92);
    }
    houseHip(60, 560, -150, -480, 230, 290, 14, c.roof);
  },
  tower(c){
    houseMass(560, 700, -190, -330, 330, c.wall, 1);
    const face = state.back ? -330 : -190, d = state.back ? -1 : 1;
    houseWin(606, 654, 150, 210, face, c.trim, c.trim, d, { shutter:c.shut });
    for(const [a0, a1] of [[576,620],[640,684]]){
      const pts = [P(a0, face + 0.4*d, 250)]; for(let k = 0; k <= 12; k++){ const t = Math.PI*(1 - k/12); pts.push(P((a0+a1)/2 + (a1-a0)/2*Math.cos(t), face + 0.4*d, 300 + 16*Math.sin(t))); }
      pts.push(P(a1, face + 0.4*d, 250)); poly(pts, '#3a2e26', shade(c.wall,.7), 1);
    }
    houseSideWins(560, 700, -190, -330, [[250,300]], '#3a2e26', { plain:true, w:36 });
    houseHip(560, 700, -190, -330, 330, 370, 14, c.roof);
  },
  wing(c, d){
    houseMass(700, 780, -210, -480, 120, c.wall, d);
    houseSideWins(700, 780, -210, -480, [[36,96]], c.trim);
    if(d > 0) houseWin(716, 764, 36, 96, -210, c.trim, c.trim, 1);
    houseHip(700, 780, -210, -480, 120, 160, 12, c.roof, { lo:false });
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    for(const [nm, aa] of [['cypress L', 30], ['cypress R', 790]]) houseProp(nm, () => houseCypress(aa, -60, 260, '#2f4a2e'));
    for(const [nm, aa] of [['pot L', 250], ['pot R', 370]])
      houseProp(nm, () => { cyl(aa, -80, 0, 28, 12, '#b86a4a', shade('#b86a4a',1.15)); ball(aa, -80, 36, 12, '#6b8a4a'); });
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.main(c, 1);
    this.tower(c);
    this.wing(c, 1);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); this.fore(p);
    this.wing(c, -1);
    this.tower(c);
    this.main(c, -1);
    houseProp('ac unit', () => acUnit(120, 0, 480));
    houseProp('bin', () => wheelieBin(500, '#3f6b4a', 0, 480));
  }
},
/* ------------------------------------------------------------------ 38 */
{
  name:'Concrete Brutalist', hood:'The Flats', tier:'double', sc:HOUSE_SC, ww:HOUSE_DOUBLE, dd:HOUSE_DEPTH_LAB,
  head:'Brutalist: board-formed concrete base, cantilevered upper block, deep window boxes',
  desc:'A raw concrete house: a board-formed ground floor with a long recessed glass strip and a deep-set door, an upper block cantilevered out over it with deep projecting window boxes, a plant room on the roof, and long concrete planters of grasses.',
  tags:['double','brutalist','concrete','cantilever'],
  door:[405, -160],
  liv:[ { con:'#a8a49c', glass:'#2c3a42', leaf:'#c9622a', grass:'#8a9a5a' },
        { con:'#b8b2a6', glass:'#2c3a42', leaf:'#2f5a7a', grass:'#7a8a4a' },
        { con:'#9a9690', glass:'#2c3a42', leaf:'#e0b43a', grass:'#94a064' } ],
  vol:{
    foot:[[60,-160],[740,-160],[740,-470],[60,-470]], h:290,
    solids:[ { name:'planter L', poly:[[60,-60],[330,-60],[330,-36],[60,-36]], h:24 },
             { name:'planter R', poly:[[480,-60],[750,-60],[750,-36],[480,-36]], h:24 },
             { name:'bench', poly:[[160,-110],[250,-110],[250,-90],[160,-90]], h:22, prop:true },
             { name:'ac unit', poly:[[94,-498],[146,-498],[146,-470],[94,-470]], h:36, prop:true },
             { name:'bin', poly:[[682,-520],[718,-520],[718,-484],[682,-484]], h:52, prop:true } ],
    marks:{ door:[405,-160], mat:[405,-160+35.4] }
  },
  yard(c){
    T(0, 809.6, -160, 0, 0.3, '#cfcbc2');
    for(let a = 0; a < 810; a += 60) poly([P(a,-160,0.4), P(a,0,0.4)], null, '#bdb9b0', 1);
    for(let b = -150; b < 0; b += 30) poly([P(0,b,0.4), P(809.6,b,0.4)], null, '#bdb9b0', 1);
  },
  base(c, d){
    houseMass(60, 740, -160, -470, 130, c.con, d);
    const face = d > 0 ? -160 : -470;
    for(let z = 8; z < 128; z += 8) poly([P(60,face+0.3*d,z), P(740,face+0.3*d,z)], null, shade(c.con,.9), 1);
    houseSideWins(60, 740, -160, -470, [[40,100]], shade(c.con,.7), { plain:true, w:70, pitch:110 });
    if(d > 0){
      box(360, 450, -166, -160, 0, 112, shade(c.con,.8), shade(c.con,.72), shade(c.con,.64));
      houseDoorway(405, -160, HOUSE_SC, shade(c.con,.75), c.leaf, 1);
      if(HOUSE_REC) HOUSE_REC.push({ kind:'win', a0:470, a1:720, z0:60, z1:100, b:-160 });
      F(470, 720, 60, 100, c.glass, '#1f262b', 1, -159.6);
      F(80, 330, 60, 100, c.glass, '#1f262b', 1, -159.6);
    } else {
      F(120, 400, 20, 110, c.glass, '#1f262b', 1, -470.4);
      rearDoor(560, c.con, c.leaf, 470, 92);
    }
  },
  upper(c){
    box(140, 680, -420, -100, 130, 260, shade(c.con,1.06), c.con, shade(c.con,.8));
    const face = state.back ? -420 : -100, d = state.back ? -1 : 1;
    for(let z = 138; z < 258; z += 8) poly([P(140,face+0.3*d,z), P(680,face+0.3*d,z)], null, shade(c.con,.9), 1);
    for(const a0 of [170, 290, 410, 530]){
      const b0 = d > 0 ? face : face - 24, b1 = d > 0 ? face + 24 : face;
      box(a0, a0 + 90, b0, b1, 150, 240, shade(c.con,1.1), shade(c.con,.95), shade(c.con,.8));
      F(a0 + 10, a0 + 80, 162, 230, c.glass, '#1f262b', 1, d > 0 ? face + 24.4 : face - 24.4);
    }
    if(state.roof) box(300, 480, -320, -220, 260, 300, shade(c.con,1.05), shade(c.con,.9), shade(c.con,.76));
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    this.upper(c);
    for(const [a0, a1] of [[60, 330], [480, 750]]){
      box(a0, a1, -60, -36, 0, 24, shade(c.con,1.05), c.con, shade(c.con,.8));
      for(let a = a0 + 8; a < a1; a += 10) poly([P(a,-48,24), P(a-4,-48,44), P(a+2,-48,40)], c.grass);
    }
    houseProp('bench', () => box(160, 250, -110, -90, 0, 22, shade(c.con,1.08), c.con, shade(c.con,.8)));
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.base(c, 1);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    for(const [a0, a1] of [[60, 330], [480, 750]]) box(a0, a1, -60, -36, 0, 24, shade(c.con,1.05), c.con, shade(c.con,.8));
    houseProp('bench', () => box(160, 250, -110, -90, 0, 22, shade(c.con,1.08), c.con, shade(c.con,.8)));
    this.base(c, -1);
    this.upper(c);
    houseProp('ac unit', () => acUnit(120, 0, 470));
    houseProp('bin', () => wheelieBin(700, '#3f6b4a', 0, 470));
  }
},
/* ------------------------------------------------------------------ 39 */
{
  name:'Stellenbosch Cape Dutch', hood:'The Flats', tier:'double', sc:HOUSE_SC, ww:HOUSE_DOUBLE, dd:HOUSE_DEPTH_LAB,
  head:'Cape Dutch: whitewashed walls, thatched roof, curved holbol centre gable',
  desc:'A whitewashed Cape Dutch homestead: a long single storey under a steep dark thatch, a tall curved holbol gable rising over the fanlit centre door, green shutters, a whitewashed garden wall with pillars and two oaks.',
  tags:['double','cape dutch','thatch','ornate gable'],
  yardFence:{ style:'wall', h:26, col:'wall', cap:'wall' },
  door:[405, -160],
  liv:[ { wall:'#f7f4ec', thatch:'#6b5a44', trim:'#3f5a3a', leaf:'#3f5a3a', plaque:'#e6d8b8' },
        { wall:'#f5f0e2', thatch:'#7a6448', trim:'#2e4d68', leaf:'#2e4d68', plaque:'#e8dcc0' },
        { wall:'#faf6ee', thatch:'#5e503e', trim:'#6b2e2a', leaf:'#6b2e2a', plaque:'#e2d4b4' } ],
  vol:{
    foot:[[60,-160],[750,-160],[750,-470],[60,-470]], h:340,
    solids:[ { name:'wall L', poly:[[6,-14],[370,-14],[370,-4],[6,-4]], h:30 },
             { name:'wall R', poly:[[440,-14],[804,-14],[804,-4],[440,-4]], h:30 },
             { name:'oak L', c:[110,-72], r:9, h:230, prop:true },
             { name:'oak R', c:[700,-72], r:9, h:230, prop:true },
             { name:'ac unit', poly:[[94,-498],[146,-498],[146,-470],[94,-470]], h:36, prop:true },
             { name:'bin', poly:[[682,-520],[718,-520],[718,-484],[682,-484]], h:52, prop:true } ],
    marks:{ door:[405,-160], mat:[405,-160+35.4] }
  },
  prof:[[-160,130],[-315,300],[-470,130]],
  yard(c){
    houseLawn(0, 809.6, -160, 0, '#8aa05e');
    T(370, 440, -160, 0, 0.6, '#d8ccb0');
  },
  holbol(c){
    const pts = [], L = [];
    const prof = [[0,130],[-10,150],[-4,176],[-28,196],[-28,212],[-8,232],[-14,260],[-40,270],[-40,286]];
    for(const [dx, z] of prof) L.push([85 + dx, z]);
    const top = []; for(let k = 0; k <= 10; k++){ const t = Math.PI*k/10; top.push([45*Math.cos(t), 286 + 34*Math.sin(t)]); }
    for(const [x, z] of L) pts.push([405 + x, z]);
    for(const [x, z] of top) pts.push([405 + x, z]);
    for(let i = L.length - 1; i >= 0; i--) pts.push([405 - L[i][0], L[i][1]]);
    poly(pts.map(([a, z]) => P(a, -166, z)), shade(c.wall,.8));
    poly(pts.map(([a, z]) => P(a, -160, z)), c.wall, shade(c.wall,.6), 1.2);
    houseWin(390, 420, 210, 250, -160, c.trim, c.trim, 1, { plain:true });
    F(385, 425, 262, 280, c.plaque, shade(c.plaque,.7), 1, -159.6);
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    for(const [a0, a1] of [[6, 370], [440, 804]]){
      box(a0, a1, -14, -4, 0, 26, shade(c.wall,1.0), c.wall, shade(c.wall,.82));
      box(a0-1, a1+1, -15, -3, 26, 30, shade(c.wall,.92), shade(c.wall,.9), shade(c.wall,.78));
    }
    for(const aa of [365, 445]){ box(aa-6, aa+6, -16, -2, 0, 52, c.wall, shade(c.wall,.92), shade(c.wall,.8)); ball(aa, -9, 56, 6, c.wall); }
    for(const [nm, aa] of [['oak L', 110], ['oak R', 700]])
      houseProp(nm, () => { cyl(aa, -72, 0, 110, 8, '#5a4030'); ball(aa, -72, 160, 56, '#3f6b3e'); ball(aa-30, -62, 140, 38, '#4a7a48'); ball(aa+30, -80, 180, 34, '#36603a'); });
    if(!state.back) houseYardFence(this, this.liv[state.pal % this.liv.length], 'near');
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far');
    houseMass(60, 750, -160, -470, 130, c.wall, 1);
    houseSideWins(60, 750, -160, -470, [[30,106]], c.trim);
    const dh = houseDoorDims(HOUSE_SC).h, fan = [];
    for(let k = 0; k <= 10; k++){ const t = Math.PI*k/10; fan.push(P(405 + 32*Math.cos(t), -159.6, dh + 8 + 16*Math.sin(t))); }
    poly(fan, '#34424b', c.trim, 2);
    houseDoorway(405, -160, HOUSE_SC, c.trim, c.leaf, 1);
    for(const [a0, a1] of [[120,170],[220,270],[540,590],[640,690]]) houseWin(a0, a1, 30, 106, -160, '#f7f4ec', '#f7f4ec', 1, { shutter:c.trim });
    houseProfileRoof(60, 750, this.prof, 14, c.thatch, c.wall);
    houseFringe(46, 764, -146.3, 130 - 14*170/155 - 7, shade(c.thatch,.8));
    this.holbol(c);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far'); this.fore(p);
    this.holbol(c);
    houseMass(60, 750, -160, -470, 130, c.wall, -1);
    houseSideWins(60, 750, -160, -470, [[30,106]], c.trim);
    for(const [a0, a1] of [[140,190],[620,670]]) houseWin(a0, a1, 30, 106, -470, '#f7f4ec', '#f7f4ec', -1, { shutter:c.trim });
    rearDoor(405, c.wall, c.leaf, 470, 92);
    houseProfileRoof(60, 750, this.prof, 14, c.thatch, c.wall);
    houseProp('ac unit', () => acUnit(120, 0, 470));
    houseProp('bin', () => wheelieBin(700, '#3f6b4a', 0, 470));
    houseYardFence(this, c, 'near');
  }
},
/* ------------------------------------------------------------------ 40 */
{
  name:'Pelican Stilt House', hood:'The Flats', tier:'single', sc:HOUSE_SC, ww:HOUSE_SINGLE, dd:HOUSE_DEPTH_LAB,
  head:'Raised beach house: living floor on piles, enclosed ground entry, deck and stair',
  desc:'A coastal house lifted on timber piles: the living floor and its hip roof ride over a small enclosed ground-floor entry that carries the door, with a railed deck along the front, an open stair up the side and a kayak on a rack.',
  tags:['single','stilts','beach','deck'],
  door:[230, -150],
  liv:[ { wall:'#a8d0c8', trim:'#fbfaf6', roof:'#5a6a70', leaf:'#e46a5a', pile:'#a8906a' },
        { wall:'#f2d27a', trim:'#fbfaf6', roof:'#4a5a62', leaf:'#2e6f8a', pile:'#9c8462' },
        { wall:'#f2a890', trim:'#fbfaf6', roof:'#56606a', leaf:'#2f5a4a', pile:'#a88e68' } ],
  vol:{
    foot:[[170,-260],[290,-260],[290,-150],[170,-150]], h:300,
    solids:[ ...[[50,-140],[150,-140],[310,-140],[410,-140],[50,-300],[410,-300],[50,-470],[150,-470],[310,-470],[410,-470]].map(([a, b], i) =>
               ({ name:'pile ' + (i+1), c:[a, b], r:7, h:110 })),
             { name:'stair', poly:[[26,-124],[64,-124],[64,-36],[26,-36]], h:110 },
             { name:'kayak', poly:[[330,-66],[430,-66],[430,-44],[330,-44]], h:30, prop:true },
             { name:'ac unit', poly:[[174,-288],[226,-288],[226,-260],[174,-260]], h:36, prop:true } ],
    marks:{ door:[230,-150], mat:[230,-150+35.4] }
  },
  yard(c){
    T(0, 460, -552, 0, 0.3, '#e2d6b6');
    for(let b = -140; b < -16; b += 22) T(206, 254, b, b+14, 0.7, '#c9b99a');
  },
  piles(c){
    for(const [a, b] of [[50,-470],[150,-470],[310,-470],[410,-470],[50,-300],[410,-300],[50,-140],[150,-140],[310,-140],[410,-140]])
      cyl(a, b, 0, 110, 7, c.pile, shade(c.pile,1.1));
  },
  entry(c, d){
    box(170, 290, -260, -150, 0, 110, shade(c.wall,1.02), c.wall, shade(c.wall,.8));
    for(let z = 10; z < 108; z += 8) poly([P(170,-149.8,z), P(290,-149.8,z)], null, shade(c.wall,.88), 1);
    if(d > 0) houseDoorway(230, -150, HOUSE_SC, c.trim, c.leaf, 1);
  },
  upper(c, d){
    box(40, 420, -480, -130, 110, 230, shade(c.wall,1.04), c.wall, shade(c.wall,.8));
    const face = d > 0 ? -130 : -480;
    for(let z = 118; z < 228; z += 8) poly([P(40,face+0.3*d,z), P(420,face+0.3*d,z)], null, shade(c.wall,.88), 1);
    houseSideWins(40, 420, -130, -480, [[140,200]], c.trim);
    for(const [a0, a1] of (d > 0 ? [[70,140],[200,260],[320,390]] : [[80,150],[300,370]])) houseWin(a0, a1, 140, 200, face, c.trim, c.trim, d);
    houseHip(40, 420, -130, -480, 230, 300, 14, c.roof);
  },
  deck(c){
    T(40, 420, -130, -90, 110, shade(c.pile,1.08));
    F(40, 420, 104, 110, c.pile, null, 0, -90);
    F(40, 420, 142, 146, c.trim, null, 0, -90.4);
    for(let a = 44; a < 420; a += 8) F(a, a+2, 110, 142, c.trim, null, 0, -90.4);
    for(let t = 0; t <= 1.0001; t += 0.1) F(26, 64, 110*t - 2, 110*t + 1, shade(c.pile,1.05), null, 0, -36 - 88*t);
    tube(26, -36, 0, 26, -124, 110, 2.4, c.pile); tube(64, -36, 0, 64, -124, 110, 2.4, c.pile);
    tube(64, -36, 36, 64, -124, 146, 1.4, c.trim);
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    this.upper(c, 1);
    this.deck(c);
    houseProp('kayak', () => {
      for(const aa of [346, 414]) box(aa-2, aa+2, -64, -46, 0, 22, '#8a8a86', '#7a7a76', '#6a6a66');
      poly([P(330,-55,24), P(380,-66,30), P(430,-55,24), P(380,-44,26)], '#e0602a', '#9a3a1a', 1);
    });
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.piles(c);
    this.entry(c, 1);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.deck(c);
    houseProp('kayak', () => poly([P(330,-55,24), P(380,-66,30), P(430,-55,24), P(380,-44,26)], '#e0602a', '#9a3a1a', 1));
    this.piles(c);
    this.entry(c, -1);
    this.upper(c, -1);
    houseProp('ac unit', () => acUnit(200, 0, 260));
  }
},
/* ------------------------------------------------------------------ 41 */
{
  name:'Bramble Earth House', hood:'The Flats', tier:'single', sc:HOUSE_SC, ww:HOUSE_SINGLE, dd:HOUSE_DEPTH_LAB,
  head:'Earth house: grass-roofed mound, round stone portal, round door and windows',
  desc:'A house under a grassy mound: a round fieldstone portal set into the hill with a round green door and two round windows, a stone chimney pot poking through the turf, a cottage garden, a gate and a mailbox.',
  tags:['single','earth house','round door','grass roof'],
  yardFence:{ style:'picket', h:30, col:'#e8e0cc' },
  door:[230, -140],
  liv:[ { grass:'#7a9e56', stone:'#a8a296', trim:'#6b4a2e', leaf:'#3f6b3e' },
        { grass:'#6f9450', stone:'#9c968a', trim:'#5a3a26', leaf:'#c9a23a' },
        { grass:'#86a85e', stone:'#b3ada2', trim:'#6b4a2e', leaf:'#2e5a7a' } ],
  vol:{
    foot:houseRing(230,-330,200,14), h:130,
    solids:[ { name:'fence L', poly:[[4,-9],[195,-9],[195,-1],[4,-1]], h:30 },
             { name:'fence R', poly:[[265,-9],[456,-9],[456,-1],[265,-1]], h:30 },
             { name:'mailbox', poly:[[300,-24],[316,-24],[316,-10],[300,-10]], h:52, prop:true },
             { name:'bench', poly:[[60,-72],[106,-72],[106,-58],[60,-58]], h:24, prop:true },
             { name:'water butt', c:[400,-520], r:14, h:40, prop:true } ],
    marks:{ door:[230,-140], mat:[230,-140+35.4] }
  },
  yard(c){
    houseLawn(0, 460, -552, 0, shade(c.grass,1.04));
    for(const [a, b] of [[222,-118],[236,-96],[224,-74],[234,-52],[226,-30],[232,-10]]) plateCircle(a, b, 0.8, 10, c.stone);
  },
  garden(){
    const cols = ['#e2748c','#f2d36a','#a88ad6','#f29a5a','#e8e8f0'];
    for(let a = 20; a < 440; a += 14){ if(a > 180 && a < 280) continue;
      ball(a, -30, 10, 8, '#4f7a4a'); ball(a + 2, -29, 18, 4.5, cols[(a/14|0) % cols.length]); }
  },
  portal(c){
    faceCircle(230, -140, 70, 92, c.stone, shade(c.stone,.7), 1.5);
    for(let k = 0; k < 16; k++){ const t = k/16*Math.PI*2; poly([P(230 + 70*Math.cos(t), -139.6, 70 + 70*Math.sin(t)), P(230 + 92*Math.cos(t), -139.6, 70 + 92*Math.sin(t))], null, shade(c.stone,.72), 1); }
    faceCircle(230, -139.4, 70, 70, shade(c.grass,.5));
    faceCircle(230, -139.2, 56, 54, c.trim);
    for(const a of [150, 310]){ faceCircle(a, -139.2, 72, 18, c.trim); faceCircle(a, -139, 72, 14, '#34424b'); faceCircle(a-3, -138.8, 75, 6, 'rgba(170,205,220,.35)'); }
    if(HOUSE_REC){ HOUSE_REC.push({ kind:'win', a0:128, a1:172, z0:50, z1:94, b:-140 }); HOUSE_REC.push({ kind:'win', a0:288, a1:332, z0:50, z1:94, b:-140 }); }
    houseDoorway(230, -140, HOUSE_SC, c.trim, c.leaf, 1);
    faceCircle(230, -139, 48, 4, '#c9a24a');
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    this.garden();
    for(const [a0, a1] of [[4, 195], [265, 456]]) housePickets(a0, a1, -5, 30, '#e8e0cc');
    houseProp('mailbox', () => { box(306, 310, -19, -15, 0, 40, '#6b5038', '#5a4230', '#4d3828'); box(300, 316, -24, -10, 40, 52, '#b8583a', '#9c4a30', '#843e28'); });
    houseProp('bench', () => {
      box(60, 106, -72, -58, 16, 20, '#a8835c', '#96744f', '#836544');
      for(const aa of [64, 102]) box(aa-2, aa+2, -70, -60, 0, 16, '#6b5038', '#5a4230', '#4d3828');
    });
    if(!state.back) houseYardFence(this, this.liv[state.pal % this.liv.length], 'near');
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far');
    houseDome(230, -330, 200, 120, 5, 14, c.grass);
    if(state.roof){ cyl(300, -360, 90, 150, 9, c.stone, shade(c.stone,1.1)); cyl(300, -360, 150, 158, 11, shade(c.stone,.9)); }
    this.portal(c);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far'); this.fore(p);
    this.portal(c);
    houseDome(230, -330, 200, 120, 5, 14, c.grass);
    if(state.roof){ cyl(300, -360, 90, 150, 9, c.stone, shade(c.stone,1.1)); cyl(300, -360, 150, 158, 11, shade(c.stone,.9)); }
    houseProp('water butt', () => { cyl(400, -520, 0, 40, 14, '#3f5a3a', '#4f6a48'); cyl(400, -520, 38, 40, 14.4, '#2a3a28'); });
    houseYardFence(this, c, 'near');
  }
},
/* ------------------------------------------------------------------ 42 */
{
  name:'Butterfly Modern', hood:'The Flats', tier:'single', sc:HOUSE_SC, ww:HOUSE_SINGLE, dd:HOUSE_DEPTH_LAB,
  head:'Butterfly-roof modern: V roof, clerestory glass, stone chimney, glass wall',
  desc:'A mid-century butterfly house: two roof wings tipping down to a central valley, clerestory glass filling the V at the street end, a floor-to-ceiling glass wall, a tall stone chimney beside the door, a palm and a steel sculpture in the gravel.',
  tags:['single','mid-century','butterfly roof','glass'],
  door:[150, -130],
  liv:[ { wall:'#efece4', roof:'#e8e4da', stone:'#a89a86', leaf:'#e0b43a', edge:'#2f8f8a' },
        { wall:'#e6ece8', roof:'#e2e6e2', stone:'#9a948a', leaf:'#d9573c', edge:'#d9a23a' },
        { wall:'#f2e8dc', roof:'#ece2d6', stone:'#b09a80', leaf:'#2f5a7a', edge:'#c9622a' } ],
  vol:{
    foot:[[50,-130],[410,-130],[410,-480],[50,-480]], h:230,
    solids:[ { name:'chimney', poly:[[56,-140],[104,-140],[104,-120],[56,-120]], h:230 },
             { name:'palm', c:[400,-40], r:7, h:190, prop:true },
             { name:'sculpture', c:[300,-50], r:12, h:60, prop:true },
             { name:'ac unit', poly:[[274,-508],[326,-508],[326,-480],[274,-480]], h:36, prop:true } ],
    marks:{ door:[150,-130], mat:[150,-130+35.4] }
  },
  yard(c){
    T(0, 460, -130, 0, 0.3, '#ddd6c8');
    for(let b = -122; b < -4; b += 20) T(120, 180, b, b+14, 0.7, '#bdb6a8');
  },
  walls(c, d){
    houseMass(50, 410, -130, -480, 150, c.wall, d);
    houseSideWins(50, 410, -130, -480, [[20,120]], '#2a2a2e', { plain:true, w:60, pitch:100 });
    const clere = b => () => { for(const [x0, x1, zt0, zt1] of [[54,226,186,152],[234,406,152,186]]){
      poly([P(x0, b, 152), P(x1, b, 152), P(x1, b, zt1 - 3), P(x0, b, zt0 - 3)], '#34424b', null); } };
    houseProfileRoofB(-130, -480, [[50,190],[230,150]], 20, c.roof, c.wall, { ext1:false, onFront: clere(-129.6), onBack: clere(-480.4), barge:c.edge });
    houseProfileRoofB(-130, -480, [[230,150],[410,190]], 20, c.roof, c.wall, { ext0:false, onFront: clere(-129.6), onBack: clere(-480.4), barge:c.edge });
    if(d > 0){
      houseDoorway(150, -130, HOUSE_SC, shade(c.wall,.86), c.leaf, 1);
      if(HOUSE_REC) HOUSE_REC.push({ kind:'win', a0:246, a1:404, z0:4, z1:142, b:-130 });
      F(250, 400, 6, 140, '#2c3a42', '#1f262b', 1.4, -129.6);
      F(252, 398, 90, 138, 'rgba(170,205,220,.26)', null, 0, -129.4);
      for(let a = 300; a < 400; a += 50) F(a-1, a+1, 6, 140, '#1f262b', null, 0, -129.2);
    } else {
      F(100, 360, 6, 140, '#2c3a42', '#1f262b', 1.4, -480.4);
      for(let a = 165; a < 360; a += 65) F(a-1, a+1, 6, 140, '#1f262b', null, 0, -480.8);
    }
  },
  chimney(c){ box(56, 104, -140, -120, 0, 230, shade(c.stone,1.06), c.stone, shade(c.stone,.8));
    for(let z = 10; z < 230; z += 14) for(let a = 58 + (z % 28 ? 0 : 10); a < 102; a += 20) F(a, a+16, z, z+10, shade(c.stone, .9 + ((a+z) % 3)*0.05), null, 0, -119.6); },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    houseProp('palm', () => housePalm(400, -40, 180, '#5f8f4f'));
    houseProp('sculpture', () => { for(let k = 0; k < 10; k++){ const t = Math.PI*k/10, t2 = Math.PI*(k+1)/10; poly([P(300 + 26*Math.cos(t), -50, 30*Math.sin(t)*2), P(300 + 26*Math.cos(t2), -50, 30*Math.sin(t2)*2)], null, c.edge, 4); } });
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.walls(c, 1);
    this.chimney(c);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); this.fore(p); this.chimney(c);
    this.walls(c, -1);
    houseProp('ac unit', () => acUnit(300, 0, 480));
  }
},
/* ------------------------------------------------------------------ 43 */
{
  name:'Nordic Black Barn', hood:'The Flats', tier:'single', sc:HOUSE_SC, ww:HOUSE_SINGLE, dd:HOUSE_DEPTH_LAB,
  head:'Scandinavian barn house: black cladding, no eaves, glazed gable, birches',
  desc:'A minimal Nordic house: a steep street-facing gable clad and roofed in black timber with no overhangs, a tall glazed wall and gable window, a plain door, meadow grass, two silver birches, a log rack and a barrel sauna out back.',
  tags:['single','scandinavian','front gable','minimal'],
  door:[150, -110],
  liv:[ { clad:'#2a2a2e', roof:'#232326', trim:'#3a3a3e', leaf:'#c9a878', meadow:'#8aa060' },
        { clad:'#8a3a2e', roof:'#2a2a2e', trim:'#2a2a2e', leaf:'#e8e2d4', meadow:'#86a05a' },
        { clad:'#6f7a70', roof:'#2a2e2c', trim:'#2a2e2c', leaf:'#c9a878', meadow:'#8ea864' } ],
  vol:{
    foot:[[40,-110],[420,-110],[420,-470],[40,-470]], h:330,
    solids:[ { name:'birch L', c:[40,-50], r:5, h:170, prop:true },
             { name:'birch R', c:[420,-70], r:5, h:170, prop:true },
             { name:'log rack', poly:[[250,-72],[330,-72],[330,-54],[250,-54]], h:50, prop:true },
             { name:'sauna', poly:[[280,-532],[380,-532],[380,-490],[280,-490]], h:70, prop:true } ],
    marks:{ door:[150,-110], mat:[150,-110+35.4] }
  },
  yard(c){
    houseLawn(0, 460, -552, 0, c.meadow);
    for(let k = 0; k < 40; k++){ const a = 10 + (k*37) % 440, b = -10 - (k*53) % 100; poly([P(a,b,0.5), P(a-2,b,12), P(a+3,b,10)], shade(c.meadow,.8)); }
    for(let b = -104; b < -4; b += 20) T(126, 174, b, b+13, 0.7, '#9c968a');
  },
  body(c, d){
    houseMass(40, 420, -110, -470, 200, c.clad, d);
    const face = d > 0 ? -110 : -470;
    for(let a = 46; a < 420; a += 8) F(a, a+1.2, 0, 200, shade(c.clad,1.25), null, 0, face + 0.2*d);
    houseSideWins(40, 420, -110, -470, [[30,110]], c.trim, { plain:true, w:24, pitch:120 });
    houseProfileRoofB(-110, -470, [[40,200],[230,330],[420,200]], 2, c.roof, c.clad, { seams:10,
      onFront: () => { for(let a = 50; a < 414; a += 8){ const zt = 200 + 130*(1 - Math.abs(a-230)/190); F(a, a+1.2, 200, zt - 3, shade(c.clad,1.25), null, 0, -109.8); }
                       poly([P(190,-109.6,212), P(270,-109.6,212), P(230,-109.6,292)], '#34424b', c.trim, 1.5); },
      onBack: () => poly([P(200,-470.4,212), P(260,-470.4,212), P(230,-470.4,272)], '#34424b', c.trim, 1.5) });
    if(d > 0){
      houseDoorway(150, -110, HOUSE_SC, c.trim, c.leaf, 1);
      if(HOUSE_REC) HOUSE_REC.push({ kind:'win', a0:236, a1:404, z0:4, z1:194, b:-110 });
      F(240, 400, 8, 190, '#2c3a42', c.trim, 1.6, -109.6);
      F(242, 398, 110, 188, 'rgba(170,205,220,.26)', null, 0, -109.4);
      F(319, 321, 8, 190, c.trim, null, 0, -109.2);
    } else {
      F(80, 200, 20, 120, '#2c3a42', c.trim, 1.4, -470.4);
      rearDoor(320, c.clad, c.leaf, 470, 92);
    }
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    houseProp('birch L', () => houseBirch(40, -50, 170, '#9ab86a'));
    houseProp('birch R', () => houseBirch(420, -70, 170, '#a4c070'));
    houseProp('log rack', () => {
      box(250, 330, -72, -54, 0, 4, '#3a3a3e', '#2a2a2e', '#1f1f22');
      for(const aa of [252, 328]) box(aa-2, aa+2, -72, -54, 0, 50, '#3a3a3e', '#2a2a2e', '#1f1f22');
      for(let z = 8; z < 48; z += 10) for(let a = 258; a < 324; a += 10) faceCircle(a, -53.6, z, 4.6, '#c9a878', '#7a5a3c', 1);
    });
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.body(c, 1);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); this.fore(p);
    this.body(c, -1);
    houseProp('sauna', () => {
      for(let a = 284; a < 380; a += 8) F(a, a+7, 0, 50, a % 16 ? '#a8835c' : '#96744f', null, 0, -532);
      box(280, 380, -532, -490, 0, 4, '#6b5038', '#5a4230', '#4d3828');
      faceCircle(330, -532.4, 34, 34, '#a8835c', '#6b5038', 1.2);
      cyl(360, -510, 50, 70, 2.5, '#2a2a2e');
    });
  }
},
/* ------------------------------------------------------------------ 44 */
{
  name:'Pasadena Airplane Bungalow', hood:'The Flats', tier:'double', sc:HOUSE_SC, ww:HOUSE_DOUBLE, dd:HOUSE_DEPTH_LAB,
  head:'Airplane bungalow: wide low gable, pop-up "cockpit" room, gabled porch',
  desc:'A Craftsman airplane bungalow: a long low side gable with deep eaves and rafter tails, a small "cockpit" room popping up through the ridge with windows all round, a shingled porch gable on tapered columns and ribbon windows.',
  tags:['double','craftsman','bungalow','porch'],
  door:[310, -150],
  liv:[ { wall:'#5a6e4e', trim:'#efe6d2', roof:'#4a3e36', leaf:'#8a4e2e', shing:'#9a7a50', stone:'#a39b8d' },
        { wall:'#7a5a44', trim:'#f0e4c8', roof:'#3e4448', leaf:'#2f5a4a', shing:'#b0885a', stone:'#9c978c' },
        { wall:'#6a7a86', trim:'#f2ece0', roof:'#44403a', leaf:'#a2432f', shing:'#a8845c', stone:'#aaa396' } ],
  vol:{
    foot:[[60,-150],[750,-150],[750,-470],[60,-470]], h:280,
    solids:[ { name:'pier L', poly:[[119,-94],[141,-94],[141,-78],[119,-78]], h:100 },
             { name:'pier C', poly:[[219,-94],[241,-94],[241,-78],[219,-78]], h:100 },
             { name:'pier D', poly:[[379,-94],[401,-94],[401,-78],[379,-78]], h:100 },
             { name:'pier R', poly:[[479,-94],[501,-94],[501,-78],[479,-78]], h:100 },
             { name:'rocker', c:[170,-120], r:14, h:48, prop:true },
             { name:'birdbath', c:[640,-60], r:10, h:36, prop:true },
             { name:'ac unit', poly:[[94,-498],[146,-498],[146,-470],[94,-470]], h:36, prop:true },
             { name:'bin', poly:[[682,-520],[718,-520],[718,-484],[682,-484]], h:52, prop:true } ],
    marks:{ door:[310,-150], mat:[310,-150+35.4] }
  },
  prof:[[-150,118],[-310,196],[-470,118]],
  yard(c){
    houseLawn(0, 809.6, -150, 0, '#7fa35a');
    T(275, 345, -80, 0, 0.6, '#cbc4b2');
    T(116, 504, -150, -80, 2, shade(c.trim,.84));
  },
  walls(c, d){
    houseMass(60, 750, -150, -470, 118, c.wall, d);
    const face = d > 0 ? -150 : -470;
    for(let z = 12; z < 116; z += 8) poly([P(60,face+0.3*d,z), P(750,face+0.3*d,z)], null, shade(c.wall,.86), 1);
    houseSideWins(60, 750, -150, -470, [[34,96]], c.trim);
    if(d > 0){
      houseDoorway(310, -150, HOUSE_SC, c.trim, c.leaf, 1);
      for(const [a0, a1] of [[150,200],[420,470],[560,610],[616,666],[672,722]]) houseWin(a0, a1, 34, 96, -150, c.trim, c.trim, 1);
    } else {
      for(const [a0, a1] of [[120,170],[400,450],[600,650]]) houseWin(a0, a1, 34, 96, -470, c.trim, c.trim, -1);
      rearDoor(260, c.wall, c.leaf, 470, 92);
    }
  },
  roofs(c, d){
    houseProfileRoof(60, 750, this.prof, 30, c.roof, c.wall);
    if(d > 0) for(let a = 40; a < 776; a += 24) F(a, a+4, 118 - 30*78/160 - 12, 118 - 30*78/160 - 5, c.trim, null, 0, -120);
    box(300, 510, -380, -240, 162, 240, shade(c.wall,1.04), c.wall, shade(c.wall,.8));
    const face = d > 0 ? -240 : -380;
    for(const [a0, a1] of [[330,380],[430,480]]) houseWin(a0, a1, 176, 226, face, c.trim, c.trim, d, { plain:true });
    houseSideWins(300, 510, -240, -380, [[176,226]], c.trim, { plain:true, skipFront:20, skipBack:20, pitch:50, w:30 });
    houseProfileRoof(300, 510, [[-240,240],[-310,276],[-380,240]], 20, c.roof, c.wall);
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    for(const aa of [130, 230, 390, 490]){
      box(aa-11, aa+11, -94, -78, 2, 40, shade(c.stone,1.06), c.stone, shade(c.stone,.8));
      box(aa-7, aa+7, -91, -81, 40, 100, c.trim, shade(c.trim,.92), shade(c.trim,.78));
    }
    F(120, 500, 100, 108, c.trim, shade(c.trim,.7), 1, -80);
    houseFrontGable(120, 500, -80, -150, 108, 160, 10, c.roof, c.trim, 1, { back0:true, gable:c.shing, shingle:true, barge:c.trim });
    houseProp('rocker', () => houseRocker(170, -120, '#8a5a3a'));
    houseProp('birdbath', () => { cyl(640, -60, 0, 28, 4, c.stone); plateCircle(640, -60, 28, 11, shade(c.stone,1.06), shade(c.stone,.7), 1); plateCircle(640, -60, 29, 8, '#8fc4d6'); });
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.walls(c, 1);
    this.roofs(c, 1);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); this.fore(p);
    this.walls(c, -1);
    this.roofs(c, -1);
    houseProp('ac unit', () => acUnit(120, 0, 470));
    houseProp('bin', () => wheelieBin(700, '#3f6b4a', 0, 470));
  }
},
/* ------------------------------------------------------------------ 45 */
{
  name:"Nantucket Captain's House", hood:'The Flats', tier:'double', sc:HOUSE_SC, ww:HOUSE_DOUBLE, dd:HOUSE_DEPTH_LAB,
  head:"Captain's house: five-bay clapboard, low hipped roof, railed widow's walk",
  desc:"A Federal sea captain's house: white clapboard, five bays with black shutters, a door with fanlight, sidelights and a pediment, twin chimneys, a low hipped roof flattened on top into a railed widow's walk, a picket fence and an old anchor in the yard.",
  tags:['double','federal','widows walk','nautical'],
  yardFence:{ style:'picket', h:36, col:'#f7f5ef' },
  door:[405, -150],
  liv:[ { wall:'#f4f2ec', trim:'#ffffff', roof:'#4a4e52', leaf:'#1f2a24', shut:'#1f2a24', top:'#5a5e62' },
        { wall:'#9ea3a3', trim:'#f7f5ef', roof:'#44403c', leaf:'#8a2f2f', shut:'#2e3a4a', top:'#55504a' },
        { wall:'#efe0b8', trim:'#fbf8f0', roof:'#3e4448', leaf:'#2e4d68', shut:'#2e4d68', top:'#4e5458' } ],
  vol:{
    foot:[[80,-150],[730,-150],[730,-470],[80,-470]], h:360,
    solids:[ { name:'fence L', poly:[[4,-9],[370,-9],[370,-1],[4,-1]], h:36 },
             { name:'fence R', poly:[[440,-9],[806,-9],[806,-1],[440,-1]], h:36 },
             { name:'anchor', poly:[[176,-66],[224,-66],[224,-54],[176,-54]], h:70, prop:true },
             { name:'lamp', c:[620,-40], r:6, h:96, prop:true },
             { name:'ac unit', poly:[[114,-498],[166,-498],[166,-470],[114,-470]], h:36, prop:true },
             { name:'bin', poly:[[682,-520],[718,-520],[718,-484],[682,-484]], h:52, prop:true } ],
    marks:{ door:[405,-150], mat:[405,-150+35.4] }
  },
  yard(c){
    houseLawn(0, 809.6, -150, 0, '#7fa35a');
    T(370, 440, -150, 0, 0.6, '#b0654a');
    for(let b = -144; b < 0; b += 9) poly([P(370,b,0.7), P(440,b,0.7)], null, '#8f5038', 1);
  },
  walls(c, d){
    houseMass(80, 730, -150, -470, 232, c.wall, d);
    const face = d > 0 ? -150 : -470;
    for(let z = 12; z < 230; z += 7) poly([P(80,face+0.3*d,z), P(730,face+0.3*d,z)], null, shade(c.wall,.88), 1);
    for(const a of [80, 724]) F(a, a+6, 0, 232, c.trim, null, 0, face + 0.4*d);
    F(80, 730, 224, 232, c.trim, null, 0, face + 0.4*d);
    houseSideWins(80, 730, -150, -470, [[34,106],[146,206]], c.trim);
    if(d > 0){
      const dh = houseDoorDims(HOUSE_SC).h, fan = [];
      for(let k = 0; k <= 10; k++){ const t = Math.PI*k/10; fan.push(P(405 + 34*Math.cos(t), -149.6, dh + 8 + 16*Math.sin(t))); }
      poly(fan, '#34424b', c.trim, 2);
      for(const [a0, a1] of [[352,360],[450,458]]) F(a0, a1, 6, 96, 'rgba(170,205,220,.5)', c.trim, 1, -149.5);
      houseDoorway(405, -150, HOUSE_SC, c.trim, c.leaf, 1);
      for(const [a0, a1] of [[140,200],[260,320],[490,550],[610,670]]) houseWin(a0, a1, 34, 106, -150, c.trim, c.trim, 1, { shutter:c.shut });
      for(const [a0, a1] of [[140,200],[260,320],[375,435],[490,550],[610,670]]) houseWin(a0, a1, 146, 206, -150, c.trim, c.trim, 1, { shutter:c.shut });
    } else {
      for(const [a0, a1] of [[140,200],[260,320],[490,550],[610,670]]) houseWin(a0, a1, 146, 206, -470, c.trim, c.trim, -1, { shutter:c.shut });
      rearDoor(405, c.wall, c.leaf, 470, 92);
    }
  },
  roof(c){
    houseMansard(80, 730, -150, -470, 232, 300, 110, c.roof, c.top);
    if(!state.roof) return;
    for(const a of [170, 610]) box(a, a+30, -330, -300, 250, 350, '#a8604a', '#8f513e', '#7a4535');
    houseRailRing(210, 600, -340, -280, 300, 26, c.trim);
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    houseFrontGable(362, 448, -136, -150, 104, 124, 4, c.roof, c.trim, 1, { back0:true, barge:c.trim });
    for(const [a0, a1] of [[4, 370], [440, 806]]){
      housePickets(a0, a1, -5, 36, '#f7f5ef');
      for(const aa of [a0 + 4, a1 - 4]) housePost(aa, -5, 42, '#f7f5ef');
    }
    houseProp('anchor', () => {
      F(198, 202, 6, 64, '#2a2a2e', null, 0, -60); F(186, 214, 56, 60, '#2a2a2e', null, 0, -60);
      faceCircle(200, -60, 68, 6, 'rgba(0,0,0,0)', '#2a2a2e', 2.5);
      const arc = []; for(let k = 0; k <= 10; k++){ const t = Math.PI*(1 + k/10); arc.push(P(200 + 24*Math.cos(t), -60, 30 + 20*Math.sin(t))); }
      for(let k = 0; k < 10; k++) poly([arc[k], arc[k+1]], null, '#2a2a2e', 4);
    });
    houseProp('lamp', () => { cyl(620, -40, 0, 84, 2.5, '#2a2a2e'); box(614, 626, -46, -34, 84, 98, '#3a3a3e', 'rgba(250,230,160,.85)', 'rgba(230,205,140,.85)'); });
    if(!state.back) houseYardFence(this, this.liv[state.pal % this.liv.length], 'near');
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far');
    this.walls(c, 1);
    this.roof(c);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far'); this.fore(p);
    this.walls(c, -1);
    this.roof(c);
    houseProp('ac unit', () => acUnit(140, 0, 470));
    houseProp('bin', () => wheelieBin(700, '#3f6b4a', 0, 470));
    houseYardFence(this, c, 'near');
  }
},
/* ------------------------------------------------------------------ 46 */
{
  name:'Cotswold Stone Cottage', hood:'The Flats', tier:'single', sc:HOUSE_SC, ww:HOUSE_SINGLE, dd:HOUSE_DEPTH_LAB,
  head:'Cotswold cottage: honey stone, stone-slate roof, gabled dormers, roses',
  desc:'A honey-stone Cotswold cottage: coursed limestone walls, a steep stone-slate roof with two gabled dormers breaking the eave, mullioned leaded windows, a stone door hood with roses climbing either side, stone chimneys at both gables and a drystone wall.',
  tags:['single','cotswold','stone','dormers'],
  yardFence:{ style:'wall', h:24, col:'stone', cap:'stone' },
  door:[230, -120],
  liv:[ { stone:'#d9b878', roof:'#8a7a62', trim:'#b89a64', leaf:'#4a5a4a', rose:'#e2748c' },
        { stone:'#cfae72', roof:'#7a6e5c', trim:'#a88e5c', leaf:'#6b2e2a', rose:'#f2a0b0' },
        { stone:'#e0c488', roof:'#948468', trim:'#c0a26a', leaf:'#2e4d68', rose:'#d9573c' } ],
  vol:{
    foot:[[40,-120],[420,-120],[420,-480],[40,-480]], h:380,
    solids:[ { name:'wall L', poly:[[4,-12],[195,-12],[195,-2],[4,-2]], h:28 },
             { name:'wall R', poly:[[265,-12],[456,-12],[456,-2],[265,-2]], h:28 },
             { name:'bench', poly:[[60,-66],[106,-66],[106,-52],[60,-52]], h:24, prop:true },
             { name:'woodpile', poly:[[300,-512],[380,-512],[380,-484],[300,-484]], h:28, prop:true },
             { name:'ac unit', poly:[[94,-508],[146,-508],[146,-480],[94,-480]], h:36, prop:true } ],
    marks:{ door:[230,-120], mat:[230,-120+35.4] }
  },
  prof:[[-120,118],[-300,310],[-480,118]],
  slope:{ bf:-120, He:118, k:192/180 },
  yard(c){
    houseLawn(0, 460, -120, 0, '#7a9e58');
    T(195, 265, -120, 0, 0.6, '#c9b89a');
  },
  walls(c, d){
    houseMass(40, 420, -120, -480, 118, c.stone, d);
    const face = d > 0 ? -120 : -480;
    for(let z = 8; z < 118; z += 9) poly([P(40,face+0.3*d,z), P(420,face+0.3*d,z)], null, shade(c.stone,.84), 1);
    for(let z = 4; z < 118; z += 18) for(let a = 52 + (z % 36 ? 0 : 16); a < 420; a += 32) poly([P(a,face+0.3*d,z), P(a,face+0.3*d,z+9)], null, shade(c.stone,.84), 1);
    houseSideWins(40, 420, -120, -480, [[30,90]], c.trim);
  },
  chimneys(c){
    if(!state.roof) return;
    for(const a of [40, 390]) box(a, a+30, -318, -284, 270, 380, shade(c.stone,1.04), c.stone, shade(c.stone,.8));
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    for(const [a0, a1] of [[4, 195], [265, 456]]){
      box(a0, a1, -12, -2, 0, 24, shade(c.stone,1.04), shade(c.stone,.92), shade(c.stone,.8));
      for(let a = a0 + 4; a < a1; a += 8) F(a, a+5, 24, 28, shade(c.stone,.82), null, 0, -1.6);
    }
    houseProp('bench', () => {
      box(60, 106, -66, -52, 16, 20, '#a8835c', '#96744f', '#836544');
      for(const aa of [64, 102]) box(aa-2, aa+2, -64, -54, 0, 16, '#6b5038', '#5a4230', '#4d3828');
    });
    if(!state.back) houseYardFence(this, this.liv[state.pal % this.liv.length], 'near');
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far');
    this.walls(c, 1);
    houseDoorway(230, -120, HOUSE_SC, c.trim, c.leaf, 1);
    slab(180, 280, 104, 110, -110, -120, c.trim);
    for(const a of [182, 278]) for(let z = 6; z < 130; z += 11){ ball(a, -118, z, 6, '#4f7a4a'); if(z % 22 > 10) ball(a + (a < 230 ? -2 : 2), -117, z + 3, 3.4, c.rose); }
    for(const [a0, a1] of [[80,160],[300,380]]) houseWin(a0, a1, 30, 90, -120, c.trim, c.trim, 1, { lead:true });
    houseProfileRoof(40, 420, this.prof, 8, c.roof, c.stone);
    for(const a0 of [90, 310]) houseDormer(a0, a0 + 60, -128, 190, 214, this.slope, c.stone, c.roof, c.trim);
    this.chimneys(c);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far'); this.fore(p);
    this.walls(c, -1);
    houseWin(80, 160, 30, 90, -480, c.trim, c.trim, -1, { lead:true });
    rearDoor(260, c.stone, c.leaf, 480, 92);
    houseProfileRoof(40, 420, this.prof, 8, c.roof, c.stone);
    this.chimneys(c);
    houseProp('woodpile', () => {
      box(300, 380, -512, -484, 0, 28, '#8a6848', '#7a5a3c', '#6a4e34');
      for(let a = 306; a < 378; a += 10) for(const z of [7, 20]) faceCircle(a, -512.4, z, 5, '#c9a878', '#7a5a3c', 1);
    });
    houseProp('ac unit', () => acUnit(120, 0, 480));
    houseYardFence(this, c, 'near');
  }
},
/* ------------------------------------------------------------------ 47 */
{
  name:'Normandy Chateau', hood:'The Flats', tier:'double', sc:HOUSE_SC, ww:HOUSE_DOUBLE, dd:HOUSE_DEPTH_LAB,
  head:'Normandy chateau: steep slate hip, round corner tower with a candle-snuffer cone',
  desc:'A French Normandy manor in pale stone under a very steep slate hip with three dormers, a round tower on the street corner topped with a tall candle-snuffer cone, shuttered casements, an arched stone doorway, and clipped topiary cones on the gravel.',
  tags:['double','normandy','tower','steep hip','dormers'],
  door:[300, -150],
  liv:[ { stone:'#e2d8c4', roof:'#4a5058', trim:'#f5f0e4', leaf:'#3a4a5a', shut:'#6f8a9a' },
        { stone:'#d8c8a8', roof:'#44403c', trim:'#f2ead8', leaf:'#5a3a28', shut:'#8a5a4a' },
        { stone:'#ece4d4', roof:'#3e4a52', trim:'#fbf6ea', leaf:'#2e3a30', shut:'#5a7a5a' } ],
  vol:{
    foot:[[60,-150],[600,-150],[600,-480],[60,-480]], h:470,
    solids:[ { name:'tower', poly:houseRing(640,-160,60,12), h:460 },
             { name:'topiary L', c:[220,-60], r:14, h:70, prop:true },
             { name:'topiary R', c:[380,-60], r:14, h:70, prop:true },
             { name:'ac unit', poly:[[94,-508],[146,-508],[146,-480],[94,-480]], h:36, prop:true },
             { name:'bin', poly:[[482,-530],[518,-530],[518,-494],[482,-494]], h:52, prop:true } ],
    marks:{ door:[300,-150], mat:[300,-150+35.4] }
  },
  slope:{ bf:-150, He:230, k:170/165 },
  yard(c){
    T(0, 809.6, -150, 0, 0.3, '#ddd4c0');
    houseLawn(460, 800, -90, -10, '#7a9e58');
    T(265, 335, -150, 0, 0.6, '#c9bfae');
  },
  main(c, d){
    houseMass(60, 600, -150, -480, 230, c.stone, d);
    const face = d > 0 ? -150 : -480;
    for(let z = 10; z < 228; z += 12) poly([P(60,face+0.3*d,z), P(600,face+0.3*d,z)], null, shade(c.stone,.88), 1);
    houseSideWins(60, 600, -150, -480, [[36,100],[146,206]], c.trim, { skipFront:60 });
    if(d > 0){
      houseArch(300, -150, houseDoorDims(HOUSE_SC).h, 46, 20, shade(c.stone,.9), 1);
      houseDoorway(300, -150, HOUSE_SC, c.trim, c.leaf, 1);
      for(const [a0, a1] of [[100,160],[180,228],[372,420],[470,530]]) houseWin(a0, a1, 36, 100, -150, c.trim, c.trim, 1, { shutter:c.shut });
      for(const [a0, a1] of [[100,160],[180,228],[276,324],[372,420],[470,530]]) houseWin(a0, a1, 146, 206, -150, c.trim, c.trim, 1, { shutter:c.shut });
    } else {
      for(const [a0, a1] of [[120,180],[300,360],[480,540]]) houseWin(a0, a1, 146, 206, -480, c.trim, c.trim, -1, { shutter:c.shut });
      rearDoor(260, c.stone, c.leaf, 480, 92);
    }
    houseHip(60, 600, -150, -480, 230, 400, 12, c.roof);
    if(d > 0) for(const a0 of [130, 276, 420]) houseDormer(a0, a0 + 50, -160, 300, 330, this.slope, c.stone, c.roof, c.trim);
  },
  tower(c){
    const seen = housePrism(houseRing(640,-160,60,12), 0, 300, c.stone, { top:false });
    for(const f of seen){
      houseFaceWin(f, 0.2, 0.8, 50, 100, c.trim);
      houseFaceWin(f, 0.2, 0.8, 160, 210, c.trim);
      houseFaceWin(f, 0, 1, 290, 300, c.trim, { band:true });
    }
    houseCone(640, -160, 68, 12, 296, 460, c.roof);
    if(state.roof){ cyl(640, -160, 460, 478, 1.4, '#2a2a2e'); ball(640, -160, 480, 3, '#c9a24a'); }
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    for(const [nm, aa] of [['topiary L', 220], ['topiary R', 380]])
      houseProp(nm, () => { cyl(aa, -60, 0, 18, 12, '#b86a4a', shade('#b86a4a',1.1)); houseCone(aa, -60, 14, 8, 18, 70, '#3f6b3e'); });
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.main(c, 1);
    this.tower(c);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); this.fore(p);
    this.tower(c);
    this.main(c, -1);
    houseProp('ac unit', () => acUnit(120, 0, 480));
    houseProp('bin', () => wheelieBin(500, '#3f6b4a', 0, 480));
  }
},
/* ------------------------------------------------------------------ 48 */
{
  name:'Watch Hill Shingle Cottage', hood:'The Flats', tier:'double', sc:HOUSE_SC, ww:HOUSE_DOUBLE, dd:HOUSE_DEPTH_LAB,
  head:'Shingle Style: weathered cedar, big side gable, half-round tower bay, porch',
  desc:'A Shingle Style seaside cottage: weathered cedar shingle wrapping a big steep side gable, a half-round two-storey bay on the street corner under a half-cone, a long shed dormer, a shingled porch on fat square posts, and hydrangeas.',
  tags:['double','shingle style','bay','porch'],
  door:[250, -150],
  liv:[ { wall:'#9c8e7a', trim:'#f7f4ec', roof:'#3f4a44', leaf:'#2f4a3a', bloom:'#8aa6d6' },
        { wall:'#b0a088', trim:'#fbf8f0', roof:'#4a4642', leaf:'#8a2f2f', bloom:'#d68aa8' },
        { wall:'#8e8a80', trim:'#f5f2ea', roof:'#3a4046', leaf:'#2e4d68', bloom:'#a88ad6' } ],
  vol:{
    foot:[[60,-150],[640,-150],[640,-470],[60,-470]], h:360,
    solids:[ { name:'post 1', poly:[[82,-100],[98,-100],[98,-84],[82,-84]], h:108 },
             { name:'post 2', poly:[[192,-100],[208,-100],[208,-84],[192,-84]], h:108 },
             { name:'post 3', poly:[[292,-100],[308,-100],[308,-84],[292,-84]], h:108 },
             { name:'bay', poly:[[490,-150],[630,-150],[630,-80],[490,-80]], h:330 },
             { name:'hydrangeas', poly:[[330,-164],[480,-164],[480,-150],[330,-150]], h:30 },
             { name:'lamp', c:[720,-40], r:6, h:96, prop:true },
             { name:'ac unit', poly:[[94,-498],[146,-498],[146,-470],[94,-470]], h:36, prop:true },
             { name:'bin', poly:[[682,-520],[718,-520],[718,-484],[682,-484]], h:52, prop:true } ],
    marks:{ door:[250,-150], mat:[250,-150+35.4] }
  },
  prof:[[-150,220],[-310,340],[-470,220]],
  yard(c){
    houseLawn(0, 809.6, -150, 0, '#7fa35a');
    T(215, 285, -92, 0, 0.6, '#c9c1b0');
    T(80, 320, -150, -92, 2, shade(c.trim,.84));
  },
  shingles(a0, a1, z0, z1, b, c){ for(let z = z0 + 6; z < z1; z += 6) poly([P(a0,b,z), P(a1,b,z)], null, shade(c.wall,.84), 1); },
  bay(c){
    const seen = houseHalfBay(560, -150, 70, 6, 0, 250, c.wall);
    for(const f of seen){
      houseFaceWin(f, 0.22, 0.78, 40, 104, c.trim);
      houseFaceWin(f, 0.22, 0.78, 146, 206, c.trim);
    }
    houseHalfCone(560, -150, 78, 6, 244, 330, c.roof);
  },
  walls(c, d){
    houseMass(60, 640, -150, -470, 220, c.wall, d);
    const face = d > 0 ? -150 : -470;
    this.shingles(60, 640, 0, 220, face + 0.3*d, c);
    houseSideWins(60, 640, -150, -470, [[40,104],[146,206]], c.trim);
    if(d > 0){
      houseDoorway(250, -150, HOUSE_SC, c.trim, c.leaf, 1);
      for(const [a0, a1] of [[110,160],[330,380],[410,460]]) houseWin(a0, a1, 40, 104, -150, c.trim, c.trim, 1);
      for(const [a0, a1] of [[110,160],[225,275],[340,390]]) houseWin(a0, a1, 146, 206, -150, c.trim, c.trim, 1);
    } else {
      for(const [a0, a1] of [[120,170],[300,350],[500,550]]) houseWin(a0, a1, 146, 206, -470, c.trim, c.trim, -1);
      rearDoor(400, c.wall, c.leaf, 470, 92);
    }
    houseProfileRoof(60, 640, this.prof, 14, c.roof, c.wall, { gable:shade(c.wall,.8) });
  },
  dormer(c){
    const k = 120/160, zs = b => 220 + (-150 - b)*k, bD = -176, z0 = zs(bD);
    F(100, 420, z0, 290, c.wall, shade(c.wall,.6), 1, bD);
    this.shingles(100, 420, z0, 290, bD + 0.3, c);
    const aS = FLANK_RIGHT ? 420 : 100, bI = -150 - (290-220)/k;
    poly([P(aS,bD,z0), P(aS,bD,290), P(aS,bI,290)], shade(c.wall,.76), shade(c.wall,.6), 1);
    for(const a0 of [130, 230, 330]) houseWin(a0, a0 + 60, z0 + 10, 280, bD, c.trim, c.trim, 1, { plain:true });
    poly([P(94,bD+6,296), P(426,bD+6,296), P(426,bI-10,300), P(94,bI-10,300)], c.roof, shade(c.roof,.6), 1);
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    for(const aa of [90, 200, 300]) box(aa-8, aa+8, -100, -84, 2, 108, c.wall, shade(c.wall,.9), shade(c.wall,.76));
    houseProfileRoof(76, 316, [[-86,106],[-150,130]], 8, c.roof, c.wall, { ext1:false, gable:shade(c.wall,.8) });
    for(let a = 336; a < 480; a += 14){ ball(a, -157, 14, 11, '#4f7a4a'); ball(a+2, -156, 22, 7, c.bloom); }
    houseProp('lamp', () => { cyl(720, -40, 0, 84, 2.5, '#2a2a2e'); box(714, 726, -46, -34, 84, 98, '#3a3a3e', 'rgba(250,230,160,.85)', 'rgba(230,205,140,.85)'); });
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.walls(c, 1);
    this.dormer(c);
    this.bay(c);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); this.fore(p);
    this.bay(c);
    this.walls(c, -1);
    houseProp('ac unit', () => acUnit(120, 0, 470));
    houseProp('bin', () => wheelieBin(700, '#3f6b4a', 0, 470));
  }
},
/* ------------------------------------------------------------------ 49 */
{
  name:'Monterey Colonial', hood:'The Flats', tier:'double', sc:HOUSE_SC, ww:HOUSE_DOUBLE, dd:HOUSE_DEPTH_LAB,
  head:'Monterey Colonial: stucco below, timber above, full-length balcony under the roof',
  desc:'A two-storey Monterey Colonial: whitewashed stucco ground floor, dark timber upper floor, a low side gable that runs out over a full-length second-floor balcony on slim posts with a wooden balustrade, French doors onto it, iron-grilled windows below, and clay pots.',
  tags:['double','monterey','balcony','colonial'],
  door:[405, -170],
  liv:[ { wall:'#f4efe4', wood:'#4a3a2e', roof:'#8a4a36', leaf:'#4a3a2e', trim:'#3f5a3a' },
        { wall:'#efe6d6', wood:'#3a4a3e', roof:'#6b4a3e', leaf:'#3a4a3e', trim:'#6b2e2a' },
        { wall:'#f2ece2', wood:'#5a4030', roof:'#9c5a3e', leaf:'#5a4030', trim:'#2e4d68' } ],
  vol:{
    foot:[[60,-170],[750,-170],[750,-480],[60,-480]], h:310,
    solids:[ { name:'pot L', c:[300,-60], r:14, h:44, prop:true },
             { name:'pot R', c:[510,-60], r:14, h:44, prop:true },
             { name:'bench', poly:[[120,-80],[180,-80],[180,-64],[120,-64]], h:24, prop:true },
             { name:'ac unit', poly:[[94,-508],[146,-508],[146,-480],[94,-480]], h:36, prop:true },
             { name:'bin', poly:[[682,-530],[718,-530],[718,-494],[682,-494]], h:52, prop:true } ],
    marks:{ door:[405,-170], mat:[405,-170+35.4] }
  },
  prof:[[-116,236],[-325,310],[-480,240]],
  yard(c){
    houseLawn(0, 809.6, -170, 0, '#86a85e');
    T(370, 440, -170, 0, 0.6, '#c9a07a');
  },
  walls(c, d){
    houseMass(60, 750, -170, -480, 120, c.wall, d);
    const face = d > 0 ? -170 : -480, zt = d > 0 ? 255 : 240;
    F(60, 750, 120, zt, c.wood, shade(c.wood,.6), 1, face);
    for(let a = 66; a < 750; a += 10) F(a, a+1.4, 120, zt, shade(c.wood,1.2), null, 0, face + 0.2*d);
    houseSideWins(60, 750, -170, -480, [[40,100]], c.trim, { plain:true });
    const g = a => [[a,-170,120],[a,-170,255],[a,-325,310],[a,-480,240],[a,-480,120]];
    houseFace(g(60), [405,-320,200], shade(c.wood,.9), shade(c.wood,.6));
    houseFace(g(750), [405,-320,200], shade(c.wood,.9), shade(c.wood,.6));
    houseSideWins(60, 750, -170, -480, [[146,210]], '#f4efe4', { skipFront:40 });
    if(d > 0){
      houseDoorway(405, -170, HOUSE_SC, c.wood, c.leaf, 1);
      for(const [a0, a1] of [[120,170],[250,300],[510,560],[640,690]]){ houseWin(a0, a1, 36, 100, -170, c.wood, c.wood, 1, { plain:true }); for(let a = a0 + 6; a < a1; a += 9) F(a, a+1.6, 36, 100, '#2a2a2e', null, 0, -169); }
      for(const [a0, a1] of [[120,170],[250,300],[380,430],[510,560],[640,690]]) houseWin(a0, a1, 132, 222, -170, '#f4efe4', '#f4efe4', 1, { shutter:c.trim });
    } else {
      for(const [a0, a1] of [[140,190],[380,430],[620,670]]) houseWin(a0, a1, 146, 210, -480, '#f4efe4', '#f4efe4', -1);
      rearDoor(300, c.wall, c.leaf, 480, 92);
    }
  },
  balcony(c){
    slab(60, 750, 120, 126, -116, -170, shade(c.wood,.9));
    F(60, 750, 126, 158, 'rgba(0,0,0,0)', null, 0, -116);
    F(60, 750, 156, 160, c.wood, null, 0, -115.6);
    for(let a = 64; a < 750; a += 7) F(a, a+2, 126, 156, c.wood, null, 0, -115.6);
    for(let a = 66; a < 752; a += 114) box(a-3, a+3, -122, -116, 126, 236, c.wood, shade(c.wood,1.1), shade(c.wood,.9));
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    this.balcony(c);
    houseProfileRoof(60, 750, this.prof, 10, c.roof, c.wood, { noEnds:true });
    for(const [nm, aa] of [['pot L', 300], ['pot R', 510]])
      houseProp(nm, () => { ball(aa, -60, 18, 16, '#b86a4a'); cyl(aa, -60, 26, 36, 9, '#a55a3c'); ball(aa, -60, 44, 10, '#6b9a5a'); });
    houseProp('bench', () => {
      box(120, 180, -80, -64, 16, 20, c.wood, shade(c.wood,.88), shade(c.wood,.76));
      for(const aa of [124, 176]) box(aa-2, aa+2, -78, -66, 0, 16, shade(c.wood,.7), shade(c.wood,.6), shade(c.wood,.5));
    });
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.walls(c, 1);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.balcony(c);
    houseProp('pot L', () => ball(300, -60, 18, 16, '#b86a4a'));
    houseProp('pot R', () => ball(510, -60, 18, 16, '#b86a4a'));
    houseProp('bench', () => box(120, 180, -80, -64, 0, 20, c.wood, shade(c.wood,.88), shade(c.wood,.76)));
    this.walls(c, -1);
    houseProfileRoof(60, 750, this.prof, 10, c.roof, c.wood, { noEnds:true });
    houseProp('ac unit', () => acUnit(120, 0, 480));
    houseProp('bin', () => wheelieBin(700, '#3f6b4a', 0, 480));
  }
},
/* ------------------------------------------------------------------ 50 */
{
  name:'Bywater Shotgun', hood:'The Flats', tier:'single', sc:HOUSE_SC, ww:HOUSE_SINGLE, dd:HOUSE_DEPTH_LAB,
  head:'Shotgun house: one room wide and deep, front gable, bracketed porch, side yards',
  desc:'A narrow, deep shotgun house one room wide under a steep street gable with shingles in the peak, a full-width porch with turned posts and scroll brackets, a tall window beside the door, a gravel drive on one side and a banana-plant garden on the other.',
  tags:['single','shotgun','front gable','porch'],
  door:[195, -120],
  liv:[ { wall:'#f2c94a', trim:'#fbfaf5', roof:'#4a4e52', leaf:'#2e6f8a', gable:'#2e6f8a' },
        { wall:'#6ac0b8', trim:'#fbfaf5', roof:'#44403c', leaf:'#d9573c', gable:'#d9573c' },
        { wall:'#e88aa0', trim:'#fbfaf5', roof:'#3e4448', leaf:'#3f6b4a', gable:'#3f6b4a' } ],
  vol:{
    foot:[[150,-120],[310,-120],[310,-520],[150,-520]], h:240,
    solids:[ { name:'post L', c:[146,-66], r:4, h:108 }, { name:'post R', c:[314,-66], r:4, h:108 },
             { name:'banana', c:[400,-80], r:10, h:120, prop:true },
             { name:'planter', c:[290,-90], r:10, h:30, prop:true },
             { name:'ac unit', poly:[[340,-332],[368,-332],[368,-280],[340,-280]], h:36, prop:true } ],
    marks:{ door:[195,-120], mat:[195,-120+35.4] }
  },
  yard(c){
    houseLawn(0, 460, -552, 0, '#7fa35a');
    T(10, 140, -552, 0, 0.5, '#bdb8ae');
    T(170, 220, -60, 0, 0.6, '#c9c1b0');
    T(140, 320, -120, -60, 3, shade(c.trim,.84));
    F(140, 320, 0, 3, shade(c.trim,.66), null, 0, -60);
  },
  walls(c, d){
    houseMass(150, 310, -120, -520, 150, c.wall, d);
    const face = d > 0 ? -120 : -520;
    for(let z = 12; z < 148; z += 8) poly([P(150,face+0.3*d,z), P(310,face+0.3*d,z)], null, shade(c.wall,.88), 1);
    houseSideWins(150, 310, -120, -520, [[26,110]], c.trim, { pitch:90 });
    houseFrontGable(150, 310, -120, -520, 150, 230, 10, c.roof, c.wall, d, { gable:c.gable, shingle:true, barge:c.trim });
    if(d > 0){
      houseDoorway(195, -120, HOUSE_SC, c.trim, c.leaf, 1);
      houseWin(250, 294, 10, 110, -120, c.trim, c.trim, 1);
      houseWin(218, 242, 170, 196, -120, c.trim, c.trim, 1, { plain:true });
    } else {
      houseWin(180, 220, 30, 100, -520, c.trim, c.trim, -1);
      rearDoor(270, c.wall, c.leaf, 520, 92);
    }
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    for(const aa of [146, 314]){
      box(aa-3, aa+3, -69, -63, 3, 108, c.trim, shade(c.trim,.9), shade(c.trim,.76));
      for(const z of [30, 60]) box(aa-4.5, aa+4.5, -70.5, -61.5, z, z+4, c.trim, shade(c.trim,.88), shade(c.trim,.74));
      const s = aa < 230 ? 1 : -1;
      poly([P(aa,-64,96), P(aa + 22*s,-64,108), P(aa,-64,108)], c.trim, shade(c.trim,.7), 1);
    }
    houseHip(140, 320, -60, -120, 108, 124, 6, c.roof, { lo:true, hi:true });
    houseProp('banana', () => { cyl(400, -80, 0, 70, 5, '#8a9a5a'); for(let k = 0; k < 6; k++){ const t = k/6*Math.PI*2; poly([P(400,-80,70), P(400 + Math.cos(t)*34, -80 + Math.sin(t)*34, 96), P(400 + Math.cos(t)*40, -80 + Math.sin(t)*40, 84)], k % 2 ? '#5f9a4a' : '#4f8a3e'); } });
    houseProp('planter', () => { cyl(290, -90, 3, 22, 10, '#6b6660'); ball(290, -90, 28, 11, '#d9573c'); });
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.walls(c, 1);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); this.fore(p);
    /* the side-yard unit is on the far side from behind: before the walls */
    houseProp('ac unit', () => { box(340, 368, -332, -280, 0, 36, '#c9ccce', '#b8bbbd', '#a4a7a9'); faceCircle(354, -280, 18, 12, '#8a8d90'); });
    this.walls(c, -1);
  }
},
/* ------------------------------------------------------------------ 51 */
{
  name:'Piney Dogtrot', hood:'The Flats', tier:'single', sc:HOUSE_SC, ww:HOUSE_SINGLE, dd:HOUSE_DEPTH_LAB,
  head:'Dogtrot: two log-sided cabins joined by an open breezeway under one tin roof',
  desc:'A Southern dogtrot: two plank cabins with an open breezeway running through between them, all under one long tin roof that also covers a full-width front porch, stone chimneys at both ends, rockers and a washtub on the porch.',
  tags:['single','dogtrot','breezeway','tin roof','porch'],
  door:[110, -130],
  liv:[ { wall:'#a8845c', roof:'#8a9096', trim:'#e8dcc4', leaf:'#5a3a28', stone:'#a8a296' },
        { wall:'#c9ab7c', roof:'#6f747a', trim:'#efe4cc', leaf:'#2f4a3a', stone:'#9c968a' },
        { wall:'#8a7058', roof:'#9a8a70', trim:'#e0d4bc', leaf:'#7a2e2a', stone:'#b3ada2' } ],
  vol:{
    foot:[[30,-130],[190,-130],[190,-470],[30,-470]], h:280,
    solids:[ { name:'cabin R', poly:[[270,-130],[430,-130],[430,-470],[270,-470]], h:280 },
             { name:'chimney L', poly:[[8,-320],[30,-320],[30,-280],[8,-280]], h:300 },
             { name:'chimney R', poly:[[430,-320],[452,-320],[452,-280],[430,-280]], h:300 },
             ...[36, 150, 230, 310, 424].map((a, i) => ({ name:'post ' + (i+1), c:[a,-86], r:4, h:104 })),
             { name:'rocker', c:[350,-110], r:14, h:48, prop:true },
             { name:'washtub', c:[230,-110], r:12, h:24, prop:true },
             { name:'woodpile', poly:[[200,-502],[260,-502],[260,-474],[200,-474]], h:28, prop:true } ],
    marks:{ door:[110,-130], mat:[110,-130+35.4] }
  },
  prof:[[-80,104],[-300,280],[-470,120]],
  yard(c){
    houseLawn(0, 460, -552, 0, '#7a9a56');
    T(30, 430, -130, -80, 3, '#8a6a48');
    for(let a = 40; a < 430; a += 10) poly([P(a,-130,3.1), P(a,-80,3.1)], null, '#6a5038', 1);
    T(190, 270, -470, -130, 0.8, '#9a8a70');
  },
  gable(a){ return [[a,-130,0],[a,-130,144],[a,-300,280],[a,-470,120],[a,-470,0]]; },
  cabin(c, a0, a1, d, door){
    houseMass(a0, a1, -130, -470, 116, c.wall, d);
    const face = d > 0 ? -130 : -470;
    for(let z = 8; z < 116; z += 9) poly([P(a0,face+0.3*d,z), P(a1,face+0.3*d,z)], null, shade(c.wall,.78), 1);
    const ctr = [(a0+a1)/2, -320, 60];
    for(const a of [a0, a1]) houseFace(this.gable(a), ctr, shade(c.wall,.8), shade(c.wall,.6));
    houseSideWins(a0, a1, -130, -470, [[30,90]], c.trim);
    if(d > 0){ if(door) houseDoorway(door, -130, HOUSE_SC, c.trim, c.leaf, 1); else houseWin(a0 + 50, a1 - 50, 30, 90, -130, c.trim, c.trim, 1); }
    else houseWin(a0 + 50, a1 - 50, 30, 90, -470, c.trim, c.trim, -1);
  },
  chimney(c, a0){
    box(a0, a0 + 22, -320, -280, 0, 300, shade(c.stone,1.06), c.stone, shade(c.stone,.8));
    for(let z = 10; z < 300; z += 13) F(a0, a0 + 22, z, z+1.6, shade(c.stone,.72), null, 0, -279.6);
  },
  roof(c){ houseProfileRoof(30, 430, this.prof, 10, c.roof, c.wall, { noEnds:true, seams:14 }); },
  props(c){
    houseProp('rocker', () => houseRocker(350, -110, '#8a5a3a'));
    houseProp('washtub', () => { cyl(230, -110, 3, 22, 12, '#9ea3a8', '#b8bcc0'); cyl(230, -110, 20, 22, 12.6, '#7a7e82'); });
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    for(const aa of [36, 150, 230, 310, 424]) box(aa-3, aa+3, -89, -83, 3, 104, '#8a6a48', '#7a5a3c', '#6a4e34');
    this.props(c);
    this.roof(c);
    this.chimney(c, 430);
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.chimney(c, 8);
    this.cabin(c, 30, 190, 1, 110);
    this.cabin(c, 270, 430, 1, 0);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    for(const aa of [36, 150, 230, 310, 424]) box(aa-3, aa+3, -89, -83, 3, 104, '#8a6a48', '#7a5a3c', '#6a4e34');
    this.props(c);
    this.chimney(c, 430);
    this.cabin(c, 270, 430, -1, 0);
    this.cabin(c, 30, 190, -1, 0);
    rearDoor(110, c.wall, c.leaf, 470, 92);
    this.roof(c);
    this.chimney(c, 8);
    houseProp('woodpile', () => {
      box(200, 260, -502, -474, 0, 28, '#8a6848', '#7a5a3c', '#6a4e34');
      for(let a = 206; a < 258; a += 10) for(const z of [7, 20]) faceCircle(a, -502.4, z, 5, '#c9a878', '#7a5a3c', 1);
    });
  }
},
/* ------------------------------------------------------------------ 52 */
{
  name:'Dessau Bauhaus', hood:'The Flats', tier:'single', sc:HOUSE_SC, ww:HOUSE_SINGLE, dd:HOUSE_DEPTH_LAB,
  head:'Bauhaus: white cubes, flat roofs, ribbon windows, piped roof terrace',
  desc:'A white Bauhaus house of two cubes: a two-storey block with a long ribbon window and a glazed ground floor, and a single-storey block whose roof is a terrace behind a steel pipe rail; a thin steel canopy over a primary-red door.',
  tags:['single','bauhaus','modern','flat roof','terrace'],
  door:[110, -120],
  liv:[ { wall:'#f7f7f4', accent:'#d9352a', frame:'#2a2a2e', coping:'#e4e4e0' },
        { wall:'#f4f2ea', accent:'#2e5a9a', frame:'#2a2a2e', coping:'#e2e0d8' },
        { wall:'#f6f6f2', accent:'#e0b43a', frame:'#2a2a2e', coping:'#e2e2de' } ],
  vol:{
    foot:[[40,-120],[300,-120],[300,-200],[430,-200],[430,-480],[40,-480]], h:240,
    solids:[ { name:'planter', poly:[[200,-70],[290,-70],[290,-50],[200,-50]], h:30, prop:true },
             { name:'lamp', c:[380,-60], r:6, h:84, prop:true },
             { name:'ac unit', poly:[[74,-508],[126,-508],[126,-480],[74,-480]], h:36, prop:true } ],
    marks:{ door:[110,-120], mat:[110,-120+35.4] }
  },
  yard(c){
    T(0, 460, -200, 0, 0.3, '#dcd8ce');
    houseLawn(300, 460, -200, -110, '#86a85e');
    for(let b = -112; b < -16; b += 20) T(86, 134, b, b+14, 0.7, '#bdb9b0');
  },
  blockA(c, d){
    houseMass(40, 300, -120, -480, 230, c.wall, d);
    const face = d > 0 ? -120 : -480;
    F(40, 300, 226, 234, c.coping, null, 0, face + 0.3*d);
    houseSideWins(40, 300, -120, -480, [[150,196]], c.frame, { plain:true, w:70, pitch:100 });
    if(d > 0){
      houseDoorway(110, -120, HOUSE_SC, c.frame, c.accent, 1);
      if(HOUSE_REC) HOUSE_REC.push({ kind:'win', a0:156, a1:284, z0:16, z1:104, b:-120 });
      F(160, 280, 20, 100, '#2c3a42', c.frame, 1.6, -119.6);
      for(let a = 190; a < 280; a += 30) F(a-1, a+1, 20, 100, c.frame, null, 0, -119.2);
      F(60, 280, 150, 196, '#2c3a42', c.frame, 1.6, -119.6);
      for(let a = 104; a < 280; a += 44) F(a-1, a+1, 150, 196, c.frame, null, 0, -119.2);
    } else {
      F(70, 270, 150, 196, '#2c3a42', c.frame, 1.6, -480.4);
      rearDoor(200, c.wall, c.accent, 480, 92);
    }
    T(40, 300, -480, -120, 234, c.coping);
  },
  blockB(c, d){
    houseMass(300, 430, -200, -480, 120, c.wall, d);
    const face = d > 0 ? -200 : -480;
    houseSideWins(300, 430, -200, -480, [[30,96]], c.frame, { plain:true, w:60, pitch:100 });
    if(d > 0){ F(320, 410, 30, 96, '#2c3a42', c.frame, 1.6, -199.6); F(364, 366, 30, 96, c.frame, null, 0, -199.2); }
    T(300, 430, -480, -200, 120, c.coping);
    houseRailRing(304, 426, -476, -204, 120, 28, c.frame);
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    box(60, 176, -120, -70, 112, 116, c.frame, shade(c.frame,1.3), shade(c.frame,1.15));
    houseProp('planter', () => { box(200, 290, -70, -50, 0, 22, c.coping, shade(c.coping,.9), shade(c.coping,.78)); for(let a = 208; a < 288; a += 12) ball(a, -60, 26, 7, '#5c8a56'); });
    houseProp('lamp', () => { cyl(380, -60, 0, 70, 2, c.frame); ball(380, -60, 76, 7, '#f4f2ea'); });
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.blockA(c, 1);
    this.blockB(c, 1);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); this.fore(p);
    this.blockB(c, -1);
    this.blockA(c, -1);
    houseProp('ac unit', () => acUnit(100, 0, 480));
  }
},
/* ------------------------------------------------------------------ 53 */
{
  name:'Garrison Colonial', hood:'The Flats', tier:'double', sc:HOUSE_SC, ww:HOUSE_DOUBLE, dd:HOUSE_DEPTH_LAB,
  head:'Garrison Colonial: jettied upper floor with pendant drops, attached garage',
  desc:'A suburban Garrison Colonial: the upper floor jettied out over the ground floor on carved pendant drops, a steep side gable, symmetrical shuttered windows, a pedimented door hood, an attached two-bay garage wing on the drive, a lamp post and shrubs.',
  tags:['double','colonial','garrison','garage'],
  door:[310, -150],
  liv:[ { wall:'#c9b98f', upper:'#8a6a4a', trim:'#f7f4ec', roof:'#4a4642', leaf:'#1f2a24', shut:'#1f2a24', gar:'#efe9dc' },
        { wall:'#e8e4da', upper:'#6f8a9a', trim:'#fbfbf8', roof:'#3e4448', leaf:'#8a2f2f', shut:'#2e3a4a', gar:'#f2f0ea' },
        { wall:'#dfd2b8', upper:'#9a4a3a', trim:'#fbf6ea', roof:'#44403c', leaf:'#2e4d68', shut:'#3f4a3e', gar:'#efe6d6' } ],
  vol:{
    foot:[[60,-150],[560,-150],[560,-170],[760,-170],[760,-470],[60,-470]], h:330,
    solids:[ { name:'shrubs', poly:[[380,-164],[540,-164],[540,-150],[380,-150]], h:26 },
             { name:'lamp', c:[440,-40], r:6, h:84, prop:true },
             { name:'ac unit', poly:[[94,-498],[146,-498],[146,-470],[94,-470]], h:36, prop:true },
             { name:'bin', poly:[[682,-520],[718,-520],[718,-484],[682,-484]], h:52, prop:true } ],
    marks:{ door:[310,-150], mat:[310,-150+35.4] }
  },
  prof:[[-134,230],[-302,320],[-470,230]],
  yard(c){
    houseLawn(0, 809.6, -150, 0, '#86a85e');
    T(580, 750, -170, 0, 0.6, '#bdb8ae');
    T(275, 345, -150, 0, 0.7, '#d4cdbd');
  },
  lower(c, d){
    houseMass(60, 560, -150, -470, 110, c.wall, d);
    const face = d > 0 ? -150 : -470;
    for(let z = 10; z < 108; z += 7) poly([P(60,face+0.3*d,z), P(560,face+0.3*d,z)], null, shade(c.wall,.86), 1);
    houseSideWins(60, 560, -150, -470, [[34,96]], c.trim);
    if(d > 0){
      houseDoorway(310, -150, HOUSE_SC, c.trim, c.leaf, 1);
      for(const [a0, a1] of [[100,150],[190,240],[380,430],[470,520]]) houseWin(a0, a1, 30, 96, -150, c.trim, c.trim, 1, { shutter:c.shut });
    } else {
      for(const [a0, a1] of [[120,170],[440,490]]) houseWin(a0, a1, 30, 96, -470, c.trim, c.trim, -1);
      rearDoor(300, c.wall, c.leaf, 470, 92);
    }
  },
  upper(c, d){
    box(60, 560, -470, -134, 110, 230, shade(c.upper,1.04), c.upper, shade(c.upper,.8));
    const face = d > 0 ? -134 : -470;
    for(let z = 118; z < 228; z += 7) poly([P(60,face+0.3*d,z), P(560,face+0.3*d,z)], null, shade(c.upper,.86), 1);
    houseSideWins(60, 560, -134, -470, [[140,200]], c.trim);
    if(d > 0){
      for(const [a0, a1] of [[100,150],[190,240],[285,335],[380,430],[470,520]]) houseWin(a0, a1, 140, 200, -134, c.trim, c.trim, 1, { shutter:c.shut });
      for(const a of [64, 186, 310, 434, 556]){ box(a-3, a+3, -140, -134, 96, 110, c.trim, shade(c.trim,.9), shade(c.trim,.76)); ball(a, -137, 94, 3.6, c.trim); }
    } else for(const [a0, a1] of [[120,170],[285,335],[440,490]]) houseWin(a0, a1, 140, 200, -470, c.trim, c.trim, -1, { shutter:c.shut });
    houseProfileRoof(60, 560, this.prof, 10, c.roof, c.upper);
  },
  garage(c, d){
    houseMass(560, 760, -170, -470, 110, c.wall, d);
    const face = d > 0 ? -170 : -470;
    for(let z = 10; z < 108; z += 7) poly([P(560,face+0.3*d,z), P(760,face+0.3*d,z)], null, shade(c.wall,.86), 1);
    houseSideWins(560, 760, -170, -470, [[34,96]], c.trim);
    if(d > 0) for(const [a0, a1] of [[578,654],[666,742]]){
      F(a0, a1, 0, 86, c.gar, shade(c.gar,.7), 1.2, -169.6);
      for(let z = 17; z < 86; z += 17) F(a0, a1, z-1.2, z, shade(c.gar,.82), null, 0, -169.4);
    }
    houseProfileRoof(560, 760, [[-170,110],[-320,170],[-470,110]], 10, c.roof, c.wall, { lo:false });
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    houseFrontGable(266, 354, -136, -150, 100, 116, 4, c.roof, c.trim, 1, { back0:true, barge:c.trim });
    for(let a = 386; a < 540; a += 14) ball(a, -157, 12, 10, a % 28 ? '#4f7a4a' : '#5c8a56');
    houseProp('lamp', () => { cyl(440, -40, 0, 70, 2.5, '#2a2a2e'); box(434, 446, -46, -34, 70, 84, '#3a3a3e', 'rgba(250,230,160,.85)', 'rgba(230,205,140,.85)'); });
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.lower(c, 1);
    this.upper(c, 1);
    this.garage(c, 1);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); this.fore(p);
    this.garage(c, -1);
    this.lower(c, -1);
    this.upper(c, -1);
    houseProp('ac unit', () => acUnit(120, 0, 470));
    houseProp('bin', () => wheelieBin(700, '#3f6b4a', 0, 470));
  }
},
/* ------------------------------------------------------------------ 54 */
{
  name:'Ubud Bali Villa', hood:'The Flats', tier:'double', sc:HOUSE_SC, ww:HOUSE_DOUBLE, dd:HOUSE_DEPTH_LAB,
  head:'Balinese villa: two-tier steep roof, carved teak, split gate, open bale pavilion',
  desc:'A Balinese garden villa: carved teak walls under a two-tier roof whose steep upper tier rises from the ridge of the lower, a split stone gate with a stepped wall at the street, an open bale pavilion on four posts, a lotus pond and frangipani trees.',
  tags:['double','balinese','tiered roof','pavilion','garden'],
  yardFence:{ style:'wall', h:36, col:'stone', cap:'roof' },
  door:[340, -170],
  liv:[ { wood:'#8a5a34', roof:'#4a3a30', stone:'#8f8a80', leaf:'#5a3a1e', gold:'#c9a24a' },
        { wood:'#a06a3e', roof:'#3e3a34', stone:'#9c968a', leaf:'#4a2e1a', gold:'#d4b060' },
        { wood:'#7a4e2e', roof:'#52443a', stone:'#8a857b', leaf:'#6b3a1e', gold:'#c9a24a' } ],
  vol:{
    foot:[[120,-170],[560,-170],[560,-440],[120,-440]], h:320,
    solids:[ { name:'gate L', poly:[[280,-24],[310,-24],[310,-4],[280,-4]], h:140 },
             { name:'gate R', poly:[[370,-24],[400,-24],[400,-4],[370,-4]], h:140 },
             { name:'wall L', poly:[[6,-14],[280,-14],[280,-4],[6,-4]], h:40 },
             { name:'wall R', poly:[[400,-14],[804,-14],[804,-4],[400,-4]], h:40 },
             ...[[604,-124],[756,-124],[604,-276],[756,-276]].map(([a, b], i) => ({ name:'bale post ' + (i+1), c:[a, b], r:5, h:110 })),
             { name:'frangipani L', c:[60,-80], r:7, h:140, prop:true },
             { name:'frangipani R', c:[520,-80], r:7, h:140, prop:true },
             { name:'ac unit', poly:[[134,-468],[186,-468],[186,-440],[134,-440]], h:36, prop:true },
             { name:'bin', poly:[[482,-490],[518,-490],[518,-454],[482,-454]], h:52, prop:true } ],
    marks:{ door:[340,-170], mat:[340,-170+35.4] }
  },
  yard(c){
    houseLawn(0, 809.6, -552, 0, '#6f9a4e');
    for(const [a, b] of [[334,-150],[346,-128],[334,-106],[346,-84],[334,-62],[346,-40]]) plateCircle(a, b, 0.8, 12, c.stone, shade(c.stone,.7), 1);
    T(420, 560, -140, -60, 0.5, '#5f9ab0');
    for(const [a, b] of [[450,-90],[500,-120],[530,-80]]) { plateCircle(a, b, 0.7, 10, '#4f8a4a'); ball(a+2, b, 3, 3.4, '#f2a0c0'); }
    T(596, 764, -284, -116, 8, shade(c.stone,1.05));
  },
  walls(c, d){
    houseMass(120, 560, -170, -440, 110, c.wood, d);
    const face = d > 0 ? -170 : -440;
    for(let a = 130; a < 560; a += 40){ F(a, a+30, 20, 96, shade(c.wood,1.08), shade(c.wood,.7), 1, face + 0.3*d); F(a+6, a+24, 30, 86, shade(c.wood,.92), null, 0, face + 0.5*d); }
    houseSideWins(120, 560, -170, -440, [[30,96]], shade(c.wood,.7), { plain:true, w:40, pitch:80 });
    if(d > 0){ houseDoorway(340, -170, HOUSE_SC, c.gold, c.leaf, 1); F(292, 388, 102, 108, c.gold, null, 0, -169.4); }
    else rearDoor(340, c.wood, c.leaf, 440, 92);
  },
  roof(c){
    houseHip(120, 560, -170, -440, 110, 190, 30, c.roof);
    houseHip(240, 440, -240, -370, 190, 300, 14, c.roof);
    if(state.roof){ cyl(340, -305, 300, 318, 2, c.gold); ball(340, -305, 322, 4, c.gold); }
  },
  bale(c){
    for(const [a, b] of [[604,-276],[756,-276],[604,-124],[756,-124]]) cyl(a, b, 8, 110, 5, c.wood, shade(c.wood,1.1));
    houseHip(596, 764, -116, -284, 110, 190, 12, c.roof);
  },
  gate(c){
    const tower = a0 => { for(const [dz, ins] of [[0,0],[50,4],[90,8],[120,12]]) box(a0 + ins, a0 + 30 - ins, -24 + ins/2, -4 - ins/2, dz, dz + (dz < 120 ? 50 - (dz === 50 ? 10 : dz === 90 ? 20 : 0) : 20), shade(c.stone,1.06), c.stone, shade(c.stone,.8)); };
    for(const [a0, a1] of [[6, 280], [400, 804]]){ box(a0, a1, -14, -4, 0, 36, shade(c.stone,1.04), c.stone, shade(c.stone,.8)); box(a0-1, a1+1, -15, -3, 36, 40, c.roof, shade(c.roof,.9), shade(c.roof,.75)); }
    tower(280); tower(370);
  },
  trees(){
    for(const [nm, aa] of [['frangipani L', 60], ['frangipani R', 520]])
      houseProp(nm, () => { tube(aa, -80, 0, aa-10, -76, 90, 4, '#8a7a68'); tube(aa, -80, 60, aa+16, -84, 110, 3, '#8a7a68');
        for(const [x, b, z, r] of [[aa-12,-76,100,22],[aa+18,-84,118,18],[aa+2,-80,132,16]]){ ball(x, b, z, r, '#5f8f4a'); for(let k = 0; k < 4; k++) ball(x + (k-1.5)*7, b + 2, z + r*0.6, 3, '#f7f2e4'); } });
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    this.roof(c);
    this.gate(c);
    this.trees();
    if(!state.back) houseYardFence(this, this.liv[state.pal % this.liv.length], 'near');
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far');
    this.walls(c, 1);
    this.bale(c);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far');
    this.gate(c); this.trees();
    this.bale(c);
    this.walls(c, -1);
    this.roof(c);
    houseProp('ac unit', () => acUnit(160, 0, 440));
    houseProp('bin', () => wheelieBin(500, '#3f6b4a', 0, 440));
    houseYardFence(this, c, 'near');
  }
},
/* ------------------------------------------------------------------ 55 */
{
  name:'Solstice Eco House', hood:'The Flats', tier:'single', sc:HOUSE_SC, ww:HOUSE_SINGLE, dd:HOUSE_DEPTH_LAB,
  head:'Eco house: sawtooth roof of solar panels, clerestory glass, rain barrels, wind turbine',
  desc:'A timber-clad eco house under a sawtooth roof: three sheds whose slopes are covered in solar panels and whose tall faces are clerestory glass, raised vegetable beds, a rain barrel on the downpipe and a small wind turbine in the yard.',
  tags:['single','eco','solar','sawtooth','modern'],
  door:[230, -120],
  liv:[ { clad:'#b08a5a', roof:'#4a4e52', panel:'#23304a', leaf:'#3f6b3e', frame:'#2a2a2e' },
        { clad:'#8a9a8a', roof:'#44403c', panel:'#1f2a44', leaf:'#c9622a', frame:'#2a2a2e' },
        { clad:'#c9a878', roof:'#3e4448', panel:'#25304c', leaf:'#2e5a7a', frame:'#2a2a2e' } ],
  vol:{
    foot:[[40,-120],[420,-120],[420,-480],[40,-480]], h:230,
    solids:[ { name:'bed L', poly:[[30,-80],[150,-80],[150,-40],[30,-40]], h:22 },
             { name:'bed R', poly:[[310,-80],[430,-80],[430,-40],[310,-40]], h:22 },
             { name:'barrel', c:[412,-140], r:12, h:40, prop:true },
             { name:'turbine', c:[410,-20], r:5, h:200, prop:true },
             { name:'ac unit', poly:[[294,-508],[346,-508],[346,-480],[294,-480]], h:36, prop:true } ],
    marks:{ door:[230,-120], mat:[230,-120+35.4] }
  },
  teeth:[[-120,-240],[-240,-360],[-360,-480]],
  yard(c){
    houseLawn(0, 460, -120, 0, '#7fa35a');
    T(195, 265, -120, 0, 0.6, '#b8b2a6');
  },
  walls(c, d){
    houseMass(40, 420, -120, -480, 150, c.clad, d);
    const face = d > 0 ? -120 : -480;
    for(let a = 46; a < 420; a += 8) F(a, a+1.2, 0, 150, shade(c.clad,.84), null, 0, face + 0.2*d);
    houseSideWins(40, 420, -120, -480, [[30,110]], c.frame, { plain:true, w:50, pitch:120 });
    if(d > 0){
      houseDoorway(230, -120, HOUSE_SC, c.frame, c.leaf, 1);
      houseWin(80, 170, 30, 110, -120, c.frame, c.frame, 1, { plain:true });
      houseWin(290, 380, 30, 110, -120, c.frame, c.frame, 1, { plain:true });
    } else {
      F(100, 360, 20, 120, '#2c3a42', c.frame, 1.4, -480.4);
      rearDoor(400 - 40, c.clad, c.leaf, 480, 92);
    }
    /* teeth rise toward the back: the panelled slopes face the street, the
       tall glazed faces look back over the garden */
    for(const [b0, b1] of this.teeth){
      const glass = () => { F(46, 414, 154, 216, '#2c3a42', null, 0, b1 - 0.3); for(let a = 86; a < 414; a += 40) F(a-1, a+1, 154, 216, c.frame, null, 0, b1 - 0.5); };
      houseProfileRoof(40, 420, [[b0,150],[b1,220]], b0 === -120 ? 10 : 0, c.roof, c.clad, { ext1:false, onBack: glass });
      for(let a = 60; a < 404; a += 44) for(let t = 0.08; t < 0.9; t += 0.28){
        const q0 = b0 - (b0-b1)*t, q1 = b0 - (b0-b1)*(t + 0.24), z0 = 150 + 70*t + 0.8, z1 = 150 + 70*(t + 0.24) + 0.8;
        houseFace([[a,q0,z0],[a+40,q0,z0],[a+40,q1,z1],[a,q1,z1]], [230, (b0+b1)/2, 140], c.panel, '#8a9aaa');
      }
    }
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    for(const [a0, a1] of [[30, 150], [310, 430]]){
      box(a0, a1, -80, -40, 0, 22, '#8a6848', '#7a5a3c', '#6a4e34');
      for(let a = a0 + 10; a < a1; a += 16) ball(a, -60, 28, 7, a % 32 ? '#5c8a56' : '#6fa05a');
    }
    houseProp('barrel', () => { cyl(412, -140, 0, 40, 12, '#3f5a3a', '#4f6a48'); tube(412, -140, 40, 418, -126, 150, 1.6, '#6a6a70'); });
    houseProp('turbine', () => {
      cyl(410, -20, 0, 190, 2.4, '#dcdcd8');
      for(let k = 0; k < 3; k++){ const t = k/3*Math.PI*2 + 0.3; poly([P(410,-18,194), P(410 + Math.cos(t)*34, -18, 194 + Math.sin(t)*34/1.5), P(410 + Math.cos(t+0.2)*30, -18, 194 + Math.sin(t+0.2)*30/1.5)], '#f4f4f0', '#b8b8b4', 1); }
      ball(410, -19, 194, 4, '#dcdcd8');
    });
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.walls(c, 1);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); this.fore(p);
    this.walls(c, -1);
    houseProp('ac unit', () => acUnit(320, 0, 480));
  }
},
/* ------------------------------------------------------------------ 56 */
{
  name:'Glenmoray Baronial', hood:'The Flats', tier:'double', sc:HOUSE_SC, ww:HOUSE_DOUBLE, dd:HOUSE_DEPTH_LAB,
  head:'Scottish Baronial: rubble stone, crow-stepped gables, corbelled corner turret',
  desc:'A Scottish Baronial house in grey rubble stone: a steep slate side gable with crow-stepped gable ends, a corbelled bartizan turret hanging off the street corner under a cone, tall chimney stacks, a heavy arched doorway, small deep windows and a boulder garden.',
  tags:['double','baronial','crow steps','turret','stone'],
  door:[300, -150],
  liv:[ { stone:'#9c978c', roof:'#3e4448', trim:'#c9c3b8', leaf:'#3a2a22', harl:'#e2ddd0' },
        { stone:'#b3a890', roof:'#44403c', trim:'#d8d0bc', leaf:'#2e3a30', harl:'#ece4d0' },
        { stone:'#8a8a86', roof:'#3a3f44', trim:'#c4c4be', leaf:'#5a2a24', harl:'#dcdcd4' } ],
  vol:{
    foot:[[60,-150],[600,-150],[600,-470],[60,-470]], h:450,
    solids:[ { name:'boulder L', c:[160,-60], r:18, h:26, prop:true },
             { name:'boulder R', c:[460,-70], r:16, h:24, prop:true },
             { name:'lamp', c:[720,-40], r:6, h:96, prop:true },
             { name:'ac unit', poly:[[94,-498],[146,-498],[146,-470],[94,-470]], h:36, prop:true },
             { name:'bin', poly:[[482,-520],[518,-520],[518,-484],[482,-484]], h:52, prop:true } ],
    marks:{ door:[300,-150], mat:[300,-150+35.4] }
  },
  prof:[[-150,240],[-310,400],[-470,240]],
  yard(c){
    houseLawn(0, 809.6, -150, 0, '#6f9450');
    T(265, 335, -150, 0, 0.6, '#9c968a');
  },
  rubble(a0, a1, z0, z1, b, c, d){
    for(let z = z0 + 4; z < z1; z += 13) for(let a = a0 + ((z/13|0) % 2 ? 0 : 12); a < a1 - 6; a += 24)
      F(a, Math.min(a + 20, a1), z, z + 9, shade(c.stone, 0.88 + (((a*7 + z*3) | 0) % 5)*0.04), null, 0, b + 0.3*(d||1));
  },
  main(c, d){
    houseMass(60, 600, -150, -470, 240, c.stone, d);
    const face = d > 0 ? -150 : -470;
    this.rubble(60, 600, 0, 240, face, c, d);
    houseSideWins(60, 600, -150, -470, [[50,100],[160,210]], c.trim, { w:30 });
    if(d > 0){
      houseArch(300, -150, houseDoorDims(HOUSE_SC).h, 50, 22, shade(c.stone,.8), 1);
      houseDoorway(300, -150, HOUSE_SC, c.trim, c.leaf, 1);
      for(const [a0, a1] of [[120,160],[200,240],[380,420],[470,510]]) houseWin(a0, a1, 50, 100, -150, c.trim, c.trim, 1);
      for(const [a0, a1] of [[120,160],[200,240],[280,320],[380,420],[470,510]]) houseWin(a0, a1, 160, 210, -150, c.trim, c.trim, 1);
    } else {
      for(const [a0, a1] of [[140,180],[300,340],[460,500]]) houseWin(a0, a1, 160, 210, -470, c.trim, c.trim, -1);
      rearDoor(240, c.stone, c.leaf, 470, 92);
    }
    houseProfileRoof(60, 600, this.prof, 0, c.roof, c.stone, { gable:shade(c.stone,.84) });
    houseCrowSteps(60, 600, -150, -470, 240, 400, 5, c.stone);
    if(state.roof) for(const a of [90, 540]) box(a, a+34, -330, -290, 360, 450, shade(c.stone,1.04), c.stone, shade(c.stone,.8));
  },
  turret(c){
    for(const [z, r] of [[130,14],[140,22],[150,30]]) cyl(600, -150, z, z+10, r, shade(c.stone,.9), shade(c.stone,1.02));
    const seen = housePrism(houseRing(600,-150,34,10), 160, 300, c.harl, { top:false });
    for(const f of seen){ houseFaceWin(f, 0.25, 0.75, 200, 250, c.trim, { plain:true }); houseFaceWin(f, 0, 1, 292, 300, c.trim, { band:true }); }
    houseCone(600, -150, 40, 10, 296, 400, c.roof);
    if(state.roof){ cyl(600, -150, 400, 414, 1.2, '#2a2a2e'); ball(600, -150, 416, 2.6, '#c9a24a'); }
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    houseProp('boulder L', () => { ball(160, -60, 10, 18, '#8a857b'); ball(176, -54, 6, 10, '#7a756c'); });
    houseProp('boulder R', () => ball(460, -70, 9, 16, '#8f8a80'));
    houseProp('lamp', () => { cyl(720, -40, 0, 84, 2.5, '#2a2a2e'); box(714, 726, -46, -34, 84, 98, '#3a3a3e', 'rgba(250,230,160,.85)', 'rgba(230,205,140,.85)'); });
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.main(c, 1);
    this.turret(c);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); this.fore(p);
    this.turret(c);
    this.main(c, -1);
    houseProp('ac unit', () => acUnit(120, 0, 470));
    houseProp('bin', () => wheelieBin(500, '#3f6b4a', 0, 470));
  }
},
/* ------------------------------------------------------------------ 57 */
{
  name:'San Gabriel Mission Revival', hood:'The Flats', tier:'double', sc:HOUSE_SC, ww:HOUSE_DOUBLE, dd:HOUSE_DEPTH_LAB,
  head:'Mission Revival: curved parapet gable, quatrefoil, bell wall, red tile',
  desc:'A white stucco Mission Revival house: a low red-tile roof behind a scrolled Mission parapet gable with a quatrefoil window over the arched door, a pierced bell wall with its bell at the end, round-headed grilled windows, palms and a tiled fountain.',
  tags:['double','mission revival','parapet','bell wall','spanish'],
  door:[405, -160],
  liv:[ { wall:'#f5f0e4', roof:'#b8583a', trim:'#6b4a36', leaf:'#6b4a36', tile:'#2f6f8a' },
        { wall:'#f2e6d2', roof:'#a84e34', trim:'#3f4a3e', leaf:'#3f4a3e', tile:'#c9622a' },
        { wall:'#efece6', roof:'#c0613f', trim:'#2e4d68', leaf:'#2e4d68', tile:'#3f8a5a' } ],
  vol:{
    foot:[[60,-160],[750,-160],[750,-470],[60,-470]], h:330,
    solids:[ { name:'bell wall', poly:[[650,-172],[730,-172],[730,-156],[650,-156]], h:330 },
             { name:'palm L', c:[60,-60], r:7, h:190, prop:true },
             { name:'palm R', c:[760,-60], r:7, h:190, prop:true },
             { name:'fountain', c:[250,-70], r:26, h:40, prop:true },
             { name:'ac unit', poly:[[94,-498],[146,-498],[146,-470],[94,-470]], h:36, prop:true },
             { name:'bin', poly:[[682,-520],[718,-520],[718,-484],[682,-484]], h:52, prop:true } ],
    marks:{ door:[405,-160], mat:[405,-160+35.4] }
  },
  prof:[[-160,150],[-315,220],[-470,150]],
  yard(c){
    houseLawn(0, 809.6, -160, 0, '#86a85e');
    T(370, 440, -160, 0, 0.6, '#c9a07a');
  },
  parapet(c){
    const L = [[105,150],[105,190],[90,206],[96,224],[70,240],[70,262],[40,262],[40,282]];
    const top = []; for(let k = 0; k <= 10; k++){ const t = Math.PI*k/10; top.push([40*Math.cos(t), 282 + 26*Math.sin(t)]); }
    const pts = [...L.map(([x, z]) => [405 + x, z]), ...top.map(([x, z]) => [405 + x, z]), ...L.slice().reverse().map(([x, z]) => [405 - x, z])];
    poly(pts.map(([a, z]) => P(a, -166, z)), shade(c.wall,.8));
    poly(pts.map(([a, z]) => P(a, -160, z)), c.wall, shade(c.wall,.6), 1.2);
    for(const [da, dz] of [[-9,0],[9,0],[0,-9],[0,9]]) faceCircle(405 + da, -159.6, 226 + dz, 9, c.trim);
    for(const [da, dz] of [[-9,0],[9,0],[0,-9],[0,9]]) faceCircle(405 + da, -159.4, 226 + dz, 6.5, '#34424b');
  },
  bellwall(c){
    box(650, 730, -172, -156, 150, 300, shade(c.wall,1.02), c.wall, shade(c.wall,.8));
    const top = []; for(let k = 0; k <= 10; k++){ const t = Math.PI*k/10; top.push(P(690 + 40*Math.cos(t), -155.6, 300 + 30*Math.sin(t))); }
    poly([P(650,-155.6,300), ...top, P(730,-155.6,300)], c.wall, shade(c.wall,.6), 1);
    const arch = [P(672,-155.4,200)]; for(let k = 0; k <= 10; k++){ const t = Math.PI*(1 - k/10); arch.push(P(690 + 18*Math.cos(t), -155.4, 250 + 18*Math.sin(t))); }
    arch.push(P(708,-155.4,200)); poly(arch, '#2a2420');
    ball(690, -160, 236, 10, '#b8903a'); F(689, 691, 246, 268, '#3a3a3e', null, 0, -158);
  },
  walls(c, d){
    houseMass(60, 750, -160, -470, 150, c.wall, d);
    const face = d > 0 ? -160 : -470;
    for(let a = 64; a < 750; a += 12) F(a, a+10, 2, 12, a % 24 ? c.tile : shade(c.tile,1.2), null, 0, face + 0.3*d);
    houseSideWins(60, 750, -160, -470, [[34,110]], c.trim, { w:34 });
    if(d > 0){
      houseArch(405, -160, houseDoorDims(HOUSE_SC).h, 46, 18, shade(c.wall,.9), 1);
      houseDoorway(405, -160, HOUSE_SC, c.trim, c.leaf, 1);
      for(const [a0, a1] of [[120,170],[220,270],[540,590],[640,690]]){
        houseArchWin(a0, a1, 34, 124, -160, c.trim, 1);
        for(let a = a0 + 8; a < a1 - 2; a += 9) F(a, a+1.6, 34, 104, '#2a2a2e', null, 0, -159);
      }
    } else {
      for(const [a0, a1] of [[140,190],[620,670]]) houseArchWin(a0, a1, 34, 124, -470, c.trim, -1);
      rearDoor(405, c.wall, c.leaf, 470, 92);
    }
    houseProfileRoof(60, 750, this.prof, 12, c.roof, c.wall);
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    houseProp('palm L', () => housePalm(60, -60, 180, '#5f8f4f'));
    houseProp('palm R', () => housePalm(760, -60, 180, '#5f8f4f'));
    houseProp('fountain', () => {
      cyl(250, -70, 0, 18, 26, c.tile, shade(c.tile,1.3));
      plateCircle(250, -70, 18.5, 22, '#8fc4d6');
      cyl(250, -70, 18, 34, 4, shade(c.wall,.9)); ball(250, -70, 38, 5, '#bfe0ea');
    });
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.walls(c, 1);
    this.parapet(c);
    this.bellwall(c);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); this.fore(p);
    this.bellwall(c); this.parapet(c);
    this.walls(c, -1);
    houseProp('ac unit', () => acUnit(120, 0, 470));
    houseProp('bin', () => wheelieBin(700, '#3f6b4a', 0, 470));
  }
},
/* ------------------------------------------------------------------ 58 */
{
  name:'Marrakech Riad', hood:'The Flats', tier:'double', sc:HOUSE_SC, ww:HOUSE_DOUBLE, dd:HOUSE_DEPTH_LAB,
  head:'Moroccan riad: ochre walls, crenellated parapet, horseshoe-arch door, domed roof pavilion',
  desc:'A Moroccan riad house: tall ochre plaster walls with a zellige tile band, a crenellated parapet, a studded door in a horseshoe arch, small arched and screened windows, a domed pavilion on the roof terrace, brass lanterns and potted lemon trees.',
  tags:['double','moroccan','horseshoe arch','flat roof','dome'],
  door:[405, -150],
  liv:[ { wall:'#d99a6a', trim:'#f2e4c8', leaf:'#2f6f8a', tile1:'#2f6f8a', tile2:'#e8dcc0', dome:'#3f8a6a' },
        { wall:'#e2b48a', trim:'#f5ead6', leaf:'#8a2f2f', tile1:'#3f7a5a', tile2:'#f0e4cc', dome:'#2f6f8a' },
        { wall:'#c98a5a', trim:'#efe0c4', leaf:'#3a5a2e', tile1:'#c9622a', tile2:'#f0e6d2', dome:'#c9a24a' } ],
  vol:{
    foot:[[60,-150],[750,-150],[750,-470],[60,-470]], h:330,
    solids:[ { name:'lemon L', c:[300,-70], r:14, h:90, prop:true },
             { name:'lemon R', c:[510,-70], r:14, h:90, prop:true },
             { name:'lantern', c:[150,-40], r:8, h:40, prop:true },
             { name:'ac unit', poly:[[94,-498],[146,-498],[146,-470],[94,-470]], h:36, prop:true },
             { name:'bin', poly:[[682,-520],[718,-520],[718,-484],[682,-484]], h:52, prop:true } ],
    marks:{ door:[405,-150], mat:[405,-150+35.4] }
  },
  yard(c){
    T(0, 809.6, -150, 0, 0.3, '#e2d2b0');
    for(let a = 370; a < 440; a += 14) for(let b = -144; b < -4; b += 14) T(a, a+12, b, b+12, 0.6, (a/14 + b/14) & 1 ? c.tile1 : c.tile2);
  },
  horseshoe(a, b, h, r, col, d){
    const pts = [P(a - r*0.86, b, 0)];
    for(let k = 0; k <= 16; k++){ const t = -Math.PI/6 + (Math.PI*4/3)*k/16; pts.push(P(a - r*Math.cos(t), b, h + r*0.5*Math.sin(t))); }
    pts.push(P(a + r*0.86, b, 0));
    poly(pts, col, shade(col,.7), 1);
  },
  walls(c, d){
    houseMass(60, 750, -150, -470, 220, c.wall, d);
    const face = d > 0 ? -150 : -470;
    for(let a = 64; a < 750; a += 10) for(const z of [2, 12]) F(a, a+9, z, z+9, ((a/10 + z/10) | 0) % 2 ? c.tile1 : c.tile2, null, 0, face + 0.3*d);
    houseSideWins(60, 750, -150, -470, [[150,196]], c.trim, { plain:true, w:26, pitch:90 });
    if(d > 0){
      this.horseshoe(405, -149.7, houseDoorDims(HOUSE_SC).h - 6, 56, c.trim, 1);
      houseDoorway(405, -150, HOUSE_SC, c.trim, c.leaf, 1);
      for(let z = 10; z < 90; z += 12) for(let a = 376; a < 436; a += 12) ball(a, -148.6, z, 1.6, '#c9a24a');
      for(const [a0, a1] of [[150,190],[250,290],[520,560],[620,660]]) houseArchWin(a0, a1, 40, 100, -150, c.trim, 1);
      for(const [a0, a1] of [[150,200],[330,380],[430,480],[610,660]]){
        F(a0-4, a1+4, 146, 206, shade(c.wall,.8), null, 0, -149.6);
        for(let a = a0; a <= a1; a += 5) F(a, a+1.4, 150, 202, '#5a3a28', null, 0, -149.4);
        for(let z = 150; z <= 202; z += 5) F(a0, a1, z, z+1.4, '#5a3a28', null, 0, -149.4);
      }
    } else {
      for(const [a0, a1] of [[150,190],[620,660]]) houseArchWin(a0, a1, 40, 100, -470, c.trim, -1);
      rearDoor(405, c.wall, c.leaf, 470, 92);
    }
    T(60, 750, -470, -150, 220, shade(c.wall,.86));
    const nearB = d > 0 ? -150 : -470, farB = d > 0 ? -470 : -150;
    for(let a = 62; a < 748; a += 28) box(a, a+16, farB > nearB ? farB - 8 : farB, farB > nearB ? farB : farB + 8, 220, 240, shade(c.wall,1.04), c.wall, shade(c.wall,.8));
    for(let a = 62; a < 748; a += 28) box(a, a+16, nearB > farB ? nearB - 8 : nearB, nearB > farB ? nearB : nearB + 8, 220, 240, shade(c.wall,1.04), c.wall, shade(c.wall,.8));
  },
  pavilion(c){
    if(!state.roof) return;
    box(520, 640, -400, -300, 220, 290, shade(c.trim,1.02), c.trim, shade(c.trim,.8));
    for(const a of [540, 580, 620]) houseArchWin(a-10, a+10, 236, 280, state.back ? -400 : -300, c.trim, state.back ? -1 : 1);
    houseDome(580, -350, 54, 50, 4, 12, c.dome, null, 290);
    ball(580, -350, 344, 4, '#c9a24a');
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    for(const [nm, aa] of [['lemon L', 300], ['lemon R', 510]])
      houseProp(nm, () => { cyl(aa, -70, 0, 24, 14, c.tile1, shade(c.tile1,1.2)); cyl(aa, -70, 24, 50, 2.5, '#6b5038'); ball(aa, -70, 70, 22, '#4f7a3e'); for(let k = 0; k < 5; k++) ball(aa - 14 + k*7, -64, 64 + (k%2)*12, 3, '#f2d36a'); });
    houseProp('lantern', () => { box(144, 156, -46, -34, 0, 28, '#b8903a', 'rgba(250,210,120,.85)', 'rgba(225,185,100,.85)'); houseCone(150, -40, 9, 6, 28, 40, '#b8903a'); });
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.walls(c, 1);
    this.pavilion(c);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); this.fore(p);
    this.walls(c, -1);
    this.pavilion(c);
    houseProp('ac unit', () => acUnit(120, 0, 470));
    houseProp('bin', () => wheelieBin(700, '#3f6b4a', 0, 470));
  }
},
/* ------------------------------------------------------------------ 59 */
{
  name:'Vologda Izba', hood:'The Flats', tier:'single', sc:HOUSE_SC, ww:HOUSE_SINGLE, dd:HOUSE_DEPTH_LAB,
  head:'Russian izba: log walls, steep plank gable, carved window frames, sun disc',
  desc:'A Russian log izba: round-log walls with the ends proud, a steep street gable boarded in planks with carved barge boards and a sun disc, three windows in painted fretwork frames with crested heads, a wattle fence and a log well.',
  tags:['single','izba','log','carved','front gable'],
  yardFence:{ style:'wattle', h:34, col:'#8a7050' },
  door:[330, -130],
  liv:[ { log:'#8a6440', roof:'#5a5a5e', trim:'#e8e2d0', leaf:'#5a3a28', paint:'#2e5a9a' },
        { log:'#a07a50', roof:'#4a4e52', trim:'#f0e8d8', leaf:'#3f2a1e', paint:'#3f8a5a' },
        { log:'#6f5238', roof:'#5e5a54', trim:'#e0d8c4', leaf:'#7a2e2a', paint:'#c9622a' } ],
  vol:{
    foot:[[60,-130],[400,-130],[400,-480],[60,-480]], h:310,
    solids:[ { name:'fence L', poly:[[4,-10],[295,-10],[295,-2],[4,-2]], h:34 },
             { name:'fence R', poly:[[365,-10],[456,-10],[456,-2],[365,-2]], h:34 },
             { name:'well', c:[120,-70], r:22, h:90, prop:true },
             { name:'woodpile', poly:[[150,-512],[230,-512],[230,-484],[150,-484]], h:28, prop:true } ],
    marks:{ door:[330,-130], mat:[330,-130+35.4] }
  },
  yard(c){
    houseLawn(0, 460, -130, 0, '#7a9a56');
    T(295, 365, -130, 0, 0.6, '#a89a80');
  },
  frame(a0, a1, z0, z1, c){
    F(a0-10, a1+10, z0-10, z1+10, c.trim, shade(c.trim,.7), 1, -129.6);
    poly([P(a0-14,-129.4,z1+10), P((a0+a1)/2,-129.4,z1+30), P(a1+14,-129.4,z1+10)], c.trim, shade(c.trim,.7), 1);
    faceCircle((a0+a1)/2, -129.2, z1+17, 4, c.paint);
    for(const s of [[a0-26, a0-10], [a1+10, a1+26]]) { F(s[0], s[1], z0-6, z1+6, c.paint, shade(c.paint,.7), 1, -129.4); F(s[0]+3, s[1]-3, (z0+z1)/2-6, (z0+z1)/2+6, c.trim, null, 0, -129.2); }
    houseWin(a0, a1, z0, z1, -130, c.trim, c.trim, 1);
  },
  body(c, d){
    houseMass(60, 400, -130, -480, 140, c.log, d);
    const face = d > 0 ? -130 : -480;
    houseLogs(60, 400, 0, 140, face, c.log, d);
    houseEndLogs(60, 400, -130, -480, 0, 140, c.log);
    houseSideWins(60, 400, -130, -480, [[40,96]], c.trim);
    houseFrontGable(60, 400, -130, -480, 140, 300, 14, c.roof, c.log, d, { gable:shade(c.log,1.08), barge:c.trim });
    if(d > 0){
      for(let a = 70; a < 392; a += 10){ const zt = 140 + 160*(1 - Math.abs(a+1-230)/170); if(zt > 146) F(a, a+1.4, 140, zt - 4, shade(c.log,.8), null, 0, -129.8); }
      faceCircle(230, -129.4, 250, 16, c.trim, shade(c.trim,.7), 1);
      for(let k = 0; k < 12; k++){ const t = k/12*Math.PI*2; poly([P(230,-129.2,250), P(230 + 14*Math.cos(t), -129.2, 250 + 14*Math.sin(t))], null, c.paint, 1.2); }
      F(222, 238, 180, 294, c.trim, shade(c.trim,.7), 1, -129.2);
      houseWin(215, 245, 188, 220, -130, c.trim, c.trim, 1, { plain:true });
      houseDoorway(330, -130, HOUSE_SC, c.trim, c.leaf, 1);
      this.frame(100, 140, 40, 96, c);
      this.frame(200, 240, 40, 96, c);
    } else {
      houseWin(120, 160, 40, 96, -480, c.trim, c.trim, -1);
      rearDoor(300, c.log, c.leaf, 480, 92);
    }
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    for(const [a0, a1] of [[4, 295], [365, 456]]){
      for(let z = 6; z < 34; z += 6) F(a0, a1, z, z+3.6, z % 12 ? '#8a7050' : '#7a6044', null, 0, -6);
      for(let a = a0 + 2; a < a1; a += 24) box(a-2, a+2, -8, -4, 0, 36, '#6b5038', '#5a4230', '#4d3828');
    }
    houseProp('well', () => {
      box(100, 140, -90, -50, 0, 30, '#8a6440', '#7a5a38', '#6a4e30');
      for(const aa of [102, 138]) box(aa-2, aa+2, -72, -68, 30, 80, '#6b5038', '#5a4230', '#4d3828');
      houseProfileRoof(96, 144, [[-50,72],[-70,92],[-90,72]], 4, c.roof, '#8a6440');
    });
    if(!state.back) houseYardFence(this, this.liv[state.pal % this.liv.length], 'near');
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far');
    this.body(c, 1);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far'); this.fore(p);
    this.body(c, -1);
    houseProp('woodpile', () => {
      box(150, 230, -512, -484, 0, 28, '#8a6848', '#7a5a3c', '#6a4e34');
      for(let a = 156; a < 228; a += 10) for(const z of [7, 20]) faceCircle(a, -512.4, z, 5, '#c9a878', '#7a5a3c', 1);
    });
    houseYardFence(this, c, 'near');
  }
},
/* ------------------------------------------------------------------ 60 */
{
  name:'Connemara Thatched Cottage', hood:'The Flats', tier:'single', sc:HOUSE_SC, ww:HOUSE_SINGLE, dd:HOUSE_DEPTH_LAB,
  head:'Irish cottage: whitewashed walls, thick golden thatch, rolled ridge, red half door',
  desc:'A long low whitewashed Irish cottage under a thick golden thatch with a rolled ridge and chimneys at both gables, small deep-set windows with red frames, a red half door, a drystone wall and a stack of turf.',
  tags:['single','irish','thatch','cottage'],
  yardFence:{ style:'wall', h:26, col:'stone', balls:true },
  door:[230, -130],
  liv:[ { wall:'#f7f4ec', thatch:'#c9a45a', trim:'#b8352a', leaf:'#b8352a', stone:'#9c968a' },
        { wall:'#f5f0e2', thatch:'#b8955a', trim:'#2e5a3a', leaf:'#2e5a3a', stone:'#a8a296' },
        { wall:'#faf6ee', thatch:'#d0aa62', trim:'#2e4d68', leaf:'#2e4d68', stone:'#8f8a80' } ],
  vol:{
    foot:[[40,-130],[420,-130],[420,-470],[40,-470]], h:310,
    solids:[ { name:'wall L', poly:[[4,-14],[195,-14],[195,-2],[4,-2]], h:30 },
             { name:'wall R', poly:[[265,-14],[456,-14],[456,-2],[265,-2]], h:30 },
             { name:'turf', poly:[[330,-70],[400,-70],[400,-40],[330,-40]], h:40, prop:true },
             { name:'rain barrel', c:[380,-500], r:14, h:40, prop:true } ],
    marks:{ door:[230,-130], mat:[230,-130+35.4] }
  },
  prof:[[-130,100],[-300,250],[-470,100]],
  yard(c){
    houseLawn(0, 460, -130, 0, '#6f9a4e');
    T(195, 265, -130, 0, 0.6, '#a8a296');
  },
  body(c, d){
    houseMass(40, 420, -130, -470, 100, c.wall, d);
    houseSideWins(40, 420, -130, -470, [[36,80]], c.trim, { w:28, pitch:110 });
    if(d > 0){
      houseDoorway(230, -130, HOUSE_SC, c.trim, c.leaf, 1);
      F(191, 269, 50, 53, shade(c.leaf,.7), null, 0, -129.2);
      for(const [a0, a1] of [[90,136],[324,370]]) houseWin(a0, a1, 36, 80, -130, c.trim, '#e8e4da', 1);
    } else {
      houseWin(100, 146, 36, 80, -470, c.trim, '#e8e4da', -1);
      rearDoor(300, c.wall, c.leaf, 470, 88);
    }
    houseProfileRoof(40, 420, this.prof, 16, c.thatch, c.wall);
    const zE = 100 - 16*150/170;
    houseFringe(24, 436, d > 0 ? -114.3 : -485.7, zE - 4, shade(c.thatch,.82));
    tube(30, -300, 250, 430, -300, 250, 9, shade(c.thatch,.9));
    if(state.roof) for(const a of [40, 392]) { box(a, a+28, -316, -284, 230, 290, c.wall, shade(c.wall,.92), shade(c.wall,.8)); box(a-2, a+30, -318, -282, 290, 296, shade(c.wall,.9)); }
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    for(const [a0, a1] of [[4, 195], [265, 456]]){
      box(a0, a1, -14, -2, 0, 26, shade(c.stone,1.04), c.stone, shade(c.stone,.8));
      for(let a = a0 + 6; a < a1; a += 14) ball(a, -8, 27, 5, shade(c.stone, 0.9 + (a % 3)*0.06));
    }
    houseProp('turf', () => { box(330, 400, -70, -40, 0, 30, '#5a4030', '#4a3426', '#3e2c20'); houseProfileRoof(330, 400, [[-40,30],[-55,42],[-70,30]], 2, '#4a3426', '#5a4030'); });
    if(!state.back) houseYardFence(this, this.liv[state.pal % this.liv.length], 'near');
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far');
    this.body(c, 1);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far'); this.fore(p);
    this.body(c, -1);
    houseProp('rain barrel', () => { cyl(380, -500, 0, 40, 14, '#7a5a3c', '#5a8aa0'); for(const z of [10, 30]) cyl(380, -500, z, z+2, 14.4, '#4a4a4e'); });
    houseYardFence(this, c, 'near');
  }
},
/* ------------------------------------------------------------------ 61 */
{
  name:'Adirondack Great Camp', hood:'The Flats', tier:'double', sc:HOUSE_SC, ww:HOUSE_DOUBLE, dd:HOUSE_DEPTH_LAB,
  head:'Adirondack camp: log lodge gable, long wing with twig-rail porch, big stone chimney',
  desc:'An Adirondack great camp: a steep front-gabled log lodge with a big glazed gable, a long side wing behind a twig-railed porch on log posts, a massive fieldstone chimney up the end, green trim, Adirondack chairs and a canoe on sawhorses.',
  tags:['double','adirondack','log','porch','chimney'],
  door:[550, -200],
  liv:[ { log:'#6f5238', trim:'#3f6b3e', roof:'#3e4a44', leaf:'#8a2f2f', stone:'#9c968a' },
        { log:'#8a6440', trim:'#8a2f2f', roof:'#4a3e36', leaf:'#3f6b3e', stone:'#a8a296' },
        { log:'#5a4430', trim:'#c9a24a', roof:'#3a3f44', leaf:'#2e4d68', stone:'#8f8a80' } ],
  vol:{
    foot:[[60,-160],[360,-160],[360,-200],[740,-200],[740,-470],[60,-470]], h:330,
    solids:[ { name:'chimney', poly:[[740,-360],[780,-360],[780,-310],[740,-310]], h:330 },
             ...[370, 470, 630, 730].map((a, i) => ({ name:'post ' + (i+1), c:[a,-146], r:5, h:112 })),
             { name:'chair L', poly:[[120,-80],[150,-80],[150,-50],[120,-50]], h:40, prop:true },
             { name:'chair R', poly:[[180,-80],[210,-80],[210,-50],[180,-50]], h:40, prop:true },
             { name:'canoe', poly:[[600,-60],[760,-60],[760,-36],[600,-36]], h:34, prop:true },
             { name:'woodpile', poly:[[150,-502],[230,-502],[230,-474],[150,-474]], h:28, prop:true } ],
    marks:{ door:[550,-200], mat:[550,-200+35.4] }
  },
  yard(c){
    houseLawn(0, 809.6, -552, 0, '#6f9450');
    T(515, 585, -140, 0, 0.6, '#9c8e74');
    T(360, 740, -200, -140, 3, '#7a5a3c');
  },
  lodge(c, d){
    houseMass(60, 360, -160, -470, 130, c.log, d);
    const face = d > 0 ? -160 : -470;
    houseLogs(60, 360, 0, 130, face, c.log, d);
    houseEndLogs(60, 360, -160, -470, 0, 130, c.log);
    houseSideWins(60, 360, -160, -470, [[36,96]], c.trim);
    houseProfileRoofB(-160, -470, [[60,130],[210,310],[360,130]], 16, c.roof, c.log, { barge:c.trim,
      onFront: () => { poly([P(110,-159.6,138), P(310,-159.6,138), P(210,-159.6,270)], '#2c3a42', c.trim, 2);
                       for(const a of [160, 210, 260]){ const zt = 138 + 132*(1 - Math.abs(a-210)/100); F(a-1.4, a+1.4, 138, zt - 2, c.trim, null, 0, -159.4); } },
      onBack: () => poly([P(150,-470.4,140), P(270,-470.4,140), P(210,-470.4,230)], '#2c3a42', c.trim, 2) });
    if(d > 0) for(const [a0, a1] of [[100,170],[250,320]]) houseWin(a0, a1, 36, 106, -160, c.trim, c.trim, 1);
    else houseWin(150, 270, 36, 106, -470, c.trim, c.trim, -1);
  },
  wing(c, d){
    houseMass(360, 740, -200, -470, 130, c.log, d);
    const face = d > 0 ? -200 : -470;
    houseLogs(360, 740, 0, 130, face, c.log, d);
    houseEndLogs(360, 740, -200, -470, 0, 130, c.log);
    houseSideWins(360, 740, -200, -470, [[36,96]], c.trim);
    if(d > 0){
      houseDoorway(550, -200, HOUSE_SC, c.trim, c.leaf, 1);
      for(const [a0, a1] of [[400,470],[620,700]]) houseWin(a0, a1, 36, 106, -200, c.trim, c.trim, 1);
    } else {
      for(const [a0, a1] of [[420,490],[620,690]]) houseWin(a0, a1, 36, 106, -470, c.trim, c.trim, -1);
      rearDoor(550, c.log, c.leaf, 470, 92);
    }
    houseProfileRoof(360, 740, [[-200,130],[-335,240],[-470,130]], 14, c.roof, c.log, { lo:false });
  },
  chimney(c){
    box(740, 780, -360, -310, 0, 330, shade(c.stone,1.06), c.stone, shade(c.stone,.8));
    for(let z = 6; z < 330; z += 14) for(let b = -358 + ((z/14|0) % 2 ? 0 : 10); b < -312; b += 20) S(780.3, b, Math.min(b+16, -310), z, z+10, shade(c.stone, 0.88 + (((b*3 + z) | 0) % 4)*0.05));
  },
  porch(c){
    for(const aa of [370, 470, 630, 730]) cyl(aa, -146, 3, 112, 5, c.log, shade(c.log,1.1));
    for(const [a0, a1] of [[372, 515], [585, 728]]){
      F(a0, a1, 32, 35, c.log, null, 0, -146);
      for(let a = a0; a < a1 - 20; a += 24){ poly([P(a,-146,6), P(a+24,-146,32)], null, c.log, 2.2); poly([P(a+24,-146,6), P(a,-146,32)], null, c.log, 2.2); }
    }
    houseProfileRoof(360, 740, [[-140,112],[-200,130]], 8, c.roof, c.log, { ext1:false, gable:shade(c.log,.8) });
  },
  props(c){
    for(const [nm, a0] of [['chair L', 120], ['chair R', 180]])
      houseProp(nm, () => { box(a0, a0 + 30, -80, -50, 12, 16, c.trim, shade(c.trim,.9), shade(c.trim,.76)); poly([P(a0,-80,16), P(a0+30,-80,16), P(a0+30,-86,46), P(a0,-86,46)], c.trim, shade(c.trim,.7), 1); for(const aa of [a0 + 3, a0 + 27]) box(aa-2, aa+2, -78, -52, 0, 22, shade(c.trim,.8), shade(c.trim,.7), shade(c.trim,.6)); });
    houseProp('canoe', () => {
      for(const aa of [630, 730]) box(aa-3, aa+3, -58, -38, 0, 22, '#8a6848', '#7a5a3c', '#6a4e34');
      poly([P(600,-48,24), P(680,-60,30), P(760,-48,24), P(680,-36,26)], '#c9622a', '#8a3a1a', 1);
    });
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    this.porch(c); this.props(c); this.chimney(c);
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.lodge(c, 1);
    this.wing(c, 1);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); this.porch(c); this.props(c); this.chimney(c);
    this.wing(c, -1);
    this.lodge(c, -1);
    houseProp('woodpile', () => {
      box(150, 230, -502, -474, 0, 28, '#8a6848', '#7a5a3c', '#6a4e34');
      for(let a = 156; a < 228; a += 10) for(const z of [7, 20]) faceCircle(a, -502.4, z, 5, '#c9a878', '#7a5a3c', 1);
    });
  }
},
/* ------------------------------------------------------------------ 62 */
{
  name:'Starlite Googie', hood:'The Flats', tier:'single', sc:HOUSE_SC, ww:HOUSE_SINGLE, dd:HOUSE_DEPTH_LAB,
  head:'Googie: upswept roof flying out over the street, flagstone wall, atomic starburst',
  desc:'A space-age Googie house: a single roof plane sweeping up and out over the front far beyond the walls, a flagstone feature wall, angled glass, a turquoise door, and an atomic starburst on a pole in a gravel yard.',
  tags:['single','googie','space age','upswept roof'],
  door:[200, -130],
  liv:[ { wall:'#f4f0e6', roof:'#e8e2d4', edge:'#2f8f8a', leaf:'#2f8f8a', stone:'#a89a86' },
        { wall:'#f2ece0', roof:'#e4ddd0', edge:'#e0782a', leaf:'#e0782a', stone:'#9a948a' },
        { wall:'#eef0ec', roof:'#e0e4e0', edge:'#d9a23a', leaf:'#d9573c', stone:'#b09a80' } ],
  vol:{
    foot:[[40,-130],[420,-130],[420,-480],[40,-480]], h:200,
    solids:[ { name:'starburst', c:[370,-40], r:6, h:180, prop:true },
             { name:'agave', c:[100,-50], r:14, h:40, prop:true },
             { name:'ac unit', poly:[[274,-508],[326,-508],[326,-480],[274,-480]], h:36, prop:true } ],
    marks:{ door:[200,-130], mat:[200,-130+35.4] }
  },
  prof:[[-80,196],[-480,128]],
  yard(c){
    T(0, 460, -130, 0, 0.3, '#ddd6c8');
    for(let b = -122; b < -8; b += 20) T(176, 224, b, b+14, 0.7, '#bdb6a8');
  },
  walls(c, d){
    const zf = 196 - 50*68/400;
    houseMass(40, 420, -130, -480, 128, c.wall, d);
    F(40, 420, 128, d > 0 ? zf : 128, c.wall, null, 0, -130);
    const g = a => [[a,-130,0],[a,-130,zf],[a,-480,128],[a,-480,0]];
    houseFace(g(40), [230,-300,60], shade(c.wall,.78), shade(c.wall,.6));
    houseFace(g(420), [230,-300,60], shade(c.wall,.78), shade(c.wall,.6));
    houseSideWins(40, 420, -130, -480, [[20,110]], '#2a2a2e', { plain:true, w:60, pitch:110 });
    if(d > 0){
      F(40, 140, 0, zf, c.stone, null, 0, -129.6);
      for(let z = 6; z < zf; z += 16) for(let a = 44 + ((z/16|0) % 2 ? 0 : 14); a < 136; a += 28) F(a, Math.min(a+24, 138), z, z+12, shade(c.stone, 0.88 + (((a + z) | 0) % 4)*0.05), null, 0, -129.4);
      houseDoorway(200, -130, HOUSE_SC, shade(c.wall,.86), c.leaf, 1);
      if(HOUSE_REC) HOUSE_REC.push({ kind:'win', a0:246, a1:414, z0:4, z1:176, b:-130 });
      poly([P(250,-129.6,6), P(410,-129.6,6), P(410,-129.6,zf - 6), P(250,-129.6,zf - 20)], '#2c3a42', '#1f262b', 1.4);
      for(let a = 290; a < 410; a += 40) F(a-1, a+1, 6, zf - 10, '#1f262b', null, 0, -129.2);
    } else {
      F(100, 360, 10, 118, '#2c3a42', '#1f262b', 1.4, -480.4);
      rearDoor(380, c.wall, c.leaf, 480, 92);
    }
  },
  roof(c){ houseProfileRoof(40, 420, this.prof, 12, c.roof, c.wall, { noEnds:true, noStrips:true, barge:c.edge }); },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    this.roof(c);
    houseProp('starburst', () => { cyl(370, -40, 0, 150, 2, '#2a2a2e'); for(let k = 0; k < 10; k++){ const t = k/10*Math.PI*2; poly([P(370,-40,166), P(370 + 26*Math.cos(t), -40, 166 + 18*Math.sin(t))], null, c.edge, 2.4); ball(370 + 26*Math.cos(t), -40, 166 + 18*Math.sin(t), 2.6, c.edge); } ball(370, -40, 166, 5, '#f2d36a'); });
    houseProp('agave', () => { for(let k = 0; k < 10; k++){ const t = k/10*Math.PI*2; poly([P(100,-50,2), P(100 + Math.cos(t)*16, -50 + Math.sin(t)*16, 34), P(100 + Math.cos(t)*18, -50 + Math.sin(t)*18, 30)], k % 2 ? '#6b9a7a' : '#5a8a6a'); } });
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.walls(c, 1);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    houseProp('starburst', () => cyl(370, -40, 0, 150, 2, '#2a2a2e'));
    houseProp('agave', () => ball(100, -50, 10, 14, '#6b9a7a'));
    this.walls(c, -1);
    this.roof(c);
    houseProp('ac unit', () => acUnit(300, 0, 480));
  }
},
/* ------------------------------------------------------------------ 63 */
{
  name:'Glass Pavilion', hood:'The Flats', tier:'single', sc:HOUSE_SC, ww:HOUSE_SINGLE, dd:HOUSE_DEPTH_LAB,
  head:'Glass pavilion: all-glass walls between a floor slab and a floating roof on steel columns',
  desc:'A modernist glass pavilion: walls of floor-to-ceiling glass set back under a thin white roof slab that floats on black steel columns outside the glass, a white floor slab, a timber core glimpsed inside, a great oak and stepping pads across the lawn.',
  tags:['single','modernist','glass','steel'],
  door:[230, -140],
  liv:[ { slab:'#f4f4f0', steel:'#2a2a2e', core:'#a0703e', leaf:'#2a2a2e' },
        { slab:'#f0eee6', steel:'#3a3a3e', core:'#8a5a3a', leaf:'#3a3a3e' },
        { slab:'#f6f4ee', steel:'#2a2e2c', core:'#b08a5a', leaf:'#2a2e2c' } ],
  vol:{
    foot:[[60,-140],[400,-140],[400,-450],[60,-450]], h:160,
    solids:[ ...[[30,-110],[165,-110],[295,-110],[430,-110],[30,-480],[165,-480],[295,-480],[430,-480]].map(([a, b], i) => ({ name:'column ' + (i+1), poly:[[a-4,b-4],[a+4,b-4],[a+4,b+4],[a-4,b+4]], h:150 })),
             { name:'oak', c:[400,-50], r:9, h:230, prop:true },
             { name:'ac unit', poly:[[174,-508],[226,-508],[226,-480],[174,-480]], h:36, prop:true } ],
    marks:{ door:[230,-140], mat:[230,-140+35.4] }
  },
  yard(c){
    houseLawn(0, 460, -552, 0, '#7fa35a');
    for(let b = -130; b < -16; b += 22) T(206, 254, b, b+14, 0.7, '#dcd8ce');
    T(40, 420, -470, -120, 2, c.slab);
  },
  glass(c, d){
    houseMass(60, 400, -140, -450, 142, '#34424b', d);
    const face = d > 0 ? -140 : -450;
    box(180, 280, -360, -260, 2, 142, shade(c.core,1.08), c.core, shade(c.core,.8));
    F(60, 400, 70, 142, 'rgba(170,205,220,.18)', null, 0, face + 0.4*d);
    for(let a = 60; a <= 400; a += 34) F(a-1, a+1, 2, 142, c.steel, null, 0, face + 0.5*d);
    houseSideWins(60, 400, -140, -450, [[4,138]], c.steel, { plain:true, w:4, pitch:34, skipFront:0, skipBack:0 });
    if(d > 0) houseDoorway(230, -140, HOUSE_SC, c.steel, c.leaf, 1);
  },
  frame(c){
    for(const [a, b] of [[30,-480],[165,-480],[295,-480],[430,-480],[30,-110],[165,-110],[295,-110],[430,-110]]) box(a-4, a+4, b-4, b+4, 2, 142, c.steel, shade(c.steel,1.3), shade(c.steel,1.15));
    box(20, 440, -490, -100, 142, 154, c.slab, shade(c.slab,.92), shade(c.slab,.8));
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    this.frame(c);
    houseProp('oak', () => { cyl(400, -50, 0, 110, 8, '#5a4030'); ball(400, -50, 160, 56, '#3f6b3e'); ball(370, -40, 140, 38, '#4a7a48'); ball(426, -60, 180, 32, '#36603a'); });
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.glass(c, 1);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    houseProp('oak', () => ball(400, -50, 160, 56, '#3f6b3e'));
    this.glass(c, -1);
    this.frame(c);
    houseProp('ac unit', () => acUnit(200, 0, 480));
  }
},
/* ------------------------------------------------------------------ 64 */
{
  name:'Miami Deco Tower House', hood:'The Flats', tier:'single', sc:HOUSE_SC, ww:HOUSE_SINGLE, dd:HOUSE_DEPTH_LAB,
  head:'Art Deco: stepped setbacks, vertical fins, zigzag frieze, sunburst door',
  desc:'A pastel Art Deco house in three stepped setbacks: vertical fins up the front, a zigzag frieze under each coping, eyebrow hoods, and a stepped chrome door surround crowned with a sunburst; deco lamps and a palm.',
  tags:['single','art deco','setbacks','pastel'],
  door:[230, -130],
  liv:[ { wall:'#f2d8c8', accent:'#2f8f8a', trim:'#f7f4ec', leaf:'#2f8f8a', gold:'#c9a24a' },
        { wall:'#cfe6dc', accent:'#d97a8a', trim:'#f7f4ec', leaf:'#d97a8a', gold:'#c9a24a' },
        { wall:'#f2ecc8', accent:'#3a5a8a', trim:'#fbfaf5', leaf:'#3a5a8a', gold:'#b8903a' } ],
  vol:{
    foot:[[40,-130],[420,-130],[420,-480],[40,-480]], h:310,
    solids:[ { name:'lamp L', c:[150,-40], r:6, h:80, prop:true },
             { name:'lamp R', c:[310,-40], r:6, h:80, prop:true },
             { name:'palm', c:[400,-60], r:7, h:190, prop:true },
             { name:'ac unit', poly:[[74,-508],[126,-508],[126,-480],[74,-480]], h:36, prop:true } ],
    marks:{ door:[230,-130], mat:[230,-130+35.4] }
  },
  yard(c){
    T(0, 460, -130, 0, 0.3, '#e6e0d4');
    for(let a = 0; a < 460; a += 40) poly([P(a,-130,0.4), P(a,0,0.4)], null, c.accent, 1);
    T(195, 265, -130, 0, 0.6, '#f0ece2');
  },
  zig(a0, a1, z, b, c){ for(let a = a0; a < a1 - 1; a += 12) poly([P(a,b,z), P(a+6,b,z+7), P(a+12,b,z)], null, c.accent, 1.6); },
  stage(a0, a1, bf, bb, z0, z1, c, fins){
    box(a0, a1, bb, bf, z0, z1, shade(c.wall,1.04), c.wall, shade(c.wall,.8));
    const face = state.back ? bb : bf, d = state.back ? -1 : 1;
    F(a0, a1, z1 - 8, z1, c.trim, null, 0, face + 0.3*d);
    this.zig(a0 + 4, a1 - 4, z1 - 20, face + 0.4*d, c);
    if(fins && !state.back) for(const a of fins) box(a-4, a+4, bf, bf + 8, z0 + 10, z1 + 12, c.trim, shade(c.trim,.9), shade(c.trim,.78));
  },
  body(c){
    this.stage(40, 420, -130, -480, 0, 150, c, [60, 400]);
    this.stage(100, 360, -160, -450, 150, 240, c, [120, 340]);
    this.stage(170, 290, -190, -420, 240, 300, c, [230]);
    const d = state.back ? -1 : 1;
    houseSideWins(40, 420, -130, -480, [[40,100]], c.accent, { plain:true, w:50, pitch:100 });
    if(!state.back){
      for(const [a0, a1] of [[80,150],[310,380]]){ houseWin(a0, a1, 40, 110, -130, c.accent, c.trim, 1, { plain:true }); slab(a0-10, a1+10, 118, 122, -116, -130, c.trim); }
      for(const [a0, a1] of [[130,200],[260,330]]) houseWin(a0, a1, 170, 220, -160, c.accent, c.trim, 1, { plain:true });
      faceCircle(230, -189.6, 270, 14, c.accent); faceCircle(230, -189.4, 270, 10, '#34424b');
    } else {
      for(const [a0, a1] of [[100,180],[280,360]]) houseWin(a0, a1, 40, 110, -480, c.accent, c.trim, -1, { plain:true });
      rearDoor(230, c.wall, c.leaf, 480, 92);
    }
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    for(const [nm, aa] of [['lamp L', 150], ['lamp R', 310]])
      houseProp(nm, () => { box(aa-4, aa+4, -44, -36, 0, 60, c.trim, shade(c.trim,.9), shade(c.trim,.78)); box(aa-7, aa+7, -47, -33, 60, 80, c.gold, 'rgba(250,230,160,.9)', 'rgba(230,205,140,.9)'); });
    houseProp('palm', () => housePalm(400, -60, 180, '#5f8f4f'));
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.body(c);
    const dh = houseDoorDims(HOUSE_SC).h;
    for(const [w, z] of [[62,dh+16],[54,dh+26],[46,dh+36]]) F(230 - w, 230 + w, 0, z, shade(c.trim, 1 - (62-w)*0.004), shade(c.gold,.8), 1, -129.6 + (62-w)*0.02);
    for(let k = 0; k <= 8; k++){ const t = Math.PI*k/8; poly([P(230,-129.3,dh+6), P(230 + 40*Math.cos(t), -129.3, dh + 6 + 28*Math.sin(t))], null, c.gold, 1.6); }
    houseDoorway(230, -130, HOUSE_SC, c.gold, c.leaf, 1);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); this.fore(p);
    this.body(c);
    houseProp('ac unit', () => acUnit(100, 0, 480));
  }
},
/* ------------------------------------------------------------------ 65 */
{
  name:'Point Loma Lighthouse Cottage', hood:'The Flats', tier:'double', sc:HOUSE_SC, ww:HOUSE_DOUBLE, dd:HOUSE_DEPTH_LAB,
  head:"Keeper's cottage with its lighthouse: white tower, gallery, glazed lantern, red cap",
  desc:"A lighthouse keeper's cottage in white clapboard under a red roof, standing beside its lighthouse: a tall white tower with a railed gallery, a glazed lantern room and a red domed cap. Picket fence, a buoy and lobster traps in the yard.",
  tags:['double','lighthouse','cottage','nautical','tower'],
  yardFence:{ style:'picket', h:36, col:'#f7f5ef' },
  door:[270, -160],
  liv:[ { wall:'#f7f5ef', roof:'#b8352a', trim:'#2a2a2e', leaf:'#b8352a', band:'#b8352a' },
        { wall:'#f5f2ea', roof:'#2e4d68', trim:'#2a2a2e', leaf:'#2e4d68', band:'#2a2a2e' },
        { wall:'#faf8f2', roof:'#3f6b3e', trim:'#2a2a2e', leaf:'#3f6b3e', band:'#3f6b3e' } ],
  vol:{
    foot:[[60,-160],[480,-160],[480,-470],[60,-470]], h:520,
    solids:[ { name:'tower', poly:houseRing(640,-300,60,12), h:520 },
             { name:'fence L', poly:[[4,-9],[235,-9],[235,-1],[4,-1]], h:36 },
             { name:'fence R', poly:[[305,-9],[806,-9],[806,-1],[305,-1]], h:36 },
             { name:'buoy', c:[120,-70], r:14, h:50, prop:true },
             { name:'traps', poly:[[380,-80],[450,-80],[450,-50],[380,-50]], h:40, prop:true },
             { name:'ac unit', poly:[[94,-498],[146,-498],[146,-470],[94,-470]], h:36, prop:true } ],
    marks:{ door:[270,-160], mat:[270,-160+35.4] }
  },
  prof:[[-160,130],[-315,230],[-470,130]],
  yard(c){
    houseLawn(0, 809.6, -552, 0, '#7fa35a');
    T(235, 305, -160, 0, 0.6, '#c9c1b0');
  },
  cottage(c, d){
    houseMass(60, 480, -160, -470, 130, c.wall, d);
    const face = d > 0 ? -160 : -470;
    for(let z = 10; z < 128; z += 7) poly([P(60,face+0.3*d,z), P(480,face+0.3*d,z)], null, shade(c.wall,.88), 1);
    houseSideWins(60, 480, -160, -470, [[36,100]], c.trim);
    if(d > 0){
      houseDoorway(270, -160, HOUSE_SC, c.trim, c.leaf, 1);
      for(const [a0, a1] of [[110,160],[370,420]]) houseWin(a0, a1, 36, 100, -160, c.trim, c.trim, 1, { shutter:c.band });
    } else {
      houseWin(110, 160, 36, 100, -470, c.trim, c.trim, -1);
      rearDoor(300, c.wall, c.leaf, 470, 92);
    }
    houseProfileRoof(60, 480, this.prof, 12, c.roof, c.wall);
  },
  tower(c){
    const seen = housePrism(houseRing(640,-300,60,12), 0, 420, c.wall, { top:false });
    for(const f of seen){
      houseFaceWin(f, 0, 1, 180, 200, c.band, { band:true });
      houseFaceWin(f, 0, 1, 330, 350, c.band, { band:true });
      if(f.nb > 0.5) { houseFaceWin(f, 0.3, 0.7, 120, 150, c.trim, { plain:true }); houseFaceWin(f, 0.3, 0.7, 260, 290, c.trim, { plain:true }); }
    }
    housePrism(houseRing(640,-300,78,12), 420, 426, shade(c.trim,1.2));
    for(let k = 0; k < 12; k++){ const t = (k + 0.5)/12*Math.PI*2; cyl(640 + 76*Math.cos(t), -300 + 76*Math.sin(t), 426, 450, 1, c.trim); }
    const glass = housePrism(houseRing(640,-300,40,12), 426, 482, '#34424b', { top:false, stroke:'#d8d4c8' });
    for(const f of glass) houseFaceWin(f, 0, 1, 470, 476, c.trim, { band:true });
    if(!state.back) ball(640, -270, 454, 12, 'rgba(255,236,160,.85)');
    houseCone(640, -300, 46, 12, 482, 516, c.roof);
    ball(640, -300, 520, 6, c.trim);
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    for(const [a0, a1] of [[4, 235], [305, 806]]){
      housePickets(a0, a1, -5, 36, '#f7f5ef');
      for(const aa of [a0 + 4, a1 - 4]) housePost(aa, -5, 42, '#f7f5ef');
    }
    houseProp('buoy', () => { for(const [z0, z1, col] of [[0,16,'#b8352a'],[16,32,'#f7f5ef'],[32,44,'#b8352a']]) cyl(120, -70, z0, z1, 14 - z0*0.15, col); ball(120, -70, 48, 4, '#2a2a2e'); });
    houseProp('traps', () => { for(const [a0, z0] of [[380,0],[416,0],[398,20]]) { box(a0, a0 + 34, -80, -50, z0, z0 + 20, '#b8a070', 'rgba(160,130,80,.6)', 'rgba(140,110,70,.6)'); for(let a = a0 + 4; a < a0 + 34; a += 6) F(a, a+1, z0, z0 + 20, '#6b5038', null, 0, -49.6); } });
    if(!state.back) houseYardFence(this, this.liv[state.pal % this.liv.length], 'near');
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far');
    this.cottage(c, 1);
    this.tower(c);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far'); this.fore(p);
    this.tower(c);
    this.cottage(c, -1);
    houseProp('ac unit', () => acUnit(120, 0, 470));
    houseYardFence(this, c, 'near');
  }
},
/* ------------------------------------------------------------------ 66 */
{
  name:'Oia Cycladic House', hood:'The Flats', tier:'single', sc:HOUSE_SC, ww:HOUSE_SINGLE, dd:HOUSE_DEPTH_LAB,
  head:'Cycladic: whitewashed cubes, blue dome, outside stair, roof terrace',
  desc:'A Santorini-style house of whitewashed cubes: a low block with a parapeted roof terrace, a taller block behind crowned by a blue dome, a white outside stair up its face, blue doors and shutters, bougainvillea over the door and geranium pots.',
  tags:['single','cycladic','greek','dome','white'],
  door:[150, -130],
  liv:[ { wall:'#fbfbf8', blue:'#1f5aa8', bloom:'#d9368a', pave:'#e8e6e0' },
        { wall:'#fbfaf5', blue:'#2f8f8a', bloom:'#e2748c', pave:'#e6e2da' },
        { wall:'#fcfbf8', blue:'#3a4a9a', bloom:'#c9368a', pave:'#ebe8e2' } ],
  vol:{
    foot:[[40,-130],[300,-130],[300,-200],[420,-200],[420,-480],[40,-480]], h:300,
    solids:[ { name:'stair', poly:[[300,-200],[420,-200],[420,-160],[300,-160]], h:150 },
             { name:'pot L', c:[70,-100], r:11, h:30, prop:true },
             { name:'pot R', c:[240,-100], r:11, h:30, prop:true },
             { name:'bench', poly:[[330,-80],[400,-80],[400,-62],[330,-62]], h:22, prop:true },
             { name:'ac unit', poly:[[174,-508],[226,-508],[226,-480],[174,-480]], h:36, prop:true } ],
    marks:{ door:[150,-130], mat:[150,-130+35.4] }
  },
  yard(c){
    T(0, 460, -552, 0, 0.3, c.pave);
    for(let a = 10; a < 436; a += 30) for(let b = -126; b < -20; b += 24) poly([P(a,b,0.4), P(a+24,b,0.4), P(a+24,b+18,0.4), P(a,b+18,0.4)], null, '#c9c5bc', 1);
  },
  blocks(c, d){
    houseMass(40, 300, -130, -480, 150, c.wall, d);
    houseSideWins(40, 300, -130, -480, [[40,96]], c.blue, { plain:true, w:26, pitch:120 });
    T(40, 300, -480, -130, 150, shade(c.wall,.9));
    houseRailRing(44, 296, -476, -134, 150, 16, c.wall);
    houseMass(300, 420, -200, -480, 230, c.wall, d);
    houseSideWins(300, 420, -200, -480, [[160,206]], c.blue, { plain:true, w:26, pitch:120 });
    T(300, 420, -480, -200, 230, shade(c.wall,.92));
    if(d > 0){
      houseDoorway(150, -130, HOUSE_SC, c.blue, c.blue, 1);
      for(const [a0, a1] of [[60,100],[220,260]]) houseWin(a0, a1, 40, 96, -130, c.blue, c.wall, 1, { plain:true });
      houseArchWin(340, 380, 164, 214, -200, c.blue, 1);
      for(let k = 0; k < 14; k++) ball(102 + (k*13) % 96, -128, 108 + (k % 4)*9, 5 + (k % 3), k % 2 ? c.bloom : shade(c.bloom,1.15));
    } else {
      houseWin(80, 140, 40, 96, -480, c.blue, c.wall, -1, { plain:true });
      rearDoor(240, c.wall, c.blue, 480, 92);
    }
    if(state.roof){ cyl(360, -340, 230, 246, 48, c.wall); houseDome(360, -340, 48, 54, 4, 12, c.blue, null, 246); ball(360, -340, 302, 3.4, c.wall); F(359, 361, 302, 320, c.wall, null, 0, -340); F(354, 366, 312, 314, c.wall, null, 0, -340); }
  },
  stair(c){
    for(let k = 0; k < 10; k++){ const a0 = 300 + k*12; box(a0, a0 + 12, -200, -160, 0, 15*(k+1), shade(c.wall,1.02), c.wall, shade(c.wall,.86)); }
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    this.stair(c);
    for(const [nm, aa] of [['pot L', 70], ['pot R', 240]])
      houseProp(nm, () => { cyl(aa, -100, 0, 20, 11, '#b86a4a', shade('#b86a4a',1.15)); ball(aa, -100, 26, 10, '#4f8a4a'); ball(aa+3, -98, 31, 4, '#d9352a'); });
    houseProp('bench', () => box(330, 400, -80, -62, 0, 22, c.blue, shade(c.blue,.9), shade(c.blue,.75)));
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.blocks(c, 1);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); this.fore(p);
    this.blocks(c, -1);
    houseProp('ac unit', () => acUnit(200, 0, 480));
  }
},
/* ------------------------------------------------------------------ 67 */
{
  name:'Herengracht Canal House', hood:'The Flats', tier:'single', sc:HOUSE_SC, ww:HOUSE_SINGLE, dd:HOUSE_DEPTH_LAB,
  head:'Dutch canal house: tall and narrow, brick, scrolled neck gable, hoist beam',
  desc:'A tall, narrow Amsterdam canal house in dark brick: four storeys of tall white-framed windows, a scrolled neck gable with a pediment, a hoist beam and hook at the top, a door with a transom, and bicycles against the railing.',
  tags:['single','dutch','canal house','neck gable','narrow'],
  door:[180, -110],
  liv:[ { brick:'#6b3a2e', trim:'#f7f4ec', roof:'#3e3a38', leaf:'#1f3a2a', stone:'#c9c3b8' },
        { brick:'#8a4a3a', trim:'#f7f4ec', roof:'#44403c', leaf:'#2e2e3a', stone:'#d0cabe' },
        { brick:'#4a3a34', trim:'#fbf8f0', roof:'#3a3f44', leaf:'#5a1f24', stone:'#c4bea8' } ],
  vol:{
    foot:[[120,-110],[340,-110],[340,-500],[120,-500]], h:450,
    solids:[ { name:'rail', poly:[[360,-16],[456,-16],[456,-10],[360,-10]], h:34 },
             { name:'bike L', poly:[[360,-40],[450,-40],[450,-24],[360,-24]], h:40, prop:true },
             { name:'bike R', poly:[[20,-40],[110,-40],[110,-24],[20,-24]], h:40, prop:true },
             { name:'ac unit', poly:[[184,-528],[236,-528],[236,-500],[184,-500]], h:36, prop:true } ],
    marks:{ door:[180,-110], mat:[180,-110+35.4] }
  },
  yard(c){
    T(0, 460, -552, 0, 0.3, '#b8b2a6');
    for(let a = 0; a < 460; a += 16) poly([P(a,-110,0.4), P(a,0,0.4)], null, '#a39d92', 1);
  },
  gable(c, b, d){
    const L = [[110,330],[110,352],[88,352],[80,372],[48,380],[48,420],[40,420]];
    const top = []; for(let k = 0; k <= 8; k++){ const t = k/8; top.push([40 - 80*t, 420 + 22*Math.sin(Math.PI*t) + (t < 0.5 ? 18*t*2 : 18*(1-t)*2)]); }
    const pts = [...L.map(([x, z]) => [230 + x, z]), ...top.map(([x, z]) => [230 + x, z]), ...L.slice().reverse().map(([x, z]) => [230 - x, z])];
    poly(pts.map(([a, z]) => P(a, b - 6*d, z)), shade(c.brick,.8));
    poly(pts.map(([a, z]) => P(a, b, z)), c.brick, shade(c.brick,.6), 1.2);
    poly(pts.map(([a, z]) => P(a, b + 0.3*d, z)), null, c.stone, 2);
    houseWin(212, 248, 384, 416, b, c.trim, c.trim, d, { plain:true });
    if(d > 0){ box(222, 238, -110, -70, 424, 434, shade('#5a3a28',1.1), '#5a3a28', shade('#5a3a28',.8)); F(236, 238, 404, 424, '#2a2a2e', null, 0, -72); }
  },
  body(c, d){
    houseMass(120, 340, -110, -500, 330, c.brick, d);
    const face = d > 0 ? -110 : -500;
    for(let z = 6; z < 330; z += 6) poly([P(120,face+0.2*d,z), P(340,face+0.2*d,z)], null, shade(c.brick,.84), 1);
    houseSideWins(120, 340, -110, -500, [[40,100],[130,190],[220,280]], c.trim, { w:30, pitch:70 });
    houseFrontGable(120, 340, -110, -500, 330, 430, 0, c.roof, c.brick, d);
    this.gable(c, face, d);
    if(d > 0){
      houseDoorway(180, -110, HOUSE_SC, c.stone, c.leaf, 1);
      F(152, 208, 104, 118, 'rgba(170,205,220,.5)', c.trim, 1.5, -109.6);
      houseWin(250, 300, 20, 104, -110, c.trim, c.trim, 1);
      for(const z0 of [136, 226]) for(const [a0, a1] of [[140,186],[208,252],[274,320]]) houseWin(a0, a1, z0, z0 + 70, -110, c.trim, c.trim, 1);
    } else {
      for(const z0 of [136, 226]) for(const [a0, a1] of [[150,200],[260,310]]) houseWin(a0, a1, z0, z0 + 70, -500, c.trim, c.trim, -1);
      rearDoor(270, c.brick, c.leaf, 500, 92);
    }
  },
  bikes(){
    for(const [nm, a0] of [['bike L', 360], ['bike R', 20]])
      houseProp(nm, () => { for(const da of [14, 76]) faceCircle(a0 + da, -32, 16, 14, 'rgba(0,0,0,0)', '#2a2a2e', 2);
        poly([P(a0+14,-32,16), P(a0+44,-32,16), P(a0+62,-32,34), P(a0+30,-32,34), P(a0+14,-32,16)], null, '#b8352a', 2.2); poly([P(a0+62,-32,34), P(a0+76,-32,16)], null, '#b8352a', 2.2); });
  },
  fore(p){
    F(360, 456, 30, 34, '#2a2a2e', null, 0, -13); for(let a = 362; a < 456; a += 12) F(a, a+1.6, 0, 30, '#2a2a2e', null, 0, -13);
    this.bikes();
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.body(c, 1);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); this.fore(p);
    this.body(c, -1);
    houseProp('ac unit', () => acUnit(210, 0, 500));
  }
},
/* ------------------------------------------------------------------ 68 */
{
  name:'Bukchon Hanok', hood:'The Flats', tier:'double', sc:HOUSE_SC, ww:HOUSE_DOUBLE, dd:HOUSE_DEPTH_LAB,
  head:'Korean hanok: grey tile roof with upturned eaves, timber frame, lattice doors, gate',
  desc:'A Korean hanok: white plaster panels in a dark timber frame on a stone plinth, a row of lattice doors, a deep grey giwa-tile hip roof with a heavy ridge and upturned corners, a tiled-cap stone wall with a roofed gate, onggi jars and a pine.',
  tags:['double','korean','hanok','tile roof','gate'],
  yardFence:{ style:'wall', h:38, col:'stone', cap:'roof' },
  door:[405, -170],
  liv:[ { wall:'#f2eee2', wood:'#5a3a26', roof:'#5a5e62', leaf:'#5a3a26', stone:'#a8a296' },
        { wall:'#efe9da', wood:'#4a3020', roof:'#4e5256', leaf:'#4a3020', stone:'#9c968a' },
        { wall:'#f4f0e6', wood:'#6b4a2e', roof:'#62666a', leaf:'#6b4a2e', stone:'#b3ada2' } ],
  vol:{
    foot:[[120,-170],[700,-170],[700,-430],[120,-430]], h:250,
    solids:[ { name:'wall L', poly:[[6,-14],[370,-14],[370,-4],[6,-4]], h:44 },
             { name:'wall R', poly:[[440,-14],[804,-14],[804,-4],[440,-4]], h:44 },
             { name:'jars', poly:[[120,-90],[220,-90],[220,-50],[120,-50]], h:40, prop:true },
             { name:'pine', c:[640,-80], r:8, h:130, prop:true },
             { name:'ac unit', poly:[[134,-458],[186,-458],[186,-430],[134,-430]], h:36, prop:true },
             { name:'bin', poly:[[682,-480],[718,-480],[718,-444],[682,-444]], h:52, prop:true } ],
    marks:{ door:[405,-170], mat:[405,-170+35.4] }
  },
  yard(c){
    T(0, 809.6, -552, 0, 0.3, '#ddd6c6');
    T(110, 710, -440, -160, 3, c.stone);
    for(let a = 110; a < 710; a += 30) poly([P(a,-160,3.1), P(a,-440,3.1)], null, shade(c.stone,.8), 1);
    for(let b = -150; b < -18; b += 22) T(380, 430, b, b+14, 0.7, c.stone);
  },
  lattice(a0, a1, z0, z1, b, c, d){
    F(a0, a1, z0, z1, '#f4efe0', c.wood, 1.4, b + 0.3*d);
    for(let t = -(z1-z0); t < (a1-a0); t += 9){
      const c0 = Math.max(0, t), c1 = Math.min(a1-a0, t + (z1-z0));
      if(c1 > c0){ poly([P(a0+c0, b+0.5*d, z0 + (c0-t)), P(a0+c1, b+0.5*d, z0 + (c1-t))], null, c.wood, 0.9);
                   poly([P(a0+c0, b+0.5*d, z1 - (c0-t)), P(a0+c1, b+0.5*d, z1 - (c1-t))], null, c.wood, 0.9); }
    }
  },
  walls(c, d){
    houseMass(120, 700, -170, -430, 110, c.wall, d);
    const face = d > 0 ? -170 : -430;
    for(let a = 120; a <= 700; a += 58) F(a-4, a+4, 0, 110, c.wood, null, 0, face + 0.4*d);
    F(120, 700, 102, 110, c.wood, null, 0, face + 0.4*d);
    houseSideWins(120, 700, -170, -430, [[30,96]], c.wood, { plain:true, w:40, pitch:65 });
    if(d > 0){
      for(let a = 128; a < 692; a += 58) if(Math.abs(a + 25 - 405) > 50) this.lattice(a, a + 50, 8, 96, -170, c, 1);
      houseDoorway(405, -170, HOUSE_SC, c.wood, c.leaf, 1);
    } else {
      for(let a = 186; a < 634; a += 58) this.lattice(a, a + 50, 8, 96, -430, c, -1);
      rearDoor(560, c.wall, c.leaf, 430, 92);
    }
  },
  roof(c){
    houseHip(120, 700, -170, -430, 110, 216, 54, c.roof);
    box(290, 530, -310, -290, 212, 232, shade(c.roof,1.1), shade(c.roof,.9), shade(c.roof,.75));
    for(const a of [290, 530]) houseCone(a, -300, 10, 6, 232, 252, shade(c.roof,.9));
    const k = 106/130, zE = 110 - 54*k, Bf = state.back ? -484 : -116;
    for(const [A, s] of [[66, -1], [754, 1]]) poly([P(A, Bf, zE), P(A + 16*s, Bf + (state.back ? -14 : 14), zE + 16), P(A - 10*s, Bf, zE + 4)], shade(c.roof,.8), shade(c.roof,.6), 1);
  },
  gate(c){
    for(const [a0, a1] of [[6, 370], [440, 804]]){
      box(a0, a1, -14, -4, 0, 38, shade(c.stone,1.04), c.stone, shade(c.stone,.8));
      box(a0-2, a1+2, -16, -2, 38, 44, c.roof, shade(c.roof,.9), shade(c.roof,.75));
    }
    for(const aa of [370, 440]) box(aa-5, aa+5, -14, -4, 0, 96, c.wood, shade(c.wood,1.1), shade(c.wood,.85));
    houseProfileRoof(356, 454, [[-4,96],[-9,108],[-14,96]], 4, c.roof, c.wood);
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    this.roof(c);
    this.gate(c);
    houseProp('jars', () => { for(const [a, b, r] of [[140,-70,16],[176,-66,20],[206,-74,12]]) { ball(a, b, r, r, '#6b3a22'); cyl(a, b, r*1.7, r*1.9, r*0.55, '#5a3020'); } });
    houseProp('pine', () => { tube(640, -80, 0, 630, -74, 80, 4, '#5a4030'); ball(626, -72, 90, 26, '#3f5a3a'); ball(660, -90, 70, 20, '#48653f'); ball(638, -80, 122, 16, '#3a5a36'); });
    if(!state.back) houseYardFence(this, this.liv[state.pal % this.liv.length], 'near');
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far');
    this.walls(c, 1);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far');
    this.gate(c);
    houseProp('jars', () => ball(176, -66, 20, 20, '#6b3a22'));
    houseProp('pine', () => ball(626, -72, 90, 26, '#3f5a3a'));
    this.walls(c, -1);
    this.roof(c);
    houseProp('ac unit', () => acUnit(160, 0, 430));
    houseProp('bin', () => wheelieBin(700, '#3f6b4a', 0, 430));
    houseYardFence(this, c, 'near');
  }
},
/* ------------------------------------------------------------------ 69 */
{
  name:'Fjord Sod-Roof Cabin', hood:'The Flats', tier:'single', sc:HOUSE_SC, ww:HOUSE_SINGLE, dd:HOUSE_DEPTH_LAB,
  head:'Norwegian cabin: tarred logs, living turf roof with flowers, red door',
  desc:'A Norwegian mountain cabin: dark tarred log walls with white window trim and a red door, and a low-pitched roof of living turf held by log retainers along the eaves, grass tufts and wildflowers growing on top; a bench and a sled by the door.',
  tags:['single','norwegian','sod roof','log','cabin'],
  door:[230, -130],
  liv:[ { log:'#4a3a30', grass:'#6f9a4e', trim:'#f2ece0', leaf:'#b8352a' },
        { log:'#8a5a2e', grass:'#7aa656', trim:'#f5efe4', leaf:'#2e5a3a' },
        { log:'#5a4a3a', grass:'#669248', trim:'#efe8da', leaf:'#e0b43a' } ],
  vol:{
    foot:[[60,-130],[400,-130],[400,-470],[60,-470]], h:220,
    solids:[ { name:'bench', poly:[[90,-70],[146,-70],[146,-56],[90,-56]], h:24, prop:true },
             { name:'sled', poly:[[300,-72],[380,-72],[380,-52],[300,-52]], h:30, prop:true },
             { name:'woodpile', poly:[[150,-502],[230,-502],[230,-474],[150,-474]], h:28, prop:true } ],
    marks:{ door:[230,-130], mat:[230,-130+35.4] }
  },
  prof:[[-130,110],[-300,200],[-470,110]],
  yard(c){
    houseLawn(0, 460, -552, 0, shade(c.grass,1.04));
    for(let b = -122; b < -16; b += 20) T(206, 254, b, b+13, 0.7, '#8f8a80');
  },
  body(c, d){
    houseMass(60, 400, -130, -470, 110, c.log, d);
    const face = d > 0 ? -130 : -470;
    houseLogs(60, 400, 0, 110, face, c.log, d);
    houseEndLogs(60, 400, -130, -470, 0, 110, c.log);
    houseSideWins(60, 400, -130, -470, [[36,86]], c.trim);
    if(d > 0){
      houseDoorway(230, -130, HOUSE_SC, c.trim, c.leaf, 1);
      for(const [a0, a1] of [[100,150],[310,360]]) houseWin(a0, a1, 36, 86, -130, c.trim, c.trim, 1);
    } else {
      houseWin(120, 170, 36, 86, -470, c.trim, c.trim, -1);
      rearDoor(300, c.log, c.leaf, 470, 92);
    }
    houseProfileRoof(60, 400, this.prof, 18, c.grass, c.log, { gable:shade(c.log,1.05), barge:shade(c.log,.8) });
    const k = 90/170, zE = 110 - 18*k, Bn = d > 0 ? -112 : -488;
    tube(38, Bn, zE + 3, 422, Bn, zE + 3, 5, shade(c.log,.8));
    const b0 = d > 0 ? -112 : -488, bm = -300, s = d > 0 ? 1 : -1;
    const cols = ['#f2d36a','#f7f4ec','#d9368a','#8a6ad6'];
    for(let k2 = 0; k2 < 60; k2++){
      const u = ((k2*37) % 100)/100, v = ((k2*61) % 97)/97;
      const a = 50 + 360*u, b = b0 + (bm - b0)*v*0.95, z = zE + (200 - zE)*v*0.95 + 1;
      poly([P(a,b,z), P(a-2,b,z+9), P(a+3,b,z+7)], shade(c.grass, 0.8 + (k2 % 3)*0.1));
      if(k2 % 5 === 0) ball(a+2, b, z + 5, 2.4, cols[k2 % 4]);
    }
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    houseProp('bench', () => {
      box(90, 146, -70, -56, 16, 20, '#8a6848', '#7a5a3c', '#6a4e34');
      for(const aa of [94, 142]) box(aa-2, aa+2, -68, -58, 0, 16, '#5a4230', '#4d3828', '#402e20');
    });
    houseProp('sled', () => {
      box(300, 380, -72, -52, 12, 16, '#b8352a', '#9c2c22', '#84261c');
      for(const b of [-70, -54]) poly([P(300,b,2), P(380,b,2), P(392,b,14)], null, '#3a3a3e', 2);
      for(const aa of [310, 370]) box(aa-2, aa+2, -70, -54, 2, 12, '#3a3a3e', '#2a2a2e', '#1f1f22');
    });
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.body(c, 1);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); this.fore(p);
    this.body(c, -1);
    houseProp('woodpile', () => {
      box(150, 230, -502, -474, 0, 28, '#8a6848', '#7a5a3c', '#6a4e34');
      for(let a = 156; a < 228; a += 10) for(const z of [7, 20]) faceCircle(a, -502.4, z, 5, '#c9a878', '#7a5a3c', 1);
    });
  }
},
/* ------------------------------------------------------------------ 70 */
{
  name:'Brenta Palladian Villa', hood:'The Flats', tier:'double', sc:HOUSE_SC, ww:HOUSE_DOUBLE, dd:HOUSE_DEPTH_LAB,
  head:'Palladian villa: domed centre block, temple portico, low flanking wings',
  desc:'A Palladian villa: a two-storey centre block under a low hip crowned by a drum and dome, a four-column temple portico with a pediment, two low wings stepping back either side, pedimented windows, a gravel parterre of clipped hedges and stone urns.',
  tags:['double','palladian','dome','portico','classical'],
  door:[405, -150],
  liv:[ { wall:'#f2e6cc', trim:'#fbf8f0', roof:'#b86a4a', leaf:'#4a3a2e', dome:'#8a9a8a' },
        { wall:'#e8e0d0', trim:'#fbfbf8', roof:'#9c5a42', leaf:'#2e3a30', dome:'#6f7a80' },
        { wall:'#f0dcc0', trim:'#fbf6ea', roof:'#c0704e', leaf:'#5a3a28', dome:'#9aa88e' } ],
  vol:{
    foot:[[60,-190],[250,-190],[250,-150],[560,-150],[560,-190],[750,-190],[750,-430],[560,-430],[560,-470],[250,-470],[250,-430],[60,-430]], h:410,
    solids:[ ...[290, 360, 450, 520].map((a, i) => ({ name:'column ' + (i+1), c:[a,-96], r:9, h:244 })),
             { name:'hedge L', poly:[[30,-100],[330,-100],[330,-60],[30,-60]], h:22 },
             { name:'hedge R', poly:[[480,-100],[780,-100],[780,-60],[480,-60]], h:22 },
             { name:'urn L', c:[340,-30], r:12, h:40, prop:true },
             { name:'urn R', c:[470,-30], r:12, h:40, prop:true },
             { name:'ac unit', poly:[[94,-458],[146,-458],[146,-430],[94,-430]], h:36, prop:true },
             { name:'bin', poly:[[682,-480],[718,-480],[718,-444],[682,-444]], h:52, prop:true } ],
    marks:{ door:[405,-150], mat:[405,-150+35.4] }
  },
  yard(c){
    T(0, 809.6, -552, 0, 0.3, '#e2dccc');
    T(270, 540, -150, -86, 3, '#dcd6c8');
  },
  hood(a0, a1, z, b){ poly([P(a0-6,b+0.5,z), P((a0+a1)/2,b+0.5,z+12), P(a1+6,b+0.5,z)], '#fbf8f0', '#b8b4ac', 1); },
  centre(c, d){
    houseMass(250, 560, -150, -470, 240, c.wall, d);
    const face = d > 0 ? -150 : -470;
    F(250, 560, 120, 126, c.trim, null, 0, face + 0.4*d);
    houseSideWins(250, 560, -150, -470, [[40,110],[150,214]], c.trim);
    if(d > 0){
      houseDoorway(405, -150, HOUSE_SC, c.trim, c.leaf, 1);
      for(const [a0, a1] of [[270,310],[500,540]]){ houseWin(a0, a1, 40, 110, -150, c.trim, c.trim, 1); this.hood(a0, a1, 116, -150); }
      for(const [a0, a1] of [[270,310],[340,380],[430,470],[500,540]]) houseWin(a0, a1, 150, 214, -150, c.trim, c.trim, 1);
    } else {
      for(const [a0, a1] of [[290,340],[470,520]]) houseWin(a0, a1, 150, 214, -470, c.trim, c.trim, -1);
      rearDoor(405, c.wall, c.leaf, 470, 92);
    }
    houseHip(250, 560, -150, -470, 240, 300, 12, c.roof);
    if(state.roof){
      const seen = housePrism(houseRing(405,-310,62,12), 280, 336, c.wall, { top:false });
      for(const f of seen) houseFaceWin(f, 0.3, 0.7, 296, 324, c.trim, { plain:true });
      houseDome(405, -310, 66, 60, 4, 12, c.dome, null, 336);
      cyl(405, -310, 394, 410, 6, c.trim);
    }
  },
  wing(c, a0, a1, d, ends){
    houseMass(a0, a1, -190, -430, 150, c.wall, d);
    const face = d > 0 ? -190 : -430;
    houseSideWins(a0, a1, -190, -430, [[40,110]], c.trim);
    for(const a of [a0 + 40, a1 - 90]) { houseWin(a, a + 50, 40, 110, face, c.trim, c.trim, d); if(d > 0) this.hood(a, a + 50, 116, face); }
    houseHip(a0, a1, -190, -430, 150, 190, 10, c.roof, ends);
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    for(const aa of [290, 360, 450, 520]){ cyl(aa, -96, 3, 230, 9, c.trim, shade(c.trim,1.02)); box(aa-11, aa+11, -107, -85, 230, 236, c.trim, shade(c.trim,.9), shade(c.trim,.78)); }
    box(270, 540, -110, -84, 236, 252, c.trim, shade(c.trim,.94), shade(c.trim,.8));
    houseFrontGable(270, 540, -84, -150, 252, 300, 6, c.roof, c.trim, 1, { back0:true, barge:c.trim, gable:shade(c.trim,.96) });
    for(const [a0, a1] of [[30, 330], [480, 780]]){
      for(const [b0, b1] of [[-100,-90],[-70,-60]]) box(a0, a1, b0, b1, 0, 22, '#4f7a42', '#426a38', '#3a5e32');
      for(const aa of [a0, a1 - 10]) box(aa, aa + 10, -100, -60, 0, 22, '#4f7a42', '#426a38', '#3a5e32');
    }
    for(const [nm, aa] of [['urn L', 340], ['urn R', 470]])
      houseProp(nm, () => { cyl(aa, -30, 0, 10, 7, '#c9c3b8'); cyl(aa, -30, 10, 28, 12, '#d8d2c6', '#e6e0d4'); ball(aa, -30, 32, 10, '#4f7a4a'); });
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.wing(c, 60, 250, 1, { hi:false });
    this.centre(c, 1);
    this.wing(c, 560, 750, 1, { lo:false });
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); this.fore(p);
    this.wing(c, 560, 750, -1, { lo:false });
    this.centre(c, -1);
    this.wing(c, 60, 250, -1, { hi:false });
    houseProp('ac unit', () => acUnit(120, 0, 430));
    houseProp('bin', () => wheelieBin(700, '#3f6b4a', 0, 430));
  }
},
/* ------------------------------------------------------------------ 71 */
{
  name:'Old North Chapel House', hood:'The Flats', tier:'double', sc:HOUSE_SC, ww:HOUSE_DOUBLE, dd:HOUSE_DEPTH_LAB,
  head:'Converted chapel: steep nave gable, rose window, steeple with belfry and spire',
  desc:'A white clapboard country chapel converted into a house: a steep front-gabled nave with pointed windows and a rose window, a square steeple on the corner with a louvered belfry and a tall spire, a low parsonage wing, a lamp and a bench.',
  tags:['double','chapel','steeple','gothic','conversion'],
  door:[330, -160],
  liv:[ { wall:'#f7f5ef', trim:'#2a2a2e', roof:'#3e4448', leaf:'#8a2f2f', glass:'#3a5a8a' },
        { wall:'#efe6d2', trim:'#3a2a22', roof:'#44403c', leaf:'#2e4d68', glass:'#8a3a4a' },
        { wall:'#e8ecec', trim:'#2a2e2c', roof:'#3a3f44', leaf:'#3f5a3a', glass:'#4a7a5a' } ],
  vol:{
    foot:[[40,-200],[200,-200],[200,-160],[460,-160],[460,-140],[560,-140],[560,-240],[460,-240],[460,-500],[40,-500]], h:570,
    solids:[ { name:'bench', poly:[[620,-80],[690,-80],[690,-64],[620,-64]], h:24, prop:true },
             { name:'lamp', c:[250,-40], r:6, h:96, prop:true },
             { name:'ac unit', poly:[[94,-528],[146,-528],[146,-500],[94,-500]], h:36, prop:true },
             { name:'bin', poly:[[482,-550],[518,-550],[518,-514],[482,-514]], h:52, prop:true } ],
    marks:{ door:[330,-160], mat:[330,-160+35.4] }
  },
  yard(c){
    houseLawn(0, 809.6, -552, 0, '#7a9e58');
    T(295, 365, -160, 0, 0.6, '#c9c1b0');
  },
  nave(c, d){
    houseMass(200, 460, -160, -500, 200, c.wall, d);
    const face = d > 0 ? -160 : -500;
    for(let z = 8; z < 198; z += 7) poly([P(200,face+0.3*d,z), P(460,face+0.3*d,z)], null, shade(c.wall,.88), 1);
    houseSideWins(200, 460, -160, -500, [[40,160]], c.glass, { w:28, pitch:80 });
    houseProfileRoofB(-160, -500, [[200,200],[330,340],[460,200]], 10, c.roof, c.wall, {
      onFront: () => { faceCircle(330, -159.6, 262, 26, c.trim); faceCircle(330, -159.4, 262, 22, c.glass);
                       for(let k = 0; k < 8; k++){ const t = k/8*Math.PI*2; poly([P(330,-159.2,262), P(330 + 22*Math.cos(t), -159.2, 262 + 22*Math.sin(t))], null, c.trim, 1.4); } },
      onBack: () => houseArchWin(310, 350, 220, 290, -500, c.trim, -1, { pointed:true }) });
    if(d > 0){
      houseArch(330, -160, houseDoorDims(HOUSE_SC).h, 50, 30, shade(c.wall,.92), 1);
      houseDoorway(330, -160, HOUSE_SC, c.trim, c.leaf, 1);
      for(const [a0, a1] of [[226,262],[398,434]]) houseArchWin(a0, a1, 40, 170, -160, c.trim, 1, { pointed:true });
    } else {
      for(const [a0, a1] of [[226,262],[398,434]]) houseArchWin(a0, a1, 40, 170, -500, c.trim, -1, { pointed:true });
      rearDoor(330, c.wall, c.leaf, 500, 92);
    }
  },
  steeple(c){
    box(460, 560, -240, -140, 0, 330, shade(c.wall,1.02), c.wall, shade(c.wall,.8));
    const face = state.back ? -240 : -140, d = state.back ? -1 : 1;
    for(let z = 8; z < 328; z += 7) poly([P(460,face+0.3*d,z), P(560,face+0.3*d,z)], null, shade(c.wall,.88), 1);
    houseArchWin(490, 530, 150, 250, face, c.trim, d, { pointed:true });
    box(470, 550, -230, -150, 330, 396, shade(c.wall,1.02), c.wall, shade(c.wall,.8));
    for(const [a0, a1] of [[484,536]]){ F(a0, a1, 342, 386, '#2a2a2e', null, 0, face + (state.back ? -10 : 10)*d*0 + (state.back ? -230 - face : -150 - face) + 0.4*d); }
    const lf = state.back ? -230.4 : -149.6;
    F(484, 536, 342, 386, '#2a2a2e', null, 0, lf);
    for(let z = 346; z < 386; z += 6) F(484, 536, z, z+2.4, shade(c.wall,.85), null, 0, lf + 0.3*d);
    const aS = FLANK_RIGHT ? 550.4 : 469.6;
    S(aS, -216, -164, 342, 386, '#2a2a2e');
    for(let z = 346; z < 386; z += 6) S(aS + (FLANK_RIGHT ? 0.3 : -0.3), -216, -164, z, z+2.4, shade(c.wall,.8));
    houseCone(510, -190, 54, 8, 396, 570, c.roof);
    if(state.roof){ cyl(510, -190, 570, 590, 1.4, '#c9a24a'); F(502, 518, 580, 582, '#c9a24a', null, 0, -190); }
  },
  wing(c, d){
    houseMass(40, 200, -200, -500, 120, c.wall, d);
    const face = d > 0 ? -200 : -500;
    for(let z = 8; z < 118; z += 7) poly([P(40,face+0.3*d,z), P(200,face+0.3*d,z)], null, shade(c.wall,.88), 1);
    houseSideWins(40, 200, -200, -500, [[36,96]], c.trim);
    houseWin(90, 150, 36, 96, face, c.trim, c.trim, d);
    houseProfileRoof(40, 200, [[-200,120],[-350,190],[-500,120]], 10, c.roof, c.wall, { hi:false });
  },
  fore(p){
    houseProp('bench', () => {
      box(620, 690, -80, -64, 16, 20, '#a8835c', '#96744f', '#836544');
      for(const aa of [624, 686]) box(aa-2, aa+2, -78, -66, 0, 16, '#6b5038', '#5a4230', '#4d3828');
    });
    houseProp('lamp', () => { cyl(250, -40, 0, 84, 2.5, '#2a2a2e'); box(244, 256, -46, -34, 84, 98, '#3a3a3e', 'rgba(250,230,160,.85)', 'rgba(230,205,140,.85)'); });
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.wing(c, 1);
    this.nave(c, 1);
    this.steeple(c);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); this.fore(p);
    this.steeple(c);
    this.nave(c, -1);
    this.wing(c, -1);
    houseProp('ac unit', () => acUnit(120, 0, 500));
    houseProp('bin', () => wheelieBin(500, '#3f6b4a', 0, 500));
  }
},
/* ------------------------------------------------------------------ 72 */
{
  name:'Oaxaca Casa de Colores', hood:'The Flats', tier:'single', sc:HOUSE_SC, ww:HOUSE_SINGLE, dd:HOUSE_DEPTH_LAB,
  head:'Mexican casa: bright stucco, stepped parapet, rain spouts, talavera, papel picado',
  desc:'A brightly painted Mexican casa: flat roof behind a stepped parapet with wooden rain spouts, a turquoise arched door framed in talavera tiles, a wrought-iron balconette, bougainvillea, potted cacti and strings of papel picado across the yard.',
  tags:['single','mexican','colourful','flat roof','talavera'],
  door:[230, -140],
  liv:[ { wall:'#d9368a', trim:'#f2d36a', leaf:'#2f9a9a', tile:'#1f5aa8' },
        { wall:'#1f6aa8', trim:'#f2d36a', leaf:'#d9573c', tile:'#f7f4ec' },
        { wall:'#f2b43a', trim:'#d9368a', leaf:'#1f5aa8', tile:'#2f8a5a' } ],
  vol:{
    foot:[[40,-140],[420,-140],[420,-480],[40,-480]], h:210,
    solids:[ { name:'pole L', c:[20,-40], r:4, h:140 }, { name:'pole R', c:[440,-40], r:4, h:140 },
             { name:'cactus L', c:[90,-90], r:12, h:60, prop:true },
             { name:'cactus R', c:[370,-90], r:12, h:60, prop:true },
             { name:'ac unit', poly:[[294,-508],[346,-508],[346,-480],[294,-480]], h:36, prop:true } ],
    marks:{ door:[230,-140], mat:[230,-140+35.4] }
  },
  yard(c){
    T(0, 460, -552, 0, 0.3, '#e2cfae');
    for(let a = 195; a < 265; a += 14) for(let b = -134; b < -12; b += 14) T(a, a+12, b, b+12, 0.6, (a/14 + b/14) & 1 ? '#b86a4a' : '#c9805a');
  },
  body(c, d){
    houseMass(40, 420, -140, -480, 170, c.wall, d);
    const face = d > 0 ? -140 : -480;
    houseSideWins(40, 420, -140, -480, [[40,100]], c.trim, { w:34 });
    T(40, 420, -480, -140, 170, shade(c.wall,.8));
    const nearB = d > 0 ? -140 : -480;
    for(const [a0, a1, z] of [[40,140,190],[140,320,204],[320,420,190]]) box(a0, a1, d > 0 ? nearB - 8 : nearB, d > 0 ? nearB : nearB + 8, 170, z, shade(c.wall,1.04), c.wall, shade(c.wall,.8));
    for(const a of [90, 230, 370]) box(a-4, a+4, d > 0 ? nearB : nearB - 20, d > 0 ? nearB + 20 : nearB, 160, 166, '#8a6848', '#7a5a3c', '#6a4e34');
    if(d > 0){
      for(let z = 0; z < 110; z += 10) for(const a0 of [180, 270]) F(a0, a0 + 10, z, z + 10, (z/10) % 2 ? c.tile : '#f7f4ec', null, 0, -139.6);
      for(let a = 180; a < 280; a += 10) F(a, a + 10, 110, 120, (a/10) % 2 ? c.tile : '#f7f4ec', null, 0, -139.6);
      houseArch(230, -140, houseDoorDims(HOUSE_SC).h, 42, 14, c.trim, 1);
      houseDoorway(230, -140, HOUSE_SC, c.trim, c.leaf, 1);
      houseWin(80, 140, 40, 110, -140, c.trim, c.trim, 1, { plain:true });
      houseWin(320, 380, 40, 110, -140, c.trim, c.trim, 1, { plain:true });
      houseWin(205, 255, 130, 160, -140, c.trim, c.trim, 1, { plain:true });
      slab(196, 264, 124, 128, -126, -140, '#2a2a2e');
      for(let a = 198; a <= 262; a += 6) F(a, a+1.4, 128, 146, '#2a2a2e', null, 0, -126);
      for(let k = 0; k < 16; k++) ball(290 + (k*11) % 110, -138, 120 + (k % 5)*9, 5 + (k % 3), k % 2 ? '#d9368a' : '#e2748c');
    } else {
      houseWin(100, 160, 40, 110, -480, c.trim, c.trim, -1, { plain:true });
      rearDoor(300, c.wall, c.leaf, 480, 92);
    }
  },
  flags(){
    const cols = ['#d9368a','#f2d36a','#2f9a9a','#e0602a','#6ad0e0','#8a4ad6'];
    for(const [z, sag] of [[130, 20], [110, 16]]){
      for(let a = 20; a < 440; a += 14){
        const t = (a - 20)/420, zz = z - sag*4*t*(1-t);
        poly([P(a,-40,zz), P(a+10,-40,zz), P(a+10,-40,zz-12), P(a+5,-40,zz-9), P(a,-40,zz-12)], cols[(a/14|0) % cols.length]);
      }
    }
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    for(const aa of [20, 440]) cyl(aa, -40, 0, 140, 3, '#8a6848');
    this.flags();
    for(const [nm, aa] of [['cactus L', 90], ['cactus R', 370]])
      houseProp(nm, () => { cyl(aa, -90, 0, 18, 12, '#b86a4a', shade('#b86a4a',1.15)); houseCactus(aa, -90, 44, '#5f8a4f'); });
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.body(c, 1);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); this.fore(p);
    this.body(c, -1);
    houseProp('ac unit', () => acUnit(320, 0, 480));
  }
},
/* ------------------------------------------------------------------ 73 */
{
  name:'Bridgetown Chattel House', hood:'The Flats', tier:'single', sc:HOUSE_SC, ww:HOUSE_SINGLE, dd:HOUSE_DEPTH_LAB,
  head:'Caribbean chattel house: small timber house, fretwork eaves, jalousie windows',
  desc:'A brightly painted Barbadian chattel house: a small timber house on stone blocks under a steep hipped tin roof edged with scalloped fretwork, louvered jalousie windows, a centre door with its own little gabled hood, a breadfruit tree and a clothesline.',
  tags:['single','caribbean','chattel','fretwork','colourful'],
  door:[230, -130],
  liv:[ { wall:'#f29ab0', trim:'#fbfaf5', roof:'#8a9096', leaf:'#2f9a9a', shut:'#2f9a9a' },
        { wall:'#6ad0c8', trim:'#fbfaf5', roof:'#9ea3a8', leaf:'#e0602a', shut:'#f2d36a' },
        { wall:'#f2d36a', trim:'#fbfaf5', roof:'#8a8f94', leaf:'#3f6bd6', shut:'#3f6bd6' } ],
  vol:{
    foot:[[110,-130],[350,-130],[350,-420],[110,-420]], h:210,
    solids:[ { name:'breadfruit', c:[400,-80], r:9, h:170, prop:true },
             { name:'line L', c:[30,-200], r:4, h:100 }, { name:'line R', c:[30,-360], r:4, h:100 },
             { name:'barrel', c:[370,-440], r:12, h:40, prop:true } ],
    marks:{ door:[230,-130], mat:[230,-130+35.4] }
  },
  yard(c){
    houseLawn(0, 460, -552, 0, '#86a85e');
    T(195, 265, -130, 0, 0.6, '#d8d0bc');
  },
  jalousie(a0, a1, z0, z1, b, c, d){
    F(a0-5, a1+5, z0-5, z1+5, c.trim, shade(c.trim,.7), 1, b + 0.3*d);
    F(a0, a1, z0, z1, c.shut, null, 0, b + 0.5*d);
    for(let z = z0 + 4; z < z1; z += 6) F(a0, a1, z, z+2, shade(c.shut,.72), null, 0, b + 0.7*d);
    F((a0+a1)/2 - 1, (a0+a1)/2 + 1, z0, z1, c.trim, null, 0, b + 0.8*d);
  },
  fret(A0, A1, B, z, c){ for(let a = A0; a < A1 - 1; a += 10){ const pts = []; for(let k = 0; k <= 6; k++){ const t = Math.PI*k/6; pts.push(P(a + 5 - 5*Math.cos(t), B, z - 6*Math.sin(t))); } poly(pts, c.trim); } },
  body(c, d){
    for(const [a, b] of [[114,-134],[346,-134],[114,-416],[346,-416],[230,-134]]) box(a-6, a+6, b-6, b+6, 0, 8, '#a8a296', '#9c968a', '#8a857b');
    houseMass(110, 350, -130, -420, 110, c.wall, d, 8);
    const face = d > 0 ? -130 : -420;
    for(let a = 116; a < 350; a += 10) F(a, a+1.4, 8, 110, shade(c.wall,.86), null, 0, face + 0.2*d);
    houseSideWins(110, 350, -130, -420, [[36,90]], c.trim, { plain:true, pitch:100 });
    if(d > 0){
      houseDoorway(230, -130, HOUSE_SC, c.trim, c.leaf, 1);
      this.jalousie(140, 180, 36, 90, -130, c, 1);
      this.jalousie(280, 320, 36, 90, -130, c, 1);
    } else {
      this.jalousie(160, 210, 36, 90, -420, c, -1);
      rearDoor(290, c.wall, c.leaf, 420, 92);
    }
    houseHip(110, 350, -130, -420, 110, 190, 12, c.roof);
    const k = 80/120, zE = 110 - 12*k;
    this.fret(98, 362, d > 0 ? -117.6 : -432.4, zE - 7, c);
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    houseFrontGable(190, 270, -116, -130, 104, 124, 4, c.roof, c.trim, 1, { back0:true, barge:c.trim });
    for(const aa of [30]) for(const b of [-200, -360]) cyl(aa, b, 0, 100, 2.5, '#8a6848');
    poly([P(30,-200,96), P(30,-280,90), P(30,-360,96)], null, '#e8e4da', 1);
    for(const [b, col] of [[-230,'#e0602a'],[-262,'#f7f4ec'],[-300,'#3f6bd6'],[-330,'#f2d36a']]) S(30, b-12, b+12, 70, 91, col);
    houseProp('breadfruit', () => { cyl(400, -80, 0, 90, 7, '#6b5038'); ball(400, -80, 130, 40, '#3f7a3e'); ball(376, -70, 112, 26, '#4a8a48'); ball(420, -90, 150, 24, '#36703a'); for(const [x, z] of [[392,118],[412,132],[384,140]]) ball(x, -60, z, 5, '#9ac05a'); });
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.body(c, 1);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); this.fore(p);
    this.body(c, -1);
    houseProp('barrel', () => { cyl(370, -440, 0, 40, 12, '#3f5a3a', '#4f6a48'); });
  }
},
/* ------------------------------------------------------------------ 74 */
{
  name:'Futuro Pod House', hood:'The Flats', tier:'double', sc:HOUSE_SC, ww:HOUSE_DOUBLE, dd:HOUSE_DEPTH_LAB,
  head:'Futuro pods: two lens-shaped fibreglass pods on legs, a glazed link with the door',
  desc:'A sixties space-age house of two lens-shaped fibreglass pods standing on splayed legs, each ringed with oval windows, joined at ground level by a white link pod that carries the door, with a sputnik lamp and a round planter in a gravel yard.',
  tags:['double','futuro','space age','pods'],
  door:[405, -140],
  liv:[ { a:'#f7f4ec', b:'#f2c94a', trim:'#2a2a2e', leaf:'#e0602a' },
        { a:'#f4f4f0', b:'#e0602a', trim:'#2a2a2e', leaf:'#2f8f8a' },
        { a:'#f6f4ee', b:'#8ad0c8', trim:'#2a2a2e', leaf:'#d9368a' } ],
  vol:{
    foot:[[330,-200],[480,-200],[480,-140],[330,-140]], h:260,
    solids:[ ...[[150,-250],[290,-250],[150,-390],[290,-390],[530,-230],[670,-230],[530,-370],[670,-370]].map(([a, b], i) => ({ name:'leg ' + (i+1), c:[a, b], r:6, h:90 })),
             { name:'lamp', c:[250,-60], r:14, h:100, prop:true },
             { name:'planter', c:[560,-70], r:24, h:30, prop:true },
             { name:'ac unit', poly:[[374,-508],[426,-508],[426,-480],[374,-480]], h:36, prop:true } ],
    marks:{ door:[405,-140], mat:[405,-140+35.4] }
  },
  yard(c){
    T(0, 809.6, -552, 0, 0.3, '#dcd6c8');
    for(const [a, b] of [[405,-110],[405,-80],[405,-50],[405,-20]]) plateCircle(a, b, 0.8, 12, '#bdb6a8');
  },
  pod(ac, bc, r, col, c){
    for(const [da, db] of [[-70,-70],[70,-70],[-70,70],[70,70]]){ const la = ac + da, lb = bc + db; tube(la, lb, 0, ac + da*0.45, bc + db*0.45, 100, 4, c.trim); }
    houseDome(ac, bc, r, -34, 3, 16, shade(col,.8), null, 110);
    houseDome(ac, bc, r, 60, 4, 16, col, (i, j) => i === 0 && j % 2 === 0, 110);
    houseDome(ac, bc, r*0.2, 8, 2, 8, c.trim, null, 170);
  },
  link(c, d){
    const seen = housePrism([[330,-140],[480,-140],[490,-160],[490,-190],[480,-200],[330,-200],[320,-190],[320,-160]], 0, 100, c.a, { top:false });
    houseDome(405, -170, 86, 20, 2, 12, c.a, null, 100);
    if(d > 0){
      houseDoorway(405, -140, HOUSE_SC, c.trim, c.leaf, 1);
      for(const a of [350, 460]){ faceCircle(a, -139.6, 60, 12, c.trim); faceCircle(a, -139.4, 60, 9, '#34424b'); }
    }
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    houseProp('lamp', () => { cyl(250, -60, 0, 70, 2, c.trim); ball(250, -60, 80, 8, '#f2d36a'); for(let k = 0; k < 10; k++){ const t = k/10*Math.PI*2; tube(250, -60, 80, 250 + 16*Math.cos(t), -60 + 16*Math.sin(t)*0.6, 80 + 10*Math.sin(t*2), 0.8, c.trim); ball(250 + 16*Math.cos(t), -60 + 16*Math.sin(t)*0.6, 80 + 10*Math.sin(t*2), 2.4, '#f2d36a'); } });
    houseProp('planter', () => { cyl(560, -70, 0, 30, 24, c.b, shade(c.b,1.1)); ball(560, -70, 36, 18, '#5c8a56'); });
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.pod(220, -320, 150, c.a, c);
    this.pod(600, -300, 140, c.b, c);
    this.link(c, 1);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); this.fore(p);
    this.link(c, -1);
    this.pod(600, -300, 140, c.b, c);
    this.pod(220, -320, 150, c.a, c);
    houseProp('ac unit', () => acUnit(400, 0, 480));
  }
},
/* ------------------------------------------------------------------ 75 */
{
  name:'Amboseli Rondavel Compound', hood:'The Flats', tier:'double', sc:HOUSE_SC, ww:HOUSE_DOUBLE, dd:HOUSE_DEPTH_LAB,
  head:'Rondavel compound: a big round house and two small ones under conical thatch',
  desc:'A compound of round houses: a large rondavel with the door under a tall conical thatch and two smaller rondavels either side, ochre earth walls with a painted band, a curved earth boma wall with a gap for the path, clay water pots and a flat-topped acacia.',
  tags:['double','rondavel','thatch','round','compound'],
  yardFence:{ style:'wall', h:34, col:'wall', balls:true },
  door:[405, -340 + 170*Math.cos(Math.PI/12)],
  liv:[ { wall:'#c98a5a', thatch:'#b8955a', band:'#f2e6cc', leaf:'#5a3a22' },
        { wall:'#b8764a', thatch:'#a8885a', band:'#2a2a2e', leaf:'#3a2a1e' },
        { wall:'#d9a070', thatch:'#c4a068', band:'#8a2f2f', leaf:'#5a3a22' } ],
  vol:{
    foot:houseRing(405,-340,170,12), h:300,
    solids:[ { name:'hut L', poly:houseRing(140,-390,90,10), h:220 },
             { name:'hut R', poly:houseRing(680,-390,90,10), h:220 },
             { name:'boma L', poly:[[6,-14],[370,-14],[370,-4],[6,-4]], h:40 },
             { name:'boma R', poly:[[440,-14],[804,-14],[804,-4],[440,-4]], h:40 },
             { name:'pots', poly:[[240,-120],[300,-120],[300,-86],[240,-86]], h:30, prop:true },
             { name:'acacia', c:[640,-110], r:8, h:200, prop:true },
             { name:'water tank', c:[405,-526], r:14, h:70, prop:true } ],
    marks:{ door:[405, -340 + 170*Math.cos(Math.PI/12)], mat:[405, -340 + 170*Math.cos(Math.PI/12) + 35.4] }
  },
  yard(c){
    T(0, 809.6, -552, 0, 0.3, '#d9b88a');
    for(const [a, b] of [[400,-150],[410,-120],[400,-90],[410,-60],[402,-30]]) plateCircle(a, b, 0.6, 10, '#b89a70');
  },
  hut(ac, bc, r, n, h, top, c, door){
    const seen = housePrism(houseRing(ac, bc, r, n), 0, h, c.wall, { top:false });
    for(const f of seen) houseFaceWin(f, 0, 1, h*0.5, h*0.5 + 8, c.band, { band:true });
    if(door && !state.back) houseDoorway(ac, bc + r*Math.cos(Math.PI/n), HOUSE_SC, shade(c.wall,.8), c.leaf, 1);
    houseCone(ac, bc, r + 20, n, h - 4, top, c.thatch);
    ball(ac, bc, top + 2, 5, shade(c.thatch,.8));
  },
  boma(c){ for(const [a0, a1] of [[6, 370], [440, 804]]){ box(a0, a1, -14, -4, 0, 34, shade(c.wall,1.02), c.wall, shade(c.wall,.8)); for(let a = a0 + 6; a < a1; a += 12) ball(a, -9, 34, 5, c.wall); } },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    this.boma(c);
    houseProp('pots', () => { for(const [a, b, r] of [[252,-104,13],[276,-100,15],[294,-110,9]]) { ball(a, b, r, r, '#a8603a'); cyl(a, b, r*1.6, r*1.9, r*0.45, '#8a4a2a'); } });
    houseProp('acacia', () => { tube(640, -110, 0, 630, -106, 120, 4, '#5a4030'); tube(640, -110, 80, 664, -116, 140, 3, '#5a4030');
      for(const [x, b] of [[610,-104],[646,-110],[682,-118],[628,-122],[664,-100]]) ball(x, b, 150, 22, '#6b8a3e'); });
    if(!state.back) houseYardFence(this, this.liv[state.pal % this.liv.length], 'near');
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far');
    this.hut(140, -390, 90, 10, 100, 220, c, false);
    this.hut(405, -340, 170, 12, 120, 300, c, true);
    this.hut(680, -390, 90, 10, 100, 220, c, false);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); houseYardFence(this, c, 'far'); this.fore(p);
    this.hut(680, -390, 90, 10, 100, 220, c, false);
    this.hut(405, -340, 170, 12, 120, 300, c, false);
    this.hut(140, -390, 90, 10, 100, 220, c, false);
    houseProp('water tank', () => { cyl(405, -526, 0, 70, 14, '#3a3a3e', '#4a4a50'); for(const z of [20, 45]) cyl(405, -526, z, z+2, 14.4, '#2a2a2e'); });
    houseYardFence(this, c, 'near');
  }
},
/* ------------------------------------------------------------------ 76 */
{
  name:'Park Slope Brownstone', hood:'The Flats', tier:'single', sc:HOUSE_SC, ww:HOUSE_SINGLE, dd:HOUSE_DEPTH_LAB,
  head:'Brownstone: four storeys, bracketed cornice, high stoop, garden-level door',
  desc:'A New York brownstone: four storeys of brown sandstone with stone lintels, a deep bracketed cornice, a high stoop with iron railings up to the parlour door, and the everyday door tucked beside it at garden level behind an iron areaway fence; a street tree and trash cans.',
  tags:['single','brownstone','stoop','cornice','townhouse'],
  door:[180, -150],
  liv:[ { stone:'#6b4a3a', trim:'#c9b89a', cornice:'#3a2e28', leaf:'#1f2a24', iron:'#1f1f22' },
        { stone:'#8a6a52', trim:'#d8c8aa', cornice:'#4a3a2e', leaf:'#5a1f24', iron:'#222226' },
        { stone:'#5a4034', trim:'#c4b090', cornice:'#2e2622', leaf:'#2e3a5a', iron:'#1f1f22' } ],
  vol:{
    foot:[[110,-150],[350,-150],[350,-520],[110,-520]], h:380,
    solids:[ { name:'stoop', poly:[[250,-150],[330,-150],[330,-60],[250,-60]], h:84 },
             { name:'fence L', poly:[[20,-10],[145,-10],[145,-4],[20,-4]], h:36 },
             { name:'fence R', poly:[[215,-10],[440,-10],[440,-4],[215,-4]], h:36 },
             { name:'tree', c:[60,-30], r:8, h:230, prop:true },
             { name:'cans', poly:[[370,-80],[430,-80],[430,-50],[370,-50]], h:40, prop:true },
             { name:'ac unit', poly:[[184,-548],[236,-548],[236,-520],[184,-520]], h:36, prop:true } ],
    marks:{ door:[180,-150], mat:[180,-150+35.4] }
  },
  yard(c){
    T(0, 460, -552, 0, 0.3, '#b8b2a6');
    for(let a = 0; a < 460; a += 30) poly([P(a,-150,0.4), P(a,0,0.4)], null, '#a39d92', 1);
  },
  body(c, d){
    houseMass(110, 350, -150, -520, 340, c.stone, d);
    const face = d > 0 ? -150 : -520;
    houseSideWins(110, 350, -150, -520, [[110,170],[196,256],[272,326]], c.trim, { w:30, pitch:80 });
    box(104, 356, Math.min(face, face + 22*d), Math.max(face, face + 22*d), 340, 360, shade(c.cornice,1.1), c.cornice, shade(c.cornice,.8));
    for(let a = 116; a < 350; a += 24) F(a, a+6, 322, 340, c.cornice, null, 0, face + 0.4*d);
    T(110, 350, -520, -150, 360, shade(c.stone,.7));
    if(d > 0){
      houseDoorway(180, -150, HOUSE_SC, c.trim, c.leaf, 1);
      F(270, 318, 84, 176, '#2a1e18', c.trim, 1.5, -149.6);
      F(274, 314, 88, 172, c.leaf, null, 0, -149.4);
      F(262, 326, 178, 190, c.trim, null, 0, -149.4);
      for(const z0 of [196, 272]) for(const [a0, a1] of [[140,190],[210,250],[274,318]]){ houseWin(a0, a1, z0, z0 + 54, -150, c.trim, c.trim, 1); F(a0-6, a1+6, z0 + 58, z0 + 64, c.trim, null, 0, -149.4); }
      for(const [a0, a1] of [[140,200]]) houseWin(a0 + 60, a1 + 30, 110, 170, -150, c.trim, c.trim, 1);
    } else {
      for(const z0 of [110, 196, 272]) for(const [a0, a1] of [[150,200],[260,310]]) houseWin(a0, a1, z0, z0 + 54, -520, c.trim, c.trim, -1);
      rearDoor(230, c.stone, c.leaf, 520, 92);
    }
  },
  stoop(c){
    for(let k = 0; k < 7; k++){ const b0 = -60 - k*13; box(250, 330, b0 - 13, b0, 0, 12*(k+1), shade(c.stone,1.06), c.stone, shade(c.stone,.82)); }
    for(const a of [252, 328]) { poly([P(a,-58,30), P(a,-150,114)], null, c.iron, 2.4); for(let t = 0; t <= 1; t += 0.125) poly([P(a,-58-92*t,84*t), P(a,-58-92*t,84*t+30)], null, c.iron, 1.2); }
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    this.stoop(c);
    for(const [a0, a1] of [[20, 145], [215, 440]]){
      F(a0, a1, 30, 33, c.iron, null, 0, -7); F(a0, a1, 6, 8, c.iron, null, 0, -7);
      for(let a = a0 + 3; a < a1; a += 7) poly([P(a,-7,0), P(a+1.6,-7,0), P(a+1.6,-7,32), P(a+0.8,-7,36), P(a,-7,32)], c.iron);
    }
    houseProp('tree', () => { cyl(60, -30, 0, 120, 6, '#5a4030'); ball(60, -30, 170, 50, '#4a7a48'); ball(40, -20, 150, 32, '#568a52'); ball(80, -40, 190, 28, '#3f6b3e'); });
    houseProp('cans', () => { for(const a of [384, 414]) { cyl(a, -65, 0, 36, 13, '#5a5e62', '#6f747a'); cyl(a, -65, 36, 40, 14, '#4a4e52'); } });
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.body(c, 1);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); this.fore(p);
    this.body(c, -1);
    houseProp('ac unit', () => acUnit(210, 0, 520));
  }
},
/* ------------------------------------------------------------------ 77 */
{
  name:'Kochi Nalukettu', hood:'The Flats', tier:'double', sc:HOUSE_SC, ww:HOUSE_DOUBLE, dd:HOUSE_DEPTH_LAB,
  head:'Kerala house: tiered terracotta roofs, pillared verandah, laterite plinth',
  desc:'A traditional Kerala house: white walls on a red laterite plinth, a broad low terracotta hip with a second steeper tier above it, a long pillared verandah under its own lean-to roof, a carved door, barred wooden windows, coconut palms and a brass lamp.',
  tags:['double','kerala','tiered roof','verandah','tile'],
  door:[405, -190],
  liv:[ { wall:'#f7f4ec', roof:'#b0583a', lat:'#9c4a34', wood:'#5a3a22', leaf:'#5a3a22' },
        { wall:'#f2ead8', roof:'#a04e34', lat:'#8a4230', wood:'#4a2e1a', leaf:'#4a2e1a' },
        { wall:'#faf6ee', roof:'#c0613f', lat:'#a8543a', wood:'#6b4428', leaf:'#6b4428' } ],
  vol:{
    foot:[[80,-190],[730,-190],[730,-450],[80,-450]], h:310,
    solids:[ ...[140, 240, 340, 470, 570, 670].map((a, i) => ({ name:'pillar ' + (i+1), c:[a,-134], r:7, h:106 })),
             { name:'palm L', c:[40,-70], r:7, h:190, prop:true },
             { name:'palm R', c:[750,-70], r:7, h:190, prop:true },
             { name:'lamp', c:[300,-60], r:8, h:40, prop:true },
             { name:'ac unit', poly:[[114,-478],[166,-478],[166,-450],[114,-450]], h:36, prop:true },
             { name:'bin', poly:[[682,-500],[718,-500],[718,-464],[682,-464]], h:52, prop:true } ],
    marks:{ door:[405,-190], mat:[405,-190+35.4] }
  },
  yard(c){
    T(0, 809.6, -552, 0, 0.3, '#c9a07a');
    houseLawn(0, 809.6, -120, -20, '#6f9a4e');
    T(370, 440, -130, 0, 0.7, c.lat);
    T(110, 700, -190, -126, 6, shade(c.lat,1.05));
    F(110, 700, 0, 6, c.lat, null, 0, -126);
  },
  walls(c, d){
    houseMass(80, 730, -190, -450, 118, c.wall, d);
    const face = d > 0 ? -190 : -450;
    F(80, 730, 0, 16, c.lat, null, 0, face + 0.3*d);
    houseSideWins(80, 730, -190, -450, [[34,96]], c.wood, { plain:true });
    if(d > 0){
      houseDoorway(405, -190, HOUSE_SC, c.wood, c.leaf, 1);
      for(const [a0, a1] of [[150,210],[260,320],[490,550],[600,660]]){ houseWin(a0, a1, 34, 96, -190, c.wood, c.wood, 1, { plain:true }); for(let a = a0 + 6; a < a1; a += 8) F(a, a+2.4, 34, 96, c.wood, null, 0, -189); }
    } else {
      for(const [a0, a1] of [[180,240],[570,630]]) houseWin(a0, a1, 34, 96, -450, c.wood, c.wood, -1, { plain:true });
      rearDoor(405, c.wall, c.leaf, 450, 92);
    }
  },
  roofs(c){
    houseProfileRoof(110, 700, [[-126,100],[-190,122]], 10, c.roof, c.wall, { ext1:false, gable:shade(c.wood,.9) });
    houseHip(80, 730, -190, -450, 118, 200, 30, c.roof);
    houseHip(240, 570, -260, -380, 200, 300, 16, c.roof);
    if(state.roof) for(const a of [258, 552]) poly([P(a,-320,290), P(a + (a < 405 ? 10 : -10),-320,310), P(a,-320,300)], c.wood);
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    for(const aa of [140, 240, 340, 470, 570, 670]){ cyl(aa, -134, 6, 100, 6, c.wood, shade(c.wood,1.1)); for(const z of [20, 80]) cyl(aa, -134, z, z+4, 7.5, shade(c.wood,1.2)); }
    this.roofs(c);
    houseProp('palm L', () => housePalm(40, -70, 180, '#5f8f4f'));
    houseProp('palm R', () => housePalm(750, -70, 180, '#5f8f4f'));
    houseProp('lamp', () => { cyl(300, -60, 0, 8, 8, '#c9a24a', '#d9b45a'); cyl(300, -60, 8, 30, 2, '#c9a24a'); cyl(300, -60, 30, 34, 8, '#c9a24a', '#d9b45a'); ball(300, -60, 38, 3, '#f29a3a'); });
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.walls(c, 1);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    for(const aa of [140, 240, 340, 470, 570, 670]) cyl(aa, -134, 6, 100, 6, c.wood, shade(c.wood,1.1));
    houseProp('palm L', () => housePalm(40, -70, 180, '#5f8f4f'));
    houseProp('palm R', () => housePalm(750, -70, 180, '#5f8f4f'));
    houseProp('lamp', () => cyl(300, -60, 0, 34, 8, '#c9a24a'));
    this.walls(c, -1);
    this.roofs(c);
    houseProp('ac unit', () => acUnit(140, 0, 450));
    houseProp('bin', () => wheelieBin(700, '#3f6b4a', 0, 450));
  }
},
/* ------------------------------------------------------------------ 78 */
{
  name:'Hutong Siheyuan', hood:'The Flats', tier:'double', sc:HOUSE_SC, ww:HOUSE_DOUBLE, dd:HOUSE_DEPTH_LAB,
  head:'Beijing courtyard house: grey brick street range, red gatehouse door, main hall behind',
  desc:'A Beijing siheyuan: a long grey-brick street range with small high windows under a grey tile roof, a taller gatehouse with a red lacquer door, stone lions and red lanterns, and the bigger main hall rising behind across the courtyard, where a pomegranate tree grows.',
  tags:['double','chinese','courtyard','tile roof','gate'],
  door:[405, -140],
  liv:[ { brick:'#8a8e92', roof:'#5a5e62', red:'#b8352a', trim:'#c9a24a', wood:'#8a3a2e' },
        { brick:'#9a9894', roof:'#4e5256', red:'#9c2c22', trim:'#d4b060', wood:'#6b2e24' },
        { brick:'#7e8286', roof:'#62666a', red:'#c0402e', trim:'#c9a24a', wood:'#7a3428' } ],
  vol:{
    foot:[[60,-150],[360,-150],[360,-140],[450,-140],[450,-150],[750,-150],[750,-300],[60,-300]], h:260,
    solids:[ { name:'hall', poly:[[160,-380],[650,-380],[650,-520],[160,-520]], h:260 },
             { name:'lion L', poly:[[340,-126],[364,-126],[364,-104],[340,-104]], h:44, prop:true },
             { name:'lion R', poly:[[446,-126],[470,-126],[470,-104],[446,-104]], h:44, prop:true },
             { name:'pomegranate', c:[560,-340], r:8, h:150, prop:true },
             { name:'ac unit', poly:[[114,-548],[166,-548],[166,-520],[114,-520]], h:36, prop:true } ],
    marks:{ door:[405,-140], mat:[405,-140+35.4] }
  },
  yard(c){
    T(0, 809.6, -552, 0, 0.3, '#b8b4ac');
    T(60, 750, -380, -300, 0.5, '#a8a49c');
    for(let a = 60; a < 750; a += 30) poly([P(a,-380,0.6), P(a,-300,0.6)], null, '#96928a', 1);
  },
  tileRoof(a0, a1, bf, bb, He, Hr, o, c, opts){
    houseProfileRoof(a0, a1, [[bf,He],[(bf+bb)/2,Hr],[bb,He]], o, c.roof, c.brick, opts);
    const mid = (bf+bb)/2;
    box(a0 - 4, a1 + 4, mid - 7, mid + 7, Hr - 2, Hr + 10, shade(c.roof,1.1), shade(c.roof,.9), shade(c.roof,.75));
    for(const a of [a0 - 4, a1 + 4]) poly([P(a, mid, Hr + 10), P(a + (a < (a0+a1)/2 ? -8 : 8), mid, Hr + 26), P(a, mid, Hr + 18)], shade(c.roof,.8));
  },
  range(c, d){
    houseMass(60, 750, -150, -300, 120, c.brick, d);
    const face = d > 0 ? -150 : -300;
    for(let z = 6; z < 118; z += 6) poly([P(60,face+0.3*d,z), P(750,face+0.3*d,z)], null, shade(c.brick,.86), 1);
    houseSideWins(60, 750, -150, -300, [[70,100]], c.wood, { plain:true, w:36, pitch:70 });
    for(const [a0, a1] of [[110,160],[220,270],[540,590],[650,700]]){ F(a0-4, a1+4, 76, 104, c.wood, null, 0, face + 0.3*d); for(let a = a0; a < a1; a += 6) F(a, a+2, 80, 100, shade(c.wood,.7), null, 0, face + 0.5*d); }
    this.tileRoof(60, 750, -150, -300, 120, 176, 12, c);
  },
  gatehouse(c){
    houseMass(360, 450, -140, -300, 140, c.brick, 1);
    F(372, 438, 0, 110, c.red, shade(c.red,.7), 1.2, -139.6);
    houseDoorway(405, -140, HOUSE_SC, c.trim, c.red, 1);
    for(let z = 14; z < 94; z += 14) for(const a of [384, 426]) ball(a, -138.6, z, 2.2, c.trim);
    F(366, 444, 112, 118, c.trim, null, 0, -139.4);
    this.tileRoof(360, 450, -140, -300, 140, 200, 14, c);
  },
  hall(c, d){
    houseMass(160, 650, -380, -520, 140, c.brick, d);
    const face = d > 0 ? -380 : -520;
    for(let a = 170; a < 650; a += 40) F(a, a+30, 10, 128, c.wood, shade(c.wood,.7), 1, face + 0.3*d);
    for(let a = 176; a < 650; a += 40) for(let z = 20; z < 124; z += 12) F(a, a+18, z, z+1.6, shade(c.wood,.75), null, 0, face + 0.5*d);
    this.tileRoof(160, 650, -380, -520, 140, 210, 16, c);
    if(d < 0) rearDoor(405, c.brick, c.red, 520, 92);
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    for(const [nm, a] of [['lion L', 352], ['lion R', 458]])
      houseProp(nm, () => { box(a-12, a+12, -126, -104, 0, 14, '#c9c3b8', '#b8b2a6', '#a39d92'); ball(a, -115, 26, 10, '#a8a296'); ball(a, -109, 38, 7, '#b3ada2'); });
    for(const a of [372, 438]){ F(a-0.6, a+0.6, 100, 118, '#2a2a2e', null, 0, -128); ball(a, -128, 92, 9, c.red); cyl(a, -128, 82, 84, 5, c.trim); cyl(a, -128, 100, 102, 5, c.trim); }
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.hall(c, 1);
    houseProp('pomegranate', () => { cyl(560, -340, 0, 80, 5, '#5a4030'); ball(560, -340, 110, 34, '#4a7a3e'); for(const [x, z] of [[548,100],[572,118],[556,130]]) ball(x, -320, z, 4, '#d9352a'); });
    this.range(c, 1);
    this.gatehouse(c);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); this.fore(p);
    this.gatehouse(c);
    this.range(c, -1);
    houseProp('pomegranate', () => { cyl(560, -340, 0, 80, 5, '#5a4030'); ball(560, -340, 110, 34, '#4a7a3e'); });
    this.hall(c, -1);
    houseProp('ac unit', () => acUnit(140, 0, 520));
  }
},
/* ------------------------------------------------------------------ 79 */
{
  name:'Taos Earthship', hood:'The Flats', tier:'single', sc:HOUSE_SC, ww:HOUSE_SINGLE, dd:HOUSE_DEPTH_LAB,
  head:'Earthship: sloped greenhouse front, earth-bermed back, bottle walls, cistern',
  desc:'An off-grid earthship: a long raked greenhouse glazing the whole front, thick earth walls bermed into a grassy mound behind, a small entry vestibule studded with coloured glass bottle ends, a tyre planter, a yucca and a rainwater cistern.',
  tags:['single','earthship','eco','bottle wall','berm'],
  door:[230, -80],
  liv:[ { earth:'#c9a06a', glass:'#3a4e58', berm:'#8a9a5a', leaf:'#5a7a8a', frame:'#6b4a2e' },
        { earth:'#b8905a', glass:'#34484e', berm:'#7a8a4e', leaf:'#8a4a2e', frame:'#5a3a22' },
        { earth:'#d4ac78', glass:'#3e525c', berm:'#94a466', leaf:'#3f6b4a', frame:'#6b4a2e' } ],
  vol:{
    foot:[[190,-110],[270,-110],[270,-80],[190,-80]], h:160,
    solids:[ { name:'body', poly:[[50,-470],[410,-470],[410,-110],[50,-110]], h:160 },
             { name:'tyres', c:[100,-60], r:18, h:30, prop:true },
             { name:'yucca', c:[360,-60], r:12, h:50, prop:true },
             { name:'cistern', c:[400,-510], r:22, h:70, prop:true } ],
    marks:{ door:[230,-80], mat:[230,-80+35.4] }
  },
  yard(c){
    T(0, 460, -552, 0, 0.3, '#d9c4a0');
    for(let b = -70; b < -16; b += 18) T(208, 252, b, b+12, 0.7, '#b8a07a');
  },
  body(c, d){
    houseMass(50, 410, -170, -470, 150, c.earth, d);
    houseProfileRoof(50, 410, [[-170,150],[-470,60]], 10, c.berm, c.earth, { ext0:false, noStrips:true, gable:shade(c.earth,.85) });
    for(let k = 0; k < 40; k++){ const u = ((k*37) % 100)/100, v = ((k*53) % 97)/97; const a = 60 + 340*u, b = -172 - 290*v, z = 150 - 90*v*(290/300) + 1; poly([P(a,b,z), P(a-2,b,z+8), P(a+3,b,z+6)], shade(c.berm,.8)); }
    houseSideWins(50, 410, -170, -470, [[30,70]], c.frame, { plain:true, skipBack:200, w:30 });
    if(d > 0){
      houseProfileRoof(50, 410, [[-110,18],[-170,150]], 0, c.glass, c.earth, { ext0:false, ext1:false, noStrips:true, gable:shade(c.earth,.9) });
      F(50, 410, 0, 18, c.earth, null, 0, -110);
      for(let a = 50; a <= 410; a += 40) poly([P(a,-110,18), P(a,-170,150)], null, c.frame, 2);
      for(const a of [120, 300]) for(let t = 0.2; t < 1; t += 0.3) poly([P(a,-110-60*t,18+132*t), P(a+40,-110-60*t,18+132*t)], null, 'rgba(170,205,220,.3)', 1);
    } else {
      rearDoor(120, c.earth, c.leaf, 470, 92);
    }
  },
  vest(c){
    box(190, 270, -110, -80, 0, 112, shade(c.earth,1.06), c.earth, shade(c.earth,.82));
    houseDoorway(230, -80, HOUSE_SC, c.frame, c.leaf, 1);
    const cols = ['#3a8ad6','#3fa05a','#d9a23a','#8a3ad6','#d9573c'];
    for(let k = 0; k < 18; k++){ const a = 196 + (k*7) % 18, z = 12 + k*5.4; faceCircle(a, -79.6, z, 2.6, cols[k % 5]); faceCircle(264 - (k*5) % 16, -79.6, z, 2.6, cols[(k+2) % 5]); }
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    this.vest(c);
    houseProp('tyres', () => { for(const z of [0, 10, 20]) cyl(100, -60, z, z+10, 18, '#2a2a2e', '#3a3a3e'); ball(100, -60, 36, 14, '#6fa05a'); });
    houseProp('yucca', () => { for(let k = 0; k < 9; k++){ const t = k/9*Math.PI*2; poly([P(360,-60,4), P(360 + Math.cos(t)*14, -60 + Math.sin(t)*14, 44), P(360 + Math.cos(t)*16, -60 + Math.sin(t)*16, 40)], k % 2 ? '#6b8a5a' : '#5a7a4a'); } });
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.body(c, 1);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); this.fore(p);
    this.body(c, -1);
    houseProp('cistern', () => { cyl(400, -510, 0, 70, 22, '#8a9096', '#9ea3a8'); for(const z of [20, 45]) cyl(400, -510, z, z+2, 22.4, '#6f747a'); });
  }
},
/* ------------------------------------------------------------------ 80 */
{
  name:'Wanderer Tiny House', hood:'The Flats', tier:'single', sc:HOUSE_SC, ww:HOUSE_SINGLE, dd:HOUSE_DEPTH_LAB,
  head:'Tiny house: cedar-clad, metal roof with loft dormer, deck with string lights, fire pit',
  desc:'A tiny house parked in a big yard: cedar-clad with a standing-seam roof and a shed dormer for the sleeping loft, big windows, trailer wheels peeking under the skirt, a deck strung with festoon lights, a fire pit with two chairs and a garden shed.',
  tags:['single','tiny house','deck','string lights'],
  door:[300, -220],
  liv:[ { clad:'#b07a4a', roof:'#3a3f44', trim:'#2a2a2e', leaf:'#2f6f8a', deck:'#a8835c' },
        { clad:'#8a9a8a', roof:'#44403c', trim:'#2a2a2e', leaf:'#c9622a', deck:'#9a7a58' },
        { clad:'#c9a878', roof:'#2e3a40', trim:'#2a2a2e', leaf:'#8a2f2f', deck:'#b08a64' } ],
  vol:{
    foot:[[90,-220],[370,-220],[370,-320],[90,-320]], h:220,
    solids:[ ...[96, 230, 364].map((a, i) => ({ name:'deck post ' + (i+1), c:[a,-154], r:3, h:110 })),
             { name:'fire pit', c:[140,-80], r:18, h:14, prop:true },
             { name:'chair L', poly:[[80,-60],[106,-60],[106,-34],[80,-34]], h:40, prop:true },
             { name:'chair R', poly:[[176,-60],[202,-60],[202,-34],[176,-34]], h:40, prop:true },
             { name:'shed', poly:[[380,-440],[450,-440],[450,-380],[380,-380]], h:90, prop:true } ],
    marks:{ door:[300,-220], mat:[300,-220+35.4] }
  },
  yard(c){
    houseLawn(0, 460, -552, 0, '#7fa35a');
    T(90, 370, -220, -150, 4, c.deck);
    for(let a = 98; a < 370; a += 10) poly([P(a,-220,4.1), P(a,-150,4.1)], null, shade(c.deck,.84), 1);
    for(let b = -140; b < -16; b += 22) T(276, 324, b, b+14, 0.7, '#a8a296');
    plateCircle(140, -80, 0.5, 34, '#c9bfa8');
  },
  body(c, d){
    houseMass(90, 370, -220, -320, 150, c.clad, d, 0);
    const face = d > 0 ? -220 : -320;
    F(90, 370, 0, 20, shade(c.clad,.7), null, 0, face + 0.2*d);
    for(let z = 24; z < 150; z += 7) poly([P(90,face+0.3*d,z), P(370,face+0.3*d,z)], null, shade(c.clad,.84), 1);
    houseSideWins(90, 370, -220, -320, [[50,110]], c.trim, { plain:true, w:36, pitch:100, skipFront:20, skipBack:20 });
    for(const a of [170, 206]){ faceCircle(a, face + 0.4*d, 12, 14, '#2a2a2e'); faceCircle(a, face + 0.6*d, 12, 6, '#8a8a86'); }
    if(d > 0){
      houseDoorway(300, -220, HOUSE_SC, c.trim, c.leaf, 1);
      houseWin(110, 230, 50, 124, -220, c.trim, c.trim, 1, { plain:true });
    } else houseWin(140, 260, 50, 124, -320, c.trim, c.trim, -1, { plain:true });
    houseProfileRoof(90, 370, [[-220,150],[-270,196],[-320,150]], 8, c.roof, c.clad, { seams:10 });
    if(d > 0){
      const k = 46/50, zs = b => 150 + (-220 - b)*k, bD = -232, z0 = zs(bD);
      F(140, 320, z0, 200, c.clad, shade(c.clad,.6), 1, bD);
      houseWin(160, 300, z0 + 6, 194, bD, c.trim, c.trim, 1, { plain:true });
      const aS = FLANK_RIGHT ? 320 : 140, bI = -220 - 50/k;
      poly([P(aS,bD,z0), P(aS,bD,200), P(aS,bI,200)], shade(c.clad,.76), shade(c.clad,.6), 1);
      poly([P(134,bD+6,204), P(326,bD+6,204), P(326,-272,200), P(134,-272,200)], c.roof, shade(c.roof,.6), 1);
    }
  },
  lights(){
    for(const aa of [96, 230, 364]) cyl(aa, -154, 4, 110, 2, '#3a3a3e');
    for(const [a0, a1] of [[96,230],[230,364]]) for(let t = 0; t <= 1.0001; t += 0.1){ const a = a0 + (a1-a0)*t, z = 106 - 16*4*t*(1-t); ball(a, -154, z, 2.4, '#fbe07a'); if(t < 1) poly([P(a,-154,z), P(a0 + (a1-a0)*(t+0.1), -154, 106 - 16*4*(t+0.1)*(0.9-t))], null, '#3a3a3e', 0.8); }
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    this.lights();
    houseProp('fire pit', () => { cyl(140, -80, 0, 12, 18, '#8a857b', '#3a2a20'); ball(140, -80, 14, 5, '#f29a3a'); });
    for(const [nm, a0] of [['chair L', 80], ['chair R', 176]])
      houseProp(nm, () => { box(a0, a0 + 26, -60, -34, 12, 16, c.leaf, shade(c.leaf,.9), shade(c.leaf,.76)); poly([P(a0,-60,16), P(a0+26,-60,16), P(a0+26,-66,42), P(a0,-66,42)], c.leaf, shade(c.leaf,.7), 1); });
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.body(c, 1);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); this.fore(p);
    this.body(c, -1);
    houseProp('shed', () => { box(380, 450, -440, -380, 0, 70, shade(c.clad,1.05), c.clad, shade(c.clad,.8)); houseProfileRoof(380, 450, [[-380,70],[-410,88],[-440,70]], 4, c.roof, c.clad); });
  }
},
/* ------------------------------------------------------------------ 81 */
{
  name:'Kauai Plantation Cottage', hood:'The Flats', tier:'single', sc:HOUSE_SC, ww:HOUSE_SINGLE, dd:HOUSE_DEPTH_LAB,
  head:'Hawaiian plantation cottage: double-pitched hip over a lanai, board-and-batten',
  desc:'A Hawaiian plantation cottage: green board-and-batten under a double-pitched hip, a steep upper roof on a shallow lower skirt that shades a lanai on slim posts, louvered windows, plumeria and ti plants, a surfboard against the post.',
  tags:['single','hawaiian','plantation','lanai','hip'],
  door:[230, -110],
  liv:[ { wall:'#7a9a6a', trim:'#f7f4ec', roof:'#8a3a30', leaf:'#f7f4ec', shut:'#f7f4ec' },
        { wall:'#e2c89a', trim:'#fbf8f0', roof:'#4a5a52', leaf:'#8a3a30', shut:'#4a5a52' },
        { wall:'#a8c8d0', trim:'#fbfaf5', roof:'#6b4a3e', leaf:'#e0602a', shut:'#f7f4ec' } ],
  vol:{
    foot:[[40,-110],[420,-110],[420,-480],[40,-480]], h:260,
    solids:[ ...[40, 150, 310, 420].map((a, i) => ({ name:'post ' + (i+1), c:[a,-88], r:3, h:110 })),
             { name:'plumeria', c:[60,-40], r:7, h:140, prop:true },
             { name:'surfboard', poly:[[316,-80],[334,-80],[334,-70],[316,-70]], h:90, prop:true },
             { name:'ac unit', poly:[[294,-508],[346,-508],[346,-480],[294,-480]], h:36, prop:true } ],
    marks:{ door:[230,-110], mat:[230,-110+35.4] }
  },
  yard(c){
    houseLawn(0, 460, -552, 0, '#6f9a4e');
    T(20, 440, -110, -80, 2, '#a8835c');
    for(let b = -70; b < -16; b += 20) T(206, 254, b, b+13, 0.7, '#b86a4a');
    for(const a of [120, 360]) for(let k = 0; k < 6; k++){ const t = k/6*Math.PI*2; poly([P(a,-30,2), P(a + Math.cos(t)*10, -30 + Math.sin(t)*6, 30), P(a + Math.cos(t)*12, -30 + Math.sin(t)*7, 26)], k % 2 ? '#8a2f4a' : '#4f7a3e'); }
  },
  body(c, d){
    houseMass(40, 420, -110, -480, 110, c.wall, d);
    const face = d > 0 ? -110 : -480;
    for(let a = 48; a < 420; a += 12) F(a, a+2, 0, 110, shade(c.wall,.84), null, 0, face + 0.2*d);
    houseSideWins(40, 420, -110, -480, [[34,90]], c.trim);
    if(d > 0){
      houseDoorway(230, -110, HOUSE_SC, c.trim, c.leaf, 1);
      for(const [a0, a1] of [[80,140],[320,380]]){ houseWin(a0, a1, 34, 90, -110, c.trim, c.trim, 1, { plain:true }); for(let z = 38; z < 88; z += 6) F(a0, a1, z, z+2, shade(c.shut,.8), null, 0, -109); }
    } else {
      houseWin(100, 160, 34, 90, -480, c.trim, c.trim, -1, { plain:true });
      rearDoor(300, c.wall, c.leaf, 480, 92);
    }
  },
  roof(c){
    houseMansard(20, 440, -80, -500, 110, 136, 60, c.roof, c.roof);
    houseHip(80, 380, -140, -440, 136, 256, 0, c.roof);
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    for(const aa of [40, 150, 310, 420]) box(aa-2.5, aa+2.5, -90.5, -85.5, 2, 110, c.trim, shade(c.trim,.9), shade(c.trim,.76));
    this.roof(c);
    houseProp('plumeria', () => { tube(60, -40, 0, 52, -36, 80, 3.4, '#8a7a68'); tube(60, -40, 50, 74, -44, 100, 2.6, '#8a7a68');
      for(const [x, z, r] of [[50,90,20],[76,108,16]]){ ball(x, -38, z, r, '#5f8f4a'); for(let k = 0; k < 4; k++) ball(x + (k-1.5)*6, -36, z + r*0.6, 2.8, '#fbe0e8'); } });
    houseProp('surfboard', () => { poly([P(318,-76,0), P(332,-76,4), P(332,-76,80), P(325,-76,90), P(318,-76,80)], '#f2c94a', shade('#f2c94a',.7), 1); });
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.body(c, 1);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    for(const aa of [40, 150, 310, 420]) box(aa-2.5, aa+2.5, -90.5, -85.5, 2, 110, c.trim, shade(c.trim,.9), shade(c.trim,.76));
    houseProp('plumeria', () => ball(50, -38, 90, 20, '#5f8f4a'));
    houseProp('surfboard', () => F(318, 332, 0, 90, '#f2c94a', null, 0, -76));
    this.body(c, -1);
    this.roof(c);
    houseProp('ac unit', () => acUnit(320, 0, 480));
  }
},
/* ------------------------------------------------------------------ 82 */
{
  name:'Ravenscroft Castle Folly', hood:'The Flats', tier:'double', sc:HOUSE_SC, ww:HOUSE_DOUBLE, dd:HOUSE_DEPTH_LAB,
  head:'Castle folly: crenellated gatehouse, twin round towers, keep behind, a flag',
  desc:'A Victorian castle folly: a crenellated stone gatehouse carrying the arched front door between two round towers with battlements and arrow slits, a crenellated keep range behind, a banner flying from one tower, a pair of iron torches and an old cannon on the lawn.',
  tags:['double','castle','towers','crenellated','folly'],
  door:[405, -130],
  liv:[ { stone:'#a8a296', trim:'#8a857b', leaf:'#5a3a28', flag:'#b8352a' },
        { stone:'#b8ae96', trim:'#968c78', leaf:'#3a2a22', flag:'#2e4d9a' },
        { stone:'#9a9690', trim:'#7e7a74', leaf:'#4a3020', flag:'#2f7a4a' } ],
  vol:{
    foot:[[330,-130],[480,-130],[480,-300],[330,-300]], h:360,
    solids:[ { name:'tower L', poly:houseRing(250,-170,62,12), h:340 },
             { name:'tower R', poly:houseRing(560,-170,62,12), h:340 },
             { name:'keep', poly:[[120,-230],[690,-230],[690,-500],[120,-500]], h:260 },
             { name:'cannon', poly:[[90,-80],[190,-80],[190,-40],[90,-40]], h:30, prop:true },
             { name:'torch L', c:[330,-40], r:4, h:90, prop:true },
             { name:'torch R', c:[480,-40], r:4, h:90, prop:true },
             { name:'ac unit', poly:[[134,-528],[186,-528],[186,-500],[134,-500]], h:36, prop:true } ],
    marks:{ door:[405,-130], mat:[405,-130+35.4] }
  },
  yard(c){
    houseLawn(0, 809.6, -552, 0, '#6f9450');
    T(370, 440, -130, 0, 0.6, '#9c968a');
  },
  merlonsRect(a0, a1, b0, b1, z, c){
    for(let a = a0; a < a1 - 6; a += 24){ box(a, a + 14, b1 - 8, b1, z, z + 18, shade(c.stone,1.06), c.stone, shade(c.stone,.8)); }
    const aS = FLANK_RIGHT ? a1 - 8 : a0;
    for(let b = b1 - 24; b > b0; b -= 24) box(aS, aS + 8, b - 14, b, z, z + 18, shade(c.stone,1.06), c.stone, shade(c.stone,.8));
  },
  stoneLines(a0, a1, z0, z1, b, c, d){ for(let z = z0 + 12; z < z1; z += 12) poly([P(a0,b+0.3*d,z), P(a1,b+0.3*d,z)], null, shade(c.stone,.8), 1); },
  tower(ac, c){
    const seen = housePrism(houseRing(ac,-170,62,12), 0, 340, c.stone, { top:false });
    for(const f of seen){ houseFaceWin(f, 0.44, 0.56, 120, 170, '#2a2420', { band:true }); houseFaceWin(f, 0.44, 0.56, 230, 280, '#2a2420', { band:true }); for(const z of [60, 180, 300]) houseFaceWin(f, 0, 1, z, z + 1.4, shade(c.stone,.8), { band:true }); }
    houseFace(houseRing(ac,-170,62,12).map(([a, b]) => [a, b, 340]), [ac, -170, 300], shade(c.stone,.86));
    for(let k = 0; k < 12; k += 2){ const t = (k + 0.5)/12*Math.PI*2, t2 = (k + 1.5)/12*Math.PI*2;
      const pa = [ac + 62*Math.cos(t), -170 + 62*Math.sin(t)], pb = [ac + 62*Math.cos(t2), -170 + 62*Math.sin(t2)];
      houseFace([[pa[0],pa[1],340],[pb[0],pb[1],340],[pb[0],pb[1],360],[pa[0],pa[1],360]], [ac,-170,350], shade(c.stone,1.02)); }
  },
  gatehouse(c){
    houseMass(330, 480, -130, -300, 260, c.stone, 1);
    this.stoneLines(330, 480, 0, 260, -130, c, 1);
    houseArch(405, -130, houseDoorDims(HOUSE_SC).h, 50, 26, shade(c.stone,.8), 1);
    houseDoorway(405, -130, HOUSE_SC, c.trim, c.leaf, 1);
    for(const a of [370, 440]) F(a-2, a+2, 160, 210, '#2a2420', null, 0, -129.6);
    T(330, 480, -300, -130, 260, shade(c.stone,.86));
    this.merlonsRect(330, 480, -300, -130, 260, c);
  },
  keep(c, d){
    houseMass(120, 690, -230, -500, 240, c.stone, d);
    const face = d > 0 ? -230 : -500;
    this.stoneLines(120, 690, 0, 240, face, c, d);
    houseSideWins(120, 690, -230, -500, [[140,190]], '#2a2420', { plain:true, w:16, pitch:80 });
    for(const a of [160, 660]) F(a-8, a+8, 150, 200, '#2a2420', null, 0, face + 0.3*d);
    T(120, 690, -500, -230, 240, shade(c.stone,.86));
    if(d < 0){ for(const a of [200, 300, 510, 610]) F(a-8, a+8, 140, 190, '#2a2420', null, 0, -500.4); rearDoor(405, c.stone, c.leaf, 500, 92); this.merlonsRect(120, 690, -230, -500 + 8, 240, c); }
    else this.merlonsRect(120, 690, -500, -230, 240, c);
  },
  flag(c){ if(!state.roof) return; cyl(560, -170, 360, 440, 1.6, '#2a2a2e'); poly([P(561,-170,436), P(606,-170,428), P(561,-170,414)], c.flag, shade(c.flag,.7), 1); },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    houseProp('cannon', () => { tube(110, -60, 18, 190, -60, 24, 8, '#2a2a2e'); for(const a of [120, 150]) { faceCircle(a, -40, 14, 14, '#6b4a2e', '#3a2a1e', 1.4); faceCircle(a, -80, 14, 14, '#6b4a2e', '#3a2a1e', 1.4); } });
    for(const [nm, a] of [['torch L', 330], ['torch R', 480]])
      houseProp(nm, () => { cyl(a, -40, 0, 78, 2.4, '#2a2a2e'); cyl(a, -40, 78, 86, 5, '#2a2a2e'); ball(a, -40, 92, 5, '#f29a3a'); ball(a, -40, 96, 3, '#fbe07a'); });
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.keep(c, 1);
    this.tower(250, c);
    this.gatehouse(c);
    this.tower(560, c);
    this.flag(c);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); this.fore(p);
    this.tower(560, c); this.flag(c);
    this.gatehouse(c);
    this.tower(250, c);
    this.keep(c, -1);
    houseProp('ac unit', () => acUnit(160, 0, 500));
  }
},
/* ------------------------------------------------------------------ 83 */
{
  name:'Flats Lifeguard Lookout', hood:'The Flats', tier:'single', sc:HOUSE_SC, ww:HOUSE_SINGLE, dd:HOUSE_DEPTH_LAB,
  head:'Beach house with a lifeguard-tower lookout on the roof, surfboards, beach cruiser',
  desc:'A Flats beach house to finish the set: a pastel bungalow with a sun porch, and on the roof a lifeguard-tower lookout hut on legs with a ramp, a rescue buoy and a flag; surfboards in a rack, a beach cruiser, an outdoor shower and a sandy yard.',
  tags:['single','beach','lifeguard','the flats','surf'],
  door:[230, -150],
  liv:[ { wall:'#8ad0d8', trim:'#fbfaf5', roof:'#e8e4da', hut:'#f2c94a', hutTrim:'#d9352a', leaf:'#e0602a' },
        { wall:'#f2b8a0', trim:'#fbfaf5', roof:'#e4ddd0', hut:'#6ab0e0', hutTrim:'#fbfaf5', leaf:'#2f8f8a' },
        { wall:'#f2e08a', trim:'#fbfaf5', roof:'#e8e2d4', hut:'#d9352a', hutTrim:'#fbfaf5', leaf:'#3a5a9a' } ],
  vol:{
    foot:[[60,-150],[400,-150],[400,-480],[60,-480]], h:300,
    solids:[ { name:'post L', c:[66,-96], r:4, h:108 }, { name:'post R', c:[394,-96], r:4, h:108 },
             { name:'boards', poly:[[20,-60],[60,-60],[60,-20],[20,-20]], h:90, prop:true },
             { name:'bike', poly:[[330,-40],[420,-40],[420,-24],[330,-24]], h:40, prop:true },
             { name:'shower', c:[440,-300], r:8, h:110, prop:true },
             { name:'ac unit', poly:[[134,-508],[186,-508],[186,-480],[134,-480]], h:36, prop:true } ],
    marks:{ door:[230,-150], mat:[230,-150+35.4] }
  },
  yard(c){
    T(0, 460, -552, 0, 0.3, '#ecdcb4');
    for(let k = 0; k < 30; k++){ const a = 10 + (k*41) % 440, b = -10 - (k*29) % 130; poly([P(a,b,0.4), P(a+6,b,0.4)], null, '#d8c49a', 1); }
    T(60, 400, -150, -96, 3, '#c9b08a');
    for(let b = -86; b < -16; b += 20) T(206, 254, b, b+13, 0.7, '#d8d0bc');
  },
  body(c, d){
    houseMass(60, 400, -150, -480, 120, c.wall, d);
    const face = d > 0 ? -150 : -480;
    for(let z = 10; z < 118; z += 8) poly([P(60,face+0.3*d,z), P(400,face+0.3*d,z)], null, shade(c.wall,.88), 1);
    houseSideWins(60, 400, -150, -480, [[36,100]], c.trim);
    if(d > 0){
      houseDoorway(230, -150, HOUSE_SC, c.trim, c.leaf, 1);
      houseWin(90, 170, 30, 104, -150, c.trim, c.trim, 1);
      houseWin(290, 370, 30, 104, -150, c.trim, c.trim, 1);
    } else {
      houseWin(100, 180, 30, 104, -480, c.trim, c.trim, -1);
      rearDoor(300, c.wall, c.leaf, 480, 92);
    }
    houseHip(60, 400, -150, -480, 120, 176, 14, c.roof);
  },
  lookout(c){
    if(!state.roof) return;
    for(const [a, b] of [[180,-280],[280,-280],[180,-360],[280,-360]]) tube(a, b, 168, a + (a < 230 ? 8 : -8), b + (b < -320 ? 8 : -8), 216, 3, c.trim);
    box(176, 284, -364, -276, 216, 222, c.trim, shade(c.trim,.9), shade(c.trim,.78));
    box(186, 274, -354, -286, 222, 276, shade(c.hut,1.04), c.hut, shade(c.hut,.82));
    const face = state.back ? -354 : -286, d = state.back ? -1 : 1;
    F(196, 264, 238, 266, '#34424b', c.hutTrim, 1.6, face + 0.4*d);
    F(186, 274, 222, 228, c.hutTrim, null, 0, face + 0.5*d);
    houseHip(186, 274, -286, -354, 276, 298, 8, c.hutTrim);
    for(let t = 0; t <= 1.0001; t += 0.125) F(290, 330, 176 + 44*t - 1.2, 176 + 44*t + 1.2, c.trim, null, 0, -300 + 30*t);
    tube(290, -300, 176, 290, -270, 222, 1.6, c.trim); tube(330, -300, 176, 330, -270, 222, 1.6, c.trim);
    cyl(276, -320, 276, 330, 1.2, '#2a2a2e'); poly([P(277,-320,326), P(304,-320,320), P(277,-320,312)], c.hutTrim);
    faceCircle(230, face + 0.8*d, 244, 9, 'rgba(0,0,0,0)', c.hutTrim, 3);
  },
  porch(c){
    for(const aa of [66, 394]) box(aa-3, aa+3, -99, -93, 3, 108, c.trim, shade(c.trim,.9), shade(c.trim,.76));
    houseProfileRoof(60, 400, [[-96,104],[-150,120]], 6, c.roof, c.wall, { ext1:false, gable:shade(c.trim,.9) });
  },
  fore(p){
    const c = this.liv[state.pal % this.liv.length];
    this.porch(c);
    houseProp('boards', () => {
      box(20, 60, -60, -20, 0, 6, '#8a6848', '#7a5a3c', '#6a4e34');
      for(const [a, col] of [[28,'#f2c94a'],[40,'#e46a5a'],[52,'#6ac0c8']]) poly([P(a-4,-40,6), P(a+4,-40,6), P(a+4,-40,80), P(a,-40,90), P(a-4,-40,80)], col, shade(col,.7), 1);
    });
    houseProp('bike', () => { for(const da of [14, 76]) faceCircle(330 + da, -32, 16, 14, 'rgba(0,0,0,0)', '#2a2a2e', 2);
      poly([P(344,-32,16), P(374,-32,16), P(392,-32,34), P(360,-32,34), P(344,-32,16)], null, c.leaf, 2.2); poly([P(392,-32,34), P(406,-32,16)], null, c.leaf, 2.2); ball(360, -32, 38, 3, '#2a2a2e'); });
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.body(c, 1);
    this.lookout(c);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); this.fore(p);
    this.body(c, -1);
    this.lookout(c);
    houseProp('shower', () => { cyl(440, -300, 0, 110, 2, '#b8bcc0'); tube(440, -300, 110, 440, -316, 110, 1.4, '#b8bcc0'); cyl(440, -316, 104, 108, 5, '#b8bcc0'); T(424, 456, -316, -284, 1, '#a8835c'); });
    houseProp('ac unit', () => acUnit(160, 0, 480));
  }
},
/* ---- A SPLIT-LEVEL for Sierra Vista's first terrace wall (Sir,
   2026-09-23, sketching over the straddling house: "for the split level on
   the terrace we dont have a design for it i guess but i want it to be on
   both levels of ground not just centered on the split"). Authored in the game (index.html, beside the Sierra Vista set) and copied
   here so the lab stays the canonical list; the two must match.
   Two wings on two grounds:
     LOWER WING  on the court, b -90..-270, two storeys to 130; its back
                 wall IS the retaining wall line, and its flat roof is a
                 terrace -- parapet, pots -- looking down the hill.
     UPPER WING  on the terrace's own lawn, SPLIT_Z up (the 180 step, in
                 lab units), b -270..-530, set in from both ends, its own
                 three storeys under a tile hip; French doors step out from it
                 onto the lower wing's roof.
   Placed with its b = -270 on the wall line (see split in sierraGeo), so
   each wing stands on real ground and nothing is buried. ---- */
{
  name:'Terrazza Split-Level', hood:'The Flats', tier:'double', sc:HOUSE_SC, ww:HOUSE_DOUBLE, dd:HOUSE_DEPTH_LAB,
  head:'Split-level: a two-storey wing on the lower ground, a second wing on the terrace above, roof terrace between',
  desc:'A Mediterranean split-level built into a terrace wall: a two-storey stucco wing on the lower ground with a flat roof terrace, and behind it a second two-storey wing standing on the terrace itself under a red tile hip roof, its French doors opening onto the roof terrace.',
  tags:['double','split level','mediterranean','roof terrace','hillside'],
  door:[405, -90],
  splitB:-270, splitZ:75,
  liv:[ { wall:'#f2e8d6', roof:'#b8583a', trim:'#5a4636', leaf:'#4a5a3a', cap:'#e2d8c0' },
        { wall:'#efe0c8', roof:'#a84e34', trim:'#2e4d68', leaf:'#2e4d68', cap:'#e8dcc4' },
        { wall:'#f5f0e4', roof:'#c0613f', trim:'#3f5a3e', leaf:'#6b4a36', cap:'#ddd2ba' } ],
  vol:{
    foot:[[60,-90],[750,-90],[750,-270],[690,-270],[690,-530],[150,-530],[150,-270],[60,-270]], h:265,
    solids:[ { name:'palm L', c:[40,-60], r:7, h:190, prop:true },
             { name:'olive R', c:[780,-70], r:16, h:90, prop:true } ],
    marks:{ door:[405,-90], mat:[405,-90+35.4] }
  },
  yard(c){
    houseLawn(0, 809.6, -90, 0, '#86a85e');
    T(372, 438, -90, 0, 0.6, '#c9a07a');
  },
  upper(c, d){
    /* DEEPER AND TALLER (Sir: "the upper building needs to be deeper and
       taller"): three storeys over the terrace, 260 deep -- its back still
       clears the terrace street's sidewalk by a strip of lawn */
    const Z = this.splitZ, bf = this.splitB, bb = -530, H = Z + 190;
    houseMass(150, 690, bf, bb, H, c.wall, d, Z);
    houseSideWins(150, 690, bf, bb, [[Z + 20, Z + 58], [Z + 78, Z + 112], [Z + 136, Z + 170]], c.trim, { w:34 });
    if(d > 0){
      /* the two storeys that clear the lower wing's roof: windows either
         side of the French doors onto the roof terrace, and a full row
         above */
      for(const [a0, a1] of [[200,250],[290,340],[520,570],[610,660]]) houseWin(a0, a1, Z + 78, Z + 112, bf, c.trim, shade(c.wall,.92), 1, { shutter: shade(c.trim,1.3) });
      for(const [a0, a1] of [[200,250],[290,340],[405,455],[520,570],[610,660]]) houseWin(a0, a1, Z + 136, Z + 170, bf, c.trim, shade(c.wall,.92), 1, { shutter: shade(c.trim,1.3) });
      F(392, 468, 130, 130 + 62, shade(c.trim,.9), shade(c.trim,.6), 1, bf + 0.3);      // French door casing
      F(398, 462, 130, 130 + 58, '#34424b', null, 0, bf + 0.5);
      F(429, 431, 130, 130 + 58, shade(c.trim,.9), null, 0, bf + 0.7);
      F(398, 462, 130 + 36, 130 + 58, 'rgba(170,205,220,.35)', null, 0, bf + 0.6);
    } else {
      for(const zr of [[Z + 78, Z + 112], [Z + 136, Z + 170]])
        for(const [a0, a1] of [[220,270],[380,430],[570,620]]) houseWin(a0, a1, zr[0], zr[1], bb, c.trim, shade(c.wall,.92), -1);
      rearDoor(420, c.wall, c.leaf, -bb, 92);
    }
    houseHip(150, 690, bf, bb, H, H + 56, 12, c.roof);
  },
  lower(c, d){
    const bf = -90, bb = this.splitB, H = 130;
    houseMass(60, 750, bf, bb, H, c.wall, d);
    houseSideWins(60, 750, bf, bb, [[26,64],[80,114]], c.trim, { w:34 });
    if(d > 0){
      houseArch(405, bf, houseDoorDims(HOUSE_SC).h, 40, 16, shade(c.wall,.9), 1);
      houseDoorway(405, bf, HOUSE_SC, c.trim, c.leaf, 1);
      for(const [a0, a1] of [[110,160],[210,260],[550,600],[650,700]]){
        houseArchWin(a0, a1, 26, 70, bf, c.trim, 1);
        houseWin(a0, a1, 82, 114, bf, c.trim, shade(c.wall,.92), 1, { shutter: shade(c.trim,1.3) });
      }
    }
    /* the flat roof is a DECK (Sir: "have a hand rail on its lower roof
       like a deck"): tiled floor, a low curb round the open edges, and an
       open rail on it -- posts, balusters and a top rail -- along the front
       and both ends. Far end first, then the front, then the seen end, so
       each rail stands in front of what is behind it. Pots inside the rail. */
    T(60, 750, bb, bf, H, shade(c.cap,.92));
    for(let a = 72; a < 750; a += 40) T(a, a + 20, bb, bf, H + 0.2, shade(c.cap,.86));
    const RH = 30, rail = shade(c.trim,.95), post = c.trim;
    for(const a of [90, 720]){ cyl(a, bf - 26, H, H + 20, 11, '#b8683a', '#5f8f4f'); ball(a, bf - 26, H + 28, 12, '#5f8f4f'); }
    const sideRail = aS => {                                 // an end rail, on the plane a = aS
      box(aS - 3, aS + 3, bb, bf, H, H + 5, c.cap, shade(c.wall,.96), shade(c.wall,.8));
      for(let b = bb + 6; b < bf - 2; b += 12) S(aS, b, b + 2.4, H + 5, H + RH, rail);
      for(const b of [bb + 3, (bb + bf)/2, bf - 3]) box(aS - 2.5, aS + 2.5, b - 2.5, b + 2.5, H + 5, H + RH + 3, shade(post,1.1), post, shade(post,.8));
      box(aS - 3, aS + 3, bb, bf, H + RH, H + RH + 4, shade(rail,1.15), rail, shade(rail,.8));
    };
    sideRail(64);
    if(d > 0) this.deckKit(c, H, bb, bf);                    // inside the far rail, behind the front one
    box(60, 750, bf - 6, bf, H, H + 5, c.cap, shade(c.wall,.96), shade(c.wall,.8));
    for(let a = 66; a < 746; a += 12) F(a, a + 2.4, H + 5, H + RH, rail, null, 0, bf - 3);
    for(let a = 64; a <= 746; a += 138) box(a - 2.5, a + 2.5, bf - 5.5, bf - 0.5, H + 5, H + RH + 3, shade(post,1.1), post, shade(post,.8));
    box(60, 750, bf - 6, bf, H + RH, H + RH + 4, shade(rail,1.15), rail, shade(rail,.8));
    sideRail(746);
  },
  /* ON THE DECK (Sir: "one should have a swimming pool and furniture on
     its roof deck the other just needs furniture"). Which one comes off
     the lot (_deck, set by the estate before it draws): 'pool' lays a
     raised pool basin east of the French doors with loungers and an
     umbrella by it; anything else lays an outdoor dining set under an
     umbrella there instead. Both keep the doors' path (a 390..470) clear
     and put two loungers and a side table on the west end. Everything is
     drawn far to near (b, then a) so it stacks on screen as it stands. */
  deckKit(c, H, bb, bf){
    const wood = '#8a6a4a', frame = '#e8e2d6', cush = ['#f2ece0', '#d9c6a0', '#e8eef0'][state.pal % 3];
    const lounger = (a0, b0) => {                            // foot toward the front, backrest at the back
      box(a0, a0 + 26, b0, b0 + 66, H + 3, H + 9, cush, shade(frame,.9), shade(frame,.75));
      for(const [da, db] of [[2, 4], [22, 4], [2, 60], [22, 60]]) box(a0 + da, a0 + da + 2, b0 + db, b0 + db + 2, H, H + 3, frame, frame, shade(frame,.8));
      poly([P(a0, b0 + 16, H + 9), P(a0 + 26, b0 + 16, H + 9), P(a0 + 26, b0 + 2, H + 30), P(a0, b0 + 2, H + 30)], shade(cush,.96), shade(cush,.7), 0.8);
    };
    const umbrella = (a, b, col) => {
      cyl(a, b, H, H + 74, 1.8, '#6b5a44');
      plateCircle(a, b, H + 72, 44, shade(col,.82));
      plateCircle(a, b, H + 76, 38, col);
      ball(a, b, H + 80, 3.5, '#e8e2d6');
    };
    const sideTable = (a, b) => { cyl(a, b, H, H + 16, 2, '#6b5a44'); plateCircle(a, b, H + 16, 10, frame); };
    /* the west end: two loungers and a side table, for both */
    lounger(110, bb + 12); lounger(156, bb + 12); sideTable(200, bb + 40);
    if(this._deck === 'pool'){
      /* a raised basin: stone coping, the water a step down inside it, a
         deeper band along the far wall, ripple lines, and a ladder */
      const a0 = 492, a1 = 704, b0 = bb + 14, b1 = bf - 40;
      box(a0, a1, b0, b1, H, H + 10, shade(c.cap,1.04), shade(c.cap,.9), shade(c.cap,.78));
      T(a0 + 8, a1 - 8, b0 + 8, b1 - 8, H + 8, '#4f9fc4');
      T(a0 + 8, a1 - 8, b0 + 8, b0 + 22, H + 8.2, '#3f86ad');
      for(let k = 0; k < 4; k++){ const bk = b0 + 30 + k*((b1 - b0 - 50)/3); T(a0 + 24 + k*18, a0 + 84 + k*18, bk, bk + 2.5, H + 8.4, 'rgba(220,244,252,.55)'); }
      for(const aa of [a1 - 30, a1 - 18]) box(aa, aa + 2, b1 - 6, b1 - 4, H + 8, H + 24, '#dfe6ea', '#c9d2d8', '#aab4ba');
      umbrella(250, bb + 40, '#2f6f8a');
    } else {
      /* an outdoor dining set under an umbrella */
      const ta = 590, tb = (bb + bf)/2;
      const chair = (a, b, backB) => {
        box(a - 9, a + 9, b - 9, b + 9, H + 11, H + 14, wood, shade(wood,.85), shade(wood,.7));
        for(const [da, db] of [[-8, -8], [6, -8], [-8, 6], [6, 6]]) box(a + da, a + da + 2, b + db, b + db + 2, H, H + 11, shade(wood,.8), shade(wood,.8), shade(wood,.65));
        box(a - 9, a + 9, backB - 1.5, backB + 1.5, H + 14, H + 32, shade(wood,1.05), wood, shade(wood,.7));
      };
      chair(ta - 22, tb - 34, tb - 43); chair(ta + 22, tb - 34, tb - 43);          // the far pair first
      box(ta - 40, ta + 40, tb - 22, tb + 22, H + 22, H + 25, shade(wood,1.1), wood, shade(wood,.75));
      for(const [da, db] of [[-36, -18], [34, -18], [-36, 16], [34, 16]]) box(ta + da, ta + da + 2.5, tb + db, tb + db + 2.5, H, H + 22, shade(wood,.8), shade(wood,.8), shade(wood,.65));
      chair(ta - 22, tb + 34, tb + 43); chair(ta + 22, tb + 34, tb + 43);
      umbrella(ta, tb, '#c9622a');
    }
  },
  fore(p){
    houseProp('palm L', () => housePalm(40, -60, 180, '#5f8f4f'));
    houseProp('olive R', () => { cyl(780, -70, 0, 34, 4, '#6b5a44'); ball(780, -70, 62, 30, '#7a8f5a'); });
  },
  draw(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c);
    this.upper(c, 1);          // the far wing first: the near one stands in front of its foot
    this.lower(c, 1);
  },
  back(p){
    const c = this.liv[state.pal % this.liv.length];
    this.yard(c); this.fore(p);
    this.lower(c, -1);
    this.upper(c, -1);
  }
}

];

/* every fenced yard gets the fence's collision (see houseYardFence) */
for(const sh of HOUSES) if(sh.yardFence && sh.vol){
  sh.vol.solids = (sh.vol.solids || []).concat(houseYardSolids(sh));
}
