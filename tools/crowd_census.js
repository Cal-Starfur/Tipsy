#!/usr/bin/env node
/* THE CROWD CENSUS (docs/seeded-crowd.md, sc5): same daily seed, two boots, every CITY_PEOPLE group the same.
   Both boots (run side by side, one starting a few seconds after the other) stand at the same spots on the same clock
   (window.CROWD_EPOCH pinned); at each spot, at the same instant of the world clock, every group's people are listed
   (CITY_PEOPLE.each) and a group's list in one boot must be the other's -- the same count, each within TOL of one in the
   other. A group that differs is a population still living off the session or Math.random: it is listed, and the run fails
   unless it is in tools/crowd_census_known.json (the ones known and left, each with why). A group neither boot saw at any
   spot is reported as unseen (move a spot, or add one, to cover it).
   Usage: node tools/crowd_census.js [--quick] */
const path = require('path'), fs = require('fs'), http = require('http');
const { execSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..'), EPOCH = Date.parse('2026-09-30T15:00:00Z'), TOL = 24;
const QUICK = process.argv.includes('--quick'), KNOWN_F = path.join(__dirname, 'crowd_census_known.json');
function loadPlaywright(){ try { return require('playwright'); } catch(e){ return require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); } }
const ONLY = (process.argv.find(a => a.startsWith('--spots=')) || '').slice(8).split(',').filter(Boolean);
const SPOTS = [['shops', 9179, 2493], ['homes', 17640, 2392], ['mall', 12600, -560], ['strand', 'nss'], ['boardwalk', 'bw'], ['almshouse', 'alms'], ['harbor', -3600, -9000], ['garage', 7800, -560]]
  .slice(0, QUICK ? 3 : 8).filter(sp => !ONLY.length || ONLY.includes(sp[0]));
