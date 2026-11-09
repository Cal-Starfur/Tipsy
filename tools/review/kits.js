/* THE KIT CENSUS: the sources every piece in the world is pulled from, measured, so what goes in is
   as checked as what comes out.
     library   every LIB entry (shops, houses, landmarks, rim sites, interiors): drawn once off screen;
               what it declares (ww, dd, h, vol, doors, flags, todos) against what it draws (its extent in
               its own lab frame, height, primitives used, kit doors vs hand-drawn ones)
     people    the people look kit: every roster type (STREET_TYPES, the jobs, the aids) on six seeds,
               drawn standing: height, width, build, the palettes the look came from
     vehicles  the vehicle kit: every kind in VEHICLES (and FLEET) drawn at all four headings: footprint
               length x width x height against vehLen / CARC, and whether it turns true (the same box
               rotated at every heading)
   Placement (which pipeline puts each library entry in the world) comes from the world census
   (census.js) when its JSON is given. Needs the review copy (harness instr).
   Usage: node tools/review/kits.js [--census census.json] [--out dir] */
const H = require('./harness.js'), fs = require('fs'), path = require('path');

async function probe(){
  const s = game.scene.getScene('world'), proto = Object.getPrototypeOf(s);
  const g = s.add.graphics().setVisible(false);
  const out = { library: [], people: [], vehicles: [] };
  /* ---- the library ---- */
  const SH = window.__RVK_shops ? window.__RVK_shops() : [];
  const counts = {}; let on = false, depth = 0;
  window.__RVK = (n, a, ph) => { if(!on) return; if(ph === 0){ if(depth === 0) counts[n] = (counts[n] || 0) + 1; depth++; } else depth--; };
  const G = (a, b, h) => ({ x: 600 + (a - b), y: 420 + (a + b)/2 - h });
  for(const shop of SH){
    const name = shop.name, e = { name };
    for(const k of Object.keys(counts)) delete counts[k];
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity, z1 = -Infinity, np = 0;
    window.__RVP3 = (a, b, z) => { if(!isFinite(a)) return; np++; if(a < a0) a0 = a; if(a > a1) a1 = a; if(b < b0) b0 = b; if(b > b1) b1 = b; if(z > z1) z1 = z; };
    on = true; depth = 0;
    const t0 = performance.now();
    try { g.clear(); LIB.draw(name, g, G, null, 1, null, true, false); } catch(err){ e.err = String(err).slice(0, 120); }
    e.ms = +(performance.now() - t0).toFixed(1);
    on = false; window.__RVP3 = null; g.clear();
    e.drawn = np ? { a0: Math.round(a0), a1: Math.round(a1), b0: Math.round(b0), b1: Math.round(b1), z1: Math.round(z1) } : null;
    e.prims = Object.assign({}, counts);
    e.fields = Object.keys(shop).filter(k => typeof shop[k] !== 'function').sort();
    e.fns = Object.keys(shop).filter(k => typeof shop[k] === 'function').sort();
    for(const k of ['ww', 'dd', 'h', 'sc', 'zs', 'block', 'pieces', 'mirror', 'ground', 'kind', 'cls']) if(shop[k] !== undefined && typeof shop[k] !== 'object') e[k] = shop[k];
    for(const k of ['fTodo', 'cTodo', 'kTodo']) if(shop[k]) e[k] = String(shop[k]).slice(0, 160);
    try { const v = LIB.vol(name); e.vol = v ? { keys: Object.keys(v), h: v.h, foot: v.foot ? (Array.isArray(v.foot) ? v.foot.length : Object.keys(v.foot).length) : null, declared: !!shop.vol } : null; } catch(err){ e.vol = { err: String(err).slice(0, 80) }; }
    try { const d = LIB.doorOf(name); e.doors = d ? d.length : 0; e.doorH = d && d.length ? +(d[0].dH || 0).toFixed(1) : null; } catch(err){ e.doors = null; }
    e.slideDoors = shop.slideDoors ? (Array.isArray(shop.slideDoors) ? shop.slideDoors.length : 1) : 0;
    out.library.push(e);
  }
  window.__RVK = null;
  /* ---- the people look kit ---- */
  const cur = { on: false };
  const W0 = proto.W;
  proto.W = function(x, y, z){ if(cur.on && isFinite(x)){ z = z || 0; if(z > cur.z1) cur.z1 = z; if(x < cur.x0) cur.x0 = x; if(x > cur.x1) cur.x1 = x; if(y < cur.y0) cur.y0 = y; if(y > cur.y1) cur.y1 = y; } return W0.call(this, x, y, z); };
  const meas = fn => { Object.assign(cur, { on: true, z1: -Infinity, x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity }); try { fn(); } catch(err){ cur.err = String(err).slice(0, 100); } finally { cur.on = false; g.clear(); } return { h: Math.round(cur.z1), w: Math.round(Math.max(cur.x1 - cur.x0, cur.y1 - cur.y0)), err: cur.err }; };
  const types = [...new Set([...STREET_TYPES.map(t => t[0]), ...(typeof JOB_TYPES !== 'undefined' ? JOB_TYPES : []), ...(typeof AID_TYPES !== 'undefined' ? AID_TYPES : []), 'kid'])];
  const pal = { skin: PEOPLE_SKIN.map(c => c.c), shirt: PEOPLE_SHIRT.map(c => c.c), pants: PEOPLE_PANTS.map(c => c.c), hair: PEOPLE_HAIR };
  for(const type of types){
    for(let k = 0; k < 6; k++){
      const seed = 1000 + k*7919;
      let L; try { L = streetLook(seed, { type }); } catch(err){ out.people.push({ type, seed, err: String(err).slice(0, 100) }); continue; }
      cur.err = null;
      const m = meas(() => s.drawPersonHullBody(g, 0, 0, 0, 0, L.build, L.skin, L.shirt, L.pants, L.hair, L.shoe, 0, false, 0, 0, null, L.uniform, false, L.dress ? { dress: L.dress } : null));
      const b = L.build || {};
      out.people.push({ type, seed, h: m.h, w: m.w, err: m.err, aid: L.uniform && L.uniform.aid ? L.uniform.aid.kind : null,
        build: { legH: b.legH, torsoH: b.torsoH, headR: b.headR, torsoW: b.torsoW, sum: (b.legH || 0) + (b.torsoH || 0) + 2*(b.headR || 0) },
        inPal: { skin: !!(L.skin && pal.skin.includes(L.skin.c)), shirt: !!(L.shirt && pal.shirt.includes(L.shirt.c)), pants: !!(L.pants && pal.pants.includes(L.pants.c)) } });
    }
  }
  /* ---- the vehicle kit ---- */
  const kinds = [];
  for(const grp of VEHICLES) for(const [label, kind] of grp.items) kinds.push({ group: grp.group, label, kind });
  for(const [kind, F] of Object.entries(typeof FLEET !== 'undefined' ? FLEET : {})){ const label = F.name; if(!kinds.some(q => q.kind === kind)) kinds.push({ group: 'Fleet', label, kind }); }
  for(const q of kinds){
    const fd = [];
    for(let f = 0; f < 4; f++){ cur.err = null; const m = meas(() => s.drawProp(g, q.kind, 0, 0, 0, f, 0, 0, 1)); fd.push({ x: Math.round(cur.x1 - cur.x0), y: Math.round(cur.y1 - cur.y0), z: Math.round(cur.z1), err: m.err }); }
    let L = null; try { L = vehLen(q.kind); } catch(err){}
    out.vehicles.push(Object.assign(q, { fd, vehLen: L }));
  }
  proto.W = W0;
  g.destroy();
  return out;
}

