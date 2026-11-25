// Run with: node tests/mapper.test.js
import assert from 'node:assert/strict';
import {
  assignToSlots,
  assignStartersToSlots,
  classifyPlayer,
  slotFamily,
  validateAssignment,
  inferFormation,
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

const player = (nome, pos, fp) => ({ nome, pos, fp });

const arsenal = [
  player('D. Raya', 'G', 1),
  player('J. Timber', 'RB', 2),
  player('E. Konsa', 'CD-R', 5),
  player('G. Magalhães', 'CD-L', 6),
  player('R. Calafiori', 'LB', 3),
  player('B. Guimarães', 'RM', 8),
  player('D. Rice', 'LM', 4),
  player('N. Madueke', 'AM-R', 7),
  player('M. Ødegaard', 'AM', 10),
  player('E. Eze', 'AM-L', 11),
  player('K. Havertz', 'F', 9),
];

const brentford = [
  player('C. Kelleher', 'G', 1),
  player('M. Kayode', 'RB', 2),
  player('K. Ajer', 'CD-R', 5),
  player('S. van den Berg', 'CD-L', 6),
  player('A. Hickey', 'LB', 3),
  player('D. Ouattara', 'RM', 7),
  player('M. Sangare', 'CM-R', 4),
  player('V. Janelt', 'CM-L', 8),
  player('K. Lewis-Potter', 'LM', 11),
  player('I. Thiago', 'CF-R', 10),
  player('K. Schade', 'CF-L', 9),
];

const inter = [
  player('J. Martínez', 'G', 1),
  player('B. Pavard', 'CD-R', 6),
  player('A. Bastoni', 'CD', 5),
  player('C. Augusto', 'CD-L', 4),
  player('D. Spence', 'RM', 2),
  player('H. Çalhanoglu', 'AM', 11),
  player('N. Barella', 'CM-R', 7),
  player('H. Mkhitaryan', 'CM-L', 8),
  player('F. Dimarco', 'LM', 3),
  player('P. Esposito', 'CF-R', 10),
  player('M. Thuram', 'CF-L', 9),
];

function assertShape(ordered, formation, sourceFormation = formation) {
  assert.equal(ordered.length, 11, '11 players assigned');
  assert.equal(new Set(ordered.map(p => p.nome)).size, 11, 'no duplicate players');
  assert.equal(validateAssignment(ordered, formation, sourceFormation), true, `assignment respects ${formation} families`);
  const specs = SLOT_SPECS[formation];
  ordered.forEach((p, i) => {
    const [line] = classifyPlayer(p.pos, sourceFormation);
    const fam = slotFamily(specs[i]);
    if (line === 'DEF') assert.equal(fam, 'DEF', `${p.nome} (DEF) must stay in defence`);
    if (line === 'GK') assert.equal(specs[i][0], 'GK', 'GK only in goal');
    if (line === 'MID') assert.notEqual(specs[i][1], 'ST', `${p.nome} (MID) cannot play ST`);
  });
}

console.log('\nTactical mapper — 11v11 role constraints\n');

test('4-2-3-1 Arsenal exact ESPN XI', () => {
  const ordered = assignToSlots(arsenal, '4-2-3-1');
  assertShape(ordered, '4-2-3-1');
  assert.deepEqual(ordered.map(p => p.nome), [
    'D. Raya', 'J. Timber', 'E. Konsa', 'G. Magalhães', 'R. Calafiori',
    'B. Guimarães', 'D. Rice', 'N. Madueke', 'M. Ødegaard', 'E. Eze', 'K. Havertz',
  ]);
  assert.equal(ordered[5].nome, 'B. Guimarães'); // DM-R, not a winger
  assert.equal(ordered[6].nome, 'D. Rice');      // DM-L, not a winger
  assert.equal(ordered[8].nome, 'M. Ødegaard');  // AM
  assert.equal(ordered[10].nome, 'K. Havertz');  // ST
});

test('4-4-2 Brentford keeps two strikers and two wide midfielders', () => {
  const ordered = assignToSlots(brentford, '4-4-2');
  assertShape(ordered, '4-4-2');
  assert.deepEqual(ordered.map(p => p.nome), [
    'C. Kelleher', 'M. Kayode', 'K. Ajer', 'S. van den Berg', 'A. Hickey',
    'D. Ouattara', 'M. Sangare', 'V. Janelt', 'K. Lewis-Potter', 'I. Thiago', 'K. Schade',
  ]);
});

test('3-5-2 Inter uses the verified formationPlace order', () => {
  const ordered = assignToSlots(inter, '3-5-2');
  assertShape(ordered, '3-5-2');
  assert.equal(ordered[5].nome, 'N. Barella');       // CM-R
  assert.equal(ordered[6].nome, 'H. Çalhanoglu');    // DM (ESPN labels him AM)
  assert.equal(ordered[7].nome, 'H. Mkhitaryan');    // CM-L
  assert.equal(ordered[4].nome, 'D. Spence');        // WB-R
  assert.equal(ordered[8].nome, 'F. Dimarco');       // WB-L
});

test('formation change 4-2-3-1 -> 4-4-2 never sends a defender forward', () => {
  const ordered = assignToSlots(arsenal, '4-4-2', '4-2-3-1');
  assertShape(ordered, '4-4-2', '4-2-3-1');
  const defenders = ordered.slice(1, 5).map(p => classifyPlayer(p.pos, '4-2-3-1')[0]);
  assert.deepEqual(defenders, ['DEF', 'DEF', 'DEF', 'DEF']);
  const strikers = ordered.slice(9, 11).map(p => classifyPlayer(p.pos, '4-2-3-1')[0]);
  assert.deepEqual(strikers, ['ATT', 'ATT']);
});

test('formation change 4-2-3-1 -> 3-4-2-1 keeps a back three and two 10s', () => {
  const ordered = assignToSlots(arsenal, '3-4-2-1', '4-2-3-1');
  assertShape(ordered, '3-4-2-1', '4-2-3-1');
  assert.equal(classifyPlayer(ordered[1].pos, '4-2-3-1')[0], 'DEF');
  assert.equal(classifyPlayer(ordered[2].pos, '4-2-3-1')[0], 'DEF');
  assert.equal(classifyPlayer(ordered[3].pos, '4-2-3-1')[0], 'DEF');
  assert.equal(classifyPlayer(ordered[10].pos, '4-2-3-1')[1], 'ST');
});

test('assignStartersToSlots adapts when the base shape differs from the live XI', () => {
  const team = { mod: '4-4-2', lastMatch: { matchFormation: '4-2-3-1' } };
  const ordered = assignStartersToSlots(arsenal, team, '4-4-2');
  assertShape(ordered, '4-4-2', '4-2-3-1');
  assert.equal(ordered[10].nome, 'K. Havertz');
});

test('classifyPlayer understands formation-specific LM/RM', () => {
  assert.deepEqual(classifyPlayer('LM', '4-2-3-1'), ['MID', 'DM', 'L']);
  assert.deepEqual(classifyPlayer('RM', '4-2-3-1'), ['MID', 'DM', 'R']);
  assert.deepEqual(classifyPlayer('LM', '4-4-2'), ['MID', 'W', 'L']);
  assert.deepEqual(classifyPlayer('RM', '3-4-2-1'), ['DEF', 'WB', 'R']);
  assert.deepEqual(classifyPlayer('LM', '3-1-4-2'), ['MID', 'W', 'L']);
});

test('inferFormation recognises a back three', () => {
  const leeds = [
    player('GK', 'G', 1), player('RCB', 'CD-R', 6), player('CB', 'CD', 5), player('LCB', 'CD-L', 4),
    player('RWB', 'RM', 2), player('RCM', 'CM-R', 7), player('LCM', 'CM-L', 8), player('LWB', 'LM', 3),
    player('RAM', 'CF-R', 10), player('LAM', 'CF-L', 11), player('ST', 'F', 9),
  ];
  assert.equal(inferFormation(leeds), '3-4-2-1');
});

test('all supported formations map a matching XI without errors', () => {
  const poolFor = (specs) => {
    let wide = 0;
    return specs.map((spec, i) => {
      if (i === 0) return { nome: 'GK', pos: 'G' };
      const [line, role] = spec;
      if (line === 'DEF' || role === 'WB') {
        if (role === 'CB') return { nome: `CB${i}`, pos: 'CD-R' };
        if (role === 'WB') return { nome: `WB${i}`, pos: wide++ % 2 ? 'LM' : 'RM' };
        return { nome: `FB${i}`, pos: wide++ % 2 ? 'LB' : 'RB' };
      }
      if (role === 'DM') return { nome: `DM${i}`, pos: 'DM' };
      if (role === 'CM') return { nome: `CM${i}`, pos: 'CM-R' };
      if (role === 'AM') return { nome: `AM${i}`, pos: 'AM' };
      if (role === 'W') return { nome: `W${i}`, pos: wide++ % 2 ? 'LW' : 'RW' };
      return { nome: `ST${i}`, pos: 'F' };
    });
  };
  for (const [formation, specs] of Object.entries(SLOT_SPECS)) {
    const pool = poolFor(specs);
    const ordered = assignToSlots(pool, formation);
    assert.equal(ordered.length, 11, `${formation}: 11 players`);
    assert.equal(new Set(ordered.map(p => p.nome)).size, 11, `${formation}: unique players`);
    assert.equal(validateAssignment(ordered, formation), true, `${formation}: families respected`);
  }
});

console.log(`\n${passed} passed, ${failures.length} failed\n`);
if (failures.length) {
  for (const f of failures) console.error(f.err.stack);
  process.exit(1);
}
