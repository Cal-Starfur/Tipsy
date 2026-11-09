/* SNAP SPOTS: photograph every test spot, for Sir to look at without playing.
   Reads the `- Test:` jump links from docs/state/CONSISTENCY_PASS.md (the same
   links Sir taps on the iPad), boots the LOCAL game/index.html headless at each
   one's ?go= spot, and photographs it at view 3 (the widest) unless told
   otherwise. One fresh boot per spot. Writes a JPEG per spot and one slides
   page, snaps/slides.html: a photo per slide (arrows, swipe, thumbnails), each
   with its label, batch and an "Open in game" link to the test page at that
   spot. The photos go beside it as snaps/img/NN.jpg; snaps/files.json is the
   publish's `files` map, so the page itself stays small.

     node tools/snap_spots.js                  every Test: link in the doc
     node tools/snap_spots.js --only harbor    links whose label or batch has "harbor"
     node tools/snap_spots.js --go 4244,15060 --label "trophy door"   one ad-hoc spot
     node tools/snap_spots.js --view 2         another zoom (1, 2 or 3; default 3)
     node tools/snap_spots.js --doc <file.md> --out <dir>

   Prints one line per spot (label, spot, page errors) and the slides page's path.
   Exits 1 if any spot threw a page error. snaps/ is git-ignored. */
const fs = require('fs'), path = require('path'), http = require('http');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const arg = (k, d) => args.includes(k) ? args[args.indexOf(k) + 1] : d;
const DOC = path.resolve(ROOT, arg('--doc', 'docs/state/CONSISTENCY_PASS.md'));
const OUT = path.resolve(ROOT, arg('--out', 'snaps'));
const VIEW = +arg('--view', 3);
const ONLY = (arg('--only', '') || '').toLowerCase();
const GO = arg('--go', null);
const WAIT = +arg('--wait', 6000);
const TEST_PAGE = 'https://cal-starfur.github.io/Tipsy/consistency-pass/';   // ms after he lands: ground and building caches paint

function loadPlaywright(){
  try { return require('playwright'); }
  catch(e){ return require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); }
}

/* the doc's Test: lines -> [{ batch, label, go, hint, changes }]. A link's
   title is its "look for" hint: [label](url "what to check here"). changes is
   the batch's own bullet list (top-level bullets, sub-bullets joined on), so
   each slide says what that batch changed. */
