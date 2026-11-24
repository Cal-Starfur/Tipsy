const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.route(/phaser(\.min)?\.js/, r => r.fulfill({ path: '/home/user/Tipsy/tipsey-delivery/public/phaser.min.js', contentType: 'application/javascript' }));
  await p.goto('file:///home/user/Tipsy/game/index.html');
  await p.waitForFunction(() => window.game && game.scene.getScene('world') && game.scene.getScene('world').route, null, { timeout: 90000 });
  const ts = process.argv[2].split(',').map(Number), box = process.argv[3].split(',').map(Number), rx = new RegExp(process.argv[4] || '.');
  const r = await p.evaluate(([ts, box, rs]) => { const rx = new RegExp(rs); const items = LIB.collect('Kickstand Scooter Co. Hall Interior', (a, b, h) => ({ x: a - b, y: (a + b)/2 - h }), 1).filter(it => it.fx && it.fx.crew);
    return ts.map(t => { let all = []; for(const it of items) all = all.concat(it.fx.crew(t));
      return [t, all.filter(m => m.a > box[0] && m.a < box[1] && m.b > box[2] && m.b < box[3] && rx.test(m.kind + ':' + (m.stage || m.build || ''))).map(m => [m.kind, m.stage || m.build || '', Math.round(m.a), Math.round(m.b), Math.round(m.z || 0), Math.round((m.dd || 0)), m.th != null ? +m.th.toFixed(2) : null])]; }); }, [ts, box, process.argv[4] || '.']);
  for(const x of r) console.log(JSON.stringify(x));
  await b.close();
})();
