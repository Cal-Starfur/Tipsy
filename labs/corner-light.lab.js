/* ===========================================================================
   TRAFFIC SIGNAL TUNER — labs/_bench.html?lab=corner-light
   ===========================================================================
   The signals now live in game/index.html: SIGNAL, signalPhaseAt,
   buildWorldSignals, the signalpost/signalhead branches of drawProp, and
   updateSignalHolds. This file no longer draws or places anything — it is
   sliders over the game's own mutable SIGNAL, the same shape the curb-ramp
   tuner has.

   WHY IT MOVED. The first version drew through BENCH.queue, which can only
   reach blockVQ. blockVQ is drawn before hazVQ, and hazVQ is where every
   pedestrian, palm, cone and hydrant lives — so the signals were painted
   over by anything that walked past, at any depth. That was the on-device
   report. Streetlamps never had the problem because they are hazards
   already. Nothing in the bench can reach hazVQ (unlike blockVQ, no method
   receives it), so the fix could not live in a lab.

   Every value below is read fresh each frame, so drags land immediately with
   no rebuild. Placement is not tunable: SIGNAL_APEX is derived from where
   the curb ramps leave off, and moving it would only put a pole under a ramp.

   TO PORT: tap `copy` and hand the line back; the numbers get written into
   SIGNAL in game/index.html and synced to game-logic.js.
   =========================================================================== */

(() => {
  const sc = game.scene.scenes[0];
  if (!sc || !sc.route) { console.log('no route yet — press "start run" first'); return; }
  document.getElementById('cltPanel')?.remove();

  const F = [
    { k: 'cycle',    lo: 6000, hi: 24000, st: 500 },
    { k: 'amber',    lo: 800,  hi: 4000,  st: 100 },
    { k: 'poleH',    lo: 140,  hi: 380,   st: 10 },
    { k: 'armLen',   lo: 120,  hi: 420,   st: 10 },
    { k: 'headR',    lo: 8,    hi: 26,    st: 1 },
    { k: 'stopBand', lo: 30,   hi: 200,   st: 10 },
  ];
  const TOG = [
    ['cltArm',   'arm',      'mast'],
    ['cltAware', 'aware',    'traffic aware'],
    ['cltFace',  'readable', 'readable'],
  ];

  const p = document.createElement('div');
  p.id = 'cltPanel';
  p.style.cssText = 'position:fixed;left:8px;right:8px;bottom:8px;z-index:99999;' +
    'background:#12141a;border:1px solid #2b2f38;border-radius:12px;' +
    'padding:10px 12px calc(10px + env(safe-area-inset-bottom));' +
    'font:12px/1.3 ui-monospace,Menlo,monospace;color:#e8eaef;user-select:none';
  p.innerHTML =
    `<div style="display:flex;gap:8px;margin-bottom:8px">
       <b style="color:#ff9c4d;letter-spacing:2px">SIGNALS</b>
       <span id="cltLive" style="margin-left:auto"></span></div>` +
    F.map(f => `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
        <span style="width:58px;color:#8f95a1">${f.k}</span>
        <input type="range" id="clt-${f.k}" min="${f.lo}" max="${f.hi}" step="${f.st}"
               style="flex:1;accent-color:#ff7a1a">
        <span id="cltv-${f.k}" style="width:44px;text-align:right"></span></div>`).join('') +
    `<div style="display:flex;gap:8px;margin-top:8px">` +
      TOG.map(([id, , label]) => `<button id="${id}" style="flex:1">${label}</button>`).join('') +
      `<button id="cltLook" style="flex:1">look at one</button>
     </div>
     <div style="display:flex;gap:8px;align-items:center;margin-top:8px">
       <code id="cltPort" style="flex:1;background:#0e0d0c;border:1px solid #2b2f38;
             border-radius:7px;padding:7px 8px;color:#ff9c4d;white-space:nowrap;
             overflow-x:auto;user-select:text"></code>
       <button id="cltCopy" style="flex:0 0 62px">copy</button>
     </div>`;
  for (const b of p.querySelectorAll('button'))
    b.style.cssText = 'background:#262a33;color:#e8eaef;border:1px solid #363b46;' +
                      'border-radius:9px;padding:9px 4px;font:inherit;font-weight:600';
  document.body.appendChild(p);

  const portLine = () =>
    'SIGNAL ' + F.map(f => `${f.k}:${SIGNAL[f.k]}`).join(' ') +
    ' ' + TOG.map(([, k]) => `${k}:${SIGNAL[k]}`).join(' ');

  const sync = () => {
    for (const f of F) {
      document.getElementById('clt-' + f.k).value = SIGNAL[f.k];
      document.getElementById('cltv-' + f.k).textContent = SIGNAL[f.k];
    }
    for (const [id, k] of TOG)
      document.getElementById(id).style.background = SIGNAL[k] ? '#ff7a1a' : '#262a33';
    document.getElementById('cltPort').textContent = portLine();
  };

  for (const f of F)
    document.getElementById('clt-' + f.k).addEventListener('input', e => {
      SIGNAL[f.k] = +e.target.value; sync();
    });
  for (const [id, k] of TOG)
    document.getElementById(id).onclick = () => { SIGNAL[k] = !SIGNAL[k]; sync(); };

  document.getElementById('cltLook').onclick = () => {
    /* nearest intersection to the robot, so this lands somewhere with
       traffic running through it rather than an arbitrary map corner */
    let best = null, bd = Infinity;
    for (const n of sc.route.grid.nodes) {
      const d = Math.hypot(n.x - sc.botX, n.y - sc.botY);
      if (d < bd) { bd = d; best = n; }
    }
    BENCH.lookAt(best.x, best.y, 0.9);
  };

  document.getElementById('cltCopy').onclick = async () => {
    const b = document.getElementById('cltCopy');
    try { await navigator.clipboard.writeText(portLine()); b.textContent = 'copied'; }
    catch (e) {
      const r = document.createRange();
      r.selectNodeContents(document.getElementById('cltPort'));
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      b.textContent = 'selected';
    }
    setTimeout(() => { b.textContent = 'copy'; }, 1400);
  };

  setInterval(() => {
    const n = sc.route.grid.nodes[0];
    const ph = signalPhaseAt(n, sc.time.now);
    /* Meant to look small. The stop band is 70 units of a 3128 block, so
       roughly one car citywide sits in one at any instant — zero here is
       normal rather than broken, which is what made this look dead on the
       first pass. */
    const held = sc.route.traffic.filter(tr => (tr.hold || 0) > 0).length;
    document.getElementById('cltLive').textContent =
      `${sc.route.signals.length} · ${ph.axis ? 'y' : 'x'} ${ph.state} · ${held} with hold`;
  }, 250);

  sync();
  console.log('signal tuner ready —', sc.route.signals.length, 'signals');
})();
