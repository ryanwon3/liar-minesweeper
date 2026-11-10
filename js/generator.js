import {createEmptyBoard, placeMinesAvoidingCell, computeTrueValues, chooseLiar, revealCell} from './board.js';
import {analyzeObservation} from './solver.js';

/** Certify by simulating only deductions from revealed clues and legal checks. */
export function certifyBoard(source, mineCount, firstRow, firstColumn, deadline = Infinity) {
  const board = source.map(row => row.map(cell => ({...cell, isRevealed: false,
    isFlagged: false, isVerified: false, displayedValue: cell.originalDisplayedValue})));
  const rows = board.length, columns = board[0].length;
  const cells = board.flat(), knownMines = new Set();
  const steps = [];
  let verificationsUsed = 0;
  const reveal = (row, column) => {
    const cell = board[row][column];
    if (cell.isRevealed) return true;
    if (cell.isMine) return false;
    steps.push({type: 'reveal', row, column});
    revealCell(board, row, column);
    return true;
  };
  if (!reveal(firstRow, firstColumn)) return {solvable: false};
  for (let turn = 0; turn <= cells.length + 3; turn++) {
    if (cells.every(cell => cell.isMine || cell.isRevealed)) return {solvable: true, steps, verificationsUsed};
    if (performance.now() > deadline) break;
    // This is the information a player can see. In particular, covered cells
    // expose neither their displayed clue nor their true value or liar flag.
    const observation = {rows, columns, mineCount, knownMines: [...knownMines],
      cells: cells.map(cell => cell.isRevealed ? {clue: cell.displayedValue,
        verified: cell.isVerified,
        originalClue: cell.isVerified ? cell.originalDisplayedValue : cell.displayedValue} : null)};
    const deduction = analyzeObservation(observation, 3 - verificationsUsed, deadline);
    if (!deduction.complete || deduction.contradictory) break;
    deduction.mines.forEach(index => knownMines.add(index));
    if (deduction.safe.length) {
      for (const index of deduction.safe) if (!reveal(Math.floor(index / columns), index % columns)) return {solvable: false};
    } else if (deduction.mines.length) {
      continue;
    } else if (deduction.verify !== null) {
      const cell = cells[deduction.verify];
      cell.isVerified = true;
      cell.displayedValue = cell.trueValue; // A legal verification, not a deduction.
      verificationsUsed++;
      steps.push({type: 'verify', row: cell.row, column: cell.column});
    } else break;
  }
  return {solvable: false};
}

/** Every returned board has a certificate, including the bounded fallback. */
export function generateSolvableBoard(rows, columns, mineCount, firstRow, firstColumn,
  {maxAttempts = 200, timeBudgetMs = 1200} = {}) {
  const empty = createEmptyBoard(rows, columns);
  if (!empty[firstRow]?.[firstColumn]) throw new RangeError('First-click coordinates must be inside the board.');
  if (!Number.isInteger(mineCount) || mineCount < 1 || mineCount >= rows * columns) throw new RangeError('Invalid mine configuration.');
  const deadline = performance.now() + timeBudgetMs;
  for (let attempt = 0; attempt < maxAttempts && performance.now() < deadline; attempt++) {
    const board = createEmptyBoard(rows, columns);
    placeMinesAvoidingCell(board, mineCount, firstRow, firstColumn);
    computeTrueValues(board);
    chooseLiar(board);
    const proof = certifyBoard(board, mineCount, firstRow, firstColumn, deadline);
    if (proof.solvable) return {board, proof, fallback: false};
  }
  // A compact corner rectangle has a connected zero region reaching all safe
  // cells. Still certify it rather than relying on this construction as proof.
  // It bounds waiting time when random candidates are too ambiguous.
  const height = rows === 9 && columns === 9 && mineCount === 10 ? 2 :
    rows === 12 && columns === 12 && mineCount === 24 ? 4 : null;
  if (height === null) throw new Error('No certified board found for this configuration.');
  const width = mineCount / height;
  const top = firstRow < rows / 2 ? rows - height : 0;
  const left = firstColumn < columns / 2 ? columns - width : 0;
  for (let row = top; row < top + height; row++) for (let column = left; column < left + width; column++) empty[row][column].isMine = true;
  computeTrueValues(empty);
  chooseLiar(empty);
  const proof = certifyBoard(empty, mineCount, firstRow, firstColumn);
  if (!proof.solvable) throw new Error('Could not certify a solvable board. Please start a new game.');
  return {board: empty, proof, fallback: true};
}
