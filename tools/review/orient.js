/* ORIENT -- which way round the game draws each library entry (Sir, 2026-11-23: "lets do 3" -- teach the checkers the entries the game
   shows turned). The checkers draw every entry in its own frame, the eye seeing +a (east) and +b (south); the game draws some of them
   turned: a hood rim site or a park landmark with b running away from the street (Marina General, its parking, Tidewater Green Park),
   a shop on a block's far edges mirrored in a (MIRROR), a house on the far side of its street. What faces the eye there -- and so what
   is behind what -- is the other way round.
   This tours the world (a grid over the map, every park landmark, every hood rim site), and each time the game hands an entry to the
   library it notes the turn it is drawn with:
     da   the a its drawing runs on: +1 east toward the eye, -1 west (the frame's a, times -1 when MIRROR is on)
     ka   the a of the frame it is handed (G), before MIRROR
     db   the b, +1 south toward the eye, -1 north
   and writes tools/review/orient.json: { entry: { pieces: ["da,ka,db", ...], whole: [...] } }, every turn it was seen in, drawn in pieces
   (LIB.collect, drawItem) or whole (LIB.draw). tools/review/w37.js checks each entry
   in every turn listed (an entry not listed: as the lab draws it, 1,1,1). Rerun after placing an entry somewhere new (a few minutes).
   node tools/review/orient.js */
const H = require('./harness.js'), fs = require('fs'), path = require('path');
(async () => {
  const h = await H.open({ instr: true }); await h.boot();
  const O = await h.page.evaluate(async () => {
    const s = game.scene.getScene('world'), O = {};
    let cur = null, armed = false, how = null;
    /* (the first point an entry's draw asks for: the frame it is in now -- its G, and MIRROR) */
    window.__RVP3 = () => { if(!armed) return; armed = false;
      try { const c = window.__RVK_ctx(), G = c.SHOP_SLOT && c.SHOP_SLOT.G; if(!G) return;
        const o = G(0, 0, 0), pa = G(1, 0, 0), pb = G(0, 1, 0), ka = Math.sign(pa.y - o.y), db = Math.sign(pb.y - o.y), da = ka*(c.MIRROR ? -1 : 1);
        if(!ka || !db) return; const e = O[cur] = O[cur] || { pieces: {}, whole: {} }; e[how][da + ',' + ka + ',' + db] = 1; } catch(e){} };
    for(const m of Object.keys(LIB)) if(typeof LIB[m] === 'function' && /^(draw|collect|drawItem|ground|drawDoorOpen)$/.test(m)){
      const f = LIB[m].bind(LIB);
      /* (by how it is drawn: in pieces -- collect, drawItem -- or whole -- draw; the ground and the doors are left out, they are
         drawn with their own turn: a street lot's pieces unmirrored while its ground is) */
      const hw = /^(collect|drawItem)$/.test(m) ? 'pieces' : m === 'draw' ? 'whole' : null;
      LIB[m] = function(name, ...rest){ const pc = cur, pa = armed, ph = how; cur = name; armed = !!hw; how = hw; try { return f(name, ...rest); } finally { cur = pc; armed = pa; how = ph; } }; }
    const stops = [];
    for(let y = -22000; y <= 12000; y += 2000) for(let x = -22000; x <= 32000; x += 2000) stops.push([x, y]);
    try { const pl = s.grid && s.grid._parkLandmarks; if(pl) for(const v of pl.values()) stops.push([v.x0 + 800, v.y0 + 800], [v.x0 + 1600, v.y0 + 1600]); } catch(e){}
    try { for(const r of HOOD_RIM_SITES) if(r.axis === 'x') for(let x = r.from; x <= r.to; x += 1500) stops.push([x, r.at + 300], [x, r.at + r.out*(r.depth || 800)/2]); } catch(e){}
    zoomSet(3);
    for(const [x, y] of stops){ try { owStandUpAt(s, x, y, Math.PI); } catch(e){ continue; } await new Promise(r => setTimeout(r, 300)); }
    /* THE CELL ENTRIES, wherever the tour went: each drawn in its cell's north-west frame, b = j*BLOCK - y (the hospital's, Cove Grove's,
       the airfield's, Kickstand's, Marina Parking's; Tidewater Green Park's G = W(x0 + a, y0 - b)) -- b turned on every day's map, so they
       are listed even when that day's route did not place them */
    const cellNames = [];
    for(const n of ['HOSP', 'COVE', 'AIR', 'FAC']){ try { const v = (0, eval)(n); if(v && v.cells) for(const c of v.cells) cellNames.push(c.name); } catch(e){} }
    cellNames.push('Marina Parking', 'Tidewater Green Park');
    for(const n of cellNames) if(!O[n]) O[n] = { pieces: { '1,1,-1': 1 }, whole: { '1,1,-1': 1 } };
    const out = {}; for(const n of Object.keys(O).sort()){ const e = {}; for(const k of ['pieces', 'whole']){ const L = Object.keys(O[n][k]).sort(); if(L.length) e[k] = L; } out[n] = e; }
    return out;
  });
  const fn = path.join(__dirname, 'orient.json');
  fs.writeFileSync(fn, JSON.stringify(O, null, 1) + '\n');
  const turned = Object.entries(O).filter(([n, e]) => [].concat(e.pieces || [], e.whole || []).some(k => k !== '1,1,1'));
  console.log(Object.keys(O).length + ' entries seen, ' + turned.length + ' of them drawn turned:');
  for(const [n, e] of turned) console.log('  ' + n + '  ' + Object.entries(e).map(([k, L]) => k + ' ' + L.join(' ')).join('  '));
  if(h.errs.length) console.log('page errors (the tour teleports him anywhere):', h.errs.slice(0, 3));
  console.log('wrote ' + fn);
  await h.close();
})();
