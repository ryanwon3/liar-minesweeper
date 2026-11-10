import assert from 'node:assert/strict';
import { createBoardFromFixedLayout } from './board.js';
import { gameState, newGame, handleReveal, handleFlag, handleVerify, getStatusSummary } from './game.js';

let passedTests = 0;
const mineCoordinates = [[0, 0], [0, 2], [0, 4], [0, 6], [0, 8],
  [2, 0], [2, 2], [2, 4], [2, 6], [2, 8]];

function test(name, check) {
  check();
  passedTests += 1;
  console.log(`PASS ${name}`);
}

function loadControlledBoard() {
  gameState.debugMode = false;
  gameState.fixedLayout = null;
  gameState.debugError = '';
  newGame();
  gameState.board = createBoardFromFixedLayout(mineCoordinates, [4, 4], 1);
  gameState.isBoardGenerated = true;
}

function loseGame() {
  for (const [row, column] of mineCoordinates.slice(0, 5)) handleReveal(row, column);
}

function leaveLastSafeCellCovered() {
  for (const cell of gameState.board.flat()) {
    if (!cell.isMine && !(cell.row === 1 && cell.column === 1)) cell.isRevealed = true;
  }
}

test('first four distinct mine hits each cost one life and play continues', () => {
  loadControlledBoard();
  for (let index = 0; index < 4; index += 1) {
    const [row, column] = mineCoordinates[index];
    handleReveal(row, column);
    assert.equal(gameState.lives, 4 - index);
    assert.equal(gameState.status, 'playing');
    assert.equal(gameState.result, null);
    assert.equal(gameState.board[row][column].isRevealed, true);
  }
});

test('the fifth distinct hit loses and exposes all mines and the unopened liar', () => {
  loadControlledBoard();
  handleFlag(2, 8);
  assert.equal(gameState.board[4][4].isRevealed, false);
  loseGame();
  assert.equal(gameState.lives, 0);
  assert.equal(gameState.status, 'lost');
  assert.ok(gameState.board.flat().filter(cell => cell.isMine).every(cell => cell.isRevealed));
  assert.equal(gameState.board[4][4].isRevealed, true);
  assert.equal(gameState.board[8][8].isRevealed, false);
  assert.deepEqual(gameState.result, {
    liarRow: 4, liarColumn: 4, trueValue: 0, originalDisplayedValue: 1,
  });
  assert.equal(gameState.board[2][8].isFlagged, true);
  assert.equal(gameState.flagCount, 1);
});

test('clicking an already hit mine costs nothing and clues never change', () => {
  loadControlledBoard();
  const originalClues = gameState.board.flat().map(cell =>
    [cell.isMine, cell.trueValue, cell.displayedValue, cell.originalDisplayedValue, cell.isLiar]);
  handleReveal(0, 0);
  handleReveal(0, 0);
  handleReveal(0, 0);
  assert.equal(gameState.lives, 4);
  assert.equal(gameState.status, 'playing');
  assert.deepEqual(gameState.board.flat().map(cell =>
    [cell.isMine, cell.trueValue, cell.displayedValue, cell.originalDisplayedValue, cell.isLiar]), originalClues);
});

test('revealing the last safe cell wins with every mine unflagged', () => {
  loadControlledBoard();
  leaveLastSafeCellCovered();
  handleReveal(1, 1);
  assert.equal(gameState.status, 'won');
  assert.equal(gameState.lives, 5);
  assert.equal(gameState.flagCount, 0);
  assert.equal(gameState.verificationsLeft, 3);
  assert.equal(gameState.board[4][4].isVerified, false);
  assert.ok(gameState.board.flat().every(cell => cell.isRevealed));
});

test('a flood fill that reveals the last safe cells wins', () => {
  loadControlledBoard();
  for (const cell of gameState.board.flat()) {
    if (!cell.isMine && cell.row <= 3) cell.isRevealed = true;
  }
  handleReveal(8, 8);
  assert.equal(gameState.status, 'won');
  assert.ok(gameState.board.flat().filter(cell => !cell.isMine).every(cell => cell.isRevealed));
});

