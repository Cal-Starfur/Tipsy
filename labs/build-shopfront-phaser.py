#!/usr/bin/env python3
"""
Assemble labs/shopfront-phaser.html from the template plus code lifted
verbatim out of game/index.html.

WHY THIS EXISTS RATHER THAN A HAND-MAINTAINED BENCH
---------------------------------------------------
The bench is only worth anything if the machinery inside it is the
machinery the game runs. A reimplementation would agree with the game
until the day it quietly stopped, which is the exact failure the bench
was built to prevent -- so every block is copied, and this script is how
the copy is kept honest.

LIFTED BY ANCHOR, NOT BY LINE NUMBER
------------------------------------
The first cut of this took hard line ranges out of index.html. That is
how the bench shipped its first bug: the range for W() ran one line long
and picked up an unterminated comment opener, which swallowed the next
two methods whole and produced a syntax error 150 lines away from its
cause. Line numbers in a 37,000-line file are the least stable thing
about it.

So each block is found by its signature line and ended by brace balance.
Re-running after the game moves is then mechanical, and the two
assertions below turn the failure modes that actually bit into loud
errors at build time:

  * every block must be brace-balanced AND comment-balanced on its own
  * every ALL-CAPS global the lifted code references must be satisfied

DRIFT DETECTION
---------------
EXPECTED holds the sha256 of each block as of the last build. A mismatch
is not an error -- the game is allowed to move -- but it is reported, so
that a change to drawStoreUnit or queueUnitStrips is noticed here rather
than being silently absorbed into the bench.

USAGE
-----
  python3 labs/build-shopfront-phaser.py [--standalone]

  --standalone also writes labs/shopfront-phaser-standalone.html with
  the kit, the shops and the ctx shim inlined. That build is for opening
  on a device, where relative <script src> paths do not resolve. It is a
  DERIVED ARTIFACT: never edit it, never commit it, and regenerate it
  after any change to the modular files.
"""
import hashlib
import re
import sys
from pathlib import Path

LABS = Path(__file__).resolve().parent
GAME = LABS.parent / "game" / "index.html"

#  name                anchor (the block's own first line, matched exactly
#                      after stripping) and how its end is found
LIFT = [
    ("mulberry32",      "function mulberry32(a){",                       "line"),
    ("DIRV",            "const DIRV = [",                                "line"),
    ("STORE_PALETTES",  "const STORE_PALETTES = [",                      "array"),
    ("AWNING_STRIPES",  "const AWNING_STRIPES = [",                      "line"),
    ("blockEdgesOf",    "function blockEdgesOf(blk){",                   "block"),
    ("packEdge",        "function packEdge(edgeLen, rng){",              "block"),
    ("packEdgeNoGap",   "function packEdgeNoGap(edgeLen, rng){",         "block"),
    ("W",               "W(x, y, z){",                                   "block"),
    ("visWorldPt",      "visWorldPt(wx, wy, r = 90, h = 380){",          "block"),
    ("quadOn",          "quadOn(g, pts, color, alpha=1){",               "block"),
    ("wallOutline",     "wallOutline(g, q, color, hasNear, hasFar, w=1){", "block"),
    ("drawStoreUnit",   "drawStoreUnit(g, ox, oy, dv, rv, w, seed, isFirst, isLast, part='all',", "block"),
    ("queueUnitStrips", "queueUnitStrips(vq, ux, uy, dv, rv, w, D, sliceW, drawFn, depthSliceW = 0){", "block"),
]

EXPECTED = {
    "mulberry32":       "fb896035b548",
    "DIRV":             "c1b2a015b997",
    "STORE_PALETTES":   "0a0a312f99bd",
    "AWNING_STRIPES":   "b4d51f6bc304",
    "blockEdgesOf":     "fa90e3d37edd",
    "packEdge":         "a4c263b69466",
    "packEdgeNoGap":    "2f6bb5ac2476",
    "W":                "a927ce8c9c32",
    "visWorldPt":       "9086e3bcb624",
    "quadOn":           "7a1dcb1bff91",
    "wallOutline":      "83f76895170b",
    "drawStoreUnit":    "c570ff89635d",
    "queueUnitStrips":  "3ee7d0311988",
}

# ALL-CAPS globals the bench supplies itself or takes from the kit
SATISFIED = {"TILE", "T2", "DOOR_W", "DOOR_H", "STORE_DEPTH", "HOUSE_DEPTH",
             "STORE_PALETTES", "DIRV", "AWNING_STRIPES"}


def find(lines, anchor):
    for i, ln in enumerate(lines):
        if ln.strip().startswith(anchor.strip()):
            return i
    raise SystemExit(f"anchor not found in {GAME.name}: {anchor!r}\n"
                     f"  the game has moved; update LIFT rather than guessing a line number")


