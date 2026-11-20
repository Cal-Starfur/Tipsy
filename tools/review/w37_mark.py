"""W37 foot findings, marked up: python3 tools/review/w37_mark.py <dir> (run by w37.js --png).
For each foot_N.png + foot_N.json: the whole piece with the spot circled, beside a 3x close-up of the spot -- what stands there
outlined blue, the base drawn after it outlined red, and where the base paints over its foot filled magenta -- and a caption."""
import sys, json, glob, os
from PIL import Image, ImageDraw, ImageFont

def font(n):
    for f in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'):
        if os.path.exists(f): return ImageFont.truetype(f, n)
    return ImageFont.load_default()

d0 = sys.argv[1]
for fn in sorted(glob.glob(os.path.join(d0, '*_[0-9]*.json'))):
    J = json.load(open(fn)); im = Image.open(fn[:-5] + '.png').convert('RGB')
    pts = J['ov'] or (J['hE'] + J['hL'])
    xs = [p[0] for p in J['hE'] + J['hL']]; ys = [p[1] for p in J['hE'] + J['hL']]
    cx, cy = sum(p[0] for p in pts)/len(pts), sum(p[1] for p in pts)/len(pts)
    # the close-up: the two parts and a margin, at 3x
    m = 30; x0, y0, x1, y1 = max(0, min(xs) - m), max(0, min(ys) - m), min(im.width, max(xs) + m), min(im.height, max(ys) + m)
    S = max(1, min(4, int(560/max(1, x1 - x0)), int(560/max(1, y1 - y0))))
    crop = im.crop((x0, y0, x1, y1)).resize(((x1 - x0)*S, (y1 - y0)*S), Image.NEAREST).convert('RGBA')
    ov = Image.new('RGBA', crop.size, (0, 0, 0, 0)); D = ImageDraw.Draw(ov)
    T = lambda P: [((x - x0)*S, (y - y0)*S) for x, y in P]
    if J['ov']: D.polygon(T(J['ov']), fill=(255, 0, 200, 120), outline=(255, 0, 200, 255))
    D.line(T(J['hE'] + J['hE'][:1]), fill=(30, 90, 255, 255), width=3)
    D.line(T(J['hL'] + J['hL'][:1]), fill=(255, 30, 30, 255), width=3)
    crop = Image.alpha_composite(crop, ov).convert('RGB')
    # the whole piece, the spot circled
    full = im.copy(); F = ImageDraw.Draw(full); r = max(40, (max(xs) - min(xs))/2 + 20)
    F.ellipse((cx - r, cy - r, cx + r, cy + r), outline=(255, 0, 200), width=6)
    k = min(1, 560/full.height, 700/full.width); full = full.resize((int(full.width*k), int(full.height*k)))
    cap1 = J['room'] + '  @' + ','.join(map(str, J['at']))
    behind = os.path.basename(fn).startswith('behind')
    cap2 = ('red is BEHIND blue but painted after it: magenta = where it paints over the front piece' if behind else
            'the base (red) is painted AFTER what stands on it (blue): magenta = where the base paints over its foot')
    cap3 = J['what'].split('  ->')[0]
    W = full.width + crop.width + 60; H = max(full.height, crop.height) + 110
    out = Image.new('RGB', (W, H), 'white'); O = ImageDraw.Draw(out)
    O.text((20, 12), cap1, fill='black', font=font(22)); O.text((20, 42), cap2, fill=(160, 0, 120), font=font(16)); O.text((20, 64), cap3, fill=(90, 90, 90), font=font(14))
    out.paste(full, (20, 95)); out.paste(crop, (full.width + 40, 95))
    O.rectangle((full.width + 40, 95, full.width + 40 + crop.width - 1, 95 + crop.height - 1), outline=(200, 200, 200))
    out.save(fn[:-5] + '_marked.png')
    print('  marked', fn[:-5] + '_marked.png')
