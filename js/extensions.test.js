import assert from 'node:assert/strict';
import * as game from './game.js';
let passed = 0;
function test(name, run) { run(); passed++; console.log(`PASS ${name}`); }
const mines = [[0,0],[0,2],[0,4],[0,6],[0,8],[2,0],[2,2],[2,4],[2,6],[2,8]];
function fixture() {
  game.gameState.debugMode = true;
  game.gameState.debugError = '';
  game.gameState.fixedLayout = {mineCoordinates: mines, liarCoordinate: [4,4], liarDisplayedValue: 1};
  game.newGame('easy');
}
test('selecting Medium starts a fresh 12x12 game with 24 mines', () => {
  game.newGame('medium');
  assert.equal(game.gameState.rows, 12);
  assert.equal(game.gameState.columns, 12);
  assert.equal(game.gameState.board.flat().length, 144);
  assert.equal(game.gameState.mineCount, 24);
  assert.equal(game.gameState.isBoardGenerated, false);
});
test('New Game retains difficulty and restores lives and verification budget', () => {
  game.handleFlag(11,11);
  game.gameState.lives = 1;
  game.gameState.verificationsLeft = 0;
  game.newGame();
  assert.equal(game.gameState.rows, 12);
  assert.equal(game.gameState.mineCount, 24);
  assert.equal(game.gameState.lives, 5);
  assert.equal(game.gameState.verificationsLeft, 3);
  assert.equal(game.gameState.flagCount, 0);
});
test('invalid difficulty cannot erase an in-progress game', () => {
  const before = JSON.stringify(game.gameState);
  assert.throws(() => game.newGame('impossible'), /difficulty/i);
  assert.equal(JSON.stringify(game.gameState), before);
});
test('Easy restores 81 cells and changing difficulty clears pending generation', () => {
  game.gameState.isGenerating = true;
  game.newGame('easy');
  assert.equal(game.gameState.board.flat().length, 81);
  assert.equal(game.gameState.mineCount, 10);
  assert.equal(game.gameState.isGenerating, false);
});
test('timer stays zero before play and starts only on an eligible first reveal', () => {
  fixture();
  assert.equal(game.getElapsedSeconds(game.gameState, 9000), 0);
  game.handleFlag(1,1);
  game.handleReveal(1,1,1000);
  assert.equal(game.getElapsedSeconds(game.gameState, 9000), 0);
  game.handleFlag(1,1);
  game.handleReveal(1,1,1000);
  assert.equal(game.getElapsedSeconds(game.gameState, 3999), 2);
  game.handleVerify();
  game.handleReveal(1,1,4000);
  assert.equal(game.getElapsedSeconds(game.gameState, 6000), 5);
});
test('timer freezes on defeat and resets on New Game', () => {
  fixture();
  game.handleReveal(1,1,1000);
  mines.slice(0,5).forEach(([r,c], i) => game.handleReveal(r,c,2000+i*1000));
  assert.equal(game.gameState.status, 'lost');
  assert.equal(game.getElapsedSeconds(game.gameState, 99000), 5);
  game.newGame();
  assert.equal(game.getElapsedSeconds(game.gameState, 999999), 0);
});
test('timer freezes on victory', () => {
  fixture();
  game.handleReveal(1,3,1000);
  for (const cell of game.gameState.board.flat()) if (!cell.isMine && !(cell.row===1&&cell.column===1)) cell.isRevealed=true;
  game.handleReveal(1,1,10000);
  assert.equal(game.gameState.status, 'won');
  assert.equal(game.getElapsedSeconds(game.gameState, 999999), 9);
});
test('elapsed formatting preserves minutes beyond one hour', () => {
  assert.equal(game.formatElapsedTime(0), '00:00');
  assert.equal(game.formatElapsedTime(65), '01:05');
  assert.equal(game.formatElapsedTime(3601), '60:01');
});
test('generated boards preserve flags and do not start the timer while generation is pending', () => {
  game.gameState.debugMode = false;
  game.gameState.fixedLayout = null;
  game.newGame('medium');
  game.handleFlag(11,11);
  game.gameState.isGenerating = true;
  game.handleReveal(0,0,1000);
  assert.equal(game.gameState.isBoardGenerated, false);
  assert.equal(game.getElapsedSeconds(game.gameState, 5000), 0);
  game.gameState.isGenerating = false;
  game.handleReveal(0,0,10000);
  assert.equal(game.gameState.board[11][11].isFlagged, true);
  assert.equal(game.gameState.mineCount, 24);
  assert.equal(game.gameState.isBoardGenerated, true);
  assert.equal(game.gameState.board[0][0].isMine, false);
});
console.log(`\n${passed} extension tests passed.`);