const STEP = 40000, FIRST = 60000;
async function boot(browser, url, delay){
  const p = await browser.newPage({ viewport: { width: 1180, height: 820 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 300)));
  await p.addInitScript(([start, epoch]) => { const Real = Date, off = start - Real.now();
    class Pinned extends Real { constructor(...a){ a.length ? super(...a) : super(Real.now() + off); } static now(){ return Real.now() + off; } }
    window.Date = Pinned; window.CROWD_EPOCH = epoch; }, [EPOCH, EPOCH]);
  await p.route('**/cdn.jsdelivr.net/**phaser*', r => r.fulfill({ path: path.join(ROOT, 'tipsey-delivery/public/phaser.min.js'), contentType: 'application/javascript' }));
  await p.route(/fonts\.googleapis|fonts\.gstatic/, r => r.abort());
  await p.goto(url);
  await p.waitForFunction(() => typeof game !== 'undefined' && game.scene && game.scene.getScene('world') && game.scene.getScene('world').route, null, { timeout: 90000 });
  await p.waitForTimeout(delay);
  await p.evaluate(() => { if(typeof window.garageClose === 'function') window.garageClose(); });
  return { p, errs };
}
async function run(p, spots, step, first){
  return p.evaluate(async ([spots, STEP, FIRST]) => {
    const s = game.scene.getScene('world'), sleep = ms => new Promise(r => setTimeout(r, ms)), out = {};
    HOME_SCHED.period = [30000, 50000]; HOME_SCHED.awayMs = [10000, 25000];       // (quick home cycles: the rates are not what is checked)
    const g = s.route.grid, rd = v => Math.round(v);
    const where = k => k === 'nss' ? (nssHomeDoorsOf(g)[0] || {}) : k === 'bw' ? (() => { const p = boardwalkStrollers(g)[0]; const q = p && bwAt(p, 0); return q || {}; })()
                     : k === 'alms' ? (() => { const p = almsFolkList()[0]; return p ? (p.still ? p : p.pts[0]) : {}; })() : null;
    let pending = null;
    s.events.on('postupdate', () => { if(pending && s.time.now >= pending.T){ const { T, name } = pending; pending = null; const rows = [];
      CITY_PEOPLE.each(s, T, e => { if(isFinite(e.x) && isFinite(e.y)) rows.push([e.group || '?', rd(e.x), rd(e.y), e.kind || '', e.hidden ? 1 : 0]); });
      out[name] = rows; } });
    for(let i = 0; i < spots.length; i++){
      const [name, a, b] = spots[i], T = FIRST + i*STEP;
      while(s.time.now < T - 28000) await sleep(250);
      let x = a, y = b;
      if(typeof a === 'string'){ const w = where(a); x = w.x; y = w.y; }
      if(isFinite(x) && isFinite(y)) owStandUpAt(s, x, y, Math.PI);
      pending = { T, name };
      while(pending) await sleep(250);
    }
    return out;
  }, [spots, step, first]);
}
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
  const [A, B] = await Promise.all([boot(browser, url, 1000), boot(browser, url, 5000)]);
  const [RA, RB] = await Promise.all([run(A.p, SPOTS, STEP, FIRST), run(B.p, SPOTS, STEP, FIRST)]);
  await browser.close(); srv.close();
  const known = fs.existsSync(KNOWN_F) ? JSON.parse(fs.readFileSync(KNOWN_F, 'utf8')) : {};
  const groups = {};      // group -> { seen, bad: [spot...] }
  for(const [name] of SPOTS){
    const byG = rows => { const m = {}; for(const r of rows || []) (m[r[0]] = m[r[0]] || []).push(r); return m; };
    const a = byG(RA[name]), b = byG(RB[name]);
    for(const gname of new Set([...Object.keys(a), ...Object.keys(b)])){
      const G = groups[gname] = groups[gname] || { n: 0, bad: [] }, la = (a[gname] || []).slice(), lb = (b[gname] || []).slice();
      G.n += la.length + lb.length;
      let ok = la.length === lb.length;
      if(ok) for(const r of la){ const k = lb.findIndex(q => Math.hypot(q[1] - r[1], q[2] - r[2]) <= TOL && q[3] === r[3] && q[4] === r[4]); if(k < 0){ ok = false; break; } lb.splice(k, 1); }
      if(!ok){ G.bad.push(`${name} (${(a[gname] || []).length} vs ${(b[gname] || []).length})`);
        if(!G.ex){ const A0 = a[gname] || [], B0 = b[gname] || []; const r = A0.find(r => !B0.some(q => Math.hypot(q[1] - r[1], q[2] - r[2]) <= TOL && q[3] === r[3] && q[4] === r[4])) || A0[0];
          if(r){ const near = B0.map(q => ({ q, d: Math.hypot(q[1] - r[1], q[2] - r[2]) })).sort((u, v) => u.d - v.d)[0]; G.ex = `e.g. ${JSON.stringify(r)} vs nearest ${near ? JSON.stringify(near.q) + ' d=' + Math.round(near.d) : 'none'}`; } } }
    }
  }
  let fail = 0;
  const lines = Object.keys(groups).sort().map(n => { const G = groups[n], k = known[n];
    const st = G.bad.length ? (k ? 'KNOWN ' : 'DIFF  ') : 'same  ';
    if(G.bad.length && !k) fail++;
    return `${st} ${n}  [${G.n} seen]${G.bad.length ? '  at ' + G.bad.join(', ') : ''}${G.bad.length && k ? '  -- ' + k : ''}${G.ex && !k ? '\n        ' + G.ex : ''}`; });
  const errs = [...A.errs, ...B.errs];
  console.log(lines.join('\n'));
  console.log(`\n${Object.keys(groups).length} groups seen at ${SPOTS.length} spots; ${fail} differ and are not known; page errors ${errs.length}`);
  errs.slice(0, 5).forEach(e => console.log('ERR', e));
  process.exit(fail || errs.length ? 1 : 0);
})();
