// DataScout-style dual radar cards, tooltips and SVG/PNG downloads.

import { state, persistUi } from './core.js';
import { RADAR_LABELS, LEAGUE_LABELS } from './formations.js';
import { downloadSVG, downloadPNG } from './export.js';

function sliceColor(val) {
  return val < 40 ? '#e4613b' : val < 51 ? '#cc7c00' : val < 65 ? '#b29f00' : val < 80 ? '#87bd00' : '#4cc91f';
}

export function buildPizzaSVG(type, values) {
  const cx = 215;
  const cy = 205;
  const R = 132;
  const labels = RADAR_LABELS[type][state.radarLang];
  const n = 10;
  const step = (Math.PI * 2) / n;
  let rings = '';
  let spokes = '';
  let slices = '';
  let valTexts = '';
  let outerLabels = '';

  [0.2, 0.4, 0.6, 0.8, 1.0].forEach((frac, idx) => {
    const rr = R * frac;
    rings += `<circle cx="${cx}" cy="${cy}" r="${rr}" fill="none" stroke="${frac === 1.0 ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.12)'}" stroke-width="1.1" ${frac < 1.0 ? 'stroke-dasharray="3 3"' : ''}/>`;
    if (idx === 2 || idx === 3) rings += `<text x="${cx + 4}" y="${cy - rr + 11}" fill="rgba(255,255,255,0.38)" font-size="10" font-weight="600">${Math.round(frac * 100)}</text>`;
  });

  for (let i = 0; i < n; i++) {
    const a1 = -Math.PI / 2 + i * step;
    const a2 = a1 + step;
    const am = (a1 + a2) / 2;
    spokes += `<line x1="${cx}" y1="${cy}" x2="${(cx + R * Math.cos(a1)).toFixed(1)}" y2="${(cy + R * Math.sin(a1)).toFixed(1)}" stroke="rgba(255,255,255,0.13)" stroke-width="1"/>`;
    const v = values[i] || 50;
    const rv = Math.max(14, (v / 100) * R);
    const d = `M ${cx} ${cy} L ${(cx + rv * Math.cos(a1)).toFixed(2)} ${(cy + rv * Math.sin(a1)).toFixed(2)} A ${rv.toFixed(2)} ${rv.toFixed(2)} 0 0 1 ${(cx + rv * Math.cos(a2)).toFixed(2)} ${(cy + rv * Math.sin(a2)).toFixed(2)} Z`;
    slices += `<path d="${d}" fill="${sliceColor(v)}" stroke="#0d1322" stroke-width="1.8" class="ds-slice" onmouseenter="updateRadarReadout('${type}',${i},${v})" onclick="updateRadarReadout('${type}',${i},${v})" />`;
    const rText = v < 36 ? Math.max(rv * 0.68, 22) : rv * 0.62;
    valTexts += `<text x="${(cx + rText * Math.cos(am)).toFixed(1)}" y="${(cy + rText * Math.sin(am)).toFixed(1)}" fill="#0b0f19" font-size="13" font-weight="800" text-anchor="middle" dominant-baseline="central" pointer-events="none">${v}</text>`;
    const rLbl = R + 22;
    const lx = cx + rLbl * Math.cos(am);
    const ly = cy + rLbl * Math.sin(am);
    const normDeg = i * 36 + 18;
    const rot = (normDeg > 90 && normDeg < 270) ? (normDeg - 180) : (normDeg > 270 ? normDeg - 360 : normDeg);
    const parts = labels[i].split(' ');
    if (labels[i].length > 12 && parts.length === 2) {
      outerLabels += `<g transform="translate(${lx.toFixed(1)},${ly.toFixed(1)}) rotate(${rot})"><text x="0" y="-5" fill="#e2e8f0" font-size="11.5" font-weight="600" text-anchor="middle">${parts[0]}</text><text x="0" y="8" fill="#e2e8f0" font-size="11.5" font-weight="600" text-anchor="middle">${parts[1]}</text></g>`;
    } else {
      outerLabels += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" transform="rotate(${rot}, ${lx.toFixed(1)}, ${ly.toFixed(1)})" fill="#e2e8f0" font-size="11.5" font-weight="600" text-anchor="middle" dominant-baseline="central">${labels[i]}</text>`;
    }
  }

  return `<svg id="svg-chart-${type}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 430 410"><rect width="430" height="410" fill="#0d1322" rx="8"/>${rings}${spokes}${slices}${valTexts}${outerLabels}<circle cx="${cx}" cy="${cy}" r="5.5" fill="#0d1322" stroke="rgba(255,255,255,0.45)" stroke-width="1.5"/></svg>`;
}

