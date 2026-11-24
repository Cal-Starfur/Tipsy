// track station 0's loader over a pallet cycle: jumps in place/facing/pose
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); p.on('pageerror', e => console.log('ERR', String(e).slice(0, 300)));
  await p.route(/phaser(\.min)?\.js/, r => r.fulfill({ path: '/home/user/Tipsy/tipsey-delivery/public/phaser.min.js', contentType: 'application/javascript' }));
  await p.goto('file:///home/user/Tipsy/game/index.html');
  await p.waitForFunction(() => window.game && game.scene.getScene('world') && game.scene.getScene('world').route, null, { timeout: 90000 });
  const r = await p.evaluate(([T0, T1]) => { const items = LIB.collect('Kickstand Scooter Co. Hall Interior', (a, b, h) => ({ x: a - b, y: (a + b)/2 - h }), 1).filter(it => it.fx && it.fx.crew);
    let prev = [1990, 760], pq = null; const out = []; let maxv = 0;
    for(let t = T0; t < T1; t += 20){ let all = []; for(const it of items) all = all.concat(it.fx.crew(t));
      const men = all.filter(m => m.kind === 'humanoid' && !m.noLegs); let best = null, bd = 1e9; for(const m of men){ const d = Math.hypot(m.a - prev[0], m.b - prev[1]); if(d < bd){ bd = d; best = m; } }
      if(!best) continue; const m = best;
      if(pq){ const df = Math.abs(((m.fdir - pq.fdir) % 4 + 6) % 4 - 2), dl = Math.max(...[0, 1].map(i => Math.abs((m.lift||[0,0])[i] - (pq.lift||[0,0])[i]))), dbd = Math.max(...[0, 1].map(i => Math.abs((m.bend||[0,0])[i] - (pq.bend||[0,0])[i]))), dw = Math.abs((m.waist||0) - (pq.waist||0));
        maxv = Math.max(maxv, bd);
        if(bd > 4 || df > 0.17 || dl > 0.2 || dbd > 0.3 || dw > 0.12) out.push([t, Math.round(m.a), Math.round(m.b), +bd.toFixed(1), +df.toFixed(2), +dl.toFixed(2), +dbd.toFixed(2), +dw.toFixed(2)]); }
      prev = [m.a, m.b]; pq = m; }
    return { out, maxv }; }, [+process.argv[2], +process.argv[3]]);
  for(const x of r.out) console.log(JSON.stringify(x)); console.log('max step', r.maxv.toFixed(2), 'n', r.out.length);
  await b.close(); })();
