import serieA from '../data/serie_a.js';
import pl from '../data/premier_league.js';
function norm(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ø/gi,'o').toLowerCase().replace(/[^a-z\s]/g,' ').trim();}
for (const [name, lg] of [['ita', serieA], ['pl', pl]]) {
  let bad = 0, total = 0;
  for (const t of lg.teams) {
    const xiNames = new Set(t.xi.map(x => norm(x[1])));
    for (const b of t.ball) {
      total++;
      if (xiNames.has(norm(b[1])) && xiNames.has(norm(b[2]))) {
        bad++;
        console.log(name, t.key, 'both in XI', b);
      }
    }
  }
  console.log(name, 'ballots', total, 'both-in-XI', bad);
}
