/* =====================================================================
   ctx2phaser -- a Canvas2D PATH SUBSET, backed by a Phaser Graphics.
   =====================================================================
   Why this exists rather than a rewrite of the shops.

   Censused before writing it: 37 of the 81 shop bodies reach past the
   kit and drive the 2D context directly -- 75 beginPath, 68 moveTo, 56
   lineTo, 49 stroke, 25 quadraticCurveTo, 5 arc, 3 bezierCurveTo, 1
   clip. Those are not stray calls; they are how the bakery's arched
   gable, the clockmaker's hands and the chapel's tracery are drawn, and
   there is no version of "port the shops to phaser" that does not
   either reimplement them or emulate the API they were written against.

   Emulating is the only option that keeps the port HONEST. If a shop
   body has to be edited to run here, then what this bench renders is
   not the thing the canvas lab dialled, and the comparison it exists to
   make is worthless. So the bodies run byte-identical and this file
   absorbs the difference.

   WHAT THE GAME CANNOT DO, and therefore neither can this:
     - ctx.clip() has no Phaser equivalent. It is emulated by polygon
       intersection (Sutherland-Hodgman) against the clip path, which is
       exact for a CONVEX clip and approximate otherwise. reveal()'s
       clip is a projected rectangle, so exact. The bakery's arched
       clip is not convex and is the one place this bench is a model
       rather than a replica -- flagged rather than hidden, because it
       means the bakery's coping needs a different construction before
       it can port.
     - Curves are flattened to line segments here. The game has no
       curve primitive either, so anything that survives flattening is
       portable and anything that does not was never going to ship.

   Everything is applied through a full CTM, because faceT/plateT set a
   transform and 17 shops then draw in unit-circle space inside it.
   ===================================================================== */
