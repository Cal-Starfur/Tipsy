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

   THE FINISH MARKER (added after on-device report, 2026-08-11: "the end of
   the run has no cones and is covered in props"). Root cause isn't the
   corridor sweep -- that already covers out to
   max(finishS, chainEndS) + SL.clean*T2, same as everywhere else in this
   engine. It's that there is no visible finish line at all: "THE FINISH IS
   A DELIVERY" (slJudge's own comment, game/index.html) -- the run ends by
   stopping in the game's normal win window, same as any delivery, and
   game/index.html DOES build a rope-tape prop for it (slBuildFinish) with a
   matching draw function (slDrawFinish, explicitly "Drawn from BENCH.hook")
   -- but nothing in game/index.html ever calls BENCH.hook to fire it, and
   slDrawFinish is a function local to tpSlalomOn's closure, unreachable
   from here by name. So in the shipped game that's fine (no BENCH, nobody
   ever needed the tape), and in the bench it's silent: no stop marker, so
   a run that isn't braked exactly right sails past the real win window,
   the game's own loop.missed sends it on the go-around lap same as a
   missed delivery, and that lap is ordinary unswept street -- which reads
   exactly like "ran out of cones, hit the regular city."
   Fixed here, not in game/index.html: everything the marker needs
   (course.finishS, TAPE, ROBOT_SIDE, ROAD_HALF, SIDEWALK_W, scene.posAt/
   headingAt/W/quadOn) is already public module scope, so this rebuilds the
   same tape slBuildFinish/slDrawFinish already describe rather than
   reaching into tpSlalomOn's closure or changing what ships. Stop when the
   robot is on it, same as any other delivery door.

   WHY BENCH.pre, NOT BENCH.hook -- checked empirically, not assumed:
   _bench.html's wrapped drawWorld resets __benchVQ, then calls the real
   drawWorld (which drains __benchVQ into the world's own depth-sorted list
   on queueBlockContent's FIRST call that frame), and only THEN calls
   __benchHook. So anything queued from BENCH.hook's callback lands in
   __benchVQ one call too late -- that frame's drain already happened, and
   next frame's reset wipes it before it's ever read. slDrawFinish's own
   comment ("drawWorld drains that list while it runs") describes what
   BENCH.pre does, not BENCH.hook -- confirmed on-device: hook fired with no
   error and __benchVQ had the item, nothing ever drew. BENCH.pre runs
   BEFORE the drain, which is the one that actually works. BENCH.pre is
   also how the bench's own camera-follow is wired (__benchPre defaults to
   applyCam), so this chains through whatever was already installed there
   instead of overwriting it -- calling BENCH.pre a second time replaces
   the single slot, and dropping camera-follow to draw a rope would trade
   one bug for a worse one. */
(() => {
  const scene = game.scene.scenes.find(s => s.route);
  if (!scene) { console.log('no scene with a route yet'); return; }

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

  /* Rebuilds the same rope-tape geometry slBuildFinish computes, from the
     public course.finishS -- see the header comment for why this can't
     just call the real slDrawFinish. Reads course fresh every frame
     (finishS doesn't move once built, but re-deriving is cheap and this
     stays correct across restart without any extra wiring). */
  function drawFinishMarker(){
    const api = scene._slAPI;
    const course = api && api.run.course;
    if (!course || !isFinite(course.finishS)) return;
    const at = (ss, off) => {
      const p = scene.posAt(ss), h = scene.headingAt(ss);
      return { x: p.x + (-Math.sin(h)) * off, y: p.y + Math.cos(h) * off };
    };
    const kerb = ROBOT_SIDE * (ROAD_HALF + TAPE.inset);
    const bldg = ROBOT_SIDE * (ROAD_HALF + SIDEWALK_W - TAPE.inset);
    const a = at(course.finishS, bldg), b = at(course.finishS, kerb);
    BENCH.queue(a.x + a.y, (g) => {
      for (let i = 0; i < TAPE.segs; i++){
        const t0 = i / TAPE.segs, t1 = (i + 1) / TAPE.segs;
        const px = t => a.x + (b.x - a.x) * t, py = t => a.y + (b.y - a.y) * t;
        const zf = t => TAPE.z - TAPE.sag * 4 * t * (1 - t);
        const quad = [
          scene.W(px(t0), py(t0), zf(t0) + TAPE.half),
          scene.W(px(t1), py(t1), zf(t1) + TAPE.half),
          scene.W(px(t1), py(t1), zf(t1) - TAPE.half),
          scene.W(px(t0), py(t0), zf(t0) - TAPE.half),
        ];
        scene.quadOn(g, quad, i % 2 ? TAPE.band : TAPE.yellow, 1);
      }
    });
  }
  const priorPre = scene.__benchPre;   // chain, don't clobber camera-follow
  BENCH.pre((sc, t) => {
    if (priorPre) priorPre(sc, t);
    try { drawFinishMarker(); }
    catch(e){ if (!drawFinishMarker._told){ drawFinishMarker._told = 1; console.log('finish marker draw failed', e); } }
  });

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
