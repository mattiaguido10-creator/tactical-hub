// Application shell: league switching, team selection, tabs, global search
// and the window bindings required by the inline handlers in index.html.

import {
  state, LEAGUES, LEAGUE_ORDER, loadLeague, persistUi, currentTeam,
  logoFor, standingFor, safeLSGet, safeLSSet,
  buildSearchIndex, searchAll, normStr, escapeHtml,
} from './core.js';
import { LEAGUE_LABELS } from './formations.js';
import {
  renderCampo, renderSetPieces, renderBallottaggi, focusGiocatore,
  scambiaBallottaggio, toggleZones, toggleAllArrows, toggleLiveLineup,
  setPitchPhase, downloadPitchSVG, downloadPitchPNG, applyLastMatchUI,
} from './pitch.js';
import {
  renderDualRadarCharts, setRadarLang, updateRadarReadout, downloadStyleChart,
} from './radar.js';
import {
  renderStandings, renderLeaders, renderTeamStatsTable, renderPlayerStatsTable,
  populatePlayerTeamFilter, setTeamStatsCat, sortTeamStats, setPlayerStatCat,
  updateKpiStrip, vaiASquadra,
} from './stats.js';
import {
  fetchLastMatchLineup, fetchLiveNews, runFullAutoSync, checkServer, startAutoSync,
} from './sync.js';
import {
  initMatchup, renderMatchup, matchupSetTeam, matchupSetFormation,
  toggleMatchupDraw, clearMatchupArrows, resetMatchup,
  downloadMatchupSVG, downloadMatchupPNG,
} from './matchup.js';

const LAST_LEAGUE_KEY = 'th:last-league';
const TAB_BUTTONS = {
  campo: 'tab-btn-campo',
  matchup: 'tab-btn-matchup',
  dna: 'tab-btn-dna',
  classifica: 'tab-btn-classifica',
  'squadre-stats': 'tab-btn-squadre',
  statistiche: 'tab-btn-statistiche',
};

let searchResultsFlat = [];

function el(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const node = el(id);
  if (node) node.innerText = value;
}

function setHtml(id, value) {
  const node = el(id);
  if (node) node.innerHTML = value;
}

export function updateLeagueButtons() {
  document.querySelectorAll('[data-league]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.league === state.activeLeague);
  });
  const badge = el('league-badge');
  if (badge) badge.innerText = LEAGUE_LABELS[state.activeLeague] || state.league?.name || '';
}

function updateLeagueHeadings() {
  const lg = state.league;
  if (!lg) return;
  document.title = `Tactical Hub Pro | ${lg.name} ${lg.season} · Match Analyst`;
  setText('classifica-title', `Classifica ${lg.name} ${lg.season || ''}`.trim());
  setText('team-stats-title', `Statistiche Squadre ${lg.name} ${lg.season || ''}`.trim());
  setText('dossier-title', `Dossier Tattico Avanzato ${lg.name} ${lg.season || ''}`.trim());
  updateLeagueButtons();
}

export function toggleDropdown(event) {
  event?.stopPropagation();
  el('coach-dropdown')?.classList.toggle('open');
}

function closeDropdown() {
  el('coach-dropdown')?.classList.remove('open');
}

export function renderDropdownList() {
  const listEl = el('dropdown-menu-list');
  if (!listEl) return;
  const keys = Object.keys(state.database);
  keys.sort((a, b) => {
    const pa = standingFor(a)?.pos ?? 99;
    const pb = standingFor(b)?.pos ?? 99;
    if (pa !== pb) return pa - pb;
    return (state.database[a]?.team || '').localeCompare(state.database[b]?.team || '');
  });
  listEl.innerHTML = keys.map(key => {
    const team = state.database[key];
    const rank = standingFor(key)?.pos;
    return `<div class="picker-item ${key === state.activeTeam ? 'active' : ''}" onclick="selezionaMister('${key}')">
      <div class="item-identity"><img src="${logoFor(key)}" alt="" onerror="this.style.visibility='hidden'">
      <div><div class="item-coach">${team.nome}</div><div class="item-team">${rank ? rank + '° ' : ''}${team.team}</div></div></div>
      <span class="item-system-tag">${team.mod}</span></div>`;
  }).join('');
}

