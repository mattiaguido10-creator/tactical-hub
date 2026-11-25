// Standings, team stats, player leaderboards and KPI strip.

import { state, logoFor, findLeagueForTeam, requestOpenTeam, safeLSGet, storageKey, leagueLabel } from './core.js';

const TEAM_STATS_COLS = {
  generale: [
    { k: 'pos', lbl: '#', asc: true }, { k: 'name', lbl: 'Squadra', asc: true }, { k: 'coach', lbl: 'Allenatore', asc: true },
    { k: 'pt', lbl: 'PT' }, { k: 'pg', lbl: 'PG' }, { k: 'v', lbl: 'V' }, { k: 'n', lbl: 'N' }, { k: 'p', lbl: 'P' },
    { k: 'gf', lbl: 'GF' }, { k: 'gs', lbl: 'GS' }, { k: 'dr', lbl: 'DR' }, { k: 'rat', lbl: 'Rating' },
  ],
  attacco: [
    { k: 'pos', lbl: '#', asc: true }, { k: 'name', lbl: 'Squadra', asc: true }, { k: 'gf', lbl: 'Gol' }, { k: 'xg', lbl: 'xG' },
    { k: 'xgDiff', lbl: 'Gol-xG' }, { k: 'bigCh', lbl: 'Big Ch.' }, { k: 'shots', lbl: 'Tiri Tot.' }, { k: 'sot', lbl: 'In Porta' },
    { k: 'shotAcc', lbl: '% In Porta' }, { k: 'corners', lbl: 'Corner' }, { k: 'crosses', lbl: 'Cross' }, { k: 'crossPct', lbl: '% Cross' }, { k: 'pen', lbl: 'Rigori' },
  ],
  possesso: [
    { k: 'pos', lbl: '#', asc: true }, { k: 'name', lbl: 'Squadra', asc: true }, { k: 'poss', lbl: 'Possesso %' },
    { k: 'passAcc', lbl: 'Passaggi %' }, { k: 'passPg', lbl: 'Pass./Gara' }, { k: 'longPg', lbl: 'Lanci Lunghi/G' },
    { k: 'dribPg', lbl: 'Dribbling/G' }, { k: 'kmPg', lbl: 'Km/Gara' },
  ],
  difesa: [
    { k: 'pos', lbl: '#', asc: true }, { k: 'name', lbl: 'Squadra', asc: true }, { k: 'gs', lbl: 'Gol Subiti', asc: true },
    { k: 'xga', lbl: 'xGA', asc: true }, { k: 'cs', lbl: 'Clean Sheet' }, { k: 'savesPg', lbl: 'Parate/G' },
    { k: 'tackPg', lbl: 'Contrasti/G' }, { k: 'intPg', lbl: 'Intercetti/G' }, { k: 'aerPg', lbl: 'Duelli Aerei/G' },
    { k: 'fouls', lbl: 'Falli', asc: true }, { k: 'yel', lbl: 'Gialli', asc: true }, { k: 'red', lbl: 'Rossi', asc: true },
  ],
};

