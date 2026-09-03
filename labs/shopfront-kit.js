/* =====================================================================
   THE SHARED SHOPFRONT KIT
   =====================================================================
   Same reason the shops moved out: there is more than one bench that
   has to draw them, and a primitive that exists twice is a primitive
   that will disagree with itself within a session.

   WHAT IS NOT IN HERE, deliberately: the projection. Each bench owns
   P(a,b,z) and the K it scales by, because that is the ONLY thing that
   differs between them --

     shopfront-lab.html      one hand-chosen iso view, ZSCALE 1.5
     shopfront-phaser.html   the game's own W() through a block edge

   -- and keeping it as the single seam is what makes the phaser bench a
   port test rather than a second implementation. A bench must define,
   before anything here runs: P(a,b,z), K, ctx, and state{roof,props}.
   ===================================================================== */

const TILE = 46, T2 = TILE*2;
const DOOR_W = T2, DOOR_H = T2*2;       // 92 x 184, from DOOR_ART
const SHOP_DOOR_W = DOOR_W*0.72;        // 66.24  -- drawPickupUnit
const SHOP_DOOR_H = DOOR_H*0.88;        // 161.92 -- drawShopDoor dZ1
const STORE_H = 252;                    // mid of drawStoreUnit's 238..266 stack
const W = 230, D = T2*3;                // one unit: frontage width, depth (276)
/* `state` is bench-owned: each bench has its own shape for it (the
   canvas lab tracks a framing cache and a grid toggle it does not
   share). The kit only ever reads state.roof and state.props. */

/* ================= VERTICAL SCALE =================
   Measured, not chosen. The lab's shops were hand-set at H = 104..314,
   median 172, while a real drawStoreUnit wall runs 238..266 -- the lab
   has been drawing at roughly two thirds of game height throughout. The
   consequence is not cosmetic: SHOP_DOOR_H is 161.9, taller than most
   of these shops' entire walls, so no pickup worker could have walked
   out of one.

   A per-shop `H = STORE_H` swap does NOT fix it. Only about six z
   values per shop are written relative to H; the rest -- sills, heads,
   signs, roof kit -- are absolute literals that would stay where they
   were and leave every shop internally broken.

   What does work is one factor, applied once, here. Every height in the
   lab reaches the screen through this function: F, S, T, box, slab,
   cyl, tube, faceCircle and ball all build on P. So scaling z here
   scales a whole shop uniformly and preserves every proportion already
   dialled into it. 252/172 rounds to 1.5, which puts a typical shop on
   the game's one-storey stack and leaves a 314 shop at 471 -- a real
   three storeys rather than a squashed one.

   A shop that has already been rebuilt on the game anchors opts out
   with zs:1 so it is not scaled twice. */
