import { classifyPlayer, playerSlotScore, hungarian, slotFamily } from '../js/mapper.js';
import { SLOT_SPECS } from '../js/formations.js';
const p=(nome,pos,fp)=>({nome,pos,fp});
const arsenal=[p('D. Raya','G',1),p('J. Timber','RB',2),p('E. Konsa','CD-R',5),p('G. Magalhães','CD-L',6),p('R. Calafiori','LB',3),p('B. Guimarães','RM',8),p('D. Rice','LM',4),p('N. Madueke','AM-R',7),p('M. Ødegaard','AM',10),p('E. Eze','AM-L',11),p('K. Havertz','F',9)];
const form='3-4-2-1', specs=SLOT_SPECS[form];
const profiles=arsenal.map(st=>classifyPlayer(st.pos,form));
const scores=arsenal.map((st,p)=>specs.map((s,i)=>playerSlotScore(profiles[p],s,form,true)));
console.log('slots', specs.map((s,i)=>i+':'+s.join('/')+'('+slotFamily(s)+')').join(' '));
arsenal.forEach((st,p)=>{
  console.log(st.nome, st.pos, profiles[p].join('/'), scores[p].map((v,i)=>v===-1000000?'X':v).join(' '));
});
// find a legal assignment greedily
const used=new Set(); const pick=[];
for (let p=0;p<11;p++){
  let best=-1,bs=-1e9;
  for(let s=0;s<11;s++) if(!used.has(s)&&scores[p][s]>bs){bs=scores[p][s];best=s;}
  used.add(best); pick.push(best);
  console.log('pick',p,st=>st, arsenal[p].nome,'->',best,bs);
}
console.log('greedy',pick);
const costs=scores.map(r=>r.map(sc=>1000000-sc));
const h=hungarian(costs);
console.log('hungarian',h);
let t=0; h.forEach((s,p)=>{t+=scores[p][s];});
console.log('total',t);
