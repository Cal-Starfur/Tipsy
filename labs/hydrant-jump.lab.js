/* ===========================================================================
   HYDRANT JUMP TUNER — loads in labs/_bench.html  (?lab=hydrant-jump)
   ===========================================================================
   Bench code, not a lab. It compiles inside the game's realm, so it closes
   over HJ_CH, HJ_JUMP, HJ_GEOM, HYD, hjSolveBand and the live WorldScene
   exactly as game/index.html does. Nothing here is a copy of the game's
   maths except the band solver, and that copy exists on purpose — see
   BAND CHECK below.

   WHAT IS BEING TUNED
   The complaint is that the run-up is slow. It is: at a sustainable 4
   taps/sec Tipsey reaches the lip at speed 0.082, against a delivery-mode
   cap of 0.225, after 5.8 seconds of runway.

   The naive fix — raise sp1 — moves every solved pass band, because reach
   goes as v^2 and the ten levels were solved against the old reach. So
   this tuner does NOT expose sp1. It exposes k, and drives three dials
   off it as a locked triple:

       sp1  = base * k          horizontal reach ~ v^2 * pow / grav
       grav = base * k^2        ...and peak ~ v^2 * pow^2 / grav
       slam = base / k          touchdown |vz| scales with k, so the
                                landing-cleanliness threshold must not

   Under that triple, reach and peak height are algebraically invariant and
   the landing test is too. Everything happens FASTER and lands in the same
   place. Solved numerically across all ten levels before this was written:
   every band held to within 0.5% of charge at k = 1.4.

   Raise k and the run-up also shortens, which costs charge at the lip, so
   `runup` and `sp0` are here to put charge-at-lip back where it was. The
   target is the SHIPPED column in the readout: match it and the whole
   ten-level ladder is untouched in taps/sec terms.

   BAND CHECK — this is a bug, not a feature
   The green band on the in-game meter comes from hjSolveBand(), which is a
   parallel copy of the flight maths rather than the real hjSim path. The
   copy starts the arc at z = 0 and lands it at z = 0; hjSim starts at the
   kicker's lift (12) and lands on the catch wedge. It also has no landing
   -absorption test at all. The meter therefore reads about two points HOT
   at every level. The readout shows both bands so the gap is visible on
   device. Not fixed here — reported first.

   TO PORT: tap `copy` for the one-line summary and hand it back.
   =========================================================================== */

