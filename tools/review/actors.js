/* THE ACTOR CENSUS: every person and every vehicle the game draws, grouped by the system that drew
   them, and measured against each other.

   Hooks (on the scene's class, so nothing the game swaps in per frame can drop them):
     people    drawPersonHullBody   every person funnels here (street, mall, hospital cast, riders' bodies...)
     vehicles  drawCar / drawVan / drawRig / drawWorkTruck / drawJet / drawAircraft / drawPlane / drawHeli /
               drawScooterRider / trafficSprite (the outermost call only)
   Each draw is tagged with its SYSTEM: the line of the world-queue item that drew it (the same tag the world
   census uses) plus the drawing functions between, e.g. "81026 queuePerson > drawCakePerson".
   Draws painted into the building cache (bcPaint) are still pictures: counted, not tracked.

   Per frame the draws are matched into tracks (same system, nearest). Per track:
     size      people: drawn height (feet to crown); vehicles: footprint length x width
     speed     world units per ms while moving
     stride    people: distance per step (walkPhase zero crossings) -- legs vs ground
     heading   snaps (a turn of more than 1 rad in one frame)
     alpha     the lowest it was drawn at (a fade < 1)
     life      how it began and ended: at the screen edge, or out in the open (a pop)
     listed    in CITY_PEOPLE (people) / the traffic list (vehicles)
   Usage: node tools/review/actors.js [--spots a,b] [--secs 40] [--out dir] */
const H = require('./harness.js'), fs = require('fs'), path = require('path');

