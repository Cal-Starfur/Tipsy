/* KIT 6: VEHICLES -- the checker (see docs/kits/vehicles.md).

   Watches every LIVE vehicle draw (drawCar, drawVan, drawRig, drawWorkTruck,
   drawJet, drawAircraft, drawPlane, drawHeli). Parked and cached vehicles
   (bcDraw) are still pictures and are left out. Reports, as the people kit:
     V1 a vehicle appears or vanishes on screen, out in the open
        (it should drive in or out of shot, or into a garage that hides it)
     V2 a vehicle is drawn see-through (withAlpha < 1) -- a fade */

function install(){
  const s = game.scene.getScene('world');
  if(window.__RVV && window.__RVV.off) window.__RVV.off();
  const R = window.__RVV = { ev: [], tracks: [], nextId: 1, alpha: 1, inBc: 0, frame: 0, draws: [], lastT: null, shots: 0 };
  const names = ['drawCar', 'drawVan', 'drawRig', 'drawWorkTruck', 'drawJet', 'drawAircraft', 'drawPlane', 'drawHeli'];
  const o = { wa: s.withAlpha, bc: s.bcDraw };
  for(const n of names) if(typeof s[n] === 'function'){
    const f = s[n];
    o[n] = f;
    s[n] = function(g, kind, x, y, z){ if(!R.inBc && isFinite(x)) R.draws.push({ kind, x, y, z: z || 0, a: R.alpha, xr: !!(s._xrayInProp || s._xrayCap) }); return f.apply(this, arguments); };
  }
  /* withAlpha may already be wrapped by the people kit: wrap what is there */
  const wa0 = s.withAlpha;
  s.withAlpha = function(g, k, fn){ const a = R.alpha; R.alpha = a*k; try { return wa0.call(this, g, k, fn); } finally { R.alpha = a; } };
  const bc0 = s.bcDraw;
  s.bcDraw = function(){ R.inBc++; try { return bc0.apply(this, arguments); } finally { R.inBc--; } };
  const vw = () => s.vpW(), vh = () => s.vpH();
  const inner = (sx, sy) => sx > 60 && sx < vw() - 60 && sy > 80 && sy < vh() - 40;
  const covered = (x, y) => { try { return !!s.xrayPersonHidden(x, y, 40); } catch(e){ return false; } };
  const snap = ev => {
    if(R.shots >= 12 || !game.renderer.snapshotArea) return;
    R.shots++;
    const w = 260, h = 220, x = Math.max(0, Math.min(vw() - w, Math.round(ev.sx - w/2))), y = Math.max(0, Math.min(vh() - h, Math.round(ev.sy - h/2)));
    try { game.renderer.snapshotArea(x, y, w, h, img => { try { const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0); ev.img = c.toDataURL('image/png'); } catch(e){} }); } catch(e){}
  };
  /* the traffic's own list: a car the traffic still has (not hidden), there last frame as well, did not
     pop -- it only changed how it is drawn (parked at a kerb is a cached picture, pulling out is live) */
  let tPrev = new Map(), tNow = new Map();
  const traffic = t => {
    tPrev = tNow; tNow = new Map();
    try { for(const tr of s.trafficActive(t) || []){ const a = trafficWorldAt(tr, t); if(a && a.wp && !a.hidden) tNow.set(tr, a.wp); } } catch(e){}
  };
  const stillThere = (x, y) => {
    for(const [tr, p] of tNow) if(Math.abs(p.x - x) + Math.abs(p.y - y) < 160 && tPrev.has(tr)) return true;
    return false;
  };
  const onFrame = () => {
    const t = s.time.now, dt = R.lastT == null ? 16 : Math.max(1, t - R.lastT);
    traffic(t);
    R.lastT = t; R.frame++;
    const D = R.draws.filter(d => !d.xr); R.draws = [];
    for(const d of D){ const P = s.W(d.x, d.y, d.z + 60); d.sx = P.x; d.sy = P.y; }
    const reach = Math.max(80, 0.7*dt), pairs = [];
    for(let i = 0; i < D.length; i++) for(const tr of R.tracks){ if(tr.kind !== D[i].kind) continue; const d = Math.hypot(D[i].x - tr.x, D[i].y - tr.y); if(d < reach) pairs.push([d, i, tr]); }
    pairs.sort((a, b) => a[0] - b[0]);
    const uD = new Set(), uT = new Set();
    for(const [, i, tr] of pairs){
      if(uD.has(i) || uT.has(tr)) continue;
      uD.add(i); uT.add(tr);
      const q = D[i];
      if(q.a < 0.97 && !tr.faded){ tr.faded = true; const ev = { kind: 'fade', what: q.kind, t, x: q.x, y: q.y, sx: q.sx, sy: q.sy, a: +q.a.toFixed(2), cov: covered(q.x, q.y) }; R.ev.push(ev); if(!ev.cov && inner(q.sx, q.sy)) snap(ev); }
      Object.assign(tr, { x: q.x, y: q.y, sx: q.sx, sy: q.sy, miss: 0, last: t });
    }
    for(const tr of R.tracks) if(!uT.has(tr) && ++tr.miss === 3){
      tr.dead = true;
      if(R.frame > 40 && inner(tr.sx, tr.sy) && !stillThere(tr.x, tr.y)) R.ev.push({ kind: 'vanish', what: tr.kind, t: tr.last, x: tr.x, y: tr.y, sx: tr.sx, sy: tr.sy, cov: covered(tr.x, tr.y) });
    }
    R.tracks = R.tracks.filter(tr => !tr.dead);
    /* V6: no vehicle stands in another -- two live vehicles' middles closer than 90, or a moving one over a car
       parked at the kerb, for 8 frames running (a car's body is 90 wide, 225 long: closer than that they are
       inside each other whichever way they face) */
    R.ov = R.ov || new Map();
    let parked = []; try { parked = kerbCarsNear(s.route.grid, s.ow.world, s.botX, s.botY) || []; } catch(e){}
    const liveV = R.tracks.filter(tr => tr.miss === 0), seen = new Set();
    const hit = (key, x, y, sx, sy, what) => { seen.add(key); const n = (R.ov.get(key) || 0) + 1; R.ov.set(key, n);
      if(n === 8 && inner(sx, sy)){ const ev = { kind: 'overlap', what, t, x, y, sx, sy }; R.ev.push(ev); snap(ev); } };
    for(let i = 0; i < liveV.length; i++){
      const p = liveV[i];
      for(let j = i + 1; j < liveV.length; j++){ const q = liveV[j]; if(Math.hypot(p.x - q.x, p.y - q.y) < 90) hit('v' + Math.min(p.id, q.id) + ':' + Math.max(p.id, q.id), p.x, p.y, p.sx, p.sy, p.kind + ' and ' + q.kind); }
      for(const c of parked) if(Math.hypot(p.x - c.x, p.y - c.y) < 90) hit('k' + c.key + ':' + p.id, p.x, p.y, p.sx, p.sy, p.kind + ' and a parked ' + (c.kind || 'car'));
    }
    for(const k of [...R.ov.keys()]) if(!seen.has(k)) R.ov.delete(k);
    D.forEach((q, i) => {
      if(uD.has(i)) return;
      const tr = { id: R.nextId++, kind: q.kind, x: q.x, y: q.y, sx: q.sx, sy: q.sy, miss: 0, last: t };
      R.tracks.push(tr);
      if(q.a < 0.97){ tr.faded = true; const ev = { kind: 'fade', what: q.kind, t, x: q.x, y: q.y, sx: q.sx, sy: q.sy, a: +q.a.toFixed(2), cov: covered(q.x, q.y) }; R.ev.push(ev); if(!ev.cov && inner(q.sx, q.sy)) snap(ev); }
      if(R.frame > 40 && inner(q.sx, q.sy) && !stillThere(q.x, q.y)){ const ev = { kind: 'appear', what: q.kind, t, x: q.x, y: q.y, sx: q.sx, sy: q.sy, cov: covered(q.x, q.y) }; R.ev.push(ev); if(!ev.cov) snap(ev); }
    });
  };
  game.events.on('postrender', onFrame);
  R.off = () => { game.events.off('postrender', onFrame); for(const n of names) delete s[n]; s.withAlpha = wa0; s.bcDraw = bc0;
                  if(s.withAlpha === Object.getPrototypeOf(s).withAlpha) delete s.withAlpha; if(s.bcDraw === Object.getPrototypeOf(s).bcDraw) delete s.bcDraw; };
  return true;
}

