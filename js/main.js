/*
 * Debug URL format (zero-based coordinates, mines separated by semicolons):
 * http://localhost:8000/?debug=1
 * http://localhost:8000/?debug=1&mines=0,0;0,1;0,2;0,3;0,4;0,5;0,6;0,7;0,8;1,0&liar=4,4&shown=1
 * Hover any cell for trueValue, displayedValue, isMine, and isLiar.
 * Fixed layouts require mines, liar, and shown together; mines= allows no mines.
 * Coordinates must fit the selected difficulty; shown must be 0..8 and off by 1.
 * Add difficulty=medium for 12x12 fixtures (coordinates 0..11).
 * Custom fixtures may have fewer than 10 mines; the counter shows their actual count.
 * Fixtures load on the first safe reveal. Clicking a fixture mine first asks for
 * another cell, preserving both the exact fixture and the safe-first-click rule.
 * New Game keeps the fixture; selecting another difficulty clears the fixture.
 */
import {
  gameState,
  newGame,
  handleReveal,
  handleFlag,
  handleVerify,
  DIFFICULTIES,
} from './game.js';
import {attachEventHandlers, renderGame, renderElapsedTime} from './ui.js';

const parameters = new URLSearchParams(window.location.search);
const initialDifficulty = parameters.get('difficulty');
if (Object.hasOwn(DIFFICULTIES, initialDifficulty)) gameState.difficulty = initialDifficulty;
const dimensions = DIFFICULTIES[gameState.difficulty];
gameState.debugMode = parameters.get('debug') === '1';
if (gameState.debugMode && ['mines', 'liar', 'shown'].some((key) => parameters.has(key))) {
  try {
    if (!['mines', 'liar', 'shown'].every((key) => parameters.has(key))) {
      throw new Error('provide mines, liar, and shown together.');
    }
    const parseCoordinate = (coordinate) => {
      if (!/^\d+,\d+$/.test(coordinate)) {
        throw new Error('coordinates must be row,column pairs.');
      }
      const [row, column] = coordinate.split(',').map(Number);
      if (row >= dimensions.rows || column >= dimensions.columns) throw new Error('coordinates must fit the selected difficulty.');
      return [row, column];
    };
    const mines = parameters.get('mines');
    const shown = parameters.get('shown');
    if (!/^[0-8]$/.test(shown)) throw new Error('shown must be an integer from 0 to 8.');
    gameState.fixedLayout = {
      mineCoordinates: mines === '' ? [] : mines.split(';').map(parseCoordinate),
      liarCoordinate: parseCoordinate(parameters.get('liar')),
      liarDisplayedValue: Number(shown),
    };
  } catch (error) {
    gameState.debugError = `Invalid debug URL: ${error.message}`;
  }
}

// Rendering after each action keeps DOM code out of the game-state module.
function runAction(action, ...coordinates) {
  action(...coordinates);
  renderGame(gameState);
}

runAction(newGame);
let pendingWorker = null;
function cancelGeneration() {
  pendingWorker?.terminate();
  pendingWorker = null;
  gameState.isGenerating = false;
}

function revealFromUI(row, column) {
  if (gameState.isGenerating) return;
  const cell = gameState.board[row]?.[column];
  if (gameState.isBoardGenerated || gameState.fixedLayout || gameState.debugError ||
      gameState.mode !== 'reveal' || !cell || cell.isFlagged || gameState.status !== 'playing') {
    runAction(handleReveal, row, column);
    return;
  }
  gameState.isGenerating = true;
  gameState.message = 'Finding a solvable board…';
  renderGame(gameState);
  try {
    const worker = new Worker(new URL('./generator.worker.js', import.meta.url), {type: 'module'});
    pendingWorker = worker;
    const fail = message => {
      if (pendingWorker !== worker) return;
      cancelGeneration();
      gameState.message = message;
      renderGame(gameState);
    };
    worker.onmessage = ({data}) => {
      if (pendingWorker !== worker) return; // A reset or difficulty change cancelled this job.
      if (data.error) { fail(data.error); return; }
      cancelGeneration();
      runAction(handleReveal, row, column, performance.now(), data.board);
    };
    worker.onerror = event => {
      event.preventDefault();
      fail('Board generation failed. Click a cell to try again.');
    };
    worker.postMessage({rows: gameState.rows, columns: gameState.columns,
      mineCount: gameState.mineCount, row, column});
  } catch {
    cancelGeneration();
    gameState.message = 'Board generation is unavailable. Serve the game over HTTP in a browser with module workers.';
    renderGame(gameState);
  }
}

attachEventHandlers({
  onReveal: revealFromUI,
  onFlag: (row, column) => runAction(handleFlag, row, column),
  onVerify: () => runAction(handleVerify),
  onNewGame: () => { cancelGeneration(); runAction(newGame); },
  onDifficultyChange: difficulty => {
    cancelGeneration();
    gameState.fixedLayout = null;
    gameState.debugError = '';
    runAction(newGame, difficulty);
  },
});
setInterval(() => renderElapsedTime(gameState), 250);
