// Pitch rendering, tactical phases, ballots and pitch export.

import { state, normStr, persistUi } from './core.js';
import { FORMATIONS, SLOT_SPECS } from './formations.js';
import { assignStartersToSlots } from './mapper.js';
import { downloadSVG, downloadPNG } from './export.js';

const PITCH_W = 1000;
const PITCH_H = 680;

export function getPhaseAdjustedCoord(baseCoord, idx, mod) {
  let x = baseCoord[0];
  let y = baseCoord[1];
  if (state.currentPitchPhase === 'possesso') {
    if (idx === 0) x = 14;
    else if (idx === 1 || idx === 4) {
      if (mod.startsWith('4-') && idx === 4) { x = 44; y = 26; }
      else if (mod.startsWith('4-') && idx === 1) { x = 52; y = 88; }
      else x = Math.min(82, x + 16);
    } else if (idx === 2 || idx === 3) x += 9;
    else if (idx >= 5 && idx <= 8) x = Math.min(86, x + 11);
    else x = Math.min(91, x + 6);
  } else if (state.currentPitchPhase === 'difesa') {
    if (idx === 0) x = 7.5;
    else if (idx >= 1 && idx <= 4) x = Math.max(18, x - 6);
    else if (idx >= 5 && idx <= 8) x = Math.max(29, x - 12);
    else x = Math.max(44, x - 24);
  }
  return [x, y, baseCoord[2], baseCoord[3], baseCoord[4], baseCoord[5]];
}

function activeFormationFor(team, liveMod) {
  if (liveMod && FORMATIONS[liveMod]) return liveMod;
  return FORMATIONS[team.mod] ? team.mod : '4-3-3';
}

function ballForSlot(team, slot) {
  return (team.ball || []).find(b => b[4] === slot) || null;
}

function buildDisplayXI(team, liveStarters, liveMod) {
  const activeMod = activeFormationFor(team, liveMod);
  const specs = SLOT_SPECS[activeMod] || SLOT_SPECS['4-3-3'];
  let displayXI = (team.xi || []).map((p, idx) => {
    const ball = ballForSlot(team, idx);
    const swapped = !!state.swappedSlots[idx];
    return {
      id: idx + 1,
      num: p[0],
      nome: ball ? (swapped ? ball[2] : ball[1]) : p[1],
      ruolo: p[2],
      task: p[3],
      mov: p[4],
      piede: p[5] || '',
      stat: p[6] || '',
      tit: ball ? (swapped ? ball[3] : ball[0]) : 95,
      inBall: !!ball,
      live: false,
    };
  });

  if (Array.isArray(liveStarters) && liveStarters.length === 11) {
    const ordered = assignStartersToSlots(liveStarters, team, activeMod);
    displayXI = displayXI.map((slot, i) => {
      const liveP = ordered[i];
      if (!liveP) return slot;
      const liveTokens = normStr(liveP.nome).split(/\s+/).filter(w => w.length >= 3);
      const matchBase = (team.xi || []).find(b => {
        const tokens = normStr(b[1]).split(/\s+/).filter(w => w.length >= 3);
        return tokens.some(t => liveTokens.includes(t));
      });
      const spec = specs[i] || ['MID', 'CM', 'C'];
      return {
        id: i + 1,
        num: liveP.num,
        nome: liveP.nome,
        tit: 100,
        inBall: false,
        live: true,
        ruolo: matchBase ? matchBase[2] : `${spec[1]} (${spec[0]}) • Live XI`,
        task: matchBase ? matchBase[3] : slot.task,
        mov: matchBase ? matchBase[4] : slot.mov,
        piede: matchBase ? (matchBase[5] || '') : '',
        stat: `Titolare Ultima Gara (${activeMod})`,
      };
    });
  }
  return { displayXI, activeMod };
}

