#!/usr/bin/env node
/* THE ACCEPTED FIXES AS A TEST -- does a checker stay quiet where Sir signed off?

   For every rule in tools/review/approved.json, each `fixCommits` entry names a commit whose after-state Sir
   accepted and the thing it fixed ({ hash, entry } for a library entry, { hash, spot } for a place). The
   review runs on that commit; a finding of that rule on that entry (or at that spot) is a FALSE ALARM -- the
   rule or its threshold is wrong. The before-state (hash^) is run too: there the rule SHOULD fire (a hit).

   Usage: node tools/review/validate_fixes.js [--rule K3] [--out dir]
   Prints a table per rule: commit, what, before (fired?), after (quiet?). */
const path = require('path'), fs = require('fs'), os = require('os');
const { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '../..');
const args = process.argv.slice(2), opt = k => args.includes(k) ? args[args.indexOf(k) + 1] : null;
const A = JSON.parse(fs.readFileSync(path.join(__dirname, 'approved.json'), 'utf8'));
const out = opt('--out') || fs.mkdtempSync(path.join(os.tmpdir(), 'tipsy-validate-'));
const KIT_OF = { K: 'shops', H: 'shops', D0: 'shops', L: 'landmarks', P: 'doors,people', D: 'doors,people', V: 'vehicles', S: 'depth', X: 'depth', G: 'ground' };
const kitFor = id => KIT_OF[id] || KIT_OF[id.replace(/\d.*$/, '')] || KIT_OF[id[0]] || 'shops';
const cache = new Map();
function review(rev, kit, spot){
  const key = rev + '|' + kit + '|' + (spot || '');
  if(cache.has(key)) return cache.get(key);
  const dir = path.join(out, key.replace(/[^a-z0-9]+/gi, '_'));
  const a = [path.join(ROOT, 'tools/world_review.js'), '--rev', rev, '--kit', kit, '--out', dir, '--secs', '40', '--probes', '20', '--spots', spot || 'zzz'];
  try { execFileSync('node', a, { stdio: 'ignore', timeout: 1500000 }); } catch(e){}
  let r = null; try { r = JSON.parse(fs.readFileSync(path.join(dir, 'report.json'), 'utf8')); } catch(e){}
  cache.set(key, r); return r;
}
const fired = (r, id, entry) => {
  if(!r) return null;
  for(const sp of r.spots) for(const kv of Object.values(sp.kits)) for(const f of kv.findings)
    if(!f.info && String(f.rule).split(' ')[0] === id && (!entry || f.who === entry)) return true;
  return false;
};
const rows = [];
for(const [id, R] of Object.entries(A)){
  if(opt('--rule') && opt('--rule') !== id) continue;
  for(const fx of (R.fixCommits || [])){
    const kit = kitFor(id), spot = fx.spot || null;
    const after = review(fx.hash, kit, spot), before = review(fx.hash + '^', kit, spot);
    const b = fired(before, id, fx.entry), a = fired(after, id, fx.entry);
    rows.push({ id, hash: fx.hash, what: fx.entry || fx.spot || '', before: b, after: a });
    console.log(`${id.padEnd(5)} ${fx.hash.padEnd(8)} ${(fx.entry || fx.spot || '').padEnd(30)} before: ${b === null ? 'n/a' : b ? 'FIRED (hit)' : 'quiet (miss)'}   after: ${a === null ? 'n/a' : a ? 'FIRED (false alarm)' : 'quiet (good)'}`);
  }
}
fs.writeFileSync(path.join(out, 'validate.json'), JSON.stringify(rows, null, 1));
const ok = rows.filter(r => r.after === false).length, fa = rows.filter(r => r.after === true).length, hit = rows.filter(r => r.before === true).length;
console.log(`\n${rows.length} accepted fixes: quiet after ${ok}, false alarms ${fa}; fired before ${hit}. Results: ${path.join(out, 'validate.json')}`);
