const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.route(/phaser(\.min)?\.js/, r => r.fulfill({ path: '/home/user/Tipsy/tipsey-delivery/public/phaser.min.js', contentType: 'application/javascript' }));
  await p.goto('file:///home/user/Tipsy/game/index.html');
  await p.waitForFunction(() => window.game && game.scene.getScene('world') && game.scene.getScene('world').route, null, { timeout: 90000 });
  const r = await p.evaluate(() => { const items = LIB.collect('Kickstand Scooter Co. Hall Interior', (a, b, h) => ({ x: a - b, y: (a + b)/2 - h }), 1).filter(it => it.fx && it.fx.crew);
    const B = { 1: [1700, 658], 2: [1400, 658], 3: [1100, 658], 4: [800, 658], 5: [800, 1330], 6: [1100, 1330], 7: [1400, 1330] };
    const res = {}; for(const k in B) res[k] = [];
    let prev = {};
    for(let t = 900000; t < 954000; t += 25){ let all = []; for(const it of items) all = all.concat(it.fx.crew(t));
      for(const k in B){ const here = all.some(m => m.kind === 'amr' && Math.abs(m.a - B[k][0]) < 1e-6 && Math.abs(m.b - B[k][1]) < 1e-6 && Math.abs(((m.fdir % 4) + 4) % 4) < 1e-6); if(prev[k] !== undefined && here !== prev[k]) res[k].push([here ? 'in' : 'out', t % 9000, Math.floor((t - 900000)/9000)]); prev[k] = here; } }
    return res; });
  console.log(JSON.stringify(r));
  await b.close();
})();
