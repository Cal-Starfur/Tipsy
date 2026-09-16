/* =====================================================================
   SHOPFRONT VOL -- the 3D half of an entry
   =====================================================================
   WHY THIS EXISTS. An entry used to be a draw() and nothing else. The
   Charge depot port had to re-derive the building as a physical thing
   from its drawing code -- room rect, door gap, jambs, height, pads,
   mat -- into ~190 lines of depot-only functions full of numbers copied
   out of the art. Every on-device bug that port produced (mirrored
   frame, phantom wall inside the door, x-ray using the walkable carve,
   jambs tipping 9/18) lived in that hand re-derivation. 82 shops would
   have been 82 more.

   So an entry now DECLARES its volume, next to its draw(), and this file
   answers every physical question from the declaration alone. The lab
   draws it over the art (Vol toggle) so a mismatch is caught on the
   bench, not on-device. The game reads the same declaration.

   THE DECLARATION -- all in the entry's own frame: a along the frontage,
   b 0 at the glass and negative into the block. Heights are the entry's
   OWN z units (before zs); volWorldH() applies zs.

     vol: {
       foot:   [[a,b], ...]      solid mass footprint (default: 0..ww by -dd..0)
       h:      300               mass height (default: measured from body())
       opens:  [{ name, poly, walk, see, h }]
                                 carved out of the foot.
                                 walk  true -> Tipsey can be in it
                                 see   'street' -> see-through only from the
                                       entry's own (street) view; 'always';
                                       'never' (drivable under a roof)
                                 h     what the x-ray reads when see-through
       solids: [{ name, poly | c:[a,b] + r, h, prop }]
                                 free-standing volumes (bollards, walls,
                                 kiosks). prop:true -> only with kerb props on
       zones:  [{ name, poly | c + r, kind }]   paint / triggers. No volume.
       marks:  { name: [a,b] }           named points: pads, mat, spawn, door
     }

   WHAT IS DERIVED, never authored: the collision BOUNDARY. Every edge of
   the foot, every open and every polygon solid is cut into short pieces,
   and a piece is kept only where one side of it is solid and the other
   is not. So a room's wall face that runs into a doorway stops at the
   doorway by construction -- the phantom wall cannot exist -- and a jamb
   is a real thin wall with rounded ends and true normals, with nobody
   having to write a jamb.
   ===================================================================== */

const VOL_BOT_R = 30;          // botR in game/index.html
const VOL_PIECE = 2;           // boundary resolution, entry units

function volRect(a0, a1, b0, b1){ return [[a0,b0],[a1,b0],[a1,b1],[a0,b1]]; }

function volPip(poly, a, b){
  let inside = false;
  for(let i = 0, j = poly.length - 1; i < poly.length; j = i++){
    const [ai, bi] = poly[i], [aj, bj] = poly[j];
    if(((bi > b) !== (bj > b)) && (a < (aj - ai) * (b - bi) / (bj - bi) + ai)) inside = !inside;
  }
  return inside;
}

/* a declared shape: { poly } or { c:[a,b], r } -- solids and zones both */
function volInShape(s, a, b){
  return s.c ? Math.hypot(a - s.c[0], b - s.c[1]) < s.r : volPip(s.poly, a, b);
}

function volSegDist(a, b, s){
  const dx = s[2] - s[0], dy = s[3] - s[1], L2 = dx*dx + dy*dy || 1e-9;
  const u = Math.max(0, Math.min(1, ((a - s[0])*dx + (b - s[1])*dy) / L2));
  const qa = s[0] + u*dx, qb = s[1] + u*dy;
  return { d: Math.hypot(a - qa, b - qb), qa, qb };
}

/* the entry's lot rectangle -- what the packer reserves, whatever the
   mass inside it looks like */
function volLot(shop, dflt){
  const w = shop.ww || dflt.W, d = shop.dd || dflt.D;
  return { a0:0, a1:w, b0:-d, b1:0 };
}

/* NORMALISE. Unauthored entries get the honest default -- the lot as a
   solid box to the measured height -- and say so (authored:false), so the
   bench can show which ones still owe a declaration. */
function volOf(shop, measured, dflt){
  const src = shop.vol || null;
  const lot = volLot(shop, dflt);
  const v = {
    authored: !!src,
    lot,
    foot:   (src && src.foot) || volRect(lot.a0, lot.a1, lot.b0, lot.b1),
    h:      (src && src.h != null) ? src.h : (measured && measured.h) || 0,
    opens:  ((src && src.opens) || []).map(o => Object.assign({ walk:true, see:'street', h:0 }, o)),
    solids: (src && src.solids) || [],
    zones:  (src && src.zones) || [],
    marks:  (src && src.marks) || {},
    measured: measured || null
  };
  v.bound = volBoundary(v);
  return v;
}

