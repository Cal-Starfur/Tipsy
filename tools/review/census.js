/* THE WORLD CENSUS: every piece the world queue draws, everywhere on the map.
   The camera stands on a grid over the area; at each stop the world is drawn once with the
   building cache off (so every piece really draws) while each queue item is watched:
     - its sort depth, the line that made it (its draw function's own line in game/index.html),
     - the bcDraw key and anchor it went through, if any,
     - every world point it projected (scene.W), so its footprint x0..x1, y0..y1, z0..z1.
   Items are merged by key (bcDraw) or by site + rounded footprint (live pieces).
   Usage (from tools/world_review.js or alone):
     node tools/review/census.js [--area x0,y0,x1,y1] [--step 2600] [--out dir]
   The game itself is never changed. */
const H = require('./harness.js'), fs = require('fs'), path = require('path');

async function sweep(page, { area = [-4200, -4200, 32400, 32400], step = 2600, zoom = 3, debug = false, log = () => {} } = {}){
  const stops = [];
  for(let y = area[1]; y <= area[3]; y += step) for(let x = area[0]; x <= area[2]; x += step) stops.push([x, y]);
  await page.evaluate(() => {
    const s = game.scene.getScene('world');
    const C = window.__CEN = { items: new Map(), cur: null, stop: 0 };
    /* on the class, not the scene: lmFootprint sets and deletes its own s.W */
    const proto = Object.getPrototypeOf(s), W0 = proto.W;
    proto.W = function(x, y, z){
      const c = C.cur;
      if(c && isFinite(x) && isFinite(y)){
        z = z || 0;
        if(x < c.x0) c.x0 = x; if(x > c.x1) c.x1 = x;
        if(y < c.y0) c.y0 = y; if(y > c.y1) c.y1 = y;
        if(z < c.z0) c.z0 = z; if(z > c.z1) c.z1 = z;
        c.n++;
        if(!c.site){
          const st = new Error().stack.split('\n'), k = st.findIndex(l => l.includes('__censusItem'));
          const fr = k > 0 ? st.slice(2, k) : st.slice(2, 6);
          const ln = l => { const m = l.match(/index\.html:(\d+):\d+/); return m ? +m[1] : 0; };
          c.site = fr.length ? ln(fr[fr.length - 1]) : 0;
          c.chain = fr.slice(-6).map(l => { const m = l.match(/at (?:new )?([\w.$<>]+) /); return (m ? m[1] : '?') + ':' + ln(l); }).reverse();
        }
      }
      return W0.call(this, x, y, z);
    };
    const bc0 = s.bcDraw;
    s.bcDraw = function(g, key, ax, ay, fn){
      const c = C.cur;
      if(c){ (c.bc || (c.bc = [])).push({ key: String(key), ax, ay }); }
      return bc0.call(this, g, key, ax, ay, fn);
    };
  });
  for(let i = 0; i < stops.length; i++){
    const [x, y] = stops[i];
    const st = await page.evaluate(async ([x, y, i, zoom]) => {
      const s = game.scene.getScene('world'), C = window.__CEN, n0 = C.items.size;
      try { owStandUpAt(s, x, y, Math.PI); } catch(e){ s.botX = x; s.botY = y; }
      if(typeof zoomSet === 'function') zoomSet(zoom);
      await new Promise(r => setTimeout(r, 120));
      game.scene.pause('world');
      const t = (game.loop && game.loop.time) || 0;
      const sort0 = Array.prototype.sort; let got = null;
      Array.prototype.sort = function(f){
        const res = sort0.call(this, f);
        if(!got && this.length > 20 && this[0] && typeof this[0].fn === 'function' && 'depth' in this[0]){
          got = this;
          for(const it of this){
            const fn = it.fn;
            it.fn = function __censusItem(){
              const rec = { depth: it.depth, x0: Infinity, y0: Infinity, z0: Infinity, x1: -Infinity, y1: -Infinity, z1: -Infinity, n: 0, site: 0, chain: null, bc: null };
              C.cur = rec;
              try { return fn.apply(this, arguments); }
              finally {
                C.cur = null;
                if(rec.n){
                  const r = v => Math.round(v);
                  const id = rec.bc ? 'bc|' + rec.bc.map(b => b.key).join('+') : 'live|' + rec.site + '|' + r(rec.x0/50) + ',' + r(rec.y0/50);
                  let e = C.items.get(id);
                  if(!e) C.items.set(id, e = { id, site: rec.site, chain: rec.chain, bc: rec.bc, depth: rec.depth, depths: [], x0: rec.x0, y0: rec.y0, z0: rec.z0, x1: rec.x1, y1: rec.y1, z1: rec.z1, n: rec.n, seen: 0, stops: [] });
                  e.seen++; if(e.depths.length < 6 && !e.depths.some(d => Math.abs(d - rec.depth) < 0.5)) e.depths.push(+rec.depth.toFixed(1));
                  { const dk = rec.depth.toFixed(1); e.dh = e.dh || {}; e.dh[dk] = (e.dh[dk] || 0) + 1; }
                  if(e.stops[e.stops.length - 1] !== i) e.stops.push(i);
                  e.x0 = Math.min(e.x0, rec.x0); e.y0 = Math.min(e.y0, rec.y0); e.z0 = Math.min(e.z0, rec.z0);
                  e.x1 = Math.max(e.x1, rec.x1); e.y1 = Math.max(e.y1, rec.y1); e.z1 = Math.max(e.z1, rec.z1);
                  e.n = Math.max(e.n, rec.n);
                }
              }
            };
          }
        }
        return res;
      };
      const bca = s._bcActive; s._bcActive = false;
      try { s._frameDt = 0; s.drawWorld(t); }
      catch(e){ C.err = String(e && e.stack || e).slice(0, 600); }
      finally { Array.prototype.sort = sort0; s._bcActive = bca; game.scene.resume('world'); }
      const err = C.err; C.err = null;
      return { err, q: got ? got.length : 0, add: C.items.size - n0, K: s.K, bot: [Math.round(s.botX), Math.round(s.botY)] };
    }, [x, y, i, zoom]);
    if(debug) log(`stop ${i} ${x},${y} ${JSON.stringify(st)}`);
    if(i % 20 === 0) log(`census ${i + 1}/${stops.length}`);
  }
  const items = await page.evaluate(() => [...window.__CEN.items.values()]);
  return { stops, items };
}

module.exports = { sweep };

if(require.main === module){
  const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
  const out = arg('--out', path.join(H.ROOT, '.review', 'census'));
  const area = arg('--area', null), step = +arg('--step', 2600);
  (async () => {
    fs.mkdirSync(out, { recursive: true });
    const G = await H.open(); await G.boot();
    const t0 = Date.now();
    const r = await sweep(G.page, { debug: process.argv.includes('--debug'), area: area ? area.split(',').map(Number) : undefined, step, log: m => console.log(m) });
    fs.writeFileSync(path.join(out, 'census.json'), JSON.stringify(r));
    console.log('items', r.items.length, 'stops', r.stops.length, 'secs', ((Date.now() - t0)/1000).toFixed(0), 'page errors', G.errs.length);
    for(const e of G.errs.slice(0, 5)) console.log('  ', e);
    await G.close();
  })();
}