function poly(pts, fill, stroke, lw){
  ctx.beginPath();
  pts.forEach((p,i)=> i ? ctx.lineTo(p.x,p.y) : ctx.moveTo(p.x,p.y));
  ctx.closePath();
  if(fill){ ctx.fillStyle = fill; ctx.fill(); }
  if(stroke){ ctx.strokeStyle = stroke; ctx.lineWidth = lw||1; ctx.stroke(); }
}
/* front-plane rectangle (the facade); bb nudges it off the wall */
function F(a0,a1,z0,z1,fill,stroke,lw,bb){
  const b = bb===undefined ? 0 : bb;
  poly([P(a0,b,z1),P(a1,b,z1),P(a1,b,z0),P(a0,b,z0)], fill, stroke, lw);
}
/* side-plane rectangle on the a = aa face */
function S(aa,b0,b1,z0,z1,fill,stroke,lw){
  poly([P(aa,b0,z1),P(aa,b1,z1),P(aa,b1,z0),P(aa,b0,z0)], fill, stroke, lw);
}
/* horizontal plate at height z */
function T(a0,a1,b0,b1,z,fill,stroke,lw){
  poly([P(a0,b0,z),P(a1,b0,z),P(a1,b1,z),P(a0,b1,z)], fill, stroke, lw);
}
/* a small solid box sitting on the roof or the pavement */
function box(a0,a1,b0,b1,z0,z1,top,front,side){
  /* WHICH TWO FACES EXIST, asked rather than asserted. This drew F at
     b1 and S at a1 unconditionally -- the near face and the a = a1 end
     of ONE projection. Under the game's four block edges neither is a
     constant: on edge 2 the visible end is a = a0, so the box painted
     its far end and left its near one open and rendered inside-out, an
     open shell with its interior on show. Same fault body() already
     solved with FLANK_RIGHT, and the same fault the kit fixed once for
     faceT/plateT: one projection hardcoded into a shared primitive.

     A face is visible when its outward normal comes toward the eye, and
     under this projection nearer is further DOWN the screen, so the
     test is just the sign of the screen-y step along each axis. Derived
     from P() so it holds for whatever view the host installed -- and it
     agrees with FLANK_RIGHT by construction, since that flag is the
     same dv test written in world terms. */
  const o = P(a0,b0,z0), pa = P(a0+1,b0,z0), pb = P(a0,b0+1,z0);
  const nearB = (pb.y - o.y) > 0 ? b1 : b0;   // the b face toward the eye
  const endA  = (pa.y - o.y) > 0 ? a1 : a0;   // the end wall that is seen
  T(a0,a1,b0,b1,z1, top);
  F(a0,a1,z0,z1, front, null,0, nearB);
  S(endA,b0,b1,z0,z1, side);
}
/* ================= ISO-CORRECT PRIMITIVES =================
   A circle drawn with ctx.arc is a circle ON THE SCREEN. That is only
   ever right for a sphere. Every other circle in this world lies in a
   PLANE -- a clock face on a wall, the end of a drum, a bucket rim, a
   manhole -- and under this projection a plane circle becomes a sheared
   ellipse. Drawing those with arc() is what makes a prop read as a
   sticker stuck on the render rather than as a thing standing in the
   world, and it was the single most common fault in the first pass.

   Derivation, so these can be checked rather than trusted:
     screen x = (a - b)K,  screen y = ((a + b)/2 - z)K
   A circle in the FRONTAGE plane (b fixed) is (a + r cos0, z + r sin0):
     x = x0 + rK cos0
     y = y0 + (rK/2) cos0 - rK sin0
   A circle lying FLAT (z fixed) is (a + r cos0, b + r sin0):
     x = x0 + rK (cos0 - sin0)
     y = y0 + (rK/2)(cos0 + sin0)
   Both are linear in (cos0, sin0), so each is just a matrix on a unit
   circle -- which is what faceT and plateT set up. */
/* ================= ISO-CORRECT PRIMITIVES =================
   A circle drawn with ctx.arc is a circle ON THE SCREEN. That is only
   ever right for a sphere. Every other circle in this world lies in a
   PLANE -- a clock face on a wall, the end of a drum, a bucket rim, a
   manhole -- and under an isometric projection a plane circle becomes a
   sheared ellipse. Drawing those with arc() is what makes a prop read as
   a sticker stuck on the render rather than as a thing standing in the
   world, and it was the single most common fault in the first pass.

   THE BASIS IS NOW DERIVED FROM P(), NOT ASSUMED.
   These used to set the ellipse up with a hardcoded matrix:

       ctx.transform(r*K, r*K*0.5, 0, -r*K, o.x, o.y)

   which says the vertical basis of the projection is exactly (0,-K).
   Two things were wrong with that. It ignored ZSCALE, so on every shop
   that did not opt out with zs:1 a face circle came out at 1/1.5 of its
   true height -- portholes, clocks and dials squashed to two thirds,
   16 shops affected. And it hardcoded ONE projection, so the same call
   in the phaser bench, where a shop can sit on any of four block edges
   with a different (a,b) -> screen mapping on each, would have drawn the
   ellipse of a view that bench never renders.

   Both faults have one cause and one fix: ask the projection what its
   basis is instead of asserting it. A circle in a plane is linear in
   (cos, sin), so two finite differences of P() give the exact ellipse
   for whatever projection the host installed.

     face  circle lies in the frontage plane (b fixed): spanned by a, z
     plate circle lies flat            (z fixed): spanned by a, b */
function basisFace(a,b,z){                 // plane b fixed: spanned by a and z
  const o = P(a,b,z), pa = P(a+1,b,z), pz = P(a,b,z+1);
  return { o, ux:pa.x-o.x, uy:pa.y-o.y, vx:pz.x-o.x, vy:pz.y-o.y };
}
function basisPlate(a,b,z){                // plane z fixed: spanned by a and b
  const o = P(a,b,z), pa = P(a+1,b,z), pb = P(a,b+1,z);
  return { o, ux:pa.x-o.x, uy:pa.y-o.y, vx:pb.x-o.x, vy:pb.y-o.y };
}
/* faceT/plateT keep their old contract -- they install a transform and
   the caller then draws in UNIT-CIRCLE space and restores -- because 17
   shops call them directly and draw more than a circle inside. Only the
   matrix changed: it is read off P() now instead of being asserted. */
