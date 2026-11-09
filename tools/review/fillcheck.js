#!/usr/bin/env node
/* FILL CHECK -- rule D-FILL (docs/LOOK_RULES.md 2b, 2c; docs/kits/people.md).

   "A filled silhouette is showing." `prism` and `limb` first fill the convex hull of a piece's two ends in a mid tone (so no hairline seams show between
   faces). Nothing in the hulls has depth -- it is painter's order -- so for a piece that is a sleeve or ring round something drawn before it (a hat band, a
   boot over a shin), or a lower segment drawn AFTER the one above it (a nozzle after its tank, a hand after its forearm), that hull is a flat plane across
   what it sits on. It is invisible when the piece is drawn right and a disc or lid when it is not.

   How it finds them: each case is drawn at four headings twice -- normally, and with the hull fill off (convexHull -> a point) -- and the two pictures are
   diffed. The anti-seam fill differs only in thin lines; what survives a 5x5 erosion is a hull painted over something. A deliberate filled shape (a flame, a
   pouch) calls convexHullKeep and is not touched.

   Usage:
     node tools/review/fillcheck.js                     every set (gideon, people, bots, props, shops)
     node tools/review/fillcheck.js --set gideon        gideon | people | bots | props | shops
     node tools/review/fillcheck.js --only hat:         cases whose name starts with this
     node tools/review/fillcheck.js --rev <git ref>     the game as it was then (the backtest)
     node tools/review/fillcheck.js --thr 400           blob size that counts (px at 2x; clean pieces score ~150: the pale shell's own edge)
     node tools/review/fillcheck.js --out <dir>         where flagged pictures go (default: a temp dir)
   Exits 1 when a case is flagged that tools/review/fill_known.json does not list. Needs Playwright and Chromium (as the other checkers). */
const fs = require('fs'), path = require('path'), os = require('os');
const H = require('./harness');
const args = process.argv.slice(2), opt = k => args.includes(k) ? args[args.indexOf(k) + 1] : null;
const SETS = (opt('--set') || 'gideon,people,bots,props,shops,harbor').split(','), ONLY = opt('--only'), THR = +(opt('--thr') || 400), REV = opt('--rev');
const OUT = opt('--out') || fs.mkdtempSync(path.join(os.tmpdir(), 'tipsy-fill-'));
let KNOWN = {}; try { KNOWN = JSON.parse(fs.readFileSync(path.join(__dirname, 'fill_known.json'), 'utf8')); } catch(e){}
const src = fs.readFileSync(path.join(H.ROOT, 'game/index.html'), 'utf8');
const UNIFORMS = [...new Set([...src.matchAll(/const ([A-Z][A-Z0-9_]*_UNIFORM) = /g)].map(m => m[1]))];

