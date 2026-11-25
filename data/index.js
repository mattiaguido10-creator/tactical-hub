// League registry for Tactical Hub Pro.
import serieA from './serie_a.js';
import premierLeague from './premier_league.js';
import restoMondo from './resto_mondo.js';

export const LEAGUES = {
  serie_a: serieA,
  premier_league: premierLeague,
  resto_mondo: restoMondo,
};

export const LEAGUE_ORDER = ['serie_a', 'premier_league', 'resto_mondo'];

export function getLeague(key) {
  return LEAGUES[key] || LEAGUES.serie_a;
}

export default LEAGUES;
