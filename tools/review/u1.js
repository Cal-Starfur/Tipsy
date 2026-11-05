/* DEPTH U1: THE WORLD-QUEUE AUDIT, over the census (census.js).
   Every standing piece the world queue draws, judged against the sort's own rules:
     U1k  KEY OUTSIDE ITS FOOTPRINT: the piece is sorted at an x+y it does not stand on
          (keyed at a site's origin or a far corner) -- it draws before or after things it
          is not behind or in front of.
     U1l  OVERSIZED FOR ITS PIPELINE: a standing piece far longer than the pieces its own
          pipeline normally makes (3x the pipeline's median and over 600). Whole houses and
          shop units are whole by rule (lu, hs); everything else should be split.
     U1c  ONE PIECE INSIDE ANOTHER: a building mass (150+ tall) whose footprint contains a
          separately keyed standing piece that overlaps it on screen. Neither is wholly behind
          the other, so no single order is right: the later one paints over the earlier one's
          roof or wall (the mall body and its tan anchor). The mass has to be split.
     U1o  DRAWN IN THE WRONG ORDER: two standing pieces whose screen outlines overlap, one
          wholly behind the other on the ground (x or y separated, the other range shared),
          but the one behind is drawn after.
   The norm per pipeline is measured, not assumed: its median length and key fraction are
   reported with the findings. Usage: node tools/review/u1.js <census.json> [out.json] */
const fs = require('fs');

const SKIP_PIPE = new Set(['pp', 'cf', 'kerb', 'scat', 'nsg', 'agate', 'dp']);   // props and garden bits: their own kit (props.md)
const WHOLE_PIPE = new Set(['lu', 'hs']);                                          // whole units by rule (depth S1)

function pipeOf(e){ return e.bc ? e.bc[0].key.split('|')[0] : 'live@' + e.site; }
function nameOf(e){ if(!e.bc) return 'live@' + e.site; const p = e.bc[0].key.split('|'); return p[0] + '|' + (p[1] || ''); }
function keyOf(e){
  if(e.dh){ let best = null, n = -1; for(const [d, c] of Object.entries(e.dh)) if(c > n){ n = c; best = +d; } return best; }
  return e.depths[0];
}
const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1)/2)] : 0; };

