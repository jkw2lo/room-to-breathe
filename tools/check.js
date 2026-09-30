const C=require('../core.js');
const only=process.argv[2];
for(const d of C.LEVELS){ if(only&&d.id!==only) continue;
 const L=C.buildLevel(d); const P=C.makePieces(L); const occ=C.occupancy(L,P,null);
 const r=C.evaluate(L,P);
 console.log('==',d.id,L.W+'x'+L.H,L.errors.length?L.errors:'ok','| items',P.filter(p=>!p.fixed).length,'| empty issues',r.issues.map(i=>i.label).join(', ')||'none');
 if(!process.argv[3]) continue;
 let s='';
 for(let y=0;y<L.H;y++){for(let x=0;x<L.W;x++){const i=y*L.W+x,k=L.kind[i];
  let ch=[' ','#','.','+','E','=','O'][k]; if(k===2){ch=L.noPlace[i]?',':L.low[i]?'_':L.sky[i]?'^':'.'; if(occ.blk[i]>=0)ch='F';}
  s+=ch;} s+='\n';}
 console.log(s);
}
