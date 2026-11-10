/**
 * Conservative one-liar reasoning over PUBLIC observations only.
 * cells contains null for covered cells, otherwise {clue, verified, originalClue}.
 * No hidden mine locations, true values, or liar identity enter this module.
 */
export function analyzeObservation(view, verificationsLeft = 3, deadline = Infinity) {
  const {rows, columns, cells, mineCount, knownMines = []} = view;
  const size = rows * columns;
  const bit = index => 1n << BigInt(index);
  const counts = new Map();
  const count = mask => {
    if (counts.has(mask)) return counts.get(mask);
    let remaining = mask, total = 0;
    while (remaining) { remaining &= remaining - 1n; total++; }
    counts.set(mask, total);
    return total;
  };
  let revealed = 0n, known = 0n;
  cells.forEach((cell, index) => { if (cell !== null) revealed |= bit(index); });
  for (const index of knownMines) known |= bit(index);
  const covered = ((1n << BigInt(size)) - 1n) & ~revealed;
  const clues = [];
  cells.forEach((cell, index) => {
    if (cell === null) return;
    let mask = 0n;
    const row = Math.floor(index / columns), column = index % columns;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const r = row + dr, c = column + dc;
      if ((dr || dc) && r >= 0 && r < rows && c >= 0 && c < columns) mask |= bit(r * columns + c);
    }
    clues.push({mask: mask & covered, target: cell.clue, index});
  });
  const confirmedLiars = cells.filter(cell => cell?.verified && cell.originalClue !== cell.clue).length;
  const hypotheses = [{index: -1, offset: 0}]; // Liar still covered, or already verified.
  if (confirmedLiars === 0) {
    for (const constraint of clues) if (!cells[constraint.index].verified) {
      for (const offset of [-1, 1]) if (constraint.target + offset >= 0 && constraint.target + offset <= 8) {
        hypotheses.push({index: constraint.index, offset});
      }
    }
  }
  let commonSafe = covered, commonMines = covered, worlds = 0;
  const possibleLiars = new Set();
  for (const hypothesis of confirmedLiars > 1 ? [] : hypotheses) {
    if (performance.now() > deadline) return {safe: [], mines: [], verify: null, complete: false};
    const constraints = clues.map(clue => ({mask: clue.mask,
      target: clue.target + (clue.index === hypothesis.index ? hypothesis.offset : 0)}));
    constraints.push({mask: covered, target: mineCount});
    const result = propagate(constraints, known, revealed, count);
    if (result === null) continue;
    worlds++;
    commonSafe &= result.safe;
    commonMines &= result.mines;
    if (hypothesis.index !== -1) possibleLiars.add(hypothesis.index);
  }
  const indexes = mask => Array.from({length: size}, (_, index) => index).filter(index => Boolean(mask & bit(index)));
  if (worlds === 0) return {safe: [], mines: [], verify: null, complete: true, contradictory: true};
  const safe = indexes(commonSafe & covered & ~known);
  const mines = indexes(commonMines & covered & ~known);
  // When deduction stalls, inspect a still-possible liar bordering the most
  // unresolved cells. This choice never consults the board's hidden answer.
  const candidates = clues.filter(clue => possibleLiars.has(clue.index))
    .map(clue => ({index: clue.index, score: count(clue.mask & ~known)}))
    .filter(candidate => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index);
  return {safe, mines, verify: verificationsLeft > 0 ? (candidates[0]?.index ?? null) : null, complete: true};
}

/** Bounds and subset differences are sound even when they cannot solve a world. */
function propagate(constraints, mines, safe, count) {
  for (;;) {
    const reduced = [];
    let nextMines = mines, nextSafe = safe;
    for (const constraint of constraints) {
      const mask = constraint.mask & ~(mines | safe);
      const target = constraint.target - count(constraint.mask & mines);
      const size = count(mask);
      if (target < 0 || target > size) return null;
      if (target === 0) nextSafe |= mask;
      if (target === size) nextMines |= mask;
      if (mask) reduced.push({mask, target, size});
    }
    for (let a = 0; a < reduced.length; a++) for (let b = 0; b < reduced.length; b++) {
      if (a === b) continue;
      const small = reduced[a], large = reduced[b];
      if (small.size > large.size || (small.mask & large.mask) !== small.mask) continue;
      const difference = large.mask ^ small.mask;
      const target = large.target - small.target;
      const size = large.size - small.size;
      if (target < 0 || target > size) return null;
      if (target === 0) nextSafe |= difference;
      if (target === size) nextMines |= difference;
    }
    if (nextSafe & nextMines) return null;
    if (nextMines === mines && nextSafe === safe) return {mines, safe};
    mines = nextMines;
    safe = nextSafe;
  }
}
