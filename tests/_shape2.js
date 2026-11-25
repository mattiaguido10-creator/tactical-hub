import serieA from '../data/serie_a.js';
import pl from '../data/premier_league.js';
for (const [name, lg] of [['ita', serieA], ['pl', pl]]) {
  const t = lg.teams[0];
  console.log('\n', name, t.key, 'xi', t.xi.length, 'ball', t.ball.length, 'squad', t.squad.length, 'last', t.lastMatch && Object.keys(t.lastMatch));
  console.log('last starters', JSON.stringify(t.lastMatch?.starters?.slice(0, 3)));
  console.log('squad0', JSON.stringify(t.squad[0]));
  console.log('playerStats goals0', JSON.stringify(t.playerStats?.goals?.[0]));
  console.log('sp', JSON.stringify(t.sp));
  console.log('radar', t.radarOff.length, t.radarDef.length, t.radarOff, t.radarDef);
  console.log('metrics', JSON.stringify(t.metrics));
}
