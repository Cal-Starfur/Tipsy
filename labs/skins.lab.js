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
  }
};

/* Register into the live game. SKIN_PALETTES is a const OBJECT — the binding
   is fixed, the contents are not — so this is a legal mutation inside the
   game's own realm and every consumer (tpApplySkin, tpSkinSwatchColors,
   tpRobotSvg) picks the new entries up with no further wiring. */
Object.assign(SKIN_PALETTES, PAL);

/* Order the picker walks. "classic" maps to null => stock SKIN_BASE. */
const ORDER = ["classic","sunset-cruiser","neon-courier","chrome-plate",
               "palm-camo","gold-rush","fire-chief","daredevil","cone-dodger"];

function nameOf(id){
  const s = (typeof TP_SKINS !== "undefined") && TP_SKINS.find(x=>x.skinId===id);
  return s ? s.displayName : id;
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
  const hex = v => "0x" + v.toString(16).padStart(6,"0");
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
                   hide(){ const b=document.getElementById("__skinlab"); if(b) b.remove(); } };
mount();
console.log("SKINLAB up — " + Object.keys(PAL).length + " new palettes registered, " +
            ORDER.length + " total. SKINLAB.dump() for the port block.");

})();
