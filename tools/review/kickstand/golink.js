const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.route(/phaser(\.min)?\.js/, r => r.fulfill({ path: '/home/user/Tipsy/tipsey-delivery/public/phaser.min.js', contentType: 'application/javascript' }));
  await p.goto('file:///home/user/Tipsy/game/index.html?go=cratewell&view=1');
  await p.waitForFunction(() => window.game && game.scene.getScene('world') && game.scene.getScene('world').route, null, { timeout: 90000 });
  await p.waitForTimeout(20000);
  console.log(await p.evaluate(() => { const s = game.scene.getScene('world'); return JSON.stringify({ garage: document.body.classList.contains('tpGarage'), state: s.state, lock: HOOD_LOCK.active, inside: s._inside && s._inside.name, x: Math.round(s.ow.px), y: Math.round(s.ow.py) }); }));
  await p.screenshot({ path: '/tmp/golink.png' });
  console.log('errors', errs.length, errs[0] || '');
  await b.close();
})();
