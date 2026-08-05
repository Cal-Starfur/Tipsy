/* splash-boot.js -- the attract prep that used to be an inline <script>
   block in splash.html. Moved to a file because Devvit's webview CSP is
   script-src 'self' (no 'unsafe-inline'): every inline script block is
   REFUSED on Reddit, silently on device, loudly in devtools. This block
   builds the stubs game-logic.js requires and sets the bare flag it
   reads at load, so with it refused the engine threw on its first
   getElementById and the static splash stayed -- which is exactly the
   card r/tipsey showed. Headless tests passed because a plain local
   server sends no CSP; the test rig now sends Reddit's exact header
   (labs/... csp_server) so this class of failure reproduces off-device.
   Must be loaded BEFORE phaser.min.js / game-logic.js. */
    /* ---------- live attract: prepare, then let static tags load ----------
       The engine is loaded by ORDINARY <script src> tags below, not by
       scripts built at runtime. That is a deliberate step backwards from
       the lazy loader that was here before, for one reason: dynamic
       script injection is the only mechanism in this file that nothing
       in Reddit's own repos uses, and it was the last unverified link in
       a chain that had failed on Devvit several times without ever
       explaining why. game.html loads phaser.min.js and game-logic.js
       with static tags and runs on Devvit today, so this now matches the
       one pattern known to work on the platform.

       WHAT THIS COSTS: the engine downloads on every feed impression,
       not only when the post is on screen. That is precisely the cost
       the original "no Phaser in the splash" decision was protecting
       against, and it is a real regression -- roughly 2MB per
       impression. It is being accepted temporarily to get a working
       splash. Once the card is confirmed live on Reddit, the
       IntersectionObserver gate should come back, either by injecting
       these same two files late (if injection turns out to be fine) or
       by moving the engine behind a user gesture.

       This block must run BEFORE those tags: it builds the stub elements
       game-logic.js expects and sets the bare flag it reads at load. */
    (function () {
      var stubs = document.getElementById('attract-stubs');
      if (!stubs) return;

      /* Every id game-logic.js looks up. It wires them at load and throws
         on the first one missing, but in bare attract each is chrome the
         splash card already replaces -- they need to EXIST, never to be
         seen. Generated from this list rather than pasted as markup, so
         it is not a second copy of game.html's UI to keep in sync. */
      var IDS = ('againBtn avatarIcon bootLoader failAvatarBtn failMenuBtn failMsg failOverlay '
        + 'failSub globalAvatar globalSearch gpsHud hjBand hjFill hjLbl hjNeedle hjRestart hjTap '
        + 'hjTitle hjUI hjUnlock mapCard orderCard panel panelToggle pastRoutesPanel prAllTimeVal '
        + 'prClose prList prPlayToday rerollBtn retryBtn searchIcon sheetStatus startBtn '
        + 'titleOverlay todayBtn tpDetailAction tpDetailClose tpDetailDesc tpDetailName '
        + 'tpDetailNote tpDetailProgFill tpDetailProgLabel tpDetailProgWrap tpDetailScrim '
        + 'tpDetailSwatch tpMissionsBack tpMissionsList tpMissionsPanel tpMissionsSearch '
        + 'tpProfBack tpProfTitle tpProfilePanel tpStoreGrid tpTabStore tpTabTrophy tpToast '
        + 'tpTrList tpWalletPill tpWalletVal winCard winSub').split(' ');

      for (var i = 0; i < IDS.length; i++) {
        if (document.getElementById(IDS[i])) continue;
        var d = document.createElement('div');
        d.id = IDS[i];
        stubs.appendChild(d);
      }
      /* Three need to be more than a bare div: routeMap is drawn through
         getContext('2d'), and the other two are reached by descendant
         selector rather than by id. */
      if (!document.getElementById('routeMap')) {
        var c = document.createElement('canvas');
        c.id = 'routeMap'; c.width = 8; c.height = 8;
        stubs.appendChild(c);
      }
      if (!document.getElementById('winOverlay')) {
        var w = document.createElement('div'); w.id = 'winOverlay';
        var wb = document.createElement('button'); wb.className = 'btn';
        w.appendChild(wb); stubs.appendChild(w);            // querySelector('#winOverlay .btn')
      }
      if (!document.getElementById('zoomBtn')) {
        var z = document.createElement('div'); z.id = 'zoomBtn';
        var zl = document.createElement('span'); zl.className = 'zLvl';
        z.appendChild(zl); stubs.appendChild(z);            // querySelector('.zLvl')
      }

      /* Honour the OS motion switch: no flag, so game-logic.js boots
         without attract and the static splash simply stays. */
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      /* Tells game-logic.js to suppress its own chrome AND to treat
         itself as a non-Devvit build, so the feed card makes no server
         calls. Read at load, so it must be set before the tags below. */
      window.TIPSEY_ATTRACT_BARE = true;

      /* game-logic.js posts to WINDOW, so this fires whether the page is
         top-level or framed. Devvit frames this page; an earlier version
         posted only to parent and every signal went to the platform
         instead of here. Until it lands, the static city and robot stay
         lit -- a failure leaves the splash that shipped before this
         existed, never a hole. */
      /* Primary path: game-logic calls this directly in the same
         document. The message listener below stays as the fallback --
         on the native app the postMessage never arrives (bridge-wrapped
         window.postMessage, see game-logic attractStart). */
      window.TIPSEY_ON_ATTRACT_READY = function () {
        document.body.classList.add('attract-live');
      };
      window.addEventListener('message', function (e) {
        var d = e && e.data;
        if (d && d.tipsey === 'attract-ready') document.body.classList.add('attract-live');
      });
    })();

