/* Ekspedisi Borneo Purba — live 3D dioramas.
   Replaces the static scene pictures (img/tN.webp) with small looping three.js scenes.
   Built from the same toy-diorama kit as sumber-animasi-diorama3d/world4.js.
   If WebGL is unavailable the original pictures simply stay. */
(function(){
if(!window.THREE)return;

// ===== core =====
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const eIO=p=>p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;
let seed=7;const rnd=()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const rr=(a,b)=>a+(b-a)*rnd();
THREE.ColorManagement.legacyMode=false;
const MATS={};
function mat(c,o={}){const k=c+JSON.stringify(o);if(MATS[k])return MATS[k];return MATS[k]=new THREE.MeshStandardMaterial(Object.assign({color:c,flatShading:true,roughness:.85,metalness:0},o))}
function mesh(geo,c,o={}){const m=new THREE.Mesh(geo,typeof c==='object'&&c.isMaterial?c:mat(c,o.mat||{}));m.castShadow=o.cast!==false;m.receiveShadow=!!o.recv;if(o.p)m.position.set(...o.p);if(o.r)m.rotation.set(...o.r);if(o.s)Array.isArray(o.s)?m.scale.set(...o.s):m.scale.setScalar(o.s);return m}
const G=()=>new THREE.Group();

// ===== day & night cycle =====
// one shared clock for every diorama; ?cycle=20 speeds it up for previewing
const QS=new URLSearchParams(location.search);
const num=(k,d)=>{const v=parseFloat(QS.get(k));return Number.isFinite(v)?v:d};
const DAY=Math.max(8,num('cycle',60)); // seconds for one full day
const AT=Number.isFinite(num('at',NaN))?(num('at',0)%1+1)%1:null; // ?at=0.53 freezes the time of day (preview)
const WIN=new THREE.MeshStandardMaterial({color:'#6B4226',flatShading:true,roughness:.8,emissive:'#FFB84A',emissiveIntensity:0});
const WIN_G=new THREE.MeshStandardMaterial({color:'#2E8A57',flatShading:true,roughness:.8,emissive:'#FFD27A',emissiveIntensity:0});
const WATERS=[],W_DAY=new THREE.Color('#5ED0F2'),W_DUSK=new THREE.Color('#7E9CF0'),W_SHEEN=new THREE.Color('#FF8E6E'),W_BLUE=new THREE.Color('#3A62D8'),W_MOON=new THREE.Color('#1C3470'),W_GLOW=new THREE.Color(),W_NIGHT=new THREE.Color('#2F5BAE');
const waterMat=o=>{const m=new THREE.MeshStandardMaterial(Object.assign({color:'#5ED0F2',flatShading:true},o));WATERS.push(m);return m};
const FLY=new THREE.MeshBasicMaterial({color:'#FFF3A0',transparent:true,opacity:0,depthWrite:false});
// phase, sun colour, sun strength, sky, ground, ambient, night, dusk, sun height°, sun bearing°
const KEYS=[
 [0.00,'#FFA86A',1.05,'#FFD2A8','#8A7A98',.58,.2 ,.55,12,-150], // sunrise
 [0.08,'#FFF1DC',1.5,'#FFFFFF','#8E9FB8',.78,0  ,0  ,40,-125], // morning
 [0.42,'#FFF1DC',1.5,'#FFFFFF','#8E9FB8',.78,0  ,0  ,50,-60 ], // afternoon
 [0.52,'#FF8A3D',1.45,'#FFB77A','#9A6A6A',.66,.05,.9 ,16,-25 ], // sunset
 [0.58,'#F06A8A',.7 ,'#C47CC8','#44407A',.46,.5 ,.6 ,9 ,-10 ], // dusk
 [0.64,'#A8BEFF',.6 ,'#7384C8','#2C3260',.42,1  ,0  ,38,-70 ], // night (moonlight)
 [0.92,'#A8BEFF',.6 ,'#7384C8','#2C3260',.42,1  ,0  ,38,-110],
 [1.00,'#FFA86A',1.05,'#FFD2A8','#8A7A98',.58,.2 ,.55,12,-150]].map(k=>[k[0],new THREE.Color(k[1]),k[2],new THREE.Color(k[3]),new THREE.Color(k[4]),...k.slice(5)]);
const LIT={sun:new THREE.Color(),sky:new THREE.Color(),gnd:new THREE.Color(),sunI:1.5,hemiI:.78,night:0,dusk:0,dir:new THREE.Vector3()};
function daylight(p){let k=0;while(k<KEYS.length-2&&p>=KEYS[k+1][0])k++;const A=KEYS[k],B=KEYS[k+1],u0=(p-A[0])/(B[0]-A[0]),u=u0*u0*(3-2*u0),L=(i)=>A[i]+(B[i]-A[i])*u;
 LIT.sun.lerpColors(A[1],B[1],u);LIT.sky.lerpColors(A[3],B[3],u);LIT.gnd.lerpColors(A[4],B[4],u);LIT.sunI=L(2);LIT.hemiI=L(5);LIT.night=L(6);LIT.dusk=L(7);
 const el=Math.max(10,L(8))*Math.PI/180,az=L(9)*Math.PI/180;LIT.dir.set(Math.cos(el)*Math.sin(az),Math.sin(el),Math.cos(el)*Math.cos(az));
 WIN.emissiveIntensity=WIN_G.emissiveIntensity=LIT.night*1.5;const wc=W_DAY.clone().lerp(W_DUSK,LIT.dusk*.45).lerp(W_NIGHT,LIT.night*.6);W_GLOW.setRGB(0,0,0).lerp(W_BLUE,LIT.dusk*.7).lerp(W_SHEEN,LIT.dusk*.12).lerp(W_MOON,LIT.night*.3);WATERS.forEach(m=>{m.color.copy(wc);m.emissive.copy(W_GLOW)});FLY.opacity=LIT.night*.95;return LIT}
const Box=(a,b,c)=>new THREE.BoxGeometry(a,b,c),Cyl=(a,b,h,n=8)=>new THREE.CylinderGeometry(a,b,h,n),Sph=(r,a=10,b=8)=>new THREE.SphereGeometry(r,a,b),Cone=(r,h,n=6)=>new THREE.ConeGeometry(r,h,n);
function add(parent,...c){c.forEach(x=>parent.add(x));return parent}
function at(obj,x,y,z,ry=0,s){obj.position.set(x,y,z);obj.rotation.y=ry;if(s!=null)obj.scale.setScalar(s);return obj}
function shade(hex,a){let c=hex.replace('#','');const n=[0,2,4].map(i=>parseInt(c.substr(i,2),16));return '#'+n.map(v=>{v=a<0?v*(1+a):v+(255-v)*a;return Math.round(clamp(v,0,255)).toString(16).padStart(2,'0')}).join('')}
const lerpA=(a,b,k)=>{let d=b-a;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;return a+d*k};

// per-scene animation registry
let CUR=null;
function U(fn){CUR.upd.push(fn)}
const NOFIT=o=>{o.userData.nofit=true;return o};

// ===== palette (matches the quiz pictures) =====
const C={grass:'#A6E36E',grass2:'#86C95A',lip:'#6DBE4F',soil:'#8C5A2E',soil2:'#6B4423',sand:'#F3E0A8',water:'#5ED0F2',bed:'#7FD3EA',
 wood:'#9C6A3F',wood2:'#7A4E2D',leaf:'#3E9A52',leaf2:'#5BB463',roof:'#B8652E',white:'#FFFFFF',stone:'#D9D6CE',gold:'#E9B23A'};
const SKIN=['#C98A5E','#B57A4F','#D9A07A','#A86C43','#E0AE86'];
const FACE=Math.PI/4; // facing the camera

// ===== board: a toy tile made of grass / sand / water parts =====
// parts: [{r:[x0,z0,x1,z1],k:'grass'|'sand'|'water'|'tile',floor,op}]
function board(w,d,parts,o={}){const g=G();parts=parts||[{r:[-w/2,-d/2,w/2,d/2],k:'grass'}];
 parts.forEach((pt,i)=>{const [x0,z0,x1,z1]=pt.r,pw=x1-x0,pd=z1-z0,cx=(x0+x1)/2,cz=(z0+z1)/2;
  if(pt.k==='water'){const fl=pt.floor??-.6;
   add(g,mesh(Box(pw,.12,pd),pt.bed||C.bed,{p:[cx,fl-.06,cz],recv:true,cast:false}));
   const vol=mesh(Box(pw,-.14-fl,pd),waterMat({transparent:true,opacity:pt.op??.55,depthWrite:false,roughness:.3}),{p:[cx,(fl-.14)/2,cz],cast:false});vol.renderOrder=2;add(g,vol);
   const s=water(pw,pd,{op:pt.op!=null?Math.min(.9,pt.op+.25):.85});s.position.set(cx,-.12,cz);add(g,s);
   add(g,mesh(Box(pw,2.8+fl-.12,pd),C.soil,{p:[cx,(fl-.12-2.8)/2,cz],cast:false}))}
  else{const top=pt.c||(pt.k==='sand'?C.sand:pt.k==='tile'?'#F4F1EA':C.grass);
   add(g,mesh(Box(pw,.6,pd),top,{p:[cx,-.3,cz],recv:true,cast:false}),mesh(Box(pw,2.2,pd),C.soil,{p:[cx,-1.7,cz],cast:false}));
   add(g,mesh(Box(pw+.02,.14,pd+.02),pt.k==='sand'?'#D9C28A':pt.k==='tile'?'#C9C4B8':C.lip,{p:[cx,-.66,cz],cast:false}));
   if(pt.k==='grass'){seed=Math.round(pw*pd*7+i*13+(o.seed||0));const n=o.tufts===0?0:Math.round(pw*pd*.12);for(let k=0;k<n;k++)add(g,mesh(Cone(.08,.26,4),C.grass2,{p:[rr(x0+.3,x1-.3),.12,rr(z0+.3,z1-.3)],cast:false}))
    if(o.tufts!==0)for(let k=0;k<Math.min(7,Math.round(pw*pd/18));k++){const f=NOFIT(new THREE.Mesh(Sph(.07,6,4),FLY));const fx=rr(x0+.6,x1-.6),fz=rr(z0+.6,z1-.6),ph=rr(0,6);add(g,f);U(t=>{f.position.set(fx+.5*Math.sin(t*.7+ph),.7+.35*Math.sin(t*1.3+ph*2),fz+.5*Math.cos(t*.6+ph));f.scale.setScalar(.6+.5*Math.max(0,Math.sin(t*3+ph)))})}}}});
 add(g,mesh(Box(w-.3,.5,d-.3),C.soil2,{p:[0,-3.05,0],cast:false}));
 CUR.board={w,d};return g}
function water(w,d,o={}){const geo=new THREE.PlaneGeometry(w,d,Math.max(2,Math.round(w*1.3)),Math.max(2,Math.round(d*1.3)));geo.rotateX(-Math.PI/2);
 const m=mesh(geo,waterMat({roughness:.25,metalness:.05,transparent:true,opacity:o.op??.85}),{cast:false,recv:true});m.renderOrder=3;
 const base=geo.attributes.position.array.slice();U(t=>{const a=geo.attributes.position.array;for(let i=0;i<a.length;i+=3){a[i+1]=base[i+1]+Math.sin(base[i]*.9+t*1.6)*.05+Math.cos(base[i+2]*1.1+t*1.3)*.04}geo.attributes.position.needsUpdate=true;geo.computeVertexNormals()});return m}
// a raised islet sitting in water; top at y=.3
function islet(w,d){const g=G();add(g,mesh(Box(w+.5,.7,d+.5),C.sand,{p:[0,-.3,0],recv:true}),mesh(Box(w,.3,d),C.grass,{p:[0,.15,0],recv:true}),mesh(Box(w+.02,.08,d+.02),C.lip,{p:[0,.02,0],cast:false}));return g}
// flowing river ribbon along a centre line (flat, on grass)
function river(pts,wid){const L=[],R=[];for(let i=0;i<pts.length;i++){const a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)];let dx=b[0]-a[0],dz=b[1]-a[1];const n=Math.hypot(dx,dz);dx/=n;dz/=n;L.push([pts[i][0]-dz*wid/2,pts[i][1]+dx*wid/2]);R.push([pts[i][0]+dz*wid/2,pts[i][1]-dx*wid/2])}
 const sh=new THREE.Shape();L.forEach((p,i)=>i?sh.lineTo(p[0],p[1]):sh.moveTo(p[0],p[1]));R.slice().reverse().forEach(p=>sh.lineTo(p[0],p[1]));
 const geo=new THREE.ShapeGeometry(sh);geo.rotateX(Math.PI/2);const g=G();add(g,mesh(geo,waterMat({side:THREE.DoubleSide,roughness:.3}),{p:[0,.03,0],cast:false,recv:true}));
 // foam dashes drifting downstream
 const seg=[];let T=0;for(let i=1;i<pts.length;i++){const l=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);seg.push([T,l,i]);T+=l}
 const posAt=u=>{let d=u*T;for(const [s,l,i] of seg){if(d<=s+l){const k=(d-s)/l;return [pts[i-1][0]+(pts[i][0]-pts[i-1][0])*k,pts[i-1][1]+(pts[i][1]-pts[i-1][1])*k,Math.atan2(-(pts[i][1]-pts[i-1][1]),pts[i][0]-pts[i-1][0])]}}return [...pts[pts.length-1],0]};
 for(let i=0;i<Math.round(T/1.4);i++){const f=mesh(Box(.45,.03,.07),'#E9FAFF',{cast:false});add(g,f);const ph=i/Math.round(T/1.4),off=((i*37)%10/10-.5)*wid*.5;
  U(t=>{const u=(ph+t*.035)%1,[x,z,a]=posAt(u);f.position.set(x+Math.sin(a)*off,.06,z+Math.cos(a)*off);f.rotation.y=a;f.scale.x=Math.sin(u*Math.PI)})}
 g.userData.posAt=posAt;return g}

