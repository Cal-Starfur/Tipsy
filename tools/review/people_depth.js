/* THE PEOPLE DEPTH TEST (people kit P21 / P22, Sir, 2026-11-20: "why was this not caught by our rules?"). people_hull.js asks one
   question of the body's parts (the far arm over the torso); this one asks it of every face the person drawer paints: is it painted
   over a face that is NEARER the eye? A real depth test, a z-buffer kept beside the painter's order:

     every point the drawer makes goes through the scene's W(x, y, z), which is wrapped here (nothing in the game changes, so it runs on
     an old build too, --rev): each point carries its depth, x + y + z (the view runs along (1, 1, 1): what is nearer has more of it).
     Every face (quadOn) is laid into the buffer, its depth across it from its corners'. Where a face is laid over a pixel whose depth
     is nearer than its own by more than TOL, that is a fault: a brim over its crown, a band's filled disc over what it wraps, a sleeve's
     end over the arm coming out of it, the jaw over the hair, the far arm over the body.

   A piece's filled silhouette (the hull a limb or a prism lays first, so no seam shows) is a face too, its depth from its corners --
   a rough one: a review list, not a gate. Each fault is the pair: what was there, what went over it (the body's part marks,
   drawPersonHullBody's this._pTag), and its size in pixels.

   node tools/review/people_depth.js [--rev <git ref>] [--look name] [--png dir] [--scale 3] [--lod 0] [--list]      a review list, exits 0

   THE GATE (Sir, 2026-11-20: "create the corresponding tool to keep the consistancy from here forward for all people"):
   node tools/review/people_depth.js --gate      compares every case (look, pose, facing, what was under and what went over) with
     tools/review/people_depth_baseline.json and FAILS (exit 1) on any that is new or has grown (more than a quarter and 40 px): a
     change to how people are drawn may not add a fault. Run it after any change to the person drawer, a look or a pose.
   node tools/review/people_depth.js --update    writes the baseline -- after a fix (the numbers only go down), or when Sir has
     agreed a new one is right; commit the baseline with that change. Both at the gate's own settings (scale 3, view 1, every look) */
const H = require('./harness.js'), fs = require('fs'), path = require('path');
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const REV = arg('--rev'), PNG = arg('--png'), ONLY = arg('--look'), SCALE = +(arg('--scale') || 3), LOD = +(arg('--lod') || 0);
const LOOKS = [['man', 11, { type: 'man', heavy: false }], ['woman', 12, { type: 'woman', heavy: false }], ['heavy', 13, { type: 'man', heavy: true }],
  ['business', 15, { type: 'business' }], ['jogger', 16, { type: 'jogger' }], ['skater', 17, { type: 'skater' }], ['worker', 18, { type: 'worker' }],
  ['elderWoman', 19, { type: 'elderWoman' }], ['surfer', 4, { type: 'surfer' }], ['punk', 8, { type: 'punk' }], ['postie', 5, { type: 'postie' }],
  ['tourist', 9, { type: 'tourist' }], ['kid', 21, { type: 'kid' }], ['cane', 22, { type: 'cane' }], ['humanoid', 0, null],
  /* (Gideon dressed: his wardrobe's hats, packs, aprons and neck pieces, round six of him -- the hats are the tourists' too) */
  ['gideonA', 0, { hat: 'cap', packStyle: 'jet', apron: 'vest', neck: 'scarf' }], ['gideonB', 0, { hat: 'cowboy', packStyle: 'satchel', apron: 'cape', neck: 'chain' }],
  ['gideonC', 0, { hat: 'tophat', packStyle: 'wings', apron: 'coat', neck: 'bandana' }], ['gideonD', 0, { hat: 'hardhat', packStyle: 'solar', apron: 'toolbelt', neck: 'collar' }],
  ['gideonE', 0, { hat: 'bucket', packStyle: 'backpack', apron: 'poncho', neck: 'lanyard' }], ['gideonF', 0, { hat: 'crown', packStyle: 'dish', apron: 'harness', neck: 'ascot' }]].filter(l => !ONLY || l[0] === ONLY);
