/* WALK-IN KIT W37 CHECK -- inside one piece, back to front and only what the eye sees (Sir, 2026-11-19, Sandpiper Bakery:
   "make it a kit rule so it doesn't happen again"). Boots the game headless and draws every piece of every walk-in room through
   the library (LIB.collect, LIB.drawItem), recording each drawing call's points, and reports:
     clip     a runPiece fixture whose zTop is above the top its draw reaches (the next run repaints the top over what stands on
              it: the bakery's cakes) -- or below it (its own top cut off)
     back     a side face (S) painted at the WEST end of what that piece already drew (a face turned away from the eye, drawn over
              the front: the bakery's case), or a front face (F) at the NORTH side of it
     foot     a part drawn after one that STANDS ON IT -- a plate, plinth or base under something's foot, wider than it toward the
              eye, painted second: its top and its near faces land over the foot (Sir, 2026-11-20, Palmline Garage: "the base of
              this upright is drawing over the vertical piece"). Paint the base first, the thing on it after
     behind   a part drawn after one it stands wholly behind (past its back face, within its width, no higher than its top) -- a
              fixture's far-side parts, its working face turned away (Seaglass's espresso machine: group heads over its back)
     order    a part drawn after a part that stands in front of it and overlaps it on screen (a shelf over the near legs) -- a
              heuristic: read each one
   node tools/review/w37.js [room name filter]      exits 1 on any clip, back or foot finding
     --png <dir>   each foot finding's piece drawn alone, 4x, and marked up (<dir>/foot_N_marked.png): the spot circled on the whole
                   piece, beside a close-up of it -- what stands there outlined blue, the base drawn after it red, and where the base
                   paints over its foot filled magenta */
const H = require('./harness.js');
let OFF = 0;   // (the lines the instrumentation adds above the rooms: what a served line number is less, in game/index.html)
const ADD0 = html => html
  .replace('\nfunction runPiece(items, a0, a1, b0, b1, zTop, solidsFor, draw, o){',
    '\nfunction runPiece(items, a0, a1, b0, b1, zTop, solidsFor, draw, o){ const __n = items.length;' +
    ' const __d = () => { window.__W37in = (window.__W37in || 0) + 1; try { draw(); } finally { window.__W37in--; } };' +
    ' const __ln = ((new Error().stack.split("\\n")[2] || "").match(/:(\\d+):\\d+\\)?$/) || [])[1]; runPiece__w37(items, a0, a1, b0, b1, zTop, solidsFor, __d, o); for(let k = __n; k < items.length; k++) items[k].__run = { zTop, a0, a1, b0, b1, along: o && o.alongB ? "b" : "a", line: __ln }; }' +
    '\nfunction runPiece__w37(items, a0, a1, b0, b1, zTop, solidsFor, draw, o){');
