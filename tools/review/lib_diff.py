# LIBRARY DIFF's comparer (tools/review/lib_diff.js): old | new | changed pixels, for each entry that differs
import os, sys
from PIL import Image, ImageChops
old, new, out = sys.argv[1:4]; n = 0
for f in sorted(os.listdir(new)):
    po, pn = os.path.join(old, f), os.path.join(new, f)
    if not os.path.exists(po): print('  new entry', f); continue
    a, b = Image.open(po).convert('RGB'), Image.open(pn).convert('RGB')
    if a.size != b.size:                                   # (grown or shrunk: both padded to the larger, top-left aligned, and compared)
        print('  %-40s size %s -> %s' % (f[:-4], a.size, b.size)); W, H = max(a.width, b.width), max(a.height, b.height)
        pa, pb = Image.new('RGB', (W, H), 'white'), Image.new('RGB', (W, H), 'white'); pa.paste(a, (0, 0)); pb.paste(b, (0, 0)); a, b = pa, pb
    d = ImageChops.difference(a, b).convert('L').point(lambda v: 255 if v > 24 else 0)
    c = d.histogram()[255]
    if c < 4: continue
    n += 1; print('  %-40s %6d px changed' % (f[:-4], c))
    m = b.copy(); m.paste((255, 0, 255), mask=d)
    w, h = a.size; o = Image.new('RGB', (w*3 + 20, h), 'white'); o.paste(a, (0, 0)); o.paste(b, (w + 10, 0)); o.paste(m, (2*w + 20, 0)); o.save(os.path.join(out, f))
print(n, 'entries changed')
