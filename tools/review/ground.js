/* KIT 7: STREETS AND GROUND -- the checker (see docs/kits/ground.md).

   G1 no holes: the backdrop's own colour (the camera's background, pal.sky)
      must never show through the city -- a missing tile, an unpainted corner
      or ring, a gap between pieces (the "blue squares" that came back three
      times). The frame is read after the watch; every 20 px cell where the
      backdrop shows is gathered into patches and reported with a picture.
      (Past the edge of the world, the sky is the sky: patches that touch the
      frame's edge are left out.) */

function install(){ return true; }
function collect(){ return null; }

async function probe(){
  const s = game.scene.getScene('world');
  const bg = s.cameras.main.backgroundColor;
  const sky = [bg.red, bg.green, bg.blue];
  if(s._inside || sky[0] + sky[1] + sky[2] < 30) return { sky: 'inside', holes: [] };   // (inside a building the backdrop is black, as is a bench: no sky to show)
  const W = s.vpW(), H = s.vpH();
  const img = await new Promise(res => { try { game.renderer.snapshot(i => res(i)); } catch(e){ res(null); } });
  if(!img) return { err: 'no snapshot' };
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data, sc = c.width/W;
  const CS = 20, nx = Math.ceil(c.width/CS), ny = Math.ceil(c.height/CS), cell = new Uint16Array(nx*ny);
  for(let y = 0; y < c.height; y++) for(let x = 0; x < c.width; x++){
    const i = (y*c.width + x)*4;
    if(Math.abs(d[i] - sky[0]) < 5 && Math.abs(d[i+1] - sky[1]) < 5 && Math.abs(d[i+2] - sky[2]) < 5) cell[((y/CS)|0)*nx + ((x/CS)|0)]++;
  }
  /* patches: connected cells with backdrop in them */
  const seen = new Uint8Array(nx*ny), out = [];
  for(let k = 0; k < nx*ny; k++){
    if(seen[k] || cell[k] < 12) continue;
    const st = [k]; seen[k] = 1; let px = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, edge = false;
    while(st.length){
      const q = st.pop(), cx = q % nx, cy = (q/nx)|0;
      px += cell[q]; x0 = Math.min(x0, cx); y0 = Math.min(y0, cy); x1 = Math.max(x1, cx); y1 = Math.max(y1, cy);
      if(cx === 0 || cy === 0 || cx === nx - 1 || cy === ny - 1) edge = true;
      for(const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]){
        const ex = cx + ax, ey = cy + ay; if(ex < 0 || ey < 0 || ex >= nx || ey >= ny) continue;
        const e = ey*nx + ex; if(!seen[e] && cell[e] >= 12){ seen[e] = 1; st.push(e); }
      }
    }
    if(edge || px < 40) continue;
    const bx = x0*CS, by = y0*CS, bw = (x1 - x0 + 1)*CS, bh = (y1 - y0 + 1)*CS;
    const cc = document.createElement('canvas'), pad = 60; cc.width = Math.min(c.width, bw + 2*pad); cc.height = Math.min(c.height, bh + 2*pad);
    cc.getContext('2d').drawImage(c, Math.max(0, bx - pad), Math.max(0, by - pad), cc.width, cc.height, 0, 0, cc.width, cc.height);
    out.push({ sx: Math.round((bx + bw/2)/sc), sy: Math.round((by + bh/2)/sc), px, img: out.length < 10 ? cc.toDataURL('image/png') : null });
  }
  return { sky: '#' + sky.map(v => v.toString(16).padStart(2, '0')).join(''), holes: out };
}

function judge(r, all){
  const P = all && all.__probe && all.__probe.ground;
  if(!P) return { findings: [] };
  if(P.err) return { findings: [{ rule: 'ground', who: '-', msg: P.err, info: true }] };
  return { findings: P.holes.map(h => ({ rule: 'G1 no holes to the sky', who: 'ground', msg: `${h.px} px of backdrop (${P.sky}) showing through at screen (${h.sx}, ${h.sy})`, img: h.img })) };
}

module.exports = { name: 'ground', install, collect, judge, probe };
