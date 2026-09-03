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


const SHOPS = [
{
  name:'Bakery', head:'Curved gable, brick flue, bunting on the arch',
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
      b: -7 - (i%2)*7, z: 0,
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
    reveal(12, W*0.78, 0, 112, 42, '#3a2a22');
    slab(12,W*0.78, 58, 74, 24, 8, '#c9b48e', shade(wall,.75), '#d8c49a');
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
       face on 21, just inside the canopy, and a step of 28 puts the
       last centre at 144 with its far face on 155, just short of the
       door. Gaps come out at 6 and identical, which is what makes it
       read as arranged. b + r is 27, still inside the canopy's 30. */
    depthSort([0,1,2,3,4].map(i => ({
      b: 16, z: 0,
      draw: () => cyl(32+i*28, 16, 74, 92, 11, ['#c2452e','#d8a12a','#5c8a3a'][i%3])
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
        { b: 30, z: 0, draw: () => {
            box(14,68, 8,30, 0,22, '#c98a4a','#a9703a','#8f5e31');
            for(let i=0;i<3;i++) cyl(26+i*17, 19, 22, 34, 7, ['#c2452e','#5c8a3a','#d8a12a'][i]); } },
        { b: 30, z: 0, draw: () => {
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
  tags:['counter behind glass','solid cross emblem','green fascia','clinical white','planters'],
  desc:'A counter and a wall of shelved bottles sit inside the reveal with the pane over them, so the shop has depth behind the window rather than a flat tinted sheet.',
  draw(p){ drawChemist(p, CHEMIST_LIVERY.green); }
},
{
  name:'Pharmacy', head:'Stepped parapet, cross emblem, red livery',
  tags:['counter behind glass','solid cross emblem','red fascia','clinical white','planters'],
  desc:'A counter and a wall of shelved bottles sit inside the reveal with the pane over them, so the shop has depth behind the window rather than a flat tinted sheet.',
  draw(p){ drawChemist(p, CHEMIST_LIVERY.red); }
},
{
  name:'Record shop', head:'Blacked-out front, marquee, poster wall',
  tags:['racks inside','angled marquee','poster grid','bulb row','A-board'],
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
    for(let i=0;i<7;i++) ball(14+(W-28)*(i+0.5)/7, out-3, 133, 4, '#ffe9a8');
    slab(20,W-20, H-40, H-14, -1, -8, '#f2ece0');
    if(state.props){
      poly([P(W*0.08,26,0),P(W*0.30,26,0),P(W*0.30,40,52),P(W*0.08,40,52)], '#1a1a22');
      poly([P(W*0.08,54,0),P(W*0.30,54,0),P(W*0.30,40,52),P(W*0.08,40,52)], '#2c2c36');
      poly([P(W*0.30,26,0),P(W*0.30,54,0),P(W*0.30,40,52)], '#111118');
      for(let i=0;i<3;i++)
        poly([P(W*0.11,26+(i*2), 12+i*12),P(W*0.27,26+(i*2),12+i*12),
              P(W*0.27,33+(i*2),15+i*12),P(W*0.11,33+(i*2),15+i*12)],
             ['#e0483c','#e8c34a','#4aa3e0'][i]);
    }
    if(state.roof){
      box(W*0.50,W*0.78,-150,-100,H,H+24,'#8f969d','#787f86','#697077');
      tube(W*0.24,-90,H+14, W*0.24,-90,H+70, 2, '#6d747c');
    }
    kerb(p,'none');
  }
},
{
  name:'Noodle bar', head:'Vertical banners, lantern row, counter',
  tags:['stools under the counter','round lanterns','open counter','steam duct','banners'],
  desc:'The counter is a solid with a bar top, the cook side is set back behind it, and the stools stand on the pavement in front — so the three depths read in the right order.',
  draw(p){
    const wall = '#8f2320', trim = '#f2d98c', H = 160;
    body(wall, trim, H);
    slab(0,W, H, H+12, -1, -10, shade(wall,.6));
    slab(0,W, H+12, H+18, -1, -10, trim);
    reveal(14, W*0.70, 0, 96, 44, '#2a1a18');
    slab(14,W*0.70, 58, 72, 22, 4, '#d9c49a', shade(wall,.6), '#e6d2a8');
    shopDoor(W*0.85, wall, shade(wall,.7), 'rgba(232,217,189,.6)');
    for(const [x,col] of [[W*0.06,trim],[W*0.86,'#f2ece0']]){
      slab(x-9,x+9, 84, H-6, -2, -12, col, shade(col,.7));
      for(let i=0;i<4;i++) F(x-5,x+5, 96+i*17, 106+i*17, shade(wall,.8), null,0,-2.5);
    }
    for(let i=0;i<4;i++){
      const la = 24+(W*0.62)*i/3.2, lb = 16;
      tube(la, lb, 126, la, lb, 112, 0.8, '#5a4636');
      cyl(la, lb, 96, 112, 11, '#e2564a', '#ef6a5c');
      plateCircle(la, lb, 96, 8, '#c0392f');
      cyl(la, lb, 92, 96, 5, trim);
      cyl(la, lb, 112, 115, 5, trim);
    }
    if(state.props){
      depthSort([0,1,2].map(i => ({
        b: 26, z: 0,
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
  name:'Hardware', head:'Tall board sign, ladder rack, roof hoist',
  tags:['goods behind the shutter','ladder rack','roll shutter','hoist beam','stacked stock'],
  desc:'The shutter is half up with the shop visible under it, so there is a lit interior behind the opening, and the stock outside is stacked far to near.',
  draw(p){
    const wall = '#c9962f', trim = '#3a3327', H = 180;
    body(wall, trim, H);
    slab(0,W, H, H+10, -1, -12, trim);
    slab(6,W-6, 110, H-10, -1, -10, shade(wall,1.12), null, shade(wall,.9));
    for(let i=0;i<3;i++) F(18,W-18, 122+i*22, 134+i*22, shade(trim,1.6), null,0,-10.5);
    /* the shutter used to run to W*0.72 and the ladders leaned at
       W*0.752, both of which the real door now occupies -- it is 66
       wide and its midpoint clamps to W - 38. Shutter pulled back to
       W*0.62 and the ladders moved to the left end, where they lean on
       the shopfront instead of standing in the doorway. */
    reveal(12, W*0.62, 0, 102, 40, '#4a4238');
    F(12,W*0.62, 46, 102, '#8c8676', shade(trim,1.3), 2, -1);      // shutter, half down
    for(let i=0;i<6;i++) F(14,W*0.62-2, 50+i*9, 55+i*9, '#a09a88', null,0,-2);
    slab(12,W*0.62, 40, 48, -2, -9, trim);
    shopDoor(W*0.86, wall, trim);
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
      depthSort([
        { b: 40, z: 0, draw: () => box(20,74,8,40,0,18,'#6f665a','#5d5548','#4e473c') },
        { b: 34, z: 0, draw: () => box(24,60,12,34,18,32,'#8a8272','#75705f','#635e50') },
        { b: 22, z: 0, draw: () => { for(let i=0;i<3;i++) cyl(30+i*16, 22, 32, 46, 6, ['#7d838a','#8c8676','#6f665a'][i]); } }
      ]);
    }
    if(state.roof){
      const ha = W*0.43;
      slab(ha-6, ha+6, H+10, H+58, -2, -14, trim);
      poly([P(ha-6,-2,H+56),P(ha-6,58,H+46),P(ha-6,58,H+34),P(ha-6,-2,H+44)], shade(trim,1.3));
      poly([P(ha-6,-2,H+56),P(ha+6,-2,H+56),P(ha+6,58,H+46),P(ha-6,58,H+46)], shade(trim,1.6));
      poly([P(ha+6,-2,H+56),P(ha+6,58,H+46),P(ha+6,58,H+34),P(ha+6,-2,H+44)], shade(trim,1.1));
      tube(ha, 20, H+50, ha, -2, H+18, 2.4, shade(trim,1.2));
      tube(ha, 52, H+40, ha, 52, H+4, 1.4, '#6d747c');
      const hk = P(ha,52,H+2);
      ctx.strokeStyle='#6d747c'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.arc(hk.x,hk.y,6*K,0.5,5.0); ctx.stroke();
      box(W*0.62,W*0.88,-150,-100,H,H+22,'#8f969d','#787f86','#697077');
    }
    kerb(p,'none');
  }
},
{
  name:'Florist', head:'Scalloped canopy, bucket rows, trellis',
  tags:['blooms inside and out','round buckets','trellis','glazed over','soft palette'],
  desc:'There are flowers inside the window as well as out on the pavement, and the pane glazes over the inside ones so the two sets sit at different depths instead of on the same plane.',
  draw(p){
    const wall = '#eef0e6', trim = '#4f7a4a', H = 156;
    body(wall, trim, H);
    slab(0,W, H, H+10, -1, -10, trim);
    reveal(12, W*0.66, 16, 104, 13, '#8fae9c');
    F(18, W*0.60, 40, 46, '#dfe6d2', null,0, 1.6);                 // painted shelf line
    glaze(12, W*0.66, 16, 104, null);
    slab(8, W*0.66+4, 100, 108, -1, -9, shade(trim,1.25));
    shopDoor(W*0.83, wall, trim, 'rgba(150,200,180,.5)');
    slab(8,W-8, 108, 132, -1, -9, trim);
    F(22,W-22, 113, 127, '#f4f6ee', null,0,-9.5);
    const cz = 136, out = 34;
    poly([P(4,0,cz+16),P(W-4,0,cz+16),P(W-4,out,cz),P(4,out,cz)], '#dfe6d2');
    poly([P(4,0,cz+6),P(W-4,0,cz+6),P(W-4,out,cz-10),P(4,out,cz-10)], shade('#dfe6d2',.8));
    poly([P(4,0,cz+16),P(4,out,cz),P(4,out,cz-10),P(4,0,cz+6)], shade(trim,1.5));
    poly([P(W-4,0,cz+16),P(W-4,out,cz),P(W-4,out,cz-10),P(W-4,0,cz+6)], shade(trim,1.5));
    for(let i=0;i<9;i++){
      const x0=4+(W-8)*i/9, x1=4+(W-8)*(i+1)/9, m=P((x0+x1)/2,out,cz-12);
      const l=P(x0,out,cz), r=P(x1,out,cz);
      ctx.beginPath(); ctx.moveTo(l.x,l.y);
      ctx.quadraticCurveTo(m.x,m.y+6,r.x,r.y); ctx.closePath();
      ctx.fillStyle = i%2 ? '#dfe6d2' : trim; ctx.fill();
    }
    for(let i=0;i<6;i++) F(W*0.675,W*0.695, 18+i*22, 21+i*22, shade(trim,1.2), null,0,-2);
    for(let i=0;i<2;i++) F(W*0.672+i*0.016*W, W*0.678+i*0.016*W, 18,150, shade(trim,1.2), null,0,-2);
    for(let i=0;i<7;i++) ball(W*0.686, -3, 26+i*18, 5, ['#d98a9e','#e8c34a','#f4f6ee'][i%3]);
    if(state.props){
      depthSort([0,1,2,3,4].map(i => ({
        b: 22 + (i%2)*10, z: 0,
        draw: () => {
          const ba = 18+i*26, bb = 22 + (i%2)*10;
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
    S(W-R,-D,-D+1,0,H, shade(wall,.78));
    F(0,W-R,0,H, wall);
    F(0,W-R,0,16, shade(wall,.66), null,0,-0.5);
    // the streamlined end as a genuine cylinder
    cyl(W-R, -R, 0, H, R, wall);
    plateCircle(W-R, -R, H, R, shade(trim,1.05), shade(trim,.8), 2);
    slab(0,W-R, H, H+8, -1, -12, trim);
    plateCircle(W-R, -R, H+8, R, trim, shade(trim,.8), 2);
    // chrome bands, wrapped round the curve as short surface quads
    const band = (z0,z1,col) => {
      F(0,W-R, z0, z1, col, null,0,-0.6);
      for(let k=0;k<8;k++){
        const t0 = 3*Math.PI/4 - Math.PI*k/8, t1 = 3*Math.PI/4 - Math.PI*(k+1)/8;
        poly([P(W-R+R*Math.cos(t0), -R+R*Math.sin(t0), z0),
              P(W-R+R*Math.cos(t1), -R+R*Math.sin(t1), z0),
              P(W-R+R*Math.cos(t1), -R+R*Math.sin(t1), z1),
              P(W-R+R*Math.cos(t0), -R+R*Math.sin(t0), z1)], col);
      }
    };
    band(H-16, H-8, '#c9ccd0');
    band(26, 34, '#c9ccd0');
    band(0, 26, '#3b6e75');
    for(let i=0;i<12;i++) F(i*(W/12), i*(W/12)+1.5, 0, 26, shade('#3b6e75',.7), null,0,-0.8);
    F(10,W-R-8, 40, 104, '#7fb0c4', shade(wall,.62), 3);
    for(let i=0;i<4;i++) F(10+(W-R-18)*(i+1)/5-1.5, 10+(W-R-18)*(i+1)/5+1.5, 40, 104, shade(wall,.6), null,0,-1);
    for(let i=0;i<5;i++) faceCircle(24+i*30, -3, 58, 8, '#c2452e', '#8f2f22', 2);
    /* door set INTO the curve: drawn as surface quads following the
       cylinder, so it wraps instead of hanging flat off the front */
    for(let k=0;k<5;k++){
      const t0 = 0.10 - 0.62*k/5, t1 = 0.10 - 0.62*(k+1)/5;
      poly([P(W-R+R*Math.cos(t0), -R+R*Math.sin(t0), 0),
            P(W-R+R*Math.cos(t1), -R+R*Math.sin(t1), 0),
            P(W-R+R*Math.cos(t1), -R+R*Math.sin(t1), 108),
            P(W-R+R*Math.cos(t0), -R+R*Math.sin(t0), 108)], shade(wall,.80));
      poly([P(W-R+R*Math.cos(t0), -R+R*Math.sin(t0), 16),
            P(W-R+R*Math.cos(t1), -R+R*Math.sin(t1), 16),
            P(W-R+R*Math.cos(t1), -R+R*Math.sin(t1), 96),
            P(W-R+R*Math.cos(t0), -R+R*Math.sin(t0), 96)], '#7fb0c4');
    }
    if(state.roof){
      const sa = W*0.40, sb = -34;
      for(const la of [sa-56, sa+56]) cyl(la, sb, H+8, H+40, 4, '#9aa0a6');
      slab(sa-62, sa+62, H+40, H+86, sb+8, sb-8, trim, null, shade(trim,1.2));
      F(sa-54, sa+54, H+48, H+78, '#f2e6cc', null,0, sb+8.5);
      box(W*0.06,W*0.24,-120,-70,H,H+26,'#9aa0a6','#7d838a','#6a7076');
    }
    kerb(p,'none');
  }
},
{
  name:'Cinema', tall:true,
  head:'Blade tower, wrapping marquee, poster cases',
  tags:['solid blade tower','deep marquee','poster cases','roof letters','tallest unit'],
  desc:'The blade tower is a box with a returned side and a capped top, and the marquee is a full wedge with an underside and end returns. The roof letters stand as solids rather than as painted strips.',
  draw(p){
    const wall = '#2b2f45', trim = '#e8b23a', H = 210;
    body(wall, trim, H);
    slab(0,W, H, H+12, -1, -14, shade(wall,1.4));
    // blade tower with real depth
    const t0 = W*0.08, t1 = W*0.34, tb = -2, tk = -26;
    slab(t0,t1, H+12, H+150, tb, tk, shade(wall,1.25), shade(wall,1.0), shade(wall,1.5));
    for(let i=0;i<6;i++) F(t0+8,t1-8, H+24+i*20, H+38+i*20, i%2?trim:'#f2ece0', null,0, tb-0.6);
    slab(t0-4,t1+4, H+150, H+168, tb, tk, trim);
    ball((t0+t1)/2, (tb+tk)/2, H+182, 8, trim);
    // marquee: top, front edge, underside, returns
    const m0 = 2, m1 = W-2, out = 54;
    poly([P(m0,0,132),P(m1,0,132),P(m1,out,158),P(m0,out,158)], trim);
    poly([P(m0,out,158),P(m1,out,158),P(m1,out,138),P(m0,out,138)], shade(trim,.75));
    poly([P(m0,0,114),P(m1,0,114),P(m1,out,138),P(m0,out,138)], shade(wall,1.5));
    poly([P(m0,0,132),P(m0,out,158),P(m0,out,138),P(m0,0,114)], shade(trim,.6));
    poly([P(m1,0,132),P(m1,out,158),P(m1,out,138),P(m1,0,114)], shade(trim,.6));
    for(let i=0;i<10;i++) ball(8+(W-16)*(i+0.5)/10, out-4, 137, 4.5, '#fff3c4');
    slab(12,W-12, 104, 128, -1, -9, '#f2ece0');
    for(let i=0;i<3;i++) F(24+i*44, 56+i*44, 110, 122, shade(wall,1.1), null,0,-9.5);
    for(let i=0;i<2;i++) slab(14+i*54, 54+i*54, 24, 92, -1, -8, ['#c2452e','#3b6e75'][i], null, '#f2ece0');
    shopDoor(W*0.78, shade(wall,1.3), trim);
    F(W*0.60,W*0.76, 12, 92, '#1a1d2b', null,0,-8.5);
    F(W*0.80,W*0.96, 12, 92, '#1a1d2b', null,0,-8.5);
    if(state.roof){
      for(let i=0;i<3;i++)
        slab(W*0.44+i*24, W*0.44+i*24+16, H+12, H+52, -52, -68, trim, shade(trim,.75), shade(trim,1.2));
      box(W*0.70,W*0.94,-150,-110,H,H+22,'#8f969d','#787f86','#697077');
    }
    kerb(p,'none');
  }
},
{
  name:'Rooming house', tall:true,
  head:'Fire escape, projecting canopy, upper windows',
  tags:['fire escape','entrance canopy','three ranks of windows','roof sign frame','stoop'],
  desc:'The fire escape is built from real members — platform slabs, tube handrails and a diagonal stringer for each flight — instead of a flat grey patch on the flank.',
  draw(p){
    const wall = '#9a6b52', trim = '#e8ddc8', H = 226;
    body(wall, trim, H);
    slab(0,W, H, H+10, -1, -12, shade(wall,.7));
    slab(0,W, 96, 104, -1, -6, shade(wall,.72));
    for(let r=0;r<3;r++) for(let c=0;c<4;c++){
      const x0 = 14+(W-28)*(c+0.12)/4, x1 = 14+(W-28)*(c+0.88)/4, z0 = 116+r*38;
      F(x0-3,x1+3, z0-3, z0+29, trim, null,0,-1);
      F(x0,x1, z0, z0+26, '#5d7f92', null,0,-2);
      slab(x0-5,x1+5, z0-6, z0-3, -1, -8, shade(trim,.86));      // cill with depth
    }
    F(10,W*0.52, 20, 88, '#6b93a8', trim, 3);
    shopDoor(W*0.71, wall, trim);
    F(W*0.62,W*0.80, 44, 84, '#6b93a8', null,0,-6.5);
    // entrance canopy: top, underside, returns, on round posts
    poly([P(W*0.54,0,98),P(W*0.88,0,98),P(W*0.88,36,92),P(W*0.54,36,92)], trim);
    poly([P(W*0.54,0,92),P(W*0.88,0,92),P(W*0.88,36,86),P(W*0.54,36,86)], shade(trim,.78));
    poly([P(W*0.54,0,98),P(W*0.54,36,92),P(W*0.54,36,86),P(W*0.54,0,92)], shade(trim,.62));
    poly([P(W*0.88,0,98),P(W*0.88,36,92),P(W*0.88,36,86),P(W*0.88,0,92)], shade(trim,.62));
    cyl(W*0.565, 32, 0, 90, 3, '#7d838a');
    cyl(W*0.865, 32, 0, 90, 3, '#7d838a');
    if(state.props){
      // fire escape as real members on the flank
      for(let i=0;i<3;i++){
        const z = 112+i*38, b0 = -58, b1 = -6;
        poly([P(W,b0,z),P(W,b1,z),P(W+1,b1,z),P(W+1,b0,z)], '#4a4f55');
        S(W+1, b0, b1, z, z+3, '#5a6068');                        // platform edge
        S(W+1, b0, b1, z+3, z+22, 'rgba(90,96,104,.42)');         // rail infill
        for(let j=0;j<5;j++) S(W+1, b0+4+j*12, b0+6+j*12, z+3, z+22, '#5a6068');
        S(W+1, b0, b1, z+21, z+24, '#6a7076');                    // handrail
        // stringer down to the platform below
        if(i>0){
          const q0 = P(W+1, b1-4, z), q1 = P(W+1, b1-30, z-38);
          ctx.strokeStyle='#5a6068'; ctx.lineWidth=4;
          ctx.beginPath(); ctx.moveTo(q0.x,q0.y); ctx.lineTo(q1.x,q1.y); ctx.stroke();
          ctx.lineWidth=1.6;
          for(let k=1;k<6;k++){
            const t=k/6;
            const s0=P(W+1, b1-4-26*t, z-38*t), s1=P(W+1, b1-14-26*t, z-38*t+3);
            ctx.beginPath(); ctx.moveTo(s0.x,s0.y); ctx.lineTo(s1.x,s1.y); ctx.stroke();
          }
        }
      }
    }
    if(state.roof){
      cyl(W*0.22, -40, H+10, H+56, 3, '#6d747c');
      cyl(W*0.64, -40, H+10, H+56, 3, '#6d747c');
      slab(W*0.18,W*0.68, H+40, H+56, -36, -44, 'rgba(120,127,134,.45)', '#6d747c');
      box(W*0.30,W*0.52,-160,-120,H,H+28,'#8b6a4e','#7a5c44','#6a5039');
    }
    kerb(p,'stoop');
  }
},
{
  name:'Fishmonger', head:'Sloped ice display, tiled front, gull',
  tags:['sloped ice bed','white tile','open display','bracket sign','gull on the parapet'],
  desc:'The ice bed is a slab with a real edge thickness and a front fascia, the fish are rounded solids lying in it, and the bracket sign hangs off an arm with its own return.',
  draw(p){
    const wall = '#eef2f3', trim = '#2f6f8f', H = 148;
    body(wall, trim, H);
    slab(0,W, H, H+10, -1, -12, trim);
    for(let i=0;i<10;i++) F(i*(W/10), i*(W/10)+1.6, 16,96, shade(wall,.9), null,0,-1);
    for(let r=0;r<4;r++) F(0,W, 16+r*20, 17.6+r*20, shade(wall,.9), null,0,-1);
    slab(6,W*0.74, 0, 16, -1, 40, trim);
    // ice bed: sloping top, front fascia, and a thickness at the lip
    poly([P(8,0,96),P(W*0.74,0,96),P(W*0.74,40,62),P(8,40,62)], '#dfeef2');
    poly([P(8,40,62),P(W*0.74,40,62),P(W*0.74,40,48),P(8,40,48)], shade(trim,1.25));
    poly([P(8,0,96),P(8,40,62),P(8,40,48),P(8,0,82)], shade(trim,.95));
    poly([P(W*0.74,0,96),P(W*0.74,40,62),P(W*0.74,40,48),P(W*0.74,0,82)], shade(trim,.95));
    for(let i=0;i<7;i++){
      const t=(i+0.5)/7, aa = 8+(W*0.74-8)*t, bb = 10+((i%3)*9), zz = 88-((i%3)*7);
      ball(aa, bb, zz, 6, ['#9fb6c2','#c2907e','#8fa8b8'][i%3]);
      ball(aa+7, bb+2, zz-1, 4.4, ['#9fb6c2','#c2907e','#8fa8b8'][i%3]);
      poly([P(aa-8,bb,zz),P(aa-14,bb,zz+5),P(aa-14,bb,zz-5)], shade(['#9fb6c2','#c2907e','#8fa8b8'][i%3],.8));
    }
    shopDoor(W*0.87, wall, trim);
    F(W*0.82,W-12, 50, 90, '#7fb0c4', null,0,-6.5);
    slab(4,W-4, 104, 130, -1, -9, trim);
    F(16,W-16, 110, 124, '#eef2f3', null,0,-9.5);
    // bracket sign: arm with a return, board hanging clear of the wall
    cyl(W*0.08, -4, 116, 132, 2, '#4a4f55');
    tube(W*0.08, -4, 130, W*0.08, -30, 130, 2, '#4a4f55');
    slab(W*0.02,W*0.20, 86, 116, -28, -34, trim, null, shade(trim,1.3));
    F(W*0.045,W*0.175, 92, 110, '#eef2f3', null,0,-28.5);
    if(state.roof){
      box(W*0.34,W*0.58,-130,-88,H,H+22,'#9aa0a6','#7d838a','#6a7076');
      if(state.props){
        const ga = W*0.86, gb = -6;
        ball(ga, gb, H+22, 7, '#f4f6f7');
        ball(ga-6, gb, H+28, 4.4, '#f4f6f7');
        poly([P(ga-9,gb,H+29),P(ga-14,gb,H+28),P(ga-9,gb,H+26)], '#e8a13a');
        poly([P(ga+4,gb,H+22),P(ga+13,gb,H+26),P(ga+6,gb,H+18)], '#dfe3e6');
        cyl(ga, gb, H+14, H+17, 1.4, '#8f969d');
      }
    }
    kerb(p,'none');
  }
},
{
  name:'Garage', head:'Twin roller bays, pylon sign, turbine vents',
  tags:['two vehicle bays','round pylon post','tyre stacks','turbine vents','oil drums'],
  desc:'Turbines are cylinders with the fan as a flat disc on top, tyres are stacked cylinders rather than flat ovals, and the pylon stands on a round post with a two-sided sign box.',
  draw(p){
    const wall = '#3f4a52', trim = '#e8a13a', H = 158;
    body(wall, trim, H);
    slab(0,W, H, H+10, -1, -12, trim);
    slab(0,W, H-30, H-8, -1, -8, shade(wall,1.3));
    F(16,W-16, H-26, H-12, trim, null,0,-8.5);
    /* the two roller bays ran 12..W-12, the whole frontage, so there was
       nowhere for a person to get in -- a garage with no pedestrian
       door. The bays now share the left three quarters and the door
       takes the end. */
    const bayR = W*0.70;
    for(let i=0;i<2;i++){
      const x0 = 12+i*(bayR-24)/2+ (i?6:0), x1 = 12+(i+1)*(bayR-24)/2 - (i?0:6);
      F(x0-4,x1+4, 0, H-38, shade(wall,.72), null,0, 1);
      F(x0,x1, 0, H-46, '#8c9298', shade(wall,1.4), 2, -1);
      for(let j=0;j<9;j++) F(x0+2,x1-2, 6+j*12, 12+j*12, '#a2a8ae', null,0,-2);
      slab(x0-4,x1+4, H-46, H-38, -2, -9, trim);
    }
    shopDoor(W*0.85, wall, trim);
    if(state.props){
      for(let i=0;i<4;i++) cyl(W+34, 26, i*11, i*11+11, 17, i%2?'#2b2f33':'#33383d');
      cyl(W+22, 56, 0, 34, 14, '#c2452e');
      plateCircle(W+22, 56, 34, 14, '#a53a26', '#8d3120', 2);
      cyl(W*0.08, 64, 0, 120, 5, '#7d838a');
      slab(W*0.0, W*0.20, 120, 168, 60, 70, trim, shade(wall,.8), shade(trim,1.2));
      for(let i=0;i<3;i++) F(W*0.03, W*0.17, 128+i*15, 140+i*15, shade(wall,.8), null,0, 59.5);
    }
    if(state.roof){
      for(const aa of [W*0.24, W*0.56]){
        cyl(aa, -110, H+10, H+26, 9, '#8f969d');
        cyl(aa, -110, H+26, H+34, 13, '#b6bcc2');
        plateCircle(aa, -110, H+34, 13, '#c8ced4', '#8f969d', 2);
        for(let k=0;k<6;k++){
          const t=k*1.047;
          poly([P(aa,-110,H+35),
                P(aa+13*Math.cos(t), -110+13*Math.sin(t), H+35),
                P(aa+13*Math.cos(t+0.5), -110+13*Math.sin(t+0.5), H+35)], '#a8aeb4');
        }
      }
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
    F(10,WW*0.58, 22, 116, '#8a94a8', trim, 3);
    if(state.props){
      for(let i=0;i<2;i++){
        const ma = 26+i*40, mb = -4;
        cyl(ma, mb, 26, 34, 4, '#8a8272');                     // stand
        cyl(ma, mb, 34, 86, 8, ['#d8c48a','#c2807e'][i]);      // torso
        cyl(ma, mb, 86, 92, 5, ['#d8c48a','#c2807e'][i]);
        ball(ma, mb, 98, 6, '#e8ddc8');
      }
    }
    shopDoor(WW*0.80, wall, trim, 'rgba(138,148,168,.6)', WW);
    slab(6,WW-6, 120, 146, -1, -9, shade(wall,.6));
    F(18,WW-18, 126, 140, trim, null,0,-9.5);
    poly([P(8,0,118),P(WW*0.60,0,118),P(WW*0.60,24,100),P(8,24,100)], trim);
    poly([P(8,24,100),P(WW*0.60,24,100),P(WW*0.60,24,92),P(8,24,92)], shade(trim,.7));
    poly([P(WW*0.60,0,118),P(WW*0.60,24,100),P(WW*0.60,24,92),P(WW*0.60,0,110)], shade(wall,.6));
    // clock: arm out from the wall, face in the arm's plane
    tube(WW*0.79, -2, 114, WW*0.79, -22, 114, 1.6, '#4a4f55');
    faceCircle(WW*0.79, -22, 110, 14, '#f2ece0', shade(trim,.7), 3);
    faceT(WW*0.79, -22.4, 110, 14);
    ctx.strokeStyle='#3a3327'; ctx.lineWidth=2/(14*K);
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,-0.6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0.45,0.15); ctx.stroke();
    ctx.restore();
    if(state.roof) box(WW*0.28,WW*0.56,-140,-100,H,H+20,'#9aa0a6','#7d838a','#6a7076');
    kerb(p,'none');
  }
},
{
  name:'Cantina', head:'Pergola porch, string bulbs, chimney',
  tags:['round pergola posts','string bulbs','half doors','barrels','stucco chimney'],
  desc:'Pergola posts are turned cylinders with the beam sitting on them, the barrels are hooped cylinders standing on the pavement, and the chimney gets a clay pot.',
  draw(p){
    const wall = '#d9a05b', trim = '#7a4a2e', H = 152, pb = 52;
    body(wall, trim, H);
    slab(0,W, H, H+12, -1, -12, shade(wall,.62));
    slab(0,W, H-12, H, -1, -6, shade(wall,1.08));
    F(14,W*0.54, 24, 100, '#5d4a3a', shade(wall,.6), 3);
    F(20,W*0.48, 32, 64, shade(wall,1.15), null,0,-1);
    shopDoor(W*0.75, wall, '#6b4a30');
    F(W*0.60,W*0.90, 40, 44, shade(wall,.7), null,0,-6.5);
    F(W*0.745,W*0.755, 44, 96, shade(wall,.7), null,0,-6.5);
    for(const aa of [10, W*0.50, W-10]) cyl(aa, pb, 0, 118, 5, '#6b4a30');
    poly([P(6,pb,118),P(W-6,pb,118),P(W-6,pb,106),P(6,pb,106)], '#7a5638');
    poly([P(6,0,124),P(W-6,0,124),P(W-6,pb,118),P(6,pb,118)], 'rgba(122,86,56,.55)');
    for(let i=0;i<11;i++){
      const aa = 10+(W-20)*i/10;
      poly([P(aa-3,0,124),P(aa+3,0,124),P(aa+3,pb,118),P(aa-3,pb,118)], '#8a6440');
      poly([P(aa-3,0,124),P(aa-3,pb,118),P(aa-3,pb,114),P(aa-3,0,120)], '#7a5638');
    }
    if(state.props){
      for(let i=0;i<8;i++){
        const ba = 16+(W-32)*i/7;
        tube(ba, pb-4, 110, ba, pb-4, 104, 0.7, '#5d4a3a');
        ball(ba, pb-4, 100, 5, '#ffe9a8');
      }
      for(const [ba,bb] of [[W+20,34],[W+52,48]]){
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
  name:'Newsstand', head:'Low kiosk, wide canopy, paper racks',
  tags:['half height','small footprint','wide overhang','paper racks','scale contrast'],
  desc:'The canopy has an underside and returns and rests on round posts, and the paper racks are sloped trays with a real lip rather than tilted cards.',
  draw(p){
    const wall = '#2f6350', trim = '#e8c34a', H = 104, WW = 150, DD = 120;
    body(wall, trim, H, WW, DD);
    slab(0,WW, H, H+8, -1, -10, trim);
    F(10,WW-10, 34, 88, '#1e3d33', shade(trim,.8), 3);
    slab(10,WW-10, 84, 92, -1, -7, trim);
    const c0 = -34, c1 = WW+34, out = 58;
    poly([P(c0,0,H+8),P(c1,0,H+8),P(c1,out,H-8),P(c0,out,H-8)], trim);
    poly([P(c0,out,H-8),P(c1,out,H-8),P(c1,out,H-20),P(c0,out,H-20)], shade(trim,.75));
    poly([P(c0,0,H-4),P(c1,0,H-4),P(c1,out,H-20),P(c0,out,H-20)], shade(trim,.6));
    poly([P(c0,0,H+8),P(c0,out,H-8),P(c0,out,H-20),P(c0,0,H-4)], shade(trim,.55));
    poly([P(c1,0,H+8),P(c1,out,H-8),P(c1,out,H-20),P(c1,0,H-4)], shade(trim,.55));
    for(const aa of [c0+6, c1-6]) cyl(aa, out-4, 0, H-14, 3, '#7d838a');
    if(state.props){
      for(let i=0;i<3;i++){
        const z = 22+i*22;
        poly([P(-30,10,z+18),P(-4,10,z+18),P(-4,34,z+8),P(-30,34,z+8)], '#e8e3d6');
        poly([P(-30,34,z+8),P(-4,34,z+8),P(-4,34,z+3),P(-30,34,z+3)], '#c2bcac');
        for(let j=0;j<3;j++)
          poly([P(-28+j*8,11,z+17),P(-22+j*8,11,z+17),P(-22+j*8,33,z+7),P(-28+j*8,33,z+7)],
               ['#c2452e','#3b6e75','#e8c34a'][j]);
      }
      for(let i=0;i<4;i++) slab(WW+6+i*9, WW+12+i*9, 24, 74, 22, 18,
        ['#c2452e','#e8c34a','#3b6e75','#e8e3d6'][i]);
      F(WW*0.30,WW*0.70, 92, 100, '#f2ece0', null,0,-7.5);
    }
    if(state.roof) box(WW*0.30,WW*0.62,-70,-40,H+8,H+20,'#8f969d','#787f86','#697077');
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
    slab(0,W, H-14, H, -1, -6, '#fbf3f5');
    F(12,W*0.62, 30, 92, '#bcdde2', shade(trim,.85), 3);
    slab(12,W*0.62, 88, 98, -1, -7, trim);
    F(18,W*0.56, 36, 52, '#fbf3f5', null,0,-1);
    shopDoor(W*0.84, wall, trim);
    F(W*0.72,W-16, 48, 86, '#bcdde2', null,0,-6.5);
    const cz=104, out=32;
    poly([P(4,0,cz+18),P(W-4,0,cz+18),P(W-4,out,cz),P(4,out,cz)], '#fbf3f5');
    poly([P(4,0,cz+8),P(W-4,0,cz+8),P(W-4,out,cz-10),P(4,out,cz-10)], shade('#fbf3f5',.82));
    poly([P(4,0,cz+18),P(4,out,cz),P(4,out,cz-10),P(4,0,cz+8)], shade(trim,1.1));
    poly([P(W-4,0,cz+18),P(W-4,out,cz),P(W-4,out,cz-10),P(W-4,0,cz+8)], shade(trim,1.1));
    for(let i=0;i<10;i++){
      const x0=4+(W-8)*i/10, x1=4+(W-8)*(i+1)/10;
      const l=P(x0,out,cz), r=P(x1,out,cz), m=P((x0+x1)/2,out,cz-14);
      ctx.beginPath(); ctx.moveTo(l.x,l.y); ctx.quadraticCurveTo(m.x,m.y+6,r.x,r.y); ctx.closePath();
      ctx.fillStyle = i%2 ? trim : '#fbf3f5'; ctx.fill();
    }
    if(state.roof){
      const ca = W*0.46, cb = -34;
      cyl(ca, cb, H, H+12, 20, '#e8dfe2');                       // plinth
      plateCircle(ca, cb, H+12, 20, '#f2ecee', '#d8ccd0', 2);
      const tip = P(ca,cb,H+12), l = P(ca-36,cb,H+110), r = P(ca+36,cb,H+110);
      poly([tip,l,r], '#e0b26a', '#c08f4a', 2);
      ctx.strokeStyle='#c08f4a'; ctx.lineWidth=1.5;
      for(let i=1;i<4;i++){
        const a=P(ca-36+72*i/4,cb,H+110), b2=P(ca,cb,H+12);
        ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b2.x,b2.y); ctx.stroke();
      }
      ball(ca, cb, H+118, 30, '#f6c9d4');
      ball(ca-6, cb, H+150, 28, '#cfe6c8');
      ball(ca+5, cb, H+178, 26, '#f4e2b0');
      ball(ca+5, cb, H+202, 6, '#c2452e');
      box(W*0.72,W*0.94,-160,-124,H,H+18,'#9aa0a6','#7d838a','#6a7076');
    }
    kerb(p,'seats');
  }
},
{
  name:'Bank', tall:true,
  head:'Colonnade, pediment, stone steps',
  tags:['round columns','solid pediment','stone steps','deep reveal','formal front'],
  desc:'The columns are turned cylinders with wider bases and capitals, standing clear of a recessed wall, so the colonnade self-shadows properly. The pediment is swept to a real thickness rather than being a painted triangle.',
  draw(p){
    const wall = '#d8d2c4', trim = '#8a8375', H = 208, CB = -20;
    body(wall, trim, H);
    slab(0,W, H, H+10, -1, -14, shade(wall,.72));
    F(6,W-6, 150, H-6, shade(wall,1.06), null,0,-1);
    F(18,W-18, 0, 150, shade(wall,.6), null,0, 1);                 // recessed reveal
    /* the entrance here is a portico recessed between the columns, not
       a shopfront door, so it keeps its own form -- but the opening is
       now the real 161.92 tall (108 before the 1.5 lab factor) instead
       of an eyeballed 112. */
    F(W*0.36,W*0.64, 0, 108, shade(wall,.44), null,0, 2);
    F(W*0.39,W*0.61, 8, 100, '#5d6b74', null,0, 1.5);
    for(let i=0;i<2;i++) F(28+i*(W*0.62), 28+i*(W*0.62)+44, 26, 118, '#5d6b74', shade(wall,.8), 2, 1.5);
    // four turned columns standing forward of the wall
    for(let i=0;i<4;i++){
      const ca = 22 + (W-44)*i/3;
      cyl(ca, CB, 0, 12, 15, shade(wall,1.08));                     // base
      cyl(ca, CB, 12, 150, 11, wall);                               // shaft
      for(let k=0;k<5;k++)                                          // flutes
        F(ca-8+k*4, ca-7+k*4, 12, 150, shade(wall,.9), null,0, CB-11);
      cyl(ca, CB, 150, 164, 15, shade(wall,1.10));                  // capital
    }
    slab(0,W, 164, 176, CB+16, CB-16, shade(wall,.88));             // architrave
    // pediment swept to a thickness, like a real gable
    const pk = (t,bb) => {
      const a = t < 0.5 ? W*t*2*0.5 : W*0.5 + W*(t-0.5);
      const z = 176 + (1 - Math.abs(t-0.5)*2) * 50;
      return P(t*W, bb, z);
    };
    for(let i=0;i<18;i++)
      poly([pk(i/18,CB+16),pk((i+1)/18,CB+16),pk((i+1)/18,CB-16),pk(i/18,CB-16)], shade(wall,1.12));
    ctx.beginPath();
    let q = P(0,CB+16,176); ctx.moveTo(q.x,q.y);
    q = P(W/2,CB+16,226); ctx.lineTo(q.x,q.y);
    q = P(W,CB+16,176); ctx.lineTo(q.x,q.y);
    ctx.closePath(); ctx.fillStyle = shade(wall,1.04); ctx.fill();
    ctx.strokeStyle = shade(wall,.68); ctx.lineWidth = 3; ctx.stroke();
    faceCircle(W*0.50, CB+15, 196, 13, trim, shade(wall,.7), 2);    // roundel
    if(state.props){
      box(14,W-14,0,26,0,10,shade(wall,1.02),shade(wall,.86),shade(wall,.74));
      box(20,W-20,0,18,10,20,shade(wall,1.04),shade(wall,.88),shade(wall,.76));
    }
    if(state.roof) box(W*0.66,W*0.90,-170,-130,H,H+20,'#9aa0a6','#7d838a','#6a7076');
    kerb(p,'none');
  }
},
{
  name:'Fuel station', head:'Forecourt canopy on posts, pumps, low kiosk',
  tags:['forecourt canopy','round posts','pumps with hoses','price totem','widest footprint'],
  desc:'The canopy is a slab with a fascia, an underside and returns, carried on round posts, and each pump has a nozzle on a hose rather than a painted panel.',
  draw(p){
    const wall = '#e6e8e6', trim = '#c2452e', H = 116;
    body(wall, trim, H, W, D);
    slab(0,W, H, H+8, -1, -10, trim);
    F(14,W*0.62, 20, 90, '#7fb0c4', shade(wall,.6), 3);
    shopDoor(W*0.83, wall, trim);
    F(W*0.72,W-18, 48, 86, '#7fb0c4', null,0,-6.5);
    slab(8,W-8, 96, 112, -1, -8, trim);
    const cb0 = 40, cb1 = 150, cz = 168;
    for(const aa of [24, W-24]) for(const bb of [cb0+14, cb1-14]) cyl(aa, bb, 0, cz-16, 6, '#b9bcc0');
    T(-16, W+16, cb0, cb1, cz, '#f2f2f0');
    F(-16, W+16, cz-16, cz, '#f2f2f0', shade(wall,.7), 2, cb0);
    F(-16, W+16, cz-16, cz-11, trim, null,0, cb0-0.6);
    poly([P(-16,cb0,cz-16),P(W+16,cb0,cz-16),P(W+16,cb1,cz-16),P(-16,cb1,cz-16)], shade('#f2f2f0',.7));
    S(W+16, cb0, cb1, cz-16, cz, shade('#f2f2f0',.82));
    S(-16, cb0, cb1, cz-16, cz, shade('#f2f2f0',.82));
    if(state.props){
      for(const aa of [W*0.26, W*0.66]){
        box(aa-16,aa+16, 78, 104, 0, 62, '#d9dbd9','#c2452e','#a53a26');
        F(aa-11,aa+11, 30, 52, '#2b2f33', null,0, 77);
        F(aa-9,aa+9, 34, 48, '#7fe0c0', null,0, 76);
        // hose looping down to a nozzle on the flank
        ctx.strokeStyle='#2b2f33'; ctx.lineWidth=3;
        const h0=P(aa+16,90,54), h1=P(aa+30,90,16);
        ctx.beginPath(); ctx.moveTo(h0.x,h0.y);
        ctx.quadraticCurveTo(h0.x+22*K, h0.y+26*K, h1.x, h1.y); ctx.stroke();
        box(aa+26,aa+36, 84, 96, 12, 22, '#8d949a','#a2a8ae','#7d838a');
      }
      cyl(W*0.06, 176, 0, 96, 5, '#b9bcc0');
      slab(W*0.0, W*0.20, 96, 152, 172, 182, trim, shade(wall,.7), shade(trim,1.2));
      for(let i=0;i<3;i++) F(W*0.03, W*0.17, 104+i*15, 116+i*15, '#f2f2f0', null,0, 171.5);
    }
    if(state.roof) box(W*0.20,W*0.44,-120,-80,H,H+20,'#9aa0a6','#7d838a','#6a7076');
    kerb(p,'none');
  }
},
{
  name:'Chapel', tall:true,
  head:'Bell tower, rose window, arched door',
  tags:['pyramid spire','rose window','swept arch heads','stone banding','finial'],
  desc:'The spire is a four-sided pyramid with two faces visible, so it turns a corner against the sky instead of reading as a cardboard triangle. Arch heads over the lancets are swept bands with depth.',
  draw(p){
    const wall = '#cfc6b0', trim = '#6b5a44', H = 178, WW = 200;
    body(wall, trim, H, WW);
    slab(0,WW, H, H+8, -1, -12, shade(wall,.72));
    // gable over the nave, swept to a thickness
    const gp = (t,bb) => P(WW*0.30 + (WW*0.70)*t, bb, H+8 + (1-Math.abs(t-0.5)*2)*64);
    for(let i=0;i<16;i++)
      poly([gp(i/16,0),gp((i+1)/16,0),gp((i+1)/16,-14),gp(i/16,-14)], shade(wall,1.10));
    ctx.beginPath();
    let q=P(WW*0.30,0,H+8); ctx.moveTo(q.x,q.y);
    q=P(WW*0.65,0,H+72); ctx.lineTo(q.x,q.y);
    q=P(WW,0,H+8); ctx.lineTo(q.x,q.y);
    ctx.closePath(); ctx.fillStyle=wall; ctx.fill();
    ctx.strokeStyle=shade(wall,.66); ctx.lineWidth=3; ctx.stroke();
    faceCircle(WW*0.65, -1, H+38, 17, trim);
    faceCircle(WW*0.65, -2, H+38, 13, '#6f8fa8');
    faceT(WW*0.65, -3, H+38, 13);
    ctx.strokeStyle=trim; ctx.lineWidth=2/(13*K);
    for(let k=0;k<4;k++){ ctx.beginPath(); ctx.moveTo(-Math.cos(k*0.79),-Math.sin(k*0.79));
      ctx.lineTo(Math.cos(k*0.79),Math.sin(k*0.79)); ctx.stroke(); }
    ctx.restore();
    for(let i=0;i<2;i++){
      const xa = WW*0.44 + i*WW*0.28;
      F(xa-14,xa+14, 46, 116, '#6f8fa8', trim, 3);
      const ap = (t,bb) => {
        const u=1-t, a = u*u*(xa-14) + 2*u*t*xa + t*t*(xa+14);
        const z = u*u*116 + 2*u*t*146 + t*t*116;
        return P(a,bb,z);
      };
      ctx.beginPath(); let r0=ap(0,0); ctx.moveTo(r0.x,r0.y);
      for(let k=1;k<=10;k++){ r0=ap(k/10,0); ctx.lineTo(r0.x,r0.y); }
      ctx.closePath(); ctx.fillStyle='#6f8fa8'; ctx.fill();
      for(let k=0;k<10;k++)
        poly([ap(k/10,0),ap((k+1)/10,0),ap((k+1)/10,-9),ap(k/10,-9)], shade(wall,.9));
    }
    // bell tower and pyramid spire
    const t0 = 4, t1 = WW*0.26, tb = -2, tk = -34;
    slab(t0,t1, 0, H+96, tb, tk, shade(wall,1.05), shade(wall,.8), shade(wall,.9));
    F(t0+8,t1-8, H+40, H+84, trim, null,0, tb-0.6);
    const ap2 = P((t0+t1)/2, (tb+tk)/2, H+178);
    poly([P(t0-8,tb+6,H+96), P(t1+8,tb+6,H+96), ap2], trim);                      // front face
    poly([P(t1+8,tb+6,H+96), P(t1+8,tk-6,H+96), ap2], shade(trim,.74));           // right face
    cyl((t0+t1)/2, (tb+tk)/2, H+178, H+198, 2, '#c9a24a');
    slab((t0+t1)/2-9, (t0+t1)/2+9, H+186, H+190, (tb+tk)/2+2, (tb+tk)/2-2, '#c9a24a');
    ball((t0+t1)/2, (tb+tk)/2, H+202, 4, '#c9a24a');
    // arched door, swept
    shopDoor(WW*0.67, wall, trim, 'rgba(120,150,170,.55)', WW);
    const dp = (t,bb) => {
      const u=1-t, a = u*u*(WW*0.56) + 2*u*t*(WW*0.67) + t*t*(WW*0.78);
      const z = u*u*92 + 2*u*t*126 + t*t*92;
      return P(a,bb,z);
    };
    ctx.beginPath(); let d0=dp(0,0); ctx.moveTo(d0.x,d0.y);
    for(let k=1;k<=10;k++){ d0=dp(k/10,0); ctx.lineTo(d0.x,d0.y); }
    ctx.closePath(); ctx.fillStyle=trim; ctx.fill();
    for(let k=0;k<10;k++) poly([dp(k/10,0),dp((k+1)/10,0),dp((k+1)/10,-8),dp(k/10,-8)], shade(wall,.86));
    F(WW*0.665,WW*0.675, 12, 104, shade(trim,1.4), null,0,-1);
    slab(0,WW, 26, 32, -1, -6, shade(wall,.86));
    if(state.roof) box(WW*0.40,WW*0.62,-150,-118,H,H+16,'#9aa0a6','#7d838a','#6a7076');
    kerb(p,'none');
  }
},
{
  name:'Arcade', head:'Black hole of a front, screen glow, pixel sign',
  tags:['unlit front','screen glow','solid pixel sign','step-in entry','A-board'],
  desc:'Every block of the pixel sign is a slab with a lit top edge, so the lettering stands off the fascia. The cabinets inside are boxes with visible tops rather than coloured rectangles.',
  draw(p){
    const wall = '#1b1b26', trim = '#37e0d0', H = 168;
    body(wall, trim, H);
    slab(0,W, H, H+12, -1, -12, shade(wall,2.0));
    F(10,W-10, 0, 120, '#0c0c14', null,0, 1);
    /* five cabinets ran 26..178 and the frontage was otherwise an open
       black hole -- no door anywhere. Four cabinets now, leaving the
       end of the run for a real entrance. */
    for(let i=0;i<4;i++){
      const ca = 26+i*38;
      box(ca-13, ca+13, 2, 22, 0, 84, '#2a2a3c', '#1e1e2e', '#16161f');
      F(ca-10,ca+10, 44, 76, ['#37e0d0','#e04b8a','#e8c34a','#4a8ae0'][i], null,0, 1.5);
      F(ca-10,ca+10, 24, 40, '#2a2a3c', null,0, 1.5);
    }
    shopDoor(W*0.82, shade(wall,1.6), shade(wall,2.2), 'rgba(55,224,208,.30)');
    slab(10,W-10, 116, 126, -1, -8, trim);
    const bl = [[0,0],[1,0],[2,0],[0,1],[0,2],[1,2],[2,2],[4,0],[4,1],[4,2],[5,2],[6,2],
                [8,0],[8,1],[8,2],[9,0],[10,0],[10,1],[10,2]];
    for(const [bx,bz] of bl){
      const x0 = 22 + bx*15, z0 = 176 - bz*15;
      slab(x0, x0+12, z0, z0+12, -2, -10, trim, shade(trim,.7), shade(trim,1.3));
    }
    slab(6,W-6, H-58, H-52, -1, -8, shade(wall,2.4));
    if(state.props){
      poly([P(W*0.06,26,0),P(W*0.28,26,0),P(W*0.28,40,52),P(W*0.06,40,52)], '#1a1a22');
      poly([P(W*0.06,54,0),P(W*0.28,54,0),P(W*0.28,40,52),P(W*0.06,40,52)], '#2c2c36');
      poly([P(W*0.28,26,0),P(W*0.28,54,0),P(W*0.28,40,52)], '#111118');
      for(let i=0;i<3;i++)
        poly([P(W*0.09,27+i*2,12+i*12),P(W*0.25,27+i*2,12+i*12),
              P(W*0.25,34+i*2,15+i*12),P(W*0.09,34+i*2,15+i*12)],
             ['#e04b8a','#e8c34a','#37e0d0'][i]);
    }
    if(state.roof){
      box(W*0.56,W*0.84,-150,-104,H,H+26,'#4a4a58','#3a3a46','#2e2e38');
      cyl(W*0.26, -60, H+12, H+62, 2.5, '#4a4a58');
    }
    kerb(p,'none');
  }
},
{
  name:'Butcher', head:'Hooks and rail, tiled base, block outside',
  tags:['round rail','hooked cuts','white tile','striped awning','chopping block'],
  desc:'The rail is a tube with the hooks bent over it and the cuts hanging as rounded solids. The chopping block is a heavy round butcher block on legs.',
  draw(p){
    const wall = '#f0ece2', trim = '#8f2b2b', H = 150;
    body(wall, trim, H);
    slab(0,W, H, H+10, -1, -12, trim);
    for(let i=0;i<12;i++) F(i*(W/12), i*(W/12)+1.6, 0,42, shade(wall,.9), null,0,-1);
    slab(0,W, 40, 46, -1, -6, trim);
    F(12,W*0.70, 46, 108, '#d6e2e4', shade(wall,.62), 3);
    tube(16, -6, 98, W*0.68, -6, 98, 2, '#9aa0a6');
    for(let i=0;i<5;i++){
      const ha = 28+i*26, col = ['#c2606a','#a84a54','#c2606a','#b45560','#a84a54'][i];
      tube(ha, -6, 96, ha, -6, 86, 1.2, '#b9bcc0');
      ball(ha, -6, 74, 9, col);
      ball(ha, -6, 62, 7, shade(col,.9));
      ctx.strokeStyle='#f0dcd6'; ctx.lineWidth=2;
      const c0=P(ha-6,-7,76), c1=P(ha+6,-7,70);
      ctx.beginPath(); ctx.moveTo(c0.x,c0.y); ctx.lineTo(c1.x,c1.y); ctx.stroke();
    }
    shopDoor(W*0.86, wall, trim);
    F(W*0.78,W-14, 50, 90, '#d6e2e4', null,0,-6.5);
    const out = 34;
    for(let i=0;i<8;i++){
      const x0=4+(W-8)*i/8, x1=4+(W-8)*(i+1)/8;
      poly([P(x0,0,132),P(x1,0,132),P(x1,out,112),P(x0,out,112)], i%2?'#f4f0e6':trim);
    }
    poly([P(4,0,124),P(W-4,0,124),P(W-4,out,104),P(4,out,104)], shade(trim,.62));
    poly([P(4,out,112),P(W-4,out,112),P(W-4,out,104),P(4,out,104)], shade(trim,.8));
    poly([P(4,0,132),P(4,out,112),P(4,out,104),P(4,0,124)], shade(trim,.55));
    poly([P(W-4,0,132),P(W-4,out,112),P(W-4,out,104),P(W-4,0,124)], shade(trim,.55));
    slab(0,W, 132, 138, -1, -8, shade(trim,.8));
    if(state.props){
      for(const [la,lb] of [[W+18,26],[W+42,26],[W+18,50],[W+42,50]]) cyl(la, lb, 0, 22, 4, '#8a6a3a');
      cyl(W+30, 38, 22, 44, 26, '#c9a26a');
      plateCircle(W+30, 38, 44, 26, '#d8b47c', '#a9834e', 2);
    }
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
    slab(4,WW-4, 116, H-8, -1, -10, shade(wall,1.25), null, trim);
    F(16,WW-16, 126, 152, trim, null,0,-10.5);
    F(12,WW*0.60, 22, 104, '#6a7f96', shade(wall,1.5), 3);
    for(let i=0;i<6;i++) tube(14+i*((WW*0.58-14)/6), -4, 22, 14+i*((WW*0.58-14)/6), -4, 104, 1.4, shade(wall,1.15));
    for(let i=0;i<3;i++) tube(12, -4, 34+i*24, WW*0.60, -4, 34+i*24, 1.2, shade(wall,1.15));
    shopDoor(WW*0.81, wall, trim, null, WW);
    F(WW*0.70,WW-14, 52, 94, '#6a7f96', null,0,-6.5);
    tube(WW*0.075, -2, 112, WW*0.075, -26, 112, 1.8, '#4a4f55');
    tube(WW*0.02, -26, 112, WW*0.16, -26, 112, 1.6, '#4a4f55');
    for(const [ba,bz] of [[WW*0.05,96],[WW*0.12,96],[WW*0.085,78]]){
      tube(ba, -26, 110, ba, -26, bz+11, 0.9, '#4a4f55');
      ball(ba, -26, bz, 11, trim);
    }
    if(state.roof){
      box(WW*0.30,WW*0.54,-150,-110,H,H+20,'#8f969d','#787f86','#697077');
      cyl(WW*0.72, -70, H+10, H+52, 2.5, '#6d747c');
    }
    kerb(p,'none');
  }
},
{
  name:'Post office', tall:true,
  head:'Flagpole, crest parapet, pillar box',
  tags:['flagpole and flag','crest parapet','counter windows','round pillar box','official palette'],
  desc:'The letterbox is a proper round pillar box with a domed cap and an aperture, and the flag hangs in the plane of its own pole rather than lying flat on the wall.',
  draw(p){
    const wall = '#dcd6c6', trim = '#1f4a6b', H = 186;
    body(wall, trim, H);
    slab(0,W, H, H+10, -1, -12, trim);
    slab(W*0.32,W*0.68, H+10, H+34, -2, -12, shade(wall,1.04), null, trim);
    F(W*0.42,W*0.58, H+16, H+28, trim, null,0,-2.5);
    slab(0,W, 120, 132, -1, -8, trim);
    slab(14,W-14, 138, 166, -1, -9, shade(wall,1.06));
    for(let i=0;i<3;i++) F(30+i*54, 66+i*54, 144,160, trim, null,0,-9.5);
    for(let i=0;i<3;i++){
      const x0 = 16+(W-32)*(i+0.10)/3, x1 = 16+(W-32)*(i+0.90)/3;
      slab(x0-3,x1+3, 28, 106, -1, -7, trim);
      F(x0,x1, 32, 102, '#7f9ab0', null,0,-7.5);
      for(let j=1;j<3;j++) F(x0+(x1-x0)*j/3-1.5, x0+(x1-x0)*j/3+1.5, 32,102, trim, null,0,-8);
    }
    shopDoor(W*0.51, wall, trim);
    F(W*0.44,W*0.58, 56, 100, '#7f9ab0', null,0,-6.5);
    slab(0,W, 0, 22, -1, -6, shade(wall,.7));
    if(state.props){
      // flagpole raked off the wall, flag hanging in the pole's plane
      tube(W*0.10, -2, 150, W*0.10, -96, 214, 3, '#b9bcc0');
      poly([P(W*0.10,-96,214),P(W*0.10,-58,204),P(W*0.10,-58,176),P(W*0.10,-96,188)], '#c2452e');
      poly([P(W*0.10,-96,188),P(W*0.10,-58,176),P(W*0.10,-58,172),P(W*0.10,-96,184)], '#a33124');
      ball(W*0.10, -96, 218, 3.5, '#c9a24a');
      // pillar box: round, domed, with an aperture
      const ba = W+34, bb = 40;
      cyl(ba, bb, 0, 62, 17, '#c2452e');
      plateCircle(ba, bb, 62, 17, '#a33124');
      ball(ba, bb, 62, 17, '#b03c28', '#c2452e');
      plateHoop(ba, bb, 8, 18, '#8d3120', 3);
      F(ba-11, ba+11, 44, 50, '#2b2f33', null,0, bb+16);
      F(ba-13, ba+13, 24, 34, '#e8ddc8', null,0, bb+16.4);
    }
    if(state.roof) box(W*0.14,W*0.36,-160,-120,H,H+22,'#9aa0a6','#7d838a','#6a7076');
    kerb(p,'none');
  }
},
{
  name:'Pet shop', head:'Lit tanks, hanging cage, kennel',
  tags:['aquarium glow','round birdcage','kennel outside','scalloped valance','warm interior'],
  desc:'The birdcage is a cylinder with a domed top and vertical bars, hanging on a chain, and the tanks have a lit front edge so the glow reads as coming out of the glass.',
  draw(p){
    const wall = '#e0d3b8', trim = '#3f6b4a', H = 154;
    body(wall, trim, H);
    slab(0,W, H, H+10, -1, -12, trim);
    F(10,W*0.70, 20, 108, '#2a3a34', shade(wall,.6), 3);
    for(let r=0;r<3;r++) for(let c=0;c<3;c++){
      const x0 = 16+(W*0.66-16)*(c+0.06)/3, x1 = 16+(W*0.66-16)*(c+0.94)/3, z0 = 26+r*28;
      F(x0,x1, z0, z0+22, ['#4fb0a0','#5ab8c8','#3f9f86'][(r+c)%3], null,0,-1);
      F(x0,x1, z0+20, z0+22, '#d8f0e8', null,0,-1.5);
      F(x0,x1, z0, z0+2, 'rgba(216,240,232,.55)', null,0,-1.5);
      for(let k=0;k<2;k++) ball(x0+6+k*9, -3, z0+8+k*5, 3.4, ['#e8a13a','#f2ece0'][k]);
    }
    shopDoor(W*0.86, wall, trim);
    F(W*0.78,W-14, 50, 90, '#8fb8a0', null,0,-6.5);
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
    slab(0,W, 128, 134, -1, -8, shade(trim,.8));
    if(state.props){
      const hc = W*0.36, hb = 22;
      tube(hc, hb, 108, hc, hb, 98, 0.9, '#8a8272');
      cyl(hc, hb, 60, 96, 13, 'rgba(220,214,190,.35)');
      for(let k=0;k<7;k++){
        const t = 3*Math.PI/4 - Math.PI*k/6;
        tube(hc+13*Math.cos(t), hb+13*Math.sin(t), 60, hc+13*Math.cos(t), hb+13*Math.sin(t), 96, 0.7, '#8a8272');
      }
      ball(hc, hb, 96, 13, 'rgba(201,162,74,.9)', '#d8b45e');
      plateCircle(hc, hb, 58, 14, '#c9a24a', '#8a8272', 2);
      ball(hc, hb, 76, 5, '#e8c34a');
      box(W+10,W+56, 20, 60, 0, 34, '#a9703a','#c98a4a','#8f5e31');
      poly([P(W+10,20,34),P(W+33,20,58),P(W+56,20,34)], '#8f5e31');
      poly([P(W+56,20,34),P(W+33,20,58),P(W+33,60,58),P(W+56,60,34)], '#7a5030');
      F(W+24,W+42, 4, 28, '#4a3626', null,0, 19);
    }
    if(state.roof) box(W*0.30,W*0.56,-140,-100,H,H+20,'#9aa0a6','#7d838a','#6a7076');
    kerb(p,'none');
  }
},
{
  name:'Gym', head:'Clerestory band, roof duct run, kettlebell sign',
  tags:['high clerestory','round duct run','no display glass','equipment sign','roller door'],
  desc:'The duct is a run of real cylinders with joint collars snaking across the roof, and the kettlebell on the fascia is a sphere with a bent tube handle.',
  draw(p){
    const wall = '#4a4f55', trim = '#e8a13a', H = 182;
    body(wall, trim, H);
    slab(0,W, H, H+10, -1, -12, shade(wall,1.4));
    slab(0,W, 0, 30, -1, -6, shade(wall,.8));
    for(let i=0;i<6;i++){
      const x0 = 10+(W-20)*(i+0.08)/6, x1 = 10+(W-20)*(i+0.92)/6;
      slab(x0-2,x1+2, 108, 142, -1, -7, shade(wall,1.25));
      F(x0,x1, 112, 138, '#8fb4c4', null,0,-7.5);
    }
    slab(6,W-6, 148, H-10, -1, -9, shade(wall,1.15), null, trim);
    ball(W*0.18, -10, 164, 11, trim);
    tube(W*0.18-6, -10, 172, W*0.18+6, -10, 172, 2, trim);
    tube(W*0.18-6, -10, 172, W*0.18-4, -10, 178, 2, trim);
    tube(W*0.18+6, -10, 172, W*0.18+4, -10, 178, 2, trim);
    F(W*0.34,W*0.86, 160, 168, trim, null,0,-9.5);
    for(const bx of [W*0.34,W*0.40,W*0.80,W*0.86]) F(bx-4,bx+4, 152, 176, trim, null,0,-10);
    /* the entrance was a roller shutter 96 wide and 92 tall -- half a
       loading bay on a building people walk into. Real door on the same
       centreline, with the header band kept so the elevation still has
       its horizontal. */
    shopDoor(W*0.51, wall, trim);
    slab(W*0.28,W*0.74, 112, 122, -2, -9, trim);
    if(state.roof){
      for(let i=0;i<5;i++){
        const bb = -30 - i*44;
        cyl(W*0.44, bb, H+10, H+40, 15, i%2 ? '#b9bcc0' : '#c6c9cd');
        plateCircle(W*0.44, bb, H+40, 15, '#d2d5d8', '#a8adb2', 1.6);
        cyl(W*0.44, bb - 22, H+14, H+36, 17, '#aab0b4');
      }
      box(W*0.76,W*0.96,-150,-110,H,H+30,'#8f969d','#787f86','#697077');
    }
    kerb(p,'bench');
  }
},
{
  name:'Bookshop', tall:true,
  head:'Jettied upper floor, ladder, hanging sign',
  tags:['overhanging upper storey','shaped brackets','sliding ladder','leaded panes','swinging sign'],
  desc:'The jetty brackets are shaped solids carrying the overhang, the ladder rails are tubes leaning on the shopfront, and the hanging sign is a board on an arm with its own thickness instead of a rotated rectangle.',
  draw(p){
    const wall = '#8a6a4e', trim = '#e6dcc4', H = 206, J = 34;
    body(wall, trim, H);
    F(0,W, 104, H, shade(wall,1.14), shade(wall,.7), 2, J);
    T(0,W, 0, J, 104, shade(wall,.62));
    S(W, 0, J, 104, H, shade(wall,.88));
    // shaped brackets, each a solid wedge under the jetty
    for(const aa of [16, W*0.5, W-16]){
      poly([P(aa-5,0,104),P(aa-5,J,104),P(aa-5,J,92),P(aa-5,0,66)], shade(wall,.80));
      poly([P(aa+5,0,104),P(aa+5,J,104),P(aa+5,J,92),P(aa+5,0,66)], shade(wall,.66));
      poly([P(aa-5,J,104),P(aa+5,J,104),P(aa+5,J,92),P(aa-5,J,92)], shade(wall,.94));
      poly([P(aa-5,0,66),P(aa+5,0,66),P(aa+5,J,92),P(aa-5,J,92)], shade(wall,.74));
    }
    slab(0,W, H, H+10, J-1, J-11, shade(wall,.66));
    for(let i=0;i<3;i++){
      const x0 = 14+(W-28)*(i+0.10)/3, x1 = 14+(W-28)*(i+0.90)/3;
      slab(x0-3,x1+3, 121, 179, J-1, J-8, trim);
      F(x0,x1, 128, 172, '#7f93a0', null,0, J-8.5);
      for(let k=1;k<4;k++) F(x0+(x1-x0)*k/4-1.2, x0+(x1-x0)*k/4+1.2, 128,172, trim, null,0, J-9);
      for(let k=1;k<3;k++) F(x0,x1, 128+44*k/3-1.2, 128+44*k/3+1.2, trim, null,0, J-9);
    }
    F(10,W*0.66, 20, 96, '#5f4634', shade(wall,.6), 3);
    for(let r=0;r<3;r++) for(let i=0;i<7;i++)
      F(16+i*((W*0.62-16)/7), 16+(i+0.78)*((W*0.62-16)/7), 26+r*24, 46+r*24,
        ['#8f2b2b','#2f6f8f','#c9a24a','#3f6b4a','#7a4a6b'][(i+r)%5], null,0,-1);
    shopDoor(W*0.84, wall, trim);
    F(W*0.74,W-14, 52, 90, '#7f93a0', null,0,-6.5);
    if(state.props){
      // ladder leaning on the shopfront, rails as tubes
      const lb = -4;
      tube(W*0.06, lb, 6, W*0.28, lb-10, 98, 2.6, '#c9a26a');
      tube(W*0.12, lb, 6, W*0.34, lb-10, 98, 2.6, '#c9a26a');
      for(let k=1;k<=5;k++){
        const t=k/6;
        tube(W*0.06 + (W*0.22)*t, lb-10*t, 6+92*t, W*0.12 + (W*0.22)*t, lb-10*t, 6+92*t, 1.7, '#a9834e');
      }
      // hanging sign on an arm, hung clear of the jetty
      tube(W*0.80, J-4, 96, W*0.80, J+26, 96, 2, '#4a3a2c');
      tube(W*0.80, J+24, 96, W*0.80, J+24, 84, 1.2, '#4a3a2c');
      slab(W*0.68, W*0.92, 56, 84, J+28, J+22, trim, shade(wall,.6), shade(trim,1.1));
      F(W*0.71, W*0.89, 64, 69, shade(wall,.7), null,0, J+28.5);
      F(W*0.71, W*0.85, 72, 77, shade(wall,.7), null,0, J+28.5);
    }
    if(state.roof) box(W*0.30,W*0.54,-150,-108,H,H+22,'#8f969d','#787f86','#697077');
    kerb(p,'none');
  }
},
{
  name:'Photo studio', head:'North-light glazing, portrait cases',
  tags:['sawtooth north light','glazing bars','portrait cases','deep sill','glass roof plane'],
  desc:'Each sawtooth now has a solid upstand behind the glass and a capping at the ridge, so the roof reads as built rather than as two blue sheets, and the portraits are framed boxes with a visible edge.',
  draw(p){
    const wall = '#c8c2b4', trim = '#3a3f4a', H = 172;
    body(wall, trim, H);
    slab(0,W, H, H+8, -1, -12, trim);
    for(let i=0;i<2;i++){
      const b0 = -50 - i*104, b1 = b0 - 78;
      poly([P(8,b1,H+46),P(W-8,b1,H+46),P(W-8,b1-14,H+46),P(8,b1-14,H+46)], shade(trim,1.2));  // upstand top
      F(8,W-8, H, H+46, shade(wall,.86), null,0, b1-14);                                        // upstand face
      poly([P(8,b0,H),P(W-8,b0,H),P(W-8,b1,H+46),P(8,b1,H+46)], '#8fb0c4', shade(trim,1.6), 2);
      for(let k=1;k<5;k++){
        const t=k/5;
        poly([P(8+(W-16)*t-2, b0, H),P(8+(W-16)*t+2, b0, H),
              P(8+(W-16)*t+2, b1, H+46),P(8+(W-16)*t-2, b1, H+46)], shade(trim,1.4));
      }
      S(W-8, b0, b1, H, H+46, shade(wall,.7));
      S(8, b0, b1, H, H+46, shade(wall,.82));
    }
    F(12,W*0.60, 24, 112, '#6e7c8c', shade(wall,.62), 3);
    F(18,W*0.54, 32, 104, shade(wall,1.1), null,0,-1);
    for(let i=0;i<3;i++){
      const x0 = 24+i*((W*0.50-24)/3), x1 = x0 + 26;
      slab(x0,x1, 44, 92, -2, -8, '#e8ddc8', trim, shade('#e8ddc8',1.1));
      F(x0+4,x1-4, 52, 86, ['#9aa8b4','#b09a8c','#8ea89a'][i], null,0,-2.5);
      ball((x0+x1)/2, -3, 76, 5, '#e8ddc8');
    }
    shopDoor(W*0.83, wall, trim);
    F(W*0.70,W-16, 50, 90, '#6e7c8c', null,0,-6.5);
    slab(6,W-6, 120, 146, -1, -9, trim);
    F(20,W-20, 126, 140, shade(wall,1.12), null,0,-9.5);
    if(state.roof) box(W*0.62,W*0.86,-30,-6,H,H+18,'#9aa0a6','#7d838a','#6a7076');
    kerb(p,'none');
  }
},
{
  name:'Toy shop', head:'Rooftop kite, oversized bear, pinwheels',
  tags:['kite in a real plane','turned bear','pinwheels','bright banding','scalloped canopy'],
  desc:'The bear is built from cylinders and balls so it stands in the window, and the kite is a diamond lying in a genuine world plane on the end of its string rather than a rotated sprite.',
  draw(p){
    const wall = '#e8564a', trim = '#f4e2b0', H = 150;
    body(wall, trim, H);
    slab(0,W, H, H+10, -1, -12, trim);
    for(let i=0;i<6;i++) F(i*(W/6), (i+0.5)*(W/6), H-22, H, trim, null,0,-1);
    F(10,W*0.68, 24, 104, '#7fb4c4', shade(wall,.7), 3);
    // bear, turned from cylinders and balls
    const bx = W*0.30, bb = -4;
    cyl(bx, bb, 26, 78, 22, '#c9944a');
    ball(bx, bb, 96, 20, '#c9944a');
    ball(bx-15, bb, 110, 8, '#b8843c');
    ball(bx+15, bb, 110, 8, '#b8843c');
    ball(bx-6, bb-2, 100, 3, '#4a3626');
    ball(bx+6, bb-2, 100, 3, '#4a3626');
    ball(bx, bb-4, 92, 6, '#e0b070');
    cyl(bx-24, bb, 44, 70, 7, '#b8843c');
    cyl(bx+24, bb, 44, 70, 7, '#b8843c');
    F(bx-8,bx+8, 72, 86, '#e8ddc8', null,0,-6);
    shopDoor(W*0.84, wall, trim);
    F(W*0.76,W-14, 50, 88, '#7fb4c4', null,0,-6.5);
    const out = 30;
    poly([P(4,0,124),P(W-4,0,124),P(W-4,out,110),P(4,out,110)], trim);
    poly([P(4,0,116),P(W-4,0,116),P(W-4,out,102),P(4,out,102)], shade(trim,.78));
    poly([P(4,0,124),P(4,out,110),P(4,out,102),P(4,0,116)], shade(wall,.7));
    poly([P(W-4,0,124),P(W-4,out,110),P(W-4,out,102),P(W-4,0,116)], shade(wall,.7));
    for(let i=0;i<10;i++){
      const x0=4+(W-8)*i/10, x1=4+(W-8)*(i+1)/10;
      const l=P(x0,out,110), r=P(x1,out,110), m=P((x0+x1)/2,out,98);
      ctx.beginPath(); ctx.moveTo(l.x,l.y); ctx.quadraticCurveTo(m.x,m.y+6,r.x,r.y); ctx.closePath();
      ctx.fillStyle = i%2 ? '#4aa8c4' : trim; ctx.fill();
    }
    if(state.props){
      for(let i=0;i<3;i++){
        const pa = W+14+i*22, pb = 30;
        cyl(pa, pb, 0, 56, 1.6, '#c9ccd0');
        for(let k=0;k<4;k++){                                    // vanes in the pinwheel's own plane
          const a0 = k*1.57 + 0.4, a1 = a0 + 0.6;
          poly([P(pa, pb, 60),
                P(pa + 11*Math.cos(a0), pb, 60 + 11*Math.sin(a0)),
                P(pa + 11*Math.cos(a1), pb, 60 + 11*Math.sin(a1))],
               ['#e8564a','#f4e2b0','#4aa8c4','#7ac44a'][k]);
        }
        ball(pa, pb, 60, 2.5, '#8d979f');
      }
    }
    if(state.roof){
      // kite: a diamond lying in a plane at the end of the string
      const ka = W*0.34, kb = -40, kz = H+150;
      ctx.strokeStyle='#e8ddc8'; ctx.lineWidth=1.8;
      const s0=P(W*0.22,-40,H+10), s1=P(ka,kb,kz-30);
      ctx.beginPath(); ctx.moveTo(s0.x,s0.y);
      ctx.quadraticCurveTo(s0.x+34*K, s0.y-52*K, s1.x, s1.y); ctx.stroke();
      poly([P(ka,kb,kz+28),P(ka+20,kb,kz),P(ka,kb,kz-30),P(ka-20,kb,kz)], '#4aa8c4', '#f4e2b0', 2);
      ctx.strokeStyle='#f4e2b0'; ctx.lineWidth=2;
      const t0=P(ka,kb,kz+28), t1=P(ka,kb,kz-30);
      ctx.beginPath(); ctx.moveTo(t0.x,t0.y); ctx.lineTo(t1.x,t1.y); ctx.stroke();
      box(W*0.60,W*0.84,-140,-104,H,H+20,'#9aa0a6','#7d838a','#6a7076');
    }
    kerb(p,'none');
  }
},
{
  name:'Milliner', head:'Three half-dome awnings, narrow bays',
  tags:['domed awnings','three narrow bays','turned hat blocks','slim unit','scalloped hems'],
  desc:'Hat blocks are turned stands with real crowns and brims, and each dome awning has a shaded underside so it reads as a hood rather than a painted arc.',
  draw(p){
    const wall = '#5a4a63', trim = '#e8d9c0', H = 168, WW = 190;
    body(wall, trim, H, WW);
    slab(0,WW, H, H+8, -1, -12, shade(wall,.7));
    slab(6,WW-6, 128, H-6, -1, -9, shade(wall,1.2), null, trim);
    F(20,WW-20, 136, 152, trim, null,0,-9.5);
    for(let i=0;i<3;i++){
      const x0 = 8+(WW-16)*(i+0.06)/3, x1 = 8+(WW-16)*(i+0.94)/3, col = ['#c26a7e','#4a7a6a','#c9a24a'][i];
      F(x0,x1, 22, 96, '#8f93a8', trim, 2);
      const ha = (x0+x1)/2;
      cyl(ha, -4, 30, 54, 3, shade(wall,1.4));                     // stand
      plateCircle(ha, -4, 56, 17, col, shade(col,.78), 2);         // brim
      ball(ha, -4, 62, 9, col);
      // dome awning with an underside
      const l=P(x0-4,0,116), r=P(x1+4,0,116), m=P((x0+x1)/2,28,92);
      ctx.beginPath(); ctx.moveTo(l.x,l.y);
      ctx.quadraticCurveTo(m.x, m.y-34*K, r.x, r.y);
      ctx.quadraticCurveTo(m.x, m.y+2*K, l.x, l.y);
      ctx.closePath(); ctx.fillStyle=col; ctx.fill();
      ctx.strokeStyle=shade(wall,.6); ctx.lineWidth=2; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(l.x,l.y+2);
      ctx.quadraticCurveTo(m.x, m.y+10*K, r.x, r.y+2);
      ctx.quadraticCurveTo(m.x, m.y+3*K, l.x, l.y+2);
      ctx.closePath(); ctx.fillStyle=shade(col,.62); ctx.fill();
      ctx.beginPath(); ctx.moveTo(l.x,l.y+1);
      ctx.quadraticCurveTo(m.x,m.y+1,r.x,r.y+1);
      ctx.strokeStyle=trim; ctx.lineWidth=3; ctx.stroke();
    }
    shopDoor(WW*0.50, wall, trim, null, WW);
    F(WW*0.44,WW*0.56, 52, 92, '#8f93a8', null,0,-6.5);
    if(state.roof) box(WW*0.26,WW*0.52,-140,-100,H,H+20,'#8f969d','#787f86','#697077');
    kerb(p,'none');
  }
},
{
  name:'Bathhouse', tall:true,
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
