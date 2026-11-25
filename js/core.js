// Shared runtime state and small helpers for Tactical Hub Pro.
// Every league keeps its own database, standings, stats and localStorage keys.

import { LEAGUES, LEAGUE_ORDER } from '../data/index.js';

export { LEAGUES, LEAGUE_ORDER };

export const state = {
  activeLeague: 'serie_a',
  activeTeam: null,
  league: null,
  database: {},
  logos: {},
  teamStats: [],
  standings: [],
  topScorers: [],
  topAssists: [],
  playerStats: {},
  liveMatchCache: {},
  swappedSlots: {},
  showAllArrows: false,
  showZones: false,
  useLiveXI: true,
  currentPitchPhase: 'base',
  radarLang: 'en',
  currentTeamStatsCat: 'generale',
  teamSortCol: 'pt',
  teamSortAsc: false,
  currentPlayerCat: 'goals',
  isSyncingAll: false,
  serverOnline: false,
  searchIndex: [],
  matchup: null,
};

const runtime = {};

export function normStr(s) {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ø/gi, 'o')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function safeLSGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    return fallback;
  }
}

export function safeLSSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    /* storage may be unavailable (private mode / file://) */
  }
}

export function storageKey(suffix, league = state.activeLeague) {
  return `th:${league}:${suffix}`;
}

export function leagueMeta(key = state.activeLeague) {
  return LEAGUES[key] || LEAGUES.serie_a;
}

export function leagueLabel(key = state.activeLeague) {
  const lg = leagueMeta(key);
  return `${lg.name} ${lg.season || ''}`.trim();
}

export function leagueTeamCount(key = state.activeLeague) {
  const lg = leagueMeta(key);
  return lg.teamCount || lg.teams?.length || 0;
}

function prepareTeam(rawTeam, leagueKey) {
  const team = { ...rawTeam, cat: leagueKey, league: leagueKey };
  if (Array.isArray(team.ball)) {
    const xiNames = new Set((team.xi || []).map(x => normStr(x[1])));
    team.ball = team.ball.filter(b => !(xiNames.has(normStr(b[1])) && xiNames.has(normStr(b[2]))));
  }
  return team;
}

function buildRuntime(leagueKey) {
  const league = leagueMeta(leagueKey);
  const database = {};
  const logos = {};
  for (const rawTeam of league.teams || []) {
    const team = prepareTeam(rawTeam, leagueKey);
    database[team.key] = team;
    logos[team.key] = team.logo;
  }
  return {
    database,
    logos,
    teamStats: (league.teams || []).map(t => t.teamStats).filter(Boolean),
    standings: JSON.parse(JSON.stringify(league.standings || [])),
    topScorers: JSON.parse(JSON.stringify(league.topScorers || [])),
    topAssists: JSON.parse(JSON.stringify(league.topAssists || [])),
    playerStats: JSON.parse(JSON.stringify(league.playerStats || {})),
    liveMatchCache: {},
    kpi: null,
  };
}

export function loadLeague(key = 'serie_a') {
  const league = leagueMeta(key);
  const leagueKey = league.key;
  if (!runtime[leagueKey]) runtime[leagueKey] = buildRuntime(leagueKey);
  const rt = runtime[leagueKey];
  const ui = safeLSGet(storageKey('ui', leagueKey), {});

  state.activeLeague = leagueKey;
  state.league = league;
  state.database = rt.database;
  state.logos = rt.logos;
  state.teamStats = rt.teamStats;
  state.standings = rt.standings;
  state.topScorers = rt.topScorers;
  state.topAssists = rt.topAssists;
  state.playerStats = rt.playerStats;
  state.liveMatchCache = rt.liveMatchCache;
  state.kpi = rt.kpi;

  state.useLiveXI = ui.useLiveXI !== false;
  state.radarLang = ui.radarLang === 'it' ? 'it' : 'en';
  state.currentPitchPhase = 'base';
  state.showAllArrows = false;
  state.showZones = false;
  state.swappedSlots = {};
  state.currentTeamStatsCat = 'generale';
  state.teamSortCol = 'pt';
  state.teamSortAsc = false;
  state.currentPlayerCat = 'goals';
  state.matchup = null;

  const fallbackTeam = rt.standings[0]?.key || (league.teams || [])[0]?.key || null;
  state.activeTeam = ui.activeTeam && rt.database[ui.activeTeam] ? ui.activeTeam : fallbackTeam;
  return rt;
}

