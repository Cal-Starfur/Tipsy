const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 3600, height: 2300 } });
  await p.route(/phaser(\.min)?\.js/, r => r.fulfill({ path: '/home/user/Tipsy/tipsey-delivery/public/phaser.min.js', contentType: 'application/javascript' }));
  await p.goto('file:///home/user/Tipsy/game/index.html?go=cratewell&view=3');
  await p.waitForFunction(() => window.game && game.scene.getScene('world') && game.scene.getScene('world')._inside, null, { timeout: 120000 });
  await p.waitForTimeout(3000);
  await p.evaluate(() => { const s = game.scene.getScene('world'), pk = s._inside; s.ow.px = pk.x0 + 1160; s.ow.py = pk.y0 + 935; s.botX = s.ow.px; s.botY = s.ow.py; game.loop.sleep(); window._T = game.loop.now; });
  const frames = [];
  for(let i = 0; i < 380; i++){ const r = await p.evaluate(() => { CREW_TAP = []; _T += 250; game.step(_T, 250); const r = CREW_TAP; CREW_TAP = null; return r.filter(m => /Kickstand/.test(m.room || '')).map(m => [m.kind, m.build, Math.round(m.a), Math.round(m.b), m.key]); }); frames.push(r); }
  fs.writeFileSync(__dirname + '/trails.json', JSON.stringify(frames)); console.log(frames.length, frames[0].length);
  await b.close();
})();
