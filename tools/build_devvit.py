#!/usr/bin/env python3
"""Generate the Devvit build from the canonical standalone build.

    game/index.html  ->  tipsey-delivery/public/game-logic.js
                     ->  tipsey-delivery/public/game.html

game/index.html is the ONLY file anyone edits. The two outputs are
derived, byte for byte, by the handful of substitutions below -- the
only real differences between the builds. Everything else (logic,
CSS, markup) is copied, so the builds cannot drift.

    python3 tools/build_devvit.py           write both outputs
    python3 tools/build_devvit.py --check   exit 1 if either is stale

Every substitution asserts it matched exactly once: if index.html
changes shape under one, the build fails loudly instead of shipping a
half-converted file.
"""
import re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC  = ROOT / "game/index.html"
OUT_JS   = ROOT / "tipsey-delivery/public/game-logic.js"
OUT_HTML = ROOT / "tipsey-delivery/public/game.html"
BANNER = "GENERATED from game/index.html by tools/build_devvit.py -- do not edit; edit game/index.html and rebuild."

def once(text, old, new, what):
    n = text.count(old)
    if n != 1:
        sys.exit(f"build_devvit: '{what}' matched {n} times (expected 1) -- update tools/build_devvit.py")
    return text.replace(old, new)

def build():
    src = SRC.read_text(encoding="utf-8")
    inline = [m for m in re.finditer(r"<script>(.*?)</script>", src, re.S)]
    if len(inline) < 2:
        sys.exit("build_devvit: expected a head <script> and the game <script> in game/index.html")
    game = inline[-1]

    # ---- game-logic.js: the game script, Devvit flags on ----
    js = game.group(1).lstrip("\n")
    js = once(js,
        'const IS_DEVVIT_BUILD = new URLSearchParams(location.search).get("platform") === "devvit"\n'
        '                     && !ATTRACT_BARE;',
        'const IS_DEVVIT_BUILD = !ATTRACT_BARE; // hardcoded true — this file is only ever served by Devvit — except in bare attract',
        "IS_DEVVIT_BUILD")
    js = "/* " + BANNER + " */\n" + js.rstrip("\n") + "\n"

    # ---- game.html: same page, local Phaser + the viewport fix + game-logic.js ----
    html = src[:game.start()] + src[game.end():]
    html = once(html,
        '<script src="https://cdn.jsdelivr.net/npm/phaser@3.85.2/dist/phaser.min.js"></script>\n',
        '<script src="viewport-fix.js"></script>\n'
        '<script src="phaser.min.js"></script>\n'
        '<script src="game-logic.js"></script>',
        "Phaser CDN tag")
    html = once(html,
        "html,body{margin:0;padding:0;background:#14161b;height:100%;overflow:hidden;",
        "html,body{margin:0;padding:0;background:#14161b;height:100%;height:100dvh;height:var(--vvh, 100dvh);overflow:hidden;",
        "html,body height")
    html = once(html, "<!DOCTYPE html>\n", "<!DOCTYPE html>\n<!-- " + BANNER + " -->\n", "doctype")
    html = html.rstrip("\n") + "\n"
    return js, html

def main():
    js, html = build()
    if "--check" in sys.argv:
        stale = [p.relative_to(ROOT).as_posix() for p, want in ((OUT_JS, js), (OUT_HTML, html))
                 if not p.exists() or p.read_text(encoding="utf-8") != want]
        if stale:
            print("build_devvit: stale -> " + ", ".join(stale)); sys.exit(1)
        print("build_devvit: up to date"); return
    OUT_JS.write_text(js, encoding="utf-8")
    OUT_HTML.write_text(html, encoding="utf-8")
    print(f"build_devvit: wrote {OUT_JS.relative_to(ROOT)} ({len(js.encode())} B), {OUT_HTML.relative_to(ROOT)} ({len(html.encode())} B)")

if __name__ == "__main__":
    main()