function faceT(a,b,z,r){
  const B = basisFace(a,b,z);
  ctx.save(); ctx.transform(B.ux*r, B.uy*r, B.vx*r, B.vy*r, B.o.x, B.o.y);
}
function plateT(a,b,z,r){
  const B = basisPlate(a,b,z);
  ctx.save(); ctx.transform(B.ux*r, B.uy*r, B.vx*r, B.vy*r, B.o.x, B.o.y);
}
function unitCircle(fill, stroke, lw, r){
  ctx.beginPath(); ctx.arc(0,0,1,0,Math.PI*2);
  if(fill){ ctx.fillStyle = fill; ctx.fill(); }
  if(stroke){ ctx.strokeStyle = stroke; ctx.lineWidth = (lw||1)/(r*K); ctx.stroke(); }
}
function faceCircle(a,b,z,r,fill,stroke,lw){ faceT(a,b,z,r); unitCircle(fill,stroke,lw,r); ctx.restore(); }
function plateCircle(a,b,z,r,fill,stroke,lw){ plateT(a,b,z,r); unitCircle(fill,stroke,lw,r); ctx.restore(); }
/* A BAND AROUND A SOLID IS NOT A RING. plateCircle draws the whole
   ellipse, which is right for a disc lying flat with nothing on top of
   it -- a manhole, a drain -- and wrong for every hoop that wraps a
   barrel, drum, silo or dome, because the far half of the band is
   behind the thing it is wrapping. Drawn as a full ellipse it reads
   straight across the front of the solid and the solid goes
   see-through. Same fault as the bakery's stovepipe.

   The visible half is the arc that passes the front, between the two
   points where the rim turns vertical on screen -- the identical
   derivation cyl() uses for its silhouette, and now literally the same
   call, so a hoop drawn here meets the cylinder's own edges exactly. */
/* THE SILHOUETTE OF A FLAT RIM, derived. A rim point is
     x = x0 + r(ux cos0 + vx sin0),  y = y0 + r(uy cos0 + vy sin0)
   with (ux,uy) and (vx,vy) the screen steps of a and b. dx/d0 = 0 at
   tan0 = vx/ux, so the rim turns vertical at 0s = atan2(vx,ux) and
   0s+pi -- and the visible half is whichever of the two arcs between
   them passes the FRONT, i.e. the larger screen y. Both cyl() and
   plateHoop() had 0s = 3pi/4 written in as a constant, which is only
   the answer when vx/ux = -1. It is on the canvas lab and on the game's
   edges 1 and 3; on edges 0 and 2 ux and vx share a sign, both constant
   angles land on the SAME screen x, and the sweep spans 0.00 of a
   32.15px drum -- the body collapses to a sliver and only the lid
   survives, which is why every jar read as a disc on a stem. */
function plateSweep(a,b,z){
  const o = P(a,b,z), pa = P(a+1,b,z), pb = P(a,b+1,z);
  const ux = pa.x-o.x, uy = pa.y-o.y, vx = pb.x-o.x, vy = pb.y-o.y;
  const ts = Math.atan2(vx, ux);
  const dir = (uy*Math.cos(ts+Math.PI/2) + vy*Math.sin(ts+Math.PI/2)) > 0 ? 1 : -1;
  return { ts, dir };
}
function plateHoop(a,b,z,r,col,lw){
  const N = 14, pts = [];
  const { ts, dir } = plateSweep(a,b,z);
  for(let i=0;i<=N;i++){
    const t = ts + dir*Math.PI*i/N;
    pts.push(P(a + r*Math.cos(t), b + r*Math.sin(t), z));
  }
  ctx.beginPath();
  pts.forEach((q,i)=> i ? ctx.lineTo(q.x,q.y) : ctx.moveTo(q.x,q.y));
  ctx.strokeStyle = col; ctx.lineWidth = lw||2;
  ctx.lineCap = 'round'; ctx.stroke(); ctx.lineCap = 'butt';
}
/* a sphere IS a screen circle under an orthographic camera, so arc is
   correct here -- with a shading crescent so it reads as a ball and not
   as a dot */
