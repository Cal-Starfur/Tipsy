/* DEPTH U1, PROVED IN PIXELS: for each world-queue finding (u1.js), draw the frame as the game
   sorts it, then again with the offending piece sorted where its rule says (U1k: at its own
   footprint's centre; U1o: just before the piece it stands behind), and diff. A finding whose
   correction changes nothing on screen is not visible from there (kept as a note); one that does
   gets a before/after photo, cropped to what changed.
   Usage: node tools/review/u1photo.js <u1.json> <outdir> [max] */
const H = require('./harness.js'), fs = require('fs'), path = require('path');

/* one representative per object (pair), the worst first */
function pick(findings, max){
  const seen = new Map();
  for(const f of findings){
    const k = f.rule + '|' + f.obj;
    if(f.rule === 'U1l') continue;                      // oversized pieces are proved through U1k/U1o or by eye
    const o = seen.get(k);
    if(!o) seen.set(k, Object.assign({ count: 1, alts: [] }, f)); else { o.count++; if(o.alts.length < 3) o.alts.push(f); }
  }
  return [...seen.values()].sort((a, b) => b.count - a.count).slice(0, max);
}

async function prove(page, f, zoom){
  /* U1o: the back one moved before the front one (the rule's order). U1c: no order is right, so the two are
     swapped -- what changes is what they fight over */
  const fix = f.rule === 'U1k' ? { key: f.key, to: 'centre', at: f.at } : f.rule === 'U1c' ? { key: f.back.key, after: f.front.key } : { key: f.back.key, before: f.front.key };
  /* outlines to draw: the piece that moves (blue) and, for a pair, the one it stands behind (red) */
  const boxes = f.rule !== 'U1k' ? [[...f.back.fp, f.at.z1, '#3fa9ff'], [...f.front.fp, f.at.z1, '#ff4a4a']] : [[f.at.x0, f.at.y0, f.at.x1, f.at.y1, f.at.z1, '#3fa9ff']];
  const cx = (f.at.x0 + f.at.x1)/2, cy = (f.at.y0 + f.at.y1)/2;
  /* stand where both show: the overlap's middle for a pair, the piece's middle otherwise */
  let sx = cx, sy = cy;
  if(f.rule === 'U1c'){ sx = cx; sy = cy; }
  else if(f.rule === 'U1o'){
    const b = f.back.fp, q = f.front.fp;
    sx = (Math.max(b[0], q[0]) + Math.min(b[2], q[2]))/2 || cx; sy = (Math.max(b[1], q[1]) + Math.min(b[3], q[3]))/2 || cy;
    if(!isFinite(sx) || Math.max(b[0], q[0]) > Math.min(b[2], q[2])) sx = (b[2] + q[0])/2;
    if(!isFinite(sy) || Math.max(b[1], q[1]) > Math.min(b[3], q[3])) sy = (b[3] + q[1])/2;
  }
  return page.evaluate(async ([sx, sy, fix, zoom, boxes]) => {
    const s = game.scene.getScene('world');
    owStandUpAt(s, sx, sy, Math.PI);
    if(typeof zoomSet === 'function') zoomSet(zoom);
    await new Promise(r => setTimeout(r, 2500));                  // let the caches paint
    const raf = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const snap = () => new Promise(res => game.renderer.snapshot(img => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0); res({ c, d: g.getImageData(0, 0, c.width, c.height).data }); }));
    game.scene.pause('world');
    const t = (game.loop && game.loop.time) || 0;
    const robot0 = s.drawRobotOrSunk; s.drawRobotOrSunk = () => {};
    const sort0 = Array.prototype.sort, bc0 = s.bcDraw;
    let mode = 'base', found = { a: false, b: false };
    let cur = null;
    s.bcDraw = function(g, key){ if(cur) cur.key = cur.key || String(key); return bc0.apply(this, arguments); };
    Array.prototype.sort = function(fn){
      const res = sort0.call(this, fn);
      if(this.length > 20 && this[0] && typeof this[0].fn === 'function' && 'depth' in this[0] && !this.__u1){
        this.__u1 = true;
        const arr = this;
        /* the keys: the frame before told us which item draws which key (same order while paused) */
        if(window.__U1keys && window.__U1keys.length === arr.length) arr.forEach((it, i) => it.__key = window.__U1keys[i]);
        if(mode === 'fix' && window.__U1keys){
          const A = arr.find(it => it.__key === fix.key), B = (fix.before || fix.after) ? arr.find(it => it.__key === (fix.before || fix.after)) : null;
          found = { a: !!A, b: !!B };
          if(A){
            if(fix.to === 'centre') A.depth = (fix.at.x0 + fix.at.y0 + fix.at.x1 + fix.at.y1)/2;
            else if(B && fix.after) A.depth = B.depth + 0.01;
            else if(B) A.depth = B.depth - 0.01;
            sort0.call(arr, fn);
          }
        }
        const keys = [];
        for(const it of arr){
          const f0 = it.fn, rec = { key: it.__key || null };
          keys.push(rec);
          it.fn = function(){ const p = cur; cur = rec; try { return f0.apply(this, arguments); } finally { cur = p; } };
        }
        window.__U1rec = keys;
      }
      return res;
    };
    const draw = async () => { s._frameDt = 0; s.drawWorld(t); await raf(); return snap(); };
    let out;
    try {
      window.__U1keys = null;
      await draw();                                              // a frame to learn the keys
      for(let k = 0; k < 3; k++){ window.__U1keys = window.__U1rec.map(r => r.key); await draw(); }
      window.__U1keys = window.__U1rec.map(r => r.key);
      const A = await draw();
      const noise = new Uint8Array(A.d.length/4);
      for(let k = 0; k < 2; k++){ const D = await draw(); for(let q = 0; q < D.d.length; q += 4) if(Math.abs(D.d[q] - A.d[q]) + Math.abs(D.d[q+1] - A.d[q+1]) + Math.abs(D.d[q+2] - A.d[q+2]) > 30) noise[q/4] = 1; }
      mode = 'fix';
      const B = await draw();
      mode = 'base';
      const W = A.c.width, Hh = A.c.height;
      let n = 0, x0 = W, y0 = Hh, x1 = -1, y1 = -1;
      for(let q = 0, i = 0; q < A.d.length; q += 4, i++){
        if(noise[i]) continue;
        if(Math.abs(B.d[q] - A.d[q]) + Math.abs(B.d[q+1] - A.d[q+1]) + Math.abs(B.d[q+2] - A.d[q+2]) > 40){
          n++; const x = i % W, y = (i/W) | 0; if(x < x0) x0 = x; if(x > x1) x1 = x; if(y < y0) y0 = y; if(y > y1) y1 = y;
        }
      }
      let img = null;
      if(n > 60){
        const pad = 40; x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(W - 1, x1 + pad); y1 = Math.min(Hh - 1, y1 + pad);
        const w = x1 - x0 + 1, h = y1 - y0 + 1, sc = Math.min(1, 560/w, 420/h);
        const c = document.createElement('canvas'); c.width = Math.round(w*sc)*2 + 12; c.height = Math.round(h*sc) + 22;
        const g = c.getContext('2d'); g.fillStyle = '#111'; g.fillRect(0, 0, c.width, c.height);
        g.drawImage(A.c, x0, y0, w, h, 0, 22, Math.round(w*sc), Math.round(h*sc));
        g.drawImage(B.c, x0, y0, w, h, Math.round(w*sc) + 12, 22, Math.round(w*sc), Math.round(h*sc));
        /* the footprints, as boxes on the left (the game's own projection, this camera) */
        const S = (x, y, z) => { const q = s.W(x, y, z); return [(q.x - x0)*sc, (q.y - y0)*sc + 22]; };
        for(const [bx0, by0, bx1, by1, bz, col] of boxes){
          g.strokeStyle = col; g.lineWidth = 1.5;
          const ring = z => { g.beginPath(); [[bx0, by0], [bx1, by0], [bx1, by1], [bx0, by1]].forEach(([x, y], k) => { const [u, v] = S(x, y, z); k ? g.lineTo(u, v) : g.moveTo(u, v); }); g.closePath(); g.stroke(); };
          ring(0); g.setLineDash([4, 3]); ring(bz); g.setLineDash([]);
          for(const [x, y] of [[bx0, by1], [bx1, by1], [bx1, by0]]){ const [u0, v0] = S(x, y, 0), [u1, v1] = S(x, y, bz); g.beginPath(); g.moveTo(u0, v0); g.lineTo(u1, v1); g.stroke(); }
        }
        g.fillStyle = '#fff'; g.font = '13px sans-serif'; g.fillText('now', 6, 15); g.fillText(fix.after ? 'the two swapped' : 'sorted by the rule', Math.round(w*sc) + 18, 15);
        img = c.toDataURL('image/png');
      }
      out = { n, found, img, box: [x0, y0, x1, y1] };
    } finally {
      Array.prototype.sort = sort0; s.bcDraw = bc0; s.drawRobotOrSunk = robot0; window.__U1keys = null;
      game.scene.resume('world');
    }
    return out;
  }, [sx, sy, fix, zoom, boxes]);
}

