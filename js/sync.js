// Hybrid sync: local anti-CORS server first, direct ESPN fallback, then
// per-league localStorage and the bundled 2026/27 baseline.

import {
  state, normStr, safeLSGet, safeLSSet, storageKey, leagueLabel,
} from './core.js';
import { SLOT_SPECS } from './formations.js';
import {
  renderStandings, renderTeamStatsTable, renderLeaders, renderPlayerStatsTable, updateKpiStrip,
} from './stats.js';
import { applyLastMatchUI } from './pitch.js';

const SITE_API = 'https://site.api.espn.com/apis/site/v2/sports/soccer';
const WEB_API = 'https://site.web.api.espn.com/apis/v2/sports/soccer';
const CACHE_TTL = {
  standings: 15 * 60 * 1000,
  roster: 6 * 60 * 60 * 1000,
  schedule: 30 * 60 * 1000,
  summary: 6 * 60 * 60 * 1000,
  news: 10 * 60 * 1000,
  lastMatch: 6 * 60 * 60 * 1000,
};

let serverBase = null;
const serverCandidates = [];

if (typeof location !== 'undefined') {
  if (location.protocol !== 'file:') serverCandidates.push(`${location.origin}/api`);
  serverCandidates.push('http://localhost:8787/api');
}

function uniqueCandidates() {
  return [...new Set(serverCandidates)];
}

async function fetchJSON(url, timeout = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
  } finally {
    clearTimeout(timer);
  }
}

export async function checkServer() {
  for (const candidate of uniqueCandidates()) {
    try {
      const res = await fetchJSON(`${candidate}/health`, 1600);
      if (res.ok) {
        const json = await res.json();
        if (json && json.ok) {
          serverBase = candidate;
          state.serverOnline = true;
          return true;
        }
      }
    } catch (err) {
      /* try next candidate */
    }
  }
  serverBase = null;
  state.serverOnline = false;
  return false;
}

function directUrl(league, path) {
  if (path.startsWith('/standings')) return `${WEB_API}/${league}${path}`;
  return `${SITE_API}/${league}${path}`;
}

async function getJson(league, path, timeout = 15000) {
  if (state.serverOnline && serverBase) {
    try {
      const res = await fetchJSON(`${serverBase}/espn/${league}${path}`, timeout);
      if (res.ok) return await res.json();
    } catch (err) {
      state.serverOnline = false;
    }
  }
  const res = await fetchJSON(directUrl(league, path), timeout);
  if (!res.ok) throw new Error(`ESPN ${res.status} for ${path}`);
  return await res.json();
}

function updateStatus(text) {
  const el = document.getElementById('live-status-text');
  if (el) el.innerText = text;
}

function setSyncButton(text) {
  const el = document.getElementById('auto-sync-btn');
  if (el) el.innerText = text;
}

function isFresh(ts, ttl) {
  return Number(ts) > 0 && (Date.now() - Number(ts)) < ttl;
}

export function extractBoxStat(statsArr, keys) {
  if (!Array.isArray(statsArr)) return null;
  for (const key of keys) {
    const found = statsArr.find(s => String(s.name || '').toLowerCase() === key.toLowerCase());
    if (found && found.displayValue !== undefined) {
      const num = parseFloat(String(found.displayValue).replace('%', ''));
      if (!Number.isNaN(num)) return num;
    }
  }
  return null;
}

export function extractAthleteStats(athlete) {
  const categories = athlete?.statistics?.splits?.categories || [];
  const dict = {};
  categories.forEach(c => (c.stats || []).forEach(s => {
    if (s.name) dict[s.name.toLowerCase()] = parseFloat(s.value ?? s.displayValue) || 0;
  }));
  const pick = (...keys) => {
    for (const key of keys) if (dict[key] !== undefined) return dict[key];
    return 0;
  };
  return {
    app: pick('appearances', 'gamesplayed'),
    goals: pick('totalgoals', 'goals'),
    assists: pick('goalassists', 'assists'),
    shots: pick('totalshots', 'shots'),
    sot: pick('shotsontarget', 'shotsongoal'),
    yel: pick('yellowcards'),
    red: pick('redcards'),
    foulsC: pick('foulscommitted'),
    saves: pick('saves'),
    ga: pick('goalsconceded', 'goalsagainst'),
    cs: pick('cleansheets', 'shutouts'),
    min: pick('minutes', 'minutesplayed'),
  };
}

