# PIECE SHEET's composer (tools/review/piece_sheet.js): each piece's old and new drawings side by side, a row each, labelled
import json, sys
from PIL import Image, ImageDraw, ImageFont
spec = json.load(open(sys.argv[1]))
try: F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 18); f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 13)
except Exception: F = f = ImageFont.load_default()
def key(r): return r['name']
rows, used = [], set()
for i, o in enumerate(spec['old']):
    n = next((j for j, r in enumerate(spec['neu']) if j not in used and r['name'] == o['name'] and r['at'] == o['at']), None)
    if n is None: n = next((j for j, r in enumerate(spec['neu']) if j not in used and r['name'] == o['name']), None)
    if n is not None: used.add(n)
    rows.append((o, spec['neu'][n] if n is not None else None))
for j, r in enumerate(spec['neu']):
    if j not in used: rows.append((None, r))
if spec.get('changed'):   # (--changed: only the pieces whose drawing differs, old against new)
    from PIL import ImageChops
    def same(o, n):
        if not o or not n: return False
        a, b = Image.open(o['f']).convert('RGB'), Image.open(n['f']).convert('RGB')
        return a.size == b.size and not ImageChops.difference(a, b).getbbox()
    rows = [r for r in rows if not same(*r)]
    seen = set(); keep = []
    for r in rows:   # (one of each kind of change: its name, its old and new tops)
        k = tuple((x['name'], x['h'], x['top']) if x else None for x in r)
        if k not in seen: seen.add(k); keep.append(r)
    rows = keep
ims = [[Image.open(x['f']) if x else None for x in row] for row in rows]
cw = [max((r[k].width for r in ims if r[k]), default=200) for k in (0, 1)]
rh = [max((x.height for x in r if x), default=100) + 30 for r in ims]
W, Hh = cw[0] + cw[1] + 30, sum(rh) + 50
out = Image.new('RGB', (W, Hh), 'white'); d = ImageDraw.Draw(out)
d.text((10, 10), spec['room'] + '  --  old build (left), new (right)', fill='black', font=F)
y = 50
for (o, n), (io, inn), h in zip(rows, ims, rh):
    for k, (x, im) in enumerate(((o, io), (n, inn))):
        X = 10 + (cw[0] + 10)*k
        if not x: d.text((X, y + 4), '(not drawn)', fill='gray', font=f); continue
        d.text((X, y + 2), '%s  solid %d  drawn top %d' % (x['name'], x['h'], x['top']), fill='black', font=f)
        out.paste(im, (X, y + 22))
        for z, lx, ly in x['lab']: d.text((X + lx, y + 22 + ly - 7), str(z), fill=(80, 80, 80), font=f)
    d.line([(0, y + h - 4), (W, y + h - 4)], fill=(220, 220, 220))
    y += h
out.save(spec['out']); print(len(rows), 'pieces')
