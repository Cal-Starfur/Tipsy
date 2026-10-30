/* KIT 3: DEPTH SORT -- the checker (see docs/kits/depth.md for the contract).

   The truth: the game's own x-ray test (xrayCoverageAt) knows, from the
   buildings' declared heights, how much of Tipsey a building hides from
   the fixed camera -- five rays, 0 (in the open) .. 5 (behind it).
   The picture: the world drawn twice, frozen, with him and without him;
   the pixels that differ are the part of him the sort let you see.

   Tipsey is stood at points round the spot, each judged:
     S1o     in the open (0 rays covered at his head, nor at his body) but under 60% of him shows:
             something is painted over him that is not in front of him
             (or a prop really is in front: the snapshot shows which)
     S1u     behind a building (all 5 covered) but over 50% of him shows:
             he is painted over a building he stands behind
   His x-ray ghost is switched off while measuring (it would show anyway). */

function install(){ return true; }
function collect(){ return null; }

/* the active part: runs in the page after the watch */
async function probe(opts){
  const s = game.scene.getScene('world');
  const N = opts.n || 36, STEP = opts.step || 160, RAD = opts.rad || 1000;
  const raf = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const snap = (x, y, w, h) => new Promise(res => {
    try { game.renderer.snapshotArea(Math.max(0, Math.round(x)), Math.max(0, Math.round(y)), w, h, img => res(img)); } catch(e){ res(null); }
  });
  const pixels = img => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0); return { c, d: g.getImageData(0, 0, c.width, c.height).data }; };
  /* what drawWorld asked the x-ray, so the same blocks and lots can be asked again */
  let cov = null;
  const oCov = s.xrayCoverage;
  s.xrayCoverage = function(blocks, lots){ cov = { blocks, lots }; return oCov.call(this, blocks, lots); };
  const hitsAt = (x, y, zh = XRAY.zhead) => {
    if(!cov) return null;
    let h = 0;
    for(let k = 1; k <= 5; k++){ try { if(s.xrayCoverageAt(x, y, zh, cov.blocks, cov.lots, true, k)) h = k; else break; } catch(e){ return null; } }
    return h;
  };
  const cx0 = s.ow.px, cy0 = s.ow.py, yaw = Math.PI;
  /* the points: pavement round the spot (where he drives), clear of solids and of the traffic (a car in
     front of him really is in front). Half where a building stands on the camera's side of him (+x +y: he
     should be hidden), half with one just behind him (-x -y: he should show over it) */
  const W = s.ow.world, RAD2 = opts.rad || 2400;
  const cars = []; try { for(const tr of s.trafficActive(s.time.now) || []){ const a = trafficWorldAt(tr, s.time.now); if(a && a.wp) cars.push(a.wp); } } catch(e){}
  const hAt = (x, y) => { try { return W.surfaceAt(x, y) === 'building' ? 1 : 0; } catch(e){ return 0; } };   // (a building's ground)
  const front = [], back = [];
  for(let dx = -RAD2; dx <= RAD2; dx += STEP) for(let dy = -RAD2; dy <= RAD2; dy += STEP){
    const x = cx0 + dx, y = cy0 + dy;
    let sf = null; try { sf = W.surfaceAt(x, y); } catch(e){}
    if(sf !== 'sidewalk' && sf !== 'curb') continue;
    let ok = true; try { ok = owSpotClear(s, x, y, 30); } catch(e){}
    if(!ok || cars.some(c => Math.abs(c.x - x) + Math.abs(c.y - y) < 450)) continue;
    let hf = 0, hb = 0;
    for(let d = 60; d <= 420; d += 60){ hf = Math.max(hf, hAt(x + d, y + d)); hb = Math.max(hb, hAt(x - d, y - d)); }
    if(hf > 0) front.push({ x, y, k: Math.hypot(dx, dy) });
    else if(hb > 0) back.push({ x, y, k: Math.hypot(dx, dy) });
  }
  front.sort((a, b) => a.k - b.k); back.sort((a, b) => a.k - b.k);
  /* spread out: no two within 300 */
  const pick = (L, n) => { const out = []; for(const p of L){ if(out.length >= n) break; if(out.every(q => Math.abs(q.x - p.x) + Math.abs(q.y - p.y) > 300)) out.push(p); } return out; };
  let sample = pick(front, Math.ceil(N/2)).concat(pick(back, Math.floor(N/2)));
  /* inside a building (a pocket's floor has no 'building' ground round it): any clear floor near him */
  if(s._inside && sample.length < N){
    const any = [];
    for(let dx = -1400; dx <= 1400; dx += STEP) for(let dy = -1000; dy <= 1000; dy += STEP){
      const x = cx0 + dx, y = cy0 + dy; let ok = false; try { ok = W.surfaceAt(x, y) === 'sidewalk' && owSpotClear(s, x, y, 30); } catch(e){}
      if(ok) any.push({ x, y, k: Math.hypot(dx, dy) });
    }
    any.sort((a, b) => a.k - b.k);
    sample = sample.concat(pick(any, N - sample.length));
  }
  const xr0 = XRAY.max, out = [];
  const wasPaused = game.scene.isPaused('world');
  for(const p of sample){
    if(wasPaused) game.scene.resume('world');
    owStandUpAt(s, p.x, p.y, yaw);
    s.camX = p.x; s.camY = p.y;
    await sleep(900);                                   // (long enough for his x-ray ghost to ease to where it goes)
    const ghost = +(s.xrayA || 0).toFixed(2);
    game.scene.pause('world');
    XRAY.max = 0; s.xrayA = 0;
    const rise0 = XRAY.rise; XRAY.rise = 0;               // (and held there: some places raise it by another road, 0.85 in a garage or lift)
    /* someone standing in front of him (+x +y, close) hides him for real: say so, don't blame the sort */
    let personFront = false, propFront = null;
    /* a street prop (a lamp, a palm, a parked car...) close in front of him hides him for real too */
    try { for(const pr of cityFurnitureNear(s.route.grid, s.botX, s.botY, 500, [], false)){
      if(pr.type === 'people' || pr.type === 'dog') continue;
      const dx = pr.wx - s.botX, dy = pr.wy - s.botY;
      if(dx + dy > 0 && dx + dy < 420 && Math.abs(dx - dy) < 200){ propFront = pr.type; break; } } } catch(e){}
    if(!propFront) try { for(const c of kerbCarsNear(s.route.grid, s.ow.world, s.botX, s.botY)){       // (the cars parked down the kerbs)
      const dx = c.x - s.botX, dy = c.y - s.botY; if(dx + dy > 0 && dx + dy < 420 && Math.abs(dx - dy) < 220){ propFront = 'a parked car'; break; } } } catch(e){}
    if(!propFront) try { for(const tr of s.trafficActive(s.time.now) || []){ const a = trafficWorldAt(tr, s.time.now); if(!a || !a.wp) continue;
      const dx = a.wp.x - s.botX, dy = a.wp.y - s.botY; if(dx + dy > 0 && dx + dy < 420 && Math.abs(dx - dy) < 220){ propFront = 'a car'; break; } } } catch(e){}
    try { CITY_PEOPLE.each(s, s.time.now, e => { if(e.hidden) return; const dx = e.x - s.botX, dy = e.y - s.botY; if(dx + dy > 0 && dx + dy < 260 && Math.abs(dx - dy) < 160) personFront = true; }); } catch(e){}
    const t = (game.loop && game.loop.time) || 0;
    s._frameDt = 0;
    s.drawWorld(t); await raf();
    /* only his own box: the corners of a 90 x 90 footprint, 0..120 up, projected (the x-ray's traces
       round him change too when he is taken out, and are not him) */
    let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
    for(const [ex, ey] of [[-45, -45], [45, -45], [45, 45], [-45, 45]]) for(const ez of [0, 120]){
      const q = s.W(s.botX + ex, s.botY + ey, (s.botZ || 0) + ez); bx0 = Math.min(bx0, q.x); by0 = Math.min(by0, q.y); bx1 = Math.max(bx1, q.x); by1 = Math.max(by1, q.y);
    }
    const x0 = Math.floor(bx0) - 2, y0 = Math.floor(by0) - 2, w = Math.ceil(bx1 - bx0) + 4, h = Math.ceil(by1 - by0) + 4;
    const hits = hitsAt(s.botX, s.botY), low = hitsAt(s.botX, s.botY, 15);   // (low: a low wall or kerb before his body, not his head)
    const A = await snap(x0, y0, w, h);
    s.drawRobot = function(){};
    s.drawWorld(t); await raf();
    const Z = await snap(x0, y0, w, h);
    delete s.drawRobot;
    XRAY.max = xr0; XRAY.rise = rise0;                   // (his ghost back for the next stand's reading)
    game.scene.resume('world');
    if(!A || !Z) continue;
    const pa = pixels(A), pz = pixels(Z);
    let V = 0;
    for(let i = 0; i < pa.d.length; i += 4) if(Math.abs(pa.d[i] - pz.d[i]) + Math.abs(pa.d[i+1] - pz.d[i+1]) + Math.abs(pa.d[i+2] - pz.d[i+2]) > 45) V++;
    out.push({ x: Math.round(p.x), y: Math.round(p.y), hits, low, ghost, personFront, propFront, inside: !!s._inside, V, img: pa.c.toDataURL('image/png') });
  }
  XRAY.max = xr0;
  s.xrayCoverage = oCov; delete s.xrayCoverage;
  /* the reference: how much of him shows in the open -- the median of the open stands (the largest let
     one odd stand set it for all) */
  const open = out.filter(o => o.hits === 0 && !o.low).map(o => o.V).sort((a, b) => a - b);
  const ref = Math.max(1, open.length ? open[open.length >> 1] : 1);
  for(const o of out) o.vis = +(o.V/ref).toFixed(2);
  return { ref, samples: out };
}

