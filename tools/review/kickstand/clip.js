const { chromium } = require('playwright'); const fs = require('fs');
const [OUTD, PER, PH, NF, CA, CB, ZM] = process.argv.slice(2); 
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.route(/phaser(\.min)?\.js/, r => r.fulfill({ path: '/home/user/Tipsy/tipsey-delivery/public/phaser.min.js', contentType: 'application/javascript' }));
  await p.goto('file:///home/user/Tipsy/game/index.html');
  await p.waitForFunction(() => window.game && game.scene.getScene('world') && game.scene.getScene('world').route, null, { timeout: 90000 });
  await p.evaluate(() => { FLEET_TESTING = true; tpProfile.fleetKind = 'amr'; garageClose(); HOOD_LOCK.active = false; BUILDING_CACHE.budgetMs = 400; });
  await p.waitForTimeout(800);
  await p.evaluate((ZMV) => { const s = game.scene.getScene('world'), d = FAC.hall.edoor; owStandUpAt(s, FAC.hall.x1 + 90, (d[0] + d[1])/2, Math.PI); zoomSet(+ZMV); }, ZM);
  await p.waitForTimeout(2500);
  await p.keyboard.down('ArrowUp'); await p.keyboard.down('ArrowLeft'); for(let k = 0; k < 60; k++){ await p.waitForTimeout(100); if(await p.evaluate(() => !!game.scene.getScene('world')._inside)) break; } await p.keyboard.up('ArrowUp'); await p.keyboard.up('ArrowLeft');
  await p.addStyleTag({ content: 'button, #miniMap, #miniBtn, #gpsHud, .iconBtn, #globalSearch, #globalAvatar, #zoomBtn, #dbgBtn, #itemsBtn, #battBtn { display: none !important; }' });
  await p.evaluate(([A, B]) => { const s = game.scene.getScene('world'), pk = s._inside; s.ow.px = pk.x0 + A; s.ow.py = pk.y0 + B; s.botX = s.ow.px; s.botY = s.ow.py; }, [+CA, +CB]);
  await p.waitForTimeout(3500);
  /* start the clip as the jack leaves its bay */
  await p.evaluate(([PER, PH]) => { game.loop.sleep(); const s = game.scene.getScene('world'); window._T = game.loop.now; const r = ((s.time.now % PER) + PER) % PER; window._skip = ((PH - r) % PER + PER) % PER; }, [+PER, +PH]);
  await p.evaluate(() => { const n = Math.ceil(_skip/250); for(let i = 0; i < n; i++){ _T += 250; game.step(_T, 250); } });
  fs.mkdirSync(OUTD, { recursive: true }); for (const f of fs.readdirSync(OUTD)) fs.unlinkSync(OUTD + '/' + f);
  for (let k = 0; k < +NF; k++) { await p.evaluate(() => { for(let i = 0; i < 4; i++){ _T += 125; game.step(_T, 125); } }); await p.screenshot({ path: `${OUTD}/f${String(k).padStart(3, '0')}.png` }); }
  console.log('errors:', errs.length, errs.slice(0, 3).join('\n'));
  await b.close();
})();
