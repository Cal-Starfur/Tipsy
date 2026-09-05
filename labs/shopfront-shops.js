/* =====================================================================
   THE 82 SHOPS -- the single source of truth.
   =====================================================================
   These bodies used to live inside shopfront-lab.html. They now live
   here because there is more than one bench that has to run them: the
   canvas lab where they are dialled, and shopfront-phaser.html, which
   renders them through the GAME's own projection, queue and face cull
   to prove a port will not break. Two copies of 82 shops would drift
   within a session -- the same trap game/index.html and game-logic.js
   are permanently guarded against -- so there is one copy and both
   benches load it.

   THE HOST CONTRACT. Nothing here is self-contained on purpose: a shop
   body is pure composition, and the primitives underneath it are what
   each bench substitutes. A host must define, before any draw() runs:

     geometry   P(a,b,z)  F  S  T  poly  slab  box  cyl  tube
     circles    faceCircle  plateCircle  plateHoop  ball
     shopfront  body  shopDoor  reveal  glaze  kerb
     helpers    shade  depthSort
     constants  W  D  STORE_H  DOOR_H  DOOR_W  SHOP_DOOR_W  SHOP_DOOR_H
     state      state.roof  state.props   (booleans)

   A shop receives the palette array as `p` and draws in unit-local
   coordinates: `a` along the frontage from 0 to W, `b` from 0 at the
   glass to -D into the block, `z` up from the pavement. That is the
   same frame drawStoreUnit uses in the game, which is what makes the
   verbatim port possible at all.

   Do not add a bench-specific branch to a shop body. If a shop needs
   something a bench cannot do, the bench grows a primitive.
   ===================================================================== */

/* ================= ONE BODY, TWO SHOPS =================
   The chemist is drawn twice, in two liveries: DISPENSARY in the
   original green and PHARMACY in red. It is one function and two colour
   sets rather than two shop bodies, for the same reason there is one
   copy of these 81 -- sorry, 82 -- rather than one per bench. A pasted
   duplicate would agree with its twin until the first time only one of
   them got a polish pass, and every fix in this body took a measurement
   to arrive at. Four literals differ between the two; nothing else can.

   Green and red are the two real-world chemist crosses (green across
   most of Europe, red in the older British and US convention), so this
   is a livery split rather than an invented one. */
const CHEMIST_LIVERY = {
  green: { trim:'#2f7d74', inner:'#7fa8a4', glass:'rgba(150,200,196,.55)', cross:'#3fae7f' },
  red:   { trim:'#9c3b34', inner:'#a8807d', glass:'rgba(200,158,152,.55)', cross:'#d6483c' }
};
function drawChemist(p, c){
    const wall = '#f0f2f0', trim = c.trim, H = 172;
    body(wall, trim, H);
    slab(0,W, H, H+8, -1, -12, trim);
    slab(W*0.30,W*0.70, H+8, H+30, -2, -12, wall, null, shade(wall,1.1));
    F(W*0.38,W*0.62, H+14, H+26, trim, null,0,-2.5);
    reveal(10, W-10, 20, 104, 13, c.inner);
    for(let r=0;r<2;r++)                                           // two painted shelf lines
      F(18, W-18, 44+r*26, 49+r*26, '#dfe9e6', null,0, 1.6);
    glaze(10, W-10, 20, 104, null);
    /* THE ENDS LANDED ON THE CORNER. Both of this shop's recessed bands
       ran a 6..W-6 at b -1..-9: an 8-deep recess with 6 of a margin to
       absorb it, so each end came out 3.4px PAST the building's return
       and the facade had no pier left at the corner. Rule 1, and the
       exact slab(6,W-6,...,-1,-9) signature that was wrong on the
       barber -- the third instance of it found so far.

       The crossing swaps ends between mirrored edges, so it is not a
       one-end fix: both need margin greater than the depth, and the
       surplus IS the pier. 14 of margin against 7 of depth leaves 8,
       which is a 9.1px pier at both ends on all four edges. */
    /* THE WHOLE TRANSOM IS GONE, at Sir's direction: the glass block
       band (nine blocks at z 98..114) first, then the two bands that
       carried it -- a shelf at 100..108 and a cill at 96..116. With the
       blocks removed the two bands were a pale stripe over the window
       with nothing to explain it, which read worse than the blocks did.
       The window head at 104 now runs to the fascia at 118 as plain
       wall, which is what the rest of this facade is made of. */
    shopDoor(W*0.53, wall, trim, c.glass);
    slab(14, W-14, 118, 154, -1, -7, trim);   // see the pier note above
    /* SYMMETRIC IN a IS NOT CENTRED, AND YOU CANNOT FIX THAT IN a. This
       ran 20..W-20, symmetric about 115, and showed 25.5px of band at
       one end against 6.2px at the other. Cause: it sat at b -9.5 while
       the band front is at -1, and a recess projects sideways by its own
       depth -- apparent x is K(b-a), so 8.5 of relative depth is 9.7px
       of apparent shift.

       The obvious repair, moving the a-centre to 115 + b, was tried and
       is wrong: b flips sign between mirrored edges and a does not, so
       an offset that centres it on edge 1 puts it 21.6px out on edge 2.
       Same trap as the barber fascia. Depth is the free variable, so the
       panel stays symmetric in a and comes up to 1.5 behind the band
       face instead of 8.5. The shift is 1.7px now, equal and opposite on
       the mirrors, and invisible on both. */
    F(20, W-20, 122, 150, wall, null,0,-2.5);
    /* THE CROSS WAS NOT A CROSS. Faults, in the order they were found.

       Thickness: the arms were cs*0.55 in z and cs*0.36 in a, written as
       if one `cs` governed both. z is multiplied by ZSCALE before it is
       projected and a is not, so 16.5 z came out 24.75 world against
       10.8 -- the arms were 2:1 apart and the a-arm measured 38.1px long
       by 28.1px thick, a block rather than an arm.

       Depth: it sat at b -10, BEHIND the -9 back face of the fascia band
       it is mounted on -- inside the wall, surviving only because it was
       painted afterwards, and gone the moment anything depth-sorts it.

       Build: two overlapping slabs, so each piece's own return and top
       plate ran through the middle of the other and it read as two
       pieces. One outline, one solid, via prism().

       Position: a census of this shop's a-centres put every other
       element on 115.0 and the cross on 184.0 -- the only thing on the
       facade that was not centred, by 69 units. Both plaque and emblem
       are on 115 now and stay there, for the reason above: a is the axis
       that survives mirroring, so world-centred is the only centring
       that holds on all four edges, and the apparent shift is kept small
       by keeping the stack shallow -- band -1, plaque 1, emblem 3.

       The plaque it used to sit on is gone. It was a second white
       rectangle in front of a white rectangle, which is one object more
       than the facade needs -- the fascia's own sign panel is the thing
       a cross gets mounted on. That panel was 14 z tall against a 16 z
       emblem, so the band had to grow to carry it: 120..146 became
       118..154 and the panel 126..140 became 122..150. The emblem sits
       on 136 with 6 z of panel above and below it, 6.8px, and 4 z of
       band reveal outside that. Depth stays shallow for the centring
       reason above -- band -1, panel -2.5, emblem 0.5. */
    const cz = 136;
    prism(plusOutline(115, cz, 12, 4), 0.5, -2.5, c.cross);
    if(state.roof){
      box(W*0.12,W*0.36,-120,-70,H,H+30,'#c3c8cc','#a8aeb3','#95999e');
      box(W*0.62,W*0.84,-160,-120,H,H+18,'#9aa0a6','#7d838a','#6a7076');
    }
    if(state.props){
      for(const aa of [W*0.06, W*0.90]){
        cyl(aa, 32, 0, 26, 15, '#b9beb4');
        plateCircle(aa, 32, 25, 12, '#5a4a38');
        ball(aa, 32, 36, 12, '#4f7a4a');
        ball(aa-7, 30, 30, 8, '#5c8a56');
      }
    }
    kerb(p,'none');
}


/* ============ PAVEMENT PROPS AND COLLISION, OPEN AT THE PORT ============
   `cTodo` on a shop counts the solids it stands on the pavement. Every
   one of them is a thing Tipsy can drive into, and none of them exists
   to the game yet: this library is art, and the collision volumes have
   to be registered when it ports, the way cones, bins, planters,
   hydrants and scooters already are.

   Measured by instrumenting cyl() and box() for anything at b > 8 (off
   the facade, out on the ground) with z0 < 40 (standing, not hanging).
   42 shops carry pavement props.

   AND 21 OF THEM STAND ON THE NEIGHBOUR'S GROUND. A commercial edge is
   packed with no gaps, so anything outside 0..w in `a` is on the next
   shop's pavement -- the nursery reaches 82 past its own frontage, the
   cantina's barrels reached 68. That is the same fault as a cornice
   crossing a return, at prop scale, and it matters more here because
   two neighbours' props would occupy the same collision volume.

   Worth knowing when placing one: positive b shifts a prop LEFT on
   screen by its own b, so a kerb prop needs a >= b just to stay inside
   the near return. The garage's pylon at a -18, b 64 landed on
   screen-a -82 before it was moved.

   Headroom is NOT on this list, and was checked: Tipsy is BODY z 14..54,
   LID to 61, FLAG to 97, footprint 52 x 40. The cantina's pergola beam
   soffits at game z 159 and its posts leave a 95-unit gap against a
   66-unit diagonal, so it clears with 62 to spare -- and SIDEWALK_W is
   4*T2 = 368, so a 52-deep porch never forces Tipsy under it anyway.
   ===================================================================== */

/* ================= FASCIA CHECK, OPEN =================
   `fTodo` on a shop lists what is wrong with its FASCIA -- the name
   board: the slab band across the shopfront plus the lettering panels
   on it. The band at the wall top is the CORNICE and is a different
   thing; it belongs to the building and is allowed to wrap a corner.
   A fascia belongs to ONE shopfront and the neighbour's board occupies
   the space past the return, so it may not.

   Measured by instrumenting body(), which is the only place that knows
   a shop's real frontage -- the narrow shops declare WW as a local
   inside draw() -- and its wall height, which is how fascia is told
   from cornice. Bands below z 60 are excluded: those are stallrisers
   and base plinths, not name boards.

   99 fascias found; 54 shops carry a fault, in three classes.

   A  RETURN PAST THE SILHOUETTE (52 shops, +1 to +12). A slab at
      negative b projects RIGHT on screen by its own depth, so the
      a-margin has to beat the recess. Fix: a0 = margin, a1 = w - margin
      with margin >= |bBack| + 6.

   B  LETTERING BEHIND THE BOARD (29 shops). The library convention is
      F(..., -9.5) against a board whose back face is -9, so the panel
      is behind the thing it is painted on and survives on call order
      alone -- under a depth key it vanishes inside the board. It also
      shifts 9.5 right while the board shifts 1, which is what throws
      the centring out. Fix: bFront + 0.5, proud of the face.

   C  LETTERING OFF-CENTRE ON SCREEN (Harbour office). Screen-a is
      a - b, so two things given the same `a` at different `b` are NOT
      aligned, and none of that shows in the numbers you write. Set the
      board out in SCREEN space and convert back -- see the Tailor,
      which is the worked example.

   WHY THIS IS A FLAG AND NOT A BULK EDIT. Three things make a blind
   pass unsafe, all of them found by trying:
     * the classifier cannot separate a fascia from a plinth on its own
       -- the first cut flagged the gym's 0..30 base band and the
       chapel's 26..32 as name boards;
     * -9.5 is not always a fascia: it appears legitimately inside
       reveals, and the garage truck's rear doors sit at -19.x, so a
       regex on the number would corrupt them;
     * fixing A forces C, because narrowing the board moves its screen
       span and the lettering has to reflow around whatever else is on
       that facade. The tailor took three passes for exactly that
       reason, and it had a clock in the way.
   So each one gets looked at when its shop comes up, and the flag is
   cleared then.
   ===================================================================== */

/* ================= WIDE UNITS, OPEN AT THE PORT =================
   `ww` on a shop is its frontage when that is NOT the default W, and
   `wTodo` says the game cannot place it yet.

   Eleven shops already carry their own width, but every one of them is
   NARROWER than W and simply sits inside its slot -- harmless. The
   Garage is the first that is WIDER, and wider is a different question
   entirely, because in the game a unit's width is not the shop's to
   choose:

     packEdgeNoGap  avgW = T2*2.2 = 202.4, per-unit jitter 0.8..1.2
                    normalised, so slots run about 162..243
     queueCommercialEdgeAt  passes that u.w INTO drawStoreUnit

   A shop drawing past its slot laps onto its neighbour -- the same
   fault as a cornice crossing a return, at building scale. So a wide
   shop needs the PACKER to hand it the room, and that is a game-side
   change: packEdgeNoGap has to be able to emit a double slot, the
   chooser has to know only wide-capable bodies may sit in one, and
   queueUnitStrips / PICKUP_SHOPS / the corner-margin inset all have to
   agree about the wider footprint.

   Why the Garage earns it. The game's car is len 150, wid 60. Two bays
   plus a pedestrian door plus corner and mullion piers do not fit in
   230 -- the arithmetic leaves 59.9 a bay, less than the car itself.
   One bay would fit, and a garage with one bay is a fine building, but
   the brief is two, so the building gets wider instead. ww = T2*4.4 is
   exactly two of the packer's own slots, so the port is a clean "this
   shop occupies two" rather than a number to reverse-engineer.

   The bench honours ww for the pavement, the guide box and the measure
   pass, and draws the single-slot boundary as a faint line so the
   overrun stays visible while this is open.
   ===================================================================== */

/* ================= SCALE REVIEW, OPEN =================
   `zTodo` on a shop is its measured height in GAME STOREYS and means
   the shop has not been sized against the game yet -- raise it when
   that shop comes up for polish.

   The measure. drawStoreUnit's wall runs 238..266, so STORE_H is 252
   game units for one shop storey, and the lab draws through ZSCALE
   1.5, which puts one shop storey at 168 LAB units. A shop's storey
   count is therefore just H/168, and it can be read straight off the
   number in the shop body.

   Why it went unnoticed. The lab's framing pass solves K per shop, so
   every shop fills the canvas whatever its height and a three storey
   building looks exactly like a one storey one. Turn on TRUE SCALE in
   the bench to see the real thing; that toggle is what surfaced this.

   What the number does NOT say. It is a measurement, not a target. A
   two storey bank wants 2, a bathhouse may genuinely be one -- what is
   wrong is that the whole tall tier was set by eye, which is how 34 of
   the 35 tall-flagged shops ended up between 0.92 and 1.87 storeys
   while drawing two, three and four storey elevations. Decide the
   target per shop against what its own facade depicts.

   WHAT H DOES NOT COVER. zTodo is H/168, and H is the WALL top -- so a
   building whose height is mostly roof reads low on it. The chapel is
   the case: its H is 300 (1.79) but its eaves course is only where the
   pitched roof starts, the gable reaches 400 and the spire 650, which
   is 3.87 and the tallest thing here. Read the number as "how tall are
   its WALLS", and look at the shop before deciding it is undersized.

   Worked example: Rooming house. It stood at H 226 = 1.35 storeys and
   drew a shopfront plus THREE ranks of windows, so every floor came out
   at 38 -- under a quarter of a storey, which is why the windows read
   as stripes. Rebuilt as a shopfront-height ground storey of 120 plus
   three residential storeys of 100 (shorter than a shop storey, the way
   they are in the world), H 420 = 2.5. Its zTodo is gone because it has
   been done.

   The frontage does NOT move with the height. W is the block's frontage
   unit and every building on a street shares it; a walk-up is tall and
   narrow, and widening one would break drawStoreUnit's packing. Only z
   changes.
   ===================================================================== */

const SHOPS = [
{
  name:'Bakery', head:'Curved gable, brick flue, bunting on the arch',
  cTodo:'1 pavement props need collision volumes',
  zs:1,                                   // already rebuilt on the game anchors
  tags:['deep gable parapet','sign on the gable','bunting on the arch','brick stack','recessed door'],
  desc:'The gable is a real parapet with 30 units of depth and a capped coping, so it stands above the roofline instead of lying on it. Bunting is pinned around the arch rather than strung across the shopfront, and the flue is brick so it no longer disappears into a roof of its own colour.',
  draw(p){
    const wall = '#e8d9bd', trim = p[0], H = STORE_H, GB = -30;
    body(wall, trim, H);

    /* ---------------- THE GABLE ----------------
       It was reading as a ribbon laid on the roof, and there were two
       reasons, both fixable without changing the shape. First it was
       only 16 deep, which at this projection is barely a lip. Second
       its receding band was shade(wall,1.10) -- LIGHTER than the front
       face -- so the eye took the band as the lit top of a flat strip
       rather than the shaded flank of a wall. Deepened to 30 and the
       band darkened below the face, and it stands up. */
    /* THE CRESCENT PROBLEM. Springing the arc directly off the wall top
       gives a shape that is thin everywhere: the chord closing it runs
       between two points at the same HEIGHT but far apart in depth, so
       under this projection it is a steeply raked line and the filled
       region between it and the curve is a sliver. A real gable end has
       solid wall under the curve. So the parapet gets a straight band
       first, and the arch springs off THAT. It also gives the sign
       somewhere to live that has wall behind it across its full width. */
    const N = 14, base = H + 40;
    F(0,W,H,base, shade(wall,.66), null,0, GB);          // band, back face
    T(0,W,GB,0,base, shade(wall,.80));                    // band, top
    /* THE MISSING FACE. The band was built as three quads -- back, top,
       front -- with no return at a = W, so the right-hand end was open
       and you looked straight through the parapet onto the roof plate.
       The left end at a = 0 faces away and is correctly absent. */
    S(W, GB, 0, H, base, shade(wall,.70));                // band, right return
    F(0,W,H,base, wall);                                  // band, front
    ctx.strokeStyle = shade(wall,.55); ctx.lineWidth = 1.2;
    poly([P(0,0,base),P(W,0,base),P(W,0,H),P(0,0,H)], null, shade(wall,.58), 1.2);
    const arcPt = (t,bb) => {
      const u = 1-t, a = u*u*(W*0.14) + 2*u*t*(W*0.5) + t*t*(W*0.86);
      const z = u*u*base + 2*u*t*(base+92) + t*t*base;
      return P(a,bb,z);
    };
    const gArc = (bb) => {
      ctx.beginPath();
      const c0 = P(W*0.14,bb,base), c1 = P(W*0.86,bb,base), ap = P(W*0.5,bb,base+92);
      ctx.moveTo(c0.x,c0.y); ctx.quadraticCurveTo(ap.x, ap.y, c1.x, c1.y);
      ctx.closePath();
    };
    /* the back arc was filled darker than the flank quads in front of
       it, so its far edge showed as a thin dark line arcing away over
       the roof. Same value as the flank and the two merge into one
       solid parapet. */
    gArc(GB); ctx.fillStyle = shade(wall,.80); ctx.fill();      // back face
    for(let i=0;i<N;i++)                                         // receding flank
      poly([arcPt(i/N,0),arcPt((i+1)/N,0),arcPt((i+1)/N,GB),arcPt(i/N,GB)], shade(wall,.80));
    /* TYMPANUM VALUE. Filled in `wall` it was the same cream as the band
       below it and the facade below that, so the only thing separating
       the gable from the rest of the elevation was a 2.5px stroke -- an
       outline, which is exactly how it read. Its own value, a coping in
       trim, and an oculus give it a face of its own. */
    gArc(0); ctx.fillStyle = shade(wall,.93); ctx.fill();
    ctx.save(); gArc(0); ctx.clip();
    ctx.lineWidth = 14; ctx.strokeStyle = trim; ctx.beginPath();
    let cq = arcPt(0,0); ctx.moveTo(cq.x,cq.y);
    for(let k=1;k<=N;k++){ cq = arcPt(k/N,0); ctx.lineTo(cq.x,cq.y); }
    ctx.stroke(); ctx.restore();
    ctx.strokeStyle = shade(trim,.7); ctx.lineWidth = 2; gArc(0); ctx.stroke();
    faceCircle(W*0.5, -0.6, base+44, 17, shade(wall,.62));
    faceCircle(W*0.5, -0.8, base+44, 13, 'rgba(104,146,168,.92)', shade(trim,.8), 2.5);
    /* ---------------- SIGN ----------------
       Was a slab hung at b -1..-7, i.e. floating BEHIND the gable face
       with nothing carrying it. Now it spans the gable plane (+3 to -3)
       so it is mounted flat on the parapet, and it sits low enough on
       the arch to have wall behind it across its whole width. */
    slab(W*0.20, W*0.80, H+6, H+34, 3, -3, trim);
    F(W*0.23, W*0.77, H+11, H+29, '#f2e6cc', null, 0, 3.4);
    for(let i=0;i<6;i++) F(W*0.26+i*W*0.08, W*0.30+i*W*0.08, H+15, H+25, shade(trim,.72), null,0,3.6);

    /* ---------------- BUNTING ----------------
       It used to swing out to b = +22 -- out over the pavement, in
       front of the glass and across the door, which is why the shopfront
       read as having strings hung over it. Bunting belongs to the gable:
       pinned just inside the arch, flags hanging into the parapet face,
       never crossing the window. */
    if(state.props){
      /* THE STRAY LINE, and it was this. The string offset itself by
         P(0,bb,drop) - P(0,bb,0), but raising z moves a point UP the
         screen -- so the string was drawn 15 units ABOVE the arch while
         the flags hung 15 below it. They were never attached to each
         other; the "stray line" was a bunting string with no bunting on
         it. Both derive z from one function now.

         And it has come down off the arch. Pinned around the parapet it
         was competing with the coping and the oculus for the same band
         of the elevation; strung just above the window it does the job
         bunting actually does, which is to mark the shopfront. The sag
         is tuned so the flag tips clear the arched window head -- the
         head tops out at gz1 + 38 and the lowest tip lands a little
         above it. */
      const bb = 1.5, a0b = 8, a1b = W - 8, zTop = H - 16, sag = 8, flag = 12;
      const bZ = (t) => zTop - Math.sin(Math.PI*t)*sag;
      ctx.strokeStyle = '#7a5c44'; ctx.lineWidth = 2; ctx.beginPath();
      for(let i=0;i<=28;i++){
        const t = i/28, pt = P(a0b + (a1b-a0b)*t, bb, bZ(t));
        i ? ctx.lineTo(pt.x,pt.y) : ctx.moveTo(pt.x,pt.y);
      }
      ctx.stroke();
      for(let i=0;i<11;i++){
        const t = (i+0.5)/11, a = a0b + (a1b-a0b)*t, z = bZ(t);
        poly([P(a-7,bb,z),P(a+7,bb,z),P(a,bb,z-flag)], [p[1],'#f2e6cc',p[2]][i%3]);
      }
    }

    /* ---------------- THE WINDOW, back to front ---------------- */
    /* window: sill on the kick, head at the game's window line
       (dZ1 + 14), and it stops short of the door rather than being a
       fixed fraction of W -- the door owns its end of the frontage. */
    const dW = SHOP_DOOR_W, dH = SHOP_DOOR_H;
    const dx1 = W - 9, dx0 = dx1 - dW;
    const gz0 = 22, gz1 = SHOP_DOOR_H + 14, ax0 = 14, ax1 = dx0 - 14;
    /* the reveal ran 30 units above the pane, so a brown rectangle sat
       between the glass head and the arch. It stops at the glass now --
       the arched head fills that band itself. */
    /* reveal() hardcodes b = +2, which is toward the street, so the dark
       backing sat a touch PROUD of the pane and showed as a dark sliver
       down the left jamb. Drawn directly here so it can sit behind. */
    F(ax0, ax1, gz0, gz1+2, '#4a3a2a', null, 0, -1.2);
    /* the shelf was at b = +6..+20 -- outside the glass, out over the
       pavement, which is the cream bar that was cutting across the
       window and hanging off the left jamb. Inside the shop now, under
       the loaves that stand on it. */
    slab(ax0+14, ax1-30, gz1-74, gz1-64, -4, -16, shade(wall,1.05));
    /* THEY WERE OUTSIDE. The loaves sat at b = +8..+18, and positive b
       is toward the street, which under this projection also shifts them
       LEFT on screen -- far enough that the first one cleared the window
       jamb entirely and appeared to be sitting on the pavement. Negative
       b puts them back in the shop, behind the pane where they belong. */
    depthSort([0,1,2,3,4].map(i => ({
      a: 34+i*19, b: -7 - (i%2)*7, z: 0,
      draw: () => cyl(34+i*19, -7 - (i%2)*7, gz1-64, gz1-42, 9, i%2 ? '#c98a4a' : '#b87a3c')
    })));
    const aPt = (t,bb) => {
      const u=1-t, a = u*u*ax0 + 2*u*t*((ax0+ax1)/2) + t*t*ax1;
      const z = u*u*gz1 + 2*u*t*(gz1+38) + t*t*gz1;
      return P(a,bb,z);
    };
    glaze(ax0, ax1, gz0, gz1, null);
    ctx.beginPath();
    let q = aPt(0,-0.4); ctx.moveTo(q.x,q.y);
    for(let i=1;i<=N;i++){ q = aPt(i/N,-0.4); ctx.lineTo(q.x,q.y); }
    /* the arched head was filled paler than the pane below it, so it
       floated free of the window as a hoop. Same tint as glaze, so head
       and pane are one opening. */
    ctx.closePath(); ctx.fillStyle='rgba(104,146,168,.92)'; ctx.fill();
    for(let i=0;i<N;i++)
      poly([aPt(i/N,0),aPt((i+1)/N,0),aPt((i+1)/N,-9),aPt(i/N,-9)], shade(wall,.88));
    slab(ax0-4, ax1+4, gz0-4, gz0+2, -1, -9, shade(wall,.9));

    /* ---------------- THE DOOR ----------------
       Was a blank slab with a small rectangle of tint on it, which is
       why door and second window were indistinguishable. Built properly
       now: surround, dark opening, leaf with two raised panels, glazed
       transom over, handle, and a step onto the pavement. */
    /* NO VOLUME. Every version of this door had a slab somewhere -- a
       surround with a return, then a shallower one -- and a slab is a
       box, so it always put a second little building beside the door.
       A shopfront door is a hole in a wall. Everything below is on the
       frontage plane within a unit and a half of it, so nothing has a
       side face to cast onto the flank. */
    shopDoor((dx0+dx1)/2, wall, trim);
    if(state.props) box(dx0-6, dx1+6, 2, 20, 0, 9, '#c3c8be','#adb2a4','#999e91');

    /* ---------------- ROOF ----------------
       The flue was shade(trim,1.05) -- the EXACT colour body() paints
       the roof plate, so its fill vanished and only the outline read,
       which is why it looked transparent. It is brick now, and the
       generic grey air-handler is gone: a bakery gets a brick stack and
       an extract cowl, both of which say what the building is. */
    if(state.roof){
      const brick = '#a8674e';
      /* the stack used to sit at W*0.10 and collided with the gable
         apex from behind. Pushed right and deeper, with the extract
         cowl taking the shallow left position, so the two roof objects
         read as two objects instead of one cluster over the arch. */
      box(W*0.58,W*0.80,-176,-124, H, H+58, shade(brick,1.12), brick, shade(brick,.82));
      slab(W*0.56,W*0.82, H+58, H+66, -122, -178, shade(brick,.74));
      for(let k=0;k<2;k++) cyl(W*0.62+k*W*0.13, -150, H+66, H+80, 5.5, '#4a3a30');
      cyl(W*0.30, -158, H, H+40, 9, '#8d949b');
      cyl(W*0.30, -158, H+40, H+47, 15, '#767d84');
      cyl(W*0.30, -158, H+47, H+52, 8, '#616870');
    }
    kerb(p, 'none');
  }
},
{
  name:'Laundromat', head:'Glass box, porthole drums, roof tank',
  tags:['machines inside','porthole drums','neon pylon','round water tank','bench'],
  desc:'The machines are a bank of boxes standing on the shop floor with the drums set into their fronts, and the whole frontage glazes over them, so the row reads as being inside the room.',
  draw(p){
    const wall = '#dfe6ea', trim = '#2e4d68', H = 158;
    body(wall, trim, H);
    slab(0,W, H, H+12, -1, -10, trim);
    /* FLUSH. A laundromat is a glass box -- the shopfront is a curtain
       wall set in the plane of the facade, not a window punched into
       masonry with a jamb around it. This was asking for a 13-unit
       recess, which gave the frontage a volume it should not have. Two
       units is enough for the pane to have something dark to be dark
       against, and reads flush with the face of the building. */
    reveal(8, W-8, 14, H-22, 2, '#4e6270');
    // the machines, as solids standing inside
    /* the drums, on the glass line and nothing more */
    for(let i=0;i<5;i++){
      const cx = 24+(W-48)*i/4;
      faceCircle(cx, 1.4, 58, 13, '#b9c8d0', shade(trim,1.4), 2.5);
      faceCircle(cx, 1.0, 58, 8, '#7fa8bc');
    }
    glaze(8, W-8, 14, H-22, null);
    for(let i=0;i<4;i++) F(8+(W-16)*(i+1)/5-2, 8+(W-16)*(i+1)/5+2, 14, H-22, shade(wall,.72), null,0,-1);
    /* THE LEDGE WAS HANGING OFF THE CORNER, and the reason is the sign
       of its depth. It ran b -1..-9 -- recessed INTO the wall -- and
       screen x is (a - b), so going negative pushes a piece RIGHT. Its
       far top edge landed at 226 + 9 = 235 against a building corner at
       230, so five units of lintel projected past the front face and sat
       on the flank.

       A ledge over a window projects OUT over the pavement, not back
       into the masonry. At b +8..0 it reads as the drip mould it is, and
       the arithmetic can no longer fail: positive b moves a piece LEFT,
       so a lintel that ends at a1 can never cross the corner however far
       it projects. */
    slab(4, W-4, H-26, H-20, 8, 0, shade(wall,.8));
    shopDoor(W*0.51, wall, trim);
    slab(W*0.06,W*0.24, H+8, H+96, -2, -20, '#1d2833');
    F(W*0.085,W*0.215, H+16, H+88, p[2], null,0,-2.5);
    for(let i=0;i<4;i++) F(W*0.10,W*0.20, H+22+i*17, H+30+i*17, '#f4f8fa', null,0,-3);
    if(state.roof){
      const ta = W*0.60, tb = -110;
      for(const [la,lb] of [[ta-30,tb+28],[ta+30,tb+28],[ta-30,tb-28],[ta+30,tb-28]])
        cyl(la, lb, H, H+34, 4, '#6d747c');
      cyl(ta, tb, H+34, H+92, 42, '#8b6a4e');
      for(let i=0;i<3;i++) plateHoop(ta, tb, H+48+i*20, 43, '#6a5039', 2.5);
      plateCircle(ta, tb, H+92, 42, '#a07f60', '#7a5c44', 2);
      cyl(ta, tb, H+92, H+100, 10, '#7a5c44');
      /* IT WAS SITTING IN THE PYLON. The vent ran a = W*0.08..W*0.30 at
         b = -60..-30, and the pylon occupies W*0.06..W*0.24 -- the same
         strip of frontage, a few units apart in depth, so the box read
         as growing out of the sign's base.

         WORLD SEPARATION IS NOT SCREEN SEPARATION. The first move put it
         back-left at b -200..-165, which is nowhere near the tank in
         world space and directly behind it on screen -- x is (a - b), so
         going deeper moves a prop RIGHT, straight into the tank's span.
         Solved on x instead: pylon holds 16..75, tank holds 164..332,
         and the vent now takes 356..430, so the roof reads as three
         separate masses left to right with clear air between them. */
      box(W*0.70,W*0.89,-225,-195,H,H+16,'#aab1b8','#8f979e','#7d858c');
    }
    kerb(p,'none');
  }
},
{
  name:'Barber', head:'Narrow bay, turning pole, gold lettering',
  fTodo:'z168..192 return +12; z122..152 lettering behind board',
  tags:['chairs inside','cylindrical pole','swept awning','gold fascia','deep green'],
  desc:'A barber chair stands in the reveal behind the glass with a mirror on the back wall, so the bay has something to look into instead of being a flat pane of blue.',
  draw(p){
    const wall = '#20402f', trim = '#c8a24a', H = 176;
    body(wall, trim, H);
    slab(0,W, H-8, H+16, -1, -12, shade(wall,1.25));
    slab(0,W, H+16, H+22, -1, -12, trim);
    reveal(10, W*0.52, 18, 116, 13, '#14301f');
    F(16, W*0.46, 22, 44, shade(wall,.75), null,0, 1.6);          // a band low in the bay
    glaze(10, W*0.52, 18, 116, null);
    slab(6, W*0.52+4, 112, 120, -1, -9, trim);
    shopDoor(W*0.72, wall, trim);
    /* THE RECESS IS WHAT PUT IT OVER THE CORNER. This ran a = 6..W-6 at
       b = -1..-9, which looks inboard until the projection is worked
       out: screen x moves -1 per unit of a and +1 per unit of b, so a
       piece pushed 9 units INTO the wall lands 9 units nearer the a = 0
       corner -- and its a = W-6 end came out at x 570 against a corner
       at 573, three pixels PAST the return. A fascia cannot overhang the
       building it is screwed to.
       So the inset is sized against the recess rather than guessed: 22
       units at the far end absorbs the 9 and leaves 13 of green pier
       showing on the pier side, which is the margin the shop is dialled
       to. The lettering keeps its 10-unit margin inside the panel.

       THE AWNING END IS NOT A MARGIN, IT IS A JOINT. The other end has
       nothing to be inset from -- it meets the awning -- so it is
       solved to land ON the awning's top corner rather than near it.
       That corner is P(8, 0, 120) and the panel's front face lies at
       b = -1, and screen x moves -1 per unit of a and +1 per unit of b,
       so the two share a screen x when a0 + 1 = 8. Hence 7, not 8: the
       one-unit recess of the fascia face is exactly the correction, and
       reading 8 off the awning would have left the joint a pixel open.

       AND THE DEPTH IS NOT FREE, because b flips sign with the edge.
       a0 = 7 with the old -9 back plane is clean on edges 1 and 3 and
       two units OVER the return on edge 2, where a mirrors and the
       recess drifts the other way -- the slab's gold top face wrapped
       the corner and sat on the flank. bFront is spoken for by the
       joint, so the depth is the only variable left: at -4 the back
       plane clears the return by 2.9 on the mirrored edge and the
       fascia still reads as recessed, because the lettering behind it
       is the deeper plane. The lettering follows to -4.5 to stay just
       behind the panel's back rather than through it. */
    slab(7,W-22, 122, 152, -1, -4, '#12261c', null, trim);
    F(17,W-32, 130, 144, trim, null,0,-4.5);
    poly([P(8,0,120),P(W*0.54,0,120),P(W*0.54,26,96),P(8,26,96)], shade(trim,.55));
    for(let i=0;i<5;i++)
      poly([P(8+(W*0.46)*i/5,0,120),P(8+(W*0.46)*(i+0.5)/5,0,120),
            P(8+(W*0.46)*(i+0.5)/5,26,96),P(8+(W*0.46)*i/5,26,96)], '#f2ece0');
    poly([P(8,26,96),P(W*0.54,26,96),P(W*0.54,26,86),P(8,26,86)], shade(trim,.42));
    poly([P(W*0.54,0,120),P(W*0.54,26,96),P(W*0.54,26,86),P(W*0.54,0,110)], shade(wall,.6));
    if(state.props){
      /* WRONG PIER, AND SIZED OFF NOTHING. The pole stood at a = 125.35,
         which is the 9-unit slot between the window reveal (ends 119.6)
         and the door surround (starts 128.5) -- so it read as jammed in
         the reveal's jamb rather than mounted on a pier, and it covered
         the near edge of the glass it was standing in front of.
         The door surround runs a = 128.5..202.7 and the wall ends at
         230, so the far pier is 27.3 wide and is the only piece of blank
         frontage on the shop. Centred there at 216 the pole clears the
         surround by 8.3 and the return by 8.3.

         HEIGHT MEASURED AGAINST THE DOOR, not chosen. It ran z 15..109
         against a door head at 108 -- a pole as tall as the doorway,
         about 2.3m of it. A real one is roughly a third of that and
         hangs with its finial at head height, so the body is 62..108 and
         the finial tops out at 118, level with the fascia. Radius comes
         down 6 -> 5, which is 15% of the 66-unit door leaf and matches
         a real 15cm pole against a 90cm door.

         b GOES POSITIVE. It was -9, i.e. nine units INSIDE the wall --
         invisible in the lab because paint order carried it, but a prop
         behind its own frontage is the fault that bites inside
         queueUnitStrips. At b = 4 with r = 5 the back of the drum sits
         a unit into the render and the rest stands proud, which is what
         a bracketed pole does. */
      const pa = 216, pb = 4, pr = 5;
      cyl(pa, pb, 62, 108, pr, '#f4f2ee');
      for(let i=0;i<4;i++){
        const z = 64 + i*10;
        for(let k=0;k<6;k++){
          const t0 = 3*Math.PI/4 - Math.PI*k/6, t1 = 3*Math.PI/4 - Math.PI*(k+1)/6;
          poly([P(pa+pr*Math.cos(t0), pb+pr*Math.sin(t0), z + k*1.2),
                P(pa+pr*Math.cos(t1), pb+pr*Math.sin(t1), z + (k+1)*1.2),
                P(pa+pr*Math.cos(t1), pb+pr*Math.sin(t1), z + (k+1)*1.2 + 4.5),
                P(pa+pr*Math.cos(t0), pb+pr*Math.sin(t0), z + k*1.2 + 4.5)],
               i%2 ? '#2e5fa3' : '#c2452e');
        }
      }
      cyl(pa, pb, 108, 114, pr+2, '#b9bcc0');
      cyl(pa, pb, 56, 62, pr+2, '#b9bcc0');
      ball(pa, pb, 118, pr, '#b9bcc0');
    }
    if(state.roof){
      box(W*0.20,W*0.44,-120,-80,H,H+26,'#8f969d','#787f86','#697077');
      cyl(W*0.62, -100, H, H+40, 5, '#6d747c');
    }
    kerb(p,'none');
  }
},
{
  name:'Grocer', head:'Open front, striped canopy, crate steps',
  cTodo:'8 pavement props need collision volumes',
  tags:['open frontage','striped canopy','crate display'],
  desc:'No glass at all here, so the layering is in the depth: the crates stand side by side on the pavement and are painted far to near, with the counter jars behind them and the canopy over both.',
  draw(p){
    const wall = '#b8552f', trim = '#f0e4c8', H = 150;
    body(wall, trim, H);
    /* A FULL-WIDTH BAND AT A NEGATIVE b ALWAYS CROSSES. This ran
       a = 0..W at b = -1..-10; screen x moves -1 per unit of a and +1
       per b, so the recess slides it 10 units sideways with no margin
       to absorb it, and it came out 9.8 past the return -- a nub of
       cornice hanging on the flank. 18 clears it by 7.7. */
    slab(18,W-18, H, H+12, -1, -10, shade(wall,.65));
    /* THE OPENING RAN INTO THE DOORWAY -- the last of this shop's four
       faults, and the same one the noodle bar named. The reveal and its
       shelf both ended at W*0.78 = 179.4 while the door's painted
       surround starts at 154.76, so 24.64 units of open frontage sat
       inside the doorway with no pier between them: the shelf ran on
       behind the door leaf and the recess back plate showed through the
       surround's own edge.
       The door cannot move. shopDoor was asked for a-mid W*0.88 = 202.4
       and clamped to 191.88, so it is already as far toward the corner
       as the kit allows. So the opening is what gives way: 179.4 -> 150
       leaves a 4.76 pier, matching the 4.8 the noodle bar settled on. */
    reveal(12, 150, 0, 112, 42, '#3a2a22');
    slab(12, 150, 58, 74, 24, 8, '#c9b48e', shade(wall,.75), '#d8c49a');
    /* THE RAGGEDNESS WAS THE ALTERNATING b. Six jars ran at
       b = 18/10/18/10..., so they sat in two staggered rows on one
       shelf -- even spacing in a, but the stagger threw the gaps out
       and the row read as spilled rather than set out. And the run
       a = 24..174 was laid against nothing: the last jar spanned
       163..185, standing over a door surround that starts at 154.8,
       and the first spanned 13..35, poking past the canopy's near end
       at 20.
       So the row is now laid against the two edges it has to respect.
       Five jars at one b of 16: the first centre of 32 puts its near
       face on 21, just inside the canopy, and the step carries the last
       one to the far end of the shelf. Equal gaps are what make a row
       read as arranged rather than spilled. b + r is 27, still inside
       the canopy's 30.
       The step was 28, which put the last far face on 155 -- fine
       against the old 179.4 shelf, but the shelf now stops at 150, so
       that jar would have stood half off the end of it. 26 lands the
       last centre on 136 and its far face on 147, three units clear of
       the shelf end, with the gaps still equal at 4. */
    depthSort([0,1,2,3,4].map(i => ({
      a: 32+i*26, b: 16, z: 0,
      draw: () => cyl(32+i*26, 16, 74, 92, 11, ['#c2452e','#d8a12a','#5c8a3a'][i%3])
    })));
    shopDoor(W*0.88, wall, trim);
    /* THE CANOPY WAS REACHING ONTO THE NEIGHBOUR. out was 46, near
       double the Barber awning's 26, and the run started at a = 4. A
       projection moves screen x by +1 per unit of b, so the a = 4 end
       landed 41.4 units past the return -- and with the bench gap at 46
       that is the whole gap, so the canopy sat on the next shop's
       facade. (The other end measures 49.2 INBOARD; only one end of a
       full-width canopy can cross, and it is not the one it looks like.)
       out 46 -> 30 and the run pulled to 20, which leaves 10.4 over the
       return instead of 41.4. It cannot reach zero: a canopy that
       projects at all must show outside the silhouette in isometric,
       which is perspective rather than a fault. What was a fault was
       reaching far enough to cover somebody else's shop. */
    const cz0 = 118, cz1 = 138, out = 30, cA = 20, cB = W-20;
    for(let i=0;i<8;i++){
      const x0 = cA+(cB-cA)*i/8, x1 = cA+(cB-cA)*(i+1)/8;
      poly([P(x0,0,cz1),P(x1,0,cz1),P(x1,out,cz0),P(x0,out,cz0)], i%2?'#f2ece0':trim);
    }
    poly([P(cA,out,cz0),P(cB,out,cz0),P(cB,out,cz0-12),P(cA,out,cz0-12)], shade(wall,.8));
    poly([P(cA,0,cz1-6),P(cA,out,cz0-12),P(cA,out,cz0),P(cA,0,cz1)], shade(wall,.62));
    poly([P(cB,0,cz1-6),P(cB,out,cz0-12),P(cB,out,cz0),P(cB,0,cz1)], shade(wall,.62));
    /* Same fault one band down, and this is the one that shows: at
       b = -8 over a = 0..W it stood 7.9 past the return, right at the
       canopy's shoulder. 16 clears it by 7.7. */
    slab(16,W-16, cz1, cz1+5, -1, -8, shade(wall,.6));
    if(state.props){
      /* NOT A STAIRCASE ANY MORE. The two crates ran to different
         heights (z 0..26 and 0..20) at different depths (b 10..44 and
         16..54), which read as a stepped display rather than two crates
         put down on the pavement -- and the deeper one projected 54,
         well past even the old canopy. Both now share one height and
         one depth and stand side by side, so the row is flat and sits
         under the canopy at b 8..30 instead of out in the road. */
      depthSort([
        { a: 41, b: 30, z: 0, draw: () => {
            box(14,68, 8,30, 0,22, '#c98a4a','#a9703a','#8f5e31');
            for(let i=0;i<3;i++) cyl(26+i*17, 19, 22, 34, 7, ['#c2452e','#5c8a3a','#d8a12a'][i]); } },
        { a: 103, b: 30, z: 0, draw: () => {
            box(76,130, 8,30, 0,22, '#c98a4a','#a9703a','#8f5e31');
            for(let i=0;i<3;i++) cyl(88+i*17, 19, 22, 34, 7, ['#d8a12a','#c2452e','#e0c24a'][i]); } }
      ]);
      /* hanging scales removed at Sir's direction. */
    }
    if(state.roof) box(W*0.30,W*0.62,-140,-90,H,H+20,'#9aa0a6','#7d838a','#6a7076');
    kerb(p,'none');
  }
},
{
  name:'Dispensary', head:'Stepped parapet, cross emblem, green livery',
  cTodo:'2 pavement props need collision volumes, 1 of them lapping past the frontage',
  tags:['counter behind glass','solid cross emblem','green fascia','clinical white','planters'],
  desc:'A counter and a wall of shelved bottles sit inside the reveal with the pane over them, so the shop has depth behind the window rather than a flat tinted sheet.',
  draw(p){ drawChemist(p, CHEMIST_LIVERY.green); }
},
{
  name:'Pharmacy', head:'Stepped parapet, cross emblem, red livery',
  cTodo:'2 pavement props need collision volumes, 1 of them lapping past the frontage',
  tags:['counter behind glass','solid cross emblem','red fascia','clinical white','planters'],
  desc:'A counter and a wall of shelved bottles sit inside the reveal with the pane over them, so the shop has depth behind the window rather than a flat tinted sheet.',
  draw(p){ drawChemist(p, CHEMIST_LIVERY.red); }
},
{
  name:'Record shop', head:'Blacked-out front, marquee, poster wall',
  tags:['racks inside','angled marquee','poster grid','bulb row on the fascia'],
  desc:'Record racks stand in the window with sleeves in them, behind a dark tinted pane, so the blackness has something in it rather than being a hole.',
  draw(p){
    const wall = '#22222a', trim = '#e0483c', H = 164;
    body(wall, trim, H);
    slab(0,W, H, H+14, -1, -10, shade(wall,1.5));
    reveal(12, W*0.56, 18, 112, 13, '#101018');
    for(let i=0;i<3;i++)                                           // sleeves on the glass line
      F(20+i*30, 42+i*30, 34, 90, ['#e0483c','#e8c34a','#4aa3e0'][i], null,0, 1.6);
    glaze(12, W*0.56, 18, 112, null, 'rgba(60,72,86,.42)');
    slab(8, W*0.56+4, 108, 116, -1, -9, shade(wall,1.6));
    shopDoor(W*0.73, shade(wall,1.4), shade(wall,1.9), 'rgba(60,72,86,.55)');
    for(let r=0;r<3;r++) for(let c=0;c<2;c++)
      slab(W*0.885+c*0.05*W, W*0.925+c*0.05*W, 30+r*30, 54+r*30, -1, -4,
           ['#e8c34a','#4aa3e0','#e0483c','#f2ece0'][(r+c)%4]);
    const m0 = 4, m1 = W-4, out = 40;
    poly([P(m0,0,120),P(m1,0,120),P(m1,out,150),P(m0,out,150)], trim);
    poly([P(m0,out,150),P(m1,out,150),P(m1,out,134),P(m0,out,134)], shade(trim,.72));
    poly([P(m0,0,106),P(m1,0,106),P(m1,out,134),P(m0,out,134)], shade(wall,1.25));
    poly([P(m0,0,120),P(m0,out,150),P(m0,out,134),P(m0,0,106)], shade(trim,.55));
    poly([P(m1,0,120),P(m1,out,150),P(m1,out,134),P(m1,0,106)], shade(trim,.55));
    /* THE BULBS WERE NOT ON ANYTHING. They sat at b 37, z 133 -- three
       units inboard of the marquee's front lip and one below its
       underside, so they hung in the air in front of the fascia with
       nothing behind them, and they ran a 14..W-14 against a fascia that
       runs 4..W-4, so the row was inset from the thing it belonged to as
       well as floating off it.

       The fascia is the quad at b = out, z 134..150. The row goes ON it:
       centred on z 142, at b out+1 so each bulb is proud by a quarter of
       its own diameter and reads as fixed to the face rather than
       hovering near it, and spanning the fascia's own m0..m1 so the run
       ends where the board ends. Nine at that span sits the gaps at
       about two bulb widths; seven over the wider run would have read as
       sparse. */
    for(let i=0;i<9;i++) ball(m0+(m1-m0)*(i+0.5)/9, out+1, 142, 4, '#ffe9a8');
    slab(20,W-20, H-40, H-14, -1, -8, '#f2ece0');
    /* A-board removed at Sir's direction: it stood on the pavement at
       b 26..54, further into the street than the marquee reaches. */
    if(state.roof){
      box(W*0.50,W*0.78,-150,-100,H,H+24,'#8f969d','#787f86','#697077');
      tube(W*0.24,-90,H+14, W*0.24,-90,H+70, 2, '#6d747c');
    }
    kerb(p,'none');
  }
},
{
  name:'Noodle bar', head:'Vertical banners, lantern row, counter',
  cTodo:'6 pavement props need collision volumes',
  tags:['stools under the counter','round lanterns','open counter','steam duct','banners'],
  desc:'The counter is a solid with a bar top, the cook side is set back behind it, and the stools stand on the pavement in front — so the three depths read in the right order.',
  draw(p){
    const wall = '#8f2320', trim = '#f2d98c', H = 160;
    body(wall, trim, H);
    slab(0,W, H, H+12, -1, -10, shade(wall,.6));
    slab(0,W, H+12, H+18, -1, -10, trim);
    /* THE COUNTER RAN INTO THE DOORWAY. It ended at W*0.70 = 161 while
       the door surround starts at 154.76, so 6.24 units of counter sat
       inside the opening with no pier between them -- the same fault
       still open on the grocer. shopDoor had also been asked for a-mid
       W*0.85 = 195.5 and silently clamped to 191.88, which is what left
       the door hard against the corner with 1 unit of return; the
       counter is what moves, since the door is already as far over as
       the clamp allows. 150 leaves a 4.8 pier. */
    reveal(14, 150, 0, 96, 44, '#2a1a18');
    slab(14, 150, 58, 72, 22, 4, '#d9c49a', shade(wall,.6), '#e6d2a8');
    shopDoor(W*0.85, wall, shade(wall,.7), 'rgba(232,217,189,.6)');
    /* THE BANNERS. Two faults. The right one ran z 84..154 across a 188.8
       to 206.8, which is inside the door surround for its whole width and
       below the 114.9 head for a third of its height -- it was painted
       over the door. And the left one sat at a-margin 4.8 against a
       12-deep recess, so it came out 8.2px past the return: Rule 1, a
       recessed element cannot show outside the silhouette.

       Both are answered by the same move. They go on the wall ABOVE the
       door head rather than beside the door, at 26 and W-26 so the two
       carry the same 5 units of pier at their own depth. 51 world tall by
       18 wide still reads as a banner at 2.8:1. */
    for(const [x,col] of [[26,trim],[W-26,'#f2ece0']]){
      slab(x-9,x+9, 120, H-6, -2, -12, col, shade(col,.7));
      for(let i=0;i<3;i++) F(x-5,x+5, 124+i*11, 130+i*11, shade(wall,.8), null,0,-2.5);
    }
    /* THE LANTERNS HUNG FROM NOTHING. Each cord ran from z 126 down to
       112 at b 16, and there is no geometry at b 16, z 126 -- the wall is
       at b 0 and the fascia starts at H. So four cords rose out of the
       lanterns and stopped in mid-air over the pavement. The cord also
       ran to 112, the body's top, passing straight through the finial
       that caps it at 115.

       A rail is what they hang from: two brackets cantilevered off the
       wall at b 0..20, and a tube between them at b 18. The lanterns move
       out to b 18 so the cords are vertical rather than raked, and each
       cord now runs rail to finial-top, 128 down to 115. The row is
       respaced to sit within the rail with equal end margins instead of
       running past it. */
    const rb0 = 40, rb1 = 136, rby = 18;
    box(rb0, rb0+6, 0, 20, 124, 132, shade(wall,.9), shade(wall,.75), shade(wall,.6));
    box(rb1-6, rb1, 0, 20, 124, 132, shade(wall,.9), shade(wall,.75), shade(wall,.6));
    tube(rb0+3, rby, 128, rb1-3, rby, 128, 1.2, '#5a4636');
    for(let i=0;i<4;i++){
      const la = rb0+3 + ((rb1-3)-(rb0+3))*(i+0.5)/4, lb = rby;
      tube(la, lb, 128, la, lb, 115, 0.8, '#5a4636');
      /* THE FINIAL'S LID WAS PAINTED ON THE LANTERN. cyl() caps at z1 and
         only at z1, which is right -- the lid of a drum is its top and we
         look down on it. But the bottom finial runs 92..96, so ITS top is
         at 96, which is inside the body that starts there. Drawn after the
         body, that buried cap came out as a yellow disc across the lower
         third of the red. Same for the 96 underside plate: a lantern's
         base is not visible from above and it was painting over the front.

         Order fixes it, not geometry. Anything whose cap is buried must be
         drawn BEFORE the thing that buries it, so the two pieces that meet
         the body at 96 go first and the body covers them. What is left of
         the finial below 96 is its stem, which is what should show. The
         top finial keeps its lid and stays last, because at 112..115 its
         cap is the one surface up there that is genuinely seen. */
      cyl(la, lb, 92, 96, 5, trim);
      plateCircle(la, lb, 96, 8, '#c0392f');
      cyl(la, lb, 96, 112, 11, '#e2564a', '#ef6a5c');
      cyl(la, lb, 112, 115, 5, trim);
    }
    if(state.props){
      depthSort([0,1,2].map(i => ({
        a: 30+i*40, b: 26, z: 0,
        draw: () => { cyl(30+i*40, 26, 0, 30, 4, '#7d838a'); cyl(30+i*40, 26, 30, 36, 11, '#c9903a'); }
      })));
    }
    if(state.roof){
      box(W*0.24,W*0.52,-130,-84,H,H+30,'#9aa0a6','#7d838a','#6a7076');
      cyl(W*0.64, -110, H, H+44, 8, '#b0b6bc');
      cyl(W*0.64, -110, H+44, H+52, 11, '#c3c8cc');
    }
    kerb(p,'none');
  }
},
{
  name:'Hardware', head:'Tall board sign, ladder rack, roll shutter',
  cTodo:'5 pavement props need collision volumes',
  tags:['goods behind the shutter','ladder rack','roll shutter','stacked stock'],
  desc:'The shutter is half up with the shop visible under it, so there is a lit interior behind the opening, and the stock outside is stacked far to near.',
  draw(p){
    const wall = '#c9962f', trim = '#3a3327', H = 180;
    body(wall, trim, H);
    /* ================= THE SIGN, REBUILT AS ONE ASSEMBLY =================
       The last pass only pulled the two bands off the return. That fixed
       the overrun and left everything else about the sign wrong, because
       the three pieces had never been dimensioned against each other:

         * The stripes sat at b -10.5. The board's front face is at -3
           and its BACK is at -11, so the stripes were painted behind the
           board entirely and survived only because the canvas paints in
           call order. Under a depth key they vanish inside it.
         * The top stripe ran z 166..178 against a board that ended at
           170, so eight of its twelve units hung above the board in open
           air, showing over the bare wall.
         * The board bottom was 110 and the door surround's head is
           114.95, so the board ran a full five units THROUGH the top of
           the doorway.
         * Cap and board had different margins (18 vs 16) and different
           depths (12 vs 10), so their end returns landed two units
           apart -- a stepped seam at the corner rather than one object.

       Rebuilt as a hierarchy that steps inward as it comes forward, so
       the pieces read as cap, board, lettering rather than three bands
       that happen to overlap:

         cap     a 18..212   b -1..-13   widest, deepest, sits on H
         board   a 22..208   b -3..-11   inset 4, so the cap overhangs it
         stripes a 28..202   b -2.5      inset 6, and PROUD of the board

       Every gap in it is 6: six of wall between board top and cap, six
       above and below the stripe run, six between stripes, six of board
       showing each side of them. The board now starts at z 120, which
       clears the door head by 5, and the cap's return at a 212, b -13
       lands on screen-a 225 against a 230 return. */
    const sA0 = 18, sA1 = W-18;
    slab(sA0, sA1, H, H+10, -1, -13, trim);                        // parapet cap
    slab(sA0+4, sA1-4, 120, 174, -3, -11,
         shade(wall,1.12), null, shade(wall,.9));                  // board
    for(let i=0;i<3;i++)
      F(sA0+10, sA1-10, 126+i*16, 136+i*16, shade(trim,1.6), null, 0, -2.5);
    /* THE DOOR WAS WRAPPING THE CORNER. shopDoor was asked for a-mid
       W*0.86 = 197.8 and clamped to 191.88, which puts the painted
       surround's far edge on 229 against a 230 return -- one unit of
       wall, so the surround read as continuing round onto the flank
       rather than as an opening in a facade.
       Both ends move together. Door mid 180 leaves 12.88 of corner
       pier, and the shutter opening pulls from W*0.62 = 142.6 to 138 so
       the pier on the other side comes out at 4.88 -- the same 4.8 the
       noodle bar and the grocer settled on. The ladders lean at the
       left end and are unaffected. */
    reveal(12, 138, 0, 102, 40, '#4a4238');
    F(12,138, 46, 102, '#8c8676', shade(trim,1.3), 2, -1);         // shutter, half down
    for(let i=0;i<6;i++) F(14,136, 50+i*9, 55+i*9, '#a09a88', null,0,-2);
    slab(12,138, 40, 48, -2, -9, trim);
    shopDoor(180, wall, trim);
    if(state.props){
      for(let i=0;i<2;i++){
        const la = W*0.055 + i*13, lb = 20 + i*9, col = i? '#8c6f43' : '#b08d55';
        tube(la-8, lb, 4, la-4, lb-16, 104, 2.6, col);
        tube(la+8, lb, 4, la+12, lb-16, 104, 2.6, col);
        for(let k=1;k<=4;k++){
          const t=k/5, ax = la - 8 + 4*t, bx = la + 8 + 4*t;
          tube(ax, lb - 16*t, 4 + 100*t, bx, lb - 16*t, 4 + 100*t, 1.7, shade(col,.8));
        }
      }
      /* THE TINS DID NOT FIT THE CRATE THEY STOOD ON. Three at r 6 on
         centres 30/46/62 span 24..68, and the crate under them ran
         24..60 -- so the first was flush with the near edge with no
         margin at all and the third overhung the far end by 8 units and
         stood on nothing, which is what read as a tin floating off the
         end of the stack.
         Sized from the row instead of guessed at: three 12-wide tins
         with 3-unit gaps and 3-unit end margins need 48, so the upper
         crate goes 24..72. That keeps it inset 4 from the 20..74 crate
         below it on both ends -- the same 4 the b span already had --
         so the stack still steps in rather than sitting flush. Centres
         33/48/63 and b 23 puts every tin fully on the plate with 5
         units of crate showing all round. */
      depthSort([
        { a: 47, b: 24, z: 9, draw: () => box(20,74,8,40,0,18,'#6f665a','#5d5548','#4e473c') },
        { a: 48, b: 23, z: 25, draw: () => box(24,72,12,34,18,32,'#8a8272','#75705f','#635e50') },
        { a: 48, b: 23, z: 39, draw: () => { for(let i=0;i<3;i++) cyl(33+i*15, 23, 32, 46, 6, ['#7d838a','#8c8676','#6f665a'][i]); } }
      ]);
    }
    if(state.roof){
      /* HOIST REMOVED at Sir's direction. Mast, jib, brace, cable and
         hook all went: the whole assembly stood on the parapet at
         a = W*0.43 and reached out to b = 58, further into the street
         than anything else on the shop, and the hook hung free in the
         air over the pavement with no load and nothing under it. */
      box(W*0.62,W*0.88,-150,-100,H,H+22,'#8f969d','#787f86','#697077');
    }
    kerb(p,'none');
  }
},
{
  name:'Florist', head:'Scalloped canopy, bucket rows, trellis',
  cTodo:'5 pavement props need collision volumes',
  tags:['blooms inside and out','round buckets','trellis','glazed over','soft palette'],
  desc:'There are flowers inside the window as well as out on the pavement, and the pane glazes over the inside ones so the two sets sit at different depths instead of on the same plane.',
  draw(p){
    const wall = '#eef0e6', trim = '#4f7a4a', H = 156;
    body(wall, trim, H);
    /* THREE BANDS OVER THE RETURN, all the same fault: a slab at
       negative b projects RIGHT on screen by its own depth, so the
       margin has to beat the recess. The parapet ran 0..W at b -1..-10
       and landed on screen-a 240 against a 230 return -- ten units of
       coping on the flank -- and the sign band ran 8..W-8 at -1..-9 and
       landed on 231, over by one. 16 clears both by 6. */
    slab(16,W-16, H, H+10, -1, -10, trim);
    /* THE TRELLIS HAD NOWHERE TO STAND, which is what put it through
       the awning. It ran a 154.6..159.7 at b = -2 and z 18..150:
         * b -2 is INTO the wall, so the whole thing was buried in the
           facade and survived on paint order alone;
         * z 150 took it up through the sign band at 108..132 and into
           the canopy fascia at 126..152, which is the overlap;
         * and 154.6 is inside the door surround, which began at 153.78.
       There is no strip of wall between window and door wide enough for
       it -- the door is 74 across with its surround and the window ran
       to 151.8 -- so it moves to the left end, where a climbing trellis
       belongs anyway, and everything else on the frontage shifts right
       to make the room.
       Window 12..W*0.66 -> 34..138, which leaves 8..24 for the trellis
       with a 6-unit pier, and 4.88 to the door surround on the other
       side. The trellis stands PROUD at b 2 and stops at z 104, under
       the sign band, so nothing it does can reach the canopy. */
    reveal(34, 138, 16, 104, 13, '#8fae9c');
    F(44, 128, 40, 46, '#dfe6d2', null,0, -1.5);                   // shelf line, inside the pane
    glaze(34, 138, 16, 104, null);
    slab(30, 142, 100, 108, -1, -9, shade(trim,1.25));
    /* THE DOOR WAS WRAPPING THE CORNER, same as the hardware store:
       W*0.83 asks for 190.9 and the surround's far edge lands on 228
       against a 230 return. 180 leaves a 12.88 pier. */
    shopDoor(180, wall, trim, 'rgba(150,200,180,.5)');
    slab(16,W-16, 108, 132, -1, -9, trim);
    /* the panel goes ON the band, not behind it: the band's front face
       is b -1 and its back is -9, and this sat at -9.5 */
    F(24,W-24, 113, 127, '#f4f6ee', null,0,-0.5);
    /* the trellis, on the left wall and clear of everything */
    for(let i=0;i<6;i++) F(8, 24, 26+i*14, 29+i*14, shade(trim,1.2), null,0, 2);
    for(const ax of [8, 21]) F(ax, ax+3, 18, 104, shade(trim,1.2), null,0, 2);
    for(let i=0;i<6;i++) ball(16, 3, 30+i*12, 5, ['#d98a9e','#e8c34a','#f4f6ee'][i%3]);
    /* A CANOPY CAN ONLY CROSS AT ONE END. Positive b shifts an item
       LEFT on screen, so the far end of this one was never the problem
       -- the near end was: a 4 at b 34 sat 30 units past the left
       return, the whole bench gap, so the canopy lay on the neighbour's
       facade. 24 leaves 10 over, the same as the grocer's. */
    const cz = 136, out = 34, cA = 24, cB = W-8;
    poly([P(cA,0,cz+16),P(cB,0,cz+16),P(cB,out,cz),P(cA,out,cz)], '#dfe6d2');
    poly([P(cA,0,cz+6),P(cB,0,cz+6),P(cB,out,cz-10),P(cA,out,cz-10)], shade('#dfe6d2',.8));
    poly([P(cA,0,cz+16),P(cA,out,cz),P(cA,out,cz-10),P(cA,0,cz+6)], shade(trim,1.5));
    poly([P(cB,0,cz+16),P(cB,out,cz),P(cB,out,cz-10),P(cB,0,cz+6)], shade(trim,1.5));
    for(let i=0;i<9;i++){
      const x0=cA+(cB-cA)*i/9, x1=cA+(cB-cA)*(i+1)/9, m=P((x0+x1)/2,out,cz-12);
      const l=P(x0,out,cz), r=P(x1,out,cz);
      ctx.beginPath(); ctx.moveTo(l.x,l.y);
      ctx.quadraticCurveTo(m.x,m.y+6,r.x,r.y); ctx.closePath();
      ctx.fillStyle = i%2 ? '#dfe6d2' : trim; ctx.fill();
    }
    if(state.props){
      /* THE BUCKETS WERE IN TWO ROWS PRETENDING TO BE ONE. b alternated
         22/32 down the run, which staggered them into a zigzag, and it
         is also what exposed the depthSort fault -- with a varying and b
         alternating, the old b-only key painted every other bucket over
         the one standing in front of it. The row is flat now at one b of
         22, which keeps b + r at 32 inside the canopy's 34, and the run
         is laid against the frontage rather than started at a 8 where
         the first bucket stood outside the canopy: centres 34 to 130 at
         a step of 24 gives five even 4-unit gaps under the window. */
      depthSort([0,1,2,3,4].map(i => ({
        a: 34+i*24, b: 22, z: 0,
        draw: () => {
          const ba = 34+i*24, bb = 22;
          cyl(ba, bb, 0, 24, 10, '#7d838a');
          plateCircle(ba, bb, 23, 8, '#3d5a3a');
          for(let j=0;j<3;j++){
            const fa = ba - 5 + j*5, fb = bb - 3 + (j%2)*6, fz = 34 + (j%2)*7;
            tube(ba, bb, 22, fa, fb, fz, 1.1, '#4f7a4a');
            ball(fa, fb, fz + 4, 5.5, ['#d98a9e','#e8c34a','#c2452e','#f4f6ee'][(i+j)%4]);
          }
        }
      })));
    }
    if(state.roof) box(W*0.30,W*0.58,-140,-96,H,H+18,'#9aa0a6','#7d838a','#6a7076');
    kerb(p,'none');
  }
},
{
  name:'Diner', head:'Streamlined end, roof sign on legs, stools',
  tags:['true curved corner','chrome bands','rooftop sign','counter stools','tiled base'],
  desc:'The rounded end is a real half-cylinder now, not a stack of narrowing rectangles, so the chrome bands wrap it and the wall runs into the curve properly. Stools shear with the glass.',
  draw(p){
    const wall = '#f2f0ea', trim = '#c2452e', H = 150, R = 42;
    // flat part of the box, stopping short of the curved end
    T(0,W-R,-D,0,H, shade(trim,1.05));
    /* THE FLANK WAS A ONE-UNIT SLIVER. This read S(W-R, -D, -D+1, ...),
       a wall from b -276 to -275 -- a hairline at the very BACK of the
       block -- so the entire right side of the diner was open and the
       roof plate floated with nothing under it, a single white thread
       hanging off its far corner.
       body() draws its end wall across the unit's whole depth, and this
       shop hand-rolls its box instead of calling body(), which is how
       the b range got lost. It cannot run the full depth here, though:
       the drum takes over the last stretch. The cylinder is centred
       (W-R, -R) with radius R, so at a = W-R it spans b -2R..0 -- the
       end wall runs from the back of the block to where the curve
       starts, and the two meet exactly at b = -2R. */
    /* THE FLANK IS THE SAME BUILDING, so it gets the same elevation.
       It was one flat sheet of shade(wall,.78) -- a grey slab with no
       plinth, no banding and no fluting, against a front that has all
       three -- which is why it read as a blank wall bolted onto a diner
       rather than as the side of one. On a streamlined building the
       horizontal bands are the whole idea: they wrap. */
    S(W-R,-D,-2*R,0,H, shade(wall,.97));                   // white, a hair off the drum
    S(W-R,-D,-2*R,0,26, '#3b6e75');                        // tiled base, as the front
    for(let bb=-2*R-14; bb>-D+8; bb-=18)
      S(W-R, bb, bb-1.5, 0, 26, shade('#3b6e75',.7));      // flutes, same 18 pitch
    S(W-R,-D,-2*R,26,34, '#c9ccd0');                       // lower chrome band
    S(W-R,-D,-2*R,H-16,H-8, '#c9ccd0');                    // upper chrome band
    F(0,W-R,0,H, wall);
    F(0,W-R,0,16, shade(wall,.66), null,0,-0.5);
    // the streamlined end as a genuine cylinder
    cyl(W-R, -R, 0, H, R, wall);
    plateCircle(W-R, -R, H, R, shade(trim,1.05), shade(trim,.8), 2);
    slab(0,W-R, H, H+8, -1, -12, trim);
    plateCircle(W-R, -R, H+8, R, trim, shade(trim,.8), 2);
    // chrome bands, wrapped round the curve as short surface quads
    /* THE SWEEP IS ASKED FOR, NOT WRITTEN IN. Both the bands and the
       door had their arc limits as constants -- 3pi/4..-pi/4 for the
       bands, 0.10..-0.52 for the door. The band constants happen to be
       the correct visible half on this bench and would be wrong on half
       the game's block edges, the identical fault plateSweep() was
       written to end. The door constants were not even right here: the
       drum's front is at the MIDDLE of the visible arc, and 0.10..-0.52
       is centred a full radian off it, which is why the door sat almost
       edge-on at the drum's right silhouette instead of facing out. */
    const sweep = plateSweep(W-R, -R, 0);
    const arc = u => sweep.ts + sweep.dir*Math.PI*u;      // u 0..1 across the visible half
    /* ONE POLYGON, NOT A ROW OF QUADS. Every strip on this drum was
       being built as n separate quads sharing edges, and adjacent fills
       that share an edge do not close over it -- the antialiased seam
       lets whatever is behind show through as a hairline. On the glass
       that read as a set of pale vertical lines down the pane. Walking
       the arc out along one z and back along the other gives a single
       closed outline with no interior edges at all. */
    const curveBand = (u0,u1,z0,z1,col,seg) => {
      const n = seg || 10, pts = [], rim = (u,z) => {
        const t = arc(u0+(u1-u0)*u);
        return P(W-R+R*Math.cos(t), -R+R*Math.sin(t), z);
      };
      for(let k=0;k<=n;k++) pts.push(rim(k/n, z0));
      for(let k=n;k>=0;k--) pts.push(rim(k/n, z1));
      poly(pts, col);
    };
    const band = (z0,z1,col) => { F(0,W-R, z0, z1, col, null,0,-0.6);
                                  curveBand(0, 1, z0, z1, col, 16); };
    band(H-16, H-8, '#c9ccd0');
    band(26, 34, '#c9ccd0');
    band(0, 26, '#3b6e75');
    for(let i=0;i<9;i++) F(8+i*18, 9.5+i*18, 0, 26, shade('#3b6e75',.7), null,0,-0.8);
    for(let i=1;i<6;i++) curveBand(i/6, i/6 + 1.5/(Math.PI*R), 0, 26, shade('#3b6e75',.7), 1);
    /* THE FLAT FACADE DOES NOT REACH a = W-R ON SCREEN. Everything on
       it was laid out against the drum's CENTRE line at 188, but the
       drum's near silhouette is where it actually takes over, and that
       is further left: a rim point is (W-R+Rcos t, -R+Rsin t), so its
       screen-a is 230 + R(cos t - sin t), which bottoms out at
       230 - R*sqrt2 = 170.6. The window ran to 180 and the base flutes
       ran the full 0..230, so both were painted ON the curved wall --
       drawn after the drum, so they won over it.
       The window now stops at 162, 8.6 clear of the silhouette, and the
       flutes stop with it and are continued round the drum as surface
       quads on the sweep plateSweep() reports, so the fluting carries
       through the corner instead of stopping dead at it. */
    F(10, 162, 40, 104, '#7fb0c4', shade(wall,.62), 3);
    for(let i=0;i<4;i++) F(10+152*(i+1)/5-1.5, 10+152*(i+1)/5+1.5, 40, 104, shade(wall,.6), null,0,-1);
    for(let i=0;i<5;i++) faceCircle(26+i*28, -3, 58, 8, '#c2452e', '#8f2f22', 2);
    /* THE GLAZING HUNG BELOW ITS OWN SILL LINE. The leaf ran z 16..96
       while the flat wall's window runs 40..104, so the glass on the
       curve started 24 units lower than the glass beside it and dropped
       through both the chrome band at 26..34 and the tiled base at
       0..26 -- a pane crossing the plinth it should be standing on.
       A sill and a head are continuous mouldings: they carry round the
       corner rather than stepping at it. The glazing takes the flat
       wall's own 40..104, which puts it clear above the chrome band and
       leaves 0..40 as the door's solid lower panel, and the surround
       goes to 112 so the head has 8 units of margin. */
    /* THE GREY WAS A DOOR SURROUND THAT SHOULD NEVER HAVE BEEN THERE.
       The opening was built as two stacked quads: a full-height panel in
       shade(wall,.80) from z 0 to 112 with the glass laid on top of it.
       That panel is what showed as grey -- a cap above the head, and
       below the sill a solid stump that cut clean through the chrome
       band at 26..34 and the tiled base at 0..26, so the drum looked
       like it had a grey post standing against it.
       There is no door on this elevation. The flat wall's opening is a
       pane with a thin frame and nothing behind it, and the corner
       window is the same opening carried round the curve: glass on the
       flat wall's own 40..104 sill and head, a 3-unit frame on all four
       sides, and nothing below the sill at all -- so the chrome band and
       the fluted base run under it unbroken, which is the whole point of
       a streamlined end. */
    const gU0 = 0.355, gU1 = 0.645, frame = shade(wall,.62);
    curveBand(gU0, gU1, 37, 107, frame);                     // frame, glass sits inside it
    curveBand(gU0+0.012, gU1-0.012, 40, 104, '#7fb0c4');     // the pane
    curveBand(0.497, 0.503, 40, 104, frame, 1);              // one mullion, on the drum's centre
    if(state.roof){
      /* THE A/C WAS STACKING OVER THE SIGN, and it was pure call order.
         The plant sat at a 13.8..55.2, b -120..-70, which is screen-a
         83.8..175.2, straight across the sign's 72..180 -- but its depth
         key (a+b+z) is 102 against the sign's 271, so it is a long way
         BEHIND the sign and was being painted last, on top of it.
         Two fixes, both needed. The order comes off depthSort now rather
         than being asserted by the sequence of statements, so it is
         right whatever the host's projection. And the plant moves BACK
         along the roof. a 130..172 at b -120..-70 cleared the sign but
         still stood on the drum's roof cap, which covers b -2R..0, so
         anything nearer than b -84 is sitting on it. b -220..-170 puts
         the box's screen-a at 300..392, clear of the cap's own 170.6 to
         289.4 as well as the sign's 180, and leaves it where roof plant
         actually goes -- at the back of the roof. */
      const sa = W*0.40, sb = -34;
      depthSort([
        { a: 151, b: -195, z: 163, draw: () =>
            box(130,172,-220,-170,H,H+26,'#9aa0a6','#7d838a','#6a7076') },
        { a: sa, b: sb, z: H+63, draw: () => {
            for(const la of [sa-56, sa+56]) cyl(la, sb, H+8, H+40, 4, '#9aa0a6');
            slab(sa-62, sa+62, H+40, H+86, sb+8, sb-8, trim, null, shade(trim,1.2));
            F(sa-54, sa+54, H+48, H+78, '#f2e6cc', null,0, sb+8.5); } }
      ]);
    }
    kerb(p,'none');
  }
},
{
  name:'Cinema', tall:true,
  zTodo:1.25,          // H 210 -- see SCALE REVIEW at the head of this file
  head:'Blade sign, wrapping marquee, recessed lobby, ticket booth',
  tags:['vertical blade','marquee that wraps the entry','changeable readerboard','bulb chase','island ticket booth','poster cases'],
  desc:'A picture palace rather than a shop with a sign on it: the facade steps back under the marquee, the booth stands out in the recess with the doors behind it, and the marquee carries letters round its return the way a real one does.',
  draw(p){
    /* ================= WHAT A MARQUEE THEATRE ACTUALLY IS =================
       The old cut had the parts named but not doing their jobs. The
       marquee was a 54-deep wedge starting at a = 2, so its near end sat
       52 units past the return and it read as a plank stuck on the
       corner of the block rather than a canopy over an entrance. The
       blade floated above the parapet with a gap under it. The door was
       a shopDoor dropped straight onto the front wall, so the building
       had a shop entrance and no lobby, and the two poster cases stood
       out on open pavement with nothing to flank.
       A marquee theatre is four things working together, and the whole
       point of it is DEPTH -- the facade steps BACK and the marquee
       steps FORWARD over the gap:
         1  a blade standing proud of the wall, read edge-on from up the
            street, rising well clear of the parapet
         2  a marquee that WRAPS: a front fascia and a return fascia both
            carrying changeable letters, with a bulb chase round the edge
         3  a recessed lobby under it, with the doors at the back
         4  an island ticket booth standing out in that recess
       Everything below is sized so nothing recessed crosses the return
       and only the marquee -- which must project to be a marquee -- shows
       outside the silhouette, by 10, the same as the grocer's canopy. */
    const wall = '#2b2f45', trim = '#e8b23a', cream = '#f2ece0', H = 210;
    const glass = '#5a7f96';
    body(wall, trim, H);

    /* ---- parapet, stepped the way a deco house front is ---- */
    slab(18, W-18, H, H+16, -1, -14, trim, shade(trim,.72), shade(trim,1.2));
    slab(80, 150, H+16, H+38, -1, -12, trim, shade(trim,.72), shade(trim,1.2));
    F(88, 142, H+22, H+32, shade(wall,1.2), null, 0, -0.5);

    /* ---- upper facade: fins and the house name panel ---- */
    /* the fluting is a FRIEZE, in the gap between marquee and panel.
        Run 176..H it sat behind the 182..206 panel and only its ends
        showed, top and bottom, as a row of tabs. 168..178 gives it a
        band of its own and stacks the elevation cleanly: marquee 164,
        frieze 168, panel 182, parapet 210. */
    for(let i=0;i<9;i++)
      slab(76+i*15, 82+i*15, 168, 178, -1, -7, shade(wall,1.18));
    slab(76, 200, 182, 206, -1, -9, shade(wall,1.3), shade(wall,1.0), shade(wall,1.5));
    for(let i=0;i<8;i++)
      F(84+i*14, 92+i*14, 188, 200, i%3 ? cream : trim, null, 0, -0.5);

    /* ================= THE RECESSED LOBBY =================
       The wall has a hole in it and everything behind that hole is
       bounded by it, so the whole recess is clipped to its own opening
       -- the same rule reveal() follows. Inside, back to front: the
       rear wall with the door bank on it, the side returns and floor
       that the shift exposes, then the booth standing clear of them.
       Nothing here can reach the return: the clip guarantees it. */
    const rA0 = 60, rA1 = 178, rZ = 112, rD = 34;
    ctx.save();
    poly([P(rA0,0,rZ),P(rA1,0,rZ),P(rA1,0,0),P(rA0,0,0)]);
    ctx.clip();
    F(rA0, rA1, 0, rZ, shade(wall,.75), null, 0, -rD);          // rear wall
    S(rA0, 0, -rD, 0, rZ, shade(wall,.62));                     // left jamb
    S(rA0+0.6, -6, -28, 34, 92, shade(trim,.75));               // poster on the jamb
    S(rA0+1.2, -9, -25, 38, 88, '#c2452e');
    T(rA0, rA1, 0, -rD, 0, '#6a5c48');                          // lobby floor
    slab(rA0, rA1, 92, 100, -rD+1, -rD+7, trim);                // transom band
    /* THE DOORS HAVE TO BE LAID AGAINST WHERE THE REAR WALL LANDS, not
       against the opening. A plate at b -rD projects right by rD, so
       only a 60..144 of the rear wall falls inside a 60..178 opening --
       the old bank ran to 170 and its last leaf was clipped away
       entirely while the left third of the recess showed nothing but
       jamb. Five leaves across 62..148 all land inside the clip. */
    for(let i=0;i<5;i++){                                       // the door bank
      const d0 = rA0+2+i*18, d1 = d0+14;
      F(d0-2, d1+2, 0, 90, shade(trim,.8), null, 0, -rD+1.2);
      F(d0, d1, 4, 86, glass, null, 0, -rD+1.6);
      F(d0+1, d0+7, 8, 82, 'rgba(240,250,254,.14)', null, 0, -rD+1.8);
    }
    /* the booth stands OUT in the recess, which is the whole reason a
       lobby is recessed -- at b -20..-8 it is 14 clear of the doors and
       20 back from the frontage, so it reads as an island */
    box(104, 134, -20, -8, 0, 54, shade(trim,1.1), trim, shade(trim,.8));
    F(108, 130, 18, 46, glass, null, 0, -7.4);
    F(109, 114, 22, 42, 'rgba(240,250,254,.16)', null, 0, -7.6);
    F(113, 125, 10, 14, shade(trim,.7), null, 0, -7.4);         // the sill you pay at
    slab(100, 138, 54, 62, -6, -22, trim, shade(trim,.72), shade(trim,1.2));
    ctx.restore();
    /* the opening gets a frame, standing proud, so the recess reads as
       cut into the wall rather than painted on it */
    F(rA0-5, rA0, 0, rZ+5, shade(trim,.85), null, 0, 0.6);
    F(rA1, rA1+5, 0, rZ+5, shade(trim,.85), null, 0, 0.6);
    F(rA0-5, rA1+5, rZ, rZ+5, shade(trim,.85), null, 0, 0.6);

    /* ---- poster cases, on the piers the recess leaves either side ---- */
    for(const [c0,c1] of [[14,46],[190,218]]){
      slab(c0-3, c1+3, 30, 104, -1, -7, shade(trim,.9), shade(trim,.7), trim);
      F(c0, c1, 34, 100, '#1a1d2b', null, 0, -1.4);
      F(c0+4, c1-4, 40, 94, ['#c2452e','#3b6e75'][c0>100?1:0], null, 0, -1.6);
      F(c0+5, c0+11, 42, 92, 'rgba(240,250,254,.13)', null, 0, -1.8);
    }

    /* ================= THE MARQUEE =================
       Four surfaces, and the return fascia is the one that makes it a
       marquee rather than an awning: a canopy you can read from up the
       street as well as from in front of it. Only the a1 end is drawn
       because +a is toward the eye here (the same test box() and slab()
       make), and the a0 end is against nothing the eye can reach.
       out 44 with the run starting at 34 puts the near end 10 outside
       the silhouette. A canopy that projects at all must show outside
       it in isometric; what matters is that 10 is a canopy and 52 was
       somebody else's shopfront. */
    const mA0 = 34, mA1 = 214, mOut = 44, mZ0 = 118, mZ1 = 164;
    tube(72, 4, 178, 72, mOut-8, mZ1, 1.6, shade(trim,.7));      // hanger rods
    tube(204, 4, 178, 204, mOut-8, mZ1, 1.6, shade(trim,.7));
    T(mA0, mA1, 0, mOut, mZ1, shade(trim,.72));                  // top
    poly([P(mA0,mOut,mZ1),P(mA1,mOut,mZ1),
          P(mA1,mOut,mZ0),P(mA0,mOut,mZ0)], cream);              // front fascia
    poly([P(mA1,0,mZ1),P(mA1,mOut,mZ1),
          P(mA1,mOut,mZ0),P(mA1,0,mZ0)], shade(cream,.88));      // return fascia
    poly([P(mA0,mOut,mZ0),P(mA1,mOut,mZ0),
          P(mA1,mOut,mZ0-7),P(mA0,mOut,mZ0-7)], trim);           // lower lip, front
    poly([P(mA1,0,mZ0),P(mA1,mOut,mZ0),
          P(mA1,mOut,mZ0-7),P(mA1,0,mZ0-7)], shade(trim,.82));   // lower lip, return
    /* CHANGEABLE LETTERS, not a texture. Uneven widths in runs with
       gaps between them is what makes a readerboard read as words; an
       even comb reads as louvres, which is what the old fascia was. */
    const LW = [7,4,6,9,5,7,4,8,6,5,7,4,6,8,5,9,4,7,6,5];
    for(let r=0;r<2;r++){
      let a = mA0 + 10, k = r*7;
      while(a < mA1 - 12){
        const w = LW[k++ % LW.length];
        poly([P(a,mOut+0.6,mZ1-10-r*17),P(a+w,mOut+0.6,mZ1-10-r*17),
              P(a+w,mOut+0.6,mZ1-23-r*17),P(a,mOut+0.6,mZ1-23-r*17)], wall);
        a += w + (k%4 === 0 ? 8 : 3);
      }
    }
    for(let b = 6, k = 3; b < mOut-8; ){                          // letters on the return
      const w = LW[k++ % LW.length];
      poly([P(mA1+0.6,b,mZ1-14),P(mA1+0.6,b+w,mZ1-14),
            P(mA1+0.6,b+w,mZ1-32),P(mA1+0.6,b,mZ1-32)], wall);
      b += w + (k%3 === 0 ? 7 : 3);
    }
    /* the chase: bulbs round the edge of the fascia, front and return,
       which is the light a marquee is actually for */
    for(let i=0;i<16;i++){
      const a = mA0+6+(mA1-mA0-12)*i/15;
      ball(a, mOut+2, mZ1-4, 3.2, '#fff3c4');
      ball(a, mOut+2, mZ0-3.5, 3.2, '#fff3c4');
    }
    for(let i=0;i<5;i++){
      const b = 6+(mOut-14)*i/4;
      ball(mA1+2, b, mZ1-4, 3.2, '#fff3c4');
      ball(mA1+2, b, mZ0-3.5, 3.2, '#fff3c4');
    }

    /* ================= THE BLADE =================
       A blade is read EDGE-ON from up the street, so its board lies in
       the a plane and it projects into the street on b -- the opposite
       of every other sign in this library. It rises from just above the
       marquee to well over the parapet, which is what makes a theatre
       findable from three blocks away. Its front edge at a 46, b 34 is
       screen-a 12, inside the return. */
    const bA0 = 46, bA1 = 66, bOut = 34, bZ0 = 170, bZ1 = H + 132;
    T(bA0, bA1, 0, bOut, bZ1, shade(wall,1.5));                   // cap plate
    S(bA1, 0, bOut, bZ0, bZ1, shade(wall,1.32));                  // the board
    poly([P(bA0,bOut,bZ1),P(bA1,bOut,bZ1),
          P(bA1,bOut,bZ0),P(bA0,bOut,bZ0)], shade(wall,1.05));    // leading edge
    for(let i=0;i<7;i++)                                          // the name, vertically
      S(bA1+0.6, 5, bOut-5, bZ1-16-i*26, bZ1-38-i*26, i%2 ? trim : cream);
    for(let i=0;i<11;i++)                                         // bulbs down the edge
      ball(bA1, bOut+2, bZ0+8+(bZ1-bZ0-16)*i/10, 3, '#fff3c4');
    /* THE CROWN'S b ARGUMENTS WERE THE WRONG WAY ROUND. slab takes
        (bFront, bBack) and draws its one F at bFront, so bFront has to
        be the b NEARER the eye -- the larger one, since +b is toward the
        street. Passed as (2, bOut-2) it painted the FAR face and left
        the near one open, so the crown was a shell you could see into.
        Every other call in the library reads (-1, -12); this one reads
        (bOut-2, 2) because the blade lives on positive b. */
    slab(bA0-4, bA1+4, bZ1, bZ1+12, bOut-2, 2, trim, shade(trim,.72), shade(trim,1.2));
    ball((bA0+bA1)/2, bOut/2, bZ1+17, 7, trim);

    if(state.roof){
      /* THE VENT WAS STACKED ON THE PLANT. At a W*0.46, b -210 its
         screen-a is 308.8..322.8 and the box's is 321..332, so they
         overlapped -- and the vent's depth key (a+b+z) is 125 against
         the box's 238, meaning it stands well BEHIND the box and was
         being drawn after it. Moved to a 60, b -160: screen-a 213..227,
         clear of the box, of the attic step's 81..162 and of the
         blade's 12..66. Order comes off depthSort rather than statement
         sequence so the stacking cannot come back. */
      depthSort([
        { a: 60, b: -160, z: 229, draw: () => {
            cyl(60, -160, H, H+4, 11, '#7d838a');
            cyl(60, -160, H+4, H+42, 7, '#9aa0a6'); } },
        { a: 171, b: -155, z: 222, draw: () =>
            box(W*0.62, W*0.88, -180, -130, H, H+24, '#8f969d','#787f86','#697077') }
      ]);
    }
    kerb(p,'none');
  }
},
{
  name:'Rooming house', tall:true,
  fTodo:'z408..420 return +3; z114..122 return +6; z214..222 return +6; z314..322 return +6',
  head:'Four storeys, cantilevered fire escape, entrance hood',
  tags:['real storey rhythm','fire escape with depth','cantilevered hood','band courses','roof tank on legs'],
  desc:'Sized against the game one-storey anchor rather than by eye: a shopfront-height ground floor with three residential storeys over it, so the three ranks of windows have room to be storeys instead of stripes.',
  draw(p){
    /* ================= THE HEIGHT WAS THE FAULT =================
       Measured against the game's own anchor -- STORE_H 252 over
       ZSCALE 1.5, so one shop storey is 168 lab units -- this stood at
       H 226, which is 1.35 storeys, while drawing a shopfront AND three
       ranks of windows over it. A four storey elevation in one and a
       third storeys of height: every floor came out at 38, less than a
       quarter of a storey, which is why the windows read as a stripe
       pattern rather than as floors.
       The frontage does NOT change with it. W is the block's frontage
       unit and every building on a street shares it; a walk-up is tall
       and narrow, not wide, and widening this one would break the
       packing drawStoreUnit does. Only z moves.
       Rebuilt on a real rhythm: a shopfront-height ground storey, then
       three residential storeys at 100 -- shorter than a shop storey,
       the way they are in the world -- with a band course at each
       floor line. H 420 puts it at 2.5 shop storeys, the tallest thing
       in the library, which is what a rooming house should be next to
       a row of one storey shops. */
    const wall = '#9a6b52', trim = '#e8ddc8', H = 420;
    const G = 120, FH = 100;                 // ground storey, residential storey
    body(wall, trim, H);
    slab(0,W, H, H+16, -1, -12, shade(wall,.7), shade(wall,.55), shade(wall,.85));
    slab(6,W-6, H-12, H, -1, -9, shade(trim,.86));                 // cornice
    for(let f=0;f<3;f++)
      slab(0,W, G+f*FH-6, G+f*FH+2, -1, -6, shade(wall,.72));      // band courses

    /* ---- the three upper storeys ---- */
    for(let f=0;f<3;f++) for(let c=0;c<4;c++){
      const x0 = 14+(W-28)*(c+0.12)/4, x1 = 14+(W-28)*(c+0.88)/4;
      const z0 = G + f*FH + 26;
      slab(x0-5, x1+5, z0-8, z0-4, -1, -8, shade(trim,.86));       // cill
      F(x0-4, x1+4, z0-4, z0+62, trim, null, 0, -1);               // architrave
      F(x0, x1, z0, z0+58, '#5d7f92', null, 0, -2);                // glass
      F(x0, x1, z0+27, z0+31, trim, null, 0, -2.4);                // meeting rail
      F(x0+1, x1*0+x0+7, z0+3, z0+55, 'rgba(240,250,254,.13)', null, 0, -2.6);
      slab(x0-6, x1+6, z0+62, z0+68, -1, -9, shade(trim,.92));     // hood mould
    }

    /* ---- ground storey ---- */
    reveal(12, 118, 18, 104, 12, '#3c3a36');
    glaze(12, 118, 18, 104, trim);
    shopDoor(163, wall, trim);
    /* THE HOOD, REBUILT. It was a flat sloped sheet on two round posts
       standing out on the pavement, which is a market stall, not the
       entrance to a building -- and the posts landed in front of the
       door on the very line people walk. A rooming house hood is
       cantilevered: it hangs off the wall on tie rods and touches
       nothing below it. Top, front fascia, the a1 return (the visible
       end under this projection, same test box() makes), a dentil row
       on the fascia and two rods back to the wall above. */
    const hA0 = 118, hA1 = 212, hOut = 40, hZ0 = 118, hZ1 = 134;
    /* BRACKETS, NOT RODS. Tie rods would have to anchor above the hood,
       and above the hood is the first floor -- any anchor high enough
       to work landed inside a window. A bracket carries the load the
       other way, from under the hood back to the wall below it, where
       there is nothing but brick. Two of them, each a triangle with a
       thickness, set in from the ends the way real ones are. */
    for(const ha of [hA0+12, hA1-12])
      for(const d of [0, 3])
        poly([P(ha+d,0,hZ0),P(ha+d,hOut-6,hZ0),P(ha+d,0,hZ0-46)],
             d ? shade(trim,.5) : shade(trim,.62));
    T(hA0, hA1, 0, hOut, hZ1, shade(trim,.94));
    poly([P(hA0,hOut,hZ1),P(hA1,hOut,hZ1),
          P(hA1,hOut,hZ0),P(hA0,hOut,hZ0)], trim);
    poly([P(hA1,0,hZ1),P(hA1,hOut,hZ1),
          P(hA1,hOut,hZ0),P(hA1,0,hZ0)], shade(trim,.8));
    for(let i=0;i<13;i++){
      const a = hA0+5+(hA1-hA0-10)*i/12;
      poly([P(a,hOut+0.5,hZ0+4),P(a+4,hOut+0.5,hZ0+4),
            P(a+4,hOut+0.5,hZ0+12),P(a,hOut+0.5,hZ0+12)], shade(trim,.66));
    }

    if(state.props){
      /* ================= THE FIRE ESCAPE =================
         It had no depth. Every member was drawn on the a = W+1 plane --
         deck, rail infill, handrail, stringer, all of it -- so a
         cantilevered steel structure was a set of flat translucent
         quads lying on the brick, which is why it read as a smear
         rather than as ironwork standing off the wall.
         A fire escape is a thing you could walk on: decks that project,
         balustrades standing on their outer edge, brackets carrying
         the load back to the wall, and flights that actually connect
         one deck to the next. Which flank it hangs on is asked of
         FLANK_RIGHT rather than assumed, so it is on the wall the host
         is drawing instead of floating off the one it culled. */
      const fSide = FLANK_RIGHT ? 1 : -1, fW = FLANK_RIGHT ? W : 0;
      const fOut = fW + fSide*20, fLo = Math.min(fW,fOut), fHi = Math.max(fW,fOut);
      const fb0 = -68, fb1 = -12, steel = '#5a6068';
      for(let i=0;i<3;i++){
        const z = G + i*FH + 20;
        tube(fOut-fSide*3, fb0+10, z-4, fW, fb0+10, z-30, 1.6, shade(steel,.8));
        tube(fOut-fSide*3, fb1-10, z-4, fW, fb1-10, z-30, 1.6, shade(steel,.8));
        T(fLo, fHi, fb0, fb1, z, shade(steel,1.12));                // deck
        for(let j=0;j<7;j++)                                        // deck grating
          T(fLo, fHi, fb0+2+j*8, fb0+4+j*8, z+0.2, shade(steel,.9));
        S(fOut, fb0, fb1, z-5, z, shade(steel,.78));                // deck edge
        poly([P(fLo,fb1,z),P(fHi,fb1,z),
              P(fHi,fb1,z-5),P(fLo,fb1,z-5)], shade(steel,.7));
        for(let j=0;j<=6;j++){                                      // balusters
          const b = fb0 + (fb1-fb0)*j/6;
          poly([P(fOut,b-0.9,z),P(fOut,b+0.9,z),
                P(fOut,b+0.9,z+24),P(fOut,b-0.9,z+24)], shade(steel,1.3));
        }
        tube(fOut, fb0, z+24, fOut, fb1, z+24, 1.5, shade(steel,1.45));
        tube(fOut, fb0, z+13, fOut, fb1, z+13, 1.0, shade(steel,1.2));
        tube(fW, fb1, z+24, fOut, fb1, z+24, 1.5, shade(steel,1.45));
        /* the flight down to the deck below, with treads you can count */
        if(i > 0){
          const zT = z - 6, zB = z - FH + 20, sA = fW + fSide*5, sB = fW + fSide*16;
          poly([P(sA,fb1-6,zT),P(sA,fb0+8,zB),
                P(sB,fb0+8,zB),P(sB,fb1-6,zT)], shade(steel,.66));
          for(let k=0;k<9;k++){
            const t = (k+0.5)/9;
            const b = (fb1-6) + ((fb0+8)-(fb1-6))*t, zz = zT + (zB-zT)*t;
            T(sA, sB, b-2.6, b+2.6, zz, shade(steel,1.25));
          }
          tube(sB, fb1-6, zT+22, sB, fb0+8, zB+22, 1.3, shade(steel,1.4));
        }
      }
      for(let k=0;k<7;k++)                                          // drop ladder
        tube(fW+fSide*7, -30, G+18-8-k*11, fW+fSide*15, -30, G+18-8-k*11, 1.1, shade(steel,1.2));
      tube(fW+fSide*7, -30, G+12, fW+fSide*7, -30, G-72, 1.1, shade(steel,1.35));
      tube(fW+fSide*15, -30, G+12, fW+fSide*15, -30, G-72, 1.1, shade(steel,1.35));
    }

    if(state.roof){
      /* THE TANK WAS STACKING ON THE SIGN FRAME. Its depth key (a+b+z)
         is 194 against the frame's 332, so it stands well behind, and
         it was drawn after -- and at b -160..-120 its screen-a of
         189..280 caught the frame's own 85..192. Back to b -210..-165
         (screen-a 234..330), and the order comes off depthSort. A roof
         tank also stands on legs; this one was a box sitting flat on
         the plate. */
      depthSort([
        { a: 95, b: -188, z: H+34, draw: () => {
            for(const [la,lb] of [[76,-200],[114,-200],[76,-172],[114,-172]])
              cyl(la, lb, H, H+20, 3, '#6a5039');
            slab(70,120, H+20, H+26, -168, -204, '#7a5c44', '#6a5039', '#8b6a4e');
            cyl(95, -186, H+26, H+70, 25, '#8b6a4e', '#9c7b5c');
            plateHoop(95, -186, H+40, 25, '#6a5039', 2.4);
            plateHoop(95, -186, H+58, 25, '#6a5039', 2.4); } },
        { a: 98, b: -40, z: H+48, draw: () => {
            /* AN OPEN FRAME, which is what a roof sign frame is. It was
               a translucent slab with a solid return, so it read as a
               black plank on two sticks rather than as ironwork with
               sky through it. Four members and nothing between. */
            const s0 = W*0.18, s1 = W*0.68, sz0 = H+44, sz1 = H+66;
            cyl(s0+7, -40, H+16, sz1, 3, '#6d747c');
            cyl(s1-7, -40, H+16, sz1, 3, '#6d747c');
            slab(s0, s1, sz1-4, sz1, -36, -44, '#7d838a', '#5d646b', '#8f969d');
            slab(s0, s1, sz0, sz0+4, -36, -44, '#7d838a', '#5d646b', '#8f969d');
            slab(s0, s0+4, sz0, sz1, -36, -44, '#6d747c', '#5d646b', '#8f969d');
            slab(s1-4, s1, sz0, sz1, -36, -44, '#6d747c', '#5d646b', '#8f969d');
            for(let i=1;i<4;i++)
              slab(s0+(s1-s0)*i/4-1.5, s0+(s1-s0)*i/4+1.5, sz0+4, sz1-4,
                   -38, -42, '#6d747c'); } }
      ]);
    }
    /* stoop removed at Sir's direction: the entrance is level now, and
       the hood no longer needs anything standing under it. */
    kerb(p,'none');
  }
},
{
  name:'Fishmonger', head:'Open marble counter, iced slab, striped awning',
  cTodo:'1 pavement props need collision volumes',
  fTodo:'z130..152 lettering behind board',
  tags:['open frontage','counter that projects','shallow ice slab','fish as solids','bracket sign over the pavement'],
  desc:'A wet-fish shop is an open counter with ice on it and a dark shop behind, so the depth runs pavement, counter, ice, interior — and the fish are laid on a shallow slab you can see the top of rather than pinned to a wall of ice.',
  draw(p){
    /* ================= WHAT WAS WRONG, MEASURED =================
       Five faults, and four of them were one mistake each about depth:

       1  The stall base read slab(..., -1, 40). slab draws its single F
          at bFront, so bFront must be the b NEARER the eye -- the larger
          one. Passed (-1, 40) it painted the FAR face and left the near
          one open, so the base was a flat blue flap on the pavement.
       2  The ice bed hung in the air. Its front lip bottomed at z 48
          against a base whose top was 16 -- a 32-unit gap under the
          whole display.
       3  It was also enormous: 48 units of fall over 40 of projection,
          which put a pale wedge across the entire facade and left no
          shop behind it.
       4  The bracket sign hung INTO the block. Its arm ran b -4 to -30
          and the board sat at -28..-34, so a sign meant to be read from
          the pavement was buried in the wall.
       5  The door was at W*0.87, which clamps to 191.88 and leaves one
          unit of corner pier, and the window at 188.6..218 sat inside
          the door surround for its whole width.

       Rebuilt on what the shop actually is. The depth runs pavement,
       counter, ice, dark interior -- four planes at four b values, in
       that order, so the eye reads into the shop instead of at a sheet.
       The ice is a SHALLOW slab sloping toward the street, which is how
       a real one presents its fish; the fish are solids lying on it. */
    const wall = '#eef2f3', trim = '#2f6f8f', H = 158;
    const ice = '#e6f2f5', dark = '#16232a';
    body(wall, trim, H);
    slab(16, W-16, H, H+12, -1, -12, trim, shade(trim,.72), shade(trim,1.2));
    slab(16, W-16, H-28, H-6, -1, -9, trim);                    // name fascia
    F(26, W-26, H-23, H-11, wall, null, 0, -9.5);
    for(let i=0;i<12;i++) F(i*(W/12), i*(W/12)+1.6, 0, H-28, shade(wall,.9), null,0,-1);
    for(let r=0;r<6;r++)  F(0, W, 18+r*20, 19.6+r*20, shade(wall,.9), null,0,-1);

    /* ---- the open front, and a dark shop behind it ---- */
    const oA0 = 12, oA1 = 138, oZ = 104;
    reveal(oA0, oA1, 0, oZ, 30, dark);
    for(let i=0;i<4;i++)                                         // things hanging inside
      F(oA0+18+i*28, oA0+24+i*28, 62, 92, shade(dark,2.1), null, 0, -26);

    /* ---- the counter: it projects, but 26, not 34 ----
       A wet-fish counter does stand out onto the pavement; what it must
       not do is stand 22 units past the return. b 0..26 from a 20 puts
       its near corner 6 outside the silhouette, the same order as an
       awning, and the tiling goes on the face that is actually seen. */
    const cA0 = 20, cA1 = 138, cOut = 26, cZ = 66;
    box(cA0, cA1, 0, cOut, 0, cZ, shade(wall,1.03), wall, shade(wall,.84));
    for(let i=0;i<10;i++)
      poly([P(cA0+6+i*12, cOut+0.4, 6),P(cA0+7.4+i*12, cOut+0.4, 6),
            P(cA0+7.4+i*12, cOut+0.4, cZ-6),P(cA0+6+i*12, cOut+0.4, cZ-6)], shade(wall,.88));
    poly([P(cA0, cOut+0.4, cZ-6),P(cA1, cOut+0.4, cZ-6),
          P(cA1, cOut+0.4, cZ-9),P(cA0, cOut+0.4, cZ-9)], trim);   // counter edge stripe

    /* ---- the ice: a shallow slab, back edge high, front lip low ---- */
    const iA0 = cA0+5, iA1 = cA1-5, iB0 = 3, iB1 = cOut-3, iZB = 80, iZF = 71;
    const iceZ = b => iZB + (iZF-iZB)*(b-iB0)/(iB1-iB0);
    box(cA0+2, cA1-2, 1, cOut-1, cZ, cZ+4, shade(trim,1.5), trim, shade(trim,.8));  // tray
    poly([P(iA0,iB0,iZB),P(iA1,iB0,iZB),P(iA1,iB1,iZF),P(iA0,iB1,iZF)], ice);
    poly([P(iA0,iB1,iZF),P(iA1,iB1,iZF),
          P(iA1,iB1,cZ+4),P(iA0,iB1,cZ+4)], shade(ice,.86));        // the lip you see
    for(let i=0;i<26;i++){                                          // chipped ice
      const t = ((i*37)%100)/100, u = ((i*61)%100)/100;
      const a = iA0+2 + (iA1-iA0-4)*t, b = iB0+1 + (iB1-iB0-2)*u;
      ball(a, b, iceZ(b)+1.2, 1.9, i%3 ? '#f4fafc' : shade(ice,1.05));
    }
    /* A FISH IS A SOLID LYING DOWN. These were two spheres with a flat
       triangle stuck on, drawn in the frontage plane, so they read as
       bubbles pinned to a wall. A body is a capped tube along a, and
       the tail and fin are triangles in the HORIZONTAL plane, at the
       fish's own z, so the whole thing lies on the ice. */
    /* z IS AN ARGUMENT, not a lookup. The first cut had fish() read its
       height off iceZ(), which is the counter slab's own slope, and then
       called it for the crates on the pavement too -- b 38..48 is off
       the end of that ramp, so it extrapolated to z 64 and three fish
       hung in the air beside the shop. Anything drawn in two places
       takes its position from the caller. */
    const fish = (a,b,z,len,r,col) => {
      poly([P(a+len/2-2, b, z),P(a+len/2+8, b-5, z),P(a+len/2+8, b+5, z)], shade(col,.78));
      tube(a-len/2, b, z, a+len/2, b, z, r, col);
      poly([P(a-2, b, z),P(a+6, b, z),P(a+2, b-5.5, z)], shade(col,.88));
      ball(a-len/2+3, b-r*0.45, z+r*0.35, 1.3, '#12181c');
    };
    const FC = ['#93b0bd','#c4907c','#8aa6b6','#b9c6cc','#a8807a','#9db8c4'];
    /* laid in two rows against the slab rather than scattered: a back
       row of three set between a front row of four, so the row reads as
       arranged and every tail lands short of the next fish's head */
    depthSort([...[0,1,2,3].map(i => ({ a: 44+i*24, b: iB1-5 })),
               ...[0,1,2].map(i => ({ a: 56+i*24, b: iB0+4 }))]
      .map((f,i) => ({ a: f.a, b: f.b, z: iceZ(f.b)+3.6,
                       draw: () => fish(f.a, f.b, iceZ(f.b)+3.6, 16, 4.2, FC[i%FC.length]) })));

    /* ---- door, with a corner pier this time ---- */
    shopDoor(180, trim, wall, 'rgba(150,190,205,.55)');

    /* ---- the awning: it is what keeps sun off a fish counter ---- */
    const wA0 = 28, wA1 = 152, wOut = 38, wZ0 = 112, wZ1 = 128;
    for(let i=0;i<8;i++){
      const x0 = wA0+(wA1-wA0)*i/8, x1 = wA0+(wA1-wA0)*(i+1)/8;
      poly([P(x0,0,wZ1),P(x1,0,wZ1),P(x1,wOut,wZ0),P(x0,wOut,wZ0)], i%2 ? '#f4f8f9' : trim);
    }
    poly([P(wA0,wOut,wZ0),P(wA1,wOut,wZ0),
          P(wA1,wOut,wZ0-9),P(wA0,wOut,wZ0-9)], shade(trim,.78));
    poly([P(wA1,0,wZ1),P(wA1,wOut,wZ0),
          P(wA1,wOut,wZ0-9),P(wA1,0,wZ1-9)], shade(trim,.62));

    /* ---- bracket sign, OVER the pavement and clear of the awning ----
       A projecting sign is read edge-on from up the street, so its board
       lies in the a plane and it hangs on positive b. Set over the door
       at a 196..202 its screen-a runs 162..196, inside the return, and
       it is clear of the awning's 152. */
    /* THE SIGN WAS HANGING ACROSS THE DOOR. Its board ran z 74..104
       against a door whose surround heads at 114.95, so the whole board
       sat over the opening -- and a bracket sign is hung high precisely
       so people can walk under it. The arm goes up to 154, between the
       fascia top at 152 and the parapet at 158, and the board hangs
       118..146, clearing the door head by 3. It passes in front of the
       fascia, which is what a bracket sign does. */
    const gA = 196, gB0 = 8, gB1 = 36, gZ0 = 118, gZ1 = 146, gArm = 154;
    tube(gA+3, 3, gArm, gA+3, gB1, gArm, 1.6, '#4a4f55');
    tube(gA+3, gB1-2, gArm, gA+3, gB1-2, gZ1, 1.4, '#4a4f55');
    tube(gA+3, gB0+2, gArm, gA+3, gB0+2, gZ1, 1.4, '#4a4f55');
    T(gA, gA+6, gB0, gB1, gZ1, shade(trim,.7));
    S(gA+6, gB0, gB1, gZ0, gZ1, trim);
    poly([P(gA,gB1,gZ1),P(gA+6,gB1,gZ1),P(gA+6,gB1,gZ0),P(gA,gB1,gZ0)], shade(trim,.6));
    S(gA+6.6, gB0+4, gB1-4, gZ0+5, gZ1-5, wall);
    for(let i=0;i<3;i++) S(gA+7, gB0+7+i*8, gB0+12+i*8, gZ0+9, gZ1-9, trim);

    /* pavement crates removed at Sir's direction. */
    if(state.roof){
      /* gull removed at Sir's direction; with one object left on the
         roof there is nothing to sort against, so the depthSort goes
         with it rather than sitting there wrapping a single call. */
      box(W*0.34, W*0.58, -132, -88, H, H+22, '#9aa0a6','#7d838a','#6a7076');
    }
    kerb(p,'none');
  }
},
{
  name:'Garage', ww: T2*4.4,
  fTodo:'z126..150 lettering behind board',
  wTodo:'two packing slots',
  head:'Two full-size bays, open workshop, turbine vents',
  tags:['two bays a car actually fits','double-width unit','truck in the open bay','turbine vents','oil drums'],
  desc:'Sized against the game car rather than against the frontage: two bays of 132 for a 60-wide car, which needs twice a normal shop unit — the first building in the library that does.',
  draw(p){
    /* ================= THIS SHOP IS TWO UNITS WIDE =================
       Measured, the old bays did not admit a car. The game's car is
       len 150, wid 60; the bays were 62.5, so a car had 1.25 units of
       clearance a side -- it did not fit, and a garage whose doors a car
       cannot pass is a shed with stripes painted on it. Depth and height
       were never the problem: STORE_DEPTH 276 takes the 150 length and
       the opening is 168 game units tall against a ~76 car.

       Two bays cannot be bought inside one frontage. Take the pedestrian
       door and its surround (74.2), a 13 corner pier, a 5 pier to the
       bay and a 12 margin, and 125.8 is left -- 59.9 a bay, which is
       LESS than the car. So the building gets wider instead.

       ww = T2*4.4 = 404.8, which is exactly two of packEdgeNoGap's own
       slots (avgW = T2*2.2 = 202.4). Anchored on the packer rather than
       chosen, so the port is a clean "this shop occupies two slots"
       rather than a number somebody has to reverse-engineer.

       THE PORT DOES NOT SUPPORT THIS YET -- see wTodo and the WIDE
       UNITS note at the head of this file. In the game u.w comes OUT of
       packEdgeNoGap (range ~162..243) and is passed INTO drawStoreUnit;
       a shop drawing wider than its slot would lap onto its neighbour,
       which is the same fault as a cornice crossing a return, at
       building scale. The lab is where this gets designed; the packer
       has to learn to emit a double slot before it ships. */
    const WW = T2*4.4;
    const wall = '#3f4a52', trim = '#e8a13a', H = 158;
    body(wall, trim, H, WW);
    slab(14, WW-14, H, H+12, -1, -12, trim, shade(trim,.72), shade(trim,1.2));
    slab(14, WW-14, H-32, H-8, -1, -8, shade(wall,1.3));
    F(26, WW-26, H-27, H-13, trim, null, 0, -8.5);

    /* ---- the bays, sized off the car ----
       132 each for a 60-wide car is 36 of clearance a side, a bay/car
       ratio of 2.2 -- roomy, and roomy is right for a workshop where a
       door gets driven through twice an hour. */
    const BAYS = [[20,152],[168,300]], bayZ = H-44, shop = '#20262b';
    /* BAY 1, SHUT. Roller down, so it is a curtain with a vision strip
       across it, and nothing behind it to draw. */
    {
      const [x0,x1] = BAYS[0];
      F(x0-6, x1+6, 0, H-34, shade(wall,.72), null, 0, 1);
      F(x0, x1, 0, bayZ, '#8c9298', shade(wall,1.4), 2, -1);
      for(let j=0;j<11;j++) F(x0+2, x1-2, 5+j*11, 11+j*11, '#a2a8ae', null, 0, -2);
      F(x0+2, x1-2, H-58, H-48, '#5d6a74', null, 0, -2.4);
      for(let k=0;k<4;k++)
        F(x0+10+(x1-x0-20)*k/4, x0+10+(x1-x0-20)*(k+0.62)/4, H-56, H-50, '#9fc2d4', null,0,-2.6);
    }
    /* ================= BAY 2, OPEN, WITH A TRUCK IN IT =================
       The point of building a bay a vehicle fits is to put a vehicle in
       it. Everything behind the opening is bounded by the opening, so
       the whole workshop is clipped to it -- the rule reveal() follows,
       and the reason the truck can run 140 deep into a shop while only
       its back end is ever on screen.
       The truck is nose-in with its tail to the street, which is how a
       vehicle sits in a bay and also what puts its readable end -- rear
       doors, bumper, lights -- where the eye is. It is 60 wide against
       the car's own 60, centred in the 132 bay, so the clearance you can
       see is the clearance that was designed. */
    {
      const [x0,x1] = BAYS[1], deep = 130;
      F(x0-6, x1+6, 0, H-34, shade(wall,.72), null, 0, 1);
      ctx.save();
      poly([P(x0,0,bayZ),P(x1,0,bayZ),P(x1,0,0),P(x0,0,0)]);
      ctx.clip();
      F(x0, x1, 0, bayZ, shop, null, 0, -deep);                       // back of the shop
      S(x0, 0, -deep, 0, bayZ, shade(shop,1.25));                     // side wall
      T(x0, x1, 0, -deep, 0, '#39424a');                              // shop floor
      for(let i=1;i<5;i++)                                            // floor bay markings
        T(x0, x1, -i*26-1, -i*26+1, 0.3, '#4a545d');
      const tA0 = 204, tA1 = 264, cab = '#2f6f8f';
      depthSort([
        /* THE ONLY PLACE THINGS SHOW. The truck sweeps screen-a 224 at
           its tail to 404 at its nose, and the bay's own clip ends at
           300, so everything else in the workshop has to live in the
           band 168..224 -- which at b -34 means a up to 190, and at
           b -60 means nothing at all. Props deeper than that are drawn
           and then hidden by the truck, which is work for no picture. */
        { a: 184, b: -34, z: 20, draw: () => {
            for(let i=0;i<4;i++) cyl(184, -34, i*10, i*10+10, 14, i%2?'#2b2f33':'#33383d'); } },
        { a: 232, b: -80, z: 55, draw: () => {
            /* the truck: box body, tail to the street */
            box(tA0-3, tA1+3, -118, -92, 0, 17, '#1a1e22','#23282d','#15181b');   // rear axle
            box(tA0-3, tA1+3, -46, -26, 0, 17, '#1a1e22','#23282d','#15181b');    // front axle
            box(tA0, tA1, -140, -20, 15, 94, shade(cab,1.15), cab, shade(cab,.78));
            F(tA0+4, tA1-4, 22, 86, shade(cab,.86), null, 0, -19.4);              // rear doors
            F(tA0+31, tA1-27, 22, 86, shade(cab,.7), null, 0, -19.2);             // door split
            F(tA0+8, tA0+14, 48, 56, '#c9ced3', null, 0, -19.0);                  // handles
            F(tA1-14, tA1-8, 48, 56, '#c9ced3', null, 0, -19.0);
            box(tA0-3, tA1+3, -22, -16, 8, 16, '#767c82','#878d94','#5f656b');    // bumper
            F(tA0+3, tA0+11, 26, 34, '#c94f4f', null, 0, -19.0);                  // lamps
            F(tA1-11, tA1-3, 26, 34, '#c94f4f', null, 0, -19.0);
            slab(tA0, tA1, 94, 98, -22, -138, shade(cab,1.3)); } },
        { a: 180, b: -10, z: 17, draw: () => {
            cyl(180, -10, 0, 34, 12, '#c2452e');
            plateCircle(180, -10, 34, 12, '#a53a26', '#8d3120', 2); } }
      ]);
      ctx.restore();
      /* the curtain rolled up into its drum, which is what an open
         roller door leaves behind rather than a bare hole */
      tube(x0+2, -5, bayZ-9, x1-2, -5, bayZ-9, 9, '#8c9298');
      F(x0+2, x1-2, bayZ-19, bayZ-15, '#5d6a74', null, 0, -2);
    }
    for(const [x0,x1] of BAYS){
      slab(x0-6, x1+6, bayZ, H-34, -2, -9, trim);                     // lintel
      poly([P(x0-6,1.2,H-34),P(x1+6,1.2,H-34),P(x1+6,1.2,H-38),P(x0-6,1.2,H-38)], shade(trim,.7));
    }
    /* the mullion between the bays is a pier, so it gets a pier's
       thickness rather than being a gap in a painted stripe */
    slab(152, 168, 0, H-34, 1, -6, shade(wall,1.12), shade(wall,.9), shade(wall,1.3));
    shopDoor(WW-13-4-SHOP_DOOR_W/2, wall, trim, null, WW);

    /* NOTHING ON THE PAVEMENT. The pylon and the last tyre stack went
       at Sir's direction, and with them the whole kerb-prop block: the
       drums and tyres that used to stand out here are inside the open
       bay where a workshop keeps them, and the truck in that bay is the
       shop's identity now rather than a sign on a post.
       The bay contents are deliberately NOT under state.props -- they
       are the building, not street furniture, and the toggle is for
       things that sit on the pavement. */
    if(state.roof){
      for(const aa of [WW*0.20, WW*0.46, WW*0.72]){
        cyl(aa, -110, H+12, H+28, 9, '#8f969d');
        cyl(aa, -110, H+28, H+36, 13, '#b6bcc2');
        plateCircle(aa, -110, H+36, 13, '#c8ced4', '#8f969d', 2);
        for(let k=0;k<6;k++){
          const t=k*1.047;
          poly([P(aa,-110,H+37),
                P(aa+13*Math.cos(t), -110+13*Math.sin(t), H+37),
                P(aa+13*Math.cos(t+0.5), -110+13*Math.sin(t+0.5), H+37)], '#a8aeb4');
        }
      }
      box(WW*0.80, WW*0.94, -180, -140, H, H+22, '#8f969d','#787f86','#697077');
    }
    kerb(p,'none');
  }
},
{
  name:'Tailor', head:'Narrow bay, bracket clock, mannequins',
  tags:['narrow unit','bracket clock','turned mannequins','half canopy','carved parapet'],
  desc:'The clock face lies in the plane of its own bracket rather than facing the screen, and the mannequins are turned cylinders on stands with rounded heads.',
  draw(p){
    const wall = '#4a3b52', trim = '#d8c48a', H = 172, WW = 170;
    body(wall, trim, H, WW);
    slab(0,WW, H, H+8, -1, -12, shade(wall,.7));
    slab(WW*0.24,WW*0.76, H+8, H+22, -2, -12, shade(wall,.85), null, trim);
    F(WW*0.40,WW*0.60, H+12, H+20, trim, null,0,-2.5);
    /* THE DOOR WAS WRAPPING THE CORNER, the same fault as the hardware
       store, the florist, the fishmonger and the cinema. shopDoor was
       asked for WW*0.80 = 136 and clamped to 131.88, which puts the
       painted surround's far edge on 169 against a 170 return -- one
       unit of wall, so the surround read as turning onto the flank
       instead of being an opening in a facade.
       Everything moves together. Door mid 119.88 leaves a 13 corner
       pier, and the window and canopy pull from WW*0.58/0.60 back to 78
       so the pier on the other side comes out at 4.76 -- the same 4.8
       the grocer and the noodle bar settled on. The two mannequins at
       26 and 66 have far faces on 74, still inside the shorter window. */
    F(10, 72, 22, 116, '#8a94a8', trim, 3);
    if(state.props){
      for(let i=0;i<2;i++){
        /* the window lost 20 units when the door moved for its corner
           pier, and at 26/66 the second mannequin's screen span reached
           78 -- flush with the new window edge, so it read as standing
           on the pier. 24/58 puts its far side on 70, 8 clear. */
        const ma = 24+i*34, mb = -4;
        cyl(ma, mb, 26, 34, 4, '#8a8272');                     // stand
        cyl(ma, mb, 34, 86, 8, ['#d8c48a','#c2807e'][i]);      // torso
        cyl(ma, mb, 86, 92, 5, ['#d8c48a','#c2807e'][i]);
        ball(ma, mb, 98, 6, '#e8ddc8');
      }
    }
    shopDoor(119.88, wall, trim, 'rgba(138,148,168,.6)', WW);
    /* THE SIGN BAND'S END RETURN WAS ON THE CORNER. It ran 6..164 at
       b -1..-9, and a slab at negative b projects RIGHT on screen by
       its own depth, so its return landed on screen-a 173 against a 170
       return -- 3 units of fascia lying on the flank, which is the hard
       vertical edge at the corner.
       This is the applied-signage case, not the structural one: a
       cornice may wrap a corner because it belongs to the building, but
       a name board belongs to ONE shopfront and the neighbour's board
       occupies that space. The margin has to beat the recess, so 16
       against a depth of 9 puts the return on 163 and clears by 7.
       (The parapet above it stays full width at 0..WW on purpose --
       that one is a cornice.) */
    slab(16, WW-16, 120, 146, -1, -9, shade(wall,.6));
    /* ================= THE FASCIA, SET OUT IN SCREEN SPACE =================
       Screen-a is a - b, so two things given the same `a` at different
       `b` are NOT aligned, and nothing about that shows in the numbers
       you write. This board had three depths on it and every one of
       them drifted:

         board face   b -1.0   a  16..154  ->  screen  17.0..155.0
         lettering    b -9.5   a  24.. 69  ->  screen  33.5.. 78.5
                              a 101..146  ->  screen 110.5..155.5
         clock        b +1.6   a       85  ->  screen  83.4

       The lettering sat at -9.5, DEEPER than the board's own back face
       at -9, so it was behind the board and shifted 9.5 right by the
       projection -- the right panel ran off the board's end. The clock
       was proud at +1.6 and shifted LEFT. Put a-centred at 85 they came
       out 11 apart on screen: 9.1 of overlap on the left panel and 13.1
       of gap on the right. That lopsidedness is the whole complaint,
       and it is invisible in `a`.

       So the fascia is laid out in SCREEN space and converted back.
       Lettering goes to -0.5, PROUD of the board face at -1 the way
       paint on a board is, and every gap comes out at 8:

         board   screen  17..155      clock  screen  74..98
         panels  screen  25.. 66             screen 106..147
         margins        8    8      8     8                     */
    F(24.5, 65.5, 126, 140, trim, null, 0, -0.5);
    F(105.5, 146.5, 126, 140, trim, null, 0, -0.5);
    /* the awning's top corner is at screen-a 72 and the dial starts at
       74, so it stops 2 clear instead of clipping the clock's lower
       left; the window follows it and the pier to the door goes to
       10.76 */
    poly([P(8,0,118),P(72,0,118),P(72,24,100),P(8,24,100)], trim);
    poly([P(8,24,100),P(72,24,100),P(72,24,92),P(8,24,92)], shade(trim,.7));
    poly([P(72,0,118),P(72,24,100),P(72,24,92),P(72,0,110)], shade(wall,.6));
    /* ================= THE CLOCK =================
       Two faults, and neither was about where it sat.

       IT HUNG INSIDE THE BUILDING. The arm ran b -2 to -22, and
       negative b is INTO the block, so a clock meant to be read from
       the pavement was buried in the wall -- the same fault the
       fishmonger's bracket sign had.

       AND IT WAS NOT CENTRED: a = WW*0.79 = 134.3 on a 170 frontage
       put it over the door and half off the corner.

       It is a flat clock on the fascia, so it needs no arm at all --
       the b -2..-22 tube was solving a problem the shop does not have.
       faceCircle is the right primitive for that: the frontage plane,
       b fixed, which is exactly where a wall clock's dial lies. It sits
       proud at b 1.6 against a band whose face is at -1, so it reads as
       fixed to the fascia rather than painted on it, and the name runs
       either side of it instead of behind it. */
    const clA = 87.6, clB = 1.6, clZ = 133, clR = 12;
    faceCircle(clA, clB, clZ, clR+2, shade(trim,.55));           // bezel
    faceCircle(clA, clB+0.4, clZ, clR, '#f2ece0');
    for(let i=0;i<12;i++){                                       // hour marks
      const t = i*Math.PI/6, r0 = clR*0.84, r1 = clR*0.97;
      poly([P(clA+r0*Math.sin(t)-0.7, clB+0.8, clZ+r0*Math.cos(t)),
            P(clA+r1*Math.sin(t)-0.7, clB+0.8, clZ+r1*Math.cos(t)),
            P(clA+r1*Math.sin(t)+0.7, clB+0.8, clZ+r1*Math.cos(t)),
            P(clA+r0*Math.sin(t)+0.7, clB+0.8, clZ+r0*Math.cos(t))], shade(trim,.5));
    }
    faceT(clA, clB+1.0, clZ, clR);
    ctx.strokeStyle='#3a3327'; ctx.lineWidth=2/(clR*K); ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,0.58); ctx.stroke();      // hour hand
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0.44,-0.6); ctx.stroke();   // minute hand
    ctx.lineCap='butt'; ctx.restore();
    ball(clA, clB+1.2, clZ, 1.5, shade(trim,.45));               // centre boss
    if(state.roof) box(WW*0.28,WW*0.56,-140,-100,H,H+20,'#9aa0a6','#7d838a','#6a7076');
    kerb(p,'none');
  }
},
{
  name:'Cantina', head:'Pergola porch, string bulbs, chimney',
  cTodo:'5 pavement props need collision volumes, 67 of them lapping past the frontage',
  fTodo:'z140..152 return +6',
  tags:['round pergola posts','string bulbs','half doors','barrels','stucco chimney'],
  desc:'Pergola posts are turned cylinders with the beam sitting on them, the barrels are hooped cylinders standing on the pavement, and the chimney gets a clay pot.',
  draw(p){
    const wall = '#d9a05b', trim = '#7a4a2e', H = 152, pb = 52;
    body(wall, trim, H);
    slab(0,W, H, H+12, -1, -12, shade(wall,.62));
    slab(0,W, H-12, H, -1, -6, shade(wall,1.08));
    F(14,W*0.54, 24, 100, '#5d4a3a', shade(wall,.6), 3);
    F(20,W*0.48, 32, 64, shade(wall,1.15), null,0,-1);
    shopDoor(W*0.75, wall, '#6b4a30', null, W, 0, { half:true });
    /* THE HALF DOORS WERE PAINTED ON THE REAL ONE. Two strips at
       b -6.5 -- inside the wall, behind the leaf shopDoor puts at 0.6 --
       so they showed as a stray line and a tick beside the opening. The
       first fix moved them onto the leaf, which was worse: the shop then
       had a full door AND a pair of saloon doors in the same opening.
       A half door replaces the leaf, so it is the kit's job. */
    /* ================= THE PERGOLA STOOD IN THE DOORWAY =================
       Two faults, and only ONE of them was about the beam's length.

       The posts sat at a 10, 115, 220 against b 52, and screen-a is
       a - b, so they landed on -42, 63 and 168. The door runs screen
       135..209, so the third post was planted in the middle of the only
       way in -- and the first was 42 units past the left return,
       standing on the neighbour.

       Shortening the run to clear the door fixed the posts and threw
       away the porch, which is the thing worth having. The beam does
       not need to be short; it needs to be HIGH. At the old soffit of
       106 a full-width run would have crossed the door head at 114.95
       and sliced the doorway -- so the whole porch goes up 14. Soffit
       120 clears the head by 5, the rafter plane tops at 138 against a
       fascia band starting at 140, and at game z 180 it clears Tipsy's
       flag tip by 83.

       The run is 42..224: the near end is 10 outside the silhouette,
       the same 10 the grocer's canopy and the fishmonger's awning
       carry, because a canopy that projects at all must show outside
       it. Posts at 46, 110, 174 land on screen -6, 58 and 122, all of
       them clear of the door. */
    const pA0 = 42, pA1 = W-6, pZ = 132;
    for(const aa of [46, 110, 174]) cyl(aa, pb, 0, pZ, 5, '#6b4a30');
    poly([P(pA0,pb,pZ),P(pA1,pb,pZ),P(pA1,pb,pZ-12),P(pA0,pb,pZ-12)], '#7a5638');
    poly([P(pA0,0,pZ+6),P(pA1,0,pZ+6),P(pA1,pb,pZ),P(pA0,pb,pZ)], 'rgba(122,86,56,.55)');
    for(let i=0;i<11;i++){
      const aa = pA0+4+(pA1-pA0-8)*i/10;
      poly([P(aa-3,0,pZ+6),P(aa+3,0,pZ+6),P(aa+3,pb,pZ),P(aa-3,pb,pZ)], '#8a6440');
      poly([P(aa-3,0,pZ+6),P(aa-3,pb,pZ),P(aa-3,pb,pZ-4),P(aa-3,0,pZ+2)], '#7a5638');
    }
    if(state.props){
      for(let i=0;i<8;i++){
        const ba = pA0+8+(pA1-pA0-16)*i/7;
        tube(ba, pb-4, pZ-8, ba, pb-4, pZ-16, 0.7, '#5d4a3a');
        ball(ba, pb-4, pZ-20, 5, '#ffe9a8');
      }
      /* THE BARRELS WERE ON THE NEIGHBOUR'S PAVEMENT. At a W+20 and
         W+52 with a hoop radius of 16 they reached 298 against a 230
         frontage -- 68 units past the return, which on a packed
         commercial edge is the next shop's ground. They keep their
         place on the open pavement, street side of the pergola line, at
         a 150 and 188: inside 0..W, and far enough out in b to read as
         standing in front of the porch rather than under it. */
      for(const [ba,bb] of [[150,66],[188,78]]){
        cyl(ba, bb, 0, 32, 15, '#8a5a34');
        for(const hz of [6, 16, 26]) plateHoop(ba, bb, hz, 16, '#5c3d22', 2.5);
        plateCircle(ba, bb, 32, 15, '#a06a3e', '#75492a', 2);
      }
    }
    if(state.roof){
      box(W*0.16,W*0.34,-120,-84,H,H+40, shade(wall,.9), shade(wall,.75), shade(wall,.62));
      cyl(W*0.25, -102, H+40, H+56, 8, '#8a4f34');
      plateCircle(W*0.25, -102, H+56, 8, '#5d4a3a');
      box(W*0.52,W*0.78,-160,-120,H,H+18,'#9aa0a6','#7d838a','#6a7076');
    }
    kerb(p,'none');
  }
},
{
  name:'Newsagent', head:'Full shopfront, headline placards, rack of papers',
  tags:['full unit','glazed front','sloping paper racks','placard boards','fascia set out in screen space'],
  desc:'A shop rather than a kiosk: full frontage, full depth, one shopfront storey, with the papers racked on the pavement under its own awning instead of on the neighbour.',
  draw(p){
    /* ================= IT WAS A KIOSK IN A ROW OF SHOPS =================
       The old unit was built for scale contrast -- its own tags said
       "half height", "small footprint" -- and that does not survive
       contact with a packed commercial edge:

         frontage 150 against the packer's 202.4 slot  = 0.74 of one,
                  so it leaves a hole in a run that has no gaps
         depth    120 against STORE_DEPTH 276          = 0.43, and the
                  block behind shows straight through
         height   104 against one shop storey of 168   = 0.62

       And it did not stay inside itself. The canopy ran a -34 to 184
       at out 58, which puts its near end on screen-a -92: ninety-two
       units standing on the neighbour. Both prop racks sat entirely
       outside 0..150 as well.

       Rebuilt as a building, on the rules the rest of the library has
       been settling: full W and D, H 184 (1.10 storeys, so no zTodo),
       a door with a 13 corner pier, an awning that overhangs by the
       usual 10, a fascia whose margin beats its recess, and every
       pavement prop inside the frontage. */
    const wall = '#2f6350', trim = '#e8c34a', H = 184;
    const dark = '#16241f', paper = '#e8e3d6';
    body(wall, trim, H);
    slab(0, W, H, H+12, -1, -12, shade(wall,.62), shade(wall,.5), shade(wall,.8));
    slab(W*0.32, W*0.68, H+12, H+30, -1, -10, shade(wall,.62), shade(wall,.5), trim);
    F(W*0.37, W*0.63, H+17, H+25, trim, null, 0, -0.5);

    /* ---- the fascia, set out in screen space ----
       board face b -1 spans screen 17..215, centre 116; the lettering
       goes PROUD at -0.5 and is centred on that, not on `a`. Margin 16
       against a depth of 9 puts the return on 223, seven clear. */
    slab(16, W-16, 138, 164, -1, -9, shade(wall,.5), shade(wall,.4), shade(wall,.72));
    F(30.5, 201.5, 144, 158, trim, null, 0, -0.5);
    /* -0.9 would have put these BEHIND the panel they sit on at -0.5,
       the same fault the fascia census counts 29 times. Proud, at -0.2. */
    for(let i=0;i<6;i++) F(38+i*28, 54+i*28, 147, 155, shade(wall,.5), null, 0, -0.2);

    /* ---- the shopfront ---- */
    /* ================= THE DISPLAY GOES INSIDE =================
       The rack and the placards were on the pavement. Inside the window
       they stop being obstacles Tipsy can hit -- this shop's collision
       register goes to nothing -- and the shopfront gets the depth it
       was missing: back wall, rack, placards, then the pane over all of
       it, four planes instead of a tinted sheet with nothing behind.

       EVERYTHING BEHIND THE OPENING IS BOUNDED BY THE OPENING, so the
       interior is clipped to it -- the rule reveal() follows. My first
       cut drew the magazines at b -24 with no clip, and a plate at -24
       projects right by 24, so the row ran 18 units past the opening's
       own edge and out onto the wall. */
    reveal(12, 138, 20, 112, 26, dark);
    ctx.save();
    poly([P(12,0,112),P(138,0,112),P(138,0,20),P(12,0,20)]);
    ctx.clip();
    for(let r=0;r<3;r++) for(let c=0;c<5;c++)          // magazines on the back wall
      F(18+c*24, 34+c*24, 40+r*24, 62+r*24,
        ['#c2452e','#3b6e75','#e8c34a','#e8e3d6','#8a5a34'][(r+c)%5], null, 0, -25);
    /* the rack, standing on the cill the reveal leaves at z 20. Trays
       slope DOWN toward the street -- back edge high at b -24, front lip
       low at -8 -- which is what presents a paper to someone outside. */
    for(const fa of [22, 108]) box(fa-3, fa+3, -24, -8, 20, 104, shade('#5a4a3a',1.1), '#5a4a3a', '#493c2f');
    for(let i=0;i<3;i++){
      const z = 34+i*24;
      poly([P(22,-24,z+16),P(108,-24,z+16),P(108,-8,z+6),P(22,-8,z+6)], paper);
      poly([P(22,-8,z+6),P(108,-8,z+6),P(108,-8,z),P(22,-8,z)], shade(paper,.8));
      for(let j=0;j<5;j++)
        poly([P(26+j*17,-23.4,z+15),P(38+j*17,-23.4,z+15),
              P(38+j*17,-8.6,z+5),P(26+j*17,-8.6,z+5)],
             ['#c2452e','#3b6e75','#e8c34a','#e8e3d6','#8a5a34'][(i+j)%5]);
    }
    for(let i=0;i<2;i++){                              // placards against the back wall
      const pa = 112+i*13;
      poly([P(pa,-10,20),P(pa+11,-10,20),P(pa+11,-24,74),P(pa,-24,74)], paper);
      for(let k=0;k<3;k++)
        poly([P(pa+2,-24.4+3.4*k,66-k*17),P(pa+9,-24.4+3.4*k,66-k*17),
              P(pa+9,-24.4+3.4*k,62-k*17),P(pa+2,-24.4+3.4*k,62-k*17)], shade(paper,.5));
    }
    ctx.restore();
    /* THE PANE HAD TO GIVE. glaze defaults to nearly opaque on purpose --
       its own note says the pane hides the fact that there is no room
       behind it -- but here there IS something behind it, and hiding a
       rack we just built is work for no picture. A 0.38 tint keeps the
       glass reading as glass while the display stays legible through
       it. Same call the record shop makes for its sleeves. */
    glaze(12, 138, 20, 112, trim, 'rgba(118,162,182,.38)');
    slab(8, 142, 112, 118, -1, -8, shade(wall,.72));   // window head
    F(0, W, 0, 20, shade(wall,.78), null, 0, -0.4);    // stallriser
    for(let i=0;i<9;i++) F(6+i*25, 8+i*25, 0, 20, shade(wall,.6), null, 0, -0.8);
    shopDoor(179.88, wall, trim, 'rgba(120,170,150,.55)');

    /* ---- the awning, over the racks ---- */
    const wA0 = 22, wA1 = 222, wOut = 32, wZ0 = 118, wZ1 = 134;
    T(wA0, wA1, 0, wOut, wZ1, shade(trim,.7));
    poly([P(wA0,wOut,wZ1),P(wA1,wOut,wZ1),P(wA1,wOut,wZ0),P(wA0,wOut,wZ0)], trim);
    poly([P(wA1,0,wZ1),P(wA1,wOut,wZ1),P(wA1,wOut,wZ0),P(wA1,0,wZ0)], shade(trim,.82));
    for(let i=0;i<10;i++)
      poly([P(wA0+6+(wA1-wA0-12)*i/10, wOut+0.5, wZ0+3),
            P(wA0+16+(wA1-wA0-12)*i/10, wOut+0.5, wZ0+3),
            P(wA0+16+(wA1-wA0-12)*i/10, wOut+0.5, wZ0+11),
            P(wA0+6+(wA1-wA0-12)*i/10, wOut+0.5, wZ0+11)], shade(trim,.66));

    /* NO PAVEMENT PROPS. The rack and the placards are inside the
       window now, so this shop stands nothing on the ground for Tipsy
       to hit and carries no collision register at all. */
    if(state.roof){
      box(W*0.34, W*0.58, -150, -110, H, H+22, '#8f969d','#787f86','#697077');
      cyl(W*0.76, -190, H, H+34, 6, '#7d838a');
    }
    kerb(p,'none');
  }
},
{
  name:'Ice cream', head:'Giant cone on the roof, hatch window, scallops',
  tags:['giant roof cone','pastel palette','serving hatch','scalloped awning','pavement seats'],
  desc:'The cone stands on a small plinth so it is planted on the roof rather than hovering, the scoops overlap as real balls, and the pavement seats are turned stools.',
  draw(p){
    const wall = '#f6e4e8', trim = '#e2748c', H = 140;
    body(wall, trim, H);
    slab(0,W, H, H+10, -1, -12, trim);
    /* fTodo cleared: at 0..W with a back face of -6 the return landed on
       screen-a 236 against 230. 12 puts it on 224. The parapet above
       stays full width -- that one is a cornice. */
    slab(12, W-12, H-14, H, -1, -6, '#fbf3f5');
    F(12,W*0.62, 30, 92, '#bcdde2', shade(trim,.85), 3);
    slab(12,W*0.62, 88, 98, -1, -7, trim);
    F(18,W*0.56, 36, 52, '#fbf3f5', null,0,-1);
    shopDoor(W*0.84, wall, trim);
    /* extra hatch pane removed at Sir's direction -- it sat between the
       main window and the door with nothing to be. */
    /* ================= THE AWNING WAS A BACK FACE SHORT AND A BACK
       FACE LONG =================
       It was built as two whole sloping PLANES ten apart, plus a quad
       closing each end. That is wrong twice over:

         * the lower plane is the awning's UNDERSIDE, and you cannot see
           the underside of a canopy from above. It was only reading at
           all because it peeks 10 below the top plane along the front,
           where what belongs is the canopy's own EDGE.
         * both ends were drawn. Positive a is toward the eye, so the
           a = W-4 end is the visible one and the a = 4 end faces away.
           That far end was a back face painted unconditionally -- the
           same fault box() carried until it was fixed to derive its
           near faces from P().

       So: a top face, a front edge where the underside used to show,
       and the near end only. */
    const cz=104, out=32, th=10;
    poly([P(4,0,cz+18),P(W-4,0,cz+18),P(W-4,out,cz),P(4,out,cz)], '#fbf3f5');
    poly([P(4,out,cz),P(W-4,out,cz),
          P(W-4,out,cz-th),P(4,out,cz-th)], shade('#fbf3f5',.82));   // the edge
    poly([P(W-4,0,cz+18),P(W-4,out,cz),
          P(W-4,out,cz-th),P(W-4,0,cz+18-th)], shade(trim,1.1));     // near end only
    for(let i=0;i<10;i++){
      const x0=4+(W-8)*i/10, x1=4+(W-8)*(i+1)/10;
      const l=P(x0,out,cz), r=P(x1,out,cz), m=P((x0+x1)/2,out,cz-14);
      ctx.beginPath(); ctx.moveTo(l.x,l.y); ctx.quadraticCurveTo(m.x,m.y+6,r.x,r.y); ctx.closePath();
      ctx.fillStyle = i%2 ? trim : '#fbf3f5'; ctx.fill();
    }
    if(state.roof){
      /* ================= THE CONE =================
         It was a flat triangle -- three points and some strokes ruled
         across it -- so a solid the height of the building read as a
         paper cut-out. A cone is an apex and a rim: sweep the visible
         half of the top circle, close it to the tip, and it has volume
         from any view the host installs, because the sweep is asked of
         plateSweep() rather than written in.

         AND IT STOOD ON THE PARAPET EDGE. b -34 against a front wall at
         b 0 put the plinth's near rim 14 short of the lip -- it read as
         about to fall off. b -104 sets it a third of the way back into
         the roof, where a rooftop sign is actually bolted down. */
      const ca = W*0.46, cb = -104, cR = 34, zTip = H+16, zTop = H+112;
      cyl(ca, cb, H, H+16, 22, '#e8dfe2');                        // plinth
      plateCircle(ca, cb, H+16, 22, '#f2ecee', '#d8ccd0', 2);
      const sw = plateSweep(ca, cb, 0), arc = u => sw.ts + sw.dir*Math.PI*u;
      const rim = (u,z) => { const t = arc(u);
        return P(ca + cR*Math.cos(t), cb + cR*Math.sin(t), z); };
      const lit = [P(ca,cb,zTip)], dark = [P(ca,cb,zTip)];
      for(let k=0;k<=20;k++) lit.push(rim(k/20, zTop));
      for(let k=0;k<=10;k++) dark.push(rim(k/20, zTop));
      poly(lit, '#e0b26a');
      poly(dark, shade('#e0b26a',.84));                            // the shaded side
      for(let k=1;k<7;k++){                                        // waffle ribs
        const t = rim(k/7, zTop), b2 = P(ca,cb,zTip);
        ctx.strokeStyle = '#c08f4a'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(t.x,t.y); ctx.lineTo(b2.x,b2.y); ctx.stroke();
      }
      plateCircle(ca, cb, zTop, cR, '#d9a75f', '#c08f4a', 2);
      ball(ca, cb, zTop+8, 30, '#f6c9d4');
      ball(ca-6, cb, zTop+40, 28, '#cfe6c8');
      ball(ca+5, cb, zTop+68, 26, '#f4e2b0');
      ball(ca+5, cb, zTop+92, 6, '#c2452e');
      box(W*0.72,W*0.94,-190,-154,H,H+18,'#9aa0a6','#7d838a','#6a7076');
    }
    /* stools removed at Sir's direction. With nothing standing on the
       ground this shop carries no collision register at all. */
    kerb(p,'none');
  }
},
{
  name:'Bank', tall:true, ww: T2*4.4,
  wTodo:'two packing slots',
  cTodo:'3 pavement props need collision volumes',   // the entrance steps
  head:'Hexastyle giant order, deep portico, pediment, stone steps',
  tags:['giant order','six columns','double-width unit','deep portico','swept pediment','tallest in the library'],
  desc:'A bank is a monument, so it is sized as one in both directions: a giant order spanning the banking hall in a single storey, two packing slots wide, with the columns standing forward of a recessed portico rather than behind it.',
  draw(p){
    /* ================= IT WAS NOT A MONUMENT =================
       H 208 is 1.24 shop storeys. The building next to it is 0.95, so a
       bank with a colonnade and a pediment stood a quarter taller than
       a laundrette. A giant order is not a stack of floors -- it is ONE
       storey the height of the whole banking hall -- and that is the
       whole reason the type exists. H 460 = 2.74 storeys, taller than
       the rooming house's 2.50 and the tallest thing here, which is
       what a bank is meant to be on a street of shops.

       THE COLONNADE ALSO STOOD ON THE WRONG SIDE OF ITS OWN WALL. The
       columns were at CB = -20, which is INTO the block, while the
       "recessed" wall behind them was drawn at b +1, PROUD of it. So
       the order was buried in the facade and the wall stood in front of
       it -- the exact opposite of what the description claimed, and the
       reason the colonnade never self-shadowed. The portico is a real
       recess now and the columns stand forward at b +8, on the podium.

       The frontage does not change. W is the block's slot; a bank on a
       narrow lot is an urban giant order, not a temple front, and at
       2.37:1 that is what this reads as. */
    /* HEIGHT ALONE MADE IT A SLICE. At the frontage of 230 a facade
       reaching 545 is 2.37:1 -- taller than wide by more than double,
       which is a tower, not a temple front. A Greek front is about
       0.6:1 and an urban bank block 1.2 to 1.5; two packing slots put
       this at 1.35:1, which is the shape the type actually has.

       ww = T2*4.4 = 404.8, exactly two of packEdgeNoGap's own slots,
       the same anchor the garage uses. THE PORT CANNOT PLACE IT YET --
       see wTodo and the WIDE UNITS note at the head of this file. That
       is now two shops waiting on one packer change rather than one,
       which is an argument for making the change rather than against.

       Six columns instead of four: r 18 on centres 24..381 gives equal
       35-unit gaps at 53% solid, and a shaft of 7.6 diameters, which is
       Doric proportion -- the right order for a bank. */
    const WW = T2*4.4;
    const wall = '#d8d2c4', trim = '#8a8375', H = 460;
    /* A DEEP RECESS SHIFTS ITS CONTENTS RIGHT BY ITS OWN DEPTH -- screen-a
       is a - b, and there is no way round it. So deepening the landing
       walks the doorway sideways into the right-hand columns: at the
       even hexastyle spacing the open centre bay is 178 on screen, and
       deep 66 put 34 of the door behind a column.
       Pairing the columns tighter widens that bay to 231 without moving
       the outer ones off the frontage -- 28/73 and 340/385, both pairs
       at 45 -- and then deep 66 costs 3 units of overlap instead of 34.
       Landing goes 66 -> 92 measured from the column's front face to
       the door wall, which is the room to breathe. */
    const colB = 8, deep = 66, COLS = [28, 73, 340, 385];
    body(wall, trim, H, WW);

    /* ---- the portico: a recess, with everything inside bounded by it ---- */
    const rA0 = 16, rA1 = WW-16, rZ = 400;
    ctx.save();
    poly([P(rA0,0,rZ),P(rA1,0,rZ),P(rA1,0,0),P(rA0,0,0)]);
    ctx.clip();
    /* the portico reads as depth only if it is LIT -- at shade .62 it
       was a dark slot behind the order and the entrance was invisible
       in it. Back wall up to .82, doorway warm rather than near-black. */
    F(rA0, rA1, 0, rZ, shade(wall,.82), null, 0, -deep);            // back wall
    S(rA0, 0, -deep, 0, rZ, shade(wall,.66));                       // jamb
    T(rA0, rA1, 0, -deep, 0, shade(wall,.9));                       // portico floor
    F(WW*0.38, WW*0.62, 0, 240, shade(wall,.56), null, 0, -deep+1); // the doorway
    F(WW*0.395, WW*0.605, 10, 228, '#5a6f7a', null, 0, -deep+1.6);
    F(WW*0.40, WW*0.455, 20, 218, 'rgba(250,244,225,.16)', null, 0, -deep+2);
    slab(WW*0.36, WW*0.64, 240, 254, -deep+2, -deep+10, shade(wall,.9));
    /* TWO WINDOWS, FLANKING. Four at a step of 106 put the middle pair
       on 140..196 and 246..302 against a doorway running 153.8..251 --
       both of them across the entrance -- and the fourth ran to 408
       past a 404.8 frontage, saved only by the recess clip. The wall
       either side of the door is 16..153.8 and 251..388.8, so one
       window in each: 44..118 and 287..361, clearing the door by 36
       on both sides. */
    /* the windows follow the deeper wall: at b -64.4 they shift 64 right
       on screen, so the right one had to come in from 287..361 (screen
       351..425, clipped by the opening at 388.8) to 254..324, which
       lands on 318..388 -- inside the clip, and 3 clear of the door. */
    for(const [wa0,wa1] of [[40,110],[254,324]])
      F(wa0, wa1, 60, 310, '#4a5a64', shade(wall,.72), 2, -deep+1.6);
    ctx.restore();

    /* ---- the podium the order stands on ---- */
    slab(0, WW, 0, 70, colB+14, -2, shade(wall,1.04), shade(wall,.86), shade(wall,1.1));

    /* ---- the giant order: four columns, standing FORWARD ---- */
    /* AN EVEN COLONNADE. At r 16 on 28..202 the order was 56% solid
       with 30-unit gaps -- a wall of columns rather than a colonnade,
       and the portico behind it never got a clear opening. r 14 on
       20..210 is 49% solid with equal 35s, and the shaft comes out at
       9.7 diameters, which is Ionic proportion for a bank. */
    /* the two centre columns are OUT at Sir's direction, leaving a wide
       central bay over the entrance. Positions are unchanged so the
       remaining four still sit on the hexastyle rhythm the frieze and
       the pediment are set out to. */
    for(const ca of COLS){
      cyl(ca, colB, 70, 88, 23, shade(wall,1.08));                  // base
      cyl(ca, colB, 88, 360, 18, wall, shade(wall,.78));            // shaft
      for(const fo of [-8, 0, 8])                                   // flutes
        F(ca+fo-1.2, ca+fo+1.2, 92, 356, shade(wall,.9), null, 0, colB+15);
      cyl(ca, colB, 360, 378, 21, shade(wall,1.10));                // capital neck
      slab(ca-25, ca+25, 378, 388, colB+24, colB-24, shade(wall,1.14));
    }

    /* ---- entablature. 6..W-6 against a back face of -4 puts the
            return on 228, inside the 230 -- a cornice may wrap, but
            nothing here needs to. ---- */
    slab(6, WW-6, 386, 408, colB+20, -4, shade(wall,.96));          // architrave
    slab(6, WW-6, 408, 438, colB+18, -4, shade(wall,1.02), shade(wall,.84), shade(wall,1.1));
    for(let i=0;i<19;i++)                                           // triglyphs
      F(16+i*20, 24+i*20, 412, 434, shade(wall,.8), null, 0, colB+18.6);
    slab(2, WW-2, 438, 460, colB+26, -6, shade(wall,1.1), shade(wall,.9), shade(wall,1.18));

    /* ---- the pediment, swept to a real thickness ---- */
    const pB0 = colB+22, pB1 = colB-18, apex = 545;
    const pk = (t,bb) => P(t*WW, bb, 460 + (1 - Math.abs(t-0.5)*2) * (apex-460));
    for(let i=0;i<20;i++)
      poly([pk(i/20,pB0),pk((i+1)/20,pB0),pk((i+1)/20,pB1),pk(i/20,pB1)], shade(wall,1.14));
    ctx.beginPath();
    let q = P(0,pB0,460); ctx.moveTo(q.x,q.y);
    q = P(WW/2,pB0,apex); ctx.lineTo(q.x,q.y);
    q = P(WW,pB0,460); ctx.lineTo(q.x,q.y);
    ctx.closePath(); ctx.fillStyle = shade(wall,1.05); ctx.fill();
    ctx.strokeStyle = shade(wall,.68); ctx.lineWidth = 3; ctx.stroke();
    faceCircle(WW*0.50, pB0+1, 500, 19, trim, shade(wall,.7), 2);   // roundel

    if(state.props){
      /* the steps: three treads onto the pavement. b runs to 30, so the
         run starts at a 32 to keep its near corner on screen-a 2 --
         positive b shifts a prop left by its own b. */
      box(40, WW-40, 0, 30, 0, 16, shade(wall,1.02), shade(wall,.86), shade(wall,.74));
      box(46, WW-46, 0, 22, 16, 32, shade(wall,1.04), shade(wall,.88), shade(wall,.76));
      box(52, WW-52, 0, 14, 32, 48, shade(wall,1.06), shade(wall,.9), shade(wall,.78));
    }
    if(state.roof) box(WW*0.66, WW*0.86, -210, -170, H, H+22, '#9aa0a6','#7d838a','#6a7076');
    kerb(p,'none');
  }
},
{
  name:'Fuel station', ww: T2*4.4,
  wTodo:'two packing slots',
  cTodo:'4 pavement props need collision volumes',   // 2 canopy posts, 2 pumps
  head:'Kiosk on one slot, forecourt lot on the other',
  tags:['two packing slots','forecourt is a side lot, not the pavement','pump island','pumps turned side-on','laid out on one grid'],
  desc:'The kiosk takes the first slot and the second is an open lot the same depth as the building, with the canopy, its posts and the pump island all set out from the lot rectangle rather than placed by eye.',
  draw(p){
    /* ================= THE FORECOURT IS A LOT, NOT A PAVEMENT
       =================
       The original put the canopy at a -16..246 and b 40..150, which is
       screen-a -166..206 against a 230 frontage: a hundred and sixty
       six units of canopy standing on the shop to the left, with the
       pumps and the totem out on the sidewalk beside it.

       Widening to two slots was right; moving the forecourt to positive
       b was still wrong, because positive b is the PAVEMENT -- the band
       Tipsy drives down. A filling station forecourt is the open LOT
       beside the building. The unit footprint is a 0..404.8 by b 0..-276,
       so a lot at negative b sits inside the unit's own ground and off
       the sidewalk completely. Negative b shifts RIGHT on screen, so
       the lot runs screen 180..585 -- fine, because the unit's ground
       runs 0..681. The return test that governs the FRONT wall does not
       apply to things standing inside the footprint.

       EVERYTHING IN THE LOT IS SET OUT FROM THE LOT, not placed by eye.
       One rectangle, and every part of the forecourt derived from it:

         lot      a 180..404.8   b 0..-180
         canopy   inset 8 from the lot on all four sides
         posts    inset 20 from the canopy corners
         island   centred on the lot, 48 by 108
         pumps    at a third and two thirds along the island

       Which means the spacing is a consequence rather than a decision,
       and moving the lot moves everything correctly. */
    /* ================= THE KIOSK WAS NOT SCALED TO ITS OWN DOOR
       =================
       shopDoor is a fixed size -- 66.24 wide and a head at 114.95 with
       its surround -- and the kiosk was 150 by 116. That is a door head
       at 99% of the wall height, and since the fascia sat 96..112 the
       door came out THROUGH the sign band and finished 3 above it. In
       plan it was no better: 74.24 of surround in a 150 frontage is
       half the shop.

       Sized to the door instead. 180 by 152 puts the head at 76% of the
       wall with a clear fascia at 120..146 above it, and the surround
       at 41% of the frontage with a 13 corner pier and a 74-wide window
       beside it. The kiosk now ends exactly where the lot begins at 180,
       so the two slots meet rather than overlap, and its door's right
       edge lands on screen-a 167 against a canopy whose near edge is at
       196 -- still 29 clear. */
    const WW = T2*4.4, KW = 180;
    /* THE LOT RUNS THE SHOP'S OWN DEPTH. It stopped at -180 against a
       building that runs to -276, so the kiosk stuck 96 out behind its
       own forecourt. LB is D now, and the canopy, apron, island and
       posts all follow because they are derived from it. */
    const LA0 = 180, LA1 = WW, LB = -T2*3;
    const wall = '#e6e8e6', trim = '#c2452e', H = 152;
    body(wall, trim, H, KW);
    slab(0, KW, H, H+10, -1, -10, trim);
    slab(12, KW-12, 120, 146, -1, -8, trim);
    F(24, KW-24, 126, 140, '#f2f2f0', null, 0, -0.5);
    F(14, 88, 24, 112, '#7fb0c4', shade(wall,.6), 3);
    slab(8, 94, 112, 118, -1, -7, shade(wall,.72));             // window head
    shopDoor(129.88, wall, trim);                               // 13 corner pier, 4.76 to the window
    S(KW, 0, LB, 0, H, shade(wall,.78));                        // the flank the lot looks at

    /* ---- the apron ---- */
    T(LA0, LA1, 0, LB, 0.4, '#d6d8d6');
    for(let i=1;i<4;i++) T(LA0, LA1, LB*i/4-0.8, LB*i/4+0.8, 0.6, '#c6c9c6');

    const cA0 = LA0+8, cA1 = LA1-8, cb0 = -8, cb1 = LB+8;
    const iC = (LA0+LA1)/2;                                     // island centre

    /* the island is the plate everything else stands ON, so it is drawn
       before the sort rather than inside it. A 144-long kerb has no
       single depth to sort by: keyed at its centre it paints over the
       pump at its far end and under the one at its near end. */
    box(iC-26, iC+26, LB*0.76, LB*0.24, 0, 9, '#c6c9c6','#b4b8b4','#a2a6a2');

    /* ================= STACKING: THE KEY IS THE GROUND, NOT THE CENTRE
       =================
       depthSort keys on a + b + z, and z was each object's centre. A
       172-tall post came out at z 86 against a 61-tall pump at z 39, so
       the post gained 47 of key over it -- more than the 40 of b that
       actually separated them. The far post (key 228) sorted after the
       far pump (221) and was painted over it, forty units in front of
       where it stands.
       Everything in this lot stands ON THE GROUND, so its depth is
       a + b and nothing else. z is passed as 0 and only ever breaks a
       tie between two things at the same spot. */
    depthSort([
      /* price totem removed at Sir's direction. */
      ...[LB*0.41, LB*0.59].map(bb => ({ a: iC, b: bb, z: 0, draw: () => {
          /* THE PUMPS ARE TURNED 90 DEGREES: long in b, narrow in a,
             with the dial on the a face, so they read side-on to the
             street the way a pump on an island does. */
          box(iC-10, iC+10, bb-15, bb+15, 9, 70, '#d9dbd9','#c2452e','#a53a26');
          S(iC+10.6, bb-11, bb+11, 30, 58, '#2b2f33');
          S(iC+11.2, bb-9, bb+9, 34, 54, '#7fe0c0');
          ctx.strokeStyle='#2b2f33'; ctx.lineWidth=3;
          const h0=P(iC+10, bb, 62), h1=P(iC+34, bb+8, 34);
          ctx.beginPath(); ctx.moveTo(h0.x,h0.y);
          ctx.quadraticCurveTo(h0.x+14*K, h0.y+12*K, h1.x, h1.y); ctx.stroke(); } })),
      /* THE CANOPY IS CARRIED ON THE ISLAND, not on four corner posts:
         with a central island any corner post crosses the middle of the
         lot on screen and runs through the pumps. These two land either
         side of them. */
      ...[LB*0.28, LB*0.72].map(pb => ({ a: iC, b: pb, z: 0,
          draw: () => {
            /* THE POSTS WERE BURIED IN THEIR OWN ISLAND. Both the shaft
               and its collar started at z 0, but the island kerb is
               0..9, so the shaft's foot was inside the kerb and the
               collar -- a flat 10-tall disc -- surfaced just above it
               and read as a cup left on the ground.
               A post standing on a plinth starts at the plinth. Square
               pad on the kerb at 9..17, a tapered collar 17..30, then
               the shaft: three courses, each narrower than the one
               under it, which is what a base is. */
            box(iC-15, iC+15, pb-15, pb+15, 9, 17, '#c6c9c6','#b0b4b0','#9ea29e');
            cyl(iC, pb, 17, 30, 12, '#b0b4b0');
            cyl(iC, pb, 30, 172, 9, '#b9bcc0');
          } }))
    ]);

    /* ---- the canopy ---- */
    const CZ = 190;
    T(cA0, cA1, cb1, cb0, CZ, '#f2f2f0');
    poly([P(cA0,cb0,CZ-18),P(cA1,cb0,CZ-18),
          P(cA1,cb1,CZ-18),P(cA0,cb1,CZ-18)], shade('#f2f2f0',.7));
    F(cA0, cA1, CZ-18, CZ, '#f2f2f0', shade(wall,.7), 2, cb0);
    F(cA0, cA1, CZ-18, CZ-12, trim, null, 0, cb0+0.6);
    S(cA1, cb1, cb0, CZ-18, CZ, shade('#f2f2f0',.82));          // near end only

    if(state.roof) box(40, 128, -150, -110, H, H+22, '#9aa0a6','#7d838a','#6a7076');
    kerb(p,'none');
  }
},
{
  name:'Chapel', tall:true, ww: T2*4.4,
  wTodo:'two packing slots',
  head:'Pitched nave, west door, bell tower and spire',
  tags:['a real pitched roof','tallest thing in the library','tower and pyramid spire','rose window in the gable','swept arch heads'],
  desc:'Sized as a church rather than as a shop with a steeple on it: two slots wide, the nave reaching 1.79 storeys to the eaves and 2.62 to the gable, and the spire topping out at 4.23 — over the bank, which is the point of a spire.',
  draw(p){
    /* ================= IT WAS A SHOP WITH A STEEPLE ON IT
       =================
       H 178 is 1.06 shop storeys, and WW 200 was NARROWER than a normal
       frontage. A chapel is not a shop with a spire; the nave itself is
       the tall thing, and the tower goes above that again.

       AND THE ROOF WAS FLAT. body() draws its plate at H, and the gable
       was a triangle applied to the front of a flat-topped box -- so the
       building read as a shed with a cardboard front. A pitched roof is
       the shape of the type, not decoration on it: a ridge running the
       depth of the nave with two slopes falling to the eaves, and the
       gable is what you get where that roof meets the front wall.

       The door was a pile-up too. Its swept arch head ran z 92..126
       against shopDoor's own head at 114.95, and the lancet arch heads
       reached 146, so door surround, arch and windows all occupied the
       same band. With the nave three times taller there is room to set
       them out in courses instead.

         eaves       300   1.79 storeys
         gable apex  400   2.38
         tower top   470   2.80
         spire apex  620   3.69
         finial      650   3.87

       Frontage stays one slot. A chapel on a narrow lot between shops
       is a real thing, and it is the height that makes it read. */
    /* TWO SLOTS WIDE. ww = T2*4.4 = 404.8, exactly two of
       packEdgeNoGap's own, the same anchor the garage, the bank and the
       fuel station use. Fourth shop on wTodo; one packer change serves
       all four, and all four are types that genuinely cannot live in a
       shop slot. The span goes with it: a nave of 308.8 at the old apex
       of 400 falls to a 33 degree pitch, which reads as a bungalow, so
       the apex goes to 440 and holds 42. */
    const wall = '#cfc6b0', trim = '#6b5a44', H = 300, WW = T2*4.4, ND = D;
    /* THE TOWER WAS EATING THE WEST FRONT. At a 6..66 and b -2..-62 it
       covers screen-a 8..128 -- and screen-a is a - b, so a tower's
       depth pushes it sideways over the wall beside it. The door
       surround started at 115.88 and the left lancet at 88: both behind
       it, and the rose window's left half with them.
       A west tower is usually shallower than it is wide anyway. 6..58
       by -2..-44 covers 8..102, and everything on the nave front is set
       out to clear that: door 122.88, nearest lancet 113, rose 116. */
    /* THE TOWER MOVES, NOT THE BUILDING. The last pass separated the
       two by pushing the NAVE from a 96 to 152 and left the tower on
       screen-a 0..150 -- within ten of where it started. Nothing moved
       that anyone could see; the building just backed away from it.
       So this time the tower goes to the far end of the frontage and
       the nave takes the near end. The nave runs a 0..316 (screen the
       same, its front is at b 0) and the tower a 320..400, and they
       abut at 316 with the tower on the flank side, which is where it
       reads as being on the side of the building rather than across
       its front. 316 of nave at an apex of 440 over eaves of 300 is a
       42 degree pitch. */
    const nA0 = 0, nA1 = 316, ridge = (nA0+nA1)/2, apex = 440;
    body(wall, trim, H, WW, ND);

    /* ---- the pitched roof, and the gable is where it meets the front ---- */
    poly([P(nA0,0,H),P(ridge,0,apex),P(ridge,-ND,apex),P(nA0,-ND,H)], shade(trim,.78));
    poly([P(ridge,0,apex),P(nA1,0,H),P(nA1,-ND,H),P(ridge,-ND,apex)], trim);
    ctx.beginPath();
    let q=P(nA0,0,H); ctx.moveTo(q.x,q.y);
    q=P(ridge,0,apex); ctx.lineTo(q.x,q.y);
    q=P(nA1,0,H); ctx.lineTo(q.x,q.y);
    ctx.closePath(); ctx.fillStyle=wall; ctx.fill();
    ctx.strokeStyle=shade(wall,.66); ctx.lineWidth=3; ctx.stroke();
    for(const [ga,gz,ha,hz] of [[nA0,H,ridge,apex],[ridge,apex,nA1,H]]){  // barge boards
      const n=12;
      for(let i=0;i<n;i++)
        poly([P(ga+(ha-ga)*i/n, 1.2, gz+(hz-gz)*i/n),
              P(ga+(ha-ga)*(i+1)/n, 1.2, gz+(hz-gz)*(i+1)/n),
              P(ga+(ha-ga)*(i+1)/n, 1.2, gz+(hz-gz)*(i+1)/n-11),
              P(ga+(ha-ga)*i/n, 1.2, gz+(hz-gz)*i/n-11)], shade(trim,1.15));
    }

    /* ---- the west front, set out in courses ---- */
    slab(nA0, nA1, 168, 178, -1, -9, shade(wall,.86));           // string course
    slab(nA0, nA1, 286, 296, -1, -11, shade(wall,.86));          // eaves course
    const dm = ridge;                                            // centred on the nave
    shopDoor(dm, wall, trim, 'rgba(120,150,170,.55)', WW);
    /* the arch sits ABOVE the door head at 114.95, not through it */
    const dp = (t,bb) => { const u=1-t;
      return P(u*u*(dm-52) + 2*u*t*dm + t*t*(dm+52), bb,
               u*u*120 + 2*u*t*186 + t*t*120); };
    ctx.beginPath(); let d0=dp(0,0); ctx.moveTo(d0.x,d0.y);
    for(let k=1;k<=12;k++){ d0=dp(k/12,0); ctx.lineTo(d0.x,d0.y); }
    q=P(dm+52,0,120); ctx.lineTo(q.x,q.y); q=P(dm-52,0,120); ctx.lineTo(q.x,q.y);
    ctx.closePath(); ctx.fillStyle=shade(wall,.94); ctx.fill();
    ctx.strokeStyle=shade(wall,.6); ctx.lineWidth=2; ctx.stroke();
    for(let k=0;k<12;k++)
      poly([dp(k/12,0),dp((k+1)/12,0),dp((k+1)/12,-10),dp(k/12,-10)], shade(wall,1.08));

    /* four lancets across the wider front, all clear of the tower's
       screen-a 146 -- the nearest starts at 162 */
    for(const xa of [68, 128, 188, 248]){
      F(xa-14, xa+14, 196, 268, '#6f8fa8', trim, 3);
      const ap = (t,bb) => { const u=1-t;
        return P(u*u*(xa-14) + 2*u*t*xa + t*t*(xa+14), bb,
                 u*u*268 + 2*u*t*300 + t*t*268); };
      ctx.beginPath(); let r0=ap(0,0); ctx.moveTo(r0.x,r0.y);
      for(let k=1;k<=10;k++){ r0=ap(k/10,0); ctx.lineTo(r0.x,r0.y); }
      ctx.closePath(); ctx.fillStyle='#6f8fa8'; ctx.fill();
      for(let k=0;k<10;k++)
        poly([ap(k/10,0),ap((k+1)/10,0),ap((k+1)/10,-9),ap(k/10,-9)], shade(wall,.9));
    }
    faceCircle(ridge, -1, 366, 38, trim);                        // rose, in the gable
    faceCircle(ridge, -2, 366, 31, '#6f8fa8');
    faceT(ridge, -3, 366, 31);
    ctx.strokeStyle=trim; ctx.lineWidth=2/(31*K);
    for(let k=0;k<4;k++){ ctx.beginPath(); ctx.moveTo(-Math.cos(k*0.79),-Math.sin(k*0.79));
      ctx.lineTo(Math.cos(k*0.79),Math.sin(k*0.79)); ctx.stroke(); }
    ctx.restore();

    /* ---- the tower, and the spire over everything ---- */
    /* ON THE SIDE MEANS BACK ALONG THE FLANK. Moving the tower to the
       far end of the frontage put it at the front CORNER -- b 4..-66 is
       eleven per cent back on a 276-deep block, still hard against the
       street. b -100..-180 centres it at -140, halfway down the flank,
       which is where a tower attached to the side of a nave actually
       stands. It projects 84 past the nave flank at a 316, so it reads
       as built onto the side rather than as part of the front.
       Screen-a 420..580, inside the footprint and inside the flank own
       316..592 -- the return test governs the front wall, not things
       standing in the building own volume. */
    /* THE TOWER WAS NOT ATTACHED TO ANYTHING. a 320..400 against a nave
       flank at 316 left a 4-unit gap, so the shaft was a free-standing
       block standing on pavement beside the building -- which is what
       reads as floating. A base course does not fix that; nothing was
       holding it up because nothing was touching it.
       a 296..400 laps the flank by 20, so the shaft is built INTO the
       wall and the two share mass the way a tower engaged with a nave
       does. */
    /* OUT ON THE SIDE, AND ON THE GROUND. These are two different faults
       and I kept trading one for the other:

         a 320..400, b -100..-180  projected past the nave flank at 316,
             but left a 4-unit gap and put the tower's foot 50 above the
             front wall's -- out on the side, floating.
         a 296..400, b -40..-120   lapped the flank by 20, so the shaft
             read as part of the building mass -- grounded, but in.

       Both at once needs the tower to ABUT the flank rather than lap
       it, with all of its width beyond: a 316..398 touches at 316 and
       projects 82. And b 0 puts its base on the same depth as the front
       wall, so the base line carries straight on from it -- screen y
       158 where the front wall's ends at 158.

       Screen y is (a+b)/2 - z*ZSCALE, so 2 units back in b lifts a
       thing 1 unit up the screen. That is why no base course ever fixed
       this: at b -100 the foot was 50 too high, and a plinth cannot
       lower a ground line. */
    /* the tower abuts the nave flank at 316 and projects 82 past it,
       with b at 0 so its base line carries straight on from the front
       wall's. This is the position Sir approved the base of. */
    const t0 = 316, t1 = 398, tb = 0, tk = -80, tTop = 500, sTop = 680;
    /* THE PLINTH IS GONE. I added it to cure the floating, and it was the
       wrong diagnosis twice over: the shaft was floating because it was
       not TOUCHING anything -- a 4-unit gap between it and the nave
       flank -- and once it laps the flank by 20 the wall itself is what
       holds it up. The plinth then had nothing to do but sit proud of
       the shaft at b -90 against the shaft's -100 and read as a shelf
       stuck on the corner, hovering over the pavement in front of it.
       A base course that has to be explained is not doing its job. */
    slab(t0, t1, 0, tTop, tb, tk, shade(wall,1.05), shade(wall,.8), shade(wall,.9));
    slab(t0-4, t1+4, tTop-14, tTop, tb+4, tk-4, shade(wall,.86));   // cornice
    /* the two tower string courses at z 186 and 316 removed at Sir's
       direction -- they read as ledges stuck round the shaft rather
       than as courses in it. The cornice under the spire stays. */
    for(let i=0;i<3;i++)                                             // belfry louvres
      F(t0+11+i*23, t0+26+i*23, 392, 478, trim, shade(wall,.7), 2, tb-0.6);
    const sap = P((t0+t1)/2, (tb+tk)/2, sTop);
    poly([P(t0-6,tb+4,tTop), P(t1+6,tb+4,tTop), sap], trim);         // front face
    poly([P(t1+6,tb+4,tTop), P(t1+6,tk-4,tTop), sap], shade(trim,.72));  // right face
    cyl((t0+t1)/2, (tb+tk)/2, sTop, sTop+22, 2.4, '#c9a24a');
    slab((t0+t1)/2-10, (t0+t1)/2+10, sTop+8, sTop+12,
         (tb+tk)/2+2.4, (tb+tk)/2-2.4, '#c9a24a');
    ball((t0+t1)/2, (tb+tk)/2, sTop+30, 5, '#c9a24a');
    kerb(p,'none');
  }
},
{
  name:'Arcade', head:'Black hole of a front, magenta pixel sign',
  tags:['unlit front','solid pixel sign','step-in entry','no pavement props'],
  desc:'The front is a flat unlit black panel with one door in it -- the whole shop is the sign. Every block of the pixel sign is a slab with a lit top edge, so the lettering stands off the wall rather than being painted on it.',
  draw(p){
    const wall = '#1b1b26', trim = '#37e0d0', H = 168;
    body(wall, trim, H);
    slab(0,W, H, H+12, -1, -12, shade(wall,2.0));
    F(10,W-10, 0, 120, '#0c0c14', null,0, 1);
    /* THE CABINETS WERE STANDING IN THE STREET. Five ran 26..178, then
       four, and all of them sat at b 2..22 -- OUTSIDE the glass line at
       b 0, so they were not "cabinets inside" as the desc claimed but
       four solids parked on the pavement. The leftmost measured
       screen-a -9.0, nine units onto the neighbour's ground, which is
       the prop-scale version of a cornice crossing a return.

       They were also the whole of this shop's cTodo: four pavement
       props with no collision volume in the game. Removed at Sir's
       direction rather than pushed back behind the glass, so the front
       is now what the head always said it was -- a black hole with one
       door in it, and the sign does all the work. cTodo is gone. */
    shopDoor(W*0.82, shade(wall,1.6), shade(wall,2.2), 'rgba(55,224,208,.30)');
    slab(10,W-10, 116, 126, -1, -8, trim);
    /* THE SIGN WAS ON THE ROOF, NOT ON THE SHOP. It ran z 146..188 at a
       pitch of 15 with 12-unit blocks. The wall top is 168 and the
       cornice occupies 168..180, so of the three rows only the bottom
       one was on the building: the middle row cut through the cornice
       and the top row cleared it entirely and floated in open sky above
       the roof plate. On screen it read as loose blocks standing on the
       roof, which is how Sir spotted it.

       IT COULD NOT SIMPLY BE MOVED DOWN. The clear wall between the
       fascia band top at 126 and the wall top at 168 is 42 units, and
       the sign was 42 tall (2*15 + 12) -- an exact fit with zero margin
       at both ends, jammed against the band below and the cornice
       above. So the sign shrinks as well as drops: pitch 15 -> 12 and
       block 12 -> 10 makes it 34 tall, and rows at 130/142/154 leave 4
       units of wall showing under it and 4 above.

       AND IT WAS NEVER CENTRED. Columns started at a 22 and the widest
       reached a 184, screen-a 24..194 against a 230 frontage -- centre
       109, twelve units left of the building. Fixed in SCREEN space,
       because a recess projects sideways by its own depth and this
       stack sits at b -2..-10: front face 46, back face 184, centre
       115 exactly, with 46 of margin at both returns. Start column
       moves 22 -> 44, pitch 12, eleven columns.

       Colour is magenta now, matching the cabinet pink that used to be
       in the window before the cabinets came out -- the last piece of
       that palette left on the shop. */
    const sign = '#e04b8a';
    const bl = [[0,0],[1,0],[2,0],[0,1],[0,2],[1,2],[2,2],[4,0],[4,1],[4,2],[5,2],[6,2],
                [8,0],[8,1],[8,2],[9,0],[10,0],[10,1],[10,2]];
    for(const [bx,bz] of bl){
      const x0 = 44 + bx*12, z0 = 154 - bz*12;
      slab(x0, x0+10, z0, z0+10, -2, -10, sign, shade(sign,.7), shade(sign,1.3));
    }
    /* MARGIN 6 AGAINST A RECESS OF 8. This band ran 6..W-6 at b -1..-8
       and landed screen-a 7..232 -- 2 past the right return, which is
       the fTodo this shop was carrying. Rule 1: the a-margin has to
       beat the recess depth. 10 leaves 2 of pier and puts it on exactly
       the same screen span as the fascia band above it, 11..228, so the
       two now stack flush instead of one overhanging the other. */
    slab(10,W-10, H-58, H-52, -1, -8, shade(wall,2.4));
    /* THE A-BOARD IS GONE TOO. It stood at b 26..54 with its near face
       at a W*0.06 = 13.8, which is screen-a -40.2: forty units out on
       the neighbour's pavement, the worst overrun measured on this
       shop. Positive b shifts a prop LEFT on screen by its own b, so a
       board that far off the facade needed a >= 54 just to stay inside
       its own return, and it had 13.8. Removed rather than slid right,
       per Sir -- this shop keeps no pavement props at all now, which is
       why there is no state.props branch left. */
    if(state.roof){
      box(W*0.56,W*0.84,-150,-104,H,H+26,'#4a4a58','#3a3a46','#2e2e38');
      cyl(W*0.26, -60, H+12, H+62, 2.5, '#4a4a58');
    }
    kerb(p,'none');
  }
},
{
  name:'Butcher', head:'Hooks and rail, tiled base, striped awning',
  tags:['round rail','hooked cuts','white tile','striped awning','no pavement props'],
  desc:'The rail is a tube with the hooks bent over it and the cuts hanging as rounded solids rather than painted shapes. The awning is a folded canopy with a real underside, not a flat stripe on the wall.',
  draw(p){
    const wall = '#f0ece2', trim = '#8f2b2b', H = 150;
    body(wall, trim, H);
    slab(0,W, H, H+10, -1, -12, trim);
    for(let i=0;i<12;i++) F(i*(W/12), i*(W/12)+1.6, 0,42, shade(wall,.9), null,0,-1);
    /* SAME RULE, MISSED BY THE CLASSIFIER. This band is below z 60, so
       the fascia census excluded it as a plinth and it was never
       flagged -- but 0..W at b -1..-6 lands screen-a 1..236, six past
       the far return, exactly the fault the fTodo describes. Margin 8
       against a recess of 6 leaves 2 of pier: screen 9..228, flush
       with the 132..138 band above it. */
    slab(8,W-8, 40, 46, -1, -6, trim);
    F(12,W*0.64, 46, 108, '#d6e2e4', shade(wall,.62), 3);   // see the door note below
    tube(16, -6, 98, W*0.62, -6, 98, 2, '#9aa0a6');
    for(let i=0;i<5;i++){
      const ha = 28+i*26, col = ['#c2606a','#a84a54','#c2606a','#b45560','#a84a54'][i];
      tube(ha, -6, 96, ha, -6, 86, 1.2, '#b9bcc0');
      ball(ha, -6, 74, 9, col);
      ball(ha, -6, 62, 7, shade(col,.9));
      ctx.strokeStyle='#f0dcd6'; ctx.lineWidth=2;
      const c0=P(ha-6,-7,76), c1=P(ha+6,-7,70);
      ctx.beginPath(); ctx.moveTo(c0.x,c0.y); ctx.lineTo(c1.x,c1.y); ctx.stroke();
    }
    /* THE DOOR WAS BEING SILENTLY MOVED, AND IT STILL OVERLAPPED THE
       GLASS. Two faults, and the first one hid the second.

       shopDoor clamps: mid = max(hw+5, min(uw-hw-5, aMid)). This shop
       asked for W*0.86 = 197.8 and the clamp handed back 191.88 -- the
       door was drawn 5.92 from where the source says it is, every time,
       and nothing in the shop body could tell. A number in this file
       that the kit quietly overrides is worse than a wrong number,
       because it survives every reading of the code.

       Underneath that, the painted surround runs a0-4..a1+4, so the
       clamped door occupied 154.8..229.0 while the window ran to 161.0
       -- 6.2 of surround lying across the glass. That is what the
       drawing showed and what the numbers had not, because the census
       stub did not model the clamp and put the door at 158.8 on paper.
       Measure the measurement: the render caught this, not the census.

       Both fixed by giving the window less and the door a real slot.
       W*0.70 -> W*0.64 takes the glass back to 147.2 and the rail
       follows it W*0.68 -> W*0.62; the door comes to W*0.83 = 190.9,
       which is INSIDE the clamp limit of 191.88, so the number written
       here is now the number drawn. Door a 157.8..224.0, surround
       153.8..228.0: 6.6 of pier between glass and surround and 2.0 at
       the return. The hooks are unmoved -- they top out at a 132 and
       the shortened rail reaches 144.6, so the last cut still hangs
       from rail rather than from air.

       THE SECOND WINDOW IS GONE, at Sir's direction. F(W*0.78, W-14,
       50, 90) sat at a 179.4..216, screen-a 185.9..222.5, directly over
       the doorway -- a pane of shop glass laid across the door, which
       is what it looked like. It was also what hid the surround overlap
       above, and removing it is what frees the wall the door needed.

       The door glass is given explicitly now. Left to default it came
       out the kit's cool blue, which read as a stray blue wedge under
       the awning against this shop's red and cream; it is tinted from
       the window colour instead so the two pieces of glazing agree. */
    shopDoor(W*0.83, wall, trim, 'rgba(214,226,228,.55)');
    const out = 34;
    for(let i=0;i<8;i++){
      const x0=4+(W-8)*i/8, x1=4+(W-8)*(i+1)/8;
      poly([P(x0,0,132),P(x1,0,132),P(x1,out,112),P(x0,out,112)], i%2?'#f4f0e6':trim);
    }
    poly([P(4,0,124),P(W-4,0,124),P(W-4,out,104),P(4,out,104)], shade(trim,.62));
    poly([P(4,out,112),P(W-4,out,112),P(W-4,out,104),P(4,out,104)], shade(trim,.8));
    poly([P(4,0,132),P(4,out,112),P(4,out,104),P(4,0,124)], shade(trim,.55));
    poly([P(W-4,0,132),P(W-4,out,112),P(W-4,out,104),P(W-4,0,124)], shade(trim,.55));
    /* MARGIN 0 AGAINST A RECESS OF 8 -- the fTodo this shop carried.
       slab(0,W,...,-1,-8) landed screen-a 1..238, eight past the far
       return, because a slab at negative b projects RIGHT by its own
       depth and there was no a-margin to absorb it. Margin 10 puts it
       on 11..228 with 2 of pier at each end. */
    slab(10,W-10, 132, 138, -1, -8, shade(trim,.8));
    /* THE CHOPPING BLOCK WAS NOT ON THIS SHOP'S GROUND. Block and its
       four legs ran a 234..286 against a 230 frontage -- not lapping
       the neighbour, ENTIRELY on the neighbour, every one of the five.
       The block measured screen-a 274, forty-four past the far return.
       That was the whole of cTodo, so with them gone the flag goes and
       there is no state.props branch left to keep. Removed rather than
       slid back inside, per Sir. */
    if(state.roof) box(W*0.28,W*0.54,-140,-96,H,H+22,'#9aa0a6','#7d838a','#6a7076');
    kerb(p,'none');
  }
},
{
  name:'Pawn shop', head:'Three balls, barred glass, narrow front',
  tags:['three gold balls','window bars','narrow unit','deep fascia','hanging bracket'],
  desc:'The three balls hang as spheres from a bracket with a real arm and return, and the bars over the glass are round rods rather than painted stripes.',
  draw(p){
    const wall = '#3d3346', trim = '#c9a24a', H = 176, WW = 178;
    body(wall, trim, H, WW);
    slab(0,WW, H, H+10, -1, -12, shade(wall,.7));
    /* MARGIN 4 AGAINST A RECESS OF 10. The board ran 4..WW-4 at b -1..
       -10 and landed screen-a 5..184 on a 178 frontage -- six past the
       far return. Rule 1 again: a slab at negative b projects RIGHT by
       its own depth, so the a-margin has to beat it. Margin 12 puts it
       on 13..176 with 2 of pier at each end. */
    slab(12,WW-12, 116, H-8, -1, -10, shade(wall,1.25), null, trim);
    /* THE LETTERING WAS BEHIND THE BOARD IT IS PAINTED ON. b -10.5
       against a board whose back face is -10 -- inside the board,
       surviving on call order alone, and gone the moment anything
       depth-sorts it. Class B of the fascia check, and the same fault
       as the chemist cross that sat behind its own band.

       The panel goes proud of the board face at -0.5 instead, and once
       it is at a different depth its screen span moves, so it is set
       out in SCREEN space: the board now reads 13..176, and the panel
       at b -0.5 has screen-a = a + 0.5, so a 22.5..165.5 gives 23..166
       -- 10 of board showing at both ends. Centred in z on the board
       too, 129..155 about 142, which it was not before.

       THE PANEL HAD TO GO DARK ONCE THE SIGN CAME UP. The plate was
       `trim` and so are the balls, so raising the emblem onto the board
       put gold on gold and the three balls very nearly vanished -- the
       render showed it immediately and no measurement would have. A
       dark plate at shade(wall,.7) with the gold band around it reads
       as a name board and gives the emblem something to sit against,
       which is the usual pawnbroker arrangement anyway. */
    F(22.5,165.5, 129, 155, shade(wall,.7), null,0,-0.5);
    F(12,WW*0.52, 22, 104, '#6a7f96', shade(wall,1.5), 3);   // see the door note below
    for(let i=0;i<6;i++) tube(14+i*((WW*0.50-14)/6), -4, 22, 14+i*((WW*0.50-14)/6), -4, 104, 1.4, shade(wall,1.15));
    for(let i=0;i<3;i++) tube(12, -4, 34+i*24, WW*0.52, -4, 34+i*24, 1.2, shade(wall,1.15));
    /* THE DOOR WAS BEING CLAMPED, AND THE SURROUND LAY ON THE GLASS --
       the same pair of faults the Butcher had, found the same way.

       shopDoor clamps to uw-hw-5, which on this 178 frontage is 139.88.
       The shop asked for WW*0.81 = 144.18, so the door was drawn 4.30
       from where this line says it is. Underneath that, the painted
       surround runs a0-4..a1+4 and reached back to 102.8 while the
       window ran to WW*0.60 = 106.8 -- 4.0 of surround across the
       glass, which the extra window below was covering up.

       The window gives up the space: WW*0.60 -> WW*0.52 takes the glass
       to 92.6, the bars follow (WW*0.58 -> WW*0.50 for the uprights,
       WW*0.60 -> WW*0.52 for the rails), and the door comes to
       WW*0.78 = 138.8, INSIDE the clamp, so the number written here is
       the number drawn. Surround 101.7..176.0: 9.1 of pier between
       glass and surround, 2.0 at the return.

       THE SECOND WINDOW IS GONE, at Sir's direction. F(WW*0.70, WW-14,
       52, 94) sat at a 124.6..164, screen-a 131.1..170.5, laid straight
       across the doorway -- and it was what hid the surround overlap. */
    shopDoor(WW*0.78, wall, trim, 'rgba(106,127,150,.55)', WW);
    /* THE SIGN WAS INSIDE THE BUILDING. The bracket arm ran from b -2
       to b -26 and the balls hung at b -26, radius 11, so they occupied
       b -37..-15 -- up to thirty-seven units BEHIND the shopfront
       plane, buried in the wall. A hanging sign that is inside the
       block is not hanging at all; it survived only because it is
       painted after the wall, and it would disappear the moment
       anything depth-sorts it. Exactly the chemist cross, which sat at
       b -10 behind its own -9 band, and the third time this sign
       convention has been found pointing the wrong way.

       Negative b is INTO the block. A bracket projects OUT over the
       pavement, so every b in this assembly flips sign: arm 2..26,
       cross bar and balls at 26.

       THAT MOVES IT SIDEWAYS, WHICH IS WHY IT ALSO MOVED ALONG THE
       FRONTAGE. Positive b shifts a prop LEFT on screen by its own b,
       so the rule from the prop note applies -- but for a SPHERE the
       rule is not a >= b, it is a >= r + b + r. A ball's own depth
       radius shifts its near edge a further r left on top of the shift
       its centre already has. I got this wrong on the first pass: the
       bracket went to a 50, which is right by the centre-only rule, and
       the census put the leftmost ball at screen-a -4.0. At the old a
       of WW*0.05 = 8.9 the flipped sign would have landed at -28.1, and
       the old unflipped version was ALREADY over the line at -2.1.

       AND THEY WERE INSIDE EACH OTHER. First pass hung the two upper
       balls at brA +/- 6 -- twelve apart with a radius of eleven, so
       they overlapped by ten and read as one lump with a bite out of
       it, and the lower ball's hanger, dropping down the centre line,
       ran straight through both of them because there was no gap
       between them to drop through. Spacing has to beat 2r: +/- 13 is
       twenty-six apart, four clear, and the hanger passes down the gap.

       UP TO FASCIA LEVEL AND CENTRED ON THE FRONTAGE, at Sir's
       direction. The bracket now springs off the board face at z 164
       and the balls hang across the board rather than over the window.
       That is only possible because the assembly is at b +26, in front
       of everything: it overlaps the board on screen without touching
       it in space, which is what a projecting sign does.

       CENTRING IS DONE ON THE SCREEN SPAN, NOT ON a. The group runs
       b 15..37, so its left edge is shifted 37 and its right edge only
       15, and the screen centre works out at brA - 26 rather than brA.
       Setting brA - 26 = 89 (half of the 178 frontage) gives brA = 115.
       The sign occupies screen-a 54..124, centred on 89 to the unit.
       Writing brA = 89 would have put it 26 to the left, which is the
       same trap the chemist plaque fell into.

       That lands it over the doorway rather than the window, which is
       where Sir wants it and where a bracket sign usually goes.

       Two up and one below is the pawnbroker's arrangement, unchanged.
       The balls hang in front of the facade rather than inside it,
       which is where a projecting sign belongs. */
    const brA = 115, brB = 26;
    tube(brA, -1, 164, brA, brB, 164, 1.8, '#4a4f55');          // arm, off the board face and out
    tube(brA-16, brB, 164, brA+16, brB, 164, 1.6, '#4a4f55');   // cross bar at the arm's end
    for(const [ba,bz] of [[brA-13,148],[brA+13,148],[brA,126]]){
      tube(ba, brB, 162, ba, brB, bz+11, 0.9, '#4a4f55');
      ball(ba, brB, bz, 11, trim);
    }
    if(state.roof){
      /* THE FLUE WAS SKEWERING THE PLANT AND STANDING ON NOTHING.
         The box occupied screen-a 163.4..246.1 and the pipe sat at
         193.2..203.2 -- entirely INSIDE that span, and nearer in b
         (-70 against -110..-150), so it drew in front and read as a
         pole driven through the unit. Nothing in the a or b numbers
         says so: they do not overlap in either axis on their own. It
         is only screen-a = a - b that puts them on top of each other,
         which is why this had to be measured in screen space.

         And it began at H+10, ten units above the roof deck, floating.
         H+10 is exactly the cornice top, so the pipe had been started
         where the parapet stops hiding it -- the float was there to
         dodge an occlusion rather than to sit on anything.

         Rebuilt as one assembly that stands on the deck. Plinth at H,
         unit on the plinth, flue landing at H as well and let the
         parapet hide its first ten units, which is what a parapet does.
         Separated in SCREEN space, not in a: flue at 106.4..112.8,
         plinth from 126.3, so 13.5 of clear roof between them. */
      box(WW*0.17, WW*0.44, -122, -96, H,    H+6,  '#6e747b','#5d636a','#4f555c');
      box(WW*0.19, WW*0.42, -118, -100, H+6, H+24, '#8f969d','#787f86','#697077');
      for(let i=0;i<3;i++)                                     // louvres, proud of the unit's near face at -100
        F(WW*0.21, WW*0.40, H+10+i*4, H+12+i*4, '#6b7177', null, 0, -99.5);
      cyl(WW*0.11, -90, H, H+46, 3.2, '#5c636b');
      plateCircle(WW*0.11, -90, H+46, 4.5, '#7c838b', '#5c636b', 1.5);
    }
    kerb(p,'none');
  }
},
{
  name:'Post office', tall:true,
  zTodo:1.11,          // H 186 -- see SCALE REVIEW at the head of this file
  head:'Raked flagpole, crest parapet, counter windows',
  tags:['stars and stripes','crest parapet','counter windows','no pavement props','official palette'],
  desc:'The flag is a real sheet standing in its own pole plane rather than a decal on the wall, with thirteen stripes running the length and the canton over the top seven. The pole rakes out over the pavement and the flag hangs down from it.',
  draw(p){
    const wall = '#dcd6c6', trim = '#1f4a6b', H = 186;
    body(wall, trim, H);
    slab(0,W, H, H+10, -1, -12, trim);
    slab(W*0.32,W*0.68, H+10, H+34, -2, -12, shade(wall,1.04), null, trim);
    F(W*0.42,W*0.58, H+16, H+28, trim, null,0,-2.5);
    /* MARGIN 0 AGAINST A RECESS OF 8 -- the first half of this shop's
       fTodo. slab(0,W,...,-1,-8) landed screen-a 1..238, eight past the
       far return. Margin 10 puts it on 11..228. */
    slab(10,W-10, 120, 132, -1, -8, trim);
    slab(14,W-14, 138, 166, -1, -9, shade(wall,1.06));
    /* LETTERING BEHIND THE BOARD -- the second half, class B of the
       fascia check. The three panels sat at b -9.5 against a board
       whose back face is -9, so they were inside the thing they are
       painted on, alive on call order alone and gone under any depth
       key. Proud at -0.5.

       MOVING THEM CHANGED THEIR CENTRING, which is the trap the check
       warns about: fixing B forces C. At -9.5 the panels read screen-a
       39.5..183.5; at -0.5 they read 30.5..174.5, and the board runs
       15..225 with a centre of 120. The group centre was 102.5, out by
       17.5 -- and it had been wrong before too, just differently. Set
       out in screen space instead: three 36-wide panels on a 54 pitch
       is a 144 group, centred on 119.5 in a so it lands 48..192 on
       screen with 33 of board showing at each end. */
    for(let i=0;i<3;i++) F(47.5+i*54, 83.5+i*54, 144,160, trim, null,0,-0.5);
    for(let i=0;i<3;i++){
      const x0 = 16+(W-32)*(i+0.10)/3, x1 = 16+(W-32)*(i+0.90)/3;
      slab(x0-3,x1+3, 28, 106, -1, -7, trim);
      F(x0,x1, 32, 102, '#7f9ab0', null,0,-7.5);
      for(let j=1;j<3;j++) F(x0+(x1-x0)*j/3-1.5, x0+(x1-x0)*j/3+1.5, 32,102, trim, null,0,-8);
    }
    shopDoor(W*0.51, wall, trim);
    /* THE EXTRA WINDOW IS GONE, at Sir's direction. F(W*0.44, W*0.58,
       56, 100) sat at a 101.2..133.4, screen-a 107.7..139.9, laid
       straight across the doorway at 79.9..154.1 -- a pane of counter
       glass over the door. Third shop running with the same object in
       the same place; it looks like a copied idiom rather than three
       independent mistakes. Worth a grep across the remaining shops.

       The door itself is clean here: W*0.51 = 117.3 against a clamp
       limit of 191.9, so it is drawn where the source says. */
    /* THE BASE PLINTH IS GONE, at Sir's direction. slab(0,W,0,22,-1,-6)
       ran the full frontage under the counter windows and the door. It
       had a return fault too -- screen-a 1..236, six past the far
       return, unflagged because it sits below z 60 and the fascia
       census reads anything down there as a plinth -- but the fix is
       moot now that the band itself has gone. The window stallrisers
       and the door surround carry the base on their own. */
    if(state.props){
      /* THE FLAGPOLE RAKED INTO THE BUILDING. It ran from b -2 to
         b -96 -- ninety-six units BACK, through the wall and out the
         far side of the shop -- and the flag hung at b -58..-96, buried
         in the block with it. Negative b is INTO the block. Second time
         this session after the pawn shop bracket, and the same reading:
         somebody wrote the rake as a distance and let the sign follow
         the wrong axis. Every b in the assembly flips positive so the
         pole projects out over the pavement, which is where a flagpole
         goes.

         FLIPPING IT FORCED IT ALONG THE FRONTAGE. Positive b shifts
         left on screen by its own b, so at the old a of W*0.10 = 23 the
         flag would have landed at screen-a -73. The rake also shortens:
         96 of projection is longer than the pavement is deep. Pole
         reaches b 58, flag hangs between b 16 and 56, and the whole
         assembly moves to a 70, which puts it at screen-a 5..71 -- the
         pole tip ball is the leftmost thing on it at 5.0.

         The base sits at z 168, two above the name board top at 166,
         so it springs off wall rather than out of the lettering.

         IT WAS HUNG BY THE WRONG EDGE. First pass ran the flag's LONG
         side along the pole and dropped its short side, which makes a
         pennant strung along a staff rather than a flag. A house-mounted
         flag is attached along its HOIST -- the short side, the one
         with the grommets -- and the fly hangs down from it. So the two
         axes swap: the hoist now runs along the pole and the fly drops
         vertically, which also turns the stripes ninety degrees. They
         run from hoist to fly, so with the hoist on the pole they run
         DOWN the flag, thirteen bands stacked along the staff.

         PROPORTION HAS TO SURVIVE ZSCALE, and this is where the first
         two passes went wrong in two different ways.

         In raw units the flag is a parallelogram in the b-z plane: the
         hoist is raked at 45 degrees and the fly hangs vertically, so
         the true fly is the drop times the cosine of the rake. Getting
         only that right gives 1.9:1 on paper -- and it still drew as a
         ribbon, because z is multiplied by ZSCALE before it is
         projected and b is not. A 14-wide hoist is 14 wide on screen
         while a 53 drop is 80 tall, so the flag came out about 3:1 as
         DRAWN while measuring 1.9:1 as written.

         Same trap as the chemist cross, whose arms were 16.5 in z
         against 10.8 in a and came out 2:1 apart; the kit fixed that by
         dividing the z arm by ZSCALE, and the same correction applies
         here. The hoist also widens -- 14 of b is simply too small to
         read whatever the ratio says -- so the staff carries a hoist of
         26 and the fly drops 62, which is 1.9:1 on the screen rather
         than on the page.

         The union goes at the PEAK of the staff, not at the wall --
         that is the rule for a flag flown from a projecting staff, and
         it is the opposite of what a vertical pole wants. Canton over
         the seven stripes nearest the peak, four tenths along the fly.

         The stars are a 3x4 grid of small quads: fifty at this size
         would be mud, and a dozen reads as a star field at the distance
         the game draws it. */
      const fa = 70, pb0 = 2, pz0 = 168, pb1 = 58, pz1 = 224;   // 45 degree staff
      tube(fa, pb0, pz0, fa, pb1, pz1, 2.5, '#b9bcc0');
      ball(fa, pb1, pz1+2, 3.5, '#c9a24a');
      const hb = 28, fb = 54, fly = 62;
      const bAt = u => hb + (fb-hb)*u;                          // u runs along the hoist, up the staff
      const zAt = (u,v) => pz0 + (pz1-pz0)*(bAt(u)-pb0)/(pb1-pb0) - fly*v;   // v drops down the fly
      const sheet = (u0,u1,v0,v1,c) => poly([P(fa,bAt(u0),zAt(u0,v0)), P(fa,bAt(u1),zAt(u1,v0)),
                                             P(fa,bAt(u1),zAt(u1,v1)), P(fa,bAt(u0),zAt(u0,v1))], c);
      for(let s=0;s<13;s++) sheet(s/13,(s+1)/13, 0,1, s%2 ? '#eceff2' : '#b22234');
      sheet(6/13,1, 0,0.40, '#3c3b6e');
      for(let r=0;r<3;r++) for(let c=0;c<4;c++)
        sheet(0.50+r*0.16, 0.57+r*0.16, 0.05+c*0.09, 0.10+c*0.09, '#eceff2');
      /* THE PILLAR BOX IS GONE, at Sir's direction. It stood at a
         247..281 against a 230 frontage -- entirely on the neighbour,
         not merely lapping, and reaching screen-a 258, twenty-eight
         past the far return. It was the one prop in cTodo, so the flag
         goes with it: the flagpole is wall-mounted and does not stand
         on the pavement, so this shop now has no ground props at all. */
    }
    if(state.roof) box(W*0.14,W*0.36,-160,-120,H,H+22,'#9aa0a6','#7d838a','#6a7076');
    kerb(p,'none');
  }
},
{
  name:'Pet shop', head:'Lit tanks, scalloped valance, glowing glass',
  tags:['aquarium glow','scalloped valance','warm interior','no pavement props'],
  desc:'The tanks have a lit front edge so the glow reads as coming out of the glass rather than being painted on it, and the fish are spheres set behind the pane at their own depth. The valance is a folded canopy with scalloped ends, not a stripe on the wall.',
  draw(p){
    const wall = '#e0d3b8', trim = '#3f6b4a', H = 154;
    body(wall, trim, H);
    slab(0,W, H, H+10, -1, -12, trim);
    F(10,W*0.64, 20, 108, '#2a3a34', shade(wall,.6), 3);   // see the door note below
    for(let r=0;r<3;r++) for(let c=0;c<3;c++){
      const x0 = 16+(W*0.60-16)*(c+0.06)/3, x1 = 16+(W*0.60-16)*(c+0.94)/3, z0 = 26+r*28;
      F(x0,x1, z0, z0+22, ['#4fb0a0','#5ab8c8','#3f9f86'][(r+c)%3], null,0,-1);
      F(x0,x1, z0+20, z0+22, '#d8f0e8', null,0,-1.5);
      F(x0,x1, z0, z0+2, 'rgba(216,240,232,.55)', null,0,-1.5);
      for(let k=0;k<2;k++) ball(x0+6+k*9, -3, z0+8+k*5, 3.4, ['#e8a13a','#f2ece0'][k]);
    }
    /* THE SAME TWO FAULTS AS THE BUTCHER, IN THE SAME NUMBERS. This is
       the strongest evidence yet that the extra window is a copied
       idiom rather than independent mistakes.

       shopDoor clamps to uw-hw-5 = 191.88. This shop asked for W*0.86 =
       197.8 and got 191.88 back -- drawn 5.92 from where the source
       says, to the hundredth the same displacement the Butcher had,
       because both wrote the same W*0.86 on the same 230 frontage.
       Underneath it, the surround runs a0-4..a1+4 and reached 154.8
       while the window ran to W*0.70 = 161: 6.2 of surround lying
       across the glass, again identical.

       And the extra window was the same CALL, not merely the same idea:
       F(W*0.78, W-14, 50, 90, ..., -6.5) here and F(W*0.78, W-14, 50,
       90, ..., -6.5) on the Butcher, differing only in fill colour. It
       sat at a 179.4..216, screen-a 185.9..222.5, straight over the
       doorway -- and covering the surround overlap, which is why
       neither shop showed the real fault until the window came off.

       Same repair as the Butcher, so the two stay in step: the glass
       gives up the space rather than the door being shaved. W*0.70 ->
       W*0.64 takes the window to 147.2 and the door comes to W*0.83 =
       190.9, INSIDE the clamp, so the number written here is the number
       drawn. Surround 153.8..228.0: 6.6 of pier from the glass, 2.0 at
       the return.

       THE TANK GRID HAD TO FOLLOW THE GLASS. It was laid out on
       W*0.66 and its right column reached a 149.1, which would have
       stood 1.9 PAST the narrowed window -- tanks hanging in the wall
       beside the frame. W*0.60 brings the column to 135.6, back inside
       with 11.6 of frame to spare. Narrowing a window is never just the
       window; whatever was measured off it moves too.

       THE DOOR GLASS IS PASSED EXPLICITLY, for the third time on this
       fault. Left to default, the fanlight comes out the kit's cool
       blue, which reads as a stray wedge under the valance against this
       shop's green -- and it only becomes visible once the extra window
       stops covering it. Butcher, Pawn shop and now here: any shop
       carrying the copied window is likely to have a bare shopDoor call
       hiding behind it too. */
    shopDoor(W*0.83, wall, trim, 'rgba(143,184,160,.55)');
    const out = 32;
    poly([P(4,0,128),P(W-4,0,128),P(W-4,out,112),P(4,out,112)], trim);
    poly([P(4,0,120),P(W-4,0,120),P(W-4,out,104),P(4,out,104)], shade(trim,.7));
    poly([P(4,0,128),P(4,out,112),P(4,out,104),P(4,0,120)], shade(trim,.6));
    poly([P(W-4,0,128),P(W-4,out,112),P(W-4,out,104),P(W-4,0,120)], shade(trim,.6));
    for(let i=0;i<10;i++){
      const x0=4+(W-8)*i/10, x1=4+(W-8)*(i+1)/10;
      const l=P(x0,out,112), r=P(x1,out,112), m=P((x0+x1)/2,out,100);
      ctx.beginPath(); ctx.moveTo(l.x,l.y); ctx.quadraticCurveTo(m.x,m.y+6,r.x,r.y); ctx.closePath();
      ctx.fillStyle = i%2 ? shade(trim,1.35) : '#f0e8d4'; ctx.fill();
    }
    /* MARGIN 0 AGAINST A RECESS OF 8 -- this shop's fTodo. It landed
       screen-a 1..238, eight past the far return. Margin 10 puts it on
       11..228. */
    slab(10,W-10, 128, 134, -1, -8, shade(trim,.8));
    /* THE BIRDCAGE AND THE KENNEL ARE BOTH GONE, at Sir's direction.

       The cage was the only piece on this shop that was geometrically
       sound -- hung at b 22, in FRONT of the glass where a hanging cage
       belongs, screen-a 34.8..86.8, well inside both returns. It came
       out because Sir wanted it out, not because it was wrong.

       The kennel was the opposite. It stood at a 240..286 against a 230
       frontage -- entirely on the neighbour, not merely lapping, and
       reaching screen-a 266, thirty-six past the far return. It was the
       one prop in cTodo, so the flag goes with it, and with the cage
       gone too there is no state.props branch left on this shop. */
    if(state.roof) box(W*0.30,W*0.56,-140,-100,H,H+20,'#9aa0a6','#7d838a','#6a7076');
    kerb(p,'none');
  }
},
{
  name:'Gym', ww: T2*4.4,
  wTodo:'two packing slots',
  head:'Double-width glass front, equipment on show, central entrance',
  tags:['double-width unit','full-height glazing','equipment on show','kettlebell sign','no pavement props'],
  desc:'Rebuilt at Sir\'s direction as a double-width unit with a glazed front: two full-height windows with real recesses, treadmills and a weight rack silhouetted behind the glass, and a central entrance between them.',
  draw(p){
    /* ================= REBUILT, AND TWICE AS WIDE =================
       The old gym was a 230 unit with no display glass at all -- a
       clerestory band of six small lights at z 108..142 and a blank
       wall under it, which is a warehouse elevation on a building
       people are supposed to look into. Sir asked for a double-width
       unit with big windows in front, so this is a rebuild rather than
       a polish pass and none of the old front survives.

       ww = T2*4.4 = 404.8, the same figure the Garage uses and for the
       same reason: it is exactly two of packEdgeNoGap's own slots
       (avgW = T2*2.2 = 202.4), so the port is a clean "this shop
       occupies two slots" rather than a number to reverse-engineer.
       Second wide shop in the library; wTodo says the packer still
       cannot place either of them. See the WIDE UNITS note at the head
       of this file.

       CENTRING IS DONE IN a, NOT ON SCREEN, and that is deliberate.
       The chemist note settles the rule: a is the axis that survives
       mirroring, b flips sign between mirrored edges, so world-centred
       is the only centring that holds on all four faces of the block.
       Everything symmetric here is symmetric about a = WW/2 = 202.4,
       and the apparent shift is kept small by keeping the stack
       shallow -- board -1, lettering -0.5, emblem 0.

       THE BENCH IS GONE AND THAT IS A KIT FAULT, NOT A CHOICE. The old
       shop ended kerb(p,'bench'), and kerb() places its props against
       the hardcoded W, not against the shop's own frontage -- there is
       no width argument. On a 404.8 building the bench would sit at
       W*0.08..W*0.52 = 18.4..119.6, laid out for a 230 unit and parked
       off to one side of a building nearly twice that. It does not lap
       the neighbour, so no census would flag it; it is simply measured
       off the wrong building. Left as kerb(p,'none') until kerb takes a
       width the way shopDoor already does. cTodo goes with it. */
    const WW = T2*4.4;
    const wall = '#4a4f55', trim = '#e8a13a', H = 210;
    const inner = shade(wall,.5), gear = '#cfd6db', lit = trim;
    body(wall, trim, H, WW);
    slab(0,WW, H, H+12, -1, -12, shade(wall,1.4));           // cornice, belongs to the building
    slab(14,WW-14, 0, 30, -1, -8, shade(wall,.8));           // stallriser, margin 14 beats recess 8

    /* ---- the two big windows ----
       Recess is 16 deep, so the a-margin has to beat 16 or the reveal
       crosses the return: left starts at 26, right ends at WW-26 =
       378.8 and reads screen-a 394.8 with 10 of pier. Symmetric in a
       about 202.4, which leaves the screen margins uneven at 26 and 10
       -- that is the cost of world-centring and the reason the recess
       is 16 rather than the 24 a shopfront would like. */
    const WINS = [[26,146],[258.8,378.8]];
    WINS.forEach(([x0,x1], w) => {
      reveal(x0, x1, 30, 140, 16, inner);
      /* Everything here lives between the pane at 0 and reveal's back
         plate at -16, so nothing is deeper than -13. Put a machine at
         -18 and it is behind the wall of its own shop. */
      if(w === 0){
        for(let i=0;i<3;i++){                                 // treadmills
          const tx = x0 + 15 + i*36;
          F(tx,    tx+26, 34,  50, gear, null,0,-12);         // deck
          F(tx+19, tx+24, 50,  98, gear, null,0,-12.4);       // upright
          F(tx+11, tx+27, 94, 110, lit,  null,0,-12.8);       // console, lit
        }
      } else {
        for(const rx of [x0+22, x0+96])                       // rack uprights
          F(rx-4, rx+4, 34, 116, gear, null,0,-12);
        for(let r=0;r<3;r++){                                 // bars with discs
          const rz = 46 + r*28;
          F(x0+22, x0+96, rz, rz+5, gear, null,0,-12.4);
          for(const dx of [x0+34, x0+84]) ball(dx, -12.8, rz+2, 9, lit);
        }
      }
      /* THE PANE WAS 92% OPAQUE AND I HAD NOT READ IT. First pass drew
         the equipment at shade(wall,1.45) against a shade(wall,.55)
         backing -- a real difference in the numbers -- and the window
         still came out as one flat blue rectangle. Raising the contrast
         to near-white barely helped, which is what sent me to the kit:
         glaze()'s default tint is rgba(104,146,168,.92). That is not
         glass, it is a wall the colour of glass, and nothing behind it
         was ever going to show.

         The chemist gets away with the default because its shelf lines
         sit at b +1.6 -- in FRONT of the pane, not behind it. That is
         fine for a painted shelf line and wrong for a treadmill, which
         is inside the building. So the tint is passed explicitly at .35
         and the equipment stays where it belongs, behind the glass.

         Worth carrying: anything meant to be SEEN THROUGH glaze needs
         its own tint. The default is for windows with nothing behind
         them. */
      glaze(x0, x1, 30, 140, null, 'rgba(104,146,168,.35)');
      /* Mullions and transom stand PROUD of the pane at -0.5, not
         behind it. A shopfront frame is in front of its glass; the
         glaze() note in the kit is about exactly this, and putting them
         at -1.5 would hide them inside the window under any depth key. */
      for(let k=1;k<4;k++){
        const mx = x0 + (x1-x0)*k/4;
        F(mx-2.5, mx+2.5, 30, 140, shade(wall,1.3), null,0,-0.5);
      }
      F(x0, x1, 96, 101, shade(wall,1.3), null,0,-0.5);
    });

    /* ---- the entrance ----
       The bay between the windows is 146..258.8, 112.8 wide. A shop
       door and its surround is 74.2, centred on 202.4, so it runs
       165.3..239.5 with 19.3 of pier a side. The clamp does not bite
       here: uw-hw-5 on a 404.8 frontage is 366.7 and this asks for
       202.4, so the number written is the number drawn -- worth stating
       because it is the first door in several shops that is. */
    F(158, 246.8, 0, 118, shade(wall,.9), null,0, 0.4);       // entrance surround
    shopDoor(WW/2, wall, trim, 'rgba(143,180,196,.55)', WW);
    slab(150, 254.8, 118, 130, -2, -9, trim);                 // header over the entrance

    /* ---- the fascia ----
       Board margin 18 against a recess of 10, so it reads screen-a
       19..396.8 and keeps a pier at both returns. The lettering is
       PROUD at -0.5, not the -9.5 the old one used: that convention
       puts the panel behind the board it is painted on and it survives
       on call order alone. This shop carried exactly that as its
       fTodo, along with a +3 return on the board itself; both are gone
       by construction rather than by patch. */
    slab(18,WW-18, 152, 196, -1, -10, shade(wall,1.15), null, trim);
    F(WW/2-100, WW/2+100, 162, 186, trim, null,0,-0.5);       // name panel, centred in a
    /* Kettlebells at both ends, mirrored about 202.4. A sphere's own
       depth radius shifts its near edge, so these sit at b 0 with the
       ball symmetric -- no net screen shift at all, which is what keeps
       the pair looking level. */
    for(const kb of [WW/2-148.4, WW/2+148.4]){
      ball(kb, 0, 168, 10, trim);
      tube(kb-6, 0, 179, kb+6, 0, 179, 2, trim);
      tube(kb-6, 0, 179, kb-4, 0, 185, 2, trim);
      tube(kb+6, 0, 179, kb+4, 0, 185, 2, trim);
    }

    if(state.roof){
      /* THE DUCT RUN IS GONE, at Sir's direction. Five cylinders with
         joint collars ran back from a WW*0.28 at b -30 to -206, and it
         was the one part of the old gym I had carried through the
         rebuild on the grounds that it was the shop's signature and had
         never been the broken part. It reached screen-a 375 against a
         plant box starting at 418, so it cleared -- it goes because the
         glazed front is the signature now and the roof does not need a
         second one competing with it. */
      box(WW*0.76,WW*0.96,-150,-110,H,H+30,'#8f969d','#787f86','#697077');
    }
    kerb(p,'none');   // see the bench note above
  }
},
{
  name:'Bookshop', tall:true,
  head:'Two flush storeys, books behind real glass, hanging sign',
  tags:['two full storeys','flush elevation','books behind glass','string course','swinging sign'],
  desc:'A true two-storey building with both storeys on one plane: a shopfront of 168 with the books behind a real recess and a tinted pane, and an upper floor of 168 over it divided by a single string course. The hanging sign is a board on an arm with its own thickness.',
  draw(p){
    /* ================= IT WAS TWO STOREYS IN THE SPACE OF ONE =======
       THE DOOR WAS TALLER THAN THE FLOOR IT STOOD IN. That is the
       finding that settles this, and it is a collision rather than an
       opinion about scale: the shop door's head is at z 107.9 and its
       painted surround reaches 114.9, while the jetty soffit sat at
       z 104. The doorway punched through the overhang by 10.9 and had
       presumably done so since the shop was written.

       The rest agrees with it. H was 206 carrying two drawn floors --
       ground 0..104 and upper 104..206 -- so each came out about 103
       against a game storey of 168. zTodo said 1.23 for a building
       depicting two storeys, which is the Rooming house fault exactly:
       a facade drawing more floors than its height can pay for.

       Rebuilt at Sir's direction as a true two-storey building: 168 of
       shopfront storey and 168 of jettied upper floor, H 336 = 2.00
       game storeys on the nose. zTodo is gone because it has been done.
       Note this is a taller reading than the Rooming house took -- that
       one used a 120 ground and 100 residential floors, deliberately
       short. Sir chose full storeys here, so a bookshop's ground floor
       now has 168 to put a shopfront in and the door clears the soffit
       by 53.

       STILL OPEN, AND NOT A NEW FAULT: the jetty projects b 34, and
       forward projection shifts left on screen, so the upper storey
       lands at screen-a -34. Same class as the Butcher's awning at
       building scale rather than canopy scale, and left for the same
       one decision that should cover every projecting element in the
       library. A jetty that does not overhang is not a jetty. */
    const wall = '#8a6a4e', trim = '#e6dcc4', H = 336, GF = 168;
    const inner = shade(wall,.35);
    body(wall, trim, H);
    /* THE JETTY IS GONE AND SO IS EVERYTHING THAT CARRIED IT, at Sir's
       direction: too many faces for what it bought. What came out was
       the overhanging upper face at b 34, the soffit under it, the
       jetty return, the bressummer and the three shaped brackets --
       and with them the whole band of near-parallel edges that was the
       problem in the first place.

       The upper storey is FLUSH with the shopfront now, both on the
       wall plane the body already draws, so there is no second face at
       all up there. The storey line is one string course instead of a
       beam, a soffit, three corbels and their four faces each.

       It also settles the projecting-element question for this shop by
       removing the projection. The jetty was the worst overhang in the
       library at screen-a -34, worse than the Butcher's awning; the
       only thing that laps a neighbour here now is the hanging sign,
       which is a sign and is supposed to. */
    /* THE JETTY HAD NO BRESSUMMER, which is what Sir circled. The upper
       storey's front face at b 34 and the soffit at z 168 met at a
       knife edge -- geometrically closed, and with nothing at all along
       the leading edge, so a storey that overhangs 34 had zero
       thickness where it overhangs. The beam that carries a jetty is
       the one member the detail cannot do without, and it was missing
       in the old shop too; at half the height it just did not show.

       It runs the full frontage because a bressummer does, and it sits
       proud of the jetty face at b 36 against 34. That puts it at
       screen-a -36 against the jetty's -34, so it is two units worse on
       the projecting-element question and no different in kind.

       THE BRACKETS HAD TO DROP TO MEET IT. They topped out at z 168,
       which is now inside the beam, so each one would have been buried
       for its top 16 and read as a stub. They stop at the beam's
       underside at 152 instead, keeping the same 14 and 46 tapers below
       their new top -- which is also what a bracket does in the world:
       it carries the beam, it does not run past it. */
    /* THE JETTY BAND WAS SEVEN PARALLEL LINES IN THIRTY-SIX UNITS, which
       is what Sir meant by messy. Counted from the census: window head
       132, head band 134 and 148, bracket tops 152, bressummer bottom
       152 and top 170, soffit 168. Two of them were crossings rather
       than stacking -- the brackets ran down to z 106, BELOW the window
       head, so they cut across the top of the glass, and the bressummer
       sat at b 26..36 against a jetty face at 34, so it stood two proud
       of the storey and put an extra edge on both sides of it.

       Three changes, and they remove five of the seven lines.

       The bressummer is COPLANAR with the jetty face now, b 34 back to
       22 rather than 36 back to 26. Its front is the same plane as the
       storey above it, so there is no step and no shadow line -- it
       reads as the thickened base of the upper floor, which is what a
       bressummer is, instead of a separate board bolted to it. It also
       stops being the worst overhang on the shop: screen-a -34, equal
       to the jetty rather than 2 past it.

       The brackets stop at z 128 instead of 106. They were dropping 46
       into a storey whose window head is at 132, so the bottom of every
       bracket crossed the glass. Checked in APPARENT terms this time:
       the front bottom corner at b 34 z 138 reads appz 126.7, and the
       window head is appz 120, so it clears by 6.7 rather than cutting
       in. Same corbel shape, two thirds the drop.

       And the head band I added last pass is gone. It was the right
       instinct -- the shopfront did need tying together -- and the
       wrong member: it put two more lines into the busiest part of the
       elevation. The window head does that job instead, see below. */
    /* One string course marks the floor line, margin 14 against a
       recess of 9 so it keeps a pier at both returns: screen-a 15..225.
       That is the whole of what the jetty band used to be. */
    slab(14,W-14, GF-6, GF+8, -1, -9, shade(wall,.78));
    slab(0,W, H, H+10, -1, -11, shade(wall,.66));            // cornice

    /* ---- upper storey windows ----
       THREE FAULTS, ALL VISIBLE AND ALL MEASURABLE.

       THE GLASS SAT OUTSIDE ITS OWN FRAME. Frame at b -1..-8, glass at
       -8.5 -- behind the frame's back face, which is the lettering-
       behind-a-board fault wearing a different hat, and gone under any
       depth key. On screen the frame read 18.7..85.6 and the glass
       29.2..83.1: a 10.5 border on one side against 2.5 on the other.
       That lopsided border is what made them look wrong.

       Fixed by solving for the depth rather than nudging it. A slab at
       b -1..-8 spans screen a0+1..a1+8, so its screen centre is
       a_centre + 4.5; glass at depth g has screen centre a_centre - g.
       Setting those equal gives g = -4.5 exactly, which also lands the
       glass centred in APPARENT z at 244.5 against the frame's 244.5.
       One number fixes both axes because both come from the same b.

       THE FRAMES WERE TOUCHING. Window 1 ended at screen 85.6 and
       window 2 began at 86.1 -- half a unit of wall between them, so
       they read as one band of joinery rather than three windows. The
       cause is the same 7 units of screen width a recessed slab eats
       beyond its a span: at a pitch of 67.3 and a frame of 59.9 the
       a-gap was 7.4 and the screen gap was 0.4. Screen gap is
       pitch - width - 7, so a 14 gap needs pitch = width + 21. 48 wide
       on a 69 pitch gives 14 of pier between them and 18 and 19 at the
       returns.

       THE MULLIONS WERE DEEPER THAN THE GLASS at -9. They stand proud
       of it now at -3.8, which is what glazing bars do and what the
       kit's own glaze() note says about stacks ascending toward the
       viewer. Four columns of panes in a narrower window would have
       been 10 wide, so it is three now: twelve panes rather than
       sixteen, and each one big enough to read. */
    for(let i=0;i<3;i++){
      const fx0 = 17 + i*69, fx1 = fx0 + 48;
      slab(fx0, fx1, 196, 290, -1, -8, trim);
      const gx0 = fx0 + 3, gx1 = fx1 - 3;
      F(gx0, gx1, 204, 282, '#7f93a0', null,0, -4.5);
      for(let k=1;k<3;k++) F(gx0+(gx1-gx0)*k/3-1.2, gx0+(gx1-gx0)*k/3+1.2, 204,282, trim, null,0, -3.8);
      for(let k=1;k<4;k++) F(gx0,gx1, 204+78*k/4-1.2, 204+78*k/4+1.2, trim, null,0, -3.8);
    }

    /* ---- the shopfront ----
       THE WINDOW IS A REAL RECESS NOW, not an opaque panel. It used to
       be a flat F at b 0 with the books painted on it at -1 and the
       ladder at -4..-14 BEHIND it -- a solid fill with a ladder hidden
       inside, alive on call order alone and gone the instant anything
       depth-sorts it. Same shape of fault as the gym's equipment, and
       the fix is the same: reveal for the recess, content between the
       pane and the back plate, and an explicit tint on the glaze.

       glaze()'s default tint is rgba(104,146,168,.92), which is not
       glass but a wall the colour of glass. .32 here, so the books and
       the ladder read through it. */
    const wx1 = W*0.62;
    reveal(10, wx1, 26, 120, 14, inner);
    /* THE BOOKS DID NOT FIT THE OPENING, AND MY CENSUS COULD NOT SEE IT.
       The real projection is y = ((a+b)*0.5 - z*ZSCALE)*K, so b moves a
       thing VERTICALLY as well as horizontally -- and every screen check
       in this session had been computing x = a - b only. Content at
       b -9 sits 3 higher than its z says, because the equivalent z at
       b 0 is z - b/(2*ZSCALE) = z - b/3.

       So the top rank of books, written at z 128 against a window head
       of 132, actually landed at an apparent 131: one unit of
       clearance, and on screen it read as books spilling out of the
       top-right corner of the glass. Sideways it was no better, 138.7
       against a jamb at 142.6.

       Sized in APPARENT terms now, which is the only frame that means
       anything for content behind a pane. The grid runs a 14..118.6 and
       z 34..104, which after the b -9 shift is 23..127.6 across and
       37..107 up, inside a 10..142.6 by 26..120 opening with 13 to 15
       of margin on every side. */
    for(let r=0;r<4;r++) for(let i=0;i<7;i++)
      F(14+i*15.43, 14+i*15.43+12.03, 34+r*18, 50+r*18,
        ['#8f2b2b','#2f6f8f','#c9a24a','#3f6b4a','#7a4a6b'][(i+r)%5], null,0,-9);
    /* THE LADDER IS GONE, at Sir's direction. It was a sliding library
       ladder on rails, leaning at b -6..-11 inside the window, and it
       is worth recording that it was BROKEN before the rebuild and
       nobody could see it: the old shopfront was an opaque F at b 0
       with the ladder drawn behind it, surviving on call order alone.
       Making the window a real recess is what put it on show, and it
       came off one render later. */
    glaze(10, wx1, 26, 120, null, 'rgba(127,147,160,.32)');

    /* ---- the entrance ----
       CLAMPED, and the extra window was covering it. W*0.84 = 193.2
       against a clamp limit of 191.88, so the door was drawn 1.32 from
       where the source said. And F(W*0.74, W-14, 52, 90, ..., -6.5) sat
       at a 170.2..216, screen-a 176.7..222.5, laid over the doorway --
       the same idiom found on the Butcher, the Pawn shop and the Pet
       shop, in a different fraction.

       Door to W*0.83 = 190.9, inside the clamp. The window gives up the
       space it needed: W*0.66 -> W*0.62 takes the glass to 142.6 and
       the book ranks follow W*0.62 -> W*0.58, which puts the last rank
       at 129.7 rather than hanging past the frame. Surround
       153.8..228.0, so 11.2 of pier from the glass and 2.0 at the
       return. Door glass passed explicitly so the fanlight does not
       default to the kit's cool blue. */
    shopDoor(W*0.83, wall, trim, 'rgba(127,147,160,.55)');
    /* THE WINDOW HEAD DOES THE TYING, not a band. It comes down from
       132 to 120, which puts it within 5 of the door surround at 114.9
       -- close enough to read as one shopfront under one line, and it
       leaves the wall above clear for the brackets instead of putting
       a second horizontal into the busiest part of the elevation. The
       book grid follows it down to z 34..104. */

    if(state.props){
      /* THE SIGN LANDED ON THE DISPLAY WINDOW. Scaled up as it was, the
         arm reached b 60 and the board hung at 56..62, so it shifted
         about 59 left on screen and covered the lower half of the shop
         window -- which is now the showpiece, with the books and the
         ladder behind real glass. It was not wrong before because the
         window was an opaque panel with nothing worth seeing in it.

         Two changes. The arm springs from the WALL at b 2 rather than
         starting at b 30 in mid-air under the overhang, and it reaches
         only b 30, so the sign hangs under the jetty instead of beyond
         it -- which is what a jettied building gives you the overhang
         for. And it moves right to a 170.2..225.4, so it reads screen-a
         138.2..199.4 against a window that ends at 142.6: 4 of overlap
         instead of 40, and the board sits over the doorway where a shop
         sign belongs. */
      tube(W*0.86, 2, GF-14, W*0.86, 30, GF-14, 2, '#4a3a2c');
      tube(W*0.86, 28, GF-14, W*0.86, 28, GF-26, 1.2, '#4a3a2c');
      slab(W*0.74, W*0.98, GF-60, GF-26, 32, 26, trim, shade(wall,.6), shade(trim,1.1));
      F(W*0.77, W*0.95, GF-50, GF-45, shade(wall,.7), null,0, 32.5);
      F(W*0.77, W*0.91, GF-40, GF-35, shade(wall,.7), null,0, 32.5);
    }
    if(state.roof) box(W*0.30,W*0.54,-150,-108,H,H+22,'#8f969d','#787f86','#697077');
    kerb(p,'none');
  }
},
{
  name:'Photo studio', head:'North-light glazing, portraits behind real glass',
  tags:['sawtooth north light','glazing bars','portrait cases','glass roof plane','depth-ordered roof'],
  desc:'Each sawtooth has a solid upstand behind the glass and a capping at the ridge, so the roof reads as built rather than as two blue sheets, and the two teeth are drawn far to near so the back one no longer lands on the front one. The portraits stand in a real recess behind a tinted pane.',
  draw(p){
    const wall = '#c8c2b4', trim = '#3a3f4a', H = 172;
    body(wall, trim, H);
    slab(0,W, H, H+8, -1, -12, trim);
    /* ================= THE SAWTEETH WERE DRAWN BACK TO FRONT =========
       Sir kept the skylights and asked for the stacking fixed, and the
       stacking was one character: the loop ran i = 0 then 1, which is
       NEAR tooth then FAR tooth. On a painter's canvas the far one then
       lands on top of the near one, which is why the back tooth's tan
       upstand was sitting across the front tooth's glass.

       Measured: tooth 1's upstand occupies screen-a 150..364 and tooth
       2's glass 162..454, so they overlap across nearly their whole
       width and only call order decides which wins. Far to near now,
       and within each tooth the order was already right -- upstand at
       b -142 before glass at -50..-128, which is far before near.

       Worth noting which way round this fault runs. Everything else
       found this session survives ON call order and would die under a
       depth key; this one dies on call order and a depth key would fix
       it. Both are worth finding before the port, for opposite reasons. */
    for(let i=1;i>=0;i--){
      const b0 = -50 - i*104, b1 = b0 - 78;
      poly([P(8,b1,H+46),P(W-8,b1,H+46),P(W-8,b1-14,H+46),P(8,b1-14,H+46)], shade(trim,1.2));  // upstand top
      F(8,W-8, H, H+46, shade(wall,.86), null,0, b1-14);                                        // upstand face
      poly([P(8,b0,H),P(W-8,b0,H),P(W-8,b1,H+46),P(8,b1,H+46)], '#8fb0c4', shade(trim,1.6), 2);
      for(let k=1;k<5;k++){
        const t=k/5;
        poly([P(8+(W-16)*t-2, b0, H),P(8+(W-16)*t+2, b0, H),
              P(8+(W-16)*t+2, b1, H+46),P(8+(W-16)*t-2, b1, H+46)], shade(trim,1.4));
      }
      /* THE ENDS WERE SQUARES ON A WEDGE. S() draws a rectangle in the
         b-z plane, so each tooth was capped with a full b0..b1 by
         H..H+46 block -- but a sawtooth end is a PROFILE, and this
         tooth's profile is a ramp climbing from the eaves at (b0, H)
         to the ridge at (b1, H+46), then the upstand dropping back to
         (b1-14, H). The square filled in all the air under the ramp
         and left the upstand's own end uncovered, which is why the
         glass looked like it was slotted into a solid block.

         Drawn as the profile now, one quad per end following the same
         four corners the rest of the tooth already uses: eaves, ridge,
         back of the upstand at the ridge, back of the upstand at the
         deck. The base edge closes it along z = H. Nothing new is
         invented here -- b0, b1 and b1-14 are the numbers the ramp and
         the upstand were already built from, so the end cannot drift
         out of step with them the way a separately-written rectangle
         could. */
      /* AND ONLY THE VISIBLE END GETS DRAWN. Both were, unconditionally
         -- and the a = 8 end faces AWAY from the camera, so it had no
         business being drawn at all. Painted after the ramp, it landed
         on top of the glass, which is what Sir circled: a tan wedge
         lying across the panes at the left of each tooth.

         This is a solved problem in the kit and the shop was not using
         the solution. body() draws one end wall gated on FLANK_RIGHT,
         which is the host's copy of drawStoreUnit's own showRight test
         -- and the reason it exists is that the a = w end is the
         visible one on only half the block edges in the game. Hardcoding
         both ends is wrong twice over: it overdraws here, and in the
         game it would put a wall on the face the cull says is hidden.
         Same gate, same reason. */
      const endA = FLANK_RIGHT ? W-8 : 8;
      poly([P(endA,b0,H),P(endA,b1,H+46),P(endA,b1-14,H+46),P(endA,b1-14,H)],
           shade(wall, FLANK_RIGHT ? .7 : .82));
    }
    /* ---- the shopfront ----
       IT WAS AN OPAQUE PANEL WITH THE PORTRAITS HIDDEN BEHIND IT. The
       window was a flat F at b 0 and the three cases sat at b -2..-8
       behind it, visible only because they are painted afterwards --
       the Bookshop's ladder fault again, and the third instance of it.
       A real recess now, with the cases between the pane and the back
       plate at -14, and an explicit tint because glaze()'s default is
       rgba(104,146,168,.92) and nothing survives behind that.

       The cases already fitted once measured properly: screen 26..118.7
       and appz 44.7..94.7 inside an opening of 12..138 by 24..112, so
       14 to 20 of margin on every side. They keep their positions. */
    reveal(12, W*0.60, 24, 112, 14, shade(wall,.5));
    F(18,W*0.54, 32, 104, shade(wall,.72), null,0,-13);        // back wall inside the shop
    for(let i=0;i<3;i++){
      const x0 = 24+i*((W*0.50-24)/3), x1 = x0 + 26;
      slab(x0,x1, 44, 92, -2, -8, '#e8ddc8', trim, shade('#e8ddc8',1.1));
      F(x0+4,x1-4, 52, 86, ['#9aa8b4','#b09a8c','#8ea89a'][i], null,0,-2.5);
      ball((x0+x1)/2, -3, 76, 5, '#e8ddc8');
    }
    glaze(12, W*0.60, 24, 112, null, 'rgba(110,124,140,.30)');
    /* THE EXTRA WINDOW IS GONE. F(W*0.70, W-16, 50, 90, ..., -6.5) sat
       at a 161..214, screen-a 167.5..220.5, laid over a doorway running
       153.5..227.7 -- the same copied idiom as the Butcher, Pawn shop,
       Pet shop and Bookshop, in yet another fraction. The door itself
       is clean here: W*0.83 = 190.9 against a clamp limit of 191.88, so
       it is drawn where the source says. */
    shopDoor(W*0.83, wall, trim, 'rgba(110,124,140,.55)');
    /* BOTH HALVES OF fTodo. The board ran 6..W-6 at b -1..-9 and landed
       screen-a 7..233, three past the far return -- margin 6 against a
       recess of 9. Margin 12 puts it on 13..227.

       And the lettering sat at b -9.5 against a board whose back face
       is -9: class B, inside the thing it is painted on. Proud at -0.5,
       and then set out in BOTH screen axes rather than in a, because
       moving its depth moves it in x and in apparent z together. Board
       reads screen 13..227 centred on 120 and appz 120.3..149 centred
       on 134.7; the panel at b -0.5 lands screen 35..205 centred on 120
       and appz 127.7..141.7 centred on 134.7. Centred on both. */
    slab(12,W-12, 120, 146, -1, -9, trim);
    F(34.5,204.5, 127.5, 141.5, shade(wall,1.12), null,0,-0.5);
    if(state.roof) box(W*0.62,W*0.86,-30,-6,H,H+18,'#9aa0a6','#7d838a','#6a7076');
    kerb(p,'none');
  }
},
{
  name:'Toy shop', ww: T2*4.4,
  wTodo:'two packing slots',
  head:'Big-box toy store, alphabet-block fascia, no pavement props',
  tags:['double-width unit','big-box format','alphabet block sign','toys behind real glass','primary palette'],
  desc:'Rebuilt at Sir\'s direction as a big-box toy store: a double-width unit with two very large glazed bays, a central entrance, and a fascia of oversized alphabet blocks in primary colours. Everything fun is ON the building -- there are no pavement props at all.',
  draw(p){
    /* ================= REBUILT AS A BIG BOX =================
       The old toy shop was a 230 unit at H 150 with a bear, a kite on a
       string and three pinwheels standing on the pavement -- a corner
       shop pretending to be a toy shop by putting toys outside it. Sir
       asked for the opposite: a huge store, no pavement props, and the
       fun carried by the building instead.

       ww = T2*4.4 = 404.8, the third wide unit after the Garage and the
       Gym, and anchored the same way: exactly two of packEdgeNoGap's
       own slots (avgW = T2*2.2 = 202.4). wTodo says the packer still
       cannot place any of the three.

       H = 252, which is 1.50 game storeys exactly -- one tall trading
       volume rather than two floors, which is what a big box is. Tall
       enough to carry a deep fascia over full-height glazing, and the
       parapet hides the roof the way a real one does.

       NO PAVEMENT PROPS, and that is the point rather than an omission.
       Everything here is on the building: the blocks are on the fascia,
       the toys are behind glass, the roof carries the oversized ones.
       cTodo goes with the old props -- three of them, sixty units past
       the frontage between them. */
    const WW = T2*4.4;
    const wall = '#f4f2ec', trim = '#d8352a', H = 252;
    const BLU = '#2f6fd0', YEL = '#f2c230', GRN = '#3fa85c', ORG = '#e07a2a';
    const TOY = [trim, BLU, YEL, GRN, ORG];
    const inner = '#2a2f36';
    body(wall, trim, H, WW);
    slab(0,WW, H, H+14, -1, -14, trim);                      // parapet, belongs to the building
    slab(14,WW-14, 0, 30, -1, -8, shade(wall,.82));          // stallriser, margin 14 beats recess 8

    /* ---- two very large glazed bays ----
       Symmetric in a about WW/2 = 202.4, which is the mirroring-safe
       centring the chemist note settles. Recess 14, so the a-margin has
       to beat 14: left starts at 26 and right ends at 378.8, reading
       screen-a 392.8 with 12 of pier. The entrance bay between them is
       135..269.8, 134.8 wide, which takes a door and its surround with
       30 of pier either side. */
    const WINS = [[26,135],[269.8,378.8]];
    WINS.forEach(([x0,x1], w) => {
      reveal(x0, x1, 34, 150, 14, inner);
      /* Toys behind the pane, sized in APPARENT terms. Content sits at
         b -10, which shifts it 10 right and 3.33 UP -- the projection
         moves b in both axes and only the second one is easy to forget.
         Blocks run z 40..120, appz 43.3..123.3 inside an opening of
         34..150; and a 34..115, screen 44..125 inside 26..135. */
      for(let k=0;k<3;k++)                                   // a tower of blocks
        F(x0+10+k*3, x0+40+k*3, 40+k*28, 64+k*28, TOY[(k+w*2)%5], null,0,-10);
      ball(x0+66, -10, 55, 11, TOY[(w*3+1)%5]);              // a ball beside it
      for(let k=0;k<2;k++)                                   // and two more stacked
        F(x0+82, x0+108, 40+k*26, 62+k*26, TOY[(k+w+3)%5], null,0,-10);
      glaze(x0, x1, 34, 150, null, 'rgba(150,180,205,.30)');
      /* Mullions PROUD of the pane at -0.5, not behind it. Four lights
         to a bay; the kit's glaze() note is about exactly this stack
         ascending toward the viewer. */
      for(let k=1;k<4;k++){
        const mx = x0 + (x1-x0)*k/4;
        F(mx-3, mx+3, 34, 150, trim, null,0,-0.5);
      }
      F(x0, x1, 112, 118, trim, null,0,-0.5);                // transom
    });

    /* ---- the entrance ----
       Centred on WW/2. The clamp does not bite on a frontage this wide:
       uw-hw-5 is 366.7 and this asks for 202.4, so the number written
       is the number drawn. Glass passed explicitly rather than left to
       the kit's cool blue default. */
    F(150, 254.8, 0, 126, shade(wall,.9), null,0, 0.4);      // entrance surround
    shopDoor(WW/2, wall, trim, 'rgba(150,180,205,.55)', WW);
    slab(142, 262.8, 126, 140, -2, -9, BLU);                 // header over the entrance

    /* ---- bunting, because Sir asked for fun ----
       A row of pennants across the whole frontage at b -0.5, proud of
       the wall. Triangles rather than a painted stripe: each one is a
       real poly with its own two top corners on the string. */
    for(let i=0;i<14;i++){
      const px0 = 22 + i*27, px1 = px0 + 22;
      poly([P(px0,-0.5,182),P(px1,-0.5,182),P((px0+px1)/2,-0.5,160)], TOY[i%5]);
    }
    F(18,WW-18, 182, 185, shade(wall,.6), null,0,-0.6);      // the string

    /* ---- the fascia ----
       A shallow board on purpose. A slab at b -1..-5 has its screen
       centre at a_centre + 3, and the blocks applied to it sit at -0.5
       with a shift of 0.5 -- so the two are 2.5 apart rather than the
       5.5 a deeper board would give. That is the chemist's rule: keep
       an applied element symmetric in a and keep the stack shallow,
       because a survives mirroring and b does not.

       Five oversized alphabet blocks, 44 square on a 62 pitch, centred
       on 202.4. Each has a face panel inset so it reads as a block with
       a letter plate rather than a flat coloured square. */
    slab(16,WW-16, 190, 244, -1, -5, trim, null, shade(trim,1.25));
    for(let i=0;i<5;i++){
      const bx = 202.4 - 155 + i*62;
      F(bx, bx+44, 195, 239, TOY[(i+1)%5], null,0,-0.5);
      F(bx+7, bx+37, 202, 232, shade(wall,1.02), null,0,-1.1);
    }

    if(state.roof){
      /* Oversized blocks on the roof, which is where the fun goes when
         the pavement is off limits. Set back behind the parapet so they
         read as sitting on the deck rather than balanced on the edge. */
      const RB = [[60,-70,GRN],[150,-120,BLU],[236,-64,YEL]];
      for(const [ra,rb,rc] of RB) box(ra, ra+52, rb-52, rb, H, H+46, rc, shade(rc,.82), shade(rc,1.15));
      box(WW*0.80,WW*0.94,-150,-110,H,H+26,'#8f969d','#787f86','#697077');
    }
    kerb(p,'none');   // no pavement props at all, per Sir
  }
},
{
  name:'Milliner', head:'Hat sign on a bracket, hats and boxes in one deep window',
  tags:['top hat bracket sign','hats on turned stands','striped hat boxes','dome awning','slim unit'],
  desc:'Recognisable as a hat shop from the street: a top hat hanging on a bracket over the door, a wide window with hats on turned stands at two levels, and a stack of striped hat boxes. The hats are built from a disc brim and a real crown rather than painted on.',
  draw(p){
    /* ================= REDESIGNED TO READ AS A HAT SHOP =============
       Sir asked for it to be recognisable as a milliner. The old shop
       had the right idea and could not carry it, for a reason worth
       recording.

       A DISC'S SCREEN WIDTH IS 4r, NOT 2r. plateCircle(ha, b, z, r)
       occupies a from ha-r to ha+r AND b from b-r to b+r, and screen-a
       is a - b, so it spans ha-b-2r to ha-b+2r. Its own depth radius
       adds r on each side. The old shop split a 190 frontage into three
       42-wide bays, which caps a brim at r 7.5 -- and a hat whose brim
       is 15 across with a ball on top is a mushroom, which is what it
       looked like. One wide window instead of three narrow ones is what
       buys a brim big enough to read as a hat.

       AND ONE OF THE THREE BAYS WAS BEHIND THE DOOR. Bay 2 ran a
       69.5..120.5 against a door surround of 57.6..131.8, so a third of
       the display was drawn where nobody could see it.

       What makes it legible now, in order of how far away it works
       from: a top hat hanging on a bracket over the door, big enough to
       read as a silhouette; then two hats on turned stands at two
       levels in the window; then the stack of striped boxes. The dome
       awning survives the rebuild -- Sir liked it -- as one wide hood
       over the window rather than three little ones. */
    const wall = '#5a4a63', trim = '#e8d9c0', H = 176, WW = 190;
    const inner = shade(wall,1.02), ROSE = '#c26a7e', TEAL = '#4a7a6a', GOLD = '#c9a24a';
    body(wall, trim, H, WW);
    slab(0,WW, H, H+10, -1, -12, shade(wall,.7));

    /* ---- the window ----
       One bay, 10..96, recess 16. Everything inside sits at b -8, half
       the recess, so it is genuinely between the pane and the back
       plate rather than behind either. Screen centres are a + 8 and
       every disc is checked on the 4r rule above.

       THE INTERIOR IS LIGHT ON PURPOSE. First pass used shade(wall,.45)
       and a top hat is black, so the best-built object in the window
       was invisible -- the gym's contrast fault, walked into a second
       time. A hat shop's window is lit from inside anyway, so the
       backing goes to shade(wall,1.02) and the dark hats read against
       it instead of dissolving into it. */
    reveal(10, 96, 26, 122, 16, inner);
    F(14, 92, 88, 92, shade(wall,1.15), null,0,-11);          // the upper shelf
    /* Stack of striped hat boxes, r 7 so they span 28 on screen at
       64..92, inside the opening with 4 of margin. */
    for(let k=0;k<3;k++){
      cyl(70, -8, 28+k*15, 41+k*15, 7, [ROSE,GOLD,TEAL][k]);
      plateCircle(70, -8, 41+k*15, 7.6, shade([ROSE,GOLD,TEAL][k],1.2));
    }
    /* Top hat on a turned stand, lower left. Brim r 10 spans 40 on
       screen at 20..60; the crown is a real cylinder, not a ball. */
    cyl(30, -8, 26, 52, 2.5, shade(wall,1.5));
    plateCircle(30, -8, 52, 10, '#2e2a33', shade('#2e2a33',1.4), 2);
    cyl(30, -8, 52, 76, 6.5, '#2e2a33');
    plateCircle(30, -8, 76, 6.5, shade('#2e2a33',1.35));
    F(23.5, 36.5, 54, 60, ROSE, null,0,-14.6);                // hat band
    /* Wide-brim hat on the upper shelf. Brim r 13 spans 52 on screen at
       28..80, and the crown is a shallow dome rather than a sphere. */
    plateCircle(46, -8, 96, 13, TEAL, shade(TEAL,.72), 2);
    ball(46, -8, 100, 8, shade(TEAL,1.12));
    F(38, 54, 97, 102, GOLD, null,0,-16.2);                   // ribbon
    glaze(10, 96, 26, 122, null, 'rgba(150,150,175,.30)');

    /* ---- one dome awning over the window ----
       Kept because Sir liked it, rebuilt as a single hood. It reaches
       b 14 rather than the old 28: a canopy shifts LEFT on screen by
       its own projection, and at 28 from a 12 start it crossed the near
       return. From 22 with a 14 bulge the whole curve stays inside
       22..90. Hood, shaded underside and a bright hem, in that order,
       so the underside is not painted over the hood it belongs to. */
    {
      const l=P(22,0,130), r=P(90,0,130), m=P(56,14,110);
      ctx.beginPath(); ctx.moveTo(l.x,l.y);
      ctx.quadraticCurveTo(m.x, m.y-30*K, r.x, r.y);
      ctx.quadraticCurveTo(m.x, m.y+2*K, l.x, l.y);
      ctx.closePath(); ctx.fillStyle=ROSE; ctx.fill();
      ctx.strokeStyle=shade(wall,.6); ctx.lineWidth=2; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(l.x,l.y+2);
      ctx.quadraticCurveTo(m.x, m.y+10*K, r.x, r.y+2);
      ctx.quadraticCurveTo(m.x, m.y+3*K, l.x, l.y+2);
      ctx.closePath(); ctx.fillStyle=shade(ROSE,.62); ctx.fill();
      ctx.beginPath(); ctx.moveTo(l.x,l.y+1);
      ctx.quadraticCurveTo(m.x,m.y+1,r.x,r.y+1);
      ctx.strokeStyle=trim; ctx.lineWidth=3; ctx.stroke();
    }

    /* ---- the entrance ----
       WW*0.76 = 144.4 against a clamp limit of uw-hw-5 = 151.88, so the
       number written is the number drawn. Surround 107.3..181.5 leaves
       11.3 of pier from the window and 8.5 at the return. */
    shopDoor(WW*0.76, wall, trim, 'rgba(150,150,175,.55)', WW);

    /* ---- the fascia ----
       Both halves of the old fTodo. The board ran 6..WW-6 at b -1..-9
       and landed screen-a 7..193 on a 190 frontage, three past the far
       return -- margin 6 against a recess of 9. Margin 14 puts it on
       15..184. And the lettering sat at -9.5 against a back face of -9,
       inside the thing it is painted on; proud at -0.5 now and set out
       in both screen axes, since changing its depth moves it in x and
       in apparent z together. Board screen 15..184 centred on 99.5 and
       appz 132.3..168.7 centred on 150.5; the panel lands screen
       37.5..161.5 on 99.5 and appz 143.2..158.2 on 150.7. */
    slab(14,WW-14, 132, 166, -1, -8, shade(wall,1.2), null, trim);
    F(37,161, 143, 158, trim, null,0,-0.5);

    /* ---- the hat on a bracket, which is the sign ----
       This is the piece that has to work from across the street, so it
       is built as a real top hat rather than a board with a hat drawn
       on it: disc brim, cylinder crown, banded.

       Placed on the 4r rule. At b 26 the brim of r 12 spans 48 on
       screen centred on a - 26, so a = 160 puts it at 110..158 --
       hanging over the doorway at 107.3..181.5, where a shop sign
       belongs, and 32 clear of the far return.

       AND IT IS DRAWN AFTER THE FASCIA, which it was not on the first
       pass. The arm sits at z 152, inside the fascia band at 132..166,
       so a board drawn later painted straight over it and the hat hung
       from nothing. The arm is at b 2..26 and the board at -1..-8, so
       the arm is genuinely in front; only call order was wrong. Same
       class as the Photo studio's sawteeth, and the second time today
       that a correct depth lost to a wrong order. */
    tube(160, 2, 152, 160, 26, 152, 2, shade(wall,1.5));      // arm, out over the pavement
    tube(160, 26, 152, 160, 26, 146, 1.2, shade(wall,1.5));   // drop
    cyl(160, 26, 124, 146, 8, '#2e2a33');                     // crown
    plateCircle(160, 26, 146, 8, shade('#2e2a33',1.35));
    plateCircle(160, 26, 124, 12, '#2e2a33', shade('#2e2a33',1.4), 2);   // brim
    F(152, 168, 126, 132, ROSE, null,0, 38.2);                // band, proud of the crown


    if(state.roof) box(WW*0.26,WW*0.52,-140,-100,H,H+20,'#8f969d','#787f86','#697077');
    kerb(p,'none');
  }
},
{
  name:'Bathhouse', tall:true,
  fTodo:'z96..106 return +6, lettering behind board',
  zTodo:1.04,          // H 174 -- see SCALE REVIEW at the head of this file
  head:'Onion dome, steam vents, tiled arch',
  tags:['onion dome on a drum','tiled arch entry','steam plumes','mosaic band','high windows'],
  desc:'The dome sits on a low round drum with a moulded base ring, the arch is swept to a real reveal, and the steam pipes are cylinders with collars.',
  draw(p){
    const wall = '#dfe4e2', trim = '#2a7a8c', H = 174, WW = 210;
    body(wall, trim, H, WW);
    slab(0,WW, H, H+10, -1, -12, trim);
    slab(0,WW, 96, 106, -1, -6, trim);
    for(let i=0;i<9;i++) F(6+i*((WW-12)/9), 6+(i+0.62)*((WW-12)/9), 98, 104, shade(trim,1.5), null,0,-6.5);
    const ax0 = WW*0.34, ax1 = WW*0.66;
    /* the portal is already 67 wide, within a unit of SHOP_DOOR_W, so
       the arch keeps its shape -- only the heights move. The opening
       was 84 (126 after the lab factor); it is 108 now, which lands on
       the real 161.92. Both arcs rise by the same amount so the curve
       is unchanged. */
    F(ax0-8,ax1+8, 0, 112, trim, null,0,-1);
    const ap = (t,bb) => {
      const u=1-t, a = u*u*(ax0-8) + 2*u*t*((ax0+ax1)/2) + t*t*(ax1+8);
      const z = u*u*112 + 2*u*t*182 + t*t*112;
      return P(a,bb,z);
    };
    ctx.beginPath(); let q=ap(0,-1); ctx.moveTo(q.x,q.y);
    for(let k=1;k<=12;k++){ q=ap(k/12,-1); ctx.lineTo(q.x,q.y); }
    ctx.closePath(); ctx.fillStyle=trim; ctx.fill();
    for(let k=0;k<12;k++) poly([ap(k/12,-1),ap((k+1)/12,-1),ap((k+1)/12,-10),ap(k/12,-10)], shade(trim,1.25));
    F(ax0,ax1, 0, 108, shade(wall,.5), null,0,-9);
    const ip = (t,bb) => {
      const u=1-t, a = u*u*ax0 + 2*u*t*((ax0+ax1)/2) + t*t*ax1;
      const z = u*u*108 + 2*u*t*166 + t*t*108;
      return P(a,bb,z);
    };
    ctx.beginPath(); q=ip(0,-9); ctx.moveTo(q.x,q.y);
    for(let k=1;k<=12;k++){ q=ip(k/12,-9); ctx.lineTo(q.x,q.y); }
    ctx.closePath(); ctx.fillStyle=shade(wall,.5); ctx.fill();
    F(ax0+6,ax1-6, 4, 78, '#7fa8b4', null,0,-9.5);
    for(let i=0;i<2;i++){
      const x0 = i? WW*0.74 : WW*0.06, x1 = i? WW*0.94 : WW*0.26;
      slab(x0-3,x1+3, 112, 156, -1, -8, trim);
      F(x0,x1, 116, 152, '#7fa8b4', null,0,-8.5);
      F((x0+x1)/2-1.5,(x0+x1)/2+1.5, 116,152, trim, null,0,-9);
    }
    if(state.roof){
      const da = WW*0.50, db = -96;
      cyl(da, db, H+10, H+30, 38, shade(wall,1.02));               // drum
      plateCircle(da, db, H+30, 40, shade(trim,.8), shade(trim,.6), 2);
      const c = P(da,db,H+30);
      ctx.beginPath();
      ctx.moveTo(c.x-36*K, c.y);
      ctx.bezierCurveTo(c.x-46*K, c.y-42*K, c.x-16*K, c.y-52*K, c.x, c.y-78*K);
      ctx.bezierCurveTo(c.x+16*K, c.y-52*K, c.x+46*K, c.y-42*K, c.x+36*K, c.y);
      ctx.closePath(); ctx.fillStyle=trim; ctx.fill();
      ctx.strokeStyle=shade(trim,.7); ctx.lineWidth=2; ctx.stroke();
      cyl(da, db, H+96, H+118, 2.4, '#c9a24a');
      ball(da, db, H+124, 5, '#c9a24a');
      for(const aa of [WW*0.10, WW*0.90]){
        cyl(aa, -18, H+10, H+40, 6, '#9aa0a6');
        cyl(aa, -18, H+40, H+46, 8, '#aeb4b8');
        for(let k=0;k<3;k++)
          ball(aa + (k%2?7:-5), -18, H+56+k*15, 9+k*4, 'rgba(232,238,240,.55)', 'rgba(244,248,250,.5)');
      }
    }
    kerb(p,'none');
  }
},
{
  name:'Locksmith', head:'Giant key sign, barred glass, narrow',
  fTodo:'z116..150 return +3, lettering behind board',
  tags:['oversized key','round bars','narrow unit','bracket arm','worn palette'],
  desc:'The key bow is a circle lying in the plane of its bracket, the shaft is a tube and the wards are solid blocks off the end, so the whole thing hangs in the world instead of facing the camera.',
  draw(p){
    const wall = '#6b6257', trim = '#c9a24a', H = 166, WW = 168;
    body(wall, trim, H, WW);
    slab(0,WW, H, H+8, -1, -12, shade(wall,.72));
    slab(6,WW-6, 116, 150, -1, -9, shade(wall,1.2), null, trim);
    F(18,WW-18, 124, 140, trim, null,0,-9.5);
    F(10,WW*0.56, 24, 100, '#7f8a94', shade(wall,1.4), 3);
    for(let i=0;i<5;i++)
      tube(12+i*((WW*0.54-12)/5), -4, 24, 12+i*((WW*0.54-12)/5), -4, 100, 1.5, shade(wall,1.15));
    shopDoor(WW*0.78, wall, trim, null, WW);
    F(WW*0.66,WW-14, 52, 92, '#7f8a94', null,0,-6.5);
    slab(10,WW*0.56, 12, 24, -1, -7, shade(wall,.66));
    // the key, hung on an arm and lying in that arm's plane
    const ka = WW*0.30, kb = -22;
    tube(ka, -2, 156, ka, kb, 156, 2, '#4a4f55');
    tube(ka, kb, 156, ka, kb, 142, 1.6, '#4a4f55');
    faceCircle(ka, kb, 122, 26, trim, shade(trim,.68), 3);
    faceCircle(ka, kb-0.4, 122, 12, shade(wall,.85));
    tube(ka, kb, 110, ka, kb, 46, 5.5, trim);
    for(let i=0;i<3;i++)
      slab(ka+3, ka + (i===1 ? 14 : 22), 50+i*13, 56+i*13, kb+3, kb-3, trim, shade(trim,.72), shade(trim,1.2));
    if(state.roof){
      box(WW*0.30,WW*0.54,-140,-100,H,H+20,'#8f969d','#787f86','#697077');
      cyl(WW*0.72, -60, H+8, H+44, 2.5, '#6d747c');
    }
    kerb(p,'none');
  }
},
{
  name:'Furniture showroom', tall:true,
  cTodo:'4 pavement props need collision volumes',
  fTodo:'z188..208 return +4, lettering behind board',
  zTodo:1.27,          // H 214 -- see SCALE REVIEW at the head of this file
  head:'Double-height glass, loading hoist, mezzanine',
  tags:['double-height glazing','sofa in the round','loft hoist','wide unit','open mezzanine'],
  desc:'The sofa is a set of boxes with seat, back and arms rather than stacked rectangles, the standard lamp has a real conical shade, and the hoist beam is a solid with a brace and a plumb hook.',
  draw(p){
    const wall = '#a89a86', trim = '#4a3f36', H = 214;
    body(wall, trim, H);
    slab(0,W, H, H+10, -1, -12, trim);
    F(12,W*0.74, 18, H-30, '#7f93a0', shade(wall,.62), 4);
    for(let k=1;k<4;k++) F(12+(W*0.74-12)*k/4-2, 12+(W*0.74-12)*k/4+2, 18, H-30, shade(wall,.75), null,0,-1);
    slab(12,W*0.74, 104, 112, -1, 20, shade(wall,.68));
    // sofa, in the round
    box(34,116, 6, 40, 22, 50, '#9a6a7a','#8a5a6a','#7a4a5a');
    box(30,120, 6, 16, 22, 68, '#8a5a6a','#7a4a5a','#6e4050');
    box(30,42, 6, 40, 22, 60, '#7a4a5a','#8a5a6a','#6e4050');
    box(108,120, 6, 40, 22, 60, '#7a4a5a','#8a5a6a','#6e4050');
    box(40,74, 6, 30, 118, 176, '#7a6248','#8a7258','#6a5440');       // wardrobe on the mezzanine
    F(56,58, 122, 172, shade(wall,1.2), null,0, 5.5);
    cyl(98, 18, 118, 156, 2.4, '#c9ccd0');                            // standard lamp
    const lc0 = P(98,18,156), lc1 = P(98,18,174);
    ctx.beginPath();
    ctx.moveTo(lc0.x-14*K, lc0.y); ctx.lineTo(lc0.x+14*K, lc0.y);
    ctx.lineTo(lc1.x+9*K, lc1.y); ctx.lineTo(lc1.x-9*K, lc1.y);
    ctx.closePath(); ctx.fillStyle='#e8d9bd'; ctx.fill();
    ctx.strokeStyle=shade('#e8d9bd',.8); ctx.lineWidth=1.5; ctx.stroke();
    shopDoor(W*0.87, wall, trim);
    F(W*0.82,W-14, 54, 98, '#7f93a0', null,0,-6.5);
    slab(6,W-6, H-26, H-6, -1, -10, trim);
    F(20,W-20, H-22, H-10, shade(wall,1.16), null,0,-10.5);
    if(state.roof){
      const ha = W*0.33;
      slab(ha-8, ha+8, H+10, H+34, -2, -14, trim);
      poly([P(ha-8,-2,H+34),P(ha+8,-2,H+34),P(ha+8,64,H+26),P(ha-8,64,H+26)], shade(trim,1.5));
      poly([P(ha+8,-2,H+34),P(ha+8,64,H+26),P(ha+8,64,H+16),P(ha+8,-2,H+24)], shade(trim,1.1));
      poly([P(ha-8,-2,H+34),P(ha-8,64,H+26),P(ha-8,64,H+16),P(ha-8,-2,H+24)], shade(trim,.8));
      tube(ha, 26, H+22, ha, -2, H+2, 2.4, shade(trim,1.2));
      tube(ha, 60, H+20, ha, 60, H-24, 1.4, '#6d747c');
      const hk = P(ha,60,H-30);
      ctx.strokeStyle='#6d747c'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.arc(hk.x,hk.y,6*K,0.5,5.0); ctx.stroke();
      box(W*0.58,W*0.88,-160,-116,H,H+24,'#8f969d','#787f86','#697077');
    }
    kerb(p,'none');
  }
},
{
  name:'Nursery', head:'Glasshouse lean-to, palms over the parapet',
  cTodo:'21 pavement props need collision volumes, 82 of them lapping past the frontage',
  tags:['glazed lean-to','ridge and end walls','plants over the roofline','low fence','soil bins'],
  desc:'The glasshouse now has glazed end walls and a ridge capping where it meets the shop, so it encloses a space instead of being a sheet of blue leaning on the wall. Plants are stems with real foliage balls.',
  draw(p){
    const wall = '#b7ae98', trim = '#3f6b4a', H = 146, gb = 76, gz = 132;
    body(wall, trim, H);
    slab(0,W, H, H+8, -1, -12, trim);
    shopDoor(W*0.84, wall, trim);
    F(W*0.76,W-14, 48, 86, '#8fb8a0', null,0,-6.5);
    F(10,W*0.66, 30, 96, shade(wall,.7), null,0,-1);
    // glazed end walls, then the sloping roof over them
    poly([P(6,0,gz),P(6,gb,54),P(6,gb,0),P(6,0,0)], 'rgba(180,214,204,.42)', shade(trim,1.2), 2);
    poly([P(W*0.70,0,gz),P(W*0.70,gb,54),P(W*0.70,gb,0),P(W*0.70,0,0)], 'rgba(180,214,204,.42)', shade(trim,1.2), 2);
    poly([P(6,gb,54),P(W*0.70,gb,54),P(W*0.70,gb,0),P(6,gb,0)], 'rgba(180,214,204,.30)', shade(trim,1.1), 2);
    poly([P(6,0,gz),P(W*0.70,0,gz),P(W*0.70,gb,54),P(6,gb,54)], 'rgba(180,214,204,.55)', shade(trim,1.2), 2);
    for(let k=1;k<6;k++){
      const t=k/6, x=6+(W*0.70-6)*t;
      poly([P(x-2,0,gz),P(x+2,0,gz),P(x+2,gb,54),P(x-2,gb,54)], shade(trim,1.05));
    }
    for(const aa of [8, W*0.68]) cyl(aa, gb-4, 0, 54, 4, shade(trim,1.1));
    poly([P(6,gb,54),P(W*0.70,gb,54),P(W*0.70,gb,44),P(6,gb,44)], shade(trim,.85));
    slab(6,W*0.70, gz, gz+10, -1, -8, trim);                          // ridge capping at the wall
    if(state.props){
      for(let i=0;i<4;i++){
        const pa = 22+i*40, pb = 40, ph = [92,150,110,168][i];
        cyl(pa, pb, 0, 18, 11, '#8a7a5a');
        plateCircle(pa, pb, 18, 9, '#5a4a30');
        cyl(pa, pb, 18, ph, 3, '#6b5a3a');
        for(let k=0;k<5;k++){
          const a = k*1.26 + 0.3;
          ball(pa + 13*Math.cos(a), pb + 13*Math.sin(a), ph - 4, 11, ['#3f6b4a','#4e8058','#356045'][k%3]);
        }
        ball(pa, pb, ph + 4, 12, '#4e8058');
      }
      for(let i=0;i<3;i++){
        cyl(W+19+i*26, 34, 0, 22, 11, '#8a7a5a');
        plateCircle(W+19+i*26, 34, 22, 9, '#5a4a30');
        ball(W+19+i*26, 34, 30, 9, ['#4e8058','#c26a7e','#e8c34a'][i]);
      }
      tube(-10, 96, 26, W*0.72, 96, 26, 2, shade(trim,1.1));
      for(let i=0;i<8;i++) cyl(-10+(W*0.72+10)*i/8, 96, 0, 30, 2, shade(trim,1.1));
    }
    if(state.roof) box(W*0.74,W*0.94,-140,-104,H,H+18,'#9aa0a6','#7d838a','#6a7076');
    kerb(p,'none');
  }
},
{
  name:'TV repair', head:'Aerial forest, dish, wall of screens',
  fTodo:'z116..146 return +3, lettering behind board',
  tags:['aerial forest','dish on a mount','stacked screens','test-card glow','cluttered roof'],
  desc:'Every aerial is a tube with real crossbars and each mast has a base plate on the roof; the dish sits on a bracket with an arm to the feed horn instead of floating as an oval.',
  draw(p){
    const wall = '#7a7f86', trim = '#2b2f33', H = 158;
    body(wall, trim, H);
    slab(0,W, H, H+10, -1, -12, trim);
    slab(6,W-6, 116, 146, -1, -9, shade(wall,.72));
    F(18,W-18, 124, 138, '#e8c34a', null,0,-9.5);
    F(10,W*0.70, 22, 106, '#1e2226', shade(wall,.6), 3);
    for(let r=0;r<2;r++) for(let c=0;c<4;c++){
      const x0 = 16+(W*0.66-16)*(c+0.08)/4, x1 = 16+(W*0.66-16)*(c+0.92)/4, z0 = 30+r*38;
      slab(x0,x1, z0, z0+30, -1, 14, '#3a4046', '#2e3338', '#454b52');
      F(x0+3,x1-3, z0+4, z0+26, ['#4aa3c4','#c4a34a','#4ac47a','#c44a6a'][(r*4+c)%4], null,0,-1.5);
      for(let k=0;k<4;k++) F(x0+3+(x1-x0-6)*k/4, x0+3+(x1-x0-6)*(k+0.5)/4, z0+4, z0+26,
        'rgba(255,255,255,.22)', null,0,-2);
    }
    shopDoor(W*0.86, wall, trim);
    F(W*0.78,W-14, 50, 90, '#4a5056', null,0,-6.5);
    if(state.roof){
      const masts = [[W*0.14,-40,120],[W*0.30,-96,88],[W*0.46,-30,140],[W*0.62,-120,96],[W*0.80,-60,110]];
      for(const [ma,mb,mh] of masts){
        box(ma-9, ma+9, mb-9, mb+9, H+10, H+16, '#9aa0a6','#8d949a','#7d848a');   // base plate
        cyl(ma, mb, H+16, H+16+mh, 2, '#c3c8cc');
        const n = 3 + (mh>110?2:0);
        for(let k=0;k<n;k++){
          const z = H+16+mh - 14 - k*15, half = 20 - k*2;
          tube(ma-half, mb, z, ma+half, mb, z, 1.1, '#c3c8cc');
          tube(ma, mb, z, ma, mb, z+6, 0.9, '#c3c8cc');
        }
      }
      const da = W*0.68, db = -20;
      box(da-6, da+6, db-6, db+6, H+10, H+16, '#8d979f','#82888e','#767c82');
      cyl(da, db, H+16, H+50, 3, '#8f969d');
      faceT(da, db, H+66, 24);
      ctx.beginPath(); ctx.arc(0,0,1,0,Math.PI*2);
      ctx.fillStyle='#d8dbde'; ctx.fill();
      ctx.strokeStyle='#a8adb2'; ctx.lineWidth=2.5/(24*K); ctx.stroke();
      ctx.restore();
      tube(da, db, H+66, da, db+22, H+58, 1.4, '#8f969d');
      ball(da, db+22, H+56, 4, '#6a7076');
      box(W*0.86,W*0.98,-150,-120,H,H+18,'#8f969d','#787f86','#697077');
    }
    kerb(p,'none');
  }
},
{
  name:'Playhouse', tall:true,
  cTodo:'2 pavement props need collision volumes, 38 of them lapping past the frontage',
  zTodo:1.05,          // H 176 -- see SCALE REVIEW at the head of this file
  head:'Fly tower behind, poster columns, lamp canopy',
  tags:['solid fly tower','round poster columns','lamp canopy','stage door','mass behind the front'],
  desc:'The fly tower is a closed box with a returned side and a capped top, and the poster columns are cylinders with domed caps standing on the pavement.',
  draw(p){
    const wall = '#6b3348', trim = '#e8c9a0', H = 176;
    body(wall, trim, H);
    // fly tower, set back, built as a solid
    F(W*0.16,W*0.84, H, H+96, shade(wall,.82), shade(wall,.62), 2, -150);
    S(W*0.84, -230, -150, H, H+96, shade(wall,.66));
    T(W*0.16,W*0.84, -230, -150, H+96, shade(wall,.9));
    slab(W*0.14,W*0.86, H+96, H+106, -148, -232, shade(wall,.72));
    F(W*0.30,W*0.70, H+54, H+78, shade(wall,.7), null,0, -151);
    slab(0,W, H, H+10, -1, -12, trim);
    slab(6,W-6, 124, H-8, -1, -9, shade(wall,1.2), null, trim);
    F(20,W-20, 134, 156, trim, null,0,-9.5);
    const out = 44;
    poly([P(2,0,116),P(W-2,0,116),P(W-2,out,100),P(2,out,100)], trim);
    poly([P(2,out,100),P(W-2,out,100),P(W-2,out,88),P(2,out,88)], shade(trim,.72));
    poly([P(2,0,104),P(W-2,0,104),P(W-2,out,88),P(2,out,88)], shade(wall,1.15));
    poly([P(2,0,116),P(2,out,100),P(2,out,88),P(2,0,104)], shade(trim,.6));
    poly([P(W-2,0,116),P(W-2,out,100),P(W-2,out,88),P(W-2,0,104)], shade(trim,.6));
    for(let i=0;i<6;i++) ball(14+(W-28)*(i+0.5)/6, out-4, 95, 5, '#fff0c0');
    /* three leaves at 52.7 wide across a 194 bay. Three real doors need
       198.7 and do not fit, so the theatre entrance becomes a pair --
       still reads as a bank of doors, and both are the game's size. */
    shopDoor(W*0.34, wall, trim, 'rgba(232,201,160,.5)');
    shopDoor(W*0.66, wall, trim, 'rgba(232,201,160,.5)');
    for(let i=0;i<2;i++)
      slab(W*0.06+i*W*0.80, W*0.06+i*W*0.80+W*0.10, 96, 116, -1, -8, ['#c2452e','#2a5c6c'][i], null, trim);
    if(state.props){
      for(const [ca,cb] of [[W*0.02,54],[W+22,34]]){
        cyl(ca, cb, 0, 96, 16, '#3f4a52');
        for(let i=0;i<3;i++){
          const t = 2.0 - i*0.9;
          poly([P(ca+16*Math.cos(t), cb+16*Math.sin(t), 14),
                P(ca+16*Math.cos(t-0.55), cb+16*Math.sin(t-0.55), 14),
                P(ca+16*Math.cos(t-0.55), cb+16*Math.sin(t-0.55), 82),
                P(ca+16*Math.cos(t), cb+16*Math.sin(t), 82)],
               ['#e8c9a0','#c2452e','#e8c34a'][i]);
        }
        plateCircle(ca, cb, 96, 18, trim, shade(trim,.7), 2);
        ball(ca, cb, 100, 8, trim);
      }
    }
    if(state.roof) box(W*0.20,W*0.44,-120,-84,H,H+20,'#8f969d','#787f86','#697077');
    kerb(p,'none');
  }
},
{
  name:'Fire station', tall:true,
  zTodo:1.06,          // H 178 -- see SCALE REVIEW at the head of this file
  fTodo:'z136..168 return +3, lettering behind board',
  head:'Drill tower, twin appliance doors, bell',
  tags:['hose drill tower','two tall bay doors','turned bell','red and cream','apron'],
  desc:'The bell is turned from a cylinder and a dome with a headstock and clapper, hanging in its bracket, and the drill tower is capped so it closes off against the sky.',
  draw(p){
    const wall = '#a8291f', trim = '#e8ddc8', H = 178;
    body(wall, trim, H);
    slab(0,W, H, H+12, -1, -14, trim);
    slab(6,W-6, 136, H-10, -1, -9, shade(wall,1.2), null, trim);
    F(20,W-20, 144, 164, trim, null,0,-9.5);
    /* same fault as the Garage: two appliance bays ran the full 14..W-14
       and there was no pedestrian door. Bays share the left, the crew
       door takes the gap before the hose tower. */
    const bayR = W*0.62;
    for(let i=0;i<2;i++){
      const x0 = 14+i*(bayR-28)/2+(i?8:0), x1 = 14+(i+1)*(bayR-28)/2-(i?0:8);
      F(x0-5,x1+5, 0, 128, shade(wall,.74), null,0, 1);
      F(x0,x1, 0, 120, '#c9b48e', shade(wall,1.3), 2, -1);
      for(let j=0;j<5;j++) F(x0+3, x1-3, 8+j*23, 26+j*23, '#d8c9a4', shade(wall,.85), 1.5, -2);
      slab(x0-5,x1+5, 120, 128, -2, -9, trim);
    }
    shopDoor(W*0.78, wall, trim);
    const t0 = W-8, t1 = W+62;
    F(t0,t1, 0, H+120, shade(wall,1.08), shade(wall,.7), 2, -6);
    S(t1, -76, -6, 0, H+120, shade(wall,.78));
    T(t0,t1, -76, -6, H+120, shade(wall,.86));
    for(let r=0;r<4;r++) slab(t0+14, t1-14, 40+r*54, 78+r*54, -7, -14, '#3a4046', null, trim);
    slab(t0-4,t1+4, H+120, H+132, -4, -78, trim);
    if(state.props){
      // bell: headstock, dome crown, cylindrical waist, clapper
      const ba = W*0.09, bb = -20;
      tube(ba, -2, 138, ba, bb, 138, 1.6, '#4a4f55');
      slab(ba-14, ba+14, 130, 136, bb+4, bb-4, '#4a4f55');
      cyl(ba, bb, 104, 122, 13, '#c9a24a');
      ball(ba, bb, 122, 13, '#c9a24a', '#d8b45e');
      plateCircle(ba, bb, 104, 15, '#a8842e', '#8f6f26', 2);
      ball(ba, bb, 98, 4, '#8f6f26');
    }
    if(state.roof) box(W*0.30,W*0.56,-150,-110,H,H+22,'#8f969d','#787f86','#697077');
    kerb(p,'none');
  }
},
{
  name:'Optician', head:'Giant spectacles across the fascia',
  fTodo:'z118..126 return +7',
  tags:['oversized spectacles','eye chart','clean white','frame display','deep reveal'],
  desc:'The spectacle rims are circles lying in the fascia plane, joined by a tube bridge with the temples folding back into the wall, so the whole sign shears with the building.',
  draw(p){
    const wall = '#f2f2ee', trim = '#2b4a6b', H = 166;
    body(wall, trim, H);
    slab(0,W, H, H+8, -1, -12, trim);
    slab(0,W, 118, 126, -1, -7, trim);
    F(12,W*0.66, 24, 108, '#8fb4c8', shade(wall,.6), 3);
    for(let r=0;r<2;r++) for(let c=0;c<4;c++){
      const cx = 26+c*32, cz = 44+r*32;
      faceCircle(cx-9, -3, cz, 6, null, ['#2b4a6b','#8f2b2b','#c9a24a','#3f6b4a'][(r+c)%4], 2.5);
      faceCircle(cx+9, -3, cz, 6, null, ['#2b4a6b','#8f2b2b','#c9a24a','#3f6b4a'][(r+c)%4], 2.5);
      tube(cx-3, -3, cz, cx+3, -3, cz, 1, ['#2b4a6b','#8f2b2b','#c9a24a','#3f6b4a'][(r+c)%4]);
    }
    slab(W*0.50,W*0.63, 40, 100, -2, -8, '#ffffff', shade(wall,.7));
    for(let i=0;i<5;i++) F(W*0.515, W*0.515+(W*0.10)*(1-i*0.17), 88-i*11, 92-i*11, '#3a3f4a', null,0,-2.5);
    shopDoor(W*0.85, wall, trim);
    F(W*0.76,W-14, 54, 94, '#8fb4c8', null,0,-6.5);
    // spectacles, in the plane of the fascia
    const gz = 146, gb = -10;
    for(const ga of [W*0.24, W*0.76]){
      faceCircle(ga, gb, gz, 30, null, trim, 7);
      faceCircle(ga, gb+0.4, gz, 27, 'rgba(143,180,200,.55)');
    }
    tube(W*0.24+30, gb, gz, W*0.76-30, gb, gz, 3, trim);
    tube(W*0.24-30, gb, gz, W*0.24-46, -2, gz+6, 2.6, trim);
    tube(W*0.76+30, gb, gz, W*0.76+46, -2, gz+6, 2.6, trim);
    if(state.roof) box(W*0.30,W*0.54,-140,-100,H,H+20,'#9aa0a6','#7d838a','#6a7076');
    kerb(p,'none');
  }
},
{
  name:'Public house', tall:true,
  fTodo:'z122..152 return +3, lettering behind board',
  zTodo:1.08,          // H 182 -- see SCALE REVIEW at the head of this file
  head:'Bow windows, twin chimneys, bracket sign',
  tags:['true bowed bays','chimney pots','hanging bracket sign','window boxes','tiled base'],
  desc:'The bows are built from surface quads swept round a real arc, with a curved head and cill following the same sweep, so they bulge instead of stepping. Chimneys get clay pots.',
  draw(p){
    const wall = '#3f4a35', trim = '#d8c48a', H = 182;
    body(wall, trim, H);
    slab(0,W, H, H+10, -1, -12, shade(wall,.66));
    slab(0,W, 0, 30, -1, -6, '#4a3326');
    slab(6,W-6, 122, 152, -1, -9, shade(wall,1.25), null, trim);
    F(18,W-18, 130, 146, trim, null,0,-9.5);
    for(let i=0;i<3;i++){
      const x0 = 16+(W-32)*(i+0.14)/3, x1 = 16+(W-32)*(i+0.86)/3;
      slab(x0-3,x1+3, 156, H-6, -1, -8, trim);
      F(x0,x1, 160, H-10, '#7f93a0', null,0,-8.5);
      if(state.props){
        box(x0-4,x1+4, -14, -2, 150, 162, shade(wall,1.1), shade(wall,.85), shade(wall,.7));
        for(let k=0;k<3;k++) ball(x0+(x1-x0)*(k+0.5)/3, -9, 166, 6, ['#c2452e','#c9a24a','#8a4a6a'][i]);
      }
    }
    // bowed bays swept on an arc
    for(let i=0;i<2;i++){
      const bx = i ? W*0.56 : W*0.08, bw = W*0.34, cxm = bx + bw/2, rr = bw*0.62;
      const pt = (t,z) => {
        const a = Math.PI*0.30 + (Math.PI*0.40)*t;
        return P(cxm - rr*Math.cos(a), -rr*Math.sin(a)*0.62 + rr*0.30, z);
      };
      for(let k=0;k<8;k++){
        const t0=k/8, t1=(k+1)/8;
        poly([pt(t0,30),pt(t1,30),pt(t1,112),pt(t0,112)],
             shade('#7f93a0', 1 - Math.abs(0.5-(t0+t1)/2)*0.30));
        poly([pt(t0,112),pt(t1,112),pt(t1,122),pt(t0,122)], shade(wall,1.15));
        poly([pt(t0,22),pt(t1,22),pt(t1,30),pt(t0,30)], shade(wall,.8));
      }
      for(let k=1;k<4;k++) poly([pt(k/4-0.012,30),pt(k/4+0.012,30),pt(k/4+0.012,112),pt(k/4-0.012,112)], shade(wall,.72));
    }
    shopDoor(W*0.50, wall, '#5a3f2a');
    F(W*0.46,W*0.54, 56, 92, '#8fa0aa', null,0,-6.5);
    if(state.props){
      tube(W*0.03, -2, 132, W*0.03, -28, 132, 2, '#2b2f33');
      tube(W*0.03, -28, 132, W*0.03, -28, 124, 1.4, '#2b2f33');
      slab(W*0.0, W*0.14, 88, 122, -30, -24, trim, '#2b2f33', shade(trim,1.15));
      F(W*0.02,W*0.12, 94, 116, shade(wall,1.1), null,0,-30.5);
    }
    if(state.roof){
      for(const ca of [W*0.22, W*0.70]){
        box(ca-20, ca+20, -120, -80, H, H+52, '#8a5040','#a05c48','#7a4636');
        slab(ca-24, ca+24, H+52, H+60, -76, -124, '#b06a52');
        for(let k=0;k<2;k++) cyl(ca-8+k*16, -100, H+60, H+74, 6, '#5a4038');
      }
    }
    kerb(p,'none');
  }
},
{
  name:'Tea house', head:'Pitched tiled roof, upturned eaves, veranda',
  cTodo:'4 pavement props need collision volumes, 1 of them lapping past the frontage',
  tags:['pitched roof','ridge capping','round veranda posts','paper lanterns','timber screen'],
  desc:'The roof gets a ridge capping and a visible gable end, the veranda posts are turned cylinders under the beam, and the lanterns are cylinders with capped ends hanging on cords.',
  draw(p){
    const wall = '#e4dccb', trim = '#5a3a2e', H = 132, WW = 214;
    body(wall, trim, H, WW);
    const ridge = H + 74, eaveB = 44, backB = -D;
    poly([P(-22,eaveB,H+10),P(WW+22,eaveB,H+10),P(WW+22,-D*0.5,ridge),P(-22,-D*0.5,ridge)],
         '#7a4a3a', shade('#7a4a3a',.72), 2);
    poly([P(-22,-D*0.5,ridge),P(WW+22,-D*0.5,ridge),P(WW+22,backB-16,H+10),P(-22,backB-16,H+10)],
         shade('#7a4a3a',.82));
    for(let i=0;i<9;i++){
      const t=(i+1)/10, z = H+10 + (ridge-H-10)*t, bb = eaveB + (-D*0.5-eaveB)*t;
      poly([P(-22,bb,z),P(WW+22,bb,z),P(WW+22,bb,z-3),P(-22,bb,z-3)], shade('#7a4a3a',.9));
    }
    slab(-24, WW+24, ridge, ridge+9, -D*0.5+8, -D*0.5-8, '#5a3628', shade('#5a3628',.8), '#6a4232');
    // gable end so the roof closes rather than floating
    poly([P(WW+22,eaveB,H+10),P(WW+22,-D*0.5,ridge),P(WW+22,backB-16,H+10)], shade(wall,.72));
    slab(-22,WW+22, H+4, H+14, eaveB, eaveB-8, shade('#7a4a3a',.66));
    for(const [ea,dir] of [[-22,-1],[WW+22,1]]){
      const c0=P(ea,eaveB,H+10), c1=P(ea+dir*30,eaveB,H+30);
      ctx.beginPath(); ctx.moveTo(c0.x,c0.y);
      ctx.quadraticCurveTo(c0.x+dir*26*K, c0.y-6*K, c1.x, c1.y);
      ctx.lineTo(c1.x, c1.y+10*K);
      ctx.quadraticCurveTo(c0.x+dir*22*K, c0.y+8*K, c0.x, c0.y+10*K);
      ctx.closePath(); ctx.fillStyle='#7a4a3a'; ctx.fill();
    }
    slab(0,WW, H, H+6, -1, -8, trim);
    for(const aa of [4, WW*0.34, WW*0.66, WW-4]) cyl(aa, eaveB-6, 0, H+6, 5, trim);
    poly([P(0,eaveB-6,H+6),P(WW,eaveB-6,H+6),P(WW,eaveB-6,H-6),P(0,eaveB-6,H-6)], shade(trim,1.2));
    F(10,WW*0.62, 20, 104, '#c6b89c', shade(trim,1.1), 2);
    for(let i=0;i<7;i++) F(12+i*((WW*0.60-12)/7), 16+i*((WW*0.60-12)/7), 20, 104, trim, null,0,-1);
    for(let i=0;i<3;i++) F(10,WW*0.62, 32+i*24, 36+i*24, trim, null,0,-1);
    shopDoor(WW*0.82, wall, trim, null, WW);
    F(WW*0.72,WW-14, 50, 90, '#c6b89c', null,0,-6.5);
    if(state.props){
      for(let i=0;i<4;i++){
        const la = 24+i*46, lb = eaveB-10;
        tube(la, lb, H-6, la, lb, H-18, 0.8, '#5a3628');
        cyl(la, lb, H-42, H-18, 10, '#f0e2c8');
        plateCircle(la, lb, H-42, 7, '#c2452e');
        cyl(la, lb, H-46, H-42, 4, '#c2452e');
      }
    }
    kerb(p,'none');
  }
},
{
  name:'Antiques', head:'Cluttered forecourt, chandelier, mirror',
  cTodo:'12 pavement props need collision volumes, 33 of them lapping past the frontage',
  fTodo:'z118..150 return +3, lettering behind board',
  tags:['stacked chairs','hanging chandelier','framed mirror','painted sign','crowded'],
  desc:'The chairs are real chairs — seat, back and four legs — stacked on each other, the mirror stands in a framed slab leaning on the wall, and the chandelier hangs from tube arms with balls on the ends.',
  draw(p){
    const wall = '#5c4a5e', trim = '#d8c9a4', H = 164;
    body(wall, trim, H);
    slab(0,W, H, H+8, -1, -12, shade(wall,.7));
    slab(6,W-6, 118, 150, -1, -9, shade(wall,1.2));
    slab(W*0.14, W*0.86, 124, 146, -10, -16, trim, shade(wall,.7), shade(trim,1.1));
    F(W*0.20, W*0.80, 130, 134, shade(wall,.8), null,0,-16.5);
    F(W*0.24, W*0.72, 138, 142, shade(wall,.8), null,0,-16.5);
    F(10,W*0.64, 22, 108, '#3a2e3c', shade(wall,.6), 3);
    box(18,54, 2, 20, 30, 74, '#8a6a4a','#7a5a3a','#6a4a2e');
    box(60,92, 2, 20, 40, 96, '#9a7a5a','#8a6a4a','#75563a');
    box(98,126, 2, 20, 30, 66, '#7a5a6a','#6a4a5a','#5a3c4a');
    for(let i=0;i<4;i++) ball(24+i*30, -3, 88, 7, ['#c9a24a','#8fb4a0','#c2807e','#d8c9a4'][i]);
    shopDoor(W*0.84, wall, trim);
    if(state.props){
      // stacked chairs, each with legs, seat and back
      for(let i=0;i<3;i++){
        const ca = W+18, cb = 34, cz = i*30;
        for(const [la,lb] of [[ca-13,cb-13],[ca+13,cb-13],[ca-13,cb+13],[ca+13,cb+13]])
          cyl(la, lb, cz, cz+16, 2.2, '#7a5a3a');
        box(ca-15, ca+15, cb-15, cb+15, cz+16, cz+21, '#9a7a52','#8a6a4a','#75563a');
        box(ca-15, ca+15, cb+11, cb+15, cz+21, cz+40, '#8a6a4a','#9a7a52','#75563a');
      }
      // framed mirror leaning on the wall
      slab(W*0.02, W*0.24, 0, 88, 30, 24, trim, shade(wall,.6), shade(trim,1.15));
      F(W*0.045, W*0.215, 8, 80, '#c9ccd0', null,0, 30.5);
      F(W*0.06, W*0.13, 16, 72, '#a8b2b8', null,0, 30.8);
      // chandelier
      const ch = W*0.80, chb = 22;
      tube(ch, chb, 120, ch, chb, 100, 1.2, '#c9a24a');
      ball(ch, chb, 96, 6, '#c9a24a');
      for(let k=0;k<5;k++){
        const a = k*1.256;
        const ea = ch + 16*Math.cos(a), eb = chb + 16*Math.sin(a);
        tube(ch, chb, 96, ea, eb, 90, 1.1, '#c9a24a');
        ball(ea, eb, 86, 4.5, '#fff0c0');
      }
    }
    if(state.roof) box(W*0.34,W*0.58,-140,-100,H,H+20,'#8f969d','#787f86','#697077');
    kerb(p,'none');
  }
},
{
  name:'Bike shop', head:'Bikes on the wall, wheel sign, ramp',
  cTodo:'3 pavement props need collision volumes, 30 of them lapping past the frontage',
  tags:['bikes in the wall plane','spoked wheel sign','entry ramp','tool board','open roller'],
  desc:'The bike wheels are circles lying in the wall plane and the frames are tubes between real hubs, so a bike hung on the render leans with the building instead of facing the camera.',
  draw(p){
    const wall = '#2f5f6b', trim = '#e8a13a', H = 162;
    body(wall, trim, H);
    slab(0,W, H, H+10, -1, -12, trim);
    F(10,W*0.66, 24, 98, '#8fc0cc', shade(wall,.6), 3);
    for(let i=0;i<3;i++) F(16+i*((W*0.60)/3), 20+i*((W*0.60)/3), 24, 98, shade(wall,1.2), null,0,-1);
    shopDoor(W*0.84, wall, trim);
    F(W*0.76,W-14, 48, 86, '#8fc0cc', null,0,-6.5);
    // bikes lying in the wall plane
    for(let i=0;i<2;i++){
      const ba = W*0.22 + i*W*0.42, bz = 112, bb = -5, rimc = ['#e8a13a','#e8ddc8'][i], frc = ['#c2452e','#8fc0cc'][i];
      for(const dx of [-22, 22]){
        faceCircle(ba+dx, bb, bz, 15, null, rimc, 3);
        faceT(ba+dx, bb-0.4, bz, 15);
        ctx.strokeStyle=rimc; ctx.lineWidth=1/(15*K);
        for(let k=0;k<6;k++){ ctx.beginPath(); ctx.moveTo(0,0);
          ctx.lineTo(Math.cos(k*1.05), Math.sin(k*1.05)); ctx.stroke(); }
        ctx.restore();
      }
      tube(ba-22, bb, bz, ba+4, bb, bz+14, 1.8, frc);
      tube(ba+4, bb, bz+14, ba+18, bb, bz+14, 1.8, frc);
      tube(ba+18, bb, bz+14, ba+22, bb, bz, 1.8, frc);
      tube(ba-22, bb, bz, ba+22, bb, bz, 1.8, frc);
      tube(ba+4, bb, bz+14, ba+4, bb, bz+24, 1.4, '#3a4046');
      tube(ba+18, bb, bz+14, ba+18, bb, bz+22, 1.4, '#3a4046');
    }
    // spoked wheel as the sign
    const wa = W*0.50, wb = -6, wz = H-16;
    faceCircle(wa, wb, wz, 25, null, trim, 6);
    faceT(wa, wb-0.4, wz, 25);
    ctx.strokeStyle=trim; ctx.lineWidth=1.6/(25*K);
    for(let k=0;k<8;k++){ ctx.beginPath(); ctx.moveTo(0,0);
      ctx.lineTo(0.88*Math.cos(k*0.785), 0.88*Math.sin(k*0.785)); ctx.stroke(); }
    ctx.restore();
    faceCircle(wa, wb-1, wz, 5, trim);
    if(state.props){
      poly([P(W*0.70,0,4),P(W-8,0,4),P(W-8,46,0),P(W*0.70,46,0)], '#9aa0a6', '#7d838a', 2);
      poly([P(W*0.70,0,4),P(W-8,0,4),P(W-8,0,0),P(W*0.70,0,0)], '#7d838a');
      for(let i=0;i<3;i++) cyl(W+12+i*8, 40, 0, 26, 2, '#7d838a');
    }
    if(state.roof) box(W*0.28,W*0.52,-140,-100,H,H+20,'#8f969d','#787f86','#697077');
    kerb(p,'none');
  }
},
{
  name:'Clockmaker', tall:true,
  fTodo:'z108..116 return +2',
  zTodo:1.11,          // H 186 -- see SCALE REVIEW at the head of this file
  head:'Huge clock over the door, faces in the window',
  tags:['clock in the wall plane','swept pediment','clock faces','brass palette','narrow'],
  desc:'Both the big clock and the small faces lie in the wall plane with their hands drawn inside that same plane, and the pediment is swept to a thickness so it caps the parapet properly.',
  draw(p){
    const wall = '#3c4a52', trim = '#c9a24a', H = 186, WW = 196;
    body(wall, trim, H, WW);
    slab(0,WW, H, H+8, -1, -12, shade(wall,1.4));
    const pk = (t,bb) => P(WW*0.22 + WW*0.56*t, bb, H+8 + (1-Math.abs(t-0.5)*2)*50);
    for(let i=0;i<14;i++) poly([pk(i/14,-1),pk((i+1)/14,-1),pk((i+1)/14,-11),pk(i/14,-11)], shade(wall,1.35));
    ctx.beginPath();
    let q=P(WW*0.22,-1,H+8); ctx.moveTo(q.x,q.y);
    q=P(WW*0.50,-1,H+58); ctx.lineTo(q.x,q.y);
    q=P(WW*0.78,-1,H+8); ctx.lineTo(q.x,q.y);
    ctx.closePath(); ctx.fillStyle=shade(wall,1.2); ctx.fill();
    ctx.strokeStyle=trim; ctx.lineWidth=3; ctx.stroke();
    // the big clock, in the wall plane
    const ca = WW*0.50, cb = -12, cz = 142;
    faceCircle(ca, cb, cz, 42, trim, shade(trim,.72), 2);
    faceCircle(ca, cb-0.5, cz, 35, '#f2ece0');
    faceT(ca, cb-1, cz, 35);
    ctx.strokeStyle='#2b3138'; ctx.lineWidth=2/(35*K);
    for(let k=0;k<12;k++){
      const a=k*0.5236;
      ctx.beginPath(); ctx.moveTo(0.86*Math.cos(a), 0.86*Math.sin(a));
      ctx.lineTo(0.97*Math.cos(a), 0.97*Math.sin(a)); ctx.stroke();
    }
    ctx.lineWidth=4/(35*K); ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0.05,-0.62); ctx.stroke();
    ctx.lineWidth=3/(35*K); ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0.48,0.26); ctx.stroke();
    ctx.restore();
    F(10,WW*0.60, 22, 104, '#6e7c88', shade(wall,1.5), 3);
    for(let r=0;r<2;r++) for(let c=0;c<3;c++){
      const fa = 24+c*32, fz = 40+r*38;
      faceCircle(fa, -3, fz, 11, '#e8ddc8', trim, 2.5);
      faceT(fa, -3.5, fz, 11);
      ctx.strokeStyle='#2b3138'; ctx.lineWidth=1.6/(11*K);
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0.45,-0.55); ctx.stroke();
      ctx.restore();
    }
    shopDoor(WW*0.81, wall, trim, null, WW);
    F(WW*0.70,WW-14, 54, 94, '#6e7c88', null,0,-6.5);
    slab(6,WW-6, 108, 116, -1, -8, trim);
    if(state.roof) box(WW*0.24,WW*0.46,-150,-110,H,H+20,'#8f969d','#787f86','#697077');
    kerb(p,'none');
  }
},
{
  name:'Fabric shop', head:'Bolt racks outside, twin awnings, hanging rolls',
  fTodo:'z128..150 return +1, lettering behind board',
  tags:['rolled bolts','two-tier awnings','hanging rolls','pattern blocks','busy colour'],
  desc:'Both the hanging rolls and the bolts on the pavement are cylinders with visible ends, and each awning tier has an underside and returns so they stack as two real hoods.',
  draw(p){
    const wall = '#7a4a6b', trim = '#f0e2d0', H = 158;
    body(wall, trim, H);
    slab(0,W, H, H+10, -1, -12, trim);
    slab(8,W-8, 128, 150, -1, -9, shade(wall,1.25), null, trim);
    F(20,W-20, 134, 145, trim, null,0,-9.5);
    F(10,W*0.68, 24, 100, '#4a2e42', shade(wall,.6), 3);
    for(let r=0;r<3;r++) for(let c=0;c<5;c++)
      F(16+c*((W*0.62-16)/5), 16+(c+0.82)*((W*0.62-16)/5), 30+r*24, 48+r*24,
        ['#e8a13a','#4aa8c4','#c2452e','#7ac48a','#f0e2d0','#e2748c'][(r*5+c)%6], null,0,-1);
    shopDoor(W*0.86, wall, trim);
    F(W*0.78,W-14, 50, 88, '#8f7a8c', null,0,-6.5);
    for(let t=0;t<2;t++){
      const z1 = 124 - t*30, z0 = z1 - 16, out = 26 + t*12, base = ['#c2452e','#4aa8c4'][t];
      for(let i=0;i<7;i++){
        const x0=6+(W-12)*i/7, x1=6+(W-12)*(i+1)/7;
        poly([P(x0,0,z1),P(x1,0,z1),P(x1,out,z0),P(x0,out,z0)], i%2 ? trim : base);
      }
      poly([P(6,0,z1-8),P(W-6,0,z1-8),P(W-6,out,z0-8),P(6,out,z0-8)], shade(base,.6));
      poly([P(6,out,z0),P(W-6,out,z0),P(W-6,out,z0-8),P(6,out,z0-8)], shade(base,.8));
      poly([P(6,0,z1),P(6,out,z0),P(6,out,z0-8),P(6,0,z1-8)], shade(base,.55));
      poly([P(W-6,0,z1),P(W-6,out,z0),P(W-6,out,z0-8),P(W-6,0,z1-8)], shade(base,.55));
    }
    if(state.props){
      for(let i=0;i<4;i++){
        const ra = W*0.12 + i*W*0.20, col = ['#e8a13a','#4aa8c4','#e2748c','#7ac48a'][i];
        tube(ra, -30, 126, ra, -30, 122, 0.9, '#8d979f');
        cyl(ra, -30, 60, 122, 7, col);
        plateCircle(ra, -30, 60, 7, shade(col,.75));
      }
      for(let i=0;i<5;i++){
        const ba = W+12+i*15, col = ['#c2452e','#e8a13a','#4aa8c4','#7ac48a','#e2748c'][i];
        const lean = 12;
        tube(ba, 26, 0, ba - lean*0.2, 52, 74, 6, col);
        ball(ba - lean*0.2, 52, 74, 6, shade(col,1.15));
      }
    }
    if(state.roof) box(W*0.32,W*0.58,-140,-100,H,H+20,'#8f969d','#787f86','#697077');
    kerb(p,'none');
  }
},
{
  name:'Music shop', head:'Instruments on the wall, horn sign, piano',
  cTodo:'2 pavement props need collision volumes',
  tags:['guitars in the wall plane','turned horn','upright piano','deep green','sheet racks'],
  desc:'The guitar bodies are circles lying in the wall plane with tube necks, so they lean with the render, and the horn is a tube run into a conical bell rather than a painted swirl.',
  draw(p){
    const wall = '#2f4a3a', trim = '#c9a24a', H = 168;
    body(wall, trim, H);
    slab(0,W, H, H+10, -1, -12, trim);
    F(10,W*0.66, 22, 100, '#1e3228', shade(wall,.6), 3);
    box(20,86, 2, 22, 26, 78, '#5a3f2e','#4a3226','#3c281d');
    F(20,86, 60, 68, '#e8ddc8', null,0, 1.5);
    for(let i=0;i<10;i++) F(22+i*6.4, 24+i*6.4, 60, 68, '#2b2119', null,0, 1.2);
    box(96,W*0.62, 2, 20, 30, 92, '#4a3226','#3a2a20','#2e2018');
    for(let i=0;i<4;i++) F(100,W*0.60, 36+i*14, 46+i*14, ['#c9a24a','#e8ddc8','#8fb4a0','#c2807e'][i], null,0, 1.5);
    shopDoor(W*0.84, wall, trim);
    F(W*0.76,W-14, 52, 90, '#5d7a68', null,0,-6.5);
    // guitars, lying in the wall plane
    for(let i=0;i<3;i++){
      const ga = W*0.16 + i*W*0.30, gz = 118, gb = -4, col = ['#a8632f','#c9a24a','#8a3f36'][i];
      faceCircle(ga, gb, gz+6, 15, col, shade(col,.75), 1.5);
      faceCircle(ga, gb, gz-8, 11, col, shade(col,.75), 1.5);
      faceCircle(ga, gb-0.4, gz+6, 4.5, '#2b2119');
      tube(ga, gb, gz+18, ga, gb, gz+38, 2, '#2b2119');
      slab(ga-5, ga+5, gz+38, gz+46, gb-0.5, gb-4, '#2b2119');
      for(let k=0;k<3;k++) tube(ga-3+k*3, gb-0.8, gz-6, ga-3+k*3, gb-0.8, gz+38, 0.4, '#d8cfae');
    }
    // horn: tube run into a conical bell
    const ha = W*0.50, hb = -12, hz = H-16;
    tube(ha-30, hb, hz+4, ha-6, hb, hz+20, 3, trim);
    tube(ha-6, hb, hz+20, ha+16, hb, hz+12, 3, trim);
    tube(ha+16, hb, hz+12, ha+16, hb, hz-2, 3, trim);
    const b0=P(ha+16,hb,hz-2), b1=P(ha+34,hb,hz-18), b2=P(ha+2,hb,hz-22);
    ctx.beginPath(); ctx.moveTo(b0.x,b0.y); ctx.lineTo(b1.x,b1.y); ctx.lineTo(b2.x,b2.y);
    ctx.closePath(); ctx.fillStyle=trim; ctx.fill();
    faceCircle(ha+18, hb, hz-20, 9, shade(trim,1.2), shade(trim,.7), 2);
    if(state.roof) box(W*0.28,W*0.52,-140,-100,H,H+20,'#8f969d','#787f86','#697077');
    kerb(p,'none');
  }
},
{
  name:'Chandlery', head:'Mast and rigging on the roof, anchor sign',
  fTodo:'z112..140 return +3, lettering behind board',
  tags:['stepped mast','rigging lines','porthole windows','coiled rope','tarred timber'],
  desc:'The mast is a tapered cylinder on a deck block with a yard across it, the portholes are circles in the wall plane with real rims, and the rope coils lie flat on the pavement.',
  draw(p){
    const wall = '#2b3f4a', trim = '#c9b48e', H = 160;
    body(wall, trim, H);
    slab(0,W, H, H+10, -1, -12, trim);
    for(let i=0;i<7;i++) F(0,W, 12+i*20, 15+i*20, shade(wall,1.15), null,0,-1);
    F(12,W*0.60, 26, 104, '#3f5a68', shade(wall,1.4), 3);
    for(let i=0;i<3;i++){
      const pa = 28+i*40;
      faceCircle(pa, -3, 66, 15, trim, shade(trim,.7), 2.5);
      faceCircle(pa, -3.5, 66, 11, '#7fa8b8');
      for(let k=0;k<4;k++) faceCircle(pa + 13*Math.cos(k*1.57), -3.6, 66 + 13*Math.sin(k*1.57), 1.6, shade(trim,.65));
    }
    shopDoor(W*0.83, wall, trim);
    F(W*0.70,W-14, 52, 90, '#7fa8b8', null,0,-6.5);
    slab(6,W-6, 112, 140, -1, -9, shade(wall,1.25), null, trim);
    F(18,W-18, 120, 132, trim, null,0,-9.5);
    // anchor, built from tubes and a ring
    const aa = W*0.86, ab = -6, az = 124;
    tube(aa, ab, az-18, aa, ab, az+16, 4, trim);
    tube(aa-13, ab, az-8, aa+13, ab, az-8, 3.4, trim);
    faceCircle(aa, ab, az+20, 5, null, trim, 3.5);
    faceT(aa, ab-0.4, az+2, 15);
    ctx.strokeStyle=trim; ctx.lineWidth=4/(15*K);
    ctx.beginPath(); ctx.arc(0,0,1,0.5,2.64); ctx.stroke();
    ctx.restore();
    if(state.props){
      for(let i=0;i<2;i++){
        const ra = W+18+i*36, rb = 30;
        for(let k=0;k<3;k++) plateHoop(ra, rb, 2+k*3, 16-k*4, '#b8a880', 3);
      }
    }
    if(state.roof){
      const ma = W*0.44, mb = -70;
      box(ma-14, ma+14, mb-14, mb+14, H+10, H+18, '#8a7a58','#9a8a66','#786a4c');
      cyl(ma, mb, H+18, H+90, 4, '#b8a880');
      cyl(ma, mb, H+90, H+150, 2.6, '#c2b088');
      tube(ma-26, mb, H+112, ma+26, mb, H+112, 2, '#b8a880');
      const top = P(ma, mb, H+150);
      ctx.strokeStyle='#b8a880'; ctx.lineWidth=1.6;
      for(const [ra,rb] of [[W*0.06,-20],[W*0.86,-20],[ma,-190]]){
        const foot = P(ra, rb, H+10);
        ctx.beginPath(); ctx.moveTo(top.x,top.y); ctx.lineTo(foot.x,foot.y); ctx.stroke();
      }
      poly([P(ma+2,mb,H+150),P(ma+28,mb,H+142),P(ma+28,mb,H+126),P(ma+2,mb,H+132)], '#c2452e');
      box(W*0.66,W*0.88,-150,-116,H,H+18,'#8f969d','#787f86','#697077');
    }
    kerb(p,'none');
  }
},
{
  name:'Brewery tap', tall:true,
  cTodo:'1 pavement props need collision volumes, 45 of them lapping past the frontage',
  fTodo:'z132..164 return +1, lettering behind board',
  zTodo:1.11,          // H 186 -- see SCALE REVIEW at the head of this file
  head:'Copper still through the glass, vent stacks',
  tags:['turned copper still','swan neck','vent stacks','cellar hatch','barrel'],
  desc:'The still is a turned copper pot with a domed head and a swan neck running to a condenser column, all as solids, and the vent stacks are cylinders with collars and cowls.',
  draw(p){
    const wall = '#6b4a2e', trim = '#e0c88a', H = 186;
    body(wall, trim, H);
    slab(0,W, H, H+10, -1, -12, shade(wall,.7));
    slab(8,W-8, 132, 164, -1, -9, shade(wall,1.2), null, trim);
    F(22,W-22, 140, 156, trim, null,0,-9.5);
    F(10,W*0.68, 20, 122, '#2e2018', shade(wall,.6), 3);
    // the still, turned
    const sa = W*0.28, sb = 4;
    cyl(sa, sb, 26, 84, 30, '#b87333');
    for(const hz of [40, 58, 76]) plateHoop(sa, sb, hz, 31, '#98561f', 2.5);
    ball(sa, sb, 84, 28, '#c9803a', '#d89a52');
    cyl(sa, sb, 108, 118, 8, '#b87333');
    tube(sa, sb, 112, sa+40, sb, 104, 5, '#b87333');
    cyl(sa+46, sb, 58, 106, 9, '#a8672c');
    plateCircle(sa+46, sb, 106, 9, '#c9803a');
    cyl(sa, sb, 20, 30, 22, '#3a2e26');
    F(sa-14, sa+14, 24, 40, '#e8a13a', null,0, sb-22);
    shopDoor(W*0.86, wall, trim);
    F(W*0.78,W-14, 56, 98, '#8a7a5a', null,0,-6.5);
    if(state.props){
      poly([P(W*0.10,30,2),P(W*0.40,30,2),P(W*0.40,64,2),P(W*0.10,64,2)], '#4a3a2a', '#3a2c1e', 2);
      poly([P(W*0.12,32,4),P(W*0.24,32,4),P(W*0.24,62,4),P(W*0.12,62,4)], '#5c4632');
      const ba = W+28, bb = 40;
      cyl(ba, bb, 0, 34, 17, '#8a5a34');
      for(const hz of [7, 17, 27]) plateHoop(ba, bb, hz, 18, '#5c4632', 2.5);
      plateCircle(ba, bb, 34, 17, '#a06a3e', '#75492a', 2);
    }
    if(state.roof){
      for(const aa of [W*0.24, W*0.62]){
        cyl(aa, -60, H+10, H+56, 11, '#8a8272');
        cyl(aa, -60, H+56, H+64, 15, '#9a9282');
        plateCircle(aa, -60, H+64, 15, '#a8a08e', '#7d7566', 2);
        for(let k=0;k<3;k++)
          ball(aa + (k%2?8:-6), -60, H+76+k*16, 10+k*5, 'rgba(226,226,220,.42)', 'rgba(240,240,234,.4)');
      }
      box(W*0.78,W*0.96,-150,-120,H,H+18,'#8f969d','#787f86','#697077');
    }
    kerb(p,'none');
  }
},
{
  name:'Print works', tall:true,
  cTodo:'4 pavement props need collision volumes, 66 of them lapping past the frontage',
  fTodo:'z128..158 return +3, lettering behind board',
  zTodo:1.05,          // H 176 -- see SCALE REVIEW at the head of this file
  head:'Paper roll, press through the glass, ink drums',
  tags:['turned paper roll','press rollers','ink drums','clock','industrial glazing'],
  desc:'The newsprint roll is a cylinder standing on end with a visible core, the press rollers are circles in the glass plane, and the ink drums are hooped cylinders on the pavement.',
  draw(p){
    const wall = '#4a5259', trim = '#e8ddc8', H = 176;
    body(wall, trim, H);
    slab(0,W, H, H+10, -1, -12, shade(wall,1.35));
    slab(6,W-6, 128, 158, -1, -9, shade(wall,1.2), null, trim);
    F(20,W-20, 136, 150, trim, null,0,-9.5);
    F(10,W*0.72, 22, 118, '#7b8f9c', shade(wall,1.4), 3);
    for(let i=1;i<8;i++) F(10+(W*0.72-10)*i/8-1.5, 10+(W*0.72-10)*i/8+1.5, 22,118, shade(wall,1.15), null,0,-1);
    for(let i=1;i<4;i++) F(10,W*0.72, 22+96*i/4-1.5, 22+96*i/4+1.5, shade(wall,1.15), null,0,-1);
    box(24,W*0.44, 2, 24, 30, 92, '#39424a','#2f3840','#262d33');
    for(let i=0;i<3;i++){
      faceCircle(38+i*30, 1, 62, 13, '#5a646c', '#8d979f', 2.5);
      faceCircle(38+i*30, 0.6, 62, 4, '#8d979f');
    }
    F(W*0.46,W*0.68, 40, 46, '#d8d2c4', null,0, 1.5);
    shopDoor(W*0.88, wall, trim);
    F(W*0.82,W-14, 54, 94, '#7b8f9c', null,0,-6.5);
    faceCircle(W*0.90, -10, 143, 13, '#f2ece0', shade(wall,1.5), 2.5);
    faceT(W*0.90, -10.4, 143, 13);
    ctx.strokeStyle='#39424a'; ctx.lineWidth=2/(13*K);
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,-0.62); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0.46,0.24); ctx.stroke();
    ctx.restore();
    if(state.props){
      const ra = W+34, rb = 40;
      cyl(ra, rb, 0, 116, 32, '#e4ddcb');
      plateCircle(ra, rb, 116, 32, '#f2ece0', '#c9c2b0', 2);
      plateCircle(ra, rb, 117, 12, '#c9c2b0');
      for(let i=0;i<2;i++){
        const da = W*0.08+i*44, db = 38;
        cyl(da, db, 0, 30, 13, '#39424a');
        for(const hz of [7, 22]) plateHoop(da, db, hz, 14, '#262d33', 2);
        plateCircle(da, db, 30, 13, '#4a545c', '#2f3840', 2);
      }
    }
    if(state.roof) box(W*0.34,W*0.62,-150,-104,H,H+26,'#8f969d','#787f86','#697077');
    kerb(p,'none');
  }
},
{
  name:'Sweet shop', head:'Barley-twist columns, jar rows, striped canopy',
  fTodo:'z118..142 return +3, lettering behind board; z114..120 return +8',
  tags:['twisted columns','lidded jars','candy stripes','tiny scale','pastel'],
  desc:'The barley twist is now a real cylinder with the stripe wrapping it, the same way the barber pole works, and every jar is a turned glass with a lid sitting on the shelf.',
  draw(p){
    const wall = '#f0dce2', trim = '#c2452e', H = 152, WW = 196;
    body(wall, trim, H, WW);
    slab(0,WW, H, H+8, -1, -12, trim);
    slab(6,WW-6, 118, 142, -1, -9, '#fbf3f5', null, trim);
    F(18,WW-18, 124, 136, trim, null,0,-9.5);
    F(24,WW*0.60, 24, 102, '#f8eef0', shade(wall,.72), 3);
    for(let r=0;r<3;r++){
      const z = 30+r*26;
      slab(26,WW*0.58, z-3, z, -1, 16, '#d8c0c8');
      for(let i=0;i<5;i++){
        const ja = 34+i*17, jb = 6, col = ['#e8a13a','#c2452e','#7ac48a','#4aa8c4','#e2c74a'][(r+i)%5];
        cyl(ja, jb, z, z+18, 7, col);
        plateCircle(ja, jb, z+18, 7, shade(col,1.2));
        cyl(ja, jb, z+18, z+22, 4, '#b9bcc0');
      }
    }
    shopDoor(WW*0.80, wall, '#f8eef0', null, WW);
    F(WW*0.70,WW-20, 52, 90, '#d8c0c8', null,0,-6.5);
    for(const ca of [WW*0.63, WW-11]){
      cyl(ca, -6, 0, 118, 6, '#fbf3f5');
      for(let i=0;i<9;i++){
        const z = 4+i*13;
        for(let k=0;k<6;k++){
          const t0 = 3*Math.PI/4 - Math.PI*k/6, t1 = 3*Math.PI/4 - Math.PI*(k+1)/6;
          poly([P(ca+6*Math.cos(t0), -6+6*Math.sin(t0), z + k*1.5),
                P(ca+6*Math.cos(t1), -6+6*Math.sin(t1), z + (k+1)*1.5),
                P(ca+6*Math.cos(t1), -6+6*Math.sin(t1), z + (k+1)*1.5 + 5),
                P(ca+6*Math.cos(t0), -6+6*Math.sin(t0), z + k*1.5 + 5)], trim);
        }
      }
      cyl(ca, -6, 118, 126, 9, '#fbf3f5');
    }
    const out = 28;
    for(let i=0;i<9;i++){
      const x0=4+(WW-8)*i/9, x1=4+(WW-8)*(i+1)/9;
      poly([P(x0,0,114),P(x1,0,114),P(x1,out,100),P(x0,out,100)], i%2 ? '#fbf3f5' : trim);
    }
    poly([P(4,0,106),P(WW-4,0,106),P(WW-4,out,92),P(4,out,92)], shade(trim,.62));
    poly([P(4,out,100),P(WW-4,out,100),P(WW-4,out,92),P(4,out,92)], shade(trim,.8));
    slab(0,WW,114,120, -1, -8, shade(trim,.8));
    if(state.roof) box(WW*0.30,WW*0.54,-140,-100,H,H+18,'#9aa0a6','#7d838a','#6a7076');
    kerb(p,'none');
  }
},
{
  name:'Pottery', tall:true,
  cTodo:'4 pavement props need collision volumes, 50 of them lapping past the frontage',
  fTodo:'z110..138 return +3, lettering behind board',
  zTodo:0.92,          // H 154 -- see SCALE REVIEW at the head of this file
  head:'Kiln chimney with smoke, arched kiln door',
  tags:['tapered round chimney','swept kiln arch','thrown pots','raw brick','smoke'],
  desc:'The chimney is a stack of tapering cylinders instead of flat rectangles, the kiln arch is swept to a real reveal, and the pots are thrown forms with rims and feet.',
  draw(p){
    const wall = '#a8654a', trim = '#e0d2b8', H = 154;
    body(wall, trim, H);
    slab(0,W, H, H+10, -1, -12, shade(wall,.7));
    for(let r=0;r<9;r++) F(0,W, 8+r*16, 11+r*16, shade(wall,.86), null,0,-1);
    const kx0 = W*0.10, kx1 = W*0.42;
    F(kx0-8,kx1+8, 0, 84, shade(wall,.76), null,0,-1);
    const ap = (t,bb) => {
      const u=1-t, a = u*u*(kx0-8) + 2*u*t*((kx0+kx1)/2) + t*t*(kx1+8);
      const z = u*u*84 + 2*u*t*146 + t*t*84;
      return P(a,bb,z);
    };
    ctx.beginPath(); let q=ap(0,-1); ctx.moveTo(q.x,q.y);
    for(let k=1;k<=12;k++){ q=ap(k/12,-1); ctx.lineTo(q.x,q.y); }
    ctx.closePath(); ctx.fillStyle=shade(wall,.76); ctx.fill();
    for(let k=0;k<12;k++) poly([ap(k/12,-1),ap((k+1)/12,-1),ap((k+1)/12,-11),ap(k/12,-11)], shade(wall,.94));
    F(kx0,kx1, 0, 78, '#2e1d16', null,0,-10);
    const ip = (t,bb) => {
      const u=1-t, a = u*u*kx0 + 2*u*t*((kx0+kx1)/2) + t*t*kx1;
      const z = u*u*78 + 2*u*t*132 + t*t*78;
      return P(a,bb,z);
    };
    ctx.beginPath(); q=ip(0,-10); ctx.moveTo(q.x,q.y);
    for(let k=1;k<=12;k++){ q=ip(k/12,-10); ctx.lineTo(q.x,q.y); }
    ctx.closePath(); ctx.fillStyle='#2e1d16'; ctx.fill();
    F(kx0+6,kx1-6, 4, 34, '#e8763a', null,0,-10.5);
    F(kx0+12,kx1-12, 6, 22, '#f4b055', null,0,-11);
    F(W*0.50,W*0.78, 26, 102, '#7f93a0', trim, 3);
    for(let i=0;i<3;i++){
      const pa = W*0.545+i*W*0.09, pb = -3, col = ['#c98a4a','#8a6a4a','#b87a52'][i];
      cyl(pa, pb, 34, 44, 6, shade(col,.85));
      ball(pa, pb, 54, 11, col);
      cyl(pa, pb, 60, 68, 6, col);
      plateCircle(pa, pb, 68, 7, shade(col,1.15), shade(col,.8), 1.5);
    }
    shopDoor(W*0.88, wall, trim);
    slab(6,W-6, 110, 138, -1, -9, shade(wall,1.14), null, trim);
    F(20,W-20, 118, 130, trim, null,0,-9.5);
    if(state.props){
      for(let i=0;i<4;i++){
        const pa = W+12+(i%2)*30, pb = 34, pz = (i<2)?0:26, col = ['#c98a4a','#a8654a','#b87a52','#8a6a4a'][i];
        cyl(pa, pb, pz, pz+10, 8, shade(col,.85));
        ball(pa, pb, pz+18, 13, col);
        plateCircle(pa, pb, pz+28, 9, shade(col,1.1), shade(col,.8), 1.5);
      }
    }
    if(state.roof){
      const ca = W*0.70, cb = -140;
      for(let i=0;i<5;i++) cyl(ca, cb, H + i*44, H + (i+1)*44, 30 - i*3.6, shade(wall, 0.92 + i*0.02));
      plateCircle(ca, cb, H+220, 13, '#3a2a22', shade(wall,.8), 2);
      for(let k=0;k<4;k++)
        ball(ca + (k%2?11:-8), cb, H+236+k*20, 12+k*6, 'rgba(190,186,178,.42)', 'rgba(210,206,198,.4)');
      box(W*0.16,W*0.36,-120,-88,H,H+16,'#9aa0a6','#7d838a','#6a7076');
    }
    kerb(p,'none');
  }
},
{
  name:'Cobbler', head:'Giant boot sign, bench in the window',
  cTodo:'2 pavement props need collision volumes',
  fTodo:'z112..140 return +5, lettering behind board',
  tags:['boot as a solid','narrowest unit','work bench','shoe racks','worn timber'],
  desc:'The boot is built as a leg cylinder with a boxed foot and a sole slab, hanging from its bracket in the world, and the shoes on the bench are rounded solids.',
  draw(p){
    const wall = '#7a5a3a', trim = '#e0cfae', H = 158, WW = 152;
    body(wall, trim, H, WW);
    slab(0,WW, H, H+8, -1, -12, shade(wall,.7));
    slab(4,WW-4, 112, 140, -1, -9, shade(wall,1.2), null, trim);
    F(16,WW-16, 120, 132, trim, null,0,-9.5);
    F(10,WW*0.60, 24, 100, '#8a9aa0', shade(wall,1.35), 3);
    box(14,WW*0.56, 2, 22, 44, 52, '#5a4128','#6a4f32','#4a3520');
    for(const la of [18, WW*0.50]){ cyl(la, 6, 24, 44, 3, '#4a3520'); cyl(la, 18, 24, 44, 3, '#4a3520'); }
    for(let i=0;i<4;i++){
      const sa = 22+i*17, col = ['#3a2a1a','#6a4a2a','#2e2018','#8a6a4a'][i];
      ball(sa, 10, 58, 6, col);
      box(sa-7, sa+5, 6, 16, 52, 57, shade(col,1.1), col, shade(col,.85));
    }
    for(let r=0;r<2;r++) slab(14,WW*0.56, 74+r*12, 78+r*12, -1, 18, '#5a4128');
    shopDoor(WW*0.78, wall, trim, null, WW);
    F(WW*0.70,WW-14, 52, 90, '#8a9aa0', null,0,-6.5);
    // the boot, as a solid
    const ba = WW*0.30, bb = -22;
    tube(ba, -2, 148, ba, bb, 148, 1.8, '#4a4f55');
    tube(ba, bb, 148, ba, bb, 138, 1.4, '#4a4f55');
    cyl(ba, bb, 88, 136, 15, '#5a3a24');
    plateCircle(ba, bb, 136, 15, '#6a4630', '#3a2416', 2);
    box(ba-15, ba+34, bb-15, bb+15, 76, 92, '#5a3a24', '#6a4630', '#4a2f1c');
    slab(ba-17, ba+36, 68, 76, bb+16, bb-16, '#2e1d12');
    for(let i=0;i<4;i++) tube(ba-9, bb-16, 100+i*11, ba+8, bb-16, 104+i*11, 1.1, '#c9b48e');
    if(state.roof) box(WW*0.28,WW*0.52,-130,-96,H,H+18,'#8f969d','#787f86','#697077');
    kerb(p,'none');
  }
},
{
  name:'Beach shop', head:'Boards on the wall, palm through the roof, open shutter',
  fTodo:'z114..132 return +7',
  tags:['boards leaning in plane','palm with real fronds','open shutter','hammock','sun-bleached'],
  desc:'Boards lean in a genuine world plane against the pier and the palm fronds are polygons laid out around the crown in three dimensions, so the tree turns rather than facing the camera.',
  draw(p){
    const wall = '#5fbcc4', trim = '#f4ecd6', H = 138;
    body(wall, trim, H);
    slab(0,W, H, H+10, -1, -12, trim);
    slab(0,W, H-24, H-6, -1, -7, shade(wall,1.2));
    F(12,W*0.72, 0, 104, '#2e4a4e', null,0, 1);
    slab(12,W*0.72, 96, 110, -1, -8, '#c9ccd0');
    for(let i=0;i<3;i++) F(14,W*0.72-2, 98+i*4, 100+i*4, '#a9acb0', null,0,-8.5);
    slab(14,W*0.70, 44, 52, -1, 20, '#c9b48e');
    for(let i=0;i<4;i++) box(20+i*30, 40+i*30, 4, 18, 52, 76, ['#e8a13a','#e2748c','#7ac48a','#f4ecd6'][i],
      shade(['#e8a13a','#e2748c','#7ac48a','#f4ecd6'][i],.85), shade(['#e8a13a','#e2748c','#7ac48a','#f4ecd6'][i],.7));
    shopDoor(W*0.87, wall, trim);
    if(state.props){
      // boards leaning in a real plane against the pier
      for(let i=0;i<3;i++){
        const ba = W*0.74 + i*13, bb = -6 - i*7, col = ['#f4ecd6','#e8a13a','#e2748c'][i];
        const lean = 14 - i*3;
        const p0 = P(ba, bb, 2), p1 = P(ba + lean, bb, 112);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.quadraticCurveTo(p0.x - 12*K, (p0.y+p1.y)/2, p1.x - 3*K, p1.y);
        ctx.quadraticCurveTo(p1.x + 9*K, (p0.y+p1.y)/2 - 6*K, p0.x + 9*K, p0.y);
        ctx.closePath(); ctx.fillStyle=col; ctx.fill();
        ctx.strokeStyle='#c9b48e'; ctx.lineWidth=2; ctx.stroke();
      }
      const h0=P(6,26,86), h1=P(W*0.44,26,86);
      ctx.strokeStyle='#e0d2b0'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(h0.x,h0.y);
      ctx.quadraticCurveTo((h0.x+h1.x)/2,(h0.y+h1.y)/2+30*K, h1.x,h1.y); ctx.stroke();
      ctx.lineWidth=1.4;
      for(let i=1;i<7;i++){
        const t=i/7, x=(1-t)*(1-t)*h0.x+2*(1-t)*t*((h0.x+h1.x)/2)+t*t*h1.x;
        const y=(1-t)*(1-t)*h0.y+2*(1-t)*t*(((h0.y+h1.y)/2)+30*K)+t*t*h1.y;
        ctx.beginPath(); ctx.moveTo(x,y-14*K); ctx.lineTo(x,y); ctx.stroke();
      }
    }
    if(state.roof){
      // palm: tapering trunk, fronds laid out around the crown in 3D
      const pa = W*0.30, pb = -110;
      for(let i=0;i<6;i++){
        const t=i/6, t2=(i+1)/6;
        cyl(pa + 14*t*t, pb, H + 120*t, H + 120*t2, 7 - t*3, i%2 ? '#8a7a52' : '#93835a');
      }
      const ca = pa + 14, cz = H + 120;
      for(let k=0;k<7;k++){
        const a = k*0.897;
        const tipA = ca + 46*Math.cos(a), tipB = pb + 46*Math.sin(a);
        poly([P(ca, pb, cz),
              P((ca+tipA)/2, (pb+tipB)/2, cz + 12),
              P(tipA, tipB, cz - 6),
              P((ca+tipA)/2, (pb+tipB)/2, cz - 4)],
             k%2 ? '#3f8f5a' : '#4ea36a');
      }
      for(let k=0;k<3;k++) ball(ca + 9*Math.cos(k*2.1), pb + 9*Math.sin(k*2.1), cz - 4, 5, '#c9a24a');
      box(W*0.62,W*0.86,-140,-104,H,H+16,'#9aa0a6','#7d838a','#6a7076');
    }
    kerb(p,'none');
  }
},
{
  name:'Forge', head:'Brick stack, open fire, anvil on the pavement',
  cTodo:'4 pavement props need collision volumes, 52 of them lapping past the frontage',
  fTodo:'z118..148 return +3, lettering behind board',
  tags:['round forge stack','glowing fire','anvil as a solid','horseshoe sign','open front'],
  desc:'The hood over the fire is a solid tapering to a round stack, the tools hang as tubes on a rack, and the anvil is a shaped solid on a timber block.',
  draw(p){
    const wall = '#4a4238', trim = '#c9a24a', H = 164;
    body(wall, trim, H);
    slab(0,W, H, H+10, -1, -12, shade(wall,1.3));
    slab(6,W-6, 118, 148, -1, -9, shade(wall,1.2), null, trim);
    F(20,W-20, 126, 140, trim, null,0,-9.5);
    F(12,W*0.70, 0, 110, '#1d1813', null,0, 1);
    const fa = W*0.26;
    box(fa-30, fa+30, 4, 34, 12, 44, '#3a322a','#2e2620','#262019');
    F(fa-24, fa+24, 16, 40, '#e8763a', null,0, 3.5);
    F(fa-15, fa+15, 18, 34, '#f6c05a', null,0, 3.2);
    // hood tapering to a round stack
    poly([P(fa-34,2,52),P(fa+34,2,52),P(fa+22,2,86),P(fa-22,2,86)], '#3a332b');
    poly([P(fa-34,2,52),P(fa-34,34,52),P(fa-22,34,86),P(fa-22,2,86)], '#2f2922');
    poly([P(fa+34,2,52),P(fa+34,34,52),P(fa+22,34,86),P(fa+22,2,86)], '#453d33');
    cyl(fa, 18, 86, 110, 20, '#3a332b');
    for(let i=0;i<4;i++){
      const ta = W*0.50 + i*13;
      tube(ta, 6, 40, ta, 6, 88, 1.6, '#8d979f');
      tube(ta-5, 6, 88, ta+5, 6, 88, 1.4, '#6d757c');
    }
    shopDoor(W*0.86, wall, trim);
    F(W*0.80,W-14, 54, 94, '#6a6258', null,0,-6.5);
    const hc = W*0.88, hb = -6, hz = 124;
    faceT(hc, hb, hz, 17);
    ctx.strokeStyle=trim; ctx.lineWidth=8/(17*K);
    ctx.beginPath(); ctx.arc(0,0,1,0.6,2.54,true); ctx.stroke();
    ctx.restore();
    tube(hc-14, hb, hz-9, hc-15, hb, hz-20, 3.5, trim);
    tube(hc+14, hb, hz-9, hc+15, hb, hz-20, 3.5, trim);
    if(state.props){
      box(W+14, W+52, 26, 60, 0, 24, '#5a4a3a','#6a5842','#4a3d2e');
      const an = W+33, ab = 42;
      box(an-20, an+14, ab-9, ab+9, 24, 33, '#3a4046','#454b52','#2f353a');
      poly([P(an+14,ab-9,33),P(an+30,ab,29),P(an+14,ab+9,33)], '#454b52');
      box(an-12, an+4, ab-6, ab+6, 33, 40, '#454b52','#4e555c','#363c42');
    }
    if(state.roof){
      const ca = W*0.26, cb = -60;
      cyl(ca, cb, H+10, H+72, 20, shade(wall,1.1));
      cyl(ca, cb, H+72, H+80, 24, shade(wall,.9));
      plateCircle(ca, cb, H+80, 24, '#2e2620', shade(wall,.7), 2);
      for(let k=0;k<3;k++)
        ball(ca + (k%2?9:-7), cb, H+92+k*17, 11+k*5, 'rgba(70,66,60,.48)', 'rgba(92,88,82,.44)');
      box(W*0.62,W*0.86,-150,-116,H,H+18,'#8f969d','#787f86','#697077');
    }
    kerb(p,'none');
  }
},
{
  name:'Carpet shop', head:'Rugs draped over a rail across the front',
  fTodo:'z124..152 return +3, lettering behind board',
  tags:['hanging rugs','draped cloth','round rail','rolled stock','deep colour'],
  desc:'The rail is a tube on turned brackets and the rolled stock leans as real cylinders with visible ends, so the only soft thing left is the cloth itself.',
  draw(p){
    const wall = '#5a3742', trim = '#e0c88a', H = 164, railZ = 116, railB = 30;
    body(wall, trim, H);
    slab(0,W, H, H+10, -1, -12, shade(wall,.7));
    slab(6,W-6, 124, 152, -1, -9, shade(wall,1.2), null, trim);
    F(20,W-20, 132, 144, trim, null,0,-9.5);
    F(12,W*0.68, 24, 112, '#2e1d24', shade(wall,.6), 3);
    shopDoor(W*0.85, wall, trim);
    F(W*0.78,W-14, 52, 90, '#8a6a74', null,0,-6.5);
    for(const aa of [10, W*0.5, W-10]){
      tube(aa, 0, railZ+6, aa, railB, railZ, 3, shade(wall,1.3));
      ball(aa, railB, railZ, 3.4, shade(wall,1.15));
    }
    tube(4, railB, railZ+2, W-4, railB, railZ+2, 2.6, '#8d979f');
    const cols = ['#a83a3a','#2f5f6b','#c9922f','#6b4a7a','#3f6b4a'];
    for(let i=0;i<5;i++){
      const x0 = 6 + (W-12)*i/5, x1 = 6 + (W-12)*(i+1)/5, drop = 62 + (i%2)*16;
      poly([P(x0,railB-1,railZ),P(x1,railB-1,railZ),P(x1,0,railZ+6),P(x0,0,railZ+6)], shade(cols[i],1.2));
      ctx.beginPath();
      const tl=P(x0,railB-1,railZ), tr=P(x1,railB-1,railZ);
      const bl=P(x0,railB-1,railZ-drop), br=P(x1,railB-1,railZ-drop);
      const mid=P((x0+x1)/2,railB-1,railZ-drop-11);
      ctx.moveTo(tl.x,tl.y); ctx.lineTo(tr.x,tr.y); ctx.lineTo(br.x,br.y);
      ctx.quadraticCurveTo(mid.x,mid.y,bl.x,bl.y);
      ctx.closePath(); ctx.fillStyle=cols[i]; ctx.fill();
      ctx.strokeStyle=shade(cols[i],.72); ctx.lineWidth=2; ctx.stroke();
      for(const zz of [railZ-8, railZ-drop+12]){
        const q0=P(x0+8,railB-2,zz), q1=P(x1-8,railB-2,zz);
        ctx.strokeStyle=shade(cols[i],1.35); ctx.lineWidth=4;
        ctx.beginPath(); ctx.moveTo(q0.x,q0.y); ctx.lineTo(q1.x,q1.y); ctx.stroke();
      }
    }
    if(state.props){
      for(let i=0;i<3;i++){
        const ra = W+18+i*15, col = cols[(i+1)%5];
        tube(ra, 30, 4, ra + 7, 52, 96, 8, col);
        ball(ra + 7, 52, 96, 8, shade(col,1.18));
      }
    }
    if(state.roof) box(W*0.30,W*0.56,-140,-100,H,H+20,'#8f969d','#787f86','#697077');
    kerb(p,'none');
  }
},
{
  name:'Coffee roaster', head:'Roaster drum, sack stack, vent chimney',
  cTodo:'4 pavement props need collision volumes, 62 of them lapping past the frontage',
  fTodo:'z126..152 return +3, lettering behind board',
  tags:['turned roaster','hessian sacks','round flue','warm glow','bean bins'],
  desc:'The roaster is a drum with a hinged face and a hopper on top, the flue is a cylinder with collars running up the front, and the sacks are slumped solids rather than ovals.',
  draw(p){
    const wall = '#4a3428', trim = '#d8b87a', H = 168;
    body(wall, trim, H);
    slab(0,W, H, H+10, -1, -12, shade(wall,1.35));
    slab(6,W-6, 126, 152, -1, -9, shade(wall,1.2), null, trim);
    F(20,W-20, 133, 145, trim, null,0,-9.5);
    F(10,W*0.70, 22, 116, '#241a14', shade(wall,.6), 3);
    const ra = W*0.26, rb = 6;
    box(ra-30, ra+30, rb-16, rb+16, 20, 30, '#3a2e26','#2f251e','#241c17');
    cyl(ra, rb, 30, 84, 28, '#2f6f6b');
    plateCircle(ra, rb, 84, 28, '#3f8f88', '#1f4f4c', 2);
    faceCircle(ra + 16, rb - 16, 56, 13, '#c9a24a', '#8f6f26', 2.5);
    faceCircle(ra + 16, rb - 16.4, 56, 5, '#8f6f26');
    cyl(ra, rb, 84, 100, 12, '#b87333');
    poly([P(ra-14,rb,100),P(ra+14,rb,100),P(ra+8,rb,116),P(ra-8,rb,116)], '#c9803a');
    F(ra-20, ra+20, 22, 30, '#e8763a', null,0, rb-17);
    cyl(ra, rb-22, 100, 128, 4, '#8d979f');
    for(const cz of [108, 122]) plateCircle(ra, rb-22, cz, 6, '#a8aeb4');
    for(let i=0;i<3;i++){
      const bx = W*0.44 + i*30;
      cyl(bx, 4, 30, 74, 12, '#5c4232');
      plateCircle(bx, 4, 74, 12, ['#3a2a1e','#5a3a24','#2e2018'][i], '#3a2c22', 1.6);
    }
    shopDoor(W*0.86, wall, trim);
    F(W*0.80,W-14, 54, 94, '#8a7458', null,0,-6.5);
    if(state.props){
      for(let i=0;i<3;i++){
        const sa = W+16+(i%2)*30, sb = 36, sz = (i<2)?0:24;
        cyl(sa, sb, sz, sz+22, 16, '#c9b48e');
        ball(sa, sb, sz+26, 15, '#c9b48e', '#d8c49e');
        slab(sa-9, sa+9, sz+10, sz+16, sb-16, sb-18, '#8a7458');
      }
    }
    if(state.roof){
      cyl(W*0.27, -20, H+10, H+66, 7, '#8d979f');
      cyl(W*0.27, -20, H+66, H+74, 10, '#a0a8b0');
      for(let k=0;k<3;k++)
        ball(W*0.27 + (k%2?8:-6), -20, H+86+k*15, 9+k*4, 'rgba(214,208,196,.4)', 'rgba(228,222,210,.38)');
      box(W*0.62,W*0.88,-150,-112,H,H+20,'#8f969d','#787f86','#697077');
    }
    kerb(p,'none');
  }
},
{
  name:'Pigeon loft', head:'Timber loft on the roof, landing board, birds',
  fTodo:'z104..130 return +3, lettering behind board',
  tags:['rooftop loft','landing board','birds as solids','feed shop below','timber'],
  desc:'The loft has a closed gable end and a ridge, the landing board is carried on real brackets, and the birds are rounded solids with tails and beaks rather than flat ovals.',
  draw(p){
    const wall = '#8a7a5e', trim = '#4a3f2e', H = 148;
    body(wall, trim, H);
    slab(0,W, H, H+10, -1, -12, trim);
    F(10,W*0.66, 22, 96, '#6a7a68', shade(wall,.65), 3);
    for(let i=0;i<4;i++) F(16+i*((W*0.60)/4), 20+i*((W*0.60)/4), 22, 96, shade(wall,1.15), null,0,-1);
    for(let i=0;i<3;i++){
      const sa = 28+i*32;
      cyl(sa, 6, 26, 46, 12, '#c9b48e');
      ball(sa, 6, 50, 11, '#c9b48e', '#d8c49e');
    }
    shopDoor(W*0.84, wall, trim);
    F(W*0.76,W-14, 48, 86, '#6a7a68', null,0,-6.5);
    slab(6,W-6, 104, 130, -1, -9, shade(wall,1.15), null, trim);
    F(20,W-20, 112, 122, trim, null,0,-9.5);
    if(state.roof){
      const l0 = W*0.16, l1 = W*0.76, b0 = -150, b1 = -50;
      F(l0,l1, H+10, H+72, '#a8916a', shade(wall,.6), 2, b1);
      S(l1, b0, b1, H+10, H+72, '#8f7b58');
      poly([P(l0-8,b1+10,H+72),P(l1+8,b1+10,H+72),P(l1+8,(b0+b1)/2,H+104),P(l0-8,(b0+b1)/2,H+104)], '#5a4a34');
      poly([P(l0-8,(b0+b1)/2,H+104),P(l1+8,(b0+b1)/2,H+104),P(l1+8,b0-8,H+72),P(l0-8,b0-8,H+72)], '#6a5840');
      slab(l0-10, l1+10, H+104, H+111, (b0+b1)/2+7, (b0+b1)/2-7, '#4a3c2a');
      poly([P(l1+8,b1+10,H+72),P(l1+8,(b0+b1)/2,H+104),P(l1+8,b0-8,H+72)], shade('#8f7b58',.86));
      for(let i=0;i<5;i++)
        slab(l0+10+i*((l1-l0-20)/5), l0+10+(i+0.62)*((l1-l0-20)/5), H+30, H+54, b1-1, b1-7, '#3a2f22');
      poly([P(l0+6,b1,H+26),P(l1-6,b1,H+26),P(l1-6,b1+66,H+18),P(l0+6,b1+66,H+18)], '#a8916a');
      poly([P(l0+6,b1+66,H+18),P(l1-6,b1+66,H+18),P(l1-6,b1+66,H+12),P(l0+6,b1+66,H+12)], '#8f7b58');
      for(const aa of [l0+14, l1-14]){
        poly([P(aa-3,b1,H+26),P(aa+3,b1,H+26),P(aa+3,b1+60,H+19),P(aa-3,b1+60,H+19)], '#8f7b58');
        poly([P(aa-3,b1,H+8),P(aa-3,b1,H+26),P(aa-3,b1+50,H+20)], shade('#8f7b58',.8));
      }
      if(state.props){
        for(let i=0;i<5;i++){
          const ba = 18 + i*44, bb = i%2 ? b1+50 : -8, bz = (i%2 ? H+22 : H+12) + 8;
          const col = ['#c9ccd0','#8d949c','#e0e2e4','#a8adb2','#c9ccd0'][i];
          ball(ba, bb, bz, 7, col);
          ball(ba - 6, bb, bz + 5, 4.2, col);
          poly([P(ba+5,bb,bz+2),P(ba+15,bb,bz+5),P(ba+6,bb,bz-2)], shade(col,.86));
          poly([P(ba-10,bb,bz+6),P(ba-15,bb,bz+5),P(ba-10,bb,bz+4)], '#c2452e');
        }
      }
    }
    kerb(p,'none');
  }
},
{
  name:'Dance studio', tall:true,
  fTodo:'z104..114 return +7',
  zTodo:1.27,          // H 214 -- see SCALE REVIEW at the head of this file
  head:'External stair up the flank, mirrored upper floor',
  tags:['built external stair','mirror wall upstairs','tube barre','tall upper glazing','landing'],
  desc:'The stair is built from tread slabs on a stringer with tube handrails and posts, and the barre is a tube on real brackets in front of the mirror.',
  draw(p){
    const wall = '#c8b8c8', trim = '#4a3a52', H = 214;
    body(wall, trim, H);
    slab(0,W, H, H+10, -1, -12, trim);
    slab(0,W, 104, 114, -1, -7, trim);
    F(10,W-10, 124, 196, '#8fa0b0', shade(wall,.6), 3);
    F(16,W-16, 130, 190, '#c4cfd8', null,0,-1);
    for(let i=1;i<5;i++) F(10+(W-20)*i/5-2, 10+(W-20)*i/5+2, 124, 196, shade(wall,.62), null,0,-1.5);
    tube(20, -4, 152, W-20, -4, 152, 2, '#8a7a94');
    for(const aa of [30, W-30]) tube(aa, -1, 130, aa, -4, 152, 1.6, '#8a7a94');
    F(12,W*0.56, 20, 96, '#9aa8b4', shade(wall,.65), 3);
    shopDoor(W*0.71, wall, trim);
    F(W*0.65,W*0.77, 52, 92, '#9aa8b4', null,0,-6.5);
    if(state.props){
      const steps = 9;
      for(let i=0;i<steps;i++){
        const b0 = -18 - i*20, z = 8 + i*11;
        box(W+2, W+30, b0-20, b0, z-6, z, '#a3abb2','#9aa2a9','#8d949a');
      }
      // stringer and handrail
      tube(W+16, -18, 4, W+16, -18-steps*20, 4 + steps*11, 3, '#7d838a');
      tube(W+30, -18, 40, W+30, -18-steps*20, 40 + steps*11, 2.4, '#8d979f');
      for(let i=0;i<5;i++)
        tube(W+30, -18-i*36, 8+i*20, W+30, -18-i*36, 42+i*20, 1.6, '#8d979f');
      box(W+2, W+32, -70, -16, 101, 107, '#a3abb2','#9aa2a9','#8d949a');
      tube(W+32, -16, 143, W+32, -70, 143, 2.4, '#8d979f');
      for(let i=0;i<4;i++) tube(W+32, -20-i*16, 107, W+32, -20-i*16, 143, 1.6, '#8d979f');
      slab(W-14, W+2, 104, 176, -18, -26, trim);
    }
    if(state.roof) box(W*0.26,W*0.52,-150,-110,H,H+22,'#8f969d','#787f86','#697077');
    kerb(p,'none');
  }
},
{
  name:'Tattoo parlour', head:'Neon script, flash sheets, blacked front',
  fTodo:'z118..150 return +3',
  tags:['neon in the wall plane','framed flash sheets','black render','red glow','A-board'],
  desc:'The neon is drawn through points in the wall plane so the script leans with the fascia, and every flash sheet is a framed slab standing off the glass.',
  draw(p){
    const wall = '#1e1c22', trim = '#e0334a', H = 162;
    body(wall, trim, H);
    slab(0,W, H, H+12, -1, -14, shade(wall,2.2));
    F(10,W*0.68, 20, 112, '#141218', shade(wall,2.4), 3);
    for(let r=0;r<3;r++) for(let c=0;c<4;c++){
      const x0 = 16+(W*0.62-16)*(c+0.06)/4, x1 = 16+(W*0.62-16)*(c+0.94)/4, z0 = 26+r*28;
      slab(x0,x1, z0, z0+22, -1, -6, '#e8e2d4', shade(wall,2.0));
      F(x0+3,x1-3, z0+3, z0+19, ['#c2452e','#2f5f6b','#c9a24a','#6b4a7a'][(r+c)%4], null,0,-6.5);
    }
    shopDoor(W*0.85, wall, shade(wall,1.9), 'rgba(60,66,80,.55)');
    F(W*0.78,W-14, 54, 94, '#3a2a30', null,0,-6.5);
    slab(6,W-6, 118, 150, -1, -9, shade(wall,1.7));
    // neon script, sampled through world points in the fascia plane
    const nz = 134, nb = -10;
    const scriptPt = (t) => {
      const a = 16 + (W-32)*t;
      const z = nz + Math.sin(t*Math.PI*5)*15 - Math.sin(t*Math.PI*2)*4;
      return P(a, nb, z);
    };
    for(const [lw,col] of [[5*K, trim],[1.8,'rgba(255,180,190,.8)']]){
      ctx.strokeStyle=col; ctx.lineWidth=lw; ctx.lineJoin='round'; ctx.lineCap='round';
      ctx.beginPath();
      for(let i=0;i<=48;i++){ const q=scriptPt(i/48); i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y); }
      ctx.stroke();
    }
    ctx.lineCap='butt'; ctx.lineJoin='miter';
    if(state.props){
      poly([P(4,0,0),P(W-4,0,0),P(W-4,64,0),P(4,64,0)], 'rgba(224,51,74,.14)');
      poly([P(W*0.06,26,0),P(W*0.26,26,0),P(W*0.26,40,48),P(W*0.06,40,48)], '#141218');
      poly([P(W*0.06,54,0),P(W*0.26,54,0),P(W*0.26,40,48),P(W*0.06,40,48)], '#221f28');
      poly([P(W*0.26,26,0),P(W*0.26,54,0),P(W*0.26,40,48)], '#0e0c12');
      for(let i=0;i<3;i++)
        poly([P(W*0.09,27+i*2,10+i*12),P(W*0.23,27+i*2,10+i*12),
              P(W*0.23,34+i*2,13+i*12),P(W*0.09,34+i*2,13+i*12)], trim);
    }
    if(state.roof){
      box(W*0.50,W*0.76,-150,-110,H,H+24,'#3a3a44','#2e2e36','#26262c');
      cyl(W*0.22, -70, H+12, H+60, 2.5, '#4a4a54');
    }
    kerb(p,'none');
  }
},
{
  name:'Undertaker', tall:true,
  fTodo:'z162..178 return +10; z156..162 return +6; z122..152 return +1, lettering behind board',
  zTodo:1.06,          // H 178 -- see SCALE REVIEW at the head of this file
  head:'Sober black front, urn finials, drawn blinds',
  tags:['turned urns','half-drawn blinds','black and grey','deep cornice','restrained'],
  desc:'The urns are turned — foot, bowl, neck and lid — standing on plinths, and the blinds hang inside the reveal with a real bottom rail rather than being painted on the glass.',
  draw(p){
    const wall = '#22242a', trim = '#8d8f96', H = 178;
    body(wall, trim, H);
    slab(0,W, H, H+8, -1, -14, shade(wall,1.9));
    slab(0,W, H-16, H, -1, -10, shade(wall,1.5));
    slab(0,W, H-22, H-16, -1, -6, shade(wall,2.1));
    slab(8,W-8, 122, 152, -1, -9, shade(wall,1.4), null, trim);
    F(24,W-24, 130, 143, trim, null,0,-9.5);
    for(let i=0;i<2;i++){
      const x0 = i? W*0.52 : 12, x1 = i? W*0.86 : W*0.44;
      slab(x0-3,x1+3, 22, 108, -1, 10, shade(wall,1.6));
      F(x0,x1, 26, 104, '#3f4650', null,0, 8);
      F(x0,x1, 66, 104, '#6a6f78', null,0, 6);
      for(let k=0;k<4;k++) F(x0,x1, 70+k*9, 72+k*9, '#5c626a', null,0, 5.5);
      slab(x0,x1, 60, 66, 5, 9, '#8d8f96');
      F((x0+x1)/2-1.5,(x0+x1)/2+1.5, 26, 60, shade(wall,1.6), null,0, 5);
      faceCircle((x0+x1)/2, 4, 44, 8, '#8d8f96');
    }
    shopDoor(W*0.50, wall, shade(wall,1.3));
    if(state.roof){
      for(const aa of [W*0.10, W*0.50, W*0.90]){
        box(aa-13, aa+13, -14, 0, H+8, H+15, '#9a9ca2','#8f9198','#7c7e85');
        cyl(aa, -7, H+15, H+20, 5, '#9a9ca2');
        ball(aa, -7, H+28, 11, '#9a9ca2', '#adb0b6');
        cyl(aa, -7, H+36, H+40, 5, '#9a9ca2');
        slab(aa-14, aa+14, H+40, H+44, -1, -13, '#9a9ca2');
        ball(aa, -7, H+48, 4, '#8d8f96');
      }
      box(W*0.30,W*0.52,-150,-116,H,H+16,'#6a6f78','#5c626a','#4e545c');
    }
    kerb(p,'none');
  }
},
{
  name:'Model shop', head:'Biplane on a bracket, kites, tiny windows',
  fTodo:'z120..148 return +3, lettering behind board',
  tags:['biplane as a solid','kites in plane','small display panes','busy fascia','bright'],
  desc:'The biplane is built from a fuselage cylinder, two wing slabs, struts and a tail, banking on its bracket, and the kites hang in their own planes.',
  draw(p){
    const wall = '#2f5f8a', trim = '#f0e2c0', H = 160;
    body(wall, trim, H);
    slab(0,W, H, H+10, -1, -12, trim);
    slab(6,W-6, 120, 148, -1, -9, shade(wall,1.25), null, trim);
    F(20,W-20, 128, 140, trim, null,0,-9.5);
    F(10,W*0.70, 22, 108, '#1e3f5a', shade(wall,.6), 3);
    for(let r=0;r<3;r++) for(let c=0;c<5;c++){
      const x0 = 16+(W*0.64-16)*(c+0.06)/5, x1 = 16+(W*0.64-16)*(c+0.94)/5, z0 = 28+r*26;
      slab(x0,x1, z0, z0+20, -1, -5, '#7fb0c8');
      F(x0+3,x1-3, z0+3, z0+17, ['#c2452e','#e8c34a','#7ac48a','#f0e2c0','#e2748c'][(r+c)%5], null,0,-5.5);
    }
    shopDoor(W*0.86, wall, trim);
    F(W*0.80,W-14, 52, 90, '#7fb0c8', null,0,-6.5);
    if(state.props){
      for(let i=0;i<3;i++){
        const ka = W*0.16 + i*W*0.30, kb = -8 - i*3, kz = H-32;
        poly([P(ka,kb,kz+14),P(ka+10,kb,kz),P(ka,kb,kz-14),P(ka-10,kb,kz)],
             ['#e8564a','#7ac48a','#e8c34a'][i], trim, 1.5);
        tube(ka, kb, kz-14, ka, kb, kz-26, 0.6, trim);
      }
    }
    // biplane on a bracket, banking
    /* scaled up half again: correct but too small to read at street
       size was the note from the last pass */
    const pa = W*0.44, pb = 48, pz = 102;
    slab(pa-2, pa+2, 112, 124, 8, 12, '#8d979f');
    tube(pa, 10, 120, pa, pb, 112, 2.4, '#8d979f');
    cyl(pa, pb, pz-9, pz+9, 10, '#c2452e');
    poly([P(pa-45,pb,pz+3),P(pa+39,pb,pz+6),P(pa+39,pb,pz-6),P(pa-45,pb,pz-4)], '#c2452e');
    slab(pa-18, pa+33, pz+21, pz+27, pb+24, pb-24, '#f0e2c0');
    slab(pa-15, pa+30, pz-18, pz-12, pb+21, pb-21, '#f0e2c0');
    for(const sa of [pa-3, pa+21]){
      tube(sa, pb+18, pz-13, sa, pb+18, pz+22, 1.6, '#8d979f');
      tube(sa, pb-18, pz-13, sa, pb-18, pz+22, 1.6, '#8d979f');
    }
    poly([P(pa-45,pb,pz+3),P(pa-63,pb,pz+21),P(pa-60,pb,pz-2)], '#c2452e');
    slab(pa-57, pa-42, pz-12, pz-7, pb+13, pb-13, '#c2452e');
    slab(pa+40, pa+45, pz-21, pz+21, pb+3, pb-3, '#3a4046');
    if(state.roof) box(W*0.60,W*0.86,-150,-110,H,H+20,'#8f969d','#787f86','#697077');
    kerb(p,'none');
  }
},
{
  name:'Goods depot', head:'Raised loading dock, dock stairs, roller bays',
  cTodo:'16 pavement props need collision volumes, 46 of them lapping past the frontage',
  fTodo:'z128..150 return +3, lettering behind board',
  tags:['raised dock platform','dock stairs','twin roller bays','pallets','bollards'],
  desc:'The dock is a platform with a bumper strip and a proper edge, the stairs are tread boxes on a stringer with a handrail, and the bollards are cylinders with painted bands.',
  draw(p){
    const wall = '#5a6068', trim = '#e8a13a', H = 172, DOCK = 34;
    body(wall, trim, H);
    slab(0,W, H, H+10, -1, -12, trim);
    slab(6,W-6, 128, 150, -1, -9, shade(wall,1.25), null, trim);
    F(20,W-20, 134, 145, trim, null,0,-9.5);
    T(-10, W+10, 0, 54, DOCK, '#9aa0a6');
    F(-10, W+10, DOCK-12, DOCK, '#7d838a', shade(wall,.7), 2, 54);
    F(-10, W+10, 0, DOCK-12, '#6a7076', null,0, 54);
    for(let i=0;i<9;i++) F(-10+(W+20)*i/9, -10+(W+20)*i/9+4, 0, DOCK-12, '#5e646b', null,0, 53.5);
    for(let i=0;i<7;i++) box(-6+(W+12)*i/7, -6+(W+12)*i/7+22, 54, 58, DOCK-16, DOCK-8, '#2b2f33','#3a4046','#22262a');
    /* third building with no way in on foot, after the Garage and the
       Fire station. Bays pulled back and a personnel door added -- on
       the dock, not the pavement, which is what the base argument is
       for. */
    const bayR = W*0.68;
    for(let i=0;i<2;i++){
      const x0 = 14+i*(bayR-28)/2+(i?8:0), x1 = 14+(i+1)*(bayR-28)/2-(i?0:8);
      F(x0-5,x1+5, DOCK, 120, shade(wall,.74), null,0, 1);
      F(x0,x1, DOCK, 112, '#8c9298', shade(wall,1.3), 2, -1);
      for(let j=0;j<6;j++) F(x0+2, x1-2, DOCK+6+j*12, DOCK+12+j*12, '#a2a8ae', null,0,-2);
      slab(x0-5,x1+5, 112, 120, -2, -9, trim);
    }
    shopDoor(W*0.86, wall, trim, null, W, DOCK);
    if(state.props){
      for(let i=0;i<4;i++){
        const z = DOCK - i*9;
        box(W+12, W+46, 54+i*13, 54+i*13+13, z-9, z, '#9aa0a6','#8d949a','#7d838a');
      }
      tube(W+46, 54, DOCK+34, W+46, 106, 4, 2.4, '#8d979f');
      for(let i=0;i<4;i++) tube(W+46, 58+i*13, DOCK-i*9, W+46, 58+i*13, DOCK-i*9+30, 1.6, '#8d979f');
      for(let i=0;i<2;i++){
        box(24+i*70, 70+i*70, 10, 44, DOCK, DOCK+10, '#a8834a','#8f6c3f','#7a5c36');
        box(28+i*70, 66+i*70, 14, 40, DOCK+10, DOCK+34, '#c9b48e','#b09a72','#96825f');
      }
      for(let i=0;i<3;i++){
        const ba = 20 + i*72;
        cyl(ba, 78, 0, 30, 6, trim);
        F(ba-6,ba+6, 20, 25, '#2b2f33', null,0, 72);
        ball(ba, 78, 30, 6, shade(trim,1.1));
      }
    }
    if(state.roof) box(W*0.34,W*0.66,-150,-104,H,H+26,'#8f969d','#787f86','#697077');
    kerb(p,'none');
  }
},
{
  name:'Apothecary', head:'Herb bunches hung under the fascia, jar wall',
  fTodo:'z120..148 return +3, lettering behind board',
  tags:['hanging herb bunches','lidded jars','mortar sign','dark timber','small panes'],
  desc:'Every jar on the wall is a turned glass with a stopper, and the herb bunches hang from real cords with the stems bound and the leaves falling around them.',
  draw(p){
    const wall = '#3f4a3a', trim = '#d8c8a0', H = 166;
    body(wall, trim, H);
    slab(0,W, H, H+8, -1, -12, shade(wall,.7));
    slab(6,W-6, 120, 148, -1, -9, shade(wall,1.25), null, trim);
    F(22,W-22, 128, 140, trim, null,0,-9.5);
    F(10,W*0.66, 22, 104, '#26301f', shade(wall,.6), 3);
    for(let r=0;r<3;r++){
      const z = 30+r*24;
      slab(14,W*0.63, z-3, z, -1, 14, '#5a4a34');
      for(let i=0;i<6;i++){
        const ja = 22+i*20, col = ['#c9a24a','#8fa86a','#c2807e','#7a9ab0','#d8c8a0','#a8834a'][(r+i)%6];
        cyl(ja, 5, z, z+16, 7, col);
        plateCircle(ja, 5, z+16, 7, shade(col,1.25));
        cyl(ja, 5, z+16, z+20, 4, '#e8e2d0');
      }
    }
    for(let i=1;i<5;i++) F(10+(W*0.66-10)*i/5-1.6, 10+(W*0.66-10)*i/5+1.6, 22, 104, shade(wall,1.3), null,0,-1);
    shopDoor(W*0.84, wall, trim);
    F(W*0.76,W-14, 54, 92, '#6a7a5a', null,0,-6.5);
    // mortar and pestle, turned
    const ma = W*0.86, mb = -10, mz = 126;
    cyl(ma, mb, mz-8, mz-4, 8, shade(trim,.8));
    cyl(ma, mb, mz-4, mz+12, 14, trim);
    plateCircle(ma, mb, mz+12, 14, shade(trim,1.15), shade(trim,.8), 1.5);
    tube(ma+4, mb, mz+10, ma+14, mb, mz+26, 3, shade(trim,.9));
    ball(ma+14, mb, mz+26, 4, trim);
    if(state.props){
      for(let i=0;i<6;i++){
        const ha = 16 + i*((W-40)/6), hb = 26;
        tube(ha, hb, 120, ha, hb, 110, 0.8, '#8a7a52');
        cyl(ha, hb, 100, 110, 3, '#8a7a52');
        const col=['#6a8a4a','#8fa86a','#5a7a3a','#7a9a5a','#6a8a4a','#96a86a'][i];
        for(let k=0;k<5;k++){
          const a = -0.9 + k*0.45;
          poly([P(ha, hb, 102),
                P(ha + 9*Math.sin(a), hb + 4*Math.cos(a), 88),
                P(ha + 5*Math.sin(a), hb + 2*Math.cos(a), 74)], col);
        }
      }
    }
    if(state.roof) box(W*0.30,W*0.54,-140,-104,H,H+20,'#8f969d','#787f86','#697077');
    kerb(p,'none');
  }
},
{
  name:'Apartments over shop', tall:true,
  fTodo:'z100..110 return +7; z196..206 return +7; z92..100 return +2',
  zTodo:1.79,          // H 300 -- see SCALE REVIEW at the head of this file
  head:'Three storeys, iron balconies, washing lines',
  tags:['3 storey','built balconies','washing lines','shutters','shop below'],
  desc:'Each balcony is a stone floor slab with tube standards and a handrail, and the shutters stand off the reveal on their own thickness so they read as hinged open.',
  draw(p){
    const wall = '#d8b98a', trim = '#7a5a3a', H = 300;
    body(wall, trim, H);
    slab(0,W, H, H+12, -1, -14, shade(wall,.66));
    slab(0,W, 100, 110, -1, -7, shade(wall,.78));
    slab(0,W, 196, 206, -1, -7, shade(wall,.78));
    for(let fl=0; fl<2; fl++){
      const z0 = 122 + fl*96;
      for(let i=0;i<3;i++){
        const x0 = 14+(W-28)*(i+0.12)/3, x1 = 14+(W-28)*(i+0.88)/3;
        slab(x0-4,x1+4, z0-4, z0+62, -1, -8, shade(wall,1.08));
        F(x0,x1, z0, z0+58, '#4a5f6b', null,0,-8.5);
        F(x0,x1, z0+28, z0+31, shade(wall,1.08), null,0,-9);
        if(fl===1) for(const sx of [x0-11, x1+1])
          slab(sx, sx+10, z0, z0+58, -9, -15, ['#6b8a5a','#8a6b5a','#6b8a5a'][i], shade(wall,.6));
      }
    }
    for(let i=0;i<3;i++){
      const x0 = 10+(W-20)*(i+0.06)/3, x1 = 10+(W-20)*(i+0.94)/3;
      box(x0, x1, 0, 26, 112, 118, shade(wall,.94), shade(wall,.86), shade(wall,.72));
      tube(x0, 24, 146, x1, 24, 146, 1.8, '#3c3a36');
      for(let k=0;k<9;k++) tube(x0+(x1-x0)*k/8, 24, 118, x0+(x1-x0)*k/8, 24, 146, 0.9, '#3c3a36');
      tube(x0, 24, 118, x1, 24, 118, 1.2, '#3c3a36');
    }
    F(10,W*0.62, 20, 88, '#7f93a0', shade(wall,.6), 3);
    shopDoor(W*0.83, wall, trim);
    F(W*0.72,W-14, 48, 82, '#7f93a0', null,0,-6.5);
    slab(6,W-6, 92, 100, -1, -8, trim);
    if(state.props){
      for(let i=0;i<2;i++){
        const a0 = 10+(W-20)*(i+0.94)/3, a1 = 10+(W-20)*(i+1.06)/3;
        const s0=P(a0,22,150), s1=P(a1,22,150);
        ctx.strokeStyle='#c9c2b0'; ctx.lineWidth=1.6;
        ctx.beginPath(); ctx.moveTo(s0.x,s0.y);
        ctx.quadraticCurveTo((s0.x+s1.x)/2,(s0.y+s1.y)/2+12*K,s1.x,s1.y); ctx.stroke();
      }
      const l0=P(16,24,268), l1=P(W-16,24,268);
      ctx.strokeStyle='#c9c2b0'; ctx.lineWidth=1.6;
      ctx.beginPath(); ctx.moveTo(l0.x,l0.y);
      ctx.quadraticCurveTo((l0.x+l1.x)/2,(l0.y+l1.y)/2+22*K,l1.x,l1.y); ctx.stroke();
      for(let i=0;i<7;i++){
        const t=(i+0.5)/7, a = 16 + (W-32)*t;
        const sag = 268 - Math.sin(Math.PI*t)*22;
        slab(a-7, a+7, sag-22, sag, 25, 23,
             ['#e8e2d4','#7fb0c4','#e2748c','#f0e2c0','#8fb48a','#e8e2d4','#c9a24a'][i]);
      }
    }
    if(state.roof) box(W*0.30,W*0.56,-150,-110,H,H+22,'#9aa0a6','#7d838a','#6a7076');
    kerb(p,'none');
  }
},
{
  name:'Department store', tall:true,
  cTodo:'3 pavement props need collision volumes',
  fTodo:'z292..314 return +10; z128..134 return +1; z212..218 return +1',
  zTodo:1.87,          // H 314 -- see SCALE REVIEW at the head of this file
  head:'Three storeys, corner turret, deep canopy, flags',
  tags:['3 storey','turret on a drum','flagpoles','deep canopy','grid glazing'],
  desc:'The turret is a round drum with a proper dome and a finial, the canopy is a full wedge on round posts, and the mannequins in the window are turned bodies with ball heads.',
  draw(p){
    const wall = '#c9c2b4', trim = '#7a3b46', H = 314;
    body(wall, trim, H);
    slab(0,W, H, H+14, -1, -16, trim);
    slab(0,W, H-22, H, -1, -10, shade(wall,1.06));
    for(let fl=0; fl<2; fl++){
      const z0 = 136 + fl*84;
      slab(6,W-6, z0-8, z0-2, -1, -7, shade(wall,.86));
      for(let i=0;i<4;i++){
        const x0 = 12+(W-24)*(i+0.08)/4, x1 = 12+(W-24)*(i+0.92)/4;
        slab(x0-3,x1+3, z0, z0+62, -1, -8, shade(wall,1.08));
        F(x0,x1, z0+4, z0+58, '#8fa8b8', null,0,-8.5);
        for(let k=1;k<3;k++) F(x0+(x1-x0)*k/3-1.5, x0+(x1-x0)*k/3+1.5, z0+4, z0+58, shade(wall,1.08), null,0,-9);
        F(x0,x1, z0+30, z0+33, shade(wall,1.08), null,0,-9);
      }
    }
    F(8,W-8, 20, 108, '#8fa8b8', shade(wall,.62), 3);
    shopDoor(W*0.50, wall, trim);      // 214 of glazing with no way through it
    for(let k=1;k<6;k++) F(8+(W-16)*k/6-3, 8+(W-16)*k/6+3, 20, 108, shade(wall,.8), null,0,-1);
    for(let i=0;i<5;i++){
      const ma = 24+i*40, col = ['#7a3b46','#3f6b6b','#c9a24a','#4a4f6b','#8a5a6a'][i];
      cyl(ma, 6, 30, 40, 4, shade(wall,.8));
      cyl(ma, 6, 40, 78, 7, col);
      ball(ma, 6, 86, 6, '#e8ddc8');
    }
    const out = 52;
    poly([P(-6,0,120),P(W+6,0,120),P(W+6,out,108),P(-6,out,108)], trim);
    poly([P(-6,out,108),P(W+6,out,108),P(W+6,out,96),P(-6,out,96)], shade(trim,.75));
    poly([P(-6,0,110),P(W+6,0,110),P(W+6,out,96),P(-6,out,96)], shade(wall,1.1));
    poly([P(-6,0,120),P(-6,out,108),P(-6,out,96),P(-6,0,110)], shade(trim,.6));
    poly([P(W+6,0,120),P(W+6,out,108),P(W+6,out,96),P(W+6,0,110)], shade(trim,.6));
    for(const aa of [4, W*0.5, W-4]) cyl(aa, out-4, 0, 106, 4, '#8d979f');
    if(state.roof){
      /* narrower drum, deeper dome: at the old proportion it read as a
         water tank rather than a turret */
      const ta = W*0.14, tb = -60;
      cyl(ta, tb, H+14, H+62, 25, shade(wall,1.04));
      for(let i=0;i<2;i++) F(ta-14+i*17, ta-5+i*17, H+26, H+52, '#8fa8b8', null,0, tb-24);
      plateCircle(ta, tb, H+62, 27, shade(trim,1.1), shade(trim,.8), 2);
      const c=P(ta,tb,H+62);
      ctx.beginPath();
      ctx.moveTo(c.x-28*K,c.y);
      ctx.bezierCurveTo(c.x-30*K,c.y-46*K, c.x+30*K,c.y-46*K, c.x+28*K,c.y);
      ctx.closePath(); ctx.fillStyle=trim; ctx.fill();
      ctx.strokeStyle=shade(trim,.7); ctx.lineWidth=2; ctx.stroke();
      cyl(ta, tb, H+104, H+132, 2.4, '#c9a24a');
      ball(ta, tb, H+138, 5, '#c9a24a');
      for(let i=0;i<3;i++){
        const fa = W*0.42 + i*W*0.20;
        cyl(fa, -10, H+14, H+72, 2.4, '#c9ccd0');
        poly([P(fa+2,-10,H+72),P(fa+30,-10,H+64),P(fa+30,-10,H+48),P(fa+2,-10,H+54)],
             ['#7a3b46','#c9a24a','#3f6b6b'][i]);
      }
      box(W*0.60,W*0.90,-170,-130,H,H+22,'#8f969d','#787f86','#697077');
    }
    kerb(p,'none');
  }
},
{
  name:'Chambers', tall:true,
  cTodo:'10 pavement props need collision volumes, 5 of them lapping past the frontage',
  fTodo:'z274..292 return +10; z90..96 return +7; z156..162 return +7; z222..228 return +7',
  zTodo:1.74,          // H 292 -- see SCALE REVIEW at the head of this file
  head:'Three storeys of sash windows, brass plaques',
  tags:['3 storey','sash windows','brass plaques','stone cills','area railings'],
  desc:'Every cill is a stone slab with a return, the plaques stand off the wall, and the area railings are round standards with a proper top rail and finials.',
  draw(p){
    const wall = '#b9b0a0', trim = '#3f4a52', H = 292;
    body(wall, trim, H);
    slab(0,W, H, H+12, -1, -14, shade(wall,.72));
    slab(0,W, H-18, H, -1, -10, shade(wall,1.08));
    for(let fl=0; fl<3; fl++){
      const z0 = 104 + fl*66;
      slab(0,W, z0-14, z0-8, -1, -7, shade(wall,.88));
      for(let i=0;i<4;i++){
        const x0 = 12+(W-24)*(i+0.14)/4, x1 = 12+(W-24)*(i+0.86)/4, hh = fl===2 ? 40 : 48;
        slab(x0-4,x1+4, z0-3, z0+hh+3, -1, -9, shade(wall,1.1));
        F(x0,x1, z0, z0+hh, '#5f7280', null,0,-9.5);
        F(x0,x1, z0+hh/2-1.5, z0+hh/2+1.5, shade(wall,1.14), null,0,-10);
        F(x0+(x1-x0)/2-1.5, x0+(x1-x0)/2+1.5, z0, z0+hh, shade(wall,1.14), null,0,-10);
        slab(x0-6,x1+6, z0-8, z0-3, -1, -13, shade(wall,.92));
      }
    }
    shopDoor(W*0.52, wall, trim);
    F(W*0.45,W*0.59, 12, 88, '#5f7280', null,0,-8.5);
    slab(W*0.40,W*0.64, 96, 104, -1, -10, shade(wall,1.1));
    for(let i=0;i<2;i++) F(i? W*0.70 : 12, i? W-12 : W*0.32, 26, 88, '#5f7280', shade(wall,.7), 2);
    if(state.props){
      for(let i=0;i<4;i++) slab(W*0.65, W*0.685, 40+i*15, 52+i*15, -1, -5, '#c9a24a', shade(wall,.6));
      tube(-4, 40, 26, W*0.34, 40, 26, 1.6, '#3c3a36');
      for(let i=0;i<10;i++){
        const ra = -4+(W*0.34+4)*i/9;
        cyl(ra, 40, 0, 26, 1.4, '#3c3a36');
        ball(ra, 40, 28, 2.2, '#3c3a36');
      }
    }
    if(state.roof){
      box(W*0.20,W*0.42,-150,-110,H,H+40,'#8a7a6a','#75665a','#645749');
      for(const ca of [W*0.24, W*0.34]) cyl(ca, -130, H+40, H+56, 5, '#4a4038');
    }
    kerb(p,'none');
  }
},
{
  name:'Grand hotel', tall:true,
  cTodo:'2 pavement props need collision volumes',
  fTodo:'z276..296 return +10',
  zTodo:1.76,          // H 296 -- see SCALE REVIEW at the head of this file
  head:'Three storeys, vertical HOTEL sign, entrance awning',
  tags:['3 storey','projecting sign box','bowed awning','juliet rails','corner quoins'],
  desc:'The sign is a box hung clear of the corner on brackets, the entrance awning is bowed with a valance and round posts, and the juliet rails are turned standards on stone cills.',
  draw(p){
    const wall = '#e0d6c2', trim = '#8a2f3c', H = 296;
    body(wall, trim, H);
    slab(0,W, H, H+12, -1, -14, trim);
    slab(0,W, H-20, H, -1, -10, shade(wall,1.05));
    for(let i=0;i<3;i++){
      slab(0, 18, 110+i*60, 140+i*60, -1, -7, shade(wall,.88));
      slab(W-18, W, 110+i*60, 140+i*60, -1, -7, shade(wall,.88));
    }
    for(let fl=0; fl<3; fl++){
      const z0 = 112 + fl*62;
      for(let i=0;i<4;i++){
        const x0 = 24+(W-48)*(i+0.12)/4, x1 = 24+(W-48)*(i+0.88)/4;
        slab(x0-3,x1+3, z0-3, z0+47, -1, -8, shade(wall,1.08));
        F(x0,x1, z0, z0+44, '#5a6f7a', null,0,-8.5);
        F(x0,x1, z0+21, z0+24, shade(wall,1.08), null,0,-9);
        if(fl===0){
          box(x0-5,x1+5, 0, 14, z0-6, z0-2, shade(wall,.94), shade(wall,.86), shade(wall,.74));
          tube(x0-4, 12, z0+16, x1+4, 12, z0+16, 1.4, '#3a3430');
          for(let k=0;k<8;k++) cyl(x0-4+(x1-x0+8)*k/7, 12, z0-2, z0+16, 0.8, '#3a3430');
        }
      }
    }
    F(10,W*0.40, 22, 94, '#7f93a0', shade(wall,.62), 3);
    F(W*0.62,W-10, 22, 94, '#7f93a0', shade(wall,.62), 3);
    shopDoor(W*0.51, wall, trim);
    F(W*0.46,W*0.56, 14, 90, '#5a6f7a', null,0,-8.5);
    const az = 108, ao = 46;
    ctx.beginPath();
    const al=P(W*0.36,0,az), ar=P(W*0.66,0,az), am=P(W*0.51,ao,az-16);
    ctx.moveTo(al.x,al.y);
    ctx.quadraticCurveTo(am.x, am.y-16*K, ar.x, ar.y);
    ctx.quadraticCurveTo(am.x, am.y+2*K, al.x, al.y);
    ctx.closePath(); ctx.fillStyle=trim; ctx.fill();
    ctx.strokeStyle=shade(trim,.7); ctx.lineWidth=2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(al.x,al.y+2);
    ctx.quadraticCurveTo(am.x, am.y+12*K, ar.x, ar.y+2);
    ctx.quadraticCurveTo(am.x, am.y+4*K, al.x, al.y+2);
    ctx.closePath(); ctx.fillStyle=shade(trim,.6); ctx.fill();
    for(const aa of [W*0.37, W*0.65]) cyl(aa, ao-4, 0, az-16, 3, '#c9a24a');
    const sa = W*0.06;
    tube(sa, -2, 268, sa, -24, 268, 2.4, '#c9a24a');
    tube(sa, -2, 140, sa, -24, 140, 2.4, '#c9a24a');
    slab(sa-16, sa+16, 132, 276, -26, -42, trim, shade(wall,.6), shade(trim,1.2));
    for(let i=0;i<5;i++) F(sa-10, sa+10, 146+i*26, 168+i*26, '#f0e2c8', null,0,-26.5);
    slab(sa-19, sa+19, 276, 284, -25, -43, '#c9a24a');
    slab(sa-19, sa+19, 124, 132, -25, -43, '#c9a24a');
    if(state.roof){
      box(W*0.36,W*0.62,-160,-120,H,H+26,'#8f969d','#787f86','#697077');
      cyl(W*0.82, -40, H+12, H+70, 2.4, '#c9ccd0');
    }
    kerb(p,'none');
  }
},
{
  name:'School', tall:true,
  cTodo:'19 pavement props need collision volumes, 10 of them lapping past the frontage',
  fTodo:'z106..112 return +7; z188..194 return +7',
  zTodo:1.71,          // H 288 -- see SCALE REVIEW at the head of this file
  head:'Three storeys of tall windows, bellcote, railings',
  tags:['3 storey','tall classroom windows','turned bell','railed yard','plaque'],
  desc:'The bellcote is a solid with a gabled cap and the bell is turned inside it, and the yard railings are round standards with a top rail and gate posts.',
  draw(p){
    const wall = '#b06a4a', trim = '#e0d6c2', H = 288;
    body(wall, trim, H);
    slab(0,W, H, H+12, -1, -14, shade(wall,.68));
    for(let r=0;r<12;r++) F(0,W, 6+r*24, 9+r*24, shade(wall,.9), null,0,-1);
    for(let fl=0; fl<3; fl++){
      const z0 = 34 + fl*82;
      slab(0,W, z0-10, z0-4, -1, -7, shade(wall,.78));
      for(let i=0;i<3;i++){
        const x0 = 14+(W-28)*(i+0.10)/3, x1 = 14+(W-28)*(i+0.90)/3;
        slab(x0-5,x1+5, z0-4, z0+70, -1, -9, trim);
        F(x0,x1, z0, z0+64, '#6a8494', null,0,-9.5);
        for(let k=1;k<3;k++) F(x0+(x1-x0)*k/3-2, x0+(x1-x0)*k/3+2, z0, z0+64, trim, null,0,-10);
        for(let k=1;k<4;k++) F(x0,x1, z0+64*k/4-2, z0+64*k/4+2, trim, null,0,-10);
      }
    }
    shopDoor(W*0.50, wall, trim);
    F(W*0.43,W*0.57, 10, 88, '#4a5a64', null,0,-8.5);
    slab(W*0.36,W*0.64, 96, 108, -1, -10, trim);
    slab(W*0.42,W*0.58, 262, 278, -1, -7, trim);
    if(state.props){
      tube(-6, 44, 26, W+6, 44, 26, 2, '#3c4a44');
      for(let i=0;i<16;i++){
        cyl(-6+(W+12)*i/15, 44, 0, 30, 1.5, '#3c4a44');
        ball(-6+(W+12)*i/15, 44, 32, 2.2, '#3c4a44');
      }
      for(const aa of [-6, W*0.5, W+6]) cyl(aa, 44, 0, 44, 3.5, '#3c4a44');
    }
    if(state.roof){
      const ba = W*0.50, bb = -70;
      slab(ba-24, ba+24, H+12, H+64, bb+16, bb-16, shade(wall,.9), shade(wall,.7), shade(wall,1.05));
      F(ba-14, ba+14, H+24, H+56, '#3a3026', null,0, bb+15.5);
      cyl(ba, bb, H+46, H+54, 8, '#c9a24a');
      ball(ba, bb, H+46, 8, '#c9a24a', '#d8b45e');
      ball(ba, bb, H+38, 3, '#8f6f26');
      poly([P(ba-30,bb+16,H+64),P(ba,bb+16,H+96),P(ba+30,bb+16,H+64)], shade(wall,.62));
      poly([P(ba+30,bb+16,H+64),P(ba,bb+16,H+96),P(ba,bb-16,H+96),P(ba+30,bb-16,H+64)], shade(wall,.52));
      box(W*0.16,W*0.34,-160,-124,H,H+44,shade(wall,.9),shade(wall,.75),shade(wall,.66));
      for(const ca of [W*0.20, W*0.30]) cyl(ca, -142, H+44, H+58, 5, '#4a3a30');
    }
    kerb(p,'none');
  }
},
{
  name:'Warehouse loft', tall:true,
  zTodo:1.81,          // H 304 -- see SCALE REVIEW at the head of this file
  head:'Stacked loading doors, hoist beam, brick',
  tags:['3 storey','stacked loading doors','gantry hoist','brick pier bays','hanging crate'],
  desc:'The gantry is a boxed beam on a post with a diagonal brace, the hook hangs plumb on a chain, and the crate slung under it is a real box with banding.',
  draw(p){
    const wall = '#8a5a4a', trim = '#4a3a30', H = 304;
    body(wall, trim, H);
    slab(0,W, H, H+14, -1, -16, shade(wall,.66));
    for(let i=0;i<4;i++) slab(6+(W-12)*i/3-10, 6+(W-12)*i/3+10, 0, H, -1, -7, shade(wall,1.1));
    for(let fl=0; fl<3; fl++){
      const z0 = 30 + fl*88;
      for(let i=0;i<3;i++){
        const x0 = 6+(W-12)*i/3+14, x1 = 6+(W-12)*(i+1)/3-14;
        /* the ground floor was three bays -- two windows and a loading
           door -- with no pedestrian entrance anywhere on the building.
           The right-hand ground bay becomes the way in. */
        if(fl===0 && i===2){ shopDoor((x0+x1)/2, wall, trim); continue; }
        if(i===1){
          F(x0-6,x1+6, z0-6, z0+68, shade(wall,.72), null,0,-1);
          slab(x0,x1, z0, z0+62, -2, -9, '#6a5442', trim);
          F(x0+(x1-x0)/2-2, x0+(x1-x0)/2+2, z0, z0+62, trim, null,0,-2.5);
          for(let k=0;k<3;k++) F(x0+3,x1-3, z0+8+k*18, z0+14+k*18, '#7c644e', null,0,-2.5);
        } else {
          slab(x0-4,x1+4, z0-4, z0+66, -1, -8, shade(wall,1.06));
          F(x0,x1, z0, z0+62, '#5a6a72', null,0,-8.5);
          for(let k=1;k<4;k++) F(x0+(x1-x0)*k/4-1.6, x0+(x1-x0)*k/4+1.6, z0, z0+62, shade(wall,1.12), null,0,-9);
          for(let k=1;k<4;k++) F(x0,x1, z0+62*k/4-1.6, z0+62*k/4+1.6, shade(wall,1.12), null,0,-9);
        }
      }
    }
    slab(W*0.06,W*0.24, 0, 26, -1, -7, trim);
    if(state.roof){
      const ha = W*0.50;
      slab(ha-9, ha+9, H+14, H+40, -2, -18, trim, shade(wall,.7), shade(trim,1.3));
      poly([P(ha-9,-2,H+40),P(ha+9,-2,H+40),P(ha+9,72,H+30),P(ha-9,72,H+30)], shade(trim,1.5));
      poly([P(ha+9,-2,H+40),P(ha+9,72,H+30),P(ha+9,72,H+18),P(ha+9,-2,H+28)], shade(trim,1.1));
      poly([P(ha-9,-2,H+40),P(ha-9,72,H+30),P(ha-9,72,H+18),P(ha-9,-2,H+28)], shade(trim,.8));
      tube(ha, 30, H+24, ha, -2, H+2, 3, shade(trim,1.2));
      tube(ha, 66, H+22, ha, 66, H-16, 1.6, '#5a6068');
      box(ha-18, ha+18, 48, 84, H-52, H-16, '#a8834a','#8f6c3f','#7a5c36');
      for(const bz of [H-44, H-26]) slab(ha-19, ha+19, bz, bz+4, 47, 85, '#6f5430');
      box(W*0.10,W*0.30,-170,-130,H,H+22,'#8f969d','#787f86','#697077');
    }
    kerb(p,'none');
  }
},
{
  name:'Library', tall:true,
  cTodo:'3 pavement props need collision volumes',
  fTodo:'z250..268 return +10; z110..122 return +8',
  zTodo:1.6,          // H 268 -- see SCALE REVIEW at the head of this file
  head:'Tall arched upper windows, entrance steps',
  tags:['2 storey','swept arch heads','entrance steps','stone pilasters','plaque'],
  desc:'The arch heads are swept bands with a real reveal so the reading-room windows sit inside the wall, and the pilasters between them stand proud with capitals.',
  draw(p){
    const wall = '#d2cbb8', trim = '#5a5a4a', H = 268;
    body(wall, trim, H);
    slab(0,W, H, H+12, -1, -14, shade(wall,.74));
    slab(0,W, H-18, H, -1, -10, shade(wall,1.06));
    slab(0,W, 110, 122, -1, -8, shade(wall,.86));
    shopDoor(W*0.50, wall, trim);      // ground floor was blank wall
    for(let i=0;i<4;i++){
      const x0 = 12+(W-24)*(i+0.12)/4, x1 = 12+(W-24)*(i+0.88)/4;
      F(x0-4,x1+4, 130, 216, shade(wall,1.08), null,0,-1);
      F(x0,x1, 134, 212, '#6d8494', null,0,-6);
      const ap = (t,bb) => {
        const u=1-t, a = u*u*(x0-4) + 2*u*t*((x0+x1)/2) + t*t*(x1+4);
        const z = u*u*216 + 2*u*t*258 + t*t*216;
        return P(a,bb,z);
      };
      ctx.beginPath(); let q=ap(0,-1); ctx.moveTo(q.x,q.y);
      for(let k=1;k<=12;k++){ q=ap(k/12,-1); ctx.lineTo(q.x,q.y); }
      ctx.closePath(); ctx.fillStyle=shade(wall,1.08); ctx.fill();
      for(let k=0;k<12;k++) poly([ap(k/12,-1),ap((k+1)/12,-1),ap((k+1)/12,-7),ap(k/12,-7)], shade(wall,.92));
      const ip = (t,bb) => {
        const u=1-t, a = u*u*x0 + 2*u*t*((x0+x1)/2) + t*t*x1;
        const z = u*u*212 + 2*u*t*248 + t*t*212;
        return P(a,bb,z);
      };
      ctx.beginPath(); q=ip(0,-6); ctx.moveTo(q.x,q.y);
      for(let k=1;k<=12;k++){ q=ip(k/12,-6); ctx.lineTo(q.x,q.y); }
      ctx.closePath(); ctx.fillStyle='#6d8494'; ctx.fill();
      F(x0+(x1-x0)/2-2, x0+(x1-x0)/2+2, 134, 240, shade(wall,1.12), null,0,-6.5);
      for(let k=1;k<4;k++) F(x0,x1, 134+78*k/4-1.8, 134+78*k/4+1.8, shade(wall,1.12), null,0,-6.5);
    }
    for(let i=0;i<5;i++)
      slab(12+(W-24)*i/4-6, 12+(W-24)*i/4+6, 122, 246, -1, -12, shade(wall,.94));
    for(let i=0;i<5;i++)
      slab(12+(W-24)*i/4-9, 12+(W-24)*i/4+9, 246, 254, -1, -14, shade(wall,1.06));
    slab(W*0.40,W*0.60, 26, 104, 0, -8, trim, null, shade(wall,1.1));
    F(W*0.43,W*0.57, 36, 96, '#6d8494', null,0,-8.5);
    for(let i=0;i<2;i++) F(i? W*0.70 : 14, i? W-14 : W*0.30, 40, 92, '#6d8494', shade(wall,.72), 2);
    slab(W*0.34,W*0.66, 104, 110, -1, -10, shade(wall,1.1));
    if(state.props){
      box(W*0.32,W*0.68, 0, 30, 0, 10, shade(wall,1.02), shade(wall,.86), shade(wall,.76));
      box(W*0.35,W*0.65, 0, 22, 10, 20, shade(wall,1.04), shade(wall,.88), shade(wall,.78));
      box(W*0.38,W*0.62, 0, 14, 20, 26, shade(wall,1.06), shade(wall,.9), shade(wall,.8));
    }
    if(state.roof) box(W*0.24,W*0.48,-160,-120,H,H+22,'#8f969d','#787f86','#697077');
    kerb(p,'none');
  }
},
{
  name:'Car park', tall:true,
  zTodo:1.73,          // H 290 -- see SCALE REVIEW at the head of this file
  head:'Three open decks, spiral ramp, no walls',
  tags:['3 open decks','helical ramp','round columns','cars with wheels','structural'],
  desc:'The ramp is a helix of real treads with an outer edge beam and a centre column, the deck columns are cylinders, and the cars have bodies, cabins and wheels.',
  draw(p){
    const wall = '#9aa0a6', trim = '#6a7076', H = 290;
    T(0,W,-D,0,H, shade(trim,1.05));
    S(W,-D,0,0,H, 'rgba(120,127,134,.35)');
    for(let fl=0; fl<3; fl++){
      const z0 = 12 + fl*90;
      T(0,W,-D,0,z0, '#8d949a');
      slab(0,W, z0, z0+16, -1, -D, wall, shade(trim,.9));
      slab(0,W, z0+16, z0+22, -1, -6, trim);
      for(let i=0;i<5;i++) cyl(W*i/4, -18, z0+22, z0+90, 6, wall);
      for(let i=0;i<3;i++){
        const ca = 26 + i*74, cb = -26, col = ['#c2452e','#3f6b8a','#c9a24a'][(i+fl)%3];
        box(ca-26, ca+26, cb-16, cb+16, z0+22, z0+44, col, shade(col,.85), shade(col,.7));
        box(ca-15, ca+13, cb-13, cb+13, z0+44, z0+58, shade(col,.75), shade(col,.65), shade(col,.55));
        for(const [wa,wb] of [[ca-17,cb+16],[ca+17,cb+16]])
          faceCircle(wa, wb, z0+26, 5, '#2b2f33');
      }
      tube(2, -18, z0+78, W-2, -18, z0+78, 2, trim);
      for(let i=0;i<11;i++) cyl(W*(i+0.5)/11, -18, z0+70, z0+78, 1.6, trim);
    }
    slab(0,W, H, H+10, -1, -D, trim);
    shopDoor(W*0.12, wall, trim);   // stair core -- the ramp was the only way in
    // helical ramp with treads, an edge beam and a centre column
    const ra = W + 58, rb = -60, rr = 54;
    cyl(ra, rb, 0, H, 8, trim);
    for(let t=0;t<3;t++){
      const z = 16 + t*90;
      for(let k=0;k<12;k++){
        const a0 = k*0.524, a1 = (k+1)*0.524;
        const x0 = ra + Math.cos(a0)*rr, b0 = rb + Math.sin(a0)*rr;
        const x1 = ra + Math.cos(a1)*rr, b1 = rb + Math.sin(a1)*rr;
        const ix0 = ra + Math.cos(a0)*(rr-26), ib0 = rb + Math.sin(a0)*(rr-26);
        const ix1 = ra + Math.cos(a1)*(rr-26), ib1 = rb + Math.sin(a1)*(rr-26);
        const z0 = z + k*7.5, z1 = z + (k+1)*7.5;
        poly([P(x0,b0,z0),P(x1,b1,z1),P(ix1,ib1,z1),P(ix0,ib0,z0)], k%2?'#8d949a':'#969ca2');
        poly([P(x0,b0,z0),P(x1,b1,z1),P(x1,b1,z1-9),P(x0,b0,z0-9)], shade('#8d949a',.78));
        tube(x0, b0, z0+26, x1, b1, z1+26, 1.6, trim);
        cyl(x0, b0, z0, z0+26, 1.4, trim);
      }
    }
    slab(6,W*0.30, 0, 34, -1, 2, '#e8a13a');
    F(12,W*0.24, 8, 26, '#2b2f33', null,0, 1.5);
    kerb(p,'none');
  }
},
{
  name:'Market hall', tall:true,
  cTodo:'12 pavement props need collision volumes',
  fTodo:'z118..130 return +8',
  zTodo:1.38,          // H 232 -- see SCALE REVIEW at the head of this file
  head:'Barrel-vaulted glazed roof over a two-storey front',
  tags:['2 storey','barrel vault','tube ribs','arched entry','stalls'],
  desc:'The vault ribs are tubes standing proud of the glazing and the gable arch has a swept reveal, so the roof reads as a glasshouse frame rather than a painted curve.',
  draw(p){
    const wall = '#c4bda8', trim = '#3f5a52', H = 232, steps = 12;
    body(wall, trim, H);
    shopDoor(W*0.50, wall, trim);
    slab(0,W, H, H+12, -1, -14, trim);
    const vp = (i) => {
      const a = Math.PI*i/steps;
      return { x: W/2 - Math.cos(a)*(W/2-6), z: H + Math.sin(a)*86 };
    };
    for(let i=0;i<steps;i++){
      const p0 = vp(i), p1 = vp(i+1);
      poly([P(p0.x,0,p0.z),P(p1.x,0,p1.z),P(p1.x,-D,p1.z),P(p0.x,-D,p0.z)],
           i%2 ? 'rgba(150,190,200,.80)' : 'rgba(168,205,214,.86)');
    }
    for(let i=0;i<=steps;i++){
      const q = vp(i);
      for(let b=0;b<4;b++) tube(q.x, -b*(D/3), q.z, q.x, -b*(D/3), q.z, 4, shade(trim,.9));
    }
    for(let b=0;b<4;b++){
      const bb = -b*(D/3);
      ctx.strokeStyle=shade(trim,.9); ctx.lineWidth=5;
      ctx.beginPath();
      for(let i=0;i<=steps;i++){ const q=vp(i), pt=P(q.x,bb,q.z); i?ctx.lineTo(pt.x,pt.y):ctx.moveTo(pt.x,pt.y); }
      ctx.stroke();
    }
    ctx.beginPath();
    let q0 = P(6,0,H); ctx.moveTo(q0.x,q0.y);
    for(let i=0;i<=steps;i++){ const q=vp(i), pt=P(q.x,0,q.z); ctx.lineTo(pt.x,pt.y); }
    ctx.closePath(); ctx.fillStyle='rgba(150,190,200,.5)'; ctx.fill();
    ctx.strokeStyle=trim; ctx.lineWidth=3; ctx.stroke();
    for(let i=1;i<6;i++){
      const a = Math.PI*i/6;
      const x = W/2 - Math.cos(a)*(W/2-6), z = H + Math.sin(a)*86;
      tube(x, 0, z, x, 0, H, 2.2, shade(trim,1.15));
    }
    slab(0,W, 118, 130, -1, -8, shade(wall,.84));
    for(let i=0;i<4;i++){
      const x0 = 12+(W-24)*(i+0.12)/4, x1 = 12+(W-24)*(i+0.88)/4;
      slab(x0-3,x1+3, 142, 200, -1, -8, shade(wall,1.08));
      F(x0,x1, 146, 196, '#7f98a0', null,0,-8.5);
      for(let k=1;k<3;k++) F(x0+(x1-x0)*k/3-1.6, x0+(x1-x0)*k/3+1.6, 146,196, shade(wall,1.08), null,0,-9);
    }
    const ex0 = W*0.32, ex1 = W*0.68;
    F(ex0-8,ex1+8, 0, 76, shade(wall,.86), null,0,-1);
    const ap = (t,bb) => {
      const u=1-t, a = u*u*(ex0-8) + 2*u*t*((ex0+ex1)/2) + t*t*(ex1+8);
      const z = u*u*76 + 2*u*t*140 + t*t*76;
      return P(a,bb,z);
    };
    ctx.beginPath(); let q=ap(0,-1); ctx.moveTo(q.x,q.y);
    for(let k=1;k<=12;k++){ q=ap(k/12,-1); ctx.lineTo(q.x,q.y); }
    ctx.closePath(); ctx.fillStyle=shade(wall,.86); ctx.fill();
    for(let k=0;k<12;k++) poly([ap(k/12,-1),ap((k+1)/12,-1),ap((k+1)/12,-12),ap(k/12,-12)], shade(wall,.96));
    F(ex0,ex1, 0, 70, '#2e3a36', null,0,-11);
    const ip = (t,bb) => {
      const u=1-t, a = u*u*ex0 + 2*u*t*((ex0+ex1)/2) + t*t*ex1;
      const z = u*u*70 + 2*u*t*126 + t*t*70;
      return P(a,bb,z);
    };
    ctx.beginPath(); q=ip(0,-11); ctx.moveTo(q.x,q.y);
    for(let k=1;k<=12;k++){ q=ip(k/12,-11); ctx.lineTo(q.x,q.y); }
    ctx.closePath(); ctx.fillStyle='#2e3a36'; ctx.fill();
    for(let i=0;i<2;i++) F(i? W*0.74 : 12, i? W-12 : W*0.26, 24, 96, '#7f98a0', shade(wall,.7), 2);
    if(state.props){
      for(let i=0;i<3;i++){
        const sa = W*0.06 + i*W*0.34, col = ['#c2452e','#e8c34a','#3f8f5a'][i];
        for(const [la,lb] of [[sa+4,30],[sa+48,30],[sa+4,58],[sa+48,58]]) cyl(la, lb, 0, 44, 2.4, '#8a7a5a');
        slab(sa, sa+52, 44, 48, 26, 62, '#8a7a5a');
        poly([P(sa,26,64),P(sa+52,26,64),P(sa+52,62,54),P(sa,62,54)], col, shade(trim,.9), 1.5);
        poly([P(sa,62,54),P(sa+52,62,54),P(sa+52,62,48),P(sa,62,48)], shade(col,.75));
      }
    }
    kerb(p,'none');
  }
},
{
  name:'Newspaper HQ', tall:true,
  fTodo:'z106..114 return +8',
  zTodo:1.79,          // H 300 -- see SCALE REVIEW at the head of this file
  head:'Rooftop globe, headline band, delivery bay',
  tags:['globe on a frame','running headline band','van bay','corner clock','3 storey'],
  desc:'The globe is a sphere with its meridians drawn as real rings around it, carried on a braced frame, and the headline band is a recessed box with the lit panels inside it.',
  draw(p){
    const wall = '#3f4652', trim = '#e8ddc8', H = 300;
    body(wall, trim, H);
    slab(0,W, H, H+12, -1, -14, shade(wall,1.35));
    F(4,W-4, 244, 276, '#15181e', null,0, -1);
    slab(4,W-4, 240, 244, -1, -9, shade(wall,1.5));
    slab(4,W-4, 276, 280, -1, -9, shade(wall,1.5));
    for(let i=0;i<9;i++) F(12+i*((W-24)/9), 12+(i+0.7)*((W-24)/9), 254, 266, '#e8c34a', null,0,-1.5);
    for(let fl=0; fl<2; fl++){
      const z0 = 118 + fl*62;
      for(let i=0;i<5;i++){
        const x0 = 10+(W-20)*(i+0.10)/5, x1 = 10+(W-20)*(i+0.90)/5;
        slab(x0-3,x1+3, z0-3, z0+51, -1, -8, shade(wall,1.2));
        F(x0,x1, z0, z0+48, '#7f93a8', null,0,-8.5);
        F(x0,x1, z0+23, z0+26, shade(wall,1.2), null,0,-9);
      }
    }
    slab(0,W, 106, 114, -1, -8, shade(wall,1.5));
    F(10,W*0.48, 24, 96, '#7f93a8', shade(wall,.7), 3);
    shopDoor(W*0.80, wall, trim);
    for(let j=0;j<6;j++) F(W*0.54+3, W-13, 6+j*14, 14+j*14, '#a2a8ae', null,0,-2);
    slab(W*0.52,W-8, 92, 100, -2, -9, '#c2452e');
    if(state.props){
      faceCircle(W*0.30, -10, 110, 15, '#f2ece0', trim, 3);
      faceT(W*0.30, -10.4, 110, 15);
      ctx.strokeStyle='#2b3138'; ctx.lineWidth=2/(15*K);
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0.06,-0.6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0.46,0.26); ctx.stroke();
      ctx.restore();
    }
    if(state.roof){
      const ga = W*0.50, gb = -80;
      for(const aa of [ga-34, ga+34]){
        cyl(aa, gb, H+12, H+52, 4, '#8d979f');
        tube(aa, gb, H+50, ga, gb, H+30, 1.6, '#8d979f');
      }
      slab(ga-38, ga+38, H+48, H+56, gb+8, gb-8, '#8d979f');
      ball(ga, gb, H+108, 48, '#2f6f8f', '#3f86a8');
      for(let k=0;k<3;k++)
        faceCircle(ga, gb, H+108, 48*Math.sin(0.6+k*0.5), null, 'rgba(143,196,216,.8)', 2);
      for(let k=-1;k<=1;k++)
        /* NOT A HOOP. plateHoop clips to the silhouette angles of a
           CYLINDER; these are latitude wires on a sphere, where the
           visible span depends on the latitude, so the cylinder cut
           left them hanging in mid-air. It is a wire emblem rather
           than a band on a solid, so the full ellipse is correct. */
        plateCircle(ga, gb, H+108+k*24, 48*Math.cos(Math.abs(k)*0.55), null, 'rgba(143,196,216,.7)', 2);
      ctx.fillStyle='#4e9a5a';
      const c1=P(ga-14,gb,H+116);
      ctx.beginPath(); ctx.ellipse(c1.x,c1.y,17*K,12*K,0.3,0,7); ctx.fill();
      const c2=P(ga+18,gb,H+94);
      ctx.beginPath(); ctx.ellipse(c2.x,c2.y,13*K,9*K,-0.2,0,7); ctx.fill();
      box(W*0.12,W*0.32,-170,-130,H,H+22,'#8f969d','#787f86','#697077');
    }
    kerb(p,'none');
  }
},
{
  name:'Telephone exchange', tall:true,
  fTodo:'z280..296 return +10; z88..96 return +8',
  zTodo:1.76,          // H 296 -- see SCALE REVIEW at the head of this file
  head:'Blank upper floors, louvre vents, cable gantry',
  tags:['louvred vents','no upper windows','built cable gantry','blank mass','3 storey'],
  desc:'The louvres are stacked blades with a shaded return, and the cable gantry is a bracketed frame off the flank with the cables sagging from it as real lines.',
  draw(p){
    const wall = '#9a9484', trim = '#5c5a50', H = 296;
    body(wall, trim, H);
    slab(0,W, H, H+12, -1, -14, trim);
    slab(0,W, H-16, H, -1, -10, shade(wall,1.08));
    for(let i=0;i<5;i++) slab(W*i/4-9, W*i/4+9, 96, H-16, -1, -8, shade(wall,1.08));
    for(let fl=0; fl<3; fl++){
      const z0 = 112 + fl*62;
      for(let i=0;i<4;i++){
        const x0 = W*i/4+12, x1 = W*(i+1)/4-12;
        F(x0,x1, z0, z0+46, shade(wall,.6), null,0, 2);
        for(let k=0;k<7;k++){
          poly([P(x0,2,z0+3+k*6),P(x1,2,z0+3+k*6),P(x1,-4,z0+6+k*6),P(x0,-4,z0+6+k*6)], shade(wall,.98));
          poly([P(x0,-4,z0+6+k*6),P(x1,-4,z0+6+k*6),P(x1,-4,z0+3+k*6),P(x0,-4,z0+3+k*6)], shade(wall,.78));
        }
      }
    }
    slab(0,W, 88, 96, -1, -8, shade(wall,.8));
    shopDoor(W*0.50, wall, trim);
    F(W*0.43,W*0.57, 10, 74, '#6a7a80', null,0,-8.5);
    for(let i=0;i<2;i++) F(i? W*0.70 : 12, i? W-12 : W*0.30, 26, 76, '#6a7a80', shade(wall,.72), 2);
    slab(W*0.34,W*0.66, 82, 90, -1, -10, shade(wall,1.1));
    if(state.roof){
      for(let i=0;i<3;i++){
        const b0 = -30 - i*70;
        box(W+2, W+18, b0-14, b0, 146, 158, '#8d949a','#7d848a','#6f767c');
        poly([P(W+18,b0,158),P(W+64,b0,150),P(W+64,b0-14,150),P(W+18,b0-14,158)], '#a3abb2');
        poly([P(W+18,b0,150),P(W+64,b0,142),P(W+64,b0-14,142),P(W+18,b0-14,150)], '#8d949a');
        poly([P(W+18,b0,158),P(W+18,b0,150),P(W+30,b0,142)], '#7d848a');
      }
      for(let k=0;k<4;k++){
        const z = 148 - k*4;
        ctx.strokeStyle='#4a4f55'; ctx.lineWidth=1.6;
        const a=P(W+60,-30,z), b2=P(W+60,-170,z-6);
        ctx.beginPath(); ctx.moveTo(a.x,a.y);
        ctx.quadraticCurveTo((a.x+b2.x)/2,(a.y+b2.y)/2+14*K,b2.x,b2.y); ctx.stroke();
      }
      for(let i=0;i<3;i++)
        box(W*0.12+i*W*0.30, W*0.12+i*W*0.30+W*0.18, -150, -100, H, H+30,'#8f969d','#787f86','#697077');
      cyl(W*0.88, -40, H+12, H+96, 2.4, '#c9ccd0');
    }
    kerb(p,'none');
  }
},
{
  name:'Police station', tall:true,
  cTodo:'2 pavement props need collision volumes',
  fTodo:'z274..292 return +10; z118..124 return +7; z186..192 return +7',
  zTodo:1.74,          // H 292 -- see SCALE REVIEW at the head of this file
  head:'Blue lamp, barred ground floor, mast',
  tags:['turned blue lamp','round bars','entrance steps','radio mast','3 storey'],
  desc:'The lamp is a turned lantern with a domed cap on a bracket, the ground-floor bars are round rods set into the reveal, and the mast has real crossbars on a base plate.',
  draw(p){
    const wall = '#8a7f74', trim = '#2f3a4a', H = 292;
    body(wall, trim, H);
    slab(0,W, H, H+12, -1, -14, shade(wall,.7));
    slab(0,W, H-18, H, -1, -10, shade(wall,1.1));
    for(let fl=0; fl<2; fl++){
      const z0 = 130 + fl*68;
      slab(0,W, z0-12, z0-6, -1, -7, shade(wall,.88));
      for(let i=0;i<4;i++){
        const x0 = 12+(W-24)*(i+0.12)/4, x1 = 12+(W-24)*(i+0.88)/4;
        slab(x0-4,x1+4, z0-3, z0+51, -1, -9, shade(wall,1.1));
        F(x0,x1, z0, z0+48, '#5a6a7a', null,0,-9.5);
        F(x0,x1, z0+23, z0+26, shade(wall,1.1), null,0,-10);
        F(x0+(x1-x0)/2-1.6, x0+(x1-x0)/2+1.6, z0, z0+48, shade(wall,1.1), null,0,-10);
      }
    }
    for(let i=0;i<2;i++){
      const x0 = i? W*0.62 : 12, x1 = i? W-12 : W*0.36;
      slab(x0-4,x1+4, 26, 96, -1, 8, shade(wall,1.1));
      F(x0,x1, 30, 92, '#4a5a68', null,0, 6);
      for(let k=0;k<6;k++) cyl(x0+(x1-x0)*(k+0.5)/6, 4, 30, 92, 1.6, '#2b3138');
      tube(x0, 4, 61, x1, 4, 61, 1.4, '#2b3138');
    }
    shopDoor(W*0.50, wall, trim);
    F(W*0.45,W*0.55, 12, 88, '#5a6a7a', null,0,-8.5);
    slab(W*0.36,W*0.64, 96, 106, -1, -10, shade(wall,1.12));
    slab(W*0.40,W*0.60, 108, 122, -1, -8, trim);
    // blue lamp, turned, on a bracket
    tube(W*0.50, -2, 118, W*0.50, -16, 118, 1.6, '#3a4046');
    cyl(W*0.50, -16, 108, 116, 5, '#3a4046');
    cyl(W*0.50, -16, 90, 108, 12, '#2f6fd0');
    ball(W*0.50, -16, 90, 12, '#2f6fd0', '#5a92e0');
    plateCircle(W*0.50, -16, 108, 13, '#1e4a94');
    if(state.props){
      box(W*0.34,W*0.66, 0, 26, 0, 10, shade(wall,1.02), shade(wall,.86), shade(wall,.76));
      box(W*0.37,W*0.63, 0, 18, 10, 18, shade(wall,1.04), shade(wall,.88), shade(wall,.78));
    }
    if(state.roof){
      box(W*0.22, W*0.30, -78, -62, H+12, H+18, '#9aa0a6','#8d949a','#7d848a');
      cyl(W*0.26, -70, H+18, H+120, 2.2, '#c3c8cc');
      for(let k=0;k<3;k++){
        const z = H+100-k*22, half = 8+k*4;
        tube(W*0.26-half, -70, z, W*0.26+half, -70, z, 1.2, '#c3c8cc');
      }
      box(W*0.56,W*0.84,-160,-116,H,H+26,'#8f969d','#787f86','#697077');
    }
    kerb(p,'none');
  }
},
{
  name:'Museum', tall:true,
  fTodo:'z264..286 return +10',
  zTodo:1.7,          // H 286 -- see SCALE REVIEW at the head of this file
  head:'Roof lantern, hanging banners, deep reveal',
  tags:['built roof lantern','hanging banners','recessed entry','stone piers','3 storey'],
  desc:'The lantern is a glazed box with upstands, a ridge and end walls, and the banners hang from tube rails with weighted bottom bars.',
  draw(p){
    const wall = '#cfc7b4', trim = '#4a5250', H = 286;
    body(wall, trim, H);
    slab(0,W, H, H+14, -1, -16, shade(wall,.76));
    slab(0,W, H-22, H, -1, -10, shade(wall,1.08));
    F(W*0.28,W*0.72, 0, 150, shade(wall,.66), null,0, 1);
    /* three openings at 23 wide inside a 101 portico. Two real doors
       need 132.5 and will not fit between the columns, so the museum
       entrance becomes a single proper one on the centreline. */
    shopDoor(W*0.50, wall, '#3f4a4a', 'rgba(95,114,116,.55)');
    for(let i=0;i<4;i++) cyl(W*0.28+i*W*0.147, -8, 0, 150, 7, shade(wall,1.0));
    slab(W*0.24,W*0.76, 150, 164, -6, -14, shade(wall,1.06));
    for(let fl=0; fl<2; fl++){
      const z0 = 180 + fl*54;
      for(let i=0;i<5;i++){
        const x0 = 12+(W-24)*(i+0.16)/5, x1 = 12+(W-24)*(i+0.84)/5;
        slab(x0-3,x1+3, z0-3, z0+41, -1, -8, shade(wall,.9));
        F(x0,x1, z0, z0+38, '#5f7274', null,0,-8.5);
      }
    }
    F(12,W*0.24, 30, 120, '#5f7274', shade(wall,.7), 2);
    F(W*0.78,W-12, 30, 120, '#5f7274', shade(wall,.7), 2);
    if(state.props){
      for(let i=0;i<2;i++){
        const ba = i? W*0.86 : W*0.14, col = ['#8a2f3c','#2f5a6b'][i];
        tube(ba-22, -12, 272, ba+22, -12, 272, 2, '#8d979f');
        slab(ba-18, ba+18, 160, 268, -12, -18, col, shade(wall,.6));
        F(ba-11, ba+11, 190, 246, shade(wall,1.1), null,0,-18.5);
        slab(ba-22, ba+22, 154, 160, -11, -19, '#8d979f');
        poly([P(ba-18,-12,160),P(ba+18,-12,160),P(ba,-12,146)], col);
      }
    }
    if(state.roof){
      const l0 = W*0.16, l1 = W*0.84, b0 = -40, b1 = -200;
      F(l0,l1, H+14, H+30, shade(wall,1.02), null,0, b0);         // upstand
      poly([P(l0,b0,H+30),P(l1,b0,H+30),P(l1,b0-16,H+52),P(l0,b0-16,H+52)], 'rgba(160,196,206,.85)');
      poly([P(l0,b1,H+30),P(l1,b1,H+30),P(l1,b1+16,H+52),P(l0,b1+16,H+52)], 'rgba(140,176,188,.8)');
      poly([P(l0,b0-16,H+52),P(l1,b0-16,H+52),P(l1,b1+16,H+52),P(l0,b1+16,H+52)], 'rgba(186,214,222,.9)');
      poly([P(l1,b0,H+30),P(l1,b0-16,H+52),P(l1,b1+16,H+52),P(l1,b1,H+30)], shade(wall,.86));
      slab(l0-4, l1+4, H+52, H+58, b0-14, b1+14, shade(trim,1.1));
      for(let i=1;i<7;i++){
        const x = l0 + (l1-l0)*i/7;
        tube(x, b0-16, H+52, x, b1+16, H+52, 1.6, shade(trim,1.1));
      }
      box(W*0.86,W*0.98,-230,-200,H,H+18,'#8f969d','#787f86','#697077');
    }
    kerb(p,'none');
  }
},
{
  name:'Textile mill', tall:true,
  zTodo:1.82,          // H 306 -- see SCALE REVIEW at the head of this file
  head:'Round chimney, stair tower, regular bays',
  tags:['round brick chimney','projecting stair tower','swept loading arch','regular bays','3 storey'],
  desc:'The stair tower is a closed solid with a capped parapet, the loading arch is swept to a reveal, and the chimney tapers through five turned lifts to a cap.',
  draw(p){
    const wall = '#9c5a45', trim = '#d8cdb8', H = 306;
    body(wall, trim, H);
    slab(0,W, H, H+12, -1, -14, shade(wall,.66));
    for(let r=0;r<14;r++) F(0,W, 6+r*22, 9+r*22, shade(wall,.9), null,0,-1);
    for(let fl=0; fl<3; fl++){
      const z0 = 40 + fl*88;
      for(let i=0;i<4;i++){
        const x0 = 14+(W-28)*(i+0.10)/4, x1 = 14+(W-28)*(i+0.90)/4;
        slab(x0-4,x1+4, z0-4, z0+70, -1, -9, shade(wall,.78));
        F(x0,x1, z0, z0+66, '#6a7f8c', null,0,-9.5);
        for(let k=1;k<3;k++) F(x0+(x1-x0)*k/3-1.6, x0+(x1-x0)*k/3+1.6, z0, z0+66, trim, null,0,-10);
        for(let k=1;k<4;k++) F(x0,x1, z0+66*k/4-1.6, z0+66*k/4+1.6, trim, null,0,-10);
        slab(x0-7,x1+7, z0-9, z0-4, -1, -13, trim);
      }
    }
    shopDoor(W*0.56, wall, trim);   // ground floor began at z0 = 40, no way in
    const t0 = -8, t1 = W*0.24;
    F(t0,t1, 0, H+46, shade(wall,1.12), shade(wall,.7), 2, -14);
    S(t1, -14, 0, 0, H+46, shade(wall,.86));
    T(t0,t1, -14, 0, H+46, shade(wall,.92));
    for(let i=0;i<4;i++) slab(t0+14, t1-14, 44+i*66, 84+i*66, -15, -22, '#4a5a64', trim);
    slab(t0-4,t1+4, H+46, H+58, -12, -18, trim);
    F(W*0.56,W*0.86, 0, 68, shade(wall,.72), null,0,-1);
    const ap = (t,bb) => {
      const u=1-t, a = u*u*(W*0.56) + 2*u*t*(W*0.71) + t*t*(W*0.86);
      const z = u*u*68 + 2*u*t*108 + t*t*68;
      return P(a,bb,z);
    };
    ctx.beginPath(); let q=ap(0,-1); ctx.moveTo(q.x,q.y);
    for(let k=1;k<=12;k++){ q=ap(k/12,-1); ctx.lineTo(q.x,q.y); }
    ctx.closePath(); ctx.fillStyle=shade(wall,.72); ctx.fill();
    for(let k=0;k<12;k++) poly([ap(k/12,-1),ap((k+1)/12,-1),ap((k+1)/12,-12),ap(k/12,-12)], shade(wall,.9));
    F(W*0.59,W*0.83, 0, 62, '#2e2018', null,0,-11);
    if(state.roof){
      const ca = W*0.62, cb = -170;
      for(let i=0;i<5;i++) cyl(ca, cb, H + i*44, H + (i+1)*44, 30 - i*3.6, shade(wall, 0.92 + i*0.02));
      cyl(ca, cb, H+220, H+232, 15, shade(wall,.8));
      plateCircle(ca, cb, H+232, 13, '#3a2a22', shade(wall,.72), 2);
      for(let k=0;k<3;k++)
        ball(ca + (k%2?11:-8), cb, H+248+k*20, 12+k*6, 'rgba(120,116,110,.4)', 'rgba(142,138,132,.38)');
    }
    kerb(p,'none');
  }
},
{
  name:'Ballroom', tall:true,
  cTodo:'2 pavement props need collision volumes',
  fTodo:'z268..288 return +10',
  zTodo:1.71,          // H 288 -- see SCALE REVIEW at the head of this file
  head:'Great arched window, deep canopy, globe lamps',
  tags:['swept arch','globe lamps','deep canopy','poster frames','3 storey'],
  desc:'The great window head is swept to a real reveal with a keystone, the canopy is a wedge on round posts, and the globe lamps are spheres on turned brackets.',
  draw(p){
    const wall = '#5a4a6b', trim = '#e0c88a', H = 288;
    body(wall, trim, H);
    slab(0,W, H, H+12, -1, -14, trim);
    slab(0,W, H-20, H, -1, -10, shade(wall,1.2));
    const gx0 = W*0.14, gx1 = W*0.86;
    F(gx0-8,gx1+8, 130, 240, shade(wall,1.15), null,0,-1);
    const ap = (t,bb) => {
      const u=1-t, a = u*u*(gx0-8) + 2*u*t*((gx0+gx1)/2) + t*t*(gx1+8);
      const z = u*u*240 + 2*u*t*312 + t*t*240;
      return P(a,bb,z);
    };
    ctx.beginPath(); let q=ap(0,-1); ctx.moveTo(q.x,q.y);
    for(let k=1;k<=14;k++){ q=ap(k/14,-1); ctx.lineTo(q.x,q.y); }
    ctx.closePath(); ctx.fillStyle=shade(wall,1.15); ctx.fill();
    for(let k=0;k<14;k++) poly([ap(k/14,-1),ap((k+1)/14,-1),ap((k+1)/14,-10),ap(k/14,-10)], shade(wall,1.32));
    F(gx0,gx1, 136, 238, '#e8d9a8', null,0,-9);
    const ip = (t,bb) => {
      const u=1-t, a = u*u*gx0 + 2*u*t*((gx0+gx1)/2) + t*t*gx1;
      const z = u*u*238 + 2*u*t*300 + t*t*238;
      return P(a,bb,z);
    };
    ctx.beginPath(); q=ip(0,-9); ctx.moveTo(q.x,q.y);
    for(let k=1;k<=14;k++){ q=ip(k/14,-9); ctx.lineTo(q.x,q.y); }
    ctx.closePath(); ctx.fillStyle='#e8d9a8'; ctx.fill();
    for(let k=1;k<6;k++) F(gx0+(gx1-gx0)*k/6-2.5, gx0+(gx1-gx0)*k/6+2.5, 136, 280, shade(wall,1.15), null,0,-9.5);
    for(let k=1;k<4;k++) F(gx0,gx1, 136+102*k/4-2.5, 136+102*k/4+2.5, shade(wall,1.15), null,0,-9.5);
    slab(W*0.46, W*0.54, 268, 292, -1, -12, shade(wall,1.3), null, trim);   // keystone
    F(12,W*0.36, 26, 96, '#7a6a8c', shade(wall,.7), 2);
    F(W*0.64,W-12, 26, 96, '#7a6a8c', shade(wall,.7), 2);
    shopDoor(W*0.50, wall, trim);
    F(W*0.43,W*0.57, 12, 92, '#e8d9a8', null,0,-8.5);
    const out = 50;
    poly([P(W*0.30,0,116),P(W*0.70,0,116),P(W*0.70,out,104),P(W*0.30,out,104)], trim);
    poly([P(W*0.30,out,104),P(W*0.70,out,104),P(W*0.70,out,92),P(W*0.30,out,92)], shade(trim,.75));
    poly([P(W*0.30,0,106),P(W*0.70,0,106),P(W*0.70,out,92),P(W*0.30,out,92)], shade(wall,1.25));
    poly([P(W*0.30,0,116),P(W*0.30,out,104),P(W*0.30,out,92),P(W*0.30,0,106)], shade(trim,.6));
    poly([P(W*0.70,0,116),P(W*0.70,out,104),P(W*0.70,out,92),P(W*0.70,0,106)], shade(trim,.6));
    for(const aa of [W*0.31, W*0.69]) cyl(aa, out-4, 0, 102, 3.4, '#c9a24a');
    for(let i=0;i<2;i++)
      slab(i? W*0.74 : W*0.10, i? W*0.90 : W*0.26, 104, 128, -1, -8, ['#8a2f3c','#2f5a6b'][i], null, trim);
    if(state.props){
      for(const aa of [W*0.06, W*0.94]){
        tube(aa, -2, 116, aa, -14, 112, 1.8, '#c9a24a');
        ball(aa, -14, 106, 12, '#fff2c8', '#fffbe4');
      }
    }
    if(state.roof){
      for(let i=0;i<3;i++)
        slab(W*0.20+i*W*0.24, W*0.20+i*W*0.24+W*0.16, H+12, H+38, -20, -30, trim, shade(wall,.7));
      box(W*0.60,W*0.86,-170,-130,H,H+24,'#8f969d','#787f86','#697077');
    }
    kerb(p,'none');
  }
},
{
  name:'Harbour office', tall:true,
  cTodo:'3 pavement props need collision volumes',
  fTodo:'z106..112 return +7, lettering 64 off-centre; z174..180 return +7; z100..112 return +3, lettering 70 off-centre',
  zTodo:1.63,          // H 274 -- see SCALE REVIEW at the head of this file
  head:'Cupola lookout, external stair, weathervane',
  tags:['glazed cupola','pyramid cap','built external stair','weathervane','3 storey'],
  desc:'The cupola is a glazed drum on a plinth with a four-sided cap, and the stair is tread boxes on a stringer with a handrail up to a railed landing.',
  draw(p){
    const wall = '#d8d2c0', trim = '#2f5a6b', H = 274;
    body(wall, trim, H);
    slab(0,W, H, H+12, -1, -14, trim);
    for(let fl=0; fl<2; fl++){
      const z0 = 118 + fl*68;
      slab(0,W, z0-12, z0-6, -1, -7, shade(wall,.86));
      for(let i=0;i<4;i++){
        const x0 = 12+(W-24)*(i+0.14)/4, x1 = 12+(W-24)*(i+0.86)/4;
        slab(x0-3,x1+3, z0-3, z0+51, -1, -8, shade(wall,1.06));
        F(x0,x1, z0, z0+48, '#6a8a98', null,0,-8.5);
        F(x0,x1, z0+23, z0+26, shade(wall,1.06), null,0,-9);
      }
    }
    F(12,W*0.44, 26, 96, '#6a8a98', shade(wall,.7), 2);
    shopDoor(W*0.61, wall, trim);
    F(W*0.76,W-12, 26, 96, '#6a8a98', shade(wall,.7), 2);
    slab(6,W-6, 100, 112, -1, -9, trim);
    if(state.props){
      slab(W*0.72,W*0.76, 20, 96, -1, -6, '#f0ece0', trim);
      for(let i=0;i<8;i++) F(W*0.72,W*0.745, 26+i*9, 28+i*9, trim, null,0,-6.5);
      for(let i=0;i<8;i++){
        const z = 10 + i*13, b = 30 + i*7;
        box(W*0.14, W*0.44, b, b+9, z-8, z, '#a3abb2','#9aa2a9','#8d949a');
      }
      tube(W*0.44, 30, 40, W*0.44, 86, 132, 3, '#7d838a');
      tube(W*0.44, 30, 8, W*0.44, 86, 106, 2.4, '#7d838a');
      box(W*0.10, W*0.46, 40, 86, 107, 113, '#a3abb2','#9aa2a9','#8d949a');
      tube(W*0.10, 42, 143, W*0.46, 42, 143, 2, '#8d979f');
      for(let i=0;i<6;i++) cyl(W*0.10 + W*0.36*i/5, 42, 113, 143, 1.4, '#8d979f');
    }
    if(state.roof){
      const ca = W*0.50, cb = -90;
      slab(ca-42, ca+42, H+12, H+22, cb+42, cb-42, shade(wall,1.04), shade(wall,.8));
      cyl(ca, cb, H+22, H+82, 32, 'rgba(160,196,206,.7)');
      for(let k=0;k<6;k++){
        const t = 3*Math.PI/4 - Math.PI*k/5;
        cyl(ca + 32*Math.cos(t), cb + 32*Math.sin(t), H+22, H+82, 2, trim);
      }
      plateCircle(ca, cb, H+82, 36, shade(trim,1.1), shade(trim,.8), 2);
      poly([P(ca-42,cb+42,H+82),P(ca+42,cb+42,H+82),P(ca,cb,H+126)], trim);
      poly([P(ca+42,cb+42,H+82),P(ca+42,cb-42,H+82),P(ca,cb,H+126)], shade(trim,.76));
      cyl(ca, cb, H+126, H+156, 2, '#c9a24a');
      tube(ca-16, cb, H+156, ca+16, cb, H+156, 1.6, '#c9a24a');
      poly([P(ca+4,cb,H+164),P(ca+26,cb,H+156),P(ca+4,cb,H+148)], '#c9a24a');
      ball(ca, cb, H+160, 3.5, '#c9a24a');
      box(W*0.12,W*0.30,-180,-140,H,H+18,'#8f969d','#787f86','#697077');
    }
    kerb(p,'none');
  }
},
{
  name:'Cold store', tall:true,
  zTodo:1.74,          // H 292 -- see SCALE REVIEW at the head of this file
  head:'Blank insulated box, external pipework, frost',
  tags:['windowless','round pipe runs','condenser fans','insulated hatch','3 storey'],
  desc:'The pipe runs are cylinders with flanged joints and a real elbow over the parapet, and the condensers are drums with fan discs recessed into their tops.',
  draw(p){
    const wall = '#c6cbcc', trim = '#5c666a', H = 292;
    body(wall, trim, H);
    slab(0,W, H, H+12, -1, -14, trim);
    for(let i=0;i<4;i++) F(W*i/3-8, W*i/3+8, 0, H, shade(wall,.92), null,0,-1);
    for(let r=0;r<5;r++) F(0,W, 40+r*54, 44+r*54, shade(wall,.94), null,0,-1);
    for(let i=0;i<3;i++){
      const fa = 30 + i*68;
      F(fa-13,fa+13, 120, 250, 'rgba(232,240,242,.55)', null,0,-2);
      F(fa-7,fa+7, 96, 250, 'rgba(244,250,252,.6)', null,0,-2.5);
    }
    F(W*0.34,W*0.70, 0, 104, shade(wall,.78), null,0, 1);
    slab(W*0.36,W*0.68, 6, 96, -1, -9, '#8d979f', trim);
    slab(W*0.36,W*0.68, 48, 54, -9.5, -12, trim);
    F(W*0.50,W*0.54, 6, 96, trim, null,0,-9.5);
    slab(W*0.10,W*0.24, 20, 84, 0, -7, trim, null, shade(wall,1.05));
    /* the wide opening is an insulated sliding door for goods and is the
       identity of the building, so it stays. This is the way in for a
       person, which it did not have. */
    shopDoor(W*0.86, wall, trim);
    if(state.props){
      for(let i=0;i<3;i++){
        const pa = W*0.78 + i*13;
        cyl(pa, -8, 8, 240, 4, ['#8d979f','#b0b8bc','#8d979f'][i]);
        for(let k=0;k<5;k++) plateCircle(pa, -8, 30+k*48, 6, '#6a7076');
      }
      tube(W*0.78, -8, 240, W*0.78, -8, 258, 4, '#8d979f');
      tube(W*0.78, -8, 258, W*0.62, -8, 262, 4, '#8d979f');
    }
    if(state.roof){
      F(W*0.30,W*0.80, H+12, H+66, shade(wall,1.02), shade(wall,.8), 2, -60);
      S(W*0.80, -140, -60, H+12, H+66, shade(wall,.86));
      T(W*0.30,W*0.80, -140, -60, H+66, shade(wall,1.06));
      for(let i=0;i<2;i++){
        const ca = W*0.38 + i*W*0.26;
        cyl(ca, -100, H+66, H+84, 20, '#b0b8bc');
        plateCircle(ca, -100, H+84, 20, '#8f979c', '#7d858a', 2);
        plateCircle(ca, -100, H+85, 15, '#a8b0b4');
        for(let k=0;k<4;k++){
          const t=k*1.57;
          poly([P(ca,-100,H+86),
                P(ca+15*Math.cos(t), -100+15*Math.sin(t), H+86),
                P(ca+15*Math.cos(t+0.6), -100+15*Math.sin(t+0.6), H+86)], '#c3c9cd');
        }
      }
      cyl(W*0.17, -30, H+12, H+40, 6, '#8d979f');
    }
    kerb(p,'none');
  }
},
{
  name:'Almshouses', tall:true,
  fTodo:'z118..132 return +10',
  zTodo:1.56,          // H 262 -- see SCALE REVIEW at the head of this file
  head:'Arcaded ground floor, dormers, courtyard gate',
  tags:['swept arcade','dormers with cheeks','courtyard gate','chimney pots','3 storey'],
  desc:'Every arch in the arcade is swept to a real reveal on round piers, and each dormer is a solid box with cheeks and a pitched roof rather than a face on the slope.',
  draw(p){
    const wall = '#c9b48e', trim = '#6a5340', H = 262;
    body(wall, trim, H);
    slab(0,W, H, H+10, -1, -12, shade(wall,.7));
    F(0,W, 0, 118, shade(wall,.55), null,0, 1);
    for(let i=0;i<4;i++) cyl(W*i/3, -8, 0, 118, 11, shade(wall,1.02));
    for(let i=0;i<3;i++){
      const x0 = W*i/3+11, x1 = W*(i+1)/3-11;
      const ap = (t,bb) => {
        const u=1-t, a = u*u*x0 + 2*u*t*((x0+x1)/2) + t*t*x1;
        const z = u*u*92 + 2*u*t*136 + t*t*92;
        return P(a,bb,z);
      };
      ctx.beginPath(); let q=ap(0,-7); ctx.moveTo(q.x,q.y);
      for(let k=1;k<=12;k++){ q=ap(k/12,-7); ctx.lineTo(q.x,q.y); }
      ctx.closePath(); ctx.fillStyle=shade(wall,1.02); ctx.fill();
      for(let k=0;k<12;k++) poly([ap(k/12,-7),ap((k+1)/12,-7),ap((k+1)/12,2),ap(k/12,2)], shade(wall,.86));
      const ip = (t,bb) => {
        const u=1-t, a = u*u*(x0+5) + 2*u*t*((x0+x1)/2) + t*t*(x1-5);
        const z = u*u*92 + 2*u*t*128 + t*t*92;
        return P(a,bb,z);
      };
      ctx.beginPath(); q=ip(0,2); ctx.moveTo(q.x,q.y);
      for(let k=1;k<=12;k++){ q=ip(k/12,2); ctx.lineTo(q.x,q.y); }
      ctx.closePath(); ctx.fillStyle='#3f342a'; ctx.fill();
      /* the only shop in the 81 where a row of three real doors fits:
       centres at W/6, W/2 and 5W/6 give 66.24-wide leaves with ten
       units of pier between them. */
    shopDoor((x0+x1)/2, wall, trim, 'rgba(63,52,42,.5)');
    }
    slab(0,W, 118, 132, -1, -10, shade(wall,.86));
    for(let fl=0; fl<2; fl++){
      const z0 = 148 + fl*54;
      for(let i=0;i<5;i++){
        const x0 = 12+(W-24)*(i+0.16)/5, x1 = 12+(W-24)*(i+0.84)/5;
        slab(x0-3,x1+3, z0-3, z0+39, -1, -8, trim);
        F(x0,x1, z0, z0+36, '#7a8a92', null,0,-8.5);
        F(x0,x1, z0+17, z0+20, trim, null,0,-9);
        F(x0+(x1-x0)/2-1.4, x0+(x1-x0)/2+1.4, z0, z0+36, trim, null,0,-9);
      }
    }
    if(state.props){
      const gx0 = W*0.42, gx1 = W*0.58;
      for(let i=0;i<6;i++) cyl(gx0 + (gx1-gx0)*i/5, 4, 0, 74, 1.6, trim);
      tube(gx0, 4, 74, gx1, 4, 74, 1.6, trim);
      tube(gx0, 4, 36, gx1, 4, 36, 1.2, trim);
    }
    if(state.roof){
      for(let i=0;i<3;i++){
        const da = W*0.18 + i*W*0.32, db = -34;
        F(da-20,da+20, H+10, H+46, shade(wall,1.02), shade(wall,.76), 2, db);
        poly([P(da+20,db,H+10),P(da+20,db-26,H+10),P(da+20,db-26,H+40),P(da+20,db,H+46)], shade(wall,.84));
        poly([P(da-20,db,H+10),P(da-20,db-26,H+10),P(da-20,db-26,H+40),P(da-20,db,H+46)], shade(wall,.9));
        F(da-11,da+11, H+18, H+40, '#7a8a92', null,0, db-0.6);
        poly([P(da-25,db,H+46),P(da,db,H+70),P(da+25,db,H+46)], trim);
        poly([P(da+25,db,H+46),P(da,db,H+70),P(da,db-26,H+62),P(da+25,db-26,H+40)], shade(trim,.8));
      }
      for(const ca of [W*0.06, W*0.94]){
        box(ca-16, ca+16, -150, -110, H, H+56, '#a86a52','#b8785e','#96604a');
        slab(ca-19, ca+19, H+56, H+62, -108, -152, '#8f5540');
        for(let k=0;k<2;k++) cyl(ca-8+k*16, -130, H+62, H+76, 5, '#4a3a30');
      }
    }
    kerb(p,'none');
  }
}
];
