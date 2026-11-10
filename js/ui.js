import { getStatusSummary } from './game.js';

/** Keep page updates separate so rendering cannot alter the game's deductions. */
export function renderGame(gameState) {
  renderBoard(gameState);
  renderStatus(gameState);
  const resultElement = document.getElementById('game-result');
  resultElement.hidden = !gameState.result;
  resultElement.textContent = gameState.result
    ? `The cheeky liar was at row ${gameState.result.liarRow + 1}, ` +
      `column ${gameState.result.liarColumn + 1}! Its true value is ` +
      `${gameState.result.trueValue}; its original displayed value was ` +
      `${gameState.result.originalDisplayedValue}.` : '';
}

/** Preserve visible evidence, including explicit liar zeroes and verification. */
export function renderBoard(gameState) {
  const boardElement = document.getElementById('board');
  const focusedCell = boardElement.contains(document.activeElement)
    ? document.activeElement : null;
  const focusedRow = focusedCell?.dataset.row;
  const focusedColumn = focusedCell?.dataset.column;
  const fragment = document.createDocumentFragment();
  const isGameOver = gameState.status === 'won' || gameState.status === 'lost';

  for (const cell of gameState.board.flat()) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cell';
    button.dataset.row = cell.row;
    button.dataset.column = cell.column;
    button.disabled = isGameOver;
    let description = 'covered';
    if (isGameOver && cell.isLiar) {
      button.classList.add('is-revealed', 'is-liar');
      const trueClue = document.createElement('span');
      trueClue.textContent = `True ${cell.trueValue}`;
      const originalClue = document.createElement('span');
      originalClue.textContent = `Was ${cell.originalDisplayedValue}`;
      button.append(trueClue, originalClue);
      description = `liar, true value ${cell.trueValue}, original displayed value ${cell.originalDisplayedValue}`;
      button.title = description;
    } else if (cell.isRevealed) {
      button.classList.add('is-revealed');
      if (cell.isMine) {
        button.classList.add('is-mine');
        button.textContent = '✹';
        description = 'revealed mine';
      } else {
        const clueValue = cell.isVerified ? cell.trueValue : cell.displayedValue;
        button.dataset.value = clueValue;
        // A displayed zero is evidence of a lie, unlike an honest blank zero.
        const isBlank = cell.trueValue === 0 && !cell.isLiar && !cell.isVerified;
        button.textContent = isBlank ? '' : String(clueValue);
        description = isBlank ? 'blank' : `clue ${clueValue}`;
      }
    } else if (cell.isFlagged) {
      button.classList.add('is-flagged');
      button.textContent = '⚑';
      description = 'flagged';
    } else {
      button.classList.add('is-covered');
    }
    if (cell.isVerified) {
      button.classList.add('is-verified');
      const verifiedMarker = document.createElement('span');
      verifiedMarker.className = 'verified-marker';
      verifiedMarker.textContent = '✓';
      verifiedMarker.setAttribute('aria-hidden', 'true');
      button.append(verifiedMarker);
      description += ', verified';
    }
    const accessibleLabel = `Row ${cell.row + 1}, column ${cell.column + 1}: ${description}`;
    button.setAttribute('aria-label', accessibleLabel);
    // Hidden values belong only in explicit debug mode, including tooltips/labels.
    if (gameState.debugMode) {
      const debugDetails = `trueValue=${cell.trueValue}; displayedValue=${cell.displayedValue}; ` +
        `isMine=${cell.isMine}; isLiar=${cell.isLiar}`;
      button.title = gameState.isBoardGenerated
        ? debugDetails : `Not generated yet; empty cell: ${debugDetails}`;
      button.setAttribute('aria-label', `${accessibleLabel}. Debug: ${button.title}`);
    }
    fragment.append(button);
  }
  boardElement.replaceChildren(fragment);
  // Preserve keyboard focus across a redraw instead of returning it to the page.
  if (focusedCell) {
    boardElement.querySelector(`[data-row="${focusedRow}"][data-column="${focusedColumn}"]`)?.focus();
  }
}

/** Reflect state consistently so counters never imply a different ruleset. */
export function renderStatus(gameState) {
  // Re-render every status field from state after each action so early returns,
  // mode changes, game endings, and resets cannot leave an old counter on screen.
  const summary = getStatusSummary(gameState);
  document.getElementById('lives').textContent = summary.lives;
  document.getElementById('verifications-left').textContent = summary.verificationsLeft;
  document.getElementById('mines').textContent = summary.mineCount;
  document.getElementById('flags').textContent = summary.flagCount;
  const modeLabel = summary.mode === 'verify' ? 'Verify' : 'Reveal';
  document.getElementById('mode').textContent = summary.debugMode ? `${modeLabel} (debug)` : modeLabel;
  const statusLabel = { playing: 'Playing', won: 'Won', lost: 'Lost' }[summary.status];
  document.getElementById('status').textContent = `${statusLabel} — ${summary.message}`;
  const verifyButton = document.getElementById('verify-button');
  verifyButton.disabled = summary.status !== 'playing' || summary.verificationsLeft === 0;
  verifyButton.setAttribute('aria-pressed', String(summary.mode === 'verify'));
  verifyButton.title = summary.mode === 'verify'
    ? 'Cancel verification without using a verification.' : 'Check a revealed safe cell’s true value.';
}

/**
 * Inject callbacks so DOM events do not own game rules.
 * @param {object} handlers Reveal, flag, verify, and new-game callbacks.
 */
export function attachEventHandlers(handlers) {
  const boardElement = document.getElementById('board');
  // Delegation survives cell replacement; assigning handlers avoids duplicates.
  boardElement.onclick = (event) => {
    const cell = event.target.closest('button.cell');
    if (cell && !cell.disabled && boardElement.contains(cell)) {
      handlers.onReveal(Number(cell.dataset.row), Number(cell.dataset.column));
    }
  };
  boardElement.oncontextmenu = (event) => {
    event.preventDefault();
    const cell = event.target.closest('button.cell');
    if (cell && !cell.disabled && boardElement.contains(cell)) {
      handlers.onFlag(Number(cell.dataset.row), Number(cell.dataset.column));
    }
  };
  document.getElementById('new-game-button').onclick = () => handlers.onNewGame();
  const verifyButton = document.getElementById('verify-button');
  verifyButton.onclick = () => {
    if (!verifyButton.disabled) handlers.onVerify();
  };
}
