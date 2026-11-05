/* KIT 1: PEOPLE -- the checker (see docs/kits/people.md for the contract).

   Watches the real game. Two sources, so nobody is missed:
     - every live call to drawPersonHull (anyone DRAWN, listed or not), and
     - CITY_PEOPLE, the registry (who they are, which group, their look).
   People painted into the building cache (seated cast, bcDraw / bcPaint) are
   still pictures and are left out: they cannot pop.

   What it reports, each a breach of the contract:
     appear     someone starts being drawn on screen, away from its edges
     vanish     someone stops being drawn on screen, away from its edges
     teleport   a vanish and an appear in the same instant, apart
     fade       drawn see-through (withAlpha < 1) and not as an x-ray ghost
     recast     one slot in a group plays different people (a new look each time round)
     unlisted   drawn but not in CITY_PEOPLE (so knockdowns, crowd and bubbles can't see them)
     pace       a group walking well off the shared pace (PEOPLE_WALK_V)
     not listed groups that registered with each: null
   An appear or vanish at a door is still reported: until the doors kit (kit 2)
   gives the world's doors in one list, the review's snapshot is what tells a
   door from thin air. */

function install(){
  const s = game.scene.getScene('world');
  if(window.__RVP && window.__RVP.off) window.__RVP.off();
  const R = window.__RVP = { ev: [], tracks: [], nextId: 1, alpha: 1, paint: 0, inBc: 0, frame: 0, draws: [],
                             lookByRef: new Map(), refId: new WeakMap(), refN: 1, refGroup: new Map(), shots: 0, lastT: null };
  const gName = new Map();
  for(const k of Object.keys(s)){ const v = s[k]; if(v && v.type === 'Graphics') gName.set(v, k); }
  const col = v => v == null ? '' : typeof v === 'object' ? (v.c != null ? v.c : JSON.stringify(v).slice(0, 24)) : v;
  const o = { draw: s.drawPersonHull, wa: s.withAlpha, paint: s.bcPaint, bc: s.bcDraw };
  s.drawPersonHull = function(g, ax, ay, z, thW, build, sk, sh, pa, ha){
    if(!R.paint && !R.inBc){
      const gn = gName.get(g) || (g && g.__seg ? 'seg' : '?');
      R.draws.push({ x: ax, y: ay, z: z || 0, a: R.alpha, xr: /^gX/.test(gn) || !!(s._xrayCap), look: [col(sk), col(sh), col(pa), col(ha)].join('/') });
      if(R.hide && Math.abs(ax - R.hide.x) + Math.abs(ay - R.hide.y) < 30) return;     // (one frame without them: the visibility check)
    }
    return o.draw.apply(this, arguments);
  };
  s.withAlpha = function(g, k, fn){ const a = R.alpha; R.alpha = a*k; try { return o.wa.call(this, g, k, fn); } finally { R.alpha = a; } };
  s.bcPaint = function(){ R.paint++; try { return o.paint.apply(this, arguments); } finally { R.paint--; } };
  s.bcDraw = function(){ R.inBc++; try { return o.bc.apply(this, arguments); } finally { R.inBc--; } };

  const vw = () => s.vpW(), vh = () => s.vpH();
  const inner = (sx, sy) => sx > 50 && sx < vw() - 50 && sy > 70 && sy < vh() - 30;
  /* covered: the game's own x-ray test -- a building stands between this spot and the eye,
     so a pop or a fade here cannot be seen (behind glass it can: those still need the snapshot) */
  /* ...or a roof over them (a canopy, the ER's bay): seen from above the iso eye, under it is hidden too */
  let cov = null;
  const oCov = s.xrayCoverage;
  s.xrayCoverage = function(blocks, lots){ cov = { blocks, lots }; return oCov.call(this, blocks, lots); };
  const roofOver = (x, y) => { try { return !!cov && (s.builtHeightAt(x, y, cov.blocks, cov.lots) || 0) > 125; } catch(e){ return false; } };
  /* (roofOver is NOT used to drop events: the mall's upper floor is a "roof" over its bay doors too, and the
     people walking into those painted doors are in plain sight. Whether a pop is seen is MEASURED instead:
     checkVis, below) */
  const covered = (x, y, z) => { try { return !!s.xrayPersonHidden(x, y, z || 0); } catch(e){ return false; } };
  const lookKey = L => L ? [col(L.skin), col(L.shirt), col(L.pants), col(L.hair)].join('/') : null;
  const rid = r => { let i = R.refId.get(r); if(!i){ i = R.refN++; R.refId.set(r, i); } return i; };

  /* a picture of the moment, the place ringed in red (a vanish: where they were) */
  const snap = (ev) => {
    if(R.shots >= 30 || !game.renderer.snapshotArea) return;
    R.shots++;
    const w = 240, h = 240, x = Math.max(0, Math.min(vw() - w, Math.round(ev.sx - w/2))), y = Math.max(0, Math.min(vh() - h, Math.round(ev.sy - h/2)));
    try {
      game.renderer.snapshotArea(x, y, w, h, img => {
        try { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
              g.strokeStyle = '#ff2d55'; g.lineWidth = 3; g.beginPath(); g.ellipse(ev.sx - x, ev.sy - y + 30, 22, 46, 0, 0, Math.PI*2); g.stroke();
              ev.img = c.toDataURL('image/jpeg', 0.85); } catch(e){}
      });
    } catch(e){}
  };

  /* IS THE POP SEEN? The frame with them, then the next frame with only them left out: the pixels that
     change are the part of them anyone could see. Under a canopy or behind a wall almost nothing changes --
     not a visible pop. (One at a time; the photo is the frame with them, ringed.) */
  const checkVis = ev => {
    if(R.busy || R.shots >= 30 || !game.renderer.snapshotArea){ snap(ev); return; }
    R.busy = true; R.shots++;
    const w = 240, h = 240, x = Math.max(0, Math.min(vw() - w, Math.round(ev.sx - w/2))), y = Math.max(0, Math.min(vh() - h, Math.round(ev.sy - h/2)));
    const px = img => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.drawImage(img, 0, 0); return { c, g, d: g.getImageData(0, 0, w, h).data }; };
    try {
      game.renderer.snapshotArea(x, y, w, h, imgA => {
        R.hide = { x: ev.x, y: ev.y };
        game.renderer.snapshotArea(x, y, w, h, imgB => {
          R.hide = null;
          try {
            const A = px(imgA), B = px(imgB), cx = ev.sx - x, cy = ev.sy - y + 30;
            let V = 0;
            for(let yy = Math.max(0, Math.round(cy - 60)); yy < Math.min(h, Math.round(cy + 60)); yy++) for(let xx = Math.max(0, Math.round(cx - 26)); xx < Math.min(w, Math.round(cx + 26)); xx++){
              const i = (yy*w + xx)*4; if(Math.abs(A.d[i] - B.d[i]) + Math.abs(A.d[i+1] - B.d[i+1]) + Math.abs(A.d[i+2] - B.d[i+2]) > 45) V++;
            }
            ev.visPx = V;
            if(V < 40) ev.cov = true;                                                   // hidden for real (measured)
            A.g.strokeStyle = '#ff2d55'; A.g.lineWidth = 3; A.g.beginPath(); A.g.ellipse(cx, cy, 22, 46, 0, 0, Math.PI*2); A.g.stroke();
            ev.img = A.c.toDataURL('image/jpeg', 0.85);
          } catch(e){}
          R.busy = false;
        });
      });
    } catch(e){ R.busy = false; R.hide = null; }
  };

  const onFrame = () => {
    const t = s.time.now, dt = R.lastT == null ? 16 : Math.max(1, t - R.lastT);
    R.lastT = t; R.frame++;
    const D = R.draws; R.draws = [];
    for(const d of D){ const P = s.W(d.x, d.y, d.z + 120); d.sx = P.x; d.sy = P.y; }
    /* registry: who is listed, every 3rd frame */
    let reg = null;
    if(R.frame % 3 === 0 && typeof CITY_PEOPLE !== 'undefined'){
      reg = [];
      CITY_PEOPLE.each(s, t, e => {
        if(e.hidden) return;
        reg.push(e);
        if(e.ref && typeof e.ref === 'object'){
          const id = rid(e.ref);
          R.refGroup.set(id, e.group);
          const lk = lookKey(e.look);
          if(lk){ let S = R.lookByRef.get(id); if(!S) R.lookByRef.set(id, S = new Set()); if(S.size < 12) S.add(lk); }
        }
      });
    }
    /* match this frame's draws to the live tracks: nearest first, within reach */
    const reach = Math.max(60, 0.5*dt);
    const pairs = [];
    for(let i = 0; i < D.length; i++) for(const tr of R.tracks){
      const d = Math.hypot(D[i].x - tr.x, D[i].y - tr.y);
      if(d < reach) pairs.push([d, i, tr]);
    }
    pairs.sort((a, b) => a[0] - b[0]);
    const usedD = new Set(), usedT = new Set();
    for(const [d, i, tr] of pairs){
      if(usedD.has(i) || usedT.has(tr)) continue;
      usedD.add(i); usedT.add(tr);
      const q = D[i];
      if(q.a < 0.97 && !q.xr && !tr.faded){ tr.faded = true; const ev = { kind: 'fade', t, x: q.x, y: q.y, sx: q.sx, sy: q.sy, a: +q.a.toFixed(2), tr: tr.id, cov: covered(q.x, q.y, q.z) }; R.ev.push(ev); if(!ev.cov && inner(q.sx, q.sy)) snap(ev); }
      if(d > 0.5){ tr.spd.push(d/dt); if(tr.spd.length > 400) tr.spd.shift(); }
      Object.assign(tr, { z: q.z, x: q.x, y: q.y, sx: q.sx, sy: q.sy, miss: 0, last: t, xr: q.xr, look: q.look });
      tr.frames++;
    }
    /* tracks not drawn: gone after 3 frames */
    for(const tr of R.tracks) if(!usedT.has(tr)){
      tr.miss++;
      if(tr.miss === 3){
        tr.dead = true;
        if(R.frame > 40 && inner(tr.sx, tr.sy)){ const ev = { kind: 'vanish', t: tr.last, x: tr.x, y: tr.y, sx: tr.sx, sy: tr.sy, tr: tr.id, life: Math.round(tr.last - tr.born), cov: covered(tr.x, tr.y, tr.z) }; R.ev.push(ev); if(!ev.cov) snap(ev); }
      }
    }
    R.tracks = R.tracks.filter(tr => !tr.dead);
    /* draws with no track: someone new */
    D.forEach((q, i) => {
      if(usedD.has(i)) return;
      const tr = { id: R.nextId++, z: q.z, x: q.x, y: q.y, sx: q.sx, sy: q.sy, born: t, last: t, miss: 0, frames: 1, spd: [], groups: {}, unl: 0, lst: 0, xr: q.xr, look: q.look };
      R.tracks.push(tr);
      if(q.a < 0.97 && !q.xr){ tr.faded = true; const ev = { kind: 'fade', t, x: q.x, y: q.y, sx: q.sx, sy: q.sy, a: +q.a.toFixed(2), tr: tr.id, cov: covered(q.x, q.y, q.z) }; R.ev.push(ev); if(!ev.cov && inner(q.sx, q.sy)) snap(ev); }
      if(R.frame > 40 && inner(q.sx, q.sy)){ const ev = { kind: 'appear', t, x: q.x, y: q.y, sx: q.sx, sy: q.sy, tr: tr.id, a: +q.a.toFixed(2), cov: covered(q.x, q.y, q.z) }; R.ev.push(ev); if(!ev.cov) checkVis(ev); }
    });
    /* which group each track belongs to (nearest listed person), or none */
    if(reg) for(const tr of R.tracks){
      if(tr.xr) continue;
      let best = null, bd = 50;
      for(const e of reg){ const d = Math.abs(e.x - tr.x) + Math.abs(e.y - tr.y); if(d < bd){ bd = d; best = e; } }
      if(best){ tr.lst++; tr.groups[best.group] = (tr.groups[best.group] || 0) + 1; if(best.kind === 'rider') tr.rode = true; } else tr.unl++;
    }
    /* P9: nobody stands in anybody -- two bodies drawn closer than a body's width (20) for more than a moment
       (8 frames running) are inside each other: a group stacked on one spot, a walker through a walker */
    R.ov = R.ov || new Map();
    const live = R.tracks.filter(tr => !tr.xr && tr.miss === 0);
    const seenPair = new Set();
    for(let i = 0; i < live.length; i++) for(let j = i + 1; j < live.length; j++){
      const p = live[i], q = live[j];
      if(Math.hypot(p.x - q.x, p.y - q.y) >= 20) continue;
      const key = Math.min(p.id, q.id) + ':' + Math.max(p.id, q.id); seenPair.add(key);
      const n = (R.ov.get(key) || 0) + 1; R.ov.set(key, n);
      if(n === 8 && inner(p.sx, p.sy)){ const ev = { kind: 'overlap', t, x: p.x, y: p.y, sx: p.sx, sy: p.sy, tr: p.id, d: Math.round(Math.hypot(p.x - q.x, p.y - q.y)) }; R.ev.push(ev); snap(ev); }
    }
    for(const k of [...R.ov.keys()]) if(!seenPair.has(k)) R.ov.delete(k);
    R.all = R.all || new Map();
    for(const tr of R.tracks) R.all.set(tr.id, tr);
  };
  game.events.on('postrender', onFrame);
  R.off = () => { game.events.off('postrender', onFrame); delete s.drawPersonHull; delete s.withAlpha; delete s.bcPaint; delete s.bcDraw; delete s.xrayCoverage; };   // (the prototype's own come back)
  return true;
}