function install(){
  const s = game.scene.getScene('world'), proto = Object.getPrototypeOf(s);
  if(window.__ACT && window.__ACT.off) window.__ACT.off();
  const R = window.__ACT = { draws: [], tracks: [], done: [], next: 1, frame: 0, alpha: 1, paint: 0, cur: null, vdepth: 0, cached: { person: 0, vehicle: 0 }, listed: [] };
  const o = {};
  const siteOf = () => {
    const st = new Error().stack.split('\n').slice(2);
    const ln = l => { const m = l.match(/index\.html:(\d+):\d+/); return m ? +m[1] : 0; };
    const nm = l => { const m = l.match(/at (?:new )?(?:WorldScene\.|Object\.)?([\w$<>]+) /); return m ? m[1] : '?'; };
    const k = st.findIndex(l => /drawWorldIn|blockVQ|drawWorld /.test(l));
    const fr = k > 0 ? st.slice(0, k) : st.slice(0, 8);
    const item = fr.length ? ln(fr[fr.length - 1]) : 0;
    const via = fr.slice(1, -1).map(nm).filter(n => !/^(drawPersonHullBody|drawPersonHull|xrayMirror|withAlpha|apply|call|fn|\?|<anonymous>|inRoomCoords|layerFor|propLayer|drawProp)$/.test(n));
    return item + (via.length ? ' ' + [...new Set(via.reverse())].slice(-3).join('>') : '');
  };
  /* the drawn points of the call (height, footprint) */
  o.W = proto.W;
  proto.W = function(x, y, z){
    const c = R.cur;
    if(c && isFinite(x)){ z = z || 0; if(z > c.z1) c.z1 = z; if(x < c.x0) c.x0 = x; if(x > c.x1) c.x1 = x; if(y < c.y0) c.y0 = y; if(y > c.y1) c.y1 = y; }
    return o.W.call(this, x, y, z);
  };
  o.wa = proto.withAlpha;
  proto.withAlpha = function(g, k, fn){ const a = R.alpha; R.alpha = a*k; try { return o.wa.call(this, g, k, fn); } finally { R.alpha = a; } };
  o.paint = proto.bcPaint;
  proto.bcPaint = function(){ R.paint++; try { return o.paint.apply(this, arguments); } finally { R.paint--; } };
  o.body = proto.drawPersonHullBody;
  proto.drawPersonHullBody = function(g, ax, ay, z, thW, build, sk, sh, pa, ha, so, walkPhase, moving, st, lt, ob, uniform, both, pose){
    if(R.paint){ R.cached.person++; return o.body.apply(this, arguments); }
    if(R.vdepth){ return o.body.apply(this, arguments); }          // a driver or rider: counted with the vehicle
    const rec = { cls: 'person', site: siteOf(), x: ax, y: ay, z: z || 0, th: thW, w: walkPhase || 0, mv: !!moving, a: R.alpha,
                  xr: !!(this._xrayCap || this._xrayInProp), pose: pose && (pose.sit != null || pose.pitch || pose.roll || pose.lie) ? 'posed' : (uniform && uniform.aid ? 'aid' : ''),
                  z1: -Infinity, x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity, look: [sk && sk.c, sh && sh.c, pa && pa.c, ha].join('/') };
    const p = R.cur; R.cur = rec;
    try { return o.body.apply(this, arguments); } finally { R.cur = p; R.draws.push(rec); }
  };
  const VN = ['drawCar', 'drawVan', 'drawRig', 'drawWorkTruck', 'drawJet', 'drawAircraft', 'drawPlane', 'drawHeli', 'drawScooterRider', 'trafficSprite'];
  for(const n of VN){
    const f = proto[n]; if(typeof f !== 'function') continue;
    o[n] = f;
    proto[n] = function(...A){
      if(R.paint){ if(!R.vdepth) R.cached.vehicle++; R.vdepth++; try { return f.apply(this, A); } finally { R.vdepth--; } }
      if(R.vdepth){ R.vdepth++; try { return f.apply(this, A); } finally { R.vdepth--; } }
      const isS = n === 'trafficSprite', isR = n === 'drawScooterRider';
      const kind = isS ? A[0] : isR ? 'scooter' : A[1];
      const x = isS ? A[1] : isR ? A[1] : A[2], y = isS ? A[2] : isR ? A[2] : A[3];
      const rec = { cls: 'vehicle', fn: n, kind: String(kind), site: siteOf(), x, y, a: R.alpha, xr: !!(this._xrayCap || this._xrayInProp),
                    z1: -Infinity, x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity, fdir: isS ? A[4] : A[6] };
      const p = R.cur; R.cur = rec; R.vdepth++;
      let res;
      try { res = f.apply(this, A); } finally { R.vdepth--; R.cur = p; }
      if(isS && !res) return res;                                   // not drawn as a sprite: the live draw that follows records it
      if(isFinite(x)) R.draws.push(rec);
      return res;
    };
  }
  const vw = () => s.vpW(), vh = () => s.vpH();
  const scr = (x, y, z) => { const q = o.W.call(s, x, y, z || 0); return q; };
  const inner = q => q.x > 70 && q.x < vw() - 70 && q.y > 90 && q.y < vh() - 50;
  const onFrame = () => {
    const t = s.time.now; R.frame++;
    const D = R.draws.filter(d => !d.xr); R.draws = [];
    /* the registry, every 6th frame */
    if(R.frame % 6 === 0){ const L = []; try { CITY_PEOPLE.each(s, t, p => { if(!p.hidden) L.push([p.x, p.y]); }); } catch(e){} R.listed = L; }
    const used = new Set();
    for(const tr of R.tracks){
      let best = null, bd = tr.cls === 'person' ? 45 : 140;
      for(let i = 0; i < D.length; i++){
        if(used.has(i)) continue; const d = D[i];
        if(d.cls !== tr.cls || (tr.cls === 'person' ? d.site !== tr.site : d.kind !== tr.kind)) continue;   // (a car is drawn from more than one line: sprite, live, parked)
        const dd = Math.abs(d.x - tr.x) + Math.abs(d.y - tr.y);
        if(dd < bd){ bd = dd; best = i; }
      }
      if(best === null){ tr.miss++; continue; }
      used.add(best); const d = D[best];
      const step = Math.hypot(d.x - tr.x, d.y - tr.y), dt = t - tr.t;
      if(step > 0.05 && dt > 0){ tr.dist += step; tr.mvT += dt; }
      if(tr.cls === 'person'){
        if(d.mv && tr.w !== null && Math.sign(d.w) !== Math.sign(tr.w) && d.w !== 0 && tr.w !== 0) tr.cross++;
        let dth = Math.abs(d.th - tr.th); if(dth > Math.PI) dth = 2*Math.PI - dth;
        if(dth > 1) tr.snaps++;
        if(d.mv && step < 0.02) tr.legsNoMove++;
        if(!d.mv && step > 0.4) tr.moveNoLegs++;
        if(isFinite(d.z1) && !d.pose) tr.hs.push(d.z1 - d.z);
        if(d.pose) tr.posed++;
        if(R.frame % 6 === 0 && !tr.listedSeen){ for(const [lx, ly] of R.listed) if(Math.abs(lx - d.x) + Math.abs(ly - d.y) < 40){ tr.listedSeen = true; break; } }
      } else {
        if(isFinite(d.x1)) tr.fp.push([Math.round(d.x1 - d.x0), Math.round(d.y1 - d.y0), Math.round(d.z1)]);
        if(d.fn === 'trafficSprite') tr.sprite++; else tr.liveDraw++;
        if(step < 0.05) tr.stillLive += d.fn === 'trafficSprite' ? 0 : 1;
      }
      tr.x = d.x; tr.y = d.y; tr.th = d.th; tr.w = d.w; tr.t = t; tr.n++; tr.miss = 0;
      tr.amin = Math.min(tr.amin, d.a); tr.last = { x: d.x, y: d.y, q: scr(d.x, d.y, d.z) };
    }
    /* ended: gone for 3 frames */
    for(const tr of R.tracks.filter(tr => tr.miss >= 3)){
      tr.endInner = inner(tr.last.q); tr.endAt = [Math.round(tr.last.x), Math.round(tr.last.y)];
      R.done.push(tr);
    }
    R.tracks = R.tracks.filter(tr => tr.miss < 3);
    for(let i = 0; i < D.length; i++){
      if(used.has(i)) continue; const d = D[i], q = scr(d.x, d.y, d.z);
      R.tracks.push({ id: R.next++, cls: d.cls, site: d.site, kind: d.kind || null, x: d.x, y: d.y, th: d.th, w: d.w ?? null, t, t0: t, n: 1, miss: 0,
        dist: 0, mvT: 0, cross: 0, snaps: 0, legsNoMove: 0, moveNoLegs: 0, hs: [], posed: 0, fp: [], sprite: 0, liveDraw: 0, stillLive: 0,
        amin: d.a, listedSeen: false, startInner: R.frame > 30 && inner(q), startAt: [Math.round(d.x), Math.round(d.y)], last: { x: d.x, y: d.y, q } });
    }
  };
  game.events.on('postrender', onFrame);
  R.off = () => { game.events.off('postrender', onFrame); for(const k of Object.keys(o)) proto[k] = o[k]; };
  return true;
}