// ===== nature =====
function tree(s=1,c=C.leaf){const g=G();add(g,mesh(Cyl(.12,.18,1.1,6),C.wood2,{p:[0,.55,0]}),mesh(new THREE.IcosahedronGeometry(.85,0),c,{p:[0,1.6,0],s:[1,1.15,1]}),mesh(new THREE.IcosahedronGeometry(.6,0),shade(c,.15),{p:[.35,2.2,.1]}));g.scale.setScalar(s);return g}
function pine(s=1,c=C.leaf2){const g=G();add(g,mesh(Cyl(.1,.14,.6,6),C.wood2,{p:[0,.3,0]}),mesh(Cone(.8,1.4,7),c,{p:[0,1.2,0]}),mesh(Cone(.6,1.1,7),shade(c,.1),{p:[0,1.9,0]}));g.scale.setScalar(s);return g}
function fruitTree(s=1){const g=tree(s,'#4FAE5E');seed=Math.round(s*97);for(let i=0;i<6;i++){const a=i/6*Math.PI*2;add(g,mesh(Sph(.13,6,5),'#F2913D',{p:[Math.cos(a)*.75,1.5+rr(-.2,.4),Math.sin(a)*.75]}))}return g}
function palm(s=1){const g=G();let y=0;for(let i=0;i<6;i++){add(g,mesh(Cyl(.13,.16,.55,6),'#8A6A45',{p:[i*.06,y+.27,0],r:[0,0,-.06]}));y+=.52}
 const top=G();top.position.set(.36,y,0);for(let k=0;k<7;k++){const f=mesh(Box(1.7,.06,.36),k%2?'#3E9A52':'#4FAE5E',{p:[.8,-.2,0],r:[0,0,-.35]});const p=G();p.rotation.y=k/7*Math.PI*2;add(p,f);add(top,p)}add(g,top);g.userData.top=top;g.scale.setScalar(s);return g}
function mountain(r,h,c,n=8){const geo=new THREE.ConeGeometry(r,h,n,2);const p=geo.attributes.position;seed=Math.round(r*h*13);for(let i=0;i<p.count;i++){if(p.getY(i)<h/2-.01){p.setX(i,p.getX(i)*rr(.85,1.12));p.setZ(i,p.getZ(i)*rr(.85,1.12))}}geo.computeVertexNormals();return mesh(geo,c,{p:[0,h/2,0]})}
function hill(r,h,c){return mesh(new THREE.SphereGeometry(r,14,6,0,Math.PI*2,0,Math.PI/2),c,{s:[1,h/r,1],recv:true})}
function cloud(s=1){const g=G();[[0,0,0,1],[.9,-.1,.2,.75],[-.9,-.15,-.1,.7],[.3,.35,-.2,.7]].forEach(q=>add(g,mesh(new THREE.IcosahedronGeometry(q[3],1),'#FFFFFF',{p:q.slice(0,3),cast:false})));g.scale.setScalar(s);return g}
function sway(o,amp=.035,sp=1.3){const ph=rnd()*6;U(t=>{o.rotation.z=amp*Math.sin(t*sp+ph);o.rotation.x=amp*.6*Math.cos(t*sp*.8+ph)});return o}
function palmSway(p){const ph=rnd()*6;U(t=>{p.userData.top.rotation.z=.08*Math.sin(t*1.4+ph);p.userData.top.rotation.x=.05*Math.cos(t*1.1+ph)});return p}
function bird(c='#3A3542'){const g=G(),wl=G(),wr=G();add(g,mesh(Box(.14,.1,.4),c,{cast:false}),wl,wr);add(wl,mesh(Box(.5,.03,.18),c,{p:[-.25,0,0],cast:false}));add(wr,mesh(Box(.5,.03,.18),c,{p:[.25,0,0],cast:false}));g.userData.w=[wl,wr];return NOFIT(g)}

