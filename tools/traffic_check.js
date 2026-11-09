#!/usr/bin/env node
/* SEEDED TRAFFIC CHECK (docs/seeded-crowd.md, sc6): two boots, the same seed and pinned clock; each stands at a busy spot for a while (cars
   queue, yield and pick up hold), then goes far away. Once the hold is let go, every loop car that is far from where he now stands must be at
   the same place at the same world time in both boots. Usage: node tools/traffic_check.js */
const path = require('path'), fs = require('fs'), http = require('http');
const { execSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..'), EPOCH = Date.parse('2026-09-30T15:00:00Z');
function loadPlaywright(){ try { return require('playwright'); } catch(e){ return require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); } }
(async () => {
  const { chromium } = loadPlaywright();
  const types = { '.html':'text/html', '.js':'application/javascript', '.json':'application/json', '.png':'image/png', '.css':'text/css' };
  const srv = http.createServer((req, res) => { const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if(!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${srv.address().port}/game/index.html`;
  const exe = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  const runs = [];
  for(const delay of [0, 6000]){
    const p = await browser.newPage({ viewport: { width: 1180, height: 820 } });
    const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 300)));
    await p.addInitScript(([start, epoch]) => { const Real = Date, off = start - Real.now();
      class Pinned extends Real { constructor(...a){ a.length ? super(...a) : super(Real.now() + off); } static now(){ return Real.now() + off; } }
      window.Date = Pinned; window.CROWD_EPOCH = epoch; }, [EPOCH, EPOCH]);
    await p.route('**/cdn.jsdelivr.net/**phaser*', r => r.fulfill({ path: path.join(ROOT, 'tipsey-delivery/public/phaser.min.js'), contentType: 'application/javascript' }));
    await p.route(/fonts\.googleapis|fonts\.gstatic/, r => r.abort());
    await p.goto(url);
    await p.waitForFunction(() => typeof game !== 'undefined' && game.scene && game.scene.getScene('world') && game.scene.getScene('world').route, null, { timeout: 60000 });
    await p.waitForTimeout(2000 + delay);
    await p.evaluate(() => { if(typeof window.garageClose === 'function') window.garageClose(); });
    const r = await p.evaluate(async () => {
      const s = game.scene.getScene('world'), sleep = ms => new Promise(r => setTimeout(r, ms)), fleet = s.route.trafficFleet;
      owStandUpAt(s, 9179, 2493, Math.PI);
      await sleep(25000);
      const held = fleet.cars.filter(c => c.hold).length;
      owStandUpAt(s, -5500, -12150, Math.PI);
      await sleep(8000);
      const sb = s.streetBot(), T = 3000000, out = {};
      let heldAfter = 0;
      fleet.cars.forEach((c, i) => { if(c.errand) return; const a = trafficWorldAt(c, T);
        if(Math.abs(a.wp.x - sb.x) + Math.abs(a.wp.y - sb.y) < 7000) return;
        const b = trafficWorldAt(Object.assign({}, c, { hold: 0 }), T);
        if(c.hold) heldAfter++;
        out[i] = [Math.round(a.wp.x), Math.round(a.wp.y)]; });
      return { held, heldAfter, out, n: fleet.cars.length };
    });
    runs.push({ ...r, errs }); await p.close();
  }
  await browser.close(); srv.close();
  const [A, B] = runs, keys = Object.keys(A.out).filter(k => k in B.out);
  const bad = keys.filter(k => A.out[k][0] !== B.out[k][0] || A.out[k][1] !== B.out[k][1]);
  const errs = runs.flatMap(r => r.errs);
  console.log(`cars ${A.n}; held near the busy spot: A ${A.held}, B ${B.held}; far cars compared ${keys.length}, different ${bad.length}; still holding after the let-go: A ${A.heldAfter}, B ${B.heldAfter}; page errors ${errs.length}`);
  errs.slice(0, 5).forEach(e => console.log('ERR', e));
  process.exit(keys.length > 20 && !bad.length && !errs.length ? 0 : 1);
})();
