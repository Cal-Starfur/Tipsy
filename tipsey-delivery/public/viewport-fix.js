/* viewport-fix.js -- the --vvh block that used to be inline in
   game.html. Moved to a file because Devvit's webview CSP refuses
   inline scripts (script-src 'self', no 'unsafe-inline'), which means
   this fix HAS NEVER EXECUTED ON REDDIT since it shipped -- it only
   ever ran in local previews, where there is no CSP. If the expanded-
   mode GPS HUD clipping it was written for still reproduces on device,
   this is why. */
  /* --vvh: the real currently-visible height, not the static viewport
     assumption 100dvh alone gives you. Exists because entering Devvit's
     expanded mode (requestExpandedMode, called from splash.ts) is a
     platform-level transition, not a normal browser window resize —
     nothing guarantees the browser re-evaluates 100dvh against the new
     modal size on its own. visualViewport tracks the actual visible
     area directly and fires its own resize event independent of the
     window's, which is the more reliable signal in an embedded/modal
     context like this. Falls back to innerHeight where visualViewport
     isn't available at all. */
  function fixViewportHeight(){
    var h = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
    document.documentElement.style.setProperty('--vvh', h + 'px');
  }
  fixViewportHeight();
  window.addEventListener('resize', fixViewportHeight);
  window.addEventListener('orientationchange', fixViewportHeight);
  if(window.visualViewport){
    window.visualViewport.addEventListener('resize', fixViewportHeight);
  }