function collect(){
  const R = window.__ACT;
  const all = R.done.concat(R.tracks.map(tr => Object.assign(tr, { endInner: null, open: true })));
  const med = a => { const s = a.filter(isFinite).sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1)/2)] : null; };
  const out = all.filter(tr => tr.n >= 8).map(tr => ({
    cls: tr.cls, site: tr.site, kind: tr.kind, n: tr.n, secs: +((tr.t - tr.t0)/1000).toFixed(1),
    speed: tr.mvT > 400 ? +(tr.dist/tr.mvT).toFixed(4) : null,
    stride: tr.cls === 'person' && tr.cross >= 4 && tr.dist > 60 ? Math.round(tr.dist/tr.cross) : null,
    h: tr.cls === 'person' ? (med(tr.hs) != null ? Math.round(med(tr.hs)) : null) : null,
    fp: tr.cls === 'vehicle' && tr.fp.length ? (() => { const L = tr.fp.map(f => Math.max(f[0], f[1])), Wd = tr.fp.map(f => Math.min(f[0], f[1])); return [Math.round(med(L)), Math.round(med(Wd)), Math.round(med(tr.fp.map(f => f[2])))]; })() : null,
    snaps: tr.snaps, legsNoMove: tr.legsNoMove, moveNoLegs: tr.moveNoLegs, posed: tr.posed,
    amin: +tr.amin.toFixed(2), listed: tr.listedSeen, sprite: tr.sprite, liveDraw: tr.liveDraw, stillLive: tr.stillLive,
    startInner: tr.startInner, endInner: tr.endInner, startAt: tr.startAt, endAt: tr.endAt || null
  }));
  return { tracks: out, cached: R.cached, frames: R.frame };
}

