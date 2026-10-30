/* KIT 8: LANDMARKS AND LARGE BUILDINGS -- the checker (see docs/kits/landmarks.md).

   Needs the review copy (instr). Every library entry that declares a vol is
   drawn off screen and its STANDING pieces (from the ground to his height:
   walls, posts, piers, pumps) are compared with its collision (vol.foot and
   vol.solids, the same a/b frame the drawing uses):
     L1 drawn but not solid   a standing piece with no collision under it:
                              he drives through it ("I can drive through these")
     L2 solid but not drawn   a solid with nothing standing on it: an
                              invisible wall ("hitting an invisible object")
     L4 declared heights     the drawn top of a mass or solid against the height it declares (what the x-ray
                              and collision believe): 27d1226 "Marina General declares its real heights"
   And at every spot, while he stands still:
     L3 the building cache keeps repainting (live draws while still): an
        unstable bcDraw key -- something repaints every frame (CLAUDE.md) */

function install(){
  const s = game.scene.getScene('world');
  /* the cache's counters each second: judged only once it has stopped painting (headless paints slowly,
     and a piece waiting its turn is drawn live -- that is not an unstable key) */
  const R = window.__RVL = { S: [] };
  R.iv = setInterval(() => { if(s._bc) R.S.push([s.time.now, s._bc.live, s._bc.painted]); }, 1000);
  return true;
}
function collect(){
  const R = window.__RVL;
  if(!R) return null;
  clearInterval(R.iv);
  const S = R.S;
  if(S.length < 12) return null;
  /* the last 10 s */
  const a = S[S.length - 11], b = S[S.length - 1];
  return { live: b[1] - a[1], painted: b[2] - a[2], secs: Math.round((b[0] - a[0])/1000) };
}

