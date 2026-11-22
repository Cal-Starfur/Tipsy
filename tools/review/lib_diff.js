/* LIBRARY DIFF -- every entry the library draws (shops, houses, landmarks, rooms), drawn alone old build vs new, the pixels compared:
   what a draw-order fix changed, and that it changed only that. For checking a sweep of W37 fixes (Sir, 2026-11-22: "fix it globally").
   node tools/review/lib_diff.js [name filter] [--rev HEAD] [--out dir]
     writes <out>/<entry>.png for each entry that differs: old | new | the changed pixels (magenta), and prints the list with how many
     pixels changed; exits 0 */
const H = require('./harness.js'), fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const args = process.argv.slice(2), arg = (k, d) => args.includes(k) ? args[args.indexOf(k) + 1] : d;
const want = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--'))) || '';
const REV = arg('--rev', 'HEAD'), OUT = path.resolve(arg('--out', 'lib_diff'));
async function shoot(rev, dir){
  const h = await H.open({ rev, instr: true }); await h.boot();
  const names = await h.page.evaluate(want => [...new Set(window.__RVK_shops().map(s => s.name))].filter(n => LIB.get(n) && n.includes(want)), want);
  fs.mkdirSync(dir, { recursive: true });
  for(let i = 0; i < names.length; i += 8){
    const got = await h.page.evaluate(names => { const sc = game.scene.getScene('world'), res = [];
      for(const name of names){ try {
        const pk = POCKETS.find(p => p.name === name); if(pk && pk.view) pk.view();
        const G0 = (a, b, z) => ({ x: a - b, y: (a + b)/2 - z });
        let items = []; try { items = LIB.collect(name, G0, 1) || []; } catch(e){}
        const drawAll = (g, G, S) => { LIB.ground(name, g, G, S); if(items.length) for(const it of items){ try { LIB.drawItem(name, g, G, S, it); } catch(e){} } else LIB.draw(name, g, G, undefined, S); };
        /* its extent, from every point it draws */
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; window.__RVP3 = (a, b, z) => { const x = a - b, y = (a + b)/2 - z; if(x < x0) x0 = x; if(x > x1) x1 = x; if(y < y0) y0 = y; if(y > y1) y1 = y; };
        const g0 = sc.add.graphics(); try { drawAll(g0, G0, 1); } catch(e){} g0.destroy(); window.__RVP3 = null;
        if(x1 < x0){ res.push({ name, err: 'nothing drawn' }); continue; }
        const S = Math.min(1.5, 3800/Math.max(x1 - x0, y1 - y0)), pad = 10, w = Math.ceil((x1 - x0)*S + 2*pad), hh = Math.ceil((y1 - y0)*S + 2*pad);
        const G = (a, b, z) => ({ x: (a - b - x0)*S + pad, y: ((a + b)/2 - z - y0)*S + pad });
        const g = sc.add.graphics(); g.fillStyle(0xffffff, 1); g.fillRect(0, 0, w, hh);
        drawAll(g, G, S);
        const key = '__libdiff'; g.generateTexture(key, w, hh); g.destroy();
        res.push({ name, data: sc.textures.getBase64(key) }); sc.textures.remove(key);
      } catch(e){ res.push({ name, err: String(e).slice(0, 100) }); } }
      return res; }, names.slice(i, i + 8));
    for(const r of got){ const fn = path.join(dir, r.name.replace(/[^\w]+/g, '_') + '.png');
      if(r.data) fs.writeFileSync(fn, Buffer.from(r.data.split(',')[1], 'base64')); else console.log('  (' + r.name + ': ' + r.err + ')'); }
  }
  const errs = h.errs.slice(); await h.close(); return { names, errs };
}
(async () => {
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'libdiff'));
  const a = await shoot(REV, path.join(tmp, 'old')), b = await shoot(null, path.join(tmp, 'new'));
  fs.mkdirSync(OUT, { recursive: true });
  execSync('python3 ' + JSON.stringify(path.join(__dirname, 'lib_diff.py')) + ' ' + JSON.stringify(path.join(tmp, 'old')) + ' ' + JSON.stringify(path.join(tmp, 'new')) + ' ' + JSON.stringify(OUT), { stdio: 'inherit' });
  for(const [t, L] of [['old', a], ['new', b]]) if(L.errs.length) console.log(t, 'page errors', L.errs);
})();
