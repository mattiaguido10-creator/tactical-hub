// 11v11 tactical matchup: two lineups on one pitch, draggable players,
// freehand arrows, reset and SVG/PNG export.

import { state, escapeHtml } from './core.js';
import { FORMATIONS, SLOT_SPECS } from './formations.js';
import { assignStartersToSlots } from './mapper.js';
import { downloadSVG, downloadPNG } from './export.js';

const W = 1000;
const H = 680;
const SVG_NS = 'http://www.w3.org/2000/svg';

const PITCH_LINES = `
  <rect x="40" y="30" width="920" height="620" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="1.6" />
  <line x1="500" y1="30" x2="500" y2="650" stroke="rgba(255,255,255,0.28)" stroke-width="1.6" />
  <circle cx="500" cy="340" r="85" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="1.6" />
  <circle cx="500" cy="340" r="3" fill="rgba(255,255,255,0.28)" />
  <rect x="40" y="165" width="165" height="350" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="1.6" />
  <rect x="40" y="255" width="60" height="170" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="1.6" />
  <circle cx="155" cy="340" r="3" fill="rgba(255,255,255,0.28)" />
  <path d="M 205 285 A 85 85 0 0 1 205 395" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="1.6" />
  <rect x="795" y="165" width="165" height="350" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="1.6" />
  <rect x="900" y="255" width="60" height="170" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="1.6" />
  <circle cx="845" cy="340" r="3" fill="rgba(255,255,255,0.28)" />
  <path d="M 795 285 A 85 85 0 0 0 795 395" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="1.6" />`;

function currentRank(team) {
  return state.standings.find(row => row.key === team.key)?.pos ?? 99;
}

function sortedTeams() {
  return Object.values(state.database).sort((a, b) => {
    const rd = currentRank(a) - currentRank(b);
    return rd !== 0 ? rd : a.team.localeCompare(b.team);
  });
}

function validFormation(mod, fallback = '4-3-3') {
  return FORMATIONS[mod] ? mod : fallback;
}

function ensureMatchup(force = false) {
  const teams = sortedTeams();
  if (!teams.length) return null;
  if (force || !state.matchup || !state.database[state.matchup.homeTeam] || !state.database[state.matchup.awayTeam]) {
    const home = teams[0];
    const away = teams[1] || teams[0];
    state.matchup = {
      homeTeam: home.key,
      awayTeam: away.key,
      homeFormation: validFormation(home.mod),
      awayFormation: validFormation(away.mod),
      positions: { home: Array(11).fill(null), away: Array(11).fill(null) },
      arrows: [],
      drawMode: false,
    };
  }
  return state.matchup;
}

function lineupFor(team, formation) {
  const cached = state.liveMatchCache[team.key] || team.lastMatch;
  let players;
  if (Array.isArray(cached?.starters) && cached.starters.length === 11) {
    const ordered = assignStartersToSlots(cached.starters, team, formation);
    players = ordered.map(p => ({ num: p.num, nome: p.nome, pos: p.pos || '' }));
  } else {
    players = (team.xi || []).slice(0, 11).map(p => ({ num: p[0], nome: p[1], pos: p[2] || '' }));
  }
  while (players.length < 11) players.push({ num: '-', nome: '—', pos: '' });
  return players.slice(0, 11);
}

function defaultPosition(side, formation, idx) {
  const coords = FORMATIONS[formation] || FORMATIONS['4-3-3'];
  const c = coords[idx] || coords[coords.length - 1];
  const x = side === 'home' ? 3 + c[0] * 0.46 : 97 - c[0] * 0.46;
  return [Number(x.toFixed(2)), Number(c[1])];
}

function pinPosition(side, formation, idx) {
  return state.matchup.positions[side][idx] || defaultPosition(side, formation, idx);
}

function arrowPath(points) {
  if (!points || points.length < 2) return '';
  const pts = points.map(([x, y]) => [x * 10, y * 6.8]);
  if (pts.length === 2) return `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)} L ${pts[1][0].toFixed(1)} ${pts[1][1].toFixed(1)}`;
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    d += ` Q ${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  const last = pts[pts.length - 1];
  d += ` L ${last[0].toFixed(1)} ${last[1].toFixed(1)}`;
  return d;
}

function renderMatchupArrows() {
  const layer = document.getElementById('matchup-arrows-layer');
  if (!layer) return;
  const arrowhead = `<defs><marker id="matchup-arrowhead" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 2 L 7 5 L 0 8 z" fill="#fbbf24" /></marker></defs>`;
  layer.innerHTML = arrowhead + (state.matchup?.arrows || []).map(points =>
    `<path d="${arrowPath(points)}" fill="none" stroke="#fbbf24" stroke-width="2.6" stroke-linecap="round" marker-end="url(#matchup-arrowhead)" opacity="0.95" />`).join('');
}