export function renderCampo(team, liveStarters = null, liveMod = null) {
  if (!team) return;
  const playersLayer = document.getElementById('players-layer');
  const arrowsLayer = document.getElementById('arrows-layer');
  if (!playersLayer || !arrowsLayer) return;

  const { displayXI, activeMod } = buildDisplayXI(team, liveStarters, liveMod);
  const coords = FORMATIONS[activeMod] || FORMATIONS['4-3-3'];
  const color = team.color || '#38bdf8';

  arrowsLayer.innerHTML = `<defs><marker id="arrowhead" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 2 L 7 5 L 0 8 z" fill="#ffffff" /></marker></defs>`;

  let html = '';
  displayXI.forEach((p, idx) => {
    const base = coords[idx] || coords[coords.length - 1];
    const c = getPhaseAdjustedCoord(base, idx, activeMod);
    const sx = Math.round(c[0] * 10);
    const sy = Math.round(c[1] * 6.8);
    const d = c.length >= 6 && c[4] !== undefined
      ? `M ${sx} ${sy} Q ${c[4]} ${c[5]} ${c[2]} ${c[3]}`
      : `M ${sx} ${sy} L ${c[2]} ${c[3]}`;
    const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathEl.setAttribute('d', d);
    pathEl.setAttribute('class', `tactical-arrow ${state.showAllArrows ? 'active' : ''}`);
    pathEl.setAttribute('id', `arrow-${p.id}`);
    pathEl.setAttribute('marker-end', 'url(#arrowhead)');
    arrowsLayer.appendChild(pathEl);
    html += `<div class="player-pin" id="pin-${p.id}" data-slot="${idx}" style="left:${c[0]}%; top:${c[1]}%; --pin-color:${color};" onmouseenter="focusGiocatore(${p.id})" onclick="focusGiocatore(${p.id})"><div class="player-badge">${p.num}</div><div class="player-name-tag">${p.nome}</div></div>`;
  });
  playersLayer.innerHTML = html;
  window.activeDisplayXI = displayXI;
  window.activePitchFormation = activeMod;

  const preferred = window.__selectedPitchSlot;
  const focusId = preferred && displayXI[preferred - 1] ? preferred : (displayXI[9]?.id || 1);
  focusGiocatore(focusId);
}

export function focusGiocatore(id) {
  const p = window.activeDisplayXI?.find(x => x.id === id);
  if (!p) return;
  window.__selectedPitchSlot = id;
  if (!state.showAllArrows) document.querySelectorAll('.tactical-arrow').forEach(a => a.classList.remove('active'));
  document.querySelectorAll('.player-pin').forEach(pin => pin.classList.remove('selected'));
  document.getElementById(`arrow-${id}`)?.classList.add('active');
  document.getElementById(`pin-${id}`)?.classList.add('selected');

  const setText = (elId, text) => { const el = document.getElementById(elId); if (el) el.innerText = text; };
  setText('hud-num', p.num);
  setText('hud-name', p.nome);
  setText('hud-role', p.ruolo);
  setText('hud-task', p.task);
  setText('hud-movement', p.mov);
  const meta = document.getElementById('hud-extra-meta');
  if (meta) {
    meta.innerHTML = `${p.piede ? `<span class="hud-mini-pill">Piede: ${p.piede}</span>` : ''}${p.stat ? `<span class="hud-mini-pill" style="color:var(--accent-green);border-color:rgba(16,185,129,0.3);">${p.stat}</span>` : ''}`;
  }
  const titEl = document.getElementById('hud-tit');
  if (titEl) {
    titEl.innerText = p.tit === 100 ? 'LIVE XI' : `${p.tit}% TIT`;
    titEl.classList.toggle('warn', p.inBall);
  }
}

export function renderSetPieces(team) {
  const sp = team?.sp || [[], [], []];
  const fmt = arr => (arr || []).map((n, i) => `<div class="sp-player"><span class="sp-rank">${i + 1}.</span><span>${n}</span></div>`).join('');
  const pen = document.getElementById('sp-pen');
  const fk = document.getElementById('sp-fk');
  const ck = document.getElementById('sp-ck');
  if (pen) pen.innerHTML = fmt(sp[0]);
  if (fk) fk.innerHTML = fmt(sp[1]);
  if (ck) ck.innerHTML = fmt(sp[2]);
}

export function renderBallottaggi(team) {
  const container = document.getElementById('ballottaggi-list');
  if (!container) return;
  if (!team?.ball || !team.ball.length) {
    container.innerHTML = '<div style="font-size:0.8rem;color:var(--text-muted);">Nessun ballottaggio aperto.</div>';
    return;
  }
  container.innerHTML = team.ball.map((b, bIdx) => {
    const sw = state.swappedSlots[b[4]];
    const leftName = sw ? b[2] : b[1];
    const rightName = sw ? b[1] : b[2];
    const leftPct = sw ? b[3] : b[0];
    const rightPct = sw ? b[0] : b[3];
    return `<div class="ball-row" onclick="scambiaBallottaggio(${bIdx})"><div class="ball-names"><span class="ball-pct-left">${leftPct}%</span><div class="ball-players">${leftName} <span class="sep">-</span> <span class="backup">${rightName}</span></div><span class="ball-pct-right">${rightPct}%</span></div><div class="ball-bar-track"><div class="ball-bar-fill" style="width:${leftPct}%;"></div></div></div>`;
  }).join('');
}

export function scambiaBallottaggio(bIdx) {
  const team = state.database[state.activeTeam];
  const b = team?.ball?.[bIdx];
  if (!b) return;
  state.useLiveXI = false;
  persistUi();
  document.getElementById('btn-live-xi')?.classList.remove('active');
  const systemEl = document.getElementById('coach-system');
  if (systemEl) systemEl.innerText = team.mod;
  state.swappedSlots[b[4]] = !state.swappedSlots[b[4]];
  renderBallottaggi(team);
  renderCampo(team, null, null);
  focusGiocatore(b[4] + 1);
}

