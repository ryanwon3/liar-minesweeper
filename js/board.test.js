import assert from 'node:assert/strict';
import {
  createEmptyBoard,
  placeMinesAvoidingCell,
  computeTrueValues,
  chooseLiar,
  computeDisplayedValue,
  revealCell,
  createBoardFromFixedLayout,
} from './board.js';

let passedTests = 0;

function test(name, check) {
  check();
  passedTests += 1;
  console.log(`PASS ${name}`);
}

function generateBoard(row, column) {
  const board = createEmptyBoard(9, 9);
  placeMinesAvoidingCell(board, 10, row, column);
  computeTrueValues(board);
  chooseLiar(board);
  return board;
}

function coordinates(cells) {
  return cells.map(({ row, column }) => `${row},${column}`).sort();
}

// Controlled draws test eligibility and equal-sized sampling intervals without
// making correctness depend on a lucky random sample or a statistical threshold.
function withRandom(random, check) {
  const originalRandom = Math.random;
  Math.random = random;
  try {
    check();
  } finally {
    Math.random = originalRandom;
  }
}

test('empty default board has 81 independent, covered cells and no mines', () => {
  const board = createEmptyBoard();
  assert.equal(board.length, 9);
  assert.ok(board.every((row) => row.length === 9));
  assert.equal(new Set(board.flat()).size, 81);
  for (const cell of board.flat()) {
    assert.deepEqual(cell, {
      row: cell.row, column: cell.column,
      trueValue: 0, displayedValue: 0, originalDisplayedValue: 0,
      isLiar: false, isMine: false, isRevealed: false,
      isFlagged: false, isVerified: false,
    });
    assert.equal(board[cell.row][cell.column], cell);
  }
});

for (const [name, row, column] of [
  ['corner', 0, 0], ['edge', 0, 4], ['interior', 4, 4],
]) {
  test(`exactly 10 mines and safe first reveal at ${name} (300 boards)`, () => {
    for (let iteration = 0; iteration < 300; iteration += 1) {
      const board = generateBoard(row, column);
      assert.equal(board.flat().filter((cell) => cell.isMine).length, 10);
      assert.equal(board[row][column].isMine, false);
      const revealed = revealCell(board, row, column);
      assert.ok(revealed.length > 0);
      assert.ok(revealed.every((cell) => !cell.isMine));
    }
  });
}

test('first-click neighbors remain eligible for mines', () => {
  withRandom(() => 0, () => {
    const board = createEmptyBoard();
    placeMinesAvoidingCell(board, 10, 0, 0);
    assert.equal(board[0][0].isMine, false);
    assert.equal(board[0][1].isMine, true);
    assert.equal(board[1][0].isMine, true);
    assert.equal(board[1][1].isMine, true);
  });
});

test('fixed layout counts corners, edges, and diagonals correctly', () => {
  const board = createBoardFromFixedLayout([[0, 0], [1, 2], [2, 3]], [2, 0], 1, 3, 4);
  const expected = [[null, 2, 1, 1], [1, 2, null, 2], [0, 1, 2, null]];
  assert.deepEqual(board.map((row) => row.map((cell) =>
    cell.isMine ? null : cell.trueValue)), expected);
  assert.deepEqual(Object.keys(board[0][0]), Object.keys(createEmptyBoard()[0][0]));
  for (const cell of board.flat().filter((cell) => !cell.isMine && !cell.isLiar)) {
    assert.equal(cell.displayedValue, cell.trueValue);
  }
});

test('exactly one safe liar differs by one (500 generated boards)', () => {
  for (let iteration = 0; iteration < 500; iteration += 1) {
    const board = generateBoard(4, 4);
    const safeCells = board.flat().filter((cell) => !cell.isMine);
    const liars = board.flat().filter((cell) => cell.isLiar);
    assert.equal(liars.length, 1);
    assert.equal(liars[0].isMine, false);
    assert.equal(safeCells.filter((cell) => cell.displayedValue !== cell.trueValue).length, 1);
    for (const cell of safeCells) {
      assert.equal(Math.abs(cell.displayedValue - cell.trueValue), cell.isLiar ? 1 : 0);
      assert.ok(cell.displayedValue >= 0 && cell.displayedValue <= 8);
      assert.equal(cell.originalDisplayedValue, cell.displayedValue);
    }
  }
});

test('every safe cell has an equal selection interval, including zero and first-click cells', () => {
  const firstClick = [4, 4];
  const mineCoordinates = [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4],
    [0, 5], [0, 6], [0, 7], [0, 8], [1, 0]];
  let selectedFirstClick = false;
  let selectedZero = false;
  for (let index = 0; index < 71; index += 1) {
    const board = createEmptyBoard();
    for (const [row, column] of mineCoordinates) board[row][column].isMine = true;
    computeTrueValues(board);
    const safeCells = board.flat().filter((cell) => !cell.isMine);
    withRandom(() => (index + 0.5) / safeCells.length, () => {
      const liar = chooseLiar(board);
      assert.equal(liar, safeCells[index]);
      selectedFirstClick ||= liar.row === firstClick[0] && liar.column === firstClick[1];
      selectedZero ||= liar.trueValue === 0;
    });
  }
  assert.equal(selectedFirstClick, true);
  assert.equal(selectedZero, true);
});