function judge(r, all){
  const F = [];
  const P = all && all.__probe && all.__probe.depth;
  if(!P) return { findings: [] };
  for(const o of P.samples){
    if(o.hits === 0 && !o.low && !o.personFront && !o.propFront && o.vis < 0.6) F.push({ rule: 'S1o nothing paints over Tipsey in the open', who: 'depth sort', msg: `at world (${o.x}, ${o.y}) no building covers him, but only ${Math.round(o.vis*100)}% of him shows (a lamp, tree or parked car really in front is fine: see the picture)`, img: o.img });
    if(o.hits === 5 && o.vis > 0.5) F.push({ rule: 'S1u Tipsey never paints over what he stands behind', who: 'depth sort', msg: `at world (${o.x}, ${o.y}) a building covers him, but ${Math.round(o.vis*100)}% of him shows over it`, img: o.img });
  }
  /* inside a building the low walls hide him for real and the x-ray reads the street: notes, not photos */
  for(const f of F) if(f.img && P.samples.some(o => o.inside && f.msg.includes(`(${o.x}, ${o.y})`))){ f.note = true; f.msg += ' (inside: the low walls may hide him for real)'; }
  /* KIT 10's X1: his ghost shows when (and only when) he is hidden */
  for(const o of P.samples){
    if(o.inside) continue;                                  // (inside, the building round him is the room: no ghost by design)
    if(o.hits === 5 && o.ghost < 0.1) F.push({ rule: 'X1 the x-ray shows him when hidden', who: 'x-ray', msg: `at world (${o.x}, ${o.y}) a building covers him (5 of 5) but his ghost is at ${o.ghost}`, img: o.img });
    if(o.hits === 0 && !o.low && o.ghost > 0.15) F.push({ rule: 'X1 no x-ray in the open', who: 'x-ray', msg: `at world (${o.x}, ${o.y}) nothing covers him but his ghost is at ${o.ghost}`, img: o.img });
  }
  const n = P.samples.length, h = [0,0,0,0,0,0]; for(const o of P.samples) if(o.hits != null) h[o.hits]++;
  F.push({ rule: 'info', who: '-', info: true, msg: `${n} stands measured (rays covered 0..5: ${h.join('/')}), reference ${P.ref} px` });
  return { findings: F };
}

module.exports = { name: 'depth', install, collect, judge, probe };
