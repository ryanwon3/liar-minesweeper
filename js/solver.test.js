import assert from 'node:assert/strict';

import * as solver from './solver.js';
let passed = 0;
function test(name, run) { run(); passed++; console.log(`PASS ${name}`); }
const clue = (value, verified = false, originalClue = value) => ({clue: value, verified, originalClue});
test('an uncertain clue does not license an honest-Minesweeper guess', () => {
  const result = solver.analyzeObservation({rows: 1, columns: 4, mineCount: 1,
    cells: [clue(1), null, null, null], knownMines: []});
  assert.deepEqual(result.safe, []);
  assert.deepEqual(result.mines, []);
  assert.equal(result.verify, 0);
});
test('an explicit false zero is considered as a liar', () => {
  const result = solver.analyzeObservation({rows: 1, columns: 3, mineCount: 1,
    cells: [null, clue(0), null], knownMines: []});
  assert.deepEqual(result.safe, []);
  assert.deepEqual(result.mines, []);
});
test('a verified zero permits its safe neighbor to be revealed', () => {
  const result = solver.analyzeObservation({rows: 1, columns: 4, mineCount: 1,
    cells: [clue(0, true), null, null, null], knownMines: []});
  assert.deepEqual(result.safe, [1]);
});
test('finding the liar makes other clues honest without losing the original lie', () => {
  const result = solver.analyzeObservation({rows: 1, columns: 4, mineCount: 1,
    cells: [clue(1, true, 0), null, clue(1), null], knownMines: []});
  assert.deepEqual(result.safe, [3]);
  assert.deepEqual(result.mines, [1]);
});
test('exhausted verifications cannot be offered as a solution', () => {
  const result = solver.analyzeObservation({rows: 1, columns: 4, mineCount: 1,
    cells: [clue(1), null, null, null], knownMines: []}, 0);
  assert.equal(result.verify, null);
});

// Independent exhaustive oracle: enumerate complete legal 2x3 worlds, then
// require deductions to hold in every world matching the public observations.
// This catches false certainty from assuming a lying clue is honest.
test('deductions are sound against exhaustive small-board possible worlds', () => {
  const neighbors = index => Array.from({length: 6}, (_, other) => other).filter(other =>
    other !== index && Math.abs(Math.floor(other / 3) - Math.floor(index / 3)) <= 1 &&
    Math.abs(other % 3 - index % 3) <= 1);
  const worlds = [];
  for (let mask = 0; mask < 64; mask++) {
    const mines = Array.from({length: 6}, (_, index) => Boolean(mask & (1 << index)));
    if (mines.filter(Boolean).length !== 2) continue;
    const values = mines.map((_, index) => neighbors(index).filter(other => mines[other]).length);
    for (let liar = 0; liar < 6; liar++) if (!mines[liar]) {
      for (const offset of [-1, 1]) {
        if (values[liar] + offset < 0 || values[liar] + offset > 8) continue;
        worlds.push({mines, values, displayed: values.map((v, i) => v + (i === liar ? offset : 0))});
      }
    }
  }
  let checked = 0;
  for (const world of worlds) for (const mask of [1, 5, 21, 42, 63]) {
    const cells = world.mines.map((mine, index) => mine || !(mask & (1 << index)) ? null :
      clue(world.displayed[index]));
    for (const verifyOne of [false, true]) {
      const observations = cells.map(cell => cell && {...cell});
      const first = observations.findIndex(Boolean);
      if (verifyOne && first !== -1) observations[first] = clue(world.values[first], true, world.displayed[first]);
      const possible = worlds.filter(candidate => observations.every((cell, index) => !cell ||
        (!candidate.mines[index] && (cell.verified
          ? candidate.values[index] === cell.clue && candidate.displayed[index] === cell.originalClue
          : candidate.displayed[index] === cell.clue))));
      assert.ok(possible.length > 0);
      const result = solver.analyzeObservation({rows: 2, columns: 3, mineCount: 2,
        cells: observations, knownMines: []});
      for (const index of result.safe) assert.ok(possible.every(candidate => !candidate.mines[index]), `unsafe deduction ${index}`);
      for (const index of result.mines) assert.ok(possible.every(candidate => candidate.mines[index]), `false mine ${index}`);
      checked++;
    }
  }
  assert.ok(checked > 500);
  console.log(`  Exhaustive oracle checked ${checked} observations.`);
});
console.log(`\n${passed} solver tests passed.`);
