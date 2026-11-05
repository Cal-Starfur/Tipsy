/* A LIBRARY ENTRY'S PHOTO, with a finding outlined -- for the review's report.
   Runs in the page (the review copy). The entry is drawn alone, fitted to the
   frame, on a plain ground, over everything else; the finding's box (in the
   entry's own a, b, z, before the mirror) is drawn in red over it, the door it
   crosses (if any) in blue. Returns a PNG data URL. */
async function libPhoto(o){
  const s = game.scene.getScene('world'), shop = LIB.get(o.name);
  if(!shop) return null;
  const raf = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const vw = s.vpW(), vh = s.vpH();
  let ov = window.__RVOV;
  if(!ov){ ov = window.__RVOV = { bg: s.add.graphics(), g: s.add.graphics(), hl: s.add.graphics() };
           ov.bg.setDepth(1e9); ov.g.setDepth(1e9 + 1); ov.hl.setDepth(1e9 + 2); }
  for(const k of ['bg', 'g', 'hl']){ ov[k].clear(); ov[k].setVisible(true); }
  const flank = o.flank === false ? false : true;
  /* the entry's frame -> screen: as P does (mirror, b offset, scale, z scale), then iso */
  const SC = shop.sc || 1, ZS = shop.zs === undefined ? 1.5 : shop.zs, BOFF = shop.boff || 0;
  const MIR = flank === false && shop.mirror !== false ? (shop.ww || 230) : 0;
  /* measure, then fit */
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  const Gm = (a, b, h) => { const x = a - b, y = (a + b)/2 - h; if(isFinite(x) && isFinite(y)){ x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return { x, y }; };
  try { LIB.draw(o.name, ov.g, Gm, null, 1, null, flank, !!o.rear); } catch(e){}
  ov.g.clear();
  if(!(x1 > x0)) return null;
  /* fit the whole entry, or (a big site) the finding's neighbourhood */
  let fx0 = x0, fx1 = x1, fy0 = y0, fy1 = y1;
  const pr = (a, b, z) => { a = MIR ? MIR - a : a; b += BOFF; return { x: (a - b)*SC, y: ((a + b)/2)*SC - z*SC*ZS }; };
  if(o.box && (x1 - x0) > 1400){
    const c = pr((o.box.a0 + o.box.a1)/2, (o.box.b0 + o.box.b1)/2, (o.box.z0 + o.box.z1)/2);
    fx0 = c.x - 500; fx1 = c.x + 500; fy0 = c.y - 340; fy1 = c.y + 340;
  }
  const PW = Math.min(vw, 900), PH = Math.min(vh, 640), k = Math.min((PW - 60)/(fx1 - fx0), (PH - 60)/(fy1 - fy0)), ox = (vw - PW)/2, oy = (vh - PH)/2;
  const tx = x => ox + 30 + (x - fx0)*k, ty = y => oy + 30 + (y - fy0)*k;
  ov.bg.fillStyle(0xe9e4d8, 1).fillRect(0, 0, vw, vh);
  ov.bg.lineStyle(1, 0xcfc8b8, 1);
  for(let gx = -2000; gx <= 2000; gx += 115){ const p0 = pr(gx, -2000, 0), p1 = pr(gx, 2000, 0); ov.bg.lineBetween(tx(p0.x), ty(p0.y), tx(p1.x), ty(p1.y)); const q0 = pr(-2000, gx, 0), q1 = pr(2000, gx, 0); ov.bg.lineBetween(tx(q0.x), ty(q0.y), tx(q1.x), ty(q1.y)); }
  const G = (a, b, h) => ({ x: tx(a - b), y: ty((a + b)/2 - h) });
  try { LIB.draw(o.name, ov.g, G, null, k, null, flank, !!o.rear); } catch(e){}
  /* the finding: its box's twelve edges in red (and the door it crosses in blue) */
  const boxEdges = (B, col, w) => {
    const P = [];
    for(const a of [B.a0, B.a1]) for(const b of [B.b0, B.b1]) for(const z of [B.z0, B.z1]){ const q = pr(a, b, z); P.push({ x: tx(q.x), y: ty(q.y), a, b, z }); }
    ov.hl.lineStyle(w, col, 1);
    for(let i = 0; i < 8; i++) for(let j = i + 1; j < 8; j++){
      const p = P[i], q = P[j], same = (p.a === q.a) + (p.b === q.b) + (p.z === q.z);
      if(same === 2) ov.hl.lineBetween(p.x, p.y, q.x, q.y);
    }
  };
  if(o.box && o.box.door) boxEdges({ a0: o.box.door.a0, a1: o.box.door.a1, b0: 0, b1: 0, z0: o.box.door.z0, z1: o.box.door.z1 }, 0x1e6bff, 2);
  if(o.box) boxEdges(o.box, 0xff2d55, 3);
  await raf();
  const img = await new Promise(res => { try { game.renderer.snapshotArea(Math.round(ox), Math.round(oy), Math.round(PW), Math.round(PH), i => res(i)); } catch(e){ res(null); } });
  for(const k2 of ['bg', 'g', 'hl']){ ov[k2].clear(); ov[k2].setVisible(false); }
  if(!img) return null;
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; c.getContext('2d').drawImage(img, 0, 0);
  return c.toDataURL('image/jpeg', 0.85);
}

module.exports = { libPhoto };
