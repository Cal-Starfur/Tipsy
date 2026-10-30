#!/usr/bin/env python3
"""Build the CONSISTENCY PASS test page: the consistency-pass branch's game/index.html as
consistency-pass/index.html, for the test web app at https://cal-starfur.github.io/Tipsy/consistency-pass/
(GitHub Pages serves main, so the test copy lives in main's consistency-pass/ folder; nothing outside it
is touched).

The test page shares the live game's origin, so its saves would be the live game's saves. A shim at the
top of <head> gives every localStorage key a 'tipsy-consistency:' prefix (the game uses only getItem / setItem /
removeItem), so the test build never reads or overwrites the live game's progress.

Usage: python3 tools/publish_consistency.py <out_dir>   (writes <out_dir>/consistency-pass/index.html and its icon)"""
import os, re, shutil, sys, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = sys.argv[1] if len(sys.argv) > 1 else ROOT
src = open(os.path.join(ROOT, 'game', 'index.html'), encoding='utf-8').read()
sha = subprocess.run(['git', '-C', ROOT, 'rev-parse', '--short', 'HEAD'], capture_output=True, text=True).stdout.strip()

SHIM = """<script>/* CONSISTENCY PASS TEST BUILD (tools/publish_consistency.py, consistency-pass @ %s): saves kept apart from the live game */
(function(){ var P = 'tipsy-consistency:', S = Storage.prototype, g = S.getItem, s = S.setItem, r = S.removeItem;
  S.getItem = function(k){ return g.call(this, P + k); };
  S.setItem = function(k, v){ return s.call(this, P + k, v); };
  S.removeItem = function(k){ return r.call(this, P + k); };
  window.TIPSY_TEST_BUILD = '%s'; })();</script>
""" % (sha, sha)

m = re.search(r'<head[^>]*>', src)
if not m:
    sys.exit('no <head> in game/index.html')
html = src[:m.end()] + '\n' + SHIM + src[m.end():]
html = re.sub(r'<title>(.*?)</title>', lambda t: '<title>TIPSEY CONSISTENCY</title>', html, count=1)
D = 'consistency-pass'
os.makedirs(os.path.join(out, D), exist_ok=True)
open(os.path.join(out, D, 'index.html'), 'w', encoding='utf-8').write(html)
shutil.copy(os.path.join(ROOT, 'game', 'icon-180.png'), os.path.join(out, D, 'icon-180.png'))
print(D + '/index.html from consistency-pass @', sha, len(html), 'bytes')
