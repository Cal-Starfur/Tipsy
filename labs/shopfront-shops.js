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

   Why the Garage earns it. The game's car is len 225, wid 90 -- see the
   correction below. Two bays plus a pedestrian door plus corner and
   mullion piers do not fit in 230 -- the arithmetic leaves 59.9 a bay,
   less than the car itself.

   THE CAR'S SIZE WAS WRONG IN THIS NOTE, found porting the real one
   into the Dealership showroom. It read "len 150, wid 60"; shipped CARC
   is len 225, wid 90, and CARC's own header comment is where the 150/60
   came from -- it quotes "approved in car lab: len 150 x wid 60 x
   chassis 28 x cabin 32 x wheel 16", which is the whole car divided by
   1.5. That division is right for the three HEIGHTS and wrong for the
   two plan dimensions, because the lab's ZSCALE only scales z: a and b
   are game units already. So the heights in that line are usable as
   lab z and the lengths are not, and this note inherited the error.
   The Garage's conclusion is unaffected and in fact strengthened -- a
   59.9 bay against a 225 car rather than a 150 one.
   One bay would fit, and a garage with one bay is a fine building, but
   the brief is two, so the building gets wider instead. ww = T2*4.4 is
   exactly two of the packer's own slots, so the port is a clean "this
   shop occupies two" rather than a number to reverse-engineer.

   EVERY WIDTH IS A WHOLE NUMBER OF SLOTS, and that is the rule the rest
   of this note now rests on. Widths are written as multiples of T2*2.2
   so a shop never asks the packer for a number it has to reverse-
   engineer -- it asks for n slots.

     ww          slots  who
     230 (W)       1    most of the library
     T2*4.4  404.8 2    Garage, Bank, Gym, Toy shop, Fuel station,
                        Furniture showroom
     T2*6.6  607.2 3    Fire station
     1048.8        5    Playhouse, and the three landmarks

   THE THREE-SLOT TIER EXISTS BECAUSE SOMETHING NEEDED IT. The Fire
   station is three appliance bays, a crew entrance and a drill tower;
   two slots will not hold that and a whole edge is more ground than a
   station occupies. It was the gap in the ladder, not a new idea --
   the packer's own arithmetic already had the number.

   FOUR IS MISSING AND THAT IS FINE. Nothing so far wants 809.6, and a
   tier with no occupant is a tier that will be wrong when one arrives.
   Add it when a building asks.

   AND DEPTH IS NOW A DIMENSION TOO. `dd` overrides the shop depth D of
   276 the way ww overrides W. A shop's depth used not to matter because
   nothing was deep enough for it to show, but an auditorium (dd 620) or
   an appliance room (dd 420) is a real volume -- the game's car is 150
   long, so a pump bay at 276 would be a facade with nothing behind it.
   The port needs the packer to know the footprint, not just the
   frontage, and the corner-margin inset is computed from STORE_DEPTH.

   The bench honours ww for the pavement, the guide box and the measure
   pass, and draws the single-slot boundary as a faint line so the
   overrun stays visible while this is open. shopD() does the same for
   dd, which the first landmark needed -- see the note below.
   ===================================================================== */

/* ============ BLOCK LANDMARKS, OPEN AT THE PORT ============
   `block: true` says a shop is not a unit in a run at all: it takes a
   whole block edge, stands in its own yard, and has an entrance on
   every street. `bTodo` marks the ones that SHOULD be and are not yet.

   The measurements, because I got them wrong once and reported it with
   confidence. len: BLOCK = 3128 is the WORLD-PERIMETER lot case from
   buildExteriorLots. An interior block edge is the side of the block
   rect:

     BLOCK pitch                             3128
     inset = ROAD_HALF + SIDEWALK_W           736
     block land                       1656 x 1656
     cornerMargin = STORE_DEPTH + T2*0.3    303.6
     usable edge run                        1048.8
     units per edge                     5, at 209.8

   So a whole edge is 1048.8, and a double-wide at 404.8 is already 1.93
   of five slots -- nearly 40% of an edge. The step from wide unit to
   landmark is 2.59x, not 6x.

   THERE ARE TWO TREATMENTS AND THEY ARE NOT THE SAME, and both now have
   an occupant. Block WIDTH takes the whole edge and builds TO THE LINE,
   with no yard, because that is what the type does. Block LANDMARK is
   freestanding, set back, with a yard and four entrances. Only
   genuinely freestanding types want the second, and `block: true` means
   that one and only that one.

     block WIDTH     ww 1048.8, no block flag     Playhouse
     block LANDMARK  block:true, ww = dd = 1048.8 Bathhouse, Chapel,
                                                  Nursery

   WHICH IS WHY SIZE IS NOT THE TEST. The Bank is the largest building
   here at H 460 and must NOT get it: a portico lands ON the pavement,
   which is the whole point of a portico, and a setback would destroy
   it. Same for the Cinema. The Playhouse is the worked example of the
   other treatment -- it took the whole edge and stayed on the line,
   because a marquee exists to overhang the footway. Ask what the
   building does at its own front door, not how big it is.

   THE SAME TEST DECIDED THE FIRE STATION, one tier down. Its bTodo read
   "the apron is working forecourt, not decoration", and a forecourt
   sounds like a yard. It is not one: the appliance doors open straight
   onto the footway because an engine has to be on the road in seconds,
   and an apron is the paved strip it crosses. Three slots, on the line.
   A flag saying a building is big is not a flag saying it is
   freestanding, and bTodo has now been wrong once for exactly that
   reason.

   SO THERE ARE FOUR PLACEMENT BEHAVIOURS, not two, and the port has to
   tell them apart:

     1  one slot                packEdgeNoGap as it stands
     2  n slots, n = 2 or 3     the packer emits a wide slot; the
                                chooser knows which bodies may sit in
                                one; one dropoff
     3  whole edge, on the line the packer yields the edge; still one
                                frontage, still one dropoff
     4  whole edge, landmark    placed INSTEAD of packing that edge,
                                on a square lot, with FOUR dropoffs

   Three and four differ in more than the yard: a landmark is entered
   from any of four streets, so twelve doors along a run become one
   building with four registrations, while a block-width building is
   still one frontage with one door to deliver to. The type dispatch in
   buildBlocks already picks housing/park/commercial per block, so a
   fourth type is the hook for case 4; cases 2 and 3 are packer work.

   AND ONE LANDMARK IS DRIVABLE THROUGH. The Nursery's yard is ground,
   not building -- gravel, a cross of paths and four gates -- so unlike
   the Bathhouse and the Chapel its collision volume is the fence line,
   the hut and the two glasshouses rather than the footprint. That is
   the first shop in this file whose interior the game is meant to let
   Tipsy into, and it will need saying out loud when the block type is
   written.

   AND TWO KIT GAPS FOUND BUILDING THE FIRST ONE, both still open and
   both now worked around four times. shopDoor draws at b 0, the
   frontage plane, because every other building in this file has its
   face there -- a set-back building has to draw its door by hand until
   shopDoor takes a depth. And kerb() places props against the hardcoded
   W with no width argument, so it cannot be used on any wide unit at
   all, let alone a landmark; every shop past one slot calls
   kerb(p,'none') or does not call it.

   A THIRD THING, learned on the two biggest. body() lays its roof plate
   down as shade(trim,1.05). That is right on a 230 shop, where the
   plate is a sliver, and wrong the moment the footprint is large: at
   1048 by 620 it is the biggest thing on screen and brighter than the
   building under it, so the Playhouse and the Fire station both
   overdraw it with T(0,ww,-dd,0,H+0.4,...) in a roofing colour. If a
   fourth building needs the same line, the plate shade belongs in the
   kit as an argument rather than in three shop bodies.
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

/* ================= WALL FRAMES, OPEN AT THE KIT =================
   reveal(), glaze() and shopDoor() are written in a and z with b nailed
   to 0, because every other building in this file has its face there.
   That is fine for a terrace unit with party walls at both ends and it
   is useless the moment a building takes a whole block edge and has a
   cross street at each end -- see the Apartments and the Dealership,
   which both need a real elevation on four faces.

   A WALL FRAME is a map from (u along the elevation, n out of it, v up)
   to world (a, b, z), and the primitives below are written against a
   frame instead of against b = 0.

     FR_FRONT  u = a,       n = +b        street
     FR_RIGHT  u = -b,      n = +a        cross street
     FR_LEFT   u = -b,      n = -a        cross street
     FR_BACK   u = WW - a,  n = -b        rear

   rev() and glz() are frame-general reveal() and glaze(): identical
   arithmetic, and on FR_FRONT they reduce to the originals exactly.
   THIS IS STILL THE WRONG PLACE FOR THEM. A primitive that exists twice
   is what this whole file is arranged to prevent, and these are a
   second copy of two that already live in the kit -- they are at file
   scope rather than inside a shop body only so that the two whole-edge
   buildings share one copy instead of holding two. When the kit takes a
   frame argument, rev, glz and doorF all delete themselves. kTodo on
   both shops says so.

   WHICH RETURN A RECESS EXPOSES IS DERIVED, not written down. A recess
   shifts on screen; decomposing that shift into the frame's own u and v
   screen steps says which way the contents move, and the gap opens on
   the opposite side. On FR_FRONT that comes out as the low-u jamb and
   the cill, which is exactly what reveal() hardcodes; on FR_RIGHT it
   comes out as the far end of the flank instead. No per-face case.

   DRAW ORDER IS THE CALLER'S JOB and it is not optional: a box's far
   faces must be painted BEFORE the solid or they stand in open sky
   above it. Measured on the Apartments: at screen x = 300K the far
   flank runs y -675K to -150K while the front wall only reaches -375K,
   so 300 units of it are uncovered -- and the roof plate spans exactly
   -675K to -375K at that x. The roof is what hides the far side. So:
   back, far flank, body(), near flank, front, with FLANK_RIGHT saying
   which flank is which -- the same test body() uses for its end wall.
   ===================================================================== */
/* AN ORIGIN, because a landmark's building does not start at 0. The four
   whole-edge shops all fill their lot, so their frontage IS a = 0 and
   b = 0; a school standing in a park does not, and translating the frame
   is the only difference between the two cases. oa and ob default to 0,
   so nothing that already calls this changes. */
function wallFrames(WW, DD, OA, OB){
  const oa = OA || 0, ob = OB || 0;
  /* ---- the wall frames, and the primitives written against them ---- */
  const FR_FRONT = { P:(u,n,v)=>[oa+u, ob+n, v],        len:WW, kind:'front' };
  const FR_RIGHT = { P:(u,n,v)=>[oa+WW+n, ob-u, v],     len:DD, kind:'flank'  };
  const FR_LEFT  = { P:(u,n,v)=>[oa-n, ob-u, v],        len:DD, kind:'flank'  };
  const FR_BACK  = { P:(u,n,v)=>[oa+WW-u, ob-DD-n, v],  len:WW, kind:'back'   };
  const Q = (fr,u,n,v) => { const c = fr.P(u,n,v); return P(c[0],c[1],c[2]); };
  const R = (fr,u0,u1,v0,v1,n,fill,stroke,lw) =>
    poly([Q(fr,u0,n,v1),Q(fr,u1,n,v1),Q(fr,u1,n,v0),Q(fr,u0,n,v0)], fill, stroke, lw);
  /* a panel with real thickness: face, the end return that is seen,
     and the top plate -- slab(), asked of a frame */
  /* THE END RETURN IS OPTIONAL, and the corners are why. A course that
     WRAPS the building has no end -- the next elevation continues it --
     but bandF was capping every run, and the front is drawn after the
     flank, so each wrapping band painted a dark end cap straight onto
     the corner it was supposed to turn. Three courses, a cornice and
     two corner pilasters, six dark wedges down one corner.

     `em` is a mask of which ends may be capped: bit 0 is the u0 end,
     bit 1 the u1 end, 3 both, 0 none. The end that WOULD be seen is
     still derived from P() -- the mask only says whether it exists --
     so a run that is capped at one end still caps the correct one
     whichever way the block edge runs.

     And a wrapping run is extended PAST the corner at each end, by its
     own projection plus two. Extending by exactly the projection is
     not enough and that was the visible seam Sir found: the front
     band's face and the flank band's face then abut on the identical
     screen column, and two antialiased quads that share an edge and
     do not overlap leave a hairline of background between them. It
     ran the full height of the corner pier. Two units of overlap is
     hidden inside the corner and closes it. */
  const bandF = (fr,u0,u1,v0,v1,n0,n1,front,side,top,em) => {
    const mask = em === undefined ? 3 : em;
    R(fr,u0,u1,v0,v1,n0,front);
    const o = Q(fr,u0,n0,v0), du = Q(fr,u0+1,n0,v0);
    const hi = (du.y - o.y) > 0, eu = hi ? u1 : u0;
    if(mask & (hi ? 2 : 1))
      poly([Q(fr,eu,n0,v1),Q(fr,eu,n1,v1),Q(fr,eu,n1,v0),Q(fr,eu,n0,v0)], side || shade(front,.78));
    poly([Q(fr,u0,n0,v1),Q(fr,u1,n0,v1),Q(fr,u1,n1,v1),Q(fr,u0,n1,v1)], top || shade(front,1.14));
  };
  const rev = (fr,u0,u1,v0,v1,deep,col) => {
    const o = Q(fr,u0,0,v0), du = Q(fr,u0+1,0,v0), dv = Q(fr,u0,0,v0+1), dn = Q(fr,u0,-1,v0);
    const ux = du.x-o.x, uy = du.y-o.y, vx = dv.x-o.x, vy = dv.y-o.y;
    const sx = dn.x-o.x, sy = dn.y-o.y, det = ux*vy - vx*uy;
    const al = (sx*vy - vx*sy)/det, be = (ux*sy - sx*uy)/det;   // shift, in u and v
    const ju = al > 0 ? u0 : u1, cv = be > 0 ? v0 : v1;         // gap opens opposite it
    ctx.save();
    poly([Q(fr,u0,0,v1),Q(fr,u1,0,v1),Q(fr,u1,0,v0),Q(fr,u0,0,v0)]); ctx.clip();
    R(fr,u0,u1,v0,v1,-deep,col);
    poly([Q(fr,ju,0,v0),Q(fr,ju,-deep,v0),Q(fr,ju,-deep,v1),Q(fr,ju,0,v1)], shade(col,.84));
    poly([Q(fr,u0,0,cv),Q(fr,u1,0,cv),Q(fr,u1,-deep,cv),Q(fr,u0,-deep,cv)], shade(col,.72));
    ctx.restore();
  };
  const glz = (fr,u0,u1,v0,v1,frame,tint) => {
    const w = u1-u0, h = v1-v0;
    R(fr,u0,u1,v0,v1,-0.4, tint || 'rgba(104,146,168,.92)');
    poly([Q(fr,u0,-0.30,v1),Q(fr,u0+w*0.30,-0.30,v1),Q(fr,u0+w*0.06,-0.30,v0),Q(fr,u0,-0.30,v0)],
         'rgba(240,250,254,.20)');
    poly([Q(fr,u0,-0.22,v1),Q(fr,u1,-0.22,v1),Q(fr,u1,-0.22,v1-h*0.06),Q(fr,u0,-0.22,v1-h*0.06)],
         'rgba(255,255,255,.16)');
    if(frame){
      R(fr,u0-3,u0,v0-3,v1+3,0.5,frame);  R(fr,u1,u1+3,v0-3,v1+3,0.5,frame);
      R(fr,u0-3,u1+3,v1,v1+3,0.5,frame);  R(fr,u0-3,u1+3,v0-3,v0,0.5,frame);
    }
  };
  /* shopDoor on a frame. Built from the kit's own SHOP_DOOR_W and
     SHOP_DOOR_H so the openings on the flanks are the same door the
     front gets from shopDoor() -- the front still calls the kit, so
     the one the pickup worker walks out of stays canonical. */
  const doorF = (fr, uMid, w, t) => {
    const hw = SHOP_DOOR_W/2, dH = SHOP_DOOR_H/ZSCALE;
    const mid = Math.max(hw+5, Math.min(fr.len-hw-5, uMid));
    const u0 = mid-hw, u1 = mid+hw;
    R(fr,u0-4,u1+4, 0, dH+7, 0.3, shade(w,.90));
    R(fr,u0,u1, 0, dH, 0.4, '#2b2118');
    R(fr,u0+2,u1-2, dH-26, dH-4, 0.45, 'rgba(96,132,152,.94)');
    R(fr,u0+2,u1-2, dH-30, dH-26, 0.7, shade(t,.8));
    R(fr,u0+2,u1-2, 0, dH-30, 0.6, t);
    for(let k=0;k<2;k++)
      R(fr,u0+8,u1-8, dH*0.07+k*dH*0.36, dH*0.30+k*dH*0.36, 0.9, shade(t,1.18), shade(t,.7), 1.5);
    R(fr,u1-14,u1-10, dH*0.40, dH*0.53, 1.2, '#d8c28a');
  };
  /* a solid inside a frame -- the two faces that turn toward the eye and
     the top, each chosen by the same screen-y test box() and slab() use,
     so a car parked in a showroom sits the right way round on all four
     block edges. */
  const qbox = (fr,u0,u1,n0,n1,v0,v1,top,fu,fn) => {
    const o = Q(fr,u0,n0,v0), du = Q(fr,u0+1,n0,v0), dn = Q(fr,u0,n0+1,v0);
    const eu = (du.y - o.y) > 0 ? u1 : u0, en = (dn.y - o.y) > 0 ? n1 : n0;
    poly([Q(fr,u0,en,v1),Q(fr,u1,en,v1),Q(fr,u1,en,v0),Q(fr,u0,en,v0)], fn);
    poly([Q(fr,eu,n0,v1),Q(fr,eu,n1,v1),Q(fr,eu,n1,v0),Q(fr,eu,n0,v0)], fu);
    poly([Q(fr,u0,n0,v1),Q(fr,u1,n0,v1),Q(fr,u1,n1,v1),Q(fr,u0,n1,v1)], top);
  };
  return { FR_FRONT, FR_RIGHT, FR_LEFT, FR_BACK, Q, R, bandF, rev, glz, doorF, qbox,
           NEAR: FLANK_RIGHT ? FR_RIGHT : FR_LEFT,
           FAR:  FLANK_RIGHT ? FR_LEFT  : FR_RIGHT };
}

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
  bTodo:'already a building plus an open lot -- needs the setback and the wrap',
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
  name:'Chapel', tall:true, block:true, ww: 1048.8, dd: 1048.8,
  wTodo:'a whole block edge -- five packing slots, and the packer places none of them',
  head:'Chapel in its own churchyard, tower and spire, four gates',
  tags:['block landmark','churchyard on four sides','pitched nave','tower and pyramid spire','tallest thing in the library'],
  desc:'A chapel standing in its own churchyard rather than wedged between two shops: a pitched nave on the long axis with a west door facing the street, an engaged tower and spire, headstones in the grass and a walk in from every side.',
  draw(p){
    /* ================= A CHAPEL WEDGED BETWEEN TWO SHOPS =============
       The old one was already two slots wide and correctly tall, and it
       was still wrong in the way that matters most: it was a terrace
       unit. A church between a butcher and a pawnbroker is not a small
       church, it is a category error -- the type is freestanding, has
       a churchyard, and is approached rather than walked past.

       So this is the second block landmark, and Sir asked for the same
       treatment the Bathhouse got. Lot 1048.8 square, yard 130 all
       round. The measurements are in the BLOCK LANDMARKS note at the
       head of this file.

       THE PLAN IS NOT A BOX, WHICH IS THE NEW PART. The Bathhouse was
       a square building centred in a square lot, so its yard was an
       even border. A chapel is a long nave with a tower stuck on one
       corner, so the yard is a different width on every side and the
       four walks cannot simply run to the middle of each face.

       The nave runs on b -- the long axis pointing away from the
       street -- so the WEST FRONT faces the front street and you
       approach the principal door head on, which is how a church is
       meant to be met. That also puts the nave flank and the tower on
       the right elevation, which is the other face this camera sees, so
       both visible sides carry real content.

         nave    a 360..690   b -170..-830   290 wide, 660 long
         tower   a 690..850   b -170..-330   engaged at the west end
         ridge   a 525, apex 440 over eaves at 300
         spire   680, still the tallest thing in the library

       FOUR GATES, and the walks go to the doors rather than to the
       centres of the faces. West to the great door, east to the chancel
       door, north to the nave side door, and the fourth to the TOWER
       door, because the tower is what occupies that side of the lot --
       a walk to the middle of the right-hand face would have arrived at
       a blank flank. */
    const LOT = 1048.8, Y = 130;
    const wall = '#cfc6b0', trim = '#6b5a44', H = 300;
    const nA0 = 360, nA1 = 690, nB0 = -170, nB1 = -830;
    const ridge = (nA0+nA1)/2, apex = 440;
    const tA0 = 690, tA1 = 850, tB0 = -170, tB1 = -330, tTop = 500, sTop = 680;
    const CA = (nA0+nA1)/2;

    /* ---- the churchyard ---- */
    T(0, LOT, -LOT, 0, 0, '#93a67f');
    T(CA-46, CA+46, nB0, 0, 0.5, '#cfc9b8');                 // west walk, to the great door
    T(CA-46, CA+46, -LOT, nB1, 0.5, '#cfc9b8');              // east walk, to the chancel door
    T(0, nA0, -546, -454, 0.5, '#cfc9b8');                   // north walk, to the nave door
    T(tA1, LOT, tB0-46-30, tB0-30+46, 0.5, '#cfc9b8');       // east-side walk, to the TOWER door
    for(let i=0;i<3;i++){                                    // steps up to the west door
      const r = 12 - i*4;
      T(CA-40+i*3, CA+40-i*3, nB0-r, nB0, 2+i*4, shade(wall,.92));
    }
    /* ---- the churchyard wall, with a gate at every walk ----
       Sir asked for a fence to keep people off the grass, and a
       churchyard wall does a second job worth having: it draws the LOT
       BOUNDARY, which is the line the port has to respect. Everything
       inside it is the shop's own ground; everything outside is footway
       the packer owns.

       A dwarf wall with iron railings on it and a pier either side of
       each opening, which is what a churchyard actually has. The four
       gaps are cut to the four walks rather than placed by eye, so a
       gate can never end up somewhere the path does not go -- the
       segment lists below are derived from the same numbers the walks
       are drawn from.

       DRAWN IN TWO HALVES, FAR AND NEAR. The a=0 and b=-LOT runs are on
       the far side of the building and go before it; the b=0 and a=LOT
       runs are between the camera and the chapel and go after. Drawn
       all at once, the near rails would have been buried by the nave
       and the far ones would have been painted over it -- the same
       painter's rule the Photo studio sawteeth and the Bathhouse's back
       entrances needed. */
    const WH = 14, RH = 46, iron = '#4a4f55';
    const pier = (pa,pb) => {
      box(pa-9, pa+9, pb-9, pb+9, 0, 58, shade(wall,.95), shade(wall,.8), shade(wall,.7));
      slab(pa-12, pa+12, 58, 64, pb+12, pb-12, shade(wall,.86));
    };
    const fenceA = (bb, segs) => { for(const [s0,s1] of segs){
      box(s0, s1, bb-5, bb+5, 0, WH, shade(wall,.9), shade(wall,.76), shade(wall,.66));
      for(let x=s0+14; x<s1-8; x+=30) cyl(x, bb, WH, RH, 2.2, iron);
      tube(s0, bb, RH-4, s1, bb, RH-4, 2.2, iron); } };
    const fenceB = (aa, segs) => { for(const [s0,s1] of segs){
      box(aa-5, aa+5, s1, s0, 0, WH, shade(wall,.9), shade(wall,.76), shade(wall,.66));
      for(let y=s0-14; y>s1+8; y-=30) cyl(aa, y, WH, RH, 2.2, iron);
      tube(aa, s0, RH-4, aa, s1, RH-4, 2.2, iron); } };
    fenceB(0,    [[0,-454],[-546,-LOT]]);                    // far, left
    fenceA(-LOT, [[0,479],[571,LOT]]);                       // far, back
    for(const [pa,pb] of [[0,-454],[0,-546],[479,-LOT],[571,-LOT]]) pier(pa,pb);

    /* Headstones, which are what says churchyard louder than anything
       else on the building. They stand in the LOT, not on the pavement:
       the yard is the shop's own ground and Tipsy drives the road and
       the footway, so these are not the kerb-prop class the cTodo
       census counts. Kept off the walks and out of the nave's shadow. */
    for(const [ga,gb,gh] of [[150,-260,34],[196,-330,28],[132,-410,31],[210,-470,26],
                             [148,-640,33],[206,-700,29],[140,-780,27],[196,-860,32],
                             [790,-560,30],[850,-640,26],[806,-720,33]]){
      box(ga-11, ga+11, gb-7, gb+7, 0, gh, shade(wall,.9), shade(wall,.76), shade(wall,.66));
      poly([P(ga-11,gb+7,gh),P(ga,gb+7,gh+9),P(ga+11,gb+7,gh)], shade(wall,.82));
    }

    /* ---- the nave ----
       Far faces first, then the box, then the near elevations. The east
       and north doors are on faces pointing away from this camera, and
       drawn after the box they would paint straight over the near
       walls -- the Photo studio's sawtooth fault at building scale. */
    F(CA-38, CA+38, 0, 150, shade(trim,1.1), null,0, nB1);    // east door
    F(CA-30, CA+30, 0, 138, shade(wall,.5), null,0, nB1-0.5);
    poly([P(nA0,-546,0),P(nA0,-454,0),P(nA0,-454,150),P(nA0,-546,150)], shade(trim,1.05));
    poly([P(nA0,-538,0),P(nA0,-462,0),P(nA0,-462,138),P(nA0,-538,138)], shade(wall,.5));
    box(nA0, nA1, nB1, nB0, 0, H, shade(wall,.88), shade(wall,1.0), shade(wall,.78));

    /* ---- the pitched roof, ridge running down the nave ---- */
    poly([P(nA0,nB0,H),P(ridge,nB0,apex),P(ridge,nB1,apex),P(nA0,nB1,H)], shade(trim,.78));
    poly([P(ridge,nB0,apex),P(nA1,nB0,H),P(nA1,nB1,H),P(ridge,nB1,apex)], trim);
    ctx.beginPath();
    let q=P(nA0,nB0,H); ctx.moveTo(q.x,q.y);
    q=P(ridge,nB0,apex); ctx.lineTo(q.x,q.y);
    q=P(nA1,nB0,H); ctx.lineTo(q.x,q.y);
    ctx.closePath(); ctx.fillStyle=wall; ctx.fill();          // the west gable
    ctx.strokeStyle=shade(wall,.66); ctx.lineWidth=3; ctx.stroke();
    for(const [ga,gz,ha,hz] of [[nA0,H,ridge,apex],[ridge,apex,nA1,H]]){
      const n=12;
      for(let i=0;i<n;i++)                                    // barge boards
        poly([P(ga+(ha-ga)*i/n, nB0+1.2, gz+(hz-gz)*i/n),
              P(ga+(ha-ga)*(i+1)/n, nB0+1.2, gz+(hz-gz)*(i+1)/n),
              P(ga+(ha-ga)*(i+1)/n, nB0+1.2, gz+(hz-gz)*(i+1)/n-11),
              P(ga+(ha-ga)*i/n, nB0+1.2, gz+(hz-gz)*i/n-11)], shade(trim,1.15));
    }

    /* ---- the west front, set out in courses ---- */
    const FB = nB0 + 0.5;
    slab(nA0, nA1, 168, 178, nB0, nB0-9, shade(wall,.86));    // string course
    slab(nA0, nA1, 286, 296, nB0, nB0-11, shade(wall,.86));   // eaves course
    /* The great door is drawn by hand, not by shopDoor. The kit draws
       at b 0 -- the frontage plane -- and this west front is 170 back
       in its own churchyard, so shopDoor would have stood a door on the
       grass in front of it. Same gap the Bathhouse found; it wants a
       depth argument. */
    const dm = CA;
    F(dm-46, dm+46, 0, 152, shade(trim,1.1), null,0, nB0-0.4);
    F(dm-38, dm+38, 0, 142, shade(wall,.34), null,0, nB0-0.8);
    F(dm-36, dm-2,  8, 134, shade(trim,.85), null,0, nB0-1.2);
    F(dm+2,  dm+36, 8, 134, shade(trim,.85), null,0, nB0-1.2);
    F(dm-3,  dm+3,  8, 134, shade(trim,.6),  null,0, nB0-1.4);
    /* the arch over it: rise = half-span, which is what makes a round
       head rather than a pointed wedge. Half-span 58, so za = 152+116. */
    const dp = (t,bb) => { const u=1-t;
      return P((dm-58)*u + (dm+58)*t, bb, u*u*152 + 2*u*t*268 + t*t*152); };
    ctx.beginPath(); let d0=dp(0,nB0); ctx.moveTo(d0.x,d0.y);
    for(let k=1;k<=14;k++){ d0=dp(k/14,nB0); ctx.lineTo(d0.x,d0.y); }
    ctx.closePath(); ctx.fillStyle=shade(wall,.94); ctx.fill();
    ctx.strokeStyle=shade(wall,.6); ctx.lineWidth=2; ctx.stroke();
    for(let k=0;k<14;k++)
      poly([dp(k/14,nB0),dp((k+1)/14,nB0),dp((k+1)/14,nB0-10),dp(k/14,nB0-10)], shade(wall,1.08));
    for(const xa of [408, 468, 582, 642]){                    // lancets
      F(xa-14, xa+14, 196, 268, '#6f8fa8', trim, 3, nB0-0.5);
      const ap = (t,bb) => { const u=1-t;
        return P((xa-14)*u + (xa+14)*t, bb, u*u*268 + 2*u*t*296 + t*t*268); };
      ctx.beginPath(); let r0=ap(0,nB0-0.5); ctx.moveTo(r0.x,r0.y);
      for(let k=1;k<=10;k++){ r0=ap(k/10,nB0-0.5); ctx.lineTo(r0.x,r0.y); }
      ctx.closePath(); ctx.fillStyle='#6f8fa8'; ctx.fill();
    }
    faceCircle(ridge, nB0-1, 366, 38, trim);                  // rose, in the gable
    faceCircle(ridge, nB0-2, 366, 31, '#6f8fa8');
    faceT(ridge, nB0-3, 366, 31);
    ctx.strokeStyle=trim; ctx.lineWidth=2/(31*K);
    for(let k=0;k<4;k++){ ctx.beginPath(); ctx.moveTo(-Math.cos(k*0.79),-Math.sin(k*0.79));
      ctx.lineTo(Math.cos(k*0.79),Math.sin(k*0.79)); ctx.stroke(); }
    ctx.restore();

    /* ---- the nave's right flank, which is the other face we see ---- */
    const faceR = (q0,q1,z0,z1,c) =>
      poly([P(nA1+0.5,q0,z0),P(nA1+0.5,q1,z0),P(nA1+0.5,q1,z1),P(nA1+0.5,q0,z1)], c);
    faceR(nB0, nB1, 168, 178, shade(wall,.86));
    faceR(nB0, nB1, 286, 296, shade(wall,.86));
    for(const qb of [-400,-480,-560,-640,-720,-800])          // flank lancets
      { faceR(qb+14, qb-14, 196, 282, trim); faceR(qb+10, qb-10, 200, 278, '#6f8fa8'); }

    /* ---- the tower, engaged at the west end ---- */
    slab(tA0, tA1, 0, tTop, tB0, tB1, shade(wall,1.05), shade(wall,.8), shade(wall,.9));
    slab(tA0-4, tA1+4, tTop-14, tTop, tB0+4, tB1-4, shade(wall,.86));   // cornice
    for(let i=0;i<3;i++)                                      // belfry louvres
      F(tA0+11+i*46, tA0+42+i*46, 392, 478, trim, shade(wall,.7), 2, tB0-0.6);
    /* the tower door, which is the fourth entrance and the one the
       east-side walk arrives at */
    poly([P(tA1+0.5,tB0-8,0),P(tA1+0.5,tB0-52,0),
          P(tA1+0.5,tB0-52,132),P(tA1+0.5,tB0-8,132)], shade(trim,1.1));
    poly([P(tA1+0.5,tB0-14,0),P(tA1+0.5,tB0-46,0),
          P(tA1+0.5,tB0-46,120),P(tA1+0.5,tB0-14,120)], shade(wall,.5));
    const sap = P((tA0+tA1)/2, (tB0+tB1)/2, sTop);
    poly([P(tA0-6,tB0+4,tTop), P(tA1+6,tB0+4,tTop), sap], trim);            // spire, front
    poly([P(tA1+6,tB0+4,tTop), P(tA1+6,tB1-4,tTop), sap], shade(trim,.72)); // spire, right
    cyl((tA0+tA1)/2, (tB0+tB1)/2, sTop, sTop+22, 2.4, '#c9a24a');
    slab((tA0+tA1)/2-10, (tA0+tA1)/2+10, sTop+8, sTop+12,
         (tB0+tB1)/2+2.4, (tB0+tB1)/2-2.4, '#c9a24a');
    ball((tA0+tA1)/2, (tB0+tB1)/2, sTop+30, 5, '#c9a24a');
    /* the near two runs, after the chapel, so the rails read in front of
       it rather than being swallowed by the nave */
    fenceA(0,   [[0,479],[571,LOT]]);                        // near, front
    fenceB(LOT, [[0,-154],[-246,-LOT]]);                     // near, right
    for(const [pa,pb] of [[479,0],[571,0],[LOT,-154],[LOT,-246]]) pier(pa,pb);
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
  name:'Bathhouse', tall:true, block:true, ww: 1048.8, dd: 1048.8,
  wTodo:'a whole block edge -- five packing slots, and the packer places none of them',
  head:'Block landmark in its own yard, entrance on every street',
  tags:['block landmark','yard on four sides','four entrances','great arched portal','onion dome'],
  desc:'Not a shop in a run: a freestanding civic building on a whole block edge, set back in its own yard with a walk up to an entrance on each of the four streets. The dome is a real solid of revolution built in world space.',
  draw(p){
    /* ================= A BLOCK LANDMARK, NOT A WIDE SHOP =============
       Sir asked for this to fill a block, with a yard around it and a
       walk up to the entrance, wrapping the corner with a door on all
       four sides. That is a different object from everything else in
       this file and the numbers say why.

       THE BLOCK MEASUREMENTS, and I got these wrong once before. A
       first pass took len: BLOCK = 3128 from buildExteriorLots and
       reported twelve slots and 2520 of frontage. That is the
       WORLD-PERIMETER lot case. An interior block edge is the side of
       the block rect:

         BLOCK pitch                     3128
         inset = ROAD_HALF + SIDEWALK_W   736
         block land            1656 x 1656
         cornerMargin = STORE_DEPTH + T2*0.3   303.6
         usable edge run       1048.8
         units per edge        5, at 209.8 each

       So a whole edge is 1048.8, not 2520, and the old double-wide
       Bathhouse at 404.8 was already 1.93 of five slots. This is 2.59x
       that, not 6.2x.

       THE LOT IS SQUARE. ww 1048.8 by dd 1048.8, which is why the bench
       needed shopD() -- ww taught it not to assume the frontage and the
       pavement plate still ran to a shop's D of 276, which would have
       ended under the building.

       THE YARD IS 130 ALL ROUND, so the building itself is 788.8
       square, centred at a 524.4 and b -524.4. Everything on the
       elevations is set out from that centre rather than from the lot
       edge, so the yard can change without moving the composition.

       FOUR ENTRANCES, and only two of them are visible from this
       camera. The other two are drawn anyway: the bench sees one
       corner, the game will see all four across the block's streets,
       and a door that only exists on the faces we happen to be looking
       at is the FLANK_RIGHT mistake in a different costume.

       WHAT THE PORT STILL NEEDS, beyond wTodo: a block type that places
       this INSTEAD of running packEdgeNoGap on the edge, and four
       dropoff registrations rather than one. The type dispatch already
       picks housing/park/commercial per block, so a fourth type is the
       hook. */
    const LOT = 1048.8, Y = 130;
    const bx0 = Y, bx1 = LOT - Y, bb0 = -Y, bb1 = -(LOT - Y);
    const CA = (bx0+bx1)/2, CB = (bb0+bb1)/2;               // 524.4, -524.4
    const wall = '#dfe4e2', trim = '#2a7a8c', H = 336;
    const MOS = ['#2a7a8c','#c9a24a','#7fa8b4','#b4674a'];

    /* ---- the yard ----
       Lawn over the whole lot, then paved walks from the kerb line to
       each entrance. The walks are drawn at z 0.5 so they sit on the
       lawn rather than fighting it for the same plane. */
    T(0, LOT, -LOT, 0, 0, '#9fb08a');
    T(CA-46, CA+46, bb0, 0, 0.5, '#cfc9b8');                // front walk
    T(bx1, LOT, CB-46, CB+46, 0.5, '#cfc9b8');              // right walk
    T(CA-46, CA+46, -LOT, bb1, 0.5, '#cfc9b8');             // back walk
    T(0, bx0, CB-46, CB+46, 0.5, '#cfc9b8');                // left walk
    for(let i=0;i<3;i++){                                   // steps up to the front door
      const r = 12 - i*4;
      T(CA-40+i*3, CA+40-i*3, bb0-r, bb0, 2+i*4, shade(wall,.92));
    }

    /* ---- the volume ----
       Drawn directly rather than through body(), which starts at b 0
       and runs to the fixed D. This one is set back 130 and is 788.8
       deep, so it needs its own box. */
    /* THE FAR ENTRANCES GO FIRST. Back and left are on faces pointing
       away from this camera; drawn after the box they painted straight
       over the near elevations, which is the Photo studio's sawtooth
       fault at building scale. Far before near, then the box hides
       them, which is what a solid should do to its own back wall. */
    F(CA-42, CA+42, 0, 130, shade(trim,1.1), null,0, bb1);   // back entrance
    F(CA-34, CA+34, 0, 118, shade(wall,.55), null,0, bb1-0.5);
    poly([P(bx0,CB+42,0),P(bx0,CB-42,0),P(bx0,CB-42,130),P(bx0,CB+42,130)], shade(trim,.9));
    box(bx0, bx1, bb1, bb0, 0, H, shade(trim,1.05), shade(wall,1.0), shade(wall,.78));
    slab(bx0-6, bx1+6, H, H+14, bb0-6, bb1, trim);          // cornice, all round

    /* ---- elevations ----
       front is the b = bb0 face, right is the a = bx1 face. Anything on
       the front is an F at a b just proud of bb0; anything on the right
       is a poly at a constant a just proud of bx1, since F only draws
       in the a-z plane. */
    const FB = bb0 + 0.5, RA = bx1 + 0.5;
    const faceR = (q0,q1,z0,z1,c) =>
      poly([P(RA,q0,z0),P(RA,q1,z0),P(RA,q1,z1),P(RA,q0,z1)], c);

    slab(bx0, bx1, 0, 40, bb0, bb0-9, shade(wall,.85));     // plinth, front
    faceR(bb0, bb1, 0, 40, shade(wall,.72));                // plinth, right

    /* high windows over a blank lower wall, which is how a bathhouse
       builds and what gives the arch something to be great against.
       Frames 40 wide on a 61 pitch: screen gap is pitch - width - 7, so
       that is 14 of pier between them. */
    for(const fx0 of [160,221,282,343, 665.8,726.8,787.8,848.8]){
      slab(fx0, fx0+40, 150, 244, bb0, bb0-8, trim);
      F(fx0+4, fx0+36, 158, 236, '#7fa8b4', null,0, bb0-4.5);
      F(fx0+18.5, fx0+21.5, 158, 236, trim, null,0, bb0-3.8);
    }
    for(const q0 of [-190,-251,-312,-373, -675.8,-736.8,-797.8,-858.8]){
      faceR(q0, q0-40, 150, 244, trim);
      faceR(q0-4, q0-36, 158, 236, '#7fa8b4');
    }

    /* ---- the great arched portal, front ----
       Rise = half-span, which is what makes it a round head rather than
       a pointed wedge: a quadratic reaches zs + (za-zs)/2, so za = zs +
       2*halfspan. Outer half-span 92, inner 80, glazing 66. */
    const ax0 = CA-80, ax1 = CA+80;
    const arcAZ = (t,a0,a1,zs,za) => { const u=1-t;
      return { a: a0*u + a1*t, z: u*u*zs + 2*u*t*za + t*t*zs }; };
    const ring = (a0,a1,zs,za,bF,bB,col,side) => {
      const pt = (t,bb) => { const q=arcAZ(t,a0,a1,zs,za); return P(q.a,bb,q.z); };
      ctx.beginPath(); let q=pt(0,bF); ctx.moveTo(q.x,q.y);
      for(let k=1;k<=16;k++){ q=pt(k/16,bF); ctx.lineTo(q.x,q.y); }
      ctx.closePath(); ctx.fillStyle=col; ctx.fill();
      if(side) for(let k=0;k<16;k++)
        poly([pt(k/16,bF),pt((k+1)/16,bF),pt((k+1)/16,bB),pt(k/16,bB)], side);
    };
    F(ax0-12, ax1+12, 0, 150, trim, null,0, bb0);
    ring(ax0-12, ax1+12, 150, 334, bb0, bb0-12, trim, shade(trim,1.25));
    F(ax0, ax1, 0, 144, shade(wall,.55), null,0, bb0-11);
    ring(ax0, ax1, 144, 304, bb0-11, bb0-11, shade(wall,.55), null);
    ring(ax0+14, ax1-14, 152, 284, bb0-11.5, bb0-11.5, '#7fa8b4', null);
    for(let k=1;k<4;k++){
      const g = arcAZ(k/4, ax0+14, ax1-14, 152, 284);
      F(g.a-2.5, g.a+2.5, 152, g.z, trim, null,0, bb0-12);
    }
    /* THE DOOR CANNOT BE shopDoor HERE, and that is worth stating. The
       kit's shopDoor draws at b 0 -- the frontage plane -- because every
       other building in this file has its face there. This one is set
       back 130 into its own yard, so shopDoor put a door standing on
       the grass 130 in front of the wall it belongs to. Drawn by hand
       on the recessed face instead.

       It also wants to be bigger than a shop door: 92 across and 142
       tall against SHOP_DOOR_W 66.2, because this is the principal
       entrance of a civic building at the head of a flight of steps,
       not a shop doorway. */
    F(CA-46, CA+46, 0, 142, shade(trim,1.1), null,0, bb0-10.6);
    F(CA-38, CA+38, 0, 132, shade(wall,.32), null,0, bb0-11.0);
    F(CA-36, CA-2,  8, 124, shade(trim,.85), null,0, bb0-11.4);
    F(CA+2,  CA+36, 8, 124, shade(trim,.85), null,0, bb0-11.4);
    F(CA-3,  CA+3,  8, 124, shade(trim,.6),  null,0, bb0-11.6);

    /* ---- the other three entrances ----
       Simpler than the front, because a bathhouse has one principal
       door and three ways in. Right is visible from this camera; left
       and back are drawn for the port, where they face real streets. */
    faceR(CB+42, CB-42, 0, 130, shade(trim,1.1));
    faceR(CB+34, CB-34, 0, 118, shade(wall,.55));
    faceR(CB+26, CB-26, 6, 104, '#7fa8b4');

    /* ---- mosaic band and name board, wrapping the corner ----
       The band runs the front and turns onto the right face, because a
       block landmark is seen from two streets at once and a band that
       stops at the corner announces which elevation was the real one. */
    slab(bx0, bx1, 262, 280, bb0, bb0-8, shade(trim,.75));
    for(let i=0;i<44;i++){ const tx = bx0+14 + i*17.3;
      if(tx+12 < bx1) F(tx, tx+12, 266, 276, MOS[(i*3)%4], null,0, bb0-0.5); }
    faceR(bb0, bb1, 262, 280, shade(trim,.62));
    for(let i=0;i<44;i++){ const tq = bb0-14 - i*17.3;
      if(tq-12 > bb1) faceR(tq, tq-12, 266, 276, MOS[(i*3+2)%4]); }
    slab(bx0+40, bx1-40, 292, 328, bb0, bb0-8, shade(wall,1.1), null, trim);
    F(CA-150, CA+150, 302, 318, trim, null,0, bb0-0.5);

    if(state.roof){
      /* The dome, scaled to the building rather than to the old 404.8
         frontage: drum r 104 on a 788.8 square reads as a dome on a
         hall instead of a hat on a shed. Built in WORLD space as a
         surface of revolution -- profile is a cubic in (radius,
         height), every gore runs through P(), so its base lands on the
         drum's own ellipse rather than on a straight screen line.

         Depth order is SORTED, not assumed: a dome is convex, so far
         meridians paint before near ones and nearness is
         b = db + R*sin(theta). */
      const da = CA, db = CB, zB = H+56;
      cyl(da, db, H+12, zB, 104, shade(wall,1.02));
      plateCircle(da, db, zB, 110, shade(trim,.8), shade(trim,.6), 2);
      const domeR = t => { const u=1-t; return u*u*u*104 + 3*u*u*t*140 + 3*u*t*t*50; };
      const domeZ = t => { const u=1-t; return 3*u*u*t*96 + 3*u*t*t*166 + t*t*t*216; };
      const NG = 24, NS = 14, gores = [];
      for(let g=0; g<NG; g++){
        const t0 = -Math.PI/2 + 2*Math.PI*g/NG, t1 = -Math.PI/2 + 2*Math.PI*(g+1)/NG;
        gores.push({ t0, t1, near: Math.sin((t0+t1)/2) });
      }
      gores.sort((x,y) => x.near - y.near);
      for(const gg of gores){
        ctx.beginPath();
        for(let k=0;k<=NS;k++){ const t=k/NS, R=domeR(t),
          q=P(da+R*Math.cos(gg.t0), db+R*Math.sin(gg.t0), zB+domeZ(t));
          k? ctx.lineTo(q.x,q.y) : ctx.moveTo(q.x,q.y); }
        for(let k=NS;k>=0;k--){ const t=k/NS, R=domeR(t),
          q=P(da+R*Math.cos(gg.t1), db+R*Math.sin(gg.t1), zB+domeZ(t));
          ctx.lineTo(q.x,q.y); }
        ctx.closePath();
        const m=(gg.t0+gg.t1)/2, lit=(Math.cos(m)-Math.sin(m))/Math.SQRT2;
        ctx.fillStyle = shade(trim, 1.24 - (lit+1)/2 * 0.62);
        ctx.fill();
      }
      const apex = zB + domeZ(1);                            // derived, not typed
      cyl(da, db, apex, apex+44, 4.5, '#c9a24a');
      ball(da, db, apex+56, 10, '#c9a24a');
      for(const [ va, vb ] of [[bx0+90, bb0-90],[bx1-90, bb1+90]]){
        cyl(va, vb, H+12, H+56, 12, '#9aa0a6');
        cyl(va, vb, H+56, H+66, 16, '#aeb4b8');
      }
    }
    kerb(p,'none');
  }
},
{
  name:'Locksmith', head:'Giant brass key on a bracket, barred window, narrow',
  tags:['giant key on a bracket','barred window','narrow unit','recessed glazing','dark name plate'],
  desc:'The key is a projecting bracket sign hanging out over the footway, built as one extruded solid so it has a real thickness and a bow that is round in the world rather than an ellipse. It is centred on the frontage so it stays on the building whichever way the block edge runs. The window is a proper recess with the bars standing outside the glass, the door is ironmonger dark so the brass reads against it, and the facade is set out with piers instead of running edge to edge.',
  draw(p){
    /* ================= THE KEY WAS INSIDE THE BUILDING =================
       Every part of the sign -- bracket arm, bow, shaft and wards --
       sat at b -22. Negative b is INTO the block, so the shop's one
       identifying object was buried 22 units inside its own masonry and
       survived only because it was painted after the wall. Same class
       as the chemist cross at -10 behind a -9 fascia, and it dies the
       moment anything depth-sorts. A bracket sign hangs OUT over the
       footway, which is positive b -- the milliner's hat is the worked
       example, arm at b 2..26, drawn after the fascia it crosses.

       THE BOW WAS AN ELLIPSE. faceCircle(r) draws radius r in a AND in
       z, and z is multiplied by ZSCALE before it is projected, so a bow
       written as r 26 came out 52 wide by 82 tall -- 1.58:1 where the
       correct isometric figure for a circle standing in the frontage
       plane is 1.12:1. The kit already solved this for the chemist by
       dividing the z radius by ZSCALE; the same correction is applied
       here, and because the key is now built as ONE prism rather than a
       circle plus a tube plus three slabs, there are no interior seams
       running through it either.

       AND A WINDOW WAS DRAWN ACROSS THE DOOR. F(WW*0.66, WW-14, 52, 92)
       ran a 110.9..154 against a door opening at 96.8..163 -- a grey
       panel plastered over the top half of the doorway, painted after
       it. It is gone; a 168 frontage does not have room for a second
       window and never did.

       THE FACADE HAD NO PIERS. Window 10..94.1, door 96.8..163: a 2.7
       gap between them and 5 to the far return, which is shopDoor's own
       clamp minimum rather than a chosen margin. Set out again as
       12 pier / 66 window / 10 pier / 66 door / 10 pier. */
    const wall = '#6b6257', trim = '#c9a24a', H = 166, WW = 168;
    /* THE KEY WAS BRASS ON A BRASS DOOR. The sign hangs over the doorway
       and the doorway was painted in the same trim, so the shaft and
       the wards -- the half of a key that says which trade this is --
       ran gold on gold and vanished. A locksmith's door is ironmongery
       anyway, so the leaf goes dark and the brass is spent on the two
       things that have to carry from across the street: the key and the
       name panel. */
    const iron = '#4a4f55', leaf = '#3d4741';
    body(wall, trim, H, WW);
    slab(0,WW, H, H+8, -1, -12, shade(wall,.72));          // cornice: the building's, may wrap

    /* ---- the window: a real recess, with the bars OUTSIDE the glass ----
       The bars ran at b -4 against a pane at b 0, so they were behind
       the glass they are supposed to be protecting -- Class B of the
       fascia check, at window scale. They are at b 1 now, in front of
       the pane, and they span the whole opening: the old five stopped
       at a 75 against an opening that ran to 94, leaving a fifth of the
       glass unbarred at the end nobody would look at twice. */
    reveal(12, 78, 24, 100, 12, shade(wall,.52));
    glaze(12, 78, 24, 100, null, 'rgba(58,68,76,.90)');
    for(let i=0;i<5;i++){
      const aa = 12 + 66*(i+0.5)/5;
      tube(aa, 1, 25, aa, 1, 99, 2.4, shade(wall,1.3));   // 4.8 wide on a 13.2 pitch
    }
    slab(10, 80, 12, 24, -1, -5, shade(wall,.66));         // cill

    shopDoor(125, wall, leaf, null, WW);                   // a 91.88..158.12

    /* ---- fascia ----
       Was slab(6, WW-6, ..., -1, -9): 6 of margin against 9 of recess,
       so the far end of the board came out 3 PAST the building's return
       and there was no pier left at the corner. Rule A wants margin at
       least |bBack| + 6; at 14 against a 7-deep recess the piers are 15
       and 7, which is the chemist's resolution and the smallest shift a
       recessed board can be given without asking a to fix a fault that
       lives in b. */
    slab(14, WW-14, 116, 150, -1, -7, shade(wall,1.04), null, shade(wall,1.2));
    /* The lettering sat at b -9.5 against a board whose back face was
       -9 -- painted inside the board, surviving on call order alone.
       bFront + 0.5 puts it proud of the face, where a painted panel
       belongs, and symmetric in a so it holds on all four headings.
       It is a DARK plate rather than a brass one because the key passes
       in front of it -- see the placement note below -- and brass on
       brass is the fault that has already been fixed once on this
       facade. */
    F(22, WW-22, 122, 144, shade(wall,.60), null, 0, -0.5);

    /* ================= THE KEY =================
       Hung on the milliner's pattern: arm out from the wall at b 2, the
       sign itself a slab of real thickness at b 22..28, and the whole
       thing drawn AFTER the fascia it crosses.

       PLACED SO IT SURVIVES ALL FOUR HEADINGS, which the milliner's is
       not. Screen-a is a - b on edges 1 and 3 and a + b on edges 0 and
       2, so a sign at b 28 swings 28 EACH WAY between mirrored edges --
       the same term the props note gives for kerb props, applied at
       height. A key written at a 153 reads over the doorway here and
       lands at screen-a 181 on a 168 frontage there, hanging off the
       corner onto the neighbour. Centred at a 84 it comes out at 56 or
       112, mirror images about the middle of the shop, and the bow of
       25 stays inside 0..168 on both. Cost of that: the key crosses the
       name plate on every edge, which is what a bracket sign in front
       of a fascia actually does -- the plate is dark for that reason.

       Sized against the headroom note: the tip is at z 86, which is 129
       game units once ZSCALE is applied, and Tipsy's flag reaches 97.
       It projects over the footway and clears by 32. */
    const kA = 84, kZ = 132, kR = 25, kW = 7, kTip = 86, zk = 1/ZSCALE;
    tube(kA, 2, 156, kA, 25, 156, 2.2, iron);              // arm, out over the footway
    tube(kA, 25, 156, kA, 25, 147, 1.6, iron);             // drop
    const ring = (r,n) => { const q = [];
      for(let i=0;i<n;i++){ const t = Math.PI*2*i/n;
        q.push([kA + r*Math.cos(t), kZ + r*Math.sin(t)*zk]); }
      return q; };
    const key = (() => {
      const j = Math.acos(kW/kR), pts = [];
      for(let i=0;i<=24;i++){                              // the bow, round in the WORLD
        const t = -j + (Math.PI + 2*j)*i/24;
        pts.push([kA + kR*Math.cos(t), kZ + kR*Math.sin(t)*zk]);
      }
      pts.push([kA-kW, kTip], [kA+kW, kTip]);              // down the left edge, across the tip
      for(const [z0,z1] of [[kTip+4, kTip+12],[kTip+19, kTip+27]])   // two wards, on the way back up
        pts.push([kA+kW, z0], [kA+kW+18, z0], [kA+kW+18, z1], [kA+kW, z1]);
      return pts;
    })();
    prism(key, 22, 28, trim, shade(trim,.66), shade(trim,1.22));
    poly(ring(kR*0.44, 22).map(([a,z]) => P(a, 28.3, z)), shade(wall,.5));   // the bow's eye

    if(state.roof){
      box(WW*0.30,WW*0.54,-140,-100,H,H+20,'#8f969d','#787f86','#697077');
      cyl(WW*0.72, -60, H+8, H+44, 2.5, '#6d747c');
    }
    kerb(p,'none');
  }
},
{
  name:'Furniture showroom', tall:true, ww: T2*4.4,
  wTodo:'two packing slots',
  head:'Double-width, two storeys of glass, mezzanine across both bays',
  tags:['double-width unit','double-height glazing','mezzanine deck behind the glass','sofa in the round','clipped interior'],
  desc:'A double-width two-storey elevation: two big glazed bays either side of a central entrance, with one mezzanine deck running behind both. The sofa, dining set, wardrobe, chest and lamp stand BEHIND the pane instead of out on the footway, and the interior is clipped to each opening so a piece can be set as deep into the shop as it likes without projecting past a jamb.',
  draw(p){
    /* ============ THE SHOP WAS INSIDE OUT, AND HALF A STOREY SHORT ====
       Two faults, and the second is why the first was never obvious.

       EVERYTHING WAS ON THE PAVEMENT. Positive b is toward the street,
       and the mezzanine slab ran b -1..20, the sofa b 6..40, the
       wardrobe b 6..30 and the lamp b 18 -- so the deck jutted 20 units
       out over the footway and the entire contents of the showroom hung
       in the air outside its own window. It is the exact layering fault
       the SHOPFRONT DEPTH note in the kit was written about, at whole-
       room scale. The sofa's near arm reached screen-a -10, ten units
       past the return onto the neighbour's ground, and it was one of
       the four solids cTodo was counting as pavement props needing
       collision volumes. There are none now.

       AND THE INTERIOR IS CLIPPED. This is what makes it possible to
       put the deck a whole storey back. An object at depth d shifts d
       on screen -- right on edges 1 and 3, LEFT on 0 and 2 -- so a
       sofa 30 into the shop needs 30 of clearance inside BOTH jambs or
       it hangs out of the window on one heading or the other. reveal()
       already solves this for its own backing by clipping to the
       opening quad; the same clip around the goods is what buys the
       depth back, and it is the reason the deck can be 44 deep and the
       bays still only as wide as they are.

       zTodo 1.27 WAS THE SAME FAULT SEEN FROM OUTSIDE. The shop drew
       double-height glazing, a mezzanine and a wardrobe standing on it,
       on a wall of 214 -- 1.27 storeys, so the whole two-storey scheme
       was crammed into one and a quarter and every level of it had to
       be pushed out of the building to fit. At H 336 it is 2.00 and the
       levels are real: ground floor 0..168, deck 168..180, upper floor
       180..336, all of it inside.

       A WINDOW WAS DRAWN ACROSS THE DOOR, second instance this session
       after the Locksmith. F(W*0.82, W-14, 54, 98) ran a 188.6..216
       against a door opening at 158.8..225 -- a blue-grey panel over
       the top half of the doorway. Gone; the upper floor gets its own
       windows above the door, where there was blank wall.

       AND IT IS TWO SLOTS WIDE NOW, at Sir's direction, on the Garage's
       terms: ww = T2*4.4 is exactly two of packEdgeNoGap's own slots
       rather than a number to reverse-engineer, and wTodo says the game
       cannot place it yet. A furniture showroom is a big-box type -- it
       needs floor, and one bay of sofa was never going to say that. The
       elevation is set out symmetrically about the entrance: pier 16,
       bay 139, pier 14.3, door 66.2, pier 14.3, bay 139, pier 16. */
    const wall = '#a89a86', trim = '#4a3f36', H = 336, WW = T2*4.4;   // 404.8
    /* THE PANE IS LIGHTER THAN THE KIT'S DEFAULT, ON PURPOSE. glaze()
       is nearly opaque because at this scale there is usually nothing
       behind it worth seeing. Here there is -- a deck and five pieces
       of furniture, all modelled -- so the tint drops to .42 and the
       goods are pitched BRIGHT against a dark interior rather than mid
       against mid. A lit backing was tried first and is wrong: it puts
       the room and its contents within a few percent of each other and
       everything behind the glass turns to one wash, which is the state
       the pane is nearly opaque to avoid. */
    const inner = '#2e2a24', glass = 'rgba(96,132,152,.42)';
    const WZ0 = 20, WZ1 = 280;                           // the shopfront opening
    const DK0 = 168, DK1 = 180;                          // the mezzanine deck
    const B1 = [16, 155], B2 = [249.8, 388.8];           // the two bays
    body(wall, trim, H, WW);
    slab(0,WW, H, H+12, -1, -12, trim);                  // cornice

    /* One bay: recess, deck, goods, pane, frame. Both bays go through
       this rather than being written twice -- the same reason there is
       one chemist body and two liveries. */
    const bay = (a0, a1, fit) => {
      reveal(a0, a1, WZ0, WZ1, 34, inner);
      ctx.save();
      poly([P(a0,0,WZ1),P(a1,0,WZ1),P(a1,0,WZ0),P(a0,0,WZ0)]);
      ctx.clip();
      slab(a0-4, a1+4, DK0, DK1, -8, -44, '#b3a58c', null, '#c6b89f');
      fit();
      ctx.restore();
      glaze(a0, a1, WZ0, WZ1, null, glass);
      const n = Math.round((a1-a0)/35);                  // mullions, on a 35 pitch
      for(let k=1;k<n;k++){
        const aa = a0 + (a1-a0)*k/n;
        F(aa-2.5, aa+2.5, WZ0, WZ1, shade(wall,.72), null,0, 0.8);
      }
      F(a0, a1, DK0-2, DK1+2, shade(wall,.72), null,0, 0.8);   // deck transom
    };

    bay(B1[0], B1[1], () => {
      /* THE SOFA WAS A SLAB. Seat 22..50, arms to 60, back to 68 -- 18
         units of articulation on a 46-unit object, and through a tinted
         pane that is no articulation at all. A sofa reads from three
         steps, so it gets three: cushion at 44, arms at 64, back at 88,
         and the cushion is pitched lighter than the frame rather than
         within a shade of it. */
      box(40,130, -44,-34, 18, 88, '#a06a82','#8e5c73','#7c4e64');   // back
      box(40,54,  -40,-14, 18, 64, '#a06a82','#8e5c73','#7c4e64');   // arm
      box(116,130,-40,-14, 18, 64, '#a06a82','#8e5c73','#7c4e64');   // arm
      box(48,122, -38,-16, 18, 44, '#d7a2b4','#c48fa2','#ad7b8d');   // cushion
      box(44,84,  -42,-18, DK1, DK1+74, '#c49a68','#d3aa79','#ac855a');   // wardrobe
      F(62,66, DK1+6, DK1+68, shade(wall,1.2), null,0, -17.5);            // its door line
      cyl(112, -24, DK1, DK1+56, 2.4, '#c9ccd0');                         // standard lamp
      const l0 = P(112,-24,DK1+56), l1 = P(112,-24,DK1+76);
      ctx.beginPath();
      ctx.moveTo(l0.x-9*K, l0.y); ctx.lineTo(l0.x+9*K, l0.y);
      ctx.lineTo(l1.x+15*K, l1.y); ctx.lineTo(l1.x-15*K, l1.y);
      ctx.closePath(); ctx.fillStyle='#e8d9bd'; ctx.fill();
      ctx.strokeStyle=shade('#e8d9bd',.8); ctx.lineWidth=1.5; ctx.stroke();
    });

    bay(B2[0], B2[1], () => {
      // dining set on the ground floor
      for(const aa of [292, 344]) box(aa,aa+8, -38,-16, 18, 46, '#ac855a','#bd956a','#997448');
      box(286,354, -42,-12, 46, 54, '#dcb489','#c8a077','#b08c66');       // table top
      for(const aa of [262, 358]){                                        // two chairs
        box(aa,aa+24, -36,-16, 18, 40, '#c49a68','#d3aa79','#ac855a');    // seat
        box(aa,aa+24, -36,-30, 18, 76, '#c49a68','#d3aa79','#ac855a');    // back
      }
      box(276,330, -42,-18, DK1, DK1+50, '#c49a68','#d3aa79','#ac855a');  // chest, on the deck
      for(let k=0;k<3;k++)
        F(282,324, DK1+8+k*14, DK1+18+k*14, shade('#c49a68',1.24), null,0, -17.5);
      box(344,378, -42,-20, DK1, DK1+86, '#9d6f45','#ae7f52','#8a603a');  // bookcase
      for(let k=0;k<4;k++)
        F(348,374, DK1+14+k*18, DK1+18+k*18, '#e2c79c', null,0, -19.5);
    });

    shopDoor(WW/2, wall, trim, null, WW);                // a 169.28..235.52
    /* the upper floor's own window, over the door, where the panel that
       was painted across the doorway used to be */
    reveal(172, 232, 190, 268, 12, inner);
    glaze(172, 232, 190, 268, null, glass);
    F(201, 203, 190, 268, shade(wall,.72), null,0, 0.8);

    /* ---- fascia ----
       Was slab(6, W-6, H-26, H-6, -1, -10): 6 of margin against 10 of
       recess put the far end at screen-a 234 against a return at 230.
       Margin 16 against an 8-deep recess leaves piers of 17 and 8. The
       lettering was at b -10.5, behind the board's own -10 backing;
       bFront + 0.5 puts it proud of the face. */
    slab(16, WW-16, 288, 324, -1, -8, trim);
    F(28, WW-28, 296, 316, shade(wall,1.16), null,0, -0.5);

    /* THE HOIST IS GONE, at Sir's direction. It was a beam, a brace, a
       chain and a hook reaching b 64 out over the footway from above
       the cornice -- five objects and the only thing on the building
       that had to be re-checked on both b signs, and it read as a crane
       on a shop rather than a loft hoist on a warehouse. The showroom
       says what it is with two storeys of glass and what is standing
       behind them; it does not need a machine on the roof as well. */
    if(state.roof)
      box(WW*0.62,WW*0.86,-160,-116,H,H+26,'#8f969d','#787f86','#697077');
    kerb(p,'none');
  }
},
{
  name:'Nursery', block:true, ww: 1048.8, dd: 1048.8,
  wTodo:'a whole block edge -- five packing slots, and the packer places none of them',
  cTodo:'fence line, sales hut and two glasshouses need volumes; the yard itself is drivable',
  head:'Garden centre on a whole block: small hut, big yard, two glasshouses',
  tags:['block landmark','yard on four sides','four gates','two span glasshouses','small hut in a big lot'],
  desc:'Not a shop in a run and not a shop with a conservatory bolted on: a garden centre occupying a whole block edge. The building is deliberately tiny -- a timber sales hut in one corner -- and everything else is what a nursery actually is, which is ground: a gravelled yard on a cross of paths, four ranks of staging under the open sky, and two span glasshouses along the back.',
  draw(p){
    /* ============ WHY THIS IS A LANDMARK AND NOT A SHOP ============
       Sir asked for the whole block, with the shop itself kept small
       and the room going to the plants. That is the right call and the
       type argues for it: a nursery is a LOT with a hut on it, the way
       a chapel is a churchyard with a church in it. Everything the old
       one did wrong came from trying to be a 230 terrace unit --

         glasshouse   a 6..161 at gb 76, outer corner on screen-a -70,
                      seventy past the near return, and 237 on the
                      mirrored heading, seven past the far one
         palm pots    a 22 at b 40 with r 11, screen-a -33.6..-2.4
         flower pots  written at a W+19, W+45, W+71, outside on purpose
         fence        a -10 at b 96, screen-a -106

       -- and every one of those is the same sentence: the shop needed
       more ground than a slot has, so it took the neighbour's. cTodo
       counted twenty-one prop volumes and eighty-two units of overrun.
       On its own block there is no neighbour to lap onto and no reason
       to keep the stock small.

       THE MEASUREMENTS are the BLOCK LANDMARKS note at the head of this
       file: usable edge run 1048.8, a square lot, five packing slots.
       Same as the Bathhouse and the Chapel, and wTodo says the same
       thing -- the packer places none of them yet.

       THE PLAN. A cross of paths splits the lot into four quarters and
       puts a gate on each of the four streets, which is what a block
       landmark owes: an entrance a robot can arrive at from any side.

         front centre  the sales hut, 280 x 220, ON the spine, set back
                       220 so the gate stands clear in its forecourt
         front left    a sixteen-tree grove on a 100 by 110 grid
         front right   four ranks of staging, clear of the hut in a
         back          two span glasshouses, 390 square each

       THE DOOR IS ON THE GATE'S AXIS, at Sir's direction, and it has to
       be built that way rather than nudged: the hut moved to a 385..665
       so its opening lands on 494..556, dead centre of a gate gap at
       490..560. The spine path is split at the hut rather than run
       under it -- front length from the gate to the door, back length
       from the rear gate to the cross walk -- because a path drawn
       through a building is a path drawn through a building whichever
       object happens to be painted last.

       THE HUT IS SMALL ON PURPOSE and carries no zTodo for it. H 150 is
       0.89 storeys, which would be undersized for a shopfront in a run
       and is right for a timber hut standing alone in a yard -- the
       thing that makes this building read is the 1048 of ground around
       it, not its own height.

       SHOPDOOR IS NOT USED, and could not be: it draws at b 0, the
       frontage plane, and this door is 140 back. That is one of the two
       kit gaps the BLOCK LANDMARKS note already records; the hut rolls
       its own opening the way the Bathhouse and the Chapel do. kerb()
       is the other, and is simply not called. */
    const LOT = 1048.8;
    const wall = '#c9bfa6', trim = '#3f6b4a', tim = '#8a6f4e';
    const pane = 'rgba(180,214,204,.50)';
    const GAP0 = 490, GAP1 = 560;                 // the gate gap, both axes

    /* ---- the ground: gravel, then the cross of paths on top of it ---- */
    T(0, LOT, -LOT, 0, 0, '#b3aa93');
    T(GAP0, GAP1, -220, 0, 0.5, '#d6d0bd');       // front gate to the hut door
    T(GAP0, GAP1, -LOT, -440, 0.5, '#d6d0bd');    // back gate to the cross walk
    T(0, LOT, -GAP1, -GAP0, 0.5, '#d6d0bd');

    /* ---- the boundary, and the four gates ----
       Runs are broken at the gate gap on all four sides. The back and
       left fences face away from this camera and are drawn anyway, for
       the reason the Bathhouse gives about its far entrances: a gate
       that only exists on the faces we happen to be looking at is the
       FLANK_RIGHT mistake in a different costume. */
    const FH = 40;
    const railA = (bb, a0, a1) => {
      for(const z of [FH-8, FH-24]) tube(a0, bb, z, a1, bb, z, 2.5, shade(trim,1.1));
      for(let a=a0; a<=a1+0.1; a+=Math.max(1,(a1-a0)/Math.round((a1-a0)/62)))
        cyl(a, bb, 0, FH, 5, trim);
    };
    const railB = (aa, b0, b1) => {
      for(const z of [FH-8, FH-24]) tube(aa, b0, z, aa, b1, z, 2.5, shade(trim,1.1));
      for(let b=b0; b>=b1-0.1; b-=Math.max(1,(b0-b1)/Math.round((b0-b1)/62)))
        cyl(aa, b, 0, FH, 5, trim);
    };
    /* a gate: two tall posts and a name board across them, on every
       street. archA spans the a axis (front and back), archB the b. */
    const archA = (bb) => {
      for(const a of [GAP0, GAP1]) cyl(a, bb, 0, 104, 7, tim);
      slab(GAP0-10, GAP1+10, 104, 132, bb+5, bb-5, tim, null, shade(tim,1.2));
      F(GAP0+2, GAP1-2, 110, 126, shade(wall,1.14), null, 0, bb+5.5);
    };
    const archB = (aa) => {
      for(const b of [-GAP0, -GAP1]) cyl(aa, b, 0, 104, 7, tim);
      poly([P(aa,-GAP0-10,104),P(aa,-GAP1+10,104),P(aa,-GAP1+10,132),P(aa,-GAP0-10,132)], tim);
      poly([P(aa+0.5,-GAP0-2,110),P(aa+0.5,-GAP1+2,110),
            P(aa+0.5,-GAP1+2,126),P(aa+0.5,-GAP0-2,126)], shade(wall,1.14));
    };
    railA(-LOT+18, 18, GAP0);  railA(-LOT+18, GAP1, LOT-18);      // back
    railB(18, -18, -GAP0);     railB(18, -GAP1, -LOT+18);          // left
    archA(-LOT+18);            archB(18);

    /* ---- two span glasshouses along the back ----
       b0 is the near eave, b1 the far one, ridge on the centreline
       running along a. Far slope first, then the gables, then the near
       slope and the near wall, so the house closes over its own back. */
    const glasshouse = (a0, a1, b0, b1, ez, rz) => {
      const bm = (b0+b1)/2;
      poly([P(a0,bm,rz),P(a1,bm,rz),P(a1,b1,ez),P(a0,b1,ez)], 'rgba(180,214,204,.34)', shade(trim,1.05), 2);
      box(a0, a1, b1, b0, 0, 26, shade(trim,.95), shade(wall,.86), shade(wall,.70));   // dwarf wall
      for(const aa of [a0, a1])
        poly([P(aa,b0,26),P(aa,b0,ez),P(aa,bm,rz),P(aa,b1,ez),P(aa,b1,26)], pane, shade(trim,1.2), 2);
      poly([P(a0,b0,26),P(a1,b0,26),P(a1,b0,ez),P(a0,b0,ez)], 'rgba(180,214,204,.44)', shade(trim,1.2), 2);
      poly([P(a0,b0,ez),P(a1,b0,ez),P(a1,bm,rz),P(a0,bm,rz)], 'rgba(180,214,204,.58)', shade(trim,1.2), 2);
      for(let k=1;k<7;k++){                                        // glazing bars
        const x = a0 + (a1-a0)*k/7;
        poly([P(x-3,b0,ez),P(x+3,b0,ez),P(x+3,bm,rz),P(x-3,bm,rz)], shade(trim,1.15));
        poly([P(x-3,b0,26),P(x+3,b0,26),P(x+3,b0,ez),P(x-3,b0,ez)], shade(trim,1.1));
      }
      tube(a0-6, bm, rz+3, a1+6, bm, rz+3, 4, trim);               // ridge
      for(const aa of [a0+10, (a0+a1)/2, a1-10])                   // roof vents
        poly([P(aa-26,bm,rz+2),P(aa+26,bm,rz+2),P(aa+26,bm-46,rz-12),P(aa-26,bm-46,rz-12)],
             'rgba(200,228,220,.62)', shade(trim,1.25), 2);
    };
    glasshouse(60, 450, -600, -990, 88, 148);
    glasshouse(600, 990, -600, -990, 88, 148);

    /* ---- specimen trees, the FAR row, before the hut ----
       A stacking fault on the first pass: every tree was drawn in one
       loop after the hut, so the two at b -430 -- which are behind it,
       and land on screen-a 520 and 680 inside a hut spanning 525..1025
       -- were painted straight over its wall. Far before near, the same
       rule the glasshouse's own slopes and the staging ranks follow;
       the hut is simply another thing in the queue rather than a
       backdrop the props are laid on. */
    const tree = (ta, tb, th) => {
      cyl(ta, tb, 0, 22, 14, '#9a8a68');
      plateCircle(ta, tb, 22, 11, '#5a4a30');
      cyl(ta, tb, 22, th, 4, '#6b5a3a');
      for(let k=0;k<5;k++){
        const q = k*1.26 + 0.3;
        ball(ta + 14*Math.cos(q), tb + 14*Math.sin(q), th-6, 14, ['#3f6b4a','#4e8058','#356045'][k%3]);
      }
      ball(ta, tb, th+6, 15, '#4e8058');
    };
    const hA0 = 385, hA1 = 665, hB0 = -220, hB1 = -440, hH = 150, FB = hB0 + 0.5;
    /* ---- the tree field, front left ----
       Moving the hut onto the gate axis emptied the whole front-left
       quarter, and at Sir's direction it fills with stock rather than
       being left as yard: a four by four grove on a 100 by 110 grid,
       heights cycled so it is not sixteen of the same lollipop. The
       columns stop at a 370 because the hut starts at 385 -- a tree
       standing in the wall is the fault this shop was rebuilt to get
       away from -- and the rows stop short of the cross walk at 490.

       IT SPLITS AROUND THE HUT, which is the whole reason the tree body
       became a helper. Rows at b -290 and -400 are BEHIND the hut's
       near face at -220, so they are painted before it; the rows at
       -70 and -180 are in front and go after. That was the stacking
       fault on the first pass, and adding a dozen more trees to the
       same quarter is exactly the change that would have made it worse
       rather than obvious.

       AND THE GROVE IS NOT A RECTANGLE, because the ground it fills is
       not one. A plain four by four grid put five of its sixteen trees
       behind the hut and correctly invisible: screen-a is a - b, so the
       hut occupies 605..1105 on screen whatever its footprint, and a
       tree is only seen at a row of depth b if a - b < 605 or it stands
       in front of the near face. That is 315 at b -290 and 205 at
       -400, so the back rows are short and the front two run the full
       width -- which is also what a nursery bed looks like, tapering
       away behind the building rather than marching under it. */
    const ROWS = [[-70, 5],[-180, 5],[-290, 3],[-400, 2]];
    const GROVE = [];
    ROWS.forEach(([tb, n], r) => {
      for(let c=0;c<n;c++)
        GROVE.push([70 + c*90, tb, [150,120,138,114,132,126,144,118][(r*5+c)%8]]);
    });
    if(state.props) for(const t of GROVE) if(t[1] < hB0) tree(...t);

    /* ---- the sales hut, on the gate axis ----
       280 x 220, timber, with a plain overhanging roof. Door and
       windows are drawn on the b = -220 face, which is the one turned
       toward the front street, at a b just proud of it. */
    box(hA0, hA1, hB1, hB0, 0, hH, shade(tim,1.1), tim, shade(tim,.78));
    slab(hA0-14, hA1+14, hH, hH+14, hB0+14, hB1-14, shade(trim,.9), null, shade(trim,1.1));
    F(hA0+4, hA1-4, 0, 20, shade(tim,.72), null, 0, FB);           // plinth
    for(let k=0;k<7;k++)                                            // boarding
      F(hA0+4, hA1-4, 24+k*17, 26+k*17, shade(tim,.86), null, 0, FB+0.2);
    F(494, 556, 0, 108, '#2b2118', null, 0, FB+0.4);                // the doorway, on 525
    F(498, 552, 0, 82, trim, null, 0, FB+0.9);                      // leaf
    F(498, 552, 84, 104, 'rgba(122,158,178,.72)', null, 0, FB+0.7); // fanlight
    F(544, 548, 40, 52, '#d8c28a', null, 0, FB+1.2);                // handle
    for(const w0 of [430, 620]){                                    // two windows
      slab(w0-30, w0+30, 44, 112, FB+1, FB-7, shade(trim,.9));
      F(w0-25, w0+25, 50, 106, 'rgba(122,158,178,.72)', null, 0, FB+1.6);
      F(w0-1.5, w0+1.5, 50, 106, shade(trim,.9), null, 0, FB+2);
    }
    poly([P(hA1+0.5,hB0,0),P(hA1+0.5,hB1,0),P(hA1+0.5,hB1,hH),P(hA1+0.5,hB0,hH)], shade(tim,.86));
    for(let k=0;k<7;k++)                                            // boarding, right face
      poly([P(hA1+0.7,hB0-4,24+k*17),P(hA1+0.7,hB1+4,24+k*17),
            P(hA1+0.7,hB1+4,26+k*17),P(hA1+0.7,hB0-4,26+k*17)], shade(tim,.7));
    if(state.roof) cyl(hA1-40, hB1+40, hH+14, hH+64, 7, '#6d747c');  // flue

    if(state.props){
      /* ---- four ranks of staging, front right, out in the open ----
         The bench is a real trestle at z 42 and the pots stand ON it;
         each rank is drawn far to near so the near pots are not painted
         under the rank behind them. */
      for(let r=3;r>=0;r--){
        const bb = -120 - r*108;
        slab(720, 1020, 42, 50, bb+22, bb-22, tim, null, shade(tim,1.18));
        for(const la of [734, 870, 1006]) cyl(la, bb, 0, 42, 6, shade(tim,.8));
        for(let i=0;i<7;i++){
          const sa = 740 + i*45;
          cyl(sa, bb, 50, 68, 11, '#9a8a68');
          plateCircle(sa, bb, 68, 9, '#5a4a30');
          ball(sa, bb, 78, 13, ['#4e8058','#c26a7e','#e8c34a','#3f6b4a','#b4674a'][(i+r)%5]);
        }
      }
      /* the NEAR row of specimens, after the hut for the same reason */
      for(const t of GROVE) if(t[1] >= hB0) tree(...t);
    }

    railB(LOT-18, -18, -GAP0);  railB(LOT-18, -GAP1, -LOT+18);     // right
    /* THE FRONT FENCE WAS OUTSIDE THE LOT. It was written at b 18, and
       b runs 0 at the front boundary to -LOT at the back, so positive
       18 stood it eighteen units out on the pavement -- the same sign
       error, at the same size, that put the old shop's fence on
       screen-a -106. The one place it can still happen on a landmark is
       the front boundary, because that is the only side where the lot
       edge is b 0 rather than a coordinate you have to type. */
    railA(-18, 18, GAP0);       railA(-18, GAP1, LOT-18);            // front
    archB(LOT-18);              archA(-18);
  }
},
{
  name:'TV repair', head:'Aerial forest, dish, a wall of screens behind the glass',
  tags:['aerial forest','dish on a mount','stacked screens','test-card glow','cluttered roof'],
  desc:'Every aerial is a tube with real crossbars and each mast has a base plate on the roof; the dish sits on a bracket with an arm to the feed horn and is round in the world rather than stretched by ZSCALE. The screens are stacked inside a real recess, behind the pane, instead of standing out on the footway.',
  draw(p){
    /* ============ THE WALL OF SCREENS WAS ON THE PAVEMENT ============
       Each cabinet was slab(x0, x1, z0, z0+30, -1, 14) -- bFront -1 and
       bBack +14. Positive b is toward the street, so the "back" of the
       box was fifteen units IN FRONT of its own front face: the solid
       stood outside the shop and its front plate was buried inside it.
       The screen was then painted at -1.5, behind that plate, so the
       one part of a television that has to be seen was the deepest
       thing in the assembly and survived on call order alone.

       Same fault as the Furniture showroom's mezzanine, at cabinet
       scale, and it came from the same place: the window was never a
       window. F(10, W*0.70, 22, 106) is a flat dark rectangle at b 0
       with a stroke round it, so there was no recess to put anything
       in and the only direction left was out. It is a real opening now
       -- reveal, goods, pane -- and the cabinets sit at b -8..-30 with
       their screens facing the street.

       THE INTERIOR IS CLIPPED, for the reason the showroom records: an
       object d into the shop shifts d on screen, right on edges 1 and 3
       and left on 0 and 2, so a cabinet 30 deep needs 30 of clearance
       inside both jambs or it hangs out of the window on one heading.
       Clipping to the opening quad is what lets the recess be 30 deep
       in a 128-wide window.

       A WINDOW WAS DRAWN ACROSS THE DOOR, fourth instance this session.
       F(W*0.78, W-14, 50, 90) ran a 179.4..216 against an opening at
       158.8..225. That is four consecutive shops with the same mistake
       and it is always the same shape: a panel placed by eye near the
       far end of the frontage, landing inside a door shopDoor had
       silently clamped left. Gone.

       THE DISH WAS AN ELLIPSE. faceT(da, db, z, 24) installs a basis
       whose z step carries ZSCALE, so a unit circle drawn in it comes
       out 48 wide by 72 tall -- the Locksmith's key bow again, and the
       chemist cross before that. The z radius divides back by ZSCALE
       and it is a 48 by 54 isometric circle, which is what a dish
       standing on a mount actually projects to.

       THE MASTS ARE FINE, and I checked because the b sign has caught
       three shops this session. They sit at b -30..-120, which is
       INSIDE the block footprint rather than out on the pavement, and
       for negative b the constraint is just a within 0..W -- the roof
       itself legitimately occupies screen-a -276..230 on the mirrored
       edges. The a +/- b test is for things standing in front of the
       wall, and none of these are. */
    const wall = '#7a7f86', trim = '#2b2f33', H = 158;
    const WA0 = 12, WA1 = 140, WZ0 = 22, WZ1 = 108;
    body(wall, trim, H);
    slab(0,W, H, H+10, -1, -12, trim);

    /* ---- the shopfront ---- */
    reveal(WA0, WA1, WZ0, WZ1, 30, '#171a1d');
    ctx.save();
    poly([P(WA0,0,WZ1),P(WA1,0,WZ1),P(WA1,0,WZ0),P(WA0,0,WZ0)]);
    ctx.clip();
    /* SIX SETS, NOT EIGHT, AND THE ARITHMETIC IS THE CLIP'S. A cabinet
       at depth d shifts d on screen -- right here, left on the mirrored
       edges -- so it is only wholly inside the opening if a0 - d >= WA0
       and a1 + d <= WA1. The first cut ran eight cabinets over a 20..132
       at d 30 against a window of 12..140, and the fourth column was
       simply cut off at the jamb by the clip that makes the recess
       safe. At d 22 the usable run is 34..114, which is three columns
       of 26 rather than four of 21 -- and six larger sets read as a
       wall of screens from across the street where eight small ones
       read as a pattern. */
    for(let r=0;r<2;r++) for(let c=0;c<3;c++){
      const x0 = 34 + 80*(c+0.05)/3, x1 = 34 + 80*(c+0.95)/3, z0 = 30+r*40;
      box(x0, x1, -22, -6, z0, z0+34, '#454b52', '#3a4046', '#2e3338');
      F(x0+3, x1-3, z0+5, z0+29, ['#4aa3c4','#c4a34a','#4ac47a','#c44a6a','#4ac47a','#c4a34a'][r*3+c], null,0, -5.5);
      for(let k=0;k<4;k++)                                       // test-card bars
        F(x0+3+(x1-x0-6)*k/4, x0+3+(x1-x0-6)*(k+0.5)/4, z0+5, z0+29,
          'rgba(255,255,255,.22)', null,0, -5.2);
      F(x0+6, x1-6, z0+30, z0+33, shade('#454b52',1.3), null,0, -5.9);   // brand strip
    }
    ctx.restore();
    glaze(WA0, WA1, WZ0, WZ1, null, 'rgba(88,116,132,.46)');
    /* ONE mullion, not three. The frame is at b 0.8 and the cabinets at
       -6..-22, so a bar written on a column boundary does not land on
       one after the depth shift -- three of them came down across the
       middle of three screens. A single centre bar cannot fall anywhere
       worse than it does. */
    F(WA0 + (WA1-WA0)/2 - 2.5, WA0 + (WA1-WA0)/2 + 2.5, WZ0, WZ1, shade(wall,.66), null,0, 0.8);

    shopDoor(184, wall, trim);                                    // a 150.88..217.12

    /* ---- fascia ----
       Was slab(6, W-6, 116, 146, -1, -9): 6 of margin against 9 of
       recess put the far end on screen-a 233 against a return at 230.
       Margin 15 against an 8-deep recess leaves piers of 16 and 7, and
       the lettering comes out from -9.5 -- behind the board's own -9
       backing -- to bFront + 0.5. */
    slab(15, W-15, 116, 146, -1, -8, shade(wall,.72));
    F(26, W-26, 122, 140, '#e8c34a', null,0, -0.5);

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
      const da = W*0.68, db = -20, dz = H+66, dr = 24, zk = 1/ZSCALE;
      box(da-6, da+6, db-6, db+6, H+10, H+16, '#8d979f','#82888e','#767c82');
      cyl(da, db, H+16, H+50, 3, '#8f969d');
      const dish = [];
      for(let i=0;i<28;i++){
        const t = Math.PI*2*i/28;
        dish.push(P(da + dr*Math.cos(t), db, dz + dr*Math.sin(t)*zk));
      }
      poly(dish, '#d8dbde', '#a8adb2', 2.5);
      tube(da, db, dz, da, db+22, dz-8, 1.4, '#8f969d');
      ball(da, db+22, dz-10, 4, '#6a7076');
      box(W*0.86,W*0.98,-150,-120,H,H+18,'#8f969d','#787f86','#697077');
    }
    kerb(p,'none');
  }
},
{
  name:'Playhouse', tall:true, ww: 1048.8, dd: 620,
  wTodo:'a whole block edge -- five packing slots, and the packer places none of them',
  head:'Whole-edge theatre: marquee over four doors, fly tower behind',
  tags:['whole block edge','builds to the pavement','marquee over the footway','solid fly tower','no pavement props'],
  desc:'A theatre taking a whole block edge and building right up to the pavement, which is the other block treatment and not the same thing as a landmark: no yard, no setback, and a marquee that exists to overhang the footway. Four doors under it, poster bays and tall windows either side, and the fly tower standing 240 above the cornice behind the auditorium. Nothing stands on the footway -- the posters are on the building, where a theatre puts them anyway.',
  draw(p){
    /* ====== WHOLE BLOCK, BUT NOT A LANDMARK -- AND THAT IS THE POINT ==
       Sir asked for the whole block. The BLOCK LANDMARKS note at the
       head of this file names the Playhouse, by name, as a building
       that must NOT get block:true, and it is right: a marquee exists
       to overhang the footway, and a setback with a yard round it would
       destroy the one thing this type does at its own front door.

       The note also says there are TWO treatments and they are not the
       same. Block LANDMARK is freestanding, set back, four entrances --
       the Bathhouse, the Chapel, the Nursery. Block WIDTH takes the
       whole edge and builds TO THE LINE, with no yard at all, because
       that is what the type does. A theatre is the block-width case
       exactly, so this is ww 1048.8 without block:true, and the port
       needs the same thing the wide shops need -- room from the packer
       -- rather than the landmark's whole separate placement path.

       dd 620 because the depth is the building. An auditorium and a fly
       tower are not 276 deep, and the fly tower has to stand BEHIND
       something for its mass to mean anything.

       zTodo 1.05 is gone. H 176 was one and a bit storeys drawing a
       theatre; at 420 the front is 2.5 and the fly tower reaches 660,
       which is 3.93 -- second only to the chapel spire, which is what a
       playhouse should be on a street of shops.

       THE POSTER COLUMNS ARE GONE, at Sir's direction, and cTodo with
       them. They were the shop's whole prop debt and both were off the
       frontage: one at a 4.6, b 54 -- screen-a -49.4, fifty units onto
       the neighbour -- and the other written at a W+22, outside on
       purpose. Widening to a block edge would have made them placeable
       (a column of r 16 on a plate of r 18 sweeps a +/- b +/- 36, so it
       wants a between 86 and 962 here) but placeable is not the same as
       wanted: two free-standing solids on the footway in front of a
       marquee that already overhangs it are two things for a robot to
       hit on the approach to four doors. The posters live in the
       flanking bays, which is where a theatre puts them anyway. This
       building now stands entirely on its own plot. */
    const wall = '#6b3348', trim = '#e8c9a0', H = 420, WW = 1048.8, DD = 620;
    /* ---- THE OTHER THREE ELEVATIONS ----
       A 230 shop shows one face and a return, and everything else in
       this library is composed for that. A building occupying a whole
       block edge is 620 deep, stands in an alley on each side, and gets
       driven past on three streets, so a blank flank is 620 x 420 of
       nothing seen at close range -- roughly nine shopfronts' worth of
       wall per side.

       BOTH FLANKS COME OFF ONE BODY. flank(ra, sgn) draws on a plane of
       constant a with sgn giving the outward direction, so the a = 0
       and a = WW elevations cannot drift apart -- the same argument as
       the chemist's two liveries and the showroom's two bays. What a
       theatre puts on its side wall is what is here: a plinth, buttress
       piers on a 100 bay, blind arched openings high up where the
       auditorium wall is solid below, the stage door, and the scene
       dock at the back where the get-in happens.

       ORDER. The a = 0 flank and the b = -DD back both face away, and
       their screen spans lie INSIDE the front elevation's, so they are
       drawn BEFORE body() and the box then hides them. Drawn after,
       they paint across the facade -- which is exactly what the far
       stage door did on the first pass of this shop. */
    const flank = (ra, sgn) => {
      const q = (b0,b1,z0,z1,col,o) => poly([P(ra+o*sgn,b0,z0),P(ra+o*sgn,b1,z0),
                                             P(ra+o*sgn,b1,z1),P(ra+o*sgn,b0,z1)], col);
      /* THE BAYS ARE SET OUT SO NOTHING CUTS A PIER. First pass ran six
         piers on a flat 100 pitch and then dropped a 110-wide scene
         dock on top of two of them -- a loading door sliced through a
         buttress, which is the elevation equivalent of a fascia running
         past a return. Four piers over the auditorium at 100, then one
         wide stage-house bay to the back pier, and every opening sits
         inside a bay. It also says the right thing about the plan:
         auditorium in front, stage house behind. */
      q(0,-DD, 0, 28, shade(wall,.68), 0.6);                         // plinth
      for(const bb of [-40,-140,-240,-340,-574]){                    // buttress piers
        q(bb, bb-26, 28, 394, shade(wall,1.08), 1.2);
        q(bb+5, bb-31, 394, 414, shade(trim,.86), 2.0);
      }
      for(const b0 of [-72,-172,-272]){                              // auditorium bays
        const b1 = b0 - 62;
        q(b0, b1, 206, 366, shade(wall,.86), 0.9);
        q(b0-8, b1+8, 220, 352, '#39485a', 1.4);
        q(b0-8, b1+8, 220, 228, shade(trim,.7), 1.7);
      }
      q(-78,-128, 0, 112, '#2b2118', 1.0);                           // stage door, in bay 1
      q(-83,-123, 0, 106, shade(trim,.55), 1.4);
      q(-88,-118, 116, 124, trim, 1.9);
      q(-400,-540, 0, 210, '#2b2118', 1.0);                          // scene dock
      for(const [d0,d1] of [[-406,-468],[-472,-534]])
        q(d0, d1, 6, 204, shade(trim,.5), 1.4);
      q(-390,-550, 210, 228, shade(trim,.8), 2.0);                   // dock lintel
      q(-400,-540, 258, 380, shade(wall,.86), 0.9);                  // stage-house louvre
      for(let k=0;k<7;k++)
        q(-406, -534, 264+k*16, 272+k*16, shade(wall,.6), 1.4);
      q(4, -DD-4, 420, 436, trim, 2.4);                              // cornice return
    };
    /* the back: the scene dock proper, where the lorries come in */
    const backElev = () => {
      const bb = -DD;
      const q = (a0,a1,z0,z1,col,o) => F(a0,a1,z0,z1,col,null,0, bb-o);
      q(0, WW, 0, 28, shade(wall,.68), 0.6);
      for(const pa of [30, 230, 430, 630, 830, 1018]){
        q(pa-15, pa+15, 28, 394, shade(wall,1.08), 1.2);
        q(pa-20, pa+20, 394, 414, shade(trim,.86), 2.0);
      }
      /* the dock doors sit INSIDE bays 245..415 and 445..615, for the
         reason the flank records -- they cut two piers on the first
         pass -- and each carries its own lintel rather than one band
         running through the pier between them */
      for(const [g0,g1] of [[270,390],[470,590]]){
        q(g0, g1, 0, 230, '#2b2118', 1.0);
        q(g0+6, (g0+g1)/2-3, 6, 224, shade(trim,.5), 1.4);
        q((g0+g1)/2+3, g1-6, 6, 224, shade(trim,.5), 1.4);
        q(g0-10, g1+10, 230, 248, shade(trim,.8), 2.0);
      }
      for(const wa of [130, 730, 930]){                              // high workshop lights
        q(wa-52, wa+52, 250, 350, shade(wall,.86), 0.9);
        q(wa-44, wa+44, 260, 340, '#39485a', 1.4);
        q(wa-2, wa+2, 260, 340, shade(wall,1.08), 1.7);
      }
      q(0, WW, 420, 436, trim, 2.4);                                 // cornice
    };
    const CA0 = 300, CA1 = 748;                       // the entrance bay
    /* THE FAR STAGE DOOR GOES FIRST, and it has to. The a = 0 return
       faces away from this camera and its screen span, 0..620, lies
       INSIDE the front elevation's 0..1048.8 -- so drawn after body()
       it paints straight across the facade, which is what it did on the
       first pass. Far before near, then the box hides it: the
       Bathhouse's note about its back and left entrances, at door
       scale. The a = WW one is on a face we can see and goes at the
       end with everything else. */
    backElev();
    flank(-0.5, -1);
    body(wall, trim, H, WW, DD);
    /* The plate body() lays down is shade(trim,1.05), which is right on
       a 230 shop and is 1048 by 620 of near-white here -- the largest
       thing on screen by a factor of three, and the building underneath
       it stopped reading. Overdrawn in a roofing colour at H + 0.4. */
    T(0, WW, -DD, 0, H+0.4, '#4a3a3f');

    /* ---- the fly tower, behind the auditorium, built as a solid ---- */
    F(CA0+20, CA1-20, H, H+240, shade(wall,.82), shade(wall,.62), 2, -300);
    S(CA1-20, -560, -300, H, H+240, shade(wall,.66));
    T(CA0+20, CA1-20, -560, -300, H+240, shade(wall,.9));
    slab(CA0+10, CA1-10, H+240, H+254, -298, -562, shade(wall,.72));
    F(440, 610, H+150, H+206, shade(wall,.66), null, 0, -301);      // louvre

    slab(0, WW, H, H+16, -1, -16, trim);                            // cornice
    slab(0, WW, 0, 28, -1, -10, shade(wall,.68));                   // plinth

    /* ---- the order: four pilasters, capped ---- */
    for(const pa of [26, 296, 752, 1022]){
      slab(pa-18, pa+18, 28, 394, 2, -10, shade(wall,1.12));
      slab(pa-24, pa+24, 394, 412, 4, -12, trim);
    }

    /* ---- the flanking bays: posters below, tall windows above ----
       Both bays are the same composition mirrored about the centre, so
       they run off one offset rather than being written twice. */
    for(const off of [0, 706]){
      for(const q of [64, 166]){                                    // poster frames
        slab(q+off, q+off+92, 70, 232, 1, -9, shade(wall,1.18), null, trim);
        F(q+off+8, q+off+84, 80, 222, ['#c2452e','#2a5c6c'][q===64?0:1], null, 0, 1.6);
        F(q+off+16, q+off+76, 176, 210, shade(trim,1.1), null, 0, 2);
      }
      for(const q of [59, 132, 205]){                               // tall windows
        slab(q+off-6, q+off+64, 244, 386, 1, -11, shade(wall,1.1), null, trim);
        reveal(q+off, q+off+58, 252, 378, 14, shade(wall,.5));
        glaze(q+off, q+off+58, 252, 378, null, 'rgba(96,120,140,.86)');
        F(q+off+27, q+off+31, 252, 378, shade(wall,1.1), null, 0, 1.4);
      }
    }

    /* ---- the entrance: four doors, and the marquee over them ---- */
    for(const md of [398.4, 482.4, 566.4, 650.4])
      shopDoor(md, wall, trim, 'rgba(232,201,160,.5)', WW);
    /* THE MARQUEE OVERHANGS, and that is checked rather than assumed.
       It reaches b 58, so it swings 58 each way between mirrored edges:
       CA0 - 58 = 242 and CA1 + 58 = 806, both well inside 0..1048.8.
       Soffit at z 160 is 240 game units and Tipsy's flag reaches 97, so
       a robot passes under it with 143 to spare. */
    const MB = 76, MA0 = CA0-14, MA1 = CA1+14;
    /* THE SOFFIT WAS PAINTED OVER THE FASCIA. Written top, fascia,
       soffit, the underside plane -- which runs b 0..MB and shares its
       lower edge with the fascia's -- came last and covered the whole
       band, so the marquee's name face read as wall colour with a row
       of bulbs floating on it. The fascia is the NEAREST plane in the
       assembly at b MB, so it goes last: top, soffit, ends, fascia,
       bulbs. Third order-versus-depth fault this session, after the
       nursery's staging bench and the playhouse's own far stage door. */
    poly([P(MA0,0,212),P(MA1,0,212),P(MA1,MB,192),P(MA0,MB,192)], trim);
    poly([P(MA0,0,180),P(MA1,0,180),P(MA1,MB,152),P(MA0,MB,152)], shade(wall,.72));
    for(const ea of [MA0, MA1])
      poly([P(ea,0,212),P(ea,MB,192),P(ea,MB,152),P(ea,0,180)], shade(trim,.66));
    poly([P(MA0,MB,192),P(MA1,MB,192),P(MA1,MB,152),P(MA0,MB,152)], shade(trim,.94));
    poly([P(MA0+14,MB+0.4,186),P(MA1-14,MB+0.4,186),
          P(MA1-14,MB+0.4,158),P(MA0+14,MB+0.4,158)], '#7c2038');   // the name strip
    for(let i=0;i<18;i++){                                          // bulbs, above and below it
      const ba = MA0+8+(MA1-MA0-16)*(i+0.5)/18;
      ball(ba, MB+1.2, 189, 4.5, '#fff0c0');
      ball(ba, MB+1.2, 155, 4.5, '#fff0c0');
    }
    for(let i=0;i<14;i++) ball(MA0+16+(MA1-MA0-32)*(i+0.5)/14, MB-10, 158, 5, '#ffe8a8');

    /* ---- the name board, over the marquee ---- */
    slab(318, 730, 250, 344, -1, -10, shade(wall,1.2), null, trim);
    F(340, 708, 268, 326, trim, null, 0, -0.5);

    flank(WW+0.5, 1);                                 // the near return, after the box

    if(state.roof){
      /* ---- roof plant ----
         SPREAD OVER 620, AND KEPT OFF THE FLY TOWER. First pass put the
         water tank at a 370..670, b -480..-600 -- straight inside the
         fly tower, which stands a 320..728 by b -300..-560 -- so a
         2000-gallon tank was sitting in the middle of the stage house
         and only survived because the roof kit is painted last. The
         tower is the one solid up here that other things have to be
         placed AROUND rather than on, so everything now sits in the
         clear ground either side of it: a below 320 or above 728.

         And they are drawn far to near on the a + b key rather than in
         the order they were typed, which is what the two cowls beside
         the tank needed once they were all in the same quarter. */
      const cowl = (va, vb) => {
        cyl(va, vb, H, H+30, 13, '#8f969d');
        plateCircle(va, vb, H+30, 17, '#a6acb2', '#7d838a', 1.6);
        cyl(va, vb, H+30, H+40, 5, '#7d838a');
      };
      /* THE LEFT COWLS HAVE TO STAY LEFT OF THE TOWER ON SCREEN, which
         is not the same as staying left of it on the ground. One sat at
         a 230, b -500: screen-a is a - b, so 730, which lands inside
         the tower's own 620..1288 -- and its depth key a + b of -270 is
         BEHIND the tower's 20..428, so it should have been hidden and
         was painted over the tower's face instead. Moving it left in a
         does not help at that depth; b is what puts it there. Both left
         cowls come forward instead: at b -400 and -220 they clear the
         tower's near screen edge at 620 with 66 and 190 to spare, on
         the far side of the arithmetic rather than by eye.

         The right pair is inside the tower's screen span too and is
         correct: keys 600 and 640 are in FRONT of the tower, so they
         belong on top of it. Same test, opposite answer -- which is why
         it is a test and not a rule about which side of the roof things
         go on.

         AND THE SAME TEST APPLIES BETWEEN TWO PIECES OF PLANT, which is
         what the second attempt missed: a cowl at a 210, b -220 has
         screen-a 430 and key -10, against a plant box occupying 240..440
         with keys running to 130, so the near end of the box was in
         front of it and the cowl went over the box instead. The three
         left-hand items are laid out on the a + |b| < 586 line that
         keeps them clear of the tower, and then spaced so their screen
         spans do not touch each other either: 266..334, 486..554, and
         the box at 250..450. Nothing up here is placed by eye. */
      cowl(120, -400);                                    // key -280, screen-a 486..554
      cowl(60,  -240);                                    // key -180, screen-a 266..334
      box(150, 280, -170, -100, H, H+26, '#8f969d','#787f86','#697077');   // screen-a 250..450
      for(const tb of [-430, -530]) for(const ta of [830, 970])            // tank frame
        cyl(ta, tb, H, H+34, 4, '#6a7076');
      box(800, 1000, -560, -400, H+34, H+96, '#9aa0a6','#828a91','#727981');
      slab(792, 1008, H+96, H+106, -394, -566, '#7d848a');
      cowl(830, -230);                                    // key 600
      cowl(940, -300);                                    // key 640
      box(700, 830, -120, -50, H, H+26, '#8f969d','#787f86','#697077');    // key 650
    }
  }
},
{
  name:'Fire station', tall:true, ww: T2*6.6, dd: 420,
  wTodo:'three packing slots -- the middle tier, between a double-wide and a whole edge',
  head:'Three appliance bays, drill tower, apron, bell',
  tags:['three packing slots','three appliance bays','drill tower','painted apron','builds to the line'],
  desc:'Sized between the two things the library already had: bigger than a double-wide shop, smaller than a block. Three appliance bays with the doors opening straight onto the apron, a crew entrance, and a drill tower carrying the station bell 636 above the pavement.',
  draw(p){
    /* ============ THE MIDDLE TIER, WHICH DID NOT EXIST ============
       Sir is right that this needs more than a shop and less than a
       block, and the packer's own arithmetic already has the number.
       packEdgeNoGap works on avgW = T2*2.2 = 202.4, the wide shops take
       T2*4.4 = two of them, and a whole edge is 1048.8 = five. There was
       nothing at three. This is it: ww = T2*6.6 = 607.2, and wTodo says
       three slots rather than two, so the port has one more case rather
       than one more special case.

       AND IT IS NOT A LANDMARK, for the Playhouse's reason. bTodo had
       this flagged as a block candidate -- "the apron is working
       forecourt, not decoration" -- and a forecourt sounds like a yard.
       It is not one. A fire station builds TO THE LINE: the appliance
       doors open directly onto the footway because an engine has to be
       on the road in seconds, and an apron is the paved strip it
       crosses, not a setback with a building standing back in it. Ask
       what the building does at its own front door -- the note's own
       test -- and the answer is that it throws three doors open onto
       the street. So width, not setback, and bTodo comes off.

       dd 420 because an appliance room has to hold an appliance. The
       game's car is len 150 and a pump is longer than a car; at the
       shop depth of 276 the bays would be a facade with nothing behind
       them.

       zTodo 1.06 comes off with it. H 178 was one storey drawing a
       two-storey station with a drill tower; at 336 it is 2.00 and the
       tower reaches 636, which is 3.79.

       THE DRILL TOWER WAS BUILT ON THE NEIGHBOUR. t0 = W-8, t1 = W+62
       put it at a 222..292 on a 230 frontage -- sixty-two units past
       the return, a whole tower standing on the next shop's plot. It
       is at a 490..607.2 now, which is inside the frontage on every
       heading because for a > 0 the only test is a within 0..WW.

       AND THE BELL WAS INSIDE THE WALL. Its bracket ran b -2 to -20 --
       negative b is INTO the block -- so the bell hung twenty units
       inside the masonry, the Locksmith key's fault exactly. It hangs
       out at b 22 now, off the tower where a station bell goes, and at
       a 542 the 4r sweep of its r-18 mouth comes to 600 on the mirrored
       heading against a frontage of 607.2. */
    const wall = '#a8291f', trim = '#e8ddc8', H = 336, WW = T2*6.6, DD = 420;
    const TA0 = 490;                                    // the drill tower bay
    const BAYS = [[24,164],[182,322],[340,480]];
    body(wall, trim, H, WW, DD);
    /* body() lays its plate down as shade(trim,1.05), which is right on
       a 230 shop and is 607 by 420 of near-white here -- the largest
       thing on screen and brighter than the building under it. Same
       overdraw the Playhouse needed at 1048 by 620. */
    T(0, WW, -DD, 0, H+0.4, '#5a4038');

    /* ---- the apron ----
       Flat paint at z 0.6, not a solid: a forecourt is a surface a
       robot drives over, so giving it thickness would be giving it a
       kerb. It runs a 60..500 at b 0..44 because screen-a is a -/+ b,
       so a 44-deep strip needs 44 of inset at the near end or it paints
       onto the neighbour's pavement on one of the two headings. */
    T(60, 500, 0, 44, 0.6, '#8f8578');
    for(const [x0,x1] of BAYS){
      T(x0+4, x1-4, 2, 6, 0.8, shade(trim,.9));
      for(let k=0;k<5;k++)
        T(x0+8+(x1-x0-16)*k/5, x0+8+(x1-x0-16)*(k+0.55)/5, 12, 40, 0.8, shade(trim,.82));
    }

    slab(0, WW, H, H+14, -1, -16, trim);                // cornice
    slab(0, WW, 0, 26, -1, -10, shade(wall,.70));       // plinth

    /* ---- three appliance bays ---- */
    for(let i=0;i<3;i++){
      const [x0,x1] = BAYS[i];
      slab(x0-10, x1+10, 20, 224, 2, -10, shade(wall,1.14));
      F(x0, x1, 26, 210, '#2b2118', null, 0, -1);
      for(let j=0;j<6;j++)
        F(x0+4, x1-4, 32+j*30, 54+j*30, '#c9b48e', shade(wall,.85), 1.5, -2);
      slab(x0-10, x1+10, 210, 226, 1, -9, trim);        // lintel
      F((x0+x1)/2-13, (x0+x1)/2+13, 232, 258, trim, null, 0, 1.4);   // bay number plate
    }

    /* ---- the crew entrance, in the tower bay ---- */
    shopDoor(548, wall, trim, null, WW);                // a 514.9..581.1

    /* ---- dormitory windows over the bays ---- */
    for(const c of [94, 252, 410, 548]) for(const d of (c===548 ? [0] : [-36, 36])){
      const w0 = c + d - 24;
      slab(w0-6, w0+54, 262, 330, 1, -11, shade(wall,1.1), null, trim);
      reveal(w0, w0+48, 270, 322, 12, shade(wall,.5));
      glaze(w0, w0+48, 270, 322, null, 'rgba(96,120,140,.86)');
      F(w0+22, w0+26, 270, 322, shade(wall,1.1), null, 0, 1.4);
    }

    /* ---- the drill tower ----
       WHICH END OF IT EXISTS is asked rather than asserted, the same
       derivation slab() and box() use: a = WW is the seen return on
       edges 1 and 3 and a = TA0 on the other two, so a tower that
       always drew S(WW) would show no side at all on half the block. */
    const TH = H + 340;
    F(TA0, WW, H+14, TH, shade(wall,1.06), shade(wall,.7), 2, -1);
    {
      const o = P(TA0,-1,0), pa = P(TA0+1,-1,0);
      S((pa.y - o.y) > 0 ? WW : TA0, -90, -1, H+14, TH, shade(wall,.76));
    }
    T(TA0, WW, -90, -1, TH, shade(wall,.88));
    /* THREE DRILL STAGES, NOT FOUR, AND THE TOWER GREW TO PAY FOR IT.
       Four stages ran to H+294 and left nowhere for the bell: the first
       opening started at H+46 and the band below it was 32 tall against
       a bell 62 deep, so the bell was hung across an opening and read
       as a blob on a grille. Three stages end at H+240 and the tower
       runs to H+340, which gives a clear 44 of face for the bell to
       hang on and takes the drill tower to 676 -- 4.02 storeys. */
    for(let r=0;r<3;r++)                                 // hose-drill openings
      slab(TA0+18, WW-18, H+46+r*68, H+104+r*68, -1, -9, '#3a4046', null, trim);
    slab(TA0-6, WW, TH, TH+16, 3, -94, trim);            // capped, so it closes off the sky

    /* ---- fascia ----
       Was slab(6, W-6, 136, H-10, -1, -9): 6 of margin against 9 of
       recess put the far end on screen-a 233 against a return at 230.
       Margin 22 against an 8-deep recess leaves piers of 23 and 14, and
       the lettering comes out from -9.5 -- behind the board's own
       backing -- to bFront + 0.5. */
    slab(22, TA0-14, 340, 372, -1, -8, shade(wall,1.2), null, trim);
    F(38, TA0-30, 348, 366, trim, null, 0, -0.5);

    if(state.props){
      /* the bell: headstock, dome crown, cylindrical waist, clapper --
         hung on the tower at b 22, out over the footway, above the
         cornice where nothing else competes with it */
      const ba = 542, bb = 22, bz = H + 284;         // clear of the top drill stage
      tube(ba, 2, bz+26, ba, bb, bz+26, 2.2, '#4a4f55');
      slab(ba-16, ba+16, bz+18, bz+26, bb+5, bb-5, '#4a4f55');
      cyl(ba, bb, bz-28, bz+2, 16, '#c9a24a');
      ball(ba, bb, bz+2, 16, '#c9a24a', '#d8b45e');
      plateCircle(ba, bb, bz-28, 18, '#a8842e', '#8f6f26', 2);
      ball(ba, bb, bz-36, 5, '#8f6f26');
    }
    if(state.roof){
      /* kept off the tower, which occupies screen-a 490..697: everything
         here sits below 480 on the a - b line, and the three are ordered
         on the a + b key rather than as typed */
      cyl(60, -260, H, H+34, 8, '#8f969d');              // key -200
      cyl(140, -300, H, H+34, 8, '#8f969d');             // key -160
      box(90, 220, -190, -130, H, H+24, '#8f969d','#787f86','#697077');   // key -100..90
    }
  }
},
{
  name:'Optician', head:'Giant spectacles across the fascia, frames behind real glass',
  tags:['oversized spectacles','eye chart','clean white','frame display','deep reveal'],
  desc:'The spectacles are two solid rims in the plane of the wall, round in the world rather than stretched by ZSCALE, standing proud of the fascia on a bridge with the temples folding back to the wall. The frames and the eye chart are inside a real recess behind the pane.',
  draw(p){
    /* ============ EVERY CIRCLE ON THIS SHOP WAS AN ELLIPSE ============
       faceCircle(a, b, z, r) draws radius r in a AND in z, and z is
       multiplied by ZSCALE before it is projected, so a lens written as
       r 30 came out 60 wide by 90 tall. On a shop whose whole identity
       is a pair of round lenses that is not a detail: the spectacles
       read as two eggs. The frame display had it too, sixteen rings at
       r 6 drawing 12 by 18.

       Fourth instance of this after the chemist cross, the Locksmith
       key bow and the TV dish, and the fix is the same every time --
       the z radius divides back by ZSCALE. It is worth a census across
       the rest of the library rather than one shop at a time: any
       face-plane circle whose radius is not divided back is wrong, and
       it is a one-line test.

       AND THE SPECTACLES WERE INSIDE THE WALL. gb = -10, and negative b
       is INTO the block, so the sign hung ten units inside its own
       masonry -- behind the fascia band's -7 backing as well. Same as
       the Locksmith key at -22 and the fire station bell at -20. They
       stand proud at b 6 now, which is what a sign applied to a wall
       does, and the temples fold back to b 0 at the outer ends.

       THE RIM IS A SOLID, NOT A STROKE. Two concentric corrected
       circles, outer in trim and inner in glass, give a rim 5 units
       thick in the WORLD -- so it stays 5 units at any K. The old lw 7
       was seven screen pixels, which is a different rim on every zoom
       and on every block edge.

       A WINDOW WAS DRAWN ACROSS THE DOOR, fifth consecutive shop.
       F(W*0.76, W-14, 54, 94) ran a 174.8..216 against an opening at
       158.8..225. Gone.

       AND THE TAG SAID "deep reveal" WHERE THERE WAS NONE. The window
       was F(12, W*0.66, 24, 108) -- a flat blue rectangle at b 0 with a
       stroke round it -- and the frames and the eye chart were painted
       at b -3 and -2, inside the wall behind a pane that did not exist.
       It is a real opening now, 26 deep, with the goods clipped to it. */
    const wall = '#f2f2ee', trim = '#2b4a6b', H = 166;
    const inner = '#5d6a76', lens = 'rgba(150,186,206,.62)';
    const WA0 = 12, WA1 = 140, WZ0 = 24, WZ1 = 100;
    /* a circle in the frontage plane that is actually round: the z
       radius divides back by ZSCALE, exactly as plusOutline does */
    const ring = (a, b, z, r, n) => {
      const q = [];
      for(let i=0;i<(n||26);i++){
        const t = Math.PI*2*i/(n||26);
        q.push(P(a + r*Math.cos(t), b, z + r*Math.sin(t)/ZSCALE));
      }
      return q;
    };
    body(wall, trim, H);
    slab(0,W, H, H+8, -1, -12, trim);

    /* ---- the window: recess, goods, pane ---- */
    reveal(WA0, WA1, WZ0, WZ1, 26, inner);
    ctx.save();
    poly([P(WA0,0,WZ1),P(WA1,0,WZ1),P(WA1,0,WZ0),P(WA0,0,WZ0)]);
    ctx.clip();
    /* THREE SHELVES, AND THE FRAMES STAND ON THEM. The first cut hung
       six pairs at z 44, 68 and 92 over a single shelf at 34, so they
       floated in three ranks with nothing under them -- a scatter of
       rings rather than a display. A ring of r 8 reaches 8/ZSCALE = 5.33
       in z, so a shelf top at cz - 6 puts the frames on the timber with
       a hair of clearance. */
    for(let r=0;r<3;r++){
      const sz = 38 + r*24;
      slab(18, 94, sz-4, sz, -6, -22, shade(wall,.78), null, shade(wall,.96));
      for(const cx of [40, 78]){
        const cz = sz + 6;
        const col = ['#2b4a6b','#a8362b','#c9a24a','#3f6b4a','#6b3348','#2a6b6b'][(r*2+(cx>60?1:0))%6];
        for(const d of [-10, 10]){
          poly(ring(cx+d, -8, cz, 8), col);
          poly(ring(cx+d, -7.6, cz, 5.5), 'rgba(222,236,244,.62)');
        }
        poly([P(cx-4,-8,cz),P(cx+4,-8,cz),P(cx+4,-8,cz-1.6),P(cx-4,-8,cz-1.6)], col);
        for(const d of [-18, 18])                                   // temples, folded back
          poly([P(cx+d,-8,cz),P(cx+d*1.05,-16,cz-1),
                P(cx+d*1.05,-16,cz-2.6),P(cx+d,-8,cz-1.6)], shade(col,.8));
      }
    }
    slab(98, 130, 36, 96, -6, -14, '#ffffff', null, shade(wall,.86));        // eye chart
    for(let i=0;i<6;i++)
      F(101, 101 + 26*(1 - i*0.15), 86 - i*9, 90 - i*9, '#3a3f4a', null,0, -5.4);
    ctx.restore();
    glaze(WA0, WA1, WZ0, WZ1, null, 'rgba(146,178,196,.36)');
    F(WA0 + (WA1-WA0)/2 - 2.5, WA0 + (WA1-WA0)/2 + 2.5, WZ0, WZ1, shade(wall,.72), null,0, 0.8);

    shopDoor(184, wall, trim);                          // a 150.88..217.12

    /* ---- fascia ----
       Was slab(0, W, 118, 126, -1, -7): a0 of 0 and a1 of W, so the
       board had no margin at either end and its back face came out on
       screen-a 237 against a return at 230. Margin 14 against a 7-deep
       recess leaves piers of 15 and 7. */
    slab(14, W-14, 110, 132, -1, -7, trim);
    F(26, W-26, 115, 127, shade(wall,.94), null,0, -0.5);

    /* ---- the spectacles, standing on the wall above the board ----
       Lens radius 26 with the z radius corrected is 52 wide and 34.7
       tall, which sits between the board at 132 and the wall top at 166
       with 2 to spare either side. At b 6 the sign swings 6 each way
       between mirrored edges, so the outer temple reaches 32 here and
       198 there against a frontage of 230. */
    const gz = 146, gb = 6;
    for(const ga of [74, 156]){
      poly(ring(ga, gb, gz, 26), trim);
      poly(ring(ga, gb+0.4, gz, 21), lens);
      poly([P(ga-9,gb+0.8,gz+13),P(ga+2,gb+0.8,gz+15),
            P(ga+6,gb+0.8,gz+7),P(ga-5,gb+0.8,gz+5)], 'rgba(255,255,255,.34)');
    }
    tube(74+26, gb, gz, 156-26, gb, gz, 3.2, trim);                 // bridge
    tube(74-26, gb, gz, 74-42, 0, gz+5, 2.8, trim);                 // temples, folding back
    tube(156+26, gb, gz, 156+42, 0, gz+5, 2.8, trim);

    if(state.roof) box(W*0.30,W*0.54,-140,-100,H,H+20,'#9aa0a6','#7d838a','#6a7076');
    kerb(p,'none');
  }
},
{
  name:'Public house', tall:true,
  head:'Three storeys: pub on the ground, flats over, bowed bays',
  tags:['three real storeys','flats above the pub','true bowed bays','chimney pots','hanging bracket sign'],
  desc:'A proper corner local: the public bar on the ground with two bowed bays either side of the door, and two floors of flats over it with sash windows on a string course. The bows are swept on a real ellipse and bulge OUT over the footway, which is the direction a bow window goes.',
  draw(p){
    /* ============ THREE STOREYS, AND EVERYTHING BULGED INWARDS =======
       zTodo 1.08 on a wall of 182: one storey, drawing a pub with two
       floors of chimneys over it. At Sir's direction it is three real
       floors -- H 504, which is 3.00 exactly -- with the bar on the
       ground and flats above, and the levels are set out rather than
       implied: ground 0..168, first 168..336, second 336..504, with a
       string course on each floor line so the divisions are visible
       from the street rather than being a fact about the source.

       THE BOW WINDOWS BULGED INTO THE BUILDING. The sweep read

           b = -rr*sin(a)*0.62 + rr*0.30

       which on the pub's own numbers is -9.8 at the ends and -15.6 at
       the middle -- every value negative, and negative b is INTO the
       block. So both bays were bowed backwards into the bar, deepest at
       the centre, and the only reason they looked convex was that the
       shading ran brightest in the middle. A bow window bulges OUT.

       That is the sixth thing this session found sitting at the wrong
       sign of b, after the Locksmith key, the showroom's whole
       interior, the TV cabinets, the fire station bell and the
       Optician's spectacles. The sweep is written as an ellipse now --
       b = BD*sqrt(1 - u^2), zero at the ends and BD at the centre --
       which cannot come out negative whatever the numbers.

       AND SO DID THE BRACKET SIGN, at b -28, twenty-eight units inside
       the wall, on an a of W*0.03 = 6.9. Even with the sign flipped
       outwards that a puts it on screen-a -21. It hangs at a 46, b 26
       now: 4 clear of the near return here and 88 clear of the far one
       on the mirrored heading.

       A WINDOW WAS DRAWN ACROSS THE DOOR, sixth consecutive shop.
       F(W*0.46, W*0.54, 56, 92) ran a 105.8..124.2 against an opening
       at 81.9..148.1 -- this one was dead centre of the doorway. */
    const wall = '#3f4a35', trim = '#d8c48a', H = 504;
    const brick = '#4a3326';
    const BD = 14, BOWS = [[16,74],[156,214]];        // bays, and how far they bulge
    body(wall, trim, H);
    slab(0,W, H, H+12, -1, -14, shade(wall,.66));     // eaves
    slab(0,W, 0, 30, -1, -6, brick);                  // tiled base

    /* ---- the two bowed bays ----
       Swept on an ellipse: u runs -1..1 across the bay and b is
       BD*sqrt(1-u^2), so the ends meet the wall at b 0 and the centre
       stands BD proud. At BD 14 a bay starting at a 16 comes to
       screen-a 2 here and 228 on the mirror -- inside the frontage on
       both headings, which is what set the bays' width. */
    for(const [x0,x1] of BOWS){
      const cxm = (x0+x1)/2, hw = (x1-x0)/2;
      const pt = (t,z) => {
        const u = -1 + 2*t;
        return P(cxm + hw*u, BD*Math.sqrt(Math.max(0,1-u*u)), z);
      };
      /* ONE PASS OF QUADS, SHADED BY WHERE THEY FACE. The first cut
         drew the glass and then a second amber layer over the same
         sweep, so the two cancelled to a flat gold slab and the bow
         read as a painted panel. A curved surface only reads as curved
         through its shading, so the factor is a real gradient across
         the sweep -- 0.80 at the left edge where the surface turns
         away, 1.10 at the right where it turns toward the light, with a
         centre lift for the part facing straight out. */
      for(let k=0;k<10;k++){
        const t0=k/10, t1=(k+1)/10, u = -1+(t0+t1);
        const f = 0.80 + 0.30*(u+1)/2 + 0.16*(1-Math.abs(u));
        poly([pt(t0,22),pt(t1,22),pt(t1,30),pt(t0,30)], shade(brick, f));            // cill
        poly([pt(t0,30),pt(t1,30),pt(t1,126),pt(t0,126)], shade('#d8a856', f));      // the lit bar
        poly([pt(t0,126),pt(t1,126),pt(t1,138),pt(t0,138)], shade(wall, f+0.22));    // head
      }
      for(let k=1;k<10;k++)                           // glazing bars, on the same sweep
        poly([pt(k/10-0.014,30),pt(k/10+0.014,30),pt(k/10+0.014,126),pt(k/10-0.014,126)],
             shade(wall,.72));
      for(const zz of [58, 92])                       // transoms
        for(let k=0;k<10;k++){
          const t0=k/10, t1=(k+1)/10;
          poly([pt(t0,zz),pt(t1,zz),pt(t1,zz+3),pt(t0,zz+3)], shade(wall,.72));
        }
    }

    shopDoor(115, wall, '#5a3f2a');                   // a 81.88..148.12

    /* ---- fascia ----
       Was slab(6, W-6, 122, 152, -1, -9): 6 of margin against 9 of
       recess put the far end on screen-a 233 against a return at 230,
       and the lettering sat at -9.5, behind the board's own backing.
       Margin 15 against an 8-deep recess leaves piers of 16 and 7. */
    slab(15, W-15, 140, 174, -1, -8, shade(wall,1.25), null, trim);
    F(28, W-28, 148, 166, trim, null,0, -0.5);

    /* ---- the floor lines, and two floors of flats ---- */
    for(const fz of [176, 344]) slab(0, W, fz, fz+10, -1, -8, shade(wall,1.1));
    for(const fz of [206, 374]) for(const c of [45, 115, 185]){
      slab(c-32, c+32, fz-6, fz+106, 1, -11, shade(wall,1.15), null, trim);
      reveal(c-26, c+26, fz, fz+100, 14, shade(wall,.44));
      glaze(c-26, c+26, fz, fz+100, null, 'rgba(112,132,140,.80)');
      F(c-2, c+2, fz, fz+100, shade(wall,1.15), null,0, 1.4);          // meeting rail stile
      F(c-26, c+26, fz+48, fz+54, shade(wall,1.15), null,0, 1.4);      // meeting rail
      slab(c-32, c+32, fz-12, fz-6, 4, -8, shade(wall,.9));            // cill
    }

    if(state.props){
      /* window boxes, on the first-floor cills at b 4..16 -- out over
         the footway, 294 game units up, so nothing passes near them */
      for(const c of [45, 115, 185]){
        box(c-24, c+24, 4, 16, 194, 208, shade(brick,1.1), brick, shade(brick,.8));
        for(let k=0;k<4;k++)
          ball(c-24+48*(k+0.5)/4, 10, 212, 6, ['#c2452e','#c9a24a','#8a4a6a','#c2452e'][k]);
      }
      /* ---- the bracket sign, PERPENDICULAR to the building ----
         At Sir's direction, and it is the right way round: a pub sign
         hangs across the footway so it is read from up and down the
         street, not flat on the wall where the fascia already is. The
         board was a slab spanning `a`, which is the frontage direction
         -- face-on to the building and edge-on to anyone walking past.
         It is a box spanning `b` now: 6 thick in a, 36 out from the
         wall, and its two big faces look along the street.

         Screen-a is a -/+ b, so a board reaching b 44 swings 44 each
         way between mirrored edges: at a 52 it occupies 8..44 here and
         60..96 there, clear of both returns. That is what set a, not
         the look of it -- at the old a of 46 the far edge would have
         come to 2.

         WHICH FACE IS PAINTED is asked rather than assumed, the same
         derivation slab() uses for b and the fire station's tower uses
         for its return: the near face is the one whose screen y steps
         positive, so the lettering lands on the side being looked at on
         all four headings instead of on the back of the board. */
      const sa = 52, SB0 = 8, SB1 = 44;
      tube(sa, 2, 178, sa, SB1, 178, 2.4, '#2b2f33');            // arm
      tube(sa, 2, 154, sa, SB0+14, 178, 1.8, '#2b2f33');         // diagonal stay
      for(const hb of [SB0+5, SB1-5]) tube(sa, hb, 178, sa, hb, 166, 1.3, '#2b2f33');
      box(sa-3, sa+3, SB0, SB1, 112, 166, shade(trim,1.15), trim, shade(trim,.72));
      {
        const o = P(sa,SB0,0), pa = P(sa+1,SB0,0);
        const nf = (pa.y - o.y) > 0 ? sa + 3.4 : sa - 3.4;
        poly([P(nf,SB0+4,118),P(nf,SB1-4,118),P(nf,SB1-4,160),P(nf,SB0+4,160)],
             shade(wall,1.1), '#2b2f33', 2);
        poly([P(nf,SB0+9,128),P(nf,SB1-9,128),P(nf,SB1-9,150),P(nf,SB0+9,150)], trim);
      }
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
  name:'Tea house', ww: T2*4.4,
  wTodo:'two packing slots',
  head:'Two-tier red roof, dougong brackets, colonnade over the footway',
  cTodo:'6 colonnade columns need collision volumes -- they stand at b 76, out at the kerb',
  tags:['double eave','dougong bracket sets','vermilion colonnade','ice-ray lattice','name plaque','walkway over the whole footway'],
  desc:'A proper tea house rather than a shop with a pitched roof: two tiers of grey glazed tile on concave eaves, stepped dougong bracket sets carrying them, a vermilion colonnade standing right out at the kerb so the walkway covers the full width of the footway, ice-ray lattice screens and a lacquered name plaque over the doors.',
  draw(p){
    /* ============ A COVERED WALKWAY, NOT A 44-DEEP AWNING ============
       At Sir's direction the roof reaches the whole footway. The bench
       draws the pavement from b 0 out to b 110, so the colonnade stands
       at b 92 and the lower eave oversails it to b 104 -- a walkway a
       robot drives the length of, rather than a canopy hugging the wall.
       That is what the type is: the covered street frontage IS the
       building's public room.

       WHICH MAKES THE COLUMNS REAL OBSTACLES, and cTodo says so
       plainly. Six solids at b 92 sit at the kerb line, not against the
       wall, so they are in the middle of the drivable footway rather
       than at the edge of it. That is the honest cost of the walkway
       and the game has to know about all six.

       THE TWO TESTS, since the columns fail one of them. `a` must be
       inside 0..WW -- does it stand on this shop's ground -- and that
       holds. `a -/+ b` inside 0..WW asks whether it APPEARS inside the
       silhouette on both headings, and at b 92 nothing possibly could.
       The second test is for ISOLATED objects, which have nothing to
       say whose they are; a column under a beam under a roof says so by
       being attached, the same way the roof itself does. The nursery's
       loose fence and the playhouse's poster columns failed both tests,
       which is why those went and these stay.

       AUTHENTICITY, also at Sir's direction, and it is mostly four
       things this had none of:

         DOUGONG. The stepped bracket sets carrying the eaves are the
         one element that says Chinese before anything else does. Three
         tiers of blocks widening upward, one cluster over every column
         and a row of intermediate ones along the wall.
         A DOUBLE EAVE. One pitched plane was a barn. Two tiers with a
         band of wall between them is the form.
         CONCAVE EAVES. A Chinese roof slope is not straight: it is
         shallow at the eave and steepens toward the ridge, which is
         what makes the profile read. Four segments per slope, rises of
         8, 12, 16, 20.
         VERMILION AND GREY. Red lacquered columns and beams against
         grey glazed tile and white plaster, rather than brown timber on
         cream.

       Also kept from the rebuild before this one: the roof stays inside
       a 0..WW -- it used to run -22..WW+22 and sit on both neighbours --
       and the gable is drawn on whichever return is being looked at.

       THE DRAW ORDER, WRITTEN DOWN, because this shop has more depth
       range than anything else in the file at one slot wide -- from
       b -292 at the back of the main roof to b +104 at the eave, which
       is 396 of it -- and every fault it has had has been an ordering
       one. Far to near, and nothing goes in between them:

         1  body, and the main roof: back slope, ridge, front slope
         2  the gable, on the seen return
         3  the wall: screens, doors, name plaque      b -20 .. 0
         4  the lower slope from the wall to b 76
         5  the colonnade: columns, beam, brackets     b 76
         6  the lanterns                               b 76
         7  the last 28 of eave, fascia and corners    b 76 .. 104 */
    /* A 104-DEEP WALKWAY HIDES THE SHOP UNLESS IT IS HELD HIGH. The
       roof plane between b 0 and b 104 covers the wall from the height
       where the two meet on screen upward: with the eave at 166 that
       crossover is z 131, so the plaque and the top of every screen
       were behind the roof and the frontage read as a dark slab with
       poles in front of it. At an eave of 210 the crossover moves to
       175 and the whole shopfront is under the walkway rather than
       behind it -- which is the arithmetic that set H, not the look of
       the elevation.

       THE SAME SUM DECIDES WHETHER THE BRACKET SETS SURVIVE. They sit
       at b 92, z 176..197, and the eave fascia hangs at b 104 from
       z 189 to 200 -- which on screen lands right across them, so at
       an eave of 200 the one element that says Chinese was hidden by
       the roof it holds up. At 210 the fascia clears the top of the
       clusters and the whole set is in the open under the overhang,
       which is where you actually see dougong on a building. */
    /* ---- THE ROOF IS WIDER THAN THE BUILDING, at Sir's direction ----
       It is the overhang that makes the form, and it could not be had
       while the roof and the walls were both 0..WW. The answer is not
       to let the roof out past the frontage -- it used to run -22..WW+22
       and sat on both neighbours -- but to bring the BUILDING IN. Walls
       at a 40..364.8 inside a frontage of 404.8 leave 40 of oversail at
       each gable end, all of it over this shop's own ground.

       AND IT IS TWO SLOTS WIDE, at Sir's direction, on the same terms
       as the six other wide shops: ww = T2*4.4 is exactly two of
       packEdgeNoGap's own slots. At 214 the oversail had to come out of
       an already narrow frontage -- 48 of 214 -- and what was left held
       one door and two small screens. At 404.8 it holds four screens
       either side of a double door, six columns on a 61 pitch, and an
       oversail that costs proportionally less. This is a hall, not a
       lock-up; it wanted the width.

       That is the same trade the setback made in b, now made in a: the
       overhang is bought out of the plot rather than out of the
       neighbour's. It costs 48 of frontage and buys a roof that reads
       as a roof.

       AND THE TILE IS RED, also at Sir's direction. The columns go a
       shade deeper than they were so the two reds are not the same red:
       lacquer 8a2a22 on the timber, warm b04a36 on the tile. */
    const wall = '#efe9db', trim = '#8a2a22', H = 288, WW = T2*4.4;   // 404.8
    const tile = '#b04a36', gold = '#c9a24a', jade = '#3f6b52', dark = '#26221e';
    const BA0 = 40, BA1 = WW - 40, CN = 64;           // the walls, inside the roof
    const CB = 76, EB = 104;                          // colonnade, and the eave over it
    /* ---- THE BUILDING IS SET BACK, at Sir's direction ----
       The awning stays where it is, at the kerb, and the wall goes 84
       into the plot instead -- so the covered walkway is 188 deep
       rather than 104, and there is a real forecourt between the shop
       front and the eave.

       WHICH MEANS body() CANNOT BE USED, and neither can reveal(),
       glaze() or shopDoor(). All four draw at b 0, the frontage plane,
       because every other building in this file has its face there.
       That is the kit gap the BLOCK LANDMARKS note records, and this is
       the first ONE-SLOT shop to hit it -- the Bathhouse, the Chapel
       and the Nursery hut all roll their own openings for exactly this
       reason. The shell is four calls: front wall, base, the seen
       return, and the roof over the top. If a fifth building wants a
       setback, the depth argument belongs in the kit rather than in a
       fifth copy of this. */
    /* SET 60, and the number is the crossover sum again. A walkway
       roof hides the wall above the height where the two meet on
       screen: with the eave at b 104, z 210 and the wall at b -SET
       that height is 155 at SET 60 and only 147 at 84. The name plaque
       has to sit under it, so the setback is as deep as the plaque
       allows rather than as deep as it could be -- 164 of covered
       walkway against the 104 it had, which is what Sir asked for. */
    const SET = 60, FB = -SET;
    T(BA0-6, BA1+6, FB, 100, 0.6, '#cfc7b6');         // the forecourt, flat paint
    for(let k=0;k<7;k++)
      T(BA0-6, BA1+6, FB + (100-FB)*k/7 - 1, FB + (100-FB)*k/7 + 1, 0.8, '#bdb5a4');

    /* ---- ROOF TIERS, AND WHY THE CORNERS ARE PART OF THE SURFACE ----
       The turn-ups had no volume because they were not part of the
       roof: the lift was a flat strip drawn in the vertical plane at
       b = eave, filling the gap between a straight slope edge and a
       raised fascia line. A vertical strip has no top, so it read as a
       painted flare on a flat roof. Before that they were separate
       horns springing off the corners, which could not work either --
       each swept 40 in z but only 10 in a, because a is boxed into
       0..WW, so it projected as a sliver ten wide and eighty tall.

       A Chinese roof corner is not an ornament attached to a plane. The
       PLANE ITSELF rises: the whole surface near each end lifts, most
       at the eave and dying away up the slope, so the corner has a top,
       a fascia and a thickness because it is made of the same tiles as
       the rest. So the lift is a function of BOTH a and b, applied to
       every vertex of every quad, and the roof is subdivided in a --
       seven spans across each CN-wide corner, one across the middle --
       so there is geometry for it to act on. Flat roofs get amp 0 and
       cost one span, as before.

       hump(a) is 0 beyond CN of either return and rises as (1 - d/CN)^2
       to the corner, so the eave line is level across the middle and
       sweeps up at the ends. The b term is (b - b0)/(be - b0) squared,
       which puts the lift almost entirely in the eave band and blends
       it to nothing where this tier meets the next piece -- that is
       what keeps the split halves of the lower roof continuous. */
    const hump = a => { const d = Math.min(a, WW-a);
                        return d >= CN ? 0 : Math.pow(1 - d/CN, 2); };
    const XS = (() => { const q=[];
      for(let i=0;i<=7;i++) q.push(CN*i/7);
      for(let i=1;i<=7;i++) q.push(WW-CN + CN*i/7);
      return q.slice(0,8).concat([WW-CN]).concat(q.slice(8)); })();
    const tier = (prof, col, ends, amp, b0) => {
      const be = prof[0][0], A = amp || 0;
      const L = (a,b) => { if(!A) return 0;
        const t = Math.max(0, Math.min(1, (b - b0)/(be - b0)));
        return A * hump(a) * t*t; };
      const Q = (a0,a1,b0_,z0_,b1_,z1_,fill) =>
        poly([P(a0,b0_,z0_+L(a0,b0_)), P(a1,b0_,z0_+L(a1,b0_)),
              P(a1,b1_,z1_+L(a1,b1_)), P(a0,b1_,z1_+L(a0,b1_))], fill);
      for(let i=0;i<prof.length-1;i++){
        const [bA,zA] = prof[i], [bB,zB] = prof[i+1];
        for(let k=0;k<XS.length-1;k++){
          const a0 = XS[k], a1 = XS[k+1];
          Q(a0,a1, bA,zA, bB,zB, shade(col, 1.06 - i*0.05));
          for(let c=1;c<5;c++){                        // tile courses
            const t=c/5, bb=bA+(bB-bA)*t, zz=zA+(zB-zA)*t;
            Q(a0,a1, bb,zz, bb,zz-2, shade(col,.84));
          }
        }
      }
      if(!ends) return;
      const [bE,zE] = prof[0];
      for(let k=0;k<XS.length-1;k++){                  // fascia, and the drip under it
        const a0 = XS[k], a1 = XS[k+1];
        Q(a0,a1, bE,zE, bE,zE-11, shade(col,.7));
        Q(a0,a1, bE,zE-11, bE,zE-14, shade(col,.5));
      }
      /* THE VERGE, on whichever roof end is being looked at. Without it
         the oversail is a plane with no thickness, and where it passes
         the gable wall it showed as a single red hairline lying across
         the masonry -- a 40 overhang drawn as a line. A barge board
         following the whole slope profile closes the end and gives the
         overhang the depth it is supposed to have. */
      const vo = P(0,bE,0), vp = P(1,bE,0), ve = (vp.y - vo.y) > 0 ? WW : 0;
      const vp2 = [];
      for(const [b,z] of prof) vp2.push(P(ve,b,z+L(ve,b)));
      for(let i=prof.length-1;i>=0;i--){ const [b,z]=prof[i]; vp2.push(P(ve,b,z+L(ve,b)-13)); }
      poly(vp2, shade(col,.6));
    };
    /* a dougong cluster: three tiers of blocks, each wider than the one
       under it, which is the whole idea of the bracket set */
    const dougong = (aa, bb, z0) => {
      for(let t=0;t<3;t++){
        const hw = 4 + t*3.2, hz = z0 + t*6;
        box(aa-hw, aa+hw, bb-3-t*1.6, bb+3+t*1.6, hz, hz+4, shade(trim,1.15), trim, shade(trim,.78));
        if(t<2) box(aa-2.4, aa+2.4, bb-2.4, bb+2.4, hz+4, hz+6, shade(jade,1.1), jade, shade(jade,.8));
      }
    };

    /* ---- the main roof, over the building ---- */
    F(BA0, BA1, 0, H, wall, null, 0, FB);             // front wall
    F(BA0, BA1, 0, 18, shade(wall,.78), null, 0, FB+0.4); // base course
    {
      const o = P(0,FB,0), pa = P(1,FB,0);
      S((pa.y - o.y) > 0 ? BA1 : BA0, -D, FB, 0, H, shade(wall,.72));
    }
    tier([[-36,288],[-64,298],[-100,312],[-136,336],[-168,372]], tile, true, 32, -136);
    poly([P(0,-168,372),P(WW,-168,372),P(WW,-D-16,288),P(0,-D-16,288)], shade(tile,.72));
    /* ---- THE RIDGE TURNS UP TOO, which it did not ----
       Sir's other point: the top beam had no horns at all. A Chinese
       ridge is not a straight capping with a lump on each end -- it
       sweeps up over the last stretch the same way the eaves do, and
       then carries an ornament above that. Same hump(a), so the ridge
       and the eaves flare on one curve, and it is built as three faces
       rather than a slab so it has a top and two sides. */
    for(let k=0;k<XS.length-1;k++){
      const a0=XS[k], a1=XS[k+1], u0=26*hump(a0), u1=26*hump(a1);
      poly([P(a0,-176,383+u0),P(a1,-176,383+u1),P(a1,-160,383+u1),P(a0,-160,383+u0)], shade(tile,1.0));
      poly([P(a0,-160,372+u0),P(a1,-160,372+u1),P(a1,-160,383+u1),P(a0,-160,383+u0)], shade(tile,.62));
      poly([P(a0,-176,372+u0),P(a1,-176,372+u1),P(a1,-176,383+u1),P(a0,-176,383+u0)], shade(tile,.5));
    }
    for(const [oa,dir] of [[9,-1],[WW-9,1]]){          // the ornament on each raised end
      const z0 = 383 + 26*hump(oa);
      poly([P(oa-9,-168,z0),P(oa+9,-168,z0),P(oa+9,-168,z0+17),P(oa-9,-168,z0+26)], shade(tile,1.06));
      poly([P(oa+dir*9,-176,z0),P(oa+dir*9,-160,z0),
            P(oa+dir*9,-160,z0+26),P(oa+dir*9,-176,z0+17)], shade(tile,.72));
      ball(oa, -168, z0+28, 5, shade(tile,1.15));
    }
    {                                                   // gable, on the seen return
      const o = P(0,-36,0), pa = P(1,-36,0), ge = (pa.y - o.y) > 0 ? BA1 : BA0;
      poly([P(ge,-36,288),P(ge,-168,372),P(ge,-D-16,288)], shade(wall,.72));
    }

    /* ---- the shopfront: two ice-ray lattice screens and the doors ---- */
    /* Hand-rolled, for the reason above: reveal() and glaze() put the
       opening at b 0 and this wall is at b FB. Same four planes they
       would have made -- jamb backing, lit paper, lattice, glass. */
    const screen = (x0, x1) => {
      F(x0-5, x1+5, 16, 140, shade(wall,.72), null, 0, FB+0.6);     // surround
      F(x0, x1, 22, 132, '#3a2f26', null, 0, FB-20);                // the jamb backing
      F(x0, x1, 22, 132, '#f2e6c8', null, 0, FB-16);                // lit paper behind
      for(let i=1;i<3;i++) F(x0+(x1-x0)*i/3-2.4, x0+(x1-x0)*i/3+2.4, 22, 132, trim, null,0, FB-13);
      for(let k=1;k<3;k++) F(x0, x1, 22+110*k/3-2.4, 22+110*k/3+2.4, trim, null,0, FB-13);
      /* THREE PANELS, NOT THIRTY. Six by five diamonds on a 62-wide
         screen came out as a red and white check at any distance a
         robot actually sees this from -- the lattice has to be legible
         as lattice, so it is one diamond per bay on a coarser grid. */
      for(let i=0;i<3;i++) for(let k=0;k<3;k++){
        const ca = x0+(x1-x0)*(i+0.5)/3, cz = 22+110*(k+0.5)/3;
        poly([P(ca-13,FB-12.6,cz),P(ca,FB-12.6,cz+13),P(ca+13,FB-12.6,cz),P(ca,FB-12.6,cz-13)], trim);
        poly([P(ca-8,FB-12.4,cz),P(ca,FB-12.4,cz+8),P(ca+8,FB-12.4,cz),P(ca,FB-12.4,cz-8)], '#f2e6c8');
      }
      F(x0, x1, 22, 132, 'rgba(178,196,190,.20)', null, 0, FB+0.4);  // glass
      F(x0-8, x1+8, 132, 144, shade(trim,1.05), null, 0, FB+0.8);    // head
    };
    for(const [x0,x1] of [[52,106],[112,166],[240,294],[300,354]]) screen(x0, x1);
    /* the doors, hand-rolled at the set-back wall */
    F(168, 238, 0, 118, shade(wall,.72), null, 0, FB+0.6);          // surround
    F(172, 234, 0, 112, dark, null, 0, FB+0.9);                     // opening
    for(const [d0,d1] of [[175,202],[204,231]]){
      F(d0, d1, 3, 108, trim, shade(trim,.7), 1.6, FB+1.3);
      for(let r=0;r<4;r++) for(let c=0;c<3;c++)
        ball(d0 + (d1-d0)*(c+0.5)/3, FB+1.8, 16+r*24, 2.4, gold);   // door studs
    }
    ball(201, FB+2.2, 58, 3.4, gold); ball(208, FB+2.2, 58, 3.4, gold);
    F(150, 256, 124, 156, dark, null, 0, FB+0.6);                   // the name plaque
    F(154, 252, 126, 154, gold, null, 0, FB+0.9);
    F(158, 248, 130, 150, shade(dark,1.4), null,0, FB+1.2);
    for(let i=0;i<4;i++) F(170+i*18, 182+i*18, 133, 147, gold, null,0, FB+1.6);

    /* ---- the lower tier, in TWO pieces, split at the colonnade ----
       The heights are stacked from the bottom: columns to 160, beam
       160..176, bracket sets 176..197, and only then the eave at 200.
       Written the other way round the eave came out at 138, BELOW the
       beam it is carried on, and the roof cut through the colonnade.
       Only then the eave at 210, with 13 of clear air over the
       brackets.

       AND THE SLOPE CANNOT BE ONE OBJECT IN THE QUEUE, which is what
       made this shop a run of stacking faults rather than one. It
       spans b 0 to b 104, and the colonnade stands at b 76 -- so part
       of the roof is behind the columns and part is in front of them,
       and no single position in a far-to-near order is right for both.
       Drawn before, the eave fascia went behind the bracket sets it
       oversails; drawn after, the whole slope covered the shopfront.
       It is split at b 76: everything from the wall out to the columns
       goes first, then the colonnade, then the last 28 of slope with
       the fascia and the upturned corners on it.

       That is the general answer to a class of fault this session has
       hit seven times. Ordering by depth only works for objects that
       HAVE a depth; an object spanning a range has to be cut where the
       things it interleaves with sit. */
    tier([[CB,216],[30,228],[-14,242],[FB,264]], tile, false);

    /* ---- the colonnade ---- */
    /* FOUR COLUMNS, ON A 60.7 PITCH -- AND THE PITCH IS MEASURED.
       Six at r 7 read as a picket fence; five at r 8 on a 46 pitch
       looked crowded because of what hangs BETWEEN them, not because of
       the columns themselves. A lantern sits at the bay centre, so the
       clear gap either side is pitch/2 minus the lantern's widest part
       minus the column's half-width -- and the widest part of a lantern
       is not its body but its gold plate, which at r 6 spans 4r = 24 on
       screen by the plateCircle rule, not 12. At a 46 pitch that left
       23 - 12 - 8 = 3 of air and everything touched. At 60.7 it is
       10.3, which reads as a colonnade with lanterns in it rather than
       a row of things in contact. */
    for(let i=0;i<6;i++){
      const ca = 50 + i*60.96;
      /* ---- THE PLINTH, WHICH WAS A COLLAR ----
         It was a drum of r 9 running z 0..16 with the column at r 8
         starting at 15 -- one unit wider than the post and overlapping
         it by one, so the two shared an edge and the base read as a
         ferrule clipped round the pole rather than a stone the pole
         stands on. A plinth has to be visibly wider and it has to STOP
         where the column starts.

         Two steps, and the widths are the 4r rule again: a plateCircle
         of r spans 4r on screen, so the bottom cap at 11.5 is 46 wide
         against a column of 16 -- clearly a base -- and at a 61 pitch
         that still leaves 15 of air between neighbouring plinths. At
         r 14, which is what it wanted to be, they would have been 5
         apart and the complaint would have moved from post-and-base to
         base-and-base. */
      cyl(ca, CB, 0, 11, 12, '#8f887b');
      plateCircle(ca, CB, 11, 11.5, '#a49d90', '#7e7869', 1.4);
      cyl(ca, CB, 11, 19, 9.5, '#a49d90');                          // cushion
      plateCircle(ca, CB, 19, 9, '#b6afa2', '#8a8478', 1.4);
      cyl(ca, CB, 19, 162, 8, trim);                                // the column, standing on it
    }
    poly([P(BA0-6,CB,176),P(BA1+6,CB,176),P(BA1+6,CB,160),P(BA0-6,CB,160)], shade(trim,1.12));   // beam
    /* the painted band sits on the beam's STREET face, so b CB + 0.4.
       At CB - 0.4 it was four tenths of a unit BEHIND the beam and
       showed only because it was painted after it. */
    for(let i=0;i<20;i++)
      poly([P(40+i*17,CB+0.4,164),P(40+i*17+12,CB+0.4,164),
            P(40+i*17+12,CB+0.4,172),P(40+i*17,CB+0.4,172)], [jade, gold, shade(trim,.75)][i%3]);
    for(let i=0;i<6;i++) dougong(50+i*60.96, CB, 176);

    if(state.props){
      /* IN THE PLANE OF THE COLONNADE, NOT BEHIND IT. At b CB-16 they
         hung sixteen units back from the columns, which are drawn last
         and 14 wide, so every lantern sat in a column's shadow. On the
         beam line, midway between column centres, they hang in the bays
         where a lantern belongs. */
      for(let i=0;i<5;i++){
        const la = 80.5+i*60.96, lb = CB;
        tube(la, lb, 160, la, lb, 152, 0.8, dark);
        cyl(la, lb, 124, 152, 8, '#c2352b');
        plateCircle(la, lb, 124, 5, gold);
        cyl(la, lb, 152, 156, 3, gold);
      }
    }
    /* the last 28 of eave, with its fascia and corners, in front of the
       colonnade it lands on */
    tier([[EB,210],[CB,216]], tile, true, 32, CB);
    kerb(p,'none');
  }
},
{
  name:'Antiques', tall:true, ww: T2*6.6, dd: 340,
  wTodo:'three packing slots',
  head:'Triple-wide dealer: three deep windows under a long awning',
  tags:['three packing slots','two storeys','goods behind the glass','long scalloped awning','hanging chandelier','no pavement props'],
  desc:'A dealer occupying three slots: three deep bay windows with the whole stock standing inside them -- a press, a chest, a low table, a chandelier over the middle bay -- under a scalloped canvas awning running the full frontage. Nothing at all on the footway.',
  draw(p){
    /* ============ THE CLUTTER WAS ON THE NEIGHBOUR'S GROUND ============
       cTodo counted twelve prop volumes and thirty-three units of
       overrun, and the overrun was almost all one object: the stack of
       chairs was written at a = W + 18, eighteen units PAST the
       frontage, and with a seat half-width of 15 it ran a 233..263 on a
       shop 230 wide. Not lapping -- entirely outside.

       THE SHOPFRONT WAS INSIDE OUT AS WELL, which is the fault this
       session has found on five other shops. F(10, W*0.64, 22, 108) was
       a flat dark rectangle at b 0 with a stroke round it, so there was
       no recess; the three pieces of furniture then stood at b 2..20,
       which is OUTSIDE it, on the pavement. A dealer's stock goes
       behind glass. It is a real opening now, and the clutter that is
       genuinely meant to be outside is out there on purpose.

       AND THE CHANDELIER HUNG IN THE STREET. Its stem ran from z 120 to
       100 at b 22 with nothing above it -- no bracket, no ceiling, no
       hook -- so it floated over the footway. It hangs inside the
       middle bay now, off the head of the reveal, which is the only
       place a chandelier can hang.

       fTodo, both classes, and the second one twice over. The board was
       slab(6, W-6, 118, 150, -1, -9), so its far end came out on
       screen-a 233 against a return at 230. Then the sign panel on it
       was drawn at b -10..-16 -- BEHIND the board's own -9 backing --
       and the lettering on THAT at -16.5, behind the panel. Three
       layers, each one deeper into the wall than the thing it was
       supposed to sit on.

       THREE SLOTS, at Sir's direction: ww = T2*6.6, the tier the Fire
       station opened. And two storeys with it, because 607 of frontage
       on a wall of 164 is 3.7 to 1 -- a shed, not a dealer's premises.
       At H 336 it is 1.8 to 1 and the upper floor is where the stock
       that will not fit downstairs lives. dd 340 for the same reason:
       an antiques warehouse is deep. */
    const wall = '#5c4a5e', trim = '#d8c9a4', H = 336, WW = T2*6.6, DD = 340;
    const inner = '#2a2130', glass = 'rgba(120,116,132,.44)';
    const BAYS = [[16,170],[186,340],[438,592]];
    body(wall, trim, H, WW, DD);
    T(0, WW, -DD, 0, H+0.4, '#3a2f3e');                 // roof, over body's near-white plate
    slab(0, WW, H, H+14, -1, -16, shade(wall,.7));      // cornice
    slab(0, WW, 0, 24, -1, -10, shade(wall,.62));       // plinth

    /* ---- three deep bays, with the stock inside them ----
       Clipped to the opening, for the reason the showroom records: an
       object d into the shop shifts d on screen, right on edges 1 and 3
       and left on 0 and 2, so a dresser 30 back needs 30 of clearance
       inside BOTH jambs or it hangs out of the window on one heading. */
    BAYS.forEach(([x0,x1], n) => {
      slab(x0-10, x1+10, 24, 182, 2, -12, shade(wall,1.14), null, trim);
      reveal(x0, x1, 30, 170, 30, inner);
      ctx.save();
      poly([P(x0,0,170),P(x1,0,170),P(x1,0,30),P(x0,0,30)]);
      ctx.clip();
      const c = (x0+x1)/2;
      slab(x0+6, x1-6, 30, 36, -8, -34, shade(wall,.8), null, shade(wall,.95));   // floor
      box(c-64, c-24, -32,-10, 36, 118, '#8a6a4a','#9a7a52','#75563a');           // press
      for(let k=0;k<3;k++) F(c-58, c-30, 46+k*24, 62+k*24, shade('#8a6a4a',1.28), null,0, -9.4);
      box(c-14, c+22, -30,-12, 36, 74, '#9a7a5a','#aa8a68','#85684a');            // chest
      box(c+30, c+62, -28,-12, 36, 44, '#7a5a6a','#8a6a7a','#5a3c4a');            // low table
      for(const [ba,bz] of [[c+36,44],[c+52,44]]) ball(ba, -20, bz+8, 7, ['#c9a24a','#8fb4a0'][n%2]);
      if(n === 1){                                       // the chandelier, inside
        tube(c, -16, 168, c, -16, 150, 1.2, '#c9a24a');
        ball(c, -16, 146, 7, '#c9a24a');
        for(let k=0;k<6;k++){
          const q = k*1.047, ea = c + 20*Math.cos(q), eb = -16 + 20*Math.sin(q);
          tube(c, -16, 146, ea, eb, 138, 1.1, '#c9a24a');
          ball(ea, eb, 133, 5, '#fff0c0');
        }
      }
      ctx.restore();
      glaze(x0, x1, 30, 170, null, glass);
      for(let k=1;k<4;k++)
        F(x0 + (x1-x0)*k/4 - 3, x0 + (x1-x0)*k/4 + 3, 30, 170, shade(wall,.8), null,0, 0.8);
    });

    /* ---- THE DOORCASE IS A FRAME, NOT A PANEL ----
       It was one slab across a 346..432 from z 24 to 188, drawn AFTER
       shopDoor and standing 2 proud of the wall -- so the surround
       meant to frame the doorway was a solid board over the whole of
       it. Which is, exactly, the "a window drawn across the door" fault
       this session has found on seven consecutive shops, committed here
       by me while rebuilding one of them. The lesson is the same in
       both directions: anything drawn over a 346..432 has to know where
       the door is, and shopDoor's opening on this frontage is
       355.88..422.12.

       Two jambs, a head above the leaf, and a transom panel in the gap
       between the two -- and all of it before the door rather than
       after, so call order is not what is keeping the doorway clear. */
    for(const [j0,j1] of [[346,356],[422,432]])
      slab(j0, j1, 24, 188, 2, -12, shade(wall,1.14), null, trim);
    slab(346, 432, 170, 188, 2, -12, shade(wall,1.14), null, trim);
    F(356, 422, 112, 166, shade(wall,.88), shade(wall,1.2), 2, 1.6);
    for(let i=0;i<4;i++) F(364+i*15, 372+i*15, 120, 158, trim, null, 0, 2);
    shopDoor(389, wall, trim, null, WW);                 // a 355.88..422.12

    /* ---- fascia ----
       ABOVE THE AWNING, NOT BEHIND IT. Written at 196..244 against an
       awning whose head is at 238, the name board was covered along its
       whole length by the canvas in front of it -- the shop's name
       hidden by the shop's own blind. The awning heads at 186 now and
       the board starts at 192. */
    slab(20, WW-20, 192, 238, -1, -10, shade(wall,1.2), null, trim);
    F(38, WW-38, 201, 229, trim, null,0, -0.5);

    /* ---- the upper floor ---- */
    for(let i=0;i<5;i++){
      const c = 66 + i*118;
      slab(c-40, c+40, 246, 328, 1, -13, shade(wall,1.1), null, trim);
      reveal(c-32, c+32, 254, 320, 16, shade(wall,.42));
      glaze(c-32, c+32, 254, 320, null, 'rgba(120,116,132,.82)');
      F(c-2, c+2, 254, 320, shade(wall,1.1), null,0, 1.4);
    }

    /* ---- the awning over the forecourt ----
       It reaches b 52, so it swings 52 each way between mirrored edges:
       at a 10..597 the leading edge lands on -42 here and 649 there.
       Both are outside 0..WW, and both are FINE -- a canopy spanning
       the full frontage is over this shop's own pavement, and the a
       term never leaves the plot. It is the isolated props under it
       that have to pass the tighter test. */
    const MB = 52;
    poly([P(10,0,186),P(WW-10,0,186),P(WW-10,MB,162),P(10,MB,162)], '#7a3f4a');
    for(let i=0;i<26;i++)
      poly([P(10+(WW-20)*(i+0.5)/26,0,186),P(10+(WW-20)*(i+0.98)/26,0,186),
            P(10+(WW-20)*(i+0.98)/26,MB,162),P(10+(WW-20)*(i+0.5)/26,MB,162)], '#8f4c58');
    poly([P(10,MB,162),P(WW-10,MB,162),P(WW-10,MB,146),P(10,MB,146)], shade('#7a3f4a',.8));
    for(let i=0;i<26;i++){                                // scalloped valance
      const va = 10+(WW-20)*(i+0.5)/26, p0=P(va-9,MB,146), p1=P(va+9,MB,146);
      ctx.beginPath(); ctx.moveTo(p0.x,p0.y);
      ctx.quadraticCurveTo((p0.x+p1.x)/2, p0.y+11*K, p1.x, p1.y);
      ctx.closePath(); ctx.fillStyle=shade('#7a3f4a',.8); ctx.fill();
    }

    /* ---- NOTHING STANDS ON THE FOOTWAY, at Sir's direction ----
       The forecourt props are gone and cTodo goes with them. They had
       been rebuilt onto this shop's own ground and would have passed --
       each one clearing a - b - r >= 0 and a + b + r <= WW, which is
       the test the old stack of chairs at a = W + 18 failed outright --
       but passing the test is not the same as being wanted. Five solids
       on the pavement in front of a 607 frontage are five things for a
       robot to hit along the longest approach on the street, and the
       stock reads better through three deep windows than it does
       scattered across the pavement in front of them. The awning stays:
       a blind over a shop window is a blind over a shop window whether
       or not there is furniture under it.
    */
    if(state.roof){
      box(90, 210, -200, -140, H, H+26, '#8f969d','#787f86','#697077');
      box(400, 520, -200, -140, H, H+26, '#8f969d','#787f86','#697077');
    }
    kerb(p,'none');
  }
},
{
  name:'Bike shop', head:'One whole bicycle as the sign, workshop behind the glass',
  tags:['a complete bicycle as the sign','round wheels','real frame geometry','workshop window','bare footway'],
  desc:'One bicycle, drawn whole and big, hung on brackets across the display band: round wheels with real spokes, and a frame laid out from the bottom bracket in true proportions rather than numbers tuned until it looked right. The workshop is behind a real pane, and the footway is completely bare.',
  draw(p){
    /* ============ THE WHEELS WERE EGGS, AND THEY WERE IN THE WALL ====
       Two faults on the one object, and on this shop of all shops.

       faceCircle(a, b, z, r) draws radius r in a AND in z, and z is
       multiplied by ZSCALE before it is projected, so a wheel written
       at r 15 came out 30 wide by 45 tall and the sign at r 25 came out
       50 by 75. A bicycle wheel is the roundest thing anyone draws;
       this is the fifth instance of the same arithmetic after the
       chemist cross, the Locksmith key bow, the TV dish and the
       Optician's spectacles, and it is a one-line test: any face-plane
       circle whose z radius is not divided back by ZSCALE is wrong.

       AND b WAS NEGATIVE. The bikes sat at b -5 and the sign at -6, so
       both were INSIDE the masonry -- a display hung on the inside face
       of the front wall. The tag says "bikes in the wall plane", and
       the plane they wanted was the outside of it. The one bicycle that
       replaces all three hangs at b 6. Seventh time this session
       something has been found at the wrong sign of b.

       A WINDOW WAS DRAWN ACROSS THE DOOR, eighth consecutive shop.
       F(W*0.76, W-14, 48, 86) ran a 174.8..216 against an opening at
       158.8..225.

       THE WINDOW WAS A FLAT PANEL, with three mullions painted at b -1
       on the back of it. A bike shop's window is a workshop seen from
       the street, so it is a real recess with a repair stand and a
       wheel rack in it.

       cTodo: three railing posts at a = W + 12, 20 and 28 -- all three
       past the frontage, which is the 30 the flag counted. They are
       gone rather than moved: at b 40 a post needs a <= W - 42 to clear
       the far return, and the only place left for them is across the
       ramp they were meant to edge -- and the ramp has gone too, at
       Sir's direction. Nothing on the footway at all, and no state.props
       block on this shop for the first time.

       H 162 -> 210. The old elevation had no name board: a cornice, a
       window and two bikes floating on bare wall. At 210 there is room
       for a fascia at 110..146 and a display band above it, which is
       where the bikes hang. 1.25 storeys, and deliberately so -- a
       shop with goods hung above the sign needs the extra band. */
    const wall = '#2f5f6b', trim = '#e8a13a', H = 210;
    const inner = '#173038', glass = 'rgba(122,168,184,.42)';
    /* a circle in the frontage plane that is actually round */
    const ring = (a, b, z, r, n) => {
      const q = [];
      for(let i=0;i<(n||28);i++){
        const t = Math.PI*2*i/(n||28);
        q.push(P(a + r*Math.cos(t), b, z + r*Math.sin(t)/ZSCALE));
      }
      return q;
    };
    const wheel = (a, b, z, r, rim, back) => {
      poly(ring(a, b, z, r), rim);
      poly(ring(a, b+0.3, z, r-3.4), back);
      for(let k=0;k<8;k++){
        const t = k*Math.PI/4;
        tube(a, b+0.5, z, a + (r-3)*Math.cos(t), b+0.5, z + (r-3)*Math.sin(t)/ZSCALE, 0.7, rim);
      }
      poly(ring(a, b+0.8, z, r*0.16), '#3a4046');
    };
    body(wall, trim, H);
    T(0, W, -D, 0, H+0.4, '#1e3d45');                   // roof, over body's trim-coloured plate
    slab(0, W, H, H+10, -1, -12, trim);
    slab(0, W, 0, 22, -1, -8, shade(wall,.72));

    /* ---- the workshop, behind glass ---- */
    reveal(10, 140, 26, 100, 22, inner);
    ctx.save();
    poly([P(10,0,100),P(140,0,100),P(140,0,26),P(10,0,26)]);
    ctx.clip();
    slab(16, 134, 30, 34, -6, -26, shade(wall,.86), null, shade(wall,1.0));   // bench
    box(30, 96, -22,-16, 34, 38, '#6a7076','#5c6268','#4e545a');              // repair stand rail
    for(const sa of [36, 90]) cyl(sa, -19, 34, 78, 2.6, '#6a7076');
    tube(40, -18, 74, 86, -18, 66, 2.4, '#c2452e');                           // a frame on the stand
    tube(40, -18, 74, 58, -18, 52, 2.4, '#c2452e');
    tube(86, -18, 66, 58, -18, 52, 2.4, '#c2452e');
    for(let i=0;i<3;i++) wheel(112, -14 - i*4, 52 + i*2, 13, '#8fc0cc', inner); // wheels on a rack
    ctx.restore();
    glaze(10, 140, 26, 100, null, glass);
    for(let k=1;k<4;k++)
      F(10 + 130*k/4 - 3, 10 + 130*k/4 + 3, 26, 100, shade(wall,1.2), null,0, 0.8);

    shopDoor(184, wall, trim);                          // a 150.88..217.12

    /* ---- fascia ---- */
    slab(15, W-15, 110, 146, -1, -8, shade(wall,1.15), null, trim);
    F(28, W-28, 118, 138, trim, null,0, -0.5);

    /* ---- THE SIGN IS ONE WHOLE BICYCLE, at Sir's direction ----
       It was two small bikes with a bare wheel between them: three
       objects, none of them complete, and the middle one a wheel doing
       duty as a sign because it was easier than drawing the rest. One
       bicycle at twice the size says the trade in a single read, and it
       is the only thing in the band so it gets the whole band.

       Laid out from the bottom bracket in TRUE proportions and then
       divided into the projection, which is the same correction the
       wheels need and for the same reason: a vertical distance of dy
       has to be written as dy/ZSCALE or the bike comes out half again
       too tall. So the frame geometry below is a real bicycle -- 88
       between the hubs, 26 wheels, a 34 seat tube -- rather than
       numbers tuned until the picture looked right.

       At b 6 the whole machine spans a 47..187, so screen-a 41 here and
       193 on the mirrored heading. It hangs on two brackets at the
       hubs, which is how a bike goes on a wall. */
    {
      const CA = 115, HB = 172, BB = 6, ZS = 1/ZSCALE;
      const frame = trim, rimc = '#e8ddc8', dk = '#3a4046';
      const pt = (dx, dy) => [CA + dx, HB + dy*ZS];
      const T2b = (p0, p1, r, c) => tube(p0[0], BB+1, p0[1], p1[0], BB+1, p1[1], r, c);
      for(const dx of [-42, 46])                        // the brackets it hangs on
        tube(CA+dx, 0, HB, CA+dx, BB, HB, 1.8, shade(wall,1.3));
      wheel(CA-42, BB, HB, 26, rimc, shade(wall,.9));
      wheel(CA+46, BB, HB, 26, rimc, shade(wall,.9));
      const bb = pt(0,0), rh = pt(-42,0), fh = pt(46,0),
            sc = pt(-16,34), ht = pt(30,36), hb = pt(34,20),
            sd = pt(-19,43), br = pt(29,45);
      T2b(bb, hb, 2.6, frame);                          // down tube
      T2b(bb, sc, 2.6, frame);                          // seat tube
      T2b(sc, ht, 2.4, frame);                          // top tube
      T2b(ht, hb, 2.6, frame);                          // head tube
      T2b(bb, rh, 2.0, frame);                          // chain stay
      T2b(sc, rh, 2.0, frame);                          // seat stay
      T2b(hb, fh, 2.2, frame);                          // fork
      T2b(sc, sd, 1.8, dk);                             // seat post
      T2b(pt(-26,43), pt(-11,44), 2.6, dk);             // saddle
      T2b(ht, br, 1.8, dk);                             // stem
      T2b(pt(19,45), pt(38,45), 1.8, dk);               // bars
      poly(ring(CA, BB+1.6, HB, 8), dk);                // chainring
      poly(ring(CA, BB+1.9, HB, 5.5), frame);
      T2b(bb, pt(9,-9), 1.6, dk);                       // crank
      T2b(bb, pt(-9,9), 1.6, dk);
      T2b(pt(-42,0), pt(0,0), 1.0, dk);                 // chain, on the bottom run
    }
    /* THE RAMP IS GONE, at Sir's direction. It was already flat paint
       rather than a solid, so it owed nothing to the collision pass --
       but a grey striped rectangle laid in front of a doorway reads as
       a mat dropped on the pavement rather than as a threshold, and the
       door has a plinth under it that does the same job without being
       an object. The footway is bare. */
    if(state.roof) box(W*0.28,W*0.52,-140,-100,H,H+20,'#8f969d','#787f86','#697077');
    kerb(p,'none');
  }
},
{
  name:'Clockmaker', tall:true,
  head:'Two storeys, a big round clock, faces behind the glass',
  tags:['round clock','swept pediment','clocks in the window','brass palette','narrow'],
  desc:'The clock is round in the world rather than stretched by ZSCALE, built as a brass rim with a real dial and hands, and it stands proud of the wall instead of twelve units inside it. The window is a real recess with the stock ticking away behind the pane.',
  draw(p){
    /* ============ A CLOCK THAT WAS NOT ROUND, INSIDE THE WALL ========
       faceCircle(a, b, z, r) draws radius r in a AND in z, and z is
       multiplied by ZSCALE before it is projected. The big clock was
       written at r 42 and came out 84 wide by 126 tall -- half again
       taller than it is wide, on a shop whose entire identity is one
       round dial. The six small faces in the window had it too.

       Sixth instance of this after the chemist cross, the Locksmith key
       bow, the TV dish, the Optician's spectacles and the Bike shop's
       wheels. Six shops, one line: any face-plane circle whose z radius
       is not divided back by ZSCALE is wrong, and a census over the
       remaining shops would find the rest of them in one pass.

       AND IT WAS INSIDE THE MASONRY, at b -12, with the small faces at
       -3 behind a pane that sits at 0. Eighth time this session
       something has been found at the wrong sign of b. The clock stands
       proud at b 5, which is where a clock on a wall goes; the small
       ones are inside the shop behind real glass, which is where a
       clockmaker's stock goes.

       A WINDOW WAS DRAWN ACROSS THE DOOR, ninth consecutive shop.
       F(WW*0.70, WW-14, 54, 94) ran a 137.2..182 against an opening
       that shopDoor had clamped to 124.8..191.

       zTodo 1.11 on a wall of 186, drawing a swept pediment over a
       parapet and a clock the height of a person. H 336 is 2.00, and
       the upper floor is what the clock has always needed to sit on:
       a tall window either side of it and the pediment over the top.

       fTodo: slab(6, WW-6, 108, 116, -1, -8) put its far end on
       screen-a 198 against a return at 196. Margin 15 against an 8-deep
       recess leaves piers of 16 and 7. */
    const wall = '#3c4a52', trim = '#c9a24a', H = 336, WW = 196;
    const inner = '#1c252b', dial = '#f2ece0', hand = '#2b3138';
    /* a circle in the frontage plane that is actually round */
    const ring = (a, b, z, r, n) => {
      const q = [];
      for(let i=0;i<(n||30);i++){
        const t = Math.PI*2*i/(n||30);
        q.push(P(a + r*Math.cos(t), b, z + r*Math.sin(t)/ZSCALE));
      }
      return q;
    };
    /* one clock: rim, dial, twelve marks, two hands -- every radial
       distance divided into the projection the same way */
    const clock = (a, b, z, r, hr, mn) => {
      poly(ring(a, b, z, r), trim);
      poly(ring(a, b+0.3, z, r*0.86), shade(trim,.72));
      poly(ring(a, b+0.6, z, r*0.80), dial);
      for(let k=0;k<12;k++){
        const t = k*Math.PI/6, w = (k%3 ? 0.06 : 0.11)*r;
        tube(a + 0.80*r*Math.sin(t), b+0.9, z + 0.80*r*Math.cos(t)/ZSCALE,
             a + (0.80*r-w)*Math.sin(t), b+0.9, z + (0.80*r-w)*Math.cos(t)/ZSCALE,
             r*0.035, hand);
      }
      tube(a, b+1.1, z, a + 0.46*r*Math.sin(hr), b+1.1, z + 0.46*r*Math.cos(hr)/ZSCALE, r*0.05, hand);
      tube(a, b+1.2, z, a + 0.70*r*Math.sin(mn), b+1.2, z + 0.70*r*Math.cos(mn)/ZSCALE, r*0.035, hand);
      poly(ring(a, b+1.4, z, r*0.07), hand);
    };
    body(wall, trim, H, WW);
    T(0, WW, -D, 0, H+0.4, '#232d34');                  // roof, over body's near-white plate
    slab(0, WW, H, H+10, -1, -12, shade(wall,1.4));     // parapet
    slab(0, WW, 0, 24, -1, -8, shade(wall,.74));        // plinth

    /* ---- the swept pediment over the parapet ---- */
    const pk = (t,bb) => P(WW*0.20 + WW*0.60*t, bb, H+10 + (1-Math.abs(t-0.5)*2)*54);
    /* THE TYMPANUM IS FILLED, NOT OUTLINED. At shade(wall,1.2) against
       a roof plate of the same family it came out within a few percent
       of what is behind it, so only the gold edge showed and the
       pediment read as a wire triangle floating over the roof. A
       pediment is a solid gable end; it wants to be lighter than the
       wall, not the same as it. */
    ctx.beginPath();
    let q=P(WW*0.20,-1,H+10); ctx.moveTo(q.x,q.y);
    q=P(WW*0.50,-1,H+64); ctx.lineTo(q.x,q.y);
    q=P(WW*0.80,-1,H+10); ctx.lineTo(q.x,q.y);
    ctx.closePath(); ctx.fillStyle=shade(wall,1.62); ctx.fill();
    ctx.strokeStyle=trim; ctx.lineWidth=3; ctx.stroke();
    for(let i=0;i<16;i++)
      poly([pk(i/16,-1),pk((i+1)/16,-1),pk((i+1)/16,-11),pk(i/16,-11)], shade(wall,1.28));

    /* ---- the shop window: a clockmaker's stock, behind glass ---- */
    slab(4, 114, 24, 122, 2, -12, shade(wall,1.2), null, trim);
    reveal(12, 106, 30, 112, 24, inner);
    ctx.save();
    poly([P(12,0,112),P(106,0,112),P(106,0,30),P(12,0,30)]);
    ctx.clip();
    for(let r=0;r<2;r++){
      const sz = 42 + r*38;
      slab(16, 102, sz-4, sz, -6, -22, shade(wall,.9), null, shade(wall,1.05));
      for(let c=0;c<3;c++) clock(26 + c*32, -8, sz + 14, 11, 0.7 + c, 3.2 - c*0.8);
    }
    ctx.restore();
    glaze(12, 106, 30, 112, null, 'rgba(110,124,136,.44)');
    for(let k=1;k<3;k++) F(12 + 94*k/3 - 3, 12 + 94*k/3 + 3, 30, 112, shade(wall,1.5), null,0, 0.8);

    shopDoor(150, wall, trim, null, WW);                // a 116.88..183.12

    /* ---- fascia ---- */
    slab(15, WW-15, 128, 164, -1, -8, trim);
    F(28, WW-28, 136, 156, shade(wall,1.25), null,0, -0.5);

    /* ---- the upper floor: a tall window either side of the clock ----
       THE END MARGINS WERE FOUR. At c 28 and 168 with a surround of
       c +/- 24 the windows ran a 4..52 and 144..192 on a frontage of
       196, so each sat four units off its own return -- which reads as
       a window about to fall off the corner, and would read worse in a
       run where the neighbour's wall starts there.

       Narrower windows rather than a wider gap, because the gap is
       spoken for: the clock at r 40 already fills a 58..138, and on a
       frontage of 196 two surrounds plus the clock plus four clearances
       do not fit at 48 wide. At c +/- 18 the margins are 14 and the
       tightest clock-to-surround gap is 4 -- and it is 4 on BOTH
       headings, which is the number that had to be checked: the clock
       stands at b 5 and the surrounds at b 1, so the pair closes up on
       one side and opens on the other depending on which way the edge
       runs. */
    for(const c of [32, 164]){
      slab(c-18, c+18, 186, 292, 1, -12, shade(wall,1.2), null, trim);
      reveal(c-13, c+13, 194, 284, 14, shade(wall,.5));
      glaze(c-13, c+13, 194, 284, null, 'rgba(96,112,124,.84)');
      F(c-1.6, c+1.6, 194, 284, shade(wall,1.2), null,0, 1.4);
      F(c-13, c+13, 236, 242, shade(wall,1.2), null,0, 1.4);
    }
    /* THE CLOCK, AND ITS CLEARANCE OF THE WINDOWS EITHER SIDE. It
       stands at b 5, so its screen span is a - 5 here and a + 5 there,
       while the window surrounds sit at b 1: at r 44 the two overlapped
       by six on one heading. r 40 on 98 gives screen-a 53..133 here and
       63..143 on the mirror, against surrounds at 13..49 / 145..181 and
       15..51 / 147..183 -- clear by 4 at the tightest, and by 4 either
       way round rather than by 2 one way and 10 the other. */
    tube(98, 0, 262, 98, 5, 262, 3, shade(wall,1.3));
    clock(98, 5, 262, 40, 1.9, 5.1);

    if(state.roof) box(WW*0.24,WW*0.46,-150,-110,H,H+20,'#8f969d','#787f86','#697077');
    kerb(p,'none');
  }
},
{
  name:'Fabric shop', head:'One deep awning, bolt ends and rolls behind the glass',
  tags:['deep window awning','rolls hanging in the window','bolt ends on shelves','clear doorway','no pavement props'],
  desc:'One real awning hood with an underside and returns over a deep window of shelved bolt ends and hanging rolls. Nothing on the footway and nothing over the door.',
  draw(p){
    /* ============ FIVE BOLTS ON THE NEIGHBOUR, AND THE CENSUS
                    NEVER SAW THEM ============
       The leaning bolts were written at a = W + 12 + i*15, so 242, 257,
       272, 287 and 302 on a frontage of 230 -- the nearest one twelve
       units past the return and the furthest seventy-two. Five solids,
       none of them on this shop's ground.

       AND THIS ENTRY CARRIED NO cTodo AT ALL. Every other shop with
       props on the footway has the flag; this one has only fTodo, and
       the reason is that the bolts are built from tube() and ball()
       while the prop census counts cyl, box and plateCircle. So the
       count in every cTodo in this file is a floor, not a total, and a
       shop with no cTodo is not the same as a shop with nothing on the
       pavement. Worth a re-run with tube and ball added before anyone
       trusts the numbers.

       They stay, because "bolt racks outside" is what this shop is --
       but on its own ground. Each leans to b 52 with a radius of 6, so
       it needs a between 58 and 172; the five sit on 60 to 140, under
       the window hood rather than out past the end of it.

       THE HANGING ROLLS WERE AT b -30, thirty units inside the masonry,
       suspended from a rail that was also inside it. Ninth time this
       session. They hang in the window now, which is where a fabric
       shop hangs them and where they cost nothing to walk past.

       A WINDOW WAS DRAWN ACROSS THE DOOR, tenth consecutive shop.
       F(W*0.78, W-14, 50, 88) ran a 179.4..216 against an opening at
       158.8..225.

       THE WINDOW WAS A FLAT PANEL with the pattern blocks painted at
       b -1 on the back of it. It is a real recess with the bolt ends
       stacked on shelves inside.

       fTodo: slab(8, W-8, 128, 150, -1, -9) put its far end on screen-a
       231 against a return at 230, and the lettering sat at -9.5 behind
       the board's own -9 backing.

       AND THE AWNINGS SET THE ELEVATION. A hood reaching b 34 has to
       clear Tipsy, whose flag is 97 game units -- 65
       local. The hood's underside is at z 92, which is 138, so a robot
       passes under it with 41 to spare; that is what fixed the window
       head at 98 and the fascia at 130 rather than the other way
       round. */
    const wall = '#7a4a6b', trim = '#f0e2d0', H = 158;
    const inner = '#3a2434';
    const cloth = ['#e8a13a','#4aa8c4','#c2452e','#7ac48a','#f0e2d0','#e2748c'];
    body(wall, trim, H);
    T(0, W, -D, 0, H+0.4, '#4a2e42');                   // roof, over body's pale plate
    slab(0, W, H, H+10, 4, 0, trim);                    // cornice, on the band's face
    /* NO PLINTH. There was a full-width band at z 0..20 in
       shade(wall,.72), and once the shopfront became one band running
       to the ground it had nothing left to do -- it showed as a dark
       stub at each end with a return block on the corner, a base course
       that started and stopped for no reason a person could see. Now
       that the band itself runs 0..W it is covered along its whole
       length. The band IS the base treatment. */

    /* ---- ONE SHOPFRONT BAND, WITH BOTH OPENINGS CUT OUT OF IT ----
       The door was hanging off the corner and the reason is the margin
       rule at the head of this file, which I broke twice on one
       elevation. A recessed slab's back face lands on screen-a
       a1 + |bBack|, so at b 2..-12 it needs 18 of margin; the door case
       had 6 and came out on 236 against a return at 230, and the window
       case had 4. Six units of doorway standing on the neighbour, which
       is exactly what it looked like.

       And two separate cases with a pier between them was the wrong
       shape anyway -- five stacked horizontal bands on a 158 wall,
       every one with its own numbers. One band, with the window recess
       and shopDoor's opening cut through it, is one set of numbers, and
       the pier between the openings is simply the part of the band
       neither of them took.

       AND IT RUNS THE FULL WIDTH, at Sir's direction, rather than being
       inset to satisfy the margin rule. That is the right call and the
       precedent is at the head of this file: a CORNICE may wrap a
       corner, because on a terrace it runs to the party wall and meets
       its neighbour's. A shopfront band is the same thing at the other
       end of the elevation -- a real one runs wall to wall too, and
       inset to a 18..212 it read as a panel stuck on the front rather
       than as the shop. So it takes the cornice's licence: 0..W, back
       face on screen-a 240, wrapping by 10 exactly as the cornice above
       it wraps by 12.

       The margin rule is not repealed by this. It applies to boards and
       cases that stop short of the return -- a fascia, a doorcase, a
       window surround -- where a back face landing past the corner is
       an object hanging off the building. A band that is MEANT to reach
       the corner has nothing to hang off. The test is whether the
       element is bounded by the frontage or by the terrace. */
    slab(0, W, 0, 122, 4, 0, shade(wall,1.2), null, trim);
    reveal(16, 126, 22, 102, 26, inner);
    ctx.save();
    poly([P(16,0,102),P(126,0,102),P(126,0,22),P(16,0,22)]);
    ctx.clip();
    for(let r=0;r<3;r++){
      const sz = 30 + r*24;
      slab(20, 122, sz-4, sz, -8, -26, shade(wall,.86), null, shade(wall,1.02));
      for(let c=0;c<5;c++){                             // bolt ends on the shelf
        const ba = 30 + c*21;
        cyl(ba, -14, sz, sz+18, 9, cloth[(r*5+c)%6]);
        plateCircle(ba, -14, sz+18, 8, shade(cloth[(r*5+c)%6],1.2));
      }
    }
    for(let i=0;i<4;i++){                               // rolls hanging from the head
      const ra = 34 + i*24;
      tube(ra, -20, 100, ra, -20, 96, 0.9, '#8d979f');
      cyl(ra, -20, 44, 96, 7, cloth[(i+2)%6]);
      plateCircle(ra, -20, 44, 6, shade(cloth[(i+2)%6],.75));
    }
    ctx.restore();
    glaze(16, 126, 22, 102, null, 'rgba(150,120,146,.34)');
    for(let k=1;k<4;k++) F(16 + 110*k/4 - 3, 16 + 110*k/4 + 3, 22, 102, shade(wall,1.25), null,0, 0.8);

    /* ---- THE DOORCASE IS ONE CASED OPENING, LIKE THE WINDOW'S ----
       It was three separate pieces -- two jambs at a 144..152 and
       215..223 and a lintel across the top -- laid over a doorway whose
       own surround already runs 146.9..221.1. So there were two frames
       on one opening, the outer one overlapping the inner by five on
       each side, and the jambs started at z 18 with the plinth below
       them, floating. It read as a pale block with a door sunk in it.

       The window is cased with a single slab that shopDoor's opening
       then cuts out of, and the door gets the same treatment: one slab,
       drawn BEFORE the door so the door paints its own opening through
       it. Centred, so the margins come out even -- 9.9 either side and
       12 above -- which is what the three-piece version could not do,
       because its numbers were set by the pieces rather than by the
       opening -- and it is the same band the window sits in, so the two
       cannot drift apart. */
    shopDoor(178, wall, trim);                          // a 144.88..211.12

    /* ---- fascia ----
       THE THREE BANDS NOW SHARE ONE FACE AND ONE WIDTH. The shopfront
       ran 0..W and stood 2 proud; the fascia was inset 15 and recessed
       to -1, and the cornice was recessed too. So at the corner the
       three stopped in three different places at three different
       depths, and the return read as a set of ledges rather than as the
       edge of a building.

       All three are b 4..0 across 0..W now, stacked with a 6 reveal
       between them: shopfront 0..122, fascia 128..152, cornice 158..168.

       AND bBack IS 0, WHICH IS THE PART THAT WAS ACTUALLY WRONG. At
       2..-10 each band was a twelve-deep solid of which ten sat inside
       the masonry, invisible -- except at the return, where slab() drew
       its end face at a = W spanning the full twelve. That face is
       coplanar with the side wall and a different colour, so it painted
       a cream patch onto the flank: a band that appeared to carry on
       round the corner for twelve units and then stop in mid-air. The
       buried ten did no work anywhere else and only that harm. With the
       back flush at 0 and the projection at 4, each band is a real 4
       proud of the wall, its end at the corner is 4 deep, and nothing
       lands on the return at all.

       The lettering moves with the face it sits on: proud of a fascia
       at -1 it was -0.5, and proud of one at +4 it is 4.6. Same rule
       this session has caught eleven times in the other direction --
       change a face's depth and everything painted on it is silently
       orphaned, with no error, only a thing that vanishes. */
    slab(0, W, 128, 152, 4, 0, shade(wall,1.25), null, trim);
    F(28, W-28, 133, 147, trim, null,0, 4.6);

    /* ---- TWIN AWNINGS, SIDE BY SIDE -- WHICH IS WHAT "TWIN" MEANT ----
       They were stacked: two full-width hoods reaching b 26 and b 38,
       one 22 above the other, and between them they covered the entire
       shopfront. The window was visible below z 81 and the fascia not at
       all -- a wall of canvas with a shop somewhere behind it. The head
       said "twin awnings" and a twin pair is two blinds beside each
       other, one over the window and one over the door, not one blind
       on top of another.

       AND THEN THE DOOR ONE WENT TOO, at Sir's direction: nothing over
       the door. It is the right call on this shop for the reason the
       whole session keeps running into -- a doorway is the one part of
       a frontage a robot has to find, and anything hung over it is
       something to look past. The entrance now has jambs and a lintel
       and clear air above.

       The window hood heads at 116, so the fascia at 130 clears it. It
       reaches b 34, which puts its near edge on screen where the wall
       is at z 88.7, so two thirds of the window shows under it; and its
       underside at z 92 is 138 game units against Tipsy's flag at 97. */
    for(const [x0, x1, out, base] of [[12, 132, 34, '#c2452e']]){
      const z1 = 118, z0 = z1 - 16, n = Math.max(3, Math.round((x1-x0)/16));
      for(let i=0;i<n;i++){
        const s0=x0+(x1-x0)*i/n, s1=x0+(x1-x0)*(i+1)/n;
        poly([P(s0,0,z1),P(s1,0,z1),P(s1,out,z0),P(s0,out,z0)], i%2 ? trim : base);
      }
      poly([P(x0,0,z1-8),P(x1,0,z1-8),P(x1,out,z0-8),P(x0,out,z0-8)], shade(base,.6));
      poly([P(x0,out,z0),P(x1,out,z0),P(x1,out,z0-8),P(x0,out,z0-8)], shade(base,.8));
      for(const ea of [x0, x1])
        poly([P(ea,0,z1),P(ea,out,z0),P(ea,out,z0-8),P(ea,0,z1-8)], shade(base,.55));
    }

    /* THE BOLTS ARE GONE, at Sir's direction, and cTodo with them.
       They had been brought back onto this shop's own ground -- each
       leaning to b 52 with a radius of 6 needs a between 58 and 172,
       and the five sat on 60 to 140 -- but that only made them legal,
       not wanted. Five poles leaning into the footway are five things
       to hit, and the stock reads through the window. Fourth shop this
       session where the answer to "these props need collision volumes"
       turned out to be "these props do not need to exist", after the
       nursery's fence, the playhouse's poster columns and the antiques
       forecourt. */
    if(state.roof) box(W*0.32,W*0.58,-140,-100,H,H+20,'#8f969d','#787f86','#697077');
    kerb(p,'none');
  }
},
{
  name:'Music shop', head:'Guitars hung on the wall, piano behind the glass',
  tags:['guitars hung on the wall','round bouts','upright piano behind glass','sheet racks','deep green'],
  desc:'The guitar bodies are round in the world rather than stretched by ZSCALE, laid out from the lower bout in true proportions, and they hang on the outside of the wall where a shop hangs its stock. The piano and the sheet racks are inside the window, nothing stands on the footway, and nothing sits over the door.',
  draw(p){
    /* ============ THE GUITARS WERE OVAL AND IN THE WALL ==============
       faceCircle(a, b, z, r) draws radius r in a AND in z, and z is
       multiplied by ZSCALE, so a lower bout at r 15 came out 30 wide by
       45 tall and the upper bout 22 by 33. A guitar body is two circles;
       these were two eggs, one above the other. Seventh instance after
       the chemist cross, the Locksmith key bow, the TV dish, the
       Optician's spectacles, the Bike shop's wheels and the Clockmaker's
       dial -- and the same one-line test finds every one of them.

       AND b WAS NEGATIVE: the guitars at -4 and the horn at -12, both
       inside the masonry. Tenth time this session. The guitars hang at
       b 5, which is the outside of the wall; the horn is gone.

       THE PIANO AND THE SHEET RACK WERE ON THE PAVEMENT, at b 2..22 --
       which is what cTodo's two props were. An upright piano standing
       on the footway is not a display, it is an obstruction; both are
       inside the window now and the flag comes off.

       A WINDOW WAS DRAWN ACROSS THE DOOR, eleventh consecutive shop.
       F(W*0.76, W-14, 52, 90) ran a 174.8..216 against an opening at
       158.8..225.

       THE WINDOW WAS A FLAT PANEL, eleventh shop. Real recess now, with
       the piano and the racks standing in it.

       H 168 -> 224, and it is the Bike shop's argument again: the old
       elevation had no name board at all, and a shop that hangs its
       goods ABOVE its sign needs a band to hang them in. 1.33 storeys,
       deliberately between the tiers.

       THE BANDS FOLLOW THE FABRIC SHOP. Shopfront, fascia and cornice
       all run 0..W at b 4..0 -- full width because they are bounded by
       the terrace rather than by the frontage, and bBack 0 because a
       band that reaches the return would otherwise paint its end face
       onto the flank. */
    const wall = '#2f4a3a', trim = '#c9a24a', H = 224;
    const inner = '#152219';
    body(wall, trim, H);
    T(0, W, -D, 0, H+0.4, '#1e3228');                   // roof, over body's pale plate
    slab(0, W, H, H+10, 4, 0, trim);                    // cornice

    /* ---- one shopfront band, both openings cut out of it ---- */
    slab(0, W, 0, 122, 4, 0, shade(wall,1.2), null, trim);
    reveal(16, 126, 22, 102, 26, inner);
    ctx.save();
    poly([P(16,0,102),P(126,0,102),P(126,0,22),P(16,0,22)]);
    ctx.clip();
    slab(20, 122, 24, 30, -6, -26, shade(wall,.86), null, shade(wall,1.0));   // the floor
    box(26, 78, -26, -8, 30, 80, '#5a3f2e','#4a3226','#3c281d');              // upright piano
    F(30, 74, 60, 68, '#e8ddc8', null,0, -7.4);                               // keyboard
    for(let i=0;i<10;i++) F(32+i*4.2, 33.6+i*4.2, 60, 68, '#2b2119', null,0, -7.1);
    box(30, 74, -22, -12, 80, 86, '#4a3226','#5a3f2e','#3c281d');             // lid
    box(88, 122, -24, -10, 30, 94, '#4a3226','#3a2a20','#2e2018');            // sheet racks
    for(let i=0;i<4;i++)
      F(92, 118, 36+i*14, 46+i*14, ['#c9a24a','#e8ddc8','#8fb4a0','#c2807e'][i], null,0, -9.4);
    ctx.restore();
    glaze(16, 126, 22, 102, null, 'rgba(120,150,132,.40)');
    for(let k=1;k<4;k++) F(16 + 110*k/4 - 3, 16 + 110*k/4 + 3, 22, 102, shade(wall,1.25), null,0, 0.8);

    shopDoor(178, wall, trim);                          // a 144.88..211.12

    /* ---- fascia ----
       THE HORN IS GONE, at Sir's direction. It had already been moved
       once, off the doorway where I had put it, and moving a thing is
       the wrong answer when the thing was the problem: an emblem
       painted on the name board competes with the board for the same
       job, and this shop already says what it is with three guitars
       hung above the sign. The board carries lettering and nothing
       else.

       Two removals now on this shop and both the same shape -- the
       piano and rack off the pavement, the horn off the board. The
       elevation is three things: goods on the wall, a name, and a
       window with the stock in it. */
    slab(0, W, 128, 152, 4, 0, shade(wall,1.25), null, trim);
    F(24, W-24, 133, 147, trim, null,0, 4.6);

    /* ---- three guitars hung on the wall ----
       Laid out from the lower bout in TRUE proportions and divided into
       the projection, the way the Bike shop's frame is: bouts of 13 and
       9.5, a 22 waist, a 58 scale to the nut. Written straight into z
       the whole instrument would come out half again too long.

       At b 5 a guitar of half-width 13 on a 45 spans screen-a 27..53
       here and 37..63 on the mirror, and the far one on 185 comes to
       203 -- inside 0..230 both ways. */
    const ZK = 1/ZSCALE;
    for(const [ga, col] of [[45,'#a8632f'],[115,'#c9a24a'],[185,'#8a3f36']]){
      const gz = 170, gb = 5;
      const ring = (a,b,z,r,n) => { const q=[];
        for(let i=0;i<(n||24);i++){ const t=Math.PI*2*i/(n||24);
          q.push(P(a + r*Math.cos(t), b, z + r*Math.sin(t)*ZK)); }
        return q; };
      tube(ga, gb+1, gz + 30*ZK, ga, gb+1, gz + 58*ZK, 2.2, '#2b2119');       // neck
      slab(ga-5.5, ga+5.5, gz + 58*ZK, gz + 68*ZK, gb+2, gb-1, '#2b2119');    // head
      poly(ring(ga, gb, gz + 22*ZK, 9.5), col);                               // upper bout
      poly(ring(ga, gb, gz, 13), col);                                        // lower bout
      poly(ring(ga, gb+0.4, gz + 22*ZK, 8), shade(col,1.12));
      poly(ring(ga, gb+0.4, gz, 11.5), shade(col,1.12));
      poly(ring(ga, gb+0.8, gz + 6*ZK, 4), '#2b2119');                        // sound hole
      F(ga-9, ga+9, gz + 12*ZK, gz + 14*ZK, '#2b2119', null,0, gb+0.8);       // bridge
      for(let k=0;k<3;k++)
        tube(ga-2.4+k*2.4, gb+1.4, gz + 12*ZK, ga-2.4+k*2.4, gb+1.4, gz + 58*ZK, 0.5, '#d8cfae');
      tube(ga, 0, gz + 40*ZK, ga, gb, gz + 40*ZK, 1.4, shade(wall,1.35));     // its hook
    }

    if(state.roof) box(W*0.28,W*0.52,-140,-100,H,H+20,'#8f969d','#787f86','#697077');
    kerb(p,'none');
  }
},
{
  name:'Chandlery', place:'waterfront',
  pTodo:'waterfront only -- the shore, boardwalk and pier exist in game/index.html; the chooser still places by block type',
  head:'Three portholes, anchor on the boarding, mast on the roof',
  tags:['waterfront only','round portholes','stepped mast','rigging lines','anchor sign','tarred boarding'],
  desc:'The portholes are round in the world rather than stretched by ZSCALE, and they are the shop\'s glazing rather than decoration painted inside a flat panel. The anchor stands proud of the boarding, and nothing is on the footway or over the door.',
  draw(p){
    /* ============ WATERFRONT ONLY, AND THE FILE HAD NO WAY TO SAY SO
       A chandler is a ship chandler: the shop on the quay that sells a
       vessel its rope, canvas, tar, blocks, lamps, paint and charts.
       It is not a shop the public browses, it is the one a skipper
       visits before sailing, and it exists because the water is there.
       Dropped into an inland commercial run it is a mast and a set of
       portholes on a street with no boats.

       So `place: 'waterfront'` is a new field, and pTodo is a new flag,
       because nothing in this file could previously say WHERE a shop
       belongs -- only how wide it is, how tall, and what it owes the
       collision pass. buildBlocks picks housing / park / commercial per
       block and the chooser takes any body from the matching list; it
       has no notion that some trades are tied to a feature of the map.
       AND THE WATERFRONT IS FURTHER ALONG THAN THIS NOTE ASSUMED.
       Checked while chasing the Shoe shop rename: game/index.html
       already carries shore, boardwalk and pier work -- 281 mentions of
       pier, 85 of shore, 49 of boardwalk, 21 of aquarium -- and
       buildWalk knows about shore legs well enough that hasGoodDoorLeg
       rejects them for doors. So there IS somewhere to honour this
       already; what is missing is only the chooser, which still picks
       by block type. pTodo says that rather than "wait for the
       geometry".

       THE FISHMONGER IS THE OTHER ONE, and it is already polished, so
       this wants a sweep rather than a note on one shop: any trade
       whose reason for existing is the water. Worth deciding at the
       same time whether `place` should also cover the inverse -- a
       trade that must NOT be on the waterfront -- because a one-value
       field will not stretch to that later.

       ============ ROUND THINGS THAT WERE NOT ROUND, AGAIN ===========
       faceCircle(a, b, z, r) draws radius r in a AND in z, and z is
       multiplied by ZSCALE. The portholes were written at r 15 and came
       out 30 wide by 45 tall -- an oval porthole, which is a thing that
       does not exist. Eighth instance after the chemist cross, the
       Locksmith key bow, the TV dish, the Optician's spectacles, the
       Bike shop's wheels, the Clockmaker's dial and the Music shop's
       guitar bouts.

       AND THEY WERE INSIDE THE WALL, at b -3, painted on the back of a
       flat panel that was itself standing in for a window. So the shop
       had no glazing at all: a dark rectangle with three ovals drawn
       behind it. The portholes ARE the glazing now -- rim, glass and a
       lit interior, cut into the shopfront band -- which is what a
       chandlery has instead of a plate-glass window.

       THE ANCHOR WAS AT b -6, six units into the masonry. Eleventh time
       this session something has been found at the wrong sign of b.

       A WINDOW WAS DRAWN ACROSS THE DOOR, twelfth consecutive shop.
       F(W*0.70, W-14, 52, 90) ran a 161..216 against an opening that
       shopDoor had clamped to 157.8..224.

       TWO ROPE COILS ON THE NEIGHBOUR, AND NO cTodo TO SAY SO. They
       were at a = W + 18 and W + 54, eighteen and fifty-four past the
       return -- and this entry carried only fTodo, because the coils
       are plateHoop and the prop census counts cyl, box and
       plateCircle. Second shop today with unflagged pavement props the
       census cannot see, after the Fabric shop's tube-and-ball bolts.
       plateHoop belongs on that list too. They are gone rather than
       moved: nothing on the footway.

       fTodo: slab(6, W-6, 112, 140, -1, -9) put its far end on screen-a
       233 against a return at 230, and the lettering sat at -9.5 behind
       the board's own -9 backing.

       H 160 -> 200 so the anchor has a wall to stand on. The boarding
       runs above the fascia rather than behind the shopfront, which is
       where it was: F(0, W, 12 + i*20, ...) at b -1 ran the full height
       of the elevation and everything else was drawn over it. */
    const wall = '#2b3f4a', trim = '#c9b48e', H = 200;
    const inner = '#111d24';
    body(wall, trim, H);
    T(0, W, -D, 0, H+0.4, '#1b2a33');                   // roof, over body's pale plate
    slab(0, W, H, H+10, 4, 0, trim);                    // cornice

    /* ---- one shopfront band, portholes and the door cut out of it ---- */
    slab(0, W, 0, 108, 4, 0, shade(wall,1.2), null, trim);
    const ring = (a, b, z, r, n) => { const q = [];
      for(let i=0;i<(n||30);i++){ const t = Math.PI*2*i/(n||30);
        q.push(P(a + r*Math.cos(t), b, z + r*Math.sin(t)/ZSCALE)); }
      return q; };
    /* THREE PORTHOLES, AND THE SPACING IS THE DOOR'S. shopDoor puts its
       opening on 144.9..211.1 with a surround from 140.9, so the last
       porthole plus its rim has to finish before that: at r 18 on a 116
       it reaches 136, clear by 5. */
    for(const pa of [28, 72, 116]){
      /* THE BACKING HAS TO STAY BEHIND THE RIM, and how far back it can
         sit is set by how wide it is: at b -10 with r 17 it shifts 10 on
         screen and reaches pa + 27 against a rim ending at pa + 21, so
         it showed as a dark crescent outside the porthole on one side.
         r 16 at b -4 reaches pa + 20 and is covered. */
      poly(ring(pa, -4, 60, 16), inner);                               // the shop behind it
      cyl(pa, -3, 46, 56, 4.5, '#8a7a58');                             // a lamp on the sill
      poly(ring(pa, -2.6, 58, 5), '#f0e2b4');
      poly(ring(pa, 0.4, 60, 17), 'rgba(150,196,214,.46)');            // glass
      poly([P(pa-11,0.7,66),P(pa-1,0.7,69),P(pa+4,0.7,63),P(pa-6,0.7,60)],
           'rgba(255,255,255,.22)');
      poly(ring(pa, 2, 60, 21), trim);                                 // rim
      poly(ring(pa, 2.3, 60, 17.5), shade(trim,.62));
      for(let k=0;k<6;k++){                                            // rim bolts
        const t = k*Math.PI/3;
        poly(ring(pa + 19*Math.cos(t), 2.6, 60 + 19*Math.sin(t)/ZSCALE, 1.6, 10), shade(trim,.55));
      }
    }
    shopDoor(178, wall, trim);                          // a 144.88..211.12

    /* ---- fascia ---- */
    slab(0, W, 114, 138, 4, 0, shade(wall,1.25), null, trim);
    F(24, W-24, 119, 133, trim, null,0, 4.6);

    /* ---- tarred boarding, above the fascia and ON the wall ---- */
    for(let i=0;i<5;i++) F(0, W, 144+i*11, 147+i*11, shade(wall,1.12), null,0, 0.4);

    /* ---- the anchor, standing proud of the boarding ----
       At b 5 the flukes span a 102..128, so screen-a 97..123 here and
       107..133 on the mirrored heading -- well inside 0..230 both ways,
       and clear of the door in a, which is the check this session has
       failed on twelve consecutive shops. */
    {
      const aa = 115, ab = 5, az = 174;
      tube(aa, ab, az-22, aa, ab, az+16, 4, trim);                     // shank
      tube(aa-13, ab, az-6, aa+13, ab, az-6, 3.4, trim);               // stock
      poly(ring(aa, ab, az+20, 6), trim);                              // ring
      poly(ring(aa, ab+0.3, az+20, 3.4), shade(wall,1.12));
      for(const s of [-1, 1]){                                         // the two flukes
        const t0 = P(aa, ab, az-22), t1 = P(aa + s*13, ab, az-8),
              t2 = P(aa + s*15, ab, az-14), t3 = P(aa, ab, az-30);
        poly([t0, t1, t2, t3], trim, shade(trim,.7), 1.6);
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
  name:'Brewery tap', tall:true, block:true, ww: 1048.8, dd: 1048.8,
  wTodo:'a whole block edge -- five packing slots, and the packer places none of them',
  cTodo:'yard wall, gate posts and the dock platform need volumes; the yard itself is drivable',
  head:'Brewery on a whole block: tap room to the street, yard wrapping three sides',
  tags:['block landmark','tap room on the street','yard on three sides','loading dock','copper still behind glass','drivable yard'],
  desc:'The brewhouse stands as an island in its own block with the tap room facing the street and the working yard wrapping round the other three sides -- dock and casks down one flank, crates across the back, a cartway returning up the other. The still and the tuns are behind the tap-room glass.',
  draw(p){
    /* ============ A BREWERY IS A LANDMARK, AND THE YARD IS WHY ======
       Sir asked for a whole block with a loading dock, and that settles
       which of the two block treatments this is. The Playhouse took a
       whole edge and stayed on the line because a theatre does
       everything at its front door. A brewery does not: it sells at the
       front and WORKS everywhere else, and the work needs ground a dray
       can turn on. That is the landmark case -- a lot with buildings on
       it -- so block:true, ww = dd = 1048.8, on the same terms as the
       Bathhouse, the Chapel and the Nursery.

       THE YARD WRAPS THREE SIDES, at Sir's direction, and that is the
       shape the type wants: the brewhouse is an ISLAND on its plot with
       a cartway all the way round it, so a dray comes in at the gate,
       loads at the dock, and goes on round rather than reversing out.
       A yard on one side is a strip of ground; a yard that returns is a
       working circuit.

       IT ALSO SOLVES A CAMERA PROBLEM. The first cut put the dock on
       the b -880 face -- "the back" in the world -- and the camera in
       this game is a fixed isometric: it always shows the same two
       faces of a lot. That dock would have been correct, reachable,
       registered for a dropoff, and never once seen. With the yard
       wrapping, the near flank and the back-right corner of the circuit
       are both in view, so the working half of the building is on the
       side the player actually drives past.

       AND THE BREWHOUSE NEEDED A BACK WALL. It was a front face, a
       return and a roof plate, which is every other building in this
       file and correct for every one of them because the front hides
       the back. As an island on a block it has open ground behind it,
       and from a rotated camera you looked straight through it.

       WHAT CAME FROM THE PREVIOUS PASS. The still was at b 4, outside
       the wall on the footway, in front of a flat panel standing in for
       a window -- a pot of r 30 centred on 4 occupies b -26..34. The
       census did not count it: cTodo said "1 pavement prop", which was
       the barrel at a = W + 28, because the prop test asks whether the
       CENTRE b is past 8. Third census gap of the session and the only
       one that is a wrong MEASURE rather than a missing primitive.

       A WINDOW WAS DRAWN ACROSS THE DOOR, thirteenth consecutive shop,
       and the window itself was a flat panel. fTodo's board put its far
       end on screen-a 231 against a return at 230 with the lettering
       behind its own backing. zTodo 1.11 goes with the height: H 420 is
       2.5 storeys, which is what a still two storeys tall stands in. */
    const wall = '#6b4a2e', trim = '#e0c88a', H = 420, LOT = 1048.8;
    const inner = '#231710', copper = '#b87333', glass = 'rgba(150,132,104,.34)';
    const BA0 = 180, BA1 = 660, FB = -40, BB = -660;    // the brewhouse island
    const YW0 = 24, YW1 = LOT - 24, YB = -20, YBK = -LOT + 24;
    const BAYS = [[216,376],[466,626]];
    const FH = 72;
    const yWall = (a0,a1,b0,b1) => {
      box(a0, a1, b0, b1, 0, FH, shade(wall,.9), shade(wall,.66), shade(wall,.54));
      slab(a0-3, a1+3, FH, FH+8, b1+3, b0-3, shade(wall,1.05), null, shade(wall,1.2));
    };

    /* ---- the ground: pavement all round, gravel over the whole yard ---- */
    T(0, LOT, -LOT, 0, 0.4, '#b3a894');
    T(YW0, YW1, YBK, YB, 0.6, '#9a917f');

    /* ---- the far half of the perimeter, before the building ----
       Only the back and left runs go here. The rest of the wall is
       NEARER than the brewhouse and has to be painted after it: the
       street wall sits at b -20 with a depth key near 1000, against a
       building whose deepest corner keys -480, and on screen the two
       overlap because screen-a is a - b and 620 of building depth
       carries its mass out to 1280. Drawn with the back wall, the whole
       street frontage of the yard and its gate went behind the building
       and simply were not there. Ninth order-versus-depth fault of the
       session, and the first where the thing that vanished was an
       entrance. */
    yWall(YW0, YW1, YBK, YBK+12);
    yWall(YW0, YW0+12, YBK, YB);
    /* ---- the stock on the BACK run of the circuit, before the building ----
       These sit at b -780..-900, behind the brewhouse's back plane at
       -660, and on screen they land at a - b of 1100..1330 against a
       building whose roof reaches 1280. Drawn with the rest of the yard
       they were painted on top of the roof: crates stacked in mid-air
       over the slates. The yard has to be split at the building the way
       the tea house's roof had to be split at its colonnade -- an
       object spanning a circuit is not one item in the queue. */
    for(let k=0;k<4;k++)
      box(300+k*3, 430-k*3, -800+k*3, -900+k*3, k*26, k*26+24,
          '#7d6650','#6b5540','#5c4836');
    /* CASKS GO IN DEPTH ORDER, NOT IN THE ORDER THEY WERE TYPED. A
       group of them written [540,-780], [572,-780], [556,-816] has keys
       of a + b at -240, -208 and -260, so the last one listed is the
       FARTHEST and was painted over the two in front of it. Two casks
       standing a few units apart is exactly where this shows: they
       overlap on screen, and whichever is drawn last wins regardless of
       which is nearer. Sorted ascending, here and everywhere else casks
       appear on this shop. */
    const cask = (ca, cb, z0) => {
      cyl(ca, cb, z0, z0+34, 11, '#8a5a34');
      for(const hz of [z0+7, z0+17, z0+27]) plateHoop(ca, cb, hz, 12, '#5c4632', 2);
      plateCircle(ca, cb, z0+34, 11, '#a06a3e', '#75492a', 1.6);
    };
    for(const [ca, cb] of [[540,-780],[572,-780],[556,-816]]
        .sort((u,v) => (u[0]+u[1]) - (v[0]+v[1]))) cask(ca, cb, 0);

    /* ---- the back wall of the brewhouse ---- */
    F(BA0, BA1, 0, H, shade(wall,.86), null, 0, BB);
    F(BA0, BA1, 0, 24, shade(wall,.66), null, 0, BB-0.4);
    for(const wa of [280, 560]){
      F(wa-44, wa+44, 250, 330, shade(wall,1.1), null, 0, BB-0.6);
      F(wa-38, wa+38, 256, 324, '#3f5a68', null, 0, BB-1);
      F(wa-2, wa+2, 256, 324, shade(wall,1.1), null, 0, BB-1.4);
    }

    /* ---- the flanks, one body called twice ---- */
    const flank = (ra, sgn) => {
      const q = (b0,b1,z0,z1,col,o) => poly([P(ra+o*sgn,b0,z0),P(ra+o*sgn,b1,z0),
                                             P(ra+o*sgn,b1,z1),P(ra+o*sgn,b0,z1)], col);
      /* THE FLANK PLANE ITSELF, which was missing. flank() drew a
         plinth, piers, blind bays and a door -- every feature OF a wall
         and no wall. On a shop in a run body() supplies the return with
         S() and the helper only decorates it; this building rolls its
         own shell and the S() call went with the rewrite, so the piers
         and the roller doors were standing in mid-air with the yard
         visible between them. Every other elevation on this shop starts
         with its own plane; the flank had to as well. */
      q(FB, BB, 0, H, shade(wall,.78), 0);
      q(FB, BB, 0, 30, shade(wall,.68), 0.6);
      for(const bb of [FB-50, FB-180, FB-310, FB-440, BB+26]){
        q(bb, bb-28, 30, 396, shade(wall,1.08), 1.2);
        q(bb+5, bb-33, 396, 414, shade(trim,.86), 2.0);
      }
      for(const b0 of [FB-88, FB-218, FB-348]){
        q(b0, b0-84, 240, 370, shade(wall,.88), 0.9);
        q(b0-8, b0-76, 252, 356, '#3f5a68', 1.4);
        q(b0-8, b0-76, 252, 260, shade(trim,.7), 1.7);
      }
      q(FB-110, FB-166, 0, 116, '#2b2119', 1.0);                       // personnel door
      q(FB-116, FB-160, 0, 110, shade(trim,.55), 1.4);
      q(FB-122, FB-154, 120, 128, trim, 1.9);
      q(FB+4, BB-4, 420, 436, trim, 2.4);
    };
    flank(BA0 - 0.5, -1);

    /* ---- the brewhouse ---- */
    F(BA0, BA1, 0, H, wall, null, 0, FB);
    F(BA0, BA1, 0, 24, shade(wall,.78), null, 0, FB+0.4);
    T(BA0, BA1, BB, FB, H+0.4, '#3d2a1a');
    slab(BA0-6, BA1+6, H, H+16, FB+6, BB-6, shade(wall,.7));           // cornice

    /* ---- the tap room, on the b -40 face ---- */
    slab(BA0, BA1, 0, 150, FB+6, FB, shade(wall,1.2), null, trim);
    BAYS.forEach(([x0,x1], n) => {
      F(x0, x1, 24, 140, inner, null, 0, FB-34);
      ctx.save();
      poly([P(x0,FB,140),P(x1,FB,140),P(x1,FB,24),P(x0,FB,24)]);
      ctx.clip();
      slab(x0+6, x1-6, 24, 30, FB-10, FB-44, shade(wall,.86), null, shade(wall,1.0));
      if(n === 0){
        const sa = 296, sb = FB-38;
        cyl(sa, sb, 22, 26, 24, '#3a2e26');
        F(sa-13, sa+13, 24, 38, '#e8a13a', null, 0, sb-24.4);
        cyl(sa, sb, 30, 84, 30, copper);
        for(const hz of [42, 60, 78]) plateHoop(sa, sb, hz, 31, '#98561f', 2.5);
        ball(sa, sb, 84, 28, '#c9803a', '#d89a52');
        cyl(sa, sb, 106, 116, 8, copper);
        tube(sa, sb, 110, sa+42, sb, 102, 5, copper);
        cyl(sa+48, sb, 52, 104, 9, '#a8672c');
        plateCircle(sa+48, sb, 104, 9, '#c9803a');
      } else {
        cyl(516, FB-38, 30, 96, 30, '#8a7a58');
        for(const hz of [44, 62, 80]) plateHoop(516, FB-38, hz, 31, '#5c4632', 2.5);
        plateCircle(516, FB-38, 96, 30, '#9a8a66', '#75674a', 2);
        for(let r=0;r<2;r++) for(let c=0;c<3;c++){
          const ca = 566 + c*22, cz = 30 + r*38, cb = FB-24 - r*8;
          cyl(ca, cb, cz, cz+34, 11, '#8a5a34');
          for(const hz of [cz+7, cz+17, cz+27]) plateHoop(ca, cb, hz, 12, '#5c4632', 2);
          plateCircle(ca, cb, cz+34, 11, '#a06a3e', '#75492a', 1.6);
        }
      }
      ctx.restore();
      F(x0, x1, 24, 140, glass, null, 0, FB+0.4);
      for(let k=1;k<5;k++)
        F(x0 + (x1-x0)*k/5 - 3.4, x0 + (x1-x0)*k/5 + 3.4, 24, 140, shade(wall,1.25), null,0, FB+1.2);
    });
    /* the tap-room door, hand-rolled: the frontage is 40 back and
       shopDoor draws at b 0 */
    F(384, 458, 0, 150, shade(wall,1.14), null, 0, FB+6.4);
    F(390, 452, 0, 120, '#2b2119', null, 0, FB+6.8);
    for(const [d0,d1] of [[394,419],[423,448]]){
      F(d0, d1, 4, 112, trim, shade(trim,.7), 1.6, FB+7.2);
      F(d0+3, d1-3, 62, 106, shade(wall,.8), null, 0, FB+7.6);
    }
    F(390, 452, 122, 144, 'rgba(200,214,224,.7)', null, 0, FB+7.2);

    slab(BA0, BA1, 156, 200, FB+6, FB, shade(wall,1.25), null, trim);  // fascia
    F(BA0+24, BA1-24, 166, 190, trim, null,0, FB+6.6);
    for(let i=0;i<5;i++){                                              // upper floor
      const c = 232 + i*88;
      slab(c-38, c+38, 214, 314, FB+3, FB-13, shade(wall,1.1), null, trim);
      F(c-30, c+30, 222, 306, '#3f5a68', null, 0, FB-14);
      F(c-30, c+30, 222, 306, 'rgba(126,108,84,.72)', null, 0, FB+0.4);
      F(c-2, c+2, 222, 306, shade(wall,1.1), null,0, FB+1.4);
      F(c-30, c+30, 260, 266, shade(wall,1.1), null,0, FB+1.4);
    }

    /* ---- the near flank, and the loading dock on it ----
       A deck at z 34, a dray's bed height, with three roller shutters
       over it and a ramp at each end so the cartway still reads as
       drivable ground rather than a step. */
    flank(BA1 + 0.5, 1);
    const RA = BA1 + 1;
    for(let i=0;i<3;i++){
      const d0 = -150 - i*150, d1 = d0 - 100;
      poly([P(RA,d0+10,26),P(RA,d1-10,26),P(RA,d1-10,196),P(RA,d0+10,196)], shade(wall,1.1));
      poly([P(RA+0.6,d0,34),P(RA+0.6,d1,34),P(RA+0.6,d1,186),P(RA+0.6,d0,186)], '#2b2119');
      for(let k=0;k<9;k++)
        poly([P(RA+1,d0-3,42+k*17),P(RA+1,d1+3,42+k*17),
              P(RA+1,d1+3,52+k*17),P(RA+1,d0-3,52+k*17)], shade('#4a3a2a',1.1));
    }
    slab(BA1, BA1+66, 0, 34, -110, -620, '#6b5540', null, '#7d6650');
    for(let k=0;k<10;k++)
      poly([P(BA1+2, -120-k*50, 34.4),P(BA1+64, -120-k*50, 34.4),
            P(BA1+64, -124-k*50, 34.4),P(BA1+2, -124-k*50, 34.4)], '#5c4836');
    for(const [r0,r1] of [[-110,-64],[-620,-666]])
      poly([P(BA1,r0,34),P(BA1,r1,0),P(BA1+66,r1,0),P(BA1+66,r0,34)], '#5c4836');
    for(let i=3;i>=0;i--) cask(BA1+33, -180-i*120, 34);   // far to near along the deck

    /* ---- the stock on the NEAR run, and then the near wall ---- */
    for(const [ca, cb] of [[900,-700],[932,-700],[840,-420],[872,-420],[856,-456]]
        .sort((u,v) => (u[0]+u[1]) - (v[0]+v[1]))) cask(ca, cb, 0);
    yWall(YW1-12, YW1, YBK, YB);                                       // the right run
    /* ---- the street wall, and the circuit has a gate at EACH end ----
       The left return of the yard was closed with a plain wall run and
       it read as a wall that stopped: the whole left arm of the circuit
       is behind the brewhouse on screen, so all that showed of it was a
       stub at the pavement with nothing leading anywhere. It is not a
       wall problem, it is a plan problem -- a cartway that goes in one
       gate and has no way out is a dead end, and a dray would have to
       reverse the length of the block.

       Two gates: the cart gate on the wide side, where the dock is, and
       a second on the narrow one. In at one, round the circuit, out at
       the other -- which is what the wrap was for, and it puts two of
       the landmark's four entrances on the same street as the tap room
       rather than leaving them on faces the camera never shows. */
    for(const [a0,a1] of [[672, 866],[994, YW1]]) yWall(a0, a1, YB-12, YB);
    const gate = (g0, g1) => {
      for(const ga of [g0, g1]){
        cyl(ga, YB-6, 0, 116, 10, shade(wall,.62));
        plateCircle(ga, YB-6, 116, 10, shade(wall,.9));
      }
      slab(g0-12, g1+12, 116, 140, YB+3, YB-15, trim, null, shade(trim,1.1));
      F(g0, g1, 122, 134, shade(wall,1.2), null, 0, YB+3.6);
    };
    gate(866, 994);
    gate(36, 156);

    if(state.roof) for(const [aa,bb] of [[260,-180],[400,-360],[560,-220],[330,-560]]){
      cyl(aa, bb, H, H+56, 13, '#8a8272');
      cyl(aa, bb, H+56, H+66, 18, '#9a9282');
      plateCircle(aa, bb, H+66, 18, '#a8a08e', '#7d7566', 2);
    }
  }
},
{
  name:'Print works', tall:true, ww: 1048.8, dd: 620,
  wTodo:'a whole block edge -- five packing slots, and the packer places none of them',
  head:'Whole-edge works: presses behind the glass, north-light hall behind',
  tags:['whole block edge','builds to the line','north-light sawtooth roof','presses behind glass','goods door','no pavement props'],
  desc:'A works taking a whole block edge and building to the line, because a print works has an office on the street and a machine hall behind it. Three tall press windows, an office entrance and a goods door on the frontage; a sawtooth north-light roof over the hall, which is the form that says machine shop before anything else does.',
  draw(p){
    /* ============ WHOLE EDGE, ON THE LINE -- NOT A LANDMARK =========
       Sir asked for a whole block, and the choice is the same one the
       Playhouse and the Brewery made differently. A brewery works in a
       yard and got block:true. A print works does not: paper comes in
       at a goods door and printed matter goes out of one, both straight
       off the street, and the machine hall behind wants to be BUILDING
       rather than open ground. So this is the block WIDTH case, like
       the Playhouse -- ww 1048.8, dd 620, no yard, no setback.

       Worth being explicit that these are now three different answers
       to "make it a whole block", and the question that separates them
       is what the building does at its own front door: a marquee that
       overhangs the footway (Playhouse, width), a cartway a dray turns
       on (Brewery, landmark), a goods door in the frontage (this).

       THE ROOF IS THE POINT. A north-light sawtooth -- a long shallow
       slope up to each ridge and a short steep glazed face dropping
       back -- is what a machine hall looks like from outside, and there
       is nothing like it in this file. Six bays of it over the hall,
       drawn far to near so each glazed face sits in front of the slope
       behind it.

       cTodo WAS FOUR PROPS AND SIXTY-SIX PAST THE FRONTAGE, all of it
       one object: the newsprint roll at a = W + 34 with r 32 ran a
       242..306 on a shop 230 wide, so the whole roll and its plate were
       outside. The roll and the ink drums are inside the works now,
       which is where a works keeps its paper.

       A WINDOW WAS DRAWN ACROSS THE DOOR, fourteenth consecutive shop.
       F(W*0.82, W-14, 54, 94) ran a 188.6..216 against an opening at
       158.8..225. The press rollers were faceCircle at r 13, so 26 wide
       by 39 tall -- ninth ZSCALE instance -- and the clock the same, at
       b -10 inside the wall besides.

       zTodo 1.05 goes with the width: H 176 was one storey drawing a
       works. At 336 the front range is 2.00 and the hall roof rises to
       404 behind it.

       fTodo: slab(6, W-6, 128, 158, -1, -9) put its far end on screen-a
       233 against a return at 230, with the lettering at -9.5 behind
       the board's own -9 backing. The bands follow the Fabric shop:
       0..WW at b 4..0, full width because they are bounded by the
       terrace, and bBack 0 so none of them paints its end face onto the
       flank. */
    const wall = '#4a5259', trim = '#e8ddc8', H = 336, WW = 1048.8, DD = 620;
    const inner = '#1c2227', glass = 'rgba(123,143,156,.40)';
    const BAYS = [[240,420],[450,630],[660,840]];
    body(wall, trim, H, WW, DD);
    T(0, WW, -DD, 0, H+0.4, '#333b41');                 // roof, over body's pale plate

    /* ---- the north-light hall behind the front range ----
       Bays of 64 in b: a long slope rising 72 to the ridge, then a
       short glazed face dropping straight back. Far bay first, so each
       glazed face is painted in front of the slope behind it. */
    for(let i=5;i>=0;i--){
      const bN = -232 - i*64, bF = bN - 64;
      /* THE SAWTOOTH SITS ON THE ROOF, NOT THROUGH IT. Written at
         z 300..372 its eaves were 36 BELOW the plate at 336 and 50
         below the parapet, so the hall's glazing started underneath its
         own roof and only survived because the plate is painted first.
         340..412 puts the eave 4 clear of the plate. */
      poly([P(20,bF,340),P(WW-20,bF,340),P(WW-20,bN,412),P(20,bN,412)], shade(wall,.86));
      for(let k=1;k<7;k++){
        const t = k/7, bb = bF + (bN-bF)*t, zz = 340 + 72*t;
        poly([P(20,bb,zz),P(WW-20,bb,zz),P(WW-20,bb,zz-3),P(20,bb,zz-3)], shade(wall,.74));
      }
      poly([P(20,bN,412),P(WW-20,bN,412),P(WW-20,bN,340),P(20,bN,340)], 'rgba(150,178,196,.66)');
      for(let k=1;k<9;k++){
        const aa = 20 + (WW-40)*k/9;
        poly([P(aa-4,bN+0.4,412),P(aa+4,bN+0.4,412),P(aa+4,bN+0.4,340),P(aa-4,bN+0.4,340)], shade(wall,.9));
      }
      poly([P(14,bN+4,412),P(WW-14,bN+4,412),P(WW-14,bN-4,418),P(14,bN-4,418)], shade(wall,1.1));
    }
    slab(0, WW, H, H+14, 4, 0, shade(wall,1.35));       // parapet over the front range

    /* ---- one shopfront band, every opening cut out of it ---- */
    slab(0, WW, 0, 150, 4, 0, shade(wall,1.2), null, trim);
    BAYS.forEach(([x0,x1], n) => {
      reveal(x0, x1, 24, 140, 32, inner);
      ctx.save();
      poly([P(x0,0,140),P(x1,0,140),P(x1,0,24),P(x0,0,24)]);
      ctx.clip();
      const c = (x0+x1)/2;
      slab(x0+6, x1-6, 24, 30, -10, -38, shade(wall,.9), null, shade(wall,1.05));
      box(c-72, c+40, -34,-12, 30, 96, '#39424a','#2f3840','#262d33');   // the press frame
      const ring = (a,b,z,r,m) => { const q=[];
        for(let i=0;i<(m||24);i++){ const t=Math.PI*2*i/(m||24);
          q.push(P(a + r*Math.cos(t), b, z + r*Math.sin(t)/ZSCALE)); }
        return q; };
      for(let i=0;i<3;i++){                                             // its rollers
        poly(ring(c-56+i*28, -11, 62, 13), '#5a646c');
        poly(ring(c-56+i*28, -10.6, 62, 4), '#8d979f');
      }
      box(c+48, c+70, -30,-14, 30, 116, '#3f4850','#4a5259','#333b41');  // a paper stand
      cyl(c+59, -22, 116, 150, 17, '#e4ddcb');                           // the reel on it
      plateCircle(c+59, -22, 150, 17, '#f2ece0', '#c9c2b0', 2);
      F(c-72, c+40, 40, 46, '#d8d2c4', null,0, -11.4);                   // the web running through
      ctx.restore();
      glaze(x0, x1, 24, 140, null, glass);
      for(let k=1;k<5;k++)
        F(x0 + (x1-x0)*k/5 - 3.4, x0 + (x1-x0)*k/5 + 3.4, 24, 140, shade(wall,1.15), null,0, 0.8);
    });

    /* ---- the office entrance, and the goods door at the far end ---- */
    shopDoor(120, wall, trim, null, WW);                // a 86.88..153.12
    F(886, 1016, 0, 216, shade(wall,1.06), null, 0, 4.6);
    F(894, 1008, 6, 208, '#22282d', null, 0, 5);
    for(let k=0;k<11;k++) F(898, 1004, 14+k*17, 26+k*17, shade('#3a444c',1.1), null, 0, 5.4);
    F(880, 1022, 216, 232, shade(wall,1.3), null, 0, 5.6);

    /* ---- fascia and the upper floor ---- */
    slab(0, WW, 156, 200, 4, 0, shade(wall,1.25), null, trim);
    F(30, WW-30, 166, 190, trim, null,0, 4.6);
    for(let i=0;i<7;i++){
      const c = 84 + i*146;
      slab(c-46, c+46, 214, 314, 1, -13, shade(wall,1.1), null, trim);
      reveal(c-38, c+38, 222, 306, 16, shade(wall,.46));
      glaze(c-38, c+38, 222, 306, null, 'rgba(110,128,140,.80)');
      for(let k=1;k<4;k++) F(c-38 + 76*k/4 - 2, c-38 + 76*k/4 + 2, 222, 306, shade(wall,1.1), null,0, 1.4);
      F(c-38, c+38, 260, 266, shade(wall,1.1), null,0, 1.4);
    }

    if(state.roof){
      /* ---- THE CHIMNEY MOVES OFF THE GLAZING ----
         At a 940, b -520 it stood on screen-a 1460, inside the
         sawtooth's own 252..1645, so it crossed four bays of roof
         glass. It was in FRONT of them and correct to be -- its key of
         420 beats the glazing's 228 at that point -- but a flue drawn
         across a roof light reads as a mistake whether or not the depth
         is right. The only ground on this roof clear of the sawtooth in
         screen terms is a - b below 252, so the chimney goes to the
         near left corner where a boiler house belongs anyway.

         And the plant: the flat strip between the parapet and the first
         bay had nothing on it. Two units with condenser fans, which are
         nearer than the glazing behind them and so are drawn after it,
         far to near on the a + b key. */
      cyl(86, -120, H, H+180, 22, '#5a4038');           // the boiler chimney
      cyl(86, -120, H+180, H+196, 27, '#6a4c42');
      plateCircle(86, -120, H+196, 27, '#7a5a4e', '#4e3730', 2);
      for(const [ba, bb] of [[300, -150],[600, -110]]){
        box(ba, ba+130, bb-70, bb, H, H+30, '#8f969d','#787f86','#697077');
        for(const fa of [ba+34, ba+96]){
          cyl(fa, bb-35, H+30, H+38, 20, '#7d838a');
          plateCircle(fa, bb-35, H+38, 20, '#a8aeb4', '#6a7076', 2);
        }
      }
    }
    kerb(p,'none');
  }
},
{
  name:'Sweet shop', head:'Barley-twist columns, jars behind the glass, striped canopy',
  tags:['twisted columns','lidded jars on shelves','candy stripes','tiny scale','pastel'],
  desc:'The barley twist is a real cylinder with the stripe wrapping it, standing proud of the wall the way a pilaster does, and the jars are turned glasses with lids sitting on shelves inside the window rather than on the pavement.',
  draw(p){
    /* ============ THE JARS WERE ON THE PAVEMENT ============
       The shelves were slab(26, WW*0.58, z-3, z, -1, 16) -- bFront -1
       and bBack +16 -- so the "back" of each shelf was seventeen units
       IN FRONT of its own front face, and the jars standing on them sat
       at b 6, outside the wall. A row of glass jars on the footway of a
       sweet shop is a row of things to knock over. Same inversion as
       the TV repair cabinets, which had bFront -1 and bBack +14.

       AND NO cTodo TO SAY SO. The jars are cyl at ground-adjacent z but
       centred on b 6, and the prop test asks whether the CENTRE b is
       past 8 -- so fifteen glass jars on the pavement counted as
       nothing. Fourth census gap of the session, and the second of the
       wrong-measure kind after the Brewery's still. The test wants the
       object's EXTENT.

       THE BARLEY TWISTS WERE AT b -6, six units inside the masonry.
       Twelfth time this session. They are pilasters: they stand proud
       of the wall at b 6, flanking the window.

       A WINDOW WAS DRAWN ACROSS THE DOOR, fifteenth consecutive shop.
       F(WW*0.70, WW-20, 52, 90) ran a 137.2..176 against an opening at
       123.7..189.9. And the window was a flat panel, fifteenth.

       fTodo LISTED TWO RETURNS AND THEY WANT DIFFERENT ANSWERS, which
       is the distinction the Fabric shop turned up. The name board at
       slab(6, WW-6, 118, 142, -1, -9) is bounded by the FRONTAGE: it
       stops short of the return, so a back face on screen-a 199 against
       a return at 196 is an object hanging off the building, and it
       needs margin. The canopy band at slab(0, WW, 114, 120, -1, -8) is
       bounded by the TERRACE: it runs wall to wall like a cornice, and
       its +8 is not an overrun but a band leaking its end face onto the
       flank. One wants a margin, the other wants bBack 0. */
    const wall = '#f0dce2', trim = '#c2452e', H = 162, WW = 196;
    const inner = '#5a4148';
    const sweet = ['#e8a13a','#c2452e','#7ac48a','#4aa8c4','#e2c74a','#e2748c'];
    body(wall, trim, H, WW);
    T(0, WW, -D, 0, H+0.4, '#8a3428');                  // roof, over body's trim-red plate
    slab(0, WW, H, H+10, 4, 0, trim);                   // cornice

    /* ---- one shopfront band, both openings cut out of it ---- */
    slab(0, WW, 0, 112, 4, 0, '#fbf3f5', null, trim);
    reveal(16, 106, 22, 96, 22, inner);
    ctx.save();
    poly([P(16,0,96),P(106,0,96),P(106,0,22),P(16,0,22)]);
    ctx.clip();
    for(let r=0;r<3;r++){
      const z = 30 + r*22;
      slab(30, 92, z-3, z, -6, -20, '#d8c0c8', null, '#e8d4da');
      for(let i=0;i<4;i++){
        const ja = 36 + i*16, jb = -10, col = sweet[(r*4+i)%6];
        cyl(ja, jb, z, z+14, 6, col);
        plateCircle(ja, jb, z+14, 6, shade(col,1.2));
        cyl(ja, jb, z+14, z+18, 3.4, '#b9bcc0');
      }
    }
    ctx.restore();
    glaze(16, 106, 22, 96, null, 'rgba(216,192,200,.30)');
    for(let k=1;k<3;k++) F(16 + 90*k/3 - 2.6, 16 + 90*k/3 + 2.6, 22, 96, shade(wall,.82), null,0, 0.8);

    shopDoor(150, wall, '#f8eef0', null, WW);           // a 116.88..183.12

    /* ---- the barley twists, standing proud as pilasters ----
       At b 6 with a shaft of r 6 a column on a 14 comes to screen-a 2
       here and 26 on the mirrored heading, and the far one on 110
       reaches 122 -- inside 0..196 both ways. */
    /* THE CAPS HAVE TO STOP UNDER THE CANOPY, and where that is depends
       on the column's b rather than on the canopy's springing height.
       The canopy runs from z 118 at the wall down to 104 at b 28, so at
       the columns' b 6 its soffit is at 107 -- and a shaft of 116 with
       a cap to 124 pushed straight through the fabric. Shafts to 98 and
       caps to 106 put them one unit under it, which also makes them
       read as carrying it. */
    for(const ca of [14, 110]){
      cyl(ca, 6, 0, 98, 6, '#fbf3f5');
      for(let i=0;i<7;i++){
        const z = 4 + i*13;
        for(let k=0;k<6;k++){
          const t0 = 3*Math.PI/4 - Math.PI*k/6, t1 = 3*Math.PI/4 - Math.PI*(k+1)/6;
          poly([P(ca+6*Math.cos(t0), 6+6*Math.sin(t0), z + k*1.5),
                P(ca+6*Math.cos(t1), 6+6*Math.sin(t1), z + (k+1)*1.5),
                P(ca+6*Math.cos(t1), 6+6*Math.sin(t1), z + (k+1)*1.5 + 5),
                P(ca+6*Math.cos(t0), 6+6*Math.sin(t0), z + k*1.5 + 5)], trim);
        }
      }
      cyl(ca, 6, 98, 106, 9, '#fbf3f5');
      plateCircle(ca, 6, 106, 9, '#fbf3f5', shade(wall,.8), 1.4);
    }

    /* ---- the striped canopy ---- */
    const out = 28;
    for(let i=0;i<9;i++){
      const x0 = 4+(WW-8)*i/9, x1 = 4+(WW-8)*(i+1)/9;
      poly([P(x0,0,118),P(x1,0,118),P(x1,out,104),P(x0,out,104)], i%2 ? '#fbf3f5' : trim);
    }
    poly([P(4,0,110),P(WW-4,0,110),P(WW-4,out,96),P(4,out,96)], shade(trim,.62));
    poly([P(4,out,104),P(WW-4,out,104),P(WW-4,out,96),P(4,out,96)], shade(trim,.8));
    slab(0, WW, 112, 120, 4, 0, shade(trim,.8));        // its rail, bBack 0

    /* ---- fascia ---- */
    slab(0, WW, 126, 150, 4, 0, '#fbf3f5', null, trim);
    F(20, WW-20, 132, 144, trim, null,0, 4.6);

    if(state.roof) box(WW*0.30,WW*0.54,-140,-100,H,H+18,'#9aa0a6','#7d838a','#6a7076');
    kerb(p,'none');
  }
},
{
  name:'Pottery', tall:true,
  head:'Studio: wheel and drying shelves behind tall glass, roof lantern',
  tags:['tall studio glazing','potter\'s wheel','drying shelves','roof lantern','raw brick','bare footway'],
  desc:'A working studio rather than a works: one tall window with the wheel and the drying shelves standing inside it, brick courses over, and a glazed lantern on the roof for the north light a potter actually needs. No industrial stack.',
  draw(p){
    /* ============ IT WAS A KILN WORKS, NOT A STUDIO ============
       At Sir's direction the tall stack goes. It was five tapering
       cylinders climbing 220 above a wall of 154 -- taller than the
       building carrying it -- with four translucent balls of smoke on
       top, and it made the shop read as heavy industry. A studio potter
       has a small electric or bottle kiln in the back and takes its
       light from a roof lantern; the lantern is the thing that says
       studio, and there is nothing else like it in this file.

       WHAT WAS WRONG BESIDES.

       FOUR POTS ON THE NEIGHBOUR. cTodo counted 50 past the frontage:
       they were at a = W + 12 and W + 42 with a belly radius of 13, so
       a 241..285 on a shop 230 wide -- every one of them entirely
       outside. Gone rather than moved; the ware is in the window.

       THE DISPLAY POTS WERE AT b -3, inside the masonry behind a flat
       panel standing in for a window. Thirteenth time this session
       something has been found at the wrong sign of b, and the
       sixteenth flat panel where a window belongs.

       AND THE WINDOW RAN INTO THE DOOR, which is the sixteenth
       consecutive shop but a new form of it: not a panel drawn across
       the opening, the WINDOW ITSELF. F(W*0.50, W*0.78, 26, 102) spans
       a 115..179.4 and shopDoor clamps its opening to 158.8..225, so
       the two overlapped by 20.6. Worth noting because the census I
       keep proposing would catch a panel and miss this -- the test has
       to be any a-span against mid +/- 33.12, not just the ones that
       look like signs.

       zTodo 0.92 on a wall of 154. At 200 it is 1.19, which is what a
       studio wants: one tall window rather than a shop window, because
       the light is the point.

       fTodo: slab(6, W-6, 110, 138, -1, -9) put its far end on screen-a
       233 against a return at 230, with the lettering at -9.5 behind
       the board's own -9 backing. */
    const wall = '#a8654a', trim = '#e0d2b8', H = 200;
    const inner = '#3a241b', clay = ['#c98a4a','#8a6a4a','#b87a52','#a8654a'];
    body(wall, trim, H);
    T(0, W, -D, 0, H+0.4, '#6e422f');                   // roof, over body's pale plate
    slab(0, W, H, H+10, 4, 0, shade(wall,.7));          // cornice
    for(let r=0;r<4;r++) F(0, W, 172+r*7, 175+r*7, shade(wall,.86), null,0, 0.4);   // brick courses

    /* ---- one shopfront band, both openings cut out of it ---- */
    slab(0, W, 0, 130, 4, 0, shade(wall,1.1), null, trim);
    reveal(14, 134, 22, 118, 22, inner);
    ctx.save();
    poly([P(14,0,118),P(134,0,118),P(134,0,22),P(14,0,22)]);
    ctx.clip();
    slab(18, 130, 22, 28, -6, -24, shade(wall,.9), null, shade(wall,1.05));
    /* ---- SIX POTS, NOT TWELVE, AND THE PITCH IS MEASURED ----
       Three shelves of four at a 12 pitch put pots of 14 across on
       centres 12 apart: every one overlapping its neighbour, in a
       window 120 wide that also had to hold a wheel and a stool. A
       drying shelf is meant to look like there is room to lift a pot
       off it.

       Two shelves of three at a 17 pitch leaves 3 of air between pots,
       and the shelf run stops at a 84 so the wheel has the right third
       of the window to itself. The b terms set the ends: at b -20 the
       rack needs 20 of clearance inside each jamb, so 34..84 against a
       window of 14..134; the wheel at b -12 with a pan of r 13 needs
       25, so its centre sits on 108. */
    for(let r=0;r<2;r++){
      const z = 40 + r*38;
      slab(34, 84, z-3, z, -14, -26, '#7a5a44', null, '#8d6c52');
      for(let i=0;i<3;i++){
        const pa = 42 + i*17, col = clay[(r*3+i)%4];
        cyl(pa, -20, z, z+6, 4.5, shade(col,.85));
        ball(pa, -20, z+13, 7, col);
        plateCircle(pa, -20, z+19, 5, shade(col,1.15), shade(col,.8), 1.2);
      }
    }
    /* the wheel: a cast frame, a splash pan, the head, and a pot on it */
    box(96, 120, -20,-6, 22, 48, '#6a5348','#7a6055','#5a463c');
    plateCircle(108, -13, 48, 13, '#8d979f', '#6a7076', 1.6);
    cyl(108, -13, 48, 55, 8, clay[0]);
    ball(108, -13, 64, 12, clay[0]);
    cyl(108, -13, 71, 78, 7, clay[0]);
    plateCircle(108, -13, 78, 8, shade(clay[0],1.15), shade(clay[0],.8), 1.4);
    ctx.restore();
    glaze(14, 134, 22, 118, null, 'rgba(150,138,120,.30)');
    for(let k=1;k<4;k++) F(14 + 120*k/4 - 3, 14 + 120*k/4 + 3, 22, 118, shade(wall,1.2), null,0, 0.8);

    shopDoor(178, wall, trim);                          // a 144.88..211.12

    /* ---- fascia ---- */
    slab(0, W, 136, 164, 4, 0, shade(wall,1.14), null, trim);
    F(24, W-24, 143, 157, trim, null,0, 4.6);

    if(state.roof){
      /* ---- THE ROOF LANTERN, which is what a studio has instead of a
         stack: a raised monitor with its glazing facing the near side,
         a capped roof over it, and a short kiln flue beside it. ---- */
      const LA0 = 46, LA1 = 168, LB0 = -54, LB1 = -142;
      poly([P(LA0,LB0,H),P(LA1,LB0,H),P(LA1,LB0,H+46),P(LA0,LB0,H+46)], 'rgba(160,186,196,.62)');
      for(let k=1;k<6;k++){
        const aa = LA0 + (LA1-LA0)*k/6;
        poly([P(aa-3,LB0+0.4,H),P(aa+3,LB0+0.4,H),P(aa+3,LB0+0.4,H+46),P(aa-3,LB0+0.4,H+46)], shade(wall,.8));
      }
      poly([P(LA1,LB0,H),P(LA1,LB1,H),P(LA1,LB1,H+46),P(LA1,LB0,H+46)], shade(wall,.86));
      poly([P(LA0,LB0,H+46),P(LA1,LB0,H+46),P(LA1,LB1,H+58),P(LA0,LB1,H+58)], shade(wall,.74));
      slab(LA0-6, LA1+6, H+46, H+54, LB0+6, LB0-4, shade(wall,1.2));
      cyl(198, -96, H, H+50, 11, shade(wall,.8));       // the kiln flue, short
      cyl(198, -96, H+50, H+58, 15, shade(wall,.94));
      plateCircle(198, -96, H+58, 15, '#3a2a22', shade(wall,.7), 2);
    }
    kerb(p,'none');
  }
},
{
  name:'Shoe shop', ww: T2*4.4,
  wTodo:'two packing slots',
  head:'Modern sneaker store: full-width glazing, tiered shoe walls',
  tags:['two packing slots','full-width glazing','tiered shoe walls','bold banded fascia','glass entrance','bare footway'],
  desc:'A present-day athletic shoe store: the whole frontage is glass in a dark frame, with the entrance a pair of glass leaves set into it, tiered shoe walls and a bench behind the pane, and a bold banded fascia over the top.',
  draw(p){
    /* ============ A MODERN SHOE STORE, AT SIR'S DIRECTION ==========
       The Cobbler was a 152-wide unit with a boot on a bracket, a work
       bench and worn timber. This is a different trade rather than a
       repair of that one, so it is a rebuild and a rename.

       TWO THINGS TO FLAG RATHER THAN DECIDE QUIETLY.

       FIRST, THE NAME -- CHECKED, AND IT IS SAFE, so the pTodo that
       recorded it comes off. `name` is the only handle a shop has, so a
       rename is the kind of thing that breaks quietly. Searched:
       tpcatalog.ts, api.ts, db.ts, server.ts, game/index.html and
       game-logic.js contain no shop name from this file at all -- not
       Cobbler, not Chandlery, not Locksmith, none of them. There is no
       SHOP_NAMES list anywhere; getPickupShops works off grid nodes,
       not off named bodies.

       WHICH SAYS SOMETHING LARGER THAN THIS RENAME. None of this
       library is wired up yet: fifty polished shop bodies live in labs/
       and the game draws none of them. Every wTodo, cTodo and pTodo in
       this file is debt against a port that has not started -- so
       renames and re-tiering are free right now and will not be once it
       has. Worth settling the naming and the widths deliberately while
       they still cost nothing.

       SECOND, THE PERIOD. Everything else on this street is chapels,
       chandleries, barley-twist sweet shops and gas lamps. A present-day
       sneaker store is not the same century, and one anachronism reads
       as a mistake where a consistent set reads as a style. It is built
       as asked; the question of whether Costa Palma is period or mixed
       is Sir's, and it is worth settling before a second modern shop
       goes in rather than after.

       It is also drawn to be its own thing rather than a copy of a
       particular chain's livery -- broad vertical bands and a plain
       wordmark panel, which is the language of the type rather than any
       one shop's trade dress.

       TWO SLOTS, because the type wants frontage: a sneaker store is a
       wall of product behind one long window, and at 152 -- which is
       what the Cobbler had, the narrowest unit in the file -- there is
       no wall to see.

       cTodo and fTodo both go with the rebuild. The old flags were two
       pavement props, and a board at slab(6, WW-6, 112, 140, -1, -9)
       whose far end came out on screen-a 157 against a return at 152 --
       a +5, the worst proportionally in the file, because the shop was
       so narrow that a 6 margin was all there was. */
    const wall = '#e8e6e2', trim = '#1e1e20', H = 244, WW = T2*4.4;   // 404.8
    const accent = '#d0342c', inner = '#f2f0ec';
    const shoe = ['#d0342c','#2f6fb8','#e8b13a','#3f8f5a','#1e1e20','#e0e0dc'];
    /* ---- ONE SNEAKER, DRAWN AT TWO SIZES ----
       The sign and the stock are the same last: one outline, one sole,
       one notch, scaled. That is worth doing for its own sake -- a shop
       whose sign is a shoe and whose shelves hold something else is a
       shop selling two products -- but it also means the silhouette
       that took five passes to get right only had to be got right once.

       The outline carries the ANKLE NOTCH, which is the whole reason
       the sign reads: the dip between the tongue at dz 60 and the
       collar at 64. On a shelf shoe 18 wide that notch is two pixels,
       and it is still the thing doing the work -- a closed top at any
       size is a hull. */
    const LAST = [[0,16],[4,6],[12,2],[72,2],[86,8],[90,16],[86,26],[78,38],[56,46],
                  [48,60],[40,50],[22,52],[18,64],[6,44]];
    const LSOLE = [[0,16],[4,6],[12,2],[72,2],[86,8],[90,16],[86,24],[12,22],[2,20]];
    const sneaker = (X0, Z0, S, b, up, sl) => {
      const q = pts => pts.map(([x,z]) => P(X0 + x*S, b, Z0 + z*S/ZSCALE));
      poly(q(LAST), up, shade(up,.58), 0.9);
      poly(q(LSOLE), sl);
      poly(q([[22,50],[40,48],[46,58],[24,60]]), '#2a2a2e');
      poly(q([[16,26],[46,33],[43,40],[14,33]]), sl);
    };
    body(wall, trim, H, WW);
    T(0, WW, -D, 0, H+0.4, '#3a3a3e');                  // roof, over body's pale plate
    slab(0, WW, H, H+12, 4, 0, trim);                   // cornice

    /* ---- the whole frontage is one glazed front in a dark frame ---- */
    slab(0, WW, 0, 168, 4, 0, trim);
    /* ---- THE WINDOW STOPS WHERE THE ENTRANCE STARTS ----
       The glazing ran the whole frontage, 16 to 388, and the entrance
       was a dark panel painted on top of it from 272 to 384. So the
       doors had shoe shelves behind them, the window's mullions ran on
       through the door leaves, and the two read as one sheet of glass
       with a rectangle drawn on it. An entrance is a hole in a
       frontage, not a decal on one.

       Window 16..248, a 14 pier, entrance 262..390 in its own recess.
       The pier is what makes them two things; without it the reveal
       jambs of one land on the reveal jambs of the other and neither
       reads. */
    reveal(16, 248, 26, 156, 30, inner);
    ctx.save();
    poly([P(16,0,156),P(248,0,156),P(248,0,26),P(16,0,26)]);
    ctx.clip();
    /* THE TIERED WALLS. At b -22 a shelf needs 22 of clearance inside
       each jamb, so the run is 38..350 against an opening of 16..388 --
       the usable width of a window interior is the opening minus twice
       the depth of what stands in it, which is the rule the Pottery
       shelves were re-set out on. */
    slab(30, 234, 26, 32, -8, -30, shade(wall,.86), null, shade(wall,.96));
    for(let r=0;r<4;r++){
      const z = 46 + r*26;
      slab(38, 226, z-4, z, -14, -30, shade(wall,.78), null, shade(wall,.94));
      for(let i=0;i<8;i++){
        const col = shoe[(r*8+i)%6];
        sneaker(46 + i*23, z, 0.2, -20, col, col === '#e0e0dc' ? '#9a9a9e' : inner);
      }
    }
    box(56, 140, -24,-10, 26, 40, '#6a6a6e','#7a7a7e','#5a5a5e');     // the bench
    /* NO GRAPHIC PANEL. There was a red board on the back wall at
       z 100..150, and the shelf tiers run to 124 -- so three quarters of
       it was behind the stock and what showed was an L of red poking
       out from between two shelves. It read as a fault rather than as
       anything, which is the honest test: if a viewer has to ask what
       an object is, it is not doing the job it was added for. The shoe
       wall is the display and the fascia carries the sign; a poster
       behind both was a third thing competing for the same window. */
    ctx.restore();
    glaze(16, 248, 26, 156, null, 'rgba(150,168,180,.26)');

    /* ---- the entrance: a recessed portal with two glass leaves ----
       Hand-rolled, because shopDoor draws a panelled timber door in a
       masonry surround and this frontage has neither. */
    reveal(262, 390, 0, 156, 18, shade(trim,1.45));
    F(268, 384, 6, 148, 'rgba(150,168,180,.34)', null, 0, -17);
    F(324, 328, 6, 148, shade(trim,1.2), null, 0, -16.6);
    for(const [d0,d1] of [[268,324],[328,384]]){
      F(d0, d0+4, 6, 148, shade(trim,1.35), null, 0, -16.6);
      F(d1-4, d1, 6, 148, shade(trim,1.35), null, 0, -16.6);
      F(d0, d1, 6, 10, shade(trim,1.35), null, 0, -16.6);
      F(d0, d1, 144, 148, shade(trim,1.35), null, 0, -16.6);
      F(d0+8, d1-8, 74, 80, shade(trim,2.2), null, 0, -16.2);          // push bars
    }
    F(258, 394, 152, 168, shade(trim,1.3), null, 0, 4.6);              // the portal head

    /* ---- the fascia, and the winged shoe that is the sign ----
       Sir's point stands: full-width glazing and a wall of product says
       "shop" and not "shoe shop", and a wordmark panel says nothing at
       all at the distance a robot passes at. A trade needs an emblem
       that reads as a silhouette, which is the argument the Locksmith's
       key and the Bike shop's bicycle both settled.

       It goes at a 44..238, over the GLAZING and not over the entrance
       at 272..384 -- the rule that has cost eleven of the sixteen
       across-the-door faults this session, applied to my own sign
       before it is placed rather than after.

       The fascia grew from 34 to 66 to hold it, and H from 214 to 244
       with it. A band sized for lettering will not take a device, and
       shrinking the device to fit the band is how you get an emblem
       nobody can read. */
    slab(0, WW, 172, 238, 4, 0, trim);
    for(let i=0;i<14;i++)
      F(10+i*28, 10+i*28+14, 178, 232, i%2 ? accent : shade(wall,1.02), null, 0, 4.6);
    {
      /* ---- THE SHOE ----
         Five goes, and the last one found the actual fault. It is not
         proportion -- the third attempt had a correct 90 by 56 last in
         true units. It is not flatness either, though extruding helped:
         every emblem that works in this file is a solid or a circle,
         and the Locksmith's key is a prism for the same reason.

         IT IS THE OUTLINE. The silhouette ran from the tongue straight
         across to the heel collar, so the top of the shoe was CLOSED --
         and a closed top on a long low shape is a hull. The one feature
         that says shoe from across a street is the notch: the dip
         between the tongue at the front and the collar at the back,
         with the ankle opening in it. Painting a dark slot on the face
         does not help while the SILHOUETTE has no dip, because at any
         distance the silhouette is all there is.

         So the notch is cut into the prism outline itself -- up the
         tongue to dz 60, down to 50, across, up the collar to 64 -- and
         the top face prism() derives follows it. Everything else is
         detail painted on the near face.

         Proportions still in TRUE units: dz divided by ZSCALE and one
         scale factor, as the Bike shop's frame is. */
      const S = 1.5, X0 = 56, Z0 = 172;
      const up = accent, sole = '#f2f0ec', dk = '#2a2a2e';
      const pt = (dx, dz) => [X0 + dx*S, Z0 + dz*S/ZSCALE];
      const face = (pts, b, col) => poly(pts.map(([x,z]) => {
        const q = pt(x,z); return P(q[0], b, q[1]); }), col);
      for(let k=2;k>=0;k--)                                     // the wing, off the heel
        face([[0, 30+k*5],[-16+k*4, 38+k*6],[-12+k*4, 46+k*6],[8, 38+k*5]],
             5.6, k%2 ? up : sole);
      prism(LAST.map(([x,z]) => pt(x,z)), 6, 26, up, shade(up,.62), shade(up,1.28));
      face(LSOLE, 26.4, sole);
      face([[2,17],[74,17],[86,20],[82,22],[72,20],[6,20]], 26.6, shade(sole,.84));
      face([[68,24],[86,29],[80,40],[64,38]], 26.6, shade(up,.76));     // toe cap
      face([[22,50],[40,48],[46,58],[24,60]], 26.6, dk);                // inside the notch
      face([[24,52],[38,50],[42,56],[26,57]], 26.7, shade(dk,1.6));
      face([[40,44],[52,48],[48,60],[38,55]], 26.9, sole);              // the tongue
      face([[16,26],[46,33],[43,40],[14,33]], 26.8, sole);              // side panel
      for(let k=0;k<3;k++)                                              // laces
        face([[36+k*10, 30+k*4],[48+k*10, 33+k*4],[46+k*10, 38+k*4],[34+k*10, 35+k*4]],
             27.1, sole);
    }

    if(state.roof){
      box(90, 210, -180, -120, H, H+28, '#8f969d','#787f86','#697077');
      for(const fa of [124, 176]){
        cyl(fa, -150, H+28, H+36, 18, '#7d838a');
        plateCircle(fa, -150, H+36, 18, '#a8aeb4', '#6a7076', 2);
      }
    }
    kerb(p,'none');
  }
},
{
  name:'Surf shop', place:'waterfront', ww: T2*4.4, dd: 440,
  wTodo:'two packing slots',
  pTodo:'waterfront only -- the shore, boardwalk and pier exist in game/index.html; the chooser still places by block type',
  head:'Two slots: an open frontage of boards, with the yard wrapping three sides',
  tags:['waterfront only','two packing slots','open frontage, no glass','boards receding into the shop','wrap-around yard','rinse-down and shower'],
  desc:'A surf shop on a double plot: the shop itself takes the middle of the frontage with its front wide open and eight boards standing back into it, and the working yard wraps round three sides -- an empty rack and a rinse-down on the near arm, stores across the back, and a way through on both.',
  draw(p){
    /* ============ TWO SLOTS AND A YARD THAT RETURNS ============
       At Sir's direction. The shop was one slot with its whole frontage
       given to the opening, which left nowhere for the part of a surf
       shop that is not retail: boards get racked, rinsed, waxed and
       stored, and none of that happens behind the counter.

       WHICH BLOCK TREATMENT THIS IS NOT. It is not a landmark -- ww is
       T2*4.4, two slots, not a whole edge -- and it does not build to
       the line either. The building sits in the MIDDLE of its plot at
       a 96..300 with the yard wrapping past both ends and across the
       back, which is a fourth case: a shop on a lot rather than a shop
       in a terrace. The Brewery is the same idea at five slots; this
       is the smallest plot it works on, because at one slot the arms
       would be narrower than the gate.

       The arms are open to the street rather than gated. A cartway
       needs a gate; a board yard needs a way in with a board under your
       arm, and two open ends make the wrap a route rather than a pen.

       WHAT CAME FROM THE PREVIOUS PASSES. The counter was inside out --
       bFront -1 and bBack +20, so its back was twenty-one units in
       front of its own front face and the crates on it stood on the
       paving. The boards were at b -6..-20, inside the masonry, drawn
       as stroked quadratics. The hammock lapped to screen-a -20. The
       shutter drum, the palm, the deck and the mural all went the same
       way: each was there to justify an idea rather than because the
       elevation wanted it.

       fTodo was the terrace-bounded kind: slab(0, W, H-24, H-6, -1, -7)
       runs wall to wall like a cornice, so its +7 wanted bBack 0 rather
       than a margin. */
    const wall = '#5fbcc4', trim = '#f4ecd6', H = 180, WW = T2*4.4, DD = 440;
    const inner = '#1d3a3e', sand = '#c9b48e';
    const board = ['#f4ecd6','#e8a13a','#e2748c','#7ac48a'];
    /* ---- THE SHOP FRONTS THE LINE, FB 0 ----
       It was set back to b -28 and that broke the window outright:
       reveal(), glaze() and shopDoor() all draw at b 0, so the opening
       and the door were floating twenty-eight units in front of the
       wall they belong to, while the clip path was at the wall. That is
       the setback gap this file already records -- the Tea house, the
       Bathhouse, the Chapel and the Nursery hut all roll their own
       openings for it -- and I walked into it while moving the building
       off the frontage line.

       A setback is not what this shop needed anyway. The yard wraps
       past the ENDS and the back; the shop itself is a shopfront and
       belongs on the street. FB 0 puts it there and the kit works. */
    const BA0 = 96, BA1 = 300, FB = 0, BB = -296;      // the shop, mid-plot, on the line
    const YW0 = 20, YW1 = WW - 20, YBK = -DD + 20;      // the yard round it
    const FH = 46;
    const yWall = (a0,a1,b0,b1) => {
      box(a0, a1, b0, b1, 0, FH, shade(wall,.86), shade(wall,.64), shade(wall,.52));
      slab(a0-3, a1+3, FH, FH+7, b1+3, b0-3, shade(wall,1.08), null, shade(wall,1.22));
    };

    /* ---- ground, and the far half of the perimeter ----
       Only the back and the far arm go before the building. The near
       arm's fence sits at b -12 with a depth key near 380 against a
       building whose deepest corner keys -196, so it is far nearer and
       has to be painted after -- the Brewery's lesson, where the whole
       street frontage of the yard went behind the building because it
       was drawn with the back wall. */
    T(0, WW, -DD, 0, 0.4, '#cfc6b2');
    T(YW0, YW1, YBK, -12, 0.6, '#b8ae98');
    yWall(YW0, YW1, YBK, YBK+12);
    yWall(YW0, YW0+12, YBK, -12);

    /* ---- stock on the back run, before the building ---- */
    for(let k=0;k<4;k++)
      box(150+k*4, 250-k*4, YBK+26+k*3, YBK+96+k*3, k*20, k*20+18,
          '#8d7a5e','#7a6a52','#665846');

    /* ---- the shop ---- */
    F(BA0, BA1, 0, H, wall, null, 0, FB);
    F(BA0, BA1, 0, 20, shade(wall,.76), null, 0, FB+0.4);
    F(BA0, BA1, 0, H, shade(wall,.8), null, 0, BB);          // its back wall
    {
      const o = P(0,FB,0), pa = P(1,FB,0);
      S((pa.y - o.y) > 0 ? BA1 : BA0, BB, FB, 0, H, shade(wall,.72));
      S((pa.y - o.y) > 0 ? BA0 : BA1, BB, FB, 0, H, shade(wall,.66));
    }
    slab(BA0-6, BA1+6, H, H+10, FB+6, BB-6, trim);          // cornice
    /* THE ROOF GOES AFTER THE CORNICE, not before. slab()'s first
       colour is its TOP face, so a cornice run round the whole
       footprint paints a cream plate over the entire roof -- which is
       what it did, and at 216 by 274 it was the largest and brightest
       thing on the shop. Laying the roof over it afterwards leaves the
       cornice showing as the edge band it is meant to be. */
    T(BA0-6, BA1+6, BB-6, FB+6, H+10.4, '#2e7a80');

    /* ---- the frontage: one opening, eight boards running back ----
       The clip is in SCREEN-a, not in a: a board of half-width 11 sits
       on a - b and has to stay inside 106..200, so the run has 72 of
       screen and eight boards is a step of 9, half a board's width. */
    slab(BA0, BA1, 0, 130, FB+6, FB, shade(wall,1.12), null, trim);
    reveal(106, 200, 18, 112, 92, inner);
    ctx.save();
    poly([P(106,FB,112),P(200,FB,112),P(200,FB,18),P(106,FB,18)]);
    ctx.clip();
    for(let i=7;i>=0;i--){
      const ba = 115, bb = FB - 6 - i*9, S = 0.98, Z0 = 19;
      const col = shade(board[i%4], 1 - i*0.062);
      const qq = pts => pts.map(([x,z]) => P(ba + x*S, bb, Z0 + z*S/ZSCALE));
      poly(qq([[11,0],[19,16],[22,50],[19,84],[11,100],[3,84],[0,50],[3,16]]),
           col, shade(col,.66), 1.2);
      poly(qq([[11,6],[13,50],[11,92],[9,50]]), shade(col,.84));
      poly(qq([[7,2],[15,2],[15,8],[7,8]]), shade(col,.62));
      poly(qq([[9,60],[13,60],[13,74],[9,74]]), shade(col,.72));
    }
    ctx.restore();
    shopDoor(250, wall, trim, null, WW);                    // a 216.88..283.12
    slab(BA0, BA1, 136, 164, FB+6, FB, shade(wall,1.2), null, trim);
    F(BA0+18, BA1-18, 142, 158, trim, null,0, FB+6.6);

    /* ---- the near arm: an empty rack, a rinse trough and a shower ----
       NO BOARDS OUT HERE, at Sir's direction. There were five on the
       near rack and four across the back, and they were competing with
       the eight in the window -- which are the ones lit, framed and
       receding, and the reason the shop reads at all. Stock in two
       places at once halves the value of both, the same way the Music
       shop's horn competed with its own name board.

       The rack stays and stays empty, which is what a rack outside a
       surf shop mostly is: somewhere to lean a board while you rinse
       it, not a second shop window. */
    for(const rb of [-36, -116]) cyl(316, rb, 0, 96, 4, shade(wall,.6));
    poly([P(316,-36,92),P(316,-116,92),P(316,-116,86),P(316,-36,86)], shade(wall,.6));
    poly([P(316,-36,54),P(316,-116,54),P(316,-116,48),P(316,-36,48)], shade(wall,.6));
    box(330, 386, -170, -230, 0, 18, sand, shade(sand,.8), shade(sand,.66));
    cyl(352, -260, 0, 118, 5, shade(wall,.62));             // the shower
    tube(352, -260, 114, 352, -282, 114, 3, shade(wall,.62));
    plateCircle(352, -282, 110, 7, shade(wall,.9));

    /* ---- the near perimeter, last ---- */
    yWall(YW1-12, YW1, YBK, -12);

    if(state.roof){
      box(150, 236, -140, -86, H, H+26, '#8f969d','#787f86','#697077');
      for(const [fa, fb] of [[172, -126],[214, -100]].sort((u,v) => (u[0]+u[1]) - (v[0]+v[1]))){
        cyl(fa, fb, H+26, H+34, 17, '#7d838a');
        plateCircle(fa, fb, H+34, 17, '#a8aeb4', '#6a7076', 2);
      }
    }
    kerb(p,'none');
  }
},
{
  name:'Forge', tall:true, ww: T2*6.6, dd: 420,
  wTodo:'three packing slots',
  head:'Triple-wide smithy: the fire, the hood and the anvil inside an open bay',
  tags:['three packing slots','open smithy bay','hood and stack','glowing hearth','round horseshoe','bare footway'],
  desc:'A working smithy taking three slots: one wide open bay with the hearth, the hood, the anvil and the tool rack standing inside it, a counter window for finished work, and the stack carrying up through the roof.',
  draw(p){
    /* ============ THE WHOLE SMITHY WAS ON THE PAVEMENT ============
       F(12, W*0.70, 0, 110) at b +1 was a flat dark rectangle on the
       OUTSIDE of the wall -- eighteenth flat panel where an opening
       belongs -- and then the hearth, the hood, the tool rack and the
       stack were all built at b 2..34, in FRONT of it. So a forge fire
       burned on the footway with a painted black rectangle behind it.
       The tag says "open front", and an open front is an opening: a
       bay you can see into, not a dark shape you cannot.

       cTodo COUNTED 4 PROPS AND 52 PAST THE FRONTAGE, and that is the
       anvil: block at a = W + 14..W + 52 and the anvil itself on
       W + 33, so both were entirely on the neighbour's ground. An anvil
       belongs in the shop -- it is the one thing a smith does not leave
       out overnight -- so it stands inside the bay now and cTodo goes.

       THE HORSESHOE WAS AN ELLIPSE AND IT WAS IN THE WALL. faceT()
       installs ZSCALE in the z basis, so a shoe of radius 17 came out
       34 wide by 51 tall; and hb -6 put it six units inside the
       masonry. Tenth ZSCALE circle of the session and the fifteenth
       thing at the wrong sign of b.

       A WINDOW WAS DRAWN ACROSS THE DOOR, eighteenth consecutive shop.
       F(W*0.80, W-14, 54, 94) ran a 184..216 against an opening at
       158.8..225.

       THREE SLOTS at Sir's direction: ww = T2*6.6, the Fire station's
       tier. A smithy is a shed with a fire in it and needs the width to
       show the fire, the anvil and the work at once -- at 230 the hood
       alone took a third of the frontage. H 164 -> 280, because the
       hood has to clear a standing man and the stack has to clear the
       hood.

       fTodo: slab(6, W-6, 118, 148, -1, -9) put its far end on screen-a
       233 against a return at 230, with the lettering at -9.5 behind
       the board's own -9 backing. */
    const wall = '#4a4238', trim = '#c9a24a', H = 280, WW = T2*6.6, DD = 420;
    const inner = '#160f0b', iron = '#3f464c';
    body(wall, trim, H, WW, DD);
    T(0, WW, -DD, 0, H+0.4, '#332d26');                 // roof, over body's pale plate
    slab(0, WW, H, H+12, 4, 0, shade(wall,1.3));        // cornice
    slab(0, WW, 0, 170, 4, 0, shade(wall,1.1), null, trim);

    /* ---- the open bay: hearth, hood, anvil, rack ----
       Ninety deep, and the interior is set out on that: at b -d an
       object needs a - d >= 40 and a + d <= 330, so the hearth on 120
       at -50 and the anvil on 240 at -30 both clear their jambs. */
    reveal(40, 330, 20, 156, 90, inner);
    ctx.save();
    poly([P(40,0,156),P(330,0,156),P(330,0,20),P(40,0,20)]);
    ctx.clip();
    slab(46, 324, 20, 26, -10, -88, '#2a221b', null, '#3a3129');
    /* the hearth */
    box(84, 156, -30, -74, 26, 62, '#332b24','#3d342b','#28211b');
    F(92, 148, 34, 58, '#e8763a', null, 0, -29.4);
    F(104, 136, 36, 52, '#f6c05a', null, 0, -29);
    /* the hood, tapering to the stack */
    poly([P(78,-28,74),P(162,-28,74),P(144,-28,120),P(96,-28,120)], '#3a332b');
    poly([P(78,-28,74),P(78,-76,74),P(96,-76,120),P(96,-28,120)], '#2f2922');
    poly([P(162,-28,74),P(162,-76,74),P(144,-76,120),P(144,-28,120)], '#453d33');
    poly([P(96,-28,120),P(144,-28,120),P(144,-76,120),P(96,-76,120)], '#453d33');
    cyl(120, -52, 120, 156, 24, '#3a332b');
    /* THE RACK IS FARTHER THAN THE ANVIL, so it goes first. The rack
       hangs on the back wall at b -70 with depth keys of 106..196; the
       anvil stands out at b -20..-44 on 194..214. Written anvil-first
       the rack was painted over it and a wall of tools hung in front of
       the anvil they belong behind. Twelfth order-versus-depth fault of
       the session, and the cheapest to avoid: three objects in one
       clipped interior, sorted once on a + b. */
    poly([P(176,-70,86),P(266,-70,86),P(266,-70,80),P(176,-70,80)], '#4a3d2e');
    for(let i=0;i<6;i++){
      const ta = 184 + i*15;
      tube(ta, -70, 80, ta, -70, 34, 1.8, '#8d979f');
      tube(ta-5, -70, 34, ta+5, -70, 34, 1.6, '#6d757c');
    }
    /* the anvil, on its block, where an anvil lives */
    box(222, 258, -20, -44, 26, 54, '#5a4a3a','#6a5842','#4a3d2e');
    box(216, 254, -22, -40, 54, 64, iron, shade(iron,1.15), shade(iron,.78));
    poly([P(254,-22,64),P(276,-31,60),P(254,-40,64)], shade(iron,1.15));
    box(224, 242, -26, -36, 64, 72, iron, shade(iron,1.15), shade(iron,.78));
    /* the quench trough */
    box(272, 320, -40, -70, 26, 44, '#4a3d2e','#584a38','#3c3126');
    F(276, 316, 40, 44, '#3f6b74', null, 0, -39.4);
    ctx.restore();
    /* ---- AND THERE IS GLASS IN IT ----
       The bay was a true opening and it read as a hole: a 290-wide
       black rectangle with a fire somewhere in the back of it. A hole
       in a wall has no plane, so nothing on this elevation told you
       where the front of the building was between a 40 and 330 -- the
       fascia jumped straight to the pavement.

       A smithy's front is a big industrial screen: timber mullions,
       two transoms, and glass thin enough to see the fire through. It
       still reads as open because the hearth glows through it, and now
       it also reads as a FRONT. */
    glaze(40, 330, 20, 156, null, 'rgba(148,138,122,.20)');
    for(let k=1;k<5;k++)
      F(40 + 290*k/5 - 4, 40 + 290*k/5 + 4, 20, 156, shade(wall,1.25), null, 0, 0.8);
    for(const tz of [66, 112])
      F(40, 330, tz-4, tz+4, shade(wall,1.25), null, 0, 0.8);

    shopDoor(420, wall, trim, null, WW);                // a 386.88..453.12

    /* ---- the counter window, for finished work ---- */
    reveal(486, 572, 40, 130, 30, shade(wall,.7));
    ctx.save();
    poly([P(486,0,130),P(572,0,130),P(572,0,40),P(486,0,40)]);
    ctx.clip();
    slab(492, 566, 40, 46, -8, -28, shade(wall,.9), null, shade(wall,1.05));
    for(let i=0;i<4;i++){
      const ga = 500 + i*18;
      tube(ga, -18, 46, ga, -18, 84, 2.2, '#8d979f');
      plateHoop(ga, -18, 92, 9, '#7d858c', 3);
    }
    ctx.restore();
    glaze(486, 572, 40, 130, null, 'rgba(140,130,116,.40)');

    /* ---- fascia, and the horseshoe on it ---- */
    slab(0, WW, 176, 216, 4, 0, shade(wall,1.2), null, trim);
    F(30, 470, 186, 208, trim, null,0, 4.6);
    {
      /* round in the world: the z radius divides back by ZSCALE, and it
         stands proud at b 5 rather than six units inside the wall */
      const hc = 530, hb = 5, hz = 194, r = 20;
      const ring = (rr, bb, n) => { const q = [];
        for(let i=0;i<(n||26);i++){ const t = Math.PI*2*i/(n||26);
          q.push(P(hc + rr*Math.cos(t), bb, hz + rr*Math.sin(t)/ZSCALE)); }
        return q; };
      poly(ring(r, hb), trim);
      poly(ring(r-6, hb+0.4), shade(wall,1.2));
      F(hc-8, hc+8, hz - r/ZSCALE - 2, hz - 2, shade(wall,1.2), null, 0, hb+0.8);
      for(const s of [-1, 1]){
        tube(hc + s*(r-3), hb+0.6, hz - 4, hc + s*(r-1), hb+0.6, hz - r/ZSCALE + 1, 3, trim);
        for(let k=0;k<3;k++)
          ball(hc + s*(r-3.5), hb+1.2, hz + 4 - k*5, 1.6, shade(trim,.6));
      }
    }

    if(state.roof){
      cyl(120, -52, H, H+70, 22, '#3a332b');            // the stack, carried up
      cyl(120, -52, H+70, H+80, 27, '#463d33');
      plateCircle(120, -52, H+80, 27, '#241d18', '#2f2922', 2);
      box(380, 500, -220, -160, H, H+26, '#8f969d','#787f86','#697077');
    }
    kerb(p,'none');
  }
},
{
  name:'Carpet shop', head:'Rugs on a rail above head height, rolled stock behind the glass',
  tags:['hanging rugs','round rail','rolled stock in the window','deep colour','bare footway'],
  desc:'The rail runs the full frontage on turned brackets with five rugs over it, hung high enough for a robot to pass under, and the rolled stock stands inside the window instead of on the paving.',
  draw(p){
    /* ============ THE RUGS HUNG IN THE ROAD ============
       The rail sat at z 116 and the rugs dropped 62 to 78 below it, so
       their hems finished at z 38 -- which is 57 game units, against a
       robot whose flag clears at 97. Tipsy drove through the stock.

       Nothing in this file catches that, and it is worth naming as its
       own class: not a lapping prop, not a wrong sign of b, but a
       HEADROOM fault -- something hung over the footway low enough to
       hit. The Playhouse marquee and the tea house lanterns were both
       checked against the flag when they went in; this was not, because
       it hangs off a rail rather than standing on the ground and the
       prop census only ever looks at things with their feet down.

       The rail goes to 146 and the rugs drop 28 to 34, so the hems are
       at 112 -- 168 game units, clear by 71. H 164 -> 216 to give the
       fascia somewhere to go above them.

       THREE ROLLS ON THE NEIGHBOUR, AND NO cTodo. They were at
       a = W + 18, +33 and +48, so 248 to 286 on a shop 230 wide, and
       this entry carried only fTodo because the rolls are tube() and
       the prop census counts cyl, box and plateCircle. Fifth census gap
       of the session. They stand in the window now.

       A WINDOW WAS DRAWN ACROSS THE DOOR, nineteenth consecutive shop.
       F(W*0.78, W-14, 52, 90) ran a 179.4..216 against an opening at
       158.8..225. And the window was a flat panel, nineteenth: F(12,
       W*0.68, 24, 112) with a stroke round it and nothing behind.

       fTodo: slab(6, W-6, 124, 152, -1, -9) put its far end on screen-a
       233 against a return at 230, with the lettering at -9.5 behind
       the board's own -9 backing. */
    /* FOUR RUGS, NOT FIVE, AND A SHALLOWER DROP. At five across a 218
       run each was 43.6 wide and hung 40..48 -- and z projects at 1.5,
       so they came out 60 tall on screen against 44 wide. That is a
       banner, not a rug. Four at 54.5 wide dropping 28 read 42 by 54,
       which is the way round a rug goes.

       The rail also had to come up. At 130 the hems finished at 86 and
       covered the top of the window behind them; at 146 they stop at
       112 against a window head of 106, so the stock inside is still
       visible under the stock outside. */
    const wall = '#5a3742', trim = '#e0c88a', H = 216, railZ = 146, railB = 26;
    const inner = '#241219';
    const cols = ['#a83a3a','#2f5f6b','#c9922f','#6b4a7a','#3f6b4a'];
    body(wall, trim, H);
    T(0, W, -D, 0, H+0.4, '#3d252d');                   // roof, over body's pale plate
    slab(0, W, H, H+10, 4, 0, shade(wall,.7));          // cornice

    /* ---- one shopfront band, both openings cut out of it ---- */
    slab(0, W, 0, 120, 4, 0, shade(wall,1.12), null, trim);
    reveal(14, 118, 24, 106, 30, inner);
    ctx.save();
    poly([P(14,0,106),P(118,0,106),P(118,0,24),P(14,0,24)]);
    ctx.clip();
    slab(18, 114, 24, 30, -8, -28, shade(wall,.86), null, shade(wall,1.0));
    /* the rolled stock, leaning against the back. At b -20 a roll of
       r 9 needs a between 43 and 89 inside an opening of 14..118, which
       is the Pottery's rule: the opening minus twice the depth of what
       stands in it. */
    for(let i=0;i<4;i++){
      const ra = 46 + i*14, col = cols[i%5];
      tube(ra, -20, 30, ra + 6, -20, 98, 9, col);
      plateCircle(ra + 6, -20, 98, 9, shade(col,1.25), shade(col,.7), 1.4);
    }
    for(let i=0;i<3;i++){                               // a stack of folded rugs
      const fz = 30 + i*11, col = cols[(i+2)%5];
      box(76, 110, -14, -26, fz, fz+9, shade(col,1.15), col, shade(col,.75));
    }
    ctx.restore();
    glaze(14, 118, 24, 106, null, 'rgba(140,110,124,.34)');
    for(let k=1;k<3;k++) F(14 + 104*k/3 - 3, 14 + 104*k/3 + 3, 24, 106, shade(wall,1.2), null,0, 0.8);

    shopDoor(178, wall, trim);                          // a 144.88..211.12

    /* ---- the rail, and the rugs over it ----
       Brackets on 12, 115 and 218, and the rail from a 4 to W-4 at
       b 26. Full width and attached along its length, so it takes the
       same licence the cornice does; it is the HEMS that had to be
       argued, not the rail. */
    for(const aa of [12, 115, 218]){
      tube(aa, 0, railZ+8, aa, railB, railZ, 3, shade(wall,1.3));
      ball(aa, railB, railZ, 3.6, shade(wall,1.15));
    }
    tube(4, railB, railZ+2, W-4, railB, railZ+2, 2.8, '#8d979f');
    for(let i=0;i<4;i++){
      const x0 = 6 + (W-12)*i/4, x1 = 6 + (W-12)*(i+1)/4, drop = 28 + (i%2)*6;
      poly([P(x0,railB-1,railZ),P(x1,railB-1,railZ),P(x1,0,railZ+8),P(x0,0,railZ+8)],
           shade(cols[i],1.2));
      const N = 8, top = [], bot = [];
      for(let k=0;k<=N;k++){
        const t = k/N, xx = x0 + (x1-x0)*t;
        top.push(P(xx, railB-1, railZ));
        bot.push(P(xx, railB-1, railZ - drop - 7*Math.sin(Math.PI*t)));
      }
      poly(top.concat(bot.reverse()), cols[i], shade(cols[i],.7), 1.6);
      for(const off of [8, drop - 6]){
        const band = [], back = [];
        for(let k=0;k<=N;k++){
          const t = k/N, xx = x0 + 8 + (x1-x0-16)*t;
          const zz = railZ - off - 7*Math.sin(Math.PI*t)*(off/drop);
          band.push(P(xx, railB-2, zz)); back.push(P(xx, railB-2, zz-4));
        }
        poly(band.concat(back.reverse()), shade(cols[i],1.35));
      }
    }

    /* ---- fascia, above the rugs ---- */
    slab(0, W, 162, 196, 4, 0, shade(wall,1.2), null, trim);
    F(24, W-24, 170, 188, trim, null,0, 4.6);

    if(state.roof){
      box(W*0.30, W*0.58, -150, -100, H, H+24, '#8f969d','#787f86','#697077');
      cyl(W*0.38, -125, H+24, H+32, 15, '#7d838a');
      plateCircle(W*0.38, -125, H+32, 15, '#a8aeb4', '#6a7076', 2);
    }
    kerb(p,'none');
  }
},
{
  name:'Coffee roaster', tall:true,
  head:'The roaster, the bins and the flue behind one deep window',
  tags:['turned roaster','round drum door','bean bins','flue through the roof','bare footway'],
  desc:'The roastery is inside the shop where it belongs: a drum on its firebox with a round hinged door, bins of beans beside it, and the flue carrying up through the roof. Nothing on the footway.',
  draw(p){
    /* ============ THE ROASTERY WAS ON THE PAVEMENT ============
       F(10, W*0.70, 22, 116) at b 0 was a flat dark rectangle with a
       stroke round it -- twentieth flat panel where a window belongs --
       and the roaster, the hopper, the flue and the three bins were all
       built at b 4..22, in FRONT of it. A gas-fired drum roasting on
       the footway with a painted brown rectangle behind it. Same fault
       as the Forge two shops ago, and the same cause: the machinery was
       drawn first and the window was drawn as a backdrop for it.

       cTodo COUNTED 4 PROPS AND 62 PAST THE FRONTAGE -- the sacks, at
       a = W + 16 and W + 46 with a belly radius of 16, so a 246..292 on
       a shop 230 wide. Every one of them entirely on the neighbour.
       A sack of green coffee is stock, and stock goes inside.

       THE DRUM DOOR WAS AN ELLIPSE. faceCircle draws radius r in a AND
       in z and z carries ZSCALE, so a door of r 13 came out 26 wide by
       39 tall. Eleventh instance of the session.

       A WINDOW WAS DRAWN ACROSS THE DOOR, twentieth consecutive shop.
       F(W*0.80, W-14, 54, 94) ran a 184..216 against an opening at
       158.8..225.

       H 168 -> 210. The flue has to clear the drum, the hopper has to
       clear the flue, and at 168 the whole stack was leaving the
       building through the fascia.

       fTodo: slab(6, W-6, 126, 152, -1, -9) put its far end on screen-a
       233 against a return at 230, with the lettering at -9.5 behind
       the board's own -9 backing. */
    const wall = '#4a3428', trim = '#d8b87a', H = 210;
    const inner = '#1b120d', copper = '#b87333';
    body(wall, trim, H);
    T(0, W, -D, 0, H+0.4, '#332319');                   // roof, over body's pale plate
    slab(0, W, H, H+10, 4, 0, shade(wall,1.35));        // cornice

    /* ---- one shopfront band, both openings cut out of it ---- */
    slab(0, W, 0, 130, 4, 0, shade(wall,1.1), null, trim);
    reveal(14, 128, 22, 118, 60, inner);
    ctx.save();
    poly([P(14,0,118),P(128,0,118),P(128,0,22),P(14,0,22)]);
    ctx.clip();
    slab(18, 124, 22, 28, -8, -58, shade(wall,.88), null, shade(wall,1.02));
    /* the roaster. DEPTH MOVES IT RIGHT, which is the thing to solve
       for: screen-a is a - b, so a drum at b -26 sits 26 further right
       than its own a and the clip then forces a into 62..80 -- which
       put it hard against the right jamb with the left third of the
       window empty. At b -18 the same drum clears from a 54, so it
       stands on 58 and lands on screen 76 in an opening of 14..128,
       which is where the eye goes first. */
    box(34, 82, -2, -34, 24, 34, '#3a2e26','#2f251e','#241c17');
    F(40, 76, 26, 32, '#e8763a', null, 0, -1.4);        // the fire under it
    cyl(58, -18, 34, 82, 22, '#2f6f6b');
    plateCircle(58, -18, 82, 22, '#3f8f88', '#1f4f4c', 2);
    {                                                   // its round door, corrected
      const ring = (r, bb, n) => { const q = [];
        for(let i=0;i<(n||24);i++){ const t = Math.PI*2*i/(n||24);
          q.push(P(72 + r*Math.cos(t), bb, 56 + r*Math.sin(t)/ZSCALE)); }
        return q; };
      poly(ring(11, 2), '#c9a24a');
      poly(ring(7.5, 2.4), '#8f6f26');
      tube(72, 3, 56, 84, 3, 56, 2, '#c9a24a');
    }
    cyl(58, -18, 82, 96, 10, copper);                   // the hopper
    poly([P(46,-18,96),P(70,-18,96),P(65,-18,112),P(51,-18,112)], '#c9803a');
    tube(58, -34, 96, 58, -34, 118, 4, '#8d979f');      // the flue
    for(const cz of [102, 112]) plateCircle(58, -34, cz, 6, '#a8aeb4');
    for(let i=0;i<2;i++){                               // bean bins
      const bx = 96 + i*14;
      cyl(bx, -10, 28, 62, 8, '#5c4232');
      plateCircle(bx, -10, 62, 8, ['#3a2a1e','#5a3a24'][i], '#3a2c22', 1.4);
    }
    for(let i=0;i<2;i++){                               // sacks of green coffee
      const sa = 94 - i*8, sz = i*20;
      cyl(sa, -22 - i*8, 28+sz, 46+sz, 11, '#c9b48e');
      ball(sa, -22 - i*8, 49+sz, 10, '#c9b48e', '#d8c49e');
    }
    ctx.restore();
    glaze(14, 128, 22, 118, null, 'rgba(150,126,100,.32)');
    for(let k=1;k<4;k++) F(14 + 114*k/4 - 3, 14 + 114*k/4 + 3, 22, 118, shade(wall,1.2), null,0, 0.8);

    shopDoor(180, wall, trim);                          // a 146.88..213.12

    /* ---- fascia ---- */
    slab(0, W, 136, 170, 4, 0, shade(wall,1.2), null, trim);
    F(24, W-24, 144, 162, trim, null,0, 4.6);

    if(state.roof){
      cyl(58, -34, H, H+62, 5, '#8d979f');              // the flue, carried up
      for(const cz of [H+18, H+40]) plateCircle(58, -34, cz, 7, '#a8aeb4');
      cyl(58, -34, H+62, H+70, 8, '#7d838a');
      plateCircle(58, -34, H+70, 8, '#2a2a2e', '#6a7076', 1.6);
      box(W*0.46, W*0.72, -160, -110, H, H+24, '#8f969d','#787f86','#697077');
    }
    kerb(p,'none');
  }
},
{
  name:'Pigeon loft',
  gTodo:'spawn the game\'s own pigeons on this shop -- landing board at b -50..+16, z H+18..H+26, a W*0.19..W*0.73; ridge at z H+104; five pop-holes on the loft face at b -50',
  head:'Feed shop below, timber loft on the roof',
  tags:['rooftop loft','landing board','pop-holes','feed behind the glass','timber'],
  desc:'The loft keeps its closed gable, ridge, pop-holes and bracketed landing board -- somewhere for the game\'s own pigeons to land -- and the feed the shop sells is inside the window instead of stacked on the paving.',
  draw(p){
    /* ============ THE FEED WAS ON THE PAVEMENT ============
       Three sacks at b 6, standing z 26..61 in front of a flat panel --
       twenty-first flat window of the session, F(10, W*0.66, 22, 96)
       with a stroke round it and nothing behind. So the shop's whole
       stock sat on the footway and the window was a painted backdrop
       for it, which is the Forge's fault and the Coffee roaster's for
       the third time in four shops.

       AND NO cTodo TO SAY SO. The sacks are cyl and ball centred on
       b 6, and the prop test asks whether the CENTRE b is past 8 -- so
       a sack 11 wide sitting half on the paving counted as nothing.
       Sixth census gap of the session, and the third of the
       wrong-measure kind after the Brewery's still and the Sweet shop's
       jars. The test wants the object's EXTENT.

       THE MULLIONS WERE INSIDE THE WALL, at b -1, painted on the back
       of the panel they were meant to divide. They are on the glass now
       at b 0.8, where a glazing bar goes.

       A WINDOW WAS DRAWN ACROSS THE DOOR, twenty-first consecutive
       shop. F(W*0.76, W-14, 48, 86) ran a 174.8..216 against an opening
       at 158.8..225.

       H 148 -> 168, which is 1.00 exactly. The loft, the landing board
       and the birds all sit on top of it and the extra 20 gives the
       fascia room without pushing the loft off the top of the frame.

       fTodo: slab(6, W-6, 104, 130, -1, -9) put its far end on screen-a
       233 against a return at 230, with the lettering at -9.5 behind
       the board's own -9 backing. */
    const wall = '#8a7a5e', trim = '#4a3f2e', H = 168;
    const inner = '#2a2318';
    body(wall, trim, H);
    T(0, W, -D, 0, H+0.4, '#6b5f48');                   // roof, over body's pale plate
    slab(0, W, H, H+10, 4, 0, trim);                    // cornice

    /* ---- one shopfront band, both openings cut out of it ---- */
    slab(0, W, 0, 112, 4, 0, shade(wall,1.12), null, trim);
    reveal(14, 124, 22, 96, 26, inner);
    ctx.save();
    poly([P(14,0,96),P(124,0,96),P(124,0,22),P(14,0,22)]);
    ctx.clip();
    slab(18, 120, 22, 28, -8, -24, shade(wall,.86), null, shade(wall,1.02));
    /* the feed. At b -18 a sack of r 11 needs a between 43 and 95
       inside an opening of 14..124 -- the Pottery's rule -- so the
       three sit on 50, 68 and 86. */
    for(let i=0;i<3;i++){
      const sa = 50 + i*18, sz = 28 + (i%2)*4;
      cyl(sa, -18, sz, sz+20, 11, '#c9b48e');
      ball(sa, -18, sz+24, 10, '#c9b48e', '#d8c49e');
      slab(sa-8, sa+8, sz+8, sz+13, -7, -9, '#8a7458');
    }
    box(96, 116, -12, -22, 28, 62, '#5c4a32','#6a5840','#4c3c28');   // a grain bin
    F(100, 112, 46, 58, '#a8916a', null, 0, -11.4);
    tube(104, -10, 62, 112, -10, 74, 2, '#8d979f');                  // its scoop
    plateCircle(112, -10, 74, 5, '#a8aeb4');
    ctx.restore();
    glaze(14, 124, 22, 96, null, 'rgba(120,132,116,.34)');
    for(let k=1;k<4;k++) F(14 + 110*k/4 - 3, 14 + 110*k/4 + 3, 22, 96, shade(wall,1.2), null,0, 0.8);

    shopDoor(178, wall, trim);                          // a 144.88..211.12

    /* ---- fascia ---- */
    slab(0, W, 118, 150, 4, 0, shade(wall,1.15), null, trim);
    F(22, W-22, 126, 142, trim, null,0, 4.6);

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
      /* ---- NO BIRDS, at Sir's direction ----
         The game has its own pigeons and they are the ones that should
         land here: a shopfront that draws its own would put two
         different birds in the same city, and the drawn ones cannot
         move, scatter or be hit. A prop that duplicates a live entity
         is worse than no prop -- it is a second answer to a question
         the game has already answered.

         The loft, the landing board and the pop-holes stay, which is
         what a pigeon loft is: somewhere for the real birds to be.
         Eleventh removal of the session, and the first for a new
         reason: the previous ten were things competing with the
         frontage or standing where they should not. This one asked
         "does the game already own this?" -- worth putting to anything
         drawn that the engine also simulates.

         gTodo IS A NEW FLAG, because this is a new kind of debt. It is
         not a fault in the shop and it is not something the shop can
         fix: it is a hook the GAME has to pick up. The landing board
         runs b -50..+16 at z H+18..H+26 across a W*0.19..W*0.73, the
         ridge is at H+104, and there are five pop-holes on the loft
         face at b -50 -- which is everything a spawner needs to perch
         birds on this building without measuring it again.

         Worth keeping distinct from pTodo. pTodo says WHERE a shop
         belongs; gTodo says what the game owes a shop once it is
         placed. The Chandlery and the Surf shop want the first; this
         wants the second. */

    }
    kerb(p,'none');
  }
},
{
  name:'Dance studio', tall:true,
  head:'Studio over a lobby: mirror wall and barre behind the upper glass',
  tags:['two storeys','mirror wall','tube barre','tall upper glazing','stair inside','bare footway'],
  desc:'The studio is upstairs behind one long window with the mirror wall, the barre on real brackets and the sprung floor visible through it, and the stair that reaches it runs inside the building instead of up the neighbour\'s wall.',
  draw(p){
    /* ============ THE STAIR WAS ON THE NEIGHBOUR ============
       Every part of it -- nine treads, the stringer, both handrails,
       five balusters and the landing -- was built at a = W + 2 to
       W + 32, so a full external staircase stood entirely on the plot
       next door, from the pavement to 150 up. Thirty-two units past the
       frontage along its whole height.

       AND NO cTodo TO SAY SO. This entry carried only fTodo and zTodo.
       Seventh census gap of the session, and a new one: the treads are
       box() at ground level with a centre b of -28, which is exactly
       what the prop test looks for -- so it is not a missing primitive
       or a wrong measure this time, the census simply never saw a shop
       whose props were all beyond a = W. Worth checking whether it
       clamps its scan to 0..W.

       The stair goes inside. A studio over a lobby has an internal
       stair, and the flight is visible through the lobby window doing
       the same job of saying "upstairs" without standing on anyone.

       zTodo 1.27 on a wall of 214. H 336 is 2.00 exactly, which is what
       the building always was: a lobby under a studio.

       fTodo 'z104..114 return +7' is the terrace-bounded kind, the
       distinction the Fabric shop turned up and the Sweet shop had both
       halves of. slab(0, W, 104, 114, -1, -7) runs wall to wall like a
       cornice, so its +7 is not a board overhanging the return wanting
       a margin -- it is a band leaking its end face onto the flank,
       wanting bBack 0.

       BOTH WINDOWS WERE FLAT PANELS, twenty-second and twenty-third of
       the session, and the barre and its brackets were painted at b -4
       and -1 on the back of the upper one. A barre stands in front of a
       mirror; both are inside the room now, behind real glass.

       A WINDOW WAS DRAWN ACROSS THE DOOR, twenty-second consecutive
       shop. F(W*0.65, W*0.77, 52, 92) ran a 149.5..177.1 against an
       opening at 130.2..196.4. */
    const wall = '#c8b8c8', trim = '#4a3a52', H = 336;
    const inner = '#3a3040', floor = '#b49a7a';
    body(wall, trim, H);
    T(0, W, -D, 0, H+0.4, '#9a8a9c');                   // roof, over body's pale plate
    slab(0, W, H, H+12, 4, 0, trim);                    // cornice

    /* ---- the lobby, and the stair inside it ---- */
    slab(0, W, 0, 130, 4, 0, shade(wall,1.06), null, trim);
    reveal(14, 118, 24, 112, 40, inner);
    ctx.save();
    poly([P(14,0,112),P(118,0,112),P(118,0,24),P(14,0,24)]);
    ctx.clip();
    slab(18, 114, 24, 30, -8, -38, shade(floor,.9), null, floor);
    /* NO STAIR IN THE LOBBY, at Sir's direction. It was doing the job
       of saying "upstairs", and the upper window now says that on its
       own by showing a room with depth. A flight of seven treads in a
       104-wide window is a lot of object for one word. */
    box(24, 50, -16, -32, 26, 44, '#6a5a6e','#7a6a80','#584a5c');    // a bench
    box(70, 110, -14, -30, 26, 56, '#584a5c','#6a5a6e','#483c4c');   // the desk
    F(74, 106, 56, 60, shade(wall,1.24), null, 0, -13.4);
    F(28, 46, 60, 96, shade(wall,1.2), null, 0, -33.4);              // notices
    for(let k=0;k<3;k++) F(31, 43, 66+k*10, 74+k*10, shade(wall,.86), null, 0, -33)
    ctx.restore();
    glaze(14, 118, 24, 112, null, 'rgba(150,160,176,.34)');
    for(let k=1;k<3;k++) F(14 + 104*k/3 - 3, 14 + 104*k/3 + 3, 24, 112, shade(wall,.8), null,0, 0.8);

    shopDoor(178, wall, trim);                          // a 144.88..211.12

    /* ---- fascia ---- */
    slab(0, W, 136, 172, 4, 0, shade(wall,1.14), null, trim);
    F(24, W-24, 145, 163, trim, null,0, 4.6);

    /* ---- the studio: the mirror and barre run BACK along the side
       wall, at Sir's direction, the way the Surf shop's boards recede
       into the shop rather than standing flat across the glass.

       IT IS A DIFFERENT PLANE, and that is the whole point. A mirror on
       the BACK wall is an F at constant b: it fills the opening and
       says nothing about the room behind it. A mirror on the SIDE wall
       is a poly at constant a spanning b -- 96 of it -- and the
       projection turns that into a plane running away up-right, which
       is what tells you the studio is a long room rather than a
       shallow display case.

       The reveal goes to 110 deep to hold it. The clip is in screen-a,
       so the mirror at a 22 spanning b -8..-104 lands on 30..126 inside
       an opening of 16..214, and the barre at a 40 on 48..144 -- the
       far ends of both pass behind the window head, exactly as they
       would from the street. */
    slab(8, W-8, 182, 320, 1, -13, shade(wall,1.1), null, trim);
    reveal(16, W-16, 190, 312, 110, inner);
    ctx.save();
    poly([P(16,0,312),P(W-16,0,312),P(W-16,0,190),P(16,0,190)]);
    ctx.clip();
    slab(20, W-20, 190, 196, -6, -108, floor, null, shade(floor,1.12));
    const MA = 22, BA = 40, MB0 = -8, MB1 = -104;
    poly([P(MA,MB0,196),P(MA,MB1,196),P(MA,MB1,300),P(MA,MB0,300)], '#dce4ec');
    poly([P(MA,MB0,196),P(MA,MB1,196),P(MA,MB1,201),P(MA,MB0,201)], shade(wall,.7));
    poly([P(MA,MB0,296),P(MA,MB1,296),P(MA,MB1,300),P(MA,MB0,300)], shade(wall,.7));
    for(let k=1;k<4;k++){
      const bb = MB0 + (MB1-MB0)*k/4;
      poly([P(MA+0.4,bb-2,196),P(MA+0.4,bb+2,196),P(MA+0.4,bb+2,300),P(MA+0.4,bb-2,300)],
           shade(wall,.8));
    }
    poly([P(MA+0.8,MB0,238),P(MA+0.8,MB1,238),P(MA+0.8,MB1,296),P(MA+0.8,MB0,296)],
         'rgba(200,184,200,.26)');
    tube(BA, MB0, 250, BA, MB1, 250, 2.6, '#8a7a94');                // the barre
    for(const bb of [MB0-14, (MB0+MB1)/2, MB1+14])
      tube(MA+1, bb, 250, BA, bb, 250, 2, '#8a7a94');
    ctx.restore();
    glaze(16, W-16, 190, 312, null, 'rgba(150,160,176,.30)');
    for(let k=1;k<5;k++)
      F(16 + (W-32)*k/5 - 3, 16 + (W-32)*k/5 + 3, 190, 312, shade(wall,.8), null,0, 0.8);
    F(16, W-16, 248, 254, shade(wall,.8), null,0, 0.8);

    if(state.roof) box(W*0.26,W*0.52,-150,-110,H,H+22,'#8f969d','#787f86','#697077');
    kerb(p,'none');
  }
},
{
  name:'Tattoo parlour', tall:true,
  head:'TATTOO in yellow under a neon run, flash behind the glass',
  tags:['block letters as prisms','neon as tubes','framed flash sheets','black render','yellow on black'],
  desc:'The word is built from extruded bars standing proud of the fascia, so the letters have a top and a side and keep their thickness at any zoom, and the flash sheets hang inside the shop behind real glass.',
  draw(p){
    /* ============ THE NEON WAS INSIDE THE WALL, AND IT WAS A STROKE ==
       Two faults on the one object. nb = -10 put the script ten units
       INTO the masonry -- sixteenth thing at the wrong sign of b this
       session -- and it was drawn with ctx.stroke at lineWidth 5*K,
       which is five SCREEN pixels scaled by the current zoom. That is
       not a thickness, it is a rendering artefact: the same sign comes
       out fat on a close block edge and hairline on a far one, and it
       has no depth at all, so nothing can pass in front of it.

       Neon is a glass tube. It is built from tube() segments now,
       sampled along the same script curve, standing at b 5 with a
       brighter core inside a dimmer envelope -- 3.4 and 1.6 in WORLD
       units, which stay 3.4 and 1.6 wherever the shop is drawn.

       THE FLASH SHEETS WERE IN THE WALL TOO, slabs at b -1..-6 painted
       on the back of a flat panel -- F(10, W*0.68, 20, 112) with a
       stroke round it, the twenty-fourth flat window of the session.
       They hang inside the shop now, behind glass, which is where a
       parlour keeps its flash.

       THE A-BOARD WAS ON THE FOOTWAY and carried no cTodo. It is built
       from poly() and the prop census counts cyl, box and plateCircle,
       so it was invisible to it -- eighth census gap of the session.
       It goes rather than moves: the neon is the sign, and a second
       sign on the pavement is a second thing to hit.

       A WINDOW WAS DRAWN ACROSS THE DOOR, twenty-third consecutive
       shop. F(W*0.78, W-14, 54, 94) ran a 179.4..216 against an opening
       at 158.8..225.

       fTodo: slab(6, W-6, 118, 150, -1, -9) put its far end on screen-a
       233 against a return at 230. That one is FRONTAGE-bounded -- it
       stops short of the return -- so it wants a margin, unlike the
       Dance studio's band which wanted bBack 0. H 162 -> 200 to give
       the fascia and the neon room over the glass. */
    const wall = '#1e1c22', trim = '#e0334a', H = 200;
    const inner = '#0e0c12', ink = ['#c2452e','#2f5f6b','#c9a24a','#6b4a7a','#3f8f5a'];
    body(wall, trim, H);
    /* THE OVERDRAW HAS TO BE BIGGER THAN THE PLATE. body() lays its
       roof at exactly 0..W by -D..0, and an overdraw at the same
       extents leaves a hairline of the original showing along the far
       edges -- which on this shop is trim RED against near-black, so a
       one-pixel sliver read as a wire across the roof. Two units proud
       on every side and it is covered. */
    T(-2, W+2, -D-2, 2, H+0.4, '#141218');              // roof, over body's red plate
    slab(0, W, H, H+12, 4, 0, shade(wall,2.2));         // cornice

    /* ---- one shopfront band, both openings cut out of it ---- */
    slab(0, W, 0, 126, 4, 0, shade(wall,1.5), null, shade(wall,2.4));
    reveal(14, 126, 22, 108, 30, inner);
    ctx.save();
    poly([P(14,0,108),P(126,0,108),P(126,0,22),P(14,0,22)]);
    ctx.clip();
    slab(18, 122, 22, 28, -8, -28, shade(wall,1.7), null, shade(wall,2.1));
    /* the flash, on the back wall. At b -29 a sheet shifts 29 right on
       screen, so a 22..96 lands on 51..125 inside an opening of
       14..126 -- the Coffee roaster's rule: depth moves things right,
       and the a range is what is left after it has. */
    /* ---- THE SHEETS CARRY FLASH, NOT A FLAT FILL ----
       Each was a single rectangle of colour inside a cream frame, which
       is a swatch rather than a design -- nine of them read as a paint
       chart. Flash is the whole point of the window: it is what a
       parlour puts up instead of stock, and it has to be recognisable
       at a glance or it is not flash.

       Drawn in sheet-local u,v so the same design can go on any sheet,
       and every ROUND part divides v by ZSCALE -- the star's points and
       the skull's dome come out circular rather than tall, which is the
       correction eleven shops have now needed.

       No chair and no lamp stand. They read as podiums under the
       sheets, and a window of flash wants nothing in front of it. */
    const flash = (x0, z0, bb, kind, col) => {
      const q = (pts, c) => poly(pts.map(([u,v]) => P(x0 + u, bb, z0 + v)), c || col);
      const arc = (cu, cv, r, n, c, from, to) => { const g = [];
        for(let i=0;i<=n;i++){ const t = from + (to-from)*i/n;
          g.push([cu + r*Math.cos(t), cv + r*Math.sin(t)/ZSCALE]); }
        return q(g, c); };
      if(kind === 0){                                     // heart
        q([[10,3],[3,10],[4,14],[10,12],[16,14],[17,10]]);
      } else if(kind === 1){                              // star
        const g = [];
        for(let k=0;k<10;k++){ const r = k%2 ? 3 : 7.5, t = -Math.PI/2 + k*Math.PI/5;
          g.push([10 + r*Math.cos(t), 9 + r*Math.sin(t)/ZSCALE]); }
        q(g);
      } else if(kind === 2){                              // anchor
        q([[9,2],[11,2],[11,15],[9,15]]);
        q([[4,11],[16,11],[16,13],[4,13]]);
        arc(10, 15, 3.4, 12, col, 0, Math.PI);
        q([[9,4],[3,8],[3,4],[9,1]]); q([[11,4],[17,8],[17,4],[11,1]]);
      } else if(kind === 3){                              // dagger
        q([[10,17],[13,9],[7,9]]);
        q([[4,7],[16,7],[16,9],[4,9]]);
        q([[9,2],[11,2],[11,7],[9,7]]);
      } else if(kind === 4){                              // swallow
        q([[10,9],[2,15],[4,7],[10,10]]);
        q([[10,9],[18,15],[16,7],[10,10]]);
        q([[8,7],[12,7],[10,2]]);
      } else {                                            // lightning
        q([[12,17],[5,8],[9,8],[7,1],[15,10],[11,10]]);
      }
    };
    for(let r=0;r<3;r++) for(let c=0;c<3;c++){
      const x0 = 22 + c*26, z0 = 34 + r*24, i = r*3 + c;
      slab(x0, x0+20, z0, z0+18, -28, -30, '#e8e2d4', shade(wall,2.0));
      flash(x0, z0, -27.4, i % 6, ink[i % 5]);
    }
    ctx.restore();
    glaze(14, 126, 22, 108, null, 'rgba(90,80,100,.34)');
    for(let k=1;k<3;k++) F(14 + 112*k/3 - 3, 14 + 112*k/3 + 3, 22, 108, shade(wall,2.0), null,0, 0.8);

    shopDoor(178, wall, shade(wall,1.9), 'rgba(60,66,80,.55)');   // a 144.88..211.12

    /* ---- fascia, and TATTOO across it ----
       At Sir's direction the front says what the shop is, in large
       yellow letters, and the neon moves up out of their way rather
       than going altogether -- see the run above the fascia. Two signs
       only work when one of them frames the other; side by side in the
       same band they would have fought, which is what the Music shop's
       horn did to its own name board.

       THE LETTERS ARE PRISMS, NOT PAINT, which is the lesson the neon
       itself taught two passes ago. Extruded b 2..10, so they have a
       top and a side, they take the light like everything else on the
       elevation, and their thickness is 8 WORLD units at any zoom --
       where the old ctx.stroke was five screen pixels and changed with
       the camera.

       Built from bars in letter-local u,v on a 24 by 34 box with a 7
       stroke, so T, A and O are three shapes and TATTOO is six calls.
       Six letters on a 30 pitch is 174 wide, which centres on a 230
       frontage with 28 either side. */
    slab(15, W-15, 132, 176, -1, -9, shade(wall,1.7), null, shade(wall,2.2));
    {
      /* ---- ONE PIECE PER LETTER ----
         Each glyph was a stack of separate bars -- T two, A and O four
         apiece -- and prism() gives every one of them its own top and
         side, so the seams between them showed as bright edges running
         through the middle of the letters. Twenty-two prisms pretending
         to be six letters.

         A letter is one outline. T traces round its own bar and stem in
         a single path; A and O trace their outer edge, and their
         COUNTERS -- the enclosed holes -- are painted on the front face
         in the fascia colour rather than cut, because prism() takes a
         simple polygon and cannot carry a hole. At 8 deep and this
         angle a painted counter reads as a hole, and the sides stay
         solid, which is what a cut letter looks like anyway.

         Letter-local u,v on a 24 by 34 box with a 7 stroke, six letters
         on a 30 pitch: 174 wide, centred on 230 with 28 either side. */
      const gold = '#f2c53a', back = shade(wall,1.7);
      const GLYPH = {
        T: { out: [[0,27],[8.5,27],[8.5,0],[15.5,0],[15.5,27],[24,27],[24,34],[0,34]] },
        A: { out: [[0,0],[7,0],[7,14],[17,14],[17,0],[24,0],[24,34],[0,34]],
             cut: [[7,21],[17,21],[17,27],[7,27]] },
        O: { out: [[0,0],[24,0],[24,34],[0,34]],
             cut: [[7,7],[17,7],[17,27],[7,27]] }
      };
      const x0 = 28, z0 = 138;
      'TATTOO'.split('').forEach((ch, i) => {
        const g = GLYPH[ch], sh = (u,v) => [x0 + i*30 + u, z0 + v];
        prism(g.out.map(([u,v]) => sh(u,v)), 2, 10, gold, shade(gold,.62), shade(gold,1.2));
        if(g.cut)
          poly(g.cut.map(([u,v]) => { const q = sh(u,v); return P(q[0], 10.4, q[1]); }), back);
      });
    }

    /* ---- THE NEON COMES BACK, ABOVE THE WORD ----
       At Sir's direction and where he put it: on the band of wall
       between the fascia head at 176 and the cornice at 200, running
       the frontage. It works there for a reason worth naming -- it is
       no longer competing with the sign, it is FRAMING it. Below the
       letters it would have fought them for the same band; above, the
       word reads first and the glow reads second, which is the order a
       shopfront wants.

       AND IT HANGS OFF THE CORNICE, at Sir's direction. Centred at 188
       it floated in the middle of a blank band with nothing holding it
       -- a sign has to be fixed to something, and the only thing up
       there is the grey cornice at 200..212. At 196 with an amplitude
       of 9 the crests run to 205, INTO the cornice band, so the tube
       reads as mounted on it rather than hovering below it, and four
       stand-off pins carry the troughs up to 202.

       Overlapping the moulding is the point. A neon that stops one unit
       short of what it is fixed to reads as floating however close it
       gets; it has to cross the line.

       Still tubes, not a stroke: 3 and 1.4 in WORLD units at b 5, so it
       keeps its thickness at any zoom. */
    {
      const nz = 196, nb = 5;
      const npt = t => [12 + (W-24)*t,
                        nz + Math.sin(t*Math.PI*5)*9 - Math.sin(t*Math.PI*2)*3];
      for(const [rr, col] of [[3, trim], [1.4, '#ffb4be']]){
        for(let i=0;i<40;i++){
          const [a0,z0] = npt(i/40), [a1,z1] = npt((i+1)/40);
          tube(a0, nb, z0, a1, nb, z1, rr, col);
        }
      }
      for(const t of [0.1, 0.35, 0.65, 0.9]){            // stand-offs up to the cornice
        const [aa,zz] = npt(t);
        tube(aa, 4.6, zz, aa, 4.6, 202, 1.2, shade(wall,2.4));
      }
      for(const t of [0, 1]){                             // the tube ends and their pins
        const [aa,zz] = npt(t);
        ball(aa, nb, zz, 3.6, shade(trim,.7));
        tube(aa, 0, zz, aa, nb, zz, 1.2, shade(wall,2.0));
      }
    }

    if(state.roof) box(W*0.30,W*0.56,-150,-108,H,H+22,'#8f969d','#787f86','#697077');
    kerb(p,'none');
  }
},
{
  name:'Undertaker', tall:true, block:true, place:'park',
  ww: 4*3128, dd: 5*3128,
  wTodo:'nine block cells in a staircase -- the packer has no concept of a multi-block, non-rectangular footprint',
  pTodo:'GANTRY COMMONS specifically, Warehouse District. Measured on buildGrid(36,27,hashStr("2026-08-09")): 9 cells at i,j (10,13)(9,14)(10,14)(9,15)(10,15)(10,16)(11,16)(11,17)(12,17). The chooser places by block type and has no way to name a component',
  gTodo:'pin to the Gantry Commons component via parkNameTable/mapParkName, the way WG_COAST pins the aquarium to its deck. Anchor is the min-j then min-i cell, (10,13). If worldgen ever reshapes the component the footprint here has to be regenerated from it rather than kept as a literal',
  cTodo:'perimeter railings on the staircase outline, lych gate, chapel and ~200 headstones need volumes; the walks and the grass are drivable',
  head:'Burial ground filling Gantry Commons, nine cells of it',
  tags:['nine-cell footprint','staircase outline','burial ground','chapel of rest','lych gate','drivable walks'],
  desc:'Not a shopfront and not a block: the undertaker takes the whole of Gantry Commons in the shape the worldgen actually makes it, nine cells running diagonally with the streets between them swallowed, railed round the staircase and walked through.',
  draw(p){
    /* ============ THE FOOTPRINT IS A MEASURED PARK, NOT A BLOCK =====
       At Sir's direction this fills GANTRY COMMONS in the shape the
       worldgen actually gives it. The cells were read off the real
       city -- buildGrid(36, 27, hashStr("2026-08-09")), which is
       DISTRICT_COLS*DISTRICT_W by DISTRICT_ROWS*DISTRICT_H, 910 blocks
       -- and parkNameTable's component for that name is nine cells:

         (10,13) (9,14) (10,14) (9,15) (10,15) (10,16) (11,16)
         (11,17) (12,17)

       Normalised to its own origin that is a 4 by 5 bounding box with
       nine of the twenty cells filled, running as a staircase from the
       north-west down to the south-east. ww and dd are the bounding
       box; the SHAPE is the CELLS list.

       A CORRECTION WORTH KEEPING. My first census said Gantry Commons
       never exists, across 120 runs. That census used buildGrid(12,12)
       -- a twelfth of the city's area -- and at that size a hood never
       gets enough park components for the sixth name in its pool to be
       dealt. The method was right and the parameter was wrong, which is
       the worst kind of wrong: it produces a confident number. The real
       grid dimensions were in _generateRouteFresh the whole time.

       WHAT THE SWALLOW PASS MEANS HERE. Where two cells are edge
       adjacent the street between them is gone, so the grass runs
       straight through; where a cell has no neighbour on a side, that
       side is a real street frontage and gets the railing. So the
       ground is not nine squares, it is one continuous piece with a
       staircase outline, and the railing is derived from the cell set
       rather than drawn as a rectangle.

       cTodo IS LARGE AND HONEST. Nine cells at the old 62 by 88 stone
       pitch would have been about eighteen hundred headstones. At 150
       by 200 it is around two hundred, which still reads as rows and is
       a collision bill somebody has to agree to. */
    /* ---- THE CELL PITCH IS THE GAME'S, MEASURED ----
       This was 1048.8 with a 90 road, which is the canvas lab's
       block:true convention, and it is WRONG BY A FACTOR OF THREE. Read
       off the running game: BLOCK is 34*T2 = 3128, a block's buildable
       interior is x1-x0 = 1656, and ROAD_HALF is 368 -- so 736 of road,
       1656 of ground, 736 of road makes the 3128 pitch.

       The graft found it. Standing the robot in Gantry Commons showed
       grass and a palm and no graveyard, because the burial ground was
       being drawn at a third of the component's real size, tucked in
       one corner of nine cells that are each three times bigger than it
       assumed.

       WORTH CHECKING THE OTHER FIVE. Bathhouse, Chapel, Nursery,
       Brewery and Print works all use ww = dd = 1048.8 on the same
       convention, and if that number came from the same place they are
       all a third of a block. The lab cannot tell -- it frames whatever
       it is given -- which is exactly why this only surfaced on the
       first entry to reach the game. */
    const BLK = 3128, ROAD = 736;
    const CELLS = [[1,0],[0,1],[1,1],[0,2],[1,2],[1,3],[2,3],[2,4],[3,4]];
    const has = (ci, cj) => CELLS.some(c => c[0] === ci && c[1] === cj);
    const grass = '#4a6b46', walk = '#b3a894', iron = '#2a2e33';
    const stoneA = '#9a9a92', stoneB = '#8a8a82', wall = '#6a6a64', roofc = '#3a3f44';
    /* the chapel stands in cell (1,1), which is inside the solid 2x2
       core the component happens to contain -- (0,1)(1,1)(0,2)(1,2) */
    const CA0 = 1*BLK + 900, CA1 = 1*BLK + 1500, CB0 = -1*BLK - 900, CB1 = -1*BLK - 1450, CH = 250;

    /* ---- the ground, cell by cell, with the swallowed streets ---- */
    T(0, 4*BLK, -5*BLK, 0, 0.3, '#b3a894');
    for(const [ci, cj] of CELLS){
      const a0 = ci*BLK + (has(ci-1,cj) ? 0 : ROAD), a1 = (ci+1)*BLK - (has(ci+1,cj) ? 0 : ROAD);
      const b1 = -cj*BLK - (has(ci,cj-1) ? 0 : ROAD), b0 = -(cj+1)*BLK + (has(ci,cj+1) ? 0 : ROAD);
      T(a0, a1, b0, b1, 0.6, grass);
    }
    /* ---- the walks, and every one of them ends at a gate ----
       A walk that runs into a railing is a path to nowhere, and the
       first cut had three of them doing exactly that -- one overshot
       onto the pavement outside, one stopped 30 short of the fence and
       one crossed a cell that is not in the component at all. Each now
       runs from perimeter to perimeter and the railing opens where it
       meets one. */
    T(1*BLK+1120, 1*BLK+1280, -3*BLK, -ROAD, 0.8, walk);          // the spine
    T(0*BLK+ROAD, 2*BLK-ROAD, -1*BLK-1560, -1*BLK-1720, 0.8, walk);// the cross walk
    T(2*BLK+ROAD, 4*BLK-ROAD, -4*BLK-760, -4*BLK-920, 0.8, walk); // the lower walk

    /* ---- the railing, derived from the cell set ----
       Every cell side with no neighbour is a street frontage. Segments
       run 20 inside the grass edge and overrun 20 at each end so the
       corners close without a mitre. */
    /* ---- THE RAILING IS THE BOUNDARY OF THE GRASS, NOT OF THE CELLS ----
       The first cut put a rail on every cell side with no neighbour and
       overran each end by 20. That is right along a straight run and
       wrong at every step of the staircase, which is where the holes
       Sir photographed were.

       The reason: a cell's grass is inset by ROAD on the sides with no
       neighbour and NOT inset on the sides with one, so two diagonally
       adjacent cells produce grass edges that are offset by ROAD in
       both axes. At a step the boundary has to make two short turns of
       90 each to get from one cell's edge to the next -- and 20 of
       overrun does not cover 90.

       So: build the grass rectangle for each cell exactly as the ground
       pass does, and for each of its four edges emit rail over the part
       NOT shared with the neighbour on that side. Where there is no
       neighbour that is the whole edge; where there is one it is the
       interval difference, which is precisely the little notch at each
       step. Same rule everywhere, no special case for corners. */
    const rect = (ci, cj) => [
      ci*BLK + (has(ci-1,cj) ? 0 : ROAD), (ci+1)*BLK - (has(ci+1,cj) ? 0 : ROAD),
      -(cj+1)*BLK + (has(ci,cj+1) ? 0 : ROAD), -cj*BLK - (has(ci,cj-1) ? 0 : ROAD)];
    const railSegs = [];
    for(const [ci, cj] of CELLS){
      const [a0, a1, b0, b1] = rect(ci, cj);
      const span = (lo, hi, nb, along) => {         // the part of an edge that is open
        if(!nb) return [[lo, hi]];
        const r = rect(nb[0], nb[1]);
        const [c0, c1] = along ? [r[0], r[1]] : [r[2], r[3]];
        const out = [];
        if(lo < c0) out.push([lo, Math.min(hi, c0)]);
        if(hi > c1) out.push([Math.max(lo, c1), hi]);
        return out;
      };
      const nb = (i, j) => has(i, j) ? [i, j] : null;
      for(const [x0, x1] of span(a0, a1, nb(ci, cj-1), true))
        railSegs.push([x0 - 12, x1 + 12, b1 - 12, b1]);
      for(const [x0, x1] of span(a0, a1, nb(ci, cj+1), true))
        railSegs.push([x0 - 12, x1 + 12, b0, b0 + 12]);
      for(const [y0, y1] of span(b0, b1, nb(ci-1, cj), false))
        railSegs.push([a0, a0 + 12, y0 - 12, y1 + 12]);
      for(const [y0, y1] of span(b0, b1, nb(ci+1, cj), false))
        railSegs.push([a1 - 12, a1, y0 - 12, y1 + 12]);
    }
    /* ---- THE GATES, one at every place a walk meets the perimeter ----
       Four of them: the lych gate on the north street where the spine
       walk starts, and three iron gates where the cross walk and the
       lower walk reach the railing. Each is a rectangle the railing
       opens for, so adding a walk means adding its gate and nothing
       else has to change. */
    const GA0 = 1*BLK + 1090, GA1 = 1*BLK + 1310, GB = -ROAD - 6;
    const GATES = [
      { a0: GA0,            a1: GA1,            b0: GB-30,        b1: GB+30, lych:true },
      { a0: 0*BLK+ROAD-30,  a1: 0*BLK+ROAD+30,  b0: -1*BLK-1740,  b1: -1*BLK-1540 },
      { a0: 2*BLK-ROAD-30,  a1: 2*BLK-ROAD+30,  b0: -1*BLK-1740,  b1: -1*BLK-1540 },
      { a0: 4*BLK-ROAD-30,  a1: 4*BLK-ROAD+30,  b0: -4*BLK-940,   b1: -4*BLK-740 }
    ];
    const railing = (a0, a1, b0, b1) => {
      for(const g of GATES){
        if(a0 < g.a1 && a1 > g.a0 && b0 < g.b1 && b1 > g.b0){
          if((a1 - a0) > Math.abs(b1 - b0)){
            if(a0 < g.a0) railing(a0, g.a0, b0, b1);
            if(a1 > g.a1) railing(g.a1, a1, b0, b1);
          } else {
            if(b0 < g.b0) railing(a0, a1, b0, g.b0);
            if(b1 > g.b1) railing(a0, a1, g.b1, b1);
          }
          return;
        }
      }
      box(a0, a1, b0, b1, 0, 10, shade(wall,.9), shade(wall,.7), shade(wall,.6));
      const along = (a1 - a0) > Math.abs(b1 - b0);
      const n = Math.max(2, Math.round((along ? a1-a0 : Math.abs(b1-b0)) / 30));
      const mb = (b0+b1)/2, ma = (a0+a1)/2;
      for(let i=0;i<=n;i++){
        const t = i/n;
        cyl(along ? a0 + (a1-a0)*t : ma, along ? mb : b0 + (b1-b0)*t, 10, 60, 2.2, iron);
      }
      for(const z of [16, 54])
        poly(along ? [P(a0,mb,z),P(a1,mb,z),P(a1,mb,z+4),P(a0,mb,z+4)]
                   : [P(ma,b0,z),P(ma,b1,z),P(ma,b1,z+4),P(ma,b0,z+4)], iron);
    };

    /* ---- the stones, the yews, and the railing, all one sorted list ---- */
    const stones = [];
    let seed = 11;
    const rnd = () => (seed = (seed*1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for(const [ci, cj] of CELLS)
      /* 260 by 340 on cells of 1656 gives about 24 stones a cell and
         216 in all -- the same bill the 150 by 200 pitch gave on cells
         a third the size, which is the point of re-cutting it rather
         than letting the rescale multiply it by nine. */
      for(let aa = ci*BLK + ROAD + 130; aa < (ci+1)*BLK - ROAD - 100; aa += 260)
        for(let bb = -cj*BLK - ROAD - 130; bb > -(cj+1)*BLK + ROAD + 100; bb -= 340){
          if(aa > CA0-220 && aa < CA1+220 && bb < CB0+300 && bb > CB1-420) continue;
          if(aa > 1*BLK+1060 && aa < 1*BLK+1340 && bb > -3*BLK) continue;    // the spine walk
          if(bb < -1*BLK-1500 && bb > -1*BLK-1780) continue;                 // the cross walk
          if(bb < -4*BLK-700 && bb > -4*BLK-980) continue;
          stones.push([aa + rnd()*20, bb - rnd()*20, Math.floor(rnd()*4)]);
        }
    const yews = [];
    for(const [ci, cj] of CELLS)
      if((ci + cj) % 2 === 0) yews.push([ci*BLK + ROAD + 200 + rnd()*900, -cj*BLK - ROAD - 220 - rnd()*900]);

    const drawStone = ([sa, sb, kind]) => {
      if(kind === 0){
        box(sa-15, sa+15, sb-6, sb+6, 0, 46, stoneA, shade(stoneA,1.1), shade(stoneA,.78));
        const q = [];
        for(let i=0;i<=12;i++){ const t = Math.PI*i/12;
          q.push(P(sa - 15*Math.cos(t), sb+6, 46 + 15*Math.sin(t)/ZSCALE)); }
        poly(q, shade(stoneA,1.1));
      } else if(kind === 1){
        box(sa-6, sa+6, sb-6, sb+6, 0, 60, stoneB, shade(stoneB,1.1), shade(stoneB,.78));
        box(sa-18, sa+18, sb-5, sb+5, 40, 51, stoneB, shade(stoneB,1.1), shade(stoneB,.78));
      } else if(kind === 2){
        box(sa-13, sa+13, sb-11, sb+11, 0, 14, stoneB, shade(stoneB,1.05), shade(stoneB,.74));
        box(sa-9, sa+9, sb-8, sb+8, 14, 72, stoneA, shade(stoneA,1.12), shade(stoneA,.76));
        poly([P(sa-9,sb+8,72),P(sa+9,sb+8,72),P(sa,sb+8,90)], shade(stoneA,1.12));
      } else {
        box(sa-22, sa+22, sb-13, sb+13, 0, 30, stoneB, shade(stoneB,1.06), shade(stoneB,.74));
        slab(sa-26, sa+26, 30, 37, sb+15, sb-15, shade(stoneA,1.14), null, shade(stoneA,1.2));
      }
    };
    const drawYew = ([ya, yb]) => {
      cyl(ya, yb, 0, 46, 11, '#4a3c2e');
      for(let k=0;k<3;k++)
        ball(ya + (k-1)*15, yb + (k%2 ? 11 : -11), 66 + k*19, 35 - k*6,
             k%2 ? '#2f5638' : '#365f3e');
    };

    const inFront = (oa, ob) => {
      const s0 = oa - ob, key = oa + ob;
      if(s0 < CA0 - CB0 || s0 > CA1 - CB1) return key > CA1 + CB0;
      return key > (s0 <= CA1 - CB0 ? s0 + 2*CB0 : 2*CA1 - s0);
    };
    const items = []
      .concat(stones.map(o => [o[0]+o[1], () => drawStone(o), o]))
      .concat(yews.map(o => [o[0]+o[1], () => drawYew(o), o]))
      /* ---- LONG RAILS HAVE TO BE CUT UP BEFORE THEY ARE SORTED ----
         A rail segment can be a whole block long, and a box that long
         has a different depth key at every point along it. Sorting the
         whole run on its MIDPOINT key puts it in one place in the
         queue, so stones near its far end came out in front of it and
         stones near its near end behind -- which is what the headstones
         standing on the railing were.

         Same fault as the chapel two passes ago and the same fix as the
         tea house roof: an object that spans a range cannot be one item
         in a depth-sorted queue. Cut into 140s, every piece's midpoint
         is accurate for its own extent, and railing() already spaces
         its posts by length so the joins do not show. */
      .concat(railSegs.flatMap(r => {
        const along = (r[1]-r[0]) > Math.abs(r[3]-r[2]);
        const len = along ? r[1]-r[0] : r[3]-r[2];
        const n = Math.max(1, Math.round(len / 140));
        const out = [];
        for(let i=0;i<n;i++){
          const t0 = i/n, t1 = (i+1)/n;
          const q = along ? [r[0]+(r[1]-r[0])*t0, r[0]+(r[1]-r[0])*t1, r[2], r[3]]
                          : [r[0], r[1], r[2]+(r[3]-r[2])*t0, r[2]+(r[3]-r[2])*t1];
          const mid = [(q[0]+q[1])/2, (q[2]+q[3])/2];
          out.push([mid[0]+mid[1], () => railing(q[0], q[1], q[2], q[3]), mid]);
        }
        return out;
      }));
    items.sort((u, v) => u[0] - v[0]);
    for(const [, fn, o] of items) if(!inFront(o[0], o[1])) fn();

    /* ---- the chapel of rest ----
       Hand-rolled, like every set-back building in this file: reveal(),
       glaze() and shopDoor() all draw at b 0 and this stands a block in.
       Back wall first: two planes of one building at different b always
       overlap on screen by exactly the building's depth. */
    F(CA0, CA1, 0, CH, shade(wall,.86), null, 0, CB1);
    {
      const o = P(0,CB0,0), pa = P(1,CB0,0), ge = (pa.y - o.y) > 0 ? CA1 : CA0;
      S(ge, CB1, CB0, 0, CH, shade(wall,.74));
      poly([P(ge,CB0,CH),P(ge,(CB0+CB1)/2,CH+96),P(ge,CB1,CH)], shade(wall,.68));
    }
    F(CA0, CA1, 0, CH, wall, null, 0, CB0);
    F(CA0, CA1, 0, 22, shade(wall,.82), null, 0, CB0+0.4);
    const CBM = (CB0+CB1)/2;
    poly([P(CA0-8,CB0+8,CH),P(CA1+8,CB0+8,CH),P(CA1+8,CBM,CH+96),P(CA0-8,CBM,CH+96)],
         shade(roofc,1.04));
    for(let i=1;i<9;i++){
      const t = i/9, bb = CB0+8 + (CBM-CB0-8)*t, zz = CH + 96*t;
      poly([P(CA0-6,bb,zz),P(CA1+6,bb,zz),P(CA1+6,bb-1.6,zz-2),P(CA0-6,bb-1.6,zz-2)],
           shade(roofc,.88));
    }
    poly([P(CA0-8,CBM,CH+96),P(CA1+8,CBM,CH+96),P(CA1+8,CB1-8,CH),P(CA0-8,CB1-8,CH)],
         shade(roofc,.74));
    slab(CA0-10, CA1+10, CH+96, CH+104, CBM+8, CBM-8, shade(roofc,.6));
    for(const wa of [CA0+80, CA0+230, CA1-80]){
      F(wa-26, wa+26, 60, 172, shade(wall,1.1), null, 0, CB0-0.6);
      F(wa-20, wa+20, 66, 156, '#2f3a42', null, 0, CB0-1);
      const q = [];
      for(let i=0;i<=10;i++){ const t = Math.PI*i/10;
        q.push(P(wa - 20*Math.cos(t), CB0-1, 156 + 20*Math.sin(t)/ZSCALE)); }
      poly(q, '#2f3a42');
      F(wa-2, wa+2, 66, 170, shade(wall,1.1), null, 0, CB0-1.4);
    }
    {
      const da = (CA0+CA1)/2;
      F(da-50, da+50, 0, 134, shade(wall,1.06), null, 0, CB0+0.8);
      F(da-36, da+36, 0, 110, '#241f1c', null, 0, CB0+1.2);
      const q = [];
      for(let i=0;i<=10;i++){ const t = Math.PI*i/10;
        q.push(P(da - 36*Math.cos(t), CB0+1.2, 110 + 36*Math.sin(t)/ZSCALE)); }
      poly(q, '#241f1c');
      for(const [d0,d1] of [[da-32, da-2],[da+2, da+32]])
        F(d0, d1, 4, 106, '#3a3028', shade(wall,.7), 1.4, CB0+1.6);
    }

    for(const [, fn, o] of items) if(inFront(o[0], o[1])) fn();

    /* ---- the three iron gates, then the lych gate ----
       Piers with ball caps and an arched overthrow between them, turned
       to face along whichever axis the opening runs. */
    for(const g of GATES){
      if(g.lych) continue;
      const across = (g.a1 - g.a0) > Math.abs(g.b1 - g.b0);
      const ma = (g.a0+g.a1)/2, mb = (g.b0+g.b1)/2;
      const ends = across ? [[g.a0-6, mb],[g.a1+6, mb]] : [[ma, g.b0-6],[ma, g.b1+6]];
      for(const [pa, pb] of ends){
        box(pa-15, pa+15, pb-15, pb+15, 0, 92, shade(wall,.95), shade(wall,.75), shade(wall,.62));
        slab(pa-19, pa+19, 92, 100, pb+19, pb-19, shade(wall,1.1));
        ball(pa, pb, 112, 13, shade(wall,1.05), shade(wall,1.2));
      }
      for(let i=0;i<=10;i++){                                     // the overthrow
        const t = i/10, zz = 104 + 26*Math.sin(Math.PI*t);
        const aa = across ? ends[0][0] + (ends[1][0]-ends[0][0])*t : ma;
        const bb = across ? mb : ends[0][1] + (ends[1][1]-ends[0][1])*t;
        if(i){
          const t0 = (i-1)/10, z0 = 104 + 26*Math.sin(Math.PI*t0);
          const a0 = across ? ends[0][0] + (ends[1][0]-ends[0][0])*t0 : ma;
          const b0 = across ? mb : ends[0][1] + (ends[1][1]-ends[0][1])*t0;
          tube(a0, b0, z0, aa, bb, zz, 2.4, iron);
        }
      }
    }
    {
      const gb = GB;
      for(const ga of [GA0, GA1])
        box(ga-14, ga+14, gb-14, gb+14, 0, 112, shade(wall,.95), shade(wall,.75), shade(wall,.62));
      box(GA0+12, GA1-12, gb-7, gb+7, 92, 106, '#4a4038','#584c42','#3c332c');
      for(const [ba, sgn] of [[GA0+14, 1],[GA1-14, -1]])
        poly([P(ba, gb+7, 92),P(ba + sgn*30, gb+7, 92),P(ba, gb+7, 64)], '#4a4038');
      poly([P(GA0-32,gb+38,112),P(GA1+32,gb+38,112),P(GA1+32,gb,158),P(GA0-32,gb,158)],
           shade(roofc,1.04));
      for(let i=1;i<6;i++){
        const t = i/6, bb = gb+38 - 38*t, zz = 112 + 46*t;
        poly([P(GA0-30,bb,zz),P(GA1+30,bb,zz),P(GA1+30,bb-1.6,zz-2),P(GA0-30,bb-1.6,zz-2)],
             shade(roofc,.88));
      }
      poly([P(GA0-32,gb,158),P(GA1+32,gb,158),P(GA1+32,gb-38,112),P(GA0-32,gb-38,112)],
           shade(roofc,.72));
      slab(GA0-34, GA1+34, 158, 165, gb+5, gb-5, shade(roofc,.58));
      const o = P(0,gb,0), pa = P(1,gb,0), ge = (pa.y - o.y) > 0 ? GA1+32 : GA0-32;
      poly([P(ge,gb+38,112),P(ge,gb,158),P(ge,gb-38,112)], shade(wall,.9));
    }
  }
},
{
  name:'Model shop', head:'Biplane on a bracket, kites in the window, glazing-bar grid',
  tags:['biplane as one extruded solid','banked wings','kites behind the glass','glazing bar grid','bright'],
  desc:'The biplane is one extruded outline -- nose taper, cockpit notch, headrest and fin all cut from the same loop -- hung from a bracket that actually reaches the top wing, holding a bank, with the far wing halves, struts and tailplane drawn before the body and the near halves after it. The kites hang inside the window recess where the stock lives, and the tiny panes are glazing bars in front of one real sheet rather than fifteen painted rectangles.',
  draw(p){
    /* ================= WHAT WAS WRONG =================
       Twelve faults, and the two that mattered most were both openings.

       A WINDOW ACROSS THE DOOR, instance 22. F(W*0.80, W-14, 52, 90) ran
       a 184..216 against an opening at 158.76..225 -- shopDoor clamps
       W*0.86 = 197.8 down to 191.88 -- so a pale blue panel sat over the
       middle of the doorway, at b -6.5, behind the wall it was painted
       on. Gone. A 230 frontage has room for one window and it already
       had one.

       AND THE TWO OPENINGS TOUCHED. Display window to a 161 against a
       door surround starting at mid - 37.12 = 154.76: a 6.2 overlap
       where a pier belongs. Set out again as
         12 pier | 118 window | 12 pier | 74.24 door | 13.76 pier
       which puts the door mid on 179.12 -- inside the clamp, so the
       number in the call is the number on the wall.

       THE WINDOW WAS A FLAT RECTANGLE with fifteen opaque rectangles
       painted on it, and the fifteen died under a depth key anyway: the
       pane slab ran b -1..-5 and the model inside it sat at -5.5, deeper
       than the pane's own back face and inset 3 within it, so a + b + z
       paints the model first and the opaque front covers it. One real
       recess now, one real sheet, and the tiny panes are glazing bars
       standing at b 1 in FRONT of the glass, which is what a glazing bar
       is.

       THE KITES WERE INSIDE THE MASONRY, instance 17: kb -8, -11, -14
       with no hole in the wall to be inside of, and z 114..142 laid them
       across the fascia band with the third one over the door surround.
       Negative b is only legal behind an opening, so they hang in the
       recess -- which is also where a model shop's kites would be. */
    const wall = '#2f5f8a', trim = '#f0e2c0', iron = '#8d979f', H = 160;
    const zk = 1/ZSCALE;
    body(wall, trim, H);
    slab(0,W, H, H+10, -1, -12, trim);

    /* ---- the window: one recess, real glass, bars in front of it ---- */
    reveal(12, 130, 22, 104, 12, shade(wall,.42));
    for(let r=0;r<2;r++){
      const z = 26 + r*22;
      slab(16, 116, z-3, z, -3, -11, '#5a4634');
      for(let i=0;i<5;i++){
        const x0 = 18 + 96*(i+0.10)/5, x1 = 18 + 96*(i+0.90)/5;
        const col = ['#c2452e','#e8c34a','#7ac48a','#7a9ab0','#e2748c'][(r*2+i)%5];
        box(x0, x1, -9, -5, z, z+14, shade(col,1.14), col, shade(col,.78));
      }
    }
    for(let i=0;i<3;i++){
      const ka = 30 + i*36, kb = -7, kz = 86, hz = 15, kw = 9;
      const col = ['#e8564a','#7ac48a','#e8c34a'][i];
      poly([P(ka,kb,kz+hz),P(ka+kw,kb,kz),P(ka,kb,kz-hz),P(ka-kw,kb,kz)],
           col, shade(col,.55), 1.2);
      tube(ka, kb, kz-hz, ka, kb, kz+hz, 0.5, shade(col,.5));
      tube(ka-kw, kb, kz, ka+kw, kb, kz, 0.5, shade(col,.5));
      tube(ka, kb, kz+hz, ka, kb, 103, 0.4, '#d8cbb0');          // hung from the head
      for(let k=0;k<2;k++){
        const bz = kz-hz-3-k*4, off = k%2 ? 3 : -3;
        poly([P(ka+off-3,kb,bz),P(ka+off+3,kb,bz-1),P(ka+off,kb,bz-4)], shade(col,1.12));
      }
    }
    glaze(12, 130, 22, 104, trim, 'rgba(120,164,186,.40)');
    for(let i=1;i<5;i++){ const x = 12 + 118*i/5;
      F(x-1.3, x+1.3, 22, 104, shade(trim,.82), null,0, 1); }
    for(let j=1;j<3;j++){ const z = 22 + 82*j/3;
      F(12, 130, z-1.3, z+1.3, shade(trim,.82), null,0, 1); }
    slab(9, 133, 12, 22, 3, -1, shade(wall,.66));                 // cill, projecting

    shopDoor(179.12, wall, trim);

    /* ---- fascia ----
       Was slab(6, W-6, 120, 148, -1, -9): 6 of margin against 9 of
       recess, so both ends came out 3 past the building's return, and
       the lettering at b -9.5 was 0.5 BEHIND the board's own back face.
       The chemist/barber/locksmith resolution: 14 of margin over a
       7-deep recess, plate at bFront + 0.5. The plate is dark because
       the aeroplane crosses it, which is what a bracket sign does. */
    slab(14, W-14, 120, 150, -1, -7, shade(wall,1.25), null, trim);
    F(22, W-22, 126, 144, shade(wall,.60), null, 0, -0.5);

    /* ================= THE BIPLANE =================
       WAS TWO AEROPLANES. cyl() is vertical-only, so the "fuselage
       cylinder" was a barrel r10 by 18 tall -- 27 on screen once ZSCALE
       had it -- and then a flat quad drew the real silhouette straight
       over the top of it. The quad had no reversal anywhere in its
       outline: no nose taper, no cockpit, no fin junction, so it read as
       a red lozenge with square plates near it. One prism now, one
       outline, and every one of those features is a reversal cut from
       the same loop.

       THE WINGS WERE SQUARE: 51 chord against 48 span on top, 45 by 42
       below. A wing at 1:1 is a plate. 16 chord on a 36 span here, and
       they are quads rather than slabs so the bank is real -- slab()
       cannot tilt, which is why the old "banking" amounted to 3 units of
       slope on the fuselage quad and nothing else.

       THE FAR STRUTS SHOWED THROUGH THE BODY, instance 13: both pairs
       were drawn after the fuselage and both crossed it. Split at the
       centreline now -- far wing halves, far struts, far tailplane, then
       the body, then the near half of each -- which is the same rule
       that says anything longer than its neighbours is split before it
       enters a depth sort.

       THE BRACKET WAS INVERTED AND JOINED TO NOTHING. slab(..., 8, 12)
       had bBack NEARER the street than bFront, so slab() picked the
       wrong end face and drew it inside out; it started at b 8 rather
       than at the wall; the arm started at b 10, two units off it; and
       the arm's outer end landed in clear air between the fuselage top
       and the underside of the top wing. Wall plate on the wall, arm to
       the top wing centre, and the arm rides just over the far wing on
       its way there.

       AND IT HUNG OFF THE BUILDING. Screen-a is a - b on edges 1 and 3
       and a + b on 0 and 2, so a b of 48..72 swings the object that far
       each way: the tailplane measured screen-a -16.8 and the fin -9.8,
       both onto the neighbour's frontage. Locksmith's budget is
       half-length + b_max <= W/2 = 115; the old plane needed 126. This
       one is centred on 115 at b 30 with an 18 half-span, and the widest
       excursion measured is 62..174. */
    const pa = 115, pb = 30, pz = 140, BANK = 0.26, red = '#c2452e';
    const ct = Math.cos(0.13), st = Math.sin(0.13);
    const QW = (u,v,b) => ({ a: pa + u*ct - v*st, b:b,
                             z: pz + (u*st + v*ct - (b-pb)*BANK)*zk });
    const Q  = (u,v,b) => { const q = QW(u,v,b); return P(q.a,q.b,q.z); };
    /* u runs along the axis, nose positive; v is world height, so it is
       divided back by ZSCALE on the way out and the aeroplane keeps its
       proportions whatever vertical scale the shop is drawn at. */
    /* THE FIN IS NOT PART OF THE FUSELAGE. First cut had it cut from the
       same loop, so it was extruded to the body's own 10 of width and
       came out as thick as it was broad -- a red block that swallowed
       the tailplane whole. A fin is a plate: its own outline, its own
       3 of thickness, drawn after the body it stands on. */
    const OUT = [[33,0],[29,4],[19,6.5],[11,7],[9,7],[7.5,3],[1.5,3],[0,7],[-2,8.5],[-4,7],
                 [-18,6],[-27,5],[-33,2.5],
                 [-33,-1.5],[-21,-5],[-7,-6.5],[7,-7],[21,-6],[29,-4]];
    const FIN = [[-19,5],[-25,20],[-31,21],[-32,4.5]];
    const wing = (uLE,uTE,vv,bA,bB,col,cap) => {
      poly([Q(uLE,vv,bA),Q(uLE,vv-2.5,bA),Q(uLE,vv-2.5,bB),Q(uLE,vv,bB)], shade(col,.70));
      poly([Q(uTE,vv,bA),Q(uTE,vv-2.5,bA),Q(uTE,vv-2.5,bB),Q(uTE,vv,bB)], shade(col,.56));
      if(cap !== undefined)
        poly([Q(uLE,vv,cap),Q(uTE,vv,cap),Q(uTE,vv-2.5,cap),Q(uLE,vv-2.5,cap)], shade(col,.64));
      poly([Q(uLE,vv,bA),Q(uTE,vv,bA),Q(uTE,vv,bB),Q(uLE,vv,bB)], col);
    };
    const strut = (u,b) => { const l = QW(u,-9,b), t = QW(u,14,b);
      tube(l.a,l.b,l.z, t.a,t.b,t.z, 1.4, iron); };
    const wire  = (u0,v0,u1,v1,b) => { const m = QW(u0,v0,b), n = QW(u1,v1,b);
      tube(m.a,m.b,m.z, n.a,n.b,n.z, 0.45, shade(iron,1.18)); };

    slab(pa-2.5, pa+2.5, 136, 154, 3.5, 0, iron);                 // wall plate, on the wall
    // ---- far half ----
    wing( 8,-8, -9, pb-18, pb, '#e8e2d4', pb-18);                 // lower
    wing(13,-3, 14, pb-18, pb, trim,      pb-18);                 // upper
    wing(-20,-30,  0, pb-11, pb, shade(red,1.10), pb-11);        // tailplane
    { const e = QW(5,14,pb);                                      // arm, over the far wing
      tube(pa, 3, 151, e.a, e.b, e.z, 2.2, iron);
      tube(pa, 3, 138, pa+(e.a-pa)*0.42, 3+(pb-3)*0.42, 151-(151-e.z)*0.42, 1.1, iron); }
    strut(6, pb-15); strut(-4, pb-15);
    wire(6,-9,-4,14, pb-15); wire(-4,-9,6,14, pb-15);
    // ---- the body ----
    prism(OUT.map(([u,v]) => { const q = QW(u,v,pb); return [q.a, q.z]; }),
          pb-5, pb+5, red, shade(red,.66), shade(red,1.20));
    poly([Q(7.5,3.2,pb+5.3),Q(1.5,3.2,pb+5.3),Q(1.5,-1.4,pb+5.3),Q(7.5,-1.4,pb+5.3)],
         '#2b2118');                                              // the cockpit is a hole
    prism(FIN.map(([u,v]) => { const q = QW(u,v,pb); return [q.a, q.z]; }),
          pb-1.6, pb+1.6, shade(red,1.10), shade(red,.70), shade(red,1.26));
    for(const cb of [pb-4, pb+4]){ const c0 = QW(6,7,cb), c1 = QW(6,14,cb);
      tube(c0.a,c0.b,c0.z, c1.a,c1.b,c1.z, 1.1, iron); }          // cabane struts
    // ---- near half ----
    wing(-20,-30,  0, pb, pb+11, shade(red,1.10), pb+11);
    strut(6, pb+15); strut(-4, pb+15);
    wire(6,-9,-4,14, pb+15); wire(-4,-9,6,14, pb+15);
    wing( 8,-8, -9, pb, pb+18, '#e8e2d4', pb+18);
    wing(13,-3, 14, pb, pb+18, trim,      pb+18);
    /* THE PROPELLER WAS A RECTANGLE: a 5 by 42 dark slab, no hub, no
       disc. A propeller disc stands perpendicular to the axis, so it
       lives in the b-z plane -- no primitive draws that, but the circle
       is two lines to build off P() directly, with the z radius divided
       by ZSCALE the way every circle in this file has to be. */
    { const R = 11, pp = [];
      for(let i=0;i<=24;i++){ const t = Math.PI*2*i/24;
        pp.push(Q(33, R*Math.sin(t), pb + R*Math.cos(t))); }
      poly(pp, 'rgba(226,232,238,.16)', 'rgba(226,232,238,.34)', 1);
      const l0 = QW(33,-R,pb), l1 = QW(33,R,pb), hb = QW(33,0,pb);
      tube(l0.a,l0.b,l0.z, l1.a,l1.b,l1.z, 1.2, '#3a4046');
      ball(hb.a, hb.b, hb.z, 3.4, shade(iron,1.12)); }

    if(state.roof) box(W*0.60,W*0.86,-150,-110,H,H+20,'#8f969d','#787f86','#697077');
    kerb(p,'none');
  }
},
{
  name:'Home store', block:true, ww: 1048.8, dd: 1048.8,
  wTodo:'a whole block edge -- five packing slots, and the packer places none of them',
  cTodo:'store box, entrance tower, garden cage, pylon sign, light masts, islands and trolley bays need volumes; the car park itself is drivable',
  head:'Big-box home store on a whole block: car park, garden centre, pylon sign',
  tags:['block landmark','drivable car park','painted bays','garden centre cage','pylon sign','entrance tower'],
  desc:'A warehouse retail shed set at the back of its own car park, which is the way the type is actually laid out: the building is a long blank box with one tall glazed entrance tower and a name band, and everything in front of it is ground -- painted bays, kerbed islands, light masts, trolley bays -- with a caged garden centre on the right flank and a pylon sign out on the corner.',
  draw(p){
    /* ============ A BIG-BOX STORE, NOT A GOODS DEPOT ============
       This entry was a freight depot on a 230 slot, then a freight depot
       on a block. Sir wants the retail type, and the retail type is a
       different building with a different plan: a warehouse shed pushed
       to the BACK of the lot so the front two thirds can be car park,
       because the car park is what a customer meets first and what the
       type is organised around.

       IT IS STILL A LANDMARK on the BLOCK LANDMARKS test at the head of
       this file -- ask what the building does at its own front door. A
       big-box store's front door opens onto its own parking, three
       hundred units back from the street, and cars enter over dropped
       kerbs rather than at a gate. So it is case 4, freestanding on a
       square lot, and it is drivable in the Nursery's sense: the car
       park is ground, not building.

       WHAT CARRIES OVER from the depot rebuild, because it was right:
       the lot is 1048.8 square, nothing crosses the boundary, and the
       raised dock survives -- moved to the BACK where a service yard
       belongs on this type, rather than being the front elevation.

       THE PLAN.
         b 0..-30       kerb and planting, broken at two crossovers
         b -30..-440    car park: three bay rows, an aisle, islands
         b -440..-500   the front walk, concrete, on the store's line
         b -500..-1010  the store, a 40..760; garden cage a 760..1020
         back           service dock, drawn because three of the four
                        streets see it

       THE SILHOUETTE IS THE PARAPET. A shed of this kind is a low box
       whose front wall runs up past the roof to hide the plant, so the
       walls are built to PZ and the roof DECK is a plate inset 12 and
       dropped 16 -- the box's own top plate becomes the parapet rim
       rather than being a lid drawn on top of one. One volume, no seam.

       AND IT WAS A CUBE. First pass built the walls to 352 on a 720 by
       510 footprint, which is 2.1 shop storeys and read as a three
       storey block rather than a shed -- exactly the SCALE REVIEW
       failure in the other direction, a building drawing more storeys
       than its type has. A warehouse store is ONE tall storey: 236 is
       1.4, the parapet does the rest of the silhouette, and the
       entrance tower at 288 is the only thing that goes past it.

       NO BRAND. The band and the sign panel carry blocks where letters
       would be, the way every other name board in this file does. */
    const LOT = 1048.8;
    const wall = '#7d8287', band = '#e2691f', conc = '#a2a6a4', asph = '#6b6f6c';
    const roofc = '#5f666c', glass = 'rgba(126,166,186,.72)';
    const SA0 = 40, SA1 = 760, SB0 = -500, SB1 = -1010, PZ = 236, RD = 220;
    const GA0 = 760, GA1 = 1020, GB0 = -500, GB1 = -860, GH = 148;
    const EA0 = 330, EA1 = 540, EB = -436, EZ = 288;      // entrance tower
    const XO = [[120,268],[610,758]];                      // the two crossovers

    /* ---- the ground, and everything painted on it ---- */
    T(0, LOT, -LOT, 0, 0, asph);
    T(SA0-24, GA1, SB0, -440, 4, conc);                    // the front walk
    const stall = (b0, b1) => {                            // one row of painted bays
      T(56, 1000, b1-3, b1+3, 0.6, '#d9d5c6');
      for(let x=56; x<=1000.1; x+=48) T(x-2.5, x+2.5, b0, b1, 0.6, '#d9d5c6');
    };
    stall(-86, -172); stall(-172, -258); stall(-344, -430);
    for(let i=0;i<2;i++){                                  // accessible bays, by the entrance
      const x0 = 392 + i*48;
      T(x0+2, x0+46, -344, -430, 0.7, '#3f6b9a');
      T(x0+18, x0+30, -370, -404, 0.9, '#d9d5c6');
    }
    for(const [c0,c1] of XO) T(c0, c1, -30, 0, 0.6, conc); // crossover aprons

    /* ---- the service dock, at the back ----
       Three of the four streets look at this side, so it is built even
       though this camera never sees it -- the Bathhouse's note about far
       entrances, and the reason the depot's fence was drawn all the way
       round. */
    T(SA0, SA1, SB1, SB1+70, 46, shade(conc,1.10));
    F(SA0, SA1, 0, 46, shade(conc,.70), null, 0, SB1+70);
    for(let i=0;i<3;i++){
      const x0 = 120 + i*200;
      F(x0, x0+130, 46, 158, '#20242a', null, 0, SB1+1);
      slab(x0-7, x0+137, 158, 174, SB1-9, SB1+2, shade(wall,1.14));
    }

    /* ---- the store: one volume to the parapet, roof deck inset ---- */
    box(SA0, SA1, SB1, SB0, 0, PZ, shade(wall,1.16), wall, shade(wall,.80));
    T(SA0+12, SA1-12, SB1+12, SB0-12, RD, roofc);
    if(state.roof){
      for(const [ra,rb] of [[180,-620],[340,-780],[520,-640],[640,-840]]){   // rooftop plant
        box(ra-46, ra+46, rb-34, rb+34, RD, RD+26, shade(roofc,1.30), shade(roofc,1.06), shade(roofc,.86));
        box(ra-30, ra+30, rb-20, rb+20, RD+26, RD+32, shade(roofc,1.40), shade(roofc,1.14), shade(roofc,.92));
      }
      cyl(SA1-70, -900, RD, RD+44, 7, '#6d747c');
    }

    /* ---- the front elevation ---- */
    F(SA0+2, SA1-2, 0, 20, shade(wall,.68), null, 0, SB0+0.6);              // plinth
    for(let i=0;i<=8;i++)                                                    // wall joints
      F(SA0 + (SA1-SA0)*i/8 - 4, SA0 + (SA1-SA0)*i/8 + 4, 20, 224, shade(wall,1.07), null, 0, SB0+0.8);
    F(SA0+2, SA1-2, 182, 218, band, null, 0, SB0+1.2);                       // the name band
    for(let k=0;k<9;k++) F(SA0+34+k*76, SA0+86+k*76, 190, 210, shade(wall,.42), null, 0, SB0+1.7);
    F(SA0+2, SA1-2, 218, 225, shade(band,.72), null, 0, SB0+1.2);
    for(const [w0,w1] of [[176,318],[556,700]]){                             // glazed runs
      slab(w0-6, w1+6, 14, 152, SB0+7, SB0-2, shade(wall,.72));
      F(w0, w1, 20, 146, glass, null, 0, SB0+7.5);
      for(let k=1;k<5;k++) F(w0+(w1-w0)*k/5-2, w0+(w1-w0)*k/5+2, 20, 146, shade(wall,1.2), null, 0, SB0+8);
    }

    /* ---- the entrance tower ----
       Projects 64 in front of the wall and runs 50 past the parapet,
       which is what makes a blank 720 shed read as having a front door
       at all. Doors are openings cut in the glazed screen rather than
       panels painted on it. */
    box(EA0, EA1, SB0, EB, 0, EZ, shade(wall,1.20), shade(wall,1.06), shade(wall,.84));
    F(EA0+8, EA1-8, 14, 164, shade(wall,.66), null, 0, EB+0.6);              // screen surround
    F(EA0+14, EA1-14, 20, 158, glass, null, 0, EB+1.2);
    for(const d0 of [EA0+30, EA0+118]){                                      // two door pairs
      F(d0, d0+62, 20, 124, '#2b3138', null, 0, EB+1.6);
      F(d0+2, d0+30, 22, 122, 'rgba(150,190,206,.80)', null, 0, EB+2.0);
      F(d0+32, d0+60, 22, 122, 'rgba(150,190,206,.80)', null, 0, EB+2.0);
      F(d0+29, d0+33, 20, 124, shade(wall,1.3), null, 0, EB+2.4);
    }
    F(EA0+14, EA1-14, 194, 272, band, null, 0, EB+1.2);                      // the sign panel
    for(let k=0;k<4;k++) F(EA0+30+k*46, EA0+66+k*46, 208, 258, shade(wall,.40), null, 0, EB+1.7);
    /* THE CANOPY WAS INVERTED, and it is the same fault this entry's
       predecessor had at its bracket: slab() takes bFront then bBack and
       bFront is the NEARER face, so writing (EB-16, EB+2) put the back
       of the canopy 18 units in front of its own front and slab() picked
       the wrong end to return. It projects toward the car park now,
       which is the direction a canopy over a door projects. */
    slab(EA0-18, EA1+18, 164, 186, EB+34, EB+2, shade(wall,.60), null, shade(wall,.9));
    F(EA0-18, EA1+18, 164, 172, band, null, 0, EB+34.5);
    for(const ca of [EA0+4, (EA0+EA1)/2, EA1-4])                             // canopy ties
      tube(ca, EB+2, 186, ca, EB+32, 178, 1.6, shade(wall,1.2));

    /* ---- the garden centre, caged, on the right flank ----
       Open to the sky under a shade lattice, which is the whole
       difference between a garden centre and another room: it is a
       fenced piece of GROUND with the store's wall as one side. */
    T(GA0, GA1, GB1, GB0, 1, '#8f8a78');
    const mesh = (axis, fixed, v0, v1, h) => {
      const q = (v,z) => axis === 'a' ? P(v, fixed, z) : P(fixed, v, z);
      poly([q(v0,0),q(v1,0),q(v1,h),q(v0,h)], 'rgba(154,162,164,.16)');
      const n = Math.max(2, Math.round(Math.abs(v1-v0)/30));
      for(let i=0;i<=n;i++){ const v = v0 + (v1-v0)*i/n;
        const a = q(v,0), b = q(v,h);
        ctx.strokeStyle = '#9aa0a2'; ctx.lineWidth = 1; ctx.beginPath();
        ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke(); }
      for(let k=0;k<=6;k++){ const z = h*k/6, a = q(v0,z), b = q(v1,z);
        ctx.strokeStyle = '#9aa0a2'; ctx.lineWidth = 1; ctx.beginPath();
        ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke(); }
      const c = q(v0,h), d = q(v1,h);
      ctx.strokeStyle = shade(wall,.9); ctx.lineWidth = 3; ctx.beginPath();
      ctx.moveTo(c.x,c.y); ctx.lineTo(d.x,d.y); ctx.stroke();
    };
    mesh('a', GB1+6, GA0, GA1, GH);                                          // back
    mesh('b', GA1-6, GB0, GB1, GH);                                          // right
    for(const [ga,gb] of [[GA0,GB1+6],[GA1-6,GB1+6],[GA1-6,GB0]]) cyl(ga, gb, 0, GH+8, 6, shade(wall,.78));
    if(state.props){
      const plant = (pa, pb, s, col) => {
        cyl(pa, pb, 0, 16*s, 11*s, '#8a5a3a');
        plateCircle(pa, pb, 16*s, 9*s, '#4a3a26');
        cyl(pa, pb, 16*s, 30*s, 3*s, '#6b5a3a');
        for(let k=0;k<4;k++) ball(pa + 10*s*Math.cos(k*1.57+0.4), pb + 10*s*Math.sin(k*1.57+0.4), 34*s, 11*s, col);
      };
      for(let r=0;r<3;r++){                                                  // staging, far to near
        const bb = GB1 + 90 + r*110;
        slab(GA0+26, GA1-26, 40, 48, bb+24, bb-24, '#8a6f4e', null, shade('#8a6f4e',1.18));
        for(const la of [GA0+40, GA0+110, GA1-40]) cyl(la, bb, 0, 40, 6, shade('#8a6f4e',.8));
        for(let i=0;i<6;i++)
          plant(GA0+42 + i*34, bb, 0.62, ['#4e8058','#3f6b4a','#c26a7e','#e8c34a','#6b9a52','#b4674a'][i]);
      }
      for(let i=0;i<3;i++)                                                    // bagged compost
        for(let k=0;k<3;k++)
          box(GA0+30+i*72, GA0+92+i*72, GB0-60, GB0-14, k*15, k*15+15,
              '#5a5348','#6b6355','#4a443b');
    }
    for(let k=0;k<7;k++)                                                     // shade lattice overhead
      tube(GA0+8, GB1+14+k*(GB0-GB1-28)/6, GH, GA1-8, GB1+14+k*(GB0-GB1-28)/6, GH, 2, shade(wall,.86));
    /* the cage front has a GATE in it. First pass ran the mesh the whole
       width, so a garden centre a customer is meant to walk into had no
       way in -- the same fault the old depot's own comment admitted to
       about foot access, one building later. */
    mesh('a', GB0-6, GA0, GA0+84, GH);
    mesh('a', GB0-6, GA1-84, GA1, GH);
    for(const ga of [GA0+84, GA1-84]) cyl(ga, GB0-6, 0, GH+8, 6, shade(wall,.78));
    slab(GA0+78, GA1-78, GH+8, GH+34, GB0-1, GB0-11, shade(wall,1.10), null, shade(wall,1.28));
    F(GA0+92, GA1-92, GH+14, GH+28, band, null, 0, GB0-0.5);

    if(state.props){
      /* ---- the car park, far to near ---- */
      const island = (a0, a1, bb) => {
        box(a0, a1, bb-38, bb+38, 0, 12, shade(conc,1.06), shade(conc,.84), shade(conc,.70));
        for(const ta of [a0+34, (a0+a1)/2, a1-34]){
          cyl(ta, bb, 12, 46, 5, '#6b5a3a');
          for(let k=0;k<4;k++) ball(ta + 11*Math.cos(k*1.57+0.5), bb + 11*Math.sin(k*1.57+0.5), 56, 13, ['#3f6b4a','#4e8058','#568a5e'][k%3]);
          ball(ta, bb, 66, 12, '#4e8058');
        }
      };
      const mast = (ma, mb) => {
        cyl(ma, mb, 0, 16, 11, shade(conc,.8));
        cyl(ma, mb, 16, 172, 5, '#8d949a');
        for(const d of [-26, 26]){
          tube(ma, mb, 172, ma+d, mb, 176, 2.4, '#8d949a');
          box(ma+d-20, ma+d+20, mb-13, mb+13, 170, 180, '#c9ced2','#a6acb1','#8d949a');
        }
      };
      const corral = (ca, cb) => {
        for(const aa of [ca, ca+96]) for(const z of [30, 58])
          tube(aa, cb+30, z, aa, cb-30, z, 1.8, '#9aa0a2');
        for(const aa of [ca, ca+96]) for(const bb of [cb+30, cb-30]) cyl(aa, bb, 0, 62, 3, '#9aa0a2');
        for(let k=0;k<4;k++){
          const x = ca + 16 + k*20;
          box(x, x+26, cb-18, cb+18, 12, 40, '#b8bec2','#9aa0a2','#868c90');
          for(const bb of [cb-18, cb+18]) tube(x+2, bb, 12, x+2, bb, 46, 1.4, '#9aa0a2');
        }
      };
      /* ---- ORDER VERSUS DEPTH, and it was drawn backwards ----
         The car park was painted islands, masts, corrals, then the front
         walk -- and the front walk is the FARTHEST thing in this block.
         The walk bollards sit at b -452 against masts at b -301, so two
         of them were painted straight through a mast that stands 150
         units in front of them.

         Measured rather than eyeballed, because only one of the two is
         visible enough to notice. Screen-a is a - b:

           bollard a 280  ->  732      mast a 430  ->  731     1 apart
           bollard a 720  -> 1172      mast a 880  -> 1181     9 apart

         Two fixes, and both are needed. The block is ordered far to near
         now -- b -452, then -301, then -58 -- which makes the occlusion
         correct. But correct occlusion of a bollard that stands exactly
         behind a mast base is still a bollard nobody can see, so the
         masts move off the line as well: 470 and 820 put 39 and 51
         between them and the nearest bollard.

         The bagged goods on the walk are gone at Sir's direction. */
      for(let i=0;i<7;i++){                                    // front walk, farthest
        const ba = 60 + i*110;
        if(ba > EA0-30 && ba < EA1+30) continue;
        cyl(ba, -452, 0, 30, 6, band);
        plateHoop(ba, -452, 21, 6, shade(band,.6), 3);
        ball(ba, -452, 30, 6, shade(band,1.14));
      }
      island(64, 260, -301);  island(560, 756, -301);          // then the back row
      mast(470, -301);        mast(820, -301);
      corral(300, -301);
      island(64, 260, -58);   island(800, 996, -58);           // then the front row
      mast(430, -58);
      corral(560, -58);
    }

    /* ---- the pylon sign, out on the corner ---- */
    { const PA = 196, PB = -62;
      for(const d of [-38, 38]) cyl(PA+d, PB, 0, 196, 8, shade(wall,.72));
      slab(PA-68, PA+68, 196, 312, PB+9, PB-9, shade(wall,1.12), null, shade(wall,1.3));
      F(PA-60, PA+60, 203, 305, band, null, 0, PB+9.5);
      for(let k=0;k<4;k++) F(PA-46, PA+46, 213+k*23, 228+k*23, shade(wall,.40), null, 0, PB+10);
      box(PA-46, PA+46, PB-26, PB+26, 0, 18, shade(conc,1.06), shade(conc,.84), shade(conc,.70));
    }

    /* ---- the kerb and planting on the street line ----
       Nearest thing on the lot, so it is drawn last, and broken at the
       two crossovers -- the front boundary is the one place the sign of
       b can still go wrong, because it is the only side whose edge is
       b 0 rather than a coordinate you have to type. */
    const runs = [[0, XO[0][0]], [XO[0][1], XO[1][0]], [XO[1][1], LOT]];
    for(const [r0,r1] of runs){
      if(r1 - r0 < 6) continue;
      box(r0, r1, -30, -2, 0, 14, shade(conc,1.04), shade(conc,.82), shade(conc,.68));
      if(state.props) for(let x = r0+26; x < r1-18; x += 54)
        ball(x, -16, 24, 16, ['#4e8058','#568a5e','#3f6b4a'][Math.round(x/54)%3]);
    }
  }
},
{
  name:'Drugstore', block:true, ww: 1048.8, dd: 1048.8,
  wTodo:'a whole block edge -- five packing slots, and the packer places none of them',
  cTodo:'store, entrance tower, canopy and columns, pylon sign, kerb islands and the bin store need volumes; the car park and the drive lane are both drivable',
  pTodo:'the drive lane sits on ONE flank, so on the two mirrored headings it is behind the building -- the plan is handed and the packer has to know which way round to place the lot',
  head:'Suburban drugstore on a whole block: drive-through pharmacy lane, parking',
  tags:['block landmark','drive-through pharmacy','pickup window','drivable lane','corner entrance tower','red band'],
  desc:'The suburban drugstore type rather than the chemist shopfront: a low box across the back of its own car park with a covered drive lane wrapping one flank, and the pharmacy pickup window built into that flank with a chute, an intercom post and a stop line painted on the ground in front of it.',
  draw(p){
    /* ============ WHY THIS IS NOT THE THIRD CHEMIST ============
       Dispensary and Pharmacy are already here, and they are the right
       thing: a chemist shopfront in a terrace, one body in two liveries.
       This is a different building that happens to sell the same goods.

       AND THE DRIVE-THROUGH DECIDES THE PLACEMENT. The BLOCK LANDMARKS
       test is to ask what the building does at its own front door. This
       one has a second door that a CAR stops at, and a car cannot queue
       on a footway -- that is off-street circulation by definition, so
       it is case 4, freestanding on a square lot. The three-slot tier
       would have held the building and not the lane.

       THE FIRST LAYOUT PUT THE BUILDING AT THE FRONT and left half the
       lot as bare asphalt -- 560 by 400 of it, with the store's own
       parking crammed down one side. A drugstore lot is a car park with
       a store across the back of it, the same organisation as the Home
       store and for the same reason: what the customer meets first is
       the parking. The two are kept apart by everything else -- this
       building is a third the footprint, it has a drive lane wrapping a
       flank, and its entrance is a tower on the corner nearest the road.

         b -60..-500    the car park, four ranks and an aisle
         b -500..-540   the walk at the store front
         b -540..-900   the store, a 220..760
         a 800..960     the drive lane, in at the front, out at the back
         a 760..972     the canopy, over the pickup window in the flank

       EVERY PIECE OF CAR PARK FURNITURE STANDS AT b > -500, in front of
       the store's own front wall. That is not decoration: the first pass
       had a light mast at b -560 and a 151, which is screen-a 711 --
       inside a store occupying 720..1660 on screen -- and props are
       drawn after the building, so the mast was painted straight through
       the roof. Keeping the furniture in front of the frontage makes
       call order and depth order the same thing, which is the only
       version of that rule that survives a port.

       WHAT WAS WRONG with the Apothecary this replaces, all five
       measured:

         F(W*0.76, W-14, 54, 92) ran a 174.8..216 against a door opening
           at 158.76..225 -- a panel across the doorway, the 23rd
         the jar shelf was slab(..., -1, 14): bBack NEARER the street
           than bFront, so slab() drew it inside out
         the jars stood at b +5, outside their own glass, on the footway
         the mortar and pestle sat at b -10 with no opening there --
           inside the masonry, over the door
         the herb bunches hung at b +26, screen-a -10, onto the
           neighbour's frontage on the mirrored headings

       and the fTodo fascia, 6 of margin against 9 of recess with the
       lettering half a unit behind the board's own back face. */
    const LOT = 1048.8;
    const wall = '#d2cabb', band = '#b8322c', conc = '#a8aca8', asph = '#6b6f6c';
    const trim = '#b0aa9e', dark = '#7a746a', glass = 'rgba(126,166,186,.72)', roofc = '#6a7076';
    const SA0 = 220, SA1 = 760, SB0 = -540, SB1 = -900, PZ = 232, RD = 216;
    const EA0 = 258, EA1 = 408, EB = -500, EZ = 288;         // entrance tower
    const LA0 = 800, LA1 = 960;                              // the drive lane
    const CB0 = -646, CB1 = -816, AA = 846, CZ = 176;        // the awning
    const PW0 = -690, PW1 = -772;                            // the pickup window in b

    /* ---- the ground ---- */
    T(0, LOT, -LOT, 0, 0, asph);
    T(SA0-32, LA1, SB0, -480, 4, conc);                      // the walk at the store front
    /* THE LANE HAS TO READ AS A LANE. First pass laid it in
       shade(asph,1.12) on asphalt, which is a shade nobody sees; it is
       a paved strip with painted edges now, the way a drive-through
       lane is marked out on the ground in the world. */
    T(LA0, LA1, -40, -980, 1.5, shade(conc,.86));            // the drive lane
    for(const la of [LA0+6, LA1-6]) T(la-3, la+3, -40, -980, 2, '#d9d5c6');
    for(const ab of [-150, -330, -510]){                     // lane arrows, pointing IN
      const am = (LA0+LA1)/2;
      poly([P(am,ab-40,2),P(am-22,ab-6,2),P(am-8,ab-6,2),P(am-8,ab+34,2),
            P(am+8,ab+34,2),P(am+8,ab-6,2),P(am+22,ab-6,2)], '#d9d5c6');
    }
    T(LA0, LA1, PW0+18, PW0+26, 2, '#d9d5c6');               // stop line at the window
    const rank = (b0, b1) => {
      T(40, 780, b1-3, b1+3, 0.6, '#d9d5c6');
      for(let x=40; x<=780.1; x+=46) T(x-2.5, x+2.5, b0, b1, 0.6, '#d9d5c6');
    };
    rank(-110, -196); rank(-196, -282); rank(-350, -436);
    for(let i=0;i<2;i++){                                     // accessible bays, on the door axis
      const x0 = EA0 + 8 + i*46;
      T(x0+2, x0+44, -350, -436, 0.7, '#3f6b9a');
      T(x0+16, x0+30, -378, -410, 0.9, '#d9d5c6');
    }

    /* ---- the back: bin store and a staff door, because three of the
       four streets look at this side ---- */
    box(SA0+40, SA0+180, SB1-92, SB1-16, 0, 74, shade(dark,1.24), dark, shade(dark,.86));
    F(SA0+46, SA0+174, 0, 66, shade(dark,.86), null, 0, SB1-15.6);
    F(SA0+250, SA0+292, 0, 108, shade(wall,.52), null, 0, SB1-0.6);
    F(SA0+254, SA0+288, 0, 104, dark, null, 0, SB1-1.2);

    /* ---- the store: one volume to the parapet, roof deck inset ---- */
    box(SA0, SA1, SB1, SB0, 0, PZ, shade(wall,1.14), wall, shade(wall,.82));
    T(SA0+12, SA1-12, SB1+12, SB0-12, RD, roofc);
    if(state.roof){
      for(const [ra,rb] of [[340,-660],[500,-760],[640,-620]]){
        box(ra-40, ra+40, rb-30, rb+30, RD, RD+24, shade(roofc,1.34), shade(roofc,1.10), shade(roofc,.88));
        box(ra-26, ra+26, rb-18, rb+18, RD+24, RD+30, shade(roofc,1.44), shade(roofc,1.18), shade(roofc,.94));
      }
      cyl(SA0+58, -840, RD, RD+42, 6, '#6d747c');
    }

    /* ---- the front elevation ---- */
    F(SA0+2, SA1-2, 0, 16, shade(wall,.72), null, 0, SB0+0.6);
    F(SA0+2, SA1-2, 164, 200, band, null, 0, SB0+1.0);                   // the red band
    for(let k=0;k<6;k++) F(SA0+30+k*86, SA0+92+k*86, 172, 192, shade(wall,1.12), null, 0, SB0+1.5);
    F(SA0+2, SA1-2, 200, 208, shade(band,.72), null, 0, SB0+1.0);
    { const w0 = EA1 + 26, w1 = SA1 - 28;                                 // storefront glazing
      slab(w0-7, w1+7, 12, 150, SB0+8, SB0-2, trim);
      F(w0, w1, 18, 144, glass, null, 0, SB0+8.5);
      for(let k=1;k<6;k++) F(w0+(w1-w0)*k/6-2.4, w0+(w1-w0)*k/6+2.4, 18, 144, shade(trim,1.14), null, 0, SB0+9);
      F(w0, w1, 78, 82, shade(trim,1.10), null, 0, SB0+9);                // a shelf line behind it
    }

    /* ---- the entrance tower ---- */
    box(EA0, EA1, SB0, EB, 0, EZ, shade(wall,1.20), shade(wall,1.06), shade(wall,.86));
    F(EA0+8, EA1-8, 12, 160, trim, null, 0, EB+0.6);
    F(EA0+14, EA1-14, 18, 154, glass, null, 0, EB+1.2);
    { const d0 = EA0 + 40;                                                // one sliding pair
      F(d0, d0+70, 18, 126, '#2b3138', null, 0, EB+1.6);
      F(d0+2, d0+34, 20, 124, 'rgba(150,190,206,.80)', null, 0, EB+2.0);
      F(d0+36, d0+68, 20, 124, 'rgba(150,190,206,.80)', null, 0, EB+2.0);
      F(d0+33, d0+37, 18, 126, shade(trim,1.2), null, 0, EB+2.4);
    }
    F(EA0+10, EA1-10, 190, 272, band, null, 0, EB+1.2);                   // sign panel
    for(let k=0;k<3;k++) F(EA0+28+k*42, EA0+62+k*42, 206, 256, shade(wall,1.14), null, 0, EB+1.7);
    slab(EA0-18, EA1+18, 160, 180, EB+32, EB+2, trim, null, shade(trim,1.16));
    F(EA0-18, EA1+18, 160, 167, band, null, 0, EB+32.5);

    /* ================= THE DRIVE-THROUGH =================
       The lane runs up the a = SA1 flank and the window is IN that
       flank, so the plan is HANDED: on the two mirrored block edges the
       visible flank is a = SA0 and the lane is round the back. That is a
       fact about the plan rather than a drawing fault -- a real one is
       handed too -- but the packer has to be told which way round to lay
       the lot down, which is what pTodo says.

       S() draws on the a = aa plane, the one primitive in the kit that
       already speaks this face, so the window, its chute and its
       surround are geometry ON the wall rather than props floating
       beside it. */
    const e = 0.6;
    S(SA1+e, SB0, SB1, 0, 16, shade(wall,.72));                           // plinth, continued
    S(SA1+e, SB0, SB1, 164, 200, band);                                   // band, continued
    S(SA1+e, SB0, SB1, 200, 208, shade(band,.72));
    S(SA1+e*2, PW0+18, PW1-18, 30, 134, trim);                            // window surround
    S(SA1+e*3, PW0, PW1, 40, 124, glass);
    S(SA1+e*4, PW0-2, PW0-7, 40, 124, shade(trim,1.16));                  // mullion
    box(SA1, SA1+28, PW1+10, PW0-10, 52, 70, shade(trim,1.18), shade(trim,.94), trim);   // the chute

    /* THE INTERCOM POST STOOD IN THE LANE. It was at a 810 with the
       lane running 800..960, so it was a bollard planted in the middle
       of the running surface a car has to use -- gone at Sir's
       direction, and it would have needed a collision volume in a lane
       cTodo already calls drivable. */
    /* ================= THE CANOPY HID THE WINDOW =================
       First pass roofed the whole lane -- a plate at z 178 running the
       full 212 out to the lane's far edge -- and from this camera that
       plate covers the wall it is attached to. Derived rather than
       guessed: a soffit point (a_s, b_s, CZ) lands on the same screen
       pixel as a flank point (SA1, b_w, z_w) when

         a_s - b_s = SA1 - b_w        and
         (a_s+b_s)/2 - CZ*ZSCALE = (SA1+b_w)/2 - z_w*ZSCALE

       and eliminating b_w gives z_w = (SA1 + CZ*2*ZSCALE - a_s)/ZSCALE.
       Over a_s from 760 to 972 that is z_w 178 down to 36.7 -- the whole
       window, the chute and the sign, all of them behind their own roof.
       A real drive-through works because you sit UNDER the canopy; an
       isometric camera never does.

       So it is a cantilevered awning instead, out to a 846, which puts
       the bottom of its shadow at z 121 -- clear of a window whose head
       is 124 -- and the pharmacy sign goes on the awning's OUTER fascia
       where the lane can read it, which is where that sign lives in the
       world anyway. No columns, because a 86 cantilever does not need
       them and two posts in the lane would be two more things between
       the camera and the window. */
    T(SA1, AA, CB0, CB1, CZ, shade(wall,.88));                            // soffit
    slab(SA1, AA, CZ, CZ+22, CB0, CB1, trim, null, shade(trim,1.2));
    S(AA+0.6, CB0, CB1, CZ, CZ+22, band);                                 // fascia, facing the lane
    for(let k=0;k<3;k++) S(AA+1.2, CB0-16-k*40, CB0-44-k*40, CZ+5, CZ+17, shade(wall,1.16));
    for(const cb of [CB0-10, CB1+10])                                     // tie rods
      tube(SA1+4, cb, CZ+40, AA-8, cb, CZ+2, 2.2, shade(trim,.86));

    if(state.props){
      /* ---- the car park, all of it in FRONT of the store frontage ---- */
      const tree = (ta, tb) => {
        cyl(ta, tb, 12, 46, 5, '#6b5a3a');
        for(let k=0;k<4;k++) ball(ta + 11*Math.cos(k*1.57+0.5), tb + 11*Math.sin(k*1.57+0.5), 56, 13, ['#3f6b4a','#4e8058','#568a5e'][k%3]);
        ball(ta, tb, 66, 12, '#4e8058');
      };
      const islandA = (a0, a1, bb) => {                                   // a strip running along a
        box(a0, a1, bb-30, bb+30, 0, 12, shade(conc,1.06), shade(conc,.84), shade(conc,.70));
        for(let k=0;k<3;k++) tree(a0 + 46 + k*(a1-a0-92)/2, bb);
      };
      const mast = (ma, mb) => {
        cyl(ma, mb, 0, 16, 11, shade(conc,.8));
        cyl(ma, mb, 16, 168, 5, '#8d949a');
        for(const d of [-24, 24]){
          tube(ma, mb, 168, ma+d, mb, 172, 2.4, '#8d949a');
          box(ma+d-18, ma+d+18, mb-12, mb+12, 166, 176, '#c9ced2','#a6acb1','#8d949a');
        }
      };
      islandA(40, 300, -316);   islandA(520, 780, -316);                  // far, at the aisle
      mast(410, -316);
      for(let i=0;i<5;i++){                                               // bollards on the walk
        const ba = 250 + i*118;
        if(ba > EA0-16 && ba < EA1+16) continue;
        cyl(ba, -496, 0, 30, 6, dark);
        ball(ba, -496, 30, 6, shade(dark,1.24));
      }
      islandA(40, 300, -78);    islandA(520, 780, -78);                   // near, at the street
      mast(410, -78);
    }

    /* ---- the pylon sign, on the corner ---- */
    { const PA = 150, PB = -58;
      for(const d of [-30, 30]) cyl(PA+d, PB, 0, 176, 7, dark);
      slab(PA-56, PA+56, 176, 278, PB+8, PB-8, shade(wall,1.10), null, shade(wall,1.26));
      F(PA-49, PA+49, 183, 271, band, null, 0, PB+8.5);
      for(let k=0;k<3;k++) F(PA-38, PA+38, 194+k*26, 210+k*26, shade(wall,1.12), null, 0, PB+9);
      box(PA-38, PA+38, PB-22, PB+22, 0, 16, shade(conc,1.06), shade(conc,.84), shade(conc,.70));
    }

    /* ---- kerb and planting on the street line, broken at the parking
       crossover and at the lane mouth ---- */
    for(const [r0,r1] of [[0, 250],[430, LA0-40],[LA1+20, LOT]]){
      if(r1 - r0 < 6) continue;
      box(r0, r1, -28, -2, 0, 14, shade(conc,1.04), shade(conc,.82), shade(conc,.68));
      if(state.props) for(let x = r0+26; x < r1-18; x += 54)
        ball(x, -15, 24, 15, ['#4e8058','#568a5e','#3f6b4a'][Math.round(x/54)%3]);
    }
  }
},
{
  name:'Apartments over shop', tall:true, ww: 1048.8, dd: 620,
  wTodo:'a whole block edge -- five packing slots, and the packer emits no wide slot yet',
  kTodo:'reveal(), glaze() and shopDoor() are all nailed to the b = 0 plane; this body carries frame-general copies of the first two, and they should move into the kit',
  head:'A whole edge of flats over shops, elevated on all four faces',
  tags:['block width, on the line','shops on three faces','flats all the way round','wall frames','balconies with end returns'],
  desc:'A mansion block taking a whole block edge and built to the line, with a real elevation on every face rather than one front and three blank planes: shopfronts on the street and both cross-street flanks, flats over all four sides, and courses and a cornice that wrap the corners.',
  draw(p){
    /* ============ AN ELEVATION ON ALL FOUR FACES ============
       Sir asked for shop windows and flat windows the whole way round.
       On a whole-edge building that is the right ask and the old body
       could not do it: it had ONE elevation, on b = 0, and three blank
       planes, which is only defensible for a terrace unit with party
       walls at both ends. This one has cross streets at both ends.

       WHY IT NEEDED MACHINERY. reveal(), glaze() and shopDoor() are all
       written in a and z with b nailed to 0, because every other
       building in this file has its face there -- the same kit gap the
       BLOCK LANDMARKS note already records for shopDoor. So the body
       carries a WALL FRAME: a map from (u along the elevation, n out of
       it, v up) to world (a, b, z), and every primitive below is written
       against a frame instead of against b = 0.

         FR_FRONT  u = a,       n = +b        street
         FR_RIGHT  u = -b,      n = +a        cross street
         FR_LEFT   u = -b,      n = -a        cross street
         FR_BACK   u = WW - a,  n = -b        rear

       rev() and glz() are frame-general reveal() and glaze(): identical
       arithmetic, and on FR_FRONT they reduce to the originals exactly.
       They belong in the kit, which is what kTodo says -- two copies of
       a primitive is the fault this whole file is arranged to avoid, and
       these two are only here because the kit cannot yet be asked.

       WHICH RETURN A RECESS EXPOSES IS DERIVED, not written down. A
       recess at n = -deep shifts on screen; decomposing that shift into
       the frame's own u and v screen steps says which way the contents
       move, and the gap opens on the opposite side. On FR_FRONT that
       comes out as the low-u jamb and the cill, which is exactly what
       reveal() has hardcoded; on FR_RIGHT it comes out as the far end of
       the flank instead. Same three quads, no per-face special case.

       DRAW ORDER IS THE WHOLE TRICK. A box's far faces must be painted
       BEFORE the solid, or they stand in open sky above it. Checked
       rather than assumed: at screen x = 300K the far flank runs y -675K
       to -150K while the front wall only reaches -375K, so 300 units of
       it are uncovered -- and the roof plate spans exactly -675K to
       -375K at that x. The roof is what hides the far side. So the
       order is back, far flank, body(), near flank, front, and
       FLANK_RIGHT decides which flank is which, the same test body()
       uses for its own end wall.

       THE STOREY STACK is unchanged, from the Rooming house arithmetic
       in the SCALE REVIEW note: 150 + 100 + 100 = 350.

         0..104   display window       107.95  door head
         118..140 fascia board         140..150 first course
         176..238 first floor          250..260 second course
         276..338 second floor         350..364 cornice */
    const wall = '#d8b98a', trim = '#7a5a3a', iron = '#3c3a36';
    const WW = 1048.8, DD = 620, H = 350;
    const glassT = 'rgba(96,124,140,.86)';
    const LIV = ['#7a5a3a','#4a5f6b','#6b4a4a','#4a6b52','#6b5a7a','#7a6b3a','#4a6b6b'];
    const SHUT = ['#6b8a5a','#8a6b5a','#5a7a8a'];
    const EA0 = 470, EA1 = 580;

    const { FR_FRONT, FR_RIGHT, FR_LEFT, FR_BACK, NEAR, FAR, Q, R, bandF, rev, glz, doorF }
      = wallFrames(WW, DD);

    /* one shop, WIDTH-PARAMETERISED: pier 9 / window / pier 11 / door
       66.24 / pier 9.76. At 218 that is the packer's own 209.76 rhythm
       and the window comes out 122; the flank asks for 200 instead,
       which is what let its blank end block go -- see the note there. */
    const shopUnit = (fr, U, WD, liv) => {
      const w0 = U+9, w1 = U + WD - 87, dm = U + WD - 42.88;
      rev(fr, w0, w1, 20, 104, 12, shade(wall,.48));
      R(fr, w0+6, w1-6, 46, 52, -2, shade(wall,1.16));
      R(fr, w0+6, w1-6, 74, 80, -2, shade(wall,1.16));
      glz(fr, w0, w1, 20, 104, liv, 'rgba(110,140,156,.80)');
      for(let k=1;k<4;k++) R(fr, w0+(w1-w0)*k/4-2, w0+(w1-w0)*k/4+2, 20, 104, 1, shade(liv,1.3));
      bandF(fr, w0-3, w1+3, 12, 20, 3, -1, shade(wall,.70));
      if(fr === FR_FRONT) shopDoor(dm, wall, liv, null, WW);         // the canonical door
      else doorF(fr, dm, wall, liv);
      bandF(fr, U+4, U+WD-4, 118, 140, 3, -1, shade(liv,1.06), null, shade(liv,1.3));
      R(fr, U+12, U+WD-12, 122, 136, 3.5, shade(liv,.52));
    };

    const elevation = fr => {
      const L = fr.len;
      bandF(fr, -5, L+5, 140, 150, 3, 0, shade(wall,.80), null, shade(wall,1.1), 0);   // courses,
      bandF(fr, -5, L+5, 250, 260, 3, 0, shade(wall,.80), null, shade(wall,1.1), 0);   // which wrap,
      bandF(fr, -7, L+7, H, H+14, 5, -1, shade(wall,.66), null, null, 0);              // and the cornice
      bandF(fr, -6, 24,   16, H, 4, 0, shade(wall,1.08), null, shade(wall,1.2), 2);    // corner piers:
      bandF(fr, L-24, L+6, 16, H, 4, 0, shade(wall,1.08), null, shade(wall,1.2), 1);   // capped inboard only

      if(fr.kind === 'front'){
        [20, 242, 590, 812].forEach((U,i) => shopUnit(fr, U, 218, LIV[i]));
        bandF(fr, EA0-14, EA1+14, 16, 150, 5, -1, shade(wall,1.10), null, shade(wall,1.26));
        shopDoor((EA0+EA1)/2, wall, trim, null, WW);
        bandF(fr, EA0-6, EA1+6, 118, 134, 8, 4, shade(wall,.58), null, shade(wall,.8));
        R(fr, EA0+6, EA1-6, 122, 130, 8.5, shade(wall,1.2));
        bandF(fr, EA0-16, EA1+16, 150, H, 5, 0, shade(wall,1.06), null, shade(wall,1.22));
        bandF(fr, EA0-22, EA1+22, H, H+46, 4, -12, shade(wall,.72), null, shade(wall,1.05));
        R(fr, EA0-6, EA1+6, H+11, H+35, 4.5, shade(wall,1.14));
      } else if(fr.kind === 'flank'){
        /* THREE SHOPS, NOT TWO AND A BLANK END. Two units of 218 leave
           154 of a 620 flank over, and that remainder was being filled
           with a solid pale panel carrying a lone brown door and one
           small window -- a blank wall with a door in it, in the middle
           of a run of glazed shopfronts. It read as exactly what it was.
           Three units of 200 fill the flank with 10 of pier at each end
           and no remainder, which is what parameterising shopUnit's
           width was for. */
        [10, 210, 410].forEach((U,i) => shopUnit(fr, U, 200, LIV[4+i]));
      } else {
        /* AND THE REAR HAD THREE MORE OF THEM. Service doors standing in
           bare wall with windows dodged around them; the rule the front
           and flanks follow is that ground level is glazed, so the rear
           is a continuation of the same bay rhythm carried down to the
           street rather than a different kind of elevation. */
        for(let i=0;i<15;i++){
          const c = 26 + (L-52)*(i+0.5)/15, x0 = c-23, x1 = c+23;
          rev(fr, x0, x1, 24, 110, 9, shade(wall,.44));
          glz(fr, x0, x1, 24, 110, shade(wall,1.14), glassT);
          R(fr, x0, x1, 66, 70, 1, shade(wall,1.14));
          bandF(fr, x0-5, x1+5, 16, 24, 4, -1, shade(wall,.86));
        }
        bandF(fr, -5, L+5, 118, 130, 3, 0, shade(wall,.74), null, shade(wall,1.05), 0);
      }

      const NB = fr.kind === 'flank' ? 8 : 15, B0 = 26, B1 = L - 26;
      for(let fl=0; fl<2; fl++){
        const v0 = 176 + fl*100, v1 = v0 + 62;
        for(let i=0;i<NB;i++){
          const c = B0 + (B1-B0)*(i+0.5)/NB, x0 = c-23, x1 = c+23;
          rev(fr, x0, x1, v0, v1, 9, shade(wall,.44));
          glz(fr, x0, x1, v0, v1, shade(wall,1.14), glassT);
          R(fr, x0, x1, (v0+v1)/2 - 2, (v0+v1)/2 + 2, 1, shade(wall,1.14));
          bandF(fr, x0-5, x1+5, v0-8, v0, 4, -1, shade(wall,.86));
          if(fl === 1) for(const sx of [x0-13, x1+2])
            bandF(fr, sx, sx+11, v0, v1, 4, 0, SHUT[i%3], shade(wall,.6));
        }
      }
    };

    /* ---- back and far flank BEFORE the solid; near flank and street
       after it. See the draw-order note above. ---- */
    elevation(FR_BACK);
    elevation(FAR);
    body(wall, trim, H, WW, DD);
    T(0, WW, -DD, 0, H+0.4, '#6a7076');          // body()'s roof plate is too bright at this size
    elevation(NEAR);
    elevation(FR_FRONT);

    /* ---- balconies, on the street front, under five of the bays ---- */
    const bayC = i => 26 + (WW-52)*(i+0.5)/15;
    for(const i of [1, 4, 7, 10, 13]){
      const c = bayC(i), x0 = c-30, x1 = c+30, D = 18, r0 = 176, r1 = 206;
      box(x0, x1, 0, D, 164, 176, shade(wall,.94), shade(wall,.86), shade(wall,.72));
      for(const [z,r] of [[r1,1.8],[r0+3,1.2]]) tube(x0, D, z, x1, D, z, r, iron);
      for(let k=0;k<=10;k++){ const xa = x0 + (x1-x0)*k/10;
        tube(xa, D, r0, xa, D, r1, 0.9, iron); }
      for(const aa of [x0, x1]){                                     // the end returns
        for(const [z,r] of [[r1,1.8],[r0+3,1.2]]) tube(aa, D, z, aa, 0, z, r, iron);
        for(let k=1;k<=3;k++) tube(aa, D*k/3, r0, aa, D*k/3, r1, 0.9, iron);
      }
      for(const aa of [x0+1.5, x1-1.5]) tube(aa, D, 164, aa, D, r1, 1.4, iron);
    }

    if(state.props){
      for(const [i0,i1] of [[2,4],[10,12]]){
        const LA0 = bayC(i0)-20, LA1 = bayC(i1)+20, LZ = 340, LB = 14, sagz = 14;
        const l0 = P(LA0, LB, LZ), l1 = P(LA1, LB, LZ);
        ctx.strokeStyle = '#c9c2b0'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(l0.x, l0.y);
        ctx.quadraticCurveTo((l0.x+l1.x)/2, (l0.y+l1.y)/2 + sagz*K, l1.x, l1.y); ctx.stroke();
        for(let k=0;k<5;k++){
          const t = (k+0.5)/5, a = LA0 + (LA1-LA0)*t;
          const sag = LZ - Math.sin(Math.PI*t)*sagz;
          slab(a-5, a+5, sag-20, sag, LB+1, LB-1,
               ['#e8e2d4','#7fb0c4','#e2748c','#8fb48a','#c9a24a'][k]);
        }
      }
      for(const i of [1, 7, 13]) slab(bayC(i)-8, bayC(i)+8, 182, 202, 19, 17,
        ['#7fb0c4','#e8e2d4','#8fb48a'][i%3]);
    }
    if(state.roof){
      for(const ca of [150, 430, 700, 950]){
        box(ca-22, ca+22, -300, -240, H, H+52, '#9aa0a6','#7d838a','#6a7076');
        for(const cb of [-288, -252]) cyl(ca-10, cb, H+52, H+64, 5, '#5e646b');
      }
    }
    kerb(p,'none');
  }
},
{
  name:'Car dealership', tall:true, ww: 1048.8, dd: 620,
  wTodo:'a whole block edge -- five packing slots, and the packer emits no wide slot yet',
  kTodo:'shares wallFrames() with Apartments over shop; rev, glz and doorF belong in the kit',
  head:'Whole edge, one showroom wrapping all four faces, offices over',
  tags:['block width, on the line','one continuous showroom','cars behind the glass','mullions not piers','offices over'],
  desc:'The apartments block again with its ground floor unified: instead of a parade of separate shops the whole storey is one showroom, glazed the entire way round on all four faces and deep enough to stand cars in, with the offices above keeping the punched-window rhythm.',
  draw(p){
    /* ============ ONE SHOP, NOT A PARADE ============
       Same footprint and the same wall frames as Apartments over shop --
       block WIDTH, on the line, ww 1048.8 by dd 620 -- with the ground
       floor unified at Sir's direction. What that actually changes:

       THE GROUND STOREY IS ONE OPENING PER FACE, not five. A parade is
       set out in units because each unit is a separate tenancy with its
       own door and its own fascia; a showroom is one tenancy, so the
       piers between units go and the glazing runs from corner pier to
       corner pier. What holds it up is MULLIONS -- proud verticals at
       n 1.5, in front of the glass -- rather than masonry between
       openings, which is the honest structure for a shopfront that wide
       and is why it can be that wide at all.

       AND IT IS DEEP, which is the part that makes it a showroom rather
       than a window. 96 of recess, so there is floor behind the glass to
       stand cars on. They sit BROADSIDE to the street: the game's car is
       150 by 60, and 150 will not fit in a 96 recess nose-in, while 60
       will -- and side-on is the view of a car worth putting in a
       window anyway.

       THE CARS ARE SOLIDS, not decals. qbox() in wallFrames picks which
       two faces of a box turn toward the eye by the same screen-y test
       box() and slab() use, so a car parked in the flank showroom sits
       the right way round rather than inside out -- which is the fault
       body() and box() both had before they asked P() instead of
       asserting.

       THEY ARE ALSO CLIPPED TO THE OPENING. You can only see into a
       recess through the hole in the wall, which is reveal()'s own note;
       a car at n -78 projects 78 sideways and would otherwise stand out
       past the corner of the building as a solid object in the street.

       THE OFFICES OVER keep the apartments' bay rhythm and lose
       everything residential: no balconies, no shutters, no washing.

         20..118  showroom          124..152 name band, wraps
         176..238 first floor       250..260 course
         276..338 second floor      350..364 cornice */
    const wall = '#dfe1e3', trim = '#3a4046', band = '#1f5fa8', iron = '#8d949a';
    const WW = 1048.8, DD = 620, H = 350;
    const glassT = 'rgba(120,152,172,.80)';
    const SHOW = 'rgba(150,186,204,.20)';                  // the showroom pane, seen through
    const { FR_FRONT, FR_RIGHT, FR_LEFT, FR_BACK, NEAR, FAR, Q, R, bandF, rev, glz, doorF, qbox }
      = wallFrames(WW, DD);
    /* THE TOWER PROJECTED 46 ONTO THE FOOTWAY, and 80 once its canopy
       was on. A building on the line may lean over the pavement the way
       the apartments' balconies do at 19, or the way a portico does --
       but not as 46 of solid wall from the ground up, which is a
       pavement blocked rather than a porch. 14 and 28, which puts it in
       the same bracket as the balconies on its sibling. */
    const EA0 = 462, EA1 = 592, EB = 14, EZ = 404;         // the sign fin
    const EMID = (EA0+EA1)/2;                              // and the door under it

    /* ================= THE GAME'S OWN CAR, PORTED =================
       The first cut was a car I made up: two boxes and four smaller ones
       at 150 by 60 by 66, which is nobody's car. The shipped one is real
       geometry and it ports, because it is built on exactly the pattern
       wallFrames uses -- carT(a, b, h) defines the whole vehicle ONCE in
       a fixed local frame with the car facing +a, and the rig rotates as
       one rigid unit. Substituting Q(fr, ...) for the game's carP is the
       entire port; every panel below is the shipped one.

       CARC, verbatim: len 225, wid 90, chassisH 42, cabinH 48,
       wheelR 24, and CAR_COLORS' four liveries. The three HEIGHTS are
       divided by ZSCALE on the way in and the two plan dimensions are
       not, which is the whole of the correction in the WIDE UNITS note
       at the head of this file -- the lab scales z and nothing else.

       WHAT IS ASKED RATHER THAN ASSERTED. The game picks its near wheel
       side, its camera-facing side glass and which bumper to draw at all
       by comparing carDepth; here the same choices come off screen y,
       which is the test box() and slab() already use. Nothing is
       hardcoded to a side.

       AND THE WHEELS ARE FACE-PLANE CIRCLES, so their z radius is
       divided by ZSCALE. That is fault one on the standing list, eleven
       instances deep, and a wheel is the most obvious place in the file
       for it: r 24 undivided comes out 24 by 36 and the car rolls on
       ovals.

       WHAT THE REAL CAR COSTS: it is 225 long against my 150, so a 200
       showroom bay will not hold it. The bay target went to 330, which
       divides the 996.8 front into 3 and the 568 flank into 2. */
    const CR = { len:225, wid:90, chassisH:42, cabinH:48, wheelR:24,
      windshield:'#9fc4d6', windshieldEdge:'#6f8fa0', bumper:'#b8bcc2',
      light:'#f4e9b0', tail:'#c94f4f', wheel:'#24262c', wheelDk:'#17191d',
      hub:'#8a919c', hubFace:'#3d424c' };
    const CAR_COLORS = [
      { body:'#9aa7b5', bodyDk:'#76839a', roof:'#8695a5' },   // silver
      { body:'#c45a4e', bodyDk:'#9c473d', roof:'#af4f44' },   // red
      { body:'#5678a8', bodyDk:'#435e87', roof:'#4c6c99' },   // blue
      { body:'#e4e6ea', bodyDk:'#c0c3c9', roof:'#d6d9dd' }    // white
    ];
    const carIn = (fr, uc, nc, vf, col) => {
      const zk = 1/ZSCALE;
      const hl = CR.len/2, hw = CR.wid/2, cz = CR.wheelR*zk;
      const chassisTop = (CR.wheelR + CR.chassisH)*zk;
      const cabinTop   = (CR.wheelR + CR.chassisH + CR.cabinH)*zk;
      const cl = hl*0.62, roofF = -cl*0.55, roofR = cl*0.55;
      const cP = (a,b,h) => Q(fr, uc+a, nc+b, vf+h);
      const cd = (a,b,h) => cP(a,b,h).y;                    // nearer = larger screen y

      const wheel = (a0, r, side) => {
        const rz = r*zk;                                     // face-plane circle: z radius over ZSCALE
        const ring = (bc, rr) => { const q = [];
          for(let i=0;i<12;i++){ const t = i/12*Math.PI*2;
            q.push(cP(a0 + Math.cos(t)*rr, bc, cz + Math.sin(t)*rr*zk)); }
          return q; };
        const bIn = side*(hw-1), bOut = side*(hw+5);
        poly(ring(bIn, r), CR.wheelDk);
        const faceB = cd(a0,bOut,cz) > cd(a0,bIn,cz) ? bOut : bIn;
        poly(ring(faceB, r), CR.wheel);
        poly(ring(faceB, r*0.5), CR.hubFace);
        const h = cP(a0, faceB, cz);
        ctx.beginPath(); ctx.arc(h.x, h.y, r*0.30*K, 0, 7); ctx.fillStyle = CR.hub; ctx.fill();
      };
      const chassis = () => {
        const nb = cd(0,hw,chassisTop) > cd(0,-hw,chassisTop) ? hw : -hw;
        const na = cd(hl,0,chassisTop) > cd(-hl,0,chassisTop) ? hl : -hl;
        poly([cP(-hl,nb,cz),cP(hl,nb,cz),cP(hl,nb,chassisTop),cP(-hl,nb,chassisTop)], col.bodyDk);
        poly([cP(na,-hw,cz),cP(na,hw,cz),cP(na,hw,chassisTop),cP(na,-hw,chassisTop)], shade(col.bodyDk,.90));
        poly([cP(-hl,-hw,chassisTop),cP(hl,-hw,chassisTop),cP(hl,hw,chassisTop),cP(-hl,hw,chassisTop)], col.body);
      };
      const cabin = () => {
        const roofPts = [cP(roofF,-hw*0.86,cabinTop),cP(roofR,-hw*0.86,cabinTop),
                         cP(roofR, hw*0.86,cabinTop),cP(roofF, hw*0.86,cabinTop)];
        const sg = cd(0,hw*0.9,cabinTop) > cd(0,-hw*0.9,cabinTop) ? 1 : -1;
        const sgB = sg*hw*0.86, beltB = sg*hw*0.92;
        const P4 = [[roofF,sgB,cabinTop],[roofR,sgB,cabinTop],[cl,beltB,chassisTop],[-cl,beltB,chassisTop]];
        poly(P4.map(q => cP(q[0],q[1],q[2])), col.roof);                       // the greenhouse solid
        poly(roofPts, col.roof, col.bodyDk, 1);
        poly([cP(roofR,-hw*0.85,cabinTop),cP(roofR,hw*0.85,cabinTop),
              cP(cl, hw*0.90,chassisTop),cP(cl,-hw*0.90,chassisTop)], CR.windshield, CR.windshieldEdge, 1);
        poly([cP(roofF,-hw*0.86,cabinTop),cP(roofF,hw*0.86,cabinTop),
              cP(-cl, hw*0.92,chassisTop),cP(-cl,-hw*0.92,chassisTop)], CR.windshield, CR.windshieldEdge, 1);
        poly(roofPts, col.roof, col.bodyDk, 1);                                // the game's roof redraw
        const c = [0,1,2].map(i => P4.reduce((t,q) => t+q[i], 0)/4);
        poly(P4.map(q => cP(q[0],q[1],q[2])), col.body);
        poly(P4.map(q => cP(c[0]+(q[0]-c[0])*0.7, c[1]+(q[1]-c[1])*0.7, c[2]+(q[2]-c[2])*0.7)), CR.windshield);
      };
      const bumper = () => {
        const front = cd(hl,0,cz) > cd(-hl,0,cz), e = front ? hl : -hl, i = front ? hl-0.3 : -hl+0.3;
        poly([cP(i,-hw,cz),cP(e,-hw,cz+3*zk),cP(e,hw,cz+3*zk),cP(i,hw,cz)], CR.bumper);
        for(const sgn of [-1,1]){
          const lp = cP(e - (front?0.4:-0.4), sgn*(hw-3), cz+5*zk);
          ctx.beginPath(); ctx.arc(lp.x, lp.y, 2*K, 0, 7);
          ctx.fillStyle = front ? CR.light : CR.tail; ctx.fill();
        }
      };
      const rearNear  = cd(-hl*0.55,hw,cz) > cd(-hl*0.55,-hw,cz) ? 1 : -1;
      const frontNear = cd( hl*0.55,hw,cz) > cd( hl*0.55,-hw,cz) ? 1 : -1;
      const cabRef = cd(0,0,(chassisTop+cabinTop)/2);
      wheel(-hl*0.55, CR.wheelR,      -rearNear);
      wheel( hl*0.55, CR.wheelR*0.95, -frontNear);
      chassis();
      if(cd(-hl*0.55, hw*rearNear,  cz) <= cabRef) wheel(-hl*0.55, CR.wheelR,      rearNear);
      if(cd( hl*0.55, hw*frontNear, cz) <= cabRef) wheel( hl*0.55, CR.wheelR*0.95, frontNear);
      cabin();
      bumper();
      if(cd(-hl*0.55, hw*rearNear,  cz) >  cabRef) wheel(-hl*0.55, CR.wheelR,      rearNear);
      if(cd( hl*0.55, hw*frontNear, cz) >  cabRef) wheel( hl*0.55, CR.wheelR*0.95, frontNear);
    };
    /* the showroom: one deep opening, floor, cars on it, then the glass
       and the mullions in front of the glass.

       THE WALL WAS 18 UNITS BEHIND THE CARS. First cut recessed 96 and
       stood a 60-wide car at n -48, which leaves the back plate sitting
       right against the tail of every car -- so the whole storey read as
       a shallow display case with a dark board behind it rather than as
       a room you could walk into. Depth is the only thing that fixes
       that, and dd is 620, so there was plenty to spend: 200 of recess,
       columns at -120, and the far wall in a LIT colour a long way back
       instead of a dark plate close up. What sells the depth is the
       floor visible behind the cars, which is why the floor plate runs
       the whole 200 rather than stopping where they do.

       A SECOND ROW OF CARS DOES NOT WORK, tried and measured. Depth
       moves a thing UP the screen by n/2, which is n/(2*ZSCALE) in
       apparent height -- so a car at n -150 reads 50 higher than one at
       the glass, its roof lands at an apparent 134 against a 118 head,
       and the clip cuts it in half. Anything deep in a recess has to fit
       under the head AFTER that rise, and a 98 opening will not take two
       ranks of a 66-tall car. One row, and the depth behind it.

       Everything inside is still clipped to the opening -- reveal()'s
       own note, and it matters more here: a car at n -180 projects 180
       sideways and would stand well past the corner of the building as
       a solid object in the street. */
    const showroom = (fr, u0, u1, show, gap) => {
      const DEEP = 200;
      /* THE BAY RHYTHM IS 200, a car wide, which divides the 996.8 front
         into 5 and the 568 flank into 3 -- every mullion, every column
         and every car centre comes off that one number rather than the
         mullions being on a 72 pitch and the cars on a list of typed
         positions, which is how a 150 car came to straddle two panes.

         WHICH BAYS GET A CAR IS THE CALLER'S. One car per glazed RUN,
         at Sir's direction: two on the street because the entrance
         tower splits it into two runs, one on each flank, one at the
         rear. A showroom with a car in every bay reads as a car park
         behind glass; one car standing on its own in the middle of a
         run is what a showroom window is for. */
      /* THE BAY GRID AND THE GLAZED RUN ARE NOT THE SAME THING, and
         putting the cars on bay centres is what made that show. The
         flank has two bays, so bay 0's centre is a QUARTER of the way
         along the glass -- 168 against a run centred on 310, 142 out --
         and the two on the street were 52 out each for the same reason.
         The bay grid now only sets the columns, which is all it has been
         doing since the mullions went; where a car stands is given to
         showroom() as a position ON THE RUN, because that is a fact
         about the run and not about the structure behind it. */
      const SPAN = u1 - u0, NB = Math.max(1, Math.round(SPAN/190)), BW = SPAN/NB;
      rev(fr, u0, u1, 20, 118, DEEP, '#b2b8bd');
      ctx.save();
      poly([Q(fr,u0,0,118),Q(fr,u1,0,118),Q(fr,u1,0,20),Q(fr,u0,0,20)]); ctx.clip();
      poly([Q(fr,u0,0,20),Q(fr,u1,0,20),Q(fr,u1,-DEEP,20),Q(fr,u0,-DEEP,20)], '#8d949a');
      /* floor joints, running INTO the room. A flat plate and a flat
         wall are the same shape in this projection, so the light area
         behind the cars was reading as another wall; lines that recede
         are what tells the two apart. */
      for(let m=0; m*90 < u1-u0; m++)
        poly([Q(fr,u0+m*90-2.4,0,20.4),Q(fr,u0+m*90+2.4,0,20.4),
              Q(fr,u0+m*90+2.4,-DEEP,20.4),Q(fr,u0+m*90-2.4,-DEEP,20.4)], shade('#8d949a',.80));
      R(fr, u0, u1, 44, 52, -DEEP+1, shade('#b2b8bd',.86));       // a band on the far wall
      for(let m=1;m<NB;m++){                                       // columns, on the bay lines
        const c = fr.P(u0+BW*m, -120, 0);
        cyl(c[0], c[1], 20, 118, 7, '#c6cace');
      }
      /* the livery is named per car rather than derived: the first pass
         derived it and drew silver, white, silver, which is three of the
         four CAR_COLORS being nearly the same colour. */
      for(const [ua, liv] of show) carIn(fr, ua, -58, 20, CAR_COLORS[liv]);
      ctx.restore();
      /* NO BARS ACROSS THE GLASS. There were dark mullions on every bay
         line and a transom right through the middle, all in trim, which
         put a black grid over the one thing the storey exists to show.
         A shopfront that wide does need something holding it up -- but
         it already has it, and it is INSIDE: the columns at n -120 stand
         on the bay lines and read through the pane as the structure they
         are. The frame round the opening goes pale for the same reason,
         so nothing dark crosses a car. */
      glz(fr, u0, u1, 20, 118, shade(wall,.86), SHOW);
      /* the cill is BROKEN at the doorway. Run whole it crosses the
         opening at z 12..20 -- a band drawn through a door, which is the
         fault the Apartments' string course had at exactly this height,
         and a threshold you would trip over. */
      if(gap){
        bandF(fr, u0-4, gap[0], 12, 20, 3, -1, shade(wall,.72));
        bandF(fr, gap[1], u1+4, 12, 20, 3, -1, shade(wall,.72));
      } else bandF(fr, u0-4, u1+4, 12, 20, 3, -1, shade(wall,.72));
    };

    const elevation = fr => {
      const L = fr.len;
      bandF(fr, -5, L+5, 124, 152, 5, 0, band, null, shade(band,1.2), 0);       // name band, wraps
      for(let k=0;k<Math.round(L/150);k++)
        R(fr, 40+k*150, 128+k*150, 131, 145, 5.5, shade(wall,1.06));
      bandF(fr, -5, L+5, 250, 260, 3, 0, shade(wall,.82), null, shade(wall,1.1), 0);
      bandF(fr, -7, L+7, H, H+14, 5, -1, shade(wall,.70), null, null, 0);        // cornice
      bandF(fr, -6, 24,   16, H, 4, 0, shade(wall,.96), null, shade(wall,1.14), 2);
      bandF(fr, L-24, L+6, 16, H, 4, 0, shade(wall,.96), null, shade(wall,1.14), 1);

      if(fr.kind === 'front'){
        /* THE CANONICAL DOOR, and it has to be. This is the b = 0 plane,
           so shopDoor() works here directly -- doorF is the frame copy
           and exists only for the faces the kit cannot reach. The door
           the pickup worker walks out of is not a thing to reimplement
           when the real one is available. */
        showroom(fr, 26, L-26,                        // one centred in each run either
          [[(26+EA0)/2, 1], [(EA1+L-26)/2, 2]],       // side of the fin, not on a bay centre
          [EMID-37.12, EMID+37.12]);
        shopDoor(EMID, wall, trim, null, WW);
      } else if(fr.kind === 'flank'){
        showroom(fr, 26, L-26, [[L/2, 3]]);
      } else {
        showroom(fr, 26, L-26, [[L/2, 0]]);
      }

      const NB = fr.kind === 'flank' ? 8 : 15, B0 = 26, B1 = L - 26;
      for(let fl=0; fl<2; fl++){
        const v0 = 176 + fl*100, v1 = v0 + 62;
        for(let i=0;i<NB;i++){
          const c = B0 + (B1-B0)*(i+0.5)/NB, x0 = c-23, x1 = c+23;
          rev(fr, x0, x1, v0, v1, 9, shade(wall,.52));
          glz(fr, x0, x1, v0, v1, shade(wall,.90), glassT);
          R(fr, x0, x1, (v0+v1)/2 - 2, (v0+v1)/2 + 2, 1, shade(wall,.92));
          bandF(fr, x0-5, x1+5, v0-8, v0, 4, -1, shade(wall,.86));
        }
      }
    };

    elevation(FR_BACK);
    elevation(FAR);
    body(wall, trim, H, WW, DD);
    T(0, WW, -DD, 0, H+0.4, '#6a7076');           // body()'s roof plate is too bright at this size
    elevation(NEAR);
    elevation(FR_FRONT);

    /* ---- the sign fin, ABOVE the fascia ----
       It used to be a solid box from the ground up, projecting 14 across
       a 462..592 -- and the door was drawn at b 0.3, behind its front
       face, so the building had no way in on foot at all. That is the
       third shop in this file to have had that, after the Garage and the
       Fire station, and here it was self-inflicted.

       The fix is not to move the door out; a shopfront door belongs in
       the glass. The fin starts at 152, on top of the name band, where a
       dealership pylon actually springs from -- so the showroom glazing
       runs unbroken underneath it and the canonical door sits in that
       glazing on the b = 0 plane where shopDoor can reach. */
    slab(EA0-14, EA1+14, 146, 156, EB+4, -1, shade(wall,.90), null, shade(wall,1.12));   // corbel
    box(EA0, EA1, 0, EB, 156, EZ, shade(wall,1.16), shade(wall,1.04), shade(wall,.84));
    F(EA0+10, EA1-10, 176, 372, band, null, 0, EB+1.2);            // the sign
    for(let k=0;k<4;k++) F(EA0+24, EA1-24, 190+k*46, 224+k*46, shade(wall,1.1), null, 0, EB+1.7);
    for(const ca of [EA0+8, EA1-8])
      tube(ca, 2, 150, ca, EB-2, 162, 1.8, iron);                  // stays back to the wall

    if(state.props){
      /* THE FLAGS WERE ON THE PAVEMENT, which is the one thing a prop in
         this file may not be: poles standing at b 10 with pennants
         written to b -44, so each flag flew straight through the wall
         behind it and each pole would have wanted a collision volume in
         the footway. They fly off the roof instead, which is where a
         dealership puts them anyway. */
      [[180,-70],[400,-70],[620,-70]].forEach(([fa,fb],i) => {
        cyl(fa, fb, H, H+124, 3.5, iron);
        poly([P(fa,fb,H+124),P(fa,fb,H+86),P(fa+40,fb,H+94),P(fa+40,fb,H+118)],
             [band,'#c2452e',shade(wall,1.12)][i]);
        ball(fa, fb, H+126, 4.5, shade(iron,1.2));
      });
    }
    if(state.roof){
      for(const ca of [180, 470, 760])
        box(ca-40, ca+40, -300, -230, H, H+30, '#9aa0a6','#7d838a','#6a7076');
      cyl(940, -260, H, H+40, 6, '#6d747c');
    }
    kerb(p,'none');
  }
},
{
  name:'Department store', tall:true, ww: 1048.8, dd: 620,
  wTodo:'a whole block edge -- five packing slots, and the packer emits no wide slot yet',
  kTodo:'shares wallFrames() with Apartments over shop and Car dealership; rev, glz and doorF belong in the kit',
  head:'A whole edge, four storeys, corner turret, cantilevered canopy',
  tags:['block width, on the line','deep display windows','mannequins behind the glass','corner turret','cantilevered canopy'],
  desc:'The type that actually takes a whole block: a stone pile with deep display windows at street level, mannequins standing inside them, three ranks of windows over, a cantilevered canopy along the street and a domed turret on the corner.',
  draw(p){
    /* ============ A DEPARTMENT STORE IS A WHOLE EDGE ============
       Sir asked for the dealership's footprint and the type wants it:
       this is the building that occupies a block. Block WIDTH again --
       ww 1048.8, dd 620, on the line, no yard -- and elevated on all
       four faces through wallFrames, which is now shared by three shops
       and still wants to be in the kit. kTodo says so on all of them.

       WHAT WAS WRONG with the 230 version, measured:

         THREE GLAZING BARS ACROSS THE DOOR. F() bars at a 79.3, 115.0
         and 150.7 against an opening at 81.88..148.12 -- the middle one
         splitting the doorway exactly in half -- and all three drawn
         AFTER shopDoor. The entry's own comment said the glazing had no
         way through it; the door was added and the bars were not
         reconsidered. That is the 25th of these.

         THE DOOR DID NOT FIT ITS OWN SHOPFRONT. Head 107.95 in a band
         running to 108, and a surround top at 114.95 -- 7 units of door
         surround standing in bare wall above the glazing.

         THE MANNEQUINS WERE OUTSIDE THE GLASS, at b +6, standing on the
         footway. Same fault as the Apothecary's jars at +5, and the
         reason it keeps happening is that a display is the one thing in
         a shopfront that reads better when you get the sign wrong on
         this canvas -- painted last, it looks fine and dies under a
         depth key.

         THE CANOPY RAN a -6..236 at b 0..52: six past BOTH returns and
         52 out over the footway, on three posts whose screen-a was -44.
         That is what the cTodo counted.

         Plus the fTodo bands, 10 and 1 past the return, a flat rectangle
         for every window on the building, and zTodo 1.87 for three
         storeys drawn.

       THE STOREY STACK, on the Rooming house arithmetic: a ground storey
       tall enough for the kit's door and a canopy over it, then three
       upper storeys of 110. 160 + 330 = 490, which is 2.92.

         24..104   display windows      107.95 door head
         124..136  canopy               138..158 name band
         160..170  first course         186..252 first floor
         270..280  second course        296..362 second floor
         380..390  third course         406..472 third floor
         490..508  cornice */
    const wall = '#c9c2b4', trim = '#7a3b46', iron = '#8d979f';
    const WW = 1048.8, DD = 620, H = 490;
    const glassT = 'rgba(112,140,158,.84)', showT = 'rgba(134,166,184,.34)';
    const { FR_FRONT, FR_RIGHT, FR_LEFT, FR_BACK, NEAR, FAR, Q, R, bandF, rev, glz, doorF }
      = wallFrames(WW, DD);
    const EMID = WW/2, CZ0 = 124, CZ1 = 136, COUT = 28;
    const FIG = ['#7a3b46','#3f6b6b','#c9a24a','#4a4f6b','#8a5a6a'];

    /* a mannequin: a turned body on a plinth with a ball head, standing
       INSIDE the reveal at n -20 rather than at +6 on the pavement */
    const figure = (fr, u, n, v, col) => {
      const c = fr.P(u, n, 0);
      cyl(c[0], c[1], v, v+8, 5, shade(wall,.70));
      cyl(c[0], c[1], v+8, v+46, 8, col);
      ball(c[0], c[1], v+55, 7, '#e8ddc8');
    };
    /* one display window: a 60 recess with a floor and figures on it,
       then the pane. THE CANOPY DOES NOT SHADOW IT, and that is why the
       head is 104 rather than 118: a soffit point and a wall point share
       a pixel when z_w = (CZ0*ZSCALE*2 - b_s)/ZSCALE, so a canopy at 124
       projecting 28 covers the wall from 124 down to 105.3. The
       drugstore learned this the expensive way with its pickup window
       behind its own roof. */
    const display = (fr, u0, u1, figs) => {
      rev(fr, u0, u1, 24, 104, 60, shade(trim,.42));
      ctx.save();
      poly([Q(fr,u0,0,104),Q(fr,u1,0,104),Q(fr,u1,0,24),Q(fr,u0,0,24)]); ctx.clip();
      poly([Q(fr,u0,0,24),Q(fr,u1,0,24),Q(fr,u1,-60,24),Q(fr,u0,-60,24)], shade(wall,.80));
      R(fr, u0, u1, 74, 80, -58, shade(trim,.60));                  // a lit band at the back
      for(let k=0;k<figs;k++)
        figure(fr, u0 + (u1-u0)*(k+0.5)/figs, -20, 24, FIG[(k + Math.round(u0)) % FIG.length]);
      ctx.restore();
      glz(fr, u0, u1, 24, 104, shade(wall,.72), showT);
      bandF(fr, u0-6, u1+6, 14, 24, 4, -1, shade(wall,.74));         // cill
      bandF(fr, u0-6, u1+6, 104, 114, 4, -1, shade(wall,.92));       // head
    };

    const elevation = fr => {
      const L = fr.len;
      bandF(fr, -5, L+5, 138, 158, 5, 0, shade(trim,1.22), null, shade(trim,1.4), 0);   // name band
      for(let k=0;k<Math.round(L/150);k++)
        R(fr, 40+k*150, 128+k*150, 144, 153, 5.5, shade(wall,1.12));
      for(const cv of [160, 270, 380])
        bandF(fr, -5, L+5, cv, cv+10, 3, 0, shade(wall,.84), null, shade(wall,1.12), 0);
      bandF(fr, -7, L+7, H, H+18, 5, -1, trim, null, shade(trim,1.15), 0);      // cornice
      bandF(fr, -6, 26,   14, H, 5, 0, shade(wall,1.06), null, shade(wall,1.2), 2);
      bandF(fr, L-26, L+6, 14, H, 5, 0, shade(wall,1.06), null, shade(wall,1.2), 1);

      /* ---- ground: display windows, with the entrance cut out of the
         run rather than drawn over it ---- */
      const dmid = fr.kind === 'front' ? EMID : L/2, u0c = 26;
      const s0 = dmid - 37.12, s1 = dmid + 37.12;                     // shopDoor's own surround
      const runs = [[26, s0], [s1, L-26]];
      for(const [r0, r1] of runs){
        const nW = Math.max(1, Math.round((r1-r0)/240)), pier = 24;
        const wW = ((r1-r0) - pier*(nW-1)) / nW;
        for(let i=0;i<nW;i++){
          const x0 = r0 + i*(wW+pier);
          display(fr, x0, x0+wW, Math.max(1, Math.round(wW/95)));
        }
      }
      if(fr === FR_FRONT) shopDoor(EMID, wall, trim, null, WW);       // the canonical door
      else doorF(fr, dmid, wall, trim);

      /* ---- the canopy, CANTILEVERED, and on every face ----
         The old one stood on three posts at b 48: three props in the
         footway needing three collision volumes, which was the whole of
         its cTodo. A canopy over a shopfront is a bracketed cantilever
         in the world and does not need them, so it hangs on tie rods and
         nothing of this building stands on the pavement.

         It goes round the corner because the display windows do. A
         canopy on the street front alone reads as the flank being the
         back of the building, which on a whole-edge store it is not --
         and it is drawn at the END of each elevation so it sits over
         that face's own glazing and under the next face's. */
      poly([Q(fr,u0c,0,CZ0),Q(fr,L-26,0,CZ0),Q(fr,L-26,COUT,CZ0),Q(fr,u0c,COUT,CZ0)],
           shade(wall,.76));                                            // soffit
      bandF(fr, u0c, L-26, CZ0, CZ1, COUT, 0, shade(trim,.80), null, shade(trim,.95));
      R(fr, u0c, L-26, CZ0, CZ0+4, COUT+0.4, shade(trim,1.05));
      for(let i=0;i<=Math.round((L-52)/128);i++){
        const ta = u0c + (L-26-u0c)*i/Math.round((L-52)/128);
        const b0 = fr.P(ta, 2, 0), b1 = fr.P(ta, COUT-3, 0);
        tube(b0[0], b0[1], CZ1+34, b1[0], b1[1], CZ1-1, 2.2, iron);
      }

      /* ---- three ranks of windows over ---- */
      const NB = fr.kind === 'flank' ? 8 : 15, B0 = 26, B1 = L - 26;
      for(let fl=0; fl<3; fl++){
        const v0 = 186 + fl*110, v1 = v0 + 66;
        for(let i=0;i<NB;i++){
          const c = B0 + (B1-B0)*(i+0.5)/NB, x0 = c-24, x1 = c+24;
          rev(fr, x0, x1, v0, v1, 9, shade(trim,.40));
          glz(fr, x0, x1, v0, v1, shade(wall,1.10), glassT);
          R(fr, x0, x1, (v0+v1)/2 - 2, (v0+v1)/2 + 2, 1, shade(wall,1.10));
          for(const k of [1,2]) R(fr, x0+48*k/3-1.6, x0+48*k/3+1.6, v0, v1, 1, shade(wall,1.10));
          bandF(fr, x0-5, x1+5, v0-9, v0, 4, -1, shade(wall,.88));
        }
      }
    };

    elevation(FR_BACK);
    elevation(FAR);
    body(wall, trim, H, WW, DD);
    T(0, WW, -DD, 0, H+0.4, '#5f666c');           // body()'s roof plate is too bright at this size
    elevation(NEAR);
    elevation(FR_FRONT);

    if(state.roof){
      /* ================= FOUR TURRETS, AND A DEPTH KEY =================
         One per corner at Sir's direction, on the same 84 inset the
         single one had -- so a 964.8/-84 becomes 84/-84, 84/-536 and
         964.8/-536, and every one of them keeps the geometry unchanged.
         All four fit: 52 of radius against a 32 margin at the closest
         edge.

         THE MOMENT THERE ARE FOUR, CALL ORDER STOPS WORKING. The single
         turret only needed the rooftop plant drawn before it; with four
         turrets, four flagpoles and two plant boxes on one roof the
         answer is not an order, it is a key -- a + b + z, which is what
         depthSort already computes. Written as a list of items now
         rather than as a sequence of calls, so adding a seventh object
         to this roof cannot reintroduce the fault the plant box had.

         The camera-facing side needs no special case either: onDrum
         takes b = tb + sqrt(DR^2 - da^2), which is the larger b and so
         the nearer face, whichever corner the drum stands on. */
      const turret = (ta, tb) => {
        const DR = 46;
        cyl(ta, tb, H+1,   H+26,  DR+6, shade(wall,.86));               // plinth, ON the roof
        cyl(ta, tb, H+26,  H+104, DR,   shade(wall,1.04));              // drum
        /* A DRUM IS NOT A WALL. Putting these on the tangent plane at
           b = tb + DR is only right at a = ta; 39 off centre the surface
           has fallen back 21.6, so the outer pilasters hung off the
           silhouette in mid-air. */
        const onDrum = (da, inset) => tb + Math.sqrt(Math.max(0, DR*DR - da*da)) - inset;
        for(let i=0;i<3;i++){
          const da = -26 + i*26, bb = onDrum(da, 2);
          F(ta+da-8, ta+da+8, H+44, H+88, glassT, null, 0, bb);
          F(ta+da-10, ta+da+10, H+88, H+93, shade(wall,.80), null, 0, bb+0.6);
        }
        for(let i=0;i<4;i++){
          const da = -39 + i*26, bb = onDrum(da, 1);
          F(ta+da-3, ta+da+3, H+30, H+100, shade(wall,1.14), null, 0, bb);
        }
        cyl(ta, tb, H+104, H+116, DR+7, trim);                          // cornice ring
        /* the dome: an ogee revolved, as a stack of PLATES rather than of
           drums. cyl() gives every lift a lid, and a lid is wider than
           the lift above it, so each showed as a ring -- and cyl()'s rim
           is a twelve-gon, so every ring spiked at its corners along the
           silhouette. plateCircle draws a true arc off the same basis,
           so the union of the ellipses IS the dome, with no facets. */
        { const N = 30, DH = 60, z0 = H+116, prof = t => Math.pow(Math.cos(Math.PI/2*t), 0.55);
          for(let i=0;i<=N;i++)
            plateCircle(ta, tb, z0 + DH*i/N, (DR+5)*prof(i/N), shade(trim, 1 + i*0.011)); }
        cyl(ta, tb, H+176, H+200, 12, shade(wall,1.06));                // lantern, on the apex
        plateCircle(ta, tb, H+200, 13, shade(trim,1.1), shade(trim,.8), 1.5);
        { const N = 16, SH = 40, z0 = H+200;                             // spire, on the lantern
          for(let i=0;i<=N;i++)
            plateCircle(ta, tb, z0 + SH*i/N, 9*(1 - i/N), shade('#c9a24a', 1 + i*0.012)); }
        ball(ta, tb, H+244, 5.5, shade('#c9a24a',1.2));
      };
      const flag = (fa, fb, col) => {
        cyl(fa, fb, H+18, H+96, 3, '#c9ccd0');
        poly([P(fa+2,fb,H+96),P(fa+38,fb,H+86),P(fa+38,fb,H+64),P(fa+2,fb,H+72)], col);
      };
      const plant = (ra, rb) => box(ra-46, ra+46, rb-35, rb+35, H, H+30,
                                    '#8f969d','#787f86','#697077');
      const IN = 84, roofItems = [];
      for(const [ta, tb] of [[WW-IN,-IN],[IN,-IN],[IN,-DD+IN],[WW-IN,-DD+IN]])
        roofItems.push({ a:ta, b:tb, z:0, draw:() => turret(ta, tb) });
      ['#7a3b46','#c9a24a','#3f6b6b','#4a4f6b'].forEach((c,i) => {
        const fa = 260 + i*180;
        roofItems.push({ a:fa, b:-34, z:0, draw:() => flag(fa, -34, c) });
      });
      for(const [ra, rb] of [[420,-300],[700,-300]])
        roofItems.push({ a:ra, b:rb, z:0, draw:() => plant(ra, rb) });
      depthSort(roofItems);
    }
    kerb(p,'none');
  }
},
{
  name:'Chambers', tall:true,
  cTodo:'the area railing is a volume: a 10..120 at b 8..12, on the property line rather than out on the footway',
  head:'Four storeys of sash windows, brass plaques, area railing',
  tags:['terrace unit','sash windows in real reveals','brass plaques proud of the wall','stone cills','area railing on the line'],
  desc:'A Georgian chambers: a fine doorway with a fanlight, two ground windows behind an area railing, brass plaques on the pier beside the door, and three ranks of sashes over with stone cills and proud string courses.',
  draw(p){
    /* ============ TWO THINGS DRAWN ACROSS ONE DOORWAY ============
       shopDoor(W*0.52) opens 86.48..152.72 with its head at 107.95, and
       this facade put two separate objects through it:

         F(W*0.45, W*0.59, 12, 88)      a 103.5..135.7, at b -8.5
         slab(W*0.40, W*0.64, 96, 104)  a 92..147.2, under the head

       The panel is the 26th of these. The band is the Apartments' and
       the Department store's fault at the same height for the same
       reason -- a horizontal run written across the whole frontage
       without asking what the frontage already has a hole in.

       THE PLAQUES WERE IN THE WALL. slab(..., -1, -5) is a recess, and
       the desc claimed they stand off it. Brass on a chambers is screwed
       to the face; bFront 5, bBack 0 now. They also overlapped the door
       surround by 0.8, which is what happens when a prop's a is written
       as a fraction of W and the door's is not.

       THE AREA RAILING WAS OUT ON THE FOOTWAY. a -4 at b 40 is screen-a
       -44, four past the return and forty out over the pavement -- the
       five props the cTodo counted. A real area railing stands ON the
       property line, which is b 0, so it sits at b 10 and runs 10..120
       in front of the two windows only. It is still a volume and the
       cTodo says so; what it is not any more is somebody else's ground.

       AND THE STOREY PITCH WAS 66. zTodo 1.74 for a ground floor and
       three ranks over is 66 a storey, well under half a shop storey,
       which is why every window read as a slot. Rebuilt on the Rooming
       house arithmetic: 150 + 3 x 100 = 450, which is 2.68.

         26..104   ground windows        107.95 door head
         114.95    surround top          122..140 entablature
         140..150  first course          176..240 first floor
         250..260  second course         276..340 second floor
         350..360  third course          376..432 third floor
         450..464  cornice */
    const wall = '#b9b0a0', trim = '#3f4a52', H = 450;
    const glassT = 'rgba(84,104,118,.88)', brass = '#c9a24a';
    /* 6 OF PIER IS NOT A PIER. The two ground windows were 16..62 and
       68..114 and read as one opening with a bar in it; 10 separates
       them. And the doorcase had pilasters at DMID-45, which is 123..127
       -- straight through the brass at 118..132. The entablature over
       the opening does the job on its own, so the pilasters are gone and
       the pier between the last window and the door surround is 14.9,
       which is what the plaques stand on. */
    const DMID = 168, GW = [[14,60],[70,116]];        // door, and the two ground windows
    const bay = i => { const w = 44, g = (W - 3*w)/4; return [g + i*(w+g), g + i*(w+g) + w]; };

    body(wall, trim, H);
    slab(0,W, H, H+14, -1, -16, shade(wall,.72));                    // cornice, may wrap
    slab(0,W, H-16, H, 3, 0, shade(wall,1.10), null, shade(wall,1.2));
    /* the string courses run 0..W because the terrace bounds them, and
       they are PROUD -- bFront 3, bBack 0 -- so there is no recess to
       overrun. The fTodo was three of them at -7 landing 7 past the
       return, plus the frieze at -10. */
    for(const cv of [140, 250, 350])
      slab(0,W, cv, cv+10, 3, 0, shade(wall,.86), null, shade(wall,1.14));

    /* ---- the sashes: three ranks, real reveals, stone cills ---- */
    for(let fl=0; fl<3; fl++){
      const z0 = [176, 276, 376][fl], hh = fl === 2 ? 56 : 64;
      for(let i=0;i<3;i++){
        const [x0,x1] = bay(i);
        slab(x0-6, x1+6, z0-10, z0-2, 4, -1, shade(wall,.94));       // stone cill, proud
        reveal(x0, x1, z0, z0+hh, 9, shade(wall,.52));
        glaze(x0, x1, z0, z0+hh, shade(wall,1.12), glassT);
        F(x0, x1, z0+hh/2-2, z0+hh/2+2, shade(wall,1.16), null, 0, 1);        // meeting rail
        F((x0+x1)/2-1.6, (x0+x1)/2+1.6, z0, z0+hh, shade(wall,1.16), null, 0, 1);
        slab(x0-4, x1+4, z0+hh, z0+hh+6, 3, -1, shade(wall,1.02));   // head
      }
    }

    /* ---- the ground floor ---- */
    for(const [x0,x1] of GW){
      slab(x0-6, x1+6, 18, 26, 4, -1, shade(wall,.94));
      reveal(x0, x1, 26, 104, 10, shade(wall,.48));
      glaze(x0, x1, 26, 104, shade(wall,1.12), glassT);
      F(x0, x1, 63, 67, shade(wall,1.16), null, 0, 1);
      F((x0+x1)/2-1.6, (x0+x1)/2+1.6, 26, 104, shade(wall,1.16), null, 0, 1);
      slab(x0-4, x1+4, 104, 110, 3, -1, shade(wall,1.02));
    }
    /* the doorcase: an entablature over the opening, starting at 122 --
       above the surround top of 114.95, which is the clearance the old
       band at 96..104 did not leave. */
    shopDoor(DMID, wall, trim);
    slab(DMID-52, DMID+52, 122, 140, 6, -1, shade(wall,1.08), null, shade(wall,1.22));
    F(DMID-44, DMID+44, 126, 136, shade(wall,.62), null, 0, 6.5);

    if(state.props){
      /* brass, PROUD of the pier -- bFront 5, bBack 0 -- and on the pier,
         which is 114..123 wide between the last window and the doorcase */
      for(let i=0;i<4;i++)
        slab(119, 131, 44+i*17, 57+i*17, 5, 0, brass, shade(brass,.62), shade(brass,1.2));
      /* the area railing, on the property line */
      tube(10, 10, 30, 120, 10, 30, 1.8, '#3c3a36');
      tube(10, 10, 12, 120, 10, 12, 1.4, '#3c3a36');
      for(let i=0;i<=10;i++){
        const ra = 10 + 110*i/10;
        cyl(ra, 10, 0, 30, 1.5, '#3c3a36');
        ball(ra, 10, 32, 2.4, '#3c3a36');
      }
    }
    if(state.roof){
      box(W*0.18, W*0.44, -150, -108, H+14, H+62, '#8a7a6a','#75665a','#645749');
      for(const ca of [W*0.22, W*0.31, W*0.40])
        cyl(ca, -129, H+62, H+80, 5, '#4a4038');
    }
    kerb(p,'none');
  }
},
{
  name:'Grand hotel', tall:true, ww: 1048.8, dd: 620,
  wTodo:'a whole block edge -- five packing slots, and the packer emits no wide slot yet',
  kTodo:'shares wallFrames() with Apartments over shop, Car dealership and Department store; rev, glz and doorF belong in the kit',
  head:'A whole edge, five storeys, hipped mansard with dormers',
  tags:['block width, on the line','hipped mansard','dormers on the slope','juliet balconies','cantilevered awning'],
  desc:'The type that takes a block: a cream stone pile of five storeys under a hipped slate mansard, dormers standing on the slope, juliet balconies on the first floor and a cantilevered awning over the entrance carrying the name.',
  draw(p){
    /* ============ A GRAND HOTEL IS A WHOLE EDGE ============
       Block WIDTH -- ww 1048.8, dd 620, on the line, no yard -- elevated
       on all four faces through wallFrames, shared by four shops now and
       still belonging in the kit.

       WHAT WAS WRONG with the 230 version, measured:

         THE SIGN WAS INSIDE THE BUILDING. slab(..., -26, -42): BOTH
         arguments negative, so the whole box sat 26 to 42 units into the
         masonry with its brackets in there with it, and read only
         because it was painted after the wall. The Locksmith's giant key
         word for word. The sign is gone entirely at Sir's direction and
         the name is on the awning fascia instead.

         A PANEL ACROSS THE DOOR, the 27th: a 105.8..128.8 inside an
         opening at 84.18..150.42, at b -8.5.

         AND BOTH GROUND WINDOWS RAN INTO THE DOOR SURROUND, by 11.82
         each -- windows set out as fractions of W, door set out by
         shopDoor's own clamp arithmetic, nothing reconciling the two.

         THE AWNING WAS A SCREEN-SPACE BEZIER, quadraticCurveTo with
         controls offset in pixels, the same class as the Department
         store's dome -- projecting 46 over the footway on two posts at
         b 42, which is what the cTodo counted.

         Plus the fTodo frieze 10 past the return, quoins 7 past, and
         zTodo 1.76 for three floors on a 62 pitch.

       THE STOREY STACK, on the Rooming house arithmetic: 160 + 4 x 110
       = 600, which is 3.57 -- the tallest wall in the file.

         26..104   ground windows       107.95 door head
         124..142  awning and name      150..160 first course
         186..252  first floor, juliets 270..280 second course
         306..372  second floor         390..400 third course
         426..492  third floor          510..520 fourth course
         542..594  attic storey         600..618 cornice
         618..692  mansard, deck at 692 */
    const wall = '#e0d6c2', trim = '#8a2f3c', gold = '#c9a24a', slate = '#4a5058';
    const WW = 1048.8, DD = 620, H = 600;
    const glassT = 'rgba(90,111,122,.86)';
    const { FR_FRONT, FR_RIGHT, FR_LEFT, FR_BACK, NEAR, FAR, Q, R, bandF, rev, glz, doorF }
      = wallFrames(WW, DD);
    const EMID = WW/2, AZ0 = 124, AZ1 = 142, AOUT = 26;
    const MN = -52, MZ = H+92, HIP = 52;

    const elevation = fr => {
      const L = fr.len;
      for(const cv of [150, 270, 390, 510])
        bandF(fr, -5, L+5, cv, cv+10, 3, 0, shade(wall,.84), null, shade(wall,1.14), 0);
      bandF(fr, -7, L+7, H, H+18, 5, -1, trim, null, shade(trim,1.18), 0);          // cornice
      /* the quoins are PROUD -- bFront 4, bBack 0 -- so 0..L has no
         recess to overrun. They were at -7 and landed 7 past the return
         on the mirrored heading, which was half the fTodo. */
      bandF(fr, -6, 26,   14, H, 4, 0, shade(wall,1.06), null, shade(wall,1.2), 2);
      bandF(fr, L-26, L+6, 14, H, 4, 0, shade(wall,1.06), null, shade(wall,1.2), 1);
      for(const qa of [10, L-10]) for(let k=0;k<9;k++)
        R(fr, qa-9, qa+9, 30+k*62, 60+k*62, 4.5, shade(wall,1.14));

      /* ---- ground: the entrance cut out of the run, not drawn over it ---- */
      const dmid = fr.kind === 'front' ? EMID : L/2;
      const s0 = dmid - 37.12, s1 = dmid + 37.12;
      for(const [r0, r1] of [[26, s0], [s1, L-26]]){
        const nW = Math.max(1, Math.round((r1-r0)/150)), pier = 22;
        const wW = ((r1-r0) - pier*(nW-1)) / nW, nBar = Math.max(1, Math.round(wW/44));
        for(let i=0;i<nW;i++){
          const x0 = r0 + i*(wW+pier);
          bandF(fr, x0-6, x0+wW+6, 16, 26, 4, -1, shade(wall,.92));
          rev(fr, x0, x0+wW, 26, 104, 11, shade(trim,.44));
          glz(fr, x0, x0+wW, 26, 104, shade(wall,1.10), 'rgba(118,144,158,.62)');
          for(let k=1;k<nBar;k++)
            R(fr, x0+wW*k/nBar-2, x0+wW*k/nBar+2, 26, 104, 1, shade(wall,1.12));
          bandF(fr, x0-6, x0+wW+6, 104, 114, 4, -1, shade(wall,1.02));
        }
      }
      if(fr === FR_FRONT) shopDoor(EMID, wall, trim, null, WW);        // the canonical door
      else doorF(fr, dmid, wall, trim);

      /* ---- four ranks over, juliet balconies on the first ---- */
      const NB = fr.kind === 'flank' ? 8 : 15, B0 = 26, B1 = L - 26;
      for(let fl=0; fl<4; fl++){
        const v0 = [186, 306, 426, 542][fl], hh = fl === 3 ? 52 : 66;
        for(let i=0;i<NB;i++){
          const c = B0 + (B1-B0)*(i+0.5)/NB, x0 = c-23, x1 = c+23;
          bandF(fr, x0-6, x1+6, v0-10, v0, 4, -1, shade(wall,.92));      // stone cill
          rev(fr, x0, x1, v0, v0+hh, 9, shade(trim,.42));
          glz(fr, x0, x1, v0, v0+hh, shade(wall,1.10), glassT);
          R(fr, x0, x1, v0+hh/2-2, v0+hh/2+2, 1, shade(wall,1.12));
          R(fr, (x0+x1)/2-1.6, (x0+x1)/2+1.6, v0, v0+hh, 1, shade(wall,1.12));
          if(fl === 0){
            /* eight standards a bay across fifteen bays came out as a
               black fringe the length of the elevation rather than as
               railings: at a 66.45 bay pitch a rail written x0-4..x1+4
               is 54 wide with 12.4 between. Five standards, thinner, and
               the rail stops at the reveal so the gap is 20.4. */
            const b0 = fr.P(x0, 13, 0), b1 = fr.P(x1, 13, 0);
            tube(b0[0], b0[1], v0+20, b1[0], b1[1], v0+20, 1.5, '#3a3430');
            tube(b0[0], b0[1], v0+3,  b1[0], b1[1], v0+3,  1.0, '#3a3430');
            for(let k=0;k<=4;k++){
              const q = fr.P(x0 + (x1-x0)*k/4, 13, 0);
              cyl(q[0], q[1], v0, v0+20, 0.9, '#3a3430');
            }
          }
          if(fl === 3) R(fr, x0-4, x1+4, v0+hh, v0+hh+7, 4, shade(wall,1.04));
        }
      }

      /* ---- the mansard, HIPPED, and its dormers ----
         THE CORNERS WERE TWO SLOPES ON TOP OF EACH OTHER. Each face drew
         its mansard as a rectangle running the full length at n 0..-52,
         so at every corner the front slope and the flank slope both
         covered the same 52 by 52 square and whichever was painted
         second won. That is not a corner, it is an overlap, and it read
         as a notch.

         A hipped mansard is a TRAPEZOID: full width at the eaves, inset
         by the lean at the deck, 0..L becoming 52..L-52. The four
         trapezoids then tile the roof exactly, with a hip line down each
         corner and nothing drawn twice. The ribs follow the same taper,
         because a rib on a hipped slope converges with it. */
      const NR = Math.round(L/58);
      poly([Q(fr,0,0,H+18), Q(fr,L,0,H+18), Q(fr,L-HIP,MN,MZ), Q(fr,HIP,MN,MZ)], slate);
      for(let k=1;k<NR;k++){
        const t = k/NR, u0 = L*t, u1 = HIP + (L-2*HIP)*t;
        poly([Q(fr,u0-2,0,H+18), Q(fr,u0+2,0,H+18),
              Q(fr,u1+2,MN,MZ), Q(fr,u1-2,MN,MZ)], shade(slate,1.12));
      }
      /* A DORMER STANDS ON THE SLOPE. The first cut drew these at n 0,
         which is the wall plane -- the mansard only touches that at its
         very foot (z H+18), so every dormer floated in front of the
         slope with nothing under it. The slope is
         z(n) = H+18 + 74*(-n)/52, so a face at n -13 has its foot at
         H+36.5 and its cheeks run back to n -33 where the slope has
         reached H+64.9. Face, two cheeks, a roof and its fascia, all off
         that one line -- and 30 wide by 47 tall rather than 38 by 44,
         which is a dormer rather than a hatch.

         The bays that fall on the HIP are skipped: a dormer on a hip is
         a dormer with one cheek in mid-air. */
      const slopeZ = n => H + 18 + 74*(-n)/52;
      for(let i=0;i<NB;i+=2){
        const c = B0 + (B1-B0)*(i+0.5)/NB;
        if(c < HIP + 22 || c > L - HIP - 22) continue;
        const fn = -13, bn = -33, hw2 = 15;
        for(const cu of [c-hw2, c+hw2])                                   // cheeks
          poly([Q(fr,cu,fn,slopeZ(fn)), Q(fr,cu,fn,H+84),
                Q(fr,cu,bn,H+90), Q(fr,cu,bn,slopeZ(bn))], shade(slate,.74));
        R(fr, c-hw2, c+hw2, slopeZ(fn), H+84, fn, shade(wall,1.04), shade(wall,.66), 1.5);
        R(fr, c-hw2+4, c+hw2-4, slopeZ(fn)+8, H+78, fn-0.6, glassT);
        poly([Q(fr,c-hw2-5,fn+3,H+84), Q(fr,c+hw2+5,fn+3,H+84),
              Q(fr,c+hw2+5,bn,H+90), Q(fr,c-hw2-5,bn,H+90)], shade(slate,1.20));
        R(fr, c-hw2-5, c+hw2+5, H+80, H+84, fn+3.4, shade(slate,.60));
      }
    };

    elevation(FR_BACK);
    elevation(FAR);
    body(wall, trim, H, WW, DD);
    T(0, WW, -DD, 0, H+0.4, shade(slate,.70));    // body()'s roof plate is too bright at this size
    /* THE MANSARD HAD NO DECK. body()'s plate sits at H, and the slopes
       rise to H+92 leaning in 52 -- so the flat roof was 92 units BELOW
       the tops of its own roof and the far slopes stood above nothing. A
       mansard's deck is the plane the four slopes meet at: inset by the
       lean, at the height they reach. */
    T(HIP, WW-HIP, -DD+HIP, -HIP, MZ, shade(slate,1.06));
    elevation(NEAR);
    elevation(FR_FRONT);

    /* ---- the awning over the entrance, CANTILEVERED ----
       Two posts at b 42 were the cTodo; a hotel awning is a bracketed
       cantilever and does not need them. It clears the ground windows:
       a soffit point and a wall point share a pixel at
       z_w = (AZ0*ZSCALE - b_s/2)/ZSCALE, so 124 projecting 26 shadows
       the wall down to 106.7 against a window head of 104. */
    T(EMID-92, EMID+92, AOUT, 0, AZ0, shade(trim,.55));
    slab(EMID-92, EMID+92, AZ0, AZ1, AOUT, 0, trim, null, shade(trim,1.2));
    F(EMID-92, EMID+92, AZ0, AZ0+5, gold, null, 0, AOUT+0.4);
    for(let k=0;k<7;k++)                                                // valance scallops
      plateCircle(EMID-78+k*26, AOUT-1, AZ0-1, 8, shade(trim,.75));
    for(const ta of [EMID-86, EMID, EMID+86])
      tube(ta, 2, AZ1+30, ta, AOUT-3, AZ1-1, 2.2, gold);
    /* the name, on the awning fascia. The vertical sign that used to
       carry it is gone at Sir's direction -- the whole box, not just the
       gilt -- and this is where a hotel without a tower sign puts it. */
    for(let k=0;k<5;k++)
      F(EMID-62+k*26, EMID-46+k*26, AZ0+7, AZ1-3, '#f0e2c8', null, 0, AOUT+0.6);

    if(state.roof){
      for(const [ra, rb] of [[320,-300],[720,-300]])
        box(ra-48, ra+48, rb-36, rb+36, MZ, MZ+32, '#8f969d','#787f86','#697077');
      for(const ca of [200, 860]) cyl(ca, -300, MZ, MZ+58, 4, '#c9ccd0');
    }
    kerb(p,'none');
  }
},
{
  name:'School', tall:true, block:true, place:'park',
  ww: 3*3128, dd: 2*3128,
  wTodo:'four block cells in an L -- the packer has no concept of a multi-block, non-rectangular footprint',
  pTodo:'PEDDLERS SQUARE specifically, Market District. Measured on buildGrid(36,27,hashStr("2026-08-09")): 4 cells at i,j (10,18)(10,19)(11,19)(12,19). The chooser places by block type and has no way to name a component',
  gTodo:'DRIFTWOOD ELEMENTARY. Pin to the Peddlers Square component the way Gantry Commons pins the Undertaker: PARK_LANDMARKS["Peddlers Square"] = { shop:"School", mapName:"Driftwood Elementary", icon:"\\u{1F3EB}", pin:"#b06a4a" }, and the entry copied into the game LIB alongside wallFrames. Anchor is the min-j then min-i cell, (10,18). If worldgen ever reshapes the component this footprint has to be regenerated from it rather than kept as a literal',
  sTodo:'the LIB graft is in game/index.html ONLY -- game-logic.js has no ctx2phaser, no LIB.draw and no parkLandmarkIndex, so the Undertaker has never shipped to Devvit either. Porting a shop to the game is currently a one-build change, which is the thing the two-canonical-files rule exists to stop',
  cTodo:'perimeter railings on the L outline, gate piers, the school block, the shelter and the trees need volumes; the yard and the walks are drivable',
  head:'Driftwood Elementary, filling Peddlers Square, four cells of it',
  tags:['four-cell footprint','L outline','school in its own yard','painted courts','bellcote','drivable yard'],
  desc:'Not a shopfront and not a block: the school takes the whole of Peddlers Square in the shape the worldgen actually makes it, four cells in an L with the streets between them swallowed, railed round the outline with the building in the near cell and the yard filling the rest.',
  draw(p){
    /* ============ THE FOOTPRINT IS A MEASURED PARK ============
       The Undertaker's treatment, on the park Sir named. The cells were
       read off the real city -- buildGrid(36, 27, hashStr("2026-08-09")),
       DISTRICT_COLS*DISTRICT_W by DISTRICT_ROWS*DISTRICT_H -- and
       parkNameTable's component for PEDDLERS SQUARE is four cells:

         (10,18) (10,19) (11,19) (12,19)

       Normalised to its own origin that is a 3 by 2 bounding box with
       four of the six cells filled: one cell on the street side and a
       row of three behind it, an L. ww and dd are the bounding box; the
       SHAPE is the CELLS list. Anchor -- min-j then min-i -- is (10,18),
       which is the cell the building stands in.

       THE CELL PITCH IS THE GAME'S. BLOCK is 34*T2 = 3128 and ROAD_HALF
       is 368, so 736 of road, 1656 of ground, 736 of road makes the
       3128 pitch. That is the correction the Undertaker's graft forced:
       the canvas lab's old block:true convention of 1048.8 is a THIRD of
       a block, and five other shops still carry it.

       WHAT THE SWALLOW PASS MEANS. Where two cells are edge adjacent the
       street between them is gone and the ground runs straight through;
       where a cell has no neighbour on a side, that side is a real
       street frontage and gets the railing. So the ground is not four
       squares, it is one L, and the railing is derived from the cell set
       rather than drawn as a rectangle.

       WHAT WAS WRONG with the 230 version. Its own bTodo already said
       it: "the playground is the yard -- same relationship", which is
       the landmark test in one line. Beyond that the entry had

         F(W*0.43, W*0.57, 10, 88) at a 98.9..131.1 inside an opening at
           81.88..148.12 -- a panel across the door, the 28th
         slab(W*0.36, W*0.64, 96, 108) at a 82.8..147.2, a band through
           that same doorway under a head of 107.95
         yard railings at a -6..W+6 on b 44: six past BOTH returns and 44
           out over the footway, which is what the cTodo counted
         two fTodo bands at -7, landing 7 past the return
         and zTodo 1.71, three floors of tall classroom windows on an 82
           pitch

       The building is 160 + 2 x 140 = 440 now, which is 2.62, and it
       stands in its own ground so its railings are a boundary rather
       than somebody else's pavement. */
    const BLK = 3128, ROAD = 736;
    const CELLS = [[0,0],[0,1],[1,1],[2,1]];
    const has = (ci, cj) => CELLS.some(c => c[0] === ci && c[1] === cj);
    const wall = '#b06a4a', trim = '#e0d6c2', H = 440;
    const grass = '#4e7a4a', tar = '#6e6f6b', walk = '#b3a894', iron = '#3c4a44';
    const glassT = 'rgba(106,132,148,.86)';
    /* the building stands in the anchor cell, whose ground is
       a 736..2392 by b -3128..-736 */
    const SA0 = 950, SA1 = 2200, SB0 = -2860, SB1 = -1560;
    const { FR_FRONT, FR_RIGHT, FR_LEFT, FR_BACK, NEAR, FAR, Q, R, bandF, rev, glz, doorF }
      = wallFrames(SA1-SA0, SB1-SB0, SA0, SB1);

    /* ---- the ground, cell by cell, with the swallowed streets ---- */
    const rect = (ci, cj) => [
      ci*BLK + (has(ci-1,cj) ? 0 : ROAD), (ci+1)*BLK - (has(ci+1,cj) ? 0 : ROAD),
      -(cj+1)*BLK + (has(ci,cj+1) ? 0 : ROAD), -cj*BLK - (has(ci,cj-1) ? 0 : ROAD)];
    T(0, 3*BLK, -2*BLK, 0, 0.3, walk);
    for(const [ci, cj] of CELLS){
      const [a0, a1, b0, b1] = rect(ci, cj);
      T(a0, a1, b0, b1, 0.6, tar);
    }
    /* EVERY YARD ELEMENT IS CHECKED AGAINST ITS CELL RECTANGLE, because
       the bounding box is not the ground. The four cells come out

         (0,0)  a  736..2392   b -3128..-736
         (0,1)  a  736..3128   b -5520..-3128
         (1,1)  a 3128..6256   b -5520..-3864
         (2,1)  a 6256..8648   b -5520..-3864

       and the first pass ignored the shape: the pitch's near edge sat at
       -3548 against a boundary of -3864, 316 outside; the court
       straddled the step at a 3128; and every tree and the bike shelter
       were written at b -1180 to -1800, which only exists at ci 0 -- so
       ten props and a shelter stood on the pavement outside their own
       railings. That is the cTodo the 230 version had, reproduced at
       landmark scale by looking at ww by dd instead of at the cells. */
    T(3428, 8528, -5380, -3960, 0.9, grass);                              // the pitch
    /* the spine walk runs GATE to DOOR, not gate to back fence: the
       first cut ran it b -3864..-736 straight through a building
       standing at -2860..-1560. */
    T(1475, 1675, -1560, -ROAD, 1.2, walk);
    { const c0 = 1200, c1 = 2900, d0 = -5200, d1 = -3400;                 // a marked court
      for(const [x0,x1,y0,y1] of [[c0,c1,d0,d0+16],[c0,c1,d1-16,d1],
                                  [c0,c0+16,d0,d1],[c1-16,c1,d0,d1],
                                  [(c0+c1)/2-8,(c0+c1)/2+8,d0,d1]])
        T(x0, x1, y0, y1, 1.2, '#d8d2c2');
      for(let k=0;k<26;k++){
        const t = k/25*Math.PI*2, r = 150;
        T((c0+c1)/2 + r*Math.cos(t) - 7, (c0+c1)/2 + r*Math.cos(t) + 7,
          (d0+d1)/2 + r*Math.sin(t) - 7, (d0+d1)/2 + r*Math.sin(t) + 7, 1.2, '#d8d2c2');
      } }

    /* ---- the railing, derived from the cell set ----
       Every cell side with no neighbour is a street frontage, and the
       rail covers the part of that edge NOT shared with a neighbour --
       the Undertaker's rule, which is what closes the notch where the L
       steps rather than leaving the hole an overrun leaves. */
    const railSegs = [];
    for(const [ci, cj] of CELLS){
      const [a0, a1, b0, b1] = rect(ci, cj);
      const nb = (i, j) => has(i, j) ? [i, j] : null;
      const span = (lo, hi, n2, along) => {
        if(!n2) return [[lo, hi]];
        const r = rect(n2[0], n2[1]), [c0, c1] = along ? [r[0], r[1]] : [r[2], r[3]];
        const out = [];
        if(lo < c0) out.push([lo, Math.min(hi, c0)]);
        if(hi > c1) out.push([Math.max(lo, c1), hi]);
        return out;
      };
      for(const [x0, x1] of span(a0, a1, nb(ci, cj-1), true)) railSegs.push([x0-12, x1+12, b1-12, b1]);
      for(const [x0, x1] of span(a0, a1, nb(ci, cj+1), true)) railSegs.push([x0-12, x1+12, b0, b0+12]);
      for(const [y0, y1] of span(b0, b1, nb(ci-1, cj), false)) railSegs.push([a0, a0+12, y0-12, y1+12]);
      for(const [y0, y1] of span(b0, b1, nb(ci+1, cj), false)) railSegs.push([a1-12, a1, y0-12, y1+12]);
    }
    const GATE = [1475, 1675];                                   // the one gap, on the spine walk
    /* ---- CHAIN LINK, not a railing ----
       A school yard fence is galvanised mesh on line posts, and the
       difference is not the colour: a palisade is a row of solids and
       mesh is a TRANSPARENT plane you see the yard through, so it has to
       be built as a plane rather than as objects.

       The diamonds are two sets of diagonals CLIPPED to the run, which
       is reveal()'s own trick -- a diagonal that has to stop exactly at
       a post is arithmetic per line, and a diagonal drawn long and
       clipped is one rule for every run whatever its length or which
       axis it lies on. The wash behind them is what stops the mesh
       reading as bare wire.

       Line posts go to 152 and the mesh to 140, which is 228 and 210 in
       game units -- a real yard fence rather than the 116 hip-height
       railing this was, and the top rail is at the mesh head where a
       chain link top rail actually runs. */
    const MESH = '#a8b0ae', POST = '#7d8785', FZ0 = 14, FZ1 = 140;
    const railRun = (x0, x1, y0, y1) => {
      const along = (x1-x0) > (y1-y0), lo = along ? x0 : y0, hi = along ? x1 : y1;
      const parts = (along && Math.abs(y1 - (-ROAD)) < 40)
        ? [[lo, GATE[0]], [GATE[1], hi]] : [[lo, hi]];
      for(const [q0, q1] of parts){
        if(q1 - q0 < 30) continue;
        const A = along ? [q0, q1, (y0+y1)/2, (y0+y1)/2] : [(x0+x1)/2, (x0+x1)/2, q0, q1];
        const len = q1 - q0;
        const pt = (t, z) => P(A[0] + (A[1]-A[0])*t, A[2] + (A[3]-A[2])*t, z);
        poly([pt(0,FZ1), pt(1,FZ1), pt(1,FZ0), pt(0,FZ0)], 'rgba(206,214,212,.14)');
        /* THE DIAMONDS ARE CLIPPED BY ARITHMETIC, NOT BY ctx.clip().
           A clip was the obvious way and it is the wrong one HERE: the
           game emulates ctx.clip() by Sutherland-Hodgman polygon
           intersection, which clips FILLS. These are strokes, and a
           stroke is not a polygon -- so a fence that looked right on
           this canvas could arrive in the game as a run of diagonals
           overshooting every post.

           A diagonal is a line in (distance-along, height), so solving
           it is two divides: the line runs from (s, FZ0) to
           (s + dir*rise, FZ1), and the part with distance-along inside
           [0, len] is a parameter interval. Same result, no clip, and it
           ports. */
        ctx.strokeStyle = MESH; ctx.lineWidth = 1.1;
        const rise = (FZ1 - FZ0) * ZSCALE, step = 90;
        for(let k = -2; k <= len/step + 2; k++){
          for(const dir of [1, -1]){
            const s0 = k*step, s1 = s0 + dir*rise;
            let u0 = 0, u1 = 1;
            if(s1 !== s0){
              const ua = (0 - s0)/(s1 - s0), ub = (len - s0)/(s1 - s0);
              u0 = Math.max(0, Math.min(ua, ub));
              u1 = Math.min(1, Math.max(ua, ub));
            } else if(s0 < 0 || s0 > len) continue;
            if(u1 <= u0) continue;
            const q0 = pt((s0 + (s1-s0)*u0)/len, FZ0 + (FZ1-FZ0)*u0);
            const q1 = pt((s0 + (s1-s0)*u1)/len, FZ0 + (FZ1-FZ0)*u1);
            ctx.beginPath(); ctx.moveTo(q0.x, q0.y); ctx.lineTo(q1.x, q1.y); ctx.stroke();
          }
        }
        tube(A[0], A[2], FZ1, A[1], A[3], FZ1, 4, POST);            // top rail
        tube(A[0], A[2], FZ0, A[1], A[3], FZ0, 2.4, POST);          // bottom tension wire
        /* THE POSTS ARE TUBES, NOT DRUMS. cyl() builds its silhouette
           from fourteen rim segments, and at r 5 on a lot 9384 wide that
           ellipse is under a pixel -- the 1.2px stroke then draws the
           degenerate polygon, which came out as a trident on top of
           every post. tube() is one stroked segment with a round cap, so
           it is right at any scale. Same reason the kit's own note says
           a sphere IS a screen circle: match the primitive to how small
           the thing actually lands. */
        const n = Math.max(2, Math.round(len/380));
        for(let k=0;k<=n;k++){
          const t = k/n, xa = A[0] + (A[1]-A[0])*t, ya = A[2] + (A[3]-A[2])*t;
          const end = (k === 0 || k === n);
          tube(xa, ya, 0, xa, ya, end ? 158 : 152, end ? 9 : 6.5, POST);
        }
      }
    };
    for(const s of railSegs) railRun(s[0], s[1], s[2], s[3]);
    for(const ga of GATE){                                        // gate piers
      box(ga-34, ga+34, -ROAD-34, -ROAD+34, 0, 210, shade(wall,1.05), wall, shade(wall,.78));
      box(ga-42, ga+42, -ROAD-42, -ROAD+42, 210, 236, shade(trim,1.05), trim, shade(trim,.8));
      ball(ga, -ROAD, 254, 20, shade(trim,.9));
    }

    /* ---- the school block ---- */
    const elevation = fr => {
      const L = fr.len, NB = Math.max(3, Math.round(L/180));
      bandF(fr, -5, L+5, 150, 160, 4, 0, shade(wall,.78), null, shade(wall,1.06), 0);
      bandF(fr, -5, L+5, 300, 310, 4, 0, shade(wall,.78), null, shade(wall,1.06), 0);
      bandF(fr, -7, L+7, H, H+16, 5, -1, shade(wall,.66), null, null, 0);
      bandF(fr, -6, 26,   14, H, 4, 0, trim, null, shade(trim,1.14), 2);
      bandF(fr, L-26, L+6, 14, H, 4, 0, trim, null, shade(trim,1.14), 1);
      const dmid = L/2, s0 = dmid - 37.12, s1 = dmid + 37.12;
      for(let fl=0; fl<3; fl++){
        const v0 = [30, 190, 336][fl], hh = [90, 82, 82][fl];
        for(let i=0;i<NB;i++){
          const c = 30 + (L-60)*(i+0.5)/NB, x0 = c-52, x1 = c+52;
          if(fl === 0 && x1 > s0 - 14 && x0 < s1 + 14) continue;    // the doorway's bay
          bandF(fr, x0-7, x1+7, v0-10, v0, 4, -1, shade(trim,.94));
          rev(fr, x0, x1, v0, v0+hh, 10, shade(wall,.44));
          glz(fr, x0, x1, v0, v0+hh, trim, glassT);
          for(let k=1;k<3;k++) R(fr, x0+104*k/3-2.5, x0+104*k/3+2.5, v0, v0+hh, 1, trim);
          for(let k=1;k<4;k++) R(fr, x0, x1, v0+hh*k/4-2.5, v0+hh*k/4+2.5, 1, trim);
          bandF(fr, x0-5, x1+5, v0+hh, v0+hh+8, 4, -1, shade(trim,1.02));
        }
      }
      /* the doorway is CUT from the bay run, not drawn over it -- the
         230 version put a panel and a band through its own opening.

         AND IT CANNOT BE shopDoor. That is nailed to the b = 0 plane,
         and this building's front face is at b -1560: the first cut
         called shopDoor(dmid + SA0) and put the school's main entrance
         1560 units out in the yard, standing on nothing beside the front
         railing. The census found it -- worst point [1231, 1.2, 57.2],
         its own painted surround, 737 outside the nearest cell. This is
         the kit gap the BLOCK LANDMARKS note records and the Nursery and
         the Bathhouse both work around: a set-back building has to roll
         its own opening until shopDoor takes a depth. doorF is that,
         built from the same SHOP_DOOR_W and SHOP_DOOR_H, so the school's
         door is the game's door in everything but which plane it knows
         how to reach. */
      bandF(fr, dmid-60, dmid+60, 12, 126, 6, -1, trim, null, shade(trim,1.16));
      doorF(fr, dmid, wall, trim);
      if(fr === FR_FRONT){
        bandF(fr, dmid-72, dmid+72, 126, 150, 7, -1, shade(trim,1.06), null, shade(trim,1.2));
        R(fr, dmid-56, dmid+56, 132, 145, 7.5, shade(wall,.62));
      }
    };
    elevation(FR_BACK);
    elevation(FAR);
    T(SA0, SA1, SB0, SB1, H, shade(wall,1.02));                    // the roof
    S((NEAR === FR_RIGHT) ? SA1 : SA0, SB0, SB1, 0, H, shade(wall,.78));
    F(SA0, SA1, 0, H, wall, null, 0, SB1);
    elevation(NEAR);
    elevation(FR_FRONT);

    if(state.roof){
      const ba = (SA0+SA1)/2, bb = SB1 - 190;
      slab(ba-90, ba+90, H+16, H+210, bb+60, bb-60, shade(wall,.92), shade(wall,.72), shade(wall,1.06));
      F(ba-52, ba+52, H+60, H+180, '#3a3026', null, 0, bb+61);
      cyl(ba, bb, H+140, H+172, 30, '#c9a24a');
      ball(ba, bb, H+140, 30, '#c9a24a', '#d8b45e');
      poly([P(ba-112,bb+60,H+210), P(ba,bb+60,H+320), P(ba+112,bb+60,H+210)], shade(wall,.60));
      poly([P(ba+112,bb+60,H+210), P(ba,bb+60,H+320), P(ba,bb-60,H+320), P(ba+112,bb-60,H+210)],
           shade(wall,.50));
      for(const [ca, cb] of [[SA0+220,SB0+240],[SA1-220,SB0+240]])
        box(ca-70, ca+70, cb-70, cb+70, H+16, H+150, shade(wall,.9), shade(wall,.74), shade(wall,.64));
    }
    if(state.props){
      const tree = (ta, tb) => {
        cyl(ta, tb, 0, 150, 20, '#6b5a3a');
        for(let k=0;k<5;k++)
          ball(ta + 62*Math.cos(k*1.26+0.4), tb + 62*Math.sin(k*1.26+0.4), 210, 66, ['#3f6b4a','#4e8058','#568a5e'][k%3]);
        ball(ta, tb, 260, 62, '#4e8058');
      };
      const shelter = (ca, cb) => {
        for(const q of [[ca-190,cb-70],[ca+190,cb-70],[ca-190,cb+70],[ca+190,cb+70]])
          cyl(q[0], q[1], 0, 260, 11, iron);
        slab(ca-220, ca+220, 260, 286, cb+100, cb-100, shade(trim,.88), null, shade(trim,1.1));
        for(let k=0;k<4;k++)
          box(ca-170+k*100, ca-110+k*100, cb-40, cb+40, 60, 78, '#8b6a4e','#7a5c44','#6a5039');
      };
      const items = [];
      for(const [ta, tb] of [[1000,-5220],[2600,-5220],[4200,-5220],[5800,-5220],[7400,-5220],
                             [8380,-4600],[8380,-4080],[900,-1000],[2240,-1000],[900,-2960]])
        items.push({ a:ta, b:tb, z:0, draw:() => tree(ta, tb) });
      items.push({ a:5600, b:-4600, z:0, draw:() => shelter(5600, -4600) });
      depthSort(items);
    }
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