function collect(){
  const R = window.__RVP;
  if(!R) return null;
  const all = [...(R.all || new Map()).values()];
  const groupOf = tr => { const g = Object.entries(tr.groups).sort((a, b) => b[1] - a[1])[0]; return g && tr.lst >= tr.unl ? g[0] : (tr.xr ? 'x-ray ghost' : 'NOT LISTED'); };
  const byId = new Map(all.map(tr => [tr.id, tr]));
  for(const e of R.ev){ const tr = byId.get(e.tr); e.group = tr ? groupOf(tr) : '?'; }
  /* a vanish and an appear at the same moment, apart: a teleport */
  const out = [];
  const used = new Set();
  for(const v of R.ev) if(v.kind === 'vanish'){
    const a = R.ev.find(e => e.kind === 'appear' && !used.has(e) && Math.abs(e.t - v.t) < 160 && Math.hypot(e.x - v.x, e.y - v.y) < 900);
    if(a){ used.add(a); used.add(v); out.push({ kind: 'teleport', t: v.t, x: v.x, y: v.y, sx: v.sx, sy: v.sy, to: [Math.round(a.x), Math.round(a.y)], d: Math.round(Math.hypot(a.x - v.x, a.y - v.y)), group: v.group, img: a.img }); }
  }
  for(const e of R.ev) if(!used.has(e)) out.push(e);
  /* pace per group: median of each moving track's median speed */
  const med = a => { if(!a.length) return 0; const b = a.slice().sort((p, q) => p - q); return b[b.length >> 1]; };
  const pace = {};
  for(const tr of all){
    if(tr.rode) continue;                                         // (on a scooter or bike part of the way: not walking pace)
    const g = groupOf(tr), mv = tr.spd.filter(v => v > 0.012);
    if(mv.length < 20) continue;
    (pace[g] = pace[g] || []).push(med(mv));
  }
  const paceRows = Object.entries(pace).map(([g, a]) => ({ group: g, n: a.length, v: +med(a).toFixed(3) }));
  /* recast: a listed slot seen with more than one look */
  const recast = {};
  for(const [id, S] of R.lookByRef) if(S.size > 1){ const g = R.refGroup.get(id) || '?'; recast[g] = Math.max(recast[g] || 0, S.size); }
  const unlisted = all.filter(tr => !tr.xr && tr.frames > 30 && groupOf(tr) === 'NOT LISTED')
                      .map(tr => ({ x: Math.round(tr.x), y: Math.round(tr.y), sx: Math.round(tr.sx), sy: Math.round(tr.sy), frames: tr.frames }));
  const notListed = typeof CITY_PEOPLE !== 'undefined' ? CITY_PEOPLE.groups.filter(g => !g.each).map(g => g.name) : [];
  const walkV = typeof PEOPLE_WALK_V !== 'undefined' ? PEOPLE_WALK_V : null;
  return { events: out.map(e => Object.assign(e, { x: Math.round(e.x), y: Math.round(e.y), sx: Math.round(e.sx), sy: Math.round(e.sy) })),
           pace: paceRows, walkV, recast, unlisted, notListed, tracks: all.length, frames: R.frame };
}

