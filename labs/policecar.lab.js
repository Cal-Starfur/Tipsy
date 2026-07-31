/* ============================================================================
   POLICE CAR — lab 1
   Prototyped in labs/_bench.html against the live game.

   DESIGN NOTE
   This does not build a second car. The existing car in drawProp() is already
   ONE rigid geometry rotated as a unit through carT/carP/carDepth, and that is
   exactly the property that makes it safe at all four headings. Duplicating it
   for a police variant would fork that guarantee immediately.

   So the police car is the SAME car with two additions:
     1. livery  — a fixed two-tone instead of the seeded CAR_COLORS pick
     2. hardware — a roof light bar and a door decal, in the same local (a,b,h)
                   frame, so they rotate rigidly with the body like every other
                   panel and can never drift away from it.

   Ports into drawProp() as kind "policecar" sharing the car branch.
   ============================================================================ */

const POLICE_LIVERY = { n:"police", body:0xeceef2, bodyDk:0x23262e, roof:0xdfe2e7 };

const POLC = {
  barH:  13,        // light bar height above the roof
  barA:  12,        // half-length fore/aft — 14 units deep projected to a
                    // sliver in iso at some headings and the top lens all but
                    // vanished at f2; a real bar is deeper than it is tall
  barBF: 0.60,      // half-width, as a fraction of the car's own hw
  housing:   0x1b1e25,
  housingDk: 0x0f1116,
  red:  0xe03a2f, redHot:  0xff8a7a,
  blue: 0x3358d8, blueHot: 0x8fa8ff,
  lensDim: 0x5a616e,
  flashHz: 2.4,
  doorDk:  0x1b2130,
  doorLt:  0xdfe3ea
};

/* Roof light bar + door decal, in the car's own local frame.
   Caller supplies the same (x,y,z,fdir) the car body was drawn with. */
function drawPoliceHardware(sc, g, x, y, z, fdir, t){
  const CR = CARC;
  const hl = CR.len/2, hw = CR.wid/2, cz = CR.wheelR;
  const chassisTop = cz + CR.chassisH, cabinTop = chassisTop + CR.cabinH;
  const cl = hl*0.62;                       // car cabin half-length (not truck)

  /* same rigid transform trio the car body itself uses — one geometry,
     orientation applied after, never per-heading special cases. */
  const th = fdir*(Math.PI/2), cTh = Math.cos(th), sTh = Math.sin(th);
  const T = (a,b,h) => ({ x:a*cTh - b*sTh, y:a*sTh + b*cTh, z:h });
  const P = (a,b,h) => { const q = T(a,b,h); return sc.W(x+q.x, y+q.y, z+q.z); };
  const D = (a,b,h) => { const q = T(a,b,h); return q.x + q.y + q.z*0.4; };

  /* ---- flash phase ----
     Alternating, with a brief both-dark gap so it reads as a strobe rather
     than a smooth crossfade. Time base normalised so this behaves the same
     whether the caller's t is seconds or milliseconds. */
  const ts = t > 1000 ? t/1000 : t;
  const ph = (ts*POLC.flashHz) % 2;
  const redOn  = ph < 0.82;
  const blueOn = ph >= 1.0 && ph < 1.82;

  const bB = hw*POLC.barBF;
  const h0 = cabinTop, h1 = cabinTop + POLC.barH;
  const aF = POLC.barA, aR = -POLC.barA;

  /* housing: ONE hull over every corner, same technique the cabin uses, so
     coverage is gap-free at every heading instead of relying on panel order. */
  const corners = [];
  for(const a of [aR, aF]) for(const b of [-bB, bB]) for(const h of [h0, h1])
    corners.push(P(a, b, h));
  sc.quadOn(g, convexHull(corners), POLC.housing);

  /* lens halves: red one side, blue the other, split across b so the two
     colours sit side by side across the car's width. */
  const lensTop = (b0, b1, col) => sc.quadOn(g,
    [P(aR,b0,h1), P(aF,b0,h1), P(aF,b1,h1), P(aR,b1,h1)], col);

  /* DRAW ORDER IS NOT FIXED, AND MUST NOT BE GUESSED.
     Painting the top lenses before the side face looked correct at three
     headings and quietly lost the far top half at f2, where the side quad
     projects over it — 84 lit pixels against ~1400 at the other three. That
     is the manual-draw-order trap this whole codebase's gWorld/g/gFront stack
     is prone to, and eyeballing would not have caught it.

     The car's own panels never assume an order; they pick by depth. So:
     housing, then the camera-facing SIDE, then the top faces LAST. A light
     bar's top can never be occluded by that same bar's own side at any
     heading, so painting it last is correct by construction rather than by
     luck at three headings out of four. */

  /* which long side is camera-facing — picked by depth, never assumed,
     same as the car's own side glass and near wheels. */
  const sideB = D(0, bB, (h0+h1)/2) > D(0, -bB, (h0+h1)/2) ? bB : -bB;
  const sideLit = sideB > 0 ? blueOn : redOn;
  const sideCol = sideB > 0
    ? (blueOn ? POLC.blueHot : POLC.blue)
    : (redOn  ? POLC.redHot  : POLC.red);
  const sideQuad = [P(aR,sideB,h0), P(aF,sideB,h0), P(aF,sideB,h1), P(aR,sideB,h1)];
  sc.quadOn(g, sideQuad, sideCol);
  sc.edgeOn(g, sideQuad, POLC.housingDk, 1);

  lensTop(-bB, 0, redOn  ? POLC.redHot  : POLC.lensDim);
  lensTop(0,  bB, blueOn ? POLC.blueHot : POLC.lensDim);

  /* a soft bloom on the lit half so the strobe carries at small on-screen
     sizes, where a 14-unit bar is only a few pixels tall. */
  if(sideLit){
    const c = P(0, sideB, (h0+h1)/2);
    g.fillStyle(sideB > 0 ? POLC.blueHot : POLC.redHot, 0.28);
    g.fillCircle(c.x, c.y, POLC.barH*sc.K*0.9);
  }

  /* ---- door decal ----
     Sits on the camera-facing flank, between the wheels, riding the body
     side at belt height. Same depth pick as the bar. */
  const dB = D(0, hw, chassisTop) > D(0, -hw, chassisTop) ? hw : -hw;
  const dB1 = dB * 1.02;                       // just proud of the body skin
  const dh0 = cz + CR.chassisH*0.18, dh1 = chassisTop - 2;
  const da0 = -cl*0.85, da1 = cl*0.85;
  sc.quadOn(g, [P(da0,dB1,dh0), P(da1,dB1,dh0), P(da1,dB1,dh1), P(da0,dB1,dh1)],
            POLC.doorDk);
  /* shield block — deliberately abstract, no lettering: at this scale text
     turns to mud, and a plain light shape reads as a badge from further out. */
  const sa0 = -cl*0.22, sa1 = cl*0.22;
  const sh0 = dh0 + (dh1-dh0)*0.22, sh1 = dh0 + (dh1-dh0)*0.80;
  sc.quadOn(g, [P(sa0,dB1*1.01,sh0), P(sa1,dB1*1.01,sh0),
                P(sa1,dB1*1.01,sh1), P(sa0,dB1*1.01,sh1)], POLC.doorLt);
}