/* is (a,b) inside SOLID mass? props: whether kerb props count */
function volSolidAt(v, a, b, props){
  for(const s of v.solids){
    if(s.prop && !props) continue;
    if(volInShape(s, a, b)) return true;
  }
  if(!volPip(v.foot, a, b)) return false;
  for(const o of v.opens) if(o.walk && volPip(o.poly, a, b)) return false;
  return true;
}

/* the derived collision boundary: [a0,b0,a1,b1] segments between solid
   and free. Circles are kept analytic, so props are not in here. */
function volBoundary(v){
  const polys = [v.foot, ...v.opens.filter(o => o.walk).map(o => o.poly),
                 ...v.solids.filter(s => s.poly).map(s => s.poly)];
  const out = [];
  const EPS = 0.6;
  const solid = (a, b) => {
    for(const s of v.solids) if(s.poly && volPip(s.poly, a, b)) return true;
    if(!volPip(v.foot, a, b)) return false;
    for(const o of v.opens) if(o.walk && volPip(o.poly, a, b)) return false;
    return true;
  };
  for(const poly of polys){
    for(let i = 0; i < poly.length; i++){
      const [a0, b0] = poly[i], [a1, b1] = poly[(i + 1) % poly.length];
      const L = Math.hypot(a1 - a0, b1 - b0); if(L < 1e-6) continue;
      const na = -(b1 - b0) / L, nb = (a1 - a0) / L;
      const n = Math.max(1, Math.ceil(L / VOL_PIECE));
      let run = null;
      for(let k = 0; k < n; k++){
        const u0 = k / n, u1 = (k + 1) / n, um = (u0 + u1) / 2;
        const ma = a0 + (a1 - a0)*um, mb = b0 + (b1 - b0)*um;
        const keep = solid(ma + na*EPS, mb + nb*EPS) !== solid(ma - na*EPS, mb - nb*EPS);
        if(keep){
          if(!run) run = [a0 + (a1 - a0)*u0, b0 + (b1 - b0)*u0];
          run[2] = a0 + (a1 - a0)*u1; run[3] = b0 + (b1 - b0)*u1;
        } else if(run){ out.push(run); run = null; }
      }
      if(run) out.push(run);
    }
  }
  /* coincident edges (a doorway's side lying on a room's side) would be
     reported twice; drop exact duplicates so the overlay and the census
     count real surfaces */
  const seen = new Set();
  return out.filter(s => {
    const k = s.map(x => x.toFixed(2)).join(','), r = [s[2],s[3],s[0],s[1]].map(x => x.toFixed(2)).join(',');
    if(seen.has(k) || seen.has(r)) return false;
    seen.add(k); return true;
  });
}

/* NEAREST SURFACE to a body centre: distance, and the unit normal off it
   toward the centre. The one query collision and the tip test both need. */
function volNearest(v, a, b, props){
  let best = { d: Infinity, na: 0, nb: 0, what: null };
  for(const s of v.bound){
    const q = volSegDist(a, b, s);
    if(q.d < best.d) best = { d: q.d, qa: q.qa, qb: q.qb, what: 'wall' };
  }
  for(const s of v.solids){
    if(!s.c || (s.prop && !props)) continue;
    const dc = Math.hypot(a - s.c[0], b - s.c[1]), d = Math.abs(dc - s.r);
    if(d < best.d){
      const u = dc > 1e-9 ? 1/dc : 0;
      best = { d, qa: s.c[0] + (a - s.c[0])*u*s.r, qb: s.c[1] + (b - s.c[1])*u*s.r, what: s.name || 'solid' };
    }
  }
  if(best.d < Infinity){
    const L = best.d || 1e-9;
    best.na = (a - best.qa) / L; best.nb = (b - best.qb) / L;
    if(best.d < 1e-6){ best.na = 0; best.nb = 0; }
  }
  return best;
}

/* CAN A BODY OF RADIUS R STAND HERE? */
function volBlockedAt(v, a, b, R, props){
  if(volSolidAt(v, a, b, props)) return true;
  return volNearest(v, a, b, props).d < R;
}

/* WHAT THE X-RAY SEES. Visual, not walkable: an open room is only
   see-through from the view it opens toward. null off the lot, 0 on the
   lot but outside the mass (a chamfer's pavement), else a height in the
   entry's own z units. */
function volBuiltHeight(v, a, b, view, props){
  for(const s of v.solids){
    if(s.prop && !props) continue;
    if(volInShape(s, a, b)) return s.h || 0;
  }
  const L = v.lot;
  if(a < L.a0 || a > L.a1 || b < L.b0 || b > L.b1) return null;
  if(!volPip(v.foot, a, b)) return 0;
  for(const o of v.opens){
    if(!volPip(o.poly, a, b)) continue;
    if(o.see === 'always' || (o.see === 'street' && view === 'street')) return o.h;
  }
  return v.h;
}

function volZoneAt(v, a, b){
  return v.zones.filter(z => volInShape(z, a, b)).map(z => z.name);
}

function volWorldH(shop, h, labZs){ return h * (shop.zs === undefined ? labZs : shop.zs); }