function updateReadout(side, idx, team, player) {
  const readout = document.getElementById('matchup-readout');
  if (!readout) return;
  const color = team.color || '#38bdf8';
  readout.innerHTML = `<span class="mr-dot" style="background:${color}"></span><strong>${escapeHtml(player.nome)}</strong> <span class="mr-muted">${escapeHtml(team.team)} • ${escapeHtml(player.pos || 'XI')} • ${side === 'home' ? 'Casa' : 'Ospite'}</span> <span class="mr-hint">Trascina per riposizionare</span>`;
}

function bindPinEvents(pin, side, idx, team, player) {
  const board = document.getElementById('matchup-board');
  if (!board) return;
  let drag = null;

  pin.addEventListener('pointerdown', event => {
    if (!state.matchup || state.matchup.drawMode) return;
    event.preventDefault();
    event.stopPropagation();
    updateReadout(side, idx, team, player);
    pin.setPointerCapture(event.pointerId);
    pin.classList.add('dragging');
    const rect = board.getBoundingClientRect();
    drag = { rect, startX: event.clientX, startY: event.clientY, moved: false };
  });

  pin.addEventListener('pointermove', event => {
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    drag.moved = true;
    const x = Math.max(1.5, Math.min(98.5, ((event.clientX - drag.rect.left) / drag.rect.width) * 100));
    const y = Math.max(2, Math.min(98, ((event.clientY - drag.rect.top) / drag.rect.height) * 100));
    state.matchup.positions[side][idx] = [Number(x.toFixed(2)), Number(y.toFixed(2))];
    pin.style.left = `${x}%`;
    pin.style.top = `${y}%`;
  });

  const finish = () => {
    if (!drag) return;
    drag = null;
    pin.classList.remove('dragging');
    if (state.matchup.positions[side][idx]) {
      // Persist after a real drag so the board keeps the custom shape.
      pin.dataset.custom = '1';
    }
  };
  pin.addEventListener('pointerup', finish);
  pin.addEventListener('pointercancel', finish);

  pin.addEventListener('click', event => {
    event.stopPropagation();
    updateReadout(side, idx, team, player);
  });
}

function boardPoint(event, board) {
  const rect = board.getBoundingClientRect();
  return [
    Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)),
    Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100)),
  ];
}

function bindBoardEvents() {
  const board = document.getElementById('matchup-board');
  if (!board || board.dataset.bound === '1') return;
  board.dataset.bound = '1';
  let draw = null;

  board.addEventListener('pointerdown', event => {
    if (!state.matchup?.drawMode) return;
    if (event.target.closest('.matchup-pin')) return;
    event.preventDefault();
    const point = boardPoint(event, board);
    draw = { id: event.pointerId, points: [point] };
    board.setPointerCapture(event.pointerId);
    const layer = document.getElementById('matchup-arrows-layer');
    if (layer) {
      const temp = document.createElementNS(SVG_NS, 'path');
      temp.setAttribute('id', 'matchup-temp-arrow');
      temp.setAttribute('fill', 'none');
      temp.setAttribute('stroke', '#fbbf24');
      temp.setAttribute('stroke-width', '2.6');
      temp.setAttribute('stroke-linecap', 'round');
      temp.setAttribute('marker-end', 'url(#matchup-arrowhead)');
      temp.setAttribute('opacity', '0.7');
      temp.setAttribute('d', arrowPath([point, point]));
      layer.appendChild(temp);
    }
  });

  board.addEventListener('pointermove', event => {
    if (!draw || event.pointerId !== draw.id) return;
    const point = boardPoint(event, board);
    const last = draw.points[draw.points.length - 1];
    if (Math.hypot(point[0] - last[0], point[1] - last[1]) < 0.35) return;
    draw.points.push(point);
    const temp = document.getElementById('matchup-temp-arrow');
    if (temp) temp.setAttribute('d', arrowPath([...draw.points, point]));
  });

  const finishDraw = event => {
    if (!draw || (event.pointerId !== undefined && event.pointerId !== draw.id)) return;
    const points = draw.points;
    draw = null;
    document.getElementById('matchup-temp-arrow')?.remove();
    if (points.length >= 2) {
      state.matchup.arrows.push(points.filter((_, i) => i % 2 === 0 || i === points.length - 1));
      renderMatchupArrows();
    }
  };
  board.addEventListener('pointerup', finishDraw);
  board.addEventListener('pointercancel', finishDraw);
}