export function toggleZones() {
  state.showZones = !state.showZones;
  document.getElementById('zones-layer')?.classList.toggle('visible', state.showZones);
  document.getElementById('btn-zones')?.classList.toggle('active', state.showZones);
}

export function toggleAllArrows() {
  state.showAllArrows = !state.showAllArrows;
  document.getElementById('btn-all-arrows')?.classList.toggle('active', state.showAllArrows);
  document.querySelectorAll('.tactical-arrow').forEach(a => a.classList.toggle('active', state.showAllArrows));
}

export function toggleLiveLineup() {
  state.useLiveXI = !state.useLiveXI;
  persistUi();
  const team = state.database[state.activeTeam];
  if (!team) return;
  document.getElementById('btn-live-xi')?.classList.toggle('active', state.useLiveXI);
  const cached = state.liveMatchCache[state.activeTeam];
  if (state.useLiveXI && cached?.starters?.length === 11) {
    renderCampo(team, cached.starters, cached.matchFormation);
    const sys = document.getElementById('coach-system');
    if (sys) sys.innerText = cached.matchFormation || team.mod;
  } else {
    renderCampo(team, null, null);
    const sys = document.getElementById('coach-system');
    if (sys) sys.innerText = team.mod;
  }
}

export function setPitchPhase(phase) {
  state.currentPitchPhase = phase;
  document.getElementById('phase-base')?.classList.toggle('active', phase === 'base');
  document.getElementById('phase-possesso')?.classList.toggle('active', phase === 'possesso');
  document.getElementById('phase-difesa')?.classList.toggle('active', phase === 'difesa');
  const team = state.database[state.activeTeam];
  if (!team) return;
  const cached = state.liveMatchCache[state.activeTeam];
  if (state.useLiveXI && cached?.starters?.length === 11) {
    renderCampo(team, cached.starters, cached.matchFormation);
  } else {
    renderCampo(team, null, null);
  }
}

export function applyLastMatchUI(teamKey, matchData) {
  const team = state.database[teamKey];
  if (!team || state.activeTeam !== teamKey || !matchData) return;
  const infoEl = document.getElementById('last-match-info');
  const boxEl = document.getElementById('last-match-boxscore');
  const hasStarters = Array.isArray(matchData.starters) && matchData.starters.length === 11;
  const liveFormLabel = matchData.matchFormation ? ` (${matchData.matchFormation})` : '';
  if (infoEl) {
    if (matchData.source === 'baseline' || !matchData.title) {
      infoEl.innerHTML = `<span>📋</span> <span><strong>XI Verificato 26/27</strong> (${team.mod})</span>`;
    } else {
      infoEl.innerHTML = `<span>⚽</span> <span>Ultima gara (<strong>${matchData.date || ''}</strong>): <strong>${matchData.title}</strong> ${hasStarters && state.useLiveXI ? `• <span style="color:var(--accent-green);">XI Live${liveFormLabel}</span>` : '• <span style="color:var(--accent-amber);">XI Probabile</span>'}</span> ${matchData.nextTag ? `<span class="next-match-tag">${matchData.nextTag}</span>` : ''}`;
    }
  }
  document.getElementById('btn-live-xi')?.classList.toggle('active', state.useLiveXI && hasStarters);
  const sys = document.getElementById('coach-system');
  if (sys) sys.innerText = (state.useLiveXI && hasStarters && matchData.matchFormation) ? matchData.matchFormation : team.mod;

  if (boxEl) {
    const b = matchData.boxSummary;
    if (b && b.shots !== null && b.shots !== undefined) {
      boxEl.innerHTML = `
        <div class="lbc-head">
          <div class="lbc-title">📊 Statistiche Reali Ultima Gara (${matchData.title || ''})</div>
          ${b.goalsTxt ? `<div class="lbc-events">⚽ ${b.goalsTxt}</div>` : ''}
        </div>
        <div class="lbc-stats-row">
          <div class="lbc-stat"><div class="lbc-stat-val">${b.poss !== null && b.poss !== undefined ? b.poss + '%' : '-'}</div><div class="lbc-stat-lbl">Possesso</div></div>
          <div class="lbc-stat"><div class="lbc-stat-val">${b.shots ?? '-'} (${b.sot ?? '-'})</div><div class="lbc-stat-lbl">Tiri (In Porta)</div></div>
          <div class="lbc-stat"><div class="lbc-stat-val">${b.corners ?? '-'}</div><div class="lbc-stat-lbl">Corner</div></div>
          <div class="lbc-stat"><div class="lbc-stat-val">${b.fouls ?? '-'}</div><div class="lbc-stat-lbl">Falli</div></div>
          <div class="lbc-stat"><div class="lbc-stat-val">${b.saves ?? '-'}</div><div class="lbc-stat-lbl">Parate</div></div>
        </div>`;
      boxEl.classList.add('visible');
    } else {
      boxEl.classList.remove('visible');
    }
  }

  if (state.useLiveXI && hasStarters) renderCampo(team, matchData.starters, matchData.matchFormation);
  else renderCampo(team, null, null);
}

