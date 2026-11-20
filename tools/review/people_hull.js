/* THE PEOPLE CHECKER (people kit P16 / P21 / P22: the body's own draw order and alignment, as W37 is for furniture).
   Every look (the street's kinds, the heavier build, a child, a dress, a tank top, a vest, a hood, a mobility aid) is drawn in
   every facing (eight) and every pose (standing, mid-stride, both hands forward on a table, an arm raised, sat), each part of the
   body flat in a colour of its own (drawPersonHullBody's part marks, this._pTag). Twice: once whole, once without the far
   limbs. Then:
     over    -- the far arm painted over the torso or the near arm (seen in the whole drawing where, without it, the torso or the
                near arm shows): the far arm is behind the body unless it is lifted toward the eye (its 'front' half, P21)
     shard   -- a scrap of the far arm, a few pixels, showing past the torso: a shoulder or a sleeve's edge that does not meet
                the body (P22)
   node tools/review/people_hull.js [--png dir] [--look name]      exits 1 when anything is found */
const H = require('./harness.js'), fs = require('fs'), path = require('path');
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const PNG = arg('--png'), ONLY = arg('--look');
const LOOKS = [['man', 11, { type: 'man', heavy: false }], ['woman', 12, { type: 'woman', heavy: false }], ['heavy', 13, { type: 'man', heavy: true }],
  ['heavyWoman', 14, { type: 'woman', heavy: true }], ['business', 15, { type: 'business' }], ['jogger', 16, { type: 'jogger' }],
  ['skater', 17, { type: 'skater' }], ['worker', 18, { type: 'worker' }], ['elderWoman', 19, { type: 'elderWoman' }],
  ['teen', 20, { type: 'teen' }], ['kid', 21, { type: 'kid' }], ['cane', 22, { type: 'cane' }]].filter(l => !ONLY || l[0] === ONLY);