async function probe(){
  const s = game.scene.getScene('world');
  if(!window.__RVK_shops) return { err: 'the page is not the review copy (run with instr)' };
  const SH = window.__RVK_shops();
  const g = s.add.graphics().setVisible(false);
  const G = (a, b, h) => ({ x: 600 + (a - b), y: 420 + (a + b)/2 - h });
  const R = { on: false, stack: [], calls: [] };
  window.__RVK = (n, a, ph) => { if(!R.on) return; if(ph === 0){ if(!R.stack.length) R.top = R.calls.length; R.calls.push({ n, a: Array.from(a).map(v => typeof v === 'number' ? v : null), d: R.stack.length }); R.stack.push(n); } else R.stack.pop(); };
  const num = v => typeof v === 'number' && isFinite(v);
  /* a standing piece's footprint (a0..a1, b0..b1) and its height range */
  const stand = c => {
    const a = c.a;
    if(c.n === 'box' && num(a[0])) return { a0: Math.min(a[0], a[1]), a1: Math.max(a[0], a[1]), b0: Math.min(a[2], a[3]), b1: Math.max(a[2], a[3]), z0: Math.min(a[4], a[5]), z1: Math.max(a[4], a[5]) };
    if(c.n === 'slab' && num(a[0])) return { a0: Math.min(a[0], a[1]), a1: Math.max(a[0], a[1]), b0: Math.min(a[4], a[5]), b1: Math.max(a[4], a[5]), z0: Math.min(a[2], a[3]), z1: Math.max(a[2], a[3]) };
    return null;
  };
  const inPoly = (x, y, P) => { let c = false; for(let i = 0, j = P.length - 1; i < P.length; j = i++){ const [xi, yi] = P[i], [xj, yj] = P[j]; if(((yi > y) !== (yj > y)) && (x < (xj - xi)*(y - yi)/(yj - yi) + xi)) c = !c; } return c; };
  const distPoly = (x, y, P) => { let m = 1e9; for(let i = 0, j = P.length - 1; i < P.length; j = i++){ const [x1, y1] = P[j], [x2, y2] = P[i], dx = x2 - x1, dy = y2 - y1, L = dx*dx + dy*dy || 1, u = Math.max(0, Math.min(1, ((x - x1)*dx + (y - y1)*dy)/L)); m = Math.min(m, Math.hypot(x - x1 - u*dx, y - y1 - u*dy)); } return m; };
  const shapes = v => [].concat(v.foot && v.foot.length > 2 && v.h > 0 ? [{ name: 'foot', poly: v.foot }] : [], (v.solids || []).filter(o => o.poly || o.c));
  const hit = (x, y, S, tol) => S.some(o => o.poly ? (inPoly(x, y, o.poly) || distPoly(x, y, o.poly) < tol) : Math.hypot(x - o.c[0], y - o.c[1]) < (o.r || 0) + tol);
  const PT = { a: new Float32Array(400000), b: new Float32Array(400000), z: new Float32Array(400000), c: new Int32Array(400000), n: 0 };
  const out = [];
  for(const shop of SH){
    const v = shop.vol;
    /* L1 for an entry with NO vol (most shops): its collision is the lot up to the building line (b <= 0), so
       anything standing on the footway in front of it (b > 0: a step, a stand, a board, a bench) is drawn and
       not solid -- the census's "N pavement props need collision volumes" */
    if(!v){
      R.calls = []; R.stack = []; R.on = true; R.top = -1; PT.n = 0;
      window.__RVP3 = (a, b, z) => { if(PT.n < PT.a.length){ PT.a[PT.n] = a; PT.b[PT.n] = b; PT.z[PT.n] = z; PT.c[PT.n] = R.stack.length ? R.top : -1; PT.n++; } };
      try { g.clear(); LIB.draw(shop.name, g, G, null, 1, null, true, false); } catch(e){}
      R.on = false; window.__RVP3 = null;
      const Wd = shop.ww || 230, F0 = [];
      /* round things and anything a helper draws (planters, pots, tubs): drawn points on the footway (b > 2)
         below his height, gathered in 30-unit cells, outside the pieces already reported */
      const cells = new Map();
      for(let i = 0; i < PT.n; i++){
        if(PT.b[i] <= 2 || PT.z[i] > 65 || PT.a[i] < -40 || PT.a[i] > Wd + 40) continue;
        const call = PT.c[i] >= 0 ? R.calls[PT.c[i]] : null;
        if(call && ['box', 'slab', 'F', 'T', 'S', 'shopDoor', 'glaze', 'reveal', 'blockWord', 'blockWordIn'].includes(call.n)) continue;
        const k = Math.floor(PT.a[i]/30) + ',' + Math.floor(PT.b[i]/30);
        let e = cells.get(k); if(!e){ e = { a0: 1e9, a1: -1e9, b0: 1e9, b1: -1e9, z0: 1e9, z1: -1e9, n: 0 }; cells.set(k, e); }
        e.a0 = Math.min(e.a0, PT.a[i]); e.a1 = Math.max(e.a1, PT.a[i]); e.b0 = Math.min(e.b0, PT.b[i]); e.b1 = Math.max(e.b1, PT.b[i]); e.z0 = Math.min(e.z0, PT.z[i]); e.z1 = Math.max(e.z1, PT.z[i]); e.n++;
      }
      const used = new Set();
      for(const [k, e] of cells){
        if(used.has(k) || e.n < 4 || e.z1 - e.z0 < 4) continue;
        const [ci, cj] = k.split(',').map(Number), box = Object.assign({}, e);
        for(const [k2, e2] of cells){ const [i2, j2] = k2.split(',').map(Number); if(Math.abs(i2 - ci) <= 1 && Math.abs(j2 - cj) <= 1){ used.add(k2); box.a0 = Math.min(box.a0, e2.a0); box.a1 = Math.max(box.a1, e2.a1); box.b0 = Math.min(box.b0, e2.b0); box.b1 = Math.max(box.b1, e2.b1); box.z0 = Math.min(box.z0, e2.z0); box.z1 = Math.max(box.z1, e2.z1); } }
        if(F0.some(f => f.box && !(f.box.a1 < box.a0 || f.box.a0 > box.a1 || f.box.b1 < box.b0 || f.box.b0 > box.b1))) continue;
        F0.push({ rule: 'L1 drawn but not solid', msg: `something round or helper-drawn standing on the footway in front of the shop (a ${Math.round(box.a0)}..${Math.round(box.a1)}, b ${Math.round(box.b0)}..${Math.round(box.b1)}) and the entry declares no collision for it`, box });
      }
      if(F0.length) out.push({ name: shop.name, findings: F0.slice(0, 6), more: Math.max(0, F0.length - 6) });
      continue;
    }
    const S = shapes(v);
    if(!S.length) continue;
    R.calls = []; R.stack = []; R.on = true; PT.n = 0;
    R.top = -1; window.__RVP3 = (a, b, z) => { if(PT.n < PT.a.length){ PT.a[PT.n] = a; PT.b[PT.n] = b; PT.z[PT.n] = z; PT.c[PT.n] = R.stack.length ? R.top : -1; PT.n++; } };
    try { g.clear(); LIB.draw(shop.name, g, G, null, 1, null, true, false); } catch(e){}
    const nFront = R.calls.length;
    if(shop.back){ try { g.clear(); LIB.draw(shop.name, g, G, null, 1, null, true, true); } catch(e){} }   // (and its rear elevation: the yard's bins and units)
    R.on = false; window.__RVP3 = null;
    const zs = shop.zs === undefined ? 1.5 : shop.zs, HIM = 75/zs*1.5/1.5;   // (his height in the entry's own units: ~110 game units / its z scale)
    const F = [];
    const pieces = R.calls.slice(0, nFront).filter(c => c.d === 0).map(stand).filter(p => p && p.z0 < 20 && p.z1 > 35 && (p.a1 - p.a0) < 900 && (p.b1 - p.b0) < 900);
    /* L1: each standing piece's middle must be inside a solid (within 18) */
    for(const p of pieces){
      const cx = (p.a0 + p.a1)/2, cy = (p.b0 + p.b1)/2;
      if(!hit(cx, cy, S, 18)) F.push({ rule: 'L1 drawn but not solid', msg: `a standing piece a ${Math.round(p.a0)}..${Math.round(p.a1)} b ${Math.round(p.b0)}..${Math.round(p.b1)}, ${Math.round(p.z1)} high, has no collision under it`, box: p });
    }
    /* L2: each solid must have something drawn standing on it: some point the entry drew (P) inside it,
       off the ground */
    for(const o of (v.solids || [])){
      if(!o.poly && !o.c) continue;
      const on = (x, y) => o.poly ? (inPoly(x, y, o.poly) || distPoly(x, y, o.poly) < 6) : Math.hypot(x - o.c[0], y - o.c[1]) < (o.r || 0) + 6;
      let drawn = false;
      for(let i = 0; i < PT.n && !drawn; i++) if(PT.z[i] > 4 && on(PT.a[i], PT.b[i])) drawn = true;
      if(!drawn){ const c = o.poly ? [o.poly.reduce((a, q) => a + q[0], 0)/o.poly.length, o.poly.reduce((a, q) => a + q[1], 0)/o.poly.length] : o.c;
        F.push({ rule: 'L2 solid but not drawn', msg: `solid "${o.name || '?'}" at (${Math.round(c[0])}, ${Math.round(c[1])}): nothing is drawn standing on it (an invisible wall)` }); }
    }
    /* L1 for ANY shape (posts drawn as tubes, gravestones and gates as prisms, kennels as polys): every point the
       entry drew, gathered in 40 x 40 cells; a cell that stands from the ground past knee height, outside all of
       its collision, is something drawn standing that he drives through. Neighbouring cells are one thing. */
    const C = new Map();
    for(let i = 0; i < PT.n; i++){
      const z = PT.z[i]; if(!(z >= 0 && z < 70)) continue;
      const k = Math.floor(PT.a[i]/40) + ',' + Math.floor(PT.b[i]/40);
      let c = C.get(k); if(!c){ c = { z0: 1e9, z1: -1e9, n: 0, a: 0, b: 0 }; C.set(k, c); }
      c.z0 = Math.min(c.z0, z); c.z1 = Math.max(c.z1, z); c.n++; c.a += PT.a[i]; c.b += PT.b[i];
    }
    const bad = new Set();
    for(const [k, c] of C) if(c.n >= 6 && c.z0 < 10 && c.z1 > 25 && !hit(c.a/c.n, c.b/c.n, S, 28)) bad.add(k);
    const seenK = new Set(); let nL1 = 0;
    for(const k of bad){
      if(seenK.has(k) || nL1 >= 6) continue;
      const st = [k], cl = []; seenK.add(k);
      while(st.length){ const q = st.pop(); cl.push(q); const [i, j] = q.split(',').map(Number);
        for(const [di, dj] of [[1,0],[-1,0],[0,1],[0,-1]]){ const e = (i+di) + ',' + (j+dj); if(bad.has(e) && !seenK.has(e)){ seenK.add(e); st.push(e); } } }
      const is = cl.map(q => q.split(',').map(Number)), zs1 = Math.max(...cl.map(q => C.get(q).z1));
      const box = { a0: Math.min(...is.map(v => v[0]))*40, a1: (Math.max(...is.map(v => v[0])) + 1)*40, b0: Math.min(...is.map(v => v[1]))*40, b1: (Math.max(...is.map(v => v[1])) + 1)*40, z0: 0, z1: zs1 };
      if(pieces.some(p => !(p.a1 < box.a0 || p.a0 > box.a1 || p.b1 < box.b0 || p.b0 > box.b1) && !hit((p.a0 + p.a1)/2, (p.b0 + p.b1)/2, S, 18))) continue;   // (already reported as a box or slab)
      nL1++;
      F.push({ rule: 'L1 drawn but not solid', msg: `something drawn standing at a ${box.a0}..${box.a1} b ${box.b0}..${box.b1}, ${Math.round(zs1)} high, has no collision under it`, box });
    }
    /* L4: the declared heights are what the x-ray and collision believe; the drawing is what you see. The
       main mass (vol.foot, vol.h) and each solid with a height: the drawn top (the 95th percentile of the
       points over it, so a flagpole or aerial does not count) against the height declared */
    /* a piece counts toward a height only if it stands up from the ground (its lowest point near 0: a column,
       a wall, a pump -- not the canopy above it); and a point counts for the smallest solid it is in (the pump
       on the island is the pump's, not the island's) */
    const cMin = new Map();
    for(let i = 0; i < PT.n; i++){ const c = PT.c[i]; cMin.set(c, Math.min(cMin.has(c) ? cMin.get(c) : 1e9, PT.z[i])); }
    const sArea = o => o.poly ? Math.abs(o.poly.reduce((a, q, i) => { const r = o.poly[(i + 1) % o.poly.length]; return a + q[0]*r[1] - r[0]*q[1]; }, 0))/2 : Math.PI*(o.r || 1)*(o.r || 1);
    const sIn = (o, x, y) => o.poly ? inPoly(x, y, o.poly) : Math.hypot(x - o.c[0], y - o.c[1]) < (o.r || 0);
    const owner = (x, y) => { let best = null, ba = 1e18; for(const o of (v.solids || [])){ if(!(o.poly || o.c) || !sIn(o, x, y)) continue; const ar = sArea(o); if(ar < ba){ ba = ar; best = o; } } return best; };
    const top = (on, who) => { const z = []; for(let i = 0; i < PT.n; i++){ if(!(cMin.get(PT.c[i]) < 10) || !on(PT.a[i], PT.b[i])) continue; if(who !== undefined && who !== null && owner(PT.a[i], PT.b[i]) !== who) continue; z.push(PT.z[i]); }
      if(z.length < 8) return null; z.sort((p, q) => p - q); return z[Math.floor(z.length*0.8)]; };
    const cmpH = (label, h, on, who) => {
      if(!(h > 0)) return;
      const t = top(on, who); if(t == null) return;
      if(t > h*1.3 + 15) F.push({ rule: 'L4 declared heights are real', msg: `${label} is declared ${Math.round(h)} high but drawn to ${Math.round(t)}: the x-ray and collision see it shorter than it is` });
      /* (drawn SHORTER than declared is not reported: round things -- tanks, drums -- draw through a transform
         that skips P, so their points are missing and only ever make a thing look shorter, never taller) */
    };
    /* the MAIN MASS's drawn height: the tallest of its big pieces (walls, roofs, the body -- each at least a
       quarter of the footprint's span), not a steeple, a chimney or a mast on top of it */
    if(v.foot && v.foot.length > 2){
      const fa = v.foot.map(q => q[0]), fb = v.foot.map(q => q[1]), span = Math.max(Math.max(...fa) - Math.min(...fa), Math.max(...fb) - Math.min(...fb));
      const E = new Map();
      for(let i = 0; i < PT.n; i++){ if(!inPoly(PT.a[i], PT.b[i], v.foot) && distPoly(PT.a[i], PT.b[i], v.foot) > 10) continue;
        const c = PT.c[i]; let e = E.get(c); if(!e){ e = { a0: 1e9, a1: -1e9, b0: 1e9, b1: -1e9, z1: -1e9 }; E.set(c, e); }
        e.a0 = Math.min(e.a0, PT.a[i]); e.a1 = Math.max(e.a1, PT.a[i]); e.b0 = Math.min(e.b0, PT.b[i]); e.b1 = Math.max(e.b1, PT.b[i]); e.z1 = Math.max(e.z1, PT.z[i]); }
      let t = null;
      for(const e of E.values()) if(Math.max(e.a1 - e.a0, e.b1 - e.b0) >= 0.25*span) t = t == null ? e.z1 : Math.max(t, e.z1);
      if(t != null && v.h > 0){
        if(t > v.h*1.3 + 15) F.push({ rule: 'L4 declared heights are real', msg: `the main mass is declared ${Math.round(v.h)} high but its walls and roof are drawn to ${Math.round(t)}: the x-ray and collision see it shorter than it is` });

      }
    }
    for(const o of (v.solids || [])) if(o.h > 0 && (o.poly || o.c) && sArea(o) > 6000) cmpH(`solid "${o.name || '?'}"`, o.h, (x, y) => sIn(o, x, y), o);
    if(F.length) out.push({ name: shop.name, findings: F.slice(0, 14), more: Math.max(0, F.length - 14) });
  }
  window.__RVK = null; g.destroy();
  return { entries: SH.filter(s => s.vol).length, out };
}

function judge(r, all){
  const F = [];
  if(r && r.painted === 0 && r.live > 0) F.push({ rule: 'L3 still things stay cached', who: 'building cache', msg: `${r.live} live building draws in the last ${r.secs} s while Tipsey stood still and the cache had finished painting (something repaints every frame: an unstable bcDraw key)` });
  else if(r && r.live > 0) F.push({ rule: 'info', who: '-', info: true, msg: `building cache still painting at the end of the watch (${r.painted} painted, ${r.live} live in the last ${r.secs} s): L3 not judged` });
  const P = all && all.__probe && all.__probe.landmarks;
  if(P && P.err) F.push({ rule: 'landmarks', who: '-', msg: P.err, info: true });
  if(P && P.out){
    F.push({ rule: 'info', who: '-', info: true, msg: `${P.entries} entries with a vol checked; ${P.out.length} with findings` });
    for(const e of P.out){ for(const f of e.findings) F.push({ rule: f.rule, who: e.name, msg: f.msg, box: f.box || null, flank: true }); if(e.more) F.push({ rule: 'info', who: e.name, info: true, msg: `...and ${e.more} more` }); }
  }
  return { findings: F };
}

module.exports = { name: 'landmarks', install, collect, judge, probe, instr: true, onceProbe: true };