(async () => {
  const h = await H.open({ rev: REV || null }); await h.boot();
  const res = await h.page.evaluate(async ({ LOOKS, png, S, LOD, DBG }) => {
    const sc = game.scene.getScene('world'), CW = 115*S, CH = 165*S, TOL = 2.5, MINPX = Math.max(4, Math.round(1.5*S*S));
    const FACES = [0, 1, 2, 3, 4, 5, 6, 7].map(k => k*Math.PI/4);
    const POSES = [['stand', {}], ['walk', { walk: 1.1, moving: true }], ['table', { pose: { lift: [0.28, 0.28], bend: [1.1, 1.1] } }],
      ['raised', { lift: 0.6 }], ['sit', { pose: { sit: 35 } }]];
    const W0 = sc.W, Q0 = sc.quadOn, CH0 = window.convexHull;
    /* a piece's filled silhouette is laid through convexHull: marked, so it is told from a face */
    window.convexHull = function(pts){ const r = CH0(pts); try { r.__hull = true; } catch(e){} return r; };
    let rec = null, tag = 'body';
    /* the wrap: every screen point the drawer makes keeps its depth; every face is kept with its corners' */
    const recent = new Map(), key = (x, y) => Math.round(x*2) + ',' + Math.round(y*2);
    sc.W = function(x, y, z){ const p = W0.call(this, x, y, z); if(rec){ const d = x + y + (z || 0); try { p.__d = d; } catch(e){} const k = key(p.x, p.y); let L = recent.get(k); if(!L) recent.set(k, L = []); L.push([p.x, p.y, d]); if(L.length > 6) L.shift(); } return p; };
    sc.quadOn = function(g, pts, color, alpha = 1){
      if(rec && alpha >= 0.3 && pts && pts.length >= 3){
        const q = []; let ok = true;
        for(const p of pts){ let d = p.__d;
          if(d == null){ let best = 1e9;   // (a point copied from one the drawer made -- grown half a pixel: the NEAREST made point's depth, never just the first one near)
            for(let dx = -2; dx <= 2; dx++) for(let dy = -2; dy <= 2; dy++){ const L = recent.get((Math.round(p.x*2) + dx) + ',' + (Math.round(p.y*2) + dy)); if(!L) continue;
              for(const [x, y, v] of L){ const e = (x - p.x)*(x - p.x) + (y - p.y)*(y - p.y); if(e < best){ best = e; d = v; } } }
            if(best > 1.2) d = null; }
          if(d == null){ ok = false; break; } q.push([p.x, p.y, d]); }
        if(ok) rec.push({ q, tag, n: rec.length, hull: !!pts.__hull });
      }
      return Q0.call(this, g, pts, color, alpha); };
    sc._pTag = t => { tag = t; };
    const sv = { camX: sc.camX, camY: sc.camY, camZ: sc.camZ, K: sc.K, cx: sc.cx, cy: sc.cy, lod: sc._pLodFix };
    const out = [], pngs = [], dbg = [];
    for(const [name, seed, opts] of LOOKS){
      /* (the humanoid robot, Cratewell's line and Gideon: the same drawer in his shell, HUMANOID_SKIN on the uniform -- drawHumanoid's) */
      const L = name.startsWith('gideon') ? { build: HUMANOID_BUILD, skin: HUMANOID_WHITE, shirt: HUMANOID_WHITE, pants: HUMANOID_WHITE, hair: HUMANOID_WHITE, shoe: HUMANOID_FOOT, dress: null,
          uniform: Object.assign({}, HUMANOID_SKIN, { robot: Object.assign({}, HUMANOID_SKIN.robot, { hatCol: 0x2f6fb0, outCol: 0xd9892b }, opts) }) }
        : name === 'humanoid' ? { build: HUMANOID_BUILD, skin: HUMANOID_WHITE, shirt: HUMANOID_WHITE, pants: HUMANOID_WHITE, hair: HUMANOID_WHITE, shoe: HUMANOID_FOOT, uniform: HUMANOID_SKIN, dress: null }
        : name === 'kid' ? Object.assign({ kind: 'kid' }, partyLook(seed, 'kid')) : streetLook(seed, opts);
      Object.assign(sc, { camX: 0, camY: 0, camZ: 0, K: S }); sc._roomPerson = true; sc._pLodFix = LOD;
      const Wd = CW*FACES.length, Hd = CH*POSES.length;
      const g = sc.add.graphics(); g.fillStyle(0xf4f1ea, 1); g.fillRect(0, 0, Wd, Hd);
      const marks = [];
      POSES.forEach(([pn, P], r) => FACES.forEach((th, c) => {
        rec = []; recent.clear(); tag = 'body';
        sc.cx = CW*c + CW/2; sc.cy = CH*r + CH - 20*S;
        try { sc.drawPersonHullBody(g, 0, 0, 0, th, L.build, L.skin, L.shirt, L.pants, L.hair, L.shoe, P.walk ? walkSin(P.walk) : 0, !!P.moving, 0, P.lift || 0, null, L.uniform, false, Object.assign({ dress: L.dress }, P.pose || {})); }
        finally { const R = rec; rec = null;
          /* the z-buffer: this cell's own */
          const x0 = CW*c, y0 = CH*r, Z = new Float32Array(CW*CH).fill(-1e9), O = new Int32Array(CW*CH).fill(-1), F = new Int32Array(CW*CH).fill(-1), pairs = new Map();
          /* THE LIDS: a piece's silhouette (its hull) is the base coat its own faces paint over; what of it none of them covers is a flat disc
             left lying over whatever it hides -- a band's filled middle over the crown it wraps, a sleeve's open end over the arm */
          let hullPx = null, hullTag = '', hullN = -1; const lids = [];
          const hulls = [];
          const closePiece = () => { if(!hullPx) return; hulls.push([hullPx, hullTag, hullN]); hullPx = null; };
          const lidsAtEnd = () => { for(const [set, t, hn] of hulls){ let n = 0, pts = []; const ex = i => O[i] === -2 - hn;   // (still showing when the whole person is drawn, and solid: a pixel and its four neighbours -- a silhouette's edge-on sliver is not a lid)
              for(const i of set) if(ex(i) && ex(i - 1) && ex(i + 1) && ex(i - CW) && ex(i + CW)){ n++; if(pts.length < 4000) pts.push(i % CW + x0, (i/CW | 0) + y0); }
            if(n >= MINPX*2) lids.push({ tag: t, px: n, pts }); } };
          const raster = (q, fn) => { for(let t = 1; t < q.length - 1; t++){ const A = q[0], B = q[t], C = q[t + 1];
              const minx = Math.max(0, Math.floor(Math.min(A[0], B[0], C[0]) - x0)), maxx = Math.min(CW - 1, Math.ceil(Math.max(A[0], B[0], C[0]) - x0));
              const miny = Math.max(0, Math.floor(Math.min(A[1], B[1], C[1]) - y0)), maxy = Math.min(CH - 1, Math.ceil(Math.max(A[1], B[1], C[1]) - y0));
              const den = (B[1] - C[1])*(A[0] - C[0]) + (C[0] - B[0])*(A[1] - C[1]); if(Math.abs(den) < 1e-6) continue;
              for(let py = miny; py <= maxy; py++) for(let px = minx; px <= maxx; px++){ const X = px + x0 + 0.5, Y = py + y0 + 0.5;
                const w1 = ((B[1] - C[1])*(X - C[0]) + (C[0] - B[0])*(Y - C[1]))/den, w2 = ((C[1] - A[1])*(X - C[0]) + (A[0] - C[0])*(Y - C[1]))/den, w3 = 1 - w1 - w2;
                if(w1 < -1e-4 || w2 < -1e-4 || w3 < -1e-4) continue;
                fn(py*CW + px, w1*A[2] + w2*B[2] + w3*C[2], px + x0, py + y0); } } };
          for(const f of R){
            if(f.hull){ closePiece(); hullPx = new Set(); hullTag = f.tag; hullN = f.n;
              raster(f.q, i => { hullPx.add(i); O[i] = -2 - f.n; Z[i] = -1e9; F[i] = -1; }); continue; }   // (its silhouette: no depth of its own -- what it covers is hidden, what covers it is judged by its faces)
            if(hullPx && f.tag !== hullTag) closePiece();
            raster(f.q, (i, d, X, Y) => {
              F[i] = (O[i] >= 0 && O[i] !== f.n && Z[i] > d + TOL) ? O[i] : -1;   // (a fault while it shows: what it was laid over, nearer; anything laid over it later decides again)
              Z[i] = d; O[i] = f.n; }); }
          /* the faults still showing when the whole person is drawn, by the pair of faces */
          for(let i = 0; i < CW*CH; i++){ if(F[i] < 0 || O[i] < 0) continue; const u = R[F[i]], v = R[O[i]], k = u.n + '<' + v.n;
            const e = pairs.get(k) || { under: u.tag, over: v.tag, px: 0, pts: [], a: u, b: v, dz: 0 }; e.px++; if(e.pts.length < 4000) e.pts.push(i % CW + x0, (i/CW | 0) + y0); pairs.set(k, e); }
          closePiece(); lidsAtEnd();
          for(const l of lids){ out.push({ look: name, pose: pn, facing: Math.round(th*180/Math.PI), under: 'lid', over: l.tag, px: l.px, pieces: 1 }); for(let j = 0; j < l.pts.length; j += 2) marks.push(l.pts[j], l.pts[j + 1]); }
          /* the faults, by part pair (each piece pair a fault of its own; small ones dropped) */
          const byPart = new Map();
          if(DBG && DBG === name + ':' + pn + ':' + Math.round(th*180/Math.PI)) for(const e of pairs.values()) if(e.px >= MINPX) dbg.push( e.under + '#' + e.a.n + ' (' + e.a.q.length + ' pts, d ' + e.a.q.map(v => v[2].toFixed(1)).join('/') + ') under ' + e.over + '#' + e.b.n + ' (' + e.b.q.length + ' pts, d ' + e.b.q.map(v => v[2].toFixed(1)).join('/') + ') ' + e.px + 'px, by ' + e.dz.toFixed(1));
          for(const e of pairs.values()){ if(e.px < MINPX) continue; const k = e.under + ' under ' + e.over; const b = byPart.get(k) || { under: e.under, over: e.over, px: 0, n: 0 }; b.px += e.px; b.n++; byPart.set(k, b); for(let j = 0; j < e.pts.length; j += 2) marks.push(e.pts[j], e.pts[j + 1]); }
          for(const b of byPart.values()) out.push({ look: name, pose: pn, facing: Math.round(th*180/Math.PI), under: b.under, over: b.over, px: b.px, pieces: b.n });
        } }));
      g.generateTexture('__pd', Wd, Hd); g.destroy();
      if(png && marks.length){ const d = sc.textures.getBase64('__pd'); const im = new Image(); await new Promise(r => { im.onload = r; im.src = d; });
        const cv = document.createElement('canvas'); cv.width = Wd; cv.height = Hd; const x = cv.getContext('2d'); x.drawImage(im, 0, 0);
        x.fillStyle = 'rgba(255,0,200,0.85)'; for(let j = 0; j < marks.length; j += 2) x.fillRect(marks[j], marks[j + 1], 1, 1);
        pngs.push([name, cv.toDataURL('image/png')]); }
      sc.textures.remove('__pd');
    }
    sc.W = W0; sc.quadOn = Q0; sc._pTag = null; window.convexHull = CH0;
    Object.assign(sc, { camX: sv.camX, camY: sv.camY, camZ: sv.camZ, K: sv.K, cx: sv.cx, cy: sv.cy }); sc._pLodFix = sv.lod; sc._roomPerson = false;
    return { out, pngs, dbg };
  }, { LOOKS, png: !!PNG, S: SCALE, LOD, DBG: arg('--dbg') });
  await h.close();
  for(const l of res.dbg) console.log(l);
  if(PNG){ fs.mkdirSync(PNG, { recursive: true }); for(const [n, d] of res.pngs) fs.writeFileSync(path.join(PNG, 'depth_' + n + '.png'), Buffer.from(d.split(',')[1], 'base64')); }
  /* the summary: by part pair, then each look's worst */
  const agg = new Map(); for(const f of res.out){ const k = f.under + ' under ' + f.over; const a = agg.get(k) || { cases: 0, px: 0, looks: new Set() }; a.cases++; a.px += f.px; a.looks.add(f.look); agg.set(k, a); }
  console.log('people depth test' + (REV ? ' at ' + REV : '') + ': ' + LOOKS.length + ' looks x 8 facings x 5 poses, view ' + (LOD + 1) + '; a face painted over a nearer one, by what was under and what went over:');
  for(const [k, a] of [...agg.entries()].sort((x, y) => y[1].px - x[1].px)) console.log('  ' + k.padEnd(28) + String(a.cases).padStart(4) + ' cases  ' + String(a.px).padStart(6) + ' px   ' + [...a.looks].join(', '));
  if(process.argv.includes('--list')) for(const f of res.out.sort((x, y) => y.px - x.px)) console.log('  ' + f.look.padEnd(11) + f.pose.padEnd(7) + String(f.facing).padStart(4) + 'deg  ' + (f.under + ' under ' + f.over).padEnd(28) + f.px + ' px (' + f.pieces + ')');
  console.log(res.out.length + ' faults in all' + (h.errs && h.errs.length ? '; page errors: ' + h.errs.join(' | ') : ''));
  /* the baseline and the gate */
  const BASE = path.join(H.ROOT, 'tools/review/people_depth_baseline.json'), keyOf = f => [f.look, f.pose, f.facing, f.under + ' under ' + f.over].join('|');
  const now = {}; for(const f of res.out){ const k = keyOf(f); now[k] = (now[k] || 0) + f.px; }
  if(process.argv.includes('--update')){
    if(ONLY || REV || SCALE !== 3 || LOD !== 0){ console.log('--update needs the gate\'s own settings: every look, scale 3, view 1, this build'); process.exit(2); }
    fs.writeFileSync(BASE, JSON.stringify({ about: 'people_depth.js --gate: every depth fault people are drawn with now (look|pose|facing|under under over: px). A change may not add one or grow one; --update after a fix.', cases: now }, null, 1) + '\n');
    console.log('wrote ' + Object.keys(now).length + ' cases to ' + path.relative(H.ROOT, BASE)); }
  if(process.argv.includes('--gate')){
    if(!fs.existsSync(BASE)){ console.log('no baseline: node tools/review/people_depth.js --update'); process.exit(2); }
    const base = JSON.parse(fs.readFileSync(BASE, 'utf8')).cases, bad = [];
    for(const [k, px] of Object.entries(now)){ const b = base[k] || 0; if(px > b*1.25 + 40) bad.push([k, b, px]); }
    let better = 0; for(const [k, b] of Object.entries(base)) if((now[k] || 0) < b*0.8 - 20) better++;
    if(bad.length){ console.log('\nGATE FAIL: ' + bad.length + ' depth faults new or grown (was -> now px):'); for(const [k, b, px] of bad.sort((x, y) => (y[2] - y[1]) - (x[2] - x[1])).slice(0, 40)) console.log('  ' + k.padEnd(52) + String(b).padStart(6) + ' -> ' + px);
      console.log('look at them: --png <dir> --look <name>; fix them, or --update only once Sir agrees'); process.exit(1); }
    console.log('\nGATE PASS: no depth fault new or grown' + (better ? '; ' + better + ' cases better than the baseline -- --update to lock them in' : '')); }
})();
