/* TIPSY REVIEW HARNESS -- boots the real game headless for the kit checkers
   (tools/world_review.js). The same boot as tools/perf_check.js: a static
   server on the repo, Phaser from the repo's own copy, the date pinned so
   every run gets the same daily route, the garage shut.

   --rev <git ref> serves game/index.html as it was at that commit (the
   backtest: does a checker find, in an old build, what Sir later had to
   point out?). Everything else is served from the working tree. */
const path = require('path'), fs = require('fs'), http = require('http');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const PINNED_DATE = '2026-09-30T15:00:00Z';

function loadPlaywright(){
  try { return require('playwright'); }
  catch(e){ return require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); }
}

/* THE REVIEW COPY: the shop library's drawing primitives live inside its closure, where nothing
   outside can reach them. For a review run only, the page is served with each one wrapped by a
   recorder (window.__RVK(name, args, 0 before | 1 after)), and the closure's state and entry list
   handed out (window.__RVK_ctx, window.__RVK_shops). The game itself is never changed. */
const LIB_PRIMS = ['F', 'S', 'T', 'box', 'slab', 'prism', 'glaze', 'reveal', 'shopDoor', 'blockWord', 'blockWordIn', 'faceCircle'];
function instrument(html){
  const L0 = html.indexOf('const LIB = (function(){');
  if(L0 < 0) return html;
  let head = html.slice(0, L0), body = html.slice(L0);
  body = body.replace('const LIB = (function(){', 'const LIB = (function(){\nwindow.__RVK_ctx = () => ({ MIRROR, SC, ZSCALE, FLANK_RIGHT, W }); window.__RVK_shops = () => SHOPS;');
  /* every point the library draws, in its own frame (before the mirror): window.__RVP3(a, b, z) */
  body = body.replace('  function P(a, b, z){\n', '  function P(a, b, z){\n    if(window.__RVP3) window.__RVP3(a, b, z);\n');
  for(const n of LIB_PRIMS){
    const re = new RegExp('\\nfunction ' + n + '\\(');
    if(!re.test(body)) continue;
    body = body.replace(re, `\nfunction ${n}(...__a){ const __h = window.__RVK; if(__h) __h('${n}', __a, 0); try { return ${n}__rv.apply(this, __a); } finally { if(__h) __h('${n}', __a, 1); } }\nfunction ${n}__rv(`);
  }
  return head + body;
}

function serve(rev, instr){
  const types = { '.html':'text/html', '.js':'application/javascript', '.json':'application/json', '.png':'image/png', '.css':'text/css' };
  let old = rev ? execSync(`git -C "${ROOT}" show ${rev}:game/index.html`, { maxBuffer: 64 << 20 }).toString() : null;
  if(instr) old = instrument(old != null ? old : fs.readFileSync(path.join(ROOT, 'game/index.html'), 'utf8'));
  const srv = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    if(old && u === '/game/index.html'){ res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(old); return; }
    const f = path.join(ROOT, u);
    if(!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r(srv)));
}

async function open({ rev = null, devvit = false, width = 1180, height = 820, instr = false } = {}){
  const { chromium } = loadPlaywright();
  const srv = await serve(rev, instr);
  const page = devvit ? 'tipsey-delivery/public/game.html' : 'game/index.html';
  const url = `http://127.0.0.1:${srv.address().port}/${page}`;
  const exe = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  const p = await browser.newPage({ viewport: { width, height } });
  await p.addInitScript(start => {
    const Real = Date, off = start - Real.now();
    class Pinned extends Real { constructor(...a){ a.length ? super(...a) : super(Real.now() + off); } static now(){ return Real.now() + off; } }
    window.Date = Pinned;
  }, Date.parse(PINNED_DATE));
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).slice(0, 300)));
  await p.route('**/cdn.jsdelivr.net/**phaser*', r => r.fulfill({ path: path.join(ROOT, 'tipsey-delivery/public/phaser.min.js'), contentType: 'application/javascript' }));
  await p.route(/fonts\.googleapis|fonts\.gstatic/, r => r.abort());
  const boot = async () => {
    await p.goto(url);
    await p.waitForFunction(() => typeof game !== 'undefined' && game.scene && game.scene.getScene('world') && game.scene.getScene('world').route, null, { timeout: 90000 });
    await p.waitForTimeout(3000);
    await p.evaluate(() => { if(typeof window.garageClose === 'function') window.garageClose(); });
    await p.waitForTimeout(2000);
  };
  const close = async () => { await browser.close(); srv.close(); };
  return { page: p, errs, boot, close, url };
}

/* where a spot is: [x, y] in world units, null (where the game spawns him),
   or a string evaluated in the game's realm that returns { x, y } */
async function standAt(p, spot, yaw = Math.PI, zoom = 3){
  return p.evaluate(async ([spot, yaw, zoom]) => {
    const s = game.scene.getScene('world');
    let at = spot;
    if(typeof spot === 'string') at = (0, eval)(spot);
    if(at && at.length === 2) at = { x: at[0], y: at[1] };
    if(at) owStandUpAt(s, at.x, at.y, yaw);
    if(typeof zoomSet === 'function') zoomSet(zoom);
    await new Promise(r => setTimeout(r, 1500));
    return { x: s.ow ? s.ow.px : null, y: s.ow ? s.ow.py : null };
  }, [spot, yaw, zoom]);
}

module.exports = { ROOT, PINNED_DATE, open, standAt };
