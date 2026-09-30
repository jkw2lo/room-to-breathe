const C=require('../core.js');const O=require('./optimal.json');
const id=process.argv[2];const d=C.LEVELS.find(l=>l.id===id);const L=C.buildLevel(d);const P=C.makePieces(L);
const mov=P.filter(p=>!p.fixed);O[id].layout.forEach((s,i)=>{[mov[i].cx,mov[i].cy,mov[i].ang]=s;mov[i].placed=true;});
const r=C.evaluate(L,P);
const g=[];for(let y=0;y<L.H;y++){g.push([]);for(let x=0;x<L.W;x++){const k=L.kind[y*L.W+x];g[y].push(k===2?(r.reach[y*L.W+x]?'.':' '):[' ','#','.','+','E','=','O'][k]);}}
const letters='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
P.forEach((p,i)=>{const c=C.CAT[p.type];for(const [x,y] of C.footprint(p).xy){ if(c.layer==='block') g[y][x]=p.fixed?'%':letters[i]; else if(c.layer==='floor'&&(g[y][x]==='.'||g[y][x]===' ')) g[y][x]='~';}});
console.log(g.map(r=>r.join('')).join('\n'));
mov.forEach((p,i)=>console.log(letters[i],p.id,'ang',p.ang,(r.pieceScore[p.idx]||0).toFixed(2)));
console.log('total',r.total.toFixed(1),r.pts);
for(const x of r.rules.filter(x=>x.s<0.9)) console.log(' -',x.pid!=null?P[x.pid].id:'',x.label,x.s.toFixed(2),x.w);
console.log(r.issues.map(i=>i.label));
