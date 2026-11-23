/* ROOM PEOPLE -- the walk-in recipe's people checks (docs/kits/walkin-shop-recipe.md section 8), for any room (Sir, 2026-11-23,
   docs/queue.md section 1: "the recipe's people checks" for the older rooms). He stands in the room; the world is drawn N times, the
   room's people working between (the building cache off, so every piece really draws), and every queue item is watched: the world
   box of what it draws (scene.W), and inside it each person drawn (drawPersonHullBody: their own box, whether they are the room's).
   Reported:
     over      a piece painted AFTER a person that stands wholly BEHIND them (past them on x, y or under them, on no axis in front)
               and overlaps them on screen: it paints over them (heads under shelves, legs under a counter behind them). The cast
               drawn into a piece's own image (a seated guest, it.cast) is the piece's business (W37) and not judged here
     outsider  someone not of the room (not _roomPerson) drawn where the room is on screen while he is in it -- a passer-by, another
               room's staff on their way to work
   node tools/review/room_people.js "<room>" [--frames 40] [--gap 400] [--at a,b] [--png <dir>] [--rev <git ref>]
     --at   where he stands, in the room's own frame (default its middle); --png: a shot of each frame with a finding, marked
   Exit 1 on any finding. */
const H = require('./harness.js'), fs = require('fs'), path = require('path');
const args = process.argv.slice(2), arg = (k, d) => args.includes(k) ? args[args.indexOf(k) + 1] : d;
const ROOM = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
const FRAMES = +arg('--frames', 40), GAP = +arg('--gap', 400), AT = arg('--at', null), PNG = arg('--png', null);
(async () => {
  if(!ROOM){ console.log('usage: room_people.js "<room>"'); process.exit(2); }
  const h = await H.open({ rev: arg('--rev', null), instr: true }); await h.boot();
  const at = await h.page.evaluate(([room, AT]) => { const p = POCKETS.find(p => p.name === room); if(!p) return null;
    const [a, b] = AT ? AT.split(',').map(Number) : [p.w/2, p.d/2]; return { x: p.x0 + a, y: p.y0 + b }; }, [ROOM, AT]);
  if(!at){ console.log('no room ' + ROOM); await h.close(); process.exit(2); }
  await H.standAt(h.page, [at.x, at.y], Math.PI, 2);
  await h.page.waitForTimeout(2500);
  await h.page.evaluate(() => {
    const s = game.scene.getScene('world'), proto = Object.getPrototypeOf(s), W0 = proto.W, B0 = proto.drawPersonHullBody;
    const R = window.__RP = { cur: null, person: null };
    const grow = (b, x, y, z) => { if(x < b.x0) b.x0 = x; if(x > b.x1) b.x1 = x; if(y < b.y0) b.y0 = y; if(y > b.y1) b.y1 = y; if(z < b.z0) b.z0 = z; if(z > b.z1) b.z1 = z; };
    /* (each of the library's primitives its own box -- a counter's mat, its body, its top -- so a piece is judged part by part: the
       harness's instr wraps them, __RVK(name, args, 0 | 1) round each) */
    let depth = 0, prim = null;
    window.__RVK = (n, a, ph) => { const c = R.cur; if(!c || R.person) return;
      if(ph === 0){ if(depth++ === 0) prim = { x0: Infinity, y0: Infinity, z0: Infinity, x1: -Infinity, y1: -Infinity, z1: -Infinity, n }; }
      else if(--depth === 0 && prim){ if(isFinite(prim.x0)) c.parts.push(prim); prim = null; } };
    /* (the building cache's own bookkeeping -- the box it measures a piece by -- is not drawing: its W calls are left out, only what
       the piece's draw does inside it counts) */
    let skipW = 0; const BC0 = proto.bcDraw;
    proto.bcDraw = function(g, key, ax, ay, fn, ...more){ skipW++;
      try { return BC0.call(this, g, key, ax, ay, function(...a){ skipW--; try { return fn.apply(this, a); } finally { skipW++; } }, ...more); } finally { skipW--; } };
    /* (a library point -- P(), the next W call -- counts only inside a primitive: pathRun projects every corner of its path to sort
       its faces, also for the legs it does not draw; the game's own art, W called directly, makes the piece's box) */
    let fromP = false; window.__RVP3 = () => { fromP = true; };
    proto.W = function(x, y, z){ const c = R.cur, lp = fromP; fromP = false; if(c && !skipW && isFinite(x) && isFinite(y)){ z = z || 0; if(R.person) grow(R.person, x, y, z); else { if(!lp) grow(c.box, x, y, z); c.n++; if(prim) grow(prim, x, y, z);
        if(!c.site){ const st = new Error().stack.split('\n').slice(2, 9).map(l => (l.match(/index\.html:(\d+):/) || [])[1]).filter(Boolean); c.site = st.slice(0, 4).join('<'); } } } return W0.call(this, x, y, z); };
    proto.drawPersonHullBody = function(g, ax, ay, z, ...rest){
      const c = R.cur; if(!c || R.person) return B0.call(this, g, ax, ay, z, ...rest);
      const P = { x0: Infinity, y0: Infinity, z0: Infinity, x1: -Infinity, y1: -Infinity, z1: -Infinity, at: [Math.round(ax), Math.round(ay)], room: !!this._roomPerson, inPiece: c.parts.length > 0 };   // (in a piece: drawn after the piece's own library parts -- a seated guest in its image)
      R.person = P; try { return B0.call(this, g, ax, ay, z, ...rest); } finally { R.person = null; if(isFinite(P.x0)) c.people.push(P); } };
  });
  const found = [], seen = new Set(); let lastFrame = null;
  for(let f = 0; f < FRAMES; f++){
    await h.page.waitForTimeout(GAP);
    const r = await h.page.evaluate(() => {
      const s = game.scene.getScene('world'), R = window.__RP, recs = [];
      game.scene.pause('world');
      const t = (game.loop && game.loop.time) || 0, sort0 = Array.prototype.sort; let got = null;
      Array.prototype.sort = function(fcmp){ const res = sort0.call(this, fcmp);
        if(!got && this.length > 20 && this[0] && typeof this[0].fn === 'function' && 'depth' in this[0]){ got = this;
          this.forEach((it, k) => { const fn = it.fn; it.fn = function(){ const rec = { k, depth: it.depth, n: 0, people: [], parts: [],
              box: { x0: Infinity, y0: Infinity, z0: Infinity, x1: -Infinity, y1: -Infinity, z1: -Infinity } };
            R.cur = rec; try { return fn.apply(this, arguments); } finally { R.cur = null; recs.push(rec); } }; }); }
        return res; };
      const bca = s._bcActive; s._bcActive = false; let err = null;
      try { s._frameDt = 0; s.drawWorld(t); } catch(e){ err = String(e).slice(0, 200); }
      finally { Array.prototype.sort = sort0; s._bcActive = bca; game.scene.resume('world'); }
      const pv = typeof POCKET_VIEW !== 'undefined' && POCKET_VIEW ? { x0: POCKET_VIEW.pk.x0 + POCKET_VIEW.dx, y0: POCKET_VIEW.pk.y0 + POCKET_VIEW.dy, w: POCKET_VIEW.pk.w, d: POCKET_VIEW.pk.d, name: POCKET_VIEW.pk.name } : null;
      return { err, pv, recs: recs.map(r => ({ k: r.k, n: r.n, box: r.box, people: r.people, parts: r.parts, site: r.site })) };
    });
    if(r.err){ found.push({ kind: 'error', what: r.err }); continue; }
    /* screen at 1x, the game's fixed camera: x - y across, (x + y)/2 - z down */
    const hull = q => { const pts = []; for(const x of [q.x0, q.x1]) for(const y of [q.y0, q.y1]) for(const z of [q.z0, q.z1]) pts.push({ x: x - y, y: (x + y)/2 - z });
      pts.sort((p, r) => p.x - r.x || p.y - r.y); const cr = (o, a, b) => (a.x - o.x)*(b.y - o.y) - (a.y - o.y)*(b.x - o.x), lo = [], hi = [];
      for(const p of pts){ while(lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
      for(let i = pts.length - 1; i >= 0; i--){ const p = pts[i]; while(hi.length > 1 && cr(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
      lo.pop(); hi.pop(); return lo.concat(hi); };
    const clip = (subj, cl) => { let out = subj; const side = (a, b, p) => (b.x - a.x)*(p.y - a.y) - (b.y - a.y)*(p.x - a.x);
      const sg = (() => { let A = 0; for(let i = 0; i < cl.length; i++){ const p = cl[i], q = cl[(i + 1) % cl.length]; A += p.x*q.y - q.x*p.y; } return A > 0 ? 1 : -1; })();
      for(let i = 0; i < cl.length && out.length; i++){ const a = cl[i], b = cl[(i + 1) % cl.length], inp = out; out = [];
        for(let j = 0; j < inp.length; j++){ const p = inp[j], q = inp[(j + 1) % inp.length], sp = sg*side(a, b, p), sq = sg*side(a, b, q);
          if(sp >= 0) out.push(p); if((sp >= 0) !== (sq >= 0)){ const t = sp/(sp - sq); out.push({ x: p.x + t*(q.x - p.x), y: p.y + t*(q.y - p.y) }); } } }
      return out; };
    const area = c => { let A = 0; for(let i = 0; i < c.length; i++){ const p = c[i], q = c[(i + 1) % c.length]; A += p.x*q.y - q.x*p.y; } return Math.abs(A)/2; };
    const over = (q, e) => { const c = clip(hull(q), hull(e)); return c.length > 2 ? area(c) : 0; };
    const T = 1;
    const recs = r.recs.filter(x => isFinite(x.box.x0) || x.parts.length || x.people.length);
    for(let i = 0; i < recs.length; i++) for(const P of recs[i].people){
      if(P.inPiece) continue;
      /* outsider: not the room's, standing outside the room, drawn where the room is on screen */
      if(r.pv && !P.room){ const RB = { x0: r.pv.x0, x1: r.pv.x0 + r.pv.w, y0: r.pv.y0, y1: r.pv.y0 + r.pv.d, z0: 0, z1: 120 };
        const inside = P.at[0] > RB.x0 && P.at[0] < RB.x1 && P.at[1] > RB.y0 && P.at[1] < RB.y1;
        const ar = over(P, RB);
        if(ar > 40){ const k = 'out|' + P.at; if(!seen.has(k)){ seen.add(k); found.push({ kind: 'outsider', what: (inside ? 'someone not of the room standing IN it' : 'a passer-by outside') + ' at ' + P.at + ' drawn over the room (' + Math.round(ar) + ' sq)', frame: f }); } } }
      /* over: a later piece wholly behind them */
      for(let j = i + 1; j < recs.length; j++){ const L = recs[j];
        /* (its parts, each alone; a piece drawn with no library primitives -- the game's own art -- as one box) */
        for(const q of (L.parts.length ? L.parts : [L.box]).concat(L.people)){ if(!isFinite(q.x0)) continue;
          /* (under them: below their feet -- or lying flat at them, a mat or a rug up to 6 high under their soles) */
          const bk = q.x1 <= P.x0 + T || q.y1 <= P.y0 + T || q.z1 <= P.z0 + T || (q.z1 <= P.z0 + 6 && q.z1 - q.z0 <= 6), fr = q.x0 >= P.x1 - T || q.y0 >= P.y1 - T || q.z0 >= P.z1 - T;
          if(!bk || fr) continue;
          const ar = over(q, P); if(ar < 30) continue;
          const k = 'over|' + P.at + '|' + [q.x0, q.y0, q.z1].map(Math.round); if(seen.has(k)) continue; seen.add(k);
          const c = v => Math.round(v);
          found.push({ kind: 'over', frame: f, what: (L.people.includes(q) ? 'a person' : q.n ? 'a ' + q.n : 'a piece') + ' (x ' + c(q.x0) + '..' + c(q.x1) + ', y ' + c(q.y0) + '..' + c(q.y1) + ', z ' + c(q.z0) + '..' + c(q.z1) + ') [line ' + (L.site || '?') + '] behind ' + (P.room ? 'the room\'s person' : 'someone') + ' at ' + P.at + ' (z ' + c(P.z0) + '..' + c(P.z1) + ') painted after them, ' + Math.round(ar) + ' sq'
            + (r.pv ? '  [room frame: ' + (P.at[0] - r.pv.x0) + ',' + (P.at[1] - r.pv.y0) + ']' : '') });
          if(PNG) await h.page.screenshot({ path: path.join(PNG, 'over_' + found.length + '.png') }).catch(() => {});
        } } }
    lastFrame = r; lastFrame.np = recs.reduce((n, x) => n + x.people.length, 0); lastFrame.nr = recs.length;
  }
  const pv = lastFrame && lastFrame.pv;
  console.log(ROOM + ': ' + FRAMES + ' frames' + (pv ? ' (in ' + pv.name + ')' : ' (no POCKET_VIEW: a room drawn in its place)') + (lastFrame ? ', last frame ' + lastFrame.nr + ' pieces, ' + lastFrame.np + ' people' : ''));
  for(const k of ['error', 'outsider', 'over']){ const L = found.filter(f => f.kind === k); console.log('\n' + k + ': ' + L.length); for(const f of L.slice(0, 60)) console.log('  ' + f.what); }
  if(h.errs.length) console.log('page errors', h.errs.slice(0, 3));
  await h.close(); process.exit(found.length ? 1 : 0);
})();