function ball(a,b,z,r,fill,lit){
  const o = P(a,b,z);
  ctx.beginPath(); ctx.arc(o.x,o.y,r*K,0,Math.PI*2); ctx.fillStyle=fill; ctx.fill();
  ctx.beginPath(); ctx.arc(o.x - r*K*0.30, o.y - r*K*0.30, r*K*0.62, 0, Math.PI*2);
  ctx.fillStyle = lit || shade(fill,1.22); ctx.fill();
}
/* VERTICAL CYLINDER. The silhouette runs between the two points where
   the flat rim turns vertical on screen, and the visible side is the
   arc between them that passes the front -- both read off P() by
   plateSweep() rather than written in, so the drum is a drum on all
   four block edges. Body first, then the lid, so the lid always caps it
   cleanly. */
function cyl(a,b,z0,z1,r,col,lid){
  const N = 14, rim = (t,z) => P(a + r*Math.cos(t), b + r*Math.sin(t), z);
  const pts = [];
  const { ts, dir } = plateSweep(a,b,z0);   // see plateSweep: was a constant
  const ang = i => ts + dir*Math.PI*i/N;
  for(let i=0;i<=N;i++){ pts.push(rim(ang(i),z0)); }
  for(let i=N;i>=0;i--){ pts.push(rim(ang(i),z1)); }
  ctx.beginPath();
  pts.forEach((q,i)=> i ? ctx.lineTo(q.x,q.y) : ctx.moveTo(q.x,q.y));
  ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  ctx.strokeStyle = shade(col,.72); ctx.lineWidth = 1.2; ctx.stroke();
  plateCircle(a,b,z1,r, lid || shade(col,1.16), shade(col,.78), 1.4);
}
/* a run of pipe or rail between any two world points, with rounded ends */
function tube(a0,b0,z0, a1,b1,z1, r, col){
  const p0 = P(a0,b0,z0), p1 = P(a1,b1,z1);
  ctx.strokeStyle = col; ctx.lineWidth = r*2*K; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(p0.x,p0.y); ctx.lineTo(p1.x,p1.y); ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.strokeStyle = shade(col,1.2); ctx.lineWidth = r*0.7*K;
  ctx.beginPath(); ctx.moveTo(p0.x - r*0.4*K, p0.y - r*0.5*K);
  ctx.lineTo(p1.x - r*0.4*K, p1.y - r*0.5*K); ctx.stroke();
}
/* ================= SHOPFRONT DEPTH =================
   THE LAYERING FAULT, and it was in every unit. A shopfront was being
   built as: opaque glass pane, then the goods painted ON TOP of it at a
   b NEARER the street than the glass. So everything that was meant to
   be standing inside the shop was in fact hanging on the outside of the
   window, which is why the props never read as being behind anything.

   The fix is an ORDER fix, not a modelling one. Back to front:
     1. reveal()  -- a shallow jamb, so the opening has a thickness
     2. anything on show -- inside that jamb, at descending b
     3. glaze()   -- the pane LAST, and nearly opaque
   Nothing is drawn at a b in front of the glass except things that are
   genuinely outside on the pavement. The pane hides the rest: we are
   not building rooms, we are keeping the eye off the fact that there
   are none.

   depthSort() exists for the stacking: a pile of crates or a shelf of
   jars has to be painted far-to-near or the near ones end up underneath.
   Index order only happens to be right when the loop runs the same way
   the camera does. */
