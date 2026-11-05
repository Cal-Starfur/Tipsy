/* SNAP SPOTS: photograph every test spot, for Sir to look at without playing.
   Reads the `- Test:` jump links from docs/state/CONSISTENCY_PASS.md (the same
   links Sir taps on the iPad), boots the LOCAL game/index.html headless at each
   one's ?go= spot, and photographs it at view 3 (the widest) unless told
   otherwise. One fresh boot per spot. Writes a PNG per spot and one labelled
   contact sheet, snaps/sheet.png.

     node tools/snap_spots.js                  every Test: link in the doc
     node tools/snap_spots.js --only harbor    links whose label or batch has "harbor"
     node tools/snap_spots.js --go 4244,15060 --label "trophy door"   one ad-hoc spot
     node tools/snap_spots.js --view 2         another zoom (1, 2 or 3; default 3)
     node tools/snap_spots.js --doc <file.md> --out <dir>

   Prints one line per spot (label, spot, page errors) and the sheet's path.
   Exits 1 if any spot threw a page error. snaps/ is git-ignored. */
const fs = require('fs'), path = require('path'), http = require('http');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const arg = (k, d) => args.includes(k) ? args[args.indexOf(k) + 1] : d;
const DOC = path.resolve(ROOT, arg('--doc', 'docs/state/CONSISTENCY_PASS.md'));
const OUT = path.resolve(ROOT, arg('--out', 'snaps'));
const VIEW = +arg('--view', 3);
const ONLY = (arg('--only', '') || '').toLowerCase();
const GO = arg('--go', null);
const WAIT = +arg('--wait', 6000);   // ms after he lands: ground and building caches paint

function loadPlaywright(){
  try { return require('playwright'); }
  catch(e){ return require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); }
}

/* the doc's Test: lines -> [{ batch, label, go }] */
function spotsFromDoc(){
  const out = [];
  let batch = '';
  for(const line of fs.readFileSync(DOC, 'utf8').split('\n')){
    const h = /^#{2,3}\s+(.*)/.exec(line);
    if(h){ batch = h[1].trim(); continue; }
    if(!/^\s*-\s*Test:/.test(line)) continue;
    for(const m of line.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)){
      const q = /[?&]go=([^&)\s]+)/.exec(m[2]);
      if(q) out.push({ batch, label: m[1], go: decodeURIComponent(q[1]) });
    }
  }
  return out;
}

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

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' })[c]);

(async () => {
  let spots = GO ? [{ batch: 'ad hoc', label: arg('--label', GO), go: GO }] : spotsFromDoc();
  if(ONLY) spots = spots.filter(s => (s.label + ' ' + s.batch).toLowerCase().includes(ONLY));
  /* the same spot listed under two batches is photographed once */
  const seen = new Map();
  for(const s of spots){ const k = s.go; if(seen.has(k)) seen.get(k).also.push(s.batch); else seen.set(k, { ...s, also: [] }); }
  spots = [...seen.values()];
  if(!spots.length){ console.log('no spots (check --only, or the doc has no "- Test:" lines)'); process.exit(1); }
  fs.mkdirSync(OUT, { recursive: true });

  const { chromium } = loadPlaywright();
  const srv = await serve();
  const base = `http://127.0.0.1:${srv.address().port}/game/index.html`;
  const exe = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
  await page.route('**/cdn.jsdelivr.net/**phaser*', r => r.fulfill({ path: path.join(ROOT, 'tipsey-delivery/public/phaser.min.js'), contentType: 'application/javascript' }));
  await page.route(/fonts\.googleapis|fonts\.gstatic/, r => r.abort());
  let errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 200)));

  const shots = [];
  let bad = 0;
  for(const [i, s] of spots.entries()){
    errs = [];
    const go = /^[a-z]+$/i.test(s.go) ? s.go : s.go.split(',').map(Number).join(',');
    await page.goto(`${base}?go=${encodeURIComponent(go)}&view=${VIEW}`);
    /* the game's own ?go= stands him there (garage shut, camera snapped) */
    await page.waitForFunction(() => { try { const w = game.scene.getScene('world'); return w && w.ow && w.state === 'play'; } catch(e){ return false; } }, null, { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(2500 + WAIT);
    const at = await page.evaluate(() => { const o = game.scene.getScene('world').ow; return Math.round(o.px) + ',' + Math.round(o.py); }).catch(() => '?');
    const file = path.join(OUT, `${String(i + 1).padStart(2, '0')}-${slug(s.label)}.png`);
    await page.screenshot({ path: file });
    shots.push({ ...s, file, at, errs: [...errs] });
    if(errs.length) bad++;
    console.log(`${String(i + 1).padStart(2)}. ${s.label}  [${s.batch}${s.also.length ? ' + ' + s.also.join(', ') : ''}]  go=${s.go} -> at ${at}  ${errs.length ? 'ERRORS: ' + errs.join(' | ') : 'ok'}`);
  }

  /* the contact sheet: labelled tiles, two across */
  const tiles = shots.map((s, i) => `<figure><img src="file://${s.file}"><figcaption><b>${i + 1}. ${esc(s.label)}</b><span>${esc(s.batch)} &middot; go=${esc(s.go)}${s.errs.length ? ' &middot; <em>page errors</em>' : ''}</span></figcaption></figure>`).join('');
  const html = `<!doctype html><meta charset=utf8><style>
    body{margin:0;background:#12161d;font:15px system-ui,sans-serif;color:#e8ecf2}
    h1{font-size:20px;margin:16px 20px 4px} p{margin:0 20px 12px;color:#9aa6b6}
    .g{display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:0 20px 20px}
    figure{margin:0;background:#1a2029;border-radius:10px;overflow:hidden}
    img{display:block;width:100%} figcaption{padding:8px 12px;display:grid;gap:2px}
    span{color:#9aa6b6;font-size:13px} em{color:#ff8a3d;font-style:normal}</style>
    <h1>Test spots at view ${VIEW}</h1><p>${shots.length} spots &middot; ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC &middot; local game/index.html</p>
    <div class="g">${tiles}</div>`;
  const sheetHtml = path.join(OUT, 'sheet.html');
  fs.writeFileSync(sheetHtml, html);
  const sp = await browser.newPage({ viewport: { width: 1400, height: 800 } });
  await sp.goto('file://' + sheetHtml);
  await sp.waitForTimeout(500);
  await sp.screenshot({ path: path.join(OUT, 'sheet.png'), fullPage: true });
  await browser.close(); srv.close();
  console.log(`sheet: ${path.join(OUT, 'sheet.png')}  (${shots.length} spots, ${bad} with page errors)`);
  process.exit(bad ? 1 : 0);
})();
