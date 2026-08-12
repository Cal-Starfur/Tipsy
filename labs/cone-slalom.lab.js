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
   through tpSlalomStart()/tpSlalomQuit() the same way the real buttons do. */
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
  if (scene._slAPI) tpSlalomQuit();

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
       <button id="slBenchQuit" style="${BTN}flex:1">quit</button>
     </div>`;
  document.body.appendChild(panel);

  document.getElementById('slBenchRestart').onclick = () => arm();
  document.getElementById('slBenchQuit').onclick = () => {
    clearInterval(readTick);
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