// ===== objects =====
function lathe(pts,c,o={}){return mesh(new THREE.LatheGeometry(pts.map(p=>new THREE.Vector2(p[0],p[1])),o.seg||14),c,{mat:o.mat||{flatShading:false}})}
const pot=(c='#C8733D',s=1)=>{const m=lathe([[0,0],[.34,.04],[.46,.3],[.4,.6],[.2,.78],[.22,.9],[.26,.94]],c,{mat:{flatShading:false,roughness:.8}});m.scale.setScalar(s);return m};
function prism(len,h,depth,c){const sh=new THREE.Shape();sh.moveTo(-depth/2,0);sh.lineTo(depth/2,0);sh.lineTo(0,h);sh.lineTo(-depth/2,0);const geo=new THREE.ExtrudeGeometry(sh,{depth:len,bevelEnabled:false});geo.translate(0,0,-len/2);geo.rotateY(Math.PI/2);return mesh(geo,c)}
function hut(o={}){const g=G();const w=o.w||2,d=o.d||1.6,h=o.h||1.1,st=o.stilt??.8;
 [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(q=>add(g,mesh(Cyl(.07,.07,st,5),C.wood2,{p:[q[0]*(w/2-.1),st/2,q[1]*(d/2-.1)]})));
 add(g,mesh(Box(w,h,d),o.wall||'#D8A66A',{p:[0,st+h/2,0]}),mesh(Box(w+.2,.1,d+.2),C.wood2,{p:[0,st,0]}));
 const roof=prism(w+.4,.9,d+.3,o.roof||C.roof);roof.position.set(0,st+h,0);add(g,roof);add(g,mesh(Box(.3,.55,.04),C.wood2,{p:[0,st+.3,d/2+.01]}));if(w>1.4)[-1,1].forEach(k=>add(g,mesh(Box(.32,.3,.04),WIN,{p:[k*(w/2-.38),st+h*.58,d/2+.01],cast:false})));
 if(st>.3){const lad=mesh(Box(.3,st+.2,.08),C.wood2,{p:[.4,st/2,d/2+.3],r:[-.45,0,0]});add(g,lad)}return g}
function longhouse(len=10){const g=G();const st=1.1,h=1.2,d=2.4;for(let i=0;i<=8;i++)for(const z of[-1,1])add(g,mesh(Cyl(.08,.08,st,5),C.wood2,{p:[-len/2+.2+i*(len-.4)/8,st/2,z*(d/2-.15)]}));
 add(g,mesh(Box(len,.12,d+1.2),'#B98A55',{p:[0,st,.6]}),mesh(Box(len,h,d),'#D8A66A',{p:[0,st+h/2,-.1]}));
 for(let i=0;i<7;i++)add(g,mesh(Box(.4,.5,.04),WIN,{p:[-len/2+1+i*(len-2)/6,st+.6,d/2-.08]}));
 const r=prism(len+.6,1.3,d+1.6,C.roof);r.position.set(0,st+h,0);add(g,r);
 const lad=G();add(lad,mesh(Box(.3,1.6,.12),C.wood2));lad.position.set(len/2-1,.6,d/2+1.3);lad.rotation.x=-.5;add(g,lad);return g}
function flag(c,h=2.2){const g=G();add(g,mesh(Cyl(.05,.05,h,5),C.wood2,{p:[0,h/2,0]}));const sh=new THREE.Shape();sh.moveTo(0,0);sh.lineTo(1,-.3);sh.lineTo(0,-.6);const cl=mesh(new THREE.ShapeGeometry(sh),c,{mat:{side:THREE.DoubleSide}});cl.position.set(.05,h-.05,0);const cp=G();add(cp,cl);add(g,cp);
 const ph=rnd()*6;U(t=>{cp.rotation.y=.35*Math.sin(t*3.2+ph)+.1*Math.sin(t*7.1+ph);cl.scale.y=1+.08*Math.sin(t*5+ph)});return g}
function boat(o={}){const g=G();const sh=new THREE.Shape();sh.moveTo(-1.6,.4);sh.quadraticCurveTo(-1.2,-.1,-.8,-.2);sh.lineTo(.9,-.2);sh.quadraticCurveTo(1.4,-.1,1.7,.5);sh.lineTo(-1.6,.4);
 const hull=new THREE.ExtrudeGeometry(sh,{depth:.9,bevelEnabled:false});hull.translate(0,0,-.45);add(g,mesh(hull,o.c||'#9C6A3F'));
 if(o.sail!==false){add(g,mesh(Cyl(.05,.05,2.6,5),C.wood2,{p:[0,1.6,0]}));const s2=new THREE.Shape();s2.moveTo(0,0);s2.lineTo(1.2,0);s2.lineTo(0,2);const sl=mesh(new THREE.ShapeGeometry(s2),'#FFF3DE',{p:[.06,.6,0],mat:{side:THREE.DoubleSide}});add(g,sl);
  add(g,mesh(Box(.8,.05,.05),'#C8352B',{p:[.45,1.5,.01]}));const ph=rnd()*6;U(t=>{sl.scale.x=1+.06*Math.sin(t*2.4+ph)})}
 const cargo=G();add(g,cargo);g.userData.cargo=cargo;return g}
function gem(c){return mesh(new THREE.OctahedronGeometry(.6,0),c,{mat:{emissive:c,emissiveIntensity:.35,roughness:.2,metalness:.3,flatShading:true},s:[1,1.35,1]})}
function sign(c){const g=G();add(g,mesh(Cyl(.05,.05,1.3,5),C.wood2,{p:[0,.65,0]}),mesh(Box(.9,.4,.08),c,{p:[0,1.2,0]}));return g}
function basket(c='#B98A55',fill='#F2D16B'){const g=G();add(g,lathe([[0,0],[.28,.02],[.36,.36],[.38,.4],[0,.4]],c,{mat:{roughness:.9}}),mesh(Sph(.3,8,5),fill,{p:[0,.36,0],s:[1,.35,1],cast:false}));return g}
function mat_(r=.8){return mesh(Cyl(r,r,.05,16),'#E8C98A',{p:[0,.03,0],recv:true,cast:false})}
function dots(from,to,n=9,y=.05){const g=G();for(let i=0;i<n;i++){const k=(i+.5)/n;const d=mesh(Sph(.07,6,4),'#FFFFFF',{cast:false,p:[from[0]+(to[0]-from[0])*k,y,from[1]+(to[1]-from[1])*k]});add(g,d);U(t=>{d.scale.setScalar(.6+.5*Math.max(0,Math.sin(t*3-i*.7)))})}return g}

// ===== toy person (legs + arms on pivots so they can walk / work) =====
function person(o={}){o=Object.assign({skin:SKIN[0],shirt:'#E4573D',pants:'#3A4A6B',hair:'#2A1C14',hs:'short',s:.8},o);const g=G(),body=G();add(g,body);
 const legs=[-1,1].map(k=>{const L=G();L.position.set(k*.14,.9,0);add(body,L);if(!o.sarong)add(L,mesh(Cyl(.12,.11,.85,7),o.pants,{p:[0,-.45,0]}));add(L,mesh(Box(.2,.1,.3),o.bare?o.skin:'#3A2E2A',{p:[0,-.85,.05]}));return L});
 if(o.sarong){add(body,mesh(Cyl(.3,.36,.85,10),o.sarong,{p:[0,.45,0]}));if(o.sarongPat)add(body,mesh(Cyl(.365,.37,.08,10),o.sarongPat,{p:[0,.2,0]}))}
 const up=G();up.position.y=.9;add(body,up);const Y=-.9;
 add(up,mesh(Cyl(.3,.34,.8,10),o.shirt,{p:[0,1.25+Y,0]}));
 if(o.belt)add(up,mesh(Cyl(.345,.345,.09,10),o.belt,{p:[0,.93+Y,0]}));
 if(o.trim)add(up,mesh(Box(.06,.78,.02),o.trim,{p:[0,1.25+Y,.325]}),mesh(Cyl(.32,.32,.06,10),o.trim,{p:[0,1.05+Y,0]}));
 const arm=k=>{const a=G();a.position.set(k*.4,1.58+Y,0);add(a,mesh(Cyl(.1,.09,.35,6),o.shirt,{p:[0,-.16,0]}),mesh(Cyl(.08,.075,.4,6),o.skin,{p:[0,-.5,0]}),mesh(Sph(.1,8,6),o.skin,{p:[0,-.72,0]}));const hand=G();hand.position.set(0,-.74,0);add(a,hand);a.userData.hand=hand;add(up,a);return a};
 const aL=arm(-1),aR=arm(1);
 const head=G();head.position.set(0,2.08+Y,0);add(up,head);
 add(head,mesh(Sph(.42,16,12),o.skin,{mat:{flatShading:false,roughness:.7}}));
 if(o.hs!=='none'){add(head,mesh(new THREE.SphereGeometry(.445,16,10,0,Math.PI*2,0,Math.PI*.46),o.hair,{mat:{flatShading:false},r:[-.25,0,0]}));
  if(o.hs==='long')add(head,mesh(Box(.8,.7,.2),o.hair,{p:[0,-.25,-.25]}));if(o.hs==='bun')add(head,mesh(Sph(.16,8,6),o.hair,{p:[0,.45,-.2]}))}
 const eyes=G();add(head,eyes);[-1,1].forEach(k=>{add(eyes,mesh(Sph(.07,8,6),'#1E1A22',{p:[k*.15,.04,.38],cast:false}),mesh(Sph(.025,6,4),'#FFFFFF',{p:[k*.15+.02,.07,.44],cast:false}))});
 [-1,1].forEach(k=>add(head,mesh(Sph(.07,8,6),'#F08A80',{p:[k*.25,-.1,.33],s:[1,.6,.4],cast:false})));
 add(head,mesh(new THREE.TorusGeometry(.08,.018,4,10,Math.PI),'#5A1E26',{p:[0,-.14,.39],r:[0,0,Math.PI],cast:false}));
 if(o.hat)add(head,o.hat());
 g.scale.setScalar(o.s);g.rotation.y=FACE;
 const P=Object.assign(g,{aL,aR,body,up,head,eyes,legs});
 const ph=rnd()*6;U(t=>{up.position.y=.9+.025*Math.sin(t*2.8+ph);const q=((t+ph*1.37)%3.4);eyes.scale.y=q<.15?.15:1});
 return P}
const HATS={
 iban:()=>{const h=G();add(h,mesh(new THREE.TorusGeometry(.43,.07,5,14),'#C8352B',{p:[0,.12,0],r:[Math.PI/2,0,0]}));[-.12,.12].forEach((x,i)=>{add(h,mesh(Cone(.07,1.1,5),'#1C1A22',{p:[x,.8,-.1],r:[0,0,i?-.18:.18]}),mesh(Cone(.05,.2,5),'#FFFFFF',{p:[x+(i?.1:-.1),1.34,-.1],r:[0,0,i?-.18:.18]}))});return h},
 terendak:()=>mesh(Cone(.95,.5,12),'#E7B863',{p:[0,.48,0]}),
 kayan:()=>{const h=G();add(h,mesh(Cyl(.85,.85,.06,14),'#E7B863',{p:[0,.3,0]}),mesh(Cone(.42,.4,12),'#DDA955',{p:[0,.5,0]}),mesh(new THREE.TorusGeometry(.4,.04,4,14),'#2F6FD0',{p:[0,.36,0],r:[Math.PI/2,0,0]}));return h},
 kenyah:()=>{const h=G();add(h,mesh(new THREE.TorusGeometry(.43,.07,5,14),'#F6D743',{p:[0,.14,0],r:[Math.PI/2,0,0]}),mesh(Cone(.07,.9,5),'#4E9A4A',{p:[.25,.7,-.1],r:[0,0,-.3]}));return h},
 kelabit:()=>{const h=G();add(h,mesh(new THREE.SphereGeometry(.46,14,8,0,Math.PI*2,0,Math.PI*.42),'#F2D07A',{r:[-.2,0,0]}));for(let i=0;i<8;i++){const a=i/8*Math.PI*2;add(h,mesh(Sph(.06,6,4),['#C8352B','#2F6FD0'][i%2],{p:[Math.sin(a)*.4,.22,Math.cos(a)*.4]}))}return h},
 tengkolok:(c='#E9A92A')=>()=>{const h=G();add(h,mesh(Cyl(.44,.47,.3,10),c,{p:[0,.3,0]}),mesh(Cone(.2,.4,4),c,{p:[.28,.55,0],r:[0,0,-.5]}));return h},
 band:c=>()=>mesh(new THREE.TorusGeometry(.43,.06,5,14),c,{p:[0,.14,0],r:[Math.PI/2,0,0]}),
 bucket:()=>{const h=G();add(h,mesh(Cyl(.7,.7,.05,14),'#B99561',{p:[0,.28,0]}),mesh(Cyl(.38,.44,.35,12),'#CDAA73',{p:[0,.45,0]}));return h},
 cap:c=>()=>{const h=G();add(h,mesh(new THREE.SphereGeometry(.45,12,8,0,Math.PI*2,0,Math.PI*.45),c,{r:[-.15,0,0]}),mesh(Sph(.07,6,4),'#C8352B',{p:[0,.47,-.05]}));return h}};
const legsTo=(p,a)=>{p.legs[0].rotation.x=a;p.legs[1].rotation.x=-a};

// ===== looping routes =====
// pts: [x,z,wait,face]; the route closes back to the first point
function route(pts,speed){const segs=[];let T=0;const n=pts.length;
 for(let i=0;i<n;i++){const a=pts[i],b=pts[(i+1)%n];if(a[2]){segs.push({w:1,t0:T,d:a[2],a,i});T+=a[2]}const d=Math.hypot(b[0]-a[0],b[1]-a[1]);if(d>1e-3){segs.push({w:0,t0:T,d:d/speed,a,b,i});T+=d/speed}}
 return {segs,T}}
function sample(R,t){const tt=((t%R.T)+R.T)%R.T;let s=R.segs[R.segs.length-1];for(const q of R.segs)if(tt>=q.t0&&tt<q.t0+q.d){s=q;break}const u=clamp((tt-s.t0)/s.d);
 if(s.w)return {s,u,x:s.a[0],z:s.a[1],ang:s.a[3]};const x=s.a[0]+(s.b[0]-s.a[0])*u,z=s.a[1]+(s.b[1]-s.a[1])*u;return {s,u,x,z,dx:s.b[0]-s.a[0],dz:s.b[1]-s.a[1]}}
function walk(p,pts,speed=1.1,o={}){const R=route(pts,speed);
 U(t=>{const r=sample(R,t+(o.off||0));p.position.x=r.x;p.position.z=r.z;if(o.y!=null)p.position.y=o.y;
  if(!r.s.w){p.rotation.y=lerpA(p.rotation.y,Math.atan2(r.dx,r.dz),.25);const sw=Math.sin(t*8)*.55;legsTo(p,sw);if(!o.arms){p.aL.rotation.x=sw*.7;p.aR.rotation.x=-sw*.7}}
  else{legsTo(p,0);if(r.ang!=null)p.rotation.y=lerpA(p.rotation.y,r.ang,.15);if(!o.arms){p.aL.rotation.x*=.8;p.aR.rotation.x*=.8}}
  o.cb&&o.cb(r,t)});return R}
function sail(b,pts,speed=1.2,o={}){const R=route(pts,speed);const y0=o.y??-.05;
 U(t=>{const r=sample(R,t+(o.off||0));b.position.x=r.x;b.position.z=r.z;b.position.y=y0+.06*Math.sin(t*2.2);b.rotation.z=.05*Math.sin(t*1.7);
  if(!r.s.w)b.rotation.y=lerpA(b.rotation.y,Math.atan2(-r.dz,r.dx),.08);o.cb&&o.cb(r,t)});return R}
function bobble(b,y0=-.05){const ph=rnd()*6;U(t=>{b.position.y=y0+.07*Math.sin(t*2+ph);b.rotation.z=.06*Math.sin(t*1.6+ph);b.rotation.x=.03*Math.sin(t*1.3+ph)});return b}
const toward=(x0,z0,x1,z1)=>Math.atan2(x1-x0,z1-z0);

// ===== the scenes (index = picture number tN) =====
const SC=[];
const BORNEO=[[470,20],[505,62],[560,88],[625,118],[688,150],[700,192],[648,232],[664,280],[692,302],[622,322],[590,362],[562,420],[618,452],[578,484],[540,524],[520,584],[498,642],[468,700],[440,742],[380,730],[300,720],[240,742],[170,722],[118,672],[58,622],[20,560],[12,500],[42,440],[92,402],[160,362],[232,330],[300,272],[352,200],[402,148],[432,88]];

// t0 — Borneo purba (home map): island, drifting clouds, a trading boat sailing round
SC[0]=g=>{add(g,board(30,30,[{r:[-15,-15,15,15],k:'water',op:.6}]));
 const k=.026,pts=BORNEO.map(p=>new THREE.Vector2((p[0]-360)*k,-(p[1]-380)*k));const shp=new THREE.Shape(pts);
 const mk=(s,dep,c,y)=>{const geo=new THREE.ExtrudeGeometry(shp,{depth:dep,bevelEnabled:true,bevelSize:.2,bevelThickness:.15,bevelSegments:1});geo.rotateX(-Math.PI/2);const m=mesh(geo,c,{recv:true});m.scale.set(s,1,s);m.position.y=y;return m};
 add(g,mk(1.05,.35,C.sand,-.2),mk(1,.6,'#7FCB5E',-.05));
 const inside=(x,z)=>{let c=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const a=pts[i],b=pts[j];if(((a.y>-z)!=(b.y>-z))&&(x<(b.x-a.x)*(-z-a.y)/(b.y-a.y)+a.x))c=!c}return c};
 seed=4;let n=0;while(n<70){const x=rr(-9,9),z=rr(-9.5,9.5);if(!inside(x*1.1,z*1.1))continue;const t=(n%3?pine:tree)(rr(.32,.48),[C.leaf,C.leaf2,'#2F8446'][n%3]);at(t,x,.65,z,rr(0,6));add(g,sway(t,.03));n++}
 [[540,90],[500,170],[420,260],[360,330]].forEach((p,i)=>{const m=mountain(.9+(i==0)*.3,1.6+(i==0)*.9,'#5E8F63');m.position.set((p[0]-360)*k,.6+m.position.y,(p[1]-380)*k);add(g,m)});
 [[230,560,'#F29A38'],[560,150,'#9B6BE0']].forEach((q,i)=>{const m=gem(q[2]);at(m,(q[0]-360)*k,2.6,(q[1]-380)*k);add(g,m);U(t=>{m.rotation.y=t*1.2;m.position.y=2.6+.25*Math.sin(t*2+i)})});
 for(let i=0;i<4;i++){const c=NOFIT(cloud(rr(.9,1.3)));const z0=rr(-11,11),y0=rr(5,6.5),sp=rr(.5,.8),ph=rr(0,34);add(g,c);U(t=>{c.position.set(((t*sp+ph)%34)-17,y0,z0)})}
 const b=boat({});b.scale.setScalar(.55);add(g,b);const ring=[];for(let i=0;i<16;i++){const a=i/16*Math.PI*2;ring.push([Math.cos(a)*11.8,Math.sin(a)*11.8])}sail(b,ring.reverse(),1.4,{y:-.1})};

