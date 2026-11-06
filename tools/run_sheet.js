/* RUN SHEET: gather evidence for the test sheet (tools/test_sheet.json) headless.
   For each section (or --section id) and each spot: boot the local game at the
   jump link, shoot it by day (NIGHT_CLOCK.time 12), at the section's night time,
   and wide (view 3) for context. The point is DRAW problems, judged against
   docs/LOOK_RULES.md; page errors are only recorded. Writes snaps/sheet/<section>/*.jpg
   and snaps/sheet/report.json, then prints the items to judge. Claude looks at
   the photos and judges each item; "Hands-on" items are left for Sir.
     node tools/run_sheet.js [--section skate] [--wait 4000]
     node tools/run_sheet.js --walkins [--pocket pelican]   every walk-in: outside with the room's footprint, and inside */
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

/* WALK-INS: for every walk-in pocket, the outside and the inside from the same door, so a footprint that differs
   between the two shows. Outside: the room's own footprint drawn on it (red on the ground, orange at wall top) over
   the exterior's shell -- if the shell is bigger, smaller or elsewhere, it shows. Inside: Tipsey in the room.
   Also records W x D and the door; photos at view 2 and 3, the inside also at night. */
const WK_READY = () => { try { const w = game.scene.getScene('world'); return w && w.ow && w.state === 'play'; } catch(e){ return false; } };
async function walkins(page, base, only){
  await page.goto(`${base}?go=${encodeURIComponent('20140,14260')}&view=2`);
  await page.waitForFunction(WK_READY, null, { timeout: 60000 }).catch(() => {});
  const list = await page.evaluate(() => POCKETS.filter(p => p.walkin).map(p => { const v = p.view && p.view(); const d = p.doors[0].world && p.doors[0].world(); return { name: p.name, W: Math.round(p.w), D: Math.round(p.d), door: d && { x: Math.round(d.x), y: Math.round(d.y), ox: d.ox, oy: d.oy } }; }));
  const out = [];
  for(const pk of list.filter(p => !only || p.name.toLowerCase().includes(only.toLowerCase()))){
    if(!pk.door) continue;
    const slug = pk.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    fs.mkdirSync(path.join(OUT, 'walkins'), { recursive: true });
    const shots = [];
    for(const view of [2, 3]){
      const gx = pk.door.x + pk.door.ox * 70, gy = pk.door.y + pk.door.oy * 70;
      await page.goto(`${base}?go=${gx},${gy}&view=${view}`);
      await page.waitForFunction(WK_READY, null, { timeout: 60000 }).catch(() => {});
      await page.evaluate(() => { NIGHT_CLOCK.time = 12; try { BUILDING_CACHE.budgetMs = 400; } catch(e){} });
      await page.waitForTimeout(3500);
      const snap = async (when) => { const f = path.join(OUT, 'walkins', `${slug}-v${view}-${when.replace(/[^a-z0-9]+/gi, "-")}.jpg`); await page.screenshot({ path: f, type: 'jpeg', quality: 80 }); shots.push({ when: `${when} (view ${view})`, file: path.relative(ROOT, f) }); };
      /* outside, with the room's footprint over it */
      await page.evaluate((name) => { const s = game.scene.getScene('world'), q = POCKETS.find(x => x.name === name), v = q.view();
        /* redrawn every frame: drawn once it drifts off the shell while the camera is still settling (that read as a false mismatch) */
        const g = window.__fp = s.add.graphics().setDepth(1e9).setScrollFactor(0);
        const draw = window.__fpDraw = () => { g.clear(); const X0 = q.x0 + v.dx, Y0 = q.y0 + v.dy, c = [[X0, Y0], [X0 + q.w, Y0], [X0 + q.w, Y0 + q.d], [X0, Y0 + q.d]];
          for(const [z, col, w] of [[0, 0xff0000, 3], [q.h, 0xff8800, 2]]){ g.lineStyle(w, col, 1); g.beginPath(); c.map(p => s.W(p[0], p[1], z)).forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.closePath(); g.strokePath(); } };
        s.events.on('postupdate', draw); }, pk.name);
      await page.waitForTimeout(500); await snap('outside, room footprint in red');
      await page.evaluate(() => { game.scene.getScene('world').events.off('postupdate', window.__fpDraw); window.__fp.destroy(); });
      await page.waitForTimeout(300); await snap('outside, clean');
      /* inside: through the door, then to its spawn point */
      await page.evaluate((name) => { const s = game.scene.getScene('world'), q = POCKETS.find(x => x.name === name), d = q.doors[0];
        pocketHandOff(s, q, d, true); const o = s.ow, sp = d.spawn;
        o.px = q.x0 + sp[0]; o.py = q.y0 + sp[1]; o.yaw = d.yaw; s.botX = o.px; s.botY = o.py; s.camX = o.px; s.camY = o.py; }, pk.name);
      await page.waitForTimeout(4000); await snap('inside');
      if(view === 2){ await page.evaluate(() => { NIGHT_CLOCK.time = 21; }); await page.waitForTimeout(3000); await snap('inside, night'); }
    }
    out.push({ id: 'walkin:' + pk.name, title: `${pk.name}  (room ${pk.W} x ${pk.D}, door ${pk.door.x},${pk.door.y})`, items: ['Does the room fit the shell: compare the red footprint on the outside photo with the building around it (same size, same corner, same door position)?', 'Inside: do the walls, door, windows and floor match what the outside shows?'], shots: shots.map(x => ({ spot: pk.name, ...x, errs: [] })) });
  }
  return out;
}
(async () => {
  const WK = args.includes('--walkins');
  const secs = WK || ONLY === 'walkins' ? [] : sheet.sections.filter(s => !ONLY || s.id === ONLY);
  if(!secs.length && !WK && ONLY !== 'walkins'){ console.log('no such section'); process.exit(1); }
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
  if(WK || ONLY === 'walkins'){ const r = await walkins(page, base, arg('--pocket', '')); for(const x of r){ console.log(x.title); for(const y of x.shots) console.log('  ' + y.file + '   ' + y.when); } report.push(...r); }
  await browser.close(); srv.close();
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
  console.log('report: snaps/sheet/report.json');
  process.exit(0);   // page errors stay in the report; the point here is what is DRAWN
})();
