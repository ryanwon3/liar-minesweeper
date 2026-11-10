import assert from 'node:assert/strict';
import {createBoardFromFixedLayout, revealCell} from './board.js';
import * as generator from './generator.js';
let passed = 0;
function test(name, run) { run(); passed++; console.log(`PASS ${name}`); }
test('ambiguous boards are rejected instead of solving with hidden mine knowledge', () => {
  const board = createBoardFromFixedLayout([[0, 0]], [0, 1], 0, 1, 3);
  const before = JSON.stringify(board);
  assert.equal(generator.certifyBoard(board, 1, 0, 1).solvable, false);
  assert.equal(JSON.stringify(board), before);
});
test('an already-cleared zero opening is certified without spending verification', () => {
  const board = createBoardFromFixedLayout([[0, 0]], [3, 3], 1, 4, 4);
  const result = generator.certifyBoard(board, 1, 3, 3);
  assert.equal(result.solvable, true);
  assert.equal(result.verificationsUsed, 0);
});

function replay(board, proof, row, column) {
  assert.equal(proof.solvable, true);
  assert.deepEqual(proof.steps[0], {type: 'reveal', row, column});
  let verifications = 0;
  for (const step of proof.steps) {
    const cell = board[step.row][step.column];
    if (step.type === 'reveal') {
      assert.equal(cell.isMine, false, 'the certificate may never spend a life');
      revealCell(board, step.row, step.column);
    } else {
      assert.equal(step.type, 'verify');
      assert.equal(cell.isRevealed, true);
      assert.equal(cell.isVerified, false);
      cell.isVerified = true;
      cell.displayedValue = cell.trueValue;
      verifications++;
    }
  }
  assert.ok(verifications <= 3);
  assert.equal(verifications, proof.verificationsUsed);
  assert.ok(board.flat().every(cell => cell.isMine || cell.isRevealed));
}
for (const [rows, columns, mines] of [[9, 9, 10], [12, 12, 24]]) {
  for (const [name, row, column] of [['corner', 0, 0], ['edge', 0, Math.floor(columns / 2)], ['center', Math.floor(rows / 2), Math.floor(columns / 2)]]) {
    test(`${rows}x${columns} ${name}: generated board has a replayable no-guessing certificate`, () => {
      const result = generator.generateSolvableBoard(rows, columns, mines, row, column);
      assert.equal(result.board.length, rows);
      assert.equal(result.board[0].length, columns);
      assert.equal(result.board.flat().filter(cell => cell.isMine).length, mines);
      assert.equal(result.board.flat().filter(cell => cell.isLiar).length, 1);
      assert.equal(result.board[row][column].isMine, false);
      assert.ok(result.board.flat().every(cell => !cell.isRevealed && !cell.isVerified));
      replay(result.board, result.proof, row, column);
    });
  }
  test(`${rows}x${columns}: bounded fallback is also certified for every first-click position`, () => {
    for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
      const result = generator.generateSolvableBoard(rows, columns, mines, row, column, {maxAttempts: 0});
      assert.equal(result.fallback, true);
      replay(result.board, result.proof, row, column);
    }
  });
}
test('invalid generation settings fail before attempting random generation', () => {
  assert.throws(() => generator.generateSolvableBoard(1, 1, 1, 0, 0), /mine|configuration/i);
  assert.throws(() => generator.generateSolvableBoard(9, 9, 10, 9, 0), /coordinate/i);
});
console.log(`\n${passed} generator tests passed.`);