// t1 — Bukit Tengkorak: potter shapes pots, a trader carries them to the boat
SC[1]=g=>{add(g,board(16,11,[{r:[-8,-5.5,2.5,5.5],k:'grass'},{r:[2.5,-5.5,8,-1.5],k:'grass'},{r:[2.5,-1.5,8,5.5],k:'water'}]));
 const h=hill(3.4,1.9,'#8FD467');h.position.set(-2.5,0,-1.5);add(g,h);const hy=(x,z)=>1.9*Math.sqrt(Math.max(0,1-((x+2.5)**2+(z+1.5)**2)/3.4**2));
 [[-3.6,-2.6],[-2.4,-.4],[-1.2,-2.2],[-3.8,-.6],[-2.4,-3.9]].forEach(q=>{add(g,at(pot('#C8733D',.55),q[0],hy(q[0],q[1])-.05,q[1]))});
 [[-7,-4],[-6.5,2.5],[1,-4.5],[4.5,-4.5]].forEach((q,i)=>add(g,sway(at(i%2?pine(.8):tree(.75),q[0],0,q[1],i))));
 // potter at the wheel
 const pt=person({shirt:'#C8733D',sarong:'#8A5A2B',sarongPat:'#F6D743',bare:true,hs:'long',skin:SKIN[1]});at(pt,-1.6,0,2.4,toward(-1.6,2.4,-.9,3.1));add(g,pt);
 const wheel=G();at(wheel,-1.05,0,3.05);add(g,wheel);add(wheel,mesh(Cyl(.35,.4,.35,10),C.wood2,{p:[0,.17,0]}));const wp=pot('#D98B4A',.5);wp.position.y=.35;add(wheel,wp);
 U(t=>{wp.rotation.y=t*4;pt.aL.rotation.x=-.9+.12*Math.sin(t*6);pt.aR.rotation.x=-.9+.12*Math.sin(t*6+1);pt.head.rotation.x=.25});
 // jetty + boat with cargo of pots
 add(g,mesh(Box(2.2,.12,.7),C.wood,{p:[3.4,.02,1.8]}));[2.6,3.4,4.2].forEach(x=>add(g,mesh(Cyl(.06,.06,.7,5),C.wood2,{p:[x,-.3,2.15]})));
 const b=boat({});at(b,5.6,-.05,1.9,Math.PI*.1,.7);add(g,bobble(b));[[-.7,0],[-.3,.2],[.1,-.1]].forEach(q=>add(b.userData.cargo,at(pot('#C8733D',.4),q[0],.25,q[1])));
 // trader: carries a pot from the hill down to the jetty, returns empty-handed
 const tr=person({shirt:'#2E8A57',pants:'#3A4A6B',skin:SKIN[3],hat:HATS.band('#F6D743')});add(g,tr);const cp=pot('#C8733D',.45);cp.position.set(0,1.35-.9,.45);add(tr.up,cp);
 walk(tr,[[-.4,.9,1.2,FACE],[3.9,1.8,1.4,Math.PI/2]],1.1,{arms:1,cb:r=>{const out=r.s.i===0&&!r.s.w||(r.s.i===1&&r.s.w&&r.u<.5);cp.visible=out;const aa=out?-1.1:0;tr.aL.rotation.x=out?aa:Math.sin(performance.now()/125)*.4*(r.s.w?0:1);tr.aR.rotation.x=out?aa:-tr.aL.rotation.x}})};

// t2 — Chu-Po: a boat ships iron from the Chu-Po port to Funan & Champa and back
SC[2]=g=>{add(g,board(16,11,[{r:[-8,-5.5,8,5.5],k:'water',op:.6}]));
 const A=islet(6,3.4);at(A,-3.6,0,-3.4);add(g,A);const B=islet(6,3.4);at(B,3.4,0,3.1);add(g,B);
 [[-5.8,-4.3],[-1.6,-4.2],[-4.4,-2.4]].forEach((q,i)=>add(g,sway(at(tree(.6),q[0],.3,q[1],i))));[[6,4.2],[2.2,4.2],[2.4,2.6]].forEach((q,i)=>add(g,sway(at(tree(.6),q[0],.3,q[1],i))));
 [['#9B6BE0',-5,-3.2],['#E0524A',-2.4,-3]].forEach((q,i)=>{const f=flag(q[0],1.8);at(f,q[1],.3,q[2]);add(g,f)});
 add(g,at(hut({w:1.9,d:1.5,stilt:.5,roof:'#B8652E'}),4.4,.3,3.4,0));
 add(g,mesh(Box(1.6,.1,.6),C.wood,{p:[.2,.25,1.7]}));
 const b=boat({});b.scale.setScalar(.65);add(g,b);const ing=b.userData.cargo;[[-.8,0],[-.4,.15],[-.6,-.2]].forEach(q=>add(ing,mesh(Box(.5,.16,.22),'#6F7380',{p:[q[0],.3,q[1]],r:[0,.3,0]})));
 add(g,dots([-.2,.9],[-3,-1.2],10));
 sail(b,[[.1,.8,1.6],[-3.2,-1.1,1.6]],1.1,{y:-.08,cb:r=>{ing.visible=(r.s.i===0&&!r.s.w)||(r.s.i===0&&r.s.w)}})};

// t3 — Santubong abad ke-7: a local trader shows forest goods to a Chinese trader at the jetty
SC[3]=g=>{add(g,board(16,11,[{r:[-8,-5.5,3,5.5],k:'grass'},{r:[3,-5.5,8,-.8],k:'grass'},{r:[3,-.8,8,5.5],k:'water'}]));
 const mt=mountain(2.8,3.8,'#9D86C9',4);mt.position.set(-2.6,1.9,-3.4);mt.rotation.y=Math.PI/4;add(g,mt);
 [[-6.8,-4.2],[1.2,-4.3],[-.2,-2.6]].forEach((q,i)=>add(g,sway(at(i%2?pine(.75):tree(.75),q[0],0,q[1]))));
 const spots=[[-4.9,.2],[-3.4,1.2],[-1.9,2.2],[-.4,3.2],[1.1,4.1]];spots.forEach(q=>add(g,at(mat_(.7),q[0],0,q[1])));
 const it=[G(),G(),G(),G(),G()];spots.forEach((q,i)=>{at(it[i],q[0],0,q[1]);add(g,it[i])});
 add(it[0],basket('#B98A55','#FFFFFF'));[[-.15,.5,.1],[.1,.55,-.1],[0,.6,.05]].forEach(p=>add(it[0],mesh(new THREE.OctahedronGeometry(.1,0),'#F7F7FF',{p})));
 [0,1,2].forEach(i=>add(it[1],mesh(Cyl(.14,.14,1.2,7),i==1?'#8E4B2A':'#A35A33',{p:[0,.15+(i==1)*.2,(i-1)*.25+(i==1)*.13],r:[0,0,Math.PI/2]})));
 [[-.2,-.1],[0,.15],[.2,-.05],[-.05,-.25]].forEach(q=>add(it[2],mesh(Cyl(.07,.07,.4,7),'#FFF4D6',{p:[q[0],.2,q[1]]}),mesh(Cone(.03,.08,5),'#FFB23F',{p:[q[0],.45,q[1]],cast:false})));
 [[-.2,0],[.2,.1]].forEach(q=>add(it[3],at(pot('#E6A93A',.35),q[0],0,q[1])));
 add(it[4],mesh(Sph(.5,8,5),'#8A6A3A',{p:[0,.05,0],s:[1,.35,1.2]}),mesh(Sph(.47,8,5),'#B7934E',{p:[0,.09,0],s:[.8,.3,1]}));
 add(g,mesh(Box(2.4,.12,.8),C.wood,{p:[4.2,.02,.6]}));[3.4,4.2,5].forEach(x=>add(g,mesh(Cyl(.06,.06,.7,5),C.wood2,{p:[x,-.3,.95]})));
 const tb=G();at(tb,3.8,0,-2.2,Math.PI/4);add(g,tb);add(tb,mesh(Box(1.8,.1,.8),C.wood,{p:[0,.7,0]}));[[-.8,-.3],[.8,-.3],[-.8,.3],[.8,.3]].forEach(q=>add(tb,mesh(Box(.1,.7,.1),C.wood2,{p:[q[0],.35,q[1]]})));
 [-.55,0,.55].forEach(x=>add(tb,lathe([[0,0],[.12,0],[.25,.15],[.28,.2],[0,.2]],'#F4F8FF',{mat:{flatShading:false,roughness:.3}}).translateX(x).translateY(.75)));
 const b=boat({});at(b,5.6,-.05,2.2,Math.PI*.15,.7);add(g,bobble(b));
 const cn=person({shirt:'#2F6FD0',pants:'#1E2B45',skin:SKIN[4],hat:HATS.cap('#1E2B45')});at(cn,4.6,.08,.4,toward(4.6,.4,2.5,1.5));add(g,cn);
 U(t=>{const talk=(t%9)>5.3&&(t%9)<8;cn.aR.rotation.x=talk?-.9+.25*Math.sin(t*6):0;cn.aR.rotation.z=talk?.2:0});
 const tr=person({shirt:'#E4573D',sarong:'#8A5A2B',sarongPat:'#F6D743',bare:true,skin:SKIN[3],hat:HATS.band('#F6D743')});add(g,tr);
 walk(tr,[[-5.7,-.6,1,FACE],[-4,0,.8],[-2.5,1,.8],[-1,2,.8],[.5,3,.8],[2.6,1.6,2.8,toward(2.6,1.6,4.6,.4)]],1.2,{cb:(r,t)=>{if(r.s.w&&r.s.i===5){tr.aR.rotation.x=-.8+.25*Math.sin(t*6);tr.aL.rotation.x=-.3;tr.head.rotation.x=0}else if(r.s.w&&r.s.i>0){tr.aR.rotation.x=-.7;tr.head.rotation.x=.3}else tr.head.rotation.x=0}})};

// t4 — Santubong abad ke-13: iron smelting — furnace, blacksmith, slag heap, archaeologist
SC[4]=g=>{add(g,board(16,11));
 const mt=mountain(2.6,3.6,'#9D86C9',4);mt.position.set(-2,1.8,-3.6);mt.rotation.y=Math.PI/4;add(g,mt);
 [[-7,-3.5],[-6.6,1.4],[3.4,4.3],[1.4,-4.4]].forEach((q,i)=>add(g,sway(at(i%2?pine(.7):tree(.7),q[0],0,q[1]))));
 const fz=G();at(fz,-4.2,0,.4,.3);add(g,fz);add(fz,lathe([[0,0],[1.1,0],[1.05,.7],[.9,1.5],[.6,2.2],[.45,2.3],[0,2.3]],'#E0662E',{mat:{flatShading:true,roughness:.9},seg:10}));
 const glow=mat('#FF7A2F',{emissive:'#FF6A1A',emissiveIntensity:1.6});add(fz,mesh(Box(.7,.8,.1),glow,{p:[0,.45,1.03],cast:false}));
 const fl=[0,1,2].map(i=>{const m=mesh(Cone(.2-.04*i,.7-.15*i,6),i==2?'#FFE08A':'#FFB23F',{mat:{emissive:i==2?'#FFD54A':'#FF8A2A',emissiveIntensity:1.4},p:[(i-1)*.16,.4,1.1],cast:false});add(fz,m);return m});
 const pl=new THREE.PointLight('#FF8A3A',1.6,7,1.5);pl.position.set(0,1.2,1.8);add(fz,pl);
 U(t=>{fl.forEach((m,i)=>m.scale.set(1,1+.3*Math.sin(t*13+i*2)*Math.sin(t*7+i),1));pl.intensity=1.5+.5*Math.sin(t*11)*Math.sin(t*5)});
 for(let i=0;i<5;i++){const sm=NOFIT(mesh(new THREE.IcosahedronGeometry(.32,0),mat('#DCD8E0',{transparent:true,opacity:.6}).clone(),{cast:false}));add(fz,sm);U(t=>{const f=((t*.28+i/5)%1);sm.position.set(Math.sin(f*6+i)*.35,2.4+f*3.2,0);sm.scale.setScalar(.5+f*1.4);sm.material.opacity=.6*(1-f)})}
 const av=G();at(av,-2.1,0,1.9);add(g,av);add(av,mesh(Box(.5,.5,.4),'#4E525E',{p:[0,.25,0]}),mesh(Box(1,.2,.45),'#5C606C',{p:[0,.6,0]}),mesh(Box(.5,.08,.25),glow,{p:[0,.74,0],cast:false}));
 const sm=person({shirt:'#2F6FD0',sarong:'#7A4E2D',sarongPat:'#C9A15E',bare:true,skin:SKIN[3],hat:HATS.band('#C8352B')});at(sm,-3,0,1.3,toward(-3,1.3,-2.1,1.9));add(g,sm);
 const hm=G();add(hm,mesh(Cyl(.04,.04,.6,5),C.wood2,{p:[0,-.3,0]}),mesh(Box(.28,.18,.18),'#6F7380',{p:[0,-.62,0]}));add(sm.aR.userData.hand,hm);
 const sp=G();at(sp,-2.1,.85,1.9);add(g,sp);for(let i=0;i<8;i++){const a=i/8*Math.PI*2;add(sp,mesh(Box(.4,.04,.04),glow,{p:[Math.cos(a)*.35,Math.abs(Math.sin(a))*.25,Math.sin(a)*.35],r:[0,-a,.4],cast:false}))}
 U(t=>{const w=Math.sin(t*8);sm.aR.rotation.x=-1.2-w*.8;sm.aL.rotation.x=-.5;const q=((t*8/(2*Math.PI))%1);sp.visible=q>.18&&q<.34;sp.scale.setScalar(.6+(q-.18)*5)});
 const slag=G();at(slag,1.6,0,1.2);add(g,slag);seed=21;for(let i=0;i<46;i++){const a=rnd()*Math.PI*2,r=Math.sqrt(rnd())*2,hh=1.1*(1-r/2.1);add(slag,mesh(new THREE.DodecahedronGeometry(rr(.2,.34),0),['#3A3542','#524C5C','#2F2A33','#645C6E'][i%4],{p:[Math.cos(a)*r,rr(0,hh)+.12,Math.sin(a)*r],r:[rnd()*3,rnd()*3,0]}))}
 const ar=person({shirt:'#C2A36B',pants:'#6B5B45',skin:SKIN[2],hat:HATS.bucket});add(g,ar);
 const mg=G();add(mg,mesh(Cyl(.03,.03,.3,5),C.wood2,{p:[0,-.15,0]}),mesh(new THREE.TorusGeometry(.16,.03,5,12),'#2A2233',{p:[0,-.42,0]}));add(ar.aR.userData.hand,mg);
 walk(ar,[[3.9,1,2,toward(3.9,1,1.6,1.2)],[2.6,3.6,2,toward(2.6,3.6,1.6,1.2)],[-.3,2.9,2,toward(-.3,2.9,1.6,1.2)]],.9,{cb:r=>{mg.visible=!!r.s.w;ar.aR.rotation.x=r.s.w?-1.3:ar.aR.rotation.x;ar.head.rotation.x=r.s.w?.35:0}});
 [['#E0524A',4.6,-3.3],['#2E8A57',5.6,-1.3],['#2F6FD0',6.5,.8]].forEach(q=>{add(g,mesh(Box(.5,.35,.5),C.wood,{p:[q[1],.17,q[2]]}));add(g,at(flag(q[0],1.8),q[1],.35,q[2]))})};

