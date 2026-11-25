import { hungarian } from '../js/mapper.js';
const m1 = [[0,100,100],[100,0,100],[100,100,0]];
console.log('identity', hungarian(m1));
const m2 = [[2000000,1,2],[3,2000000,4],[5,6,2000000]];
console.log('avoid big', hungarian(m2));
// random check against brute force for 4x4
function brute(cost) {
  const n = cost.length;
  const used = new Array(n).fill(false);
  let best = Infinity, bestPerm = null;
  const perm = [];
  function rec(i, total) {
    if (i === n) { if (total < best) { best = total; bestPerm = perm.slice(); } return; }
    for (let j = 0; j < n; j++) if (!used[j]) {
      used[j] = true; perm.push(j); rec(i+1, total + cost[i][j]); perm.pop(); used[j] = false;
    }
  }
  rec(0, 0);
  return [best, bestPerm];
}
for (let t = 0; t < 20; t++) {
  const n = 4;
  const cost = Array.from({length:n},()=>Array.from({length:n},()=>Math.floor(Math.random()*50)));
  const h = hungarian(cost);
  const hTotal = h.reduce((s,j,i)=>s+cost[i][j],0);
  const [b, bp] = brute(cost);
  if (hTotal !== b) { console.log('MISMATCH', cost, h, hTotal, b, bp); break; }
  if (t === 19) console.log('random 4x4 all optimal');
}
