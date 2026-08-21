/* ========================================================================
   OPEN WORLD — locomotion, phase 1
   ========================================================================
   The B answer to the question free-drive.lab.js was built to ask. That
   lab kept the rail and let the player choose which rail got built next;
   this one deletes the rail from the robot's point of view entirely.
   botX/botY/yaw become the authority and botS stops meaning anything.

   WHAT THIS LAB IS FOR, AND ONLY THIS: does driving Tipsey feel right,
   and does a curb read correctly under a thumb. No deliveries, no
   hazards, no doors, no scoring. Everything s-keyed in the real game
   (hz.s, doorS, crossings, the jump, the slalom) is a separate port and
   is deliberately not attempted here — none of it can be designed until
   the driving model is settled, and all of it is cheap to redo if the
   model changes.

   THE FACADE. update() derives botX/botY from posAt(botS) + laneOff at
   its 'world pose from the path' block, and eases drawAngle toward the
   rail's headingAt(). Both are stamped over on postupdate, after the
   whole of update() has run, so nothing in the game has to be gated or
   branched — the sim keeps computing its rail pose every frame and this
   lab keeps overwriting it. Wasteful by a rounding error, and it means
   the restore is a genuine no-op rather than a reconstruction.

   botS is pinned to a mid-chain constant so the rail machinery it feeds
   (groundZ, segAt, the win check) stays on a valid, boring straight and
   never fires. That pin is the reason this lab can ignore the rail
   instead of fighting it.

   STEERING IS A HEADING REQUEST, NOT A YAW COMMAND. The stick sets
   targetYaw in world space; the robot turns toward it at a rate the
   physics picks. A 180 flick is therefore legal input and costs a wide
   arc, not a snap — the rate limiter rejects the gesture on the robot's
   behalf so no input handler has to.

   Closes over game scope (BLOCK, T2, ROAD_HALF, SIDEWALK_W, DIRV) the
   way every lab does. Re-entrant via scene._owRestore.
   ======================================================================== */