// t5 — Srivijaya & Majapahit: patrol ship sails the trade lanes between their lands
SC[5]=g=>{add(g,board(16,11,[{r:[-8,-5.5,8,5.5],k:'water',op:.6}]));
 const L=islet(5.4,3.2);at(L,-4.4,0,-3.2);add(g,L);const R=islet(4.6,3.2);at(R,4.8,0,-.4);add(g,R);const S=islet(2,1.6);at(S,.4,0,3.6);add(g,S);
 add(g,at(flag('#F2C53D',2.2),-4.2,.3,-3.2),at(flag('#C8352B',2.2),5,.3,-.2));
 [[-6.2,-4],[-2.6,-4.2]].forEach(q=>add(g,sway(at(tree(.6),q[0],.3,q[1]))));add(g,sway(at(pine(.6),6.2,.3,-1.4)));
 add(g,at(lathe([[0,0],[.55,0],[.55,.25],[.42,.3],[.42,.55],[.3,.6],[.22,.95],[.08,1.2],[0,1.25]],'#C9A15E',{mat:{roughness:.8}}),.4,.3,3.6));
 const b=boat({});b.scale.setScalar(.65);add(g,b);
 add(g,dots([-2.2,-1.2],[2.2,.3],8),dots([2.6,1.2],[1.4,2.8],4),dots([-.8,3],[-2.6,-.6],7));
 sail(b,[[-2.4,-1,1],[2.6,.6,1],[1.2,2.6,.8],[-1,2.8,.4]],1.3,{y:-.08})};

// t6 — Sambas · Brunei · Sulu: Sambas' envoy boat carries the Sarawak charter to Brunei
SC[6]=g=>{add(g,board(16,10,[{r:[-8,-5,8,2],k:'grass'},{r:[-8,2,8,5],k:'water'}]));
 const H=[['#7FBF6A',-4.6,-1.6],['#F2C53D',0,-1.3],['#E0524A',4.6,-1]];
 H.forEach(q=>{add(g,at(hut({w:2.3,d:1.8,stilt:.9,roof:q[0],wall:'#E6C48A'}),q[1],0,q[2]));add(g,mesh(Box(.6,.1,1.6),C.wood,{p:[q[1]+.3,.05,1.9]}));add(g,at(flag(q[0],1.9),q[1]+1.4,0,-.2))});
 [[-7,-4],[7,-3.6],[2.2,-4.3]].forEach(q=>add(g,sway(at(tree(.65),q[0],0,q[1]))));add(g,sway(at(pine(.6),-7,0,1)));
 const ppl=H.map((q,i)=>{const p=person({shirt:q[0],sarong:['#2E6B3A','#B8862A','#8E2C28'][i],skin:SKIN[i],hat:HATS.tengkolok(i==1?'#F2C53D':'#3A3542')});at(p,q[1]-.6,0,1,FACE);add(g,p);return p});
 const b=boat({});b.scale.setScalar(.6);add(g,b);const ch=b.userData.cargo;add(ch,mesh(Box(.55,.35,.4),'#8A4B22',{p:[-.7,.35,0]}),mesh(Box(.57,.06,.42),C.gold,{p:[-.7,.45,0]}));
 sail(b,[[-4.2,3.4,1.6],[.4,3.4,2]],1,{y:-.08,cb:(r,t)=>{ch.visible=r.s.i===0;const arrive=r.s.w&&r.s.i===1;ppl[1].aR.rotation.z=arrive?2.3+.3*Math.sin(t*9):0;const leave=r.s.w&&r.s.i===0;ppl[0].aR.rotation.z=leave?2.3+.3*Math.sin(t*9):0}})};

// t7 — Bukti purba: a visitor walks from the Moko drum to Ganesha, the gold Buddhist objects and the mosque
SC[7]=g=>{add(g,board(16,10,[{r:[-8,-5,8,5],k:'tile'}]));for(let i=-3;i<=3;i++)add(g,mesh(Box(16,.02,.04),'#DDD8CC',{p:[0,.01,i*1.4],cast:false}));
 const plinth=(x,z)=>{add(g,mesh(Box(1.7,.7,1.7),'#FFFFFF',{p:[x,.35,z]}));return .7};
 // Moko gendang gangsa
 plinth(-5,-2.4);const mk=lathe([[0,0],[.45,0],[.38,.25],[.32,.5],[.45,.75],[.55,.9],[.55,.95],[0,.95]],'#B08A3E',{mat:{roughness:.4,metalness:.5,flatShading:false}});at(mk,-5,.7,-2.4);add(g,mk);
 // Ganesha
 plinth(-1.8,-.6);const gn=G();at(gn,-1.8,.7,-.6,FACE);add(g,gn);const gs='#A8A29A';add(gn,mesh(Sph(.42,10,8),gs,{p:[0,.4,0],s:[1,1.1,.9]}),mesh(Sph(.3,10,8),gs,{p:[0,.95,.05]}),mesh(Cyl(.2,.2,.05,10),gs,{p:[-.3,1,0],r:[0,0,Math.PI/2]}),mesh(Cyl(.2,.2,.05,10),gs,{p:[.3,1,0],r:[0,0,Math.PI/2]}),
  mesh(new THREE.TorusGeometry(.2,.07,6,10,Math.PI),gs,{p:[0,.72,.28],r:[0,Math.PI/2,Math.PI/2]}),mesh(Cone(.18,.25,8),C.gold,{p:[0,1.3,.05]}));
 // gold Buddhist objects (Santubong)
 plinth(1.4,1.2);const gd=mat(C.gold,{metalness:.6,roughness:.3,emissive:'#6B4A10',emissiveIntensity:.3,flatShading:false});
 const gb=G();at(gb,1.4,.7,1.2);add(g,gb);add(gb,mesh(new THREE.LatheGeometry([[0,0],[.25,0],[.25,.1],[.18,.15],[.16,.3],[.06,.45],[0,.5]].map(p=>new THREE.Vector2(...p)),12),gd,{p:[-.35,0,0]}),mesh(Sph(.14,10,8),gd,{p:[.35,.14,0]}),mesh(Cyl(.2,.24,.12,10),gd,{p:[.35,.02,0]}));
 U(t=>{gb.rotation.y=t*.6});
 // mosque (Islam via Brunei & Sulu)
 const ms=G();at(ms,5,0,2.4);add(g,ms);add(ms,mesh(Box(2.4,1.3,2),'#FFFFFF',{p:[0,.65,0]}),mesh(new THREE.SphereGeometry(.8,14,8,0,Math.PI*2,0,Math.PI/2),gd,{p:[0,1.3,0]}),mesh(Cone(.06,.35,5),gd,{p:[0,2.25,0]}));
 [-.7,0,.7].forEach(x=>add(ms,mesh(Box(.3,.55,.04),WIN_G,{p:[x,.55,1.01]})));add(ms,mesh(Cyl(.16,.2,2.5,8),'#FFFFFF',{p:[1.5,1.25,-.6]}),mesh(Cone(.2,.5,8),gd,{p:[1.5,2.75,-.6]}));
 add(g,at(flag('#F2C53D',1.8),-.1,0,2.3),at(flag('#1E1A22',1.8),3.3,0,4.2));
 const v=person({shirt:'#2F6FD0',pants:'#3A4A6B',skin:SKIN[2],hs:'short'});add(g,v);
 walk(v,[[-3.6,-1.2,2.2,toward(-3.6,-1.2,-5,-2.4)],[-.4,.6,2.2,toward(-.4,.6,-1.8,-.6)],[2.8,2.2,2.2,toward(2.8,2.2,1.4,1.2)],[3.2,4,2.4,toward(3.2,4,5,2.4)]],1.2,{cb:(r,t)=>{v.head.rotation.x=r.s.w?-.15:0;v.aR.rotation.x=r.s.w&&r.u>.3&&r.u<.7?-1.3:v.aR.rotation.x}})};

// t8 — Ketua kaum: Iban, Kayan, Kenyah and Kelabit chiefs greet in turn before the longhouse
SC[8]=g=>{add(g,board(16,11));const lh=longhouse(10);at(lh,.5,0,-3.4,0,.78);add(g,lh);
 [[-6.8,-3.6],[6.8,-2.6]].forEach((q,i)=>add(g,sway(at(i?pine(.75):tree(.75),q[0],0,q[1]))));
 const hats=[HATS.iban,HATS.kayan,HATS.kenyah,HATS.kelabit],shirts=['#1E1A22','#F2C53D','#2F6FD0','#8A5CD6'];
 const pos=[[-5,-.2],[-2.2,1],[.6,2.2],[3.4,3.4]];
 const ch=pos.map((q,i)=>{add(g,mesh(Cyl(.6,.65,.22,16),'#FFFFFF',{p:[q[0],.11,q[1]],recv:true}));const p=person({shirt:shirts[i],sarong:i%2?null:'#7A4E2D',pants:'#3A4A6B',bare:i%2==0,skin:SKIN[i],hat:hats[i]});at(p,q[0],.22,q[1],FACE);add(g,p);return p});
 U(t=>{const c=Math.floor((t%8)/2),u=(t%2)/2;ch.forEach((p,i)=>{const on=i===c&&u<.8;p.aR.rotation.z=on?2.4+.35*Math.sin(t*10):p.aR.rotation.z*.85;p.head.rotation.y=on?.2*Math.sin(t*3):0})});
 const kid=person({shirt:'#E4573D',pants:'#3A4A6B',skin:SKIN[1],s:.55});add(g,kid);walk(kid,[[-2.8,-2.05,1.2,FACE],[3.3,-2.05,1.2,FACE]],1,{y:1.16*.78})};

