---
name: Devvit Live Splash
description: Build a splash screen for a Reddit Devvit Web app that runs the REAL game engine as a live self-playing attract demo inline in the feed, with a static fallback. Load this skill whenever the task involves a Devvit splash screen, an inline post entrypoint (splash.html), attract mode in the Reddit feed, a Devvit webview that works locally but shows nothing on Reddit, works on web reddit but not the native Reddit app, inline scripts failing on Devvit, or postMessage handshakes not arriving in a webview. Triggers include "live splash", "attract mode", "devvit splash", "game running in the feed", "splash works locally but not on Reddit", "works on web but not the app". Contains the hard-won platform rules (Devvit CSP refuses inline scripts; native app bridges swallow window.postMessage) plus copy-paste templates for the boot script, CSP-faithful test server, and self-hiding on-device diagnostic strip.
---

# Devvit Live Splash — real engine running in the Reddit feed

Ship a Devvit post whose feed card runs the actual game engine as a self-playing
attract demo, cross-faded over a static splash that doubles as the fallback.
Battle-tested on a full Phaser 3 game; every rule below was earned by a silent
on-device failure.

## Platform facts — violate any of these and you fail SILENTLY

1. **Devvit's webview CSP refuses ALL inline `<script>` blocks.**
   Captured live from webview.devvit.net:
   `script-src 'self' webview.devvit.net webview-dev.devvit.net 'wasm-unsafe-eval'`
   — no `'unsafe-inline'`. Every byte of JS must live in an external file loaded
   via `<script src>`. Inline blocks are refused with no visible error on device.
   (Inline `style` is fine — style-src does include `'unsafe-inline'`.)
2. **The native Reddit app swallows `window.postMessage`.** Native apps inject
   JS bridges into their webviews and wrapping postMessage is how bridges are
   built. A same-document handshake via postMessage works on web reddit and
   never arrives in the app — no error. Use a plain global callback instead;
   nothing can intercept a direct function call in one document.
3. **Devvit frames your entrypoint.** `parent !== window` on Reddit, so
   `parent.postMessage` talks to Devvit's host, not your own listener. Local
   files opened top-level hide this bug (`parent === window`).
4. **No iframes between entrypoints.** `<iframe src="game.html">` will not
   resolve — entrypoints are addressed by name through the Devvit API. Boot the
   engine in the same document as the splash.
5. **A plain local dev server lies to you.** `python -m http.server` sends no
   CSP, so code that is dead on Reddit passes every local test. Always test
   under a server that sends the exact CSP above (template below).
6. **Gitignore/clean scripts eat runtime assets.** A `/public/*.js*` ignore
   line or an overeager `clean` script will silently drop your engine or boot
   file from deploys. Re-audit both every time a new file is added to public/.

## Architecture

- `splash.html` — default entrypoint, renders inline in the feed. Paints a
  full static splash immediately (canvas-drawn art, leaderboard, start button),
  then boots the real engine behind it in "bare attract" mode and cross-fades
  when the engine reports its first frame. If the engine never reports, users
  see a normal static splash — the failure mode is invisible by design.
- `game.html` — expanded entrypoint, the actual playable game.
- **Bare attract flag**: a global (e.g. `window.MYGAME_ATTRACT_BARE = true`)
  the engine checks at load. When set: no network/API calls, no HUD wiring
  beyond stubs, and an attract driver plays the game autonomously.
- **Stubs**: the engine wires many DOM ids at load. Build a hidden container
  holding a stub element for every id it touches so the engine boots unmodified.
- **Handshake**: engine's first attract frame calls
  `window.MYGAME_ON_ATTRACT_READY()`; splash adds `attract-live` to `<body>`;
  CSS transitions opacity between static layer and live stage.

Load order in splash.html (order is load-bearing; all external files):

```html
<script src="splash-boot.js"></script>   <!-- stubs + flag + callback FIRST -->
<script src="phaser.min.js"></script>
<script src="game-logic.js"></script>
<script src="splash.js" type="module"></script>  <!-- splash chrome last -->
```

## Build order

1. Add the bare-attract branch + attract driver to the engine. On the first
   rendered attract frame:
   ```js
   try { if (typeof window.MYGAME_ON_ATTRACT_READY === "function") window.MYGAME_ON_ATTRACT_READY(); } catch(e){}
   try { window.postMessage({ mygame: "attract-ready" }, "*"); } catch(e){}   // fallback only
   ```
2. Write `splash-boot.js` (external file, never inline):
   ```js
   (function () {
     window.MYGAME_ATTRACT_BARE = true;
     var stubs = document.createElement('div');
     stubs.id = 'attract-stubs';
     stubs.style.display = 'none';
     ['hud','score','timer' /* ...every id the engine touches */].forEach(function (id) {
       var el = document.createElement('div'); el.id = id; stubs.appendChild(el);
     });
     document.documentElement.appendChild(stubs);
     window.MYGAME_ON_ATTRACT_READY = function () {
       document.body.classList.add('attract-live');
     };
     window.addEventListener('message', function (e) {   // fallback path only
       if (e.data && e.data.mygame === 'attract-ready') window.MYGAME_ON_ATTRACT_READY();
     });
   })();
   ```
   Find the full stub id list empirically: load game-logic under the CSP server
   with zero stubs and harvest every `Cannot read properties of null` until clean.