const plain = t => t.replace(/\*\*|`/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').trim();
function spotsFromDoc(){
  const out = [], bullets = {};
  let batch = '';
  for(const line of fs.readFileSync(DOC, 'utf8').split('\n')){
    const h = /^#{2,3}\s+(.*)/.exec(line);
    if(h){ batch = h[1].trim(); bullets[batch] = bullets[batch] || []; continue; }
    if(!batch) continue;
    if(/^\s*-\s*Test:/.test(line)){
      for(const m of line.matchAll(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g)){
        const q = /[?&]go=([^&)\s]+)/.exec(m[2]);
        if(q) out.push({ batch, label: m[1], go: decodeURIComponent(q[1]), hint: (m[3] || '').replace(/^look for:\s*/i, '') });
      }
      continue;
    }
    const b = /^(\s*)-\s+(.*)/.exec(line);
    if(!b) continue;
    const list = bullets[batch];
    if(b[1].length === 0 || !list.length) list.push(plain(b[2]));
    else list[list.length - 1] += (/[.:]$/.test(list[list.length - 1]) ? ' ' : '; ') + plain(b[2]);
  }
  for(const o of out) o.changes = [{ batch: o.batch, items: bullets[o.batch] || [] }];
  return out;
}

function serve(){
  const types = { '.html':'text/html', '.js':'application/javascript', '.json':'application/json', '.png':'image/png', '.css':'text/css' };
  const srv = http.createServer((req, res) => {
    const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if(!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r(srv)));
}

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' })[c]);

(async () => {
  let spots = GO ? [{ batch: 'ad hoc', label: arg('--label', GO), go: GO }] : spotsFromDoc();
  if(ONLY) spots = spots.filter(s => (s.label + ' ' + s.batch).toLowerCase().includes(ONLY));
  /* the same spot listed under two batches is photographed once */
  const seen = new Map();
  for(const s of spots){ const k = s.go; if(seen.has(k)){ const t = seen.get(k); t.also.push(s.batch); t.hints.push(s.hint); t.changes.push(...(s.changes || [])); } else seen.set(k, { ...s, also: [], hints: [s.hint], changes: s.changes || [] }); }
  spots = [...seen.values()];
  if(!spots.length){ console.log('no spots (check --only, or the doc has no "- Test:" lines)'); process.exit(1); }
  fs.mkdirSync(OUT, { recursive: true });
  for(const f of fs.readdirSync(OUT)) if(/\.(png|jpg|html|json)$/.test(f)) fs.unlinkSync(path.join(OUT, f));   // last run's photos

  const { chromium } = loadPlaywright();
  const srv = await serve();
  const base = `http://127.0.0.1:${srv.address().port}/game/index.html`;
  const exe = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
  await page.route('**/cdn.jsdelivr.net/**phaser*', r => r.fulfill({ path: path.join(ROOT, 'tipsey-delivery/public/phaser.min.js'), contentType: 'application/javascript' }));
  await page.route(/fonts\.googleapis|fonts\.gstatic/, r => r.abort());
  let errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 200)));

  const shots = [];
  let bad = 0;
  for(const [i, s] of spots.entries()){
    errs = [];
    const go = /^[a-z]+$/i.test(s.go) ? s.go : s.go.split(',').map(Number).join(',');
    await page.goto(`${base}?go=${encodeURIComponent(go)}&view=${VIEW}`);
    /* the game's own ?go= stands him there (garage shut, camera snapped) */
    await page.waitForFunction(() => { try { const w = game.scene.getScene('world'); return w && w.ow && w.state === 'play'; } catch(e){ return false; } }, null, { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(2500 + WAIT);
    const at = await page.evaluate(() => { const o = game.scene.getScene('world').ow; return Math.round(o.px) + ',' + Math.round(o.py); }).catch(() => '?');
    const file = path.join(OUT, `${String(i + 1).padStart(2, '0')}-${slug(s.label)}.jpg`);
    await page.screenshot({ path: file, type: 'jpeg', quality: 82 });
    shots.push({ ...s, file, at, errs: [...errs] });
    if(errs.length) bad++;
    console.log(`${String(i + 1).padStart(2)}. ${s.label}  [${s.batch}${s.also.length ? ' + ' + s.also.join(', ') : ''}]  go=${s.go} -> at ${at}  ${errs.length ? 'ERRORS: ' + errs.join(' | ') : 'ok'}`);
  }

  await browser.close(); srv.close();
  /* the photos ride beside the page as its own files (img/NN.jpg, stable names
     so a republish replaces them), keeping slides.html small and cheap to read.
     files.json is the Artifact publish's `files` map. */
  fs.mkdirSync(path.join(OUT, 'img'), { recursive: true });
  for(const f of fs.readdirSync(path.join(OUT, 'img'))) fs.unlinkSync(path.join(OUT, 'img', f));
  const filesMap = {};
  shots.forEach((s, i) => { s.pub = `img/${String(i + 1).padStart(2, '0')}.jpg`; fs.copyFileSync(s.file, path.join(OUT, s.pub)); filesMap[s.pub] = path.join(OUT, s.pub); });
  fs.writeFileSync(path.join(OUT, 'files.json'), JSON.stringify(filesMap, null, 1));
  const out = path.join(OUT, 'slides.html');
  fs.writeFileSync(out, slidesPage(shots));
  console.log(`slides: ${out}  (${shots.length} spots, ${bad} with page errors)`);
  process.exit(bad ? 1 : 0);
})();

