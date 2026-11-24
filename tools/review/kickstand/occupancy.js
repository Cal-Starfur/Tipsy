// occupancy of boxes by robots (amr/bot) over one pallet cycle, mod PALT
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); p.on('pageerror', e => console.log('ERR', String(e).slice(0, 300)));
  await p.route(/phaser(\.min)?\.js/, r => r.fulfill({ path: '/home/user/Tipsy/tipsey-delivery/public/phaser.min.js', contentType: 'application/javascript' }));
  await p.goto('file:///home/user/Tipsy/game/index.html');
  await p.waitForFunction(() => window.game && game.scene.getScene('world') && game.scene.getScene('world').route, null, { timeout: 90000 });
  const BX = process.argv[2] ? JSON.parse(process.argv[2]) : { strip500: [1700, 2400, 450, 510], baleBay: [1560, 1720, 400, 520] };
  const r = await p.evaluate((BOXES) => { const items = LIB.collect('Kickstand Scooter Co. Hall Interior', (a, b, h) => ({ x: a - b, y: (a + b)/2 - h }), 1).filter(it => it.fx && it.fx.crew);
    const PAL0 = 60130, PALT = 54000;
    const boxes = BOXES;
    const res = {}; for(const k in boxes) res[k] = [];
    for(let jr = 0; jr < PALT*3; jr += 250){ const t = 900000*0 + PAL0 + jr + PALT*20; let all = []; for(const it of items) all = all.concat(it.fx.crew(t));
      for(const k in boxes){ const B = boxes[k]; const hit = all.filter(m => (m.kind === 'amr' || m.kind === 'bot' || m.kind === 'humanoid') && m.a > B[0] - 50 && m.a < B[1] + 50 && m.b > B[2] - 40 && m.b < B[3] + 40).map(m => (m.build || m.kind)[0] + (m.build || m.kind).slice(-3)); res[k].push(hit.length ? [...new Set(hit)].join('') : ''); } }
    // quiet windows (mod PALT over 3 cycles): list runs of '' longer than 6000
    const out = {}; for(const k in res){ const a = res[k]; const runs = []; let s = -1; for(let i = 0; i <= a.length; i++){ const q = i < a.length && a[i] === ''; if(q && s < 0) s = i; if(!q && s >= 0){ if((i - s)*250 >= 3000) runs.push([s*250, (i - s)*250]); s = -1; } } out[k] = runs; }
    return out; }, BX);
  console.log(JSON.stringify(r, null, 0)); await b.close(); })();
