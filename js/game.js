import {
  createEmptyBoard,
  revealCell,
  createBoardFromFixedLayout,
} from './board.js';
import {generateSolvableBoard} from './generator.js';

export const DIFFICULTIES = Object.freeze({
  easy: Object.freeze({rows: 9, columns: 9, mineCount: 10}),
  medium: Object.freeze({rows: 12, columns: 12, mineCount: 24}),
});

// Keep state independent of the DOM so controlled boards can test the rules later.
export const gameState = {
  difficulty: 'easy',
  rows: 9,
  columns: 9,
  mineCount: 10,
  board: [],
  isBoardGenerated: false,
  isGenerating: false,
  startedAt: null,
  finishedAt: null,
  lives: 5,
  verificationsLeft: 3,
  flagCount: 0,
  mode: 'reveal',
  status: 'playing',
  message: 'Ready — choose a cell.',
  result: null,
  debugMode: false,
  fixedLayout: null,
  debugError: '',
};

/** Expose current status without caching counters that could drift from state. */
export function getStatusSummary(state) {
  return {
    lives: state.lives,
    verificationsLeft: state.verificationsLeft,
    mineCount: state.mineCount,
    flagCount: state.flagCount,
    mode: state.mode,
    status: state.status,
    message: state.message,
    debugMode: state.debugMode,
  };
}

/** Reset a session without generating mines before the player's first reveal. */
export function newGame(difficulty = gameState.difficulty) {
  if (!Object.hasOwn(DIFFICULTIES, difficulty)) throw new RangeError('Unknown difficulty.');
  const {rows, columns, mineCount} = DIFFICULTIES[difficulty];
  // Preserve debug configuration so New Game can reproduce the same fixture.
  Object.assign(gameState, {
    difficulty,
    rows,
    columns,
    mineCount: gameState.debugMode && gameState.fixedLayout
      ? gameState.fixedLayout.mineCoordinates.length : mineCount,
    board: createEmptyBoard(rows, columns),
    isBoardGenerated: false,
    isGenerating: false,
    startedAt: null,
    finishedAt: null,
    lives: 5,
    verificationsLeft: 3,
    flagCount: 0,
    mode: 'reveal',
    status: 'playing',
    message: gameState.debugError || 'Ready — choose a cell.',
    result: null,
  });
}

/** Coordinate reveals so board mechanics do not need lives or victory state. */
export function handleReveal(row, column, now, preparedBoard = null) {
  if (gameState.status !== 'playing' || gameState.isGenerating) return;
  // Verify clicks must reach revealed cells without entering the reveal path.
  if (gameState.mode === 'verify') {
    handleVerify(row, column);
    return;
  }
  const cell = gameState.board[row]?.[column];
  if (!cell || cell.isFlagged || cell.isRevealed || gameState.debugError) return;

  if (!gameState.isBoardGenerated) {
    if (gameState.debugMode && gameState.fixedLayout) {
      const { mineCoordinates, liarCoordinate, liarDisplayedValue } = gameState.fixedLayout;
      let fixedBoard;
      try {
        fixedBoard = createBoardFromFixedLayout(
          mineCoordinates, liarCoordinate, liarDisplayedValue, gameState.rows, gameState.columns,
        );
      } catch (error) {
        gameState.message = `Invalid debug layout: ${error.message}`;
        return;
      }
      // A fixed fixture must stay exact while still honoring a safe first reveal.
      if (fixedBoard[row][column].isMine) {
        gameState.message = 'Debug layout: choose a safe cell for the first reveal.';
        return;
      }
      preparedBoard = fixedBoard;
    } else {
      preparedBoard ??= generateSolvableBoard(gameState.rows, gameState.columns,
        gameState.mineCount, row, column).board;
    }
    for (const generatedCell of preparedBoard.flat()) {
      generatedCell.isFlagged = gameState.board[generatedCell.row][generatedCell.column].isFlagged;
    }
    gameState.board = preparedBoard;
    gameState.isBoardGenerated = true;
    gameState.startedAt = now ?? performance.now();
  }

  const newlyRevealedCells = revealCell(gameState.board, row, column);
  const newlyHitMines = newlyRevealedCells.filter((revealedCell) => revealedCell.isMine).length;
  // Only this reveal's hits cost lives; exposing mines at the end costs nothing.
  gameState.lives -= newlyHitMines;
  if (gameState.lives === 0) {
    finishGame('lost', now ?? performance.now());
  } else if (gameState.board.flat().every((boardCell) => boardCell.isMine || boardCell.isRevealed)) {
    finishGame('won', now ?? performance.now());
  } else {
    gameState.message = newlyHitMines > 0
      ? 'A little bump! You can keep exploring.' : 'One clue is mischievous. Take your time.';
  }
}

/** Treat flags as player notes rather than a correctness or victory check. */
export function handleFlag(row, column) {
  if (gameState.status !== 'playing' || gameState.isGenerating) return;
  const cell = gameState.board[row]?.[column];
  if (!cell || cell.isRevealed) return;
  cell.isFlagged = !cell.isFlagged;
  gameState.flagCount += cell.isFlagged ? 1 : -1;
}

/**
 * Use one entry point for verification mode and verification targets.
 * Omit coordinates to toggle mode; provide both to attempt a verification.
 */
export function handleVerify(row, column) {
  if (gameState.status !== 'playing' || gameState.isGenerating || gameState.verificationsLeft <= 0) return;
  if (row === undefined && column === undefined) {
    gameState.mode = gameState.mode === 'verify' ? 'reveal' : 'verify';
    gameState.message = gameState.mode === 'verify'
      ? 'Choose a revealed safe cell to check its clue. Click Verify again to cancel.'
      : 'Back to exploring — no verification used.';
    return;
  }
  if (gameState.mode !== 'verify') return;
  const cell = gameState.board[row]?.[column];
  // Invalid clicks keep verify mode on so a misclick never wastes a use or
  // unexpectedly reveals a covered cell; the player can choose another target.
  if (!cell || !cell.isRevealed || cell.isMine || cell.isVerified) return;
  cell.isVerified = true;
  cell.displayedValue = cell.trueValue;
  gameState.verificationsLeft -= 1;
  gameState.mode = 'reveal';
  gameState.message = 'Clue checked! The check mark means you can trust this value.';
  // Updating only this clue preserves the original lie and never triggers flood fill.
}

/** Preserve the original clue so verification cannot erase the punchline. */
function finishGame(status, now) {
  gameState.status = status;
  gameState.finishedAt = now;
  gameState.mode = 'reveal';
  const liar = gameState.board.flat().find((cell) => cell.isLiar);
  gameState.result = {
    liarRow: liar.row,
    liarColumn: liar.column,
    trueValue: liar.trueValue,
    originalDisplayedValue: liar.originalDisplayedValue,
  };
  for (const cell of gameState.board.flat()) {
    if (cell.isMine || cell.isLiar) cell.isRevealed = true;
  }
  gameState.message = status === 'won'
    ? 'Lovely detective work! Every safe cell is clear.'
    : 'Out of lives — the mischievous clue has been unmasked. Fancy another round?';
}

/** Use a monotonic clock; reading time never mutates game state. */
export function getElapsedSeconds(state, now = performance.now()) {
  if (state.startedAt === null) return 0;
  return Math.max(0, Math.floor(((state.finishedAt ?? now) - state.startedAt) / 1000));
}

export function formatElapsedTime(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