const ADD = html => { const out = ADD0(html), src = process.env.REV ? null : require('fs').readFileSync(require('path').join(H.ROOT, 'game/index.html'), 'utf8'); if(src) OFF = out.split('\n').length - src.split('\n').length; return out; };
(async () => {
  const want = process.argv.slice(2).find((a, i, A) => !a.startsWith('--') && A[i - 1] !== '--png') || '';
  const h = await H.open({ instr: ADD, rev: process.env.REV || null }); await h.boot();
  const pi = process.argv.indexOf('--png'), PNG = pi > 0 ? process.argv[pi + 1] : null;
  const out = await h.page.evaluate(([want, PNG]) => {
    const sc = game.scene.getScene('world'), g = sc.add.graphics(), G = (a, b, z) => ({ x: a - b, y: (a + b)/2 - z });
    let cur = null, stack = 0;
    window.__RVP3 = (a, b, z) => { if(cur && cur.prim) cur.prim.pts.push([a, b, z]); if(cur && window.__W37in) cur.runZ = Math.max(cur.runZ, z); };
    window.__RVK = (n, args, ph) => { if(!cur) return;
      if(ph === 0){ if(stack++ === 0) cur.prim = { n, args: Array.from(args).slice(0, 7), pts: [], inRun: !!window.__W37in, line: ((new Error().stack.split('\n')[3] || '').match(/:(\d+):\d+\)?$/) || [])[1] }; }
      else if(--stack === 0 && cur.prim){ cur.prims.push(cur.prim); cur.prim = null; } };
    const bb = pts => { const o = { a0: 1e9, a1: -1e9, b0: 1e9, b1: -1e9, z0: 1e9, z1: -1e9 }; for(const [a, b, z] of pts){ o.a0 = Math.min(o.a0, a); o.a1 = Math.max(o.a1, a); o.b0 = Math.min(o.b0, b); o.b1 = Math.max(o.b1, b); o.z0 = Math.min(o.z0, z); o.z1 = Math.max(o.z1, z); } return o; };
    const scr = q => ({ x0: q.a0 - q.b1, x1: q.a1 - q.b0, y0: (q.a0 + q.b0)/2 - q.z1, y1: (q.a1 + q.b1)/2 - q.z0 });
    const found = [], VOL = new Set(['box', 'cyl', 'tube', 'ball', 'prism', 'slab']);
    /* the area where one box's silhouette lies over another's, on screen at 1x (what L, drawn second, paints over E) */
    const hull2 = q => { const pts = []; for(const a of [q.a0, q.a1]) for(const b of [q.b0, q.b1]) for(const z of [q.z0, q.z1]) pts.push(G(a, b, z));
      pts.sort((p, r) => p.x - r.x || p.y - r.y); const cr = (o, a, b) => (a.x - o.x)*(b.y - o.y) - (a.y - o.y)*(b.x - o.x), lo = [], hi = [];
      for(const p of pts){ while(lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
      for(let i = pts.length - 1; i >= 0; i--){ const p = pts[i]; while(hi.length > 1 && cr(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
      lo.pop(); hi.pop(); return lo.concat(hi); };
    const paintOver = (qL, qE) => { const c = clipConvex(hull2(qL), hull2(qE)); if(!c || c.length < 3) return 0; let A = 0;
      for(let i = 0; i < c.length; i++){ const p = c[i], r = c[(i + 1) % c.length]; A += p.x*r.y - r.x*p.y; } return Math.abs(A)/2; };
    /* (--png: the piece alone, 4x, the two parts' outlines over it -- base red, what stands on it blue) */
    let nShot = 0;
    const shot = (name, it, P, qL, qE) => { const S = 4, pad = 24; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for(const p of P) for(const [a, b, z] of p.pts){ const x = (a - b)*S, y = ((a + b)/2 - z)*S; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      if(x1 - x0 > 1800){ const cx = ((qE.a0 + qE.a1)/2 - (qE.b0 + qE.b1)/2)*S; x0 = cx - 600; x1 = cx + 600; }
      if(y1 - y0 > 1400){ const cy = (((qE.a0 + qE.a1)/2 + (qE.b0 + qE.b1)/2)/2 - qE.z0)*S; y0 = cy - 500; y1 = cy + 400; }
      const G4 = (a, b, z) => ({ x: (a - b)*S - x0 + pad, y: ((a + b)/2 - z)*S - y0 + pad }), w = Math.ceil(x1 - x0 + 2*pad), hh = Math.ceil(y1 - y0 + 2*pad);
      const g4 = sc.add.graphics(); g4.fillStyle(0xffffff, 1); g4.fillRect(0, 0, w, hh);
      const save = window.__RVP3, saveK = window.__RVK; window.__RVP3 = () => {}; window.__RVK = () => {};
      try { LIB.drawItem(name, g4, G4, S, it); } catch(err){}
      window.__RVP3 = save; window.__RVK = saveK;
      const outline = (q, c) => { const C = [[q.a0, q.b0], [q.a1, q.b0], [q.a1, q.b1], [q.a0, q.b1]]; g4.lineStyle(2, c, 1);
        for(const z of [q.z0, q.z1]){ g4.beginPath(); C.forEach(([a, b], k) => { const p = G4(a, b, z); k ? g4.lineTo(p.x, p.y) : g4.moveTo(p.x, p.y); }); g4.closePath(); g4.strokePath(); }
        for(const [a, b] of C){ const p = G4(a, b, q.z0), r = G4(a, b, q.z1); g4.lineBetween(p.x, p.y, r.x, r.y); } };
      const hullOf = q => { const pts = []; for(const a of [q.a0, q.a1]) for(const b of [q.b0, q.b1]) for(const z of [q.z0, q.z1]) pts.push(G4(a, b, z));
        pts.sort((p, r) => p.x - r.x || p.y - r.y); const cr = (o, a, b) => (a.x - o.x)*(b.y - o.y) - (a.y - o.y)*(b.x - o.x), lo = [], hi = [];
        for(const p of pts){ while(lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
        for(let i = pts.length - 1; i >= 0; i--){ const p = pts[i]; while(hi.length > 1 && cr(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
        lo.pop(); hi.pop(); return lo.concat(hi); };
      const hE = hullOf(qE), hL = hullOf(qL), ov = clipConvex(hL.map(p => ({ x: p.x, y: p.y })), hE.map(p => ({ x: p.x, y: p.y }))) || [];
      const key = '__w37foot' + (nShot++); g4.generateTexture(key, w, hh); g4.destroy();
      const data = sc.textures.getBase64(key); sc.textures.remove(key);
      return { data, ov: ov.map(p => [Math.round(p.x), Math.round(p.y)]), hE: hE.map(p => [Math.round(p.x), Math.round(p.y)]), hL: hL.map(p => [Math.round(p.x), Math.round(p.y)]) }; };
    const rooms = [...new Set(POCKETS.map(p => p.name))].filter(n => LIB.get(n) && n.includes(want));   // (every room the library draws, the older pockets -- the ballroom -- as well as the walk-ins)
    for(const name of rooms){
      if(name === 'Sandpiper Bakery Interior' || 1){ const pk = POCKETS.find(p => p.name === name); if(pk && pk.view) pk.view(); }
      const items = LIB.collect(name, G, 1) || [];
      const runs = new Map();
      items.forEach((it, i) => {
        cur = { prims: [], prim: null, runZ: -1e9 }; stack = 0;
        try { LIB.drawItem(name, g, G, 1, it); } catch(e){ found.push({ room: name, kind: 'error', at: [Math.round(it.a), Math.round(it.b)], what: String(e).slice(0, 80) }); }
        const rec = cur; cur = null;
        const P = rec.prims.filter(p => p.pts.length >= 3).map(p => Object.assign(p, { q: bb(p.pts) }));
        /* clip: one per fixture (its runs share the draw) */
        if(it.__run){ const R = it.__run, key = [R.a0, R.a1, R.b0, R.b1, R.zTop].join(',');
          if(!runs.has(key) && rec.runZ > -1e9){ runs.set(key, 1);
            if(R.zTop > rec.runZ + 3) found.push({ room: name, kind: 'clip', at: [Math.round((R.a0 + R.a1)/2), Math.round((R.b0 + R.b1)/2)], what: 'runPiece zTop ' + R.zTop + ' above its top ' + Math.round(rec.runZ) + ' (line ' + R.line + ')' });
            else if(R.zTop < rec.runZ - 1) found.push({ room: name, kind: 'clip', at: [Math.round((R.a0 + R.a1)/2), Math.round((R.b0 + R.b1)/2)], what: 'runPiece zTop ' + R.zTop + ' cuts its own top ' + Math.round(rec.runZ) + ' (line ' + R.line + ')' }); } }
        /* back faces and order, within this piece (a run's draw once per fixture) */
        if(it.__run && runs.get('d' + [it.__run.a0, it.__run.b0, it.__run.zTop].join(','))) return;
        if(it.__run) runs.set('d' + [it.__run.a0, it.__run.b0, it.__run.zTop].join(','), 1);
        P.forEach((L, j) => {
          const q = L.q, before = P.slice(0, j);
          if(L.n === 'S' && q.a1 - q.a0 < 0.5){
            const aa = q.a0, inR = p => p[1] > q.b0 + 1 && p[1] < q.b1 - 1 && p[2] > q.z0 + 1 && p[2] < q.z1 - 1;
            const pts = before.flatMap(p => p.pts).filter(inR);
            if(pts.some(p => p[0] > aa + 2) && !pts.some(p => p[0] < aa - 2)) found.push({ room: name, kind: 'back', at: [Math.round(aa), Math.round((q.b0 + q.b1)/2)], what: 'S at a ' + aa.toFixed(1) + ' is the west end of what it drew first (line ' + L.line + ')' });
          }
          if(L.n === 'F' && q.b1 - q.b0 < 0.5){
            const bv = q.b0, inR = p => p[0] > q.a0 + 1 && p[0] < q.a1 - 1 && p[2] > q.z0 + 1 && p[2] < q.z1 - 1;
            const pts = before.flatMap(p => p.pts).filter(inR);
            if(pts.some(p => p[1] > bv + 2) && !pts.some(p => p[1] < bv - 2)) found.push({ room: name, kind: 'back', at: [Math.round((q.a0 + q.a1)/2), Math.round(bv)], what: 'F at b ' + bv.toFixed(1) + ' is the north side of what it drew first (line ' + L.line + ')' });
          }
          /* foot: L drawn after E, L under E's foot (from at or below E's bottom up to no higher than partway up it), their footprints
             overlapping, L reaching nearer the eye (further east or south) than E: L's top and near faces paint over E's foot */
          for(const E of before){ const e = E.q;
            if(!VOL.has(E.n) || !VOL.has(L.n)) continue;
            if(!(q.a0 < e.a1 - 0.5 && q.a1 > e.a0 + 0.5 && q.b0 < e.b1 - 0.5 && q.b1 > e.b0 + 0.5)) continue;
            /* (under it: its top at E's bottom -- castors, feet, a plinth; or a plate round its whole footprint, up no higher than partway:
               the lift post's. Not a band on E's face from the same height -- a kick strip sat in front of it is drawn after, rightly) */
            const under = q.z1 <= e.z0 + 0.5 && q.z1 >= e.z0 - 2;
            const plate = q.a0 <= e.a0 + 0.5 && q.a1 >= e.a1 - 0.5 && q.b0 <= e.b0 + 0.5 && q.b1 >= e.b1 - 0.5 && q.z0 <= e.z0 + 0.5 && q.z1 - q.z0 <= Math.min(12, (e.z1 - e.z0)*0.25);   // (thin: a plate, not a seat block round a statue's body)
            if(!under && !plate) continue;
            if(!(q.a1 > e.a1 + 0.5 || q.b1 > e.b1 + 0.5)) continue;
            const s1 = scr(q), s2 = scr(e), ox = Math.min(s1.x1, s2.x1) - Math.max(s1.x0, s2.x0), oy = Math.min(s1.y1, s2.y1) - Math.max(s1.y0, s2.y0);
            if(ox > 1 && oy > 1){ const f = { room: name, kind: 'foot', at: [Math.round((e.a0 + e.a1)/2), Math.round((e.b0 + e.b1)/2)], what: L.n + ' (z ' + Math.round(q.z0) + '..' + Math.round(q.z1) + ') drawn after the ' + E.n + ' standing on it (z ' + Math.round(e.z0) + '..' + Math.round(e.z1) + ') (line ' + L.line + ', it line ' + E.line + ')' };
              if(PNG) f.png = shot(name, it, P, q, e); found.push(f); break; }
          }
          /* behind: L drawn after E though it stands wholly BEHIND E -- past E's back face (north, or west), within E's width and no higher
             than its top: a fixture's far-side parts, its working face turned away from the eye (Seaglass Coffee's espresso machine: its
             group heads, cups and drip tray painted across its back -- Sir, 2026-11-20, "look at all this mess"). Paint them first */
          for(const E of before){ const e = E.q;
            if(!VOL.has(E.n) || !VOL.has(L.n) || L.n === 'prism' || E.n === 'prism') continue;   // (a prism's box is its extrusion's, not its shape)
            /* (BEHIND, wholly: past E's back face on one axis -- north of it, west of it, or under it -- and on none of the three
               in front of it (east, south or over it): then E is nearer wherever they meet on screen, whatever their sizes -- the
               engraver's spindle, hung west of its column and lower than it, Sir 2026-11-20) */
            const bN = q.b1 <= e.b0 + 3 && q.b0 < e.b0 - 0.5, bW = q.a1 <= e.a0 + 3 && q.a0 < e.a0 - 0.5, bU = q.z1 <= e.z0 + 0.5 && q.z0 < e.z0 - 0.5;
            const fr = q.a0 >= e.a1 - 0.5 || q.b0 >= e.b1 - 0.5 || q.z0 >= e.z1 - 0.5;
            if(!(bN || bW || bU) || fr) continue;
            const ar = paintOver(q, e);                                     // (how much of E it paints over, in square units at 1x)
            if(ar > 16){ const f = { room: name, kind: 'behind', at: [Math.round((q.a0 + q.a1)/2), Math.round((q.b0 + q.b1)/2)], what: L.n + ' (b ' + Math.round(q.b0) + '..' + Math.round(q.b1) + ', a ' + Math.round(q.a0) + '..' + Math.round(q.a1) + ', z ' + Math.round(q.z0) + '..' + Math.round(q.z1) + ') drawn after the ' + E.n + ' in front of it (its back at ' + (bN ? 'b ' + Math.round(e.b0) : 'a ' + Math.round(e.a0)) + ') (line ' + L.line + ', it line ' + E.line + ')' };
              if(PNG) f.png = shot(name, it, P, q, e); found.push(f); break; }
          }
          /* inside: L and E (two solid boxes of the piece) SHARE A VOLUME -- one run partly into the other, a corner of each inside the
             other, so whichever is painted second cuts a notch out of the first (Dune's sofa: its arms run back under its back, a step at
             its ends -- Sir, 2026-11-20, "whats causing that alignment issue?"). Not a joint where one passes clean through the other (a
             board through a post: it reaches past the post both ways along one line, the post past it both ways along another), nor
             one wholly inside the other, nor a hair's touch (each overlap over 1.5) */
          for(const E of before){ const e = E.q;
            if(L.n !== 'box' || E.n !== 'box') continue;
            const oa = Math.min(q.a1, e.a1) - Math.max(q.a0, e.a0), ob = Math.min(q.b1, e.b1) - Math.max(q.b0, e.b0), oz = Math.min(q.z1, e.z1) - Math.max(q.z0, e.z0);
            if(!(oa > 2.5 && ob > 2.5 && oz > 2.5)) continue;                                  // (a part set 2 into a face -- a dial, a knob -- is how it is fixed on)
            const inn = (x, y) => x.a0 >= y.a0 - 0.5 && x.a1 <= y.a1 + 0.5 && x.b0 >= y.b0 - 0.5 && x.b1 <= y.b1 + 0.5 && x.z0 >= y.z0 - 0.5 && x.z1 <= y.z1 + 0.5;
            if(inn(q, e) || inn(e, q)) continue;                                                // (one wholly in the other: a band, an inlay, what stands in a case)
            /* (what stands IN a container and out of its top -- a baguette in its basket: within its walls, on its floor or over it; the
               container's own front is drawn again over it) */
            if(q.a0 >= e.a0 - 0.5 && q.a1 <= e.a1 + 0.5 && q.b0 >= e.b0 - 0.5 && q.b1 <= e.b1 + 0.5 && q.z0 >= e.z0 && q.z1 > e.z1) continue;
            const span = (x0, x1, y0, y1) => x0 < y0 - 0.5 && x1 > y1 + 0.5;                    // (x reaches past y both ways)
            const thruL = [span(q.a0, q.a1, e.a0, e.a1), span(q.b0, q.b1, e.b0, e.b1), span(q.z0, q.z1, e.z0, e.z1)], thruE = [span(e.a0, e.a1, q.a0, q.a1), span(e.b0, e.b1, q.b0, q.b1), span(e.z0, e.z1, q.z0, q.z1)];
            if(thruL.some(Boolean) && thruE.some(Boolean)) continue;                                // (a joint: crossed)
            /* (what shows: L, painted second, has a SEEN face -- its top, its south side, its east end -- ending inside E, so that face is
               painted across E as a step; a corner joint whose faces run flush -- a window's post and head -- shows nothing) */
            const inside = (x1, y0, y1) => x1 > y0 + 0.5 && x1 < y1 - 0.5;
            if(!(inside(q.z1, e.z0, e.z1) || inside(q.b1, e.b0, e.b1) || inside(q.a1, e.a0, e.a1))) continue;
            const f = { room: name, kind: 'inside', at: [Math.round((Math.max(q.a0, e.a0) + Math.min(q.a1, e.a1))/2), Math.round((Math.max(q.b0, e.b0) + Math.min(q.b1, e.b1))/2)],
              what: L.n + ' (a ' + Math.round(q.a0) + '..' + Math.round(q.a1) + ', b ' + Math.round(q.b0) + '..' + Math.round(q.b1) + ', z ' + Math.round(q.z0) + '..' + Math.round(q.z1) + ') runs into the ' + E.n + ' (a ' + Math.round(e.a0) + '..' + Math.round(e.a1) + ', b ' + Math.round(e.b0) + '..' + Math.round(e.b1) + ', z ' + Math.round(e.z0) + '..' + Math.round(e.z1) + ') by ' + [oa, ob, oz].map(v => v.toFixed(0)).join(' x ') + ' (line ' + L.line + ', it line ' + E.line + ')' };
            if(PNG) f.png = shot(name, it, P, q, e); found.push(f); break;
          }
          /* order: L drawn after E, L behind E (it ends within 5 of E's near start on a or b and reaches well behind it), overlapping on screen */
          for(const E of before){ const e = E.q;
            if(!VOL.has(E.n) || !VOL.has(L.n)) continue;                            // (volumes only: a face on a face is paint)
            const behindB = q.b1 <= e.b0 + 5 && q.b0 < e.b0 - 2 && q.a1 > e.a0 && q.a0 < e.a1, behindA = q.a1 <= e.a0 + 5 && q.a0 < e.a0 - 2 && q.b1 > e.b0 && q.b0 < e.b1;
            if(!(behindB || behindA) || q.z1 <= e.z0 || q.z0 >= e.z1) continue;
            const s1 = scr(q), s2 = scr(e), ox = Math.min(s1.x1, s2.x1) - Math.max(s1.x0, s2.x0), oy = Math.min(s1.y1, s2.y1) - Math.max(s1.y0, s2.y0);
            if(ox > 2 && oy > 2){ found.push({ room: name, kind: 'order', at: [Math.round((q.a0 + q.a1)/2), Math.round((q.b0 + q.b1)/2)], what: L.n + ' drawn after the ' + E.n + ' in front of it at ' + [Math.round((e.a0 + e.a1)/2), Math.round((e.b0 + e.b1)/2)] }); break; }
          }
        });
      });
    }
    g.destroy();
    return { rooms: rooms.length, found };
  }, [want, PNG]);
  if(PNG){ const fs = require('fs'), path = require('path'); fs.mkdirSync(PNG, { recursive: true }); let k = 0;
    for(const f of out.found) if(f.png){ const fn = path.join(PNG, f.kind + '_' + (++k) + '.png'); fs.writeFileSync(fn, Buffer.from(f.png.data.split(',')[1], 'base64'));
      fs.writeFileSync(fn.replace(/\.png$/, '.json'), JSON.stringify({ room: f.room, at: f.at, what: f.what, ov: f.png.ov, hE: f.png.hE, hL: f.png.hL })); f.what += '  -> ' + fn; delete f.png; }
    /* (and each one marked up: tools/review/w37_mark.py -- the piece with the spot circled, beside a close-up, the base's paint over the foot filled) */
    try { require('child_process').execSync('python3 ' + JSON.stringify(path.join(__dirname, 'w37_mark.py')) + ' ' + JSON.stringify(PNG), { stdio: 'inherit' }); } catch(e){ console.log('(w37_mark.py: ' + e.message + ')'); } }
  const fix = t => t.replace(/\(line (\d+)\)/, (m, n) => '(line ' + (+n - OFF) + ')').replace(/\(line (\d+), it line (\d+)\)/, (m, n, k) => '(line ' + (+n - OFF) + ', it line ' + (+k - OFF) + ')');
  for(const f of out.found) f.what = fix(f.what);
  const by = {}; for(const f of out.found){ const k = f.room + ' | ' + f.kind + ' | ' + f.what.replace(/[-\d.]+/g, '#'); (by[k] = by[k] || []).push(f); }
  console.log(out.rooms + ' rooms checked');
  for(const kind of ['error', 'clip', 'back', 'foot', 'behind', 'inside', 'order']){
    const rows = out.found.filter(f => f.kind === kind); console.log('\n' + kind + ': ' + rows.length);
    if(kind === 'order' && !process.argv.includes('--order')){ console.log('  (advisory: list them with --order)'); continue; }
    for(const f of rows.slice(0, 400)) console.log('  ' + f.room + ' @' + f.at + '  ' + f.what);
  }
  if(h.errs.length) console.log('page errors', h.errs);
  await h.close();
  process.exit(out.found.some(f => f.kind === 'clip' || f.kind === 'back' || f.kind === 'foot' || f.kind === 'behind' || f.kind === 'error') ? 1 : 0);
})();