export function initMatchup(force = false) {
  ensureMatchup(force);
  bindBoardEvents();
}

export function renderMatchup() {
  const m = ensureMatchup();
  if (!m) return;
  const teams = sortedTeams();
  if (!teams.length) return;

  const homeTeam = state.database[m.homeTeam];
  const awayTeam = state.database[m.awayTeam];
  if (!homeTeam || !awayTeam) return;

  const teamOptions = teams.map(t => `<option value="${t.key}">${escapeHtml(t.team)} — ${escapeHtml(t.nome)}</option>`).join('');
  const formationOptions = Object.keys(FORMATIONS).map(f => `<option value="${f}">${f}</option>`).join('');
  const homeSelect = document.getElementById('matchup-home-team');
  const awaySelect = document.getElementById('matchup-away-team');
  const homeForm = document.getElementById('matchup-home-formation');
  const awayForm = document.getElementById('matchup-away-formation');
  if (homeSelect) { homeSelect.innerHTML = teamOptions; homeSelect.value = m.homeTeam; }
  if (awaySelect) { awaySelect.innerHTML = teamOptions; awaySelect.value = m.awayTeam; }
  if (homeForm) { homeForm.innerHTML = formationOptions; homeForm.value = m.homeFormation; }
  if (awayForm) { awayForm.innerHTML = formationOptions; awayForm.value = m.awayFormation; }

  const layer = document.getElementById('matchup-players-layer');
  if (!layer) return;
  const board = document.getElementById('matchup-board');
  board?.classList.toggle('drawing', !!m.drawMode);
  document.getElementById('matchup-draw-btn')?.classList.toggle('active', !!m.drawMode);
  const help = document.getElementById('matchup-help');
  if (help) help.innerText = m.drawMode
    ? 'Modalità frecce attiva: trascina sul campo per disegnare una traiettoria. Clicca “Frecce Libere” per uscire.'
    : 'Trascina i 22 giocatori per costruire il matchup. Attiva “Frecce Libere” per disegnare le traiettorie, poi esporta in SVG o PNG.';

  const renderSide = (side, team, formation) => {
    const players = lineupFor(team, formation);
    return players.map((player, idx) => {
      const [x, y] = pinPosition(side, formation, idx);
      const color = team.color || '#38bdf8';
      return `<div class="matchup-pin ${side}" data-side="${side}" data-index="${idx}" style="left:${x}%; top:${y}%; --pin-color:${color};" title="${escapeHtml(player.nome)}">
        <div class="matchup-badge">${escapeHtml(String(player.num))}</div>
        <div class="matchup-name">${escapeHtml(player.nome)}</div>
      </div>`;
    }).join('');
  };

  layer.innerHTML = renderSide('home', homeTeam, m.homeFormation) + renderSide('away', awayTeam, m.awayFormation);

  layer.querySelectorAll('.matchup-pin').forEach(pin => {
    const side = pin.dataset.side;
    const idx = Number(pin.dataset.index);
    const team = side === 'home' ? homeTeam : awayTeam;
    const player = lineupFor(team, side === 'home' ? m.homeFormation : m.awayFormation)[idx];
    bindPinEvents(pin, side, idx, team, player);
  });

  renderMatchupArrows();
  const readout = document.getElementById('matchup-readout');
  if (readout) {
    readout.innerHTML = `<span class="mr-dot" style="background:${homeTeam.color || '#38bdf8'}"></span><strong>${escapeHtml(homeTeam.team)}</strong> <span class="mr-muted">${m.homeFormation}</span> <span class="mr-vs">vs</span> <strong>${escapeHtml(awayTeam.team)}</strong> <span class="mr-muted">${m.awayFormation}</span>`;
  }
}

export function matchupSetTeam(side, key) {
  const m = ensureMatchup();
  if (!m || !state.database[key]) return;
  if (side === 'home') {
    m.homeTeam = key;
    m.homeFormation = validFormation(state.database[key].mod);
    m.positions.home = Array(11).fill(null);
  } else {
    m.awayTeam = key;
    m.awayFormation = validFormation(state.database[key].mod);
    m.positions.away = Array(11).fill(null);
  }
  renderMatchup();
}