test('flagging all mines does not win or reveal safe cells', () => {
  loadControlledBoard();
  for (const [row, column] of mineCoordinates) handleFlag(row, column);
  assert.equal(gameState.flagCount, 10);
  assert.equal(gameState.status, 'playing');
  assert.equal(gameState.result, null);
  assert.ok(gameState.board.flat().every(cell => !cell.isRevealed));
});

test('victory ignores mine flags and remaining verification count', () => {
  loadControlledBoard();
  handleFlag(0, 0);
  gameState.verificationsLeft = 0;
  leaveLastSafeCellCovered();
  handleReveal(1, 1);
  assert.equal(gameState.status, 'won');
  assert.equal(gameState.flagCount, 1);
  assert.equal(gameState.board[0][0].isRevealed, true);
});

for (const result of ['won', 'lost']) {
  test(`reveal, flag, and verify do nothing after ${result}`, () => {
    loadControlledBoard();
    if (result === 'won') {
      leaveLastSafeCellCovered();
      handleReveal(1, 1);
    } else {
      loseGame();
    }
    const finishedState = JSON.stringify(gameState);
    for (const cell of gameState.board.flat()) {
      handleReveal(cell.row, cell.column);
      handleFlag(cell.row, cell.column);
      handleVerify(cell.row, cell.column);
    }
    handleVerify();
    assert.equal(JSON.stringify(gameState), finishedState);
  });

  test(`New Game after ${result} restores counters and clears flags and result`, () => {
    loadControlledBoard();
    handleFlag(0, 0);
    if (result === 'won') {
      leaveLastSafeCellCovered();
      handleReveal(1, 1);
    } else {
      handleFlag(0, 0);
      handleFlag(8, 8);
      loseGame();
    }
    const previousBoard = gameState.board;
    gameState.verificationsLeft = 0;
    newGame();
    assert.notEqual(gameState.board, previousBoard);
    assert.equal(gameState.lives, 5);
    assert.equal(gameState.verificationsLeft, 3);
    assert.equal(gameState.flagCount, 0);
    assert.equal(gameState.mineCount, 10);
    assert.equal(gameState.mode, 'reveal');
    assert.equal(gameState.status, 'playing');
    assert.equal(gameState.result, null);
    assert.equal(gameState.isBoardGenerated, false);
    assert.equal(gameState.board.flat().length, 81);
    assert.ok(gameState.board.flat().every(cell =>
      !cell.isMine && !cell.isLiar && !cell.isFlagged && !cell.isRevealed && !cell.isVerified));
    handleReveal(0, 0);
    assert.equal(gameState.isBoardGenerated, true);
    assert.equal(gameState.board[0][0].isMine, false);
    assert.equal(gameState.board.flat().filter(cell => cell.isMine).length, 10);
  });
}

test('end result retains the original lie even if its displayed clue was corrected', () => {
  loadControlledBoard();
  const liar = gameState.board[4][4];
  liar.isRevealed = true;
  handleVerify();
  handleReveal(4, 4);
  loseGame();
  assert.equal(gameState.result.trueValue, 0);
  assert.equal(gameState.result.originalDisplayedValue, 1);
  assert.equal(liar.displayedValue, 0);
  assert.equal(liar.originalDisplayedValue, 1);
});

test('valid verification uses exactly one charge, marks the cell, and returns to reveal', () => {
  loadControlledBoard();
  handleReveal(1, 1);
  handleVerify();
  assert.equal(gameState.mode, 'verify');
  handleReveal(1, 1);
  assert.equal(gameState.verificationsLeft, 2);
  assert.equal(gameState.board[1][1].isVerified, true);
  assert.equal(gameState.board[1][1].displayedValue, gameState.board[1][1].trueValue);
  assert.equal(gameState.mode, 'reveal');
  assert.equal(gameState.lives, 5);
  assert.equal(gameState.status, 'playing');
  handleVerify(1, 3);
  assert.equal(gameState.verificationsLeft, 2);
  assert.equal(gameState.board[1][3].isVerified, false);
});

