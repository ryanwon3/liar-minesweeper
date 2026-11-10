/**
 * Create cells without generating a layout, so the first reveal can stay safe.
 * @param {number} rows
 * @param {number} columns
 * @returns {Array<Array<object>>} A two-dimensional array of independent cells.
 */
export function createEmptyBoard(rows, columns) {
  rows = rows ?? 9;
  columns = columns ?? 9;
  if (!Number.isInteger(rows) || rows < 1 ||
      !Number.isInteger(columns) || columns < 1) {
    throw new RangeError('Board dimensions must be positive integers.');
  }
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: columns }, (_, column) => ({
      row,
      column,
      trueValue: 0,
      displayedValue: 0,
      originalDisplayedValue: 0,
      isLiar: false,
      isMine: false,
      isRevealed: false,
      isFlagged: false,
      isVerified: false,
    })),
  );
}

/** Place mines only after a first-click position is known. */
export function placeMinesAvoidingCell(board, mineCount, safeRow, safeColumn) {
  const safeCell = requireCell(board, safeRow, safeColumn);
  const eligibleCells = board.flat().filter((cell) => cell !== safeCell);
  if (!Number.isInteger(mineCount) || mineCount < 0 || mineCount > eligibleCells.length) {
    throw new RangeError('Mine count must fit outside the protected cell.');
  }
  if (board.flat().some((cell) => cell.isMine || cell.isLiar || cell.isRevealed)) {
    throw new Error('Place mines only on a fresh board.');
  }
  // Sampling without replacement avoids duplicate mines and unbounded retries.
  for (let index = 0; index < mineCount; index += 1) {
    const randomIndex = index + Math.floor(Math.random() * (eligibleCells.length - index));
    [eligibleCells[index], eligibleCells[randomIndex]] =
      [eligibleCells[randomIndex], eligibleCells[index]];
    eligibleCells[index].isMine = true;
  }
}

/** Keep neighboring mine counts independent of misleading clues and mine hits. */
export function computeTrueValues(board) {
  for (const cell of board.flat()) {
    if (!cell.isMine) {
      cell.trueValue = neighboringCells(board, cell.row, cell.column)
        .filter((neighbor) => neighbor.isMine).length;
    }
  }
}

/** Fix one liar before resolving the first reveal, including any flood fill. */
export function chooseLiar(board) {
  const existingLiar = board.flat().find((cell) => cell.isLiar);
  // Repeated initialization must not reroll a lie or undo a verification.
  if (existingLiar) return existingLiar;
  const safeCells = board.flat().filter((cell) => !cell.isMine);
  if (safeCells.length === 0) throw new RangeError('A liar needs a safe cell.');
  const liar = safeCells[Math.floor(Math.random() * safeCells.length)];
  liar.isLiar = true;
  for (const cell of safeCells) {
    cell.displayedValue = computeDisplayedValue(cell.trueValue, cell.isLiar);
    cell.originalDisplayedValue = cell.displayedValue;
  }
  return liar;
}

/**
 * Separate clue generation from verification so the original lie can be retained.
 * @param {number} trueValue
 * @param {boolean} isLiar
 * @returns {number} The clue value.
 */
export function computeDisplayedValue(trueValue, isLiar) {
  if (!isLiar) return trueValue;
  if (trueValue === 0) return 1;
  if (trueValue === 8) return 7;
  return trueValue + (Math.random() < 0.5 ? -1 : 1);
}

/**
 * Reveal using true values so a misleading zero cannot change expansion.
 * @returns {Array<object>} Newly revealed cells; an isMine cell reports a hit.
 */
export function revealCell(board, row, column) {
  const target = requireCell(board, row, column);
  if (target.isFlagged || target.isRevealed) return [];
  target.isRevealed = true;
  const newlyRevealedCells = [target];
  if (target.isMine || target.trueValue !== 0) return newlyRevealedCells;

  // Mark cells when queued so overlapping zero regions never enqueue duplicates.
  const pendingZeros = [target];
  for (let index = 0; index < pendingZeros.length; index += 1) {
    const zero = pendingZeros[index];
    for (const neighbor of neighboringCells(board, zero.row, zero.column)) {
      if (neighbor.isMine || neighbor.isFlagged || neighbor.isRevealed) continue;
      neighbor.isRevealed = true;
      newlyRevealedCells.push(neighbor);
      if (neighbor.trueValue === 0) pendingZeros.push(neighbor);
    }
  }
  return newlyRevealedCells;
}

/**
 * Build reproducible debug boards without depending on random generation.
 * Coordinates are [row, column] pairs; optional dimensions allow small fixtures.
 */
export function createBoardFromFixedLayout(
  mineCoordinates, liarCoordinate, liarDisplayedValue, rows = 9, columns = 9,
) {
  const board = createEmptyBoard(rows, columns);
  for (const [row, column] of mineCoordinates) {
    const cell = requireCell(board, row, column);
    if (cell.isMine) throw new Error('Mine coordinates must be distinct.');
    cell.isMine = true;
  }
  computeTrueValues(board);
  const liar = requireCell(board, ...liarCoordinate);
  if (liar.isMine || !Number.isInteger(liarDisplayedValue) ||
      liarDisplayedValue < 0 || liarDisplayedValue > 8 ||
      Math.abs(liarDisplayedValue - liar.trueValue) !== 1) {
    throw new RangeError('The liar must be safe and display a valid clue off by one.');
  }
  liar.isLiar = true;
  for (const cell of board.flat()) {
    if (!cell.isMine) {
      cell.displayedValue = cell.isLiar ? liarDisplayedValue : cell.trueValue;
      cell.originalDisplayedValue = cell.displayedValue;
    }
  }
  return board;
}

/** Reject invalid coordinates instead of silently protecting or revealing another cell. */
function requireCell(board, row, column) {
  if (!Number.isInteger(row) || !Number.isInteger(column) || !board[row]?.[column]) {
    throw new RangeError('Cell coordinates must be inside the board.');
  }
  return board[row][column];
}

/** Share edge handling so clue counts and flood fill use identical adjacency. */
function neighboringCells(board, row, column) {
  const neighbors = [];
  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
      if (rowOffset === 0 && columnOffset === 0) continue;
      const neighbor = board[row + rowOffset]?.[column + columnOffset];
      if (neighbor) neighbors.push(neighbor);
    }
  }
  return neighbors;
}