(async () => {
  const h = await H.open(); await h.boot();
  const res = await h.page.evaluate(async ({ LOOKS, png }) => {
    const sc = game.scene.getScene('world'), S = 2, CW = 230, CH = 330;
    const FACES = [0, 1, 2, 3, 4, 5, 6, 7].map(k => k*Math.PI/4);
    const POSES = [['stand', {}], ['walk', { walk: 1.1, moving: true }], ['walk2', { walk: -1.1, moving: true }],
      ['table', { pose: { lift: [0.28, 0.28], bend: [1.1, 1.1] } }], ['raised', { lift: 0.6 }], ['sit', { pose: { sit: 35 } }]];
    const TAGS = ['pre', 'legs', 'back', 'farArm', 'torso', 'lap', 'farArmFront', 'held', 'nearArm', 'aid', 'head'];
    const COL = [0x101010, 0x2060ff, 0x808080, 0xff2020, 0x20c040, 0xffa000, 0xff60ff, 0x00e0e0, 0xffff20, 0x804000, 0x9040ff];
    const sv = { camX: sc.camX, camY: sc.camY, camZ: sc.camZ, K: sc.K, cx: sc.cx, cy: sc.cy, lod: sc._pLodFix };
    Object.assign(sc, { camX: 0, camY: 0, camZ: 0, K: S }); sc._roomPerson = true; sc._pLodFix = 0;
    const W = CW*FACES.length, Hh = CH*POSES.length;
    const grab = async key => { const d = sc.textures.getBase64(key); sc.textures.remove(key);
      const im = new Image(); await new Promise(r => { im.onload = r; im.src = d; });
      const c = document.createElement('canvas'); c.width = W; c.height = Hh; const x = c.getContext('2d'); x.drawImage(im, 0, 0); return { c, x, px: x.getImageData(0, 0, W, Hh).data }; };
    const render = (L, skipFar) => {
      Object.assign(sc, { camX: 0, camY: 0, camZ: 0, K: S }); sc._roomPerson = true;   // (again each time: the game's frames run while a picture is read back, and set the camera)
      const g = sc.add.graphics(); g.fillStyle(0xffffff, 1); g.fillRect(0, 0, W, Hh);
      let cur = 0; const f0 = g.fillStyle.bind(g), l0 = g.lineStyle.bind(g);
      const hide = () => skipFar && (TAGS[cur] === 'farArm');
      g.fillStyle = (c, a) => f0(COL[cur], hide() || a == null ? (hide() ? 0 : 1) : a < 0.3 ? 0 : 1);
      g.lineStyle = (w, c, a) => l0(w, COL[cur], hide() || (a != null && a < 0.3) ? 0 : 1);
      sc._pTag = t => { cur = Math.max(0, TAGS.indexOf(t)); };
      POSES.forEach(([pn, P], r) => FACES.forEach((th, c) => { cur = 0; sc.cx = CW*c + CW/2; sc.cy = CH*r + CH - 40;
        sc.drawPersonHullBody(g, 0, 0, 0, th, L.build, L.skin, L.shirt, L.pants, L.hair, L.shoe, P.walk ? walkSin(P.walk) : 0, !!P.moving, 0, P.lift || 0, null, L.uniform, false,
          Object.assign({ dress: L.dress }, P.pose || {})); }));
      sc._pTag = null; g.generateTexture('__ph', W, Hh); g.destroy(); return '__ph'; };
    const who = px => { let best = -1, bd = 40; for(let i = 0; i < COL.length; i++){ const c = COL[i], d = Math.abs((c >> 16) - px[0]) + Math.abs(((c >> 8) & 255) - px[1]) + Math.abs((c & 255) - px[2]); if(d < bd){ bd = d; best = i; } } return best; };
    const out = [], pngs = [];
    for(const lod of [0, 1, 2]) for(const [name, seed, opts] of LOOKS){ sc._pLodFix = lod;
      const L = name === 'kid' ? Object.assign({ kind: 'kid' }, partyLook(seed, 'kid')) : streetLook(seed, opts);
      const A = await grab(render(L, false)), B = await grab(render(L, true));
      const at = (I, x, y) => { const i = (y*W + x)*4; return who([I.px[i], I.px[i + 1], I.px[i + 2]]); };
      const FA = TAGS.indexOf('farArm'), TO = TAGS.indexOf('torso'), NA = TAGS.indexOf('nearArm');
      const marks = A.x.getImageData(0, 0, W, Hh), md = marks.data; let flaggedAny = false;
      POSES.forEach(([pn], r) => FACES.forEach((th, c) => {
        let over = 0; const vis = new Uint8Array(CW*CH);
        for(let y = 0; y < CH; y++) for(let x = 0; x < CW; x++){ const X = c*CW + x, Y = r*CH + y, a = at(A, X, Y);
          if(a !== FA) continue; vis[y*CW + x] = 1; const b = at(B, X, Y);
          if(b === TO || b === NA){ over++; const i = (Y*W + X)*4; md[i] = 255; md[i + 1] = 0; md[i + 2] = 0; } }
        /* shards: the far arm's visible pieces, each one's size (4-connected) */
        const seen = new Uint8Array(CW*CH), shards = [];
        for(let i0 = 0; i0 < vis.length; i0++){ if(!vis[i0] || seen[i0]) continue; const st = [i0]; seen[i0] = 1; let n = 0, cells = [];
          while(st.length){ const i = st.pop(); n++; cells.push(i); const x = i % CW, y = (i/CW) | 0;
            for(const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]){ const xx = x + dx, yy = y + dy, j = yy*CW + xx; if(xx >= 0 && yy >= 0 && xx < CW && yy < CH && vis[j] && !seen[j]){ seen[j] = 1; st.push(j); } } }
          if(n >= 3 && n < 14){ shards.push(n); for(const i of cells){ const k = ((r*CH + ((i/CW) | 0))*W + c*CW + i % CW)*4; md[k] = 255; md[k + 1] = 0; md[k + 2] = 255; } } }
        const thD = Math.round(th*180/Math.PI);
        if(over > 8) out.push({ kind: 'over', lod, look: name, pose: pn, facing: thD, px: over });
        if(shards.length) out.push({ kind: 'shard', lod, look: name, pose: pn, facing: thD, px: shards.join('+') });
        if(over > 8 || shards.length){ flaggedAny = true; A.x.strokeStyle = '#ff0000'; A.x.lineWidth = 3; A.x.strokeRect(c*CW + 2, r*CH + 2, CW - 4, CH - 4); } }));
      if(png && flaggedAny){ const st = A.x.getImageData(0, 0, W, Hh); for(let i = 0; i < md.length; i += 4) if(md[i] === 255 && (md[i + 1] === 0)){ st.data[i] = md[i]; st.data[i + 1] = 0; st.data[i + 2] = md[i + 2]; }
        A.x.putImageData(st, 0, 0); pngs.push([name + '_lod' + lod, A.c.toDataURL('image/png')]); } }
    Object.assign(sc, { camX: sv.camX, camY: sv.camY, camZ: sv.camZ, K: sv.K, cx: sv.cx, cy: sv.cy }); sc._pLodFix = sv.lod; sc._roomPerson = false;
    return { out, pngs };
  }, { LOOKS, png: !!PNG });
  await h.close();
  if(PNG){ fs.mkdirSync(PNG, { recursive: true }); for(const [n, d] of res.pngs) fs.writeFileSync(path.join(PNG, 'people_' + n + '.png'), Buffer.from(d.split(',')[1], 'base64')); }
  const by = {}; for(const f of res.out) (by[f.kind] = by[f.kind] || []).push(f);
  console.log('people hull: ' + LOOKS.length + ' looks x 8 facings x 6 poses x 3 detail levels');
  for(const [k, list] of Object.entries(by)){ console.log('\n' + k + ' (' + list.length + '):');
    for(const f of list) console.log('  view ' + (f.lod + 1) + '  ' + f.look.padEnd(11) + f.pose.padEnd(7) + String(f.facing).padStart(4) + 'deg  ' + f.px + ' px'); }
  if(h.errs && h.errs.length) console.log('page errors:', h.errs);
  console.log(res.out.length ? '\nFOUND ' + res.out.length : '\nclean');
  process.exit(res.out.length ? 1 : 0);
})();