const PLAYER_CAT_META = {
  goals: { title: 'Goal (Marcatori)', sub: 'Gol segnati, presenze, minuti e media gol', cols: ['#', 'Giocatore', 'Squadra', 'Ruolo', 'PG', 'Min', 'Gol', 'Rig', 'xG', 'Gol/90'] },
  assists: { title: 'Assist Man', sub: 'Assist vincenti e presenze', cols: ['#', 'Giocatore', 'Squadra', 'Ruolo', 'PG', 'Min', 'Assist', 'Key Pass', 'xA'] },
  ga: { title: 'Gol + Assist', sub: 'Contribuzione diretta ai gol squadra', cols: ['#', 'Giocatore', 'Squadra', 'Ruolo', 'Gol', 'Assist', 'G+A', '% Gol Squadra'] },
  shotsTotal: { title: 'Tiri Totali', sub: 'Giocatori con più conclusioni tentate', cols: ['#', 'Giocatore', 'Squadra', 'Ruolo', 'Tiri Totali', 'In Porta', 'Gol', 'Media Tiri'] },
  shotsOnTarget: { title: 'Tiri in Porta', sub: 'Precisione nello specchio', cols: ['#', 'Giocatore', 'Squadra', 'Ruolo', 'In Porta', 'Tiri Totali', '% Specchio', 'Gol'] },
  keyPasses: { title: 'Key Passes', sub: 'Occasioni create (Opta baseline)', cols: ['#', 'Giocatore', 'Squadra', 'Ruolo', 'Key Passes', 'Big Chances', 'Assist'] },
  passesTotal: { title: 'Passaggi & Precisione', sub: 'Volume passaggi (Opta baseline)', cols: ['#', 'Giocatore', 'Squadra', 'Ruolo', 'Passaggi', 'Riusciti', '% Precisione'] },
  dribbles: { title: 'Dribbling Riusciti', sub: 'Specialisti 1vs1 (Opta baseline)', cols: ['#', 'Giocatore', 'Squadra', 'Ruolo', 'Riusciti', 'Tentati', '% Successo'] },
  duels: { title: 'Duelli & Falli Subiti', sub: 'Duelli vinti (Opta baseline)', cols: ['#', 'Giocatore', 'Squadra', 'Ruolo', 'Duelli Tot.', 'Vinti', 'Falli Subiti', 'Nota'] },
  yellows: { title: 'Ammonizioni & Falli', sub: 'Disciplina stagionale (Auto-Sync)', cols: ['#', 'Giocatore', 'Squadra', 'Ruolo', 'Gialli', 'Rossi', 'Falli Commessi'] },
  reds: { title: 'Cartellini Rossi', sub: 'Espulsioni ufficiali (Auto-Sync)', cols: ['#', 'Giocatore', 'Squadra', 'Ruolo', 'Rossi', 'Dettaglio'] },
  minutes: { title: 'Minuti Giocati', sub: 'I giocatori più utilizzati', cols: ['#', 'Giocatore', 'Squadra', 'Ruolo', 'PG', 'Minuti', 'Gol / CS'] },
  goalkeepers: { title: 'Portieri (Parate & CS)', sub: 'Parate e reti inviolate (Auto-Sync)', cols: ['#', 'Portiere', 'Squadra', 'Ruolo', 'Parate', 'Gol Subiti', '% Parate', 'Clean Sheet'] },
  ratings: { title: 'Valutazione Media', sub: 'Miglior rendimento medio', cols: ['#', 'Giocatore', 'Squadra', 'Ruolo', 'PG', 'Highlight', 'Rating Medio'] },
};

export { TEAM_STATS_COLS, PLAYER_CAT_META };

function zoneClass(pos, total) {
  if (total <= 4) return pos <= Math.ceil(total / 2) ? 'pos-ucl' : 'pos-rel';
  if (pos <= 4) return 'pos-ucl';
  if (pos <= 6) return 'pos-uel';
  if (pos >= total - 2) return 'pos-rel';
  return '';
}

export function renderStandings() {
  const body = document.getElementById('standings-body');
  if (!body) return;
  const total = state.standings.length;
  body.innerHTML = state.standings.map(row => {
    const z = zoneClass(row.pos, total);
    const dr = row.gf - row.gs;
    const logo = logoFor(row.key);
    const name = state.database[row.key]?.team || row.name;
    return `<tr onclick="vaiASquadra('${row.key}')"><td><span class="pos-badge ${z}">${row.pos}</span></td><td><div class="team-cell"><img src="${logo}" alt="" onerror="this.style.visibility='hidden'"><span>${name}</span></div></td><td class="pts-cell">${row.pt}</td><td>${row.g}</td><td>${row.v}</td><td>${row.n}</td><td>${row.p}</td><td>${row.gf}</td><td>${row.gs}</td><td style="color:${dr >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">${dr > 0 ? '+' + dr : dr}</td></tr>`;
  }).join('');
  const title = document.getElementById('standings-title');
  if (title) title.innerText = `Classifica ${leagueLabel()}`;
  const sub = document.getElementById('standings-subtitle');
  if (sub) {
    const maxG = state.standings.length ? Math.max(...state.standings.map(x => x.g || 0)) : 0;
    sub.innerText = `Classifica ${leagueLabel()} • Giornata ${maxG || '-'} • Clicca una squadra per aprire la Lavagna Tattica`;
  }
}

