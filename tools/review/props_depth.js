/* STREET PROPS' DEPTH TEST (props kit SP13 -- Sir, 2026-11-22, the street lamp's arm and head: "we need to create a kit for this type of
   street issue so that we can get it contained and fixed globally for all street builds"). The rooms' W37 checker reads the shop
   library's primitives; the street's props (lamps, signals, hydrants, bins, palms, scooters, the fleet ...) are the scene's own drawers
   (drawProp, quadOn), which it never sees. This draws each prop kind alone, in each facing, and records every face it paints with the
   world points it was built from (the scene's W() wrapped: each screen point traced to its x, y, z). Then it paints them again, in their
   order, into a depth grid: wherever a face lands on a pixel a NEARER face already holds (x + y + z, toward the eye; more than about a
   unit nearer -- a decal laid on a face, soil inset under a rim, is not), it is painted over
   something in front of it -- a W37 fault, whatever the shapes (an arm's end over the head it runs into, a lens over its housing, legs
   after the seat).
   node tools/review/props_depth.js [kind,kind..] [--png dir] [--min px]
     kinds   default: every street prop (the gate); --fleet adds the vehicles, advisory (people and dogs: people_depth.js)
     --png   each faulty prop drawn alone, 6x, the fault pixels magenta, the two faces' source lines listed
     --min   fault pixels (at 4 per unit) a pair needs to be listed (default 12)
   exits 1 on any fault */
const H = require('./harness.js'), fs = require('fs'), path = require('path');
const args = process.argv.slice(2), arg = (k, d) => args.includes(k) ? args[args.indexOf(k) + 1] : d;
/* the street's props: the gate. The fleet (vehicles, robots on wheels): listed, advisory -- their wheel arches are a hole painted dark
   and the well's lip seen through it, which this test reads as paint over a nearer face (the vehicles kit has its own checker) */
const STREET = ['lamp', 'signalpost', 'hydrant', 'bin', 'cone', 'planter', 'palm', 'palmDwarf', 'trash', 'can', 'paper', 'scooter',
  'robot', 'courierbot', 'cargobot', 'patrolbot', 'amr'];
const FLEET = ['humanoid', 'avpod', 'avshuttle', 'avsweeper', 'avgarbage', 'avdump', 'avforklift', 'avsemi', 'robotaxi', 'van', 'tipseyvan',
  'ambulance', 'firetruck', 'flatbed', 'fueltruck', 'beertruck', 'burrito'];