function resetPhaseButtons() {
  ['base', 'possesso', 'difesa'].forEach(phase => {
    el(`phase-${phase}`)?.classList.toggle('active', phase === 'base');
  });
}

export function selezionaMister(key) {
  if (!key || !state.database[key]) return;
  state.activeTeam = key;
  state.swappedSlots = {};
  state.currentPitchPhase = 'base';
  state.useLiveXI = true;
  persistUi();
  resetPhaseButtons();
  closeDropdown();
  renderDropdownList();
  aggiornaScheda();
}

export function selezionaCategoria(cat) {
  if (!LEAGUES[cat]) return;
  if (state.activeLeague === cat) {
    updateLeagueButtons();
    return;
  }
  loadLeague(cat);
  safeLSSet(LAST_LEAGUE_KEY, cat);
  updateLeagueHeadings();
  resetPhaseButtons();
  populatePlayerTeamFilter();
  renderStandings();
  renderLeaders();
  renderTeamStatsTable();
  renderPlayerStatsTable();
  updateKpiStrip();
  renderDropdownList();
  aggiornaScheda();
  if (el('matchup')?.classList.contains('active')) {
    initMatchup(true);
    renderMatchup();
  }
  runFullAutoSync(false);
}

export function aggiornaScheda() {
  const team = currentTeam();
  if (!team) return;

  document.documentElement.style.setProperty('--accent-club', team.color || '#38bdf8');
  updateLeagueButtons();

  const rank = standingFor(team.key)?.pos;
  const rankStr = rank ? `${rank}° ` : '';

  const activeLogo = el('dropdown-active-logo');
  if (activeLogo) {
    activeLogo.src = logoFor(team.key);
    activeLogo.style.visibility = 'visible';
  }
  setText('dropdown-active-name', team.nome);
  setText('dropdown-active-team', rankStr + team.team);

  const crest = el('team-logo-img');
  if (crest) {
    crest.src = logoFor(team.key);
    crest.style.visibility = 'visible';
  }
  setText('coach-name', team.nome);
  setText('coach-style-tag', team.stileTag || 'STILE');
  setText('coach-team', rankStr + team.team);
  setText('coach-philosophy', team.fil || '');
  setText('coach-system', team.mod);
  setText('coach-nonposs-badge', (team.nonPoss || team.mod || '').split('/')[0].trim().split(' ').slice(0, 2).join(' '));

  setHtml('tactical-quick-strip', `
    <div class="tqs-chip"><span class="tqs-lbl">Costruzione</span><span class="tqs-val">${team.costr || team.mod}</span></div>
    <div class="tqs-chip"><span class="tqs-lbl">Non Possesso</span><span class="tqs-val">${team.nonPoss || team.mod}</span></div>
    <div class="tqs-chip"><span class="tqs-lbl">Altezza Linea & PPDA</span><span class="tqs-val">${team.altezzaBlocco || 'Medio'} • PPDA ${team.ppda || '10.5'}</span></div>
    <div class="tqs-chip"><span class="tqs-lbl">Catena Forte</span><span class="tqs-val">${team.catena || 'Bilanciata'}</span></div>`);

  setHtml('pitch-tactical-footer', `
    <div class="ptf-box"><div class="ptf-title">Pressing Trigger</div><div class="ptf-text">${team.trigger || '-'}</div></div>
    <div class="ptf-box"><div class="ptf-title">Palle Inattive (Off/Dif)</div><div class="ptf-text">${team.palleInattive || '-'}</div></div>
    <div class="ptf-box"><div class="ptf-title">Piano B / Cambi Tipo</div><div class="ptf-text">${team.pianoB || '-'}</div></div>`);

  setText('coach-essay', team.essay || '');
  setText('coach-strengths', team.forza || '');
  setText('coach-weaknesses', team.debole || '');
  setHtml('metrics-container', Object.entries(team.metrics || {}).map(([label, value]) =>
    `<div class="metric-row"><div class="metric-head"><span>${label}</span><span>${value}/100</span></div><div class="metric-bar-bg"><div class="metric-bar-fill" style="width:${value}%"></div></div></div>`).join(''));

  setHtml('dossier-container', `
    <div class="dossier-item"><div class="dossier-label">Modulo in Possesso / Costruzione</div><div class="dossier-val">${team.costr || team.mod}</div></div>
    <div class="dossier-item"><div class="dossier-label">Modulo in Non Possesso</div><div class="dossier-val">${team.nonPoss || team.mod}</div></div>
    <div class="dossier-item"><div class="dossier-label">Altezza Blocco & PPDA</div><div class="dossier-val">${team.altezzaBlocco || '-'} — ${team.ppda || '-'}</div></div>
    <div class="dossier-item"><div class="dossier-label">Pressing Trigger</div><div class="dossier-val">${team.trigger || '-'}</div></div>
    <div class="dossier-item"><div class="dossier-label">Strategia Palle Inattive</div><div class="dossier-val">${team.palleInattive || '-'}</div></div>
    <div class="dossier-item"><div class="dossier-label">Piano B a Gara in Corso</div><div class="dossier-val">${team.pianoB || '-'}</div></div>`);

  setHtml('fasi-container', (team.fasi || []).map(f =>
    `<div class="phase-card"><div class="phase-card-title">${f[0]}</div><p>${f[1]}</p></div>`).join(''));

  el('radar-lang-en')?.classList.toggle('active', state.radarLang === 'en');
  el('radar-lang-it')?.classList.toggle('active', state.radarLang === 'it');
  renderDualRadarCharts(team);
  renderSetPieces(team);
  renderBallottaggi(team);
  el('btn-live-xi')?.classList.toggle('active', state.useLiveXI);
  renderCampo(team, null, null);
  fetchLastMatchLineup(team.key);
}

