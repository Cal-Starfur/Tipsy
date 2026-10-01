#!/usr/bin/env node
/* TIPSY PERF CHECK -- run on every change (see CLAUDE.md).

   Boots the game headless, stands the robot at fixed spots at each view,
   waits for the ground and building caches to finish painting, then
   samples a few seconds of frames. The number it judges is DRAW COMMANDS
   PER FRAME: what every Graphics in the scene holds after a frame. Headless
   timings are noisy (software GL, a shared CPU); the command count is
   steady, and it is what tracked the Mac's frame rate through the
   2026-09-30 ground/building cache work.

   FAILS (exit 1) when a spot:
     - goes over BUDGET commands a frame, or
     - grows more than GROWTH over tools/perf_baseline.json, or
     - throws a page error.
   WARNS when a spot draws a building live while standing still (the cache
   is repainting it: an unstable key, or something too big or too slow).

   The date is pinned (PINNED_DATE) so every run gets the same daily route
   -- the same night roll, the same shops -- whatever day it is.

   Usage:
     node tools/perf_check.js              check against the baseline
     node tools/perf_check.js --update     write the baseline from this run
     node tools/perf_check.js --devvit     run the Devvit build (game.html)
     node tools/perf_check.js --only mall  just the spots whose name has "mall"
     node tools/perf_check.js --why spawn@3
                                           what is drawing live there: the
                                           world-queue items with the most
                                           commands, by the source of their
                                           draw (cache them, cull them, or
                                           split their moving parts out)
   Needs Playwright and Chromium; set CHROMIUM_PATH if Chromium is not at
   /opt/pw-browsers/chromium. */
const path = require('path'), fs = require('fs'), http = require('http');
const { execSync } = require('child_process');

/* draw commands a frame, any spot, any view. Set 2026-10-01 at the worst
   spot then (spawn@3, ~53 k: street props, the depot, alley gates, the
   robot -- moving things) plus headroom; the Mac held 60 fps there. The
   GROWTH check against the baseline is what catches a regression early;
   this is the ceiling nothing may cross. */
const BUDGET = 60000;
const GROWTH = 0.15;           // over the baseline by more than this fails
const PINNED_DATE = '2026-09-30T15:00:00Z';
const SPOTS = [                // [name, x, y] -- null x: where the game spawns him
  ['spawn',  null,  null],
  ['mall',   12600, -560],
  ['garage', 7800,  -560],
  ['shops',  9179,  2493],
  ['gate',   8100,  560],
  ['sierra', 3128,  -2400],
];
const VIEWS = [1, 2, 3];

const ROOT = path.resolve(__dirname, '..');
const BASELINE = path.join(__dirname, 'perf_baseline.json');
const args = process.argv.slice(2);
const UPDATE = args.includes('--update'), DEVVIT = args.includes('--devvit');
const WHY = args.includes('--why') ? args[args.indexOf('--why') + 1] : null;
const ONLY = WHY ? WHY.split('@')[0] : args.includes('--only') ? args[args.indexOf('--only') + 1] : null;

function loadPlaywright(){
  try { return require('playwright'); }
  catch(e){ return require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); }
}