export function renderLeaders() {
  const scorersBody = document.getElementById('scorers-body');
  const assistsBody = document.getElementById('assists-body');
  if (scorersBody) {
    scorersBody.innerHTML = state.topScorers.map((s, i) => {
      const club = state.database[s[1]]?.team || s[1];
      return `<tr><td style="font-weight:800;color:var(--text-muted);">${i + 1}</td><td style="font-weight:700;color:#fff;">${s[0]}</td><td><div class="team-cell"><img src="${logoFor(s[1])}" alt=""><span style="font-weight:500;">${club}</span></div></td><td class="pts-cell" style="color:var(--accent-amber);">${s[2]} ${s[3] > 0 ? `<small style="color:var(--text-muted);font-weight:500;">(${s[3]} rig)</small>` : ''}</td></tr>`;
    }).join('');
  }
  if (assistsBody) {
    assistsBody.innerHTML = state.topAssists.map((a, i) => {
      const club = state.database[a[1]]?.team || a[1];
      const extra = typeof a[3] === 'number' && a[3] > 11 ? 'KP' : 'PG';
      return `<tr><td style="font-weight:800;color:var(--text-muted);">${i + 1}</td><td style="font-weight:700;color:#fff;">${a[0]}</td><td><div class="team-cell"><img src="${logoFor(a[1])}" alt=""><span style="font-weight:500;">${club}</span></div></td><td class="pts-cell" style="color:var(--accent-blue);">${a[2]} <small style="color:var(--text-muted);font-weight:500;">(${a[3]} ${extra})</small></td></tr>`;
    }).join('');
  }
}