module.exports = { prove, pick };

if(require.main === module){
  const [,, inp, outDir, max] = process.argv;
  (async () => {
    fs.mkdirSync(outDir, { recursive: true });
    const U = JSON.parse(fs.readFileSync(inp, 'utf8'));
    const list = pick(U.findings, +(max || 40));
    let G = await H.open(); await G.boot();
    const res = [];
    for(let i = 0; i < list.length; i++){
      const f = list[i];
      let r = null, used = f;
      outer: for(const c of [f].concat(f.alts || [])) for(const zoom of [2, 3]){
        try { r = await prove(G.page, c, zoom); used = c; }
        catch(e){ r = { err: String(e).slice(0, 200) }; await G.close().catch(() => {}); G = await H.open(); await G.boot(); }
        if(r && r.n > 60) break outer;
      }
      const file = r && r.img ? `u1_${String(i).padStart(2, '0')}.png` : null;
      if(file) fs.writeFileSync(path.join(outDir, file), Buffer.from(r.img.split(',')[1], 'base64'));
      res.push(Object.assign({}, f, { shown: used.key, alts: undefined, px: r && r.n, found: r && r.found, err: r && r.err, photo: file }));
      console.log(`${i + 1}/${list.length} ${f.rule} ${f.obj} x${f.count}: ${r && r.err ? 'ERR ' + r.err : (r.n > 60 ? 'VISIBLE ' + r.n + 'px' : 'not visible (' + (r && r.n) + 'px)') + ' found ' + JSON.stringify(r.found)}`);
    }
    fs.writeFileSync(path.join(outDir, 'u1_proved.json'), JSON.stringify(res, null, 1));
    await G.close();
  })();
}