const KINDS_ALL = STREET.concat(args.includes('--fleet') ? FLEET : []);
const pos = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
const KINDS = pos ? pos.split(',') : KINDS_ALL, PNG = arg('--png', null), MIN = +arg('--min', 12);
(async () => {
  const out = [], perrs = [];
  for(let c = 0; c < KINDS.length; c += 5){                   // (a fresh page every five kinds: one page for all of them runs out of memory)
  const h = await H.open(); await h.boot();
  out.push(...await h.page.evaluate(([KINDS, MIN, PNG]) => {
    const s = game.scene.getScene('world'), R = 4, res = [];
    const lineOf = () => { const st = new Error().stack.split('\n'); for(const l of st){ const m = l.match(/index\.html:(\d+):\d+/); if(m && !/props_depth|quadOn|hullRuns|fillPoints/.test(l)) return +m[1]; } return 0; };
    for(const kind of KINDS) for(const fdir of [0, 1, 2, 3]){
      /* the prop alone, at the camera's own point, nothing else drawn */
      const X = s.camX, Y = s.camY, faces = [], byObj = new WeakMap(), byXY = new Map();
      const W0 = s.W; s.W = function(x, y, z){ const p = W0.call(this, x, y, z); const w = [x - X, y - Y, z]; byObj.set(p, w);
        const k = Math.round(p.x*100) + ',' + Math.round(p.y*100); byXY.set(k, byXY.has(k) && byXY.get(k) && byXY.get(k).join() !== w.join() ? null : w); return p; };
      const g = s.add.graphics(); let col = 0, alp = 1;
      const fs0 = g.fillStyle.bind(g); g.fillStyle = (c, a) => { col = c; alp = a == null ? 1 : a; return fs0(c, a); };
      const fp0 = g.fillPoints.bind(g); g.fillPoints = (pts, ...r) => {
        const w3 = pts.map(p => byObj.get(p) || byXY.get(Math.round(p.x*100) + ',' + Math.round(p.y*100)) || null);
        /* (a translucent face -- shading laid over a part, a crease -- is paint, not a part) */
        faces.push({ w3: w3.every(Boolean) && alp > 0.95 ? w3 : null, col, line: lineOf() }); return fp0(pts, ...r); };
      const save = { xr: XRAY.propMax, vb: s._visBlocks }; XRAY.propMax = 0; s._visBlocks = null;
      try { s.drawProp(g, kind, X, Y, 1000, fdir, 0, 0, 7, null); } catch(e){ res.push({ kind, fdir, err: String(e).slice(0, 100) }); }
      XRAY.propMax = save.xr; s._visBlocks = save.vb; s.W = W0; g.destroy();
      /* the depth grid */
      const F = faces.map((f, i) => Object.assign(f, { i })).filter(f => f.w3 && f.w3.length >= 3);
      const pr = ([x, y, z]) => [(x - y)*R, ((x + y)/2 - z)*R];
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for(const f of F){ f.s = f.w3.map(pr); for(const [sx, sy] of f.s){ x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy); } }
      if(!F.length){ res.push({ kind, fdir, faces: faces.length, traced: 0, pairs: [] }); continue; }
      x0 = Math.floor(x0); y0 = Math.floor(y0); const GW = Math.ceil(x1) - x0 + 1, GH = Math.ceil(y1) - y0 + 1;
      const top = new Int32Array(GW*GH).fill(-1), dep = new Float32Array(GW*GH), pairs = new Map(), bad = PNG ? new Uint8Array(GW*GH) : null;
      for(const f of F){
        /* its plane: the first three points that span it; depth at a screen point from it */
        const P = f.w3; let pl = null;
        for(let a = 1; a < P.length - 1 && !pl; a++) for(let b = a + 1; b < P.length && !pl; b++){
          const e1 = [P[a][0] - P[0][0], P[a][1] - P[0][1], P[a][2] - P[0][2]], e2 = [P[b][0] - P[0][0], P[b][1] - P[0][1], P[b][2] - P[0][2]];
          const s1 = [(e1[0] - e1[1])*R, ((e1[0] + e1[1])/2 - e1[2])*R], s2 = [(e2[0] - e2[1])*R, ((e2[0] + e2[1])/2 - e2[2])*R], det = s1[0]*s2[1] - s1[1]*s2[0];
          if(Math.abs(det) > 1e-3) pl = { e1, e2, s1, s2, det }; }
        if(!pl) continue;                                                     // (edge-on: a line, nothing to paint)
        /* (not flat -- a cylinder's whole silhouette, a hull in one polygon: its depth is not one plane's. It covers what it covers,
           unknown, and is checked against nothing) */
        const nx = pl.e1[1]*pl.e2[2] - pl.e1[2]*pl.e2[1], ny = pl.e1[2]*pl.e2[0] - pl.e1[0]*pl.e2[2], nz = pl.e1[0]*pl.e2[1] - pl.e1[1]*pl.e2[0], nl = Math.hypot(nx, ny, nz) || 1;
        const flat = P.every(q => Math.abs(nx*(q[0] - P[0][0]) + ny*(q[1] - P[0][1]) + nz*(q[2] - P[0][2]))/nl < 0.6);
        f.flat = flat;
        const d0 = P[0][0] + P[0][1] + P[0][2], o = f.s[0], de1 = pl.e1[0] + pl.e1[1] + pl.e1[2], de2 = pl.e2[0] + pl.e2[1] + pl.e2[2];
        let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9; for(const [sx, sy] of f.s){ bx0 = Math.min(bx0, sx); bx1 = Math.max(bx1, sx); by0 = Math.min(by0, sy); by1 = Math.max(by1, sy); }
        for(let py = Math.ceil(by0); py <= by1; py++) for(let px = Math.ceil(bx0); px <= bx1; px++){
          let inside = false; for(let i = 0, j = f.s.length - 1; i < f.s.length; j = i++){ const [xi, yi] = f.s[i], [xj, yj] = f.s[j];
            if((yi > py) !== (yj > py) && px < (xj - xi)*(py - yi)/(yj - yi) + xi) inside = !inside; }
          if(!inside) continue;
          const dx = px - o[0], dy = py - o[1], u = (dx*pl.s2[1] - dy*pl.s2[0])/pl.det, v = (pl.s1[0]*dy - pl.s1[1]*dx)/pl.det, d = d0 + u*de1 + v*de2;
          const k = (py - y0)*GW + (px - x0), t = top[k];
          if(!flat){ top[k] = -1; continue; }
          if(t >= 0 && d < dep[k] - 3.5){ const key = t + '>' + f.i; pairs.set(key, (pairs.get(key) || 0) + 1); if(bad) bad[k] = 1; }
          top[k] = f.i; dep[k] = d;
        }
      }
      const list = [...pairs].filter(([, n]) => n >= MIN).map(([k, n]) => { const [e, l] = k.split('>').map(Number); return { n, over: faces[l].line, under: faces[e].line, overCol: faces[l].col.toString(16), underCol: faces[e].col.toString(16) }; });
      /* (one line per pair of source lines: a run of faces from the same two lines is one fault) */
      const merged = new Map(); for(const p of list){ const k = p.over + '/' + p.under; const m = merged.get(k); if(m) m.n += p.n; else merged.set(k, Object.assign({}, p)); }
      const r = { kind, fdir, faces: faces.length, traced: F.length, pairs: [...merged.values()].sort((a, b) => b.n - a.n) };
      if(PNG && r.pairs.length){
        const S = 6, g4 = s.add.graphics(), sx0 = x0/R, sy0 = y0/R, w = Math.ceil(GW/R*S) + 20, hh = Math.ceil(GH/R*S) + 20;
        g4.fillStyle(0xffffff, 1); g4.fillRect(0, 0, w, hh);
        for(const f of faces) if(f.w3){ g4.fillStyle(f.col, 1); g4.fillPoints(f.w3.map(([x, y, z]) => ({ x: ((x - y) - sx0)*S + 10, y: (((x + y)/2 - z) - sy0)*S + 10 })), true); }
        g4.fillStyle(0xff00ff, 1); for(let k = 0; k < bad.length; k++) if(bad[k]){ const px = k % GW, py = (k - px)/GW; g4.fillRect(px/R*S + 10, py/R*S + 10, S/R + 0.5, S/R + 0.5); }
        g4.generateTexture('__pd', w, hh); g4.destroy(); r.png = s.textures.getBase64('__pd'); s.textures.remove('__pd');
      }
      res.push(r);
    }
    return res; }, [KINDS.slice(c, c + 5), MIN, PNG]));
  perrs.push(...h.errs); await h.close(); }
  let bad = 0, fleetBad = 0;
  if(PNG) fs.mkdirSync(PNG, { recursive: true });
  for(const r of out){
    if(r.err){ console.log(r.kind + ' @' + r.fdir + '  error ' + r.err); continue; }
    const cov = r.faces ? Math.round(100*r.traced/r.faces) : 0;
    if(!r.pairs.length){ if(args.includes('--all')) console.log(r.kind.padEnd(12) + ' @' + r.fdir + '  clean  (' + r.traced + '/' + r.faces + ' faces traced)'); continue; }
    if(FLEET.includes(r.kind)) fleetBad++; else bad++;
    console.log(r.kind.padEnd(12) + ' @' + r.fdir + '  ' + r.pairs.length + ' fault(s)  (' + r.traced + '/' + r.faces + ' faces traced, ' + cov + '%)');
    for(const p of r.pairs.slice(0, 12)) console.log('    line ' + p.over + ' painted over line ' + p.under + ' in front of it  (' + p.n + ' px; #' + p.overCol + ' over #' + p.underCol + ')');
    if(PNG && r.png){ const fn = path.join(PNG, r.kind + '_' + r.fdir + '.png'); fs.writeFileSync(fn, Buffer.from(r.png.split(',')[1], 'base64')); console.log('    -> ' + fn); }
  }
  console.log('\n' + out.length + ' prop facings checked, ' + bad + ' street ones with faults' + (fleetBad ? ', ' + fleetBad + ' of the fleet (advisory)' : ''));
  if(perrs.length) console.log('page errors', perrs);
  process.exit(bad || out.some(r => r.err && !FLEET.includes(r.kind)) ? 1 : 0);
})();