export function persistUi() {
  if (!state.activeLeague) return;
  safeLSSet(storageKey('ui'), {
    activeTeam: state.activeTeam,
    useLiveXI: state.useLiveXI,
    radarLang: state.radarLang,
  });
}

export function currentTeam() {
  return state.database[state.activeTeam] || null;
}

export function teamStatsFor(teamKey) {
  return state.teamStats.find(t => t.key === teamKey) || null;
}

export function standingFor(teamKey) {
  return state.standings.find(s => s.key === teamKey) || null;
}

export function logoFor(teamKey) {
  return state.logos[teamKey] || '';
}

export function findLeagueForTeam(teamKey) {
  for (const key of LEAGUE_ORDER) {
    const lg = LEAGUES[key];
    if ((lg.teams || []).some(t => t.key === teamKey)) return key;
  }
  return state.activeLeague;
}

export function requestOpenTeam(leagueKey, teamKey, tab = 'campo') {
  window.dispatchEvent(new CustomEvent('th:open-team', { detail: { league: leagueKey, team: teamKey, tab } }));
}

export function requestRenderTeam() {
  window.dispatchEvent(new CustomEvent('th:render-team'));
}

export function buildSearchIndex() {
  if (state.searchIndex.length) return state.searchIndex;
  const index = [];
  const playerKey = (name, club) => {
    const tokens = normStr(name).split(' ').filter(Boolean);
    return `${tokens[tokens.length - 1] || normStr(name)}|${club}`;
  };
  for (const leagueKey of LEAGUE_ORDER) {
    const lg = LEAGUES[leagueKey];
    const seenPlayers = new Set();
    for (const team of lg.teams || []) {
      index.push({
        type: 'team', league: leagueKey, team: team.key,
        name: team.team, coach: team.nome, logo: team.logo,
        search: normStr(`${team.team} ${team.nome} ${(team.aliases || []).join(' ')}`),
      });
      index.push({
        type: 'coach', league: leagueKey, team: team.key,
        name: team.nome, club: team.team, logo: team.logo,
        search: normStr(`${team.nome} ${team.team}`),
      });
    }
    for (const cat of Object.values(lg.playerStats || {})) {
      for (const row of cat || []) {
        const name = row?.[0];
        const club = row?.[1];
        if (!name || !club) continue;
        const key = playerKey(name, club);
        if (seenPlayers.has(key)) continue;
        seenPlayers.add(key);
        const clubTeam = (lg.teams || []).find(t => t.key === club);
        index.push({
          type: 'player', league: leagueKey, team: club,
          name, club: clubTeam?.team || club, pos: row?.[2] || '',
          search: normStr(`${name} ${clubTeam?.team || club}`),
        });
      }
    }
    for (const team of lg.teams || []) {
      for (const p of team.squad || []) {
        const name = p.shortName || p.name;
        if (!name) continue;
        const key = playerKey(name, team.key);
        if (seenPlayers.has(key)) continue;
        seenPlayers.add(key);
        index.push({
          type: 'player', league: leagueKey, team: team.key,
          name, club: team.team, pos: p.pos || '',
          search: normStr(`${name} ${p.name || ''} ${team.team}`),
        });
      }
    }
  }
  state.searchIndex = index;
  return index;
}

export function searchAll(query) {
  const q = normStr(query);
  if (!q) return { teams: [], coaches: [], players: [] };
  const tokens = q.split(' ').filter(Boolean);
  const match = item => tokens.every(tok => item.search.includes(tok));
  const results = state.searchIndex.filter(match);
  return {
    teams: results.filter(x => x.type === 'team').slice(0, 8),
    coaches: results.filter(x => x.type === 'coach').slice(0, 6),
    players: results.filter(x => x.type === 'player').slice(0, 12),
  };
}