function collect(){
  const R = window.__RVV;
  if(!R) return null;
  return { events: R.ev.map(e => Object.assign(e, { x: Math.round(e.x), y: Math.round(e.y), sx: Math.round(e.sx), sy: Math.round(e.sy) })), frames: R.frame };
}

function judge(r){
  const F = [];
  if(!r) return { findings: [] };
  let cov = 0;
  for(const e of r.events){
    if(e.cov){ cov++; continue; }
    const where = `world (${e.x}, ${e.y}) screen (${e.sx}, ${e.sy})`;
    if(e.kind === 'fade') F.push({ rule: 'V2 no vehicle fades', who: e.what, msg: `drawn at ${Math.round(e.a*100)}% at ${where}`, img: e.img });
    if(e.kind === 'overlap') F.push({ rule: 'V6 no vehicle stands in another', who: e.what, msg: `drawn inside each other for more than a moment at ${where}`, img: e.img });
    if(e.kind === 'appear') F.push({ rule: 'V1 no vehicle pops in', who: e.what, msg: `appeared on screen at ${where}`, img: e.img });
    if(e.kind === 'vanish') F.push({ rule: 'V1 no vehicle pops out', who: e.what, msg: `vanished on screen at ${where}` });
  }
  if(cov) F.push({ rule: 'info', who: '-', info: true, msg: `${cov} vehicle pops/fades behind buildings or into garages (left out)` });
  return { findings: F };
}

module.exports = { name: 'vehicles', install, collect, judge };