def cut(lines, anchor, how):
    i = find(lines, anchor)
    if how == "line":
        return lines[i]
    if how == "array":
        j = i
        while not lines[j].rstrip().endswith("];"):
            j += 1
        return "\n".join(lines[i:j + 1])
    depth, j, seen = 0, i, False
    while True:
        # brace counting must ignore braces inside comments and strings
        stripped = re.sub(r"/\*.*?\*/", "", lines[j])
        stripped = re.sub(r"//.*", "", stripped)
        stripped = re.sub(r"'[^']*'|\"[^\"]*\"", "", stripped)
        depth += stripped.count("{") - stripped.count("}")
        if stripped.count("{"):
            seen = True
        if seen and depth == 0:
            return "\n".join(lines[i:j + 1])
        j += 1
        if j - i > 400:
            raise SystemExit(f"runaway while closing {anchor!r} -- brace balance never returned to 0")


def main():
    if not GAME.exists():
        raise SystemExit(f"cannot find {GAME}")
    lines = GAME.read_text().split("\n")
    blocks, prov, drifted = {}, [], []

    for name, anchor, how in LIFT:
        body = blocks[name] = cut(lines, anchor, how)
        # the two assertions that turn the bugs that actually bit into build errors
        if body.count("{") != body.count("}"):
            raise SystemExit(f"{name}: brace imbalance in the lifted block")
        if body.count("/*") != body.count("*/"):
            raise SystemExit(f"{name}: unterminated comment in the lifted block "
                             f"-- this is the fault that swallowed two methods on the first build")
        sha = hashlib.sha256(body.encode()).hexdigest()[:12]
        start = find(lines, anchor) + 1
        prov.append(f"     {name:16} index.html:{start}-{start + body.count(chr(10)):<6} sha256 {sha}")
        if EXPECTED.get(name) and EXPECTED[name] != sha:
            drifted.append((name, EXPECTED[name], sha))

    code = re.sub(r"//.*", "", re.sub(r"/\*.*?\*/", "", "\n".join(blocks.values()), flags=re.S))
    missing = set(re.findall(r"\b([A-Z][A-Z0-9_]{2,})\b", code)) - SATISFIED
    if missing:
        raise SystemExit(f"lifted code references globals nothing defines: {sorted(missing)}")

    note = ("/* TILE, T2, DOOR_W and DOOR_H are NOT redeclared here. The kit already\n"
            "   binds them and its values are the game's own (TILE 46, T2 = TILE*2,\n"
            "   DOOR_W = T2, DOOR_H = T2*2, checked against DOOR_ART), so taking them\n"
            "   twice would only create a way for the two to disagree. Only what the\n"
            "   kit has no reason to know about is added: */\n"
            "const HOUSE_DEPTH = T2 * 3, STORE_DEPTH = T2 * 3;")
    free = "\n".join([blocks["mulberry32"], blocks["DIRV"], note, blocks["STORE_PALETTES"],
                      blocks["AWNING_STRIPES"], blocks["blockEdgesOf"],
                      blocks["packEdge"], blocks["packEdgeNoGap"]])
    meth = "\n".join([blocks["W"], blocks["visWorldPt"], blocks["quadOn"], blocks["wallOutline"],
                      blocks["drawStoreUnit"], blocks["queueUnitStrips"]])

    out = (LABS / "shopfront-phaser.template.html").read_text() \
        .replace("/*__PROVENANCE__*/", "\n".join(prov)) \
        .replace("/*__GAME_FREE__*/", free) \
        .replace("/*__GAME_METHODS__*/", meth)
    (LABS / "shopfront-phaser.html").write_text(out)
    print(f"wrote shopfront-phaser.html  ({len(out)} bytes, {len(LIFT)} verbatim blocks)")

    if drifted:
        print("\n  THE GAME HAS MOVED under these blocks -- re-read them before trusting the bench:")
        for n, was, now in drifted:
            print(f"    {n:16} was {was}  now {now}")
    else:
        print("  no drift: every lifted block matches the sha recorded at the last build")

    if "--standalone" in sys.argv:
        h = out
        for f in ("shopfront-ctx2phaser.js", "shopfront-kit.js", "shopfront-shops.js"):
            tag = f'<script src="{f}"></script>'
            if tag not in h:
                raise SystemExit(f"template no longer loads {f}")
            h = h.replace(tag, "<script>\n/* ===== inlined from " + f +
                          " -- DERIVED, do not edit, do not commit ===== */\n"
                          + (LABS / f).read_text() + "\n</script>")
        (LABS / "shopfront-phaser-standalone.html").write_text(h)
        print(f"wrote shopfront-phaser-standalone.html  ({len(h)} bytes)")


if __name__ == "__main__":
    main()
