/* THE GATE: whatever goes in (a new library entry, a building on the map, a crowd, a vehicle) is
   measured by the same censuses that measure what is already there, and held to the same norms.

     node tools/review/gate.js                      everything: library, the world's sort, people and vehicles
     node tools/review/gate.js --only "Kelp Cafe"   the same, judging only findings about that subject
     node tools/review/gate.js --phases library     library | world | actors (comma separated)
     node tools/review/gate.js --area x0,y0,x1,y1   sweep only this part of the map (a new site)
     node tools/review/gate.js --spots mall,shops   watch people and vehicles only at these spots
     node tools/review/gate.js --accept             record today's findings as the known baseline
     node tools/review/gate.js --rev <commit>       judge that commit's game/index.html, not the working tree

   Every finding gets a stable id (rule | subject: an entry's name, a cache key's object, a people or
   vehicle system named by its drawing functions and the text of its queue line -- never a line number,
   which moves with every edit). Against tools/review/known.json (the outliers already on the list):
     NEW    not known: the new piece does not fit the system. FAIL.
     KNOWN  on the list, still there (legacy, waiting for its fix)
     FIXED  on the list, gone: take it off with --accept
   Exit code 1 when anything is NEW. */
const H = require('./harness.js'), fs = require('fs'), path = require('path');
const kits = require('./kits.js'), census = require('./census.js'), u1 = require('./u1.js'), actors = require('./actors.js');
const shops = require('./shops.js'), landmarks = require('./landmarks.js');

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const KNOWN = path.join(__dirname, 'known.json');
/* the source the names are read from: the judged commit's (--rev) or the working tree's */
const REV0 = (() => { const i = process.argv.indexOf('--rev'); return i > 0 ? process.argv[i + 1] : null; })();
const SRC = (REV0 ? require('child_process').execSync(`git -C "${H.ROOT}" show ${REV0}:game/index.html`, { maxBuffer: 64 << 20 }).toString()
                  : fs.readFileSync(path.join(H.ROOT, 'game/index.html'), 'utf8')).split('\n');

