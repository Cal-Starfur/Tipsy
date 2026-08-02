/* ===========================================================================
   CORNER RAMP TUNER — paste into the Lab console in labs/_bench.html
   ===========================================================================
   Not a lab. labs/README.md is explicit that new work belongs in the bench,
   because the bench compiles inside the game's own realm and the port is a
   copy rather than a translation. This is bench code: it closes over
   WORLD_RAMP, buildWorldCurbRamps and drawProp directly, exactly as
   game/index.html does.

   WHAT IS BEING TUNED
   Every intersection corner carries two curb ramps, one per street. Their
   SLOPES currently occupy the same 92x92 square — not their pads, which never
   touched. Each slope runs from `along` to `along + 2*TILE`, is 2*TILE wide,
   and sits centred on `cross`. Swap the axes for the neighbour, and the two
   intersect exactly when

       along < cross + TILE   AND   cross < along + 3*TILE

   Both hold at the shipped 460/506. The readout below evaluates that live, so
   the target is simply: get CORNER to read CLEAR without the pad leaving the
   kerb.

   The kerb line is at ROAD_HALF (368). The pad's leading edge sits at
   `along - 2*TILE`, so `along` = 460 is what puts the pad exactly on the kerb.
   Move `along` out and a strip of plain sidewalk opens between ramp and
   street, which is why `cross` is the more promising axis.

   TO PORT: read the numbers off the panel and write them into WORLD_RAMP in
   game/index.html, then sync game-logic.js.
   =========================================================================== */

(() => {
  const scene = game.scene.scenes.find(s => s.route);
  if (!scene) { console.log('no scene with a route yet'); return; }

  document.getElementById('crtPanel')?.remove();

  const FIELDS = [
    { key: 'along',       label: 'along',   min: 368, max: 900, step: 23 },
    { key: 'cross',       label: 'cross',   min: 368, max: 900, step: 23 },
    { key: 'baseCross',   label: 'patch',   min: 46,  max: 184, step: 23 },
    { key: 'baseOutline', label: 'outline', min: 0,   max: 3,   step: 1 },
  ];

  const panel = document.createElement('div');
  panel.id = 'crtPanel';
  panel.style.cssText = [
    'position:fixed', 'left:8px', 'right:8px', 'bottom:8px', 'z-index:99999',
    'background:#12141a', 'border:1px solid #2b2f38', 'border-radius:12px',
    'padding:10px 12px calc(10px + env(safe-area-inset-bottom))',
    'font:12px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace', 'color:#e8eaef',
    '-webkit-user-select:none', 'user-select:none',
  ].join(';');

  panel.innerHTML =
    `<div style="display:flex;align-items:baseline;gap:8px;margin-bottom:8px">
       <b style="color:#ff9c4d;letter-spacing:2px">CORNER RAMPS</b>
       <span id="crtVerdict" style="margin-left:auto;font-weight:700"></span>
     </div>` +
    FIELDS.map(f =>
      `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
         <span style="width:52px;color:#8f95a1">${f.label}</span>
         <input type="range" id="crt-${f.key}" min="${f.min}" max="${f.max}"
                step="${f.step}" style="flex:1;accent-color:#ff7a1a">
         <span id="crtv-${f.key}" style="width:38px;text-align:right;
               font-variant-numeric:tabular-nums">0</span>
       </div>`).join('') +
    `<div style="display:flex;gap:8px;margin-top:8px">
       <button id="crtBoth"  style="flex:2">8 per node</button>
       <button id="crtClear" style="flex:2">auto-fix cross</button>
       <button id="crtReset" style="flex:1">reset</button>
     </div>
     <div id="crtStat" style="margin-top:8px;color:#8f95a1"></div>`;

  for (const b of panel.querySelectorAll('button')) {
    b.style.cssText = 'background:#262a33;color:#e8eaef;border:1px solid #363b46;' +
                      'border-radius:9px;padding:9px 4px;font:inherit;font-weight:600';
  }
  document.body.appendChild(panel);

  /* the two slopes at a corner are the same rectangle with the axes swapped,
     so one interval test answers both. */
  const slopesOverlap = () => {
    const { along: A, cross: C } = WORLD_RAMP;
    return A < C + TILE && C < A + 3 * TILE;
  };

  const rebuild = () => {
    const grid = scene.route.grid;
    grid.curbRamps = buildWorldCurbRamps(grid);
    /* the route-ramp dedup is skipped while tuning: `cross` moves the world
       set off the route ramps anyway, and seeing every ramp is the point. */
    scene.route.curbRamps = grid.curbRamps;

    const clear = !slopesOverlap();
    const v = document.getElementById('crtVerdict');
    v.textContent = clear ? 'CORNER CLEAR' : 'SLOPES CROSSING';
    v.style.color = clear ? '#4ad07a' : '#ff5c5c';

    const gap = WORLD_RAMP.cross - (WORLD_RAMP.along + 3 * TILE);
    const kerb = WORLD_RAMP.along - 2 * TILE - ROAD_HALF;
    document.getElementById('crtStat').textContent =
      `${grid.curbRamps.length} ramps · slope gap ${gap >= 0 ? '+' : ''}${gap} · ` +
      `pad ${kerb === 0 ? 'on kerb' : (kerb > 0 ? kerb + ' short of kerb' : -kerb + ' into road')}`;
  };

  const sync = () => {
    for (const f of FIELDS) {
      document.getElementById('crt-' + f.key).value = WORLD_RAMP[f.key];
      document.getElementById('crtv-' + f.key).textContent = WORLD_RAMP[f.key];
    }
    const b = document.getElementById('crtBoth');
    b.textContent = WORLD_RAMP.bothStreets ? '8 per node' : '4 per node';
    b.style.background = WORLD_RAMP.bothStreets ? '#262a33' : '#ff7a1a';
    rebuild();
  };

  for (const f of FIELDS) {
    document.getElementById('crt-' + f.key).addEventListener('input', e => {
      WORLD_RAMP[f.key] = +e.target.value;
      document.getElementById('crtv-' + f.key).textContent = WORLD_RAMP[f.key];
      rebuild();
    });
  }

  document.getElementById('crtBoth').onclick = () => {
    WORLD_RAMP.bothStreets = !WORLD_RAMP.bothStreets; sync();
  };
  /* the smallest `cross` that clears, leaving the pad where it is */
  document.getElementById('crtClear').onclick = () => {
    WORLD_RAMP.cross = WORLD_RAMP.along + 3 * TILE; sync();
  };
  document.getElementById('crtReset').onclick = () => {
    Object.assign(WORLD_RAMP, {
      along: ROAD_HALF + 2 * TILE, cross: ROAD_HALF + 3 * TILE,
      bothStreets: true, baseCross: 3 * TILE, baseOutline: 2,
    });
    sync();
  };

  sync();
  console.log('corner ramp tuner ready — drag `cross` until CORNER CLEAR');
})();
