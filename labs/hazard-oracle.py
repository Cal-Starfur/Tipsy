#!/usr/bin/env python3
"""Hazard-interaction regression gate.

WHY THIS EXISTS
    Phase 2c rewrites the 756-line hazard interaction loop from rail
    coordinates (dx = botS - hz.s, plus a lane test) to world space. That
    loop is the difference between a delivery game and a driving demo,
    and nothing else in the project can tell you whether it still behaves
    the same. Screenshots cannot see damage. Route fingerprints cannot
    see collisions. This drives the real game with real input, hits one
    hazard of each type, and records what happened.

USAGE
    python3 hazard-oracle.py run  <url-path> [types]   -> JSON to stdout
    python3 hazard-oracle.py diff <fileA> <fileB>      -> gate, exit 1 on regression

    Typical:
      python3 hazard-oracle.py run base/index.html > before.json
      python3 hazard-oracle.py run game/index.html > after.json
      python3 hazard-oracle.py diff before.json after.json

THREE THINGS THIS GOT WRONG FIRST, ALL WORTH KNOWING
    1. Synthetic TouchEvents do nothing. The game binds Phaser's own
       input manager (this.input.on("pointerdown")), which never sees
       hand-dispatched events. Playwright's real mouse does. Before this
       was understood, every "drive the game" test silently measured a
       stationary robot -- and a control run against unmodified code was
       what proved the harness, not the code, was at fault.

    2. One page for all types is worthless. A tip in test N leaves the
       fail flow active and every later test reads zeros. Two baseline
       runs disagreed in MIRROR IMAGE -- planter tipped in one and
       suppressed scooter, scooter tipped in the other and suppressed
       planter. Resetting scene fields by hand was not enough. One page
       load per hazard type is the only reliable reset.

    3. Moving hazards cannot be gated. Walkers, dogs and pigeons animate
       on their own clocks, so whether the robot meets them at all
       depends on frame timing; a baseline-vs-baseline check showed
       people.dmg flipping 2 -> 0 between identical builds. They are
       still exercised -- a crash in their path still surfaces -- but
       their numbers are reported, not asserted.

    Peak tilt also jitters ~0.05 between identical builds, because the
    poll samples at 110ms in a headless browser running far below 60fps
    and can miss the frame a peak lands on. Hence: exact-match the
    discrete facts, tolerance the continuous one. Hashing the whole
    result would make every run look like a regression.
"""
import asyncio, json, sys

CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
ARGS = ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist", "--no-sandbox"]
DEFAULT_TYPES = ["hydrant", "bin", "planter", "lamp", "palm", "crack",
                 "slab", "trash", "scooter", "people", "dog", "pigeons"]
MOVING = {"people", "dog", "pigeons"}   # exercised, not asserted -- see (3) above
TOL_TILT = 0.10                          # ~2x the observed same-build jitter
APPROACH = 220                           # units of run-up before the hazard


async def probe(p, path, t):
    from playwright.async_api import Error as PWError
    b = await p.chromium.launch(executable_path=CHROME, args=ARGS)
    try:
        pg = await b.new_page(viewport={"width": 420, "height": 820})
        err = []
        pg.on("pageerror", lambda e: err.append(str(e)))
        await pg.add_init_script("document.hasFocus = () => true;")
        # FORCE THE RAIL GAME. The game boots into free play now, where
        # botS is frozen and the hazard loop this gate exists to measure
        # does not run on a rail at all -- without ?ow=0 every probe came
        # back empty and the gate silently measured nothing. The opt-out
        # is what a regression check wants by definition: it is the
        # SHIPPING path that must not change.
        sep = "&" if "?" in path else "?"
        await pg.goto(f"http://localhost:8931/{path}{sep}ow=0")
        await pg.wait_for_function(
            "typeof game!=='undefined' && game.scene.scenes.some(s=>s.route)", timeout=45000)
        await pg.wait_for_timeout(2000)
        await pg.click("#startBtn")
        await pg.wait_for_timeout(2600)

        placed = await pg.evaluate("""(t)=>{const s=game.scene.scenes.find(x=>x.route);
          const h=s.route.hazards.find(h=>h.type===t && h.s>200);
          if(!h) return null;
          s.botS=h.s-%d; s.botRow=(h.row!==undefined?h.row:1);
          s.speed=0; s.tilt=0; s.damage=0;
          return {s:Math.round(h.s)};}""" % APPROACH, t)
        if not placed:
            return t, "absent"

        box = await pg.evaluate("()=>{const r=game.canvas.getBoundingClientRect();"
                                "return {x:r.left,y:r.top,w:r.width,h:r.height};}")
        # right half of the canvas is gas; real input, not a synthetic event
        await pg.mouse.move(box["x"] + box["w"] * 0.80, box["y"] + box["h"] * 0.55)
        await pg.mouse.down()
        peak = {"dmg": 0, "tilt": 0.0, "tipped": False}
        for _ in range(18):
            await pg.wait_for_timeout(110)
            v = await pg.evaluate("""()=>{const s=game.scene.scenes.find(x=>x.route);
              return {dmg:Math.round(s.damage||0), tilt:Math.abs(s.tilt||0), st:s.state};}""")
            peak["dmg"] = max(peak["dmg"], v["dmg"])
            peak["tilt"] = max(peak["tilt"], round(v["tilt"], 2))
            if v["st"] == "tipped":
                peak["tipped"] = True
        await pg.mouse.up()
        if err:
            peak["err"] = err[:1]
        return t, peak
    finally:
        await b.close()


async def run(path, types):
    from playwright.async_api import async_playwright
    out = {}
    async with async_playwright() as p:
        for t in types:                      # one page load each -- see (2) above
            k, v = await probe(p, path, t)
            out[k] = v
    return out


def diff(a, b):
    bad, noted = [], []
    for t in sorted(set(a) | set(b)):
        x, y = a.get(t), b.get(t)
        if t in MOVING:
            if x != y:
                noted.append(f"{t}: {x} vs {y}")
            continue
        if x == "absent" or y == "absent":
            if x != y:
                bad.append(f"{t}: presence differs ({x} vs {y})")
            continue
        for k in ("dmg", "tipped"):
            if x[k] != y[k]:
                bad.append(f"{t}.{k}: {x[k]} -> {y[k]}")
        if abs(x["tilt"] - y["tilt"]) > TOL_TILT:
            bad.append(f"{t}.tilt: {x['tilt']} -> {y['tilt']} (tol {TOL_TILT})")
    gated = len(set(a) | set(b)) - len(MOVING & (set(a) | set(b)))
    print(f"gated {gated} static hazard types; "
          f"{len(MOVING & (set(a)|set(b)))} moving reported only")
    for l in noted:
        print("   (moving, not gated)", l)
    if bad:
        print("REGRESSIONS:")
        for l in bad:
            print("  ", l)
        return 1
    print("NO REGRESSION")
    return 0


if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in ("run", "diff"):
        print(__doc__)
        sys.exit(2)
    if sys.argv[1] == "run":
        types = sys.argv[3].split(",") if len(sys.argv) > 3 else DEFAULT_TYPES
        print(json.dumps(asyncio.run(run(sys.argv[2], types)), sort_keys=True, indent=1))
    else:
        with open(sys.argv[2]) as f: a = json.load(f)
        with open(sys.argv[3]) as f: b = json.load(f)
        sys.exit(diff(a, b))