/* ---------- self-hiding boot diagnostic ----------
   The native Reddit app shows the static splash while the same post runs
   attract on web, and the app's webview takes no inspector. Every
   plausible cause (WebGL refused, RAF suspended in the feed webview,
   script load killed, runtime throw) is invisible from outside, so the
   splash reports its own boot state: a one-line strip that renders ONLY
   if attract has not gone live 6s after load. Web goes live in ~1-2s and
   never shows it; the broken app shows exactly which link died. Remove
   once the app-side cause is fixed. */
(function () {
  var t0 = Date.now();
  var rafCount = 0;
  var errs = [];

  function rafProbe() { rafCount++; requestAnimationFrame(rafProbe); }
  requestAnimationFrame(rafProbe);

  window.addEventListener('error', function (e) {
    if (errs.length >= 2) return;
    var f = (e.filename || '').split('/').pop();
    errs.push((f ? f + ':' + e.lineno + ' ' : '') + String(e.message).slice(0, 80));
  });
  window.addEventListener('unhandledrejection', function (e) {
    if (errs.length < 2) errs.push('promise: ' + String(e.reason).slice(0, 80));
  });

  function glProbe() {
    try {
      var c = document.createElement('canvas');
      return (c.getContext('webgl') || c.getContext('experimental-webgl')) ? 'yes' : 'NO';
    } catch (_) { return 'THROW'; }
  }

  setTimeout(function () {
    if (document.body.classList.contains('attract-live')) return; // healthy: stay invisible
    var d = document.createElement('div');
    d.id = 'attract-diag';
    var st = d.style;
    st.position = 'fixed'; st.left = '0'; st.right = '0'; st.bottom = '0';
    st.zIndex = '99'; st.font = '9px monospace'; st.color = '#ffb454';
    st.background = 'rgba(0,0,0,0.75)'; st.padding = '2px 4px';
    st.pointerEvents = 'none'; st.whiteSpace = 'normal'; st.wordBreak = 'break-all';
    var stage = document.getElementById('attract-stage');
    d.textContent = 'diag t+' + ((Date.now() - t0) / 1000).toFixed(1) + 's'
      + ' phaser:' + (typeof window.Phaser !== 'undefined' ? window.Phaser.VERSION : 'ABSENT')
      + ' logic:' + (window.TIPSEY_ATTRACT_BARE === true ? 'flag-set' : 'flag-LOST')
      + ' canvases:' + (stage ? stage.querySelectorAll('canvas').length : '?')
      + ' gl:' + glProbe()
      + ' raf:' + rafCount
      + ' vis:' + document.visibilityState
      + (errs.length ? ' | ' + errs.join(' | ') : ' | no-errors');
    document.body.appendChild(d);
  }, 6000);
})();
