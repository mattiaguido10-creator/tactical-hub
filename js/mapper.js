// Strict, dependency-free 11-slot tactical mapper.
// Mirrors the Python generator used for data/serie_a.js and data/premier_league.js.

import { SLOT_SPECS, FP_SLOT_MAP } from './formations.js';

export function sideOf(pos) {
  const p = String(pos || '').toUpperCase().trim();
  if (p.endsWith('-R') || ['RB','RWB','RM','RW','RF','RCF','CD-R','CF-R','AM-R','CM-R'].includes(p)) return 'R';
  if (p.endsWith('-L') || ['LB','LWB','LM','LW','LF','LCF','CD-L','CF-L','AM-L','CM-L'].includes(p)) return 'L';
  return 'C';
}

export function classifyPlayer(pos, formation) {
  const p = String(pos || 'M').toUpperCase().trim();
  const side = sideOf(p);
  const backLine = String(formation || '').split('-')[0];
  const backFive = backLine === '3' || backLine === '5';
  if (['G','GK','POR'].includes(p)) return ['GK','GK','C'];
  if (p.startsWith('CD') || ['CB','DC'].includes(p)) return ['DEF','CB',side];
  if (['LB','RB','LWB','RWB','FB','WB'].includes(p) || p.startsWith('FB')) {
    return ['DEF', ['LWB','RWB','WB'].includes(p) ? 'WB' : 'FB', side];
  }
  if (p === 'SW') return ['MID','DM','C'];
  if (['DM','CDM'].includes(p)) return ['MID','DM','C'];
  if (['AM','CAM'].includes(p)) return ['MID','AM',side];
  // Wide attacking midfielders in a 4-2-3-1 / 4-3-3 are forwards.
  if (p.startsWith('AM-')) return ['ATT','W',side];
  if (p.startsWith('AM')) return ['MID','AM',side];
  if (p.startsWith('CM')) return ['MID','CM',side];
  if (['LM','RM'].includes(p)) {
    if (formation === '3-1-4-2') return ['MID','W',side];
    if (backFive) return ['DEF','WB',side];
    if (formation === '4-2-3-1') return ['MID','DM',side];
    if (formation === '4-4-2') return ['MID','W',side];
    if (formation === '4-3-3') return ['MID','CM',side];
    return ['MID','W',side];
  }
  if (['LW','RW','LF','RF'].includes(p)) return ['ATT','W',side];
  if (p === 'RCF' || p === 'LCF') {
    if (formation === '3-4-2-1' || formation === '3-5-1-1') return ['MID','AM',side];
    if (formation === '3-4-3' || formation === '4-3-3' || formation === '4-2-3-1') return ['ATT','W',side];
    return ['ATT','ST',side];
  }
  if (p === 'CF-R' || p === 'CF-L') {
    if (formation === '3-4-2-1') return ['MID','AM',side];
    if (formation === '3-4-3') return ['ATT','W',side];
    return ['ATT','ST',side];
  }
  if (['CF','ST','F','SS','A'].includes(p) || p.startsWith('CF') || p.startsWith('ST')) {
    return ['ATT','ST',side];
  }
  if (p.startsWith('D')) return ['DEF','CB',side];
  if (p.startsWith('M')) return ['MID','CM',side];
  if (p.startsWith('F') || p.startsWith('A')) return ['ATT','ST',side];
  return ['MID','CM',side];
}

export function slotFamily(spec) {
  const [line, role] = spec;
  if (line === 'GK') return 'GK';
  if (line === 'DEF') return 'DEF';
  if (line === 'MID' && role === 'WB') return 'DEF';
  if (line === 'ATT') return 'ATT';
  return 'MID';
}

export function slotAccepts(profile, spec) {
  const [line, role, side] = profile;
  const [sline, srole, sside] = spec;
  const sfam = slotFamily(spec);
  if (line === 'GK' || sfam === 'GK') return line === 'GK' && sfam === 'GK';
  if (line === 'DEF') {
    if (sfam !== 'DEF') return false;
    if (role === 'CB') return srole === 'CB';
    if (role === 'FB' || role === 'WB') return srole === 'FB' || srole === 'WB';
    return ['CB','FB','WB'].includes(srole);
  }
  if (sfam === 'DEF') return false;
  if (srole === 'ST') return line === 'ATT';
  if (line === 'MID') {
    if (sfam === 'MID') {
      if (role === 'DM') return srole === 'DM' || srole === 'CM';
      if (role === 'CM') return srole === 'CM' || srole === 'DM' || srole === 'AM';
      if (role === 'AM') return srole === 'AM' || srole === 'CM' || srole === 'W';
      if (role === 'W') return srole === 'W' || srole === 'AM';
      return ['DM','CM','AM','W'].includes(srole);
    }
    return srole === 'AM' || srole === 'W';
  }
  if (line === 'ATT') {
    if (sfam === 'ATT') {
      if (role === 'ST') return srole === 'ST';
      return srole === 'ST' || srole === 'W' || srole === 'AM';
    }
    return srole === 'AM' || srole === 'W';
  }
  return false;
}