export function normalizePosTag(abbr) {
  const p = String(abbr || 'CEN').toUpperCase();
  if (p === 'G' || p === 'GK') return 'POR';
  if (p.startsWith('D') || p.includes('B')) return 'DIF';
  if (p === 'F' || p === 'A' || p.includes('ST') || p.includes('CF') || p.includes('W')) return 'ATT';
  return 'CEN';
}

function teamByEspnId(id) {
  return Object.values(state.database).find(t => String(t.espnId) === String(id)) || null;
}

function teamByName(name) {
  const q = normStr(name);
  return Object.values(state.database).find(t => {
    if (normStr(t.team) === q) return true;
    return (t.aliases || []).some(a => q.includes(normStr(a)));
  }) || null;
}

function formatDateIt(dateStr, withTime = false) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const opts = withTime
    ? { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'short' };
  return d.toLocaleDateString('it-IT', opts);
}

export async function syncLiveStandings() {
  const league = state.league?.espnLeague;
  const existingMax = state.standings.length ? Math.max(...state.standings.map(x => Number(x.g) || 0)) : 0;
  if (!league) return existingMax;
  try {
    const json = await getJson(league, '/standings?season=2026');
    const entries = json?.children?.[0]?.standings?.entries;
    if (!Array.isArray(entries) || entries.length < Math.min(18, state.standings.length)) return existingMax;
    const parsed = [];
    entries.forEach((entry, idx) => {
      const team = teamByEspnId(entry.team?.id) || teamByName(entry.team?.displayName || entry.team?.name);
      if (!team) return;
      const getStat = name => {
        const stat = (entry.stats || []).find(x => x.name === name);
        return stat ? (parseInt(stat.value, 10) || 0) : 0;
      };
      if (!team.espnId) team.espnId = String(entry.team.id);
      const row = {
        pos: getStat('rank') || (idx + 1),
        key: team.key,
        name: team.team,
        g: getStat('gamesPlayed'),
        v: getStat('wins'),
        n: getStat('ties'),
        p: getStat('losses'),
        gf: getStat('pointsFor'),
        gs: getStat('pointsAgainst'),
        pt: getStat('points'),
        espnId: String(entry.team.id),
      };
      parsed.push(row);
      const ts = state.teamStats.find(t => t.key === team.key);
      if (ts) {
        ts.pos = row.pos;
        ts.pg = row.g;
        ts.v = row.v;
        ts.n = row.n;
        ts.p = row.p;
        ts.gf = row.gf;
        ts.gs = row.gs;
        ts.dr = row.gf - row.gs;
        ts.pt = row.pt;
      }
    });
    if (parsed.length) {
      parsed.sort((a, b) => a.pos - b.pos);
      state.standings.length = 0;
      state.standings.push(...parsed);
      renderStandings();
      renderTeamStatsTable();
      window.dispatchEvent(new CustomEvent('th:standings-updated'));
      return Math.max(...parsed.map(x => Number(x.g) || 0));
    }
  } catch (err) {
    /* keep baseline */
  }
  return existingMax;
}

export function saveCompactMatchToCache(evId, dateStr, sumJson) {
  const teams = sumJson?.boxscore?.teams;
  const comp = sumJson?.header?.competitions?.[0];
  if (!Array.isArray(teams) || teams.length !== 2 || !comp) return;
  const home = comp.competitors?.find(c => c.homeAway === 'home');
  const away = comp.competitors?.find(c => c.homeAway === 'away');
  if (!home || !away) return;
  const homeId = String(home.id);
  const awayId = String(away.id);
  const homeBox = teams.find(t => String(t.team.id) === homeId)?.statistics || [];
  const awayBox = teams.find(t => String(t.team.id) === awayId)?.statistics || [];
  const parseBox = box => ({
    poss: extractBoxStat(box, ['possessionPct']) ?? 50,
    shots: extractBoxStat(box, ['totalShots']) ?? 0,
    sot: extractBoxStat(box, ['shotsOnTarget']) ?? 0,
    corners: extractBoxStat(box, ['wonCorners', 'cornerKicks']) ?? 0,
    fouls: extractBoxStat(box, ['foulsCommitted', 'fouls']) ?? 0,
    yel: extractBoxStat(box, ['yellowCards']) ?? 0,
    red: extractBoxStat(box, ['redCards']) ?? 0,
    saves: extractBoxStat(box, ['saves']) ?? 0,
    passAcc: extractBoxStat(box, ['passPct']),
    accuratePasses: extractBoxStat(box, ['accuratePasses']),
    totalPasses: extractBoxStat(box, ['totalPasses']),
  });
  const key = storageKey('matches:v2');
  const cache = safeLSGet(key, {});
  cache[String(evId)] = {
    id: String(evId), date: dateStr, hId: homeId, aId: awayId,
    hg: parseInt(home.score, 10) || 0, ag: parseInt(away.score, 10) || 0,
    hs: parseBox(homeBox), as: parseBox(awayBox),
  };
  safeLSSet(key, cache);
}