const SPOTS = [
  ['spawn', null], ['shops', [9179, 2493]], ['hosp-front', [18500, 5800]], ['hosp-er', [21500, 5700]],
  ['mall', [12600, -560]], ['garage', [7800, -560]], ['beach', [3000, 22000]], ['harbor', [-3000, -9000]],
  ['strand', `(() => { const g = game.scene.getScene('world').route.grid, h = nssHomeDoorsOf(g); return h.length ? { x: h[h.length >> 1].x + 520, y: h[h.length >> 1].y } : null; })()`],
  ['park', [4700, 10900]], ['cove', [800, 27000]], ['east', [24000, 14000]]
];

async function run(G, spots, secs, log){
  const res = {};
  for(const [name, at] of spots){
    try {
      await G.boot();
      await H.standAt(G.page, at, Math.PI, 2);
      await G.page.evaluate(install);
      await G.page.waitForTimeout(secs*1000);
      res[name] = await G.page.evaluate(collect);
      log(`${name}: ${res[name].tracks.length} tracks, ${res[name].frames} frames`);
    } catch(e){ log(`${name}: ${String(e).slice(0, 200)}`); res[name] = { err: String(e).slice(0, 300) }; }
  }
  return res;
}

/* the judge: tracks grouped by system (people) or system + kind (vehicles), each against the norm.
   The norm is what most of them do, weighted by how many there are, held to the game's approved values
   where it has one (PEOPLE_WALK_V 0.065; a stride of about 68, legs matching the ground) */