// t9 — Kerajaan awal: flags of Sawaku, Kalka, Saribas, Melano along the river; manuscripts turn their pages
SC[9]=g=>{add(g,board(18,9));const cl=[];for(let i=0;i<=24;i++){const x=-9+i*18/24;cl.push([x,-.3+Math.sin(x*.55)*1.3])}const rv=river(cl,1.2);add(g,rv);
 [['#6A4BC4',-6,-2.8],['#2E8A57',-3,-1.4],['#E0524A',.4,-2.6],['#F2A23A',3.4,-2.3],['#8E2C28',6.4,-1.6]].forEach(q=>add(g,at(flag(q[0],2),q[1],0,q[2])));
 [[-7.5,-3.2],[-4.4,-3.4],[4.8,2.8],[1.4,-3.8],[7.6,2.6]].forEach((q,i)=>add(g,sway(at(i%2?pine(.6):tree(.6),q[0],0,q[1]))));
 [[-2.6,2.7],[1.6,3]].forEach((q,i)=>{const bk=G();at(bk,q[0],0,q[1],FACE);add(g,bk);add(bk,mesh(Box(1.3,.12,1),'#E8D6A8',{p:[0,.06,0]}),mesh(Box(.62,.05,.9),'#FFF8E6',{p:[-.32,.14,0],r:[0,0,.08]}),mesh(Box(.62,.05,.9),'#FFF8E6',{p:[.32,.14,0],r:[0,0,-.08]}));
  const pv=G();pv.position.set(0,.17,0);add(bk,pv);const pg=mesh(Box(.6,.02,.86),'#FFFDF4',{p:[.3,0,0],cast:false});add(pv,pg);[-.15,0,.15].forEach(z=>add(bk,mesh(Box(.4,.01,.04),'#9A8A6A',{p:[-.32,.17,z],cast:false})));
  U(t=>{const f=((t*.35+i*.5)%1);pv.rotation.z=f<.5?eIO(f*2)*Math.PI:Math.PI;pv.visible=f<.55})});
 const b=boat({sail:false,c:'#8A5A2B'});b.scale.setScalar(.45);add(g,b);const rw=person({shirt:'#F2C53D',pants:'#3A4A6B',skin:SKIN[3],s:.7});at(rw,0,.1,0,0);rw.rotation.y=Math.PI/2;add(b,rw);
 const pa=rv.userData.posAt;const path=[];for(let i=1;i<=9;i++)path.push(pa(i/10).slice(0,2));const R=route(path.concat(path.slice(1,-1).reverse()),1.3);
 U(t=>{const r=sample(R,t);b.position.set(r.x,.12+.03*Math.sin(t*3),r.z);if(!r.s.w)b.rotation.y=lerpA(b.rotation.y,Math.atan2(-r.dz,r.dx),.1);rw.aL.rotation.x=rw.aR.rotation.x=-.8+.5*Math.sin(t*4)})};

// t10 — Wakil raja: villagers bring their tax baskets to the Orang Kaya
SC[10]=g=>{add(g,board(16,11));add(g,at(hut({w:2.6,d:2,stilt:1,roof:'#F2A23A',wall:'#F4EEDC'}),-2.2,0,-3,0));
 [[-6.8,-3.6],[-6.6,1.8],[6.6,4.2]].forEach((q,i)=>add(g,sway(at(i%2?pine(.7):tree(.7),q[0],0,q[1]))));
 [['#2F6FD0',2.2,-2],['#8A5CD6',4.6,-1.3],['#F2A23A',6.4,.2]].forEach(q=>add(g,at(sign(q[0]),q[1],0,q[2],FACE)));
 const ok=person({shirt:'#2E8A57',sarong:'#8A5A2B',sarongPat:C.gold,skin:SKIN[0],hat:HATS.tengkolok()});at(ok,-2.4,0,-.6,FACE);add(g,ok);
 const pile=G();at(pile,-3.3,0,.1);add(g,pile);[[0,0],[.5,.2],[.2,-.4]].forEach(q=>add(pile,at(basket(),q[0],0,q[1],0,.8)));
 U(t=>{const c=(t%3.3);ok.head.rotation.x=c<.5?.25*Math.sin(c/.5*Math.PI):0;ok.aR.rotation.x=-.5+.2*Math.sin(t*2)});
 [[3.4,2.4],[2.2,4],[4.8,3.8]].forEach((home,i)=>{const d=[[-1.2,.6],[-1.6,1.3],[-.6,1.4]][i];const v=person({shirt:['#E4573D','#2F6FD0','#F2C53D'][i],pants:'#3A4A6B',sarong:i==1?'#8A5CD6':null,hs:i==1?'bun':'short',skin:SKIN[(i+1)%5]});add(g,v);
  const bk=basket();bk.scale.setScalar(.8);bk.position.set(0,1.2-.9,.45);add(v.up,bk);
  walk(v,[[home[0],home[1],1.4,FACE],[d[0],d[1],1.6,toward(d[0],d[1],-2.4,-.6)]],1,{off:i*2.6,arms:1,cb:(r,t)=>{const out=r.s.i===0&&!r.s.w||(r.s.i===1&&r.s.w&&r.u<.5);bk.visible=out;if(out){v.aL.rotation.x=v.aR.rotation.x=-1.1}else if(!r.s.w){const sw=Math.sin(t*8)*.4;v.aL.rotation.x=sw;v.aR.rotation.x=-sw}else{v.aL.rotation.x=v.aR.rotation.x=0}}})})};

// t11 — Sabah: a Bobohizan performs a ritual; Ketua Bebas guard the shore
SC[11]=g=>{add(g,board(16,11,[{r:[-8,-5.5,2.4,5.5],k:'grass'},{r:[2.4,-5.5,8,-.6],k:'grass'},{r:[2.4,-.6,8,5.5],k:'water'}]));
 add(g,at(hut({w:1.8,d:1.5,stilt:.7}),-3.4,0,-3.6),at(hut({w:1.8,d:1.5,stilt:.7}),-.4,0,-3.9));
 [[-6.8,-2.8],[2.4,-3.6],[-6.4,3.6]].forEach((q,i)=>add(g,sway(at(i%2?pine(.7):tree(.7),q[0],0,q[1]))));
 const bb=person({shirt:'#1E1A22',sarong:'#1E1A22',sarongPat:C.gold,trim:C.gold,belt:C.gold,hs:'bun',hair:'#1E1A22',skin:SKIN[2]});at(bb,-3.6,0,.2,FACE);add(g,bb);
 U(t=>{bb.aL.rotation.z=-(1.2+.35*Math.sin(t*2.4));bb.aR.rotation.z=1.2+.35*Math.sin(t*2.4+Math.PI);bb.rotation.y=FACE+.45*Math.sin(t*.9);bb.up.rotation.z=.08*Math.sin(t*2.4)});
 for(let i=0;i<6;i++){const m=NOFIT(mesh(new THREE.OctahedronGeometry(.08,0),mat('#FFE08A',{emissive:'#FFC53D',emissiveIntensity:1.2}),{cast:false}));add(g,m);U(t=>{const f=(t*.35+i/6)%1,a=i/6*Math.PI*2+t*.6;m.position.set(-3.6+Math.cos(a)*1.1,.4+f*2.6,.2+Math.sin(a)*1.1);m.scale.setScalar(Math.sin(f*Math.PI))})}
 [['#1E1A22',1.6,2.8],['#C8352B',3.4,-1.6]].forEach((q,i)=>{add(g,mesh(Box(.7,.4,.7),C.wood,{p:[q[1],.2,q[2]]}));const k=person({shirt:i?'#C8352B':'#E4573D',pants:'#3A4A6B',skin:SKIN[i+1],hat:HATS.tengkolok()});at(k,q[1],.4,q[2],FACE);add(g,k);add(g,at(flag(q[0],2),q[1]+.5,.4,q[2]-.3));U(t=>{k.head.rotation.y=.5*Math.sin(t*.7+i*2)})});
 const b=boat({sail:false});b.scale.setScalar(.5);add(g,b);const rw=person({shirt:'#2F6FD0',pants:'#3A4A6B',skin:SKIN[4],s:.8});rw.rotation.y=Math.PI/2;rw.position.y=.1;add(b,rw);
 sail(b,[[4.6,1.4,.5],[6.6,2.6,0],[5.8,4.6,.5],[3.8,3.8,0]],.9,{y:-.1,cb:(r,t)=>{rw.aL.rotation.x=rw.aR.rotation.x=r.s.w?0:-.8+.5*Math.sin(t*4)}})};

// t12 — Kubu di muara sungai: Syarif Osman's fort at Marudu, a guard on patrol, a perahu on the estuary
SC[12]=g=>{add(g,board(16,11,[{r:[-8,-5.5,0,5.5],k:'grass'},{r:[0,-5.5,2.2,5.5],k:'sand'},{r:[2.2,-5.5,8,5.5],k:'water'}]));
 const fc=[-2.6,-2.6];const pal=G();at(pal,fc[0],0,fc[1]);add(g,pal);for(let i=0;i<22;i++){const a=i/22*Math.PI*2;if(Math.abs(a-FACE)<.35)continue;const h=rr(1.2,1.5);add(pal,mesh(Cyl(.1,.12,h,5),C.wood,{p:[Math.sin(a)*1.9,h/2,Math.cos(a)*1.9]}),mesh(Cone(.1,.25,5),C.wood2,{p:[Math.sin(a)*1.9,h+.12,Math.cos(a)*1.9]}))}
 const tw=hut({w:1.2,d:1.2,h:.6,stilt:1.6,roof:C.wood2,wall:'#A8783F'});at(tw,0,0,-.2);add(pal,tw);add(pal,at(flag('#C8352B',1.4),.4,3.1,-.2));
 [[-6.8,-3.8],[-6.6,3.8],[-.4,-4.6]].forEach((q,i)=>add(g,sway(at(i%2?pine(.7):tree(.7),q[0],0,q[1]))));
 const so=person({shirt:'#C8352B',sarong:'#3A3542',sarongPat:C.gold,skin:SKIN[0],hat:HATS.tengkolok()});at(so,-1.6,0,.8,FACE);add(g,so);
 const spear=G();add(spear,mesh(Cyl(.03,.03,2.2,5),C.wood2,{p:[0,.3,0]}),mesh(Cone(.07,.3,5),'#B8BCC8',{p:[0,1.5,0]}));spear.rotation.x=Math.PI/2*0;add(so.aR.userData.hand,spear);U(t=>{so.aR.rotation.x=-.25;so.head.rotation.y=.35*Math.sin(t*.6)});
 [[-1,1.8],[-.4,1.3],[-.1,2.2]].forEach((q,i)=>{const f=person({shirt:'#6B4226',pants:'#3A2E2A',skin:SKIN[3],s:.55});at(f,q[0],0,q[1],FACE);add(g,f)});
 const dk=person({shirt:'#2E8A57',pants:'#3A4A6B',skin:SKIN[2],hat:HATS.tengkolok('#F2C53D')});at(dk,-5.4,0,.6,FACE);add(g,dk);
 const gd=person({shirt:'#6B4226',pants:'#3A2E2A',skin:SKIN[1],hat:HATS.band('#C8352B')});add(g,gd);const gsp=G();add(gsp,mesh(Cyl(.03,.03,1.8,5),C.wood2,{p:[0,.2,0]}),mesh(Cone(.06,.25,5),'#B8BCC8',{p:[0,1.2,0]}));add(gd.aR.userData.hand,gsp);
 const ring=[];for(let i=0;i<12;i++){const a=-i/12*Math.PI*2+Math.PI;ring.push([fc[0]+Math.sin(a)*2.7,fc[1]+Math.cos(a)*2.7])}walk(gd,ring,.9,{cb:()=>{gd.aR.rotation.x=-.2}});
 const b=boat({sail:false});b.scale.setScalar(.55);add(g,b);const rw=person({shirt:'#F2C53D',pants:'#3A4A6B',skin:SKIN[3],s:.8});rw.rotation.y=Math.PI/2;rw.position.y=.1;add(b,rw);
 sail(b,[[3.8,-3.4,.6],[6.6,-1,0],[5.6,3.4,.6],[3.4,1,0]],.95,{y:-.1,cb:(r,t)=>{rw.aL.rotation.x=rw.aR.rotation.x=r.s.w?0:-.8+.5*Math.sin(t*4)}})};