function pitchLinesSVG() {
  return `
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
}

function zonesSVG() {
  if (!state.showZones) return '';
  return `
    <rect x="40" y="30" width="920" height="115" fill="rgba(56,189,248,0.06)" />
    <rect x="40" y="145" width="920" height="125" fill="rgba(245,158,11,0.07)" />
    <rect x="40" y="270" width="920" height="140" fill="rgba(255,255,255,0.04)" />
    <rect x="40" y="410" width="920" height="125" fill="rgba(245,158,11,0.07)" />
    <rect x="40" y="535" width="920" height="115" fill="rgba(56,189,248,0.06)" />
    <rect x="660" y="270" width="135" height="140" fill="rgba(239,68,68,0.12)" stroke="rgba(239,68,68,0.4)" stroke-dasharray="4 4" />
    <text x="672" y="292" fill="rgba(255,255,255,0.5)" font-size="14" font-weight="800">ZONA 14</text>`;
}

export function buildPitchExportSVG() {
  const team = state.database[state.activeTeam];
  if (!team) return null;
  const displayXI = window.activeDisplayXI || buildDisplayXI(team, null, null).displayXI;
  const activeMod = window.activePitchFormation || team.mod;
  const coords = FORMATIONS[activeMod] || FORMATIONS['4-3-3'];
  const color = team.color || '#38bdf8';
  const arrows = Array.from(document.querySelectorAll('#arrows-layer .tactical-arrow'))
    .map(a => `<path d="${a.getAttribute('d')}" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" marker-end="url(#export-arrowhead)" opacity="${a.classList.contains('active') ? 1 : 0.5}" />`)
    .join('');

  let players = '';
  displayXI.forEach((p, idx) => {
    const base = coords[idx] || coords[coords.length - 1];
    const c = getPhaseAdjustedCoord(base, idx, activeMod);
    const x = c[0] * 10;
    const y = c[1] * 6.8;
    const label = String(p.nome || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const width = Math.max(64, label.length * 7.2 + 14);
    players += `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)})">
      <rect x="${(-width / 2).toFixed(1)}" y="28" width="${width.toFixed(1)}" height="21" rx="10.5" fill="rgba(8,11,17,0.92)" stroke="rgba(255,255,255,0.2)" />
      <text x="0" y="42.5" text-anchor="middle" fill="#f8fafc" font-size="11" font-weight="700" font-family="Arial,Helvetica,sans-serif">${label}</text>
      <circle cx="0" cy="0" r="23" fill="${color}" stroke="#ffffff" stroke-width="2.5" />
      <text x="0" y="5" text-anchor="middle" fill="#06111f" font-size="14" font-weight="900" font-family="Arial,Helvetica,sans-serif">${p.num}</text>
    </g>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PITCH_W}" height="${PITCH_H}" viewBox="0 0 ${PITCH_W} ${PITCH_H}" style="font-family:Arial,Helvetica,sans-serif;">
    <defs><marker id="export-arrowhead" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 2 L 7 5 L 0 8 z" fill="#ffffff" /></marker></defs>
    <rect width="${PITCH_W}" height="${PITCH_H}" fill="#102017" />
    ${zonesSVG()}
    ${pitchLinesSVG()}
    ${arrows}
    ${players}
    <text x="42" y="666" fill="rgba(255,255,255,0.55)" font-size="11" font-family="Arial,Helvetica,sans-serif">${team.team} • ${activeMod} • ${state.currentPitchPhase.toUpperCase()} • Tactical Hub Pro</text>
  </svg>`;
}

function safeFile(name) {
  return String(name || 'pitch').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export function downloadPitchSVG() {
  const svg = buildPitchExportSVG();
  if (!svg) return;
  const team = state.database[state.activeTeam];
  downloadSVG(svg, `${safeFile(team?.team)}_${safeFile(window.activePitchFormation)}.svg`);
}

export function downloadPitchPNG() {
  const svg = buildPitchExportSVG();
  if (!svg) return;
  const team = state.database[state.activeTeam];
  downloadPNG(svg, `${safeFile(team?.team)}_${safeFile(window.activePitchFormation)}.png`, PITCH_W * 2, PITCH_H * 2);
}
