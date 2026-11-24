// Steps the hall's crew function directly (LIB.collect) and reports pose / piece jumps for the line's workers.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  p.on('pageerror', e => console.log('ERR', String(e).slice(0, 300)));
  await p.route(/phaser(\.min)?\.js/, r => r.fulfill({ path: '/home/user/Tipsy/tipsey-delivery/public/phaser.min.js', contentType: 'application/javascript' }));
  await p.goto('file:///home/user/Tipsy/game/index.html');
  await p.waitForFunction(() => window.game && game.scene.getScene('world') && game.scene.getScene('world').route, null, { timeout: 90000 });
  const res = await p.evaluate(([T0, T1, DT, ONLY]) => {
    const items = LIB.collect('Kickstand Scooter Co. Hall Interior', (a, b, h) => ({ x: a - b, y: (a + b)/2 - h }), 1);
    const crew = items.filter(it => it.fx && it.fx.crew);
    const out = []; let prevM = null, prevP = null;
    const near = (L, m, r) => { let best = null, bd = r; for(const q of L){ const d = Math.hypot(q.a - m.a, q.b - m.b); if(d < bd){ bd = d; best = q; } } return best; };
    for(let t = T0; t < T1; t += DT){
      let all = []; for(const it of crew) all = all.concat(it.fx.crew(t));
      const men = all.filter(m => m.kind === 'humanoid' && !m.noLegs && m.a > 700 && m.a < 2300 && m.b > 600 && m.b < 1400);
      const pcs = all.filter(m => m.kind === 'scooter' && typeof m.stage === 'string' && m.stage[0] === 'p').map(m => { const O = { p2: [26, 7], p3: [0, 12], p4: [25, 50], p5: [24.4, 83.5], p6: [24.4, 83.5], p6s: [24.4, 83.5], p7: [26.4, 73.5], p7t: [-35.3, 10.9] }[m.stage] || [0, 0], g = m.th + Math.PI/2; return { stage: m.stage, a: m.a + Math.cos(g)*O[0], b: m.b + Math.sin(g)*O[0], z: (m.z || 0) + O[1] }; });
      if(prevM){ for(const m of men){ const q = near(prevM, m, 30); if(!q) continue; const df = Math.abs(((m.fdir - q.fdir) % 4 + 6) % 4 - 2);
          const dl = Math.max(...[0, 1].map(i => Math.abs(((m.lift||[0,0])[i]) - ((q.lift||[0,0])[i])))), dbd = Math.max(...[0, 1].map(i => Math.abs(((m.bend||[0,0])[i]) - ((q.bend||[0,0])[i])))), dw = Math.abs((m.waist||0) - (q.waist||0)), dd = Math.abs((m.drop||0) - (q.drop||0));
          const dp = Math.hypot(m.a - q.a, m.b - q.b);
          if(df > 0.12 || dl > 0.2 || dbd > 0.3 || dw > 0.12 || dp > 4 || dd > 4) out.push(['MAN', t, Math.round(m.a), Math.round(m.b), +df.toFixed(2), +dl.toFixed(2), +dbd.toFixed(2), +dw.toFixed(2), +dp.toFixed(1), +dd.toFixed(1)]); } }
      if(prevP){ for(const m of pcs){ const q = prevP.filter(x => x.stage === m.stage); let best = null, bd = 1e9; for(const x of q){ const d = Math.hypot(x.a - m.a, x.b - m.b, x.z - m.z); if(d < bd){ bd = d; best = x; } }
          if(bd > 5 && bd < 1e9) out.push(['PCE', t, m.stage, Math.round(m.a), Math.round(m.b), Math.round(m.z), +bd.toFixed(1)]); if(!best) out.push(['NEW', t, m.stage, Math.round(m.a), Math.round(m.b)]); } }
      prevM = men; prevP = pcs; }
    return out; }, [+process.argv[2] || 900000, +process.argv[3] || 918000, +process.argv[4] || 20]);
  for(const r of res) console.log(JSON.stringify(r));
  console.log('n', res.length);
  await b.close();
})();