const med = a => { const s = a.filter(v => v != null && isFinite(v)).sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1)/2)] : null; };

/* where each library entry is placed in the world, from the world census's cache keys */
function placement(census){
  const P = new Map(), cls = { lu: 'house', hs: 'shop', hi: 'landmark', hl: 'landmark', rim: 'rim site', pkx: 'interior', pl: 'park', sv: 'estate' };
  for(const e of census.items){
    if(!e.bc) continue;
    for(const b of e.bc){
      const p = b.key.split('|'); const c = cls[p[0]]; if(!c || !p[1]) continue;
      const nm = p[1] === 'mallground' ? 'Maritime Mall' : p[1];
      if(!P.has(nm)) P.set(nm, new Set()); P.get(nm).add(c + ' (' + p[0] + ')');
    }
  }
  return P;
}

function judge(K, census){
  const F = [];
  const place = census ? placement(census) : new Map();
  /* library: per class (by placement), the norm and who departs from it */
  for(const e of K.library){
    const pl = place.get(e.name);
    e.placed = pl ? [...pl] : [];
    e.cls = pl ? [...pl][0].split(' (')[0] : 'not placed';
  }
  const by = {};
  for(const e of K.library) (by[e.cls] = by[e.cls] || []).push(e);
  const norms = {};
  for(const [c, L] of Object.entries(by)){
    const share = f => +(L.filter(f).length/L.length).toFixed(2);
    norms[c] = { n: L.length, withVol: share(e => e.vol && e.vol.declared), withKitDoor: share(e => e.doors > 0 || e.slideDoors > 0),
                 withTodo: share(e => e.fTodo || e.cTodo || e.kTodo), drawMsMed: med(L.map(e => e.ms)) };
  }
  for(const e of K.library){
    const n = norms[e.cls];
    if(e.err) F.push({ kit: 'library', rule: 'KC0', name: e.name, cls: e.cls, note: 'draw throws: ' + e.err });
    if(e.cls !== 'not placed' && n.withVol >= 0.5 && !(e.vol && e.vol.declared)) F.push({ kit: 'library', rule: 'KC1', name: e.name, cls: e.cls, note: `no vol declared (${Math.round(n.withVol*100)}% of ${e.cls}s declare one): its collision is a generic box, not the drawn building` });
    /* a shop's door is the kit's shopDoor (LIB.doorOf records it); a house declares its door (e.door, drawn by houseDoorway) */
    if(e.cls === 'shop' && !(e.doors > 0)) F.push({ kit: 'library', rule: 'KC2', name: e.name, cls: e.cls, note: `no kit door (shopDoor) recorded: nothing can open it, and a pickup or caller walks out of the wall` });
    if(e.cls === 'house' && !e.fields.includes('door')) F.push({ kit: 'library', rule: 'KC2', name: e.name, cls: e.cls, note: `no door declared (e.door): houseDoorsOpen has nothing to open, and a caller walks out of the wall` });
    if(e.ww && e.drawn && (e.drawn.a1 - e.drawn.a0) > e.ww*1.15 + 10 && ['shop', 'house'].includes(e.cls)) F.push({ kit: 'library', rule: 'KC3', name: e.name, cls: e.cls, note: `draws ${e.drawn.a0}..${e.drawn.a1} along its front, declared ww ${e.ww}: it spills onto the neighbour's lot` });
    if(e.vol && e.vol.h && e.drawn && e.drawn.z1 > (e.vol.h*1.5 + 15)*1.3 && e.cls !== 'not placed') F.push({ kit: 'library', rule: 'KC4', name: e.name, cls: e.cls, note: `drawn ${e.drawn.z1} tall in lab units, declared vol h ${e.vol.h}: x-ray and collision are built for a lower building` });
    if(e.fTodo || e.cTodo || e.kTodo) F.push({ kit: 'library', rule: 'KC5', name: e.name, cls: e.cls, note: 'flags its own open defects: ' + [e.fTodo, e.cTodo, e.kTodo].filter(Boolean).join(' / ') });
    if(n.drawMsMed && e.ms > Math.max(25, 6*n.drawMsMed)) F.push({ kit: 'library', rule: 'KC6', name: e.name, cls: e.cls, note: `one draw takes ${e.ms} ms (its class: ${n.drawMsMed} ms)` });
  }
  /* people: by type, height against PERSON_H (adults), kids and the seated apart */
  const pt = {};
  for(const p of K.people) (pt[p.type] = pt[p.type] || []).push(p);
  const pnorm = {};
  for(const [t, L] of Object.entries(pt)){
    const hs = L.filter(p => !p.aid || !['wheelchair', 'mobility'].includes(p.aid)).map(p => p.h);
    pnorm[t] = { h: med(hs), hMin: Math.min(...hs.filter(isFinite)), hMax: Math.max(...hs.filter(isFinite)), w: med(L.map(p => p.w)), errs: L.filter(p => p.err).length, offPal: L.filter(p => p.inPal && !(p.inPal.skin)).length };
    if(pnorm[t].errs) F.push({ kit: 'people', rule: 'PK0', name: t, note: `${pnorm[t].errs} of ${L.length} looks fail to draw: ${L.find(p => p.err).err}` });
  }
  /* the adult norm measured off the man and the woman (to the top of the hair; the body is PERSON_H 124) */
  const PH = med([pnorm.man && pnorm.man.h, pnorm.woman && pnorm.woman.h]) || 130;
  for(const [t, L] of Object.entries(pt)){
    const adult = t !== 'kid' && !/teen|skater|goth|hipster|gangster|sneakerhead/.test(t);
    if(adult && pnorm[t].h && (pnorm[t].h < PH*0.9 || pnorm[t].h > PH*1.1)) F.push({ kit: 'people', rule: 'PK1', name: t, note: `stands ${pnorm[t].h} (range ${pnorm[t].hMin}..${pnorm[t].hMax}); adults stand about ${PH} (man and woman, hair included)` });
    if(pnorm[t].offPal) F.push({ kit: 'people', rule: 'PK2', name: t, note: `${pnorm[t].offPal} of ${L.length} skins not from PEOPLE_SKIN` });
  }
  /* vehicles: turns true, and road vehicles' length against vehLen */
  const road = new Set(['Cars', 'Trucks', 'Vans']);
  /* what the measure adds to the declared size (mirrors, bumpers, the shadow): read off the plain sedan,
     whose declared size is CARC's 225 x 90 */
  const sedan = K.vehicles.find(v => v.kind === 'car');
  const mlen = (v, i) => v.fd[i];
  let addL = 0, addW = 0;
  if(sedan && !sedan.fd.some(f => f.err)){ addL = med([sedan.fd[0].x, sedan.fd[2].x, sedan.fd[1].y, sedan.fd[3].y]) - 225; addW = med([sedan.fd[0].y, sedan.fd[2].y, sedan.fd[1].x, sedan.fd[3].x]) - 90; }
  for(const v of K.vehicles){
    const errs = v.fd.filter(f => f.err);
    if(errs.length){ F.push({ kit: 'vehicles', rule: 'VK0', name: v.kind, note: `${errs.length}/4 headings fail to draw: ${errs[0].err}` }); continue; }
    const L02 = [v.fd[0].x, v.fd[2].x], L13 = [v.fd[1].y, v.fd[3].y], W02 = [v.fd[0].y, v.fd[2].y], W13 = [v.fd[1].x, v.fd[3].x];
    const all = [...L02, ...L13], allW = [...W02, ...W13];
    v.len = med(all); v.wid = med(allW); v.h = med(v.fd.map(f => f.z));
    if(Math.max(...all) - Math.min(...all) > 0.12*v.len + 6) F.push({ kit: 'vehicles', rule: 'VK1', name: v.kind, note: `not the same size at every heading: length ${all.join('/')} (fdir 0,2 along x; 1,3 along y)` });
    const bodyL = v.len - addL, bodyW = v.wid - addW;
    if(road.has(v.group) && v.kind !== 'scooter' && v.vehLen && Math.abs(bodyL - v.vehLen) > 0.1*v.vehLen + 10) F.push({ kit: 'vehicles', rule: 'VK2', name: v.kind, note: `body drawn about ${Math.round(bodyL)} long, vehLen says ${v.vehLen}: parking gaps, queues and the hitbox use vehLen` });
    if(road.has(v.group) && v.kind !== 'scooter' && Math.abs(bodyW - 90) > 25) F.push({ kit: 'vehicles', rule: 'VK3', name: v.kind, note: `body drawn about ${Math.round(bodyW)} wide against the road car's 90 (CARC.wid): lanes and kerb gaps are set for 90` });
  }
  return { norms: { library: norms, people: pnorm }, findings: F };
}

module.exports = { probe, judge, placement };

if(require.main === module){
  const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
  const out = arg('--out', path.join(H.ROOT, '.review', 'kits')), cen = arg('--census', null);
  (async () => {
    fs.mkdirSync(out, { recursive: true });
    const G = await H.open({ instr: true }); await G.boot();
    const K = await G.page.evaluate(probe);
    fs.writeFileSync(path.join(out, 'kits_raw.json'), JSON.stringify(K));
    const J = judge(K, cen ? JSON.parse(fs.readFileSync(cen, 'utf8')) : null);
    fs.writeFileSync(path.join(out, 'kits.json'), JSON.stringify(Object.assign({}, K, J), null, 1));
    console.log(`library ${K.library.length} entries, people ${K.people.length} looks, vehicles ${K.vehicles.length} kinds; findings ${J.findings.length}`);
    const by = {}; for(const f of J.findings) (by[f.kit + ' ' + f.rule] = by[f.kit + ' ' + f.rule] || []).push(f);
    for(const [k, l] of Object.entries(by)) console.log(k, l.length, '| e.g.', l.slice(0, 3).map(f => f.name).join(', '));
    console.log('page errors', G.errs.length);
    await G.close();
  })();
}