(() => {
  const scene = game.scene.scenes.find(s => s.route);
  if (!scene) { console.log('no scene with a route yet'); return; }

  document.getElementById('hjtPanel')?.remove();
  if (window.__hjtRAF) cancelAnimationFrame(window.__hjtRAF);

  /* the shipped values, captured once so `reset` is always truthful even
     after the sliders have been dragged around for an hour */
  const BASE = window.__hjtBase || (window.__hjtBase = {
    sp1:   HJ_CH.sp1,
    sp0:   HJ_CH.sp0,
    add:   HJ_CH.add,
    gap:   HJ_CH.gap,
    grav:  HJ_JUMP.grav,
    slam:  HJ_JUMP.slam,
    runup: HJ_GEOM.runup,
  });

  const S = { k: 1.00, add: BASE.add, gap: BASE.gap,
              sp0: BASE.sp0, runup: BASE.runup, rate: 0 };

  /* Tipsey's delivery-mode speed ceiling. It is a bare literal inside the
     Clamp in update() rather than a named constant, so this is a copy and
     copies drift - if that clamp ever moves, this number is silently stale.
     Worth promoting to a real const on the next pass; noted, not done. */
  const MAXSPD = 0.225;

  /* ---------- apply ------------------------------------------------------
     k drives the triple. runup needs a ROUTE reload, not just a level
     rebuild, because findCourseLeg's NEED test reads it at generation
     time — a longer run-up can no longer fit on a leg that was chosen
     for a shorter one. */
  /* ---------- entering the challenge -------------------------------------
     CALL THE GAME'S OWN PATH. hjStart() then hjBegin() is exactly what the
     Side Missions menu does, and nothing else here is allowed to
     re-implement it.

     Two attempts before this one hand-rolled a sequence instead, and both
     broke, for the reason you would expect:

       v1: loadChallenge() only. That routes through loadRoute(), which puts
           titleOverlay back up - the TODAY / RANDOM DAY map screen. The
           course was built correctly underneath it the whole time.
       v2: loadChallenge() + hide('titleOverlay') + hjResetRun(). Looked
           right and was still wrong: #hjTap and #hjMeterWrap live inside
           <div id="hjUI" class="hidden">, and the ONLY thing that unhides
           them is hjBegin(), which also runs hjChrome(true) to clear the
           delivery HUD. So there was no tap button, which makes the whole
           bench useless - you cannot tune a tap meter you cannot tap.

     Two parallel copies of an entry sequence, two bugs, in the same session
     that flagged hjSolveBand for being a parallel copy of hjSim. The rule
     earns its keep: verify through the call the game actually makes.

     The one thing the bench genuinely has to add is BENCH.camRelease(). The
     bench camera owns camX/camY/K through the pre-draw hook, and autoBoot
     clicks `start run` before the lab loads, so without releasing it you
     keep the old framing from a normal daily route across the route swap:
     old spot, new street. That is bench state, not a game path, so it
     belongs here. */
  function enterChallenge() {
    try { window.BENCH && window.BENCH.camRelease(); } catch (e) {}
    hjStart();     // loadChallenge + the route map, exactly as the menu does
    hjBegin();     // hides the map, unhides #hjUI, hjChrome(true), hjResetRun
  }

  function apply(needRoute) {
    HJ_CH.sp1     = BASE.sp1  * S.k;
    HJ_JUMP.grav  = BASE.grav * S.k * S.k;
    HJ_JUMP.slam  = BASE.slam / S.k;
    HJ_CH.sp0     = S.sp0;
    HJ_CH.add     = S.add;
    HJ_CH.autoTap = S.rate;
    /* gap is COURSE GEOMETRY, not a live dial: hjBuildCourse reads it when
       it lays the catch ramp out, so the course has to be rebuilt or the
       slider does nothing visible and every band goes stale. */
    const regap = HJ_CH.gap !== S.gap;
    HJ_CH.gap = S.gap;
    const moved = HJ_GEOM.runup !== S.runup;
    HJ_GEOM.runup = S.runup;
    if (needRoute && moved) enterChallenge();
    else {
      if (regap) scene.hjBuildCourse(scene.hjLevel || 1);
      if (scene.hjResetRun) scene.hjResetRun();
    }
    scene._hjBandLvl = -1;                 // force the meter to re-solve
  }

  /* ---------- band solvers ----------------------------------------------
     realBand mirrors hjSim EXACTLY, including the kicker lift, the catch
     wedge and the landing-absorption clean test. meterBand is the game's
     own hjSolveBand, called through the real function so the readout
     cannot drift from what the player's meter says. */
  function realBand(level) {
    const ch = scene.route && scene.route.challenge;
    if (!ch || !ch.hydS || !ch.hydS.length) return { lo: null, hi: null };
    const dt = HJ_STEP, lip = ch.kickerS + TILE;
    const kick  = scene.route.hazards.find(h => h.hjRole === 'kicker');
    const catchH = scene.route.hazards.find(h => h.hjRole === 'catch');
    const n = Math.min(level, ch.hydS.length);
    let lo = null, hi = null;
    for (let c = 0; c <= HJ_CH.chargeMax + 0.0005; c += 0.002) {
      const speed = HJ_CH.sp0 + c * (HJ_CH.sp1 - HJ_CH.sp0);
      if (speed < HJ_JUMP.minSpeed) continue;
      const pow = HJ_CH.pw0 + Math.min(c, 1) * (HJ_CH.pw1 - HJ_CH.pw0);
      let vz = speed * pow, z = kick ? kick.lift : 0, s = lip;
      let idx = 0, passed = 0, clipped = false, t = 0, clean = false;
      while (true) {
        const p0 = s;
        vz -= HJ_JUMP.grav * dt; z += vz * dt; s += speed * dt; t += dt;
        while (idx < n && p0 < ch.hydS[idx] && s >= ch.hydS[idx]) {
          idx++;
          if (z < HYD.height + HJ_JUMP.clear) { vz = -Math.abs(vz) - 0.01; clipped = true; }
          else passed++;
        }
        const dL = s - ch.catchS;
        const gz = (catchH && Math.abs(dL) < TILE) ? scene.hjWedgeTop(catchH, dL) : 0;
        if (vz < 0 && z <= gz) {
          const onRamp = Math.abs(dL) < TILE;
          const centre = 1 - Math.min(1, Math.abs(dL) / TILE);
          const absorb = HJ_CH.absMin + HJ_CH.absGrad * (1 - centre);
          clean = passed >= n && onRamp && !clipped
               && Math.abs(vz) * HJ_JUMP.slam * absorb < 0.6;
          break;
        }
        if (t > 20000) break;
      }
      if (clean) { if (lo === null) lo = c; hi = c; }
    }
    return { lo, hi };
  }

  /* ---------- panel ------------------------------------------------------ */
  const FIELDS = [
    { key: 'k',     label: 'k',     min: 0.80, max: 3.00, step: 0.02,  dp: 2 },
    { key: 'add',   label: 'add',   min: 0.06, max: 0.30, step: 0.002, dp: 3 },
    { key: 'gap',   label: 'gap',   min: 0.25, max: 0.70, step: 0.01,  dp: 2 },
    /* 12*T2 is the CLIFF, not a round number. findCourseLeg picks the
       earliest line long enough for NEED, and at 12*T2 NEED is 1904 against
       a 1932-unit leg. One notch further and the whole side mission
       relocates to a different street. Measured against generateRoute on
       the real seed, not derived from the rule. */
    { key: 'runup', label: 'runup', min: 2 * T2, max: 12 * T2, step: T2 / 4, dp: 0 },
    { key: 'sp0',   label: 'sp0',   min: 0,    max: 0.08, step: 0.005, dp: 3 },
    { key: 'rate',  label: 'auto',  min: 0,    max: 14,   step: 0.5,  dp: 1 },
  ];

  const panel = document.createElement('div');
  panel.id = 'hjtPanel';
  /* TOP-LEFT, not bottom. The game's own challenge HUD lives down there —
     #hjTap at bottom:56px and #hjMeterWrap at bottom:158px — and this panel
     is appended to the GAME's body, so a bottom-docked panel sits directly
     on top of the tap button and the charge meter. Which it did. Capped at
     46vh and collapsible so it can never grow back down into them. */
  panel.style.cssText = [
    'position:fixed', 'left:8px', 'top:calc(8px + env(safe-area-inset-top))',
    'width:min(420px, calc(100% - 16px))', 'max-height:46vh', 'overflow:auto',
    'z-index:99999', 'box-sizing:border-box',
    'background:#12141aee', 'backdrop-filter:blur(6px)',
    'border:1px solid #2b2f38', 'border-radius:12px', 'padding:10px 12px',
    'font:12px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace', 'color:#e8eaef',
    '-webkit-user-select:none', 'user-select:none',
  ].join(';');

  panel.innerHTML =
    `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
       <b style="color:#ff9c4d;letter-spacing:2px">HYDRANT JUMP</b>
       <span id="hjtLvl" style="margin-left:auto;font-weight:700"></span>
       <button id="hjtFold" style="flex:0 0 auto;padding:2px 8px">–</button>
     </div>
     <div id="hjtBody">` +
    FIELDS.map(f =>
      `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
         <span style="width:44px;color:#8f95a1">${f.label}</span>
         <input type="range" id="hjt-${f.key}" min="${f.min}" max="${f.max}"
                step="${f.step}" style="flex:1;accent-color:#ff7a1a">
         <span id="hjtv-${f.key}" style="width:46px;text-align:right;
               font-variant-numeric:tabular-nums">0</span>
       </div>`).join('') +
    `<div id="hjtRead" style="margin-top:8px;padding-top:8px;
         border-top:1px solid #2b2f38;white-space:pre;font-size:11px;
         line-height:1.5;color:#c3c8d2"></div>
     <div style="display:flex;gap:8px;margin-top:8px">
       <button id="hjtLvlDn" style="flex:0 0 auto">lvl -</button>
       <button id="hjtLvlUp" style="flex:0 0 auto">lvl +</button>
       <button id="hjtReset"  style="flex:1 1 auto">reset</button>
       <button id="hjtCopy"   style="flex:1 1 auto">copy</button>
     </div></div>`;
  document.body.appendChild(panel);
  for (const b of panel.querySelectorAll('button'))
    b.style.cssText = 'background:#1d222b;color:#e8eaef;border:1px solid #333a45;' +
                      'border-radius:8px;padding:8px 10px;font:inherit';

  const el = id => document.getElementById(id);

  function syncInputs() {
    for (const f of FIELDS) {
      el('hjt-' + f.key).value = S[f.key];
      el('hjtv-' + f.key).textContent = (+S[f.key]).toFixed(f.dp);
    }
  }
  for (const f of FIELDS) {
    el('hjt-' + f.key).oninput = e => {
      S[f.key] = +e.target.value;
      el('hjtv-' + f.key).textContent = S[f.key].toFixed(f.dp);
      apply(f.key === 'runup');
    };
  }

  el('hjtLvlUp').onclick = () => {
    scene.hjLevel = Math.min(HJ_CH.maxLevel, (scene.hjLevel || 1) + 1);
    scene.hjBuildCourse(scene.hjLevel); scene.hjResetRun();
  };
  el('hjtLvlDn').onclick = () => {
    scene.hjLevel = Math.max(1, (scene.hjLevel || 1) - 1);
    scene.hjBuildCourse(scene.hjLevel); scene.hjResetRun();
  };
  el('hjtReset').onclick = () => {
    S.k = 1.00; S.sp0 = BASE.sp0; S.runup = BASE.runup; S.rate = 0;
    S.add = BASE.add; S.gap = BASE.gap;
    syncInputs();
    HJ_GEOM.runup = S.runup; HJ_CH.gap = S.gap;
    enterChallenge();
    apply(false);
  };
  el('hjtCopy').onclick = () => {
    const line = `HJ k=${S.k.toFixed(2)} -> sp1 ${(BASE.sp1 * S.k).toFixed(4)} · ` +
      `grav ${(BASE.grav * S.k * S.k).toExponential(4)} · slam ${(BASE.slam / S.k).toFixed(2)} · ` +
      `add ${S.add.toFixed(3)} · gap ${S.gap.toFixed(2)} · ` +
      `sp0 ${S.sp0.toFixed(3)} · runup ${S.runup} (${(S.runup / T2).toFixed(2)}·T2)`;
    navigator.clipboard?.writeText(line);
    el('hjtRead').textContent = line;
  };

  /* ---------- live readout ----------------------------------------------
     runway time and charge-at-lip are MEASURED off the real scene rather
     than predicted, because the prediction is the thing being checked. */
  let runT0 = null, lastS = null, lipCharge = null, lipT = null;

  function tick() {
    window.__hjtRAF = requestAnimationFrame(tick);
    const ch = scene.route && scene.route.challenge;
    if (!ch) { el('hjtRead').textContent = 'not in the challenge — tap reset, or call hjStart() then hjBegin()'; return; }

    const lip = ch.kickerS + TILE;
    if (lastS !== null && scene.botS < lastS - 10) { runT0 = null; lipCharge = null; lipT = null; }
    if (scene.state === 'play' && runT0 === null && scene.botS < lip) runT0 = performance.now();
    if (lastS !== null && lastS < lip && scene.botS >= lip && runT0 !== null && lipT === null) {
      lipT = (performance.now() - runT0) / 1000;
      lipCharge = scene.hjChargeSm;
    }
    lastS = scene.botS;

    const L = scene.hjLevel || 1;
    const rb = realBand(L), mb = hjSolveBand(scene, ch);
    const pc = v => v === null || v === undefined ? '  --  ' : (v * 100).toFixed(1).padStart(5) + '%';
    const w  = b => b.lo === null ? ' -- ' : ((b.hi - b.lo) * 100).toFixed(1).padStart(4);
    /* the point of the whole exercise: level 1 should sit at 1.00x, and
       every level above it beyond Tipsey's delivery ceiling. */
    const xm = b => b.lo === null ? '' :
      ((b.lo + b.hi) / 2 * HJ_CH.sp1 / MAXSPD).toFixed(2) + 'x max';

    el('hjtLvl').textContent = 'lvl ' + L + '/' + HJ_CH.maxLevel;
    el('hjtRead').textContent =
      `real band  ${pc(rb.lo)} ${pc(rb.hi)}   w${w(rb)}   ${xm(rb)}\n` +
      `meter band ${pc(mb.lo)} ${pc(mb.hi)}   w${w(mb)}\n` +
      `charge now ${pc(scene.hjChargeSm)}    speed ${(scene.speed || 0).toFixed(4)}\n` +
      `at lip     ${pc(lipCharge)}    runway ${lipT === null ? ' --' : lipT.toFixed(2)}s\n` +
      `SHIPPED at-lip target: 2/s 25.5%  4/s 49.9%  6/s 74.5%  8/s 96.6%`;
  }

  /* fold away to the header bar — the panel is over the game's canvas, and
     sometimes you just want to watch the jump */
  el('hjtFold').onclick = () => {
    const b = el('hjtBody'), f = el('hjtFold');
    const shut = b.style.display === 'none';
    b.style.display = shut ? '' : 'none';
    f.textContent = shut ? '\u2013' : '+';
  };

  syncInputs();
  enterChallenge();
  apply(false);
  tick();
  console.log('hydrant-jump tuner ready — k drives sp1/grav/slam as a locked triple.');
  console.log('the pinned date in the bench rail does NOT apply here: the challenge ' +
              'is hard-seeded to HJ_SEED_DATE so the course is the same one players get.');
})();
