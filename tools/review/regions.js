/* THE WORLD'S REGIONS, SURVEYED (see WORLD REGIONS in game/index.html).
   Boots the real game headless and, for every region in WORLD_REGIONS --
   the 12 hoods AND the edge districts of The Flats, the mountains and the
   sea -- stands him at each of its photo points and photographs it at the
   game's furthest zoom (zoomSet(3)) and wider still (K 0.12); then renders
   an overview of the whole cell index: a colour per kind, each region
   outlined and named, the hood grid's own edge in white.

   Usage: node tools/review/regions.js <outdir> [--devvit] [--only id,id] [--no-photos]
   Writes <outdir>/overview.png, <outdir>/regions.json (cells, kinds,
   bounds, photo points) and <outdir>/<region id>-<n>[-wide].png. */
const H = require('./harness.js'), fs = require('fs'), path = require('path');

const args = process.argv.slice(2);
const out = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--only');
if(!out){ console.error('usage: node tools/review/regions.js <outdir> [--devvit] [--only id,id] [--no-photos]'); process.exit(2); }
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;
fs.mkdirSync(out, { recursive: true });
const fname = id => id.replace(/[^a-z0-9.-]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase();

/* in the page: the cell index drawn top-down, north up, west left */
function overview(){
  const I = worldRegionIndex(), R = WORLD_REGIONS, K = REGION_KINDS;
  const COL = { sea: '#4f8fb3', beach: '#ecd99b', boardwalk: '#a0703f', harbour: '#7fc3dd', quay: '#c9c1ae', estate: '#d9a37c',
                foothill: '#c4b77f', mountain: '#857a63', road: '#3d3f47', landmark: '#b0306a', buildable: '#9fd36b', city: '#e9e6df' };
  const px = 3, PAD = 20, LEG = 230;
  const c = document.createElement('canvas'); c.width = I.W*px + PAD*2 + LEG; c.height = I.H*px + PAD*2;
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  for(let v = 0; v < I.H; v++) for(let u = 0; u < I.W; u++){
    g.fillStyle = COL[K[I.kind[v*I.W + u]]]; g.fillRect(PAD + u*px, PAD + v*px, px, px);
  }
  /* region outlines: a line wherever two neighbouring cells differ */
  g.fillStyle = '#111';
  for(let v = 0; v < I.H; v++) for(let u = 0; u < I.W; u++){
    const k = v*I.W + u;
    if(u + 1 < I.W && I.reg[k] !== I.reg[k + 1]) g.fillRect(PAD + (u + 1)*px - 0.5, PAD + v*px, 1, px);
    if(v + 1 < I.H && I.reg[k] !== I.reg[k + I.W]) g.fillRect(PAD + u*px, PAD + (v + 1)*px - 0.5, px, 1);
  }
  /* the hood grid's own edge (the lattice's outer kerb line) */
  const toPx = (x, y) => [PAD + (x - I.ox)/I.cs*px, PAD + (y - I.oy)/I.cs*px];
  const gx1 = (I.grid.cols - 1)*BLOCK, gy1 = (I.grid.rows - 1)*BLOCK, sw = ROAD_HALF + SIDEWALK_W;
  { const a = toPx(-sw, -sw), b = toPx(gx1 + sw, gy1 + sw); g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.setLineDash([5, 4]); g.strokeRect(a[0], a[1], b[0] - a[0], b[1] - a[1]); g.setLineDash([]); }
  /* names: at the region's cell nearest its centroid (an L-shaped band's
     centroid can be off the band) */
  const L = worldRegionsList();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for(const o of L){
    if(!o.cells) continue;
    const ri = R.findIndex(r => r.id === o.id);
    let best = null, bd = Infinity;
    const cu = (o.centre.x - I.ox)/I.cs, cv = (o.centre.y - I.oy)/I.cs;
    for(let v = 0; v < I.H; v += 2) for(let u = 0; u < I.W; u += 2){
      if(I.reg[v*I.W + u] !== ri) continue;
      const d = (u - cu)**2 + (v - cv)**2;
      if(d < bd){ bd = d; best = [u, v]; }
    }
    const [x, y] = [PAD + best[0]*px, PAD + best[1]*px];
    g.font = o.kind === 'hood' ? '600 11px sans-serif' : '700 13px sans-serif';
    g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,0.9)'; g.strokeText(o.name, x, y);
    g.fillStyle = o.kind === 'hood' ? '#444' : '#000'; g.fillText(o.name, x, y);
    for(const p of o.photos){ const q = toPx(p.x, p.y); g.fillStyle = '#ff2d55'; g.beginPath(); g.arc(q[0], q[1], 3.5, 0, Math.PI*2); g.fill(); }
  }
  /* legend */
  g.textAlign = 'left'; g.font = '12px sans-serif';
  let ly = PAD;
  const lx = I.W*px + PAD*2;
  g.fillStyle = '#000'; g.font = '700 13px sans-serif'; g.fillText('kind', lx, ly + 6); ly += 20; g.font = '12px sans-serif';
  for(const k of K){ g.fillStyle = COL[k]; g.fillRect(lx, ly, 14, 14); g.strokeStyle = '#000'; g.lineWidth = 0.5; g.strokeRect(lx, ly, 14, 14); g.fillStyle = '#000'; g.fillText(k, lx + 20, ly + 7); ly += 18; }
  ly += 10; g.fillStyle = '#ff2d55'; g.beginPath(); g.arc(lx + 7, ly + 7, 4, 0, Math.PI*2); g.fill(); g.fillStyle = '#000'; g.fillText('photo point', lx + 20, ly + 7); ly += 18;
  g.strokeStyle = '#888'; g.setLineDash([5, 4]); g.strokeRect(lx, ly + 2, 14, 10); g.setLineDash([]); g.fillText('hood grid edge', lx + 20, ly + 7); ly += 18;
  g.fillText('north up, west left', lx, ly + 12); g.fillText('cell = BLOCK/' + I.N, lx, ly + 28);
  g.fillText('blocks i ' + I.i0 + '..' + I.i1 + ', j ' + I.j0 + '..' + I.j1, lx, ly + 44);
  return c.toDataURL('image/png');
}

