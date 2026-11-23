/* STALE SEGMENT -- drawing UNDER a cached image (Sir, 2026-11-23, the stop lights: "lets hunt for that bug everywhere i think it does
   happen in other places"). The building cache (bcDraw) lays a piece's image into the world and opens a NEW graphics segment on top of
   it (bcNextSeg; this.g follows). Anything the same queue item draws after that into the graphics it was handed -- its gg, the frame's
   g, layerFor(...) -- lands in the segment UNDER the image: the image paints over it (the stop light's head under its own arm).
   The game plays as usual (the cache on); each world-queue item is watched: every image laid in it is noted with the segment it left
   and how many commands that segment held then; when the item ends, a segment that has grown since was drawn into under the image.
   Reported per site -- the line of the bcDraw call that laid the image, and the item's own line -- with how often and where.
   node tools/review/stale_seg.js [--step 2000] [--wait 500] [--rooms] [--area x0,y0,x1,y1] [--rev <git ref>]
     --rooms   also stand in every room (POCKETS) a while
   Exit 1 on any finding. */
const H = require('./harness.js');
const args = process.argv.slice(2), arg = (k, d) => args.includes(k) ? args[args.indexOf(k) + 1] : d;
const STEP = +arg('--step', 2000), WAIT = +arg('--wait', 500), AREA = (arg('--area', '-22000,-22000,32000,12000')).split(',').map(Number);
(async () => {
  const h = await H.open({ rev: arg('--rev', null) }); await h.boot();
  await h.page.evaluate(() => {
    const s = game.scene.getScene('world'), proto = Object.getPrototypeOf(s), R = window.__SS = { found: new Map(), item: null, frames: 0 };
    const len = gr => (gr && gr.commandBuffer) ? gr.commandBuffer.length : 0;
    const line = (st, skip) => { const L = st.split('\n').slice(skip).map(l => (l.match(/index\.html:(\d+):/) || [])[1]).filter(Boolean); return L; };
    const N0 = proto.bcNextSeg;
    proto.bcNextSeg = function(...a){ const it = R.item;
      if(it){ const seg = this._segG; it.placed.push({ seg, n: len(seg), site: line(new Error().stack, 2).slice(0, 3).join('<') }); }
      return N0.apply(this, a); };
    const sort0 = Array.prototype.sort;
    Array.prototype.sort = function(f){ const res = sort0.call(this, f);
      if(s._inWorldFlush === false && this.length > 20 && this[0] && typeof this[0].fn === 'function' && 'depth' in this[0] && !this.__ss){
        this.__ss = true; R.frames++;
        for(const it of this){ const fn = it.fn; if(fn.__ss) continue;
          const w = function(...a){ const prev = R.item, rec = R.item = { placed: [], seg0: s._segG, n0: len(s._segG) };
            try { return fn.apply(this, a); }
            finally { R.item = prev;
              for(const p of rec.placed){ const grown = len(p.seg) - p.n;
                if(grown > 0){ const fl = (fn.toString().match(/\n/g) || []).length, k = p.site;
                  let e = R.found.get(k); if(!e) R.found.set(k, e = { site: p.site, n: 0, cmds: 0, at: null, src: fn.toString().slice(0, 160) });
                  e.n++; e.cmds = Math.max(e.cmds, grown); if(!e.at) e.at = [Math.round(s.botX), Math.round(s.botY)]; } } } };
          w.__ss = true; it.fn = w; } }
      return res; };
  });
  const stops = [];
  for(let y = AREA[1]; y <= AREA[3]; y += STEP) for(let x = AREA[0]; x <= AREA[2]; x += STEP) stops.push([x, y]);
  await h.page.evaluate(() => zoomSet(2));
  for(let i = 0; i < stops.length; i++){
    await h.page.evaluate(([x, y]) => { try { owStandUpAt(game.scene.getScene('world'), x, y, Math.PI); } catch(e){} }, stops[i]);
    await h.page.waitForTimeout(WAIT);
    if(i % 50 === 0) console.log('stop ' + i + '/' + stops.length);
  }
  if(args.includes('--rooms')){
    const rooms = await h.page.evaluate(() => POCKETS.map(p => ({ name: p.name, x: p.x0 + p.w/2, y: p.y0 + p.d/2 })));
    for(const r of rooms){ await h.page.evaluate(([x, y]) => { try { owStandUpAt(game.scene.getScene('world'), x, y, Math.PI); } catch(e){} }, [r.x, r.y]); await h.page.waitForTimeout(WAIT*3); }
    console.log(rooms.length + ' rooms');
  }
  const out = await h.page.evaluate(() => ({ frames: window.__SS.frames, found: [...window.__SS.found.values()].sort((a, b) => b.n - a.n) }));
  console.log('\n' + out.frames + ' frames watched; ' + out.found.length + ' sites draw under a cached image they just laid:');
  for(const f of out.found) console.log('  bcDraw at ' + f.site + '  x' + f.n + ', up to ' + f.cmds + ' commands under it, first near ' + f.at + '\n     item: ' + f.src.replace(/\s+/g, ' '));
  if(h.errs.length) console.log('page errors', h.errs.slice(0, 3));
  await h.close(); process.exit(out.found.length ? 1 : 0);
})();