export function switchTab(id, btnEl = null) {
  if (!document.getElementById(id)) return;
  document.querySelectorAll('.tab-content').forEach(section => section.classList.remove('active'));
  document.querySelectorAll('.sec-tab-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
  const button = btnEl || el(TAB_BUTTONS[id]);
  button?.classList.add('active');
  closeDropdown();
  if (id === 'matchup') {
    initMatchup();
    renderMatchup();
  }
  if (id === 'classifica') {
    renderStandings();
  }
  if (id === 'squadre-stats') {
    renderTeamStatsTable();
    updateKpiStrip();
  }
  if (id === 'statistiche') {
    renderLeaders();
    renderPlayerStatsTable();
  }
}

export function openTeam(leagueKey, teamKey, tab = 'campo') {
  if (leagueKey && leagueKey !== state.activeLeague && LEAGUES[leagueKey]) {
    loadLeague(leagueKey);
    safeLSSet(LAST_LEAGUE_KEY, leagueKey);
    updateLeagueHeadings();
    populatePlayerTeamFilter();
    renderStandings();
    renderLeaders();
    renderTeamStatsTable();
    renderPlayerStatsTable();
    updateKpiStrip();
    populateTeamPicker();
  }
  if (teamKey && state.database[teamKey]) {
    state.activeTeam = teamKey;
    state.swappedSlots = {};
    state.currentPitchPhase = 'base';
    persistUi();
    resetPhaseButtons();
    renderDropdownList();
    populateTeamPicker();
    aggiornaScheda();
  }
  switchTab(tab, el(TAB_BUTTONS[tab]));
}

function populateTeamPicker() {
  const select = el('global-team-picker');
  if (!select) return;
  select.innerHTML = Object.keys(state.database)
    .sort((a, b) => (standingFor(a)?.pos ?? 99) - (standingFor(b)?.pos ?? 99))
    .map(key => `<option value="${key}" ${key === state.activeTeam ? 'selected' : ''}>${state.database[key].team} — ${state.database[key].nome}</option>`)
    .join('');
}

/* ------------------------------------------------------------------ */
/* Global search (Ctrl/Cmd + K)                                       */
/* ------------------------------------------------------------------ */

export function openGlobalSearch() {
  const overlay = el('search-overlay');
  if (!overlay) return;
  buildSearchIndex();
  overlay.classList.add('open');
  document.body.classList.add('search-open');
  const input = el('global-search-input');
  if (input) {
    input.value = '';
    input.focus();
  }
  renderGlobalSearch('');
}

export function closeGlobalSearch() {
  el('search-overlay')?.classList.remove('open');
  document.body.classList.remove('search-open');
  searchResultsFlat = [];
}

export function renderGlobalSearch(query) {
  const container = el('search-results');
  if (!container) return;
  const q = String(query || '').trim();
  if (!q) {
    container.innerHTML = `<div class="search-empty">Cerca una squadra, un allenatore o un giocatore in <strong>Serie A</strong>, <strong>Premier League</strong> e <strong>Resto del Mondo</strong>.</div>`;
    searchResultsFlat = [];
    return;
  }
  const results = searchAll(q);
  searchResultsFlat = [...results.teams, ...results.coaches, ...results.players];
  if (!searchResultsFlat.length) {
    container.innerHTML = `<div class="search-empty">Nessun risultato per “${escapeHtml(q)}”.</div>`;
    return;
  }
  const section = (title, items, startIndex) => {
    if (!items.length) return '';
    return `<div class="search-group-title">${title}</div>` + items.map((item, i) => {
      const idx = startIndex + i;
      const badge = item.type === 'player' ? item.pos || 'PLAYER' : item.type === 'coach' ? 'MISTER' : item.league === 'premier_league' ? 'PL' : item.league === 'serie_a' ? 'SA' : 'WORLD';
      const sub = item.type === 'player' ? item.club : item.type === 'coach' ? item.club : `${item.coach} • ${LEAGUE_LABELS[item.league] || ''}`;
      return `<button type="button" class="search-result" onclick="openSearchResultAt(${idx})">
        <span class="search-result-icon">${item.logo ? `<img src="${item.logo}" alt="" onerror="this.style.visibility='hidden'">` : '⚽'}</span>
        <span class="search-result-body"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(sub || '')}</small></span>
        <span class="search-result-badge">${escapeHtml(badge)}</span>
      </button>`;
    }).join('');
  };
  container.innerHTML =
    section('Squadre', results.teams, 0) +
    section('Allenatori', results.coaches, results.teams.length) +
    section('Giocatori', results.players, results.teams.length + results.coaches.length);
}

export function openSearchResultAt(index) {
  const item = searchResultsFlat[index];
  if (!item) return;
  closeGlobalSearch();
  openTeam(item.league, item.team, item.type === 'player' ? 'statistiche' : 'campo');
  if (item.type === 'player') {
    const input = el('player-search-input');
    if (input) {
      const tokens = String(item.name || '').trim().split(/\s+/);
      input.value = tokens.length > 1 ? tokens[tokens.length - 1] : item.name;
      renderPlayerStatsTable();
    }
  }
}

function handleSearchKeydown(event) {
  if (!el('search-overlay')?.classList.contains('open')) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    closeGlobalSearch();
    return;
  }
  if (event.key !== 'Enter') return;
  const input = el('global-search-input');
  if (!input) return;
  const results = searchAll(input.value);
  const first = results.teams[0] || results.coaches[0] || results.players[0];
  if (first) {
    event.preventDefault();
    openTeam(first.league, first.team, first.type === 'player' ? 'statistiche' : 'campo');
    closeGlobalSearch();
  }
}

