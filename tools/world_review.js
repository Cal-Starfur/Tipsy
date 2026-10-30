#!/usr/bin/env node
/* TIPSY WORLD REVIEW -- the kits' checkers run over the real game.

   Each kit (tools/review/<kit>.js) knows its contract (docs/kits/<kit>.md)
   and how to catch a breach of it in the running game. This boots the game
   headless, stands Tipsey at each spot, lets the kit watch, and writes a
   report: every finding, with a snapshot where it can, and a marked-up
   screenshot of each spot.

   Usage:
     node tools/world_review.js                     every kit, every spot
     node tools/world_review.js --kit people        one kit
     node tools/world_review.js --spots hosp,shops  spots whose name has these
     node tools/world_review.js --secs 60           how long to watch each spot (default 45)
     node tools/world_review.js --rev <git ref>     review game/index.html as it was then (the backtest)
     node tools/world_review.js --out <dir>         where the report goes (default: a temp dir, printed)
   Needs Playwright and Chromium (as tools/perf_check.js). */
const path = require('path'), fs = require('fs'), os = require('os');
const H = require('./review/harness');
const { libPhoto } = require('./review/photo');

/* THE APPROVED REFERENCES (tools/review/approved.json): per rule, the values Sir accepted, the entries or places
   that show it done right today, and the fix commits whose after-state is accepted (tools/review/validate_fixes.js
   runs the checkers there: they must stay quiet). A finding is shown beside its rule's approved example. */
const APPROVED = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'review', 'approved.json'), 'utf8')); } catch(e){ return {}; } })();
const ruleId = r => String(r).split(' ')[0];
const KITS = { doors: require('./review/doors'), people: require('./review/people'), vehicles: require('./review/vehicles'),
               ground: require('./review/ground'), landmarks: require('./review/landmarks'), depth: require('./review/depth'),
               shops: require('./review/shops') };   // (doors judge first: it marks the people's door events)

/* THE FLATS: where to stand to see each kit's work. A spot is [x, y], null
   (where the game spawns him), or an expression in the game's realm. */
const SPOTS = [
  ['spawn',        null],
  ['shops',        [9179, 2493]],
  ['hosp-front',   [18500, 5800]],                       // Marina General's main doors, the kerb, the porter's car
  ['hosp-er',      [21500, 5700]],                       // the ER's bay: the ambulance, its crew, the gurney
  ['mall',         [12600, -560]],                       // Maritime Mall's plaza and doors
  ['strand',       `(() => { const g = game.scene.getScene('world').route.grid, h = nssHomeDoorsOf(g); return h.length ? { x: h[h.length >> 1].x + 520, y: h[h.length >> 1].y } : null; })()`],
  ['garage',       [7800, -560]],
  /* inside Marina General: driven in through the main doors by the game's own auto-drive (gothDrive), then stopped */
  ['hosp-in',      [18200, 5640], `(async () => { const s = game.scene.getScene('world'), sl = ms => new Promise(r => setTimeout(r, ms));
      owStandUpAt(s, 18200, HOSP.podium.y1 + 120, -Math.PI/2); await sl(800);
      gothDrive({ x: 18200, y: HOSP.podium.y1 - 300 }, () => {});
      for(let i = 0; i < 30 && !s._inside; i++) await sl(300);
      await sl(1200); if(typeof GOTH !== 'undefined') GOTH.auto = null;
      /* on in, to the lobby (the interior's own frame), clear of the doorway */
      if(s._inside) gothDrive({ x: HOSP_IN.x0 + (18200 - HOSP.podium.x0), y: HOSP_IN.y0 + HOSP_IN.D - 520 }, () => {});
      await sl(5000); if(typeof GOTH !== 'undefined') GOTH.auto = null; s.ow.vel = 0; await sl(1500);
      return !!s._inside; })()`],
];

