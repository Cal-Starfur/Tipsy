import json, math
from PIL import Image, ImageDraw, ImageFont
F=json.load(open(__import__('os').path.dirname(__file__)+'/trails.json'))
def grp(m):
    k,b=m[0],m[1]
    if k=='humanoid': return 'humanoid'
    if k=='bot': return b or 'bot'
    if k=='scooter' or k=='cargo': return None
    return b or 'line'
tracks=[]  # {g, pts}
live=[]
for fi,fr in enumerate(F):
    items=[(grp(m),m[2],m[3]) for m in fr]; items=[x for x in items if x[0]]
    used=set(); nl=[]
    for tr in live:
        best=None;bd=1e9
        for j,(g,a,b) in enumerate(items):
            if j in used or g!=tr['g']: continue
            d=math.hypot(a-tr['pts'][-1][0],b-tr['pts'][-1][1])
            if d<bd: bd=d;best=j
        if best is not None and bd<140:
            used.add(best); tr['pts'].append(items[best][1:]); nl.append(tr)
        else: tracks.append(tr)
    for j,x in enumerate(items):
        if j not in used: tr={'g':x[0],'pts':[x[1:]],'f0':fi}; nl.append(tr)
    live=nl
tracks+=live
S=0.62;M=40;LW=560
W,H=int(2320*S)+2*M+LW,int(1870*S)+2*M+50
im=Image.new('RGB',(W,H),(240,238,232)); d=ImageDraw.Draw(im)
Fn=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',14); FB=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',15); FT=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',22)
P=lambda a,b:(M+a*S,M+40+b*S)
d.text((M,8),'Kickstand Scooter Co.: every robot over one full cycle (from the game)',fill=(30,30,30),font=FT)
d.rectangle([P(0,0),P(2320,1870)],fill=(214,212,206),outline=(80,80,80),width=3)
d.line([P(2320,305),P(2320,605)],fill=(240,238,232),width=8); d.text(P(2330,440),'DOOR',fill=(60,60,60),font=FB)
d.rectangle([P(720,632),P(2225,1250)],outline=(232,181,74),width=2)
C={'line':((150,150,150),'Line robots (and spares on charge)'),'amrstock':((235,140,0),'Stock robots (parts, spares, shuttle, boxes)'),
   'amrshelf':((60,100,210),'Shelf pods'),'amrjack':((150,80,190),'Pallet jacks'),'amrarm':((210,40,40),'Arm robots'),
   'amrtug':((40,150,90),'Lid tuggers'),'cgcard':((130,95,60),'Cardboard baler'),'patrolbot':((30,30,30),'Patrol bot'),'pdog':((90,90,90),'Security dog'),
   'humanoid':((200,170,40),'Humanoids')}
order=['humanoid','line','amrshelf','amrstock','amrjack','amrtug','cgcard','amrarm','patrolbot','pdog']
for g in order:
    col=C.get(g,((0,0,0),g))[0]
    for tr in tracks:
        if tr['g']!=g: continue
        pts=tr['pts']; span=max(math.hypot(a-pts[0][0],b-pts[0][1]) for a,b in pts)
        if span>15 and len(pts)>1:
            w=1 if g=='humanoid' else 3
            d.line([P(a,b) for a,b in pts],fill=col,width=w)
for g in order:
    col=C.get(g,((0,0,0),g))[0]
    for tr in tracks:
        if tr['g']!=g or tr['f0']!=0: continue
        a,b=tr['pts'][0]; x,y=P(a,b); r=4 if g=='humanoid' else 7
        if g=='humanoid': d.ellipse([x-r,y-r,x+r,y+r],fill=col,outline=(60,60,60))
        else: d.rectangle([x-r,y-r,x+r,y+r],fill=col,outline=(20,20,20))
x0=int(2320*S)+2*M+16; y=M+40
d.text((x0,y),'KEY',fill=(30,30,30),font=FB); y+=26
d.text((x0,y),'square / dot: where it is at the start',fill=(60,60,60),font=Fn); y+=20
d.text((x0,y),'line: where it goes during the cycle',fill=(60,60,60),font=Fn); y+=30
for g in order:
    if g not in C: continue
    col,lab=C[g]; d.rectangle([x0,y+3,x0+14,y+17],fill=col,outline=(20,20,20)); d.line([(x0+20,y+10),(x0+44,y+10)],fill=col,width=3)
    d.text((x0+52,y),lab,fill=(40,40,40),font=Fn); y+=24
im.save(__import__('os').path.dirname(__file__)+'/robots_map.png'); print(len(tracks), im.size)
