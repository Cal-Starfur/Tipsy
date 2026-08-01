/* ============================================================================
   SKINS — lab
   Prototyped in labs/_bench.html against the live game.

   WHAT THIS FIXES
   TP_SKINS lists nine skins. Three of them are real: "classic" is SKIN_BASE,
   and fire-chief / daredevil have actual palettes (HJ_CHIEF, HJ_DARE) wired
   into SKIN_PALETTES. The other SIX carried nothing but a CSS `filter` string
   for the store swatch — so equipping Neon Courier changed a badge and left
   the robot stock white. This lab authors the six missing palettes.

   WHY A PALETTE IS THE WHOLE SKIN
   Every robot draw call reads SKIN.* — 21 keys, no geometry anywhere. A skin
   is an override object over SKIN_BASE and nothing else. tpApplySkin() already
   strips any key not in SKIN_BASE before repainting, so the two optional
   extras (stripe2/stripe2Dk, stars) are safe to add per-skin and unset
   themselves on the way out.

   HEADING GATE
   Nothing new is drawn here — these ride the robot's existing hulls, which
   already pass f0/f1/f2/f3. The gate still applies to the READ: a strong
   bodyTop/bodyRight/bodyLeft value split is what sells chrome and camo, and
   the split reads differently at each quarter. Cycle all 4 on every skin.

   PORT
   Copy PAL below into game/index.html next to HJ_CHIEF / HJ_DARE, then extend
   the SKIN_PALETTES literal. Nothing else changes — the store, the swatches
   (tpRobotSvg reads SKIN_PALETTES and drops the CSS filter automatically once
   a palette exists), and the equip flow are all already built.

   Re-runnable: everything lives on window.SKINLAB, no top-level const.
   ============================================================================ */