// t13 — Tiga kawasan: pedalaman · lembah sungai · pesisir pantai
SC[13]=g=>{add(g,board(20,9,[{r:[-10,-4.5,-.4,4.5],k:'grass'},{r:[-.4,-4.5,1,4.5],k:'water'},{r:[1,-4.5,10,.6],k:'sand'},{r:[1,.6,6.6,4.5],k:'sand'},{r:[6.6,.6,10,4.5],k:'water'}]));
 const m1=mountain(2.4,4.2,'#6E9A7A',6);m1.position.set(-7.4,2.1,-2);add(g,m1);const m2=mountain(1.9,3.2,'#7FAA88',6);m2.position.set(-5.4,1.6,-2.8);add(g,m2);
 [[-8.4,1.4],[-6.8,2.6],[-5.4,.4],[-8.8,3.4]].forEach(q=>add(g,sway(at(pine(.65),q[0],0,q[1]))));add(g,sway(at(tree(.6),-3.4,0,-3.6)));
 for(let i=0;i<3;i++){const pz=-2.4+i*1.5;add(g,mesh(Box(3.2,.08,1.2),'#9FDDEE',{p:[-2.6,.04,pz],recv:true,cast:false}),mesh(Box(3.3,.12,.1),C.wood,{p:[-2.6,.06,pz-.65],cast:false}));for(let x=0;x<7;x++)for(let z=0;z<3;z++)add(g,mesh(Cone(.05,.25,4),'#4FAE5E',{p:[-3.9+x*.43,.16,pz-.4+z*.4],cast:false}))}
 const fm=person({shirt:'#2F6FD0',pants:'#3A4A6B',skin:SKIN[1],hat:HATS.terendak,s:.6});at(fm,-2,.05,-.9,FACE);add(g,fm);U(t=>{const b=.6+.3*Math.sin(t*2);fm.up.rotation.x=b;fm.aL.rotation.x=fm.aR.rotation.x=-b*.9})
 const ht=person({shirt:'#8A5A2B',sarong:'#6B4226',bare:true,skin:SKIN[3],hat:HATS.band('#C8352B'),s:.6});add(g,ht);walk(ht,[[-8.6,-.2,1,FACE],[-4.4,1.8,1,FACE]],.9);
 [[2.8,-2.4],[4.6,-3.4],[4.2,-.2],[8.6,-2.8]].forEach(q=>add(g,palmSway(at(palm(.6),q[0],0,q[1],rr(0,6)))));
 [['#2E8A57',-8.8,.2],['#2F6FD0',-1.4,3.4],['#F2C53D',3,2.8]].forEach(q=>add(g,at(sign(q[0]),q[1],0,q[2],FACE)));
 const b=boat({});b.scale.setScalar(.5);add(g,b);sail(b,[[7.4,1.6,1],[9,3.6,1]],.6,{y:-.08})};

// t14 — Pedalaman: padi huma on the hill, a hunter with a blowpipe stalks a deer by the forest
SC[14]=g=>{add(g,board(16,11));const hc=[-3.4,-1.8],R=3.4,H=2;const h=hill(R,H,'#8FD467');h.position.set(hc[0],0,hc[1]);add(g,h);const hy=r=>H*Math.sqrt(Math.max(0,1-(r/R)**2));
 [2.9,2.2,1.4].forEach(r=>add(g,mesh(new THREE.TorusGeometry(r,.09,4,28),'#E8C84A',{p:[hc[0],hy(r)+.02,hc[1]],r:[Math.PI/2,0,0],cast:false})));
 const fm=person({shirt:'#C8352B',pants:'#3A4A6B',skin:SKIN[1],hat:HATS.terendak,s:.7});at(fm,hc[0]+.4,hy(.5)-.05,hc[1]+.2,FACE);add(g,fm);
 const stick=mesh(Cyl(.03,.03,1.2,5),C.wood2,{p:[0,-.3,0]});add(fm.aR.userData.hand,stick);U(t=>{const b=.35+.3*Math.max(0,Math.sin(t*2.5));fm.up.rotation.x=b;fm.aR.rotation.x=-.6-b*.6;fm.aL.rotation.x=-.2})
 seed=9;for(let i=0;i<16;i++){const x=rr(1.8,7.2),z=rr(-4.8,1.2);add(g,sway(at(i%3?tree(rr(.5,.7),i%2?C.leaf:'#2F8446'):pine(rr(.55,.7)),x,0,z,rr(0,6)),.03))}
 add(g,at(basket('#9C6A3F','#6DB85A'),-.6,0,2.2,0,1.1));
 const hn=person({shirt:'#8A5A2B',sarong:'#6B4226',sarongPat:'#F6D743',bare:true,skin:SKIN[3],hat:HATS.band('#C8352B')});add(g,hn);const bp=mesh(Cyl(.035,.035,2,6),'#6B4226',{p:[0,.9,0]});add(hn.aR.userData.hand,bp);
 const deer=G();add(g,deer);const dc='#A8703F';add(deer,mesh(Box(.9,.45,.4),dc,{p:[0,.75,0]}));const legs=[[-.35,-.13],[.35,-.13],[-.35,.13],[.35,.13]].map(q=>{const l=G();l.position.set(q[0],.55,q[1]);add(l,mesh(Cyl(.05,.04,.55,5),dc,{p:[0,-.27,0]}));add(deer,l);return l});
 const nk=G();nk.position.set(.4,.9,0);add(deer,nk);add(nk,mesh(Box(.18,.45,.18),dc,{p:[.05,.2,0],r:[0,0,-.3]}),mesh(Box(.35,.22,.2),dc,{p:[.2,.45,0]}),mesh(Cyl(.02,.02,.35,4),'#6B4226',{p:[.1,.7,.08],r:[.3,0,0]}),mesh(Cyl(.02,.02,.35,4),'#6B4226',{p:[.1,.7,-.08],r:[-.3,0,0]}));
 const DR=route([[3.2,3.6,2.5],[5.6,4.2,2.5]],.5);
 U(t=>{const r=sample(DR,t);deer.position.set(r.x,0,r.z);if(!r.s.w){deer.rotation.y=lerpA(deer.rotation.y,Math.atan2(-r.dz,r.dx),.1);legs.forEach((l,i)=>l.rotation.z=.4*Math.sin(t*7+(i%2)*Math.PI))}else legs.forEach(l=>l.rotation.z*=.8);nk.rotation.z=r.s.w?-.9+.1*Math.sin(t*4):0});
 walk(hn,[[.2,3.4,0],[1.6,2.4,2.6,toward(1.6,2.4,4.4,3.9)],[-.4,.6,1.2,FACE]],.8,{cb:(r,t)=>{const aim=r.s.w&&r.s.i===1;bp.position.set(0,aim?-.5:.9,0);hn.aR.rotation.x=aim?-1.5:hn.aR.rotation.x;hn.aL.rotation.x=aim?-1.4:hn.aL.rotation.x}})};

// t15 — Lembah sungai: padi sawah planting, vegetable plots and fruit trees by the river
SC[15]=g=>{add(g,board(16,11,[{r:[-8,-5.5,8,-3.3],k:'water'},{r:[-8,-3.3,8,5.5],k:'grass'}]));
 for(let i=0;i<3;i++)for(let j=0;j<2;j++){const x=-5.2+i*2.1,z=-1.6+j*2;add(g,mesh(Box(1.9,.06,1.8),'#9FDDEE',{p:[x,.03,z],recv:true,cast:false}));
  [[0,-.95,2,.1],[0,.95,2,.1],[-1,0,.1,1.9],[1,0,.1,1.9]].forEach(q=>add(g,mesh(Box(q[2],.12,q[3]),'#8C5A2E',{p:[x+q[0],.06,z+q[1]],cast:false})));
  for(let a=0;a<4;a++)for(let b=0;b<4;b++)add(g,mesh(Cone(.05,.28,4),'#4FAE5E',{p:[x-.6+a*.4,.16,z-.6+b*.4],cast:false}))}
 [0,1,2].forEach(i=>{const f=person({shirt:['#C8352B','#2F6FD0','#F2C53D'][i],pants:'#3A4A6B',skin:SKIN[i],hat:HATS.terendak,s:.6});add(g,f);const x0=-5.2+i*2.1,z0=-1+i*.4;
  const ph=i*1.1;U(t=>{const b=.55+.3*Math.max(0,Math.sin(t*2.2+ph));f.up.rotation.x=b;f.aL.rotation.x=f.aR.rotation.x=-b;f.position.set(x0+.5*Math.sin(t*.25+ph),.05,z0);f.rotation.y=FACE})});
 for(let a=0;a<5;a++)for(let b=0;b<4;b++)add(g,mesh(Sph(.18,6,5),a%2?'#3E9A52':'#6DB85A',{p:[1.8+a*.6,.15,2.2+b*.7],s:[1,.7,1]}));
 [[3.6,-2.6],[5.6,-1.2],[6.6,-3.2]].forEach(q=>add(g,sway(at(fruitTree(.65),q[0],0,q[1],rr(0,6)))));
 const b=boat({sail:false});b.scale.setScalar(.45);add(g,b);sail(b,[[-6.5,-4.4,.5],[6.5,-4.4,.5]],.9,{y:-.1})};

// t16 — Pesisir pantai: Melanau processes sagu, a boat is built, a Bajau diver dives for pearls
SC[16]=g=>{add(g,board(16,11,[{r:[-8,-5.5,-3.4,5.5],k:'grass'},{r:[-3.4,-5.5,2,5.5],k:'sand'},{r:[2,-5.5,8,5.5],k:'water',floor:-2.2,op:.35,bed:'#E9D9A6'}]));
 [[-6.6,-3.6],[-4.4,-4.4],[-6.8,-.6]].forEach(q=>add(g,palmSway(at(palm(.7),q[0],0,q[1],rr(0,6)))));
 // sagu: pounding the pith of the mulong log
 const log=mesh(Cyl(.3,.3,2,8),'#8A6A45',{p:[-5.2,.3,1.8],r:[0,.4,Math.PI/2]});add(g,log);add(g,at(lathe([[0,0],[.5,0],[.6,.35],[0,.35]],'#9C6A3F'),-4.4,0,3));
 const mel=person({shirt:'#E4573D',sarong:'#2F6FD0',sarongPat:'#F6D743',bare:true,skin:SKIN[1],hat:HATS.terendak});at(mel,-4.6,0,2.2,toward(-4.6,2.2,-5.2,1.8));add(g,mel);
 const pe=G();add(pe,mesh(Cyl(.05,.05,1.4,5),C.wood2,{p:[0,-.2,.2],r:[1.2,0,0]}));add(mel.aR.userData.hand,pe);U(t=>{const w=Math.max(0,Math.sin(t*4));mel.aR.rotation.x=mel.aL.rotation.x=-1.6+w*.9;mel.up.rotation.x=.1+w*.2});
 // boat builder
 const hb=boat({sail:false,c:'#C08A55'});at(hb,-1,.55,-2.6,0,.6);add(g,hb);[-1.8,-.2].forEach(x=>add(g,mesh(Box(.2,.5,.8),C.wood2,{p:[x,.25,-2.6]})));
 const bw=person({shirt:'#2F6FD0',pants:'#3A4A6B',skin:SKIN[3]});at(bw,-.7,0,-1.3,toward(-.7,-1.3,-1,-2.6));add(g,bw);
 const hm=G();add(hm,mesh(Cyl(.03,.03,.45,5),C.wood2,{p:[0,-.2,0]}),mesh(Box(.2,.12,.12),'#6F7380',{p:[0,-.45,0]}));add(bw.aR.userData.hand,hm);U(t=>{bw.aR.rotation.x=-1-.7*Math.sin(t*7);bw.aL.rotation.x=-.8});
 // sea: boat on the surface, oysters / gamat / rumpai on the sea bed
 const sb=boat({});at(sb,4.6,-.1,-2.2,.3,.6);add(g,bobble(sb,-.1));
 seed=5;for(let i=0;i<7;i++){const x=rr(2.6,7.4),z=rr(-4.8,4.8);add(g,mesh(Cone(.08,rr(.6,1),4),'#3E9A52',{p:[x,-2.2+.4,z]}))}
 [[5.6,2.4],[6.6,.8],[4.2,3.8]].forEach(q=>add(g,mesh(Sph(.25,8,5),'#9A948C',{p:[q[0],-2.15,q[1]],s:[1,.4,1]}),mesh(Sph(.08,8,6),mat('#FFFFFF',{emissive:'#FFFFFF',emissiveIntensity:.5}),{p:[q[0],-2.02,q[1]],cast:false})));
 add(g,mesh(Cyl(.12,.12,.6,8),'#5A3E2A',{p:[3.6,-2.1,1.2],r:[0,0,Math.PI/2]}));
 const dv=G();add(g,dv);const dp=person({shirt:'#2E8A57',pants:'#1E2B45',skin:SKIN[3],s:.6});dp.rotation.set(0,0,0);add(dv,dp);
 const DP=[[4.4,-.45,-.4],[5.4,-1.85,2.2],[6.6,-.45,3.2],[5.2,-.4,1]],W=[0,1.8,0,1.2];let T=0;const seg=DP.map((a,i)=>{const b=DP[(i+1)%DP.length];const d=Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2]);const s={a,b,w:W[i],t0:T,d:d/.9};T+=W[i]+d/.9;return s});
 U(t=>{const tt=t%T;let s=seg[seg.length-1];for(const q of seg)if(tt>=q.t0&&tt<q.t0+q.w+q.d){s=q;break}const lt=tt-s.t0;
  let x,y,z,pitch=0;if(lt<s.w){[x,y,z]=s.a;pitch=0}else{const u=(lt-s.w)/s.d;x=s.a[0]+(s.b[0]-s.a[0])*u;y=s.a[1]+(s.b[1]-s.a[1])*u;z=s.a[2]+(s.b[2]-s.a[2])*u;const hz=Math.hypot(s.b[0]-s.a[0],s.b[2]-s.a[2]);dv.rotation.y=lerpA(dv.rotation.y,Math.atan2(s.b[0]-s.a[0],s.b[2]-s.a[2]),.1);pitch=Math.atan2(s.b[1]-s.a[1],hz)}
  dv.position.set(x,y,z);dp.rotation.x=Math.PI/2-pitch*.8;const k=Math.sin(t*9)*.5;legsTo(dp,k);dp.aL.rotation.x=dp.aR.rotation.x=lt<s.w?-1.6+.4*Math.sin(t*5):-2.9})};