test('true-zero liar shows 1 and true-eight liar shows 7', () => {
  assert.equal(computeDisplayedValue(0, true), 1);
  assert.equal(computeDisplayedValue(8, true), 7);
  const zeroBoard = createBoardFromFixedLayout([], [0, 0], 1, 2, 2);
  assert.equal(zeroBoard[0][0].trueValue, 0);
  assert.equal(zeroBoard[0][0].displayedValue, 1);
  const surroundingMines = [[0, 0], [0, 1], [0, 2], [1, 0],
    [1, 2], [2, 0], [2, 1], [2, 2]];
  const eightBoard = createEmptyBoard(3, 3);
  for (const [row, column] of surroundingMines) eightBoard[row][column].isMine = true;
  computeTrueValues(eightBoard);
  chooseLiar(eightBoard);
  assert.equal(eightBoard[1][1].trueValue, 8);
  assert.equal(eightBoard[1][1].displayedValue, 7);
});

test('true values 1 through 7 use equal probability branches for both offsets', () => {
  for (let trueValue = 1; trueValue <= 7; trueValue += 1) {
    withRandom(() => 0.499999, () => {
      assert.equal(computeDisplayedValue(trueValue, true), trueValue - 1);
    });
    withRandom(() => 0.5, () => {
      assert.equal(computeDisplayedValue(trueValue, true), trueValue + 1);
    });
  }
  for (let trueValue = 0; trueValue <= 8; trueValue += 1) {
    assert.equal(computeDisplayedValue(trueValue, false), trueValue);
  }
});

test('true-zero liar showing 1 expands its region and boundary, skipping flags and mines', () => {
  const mines = [[0, 3], [1, 3], [2, 3], [3, 3], [4, 3]];
  const board = createBoardFromFixedLayout(mines, [0, 0], 1, 5, 6);
  board[1][0].isFlagged = true;
  board[3][2].isFlagged = true;
  const revealed = revealCell(board, 0, 0);
  const expected = ['0,0', '0,1', '0,2', '1,1', '1,2', '2,0', '2,1', '2,2',
    '3,0', '3,1', '4,0', '4,1', '4,2'];
  assert.deepEqual(coordinates(revealed), expected.sort());
  assert.deepEqual(coordinates(board.flat().filter((cell) => cell.isRevealed)), expected);
  assert.equal(new Set(revealed).size, revealed.length);
  assert.ok(board.flat().filter((cell) => cell.isMine || cell.isFlagged)
    .every((cell) => !cell.isRevealed));
  assert.deepEqual(revealCell(board, 0, 0), []);
});

test('a flagged zero blocks expansion through itself', () => {
  const board = createBoardFromFixedLayout([[0, 4]], [0, 0], 1, 1, 5);
  board[0][1].isFlagged = true;
  assert.deepEqual(coordinates(revealCell(board, 0, 0)), ['0,0']);
  assert.equal(board[0][2].isRevealed, false);
});

test('true-one liar showing 0 does not expand', () => {
  const board = createBoardFromFixedLayout([[0, 0]], [1, 1], 0, 4, 4);
  assert.equal(board[1][1].trueValue, 1);
  assert.equal(board[1][1].displayedValue, 0);
  assert.deepEqual(coordinates(revealCell(board, 1, 1)), ['1,1']);
  assert.equal(board.flat().filter((cell) => cell.isRevealed).length, 1);
});

test('flags prevent direct reveals and a mine hit is reported only once', () => {
  const board = createBoardFromFixedLayout([[0, 0]], [2, 2], 1, 3, 3);
  board[0][0].isFlagged = true;
  board[2][2].isFlagged = true;
  assert.deepEqual(revealCell(board, 0, 0), []);
  assert.deepEqual(revealCell(board, 2, 2), []);
  assert.equal(board[0][0].isRevealed, false);
  assert.equal(board[2][2].isRevealed, false);
  board[0][0].isFlagged = false;
  const hit = revealCell(board, 0, 0);
  assert.deepEqual(hit, [board[0][0]]);
  assert.equal(hit[0].isMine, true);
  assert.equal(hit[0].isRevealed, true);
  assert.deepEqual(revealCell(board, 0, 0), []);
  computeTrueValues(board);
  assert.equal(board[1][1].trueValue, 1);
});

test('liar identity and original clue survive reveal and repeated selection after verification', () => {
  const board = createBoardFromFixedLayout([[0, 0]], [1, 1], 0, 3, 3);
  const liar = board[1][1];
  revealCell(board, 1, 1);
  assert.equal(liar.originalDisplayedValue, 0);
  // Simulate a later game-layer verification without implementing it here.
  liar.displayedValue = liar.trueValue;
  liar.isVerified = true;
  assert.equal(chooseLiar(board), liar);
  assert.equal(liar.originalDisplayedValue, 0);
  assert.equal(liar.displayedValue, 1);
  assert.equal(board.flat().filter((cell) => cell.isLiar).length, 1);
});

test('invalid fixed layouts and impossible mine counts fail clearly', () => {
  assert.throws(() => createBoardFromFixedLayout([[0, 0], [0, 0]], [1, 1], 0), /distinct/);
  assert.throws(() => createBoardFromFixedLayout([[0, 0]], [0, 0], 1), /liar/);
  assert.throws(() => createBoardFromFixedLayout([], [0, 0], -1), /liar/);
  assert.throws(() => createBoardFromFixedLayout([], [0, 0], 2), /liar/);
  assert.throws(() => createBoardFromFixedLayout([[9, 0]], [0, 0], 1), /coordinates/);
  assert.throws(() => placeMinesAvoidingCell(createEmptyBoard(1, 1), 1, 0, 0), /Mine count/);
});

console.log(`\n${passedTests} tests passed.`);
