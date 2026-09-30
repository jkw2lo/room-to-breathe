const C=require('../core.js');
for (const id of process.argv.slice(2)) {
  const d=C.LEVELS.find(l=>l.id===id), L=C.buildLevel(d), P=C.makePieces(L), occ=C.occupancy(L,P,null);
  console.log('==',id,L.W+'x'+L.H,'rooms:',L.rooms.map(r=>r.name+'['+r.tags.join(',')+']').join(' | '));
  console.log('items:',JSON.stringify(d.items));
  let h1='    ',h2='    ';for(let x=0;x<L.W;x++){h1+=x%10===0?String(x/10|0):' ';h2+=x%10;}console.log(h1);console.log(h2);
  for(let y=0;y<L.H;y++){let s=String(y).padStart(3)+' ';for(let x=0;x<L.W;x++){const i=y*L.W+x,k=L.kind[i];
    let ch=[' ','#','.','+','E','=','O'][k]; if(k===2){ch=L.noPlace[i]?',':L.low[i]?'_':'.'; if(occ.blk[i]>=0)ch='%'; else if(L.sky[i]) ch='^';}
    s+=ch;} console.log(s);}
}