test('cancelling verify mode uses nothing and leaves the board unchanged', () => {
  loadControlledBoard();
  const originalBoard = JSON.stringify(gameState.board);
  handleVerify();
  assert.equal(gameState.mode, 'verify');
  handleVerify();
  assert.equal(gameState.mode, 'reveal');
  assert.equal(gameState.verificationsLeft, 3);
  assert.equal(JSON.stringify(gameState.board), originalBoard);
});

for (const target of ['covered safe cell', 'covered mine', 'hit mine', 'already verified cell']) {
  test(`verify-mode click on ${target} uses nothing and stays in verify mode`, () => {
    loadControlledBoard();
    let row = 1;
    let column = 1;
    if (target.includes('mine')) {
      row = 0;
      column = 0;
      if (target === 'hit mine') handleReveal(row, column);
    } else if (target === 'already verified cell') {
      handleReveal(row, column);
      handleVerify();
      handleReveal(row, column);
    }
    handleVerify();
    const originalState = JSON.stringify(gameState);
    handleReveal(row, column);
    assert.equal(JSON.stringify(gameState), originalState);
    assert.equal(gameState.mode, 'verify');
  });
}

test('the third verification leaves zero charges and no further verification is possible', () => {
  loadControlledBoard();
  for (const column of [1, 3, 5]) {
    handleReveal(1, column);
    handleVerify();
    handleReveal(1, column);
  }
  assert.equal(gameState.verificationsLeft, 0);
  assert.equal(gameState.mode, 'reveal');
  handleReveal(1, 7);
  const originalState = JSON.stringify(gameState);
  handleVerify();
  handleVerify(1, 7);
  assert.equal(JSON.stringify(gameState), originalState);
  assert.equal(gameState.board[1][7].isVerified, false);
});

test('verifying the liar corrects its clue without moving it or erasing the original lie', () => {
  loadControlledBoard();
  const liar = gameState.board[4][4];
  liar.isRevealed = true;
  handleVerify();
  handleReveal(4, 4);
  assert.equal(liar.displayedValue, liar.trueValue);
  assert.equal(liar.originalDisplayedValue, 1);
  assert.equal(liar.isLiar, true);
  assert.equal(liar.isVerified, true);
  assert.equal(gameState.board[4][4], liar);
  assert.deepEqual(gameState.board.flat().filter(cell => cell.isLiar), [liar]);
});

test('verifying a true-zero cell never opens any neighbors or changes game outcomes', () => {
  loadControlledBoard();
  const zeroCell = gameState.board[8][8];
  zeroCell.isRevealed = true;
  assert.equal(zeroCell.trueValue, 0);
  const revealedBefore = gameState.board.flat().map(cell => cell.isRevealed);
  handleVerify();
  handleReveal(8, 8);
  assert.deepEqual(gameState.board.flat().map(cell => cell.isRevealed), revealedBefore);
  assert.equal(zeroCell.isVerified, true);
  assert.equal(zeroCell.displayedValue, 0);
  assert.equal(gameState.status, 'playing');
});

test('verification before the first reveal cannot generate or reveal a board', () => {
  loadControlledBoard();
  newGame();
  handleVerify();
  handleReveal(4, 4);
  assert.equal(gameState.isBoardGenerated, false);
  assert.equal(gameState.verificationsLeft, 3);
  assert.equal(gameState.mode, 'verify');
  assert.ok(gameState.board.flat().every(cell => !cell.isMine && !cell.isRevealed));
});