function reveal(a0, a1, z0, z1, deep, col){
  /* WRONG SIGN, AND A DISCARDED ARGUMENT. This took `deep` and threw it
     away, then hardcoded b = +2. Positive b is toward the street, so the
     "dark backing behind the pane" was actually sitting 2.4 units in
     FRONT of the glass and only looked right because the canvas is
     painted in call order and glaze() came after it. The bakery hit this
     and had to hand-roll its own backing at b = -1.2 to get rid of a
     dark sliver down the jamb.

     That is the fault that matters for the port. In the lab, order is
     everything and depth is decoration; inside queueUnitStrips the
     opposite is true, and a backing at +2 sorts in front of its own
     window. So the recess is real now: the back plate sits at b = -deep
     and `deep` means what it says.

     YOU CAN ONLY SEE INTO A RECESS THROUGH THE OPENING. The first cut of
     this had the depth right and no clip, and a plate at -deep projects
     right by deep and up by deep/2 (x = (a-b)K, y = ((a+b)/2 - z)K), so
     on the laundromat's 13-unit reveal the backing ran 13 units past the
     right-hand end of the glazing and read as a grey volume standing off
     the corner of the building. The wall has a hole in it; everything
     behind that hole is bounded by it. Clipping to the opening quad is
     what makes that true, and it is what lets `deep` be any value at all
     without the shop having to know about the projection.

     Inside the clip the plate leaves a gap down the LEFT jamb and along
     the CILL, so those two returns are drawn and the other two are
     correctly never seen. Three quads, not a room: the pass that got
     rejected was the one that furnished the inside, not the one that
     gave the opening a thickness. */
  const d = deep === undefined ? 2 : deep;
  ctx.save();
  poly([P(a0,0,z1),P(a1,0,z1),P(a1,0,z0),P(a0,0,z0)]);
  ctx.clip();
  F(a0, a1, z0, z1, col, null, 0, -d);           // the backing, deepest, so first
  S(a0, 0, -d, z0, z1, shade(col,.84));          // left return, exposed by the shift
  T(a0, a1, 0, -d, z0, shade(col,.72));          // cill, exposed by the rise
  ctx.restore();
}
/* THE PANE DOES THE WORK. Glass that you can see through has to have
   something behind it that stands up to being seen, and nothing we
   build at this scale does. So the pane is nearly opaque: a tinted
   sheet with two reflection bands raked across it and a bright edge.
   Whatever sits behind survives only as a suggestion, which is exactly
   as much as the illusion needs. */
function glaze(a0, a1, z0, z1, frame, tint){
  /* The stack used to run -0.4 for the tint and then -0.6, -0.7 for the
     reflections and the bright edge -- each highlight DEEPER than the
     pane it is supposed to be lying on, surviving only because it was
     painted afterwards. Depth-sorted, every reflection disappears
     inside the glass. The frame had the same fault at -1: a shopfront
     frame stands proud of the pane, it does not sit behind it.

     So the stack ascends toward the viewer now, the way the door kit
     already does: tint, reflections, bright edge, frame. Same picture
     on this canvas, and the only one of the two that survives a real
     depth key. */
  F(a0, a1, z0, z1, tint || 'rgba(104,146,168,.92)', null, 0, -0.4);
  const w = a1 - a0, h = z1 - z0;
  poly([P(a0,-0.30,z1),P(a0+w*0.30,-0.30,z1),P(a0+w*0.06,-0.30,z0),P(a0,-0.30,z0)],
       'rgba(240,250,254,.20)');
  poly([P(a0+w*0.40,-0.26,z1),P(a0+w*0.52,-0.26,z1),P(a0+w*0.28,-0.26,z0),P(a0+w*0.16,-0.26,z0)],
       'rgba(240,250,254,.13)');
  poly([P(a0,-0.22,z1),P(a1,-0.22,z1),P(a1,-0.22,z1-h*0.06),P(a0,-0.22,z1-h*0.06)],
       'rgba(255,255,255,.16)');
  if(frame){
    F(a0-3, a0, z0-3, z1+3, frame, null,0, 0.5);
    F(a1, a1+3, z0-3, z1+3, frame, null,0, 0.5);
    F(a0-3, a1+3, z1, z1+3, frame, null,0, 0.5);
    F(a0-3, a1+3, z0-3, z0, frame, null,0, 0.5);
  }
}
/* paint a set of items far-to-near. Each item is {a, b, z, draw}.
   THE KEY WAS BOTH THE WRONG DIRECTION AND THE WRONG QUANTITY, which
   is why it only ever showed on a row whose members overlap on screen.

   Direction first. It sorted b DESCENDING, and its own comment said
   that was far-to-near because "deeper into the shop is further from
   the eye" -- true, but deeper into the shop is NEGATIVE b, so
   descending starts at the largest, which is the NEAREST. Measured
   rather than argued: P(0,1,0).y - P(0,0,0).y is +0.51, so a step of
   +1 in b moves an item DOWN the screen, and box() already uses that
   same sign to decide which b face is toward the eye. The sort was
   painting near first and far last -- backwards.

   Quantity second, and this is why flipping the sign alone is not the
   fix. The view direction is the null space of the projection:
     x = (a - b)K,  y = ((a + b)/2 - z)K
   is degenerate along (da,db,dz) with da = db = dz, so the camera looks
   down (1,1,1) and true depth is a + b + z. b alone is only a valid key
   when a and z are constant across the run, which is exactly the case
   in four of the six call sites -- and in the two where a varies (the
   bakery's loaves and the florist's buckets, both laid out along a with
   b alternating) it put every other item in the row on top of the one
   in front of it. That is the layering fault visible on the florist.

   So: a + b + z, ascending. `a` is optional and defaults to 0, which
   degenerates to the old behaviour for a uniform-a run; every call site
   in this library supplies it. z ascending breaks ties so a thing on a
   shelf still paints over the shelf. */
