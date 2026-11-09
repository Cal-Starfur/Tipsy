/* KIT 4: THE SHOP LIBRARY'S PRIMITIVES -- the checker (see docs/kits/shops.md).

   Needs the review copy (harness instr: the primitives wrapped by a recorder).
   Every entry in the library (shops, houses, landmarks) is drawn off screen, at
   both flanks, and every primitive call it makes is checked against the
   contract in numbers -- not by eye, because draw order hides most of these:
     K1 slab inside out          slab(..., bFront, bBack) with bFront < bBack
     K2 across a door            something painted over a shopDoor opening
     K3 glass a wall             glaze() left at its default tint (92% opaque)
     K4 off its own lot          a proud piece past a - b >= 0 / a + b <= W, or a
                                 recessed one past a >= |b| / a <= W - |b| (it shows
                                 past the corner on one of the two mirrored edges)
     K5 lettering behind board   a word at a b behind the panel it is painted on
     K7 nothing floats           a raised box or slab with nothing under, over or behind it
     D0 a door drawn by hand     a dark door-sized panel on the ground outside any shopDoor (it can't open)
   Only calls an entry makes itself are judged (a slab's own faces are not). */

function install(){ return true; }
function collect(){ return null; }

async function probe(opts){
  const s = game.scene.getScene('world');
  if(!window.__RVK_shops) return { err: 'the page is not the review copy (run with instr)' };
  const SH = window.__RVK_shops(), ctx = window.__RVK_ctx;
  const g = s.add.graphics().setVisible(false);
  const G = (a, b, h) => ({ x: 600 + (a - b), y: 420 + (a + b)/2 - h });
  const R = { on: false, stack: [], calls: [] };
  const sv = v => typeof v === 'number' ? v : typeof v === 'string' ? v.slice(0, 12) : v == null ? v : typeof v;
  window.__RVK = (n, a, ph) => {
    if(!R.on) return;
    if(ph === 0){ if(!R.stack.length) R.top = R.calls.length; R.calls.push({ n, a: Array.from(a).map(sv), inDoor: R.stack.includes('shopDoor'), d: R.stack.length }); R.stack.push(n); }
    else R.stack.pop();
  };
  const num = v => typeof v === 'number' && isFinite(v);
  /* a call's box: a, b, z ranges (null where it has none) */
  const boxOf = c => {
    const a = c.a;
    switch(c.n){
      case 'F': return num(a[0]) && num(a[2]) ? { a0: Math.min(a[0], a[1]), a1: Math.max(a[0], a[1]), b0: num(a[7]) ? a[7] : 0, b1: num(a[7]) ? a[7] : 0, z0: Math.min(a[2], a[3]), z1: Math.max(a[2], a[3]) } : null;
      case 'S': return num(a[0]) ? { a0: a[0], a1: a[0], b0: Math.min(a[1], a[2]), b1: Math.max(a[1], a[2]), z0: Math.min(a[3], a[4]), z1: Math.max(a[3], a[4]) } : null;
      case 'T': return num(a[0]) ? { a0: Math.min(a[0], a[1]), a1: Math.max(a[0], a[1]), b0: Math.min(a[2], a[3]), b1: Math.max(a[2], a[3]), z0: a[4], z1: a[4] } : null;
      case 'box': return num(a[0]) ? { a0: Math.min(a[0], a[1]), a1: Math.max(a[0], a[1]), b0: Math.min(a[2], a[3]), b1: Math.max(a[2], a[3]), z0: Math.min(a[4], a[5]), z1: Math.max(a[4], a[5]) } : null;
      case 'slab': return num(a[0]) ? { a0: Math.min(a[0], a[1]), a1: Math.max(a[0], a[1]), b0: Math.min(a[4], a[5]), b1: Math.max(a[4], a[5]), z0: Math.min(a[2], a[3]), z1: Math.max(a[2], a[3]) } : null;
      case 'glaze': return num(a[0]) ? { a0: Math.min(a[0], a[1]), a1: Math.max(a[0], a[1]), b0: 0, b1: 0, z0: Math.min(a[2], a[3]), z1: Math.max(a[2], a[3]) } : null;
      case 'reveal': return num(a[0]) ? { a0: Math.min(a[0], a[1]), a1: Math.max(a[0], a[1]), b0: -(num(a[4]) ? a[4] : 0), b1: 0, z0: Math.min(a[2], a[3]), z1: Math.max(a[2], a[3]) } : null;
      case 'blockWordIn': return num(a[1]) ? { a0: a[1], a1: a[2], b0: num(a[5]) ? a[5] : 0, b1: num(a[5]) ? a[5] : 0, z0: a[3], z1: a[4] } : null;
      case 'blockWord': {
        if(!num(a[1]) || !num(a[3])) return null;
        const L = String(a[0]).length, half = (L*6 - 1)*a[3]/2, zs = (ctx && ctx().ZSCALE) || 1.5;
        return { a0: a[1] - half, a1: a[1] + half, b0: num(a[4]) ? a[4] : 0, b1: num(a[4]) ? a[4] : 0, z0: a[2] - 7*a[3]/zs, z1: a[2] };
      }
    }
    return null;
  };
  const ov = (p0, p1, q0, q1) => Math.min(p1, q1) - Math.max(p0, q0);
  const out = [];
  for(const shop of SH){
    const name = shop.name, F = new Map();
    const add = (rule, msg, box, fl) => { const k = rule + '|' + msg; if(!F.has(k)) F.set(k, { rule, msg, box: box || null, flank: fl === undefined ? null : fl }); };
    for(const flank of [true, false]){
      R.calls = []; R.stack = []; R.on = true; R.top = -1;
      const PA = [], PB = [], PZ = [], PC = [];
      window.__RVP3 = (a, b, z) => { if(PA.length < 300000){ PA.push(a); PB.push(b); PZ.push(z); PC.push(R.stack.length ? R.top : -1); } };
      try { g.clear(); LIB.draw(name, g, G, null, 1, null, flank, false); } catch(e){ add('error', String(e).slice(0, 100)); }
      R.on = false; window.__RVP3 = null;
      const C = R.calls, Wd = shop.ww || (ctx && ctx().W) || 230;
      /* the doors: the opening each shopDoor paints (its own '#2b2118' panel) */
      /* the wall's height H: the front wall panel (a full-width F from the ground at the face) */
      const Hwall = C.reduce((m, c) => { if(c.d !== 0 || c.n !== 'F') return m; const b = boxOf(c); return b && b.z0 <= 0.5 && Math.abs(b.b0) < 0.6 && (b.a1 - b.a0) > 0.9*(shop.ww || 230) ? Math.max(m, b.z1) : m; }, 0);
      const centred = C.some(c => { const b = c.d === 0 && boxOf(c); return b && b.a0 < -20; });   // (an entry drawn about its own middle, not a lot from a = 0)
      const doors = [];
      C.forEach((c, i) => { if(c.n === 'F' && c.inDoor && c.a[4] === '#2b2118'){ const b = boxOf(c); if(b) doors.push(Object.assign(b, { i })); } });
      C.forEach((c, i) => {
        if(c.d !== 0) return;
        const b = boxOf(c);
        if(c.n === 'slab' && num(c.a[4]) && num(c.a[5]) && c.a[4] < c.a[5] - 0.01) add('K1 slab inside out', `slab(${c.a.slice(0, 6).map(v => num(v) ? +v.toFixed(1) : v).join(', ')}): bFront < bBack`);
        /* K3 (v2): the 92% default is only a fault with something standing behind the pane (Sir accepted
           opaque glass on empty or barred panes: Cove Locksmith .90, The Sandpiper Arms .80) */
        if(c.n === 'glaze' && c.a[5] === undefined && b && C.some((q, j) => { if(j === i || q.d !== 0) return false; const k = boxOf(q); return k && k.b1 < -0.4 && ov(k.a0, k.a1, b.a0, b.a1) > 3 && ov(k.z0, k.z1, b.z0, b.z1) > 3; })) add('K3 glass a wall', `glaze over a ${b ? Math.round(b.a1 - b.a0) : '?'} wide opening, with goods behind it, left at the default tint (92% opaque; approved with goods: .30-.46)`, b, flank);
        if(!b) return;
        const facade = Wd <= 700 && !centred && b.b0 > -60 && b.b1 < 60 && c.n !== 'T' && c.n !== 'S' && !(b.a0 <= 0.5 && b.a1 >= Wd - 0.5);   // (full width: the building's own mass, its end is its flank)   // (a shop or house lot's street face; big sites and interiors keep their own frames)      // (a piece on the street face; floors, roofs and a big site's depths are not)
        for(const d of doors){
          if(b.z1 <= d.z0 + 12) continue;                                           // a step or threshold at its foot
          if(i <= d.i) continue;                                                   // painted first: the door covers it (approved: Saltwater Sweets, Low Tide Music, Driftwood Lofts)
          if(ov(b.a0, b.a1, d.a0, d.a1) > 3 && ov(b.z0, b.z1, d.z0, d.z1 + 7) > 8 && b.b1 >= -3 && c.n !== 'reveal')   // (approved hoods and fascias touch the door head by up to 7: Driftwood Books, Marina Optical)
            add('K2 across a door', `${c.n} a ${Math.round(b.a0)}..${Math.round(b.a1)} z ${Math.round(b.z0)}..${Math.round(b.z1)} b ${+b.b1.toFixed(1)} crosses the door opening a ${Math.round(d.a0)}..${Math.round(d.a1)}${i > d.i ? ', painted over it' : ' (painted first: the door is drawn over it, so it only shows in the numbers -- the door sits behind its face)'}`, { a0: b.a0, a1: b.a1, b0: b.b0, b1: b.b1, z0: b.z0, z1: b.z1, painted: i > d.i, door: { a0: d.a0, a1: d.a1, z0: d.z0, z1: d.z1 + 7 } }, flank);
        }
        if(facade && b.b0 > 0.5 && (b.a0 < -0.5 || b.a1 > Wd + 0.5) && !/^blockWord/.test(c.n))   // (v2: only the a-range must stay in 0..WW -- the Tea house note; approved signs and hoods overhang the return on screen by up to 27)
          add('K4 off its own lot', `${c.n} a ${Math.round(b.a0)}..${Math.round(b.a1)}, ${+b.b1.toFixed(1)} proud, runs past its own lot (0..${Wd}): onto the neighbour`, b, 'both');
        /* the set-back case is K16, measured the way the library's census measured it (below) */
      });
      /* H1: no secondary grass -- a green plate on the ground is the entry painting its own lawn; and a house
         laying its own yard base (a site's forecourt, car park or floor is part of the site) */
      let isHouse = false; try { const rf = LIB.roofOf(name); isHouse = !!(rf && rf.length) && Wd <= 700; } catch(e){}
      const rgb = v => { if(typeof v === 'number') return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; if(typeof v === 'string' && /^#[0-9a-f]{6}/i.test(v)) return [1, 3, 5].map(i => parseInt(v.slice(i, i + 2), 16)); return null; };
      C.forEach(c => {
        if(c.d !== 0 || c.n !== 'T') return;
        const b = boxOf(c), col = rgb(c.a[5]);
        if(!b || b.z0 > 1) return;
        const area = (b.a1 - b.a0)*(b.b1 - b.b0), lot = Wd*(shop.dd || 276);
        if(col && area > 1500 && col[1] > col[0] + 10 && col[1] > col[2] + 15)
          add('H1 no secondary grass', `a green ground plate (${c.a[5]}) a ${Math.round(b.a0)}..${Math.round(b.a1)} b ${Math.round(b.b0)}..${Math.round(b.b1)}: the entry paints its own lawn`, b, flank);
        /* ...or its own yard base, lot slab or forecourt plate: any flat plate over a quarter of its lot (an interior's floor is its room) */
        else if(area > 0.25*lot && isHouse)
          add('H1b no yard base', `a ground plate (${c.a[5]}) over ${Math.round(100*area/lot)}% of the lot, a ${Math.round(b.a0)}..${Math.round(b.a1)} b ${Math.round(b.b0)}..${Math.round(b.b1)}: a yard base or slab of its own over the block's ground`, b, flank);
      });
      /* K16 ("return +N", the library census's own measure): a set-back piece's far end lands at screen-a
         a1 - bBack on the mirrored edge; past the return W it shows on the side wall. The wall-head cornice
         (z0 >= H) is exempt -- "the parapet above stays full width, that one is a cornice" -- and so is anything
         inside an opening (goods behind glass) */
      if(Wd <= 700 && !centred) C.forEach(c => {
        if(c.d !== 0 || !['slab', 'F', 'box'].includes(c.n)) return;
        const b = boxOf(c); if(!b || b.b0 > -0.5 || b.b0 < -60 || (Hwall && b.z0 >= Hwall - 1)) return;
        if(C.some(q => q.d === 0 && (q.n === 'reveal' || q.n === 'glaze') && (() => { const o = boxOf(q); return o && ov(o.a0, o.a1, b.a0, b.a1) > 0.5*(b.a1 - b.a0) && ov(o.z0, o.z1, b.z0, b.z1) > 0.5*Math.max(1, b.z1 - b.z0); })())) return;
        const over = b.a1 - b.b0 - Wd;
        if(over > 0.5) add('K16 bands to the corner', `${c.n} a ${Math.round(b.a0)}..${Math.round(b.a1)} z ${Math.round(b.z0)}..${Math.round(b.z1)} set back to ${+b.b0.toFixed(1)}: its far end lands at screen-a ${Math.round(b.a1 - b.b0)} against the return at ${Wd} (return +${Math.round(over)}); run it 0..W with bBack 0, or pull it in`, b, 'both');
      });
      /* D0: a door drawn by hand -- a dark panel standing on the ground at a door's size, painted outside any
         shopDoor. The kit's door is the one that opens, that people come through (doors kit), and that K2 can
         see; a painted one stays shut, so whoever uses it pops (the mall's street bays) */
      const lum = col => col ? (0.299*col[0] + 0.587*col[1] + 0.114*col[2])/255 : 1;
      C.forEach(c => {
        if(c.d !== 0 || c.n !== 'F' || c.inDoor) return;
        const b = boxOf(c), col = rgb(c.a[4]);
        if(!b || b.z0 > 4) return;
        const w = b.a1 - b.a0, h = b.z1 - b.z0;
        if(!isHouse && w >= 40 && w <= 170 && w < 0.9*Wd && h >= 70 && h <= 200 && lum(col) < 0.3 && !doors.some(d => ov(b.a0, b.a1, d.a0, d.a1) > 0.5*w))
          add('D0 doors are the kit\'s door', `a ${Math.round(w)} x ${Math.round(h)} dark panel (${c.a[4]}) standing on the ground at a ${Math.round(b.a0)}..${Math.round(b.a1)}: a door painted by hand, not shopDoor -- it cannot open, so anyone using it pops`, b, flank);
      });
      /* K7: contact reads, proximity does not -- a raised box or slab (z0 above the ground) must sit on
         something (a top within 3 of its foot, overlapping it), hang under something (a piece whose underside
         is its top), or be fixed to a wall plane (its depth reaching b = 0, the facade, or a wall's face) */
      C.forEach((c, i) => {
        if(c.d !== 0 || (c.n !== 'box' && c.n !== 'slab')) return;
        const b = boxOf(c); if(!b || b.z0 < 4) return;
        if(Wd > 700 || /Interior|Basement/.test(name) || b.b0 < -60 || b.b1 > 60) return;   // (the street face of a lot: where every float was found; interiors and big sites draw by other roads too)
        /* anything else drawn: just under its foot within its footprint (it sits), just over its top (it hangs),
           or on one of its four faces across its height (it is fixed to a wall, a post, a frame) */
        let ok = false;
        for(let k = 0; k < PA.length && !ok; k++){
          if(PC[k] === i) continue;
          const x = PA[k], y = PB[k], z = PZ[k];
          const inA = x > b.a0 - 2 && x < b.a1 + 2, inB = y > b.b0 - 2 && y < b.b1 + 2;
          if(inA && inB && ((z <= b.z0 + 1.5 && z >= b.z0 - 6) || (z >= b.z1 - 1.5 && z <= b.z1 + 6))) ok = true;
          else if(z >= b.z0 - 2 && z <= b.z1 + 2 && ((inA && (Math.abs(y - b.b0) < 2.5 || Math.abs(y - b.b1) < 2.5)) || (inB && (Math.abs(x - b.a0) < 2.5 || Math.abs(x - b.a1) < 2.5)))) ok = true;
        }
        /* ...or against a whole face: a panel (F, at its b) or a side (S, at its a), or another box's face --
           a big wall is drawn as one face with points only at its corners */
        if(!ok) ok = C.some((q, j) => {
          if(j === i || q.d !== 0) return false;
          const p = boxOf(q); if(!p) return false;
          const zo = ov(p.z0, p.z1, b.z0, b.z1) >= 0, ao = ov(p.a0, p.a1, b.a0, b.a1) >= 0, bo = ov(p.b0, p.b1, b.b0, b.b1) >= 0;
          const nearB = Math.abs(p.b1 - b.b0) < 2.5 || Math.abs(p.b0 - b.b1) < 2.5 || Math.abs(p.b1 - b.b1) < 2.5 || Math.abs(p.b0 - b.b0) < 2.5;
          const nearA = Math.abs(p.a1 - b.a0) < 2.5 || Math.abs(p.a0 - b.a1) < 2.5;
          const nearZ = Math.abs(p.z1 - b.z0) < 3 || Math.abs(p.z0 - b.z1) < 3;
          return (zo && ao && nearB) || (zo && bo && nearA) || (ao && bo && nearZ);
        });
        if(!ok && !(b.b0 <= 0.6 && b.b1 >= -0.6)) add('K7 nothing floats', `${c.n} a ${Math.round(b.a0)}..${Math.round(b.a1)} b ${Math.round(b.b0)}..${Math.round(b.b1)} starts ${Math.round(b.z0)} up with nothing under it, over it or against it`, b, flank);
      });
      /* the facade plane: an entry whose street face is at b = 0 (a panel across most of the lot there) --
         the two checks below only read entries drawn that way */
      const facade0 = C.some(c => { if(c.d !== 0 || c.n !== 'F') return false; const b = boxOf(c); return b && Math.abs(b.b0) < 0.6 && (b.a1 - b.a0) > 0.6*Wd; });
      const openings = C.map(c => c.d === 0 && (c.n === 'reveal' || c.n === 'glaze') ? boxOf(c) : null).filter(Boolean).concat(doors.map(d => Object.assign({ b0: -30, b1: 0 }, d)));
      /* K8: a fixture (a sign, a board, a clock, a box, lettering) sits ON the wall, at b >= 0 -- unless it is in
         an opening (goods behind glass, a door's own parts). Behind the facade it is inside the masonry and
         shows only because it is painted after the wall */
      if(facade0 && Wd <= 700) C.forEach(c => {
        if(c.d !== 0 || c.inDoor || !['box', 'blockWord', 'blockWordIn'].includes(c.n)) return;   // (lettering and mounted things: clocks, lamps, flags, boxes -- a recessed window or a 1-unit sill inset is a detail, not a fixture)
        const b = boxOf(c); if(!b || b.b1 >= -1.5 || b.b1 < -40 || b.z1 < 20 || (Hwall && b.z0 >= Hwall - 1)) return;   // (on the roof: approved roof plant)
        if((b.a1 - b.a0) > 0.6*Wd) return;                                    // (a full-width band set back is K4's)
        const inOpening = openings.some(o => ov(o.a0, o.a1, b.a0, b.a1) > 0.5*(b.a1 - b.a0) && ov(o.z0, o.z1, b.z0, b.z1) > 0.5*(b.z1 - b.z0 || 1));
        if(!inOpening) add('K8 fixtures sit on the wall', `${c.n === 'blockWord' || c.n === 'blockWordIn' ? '"' + String(c.a[0]).slice(0, 16) + '"' : c.n} a ${Math.round(b.a0)}..${Math.round(b.a1)} z ${Math.round(b.z0)}..${Math.round(b.z1)} is at b ${+b.b1.toFixed(1)}: inside the masonry, not on the wall`, b, flank);
      });
      /* K10: every opening keeps a pier -- at least 10 of wall to the lot's ends (12 at a corner) and between
         openings. Without it a frame or band runs into the next, or off the corner */
      if(facade0 && Wd <= 700){
        const ops = doors.map(d => ({ a0: d.a0, a1: d.a1, z0: d.z0, z1: d.z1, k: 'door' }))
          .concat(C.filter(c => c.d === 0 && c.n === 'reveal').map(c => Object.assign(boxOf(c), { k: 'window' })))
          .filter(o => o && o.z0 < 60).sort((p, q) => p.a0 - q.a0);
        for(let k = 0; k < ops.length; k++){
          const o = ops[k];
          if(o.a0 < 4.5) add('K12 a pier at every opening', `the ${o.k} at a ${Math.round(o.a0)}..${Math.round(o.a1)} leaves ${+o.a0.toFixed(1)} of wall to the a = 0 end (approved: 4.5 or more)`, o, flank);
          if(o.a1 > Wd - 4.5) add('K12 a pier at every opening', `the ${o.k} at a ${Math.round(o.a0)}..${Math.round(o.a1)} leaves ${+(Wd - o.a1).toFixed(1)} of wall to the a = W end (approved: 4.5 or more)`, o, flank);
          const n = ops[k + 1];
          if(n && n.a0 - o.a1 < 4.5 && n.a0 - o.a1 > -200) add('K12 a pier at every opening', `${+Math.max(0, n.a0 - o.a1).toFixed(1)} of wall between the ${o.k} at a ${Math.round(o.a0)}..${Math.round(o.a1)} and the ${n.k} at a ${Math.round(n.a0)}..${Math.round(n.a1)} (approved: 9-13; fault under 4.5)`, { a0: o.a1 - 2, a1: n.a0 + 2, b0: 0, b1: 0, z0: Math.max(o.z0, n.z0), z1: Math.min(o.z1, n.z1) }, flank);
        }
      }
      /* K5 (v2): approved fascias often letter with a plain panel (F) on the board instead of blockWord: a panel
         lying inside a board's a/z box must sit proud of the board's front (the census flags "lettering behind board") */
      C.forEach((c, i) => {
        if(c.d !== 0 || c.n !== 'F') return;
        const w = boxOf(c); if(!w || (w.a1 - w.a0) > 0.95*Wd) return;
        for(let j = 0; j < C.length; j++){
          const q = C[j]; if(j === i || q.d !== 0 || q.n !== 'slab') continue;
          const bd = boxOf(q); if(!bd) continue;
          const front = Math.max(q.a[4], q.a[5]), back = Math.min(q.a[4], q.a[5]);
          if(w.a0 >= bd.a0 - 2 && w.a1 <= bd.a1 + 2 && w.z0 >= bd.z0 - 1 && w.z1 <= bd.z1 + 1 && (bd.z1 - bd.z0) < 60 && Math.abs(front) < 60 && w.b1 < back - 0.05){   // (behind the board's BACK face, the census's measure; Marina Tailors' approved panel sits between its faces)
            add('K5 lettering behind its board', `a panel on the board a ${Math.round(bd.a0)}..${Math.round(bd.a1)} z ${Math.round(bd.z0)}..${Math.round(bd.z1)} sits at b ${+w.b1.toFixed(1)}, behind the board's own back face at ${+back.toFixed(1)}`, w, flank); break;
          }
        }
      });
      /* K5: lettering behind the panel it sits on */
      C.forEach((c, i) => {
        if(c.d !== 0 || !/^blockWord/.test(c.n)) return;
        const w = boxOf(c); if(!w) return;
        for(const p of C){
          if(p.d !== 0 || (p.n !== 'F' && p.n !== 'slab')) continue;
          const q = boxOf(p); if(!q) continue;
          const front = p.n === 'F' ? q.b1 : Math.max(p.a[4], p.a[5]);
          if(Math.abs(w.b1) < 60 && front > w.b1 + 0.05 && front < w.b1 + 15 && ov(q.a0, q.a1, w.a0, w.a1) > 0.5*(w.a1 - w.a0) && ov(q.z0, q.z1, w.z0, w.z1) > 0.5*(w.z1 - w.z0)){
            add('K5 lettering behind its board', `"${String(c.a[0]).slice(0, 18)}" at b ${+w.b1.toFixed(2)} behind a panel whose face is at b ${+front.toFixed(2)}`); break;
          }
        }
      });
    }
    /* H2: a house (it has roof faces) whose door is never recorded: its door cannot open, nobody comes out */
    try { const roof = LIB.roofOf(name); if(roof && roof.length && !shop.door && !/garage/i.test(name)) add('H2 a house has a working door', 'no door declared (the entry has no door field: the game cannot open it, nobody comes or goes)'); } catch(e){}
    if(F.size) out.push({ name, findings: [...F.values()] });
  }
  window.__RVK = null;
  g.destroy();
  /* the library's own open-defect flags: fTodo (a facade fault, e.g. 'lettering behind board', 'return +12') and
     cTodo ('N pavement props need collision volumes') -- the answer key a rule's hits are measured against */
  const index = SH.map(sh => ({ name: sh.name, fTodo: sh.fTodo || null, cTodo: sh.cTodo || null, kTodo: sh.kTodo || null }));
  return { entries: SH.length, out, index };
}

function judge(r, all){
  const P = all && all.__probe && all.__probe.shops;
  const F = [];
  if(!P) return { findings: [] };
  if(P.err) return { findings: [{ rule: 'shops', who: '-', msg: P.err }] };
  const byRule = {};
  for(const e of P.out) for(const f of e.findings){ (byRule[f.rule] = byRule[f.rule] || new Set()).add(e.name); F.push({ rule: f.rule, who: e.name, msg: f.msg, box: f.box, flank: f.flank }); }
  F.unshift({ rule: 'info', who: '-', info: true, msg: `${P.entries} library entries drawn; entries with findings by rule: ` + Object.entries(byRule).map(([k, v]) => `${k.split(' ')[0]} ${v.size}`).join(', ') });
  return { findings: F };
}

module.exports = { name: 'shops', install, collect, judge, probe, instr: true, once: true };
