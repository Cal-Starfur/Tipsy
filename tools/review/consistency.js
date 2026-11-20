/* THE LIBRARY'S CONSISTENCY HUNT (Sir, 2026-11-20: "we can use this to hunt inconsistencies too"). Every walk-in room's fixtures,
   by what their solids are called (chair, stool, table, counter, bench, desk, sofa, shelf, bed ...), measured -- height, and the
   footprint's short and long sides -- against the same kind everywhere else: the typical (median) of each kind, and every one well
   off it (over 25% in height, or 40% in its footprint's short side), listed. Writes the typical sizes into docs/kits/library.json
   (fixtures) so a new room builds to them.
   node tools/review/consistency.js [room filter] [--all]      prints the outliers; exits 0 (a review list, not a gate). The walk-ins by
   default -- the rooms held to the standards, whose sizes are the typical ones written to library.json; --all takes the older rooms too
   (docs/queue.md), and writes nothing */
const H = require('./harness.js'), fs = require('fs'), path = require('path');
const KINDS = [['workbench', /work ?bench|lab bench|potting bench|engraving bench|bench top/], ['locker', /locker/], ['wardrobe', /wardrobe/],
  ['chair', /\bchairs?\b|armchair/], ['stool', /stool/], ['bench', /bench|pew/], ['sofa', /sofa|couch|settee/],
  ['desk', /\bdesk/], ['counter', /counter|\bbar\b|till/], ['table', /\btables?\b/],
  ['shelf', /shel(f|ves)|rack|bookcase|gondola/], ['bed', /\bbed\b/], ['cabinet', /cabinet|chest|dresser/]];
(async () => {
  const want = process.argv.slice(2).find((a, i, A) => !a.startsWith('--') && A[i - 1] !== '--kind') || '';
  const h = await H.open(); await h.boot();
  const rows = await h.page.evaluate(([want, ALL]) => {
    const G = (a, b, z) => ({ x: a - b, y: (a + b)/2 - z }), out = [];
    const rooms = [...new Set(POCKETS.filter(p => p.walkin || ALL).map(p => p.name))].filter(n => LIB.get(n) && n.includes(want));   // (every room the library draws, the older pockets -- the ballroom -- as well as the walk-ins)
    for(const name of rooms){ const items = LIB.collect(name, G, 1) || [], seen = new Set();
      for(const it of items) for(const s of (it.solids || [])){ if(!s || !s.name) continue;
        let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
        if(s.poly) for(const [a, b] of s.poly){ a0 = Math.min(a0, a); a1 = Math.max(a1, a); b0 = Math.min(b0, b); b1 = Math.max(b1, b); }
        else if(s.c){ a0 = s.c[0] - s.r; a1 = s.c[0] + s.r; b0 = s.c[1] - s.r; b1 = s.c[1] + s.r; }
        else continue;
        const key = s.name + '|' + Math.round(a0) + ',' + Math.round(b0) + ',' + Math.round(s.h || 0); if(seen.has(key)) continue; seen.add(key);
        out.push({ room: name, name: s.name, h: s.h || 0, short: Math.min(a1 - a0, b1 - b0), long: Math.max(a1 - a0, b1 - b0), at: [Math.round((a0 + a1)/2), Math.round((b0 + b1)/2)] }); } }
    return out; }, [want, process.argv.includes('--all')]);
  await h.close();
  const kindOf = n => { const l = n.toLowerCase(); for(const [k, re] of KINDS) if(re.test(l)) return k; return null; };
  const med = a => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length/2)] : 0; };
  const by = {}; for(const r of rows){ const k = kindOf(r.name); if(k) (by[k] = by[k] || []).push(r); }
  const norms = {}, flagged = [];
  for(const [k, list] of Object.entries(by)){
    /* (a long run -- a counter, a shelf -- is cut in pieces: its footprint's short side and its height are what compare) */
    const mh = med(list.map(r => r.h)), ms = med(list.map(r => r.short));
    norms[k] = { count: list.length, height: mh, depth: ms, heightRange: [Math.min(...list.map(r => r.h)), Math.max(...list.map(r => r.h))], rooms: [...new Set(list.map(r => r.room))].length };
    for(const r of list){ const dh = mh ? (r.h - mh)/mh : 0, ds = ms ? (r.short - ms)/ms : 0;
      if(Math.abs(dh) > 0.25 || Math.abs(ds) > 0.4) flagged.push({ kind: k, ...r, dh, ds, mh, ms }); } }
  console.log(rows.length + ' solids in ' + new Set(rows.map(r => r.room)).size + ' rooms; typical sizes (median):');
  for(const [k, n] of Object.entries(norms)) console.log('  ' + k.padEnd(8) + ' height ' + String(n.height).padStart(4) + '  depth ' + String(Math.round(n.depth)).padStart(4) + '   (' + n.count + ' in ' + n.rooms + ' rooms, heights ' + n.heightRange.join('..') + ')');
  if(process.argv.includes('--kind')){ const k = process.argv[process.argv.indexOf('--kind') + 1]; const seen = {};
    for(const r of by[k] || []){ const key = r.room + '|' + r.name + '|' + r.h; (seen[key] = seen[key] || { ...r, n: 0 }).n++; }
    console.log('\nall ' + k + ':'); for(const r of Object.values(seen).sort((x, y) => x.h - y.h)) console.log('  ' + String(r.h).padStart(4) + '  ' + r.room + '  "' + r.name + '" x' + r.n + ' @' + r.at); }
  console.log('\nwell off their kind (' + flagged.length + '):');
  for(const f of flagged.sort((x, y) => x.kind.localeCompare(y.kind) || Math.abs(y.dh) - Math.abs(x.dh)))
    console.log('  ' + f.kind.padEnd(8) + f.room + ' @' + f.at + '  "' + f.name + '"  height ' + Math.round(f.h) + ' (typical ' + f.mh + (Math.abs(f.dh) > 0.25 ? ', ' + (f.dh > 0 ? '+' : '') + Math.round(f.dh*100) + '%' : '') + ')  depth ' + Math.round(f.short) + ' (typical ' + Math.round(f.ms) + (Math.abs(f.ds) > 0.4 ? ', ' + (f.ds > 0 ? '+' : '') + Math.round(f.ds*100) + '%' : '') + ')');
  /* the typical sizes into the library's database */
  if(!want && !process.argv.includes('--all')){ const fn = path.join(H.ROOT, 'docs/kits/library.json');
    if(fs.existsSync(fn)){ const db = JSON.parse(fs.readFileSync(fn, 'utf8')); db.fixtures = { about: 'Room fixtures, by kind, across every walk-in room (node tools/review/consistency.js): the typical (median) solid height and footprint depth -- build a new one to these; the outliers it lists are the inconsistencies to look at.', norms };
      fs.writeFileSync(fn, JSON.stringify(db, null, 1) + '\n'); console.log('\nwrote fixtures into', path.relative(H.ROOT, fn)); } }
})();