function depthSort(items){
  const key = it => (it.a || 0) + it.b + (it.z || 0);
  items.slice().sort((m,n) => (key(m) - key(n)) || ((m.z||0) - (n.z||0)))
       .forEach(it => it.draw());
}

/* a flat panel given real thickness, so no sign or parapet is ever a
   single zero-depth quad seen edge-on */
function slab(a0,a1,z0,z1,bFront,bBack,front,side,top){
  /* SAME FAULT box() HAD, and for the same reason: the end return was
     drawn at a1 unconditionally. a1 is the seen end only where the a
     axis runs toward the eye, which is edges 1 and 3 and the canvas lab;
     on edges 0 and 2 a1 is the far end, so every parapet, fascia and
     sign in the library put its return on the side you cannot see and
     left the side you can flat. Asked of P() rather than asserted. */
  const o = P(a0,bFront,z0), pa = P(a0+1,bFront,z0);
  const endA = (pa.y - o.y) > 0 ? a1 : a0;
  F(a0,a1,z0,z1, front, null,0, bFront);
  poly([P(endA,bFront,z1),P(endA,bBack,z1),P(endA,bBack,z0),P(endA,bFront,z0)], side || shade(front,.78));
  poly([P(a0,bFront,z1),P(a1,bFront,z1),P(a1,bBack,z1),P(a0,bBack,z1)], top || shade(front,1.14));
}

/* A SHAPED EMBLEM IS ONE SOLID, NOT A PILE OF SLABS. slab() gives a
   rectangle thickness; anything that is not a rectangle -- a cross, a
   chevron, an arrow, a letter -- was being built by overlapping two or
   three of them, and it reads as exactly that: the pieces' own returns
   and top plates run through the middle of the shape, so the eye sees
   the joins rather than the emblem.

   prism() takes ONE outline in the frontage plane and extrudes it. The
   outline has no interior edges, so there is nothing to seam.

   Which of its side faces exist is the same question box() and slab()
   answer, but an outline has as many faces as it has edges and they do
   not all face the same way, so it cannot be one test. The general form
   of that test is the projected winding: every outward-facing face of a
   closed solid projects with the SAME signed-area sign, and the near b
   face is outward by construction, so it supplies the sign and each
   side face is kept or dropped by comparing against it. That is
   projection-agnostic -- it needs to know nothing about which edge the
   block sits on -- and on a rectangle it selects the identical end that
   slab() derives, which is how it was checked.

   A horizontal outline edge extrudes to a plate rather than a return,
   so it takes the lighter top shade; the undersides that would want the
   same treatment are culled before they are ever asked about. */
function prism(pts, b0, b1, front, side, top){
  const n = pts.length;
  const o = P(0,b0,0), q1 = P(0,b1,0);
  const nb = q1.y > o.y ? b1 : b0, fb = q1.y > o.y ? b0 : b1;
  const area = q => { let A = 0;
    for(let k=0;k<q.length;k++){ const p = q[k], r = q[(k+1)%q.length];
      A += p.x*r.y - r.x*p.y; } return A; };
  const face = pts.map(([a,z]) => P(a,nb,z));
  const s = Math.sign(area(face));
  for(let i=0;i<n;i++){
    const [a0,z0] = pts[i], [a1,z1] = pts[(i+1)%n];
    const q = [P(a0,nb,z0),P(a0,fb,z0),P(a1,fb,z1),P(a1,nb,z1)];
    if(Math.sign(area(q)) !== s) continue;
    poly(q, z0 === z1 ? (top || shade(front,1.14)) : (side || shade(front,.78)));
  }
  poly(face, front);
}

