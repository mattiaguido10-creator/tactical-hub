import { assignToSlots, classifyPlayer, slotFamily, validateAssignment } from '../js/mapper.js';
import { SLOT_SPECS } from '../js/formations.js';
const p=(nome,pos,fp)=>({nome,pos,fp});
const arsenal=[p('D. Raya','G',1),p('J. Timber','RB',2),p('E. Konsa','CD-R',5),p('G. Magalhães','CD-L',6),p('R. Calafiori','LB',3),p('B. Guimarães','RM',8),p('D. Rice','LM',4),p('N. Madueke','AM-R',7),p('M. Ødegaard','AM',10),p('E. Eze','AM-L',11),p('K. Havertz','F',9)];
const inter=[p('J. Martínez','G',1),p('B. Pavard','CD-R',6),p('A. Bastoni','CD',5),p('C. Augusto','CD-L',4),p('D. Spence','RM',2),p('H. Çalhanoglu','AM',11),p('N. Barella','CM-R',7),p('H. Mkhitaryan','CM-L',8),p('F. Dimarco','LM',3),p('P. Esposito','CF-R',10),p('M. Thuram','CF-L',9)];
for (const [name, starters, form] of [['inter',inter,'3-5-2'],['arsenal442',arsenal,'4-4-2'],['arsenal3421',arsenal,'3-4-2-1']]) {
  const o=assignToSlots(starters,form);
  console.log('\n',name,form,'valid=',validateAssignment(o,form));
  o.forEach((st,i)=>{const prof=classifyPlayer(st.pos,form); const spec=SLOT_SPECS[form][i]; console.log(i,st.nome,st.pos,'=>',prof.join('/'),'slot',spec.join('/'),'fam',slotFamily(spec));});
}