function judge(res){
  const med = a => { const s = a.filter(v => v != null && isFinite(v)).sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1)/2)] : null; };
  const sys = new Map();
  for(const [spot, r] of Object.entries(res)){
    if(!r || !r.tracks) continue;
    for(const t of r.tracks){
      const k = t.cls === 'person' ? 'person|' + t.site : 'vehicle|' + t.site + '|' + t.kind;
      if(!sys.has(k)) sys.set(k, { cls: t.cls, site: t.site, kind: t.kind, spots: new Set(), T: [] });
      const e = sys.get(k); e.spots.add(spot); e.T.push(t);
    }
  }
  const rows = [];
  for(const [k, e] of sys){
    const T = e.T, mv = T.filter(t => t.speed != null);
    rows.push({ key: k, cls: e.cls, site: e.site, kind: e.kind, spots: [...e.spots], n: T.length,
      speed: med(mv.map(t => t.speed)), stride: med(T.map(t => t.stride)), h: med(T.map(t => t.h)), fp: e.cls === 'vehicle' ? (() => { const f = T.filter(t => t.fp).map(t => t.fp); return f.length ? [med(f.map(x => x[0])), med(f.map(x => x[1])), med(f.map(x => x[2]))] : null; })() : null,
      fades: T.filter(t => t.amin < 0.98).length, pops: T.filter(t => t.startInner).length + T.filter(t => t.endInner).length,
      popAt: T.filter(t => t.startInner || t.endInner).slice(0, 3).map(t => t.startInner ? 'in@' + t.startAt : 'out@' + t.endAt),
      snaps: T.reduce((a, t) => a + t.snaps, 0), listed: T.filter(t => t.listed).length,
      legsNoMove: T.reduce((a, t) => a + (t.legsNoMove || 0), 0), moveNoLegs: T.reduce((a, t) => a + (t.moveNoLegs || 0), 0),
      stillLive: T.reduce((a, t) => a + (t.stillLive || 0), 0), sprite: T.reduce((a, t) => a + (t.sprite || 0), 0), live: T.reduce((a, t) => a + (t.liveDraw || 0), 0) });
  }
  const P = rows.filter(r => r.cls === 'person'), V = rows.filter(r => r.cls === 'vehicle');
  const wmed = (L, f) => { const a = []; for(const r of L){ const v = f(r); if(v != null) for(let i = 0; i < Math.min(r.n, 50); i++) a.push(v); } return med(a); };
  const norm = {
    person: { speed: 0.065, speedSeen: wmed(P, r => r.speed), stride: wmed(P, r => r.stride), h: wmed(P, r => r.h) },
    vehicle: { speedSeen: wmed(V, r => r.speed) }
  };
  const F = [];
  for(const r of P){
    const tag = `person system ${r.site}`;
    if(r.fades) F.push({ kit: 'people', rule: 'P2 fade', sys: r.site, n: r.fades, note: `${r.fades} of ${r.n} drawn see-through at some point (nobody fades: walk in or out of shot, or through a door)` });
    /* (drawn in a shop's doorway, between its lit room and its open leaf: they only exist on that path while passing
       through an open door, which is the legal way in and out -- doors.md D1) */
    if(r.pops && /drawDoorOpen|shopDoorOpen/.test(r.site)) r.pops = 0;
    if(r.pops) F.push({ kit: 'people', rule: 'P1 pop', sys: r.site, n: r.pops, note: `${r.pops} starts or ends out in the open (${r.popAt.join(', ')}) -- check against the doors before calling it a pop` });
    if(r.speed != null && (r.speed > norm.person.speed*1.5 || r.speed < norm.person.speed*0.5)) F.push({ kit: 'people', rule: 'P6 pace', sys: r.site, n: r.n, note: `walks ${r.speed} units/ms; the street walks ${norm.person.speed} (PEOPLE_WALK_V)` });
    if(r.stride != null && norm.person.stride && (r.stride > norm.person.stride*1.6 || r.stride < norm.person.stride*0.6)) F.push({ kit: 'people', rule: 'P11 stride', sys: r.site, n: r.n, note: `${r.stride} per step against the norm's ${norm.person.stride}: the legs ${r.stride > norm.person.stride ? 'skate' : 'paddle'}` });
    if(r.h != null && norm.person.h && (r.h > norm.person.h*1.15 || r.h < norm.person.h*0.6)) F.push({ kit: 'people', rule: 'P3 size', sys: r.site, n: r.n, note: `drawn ${r.h} tall (norm ${norm.person.h})` });
    if(r.snaps > r.n) F.push({ kit: 'people', rule: 'P12 heading', sys: r.site, n: r.snaps, note: `${r.snaps} heading snaps (over 1 rad in one frame) across ${r.n} people` });
    if(r.n >= 3 && r.listed === 0) F.push({ kit: 'people', rule: 'P5 unlisted', sys: r.site, n: r.n, note: `none of the ${r.n} is in CITY_PEOPLE: doors, knockdowns, avoidance and the crowd can't see them` });
    if(r.moveNoLegs > 20) F.push({ kit: 'people', rule: 'P10 glide', sys: r.site, n: r.moveNoLegs, note: `moving with the legs still (${r.moveNoLegs} frames)` });
  }
  for(const r of V){
    if(r.fades) F.push({ kit: 'vehicles', rule: 'V2 fade', sys: r.site + ' ' + r.kind, n: r.fades, note: `${r.fades} of ${r.n} drawn see-through` });
    /* (a kerb-parked car, cached: it leaves by becoming a traffic car -- kerbDepart -- and arrives the same way back,
       so its picture ending or starting is a hand-over, not a pop; the moving car is tracked by its own system) */
    if(r.pops && /drawKerbStoneOver|pcar|bcDraw/.test(r.site)) r.pops = 0;
    if(r.pops) F.push({ kit: 'vehicles', rule: 'V1 pop', sys: r.site + ' ' + r.kind, n: r.pops, note: `${r.pops} starts or ends out in the open (${r.popAt.join(', ')})` });
    if(r.stillLive > 120) F.push({ kit: 'vehicles', rule: 'V9 still drawn live', sys: r.site + ' ' + r.kind, n: r.stillLive, note: `${r.stillLive} frames drawn live while standing still (still things go through the cache)` });
  }
  return { systems: rows, norm, findings: F };
}

module.exports = { install, collect, run, judge, SPOTS };

if(require.main === module){
  const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
  const out = arg('--out', path.join(H.ROOT, '.review', 'actors')), secs = +arg('--secs', 40), sel = arg('--spots', null);
  (async () => {
    fs.mkdirSync(out, { recursive: true });
    const G = await H.open();
    const spots = SPOTS.filter(([n]) => !sel || sel.split(',').includes(n));
    const r = await run(G, spots, secs, m => console.log(m));
    fs.writeFileSync(path.join(out, 'actors.json'), JSON.stringify(r));
    const J = judge(r); fs.writeFileSync(path.join(out, 'actors_judged.json'), JSON.stringify(J, null, 1));
    console.log('norm', JSON.stringify(J.norm)); for(const f of J.findings) console.log(f.kit, f.rule, f.sys, '|', f.note);
    console.log('page errors', G.errs.length); for(const e of G.errs.slice(0, 5)) console.log('  ', e);
    await G.close();
  })();
}
