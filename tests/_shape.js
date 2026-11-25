import serieA from '../data/serie_a.js';
import pl from '../data/premier_league.js';
import resto from '../data/resto_mondo.js';
for (const [name, lg] of [['serie_a', serieA], ['premier_league', pl], ['resto_mondo', resto]]) {
  console.log('\n===', name, Object.keys(lg));
  for (const k of Object.keys(lg)) {
    const v = lg[k];
    if (Array.isArray(v)) console.log(k, 'array', v.length, v[0] && typeof v[0] === 'object' ? Object.keys(v[0]) : v[0]);
    else if (v && typeof v === 'object') console.log(k, 'object', Object.keys(v).slice(0, 12));
    else console.log(k, typeof v, v);
  }
  console.log('team keys', lg.teams.map(t => t.key).join(', '));
  console.log('team0 keys', Object.keys(lg.teams[0]));
  console.log('team0 sample', JSON.stringify({key: lg.teams[0].key, team: lg.teams[0].team, nome: lg.teams[0].nome, mod: lg.teams[0].mod, cat: lg.teams[0].cat, logo: lg.teams[0].logo, xi0: lg.teams[0].xi[0], ball: lg.teams[0].ball, lastMatch: lg.teams[0].lastMatch && {title: lg.teams[0].lastMatch.title, date: lg.teams[0].lastMatch.date, matchFormation: lg.teams[0].lastMatch.matchFormation, starters: lg.teams[0].lastMatch.starters?.length}}).slice(0, 1200));
  console.log('teamStats sample', JSON.stringify(lg.teams[0].teamStats).slice(0, 400));
  console.log('categories keys', Object.keys(lg.playerStats || {}));
  console.log('standings0', JSON.stringify((lg.standings || [])[0]));
  console.log('scorers0', JSON.stringify((lg.topScorers || [])[0]));
}
