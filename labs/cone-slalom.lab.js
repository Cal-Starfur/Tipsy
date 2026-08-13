/* ===========================================================================
   CONE SLALOM — bench harness
   ===========================================================================
   Cone Slalom shipped. SL, SL_SEED_DATE, slFindChain, tpSlalomOn/tpSlalomStart
   all live in game/index.html now, hoisted to module scope (2026-08-10) and
   wired to the real "Play mission" button (tpSlalomStart, called from the
   mission list and from the map-pin GO). This file used to carry its own
   copy of the whole engine: a stale hardcoded date, legs:12, and a reload
   that forced hoodIndex:7 to reach The Bluffs -- all built before the
   permanent 12-district map, and all quietly wrong under it (hoodIndex now
   only biases where a route STARTS; the address that actually names the
   route's hood can land in the next district over, so hill:1.0 was never
   guaranteed, and legs:12 asked for more line than the frozen course's
   original road has before its own reroute-lap weld -- confirmed on-device:
   asked 12, got 6, with the missing 6 leaving cones with no leg to belong
   to and a fault message that just read "cone NaN" on loop).

   That is exactly the "second copy" problem this codebase calls out
   everywhere else it's been fixed (RAMP_ROW's own comment, further down in
   the shipped file, is the clearest statement of it). Dropped entirely.
   This now calls the real thing, so what the bench shows IS the shipped
   course -- same date, same hood, same gate count, same par -- and any
   future tuning to SL in game/index.html shows up here automatically, with
   nothing left in this file to fall out of sync.

   WHAT'S ADDED ON TOP
   Production deliberately has almost nothing on screen during a run (Sir's
   call, 2026-08-10 -- see tpSlalomUI's own comment: "no gates, no faults,
   no message, no Quit... finish or crash is the only way out"). That's the
   right call for a player. It's the wrong call for testing, so the bench
   adds back a small read-only strip (time / cleared / faults) plus restart
   and quit, sourced from scene._slAPI.run -- the same run object the real
   engine already keeps, just not usually shown. Nothing here touches the
   production UI or the production teardown path; restart/quit both go
   through tpSlalomStart()/tpSlalomQuit() the same way the real buttons do.

   ALT STEERING TEST (2026-08-12, Sir's on-device report)
   The stock touch scheme (bindInput, game/index.html) zeros this.throttle
   the instant a swipe crosses the hop threshold, and zeros it again on
   pointerup -- so on a phone, every lane change costs the run's speed and
   demands a re-press to resume gas. That is the reported bug: not that
   steering is hard, but that steering and holding the throttle are
   mutually exclusive on a single touch.

   This does NOT edit bindInput() in game/index.html. EventEmitter3 (what
   Phaser.Events.EventEmitter wraps, and what scene.input is) exposes
   .listeners(event), so the three functions bindInput attached are
   captured by reference, detached while the alt scheme is toggled on, and
   re-attached -- same references, not new copies -- when toggled off or
   when the bench unloads. Stock delivery/free-drive input is never
   touched; only what's live in THIS bench tab, only while the toggle
   reads "hold-thru".

   The alt scheme is one change from stock: hop() no longer zeros
   throttle, and firing a hop re-arms the swipe baseline (downY/downT)
   instead of latching until pointerup -- so one held touch can wiggle
   through several lane changes without ever letting go of gas. Throttle
   still only comes from which half of the screen pointerdown landed on,
   same as stock; this does not add a second touch zone or any new input
   surface, on purpose, so it's a clean A/B against the exact thing being
   reported. */
