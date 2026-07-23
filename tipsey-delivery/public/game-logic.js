"use strict";

/* Reddit/Devvit build only ever plays the daily map — a synchronous
   query-param flag lets us hide the Today/Random Day selector before
   the title screen ever paints, and drives the leaderboard swap below.
   Standalone GitHub Pages / itch.io builds never carry this param, so
   they're unaffected. */
const IS_DEVVIT_BUILD = true; // hardcoded — this file is only ever served by Devvit
if(IS_DEVVIT_BUILD){ hide("panel"); hide("panelToggle"); }

/* ---------- Devvit bridge (optional) ----------
   On the Devvit build, swaps the daily-best leaderboard's persistence
   from localStorage to the tipsey-delivery server's Redis-backed
   api/tipsy/best endpoint (src/server/server.ts + db.ts in the
   tipsey-delivery/ Devvit project) via plain fetch — no postMessage,
   no envelope unwrapping, since Devvit Web webviews can just hit their
   own server directly. The server keys the record off its own UTC
   "today", not a client-supplied dateStr — reroll is unreachable here
   (panel's hidden above), so there's never a legitimate reason for the
   Devvit build to ask about any date but today, and not trusting a
   client-supplied date closes off a spoofing angle for free.
   tipsyBridge.active is set synchronously from IS_DEVVIT_BUILD (unlike
   the old postMessage version, which only flipped true after a round
   trip reply) — showWin() no longer has to guess whether a reply is
   still in flight. requestDailyBest() is called once per
   loadRoute(dateStr) (see loadRoute). Standalone GitHub Pages / itch.io
   builds never call fetch() here at all and fall straight back to
   localStorage, same as before this bridge existed. */
const tipsyBridge = { active: IS_DEVVIT_BUILD, best: {} };
function requestDailyBest(dateStr){
  if(!IS_DEVVIT_BUILD) return;
  fetch("api/tipsy/best", { headers: { Accept: "application/json" } })
    .then(rsp => rsp.ok ? rsp.json() : null)
    .then(data => { if(data) tipsyBridge.best[dateStr] = data.best || null; })
    .catch(()=>{});
}
/* ============================================================
   TIP — Route Lab
   One address a day. A real-LA-neighborhood roster drives a
   seeded procedural street: hilliness, pavement quality, and
   scooter litter are per-neighborhood knobs. Same date = same
   street for every player. Difficulty is always framed as
   INFRASTRUCTURE (pavement, litter, grades) — never residents.
   ============================================================ */

/* ---------- COSTA PALMA: a fictional city that is legally distinct from
   any city where a burrito has ever hit the pavement ----------
   hill: grade intensity · pave: pavement quality (1=smooth)
   litter: scooters/trash density · palms: set dressing */
/* ---------- shop taxonomy + typed menus ----------
   The city has 36 pickup shops and only ONE sells tacos — yet every
   order was Mexican (on-device). Each shop name classifies by keyword
   into one of 8 types; each type gets its own menu; and each menu item
   carries its SPILL kinds, because the spill is now the actual order
   hitting the pavement (see spillCargo): books outside Lantern Books,
   rolling apples outside the markets, a pizza box shedding slices
   outside Provost. [name, price, spillKinds[]] */
function shopTypeOf(name){
  const n = (name || "").toLowerCase();
  if(n.includes("taco")) return "tacos";
  if(n.includes("coffee") || n.includes("cafe")) return "coffee";
  if(n.includes("bakery")) return "bakery";
  if(n.includes("deli") || n.includes("diner")) return "deli";
  if(n.includes("pizza")) return "pizza";
  if(n.includes("creamery")) return "creamery";
  if(n.includes("market") || n.includes("provisions") || n.includes("grocer") || n.includes("pantry")) return "grocery";
  return "retail";   // hardware, books, stationery, bike, surf — goods
}
const SHOP_MENUS = {
  tacos: [
    ["burrito", 11, ["burrito"]], ["tacos al pastor", 9.5, ["taco","taco"]],
    ["torta", 10, ["sandwich"]], ["quesadilla", 8.5, ["taco"]],
    ["carne asada fries", 7.5, ["fry","fry","fry"]], ["elote", 4.5, ["burrito"]],
    ["horchata", 3.75, ["cup"]], ["agua fresca", 3.25, ["cup"]],
  ],
  coffee: [
    ["latte", 4.75, ["cup"]], ["cold brew", 4.25, ["cup"]], ["espresso", 3.25, ["cup"]],
    ["croissant", 3.75, ["croissant"]], ["muffin", 3.5, ["donut"]], ["bagel", 2.75, ["donut"]],
  ],
  bakery: [
    ["sourdough loaf", 7, ["loaf"]], ["baguette", 4.5, ["loaf"]],
    ["croissant", 3.75, ["croissant"]], ["half-dozen donuts", 8, ["donut","donut","donut"]],
    ["birthday cake", 24, ["pizzabox"]],
  ],
  deli: [
    ["club sandwich", 9, ["sandwich"]], ["pastrami on rye", 12, ["sandwich"]],
    ["soup of the day", 6, ["cup"]], ["fries", 4.5, ["fry","fry","fry"]],
    ["milkshake", 5.5, ["cup"]],
  ],
  pizza: [
    ["large pepperoni", 18, ["pizzabox","slice","slice"]], ["slice", 4, ["slice"]],
    ["garlic knots", 6, ["donut","donut"]], ["2-liter soda", 3.5, ["cup"]],
  ],
  creamery: [
    ["double scoop", 5.5, ["cone"]], ["pint of strawberry", 7, ["pint"]], ["sundae", 6.5, ["cup"]],
  ],
  grocery: [
    ["apples", 4, ["apple","apple","apple"]], ["milk", 3.5, ["milk"]],
    ["dozen eggs", 5, ["eggs"]], ["produce bag", 9, ["apple","apple","milk"]],
    ["orange juice", 4.5, ["milk"]],
  ],
  retail: [
    ["parcel", 22, ["parcel"]], ["used books", 12, ["book","book"]],
    ["paint, one gallon", 19, ["paintcan"]], ["replacement parts", 25, ["parcel"]],
    ["stationery bundle", 14, ["parcel"]],
  ],
};

const HOODS = [
  { n:"The Flats",       hill:0.0, pave:0.9, litter:0.2, palms:0.9, streets:["Palmline Ave","Pelican St","Marina Way"], parks:["Pelican","Driftwood","Marina","Tidewater","Sandpiper","Cove","Seabreeze","Lagoon","Estuary","Harbor Seal"], shops:["Pelican Coffee","Marina Provisions","Driftwood Deli"] },
  { n:"Boardwalk",       hill:0.0, pave:0.6, litter:1.0, palms:1.0, streets:["Pier Ave","Saltbox Ln","Tide St"], parks:["Tide Pool","Carousel","Salt Air","Arcade","Ferris","Shoreline","Funhouse","Taffy","Pier's End","Sun Deck"], shops:["Tide Pool Tacos","Carousel Creamery","Salt Air Surf Shop"] },
  { n:"Old Town",        hill:0.2, pave:0.2, litter:0.4, palms:0.4, streets:["Founders St","Cobble Ct","Lantern Row"], parks:["Founders","Lantern","Ivy","Cobblestone","Heritage","Chapel","Brickyard","Archway","Old Bell","Cornerstone"], shops:["Founders Hardware","Lantern Books","Cobblestone Bakery"] },
  { n:"Scooter Row",     hill:0.1, pave:0.5, litter:1.0, palms:0.6, streets:["Beryl Ave","Kickstand St","Charger Way"], parks:["Volt","Spoke & Wheel","Recharge","Throttle","Gearhead","Battery","Piston","Ignition","Rev","Torque"], shops:["Volt Bike Co.","Kickstand Cafe","Charger Depot"] },
  { n:"University",      hill:0.2, pave:0.7, litter:0.7, palms:0.5, streets:["Campus Loop","Quad St","Provost Ave"], parks:["The Quad","Provost","Scholars","Bell Tower","Ivy League","Commencement","Lecture Hall","Dean's","Alumni","Sophomore"], shops:["Quad Coffee","Provost Pizza","Scholars Stationery"] },
  { n:"Warehouse Dist.", hill:0.0, pave:0.3, litter:0.6, palms:0.1, streets:["Freight St","Dock Ave","Pallet Way"], parks:["Sparrow","Crate","Rustwater","Loading Dock","Silo","Gantry","Forklift","Cargo","Freighter","Depot"], shops:["Freight Diner","Dockside Hardware","Pallet Coffee Co."] },
  { n:"Sunset Terrace",  hill:0.6, pave:0.7, litter:0.3, palms:0.8, streets:["Terrace Dr","Vista Ct","Golden Steps"], parks:["Golden Hour","Vista","Amber","Sundial","Horizon","Dusk","Twilight","Marigold","Copper Sky","Afterglow"], shops:["Golden Hour Bakery","Vista Market","Terrace Coffee"] },
  { n:"The Bluffs",      hill:1.0, pave:0.6, litter:0.2, palms:0.5, streets:["Switchback Rd","Crestline Dr","Ladder St"], parks:["Overlook","Crestline","Windward","Precipice","Eagle's Nest","Ridge","Cliffside","Updraft","Timberline","Vantage"], shops:["Crestline Cafe","Overlook Market","Switchback Coffee"] },
  { n:"Meridian Hts.",   hill:0.8, pave:0.5, litter:0.4, palms:0.5, streets:["Meridian Ave","Summit Walk","Cable Ct"], parks:["Summit","Cable Car","Highline","Zenith","Alpine","Skyline","Ascent","Peak","Tramline","Overhead"], shops:["Summit Bakery","Cable Car Diner","Highline Market"] },
  { n:"Market Dist.",    hill:0.1, pave:0.5, litter:0.7, palms:0.4, streets:["Stall St","Grocer Ave","Crate Ln"], parks:["Grocers","Barrel","Peddlers","Bazaar","Spice","Vendor's","Stallkeeper's","Basket","Farmstand","Tradewind"], shops:["Grocer's Corner","Barrel & Stall Deli","Peddler's Pantry"] },
  { n:"Little Harbor",   hill:0.3, pave:0.6, litter:0.5, palms:0.7, streets:["Wharf St","Anchor Ave","Gull Ct"], parks:["Anchor","Gull Point","Fishmongers","Lighthouse","Tidewater","Skipper's","Buoy","Netmender's","Harbor Master's","Sailmaker's"], shops:["Anchor Diner","Gull Point Bakery","Wharfside Coffee"] },
  { n:"Palm Gardens",    hill:0.2, pave:0.8, litter:0.3, palms:1.0, streets:["Frond Ave","Coconut Ct","Shade St"], parks:["Frond","Coconut Grove","Shade","Palmetto","Oasis","Tropic","Banyan","Hibiscus","Canopy","Sunfern"], shops:["Frond Cafe","Coconut Grove Deli","Shade Market"] },
];

/* ---------- deterministic rng ---------- */
function hashStr(s){ let h = 1779033703; for(let i=0;i<s.length;i++){ h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); } return h >>> 0; }
function convexHull(pts){
  const P2 = pts.slice().sort((a,b) => a.x - b.x || a.y - b.y);
  const cross = (o, a, b) => (a.x-o.x)*(b.y-o.y) - (a.y-o.y)*(b.x-o.x);
  const lo = [], hi = [];
  for(const p of P2){
    while(lo.length >= 2 && cross(lo[lo.length-2], lo[lo.length-1], p) <= 0) lo.pop();
    lo.push(p);
  }
  for(let i = P2.length-1; i >= 0; i--){
    const p = P2[i];
    while(hi.length >= 2 && cross(hi[hi.length-2], hi[hi.length-1], p) <= 0) hi.pop();
    hi.push(p);
  }
  lo.pop(); hi.pop();
  return lo.concat(hi);
}
function mulberry32(a){ return function(){ a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* ---------- the daily generator ---------- */
/* ---------- routes now TURN: legs in 4 compass directions ----------
   The player never steers; Tipsy follows the route line and auto-turns
   through fillet arcs at corners. Corners are a tilt source. */
const DIRV = [{x:1,y:0},{x:0,y:1},{x:-1,y:0},{x:0,y:-1}];

/* HEADING EXCEPTIONS — the only place a genuine per-f special case is
   allowed to live. Everything that draws a shape (props, people, the
   robot, the car) goes through one shared rotation and must never
   hand-branch on f/fdir/heading itself. These two are real exceptions,
   not shortcuts: they're about the fixed iso camera and the robot's
   fixed sidewalk lane, which really do treat one or two headings
   differently. Four slots per table, indexed by f (0..3) — most
   entries are null/false. Editing one slot can't touch another: these
   are separate array entries, not branches tangled through a shared
   function. */

/* f===1 cuts the near block's WEST edge (3); f===2 cuts its NORTH
   edge (0) — the only two travel directions where this fixed iso
   camera's height-lift can push a nearby block's wall over the
   robot's own screen position. See the block-wrap cutaway below. */
const NORTH_WALL_CUT_EDGE = [null, 3, 0, null];

/* f===0/f===3 are the two directions the cutaway above never
   touches — the only legs safe to place a door/pickup on. See
   findGoodS. */
const GOOD_LEG_HEADING = [true, false, false, true];

/* approved palm (palm lab, 2026-07-07): the Costa Palma house style */
const PALM = {
  height: 165, fronds: 8, droop: 1.0, wind: 1.0, trunkLean: 0.16,
  trunk: 0x8a6a48, trunkDk: 0x6f5439, ring: 0x7a5c40,
  frondA: 0x4e8f4a, frondB: 0x3f7a3e,
  coco: 0x6b4f33, cocoHi: 0x7d5e40, shadow: 0x000000
};
const PALM_DWARF = {   // approved in palm lab: bush-type dwarf palm
  height: 55, fronds: 8, droop: 0.3, wind: 0.3, spread: 1.0, trunkLean: 0.16,
  trunk: 0x8a6a48, trunkDk: 0x6f5439, ring: 0x7a5c40,
  frondA: 0x4e8f4a, frondB: 0x3f7a3e,
  coco: 0x6b4f33, cocoHi: 0x7d5e40, shadow: 0x000000
};

/* approved heaved slab (ramp lab v2): prop.ramp's redesign into a single
   sidewalk tile — root-heaved panel, lifted along one side edge */
const SLAB_ART = {
  top: 0xc4bdae, topDk: 0x9d9687, gap: 0x4a4238,
  rootA: 0x8a6a48, rootB: 0x6f5439
};

/* approved crack (crack lab v3): broken-off piece (spall) */
const CRACK_ART = {
  sidewalk: { crack:0x5d574c, core:0x453f36, piece:0xa89f8f, wall:0x8f8879, rubble:0x968d7c },
  road:     { crack:0x2c2e34, core:0x14161a, piece:0x3a3d44, wall:0x2f3138, rubble:0x35383f }
};

/* approved trash (trash lab v1): seeded litter cluster */
const TRASH_ART = {
  bagC: 0xe9eaec, bagHi: 0xf7f8fa, bagShade: 0xc3c7cc, bagDeep: 0xa8adb4,
  botBody: 0xd8eef4, botHi: 0xf4fbfd, botCap: 0x2d7dd2, botLabel: 0xf4f5f7, botShade: 0xaacdd6,
  paper: 0xf1efe6, paperShade: 0xd0ccbd,
  canA: 0xc2452e, canB: 0x9aa7b5, canHi: 0xc9d3dd,
  wrap: [0xf2c94c, 0x7fae4e, 0xff7a1a],
  outline: 0x30343d, shadow: 0x000000
};

/* approved cone (cone lab, 2026-07-07) */
const CONE = {
  height: 38, base: 18, band: 0,
  body: 0xff7a1a, bodyDk: 0xd85f0a, band_c: 0xf4f5f7, shadow: 0x000000
};
/* approved in cone hit lab (2026-07-09): rigid pivot-fall physics.
   ONE integrator drives every cone — no keyframes, no binary
   standing/knocked swap. phi is the live tip angle about a physical
   pivot: phase 1 pivots on the front base-rim edge (0-90°), phase 2
   hands off to the landed slab corner (90°-phiRest). phiBal is the
   balance angle (CM over the pivot) — gravity torque restores below
   it, topples past it, so the fall threshold emerges from the
   geometry rather than a tuned number. phiRest is solved once from
   the live CONE dimensions (the slant line's ground-contact angle). */
const coneR = h => 8.5 - (8.5 - 1.8) * (h / CONE.height);
const CONE_HIT = (() => {
  const pvt = CONE.base/2, H = CONE.height;
  const phiBal = Math.atan(pvt / (3 + H*0.25));
  let phiRest = Math.PI*0.97;
  const cand = [[1.8, H], [-1.8, H], [-pvt, 3]];
  for(let h = 2; h <= H; h += 4) cand.push([coneR(h), h], [-coneR(h), h]);
  for(const [u, h] of cand){
    if(u >= pvt || h <= 3) continue;
    const f = Math.PI - Math.atan((h - 3) / (pvt - u));
    if(f > Math.PI/2 && f < phiRest) phiRest = f;
  }
  return {
    phiBal, phiRest,
    kick: 1.0,   // hit impulse multiplier — approved
    grav: 0.6,   // gravity torque multiplier — approved
    punt: 2.0    // slide impulse multiplier — approved
  };
})();

/* approved scooter (scooter lab, 2026-07-07): stem 42 · bar 13 · wheel 5 */
const SCOOT = {
  stemH: 42, barW: 13, wheelR: 5,
  deck: 0x2e3138, grip: 0x3d424c,
  wheel: 0x24262c, wheelDk: 0x17191d, hub: 0x8a919c, hubFace: 0x3d424c,
  metal: 0x9aa3ad, metalDk: 0x707a85, shadow: 0x000000
};
const BRANDS = [
  { n:"teal",  c:0x2ec4b6, cDk:0x1f857c },
  { n:"lime",  c:0x8bc34a, cDk:0x649238 },
  { n:"coral", c:0xff6b6b, cDk:0xc94f4f }
];
/* approved in scooter hit lab (2026-07-09): the dumped pose isn't a
   real rotation (it's a stylized squash — see the lab's header note
   for the full reasoning), so phi drives a BLEND fraction between
   the standing and dumped geometry rather than a rigid tip. The
   fall integrator itself (gravity torque, threshold, bounce) is the
   same pattern as the cone/bin. Deliberately tippy — a light
   two-wheeled rental barely needs a nudge. */
const SCOOT_HIT = {
  phiBal: 12 * Math.PI/180,
  phiRest: Math.PI/2,
  kick: 1.0, grav: 1.0, punt: 1.6
};
/* approved in dog lab: head 7.5 · ears 5 · legs 6 · tail 0.4 · size 0.8 · fawn · no tremble */
const DOG = {
  len: 0.8, headR: 7.5, earH: 5, legH: 6, tailCurl: 0.4,
  body: 0xc98d4b, bodyDk: 0xa06e38, chest: 0xe8d9b8, ear: 0xd99a8c,
  eye: 0x1c1e24, glint: 0xf4f2ec, nose: 0x25272d,
  collar: 0xd94f3d, collarDk: 0xa83b2d, shadow: 0x000000
};
/* dog lab v2: three street coats + the deterministic wander */
const DOG_COATS = [
  { n:"fawn",    body:0xc98d4b, dk:0xa06e38, chest:0xe8d9b8, ear:0xd99a8c },
  { n:"cream",   body:0xe3d3b3, dk:0xbfa987, chest:0xf3ece0, ear:0xdca493 },
  { n:"blk&tan", body:0x33363e, dk:0x22242b, chest:0xc98d4b, ear:0xb0837b }
];
/* the dog's position/heading/stride at time t — a PURE function of
   (t, seed), no mutable state: renderer and sim call the same thing,
   so the hitbox always matches the art. Sitters get one fixed seeded
   spot. Offsets are tile-local (±30 along, ±26 across) so he never
   leaves the square he spawned in. Walk legs are 62% of each 2.6s
   segment (smoothstepped), the rest is standing and judging. */
function dogSpotAt(tms, seed, sit){
  const wp = i => {
    const r = mulberry32((seed ^ Math.imul(i|0, 2654435761)) >>> 0);
    return { a: -30 + r()*60, b: -26 + r()*52 };
  };
  if(sit){
    const p = wp(0);
    return { a: p.a, b: p.b, th: mulberry32(seed)()*Math.PI*2, walk: 0 };
  }
  const SEG = 2600;
  const i = Math.floor(tms/SEG), u = (tms % SEG)/SEG;
  const p0 = wp(i), p1 = wp(i+1);
  const w = Math.min(u/0.62, 1), e = w*w*(3 - 2*w);
  return {
    a: p0.a + (p1.a - p0.a)*e,
    b: p0.b + (p1.b - p0.b)*e,
    th: Math.atan2(p1.b - p0.b, p1.a - p0.a),
    walk: u < 0.62 ? Math.sin(Math.PI*w) : 0
  };
}
/* the startle: when the robot clips a dog the sim stamps hitT +
   flee direction on the hazard, and the dog LEAVES — a hit dog does
   not loiter. He launches away from the robot along the route and
   angles toward the buildings (away from the road), accelerating out
   of his launch turn and running flat-out into the distance for
   2.6s; after that he's gone for the rest of the route. Pure
   function of (t, hz), same contract as dogSpotAt. */
function dogFleeAt(tms, hz){
  if(!hz || hz.hitT === undefined) return null;
  const el = tms - hz.hitT;
  if(el <= 0) return null;
  const DUR = 2600;
  if(el >= DUR) return { gone: true };
  const u = el / DUR;
  const dist = 250 * Math.pow(u, 1.35);        // launch turn, then flat-out
  return {
    da: (hz.fleeA || 1) * dist,
    db: -dist * 0.45,                          // toward the buildings, off the road
    u,
    gone: false
  };
}
/* where a hit dog ends up once the flee run finishes: he doesn't pop
   back to his spawn tile and resume the old wander loop (dogSpotAt is
   a pure function of absolute time + seed, so "resuming" it would just
   snap him to wherever that cycle currently says, nowhere near where he
   actually ran to) - he settles down right where he landed and stays
   there. Pure function of hz alone: hitT/fleeA/fleeB/dogSeed/sit never
   change once a flee starts, and DUR is fixed, so the landing point is
   fully determined the moment he's hit - no need to depend on the
   current time at all. */
function dogSettledSpot(hz){
  if(!hz || hz.hitT === undefined) return null;
  const DUR = 2600, DIST = 250;                // matches dogFleeAt's values at u=1
  const base = dogSpotAt(hz.hitT + DUR, hz.dogSeed || 0, hz.sit);
  return {
    a: base.a + (hz.fleeA || 1) * DIST,
    b: base.b - DIST * 0.45,
    th: Math.atan2(-0.45, hz.fleeA || 1)
  };
}
/* prop.people — ported from the customer lab (dial bench approved).
   Same hull-box construction as the robot/props: top face + the two
   camera-facing side faces per box. Two body presets (randomly picked
   per spawn, like DOG_COATS) rather than one fixed shape, plus
   independently seeded skin/shirt/pants/hair/shoe. Reacts exactly like
   prop.dog: a hit starts a flee run (same DUR/DIST curve), and once
   the flee finishes they settle and stand there for the rest of the
   route — re-armed if hit again. */
const PEOPLE_ART = { walkStride: 8, walkSpeed: 0.006, shadow: 0x000000 };
const PEOPLE_BUILD = [
  { n:"a", legH:52, legW:10, hipW:16, torsoW:34, torsoD:19, torsoH:44, headR:14, armW:7, armLen:40, hairStyle:"short" },
  { n:"b", legH:52, legW:10, hipW:19, torsoW:28, torsoD:19, torsoH:44, headR:13, armW:7, armLen:40, hairStyle:"long"  }
];
const PEOPLE_SKIN  = [{c:0xd9a774,dk:0xb98456},{c:0xf0c8a0,dk:0xc9a583},{c:0xc98a5a,dk:0xa8724a},{c:0x8a5a3a,dk:0x6e4830},{c:0x5c3d28,dk:0x4a3120}];
const PEOPLE_SHIRT = [{c:0x3f8f8a,dk:0x2f6b67},{c:0xc2452e,dk:0x963522},{c:0xb15a7a,dk:0x8a475f},{c:0x4a6c9c,dk:0x3a557a},{c:0xe8b04b,dk:0xb98a3a},{c:0x6b6b6b,dk:0x525252},{c:0x5c8a4e,dk:0x486d3d}];
const PEOPLE_PANTS = [{c:0x3a4658,dk:0x2c3543},{c:0x2e2e2e,dk:0x1e1e1e},{c:0x6b4a34,dk:0x543a29},{c:0x8a8a8a,dk:0x6d6d6d},{c:0x4a3a5c,dk:0x3a2d47}];
const PEOPLE_HAIR  = [0x3a2b20, 0x1a1a1a, 0x8a6a3a, 0xd4c088, 0xb03a2e, 0x6b6b6b];
const PEOPLE_SHOE  = [{c:0x1c1c1c,dk:0x121212},{c:0x5c4530,dk:0x483623},{c:0xf2f0e8,dk:0xc4c2ba}];

/* people patrol their spawn tile exactly like the dog does — same
   waypoint construction, same tile-local bounds (±30 along, ±26
   across), same SEG timing — so they're actually walking the
   sidewalk instead of standing frozen until hit. Pure function of
   (t, seed): the sim's collision check and the renderer call the same
   thing, so the hitbox always matches the art. */
function peopleSpotAt(tms, seed){
  const wp = i => {
    const r = mulberry32((seed ^ Math.imul(i|0, 2654435761)) >>> 0);
    return { a: -30 + r()*60, b: -26 + r()*52 };
  };
  const SEG = 2600;
  const i = Math.floor(tms/SEG), u = (tms % SEG)/SEG;
  const p0 = wp(i), p1 = wp(i+1);
  const w = Math.min(u/0.62, 1), e = w*w*(3 - 2*w);
  return {
    a: p0.a + (p1.a - p0.a)*e,
    b: p0.b + (p1.b - p0.b)*e,
    th: Math.atan2(p1.b - p0.b, p1.a - p0.a),
    walk: u < 0.62 ? Math.sin(Math.PI*w) : 0
  };
}
/* the flee/settle curve — same DUR/DIST as the dog, same contract:
   pure functions of (t, hz) / (hz). */
function peopleFleeAt(tms, hz){
  if(!hz || hz.hitT === undefined) return null;
  const el = tms - hz.hitT;
  if(el <= 0) return null;
  const DUR = 2600;
  if(el >= DUR) return { gone: true };
  const u = el / DUR;
  const dist = 250 * Math.pow(u, 1.35);
  return { da:(hz.fleeA || 1)*dist, db:-dist*0.45, u, gone:false };
}
function peopleSettledSpot(hz){
  if(!hz || hz.hitT === undefined) return null;
  const DUR = 2600, DIST = 250;
  const base = peopleSpotAt(hz.hitT + DUR, hz.peopleSeed || 0);
  return {
    a: base.a + (hz.fleeA || 1) * DIST,
    b: base.b - DIST * 0.45,
    th: Math.atan2(-0.45, hz.fleeA || 1)
  };
}

/* approved in bin lab: height 34 · base 11 · lid 13 · band 3 (standing) / 0 (knocked) */
const BIN = {
  height: 34, baseR: 11, lidR: 13, band: 3,
  body: 0x3f5147, bodyDk: 0x2e3d35,
  band_c: 0xd8dade,
  lid: 0x4a5d52, lidDk: 0x384539,
  pedal: 0x8a919c, pedalDk: 0x5f656e,
  liner: 0x1f2822,
  shadow: 0x000000
};
/* approved in bin hit lab (2026-07-09): rigid pivot-fall physics —
   simpler than the cone's, since a barrel's own round bottom is the
   whole base (no separate slab plate with corners), so it's ONE
   pivot all the way from standing to lying flat at exactly 90°. */
const binR = h => { const u = h / BIN.height; return BIN.baseR * (0.88 + 0.12*Math.sin(u*Math.PI)); };
function binTipPoint(u, h, phi){
  const pvt = binR(0);
  if(phi === 0) return { u, z: h };
  const cphi = Math.cos(phi), sphi = Math.sin(phi);
  return { u: pvt + (u - pvt)*cphi + h*sphi, z: -(u - pvt)*sphi + h*cphi };
}
/* the wall IS the bin: samples the actual barrel silhouette at the
   current tip angle to find the nearest-to-robot point, rather than
   using a fixed clearance number. Standing, that's the lid overhang;
   as it topples away (always downstream, same as the punt) the near
   side swings up and shrinks toward the pivot, where it locks once
   knocked — the physical boundary just stops moving, which is what
   makes a knocked bin block the lane just as permanently as a
   standing one. */
function binNearEdge(phi){
  let minU = Infinity;
  for(let hi=0; hi<=8; hi++){
    const h = hi/8*BIN.height, r = binR(h);
    for(const u of [-r, r]){ const t = binTipPoint(u, h, phi); if(t.u < minU) minU = t.u; }
  }
  for(const u of [-BIN.lidR, BIN.lidR]){
    const t = binTipPoint(u, BIN.height, phi); if(t.u < minU) minU = t.u;
  }
  return minU;
}
/* where a knocked bin's BLOCKING footprint actually sits, relative to
   its spawn anchor, along the route (+s): the shove's slide plus the
   topple's pivot reach (the barrel swings ~half its height forward as
   it lies down), projected through the fall angle. PURE — same fields
   the draw animates from, so the stop line and the art always agree
   (the fixed anchor wall blocked the robot at empty pavement while the
   bin lay a shove away — on-device). */
function binShiftAt(hz){
  const lay = Math.min(1, (hz.phi || 0) / (Math.PI/2));
  const reach = lay * BIN.height * 0.5;
  return ((hz.slide || 0) + reach) * Math.cos(hz.fallPsi || 0);
}

const BIN_HIT = (() => {
  const r0 = binR(0);
  const phiBal = Math.atan(r0 / (BIN.height * 0.42));   // CM biased low — a loaded bin's weight sits low
  return { phiBal, phiRest: Math.PI/2, kick: 1.0, grav: 0.6, punt: 2.0 };
})();
/* approved in hydrant lab: height 20 · base 8 · dome 6.5 · nozzle 2.6 · red.
   hydrantBurst is the same rigid hydrant with a sheared front nozzle,
   animated water arc, and a puddle spanning most of the neighboring tile. */
const HYD = {
  height: 20, baseR: 8, domeR: 6.5, nozR: 2.6,
  cap: 0xb5342b, capDk: 0x8a2822,
  nut: 0x3a3d43,
  water: 0xbfe6f2, waterDk: 0x8fc8dc,
  shadow: 0x000000
};
/* cargo damage meter (spec: red-zone dwell damage) — a top-speed
   hydrant/scooter bonk deals ~55-62 damage in one shot (kick*mult,
   speed capped at 0.15), so this needs to stay well under "one hit
   per second" or it'd dominate the damage stat outright. Starting
   value, not yet tuned on-device. */
const DAMAGE_REDZONE_DPS = 8;   // cargo damage/sec while |tilt| stays past the 0.75 danger line

/* dialed in the hydrant hit lab: burst + hydroplane numbers */
const HYD_SLIP = {
  thresh: 0.055,   // hit speed that shears the nozzle
  bonk: 10,        // cast-iron impact severity
  spin: 1.0,       // pirouette turns × (entry speed / 0.05)
  grip: 1.0,       // traction recovery: yaw unwind rate
  pud: 41.4        // full-grown flood radius (TILE*0.9 — literal: TILE declares later)
};
/* approved in planter lab: tapered box + layered stalked bush.
   Dimensions vary per-instance (seeded) rather than one locked size —
   box 13-19w × 8-12d × 8-12h, bush 12-20h, fullness 4-7, ~30% flowering. */
const PLANTER = {
  box: 0x8f8577, boxDk: 0x7a7164, boxDk2: 0x6b6357,
  soil: 0x4a3f34, stalk: 0x5c6b3f,
  shadow: 0x000000
};
/* ported from the planter collision lab, 2026-07-10: plant variety —
   color palette + puff silhouette, picked per-instance from a seeded
   RNG the same way CAR_COLORS/PEOPLE_SHIRT already are. "round" is
   the original bushy-puff look; "spiky" swaps the puffs for thin
   radiating blades (ornamental-grass/succulent silhouette) instead
   of circles — a real shape difference, not just a recolor. */
const PLANTER_VARIANTS = [
  { n:"garden",    leafA:0x4e8f4a, leafB:0x3c7a3c, leafC:0x62a35c, flower:0xe86b8a, style:"round" },
  { n:"sage",       leafA:0x8a9a6e, leafB:0x707f57, leafC:0x9fae82, flower:0xd9c37a, style:"round" },
  { n:"tropical",   leafA:0x2f7a4e, leafB:0x1f5c38, leafC:0x3f9463, flower:0xff7a3d, style:"spiky" },
  { n:"autumn",     leafA:0xa88a3a, leafB:0x8a6f2a, leafC:0xc4a54e, flower:0xd94f3d, style:"round" },
  { n:"succulent",  leafA:0x4a8a86, leafB:0x396c69, leafC:0x5fa39e, flower:0xe8d9b8, style:"spiky" }
];
const PLANTER_BASE = { boxW: 22, boxD: 14, boxH: 14, bushH: 20, fullness: 6 };
/* approved in planter collision lab (2026-07-10): a COLLIDABLE planter
   hazard, distinct from the existing prop.planter (which stays pure
   decoration on the far, unreachable sidewalk — see its placement
   comment). This one spawns reachable, on the robot's own side.
     · balance angle is scale-INVARIANT — atan of two dimensions that
       scale together — so a bigger planter isn't more top-heavy, it
       just takes a harder hit to reach the same angle (potPower).
     · below thresh: one hit topples it (like cone/bin), robot drives
       on, never a wall.
     · at/above thresh: too heavy to plow through standing OR lying
       down (bin's "too big" contract, same BOT_CLEAR fixed-clearance
       pattern — the one proven to still work in this file) — it still
       eventually topples under a sustained push, but the lane stays
       blocked either way, so the player has to change lanes. */
const PLANTER_HIT = {
  phiBal: Math.atan((PLANTER_BASE.boxW/2) / (PLANTER_BASE.boxH*0.55)),
  phiRest: Math.PI/2,
  thresh: 1.4, kick: 1.0, potPower: 1.3
};
/* approved in car lab: len 150 · wid 60 · chassis 28 · cabin 32 · wheel 16.
   Scaled to tower over the robot (robot: 52w x 40d x 61h to the lid).
   kind "truck" is the same rig with a shorter cab (cl 0.24 vs 0.62 of
   half-length), a vertical rear wall instead of a sloped one, a small
   flush rear window instead of the sedan's full sloped backlight, and
   an open cargo bed with raised rails behind the cab. */
const CARC = {
  len: 225, wid: 90, chassisH: 42, cabinH: 48, wheelR: 24,
  glass: 0x4a5560, glassDk: 0x3a434c, windshield: 0x9fc4d6, windshieldEdge: 0x6f8fa0,
  bumper: 0xb8bcc2, light: 0xf4e9b0, tail: 0xc94f4f,
  wheel: 0x24262c, wheelDk: 0x17191d, hub: 0x8a919c, hubFace: 0x3d424c,
  bedFloor: 0x3d434a,
  shadow: 0x000000
};
const CAR_COLORS = [
  { n:"silver", body:0x9aa7b5, bodyDk:0x76839a, roof:0x8695a5 },
  { n:"red",    body:0xc45a4e, bodyDk:0x9c473d, roof:0xaf4f44 },
  { n:"blue",   body:0x5678a8, bodyDk:0x435e87, roof:0x4c6c99 },
  { n:"white",  body:0xe4e6ea, bodyDk:0xc0c3c9, roof:0xd6d9dd }
];
   // facing 0..3
const TILE = 46;             // half-tile, model units — was previously declared only
const T2 = TILE*2;           // locally inside drawWorld(); now needed globally for the grid.
const BLOCK = 34 * T2;       // SCALED UP for block-wrap (was 22*T2) — the interior
                              // (beyond the sidewalk's inside line) needs room for
                              // 3-4 door-scaled houses/storefronts with real yards,
                              // not just 1-2. Route length, hazard density, and
                              // camera framing all shift with this — expect a
                              // follow-up tuning pass once this is playtested.
                              // node-to-node street spacing (whole multiple of T2 —
                              // keeps every intersection tile-aligned by construction)
const ROAD_HALF = 4*T2;      // road is 8 rows wide, symmetric about the centerline
const SIDEWALK_ROWS = 4;     // per side — the sidewalk width already live in-game
const SIDEWALK_W = SIDEWALK_ROWS*T2;
const OVERSHOOT = ROAD_HALF; // sufficient by construction — see classifyAt
const CELL = TILE;           // sidewalk classification/render resolution
const CORNER_R = ROAD_HALF + SIDEWALK_W;       // the robot's (and traffic's) turning radius through an
                              // intersection. MUST exceed the widest sidewalk lane offset
                              // (up to ROAD_HALF + 3.5*T2) or the offset math folds through
                              // the arc's center and the path reverses mid-turn on the inside
                              // of corners. The old (pre-4-lane-band) game kept CORNER_R(130)
                              // safely above its lane offset (max 92) for exactly this reason;
                              // porting to the wider band without raising CORNER_R to match
                              // broke that invariant. Tying it to ROAD_HALF+SIDEWALK_W restores
                              // the same margin the old game always had, and keeps it an exact
                              // multiple of T2.
const TURN_R = ROAD_HALF + T2;    // PLAYER-ROUTE-ONLY wide-turn fillet radius (5*T2) — deliberately
                              // SMALLER than CORNER_R so the arc's tangent points land exactly on
                              // the yellow ramps (also ROAD_HALF+T2 from the corner node) instead of
                              // CORNER_R's 8*T2, which started the turn+tip mechanic ~3 tiles before
                              // the down-ramp. Knowingly reopens the fold-through-center invariant
                              // CORNER_R's own comment warns about, for lane offsets beyond TURN_R
                              // (rows 1-3): outer lanes will slow through the turn, and at the
                              // widest offset (row 3) the offset math can fold past the arc's
                              // center. Accepted tradeoff (Sir, 2026-07-17) in exchange for the
                              // turn visually starting/landing on the ramps. Traffic keeps CORNER_R
                              // unchanged — buildWalk only gets TURN_R from generateRoute's own call.
const ROBOT_SIDE = -1;       // the walk stays on ONE side's sidewalk band —
                              // lane 0 is closest to the road (curb side),
                              // lane 3 is farthest (building side).
function laneOffset(lane){ return ROBOT_SIDE * (ROAD_HALF + (lane+0.5)*T2); }
function farLaneOffset(lane){ return -ROBOT_SIDE * (ROAD_HALF + (lane+0.5)*T2); } // opposite sidewalk — decoration only, never robot-reachable

/* ---------- street-crossing curb-ramp ground (pure) ----------
   Ported from labs/sidewalkend-lab.html (groundZAt/groundSlopeAt + the
   per-zone flags its update loop derived ad hoc). Pure function shared
   by the sim loop and the robot's own botZ, same contract as dogSpotAt/
   trafficWorldAt: art and physics must agree, so the z constants here
   are EXACTLY the prop art's own (sidewalkZ=2, streetZ=-3 in the
   sidewalkend/sidewalkbegin drawProp branches) — the robot rides the
   surfaces the player can see, not a parallel invisible model.
   Geometry mirrors the spawn anchors exactly: each crossing is a span
   [sA, sB] of walk-gone route-s (straight crossing: the crossing
   street's ±ROAD_HALF around the node; outside turn: the arc seg's
   full sweep), each ramp 2 tiles deep just outside an end — slope tile
   on the sidewalk side, ADA pad tile touching the street.
   Lane model (game rows 0-3, ramp strip on row 1 per the spawn's row:1
   anchor over rows 0-2):
   - row 1: the ramp lane — smooth slope down, flat street crossing,
     slope back up. tiltSign 0 (pure pitch, no lean).
   - rows 0/2: the prop's flat outer lanes at sidewalkZ, then a real
     curb DROP at the road edge and a hard curb WALL at the far side.
     tiltSign ∓1 while on the flared ramp sides (lab: botRow -1/0/+1).
   - row 3: not on the prop at all — plain flat walk (z 0), same
     drop/wall treatment as 0 and 2, but no cross-slope lean. */
const CROSSING_SIDEWALK_Z = 2, CROSSING_STREET_Z = -3;
function crossingGroundAt(crossings, s, row){
  const drop = CROSSING_STREET_Z - CROSSING_SIDEWALK_Z;   // -5, the lab's real curb height
  for(const cx of crossings){
    if(cx.kind === "turn") continue;   // turns use turnCrossingGroundAt (world-space)
    /* every crossing is a SPAN [sA, sB] of route-s where the walk is
       gone: straight crossings (sB - sA = 2*ROAD_HALF, the crossing
       street's width) and outside-turn sweeps (sB - sA = the arc
       length) share this exact model — ramps on the two tiles outside
       each end, street level between. For turns, s runs THROUGH the
       arc seg, so "street level for the whole span" is the
       lab-approved sidewalkendturn shape: descend before the corner,
       sweep low, climb after. */
    if(s < cx.sA - 2*T2 || s > cx.sB + 2*T2) continue;
    const onRoad = s > cx.sA && s < cx.sB;
    if(row === 1){
      let z, slope = 0, onPad = false;
      if(s <= cx.sA - T2){                      // descending slope tile
        const u = (s - (cx.sA - 2*T2)) / T2;    // 0 at rear edge -> 1 at pad
        z = CROSSING_SIDEWALK_Z + u*drop; slope = drop / T2;
      } else if(s >= cx.sB + T2){               // ascending slope tile
        const u = (s - (cx.sB + T2)) / T2;      // 0 at pad -> 1 at rear edge
        z = CROSSING_STREET_Z - u*drop; slope = -drop / T2;
      } else {
        z = CROSSING_STREET_Z;
        /* the two yellow ADA pad tiles — the dome-bump rumble zones */
        onPad = (s >= cx.sA - T2 && s <= cx.sA) || (s >= cx.sB && s <= cx.sB + T2);
      }
      return { z, slope, tiltSign: 0, onPad, wallS: null, onRoad };
    }
    const preZ = row === 3 ? 0 : CROSSING_SIDEWALK_Z;   // rows 0/2 ride the prop's raised base
    return {
      z: onRoad ? CROSSING_STREET_Z : preZ,
      slope: 0,
      /* cross-slope lean off the ramp's flared sides — only while on the
         prop itself (lab applied it within the ramp's 2-tile extent),
         mirrored sign each side of the ramp strip, none for row 3.
         Sign is (1 - row), NOT the lab's raw (row - center): ROBOT_SIDE
         = -1 mirrors the game's lateral axis relative to the lab's, so
         the lab's lane sign flips once here. Confirmed on-device: the
         raw mapping leaned the wrong way on both flanking rows. */
      tiltSign: (row === 3 || onRoad) ? 0 : (1 - row),
      onPad: false,
      wallS: cx.sB,   // the far curb (span end) — a real wall for the no-ramp lanes
      onRoad };
  }
  return null;
}

/* ---------- prop.pigeons (ported verbatim from labs/pigeon-lab.html, v5 state) ----------
   A seeded flock of 3-6 birds milling on a sidewalk tile; scatter on
   robot contact is pure art — no damage, no tilt. Same zero-mutable-
   state standard as every prop: layout, plumage, wander, and scatter
   angles are all functions of the flock's world position and time.
   The only run state is hz.fledAt, set once by the sim. */
/* ---------- pigeon palette (SKIN-adjacent greys + the one iridescent fleck) ---------- */
const PIG = {
  neck: 0x3f8f7a,                    // the iridescent fleck — every variant carries it
  beak: 0xe8912c, leg: 0xd97b24, eye: 0x1a1c21, shadow: 0x000000,
  bodyL: 11, bodyH: 7,               // plump little loaf
  flapRate: 0.035, burstMs: 1100
};
/* three plumages — mid (the original), sooty dark, dusty light — mixed
   per-bird so a flock reads as a flock, not six clones */
const PIG_VARIANTS = [
  { body: 0x8d939e, breast: 0xb4bac4, wing: 0x6c727d, head: 0x565b66 },   // mid
  { body: 0x5a5f6a, breast: 0x7b818c, wing: 0x40444d, head: 0x2f333b },   // sooty
  { body: 0xb8bdc6, breast: 0xdde1e8, wing: 0x9aa0aa, head: 0x7d838e },   // dusty light
];

/* ---------- pure flock layout: position-seeded, no mutable idle state ----------
   Everything a bird IS (spot in the tile, size, facing, peck phase,
   scatter angle) comes from the flock's world position + index, so the
   renderer and any future sim agree by construction. */
function flockBirds(fx, fy){
  const rng = mulberry32(((Math.round(fx)*73856093) ^ (Math.round(fy)*19349663)) >>> 0);
  const n = 3 + Math.floor(rng()*4);          // 3-6 birds
  const birds = [];
  for(let i=0;i<n;i++){
    const a = rng()*Math.PI*2, r = 8 + rng()*30;
    birds.push({
      ox: Math.cos(a)*r, oy: Math.sin(a)*r,   // spot within the tile
      pal: PIG_VARIANTS[Math.floor(rng()*3)], // one of the three plumages
      size: 0.85 + rng()*0.3,
      /* wander: two seeded ellipse frequencies + a faster epicycle —
         a pure function of time, so every bird meanders aimlessly
         around its home spot forever with zero mutable state, and
         facing falls out of the analytic velocity */
      w1: 0.00035 + rng()*0.00035, w2: 0.00035 + rng()*0.00035, w3: 0.0011 + rng()*0.0006,
      rx: 10 + rng()*10, ry: 10 + rng()*10,
      p1: rng()*Math.PI*2, p2: rng()*Math.PI*2,
      peckPh: rng()*Math.PI*2,
      peckRate: 0.0016 + rng()*0.0009,
      scatterA: a + (rng()-0.5)*0.9,          // burst direction: radial + jitter
      scatterV: 0.10 + rng()*0.05,
      flapPh: rng()*Math.PI*2
    });
  }
  return birds;
}

/* pure: where a bird's meander puts it (offset from home) and which way
   it's walking, at time t. Derivative-based facing means the bird always
   faces its direction of travel; the two base frequencies plus the
   epicycle never all zero out together, so it never spins in place. */
function birdWanderAt(b, t){
  const x = Math.cos(t*b.w1 + b.p1)*b.rx + Math.cos(t*b.w3 + b.p2)*4;
  const y = Math.sin(t*b.w2 + b.p2)*b.ry + Math.sin(t*b.w3 + b.p1)*4;
  const vx = -Math.sin(t*b.w1 + b.p1)*b.rx*b.w1 - Math.sin(t*b.w3 + b.p2)*4*b.w3;
  const vy =  Math.cos(t*b.w2 + b.p2)*b.ry*b.w2 + Math.cos(t*b.w3 + b.p1)*4*b.w3;
  return { x, y, th: Math.atan2(vy, vx) };
}

/* ---------- outside-turn crossing ground (pure, WORLD-space) ----------
   Turn crossings can't use route-s geometry: the ramps sit at the true
   curb lines and the robot's arc crosses them DIAGONALLY, so the ground
   under him is a function of his world position, not his route
   coordinate. Same art/physics contract as crossingGroundAt: z
   constants are the prop's own.
   Footprint DETECTION (which ramp, if either, wx/wy sits over) stays
   world-position-based across the full 2x3-tile rectangle regardless of
   lane — that part has to be robust to the diagonal crossing (a
   strip-only footprint test previously clipped the row-1 lane through
   the row-0 flank mid-diagonal, which is why this uses the full width).
   BEHAVIOR once a footprint is found is now gated by the robot's actual
   logical row (passed in, same _vRow the straight crossings use) rather
   than by world position, which sidesteps that original bug entirely —
   world position decides WHICH footprint, row decides WHAT that footprint
   feels like:
   - row 1 (the ramp lane): unchanged — smooth slope down, flat pad,
     smooth slope back up.
   - rows 0/2 (flanking, no ramp under them): flat at sidewalk height
     until the pad tile, then a real curb DROP to street level (down-
     ramp side) — same split crossingGroundAt already uses. On the up-
     ramp side they stay CAPPED at street level the whole footprint —
     no ramp means no way up. The moment their world position clears the
     footprint onto the real far sidewalk, the fallback below jumps them
     back to walk height and the caller's existing climb-rule (z jump >
     2.5) reads that as a real curb wall, same as the straight model's
     wallS — no separate wall needed here. Mirrored tiltSign lean while
     on the down-ramp's flared side, same (1-row) convention
     crossingGroundAt uses, zero once at street level or on the capped
     up-ramp (there's no flared side to lean on there, just flat street).
   - row 3: never in the footprint at all (outside inBand) — gets the
     honest curb drop/wall from the pocket-fallback transition alone,
     as before.
   Rumble stays tied to the drawn yellow: pad along-range AND the
   center-strip cross-tile, row-1 only.
   Fallback outside both footprints: classify — road level in the
   sweep, plain walk elsewhere. Total within the caller's s-gate. */
function turnCrossingGroundAt(cx, wx, wy, classify, row){
  const drop = CROSSING_STREET_Z - CROSSING_SIDEWALK_Z;   // -5
  const dIn = DIRV[cx.fIn],  rvIn = DIRV[(cx.fIn+1)%4];
  const dOut = DIRV[cx.fOut], rvOut = DIRV[(cx.fOut+1)%4];
  const ax = wx - cx.nx, ay = wy - cx.ny;
  const a = ax*dIn.x  + ay*dIn.y,  c = ax*rvIn.x  + ay*rvIn.y;
  const b = ax*dOut.x + ay*dOut.y, e = ax*rvOut.x + ay*rvOut.y;
  /* ROBOT_SIDE = -1: the walk band sits on the negative-rv side, so the
     footprint's cross range (rows 0-2) and the strip (row-1 tile) are: */
  const inBand = v => v >= -ROAD_HALF - 3*T2 && v <= -ROAD_HALF;
  const inStrip = v => v >= -ROAD_HALF - 2*T2 && v <= -ROAD_HALF - T2;
  const onRamp = row === 1;
  const flankTilt = (row === 0 || row === 2) ? (1 - row) : 0;   // same mirror as crossingGroundAt
  if(a >= -ROAD_HALF - 2*T2 && a <= -ROAD_HALF && inBand(c)){
    /* down-ramp footprint: slope tile then pad, along the OLD heading */
    const onSlope = a <= -ROAD_HALF - T2;
    if(onRamp){
      const z = onSlope ? CROSSING_SIDEWALK_Z + ((a + ROAD_HALF + 2*T2)/T2)*drop : CROSSING_STREET_Z;
      const grad = onSlope ? drop/T2 : 0;
      return { z, gx: dIn.x*grad, gy: dIn.y*grad, onPad: !onSlope && inStrip(c), tiltSign: 0 };
    }
    return { z: onSlope ? CROSSING_SIDEWALK_Z : CROSSING_STREET_Z, gx: 0, gy: 0,
             onPad: false, tiltSign: onSlope ? flankTilt : 0 };
  }
  if(b >= ROAD_HALF && b <= ROAD_HALF + 2*T2 && inBand(e)){
    /* up-ramp footprint: pad then climb, along the NEW heading */
    const onSlope = b >= ROAD_HALF + T2;
    if(onRamp){
      const z = onSlope ? CROSSING_STREET_Z - ((b - ROAD_HALF - T2)/T2)*drop : CROSSING_STREET_Z;
      const grad = onSlope ? -drop/T2 : 0;
      return { z, gx: dOut.x*grad, gy: dOut.y*grad, onPad: !onSlope && inStrip(e), tiltSign: 0 };
    }
    return { z: CROSSING_STREET_Z, gx: 0, gy: 0, onPad: false, tiltSign: 0 };
  }
  /* the corner POCKET: everything between the two ramps' street-edge
     planes is street level, unconditionally. classify alone is wrong
     here: at grid-edge and T nodes some intersection legs don't exist,
     leaving walk-level islands mid-sweep that the route drives the
     robot straight through — an island would pop him up 3 and then
     WALL him on its far curb with no way forward (verified: nodes on
     the grid boundary produced exactly that). The pocket is also what
     puts row 3's curb drop right at the down-ramp's curb plane — the
     same place the straight model drops it, and now also what turns
     the capped up-ramp above into a real wall for rows 0/2: their z
     stays flat at CROSSING_STREET_Z right up to this boundary, then
     jumps to walk height the instant they clear it. Outside the
     pocket, classify still rules (plain walk vs road). */
  const inPocket = a > -ROAD_HALF && b < ROAD_HALF;
  return { z: (inPocket || classify(wx, wy) === "road") ? CROSSING_STREET_Z : 0,
           gx: 0, gy: 0, onPad: false, tiltSign: 0 };
}

/* hull door: frame + slab + 2 panels + knob, hinge-open on theta.
   Ported verbatim from the door lab (dial bench approved). */
const DOOR_ART = {
  w: T2, h: T2*2,
  panelInset: 8,
  panelTopFrom: 0.46, panelTopTo: 0.90,
  panelBotFrom: 0.10, panelBotTo: 0.38,
  knobR: 2.8, knobDX: 30, knobDZ: 84,
  openAngle: Math.PI/2, openEase: 0.09,
  frame: 0x4a2f20, frameLt: 0x5c3c28, frameDk: 0x3a2417,
  slab: 0x6b4530, slabLt: 0x7c5238, slabDk: 0x5a3a28,
  groove: 0x3f2a1c,
  knob: 0xd8b23a, knobDk: 0xa5842a, knobHi: 0xf6e29a, plate: 0x241a10,
  step: 0x9d9687, stepDk: 0x847d70,
  shadow: 0x000000
};
const MAT_ART = { red: 0xc2452e, redDk: 0x8f331f, border: 0x6e2718, fiber: 0xa8391f };
const PICKUP_ART = { walkMs: 2000 }; // real elapsed ms for the worker to walk back in after "go" — frame-rate independent, driven by runT
const LIFT_MAX_ANGLE = Math.PI/2; // full lift = carrying arm swung forward to horizontal, pivoting at the shoulder

/* pickup loading phase: robot's cargo lid opens, worker places a
   takeout bag into the bay, lid closes — all BEFORE the walk-back
   phase starts. Reuses the robot's existing lidAng hinge mechanism
   (drawLid, normally driven by the tip/spill crash state) with a new,
   separate open target — same hinge geometry, no new geometry needed
   for the lid itself. Dial-bench approved in labs/pickup-lab.html. */
const LOAD_ART = {
  ms: 1400,             // total loading phase duration before the walk timer starts
  dropFrac: 0.70,        // bag arrives / drops into the bin at this fraction of ms
  arcH: 26,              // extra z-height at the midpoint of the bag's travel arc
  lidOpenAngle: 1.1,     // radians — plain symmetric open, unlike the tip/spill's asymmetric targets
  lidEase: 0.09,
  riseEnd: 0.22, holdEnd: 0.27, releaseEnd: 0.42  // carrying-arm rise/hold/release fractions
};
const BAG_ART = {
  w: 14, d: 10, h: 16,          // width, depth, height
  paper: 0xc19a6b, paperDk: 0x9c7a4f, paperLt: 0xd4b483,
  foldLine: 0x8a6a45,
  holdFwd: 18,   // extra distance toward the robot (rv), so the bag reads as held out in front
  holdDown: 4    // small downward nudge from the accurate handWorldPos baseline
};

/* commercial swinging door — same SL-hinge-rotation technique as
   drawDoorAssembly, styled as a glass storefront door (thin aluminum
   frame + glass pane + handle bar) instead of the house's ornate wood
   slab+knob. Sized off drawStoreUnit's own proportions (doorW capped
   at DOOR_W*0.72, dZ1 = DOOR_H*0.88) so it matches scale. Dial-bench
   approved in labs/pickup-lab.html. */
const SHOPDOOR_ART = {
  openAngle: Math.PI*0.42, openEase: 0.1,
  frame: 0x2b2f38, frameLt: 0x3a3f4a, frameDk: 0x1c1f26,
  glass: 0x6b93a8, glassHi: 0x9fc2d4,
  handle: 0x1c1c1c, handleHi: 0x4a4a4a,
  shadow: 0x000000
};

/* ================= BLOCK-WRAP: housing/park/commercial filling the
   interior beyond the sidewalk's inside line, ported from the
   block-wrap lab (labs/block-wrap.html). Scale anchored on the real
   door (DOOR_ART.h/.w) and a real person (~124 tall, PEOPLE_BUILD),
   not picked independently — see the lab's SCALE REFERENCE comment
   for the reasoning. ================= */
const PERSON_H = 124; // PEOPLE_BUILD legH(52)+torsoH(44)+headR*2(28)
const GATE_HALF_W = 30; // gate fence opening half-width — 60 units total, enough for the customer to walk through comfortably
const GATE_WALKOFF_DIST = 3000; // how far the gate customer retreats before "gone" — no wall to hide behind, so this needs real distance to read as off-screen
const DOOR_H = DOOR_ART.h, DOOR_W = DOOR_ART.w; // scale anchors for block-wrap houses/stores

const HOUSE_WRAP_PALETTES = [
  { wall:0x4e7a52, wallDk:0x3e6244, wallLt:0x5c8a60, trim:0x2f4a32, roof:0x2f4a32 },  // green
  { wall:0x2e4d68, wallDk:0x22394e, wallLt:0x3a5f7e, trim:0x1a2a3a, roof:0x1a2a3a },  // navy
  { wall:0xc9a56e, wallDk:0xa8875a, wallLt:0xd8b884, trim:0x7a6040, roof:0x7a6040 },  // tan
  { wall:0xc46a4a, wallDk:0x9e5138, wallLt:0xd88264, trim:0x6e3624, roof:0x6e3624 },  // terracotta
  { wall:0xe8ddc0, wallDk:0xc9bc9a, wallLt:0xf2ead6, trim:0x9a8c68, roof:0x9a8c68 },  // cream
  { wall:0xd98a9e, wallDk:0xb56a7e, wallLt:0xe6a4b6, trim:0x7a4252, roof:0x7a4252 }   // coral pink
];
const HOUSE_DEPTH = T2 * 3; // exactly 3 tiles deep — real footprint, not a thin cutout

const STORE_PALETTES = [
  { wall:0x8a3f36, wallDk:0x6e2f28, wallLt:0x9e4c42, trim:0x3a2018, sign:0xe8ddc0 },  // brick red
  { wall:0x2a5c5c, wallDk:0x1e4646, wallLt:0x357070, trim:0x16302f, sign:0xf0e6cc },  // deep teal
  { wall:0x3a3a3e, wallDk:0x28282b, wallLt:0x4a4a4f, trim:0x18181a, sign:0xd8b23a },  // charcoal
  { wall:0xc4a23a, wallDk:0x9e802c, wallLt:0xd8b854, trim:0x5c4a1a, sign:0x2a2a2a },  // mustard
  { wall:0x3f6b4a, wallDk:0x2f5238, wallLt:0x4e8058, trim:0x1e3524, sign:0xe8ddc0 }   // forest green
];
const AWNING_STRIPES = [0xffffff, 0xc4c4c4];
const STORE_DEPTH = T2 * 3; // matches houses

const BENCH_ART = {
  w: PERSON_H*1.3, seatH: PERSON_H*0.35, backH: PERSON_H*0.3,
  wood: 0x9d7a4e, woodDk: 0x7c5f3c, woodLt: 0xb8935e,
  leg: 0x3a3d43
};

/* ground tones — grass for housing/park, warm pavers for commercial,
   distinct from the sidewalk's own concrete tone */
const GRASS = { a:0x5a9c52, b:0x519246, edge:0x3f7a3a };
const PLAZA = { a:0xd9c9a8, b:0xceba95, edge:0xb09b74 };

const EXT_YARD_DEPTH = 220, EXT_PARK_DEPTH = 380; // exterior (world-perimeter) lot depths

const CAR_LANE = ROAD_HALF / 2;          // each traffic direction's lane, inside ROAD_HALF
const SPAWN_S = 60;
/* minimum drivable route length: ONE displayed mile. The HUD's flavor
   conversion is FT_PER_UNIT = 0.6 and 5280 ft/mi, so 1 mi = 8800 route
   units — plus the spawn offset so the readout starts at >= 1.0 mi. */
const MIN_ROUTE_UNITS = 5280 / 0.6 + SPAWN_S;

/* ---------- the single source of truth for "what is at this point" ----------
   Road always wins over sidewalk — a crossing street's road legitimately
   owns that ground, which is what resolves intersection corners correctly. */
function classifyAt(edges, x, y){
  let sidewalk = false;
  for(const e of edges){
    const dv = DIRV[e.f], rv = DIRV[(e.f+1)%4];
    const relX = x - e.a.x, relY = y - e.a.y;
    const along = relX*dv.x + relY*dv.y;
    const perp  = relX*rv.x + relY*rv.y;
    if(along >= -OVERSHOOT && along <= BLOCK + OVERSHOOT){
      if(Math.abs(perp) <= ROAD_HALF) return "road";
      if(Math.abs(perp) <= ROAD_HALF + SIDEWALK_W) sidewalk = true;
    }
  }
  return sidewalk ? "sidewalk" : "block";
}

/* precomputed once per grid: cheap full-length runs for the safe mid-block
   stretch, fine classify()-checked cells only near actual intersections. */
function buildSidewalkGeometry(grid){
  const runs = [];  // individual T2-square tiles along the safe mid-block zone —
                     // NOT long rectangles. A real sidewalk has visible panel
                     // seams every tile-width; one giant rectangle per lane
                     // erased that entirely. Still no classify() check needed
                     // here — this zone is provably conflict-free by construction,
                     // same guarantee as before, just rendered at the right grain.
  const safeLen = BLOCK - 2*OVERSHOOT;
  if(safeLen > T2){
    const nTiles = Math.floor(safeLen / T2);
    for(const e of grid.edges){
      const dv = DIRV[e.f], rv = DIRV[(e.f+1)%4];
      for(const side of [-1, 1])
        for(let t = 0; t < SIDEWALK_ROWS; t++){
          const perp = side * (ROAD_HALF + (t+0.5)*T2);
          for(let ai = 0; ai < nTiles; ai++){
            const along = OVERSHOOT + (ai+0.5)*T2;
            const x = e.a.x + dv.x*along + rv.x*perp;
            const y = e.a.y + dv.y*along + rv.y*perp;
            runs.push({ x, y, parity: (ai + t) % 2 });
          }
        }
    }
  }
  const cornerCells = [], seen = new Set();
  const perpSteps = Math.round(SIDEWALK_W / CELL);
  const alongSteps = Math.round((2*OVERSHOOT) / CELL);
  for(const e of grid.edges){
    const dv = DIRV[e.f], rv = DIRV[(e.f+1)%4];
    for(const end of [0, 1]){
      for(let ai = 0; ai <= alongSteps; ai++){
        const along = end === 0 ? (-OVERSHOOT + ai*CELL) : (BLOCK - OVERSHOOT + ai*CELL);
        for(const side of [-1, 1])
        for(let pi = 0; pi < perpSteps; pi++){
          const perp = side * (ROAD_HALF + (pi+0.5)*CELL);
          const x = e.a.x + dv.x*along + rv.x*perp;
          const y = e.a.y + dv.y*along + rv.y*perp;
          const key = Math.round(x/CELL) + "," + Math.round(y/CELL);
          if(seen.has(key)) continue;
          seen.add(key);
          if(classifyAt(grid.edges, x, y) === "sidewalk"){
            cornerCells.push({ x, y, parity: (Math.round(x/CELL) + Math.round(y/CELL)) % 2 });
          }
        }
      }
    }
  }
  return { runs, cornerCells };
}

/* ---------- the street grid: a real planar graph ---------- */
function nodeShape(n){
  const c = n.conn, count = c.filter(Boolean).length;
  if(count === 4) return "cross";
  if(count === 3) return "t";
  if(count === 2) return (c[0]&&c[2]) || (c[1]&&c[3]) ? "straight" : "corner";
  if(count === 1) return "end";
  return "isolated";
}
/* ---------- block-wrap layout: houses/storefronts packed along each
   block's inner (sidewalk-facing) edge, ported from the block-wrap lab.
   Position-seeded (same convention as palm/planter instance variety
   elsewhere), XORed with the route's own seed so layout varies day to
   day like everything else, while staying deterministic. ---------- */
function packEdge(edgeLen, rng){
  const minGap = T2*0.5, maxGap = T2*1.1;
  const minW = T2*2.4, maxW = T2*4.2; // wide enough that DOOR_W reads as ~25-40% of the facade
  /* corner clearance: a house is HOUSE_DEPTH deep, not just wide — the
     old margin (a fraction of minGap) only kept units from touching
     ALONG the same edge, but said nothing about the PERPENDICULAR
     edge sharing that same corner. Two houses each just inside their
     own edge's old small margin still had their full depth-boxes
     overlapping in the shared corner square. Clearing a full
     HOUSE_DEPTH from each end guarantees the perpendicular edge's own
     depth-box (which clears the same amount from its end) can't reach
     into this edge's corner region either. */
  const cornerMargin = HOUSE_DEPTH + T2*0.3;
  const units = [];
  let cursor = cornerMargin + rng()*(maxGap-minGap)*0.5;
  while(true){
    const w = minW + rng()*(maxW-minW);
    if(cursor + w > edgeLen - cornerMargin) break;
    units.push({ start: cursor, w });
    cursor += w + (minGap + rng()*(maxGap-minGap));
  }
  return units;
}
function packEdgeNoGap(edgeLen, rng){
  const avgW = T2*2.2;
  /* same corner-clearance reasoning as packEdge — storefronts are
     STORE_DEPTH deep, so the "no gap" run needs its own inset from
     each corner even though units within the run stay edge-to-edge. */
  const cornerMargin = STORE_DEPTH + T2*0.3;
  const usableLen = Math.max(avgW, edgeLen - 2*cornerMargin);
  const n = Math.max(1, Math.round(usableLen/avgW));
  const raw = [];
  for(let i=0;i<n;i++) raw.push(0.8 + rng()*0.4);
  const sum = raw.reduce((a,b)=>a+b, 0);
  const units = []; let cursor = cornerMargin;
  for(let i=0;i<n;i++){
    const w = usableLen * raw[i]/sum;
    units.push({ start: cursor, w });
    cursor += w;
  }
  return units;
}
function gapsFromUnits(units, edgeLen){
  const gaps = []; let cursor = 0;
  for(const u of units){
    if(u.start > cursor + 2) gaps.push({ start:cursor, w:u.start-cursor });
    cursor = u.start + u.w;
  }
  if(edgeLen > cursor + 2) gaps.push({ start:cursor, w:edgeLen-cursor });
  return gaps;
}

function buildBlockLayout(grid, seed){
  const { cols, rows } = grid;
  const inset = ROAD_HALF + SIDEWALK_W;
  const blocks = [];
  for(let j = 0; j < rows-1; j++){
    for(let i = 0; i < cols-1; i++){
      const x0 = i*BLOCK, y0 = j*BLOCK;
      const cx = x0 + BLOCK/2, cy = y0 + BLOCK/2;
      const s = ((Math.round(cx)*7919) ^ (Math.round(cy)*104729) ^ seed) >>> 0;
      const r = mulberry32(s)();
      const type = r < 1/3 ? "housing" : r < 2/3 ? "park" : "commercial";
      blocks.push({
        i, j, cx, cy,
        x0: x0+inset, x1: x0+BLOCK-inset,
        y0: y0+inset, y1: y0+BLOCK-inset,
        type
      });
    }
  }
  return blocks;
}

function lotRect(ox, oy, dv, rv, len, depth){
  const corners = [
    { x:ox, y:oy },
    { x:ox+dv.x*len, y:oy+dv.y*len },
    { x:ox+dv.x*len+rv.x*depth, y:oy+dv.y*len+rv.y*depth },
    { x:ox+rv.x*depth, y:oy+rv.y*depth }
  ];
  const xs = corners.map(c=>c.x), ys = corners.map(c=>c.y);
  return { x0:Math.min(...xs), x1:Math.max(...xs), y0:Math.min(...ys), y1:Math.max(...ys) };
}

function buildExteriorLots(grid, seed){
  const { cols, rows, edges } = grid;
  const inset = ROAD_HALF + SIDEWALK_W;
  const lots = [];
  for(const e of edges){
    let outward = null;
    if(e.f === 0){
      if(e.a.j === 0) outward = DIRV[3];
      else if(e.a.j === rows-1) outward = DIRV[1];
    } else {
      if(e.a.i === 0) outward = DIRV[2];
      else if(e.a.i === cols-1) outward = DIRV[0];
    }
    if(!outward) continue;
    const dv = DIRV[e.f];
    const ox = e.a.x + outward.x*inset, oy = e.a.y + outward.y*inset;
    const cx = (e.a.x+e.b.x)/2 + outward.x*(inset+80), cy = (e.a.y+e.b.y)/2 + outward.y*(inset+80);
    const s = ((Math.round(cx)*7919) ^ (Math.round(cy)*104729) ^ seed ^ 0x3c11) >>> 0;
    const r = mulberry32(s)();
    const type = r < 1/3 ? "housing" : r < 2/3 ? "park" : "commercial";
    lots.push({ ox, oy, dv, rv:outward, len:BLOCK, cx, cy, type });
  }
  return lots;
}

function buildGrid(cols, rows, seed=0){
  const nodes = [];
  for(let j=0; j<rows; j++) for(let i=0; i<cols; i++)
    nodes.push({ i, j, x:i*BLOCK, y:j*BLOCK, conn:[false,false,false,false] });
  const nodeAt = (i,j) => (i<0||i>=cols||j<0||j>=rows) ? null : nodes[j*cols+i];
  const edges = [];
  for(let j=0; j<rows; j++) for(let i=0; i<cols-1; i++){
    const a = nodeAt(i,j), b = nodeAt(i+1,j);
    a.conn[0] = true; b.conn[2] = true;
    edges.push({ a, b, f:0 });
  }
  for(let j=0; j<rows-1; j++) for(let i=0; i<cols; i++){
    const a = nodeAt(i,j), b = nodeAt(i,j+1);
    a.conn[1] = true; b.conn[3] = true;
    edges.push({ a, b, f:1 });
  }
  for(const n of nodes) n.shape = nodeShape(n);
  const grid = { cols, rows, nodes, edges, nodeAt };
  grid.classify = (x, y) => classifyAt(grid.edges, x, y);
  const sw = buildSidewalkGeometry(grid);
  grid.sidewalkRuns = sw.runs;
  grid.sidewalkCornerCells = sw.cornerCells;
  grid.blocks = buildBlockLayout(grid, seed);
  grid.extLots = buildExteriorLots(grid, seed);
  return grid;
}

/* ---------- the walked route: a random walk THROUGH the graph ----------
   Two stages: graph traversal (only ever follows real edges — this is
   what guarantees every turn is a real intersection), then the exact
   fillet-arc construction the game already used, now fed by the graph
   walk instead of arbitrary legs. The street grid stays perfectly
   rectilinear; only the walked line curves through it. */
function buildWalk(grid, rng, startOverride, turnsRange, turnR = CORNER_R){
  const { cols, rows, nodeAt } = grid;
  let ci = startOverride ? startOverride.i : 1 + Math.floor(rng()*(cols-2 || 1));
  let cj = startOverride ? startOverride.j : 1 + Math.floor(rng()*(rows-2 || 1));
  let cur = nodeAt(ci, cj) || grid.nodes[Math.floor(rng()*grid.nodes.length)];
  let dir = Math.floor(rng()*4);
  while(!cur.conn[dir]) dir = (dir+1)%4;
  let turnSign = rng() < 0.5 ? 1 : -1;
  /* the turn loop below alternates between exactly two headings (dir
     and dir+turnSign) for the whole route unless a grid boundary
     forces a fallback — so if BOTH of those two headings land in
     {1,2} (south/west), the entire route can end up with zero f===0
     or f===3 legs. findGoodS then has nothing to find and falls back
     to an unguarded position, which is what caused occasional
     wrong-heading (f===1/f===2) starts. Bias the first turn's sign
     away from that trap so the alternating pair always includes at
     least one good heading — this only affects the coin-flip default,
     the per-turn connectivity fallback further down is untouched. */
  const isGoodF = f => f === 0 || f === 3;
  const firstAlt = ((dir + turnSign) % 4 + 4) % 4;
  if(!isGoodF(dir) && !isGoodF(firstAlt)) turnSign = -turnSign;
  /* player-route default raised from 2-3 turns to 4-6: the 1-mile
     route minimum (MIN_ROUTE_UNITS) needs a good-heading leg past the
     mile mark to exist, and 3-4-leg walks frequently had none —
     traffic keeps its own explicit {2,3} range. */
  const tMin = turnsRange ? turnsRange.min : 4, tSpan = turnsRange ? (turnsRange.max - turnsRange.min + 1) : 3;
  const nTurns = tMin + Math.floor(rng()*tSpan);

  const startNode = cur;
  const visited = [startNode];   // every real grid node this walk passes through --
                                  // exposed so traffic can seed its own walks from
                                  // points actually along the player's route instead
                                  // of a uniformly random spot anywhere on the map.
  const legDescs = [];
  for(let leg = 0; leg <= nTurns; leg++){
    const maxBlocks = 1 + Math.floor(rng()*2);   // 1-2 blocks/leg — narrowed further (was 1-3, originally 3-6) to bring the worst case under a 3mi max, same turn character
    let blocks = 0;
    for(let b=0; b<maxBlocks; b++){
      if(!cur.conn[dir]) break;
      const d = DIRV[dir];
      const nxt = nodeAt(cur.i + d.x, cur.j + d.y);
      if(!nxt) break;
      cur = nxt; blocks++;
      visited.push(cur);
    }
    if(blocks > 0){
      legDescs.push({ f:dir, blocks });
    } else if(legDescs.length === 0){
      let alt = 0; while(alt<4 && !cur.conn[alt]) alt++;
      if(alt === 4) break;
      dir = alt; leg--; continue;
    }
    if(leg < nTurns){
      let attemptSign = turnSign;
      let nd = ((dir + attemptSign) % 4 + 4) % 4;
      if(!cur.conn[nd]){ attemptSign = -attemptSign; nd = ((dir + attemptSign) % 4 + 4) % 4; }
      if(!cur.conn[nd]) break;
      dir = nd;
      turnSign = -attemptSign;   // alternate from the sign ACTUALLY used, not the original
                                  // intended one — the old code flipped once for the fallback
                                  // then flipped again unconditionally, canceling out and
                                  // silently permitting two same-direction turns in a row
                                  // whenever a boundary block triggered the fallback.
    }
  }

  /* per-corner radius: only OUTSIDE turns (sign === -ROBOT_SIDE) get the
     smaller turnR — those are the only ones that cross the street via
     ramps and need their tangent points aligned to them. INSIDE turns
     (walk stays on continuous sidewalk, no ramps at all — see the
     "outside-turn crossings" block below) keep CORNER_R exactly as
     before; they were never part of the ramp-alignment problem and
     shrinking their radius too is what broke them just now — CORNER_R's
     own comment explains why it can't safely go smaller for a lane that
     has no ramp-crossing reason to. Precomputed per corner (not inline
     in the loop) because trimS on leg i+1 has to match the SAME radius
     used for trimE on leg i — both sides of one corner must agree or
     the fillet stops being tangent. */
  const cornerSign = [];
  for(let c = 0; c < legDescs.length - 1; c++){
    const f0 = legDescs[c].f, f1 = legDescs[c+1].f;
    cornerSign.push(((f1 - f0 + 4) % 4 === 1) ? 1 : -1);
  }
  const cornerRadius = cornerSign.map(sg => sg === -ROBOT_SIDE ? turnR : CORNER_R);

  const segs = [];
  let s = 0, p = { x:startNode.x, y:startNode.y };
  for(let i = 0; i < legDescs.length; i++){
    const f = legDescs[i].f, d = DIRV[f], rv = DIRV[(f+1)%4];
    const legLen = legDescs[i].blocks * BLOCK;
    const trimS = i > 0 ? cornerRadius[i-1] : 0;
    const trimE = i < legDescs.length-1 ? cornerRadius[i] : 0;
    const lineLen = legLen - trimS - trimE;
    segs.push({ type:"line", s0:s, s1:s+lineLen, f, hA:f*Math.PI/2,
                start:{ x:p.x + d.x*trimS, y:p.y + d.y*trimS } });
    s += lineLen;
    const cornerP = { x:p.x + d.x*legLen, y:p.y + d.y*legLen };
    if(i < legDescs.length-1){
      const sign = cornerSign[i];
      const R = cornerRadius[i];
      const center = {
        x: cornerP.x - d.x*R + sign*rv.x*R,
        y: cornerP.y - d.y*R + sign*rv.y*R };
      const startPt = { x:cornerP.x - d.x*R, y:cornerP.y - d.y*R };
      const a0 = Math.atan2(startPt.y - center.y, startPt.x - center.x);
      const arcLen = Math.PI/2 * R;
      segs.push({ type:"arc", s0:s, s1:s+arcLen, center, a0, sign,
                  R, hA:f*Math.PI/2, f });
      s += arcLen;
    }
    p = cornerP;
  }
  return { segs, totalLen: s || 1, nodes: visited };
}

/* ---------- traffic: reuses buildWalk verbatim for each route, two
   cars per route (one each direction, opposite lane) ---------- */
function buildTraffic(grid, rng, nRoutes, pathNodes){
  const cars = [];
  for(let r = 0; r < nRoutes; r++){
    const routeRng = mulberry32(Math.floor(rng()*4294967296));
    /* seed from a random point ALONG the player's own route path (if
       given) instead of a uniformly random grid node. Also: a SHORT
       turn range (2-3 vs the player's 5-10) so each loop's own
       footprint stays small and local to that seed point instead of
       wandering off across the map -- otherwise "starts near the
       player" didn't mean "stays anywhere near the player", since the
       loop keeps re-tracing whatever path it wandered into. */
    const seedNode = pathNodes && pathNodes.length ? pathNodes[Math.floor(rng()*pathNodes.length)] : null;
    const walk = buildWalk(grid, routeRng, seedNode, {min:2, max:3});
    if(!walk.segs.length) continue;
    /* 0.055-0.085 units/ms — roughly 3x the original crawl. The robot
       clamps at 0.15, cruises ~0.10; city traffic should read faster
       than a delivery robot, and at the old 0.02-0.034 it never did.
       (On-device report: "the speed of the cars/truck doesn't seem
       fast enough.") */
    const speed = 0.055 + rng()*0.03;
    const sBase = rng()*walk.totalLen;
    cars.push({ walk, sBase, speed, dir:1, laneOffset:CAR_LANE, kind: rng()<0.6?"car":"truck", colorSeed: Math.floor(rng()*0xffffffff) >>> 0 });
    cars.push({ walk, sBase:(sBase + walk.totalLen*0.5) % walk.totalLen,
                speed: speed*(0.85+rng()*0.3), dir:-1, laneOffset:-CAR_LANE,
                kind: rng()<0.6?"car":"truck", colorSeed: Math.floor(rng()*0xffffffff) >>> 0 });
    /* third car on the same loop, staggered a third of the way around
       and running the opposite direction to the first -- same loop,
       same lane geometry, just another phase so the loop reads as busy
       instead of empty most of the time. */
    cars.push({ walk, sBase:(sBase + walk.totalLen*0.33) % walk.totalLen,
                speed: speed*(0.9+rng()*0.25), dir:1, laneOffset:CAR_LANE,
                kind: rng()<0.6?"car":"truck", colorSeed: Math.floor(rng()*0xffffffff) >>> 0 });
  }
  return cars;

}

/* standalone path helpers for generateRoute (a plain function, no `this`) —
   mirror the scene's own segAt/posAt/headingAt exactly so hazard placement
   lines up with wherever the robot's own position code says it should. */
function segsSegAt(segs, s){
  for(const sg of segs) if(s <= sg.s1) return sg;
  return segs[segs.length-1];
}
function segsPosAt(segs, s){
  const sg = segsSegAt(segs, s);
  const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
  if(sg.type === "line"){
    const d = DIRV[sg.f], u = clamp(s, sg.s0, sg.s1) - sg.s0;
    return { x: sg.start.x + d.x*u, y: sg.start.y + d.y*u };
  }
  const a = sg.a0 + sg.sign * (clamp(s, sg.s0, sg.s1) - sg.s0) / sg.R;
  return { x: sg.center.x + Math.cos(a)*sg.R, y: sg.center.y + Math.sin(a)*sg.R };
}
function segsHeadingAt(segs, s){
  const sg = segsSegAt(segs, s);
  const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
  if(sg.type === "line") return sg.hA;
  return sg.hA + sg.sign * (clamp(s, sg.s0, sg.s1) - sg.s0) / sg.R;
}
function segsWorldOf(segs, s, offsetUnits){
  const hdg = segsHeadingAt(segs, s), p = segsPosAt(segs, s);
  const rvx = -Math.sin(hdg), rvy = Math.cos(hdg);
  return { x: p.x + rvx*offsetUnits, y: p.y + rvy*offsetUnits };
}
/* pure, shared by both the renderer and the collision check (drawRobot)
   so a car's hitbox always matches exactly where it's drawn -- same
   principle as dogSpotAt/dogFleeAt already use for the dog. */
function trafficWorldAt(tr, t){
  const trTotal = tr.walk.totalLen;
  const trS = ((tr.sBase + t*tr.speed*tr.dir) % trTotal + trTotal) % trTotal;
  const hdg = segsHeadingAt(tr.walk.segs, trS) + (tr.dir < 0 ? Math.PI : 0);
  const fi = Math.round(hdg / (Math.PI/2));
  const trF = ((fi % 4) + 4) % 4;
  const wp = segsWorldOf(tr.walk.segs, trS, tr.laneOffset);
  wp.z = 0;
  return { wp, f: trF, trS };
}

/* the address (and, later, the pickup) needs to sit on a straight leg
   whose heading is f===0 or f===3 — the two directions the block-wrap
   cutaway never touches. f===1/f===2 are exactly the headings where a
   nearby block's near wall gets cut away, so a door placed on one of
   those legs could have its own house wall vanish out from under it
   the moment the robot arrives. Search outward from the natural
   position (still totalLen-90 / SPAWN_S+90 — this does NOT change
   route length or leg count, just which existing point along the
   already-generated route gets used) for the nearest usable leg. */
function findGoodS(segs, totalLen, preferredS, scanFromEnd, grid, avoidBlock, minS = 0){
  const isGood = sg => sg.type === "line" && GOOD_LEG_HEADING[sg.f];
  /* PERIMETER GUARD: a good leg can still run along the grid's outer edge
     with the robot's lane facing OUTWARD, off the grid. There, the address
     forcing (findAdjacentBlock -> .type="housing") clamps to a far interior
     block that the robot never reaches, while the building actually rendered
     at the robot's side is an exterior lot (buildExteriorLots) whose type is
     never forced -- so the route can end in front of a park or a business
     instead of a house. Reject any candidate whose near-side probe leaves the
     interior grid. Probe MUST match findAdjacentBlock's (same nearOff) so the
     leg we accept is the leg whose interior block is the one that gets forced.
     AVOID_BLOCK: the pickup must not land on the address's own block — a single
     block is forced to ONE type, so a shared block means the pickup silently
     renders as the address house instead of a shop. Passing the address block
     here keeps dropoff and pickup on distinct blocks so each gets its own type. */
  const nearOff = ROBOT_SIDE * (ROAD_HALF + SIDEWALK_W + T2*2);
  const facesInterior = (s) => {
    if(!grid) return true; // no grid supplied -> legacy behaviour (never reject)
    const p = segsWorldOf(segs, s, nearOff);
    const bi = Math.floor(p.x / BLOCK), bj = Math.floor(p.y / BLOCK);
    return bi >= 0 && bi <= grid.cols-2 && bj >= 0 && bj <= grid.rows-2;
  };
  const order = scanFromEnd ? [...segs].reverse() : segs;
  let interiorFallback = null; // interior-facing, but on the avoided block
  let anyFallback = null;      // any usable good leg (even facing outward)
  for(const sg of order){
    if(!isGood(sg)) continue;
    const len = sg.s1 - sg.s0;
    const inset = Math.min(90, len*0.3);
    /* minS floor (used by the door search to guarantee a >= 1 mile
       route): any candidate below it is skipped entirely — legs wholly
       under the floor never qualify, straddling legs clamp up to it. */
    const lo = Math.max(sg.s0 + inset, minS), hi = sg.s1 - inset;
    if(hi < lo) continue; // leg too short (or wholly under minS) — skip
    const s = Math.max(lo, Math.min(hi, preferredS));
    if(anyFallback === null) anyFallback = s;
    if(!facesInterior(s)) continue;                 // perimeter — reject (guard)
    if(interiorFallback === null) interiorFallback = s;
    if(avoidBlock && grid){
      const blk = findAdjacentBlock(segs, s, grid);
      if(blk === avoidBlock) continue;              // same block as the address — keep looking
    }
    return s; // interior-facing, distinct-block good leg — the ideal case
  }
  // graceful degradation on tight routes: prefer an interior-facing leg (correct
  // building type) even if it shares the address block, over an outward leg.
  if(interiorFallback !== null) return interiorFallback;
  if(anyFallback !== null) return anyFallback;
  return Math.max(0, Math.min(totalLen, preferredS)); // no good leg anywhere (rare)
}

/* which real block sits next to a given route position — only valid
   for a "line" segment with f===0 or f===3 (guaranteed by findGoodS's
   search), same restriction the block-wrap cutaway already relies on.
   The robot's fixed sidewalk lane means the near block edge is always
   (f+2)%4 — for f===0 (east) that's the block one row NORTH of the
   street; for f===3 (north), one column WEST of it. Same derivation
   already verified for the cutaway system, just read in the other
   direction (position -> block, not heading -> edge-to-cut). */
function findAdjacentBlock(segs, s, grid){
  /* previously: a distinct, correct formula for f===0 only, with f===1/2/3
     all lumped into one shared "else" branch — wrong for at least f===2
     (confirmed: picked a block over 1300 units from where the route
     segment actually reaches, on west-heading final legs). Replaced with
     a single formula that works for all 4 headings by construction: probe
     the world point the robot's own lane offset actually sits at (same
     segsWorldOf convention used everywhere else — traffic, hazards, the
     robot's own position), then floor it directly into a grid cell. No
     per-direction sign table to get wrong. Validated 0 offset across 400
     test routes spanning all headings and grid-boundary cases. */
  const off = ROBOT_SIDE * (ROAD_HALF + SIDEWALK_W + T2*2);
  const probe = segsWorldOf(segs, s, off);
  let bi = Math.floor(probe.x / BLOCK);
  let bj = Math.floor(probe.y / BLOCK);
  bi = Math.max(0, Math.min(grid.cols-2, bi));
  bj = Math.max(0, Math.min(grid.rows-2, bj));
  return grid.blocks.find(b => b.i === bi && b.j === bj) || null;
}

/* which packed unit (house/store) on an edge is actually closest to
   where a route position crosses that edge — NOT always the first
   one. On a long edge (a full block face can be 1600+ units) the
   route can cross anywhere along it, while packEdge/packEdgeNoGap's
   units[0] always sits near one fixed end; picking units[0]
   unconditionally could put the address/pickup unit over a thousand
   units from where the route actually is. */
function closestUnitIndex(units, targetAlong){
  let best = 0, bestDist = Infinity;
  units.forEach((u, idx) => {
    const mid = u.start + u.w/2;
    const d = Math.abs(mid - targetAlong);
    if(d < bestDist){ bestDist = d; best = idx; }
  });
  return best;
}

function generateRoute(dateStr){
  const seed = hashStr(dateStr);
  const rng = mulberry32(seed);
  const hood = HOODS[seed % HOODS.length];

  /* real street grid, generated independently of the walked route —
     this is what makes actual intersections possible. */
  const cols = 12 + Math.floor(rng()*6);
  const rows = 12 + Math.floor(rng()*6);
  const grid = buildGrid(cols, rows, seed);
  const walk = buildWalk(grid, rng, undefined, undefined, TURN_R);
  const segs = walk.segs, totalLen = walk.totalLen;

  const inCorner = sv => segs.some(sg => sg.type === "arc" && sv > sg.s0 - CORNER_R && sv < sg.s1 + CORNER_R);
  const facingAt = sv => {
    for(const sg of segs) if(sv >= sg.s0 && sv <= sg.s1) return sg.f;
    return segs[segs.length-1].f;
  };
  /* verifies a candidate placement against the grid directly instead of
     predicting conflicts via s-distance heuristics — a long route can
     pass near its own earlier path, which no local margin can see. */
  const onSidewalk = (s, offsetUnits) => {
    const wp = segsWorldOf(segs, s, offsetUnits);
    return grid.classify(wp.x, wp.y) === "sidewalk";
  };
  const onRoad = (s, offsetUnits) => {
    const wp = segsWorldOf(segs, s, offsetUnits);
    return grid.classify(wp.x, wp.y) === "road";
  };

  /* snap a candidate along-path s to the nearest REAL sidewalk tile
     center (grid.sidewalkRuns, the same T2 grid buildSidewalkGeometry
     draws) — for tile-sized props like the slab, an unsnapped s can
     land anywhere within a tile, so the panel straddles a seam or
     bleeds toward the road edge instead of sitting on one panel.
     Only the along-path component needs correcting: laneOffset(row)
     already lands exactly on the tile's row center by construction
     (same ROAD_HALF+(t+0.5)*T2 formula the tile grid itself uses). */
  const snapToSidewalkTile = (sv, row) => {
    const wp = segsWorldOf(segs, sv, laneOffset(row));
    let best = null, bestD = Infinity;
    for(const tl of grid.sidewalkRuns){
      const d = (tl.x-wp.x)*(tl.x-wp.x) + (tl.y-wp.y)*(tl.y-wp.y);
      if(d < bestD){ bestD = d; best = tl; }
    }
    if(!best || bestD > (T2*1.5)*(T2*1.5)) return null; // no real tile nearby (corner mesh) — don't place one
    const d = DIRV[facingAt(sv)];
    const ds = (best.x-wp.x)*d.x + (best.y-wp.y)*d.y;
    return Math.round(sv + ds);
  };

  /* ---------- straight-through street crossings ----------
     The only places on a route where the robot's sidewalk genuinely
     BREAKS. Corners never do it — they're filleted arcs on continuous
     sidewalk (the robot never leaves its own walk going around one,
     which is exactly why the original "curb ramps at every corner"
     plan for prop.sidewalkend/sidewalkbegin never fit; see
     docs/DESIGN.md "Sidewalkend curb ramps", open placement question).
     But a 2-block leg passes straight THROUGH an interior grid node,
     and classifyAt gives the crossing street's road priority over our
     sidewalk band — so the walk really does end at sN-ROAD_HALF and
     begin again at sN+ROAD_HALF. Both boundaries land exactly on tile
     seams by construction (ROAD_HALF = 4*T2, nodes at multiples of
     BLOCK = 34*T2), which is the whole-tile snap the ramp spec asks
     for, with zero snapping needed.
     A node only cuts OUR band if a road edge extends toward the
     robot's own side: ROBOT_SIDE = -1 puts the walk along
     -DIRV[(f+1)%4] = DIRV[(f+3)%4], so the test is conn[(f+3)%4] —
     a T-intersection whose stem points the other way leaves our
     sidewalk unbroken (classifyAt's OVERSHOOT window confirms this:
     the band sits entirely outside that stem's along-extent). */
  const crossings = [];
  for(const sg of segs){
    if(sg.type !== "line") continue;
    const d = DIRV[sg.f], rv = DIRV[(sg.f+1)%4];
    for(const n of grid.nodes){
      if(!n.conn[(sg.f+3)%4]) continue;                    // no road on the robot's side
      const relX = n.x - sg.start.x, relY = n.y - sg.start.y;
      if(Math.abs(relX*rv.x + relY*rv.y) > 1) continue;    // node not on this leg's centerline
      const sN = sg.s0 + (relX*d.x + relY*d.y);
      /* both 2-tile-deep ramps must fit fully inside this straight leg —
         this also cleanly rejects the leg's own endpoint/corner nodes
         (they sit at or beyond s0/s1) and route start/end crossings,
         where a lone half-pair would read as broken. */
      if(sN - ROAD_HALF - 2*T2 < sg.s0 || sN + ROAD_HALF + 2*T2 > sg.s1) continue;
      /* crossings are stored as SPANS of route-s where the walk is
         genuinely gone — [sA, sB] — so straight crossings and turn
         crossings (below) share one geometry model everywhere
         downstream: ramps at the span's ends, street level between. */
      crossings.push({ sA: sN - ROAD_HALF, sB: sN + ROAD_HALF, fIn: sg.f, fOut: sg.f });
    }
  }

  /* ---------- outside-turn crossings ----------
     The earlier "corners never break the walk" note is only true of
     INSIDE turns (sidewalk on the inside of the bend, robot radius
     CORNER_R - |laneOff|, sweep stays on the corner sidewalk patch).
     On an OUTSIDE turn the robot's radius is CORNER_R + |laneOff| and
     its real arc cuts diagonally across the intersection corner —
     over its own curb and/or the side street's, past the corner point,
     back up onto the new street's walk (traced numerically: row 0 dips
     ~46 units past its own curb, row 3 crosses the side street's curb
     ~270 units out). Which side is "outside" falls out of the arc's
     own sign: sign=+1 turns toward +rv, and ROBOT_SIDE=-1 puts the
     walk at -rv, so outside ⟺ sign === -ROBOT_SIDE.
     The junction model is the lab-approved sidewalkendturn shape,
     built ONLY from the two existing straight ramps per Sir's spec
     (no sidewalkbeginTurn): ramp down on the last two tiles of the
     straight before the arc (old heading), the whole sweep at street
     level, ramp up on the first two tiles after it (new heading).
     Arc endpoints sit TURN_R = 5*T2 from the node (player route only —
     see TURN_R's own comment) — tile-aligned by construction, same free
     alignment the straight crossings got, and now the SAME 5*T2 the
     ramps themselves sit at, so the turn+tip mechanic (gated on
     seg.type==="arc" elsewhere) starts and ends on the ramps instead of
     several tiles early/late. */
  for(let i = 0; i < segs.length; i++){
    const sg = segs[i];
    if(sg.type !== "arc") continue;
    if(sg.sign !== -ROBOT_SIDE) continue;                  // inside turn: walk never breaks
    const prev = segs[i-1], next = segs[i+1];
    if(!prev || !next || prev.type !== "line" || next.type !== "line") continue;
    /* ramps must fit on the adjacent straights (always true for
       >=1-block legs: lineLen >= BLOCK - 2*TURN_R = 24*T2 on the player
       route (was 18*T2 at the old CORNER_R trim), but the guard keeps
       route-shape assumptions out of the invariant) */
    if(sg.s0 - 2*T2 < prev.s0 + T2 || sg.s1 + 2*T2 > next.s1 - T2) continue;
    /* the corner NODE's world position, recovered from the arc's own
       stored geometry (center = cornerP - d*sg.R + sign*rv*sg.R,
       inverted — uses sg.R, not the CORNER_R constant, since the
       player route now builds this arc at TURN_R). Still WORLD-anchored
       rather than route-s anchored for the lateral (cross-axis) offset,
       since laneOff still shifts a diagonal-crossing robot off the
       centerline the same way it always did — but now that the arc's
       own endpoints sit at TURN_R (== the ramps' own ROAD_HALF+T2), the
       along-axis component lines up with the true curb by construction
       instead of needing the 8-tiles-out correction this used to. */
    const dA = DIRV[sg.f], rvA = DIRV[(sg.f+1)%4];
    const nx = sg.center.x + dA.x*sg.R - sg.sign*rvA.x*sg.R;
    const ny = sg.center.y + dA.y*sg.R - sg.sign*rvA.y*sg.R;
    crossings.push({ kind:"turn", sA: sg.s0, sB: sg.s1, nx, ny,
                     fIn: sg.f, fOut: (sg.f + sg.sign + 4) % 4 });
  }
  /* keep every other spawn out of any crossing span: the gap itself
     plus one ramp (2 tiles) each side, small margin on top. Checked
     inside spawnBlocked so every spawn loop below inherits it —
     MIN_GAP_S/MIN_GAP_OFFSET alone can't protect a 2x3-tile decal
     (60 < the ramp's own 92-unit half-depth, and the row-offset gate
     only sees the anchor row, not the full 3-row span). */
  const CROSSING_CLEAR = 2*T2 + 30;
  const inCrossing = sv => crossings.some(cx => sv > cx.sA - CROSSING_CLEAR && sv < cx.sB + CROSSING_CLEAR);

  /* RULE: no two props/hazards stack at the same spot. Every spawn loop
     below checks a candidate placement against everything already
     placed this route (both hazards[] and props[], since either array
     can hold something at a given lane) before pushing — same-lane
     items within MIN_GAP_S of each other are rejected. offsetOf()
     normalizes the two placement conventions in use (row = sidewalk
     lane index, roadOffset = raw lateral offset) to one comparable
     number. This is a placement-time check, not a runtime one: once
     the route is built, item positions don't move (flee/wander only
     animate the art, not the spawn point), so checking once here is
     sufficient — nothing needs to re-check at draw time. */
  const MIN_GAP_S = 60, MIN_GAP_OFFSET = T2*0.6;
  const offsetOf = item => item.row !== undefined ? laneOffset(item.row) : item.roadOffset;
  const spawnBlocked = (s, offsetUnits) => {
    if(inCrossing(s)) return true;   // nothing spawns in an intersection crossing or on its curb ramps
    for(const list of [hazards, props]){
      for(const it of list){
        if(Math.abs(it.s - s) < MIN_GAP_S && Math.abs(offsetOf(it) - offsetUnits) < MIN_GAP_OFFSET) return true;
      }
    }
    return false;
  };

  /* ---------- virtual grade profile ----------
     Grades are FEEL, not geometry: this profile is consumed as SLOPE
     only (pitch, hill gravity, speed strain — the physics ramp-lab and
     the sidewalkend lab already dialed, live in the sim since). groundZ
     stays hard-zero, so the flat-drawn world and every z consumer
     (props, doors, robot, camera) remain in exact agreement — the
     "robot floats above his own street" failure of literal 1D heights
     can't happen. True drawn elevation stays the deferred "real 2D
     system across the grid" this comment block used to punt on.
     The model is spatially consistent: two octaves of node-lattice
     value noise over WORLD position (wavelengths two blocks and one
     block), scaled by the hood's hill knob — so a crossing sampled
     twice by the route gets one answer, The Flats (hill 0) stays
     perfectly flat, and The Bluffs (hill 1) becomes a leg-burner. */
  const lerp = (a, b, t) => a + (b - a)*t;
  const HILL_AMP = 73 * hood.hill;   // retuned so hill:1 (The Bluffs) tops out
                                      // around a 5% grade — see MAX_GRADE clamp
                                      // on the pitch calc below for the hard cap
  /* directional bias: real slope should agree with the isometric
     camera's own depth cue instead of being pure coin-flip noise. W()'s
     screen-y is (x+y)*0.5 - z, so +x/+y (f=0/f=1) increases screen-y —
     lower on screen, which reads as coming toward the viewer/downhill —
     and -x/-y (f=2/f=3) reads the opposite, uphill. Before this,
     elevAtWorld was symmetric noise with no relationship to that reading
     at all. GRADE_BIAS is sized to roughly match the noise octaves' own
     typical per-block slope (see oct() below) so it reliably sets the
     overall trend direction per leg without flattening out the local
     texture/bumps the noise still provides. Scales with HILL_AMP like
     everything else here, so The Flats (hill 0) stays exactly flat —
     no bias either. Tune GRADE_BIAS's multiplier on HILL_AMP/BLOCK if
     playtesting wants the trend stronger/weaker relative to the bumps. */
  const GRADE_BIAS = HILL_AMP / BLOCK;
  const elevLattice = (i, j) =>
    mulberry32(((i*73856093) ^ (j*19349663) ^ (seed ^ 0x9e37)) >>> 0)() - 0.5;
  const smoothT = v => v*v*(3 - 2*v);
  const elevAtWorld = (x, y) => {
    if(HILL_AMP === 0) return 0;
    const oct = (wl, w) => {
      const u = x/(BLOCK*wl), v = y/(BLOCK*wl);
      const i0 = Math.floor(u), j0 = Math.floor(v);
      const fu = smoothT(u - i0), fv = smoothT(v - j0);
      return w * lerp(lerp(elevLattice(i0, j0),   elevLattice(i0+1, j0),   fu),
                      lerp(elevLattice(i0, j0+1), elevLattice(i0+1, j0+1), fu), fv);
    };
    return HILL_AMP * (oct(2, 1) + oct(1, 0.5)) - GRADE_BIAS * (x + y);
  };
  const tiles = [];
  const nT = Math.ceil(totalLen / (TILE*2)) + 3;
  for(let i = 0; i < nT; i++){
    const p = segsPosAt(segs, Math.min(i*T2, totalLen));
    tiles.push(elevAtWorld(p.x, p.y));
  }
  /* two passes of light smoothing so grades ease at block seams
     instead of kinking the pitch */
  for(let pass = 0; pass < 2; pass++)
    for(let i = 1; i < nT-1; i++) tiles[i] = (tiles[i-1] + 2*tiles[i] + tiles[i+1]) / 4;


  /* hazards along the route; corners stay clear (the corner IS the hazard
     there), and classify() is the final word on every placement.
     props[] is declared here too (not down by the palm loop where it
     used to be) — spawnBlocked() closes over both arrays and its first
     call site is inside this loop, so props has to exist before this
     loop runs, not after it. */
  const hazards = [];
  const props = [];

  /* ADA curb ramps at both ends of every crossing SPAN — straight
     crossings and outside turns alike (see crossings[] above).
     Down-ramp owns the LAST two walk tiles before the span (anchor at
     sA - T2, prop spans anchor±T2 along-travel), up-ramp mirrors it on
     the far side, each oriented to its own end's heading (fIn/fOut —
     identical for straights, perpendicular for turns). Pad tile
     touching the street in both, per the ADA spec the lab settled on.
     Cross axis: the prop is 3 tiles wide but the game sidewalk is 4
     rows; row:1 centers it on rows 0-2 exactly on tile seams
     (laneOffset(1) ± 1.5*T2 = ROAD_HALF .. ROAD_HALF+3*T2), leaving
     row 3 (building side) as plain flat walk — the choice that keeps
     the ramp against the street corner where a real one sits. */
  for(const cx of crossings){
    if(cx.kind !== "turn"){
      hazards.push({ type:"sidewalkend",   s: cx.sA - T2, row: 1, f: cx.fIn,  hit:true });
      hazards.push({ type:"sidewalkbegin", s: cx.sB + T2, row: 1, f: cx.fOut, hit:true });
      continue;
    }
    /* turn crossings: world-anchored at the TRUE curb lines (see the
       detection note above). Down-ramp: (ROAD_HALF + T2) before the
       node along the OLD heading — exactly where a straight crossing's
       near ramp would sit — cross-centered on rows 0-2 via
       laneOffset(1), tile-aligned by construction. Up-ramp mirrored
       along the NEW heading. hz.s carries the arc span midpointish
       value purely for the near()-culling and sorting paths that
       expect one; position comes from wx/wy. */
    const dI = DIRV[cx.fIn],  rI = DIRV[(cx.fIn+1)%4];
    const dO = DIRV[cx.fOut], rO = DIRV[(cx.fOut+1)%4];
    const off1 = laneOffset(1);
    hazards.push({ type:"sidewalkend", row: 1, f: cx.fIn, hit:true, s: cx.sA,
      wx: cx.nx - dI.x*(ROAD_HALF + T2) + rI.x*off1,
      wy: cx.ny - dI.y*(ROAD_HALF + T2) + rI.y*off1, wz: 0 });
    hazards.push({ type:"sidewalkbegin", row: 1, f: cx.fOut, hit:true, s: cx.sB,
      wx: cx.nx + dO.x*(ROAD_HALF + T2) + rO.x*off1,
      wy: cx.ny + dO.y*(ROAD_HALF + T2) + rO.y*off1, wz: 0 });
  }
  /* pigeon flocks: living set dressing. Density follows the crumbs
     (hood.litter); middle rows only so a milling flock's ±30-unit
     wander stays on the walk; line legs only, never in a crossing.
     hz.fledAt starts null — the sim stamps it when the robot drives in
     and the whole flock bursts skyward (see the pigeons sim branch). */
  {
    const nFlocks = 2 + Math.floor(rng() * (2 + hood.litter * 3));
    let placedF = 0;
    for(let i = 0; i < nFlocks*8 && placedF < nFlocks; i++){
      const s = snapToSidewalkTile(SPAWN_S + 400 + rng()*(totalLen - 800), 1);
      const srow = 1 + Math.floor(rng()*2);
      const sg2 = segs.find(g => s >= g.s0 && s <= g.s1);
      if(!sg2 || sg2.type !== "line") continue;
      if(inCorner(s) || inCrossing(s)) continue;
      if(!onSidewalk(s, laneOffset(srow))) continue;
      if(spawnBlocked(s, laneOffset(srow))) continue;
      hazards.push({ type:"pigeons", s, row: srow, f: sg2.f, hit:false, fledAt: null });
      placedF++;
    }
  }

  /* grade chevrons: DISABLED per Sir's request (2026-07-17) — the yellow
     slope-indicator chevrons are gone from the walk. The underlying hill
     physics (pitch, hill gravity, speed strain — driven by the `tiles`
     elevation profile via groundSlope/elevAt, not by these hazard
     markers) are completely untouched; this only stops the paint from
     spawning. Re-enable by restoring the loop body below if wanted back. */

  const density = 0.45 + hood.litter*0.35 + (1 - hood.pave)*0.3;
  let hs = SPAWN_S + 120;
  while(hs < totalLen - 220){
    /* halved step = DOUBLED obstacle count (requested). spawnBlocked's
       60-unit floor still guarantees breathing room between props, and
       crossing/corner exclusions are unchanged — the course just gets
       twice as busy. Cracks and slabs keep their own dedicated passes
       and levers. */
    hs += ((330 - density*176) + rng()*198) * 0.5;
    const hsR = Math.round(hs);
    if(inCorner(hsR)) continue;
    const lane = Math.floor(rng()*4);
    if(!onSidewalk(hsR, laneOffset(lane))) continue;
    if(spawnBlocked(hsR, laneOffset(lane))) continue;
    const r2 = rng();
    let type;
    /* crack used to be a branch here (r2 < (1-hood.pave)*0.45), but
       moved to its own dedicated spawn pass below -- same reason
       slabs already have their own loop instead of sharing this
       roll: a 3x density target needs a spacing lever, and cracks
       can't get one while sharing a single probability budget with
       scooter/trash/cone/dog/people/bin/planter. Removing the branch
       here doesn't rebalance the rest -- litter/cone/dog+ranges are
       unchanged, cone's effective share just widens to cover what
       used to be crack's slice of r2. */
    if(r2 < hood.litter*0.35)          type = rng() < 0.6 ? "scooter" : "trash";
    else if(r2 < 0.75)                 type = "cone";
    else { const r3 = rng(); type = r3 < 0.25 ? "dog" : r3 < 0.48 ? "people" : r3 < 0.73 ? "bin" : "planter"; }
    const hzObj = { type, s: hsR, row: lane, f: facingAt(hsR), hit:false };
    if(type === "dog"){ hzObj.dogSeed = (rng()*4294967296) >>> 0;  // coat + scar + waypoints
                        hzObj.sit = rng() < 0.4; }                 // ~40% sitters
    if(type === "people"){ hzObj.peopleSeed = (rng()*4294967296) >>> 0; }  // body/skin/shirt/pants/hair/shoe
    if(type === "cone"){
      const preKnocked = rng() < 0.4;
      hzObj.phi = preKnocked ? CONE_HIT.phiRest : 0;
      hzObj.phase = preKnocked ? 2 : 1;
      hzObj.angVel = 0; hzObj.moving = false;
      hzObj.pose = preKnocked ? "knocked" : "standing";
      hzObj.slide = 0; hzObj.slideVel = 0;
      if(preKnocked) hzObj.fallPsi = rng()*Math.PI*2;
    }
    if(type === "bin"){
      const preKnocked = rng() < 0.4;
      hzObj.phi = preKnocked ? BIN_HIT.phiRest : 0;
      hzObj.angVel = 0; hzObj.moving = false;
      hzObj.pose = preKnocked ? "knocked" : "standing";
      hzObj.slide = 0; hzObj.slideVel = 0;
      hzObj.bonked = false;
      hzObj.items = []; hzObj.spilled = false;
      hzObj.thetaF = 0;
      if(preKnocked) hzObj.fallPsi = rng()*Math.PI*2;
    }
    if(type === "planter"){
      hzObj.scale = 1.0 + rng()*1.2;                 // 1.0-2.2x, straddles PLANTER_HIT.thresh (1.4)
      hzObj.variantIdx = Math.floor(rng()*PLANTER_VARIANTS.length);
      const preKnocked = rng() < 0.25;                // rarer than bin's 0.4 — a bigger visual event
      hzObj.phi = preKnocked ? PLANTER_HIT.phiRest : 0;
      hzObj.angVel = 0; hzObj.moving = false;
      hzObj.pose = preKnocked ? "knocked" : "standing";
      hzObj.bonked = false;
      hzObj.items = []; hzObj.spilled = false;
      if(preKnocked) hzObj.fallPsi = (rng()*2 - 1) * 0.4;   // small fall-direction jitter, same idea as bin's
    }
    if(type === "scooter"){
      /* 0.8 -> 0.5: at 80% dumped, routes with a few scooters routinely
         showed EVERY one down (reported once fallen/standing both read
         correctly). Half and half keeps the dockless-litter flavor with
         standing ones actually visible. Same single draw — layout
         stream unchanged; only the 0.5-0.8 band flips to standing. */
      const preKnocked = rng() < 0.5;
      /* ALONG the walk, nose either way, slop — the spawn's thetaF is
         what the draw actually uses (it overrides the draw branch's own
         seed, which is why the v32 constraint there was dead code for
         spawned scooters). The old free ±162° roll aimed dumped stems
         up-screen in iso, where a flat squashed scooter masquerades as
         standing with pancake wheels (on-device report). Parked AND
         fallen both read right lying on the street's own axis. */
      const uTh = rng();   // ONE draw for direction AND slop — keeps the
                           // spawn stream length identical, so the same
                           // date keeps the same world layout it had
                           // before this fix (two draws reshuffled every
                           // downstream roll: standing scooters re-rolled
                           // fallen, reported on-device)
      hzObj.thetaF = (uTh < 0.5 ? 0 : Math.PI) + (((uTh * 977) % 1) - 0.5) * 0.3;
      hzObj.brand = BRANDS[Math.floor(rng()*BRANDS.length)];
      hzObj.phi = preKnocked ? SCOOT_HIT.phiRest : 0;
      hzObj.angVel = 0; hzObj.moving = false;
      hzObj.pose = preKnocked ? "knocked" : "standing";
      hzObj.slide = 0; hzObj.slideVel = 0;
      if(preKnocked) hzObj.fallPsi = hzObj.thetaF;
    }
    hazards.push(hzObj);
  }

  /* palms: lane 3, farthest from the road — nearest the buildings, same
     "building-side" flavor the game already used. Real palms grow in
     clumps, not perfectly isolated — clusterExtras are small along/
     lateral offsets from the main (collidable) hazard, each with its
     own independently-rolled kind, purely decorative (never pushed
     into hazards[], so spawnBlocked/collision spacing is completely
     untouched — only the ONE real hazard per spawn point still counts
     for gameplay). Different offset = different position = drawProp's
     own position-seeded rng naturally varies lean/height/sway per
     companion without any extra seeding work needed. */
  for(let ps = SPAWN_S + 140; ps < totalLen - 220; ps += 286 + rng()*264){
    const psR = Math.round(ps);
    if(inCorner(psR)) continue;
    if(!onSidewalk(psR, laneOffset(3))) continue;
    if(spawnBlocked(psR, laneOffset(3))) continue;
    if(rng() < hood.palms){
      const sizeRoll = rng();
      const clusterSize = sizeRoll < 0.6 ? 1 : sizeRoll < 0.85 ? 2 : 3;
      const clusterExtras = [];
      for(let c=1; c<clusterSize; c++){
        clusterExtras.push({
          ds: (rng()-0.5)*70,
          dOff: (rng()-0.5)*T2*0.9,
          kind: rng() < 0.25 ? "palmDwarf" : "palm"
        });
      }
      hazards.push({
        type: rng() < 0.25 ? "palmDwarf" : "palm",
        s: psR, row:3, f: facingAt(psR), hit:false, clusterExtras });
    }
  }
  /* storefront dressing (prop.planter / prop.bin): the FAR sidewalk —
     the opposite side of the street from the robot's own lane. Pure
     decoration, never a hazard, never reachable (the robot's walk
     never puts it on that side of the road). */
  for(let fs = SPAWN_S + 160; fs < totalLen - 240; fs += 150 + rng()*160){
    const fsR = Math.round(fs);
    if(inCorner(fsR)) continue;
    const farLane = Math.floor(rng()*4);
    const off = farLaneOffset(farLane);
    if(!onSidewalk(fsR, off)) continue;
    if(spawnBlocked(fsR, off)) continue;
    if(rng() < 0.6) props.push({
      kind: rng() < 0.55 ? "planter" : "bin",
      s: fsR, roadOffset: off, f: facingAt(fsR) });
  }
  /* decorative road cracks: asphalt-tone spall out on the road itself,
     pure texture, zero physics (the impact check requires row===botRow,
     and these never get a `row` field at all, so they can never match). */
  for(let rs = SPAWN_S + 200; rs < totalLen - 260; rs += 380 + rng()*400){
    const rsR = Math.round(rs);
    if(inCorner(rsR)) continue;
    if(rng() > (1 - hood.pave)*0.8 + 0.1) continue;
    const off = (rng()<0.5?-1:1) * (T2 + rng()*T2*1.5);
    if(!onRoad(rsR, off)) continue;
    if(spawnBlocked(rsR, off)) continue;
    hazards.push({ type:"crack", s: rsR, roadOffset: off, surface: "road",
                   len: 24 + Math.floor(rng()*49), f: facingAt(rsR), hit:false });
  }

  /* hydrants: lane 0, closest to the road — the real curb side. */
  for(let ys = SPAWN_S + 220; ys < totalLen - 280; ys += 1056 + rng()*1144){
    const ysR = Math.round(ys);
    if(inCorner(ysR)) continue;
    if(!onSidewalk(ysR, laneOffset(0))) continue;
    if(spawnBlocked(ysR, laneOffset(0))) continue;
    if(rng() < 0.55){
      /* ~35% of spawned hydrants start already-burst (was 15% — too
         rare to ever meet, on-device). burstT far in the past so the
         hit-burst's own grow math clamps to 1 immediately.
         PRE-burst floods live ONE TILE OVER (pudDir · T2 along the
         walk) instead of pooling at the base like a fresh hit: old
         water has had time to RUN — and it runs DOWNHILL when the
         grade profile has an opinion, seeded coin on the flats. The
         slick zone moves with it (see the sim), so art and physics
         agree, and dodging the hydrant no longer means you dodged
         the water. */
      const startsBurst = rng() < 0.35;
      let pudDir;
      if(startsBurst){
        const ti = Math.round(ysR / T2);
        const sl = (tiles[Math.min(tiles.length-1, ti+1)] - tiles[Math.max(0, ti-1)]) / (2*T2);
        pudDir = sl > 0.02 ? -1 : sl < -0.02 ? 1 : (rng() < 0.5 ? -1 : 1);
      }
      hazards.push({ type:"hydrant", s: ysR, row: 0, f: facingAt(ysR),
                     hit:false, burst:startsBurst,
                     burstT: startsBurst ? -1e9 : undefined,
                     pudDir });
    }
  }

  /* heaved slabs (prop.slab): runs of bad sidewalk across the full
     4-lane band now, same drifting-run logic as before.
     3x density: spacing cut to a third (was 660+rng()*924) rather
     than scaling the 0.18+(1-pave)*0.75 success probability, since
     that already reaches ~0.78 in low-pave hoods -- tripling it
     would exceed 1.0 there. Spacing has no such ceiling. */
  let ss = SPAWN_S + 260;
  while(ss < totalLen - 320){
    ss += 200 + rng()*277;
    if(inCorner(ss)) continue;
    if(rng() > 0.18 + (1 - hood.pave)*0.75) continue;
    const runN = 1 + Math.floor(rng()*3);
    let srow = Math.floor(rng()*4);
    for(let k=0; k<runN; k++){
      const skR0 = Math.round(ss + k*TILE*2);
      if(inCorner(skR0)) break;
      if(!onSidewalk(skR0, laneOffset(srow))){ srow = Math.floor(rng()*4); continue; }
      const skR = snapToSidewalkTile(skR0, srow);
      if(skR === null || inCorner(skR) || !onSidewalk(skR, laneOffset(srow))){ srow = Math.floor(rng()*4); continue; }
      if(spawnBlocked(skR, laneOffset(srow))){ srow = Math.floor(rng()*4); continue; }
      hazards.push({ type:"slab", s: skR, row: srow,
                     lift: 3 + Math.floor(rng()*6),
                     side: rng() < 0.5 ? 1 : -1,
                     root: rng() < 0.55,
                     f: facingAt(skR), hit:false, lipHit:false });
      if(rng() < 0.6) srow = Math.max(0, Math.min(3, srow + (rng() < 0.5 ? -1 : 1)));
    }
    ss += runN*TILE*2;
  }

  /* sidewalk cracks (prop.crack): own pass now instead of a shared-roll
     branch, same reasoning as the slab loop above -- needs an
     independently tunable spacing to hit a 3x density target without
     touching scooter/trash/cone/dog/people/bin/planter's odds. */
  let cs = SPAWN_S + 180;
  while(cs < totalLen - 240){
    cs += 22 + rng()*110;
    if(inCorner(cs)) continue;
    if(rng() > (1 - hood.pave)*0.45) continue;
    const crow = Math.floor(rng()*4);
    if(!onSidewalk(cs, laneOffset(crow))) continue;
    const csR = snapToSidewalkTile(cs, crow);
    if(csR === null || inCorner(csR) || !onSidewalk(csR, laneOffset(crow))) continue;
    if(spawnBlocked(csR, laneOffset(crow))) continue;
    hazards.push({ type:"crack", s: csR, row: crow,
                   len: 24 + Math.floor(rng()*49), surface:"sidewalk",
                   f: facingAt(csR), hit:false });
  }

  /* parked car: on the road, off to one side (never blocking either
     traffic lane's centerline). */
  if(rng() < 0.5){
    const cs = Math.round(SPAWN_S + 150 + rng()*(totalLen - 500));
    const off = -1*(T2*1.5);
    if(!inCorner(cs) && onRoad(cs, off) && !spawnBlocked(cs, off)) props.push({ kind: rng() < 0.65 ? "car" : "truck", s: cs, roadOffset: off, f: facingAt(cs) });
  }

  /* the address */
  const number = 100 + Math.floor(rng()*3800);
  const street = hood.streets[Math.floor(rng()*hood.streets.length)];
  let doorS = findGoodS(segs, totalLen, totalLen - 90, true, grid, null, MIN_ROUTE_UNITS);
  /* graceful degradation: if no interior good leg exists past the mile
     mark (short-walk day), take the best route the map offers rather
     than none — findGoodS's own final fallback returns preferredS-ish
     even with the floor, so re-run unfloored only if the floored pick
     itself landed short (it only can via that last-resort path). */
  if(doorS < MIN_ROUTE_UNITS) doorS = Math.max(doorS, findGoodS(segs, totalLen, totalLen - 90, true, grid));

  /* the address is always a real block, forced to housing (a park or
     shop can't be the delivery destination); the pickup is always a
     real block, forced to commercial. Same override the lab used with
     a hardcoded i,j — now driven by where the route actually put
     doorS/pickupS instead of a fixed test position. */
  const addressBlock = findAdjacentBlock(segs, doorS, grid);
  if(addressBlock) addressBlock.type = "housing";
  /* pickup chosen AFTER the address block is known, so it can steer clear of
     it (a shared block can only hold one type, which would make the pickup
     render as the address house instead of a shop). */
  let pickupS = findGoodS(segs, totalLen, SPAWN_S + 90, false, grid, addressBlock);
  const doorHeadingF = segsSegAt(segs, doorS).f;
  const addressEdgeIdx = (doorHeadingF + 2) % 4;
  /* f===1/f===2 addresses only happen via findGoodS's rare no-good-leg
     fallback (see GOOD_LEG_HEADING) — the cutaway system says a house
     wall isn't safe to render on that heading. Rather than keep
     force-protecting a house there, this address renders as a fence
     with a gate instead (see queueHousingEdgeAt / drawGateFence) —
     the same treatment every OTHER house on a cut heading already
     gets, just with an opening so the customer still has somewhere
     to stand. */
  const addressUsesGate = !GOOD_LEG_HEADING[doorHeadingF];
  let addressUnitIdx = 0, addressSpot = null;
  if(addressBlock){
    const abEdges = [
      { ox: addressBlock.x0, oy: addressBlock.y0, dv: DIRV[0], rv: DIRV[3], len: addressBlock.x1-addressBlock.x0 },
      { ox: addressBlock.x1, oy: addressBlock.y0, dv: DIRV[1], rv: DIRV[0], len: addressBlock.y1-addressBlock.y0 },
      { ox: addressBlock.x1, oy: addressBlock.y1, dv: DIRV[2], rv: DIRV[1], len: addressBlock.x1-addressBlock.x0 },
      { ox: addressBlock.x0, oy: addressBlock.y1, dv: DIRV[3], rv: DIRV[2], len: addressBlock.y1-addressBlock.y0 }
    ];
    const ae = abEdges[addressEdgeIdx];
    const aeseed = ((Math.round(ae.ox*3+ae.dv.x)*7919) ^ (Math.round(ae.oy*3+ae.dv.y)*104729) ^ 0x9e3779b9) >>> 0;
    const aunits = packEdge(ae.len, mulberry32(aeseed));
    if(aunits.length){
      const aPos = segsPosAt(segs, doorS);
      const aAlong = ae.dv.x*(aPos.x-ae.ox) + ae.dv.y*(aPos.y-ae.oy);
      addressUnitIdx = closestUnitIndex(aunits, aAlong);
      /* the house actually selected (closestUnitIndex) can sit anywhere
         along this edge — houses pack ~220-390 units wide with gaps, so
         its real center is frequently 300-1600+ units from the original
         doorS target. doorS was never updated to match, which meant the
         win check (remain = doorS - botS, a ~94-unit window) was being
         measured against a point nowhere near the actual rendered door —
         confirmed on 200/200 test routes. addressSpot captures the real
         world position of the selected house so doorS can be refined to
         match it below, same fix pickupS already had for the shop. */
      const au = aunits[addressUnitIdx];
      const aux = ae.ox + ae.dv.x*au.start, auy = ae.oy + ae.dv.y*au.start;
      addressSpot = { x: aux + ae.dv.x*(au.w/2), y: auy + ae.dv.y*(au.w/2) };
    }
  }
  /* refine doorS to the address unit's actual on-route position. UNLIKE
     pickupS's refinement (which searches every good leg for the nearest
     match), this doesn't need to search at all: addressEdgeIdx was
     already derived from segsSegAt(segs, doorS) above, so the address
     unit is guaranteed to be on the block adjacent to THIS EXACT segment
     — no other leg is a candidate. Searching broadly (as first tried,
     copying pickupS's pattern verbatim) risked locking onto a
     geometrically-nearby PARALLEL street instead, since the building
     face sits ~736 units off centerline with nothing pulling the search
     toward the correct lane — confirmed on 11/200 test routes, with
     residuals up to 2738 units. Projecting onto the one segment we
     already know is correct removes that failure mode entirely. */
  if(addressSpot){
    const sg0 = segsSegAt(segs, doorS);
    const hdg0 = segsHeadingAt(segs, sg0.s0);
    const dirX0 = Math.cos(hdg0), dirY0 = Math.sin(hdg0);
    const p00 = segsPosAt(segs, sg0.s0);
    const segLen0 = sg0.s1 - sg0.s0;
    const inset0 = Math.min(90, segLen0*0.3);
    let k0 = (addressSpot.x-p00.x)*dirX0 + (addressSpot.y-p00.y)*dirY0;
    k0 = Math.max(inset0, Math.min(segLen0-inset0, k0));
    doorS = sg0.s0 + k0;
  }
  const pickupBlock = findAdjacentBlock(segs, pickupS, grid);
  if(pickupBlock && pickupBlock !== addressBlock) pickupBlock.type = "commercial";
  const pickupEdgeIdx = (segsSegAt(segs, pickupS).f + 2) % 4;

  /* the pickup spot is a real, sensible point (just outside the shop
     door) — the robot should spawn AT it, not the other way around.
     Since the robot's position is always route-driven (posAt(botS) +
     laneOffset), spawning it exactly at an independently-computed
     shop-relative point would either require breaking that (causing a
     jump the instant it starts moving) or finding the closest point
     ON the route that already lines up. Same edge-packing computation
     queueCommercialEdgeAt will independently do for rendering — kept
     in sync by storing the result once here rather than recomputing
     it twice and risking drift. */
  let pickupSpot = null, pickupUnitIdx = 0, pickupShopName = null;
  if(pickupBlock){
    const pbEdges = [
      { ox: pickupBlock.x0, oy: pickupBlock.y0, dv: DIRV[0], rv: DIRV[3], len: pickupBlock.x1-pickupBlock.x0 },
      { ox: pickupBlock.x1, oy: pickupBlock.y0, dv: DIRV[1], rv: DIRV[0], len: pickupBlock.y1-pickupBlock.y0 },
      { ox: pickupBlock.x1, oy: pickupBlock.y1, dv: DIRV[2], rv: DIRV[1], len: pickupBlock.x1-pickupBlock.x0 },
      { ox: pickupBlock.x0, oy: pickupBlock.y1, dv: DIRV[3], rv: DIRV[2], len: pickupBlock.y1-pickupBlock.y0 }
    ];
    const pe = pbEdges[pickupEdgeIdx];
    const peseed = ((Math.round(pe.ox*3+pe.dv.x)*7919) ^ (Math.round(pe.oy*3+pe.dv.y)*104729) ^ 0x51b3) >>> 0;
    const punits = packEdgeNoGap(pe.len, mulberry32(peseed));
    if(punits.length){
      const pPos = segsPosAt(segs, pickupS);
      const pAlong = pe.dv.x*(pPos.x-pe.ox) + pe.dv.y*(pPos.y-pe.oy);
      pickupUnitIdx = closestUnitIndex(punits, pAlong);
      const pu = punits[pickupUnitIdx];
      const pux = pe.ox + pe.dv.x*pu.start, puy = pe.oy + pe.dv.y*pu.start;
      const pDoorCenterX = pu.w/2, pRobotDy = T2*2.1;
      pickupSpot = {
        x: pux + pe.dv.x*pDoorCenterX + pe.rv.x*pRobotDy,
        y: puy + pe.dv.y*pDoorCenterX + pe.rv.y*pRobotDy
      };
      pickupShopName = hood.shops[Math.abs(Math.round(pux)+Math.round(puy)) % hood.shops.length];
    }
  }
  /* refine pickupS to the pickup unit's actual on-route position.
     PREVIOUSLY: searched every f===0/f===3 leg in the whole route for
     whichever point was closest to pickupSpot. That's the same
     broad-search pattern doorS's refinement tried first and rejected
     (see addressSpot's comment above: "copying pickupS's pattern
     verbatim ... confirmed on 11/200 test routes, with residuals up
     to 2738 units") — on a route that loops back near itself, a later
     unrelated leg can sit closer to pickupSpot in raw distance than
     the leg the shop was actually placed on, so pickupS would lock
     onto the WRONG leg. Since this.botS starts at route.pickupS and
     the robot's initial heading is headingAt(botS), that wrong leg
     meant an occasional wrong start-facing angle. Fixed the same way
     doorS was: no search at all. pickupEdgeIdx above was already
     derived from segsSegAt(segs, pickupS), so the pickup unit is
     guaranteed to be on the block adjacent to THIS EXACT segment —
     project onto it directly. */
  if(pickupSpot){
    const sg0 = segsSegAt(segs, pickupS);
    const hdg0 = segsHeadingAt(segs, sg0.s0);
    const dirX0 = Math.cos(hdg0), dirY0 = Math.sin(hdg0);
    const p00 = segsPosAt(segs, sg0.s0);
    const segLen0 = sg0.s1 - sg0.s0;
    const inset0 = Math.min(90, segLen0*0.3);
    let k0 = (pickupSpot.x-p00.x)*dirX0 + (pickupSpot.y-p00.y)*dirY0;
    k0 = Math.max(inset0, Math.min(segLen0-inset0, k0));
    pickupS = sg0.s0 + k0;
  }

  /* EXTERIOR-LOT BACKSTOP (degenerate routes only): findGoodS's perimeter
     guard keeps the door/pickup on an interior-facing leg whenever one
     exists. On a tiny route whose ONLY good legs all hug the grid edge
     facing outward (≈1% of days), it falls back to an outward leg — there
     the robot faces an exterior lot (buildExteriorLots), not an interior
     block, and that lot's random type is what forcing the interior block
     missed. Force the faced lot's type to match so the ending building is
     always the right kind: housing at the door, commercial at the pickup.
     (The full isAddress door/customer treatment on a lot is the shelved
     perimeter-delivery feature; this only guarantees the building TYPE.) */
  const forceFacedLot = (s, wantType) => {
    const off = ROBOT_SIDE * (ROAD_HALF + SIDEWALK_W + T2*2);
    const p = segsWorldOf(segs, s, off);
    const bi = Math.floor(p.x / BLOCK), bj = Math.floor(p.y / BLOCK);
    const interior = bi >= 0 && bi <= grid.cols-2 && bj >= 0 && bj <= grid.rows-2;
    if(interior) return; // faces a real interior block — already handled
    let best = null, bestD = Infinity;
    for(const l of grid.extLots){ const d = (l.cx-p.x)**2 + (l.cy-p.y)**2; if(d < bestD){ bestD = d; best = l; } }
    if(best) best.type = wantType;
  };
  forceFacedLot(doorS, "housing");
  forceFacedLot(pickupS, "commercial");

  const pal = hood.hill > 0.55
    ? { sky:0xf2c48d, pave:0xbdb6a8, paveB:0xb3ac9e, paveEdge:0x9c9588, road:0x45484f, roadLine:0xcfc9b9 }
    : hood.pave < 0.5
    ? { sky:0xc9b49b, pave:0xa19a8e, paveB:0x958e82, paveEdge:0x7d7669, road:0x3d4046, roadLine:0x8f897b }
    : { sky:0x9fd4e8, pave:0xc9c3b4, paveB:0xbfb9aa, paveEdge:0xa8a294, road:0x4a4d55, roadLine:0xd8d2c2 };

  /* ---------- the ORDER (replaces the tip multiplier) ----------
     Each delivery is a real seeded order with contents and a dollar
     value. The old tipMult difficulty score (hills + rough pavement +
     litter + turns) now scales the ORDER SIZE instead of floating over
     the payout as a bare multiplier — harder route, bigger order,
     bigger stakes, same economics delivered as fiction. Tips are a
     PERCENTAGE of this value: 20% baseline, deductions for damage /
     lateness / walk distance, small bonuses to a 22% ceiling (engine
     in showWin). */
  const difficulty = 1 + hood.hill*1.2 + (1-hood.pave)*1.0 + hood.litter*0.8 + (walk.segs.filter(s=>s.type==="arc").length-2)*0.15;
  const MENU = SHOP_MENUS[shopTypeOf(pickupShopName)] || SHOP_MENUS.tacos;
  const orderLines = [];
  let orderValue = 0;
  const nLineItems = 1 + Math.floor(rng()*3);
  for(let i = 0; i < nLineItems; i++){
    const [oname, oprice, ospill] = MENU[Math.floor(rng()*MENU.length)];
    const qty = 1 + (rng() < 0.3 ? 1 : 0);
    const ex = orderLines.find(l => l.name === oname);
    if(ex) ex.qty += qty; else orderLines.push({ name: oname, qty, spill: ospill });
    orderValue += oprice * qty;
  }
  /* softened from x0.45: typed menus brought genuinely pricey goods
     (retail parcels/parts), and the old multiplier double-dipped into
     ~$190 orders. Cap keeps the worst stacks honest. */
  orderValue = Math.min(99, Math.round(orderValue * (0.85 + difficulty*0.3) * 100) / 100);
  const order = { lines: orderLines, value: orderValue,
    text: orderLines.map(l => l.qty > 1 ? `${l.qty}× ${l.name}` : l.name).join(", ") };

  /* par time — TIGHTENED from the casual launch tuning (0.075 cruise,
     3s/turn, 15s grace): beatable clean, not beatable sightseeing.
     The HUD counts it down; the tip decays 1%/5s past it; the ORDER
     CANCELS at par + 60s (see the cancel check in the sim). */
  const nTurns = walk.segs.filter(s => s.type === "arc").length;
  const parMs = Math.round((doorS - SPAWN_S)/0.088 + nTurns*2000 + hood.hill*15000 + 8000);

  /* traffic: real road-aware two-way loops through the same grid,
     instead of a fixed row that never knew where the road was.
     Bumped up for heavier traffic (was 2-3 routes / 4-6 cars total) --
     each route is still cheap (one buildWalk at route-gen time, not
     per-frame), and per-frame cost only applies to cars actually within
     cullSpan of the camera via near(), so more independent routes just
     means denser coverage across the grid, not a flat per-frame cost
     increase. */
  const nTrafficRoutes = totalLen > 50000 ? 18 : totalLen > 30000 ? 15 : 12;
  const traffic = buildTraffic(grid, rng, nTrafficRoutes, walk.nodes);

  /* ---------- clear stage for the choreography ----------
     Volumetric hazards are swept out of a window around BOTH scene
     anchors (pickup shop, dropoff door). The three-canvas stacking
     draws the worker/customer with the building pass while hazards
     ride the depth layers, so a cone spawned at the shop door paints
     over the worker's face regardless of true depth (reported
     on-device). Runs post-spawn because pickupS/doorS are only chosen
     after the hazard passes. Ground paint (crack/slab/grade) and the
     curb ramps stay — they're pinned under everything and can't
     occlude anyone. */
  {
    /* slab REMOVED from the exemptions (it originally rode along as
       "ground paint"): slabs are RAISED terrain pinned to the mid
       layer, so one under the pickup worker painted over his legs —
       the worker draws with the building pass beneath it (on-device).
       Cracks and grade chevrons are truly flat and stay; the curb
       ramps are structural to crossings and stay. */
    const GROUNDY = { crack:1, grade:1, sidewalkend:1, sidewalkbegin:1 };
    const CLEAR = 240;
    for(let i = hazards.length - 1; i >= 0; i--){
      const hz = hazards[i];
      if(GROUNDY[hz.type]) continue;
      if(Math.abs(hz.s - pickupS) < CLEAR || Math.abs(hz.s - doorS) < CLEAR)
        hazards.splice(i, 1);
    }
  }

  /* ---------- precomputed cutaway edges ----------
     The north-wall cutaway (NORTH_WALL_CUT_EDGE: f=1 cuts a block's
     west edge, f=2 its north — the two headings where the fixed iso
     camera can push the near block's wall over the robot) used to be
     evaluated LIVE per frame against the current seg + the block the
     robot stood in. That made it snap three ways: houses vanished the
     instant the heading seg flipped, jumped block-to-block mid-leg,
     and popped back through every corner arc. The route is fully
     known here, so the whole thing is now computed ONCE: every block
     the robot's lane traverses on a cut-heading leg goes into a
     static map, block(i,j) -> [edges], permanent for the route —
     those edges show their fence/parking replacement from frame one
     and never change. Arcs contribute BOTH neighbor legs' cut edges
     to the blocks they sweep, so corners are covered without any
     transition. The address door's edge and the pickup shop's edge
     are never cut — the live version would happily vanish the
     customer's house if you approached it westbound. */
  const cutEdges = {};
  const addCut = (bi, bj, edge) => {
    if(edge == null) return;
    if(addressBlock && bi === addressBlock.i && bj === addressBlock.j && edge === addressEdgeIdx) return;
    if(pickupBlock && bi === pickupBlock.i && bj === pickupBlock.j && edge === pickupEdgeIdx) return;
    const k = bi + "," + bj;
    if(!cutEdges[k]) cutEdges[k] = [];
    if(!cutEdges[k].includes(edge)) cutEdges[k].push(edge);
  };
  for(const sg of segs){
    const eIn = NORTH_WALL_CUT_EDGE[sg.f];
    const eOut = sg.type === "arc" ? NORTH_WALL_CUT_EDGE[(sg.f + sg.sign + 4) % 4] : null;
    if(eIn == null && eOut == null) continue;
    for(let s = sg.s0; ; s += T2){
      const sv = Math.min(s, sg.s1);
      const wp = segsWorldOf(segs, sv, laneOffset(1));   // any lane row lands in the same block
      const bi = Math.floor(wp.x/BLOCK), bj = Math.floor(wp.y/BLOCK);
      if(sg.type === "line") addCut(bi, bj, eIn);
      else { addCut(bi, bj, eIn); addCut(bi, bj, eOut); }
      if(sv >= sg.s1) break;
    }
  }

  return { hood, grid, segs, totalLen, tiles, hazards, props, pal, traffic, crossings, cutEdges,
           address:`${number} ${street}`, doorS, pickupS, pickupSpot, pickupShopName, addressBlock, pickupBlock, addressEdgeIdx, pickupEdgeIdx, addressUnitIdx, pickupUnitIdx, addressUsesGate, order, parMs, dateStr };
}

/* ---------- robot palette (approved in sprite lab) ---------- */
const SKIN = {
  bodyTop:0xf7f8fa, bodyRight:0xe3e6ea, bodyLeft:0xc9cdd4, outline:0x30343d,
  stripe:0xc2452e, stripeDk:0xa03824,
  wheel:0x24262c, wheelDark:0x1a1c21, wheelHubFace:0x3d424c, wheelHub:0x8a919c,
  visor:0x22242b, eye:0x7fe3ff, eyeAlert:0xffb04d,
  lidInner:0xb2b7bf, cavityWall:0x9ba1a9, cavityFloor:0x7b818a,
  belly:0x494e58, flagPole:0x2e3138, flag:0xff5722, shadow:0x000000
};

const BODY = { hx:26, hy:20, z0:14, z1:54 };
const LID  = { hx:22, hy:16, z0:54, z1:61 };
const STRIPE = { z0:20, z1:27 };
const WHEEL = { r:8, z:10, xs:[-16, 0, 16], side:22 };
const FLAG = { base:{x:-25, y:17}, z0:54, z1:97 };  // anchored to the body's top edge, at a
                                                      // corner outside the lid's footprint
                                                      // (lid hx:22/hy:16 vs body hx:26/hy:20) —
                                                      // was anchored to the lid (z0 matched
                                                      // LID.z1 exactly, base x/y sat inside the
                                                      // lid's own footprint)

class WorldScene extends Phaser.Scene {
  constructor(){ super("world"); }

  create(){
    this.K = 1.5;
    this.f = 0;
    this.roll = 0;
    this.pitch = 0;
    this.drawAngle = 0;
    this.wheelPhase = 0;
    this.flagLean = 0;
    this.blinkT = 0;
    this.camX = 0;

    /* game state */
    this.state = "idle";        // idle | play | tipped | won
    this.speed = 0;
    this.tilt = 0;              // stability: fail beyond ±1
    this.botRow = 1;            // lane 0 (building side) .. lane 3 (curb side), 4 lanes total
    this.botY = 0;
    this.hopAnim = null;        // active lane-change maneuver
    this.yaw = 0;               // nose steer during lane change
    this.hopKick = 0;           // stability cost, bled in over the maneuver
    this.damage = 0;            // cargo damage %
    this.runT = 0;
    this.throttle = 0;          // -1 brake, 0 coast, 1 gas
    this.tipT = 0; this.tipStartRoll = 0; this.postSpillMs = 0; this.lidAng = 0; this.items = []; this.spilled = false;
    this.wonT = 0; this.wonFrac = 0; this.wonLiftT = 0; this.wonLidClosing = false; this.wonWalkAt = null; this.wonWalk = 0; this.wonOutT = 0; this.wonOutFrac = 0; this.wonMeet = null;
    this.bagOnBoard = false;
    this.cornerLean = 0;
    this.corneringSpeedSmooth = 0;   // lagged speed feeding cornering lean —
                                      // see loadRoute() reset for the full note
    this.stuckAmt = 0; this.isBlocked = false;

    this.gSky = this.add.graphics();
    this.gWorld = this.add.graphics();
    this.gFade = this.add.graphics();      // the one wall being faded out/in — separate object so it can have its own alpha
    this.g = this.add.graphics();
    this.gFront = this.add.graphics();     // hazards nearer the camera than the robot
    this.hud = this.add.graphics().setDepth(5);
    this.qtext = this.add.text(0, 0, "?!", { fontSize:"30px", fontStyle:"bold", color:"#ffb04d" })
      .setOrigin(0.5).setDepth(4).setVisible(false);

    this.bindInput();
    this.loadRoute(new Date().toISOString().slice(0,10));
    this.scale.on("resize", () => this.layout());
    this.layout();
  }

  bindInput(){
    let downY = 0, downT = 0, hopped = false;
    this.input.on("pointerdown", p => {
      downY = p.y; downT = this.time.now; hopped = false;
      this.throttle = p.x > this.scale.gameSize.width/2 ? 1 : -1;
    });
    this.input.on("pointermove", p => {
      if(!p.isDown || hopped) return;
      const dy = p.y - downY;
      if(Math.abs(dy) > 34 && this.time.now - downT < 320){
        hopped = true; this.throttle = 0;
        this.hop(dy < 0 ? -1 : 1);
      }
    });
    this.input.on("pointerup", () => { this.throttle = 0; hopped = false; });
    /* WASD mirrors the arrows exactly: W/S hop (screen-relative, same
       translation as swipes), A/D throttle. */
    this.keys = this.input.keyboard.addKeys({ up:"UP", down:"DOWN", left:"LEFT", right:"RIGHT",
                                              w:"W", a:"A", s:"S", d:"D" });
    this.input.keyboard.on("keydown-UP",   () => this.hop(-1));
    this.input.keyboard.on("keydown-DOWN", () => this.hop(1));
    this.input.keyboard.on("keydown-W",    () => this.hop(-1));
    this.input.keyboard.on("keydown-S",    () => this.hop(1));
  }

  /* screenDir: -1 = the swipe/key said UP-screen, +1 = DOWN-screen.
     Lanes live in fixed world-space (row 0 road side, row 3 building
     side), but which row direction is visually up-screen flips with
     heading — the lane axis rv rotates under the fixed camera, so the
     old direct dy -> row mapping made the same swipe move the robot
     up-screen on one street and down-screen on the next (on-device:
     "switches direction depending on the f="). Translate here: one
     sign test on the lane axis's screen-y projection, using the same
     quantized heading the renderer uses. Muscle memory follows the
     SCREEN, the map follows along. */
  hop(screenDir){
    if(this.state !== "play") return;
    const hdg = this.headingAt(this.botS);
    const fq = ((Math.round(hdg / (Math.PI/2)) % 4) + 4) % 4;
    const rv = DIRV[(fq + 1) % 4];
    /* screen-y of one +1 row step: rows step by (laneOffset(r+1) -
       laneOffset(r)) along rv; screen y grows with (x + y). Sign is all
       we need — spacing is uniform, so sample rows 0->1. */
    const rowPlusDown = (rv.x + rv.y) * (laneOffset(1) - laneOffset(0)) > 0;
    const dir = rowPlusDown ? screenDir : -screenDir;
    /* no lane changes mid-turn: a hop's lateral swing (up to 276 units,
       nearly the turn's own radius) happening over the short arc-length
       distance covered during a turn was overwhelming the actual
       quarter-circle geometry — the ROBOT'S real path, not just the
       debug trail, hooks and loops when this happens. Same rule real
       driving already has: commit to your lane before the turn, not
       mid-turn. */
    if(this.segAt(this.botS).type === "arc") return;
    const target = Phaser.Math.Clamp(this.botRow + dir, 0, 3);
    if(target === this.botRow) return;
    this.botRow = target;
    this.hopAnim = { from: this.laneOff, to: laneOffset(target), start: this.time.now, dir };
    /* the math problem: lane changes cost stability, scaled by speed —
       bled in across the maneuver rather than spiked */
    this.hopKick += dir * (0.16 + this.speed * 4.5);
  }

  loadRoute(dateStr){
    requestDailyBest(dateStr);   // Devvit bridge — no-op if not embedded (see shim near top of file)
    this.route = generateRoute(dateStr);
    for(const hz of this.route.hazards) hz.hit = false;
    this.d = this.route.pal;
    this.botS = this.route.pickupS;
    this.botZ = this.groundZ(this.botS);
    this.botRow = 1; this.laneOff = laneOffset(this.botRow);
    const hdg0 = this.headingAt(this.botS);
    if(this.route.pickupSpot){
      /* spawn exactly at the real shop-relative point, not wherever
         the route's own centerline math independently lands — pickupS
         was refined during generation to the closest ON-ROUTE position
         to this spot, so this is consistent with normal route-driven
         movement the instant the robot starts moving, not a one-frame
         override that then jumps. */
      this.botX = this.route.pickupSpot.x;
      this.botY = this.route.pickupSpot.y;
    } else {
      const sp = this.posAt(this.botS);
      this.botX = sp.x + (-Math.sin(hdg0))*this.laneOff;
      this.botY = sp.y + Math.cos(hdg0)*this.laneOff;
    }
    this.hopAnim = null; this.yaw = 0; this.hopYaw = 0; this.hopKick = 0;
    this.drawAngle = hdg0;   // position teleports on route load — rotation teleports with it
    this.slide = null; this.slipYaw = 0;
    this.camX = this.botX; this.camY = this.botY; this.camZ = this.botZ;
    this.speed = 0; this.tilt = 0; this.damage = 0; this.runT = 0;
    this.roll = 0; this.tipT = 0; this.tipStartRoll = 0; this.postSpillMs = 0; this.lidAng = 0; this.items = []; this.spilled = false;
    this.wonT = 0; this.wonFrac = 0; this.wonLiftT = 0; this.wonLidClosing = false; this.wonWalkAt = null; this.wonWalk = 0; this.wonOutT = 0; this.wonOutFrac = 0; this.wonMeet = null;
    this.bagOnBoard = false;
    this.slabZ = 0; this.slabRoll = 0;
    this.crossZ = 0; this.crossSlope = 0; this.crossJitter = 0;
    this.cornerLean = 0;
    this.corneringSpeedSmooth = 0;
    this.stuckAmt = 0; this.isBlocked = false;
    this.doorTheta = 0;   // hull door hinge angle — opens once this.state becomes "won"
    this.pickupWalk = 1;  // pickup worker's walk-out amount — 1 = idle, standing a row out
                           // facing the robot's spot; eases to 0 as "go" is pressed (see
                           // drawRobot), mirroring doorTheta's ease but in reverse and
                           // driven by state instead of a hinge angle
    this.doorSwing = 0;   // shop door hinge — opens while the worker's still walking,
                           // closes once he arrives (see drawRobot)
    this.loadDone = false; // true once the loading phase (lid+bag) has finished and the
                            // walk phase can start
    this.walkAt = null;   // timestamp (this.runT-relative) captured when the walk phase
                           // actually begins, after loading finishes
    this.lidHingeFlip = false; // true only during pickup loading — opens the cargo lid
                                // from the opposite edge than the tip/spill crash animation uses
    this.pickupLidClosing = false; // latches true while the lid still owes a close-out on
                                    // that flipped hinge, even after loading itself has ended
    this.state = "idle";
    document.getElementById("orderCard").innerHTML = this.route.pickupShopName
      ? `<b>${this.route.hood.n}</b> — pickup at <b>${this.route.pickupShopName}</b>, deliver to <b>${this.route.address}</b>`
      : `<b>${this.route.hood.n}</b> — deliver to <b>${this.route.address}</b>`;
    document.getElementById("sheetStatus").textContent = `$${this.route.order.value.toFixed(2)} · ${this.route.order.text}`;
    resizeRouteMap();
    drawRouteMap(this.route);
  }

  layout(){
    const w = this.scale.gameSize.width, h = this.scale.gameSize.height;
    this.cx = w/2;
    /* center the view on the middle of the lane band, not the top lane */
    this.cy = h/2 - TILE*0.5*this.K + 10;
  }

  /* ---------- path + terrain (s = distance along the route) ---------- */
  segAt(s){
    const segs = this.route.segs;
    for(const sg of segs) if(s <= sg.s1) return sg;
    return segs[segs.length-1];
  }
  posAt(s){
    const sg = this.segAt(s);
    if(sg.type === "line"){
      const d = DIRV[sg.f], u = Phaser.Math.Clamp(s, sg.s0, sg.s1) - sg.s0;
      return { x: sg.start.x + d.x*u, y: sg.start.y + d.y*u };
    }
    const a = sg.a0 + sg.sign * (Phaser.Math.Clamp(s, sg.s0, sg.s1) - sg.s0) / sg.R;
    return { x: sg.center.x + Math.cos(a)*sg.R, y: sg.center.y + Math.sin(a)*sg.R };
  }
  headingAt(s){
    const sg = this.segAt(s);
    if(sg.type === "line") return sg.hA;
    return sg.hA + sg.sign * (Phaser.Math.Clamp(s, sg.s0, sg.s1) - sg.s0) / sg.R;
  }
  groundZ(s){
    /* flat, always. route.tiles is a VIRTUAL grade profile — consumed
       as slope only (elevAt/groundSlope below feed pitch and hill
       gravity), never as geometry, so the flat-drawn world and every
       z consumer (props, doors, robot, camera) stay in exact
       agreement. See the profile build in generateRoute. */
    return 0;
  }
  elevAt(s){
    const t = this.route.tiles;
    const fx = s / (TILE*2);
    const i = Math.floor(fx);
    if(i < 0) return t[0];
    if(i >= t.length-1) return t[t.length-1];
    return Phaser.Math.Linear(t[i], t[i+1], fx - i);
  }
  groundSlope(s){
    return (this.elevAt(s+16) - this.elevAt(s-16)) / 32;
  }

  /* ---------- projection: yaw, pitch, roll, then facing ---------- */
  T(x, y, z){
    if(this.yaw !== 0){   // small local perturbations only now (hop nose-dip, hazard slip)
      const c = Math.cos(this.yaw), s = Math.sin(this.yaw);
      const x2 = x*c - y*s; y = x*s + y*c; x = x2;
    }
    if(this.pitch !== 0){
      const c = Math.cos(this.pitch), s = Math.sin(this.pitch);
      const x2 = x*c - z*s; z = x*s + z*c; x = x2;
    }
    if(this.roll !== 0){
      const PIV = this.roll >= 0 ? 22 : -22;               // pivot on the grounded edge
      const y0 = y + PIV, c = Math.cos(this.roll), s = Math.sin(this.roll);
      y = -PIV + y0*c - z*s; z = y0*s + z*c;
    }
    /* heading rotation LAST — points the already-tilted local shape the
       right way on screen, same role the discrete facing-swap used to
       play (also last), just continuous now instead of 90°-snapped. */
    if(this.drawAngle !== 0){
      const c = Math.cos(this.drawAngle), s = Math.sin(this.drawAngle);
      const x2 = x*c - y*s; y = x*s + y*c; x = x2;
    }
    return { x, y, z };
  }
  R(nx, ny, nz){
    if(this.yaw !== 0){
      const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
      const nx2 = nx*cy - ny*sy; ny = nx*sy + ny*cy; nx = nx2;
    }
    if(this.pitch !== 0){
      const c = Math.cos(this.pitch), s = Math.sin(this.pitch);
      const x2 = nx*c - nz*s; nz = nx*s + nz*c; nx = x2;
    }
    const c = Math.cos(this.roll), s = Math.sin(this.roll);
    const ny2 = ny*c - nz*s, nz2 = ny*s + nz*c;
    let rx = nx, ry = ny2;
    if(this.drawAngle !== 0){
      const cy = Math.cos(this.drawAngle), sy = Math.sin(this.drawAngle);
      const rx2 = rx*cy - ry*sy; ry = rx*sy + ry*cy; rx = rx2;
    }
    return { x:rx, y:ry, z:nz2 };
  }
  /* world-space projection (camera tracks the bot on both iso axes + height) */
  W(x, y, z){
    const xr = x - this.camX, yr = y - this.camY;
    return { x:(xr - yr)*this.K + this.cx,
             y:((xr + yr)*0.5 - (z - this.camZ))*this.K + this.cy };
  }
  /* robot-space projection: model -> robot pose -> world */
  P(x, y, z){
    const q = this.T(x, y, z);
    return this.W(q.x + this.botX, q.y + this.botY, q.z + this.botZ);
  }
  depth(x, y, z){
    const q = this.T(x, y, z);
    return q.x + q.y + q.z*0.4;
  }

  quadOn(g, pts, color, alpha=1){
    g.fillStyle(color, alpha);
    g.fillPoints(pts.map(p => new Phaser.Geom.Point(p.x, p.y)), true, true);
  }
  edgeOn(g, pts, color=SKIN.outline, w=2){
    g.lineStyle(w, color, 1);
    g.strokePoints(pts.map(p => new Phaser.Geom.Point(p.x, p.y)), true);
  }

  /* ---------- world drawing ---------- */
  drawWorld(t){
    const d = this.d, g = this.gWorld, r = this.route; g.clear();
    this.gSky.clear();
    this.gSky.fillStyle(d.sky, 1);
    this.gSky.fillRect(0, 0, this.scale.gameSize.width, this.scale.gameSize.height);

    const cullSpan = (this.scale.gameSize.width / this.K) * 0.9 + TILE*6 + 4000;
    const near = (wx, wy) => (Math.abs(wx - this.camX) + Math.abs(wy - this.camY)) < cullSpan;

    /* roads: ONE quad per street, full length — no internal tile seams
       (a uniformly-colored surface built from many small quads shows
       every seam as a hairline at low zoom; a single quad has none). */
    for(const edge of r.grid.edges){
      const dv = DIRV[edge.f], rv = DIRV[(edge.f+1)%4];
      if(!near(edge.a.x, edge.a.y) && !near(edge.b.x, edge.b.y)) continue;
      const ax = edge.a.x - dv.x*OVERSHOOT, ay = edge.a.y - dv.y*OVERSHOOT;
      const bx = edge.b.x + dv.x*OVERSHOOT, by = edge.b.y + dv.y*OVERSHOOT;
      this.quadOn(g, [
        this.W(ax - rv.x*ROAD_HALF, ay - rv.y*ROAD_HALF, 0),
        this.W(bx - rv.x*ROAD_HALF, by - rv.y*ROAD_HALF, 0),
        this.W(bx + rv.x*ROAD_HALF, by + rv.y*ROAD_HALF, 0),
        this.W(ax + rv.x*ROAD_HALF, ay + rv.y*ROAD_HALF, 0)
      ], d.road);
    }

    /* sidewalks: T2-square tiles for the safe mid-block stretch (real
       panel seams, provably conflict-free by construction — no classify()
       check needed), fine classify()-verified cells only near actual
       intersections — the one place a cheap tile could be wrong. */
    for(const rn of r.grid.sidewalkRuns){
      if(!near(rn.x, rn.y)) continue;
      const half = T2/2;
      const pts = [
        this.W(rn.x-half, rn.y-half, 0), this.W(rn.x+half, rn.y-half, 0),
        this.W(rn.x+half, rn.y+half, 0), this.W(rn.x-half, rn.y+half, 0)
      ];
      this.quadOn(g, pts, rn.parity === 0 ? d.pave : d.paveB);
      this.edgeOn(g, pts, d.paveEdge, 1);
    }
    for(const cell of r.grid.sidewalkCornerCells){
      if(!near(cell.x, cell.y)) continue;
      const half = CELL/2;
      const pts = [
        this.W(cell.x-half, cell.y-half, 0), this.W(cell.x+half, cell.y-half, 0),
        this.W(cell.x+half, cell.y+half, 0), this.W(cell.x-half, cell.y+half, 0)
      ];
      this.quadOn(g, pts, cell.parity === 0 ? d.pave : d.paveB);
      this.edgeOn(g, pts, d.paveEdge, 1);
    }
    /* center line: flat road paint, no depth. */
    for(const edge of r.grid.edges){
      const dv = DIRV[edge.f], rv = DIRV[(edge.f+1)%4];
      const a0 = edge.a, b0 = edge.b;
      const pts = [
        this.W(a0.x - rv.x*4, a0.y - rv.y*4, 3),
        this.W(b0.x - rv.x*4, b0.y - rv.y*4, 3),
        this.W(b0.x + rv.x*4, b0.y + rv.y*4, 3),
        this.W(a0.x + rv.x*4, a0.y + rv.y*4, 3)
      ];
      this.quadOn(g, pts, d.roadLine);
    }
    /* curb: a genuine vertical riser face, not a wide sloped strip —
       zero width ACROSS the curb line, just a height difference from
       bottom to top AT that one lateral position. A sloped quad across
       a 92-unit-wide strip made an 8-unit rise basically unreadable;
       a true vertical face (same lateral spot, different height) is
       what actually looks like a curb, matching how the original
       single-path game drew it (a small wall, not a ramp). */
    for(const edge of r.grid.edges){
      const dv = DIRV[edge.f], rv = DIRV[(edge.f+1)%4];
      const a0 = edge.a, b0 = edge.b;
      const curbFace = offUnits => {
        const ox = rv.x*offUnits, oy = rv.y*offUnits;
        this.quadOn(g, [
          this.W(a0.x+ox, a0.y+oy, 3),
          this.W(b0.x+ox, b0.y+oy, 3),
          this.W(b0.x+ox, b0.y+oy, -2),
          this.W(a0.x+ox, a0.y+oy, -2)
        ], d.paveEdge);
      };
      curbFace(-ROAD_HALF);
      curbFace(ROAD_HALF);
    }

    /* moved up from below: block-wrap houses/stores need the same
       front/back split props already use, so botDepth/layerFor (and
       the gFront clear that must precede any use of it) have to exist
       before the block-wrap pass, not after it. */
    this.gFront.clear();
    const botDepth = this.botX + this.botY;
    const layerFor = (px, py) => (px + py > botDepth + 14) ? this.gFront : g;

    /* moved up from below: cars/traffic now need world position before
       the body depth-sort runs (see the trafficPts block after the
       block-wrap pass), so worldOf has to exist this early too. */
    const worldOf = (s, offsetUnits) => {
      const hdg = this.headingAt(s), p = this.posAt(s);
      const rvx = -Math.sin(hdg), rvy = Math.cos(hdg);
      return { x: p.x + rvx*offsetUnits, y: p.y + rvy*offsetUnits, z: this.groundZ(s) };
    };
    const hazardOffset = hz => hz.row !== undefined ? laneOffset(hz.row) : hz.roadOffset;
    /* sidewalkend/sidewalkbegin/sidewalkbeginTurn are ADA curb ramps
       with real height and slope, not flat decals -- "crack" is the
       only genuinely flat one here. The rest can visually overlap a
       car or house the same way any other volumetric thing can, so
       they need the same depth-sort treatment, not an exemption. */
    const GROUND_KINDS = { crack:1, sidewalkend:1, sidewalkbegin:1, sidewalkbeginTurn:1, slab:1, grade:1 };

    /* ---------- block-wrap: housing/park/commercial beyond the
       sidewalk's inside line, all around the grid (interior blocks
       AND the world's outer perimeter lots). Two passes, same fix as
       the lab: flat ground fills first (order-independent, always into
       g since flat ground never needs to occlude the robot), THEN one
       global depth sort for every house/store/fence/scatter-prop —
       each one individually routed through layerFor so a house that's
       actually in FRONT of the robot (iso depth) correctly occludes
       him instead of the robot always painting over every house
       regardless of true position (the original bug: everything went
       into g unconditionally, so the robot could never be hidden
       behind a house even when it should have been). */
    const visBlocks = r.grid.blocks.filter(b => near(b.cx, b.cy));
    const visLots = r.grid.extLots.filter(l => near(l.cx, l.cy));
    for(const blk of visBlocks) this.fillBlockGround(g, blk);
    for(const lot of visLots) this.fillExteriorLot(g, lot);

    /* north-wall cutaway: heading f===2 (DIRV[2], world -x) is the ONE
       travel direction where this fixed iso camera's height-lift can
       push a nearby block's north wall over the robot's own screen
       position (confirmed from the W() projection math: world -x maps
       to up-and-left on screen, matching the reported angle exactly).
       Every other heading is untouched — this is a single-direction
       fix, not a general occlusion system, so it can't over-trigger
       across unrelated blocks. Only the CURRENT block's north edge is
       cut, identified by precise cell index, not distance.
       Segment TYPE matters too: this.f is a rounded snapshot of the
       continuous heading, and during an ARC (turning through a corner)
       that heading sweeps through all four cardinal directions —
       briefly rounding to 2 mid-turn even on a corner that isn't a
       sustained westbound leg. Gating on segAt().type==="line" as well
       means the cut only ever fires on a real straight westbound walk,
       never during the turn itself. */
    /* two headings need this, not one — f===2 (up-left) cuts the
       block's NORTH edge (edge 0), f===1 (down-left) cuts its WEST
       edge (edge 3). Same derivation both times: the robot's fixed
       sidewalk lane (ROBOT_SIDE) relative to travel direction puts it
       on one consistent side of the street, and that determines which
       single edge of the adjacent block is the "near" wall that can
       loom over his screen position under this fixed iso camera. */
    /* north-wall cutaway — STATIC now. The which-edge derivation is
       unchanged (NORTH_WALL_CUT_EDGE: f=2's westbound walk puts the
       block's north wall over the robot under this fixed iso camera,
       f=1 the west wall — confirmed from the W() projection math),
       but the trigger moved to route generation: route.cutEdges maps
       block(i,j) -> [edges] for every block the route's cut-heading
       legs traverse, permanent for the whole route. No live heading
       test, no live block test — so nothing snaps when the heading
       changes, when the robot crosses a block seam mid-leg, or through
       corner arcs (all three were reported on-device). A block can
       carry TWO cut edges if both an f=1 and an f=2 leg touch it. */
    this.addrDoorPos = null;
    const blockVQ = [];
    const topLayer = [];
    for(const blk of visBlocks){
      const cuts = (blk.type !== "park") ? this.route.cutEdges[blk.i + "," + blk.j] : null;
      this.queueBlockContent(blockVQ, blk, cuts || null);
      if(cuts) for(const cutEdgeIdx of cuts){
        const e = this.blockEdges(blk)[cutEdgeIdx];
        const eseed = ((Math.round(e.ox*3+e.dv.x)*7919) ^ (Math.round(e.oy*3+e.dv.y)*104729) ^ 0x6f2a) >>> 0;
        const ecx = e.ox + e.dv.x*e.len/2, ecy = e.oy + e.dv.y*e.len/2;
        if(blk.type === "commercial"){
          blockVQ.push({ depth: ecx+ecy, fn:(g,t)=>{
            const cars = this.drawParkingRow(g, e.ox, e.oy, e.dv, e.rv, e.len, eseed, t);
            for(const c of cars) topLayer.push(c);
          }});
        } else {
          const fenceLayer = layerFor(ecx, ecy);
          blockVQ.push({ depth: ecx+ecy, fn:()=>this.drawSolidFenceRow(fenceLayer, e.ox, e.oy, e.dv, e.rv, e.len, eseed) });
        }
      }
    }
    for(const lot of visLots) this.queueExteriorLot(blockVQ, lot);

    /* moving traffic + roadside parked car/truck props: computed here,
       BEFORE the body depth-sort below, and pushed into blockVQ exactly
       like any house/store body -- so a car now sorts correctly against
       buildings by real depth (x+y), instead of being painted in a
       separate pass that ran after the whole gWorld body pass had
       already finished (which meant a car always painted on top of
       every house regardless of true depth -- the reported "draw order
       confused in world space" bug). Dedup (skip a vehicle too close to
       one already queued this frame -- independent traffic routes can
       overlap with zero mutual awareness) is unchanged from before. */
    const trafficPts = [];
    for(const pr of r.props){
      if(pr.kind !== "car" && pr.kind !== "truck") continue;
      const wp = worldOf(pr.s, pr.roadOffset);
      trafficPts.push({ kind: pr.kind, wp, f: pr.f, wheelPhase: null, colorSeed: null });
    }
    for(const tr of r.traffic){
      const { wp, f: trF, trS } = trafficWorldAt(tr, t);
      trafficPts.push({ kind: tr.kind, wp, f: trF, wheelPhase: trS*0.28, colorSeed: tr.colorSeed });
    }
    const MIN_TRAFFIC_GAP = CARC.len * 0.9;
    const drawnTrafficPts = [];
    for(const p of trafficPts){
      if(!near(p.wp.x, p.wp.y)) continue;
      if(drawnTrafficPts.some(q => Math.hypot(q.x-p.wp.x, q.y-p.wp.y) < MIN_TRAFFIC_GAP)) continue;
      drawnTrafficPts.push(p.wp);
      const pk = p.kind, pwx = p.wp.x, pwy = p.wp.y, pwz = p.wp.z, pf = p.f, pwp2 = p.wheelPhase, pcs = p.colorSeed;
      blockVQ.push({ depth: pwx+pwy, fn:(g,t)=>this.drawProp(layerFor(pwx,pwy), pk, pwx, pwy, t, pf, pwz, pwp2, pcs) });
    }

    /* other volumetric props (bins, cones, hydrants, dogs, people, etc.):
       same fix, same reason -- these used to draw in their own pass
       AFTER the whole body+roof pass had already finished, so a prop
       standing near a parked car always painted on top of it (and of
       any house) regardless of which was actually closer to camera.
       Pushing them into blockVQ here, sorted by real depth alongside
       houses/cars/traffic, fixes prop-vs-car and prop-vs-house the same
       way car-vs-house was fixed above. */
    for(const pr of r.props){
      if(pr.kind === "car" || pr.kind === "truck") continue;
      const wp = worldOf(pr.s, pr.roadOffset);
      if(!near(wp.x, wp.y)) continue;
      const prk = pr.kind, pwx2 = wp.x, pwy2 = wp.y, pwz2 = wp.z, pf2 = pr.f;
      blockVQ.push({ depth: pwx2+pwy2, fn:(g,t)=>this.drawProp(layerFor(pwx2,pwy2), prk, pwx2, pwy2, t, pf2, pwz2) });
    }

    /* ground-kind hazards: crack really is flat, but sidewalkend/
       sidewalkbegin/sidewalkbeginTurn are actual curb ramps with height
       and slope -- they got the same "always draws late, unsorted"
       treatment as the other props/cars bug above, just via a separate
       code path (the old "flat, can never occlude" assumption), so a
       ramp near a parked car painted over it regardless of depth. Same
       fix: push into blockVQ so it's depth-sorted against everything
       else instead of drawn unconditionally on top afterward. */
    for(const hz of r.hazards){
      if(!GROUND_KINDS[hz.type]) continue;
      /* world-anchored ramps (turn crossings) carry their own wx/wy —
         they sit at the true curb lines, positions the route-s mapping
         can't express (the arc seg owns that s-range); everything else
         stays route-anchored via worldOf as before. */
      const wp = hz.wx !== undefined
        ? { x: hz.wx, y: hz.wy, z: hz.wz || 0 }
        : worldOf(hz.s + (hz.slide || 0), hazardOffset(hz));
      if(!near(wp.x, wp.y)) continue;
      const hzt = hz.type, hwx = wp.x, hwy = wp.y, hwz = wp.z, hf = hz.f, hzObj = hz;
      /* slab is a full T2 tile the robot drives directly across and
         rides elevated on top of (slabZ) -- a single depth-vs-robot
         flip evaluated once at the tile's center pops the whole panel
         from in-front to behind partway through the crossing (the
         reported "over for the first half, under for the second"
         bug). It should stay under the robot the entire time, same
         "always behind" guarantee houses/roofs already get, not the
         point-depth test meant for freestanding side-by-side props. */
      /* sidewalkend/sidewalkbegin get the same pin as slab, same reason:
         the robot drives DIRECTLY ACROSS them (they sit under his own
         lane at every street crossing), so a single point-depth test at
         the decal's center would flip the whole 2x3-tile panel from
         behind to in-front partway through — over-the-robot for half
         the crossing. Pinning to gWorld is orientation-independent, so
         it's correct for all 4 headings at once — no per-heading
         special-casing needed, unlike a point-depth test. Body-vs-body
         order against cars/houses is unaffected — that comes from the
         blockVQ sort, not the layer choice. */
      /* crack joined the pin list: flat ground paint the robot ALWAYS
         drives over, but it was still going through layerFor()'s
         point-depth test — which flips to the front layer the moment
         botDepth sweeps past the crack's single center point, painting
         the crack OVER the robot just after passing it (on-device
         report). Same class as the original slab pop: large flat
         objects with a known layer relationship get pinned, not
         point-tested. */
      /* KNOCKED props join the depth-anchor fixes: a downed planter /
         bin / cone / scooter's visual mass pivots or slides well away
         from its spawn anchor, so layerFor() at the anchor tests a
         point that's no longer under the art — robot pressed against a
         tipped planter drew OVER it (on-device). Can't pin these (the
         robot can be on either side), so instead test the silhouette
         point NEAREST the robot: shift the test point toward the robot
         by up to the prop's knocked radius. Far apart, either answer
         is fine (no overlap possible); close, this is the point that
         decides the truth. Orientation-independent — correct at all 4
         headings by construction. */
      let ltx = hwx, lty = hwy;
      if((hzt === "planter" || hzt === "bin" || hzt === "cone" || hzt === "scooter")
         && hzObj && (hzObj.phi || 0) > 0.5){
        let kx = this.botX - hwx, ky = this.botY - hwy;
        const kd = Math.hypot(kx, ky) || 1;
        const kR = Math.min(kd, hzt === "scooter" ? 30 : 28);
        ltx += kx/kd*kR; lty += ky/kd*kR;
      }
      const slabLayer = (hzt === "slab" || hzt === "sidewalkend" || hzt === "sidewalkbegin" || hzt === "grade" || hzt === "crack")
        ? g : layerFor(ltx, lty);
      blockVQ.push({ depth: hwx+hwy, fn:(g,t)=>this.drawProp(slabLayer, hzt, hwx, hwy, t, hf, hwz, null, null, hzObj) });
    }

    /* roofs always draw last, globally — pulled out of the normal
       single-point depth sort entirely so no body (house, store, fence,
       from ANY unit) can ever paint over ANY roof, regardless of how
       the coarse depth numbers compare. This is what "force a roof
       onto all houses" actually needed: not more roof geometry (it was
       already unconditional inside drawHouseUnit/drawStoreUnit), but a
       paint-order guarantee that nothing drawn afterward could cover it. */
    const bodies = blockVQ.filter(it => !it.isRoof), roofs = blockVQ.filter(it => it.isRoof);
    bodies.sort((a,b) => a.depth - b.depth);
    for(const item of bodies) item.fn(g, t); // always gWorld — the robot must stay visible over block-wrap dressing, never hidden behind it
    roofs.sort((a,b) => a.depth - b.depth);
    for(const item of roofs) item.fn(g, t);
    /* parking-row cars draw in a THIRD pass, after roofs — they were
       part of the normal body pass before, so any visible building's
       roof (drawn unconditionally last, globally, regardless of true
       depth — see the roof comment above) could paint right over a
       parked car, looking exactly like a disconnected floating panel
       near the vehicle. This wasn't a car-drawing bug at all; it was
       the roof-ordering system (built to fix a real, different bug)
       colliding with a feature added afterward that never got the
       same "must stay visible" treatment the robot itself has. */
    /* layerFor, not hardcoded g: these cars were always drawn into
       gWorld regardless of true depth vs the robot, so the robot
       painted over them unconditionally even when a car was actually
       closer to camera and should have stayed in front. Every other
       car/prop in this file already goes through layerFor; this pass
       just never got that same treatment when it was split out to fix
       the earlier roof-covering-car bug. */
    /* sorted by real world depth before drawing — otherwise cars within
       this pass draw in raw insertion order (stall 0, then 1, then 2),
       which only happens to look right when a parking row's edge
       orientation lines up with that order by coincidence, and reads
       as visibly wrong otherwise (reported on-device, f=1 specifically).
       Still its own pass, still after roofs — this only fixes ordering
       WITHIN the pass, not when the pass itself runs. */
    topLayer.sort((a, b) => (a.x + a.y) - (b.x + b.y));
    for(const c of topLayer) this.drawProp(layerFor(c.x, c.y), c.kind, c.x, c.y, t, c.fdir, 0);

    /* volumetric props (and ground-kind hazards like curb ramps) are
       handled earlier now -- pushed into blockVQ before the body
       depth-sort so they land correctly against houses and cars; see
       the comments above that block for why. */
    for(const hz of r.hazards){
      if(GROUND_KINDS[hz.type]) continue;
      const wp = worldOf(hz.s + (hz.slide || 0), hazardOffset(hz));
      /* a fallen/falling scooter (phi>0) reaches out along its own
         local a-axis well past its single anchor point once laid
         down (see the scooter draw fn's M()) -- layerFor only tests
         that one anchor, so a scooter sprawled toward the robot can
         get classified by a point that isn't where its extended deck
         actually ends up on screen. It's also, almost by definition,
         sitting right where the robot just was: the same "always
         behind" case the slab already gets, and for the same reason
         -- pin it instead of trusting a point-sample this close to
         the robot's own position. Standing (phi===0) scooters are
         compact and can be genuinely ahead of the robot on the
         sidewalk, so they still go through the normal test. */
      const hzLayer = (hz.type === "scooter" && hz.phi > 0) ? g : layerFor(wp.x, wp.y);
      if(near(wp.x, wp.y)) this.drawProp(hzLayer, hz.type, wp.x, wp.y, t, hz.f, wp.z, null, null, hz);
      if(hz.clusterExtras){
        for(const ex of hz.clusterExtras){
          const exWp = worldOf(hz.s + (hz.slide || 0) + ex.ds, hazardOffset(hz) + ex.dOff);
          if(near(exWp.x, exWp.y)) this.drawProp(layerFor(exWp.x, exWp.y), ex.kind, exWp.x, exWp.y, t, hz.f, exWp.z);
        }
      }
    }

    /* addrDoorPos/addrDoorDV/etc. are still set below as a side effect
       of the real address house unit's own render pass (see
       queueHousingEdgeAt's isAddress branch) -- the door/mat/house/
       customer render as part of that unit, not as anything drawn
       here. The floating address label that used to read this data
       and hover near the door is gone; the win-state camera reframe
       is the only remaining consumer, blending its shot toward
       wherever this data says the door actually is. */
  }

  /* ---------- shared person-hull renderer ----------
     Single source of truth for the character design (approved in the
     customer lab, first shipped as prop.people): hull-box construction,
     top face + the two camera-facing side faces per box. Both
     prop.people and world.customer call this directly rather than
     keeping two copies of the same body, so a future tweak to one
     shows up in both automatically.
       ax,ay,z    — world anchor (already includes any wander/flee/walk offset)
       thW        — facing angle (radians)
       build      — one of PEOPLE_BUILD
       pSkin/pShirt/pPants/pHair/pShoe — color entries ({c,dk} except pHair, a bare color)
       walkPhase  — sin() walk-cycle phase, 0 if not moving
       moving     — whether the walk cycle / arm swing should animate
       startleAlpha — 0..1, draws the "!" burst at that alpha when > 0 */
  /* ---------- hull door + knob (door lab, dial bench approved) ----------
     Slab (and its panels + knob) pivot on a vertical hinge at dx=-hw.
     theta=0 reproduces the closed pose; theta=DOOR_ART.openAngle swings
     it flat against the hinge post, out over the mat. Ported verbatim. */
  drawDoorAssembly(g, ox, oy, dv, rv, doorCenterX, dz, theta){
    const D = DOOR_ART;
    const G = (dx, dy, dzz) => this.W(ox + dv.x*(doorCenterX+dx) + rv.x*dy, oy + dv.y*(doorCenterX+dx) + rv.y*dy, dz+dzz);
    const depthAt = (dx, dy, dzz) => (dv.x+dv.y)*dx*0.5 + (rv.x+rv.y)*dy*0.5 - dzz*0.35;

    const hw = D.w/2, H = D.h, dyF = 2.4;
    const cT = Math.cos(theta), sT = Math.sin(theta);
    const SL = (u, perp, dzz) => G(-hw + u*cT - perp*sT, perp*cT + u*sT, dzz);
    const slabDepthDy = dyF*cT + (2*hw)*sT;

    const shadow = () => {
      const s = G(0, 3, 0);
      g.fillStyle(D.shadow, 0.16);
      g.fillEllipse(s.x, s.y+1, (D.w+18)*this.K*0.42, 10*this.K*0.42);
    };
    const step = () => {
      const pts = [G(-hw-2, 1.5, 0), G(hw+2, 1.5, 0), G(hw+2, 7, 0), G(-hw-2, 7, 0)];
      this.quadOn(g, pts, D.step);
      this.edgeOn(g, pts, D.stepDk, 1);
    };
    const frame = () => {
      const trim = 5;
      const top = [G(-hw-trim, 1, H+trim), G(hw+trim, 1, H+trim), G(hw+trim, 1, H), G(-hw-trim, 1, H)];
      const outer = [G(-hw-trim, 1, H+trim), G(hw+trim, 1, H+trim), G(hw+trim, 1, 0), G(-hw-trim, 1, 0)];
      this.quadOn(g, outer, D.frame);
      this.quadOn(g, top, D.frameLt);
      this.edgeOn(g, outer, D.frameDk, 1.2);
      const sideSign = (dv.x+dv.y) >= 0 ? 1 : -1;
      const lip = [
        G(sideSign*(hw+trim), 1, H+trim), G(sideSign*(hw+trim), 2.6, H+trim),
        G(sideSign*(hw+trim), 2.6, -1),   G(sideSign*(hw+trim), 1, 0)
      ];
      this.quadOn(g, lip, D.frameDk, 0.8);
    };
    /* a bit of a room behind the door, lit from a window on the left */
    const interior = () => {
      const wallColor = 0xdcd4c2, floorColor = 0xb99f78;
      const face = [G(-hw, 1.02, H), G(hw, 1.02, H), G(hw, 1.02, 0), G(-hw, 1.02, 0)];
      this.quadOn(g, face, wallColor);
      const floor = [G(-hw, 1.03, H*0.3), G(hw, 1.03, H*0.3), G(hw, 1.03, 0), G(-hw, 1.03, 0)];
      this.quadOn(g, floor, floorColor);
      const lit = [G(-hw, 1.04, H*0.82), G(-hw*0.05, 1.04, H*0.82), G(-hw*0.05, 1.04, 0), G(-hw, 1.04, 0)];
      this.quadOn(g, lit, 0xf2c98a, 0.3);
      const glow = [G(-hw*0.85, 1.05, H*0.7), G(-hw*0.35, 1.05, H*0.7), G(-hw*0.35, 1.05, H*0.3), G(-hw*0.85, 1.05, H*0.3)];
      this.quadOn(g, glow, 0xfff0cf, 0.5);
    };
    const slab = () => {
      const face = [SL(0,dyF,H), SL(2*hw,dyF,H), SL(2*hw,dyF,0), SL(0,dyF,0)];
      this.quadOn(g, face, D.slab);
      this.edgeOn(g, face, D.slabDk, 1);
      const panel = (f0, f1) => {
        const z0 = H*f0, z1 = H*f1, pin = D.panelInset;
        const grooveOuter = [
          SL(pin,dyF+0.15,z1), SL(2*hw-pin,dyF+0.15,z1),
          SL(2*hw-pin,dyF+0.15,z0), SL(pin,dyF+0.15,z0)
        ];
        this.quadOn(g, grooveOuter, D.groove);
        const inner = [
          SL(pin+2,dyF+0.35,z1-2), SL(2*hw-pin-2,dyF+0.35,z1-2),
          SL(2*hw-pin-2,dyF+0.35,z0+2), SL(pin-2,dyF+0.35,z0+2)
        ];
        this.quadOn(g, inner, D.slabLt);
      };
      panel(D.panelBotFrom, D.panelBotTo);
      panel(D.panelTopFrom, D.panelTopTo);
    };
    const knob = () => {
      const u = D.knobDX + hw, dzk = D.knobDZ;
      const plate = SL(u, 2.6, dzk);
      g.fillStyle(D.plate, 1);
      g.fillCircle(plate.x, plate.y, D.knobR*this.K*0.6);
      const c = SL(u, 3.2, dzk);
      g.fillStyle(D.knobDk, 1);
      g.fillCircle(c.x, c.y, D.knobR*this.K*0.5);
      g.fillStyle(D.knob, 1);
      g.fillCircle(c.x, c.y, D.knobR*this.K*0.42);
      g.fillStyle(D.knobHi, 1);
      g.fillCircle(c.x - 1.1*this.K*0.42, c.y - 1.1*this.K*0.42, D.knobR*this.K*0.14);
    };

    const parts = [
      { d: depthAt(0, 0, 0)-50, fn: shadow },
      { d: depthAt(0, 1, H*0.5), fn: frame },
      { d: depthAt(0, 1.02, H*0.5), fn: interior },
      { d: depthAt(0, slabDepthDy, H*0.5), fn: slab },
      { d: depthAt(D.knobDX, slabDepthDy, D.knobDZ), fn: knob },
      { d: depthAt(0, 4, 0), fn: step }
    ];
    parts.sort((p1,p2) => p1.d - p2.d);
    for(const p of parts) p.fn();
  }

  /* ---------- delivery mat (door lab, dial bench approved) ----------
     Exactly one sidewalk square, sitting flush on lane 3's tile,
     flush against the door at its near edge. Border rim + fiber
     texture instead of a flat quad. */
  drawMatQuad(g, ox, oy, dv, rv, doorCenterX, dz){
    const M = (dx, dy, dzz) => this.W(ox + dv.x*(doorCenterX+dx) + rv.x*dy, oy + dv.y*(doorCenterX+dx) + rv.y*dy, dz+dzz);
    const half = T2/2;
    const matNear = T2*0.5 - half, matFar = T2*0.5 + half;
    const outer = [M(-half,matNear,0.6), M(half,matNear,0.6), M(half,matFar,0.6), M(-half,matFar,0.6)];
    this.quadOn(g, outer, MAT_ART.redDk);
    const bw = 3.5;
    const inner = [M(-half+bw,matNear+bw,0.65), M(half-bw,matNear+bw,0.65), M(half-bw,matFar-bw,0.65), M(-half+bw,matFar-bw,0.65)];
    this.quadOn(g, inner, MAT_ART.red);
    this.edgeOn(g, outer, MAT_ART.border, 1.4);
    g.lineStyle(1, MAT_ART.fiber, 0.5);
    const rows = 6, cols = 3;
    for(let i=1; i<rows; i++){
      for(let j=0; j<cols; j++){
        const u = matNear+bw + (matFar-matNear-bw*2)*(i/rows);
        const v0 = -half+bw + (T2-bw*2)*(j/cols) + 3;
        const v1 = v0 + (T2-bw*2)/cols - 6;
        const p0 = M(v0, u, 0.66), p1 = M(v1, u, 0.66);
        g.lineBetween(p0.x, p0.y, p1.x, p1.y);
      }
    }
  }


  /* ================= BLOCK-WRAP: houses/storefronts/fences/bench,
     ported from labs/block-wrap.html. Scale anchored on the real door
     (DOOR_H/DOOR_W) and a real person (PERSON_H), not picked
     independently — see PERSON_H's own comment. ================= */
  fillBlockInterior(g, blk, tone){
    const half = T2/2;
    for(let y = blk.y0 + half; y < blk.y1; y += T2){
      for(let x = blk.x0 + half; x < blk.x1; x += T2){
        const parity = (Math.round((x-blk.x0)/T2) + Math.round((y-blk.y0)/T2)) % 2;
        const pts = [this.W(x-half,y-half,0), this.W(x+half,y-half,0), this.W(x+half,y+half,0), this.W(x-half,y+half,0)];
        this.quadOn(g, pts, parity===0 ? tone.a : tone.b);
        if(tone.edge){ g.lineStyle(1, tone.edge, 0.5); g.strokePoints(pts.map(p=>new Phaser.Geom.Point(p.x,p.y)), true, true); }
      }
    }
  }

  drawHouseUnit(g, ox, oy, dv, rv, w, seed, isAddress=false, part='all'){
    const rng = mulberry32(seed);
    /* a = along the edge (0..w), b = depth (0 at the sidewalk-facing
       front, -D back into the block interior). A real box: front,
       back, both sides, and a top all exist as actual geometry. Faces
       drawn back-to-front so the detailed front face paints last.
       'part' lets the roof be pulled out and queued as its OWN globally
       -last layer (see queueHousingEdgeAt) — the coarse single-point
       depth sort here only compares one number per unit, so a nearby
       unit could occasionally paint over another's roof even though
       both are individually correct; forcing every roof to draw after
       every body, globally, makes that impossible regardless of sort
       order. rng() calls stay unconditional/in the same order for both
       parts so a 'roof'-only call reproduces the exact same H/C a
       'body' call would have used. */
    const C = HOUSE_WRAP_PALETTES[Math.floor(rng()*HOUSE_WRAP_PALETTES.length)];
    const H = DOOR_H + 50 + rng()*40, baseH = 26, D = HOUSE_DEPTH;
    const hasDoor = isAddress ? true : rng() < 0.5;
    const winCount = 1 + Math.floor(rng()*2);
    const G = (a,b,h) => this.W(ox + dv.x*a + rv.x*b, oy + dv.y*a + rv.y*b, h);

    if(part !== 'roof'){
      const back = [G(0,-D,H), G(w,-D,H), G(w,-D,0), G(0,-D,0)];
      this.quadOn(g, back, C.wallDk);
      const left = [G(0,0,H), G(0,-D,H), G(0,-D,0), G(0,0,0)];
      this.quadOn(g, left, C.wallDk); this.edgeOn(g, left, C.trim, 1);
      const right = [G(w,0,H), G(w,-D,H), G(w,-D,0), G(w,0,0)];
      this.quadOn(g, right, C.wallLt); this.edgeOn(g, right, C.trim, 1);
    }

    if(part !== 'body'){
      const ov = 5;
      const roof = [G(-ov,ov,H), G(w+ov,ov,H), G(w+ov,-D-ov,H), G(-ov,-D-ov,H)];
      this.quadOn(g, roof, C.roof);
      this.edgeOn(g, roof, C.wallDk, 1);
    }

    if(part === 'roof') return;

    const face = [G(0,0.4,H), G(w,0.4,H), G(w,0.4,0), G(0,0.4,0)];
    this.quadOn(g, face, C.wall);
    const base = [G(0,0.42,baseH), G(w,0.42,baseH), G(w,0.42,0), G(0,0.42,0)];
    this.quadOn(g, base, C.wallDk);
    const trim = [G(0,0.42,H), G(w,0.42,H), G(w,0.42,H-9), G(0,0.42,H-9)];
    this.quadOn(g, trim, C.trim);
    g.lineStyle(1, C.wallDk, 0.35);
    for(let x = T2; x < w; x += T2){ const a=G(x,0.41,H), b=G(x,0.41,0); g.lineBetween(a.x,a.y,b.x,b.y); }

    const winW = DOOR_W*0.32, winZ0 = DOOR_H*0.16, winZ1 = DOOR_H*0.82, sillH = 4;
    const wf = 0xf4efe2, wfd = 0xd8d0bd, wg = 0x6b93a8, wgl = 0x86adc0;
    const window = cx => {
      const wHW = winW/2;
      const sill = [G(cx-wHW-3,0.5,winZ0), G(cx+wHW+3,0.5,winZ0), G(cx+wHW+3,0.5,winZ0-sillH), G(cx-wHW-3,0.5,winZ0-sillH)];
      this.quadOn(g, sill, wfd);
      const frame = [G(cx-wHW-2,0.5,winZ1+2), G(cx+wHW+2,0.5,winZ1+2), G(cx+wHW+2,0.5,winZ0), G(cx-wHW-2,0.5,winZ0)];
      this.quadOn(g, frame, wf);
      const glass = [G(cx-wHW,0.55,winZ1), G(cx+wHW,0.55,winZ1), G(cx+wHW,0.55,winZ0), G(cx-wHW,0.55,winZ0)];
      this.quadOn(g, glass, wg);
      const hl = [G(cx-wHW+2,0.56,winZ1-2), G(cx-2,0.56,winZ1-2), G(cx-2,0.56,winZ0+3), G(cx-wHW+2,0.56,winZ0+3)];
      this.quadOn(g, hl, wgl, 0.6);
    };
    const door = cx => {
      const dHW = DOOR_W*0.4, dZ1 = DOOR_H*0.85;
      const step = [G(cx-dHW-3,0.48,6), G(cx+dHW+3,0.48,6), G(cx+dHW+3,0.48,0), G(cx-dHW-3,0.48,0)];
      this.quadOn(g, step, 0x9d9687);
      const slab = [G(cx-dHW,0.5,dZ1), G(cx+dHW,0.5,dZ1), G(cx+dHW,0.5,0), G(cx-dHW,0.5,0)];
      this.quadOn(g, slab, 0x6b4530);
      const panel = [G(cx-dHW+4,0.52,dZ1-10), G(cx+dHW-4,0.52,dZ1-10), G(cx+dHW-4,0.52,12), G(cx-dHW+4,0.52,12)];
      this.quadOn(g, panel, 0x5a3a28);
      const knob = G(cx+dHW-6,0.56,dZ1*0.42);
      g.fillStyle(0xd8b23a, 1); g.fillCircle(knob.x, knob.y, 2.6*this.K*0.42);
    };

    if((hasDoor && w > T2*1.9) || isAddress){
      const dcx = w/2;
      if(!isAddress) door(dcx); // address unit's real door assembly draws separately, on top
      for(let i=1;i<=winCount;i++){
        if(dcx - i*T2*0.9 > 14) window(dcx - i*T2*0.9);
        if(dcx + i*T2*0.9 < w-14) window(dcx + i*T2*0.9);
      }
    } else {
      const n = Math.max(1, Math.min(winCount+1, Math.floor(w/T2)));
      for(let i=0;i<n;i++) window(w*(i+0.5)/n);
    }
  }

  drawStoreUnit(g, ox, oy, dv, rv, w, seed, isFirst, isLast, part='all'){
    const rng = mulberry32(seed);
    const G = (a,b,h) => this.W(ox + dv.x*a + rv.x*b, oy + dv.y*a + rv.y*b, h);
    const C = STORE_PALETTES[Math.floor(rng()*STORE_PALETTES.length)];
    const D = STORE_DEPTH;
    const doorLeft = rng() < 0.5;

    /* height stack built bottom-up from the real door — a commercial
       glass door is slightly shorter than the ornate residential hull
       door but still human-scale, and window/awning/sign/roofline all
       get guaranteed clearance instead of hoping a random H fit. */
    const kickH = 18;
    const dZ1 = DOOR_H*0.88;
    const winZ0 = kickH+2, winZ1 = dZ1 + 14 + rng()*16;
    const awnZ0 = winZ1+4, awnZ1 = awnZ0+18;
    const signZ0 = awnZ1+8, signZ1 = signZ0+16;
    const H = signZ1 + 16 + rng()*12;

    if(part !== 'roof'){
      const back = [G(0,-D,H), G(w,-D,H), G(w,-D,0), G(0,-D,0)];
      this.quadOn(g, back, C.wallDk);
      if(isFirst){ const l=[G(0,0,H),G(0,-D,H),G(0,-D,0),G(0,0,0)]; this.quadOn(g,l,C.wallDk); this.edgeOn(g,l,C.trim,1); }
      if(isLast){  const r=[G(w,0,H),G(w,-D,H),G(w,-D,0),G(w,0,0)]; this.quadOn(g,r,C.wallLt); this.edgeOn(g,r,C.trim,1); }
    }

    if(part !== 'body'){
      const ov = isFirst||isLast ? 5 : 0;
      const roof = [G(isFirst?-ov:0,ov,H), G(isLast?w+ov:w,ov,H), G(isLast?w+ov:w,-D-ov,H), G(isFirst?-ov:0,-D-ov,H)];
      this.quadOn(g, roof, C.trim);
      this.edgeOn(g, roof, C.wallDk, 1);
    }

    if(part === 'roof') return;

    const face = [G(0,0.4,H), G(w,0.4,H), G(w,0.4,0), G(0,0.4,0)];
    this.quadOn(g, face, C.wall);

    const kick = [G(2,0.42,kickH), G(w-2,0.42,kickH), G(w-2,0.42,0), G(2,0.42,0)];
    this.quadOn(g, kick, C.wallDk);

    const doorW = Math.min(DOOR_W*0.72, w*0.3);
    const doorX = doorLeft ? 6 : w - doorW - 6;
    const glassX0 = doorLeft ? doorX+doorW+4 : 6;
    const glassX1 = doorLeft ? w-6 : doorX-4;

    this.quadOn(g, [G(doorX,0.5,dZ1),G(doorX+doorW,0.5,dZ1),G(doorX+doorW,0.5,0),G(doorX,0.5,0)], C.wallDk);
    this.quadOn(g, [G(doorX+3,0.53,dZ1-4),G(doorX+doorW-3,0.53,dZ1-4),G(doorX+doorW-3,0.53,4),G(doorX+3,0.53,4)], 0x6b93a8, 0.85);

    if(glassX1 - glassX0 > 12){
      this.quadOn(g, [G(glassX0,0.5,winZ1+3),G(glassX1,0.5,winZ1+3),G(glassX1,0.5,winZ0-3),G(glassX0,0.5,winZ0-3)], 0xd8d0bd);
      this.quadOn(g, [G(glassX0+2,0.54,winZ1),G(glassX1-2,0.54,winZ1),G(glassX1-2,0.54,winZ0),G(glassX0+2,0.54,winZ0)], 0x6b93a8);
      this.quadOn(g, [G(glassX0+3,0.55,winZ1-3),G(glassX0+ (glassX1-glassX0)*0.4,0.55,winZ1-3),G(glassX0+(glassX1-glassX0)*0.4,0.55,winZ0+3),G(glassX0+3,0.55,winZ0+3)], 0x86adc0, 0.55);
    }

    const awnOut = 20, stripeN = 6;
    for(let i=0;i<stripeN;i++){
      const sx0 = w*i/stripeN, sx1 = w*(i+1)/stripeN;
      const col = AWNING_STRIPES[i%2===0?0:1] === 0xffffff ? 0xf0ece0 : C.wallLt;
      this.quadOn(g, [G(sx0,0.5,awnZ1),G(sx1,0.5,awnZ1),G(sx1,0.5+awnOut*0.01,awnZ0),G(sx0,0.5+awnOut*0.01,awnZ0)], col);
    }
    this.quadOn(g, [G(0,0.42,awnZ1+3),G(w,0.42,awnZ1+3),G(w,0.42,awnZ1),G(0,0.42,awnZ1)], C.trim);

    this.quadOn(g, [G(4,0.44,signZ1),G(w-4,0.44,signZ1),G(w-4,0.44,signZ0),G(4,0.44,signZ0)], C.sign);
    this.edgeOn(g, [G(4,0.44,signZ1),G(w-4,0.44,signZ1),G(w-4,0.44,signZ0),G(4,0.44,signZ0)], C.trim, 1);
  }

  drawWoodFence(g, ox, oy, dv, rv, w){
    const G = (a,b,h) => this.W(ox + dv.x*a + rv.x*b, oy + dv.y*a + rv.y*b, h);
    const H = PERSON_H*0.8, wood = 0x9d7a4e, woodDk = 0x7c5f3c; // ~chest height on a real person
    const post = x => this.quadOn(g, [G(x-3,0.4,H+5),G(x+3,0.4,H+5),G(x+3,0.4,0),G(x-3,0.4,0)], woodDk);
    post(2); post(Math.max(4,w-2));
    const rail = [G(0,0.42,H),G(w,0.42,H),G(w,0.42,H-8),G(0,0.42,H-8)];
    this.quadOn(g, rail, woodDk);
    const pickW = 7, gap = 5;
    for(let x = 8; x < w-6; x += pickW+gap){
      const p = [G(x,0.44,H+3),G(x+pickW,0.44,H+3),G(x+pickW,0.44,0),G(x,0.44,0)];
      this.quadOn(g, p, wood); g.lineStyle(1, woodDk, 0.4); g.strokePoints(p.map(pt=>new Phaser.Geom.Point(pt.x,pt.y)), true, true);
    }
  }

  drawChainFence(g, ox, oy, dv, rv, w){
    const G = (a,b,h) => this.W(ox + dv.x*a + rv.x*b, oy + dv.y*a + rv.y*b, h);
    const H = PERSON_H*1.02, post = 0x74797d, mesh = 0x9aa0a4; // just over head height
    const postAt = x => { const p0=G(x,0.4,H), p1=G(x,0.4,0); g.lineStyle(3, post, 1); g.lineBetween(p0.x,p0.y,p1.x,p1.y); };
    postAt(2); postAt(Math.max(4,w-2));
    const rail = G(0,0.4,H), rail2 = G(w,0.4,H);
    g.lineStyle(2, post, 1); g.lineBetween(rail.x, rail.y, rail2.x, rail2.y);
    /* diamond mesh: a clean cell-grid cross-hatch, cell size fixed so
       taller/wider fences get more cells instead of stretched diamonds */
    const cell = 16;
    const cols = Math.max(1, Math.round(w/cell));
    const rows = Math.max(1, Math.round(H/cell));
    g.lineStyle(1, mesh, 0.5);
    for(let c=0; c<cols; c++){
      const x0 = c*(w/cols), x1 = (c+1)*(w/cols);
      for(let r=0; r<rows; r++){
        const z0 = r*(H/rows), z1 = (r+1)*(H/rows);
        const p00 = G(x0,0.42,z1), p11 = G(x1,0.42,z0);
        g.lineBetween(p00.x,p00.y,p11.x,p11.y);
        const p01 = G(x0,0.42,z0), p10 = G(x1,0.42,z1);
        g.lineBetween(p01.x,p01.y,p10.x,p10.y);
      }
    }
  }

  drawFenceGap(g, ox, oy, dv, rv, w, seed){
    if(w < 8) return;
    const rng = mulberry32(seed);
    if(rng() < 0.5) this.drawWoodFence(g, ox, oy, dv, rv, w);
    else this.drawChainFence(g, ox, oy, dv, rv, w);
  }

  /* address fallback for the rare f===1/f===2 delivery (see
     GOOD_LEG_HEADING / route.addressUsesGate): same fence style the
     generic cutaway already uses everywhere else on the map, spanning
     the full house-unit width, with a gap at the door's exact
     position so the customer still has a real threshold to walk
     through. Static gate posts frame the opening — unlike the real
     door, there's no swing animation yet; first pass, revisit once
     it's been seen on-device. */
  drawGateFence(g, ox, oy, dv, rv, w, gateCenterX, gateHalfW, seed){
    const rng = mulberry32(seed);
    const useWood = rng() < 0.5;
    const seg = (sox, soy, sw) => {
      if(sw < 4) return;
      if(useWood) this.drawWoodFence(g, sox, soy, dv, rv, sw);
      else this.drawChainFence(g, sox, soy, dv, rv, sw);
    };
    const gLo = Math.max(0, gateCenterX - gateHalfW);
    const gHi = Math.min(w, gateCenterX + gateHalfW);
    seg(ox, oy, gLo);
    seg(ox + dv.x*gHi, oy + dv.y*gHi, w - gHi);
    const G = (a,b,h) => this.W(ox + dv.x*a + rv.x*b, oy + dv.y*a + rv.y*b, h);
    const H = PERSON_H*0.8, woodDk = 0x7c5f3c;
    const post = x => this.quadOn(g, [G(x-3,0.4,H+5),G(x+3,0.4,H+5),G(x+3,0.4,0),G(x-3,0.4,0)], woodDk);
    post(gLo); post(gHi);
  }

  /* commercial swinging door — same SL-hinge-rotation technique as
     drawDoorAssembly, restyled as glass storefront (thin frame, glass
     pane, handle bar). CENTERED on the unit rather than replicating
     drawStoreUnit's randomized doorLeft/doorX: the real pickupSpot
     already anchors to the unit's center (pu.w/2), so centering here
     is what makes robot/door/worker all agree, instead of chasing the
     door's random position with the other two. Dial-bench approved in
     labs/pickup-lab.html. */
  drawShopDoor(g, ox, oy, dv, rv, doorMidX, doorW, dZ1, dz, theta){
    const D = SHOPDOOR_ART, hw = doorW/2;
    const G = (dx, dy, dzz) => this.W(ox + dv.x*(doorMidX+dx) + rv.x*dy, oy + dv.y*(doorMidX+dx) + rv.y*dy, dz+dzz);
    const cT = Math.cos(theta), sT = Math.sin(theta);
    const SL = (u, perp, dzz) => G(-hw + u*cT - perp*sT, perp*cT + u*sT, dzz);

    const trim = 3;
    const frameOuter = [G(-hw-trim,0.5,dZ1+trim), G(hw+trim,0.5,dZ1+trim), G(hw+trim,0.5,0), G(-hw-trim,0.5,0)];
    this.quadOn(g, frameOuter, D.frame);
    const frameTop = [G(-hw-trim,0.5,dZ1+trim), G(hw+trim,0.5,dZ1+trim), G(hw+trim,0.52,dZ1), G(-hw-trim,0.52,dZ1)];
    this.quadOn(g, frameTop, D.frameLt);

    const face = [SL(0,2.2,dZ1), SL(2*hw,2.2,dZ1), SL(2*hw,2.2,0), SL(0,2.2,0)];
    this.quadOn(g, face, D.glass, 0.88);
    this.edgeOn(g, face, D.frameDk, 1.2);
    const gloss = [SL(3,2.3,dZ1-4), SL(2*hw*0.4,2.3,dZ1-4), SL(2*hw*0.4,2.3,dZ1*0.4), SL(3,2.3,dZ1*0.4)];
    this.quadOn(g, gloss, D.glassHi, 0.35);

    const h0 = SL(2*hw-6, 2.6, dZ1*0.62), h1 = SL(2*hw-6, 2.6, dZ1*0.38);
    g.lineStyle(3, D.handle, 1);
    g.lineBetween(h0.x, h0.y, h1.x, h1.y);
    const hk = SL(2*hw-6, 2.6, dZ1*0.5);
    g.fillStyle(D.handleHi, 1);
    g.fillCircle(hk.x, hk.y, 1.5*this.K*0.5);
  }

  /* ================= PICKUP SHOP: the dropoff customer's walk played
     in reverse. Same anchoring as world.customer (shop edge, not the
     robot's own spot/heading — that was the earlier bug: he landed on
     top of the robot because he was positioned relative to it instead
     of to the shop) and the same dyStart/dyEnd row-offset math, so he
     idles a full row out from the shop wall facing straight down rv
     (which is what puts him facing the robot, since rv points off the
     edge toward the road same as the customer's does). The only real
     difference from the customer: walkT here is pickupWalk, which
     eases 1->0 (out -> back inside) once "go" is pressed, instead of
     0->1 (in -> out) as doorTheta opens. */
  /* takeout bag — brown kraft paper, simple box with a lighter top
     face and a fold-line accent to read as a folded/rolled closure
     rather than a flat rectangle. Split into two passes (top/handle
     vs body) so the caller can draw the top+handle mid-sequence
     (getting covered by the carrying arm specifically) and the
     front/side after (staying visible in front). Dial-bench approved
     in labs/pickup-lab.html. */
  bagCorners(cx, cy, cz, dv, rv){
    const B = BAG_ART, hw = B.w/2, hd = B.d/2;
    /* face visibility: dv/rv are already real world-space direction
       vectors, same as drawPersonHull's G() points — no drawAngle
       rotation belongs here either, same fix/same reasoning. */
    const faceDV = Math.sign(dv.x + dv.y) || 1;
    const faceRV = Math.sign(rv.x + rv.y) || 1;
    /* hang from a top handle point rather than sitting with its
       bottom at the hand — cz is the top (grip height), bag hangs
       down from there. */
    const corner = (sx, sy, sz) => this.W(cx + rv.x*sx*hw + dv.x*sy*hd, cy + rv.y*sx*hw + dv.y*sy*hd, cz - (1-sz)*B.h);
    return { corner, faceDV, faceRV };
  }

  drawBagTop(g, cx, cy, cz, dv, rv){
    const B = BAG_ART;
    const { corner } = this.bagCorners(cx, cy, cz, dv, rv);
    const top = [corner(-1,-1,1), corner(1,-1,1), corner(1,1,1), corner(-1,1,1)];
    this.quadOn(g, top, B.paperLt);
    this.edgeOn(g, top, B.foldLine, 1);
    const f0 = corner(-0.55,-0.55,1), f1 = corner(0.55,0.55,1);
    g.lineStyle(1.5, B.foldLine, 0.8);
    g.lineBetween(f0.x, f0.y, f1.x, f1.y);
  }

  drawBagBody(g, cx, cy, cz, dv, rv){
    const B = BAG_ART;
    const { corner, faceDV, faceRV } = this.bagCorners(cx, cy, cz, dv, rv);
    const front = [corner(faceRV,-1,1), corner(faceRV,1,1), corner(faceRV,1,0), corner(faceRV,-1,0)];
    const side = [corner(-1,faceDV,1), corner(1,faceDV,1), corner(1,faceDV,0), corner(-1,faceDV,0)];
    this.quadOn(g, side, B.paperDk);
    this.quadOn(g, front, B.paper);
  }

  drawPickupUnit(g, ox, oy, dv, rv, doorCenterX, seed, t){
    if(!this.route.pickupSpot) return;
    this.pickupDoorDV = dv; this.pickupDoorRV = rv;
    this.pickupDoorUX = ox; this.pickupDoorUY = oy; this.pickupDoorCenterX = doorCenterX;
    this.pickupWorkerSeed = (seed ^ 0x77b1) >>> 0;
    const walkT = this.pickupWalk;
    const dz = this.groundZ(this.route.pickupS);

    /* door draws every frame regardless of worker visibility — it has
       its own idle-closed resting state (doorSwing eases back to 0
       whenever state !== "play", same as normal storefronts look).
       Deferred to a callback now instead of drawing here immediately:
       once he's walking back in (dy goes negative — past the door
       plane), he needs to draw BEHIND the door, not always under it. */
    const unitW = doorCenterX*2;
    const doorW = Math.min(DOOR_W*0.72, unitW*0.3);
    const dZ1 = DOOR_H*0.88;
    const drawDoor = () => this.drawShopDoor(g, ox, oy, dv, rv, doorCenterX, doorW, dZ1, dz, this.doorSwing);

    /* stay visible until he's both arrived (walkT===0) AND the door has
       actually swung shut behind him — previously this cut him at
       walkT<=0.02 regardless of the door, so he could vanish while the
       door was still wide open. */
    if(walkT <= 0.001 && this.doorSwing <= 0.02){ drawDoor(); return; }

    const wrng = mulberry32(seed ^ 0x77b1);
    const wBuild = PEOPLE_BUILD[wrng()<0.5?0:1];
    const wSkin = PEOPLE_SKIN[Math.floor(wrng()*PEOPLE_SKIN.length)];
    const wShirt = PEOPLE_SHIRT[Math.floor(wrng()*PEOPLE_SHIRT.length)];
    const wPants = PEOPLE_PANTS[Math.floor(wrng()*PEOPLE_PANTS.length)];
    const wHair = PEOPLE_HAIR[Math.floor(wrng()*PEOPLE_HAIR.length)];
    const wShoe = PEOPLE_SHOE[Math.floor(wrng()*PEOPLE_SHOE.length)];

    const wu = 1 - Math.pow(1 - walkT, 2);
    /* MEET POINT, the dropoff treatment mirrored: the worker stands at
       the real door->robot line stopped 35 units short of the bin — not
       the old fixed dy (T2*2.1-50), which left an air gap the bag had
       to be TOSSED across. This close, the hand-to-bin pass reads as
       SETTING the bag in (on-device request). pickupSpot is where the
       robot is teleported at route load, so the meet is static and
       exact; correct in all 4 headings since it's a world vector. */
    const doorPx = ox + dv.x*doorCenterX, doorPy = oy + dv.y*doorCenterX;
    const spot = this.route.pickupSpot;
    let mvx = spot.x - doorPx, mvy = spot.y - doorPy;
    const meetDist = Math.hypot(mvx, mvy) || 1; mvx /= meetDist; mvy /= meetDist;
    /* 12 from CENTER (walked in from 35 -> 20 -> 12 on-device): his hull
       overlaps the shell's footprint slightly in plan, which in iso is
       exactly what "leaning over the open bin" looks like — the hand
       lands inside the mouth. */
    const meetX = spot.x - mvx*12, meetY = spot.y - mvy*12;
    const backX = doorPx - rv.x*30, backY = doorPy - rv.y*30;   // walk-back ends past the door plane
    const workerX = Phaser.Math.Linear(backX, meetX, wu), workerY = Phaser.Math.Linear(backY, meetY, wu);
    const dy = (workerX - doorPx)*rv.x + (workerY - doorPy)*rv.y;  // signed door-plane side (draw order below)
    const facingRobot = Math.atan2(mvy, mvx) - Math.PI/2;          // faces the BIN along the true approach
    /* flip to face the shop only once the WALK phase has actually
       begun (loadDone), not just state==="play" broadly — that raw
       state check would have flipped him the instant "go" was
       pressed, mid-loading, before he'd even placed the bag yet. */
    const thW = this.loadDone ? facingRobot + Math.PI : facingRobot;
    // idle/loading: faces the robot (rv). walking back: faces the shop (-rv) — reads as
    // walking AWAY once the walk phase starts, instead of backing up while still
    // staring at the robot. drawPersonHull's forward axis is (-sin,cos), not
    // (cos,sin), hence the -PI/2 on the base term.

    const moving = walkT > 0.02 && walkT < 0.98;
    const walkPhase = moving ? Math.sin(t*PEOPLE_ART.walkSpeed) : 0;
    const liftT = this.pickupLiftT || 0, released = !!this.pickupReleased, loadFrac = this.pickupLoadFrac || 0;

    /* bag: locked to the actual hand position (handWorldPos, same
       formula the arm is drawn with) while still held — including
       idle, so he's holding it from frame one at the natural resting
       height, not floating separately or popping in. Once released,
       it arcs from the exact point it left his hand to the bin.
       Position computed here, before the worker draws, so it's ready
       for the mid-sequence callback below (top face drawn between
       torso and the carrying arm, so only the arm covers it — not
       the whole silhouette, which nearly erased it entirely in an
       earlier version). */
    const bagVisible = !this.loadDone;
    let bagX, bagY, bagZ;
    if(bagVisible){
      /* holdFwd/holdDown taper with lift, same reasoning as the
         dropoff customer's catch: the offsets are LEG clearance for
         the resting pose, not part of the raised-arm geometry — at
         full extension they floated the bag past the fingertips.
         Idle stance (liftT=0) is pixel-identical to the approved
         look; only the mid-rise tracking tightens. */
      if(!released){
        const hp = this.handWorldPos(workerX, workerY, thW, wBuild, liftT);
        const taper = 1 - liftT;
        bagX = hp.x + rv.x*BAG_ART.holdFwd*taper; bagY = hp.y + rv.y*BAG_ART.holdFwd*taper; bagZ = hp.z - BAG_ART.holdDown*taper;
      } else {
        const hp = this.handWorldPos(workerX, workerY, thW, wBuild, 1);
        const releasePt = { x: hp.x, y: hp.y, z: hp.z };   // full reach: zero taper — departs exactly from the hand
        const arcT = Phaser.Math.Clamp((loadFrac - LOAD_ART.holdEnd) / (LOAD_ART.dropFrac - LOAD_ART.holdEnd), 0, 1);
        const botX = this.botX, botY = this.botY;
        /* target the MOUTH, not the torso: the old endpoint (center,
           z+26) sent the bag diving behind the body wall — and the
           robot draws after the world pass, so the shell painted over
           the final approach and the bag just vanished into the side
           (on-device: "doesn't look like it goes into the bin"). The
           bin's mouth is at the TOP of the shell under the open lid:
           land on its NEAR RIM (worker's side, 8 units in from the
           edge line) at rim height, so the whole drop stays visible
           until the lid closes over it. Arc height ∝ distance, with a
           floor so the crest always clears the rim. */
        const tvx = releasePt.x - botX, tvy = releasePt.y - botY;
        const td = Math.hypot(tvx, tvy) || 1;
        const rimX = botX + tvx/td*8, rimY = botY + tvy/td*8;
        const rimZ = this.botZ + 50;
        const arcHz = Math.max(6, Math.min(LOAD_ART.arcH, td * 0.3));
        bagX = Phaser.Math.Linear(releasePt.x, rimX, arcT);
        bagY = Phaser.Math.Linear(releasePt.y, rimY, arcT);
        bagZ = Phaser.Math.Linear(releasePt.z, rimZ, arcT) + Math.sin(arcT*Math.PI)*arcHz;
      }
    }

    const topCb = bagVisible ? () => this.drawBagTop(g, bagX, bagY, bagZ, dv, rv) : null;
    const drawWorker = () => {
      this.drawPersonHull(g, workerX, workerY, dz, thW, wBuild, wSkin, wShirt, wPants, wHair, wShoe, walkPhase, moving, 0, liftT, topCb);
      if(bagVisible) this.drawBagBody(g, bagX, bagY, bagZ, dv, rv);
    };

    /* which side of the door plane he's actually on decides draw
       order now, not a fixed sequence — same "compute it, don't
       hardcode it" idea as lidNear()/flagNear(), just answered with
       dy (already shop-local, already correct in all 4 orientations
       by construction) instead of a raw world x+y comparison, which
       flips sign depending on which way rv happens to point and gave
       the wrong answer on two of the four shop-facing directions when
       tried. Previously the door always painted first and he always
       painted over it, which only looked right while dy>=0 (still out
       front). Once "go" sends him walking back in past the door plane
       (dy<0), he needs to be the one that gets painted over instead. */
    if(dy < 0){ drawWorker(); drawDoor(); }
    else { drawDoor(); drawWorker(); }
  }

  /* what replaces a culled housing edge: one continuous fence spanning
     the whole edge (fences are paper-thin, no real depth into the
     block, so unlike houses they don't have a corner-overlap problem
     and can safely run edge-to-edge) — the grass stays, this is just
     the yard boundary instead of a row of houses. */
  drawSolidFenceRow(g, ox, oy, dv, rv, w, seed){
    const margin = T2*0.4;
    this.drawWoodFence(g, ox+dv.x*margin, oy+dv.y*margin, dv, rv, w-margin*2);
  }

  /* what replaces a culled commercial edge: painted parking stalls
     along the curb, some occupied — reads as "customer parking for
     the shop you can't currently see the front of" rather than a
     dead gap in the street. */
  drawParkingRow(g, ox, oy, dv, rv, w, seed, t=0){
    /* nose-in, sized to the REAL car (CARC: 450 long x 180 wide).
       Two things fixed here after the first pass:
       1. Sign — every other block-wrap element treats NEGATIVE b as
          "into the block" (houses' back wall is at -D). The first
          version positioned stalls at POSITIVE b, which extended the
          whole lot outward onto the sidewalk/street instead of inward
          — not a sizing issue, a flipped sign.
       2. Position — stalls now start behind where the culled
          building's own footprint was (STORE_DEPTH+margin), not right
          at the edge line. Cars end up parked roughly where the house
          used to be, not on the sidewalk path the robot walks.
       3. Count — a small FIXED cluster (2-3), centered on the edge,
          instead of packing however many fit across the whole block
          face, which read as a parking garage rather than a few
          customer spots for one small business. */
    const rng = mulberry32(seed);
    const stallW = CARC.wid + 40;
    const stallDepth = CARC.len + 50;
    const nStalls = 2 + Math.floor(rng()*2); // 2-3
    const clusterW = nStalls * stallW;
    if(w < clusterW + T2) return [];
    const startAlong = (w - clusterW) / 2; // centered along the edge, not spanning it
    const depthNear = -6;  // rear bumper right at the block boundary line — same depth a house's front wall sits at, so it's back in the camera's normal framing (300-800 deep was outside typical view around the robot)
    const depthFar = depthNear - stallDepth;
    const G = (a,b,h) => this.W(ox + dv.x*a + rv.x*b, oy + dv.y*a + rv.y*b, h);
    g.lineStyle(2, 0xf0ece0, 0.75);
    for(let i=0; i<=nStalls; i++){
      const x = startAlong + i*stallW;
      const a = G(x, depthNear, 1), b = G(x, depthFar, 1);
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
    const fdirIn = DIRV.findIndex(d => d.x===-rv.x && d.y===-rv.y); // nose pointing deeper into the block
    const cars = [];
    for(let i=0; i<nStalls; i++){
      const cx = startAlong + (i+0.5)*stallW;
      const cDepth = (depthNear + depthFar) / 2;
      const cWorldX = ox + dv.x*cx + rv.x*cDepth, cWorldY = oy + dv.y*cx + rv.y*cDepth;
      if(rng() < 0.85){
        const kind = rng() < 0.75 ? "car" : "truck";
        cars.push({ x: cWorldX, y: cWorldY, fdir: fdirIn, kind });
      }
    }
    return cars;
  }

  drawBenchProp(g, x, y, dv){
    const rv = DIRV[(DIRV.indexOf(dv)+1)%4] || {x:-dv.y,y:dv.x};
    const B = BENCH_ART;
    const G = (a,b,h) => this.W(x + dv.x*a + rv.x*b, y + dv.y*a + rv.y*b, h);
    const hw = B.w/2;

    const legL = [G(-hw+4,0.3,B.seatH), G(-hw+4,0.3,0)];
    const legR = [G(hw-4,0.3,B.seatH), G(hw-4,0.3,0)];
    g.lineStyle(4, B.leg, 1);
    g.lineBetween(legL[0].x,legL[0].y,legL[1].x,legL[1].y);
    g.lineBetween(legR[0].x,legR[0].y,legR[1].x,legR[1].y);

    const seat = [G(-hw,0.4,B.seatH), G(hw,0.4,B.seatH), G(hw,0.15,B.seatH), G(-hw,0.15,B.seatH)];
    this.quadOn(g, seat, B.wood); this.edgeOn(g, seat, B.woodDk, 1);
    const seatFace = [G(-hw,0.4,B.seatH), G(hw,0.4,B.seatH), G(hw,0.4,B.seatH-4), G(-hw,0.4,B.seatH-4)];
    this.quadOn(g, seatFace, B.woodDk);

    const back = [G(-hw,0.42,B.seatH+B.backH), G(hw,0.42,B.seatH+B.backH), G(hw,0.42,B.seatH), G(-hw,0.42,B.seatH)];
    this.quadOn(g, back, B.woodLt); this.edgeOn(g, back, B.woodDk, 1);
    g.lineStyle(1, B.woodDk, 0.4);
    for(let i=1;i<3;i++){ const yy=B.seatH + B.backH*i/3; const a=G(-hw,0.42,yy), b=G(hw,0.42,yy); g.lineBetween(a.x,a.y,b.x,b.y); }
  }

  /* park/commercial scatter: real approved props (palm/planter), not
     lab placeholders — this.drawProp already handles both kinds.
     dv defaults to DIRV[0] for callers that don't care (commercial
     interior scatter, fully random placement, no nearby edge to
     stay parallel to). */
  scatterBlockProp(g, x, y, kind, t, dv=DIRV[0]){
    if(kind === "bench") this.drawBenchProp(g, x, y, dv);
    else this.drawProp(g, kind, x, y, t);
  }

  /* shared 4-edge descriptor — edges[0] is always the block's NORTH
     edge (dv=DIRV[0], outward rv=DIRV[3]). Used by queueing AND by the
     wall-fade system, which needs to single out just edges[0] without
     duplicating this construction a third time. */
  blockEdges(blk){
    return [
      { ox: blk.x0, oy: blk.y0, dv: DIRV[0], rv: DIRV[3], len: blk.x1-blk.x0 },
      { ox: blk.x1, oy: blk.y0, dv: DIRV[1], rv: DIRV[0], len: blk.y1-blk.y0 },
      { ox: blk.x1, oy: blk.y1, dv: DIRV[2], rv: DIRV[1], len: blk.x1-blk.x0 },
      { ox: blk.x0, oy: blk.y1, dv: DIRV[3], rv: DIRV[2], len: blk.y1-blk.y0 }
    ];
  }

  queueHousingEdgeAt(vq, e, isAddressEdge=false, cornerSkip=null){
    const eseed = ((Math.round(e.ox*3+e.dv.x)*7919) ^ (Math.round(e.oy*3+e.dv.y)*104729) ^ 0x9e3779b9) >>> 0;
    const units = packEdge(e.len, mulberry32(eseed));
    units.forEach((u, idx) => {
      const hx = e.ox + e.dv.x*(u.start + u.w/2), hy = e.oy + e.dv.y*(u.start + u.w/2);
      const hseed = ((Math.round(hx)*7919) ^ (Math.round(hy)*104729)) >>> 0;
      const ux = e.ox + e.dv.x*u.start, uy = e.oy + e.dv.y*u.start;
      const isAddress = isAddressEdge && idx === this.route.addressUnitIdx;
      const isGateMode = isAddress && this.route.addressUsesGate;
      if(cornerSkip && !isAddress && cornerSkip(hx, hy)) return;   // corner-loom trim
      if(isAddress){
        const doorCenterX = u.w/2;
        const dz = this.groundZ(this.route.doorS);
        this.addrDoorPos = { x: ux + e.dv.x*doorCenterX, y: uy + e.dv.y*doorCenterX, z: dz };
        this.addrDoorDV = e.dv; this.addrDoorRV = e.rv;
        this.addrDoorUX = ux; this.addrDoorUY = uy; this.addrDoorCenterX = doorCenterX;
        this.addrCustSeed = (hseed ^ 0x4c75) >>> 0;
        vq.push({ depth:hx+hy, fn:(g,t)=>{
          if(!isGateMode) this.drawHouseUnit(g, ux, uy, e.dv, e.rv, u.w, hseed, true, 'body');
          /* gate mode draws the customer/bag on gFront instead of
             gWorld — gFront is structurally the one layer above the
             robot's own layer (used elsewhere for "hazards nearer the
             camera than the robot"), so this is what actually puts
             him in front of the robot rather than behind it. The
             fence/gate/mat stay on gWorld, unchanged. */
          const custG = isGateMode ? this.gFront : g;
          const drawDoorAndMat = isGateMode
            ? () => {
                this.drawGateFence(g, ux, uy, e.dv, e.rv, u.w, doorCenterX, GATE_HALF_W, hseed);
                this.drawMatQuad(g, ux, uy, e.dv, e.rv, doorCenterX, dz);
              }
            : () => {
                this.drawDoorAssembly(g, ux, uy, e.dv, e.rv, doorCenterX, dz, this.doorTheta);
                this.drawMatQuad(g, ux, uy, e.dv, e.rv, doorCenterX, dz);
              };
          /* world.customer: same design as prop.people via drawPersonHull().
             Walk path from the door lab: dyStart=4, dyEnd=T2-8 (stops near
             the mat's road-side edge), triggered by the door's own hinge
             angle. Position now anchored to the real house unit instead
             of a route-relative point. */
          const custSeed = (hseed ^ 0x4c75) >>> 0;
          const crng = mulberry32(custSeed);
          const cBuild = PEOPLE_BUILD[crng() < 0.5 ? 0 : 1];
          const cSkin = PEOPLE_SKIN[Math.floor(crng()*PEOPLE_SKIN.length)];
          const cShirt = PEOPLE_SHIRT[Math.floor(crng()*PEOPLE_SHIRT.length)];
          const cPants = PEOPLE_PANTS[Math.floor(crng()*PEOPLE_PANTS.length)];
          const cHair = PEOPLE_HAIR[Math.floor(crng()*PEOPLE_HAIR.length)];
          const cShoe = PEOPLE_SHOE[Math.floor(crng()*PEOPLE_SHOE.length)];
          const walkT = Phaser.Math.Clamp(this.doorTheta / DOOR_ART.openAngle, 0, 1);
          /* the customer now walks the full line from the door to the
             robot's actual stop (this.wonMeet, computed in the won
             timeline in drawRobot), instead of stopping at the mat's
             edge and lobbing the bag through the air. Walk-out and
             walk-back both run on distance-based clocks (wonOutFrac /
             wonWalk); facing comes from the real approach vector
             (wonMeetTh), flipped +PI on the way home. */
          const meet = this.wonMeet;
          /* gate mode: he's standing there waiting from the moment the
             gate is visible at all — there's no door to knock on, so
             "wait for the knock" doesn't apply the way it does for a
             real house. Door mode is completely untouched: still bails
             to door+mat only until winning starts, exactly as before. */
          if(!meet && !isGateMode){ drawDoorAndMat(); return; }
          const doorPx = ux + e.dv.x*doorCenterX, doorPy = uy + e.dv.y*doorCenterX;
          const startPx = doorPx + e.rv.x*4,   startPy = doorPy + e.rv.y*4;    // just outside the door
          /* gate mode walks much further back before he's "gone" — a
             real house wall hides him after 24 units; an open gate has
             nothing to hide behind, so it takes actual distance to
             read as having left the scene rather than just stopping
             short. First-pass distance, worth eyeballing on-device. */
          const backDist = isGateMode ? GATE_WALKOFF_DIST : 24;
          const backPx  = doorPx - e.rv.x*backDist,  backPy  = doorPy - e.rv.y*backDist;
          const outFrac = this.wonOutFrac || 0;
          const wonWalk = this.state === "won" ? (this.wonWalk || 0) : 0;
          const inWalkBack = wonWalk > 0;
          /* doorTheta (the hinge angle) is meaningless for a gate — nothing
             ever opens it — so gate mode drops that half of the check. */
          const goneInside = inWalkBack && wonWalk >= 0.999 && (isGateMode || this.doorTheta <= 0.02);
          const custVisible = isGateMode ? !goneInside : (!goneInside && (inWalkBack || outFrac > 0.001));
          if(!custVisible){ drawDoorAndMat(); return; }
          let cx, cy, thW, moving;
          if(!meet){
            /* gate mode only, pre-win: static wait, facing out through
               the gate toward the street. */
            cx = startPx; cy = startPy; thW = Math.atan2(e.rv.y, e.rv.x); moving = false;
          } else if(inWalkBack){
            const wu2 = 1 - Math.pow(1 - wonWalk, 2);
            cx = Phaser.Math.Linear(meet.x, backPx, wu2);
            cy = Phaser.Math.Linear(meet.y, backPy, wu2);
            thW = this.wonMeetTh + Math.PI;                 // faces home
            moving = wonWalk > 0.02 && wonWalk < 0.98;
          } else {
            const wu = 1 - Math.pow(1 - outFrac, 2);
            cx = Phaser.Math.Linear(startPx, meet.x, wu);
            cy = Phaser.Math.Linear(startPy, meet.y, wu);
            thW = this.wonMeetTh;                           // faces the robot
            moving = outFrac > 0.02 && outFrac < 0.98;
          }
          /* signed distance from the door plane, along rv — the same
             computed draw-order test as before, now taken from his
             actual position since the path is no longer a pure rv line. */
          const dy = (cx - doorPx)*e.rv.x + (cy - doorPy)*e.rv.y;
          const walkPhase = moving ? Math.sin(t*PEOPLE_ART.walkSpeed) : 0;
          /* dropoff bag: the pickup's arc run in reverse — rises out
             of the bin (same z-26 grip height the worker dropped it
             to) and flies to where the customer's hand WILL be at
             full reach, not where the mid-rise hand currently is,
             then locks to the hand while his arm eases back down and
             stays there for the whole carry back inside. Timeline
             values come from the won-handoff block in drawRobot
             (this.wonFrac / this.wonLiftT) — the same "compute in
             drawRobot, read in the world draw" pattern drawPickupUnit
             already uses. Same interleave as the worker too: bag top
             via the onBeforeCarryArm callback (so only the carrying
             arm covers it), body after. */
          const liftT = this.wonLiftT || 0;
          const wonFrac = this.wonFrac || 0;
          let bagVisible = false, bagX, bagY, bagZ;
          if(this.state === "won" && wonFrac > LOAD_ART.holdEnd){
            bagVisible = true;
            /* the catch point is the bare hand at full reach — the
               holdFwd/holdDown offsets are worker-only (his dialed
               "presenting it out in front" pose); the customer's bag
               targets and rides the hand itself. */
            if(wonFrac < LOAD_ART.dropFrac){
              const arcT = (wonFrac - LOAD_ART.holdEnd) / (LOAD_ART.dropFrac - LOAD_ART.holdEnd);
              const hp1 = this.handWorldPos(cx, cy, thW, cBuild, 1);   // catch point: full reach, zero taper
              /* arc height scales with the flight distance now that he
                 stands right at the bin — a fixed 26-unit loop over a
                 ~40-unit pass read as a moon shot. */
              const arcHz = Math.min(LOAD_ART.arcH, Math.hypot(this.botX - cx, this.botY - cy) * 0.3);
              bagX = Phaser.Math.Linear(this.botX, hp1.x, arcT);
              bagY = Phaser.Math.Linear(this.botY, hp1.y, arcT);
              bagZ = Phaser.Math.Linear(this.botZ + 26, hp1.z, arcT) + Math.sin(arcT*Math.PI)*arcHz;
            } else {
              /* held: locked EXACTLY to the hand — no holdFwd/holdDown
                 at all. Those offsets are the WORKER's dialed
                 "presenting the delivery out in front" pose; the
                 customer just carries it, so it rides the hand down
                 the whole descent and settles hanging at his SIDE
                 (hand at rest sits below the shoulder on his flank,
                 bag hangs from the grip). Draws after the hull, so
                 it reads in front of the near leg, like a carried
                 bag brushing it. Through the turn-around, thW's flip
                 moves hand and bag together — it stays in his grip. */
              const hp = this.handWorldPos(cx, cy, thW, cBuild, liftT);
              bagX = hp.x; bagY = hp.y; bagZ = hp.z;
            }
          }
          const topCb = bagVisible ? () => this.drawBagTop(custG, bagX, bagY, bagZ, e.dv, e.rv) : null;
          const drawCust = () => {
            this.drawPersonHull(custG, cx, cy, dz, thW, cBuild, cSkin, cShirt, cPants, cHair, cShoe, walkPhase, moving, 0, liftT, topCb);
            if(bagVisible) this.drawBagBody(custG, bagX, bagY, bagZ, e.dv, e.rv);
          };
          /* which side of the door plane he's on decides draw order —
             same computed test as the pickup worker (his dy<0 branch):
             once he's back through the doorway he draws BEHIND the
             door/mat, not painted over them. */
          if(dy < 0){ drawCust(); drawDoorAndMat(); }
          else { drawDoorAndMat(); drawCust(); }
        }});
        vq.push({ depth:hx+hy, isRoof:true, fn:(g)=>{ if(!isGateMode) this.drawHouseUnit(g, ux, uy, e.dv, e.rv, u.w, hseed, true, 'roof'); } });
      } else if(isAddressEdge && this.route.addressUsesGate){
        /* every OTHER house packed on the gate's own edge — the address
           unit above already got its own gate via isGateMode, but this
           edge's blanket exemption from cutEdges (needed so that gate
           can render at all) meant every neighboring house on the same
           edge was still drawing as a full, un-cut house right next to
           it, on a heading where the cutaway exists specifically
           because that's not safe. Fence them too, same as the generic
           cutaway would if this edge weren't specially exempted. */
        vq.push({ depth:hx+hy, fn:(g)=>this.drawFenceGap(g, ux, uy, e.dv, e.rv, u.w, hseed) });
      } else {
        vq.push({ depth:hx+hy, fn:(g)=>this.drawHouseUnit(g, ux, uy, e.dv, e.rv, u.w, hseed, false, 'body') });
        vq.push({ depth:hx+hy, isRoof:true, fn:(g)=>this.drawHouseUnit(g, ux, uy, e.dv, e.rv, u.w, hseed, false, 'roof') });
      }
    });
    for(const gp of gapsFromUnits(units, e.len)){
      const gx = e.ox + e.dv.x*(gp.start+gp.w/2), gy = e.oy + e.dv.y*(gp.start+gp.w/2);
      const gseed = ((Math.round(gx)*7919) ^ (Math.round(gy)*104729) ^ 0x2f6c) >>> 0;
      const fx = e.ox + e.dv.x*gp.start, fy = e.oy + e.dv.y*gp.start;
      vq.push({ depth:gx+gy, fn:(g)=>this.drawFenceGap(g, fx, fy, e.dv, e.rv, gp.w, gseed) });
    }
  }
  queueHousingBlock(vq, blk, excludeEdges=null, cornerSkip=null){
    const isAddressBlock = (blk === this.route.addressBlock);
    this.blockEdges(blk).forEach((e, idx) => {
      if(excludeEdges && excludeEdges.includes(idx)) return;
      this.queueHousingEdgeAt(vq, e, isAddressBlock && idx === this.route.addressEdgeIdx, cornerSkip);
    });
  }

  queueCommercialEdgeAt(vq, e, isPickupEdge=false, cornerSkip=null){
    const eseed = ((Math.round(e.ox*3+e.dv.x)*7919) ^ (Math.round(e.oy*3+e.dv.y)*104729) ^ 0x51b3) >>> 0;
    const units = packEdgeNoGap(e.len, mulberry32(eseed));
    units.forEach((u, idx) => {
      const hx = e.ox + e.dv.x*(u.start + u.w/2), hy = e.oy + e.dv.y*(u.start + u.w/2);
      const hseed = ((Math.round(hx)*7919) ^ (Math.round(hy)*104729)) >>> 0;
      const ux = e.ox + e.dv.x*u.start, uy = e.oy + e.dv.y*u.start;
      const isFirst = idx===0, isLast = idx===units.length-1;
      const isPickup = isPickupEdge && idx === this.route.pickupUnitIdx;
      if(cornerSkip && !isPickup && cornerSkip(hx, hy)) return;    // corner-loom trim
      vq.push({ depth:hx+hy, fn:(g,t)=>{
        this.drawStoreUnit(g, ux, uy, e.dv, e.rv, u.w, hseed, isFirst, isLast, 'body');
        if(isPickup) this.drawPickupUnit(g, ux, uy, e.dv, e.rv, u.w/2, hseed, t);
      }});
      vq.push({ depth:hx+hy, isRoof:true, fn:(g)=>this.drawStoreUnit(g, ux, uy, e.dv, e.rv, u.w, hseed, isFirst, isLast, 'roof') });
    });
  }
  queueCommercialBlock(vq, blk, excludeEdges=null, cornerSkip=null){
    const isPickupBlock = (blk === this.route.pickupBlock);
    this.blockEdges(blk).forEach((e, idx) => {
      if(excludeEdges && excludeEdges.includes(idx)) return;
      this.queueCommercialEdgeAt(vq, e, isPickupBlock && idx === this.route.pickupEdgeIdx, cornerSkip);
    });
    const cx = (blk.x0+blk.x1)/2, cy = (blk.y0+blk.y1)/2;
    const rng = mulberry32(((Math.round(cx)*7919) ^ (Math.round(cy)*104729) ^ 0x71c4) >>> 0);
    const nPlanter = 2 + Math.floor(rng()*2);
    for(let k=0;k<nPlanter;k++){
      const x = blk.x0 + rng()*(blk.x1-blk.x0), y = blk.y0 + rng()*(blk.y1-blk.y0);
      vq.push({ depth:x+y, fn:(g,t)=>this.scatterBlockProp(g, x, y, "planter", t) });
    }
    const nBench = 1 + Math.floor(rng()*2);
    for(let k=0;k<nBench;k++){
      const x = blk.x0 + rng()*(blk.x1-blk.x0), y = blk.y0 + rng()*(blk.y1-blk.y0);
      vq.push({ depth:x+y, fn:(g,t)=>this.scatterBlockProp(g, x, y, "bench", t) });
    }
  }

  queueParkBlock(vq, blk){
    const rng = mulberry32(((Math.round((blk.x0+blk.x1)/2)*7919) ^ (Math.round((blk.y0+blk.y1)/2)*104729) ^ 0x50a2) >>> 0);
    /* clusters, not isolated single trees — real palms/dwarf palms
       (both already exist as approved props, height ratio ~3x) mixed
       in per-tree, with each cluster member independently offset so
       drawProp's own position-seeded height jitter (±15%) gives
       natural variety within a group too, not just between groups. */
    const nClusters = 2 + Math.floor(rng()*3);
    for(let k=0;k<nClusters;k++){
      const cx = blk.x0 + rng()*(blk.x1-blk.x0), cy = blk.y0 + rng()*(blk.y1-blk.y0);
      const sizeRoll = rng();
      const clusterSize = sizeRoll < 0.5 ? 1 : sizeRoll < 0.8 ? 2 : 3;
      for(let m=0; m<clusterSize; m++){
        const tx = cx + (rng()-0.5)*T2*1.2, ty = cy + (rng()-0.5)*T2*1.2;
        const kind = rng() < 0.3 ? "palm" : "palmDwarf"; // occasional tall accent tree
        vq.push({ depth:tx+ty, fn:(g,t)=>this.scatterBlockProp(g, tx, ty, kind, t) });
      }
    }
    const nBench = 1 + Math.floor(rng()*2);
    for(let k=0;k<nBench;k++){
      const edge = Math.floor(rng()*4), tt = 0.2+rng()*0.6;
      let x,y;
      /* bench half-width is ~80 units (PERSON_H*1.3/2) -- the 14-unit
         inward offset only keeps it clear of the boundary along the
         SHORT axis (seat depth, under 1 unit). The long axis has to
         run parallel to whichever edge it's near, or it punches
         straight through onto the sidewalk on the other side. Top/
         bottom edges want it horizontal (DIRV[0]); left/right want
         it vertical (DIRV[1]) -- swapped from each other, not the
         same orientation everywhere. */
      let dv;
      if(edge===0){ x = blk.x0+(blk.x1-blk.x0)*tt; y = blk.y0+14; dv = DIRV[0]; }
      else if(edge===1){ x = blk.x1-14; y = blk.y0+(blk.y1-blk.y0)*tt; dv = DIRV[1]; }
      else if(edge===2){ x = blk.x0+(blk.x1-blk.x0)*tt; y = blk.y1-14; dv = DIRV[0]; }
      else { x = blk.x0+14; y = blk.y0+(blk.y1-blk.y0)*tt; dv = DIRV[1]; }
      vq.push({ depth:x+y, fn:(g,t)=>this.scatterBlockProp(g, x, y, "bench", t, dv) });
    }
  }

  fillBlockGround(g, blk){
    if(blk.type === "park") return this.fillBlockInterior(g, blk, GRASS);
    if(blk.type === "commercial") return this.fillBlockInterior(g, blk, PLAZA);
    this.fillBlockInterior(g, blk, GRASS); // housing yard
  }
  queueBlockContent(vq, blk, excludeEdges=null){
    if(blk.type === "park") return this.queueParkBlock(vq, blk);
    /* corner-loom trim: cutting a street-facing edge removes ITS units,
       but the perpendicular edges' corner-most units still hug that
       same street and loom over the walk near block ends (reported on
       f=1). Suppress any unit whose center falls within CORNER_TRIM of
       a cut street line — a world-space test, so it's correct for
       every cut edge and heading by construction. The pickup and
       address units are immune (guarded at the unit loops), matching
       the cutEdges guards. */
    let cornerSkip = null;
    if(excludeEdges && excludeEdges.length){
      const CORNER_TRIM = 420;
      const x0 = blk.i*BLOCK, x1 = (blk.i+1)*BLOCK, y0 = blk.j*BLOCK, y1 = (blk.j+1)*BLOCK;
      cornerSkip = (hx, hy) => excludeEdges.some(e2 =>
        (e2 === 0 && hy < y0 + CORNER_TRIM) ||
        (e2 === 2 && hy > y1 - CORNER_TRIM) ||
        (e2 === 3 && hx < x0 + CORNER_TRIM) ||
        (e2 === 1 && hx > x1 - CORNER_TRIM));
    }
    if(blk.type === "commercial") return this.queueCommercialBlock(vq, blk, excludeEdges, cornerSkip);
    this.queueHousingBlock(vq, blk, excludeEdges, cornerSkip);
  }

  fillExteriorLot(g, lot){
    if(lot.type === "park"){
      const rect = lotRect(lot.ox, lot.oy, lot.dv, lot.rv, lot.len, EXT_PARK_DEPTH);
      return this.fillBlockInterior(g, rect, GRASS);
    }
    const rect = lotRect(lot.ox, lot.oy, lot.dv, lot.rv, lot.len, EXT_YARD_DEPTH);
    this.fillBlockInterior(g, rect, lot.type === "commercial" ? PLAZA : GRASS);
  }
  queueExteriorLot(vq, lot){
    if(lot.type === "park"){
      const rect = lotRect(lot.ox, lot.oy, lot.dv, lot.rv, lot.len, EXT_PARK_DEPTH);
      return this.queueParkBlock(vq, rect);
    }
    const faceIn = { x:-lot.rv.x, y:-lot.rv.y }; // body sits outside the grid, front faces back IN toward the sidewalk
    if(lot.type === "commercial"){
      const eseed = ((Math.round(lot.ox*3+lot.dv.x)*7919) ^ (Math.round(lot.oy*3+lot.dv.y)*104729) ^ 0x51b3) >>> 0;
      const units = packEdgeNoGap(lot.len, mulberry32(eseed));
      units.forEach((u, idx) => {
        const hx = lot.ox + lot.dv.x*(u.start+u.w/2), hy = lot.oy + lot.dv.y*(u.start+u.w/2);
        const hseed = ((Math.round(hx)*7919) ^ (Math.round(hy)*104729)) >>> 0;
        const ux = lot.ox+lot.dv.x*u.start, uy = lot.oy+lot.dv.y*u.start;
        const isFirst = idx===0, isLast = idx===units.length-1;
        vq.push({ depth:hx+hy, fn:(g)=>this.drawStoreUnit(g, ux, uy, lot.dv, faceIn, u.w, hseed, isFirst, isLast, 'body') });
        vq.push({ depth:hx+hy, isRoof:true, fn:(g)=>this.drawStoreUnit(g, ux, uy, lot.dv, faceIn, u.w, hseed, isFirst, isLast, 'roof') });
      });
    } else {
      const eseed = ((Math.round(lot.ox*3+lot.dv.x)*7919) ^ (Math.round(lot.oy*3+lot.dv.y)*104729) ^ 0x9e3779b9) >>> 0;
      const units = packEdge(lot.len, mulberry32(eseed));
      units.forEach((u) => {
        const hx = lot.ox + lot.dv.x*(u.start+u.w/2), hy = lot.oy + lot.dv.y*(u.start+u.w/2);
        const hseed = ((Math.round(hx)*7919) ^ (Math.round(hy)*104729)) >>> 0;
        const ux = lot.ox+lot.dv.x*u.start, uy = lot.oy+lot.dv.y*u.start;
        vq.push({ depth:hx+hy, fn:(g)=>this.drawHouseUnit(g, ux, uy, lot.dv, faceIn, u.w, hseed, false, 'body') });
        vq.push({ depth:hx+hy, isRoof:true, fn:(g)=>this.drawHouseUnit(g, ux, uy, lot.dv, faceIn, u.w, hseed, false, 'roof') });
      });
      for(const gp of gapsFromUnits(units, lot.len)){
        const gx = lot.ox + lot.dv.x*(gp.start+gp.w/2), gy = lot.oy + lot.dv.y*(gp.start+gp.w/2);
        const gseed = ((Math.round(gx)*7919) ^ (Math.round(gy)*104729) ^ 0x2f6c) >>> 0;
        const fx = lot.ox + lot.dv.x*gp.start, fy = lot.oy + lot.dv.y*gp.start;
        vq.push({ depth:gx+gy, fn:(g)=>this.drawFenceGap(g, fx, fy, lot.dv, faceIn, gp.w, gseed) });
      }
    }
  }

  drawPersonHull(g, ax, ay, z, thW, build, pSkin, pShirt, pPants, pHair, pShoe, walkPhase, moving, startleAlpha=0, liftT=0, onBeforeCarryArm=null){
    const cs = Math.cos(thW), sn = Math.sin(thW);
    const G = (a,b,h) => this.W(ax + a*cs - b*sn, ay + a*sn + b*cs, z + h);
    /* face visibility: drawPersonHull's points (G() above) are real
       world-space, never rotated by this.drawAngle — only the robot's
       own body geometry goes through that rotation (via T()). The face
       test must match the geometry it's testing, so it stays plain
       (cs,sn)/(-sn,cs) with no drawAngle rotation applied. */
    const aDir = { x: cs, y: sn }, bDir = { x: -sn, y: cs };
    const faceA = Math.sign(aDir.x + aDir.y) || 1, faceB = Math.sign(bDir.x + bDir.y) || 1;

    const box = (aC,bC,ha,hb,z0,z1,cTop,cA,cB,noTop=false) => {
      const corner = (sa,sb,zz) => G(aC+sa*ha, bC+sb*hb, zz);
      if(!noTop){
        const top = [corner(-1,-1,z1), corner(1,-1,z1), corner(1,1,z1), corner(-1,1,z1)];
        this.quadOn(g, top, cTop);
        this.edgeOn(g, top, cA, 1);
      }
      const aFace = [corner(faceA,-1,z1), corner(faceA,1,z1), corner(faceA,1,z0), corner(faceA,-1,z0)];
      this.quadOn(g, aFace, cA);
      const bFace = [corner(-1,faceB,z1), corner(1,faceB,z1), corner(1,faceB,z0), corner(-1,faceB,z0)];
      this.quadOn(g, bFace, cB);
    };

    const hipH = build.legH, shoulderH = hipH+build.torsoH, headH = shoulderH+build.headR*2;

    const sh = G(0,0,0);
    g.fillStyle(PEOPLE_ART.shadow, 0.18);
    g.fillEllipse(sh.x, sh.y+1, 20*this.K*0.42, 9*this.K*0.42);

    const leg = side => {
      const bC = walkPhase*side*PEOPLE_ART.walkStride*0.35;
      const legW = build.legW*0.55, legD = build.legW*0.6;
      const shoeH = Math.max(5, build.legH*0.13);
      box(side*build.hipW*0.3, bC+legD*0.3, legW*1.2, legD*1.5, 0, shoeH, pShoe.c, pShoe.dk, pShoe.c);
      box(side*build.hipW*0.3, bC, legW, legD, shoeH, hipH, pPants.c, pPants.dk, pPants.c);
    };
    const torso = () => box(0, 0, build.torsoW/2, build.torsoD/2, hipH-2, shoulderH, pShirt.c, pShirt.dk, pShirt.c);
    const shoulderZ = shoulderH - 1;
    const sleeveLen = build.armLen*0.48, foreLen = build.armLen*0.52;
    const elbowZ = shoulderZ - sleeveLen;
    const arm = (side, isCarryArm) => {
      const shoulderAx = side*(build.torsoW/2 - 1);
      if(liftT <= 0.001 || !isCarryArm){
        /* at rest — flat box, walk-swing only. Also always used for
           the non-carrying arm regardless of liftT, so only the arm
           actually holding the bag lifts; the other stays down like
           a normal standing pose instead of both arms rising
           symmetrically. */
        const armSwing = moving ? -walkPhase*side*3 : 0;
        const armB = armSwing*0.4;
        box(shoulderAx, armB, build.armW*0.58, build.armW*0.58, elbowZ, shoulderZ, pShirt.c, pShirt.dk, pShirt.c);
        box(shoulderAx, armB, build.armW*0.46, build.armW*0.46, elbowZ-foreLen, elbowZ+1, pSkin.c, pSkin.dk, pSkin.c, true);
        return;
      }
      /* lift gesture: a real rotation around a fixed shoulder pivot,
         same SL-hinge technique as the door hinge / cargo lid — a
         point at distance p from the pivot, rotated by theta. Rigid
         arm length verified constant (40.00) at every liftT from 0 to
         1 in the lab. */
      const theta = liftT * LIFT_MAX_ANGLE;
      const cT = Math.cos(theta), sT = Math.sin(theta);
      const armCorner = (aOff, p, perp) => G(shoulderAx + aOff, p*sT + perp*cT, shoulderZ - p*cT + perp*sT);
      const seg = (p0, p1, ha, hb, cSide, cFront, cCap) => {
        const sideFace = [armCorner(ha*faceA,p0,-hb), armCorner(ha*faceA,p1,-hb), armCorner(ha*faceA,p1,hb), armCorner(ha*faceA,p0,hb)];
        this.quadOn(g, sideFace, cSide);
        const frontFace = [armCorner(-ha,p0,hb*faceB), armCorner(ha,p0,hb*faceB), armCorner(ha,p1,hb*faceB), armCorner(-ha,p1,hb*faceB)];
        this.quadOn(g, frontFace, cFront);
        /* end caps at both ends — a two-face box read as flat without
           a third shaded surface, and capping only the far end left
           the near-shoulder cap (visible at rest) vanishing the
           instant rotation started. */
        const capFar = [armCorner(-ha,p1,-hb), armCorner(ha,p1,-hb), armCorner(ha,p1,hb), armCorner(-ha,p1,hb)];
        this.quadOn(g, capFar, cCap);
        const capNear = [armCorner(-ha,p0,-hb), armCorner(ha,p0,-hb), armCorner(ha,p0,hb), armCorner(-ha,p0,hb)];
        this.quadOn(g, capNear, cCap);
      };
      seg(0, sleeveLen, build.armW*0.58, build.armW*0.58, pShirt.dk, pShirt.c, pShirt.c);
      seg(sleeveLen, sleeveLen+foreLen, build.armW*0.46, build.armW*0.46, pSkin.dk, pSkin.c, pSkin.dk);
    };
    const head = () => {
      const z0 = shoulderH, z1 = headH;
      box(0, 0, build.headR, build.headR, z0, z1, pSkin.c, pSkin.dk, pSkin.c);
      const hairZ0 = z0 + (z1-z0)*0.55;
      box(0, 0, build.headR*1.06, build.headR*1.06, hairZ0, z1+1.5, pHair, pHair, pHair);
    };
    /* long hair hangs down the BACK — has to draw before the torso/
       shoulders so the body occludes the part that's actually behind
       it; drawing it last (inside head(), after everything) made it
       always render in front instead */
    const hairBack = () => {
      if(build.hairStyle !== "long") return;
      const backB = -build.headR*0.75;
      box(0, backB, build.headR*0.62, build.headR*0.4, hipH+build.torsoH*0.35, headH-1, pHair, pHair, pHair);
    };

    const nearSide = faceA;
    leg(-nearSide); leg(nearSide);
    hairBack();
    arm(-nearSide, false);
    torso();
    if(onBeforeCarryArm) onBeforeCarryArm(); // torso/legs already drawn, carrying arm not yet —
    // anything drawn here sits on top of the body but UNDER the carrying arm specifically
    arm(nearSide, true);
    head();

    if(startleAlpha > 0){
      const hp = G(0, 0, headH + build.headR + 4);
      g.lineStyle(1.5, 0xffb04d, startleAlpha);
      for(const aoff of [-0.7, 0, 0.7]){
        g.lineBetween(hp.x + Math.sin(aoff)*4, hp.y - Math.cos(aoff)*4,
                      hp.x + Math.sin(aoff)*9, hp.y - Math.cos(aoff)*9);
      }
    }
  }

  /* hand world position — mirrors arm()'s exact shoulder-pivot
     rotation for the CARRYING arm specifically, so the pickup bag can
     be locked to wherever that hand actually is (resting straight
     down at liftT=0, swung forward at liftT=1). nearSide/faceA
     matches drawPersonHull's own near-side test so this picks the
     same arm that's actually drawn as the carrying one. Dial-bench
     approved in labs/pickup-lab.html. */
  handWorldPos(ax, ay, thW, build, liftT){
    const cs = Math.cos(thW), sn = Math.sin(thW);
    const nearSide = Math.sign(cs+sn) || 1;
    const shoulderAx = nearSide*(build.torsoW/2 - 1);
    const hipH = build.legH, shoulderH = hipH + build.torsoH, shoulderZ = shoulderH - 1;
    const sleeveLen = build.armLen*0.48, foreLen = build.armLen*0.52;
    const armLen = sleeveLen + foreLen;
    const theta = liftT * LIFT_MAX_ANGLE;
    const handB = armLen * Math.sin(theta), handZ = shoulderZ - armLen * Math.cos(theta);
    return { x: ax + shoulderAx*cs - handB*sn, y: ay + shoulderAx*sn + handB*cs, z: handZ };
  }

  drawProp(g, kind, x, y, t, fdir = 0, z = 0, wheelPhase = null, colorSeed = null, data = null){
    const dv = DIRV[fdir], rv = DIRV[(fdir+1)%4];
    const W = (dx, dy, dz) => this.W(x + dv.x*dx + rv.x*dy, y + dv.y*dx + rv.y*dy, z + dz);
    if(kind === "palm" || kind === "palmDwarf"){
      /* approved in palm lab — tall (165/8/1.0) and dwarf (55/8/0.3) presets */
      const P = kind === "palmDwarf" ? PALM_DWARF : PALM, K = this.K;
      const o = W(0, 0, 0);
      const seed = ((Math.round(x)*7919) ^ (Math.round(y)*104729)) >>> 0;
      const rng = mulberry32(seed);
      const lean = P.trunkLean * (rng()*2 - 1) * 2;
      const tallRoll = rng();
      const H = P.height * (tallRoll < 0.12 ? (1.6 + rng()*0.5) : (0.85 + rng()*0.3)); // ~12% chance of a dramatically tall specimen
      const phase = rng()*Math.PI*2;
      const sway = Math.sin(t*0.0011 + phase) * 3.2 * P.wind;

      g.fillStyle(P.shadow, 0.13);
      g.fillEllipse(o.x + lean*22*K, o.y + 3, (36 + H*0.14)*K, 12*K);

      const SEG = 8, spine = [];
      for(let i=0; i<=SEG; i++){
        const u = i/SEG;
        spine.push({ x: o.x + (lean*H*u*u + sway*u*u)*K, y: o.y - H*u*K, w: (7.5 - 4.5*u)*K });
      }
      for(let i=0; i<SEG; i++){
        const a2 = spine[i], b2 = spine[i+1];
        this.quadOn(g, [
          {x:a2.x-a2.w/2, y:a2.y}, {x:a2.x+a2.w/2, y:a2.y},
          {x:b2.x+b2.w/2, y:b2.y}, {x:b2.x-b2.w/2, y:b2.y}
        ], i % 2 === 0 ? P.trunk : P.trunkDk);
        if(i % 2 === 1){
          g.lineStyle(1.5, P.ring, 1);
          g.lineBetween(a2.x-a2.w/2, a2.y, a2.x+a2.w/2, a2.y);
        }
      }
      const crown = spine[SEG];
      const fronds = [];
      for(let i=0; i<P.fronds; i++){
        const baseA = (i/P.fronds)*Math.PI*2 + rng()*0.25;
        const dirY = Math.sin(baseA)*0.45 - 0.12;
        fronds.push({
          dirX: Math.cos(baseA), dirY,
          flut: Math.sin(t*0.0021 + phase + i*1.7) * 0.06 * P.wind,
          len: (44 + rng()*14)*(P.spread || 1)*K,
          back: dirY < -0.18
        });
      }
      const drawFrond = (f2, color) => {
        const steps = 7;
        let px = crown.x, py = crown.y;
        for(let sI=1; sI<=steps; sI++){
          const u = sI/steps;
          const nx = crown.x + f2.dirX*f2.len*u;
          const ny = crown.y + f2.dirY*f2.len*u + (P.droop*30*u*u + f2.flut*26*u)*K;
          const lw = (9 - 7*u)*K;
          const tx2 = nx - px, ty2 = ny - py;
          const tl = Math.hypot(tx2, ty2) || 1;
          const pxn = -ty2/tl, pyn = tx2/tl;
          g.fillStyle(color, 1);
          g.fillTriangle(px, py, nx, ny, px + pxn*lw + tx2*0.3, py + pyn*lw + ty2*0.3);
          g.fillTriangle(px, py, nx, ny, px - pxn*lw + tx2*0.3, py - pyn*lw + ty2*0.3);
          px = nx; py = ny;
        }
      };
      for(const f2 of fronds) if(f2.back) drawFrond(f2, P.frondB);
      for(let i=0; i<3; i++){
        const a3 = phase + i*2.1;
        g.fillStyle(i === 1 ? P.cocoHi : P.coco, 1);
        g.fillCircle(crown.x + Math.cos(a3)*6*K, crown.y + 4*K + Math.sin(a3)*3*K, 4.2*K);
      }
      for(const f2 of fronds) if(!f2.back) drawFrond(f2, P.frondA);
    } else if(kind === "scooter"){
      /* approved in scooter hit lab (2026-07-09): the dumped pose is
         a stylized squash (M below), not a rigid rotation — see the
         lab's header note. phi comes from a real fall integrator and
         drives layAmount, a blend fraction between the approved
         standing and dumped geometry. Every part already routes
         through M() via G()/dAt(), so blending it once moves the
         whole assembly. */
      const S = SCOOT;
      const seed = ((Math.round(x)*7919) ^ (Math.round(y)*104729)) >>> 0;
      const rng = mulberry32(seed);
      /* parked ALONG the walk, nose either way, a few degrees of slop —
         was a free ±162° roll, which parked scooters broadside or
         nose-into-the-buildings with no relationship to the street the
         leg actually runs (on-device: orientation contradicts the f=
         view). 0 in this frame IS the travel axis — W applies DIRV[f]. */
      const thSeed = (rng() < 0.5 ? 0 : Math.PI) + (rng() - 0.5) * 0.3;
      const brandSeed = BRANDS[Math.floor(rng()*BRANDS.length)];
      const th = (data && data.fallPsi !== undefined) ? data.fallPsi : ((data && data.thetaF !== undefined) ? data.thetaF : thSeed);
      const scs = Math.cos(th), ssn = Math.sin(th);
      const brand = (data && data.brand) || brandSeed;
      const slide = (data && data.slide) || 0;
      const phi = (data && data.phi) || 0;
      const layAmount = Math.min(1, phi / SCOOT_HIT.phiRest);

      const M = (a, b, h) => {
        const bLay = -h - 2, hLay = (b + 7) * 0.55;
        return {
          a,
          b: b + (bLay - b)*layAmount,
          h: h + (hLay - h)*layAmount
        };
      };
      const GG = (a, b, h) => {
        const m = M(a, b, h);
        return W((m.a + slide)*scs - m.b*ssn, (m.a + slide)*ssn + m.b*scs, m.h);
      };
      const dAt = (a, b, h) => {
        const m = M(a, b, h);
        const a2 = (m.a + slide)*scs - m.b*ssn, b2 = (m.a + slide)*ssn + m.b*scs;
        return a2 + b2 + m.h*0.4;
      };

      const wheelR = S.wheelR;
      const stemBaseA = 11, stemBaseH = 5.2;
      const stemTipA = 13, stemTipH = 4 + S.stemH;
      const fwA = 16 + wheelR*0.95;
      const rwA = -20 - wheelR*0.9;
      const wheelH = wheelR*0.72;

      const ringAt = (a0, b0, h0, r, d1, d2, n=12) => {
        const pts = [];
        for(let i=0; i<n; i++){
          const psi = (i/n)*Math.PI*2, c3 = Math.cos(psi)*r, s3 = Math.sin(psi)*r;
          pts.push(GG(a0 + c3*d1.a + s3*d2.a, b0 + c3*d1.b + s3*d2.b, h0 + c3*d1.h + s3*d2.h));
        }
        return pts;
      };
      const U = {a:1,b:0,h:0}, VV = {a:0,b:1,h:0}, HHH = {a:0,b:0,h:1};

      const WW = 4.6;
      /* RIGID wheel frame from M's normalized differentials — the hull
         treatment. M is a stylized affine squash, not a rotation, so
         pushing the wheel circles through it collapsed them into
         flattened lenses as the scooter lay down (reported: fallen
         wheels don't look right). Normalizing M's constant differential
         axes (∂/∂h = (−lay, 1−lay), ∂/∂b = (1−lay, 0.55·lay)) turns the
         same blend into a true rotation for the wheels alone: the wheel
         plane tips from vertical to flat on the ground and the axle
         swings skyward, while the HUB stays glued to the squashed frame
         the deck and fenders use. layAmount 0 reproduces the standing
         wheel byte-for-byte (frame degenerates to U/HHH exactly). */
      let ehB = -layAmount, ehH = 1 - layAmount;
      { const L2 = Math.hypot(ehB, ehH) || 1; ehB /= L2; ehH /= L2; }
      let ebB = 1 - layAmount, ebH = 0.55*layAmount;
      { const L2 = Math.hypot(ebB, ebH) || 1; ebB /= L2; ebH /= L2; }
      const GRAW = (ma, mb, mh) => W((ma + slide)*scs - mb*ssn, (ma + slide)*ssn + mb*scs, mh);
      const dRAW = (ma, mb, mh) => { const a2 = (ma + slide)*scs - mb*ssn, b2 = (ma + slide)*ssn + mb*scs; return a2 + b2 + mh*0.4; };
      const swheel = (a, r) => {
        const hub = M(a, 0, wheelH);
        const ringR = (k, rr, n = 14) => {
          const pts = [];
          for(let i = 0; i < n; i++){
            const psi = (i/n)*Math.PI*2, c3 = Math.cos(psi)*rr, s3 = Math.sin(psi)*rr;
            pts.push(GRAW(hub.a + c3, hub.b + k*ebB + s3*ehB, hub.h + k*ebH + s3*ehH));
          }
          return pts;
        };
        this.quadOn(g, convexHull(ringR(-WW/2, r).concat(ringR(WW/2, r))), S.wheelDk);
        const kF = dRAW(hub.a, hub.b + (WW/2)*ebB, hub.h + (WW/2)*ebH) >
                   dRAW(hub.a, hub.b - (WW/2)*ebB, hub.h - (WW/2)*ebH) ? WW/2 : -WW/2;
        this.quadOn(g, ringR(kF, r), S.wheel);
        this.quadOn(g, ringR(kF, r*0.42), S.hubFace);
        this.quadOn(g, ringR(kF, r*0.2), S.hub);
      };
      const sdeck = () => {
        const top = [], bot = [];
        for(const bc of [[-20,-7],[16,-7],[16,7],[-20,7]]){
          top.push(GG(bc[0], bc[1], 5.2)); bot.push(GG(bc[0], bc[1], 0.8));
        }
        this.quadOn(g, convexHull(top.concat(bot)), brand.cDk);
        const topVisible = layAmount < 0.5 ? true : (ssn - scs) > 0;
        if(topVisible){
          this.quadOn(g, top, brand.c);
          this.quadOn(g, [GG(-16,-4,5.6), GG(8,-4,5.6), GG(8,4,5.6), GG(-16,4,5.6)], S.grip);
        }
      };
      const sstem = () => {
        const da = stemTipA - stemBaseA, dh = stemTipH - stemBaseH;
        const slen = Math.hypot(da, dh) || 1;
        const perp = {a:-dh/slen, b:0, h:da/slen};
        const base = ringAt(stemBaseA, 0, stemBaseH, 3.1, VV, perp, 10);
        const tip  = ringAt(stemTipA, 0, stemTipH, 2.0, VV, perp, 10);
        this.quadOn(g, convexHull(base.concat(tip)), brand.c);
      };
      const sbar = () => {
        const capsule = (b0, b1, r, col) => {
          const e0 = ringAt(stemTipA, b0, stemTipH, r, U, HHH, 8);
          const e1 = ringAt(stemTipA, b1, stemTipH, r, U, HHH, 8);
          this.quadOn(g, convexHull(e0.concat(e1)), col);
        };
        capsule(-S.barW, S.barW, 1.6, S.metal);
        capsule(-S.barW, -S.barW + 6, 2.5, S.deck);
        capsule(S.barW - 6, S.barW, 2.5, S.deck);
      };
      const skick = () => {
        const ks0 = GG(-4, -7, 4), ks1 = GG(-6, -12, 0);
        g.lineStyle(2.5, S.metalDk, 1);
        g.lineBetween(ks0.x, ks0.y, ks1.x, ks1.y);
      };

      const sparts = [
        { d: dAt(rwA, 0, wheelH),  fn: () => swheel(rwA, wheelR) },
        { d: dAt(-2, 0, 3),        fn: sdeck },
        { d: dAt((stemBaseA + stemTipA)/2, 0, (stemBaseH + stemTipH)/2), fn: sstem },
        { d: dAt(fwA, 0, wheelH),  fn: () => swheel(fwA, wheelR*0.92) },
        { d: dAt(stemTipA, 0, stemTipH), fn: sbar },
        { d: dAt(-5, -9, 3),       fn: skick }
      ];
      sparts.sort((p1, p2) => p1.d - p2.d);
      for(const pt of sparts) pt.fn();
    } else if(kind === "trash"){
      /* approved in trash lab v1: seeded litter cluster — water bottle
         on its side (translucent body, crush dent, label, blue cap),
         crumpled plastic bag (raised crumple + creases + knot), and
         rubbish bits (paper balls, cans, wrapper scraps). Composition
         and layout roll per instance from the position seed; items
         depth-sorted (iso x+y). Physics unchanged (sev 7 + drag). */
      const T3 = TRASH_ART, K = this.K;
      const seed = ((Math.round(x)*7919) ^ (Math.round(y)*104729) ^ 0x7e2d) >>> 0;
      const rng = mulberry32(seed);
      const spread = 0.7 + rng()*0.6;
      const bits = 2 + Math.floor(rng()*4);
      const bagS = 0.8 + rng()*0.5;
      const botS = 0.8 + rng()*0.5;
      const poly = (pts, col, a=1) => this.quadOn(g, pts, col, a);
      const circ = (cx2, cy2, r, z2, col, outC, n=10) => {
        const pts = [];
        for(let i=0; i<n; i++){
          const a2 = (i/n)*Math.PI*2;
          pts.push(W(cx2 + Math.cos(a2)*r, cy2 + Math.sin(a2)*r, z2));
        }
        poly(pts, col);
        if(outC !== undefined) this.edgeOn(g, pts, outC, 1.1);
      };
      const items = [];

      if(rng() < 0.85){   /* crumpled plastic bag */
        const bx = (rng()-0.5)*12*spread, by = (rng()-0.5)*12*spread;
        const R = (7.5 + rng()*3) * bagS;
        const lump = [];
        for(let i=0; i<9; i++){
          const a2 = (i/9)*Math.PI*2;
          const rr = R * (0.72 + rng()*0.55);
          lump.push({ x: bx + Math.cos(a2)*rr, y: by + Math.sin(a2)*rr });
        }
        const kx = bx + (rng()-0.5)*R*0.5, ky = by + (rng()-0.5)*R*0.5;
        items.push({ x:bx, y:by, r:R, draw: () => {
          poly(lump.map(p => W(p.x, p.y, 0.8)), T3.bagC);
          this.edgeOn(g, lump.map(p => W(p.x, p.y, 0.8)), T3.bagShade, 1.2);
          const top = [];
          for(let i=0; i<8; i++){
            const a2 = (i/8)*Math.PI*2;
            top.push(W(bx + Math.cos(a2)*R*0.55*(0.75+rng()*0.4),
                       by + Math.sin(a2)*R*0.55*(0.75+rng()*0.4), 3.4*bagS));
          }
          poly(top, T3.bagHi);
          this.edgeOn(g, top, T3.bagShade, 1);
          for(let i=0; i<2; i++){
            const a2 = rng()*Math.PI*2;
            poly([
              W(bx + Math.cos(a2)*R*0.2, by + Math.sin(a2)*R*0.2, 1.4),
              W(bx + Math.cos(a2+0.7)*R*0.7, by + Math.sin(a2+0.7)*R*0.7, 0.9),
              W(bx + Math.cos(a2-0.5)*R*0.8, by + Math.sin(a2-0.5)*R*0.8, 0.9)
            ], T3.bagShade, 0.55);
          }
          circ(kx, ky, 1.8*bagS, 5*bagS, T3.bagDeep);
        }});
      }

      if(rng() < 0.85){   /* water bottle on its side */
        const cx2 = (rng()-0.5)*16*spread, cy2 = (rng()-0.5)*16*spread;
        const th = rng()*Math.PI*2;
        const L = 13*botS, r = 3*botS;
        const dxu = Math.cos(th), dyu = Math.sin(th);
        const nx = -dyu, ny = dxu;
        const p0 = { x: cx2 - dxu*L/2, y: cy2 - dyu*L/2 };
        const p1 = { x: cx2 + dxu*L/2, y: cy2 + dyu*L/2 };
        items.push({ x:cx2, y:cy2, r:L/2, draw: () => {
          const zB = 1.4*botS;
          poly([
            W(p0.x + nx*r, p0.y + ny*r, zB), W(p1.x + nx*r*0.72, p1.y + ny*r*0.72, zB),
            W(p1.x - nx*r*0.72, p1.y - ny*r*0.72, zB), W(p0.x - nx*r, p0.y - ny*r, zB)
          ], T3.botBody);
          circ(p0.x, p0.y, r, zB, T3.botBody, T3.botShade);
          poly([
            W(p0.x + dxu*L*0.22 + nx*r*0.9, p0.y + dyu*L*0.22 + ny*r*0.9, zB),
            W(p0.x + dxu*L*0.38 + nx*r*0.55, p0.y + dyu*L*0.38 + ny*r*0.55, zB),
            W(p0.x + dxu*L*0.38 - nx*r*0.55, p0.y + dyu*L*0.38 - ny*r*0.55, zB),
            W(p0.x + dxu*L*0.22 - nx*r*0.9, p0.y + dyu*L*0.22 - ny*r*0.9, zB)
          ], T3.botShade, 0.7);
          poly([
            W(cx2 - dxu*L*0.14 + nx*r, cy2 - dyu*L*0.14 + ny*r, zB),
            W(cx2 + dxu*L*0.14 + nx*r, cy2 + dyu*L*0.14 + ny*r, zB),
            W(cx2 + dxu*L*0.14 - nx*r, cy2 + dyu*L*0.14 - ny*r, zB),
            W(cx2 - dxu*L*0.14 - nx*r, cy2 - dyu*L*0.14 - ny*r, zB)
          ], T3.botLabel);
          poly([
            W(p1.x + nx*r*0.72, p1.y + ny*r*0.72, zB), W(p1.x + dxu*2.4*botS + nx*r*0.42, p1.y + dyu*2.4*botS + ny*r*0.42, zB),
            W(p1.x + dxu*2.4*botS - nx*r*0.42, p1.y + dyu*2.4*botS - ny*r*0.42, zB), W(p1.x - nx*r*0.72, p1.y - ny*r*0.72, zB)
          ], T3.botBody);
          circ(p1.x + dxu*3.2*botS, p1.y + dyu*3.2*botS, r*0.55, zB, T3.botCap, T3.outline);
          g.lineStyle(1.1, T3.botHi, 0.9);
          const h0 = W(p0.x + nx*r*0.45, p0.y + ny*r*0.45, zB + r*0.5);
          const h1 = W(p1.x + nx*r*0.35, p1.y + ny*r*0.35, zB + r*0.5);
          g.lineBetween(h0.x, h0.y, h1.x, h1.y);
        }});
      }

      for(let i=0; i<bits; i++){   /* rubbish bits */
        const bx = (rng()-0.5)*30*spread, by = (rng()-0.5)*30*spread;
        const kind2 = rng();
        if(kind2 < 0.4){
          const r = 2.4 + rng()*1.6;
          items.push({ x:bx, y:by, r, draw: () => {
            circ(bx, by, r, 1, T3.paper, T3.paperShade, 8);
            circ(bx + r*0.3, by + r*0.3, r*0.45, 1.4, T3.paperShade, undefined, 7);
          }});
        } else if(kind2 < 0.7){
          const th = rng()*Math.PI*2, L2 = 6, r2 = 2;
          const du = {x:Math.cos(th), y:Math.sin(th)}, nu = {x:-du.y, y:du.x};
          const col = rng() < 0.5 ? T3.canA : T3.canB;
          items.push({ x:bx, y:by, r:L2/2, draw: () => {
            poly([
              W(bx - du.x*L2/2 + nu.x*r2, by - du.y*L2/2 + nu.y*r2, 1),
              W(bx + du.x*L2/2 + nu.x*r2, by + du.y*L2/2 + nu.y*r2, 1),
              W(bx + du.x*L2/2 - nu.x*r2, by + du.y*L2/2 - nu.y*r2, 1),
              W(bx - du.x*L2/2 - nu.x*r2, by - du.y*L2/2 - nu.y*r2, 1)
            ], col);
            circ(bx + du.x*L2/2, by + du.y*L2/2, r2, 1, T3.canHi, T3.outline, 8);
          }});
        } else {
          const th = rng()*Math.PI*2;
          const du = {x:Math.cos(th), y:Math.sin(th)}, nu = {x:-du.y, y:du.x};
          const col = T3.wrap[Math.floor(rng()*T3.wrap.length)];
          const w2 = 2.4 + rng()*2, h2 = 1.6 + rng()*1.4;
          items.push({ x:bx, y:by, r:w2, draw: () => {
            poly([
              W(bx - du.x*w2 + nu.x*h2, by - du.y*w2 + nu.y*h2, 0.8),
              W(bx + du.x*w2 + nu.x*h2, by + du.y*w2 + nu.y*h2, 0.8),
              W(bx + du.x*w2 - nu.x*h2, by + du.y*w2 - nu.y*h2, 0.8),
              W(bx - du.x*w2 - nu.x*h2, by - du.y*w2 - nu.y*h2, 0.8)
            ], col);
            g.lineStyle(0.8, T3.outline, 0.5);
            const f0 = W(bx - du.x*w2*0.3, by - du.y*w2*0.3, 0.9);
            const f1 = W(bx + du.x*w2*0.4, by + du.y*w2*0.4, 0.9);
            g.lineBetween(f0.x, f0.y, f1.x, f1.y);
          }});
        }
      }

      for(const it of items){
        const sh = W(it.x + 1, it.y + 1, 0.3);
        g.fillStyle(T3.shadow, 0.12);
        g.fillEllipse(sh.x, sh.y, it.r*2.2*K*0.5, it.r*1.2*K*0.5);
      }
      items.sort((a2,b2) => (a2.x + a2.y) - (b2.x + b2.y));
      for(const it of items) it.draw();
    } else if(kind === "cone"){
      /* approved in cone hit lab (2026-07-09): ONE rigid geometry driven
         by a continuous tip angle phi about a physical pivot — every
         frame between standing (phi=0) and knocked (phi=phiRest) is the
         same solid mid-fall, no keyframe swap. phase 1 pivots on the
         front base-rim edge; phase 2 hands off to the landed slab
         corner at 90°. fallPsi (set once, at the hit that starts the
         fall) plays the same role the old per-tile rotation did: it
         orients the fall within this prop's local frame. */
      const C = CONE, K = this.K;
      const seed = ((Math.round(x)*7919) ^ (Math.round(y)*104729)) >>> 0;
      const rng = mulberry32(seed);
      /* SQUARE-based cone: squared to the street (seeded quarter + a few
         degrees of slop) instead of a free 2π roll that cocked the base
         at any stray angle to the curb line. Variety survives in which
         quarter, the slop, and the height jitter below. */
      const cthSeed = Math.floor(rng()*4) * (Math.PI/2) + (rng() - 0.5) * 0.16;
      const H = C.height * (0.9 + rng()*0.2);
      const phi = (data && data.phi) || 0;
      const ph2 = !!(data && data.phase === 2);
      const cth = (data && data.fallPsi !== undefined) ? data.fallPsi : cthSeed;
      const fc = Math.cos(cth), fsn = Math.sin(cth);
      const cphi = Math.cos(phi), sphi = Math.sin(phi);
      const pvt = C.base/2;

      /* tip(u,h): the one function that encodes the pose, in the
         (fall-axis, height) plane — bends within a frame fixed by cth */
      const tip = (u, h) => {
        if(phi === 0) return { u, z: h };
        if(!ph2) return { u: pvt + (u - pvt)*cphi + h*sphi, z: -(u - pvt)*sphi + h*cphi };
        return { u: pvt + 3 + (u - pvt)*cphi + (h - 3)*sphi, z: -(u - pvt)*sphi + (h - 3)*cphi };
      };
      const L = (u, v, h) => {
        const tt = tip(u, h);
        return W(tt.u*fc - v*fsn, tt.u*fsn + v*fc, tt.z);
      };
      const dAt = (u, v, h) => {
        const tt = tip(u, h);
        return (tt.u*fc - v*fsn) + (tt.u*fsn + v*fc) + tt.z*0.4;
      };
      const rOf = hh => 8.5 - (8.5 - 1.8) * (hh / H);   // per-instance taper (visual variety, as before)
      const place = (hh, r, n=12) => {
        const pts = [];
        for(let i=0; i<n; i++){
          const psi2 = (i/n)*Math.PI*2;
          pts.push(L(Math.cos(psi2)*r, Math.sin(psi2)*r, hh));
        }
        return pts;
      };

      /* shadow removed (requested) — the cone sits directly on its
         base slab with no cast ellipse. */

      const baseSlab = () => {
        const hb = C.base/2, pts = [];
        for(const bc of [[-hb,-hb],[hb,-hb],[hb,hb],[-hb,hb]]){
          pts.push(L(bc[0], bc[1], 0)); pts.push(L(bc[0], bc[1], 3));
        }
        this.quadOn(g, convexHull(pts), C.bodyDk);
        const nu = sphi, nz = cphi;
        if(nu*fc + nu*fsn + nz > 0.05){
          const top = [L(-hb,-hb,3), L(hb,-hb,3), L(hb,hb,3), L(-hb,hb,3)];
          this.quadOn(g, top, C.body);
          this.edgeOn(g, top, C.bodyDk, 1.5);
        }
      };
      const body = () => {
        this.quadOn(g, convexHull(place(2, rOf(2)).concat(place(H, 1.8))), C.body);
        if(C.band > 0){
          const b0 = H*0.52, b1 = Math.min(H*0.52 + C.band, H*0.9);
          this.quadOn(g, convexHull(place(b0, rOf(b0)+0.5).concat(place(b1, rOf(b1)+0.5))), C.band_c);
        }
        this.quadOn(g, place(H, 1.8, 8), C.bodyDk);
      };
      const cparts = [
        { d: dAt(0, 0, 1.5), fn: baseSlab },
        { d: dAt(0, 0, H*0.45), fn: body }
      ];
      cparts.sort((p1, p2) => p1.d - p2.d);
      for(const pt of cparts) pt.fn();
    } else if(kind === "hydrant" || kind === "hydrantBurst"){
      /* approved in hydrant lab: height 20 · base 8 · dome 6.5 · nozzle 2.6.
         hydrantBurst shears the front nozzle open with an animated water
         arc and a puddle that paints early (ground layer, like the
         shadow) so the hydrant's own body always draws over it. */
      const HH = HYD;
      const bursting = kind === "hydrantBurst" || !!(data && data.burst);
      const grow = (data && data.burstT !== undefined)
        ? Math.min(1, (t - data.burstT)/1800) : 1;
      const seed = ((Math.round(x)*7919) ^ (Math.round(y)*104729) ^ 0x4a7d) >>> 0;
      const rng = mulberry32(seed);
      const hth = rng()*Math.PI*2;
      const hcs = Math.cos(hth), hsn = Math.sin(hth);
      const height = HH.height;
      const GG = (a, b, h) => W(a*hcs - b*hsn, a*hsn + b*hcs, h);
      const dAt = (a, b, h) => a*(hcs+hsn) + b*(hcs-hsn) + h*0.4;

      const rOf = h => {
        const u = h / height;
        if(u < 0.08) return HH.baseR;
        if(u < 0.75) return HH.baseR*0.62 - (HH.baseR*0.62 - HH.baseR*0.5)*((u-0.08)/0.67);
        return HH.baseR*0.5 + (HH.baseR*0.78 - HH.baseR*0.5) * ((u-0.75)/0.25);
      };
      const place = (h, r, n=14) => {
        const pts = [];
        for(let i=0; i<n; i++){
          const phi = (i/n)*Math.PI*2, c3 = Math.cos(phi)*r, s3 = Math.sin(phi)*r;
          pts.push(GG(c3, s3, h));
        }
        return pts;
      };

      const hsh = GG(0, 0, 0);
      g.fillStyle(HH.shadow, 0.14);
      g.fillEllipse(hsh.x, hsh.y + 2, HH.baseR*2.1*this.K*0.42, HH.baseR*0.95*this.K*0.42);

      /* puddle: ground decal, paints BEFORE the hydrant's own body
         parts so the barrel/dome/nozzles naturally draw over it. */
      if(bursting){
        const nc0 = 1, ns0 = 0;
        const facing0 = nc0*(hcs+hsn) + ns0*(hcs-hsn) > 0;
        if(facing0){
          const tipA0 = HH.baseR*0.55 + HH.nozR*2.2;
          /* robot-burst floods pool around the base (that's where the
             slip zone lives); the lab's static gallery kind keeps the
             original thrown-landing rings */
          /* pre-burst (pudDir set at spawn): the flood a full tile over
             along the walk; fresh robot-bursts still pool at the base. */
          const preOff = (data && data.pudDir) ? data.pudDir * T2 : 0;
          const landA = (data && data.burst) ? 8 + preOff : tipA0 + nc0*26;
          const landB = (data && data.burst) ? 0 : ns0*26;
          const puddleRing = (rad, nn=16) => {
            const pts = [];
            for(let i=0; i<nn; i++){
              const phi = (i/nn)*Math.PI*2;
              pts.push(GG(landA + Math.cos(phi)*rad, landB + Math.sin(phi)*rad, 0.3));
            }
            return pts;
          };
          this.quadOn(g, puddleRing(((data && data.burst) ? HYD_SLIP.pud : TILE*0.85) * grow), HH.water, 0.28);
          this.quadOn(g, puddleRing(((data && data.burst) ? HYD_SLIP.pud*0.62 : TILE*0.55) * grow), HH.water, 0.22);
        }
      }

      const hbarrel = () => {
        const n = 6, all = [];
        for(let i=0; i<=n; i++) all.push(...place(i/n*height*0.9, rOf(i/n*height*0.9)));
        this.quadOn(g, convexHull(all), HH.cap);
      };
      const hshoulder = () => {
        const h0 = height*0.75, h1 = height*0.9;
        this.quadOn(g, convexHull(place(h0, rOf(h0)).concat(place(h1, rOf(h1)))), HH.cap);
      };
      const hdome = () => {
        const domeBase = height*0.9, domeR = HH.domeR;
        const n = 8, rings = [];
        for(let i=0; i<=n; i++){
          const u = i/n, r2 = domeR * Math.cos(u*Math.PI*0.5);
          rings.push(place(domeBase + u*domeR*0.9, r2));
        }
        const all = []; for(const r2 of rings) all.push(...r2);
        this.quadOn(g, convexHull(all), HH.cap);
        const capTop = GG(0, 0, domeBase + domeR*0.9 + 1);
        g.fillStyle(HH.capDk, 1);
        g.fillCircle(capTop.x, capTop.y, 1.8*this.K*0.45);
      };
      const hnozzleSpray = (ang, r) => () => {
        if(!bursting) return;
        const nc = Math.cos(ang), ns = Math.sin(ang);
        const facing = nc*(hcs+hsn) + ns*(hcs-hsn) > 0;
        if(!facing) return;
        const tipA = nc*(HH.baseR*0.55 + r*2.2), tipB = ns*(HH.baseR*0.55 + r*2.2);
        const hgt = height*0.42;
        const n = 9;
        for(let i=0; i<n; i++){
          const u = ((t*0.0026 + i/n) % 1);
          const dist = u * 26;
          const arcH = hgt + 14*u - 26*u*u;
          const pt = GG(tipA + nc*dist, tipB + ns*dist, Math.max(arcH, 0.5));
          const alpha = 0.9 * (1 - u*0.55);
          const r2 = Math.max(0.6, 1.6 - u*1.0);
          g.fillStyle(u > 0.82 ? HH.waterDk : HH.water, alpha);
          g.fillCircle(pt.x, pt.y, r2*this.K*0.4);
        }
      };
      const hnozzle = (ang, r, breakable) => () => {
        const nc = Math.cos(ang), ns = Math.sin(ang);
        const baseA = nc*(HH.baseR*0.55), baseB = ns*(HH.baseR*0.55);
        const tipA = nc*(HH.baseR*0.55 + r*2.2), tipB = ns*(HH.baseR*0.55 + r*2.2);
        const hgt = height*0.42;
        const ring = (a0,b0,rad) => {
          const pts = [];
          for(let i=0;i<10;i++){
            const phi=(i/10)*Math.PI*2;
            const perpA = -ns, perpB = nc;
            pts.push(GG(a0 + Math.cos(phi)*rad*perpA, b0 + Math.cos(phi)*rad*perpB, hgt + Math.sin(phi)*rad));
          }
          return pts;
        };
        this.quadOn(g, convexHull(ring(baseA,baseB,r).concat(ring(tipA,tipB,r))), HH.cap);
        const facing = nc*(hcs+hsn) + ns*(hcs-hsn) > 0;
        if(!facing) return;
        if(bursting && breakable){
          this.quadOn(g, ring(tipA,tipB,r*0.9), HH.nut);
          this.quadOn(g, ring(tipA,tipB,r*0.5), HH.capDk);
        } else {
          this.quadOn(g, ring(tipA,tipB,r*0.8), HH.capDk);
        }
      };

      const domeBase = height*0.9, domeR = HH.domeR;
      const hparts = [
        { d: dAt(0,0,height*0.3), fn: hbarrel },
        { d: dAt(0,0,height*0.82), fn: hshoulder },
        { d: dAt(HH.baseR*0.55*Math.cos(0), HH.baseR*0.55*Math.sin(0), height*0.42), fn: hnozzle(0, HH.nozR, true) },
        { d: dAt(HH.baseR*0.55*Math.cos(Math.PI), HH.baseR*0.55*Math.sin(Math.PI), height*0.42), fn: hnozzle(Math.PI, HH.nozR, false) },
        { d: dAt(0,0, domeBase+domeR*0.9), fn: hdome },
        { d: dAt(HH.baseR*0.55 + HH.nozR*2.2 + 20, 0, height*0.42 + 8), fn: hnozzleSpray(0, HH.nozR) }
      ];
      hparts.sort((p1, p2) => p1.d - p2.d);
      for(const pt of hparts) pt.fn();
    } else if(kind === "planter"){
      /* approved in planter lab (2026-07-08), sized up in the planter
         makeover (2026-07-10), variety + collision ported from the
         planter collision lab (2026-07-10): tapered concrete box +
         layered stalked bush. Two callers: the pure-decoration far-
         sidewalk placement (data===null, seeded random scale/variant,
         never falls) and the collidable hazard (data has its own
         scale/variantIdx/phi/pose/fallPsi/items — same convention
         bin/cone/scooter already use for their hazard data). */
      const PL = PLANTER;
      const seed = ((Math.round(x)*7919) ^ (Math.round(y)*104729) ^ 0x2f61) >>> 0;
      const rng = mulberry32(seed);
      const isHaz = !!(data && data.scale !== undefined);
      const V = isHaz ? PLANTER_VARIANTS[data.variantIdx || 0] : PLANTER_VARIANTS[Math.floor(rng()*PLANTER_VARIANTS.length)];
      const scale = isHaz ? data.scale : (0.85 + rng()*0.5);
      const phi = isHaz ? (data.phi || 0) : 0;
      const boxW = 22*scale, boxD = 14*scale, boxH = 14*scale;
      const bushH = 20*scale, fullness = 5 + Math.floor(rng()*4);
      const flowering = rng() < 0.3;
      const GG = W;
      const dAt = (a, b, h) => a + b + h*0.4;
      const hw = boxW/2, hd = boxD/2, H = boxH;

      if(phi > 0){
        /* fallen pose: true rigid rotation about the pivot edge,
           matching bin's own binTipPoint pattern exactly (verified in
           the collision lab — collision no longer depends on a hand-
           faked "low" pose, so there's no reason to fake one here
           either). fallPsi rotates the whole fall into world space,
           same role bin's fallPsi/cth plays. */
        const cth = data.fallPsi || 0;
        const fc = Math.cos(cth), fsn = Math.sin(cth);
        const pivotA = hw;
        const cphi = Math.cos(phi), sphi = Math.sin(phi);
        const pslide = (data && data.slide) || 0;   // the shove skid — bin's data.slide, same convention
        const tip = (u, h) => ({ u: pslide + pivotA - (pivotA-u)*cphi + h*sphi, z: (pivotA-u)*sphi + h*cphi });
        /* L/psh/fbush all compute FULLY ABSOLUTE world coordinates
           themselves (x + t.u*fc - ..., not a small offset) — they
           need the raw this.W(), not this function's own locally-
           shadowed W(dx,dy,dz) (which treats its args as offsets from
           x,y and re-applies the dv/rv rotation). Calling the
           shadowed one here added x,y in a second time on top of the
           position already baked into the argument, which is why a
           knocked-over planter's geometry jumped to roughly double
           its real position the moment phi>0 — this never showed up
           in the lab because the lab's test planter sat at/near the
           origin, where doubling an offset is invisible. */
        const L = (u, v, h) => { const t = tip(u, h); return this.W(x + t.u*fc - v*fsn, y + t.u*fsn + v*fc, t.z); };
        const dAt2 = (u, v, h) => { const t = tip(u, h); return (t.u*fc - v*fsn) + (t.u*fsn + v*fc) + t.z*0.4; };
        const corner = (sx, sy, h) => L(sx*hw, sy*hd, h);

        /* shadow removed (requested). */

        const fbox = () => {
          const top = [corner(-1,-1,H), corner(1,-1,H), corner(1,1,H), corner(-1,1,H)];
          const bot = [corner(-1,-1,0), corner(1,-1,0), corner(1,1,0), corner(-1,1,0)];
          this.quadOn(g, convexHull(top.concat(bot)), PL.boxDk);
          this.quadOn(g, top, PL.box);
          this.edgeOn(g, top, PL.boxDk, 1.2);
        };
        const fbush = () => {
          const bushSeed = ((Math.round(x)*7919) ^ (Math.round(y)*104729) ^ 0x51c3) >>> 0;
          const brng = mulberry32(bushSeed);
          const n = fullness;
          for(let i=0; i<n+1; i++){
            const ang = (i/n)*Math.PI*2 + brng()*0.4;
            const rr = bushH*0.5*(0.5 + brng()*0.4);
            const hh = 2 + brng()*3;
            const bOff = Math.sin(ang)*bushH*0.6;
            const aOff = pivotA + bushH*0.3 + Math.cos(ang)*bushH*0.3;
            const c = this.W(x + aOff*fc - bOff*fsn, y + aOff*fsn + bOff*fc, hh);
            g.fillStyle(i%3===0 ? V.leafA : i%3===1 ? V.leafB : V.leafC, 1);
            g.fillCircle(c.x, c.y, (bushH*0.22)*this.K*0.42);
          }
        };
        const fparts = [{ d: dAt2(0,0,H*0.4), fn: fbox }, { d: dAt2(pivotA+bushH*0.3,0,3), fn: fbush }];
        fparts.sort((p1,p2) => p1.d - p2.d);
        for(const pt of fparts) pt.fn();
      } else {
        const baseShrink = 0.82;
        const corner = (sx, sy, h, shrink=1) => GG(sx*hw*shrink, sy*hd*shrink, h);

        /* planter body shadow removed (requested). */

        const pbox = () => {
          const top = [corner(-1,-1,H), corner(1,-1,H), corner(1,1,H), corner(-1,1,H)];
          this.quadOn(g, top, PL.box);
          this.edgeOn(g, top, PL.boxDk, 1.2);
          /* the two outward faces visible under this fixed camera —
             was hardcoded to faceX=1,faceY=1, which is ONLY correct
             when fdir===0 (dv={1,0}). The collidable planter hazard
             (and now block-wrap scatter) can spawn at any of the 4
             facings via facingAt()/scatterBlockProp, and for the other
             3 the hardcoded version drew the WRONG two faces — this is
             the exact same "which 2 box faces face the camera" problem
             drawPersonHull already solves correctly for a continuous
             heading (faceA=sign(cs+sn), faceB=sign(cs-sn)); dv is just
             (cos,sin) of this box's 90°-snapped heading, so the same
             formula applies directly, for any orientation. */
          const faceX = Math.sign(dv.x + dv.y) || 1;
          const faceY = Math.sign(dv.x - dv.y) || 1;
          const xFace = [
            corner(faceX,-1,H), corner(faceX,1,H),
            corner(faceX,1,0,baseShrink), corner(faceX,-1,0,baseShrink)
          ];
          this.quadOn(g, xFace, faceX > 0 ? PL.boxDk : PL.boxDk2);
          /* yFace overlaps xFace by a hair at their shared edge (sx
             pushed just past 1) — a defensive seam guard. The two
             faces meet at an exact edge, and without a tiny overlap,
             sub-pixel rasterization gaps at that seam can make the
             face drawn first (xFace) show through as a sliver on some
             renderers, even though both faces are geometrically valid
             (verified: comparable non-degenerate area on every facing
             direction, nothing else drawn over it — this is purely a
             rasterization seam fix, invisible at normal zoom).
             The far corner used to be hardcoded to -1, written back
             when "past 1" only ever meant the +1 case — it never
             tracked faceX flipping to -1 (fdir 2/3), so instead of
             spanning the box's actual far edge it sat 0.03 units from
             the near corner: a sliver, not a face. -faceX is that far
             edge for either sign, so this is now the same full-width
             face (plus the same seam overlap) at every heading. */
          const yFace = [
            corner(-faceX,faceY,H), corner(faceX*1.03,faceY,H),
            corner(faceX*1.03,faceY,0,baseShrink), corner(-faceX,faceY,0,baseShrink)
          ];
          this.quadOn(g, yFace, faceY > 0 ? PL.boxDk2 : PL.boxDk);
          const soil = [corner(-0.82,-0.82,H-0.6), corner(0.82,-0.82,H-0.6), corner(0.82,0.82,H-0.6), corner(-0.82,0.82,H-0.6)];
          this.quadOn(g, soil, PL.soil);
        };
        const pbush = () => {
          const baseH = H + 1;
          const n = fullness;
          const puffs = [];
          puffs.push({ a:0, b:0, h:baseH + bushH*0.55, r:bushH*0.5, c:V.leafA });
          for(let i=0; i<n; i++){
            const ang = (i/n)*Math.PI*2 + rng()*0.4;
            const rr = (boxW*0.28 + rng()*boxW*0.12);
            const hh = baseH + bushH*(0.3 + rng()*0.55);
            const size = bushH*(0.28 + rng()*0.16);
            const shade = rng();
            const col = shade < 0.33 ? V.leafA : shade < 0.66 ? V.leafB : V.leafC;
            puffs.push({ a: Math.cos(ang)*rr, b: Math.sin(ang)*rr, h: hh, r: size, c: col, ang });
          }
          puffs.sort((p1,p2) => dAt(p1.a,p1.b,p1.h) - dAt(p2.a,p2.b,p2.h));
          for(const pf of puffs){
            const s0 = GG(pf.a*0.25, pf.b*0.25, baseH - 0.4);
            const s1 = GG(pf.a, pf.b, Math.max(pf.h - pf.r*0.35, baseH));
            g.lineStyle(Math.max(1, 1.1*this.K*0.4), PL.stalk, 1);
            g.lineBetween(s0.x, s0.y, s1.x, s1.y);
            const c = GG(pf.a, pf.b, pf.h);
            g.fillStyle(pf.c, 1);
            if(V.style === "spiky"){
              // ornamental-grass blade: thin triangles radiating from
              // the stalk tip instead of one round puff
              const nb = 4;
              for(let bIdx=0; bIdx<nb; bIdx++){
                const bAng = (pf.ang || 0) + (bIdx/nb)*Math.PI*2 + rng()*0.3;
                const tip = GG(pf.a + Math.cos(bAng)*pf.r*1.3, pf.b + Math.sin(bAng)*pf.r*1.3, pf.h + pf.r*0.7);
                const base1 = GG(pf.a + Math.cos(bAng+0.3)*pf.r*0.3, pf.b + Math.sin(bAng+0.3)*pf.r*0.3, pf.h - pf.r*0.3);
                const base2 = GG(pf.a + Math.cos(bAng-0.3)*pf.r*0.3, pf.b + Math.sin(bAng-0.3)*pf.r*0.3, pf.h - pf.r*0.3);
                g.fillTriangle(tip.x, tip.y, base1.x, base1.y, base2.x, base2.y);
              }
            } else {
              g.fillCircle(c.x, c.y, pf.r*this.K*0.42);
            }
          }
          if(flowering){
            const nf = Math.max(2, Math.round(n*0.6));
            for(let i=0; i<nf; i++){
              const ang = rng()*Math.PI*2;
              const rr = boxW*0.22 + rng()*boxW*0.16;
              const hh = baseH + bushH*(0.45 + rng()*0.5);
              const c = GG(Math.cos(ang)*rr, Math.sin(ang)*rr, hh);
              g.fillStyle(V.flower, 1);
              g.fillCircle(c.x, c.y, (1.6+rng())*this.K*0.42);
            }
          }
        };

        const pparts = [
          { d: dAt(0,0,H*0.4), fn: pbox },
          { d: dAt(0,0,H + bushH*0.6), fn: pbush }
        ];
        pparts.sort((p1, p2) => p1.d - p2.d);
        for(const pt of pparts) pt.fn();
      }

      /* spilled leaves/flowers: independent projectiles once launched,
         same "plain local W(), not tip()-rotated" convention bin's
         flung debris uses. */
      if(data && data.items && data.items.length){
        for(const it of data.items){
          const s2 = W(it.x + 1, it.y + 1, 0.4);
          g.fillStyle(PL.shadow, 0.13);
          g.fillEllipse(s2.x, s2.y, it.size*this.K*0.9, it.size*this.K*0.4);
        }
        for(const it of data.items){
          const p = W(it.x, it.y, it.z);
          g.fillStyle(it.col, 1);
          g.fillCircle(p.x, p.y, it.size*this.K*0.42);
        }
      }
    } else if(kind === "dog"){
      /* approved in dog lab v2: the one-eyed sidewalk chihuahua.
         SIZE unchanged — the game's approved DOG preset (0.8 scale)
         drives all proportions. Seeded per spawn: coat (3), scar
         side (L/R), and behavior — ~40% sit at a fixed spot, the
         rest patrol their spawn tile via dogSpotAt(t, seed): a pure
         function of time + seed, so the sim shifts the hitbox with
         the exact same call and the robot can bump a dog that walks
         into the lane (or be bumped by one). Trot is diagonal-pair
         legs, easing in/out between waypoints; he trembles when he
         stands still, because he is a chihuahua. */
      const D = DOG, L = D.len;
      const pseed = ((Math.round(x)*7919) ^ (Math.round(y)*104729) ^ 0x6d0a) >>> 0;
      const dseed = (data && data.dogSeed !== undefined) ? data.dogSeed : pseed;
      const sitSeed = data ? !!data.sit : ((dseed >> 3) % 5 < 2);
      const spot = dogSpotAt(t, dseed, sitSeed);
      const flee = dogFleeAt(t, data);
      const settled = flee && flee.gone;
      const settledSpot = settled ? dogSettledSpot(data) : null;
      const sit = (sitSeed && !flee) || settled;     // a hit sitter leaps up; a settled dog sits too
      let spotA = spot.a, spotB = spot.b, spotTh = spot.th, walk = spot.walk;
      let tailCurlNow = D.tailCurl, scramble = false;
      if(settled){
        spotA = settledSpot.a;                        // stays right where the flee left him,
        spotB = settledSpot.b;                        // not wherever the old wander cycle
        spotTh = settledSpot.th;                       // has drifted to by now
        walk = 0;
      } else if(flee){
        spotA += flee.da;                            // no clamp: he is LEAVING the tile
        spotB += flee.db;
        spotTh = Math.atan2(-0.45, (data.fleeA || 1)); // face the run: along the flee, angled to the buildings
        walk = 1;                                    // flat-out the whole way
        tailCurlNow = 0;                             // tail stays tucked till he's gone
        scramble = true;                             // panic legs, no easing off
      }
      const thW = fdir*Math.PI/2 + spotTh;
      const cs = Math.cos(thW), sn = Math.sin(thW);
      const coat = DOG_COATS[dseed % 3];
      const blindSide = (dseed & 4) ? 1 : -1;
      const ax = x + dv.x*spotA + rv.x*spotB;
      const ay = y + dv.y*spotA + rv.y*spotB;
      const G = (a, b, h) => this.W(ax + a*cs - b*sn, ay + a*sn + b*cs, z + h);
      const depthAt = (a, b, h) => (ax + a*cs - b*sn) + (ay + a*sn + b*cs) + h*0.4;
      const walkPhase = t * (scramble ? 0.038 : 0.014);   // panic legs
      const walkAmt = walk;
      const tr = (walk < 0.25 && !flee) ? 1 : 0;   // tremble only while calmly standing
      const jb = tr * (Math.sin(t*0.052) + Math.sin(t*0.083)*0.5) * 0.28 * L;
      const jh = tr * Math.sin(t*0.097) * 0.18 * L;

    /* ---- pose anchors ---- */
    /* sit: seeded per spawn (see header) */
    const legH = D.legH * L;
    const bodyR = 5.0 * L, chestR = 5.6 * L;
    const headR = D.headR * L;
    const earH = D.earH * L;

    const rearA  = sit ? -8*L  : -9*L;
    const rearH  = sit ? bodyR*0.95 : legH + bodyR*0.72;
    const chestA = sit ? 4.5*L : 6*L;
    const chestH = sit ? legH + chestR*0.85 : legH + bodyR*0.72;
    const headA  = (sit ? 7.5*L : 9.5*L) + jb*0.15;
    const headH  = chestH + 6.2*L + headR*0.35 + jh;

    const ringAt = (a0, b0, h0, r, d1, d2, n=12) => {
      const pts = [];
      for(let i=0; i<n; i++){
        const phi = (i/n)*Math.PI*2, c = Math.cos(phi)*r, s2 = Math.sin(phi)*r;
        pts.push(G(a0 + c*d1.a + s2*d2.a, b0 + c*d1.b + s2*d2.b, h0 + c*d1.h + s2*d2.h));
      }
      return pts;
    };
    const V = {a:0,b:1,h:0}, HH = {a:0,b:0,h:1};
    const px = r => r * this.K * 1.12;          // sphere → screen radius

    /* ---- shadow ---- */
    const sh = G((rearA + chestA)/2, 0, 0);
    g.fillStyle(D.shadow, 0.13);
    g.fillEllipse(sh.x, sh.y + 1, (sit ? 34 : 40)*L, 14*L);

    /* ---- parts (built as closures, depth-sorted) ---- */

    const body = () => {
      const rear = ringAt(rearA, 0, rearH, bodyR, V, HH, 12);
      const chest = ringAt(chestA, 0, chestH, chestR, V, HH, 12);
      this.quadOn(g, convexHull(rear.concat(chest)), coat.body);
      const cap = ringAt(rearA - bodyR*0.25, 0, rearH, bodyR*0.9, V, HH, 12);
      this.quadOn(g, cap, coat.dk);                   // shaded rump cap
    };

    const haunch = s => () => {                  // sitting only: folded rear leg
      const c = G(rearA + 0.5*L, s*bodyR*0.72, bodyR*1.0);
      g.fillStyle(coat.body, 1);
      g.fillCircle(c.x, c.y, px(bodyR*0.9));
      g.lineStyle(1.5, coat.dk, 1);
      g.strokeCircle(c.x, c.y, px(bodyR*0.9));
      const f = G(rearA + 3*L, s*bodyR*0.8, 0.6);
      g.fillStyle(coat.dk, 1);
      g.fillEllipse(f.x, f.y, px(1.7*L)*1.6, px(1.7*L)*0.8);
    };

    const leg = (a0, s, foot) => () => {         // pin leg + paw
      const top = G(a0, s*2.9*L, chestH - 1*L);
      const bot = G(a0 + foot, s*2.9*L, 0.8);
      g.lineStyle(Math.max(2, 0.9*L*this.K*0.42), coat.body, 1);
      g.lineBetween(top.x, top.y, bot.x, bot.y);
      g.fillStyle(coat.dk, 1);
      g.fillEllipse(bot.x, bot.y + 1, px(1.4*L)*1.5, px(1.4*L)*0.7);
    };

    const chestPatch = () => {
      const c = G(chestA + chestR*0.45, 0, chestH - chestR*0.3);
      g.fillStyle(coat.chest, 1);
      g.fillCircle(c.x, c.y, px(chestR*0.52));
    };

    const neck = () => {
      const n0 = ringAt(chestA + 1*L, jb*0.3, chestH + 2*L, 2.5*L, V, HH, 10);
      const n1 = ringAt(headA - 1*L, jb*0.6, headH - headR*0.55, 2.2*L, V, HH, 10);
      this.quadOn(g, convexHull(n0.concat(n1)), coat.body);
    };

    const collar = () => {
      const cA = chestA + 1.6*L, cH = chestH + 2.8*L;
      const c0 = ringAt(cA, jb*0.35, cH, 2.7*L, V, HH, 10);
      const c1 = ringAt(cA + 0.7*L, jb*0.35, cH + 0.9*L, 2.6*L, V, HH, 10);
      this.quadOn(g, convexHull(c0.concat(c1)), D.collar);
      const tag = G(cA + 2.4*L, jb*0.35, cH - 1.4*L);
      g.fillStyle(0xe8c34a, 1);
      g.fillCircle(tag.x, tag.y, px(0.7*L));
    };

    const head = () => {                          // the apple dome
      const c = G(headA, jb, headH);
      g.fillStyle(coat.body, 1);
      g.fillCircle(c.x, c.y, px(headR));
    };

    const ear = s => () => {                      // giant bat ear
      const b1 = G(headA - headR*0.15, jb + s*headR*0.35, headH + headR*0.6);
      const b2 = G(headA - headR*0.7,  jb + s*headR*0.6,  headH + headR*0.28);
      const tp = G(headA - headR*0.5,  jb + s*(headR*0.85 + earH*0.32), headH + headR*0.45 + earH);
      g.fillStyle(coat.body, 1);
      g.fillTriangle(b1.x, b1.y, b2.x, b2.y, tp.x, tp.y);
      g.lineStyle(1.5, coat.dk, 1);
      g.strokeTriangle(b1.x, b1.y, b2.x, b2.y, tp.x, tp.y);
      const cx2 = (b1.x + b2.x + tp.x)/3, cy2 = (b1.y + b2.y + tp.y)/3;
      const lerp = (p2, k) => ({ x: p2.x + (cx2 - p2.x)*k, y: p2.y + (cy2 - p2.y)*k });
      const i1 = lerp(b1, 0.38), i2 = lerp(b2, 0.38), i3 = lerp(tp, 0.3);
      g.fillStyle(coat.ear, 1);
      g.fillTriangle(i1.x, i1.y, i2.x, i2.y, i3.x, i3.y);
    };

    const scarEye = s => () => {                  // the missing one: healed shut
      /* a short closed-lid stroke where the bug eye would sit, plus a
         faint scar nick crossing it — the street-veteran squint */
      const c0 = G(headA + headR*0.42, jb + s*headR*0.30, headH + headR*0.12);
      const c1 = G(headA + headR*0.42, jb + s*headR*0.58, headH + headR*0.08);
      g.lineStyle(px(headR*0.10), D.eye, 1);
      g.lineBetween(c0.x, c0.y, c1.x, c1.y);
      const n0 = G(headA + headR*0.32, jb + s*headR*0.44, headH + headR*0.32);
      const n1 = G(headA + headR*0.54, jb + s*headR*0.44, headH - headR*0.06);
      g.lineStyle(px(headR*0.05), coat.dk, 1);
      g.lineBetween(n0.x, n0.y, n1.x, n1.y);
      if(coat.n === "blk&tan"){                   // eyebrow dot survives the scar
        const eb = G(headA + headR*0.28, jb + s*headR*0.46, headH + headR*0.46);
        g.fillStyle(0xc98d4b, 1);
        g.fillCircle(eb.x, eb.y, px(headR*0.12));
      }
    };

    const eye = s => () => {                      // bug eye + glint
      const c = G(headA + headR*0.42, jb + s*headR*0.44, headH + headR*0.12);
      g.fillStyle(D.eye, 1);
      g.fillCircle(c.x, c.y, px(headR*0.21));
      g.fillStyle(D.glint, 1);
      g.fillCircle(c.x - px(headR*0.07), c.y - px(headR*0.08), px(headR*0.06));
      if(coat.n === "blk&tan"){                   // tan eyebrow dots
        const eb = G(headA + headR*0.28, jb + s*headR*0.46, headH + headR*0.46);
        g.fillStyle(0xc98d4b, 1);
        g.fillCircle(eb.x, eb.y, px(headR*0.12));
      }
    };

    const muzzle = () => {                        // short tapered snoot + nose
      const m0 = ringAt(headA + headR*0.5,  jb, headH - headR*0.28, headR*0.4,  V, HH, 10);
      const m1 = ringAt(headA + headR*0.95, jb, headH - headR*0.34, headR*0.22, V, HH, 10);
      this.quadOn(g, convexHull(m0.concat(m1)), coat.chest);
      const n = G(headA + headR*1.02, jb, headH - headR*0.3);
      g.fillStyle(D.nose, 1);
      g.fillCircle(n.x, n.y, px(headR*0.13));
    };

    const tail = () => {                          // sickle curl over the back
      const rr = 3.9*L;
      const Ca = rearA - 0.8*L, Ch = rearH + bodyR*0.15 + rr;
      const thMax = Math.min((0.55 + 0.85*tailCurlNow) * Math.PI, 1.9*Math.PI);
      const n = 8;
      for(let i=0; i<=n; i++){
        const u = i/n, ang = u*thMax;
        const a2 = Ca - rr*Math.sin(ang);
        const h2 = Ch - rr*Math.cos(ang);
        const b2 = 1.0*L + u*0.8*L;
        const p2 = G(a2, b2, h2);
        g.fillStyle(u > 0.75 ? coat.chest : coat.dk, 1);
        g.fillCircle(p2.x, p2.y, px((1.25 - u*0.55)*L));
      }
    };

    /* ---- depth-sorted assembly ---- */
    const parts = [
      { d: depthAt(rearA - 2*L, 1*L, rearH + bodyR), fn: tail },
      { d: depthAt(rearA, 0, rearH), fn: body },
      { d: depthAt(chestA + chestR*0.45, 0, chestH - chestR*0.3), fn: chestPatch },
      { d: depthAt(chestA + 1.5*L, 0, chestH + 2*L), fn: neck },
      { d: depthAt(chestA + 2*L, 0, chestH + 3*L), fn: collar },
      { d: depthAt(headA, 0, headH), fn: head },
      { d: depthAt(headA - headR*0.5, headR*0.85 + earH*0.3, headH + earH*0.6), fn: ear(1) },
      { d: depthAt(headA - headR*0.5, -(headR*0.85 + earH*0.3), headH + earH*0.6), fn: ear(-1) },
      { d: depthAt(headA + headR*0.42, headR*0.44, headH),
        fn: (blindSide !== 1) ? eye(1) : scarEye(1) },
      { d: depthAt(headA + headR*0.42, -headR*0.44, headH),
        fn: (blindSide !== -1) ? eye(-1) : scarEye(-1) },
      { d: depthAt(headA + headR*0.8, 0, headH - headR*0.3), fn: muzzle }
    ];
    /* legs: front pair always; rear pair standing, haunches sitting.
       Trot: diagonal pairs swing together (FL+RR vs FR+RL), feet
       reaching fore/aft by walkPhase; walkAmt eases the stride in
       and out so he settles to a stand instead of freezing mid-step */
    const sw = ph => Math.sin(walkPhase + ph) * 1.5 * L * walkAmt;
    parts.push({ d: depthAt(chestA + 0.5*L,  2.9*L, legH*0.4), fn: leg(chestA + 0.5*L, 1, 0.4*L + sw(0)) });
    parts.push({ d: depthAt(chestA + 0.5*L, -2.9*L, legH*0.4), fn: leg(chestA + 0.5*L, -1, 0.4*L + sw(Math.PI)) });
    if(sit){
      parts.push({ d: depthAt(rearA + 0.5*L,  bodyR*0.72, bodyR), fn: haunch(1) });
      parts.push({ d: depthAt(rearA + 0.5*L, -bodyR*0.72, bodyR), fn: haunch(-1) });
    } else {
      parts.push({ d: depthAt(rearA + 1*L,  2.9*L, legH*0.4), fn: leg(rearA + 1*L, 1, -0.4*L + sw(Math.PI)) });
      parts.push({ d: depthAt(rearA + 1*L, -2.9*L, legH*0.4), fn: leg(rearA + 1*L, -1, -0.4*L + sw(0)) });
    }
    parts.sort((x, y) => x.d - y.d);
    for(const pt of parts) pt.fn();

    /* startle marks: three short strokes radiating above the head,
       fading through the first 40% of the reaction */
    if(flee && flee.u < 0.4){
      const hp = G(headA, jb, headH + headR + earH*0.6 + 2);
      const alpha = 1 - flee.u/0.4;
      g.lineStyle(1.5, 0xffb04d, alpha);
      for(const aoff of [-0.7, 0, 0.7]){
        const r1 = px(headR*0.5), r2 = px(headR*1.05);
        g.lineBetween(hp.x + Math.sin(aoff)*r1, hp.y - Math.cos(aoff)*r1,
                      hp.x + Math.sin(aoff)*r2, hp.y - Math.cos(aoff)*r2);
      }
    }
    } else if(kind === "people"){
      /* ported from the customer lab (dial bench approved), now drawn
         via the shared drawPersonHull() so prop.people and
         world.customer stay visually identical. Patrols the spawn
         tile via peopleSpotAt() — same construction as the dog — until
         hit; flee/settle use the dog's exact DUR/DIST curve. */
      const pseed = ((Math.round(x)*7919) ^ (Math.round(y)*104729) ^ 0x9c3a) >>> 0;
      const pSeed = (data && data.peopleSeed !== undefined) ? data.peopleSeed : pseed;
      const prng = mulberry32(pSeed);
      const build = PEOPLE_BUILD[prng() < 0.5 ? 0 : 1];
      const pSkin = PEOPLE_SKIN[Math.floor(prng()*PEOPLE_SKIN.length)];
      const pShirt = PEOPLE_SHIRT[Math.floor(prng()*PEOPLE_SHIRT.length)];
      const pPants = PEOPLE_PANTS[Math.floor(prng()*PEOPLE_PANTS.length)];
      const pHair = PEOPLE_HAIR[Math.floor(prng()*PEOPLE_HAIR.length)];
      const pShoe = PEOPLE_SHOE[Math.floor(prng()*PEOPLE_SHOE.length)];

      const spot = peopleSpotAt(t, pSeed);
      const flee = peopleFleeAt(t, data);
      const settled = flee && flee.gone;
      const settledSpot = settled ? peopleSettledSpot(data) : null;
      let spotA = spot.a, spotB = spot.b, spotTh = spot.th, walkAmt = spot.walk;
      if(settled){ spotA = settledSpot.a; spotB = settledSpot.b; spotTh = settledSpot.th; walkAmt = 0; }
      else if(flee){ spotA += flee.da; spotB += flee.db; spotTh = Math.atan2(-0.45, (data.fleeA || 1)); walkAmt = 1; }

      const thW = fdir*Math.PI/2 + spotTh;
      const ax = x + dv.x*spotA + rv.x*spotB, ay = y + dv.y*spotA + rv.y*spotB;
      const moving = walkAmt > 0.05;
      const walkPhase = moving ? Math.sin(t*PEOPLE_ART.walkSpeed) : 0;
      const startleAlpha = (flee && flee.u < 0.4) ? 1 - flee.u/0.4 : 0;

      this.drawPersonHull(g, ax, ay, z, thW, build, pSkin, pShirt, pPants, pHair, pShoe, walkPhase, moving, startleAlpha);
    } else if(kind === "car" || kind === "truck"){
      /* rebuilt (2026-07-12) on the SAME rigid-rotation pattern the
         robot's own body already uses (T()/P()/depth()): the car's
         entire shape -- chassis, cabin, wheels, everything -- is
         defined ONCE in a fixed local frame (a=length, b=width,
         h=height, car always "facing +a" in this local space), then
         the WHOLE THING rotates together as one rigid unit into world
         space via carT/carP, exactly like the robot rotates as one
         piece via T()/P(). This is a structural fix, not a patch: the
         previous version independently hand-tuned each panel's (a,b,h)
         and just swapped which world axis stood in for "front" per
         fdir, so the body's own coverage and the wheels' own position
         could drift apart depending on facing (the wheel-on-the-hood
         bug). With one rigid rotation, body and wheels can never
         drift apart -- whatever relationship holds in local space
         holds in every orientation. Where a specific panel needs to
         know which side is camera-facing (side glass), it uses
         carDepth to pick dynamically -- the same technique the
         robot's own drawWheel already uses to pick its visible face. */
      const CR = CARC, isTruck = kind === "truck";
      const seed = colorSeed !== null
        ? (colorSeed ^ 0x9c31) >>> 0
        : ((Math.round(x)*7919) ^ (Math.round(y)*104729) ^ 0x9c31) >>> 0;
      const rng = mulberry32(seed);
      const col = CAR_COLORS[Math.floor(rng()*CAR_COLORS.length)];
      const hl = CR.len/2, hw = CR.wid/2, cz = CR.wheelR;
      const chassisTop = cz + CR.chassisH, cabinTop = chassisTop + CR.cabinH;
      const cl = isTruck ? hl*0.24 : hl*0.62;

      /* rigid rotation: local (a,b,h) -> world -> screen, and a matching
         depth() for camera-relative comparisons -- same pair the robot
         uses (T/P and depth), just yaw-only (fdir snapped to 90 deg
         steps today; ready for free rotation later without touching
         any panel below, since they never reference fdir directly). */
      const carTheta = fdir * (Math.PI/2);
      const cTh = Math.cos(carTheta), sTh = Math.sin(carTheta);
      const carT = (a, b, h) => ({ x: a*cTh - b*sTh, y: a*sTh + b*cTh, z: h });
      const carP = (a, b, h) => { const q = carT(a, b, h); return this.W(x + q.x, y + q.y, z + q.z); };
      const carDepth = (a, b, h) => { const q = carT(a, b, h); return q.x + q.y + q.z*0.4; };

      const csh = carP(0, 0, 0);
      g.fillStyle(CR.shadow, 0.16);
      g.fillEllipse(csh.x, csh.y + 3, (CR.len+8)*this.K*0.42, (CR.wid+10)*this.K*0.36);

      const wheel = (a0, r, side) => () => {
        const WW = 3.6*(CR.wheelR/16);
        const ringAt = (bc, rad, n=12) => {
          const pts = [];
          for(let i=0; i<n; i++){
            const phi = (i/n)*Math.PI*2;
            pts.push(carP(a0 + Math.cos(phi)*rad, bc, cz + Math.sin(phi)*rad));
          }
          return pts;
        };
        const bIn = side*(hw - 1), bOut = side*(hw + WW - 1);
        this.quadOn(g, convexHull(ringAt(bIn, r).concat(ringAt(bOut, r))), CR.wheelDk);
        /* which of the two rings is actually camera-facing -- same
           depth-comparison technique the robot's own drawWheel uses,
           instead of assuming bOut is always the visible one. */
        const faceB = carDepth(a0, bOut, cz) > carDepth(a0, bIn, cz) ? bOut : bIn;
        const faceRing = rr => ringAt(faceB, rr);
        this.quadOn(g, faceRing(r), CR.wheel);
        this.quadOn(g, faceRing(r*0.5), CR.hubFace);
        if(wheelPhase !== null){
          const wp2 = wheelPhase + a0*0.02;
          const hub = carP(a0 + Math.cos(wp2)*r*0.34, faceB, cz + Math.sin(wp2)*r*0.34);
          g.fillStyle(CR.hub, 1);
          g.fillCircle(hub.x, hub.y, r*0.2*this.K*0.42);
        } else {
          const hub = carP(a0, faceB, cz);
          g.fillStyle(CR.hub, 1);
          g.fillCircle(hub.x, hub.y, r*0.34*this.K*0.42);
        }
      };

      const chassis = () => {
        const top = [carP(-hl,-hw,chassisTop), carP(hl,-hw,chassisTop), carP(hl,hw,chassisTop), carP(-hl,hw,chassisTop)];
        const bot = [carP(-hl,-hw,cz), carP(hl,-hw,cz), carP(hl,hw,cz), carP(-hl,hw,cz)];
        this.quadOn(g, convexHull(top.concat(bot)), col.bodyDk);
        this.quadOn(g, top, col.body);
      };
      const bumperFront = () => {
        const q = [carP(hl-0.3,-hw,cz), carP(hl,-hw,cz+3), carP(hl,hw,cz+3), carP(hl-0.3,hw,cz)];
        this.quadOn(g, q, CR.bumper);
        g.fillStyle(CR.light, 1);
        for(const side of [-1, 1]){
          const hlp = carP(hl-0.4, side*(hw-3), cz+5);
          g.fillCircle(hlp.x, hlp.y, 2*this.K*0.42);
        }
      };
      const bumperRear = () => {
        const q = [carP(-hl+0.3,-hw,cz), carP(-hl,-hw,cz+3), carP(-hl,hw,cz+3), carP(-hl+0.3,hw,cz)];
        this.quadOn(g, q, CR.bumper);
        g.fillStyle(CR.tail, 1);
        for(const side of [-1, 1]){
          const tlp = carP(-hl+0.4, side*(hw-3), cz+5);
          g.fillCircle(tlp.x, tlp.y, 1.8*this.K*0.42);
        }
      };

      const bed = () => {
        if(!isTruck) return;
        const bedBackA = -hl+1, bedFrontA = -cl-2;
        const railTop = chassisTop + CR.chassisH*0.55;
        const floorH = chassisTop + 1;
        const wallFar = [carP(bedBackA,-hw,floorH), carP(bedFrontA,-hw,floorH), carP(bedFrontA,-hw,railTop), carP(bedBackA,-hw,railTop)];
        const floor = [carP(bedBackA,-hw*0.88,floorH), carP(bedFrontA,-hw*0.88,floorH), carP(bedFrontA,hw*0.88,floorH), carP(bedBackA,hw*0.88,floorH)];
        const cabBackWall = [carP(bedFrontA,-hw*0.88,floorH), carP(bedFrontA,hw*0.88,floorH), carP(bedFrontA,hw*0.88,railTop), carP(bedFrontA,-hw*0.88,railTop)];
        const wallNear = [carP(bedBackA,hw,floorH), carP(bedFrontA,hw,floorH), carP(bedFrontA,hw,railTop), carP(bedBackA,hw,railTop)];
        this.quadOn(g, wallFar, col.bodyDk);
        this.quadOn(g, floor, CR.bedFloor);
        this.quadOn(g, cabBackWall, col.bodyDk);
        this.quadOn(g, wallNear, col.body);
      };

      const cabin = () => {
        const roofF = isTruck ? -cl : -cl*0.55, roofR = cl*0.55;
        const roofPts = [carP(roofF,-hw*0.86,cabinTop), carP(roofR,-hw*0.86,cabinTop), carP(roofR,hw*0.86,cabinTop), carP(roofF,hw*0.86,cabinTop)];
        const beltPts = [carP(cl,-hw*0.92,chassisTop), carP(cl,hw*0.92,chassisTop), carP(-cl,hw*0.92,chassisTop), carP(-cl,-hw*0.92,chassisTop)];
        /* ONE hull over every cabin corner -- same technique chassis's
           own hullBody already uses. Guarantees full, gap-free coverage
           of anything behind it (like a wheel) in every orientation,
           instead of separately-tuned windshield/backlight/side-glass
           panels that only happened to line up for one assumed facing. */
        this.quadOn(g, convexHull(roofPts.concat(beltPts)), col.roof);
        this.quadOn(g, roofPts, col.roof);
        this.edgeOn(g, roofPts, col.bodyDk, 1);

        /* windshield: local front is always +cl regardless of fdir,
           since rotation happens after this is defined -- no per-
           orientation logic needed here. */
        const windFront = [carP(roofR,-hw*0.85,cabinTop), carP(roofR,hw*0.85,cabinTop), carP(cl,hw*0.9,chassisTop), carP(cl,-hw*0.9,chassisTop)];
        this.quadOn(g, windFront, CR.windshield);
        this.edgeOn(g, windFront, CR.windshieldEdge, 1);

        if(isTruck){
          const winW = hw*0.5;
          const winH0 = chassisTop + (cabinTop-chassisTop)*0.35;
          const winH1 = chassisTop + (cabinTop-chassisTop)*0.85;
          const back = [carP(roofF,-winW,winH1), carP(roofF,winW,winH1), carP(roofF,winW,winH0), carP(roofF,-winW,winH0)];
          this.quadOn(g, back, CR.windshield);
          this.edgeOn(g, back, CR.windshieldEdge, 1);
        } else {
          const back = [carP(roofF,-hw*0.86,cabinTop), carP(roofF,hw*0.86,cabinTop), carP(-cl,hw*0.92,chassisTop), carP(-cl,-hw*0.92,chassisTop)];
          this.quadOn(g, back, CR.windshield);
          this.edgeOn(g, back, CR.windshieldEdge, 1);
        }

        /* roof redraw: this car's greenhouse used to be front/back
           asymmetric, and iso projection isn't rotationally uniform, so
           the windshield/backlight panels above could end up overlapping
           part of the roof's own screen footprint at some headings even
           though they never did at others. Repainting the roof top face
           here guarantees it always wins that overlap regardless of fdir. */
        this.quadOn(g, roofPts, col.roof);
        this.edgeOn(g, roofPts, col.bodyDk, 1);

        /* side glass: which physical side (+b or -b) is camera-facing
           is picked dynamically via carDepth -- same technique the
           robot's own drawWheel uses for its visible face, rather than
           the old hardcoded "always +b" assumption. */
        const sgSide = carDepth(0, hw*0.9, cabinTop) > carDepth(0, -hw*0.9, cabinTop) ? 1 : -1;
        const sgB = sgSide*hw*0.86, beltB = sgSide*hw*0.92;
        const sgPts = [
          { a: roofF, b: sgB,   h: cabinTop },
          { a: roofR, b: sgB,   h: cabinTop },
          { a: cl,    b: beltB, h: chassisTop },
          { a: -cl,   b: beltB, h: chassisTop }
        ];
        const cA = sgPts.reduce((s,p) => s+p.a, 0)/4;
        const cB = sgPts.reduce((s,p) => s+p.b, 0)/4;
        const cH = sgPts.reduce((s,p) => s+p.h, 0)/4;
        const shrink = 0.7;
        const sideFrame = sgPts.map(p => carP(p.a, p.b, p.h));
        const sidePane = sgPts.map(p => carP(cA+(p.a-cA)*shrink, cB+(p.b-cB)*shrink, cH+(p.h-cH)*shrink));
        this.quadOn(g, sideFrame, col.body);
        this.quadOn(g, sidePane, CR.windshield);
      };

      const mirror = side => () => {
        const roofR = cl*0.55;
        const mb = carP(roofR - 3, hw*0.9*side, chassisTop + 3);
        g.fillStyle(col.bodyDk, 1);
        g.fillCircle(mb.x, mb.y, 1.6*this.K*0.42);
      };

      /* the far-side wheels are reliably hidden by chassis's own hull
         (verified), so they always draw early. Near-side wheels and both
         bumpers get placed by comparing depth against the cabin's own,
         same as before -- but WHICH physical side (+b or -b) counts as
         "near" for each wheel is now picked dynamically via carDepth,
         same technique faceB/sgSide already use, instead of hardcoding
         side=+1. The hardcoded version only happened to be correct at
         two of the four fdir headings (0 and 3); at 1 and 2 it picked
         the wrong side entirely, so neither near wheel poked through. */
      const cabinRefDepth = carDepth(0, 0, (chassisTop+cabinTop)/2);
      const rearNearSide = carDepth(-hl*0.55, hw, cz) > carDepth(-hl*0.55, -hw, cz) ? 1 : -1;
      const frontNearSide = carDepth(hl*0.55, hw, cz) > carDepth(hl*0.55, -hw, cz) ? 1 : -1;
      const nearRearWheelDepth = carDepth(-hl*0.55, hw*rearNearSide, cz);
      const nearFrontWheelDepth = carDepth(hl*0.55, hw*frontNearSide, cz);
      const bumperFrontDepth = carDepth(hl-0.15, 0, cz+1.5);
      const bumperRearDepth = carDepth(-hl+0.15, 0, cz+1.5);

      wheel(-hl*0.55, CR.wheelR, -rearNearSide)();
      wheel(hl*0.55, CR.wheelR*0.95, -frontNearSide)();
      chassis();
      bed();
      if(nearRearWheelDepth <= cabinRefDepth) wheel(-hl*0.55, CR.wheelR, rearNearSide)();
      if(nearFrontWheelDepth <= cabinRefDepth) wheel(hl*0.55, CR.wheelR*0.95, frontNearSide)();
      mirror(-1)();
      cabin();
      /* bumpers: chassis() above already unconditionally paints the far
         tip's silhouette, and cabin() never reaches out to a=+-hl to
         occlude anything there -- so drawing both bumperFront/bumperRear
         every frame (the old early/late-vs-cabin split) meant whichever
         one drew second always painted over chassis and stayed visible,
         regardless of facing. Only the one actually facing the camera
         should be drawn at all; the far one is already represented by
         chassis's own solid end. */
      if(bumperFrontDepth > bumperRearDepth) bumperFront(); else bumperRear();
      if(nearRearWheelDepth > cabinRefDepth) wheel(-hl*0.55, CR.wheelR, rearNearSide)();
      if(nearFrontWheelDepth > cabinRefDepth) wheel(hl*0.55, CR.wheelR*0.95, frontNearSide)();
      mirror(1)();
    } else if(kind === "bin"){
      /* approved in bin hit lab (2026-07-09): ONE rigid geometry
         driven by a continuous tip angle phi about the base rim —
         single phase, since a barrel's own round bottom is the whole
         base (phiRest is exactly 90°, no slab-corner handoff like
         the cone needed). fallPsi is set once, at the hit that starts
         the fall, and plays the same role the old per-tile rotation
         did. The lid rides shut until phi crosses the balance angle,
         then springs open — same trigger that flings the trash. */
      const B = BIN, K = this.K;
      const seed = ((Math.round(x)*7919) ^ (Math.round(y)*104729) ^ 0x8177) >>> 0;
      const rng = mulberry32(seed);
      /* a BOX squared to the curb — seeded quarter (faces street, walk,
         or either along-axis, all believable placements) + a few degrees
         of slop, replacing the free 2π roll that left bins cocked at
         arbitrary angles to the street. fallPsi knocks stay free: falls
         are chaos, PARKED is order. */
      const cthSeed = Math.floor(rng()*4) * (Math.PI/2) + (rng() - 0.5) * 0.16;
      const H = B.height;
      const phi = (data && data.phi) || 0;
      const cth = (data && data.fallPsi !== undefined) ? data.fallPsi : cthSeed;
      const fc = Math.cos(cth), fsn = Math.sin(cth);
      const cphi = Math.cos(phi), sphi = Math.sin(phi);
      const slide = (data && data.slide) || 0;

      const tip = (u, h) => {
        if(phi === 0) return { u, z: h };
        return { u: binR(0) + (u - binR(0))*cphi + h*sphi, z: -(u - binR(0))*sphi + h*cphi };
      };
      const L = (u, v, h) => {
        const tt = tip(u, h);
        return W((tt.u + slide)*fc - v*fsn, (tt.u + slide)*fsn + v*fc, tt.z);
      };
      const dAt = (u, v, h) => {
        const tt = tip(u, h);
        const a2 = (tt.u + slide)*fc - v*fsn, b2 = (tt.u + slide)*fsn + v*fc;
        return a2 + b2 + tt.z*0.4;
      };
      const place = (h, r, n=14) => {
        const pts = [];
        for(let i=0; i<n; i++){
          const psi = (i/n)*Math.PI*2;
          pts.push(L(Math.cos(psi)*r, Math.sin(psi)*r, h));
        }
        return pts;
      };

      const mid = tip(0, H*0.5);
      const kk = Math.min(1, sphi*1.1);
      const sh = W((mid.u*kk + slide)*fc, (mid.u*kk + slide)*fsn, 0);
      g.fillStyle(B.shadow, 0.14);
      g.fillEllipse(sh.x, sh.y + 2,
        (B.lidR*2.1 + (H + 20 - B.lidR*2.1)*kk) * K * 0.42,
        (B.lidR*0.95 + (22 - B.lidR*0.95)*kk) * K * 0.42);

      const bbody = () => {
        const n = 6, all = [];
        for(let i=0; i<=n; i++) all.push(...place(i/n*H, binR(i/n*H)));
        this.quadOn(g, convexHull(all), B.body);
        const ribN = 6, ribs = [];
        for(let i=0; i<=ribN; i++) ribs.push(place(i/ribN*H, binR(i/ribN*H)));
        for(let i=0; i<ribN; i++){
          this.quadOn(g, convexHull(ribs[i].concat(ribs[i+1])), i % 2 === 0 ? B.body : B.bodyDk);
        }
        const lowerN = 3, lower = [];
        for(let i=0; i<=lowerN; i++) lower.push(...place(i/lowerN*(H*0.5), binR(i/lowerN*(H*0.5))));
        this.quadOn(g, convexHull(lower), B.bodyDk, 0.2);
        const b0 = H*0.6, b1 = Math.min(b0 + B.band, H*0.92);
        if(B.band > 0){
          this.quadOn(g, convexHull(place(b0, binR(b0)+0.3).concat(place(b1, binR(b1)+0.3))), B.band_c);
          this.quadOn(g, place(b1, binR(b1)*0.7, 12), B.liner);
        }
        /* liner lip: camera-facing test, same pattern used everywhere
           else in this projection (rotated local normal dotted with
           the view direction) */
        const nu = cphi, nh = -sphi;
        const mouthFacing = (nu*fc + nu*fsn + nh) > 0.05;
        if(mouthFacing) this.quadOn(g, place(H - 0.5, binR(H)*0.86, 12), B.liner);
      };
      const lidOpen = phi >= BIN_HIT.phiBal;
      const blid = () => {
        if(!lidOpen){
          const rim = place(H, B.lidR, 14);
          this.quadOn(g, rim, B.lidDk);
          const dome = [];
          for(let i=0; i<12; i++){
            const psi = (i/12)*Math.PI*2, r2 = B.lidR*0.82;
            dome.push(L(Math.cos(psi)*r2, Math.sin(psi)*r2, H + 2.6));
          }
          this.quadOn(g, dome, B.lid);
          const knob = L(0, 0, H + 4.4);
          g.fillStyle(B.lidDk, 1);
          g.fillCircle(knob.x, knob.y, 2.6*K*0.45);
          const hinge = L(-B.lidR*0.85, 0, H + 0.6);
          g.fillStyle(B.pedalDk, 1);
          g.fillCircle(hinge.x, hinge.y, 1.6*K*0.45);
        } else {
          const La = H + B.lidR*0.75;
          const disc = [], inner = [];
          for(let i=0; i<12; i++){
            const psi = (i/12)*Math.PI*2;
            disc.push(L(La + Math.cos(psi)*B.lidR, Math.sin(psi)*B.lidR, 1));
            const r2 = B.lidR*0.8;
            inner.push(L(La + Math.cos(psi)*r2, Math.sin(psi)*r2, 1.7));
          }
          this.quadOn(g, disc, B.lidDk);
          this.quadOn(g, inner, B.lid);
          const knob = L(La, 0, 2.3);
          g.fillStyle(B.lidDk, 1);
          g.fillCircle(knob.x, knob.y, 2.2*K*0.45);
        }
      };
      const bpedal = () => {
        if(phi > 0.05) return;
        const a0 = L(B.baseR*0.55, 0, 1.5);
        const a1 = L(B.baseR*0.95, 0, 5.5);
        g.lineStyle(Math.max(1.5, 1.4*K*0.4), B.pedalDk, 1);
        g.lineBetween(a0.x, a0.y, a1.x, a1.y);
        const p0 = L(B.baseR*0.95, -3.2, 0.6), p1 = L(B.baseR*1.25, 3.2, 0.6);
        g.fillStyle(B.pedal, 1);
        g.fillEllipse((p0.x+p1.x)/2, (p0.y+p1.y)/2, 7*K*0.42, 3*K*0.42);
      };

      const bparts = [
        { d: dAt(0, 0, 1.5), fn: bbody },
        { d: dAt(B.baseR*0.9, 0, 3), fn: bpedal },
        { d: lidOpen ? dAt(H + B.lidR*0.75, 0, 1) : dAt(0, 0, H*0.95), fn: blid }
      ];
      bparts.sort((p1, p2) => p1.d - p2.d);
      for(const pt of bparts) pt.fn();

      /* flung debris: independent projectiles once launched, stored
         in the hazard's own local (u,v,h) frame — drawn with the
         PLAIN local W(), not tip()-rotated, since they've detached
         from the rigid body by the time they're airborne */
      if(data && data.items && data.items.length){
        for(const it of data.items){
          const s2 = W(it.x + 1, it.y + 1, 0.4);
          g.fillStyle(TRASH_ART.shadow, 0.15);
          g.fillEllipse(s2.x, s2.y, it.size*K*0.9, it.size*K*0.4);
        }
        for(const it of data.items){
          const p = W(it.x, it.y, it.z);
          if(it.kind === "paper"){
            g.fillStyle(TRASH_ART.paper, 1);
            g.fillRect(p.x - it.size*K*0.4, p.y - it.size*K*0.3, it.size*K*0.8, it.size*K*0.6);
            g.lineStyle(1, TRASH_ART.paperShade, 1);
            g.strokeRect(p.x - it.size*K*0.4, p.y - it.size*K*0.3, it.size*K*0.8, it.size*K*0.6);
          } else if(it.kind === "can"){
            g.fillStyle(TRASH_ART.canA, 1);
            g.fillEllipse(p.x, p.y, it.size*K*0.7, it.size*K*1.1);
            g.fillStyle(TRASH_ART.canHi, 1);
            g.fillEllipse(p.x - it.size*K*0.15, p.y, it.size*K*0.2, it.size*K*0.9);
            g.lineStyle(1, TRASH_ART.outline, 1);
            g.strokeEllipse(p.x, p.y, it.size*K*0.7, it.size*K*1.1);
          } else {
            const col = TRASH_ART.wrap[Math.floor(it.ang) % TRASH_ART.wrap.length];
            const c2 = Math.cos(it.ang), s3 = Math.sin(it.ang);
            g.fillStyle(col, 1);
            this.quadOn(g, [
              { x:p.x + c2*it.size*K*0.6, y:p.y + s3*it.size*K*0.35 },
              { x:p.x - s3*it.size*K*0.35, y:p.y + c2*it.size*K*0.35 },
              { x:p.x - c2*it.size*K*0.6, y:p.y - s3*it.size*K*0.35 },
              { x:p.x + s3*it.size*K*0.35, y:p.y - c2*it.size*K*0.35 }
            ], col);
          }
        }
      }
    } else if(kind === "slab"){
      /* approved in ramp lab v2: heaved slab — the ramp concept redesigned
         into ONE sidewalk tile (92×92), lifted along one side edge by a
         palm root, flush at the other. Draw order: soil gap under the
         raised edges → exposed joint walls → root bulge → top wedge +
         seeded cracks + chipped lip. lift/side/root ride on the hazard
         object (data); cracks/chips are position-seeded like every prop. */
      const D = data || { lift: 6, side: 1, root: true };
      const seed = ((Math.round(x)*7919) ^ (Math.round(y)*104729) ^ 0x51ab) >>> 0;
      const rng = mulberry32(seed);
      const A = SLAB_ART, L = D.lift, sd = D.side;
      const yFlush = -sd*TILE, yUp = sd*TILE;
      const ZT = dy => L * ((sd*dy + TILE) / (2*TILE));

      /* soil shadow in the opened gap */
      this.quadOn(g, [
        W(-TILE, yUp - sd*10, 0), W(TILE, yUp - sd*10, 0),
        W(TILE + 4, yUp + sd*4, 0), W(-TILE - 4, yUp + sd*4, 0)
      ], A.gap, 0.55);

      /* exposed joint walls: triangles at both travel joints, full
         lifted wall along the raised side edge */
      for(const jx of [-TILE, TILE]){
        this.quadOn(g, [W(jx, yFlush, 0), W(jx, yUp, ZT(yUp)), W(jx, yUp, 0)], A.topDk, 0.9);
      }
      this.quadOn(g, [
        W(-TILE, yUp, ZT(yUp)), W(TILE, yUp, ZT(yUp)),
        W(TILE, yUp, 0), W(-TILE, yUp, 0)
      ], A.topDk);
      this.edgeOn(g, [
        W(-TILE, yUp, ZT(yUp)), W(TILE, yUp, ZT(yUp)),
        W(TILE, yUp, 0), W(-TILE, yUp, 0)
      ], A.gap, 1.2);

      /* the culprit: palm root shouldering the raised edge up */
      if(D.root){
        const segsN = 6;
        for(let i=0; i<segsN; i++){
          const t0 = i/segsN, t1 = (i+1)/segsN;
          const x0 = -TILE + 2*TILE*t0, x1 = -TILE + 2*TILE*t1;
          const bump = 2.2 + Math.sin(t0*Math.PI)*2.2 + (rng()-0.5)*1.2;
          const pts = [
            W(x0, yUp + sd*2, 0), W(x1, yUp + sd*2, 0),
            W(x1, yUp + sd*7, bump), W(x0, yUp + sd*7, bump)
          ];
          this.quadOn(g, pts, i%2 ? A.rootA : A.rootB);
          this.edgeOn(g, pts, A.rootB, 1);
        }
      }

      /* top wedge */
      const top = [
        W(-TILE, yFlush, ZT(yFlush)), W(TILE, yFlush, ZT(yFlush)),
        W(TILE, yUp, ZT(yUp)), W(-TILE, yUp, ZT(yUp))
      ];
      this.quadOn(g, top, A.top);
      this.edgeOn(g, top, A.topDk, 1.5);

      /* hairline cracks radiating from the stressed (raised) edge */
      g.lineStyle(1.2, A.topDk, 0.8);
      const nCracks = 2 + Math.floor(rng()*3);
      for(let i=0; i<nCracks; i++){
        let px = -TILE*0.7 + rng()*TILE*1.4;
        let py = yUp - sd*(4 + rng()*8);
        let p = W(px, py, ZT(py) + 0.1);
        g.beginPath(); g.moveTo(p.x, p.y);
        for(let k=0; k<4; k++){
          px += (rng()-0.5)*22;
          py -= sd*(8 + rng()*14);
          py = Math.max(-TILE+3, Math.min(TILE-3, py));
          const q = W(px, py, ZT(py) + 0.1);
          g.lineTo(q.x, q.y);
        }
        g.strokePath();
      }

      /* chipped lip along the raised edge */
      for(let i=0; i<4; i++){
        const cxp = -TILE + 8 + rng()*(2*TILE - 16);
        const p = W(cxp, yUp - sd*1.5, ZT(yUp) + 0.1);
        g.fillStyle(A.gap, 0.5);
        g.fillEllipse(p.x, p.y, (3 + rng()*4)*this.K*0.6, (1.5 + rng()*2)*this.K*0.6);
      }
    } else if(kind === "sidewalkend"){
      /* approved in sidewalkend lab: ADA curb ramp, exactly 2x3 sidewalk
         tiles (184 along-travel x 276 cross-width). Ground decal only,
         same z-varying-quad-on-flat-tiles ground-decal convention (as
         tile field) — static visual, no tilt/pitch/stuck physics wired
         in yet; see docs/DESIGN.md "Sidewalkend curb ramps" for the full
         spec and the open placement question. This is the DOWN variant
         (sidewalk -> street); tile 1 slopes, tile 2 (pad) is the flat
         landing with the ADA dome texture. */
      const T2s = TILE*2, wHalf = 92, crossHalf = 1.5*T2s;
      const sidewalkZ = 2, streetZ = -3;
      this.quadOn(g, [W(-wHalf,-crossHalf,sidewalkZ), W(wHalf,-crossHalf,sidewalkZ),
                      W(wHalf,crossHalf,sidewalkZ), W(-wHalf,crossHalf,sidewalkZ)], 0xb5afa2);
      this.edgeOn(g, [W(-wHalf,-crossHalf,sidewalkZ), W(wHalf,-crossHalf,sidewalkZ),
                      W(wHalf,crossHalf,sidewalkZ), W(-wHalf,crossHalf,sidewalkZ)], 0x968f81, 2);
      g.lineStyle(1.5, 0x968f81, 0.9);
      for(const u of [-0.62, 0, 0.62]){
        const a = W(wHalf*u,-crossHalf,sidewalkZ), b = W(wHalf*u,crossHalf,sidewalkZ);
        g.lineBetween(a.x, a.y, b.x, b.y);
      }
      // tile 1: slopes sidewalk->street. tile 2: flat landing at street height.
      this.quadOn(g, [W(-wHalf,-T2s/2,sidewalkZ), W(0,-T2s/2,streetZ),
                      W(0,T2s/2,streetZ), W(-wHalf,T2s/2,sidewalkZ)], 0xb5afa2);
      this.edgeOn(g, [W(-wHalf,-T2s/2,sidewalkZ), W(0,-T2s/2,streetZ),
                      W(0,T2s/2,streetZ), W(-wHalf,T2s/2,sidewalkZ)], 0x968f81, 1.5);
      this.quadOn(g, [W(0,-T2s/2,streetZ), W(wHalf,-T2s/2,streetZ),
                      W(wHalf,T2s/2,streetZ), W(0,T2s/2,streetZ)], 0xb5afa2);
      this.edgeOn(g, [W(0,-T2s/2,streetZ), W(wHalf,-T2s/2,streetZ),
                      W(wHalf,T2s/2,streetZ), W(0,T2s/2,streetZ)], 0x968f81, 1.5);
      // ADA pad: the flat landing tile, dome-textured
      this.quadOn(g, [W(0,-T2s/2,streetZ), W(wHalf,-T2s/2,streetZ),
                      W(wHalf,T2s/2,streetZ), W(0,T2s/2,streetZ)], 0xf4c430);
      this.edgeOn(g, [W(0,-T2s/2,streetZ), W(wHalf,-T2s/2,streetZ),
                      W(wHalf,T2s/2,streetZ), W(0,T2s/2,streetZ)], 0xb9911f, 1.5);
      for(let ri=0; ri<5; ri++) for(let ci=0; ci<5; ci++){
        const py = -T2s/2 + T2s*(ri/4), px = wHalf*(ci/4);
        const p = W(px, py, streetZ);
        g.fillStyle(0xc9911f, 0.8);
        g.fillCircle(p.x, p.y, 1.5);
      }
    } else if(kind === "sidewalkbegin"){
      /* the ascending mirror of prop.sidewalkend — completes the pair.
         Restored: this and sidewalkbeginTurn were added in 728c97d but
         silently lost the very next commit (5db2940) when a past
         session pushed from a stale local copy. Real ADA design in
         both directions: the pad sits on a flat landing, never the
         active slope. Here that means tile 1 (the street-facing end)
         is the flat pad, tile 2 is the climb up to sidewalk height —
         reversed from sidewalkend, not just its mirror image; see
         docs/DESIGN.md for why (drawRampDown/Up in the lab are
         independent functions, not one flipped by a flag — that
         approach kept producing mismatches). Static gallery/decal
         visual only, not wired into spawn logic yet. */
      const T2s = TILE*2, wHalf = 92, crossHalf = 1.5*T2s;
      const sidewalkZ = 2, streetZ = -3;
      this.quadOn(g, [W(-wHalf,-crossHalf,sidewalkZ), W(wHalf,-crossHalf,sidewalkZ),
                      W(wHalf,crossHalf,sidewalkZ), W(-wHalf,crossHalf,sidewalkZ)], 0xb5afa2);
      this.edgeOn(g, [W(-wHalf,-crossHalf,sidewalkZ), W(wHalf,-crossHalf,sidewalkZ),
                      W(wHalf,crossHalf,sidewalkZ), W(-wHalf,crossHalf,sidewalkZ)], 0x968f81, 2);
      g.lineStyle(1.5, 0x968f81, 0.9);
      for(const u of [-0.62, 0, 0.62]){
        const a = W(wHalf*u,-crossHalf,sidewalkZ), b = W(wHalf*u,crossHalf,sidewalkZ);
        g.lineBetween(a.x, a.y, b.x, b.y);
      }
      // tile 1: flat landing at street height. tile 2: slopes street->sidewalk.
      this.quadOn(g, [W(-wHalf,-T2s/2,streetZ), W(0,-T2s/2,streetZ),
                      W(0,T2s/2,streetZ), W(-wHalf,T2s/2,streetZ)], 0xb5afa2);
      this.edgeOn(g, [W(-wHalf,-T2s/2,streetZ), W(0,-T2s/2,streetZ),
                      W(0,T2s/2,streetZ), W(-wHalf,T2s/2,streetZ)], 0x968f81, 1.5);
      this.quadOn(g, [W(0,-T2s/2,streetZ), W(wHalf,-T2s/2,sidewalkZ),
                      W(wHalf,T2s/2,sidewalkZ), W(0,T2s/2,streetZ)], 0xb5afa2);
      this.edgeOn(g, [W(0,-T2s/2,streetZ), W(wHalf,-T2s/2,sidewalkZ),
                      W(wHalf,T2s/2,sidewalkZ), W(0,T2s/2,streetZ)], 0x968f81, 1.5);
      // ADA pad: the flat landing tile, dome-textured — street-facing end
      this.quadOn(g, [W(-wHalf,-T2s/2,streetZ), W(0,-T2s/2,streetZ),
                      W(0,T2s/2,streetZ), W(-wHalf,T2s/2,streetZ)], 0xf4c430);
      this.edgeOn(g, [W(-wHalf,-T2s/2,streetZ), W(0,-T2s/2,streetZ),
                      W(0,T2s/2,streetZ), W(-wHalf,T2s/2,streetZ)], 0xb9911f, 1.5);
      for(let ri=0; ri<5; ri++) for(let ci=0; ci<5; ci++){
        const py = -T2s/2 + T2s*(ri/4), px = -wHalf + wHalf*(ci/4);
        const p = W(px, py, streetZ);
        g.fillStyle(0xc9911f, 0.8);
        g.fillCircle(p.x, p.y, 1.5);
      }
    } else if(kind === "pigeons"){
      /* the flock — ported verbatim from labs/pigeon-lab.html (v5).
         Everything is seeded off the flock's WORLD anchor (x,y) and
         drawn through drawProp's local W, so the dv/rv frame rotation
         the lab's bench did by hand happens here by construction —
         correct at all 4 headings for free. data is the hazard object:
         data.fledAt (sim-stamped) drives the scatter burst. */
      const fledAt = (data && data.fledAt != null) ? data.fledAt : null;
      const fled = fledAt;
      if(fled !== null && t - fled > 2600){ /* long gone */ }
      else {
        const drawPigeon = (bx, by, b) => {
            const s = b.size;
            let px = bx + b.ox, py = by + b.oy, wing = 0, thB = b.th;
            let z = fled === null ? Math.abs(Math.sin(t*0.012 + b.flapPh))*0.6 : 0;   // waddle bob
            if(fled !== null){
              const ft = (t - fled)/1000;
              px += Math.cos(b.scatterA) * b.scatterV * 1000 * ft;
              py += Math.sin(b.scatterA) * b.scatterV * 1000 * ft;
              z = 14*ft + 90*ft*ft;                            // up and accelerating away
              wing = Math.sin(t*PIG.flapRate + b.flapPh);      // full beat
              thB = b.scatterA + Math.PI/2;                    // flies the way it flees
            }
            const c = Math.cos(thB), sn = Math.sin(thB);
            const L = (fx, fy, fz) => W(px + fx*c - fy*sn, py + fx*sn + fy*c, z + fz);
            const peck = fled === null ? Math.pow(Math.max(0, Math.sin(t*b.peckRate + b.peckPh)), 6) : 0;
        
            /* shadow — shrinks and fades as the bird climbs */
            const shA = Math.max(0, 0.16 - z*0.0016);
            if(shA > 0.01){
              const sh = []; for(let i=0;i<8;i++){ const a=(i/8)*Math.PI*2;
                sh.push(W(px + Math.cos(a)*7*s, py + Math.sin(a)*5*s, 0.4)); }
              this.quadOn(g, sh, PIG.shadow, shA);
            }
            /* legs (grounded only) */
            if(fled === null){
              g.lineStyle(1.6, PIG.leg, 1);
              for(const ly of [-2.2, 2.2]){
                const a1 = L(-1, ly, 2.4), a2 = L(-1, ly, 0);
                g.lineBetween(a1.x, a1.y, a2.x, a2.y);
              }
            }
            /* ---------- the HULL: a tapered volumetric loaf, mini-drawBox style ----------
               Real faces with backface culling instead of stacked flat planes:
               top strip (back plumage), two side flanks, the lit breast face at
               the front, and the tail-end face. Visibility per face is the same
               projection-exact test the game's boxes use — local normal rotated
               by the bird's facing, summed against the iso view axis. */
            const B = PIG.bodyL*s, H = PIG.bodyH*s;
            const c2 = Math.cos(thB), s2 = Math.sin(thB);
            const vis = (nx, ny) => (nx*c2 - ny*s2) + (nx*s2 + ny*c2) > 0;
            /* corner frame: chest end high and narrow-ish, tail end lower/wider */
            const FT = B*0.45, FB = B*0.5, RT = -B*0.42, RB = -B*0.55;
            const yFT = 2.1*s, yFB = 2.9*s, yRT = 2.5*s, yRB = 3.4*s;
            const zT = 2 + H, zTr = 2 + H*0.85, zB = 2, zBr = 2.4;
            /* far-to-near face order: rear, far-side handled by culling, top, near side, chest */
            if(vis(-1, 0))
              this.quadOn(g, [L(RB,-yRB,zBr), L(RB,yRB,zBr), L(RT,yRT,zTr), L(RT,-yRT,zTr)], b.pal.wing);
            for(const side of [-1, 1]){
              if(!vis(0, side)) continue;
              /* flank */
              this.quadOn(g, [L(FB,side*yFB,zB), L(FT,side*yFT,zT), L(RT,side*yRT,zTr), L(RB,side*yRB,zBr)], b.pal.body);
              /* folded WING: a raised panel lying on the flank — pushed outboard
                 and inset from the body outline, so it reads as a wing resting
                 on the body instead of a painted seam */
              if(fled === null)
                this.quadOn(g, [L(FT*0.7, side*(yFT+0.9), zT - H*0.15),
                           L(FT*0.2, side*(yFB+0.9), zB + H*0.45),
                           L(RB*0.92, side*(yRB+0.7), zBr + H*0.25),
                           L(RT*0.95, side*(yRT+0.9), zTr - H*0.1)], b.pal.wing);
            }
            /* top strip — the back */
            this.quadOn(g, [L(FT,-yFT,zT), L(FT,yFT,zT), L(RT,yRT,zTr), L(RT,-yRT,zTr)], b.pal.body);
            /* the lit breast face */
            if(vis(1, 0))
              this.quadOn(g, [L(FB,-yFB,zB), L(FB,yFB,zB), L(FT,yFT,zT), L(FT,-yFT,zT)], b.pal.breast);
            /* tail: dark fan off the tail-end top edge, twitches at rest */
            const tw = fled === null ? Math.sin(t*0.004 + b.peckPh)*0.6 : 0;
            this.quadOn(g, [L(RT,-1.8*s,zTr), L(-B*1.05, (-1.2+tw)*s, zTr + 0.8),
                       L(-B*1.05, (1.2+tw)*s, zTr + 0.8), L(RT,1.8*s,zTr)], b.pal.wing);
            /* flight wings: two segments each with a dihedral BEND — inner panel
               rises to a mid joint, outer panel continues to the tip at extra
               lift, both riding the flap, so the beat reads as a folding 3D
               wing instead of a flapping triangle */
            if(fled !== null){
              const spread = 10*s + wing*7*s, lift = 3 + Math.abs(wing)*5;
              for(const side of [-1, 1]){
                const shF = L(FT*0.7, side*yFT, zT - 0.5), shR = L(RT*0.8, side*yRT, zTr - 0.5);
                const midF = L(B*0.28, side*spread*0.55, zT + lift*0.55);
                const midR = L(-B*0.42, side*spread*0.5, zTr + lift*0.5);
                const tip  = L(-B*0.1, side*spread, zT + lift + Math.abs(wing)*2);
                this.quadOn(g, [shF, midF, midR, shR], b.pal.wing);
                this.quadOn(g, [midF, tip, midR], b.pal.body);   // outer panel catches light
              }
            }
            /* head: dark knob; peck dips it forward and down */
            const hx = B*0.5 + 2.1*s + peck*3.5*s, hz = 2 + H + 2.3*s - peck*5*s;
            const hs = 3.1*s;
            /* the NECK — a tapered dark quad from the body's shoulder up to the
               head base, drawn before the head so the knob caps it. Follows the
               peck (its far end IS the head anchor), so it stretches and bows
               into every dip instead of the head detaching. */
            this.quadOn(g, [L(B*0.3, -2.4*s, 2+H*0.8), L(hx - hs*0.2, -1.7*s, hz - hs*0.35),
                       L(hx - hs*0.2,  1.7*s, hz - hs*0.35), L(B*0.3,  2.4*s, 2+H*0.8)], b.pal.head);
            this.quadOn(g, [L(B*0.3, -2.4*s, 2+H*0.5), L(hx - hs*0.2, -1.7*s, hz - hs*0.8),
                       L(hx - hs*0.2, -1.7*s, hz - hs*0.35), L(B*0.3, -2.4*s, 2+H*0.8)], b.pal.head);
            this.quadOn(g, [L(B*0.3,  2.4*s, 2+H*0.5), L(hx - hs*0.2,  1.7*s, hz - hs*0.8),
                       L(hx - hs*0.2,  1.7*s, hz - hs*0.35), L(B*0.3,  2.4*s, 2+H*0.8)], b.pal.head);
            const hd = []; for(let i=0;i<8;i++){ const a=(i/8)*Math.PI*2;
              hd.push(L(hx + Math.cos(a)*hs, Math.sin(a)*hs, hz + Math.sin(a)*hs*0.4)); }
            this.quadOn(g, hd, PIG.head);
            /* the iridescent neck fleck */
            this.quadOn(g, [L(hx-hs*0.9,-1.4*s,hz-1.6), L(hx-hs*0.2,-1.1*s,hz-1.2),
                       L(hx-hs*0.2,1.1*s,hz-1.2), L(hx-hs*0.9,1.4*s,hz-1.6)], PIG.neck);
            /* beak tick + eye */
            this.quadOn(g, [L(hx+hs*0.8,-0.8*s,hz), L(hx+hs*1.7,0,hz-0.6*s - peck*1.2), L(hx+hs*0.8,0.8*s,hz)], PIG.beak);
            const eye = L(hx + hs*0.35, -hs*0.75, hz + hs*0.35);
            g.fillStyle(PIG.eye, 1); g.fillCircle(eye.x, eye.y, 1.3*s*this.K*0.8);   // K is scene state in-game (lab had it module-level)
        };
        const birds = flockBirds(x, y);
        const placedB = birds.map(b => {
          const wo = birdWanderAt(b, t);
          return { b: { ...b, ox: b.ox + wo.x, oy: b.oy + wo.y, th: wo.th },
                   d: (b.ox + wo.x)*(dv.x + dv.y) + (b.oy + wo.y)*(rv.x + rv.y) };
        }).sort((a2, b2) => a2.d - b2.d);
        for(const p of placedB) drawPigeon(0, 0, p.b);
      }
    } else if(kind === "grade"){
      /* grade chevrons — flat road-paint on the walk marking a steep
         stretch of the virtual grade profile. Three nested V's pointing
         DOWNhill (data.dir: +1 = downhill along +dv, -1 = reversed),
         same warning-yellow family as the ADA pads so "yellow paint =
         terrain talking to you" stays one visual language. Pure paint:
         z=0, no volume, no physics (skipped in the sim loop), pinned
         under the robot like the ramps. Two leg quads per V, all
         through W() — correct in all 4 headings by construction. */
      const dir = (data && data.dir) || 1;
      const paint = 0xf4c430, edge = 0xb9911f;
      for(let k = -1; k <= 1; k++){
        const bx = k*30, tip = bx + 15, tail = bx - 13, thick = 7;
        for(const side of [-1, 1]){
          const q = [
            W(dir*tip,           0,       0),
            W(dir*(tip - thick), 0,       0),
            W(dir*(tail - thick), side*22, 0),
            W(dir*tail,           side*22, 0)];
          this.quadOn(g, q, paint, 0.9);   // 4th arg is ALPHA in quadOn — slight fade reads as paint
          this.edgeOn(g, q, edge, 0.8);
        }
      }
    } else if(kind === "sidewalkbeginTurn"){
      /* approved in sidewalkendturn lab: the full junction — curb ramp
         down, a wide arc turn onto a new heading, curb ramp back up.
         Full 1:1 geometry (the actual arc, the second road crossing)
         is many tiles across — too large for a gallery card, so this
         is a compact L-shaped diorama: down ramp, a corner tile
         standing in for the turn, up ramp rotated 90°. Same slope/pad
         technique as prop.sidewalkend, used twice. Static visual only,
         no physics — built + physics-tested in
         labs/sidewalkendturn-lab.html, not yet ported into the game. */
      const T2s = TILE*2, wHalf = 92, crossHalf = 1.5*T2s;
      const sidewalkZ = 2, streetZ = -3;

      // DOWN ramp — identical to prop.sidewalkend, anchored at origin
      this.quadOn(g, [W(-wHalf,-crossHalf,sidewalkZ), W(wHalf,-crossHalf,sidewalkZ),
                      W(wHalf,crossHalf,sidewalkZ), W(-wHalf,crossHalf,sidewalkZ)], 0xb5afa2);
      this.edgeOn(g, [W(-wHalf,-crossHalf,sidewalkZ), W(wHalf,-crossHalf,sidewalkZ),
                      W(wHalf,crossHalf,sidewalkZ), W(-wHalf,crossHalf,sidewalkZ)], 0x968f81, 2);
      this.quadOn(g, [W(-wHalf,-T2s/2,sidewalkZ), W(0,-T2s/2,streetZ),
                      W(0,T2s/2,streetZ), W(-wHalf,T2s/2,sidewalkZ)], 0xb5afa2);
      this.quadOn(g, [W(0,-T2s/2,streetZ), W(wHalf,-T2s/2,streetZ),
                      W(wHalf,T2s/2,streetZ), W(0,T2s/2,streetZ)], 0xb5afa2);
      this.quadOn(g, [W(0,-T2s/2,streetZ), W(wHalf,-T2s/2,streetZ),
                      W(wHalf,T2s/2,streetZ), W(0,T2s/2,streetZ)], 0xf4c430);
      this.edgeOn(g, [W(0,-T2s/2,streetZ), W(wHalf,-T2s/2,streetZ),
                      W(wHalf,T2s/2,streetZ), W(0,T2s/2,streetZ)], 0xb9911f, 1.5);
      for(let ri=0; ri<5; ri++) for(let ci=0; ci<5; ci++){
        const py = -T2s/2 + T2s*(ri/4), px = wHalf*(ci/4);
        const p = W(px, py, streetZ);
        g.fillStyle(0xc9911f, 0.8);
        g.fillCircle(p.x, p.y, 1.5);
      }

      // CORNER: a road-colored square standing in for the arc turn
      const cx = wHalf + 46, cy = 0;
      this.quadOn(g, [W(cx-46,cy-46,streetZ), W(cx+46,cy-46,streetZ),
                      W(cx+46,cy+46,streetZ), W(cx-46,cy+46,streetZ)], 0x4a4d55);

      // UP ramp — rotated 90°: Wup swaps dx/dy roles, anchored off the corner
      const Wup = (dx, dy, dz) => W(cx+46+dy, cy+dx, dz);
      this.quadOn(g, [Wup(-wHalf,-crossHalf,sidewalkZ), Wup(wHalf,-crossHalf,sidewalkZ),
                      Wup(wHalf,crossHalf,sidewalkZ), Wup(-wHalf,crossHalf,sidewalkZ)], 0xb5afa2);
      this.edgeOn(g, [Wup(-wHalf,-crossHalf,sidewalkZ), Wup(wHalf,-crossHalf,sidewalkZ),
                      Wup(wHalf,crossHalf,sidewalkZ), Wup(-wHalf,crossHalf,sidewalkZ)], 0x968f81, 2);
      this.quadOn(g, [Wup(-wHalf,-T2s/2,streetZ), Wup(0,-T2s/2,streetZ),
                      Wup(0,T2s/2,streetZ), Wup(-wHalf,T2s/2,streetZ)], 0xf4c430);
      this.edgeOn(g, [Wup(-wHalf,-T2s/2,streetZ), Wup(0,-T2s/2,streetZ),
                      Wup(0,T2s/2,streetZ), Wup(-wHalf,T2s/2,streetZ)], 0xb9911f, 1.5);
      for(let ri=0; ri<5; ri++) for(let ci=0; ci<5; ci++){
        const py = -T2s/2 + T2s*(ri/4), px = -wHalf + wHalf*(ci/4);
        const p = Wup(px, py, streetZ);
        g.fillStyle(0xc9911f, 0.8);
        g.fillCircle(p.x, p.y, 1.5);
      }
      this.quadOn(g, [Wup(0,-T2s/2,streetZ), Wup(wHalf,-T2s/2,sidewalkZ),
                      Wup(wHalf,T2s/2,sidewalkZ), Wup(0,T2s/2,streetZ)], 0xb5afa2);
    } else if(kind === "crack"){
      /* approved in crack lab v3: broken-off piece (spall). A jagged
         fracture runs between two seeded points on the tile boundary;
         everything between fracture and boundary is a broken-off
         piece, sunken below grade — corner break-offs and edge bites
         fall out of the same code depending where the seeds land.
         Per-instance: size (hz.len from the generator, or seeded),
         raggedness, branch count, drop depth. Palette follows the
         explicit surface tag set at generation time — sidewalk cracks
         (from the sidewalk hazard loop) always get sidewalk tones,
         road cracks (from the decorative road-crack loop) always get
         asphalt tones. The old data.row>=2 guess was wrong both ways:
         sidewalk cracks in lanes 2-3 got asphalt tones, and road
         cracks (which never had a `row` field at all) fell through
         to sidewalk tones by default. */
      const seed = ((Math.round(x)*7919) ^ (Math.round(y)*104729) ^ 0x3c99) >>> 0;
      const rng = mulberry32(seed);
      const pal = (data && data.surface === "road") ? CRACK_ART.road : CRACK_ART.sidewalk;
      const len = (data && data.len) || (24 + Math.floor(rng()*49));
      const jag = 0.6 + rng()*1.0;
      const nBr = 1 + Math.floor(rng()*3);
      const drop = 3.3 + rng()*2.2;
      const T = TILE - 2, ZT = 0.5;
      const arc = 0.4 + (len/84) * 1.4;
      const bite = Math.min(58, 10 + len*0.5);

      const perim = tv => {
        tv = ((tv % 4) + 4) % 4;
        const e = Math.floor(tv), u = tv - e;
        if(e === 0) return { x:-T + 2*T*u, y:-T };
        if(e === 1) return { x: T, y:-T + 2*T*u };
        if(e === 2) return { x: T - 2*T*u, y: T };
        return { x:-T, y: T - 2*T*u };
      };
      const tA = rng()*4, tB = tA + arc;
      const A = perim(tA), B = perim(tB);

      /* fracture path A->B, pulled inward by the bite, seeded jitter */
      const N = Math.max(5, 4 + Math.round(len/10));
      const frac = [];
      for(let i=0; i<=N; i++){
        const u = i/N;
        let fx = A.x + (B.x - A.x)*u, fy = A.y + (B.y - A.y)*u;
        const inward = Math.pow(Math.sin(Math.PI*u), 0.8) * bite;
        const mag = Math.hypot(fx, fy) || 1;
        fx -= (fx/mag) * inward;
        fy -= (fy/mag) * inward;
        if(i > 0 && i < N){
          fx += (rng()-0.5) * 9 * jag;
          fy += (rng()-0.5) * 9 * jag;
        }
        frac.push({ x: Math.max(-T, Math.min(T, fx)),
                    y: Math.max(-T, Math.min(T, fy)) });
      }

      /* piece region: fracture + boundary walk back B->A */
      const bound = [];
      for(let c2 = Math.ceil(tA); c2 < tB; c2++) bound.push(perim(c2));
      const region = frac.concat([B]).concat(bound.reverse());

      /* sunken piece top */
      this.quadOn(g, region.map(p => W(p.x, p.y, ZT - drop)), pal.piece);
      this.edgeOn(g, region.map(p => W(p.x, p.y, ZT - drop)), pal.core, 1);

      /* hairline across the piece itself when it's big */
      if(bite > 26){
        const m0 = frac[Math.floor(N*0.3)], m1 = frac[Math.floor(N*0.7)];
        g.lineStyle(1, pal.core, 0.9);
        const q0 = W(m0.x*0.6, m0.y*0.6, ZT - drop + 0.1);
        const q1 = W(m1.x*0.9, m1.y*0.9, ZT - drop + 0.1);
        g.lineBetween(q0.x, q0.y, q1.x, q1.y);
      }

      /* rubble chips on the piece near the break */
      const nCh = 3 + Math.floor(rng()*3);
      for(let i=0; i<nCh; i++){
        const fp = frac[1 + Math.floor(rng()*(N-1))];
        const p = W(fp.x*(0.82 + rng()*0.1), fp.y*(0.82 + rng()*0.1), ZT - drop + 0.3);
        g.fillStyle(rng() < 0.5 ? pal.crack : pal.rubble, 0.95);
        g.fillEllipse(p.x, p.y, (2 + rng()*3.5)*this.K*0.5, (1.2 + rng()*2)*this.K*0.5);
      }

      /* exposed fracture wall: the intact slab's broken face */
      for(let i=0; i<frac.length-1; i++){
        const a2 = frac[i], b2 = frac[i+1];
        this.quadOn(g, [
          W(a2.x, a2.y, ZT), W(b2.x, b2.y, ZT),
          W(b2.x, b2.y, ZT - drop), W(a2.x, a2.y, ZT - drop)
        ], i % 2 ? pal.core : pal.wall);
      }

      /* ragged lip along the fracture at top level */
      g.lineStyle(1.4, pal.crack, 1);
      g.beginPath();
      const l0 = W(frac[0].x, frac[0].y, ZT);
      g.moveTo(l0.x, l0.y);
      for(let i=1; i<frac.length; i++){
        const q = W(frac[i].x, frac[i].y, ZT);
        g.lineTo(q.x, q.y);
      }
      g.strokePath();

      /* hairlines radiating into the intact slab */
      for(let b=0; b<nBr; b++){
        const i0 = 1 + Math.floor(rng()*(N-1));
        let bx = frac[i0].x, by = frac[i0].y;
        const mag = Math.hypot(bx, by) || 1;
        let ba = Math.atan2(-by/mag, -bx/mag) + (rng()-0.5)*1.4;
        let bl = 5 + rng()*8;
        for(let k=0; k<3; k++){
          const nx2 = Math.max(-T, Math.min(T, bx + Math.cos(ba)*bl));
          const ny2 = Math.max(-T, Math.min(T, by + Math.sin(ba)*bl));
          g.lineStyle(Math.max(0.8, (1.5 - k*0.45)*this.K*0.4), pal.crack, 0.95);
          const p1 = W(bx, by, ZT), p2 = W(nx2, ny2, ZT);
          g.lineBetween(p1.x, p1.y, p2.x, p2.y);
          bx = nx2; by = ny2;
          ba += (rng()-0.5)*1.2*jag;
          bl *= 0.6;
        }
      }
    }
  }

  /* ---------- robot (approved sprite, driving) ---------- */
  drawRobot(t, dt){
    const g = this.g; g.clear();

    /* house door hinge: opens once the route is won, and swings shut
       again once the customer is carrying the bag back through it
       (wonWalk past the door-plane crossing) — eases every frame
       independent of sim state (same DOOR_ART.openEase rate approved
       in the door lab) */
    const doorTarget = (this.state === "won" && (this.wonWalk || 0) < 0.55) ? DOOR_ART.openAngle : 0;
    this.doorTheta += (doorTarget - this.doorTheta) * DOOR_ART.openEase;
    if(Math.abs(doorTarget - this.doorTheta) < 0.002) this.doorTheta = doorTarget;

    /* pickup timeline: GO -> [loading phase: lid opens, worker lifts
       and places a bag, lid closes] -> [walk phase: existing 2s
       walk-back + shop door open/close]. The walk phase doesn't start
       counting until loading actually finishes — previously the walk
       timer fired the instant "go" was pressed, leaving no room for
       a loading beat. loadT/loadFrac driven by this.runT (real
       elapsed ms only while state==="play"), same frame-rate-
       independent approach as PICKUP_ART.walkMs already used. */
    let loadFrac = 0;
    if(this.state === "play"){
      const loadT = this.runT;
      loadFrac = Phaser.Math.Clamp(loadT / LOAD_ART.ms, 0, 1);
      this.loadDone = loadT >= LOAD_ART.ms;
      /* persistent latch for the spill: loadDone itself is VOLATILE —
         the else branch below wipes it the instant state leaves "play",
         and spillCargo fires frames AFTER state becomes "tipped", so
         gating the spilled bag on loadDone always missed. This flag
         survives the state change; spillCargo consumes it. */
      if(this.loadDone) this.bagOnBoard = true;
      if(this.loadDone){
        if(this.walkAt === null) this.walkAt = this.runT;
        /* duration from the REAL walk distance (meet point -> past the
           door plane) at the standard 0.11 u/ms pace — the fixed
           walkMs was tuned for the old short dy and would sprint the
           longer meet-to-door return. */
        let backMs = PICKUP_ART.walkMs;
        if(this.route.pickupSpot && this.pickupDoorDV){
          const dpx = this.pickupDoorUX + this.pickupDoorDV.x*this.pickupDoorCenterX;
          const dpy = this.pickupDoorUY + this.pickupDoorDV.y*this.pickupDoorCenterX;
          let bvx = this.route.pickupSpot.x - dpx, bvy = this.route.pickupSpot.y - dpy;
          const bd = Math.hypot(bvx, bvy) || 1;
          const mx = this.route.pickupSpot.x - bvx/bd*12, my = this.route.pickupSpot.y - bvy/bd*12;
          const bx2 = dpx - this.pickupDoorRV.x*30, by2 = dpy - this.pickupDoorRV.y*30;
          backMs = Math.max(400, Math.hypot(mx - bx2, my - by2) / 0.11);
        }
        this.pickupWalk = Phaser.Math.Clamp(1 - (this.runT - this.walkAt)/backMs, 0, 1);
      } else {
        this.walkAt = null;
        this.pickupWalk = 1; // still idle at the robot during loading
      }
    } else {
      this.loadDone = false; this.walkAt = null;
      this.pickupWalk = 1;
    }

    /* ---------- dropoff handoff timeline: the pickup's loading phase
       mirrored (dial choreography shared via LOAD_ART so both handoffs
       read as the same beat). won -> [customer walks out, driven by
       doorTheta exactly as before] -> [lid opens, bag rises out of the
       bin and arcs to the customer's raised hand, lid closes, he holds
       it]. The clock only starts once he's actually arrived at the mat
       (doorTheta nearly fully open — walkT and the door share that
       driver), so the bag never launches at a customer who's still in
       the doorway. showWin is untouched: the overlay fires immediately
       and this plays out underneath it. */
    if(this.state === "won"){
      /* the MEET POINT: the customer now walks all the way to the
         robot, not just to the mat's edge — straight line from the
         door to wherever the robot actually stopped (the win window
         allows ~94 units of s-slop plus any lane, so this is a real
         vector, correct in all 4 headings), stopping 35 units short so
         he stands facing the bin. Robot is frozen in "won", so these
         are stable frame to frame. Recomputed cheaply each frame
         because the door anchors (addrDoor*) are only refreshed by the
         world draw. */
      if(this.addrDoorDV){
        const ddv = this.addrDoorDV, drv = this.addrDoorRV;
        const doorX = this.addrDoorUX + ddv.x*this.addrDoorCenterX;
        const doorY = this.addrDoorUY + ddv.y*this.addrDoorCenterX;
        let vx = this.botX - doorX, vy = this.botY - doorY;
        const dist = Math.hypot(vx, vy) || 1; vx /= dist; vy /= dist;
        this.wonDoor = { x: doorX, y: doorY };
        this.wonMeet = { x: this.botX - vx*35, y: this.botY - vy*35 };
        this.wonMeetTh = Math.atan2(vy, vx) - Math.PI/2;  // faces the robot along the real approach
        this.wonApproachDist = dist;
      }
      /* walk-out: his own clock at constant pace (the pickup worker's
         ~0.11 units/ms), duration proportional to the actual distance —
         riding the door angle like before would make a far-parked robot
         look like a sprint. Steps out once the door is half open. */
      const WON_WALK_SPEED = 0.11;
      if(this.wonMeet){
        const sx = this.wonDoor.x + this.addrDoorRV.x*4, sy = this.wonDoor.y + this.addrDoorRV.y*4;
        const outLen = Math.max(1, Math.hypot(this.wonMeet.x - sx, this.wonMeet.y - sy));
        if(this.doorTheta >= DOOR_ART.openAngle * 0.5) this.wonOutT = (this.wonOutT || 0) + dt;
        this.wonOutFrac = Math.min(1, (this.wonOutT || 0) / (outLen / WON_WALK_SPEED));
      }
      /* handoff clock: gated on ARRIVAL at the meet point now (not the
         door angle) — and once started it never re-gates, since the
         door closes during the walk-back and re-checking would freeze
         the timeline mid-walk. */
      if((this.wonT || 0) > 0 || (this.wonOutFrac || 0) >= 1)
        this.wonT = (this.wonT || 0) + dt;
      this.wonFrac = Phaser.Math.Clamp((this.wonT || 0) / LOAD_ART.ms, 0, 1);
      /* receiving arm: rises through the bag's flight so full reach
         lands exactly when the bag does, then eases back down with the
         bag locked to the hand (drops with him into a natural carry) */
      if(this.wonFrac <= LOAD_ART.holdEnd) this.wonLiftT = 0;
      else if(this.wonFrac < LOAD_ART.dropFrac)
        this.wonLiftT = (this.wonFrac - LOAD_ART.holdEnd) / (LOAD_ART.dropFrac - LOAD_ART.holdEnd);
      else this.wonLiftT = Math.max(0, (this.wonLiftT || 0) - dt/600);
      /* walk-back: once the handoff has fully settled, he carries it
         inside at the same pace — duration from the real return
         distance (meet -> just past the door plane). */
      const settled = this.wonFrac >= 1 && this.wonLiftT <= 0.01;
      if(settled && this.wonWalkAt == null) this.wonWalkAt = this.wonT;
      let backMs = PICKUP_ART.walkMs;
      if(this.wonMeet){
        /* must match queueHousingEdgeAt's backDist exactly, or this
           duration calc budgets the wrong distance and he covers the
           real (gate-mode) distance at the wrong speed — confirmed
           on-device: this is what caused the "sprinting" walk-back. */
        const backDist = (this.route && this.route.addressUsesGate) ? GATE_WALKOFF_DIST : 24;
        const bx = this.wonDoor.x - this.addrDoorRV.x*backDist, by = this.wonDoor.y - this.addrDoorRV.y*backDist;
        backMs = Math.max(400, Math.hypot(this.wonMeet.x - bx, this.wonMeet.y - by) / WON_WALK_SPEED);
      }
      this.wonWalk = this.wonWalkAt == null ? 0
        : Phaser.Math.Clamp((this.wonT - this.wonWalkAt) / backMs, 0, 1);
    } else { this.wonT = 0; this.wonFrac = 0; this.wonLiftT = 0; this.wonWalkAt = null; this.wonWalk = 0;
             this.wonOutT = 0; this.wonOutFrac = 0; this.wonMeet = null; }

    /* cargo lid: opens early in the loading phase, closes again once
       the bag has dropped in — reuses the existing lidAng hinge
       (normally driven by the tip/spill state machine below, gated on
       state==="tipped" so the two never fight), just with a plain
       open/close target instead of the tip/spill's asymmetric ones.
       lidHingeFlip used to be gated on state==="play" alone, which is
       the whole drive, not just this beat — it leaked into the "crack
       the lid open when cornering gets risky" effect further down,
       which writes to this same lidAng but should use the tip/spill's
       fixed hinge.
       Tying it directly to loadingLidOpen fixed that but broke the
       close-out: lidAng EASES toward its target (LOAD_ART.lidEase),
       it doesn't snap, so the instant loadingLidOpen goes false the
       lid is still most of the way open (confirmed: still 0.42 rad
       the same frame, 0.35 rad the next) — flipping the hinge right
       then swaps which side it's swinging from while still visibly
       open. pickupLidClosing latches true for the whole time we owe
       that close-out, and only releases once lidAng has actually
       eased under 0.15 (lidNear()'s own "basically closed" bar) — a
       latch instead of a raw lidAng>=0.15 check specifically so the
       cornering-crack effect, which opens this same lidAng for an
       unrelated reason, can't re-trigger it: the latch only ever gets
       set by loadingLidOpen itself, never by lidAng's value alone. */
    const loadingLidOpen = this.state === "play" && loadFrac > 0.05 && loadFrac < LOAD_ART.dropFrac;
    const lidLoadTarget = loadingLidOpen ? LOAD_ART.lidOpenAngle : 0;
    if(loadingLidOpen) this.pickupLidClosing = true;
    else if(this.lidAng < 0.02) this.pickupLidClosing = false;
    /* 0.02 rad (~1 degree), NOT the old 0.15 (~8.5 degrees): the hinge
       mirrors the instant this latch releases, and at 0.15 the lid was
       still visibly open — the reported "switches the hinge to the
       other side" pop. At 0.02 the swap is invisible. (0.15 was
       borrowed from lidNear's draw-order bar, which has nothing to do
       with hinge correctness.) */
    /* won-handoff lid: same hinge, same open target, same close-out
       latch pattern as the loading phase above — gated on state==="won"
       so it can never fight the loading driver (play), the tip/spill
       writer (tipped), or the cornering-crack effect (play). Opens
       while the bag is still in the bin, closes once it's out. */
    const wonLidOpen = this.state === "won" && this.wonFrac > 0.02 && this.wonFrac < LOAD_ART.dropFrac;
    if(wonLidOpen) this.wonLidClosing = true;
    else if(this.lidAng < 0.02) this.wonLidClosing = false;   // same invisible-swap bar as the pickup latch
    this.lidHingeFlip = (this.state === "play" && (loadingLidOpen || this.pickupLidClosing))
                     || (this.state === "won" && (wonLidOpen || this.wonLidClosing));
    if(this.state === "play"){
      this.lidAng += (lidLoadTarget - this.lidAng) * LOAD_ART.lidEase;
      if(Math.abs(lidLoadTarget - this.lidAng) < 0.002) this.lidAng = lidLoadTarget;
    } else if(this.state === "won"){
      const lidWonTarget = wonLidOpen ? LOAD_ART.lidOpenAngle : 0;
      this.lidAng += (lidWonTarget - this.lidAng) * LOAD_ART.lidEase;
      if(Math.abs(lidWonTarget - this.lidAng) < 0.002) this.lidAng = lidWonTarget;
    }

    /* rise -> hold -> release: the carrying arm starts at his side
       (liftT=0, natural rest), pivots up through RISE_END, holds
       briefly, then eases back down while the bag detaches and
       continues on its own arc to the bin. Stored on this so
       drawPickupUnit (called separately) can read the same values. */
    const RISE_END = LOAD_ART.riseEnd, HOLD_END = LOAD_ART.holdEnd, RELEASE_END = LOAD_ART.releaseEnd;
    this.pickupLiftT = 0; this.pickupReleased = false;
    if(this.state === "play"){
      if(this.loadDone){ this.pickupLiftT = 0; this.pickupReleased = true; }
      else if(loadFrac <= RISE_END) this.pickupLiftT = loadFrac / RISE_END;
      else if(loadFrac <= HOLD_END) this.pickupLiftT = 1;
      else { this.pickupLiftT = Math.max(0, 1 - (loadFrac-HOLD_END)/(RELEASE_END-HOLD_END)); this.pickupReleased = true; }
    }
    this.pickupLoadFrac = loadFrac;

    /* shop door: opens while he's still walking toward it, starts
       closing the instant he arrives (pickupWalk hits 0) — NOT just
       tracking state==="play" directly, which would open it once and
       leave it open for the rest of the route instead of it actually
       swinging shut behind him. */
    const shopDoorTarget = (this.state === "play" && this.loadDone && this.pickupWalk > 0) ? SHOPDOOR_ART.openAngle : 0;
    this.doorSwing += (shopDoorTarget - this.doorSwing) * SHOPDOOR_ART.openEase;
    if(Math.abs(shopDoorTarget - this.doorSwing) < 0.002) this.doorSwing = shopDoorTarget;

    /* ---------- simulation ---------- */
    if(this.state === "play"){
      const _botS_frameStart = this.botS;   // debug: for the backward-motion assertion below
      this.runT += dt;

      /* throttle / brake / hill gravity / friction */
      const slope = this.groundSlope(this.botS);          // + uphill
      if(this.throttle === 1) this.speed += 0.00028*dt;
      if(this.throttle === -1) this.speed -= 0.00050*dt;
      this.speed -= slope * 0.00030 * dt;                 // gravity
      this.speed -= this.speed * 0.0009 * dt;             // rolling friction
      this.speed = Phaser.Math.Clamp(this.speed, 0, 0.15);
      /* ground-speed correction (ported from the corner+robot lab): botS
         parameterizes the CENTERLINE arc length, but the robot draws
         offset sideways by laneOff. On an arc, the robot's actual traced
         radius is (R - seg.sign*laneOff) — smaller toward the turn's
         inside (crawls), larger toward the outside (speeds up) — a
         5x-30x real ground-speed difference between turn directions at a
         fixed lane, purely from parameterizing by the wrong arc length.
         Scale botS's advance by (R / effectiveR) so actual ground speed
         matches the throttle-controlled speed regardless of which way
         the lane sits relative to the curve. */
      const _preSeg = this.segAt(this.botS);
      let _stretch = 1;
      if(_preSeg.type === "arc"){
        const _effR = _preSeg.R - _preSeg.sign*this.laneOff;
        _stretch = Phaser.Math.Clamp(_effR / _preSeg.R, 0.05, 20);
      }
      this.botS += (this.speed/_stretch) * dt;
      this.wheelPhase -= this.speed * dt * 0.28;

      /* corners: Tipsy turns himself — centrifugal lean (∝ v²) is YOUR problem */
      const seg = this.segAt(this.botS);
      /* cornering lean reacts to this SMOOTHED speed, not raw this.speed —
         reapplying throttle after coasting/braking mid-corner used to spike
         tilt instantly (confirmed: coast ~1s then punch it spiked tilt
         0.263->0.924 and tipped within another second), since raw speed can
         rise much faster than the tilt spring can react. Steady cornering
         (the common case) tracks actual speed closely within a couple
         hundred ms and is unaffected; a sudden speed spike now takes a
         moment to reach the lean formula, giving the spring room to keep up
         instead of getting outrun. */
      this.corneringSpeedSmooth = Phaser.Math.Linear(this.corneringSpeedSmooth, this.speed, Math.min(1, 0.0018*dt));
      /* cornering-lean sensitivity tapers off as you get further through
         the turn — full strength for the first 40% (still risky to gun it
         right from turn entry, that's intentional and unchanged), easing
         down to 35% by the exit. This is the direct fix for "tipping
         should be way less once you're past the curve" — the speed
         smoothing above only softens a sudden reflex-correction spike, it
         can't by itself prevent a tip if the player just holds throttle
         long enough for the smoothed speed to catch up anyway. */
      const arcProgress = seg.type === "arc" ? Phaser.Math.Clamp((this.botS - seg.s0)/(seg.s1 - seg.s0), 0, 1) : 0;
      const tiltTaper = arcProgress < 0.4 ? 1 : Phaser.Math.Linear(1, 0.35, (arcProgress - 0.4)/0.6);
      if(seg.type === "arc") this.tilt += seg.sign * this.corneringSpeedSmooth * this.corneringSpeedSmooth * 0.115 * tiltTaper * dt;
      /* visual banking: only the INSIDE lane lifts wheels; center + outside stay flat.
         The sidewalk band sits entirely on ONE side of the street now (not
         straddling the centerline like the old 3-lane system), which means
         a whole turn direction puts the ENTIRE band either fully inside or
         fully outside — that's the dominant effect. Using deviation from
         the band's center (my earlier fix) only captured the smaller
         lane-to-lane gradient and got the dominant direction backwards.
         The full laneOff, normalized against the band's own max extent,
         captures both correctly: same sign convention the arc's own
         center offset uses (sign*rv*R), so sign*laneOff > 0 means the
         band is on the same side as the turn's center — i.e. inside. */
      const inside = seg.type === "arc"
        ? Phaser.Math.Clamp(seg.sign * this.laneOff / (ROAD_HALF + SIDEWALK_W), 0, 1) : 0;
      const leanTarget = seg.type === "arc"
        ? seg.sign * Math.min(this.speed/0.15, 1) * 0.32 * inside : 0;
      this.cornerLean = Phaser.Math.Linear(this.cornerLean, leanTarget, 0.07);

      /* crack the lid open once actually in tip danger — matches the HUD
         gauge's own red threshold (drawHUD: danger > 0.75) exactly, instead
         of a flat speed threshold that didn't track real risk (a wide
         outside turn at speed>0.11 has very low actual tilt; a tight
         inside turn is genuinely dangerous at that same speed) */
      const lidCrackTarget = Math.abs(this.tilt) > 0.75 ? 0.4 : 0;
      /* stand down while the pickup loading latch owns the lid: this
         writer runs every play frame, so during the loading phase it
         was FIGHTING the loading ease (open toward 1.1 in drawRobot,
         then Linear'd back toward 0 here, every single frame) — the
         lid ground to a half-open ~0.6 equilibrium instead of the
         dialed 1.1, on the flipped hinge, then popped hinges at the
         latch release. pickupLidClosing spans the loading open AND its
         close-out, so gating on it hands the lid back to this writer
         only once it's genuinely shut. */
      if(!this.pickupLidClosing)
        this.lidAng = Phaser.Math.Linear(this.lidAng, lidCrackTarget, 0.08);

      /* lane maneuver: eased diagonal glide with nose steer */
      if(this.hopAnim && seg.type === "arc"){
        /* a hop that was already in progress when the turn started —
           resolve it immediately instead of letting it keep swinging
           mid-arc, same reasoning as hop() refusing to start a new one. */
        this.laneOff = this.hopAnim.to;
        this.hopAnim = null; this.hopYaw = 0;
      }
      if(this.hopAnim){
        const HOP_MS = 480;
        const k = Phaser.Math.Clamp((this.time.now - this.hopAnim.start) / HOP_MS, 0, 1);
        const e = k*k*(3 - 2*k);                           // smoothstep
        this.laneOff = this.hopAnim.from + (this.hopAnim.to - this.hopAnim.from)*e;
        this.hopYaw = this.hopAnim.dir * 0.26 * Math.sin(Math.PI*k);
        if(k >= 1){ this.hopAnim = null; this.hopYaw = 0; }
      } else {
        this.hopYaw = Phaser.Math.Linear(this.hopYaw, 0, 0.2);
      }
      /* bleed the hop's stability cost in over ~0.3s */
      if(this.hopKick !== 0){
        const apply = this.hopKick * Math.min(1, dt/300);
        this.tilt += apply;
        this.hopKick -= apply;
        if(Math.abs(this.hopKick) < 0.002) this.hopKick = 0;
      }

      /* hazards: each one is the math problem */
      this.isBlocked = false;
      let slabUnder = null;
      /* botRow updates the INSTANT hop() is called, but the robot's
         actual visual position (laneOff) animates toward it over
         480ms. Using botRow directly for collision meant a hazard on
         the TARGET lane could hard-stop you the moment you started a
         hop, before you'd visually arrived — if your botS was already
         past where it'd stop you, that snapped you backward. This
         checks where the robot actually IS instead of where it's
         logically headed. */
      const onLane = row => Math.abs(this.laneOff - laneOffset(row)) < T2*0.5;
      /* defensive floor: no single hazard-triggered stop should ever move
         botS backward by more than the largest legitimate offset already
         in use (palm=30, hydrant=26, bin's own small creep). Whatever the
         exact trigger for the reported "reversing around the arc" turns
         out to be, this makes a LARGE backward jump structurally
         impossible regardless of cause, while leaving the small
         intentional wall-stop nudges untouched. */
      const safeStop = target => Math.max(target, this.botS - 60);
      for(const hz of this.route.hazards){
        /* curb ramps are static ground visuals for now — no tilt/pitch/
           curb physics wired yet (docs/DESIGN.md "Sidewalkend curb
           ramps"). Without this skip they'd fall through to the generic
           bump else-branch at the bottom of this chain and kick/damage
           the robot on every street crossing. hit:true at spawn is the
           belt to this suspender. */
        if(hz.type === "sidewalkend" || hz.type === "sidewalkbegin" || hz.type === "grade") continue;   // ramps + grade paint: no collision
        let dx = this.botS - hz.s;
        if(hz.type === "pigeons"){
          /* pure trigger: drive into the flock and it bursts. Generous
             cross window (the flock mills ±30 around its row); no
             damage, no tilt, ever — the scatter is the whole event. */
          if(hz.fledAt == null && Math.abs(dx) < 60 &&
             Math.abs(this.laneOff - laneOffset(hz.row)) < T2*1.3)
            hz.fledAt = this.time.now;
          continue;
        }
        /* the dog moves; his hitbox moves with him — same pure
           function the renderer uses, so art and impact agree */
        if(hz.type === "dog"){
          if(hz.hitT !== undefined){
            /* once settled (flee finished) he's parked at a fixed spot -
               dogSettledSpot, not the old time-based wander cycle, which
               would've drifted somewhere else entirely by now. Re-arm
               hz.hit so he can be startled again from wherever he's
               sitting, same as the first time. */
            const flee = dogFleeAt(t, hz);
            if(flee && !flee.gone) continue;   // still actively fleeing - no collision check yet
            hz.hit = false;
            dx -= dogSettledSpot(hz).a;
          } else {
            dx -= dogSpotAt(t, hz.dogSeed || 0, hz.sit).a;
          }
        }
        if(hz.type === "people"){
          /* same contract as the dog: his hitbox moves with him. While
             actively fleeing, no collision check; once settled, re-arm
             so they can be startled again from wherever they landed.
             Before ever being hit, track the same patrol wander the
             renderer uses via peopleSpotAt(). */
          if(hz.hitT !== undefined){
            const flee = peopleFleeAt(t, hz);
            if(flee && !flee.gone) continue;
            hz.hit = false;
            dx -= peopleSettledSpot(hz).a;
          } else {
            dx -= peopleSpotAt(t, hz.peopleSeed || 0).a;
          }
        }
        if(hz.type === "palm"){
          /* a trunk is a wall: you stop, you do not pass */
          if(onLane(hz.row) && this.botS > hz.s - 30 && this.botS < hz.s){
            this.botS = safeStop(hz.s - 30);
            this.isBlocked = true;
            if(this.speed > 0.035 && !hz.hit){
              hz.hit = true;                               // the bonk (once per approach)
              const kick = this.speed * 7 * (Math.random() < 0.5 ? 1 : -1);
              this.tilt += kick;
              this.damage = Math.min(95, this.damage + Math.abs(kick)*40);
            }
            this.speed = 0;
          }
          if(Math.abs(dx) > 40) hz.hit = false;            // re-arm after backing off
        } else if(hz.type === "slab"){
          /* heaved slab (approved in ramp lab v2): one sidewalk tile,
             lifted along one side edge (side ±1), flush at the other.
             Two-stage, physically ordered: (a) the wheels on the raised
             side climb the lip at the leading joint — one-shot roll
             kick toward the low side, ∝ speed × lift, so creeping over
             is the counterplay; (b) sustained cross-slope tilt while
             riding the wedge, continuous cross-slope tilt scaled by lift.
             Positive roll leans −dy, so side=+1 (road edge up) feeds
             tilt POSITIVE — falls toward the buildings. */
          if(onLane(hz.row)){
            if(!hz.lipHit && dx > -TILE && dx < -TILE + 14){
              hz.lipHit = true;
              const kick = hz.side * this.speed * hz.lift * 0.9;
              this.tilt += kick;
              this.damage = Math.min(95, this.damage + Math.abs(kick)*30);
            }
            if(Math.abs(dx) > TILE + 20) hz.lipHit = false; // re-arm after clearing it
            if(Math.abs(dx) < TILE){
              this.tilt += hz.side * this.speed * 0.030 * (hz.lift/5) * dt;
              slabUnder = hz;
            }
          }
        } else if(hz.type === "hydrant"){
          /* cast iron: a wall, same contract as the palm — you stop.
             Arriving fast adds the bonk; past the burst threshold the
             nozzle shears: water arc + a flood that grows around the
             base and stays wet for the rest of the route. */
          if(onLane(hz.row) && this.botS > hz.s - 26 && this.botS < hz.s){
            this.botS = safeStop(hz.s - 26);
            this.isBlocked = true;
            if(this.speed > 0.035 && !hz.hit){
              hz.hit = true;
              const kick = this.speed * HYD_SLIP.bonk * (Math.random() < 0.5 ? 1 : -1);
              this.tilt += kick;
              this.damage = Math.min(95, this.damage + Math.abs(kick)*40);
              if(!hz.burst && this.speed >= HYD_SLIP.thresh){
                hz.burst = true; hz.burstT = t;
              }
            }
            this.speed = 0;
          }
          if(Math.abs(dx) > 40) hz.hit = false;
          /* the flood: wheels in the wet with speed -> hydroplane.
             Pre-burst floods sit a tile over (hz.pudDir), so the slick
             tests against the flood's REAL center — same s-offset the
             puddle draws at. */
          const slickS = hz.s + (hz.pudDir ? hz.pudDir * T2 : 0);
          const sdx = this.botS - slickS;
          if(hz.burst && !this.slide && !hz.slid){
            const grow = Math.min(1, (t - hz.burstT)/1800);
            if(onLane(hz.row) && Math.abs(sdx) < HYD_SLIP.pud*grow && this.speed > 0.02){
              hz.slid = true;
              this.slide = { t0: t, dur: 800 + 300*HYD_SLIP.spin,
                             dir: Math.random() < 0.5 ? 1 : -1,
                             turns: HYD_SLIP.spin * (this.speed/0.05) };
              this.tilt += this.speed * 3 * (Math.random() < 0.5 ? 1 : -1);
            }
          }
          if(Math.abs(sdx) > HYD_SLIP.pud + 40) hz.slid = false;
        } else if(hz.type === "cone"){
          /* not a wall — a light plastic prop. ONE integrator, no
             keyframes: gravity torque about the live pivot runs every
             frame while hz.moving (approved cone hit lab, 2026-07-09).
             The hit itself just adds angular + slide impulse; whether
             it clears the balance angle decides rock-back vs topple. */
          if(hz.moving){
            const KG = 1.5e-5 * CONE_HIT.grav;
            const steps = Math.max(1, Math.ceil(dt/8));
            const hdt = dt/steps;
            for(let i=0; i<steps; i++){
              hz.angVel += KG * Math.sin(hz.phi - CONE_HIT.phiBal) * hdt;
              hz.phi += hz.angVel * hdt;
              if(hz.phase === 1 && hz.phi >= Math.PI/2) hz.phase = 2;
              if(hz.phase === 2 && hz.phi < Math.PI/2) hz.phase = 1;
              if(hz.phi >= CONE_HIT.phiRest){
                hz.phi = CONE_HIT.phiRest;
                if(Math.abs(hz.angVel) < 0.0006){
                  hz.angVel = 0; hz.moving = false; hz.pose = "knocked"; break;
                }
                hz.angVel = -hz.angVel * 0.22;
              }
              if(hz.phi <= 0){
                hz.phi = 0; hz.phase = 1;
                if(Math.abs(hz.angVel) < 0.0006){
                  hz.angVel = 0; hz.moving = false; hz.pose = "standing"; break;
                }
                hz.angVel = -hz.angVel * 0.25;
              }
            }
          }
          if(hz.slideVel > 0.0001){
            hz.slide += hz.slideVel * dt;
            hz.slideVel *= Math.exp(-0.004 * dt);
          } else hz.slideVel = 0;

          /* one-shot per approach — same convention as every other
             hazard (hz.hit, re-armed once the robot is well clear).
             Uses the UNADJUSTED route distance (dx), not the
             slide-shifted position: gating re-arm on the slide would
             feed the punt back into re-triggering itself, stacking
             redundant tilt/damage on the robot for what should read
             as a single clean bonk. */
          if(!hz.hit && Math.abs(dx) < 26 && onLane(hz.row) && this.speed > 0.015){
            hz.hit = true;
            if(hz.fallPsi === undefined) hz.fallPsi = (Math.random() - 0.5) * 0.5;
            const sp = this.speed;
            if(hz.pose !== "knocked"){
              hz.moving = true;
              hz.angVel += sp * 0.06 * CONE_HIT.kick;
            }
            hz.slideVel += sp * 1.2 * CONE_HIT.punt;
            const kick = sp * 2.2 * (Math.random() < 0.5 ? 1 : -1);
            this.tilt += kick;
            this.damage = Math.min(95, this.damage + Math.abs(kick)*20);
            this.speed *= 0.86;
          }
          if(Math.abs(dx) > 40) hz.hit = false;
        } else if(hz.type === "bin"){
          /* the wall IS the bin (approved bin hit lab, 2026-07-09):
             a municipal bin is too big to plow through standing OR
             lying down — same cast-iron contract as the hydrant, but
             permanent. Restored to the hydrant's exact fixed-clearance
             trigger pattern: the dynamic binNearEdge-based creeping
             stop line stopped firing collision entirely at some point
             after the lane system was rebuilt (3-lane -> 4-lane band),
             and a static analysis pass couldn't isolate why without
             being able to run it live. This is simpler and uses the
             one pattern in this file proven to still work, even
             though it loses the stop line creeping forward as the
             bin topples. */
          /* clearance eases from 26 (standing — the lab-calibrated
             figure) down to 16 fully knocked: a lying barrel presents
             low and the standing clearance read as daylight between
             nose and barrel (on-device: "still a little too far
             back"). */
          const BOT_CLEAR = 26 - Math.min(1, (hz.phi || 0)/(Math.PI/2)) * 10;
          /* the wall tracks the BIN, not the anchor: binShiftAt gives
             the knocked footprint's real +s displacement (slide +
             topple reach), so after a shove the robot stops at the
             lying barrel instead of at the empty spot it left. */
          const binS = hz.s + binShiftAt(hz);
          if(onLane(hz.row) && this.botS > binS - BOT_CLEAR && this.botS < binS){
            this.botS = safeStop(binS - BOT_CLEAR);
            this.isBlocked = true;
            if(this.speed > 0.035 && !hz.bonked && hz.pose !== "knocked"){
              hz.bonked = true;
              if(hz.fallPsi === undefined) hz.fallPsi = (Math.random() - 0.5) * 0.5;
              const sp = this.speed;
              hz.moving = true;
              hz.angVel += sp * 0.06 * BIN_HIT.kick;
              hz.slideVel += sp * 0.6 * BIN_HIT.punt;   // a shove as it goes over, not a full punt
              const kick = sp * 2.6 * (Math.random() < 0.5 ? 1 : -1);
              this.tilt += kick;
              this.damage = Math.min(95, this.damage + Math.abs(kick)*40);
            }
            this.speed = 0;
          }
          if(Math.abs(this.botS - (hz.s + binShiftAt(hz))) > 40) hz.bonked = false;   // re-arm after backing off, measured from the MOVED footprint

          /* single-phase gravity pivot about the base rim — no slab
             handoff needed, a barrel just lies flat on its side */
          if(hz.moving){
            const KG = 1.5e-5 * BIN_HIT.grav;
            const steps = Math.max(1, Math.ceil(dt/8));
            const hdt = dt/steps;
            for(let i=0; i<steps; i++){
              hz.angVel += KG * Math.sin(hz.phi - BIN_HIT.phiBal) * hdt;
              hz.phi += hz.angVel * hdt;
              if(!hz.spilled && hz.phi >= BIN_HIT.phiBal){ hz.spilled = true; this.spillBinTrash(hz); }
              if(hz.phi >= BIN_HIT.phiRest){
                hz.phi = BIN_HIT.phiRest;
                if(Math.abs(hz.angVel) < 0.0006){
                  hz.angVel = 0; hz.moving = false; hz.pose = "knocked"; break;
                }
                hz.angVel = -hz.angVel * 0.2;
              }
              if(hz.phi <= 0){
                hz.phi = 0;
                if(Math.abs(hz.angVel) < 0.0006){
                  hz.angVel = 0; hz.moving = false; hz.pose = "standing"; break;
                }
                hz.angVel = -hz.angVel * 0.22;
              }
            }
          }
          if(hz.slideVel > 0.0001){
            hz.slide += hz.slideVel * dt;
            hz.slideVel *= Math.exp(-0.0045 * dt);
          } else hz.slideVel = 0;
          this.simBinTrash(hz, dt);
        } else if(hz.type === "planter"){
          /* approved in planter collision lab (2026-07-10) — see
             PLANTER_HIT for the constants. Below thresh: one hit
             topples it, never a wall (cone/bin-style, uses the same
             hz.hit/dx<26 convention every simple hazard here uses).
             At/above thresh: too heavy to plow through standing or
             lying down — bin's exact BOT_CLEAR contract, the one
             fixed-clearance pattern proven to still work in this
             file. Difference from bin: this box's balance angle
             (~55deg, much higher than bin's round base) doesn't
             reliably clear from one impulse at real gameplay speeds,
             and the robot can't back off and re-approach once it's
             clamped at the stop line — so the oversized case grinds
             against it every frame instead of a single hit. */
          const oversized = hz.scale >= PLANTER_HIT.thresh;
          const halfW = (PLANTER_BASE.boxW/2) * hz.scale;

          if(oversized){
            /* stop distance calibrated against the KNOCKED near edge
               (+halfW once fallen, not -halfW like standing —
               verified by sampling the actual rendered geometry in
               the lab), since an oversized planter always ends up
               knocked eventually and stays blocked either way. */
            const BOT_CLEAR = BODY.hx - halfW + 4;
            if(onLane(hz.row) && this.botS > hz.s - BOT_CLEAR && this.botS < hz.s + 20){
              this.botS = safeStop(hz.s - BOT_CLEAR);
              this.isBlocked = true;
              this.speed = 0;
              if(hz.pose !== "knocked"){
                if(!hz.hit){
                  hz.hit = true;
                  /* fall AWAY from the robot, always: the oversized
                     contract lets the robot sit up to 20 past the
                     anchor, and the old always-(+s) topple dropped the
                     box straight onto him (on-device: "rolls toward
                     the robot"). Base direction from which side he's
                     actually on, jitter on top. */
                  if(hz.fallPsi === undefined)
                    hz.fallPsi = (this.botS <= hz.s ? 0 : Math.PI) + (Math.random()-0.5)*0.4;
                  const kick = 0.05 * 1.6 * (Math.random() < 0.5 ? 1 : -1);
                  this.tilt += kick;
                  this.damage = Math.min(95, this.damage + Math.abs(kick)*40);
                }
                hz.moving = true;
                hz.angVel += 0.07 * 0.012 * PLANTER_HIT.kick / Math.pow(hz.scale, PLANTER_HIT.potPower) * (dt/16);
              }
            }
          } else if(!hz.hit && Math.abs(dx) < 26 && onLane(hz.row) && this.speed > 0.035 && hz.pose !== "knocked"){
            hz.hit = true;
            if(hz.fallPsi === undefined)
              hz.fallPsi = (this.botS <= hz.s ? 0 : Math.PI) + (Math.random()-0.5)*0.4;   // away from the robot, like the oversized case
            const sp = this.speed;
            hz.moving = true;
            hz.angVel += sp * 0.09 * PLANTER_HIT.kick / Math.pow(hz.scale, PLANTER_HIT.potPower);
            /* the SHOVE — the bin's slide, the missing half of its
               knock feel: a light planter skids away from the impact
               as it topples (oversized stays planted: too heavy to
               shove, which is the point of oversized). */
            hz.slideVel = (hz.slideVel || 0) + sp * 0.45 / Math.pow(hz.scale, PLANTER_HIT.potPower);
            const kick = sp * 1.6 * (Math.random() < 0.5 ? 1 : -1);
            this.tilt += kick;
            this.damage = Math.min(95, this.damage + Math.abs(kick)*40);
            this.speed *= 0.9;
          }
          if(Math.abs(dx) > 40) hz.hit = false;

          if(hz.moving){
            const KG = 1.5e-5;
            const steps = Math.max(1, Math.ceil(dt/8));
            const hdt = dt/steps;
            for(let i=0; i<steps; i++){
              hz.angVel += KG * Math.sin(hz.phi - PLANTER_HIT.phiBal) * hdt;
              hz.phi += hz.angVel * hdt;
              if(!hz.spilled && hz.phi >= PLANTER_HIT.phiBal){ hz.spilled = true; this.spillPlanterLeaves(hz); }
              if(hz.phi >= PLANTER_HIT.phiRest){
                hz.phi = PLANTER_HIT.phiRest;
                if(Math.abs(hz.angVel) < 0.0006){
                  hz.angVel = 0; hz.moving = false; hz.pose = "knocked"; break;
                }
                hz.angVel = -hz.angVel * 0.18;
              }
              if(hz.phi <= 0){
                hz.phi = 0;
                if(Math.abs(hz.angVel) < 0.0006){
                  hz.angVel = 0; hz.moving = false; hz.pose = "standing"; break;
                }
                hz.angVel = -hz.angVel * 0.3;
              }
            }
          }
          if(hz.slideVel > 0.0001){
            hz.slide = (hz.slide || 0) + hz.slideVel * dt;
            hz.slideVel *= Math.exp(-0.0045 * dt);   // bin's exact skid decay
          } else hz.slideVel = 0;
          this.simPlanterLeaves(hz, dt);
        } else if(hz.type === "scooter"){
          /* soft hazard, same contract as before (sev 9, 55% speed
             loss) — this doesn't change. What's new: a standing
             scooter now actually topples via a real fall integrator
             (approved scooter hit lab, 2026-07-09) instead of the
             pose being a fixed coin-flip at spawn. One-shot hit
             using the UNADJUSTED route distance — the same fix the
             cone needed, since gating re-arm on the slide feeds the
             punt back into re-triggering itself. */
          if(!hz.hit && Math.abs(dx) < 26 && onLane(hz.row)){
            hz.hit = true;
            if(hz.fallPsi === undefined) hz.fallPsi = (Math.random() - 0.5) * 0.6;
            const sp = this.speed;
            if(hz.pose !== "knocked"){
              hz.moving = true;
              hz.angVel += sp * 0.06 * SCOOT_HIT.kick;
            }
            hz.slideVel += sp * 1.2 * SCOOT_HIT.punt;
            const kick = sp * 9 * (Math.random() < 0.5 ? 1 : -1);
            this.tilt += kick;
            this.damage = Math.min(95, this.damage + Math.abs(kick)*46);
            this.speed *= 0.45;
          }
          if(Math.abs(dx) > 40) hz.hit = false;

          if(hz.moving){
            const KG = 1.5e-5 * SCOOT_HIT.grav;
            const steps = Math.max(1, Math.ceil(dt/8));
            const hdt = dt/steps;
            for(let i=0; i<steps; i++){
              hz.angVel += KG * Math.sin(hz.phi - SCOOT_HIT.phiBal) * hdt;
              hz.phi += hz.angVel * hdt;
              if(hz.phi >= SCOOT_HIT.phiRest){
                hz.phi = SCOOT_HIT.phiRest;
                if(Math.abs(hz.angVel) < 0.0006){
                  hz.angVel = 0; hz.moving = false; hz.pose = "knocked"; break;
                }
                hz.angVel = -hz.angVel * 0.18;
              }
              if(hz.phi <= 0){
                hz.phi = 0;
                if(Math.abs(hz.angVel) < 0.0006){
                  hz.angVel = 0; hz.moving = false; hz.pose = "standing"; break;
                }
                hz.angVel = -hz.angVel * 0.2;
              }
            }
          }
          if(hz.slideVel > 0.0001){
            hz.slide += hz.slideVel * dt;
            hz.slideVel *= Math.exp(-0.004 * dt);
          } else hz.slideVel = 0;
        } else if(!hz.hit && Math.abs(dx) < 26 && onLane(hz.row)){
          hz.hit = true;
          const sev = hz.type === "crack"
            ? Math.min(8, Math.max(2, 4 * (hz.len || 46) / 46))   // bigger spall, bigger jolt (crack lab v3)
            : ({ trash:7, dog:5, palmDwarf:6, people:8 }[hz.type] ?? 5);   // hitting a person costs more than a dog bump — same mechanism that tips you on a hard palm/hydrant hit applies here too
          const kick = this.speed * sev * (Math.random() < 0.5 ? 1 : -1);
          this.tilt += kick;
          this.damage = Math.min(95, this.damage + Math.abs(kick)*46);
          if(hz.type === "trash") this.speed *= 0.65;
          if(hz.type === "palmDwarf") this.speed *= 0.5;   // dragging through fronds
          if(hz.type === "dog"){
            /* the dog reacts: remember when, and which way he bolts —
               along the route away from the robot, sideways at random */
            hz.hitT = t;
            hz.fleeA = dx >= 0 ? -1 : 1;
            hz.fleeB = Math.random() < 0.5 ? 1 : -1;
          }
          if(hz.type === "people"){
            /* same reaction as the dog: bolt away from the robot,
               toward the buildings, sideways at random */
            hz.hitT = t;
            hz.fleeA = dx >= 0 ? -1 : 1;
            hz.fleeB = Math.random() < 0.5 ? 1 : -1;
          }
        }
      }

      /* wedge underfoot: the wheels ride the slab's mid-height and its
         actual surface angle — smoothed so entering/leaving the lip
         reads as a climb, not a teleport */
      this.slabZ = Phaser.Math.Linear(this.slabZ || 0, slabUnder ? slabUnder.lift*0.5 : 0, 0.25);
      this.slabRoll = Phaser.Math.Linear(this.slabRoll || 0,
        slabUnder ? slabUnder.side * Math.atan(slabUnder.lift/(2*TILE)) : 0, 0.2);

      /* ---------- street-crossing curb ramps ----------
         Physics ported from labs/sidewalkend-lab.html (constants
         verbatim: 0.055 cross-slope coefficient, 0.35 curb-drop kick,
         0.55 already-leaning threshold, 0.85 post-kick tip line, ±0.05
         pad jitter). Everything routes through the game's OWN machinery
         instead of the lab's local copies: isBlocked feeds the existing
         stuckAmt rattle + "?!" bubble, and a tip hands the robot to the
         existing |tilt|>=1 pipeline (same pattern as the traffic hit)
         rather than setting state="tipped" from a second place.
         The row used everywhere is the VISUAL row (nearest laneOff),
         same reasoning as onLane() in the hazard loop: botRow flips the
         instant hop() is called, but the robot takes 480ms to actually
         arrive — the ground under him is where he IS. */
      const _vRow = [0,1,2,3].reduce((b,r) =>
        Math.abs(this.laneOff - laneOffset(r)) < Math.abs(this.laneOff - laneOffset(b)) ? r : b, 0);
      let _cg = crossingGroundAt(this.route.crossings, this.botS, _vRow);
      /* far-curb wall for the no-ramp lanes: clamp forward motion right
         at the boundary (lab clamped at boundary-1 too), then re-sample
         the ground from the corrected position so z/tilt never read a
         spot the robot was just pushed back from. Only ever shortens
         THIS frame's own advance — can't violate the safeStop floor. */
      if(_cg && _cg.wallS !== null && this.botS >= _cg.wallS - 1 && this.botS > _botS_frameStart){
        this.botS = Math.max(_cg.wallS - 1, _botS_frameStart);
        this.isBlocked = true;
        _cg = crossingGroundAt(this.route.crossings, this.botS, _vRow);
      }
      /* turn crossings (world-space model — see turnCrossingGroundAt):
         gated by the arc span's route-s range, then everything keys off
         the robot's actual world position, because the ramps sit at the
         true curb lines and his arc crosses them diagonally. The wall
         here is the generalized climb rule: he can DROP any height and
         can mount the ramp's 2-unit rear lip, but cannot climb a real
         curb face (3 or 5 units) — blocking clamps this frame's own
         advance only, then re-samples, same discipline as the straight
         wall above. */
      let _tg = null;
      if(!_cg){
        for(const cx of this.route.crossings){
          if(cx.kind !== "turn") continue;
          if(this.botS < cx.sA - 3*T2 || this.botS > cx.sB + 3*T2) continue;
          const wp0 = segsWorldOf(this.route.segs, this.botS, this.laneOff);
          _tg = turnCrossingGroundAt(cx, wp0.x, wp0.y, this.route.grid.classify, _vRow);
          if(_tg.z - (this.crossZ || 0) > 2.5 && this.botS > _botS_frameStart){
            this.botS = _botS_frameStart;
            this.isBlocked = true;
            const wp1 = segsWorldOf(this.route.segs, this.botS, this.laneOff);
            _tg = turnCrossingGroundAt(cx, wp1.x, wp1.y, this.route.grid.classify, _vRow);
          }
          break;
        }
      }
      const _prevCrossZ = this.crossZ || 0;
      if(_cg){
        this.crossZ = _cg.z;
        this.crossSlope = _cg.slope;
        /* truncated-dome rumble crossing the yellow pad — roll-only,
           layered on at the roll composition line below, never folded
           into this.tilt, so it can't push toward a tip or outlive the
           pad (lab: jitterRoll = (rand-0.5)*0.1, center lane only). */
        this.crossJitter = _cg.onPad ? (Math.random()-0.5) * 0.1 : 0;
        /* cross-slope lean off the ramp's flared sides — mirrored sign in
           the two lanes flanking the ramp strip, zero on the strip and on
           row 3 (lab: tilt += botRow * speed * 0.055 * dt) */
        if(_cg.tiltSign) this.tilt += _cg.tiltSign * this.speed * 0.055 * dt;
        /* curb drop: falling off the unramped edge in any non-ramp lane.
           A stumble kick in the direction you were already leaning (or
           away from the ramp strip if upright); if you were ALREADY
           leaning hard, or the kick lands you past the lab's 0.85 line,
           push tilt to 1.1 and let the game's own tip pipeline take it. */
        if(_vRow !== 1 && _prevCrossZ - this.crossZ > 1){
          const _wasLeaning = Math.abs(this.tilt) > 0.55;
          this.tilt += Math.sign(this.tilt || (1 - _vRow) || 1) * 0.35;   // (1 - row): same axis mirror as tiltSign
          if(_wasLeaning || Math.abs(this.tilt) > 0.85)
            this.tilt = 1.1 * Math.sign(this.tilt);
        }
      } else if(_tg){
        this.crossZ = _tg.z;
        /* pitch along TRAVEL: the surface gradient is axis-aligned (old
           heading on the down slope, new on the up) but the robot's
           heading rotates through the arc — project the gradient onto
           his actual travel direction. */
        const _hdg = segsHeadingAt(this.route.segs, this.botS);
        this.crossSlope = _tg.gx*Math.cos(_hdg) + _tg.gy*Math.sin(_hdg);
        this.crossJitter = _tg.onPad ? (Math.random()-0.5) * 0.1 : 0;
        /* cross-slope lean off the down-ramp's flared side, rows 0/2
           only — same mirrored (1-row) tiltSign the straight model
           uses, now actually wired up here too (previously computed by
           turnCrossingGroundAt's row split but never read). Own rate,
           NOT the straight model's 0.055: this crossing sits on top of
           the arc segment (TURN_R aligned them by construction), so a
           flanking lane is already picking up the arc's own centrifugal
           cornering tilt at the same time — whichever lane's flank sign
           matches the turn's own direction gets both added together.
           Straight crossings never have that second force, so 0.055
           was tuned for fighting alone; halved-ish here so the two
           stacking doesn't tip him before he reaches the curb. Tune
           further after playtesting like everything else in this file. */
        if(_tg.tiltSign) this.tilt += _tg.tiltSign * this.speed * 0.03 * dt;
        /* curb drop off an unramped edge — same lab kick/tip handoff.
           Threshold 2.5, NOT the straight model's 1: on turns every
           lane exits the up-ramp over its 2-unit rear lip (verified in
           the per-lane trace), and only the real curb faces (3-unit
           plain-walk curb, 5-unit prop curb) should stumble. Rows 0/2
           now get their own flank tilt above (turnCrossingGroundAt's
           row split), so the upright fallback direction here still
           just falls back to the current lean or +. */
        if(_prevCrossZ - this.crossZ > 2.5){
          const _wasLeaning = Math.abs(this.tilt) > 0.55;
          this.tilt += Math.sign(this.tilt || 1) * 0.35;
          if(_wasLeaning || Math.abs(this.tilt) > 0.85)
            this.tilt = 1.1 * Math.sign(this.tilt);
        }
      } else {
        this.crossZ = 0; this.crossSlope = 0; this.crossJitter = 0;
      }

      /* hydroplane: eased pirouette from a burst hydrant's flood.
         slipYaw layers into the facing yaw; when the slide ends,
         Grip unwinds it the short way back to straight. */
      if(this.slide){
        const su = (t - this.slide.t0)/this.slide.dur;
        if(su >= 1){ this.slide = null; }
        else {
          const se = su < 0.5 ? 2*su*su : 1 - Math.pow(-2*su + 2, 2)/2;
          this.slipYaw = this.slide.dir * Math.PI*2 * this.slide.turns * se;
          this.speed *= (1 - 0.0006*dt);
          this.tilt += (Math.random()-0.5) * this.speed * 0.05 * dt;
        }
      } else if(this.slipYaw){
        let y2 = this.slipYaw % (Math.PI*2);
        if(y2 > Math.PI) y2 -= Math.PI*2;
        if(y2 < -Math.PI) y2 += Math.PI*2;
        const step = HYD_SLIP.grip * 0.012 * dt;
        this.slipYaw = Math.abs(y2) <= step ? 0 : y2 - Math.sign(y2)*step;
      }

      /* stuck on a trunk: wheels churn, robot rattles, dignity evaporates */
      const stuckTarget = (this.isBlocked && this.throttle === 1) ? 1 : 0;
      this.stuckAmt = Phaser.Math.Linear(this.stuckAmt, stuckTarget, stuckTarget ? 0.12 : 0.1);
      if(this.stuckAmt > 0.05)
        this.wheelPhase += dt * 0.02 * this.stuckAmt * (Math.random() > 0.5 ? 1 : -1);

      /* stability spring + rough-pavement rumble */
      this.tilt -= this.tilt * 0.0021 * dt;
      this.tilt += (Math.random()-0.5) * this.speed * (1-this.route.hood.pave) * 0.012 * dt;

      /* cargo damage meter (spec, red-zone dwell): riding past the same
         0.75 danger line the HUD gauge and lid-crack already key off
         bleeds cargo damage continuously, not just on impact — a near-
         tip you HOLD costs more than one you snap out of. Unlike a
         hazard kick this is dt-scaled (per second, not per hit), and
         still respects the same 95 cap every other damage source uses. */
      if(Math.abs(this.tilt) > 0.75)
        this.damage = Math.min(95, this.damage + DAMAGE_REDZONE_DPS * dt/1000);

      /* traffic collision: unlike the other hazards above, this isn't
         gated on the robot's own speed -- a moving car can hit a robot
         that's standing still, not just the other way around. Position
         comes from trafficWorldAt, the exact same pure function the
         renderer uses, so the hitbox always matches what's on screen
         (same principle as dogSpotAt/dogFleeAt). A hit forces a full
         tip rather than a partial tilt kick like the cone -- getting
         hit by a car should always tip the robot, not just sometimes --
         by pushing tilt straight past the existing |tilt|>=1 threshold
         below, reusing all of that machinery instead of duplicating it. */
      /* two test points per vehicle now, not one: the old single
         center-point circle (r=70) let half a 225-unit-long car pass
         visually THROUGH the robot before the hit registered — the
         bumper reached him ~112 units before the center did. The NOSE
         point sits at the drawn front (center + DIRV of the same
         quantized facing the renderer uses, so hitbox matches art in
         all 4 headings), with a tighter radius sized to bumper-meets-
         robot; the center point keeps side impacts honest. Tilt sign
         still pushes away from the car's CENTER. */
      const CAR_HIT_CENTER_R = 60, CAR_HIT_NOSE_R = 50;
      for(const tr of this.route.traffic){
        const { wp, f: trF } = trafficWorldAt(tr, t);
        const nd = DIRV[trF];
        const nx = wp.x + nd.x*CARC.len*0.45, ny = wp.y + nd.y*CARC.len*0.45;
        const ddx = this.botX - wp.x, ddy = this.botY - wp.y;
        const cSq = ddx*ddx + ddy*ddy;
        const nnx = this.botX - nx, nny = this.botY - ny;
        const nSq = nnx*nnx + nny*nny;
        if(!tr.hit && (cSq < CAR_HIT_CENTER_R*CAR_HIT_CENTER_R || nSq < CAR_HIT_NOSE_R*CAR_HIT_NOSE_R)){
          tr.hit = true;
          this.tilt = 1.1 * (Math.sign(ddx || ddy) || 1);
          this.damage = Math.min(95, this.damage + 45);
        }
        if(cSq > (CAR_HIT_CENTER_R*4)*(CAR_HIT_CENTER_R*4)) tr.hit = false;
      }

      /* fail: we are horizontal */
      if(Math.abs(this.tilt) >= 1){
        this.state = "tipped";
        this.tipDir = Math.sign(this.tilt);
        /* cargo damage meter: a crash always fully ruins the goods,
           independent of whatever the accumulated damage number
           happened to be. Without this, a single fatal hit early in an
           otherwise-clean run could tip the robot while the bar was
           still green -- the crash itself IS the worst thing that can
           happen to the cargo, so it should always read that way. */
        this.damage = 95;
        this.tipStartRoll = this.roll;   // whatever lean we actually had the instant
                                          // we tipped — the fall animation eases FROM
                                          // this, not from an implicit flat start
        this.speed = 0;
        /* the lid's hinge rotation compounds with whatever yaw/pitch is
           still active when we go over — mid-turn yaw was only ever
           eased toward 0 (not reset), and pitch from hill slope was
           never reset at all (frozen at its last pre-tip value, forever).
           Compounded with the hinge's own rotation this is what twisted
           the lid. The sprite-lab reference this was built from has no
           yaw/pitch concept at all, which is why it never showed this -
           zeroing both the instant we tip matches that. */
        this.yaw = 0;
        this.pitch = 0;
        /* same family as the yaw/pitch zeroing above: mid-turn tips
           freeze whatever non-quarter drawAngle the facing ease was
           blending through, and every tipped-pose face-visibility test
           (n·(1,1,1), mounting-face wheels, lid hinge planes) is only
           verified at quarters — headless renders of the exact draw
           math reproduce the broken panels at 2.0/2.7/3pi/4 rad and
           render clean at all 8 quarter x tip-direction combos. Snap
           to the nearest quarter the instant we go over; the ease is
           gated off while tipped so this holds. The 45-degree-max pop
           reads as impact chaos. */
        this.drawAngle = Math.round(this.drawAngle / (Math.PI/2)) * (Math.PI/2);
        setTimeout(() => showFail(), 1500);
      }
      /* CANCELLATION: par + grace expired -> the order dies. A fail
         with the robot upright: the state gate stops the sim, input
         goes dead, fail overlay with the cancel pool. No payout, no
         daily-best entry — a canceled order never happened. */
      if(this.runT > this.route.parMs + CANCEL_GRACE_MS){
        this.state = "canceled";
        this.speed = 0; this.throttle = 0;
        setTimeout(() => showFail(CANCEL_LINES), 900);
        return;
      }
      /* win: at the door, slow, upright */
      const remain = this.route.doorS - this.botS;
      if(remain < 34 && remain > -60 && this.speed < 0.02 && Math.abs(this.tilt) < 0.5){
        this.state = "won";
        showWin(this);
      }
      /* overshot the door: clamp to whichever is closer — the edge of the
         win window itself (doorS+60, matching the "remain > -60" bound
         above) or the true route end. Previously this was anchored to
         totalLen alone, which is fine on the ~90-unit-gap days but on
         routes where doorS lands far short of totalLen (confirmed up to
         54,600 units short on ~47% of tested days — findGoodS() correctly
         finds the nearest buildable straight leg, but the walked route's
         tail can genuinely have none nearby), the player would sail
         through a dead zone with no win trigger and no clamp until
         hitting totalLen-30, sometimes tens of thousands of units later —
         reading as "win doesn't fire" rather than a clear, immediate stop
         at the address. */
      const overshootLimit = Math.min(this.route.doorS + 60, this.route.totalLen - 30);
      if(this.botS > overshootLimit){
        this.botS = overshootLimit; this.speed = 0; this.tilt += 0.5;
      }
      if(this.botS < _botS_frameStart - 0.01){
        console.warn(`[BACKWARD] botS ${_botS_frameStart.toFixed(1)} -> ${this.botS.toFixed(1)} (Δ${(this.botS-_botS_frameStart).toFixed(1)}) botRow=${this.botRow} isBlocked=${this.isBlocked} segType=${this.segAt(this.botS).type}`);
      }
    }

    /* tipped: roll over + spill (the sprite-lab pratfall) */
    if(this.state !== "play") this.yaw = Phaser.Math.Linear(this.yaw, 0, 0.15);
    if(this.state === "tipped"){
      this.tipT = Phaser.Math.Linear(this.tipT, 1, 0.09);
      if(this.tipT > 0.55 && !this.spilled) this.spillCargo();
      /* lid behavior genuinely differs by tip direction now that the
         hinge is a fixed edge (not mirrored) — gravity swings it back
         shut on one side, holds it open on the other. This is NOT the
         same animation mirrored, it's two different physical outcomes.
         tipDir<0: pops open to spill, holds ~400ms, flops back closed.
         tipDir>=0: opens and stays open (original behavior). Confirmed
         in-game 2026-07-10 — first guess had this backwards. */
      if(this.tipDir < 0){
        if(this.spilled) this.postSpillMs = (this.postSpillMs || 0) + dt;
        const closing = this.spilled && this.postSpillMs > 400;
        const lidOpenTarget = this.tipT > 0.5 ? 0.9 : 0;
        this.lidAng = closing
          ? Phaser.Math.Linear(this.lidAng, 0, 0.05)
          : Phaser.Math.Linear(this.lidAng, Math.max(this.lidAng, lidOpenTarget), 0.05);
      } else {
        this.lidAng = Phaser.Math.Linear(this.lidAng, Math.max(this.lidAng, this.tipT > 0.5 ? 1.78 : 0), 0.05);
      }
      this.roll = Phaser.Math.Linear(this.tipStartRoll, this.tipDir * (Math.PI*0.5), this.tipT);
    } else {
      this.roll = Phaser.Math.Clamp(this.tilt, -1, 1) * 0.5 + this.cornerLean + (this.slabRoll || 0) + (this.crossJitter || 0);
    }
    this.simItems(dt);

    /* world pose from the path: position + lane, eased continuous heading */
    const hdg = this.headingAt(this.botS);
    const pp = this.posAt(this.botS);
    const rvx = -Math.sin(hdg), rvy = Math.cos(hdg);       // right of travel
    this.botX = pp.x + rvx*this.laneOff;
    this.botY = pp.y + rvy*this.laneOff;
    const fi = Math.round(hdg / (Math.PI/2));
    this.f = ((fi % 4) + 4) % 4;   // kept for hazard/HUD logic only — not used for drawing anymore
    /* unwrap: headingAt() can report the same physical direction with a
       different numeric value depending which segment it's reading from
       (an exit leg computes its heading as f*90° in canonical [0,2pi),
       while the arc feeding into it may have swept into negative
       numbers) — at certain facing wraps those two representations land
       a full 2pi apart even though they mean the same heading. Bring the
       target to whichever representation is closest to where drawAngle
       already is before easing toward it, instead of chasing a fake
       360° jump. (Full derivation + verification: corner+robot lab.) */
    let _targetAngle = hdg;
    while(_targetAngle - this.drawAngle >  Math.PI) _targetAngle -= Math.PI*2;
    while(_targetAngle - this.drawAngle < -Math.PI) _targetAngle += Math.PI*2;
    if(this.state !== "tipped") this.drawAngle = Phaser.Math.Linear(this.drawAngle, _targetAngle, 0.12);   // tipped: hold the quarter snap (see the tip transition)
    this.yaw = this.hopYaw + (this.slipYaw || 0);

    /* stuck jitter rattles the whole body */
    if(this.stuckAmt > 0.05){
      this.botX += (Math.random()-0.5) * 2.6 * this.stuckAmt;
      this.botY += (Math.random()-0.5) * 1.4 * this.stuckAmt;
    }

    this.botZ = this.groundZ(this.botS) + (this.slabZ || 0) + (this.crossZ || 0);
    /* MAX_GRADE: hard ceiling at a real 5% grade (atan(0.05) ≈ 2.86°),
       on top of the HILL_AMP retune above — the retune sets the typical
       feel per neighborhood, this guarantees no unlucky noise seed ever
       exceeds the stated max regardless. */
    const MAX_GRADE = 0.05;
    if(this.state !== "tipped") this.pitch = -Math.atan(Phaser.Math.Clamp(this.groundSlope(this.botS) + (this.crossSlope || 0), -MAX_GRADE, MAX_GRADE));

    /* camera reframe: at f=3 the worker/customer's walk-out direction
       pushes them far enough sideways on screen that tracking only the
       robot leaves them off-frame (confirmed: 227px past a 430px-wide
       screen's left edge while the robot sat centered). Widen the
       target to a blend of door + bot + their far position + raised-
       hand reach whenever they're actually visible. */
    let camTargetX = this.botX + Math.cos(hdg)*95;
    let camTargetY = this.botY + Math.sin(hdg)*95;
    let camTargetZ = this.botZ;

    /* doorSwing used to be checked here too, but it never added
       anything on the opening side (the door's target already flips
       open the same instant pickupWalk starts at 1) -- its only real
       effect was keeping this true during the door's own lingering
       close after the worker had already finished walking back,
       which is what held the camera on an empty doorway. The door
       still closes exactly the same as before; the camera just stops
       waiting on it. */
    /* pickupWalk counts DOWN from 1 (walk just started) to 0 (worker
       back at the door) -- so a HIGHER threshold releases EARLIER,
       not later. 0.75 means the camera lets go once the walk is only
       25% along, well ahead of the halfway point. */
    const pickupWorkerVisible = this.pickupWalk > 0.75;
    if(this.state === "play" && this.pickupDoorDV && pickupWorkerVisible){
      const dv3 = this.pickupDoorDV, rv3 = this.pickupDoorRV;
      const doorX3 = this.pickupDoorUX + dv3.x*this.pickupDoorCenterX, doorY3 = this.pickupDoorUY + dv3.y*this.pickupDoorCenterX;
      /* the worker's far spot is the MEET beside the robot now, and his
         facing follows the true door->robot approach — mirrors the won
         branch below. */
      let workerFarX = doorX3 + rv3.x*(T2*2.1-50), workerFarY = doorY3 + rv3.y*(T2*2.1-50);
      let facingRobot = Math.atan2(rv3.y, rv3.x) - Math.PI/2;
      if(this.route.pickupSpot){
        let cvx = this.route.pickupSpot.x - doorX3, cvy = this.route.pickupSpot.y - doorY3;
        const cd = Math.hypot(cvx, cvy) || 1; cvx /= cd; cvy /= cd;
        workerFarX = this.route.pickupSpot.x - cvx*12;
        workerFarY = this.route.pickupSpot.y - cvy*12;
        facingRobot = Math.atan2(cvy, cvx) - Math.PI/2;
      }
      const wBuild2 = PEOPLE_BUILD[mulberry32(this.pickupWorkerSeed)() < 0.5 ? 0 : 1];
      const armReach2 = this.handWorldPos(workerFarX, workerFarY, facingRobot, wBuild2, 1);
      camTargetX = (doorX3 + this.botX + workerFarX + armReach2.x) / 4;
      camTargetY = (doorY3 + this.botY + workerFarY + armReach2.y) / 4;
      camTargetZ = (0 + 0 + 0 + armReach2.z) / 4;
    } else if(this.state === "won" && this.addrDoorDV){
      const dv2 = this.addrDoorDV, rv2 = this.addrDoorRV;
      const doorX = this.addrDoorUX + dv2.x*this.addrDoorCenterX, doorY = this.addrDoorUY + dv2.y*this.addrDoorCenterX;
      /* frame the REAL meet point (the customer walks to the robot
         now), falling back to the old mat-edge spot for the first
         frames before the won timeline has computed it. */
      const custFarX = this.wonMeet ? this.wonMeet.x : doorX + rv2.x*(T2-8);
      const custFarY = this.wonMeet ? this.wonMeet.y : doorY + rv2.y*(T2-8);
      const thW2 = this.wonMeet ? this.wonMeetTh : Math.atan2(rv2.y, rv2.x) - Math.PI/2;
      const cBuild2 = PEOPLE_BUILD[mulberry32(this.addrCustSeed)() < 0.5 ? 0 : 1];
      const armReach = this.handWorldPos(custFarX, custFarY, thW2, cBuild2, 1);
      camTargetX = (doorX + this.botX + custFarX + armReach.x) / 4;
      camTargetY = (doorY + this.botY + custFarY + armReach.y) / 4;
      camTargetZ = (0 + 0 + 0 + armReach.z) / 4;
    } else if(this.state === "tipped"){
      /* the default target above leads the robot by 95 units along
         the route heading -- meant to bias the view toward what's
         coming up next while driving, which is meaningless once
         he's down. Centering directly on him instead, same pattern
         as the pickup/won branches above. */
      camTargetX = this.botX;
      camTargetY = this.botY;
    }

    this.camX = Phaser.Math.Linear(this.camX, camTargetX, 0.08);
    this.camY = Phaser.Math.Linear(this.camY, camTargetY, 0.06);
    this.camZ = Phaser.Math.Linear(this.camZ, camTargetZ, 0.08);

    /* the "?!" of a machine confronting a tree */
    if(this.stuckAmt > 0.5 && this.state === "play"){
      const sp2 = this.W(this.botX, this.botY, this.botZ + 130);
      this.qtext.setVisible(true).setAlpha(this.stuckAmt);
      this.qtext.setPosition(sp2.x + 42 + Math.random()*2,
                             sp2.y + Math.sin(t*0.008)*6);
    } else this.qtext.setVisible(false);

    const driving = this.state === "play" && this.speed > 0.01;
    const bobZ = this.state === "tipped" ? 0 : (driving ? Math.sin(t*0.012)*1.1 : Math.sin(t*0.0022)*1.4);
    const leanTarget = driving ? -0.3*(this.speed/0.15) : Math.sin(t*0.0022)*0.08;
    this.flagLean = Phaser.Math.Linear(this.flagLean, leanTarget, 0.06);

    /* shadow (never pitches or rolls) */
    const sp = this.pitch, srl = this.roll; this.pitch = 0; this.roll = 0;
    const sh = [];
    for(let i=0;i<14;i++){
      const a=(i/14)*Math.PI*2;
      sh.push(this.P(Math.cos(a)*34, -this.tipT*26*(this.tipDir||1) + Math.sin(a)*(30 + this.tipT*26), 0.5));
    }
    this.quadOn(g, sh, SKIN.shadow, 0.16);
    this.pitch = sp; this.roll = srl;

    /* spilled cargo lies in the world, behind the robot */
    this.drawItems();
    if(!this.flagNear()) this.drawFlag(bobZ);

    /* wheels far -> undercarriage -> body -> details -> wheels near -> flag */
    const wheels = [];
    /* near/far by MOUNTING-FACE VISIBILITY — the same projection-exact
       normal test drawBox uses for every hull face: a wheel row draws
       in front of the body iff the body face it's bolted to (local
       (0, side, 0)) faces the camera. The old depth() comparison had
       the z*0.4 pathology lidNear()/flagNear() each already fixed: a
       tipped robot's air row out-depthed its grounded mirror at EVERY
       heading, so the trio painted over the hull wherever the body
       should hide it (reported at f=2 tipped). A planimetric fix is
       degenerate at the 90-degree rest pose (the rows stack vertically,
       identical x/y) — the face-normal test has no such hole: upright
       it reduces exactly to the heading answer, rolled it hands the
       sky-facing row to the near pass, and every angle between is
       continuous, all 4 headings by construction. */
    for(const side of [-1, 1]){
      const wnorm = this.R(0, side, 0);
      const sideNear = (wnorm.x + wnorm.y + wnorm.z) > 0;
      for(const wx of WHEEL.xs){
        const c = {x:wx, y:side*WHEEL.side, z:WHEEL.z};
        wheels.push({ c, side, near: sideNear, d: this.depth(c.x, c.y, c.z) });
      }
    }
    /* the 3 wheels on a given side (front/mid/rear along the body) were
       always drawn in fixed array order (-16, 0, 16) regardless of
       which one the current yaw/facing actually put closer to camera —
       sorting by real depth first keeps that trio in the right
       front-to-back order at every angle instead of just at the ones
       where the fixed order happened to already match. */
    wheels.sort((a,b) => a.d - b.d);
    for(const w of wheels) if(!w.near) this.drawWheel(w.c, w.side);

    /* the open lid can swing to the far side of the body — draw it first there */
    const lidBox = {...LID, z0:LID.z0+bobZ, z1:LID.z1+bobZ};
    const lidIsNear = this.lidNear();
    if(!lidIsNear) this.drawLid(lidBox);

    this.drawBox({hx:24, hy:17, z0:6, z1:BODY.z0+1}, 0x3f434c, 0x3a3d45, 0x2e3138, false);
    this.drawBox({...BODY, z0:BODY.z0+bobZ, z1:BODY.z1+bobZ}, SKIN.bodyTop, SKIN.bodyRight, SKIN.bodyLeft);
    this.drawBox({hx:BODY.hx+0.6, hy:BODY.hy+0.6, z0:STRIPE.z0+bobZ, z1:STRIPE.z1+bobZ},
                 null, SKIN.stripe, SKIN.stripeDk, false, true);
    /* cavity + hinged lid */
    if(this.lidAng > 0.12){
      const wn = this.R(0, 0, 1);
      if(wn.x + wn.y + wn.z > 0){
        const zc = LID.z0 + bobZ + 0.5;
        const ring = (hx, hy) => [
          this.P(hx,-hy,zc), this.P(hx,hy,zc), this.P(-hx,hy,zc), this.P(-hx,-hy,zc)
        ];
        this.quadOn(g, ring(LID.hx-2, LID.hy-2), SKIN.cavityWall);
        this.quadOn(g, ring(LID.hx-6, LID.hy-6), SKIN.cavityFloor);
      }
    }
    if(lidIsNear) this.drawLid(lidBox);

    const fn = this.R(1, 0, 0);
    if(fn.x + fn.y + fn.z > 0){
      const F = (y, z) => this.P(BODY.hx + 0.8, y, z + bobZ);
      this.quadOn(g, [F(-13,40), F(13,40), F(13,50), F(-13,50)], SKIN.visor);
      this.edgeOn(g, [F(-13,40), F(13,40), F(13,50), F(-13,50)], SKIN.outline, 1.5);
      if(this.state === "tipped"){
        g.lineStyle(2.5, SKIN.eyeAlert, 1);
        for(const ey of [-7, 7]){
          const c = F(ey, 45);
          g.lineBetween(c.x-4, c.y-4, c.x+4, c.y+4);
          g.lineBetween(c.x-4, c.y+4, c.x+4, c.y-4);
        }
      } else {
        this.blinkT -= dt;
        if(this.blinkT < -3200 + Math.random()*80) this.blinkT = 130;
        const open = this.blinkT > 0 ? 0.15 : 1;
        const ec = (Math.abs(this.tilt) > 0.6 || this.stuckAmt > 0.4 || this.slide) ? SKIN.eyeAlert : SKIN.eye;
        for(const ey of [-7, 7]){
          const c = F(ey, 45);
          g.fillStyle(ec, 1);
          g.fillEllipse(c.x, c.y, 7, 7*open);
        }
      }
      this.quadOn(g, [F(-16,18), F(16,18), F(16,22), F(-16,22)], 0xfff3b0);
    }
    for(const w of wheels) if(w.near) this.drawWheel(w.c, w.side);
    if(this.flagNear()) this.drawFlag(bobZ);
  }

  flagNear(){
    /* roll excluded here, same fix lidNear() already needed for the
       same reason: the depth formula's z*0.4 weighting is guaranteed
       to flip this comparison somewhere in the middle of any large
       roll sweep -- not a tunable constant, a consequence of the
       formula itself. Left in, the flag would flicker in front of and
       behind the lid throughout the whole crash instead of holding
       one answer. The flag's actual near/far relationship to the lid
       is fixed by their local positions and doesn't change just
       because the robot's currently rolling over -- roll is how the
       crash looks, not a reason the two should swap places. Verified
       across all 4 headings x both tip directions x the full tipT
       sweep: zero flips with roll excluded, versus flipping multiple
       times per crash with it included. */
    const sr = this.roll; this.roll = 0;
    const result = this.depth(FLAG.base.x, FLAG.base.y, FLAG.z0 + 20) > this.depth(0, 0, 34);
    this.roll = sr;
    return result;
  }

  /* near/far by TOP-FACE VISIBILITY, not a depth comparison. The lid is
     hinged along the body's rear top edge and only ever swings within
     the hemisphere above that face — it can never end up behind the
     body when the top face itself is camera-facing, or in front of it
     when the top face faces away. So the same test the cavity gate
     below already uses for "is the top face visible" (this.R(0,0,1),
     summed) also answers "is the lid near", and the two can never
     disagree with each other since it's the literal same expression
     evaluated in the same frame.
     Replaces a point-depth comparison (this.depth(), which weights z
     by 0.4) that was forced-near below lidAng 0.15 and only ran the
     depth test above that. That combination (a) kept painting the shut
     lid over the body for several frames after the body had already
     rolled past the point it should occlude it, (b) popped visibly at
     the 0.15 threshold mid-roll, and (c) is mathematically guaranteed
     to flip mid-sweep for any large roll — same z*0.4 root cause
     already fixed in flagNear() and the wheel mounting-face test, just
     never carried over here. The normal test is continuous through the
     whole roll sweep instead. lidAng and lidHingeFlip don't factor in
     at all now — which edge is the physical hinge never changes which
     side of the body's own top plane the lid is swinging into. */
  lidNear(){
    const w = this.R(0, 0, 1);
    return (w.x + w.y + w.z) > 0;
  }

  rollPt(x, y, z){                 // roll only — no facing (for world-space spawns)
    if(this.roll === 0) return {x, y, z};
    const PIV = this.roll >= 0 ? 22 : -22;
    const y0 = y + PIV, c = Math.cos(this.roll), s = Math.sin(this.roll);
    return { x, y:-PIV + y0*c - z*s, z:y0*s + z*c };
  }

  /* the lid: a box on a hinge along its rear edge; swings open by this.lidAng */
  drawLid(b){
    const {hx, hy, z0, z1} = b;
    const A = this.lidAng, cA = Math.cos(A);
    /* hinge side: fixed edge (doesn't mirror with tip direction) for
       the tip/spill crash animation — this.lidHingeFlip defaults to
       false everywhere except during pickup loading, so that behavior
       is completely unchanged. Only the pickup sequence sets it true.
       Flipping the hinge point alone isn't a true mirror — the sin
       term (equivalent to using -A) has to flip too, or the lid
       swings the wrong way relative to its new hinge instead of
       mirroring the same upward-opening motion. Verified: with the
       sign flip, both hinge sides lift the same height, just swinging
       toward opposite directions — a proper mirror. */
    const sA = Math.sin(A) * (this.lidHingeFlip ? -1 : 1);
    const yh = (this.lidHingeFlip ? hy : -hy), zh = z0;
    const H = (x, y, z) => {                     // hinge rotation, then normal pipeline
      const dy = y - yh, dz = z - zh;
      return this.P(x, yh + dy*cA - dz*sA, zh + dy*sA + dz*cA);
    };
    const HN = (nx, ny, nz) => {                 // normals: hinge rot then roll+facing
      const ny2 = ny*cA - nz*sA, nz2 = ny*sA + nz*cA;
      return this.R(nx, ny2, nz2);
    };
    const C = (sx, sy, sz) => H(sx*hx, sy*hy, sz === 1 ? z1 : z0);
    const faces = [
      { n:{x:0,y:0,z: 1}, pts:[C( 1,-1,1), C( 1, 1,1), C(-1, 1,1), C(-1,-1,1)] },
      { n:{x:0,y:0,z:-1}, pts:[C( 1,-1,0), C( 1, 1,0), C(-1, 1,0), C(-1,-1,0)] },
      { n:{x: 1,y:0,z:0}, pts:[C( 1,-1,0), C( 1, 1,0), C( 1, 1,1), C( 1,-1,1)] },
      { n:{x:-1,y:0,z:0}, pts:[C(-1,-1,0), C(-1, 1,0), C(-1, 1,1), C(-1,-1,1)] },
      { n:{x:0,y: 1,z:0}, pts:[C( 1, 1,0), C(-1, 1,0), C(-1, 1,1), C( 1, 1,1)] },
      { n:{x:0,y:-1,z:0}, pts:[C( 1,-1,0), C(-1,-1,0), C(-1,-1,1), C( 1,-1,1)] }
    ];
    for(const fc of faces){
      const w = HN(fc.n.x, fc.n.y, fc.n.z);
      if((w.x + w.y + w.z) <= 0) continue;
      const col = w.z > 0.5 ? SKIN.bodyTop
                : w.z < -0.5 ? SKIN.lidInner
                : (w.x >= w.y) ? SKIN.bodyRight : SKIN.bodyLeft;
      this.quad(fc.pts, col);
      this.edge(fc.pts);
    }
  }

  quad(pts, color, alpha=1){
    this.g.fillStyle(color, alpha);
    this.g.fillPoints(pts.map(p => new Phaser.Geom.Point(p.x, p.y)), true, true);
  }
  edge(pts, color=SKIN.outline, w=2){
    this.g.lineStyle(w, color, 1);
    this.g.strokePoints(pts.map(p => new Phaser.Geom.Point(p.x, p.y)), true);
  }

  /* ---------- spilled cargo ---------- */
  spillCargo(){
    this.spilled = true;
    /* opening point: the lid's far edge (opposite the fixed hinge),
       rotated by the CURRENT lidAng first — matching drawLid's own
       hinge geometry exactly — before applying the body's roll. The
       old version skipped the hinge rotation entirely and used a
       fixed local point as if the lid were still shut, so once the
       lid had actually swung open the spill came out of the wrong
       spot/direction relative to where the opening really was. */
    const hA = this.lidAng, chA = Math.cos(hA), shA = Math.sin(hA);
    const hyh = -LID.hy, hzh = LID.z0;
    const hdy = LID.hy - hyh, hdz = 0;   // far-bottom edge, opposite the hinge
    const hingedY = hyh + hdy*chA - hdz*shA;
    const hingedZ = hzh + hdy*shA + hdz*chA;
    const mouth = this.rollPt(0, hingedY, hingedZ + 4);   // lid opening, mid-fall — fixed
                                                          // edge (opposite the now-fixed
                                                          // hinge), not mirrored by tip
                                                          // direction; rollPt() still
                                                          // carries the tip-direction-
                                                          // dependent world-space effect
    const outSign = this.tipDir >= 0 ? -1 : 1;   // the two tip types roll opposite
                                                    // ways around the same fixed hinge,
                                                    // so "away from the opening" flips
                                                    // horizontally between them
    const spawn = (kind, size) => this.items.push({
      kind, size,
      x: mouth.x + (Math.random()-0.5)*10,
      y: mouth.y + outSign*(4 + Math.random()*6),
      z: mouth.z + Math.random()*4,
      vx: (Math.random()-0.5)*2.2,
      vy: outSign*(0.8 + Math.random()*1.4),
      vz: 0.5 + Math.random()*0.9,
      spin: (Math.random()-0.5)*0.3, ang: Math.random()*Math.PI,
      rest: false
    });
    /* the takeout BAG itself tumbles out first — it's the thing the
       whole delivery is about, and spilling only its contents read as
       the bag never existing. Gated on loadDone so a tip during the
       loading beat (bag still in the worker's hand / mid-arc) can't
       duplicate it. Slightly heavier throw than the contents: the
       container leads, the burrito chases. */
    if(this.bagOnBoard) this.items.push({
      kind:"bag", size: 12,
      x: mouth.x + (Math.random()-0.5)*8,
      y: mouth.y + outSign*(6 + Math.random()*5),
      z: mouth.z + 3,
      vx: (Math.random()-0.5)*1.8,
      vy: outSign*(1.1 + Math.random()*1.2),
      vz: 0.7 + Math.random()*0.7,
      spin: (Math.random()-0.5)*0.22, ang: Math.random()*Math.PI,
      rest: false
    });
    this.bagOnBoard = false;   // it's on the pavement now
    /* the spill IS the order: every line item's spill kinds hit the
       pavement — books outside the bookstore, apples outside the
       market, a pizza box shedding slices. Capped at 8 pieces (perf +
       readability); a missing order falls back to the classic trio. */
    const SPILL_SIZE = { burrito:9, cup:7, fry:4, taco:7, croissant:6, donut:5.5,
                         loaf:9, sandwich:7, pizzabox:11, slice:7, cone:6, pint:6,
                         apple:5, milk:6.5, eggs:8, parcel:10, book:7, paintcan:6.5 };
    const spillKinds = [];
    if(this.route.order)
      for(const l of this.route.order.lines)
        for(let q = 0; q < l.qty; q++) spillKinds.push(...(l.spill || ["burrito"]));
    while(spillKinds.length > 8) spillKinds.splice(Math.floor(Math.random()*spillKinds.length), 1);
    if(!spillKinds.length) spillKinds.push("burrito", "cup", "fry", "fry", "fry");
    for(const sk of spillKinds) spawn(sk, SPILL_SIZE[sk] || 6);
  }

  simItems(dt){
    const k = dt/16.7;
    for(const it of this.items){
      if(it.rest) continue;
      it.vz -= 0.14*k;
      it.x += it.vx*k; it.y += it.vy*k; it.z += it.vz*k;
      it.ang += it.spin*k;
      if(it.z <= it.size*0.35){
        it.z = it.size*0.35;
        if(Math.abs(it.vz) < 0.25){ it.rest = true; it.vx = it.vy = it.vz = 0; }
        else { it.vz *= -0.38; it.vx *= 0.7; it.vy *= 0.7; it.spin *= 0.6; }
      }
    }
  }

  /* ---------- bin debris (approved bin hit lab, 2026-07-09) ----------
     Same ballistic-arc-then-settle pattern as the robot's own
     spillCargo/simItems, just per-hazard: each knocked bin owns its
     own hz.items array. Coordinates are LOCAL to the hazard's own
     (u,v,h) axes — the same frame binTipPoint/drawProp's W() already
     use — so this needs no knowledge of the route's actual world
     direction; that translation happens later, at render time. */
  spillBinTrash(hz){
    const cth = hz.fallPsi !== undefined ? hz.fallPsi : (hz.thetaF || 0);
    const fc = Math.cos(cth), fsn = Math.sin(cth);
    const tt = binTipPoint(BIN.height, 2, hz.phi);
    const slide = hz.slide || 0;
    const mx = (tt.u + slide)*fc, my = (tt.u + slide)*fsn, mz = tt.z;
    const spawn = (kind, size) => hz.items.push({
      kind, size,
      x: mx + (Math.random()-0.5)*6,
      y: my + (Math.random()-0.5)*6,
      z: mz + Math.random()*4,
      vx: fc*(1.8 + Math.random()*2.4) + (Math.random()-0.5)*2.4,
      vy: fsn*(1.8 + Math.random()*2.4) + (Math.random()-0.5)*2.4,
      vz: 2.4 + Math.random()*2.0,
      spin: (Math.random()-0.5)*0.3, ang: Math.random()*Math.PI,
      rest: false
    });
    spawn("paper", 5);
    spawn("can", 4);
    for(let i=0; i<2; i++) spawn("wrap", 3);
  }
  simBinTrash(hz, dt){
    if(!hz.items || !hz.items.length) return;
    const k = dt/16.7;
    for(const it of hz.items){
      if(it.rest) continue;
      it.vz -= 0.14*k;
      it.x += it.vx*k; it.y += it.vy*k; it.z += it.vz*k;
      it.ang += it.spin*k;
      if(it.z <= it.size*0.35){
        it.z = it.size*0.35;
        if(Math.abs(it.vz) < 0.25){ it.rest = true; it.vx = it.vy = it.vz = 0; }
        else { it.vz *= -0.38; it.vx *= 0.7; it.vy *= 0.7; it.spin *= 0.6; }
      }
    }
  }
  /* spilled plants — same shape as bin's trash spill, colored from
     the planter's own variant so a tropical planter spills tropical
     leaves, not generic green ones. */
  spillPlanterLeaves(hz){
    const V = PLANTER_VARIANTS[hz.variantIdx || 0];
    const n = 5 + Math.floor(Math.random()*3);
    for(let i=0; i<n; i++){
      hz.items.push({
        col: [V.leafA, V.leafB, V.leafC, V.flower][Math.floor(Math.random()*4)],
        size: (2 + Math.random()*2) * (hz.scale || 1),
        x: (Math.random()-0.5)*10*(hz.scale||1), y: (Math.random()-0.5)*10*(hz.scale||1), z: 6 + Math.random()*6,
        vx: (Math.random()-0.5)*1.6, vy: (Math.random()-0.5)*1.6, vz: 0.6 + Math.random()*0.8,
        spin: (Math.random()-0.5)*0.3, ang: Math.random()*Math.PI,
        rest: false
      });
    }
  }
  simPlanterLeaves(hz, dt){
    if(!hz.items || !hz.items.length) return;
    const k = dt/16.7;
    for(const it of hz.items){
      if(it.rest) continue;
      it.vz -= 0.09*k;
      it.x += it.vx*k; it.y += it.vy*k; it.z += it.vz*k;
      if(it.z <= 0.5){
        it.z = 0.5;
        if(Math.abs(it.vz) < 0.2){ it.rest = true; it.vx = it.vy = it.vz = 0; }
        else { it.vz *= -0.3; it.vx *= 0.6; it.vy *= 0.6; }
      }
    }
  }

  drawItems(){
    if(!this.items.length) return;
    const sr = this.roll; this.roll = 0;         // items are world objects
    const g = this.g, K = this.K;
    for(const it of this.items){
      // little ground shadow
      const s = this.P(it.x, it.y, 0.4);
      g.fillStyle(SKIN.shadow, 0.15);
      g.fillEllipse(s.x, s.y, it.size*K*0.9, it.size*K*0.4);
      const p = this.P(it.x, it.y, it.z);
      if(it.kind === "burrito"){
        g.fillStyle(0xe8b04b, 1);
        g.fillEllipse(p.x, p.y, 16*K*0.8, 9*K*0.8);
        g.lineStyle(2, 0xb5813a, 1); g.strokeEllipse(p.x, p.y, 16*K*0.8, 9*K*0.8);
        g.fillStyle(0x7fae4e, 1);                       // sad lettuce
        g.fillEllipse(p.x + 5*K*0.8, p.y, 4*K*0.8, 5*K*0.8);
      } else if(it.kind === "cup"){
        g.fillStyle(0xf4f5f7, 1);
        g.fillRect(p.x - 4*K*0.7, p.y - 6*K*0.7, 8*K*0.7, 11*K*0.7);
        g.lineStyle(2, 0xc9ccd2, 1);
        g.strokeRect(p.x - 4*K*0.7, p.y - 6*K*0.7, 8*K*0.7, 11*K*0.7);
        g.fillStyle(0x8b5a3c, 1);                       // the puddle
        if(it.rest) g.fillEllipse(p.x + 7*K, p.y + 5*K*0.6, 14*K*0.8, 5*K*0.8);
      } else if(it.kind === "bag"){
        /* kraft paper bag, drawn as flat primitives in the same this.P
           space as every other spilled item — drawBagTop/drawBagBody
           live in W() space and would place it in the wrong frame
           here. Same BAG_ART palette as the held bag so it reads as
           the same object, tumbling via the shared ang/spin sim. */
        const a2 = it.ang * 0.6, bw = BAG_ART.w*K*0.8, bh = BAG_ART.h*K*0.8;
        g.save(); g.translateCanvas(p.x, p.y); g.rotateCanvas(a2);
        g.fillStyle(BAG_ART.paper, 1);
        g.fillRect(-bw/2, -bh/2, bw, bh);
        g.fillStyle(BAG_ART.paperLt, 1);
        g.fillRect(-bw/2, -bh/2, bw, bh*0.3);           // folded/rolled top
        g.lineStyle(2, BAG_ART.foldLine, 1);
        g.strokeRect(-bw/2, -bh/2, bw, bh);
        g.lineBetween(-bw/2, -bh/2 + bh*0.3, bw/2, -bh/2 + bh*0.3);
        g.restore();
      } else if(it.kind === "taco"){
        g.save(); g.translateCanvas(p.x, p.y); g.rotateCanvas(it.ang*0.5);
        g.fillStyle(0xe8c07a, 1);                       // shell half-moon
        g.slice(0, 2*K, 8*K*0.8, Math.PI, 0, false); g.fillPath();
        g.lineStyle(2, 0xc09a52, 1);
        g.slice(0, 2*K, 8*K*0.8, Math.PI, 0, false); g.strokePath();
        g.fillStyle(0x7fae4e, 1);                       // filling peeking out
        for(const fx of [-4, 0, 4]) g.fillCircle(fx*K*0.8, 0.5*K, 1.6*K);
        g.fillStyle(0xc2452e, 1); g.fillCircle(-2*K*0.8, 0.2*K, 1.2*K);
        g.restore();
      } else if(it.kind === "croissant"){
        g.save(); g.translateCanvas(p.x, p.y); g.rotateCanvas(it.ang*0.5);
        g.fillStyle(0xd9973f, 1);                       // three tapering lobes
        g.fillEllipse(0, 0, 9*K*0.8, 5.5*K*0.8);
        g.fillEllipse(-6*K*0.8, 1.5*K*0.8, 5*K*0.8, 4*K*0.8);
        g.fillEllipse(6*K*0.8, 1.5*K*0.8, 5*K*0.8, 4*K*0.8);
        g.lineStyle(1.6, 0xb0742c, 1);
        g.lineBetween(-3*K*0.8, -2*K*0.8, -2*K*0.8, 2.4*K*0.8);
        g.lineBetween(3*K*0.8, -2*K*0.8, 2*K*0.8, 2.4*K*0.8);
        g.restore();
      } else if(it.kind === "donut"){
        g.fillStyle(0xd97b9c, 1);                       // frosting ring
        g.fillCircle(p.x, p.y, 5.5*K*0.8);
        g.fillStyle(0xc9a06a, 1);                       // the hole (dough shows through)
        g.fillCircle(p.x, p.y, 2*K*0.8);
        g.lineStyle(1.4, 0xf7e8b0, 1);                  // sprinkles
        g.lineBetween(p.x-3*K, p.y-2*K, p.x-1.8*K, p.y-1.4*K);
        g.lineBetween(p.x+2*K, p.y-3*K, p.x+3*K, p.y-2.2*K);
        g.lineBetween(p.x+1*K, p.y+3*K, p.x+2.2*K, p.y+3.6*K);
      } else if(it.kind === "loaf"){
        g.save(); g.translateCanvas(p.x, p.y); g.rotateCanvas(it.ang*0.4);
        g.fillStyle(0xc98d4f, 1);
        g.fillRoundedRect(-9*K*0.8, -5*K*0.8, 18*K*0.8, 10*K*0.8, 4*K*0.8);
        g.lineStyle(1.6, 0xa06c34, 1);                  // score marks
        for(const sx of [-4, 0, 4]) g.lineBetween((sx-1.5)*K*0.8, -3*K*0.8, (sx+1.5)*K*0.8, 3*K*0.8);
        g.restore();
      } else if(it.kind === "sandwich"){
        g.save(); g.translateCanvas(p.x, p.y); g.rotateCanvas(it.ang*0.5);
        g.fillStyle(0xe8d9b0, 1);                       // triangle half
        g.fillTriangle(-7*K*0.8, 6*K*0.8, 7*K*0.8, 6*K*0.8, 7*K*0.8, -7*K*0.8);
        g.lineStyle(2, 0xc2b183, 1);
        g.strokeTriangle(-7*K*0.8, 6*K*0.8, 7*K*0.8, 6*K*0.8, 7*K*0.8, -7*K*0.8);
        g.lineStyle(2.2, 0x7fae4e, 1);                  // filling along the cut
        g.lineBetween(-5*K*0.8, 4.6*K*0.8, 5.6*K*0.8, -5*K*0.8);
        g.lineStyle(2.2, 0xd98a8a, 1);
        g.lineBetween(-3.4*K*0.8, 5.4*K*0.8, 6.2*K*0.8, -3.2*K*0.8);
        g.restore();
      } else if(it.kind === "pizzabox"){
        g.save(); g.translateCanvas(p.x, p.y); g.rotateCanvas(it.ang*0.35);
        g.fillStyle(0xd9c9a8, 1);
        g.fillRect(-11*K*0.8, -11*K*0.8, 22*K*0.8, 22*K*0.8);
        g.lineStyle(2, 0xb5a479, 1);
        g.strokeRect(-11*K*0.8, -11*K*0.8, 22*K*0.8, 22*K*0.8);
        g.lineBetween(-11*K*0.8, -5*K*0.8, 11*K*0.8, -5*K*0.8);   // lid seam
        g.fillStyle(0xc2452e, 1); g.fillCircle(0, 3*K*0.8, 2.4*K*0.8);  // logo
        g.restore();
      } else if(it.kind === "slice"){
        g.save(); g.translateCanvas(p.x, p.y); g.rotateCanvas(it.ang*0.6);
        g.fillStyle(0xe8b84f, 1);                       // cheese wedge
        g.fillTriangle(0, -8*K*0.8, -5.5*K*0.8, 6*K*0.8, 5.5*K*0.8, 6*K*0.8);
        g.lineStyle(3, 0xc98d4f, 1);                    // crust
        g.lineBetween(-5.5*K*0.8, 6*K*0.8, 5.5*K*0.8, 6*K*0.8);
        g.fillStyle(0xc2452e, 1);                       // pepperoni
        g.fillCircle(-1.4*K*0.8, 1*K*0.8, 1.5*K*0.8);
        g.fillCircle(2*K*0.8, 3.4*K*0.8, 1.5*K*0.8);
        g.fillCircle(0.4*K*0.8, -3*K*0.8, 1.3*K*0.8);
        g.restore();
      } else if(it.kind === "cone"){
        g.save(); g.translateCanvas(p.x, p.y); g.rotateCanvas(it.ang*0.5);
        g.fillStyle(0xd9a45f, 1);                       // wafer
        g.fillTriangle(0, 8*K*0.8, -4*K*0.8, -2*K*0.8, 4*K*0.8, -2*K*0.8);
        g.lineStyle(1.2, 0xb0742c, 1);
        g.lineBetween(-2.6*K*0.8, 1*K*0.8, 2.6*K*0.8, 1*K*0.8);
        g.lineBetween(-1.4*K*0.8, 4.4*K*0.8, 1.4*K*0.8, 4.4*K*0.8);
        g.fillStyle(0xf7dce8, 1);                       // the scoop (splatted once at rest)
        g.fillEllipse(0, -3.4*K*0.8, (it.rest ? 9 : 6.5)*K*0.8, (it.rest ? 5.5 : 6)*K*0.8);
        g.restore();
      } else if(it.kind === "pint"){
        g.fillStyle(0xf4f5f7, 1);
        g.fillRect(p.x - 4.5*K*0.7, p.y - 4*K*0.7, 9*K*0.7, 8*K*0.7);
        g.fillStyle(0xd97b9c, 1);                       // strawberry band
        g.fillRect(p.x - 4.5*K*0.7, p.y - 1*K*0.7, 9*K*0.7, 2.6*K*0.7);
        g.lineStyle(2, 0xc9ccd2, 1);
        g.strokeRect(p.x - 4.5*K*0.7, p.y - 4*K*0.7, 9*K*0.7, 8*K*0.7);
        g.fillStyle(0xf7dce8, 1);                       // melt puddle
        if(it.rest) g.fillEllipse(p.x + 6*K, p.y + 4*K*0.6, 11*K*0.8, 4.5*K*0.8);
      } else if(it.kind === "apple"){
        g.fillStyle(0xc23b2e, 1);
        g.fillCircle(p.x, p.y, 4.5*K*0.8);
        g.lineStyle(1.6, 0x6b4a2c, 1);                  // stem
        g.lineBetween(p.x, p.y - 4*K*0.8, p.x + 1.4*K*0.8, p.y - 6*K*0.8);
        g.fillStyle(0x7fae4e, 1);                       // leaf
        g.fillEllipse(p.x + 2.6*K*0.8, p.y - 5.4*K*0.8, 2.6*K*0.8, 1.4*K*0.8);
      } else if(it.kind === "milk"){
        g.save(); g.translateCanvas(p.x, p.y); g.rotateCanvas(it.ang*0.4);
        g.fillStyle(0xf0ece0, 1);                       // carton body
        g.fillRect(-4*K*0.8, -3*K*0.8, 8*K*0.8, 9*K*0.8);
        g.fillTriangle(-4*K*0.8, -3*K*0.8, 4*K*0.8, -3*K*0.8, 0, -7*K*0.8);   // gable top
        g.lineStyle(1.6, 0xc9c2b0, 1);
        g.strokeRect(-4*K*0.8, -3*K*0.8, 8*K*0.8, 9*K*0.8);
        g.fillStyle(0x4f7fb8, 1);                       // label band
        g.fillRect(-4*K*0.8, 0.5*K*0.8, 8*K*0.8, 2.4*K*0.8);
        g.restore();
      } else if(it.kind === "eggs"){
        g.save(); g.translateCanvas(p.x, p.y); g.rotateCanvas(it.ang*0.3);
        g.fillStyle(0xd9d2c4, 1);                       // carton
        g.fillRoundedRect(-8*K*0.8, -4*K*0.8, 16*K*0.8, 8*K*0.8, 2*K*0.8);
        g.lineStyle(1.6, 0xb0a993, 1);
        g.strokeRoundedRect(-8*K*0.8, -4*K*0.8, 16*K*0.8, 8*K*0.8, 2*K*0.8);
        g.fillStyle(0xf4f0e4, 1);                       // the dome bumps
        for(const ex of [-5, 0, 5]) g.fillCircle(ex*K*0.8, -1*K*0.8, 2*K*0.8);
        /* one casualty at rest */
        if(it.rest){ g.fillStyle(0xf2c94c, 1); g.fillCircle(9*K*0.8, 3*K*0.8, 1.8*K*0.8);
          g.fillStyle(0xf4f0e4, 0.9); g.fillEllipse(9*K*0.8, 3*K*0.8, 5.5*K*0.8, 3.5*K*0.8); }
        g.restore();
      } else if(it.kind === "parcel"){
        g.save(); g.translateCanvas(p.x, p.y); g.rotateCanvas(it.ang*0.4);
        const pw = 16*K*0.8, ph = 12*K*0.8;
        g.fillStyle(0xc9a06a, 1);
        g.fillRect(-pw/2, -ph/2, pw, ph);
        g.lineStyle(2, 0xa8824e, 1);
        g.strokeRect(-pw/2, -ph/2, pw, ph);
        g.lineStyle(2.4, 0xe8dcc4, 1);                  // packing tape cross
        g.lineBetween(0, -ph/2, 0, ph/2);
        g.lineBetween(-pw/2, 0, pw/2, 0);
        g.restore();
      } else if(it.kind === "book"){
        g.save(); g.translateCanvas(p.x, p.y); g.rotateCanvas(it.ang*0.5);
        const bw2 = 12*K*0.8, bh2 = 9*K*0.8;
        g.fillStyle(0x3f6e8f, 1);                       // cover
        g.fillRect(-bw2/2, -bh2/2, bw2, bh2);
        g.fillStyle(0xf0ece0, 1);                       // page edge
        g.fillRect(bw2/2 - 1.6*K*0.8, -bh2/2 + 1*K*0.8, 1.6*K*0.8, bh2 - 2*K*0.8);
        g.lineStyle(2, 0x2c4d63, 1);                    // spine
        g.lineBetween(-bw2/2 + 1.4*K*0.8, -bh2/2, -bw2/2 + 1.4*K*0.8, bh2/2);
        g.restore();
      } else if(it.kind === "paintcan"){
        g.fillStyle(0x9aa0aa, 1);                       // tin body
        g.fillRect(p.x - 4.5*K*0.7, p.y - 4*K*0.7, 9*K*0.7, 8.5*K*0.7);
        g.fillStyle(0xb8bdc6, 1);
        g.fillEllipse(p.x, p.y - 4*K*0.7, 9*K*0.7, 3*K*0.7);       // lid
        g.lineStyle(1.6, 0x6c727d, 1);
        g.strokeRect(p.x - 4.5*K*0.7, p.y - 4*K*0.7, 9*K*0.7, 8.5*K*0.7);
        g.fillStyle(0x3f8f7a, 1);                       // the spill at rest
        if(it.rest) g.fillEllipse(p.x + 7*K, p.y + 5*K*0.6, 13*K*0.8, 5*K*0.8);
      } else {                                          // fry
        g.fillStyle(0xf2c94c, 1);
        const a = it.ang, L = 7*K*0.7, W2 = 2.2*K*0.7;
        g.save(); g.translateCanvas(p.x, p.y); g.rotateCanvas(a);
        g.fillRect(-L/2, -W2/2, L, W2);
        g.restore();
      }
    }
    this.roll = sr;
  }

  drawBox(b, cTop, cRight, cLeft, outline=true, decal=false, cBottom=SKIN.belly){
    const {hx, hy, z0, z1} = b, ox = b.ox || 0, oy = b.oy || 0;
    const C = (sx, sy, sz) => this.P(ox + sx*hx, oy + sy*hy, sz === 1 ? z1 : z0);
    const faces = [
      { n:{x:0,y:0,z: 1}, pts:[C( 1,-1,1), C( 1, 1,1), C(-1, 1,1), C(-1,-1,1)] },
      { n:{x:0,y:0,z:-1}, pts:[C( 1,-1,0), C( 1, 1,0), C(-1, 1,0), C(-1,-1,0)] },
      { n:{x: 1,y:0,z:0}, pts:[C( 1,-1,0), C( 1, 1,0), C( 1, 1,1), C( 1,-1,1)] },
      { n:{x:-1,y:0,z:0}, pts:[C(-1,-1,0), C(-1, 1,0), C(-1, 1,1), C(-1,-1,1)] },
      { n:{x:0,y: 1,z:0}, pts:[C( 1, 1,0), C(-1, 1,0), C(-1, 1,1), C( 1, 1,1)] },
      { n:{x:0,y:-1,z:0}, pts:[C( 1,-1,0), C(-1,-1,0), C(-1,-1,1), C( 1,-1,1)] }
    ];
    for(const fc of faces){
      /* decals have no geometric top/bottom — but their SIDE faces always draw,
         even when a roll points them skyward (fixes the vanishing stripe) */
      if(decal && fc.n.z !== 0) continue;
      const w = this.R(fc.n.x, fc.n.y, fc.n.z);
      if((w.x + w.y + w.z) <= 0) continue;
      let col;
      if(w.z > 0.5)       col = decal ? cRight : cTop;
      else if(w.z < -0.5) col = decal ? null : cBottom;
      else                col = (w.x >= w.y) ? cRight : cLeft;
      if(col == null) continue;
      this.quadOn(this.g, fc.pts, col);
      if(outline) this.edgeOn(this.g, fc.pts);
    }
  }

  disc(center, r, color, outlineC){
    const pts = [];
    for(let i=0; i<14; i++){
      const a = (i/14)*Math.PI*2;
      pts.push(this.P(center.x + Math.cos(a)*r, center.y, center.z + Math.sin(a)*r));
    }
    this.quadOn(this.g, pts, color);
    if(outlineC !== undefined) this.edgeOn(this.g, pts, outlineC, 2);
  }

  drawWheel(c, sideSign){
    /* was: 6 depth-sorted flat discs stacked along the wheel's width.
       Each disc alone degenerates to a hairline exactly when residual
       yaw hits +/-45 deg (screen width is proportional to cos(yaw)-sin(yaw),
       which is zero right there) - and every turn's facing-snap sweeps
       through exactly that angle, so every corner clipped the wheels to
       slices. The scooter and traffic props (drawProp's swheel/wheel)
       never had this problem because they build the tread as a single
       convexHull spanning TWO rings offset along the width axis, instead
       of one ring's own outline - the guaranteed gap between the two
       rings contributes width independent of the collapsing term, so it
       can't go to zero. Porting that same construction here. */
    const W2 = 7.5;
    const ring = (oy, r) => {
      const pts = [];
      for(let i=0; i<14; i++){
        const a = (i/14)*Math.PI*2;
        pts.push(this.P(c.x + Math.cos(a)*r, oy, c.z + Math.sin(a)*r));
      }
      return pts;
    };
    const b0 = c.y - W2/2, b1 = c.y + W2/2;
    this.quadOn(this.g, convexHull(ring(b0, WHEEL.r).concat(ring(b1, WHEEL.r))), SKIN.wheelDark);
    const face = this.depth(c.x, b1, c.z) > this.depth(c.x, b0, c.z) ? b1 : b0;
    const faceRing = ring(face, WHEEL.r);
    this.quadOn(this.g, faceRing, SKIN.wheel);
    this.edgeOn(this.g, faceRing, SKIN.outline, 2);
    this.disc({x:c.x, y:face, z:c.z}, WHEEL.r*0.55, SKIN.wheelHubFace);
    const a = this.wheelPhase + c.x*0.2;
    this.disc({ x:c.x + Math.cos(a)*WHEEL.r*0.34, y:face,
                z:c.z + Math.sin(a)*WHEEL.r*0.34 }, 2.4, SKIN.wheelHub);
  }


  drawFlag(bobZ){
    const g = this.g;
    const L = FLAG.z1 - FLAG.z0;
    const bend = this.flagLean*0.5 + this.tipT*0.7*(this.tipDir||1);
    const seg = 6, pts = [];
    for(let i=0; i<=seg; i++){
      const s = i/seg, a = bend*s;
      pts.push(this.P(FLAG.base.x,
                      FLAG.base.y - Math.sin(a)*L*s,
                      FLAG.z0 + Math.cos(a)*L*s + bobZ));
    }
    g.lineStyle(3, SKIN.flagPole, 1);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for(let i=1; i<=seg; i++) g.lineTo(pts[i].x, pts[i].y);
    g.strokePath();
    const p = pts[seg], q = pts[seg-1];
    let dx = p.x - q.x, dy = p.y - q.y;
    const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
    g.fillStyle(SKIN.flag, 1);
    g.fillTriangle(p.x, p.y, p.x - dy*11, p.y + dx*11, p.x + dx*20, p.y + dy*20 + 4);
  }

  update(t, dt){
    /* desktop throttle */
    if(this.keys){
      if(this.keys.right.isDown || this.keys.d.isDown) this.throttle = 1;
      else if(this.keys.left.isDown || this.keys.a.isDown) this.throttle = -1;
      else if(!this.input.activePointer.isDown) this.throttle = 0;
    }
    this.drawWorld(t);
    this.drawRobot(t, dt);
    this.drawHUD();
  }

  /* next upcoming turn ahead of the robot's current position, for the
     turn-by-turn HUD. sign>0 is a CCW (angle-increasing, atan2 sense)
     rotation — in any right-handed 2D frame that's a turn toward the
     traveler's own left, independent of how the axes get projected to
     screen, so sign>0 = Left, sign<0 = Right. Small back-tolerance (20
     units) so the indicator doesn't blink away right as the robot
     enters the arc. */
  findNextTurn(){
    for(const sg of this.route.segs){
      if(sg.type === "arc" && sg.s0 > this.botS - 20) return sg;
    }
    return null;
  }
  drawHUD(){
    const g = this.hud; g.clear();
    const w = this.scale.gameSize.width, h = this.scale.gameSize.height;

    /* delivery-app style HUD: distance/ETA/turn-by-turn, replacing the
       old progress bar + live timer/cargo%. Quality (cargo%) and
       elapsed time are reported once, at the end, in showWin — not
       shown live during the trip anymore. */
    const remainDist = Math.max(0, this.route.doorS - this.botS);
    const FT_PER_UNIT = 0.6; // flavor conversion, not a real-world claim
    const distFt = remainDist * FT_PER_UNIT;
    const distText = distFt > 1000 ? (distFt/5280).toFixed(1)+" mi" : Math.round(distFt/10)*10 + " ft";

    /* delivery TIMER (replaces the ETA estimate): counts down the
       route's par time; past zero it shows the overage with a minus —
       the tip is decaying (1%/5s, see showWin) and the driver should
       feel it. */
    const remainMs = this.route.parMs - this.runT;
    const fmtMs = v => Math.floor(v/60000) + ":" + String(Math.floor((v%60000)/1000)).padStart(2,"0");
    /* two clocks in one: par countdown while there's time, then the
       CANCEL countdown through the grace window — a second, scarier
       timer instead of a mysterious negative number. */
    const timerText = remainMs >= 0
      ? fmtMs(remainMs)
      : "⚠ cancels " + fmtMs(Math.max(0, this.route.parMs + CANCEL_GRACE_MS - this.runT));

    /* mid-turn HOLD: while the robot is actually ON an arc, show just
       the current turn's arrow — no distance. findNextTurn() looks
       AHEAD, so without this the readout jumped to the next corner's
       countdown the instant the current turn began, mid-steer. The
       countdown resumes only once the robot exits onto the straight. */
    const curSeg = this.segAt(this.botS);
    let turnText;
    if(curSeg.type === "arc"){
      /* sign>0 means the heading steps f -> f+1, which under this iso
         projection reads on screen as a RIGHT turn — the old mapping
         had it backwards (on-device: "says right, robot goes left"). */
      const dir = curSeg.sign > 0 ? "Right" : "Left";
      const arrow = curSeg.sign > 0 ? "→" : "←";
      turnText = `${arrow} Turn ${dir}`;
    } else {
      const nextTurn = this.findNextTurn();
      if(nextTurn){
        const distToTurn = Math.max(0, nextTurn.s0 - this.botS);
        const dir = nextTurn.sign > 0 ? "Right" : "Left";   // same screen-handedness fix as the hold branch
        const arrow = nextTurn.sign > 0 ? "→" : "←";
        turnText = distToTurn < 20
          ? `${arrow} Turn ${dir}`
          : `${arrow} Turn ${dir} in ${Math.round(distToTurn*FT_PER_UNIT/10)*10} ft`;
      } else {
        turnText = "🏁 Straight ahead to drop-off";
      }
    }

    /* tilt meter */
    const cx = w/2, cy = 56, r = 24;
    const danger = Math.min(Math.abs(this.tilt), 1);
    g.lineStyle(5, 0xffffff, 0.55);
    g.beginPath(); g.arc(cx, cy, r, Math.PI, 0); g.strokePath();
    g.lineStyle(5, danger > 0.75 ? 0xc2452e : danger > 0.45 ? 0xff7a1a : 0x3f7d43, 1);
    g.beginPath();
    g.arc(cx, cy, r, -Math.PI/2, -Math.PI/2 + Phaser.Math.Clamp(this.tilt, -1, 1)*1.35, this.tilt < 0);
    g.strokePath();
    g.lineStyle(3, 0x2e3138, 1);
    g.lineBetween(cx, cy, cx + Math.sin(this.tilt*1.2)*r, cy - Math.cos(this.tilt*1.2)*r);

    /* cargo condition meter — separate bar under the tilt gauge (spec:
       tied to the red zone, own widget rather than fused into tilt's).
       Starts full green (pristine cargo) and DRAINS toward empty as
       damage/95 climbs -- reads as "quality remaining," not "damage
       taken," so a fresh run is visibly full rather than visibly
       blank. Cap of 95 matches the tip-deduction math (dmgPen =
       damage*0.2 in showWin), so what the player watches drain IS the
       real payout hit. No refill: unlike tilt, cargo damage is
       permanent for the run. Color still keys off raw damage fraction
       (tilt gauge's own 0.45/0.75 breakpoints) even though width now
       tracks the inverse -- a crash snaps damage to 95, which drains
       this to fully empty: nothing left, goods ruined. */
    const dmgFrac = Phaser.Math.Clamp(this.damage / 95, 0, 1);
    const qualityFrac = 1 - dmgFrac;
    const barW = 70, barH = 6, barX = cx - barW/2, barY = cy + r + 14;
    g.fillStyle(0x000000, 0.35);
    g.fillRoundedRect(barX, barY, barW, barH, barH/2);
    if(qualityFrac > 0){
      g.fillStyle(dmgFrac > 0.75 ? 0xc2452e : dmgFrac > 0.45 ? 0xff7a1a : 0x3f7d43, 1);
      g.fillRoundedRect(barX, barY, barW*qualityFrac, barH, barH/2);
    }

    /* DOM readout (see #gpsHud CSS): textContent update is cheap, the
       browser centers it, font-size:min() shrinks it on narrow screens,
       and native-DPR rendering keeps it as crisp as the overlay
       headlines it's styled after. Visible only while driving. */
    const gpsEl = document.getElementById("gpsHud");
    gpsEl.textContent = `${timerText} · ${distText} · ${turnText}`;
    gpsEl.classList.toggle("hidden", this.state !== "play");
  }
}

/* ---------- boot + panel ---------- */
const game = new Phaser.Game({
  type: Phaser.AUTO, parent: "game",
  scale: { mode: Phaser.Scale.RESIZE, width: "100%", height: "100%" },
  scene: [WorldScene]
});
const scn = () => game.scene.getScene("world");

/* one-liners under DELIVERED — the fail screen's deadpan voice, but
   winning. Single strings, not pairs: the headline is always DELIVERED. */
const WIN_LINES = [
  "Still upright. Statistically remarkable.",
  "The burrito arrives victorious.",
  "Gravity: 0 · Robot: 1.",
  "Costa Palma tips its hat.",
];

/* order cancellation: 60s of grace past par (drain stays 1%/5s — the
   tip can still pay up to ~8% if you land inside the window), then the
   customer walks. */
const CANCEL_GRACE_MS = 60000;
/* the order-canceled endings — the house fail voice, but the crime is
   lateness, not gravity. Robot stays upright; the customer just gave up. */
const CANCEL_LINES = [
  ["Order canceled.", "The customer ordered from someone with legs."],
  ["Refund issued.", "Dignity not included."],
  ["The app has unmatched you.", "It's not you. It's your ETA."],
  ["Canceled.", "The burrito grew cold waiting. So did the customer."],
];

const FAIL_LINES = [
  ["The pavement won.", "Delivery status: horizontal."],
  ["Robot down. Robot down.", "The burrito never stood a chance."],
  ["Routing error: gravity.", "A passerby is filming you. Great."],
  ["You had ONE address.", "Costa Palma claims another."],
];

function show(id){ document.getElementById(id).classList.remove("hidden"); }
function hide(id){ document.getElementById(id).classList.add("hidden"); }

/* top-down route preview for the title screen — reuses the same real
   route geometry (segsPosAt) the game itself drives on, just sampled
   flat with no iso transform, scaled/centered to fit the canvas. Colors
   pull from the day's own hood palette so it matches that day's
   in-game look rather than a fixed generic style. */
/* sizes the canvas to the actual device viewport at real device-pixel
   resolution (not just CSS-stretching a small fixed buffer, which
   would look blurry on anything bigger than the old 280x476 box) —
   the drawing-buffer size is set in real pixels (CSS size * DPR), then
   a matching transform is applied so drawRouteMap's own coordinate
   math can keep working in plain CSS-pixel units, unaware of DPR. */
function resizeRouteMap(){
  const canvas = document.getElementById("routeMap");
  if(!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const mc = document.getElementById("mapCard");
  const cssW = mc.clientWidth, cssH = mc.clientHeight;
  canvas.style.width = cssW + "px";
  canvas.style.height = cssH + "px";
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  canvas.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
}
/* tiny front-view of the actual robot for the pickup marker on the
   map, same real colors as the avatar icon SVG (SKIN.bodyTop/outline/
   visor/eye/stripe) -- canvas primitives instead of SVG since this
   draws directly onto the map canvas. */
function drawRobotMarker(ctx, x, y){
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#f7f8fa"; ctx.strokeStyle = "#30343d"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.rect(-7, -6, 14, 12); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#22242b";
  ctx.fillRect(-5, -3, 10, 4);
  ctx.fillStyle = "#7fe3ff";
  ctx.beginPath(); ctx.arc(-2.5, -1, 1, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(2.5, -1, 1, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#c2452e";
  ctx.fillRect(-7, 3, 14, 3);
  ctx.restore();
}
function drawRouteMap(route){
  const canvas = document.getElementById("routeMap");
  if(!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.clientWidth, H = canvas.clientHeight;
  ctx.clearRect(0, 0, W, H);

  const startS = route.pickupS, endS = route.doorS;
  const n = 60;
  const samples = [];
  for(let i=0; i<=n; i++){
    const s = startS + (endS-startS)*i/n;
    samples.push(segsPosAt(route.segs, s));
  }

  let minX=Infinity, maxX=-Infinity, minY=Infinity, maxY=-Infinity;
  for(const p of samples){
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  /* pad the route's own bounding box out by half a block on each side
     so nearby streets/blocks are visible as real neighborhood context,
     not just the exact corridor the route runs through. */
  const margin = BLOCK*0.5;
  minX -= margin; maxX += margin; minY -= margin; maxY += margin;

  const pad = 22;
  const availW = W - 2*pad, availH = H - 2*pad;
  let cx0 = (minX+maxX)/2, cy0 = (minY+maxY)/2;
  /* whichever axis has slack gets grown (symmetrically, staying
     centered on the route) until the box's own proportions match the
     canvas's — that's what fills the whole canvas on any route shape
     instead of leaving one axis under-filled. Since the map already
     draws from route.grid (the real street network), a bigger box just
     means more of that same real data, not distortion or fake filler. */
  let spanX = Math.max(1, maxX-minX), spanY = Math.max(1, maxY-minY);
  const targetRatio = availW / availH;
  if(spanX/spanY > targetRatio) spanY = spanX / targetRatio;
  else spanX = spanY * targetRatio;
  let scale = availW / spanX;
  /* don't keep shrinking to fit an arbitrarily long route — past this
     floor, hold the zoom level and recenter on the pickup point
     instead (guaranteed visible), letting the rest of the route run
     off-frame. A route that fits within the floor is unaffected and
     keeps the original whole-route-centered framing. */
  const MIN_SCALE = Math.min(availW, availH) / (BLOCK*4.5);
  if(scale < MIN_SCALE){
    scale = MIN_SCALE;
    spanX = availW / scale; spanY = availH / scale;
    cx0 = samples[0].x; cy0 = samples[0].y;
  }
  const toScreen = p => ({ x: W/2 + (p.x-cx0)*scale, y: H/2 + (p.y-cy0)*scale });
  const viewMinX = cx0 - spanX/2, viewMaxX = cx0 + spanX/2;
  const viewMinY = cy0 - spanY/2, viewMaxY = cy0 + spanY/2;
  const inView = (x, y) => x >= viewMinX-BLOCK && x <= viewMaxX+BLOCK && y >= viewMinY-BLOCK && y <= viewMaxY+BLOCK;

  const pal = route.pal;
  const hex = n => "#" + n.toString(16).padStart(6,"0");
  ctx.fillStyle = hex(pal.pave);
  ctx.fillRect(0, 0, W, H);

  /* real blocks from the same grid the game itself renders — housing,
     park, and commercial each get a distinct flat tone. Only blocks
     near the route are drawn, keeping it a legible neighborhood view
     instead of the whole city. Exterior lots (the perimeter houses/
     shops/parks wrapping the outside edge of the world) use a
     different field structure (ox/oy/dv/rv/len, a strip along an
     edge, not two corners) — converted to the same x0/y0/x1/y1/cx/cy
     shape as interior blocks so both draw through the same code below
     instead of needing a separate pass. */
  const lotDepth = BLOCK*0.4;
  const extRects = route.grid.extLots.map(lot => {
    const p2x = lot.ox + lot.dv.x*lot.len, p2y = lot.oy + lot.dv.y*lot.len;
    const p3x = p2x + lot.rv.x*lotDepth, p3y = p2y + lot.rv.y*lotDepth;
    const p4x = lot.ox + lot.rv.x*lotDepth, p4y = lot.oy + lot.rv.y*lotDepth;
    const xs = [lot.ox, p2x, p3x, p4x], ys = [lot.oy, p2y, p3y, p4y];
    return {
      x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys),
      cx: (lot.ox+p2x)/2 + lot.rv.x*lotDepth/2, cy: (lot.oy+p2y)/2 + lot.rv.y*lotDepth/2,
      type: lot.type
    };
  });
  const allBlocks = route.grid.blocks.concat(extRects);
  const blockColor = { housing: "#e3d4b8", park: "#8fbf7a", commercial: "#c4c8cc" };
  for(const blk of allBlocks){
    if(!inView(blk.cx, blk.cy)) continue;
    const a = toScreen({x:blk.x0, y:blk.y0}), b = toScreen({x:blk.x1, y:blk.y1});
    ctx.fillStyle = blockColor[blk.type] || "#d8d2c2";
    ctx.fillRect(Math.min(a.x,b.x), Math.min(a.y,b.y), Math.abs(b.x-a.x), Math.abs(b.y-a.y));
  }

  /* real streets from route.grid.edges */
  ctx.strokeStyle = hex(pal.road);
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  for(const e of route.grid.edges){
    if(!inView(e.a.x, e.a.y) && !inView(e.b.x, e.b.y)) continue;
    const pa = toScreen(e.a), pb = toScreen(e.b);
    ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
  }

  /* street name labels — one per row/col (not per grid-cell segment,
     which would repeat the same street's name many times). Horizontal
     streets use the hood's own real street-name pool; vertical streets
     are numbered — the common named-one-way/numbered-other-way grid
     convention most American cities actually use. */
  ctx.font = "11px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#5a5448";
  const labeledRows = new Set(), labeledCols = new Set();
  for(const e of route.grid.edges){
    const midX = (e.a.x+e.b.x)/2, midY = (e.a.y+e.b.y)/2;
    if(!inView(midX, midY)) continue;
    const p = toScreen({x:midX, y:midY});
    if(e.f === 0){
      if(labeledRows.has(e.a.j)) continue;
      labeledRows.add(e.a.j);
      const name = route.hood.streets[e.a.j % route.hood.streets.length];
      ctx.save(); ctx.translate(p.x, p.y-7); ctx.fillText(name, 0, 0); ctx.restore();
    } else {
      if(labeledCols.has(e.a.i)) continue;
      labeledCols.add(e.a.i);
      const n = e.a.i+1, suffix = (n%10===1&&n!==11) ? "st" : (n%10===2&&n!==12) ? "nd" : (n%10===3&&n!==13) ? "rd" : "th";
      ctx.save(); ctx.translate(p.x-7, p.y); ctx.rotate(-Math.PI/2); ctx.fillText(n+suffix+" St", 0, 0); ctx.restore();
    }
  }

  /* park landmarks — small icon + name on visible park blocks, pulled
     from the hood's own named park pool (same spirit as real street
     names) instead of a generic fixed list. */
  for(const blk of allBlocks){
    if(blk.type !== "park" || !inView(blk.cx, blk.cy)) continue;
    const p = toScreen({x:blk.cx, y:blk.cy});
    ctx.fillStyle = "#3f7a4a";
    ctx.beginPath(); ctx.arc(p.x, p.y-8, 7, 0, Math.PI*2); ctx.fill();
    ctx.font = "9px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("🌳", p.x, p.y-8);
    const pnameSeed = ((Math.round(blk.cx)*7919) ^ (Math.round(blk.cy)*104729)) >>> 0;
    const pname = route.hood.parks[Math.floor(mulberry32(pnameSeed)() * route.hood.parks.length)];
    ctx.fillStyle = "#2e3138"; ctx.font = "10px sans-serif";
    ctx.fillText(pname, p.x, p.y+8);
  }

  ctx.strokeStyle = "#ff7a1a";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  samples.forEach((p, i) => {
    const sp = toScreen(p);
    if(i === 0) ctx.moveTo(sp.x, sp.y); else ctx.lineTo(sp.x, sp.y);
  });
  ctx.stroke();

  const startPt = toScreen(samples[0]);
  drawRobotMarker(ctx, startPt.x, startPt.y);

  const endPt = toScreen(samples[samples.length-1]);
  ctx.fillStyle = "#c2452e";
  ctx.beginPath(); ctx.arc(endPt.x, endPt.y, 7, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
}

function showFail(pool){
  const P = pool || FAIL_LINES;
  const [m, s] = P[Math.floor(Math.random()*P.length)];
  document.getElementById("failMsg").textContent = m;
  document.getElementById("failSub").textContent = s;
  show("failOverlay");
}
function showWin(s){
  document.getElementById("winSub").textContent =
    WIN_LINES[Math.floor(Math.random()*WIN_LINES.length)];
  const cargo = Math.round(100 - s.damage);
  const secs = s.runT/1000;
  /* walk penalty: the customer walks all the way to the robot now, and
     the tip drops the further he has to come. Distance measured
     door -> robot at the moment of the win (the robot is already
     frozen); the first ~120 units are free — that's roughly a stop
     flush with the mat — then 3 cents a unit, so the worst legal stops
     (far lane, edge of the win window, ~400+ units) cost real money.
     Shown in the panel so parking tight reads as strategy. */
  /* ---------- the TIP ENGINE ----------
     A percentage of the ORDER VALUE, not a multiplier: 20% baseline.
     Deductions: cargo damage (0.2%/pt — trash the burrito, lose the
     tip), lateness past par (1% per 5s, casual for now), and the walk
     the customer makes to a badly parked robot (per unit past the
     free 120). Bonuses: flawless cargo +1%, beating par with 20% to
     spare +1% — the 22% ceiling for a perfect run. Floor 0%: mess it
     up completely and you deliver for free. */
  let walkExtra = 0;
  if(s.addrDoorDV){
    const doorX = s.addrDoorUX + s.addrDoorDV.x*s.addrDoorCenterX;
    const doorY = s.addrDoorUY + s.addrDoorDV.y*s.addrDoorCenterX;
    walkExtra = Math.max(0, Math.hypot(s.botX - doorX, s.botY - doorY) - 120);
  }
  const order = s.route.order;
  const dmgPen  = s.damage * 0.2;
  const latePen = Math.max(0, s.runT - s.route.parMs) / 5000;
  const walkPen = walkExtra * 0.008;
  let pct = 20 - dmgPen - latePen - walkPen;
  if(s.damage === 0) pct += 1;
  if(s.runT < s.route.parMs * 0.8) pct += 1;
  pct = Math.max(0, Math.min(22, pct));
  const payout = Math.round(order.value * pct) / 100;
  const pctShow = Math.round(pct);
  const cuts = [];
  if(dmgPen  >= 0.5) cuts.push(`dmg −${Math.round(dmgPen)}%`);
  if(latePen >= 0.5) cuts.push(`late −${Math.round(latePen)}%`);
  if(walkPen >= 0.5) cuts.push(`walk −${Math.round(walkPen)}%`);
  /* daily best — tip dollars ranked, time the tiebreak. Shared across
     everyone on the subreddit when running in the Devvit webview
     (tipsyBridge.active — see the bridge shim near the top of the
     script); falls back to a local-only best via localStorage in the
     standalone GitHub Pages build, exactly as before this bridge
     existed. */
  let bestRow = "";
  try {
    const key = "tipsy-best-" + s.route.dateStr;
    const prev = tipsyBridge.active
      ? tipsyBridge.best[s.route.dateStr]
      : JSON.parse(localStorage.getItem(key) || "null");
    /* `prev` (tipsyBridge.best) is today's #1 score overall, not the
       player's OWN prior run — it's only correct for the "did I just
       take the top spot" banner below. Submission must NOT be gated
       on it: a run that beats your own last score but isn't yet #1
       overall would never reach the server at all. The server already
       compares against your own prior score correctly (dbSubmitScore),
       so every completed delivery submits unconditionally and lets
       the server decide whether it's actually an improvement — cheap
       no-op there when it isn't. */
    const better = !prev || payout > prev.tip || (payout === prev.tip && s.runT < prev.ms);
    if(tipsyBridge.active){
      if(better) tipsyBridge.best[s.route.dateStr] = { tip: payout, ms: s.runT };   // optimistic — server is source of truth next load
      fetch("api/tipsy/best/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ tip: payout, ms: s.runT })
      }).catch(()=>{});
    } else if(better){
      localStorage.setItem(key, JSON.stringify({ tip: payout, ms: s.runT }));
    }
    bestRow = better
      ? `<div class="sheetRow" style="color:#3f7d43;font-size:13px">★ NEW DAILY BEST</div>`
      : `<div class="sheetRow" style="color:#8f95a1;font-size:13px">daily best $${prev.tip.toFixed(2)} · ${(prev.ms/1000).toFixed(1)}s</div>`;
  } catch(e){}
  document.getElementById("winCard").innerHTML =
    `<div class="sheetRow"><b>${s.route.address}</b>&nbsp;·&nbsp;${s.route.hood.n}</div>` +
    `<div class="sheetRow" style="color:#8f95a1;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;text-align:center">${order.text} · $${order.value.toFixed(2)}</div>` +
    `<div class="sheetRow">time <b>${secs.toFixed(1)}s</b>&nbsp;·&nbsp;cargo <b>${cargo}%</b>&nbsp;·&nbsp;tip <b>${pctShow}% · $${payout.toFixed(2)}</b>${cuts.length ? `&nbsp;<span style="color:#8f95a1">(${cuts.join(", ")})</span>` : ""}</div>` +
    bestRow;
  /* Again anchors to the MEASURED panel, not a CSS constant: the
     receipt's height varies (order length, deduction notes, the
     daily-best row), and the old fixed bottom was budgeted for the
     original two-row card — every growth spurt parked the button on
     the text again (on-device, twice now). 16px above the real top,
     the same clearance GO keeps over the map sheet. */
  /* ORDER MATTERS: show() first. Measuring while the overlay is still
     display:none reads offsetHeight = 0, which parked Again at
     bottom:16px — on top of the stats (on-device, the bug's third
     costume). Once display flips, layout is synchronous and the
     measurement is real. */
  show("winOverlay");
  const cardEl = document.getElementById("winCard");
  const againBtn = document.querySelector("#winOverlay .btn");
  if(againBtn) againBtn.style.bottom = (cardEl.offsetHeight + 16) + "px";
}

window.addEventListener("resize", () => {
  const s = scn();
  if(s && s.route) { resizeRouteMap(); drawRouteMap(s.route); }
});
document.getElementById("startBtn").addEventListener("click", () => {
  hide("titleOverlay");
  scn().state = "play";
});
document.getElementById("retryBtn").addEventListener("click", () => {
  hide("failOverlay");
  const s = scn(); s.loadRoute(s.route.dateStr); s.state = "play";
});
document.getElementById("againBtn").addEventListener("click", () => {
  hide("winOverlay");
  const s = scn(); s.loadRoute(s.route.dateStr); s.state = "play";
});
document.getElementById("todayBtn").addEventListener("click", e => {
  document.getElementById("rerollBtn").classList.remove("on");
  e.target.classList.add("on");
  hide("failOverlay"); hide("winOverlay");
  show("titleOverlay");
  scn().loadRoute(new Date().toISOString().slice(0,10));
});
document.getElementById("rerollBtn").addEventListener("click", e => {
  document.getElementById("todayBtn").classList.remove("on");
  e.target.classList.add("on");
  hide("failOverlay"); hide("winOverlay");
  const off = 1 + Math.floor(Math.random()*3650);
  const d = new Date(Date.now() + off*86400000);
  show("titleOverlay");
  scn().loadRoute(d.toISOString().slice(0,10));
});
document.getElementById("panelToggle").addEventListener("click", () => {
  const collapsed = document.getElementById("panel").classList.toggle("hidden");
  document.getElementById("panelToggle").classList.toggle("flipped", collapsed);
});
document.addEventListener("keydown", e => {
  if(IS_DEVVIT_BUILD) return;
  if(e.key.toLowerCase() !== "h") return;
  const toggle = document.getElementById("panelToggle");
  const fullyHidden = toggle.classList.toggle("hidden");
  document.getElementById("panel").classList.toggle("hidden", fullyHidden);
});