(function(){

/* ---------- the six missing palettes ----------
   Keys omitted inherit SKIN_BASE. Each entry overrides only what the livery
   actually changes, same discipline HJ_CHIEF uses. */
const PAL = {

  /* SUNSET CRUISER — warm palm-gold plating for evening runs.
     The sunset itself is the three bands top to bottom: gold hull, coral
     stripe, deep magenta under it. */
  "sunset-cruiser": {
    bodyTop:0xf2b45c, bodyRight:0xd98f3a, bodyLeft:0xa8642a, outline:0x3a2214,
    stripe:0xe0554a, stripeDk:0xb03a33,
    stripe2:0x8e3d6b, stripe2Dk:0x662a4e,
    lidInner:0xf7e0b0, belly:0x5a3a22,
    wheelHubFace:0x8a4a22, wheelHub:0xf2c76a,
    eye:0xffd28a, flag:0xff9b3d, flagPole:0x8a4a22
  },

  /* NEON COURIER — high-visibility violet livery, city-night ready.
     Deep violet hull so the two neon bands have something dark to sit on.
     The eye is the brightest thing on the model, which is the point at night —
     drawRobot already re-lights SKIN.eye into gGlow on night routes. */
  "neon-courier": {
    bodyTop:0x5b32c4, bodyRight:0x46259c, bodyLeft:0x2f1870, outline:0x14092e,
    stripe:0x24f0d6, stripeDk:0x14a894,
    stripe2:0xff3ea5, stripe2Dk:0xc41f78,
    lidInner:0x8f6cf0, belly:0x1a0d3a, visor:0x140a2e,
    wheelHubFace:0x2f1870, wheelHub:0x24f0d6,
    eye:0x6cffe8, eyeAlert:0xff3ea5,
    flag:0x24f0d6, flagPole:0x2f1870
  },

  /* CHROME PLATE — mirror-polish finish, premium.
     There is no gradient available: three flat faces are all a hull gets. What
     reads as chrome is the VALUE SPREAD between them — near-white top against
     a mid-slate right and a genuinely dark left. Stock's spread is small
     (f7/e3/c9); this one is deliberately wide (f4/b9/6f), and that widening is
     the entire effect. The gold pinstripe is the "premium, and it shows" part. */
  "chrome-plate": {
    bodyTop:0xf4f7fb, bodyRight:0xb9c2ce, bodyLeft:0x6f7b8a, outline:0x232830,
    stripe:0x2b303a, stripeDk:0x161a21,
    stripe2:0xd9c07a, stripe2Dk:0xa8913f,
    lidInner:0xdde3ea, belly:0x2b303a,
    wheelHubFace:0x8b95a3, wheelHub:0xe8eef5,
    eye:0xcfefff,
    flag:0xdfe6ee, flagPole:0x8b95a3
  },

  /* PALM CAMO — earned, not bought. Blends into every Oasis block.
     Camo needs more than one green in play at once. The three hull faces plus
     the two bands give five tones, which is enough to read as a pattern
     instead of a flat olive. */
  "palm-camo": {
    bodyTop:0x7d8f52, bodyRight:0x5e7040, bodyLeft:0x3f4d2b, outline:0x222a17,
    stripe:0xa8ab6d, stripeDk:0x83864f,
    stripe2:0x3f4d2b, stripe2Dk:0x2b3520,
    lidInner:0xa8ab6d, belly:0x2b3520,
    wheelHubFace:0x3f4d2b, wheelHub:0x7d8f52,
    eye:0xc8e08a,
    flag:0x8fae4a, flagPole:0x3f4d2b
  },

  /* GOLD RUSH — for players who never miss a pickup.
     Deliberately NO stars. Stars are Daredevil's one exclusive and the gold
     trophy skin should not borrow the flagship's signature. Gold reads here
     through the dark band underneath it, not through added ornament. */
  "gold-rush": {
    bodyTop:0xf5cf4e, bodyRight:0xd8a828, bodyLeft:0xa87b16, outline:0x3a2a08,
    stripe:0x2a2418, stripeDk:0x191408,
    lidInner:0xfae79a, belly:0x4a3a10,
    wheelHubFace:0x6b5210, wheelHub:0xf5cf4e,
    eye:0xfff0a8,
    flag:0xf5cf4e, flagPole:0x6b5210
  },

  /* CONE DODGER — high-viz paint to match the cones it weaves through.
     Traffic orange straight off the CONE constant (body:0xff7a1a) so the skin
     and the hazard it is named for are the same color family, with a
     white-over-black hazard band. */
  "cone-dodger": {
    bodyTop:0xff8a2a, bodyRight:0xe06a10, bodyLeft:0xa84a08, outline:0x3a1c05,
    stripe:0xf4f2ec, stripeDk:0xcfccc2,
    stripe2:0x1e1a16, stripe2Dk:0x0f0d0a,
    lidInner:0xf4f2ec, belly:0x3a1c05,
    wheelHubFace:0x3a1c05, wheelHub:0xff8a2a,
    eye:0xfff0d0, eyeAlert:0xffffff,
    flag:0xf4f2ec, flagPole:0x3a1c05
  },

  /* PORCH PIRATE — the package thief, wearing it proudly.
     Weathered black hull, bone stripe, dried-blood band, brass hardware.

     Two gated extras beyond the palette, both explained at their draw code:
       jolly       -- swaps the pennant for a black flag with a bone X
       emblem:"skull" -- puts a skull-and-crossbones on the hull side faces

     `stars` is set too, and it is NOT decoration: it is the GATE. drawRobot
     calls drawStripeStars(bobZ) only `if(SKIN.stars)`, and that call sits at
     exactly the right point in the draw order — after the body and stripe,
     before the lid and visor. Riding that existing hook is why the skull
     needs no change to drawRobot at all. */
  "porch-pirate": {
    bodyTop:0x3a3a42, bodyRight:0x2b2b33, bodyLeft:0x1c1c22, outline:0x0d0d11,
    stripe:0xd9cdb0, stripeDk:0xb0a488,
    stripe2:0x8c1c1c, stripe2Dk:0x5e1111,
    lidInner:0xd9cdb0, belly:0x141419, visor:0x121218,
    cavityWall:0x2b2b33, cavityFloor:0x1c1c22,
    wheelHubFace:0x5a4a2a, wheelHub:0xc9a349,
    eye:0xffd24a, eyeAlert:0xff5a3c,
    flag:0x14141a, flagPole:0xc9a349,
    stars:0xe8e2d0, emblem:"skull", emblemDark:0x101014, jolly:true
  }
};

/* Register into the live game. SKIN_PALETTES is a const OBJECT — the binding
   is fixed, the contents are not — so this is a legal mutation inside the
   game's own realm and every consumer (tpApplySkin, tpSkinSwatchColors,
   tpRobotSvg) picks the new entries up with no further wiring. */
Object.assign(SKIN_PALETTES, PAL);

/* Order the picker walks. "classic" maps to null => stock SKIN_BASE. */
const ORDER = ["classic","sunset-cruiser","neon-courier","chrome-plate",
               "palm-camo","gold-rush","fire-chief","daredevil","cone-dodger",
               "porch-pirate"];

/* Porch Pirate has no TP_SKINS row yet — the store is defined in
   game/index.html and this lab does not touch it. Push a session-only entry so
   the picker can name it and the store swatch can be reviewed alongside the
   rest. OPEN: unlock type. Listed as a purchase here purely as a placeholder;
   a thief skin arguably wants a cheeky achievement instead, and that is a
   design call, not a technical one. */
if(typeof TP_SKINS !== "undefined" && !TP_SKINS.some(s=>s.skinId==="porch-pirate")){
  TP_SKINS.push({ skinId:"porch-pirate", displayName:"Porch Pirate",
    unlockType:"purchase", priceCents:2000, filter:"none",
    desc:"Flies the black flag. The package was already on the porch." });
}

function nameOf(id){
  const s = (typeof TP_SKINS !== "undefined") && TP_SKINS.find(x=>x.skinId===id);
  return s ? s.displayName : id;
}

/* ============================================================================
   GATED EXTRAS — skull emblem + jolly roger
   Both are installed by REPLACING an existing method and delegating to the
   original whenever the gate is off, so every other skin is byte-identical to
   before. Idempotent: the original is captured once and stashed on the scene.
   ============================================================================ */

/* SKULL AND CROSSBONES on the two hull SIDE faces.
   Same face-normal backface test drawBox uses, so it can never paint onto a
   face pointing away from the camera at any heading. */
function drawSkullEmblem(sc, bobZ){
  const g  = sc.g;
  const hy = BODY.hy + 0.8;
  /* zc/R are set by the CLEARANCE, not by taste. The body spans z 14..54 and
     the stripe band occupies 20..27. The crossbones are the lowest thing here
     — their tips fall to zc - R*1.9*sin(0.62) — so at the obvious values
     (zc 33, R 6.4) they reach 17.6 and run straight through the stripe. On
     this skin the stripe is bone-coloured, so the emblem would have dissolved
     into it. These values put the tips at 28.3 and the cranium top at 43.6:
     clear of the stripe below, clear of the lid seam above. */
  const zc = 37 + (bobZ || 0);
  const col  = SKIN.stars || 0xe8e2d0;
  const dark = SKIN.emblemDark || 0x101014;
  const R = 5.4;

  /* SIDES ONLY. Front (+x) carries the visor and headlight bar; back (-x) is
     dropped by choice — the skull is a livery mark, and a mark on every panel
     but one reads as wallpaper rather than as a badge. The two long sides are
     also the faces the iso camera actually presents at every heading, so this
     costs nothing at any of f0-f3.

     The tangent on each face is chosen so tangent x normal points up. That is
     what keeps the skull from rendering MIRRORED on the face whose normal runs
     negative — exactly the class of bug the four-heading gate exists for. */
  const faces = [
    { n:{x:0,y: 1,z:0}, at:(s,z)=>[ -s,  hy, z] },
    { n:{x:0,y:-1,z:0}, at:(s,z)=>[  s, -hy, z] }
  ];

  for(const fc of faces){
    const w = sc.R(fc.n.x, fc.n.y, fc.n.z);
    if((w.x + w.y + w.z) <= 0) continue;
    const P    = (s,z) => { const q = fc.at(s,z); return sc.P(q[0], q[1], q[2]); };
    const poly = pts => pts.map(p => P(p[0], p[1]));
    const disc = (cs, cz, r, n) => {
      const o = [];
      for(let k=0;k<n;k++){ const a = k/n*Math.PI*2;
        o.push(P(cs + Math.cos(a)*r, cz + Math.sin(a)*r)); }
      return o;
    };

    /* crossbones first — they sit BEHIND the skull */
    for(const sgn of [1,-1]){
      const ang = sgn*0.62, ca = Math.cos(ang), sa = Math.sin(ang);
      const L = R*1.9, Wd = R*0.22, bz = zc - R*0.5;
      const bar = [[-L,-Wd],[L,-Wd],[L,Wd],[-L,Wd]]
        .map(([a,b]) => [a*ca - b*sa, bz + a*sa + b*ca]);
      sc.quadOn(g, poly(bar), col);
      /* the knobbed ends that make a bone read as a bone */
      for(const e of [-1,1])
        for(const o of [-1,1])
          sc.quadOn(g, disc((e*L - o*Wd*0.9)*ca - (o*Wd*1.5)*sa,
                            bz + (e*L - o*Wd*0.9)*sa + (o*Wd*1.5)*ca,
                            Wd*1.6, 7), col);
    }

    /* cranium + jaw */
    sc.quadOn(g, disc(0, zc + R*0.30, R*0.92, 14), col);
    sc.quadOn(g, poly([[-R*0.52, zc - R*0.72], [R*0.52, zc - R*0.72],
                       [ R*0.74, zc + R*0.28], [-R*0.74, zc + R*0.28]]), col);

    /* sockets + nasal cavity */
    for(const e of [-1,1]) sc.quadOn(g, disc(e*R*0.40, zc + R*0.40, R*0.29, 9), dark);
    sc.quadOn(g, poly([[0, zc - R*0.02], [R*0.16, zc + R*0.20],
                       [-R*0.16, zc + R*0.20]]), dark);
    /* teeth: two gaps cut into the jaw */
    for(const e of [-1,1])
      sc.quadOn(g, poly([[e*R*0.20 - R*0.05, zc - R*0.70],
                         [e*R*0.20 + R*0.05, zc - R*0.70],
                         [e*R*0.20 + R*0.05, zc - R*0.28],
                         [e*R*0.20 - R*0.05, zc - R*0.28]]), dark);
  }
}

/* JOLLY ROGER.
   The stock pennant is a ~11x20 SCREEN-pixel triangle that kScale() shrinks
   further with depth. A skull drawn there is three pixels of mush, so the flag
   carries a bone X instead — an X still reads at that size and a skull does
   not. The skull lives on the hull, where there is room for it.

   This also changes the flag's geometry for this skin: the stock pennant
   extends ABOVE the pole tip, which is why it reads as a streamer. A real flag
   hangs off the pole, so this one runs outward along the perpendicular and
   downward along the pole. */
function drawJollyRoger(sc, bobZ){
  const g = sc.g;
  const L = FLAG.z1 - FLAG.z0;
  const bend = sc.flagLean*0.5 + sc.tipT*0.7*(sc.tipDir || 1);
  const seg = 6, pts = [];
  for(let i=0;i<=seg;i++){
    const s = i/seg, a = bend*s;
    pts.push(sc.P(FLAG.base.x,
                  FLAG.base.y - Math.sin(a)*L*s,
                  FLAG.z0 + Math.cos(a)*L*s + bobZ));
  }
  const ks = sc.kScale();
  g.lineStyle(Math.max(1, 3*ks), SKIN.flagPole, 1);
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for(let i=1;i<=seg;i++) g.lineTo(pts[i].x, pts[i].y);
  g.strokePath();

  const p = pts[seg], q = pts[seg-1];
  let dx = p.x - q.x, dy = p.y - q.y;
  const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;   // up the pole
  const ux = -dy, uy = dx;                                   // out from it
  const Wf = 21*ks, Hf = 14*ks;
  const c = (a,b) => ({ x: p.x + ux*a + dx*b, y: p.y + uy*a + dy*b });
  const A = c(0,0), B = c(Wf,0), C = c(Wf,-Hf), D = c(0,-Hf);
  g.fillStyle(SKIN.flag, 1);
  g.fillTriangle(A.x,A.y,B.x,B.y,C.x,C.y);
  g.fillTriangle(A.x,A.y,C.x,C.y,D.x,D.y);

  /* the bone X, drawn as two thin quads corner to corner */
  const bone = SKIN.stars || 0xe8e2d0;
  const bar = (P0,P1) => {
    let vx = P1.x-P0.x, vy = P1.y-P0.y;
    const vl = Math.hypot(vx,vy) || 1; vx/=vl; vy/=vl;
    const nx = -vy*1.5*ks, ny = vx*1.5*ks;
    g.fillStyle(bone, 1);
    g.fillTriangle(P0.x+nx,P0.y+ny, P1.x+nx,P1.y+ny, P1.x-nx,P1.y-ny);
    g.fillTriangle(P0.x+nx,P0.y+ny, P1.x-nx,P1.y-ny, P0.x-nx,P0.y-ny);
  };
  bar(c(2*ks,-2*ks), c(Wf-2*ks,-Hf+2*ks));
  bar(c(2*ks,-Hf+2*ks), c(Wf-2*ks,-2*ks));
}

function installExtras(){
  const sc = game.scene.scenes[0];
  if(!sc.__skinlabPatched){
    sc.__skinlabStars = sc.drawStripeStars.bind(sc);
    sc.__skinlabFlag  = sc.drawFlag.bind(sc);
    sc.__skinlabPatched = true;
  }
  /* PORT NOTE: at port time this becomes a shape switch inside
     drawStripeStars itself (renamed drawHullEmblem), not a wrapper. */
  sc.drawStripeStars = function(bobZ){
    if(SKIN.emblem === "skull") return drawSkullEmblem(sc, bobZ);
    return sc.__skinlabStars(bobZ);
  };
  sc.drawFlag = function(bobZ){
    if(SKIN.jolly) return drawJollyRoger(sc, bobZ);
    return sc.__skinlabFlag(bobZ);
  };
}

/* ---------- preview, not equip ----------
   set() paints SKIN directly and does NOT touch tpProfile. Equipping would
   write an owned/equipped skin into saved profile storage just from looking at
   it in the bench, which would corrupt real progression state on the device
   doing the reviewing. Preview only; tpEquipSkin stays the game's job. */
function set(id){
  for(const k of Object.keys(SKIN)) if(!(k in SKIN_BASE)) delete SKIN[k];
  Object.assign(SKIN, SKIN_BASE, SKIN_PALETTES[id] || {});
  SKINLAB.current = id;
  paintBar();
}
function next(d){
  const i = ORDER.indexOf(SKINLAB.current);
  set(ORDER[(i + (d||1) + ORDER.length) % ORDER.length]);
}

/* ---------- the port artifact ----------
   Emits PAL as a paste-ready block for game/index.html. The whole reason to
   dial colors in the bench is to walk out with the literal, not a screenshot. */
function dump(){
  /* Porch Pirate carries non-numeric keys (emblem:"skull", jolly:true), so a
     blind toString(16) would emit garbage for exactly the skin most likely to
     be re-tuned. */
  const hex = v => typeof v === "number"
    ? "0x" + v.toString(16).padStart(6,"0")
    : JSON.stringify(v);
  let out = "";
  for(const id of Object.keys(PAL)){
    out += "/* " + nameOf(id) + " */\nconst SK_" +
           id.toUpperCase().replace(/-/g,"_") + " = {\n";
    const e = Object.entries(PAL[id]);
    out += e.map(([k,v]) => "  " + k + ":" + hex(v)).join(", ") + "\n};\n\n";
  }
  out += "// extend SKIN_PALETTES with:\n" +
         Object.keys(PAL).map(id => '  "' + id + '": SK_' +
           id.toUpperCase().replace(/-/g,"_")).join(",\n");
  console.log(out);
  return out;
}

/* ---------- picker overlay ----------
   Lives in the game document above the canvas. The bench rail is a scroll away
   on a phone; a skin review is dozens of taps, so the control belongs on the
   stage next to the thing it changes. */
function paintBar(){
  const bar = document.getElementById("__skinlab");
  if(!bar) return;
  [...bar.querySelectorAll("[data-skin]")].forEach(b=>{
    const on = b.dataset.skin === SKINLAB.current;
    b.style.background = on ? "#ff7a1a" : "#1b1a18";
    b.style.color      = on ? "#101010" : "#d8d4cc";
    b.style.borderColor = on ? "#ff7a1a" : "#3a3630";
  });
}
function mount(){
  const old = document.getElementById("__skinlab");
  if(old) old.remove();
  const bar = document.createElement("div");
  bar.id = "__skinlab";
  bar.style.cssText =
    "position:fixed;left:0;right:0;bottom:0;z-index:99999;display:flex;" +
    "flex-wrap:wrap;gap:4px;padding:6px;background:rgba(12,11,10,.88);" +
    "font:600 11px/1 system-ui,-apple-system,sans-serif;" +
    "-webkit-user-select:none;user-select:none";
  const mk = (label, fn, skin) => {
    const b = document.createElement("button");
    b.textContent = label;
    if(skin) b.dataset.skin = skin;
    b.style.cssText =
      "flex:1 1 auto;min-width:76px;min-height:30px;padding:5px 7px;" +
      "border:1px solid #3a3630;border-radius:5px;background:#1b1a18;" +
      "color:#d8d4cc;font:inherit";
    /* pointerdown, not click: Phaser swallows the tap on iOS often enough
       that a click-bound picker feels broken on device */
    b.addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); fn(); });
    bar.appendChild(b);
    return b;
  };
  for(const id of ORDER) mk(nameOf(id), () => set(id), id);
  mk("‹ prev", () => next(-1));
  mk("next ›", () => next(1));
  mk("dump", dump);
  document.body.appendChild(bar);
  paintBar();
}

window.SKINLAB = { PAL, ORDER, current:"classic", set, next, dump, mount,
                   installExtras,
                   hide(){ const b=document.getElementById("__skinlab"); if(b) b.remove(); } };
installExtras();
mount();
console.log("SKINLAB up — " + Object.keys(PAL).length + " palettes registered, " +
            ORDER.length + " total. SKINLAB.dump() for the port block.");

})();