export function slotAcceptsFp(profile, spec) {
  const [line] = profile;
  const [sline, srole] = spec;
  const sfam = slotFamily(spec);
  if (line === 'GK' || sfam === 'GK') return line === 'GK' && sfam === 'GK';
  if (line === 'DEF') return sfam === 'DEF';
  if (sfam === 'DEF') return false;
  if (srole === 'ST') return line === 'ATT';
  if (line === 'MID' || line === 'ATT') return sfam === 'MID' || sfam === 'ATT';
  return false;
}

export function playerSlotScore(profile, spec, formationMod, relaxed = false) {
  const [line, role, side] = profile;
  const [sline, srole, sside] = spec;
  if (!slotAccepts(profile, spec)) {
    if (relaxed && line === 'DEF' && slotFamily(spec) === 'DEF') {
      if (role === 'CB' && (srole === 'FB' || srole === 'WB')) return 40;
      if ((role === 'FB' || role === 'WB') && srole === 'CB') return 35;
    }
    if (relaxed && line === 'MID' && slotFamily(spec) === 'DEF' && srole === 'WB') return 30;
    return -1000000;
  }
  let sc = 500;
  if (line === sline) sc += 160;
  if (role === srole) sc += 260;
  if (side === sside && side !== 'C') sc += 70;
  if (side !== sside && side !== 'C' && sside !== 'C') sc -= 45;
  if (line === 'DEF' && role === 'CB' && srole === 'CB') sc += 160;
  if (line === 'DEF' && (role === 'FB' || role === 'WB') && (srole === 'FB' || srole === 'WB')) sc += 150;
  if (line === 'MID' && role === 'DM' && srole === 'DM') sc += 150;
  if (line === 'MID' && role === 'CM' && srole === 'CM') sc += 150;
  if (line === 'MID' && role === 'AM' && srole === 'AM') sc += 210;
  if (line === 'MID' && role === 'W' && srole === 'W') sc += 150;
  if (line === 'ATT' && role === 'W' && srole === 'W') sc += 210;
  if (line === 'ATT' && role === 'ST' && srole === 'ST') sc += 240;
  if (line === 'ATT' && srole === 'AM') sc += 90;
  if (formationMod === '4-2-3-1' && line === 'MID' && (role === 'DM' || role === 'CM') && srole === 'DM') sc += 55;
  if (formationMod === '4-4-2' && line === 'MID' && role === 'W' && srole === 'W') sc += 55;
  return sc;
}

// Hungarian algorithm for a square cost matrix (minimisation).
export function hungarian(cost) {
  const n = cost.length;
  const m = cost[0]?.length || 0;
  const big = 1e15;
  const u = new Array(n + 1).fill(0);
  const v = new Array(m + 1).fill(0);
  const p = new Array(m + 1).fill(0);
  const way = new Array(m + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array(m + 1).fill(big);
    const used = new Array(m + 1).fill(false);
    while (true) {
      used[j0] = true;
      const i0 = p[j0];
      let delta = big;
      let j1 = 0;
      for (let j = 1; j <= m; j++) {
        if (!used[j]) {
          const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
          if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
          if (minv[j] < delta) { delta = minv[j]; j1 = j; }
        }
      }
      for (let j = 0; j <= m; j++) {
        if (used[j]) { u[p[j]] += delta; v[j] -= delta; }
        else { minv[j] -= delta; }
      }
      j0 = j1;
      if (p[j0] === 0) break;
    }
    while (true) {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
      if (j0 === 0) break;
    }
  }
  const ans = new Array(n).fill(-1);
  for (let j = 1; j <= m; j++) if (p[j] > 0) ans[p[j] - 1] = j - 1;
  return ans;
}

function fpMapValid(formation, mapping) {
  if (!mapping || !SLOT_SPECS[formation]) return false;
  const keys = Object.keys(mapping).map(Number).sort((a, b) => a - b);
  const vals = Object.values(mapping).sort((a, b) => a - b);
  if (keys.length !== 11 || vals.length !== 11) return false;
  for (let i = 0; i < 11; i++) {
    if (keys[i] !== i + 1 || vals[i] !== i) return false;
  }
  return true;
}

export function fpOrder(starters, formation) {
  const mapping = FP_SLOT_MAP[formation];
  if (!fpMapValid(formation, mapping) || !Array.isArray(starters) || starters.length !== 11) return null;
  const fps = starters.map(st => parseInt(st.fp, 10));
  if (fps.some(fp => !Number.isInteger(fp)) || new Set(fps).size !== 11) return null;
  if (fps.some(fp => fp < 1 || fp > 11)) return null;
  const ordered = new Array(11).fill(null);
  starters.forEach(st => { ordered[mapping[parseInt(st.fp, 10)]] = st; });
  if (ordered.some(x => !x)) return null;
  const specs = SLOT_SPECS[formation];
  for (let i = 0; i < 11; i++) {
    if (!slotAcceptsFp(classifyPlayer(ordered[i].pos || 'M', formation), specs[i])) return null;
  }
  return ordered;
}