function parseMatchSummary(team, sumJson, event, nextTag) {
  const teamRoster = (sumJson.rosters || []).find(r => String(r.team?.id) === String(team.espnId));
  const rawForm = String(teamRoster?.formation || '').trim();
  const matchFormation = SLOT_SPECS[rawForm] ? rawForm : team.mod;
  let starters = [];
  if (teamRoster?.roster) {
    starters = teamRoster.roster.filter(p => p.starter).map(p => ({
      num: p.jersey || '?',
      nome: p.athlete?.shortName || p.athlete?.displayName || 'Giocatore',
      fullName: p.athlete?.displayName || '',
      id: String(p.athlete?.id || ''),
      pos: p.position?.abbreviation || 'M',
      fp: parseInt(p.formationPlace, 10) || 99,
    }));
  }
  const boxTeam = (sumJson.boxscore?.teams || []).find(t => String(t.team?.id) === String(team.espnId));
  const box = boxTeam?.statistics || [];
  const goalEvents = (sumJson.keyEvents || [])
    .filter(k => (String(k.type?.text || '').toLowerCase().includes('goal') || k.scoringPlay))
    .map(k => `${k.participants?.[0]?.athlete?.shortName || ''} ${k.clock?.displayValue || ''}`.trim())
    .filter(Boolean)
    .slice(0, 6);
  const comp = event?.competitions?.[0] || sumJson?.header?.competitions?.[0];
  const home = comp?.competitors?.find(c => c.homeAway === 'home');
  const away = comp?.competitors?.find(c => c.homeAway === 'away');
  const title = home && away
    ? `${home.team?.shortDisplayName || home.team?.displayName} ${home.score?.displayValue || 0}-${away.score?.displayValue || 0} ${away.team?.shortDisplayName || away.team?.displayName}`
    : 'Ultima gara';
  return {
    title,
    date: formatDateIt(event?.date || comp?.date),
    nextTag,
    starters,
    matchFormation,
    boxSummary: {
      poss: extractBoxStat(box, ['possessionPct']),
      shots: extractBoxStat(box, ['totalShots']),
      sot: extractBoxStat(box, ['shotsOnTarget']),
      corners: extractBoxStat(box, ['wonCorners', 'cornerKicks']),
      fouls: extractBoxStat(box, ['foulsCommitted', 'fouls']),
      saves: extractBoxStat(box, ['saves']),
      goalsTxt: goalEvents.join(' • '),
    },
    fetchedAt: Date.now(),
    eventId: String(event?.id || ''),
    source: 'espn',
  };
}