(() => {
  /* Was `.find(s => s.route)` -- required a route to already exist before
     this would arm, which meant the bench had to build one (start run) just
     to pass the check, and tpSlalomStart() below immediately discards it and
     builds its own via SL_SEED_DATE. loadRoute() has no caching, so that was
     two full generateRoute() passes back to back for nothing. The bridge
     itself never needed a route to find the scene -- BR.attach() says as
     much ("scene may exist well before a route does") -- so scenes[0] is
     enough here too, and this now arms straight off a cold boot. */
  const scene = game.scene.scenes[0];
  if (!scene) { console.log('no scene yet -- game still booting'); return; }

  document.getElementById('slBenchPanel')?.remove();
  /* A previous load of THIS lab may have left the alt scheme wired in (the
     panel is gone but scene.input isn't touched by removing it) -- undo
     that first, unconditionally, before doing anything else, so reloading
     the lab twice in a row can never stack listeners or double-detach. */
  if (scene._slAltSteerOff) { scene._slAltSteerOff(); scene._slAltSteerOff = null; }
  if (scene._slAPI) tpSlalomQuit();

  /* ---- alt steering scheme (see file header) ---- */
  const origDown = scene.input.listeners('pointerdown').slice();
  const origMove = scene.input.listeners('pointermove').slice();
  const origUp   = scene.input.listeners('pointerup').slice();

  let altOn = false;
  let downY = 0, downT = 0;

  function altPointerDown(p){
    if (scene.attract) return;
    downY = p.y; downT = scene.time.now;
    scene.throttle = p.x > scene.scale.gameSize.width / 2 ? 1 : -1;
  }
  function altPointerMove(p){
    if (scene.attract || !p.isDown) return;
    const dy = p.y - downY;
    if (Math.abs(dy) > 34 && scene.time.now - downT < 320){
      scene.hop(dy < 0 ? -1 : 1);
      /* re-arm from here instead of latching "hopped" until pointerup --
         throttle is left exactly as it was, which is the whole test */
      downY = p.y; downT = scene.time.now;
    }
  }
  function altPointerUp(){
    if (scene.attract) return;
    scene.throttle = 0;
  }

  function setAlt(on){
    if (on === altOn) return;
    altOn = on;
    if (altOn){
      origDown.forEach(fn => scene.input.off('pointerdown', fn));
      origMove.forEach(fn => scene.input.off('pointermove', fn));
      origUp.forEach(fn => scene.input.off('pointerup', fn));
      scene.input.on('pointerdown', altPointerDown);
      scene.input.on('pointermove', altPointerMove);
      scene.input.on('pointerup', altPointerUp);
    } else {
      scene.input.off('pointerdown', altPointerDown);
      scene.input.off('pointermove', altPointerMove);
      scene.input.off('pointerup', altPointerUp);
      origDown.forEach(fn => scene.input.on('pointerdown', fn));
      origMove.forEach(fn => scene.input.on('pointermove', fn));
      origUp.forEach(fn => scene.input.on('pointerup', fn));
    }
    scene.throttle = 0;
    const btn = document.getElementById('slBenchSteer');
    if (btn) btn.textContent = altOn ? 'steer: hold-thru' : 'steer: stock';
  }
  /* exposed so a reload (or quit, below) can always get back to stock,
     even if this closure is about to be discarded */
  scene._slAltSteerOff = () => setAlt(false);

  function arm(){
    tpSlalomStart();
    if (!scene._slAPI){ console.log('tpSlalomStart did not attach — no _slAPI'); return; }
    console.log('cone slalom (real course) —', SL_SEED_DATE,
      'hood:', scene.route.hood.n, 'legs:', SL.legs, 'gates:', scene._slAPI.run.gates.length,
      'par:', SL.par);
  }

  const panel = document.createElement('div');
  panel.id = 'slBenchPanel';
  panel.style.cssText = [
    'position:fixed','left:0','right:0','bottom:0','z-index:99999',
    'background:rgba(14,16,21,0.94)','border-top:1px solid #2b2f38',
    'padding:8px 10px calc(8px + env(safe-area-inset-bottom))',
    'font:12px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace','color:#e8eaef',
    '-webkit-user-select:none','user-select:none','touch-action:manipulation',
  ].join(';');
  const BTN = 'font:inherit;color:#e8eaef;background:#232220;border:1px solid #2b2f38;' +
              'border-radius:7px;min-height:38px;padding:0 10px;';
  panel.innerHTML =
    `<div id="slBenchRead" style="min-height:15px;color:#ffb04d;text-align:center;margin-bottom:6px">arming…</div>
     <div style="display:flex;gap:6px">
       <button id="slBenchRestart" style="${BTN}flex:2">restart</button>
       <button id="slBenchSteer" style="${BTN}flex:2">steer: stock</button>
       <button id="slBenchQuit" style="${BTN}flex:1">quit</button>
     </div>`;
  document.body.appendChild(panel);

  document.getElementById('slBenchRestart').onclick = () => arm();
  document.getElementById('slBenchSteer').onclick = () => setAlt(!altOn);
  document.getElementById('slBenchQuit').onclick = () => {
    clearInterval(readTick);
    setAlt(false);   // always leave the bench in stock input, no exceptions
    scene._slAltSteerOff = null;
    tpSlalomQuit();
    panel.remove();
  };

  const readTick = setInterval(() => {
    const el = document.getElementById('slBenchRead');
    if (!el) return;
    const api = scene._slAPI;
    if (!api){ el.textContent = 'no course armed'; return; }
    const r = api.run;
    el.textContent = r.fail
      ? `FAIL — ${r.fail}`
      : `${(r.elapsed + r.pen).toFixed(1)}s  cleared ${r.cleared}/${r.gates.length}` +
        (r.pen ? `  +${r.pen.toFixed(1)}` : '') +
        `  par ${SL.par.toFixed(0)}  faults ${r.faults.length}`;
  }, 150);

  setTimeout(arm, 0);
})();