const args = process.argv.slice(2);
const opt = k => args.includes(k) ? args[args.indexOf(k) + 1] : null;
const kitNames = (opt('--kit') || Object.keys(KITS).join(',')).split(',');
const spotSel = opt('--spots');
const secs = +(opt('--secs') || 45);
const rev = opt('--rev');
const outDir = opt('--out') || fs.mkdtempSync(path.join(os.tmpdir(), 'tipsy-review-'));

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const instr = kitNames.some(k => KITS[k].instr);
  let G = await H.open({ rev, instr });
  /* kits that check the library itself (not a place): once, before the spots */
  const onceKits = kitNames.filter(k => KITS[k].once || KITS[k].onceProbe), placeKits = kitNames.filter(k => !KITS[k].once);
  /* a spot's probes: the ones that only look first, then the ones that move him (depth) */
  const spotProbes = placeKits.filter(k => KITS[k].probe && !KITS[k].onceProbe).sort((a, b) => (a === 'depth') - (b === 'depth'));
  const report = { rev: rev || 'working tree', when: new Date().toISOString(), secs, spots: [] };
  if(onceKits.length){
    await G.boot();
    const raws = { __probe: {} }, kits = {};
    for(const k of onceKits){ raws.__probe[k] = await G.page.evaluate(KITS[k].probe, {}); kits[k] = KITS[k].judge(null, raws); kits[k].raw = raws.__probe[k]; }
    /* photos of the library's findings: the entry alone, the piece outlined (at most 8 a rule; an
       off-the-lot piece at both flanks, since it shows past the corner on one of them) */
    const per = {};
    for(const k of onceKits) for(const f of kits[k].findings){
      if(!photoRule(f)) continue;
      const key = f.rule; per[key] = (per[key] || 0) + 1;
      if(per[key] > 8) continue;
      const base = { name: f.who, box: f.box || null };
      if(f.flank === 'both'){ f.img = await G.page.evaluate(libPhoto, Object.assign({}, base, { flank: true })); f.img2 = await G.page.evaluate(libPhoto, Object.assign({}, base, { flank: false })); }
      else f.img = await G.page.evaluate(libPhoto, Object.assign({}, base, { flank: f.flank === false ? false : true }));
    }
    /* THE ANSWER KEY: the library flags its own measured open defects (fTodo, cTodo). For each rule that has a
       key: of the entries flagged for it, how many the rule caught (recall), and where else it fired */
    const idx = (raws.__probe.shops && raws.__probe.shops.index) || [];
    const fired = id => new Set(onceKits.flatMap(k => kits[k].findings.filter(f => !f.info && ruleId(f.rule) === id).map(f => f.who)));
    const KEY = [['K5', e => /lettering behind/i.test(e.fTodo || '')], ['K16', e => /return \+\d/i.test(e.fTodo || '')], ['L1', e => /need collision/i.test(e.cTodo || '')]];
    report.answerKey = KEY.filter(([id]) => onceKits.some(k => (k === 'shops' && /^K/.test(id)) || (k === 'landmarks' && /^L/.test(id)))).map(([id, sel]) => {
      const want = idx.filter(sel).map(e => e.name), got = fired(id);
      return { rule: id, flagged: want.length, caught: want.filter(n => got.has(n)).length, missed: want.filter(n => !got.has(n)), elsewhere: [...got].filter(n => !want.includes(n)) };
    });
    for(const a of report.answerKey) console.log(`answer key ${a.rule}: caught ${a.caught}/${a.flagged} flagged entries; also fired on ${a.elsewhere.length} unflagged`);
    report.spots.push({ name: 'library', at: null, shot: null, kits, marks: [] });
    console.log(`library      ${onceKits.reduce((a, k) => a + kits[k].findings.length, 0)} findings`);
  }
  const spots = placeKits.length ? SPOTS.filter(([n]) => !spotSel || spotSel.split(',').some(s => n.includes(s))) : [];
  for(const [name, at, setup] of spots){
    /* a spot that crashes the page (the renderer can die under the probes' snapshots) is recorded with its
       error, the browser reopened, and the run goes on */
    try {
    await G.boot();
      let pos = await H.standAt(G.page, at);
      if(setup){ const ok = await G.page.evaluate(src => (0, eval)(src), setup); pos = await G.page.evaluate(() => { const s = game.scene.getScene('world'); return { x: Math.round(s.ow.px), y: Math.round(s.ow.py), inside: s._inside ? s._inside.name : null }; }); if(!ok) console.log(`${name}: setup did not get there`); }
      const kits = {};
      for(const k of placeKits) await G.page.evaluate(KITS[k].install);
      await G.page.waitForTimeout(secs*1000);
      const raws = {};
      for(const k of placeKits) raws[k] = await G.page.evaluate(KITS[k].collect);
      /* the spot as it stands, before any kit's probe moves him */
      const shot = `${name}.png`;
      await G.page.screenshot({ path: path.join(outDir, shot) });
      /* active probes (a kit that has to move him about to test) */
      raws.__probe = {};
      for(const k of spotProbes) raws.__probe[k] = await G.page.evaluate(KITS[k].probe, { n: +(opt('--probes') || 36) });
      for(const k of Object.keys(KITS)) if(placeKits.includes(k)){ kits[k] = KITS[k].judge(raws[k], raws); kits[k].raw = raws[k]; }
      /* each on-screen finding numbered; the rings are drawn over the spot's picture in the report */
      const marks = [];
      for(const k of placeKits) for(const f of kits[k].findings){
        const m = f.msg && f.msg.match(/screen \((-?\d+), (-?\d+)\)/);
        if(m) marks.push({ n: marks.length + 1, x: +m[1], y: +m[2], f });
      }
      for(const m of marks) m.f.mark = m.n;
      report.spots.push({ name, at: pos, shot, kits, marks: marks.map(m => ({ n: m.n, x: m.x, y: m.y })) });
      const n = placeKits.reduce((a, k) => a + kits[k].findings.length, 0);
      console.log(`${name.padEnd(12)} ${n} findings`);
    
    } catch(err){
      console.log(`${name.padEnd(12)} FAILED: ${String(err).split('\n')[0]}`);
      report.spots.push({ name, at, shot: null, kits: {}, marks: [], error: String(err).slice(0, 300) });
      try { await G.close(); } catch(e){}
      G = await H.open({ rev, instr });
    }
  }
  /* the approved examples for every rule that has a finding: a library entry drawn alone, or a place stood at */
  report.approved = {};
  const used = new Set();
  for(const sp of report.spots) for(const kv of Object.values(sp.kits)) for(const f of kv.findings) if(!f.info) used.add(ruleId(f.rule));
  for(const id of used){
    const A = APPROVED[id]; if(!A) continue;
    const ex = [];
    for(const e of (A.exemplars || []).slice(0, 2)){
      try {
        if(e.lib){ const img = await G.page.evaluate(libPhoto, { name: e.lib, flank: e.flank === false ? false : true, box: null }); if(img) ex.push({ what: e.lib, why: e.why || '', img }); }
        else if(e.spot){
          await G.boot(); await H.standAt(G.page, e.spot, Math.PI, e.zoom || 2); await G.page.waitForTimeout(2500);
          const buf = await G.page.screenshot({ type: 'jpeg', quality: 80, clip: { x: 290, y: 160, width: 600, height: 460 } });
          ex.push({ what: e.name || String(e.spot), why: e.why || '', img: 'data:image/jpeg;base64,' + buf.toString('base64') });
        }
      } catch(err){}
    }
    report.approved[id] = { values: A.values || '', ex };
  }
  report.pageErrors = G.errs;
  await G.close();
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 1));
  fs.writeFileSync(path.join(outDir, 'report.html'), html(report));
  console.log(`report: ${path.join(outDir, 'report.html')}`);
})().catch(e => { console.error(e); process.exit(2); });