/* ------------------------------------------------------------------ */
/* Boot                                                               */
/* ------------------------------------------------------------------ */

function bindWindowHandlers() {
  const handlers = {
    toggleDropdown,
    toggleZones,
    toggleAllArrows,
    toggleLiveLineup,
    setPitchPhase: phase => setPitchPhase(phase),
    setRadarLang,
    updateRadarReadout,
    downloadStyleChart,
    runFullAutoSync,
    selezionaCategoria,
    selezionaMister,
    setTeamStatsCat,
    sortTeamStats,
    renderTeamStatsTable,
    setPlayerStatCat,
    renderPlayerStatsTable,
    vaiASquadra,
    switchTab,
    scambiaBallottaggio,
    focusGiocatore,
    downloadPitchSVG,
    downloadPitchPNG,
    matchupSetTeam,
    matchupSetFormation,
    toggleMatchupDraw,
    clearMatchupArrows,
    resetMatchup,
    downloadMatchupSVG,
    downloadMatchupPNG,
    openGlobalSearch,
    closeGlobalSearch,
    renderGlobalSearch,
    openSearchResultAt,
  };
  Object.entries(handlers).forEach(([name, fn]) => { window[name] = fn; });
}

function bindEvents() {
  document.addEventListener('click', event => {
    if (!event.target.closest('#coach-dropdown')) closeDropdown();
  });

  document.addEventListener('keydown', event => {
    const target = event.target;
    const typing = target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      openGlobalSearch();
      return;
    }
    if (event.key === 'Escape' && el('search-overlay')?.classList.contains('open')) {
      closeGlobalSearch();
    }
    if (typing) return;
    const k = event.key.toLowerCase();
    if (k === '1') switchTab('campo', el(TAB_BUTTONS.campo));
    if (k === '2') switchTab('matchup', el(TAB_BUTTONS.matchup));
    if (k === '3') switchTab('dna', el(TAB_BUTTONS.dna));
    if (k === '4') switchTab('classifica', el(TAB_BUTTONS.classifica));
    if (k === '5') switchTab('squadre-stats', el(TAB_BUTTONS['squadre-stats']));
    if (k === '6') switchTab('statistiche', el(TAB_BUTTONS.statistiche));
  });

  el('global-search-input')?.addEventListener('keydown', handleSearchKeydown);

  el('global-team-picker')?.addEventListener('change', event => {
    openTeam(state.activeLeague, event.target.value, 'campo');
  });

  window.addEventListener('th:open-team', event => {
    const { league, team, tab } = event.detail || {};
    openTeam(league || state.activeLeague, team, tab || 'campo');
  });

  window.addEventListener('th:render-team', () => aggiornaScheda());

  window.addEventListener('th:standings-updated', () => {
    populateTeamPicker();
    renderDropdownList();
  });

  window.addEventListener('th:last-match-updated', event => {
    if (event.detail?.teamKey !== state.activeTeam) return;
    const cached = state.liveMatchCache[event.detail.teamKey];
    if (cached) applyLastMatchUI(state.activeTeam, cached);
  });
}

function boot() {
  const lastLeague = safeLSGet(LAST_LEAGUE_KEY, 'serie_a');
  loadLeague(LEAGUES[lastLeague] ? lastLeague : 'serie_a');
  bindWindowHandlers();
  bindEvents();
  updateLeagueHeadings();
  populateTeamPicker();
  populatePlayerTeamFilter();
  renderDropdownList();
  renderStandings();
  renderLeaders();
  renderTeamStatsTable();
  renderPlayerStatsTable();
  updateKpiStrip();
  aggiornaScheda();
  fetchLiveNews();
  checkServer();
  startAutoSync();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