test('New Game restores three verifications, reveal mode, and clears verified markers', () => {
  loadControlledBoard();
  handleReveal(1, 1);
  handleVerify();
  handleReveal(1, 1);
  assert.equal(gameState.board[1][1].isVerified, true);
  handleVerify();
  assert.equal(gameState.mode, 'verify');
  newGame();
  assert.equal(gameState.verificationsLeft, 3);
  assert.equal(gameState.mode, 'reveal');
  assert.ok(gameState.board.flat().every(cell => !cell.isVerified));
  assert.equal(gameState.isBoardGenerated, false);
});

for (const outcome of ['won', 'lost']) {
  test(`verified liar keeps both end-screen values after ${outcome}, with verification disabled`, () => {
    loadControlledBoard();
    const liar = gameState.board[4][4];
    liar.isRevealed = true;
    handleVerify();
    handleReveal(4, 4);
    if (outcome === 'won') {
      leaveLastSafeCellCovered();
      handleReveal(1, 1);
    } else {
      loseGame();
    }
    assert.equal(gameState.status, outcome);
    assert.equal(gameState.result.trueValue, 0);
    assert.equal(gameState.result.originalDisplayedValue, 1);
    assert.equal(liar.isVerified, true);
    assert.equal(gameState.mode, 'reveal');
    const originalState = JSON.stringify(gameState);
    handleVerify();
    handleVerify(1, 1);
    assert.equal(JSON.stringify(gameState), originalState);
  });
}

test('status summary matches state after flag, unflag, reveal, mine hit, verify, and New Game', () => {
  loadControlledBoard();
  const checkSummary = (expected) => {
    const stateBeforeSummary = JSON.stringify(gameState);
    const summary = getStatusSummary(gameState);
    assert.deepEqual(summary, {
      lives: gameState.lives,
      verificationsLeft: gameState.verificationsLeft,
      mineCount: gameState.mineCount,
      flagCount: gameState.flagCount,
      mode: gameState.mode,
      status: gameState.status,
      message: gameState.message,
      debugMode: gameState.debugMode,
    });
    assert.deepEqual(
      [summary.lives, summary.verificationsLeft, summary.mineCount,
        summary.flagCount, summary.mode, summary.status], expected,
    );
    assert.equal(summary.flagCount, gameState.board.flat().filter(cell => cell.isFlagged).length);
    assert.equal(JSON.stringify(gameState), stateBeforeSummary);
  };
  checkSummary([5, 3, 10, 0, 'reveal', 'playing']);
  handleFlag(0, 0);
  checkSummary([5, 3, 10, 1, 'reveal', 'playing']);
  handleFlag(0, 0);
  checkSummary([5, 3, 10, 0, 'reveal', 'playing']);
  handleReveal(1, 1);
  checkSummary([5, 3, 10, 0, 'reveal', 'playing']);
  handleReveal(0, 0);
  checkSummary([4, 3, 10, 0, 'reveal', 'playing']);
  handleVerify();
  checkSummary([4, 3, 10, 0, 'verify', 'playing']);
  handleReveal(0, 0);
  checkSummary([4, 3, 10, 0, 'verify', 'playing']);
  handleReveal(1, 1);
  checkSummary([4, 2, 10, 0, 'reveal', 'playing']);
  handleVerify();
  checkSummary([4, 2, 10, 0, 'verify', 'playing']);
  handleVerify();
  checkSummary([4, 2, 10, 0, 'reveal', 'playing']);
  for (const [row, column] of mineCoordinates.slice(1, 5)) handleReveal(row, column);
  checkSummary([0, 2, 10, 0, 'reveal', 'lost']);
  newGame();
  checkSummary([5, 3, 10, 0, 'reveal', 'playing']);
  loadControlledBoard();
  leaveLastSafeCellCovered();
  handleReveal(1, 1);
  checkSummary([5, 3, 10, 0, 'reveal', 'won']);
  newGame();
  checkSummary([5, 3, 10, 0, 'reveal', 'playing']);
});

console.log(`\n${passedTests} tests passed.`);