export function matchupSetFormation(side, formation) {
  const m = ensureMatchup();
  if (!m || !FORMATIONS[formation]) return;
  if (side === 'home') {
    m.homeFormation = formation;
    m.positions.home = Array(11).fill(null);
  } else {
    m.awayFormation = formation;
    m.positions.away = Array(11).fill(null);
  }
  renderMatchup();
}

export function toggleMatchupDraw() {
  const m = ensureMatchup();
  if (!m) return;
  m.drawMode = !m.drawMode;
  renderMatchup();
}

export function clearMatchupArrows() {
  const m = ensureMatchup();
  if (!m) return;
  m.arrows = [];
  renderMatchupArrows();
}

export function resetMatchup() {
  const m = ensureMatchup();
  if (!m) return;
  m.positions = { home: Array(11).fill(null), away: Array(11).fill(null) };
  m.arrows = [];
  m.drawMode = false;
  renderMatchup();
}

export function buildMatchupSVG() {
  const m = ensureMatchup();
  if (!m) return null;
  const homeTeam = state.database[m.homeTeam];
  const awayTeam = state.database[m.awayTeam];
  if (!homeTeam || !awayTeam) return null;

  const labels = (side, team, formation) => lineupFor(team, formation).map((player, idx) => {
    const [x, y] = pinPosition(side, formation, idx);
    const sx = x * 10;
    const sy = y * 6.8;
    const color = team.color || '#38bdf8';
    const name = String(player.nome || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const width = Math.max(54, name.length * 5.7 + 12);
    return `<g transform="translate(${sx.toFixed(1)},${sy.toFixed(1)})">
      <circle cx="0" cy="0" r="17" fill="${color}" stroke="#ffffff" stroke-width="2" />
      <text x="0" y="4.5" text-anchor="middle" fill="#06111f" font-size="11" font-weight="900" font-family="Arial,Helvetica,sans-serif">${escapeHtml(String(player.num))}</text>
      <rect x="${(-width / 2).toFixed(1)}" y="20" width="${width.toFixed(1)}" height="17" rx="8.5" fill="rgba(8,11,17,0.92)" stroke="rgba(255,255,255,0.18)" />
      <text x="0" y="32" text-anchor="middle" fill="#f8fafc" font-size="9" font-weight="700" font-family="Arial,Helvetica,sans-serif">${name}</text>
    </g>`;
  }).join('');

  const arrows = (m.arrows || []).map(points =>
    `<path d="${arrowPath(points)}" fill="none" stroke="#fbbf24" stroke-width="2.6" stroke-linecap="round" marker-end="url(#matchup-export-arrowhead)" opacity="0.95" />`).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="font-family:Arial,Helvetica,sans-serif;">
    <defs><marker id="matchup-export-arrowhead" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 2 L 7 5 L 0 8 z" fill="#fbbf24" /></marker></defs>
    <rect width="${W}" height="${H}" fill="#102017" />
    ${PITCH_LINES}
    ${arrows}
    ${labels('home', homeTeam, m.homeFormation)}
    ${labels('away', awayTeam, m.awayFormation)}
    <text x="42" y="666" fill="rgba(255,255,255,0.62)" font-size="11" font-family="Arial,Helvetica,sans-serif">${escapeHtml(homeTeam.team)} ${m.homeFormation} vs ${escapeHtml(awayTeam.team)} ${m.awayFormation} • Tactical Hub Pro 11v11</text>
  </svg>`;
}

function safeFile(value) {
  return String(value || 'matchup').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export function downloadMatchupSVG() {
  const svg = buildMatchupSVG();
  if (!svg) return;
  const m = state.matchup;
  downloadSVG(svg, `matchup_${safeFile(m.homeTeam)}_vs_${safeFile(m.awayTeam)}.svg`);
}

export function downloadMatchupPNG() {
  const svg = buildMatchupSVG();
  if (!svg) return;
  const m = state.matchup;
  downloadPNG(svg, `matchup_${safeFile(m.homeTeam)}_vs_${safeFile(m.awayTeam)}.png`, W * 2, H * 2);
}

// Re-export so the shell can render an empty matchup before the tab is opened.
export { SLOT_SPECS };