export async function fetchLastMatchLineup(teamKey = state.activeTeam) {
  const team = state.database[teamKey];
  if (!team) return null;
  if (!team.espnId || !state.league?.espnLeague) {
    applyLastMatchUI(teamKey, team.lastMatch);
    return team.lastMatch;
  }
  const cacheKey = storageKey(`last-match:${teamKey}`);
  const local = safeLSGet(cacheKey, null);
  const inMemory = state.liveMatchCache[teamKey];
  if (inMemory && isFresh(inMemory.fetchedAt, CACHE_TTL.lastMatch) && inMemory.starters?.length === 11) {
    applyLastMatchUI(teamKey, inMemory);
    return inMemory;
  }
  if (local && isFresh(local.fetchedAt, CACHE_TTL.lastMatch) && local.starters?.length === 11) {
    state.liveMatchCache[teamKey] = local;
    team.lastMatch = local;
    applyLastMatchUI(teamKey, local);
    return local;
  }

  try {
    const league = state.league.espnLeague;
    const sched = await getJson(league, `/teams/${team.espnId}/schedule?season=2026`);
    const events = Array.isArray(sched.events) ? sched.events : [];
    const completed = events
      .filter(ev => ev.competitions?.[0]?.status?.type?.completed)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    const upcoming = events
      .filter(ev => !ev.competitions?.[0]?.status?.type?.completed)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    let nextTag = '';
    if (upcoming.length) {
      const comp = upcoming[0].competitions?.[0];
      const opp = comp?.competitors?.find(c => String(c.team?.id) !== String(team.espnId));
      if (opp) nextTag = `Prossima: vs ${opp.team?.shortDisplayName || opp.team?.displayName} (${formatDateIt(upcoming[0].date, true)})`;
    }
    if (!completed.length) {
      applyLastMatchUI(teamKey, team.lastMatch);
      return team.lastMatch;
    }
    const lastEvent = completed[0];
    const summary = await getJson(league, `/summary?event=${lastEvent.id}`);
    saveCompactMatchToCache(lastEvent.id, lastEvent.date, summary);
    const payload = parseMatchSummary(team, summary, lastEvent, nextTag);
    state.liveMatchCache[teamKey] = payload;
    team.lastMatch = payload;
    safeLSSet(cacheKey, payload);
    applyLastMatchUI(teamKey, payload);
    window.dispatchEvent(new CustomEvent('th:last-match-updated', { detail: { teamKey } }));
    return payload;
  } catch (err) {
    const fallback = team.lastMatch;
    applyLastMatchUI(teamKey, fallback);
    return fallback;
  }
}

