/* TIPSEY LETTERING (2026-11-27): the game's own letters for its name, in place of the stock display font the app icons used.
   Heavy italic stems; the lid's chamfer cut from each letter's top-left and bottom-right; each letter tipped a little off true.
   word(text, x, y, scale, gap, fill, shadow) gives an SVG group (centred on x, cap top at y, cap height 10*scale). Letters so far:
   T I P S E Y D L V R. Used for game/icon-180.png, tipsey-delivery/assets/icon.png, tools/consistency-pass-icon.png. */
const G = {
  I:{w:2.5,p:[[[1.2,0],[2.5,0],[2.5,8.8],[1.3,10],[0,10],[0,1.2]]]},
  T:{w:7,p:[[[1.2,0],[7,0],[7,2.4],[4.75,2.4],[4.75,8.8],[3.55,10],[2.25,10],[2.25,2.4],[0,2.4],[0,1.2]]]},
  L:{w:6,p:[[[1.2,0],[2.5,0],[2.5,7.6],[6,7.6],[6,8.8],[4.8,10],[0,10],[0,1.2]]]},
  E:{w:6,p:[[[1.2,0],[6,0],[6,2.3],[2.5,2.3],[2.5,3.85],[5.3,3.85],[5.3,6.15],[2.5,6.15],[2.5,7.7],[6,7.7],[6,8.8],[4.8,10],[0,10],[0,1.2]]]},
  V:{w:7,p:[[[0,1.2],[1.2,0],[2.7,0],[3.6,5.6],[4.5,0],[7,0],[5.0,8.8],[3.8,10],[2.2,10]]]},
  Y:{w:7,p:[[[0,1.2],[1.2,0],[2.7,0],[3.6,3.4],[4.5,0],[7,0],[4.75,5.4],[4.75,8.8],[3.55,10],[2.25,10],[2.25,5.4]]]},
  P:{w:6.4,p:[[[1.2,0],[5,0],[6.4,1.4],[6.4,4.8],[5,6.2],[2.5,6.2],[2.5,8.8],[1.3,10],[0,10],[0,1.2]],[[2.5,2.2],[3.9,2.2],[3.9,4.0],[2.5,4.0]]]},
  D:{w:6.6,p:[[[1.2,0],[4.6,0],[6.6,2],[6.6,8],[4.6,10],[0,10],[0,1.2]],[[2.5,2.3],[3.8,2.3],[4.1,2.6],[4.1,7.4],[3.8,7.7],[2.5,7.7]]]},
  R:{w:6.6,p:[[[1.2,0],[5,0],[6.4,1.4],[6.4,4.6],[5.4,5.6],[6.6,8.8],[6.6,10],[4.0,10],[3.0,6.2],[2.5,6.2],[2.5,8.8],[1.3,10],[0,10],[0,1.2]],[[2.5,2.2],[3.9,2.2],[3.9,4.0],[2.5,4.0]]]},
  S:{w:6.2,p:[[[1.2,0],[6.2,0],[6.2,2.3],[2.5,2.3],[2.5,3.85],[5,3.85],[6.2,5.05],[6.2,8.8],[5,10],[0,10],[0,7.7],[3.7,7.7],[3.7,6.15],[1.2,6.15],[0,4.95],[0,1.2]]]},
};
const TILT = [-3, 2.5, -1.5, 3, -2.5, 1.5, -3, 2];      // each letter a little off true: tipsy
const BOB  = [0, -0.35, 0.2, -0.25, 0.3, -0.2, 0.25, -0.3];
function word(txt, x0, y0, sc, gap, fill, shadow){
  let x = 0, out = '';
  const total = [...txt].reduce((s,c)=>s+G[c].w,0) + gap*(txt.length-1);
  [...txt].forEach((c,i)=>{
    const g = G[c], d = g.p.map(poly=>'M'+poly.map(q=>q[0].toFixed(2)+' '+q[1].toFixed(2)).join('L')+'Z').join('');
    const cx = x + g.w/2;
    const tr = `translate(${x} ${BOB[i%8]}) rotate(${TILT[i%8]} ${g.w/2} 5)`;
    out += `<g transform="${tr}"><path d="${d}" fill="${shadow}" fill-rule="evenodd" transform="translate(0.55 0.45)"/><path d="${d}" fill="${fill}" fill-rule="evenodd"/></g>`;
    x += g.w + gap;
  });
  return { svg: `<g transform="translate(${x0} ${y0}) scale(${sc}) skewX(-12) translate(${-total/2} 0)">${out}</g>`, total };
}
module.exports = { G, word };
