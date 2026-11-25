// Verifies the live "XI Ultima Gara" mapper against the bundled 2026/27 data.
// Run with: node tests/live_xi.test.js
import assert from 'node:assert/strict';
import serieA from '../data/serie_a.js';
import premierLeague from '../data/premier_league.js';
import {
  assignStartersToSlots, classifyPlayer, slotAccepts, slotAcceptsFp,
} from '../js/mapper.js';
import { SLOT_SPECS } from '../js/formations.js';

let passed = 0;
const failures = [];
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failures.push({ name, err });
    console.error(`  FAIL ${name}`);
    console.error(`       ${err.message}`);
  }
}

const SERIE_A_SAMPLE = ['lazio', 'inter', 'roma', 'milan', 'juventus'];
const PL_SAMPLE = ['arsenal', 'man_city', 'liverpool', 'chelsea', 'newcastle'];

function checkTeam(league, teamKey, expectedNames = [], targetFormation = null) {
  const team = league.teams.find(t => t.key === teamKey);
  assert.ok(team, `${league.name}: ${teamKey} missing`);
  const match = team.lastMatch;
  assert.ok(match && Array.isArray(match.starters) && match.starters.length === 11, `${teamKey}: no 11-player live XI`);
  const target = targetFormation || match.matchFormation || team.mod;
  assert.ok(SLOT_SPECS[target], `${teamKey}: unsupported formation ${target}`);
  const source = match.matchFormation || target;
  const ordered = assignStartersToSlots(match.starters, team, target);
  assert.equal(ordered.length, 11, `${teamKey}: mapped ${ordered.length} players`);
  assert.ok(ordered.every(Boolean), `${teamKey}: empty slot after mapping`);
  const names = ordered.map(p => p.nome);
  assert.equal(new Set(names).size, 11, `${teamKey}: duplicate players in XI`);
  const specs = SLOT_SPECS[target];
  ordered.forEach((player, idx) => {
    const profile = classifyPlayer(player.pos, source);
    const accepts = source === target ? slotAcceptsFp(profile, specs[idx]) : slotAccepts(profile, specs[idx]);
    assert.ok(accepts, `${teamKey}: ${player.nome} (${player.pos}) cannot play slot ${idx} ${specs[idx].join('/')}`);
  });
  assert.equal(classifyPlayer(ordered[0].pos, source)[0], 'GK', `${teamKey}: first slot is not a goalkeeper`);
  for (const name of expectedNames) {
    assert.ok(names.some(n => n.toLowerCase().includes(name.toLowerCase())), `${teamKey}: expected ${name} in XI`);
  }
  return names;
}

for (const key of SERIE_A_SAMPLE) {
  test(`Serie A live XI — ${key}`, () => {
    const names = checkTeam(serieA, key);
    assert.equal(names.length, 11);
  });
}

for (const key of PL_SAMPLE) {
  test(`Premier League live XI — ${key}`, () => {
    checkTeam(premierLeague, key);
  });
}

test('Arsenal live XI has the real 2026/27 starters', () => {
  const names = checkTeam(premierLeague, 'arsenal', ['Raya', 'Timber', 'Konsa', 'Magalhães', 'Calafiori', 'Guimarães', 'Rice', 'Madueke', 'Ødegaard', 'Eze', 'Havertz']);
  assert.equal(names.length, 11);
});

test('all 20 Premier League teams map a valid live XI', () => {
  for (const team of premierLeague.teams) {
    checkTeam(premierLeague, team.key);
  }
});

test('all remaining Serie A teams expose 11 live starters', () => {
  for (const team of serieA.teams) {
    const match = team.lastMatch;
    assert.ok(match && Array.isArray(match.starters), `${team.key}: missing last match`);
    assert.equal(match.starters.length, 11, `${team.key}: ${match.starters.length} starters`);
  }
});

test('all 20 Serie A teams map a valid live XI', () => {
  for (const team of serieA.teams) {
    checkTeam(serieA, team.key);
  }
});

console.log(`\nLive XI mapper — ${passed} passed, ${failures.length} failed`);
if (failures.length) {
  failures.forEach(({ name, err }) => console.error(`- ${name}: ${err.message}`));
  process.exit(1);
}
