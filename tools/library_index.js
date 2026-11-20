/* THE OBJECT LIBRARY'S DATABASE (docs/kits/library.json) -- Sir, 2026-11-20: "a data base", to reference what the game already draws
   before drawing something new (docs/kits/library.md, L0). Built from the game itself, so it never goes stale:
     - its tables (DOG_BREEDS, CAT_BREEDS, CAR_KINDS / CAR_BODIES, VAN_KINDS, SHOP_DOOR_LOOKS, drawProp's kinds, the *Look functions)
     - each drawable thing DRAWN ONCE, headless, at K 1 facing the same way, and measured off its pixels: its top over the ground
       (height), its silhouette's width and height on screen, and its height against a person (PERSON_H 124)
     - every drawer's line in game/index.html
   node tools/library_index.js            writes docs/kits/library.json (and prints a summary) */
const H = require('./review/harness.js'), fs = require('fs'), path = require('path');
const SRC = fs.readFileSync(path.join(H.ROOT, 'game/index.html'), 'utf8'), LINES = SRC.split('\n');
const lineOf = re => { for(let i = 0; i < LINES.length; i++) if(re.test(LINES[i])) return i + 1; return null; };
(async () => {
  const h = await H.open(); await h.boot();
  const out = await h.page.evaluate(() => {
    const sc = game.scene.getScene('world'), PH = PERSON_H;
    /* draw fn(g) round the world's origin at K 1, measure its pixels: top (height over the ground point), screen w and h */
    const measure = fn => {
      const sv = { camX: sc.camX, camY: sc.camY, camZ: sc.camZ, K: sc.K, cx: sc.cx, cy: sc.cy, rp: sc._roomPerson, pi: sc._paintIdx };
      const W = 900, Hh = 900, CX = 450, CY = 650;
      Object.assign(sc, { camX: 0, camY: 0, camZ: 0, K: 1, cx: CX, cy: CY }); sc._roomPerson = true; sc._paintIdx = null;
      const g = sc.add.graphics(); let res = null;
      try { fn(g); const key = '__libm'; g.generateTexture(key, W, Hh);
        const img = sc.textures.get(key).getSourceImage(), cv = document.createElement('canvas'); cv.width = W; cv.height = Hh;
        const cx2 = cv.getContext('2d'); cx2.drawImage(img, 0, 0); const d = cx2.getImageData(0, 0, W, Hh).data;
        let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
        for(let y = 0; y < Hh; y++) for(let x = 0; x < W; x++) if(d[(y*W + x)*4 + 3] > 40){ if(x < x0) x0 = x; if(x > x1) x1 = x; if(y < y0) y0 = y; if(y > y1) y1 = y; }
        sc.textures.remove(key);
        if(x1 >= 0) res = { screenTop: CY - y0, screenW: x1 - x0 + 1, screenH: y1 - y0 + 1, vsPerson: +((CY - y0)/PH).toFixed(2) };
      } catch(e){ res = { error: String(e).slice(0, 120) }; }
      finally { g.destroy(); Object.assign(sc, { camX: sv.camX, camY: sv.camY, camZ: sv.camZ, K: sv.K, cx: sv.cx, cy: sv.cy }); sc._roomPerson = sv.rp; sc._paintIdx = sv.pi; }
      return res;
    };
    const hex = c => typeof c === 'number' ? '#' + c.toString(16).padStart(6, '0') : c;
    const coatsOf = cs => (cs || []).map(c => ({ n: c.n, body: hex(c.body), dk: hex(c.dk), chest: hex(c.chest), ear: hex(c.ear) }));
    const pose = { t: 0, walkPhase: 0, walkAmt: 0, sit: 0, noCollar: false, tr: 0, tailCurl: DOG.tailCurl, startle: 0 };
    const db = { person: {}, dogs: [], cats: [], cars: [], vans: [], props: [], doors: {} };
    /* PEOPLE: the standard body, measured, and a sample of street looks */
    { const L = streetLook(12345, { adult: true, aid: 'none' });
      db.person = { PERSON_H: PH, height: PH, build: L.build, measured: measure(g => sc.drawPersonHull(g, 0, 0, 0, 0, L.build, L.skin, L.shirt, L.pants, L.hair, L.shoe, 0, false, 0, 0, null, L.uniform, false, { dress: L.dress })) }; }
    /* DOGS and CATS: every breed, its build numbers, its coats, measured standing */
    for(const B of DOG_BREEDS){ const look = { B, coat: B.coats[0], blindSide: 0, L: DOG.len*B.size };
      db.dogs.push({ breed: B.n, size: B.size, body: B.body, girth: B.girth, leg: B.leg, head: B.head, muzzle: B.muzzle, ear: B.ear, tail: B.tail, marks: ['saddle', 'mask', 'pom', 'jowl', 'scar', 'tremble'].filter(k => B[k]),
        coats: coatsOf(B.coats), measured: measure(g => sc.drawDogHull(g, 0, 0, 0, Math.PI/2, look, pose)) }); }
    for(const B of CAT_BREEDS){ const look = { B, coat: B.coats[0], blindSide: 0, L: DOG.len*B.size, cat: true };
      db.cats.push({ breed: B.n, size: B.size, body: B.body, girth: B.girth, leg: B.leg, head: B.head, muzzle: B.muzzle, ear: B.ear, tail: B.tail, eye: hex(B.eyeC), nose: hex(B.nose),
        coats: coatsOf(B.coats), measured: measure(g => sc.drawDogHull(g, 0, 0, 0, Math.PI/2, look, Object.assign({}, pose, { noCollar: true }))) }); }
    /* CARS: every kind -- its body, its length, width and roof, its livery and add-ons, its paints, measured */
    for(const k of Object.keys(CAR_KINDS)){ const CK = CAR_KINDS[k], hw = CARC.wid/2;
      let B = null; try { const B0 = CAR_BODIES[CK.body](CARC.len/2, hw, 114), len = B0.len || CARC.len; B = len === CARC.len ? B0 : CAR_BODIES[CK.body](len/2, hw, 114); } catch(e){}
      let pal = null; try { pal = (carPalette(k) || []).map(p => ({ body: hex(p.body), roof: hex(p.roof) })); } catch(e){}
      db.cars.push({ kind: k, body: CK.body, livery: CK.livery, add: CK.add, len: B && (B.len || CARC.len), wid: CARC.wid, deck: B && B.deck, roof: B && B.gh && B.gh.top,
        doors: B && B.doors, paints: pal, measured: measure(g => sc.drawCar(g, k, 0, 0, 0, 0, 0, null, 1, null)) }); }
    for(const k of Object.keys(VAN_KINDS)){ const V = VAN_KINDS[k];
      db.vans.push({ kind: k, len: V.len || VANC.len, wid: V.wid || VANC.wid, roof: (V.v && V.v.roofH) || VANC.roofH, pal: V.pal, add: V.add, measured: measure(g => sc.drawVan(g, k, 0, 0, 0, 0, 0, null, 1, null)) }); }
    /* DOORS: the door kit's looks and its height */
    db.doors = { SHOP_DOOR_H: typeof SHOP_DOOR_H !== 'undefined' ? SHOP_DOOR_H : null, DOOR_H: typeof DOOR_H !== 'undefined' ? DOOR_H : null };
    return db;
  });
  /* the door kit's looks (inside the shop library's closure: read off the source) */
  { const l = LINES[lineOf(/^const SHOP_DOOR_LOOKS = /) - 1]; out.doors.looks = l ? [...l.matchAll(/(\w+): \{/g)].map(m => m[1]) : [];
    if(out.doors.SHOP_DOOR_H == null && out.doors.DOOR_H) out.doors.SHOP_DOOR_H = +(out.doors.DOOR_H*0.88).toFixed(2); }   // (SHOP_DOOR_H = DOOR_H*0.88, in the closure)
  /* drawProp's kinds, read off its source, each drawn and measured */
  const n0 = lineOf(/^  drawProp\(g, kind/), kinds = [];
  for(let i = n0; i < LINES.length && i < n0 + 4000; i++){ if(/^  draw[A-Z]\w*\(/.test(LINES[i]) && i > n0) break; const m = LINES[i].matchAll(/kind === "([a-zA-Z]+)"/g); for(const x of m) if(!kinds.includes(x[1])) kinds.push(x[1]); }
  out.props = await h.page.evaluate(kinds => { const sc = game.scene.getScene('world'), PH = PERSON_H, r = [];
    for(const k of kinds){ const sv = { camX: sc.camX, camY: sc.camY, camZ: sc.camZ, K: sc.K, cx: sc.cx, cy: sc.cy }, W = 1400, Hh = 1100, CX = 700, CY = 800;
      Object.assign(sc, { camX: 0, camY: 0, camZ: 0, K: 1, cx: CX, cy: CY }); const g = sc.add.graphics(); let m = null;
      try { sc.drawProp(g, k, 0, 0, 0, 0, 0, null, 1, null); g.generateTexture('__libp', W, Hh);
        const img = sc.textures.get('__libp').getSourceImage(), cv = document.createElement('canvas'); cv.width = W; cv.height = Hh; const c2 = cv.getContext('2d'); c2.drawImage(img, 0, 0);
        const d = c2.getImageData(0, 0, W, Hh).data; let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
        for(let y = 0; y < Hh; y++) for(let x = 0; x < W; x++) if(d[(y*W + x)*4 + 3] > 40){ if(x < x0) x0 = x; if(x > x1) x1 = x; if(y < y0) y0 = y; if(y > y1) y1 = y; }
        sc.textures.remove('__libp'); if(x1 >= 0) m = { screenTop: CY - y0, screenW: x1 - x0 + 1, screenH: y1 - y0 + 1, vsPerson: +((CY - y0)/PH).toFixed(2) };
      } catch(e){ m = { error: String(e).slice(0, 100) }; }
      finally { g.destroy(); Object.assign(sc, sv); }
      r.push({ kind: k, measured: m }); }
    return r; }, kinds);
  /* every drawer, its line; the look functions; the room kit's fx pieces */
  const drawers = {}; LINES.forEach((l, i) => { const m = l.match(/^  (draw[A-Z]\w*)\(/); if(m && !drawers[m[1]]) drawers[m[1]] = i + 1; });
  const looks = {}; LINES.forEach((l, i) => { const m = l.match(/^function (\w+(?:Look|LookOf))\(/); if(m) looks[m[1]] = i + 1; });
  const tables = {}; for(const t of ['DOG_BREEDS', 'CAT_BREEDS', 'CAR_KINDS', 'CAR_BODIES', 'VAN_KINDS', 'SHOP_DOOR_LOOKS', 'PERSON_H', 'CARC', 'VANC', 'DOG']) tables[t] = lineOf(new RegExp('^const ' + t + '\\b'));
  const db = {
    about: 'The object library: what the game already draws, from the game itself (node tools/library_index.js). Reference the nearest thing here before drawing something new -- its drawer, its size against a person (PERSON_H 124), its colours, how it is built (docs/kits/library.md, L0). Sizes: len / wid / roof / height are the build numbers (world units; a person is 124 tall). measured: the thing drawn once at K 1, facing the same way -- screenTop is how far its silhouette rises over its ground point on screen (its height, plus a little of its length for long things: read a car\'s height from roof), screenW / screenH its silhouette, vsPerson screenTop against a person.',
    built: new Date().toISOString().slice(0, 10),
    person: out.person, dogs: out.dogs, cats: out.cats, cars: out.cars, vans: out.vans, props: out.props, doors: out.doors,
    roomKit: { fx: { car: 'a parked car (drawCar), cached', svc: 'a service cycle: car + owner (pgSvc)', pod: 'a parked robot (drawRoomBot)', dog: 'a dog or cat ({ cat: true | "kitten" }) by the dog hull, cached', kit: 'a live part of a fixture, state() caches it' },
      pieces: ['walkinRoom', 'runPiece', 'runBox', 'box', 'cyl', 'tube', 'ball', 'prism', 'F', 'S', 'T'], rules: 'docs/kits/walkin.md W37 (1)-(6); node tools/review/w37.js' },
    lines: { drawers, looks, tables }
  };
  const fn = path.join(H.ROOT, 'docs/kits/library.json'); fs.writeFileSync(fn, JSON.stringify(db, null, 1) + '\n');
  console.log('wrote', path.relative(H.ROOT, fn), '--', db.dogs.length, 'dog breeds,', db.cats.length, 'cats,', db.cars.length, 'cars,', db.vans.length, 'vans,', db.props.length, 'props,', Object.keys(drawers).length, 'drawers,', Object.keys(looks).length, 'looks');
  const bad = [...db.dogs, ...db.cats, ...db.cars, ...db.vans, ...db.props].filter(x => !x.measured || x.measured.error);
  if(bad.length) console.log('not measured:', bad.map(x => (x.breed || x.kind) + (x.measured && x.measured.error ? ' (' + x.measured.error + ')' : '')).join(', '));
  if(h.errs.length) console.log('page errors', h.errs);
  await h.close();
})();
