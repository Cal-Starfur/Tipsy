/* RUN SHEET: gather evidence for the test sheet (tools/test_sheet.json) headless.
   For each section (or --section id) and each spot: boot the local game at the
   jump link, shoot it by day (NIGHT_CLOCK.time 12), at the section's night time,
   and wide (view 3) for context. The point is DRAW problems, judged against
   docs/LOOK_RULES.md; page errors are only recorded. Writes snaps/sheet/<section>/*.jpg
   and snaps/sheet/report.json, then prints the items to judge. Claude looks at
   the photos and judges each item; "Hands-on" items are left for Sir.
     node tools/run_sheet.js [--section skate] [--wait 4000] */
const fs = require('fs'), path = require('path'), http = require('http');
const { execSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2), arg = (k, d) => args.includes(k) ? args[args.indexOf(k) + 1] : d;
const ONLY = arg('--section', ''), WAIT = +arg('--wait', 4000), OUT = path.join(ROOT, 'snaps/sheet');
const sheet = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/test_sheet.json'), 'utf8'));
function pw(){ try { return require('playwright'); } catch(e){ return require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); } }
function serve(){
  const types = { '.html':'text/html', '.js':'application/javascript', '.json':'application/json', '.png':'image/png', '.css':'text/css' };
  const s = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
    if(!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ r.writeHead(404); r.end(); return; }
    r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
  return new Promise(r => s.listen(0, '127.0.0.1', () => r(s)));
}
(async () => {
  const secs = sheet.sections.filter(s => !ONLY || s.id === ONLY);
  if(!secs.length){ console.log('no such section'); process.exit(1); }
  fs.mkdirSync(OUT, { recursive: true });
  const { chromium } = pw(), srv = await serve();
  const base = `http://127.0.0.1:${srv.address().port}/game/index.html`;
  const exe = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
  await page.route('**/cdn.jsdelivr.net/**phaser*', r => r.fulfill({ path: path.join(ROOT, 'tipsey-delivery/public/phaser.min.js'), contentType: 'application/javascript' }));
  await page.route(/fonts\.googleapis|fonts\.gstatic/, r => r.abort());
  let errs = [];
  page.on('pageerror', e => errs.push('page: ' + String(e).slice(0, 200)));
  page.on('console', m => { if(m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
  const report = [];
  for(const s of secs){
    fs.mkdirSync(path.join(OUT, s.id), { recursive: true });
    const shots = [];
    for(const sp of s.spots){
      await page.goto(`${base}?go=${encodeURIComponent(sp.go)}&view=${sp.view}`);
      await page.waitForFunction(() => { try { const w = game.scene.getScene('world'); return w && w.ow && w.state === 'play'; } catch(e){ return false; } }, null, { timeout: 60000 }).catch(() => {});
      for(const [name, seed, vw] of [['day', 'NIGHT_CLOCK.time = 12'], ['night', s.night], ['wide', 'NIGHT_CLOCK.time = 12', 3]]){
        if(name === 'wide' && sp.view === 3) continue;
        if(vw) await page.goto(`${base}?go=${encodeURIComponent(sp.go)}&view=${vw}`).then(() => page.waitForFunction(() => { try { const w = game.scene.getScene('world'); return w && w.ow && w.state === 'play'; } catch(e){ return false; } }, null, { timeout: 60000 })).catch(() => {});
        errs = [];
        await page.evaluate(seed).catch(() => {});
        await page.waitForTimeout(2000 + WAIT);
        const f = path.join(OUT, s.id, `${sp.label.replace(/[^a-z0-9]+/gi, '-')}-${name}.jpg`);
        await page.screenshot({ path: f, type: 'jpeg', quality: 80 });
        shots.push({ spot: sp.label, when: name, file: path.relative(ROOT, f), errs: [...errs] });
      }
    }
    report.push({ id: s.id, title: s.title, items: s.items, shots });
    console.log(`${s.id}: ${shots.length} photos`);
    for(const x of shots) console.log('  ' + x.file);
  }
  await browser.close(); srv.close();
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
  console.log('report: snaps/sheet/report.json');
  process.exit(0);   // page errors stay in the report; the point here is what is DRAWN
})();