(async () => {
  const h = await H.open({ devvit: args.includes('--devvit') });
  await h.boot();
  const p = h.page;
  const list = await p.evaluate(() => worldRegionsList());
  if(!list){ console.error('no region index (worldgen=classic?)'); await h.close(); process.exit(1); }
  fs.writeFileSync(path.join(out, 'regions.json'), JSON.stringify(list, null, 1));
  const ov = await p.evaluate(overview);
  fs.writeFileSync(path.join(out, 'overview.png'), Buffer.from(ov.split(',')[1], 'base64'));
  console.log('overview.png');
  for(const o of list) console.log(`${o.id.padEnd(24)} ${String(o.cells).padStart(6)} cells  ${JSON.stringify(o.kinds)}`);
  if(!args.includes('--no-photos')){
    for(const o of list){
      if(only && !only.includes(o.id)) continue;
      for(let n = 0; n < o.photos.length; n++){
        const ph = o.photos[n];
        for(const wide of [false, true]){
          const at = await p.evaluate(async ([ph, wide, name]) => {
            const s = game.scene.getScene('world');
            owStandUpAt(s, ph.x, ph.y, ph.yaw);
            zoomSet(3);
            if(wide){ s.K = 0.12; if(s.layout) s.layout(); }
            await new Promise(r => setTimeout(r, 2500));                   // let the caches paint
            game.scene.pause('world');
            const q = regionAtWorld(ph.x, ph.y);
            let tag = document.getElementById('__rgTag');
            if(!tag){ tag = document.createElement('div'); tag.id = '__rgTag';
              tag.style.cssText = 'position:fixed;left:50%;top:8px;transform:translateX(-50%);z-index:99999;background:rgba(0,0,0,.72);color:#fff;font:600 14px sans-serif;padding:5px 10px;border-radius:6px;pointer-events:none';
              document.body.appendChild(tag); }
            tag.textContent = `${name} -- ${ph.note} -- standing on: ${q ? q.region.name + ' / ' + q.kind : '?'}${wide ? ' (wide)' : ''}`;
            return q ? q.region.id + '/' + q.kind : null;
          }, [ph, wide, o.name]);
          await p.waitForTimeout(250);
          const f = `${fname(o.id)}-${n + 1}${wide ? '-wide' : ''}.png`;
          await p.screenshot({ path: path.join(out, f) });
          await p.evaluate(() => { const t = document.getElementById('__rgTag'); if(t) t.remove(); zoomSet(3); game.scene.resume('world'); });
          console.log(f, 'stands on', at);
        }
      }
    }
  }
  console.log('page errors:', JSON.stringify(h.errs));
  await h.close();
  process.exit(h.errs.length ? 1 : 0);
})();