/* a people or vehicle system's stable name: its drawing functions and its queue line's own text */
function sysName(site){
  const m = String(site || '').match(/^(\d+)\s*(.*)$/);
  if(!m) return String(site);
  /* the statement that queued it (the nearest push / queuePerson above the call) and the method it is in */
  const L = +m[1] - 1;
  let q = null, meth = null;
  for(let i = L; i >= Math.max(0, L - 60) && !q; i--) if(/(VQ|vq|bodies|blockVQ)\.push\(|queuePerson\(/.test(SRC[i])) q = SRC[i];
  for(let i = L; i >= Math.max(0, L - 4000) && !meth; i--){ const mm = SRC[i].match(/^  ([a-zA-Z_$][\w$]*)\([^)]*\)\s*\{\s*$/); if(mm) meth = mm[1]; }
  const txt = (q || SRC[L] || '').trim().replace(/\s+/g, ' ').replace(/\/\*.*?\*\//g, '').slice(0, 60);
  return (meth ? meth + ': ' : '') + (m[2] ? m[2] + ' @ ' : '') + txt;
}

async function main(){
  const phases = (arg('--phases', 'library,world,actors')).split(',');
  const only = arg('--only', null), area = arg('--area', null), spots = arg('--spots', null), secs = +arg('--secs', 30);
  const out = arg('--out', path.join(H.ROOT, '.review', 'gate'));
  fs.mkdirSync(out, { recursive: true });
  const F = [];                                       // { id, phase, rule, subject, note }
  const ids = new Map();
  const add = (phase, rule, subject, note) => { const id = rule + ' | ' + subject; const o = ids.get(id); if(o){ o.more = (o.more || 0) + 1; return; } const f = { id, phase, rule, subject, note }; ids.set(id, f); F.push(f); };
  const rev = arg('--rev', null);                        // a commit to judge (git show), so the working tree can move on meanwhile
  const G = await H.open({ instr: true, rev });
  let cen = null;
  if(phases.includes('world')){
    await G.boot();
    cen = await census.sweep(G.page, { area: area ? area.split(',').map(Number) : undefined, log: m => process.stdout.write('\r' + m + '   ') });
    process.stdout.write('\n');
    fs.writeFileSync(path.join(out, 'census.json'), JSON.stringify(cen));
    const A = u1.audit(cen);
    const seen = new Set();
    for(const f of A.findings){
      if(f.rule === 'U1l' && !f.note) continue;
      const id = f.rule + ' | ' + f.obj;
      if(seen.has(id)) continue; seen.add(id);
      add('world', f.rule, f.obj, f.note);
    }
  }
  if(phases.includes('library')){
    await G.boot();
    const K = await G.page.evaluate(kits.probe);
    if(!cen && fs.existsSync(path.join(out, 'census.json'))) cen = JSON.parse(fs.readFileSync(path.join(out, 'census.json'), 'utf8'));
    const J = kits.judge(K, cen);
    for(const f of J.findings) add('library', f.rule, f.name, f.note);
    const raws = { __probe: {} };
    for(const k of [shops, landmarks]){
      raws.__probe[k.name] = await G.page.evaluate(k.probe, {});
      const j = k.judge(null, raws);
      for(const f of j.findings) if(!f.info) add('library', String(f.rule).split(' ')[0], f.who || f.name || '?', f.msg || f.note || f.rule);
    }
  }
  if(phases.includes('actors')){
    const S = actors.SPOTS.filter(([n]) => !spots || spots.split(',').includes(n));
    const res = await actors.run(G, S, secs, m => console.log('  ' + m));
    const J = actors.judge(res);
    fs.writeFileSync(path.join(out, 'actors.json'), JSON.stringify(J, null, 1));
    for(const f of J.findings){
      const parts = String(f.sys).split(' ');
      const subj = f.kit === 'vehicles' ? sysName(parts.slice(0, -1).join(' ')) + ' [' + parts[parts.length - 1] + ']' : sysName(f.sys);
      add('actors', f.rule.split(' ')[0], subj, f.note);
    }
  }
  const errs = G.errs.slice(); await G.close();
  /* against the list */
  const known = fs.existsSync(KNOWN) ? JSON.parse(fs.readFileSync(KNOWN, 'utf8')) : {};
  const mine = only ? F.filter(f => f.subject.toLowerCase().includes(only.toLowerCase())) : F;
  const ran = new Set(phases);
  const NEW = mine.filter(f => !known[f.id]), KN = mine.filter(f => known[f.id]);
  const now = new Set(F.map(f => f.id));
  const FIXED = Object.entries(known).filter(([id, k]) => ran.has(k.phase) && !now.has(id) && (!only || id.toLowerCase().includes(only.toLowerCase())) && (!area || k.phase !== 'world') && (!spots || k.phase !== 'actors'));
  if(process.argv.includes('--accept')){
    const next = {};
    for(const [id, k] of Object.entries(known)) if(!ran.has(k.phase)) next[id] = k;      // phases not run stay as they were
    for(const f of F) next[f.id] = { phase: f.phase, note: f.note, since: (known[f.id] && known[f.id].since) || new Date().toISOString().slice(0, 10) };
    fs.writeFileSync(KNOWN, JSON.stringify(next, null, 1));
    console.log(`baseline: ${Object.keys(next).length} known findings written to ${path.relative(H.ROOT, KNOWN)}`);
  }
  const rep = { when: new Date().toISOString(), phases, only, area, spots, pageErrors: errs, NEW, KNOWN: KN.map(f => f.id), FIXED: FIXED.map(([id]) => id) };
  fs.writeFileSync(path.join(out, 'gate.json'), JSON.stringify(rep, null, 1));
  console.log(`\nGATE ${NEW.length || errs.length ? 'FAIL' : 'PASS'}${only ? ' for "' + only + '"' : ''}: ${NEW.length} new, ${KN.length} known, ${FIXED.length} fixed, ${errs.length} page errors`);
  for(const f of NEW) console.log(`  NEW   ${f.id}\n        ${f.note}`);
  for(const [id] of FIXED) console.log(`  FIXED ${id}`);
  for(const e of errs.slice(0, 5)) console.log('  PAGE ERROR ' + e);
  process.exitCode = NEW.length || errs.length ? 1 : 0;
}

main();
