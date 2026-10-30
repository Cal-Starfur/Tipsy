/* KIT 2: DOORS -- the checker (see docs/kits/doors.md for the contract).

   The game has no one list of its doors: each kind keeps its own state and
   decides for itself who may open it. This records every door the game
   evaluates while it runs -- where it is and how open (k, 0 shut .. 1 open)
   -- from each door system:
     house    houseDoorsOpen   (every home door near him, the strand's too)
     shop     shopDoorSwing    (a small shop's swing door)
     slide    shopDoorOpen     (a shop or anchor's sliding doors)
     mall     mallSlideOpen    (the mall's inside slides)
     hosp     HOSP_EDOORS / HOSP_IDOORS / HOSP_MDOORS (Marina General's glass)
   and then judges the people kit's appear / vanish events against them:
     at an OPEN door  -> the legal way in or out (the people judge drops it)
     at a SHUT door   -> D1: came or went through a shut door
   (Next: D2, someone walking through a shut door without popping, needs the
   people tracks' paths.) */

function install(){
  const s = game.scene.getScene('world');
  if(window.__RVD && window.__RVD.off) window.__RVD.off();
  const R = window.__RVD = { doors: new Map(), t: 0 };
  const rec = (key, kind, x, y, k) => {
    const t = s.time.now;
    let d = R.doors.get(key);
    if(!d){ d = { key, kind, x: Math.round(x), y: Math.round(y), S: [] }; R.doors.set(key, d); }
    const L = d.S[d.S.length - 1];
    if(!L || Math.abs(L[1] - k) > 0.04 || t - L[0] > 400) d.S.push([Math.round(t), +k.toFixed(2)]);
    if(d.S.length > 4000) d.S.splice(0, 1000);
  };
  const o = { house: s.houseDoorsOpen, swing: s.shopDoorSwing, slide: s.shopDoorOpen, mall: s.mallSlideOpen };
  /* the house doors: every home door near him, shut or open (houseDoorsOpen only returns the open ones) */
  s.houseDoorsOpen = function(t){
    const out = o.house.apply(this, arguments);
    try {
      const grid = this.route && this.route.grid, open = new Map(out.map(q => [q.d.key, q.k]));
      if(grid && !grid.classic){
        const all = homeDoorsOf(grid).concat(typeof WORLDGEN_COAST !== 'undefined' && WORLDGEN_COAST ? nssHomeDoorsOf(grid) : []);
        for(const d of all){
          if(Math.abs(d.x - this.botX) + Math.abs(d.y - this.botY) > 4000) continue;
          let st = d.e ? edgePt(d.e, d.along, d.bDoor) : null;
          if(!st || !isFinite(st.x)) st = { x: d.x, y: d.y };              // (the strand's doors carry their own point)
          rec('house ' + d.key, 'house', st.x, st.y, open.get(d.key) || 0);
        }
      }
    } catch(e){ R.err = String(e); }
    return out;
  };
  s.shopDoorSwing = function(d, t){ const k = o.swing.apply(this, arguments); try { rec('shop ' + d.key, 'shop', d.x, d.y, k); } catch(e){} return k; };
  s.shopDoorOpen = function(key, x, y){ const u = o.slide.apply(this, arguments); rec('slide ' + key, 'slide', x, y, u); return u; };
  if(o.mall) s.mallSlideOpen = function(fx, x0, y0){ const u = o.mall.apply(this, arguments); rec('mall ' + Math.round(x0) + ',' + Math.round(y0), 'mall', x0, y0, u); return u; };
  /* Marina General's glass: read off its own state each frame (frame = the podium's, outside) */
  const hosp = () => {
    if(typeof HOSP === 'undefined') return;
    const PX = HOSP.podium.x0, PY = HOSP.podium.y0, D = HOSP.podium.y1 - HOSP.podium.y0;
    (typeof HOSP_EDOORS !== 'undefined' ? HOSP_EDOORS : []).forEach((E, i) => rec('hosp er ' + i, 'hosp', PX + E.a1, PY + (E.b0 + E.b1)/2, E.k));
    (typeof HOSP_MDOORS !== 'undefined' ? HOSP_MDOORS : []).forEach((M, i) => rec('hosp main ' + i, 'hosp', PX + (M.u0 + M.u1)/2, PY + D, M.k));
  };
  game.events.on('postrender', hosp);
  R.off = () => { game.events.off('postrender', hosp); delete s.houseDoorsOpen; delete s.shopDoorSwing; delete s.shopDoorOpen; delete s.mallSlideOpen; };
  return true;
}

function collect(){
  const R = window.__RVD;
  if(!R) return null;
  return { doors: [...R.doors.values()], err: R.err || null };
}

/* how open door d was around time t: the most open it was within +-dt, or what it was going into that window */
function kAt(d, t, dt = 350){
  let k = 0, before = 0;
  for(const [ts, v] of d.S){ if(ts < t - dt) before = v; else if(ts <= t + dt) k = Math.max(k, v); else break; }
  return Math.max(k, before);
}

/* the doors' findings, and the people kit's door events reclassified (all = every kit's raw for this spot) */
function judge(r, all){
  const F = [];
  if(!r) return { findings: [{ rule: 'doors', msg: 'checker did not install' }] };
  if(r.err) F.push({ rule: 'doors', who: '-', msg: 'checker error: ' + r.err, info: true });
  const P = all && all.people;
  if(P){
    const NEAR = 110;
    for(const e of P.events){
      if(e.kind !== 'appear' && e.kind !== 'vanish') continue;
      let best = null, bd = NEAR;
      for(const d of r.doors){ const dd = Math.hypot(d.x - e.x, d.y - e.y); if(dd < bd){ bd = dd; best = d; } }
      if(!best) continue;
      const k = kAt(best, e.t);
      e.door = { key: best.key, k };
      if(k >= 0.25) e.legal = true;                       // through an open door: the legal way (the people judge drops it)
      else if(!e.cov) F.push({ rule: 'D1 nobody comes through a shut door', who: e.group,
        msg: `${e.kind === 'appear' ? 'appeared' : 'vanished'} at ${best.kind} door "${best.key}" while it was shut (k ${k.toFixed(2)}) at world (${e.x}, ${e.y}) screen (${e.sx}, ${e.sy})`, img: e.img });
    }
  }
  const kinds = {};
  for(const d of r.doors){ kinds[d.kind] = kinds[d.kind] || { n: 0, opened: 0 }; kinds[d.kind].n++; if(d.S.some(s => s[1] > 0.25)) kinds[d.kind].opened++; }
  F.push({ rule: 'info', who: '-', info: true, msg: 'doors seen: ' + Object.entries(kinds).map(([k, v]) => `${k} ${v.n} (${v.opened} opened)`).join(', ') });
  return { findings: F };
}

module.exports = { name: 'doors', install, collect, judge, order: 0 };