export async function fetchLiveNews() {
  const league = state.league?.espnLeague;
  const strip = document.getElementById('live-news-strip');
  if (!league || !strip) return;
  try {
    const json = await getJson(league, '/news?limit=4', 10000);
    const articles = (json.articles || []).slice(0, 4);
    if (!articles.length) return;
    strip.innerHTML = `<div style="font-size:0.74rem;font-weight:800;color:var(--accent-club);text-transform:uppercase;letter-spacing:0.04em;">📰 Ultime Notizie Live ${state.league.name} (Infortuni, Squalifiche & Panchine)</div>
      <div class="news-grid">${articles.map(a => `<a class="news-item" href="${a.links?.web?.href || '#'}" target="_blank" rel="noopener"><div class="news-item-title">${a.headline || ''}</div><div class="news-item-meta">${a.published ? new Date(a.published).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</div></a>`).join('')}</div>`;
    strip.classList.add('visible');
  } catch (err) {
    /* keep the previous strip */
  }
}

export function applyCachedStatsToUI() {
  const matches = Object.values(safeLSGet(storageKey('matches:v2'), {}));
  if (matches.length >= 10) {
    const agg = {};
    Object.values(state.database).forEach(team => {
      if (team.espnId) {
        agg[String(team.espnId)] = {
          key: team.key, n: 0, shots: 0, sot: 0, corners: 0, poss: 0, fouls: 0,
          yel: 0, red: 0, saves: 0, cs: 0, passAccSum: 0, passAccN: 0, passTotSum: 0,
        };
      }
    });
    let totalGoals = 0;
    let over25 = 0;
    let btts = 0;
    let totalCs = 0;
    matches.forEach(m => {
      totalGoals += (m.hg || 0) + (m.ag || 0);
      if ((m.hg || 0) + (m.ag || 0) >= 3) over25++;
      if ((m.hg || 0) > 0 && (m.ag || 0) > 0) btts++;
      if ((m.ag || 0) === 0) totalCs++;
      if ((m.hg || 0) === 0) totalCs++;
      [[m.hId, m.hs, m.ag], [m.aId, m.as, m.hg]].forEach(([teamId, st, conceded]) => {
        const row = agg[String(teamId)];
        if (!row || !st) return;
        row.n++;
        row.shots += st.shots || 0;
        row.sot += st.sot || 0;
        row.corners += st.corners || 0;
        row.poss += st.poss || 0;
        row.fouls += st.fouls || 0;
        row.yel += st.yel || 0;
        row.red += st.red || 0;
        row.saves += st.saves || 0;
        if (conceded === 0) row.cs++;
        if (st.passAcc) { row.passAccSum += st.passAcc; row.passAccN++; }
        else if (st.accuratePasses && st.totalPasses) { row.passAccSum += (st.accuratePasses / st.totalPasses) * 100; row.passAccN++; }
        if (st.totalPasses) row.passTotSum += st.totalPasses;
      });
    });
    Object.values(agg).forEach(r => {
      if (r.n < 3) return;
      const ts = state.teamStats.find(t => t.key === r.key);
      if (!ts) return;
      ts.shots = r.shots;
      ts.sot = r.sot;
      ts.corners = r.corners;
      ts.poss = +(r.poss / r.n).toFixed(1);
      ts.fouls = r.fouls;
      ts.yel = r.yel;
      ts.red = r.red;
      ts.cs = r.cs;
      ts.savesPg = +(r.saves / r.n).toFixed(1);
      if (r.passAccN > 0) ts.passAcc = +(r.passAccSum / r.passAccN).toFixed(1);
      if (r.passTotSum > 0) ts.passPg = Math.round(r.passTotSum / r.n);
    });
    state.kpi = {
      matches: matches.length,
      goals: totalGoals,
      over25: (over25 / matches.length) * 100,
      btts: (btts / matches.length) * 100,
      cleanSheets: totalCs,
    };
  }

  const rosterCache = safeLSGet(storageKey('rosters:v2'), null);
  if (rosterCache && Array.isArray(rosterCache.players) && rosterCache.players.length > 30) {
    const players = rosterCache.players;
    const by = (fn, minVal = 1) => players.filter(x => fn(x) >= minVal).sort((a, b) => fn(b) - fn(a));
    const liveGoals = by(x => x.goals, 1);
    if (liveGoals.length >= 10) {
      state.topScorers.length = 0;
      state.topScorers.push(...liveGoals.slice(0, 15).map(x => [x.nome, x.club, x.goals, 0]));
      state.playerStats.goals = liveGoals.slice(0, 25).map(x => [x.nome, x.club, x.pos, x.app, x.min || '-', x.goals, '-', '-', x.min > 0 ? ((x.goals * 90) / x.min).toFixed(2) : (x.app > 0 ? (x.goals / x.app).toFixed(2) : '-')]);
    }
    const liveAssists = by(x => x.assists, 1);
    if (liveAssists.length >= 8) {
      state.topAssists.length = 0;
      state.topAssists.push(...liveAssists.slice(0, 15).map(x => [x.nome, x.club, x.assists, x.app]));
      state.playerStats.assists = liveAssists.slice(0, 25).map(x => [x.nome, x.club, x.pos, x.app, x.min || '-', x.assists, '-', '-']);
    }
    const liveGA = by(x => x.goals + x.assists, 2);
    if (liveGA.length >= 8) {
      state.playerStats.ga = liveGA.slice(0, 25).map(x => {
        const teamGoals = state.teamStats.find(t => t.club === x.club)?.gf || 1;
        return [x.nome, x.club, x.pos, x.goals, x.assists, x.goals + x.assists, `${(((x.goals + x.assists) / teamGoals) * 100).toFixed(1)}%`];
      });
    }
    const liveShots = by(x => x.shots, 1);
    if (liveShots.length >= 8) state.playerStats.shotsTotal = liveShots.slice(0, 25).map(x => [x.nome, x.club, x.pos, x.shots, x.sot, x.goals, x.app > 0 ? (x.shots / x.app).toFixed(1) + ' / g' : '-']);
    const liveSot = by(x => x.sot, 1);
    if (liveSot.length >= 8) state.playerStats.shotsOnTarget = liveSot.slice(0, 25).map(x => [x.nome, x.club, x.pos, x.sot, x.shots, x.shots > 0 ? ((x.sot / x.shots) * 100).toFixed(1) + '%' : '-', x.goals]);
    const liveYel = by(x => x.yel, 1);
    if (liveYel.length >= 8) state.playerStats.yellows = liveYel.slice(0, 25).map(x => [x.nome, x.club, x.pos, x.yel, x.red, x.foulsC]);
    const liveRed = by(x => x.red, 1);
    if (liveRed.length >= 1) state.playerStats.reds = liveRed.map(x => [x.nome, x.club, x.pos, x.red, `Espulsioni ufficiali (${x.app} PG)`]);
    const liveGk = players.filter(x => x.pos === 'POR' && x.saves > 0).sort((a, b) => b.saves - a.saves);
    if (liveGk.length >= 6) state.playerStats.goalkeepers = liveGk.slice(0, 20).map(x => [x.nome, x.club, 'POR', x.saves, x.ga, (x.saves + x.ga) > 0 ? ((x.saves / (x.saves + x.ga)) * 100).toFixed(1) + '%' : '-', x.cs || '-']);
    const liveMin = by(x => x.min, 100);
    if (liveMin.length >= 8) state.playerStats.minutes = liveMin.slice(0, 20).map(x => [x.nome, x.club, x.pos, x.app, x.min, x.pos === 'POR' ? x.cs : x.goals]);
    const scorersTag = document.getElementById('scorers-sync-tag');
    const assistsTag = document.getElementById('assists-sync-tag');
    if (scorersTag) scorersTag.innerText = `Live Auto-Sync (${players.length} giocatori)`;
    if (assistsTag) assistsTag.innerText = `Live Auto-Sync (${players.length} giocatori)`;
  }

  renderLeaders();
  renderTeamStatsTable();
  renderPlayerStatsTable();
  updateKpiStrip();
}

export async function runFullAutoSync(force = false) {
  if (state.isSyncingAll) return;
  state.isSyncingAll = true;
  updateStatus('SINCRONIZZAZIONE...');
  setSyncButton('⏳ Sync in corso...');
  try {
    await checkServer();
    const maxPg = await syncLiveStandings();
    applyCachedStatsToUI();
    fetchLastMatchLineup(state.activeTeam);
    fetchLiveNews();

    const rosterCache = safeLSGet(storageKey('rosters:v2'), null);
    const needsSync = force || !rosterCache || !isFresh(rosterCache.ts, CACHE_TTL.roster) || maxPg > (rosterCache.maxPg || 0);

    if (needsSync && state.league?.espnLeague) {
      const teams = Object.values(state.database).filter(t => t.espnId && t.league === state.activeLeague);
      const matchCache = safeLSGet(storageKey('matches:v2'), {});
      const newEventIds = new Set();
      const allPlayers = [];
      for (let i = 0; i < teams.length; i += 4) {
        await Promise.allSettled(teams.slice(i, i + 4).map(async team => {
          try {
            const [rosterRes, scheduleRes] = await Promise.all([
              getJson(state.league.espnLeague, `/teams/${team.espnId}/roster?season=2026`, 20000),
              getJson(state.league.espnLeague, `/teams/${team.espnId}/schedule?season=2026`, 20000),
            ]);
            const athletes = (rosterRes.athletes || []).flatMap(x => Array.isArray(x.items) ? x.items : [x]);
            athletes.forEach(a => {
              const stats = extractAthleteStats(a);
              if (stats.app > 0 || stats.goals > 0 || stats.assists > 0 || stats.saves > 0) {
                allPlayers.push({ nome: a.shortName || a.displayName, club: team.key, pos: normalizePosTag(a.position?.abbreviation), ...stats });
              }
            });
            (scheduleRes.events || []).forEach(ev => {
              if (ev.competitions?.[0]?.status?.type?.completed && !matchCache[String(ev.id)]) newEventIds.add(String(ev.id));
            });
          } catch (err) {
            /* one team failing must not stop the sync */
          }
        }));
        updateStatus(`SYNC ROSE ${Math.min(i + 4, teams.length)}/${teams.length}...`);
      }

      const ids = Array.from(newEventIds);
      for (let j = 0; j < ids.length; j += 4) {
        await Promise.allSettled(ids.slice(j, j + 4).map(async eventId => {
          try {
            const summary = await getJson(state.league.espnLeague, `/summary?event=${eventId}`, 20000);
            saveCompactMatchToCache(eventId, summary?.header?.competitions?.[0]?.date || '', summary);
          } catch (err) {
            /* ignore a single summary */
          }
        }));
        updateStatus(`SYNC PARTITE ${Math.min(j + 4, ids.length)}/${ids.length}...`);
      }

      if (allPlayers.length > 20) safeLSSet(storageKey('rosters:v2'), { ts: Date.now(), maxPg, players: allPlayers });
      applyCachedStatsToUI();
    }

    const now = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    updateStatus(`AUTO-SYNC LIVE • ${now} (${maxPg}ª G.)`);
  } catch (err) {
    updateStatus(`${state.league?.name || 'BASELINE'} 26/27 (CACHE)`);
  } finally {
    state.isSyncingAll = false;
    setSyncButton('↻ Forza Sync Completo');
  }
}

export function startAutoSync() {
  runFullAutoSync(false);
  setInterval(() => runFullAutoSync(false), 10 * 60 * 1000);
}

export { leagueLabel };