// t17 — Gua batu kapur: a collector climbs the rattan pole to the swiftlet nests; swiftlets circle
SC[17]=g=>{add(g,board(16,11));const cl=G();at(cl,-1.2,0,-2.4);add(g,cl);seed=17;
 [[0,1.6,0,2.4,1.5],[1.6,1.2,.6,1.8,1.2],[-1.8,1.3,-.4,1.9,1.4],[.4,3.2,-.4,1.8,1],[-1,3,.2,1.4,1],[1.4,2.8,-.9,1.3,.9],[-2.4,2.3,1,1.1,1.2]].forEach((q,i)=>add(cl,mesh(new THREE.DodecahedronGeometry(q[3],0),['#D9D6CE','#C9C6BD','#E4E1D8'][i%3],{p:[q[0],q[1],q[2]],s:[1,q[4],1],r:[rr(0,1),rr(0,3),0]})));
 add(cl,mesh(new THREE.CircleGeometry(.8,10),'#2A2530',{p:[1.2,1.3,1.62],r:[0,FACE*.9,0],s:[1,1.2,1],cast:false}));add(cl,sway(at(tree(.5,C.leaf2),.3,4.1,-.3)));
 const px=.9,pz=-.4;add(g,mesh(Cyl(.06,.06,4.2,5),'#7A5A2B',{p:[px,2.1,pz]}));for(let i=0;i<9;i++)add(g,mesh(Box(.5,.04,.04),'#9C7A45',{p:[px,.35+i*.45,pz],r:[0,FACE,0]}));
 const cm=person({shirt:'#2E8A57',pants:'#6B4226',skin:SKIN[3],hat:HATS.band('#C8352B')});add(g,cm);cm.rotation.y=toward(px+.4,pz+.4,px,pz);
 U(t=>{const c=t%12;let h;if(c<4)h=eIO(c/4)*2.6;else if(c<6.5)h=2.6;else if(c<10.5)h=2.6*(1-eIO((c-6.5)/4));else h=0;const cl2=c<4||(c>6.5&&c<10.5);
  cm.position.set(px+.33,h,pz+.33);const k=Math.sin(t*6);cm.aL.rotation.x=cl2?-2.4+k*.4:c>=4&&c<6.5?-2.2:0;cm.aR.rotation.x=cl2?-2.4-k*.4:c>=4&&c<6.5?-2.6+.3*Math.sin(t*5):0;legsTo(cm,cl2?k*.4:0)});
 const cb=person({shirt:'#2F6FD0',pants:'#1E2B45',skin:SKIN[1],hat:HATS.band('#1E2B45')});at(cb,2.4,0,1.8,toward(2.4,1.8,px,pz));add(g,cb);const bk=basket('#B98A55','#FFFDF0');bk.scale.setScalar(.7);bk.position.set(0,1.05-.9,.4);add(cb.up,bk);U(t=>{cb.head.rotation.x=-.35;cb.aL.rotation.x=cb.aR.rotation.x=-.9});
 for(let i=0;i<7;i++){const b=bird();add(g,b);const r0=rr(2.6,3.6),y0=rr(3.4,5),sp=rr(.7,1.1)*(i%2?1:-1),ph=rr(0,6);U(t=>{const a=t*sp+ph;b.position.set(-1.2+Math.cos(a)*r0,y0+.3*Math.sin(t*2+ph),-2.4+Math.sin(a)*r0);b.rotation.y=-a+(sp>0?0:Math.PI);const f=Math.sin(t*16+ph)*.6;b.userData.w[0].rotation.z=f;b.userData.w[1].rotation.z=-f})}
 [[5,-1.4],[5.6,1.2],[3,4.2],[-6,2.4]].forEach((q,i)=>add(g,sway(at(i%2?pine(.7):tree(.7),q[0],0,q[1]))))};

// ===== runtime: one shared renderer, one 2D canvas per view =====
let renderer=null;
try{const c=document.createElement('canvas');renderer=new THREE.WebGLRenderer({canvas:c,antialias:true,alpha:true});}catch(e){renderer=null}
if(!renderer||!renderer.getContext())return;
renderer.setPixelRatio(1);renderer.outputEncoding=THREE.sRGBEncoding;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.setClearColor(0x000000,0);
const ASPECT=1400/1064,EL=31*Math.PI/180,AZ=Math.PI/4;
const SCENES={};
function build(i){const scene=new THREE.Scene();const root=G();scene.add(root);
 const hemi=new THREE.HemisphereLight('#FFFFFF','#8E9FB8',.78);scene.add(hemi);const sun=new THREE.DirectionalLight('#FFF1DC',1.5);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.bias=-.0005;sun.shadow.normalBias=.03;scene.add(sun,sun.target);
 CUR={upd:[],board:null};SC[i](root);const rec={scene,root,hemi,sun,upd:CUR.upd,cam:new THREE.OrthographicCamera(-1,1,1,-1,.1,400),t:-1};CUR=null;
 rec.upd.forEach(f=>f(0));root.updateMatrixWorld(true);
 // fit an isometric camera to everything that isn't flagged as flying about
 const box=new THREE.Box3(),tmp=new THREE.Box3();root.traverse(o=>{if(!o.isMesh)return;for(let p=o;p;p=p.parent)if(p.userData.nofit)return;if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();tmp.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);box.union(tmp)});
 const c=box.getCenter(new THREE.Vector3()),cam=rec.cam;cam.position.set(c.x+Math.cos(EL)*Math.sin(AZ)*100,c.y+Math.sin(EL)*100,c.z+Math.cos(EL)*Math.cos(AZ)*100);cam.lookAt(c);cam.updateMatrixWorld();
 let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;const v=new THREE.Vector3();for(let k=0;k<8;k++){v.set(k&1?box.max.x:box.min.x,k&2?box.max.y:box.min.y,k&4?box.max.z:box.min.z).applyMatrix4(cam.matrixWorldInverse);x0=Math.min(x0,v.x);x1=Math.max(x1,v.x);y0=Math.min(y0,v.y);y1=Math.max(y1,v.y)}
 let hw=(x1-x0)/2*1.06,hh=(y1-y0)/2*1.06;const cx=(x0+x1)/2,cy=(y0+y1)/2;if(hw/hh>ASPECT)hh=hw/ASPECT;else hw=hh*ASPECT;Object.assign(cam,{left:cx-hw,right:cx+hw,top:cy+hh,bottom:cy-hh});cam.updateProjectionMatrix();
 const r=Math.max(box.max.x-box.min.x,box.max.z-box.min.z)*.75;sun.target.position.copy(c);rec.c=c;sun.position.set(c.x-14,c.y+22,c.z+3);Object.assign(sun.shadow.camera,{left:-r,right:r,top:r,bottom:-r,near:1,far:120});sun.shadow.camera.updateProjectionMatrix();
 return rec}
const scene3=i=>SCENES[i]||(SCENES[i]=build(i));

let views=[];const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function hydrate(){document.querySelectorAll('.scene img,.island img,.borneo img,.result>img').forEach(img=>{const m=/t(\d+)\.webp/.exec(img.getAttribute('src')||'');if(!m||!SC[+m[1]])return;
 const cv=document.createElement('canvas');cv.width=1400;cv.height=1064;cv.className=(img.className+' s3d').trim();if(img.getAttribute('style'))cv.setAttribute('style',img.getAttribute('style'));if(img.alt){cv.setAttribute('role','img');cv.setAttribute('aria-label',img.alt)}else cv.setAttribute('aria-hidden','true');
 img.replaceWith(cv);views.push({cv,ctx:cv.getContext('2d'),idx:+m[1],w:0,drawn:-1})})}
const app=document.getElementById('app');
const css=document.createElement('style');css.textContent=`.daynight{position:fixed;inset:0;z-index:0;pointer-events:none}.daynight i{position:absolute;inset:0;opacity:0}
.daynight .dusk{background:linear-gradient(180deg,#FFB35C 0%,#FF7A59 30%,#E0527E 58%,#7A4AA0 85%);mix-blend-mode:soft-light}
.daynight .glow{background:radial-gradient(120% 60% at 50% 0%,rgba(255,170,90,.55),rgba(255,120,110,.22) 45%,rgba(0,0,0,0) 75%)}
.daynight .night{background:linear-gradient(180deg,rgba(8,14,48,.86),rgba(6,22,60,.72) 60%,rgba(4,18,50,.6))}
.daynight .stars{background:radial-gradient(circle at 23% 31%,#fff 0 1.2px,transparent 1.8px) 0 0/190px 150px,radial-gradient(circle at 71% 64%,#fff 0 1px,transparent 1.6px) 40px 20px/230px 170px,radial-gradient(circle at 48% 12%,#FFF4C8 0 1.5px,transparent 2.2px) 90px 60px/310px 210px,radial-gradient(circle at 12% 78%,#fff 0 .9px,transparent 1.4px) 10px 70px/120px 110px,radial-gradient(circle at 86% 40%,#DDE8FF 0 1.1px,transparent 1.7px) 60px 5px/160px 130px;-webkit-mask-image:linear-gradient(180deg,#000 0,#000 45%,transparent 80%);mask-image:linear-gradient(180deg,#000 0,#000 45%,transparent 80%)}`;
document.head.appendChild(css);const skyEl=document.createElement('div');skyEl.className='daynight';skyEl.setAttribute('aria-hidden','true');skyEl.innerHTML='<i class="dusk"></i><i class="glow"></i><i class="night"></i><i class="stars"></i>';document.body.insertBefore(skyEl,app);
const [duskEl,glowEl,nightEl,starEl]=skyEl.children;
new MutationObserver(hydrate).observe(app,{childList:true,subtree:true});hydrate();

const t0=performance.now();let last=0;
function frame(now){requestAnimationFrame(frame);if(document.hidden||now-last<1000/40)return;last=now;
 const L=daylight(AT!=null?AT:reduced?.2:((.1+(now-t0)/1000/DAY)%1));duskEl.style.opacity=L.dusk.toFixed(3);glowEl.style.opacity=(L.dusk*.9).toFixed(3);nightEl.style.opacity=(L.night*.85).toFixed(3);starEl.style.opacity=Math.max(0,(L.night-.4)/.6).toFixed(3);
 views=views.filter(v=>v.cv.isConnected);if(!views.length)return;const t=reduced?4:(now-t0)/1000,dpr=Math.min(window.devicePixelRatio||1,1.5);
 const todo=[];for(const v of views){const r=v.cv.getBoundingClientRect();if(r.width<4||r.bottom<0||r.top>innerHeight||r.right<0||r.left>innerWidth)continue;
  const w=Math.min(1400,Math.round(r.width*dpr)),h=Math.round(w/ASPECT);if(v.w!==w){v.w=w;v.cv.width=w;v.cv.height=h;v.drawn=-1}if(reduced&&v.drawn===t)continue;todo.push([v,w,h])}
 if(!todo.length)return;const W=Math.max(...todo.map(q=>q[1])),H=Math.max(...todo.map(q=>q[2]));const sz=renderer.getSize(new THREE.Vector2());if(sz.x<W||sz.y<H)renderer.setSize(Math.max(W,sz.x),Math.max(H,sz.y),false);
 const RH=renderer.getSize(new THREE.Vector2()).y;renderer.setScissorTest(true);
 for(const [v,w,h] of todo){const rec=scene3(v.idx);if(rec.t!==t){rec.upd.forEach(f=>f(t));rec.t=t}
  rec.hemi.color.copy(L.sky);rec.hemi.groundColor.copy(L.gnd);rec.hemi.intensity=L.hemiI;rec.sun.color.copy(L.sun);rec.sun.intensity=L.sunI;rec.sun.position.copy(rec.c).addScaledVector(L.dir,26);
  renderer.setViewport(0,0,w,h);renderer.setScissor(0,0,w,h);renderer.clear();renderer.render(rec.scene,rec.cam);
  v.ctx.clearRect(0,0,w,h);v.ctx.drawImage(renderer.domElement,0,RH-h,w,h,0,0,w,h);v.drawn=t}}
requestAnimationFrame(frame);
})();