3. CSS: live stage inside `<main>` (not behind an opaque card background),
   `#attract-stage { opacity: 0; }` and `body.attract-live #attract-stage { opacity: 1; }`
   with a transition; invert for the static layer.
4. Check `.gitignore` and npm `clean` against every file in public/.
5. Verify under the CSP server + headless browser (below) BEFORE any deploy.
6. Deploy (`devvit upload` + `devvit install <subreddit>`), then verify on:
   web reddit AND the native app — they fail differently.

## CSP-faithful test server (use this, never a plain server)

```python
#!/usr/bin/env python3
import http.server, functools, sys
CSP = ("default-src 'self'; form-action 'self'; object-src 'none'; "
       "script-src 'self' webview.devvit.net webview-dev.devvit.net 'wasm-unsafe-eval'; "
       "style-src 'self' webview.devvit.net webview-dev.devvit.net fonts.googleapis.com 'unsafe-inline'; "
       "img-src 'self' *.redditmedia.com *.redditstatic.com *.redd.it data: blob:; "
       "connect-src 'self' *.redditmedia.com *.redditstatic.com *.redd.it blob:")
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Content-Security-Policy", CSP); super().end_headers()
http.server.ThreadingHTTPServer(("127.0.0.1", int(sys.argv[1]) if len(sys.argv)>1 else 8901),
    functools.partial(H, directory=".")).serve_forever()
```

Headless check (Playwright, chromium, flags `--use-gl=swiftshader --enable-webgl
--ignore-gpu-blocklist --no-sandbox`): load splash.html, wait ~8s, assert
`document.body.classList.contains('attract-live')` and zero console errors
containing "Content Security Policy". Run one extra pass with
`add_init_script("window.postMessage = function(){};")` to simulate the native
app's bridge — the splash must STILL go live (that's what the direct callback
buys you).

## Self-hiding diagnostic strip (ship it during bring-up)

The app webview takes no inspector, and every failure looks like the static
fallback. Append this to splash-boot.js; it renders only if attract is not live
6s after load, so healthy clients never see it, and a broken one prints exactly
which link died. Remove once stable.

```js
(function () {
  var t0 = Date.now(), raf = 0, errs = [];
  (function tick(){ raf++; requestAnimationFrame(tick); })();
  window.addEventListener('error', function (e) {
    if (errs.length < 2) errs.push(((e.filename||'').split('/').pop()) + ':' + e.lineno + ' ' + String(e.message).slice(0,80));
  });
  setTimeout(function () {
    if (document.body.classList.contains('attract-live')) return;
    var gl; try { var c = document.createElement('canvas');
      gl = (c.getContext('webgl') || c.getContext('experimental-webgl')) ? 'yes' : 'NO'; } catch(_){ gl='THROW'; }
    var d = document.createElement('div'); var s = d.style;
    s.position='fixed'; s.left='0'; s.right='0'; s.bottom='0'; s.zIndex='99';
    s.font='9px monospace'; s.color='#ffb454'; s.background='rgba(0,0,0,.75)';
    s.padding='2px 4px'; s.pointerEvents='none'; s.wordBreak='break-all';
    d.textContent = 'diag t+' + ((Date.now()-t0)/1000).toFixed(1) + 's'
      + ' engine:' + (typeof window.Phaser !== 'undefined' ? window.Phaser.VERSION : 'ABSENT')
      + ' flag:' + (window.MYGAME_ATTRACT_BARE === true ? 'set' : 'LOST')
      + ' gl:' + gl + ' raf:' + raf + ' vis:' + document.visibilityState
      + (errs.length ? ' | ' + errs.join(' | ') : ' | no-errors');
    document.body.appendChild(d);
  }, 6000);
})();
```

Reading it: `engine:ABSENT` → script load failed (check gitignore/clean/paths).
`flag:LOST` → boot script didn't run (inline block? load order?). `gl:NO` →
force your engine's canvas renderer in bare mode. `raf:0` → webview suspended;
rethink. Healthy line with no errors and still static → your ready signal isn't
arriving: use the direct callback, not postMessage.

## Debug decision table

| Symptom | Cause | Fix |
|---|---|---|
| Perfect locally, static on Reddit (web + app) | Inline `<script>` refused by CSP | Externalize every script; retest under CSP server |
| Live on web reddit, static in native app, strip shows healthy engine | App bridge swallows window.postMessage | Direct global callback for the handshake |
| Static everywhere, engine throws null errors under CSP server | Missing stubs / boot ran after engine | Complete stub list; boot script first in load order |
| Engine deploys without a runtime file | gitignore or clean script ate it | Negate the file; narrow the clean glob |
| Handshake works top-level, dead on Reddit | Posted to `parent` (Devvit's host frame) | Post/callback to your own window |
| Canvas renders but invisible | Stage behind opaque layer / opacity never flips | Stage inside `<main>`; verify `attract-live` lands |

Keep the inline entrypoint fast: paint the static layer immediately, let the
engine catch up behind it. Reddit expects inline posts to show content quickly.