/* the screen outline of a footprint box: the convex hull of its 8 projected corners */
function outline(e){
  const pts = [];
  for(const x of [e.x0, e.x1]) for(const y of [e.y0, e.y1]) for(const z of [e.z0, e.z1]) pts.push([x - y, (x + y)/2 - z]);
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0])*(b[1] - o[1]) - (a[1] - o[1])*(b[0] - o[0]);
  const lo = [], hi = [];
  for(const p of pts){ while(lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for(const p of pts.slice().reverse()){ while(hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
  return lo.slice(0, -1).concat(hi.slice(0, -1));
}
/* overlap area estimate of two convex outlines (separating axes; 0 when apart) */
function overlaps(A, B, margin){
  for(const P of [A, B]) for(let i = 0; i < P.length; i++){
    const p = P[i], q = P[(i + 1) % P.length], nx = q[1] - p[1], ny = p[0] - q[0], L = Math.hypot(nx, ny) || 1;
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
    for(const v of A){ const d = (v[0]*nx + v[1]*ny)/L; a0 = Math.min(a0, d); a1 = Math.max(a1, d); }
    for(const v of B){ const d = (v[0]*nx + v[1]*ny)/L; b0 = Math.min(b0, d); b1 = Math.max(b1, d); }
    if(a1 - margin <= b0 || b1 - margin <= a0) return false;
  }
  return true;
}

function audit(census){
  const items = census.items.filter(e => isFinite(e.x0) && e.z1 - e.z0 >= 20 && !SKIP_PIPE.has(pipeOf(e)) && e.bc);
  const byPipe = {};
  for(const e of items){
    e._L = Math.max(e.x1 - e.x0, e.y1 - e.y0); e._k = keyOf(e);
    const lo = e.x0 + e.y0, hi = e.x1 + e.y1; e._f = hi > lo ? (e._k - lo)/(hi - lo) : 0.5;
    (byPipe[pipeOf(e)] = byPipe[pipeOf(e)] || []).push(e);
  }
  const norm = {};
  for(const [p, l] of Object.entries(byPipe)) norm[p] = { n: l.length, lenMed: Math.round(med(l.map(e => e._L))), keyMed: +med(l.map(e => e._f)).toFixed(2) };
  const F = [];
  for(const e of items){
    const p = pipeOf(e), lo = e.x0 + e.y0, hi = e.x1 + e.y1;
    const where = { x0: Math.round(e.x0), y0: Math.round(e.y0), x1: Math.round(e.x1), y1: Math.round(e.y1), z1: Math.round(e.z1) };
    if(e._k < lo - 40 || e._k > hi + 40)
      F.push({ rule: 'U1k', pipe: p, obj: nameOf(e), key: e.bc[0].key, site: e.site, at: where, note: `keyed at ${Math.round(e._k)}, stands on x+y ${Math.round(lo)}..${Math.round(hi)} (${Math.round(e._k < lo ? lo - e._k : e._k - hi)} off)` });
    if(!WHOLE_PIPE.has(p) && e._L > 600 && e._L > 3*norm[p].lenMed)
      F.push({ rule: 'U1l', pipe: p, obj: nameOf(e), key: e.bc[0].key, site: e.site, at: where, note: `one piece ${Math.round(e._L)} long, ${Math.round(e.z1)} tall; its pipeline's pieces are ${norm[p].lenMed} (median)` });
  }
  /* pairs: definite ground order vs draw order */
  const O = items.map(outline);
  const pairs = [];
  for(let i = 0; i < items.length; i++) for(let j = i + 1; j < items.length; j++){
    const a = items[i], b = items[j];
    if(nameOf(a) === nameOf(b) && pipeOf(a) === 'lu') continue;
    if(!a._st) a._st = new Set(a.stops); if(!b._st) b._st = new Set(b.stops);
    let co = false; for(const t of a._st) if(b._st.has(t)){ co = true; break; }
    if(!co) continue;                                   // never on screen in the same frame
    const E = 2;
    const xo = a.x0 < b.x1 - E && b.x0 < a.x1 - E, yo = a.y0 < b.y1 - E && b.y0 < a.y1 - E;
    let back = null, front = null;
    if(yo && a.x1 <= b.x0 + E){ back = a; front = b; }
    else if(yo && b.x1 <= a.x0 + E){ back = b; front = a; }
    else if(xo && a.y1 <= b.y0 + E){ back = a; front = b; }
    else if(xo && b.y1 <= a.y0 + E){ back = b; front = a; }
    if(!back){
      /* containment: one's footprint holds the other's centre */
      const inside = (P, q) => (q.x0 + q.x1)/2 > P.x0 + E && (q.x0 + q.x1)/2 < P.x1 - E && (q.y0 + q.y1)/2 > P.y0 + E && (q.y0 + q.y1)/2 < P.y1 - E;
      for(const [M, q] of [[a, b], [b, a]]){
        if(M.z1 < 150 || q.z1 - q.z0 < 20 || !inside(M, q) || M._L < 1.5*q._L) continue;
        if(!overlaps(O[items.indexOf(M)], O[items.indexOf(q)], 6)) continue;
        pairs.push({ rule: 'U1c', pipe: pipeOf(M) + '/' + pipeOf(q), obj: nameOf(M) + '  holds  ' + nameOf(q), key: M.bc[0].key + '  holds  ' + q.bc[0].key, site: M.site,
          at: { x0: Math.round(q.x0), y0: Math.round(q.y0), x1: Math.round(q.x1), y1: Math.round(q.y1), z1: Math.round(Math.max(M.z1, q.z1)) },
          back: { key: (M._k <= q._k ? M : q).bc[0].key, k: Math.round(Math.min(M._k, q._k)), fp: [(M._k <= q._k ? M : q)].map(e => [e.x0, e.y0, e.x1, e.y1].map(Math.round))[0] },
          front: { key: (M._k <= q._k ? q : M).bc[0].key, k: Math.round(Math.max(M._k, q._k)), fp: [(M._k <= q._k ? q : M)].map(e => [e.x0, e.y0, e.x1, e.y1].map(Math.round))[0] },
          note: `${M.bc[0].key} (${Math.round(M._L)} long, ${Math.round(M.z1)} tall) stands round ${q.bc[0].key}: whichever draws second paints over the other` });
      }
      continue;
    }
    if(back._k <= front._k) continue;
    if(!overlaps(O[items.indexOf(back)], O[items.indexOf(front)], 6)) continue;
    pairs.push({ rule: 'U1o', pipe: pipeOf(back) + '/' + pipeOf(front), obj: nameOf(back) + '  over  ' + nameOf(front), key: back.bc[0].key + '  >  ' + front.bc[0].key, site: back.site,
      at: { x0: Math.round(Math.min(back.x0, front.x0)), y0: Math.round(Math.min(back.y0, front.y0)), x1: Math.round(Math.max(back.x1, front.x1)), y1: Math.round(Math.max(back.y1, front.y1)), z1: Math.round(Math.max(back.z1, front.z1)) },
      back: { key: back.bc[0].key, k: Math.round(back._k), fp: [back.x0, back.y0, back.x1, back.y1].map(Math.round) },
      front: { key: front.bc[0].key, k: Math.round(front._k), fp: [front.x0, front.y0, front.x1, front.y1].map(Math.round) },
      note: `${back.bc[0].key} stands behind ${front.bc[0].key} but is keyed later (${Math.round(back._k)} > ${Math.round(front._k)})` });
  }
  return { norm, findings: F.concat(pairs) };
}

module.exports = { audit, pipeOf, nameOf };

if(require.main === module){
  const c = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const r = audit(c);
  if(process.argv[3]) fs.writeFileSync(process.argv[3], JSON.stringify(r, null, 1));
  console.log('pipelines (standing pieces): ' + Object.entries(r.norm).map(([p, n]) => `${p} n${n.n} len~${n.lenMed} key~${n.keyMed}`).join(' | '));
  const by = {};
  for(const f of r.findings){ const k = f.rule + ' ' + f.obj; (by[k] = by[k] || []).push(f); }
  for(const [k, l] of Object.entries(by).sort((a, b) => b[1].length - a[1].length)) console.log(String(l.length).padStart(4), k, '|', l[0].note);
}