/* ---------------------------------------------------------------------------
   BENCH DRIVER — this part does NOT port. It exists only to stand a police
   car up next to the robot so the hardware above can be judged in the real
   world at real scale. In the game the car comes from the prop list.
   --------------------------------------------------------------------------- */
if(!window.__origCarColors) window.__origCarColors = CAR_COLORS.slice();

BENCH.hook(function(sc, t){
  const g = sc.gFront;

  /* Park it IN THE STREET beside the robot, in the real traffic lane, squared
     to the robot's heading — so each bench heading snap shows the car at that
     heading too, at a distance and framing the player will actually see.
     ROBOT_SIDE flips the lateral sign so "away from the sidewalk" is correct
     regardless of which band the walk is on. */
  const f  = sc.f;
  const h  = f*Math.PI/2;
  const ax = Math.cos(h),  ay = Math.sin(h);         // along travel
  const rx = -Math.sin(h), ry = Math.cos(h);         // right of travel

  /* Anchor to the CAMERA, not the robot. W() is camera-relative and the
     camera runs its own easing/look-ahead, so a world offset measured from
     the robot can sit hundreds of pixels off-frame while still being
     perfectly correct. The bench only needs the car framed so the art can be
     judged; real placement is lab 4's job, not this one's. */
  /* Keep the offset SMALL. At 130 the car sat near the top edge at f2 and the
     light bar — which rides high, z=128 — projected clean off the canvas, which
     read in the census as a heading-dependent rendering bug when it was only
     framing. Iso puts the same world offset at a different screen spot per
     heading, so the offset has to be small enough to stay framed at all four. */
  const lat = -ROBOT_SIDE * 70;
  const px = sc.camX + ax*20 + rx*lat;
  const py = sc.camY + ay*20 + ry*lat;

  /* borrow the game's own car renderer, with CAR_COLORS temporarily forced to
     the police two-tone — that is exactly what the "policecar" kind will do
     permanently, so what renders here is what will render in the game. */
  const saved = CAR_COLORS.slice();
  for(let i = 0; i < CAR_COLORS.length; i++) CAR_COLORS[i] = POLICE_LIVERY;
  try {
    sc.drawProp(g, "car", px, py, t, f, 0, null, 0);
  } finally {
    for(let i = 0; i < CAR_COLORS.length; i++) CAR_COLORS[i] = saved[i];
  }

  drawPoliceHardware(sc, g, px, py, 0, f, t);
});
