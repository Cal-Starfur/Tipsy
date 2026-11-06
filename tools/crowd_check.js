#!/usr/bin/env node
/* SEEDED CROWD CHECK (docs/seeded-crowd.md): two boots, the same daily seed, the same spot, the clock pinned the same
   (window.CROWD_EPOCH); every scheduled shop party (its visit key) one boot made must be the same in the other: the same
   t0 on the world clock and the same walk, and both must have made some. Usage: node tools/crowd_check.js [x y] */
const path = require('path'), fs = require('fs'), http = require('http');
const { execSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..'), EPOCH = Date.parse('2026-09-30T15:00:00Z');
function loadPlaywright(){ try { return require('playwright'); } catch(e){ return require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); } }
const [X, Y] = process.argv.length > 3 ? [+process.argv[2], +process.argv[3]] : [9179, 2493];
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
  for(const delay of [0, 7000]){                       // the second boot stands later in the session: the clock, not the session, decides
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
    const seen = await p.evaluate(async ([x, y]) => {
      const s = game.scene.getScene('world'), sleep = ms => new Promise(r => setTimeout(r, ms)), got = {};
      owStandUpAt(s, x, y, Math.PI);
      for(let i = 0; i < 160; i++){ await sleep(250);
        for(const m of (s._shoppers || [])) if(m.vkey && !got[m.vkey + '#' + m.gk]) got[m.vkey + '#' + m.gk] = { t0: Math.round(CROWD_WORLD.epoch + m.t0), pts: m.pts.map(q => [Math.round(q.x), Math.round(q.y), q.wait ? Math.round(q.wait) : 0]), car: !!m.car }; }
      return got; }, [X, Y]);
    runs.push({ seen, errs }); await p.close();
  }
  await browser.close(); srv.close();
  const [A, B] = runs.map(r => r.seen), common = Object.keys(A).filter(k => k in B);
  let bad = 0;
  for(const k of common) if(JSON.stringify(A[k]) !== JSON.stringify(B[k])){ bad++; console.log('DIFF', k); }
  const errs = runs.flatMap(r => r.errs);
  console.log(`boot A ${Object.keys(A).length} walkers, boot B ${Object.keys(B).length}, in both ${common.length}, different ${bad}, page errors ${errs.length}`);
  errs.slice(0, 5).forEach(e => console.log('ERR', e));
  process.exit(common.length > 0 && !bad && !errs.length ? 0 : 1);
})();
