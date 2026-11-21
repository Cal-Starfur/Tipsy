/* CREW SPACING -- are any two robots on top of one another? (Sir, 2026-11-20: "all the robots should know not to be on top of one
   another"). Boots the game headless, takes Tipsey into Cratewell Works' hall with the whole floor in view, steps the hall's clock
   through whole cycles and, every step, reads every room robot drawn (CREW_TAP, filled by the room-crew loop), builds each one's
   footprint on the floor (a rotated box from its build; a pallet jack's load out ahead of it; a tugger's carts behind it) and
   reports every pair whose footprints overlap: when, where, which two, how deep. Humanoids are left out (they walk round the
   robots and stand at them to work).

   node tools/review/crew_spacing.js [--secs 270] [--step 250] [--margin 4]
   Exit code 1 if any overlap is found. */
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
let chromium; try { ({ chromium } = require('playwright')); } catch(e){ ({ chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright')); }
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? +process.argv[i + 1] : d; };
const SECS = arg('secs', 270), STEP = arg('step', 250), MARGIN = arg('margin', 4);

/* footprint half-sizes along / across the robot, and an offset along it (a jack's pallet ahead, a tugger's carts behind) */
const FOOT = m => {
  if(m.kind === 'amr'){
    if(m.build === 'amrtug') return [{ hx: 158, hy: 26, ox: -112 }];                 /* (the tugger and its two carts behind it) */
    if(m.build === 'amrjack') return m.jack ? [{ hx: 55, hy: 38, ox: 0 }, { hx: 50, hy: 33, ox: 106 }] : [{ hx: 55, hy: 38, ox: 0 }];
    if(m.build === 'amrshelf') return [{ hx: 55, hy: 38, ox: 0 }];
    return [{ hx: 55, hy: 38, ox: 0 }];
  }
  if(m.kind === 'bot'){
    if(m.build === 'cargobot') return [{ hx: 50, hy: 36, ox: 0 }];
    if(m.build === 'pdog') return [{ hx: 22, hy: 10, ox: 0 }];
    return [{ hx: 22, hy: 22, ox: 0 }];
  }
  return [];
};
const corners = (m, f) => { const c = Math.cos(m.fdir*Math.PI/2), s = Math.sin(m.fdir*Math.PI/2), hx = f.hx - MARGIN, hy = f.hy - MARGIN, x0 = m.a + c*f.ox, y0 = m.b + s*f.ox;
  return [[-hx, -hy], [hx, -hy], [hx, hy], [-hx, hy]].map(([x, y]) => [x0 + c*x - s*y, y0 + s*x + c*y]); };
/* separating axis: overlap depth (0 if apart) */
const overlap = (P, Q) => { let best = Infinity;
  for(const poly of [P, Q]) for(let i = 0; i < 4; i++){ const [x0, y0] = poly[i], [x1, y1] = poly[(i + 1) % 4], nx = y0 - y1, ny = x1 - x0, L = Math.hypot(nx, ny) || 1;
    const pr = R => R.map(([x, y]) => (x*nx + y*ny)/L), a = pr(P), b = pr(Q), o = Math.min(Math.max(...a), Math.max(...b)) - Math.max(Math.min(...a), Math.min(...b));
    if(o <= 0) return 0; best = Math.min(best, o); }
  return best; };
const nameOf = m => (m.key || m.build || m.kind) + '@' + Math.round(m.a) + ',' + Math.round(m.b);

(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 3600, height: 2300 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.route(/phaser(\.min)?\.js/, r => r.fulfill({ path: ROOT + '/tipsey-delivery/public/phaser.min.js', contentType: 'application/javascript' }));
  await p.goto('file://' + ROOT + '/game/index.html');
  await p.waitForFunction(() => window.game && game.scene.getScene('world') && game.scene.getScene('world').route, null, { timeout: 90000 });
  await p.evaluate(() => { FLEET_TESTING = true; tpProfile.fleetKind = 'amr'; garageClose(); HOOD_LOCK.active = false; });
  await p.waitForTimeout(800);
  await p.evaluate(() => { const s = game.scene.getScene('world'), d = FAC.hall.edoor; owStandUpAt(s, FAC.hall.x1 + 90, (d[0] + d[1])/2, Math.PI); zoomSet(3); });
  await p.waitForTimeout(2500);
  await p.keyboard.down('ArrowUp'); await p.keyboard.down('ArrowLeft'); for(let k = 0; k < 60; k++){ await p.waitForTimeout(100); if(await p.evaluate(() => !!game.scene.getScene('world')._inside)) break; } await p.keyboard.up('ArrowUp'); await p.keyboard.up('ArrowLeft');
  await p.evaluate(() => { const s = game.scene.getScene('world'), pk = s._inside; s.ow.px = pk.x0 + 1160; s.ow.py = pk.y0 + 935; s.botX = s.ow.px; s.botY = s.ow.py; game.loop.sleep(); window._T = game.loop.now; });
  const found = new Map(); let steps = 0, seen = 0;
  for(let ms = 0; ms < SECS*1000; ms += STEP){
    const tap = await p.evaluate(st => { CREW_TAP = []; _T += st; game.step(_T, st); const r = CREW_TAP; CREW_TAP = null; return { t: game.scene.getScene('world').time.now, r }; }, STEP);
    steps++; const R = tap.r.filter(m => m.room && /Cratewell/.test(m.room) && (m.kind === 'amr' || m.kind === 'bot')); seen = Math.max(seen, R.length);
    const F = R.map(m => FOOT(m).map(f => corners(m, f)));
    for(let i = 0; i < R.length; i++) for(let j = i + 1; j < R.length; j++){ let d = 0;
      for(const A of F[i]) for(const B of F[j]) d = Math.max(d, overlap(A, B));
      if(d > 0){ const k = [nameOf(R[i]).replace(/@.*/, ''), nameOf(R[j]).replace(/@.*/, ''), Math.round(R[i].a/40), Math.round(R[i].b/40)].join('|');
        const o = found.get(k); if(!o || d > o.d) found.set(k, { d: Math.round(d), t: Math.round(tap.t), A: nameOf(R[i]), B: nameOf(R[j]), n: (o ? o.n : 0) + 1 }); else o.n++; } }
  }
  const list = [...found.values()].sort((x, y) => y.d - x.d);
  console.log(`crew spacing: ${steps} steps over ${SECS}s, up to ${seen} robots at once; ${list.length} overlapping pair-places`);
  for(const o of list) console.log(`  ${String(o.d).padStart(3)} deep  x${o.n}  t=${o.t}  ${o.A}  <->  ${o.B}`);
  if(errs.length) console.log('page errors:', errs.slice(0, 3).join('\n'));
  await b.close(); process.exit(list.length ? 1 : 0);
})();