/* a static server on the repo, so the check needs nothing else running */
function serve(){
  const types = { '.html':'text/html', '.js':'application/javascript', '.json':'application/json', '.png':'image/png', '.css':'text/css' };
  const srv = http.createServer((req, res) => {
    const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if(!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r(srv)));
}

(async () => {
  const { chromium } = loadPlaywright();
  const srv = await serve();
  const page = DEVVIT ? 'tipsey-delivery/public/game.html' : 'game/index.html';
  const url = `http://127.0.0.1:${srv.address().port}/${page}`;
  const exe = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  const p = await browser.newPage({ viewport: { width: 1180, height: 820 } });
  /* the clock starts at PINNED_DATE and runs on from there: Date only, so
     rAF, timers and performance.now stay real (a frozen Date stalls the
     game's own waits) */
  await p.addInitScript(start => {
    const Real = Date, off = start - Real.now();
    class Pinned extends Real { constructor(...a){ a.length ? super(...a) : super(Real.now() + off); } static now(){ return Real.now() + off; } }
    window.Date = Pinned;
  }, Date.parse(PINNED_DATE));
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).slice(0, 300)));
  /* Phaser from the repo's own copy; web fonts are not part of the frame */
  await p.route('**/cdn.jsdelivr.net/**phaser*', r => r.fulfill({ path: path.join(ROOT, 'tipsey-delivery/public/phaser.min.js'), contentType: 'application/javascript' }));
  await p.route(/fonts\.googleapis|fonts\.gstatic/, r => r.abort());
  /* a fresh boot for every spot: what one spot leaves behind (cars, the
     caches, the ground tiles) must not move the next one's numbers, or a
     --only run and a full run disagree */
  const boot = async () => {
    await p.goto(url);
    await p.waitForFunction(() => typeof game !== 'undefined' && game.scene && game.scene.getScene('world') && game.scene.getScene('world').route, null, { timeout: 60000 });
    await p.waitForTimeout(3000);
  };
  await boot();
  const build = await p.evaluate(() => typeof TIPSY_BUILD !== 'undefined' ? TIPSY_BUILD : '?');

  const results = {};
  for(const [name, x, y] of SPOTS){
    if(ONLY && !name.includes(ONLY)) continue;
    if(Object.keys(results).length) await boot();
    for(const z of (WHY ? [+WHY.split('@')[1]] : VIEWS)){
      const r = await p.evaluate(async ([x, y, z, WHY]) => {
        const s = game.scene.getScene('world'), sleep = ms => new Promise(r => setTimeout(r, ms));
        if(x !== null) owStandUpAt(s, x, y, Math.PI);
        zoomSet(z);
        /* settled: neither cache has painted anything, and no building has
           been drawn live waiting for its image, for 1.5 s (60 s at most --
           headless paints far slower than a Mac or an iPad) */
        const busy = () => (s._bc ? s._bc.painted + s._bc.live : 0) + (s._gc ? s._gc.painted : 0);
        let last = -1, still = 0;
        for(let t = 0; t < 60000 && still < 1500; t += 250){ await sleep(250); const n = busy(); still = n === last ? still + 250 : 0; last = n; }
        const count = o => (o.commandBuffer ? o.commandBuffer.length : 0) + (o.list ? o.list.reduce((a, c) => a + count(c), 0) : 0);
        const C = [], U = [], R = [];
        let u0 = 0, r0 = 0;
        const pre = () => { u0 = performance.now(); }, post = () => { U.push(performance.now() - u0); };
        const rpre = () => { r0 = performance.now(); }, rpost = () => { R.push(performance.now() - r0); C.push(s.children.list.reduce((a, o) => a + count(o), 0)); };
        const live0 = s._bc ? s._bc.live : 0;
        s.events.on('preupdate', pre); s.events.on('postupdate', post);
        game.events.on('prerender', rpre); game.events.on('postrender', rpost);
        await sleep(3000);
        s.events.off('preupdate', pre); s.events.off('postupdate', post);
        game.events.off('prerender', rpre); game.events.off('postrender', rpost);
        /* --why: one frame's world queue, each item's commands counted
           across every layer it can draw into (see BUILDING CACHE) */
        let why = null;
        if(WHY){
          const groups = new Map(), sort0 = Array.prototype.sort;
          const tot = () => { let c = s.gWorld.commandBuffer.length; for(let k = 0; k < (s._segN || 0); k++) c += s._segPool[k].commandBuffer.length; return c; };
          let armed = true;
          Array.prototype.sort = function(f){
            const res = sort0.call(this, f);
            if(armed && this.length > 50 && this[0] && typeof this[0].fn === 'function' && 'depth' in this[0]){
              armed = false;
              for(const it of this){
                const fn = it.fn, key = fn.toString().replace(/\s+/g, ' ').slice(0, 140);
                it.fn = function(){ const c0 = tot(); const out = fn.apply(this, arguments);
                  const e = groups.get(key) || { n: 0, c: 0 }; e.n++; e.c += tot() - c0; groups.set(key, e); return out; };
              }
            }
            return res;
          };
          await sleep(1000);
          Array.prototype.sort = sort0;
          why = [...groups].sort((a, b) => b[1].c - a[1].c).slice(0, 15).map(([k, e]) => ({ cmds: e.c, n: e.n, src: k }));
        }
        const med = a => { if(!a.length) return 0; const b = a.slice().sort((p, q) => p - q); return b[b.length >> 1]; };
        return { cmds: Math.round(med(C)), upd: +med(U).toFixed(1), rend: +med(R).toFixed(1), frames: C.length,
                 live: s._bc ? s._bc.live - live0 : 0, K: s.K, night: !!(s.route && s.route.night), why };
      }, [x, y, z, WHY]);
      results[`${name}@${z}`] = r;
    }
  }
  await browser.close(); srv.close();

  /* report */
  const base = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')) : null;
  let fail = false;
  const out = [`TIPSY PERF CHECK  build "${build}"  ${DEVVIT ? 'devvit' : 'web'}  date ${PINNED_DATE.slice(0, 10)}  budget ${BUDGET}  growth ${GROWTH*100}%`,
               base ? `baseline: build "${base.build}" (${base.when})` : 'no baseline yet (run with --update)',
               'spot@view      cmds  baseline  change   upd ms  rend ms  live  verdict'];
  for(const [k, r] of Object.entries(results)){
    const b = base && base.spots[k] ? base.spots[k].cmds : null;
    const ch = b ? (r.cmds - b) / b : 0;
    const v = [];
    if(r.cmds > BUDGET){ v.push('OVER BUDGET'); fail = true; }
    if(b && ch > GROWTH){ v.push('GREW'); fail = true; }
    if(r.live > 0) v.push(`warn: ${r.live} live draws while still`);
    out.push(`${k.padEnd(12)} ${String(r.cmds).padStart(6)}  ${String(b ?? '-').padStart(8)}  ${(b ? (ch >= 0 ? '+' : '') + (ch*100).toFixed(0) + '%' : '-').padStart(6)}  ${String(r.upd).padStart(7)}  ${String(r.rend).padStart(7)}  ${String(r.live).padStart(4)}  ${v.join(', ') || 'ok'}`);
  }
  for(const [k, r] of Object.entries(results)) if(r.why){
    out.push(`\nWHY ${k}: the world queue's biggest draws, one frame (cached items show ~0)`);
    for(const w of r.why) out.push(`${String(w.cmds).padStart(7)} cmds  x${String(w.n).padEnd(4)} ${w.src}`);
  }
  if(errs.length){ fail = true; out.push('PAGE ERRORS:', ...errs.map(e => '  ' + e)); }
  out.push(fail ? 'RESULT: FAIL' : 'RESULT: PASS');
  console.log(out.join('\n'));

  if(UPDATE && WHY){ console.log('baseline NOT written: --why runs one spot'); process.exit(1); }
  if(UPDATE){
    if(errs.length){ console.log('baseline NOT written: page errors'); process.exit(1); }
    const spots = {};
    for(const [k, r] of Object.entries(results)) spots[k] = { cmds: r.cmds, upd: r.upd, rend: r.rend };
    const prev = base ? base.spots : {};
    fs.writeFileSync(BASELINE, JSON.stringify({ build, when: new Date().toISOString(), date: PINNED_DATE, spots: { ...prev, ...spots } }, null, 1) + '\n');
    console.log('baseline written: tools/perf_baseline.json');
    process.exit(0);
  }
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