export function setTeamStatsCat(cat, btn) {
  state.currentTeamStatsCat = cat;
  if (btn) {
    btn.closest('.pill-group')?.querySelectorAll('.stat-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  renderTeamStatsTable();
}

export function sortTeamStats(k, defAsc) {
  if (state.teamSortCol === k) state.teamSortAsc = !state.teamSortAsc;
  else { state.teamSortCol = k; state.teamSortAsc = !!defAsc; }
  renderTeamStatsTable();
}

export function getTeamComputedVal(t, k) {
  if (k === 'xgDiff') return +(t.gf - t.xg).toFixed(1);
  if (k === 'shotAcc') return t.shots > 0 ? +((t.sot / t.shots) * 100).toFixed(1) : 0;
  return t[k];
}

export function renderTeamStatsTable() {
  const thead = document.getElementById('team-stats-thead');
  const tbody = document.getElementById('team-stats-tbody');
  if (!thead || !tbody) return;
  const cols = TEAM_STATS_COLS[state.currentTeamStatsCat] || TEAM_STATS_COLS.generale;
  const q = (document.getElementById('team-stats-search')?.value || '').toLowerCase().trim();
  thead.innerHTML = `<tr>${cols.map(c => `<th class="sortable ${state.teamSortCol === c.k ? 'sorted-col' : ''}" onclick="sortTeamStats('${c.k}',${!!c.asc})">${c.lbl} ${state.teamSortCol === c.k ? (state.teamSortAsc ? '▲' : '▼') : ''}</th>`).join('')}</tr>`;
  const rows = state.teamStats.filter(t => !q || t.name.toLowerCase().includes(q) || String(t.coach || '').toLowerCase().includes(q));
  rows.sort((a, b) => {
    const va = getTeamComputedVal(a, state.teamSortCol);
    const vb = getTeamComputedVal(b, state.teamSortCol);
    if (typeof va === 'string' && typeof vb === 'string') return state.teamSortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    return state.teamSortAsc ? va - vb : vb - va;
  });
  tbody.innerHTML = rows.map(t => `<tr onclick="vaiASquadra('${t.key}')">${cols.map(c => {
    if (c.k === 'pos') return `<td style="font-weight:800;color:var(--text-muted);">${t.pos}</td>`;
    if (c.k === 'name') return `<td><div class="team-cell"><img src="${logoFor(t.key)}" alt=""><span>${t.name}</span></div></td>`;
    if (c.k === 'coach') return `<td style="color:var(--text-secondary);">${t.coach}</td>`;
    if (c.k === 'pt') return `<td class="pts-cell" style="color:var(--accent-club);">${t.pt}</td>`;
    if (c.k === 'dr') return `<td style="font-weight:700;color:${t.dr >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">${t.dr > 0 ? '+' + t.dr : t.dr}</td>`;
    if (c.k === 'xgDiff') { const d = +(t.gf - t.xg).toFixed(1); return `<td style="font-weight:700;color:${d >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">${d > 0 ? '+' + d : d}</td>`; }
    if (c.k === 'shotAcc') return `<td>${t.shots > 0 ? ((t.sot / t.shots) * 100).toFixed(1) : 0}%</td>`;
    if (c.k === 'poss') return `<td><div class="bar-inline"><span style="min-width:38px;font-weight:700;">${t.poss}%</span><div class="bar-inline-track"><div class="bar-inline-fill" style="width:${t.poss}%"></div></div></div></td>`;
    if (c.k === 'rat') return `<td class="pts-cell" style="color:var(--accent-amber);">${Number(t.rat).toFixed(2)}</td>`;
    if (c.k === 'red' && t.red > 0) return `<td style="color:var(--accent-red);font-weight:800;">${t.red}</td>`;
    if (c.k === 'yel') return `<td style="color:var(--accent-amber);font-weight:700;">${t.yel}</td>`;
    if (c.k === 'cs') return `<td style="color:var(--accent-green);font-weight:800;">${t.cs}</td>`;
    return `<td>${t[c.k]}${c.k === 'passAcc' || c.k === 'crossPct' ? '%' : ''}</td>`;
  }).join('')}</tr>`).join('');
  const title = document.getElementById('team-stats-title');
  if (title) title.innerText = `Statistiche Squadre ${leagueLabel()} (Auto-Sync Live + Baseline Opta)`;
  const sub = document.getElementById('team-stats-sub');
  if (sub) sub.innerText = `Clicca sulle colonne per ordinare • ${leagueLabel()} • Punti, Gol, Tiri, Possesso, Corner, Falli, Cartellini e Clean Sheet si aggiornano in automatico`;
}

export function populatePlayerTeamFilter() {
  const sel = document.getElementById('player-team-filter');
  if (!sel) return;
  const current = sel.value || 'all';
  sel.innerHTML = `<option value="all">Tutte le Squadre (${state.teamStats.length})</option>` +
    [...state.teamStats].sort((a, b) => a.name.localeCompare(b.name)).map(t => `<option value="${t.club}">${t.name}</option>`).join('');
  if ([...sel.options].some(o => o.value === current)) sel.value = current;
}

export function setPlayerStatCat(cat, btn) {
  state.currentPlayerCat = cat;
  document.querySelectorAll('#player-stats-cats .stat-pill').forEach(b => b.classList.remove('active'));
  btn?.classList.add('active');
  renderPlayerStatsTable();
}

export function renderPlayerStatsTable() {
  const title = document.getElementById('player-stats-title');
  const sub = document.getElementById('player-stats-sub');
  const thead = document.getElementById('player-stats-thead');
  const tbody = document.getElementById('player-stats-tbody');
  if (!thead || !tbody) return;
  const meta = PLAYER_CAT_META[state.currentPlayerCat] || PLAYER_CAT_META.goals;
  const tf = document.getElementById('player-team-filter')?.value || 'all';
  const q = (document.getElementById('player-search-input')?.value || '').toLowerCase().trim();
  if (title) title.innerText = `📊 Statistiche Giocatori ${leagueLabel()} — ${meta.title}`;
  if (sub) sub.innerText = meta.sub;
  thead.innerHTML = `<tr>${meta.cols.map(c => `<th>${c}</th>`).join('')}</tr>`;
  const list = (state.playerStats[state.currentPlayerCat] || []).filter(r => (tf === 'all' || r[1] === tf) && (!q || r[0].toLowerCase().includes(q) || String(r[1]).toLowerCase().includes(q)));
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="${meta.cols.length}" style="text-align:center;color:var(--text-muted);padding:20px;">Nessun giocatore trovato.</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map((r, i) => {
    const club = state.teamStats.find(t => t.club === r[1]);
    const ck = club?.key || r[1];
    const clubName = state.database[ck]?.team || club?.name || r[1];
    const rest = r.slice(3).map((val, cIdx) => {
      const main =
        (state.currentPlayerCat === 'goals' && cIdx === 2) ||
        (state.currentPlayerCat === 'assists' && cIdx === 2) ||
        (state.currentPlayerCat === 'ga' && cIdx === 2) ||
        (state.currentPlayerCat === 'shotsTotal' && cIdx === 0) ||
        (state.currentPlayerCat === 'shotsOnTarget' && cIdx === 0) ||
        (state.currentPlayerCat === 'keyPasses' && cIdx === 0) ||
        (state.currentPlayerCat === 'passesTotal' && cIdx === 0) ||
        (state.currentPlayerCat === 'dribbles' && cIdx === 0) ||
        (state.currentPlayerCat === 'duels' && cIdx === 0) ||
        (state.currentPlayerCat === 'minutes' && cIdx === 1) ||
        (state.currentPlayerCat === 'goalkeepers' && (cIdx === 0 || cIdx === 2)) ||
        (state.currentPlayerCat === 'ratings' && cIdx === 2);
      if (state.currentPlayerCat === 'yellows' && cIdx === 0) return `<td class="pts-cell" style="color:var(--accent-amber);">${val}</td>`;
      if ((state.currentPlayerCat === 'reds' && cIdx === 0) || (state.currentPlayerCat === 'yellows' && cIdx === 1 && val > 0)) return `<td class="pts-cell" style="color:var(--accent-red);">${val}</td>`;
      return main ? `<td class="pts-cell" style="color:var(--accent-amber);">${val}</td>` : `<td>${val}</td>`;
    }).join('');
    return `<tr onclick="vaiASquadra('${ck}')"><td style="font-weight:800;color:var(--text-muted);">${i + 1}</td><td style="font-weight:700;color:#fff;">${r[0]}</td><td><div class="team-cell"><img src="${logoFor(ck)}" alt=""><span style="font-weight:500;">${clubName}</span></div></td><td><span style="font-size:0.7rem;font-weight:800;background:#1a2234;padding:2px 6px;border-radius:4px;color:var(--text-secondary);">${r[2]}</span></td>${rest}</tr>`;
  }).join('');
}

export function updateKpiStrip() {
  const totalPg = state.teamStats.reduce((s, t) => s + (Number(t.pg) || 0), 0);
  const matches = Math.round(totalPg / 2);
  const goals = state.teamStats.reduce((s, t) => s + (Number(t.gf) || 0), 0);
  const cs = state.teamStats.reduce((s, t) => s + (Number(t.cs) || 0), 0);
  const cachedMatches = Object.values(safeLSGet(storageKey('matches:v2'), {}));
  let over = null;
  let btts = null;
  if (cachedMatches.length >= 10) {
    const total = cachedMatches.length;
    over = (cachedMatches.filter(m => (m.hg || 0) + (m.ag || 0) >= 3).length / total) * 100;
    btts = (cachedMatches.filter(m => (m.hg || 0) > 0 && (m.ag || 0) > 0).length / total) * 100;
  }
  const fallback = state.activeLeague === 'premier_league' ? [55.4, 52.1] : state.activeLeague === 'resto_mondo' ? [62.5, 50.0] : [60.0, 58.2];
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
  set('kpi-pg', matches || '-');
  set('kpi-gol', goals || '-');
  const golLbl = document.getElementById('kpi-gol-lbl');
  if (golLbl) golLbl.innerText = matches ? `Gol Totali (${(goals / matches).toFixed(2)} / gara)` : 'Gol Totali';
  set('kpi-over', `${(over ?? fallback[0]).toFixed(1)}%`);
  set('kpi-btts', `${(btts ?? fallback[1]).toFixed(1)}%`);
  set('kpi-cs', cs || '-');
}

export function renderAllStats() {
  renderStandings();
  renderLeaders();
  renderTeamStatsTable();
  renderPlayerStatsTable();
  updateKpiStrip();
}

export function vaiASquadra(key) {
  if (!key) return;
  const league = findLeagueForTeam(key);
  requestOpenTeam(league, key, 'campo');
}
