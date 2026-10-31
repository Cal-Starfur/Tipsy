#!/usr/bin/env python3
"""Pack a world review's report into ONE file: the spot screenshots inlined as
JPEG, so the page opens on its own (an iPad, a message).
Usage: python3 tools/review/pack.py <review dir> [out.html]"""
import base64, io, os, re, sys
from PIL import Image

d = sys.argv[1]
out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(d, 'review.html')
html = open(os.path.join(d, 'report.html'), encoding='utf-8').read()

def inline(m):
    name = m.group(1)
    p = os.path.join(d, name)
    if not os.path.exists(p):
        return m.group(0)
    im = Image.open(p).convert('RGB')
    buf = io.BytesIO()
    im.save(buf, 'JPEG', quality=80)
    return 'src="data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode() + '"'

html = re.sub(r'src="([^"/:]+\.png)"', inline, html)
open(out, 'w', encoding='utf-8').write(html)
print(out, round(os.path.getsize(out) / 1e6, 1), 'MB')
