/* PIECE SHEET -- a room's pieces drawn alone, old build beside new, a person's height (124) beside each for scale, the
   furniture standards marked on it (38 a chair's seat, 48 a bar stool, 66 a table, 75 a counter). For showing Sir every
   height change before it lands (docs/queue.md section 1).
   node tools/review/piece_sheet.js "<room>" --names "island,ovens" --out <file.png> [--rev HEAD] [--at a,b ...]
     --names  solid names (comma list, each a regexp, case-insensitive): every piece holding a solid so named, one of each
              name and height (the first)
     --rev    the old build (default HEAD); the new one is the working tree
     --all    every instance, not just the first of each name and height */
const H = require('./harness.js'), fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const args = process.argv.slice(2), arg = (k, d) => args.includes(k) ? args[args.indexOf(k) + 1] : d;
const room = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--') && !['--all'].includes(args[i - 1])));
const names = (arg('--names', '') || '').split(',').filter(Boolean), OUT = arg('--out', 'sheet.png'), REV = arg('--rev', 'HEAD'), ALL = args.includes('--all');
async function shoot(rev){
  const h = await H.open({ rev, instr: true }); await h.boot();
  const out = await h.page.evaluate(([room, names, ALL]) => {
    const sc = game.scene.getScene('world'), G = (a, b, z) => ({ x: a - b, y: (a + b)/2 - z });
    const pk = POCKETS.find(p => p.name === room); if(pk && pk.view) pk.view();
    const items = LIB.collect(room, G, 1) || [], res = [], seen = new Set(), res_ = names.map(n => new RegExp(n, 'i'));
    for(const it of items){ const s = (it.solids || []).find(s => s && s.name && res_.some(r => r.test(s.name))); if(!s) continue;
      const key = s.name + '|' + Math.round(s.h || 0); if(!ALL && seen.has(key)) continue; seen.add(key);
      /* the piece's extent, from what it draws */
      const pts = []; window.__RVP3 = (a, b, z) => pts.push([a, b, z]);
      const g0 = sc.add.graphics(); try { LIB.drawItem(room, g0, G, 1, it); } catch(e){} g0.destroy(); window.__RVP3 = null;
      if(!pts.length) continue;
      let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9, z1 = -1e9; for(const [a, b, z] of pts){ a0 = Math.min(a0, a); a1 = Math.max(a1, a); b0 = Math.min(b0, b); b1 = Math.max(b1, b); z1 = Math.max(z1, z); }
      /* the figure: a 124 person beside it, off its east end at its north side (clear of it on screen), on its floor */
      const ext = (a1 - b0) - (a0 - b1) + 120, S = Math.min(2.5, 1300/ext), pa = a1 + 45, pb = b0 + 10, all = pts.concat([[pa - 12, pb - 8, 0], [pa + 12, pb + 8, 124]]);
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for(const [a, b, z] of all){ const x = (a - b)*S, y = ((a + b)/2 - z)*S; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      if(x1 - x0 > 1500 || y1 - y0 > 1200) continue;   // (too big to show alone: a wall run)
      const pad = 40, w = Math.ceil(x1 - x0 + 2*pad + 90), hh = Math.ceil(y1 - y0 + 2*pad + 30);
      const G4 = (a, b, z) => ({ x: (a - b)*S - x0 + pad, y: ((a + b)/2 - z)*S - y0 + pad + 20 });
      const g4 = sc.add.graphics(); g4.fillStyle(0xffffff, 1); g4.fillRect(0, 0, w, hh);
      try { LIB.drawItem(room, g4, G4, S, it); } catch(e){}
      /* the person: legs, torso, head, in grey, seen faces only */
      const quad = (pts, c) => { g4.fillStyle(c, 1); g4.fillPoints(pts.map(([a, b, z]) => G4(a, b, z)), true); };
      const bx = (a0, a1, b0, b1, z0, z1, c) => { quad([[a0, b1, z1], [a1, b1, z1], [a1, b0, z1], [a0, b0, z1]], c + 0x202020);
        quad([[a0, b1, z0], [a1, b1, z0], [a1, b1, z1], [a0, b1, z1]], c); quad([[a1, b0, z0], [a1, b1, z0], [a1, b1, z1], [a1, b0, z1]], c - 0x181818); };
      bx(pa - 9, pa - 1, pb - 5, pb + 5, 0, 62, 0x606870); bx(pa + 1, pa + 9, pb - 5, pb + 5, 0, 62, 0x606870);
      bx(pa - 11, pa + 11, pb - 7, pb + 7, 62, 104, 0x7a8590);
      { const c = G4(pa, pb, 114); g4.fillStyle(0x9aa4ae, 1); g4.fillCircle(c.x, c.y, 10*S); }
      /* the standards, as ticks on a post behind the person */
      const marks = [[38, 0x2b8a3e], [48, 0x1c7ed6], [66, 0xe67700], [75, 0xc92a2a], [124, 0x495057]];
      for(const [z, c] of marks){ const p = G4(pa + 26, pb + 14, z); g4.lineStyle(2, c, 1); g4.lineBetween(p.x - 4, p.y, p.x + 26, p.y); }
      { const p0 = G4(pa + 26, pb + 14, 0), p1 = G4(pa + 26, pb + 14, 124); g4.lineStyle(1, 0x868e96, 1); g4.lineBetween(p0.x, p0.y, p1.x, p1.y); }
      const tk = '__sheet' + res.length; g4.generateTexture(tk, w, hh); g4.destroy();
      const data = sc.textures.getBase64(tk); sc.textures.remove(tk);
      const lab = marks.map(([z]) => { const p = G4(pa + 26, pb + 14, z); return [z, Math.round(p.x + 28), Math.round(p.y)]; });
      res.push({ name: s.name, h: s.h || 0, top: Math.round(z1), at: [Math.round(it.a), Math.round(it.b)], data, lab });
    }
    return res; }, [room, names, ALL]);
  const errs = h.errs.slice(); await h.close(); return { out, errs };
}
(async () => {
  const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'sheet'));
  const old = await shoot(REV), neu = await shoot(null);
  const dump = (L, tag) => L.out.map((r, i) => { const f = path.join(dir, tag + i + '.png'); fs.writeFileSync(f, Buffer.from(r.data.split(',')[1], 'base64')); delete r.data; return Object.assign(r, { f }); });
  const spec = { old: dump(old, 'o'), neu: dump(neu, 'n'), out: path.resolve(OUT), room };
  fs.writeFileSync(path.join(dir, 'spec.json'), JSON.stringify(spec));
  execSync('python3 ' + JSON.stringify(path.join(__dirname, 'piece_sheet.py')) + ' ' + JSON.stringify(path.join(dir, 'spec.json')), { stdio: 'inherit' });
  for(const [t, L] of [['old', old], ['new', neu]]) if(L.errs.length) console.log(t, 'page errors', L.errs);
  console.log('wrote', OUT);
})();