/* THE SLIDES PAGE. Published as an artifact (the publish adds the doctype/head
   skeleton, so this starts at <title>). One look, dark, so the photos read. */
function slidesPage(shots){
  const when = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
  const data = shots.map(s => ({
    key: 'g-' + s.go.replace(/[^A-Za-z0-9.-]/g, '_'),
    hints: s.hints.filter(Boolean), changes: s.changes,
    label: s.label, batch: s.batch + (s.also.length ? ' + ' + s.also.join(', ') : ''), go: s.go, errs: s.errs,
    link: `${TEST_PAGE}?go=${s.go}&view=${VIEW}`,
    img: s.pub,
  }));
  return `<title>Tipsy Spot Slides</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rubik:wght@500;700&family=Source+Sans+3:wght@400;600&display=swap">
<style>
/* Layout: one photo at a time, its caption under it, a thumbnail strip to jump; single dark look so game shots read */
:root{ --bg:#11151b; --panel:#1a2029; --fg:#eef1f5; --soft:#9aa6b6; --line:#2b3340; --accent:#f0772a; --warn:#ff6b5a; --ok:#4cc285; --ready:#4aa3ff; --ink:#ff2d3d;
  --display:"Rubik",system-ui,-apple-system,sans-serif; --body:"Source Sans 3",system-ui,-apple-system,sans-serif; color-scheme:dark }
html,body{height:100%}
body{background:var(--bg);color:var(--fg);font:16px/1.45 var(--body);margin:0}
.app{display:flex;flex-direction:column;gap:12px;min-height:100%;padding-block:14px 18px;
  padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));max-width:1240px;margin:0 auto}
.top{display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap}
h1{font:700 1.15rem/1.2 var(--display);margin:0}
.meta{color:var(--soft);font-size:.9rem;font-variant-numeric:tabular-nums}
.stage{position:relative;border-radius:12px;overflow:hidden;background:#000;touch-action:pan-y}
.stage img{display:block;width:100%;height:auto;max-width:100%;aspect-ratio:1180/820;object-fit:contain;user-select:none;-webkit-user-drag:none}
.nav{position:absolute;top:50%;transform:translateY(-50%);width:48px;height:48px;border-radius:50%;border:0;
  background:rgba(17,21,27,.72);color:var(--fg);font:700 1.4rem var(--display);cursor:pointer;display:grid;place-items:center}
.nav.prev{left:10px}.nav.next{right:10px}
.nav:disabled{opacity:.25;cursor:default}
.nav:focus-visible,.thumbs button:focus-visible,.go:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.cap{display:flex;gap:14px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap}
.cap .txt{min-width:0;flex:1 1 300px;display:grid;gap:2px}
.num{font:500 .8rem var(--display);letter-spacing:.06em;text-transform:uppercase;color:var(--accent);font-variant-numeric:tabular-nums}
h2{font:700 1.35rem/1.2 var(--display);margin:0;text-wrap:balance}
.batch{color:var(--soft)}
.err{color:var(--warn);font-size:.92rem}
.go{flex:0 0 auto;font:600 .95rem var(--display);color:#fff;background:var(--accent);border-radius:99px;padding:10px 16px;text-decoration:none;white-space:nowrap}
.thumbs{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;scrollbar-width:thin}
.thumbs button{flex:0 0 auto;width:112px;padding:0;border:2px solid transparent;border-radius:8px;overflow:hidden;background:var(--panel);cursor:pointer;position:relative}
.thumbs button[aria-current="true"]{border-color:var(--accent)}
.thumbs img{display:block;width:100%;aspect-ratio:1180/820;object-fit:cover;opacity:.7}
.thumbs button[aria-current="true"] img{opacity:1}
.thumbs span{position:absolute;left:4px;top:3px;font:700 .72rem var(--display);background:rgba(17,21,27,.8);border-radius:4px;padding:0 5px;font-variant-numeric:tabular-nums}
.hint{color:var(--soft);font-size:.85rem;margin:0}
.look{display:grid;gap:4px;background:var(--panel);border:1px solid var(--line);border-left:4px solid var(--accent);border-radius:10px;padding:10px 14px}
.look b{font:600 .8rem var(--display);letter-spacing:.06em;text-transform:uppercase;color:var(--accent)}
.look ul{margin:0;padding-left:18px;display:grid;gap:3px}
.look p{margin:0;color:var(--soft)}
details.changed{color:var(--soft);font-size:.95rem}
details.changed summary{cursor:pointer;font:600 .9rem var(--display);color:var(--fg)}
details.changed h3{font:600 .85rem var(--display);color:var(--fg);margin:10px 0 4px}
details.changed ul{margin:0;padding-left:18px;display:grid;gap:4px;max-width:75ch}
.fix{display:grid;gap:8px;background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:12px 14px}
.fix label{font:600 .9rem var(--display)}
.fix textarea{width:100%;box-sizing:border-box;min-height:84px;resize:vertical;font:16px/1.4 var(--body);color:var(--fg);background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:9px 11px}
.fix textarea:focus-visible,.fix button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.fixrow{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
#ink{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;touch-action:none}
.stage.drawing{outline:3px solid var(--ink);outline-offset:-3px}
.stage.drawing #ink{pointer-events:auto;cursor:crosshair}
.stage.drawing .nav{display:none}
#draw[aria-pressed="true"]{background:var(--ink);border-color:var(--ink);color:#fff}
.fix button{font:600 .9rem var(--display);border-radius:99px;padding:8px 14px;cursor:pointer;border:1px solid var(--line);background:transparent;color:var(--fg)}
.fix button.save{background:var(--accent);border-color:var(--accent);color:#fff}
.fix button[aria-pressed="true"]{background:var(--ok);border-color:var(--ok);color:#0d1a12}
.fix button:disabled{opacity:.45;cursor:default}
.state{color:var(--soft);font-size:.88rem}
.tally{font:600 .85rem var(--display);color:var(--accent)}
.thumbs i{position:absolute;right:4px;top:4px;width:10px;height:10px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 2px var(--bg)}
.thumbs i.done{background:var(--ok)}
.thumbs i.ready{background:var(--ready)}
.fix .badge{font:600 .78rem var(--display);letter-spacing:.05em;text-transform:uppercase;border-radius:99px;padding:3px 10px;background:var(--line);color:var(--fg)}
.fix .badge.open{background:var(--accent);color:#fff}.fix .badge.ready{background:var(--ready);color:#06213d}.fix .badge.fixed{background:var(--ok);color:#0d1a12}
@media (max-width:520px){ .nav{width:40px;height:40px} h2{font-size:1.15rem} .thumbs button{width:88px} }
</style>
<div class="app">
  <div class="top"><h1>Tipsy spot slides</h1><span class="meta">${data.length} spots &middot; view ${VIEW} &middot; ${when} <span class="tally" id="tally"></span></span></div>
  <div class="stage" id="stage">
    <img id="photo" alt="">
    <canvas id="ink" aria-label="Your marks on this photo"></canvas>
    <button class="nav prev" id="prev" type="button" aria-label="Previous spot">&#8249;</button>
    <button class="nav next" id="next" type="button" aria-label="Next spot">&#8250;</button>
  </div>
  <div class="cap">
    <div class="txt"><span class="num" id="num"></span><h2 id="label"></h2><span class="batch" id="batch"></span><span class="err" id="err" hidden></span></div>
    <a class="go" id="go" target="_blank" rel="noopener">Open in game &#8599;</a>
  </div>
  <div class="look" id="look"><b>Look for</b><ul id="lookList"></ul><p id="lookNone" hidden>No hint written for this spot yet; see what the batch changed below.</p></div>
  <details class="changed" id="changed"><summary>What this batch changed</summary><div id="changedBody"></div></details>
  <div class="fix" id="fix">
    <label for="note">What needs fixing at this spot?</label>
    <textarea id="note" placeholder="e.g. the guard stands inside the booth wall; the bench overlaps the lamp"></textarea>
    <div class="fixrow">
      <button id="draw" type="button" aria-pressed="false">Draw on photo</button>
      <button id="undo" type="button">Undo</button>
      <button id="clear" type="button">Clear marks</button>
    </div>
    <div class="fixrow">
      <button class="save" id="save" type="button">Save note</button>
      <button id="done" type="button" aria-pressed="false">Mark fixed</button>
      <span class="badge" id="badge" hidden></span>
      <span class="state" id="state">Loading notes&hellip;</span>
    </div>
  </div>
  <div class="thumbs" id="thumbs" role="tablist" aria-label="All spots"></div>
  <p class="hint">Swipe or use the arrows. "Open in game" opens the test page with Tipsey at that spot; open it in Safari. Notes are saved with this page, so the next fix session reads them.</p>
</div>
<script>
const S = ${JSON.stringify(data)};
let at = 0;
const $ = id => document.getElementById(id);
const thumbs = S.map((s, i) => {
  const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', (i + 1) + '. ' + s.label);
  b.innerHTML = '<img alt=""><span>' + (i + 1) + '</span><i hidden></i>'; b.querySelector('img').src = s.img;
  b.onclick = () => show(i); $('thumbs').appendChild(b); return b;
});
function show(i){
  at = Math.max(0, Math.min(S.length - 1, i)); const s = S[at];
  $('photo').src = s.img; $('photo').alt = s.label;
  $('num').textContent = 'Spot ' + (at + 1) + ' of ' + S.length;
  $('label').textContent = s.label; $('batch').textContent = s.batch;
  $('err').hidden = !s.errs.length; $('err').textContent = s.errs.length ? 'Page errors: ' + s.errs.join(' | ') : '';
  $('go').href = s.link;
  const ll = $('lookList'); ll.textContent = '';
  for(const h of s.hints){ const li = document.createElement('li'); li.textContent = h; ll.appendChild(li); }
  $('lookNone').hidden = s.hints.length > 0; ll.hidden = !s.hints.length;
  const cb = $('changedBody'); cb.textContent = '';
  for(const c of s.changes){
    if(s.changes.length > 1){ const h3 = document.createElement('h3'); h3.textContent = c.batch; cb.appendChild(h3); }
    const ul = document.createElement('ul');
    for(const it of c.items){ const li = document.createElement('li'); li.textContent = it; ul.appendChild(li); }
    cb.appendChild(ul);
  }
  $('changed').hidden = !s.changes.some(c => c.items.length);
  $('prev').disabled = at === 0; $('next').disabled = at === S.length - 1;
  thumbs.forEach((b, k) => b.setAttribute('aria-current', k === at ? 'true' : 'false'));
  const t = thumbs[at], c = $('thumbs'); c.scrollLeft = t.offsetLeft - c.offsetLeft - (c.clientWidth - t.clientWidth)/2;
  if(location.hash !== '#s' + (at + 1)) history.replaceState(null, '', '#s' + (at + 1));
  setDrawing(false); renderNote(); paint();
}
/* NOTES: one doc per spot in fixes/<key>, keyed by the spot (not the slide
   number), so a note stays with its spot when the photos are retaken */
const notes = {}; let db = null, dbState = 'loading';
function renderNote(){
  const s = S[at], n = notes[s.key];
  if(n && !dirty[s.key]) { ink[s.key] = (n.marks || []).map(m => m.p || m); }
  const ta = $('note');
  if(document.activeElement !== ta) ta.value = n ? (n.note || '') : '';
  const st = n && (n.note || (n.marks && n.marks.length)) ? (n.status || 'open') : '';
  $('done').setAttribute('aria-pressed', st === 'fixed' ? 'true' : 'false');
  $('done').textContent = st === 'fixed' ? 'Reopen' : 'Mark fixed';
  $('badge').hidden = !st; $('badge').className = 'badge ' + st;
  $('badge').textContent = st === 'fixed' ? 'Fixed: you checked it' : st === 'ready' ? 'Ready to check' : st ? 'Open' : '';
  const on = dbState === 'ready';
  ta.disabled = !on; $('save').disabled = !on; $('done').disabled = !on || !n || !(n.note || (n.marks && n.marks.length));
  ['draw', 'undo', 'clear'].forEach(id => { $(id).disabled = !on; });
  $('state').textContent = dbState === 'loading' ? 'Loading notes\u2026' : dbState === 'slow' ? "Notes can't be reached yet." : dbState === 'off' ? 'Notes work when this page is open in claude.ai.' : dbState === 'ro' ? 'You can read notes here but not change them.' : dirty[s.key] ? 'Unsaved marks: tap Save note.' : n && (n.note || (n.marks && n.marks.length)) ? (st === 'fixed' ? 'Claude removes this note next session.' : st === 'ready' ? 'Claude fixed this: check it in the game, then Mark fixed or add to the note.' : 'Waiting for a fix.') : 'No note for this spot.';
  thumbs.forEach((b, k) => { const m = notes[S[k].key], dot = b.querySelector('i'); dot.hidden = !(m && (m.note || (m.marks && m.marks.length))); dot.className = m && m.status === 'fixed' ? 'done' : m && m.status === 'ready' ? 'ready' : ''; });
  const live = Object.values(notes).filter(m => m.note || (m.marks && m.marks.length));
  const open = live.filter(m => (m.status || 'open') === 'open').length, ready = live.filter(m => m.status === 'ready').length;
  $('tally').textContent = [open ? open + ' to fix' : '', ready ? ready + ' to check' : ''].filter(Boolean).map(t => '\u00b7 ' + t).join(' ');
}
async function write(patch){
  const s = S[at], n = notes[s.key] || {};
  const body = { label: s.label, batch: s.batch, go: s.go, link: s.link, note: n.note || '', status: n.status || 'open', updatedAt: new Date().toISOString(), ...patch };
  if(dirty[s.key] || !('marks' in body)){
    const st = ink[s.key] || [];
    body.marks = st.map(p => ({ p: p.map(q => [Math.round(q[0]*1000)/1000, Math.round(q[1]*1000)/1000]) }));
    body.markup = st.length ? markedUp() : '';
  }
  $('state').textContent = 'Saving\u2026';
  try { await db.collection('fixes').doc(s.key).set(body); notes[s.key] = body; dirty[s.key] = false; renderNote(); $('state').textContent = 'Saved.'; }
  catch(e){ if(e && e.code === 'invalid_argument'){ dbState = 'ro'; renderNote(); } else $('state').textContent = "Couldn't save. Try again in a moment."; }
}
$('save').onclick = () => { const v = $('note').value.trim(); write({ note: v, status: 'open' }); };
$('done').onclick = () => { const n = notes[S[at].key]; write({ status: n && n.status === 'fixed' ? 'open' : 'fixed' }); };
(async () => {
  try { db = window.claude && claude.use ? await claude.use('db') : null; } catch(e){ db = null; }
  if(!db){ dbState = 'off'; renderNote(); return; }
  const slow = setTimeout(() => { if(dbState === 'loading'){ dbState = 'slow'; renderNote(); } }, 10000);
  db.collection('fixes').onSnapshot(q => {
    for(const d of q.docs) notes[d.id] = d.data();
    for(const c of q.docChanges()) if(c.type === 'removed') delete notes[c.doc.id];
    if(!q.metadata.fromCache){ clearTimeout(slow); }
    if(dbState === 'loading' || dbState === 'slow') dbState = 'ready';
    renderNote();
  }, () => { clearTimeout(slow); dbState = 'off'; renderNote(); });
})();
$('prev').onclick = () => show(at - 1); $('next').onclick = () => show(at + 1);
addEventListener('keydown', e => { if(e.key === 'ArrowLeft') show(at - 1); if(e.key === 'ArrowRight') show(at + 1); });
let x0 = null;
$('stage').addEventListener('pointerdown', e => { x0 = drawing ? null : e.clientX; });
$('stage').addEventListener('pointerup', e => { if(x0 === null) return; const d = e.clientX - x0; x0 = null; if(Math.abs(d) > 40) show(at + (d < 0 ? 1 : -1)); });
/* INK: marks drawn on the photo, kept per spot as strokes in 0..1 photo
   coordinates (so they fit any screen), saved with the note as the strokes
   and as a marked-up JPEG of the photo for the fix session to look at */
const ink = {}, dirty = {}; let drawing = false, cur = null;
const cv = $('ink'), cx = cv.getContext('2d');
function setDrawing(on){
  drawing = on; $('stage').classList.toggle('drawing', on);
  $('draw').setAttribute('aria-pressed', on ? 'true' : 'false');
  $('draw').textContent = on ? 'Done drawing' : 'Draw on photo';
}
function strokeAll(g, w, h, list){
  g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#ff2d3d'; g.lineWidth = Math.max(3, w * 0.006);
  for(const st of list){
    if(!st.length) continue;
    g.beginPath(); g.moveTo(st[0][0]*w, st[0][1]*h);
    if(st.length === 1) g.lineTo(st[0][0]*w + 0.1, st[0][1]*h);
    for(const q of st) g.lineTo(q[0]*w, q[1]*h);
    g.stroke();
  }
}
function paint(){
  const r = cv.getBoundingClientRect(), d = window.devicePixelRatio || 1;
  const W = Math.round(r.width * d), H = Math.round(r.height * d);
  if(cv.width !== W || cv.height !== H){ cv.width = W; cv.height = H; }
  cx.clearRect(0, 0, W, H);
  strokeAll(cx, W, H, (ink[S[at].key] || []).concat(cur ? [cur] : []));
}
function markedUp(){
  const im = $('photo'), w = 960, h = Math.round(w * 820 / 1180);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.drawImage(im, 0, 0, w, h);
  strokeAll(g, w, h, ink[S[at].key] || []);
  try { return c.toDataURL('image/jpeg', 0.72); } catch(e){ return ''; }
}
const ptOf = e => { const r = cv.getBoundingClientRect(); return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))]; };
cv.addEventListener('pointerdown', e => { if(!drawing) return; e.preventDefault(); cv.setPointerCapture(e.pointerId); cur = [ptOf(e)]; paint(); });
cv.addEventListener('pointermove', e => {
  if(!drawing || !cur) return;
  for(const ev of (e.getCoalescedEvents ? e.getCoalescedEvents() : [e])){
    const q = ptOf(ev), l = cur[cur.length - 1];
    if(Math.abs(q[0] - l[0]) + Math.abs(q[1] - l[1]) > 0.002) cur.push(q);
  }
  paint();
});
const endStroke = () => { if(!cur) return; const k = S[at].key; (ink[k] = ink[k] || []).push(cur); cur = null; dirty[k] = true; paint(); renderNote(); };
cv.addEventListener('pointerup', endStroke); cv.addEventListener('pointercancel', endStroke);
$('draw').onclick = () => setDrawing(!drawing);
$('undo').onclick = () => { const k = S[at].key; if(ink[k] && ink[k].length){ ink[k].pop(); dirty[k] = true; paint(); renderNote(); } };
$('clear').onclick = () => { const k = S[at].key; if(ink[k] && ink[k].length){ ink[k] = []; dirty[k] = true; paint(); renderNote(); } };
$('photo').addEventListener('load', paint);
addEventListener('resize', paint);
const fromHash = () => { const m = /^#s(\\d+)$/.exec(location.hash); return m ? +m[1] - 1 : 0; };
addEventListener('hashchange', () => show(fromHash()));
show(fromHash());
</script>
`;
}