/* which findings show on screen (a photo) and which only in the numbers or the code (a note) */
function photoRule(f){
  if(f.info) return false;
  const r = f.rule.split(' ')[0];
  if(r === 'K2') return !!(f.box && f.box.painted);
  return ['K3', 'H1', 'L1', 'D0', 'K7', 'K8', 'K12'].includes(r);                          // (K4: a few units past a corner is a numbers fault, not a picture)
}
function isPhoto(f){
  if(f.info || f.note) return false;
  const r = f.rule.split(' ')[0];
  if(['K1', 'K4', 'K5', 'L2', 'L3', 'L4', 'P4', 'P5', 'P6', 'H2', 'H1b'].includes(r)) return false;
  if(['K2', 'K3', 'K4', 'H1', 'L1', 'D0', 'K7', 'K8', 'K12'].includes(r)) return photoRule(f);
  return true;                                                    // the live game's own events and stands carry their picture
}
function esc(s){ return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]); }
function html(R){
  const rows = [], photos = [], notes = [];
  for(const sp of R.spots) for(const [k, kv] of Object.entries(sp.kits)) for(const f of kv.findings){
    if(f.info) continue;
    const ph = isPhoto(f);
    (ph && f.img ? photos : notes).push(Object.assign({ spot: sp.name, kit: k, shot: sp.shot }, f, ph && !f.img ? { msg: f.msg + ' (on screen, no picture caught)' } : {}));
  }
  rows.push(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>World review</title>
<style>body{font:15px/1.45 -apple-system,sans-serif;margin:16px;color:#222;background:#faf8f3;max-width:1100px}h2{margin:30px 0 8px}h3{margin:22px 0 6px;font-size:16px}
.f{padding:10px 0;border-top:1px solid #e4dfd3}.f img{max-width:100%;border-radius:8px;display:block;margin:6px 0}.pair{display:flex;gap:8px;flex-wrap:wrap}.pair img{max-width:calc(50% - 4px)}
.r{font-weight:600}.w{color:#7a6f5c}.small img{max-width:260px}.cnt{color:#7a6f5c;font-size:13px}.note{padding:6px 0;border-top:1px solid #eee}.appr{background:#eef5ea;border-radius:8px;padding:8px 10px;margin:4px 0 8px;font-size:14px}.appr figure{margin:6px 0;max-width:calc(50% - 4px)}.appr img{max-width:100%;border-radius:6px}.appr figcaption{font-size:12px;color:#4d6a45}</style>
<h1>World review</h1><p>${esc(R.rev)} · ${esc(R.when)} · ${photos.length} with photos, ${notes.length} notes</p>`);
  if(R.pageErrors.length) rows.push(`<p><b>Page errors:</b><br>${R.pageErrors.map(esc).join('<br>')}</p>`);
  if(R.answerKey && R.answerKey.length){
    rows.push('<h2>Answer key: the library\'s own open-defect flags</h2><p class="cnt">fTodo and cTodo mark defects a past census measured. A rule should catch every flagged entry; where it fires elsewhere is either a new find or a false alarm (see the photos).</p>');
    for(const a of R.answerKey) rows.push(`<div class="note"><b>${esc(a.rule)}</b>: caught ${a.caught} of ${a.flagged} flagged entries${a.missed.length ? ' — missed: ' + esc(a.missed.join(', ')) : ''}; also fired on ${a.elsewhere.length} unflagged</div>`);
  }
  rows.push('<h2>Photos</h2>');
  const byRule = (L) => { const m = new Map(); for(const f of L){ const k = f.rule; if(!m.has(k)) m.set(k, []); m.get(k).push(f); } return m; };
  const approvedBlock = rule => { const A = (R.approved || {})[ruleId(rule)]; if(!A) return '';
    return `<div class="appr"><b>Approved:</b> ${esc(A.values || '')}${A.ex && A.ex.length ? `<div class="pair">${A.ex.map(e => `<figure><img src="${e.img}"><figcaption>${esc(e.what)}${e.why ? ' — ' + esc(e.why) : ''}</figcaption></figure>`).join('')}</div>` : ''}</div>`; };
  for(const [rule, L] of byRule(photos)){
    rows.push(`<h3>${esc(rule)} <span class="cnt">(${L.length})</span></h3>` + approvedBlock(rule));
    for(const f of L) rows.push(`<div class="f ${f.kit === 'depth' || f.kit === 'people' || f.kit === 'vehicles' ? 'small' : ''}"><span class="w">${esc(f.spot)} · ${esc(f.who)}</span><br>${esc(f.msg)}
${f.img2 ? `<div class="pair"><img src="${f.img}"><img src="${f.img2}"></div>` : f.img ? `<img src="${f.img}">` : ''}</div>`);
  }
  rows.push('<h2>Notes (in the numbers or the code, not on screen)</h2>');
  for(const [rule, L] of byRule(notes)){
    rows.push(`<h3>${esc(rule)} <span class="cnt">(${L.length})</span></h3>` + approvedBlock(rule));
    for(const f of L.slice(0, 40)) rows.push(`<div class="note"><span class="w">${esc(f.spot)} · ${esc(f.who)}</span> — ${esc(f.msg)}</div>`);
    if(L.length > 40) rows.push(`<div class="note cnt">...and ${L.length - 40} more</div>`);
  }
  rows.push('<h2>The spots</h2>');
  for(const sp of R.spots) if(sp.shot) rows.push(`<h3>${esc(sp.name)}</h3><img style="max-width:100%;border-radius:8px" src="${esc(sp.shot)}">`);
  return rows.join('\n');
}