export function updateRadarReadout(type, idx, val) {
  const el = document.getElementById(`ds-readout-${type}`);
  if (el) el.innerHTML = `<span><strong>${RADAR_LABELS[type][state.radarLang][idx]}</strong> (${val}/100): ${RADAR_LABELS[type].desc[idx]}</span>`;
}

export function setRadarLang(lang) {
  state.radarLang = lang === 'it' ? 'it' : 'en';
  persistUi();
  document.getElementById('radar-lang-en')?.classList.toggle('active', state.radarLang === 'en');
  document.getElementById('radar-lang-it')?.classList.toggle('active', state.radarLang === 'it');
  const team = state.database[state.activeTeam];
  if (team) renderDualRadarCharts(team);
}

function shortCoachName(name) {
  const parts = String(name || '').split(' ');
  return parts.length > 1 ? `${parts[0][0]}. ${parts.slice(1).join(' ')}` : name;
}

function leagueBadge() {
  return LEAGUE_LABELS[state.activeLeague] || state.league?.name || 'Tactical Hub';
}

export function downloadStyleChart(type, format = 'svg') {
  const team = state.database[state.activeTeam];
  const svgEl = document.getElementById(`svg-chart-${type}`);
  if (!team || !svgEl) return;
  const shortName = shortCoachName(team.nome);
  const accent = type === 'off' ? '#dc2626' : '#2563eb';
  const title = type === 'off' ? 'Offensive Style' : 'Defensive Style';
  const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="460" height="560" viewBox="0 0 460 560" style="font-family:Arial,Helvetica,sans-serif;"><rect width="460" height="560" fill="#0d1322" rx="14"/><path d="M 14 0 L 446 0 Q 460 0 460 14 L 460 112 L 0 112 L 0 14 Q 0 0 14 0 Z" fill="${accent}"/><rect x="20" y="14" width="110" height="22" rx="11" fill="rgba(255,255,255,0.22)"/><text x="75" y="29" fill="#fff" font-size="11" font-weight="700" text-anchor="middle">${title}</text><text x="20" y="68" fill="#fff" font-size="25" font-weight="900">${shortName}</text><rect x="20" y="80" width="170" height="22" rx="11" fill="#fff"/><text x="105" y="95" fill="#111827" font-size="11" font-weight="700" text-anchor="middle">${leagueBadge()}</text><rect x="335" y="80" width="105" height="22" rx="11" fill="#fff"/><text x="387" y="95" fill="#111827" font-size="11" font-weight="700" text-anchor="middle">tacticalhub.pro</text><g transform="translate(15,120)">${svgEl.innerHTML}</g><text x="20" y="544" fill="#94a3b8" font-size="10.5" font-style="italic">Indice stile di gioco ${state.league?.name || ''} 2026/27 • Tactical Hub Pro</text></svg>`;
  const base = `${String(team.nome).toLowerCase().replace(/[^a-z0-9]/g, '_')}_${type}_style`;
  if (format === 'png') downloadPNG(fullSvg, `${base}.png`, 920, 1120);
  else downloadSVG(fullSvg, `${base}.svg`);
}

export function renderDualRadarCharts(team) {
  if (!team) return;
  const container = document.getElementById('radar-cards-container');
  if (!container) return;
  const shortName = shortCoachName(team.nome);
  const badge = leagueBadge();
  const card = (type, title, fallback) => `
    <div class="ds-card">
      <div class="ds-banner ${type}">
        <div class="ds-banner-top"><span class="ds-style-pill">${title}</span><span class="ds-dl-group"><button class="ds-dl-btn" onclick="downloadStyleChart('${type}','svg')" title="Scarica SVG">SVG</button><button class="ds-dl-btn" onclick="downloadStyleChart('${type}','png')" title="Scarica PNG">PNG</button></span></div>
        <div class="ds-coach-title">${shortName}</div>
        <div class="ds-banner-bottom"><span class="ds-white-pill">${badge}</span><span class="ds-white-pill">tacticalhub.pro</span></div>
      </div>
      <div class="ds-body">
        <div class="ds-svg-wrap">${buildPizzaSVG(type, team[fallback] || [60,60,60,50,60,60,60,60,60,60])}</div>
        <div class="ds-hover-readout" id="ds-readout-${type}"><span>Passa il cursore su uno spicchio per ispezionare il parametro ${type === 'off' ? 'offensivo' : 'difensivo'}.</span></div>
        <div class="ds-footer-note">Indice calcolato sullo stile ${type === 'off' ? 'offensivo' : 'difensivo'}, pressing e solidità (2023–2027).</div>
      </div>
    </div>`;
  container.innerHTML = card('off', 'Offensive Style', 'radarOff') + card('def', 'Defensive Style', 'radarDef');
}