function makeCtx2Phaser(){
  const S = {
    g: null,
    fillStyle: '#000', strokeStyle: '#000', lineWidth: 1,
    lineCap: 'butt', lineJoin: 'miter',
    m: [1,0,0,1,0,0],            // a b c d e f
    clip: null,                  // array of screen points, or null
    subs: [], cur: null, stack: []
  };

  /* ---- colour: the kit speaks CSS, quadOn speaks int + alpha ---- */
  const cache = new Map();
  function col(v){
    if(cache.has(v)) return cache.get(v);
    let out;
    if(typeof v === 'number') out = { c:v, a:1 };
    else if(v[0] === '#'){
      let h = v.slice(1);
      if(h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
      out = { c: parseInt(h,16), a:1 };
    } else {
      const m = /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?/.exec(v);
      out = m ? { c: (Math.round(+m[1])<<16) | (Math.round(+m[2])<<8) | Math.round(+m[3]),
                  a: m[4] === undefined ? 1 : +m[4] }
              : { c: 0x000000, a: 1 };
    }
    cache.set(v, out); return out;
  }

  /* ---- CTM ---- */
  const ap = (x,y) => { const m = S.m; return { x: m[0]*x + m[2]*y + m[4], y: m[1]*x + m[3]*y + m[5] }; };
  const mscale = () => { const m = S.m; return Math.sqrt(Math.abs(m[0]*m[3] - m[1]*m[2])) || 1; };

  /* ---- Sutherland-Hodgman: exact for a convex clip ---- */
  function clipTo(poly, cp){
    if(!cp || cp.length < 3) return poly;
    let out = poly;
    for(let i=0;i<cp.length && out.length;i++){
      const A = cp[i], B = cp[(i+1)%cp.length];
      const side = p => (B.x-A.x)*(p.y-A.y) - (B.y-A.y)*(p.x-A.x);
      const inp = out; out = [];
      for(let j=0;j<inp.length;j++){
        const P = inp[j], Q = inp[(j+1)%inp.length];
        const sp = side(P), sq = side(Q);
        if(sp <= 0) out.push(P);
        if((sp < 0 && sq > 0) || (sp > 0 && sq < 0)){
          const t = sp/(sp-sq);
          out.push({ x:P.x + (Q.x-P.x)*t, y:P.y + (Q.y-P.y)*t });
        }
      }
    }
    return out;
  }
  /* the clip polygon's winding decides which side `side() <= 0` keeps,
     so normalise to a consistent orientation rather than trusting the
     order the caller happened to build the path in */
  function orient(p){
    let s = 0;
    for(let i=0;i<p.length;i++){ const q = p[(i+1)%p.length]; s += (q.x-p[i].x)*(q.y+p[i].y); }
    return s > 0 ? p : p.slice().reverse();
  }

  const ctx = {
    /* ---- state ---- */
    save(){ S.stack.push({ fillStyle:S.fillStyle, strokeStyle:S.strokeStyle, lineWidth:S.lineWidth,
                           lineCap:S.lineCap, lineJoin:S.lineJoin, m:S.m.slice(), clip:S.clip }); },
    restore(){ const p = S.stack.pop(); if(!p) return;
               S.fillStyle=p.fillStyle; S.strokeStyle=p.strokeStyle; S.lineWidth=p.lineWidth;
               S.lineCap=p.lineCap; S.lineJoin=p.lineJoin; S.m=p.m; S.clip=p.clip; },
    setTransform(a,b,c,d,e,f){ S.m = [a,b,c,d,e,f]; },
    transform(a,b,c,d,e,f){
      const m = S.m;
      S.m = [ m[0]*a + m[2]*b,        m[1]*a + m[3]*b,
              m[0]*c + m[2]*d,        m[1]*c + m[3]*d,
              m[0]*e + m[2]*f + m[4], m[1]*e + m[3]*f + m[5] ];
    },

    /* ---- path ---- */
    beginPath(){ S.subs = []; S.cur = null; },
    moveTo(x,y){ S.cur = [ap(x,y)]; S.subs.push(S.cur); },
    lineTo(x,y){ if(!S.cur) return ctx.moveTo(x,y); S.cur.push(ap(x,y)); },
    closePath(){ if(S.cur) S.cur.closed = true; },
    quadraticCurveTo(cx,cy,x,y){
      if(!S.cur) ctx.moveTo(cx,cy);
      const p0 = S.cur[S.cur.length-1], N = 16;
      for(let i=1;i<=N;i++){
        const t=i/N, u=1-t, c=ap(cx,cy), e=ap(x,y);
        S.cur.push({ x:u*u*p0.x + 2*u*t*c.x + t*t*e.x, y:u*u*p0.y + 2*u*t*c.y + t*t*e.y });
      }
    },
    bezierCurveTo(c1x,c1y,c2x,c2y,x,y){
      if(!S.cur) ctx.moveTo(c1x,c1y);
      const p0 = S.cur[S.cur.length-1], N = 18;
      const a=ap(c1x,c1y), b=ap(c2x,c2y), e=ap(x,y);
      for(let i=1;i<=N;i++){
        const t=i/N, u=1-t;
        S.cur.push({ x:u*u*u*p0.x + 3*u*u*t*a.x + 3*u*t*t*b.x + t*t*t*e.x,
                     y:u*u*u*p0.y + 3*u*u*t*a.y + 3*u*t*t*b.y + t*t*t*e.y });
      }
    },
    arc(x,y,r,s,e,ccw){ ctx.ellipse(x,y,r,r,0,s,e,ccw); },
    ellipse(x,y,rx,ry,rot,s,e,ccw){
      let d = e - s;
      if(ccw && d > 0) d -= Math.PI*2;
      if(!ccw && d < 0) d += Math.PI*2;
      const N = Math.max(10, Math.ceil(Math.abs(d)/(Math.PI/14)));
      const cr = Math.cos(rot||0), sr = Math.sin(rot||0);
      for(let i=0;i<=N;i++){
        const t = s + d*i/N, px = Math.cos(t)*rx, py = Math.sin(t)*ry;
        const q = ap(x + px*cr - py*sr, y + px*sr + py*cr);
        (i === 0 && !S.cur) ? (S.cur = [q], S.subs.push(S.cur)) : S.cur.push(q);
      }
    },

    /* ---- paint ---- */
    fill(){
      const { c, a } = col(S.fillStyle);
      for(const sp of S.subs){
        const p = S.clip ? clipTo(sp, S.clip) : sp;
        if(p.length < 3) continue;
        S.g.fillStyle(c, a);
        S.g.fillPoints(p.map(q => new Phaser.Geom.Point(q.x, q.y)), true, true);
      }
    },
    stroke(){
      const { c, a } = col(S.strokeStyle);
      const w = Math.max(0.35, S.lineWidth * mscale());
      S.g.lineStyle(w, c, a);
      for(const sp of S.subs){
        if(sp.length < 2) continue;
        S.g.strokePoints(sp.map(q => new Phaser.Geom.Point(q.x, q.y)), !!sp.closed);
      }
    },
    clip(){ if(S.subs.length) S.clip = orient(S.subs[0].slice()); },

    /* the bench never needs these, but a shop that calls one should not
       take the whole render down with it -- it should show up as a
       missing feature in the report instead */
    fillRect(){ ctx.__unsupported('fillRect'); },
    strokeRect(){ ctx.__unsupported('strokeRect'); },
    drawImage(){ ctx.__unsupported('drawImage'); },
    createLinearGradient(){ ctx.__unsupported('createLinearGradient'); return '#888'; },

    __unsupported(name){ (ctx.__missing || (ctx.__missing = {}))[name] = (ctx.__missing[name]||0)+1; },
    __bind(g){ S.g = g; S.m = [1,0,0,1,0,0]; S.clip = null; S.stack.length = 0; S.subs = []; S.cur = null; },
    __state: S
  };
  /* fillStyle etc. are plain properties on the real thing, so they are
     plain properties here too -- a shop assigning ctx.fillStyle must not
     have to know it is talking to a shim */
  ['fillStyle','strokeStyle','lineWidth','lineCap','lineJoin'].forEach(k => {
    Object.defineProperty(ctx, k, { get:()=>S[k], set:v=>{ S[k]=v; } });
  });
  return ctx;
}