/* the outline of a plus, wound once, for prism(). Half-length and
   half-thickness are given in WORLD units and the z extents are divided
   back by ZSCALE, so the arms stay equal whatever vertical scale the
   shop is drawn at -- the fault that made the pharmacy cross a block
   with a stick through it. */
function plusOutline(a, z, half, thick){
  const L = half, T = thick, k = 1/ZSCALE;
  return [[a-T,z-L*k],[a+T,z-L*k],[a+T,z-T*k],[a+L,z-T*k],[a+L,z+T*k],
          [a+T,z+T*k],[a+T,z+L*k],[a-T,z+L*k],[a-T,z+T*k],[a-L,z+T*k],
          [a-L,z-T*k],[a-T,z-T*k]];
}

function shade(hex, m){
  const n = parseInt(hex.slice(1),16);
  const r = Math.min(255,Math.max(0,((n>>16)&255)*m))|0;
  const g = Math.min(255,Math.max(0,((n>>8)&255)*m))|0;
  const b = Math.min(255,Math.max(0,(n&255)*m))|0;
  return '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
}

/* ---- palettes: three swaps per shop so colour can be dialled apart
       from form. Index 0 is the intended one. ---- */
const PAL = [
  ['#8a3f36','#c4a23a','#2a5c5c'],   // warm / gold / teal
  ['#3f6b4a','#c46a4a','#2e4d68'],   // green / terracotta / navy
  ['#3a3a3e','#d98a9e','#c9a56e']    // charcoal / coral / tan
];

/* =======================================================
   NINE SHOPS. Each owns its wall colour, parapet profile,
   sign geometry, roof kit and kerb props — identity comes
   from the silhouette, not from the facade texture.
   right flank, and the blank front wall the shop then dresses */
function body(wall, trim, H, wid, dep){
  const w = wid===undefined ? W : wid, d = dep===undefined ? D : dep;
  if(!NOPLATE) T(0,w,-d,0,H, shade(trim,1.05));          // roof
  /* WHICH END WALL, decided by the host rather than assumed.
     This drew S(w) unconditionally -- the a = w end -- which is right
     for the canvas lab's single view and wrong on half the block edges
     in the game, where drawStoreUnit's own cull (showRight = dvS > 0)
     says the a = 0 end is the visible one and the a = w end faces away.
     A shop that always draws S(w) shows no end wall at all on those
     edges, which reads as a missing face the moment units are not
     packed shoulder to shoulder.
     FLANK_RIGHT is the host's copy of that same test, so the library
     and the shipped stores agree about which end of a unit exists. */
  if(FLANK_RIGHT) S(w,-d,0,0,H, shade(wall,.78));        // a = w end
  else            S(0,-d,0,0,H, shade(wall,.72));        // a = 0 end
  F(0,w,0,H, wall);                                      // front wall
  ctx.strokeStyle = shade(wall,.55); ctx.lineWidth = 1.5;
  poly([P(0,0,H),P(w,0,H),P(w,0,0),P(0,0,0)], null, shade(wall,.6), 1.5);
  F(0,w,0,16, shade(wall,.66), null,0,-0.5);             // stallriser
}

/* ================= THE DOOR KIT =================
   Every shop had drawn its own door as a slab -- a box, 92 to 104 tall
   and 31 to 64 wide, standing proud of the wall. Three faults in one
   object: it was a volume where a shopfront door is a hole, it was the
   wrong size, and it was a different wrong size in every shop.

   The real one, from the shipped drawPickupUnit / drawShopDoor:
     width   min(DOOR_W*0.72, unitW*0.3)  =  66.24
     height  DOOR_H*0.88                  = 161.92

   dH divides by ZSCALE so the opening comes out at 161.92 in game units
   whatever vertical scale the shop itself is drawn at -- a shop on the
   1.5 lab factor and a shop already rebuilt on the anchors both get the
   same real door.

   Position is the shop's own business. The game centres the PICKUP
   door on u.w/2, but pickups will be targeted per shop rather than
   assumed, so the kit takes a midpoint and puts the door there. It
   clamps only so a door near the end of a frontage cannot run off it.

   Everything is on the frontage plane within 1.2 units. No slab, no
   return, so nothing casts a second little building onto the flank. */
