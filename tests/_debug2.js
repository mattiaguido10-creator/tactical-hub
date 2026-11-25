import { classifyPlayer, playerSlotScore, hungarian, assignToSlots } from '../js/mapper.js';
import { SLOT_SPECS } from '../js/formations.js';
const p=(nome,pos,fp)=>({nome,pos,fp});
const arsenal=[p('D. Raya','G',1),p('J. Timber','RB',2),p('E. Konsa','CD-R',5),p('G. Magalhães','CD-L',6),p('R. Calafiori','LB',3),p('B. Guimarães','RM',8),p('D. Rice','LM',4),p('N. Madueke','AM-R',7),p('M. Ødegaard','AM',10),p('E. Eze','AM-L',11),p('K. Havertz','F',9)];
const form='3-4-2-1', specs=SLOT_SPECS[form];
const profiles=arsenal.map(st=>classifyPlayer(st.pos,form));
for (const relaxed of [false,true]) {
  const scores=arsenal.map((_,p)=>specs.map((s,i)=>playerSlotScore(profiles[p],s,form,relaxed)));
  const costs=scores.map(row=>row.map(sc=>1000000-sc));
  const col=hungarian(costs);
  let total=0; const assign=[];
  col.forEach((s,p)=>{assign[s]=arsenal[p].nome; total+=scores[p][s];});
  console.log('\nrelaxed',relaxed,'total',total);
  assign.forEach((n,s)=>console.log(s,n,specs[s].join('/'),'score',scores[arsenal.findIndex(x=>x.nome===n)][s]));
  console.log('min score',Math.min(...scores.flat()));
}