export function assignToSlots(starters, formation, sourceFormation = formation) {
  const specs = SLOT_SPECS[formation] || SLOT_SPECS['4-3-3'];
  if (!Array.isArray(starters) || starters.length !== 11) return starters.slice();
  if (sourceFormation === formation) {
    const byFp = fpOrder(starters, formation);
    if (byFp) return byFp;
  }

  // Interpret ESPN's ambiguous tags (LM/RM, CF-R/CF-L) in the shape the XI
  // actually played, then map those players into the requested target shape.
  const profiles = starters.map(st => classifyPlayer(st.pos || 'M', sourceFormation));
  const solve = (relaxed) => {
    const scores = starters.map((_, p) => specs.map((spec, s) => playerSlotScore(profiles[p], spec, formation, relaxed)));
    const costs = scores.map(row => row.map(sc => 1000000 - sc));
    const colForRow = hungarian(costs);
    const result = new Array(specs.length).fill(null);
    let total = 0;
    colForRow.forEach((sIdx, pIdx) => {
      if (sIdx >= 0 && sIdx < specs.length) {
        result[sIdx] = starters[pIdx];
        total += scores[pIdx][sIdx];
      }
    });
    return { result, total };
  };

  let { result, total } = solve(false);
  if (total < -500000) ({ result, total } = solve(true));
  const used = new Set(result.filter(Boolean));
  const remaining = starters.filter(st => !used.has(st));
  for (let i = 0; i < result.length; i++) {
    if (!result[i] && remaining.length) result[i] = remaining.shift();
  }
  return result.filter(Boolean).slice(0, 11);
}

// Legacy-compatible entry point used by the pitch. `team` is the active team
// object; `targetMod` is the formation to display (live formation when the
// "XI Ultima Gara" toggle is active).
export function assignStartersToSlots(starters, team, targetMod) {
  const sourceFormation = team?.lastMatch?.matchFormation || team?.mod || targetMod;
  if (!Array.isArray(starters) || starters.length !== 11) return starters || [];
  if (sourceFormation === targetMod) {
    const byFp = fpOrder(starters, targetMod);
    if (byFp) return byFp;
  }
  return assignToSlots(starters, targetMod, sourceFormation);
}

export function inferFormation(starters, fallback = '4-2-3-1') {
  if (!Array.isArray(starters) || starters.length !== 11) return fallback;
  const pos = starters.map(st => String(st.pos || 'M').toUpperCase().trim());
  const cb = pos.filter(p => p.startsWith('CD') || ['CB','DC'].includes(p)).length;
  const wide = pos.filter(p => ['LM','RM','LW','RW','LF','RF'].includes(p)).length;
  const pureSt = pos.filter(p => ['F','ST','CF','SS','A'].includes(p)).length;
  const splitSt = pos.filter(p => p === 'CF-R' || p === 'CF-L').length;
  const am = pos.filter(p => p.startsWith('AM')).length;
  const backThree = cb >= 3;
  if (backThree) {
    if (pureSt >= 1 && (splitSt + am) >= 2) return '3-4-2-1';
    if (wide >= 2 && pureSt >= 1) return '3-4-3';
    if (splitSt >= 2 && pureSt === 0) return '3-5-2';
    if (am >= 1 && splitSt >= 2) return '3-4-1-2';
    return '3-5-2';
  }
  if (splitSt >= 2 && wide >= 2) return '4-4-2';
  if (pureSt >= 2) return '4-4-2';
  if (am >= 1) return '4-2-3-1';
  return fallback;
}

// Family-level validator: the hard rules are that a defender never leaves the
// defensive family, a midfielder never plays centre-forward, and only a GK
// occupies goal. Exact role matching is intentionally not required because a
// shape change may move a full-back to centre-back or a winger to wing-back.
export function validateAssignment(ordered, formation, sourceFormation = formation) {
  const specs = SLOT_SPECS[formation];
  if (!specs || !Array.isArray(ordered) || ordered.length !== 11) return false;
  for (let i = 0; i < 11; i++) {
    const st = ordered[i];
    if (!st) return false;
    const [line] = classifyPlayer(st.pos || 'M', sourceFormation);
    const spec = specs[i];
    const fam = slotFamily(spec);
    if (line === 'GK' || fam === 'GK') {
      if (!(line === 'GK' && fam === 'GK')) return false;
      continue;
    }
    if (line === 'DEF') {
      if (fam !== 'DEF') return false;
      continue;
    }
    if (line === 'MID') {
      if (spec[1] === 'ST') return false;
      if (spec[0] === 'DEF' && spec[1] !== 'WB') return false;
    }
  }
  return true;
}