function shopDoor(aMid, wall, trim, glass, wid, base){
  /* wid: some shops are drawn on a narrower unit (Tailor WW=170,
     Newsstand WW=150), so the clamp has to be against THEIR frontage,
     not the default W, or the door slides off the end of the wall. */
  const uw = wid === undefined ? W : wid;
  /* base: the floor the door stands on. Zero for a shopfront, but a
     goods depot's openings sit on a loading dock and a door drawn from
     the pavement would run through the dock face. */
  const z = base === undefined ? 0 : base;
  const hw = SHOP_DOOR_W/2, dH = SHOP_DOOR_H/ZSCALE;
  const mid = Math.max(hw+5, Math.min(uw-hw-5, aMid));
  const a0 = mid-hw, a1 = mid+hw;
  F(a0-4, a1+4, z, z+dH+7, shade(wall,.90), null, 0, 0.3);       // painted surround
  F(a0, a1, z, z+dH, '#2b2118', null, 0, 0.4);                    // opening
  /* THE FANLIGHT WAS A PANEL. Transom glass, rail and leaf were all at
     b = 0.6 -- one flat plane with three colours on it -- and the glass
     was a 55% wash over the near-black opening, so it came out as a grey
     slab sitting above the door rather than as a light over it.

     A fanlight is glazed into the head of the opening and the leaf
     swings in front of it, so the two cannot share a depth. The glass
     goes BEHIND the leaf line at 0.45, gets a tint from the same family
     as glaze() instead of a wash, and takes a raked highlight so it
     reads as glazing. The rail that divides them stands proud at 0.7,
     which is what a transom rail does. */
  F(a0+2, a1-2, z+dH-26, z+dH-4, glass || 'rgba(96,132,152,.94)', null,0,0.45);
  poly([P(a0+2,0.5,z+dH-4),P(a0+(a1-a0)*0.42,0.5,z+dH-4),
        P(a0+(a1-a0)*0.20,0.5,z+dH-26),P(a0+2,0.5,z+dH-26)],
       'rgba(240,250,254,.17)');
  F(a0+2, a1-2, z+dH-30, z+dH-26, shade(trim,.8), null,0,0.7);    // transom rail
  F(a0+2, a1-2, z, z+dH-30, trim, null, 0, 0.6);                  // leaf
  for(let k=0;k<2;k++)
    F(a0+8, a1-8, z+dH*0.07+k*dH*0.36, z+dH*0.30+k*dH*0.36, shade(trim,1.18), shade(trim,.7), 1.5, 0.9);
  F(a1-14, a1-10, z+dH*0.40, z+dH*0.53, '#d8c28a', null, 0, 1.2); // handle
  return { a0, a1, dH };
}

/* pavement props shared between shops */
function kerb(p, kind){
  if(!state.props) return;
  if(kind==='crates'){
    box(W+16,W+62,14,54,0,26,'#c98a4a','#a9703a','#8f5e31');
    box(W+22,W+56,20,48,26,38,'#b87d3e','#9a6634','#82562c');
  } else if(kind==='bench'){
    box(W*0.08,W*0.52,26,44,20,26,'#8b6a4e','#7a5c44','#6a5039');
    F(W*0.10,W*0.14,0,20,'#6d747c',null,0,34);
    F(W*0.46,W*0.50,0,20,'#6d747c',null,0,34);
  } else if(kind==='planters'){
    for(const aa of [W*0.06, W*0.88]){
      box(aa-14,aa+14,16,44,0,24,'#b9beb4','#a3a89a','#8f9487');
      const c=P(aa,30,34); ctx.beginPath(); ctx.arc(c.x,c.y,13*K,0,7);
      ctx.fillStyle='#4f7a4a'; ctx.fill();
    }
  } else if(kind==='stoop'){
    box(W*0.56,W*0.90,10,34,0,12,'#b9beb4','#a3a89a','#8f9487');
    box(W*0.58,W*0.88,14,30,12,20,'#c3c8be','#adb2a4','#999e91');
  } else if(kind==='seats'){
    for(const aa of [W*0.10, W*0.34]){
      cyl(aa, 34, 0, 22, 4, '#b9bcc0');
      cyl(aa, 34, 22, 28, 13, '#e2748c');
    }
  } else if(kind==='aboard'){
    poly([P(W*0.10,30,0),P(W*0.34,30,0),P(W*0.34,30,48),P(W*0.10,30,48)],'#22222a','#e0483c',2);
    for(let i=0;i<3;i++) F(W*0.13,W*0.31, 12+i*12, 18+i*12, '#f2ece0', null,0,-30);
  }
}