/* the review of one spot, as lines; a finding is a breach of the contract */
function judge(r, all){
  const F = [];
  if(!r) return { findings: [{ rule: 'people', msg: 'checker did not install (no drawPersonHull?)' }] };
  let cov = 0;
  let viaDoor = 0;
  for(const e of r.events){
    if(e.cov){ cov++; continue; }
    if(e.legal){ viaDoor++; continue; }            // through an open door (the doors kit's judge marked it)
    if(e.door) continue;                            // at a shut door: the doors kit reports it (D1)
    const where = `world (${e.x}, ${e.y}) screen (${e.sx}, ${e.sy})`;
    const who = e.group;
    if(e.kind === 'fade') F.push({ rule: 'P2 nobody fades', who, msg: `drawn at ${Math.round(e.a*100)}% at ${where}`, img: e.img });
    if(e.kind === 'appear') F.push({ rule: 'P1 nobody pops in', who, msg: `appeared on screen at ${where}${e.door ? ' (near a door)' : ''}${e.a < 0.97 ? ', fading in' : ''}`, img: e.img, door: e.door });
    if(e.kind === 'vanish') F.push({ rule: 'P1 nobody pops out', who, msg: `vanished on screen at ${where} after ${(e.life/1000).toFixed(1)} s (ringed: where they were)`, img: e.img, door: e.door });
    if(e.kind === 'overlap') F.push({ rule: 'P9 nobody stands in anybody', who, msg: `two people drawn ${e.d} apart (inside each other) for more than a moment at ${where}`, img: e.img });
    if(e.kind === 'teleport') F.push({ rule: 'P3 nobody teleports', who, msg: `jumped ${e.d} units from ${where} to (${e.to})`, img: e.img });
  }
  if(viaDoor) F.push({ rule: 'info', who: '-', msg: `${viaDoor} came or went through an open door (legal)`, info: true });
  if(cov) F.push({ rule: 'info', who: '-', msg: `${cov} pops/fades behind buildings, not visible (left out)`, info: true });
  for(const [g, n] of Object.entries(r.recast)) F.push({ rule: 'P4 a person is a person', who: g, msg: `one slot played ${n}${n >= 12 ? '+' : ''} different looks (a new person each time round)` });
  /* the unlisted, gathered by place (one line per crowd, not per person) */
  const C = [];
  for(const u of r.unlisted){ const c = C.find(c => Math.abs(c.x - u.x) + Math.abs(c.y - u.y) < 900); if(c) c.n++; else C.push({ x: u.x, y: u.y, sx: u.sx, sy: u.sy, n: 1 }); }
  for(const c of C) F.push({ rule: 'P5 everyone is listed', who: 'NOT LISTED', msg: `${c.n} ${c.n > 1 ? 'people' : 'person'} drawn near world (${c.x}, ${c.y}) screen (${c.sx}, ${c.sy}) with no CITY_PEOPLE entry` });
  for(const g of r.notListed) F.push({ rule: 'P5 everyone is listed', who: g, msg: 'group registered with each: null (invisible to knockdowns, crowd, bubbles)', global: true });
  if(r.walkV) for(const p of r.pace){
    if(/rider|x-ray/.test(p.group)) continue;
    if(p.v > r.walkV*1.5 || p.v < r.walkV*0.4) F.push({ rule: 'P6 shared pace', who: p.group, msg: `walks at ${p.v} u/ms (shared pace ${r.walkV}), ${p.n} people measured` });
  }
  return { findings: F };
}

module.exports = { name: 'people', install, collect, judge };