(async () => {
  const h = await H.open({ width: 900, height: 1300, rev: REV, instr: SETS.includes('shops') }); await h.boot();
  const res = await h.page.evaluate(async ([SETS, ONLY, THR, UNIFORMS]) => {
    const s = game.scene.getScene('world'); zoomSet(1); s.K = s.K*2; const px = s.ow.px, py = s.ow.py;
    const g = s.add.graphics(); g.setDepth(1e9); const bg = s.add.graphics(); bg.setDepth(1e9 - 1); const cam = s.cameras.main;
    bg.fillStyle(0xdfe3e6, 1).fillRect(cam.scrollX - 3000, cam.scrollY - 3000, 9000, 9000);
    const raf = () => new Promise(r => requestAnimationFrame(r));
    const snap = () => new Promise(res => game.renderer.snapshotArea(230, 0, 440, 560, i => { const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const x = c.getContext('2d'); x.drawImage(i, 0, 0); res([x.getImageData(0, 0, c.width, c.height), c]); }));
    /* the cases: [name, draw(heading)] */
    const CASES = [];
    if(SETS.includes('gideon')){
      for(const key of Object.keys(GD_SHAPES)) for(const [id] of GD_SHAPES[key]){ if(id === GD_DEFAULT[key] || id === 'none') continue;
        CASES.push([`gideon:${key}:${id}`, f => { GD_LIVE = Object.assign({ packStyle: 'none' }, { [key]: id, shoeCol: 'red', decalCol: 'red' }); s.drawHumanoid(g, px, py, 0, 0, f, { look: gideonParts(), walk: 0 }); }]); }
      CASES.push(['gideon:stock', f => { GD_LIVE = {}; s.drawHumanoid(g, px, py, 0, 0, f, { look: gideonParts(), walk: 0 }); }]);
    }
    if(SETS.includes('people')){
      const b = rosterBody(3);
      for(const n of UNIFORMS){ let U; try { U = (0, eval)(n); } catch(e){ continue; } if(!U || typeof U !== 'object' || !U.shirt) continue;
        CASES.push([`people:${n}`, f => { s.drawPersonHull(g, px, py, 0, f*Math.PI/2 - Math.PI/2 + 0.0, b.build, b.skin, U.shirt, U.pants, b.hair, U.shoe, 0, false, 0, 0, null, U, true, null); }]); }
      for(let seed = 1; seed <= 24; seed++){ const r = rosterBody(seed*7);
        CASES.push([`people:street${seed}`, f => { const L = streetLook(seed*7 >>> 0, { adult: true }); s.drawPersonHull(g, px, py, 0, f*Math.PI/2 - Math.PI/2, L.build, L.skin, L.shirt, L.pants, L.hair, L.shoe, 0, false, 0, 0, null, L.uniform, true, null); }]); }
    }
    if(SETS.includes('bots') && typeof BOTS === 'object'){
      for(const k of Object.keys(BOTS)) CASES.push([`bots:${k}`, f => { s.drawBot(g, k, px, py, 0, 0, f, 0, 7, { walk: 0, gait: 0, roll: 0, reach: 0 }); }]);
    }
    if(SETS.includes('props')){
      /* every street prop and vehicle drawProp dispatches by kind (ground marks, people and animals are other sets' or have no hull) */
      const KINDS = ['ambulance', 'beertruck', 'bin', 'cessna', 'cone', 'firetruck', 'flatbed', 'fueltruck', 'hydrant', 'hydrantBurst', 'hydrantFlood', 'jet', 'lamp', 'palm', 'palmDwarf', 'planter', 'scooter', 'signalpost', 'tipseyvan', 'trash', 'twin', 'twinopen', 'van', 'semiflat', 'robotaxi', 'avpod', 'dronelift'];
      for(const k of KINDS) CASES.push([`props:${k}`, f => { s.drawProp(g, k, px, py, 0, f, 0, 0, 7, null); }]);
    }
    if(SETS.includes('harbor')){
      /* the harbor's dry-docked boats on their trailers (drawHarborTrailer, 12 seeds: skiffs and cruisers) and each boat kind afloat */
      for(let k = 0; k < 12; k++) CASES.push([`harbor:trailer${k}`, f => { s.drawHarborTrailer(g, px, py, k); }, 1]);
      for(const kind of ['skiff', 'motor', 'sail', 'yacht', 'pontoon', 'tug', 'trawler', 'ferry', 'jetski', 'drone', 'watertaxi']) CASES.push([`harbor:boat-${kind}`, f => {
        const sh = LIB.get('Harbor Boat'); if(sh) sh._boat = { kind, L: 800, hull: '#f6f3ea', trim: '#1f3a4d', side: f % 2 ? 1 : -1 };
        try { LIB.draw('Harbor Boat', g, (a, b, h) => s.W(px + b, py - a, h), null, s.K*2, null, true); } finally { if(sh) sh._boat = null; } }, 2]);
    }
    if(SETS.includes('shops') && window.__RVK_shops){
      /* every entry of the shop library (shops, houses, landmarks), drawn alone at its own scale (the entry fitted to the frame, never smaller than 0.3 so a
         big site is not a speck): an entry bigger than the frame is tiled, at most 3 x 3 over its middle (the two 'headings' are tiles) */
      const bounds = name => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; const gt = s.add.graphics().setVisible(false);
        const Gm = (a, b, h) => { const x = a - b, y = (a + b)/2 - h; if(isFinite(x) && isFinite(y)){ x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return { x, y }; };
        try { LIB.draw(name, gt, Gm, null, 1, null, true, false); } catch(e){} gt.destroy();
        if(!(x1 > x0)) return null; const w = x1 - x0, hgt = y1 - y0, k = Math.max(0.3, Math.min(420/w, 540/hgt));
        const tw = 420/k, th = 540/k, nx = Math.min(3, Math.ceil(w/tw)), ny = Math.min(3, Math.ceil(hgt/th));
        return { x0, y0, w, h: hgt, k, tw, th, nx, ny }; };
      for(const sh of window.__RVK_shops()){ const name = sh.name, B = bounds(name); if(!B) continue;
        CASES.push([`shops:${name}`, f => { const ix = f % B.nx, iy = Math.floor(f/B.nx);
          const ox = B.x0 + (B.w - B.nx*B.tw)/2 + ix*B.tw, oy = B.y0 + (B.h - B.ny*B.th)/2 + iy*B.th;
          const G = (a, b, h) => ({ x: cam.scrollX + 240 + (a - b - ox)*B.k, y: cam.scrollY + 10 + ((a + b)/2 - h - oy)*B.k });
          LIB.draw(name, g, G, null, B.k, null, true, false); }, B.nx*B.ny]); }
    }
    const run = ONLY ? CASES.filter(c => c[0].startsWith(ONLY) || c[0].split(':').slice(1).join(':').startsWith(ONLY.replace(/^[a-z]+:/, ''))) : CASES;
    const real = window.convexHull, fake = p => [p[0], p[0], p[0]], out = [];
    for(let w = 0; w < 3; w++){ GD_LIVE = {}; g.clear(); s.drawHumanoid(g, px, py, 0, 0, 0, { look: gideonParts(), walk: 0 }); await raf(); await raf(); await snap(); }   // (warm-up: the first frames differ from the rest)
    for(const [name, draw, nh] of run) for(let f = 0; f < (nh || 4); f++){
      let A, B;
      try { g.clear(); draw(f); await raf(); await raf(); A = await snap(); window.convexHull = fake; g.clear(); draw(f); await raf(); await raf(); B = await snap(); }
      catch(e){ out.push([name, f, -1, String(e).slice(0, 80), null]); window.convexHull = real; continue; }
      window.convexHull = real;
      const w = A[0].width, hh = A[0].height, m = new Uint8Array(w*hh), da = A[0].data, db = B[0].data;
      for(let i = 0; i < w*hh; i++) m[i] = Math.max(Math.abs(da[i*4] - db[i*4]), Math.abs(da[i*4 + 1] - db[i*4 + 1]), Math.abs(da[i*4 + 2] - db[i*4 + 2])) > 14 ? 1 : 0;
      const eroded = new Uint8Array(w*hh); let n = 0;
      for(let y = 2; y < hh - 2; y++) for(let x = 2; x < w - 2; x++){ let ok = 1; for(let dy = -2; dy <= 2 && ok; dy++) for(let dx = -2; dx <= 2; dx++) if(!m[(y + dy)*w + x + dx]){ ok = 0; break; } if(ok){ eroded[y*w + x] = 1; n++; } }
      let url = null;
      if(n >= THR){ const ctx = A[1].getContext('2d'), od = ctx.getImageData(0, 0, w, hh); for(let i = 0; i < w*hh; i++) if(eroded[i]){ od.data[i*4] = 255; od.data[i*4 + 1] = 0; od.data[i*4 + 2] = 200; } ctx.putImageData(od, 0, 0); url = A[1].toDataURL('image/png'); }
      out.push([name, f, n, null, url]);
    }
    return out;
  }, [SETS, ONLY, THR, UNIFORMS]);
  await h.close();
  const by = {};
  for(const [name, f, n, err, url] of res){ const e = by[name] = by[name] || { heads: [], err: null }; if(err) e.err = err; else if(n >= THR){ e.heads.push([f, n]); fs.writeFileSync(path.join(OUT, name.replace(/[^\w.-]+/g, '_') + '_h' + f + '.png'), Buffer.from(url.split(',')[1], 'base64')); } }
  let fresh = 0, known = 0, errs = 0;
  for(const name of Object.keys(by)){ const e = by[name];
    if(e.err){ errs++; console.log(`  ERROR  ${name}: ${e.err}`); continue; }
    if(!e.heads.length) continue;
    const k = KNOWN[name]; if(k) known++; else fresh++;
    console.log(`  ${k ? 'known' : 'FLAG '}  D-FILL ${name}  headings ${e.heads.map(([f, n]) => f + ':' + n).join(' ')}${k ? '  (' + k.note + ')' : ''}`);
  }
  console.log(`\nfill check: ${Object.keys(by).length} cases, ${fresh} flagged, ${known} known, ${errs} errors${fresh ? '  -- pictures in ' + OUT : ''}`);
  process.exit(fresh ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