(() => {
  const scene = game.scene.scenes.find(s => s.route);
  if (!scene) { console.log('open-world: no scene with a route'); return; }
  if (scene._owRestore) scene._owRestore();
  if (scene._fdRestore) scene._fdRestore();   // free-drive owns the same robot
  if (scene._slRestore) scene._slRestore();

  const r = scene.route;
  const g2 = r.grid;

  /* ---------- dials ---------- */
  const D = {
    accel:      0.00042,   // units/ms² forward — matches the game's own gas curve
    brake:      0.00075,   // stronger than accel, same asymmetry the rail model uses
    drag:       0.00016,   // coast-down; the reason releasing the stick settles
    vMax:       0.225,     // the game's established top speed — do not raise here
    vRev:       0.070,     // reverse cap. Deliberately slow: this is an unwedging
                           // gear, not a driving mode.
    revEnter:   0.012,     // roll below this with the stick pulled back and reverse engages

    /* TURN RATE, SPEED-SENSITIVE. Peak in the middle: a wheeled robot
       cannot pivot standing still (that is what reverse is for) and
       should wash out at speed rather than knife. */
    turnMax:    0.0034,    // rad/ms at the sweet spot
    turnVPeak:  0.085,     // speed the peak sits at
    turnVWash:  0.55,      // fraction of turnMax still available at vMax
    turnCreep:  0.22,      // fraction available at a standstill — small but non-zero
                           // so a nudge off the stick still points you

    /* TILT FROM YAW RATE, not from a corner's radius. This is the whole
       reason B is worth the port: the rail model let the corner choose
       your lean and left the player nothing to do but arrive slowly. */
    /* TILT GAIN, DERIVED NOT GUESSED. tilt is an accumulator against
       tiltDecay, so steady state = build/decay. The design target is a
       hard turn at vMax sitting just under the 1.0 tip line: yawRate
       there is turnMax*turnVWash = 0.00187 rad/ms, v01² = 1, decay
       0.0021, so gain 1.0 gives 0.89 — on the edge, tips if you hold it.
       The same gain at the mid-speed turn peak (v01² = 0.14) settles at
       0.23, which is comfortable. Fast turns punish, mid turns don't.
       First value here was 58 and tipped the robot at 37% speed inside
       five seconds: build was already a rate and was being multiplied
       by dt a second time. */
    tiltGain:   1.0,       // tilt rate per (rad/ms of yaw rate) × (speed/vMax)²
    tiltDecay:  0.0021,    // matches the game's own tilt decay so numbers stay comparable

    dead:       0.12,      // stick dead zone, fraction of maxR
    maxR:       60,        // px from touchdown for full deflection
    latchIn:    170,       // deg of heading error that latches a turn direction
    latchOut:   150,       // ...and the error it unlatches at. Hysteresis, not a
                           // per-frame decision — see the tie-break note below.
  };

  /* ---------- surface classification ----------
     Derived, not authored: the frozen lattice already implies every
     ribbon in the city. A point is measured against the nearest road
     centreline on each axis; whichever axis it is closer to owns it.

     Returned kinds, and what phase 1 does with them:
       road      drivable, and NOT a fail — you end up in the road, you
                 end up in the road, per the call.
       sidewalk  drivable, the home surface.
       curb      the band between them. Cost is a tilt impulse.
       lot       block interior. Drivable — this is the "cut through the
                 park" case. Phase 2 splits park from building footprint;
                 phase 1 treats the whole interior as open ground so the
                 cutting-through can actually be felt.
       void      outside the lattice. Drivable, empty, no ground art. */
  const CURB_W = T2 * 0.5;
  const SW_OUT = ROAD_HALF + SIDEWALK_W;

  const surfaceAt = (x, y) => {
    const nx = Math.round(x / BLOCK) * BLOCK;
    const ny = Math.round(y / BLOCK) * BLOCK;
    const i = Math.round(x / BLOCK), j = Math.round(y / BLOCK);
    const dx = Math.abs(x - nx), dy = Math.abs(y - ny);

    /* a centreline only exists where the lattice actually has an edge,
       otherwise the "road" through a solid block is imaginary. conn is
       read from the node on the low side of each axis. */
    const nX = g2.nodeAt(i, j);
    const liveY = !!(nX && (nX.conn[1] || (g2.nodeAt(i, j - 1) || {}).conn?.[1]));
    const liveX = !!(nX && (nX.conn[0] || (g2.nodeAt(i - 1, j) || {}).conn?.[0]));

    const band = (d) => d <= ROAD_HALF ? 'road'
                      : d <= ROAD_HALF + CURB_W ? 'curb'
                      : d <= SW_OUT ? 'sidewalk' : null;

    const bx = liveY ? band(dx) : null;   // vertical street: distance measured in x
    const by = liveX ? band(dy) : null;
    if (bx && by) return (dx < dy ? bx : by);   // intersection: nearer axis wins
    return bx || by || (nX ? 'lot' : 'void');
  };

  /* ---------- stash ---------- */
  const orig = {
    botS: scene.botS, botX: scene.botX, botY: scene.botY,
    drawAngle: scene.drawAngle, laneOff: scene.laneOff,
    state: scene.state, mode: scene.mode, tilt: scene.tilt,
    hazards: r.hazards, props: r.props, crossings: r.crossings,
    loop: r.loop, doorS: r.doorS, parMs: r.parMs, challenge: r.challenge,
  };

  r.hazards = []; r.crossings = []; r.loop = null; r.challenge = null;
  r.parMs = 1e9;
  r.doorS = (r.totalLen || 0) + 40 * T2;    // forever out of reach — the slalom trick
  scene.mode = 'challenge';                  // skips the pickup timeline; gas live frame one
  scene.state = 'play';
  scene.laneOff = 0;                         // lane is meaningless once x/y is authoritative

  /* PIN. Mid-chain and on a straight, so every s-keyed reader the sim
     still runs gets a valid boring answer for the whole session. */
  const S_PIN = Math.min(BLOCK * 1.5, Math.max(0, (r.totalLen || BLOCK * 4) * 0.4));
  scene.botS = S_PIN;

  /* ---------- state ---------- */
  const spawn = { x: scene.botX, y: scene.botY };
  let px = spawn.x, py = spawn.y;
  let yaw = scene.drawAngle || 0;
  let vel = 0;                    // signed: negative is reverse
  let reversing = false;
  let latchSign = 0;              // 0 = unlatched
  let lastSfc = 'sidewalk';
  let rightT = 0;                 // ms spent down, for the auto-right below

  const stick = { active: false, id: null, ox: 0, oy: 0, dx: 0, dy: 0 };

  /* ---------- the stick ----------
     Floating origin: it spawns where the thumb lands, because on a phone
     you are looking at the robot and not at your thumb. Left half only —
     the right half stays free for hop, which is already a tap. */
  const onDown = (e) => {
    for (const t of e.changedTouches || [e]) {
      if (t.clientX > window.innerWidth * 0.5) continue;
      if (stick.active) continue;
      stick.active = true; stick.id = t.identifier ?? 'mouse';
      stick.ox = t.clientX; stick.oy = t.clientY; stick.dx = 0; stick.dy = 0;
      paintStick();
    }
  };
  const onMove = (e) => {
    if (!stick.active) return;
    for (const t of e.changedTouches || [e]) {
      if ((t.identifier ?? 'mouse') !== stick.id) continue;
      stick.dx = t.clientX - stick.ox; stick.dy = t.clientY - stick.oy;
      const m = Math.hypot(stick.dx, stick.dy);
      if (m > D.maxR) { stick.dx *= D.maxR / m; stick.dy *= D.maxR / m; }
      paintStick();
    }
  };
  const onUp = (e) => {
    if (!stick.active) return;
    for (const t of e.changedTouches || [e]) {
      if ((t.identifier ?? 'mouse') !== stick.id) continue;
      stick.active = false; stick.id = null; stick.dx = stick.dy = 0;
      paintStick();
    }
  };

  /* keyboard mirror, so this is testable without a touchscreen */
  const keyv = { x: 0, y: 0 };
  const KEYMAP = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
                   w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] };
  const held = new Set();
  const recalcKeys = () => {
    keyv.x = keyv.y = 0;
    for (const k of held) { const v = KEYMAP[k]; if (v) { keyv.x += v[0]; keyv.y += v[1]; } }
    const m = Math.hypot(keyv.x, keyv.y);
    if (m > 1) { keyv.x /= m; keyv.y /= m; }
  };
  const onKeyDown = (e) => { if (KEYMAP[e.key]) { held.add(e.key); recalcKeys(); e.preventDefault(); } };
  const onKeyUp = (e) => { if (KEYMAP[e.key]) { held.delete(e.key); recalcKeys(); } };

  /* ---------- iso inverse ----------
     W() is a plain 2:1 iso: sx = (X - Y)*K, sy = (X + Y)*0.5*K. Inverting
     for direction only (K drops out) gives the world vector a screen-space
     push is asking for. The camera never rotates, so this is a constant
     basis and not a per-frame transform — which is exactly why absolute
     steering is affordable here and would not be under a rotating camera. */
  const screenToWorld = (sx, sy) => ({ x: sx * 0.5 + sy, y: sy - sx * 0.5 });

  /* ---------- the step ---------- */
  const step = (dt) => {
    /* stick vector, dead-zoned. Touch wins when both are live. */
    let sx = stick.active ? stick.dx / D.maxR : keyv.x;
    let sy = stick.active ? stick.dy / D.maxR : keyv.y;
    let mag = Math.hypot(sx, sy);
    if (mag < D.dead) { mag = 0; sx = sy = 0; }
    else { const k = (mag - D.dead) / (1 - D.dead) / mag; sx *= k; sy *= k; mag = Math.hypot(sx, sy); }

    const w = screenToWorld(sx, sy);
    const wantYaw = mag > 0 ? Math.atan2(w.y, w.x) : yaw;

    /* RAW error against the requested heading, measured nose-forward.
       This is what decides whether the stick is asking for something
       BEHIND the robot, so it must be computed before reverse is
       resolved — the aim error below depends on that answer. */
    const wrap = (a) => { while (a > Math.PI) a -= Math.PI*2;
                          while (a < -Math.PI) a += Math.PI*2; return a; };
    const rawErrDeg = Math.abs(wrap(wantYaw - yaw)) * 180 / Math.PI;

    /* REVERSE. Stick pulled behind the robot while nearly stopped means
       back out, not "execute a standing U-turn you have no turn rate
       for". Without this the speed-sensitive curve deadlocks you against
       the first bench you nose into. */
    const wantsBack = mag > 0 && rawErrDeg > 110;
    if (!reversing && wantsBack && Math.abs(vel) < D.revEnter) reversing = true;
    if (reversing && (!wantsBack || vel > D.revEnter)) reversing = false;

    /* STEERING TARGET, AND WHY REVERSE INVERTS IT. Backing up, the stick
       still names where you want to END UP, but the nose points away
       from travel — so the thing that must be aimed at wantYaw is the
       TAIL: the nose goes to wantYaw + PI. Getting this wrong is not
       cosmetic. A headless run caught reverse steering gated off
       entirely, which backs you out in a dead straight line and cannot
       clear the bench you nosed into — reverse exists to break that
       deadlock, so it has to be able to aim. */
    const aimYaw = reversing ? wantYaw + Math.PI : wantYaw;
    const err = wrap(aimYaw - yaw);
    const errDeg = Math.abs(err) * 180 / Math.PI;

    /* EXACT-180 TIE-BREAK. Dead behind, shortest-arc is undefined and the
       sign alternates frame to frame — the robot shivers instead of
       turning. Latch a direction past latchIn and hold it until the error
       has fallen back under latchOut. */
    if (mag > 0) {
      if (!latchSign && errDeg > D.latchIn) latchSign = err >= 0 ? 1 : -1;
      else if (latchSign && errDeg < D.latchOut) latchSign = 0;
    } else latchSign = 0;

    /* turn rate curve: creep at rest, peak mid-range, wash out at top */
    const sp = Math.abs(vel);
    const t01 = Math.min(1, sp / D.turnVPeak);
    const rise = D.turnCreep + (1 - D.turnCreep) * t01;
    const fall = sp > D.turnVPeak
      ? 1 - (1 - D.turnVWash) * Math.min(1, (sp - D.turnVPeak) / (D.vMax - D.turnVPeak))
      : 1;
    let rate = D.turnMax * rise * fall;

    /* severity scales with how far off you are, so easing the stick over
       is genuinely gentler than slamming it — the property that used to
       live in corner radius now lives in the thumb. */
    const sev = Math.min(1, errDeg / 90);
    const dir = latchSign || Math.sign(err);
    const dYaw = mag > 0
      ? dir * Math.min(Math.abs(err), rate * sev * dt)
      : 0;
    yaw += dYaw;
    while (yaw > Math.PI) yaw -= Math.PI * 2;
    while (yaw < -Math.PI) yaw += Math.PI * 2;

    /* throttle. Forward magnitude is the component of the stick along the
       robot's own heading once it is roughly pointed the right way —
       shoving sideways should turn you, not launch you. */
    const align = mag > 0 ? Math.max(0, Math.cos(err)) : 0;   // err is aim-relative, so this is correct in reverse too
    if (reversing) {
      vel -= D.accel * 0.6 * mag * dt;
      if (vel < -D.vRev) vel = -D.vRev;
    } else if (mag > 0) {
      vel += D.accel * align * mag * dt;
      if (errDeg > 90) vel -= D.brake * 0.5 * dt;   // asking for behind you also sheds speed
      if (vel > D.vMax) vel = D.vMax;
    }
    /* coast-down whenever the stick is not carrying it */
    if (mag === 0 || (!reversing && align === 0)) {
      const s2 = Math.sign(vel);
      vel -= s2 * D.drag * dt;
      if (Math.sign(vel) !== s2) vel = 0;
    }

    px += Math.cos(yaw) * vel * dt;
    py += Math.sin(yaw) * vel * dt;

    /* ---------- tilt ----------
       Yaw rate × speed², which is the honest formula the arc-radius model
       was approximating. Slam the stick over at speed and you go down. */
    const yawRate = dt > 0 ? Math.abs(dYaw) / dt : 0;
    const v01 = Math.abs(vel) / D.vMax;
    const build = D.tiltGain * yawRate * v01 * v01;
    const sgn = dYaw >= 0 ? 1 : -1;
    scene.tilt = (scene.tilt || 0) * (1 - D.tiltDecay * dt) + sgn * build * dt;

    /* curb crossing: an impulse, not a wall. Road is not a fail. */
    const sfc = surfaceAt(px, py);
    if (sfc === 'curb' && lastSfc !== 'curb' && Math.abs(vel) > 0.03) {
      scene.tilt += sgn * 0.10 * (Math.abs(vel) / D.vMax);
    }
    lastSfc = sfc;
    return sfc;
  };

  /* ---------- stamp over the rail pose ---------- */
  const onPost = () => {
    const dt = scene.realDt ? scene.realDt(scene.game.loop.delta) : scene.game.loop.delta;
    scene.pickupWalk = 0;
    if (typeof LOAD_ART !== 'undefined' && scene.runT < LOAD_ART.ms + 1) scene.runT = LOAD_ART.ms + 1;
    scene.botS = S_PIN;

    /* AUTO-RIGHT. A locomotion lab you have to hand-reset every time you
       overcook a turn is a lab you stop using. Tipping still happens and
       still reads — that is the thing being tuned — but the robot picks
       itself back up rather than ending the session. Not a production
       behaviour; the real game's tip is a fail. */
    if (scene.state === 'tipped') {
      rightT += dt;
      if (rightT > 900) {
        rightT = 0; scene.state = 'play';
        scene.roll = 0; scene.pitch = 0; scene.tipT = 0; scene.tipStartRoll = 0;
        scene.tilt = 0; vel = 0; reversing = false; latchSign = 0;
      }
    } else rightT = 0;

    const sfc = (scene.state === 'play') ? step(Math.min(dt, 40)) : lastSfc;

    scene.botX = px; scene.botY = py;
    scene.speed = Math.abs(vel);
    scene.wheelPhase = (scene.wheelPhase || 0) - vel * dt * 0.28;
    if (scene.state !== 'tipped') scene.drawAngle = yaw;

    /* the camera lerps toward a target computed from the rail pose inside
       update(); with the pose stamped after, that target is a frame stale
       and, worse, still leading along the rail's heading. Re-aimed here at
       a lead along the ACTUAL heading. */
    const lead = 95 * Math.max(0, Math.sign(vel));
    const tx = px + Math.cos(yaw) * lead, ty = py + Math.sin(yaw) * lead;
    scene.camX = Phaser.Math.Linear(scene.camX, tx, 0.08);
    scene.camY = Phaser.Math.Linear(scene.camY, ty, 0.06);

    const tag = document.getElementById('owTag');
    if (tag) tag.textContent =
      `OPEN WORLD  ${sfc.toUpperCase()}${reversing ? '  ⟲REV' : ''}  ` +
      `v ${(vel * 1000).toFixed(0)}  tilt ${(scene.tilt || 0).toFixed(2)}`;
  };
  scene.events.on('postupdate', onPost);

  /* ---------- UI ---------- */
  document.getElementById('owUI')?.remove();
  const ui = document.createElement('div');
  ui.id = 'owUI';
  ui.dataset.labPanel = '1';
  ui.style.cssText = 'position:fixed;inset:0;z-index:9990;pointer-events:none';
  ui.innerHTML =
    '<div id="owTag" style="position:absolute;top:10px;left:0;right:0;text-align:center;' +
    'color:#ffb04d;font:700 13px/1 ui-monospace,monospace">OPEN WORLD</div>' +
    '<div id="owRing" style="position:absolute;width:120px;height:120px;margin:-60px 0 0 -60px;' +
    'border:2px solid rgba(255,255,255,.28);border-radius:50%;display:none"></div>' +
    '<div id="owNub" style="position:absolute;width:44px;height:44px;margin:-22px 0 0 -22px;' +
    'border-radius:50%;background:rgba(255,122,26,.85);display:none"></div>' +
    '<button id="owReset" style="pointer-events:auto;position:absolute;right:12px;top:34px;' +
    'padding:8px 12px;border-radius:10px;border:1px solid #4a4a52;background:rgba(20,21,26,.85);' +
    'color:#eee;font:700 12px/1 ui-monospace,monospace">RESET</button>';
  document.body.appendChild(ui);

  const paintStick = () => {
    const ring = document.getElementById('owRing'), nub = document.getElementById('owNub');
    if (!ring || !nub) return;
    ring.style.display = nub.style.display = stick.active ? 'block' : 'none';
    if (!stick.active) return;
    ring.style.left = stick.ox + 'px'; ring.style.top = stick.oy + 'px';
    nub.style.left = (stick.ox + stick.dx) + 'px'; nub.style.top = (stick.oy + stick.dy) + 'px';
  };
  document.getElementById('owReset').onclick = () => {
    px = spawn.x; py = spawn.y; vel = 0; yaw = 0; scene.tilt = 0;
    scene.state = 'play'; scene.roll = 0; scene.pitch = 0; scene.tipT = 0;
  };

  const el = game.canvas;
  el.addEventListener('touchstart', onDown, { passive: true });
  el.addEventListener('touchmove', onMove, { passive: true });
  el.addEventListener('touchend', onUp, { passive: true });
  el.addEventListener('touchcancel', onUp, { passive: true });
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  /* ---------- restore ---------- */
  scene._owRestore = () => {
    scene.events.off('postupdate', onPost);
    el.removeEventListener('touchstart', onDown);
    el.removeEventListener('touchmove', onMove);
    el.removeEventListener('touchend', onUp);
    el.removeEventListener('touchcancel', onUp);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    document.getElementById('owUI')?.remove();
    Object.assign(scene, {
      botS: orig.botS, botX: orig.botX, botY: orig.botY,
      drawAngle: orig.drawAngle, laneOff: orig.laneOff,
      state: orig.state, mode: orig.mode, tilt: orig.tilt,
    });
    Object.assign(r, {
      hazards: orig.hazards, props: orig.props, crossings: orig.crossings,
      loop: orig.loop, doorS: orig.doorS, parMs: orig.parMs, challenge: orig.challenge,
    });
    delete scene._owRestore;
  };

  scene._owAPI = { D, surfaceAt, pose: () => ({ px, py, yaw, vel, reversing }) };
  console.log('open-world: free locomotion live — stick left half, RESET top-right');
})();
