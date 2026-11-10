# Liar Minesweeper

## The Game

Liar Minesweeper is Minesweeper with one twist: exactly one safe cell on the board shows a wrong number. Its displayed value is off by exactly 1 from the true count of neighboring mines. The player clears the board while working out which clue cannot be trusted.

The player reveals cells, flags suspected mines, and cross-checks neighboring numbers. When the clues contradict each other, the player decides whether to spend one of a few limited "verifications", which reveal a cell's true number. The goal is to reveal every non-mine cell. Finding the liar is not required to win.

It is fun because ordinary Minesweeper logic stops being fully reliable. Every deduction depends on whether the clue behind it is honest, so players have to second-guess themselves and decide when to spend a verification.

**Tone:** relaxed and light-hearted. No timer pressure, gentle colors, readable numbers. Mistakes get clear but friendly feedback, and the end screen reveals the liar with a playful message.

## Rules

### Board and controls
- Default board: 9 x 9 grid with exactly 10 mines.
- Left-click a covered, unflagged cell to reveal it.
- Right-click a covered cell to toggle a flag. The browser context menu must not appear.
- A flagged cell cannot be revealed until it is unflagged. Flags are the player's own notes and are never checked for correctness.
- A cell's **true value** is the number of mines among its (up to 8) neighbors, including diagonals.
- The board is generated on the first reveal. The first clicked cell is never a mine. Its neighbors are not guaranteed safe.

### The liar
- Right after mines and true values are generated, choose exactly one liar uniformly at random from all non-mine cells. This includes true-0 cells and the first-clicked cell.
- The liar is chosen before the first reveal is resolved, so the first reveal or its flood fill may already show the liar.
- The liar's displayed value is its true value +1 or -1. A true 0 can only show 1. A true 8 can only show 7. For true values 1 to 7, choose +1 or -1 with equal probability.
- The liar's position and original displayed value are fixed for the whole game.
- All other non-mine cells display their true value.
- A true-0 cell with no liar displays blank. A liar that displays 0 (true value 1) shows an explicit "0" so the lie is visible. This is intentional.

### Flood fill
- Flood fill uses **true values**, not displayed values.
- Revealing a true-0 cell opens the connected region of unflagged true-0 cells and the unflagged safe cells around that region. It never opens a mine or a flagged cell.
- Consequences (intentional): a true-0 liar displaying 1 still expands. A true-1 liar displaying 0 does not expand. The player can use this as evidence.

### Verification
- The player has 3 verifications per game.
- Clicking the Verify button turns on verification mode. Clicking Verify again cancels it.
- In verification mode, clicking an already revealed, not-yet-verified safe cell uses one verification. The cell then shows its true value and a permanent "verified" marker. Verification mode then turns off.
- Verifying the liar replaces its displayed value with the true value. No new liar is created. The original misleading value is remembered for the end screen.
- Covered cells, mines, and already verified cells cannot be verified, and clicking them uses nothing.
- Verifying a cell does not reveal its neighbors or trigger flood fill.
- With 0 verifications left, the Verify button is disabled.

### Mine hits, winning, losing
- The player has 5 lives. Each newly revealed mine costs 1 life. The 5th distinct mine hit ends the game in defeat.
- A hit mine stays visibly revealed. Clicking it again costs nothing. It still counts as a mine for all true values. Clues do not change after a hit.
- Revealing every non-mine cell wins the game, regardless of flags, remaining verifications, or whether the liar was found. Flagging all the mines does not win.
- When the game ends (win or defeat): disable reveal, flag, and verify. Show all remaining mines. Highlight the liar with both its true value and its original displayed value, even if it was never opened or was already verified.
- New Game resets the board, lives, verifications, flags, and result. A new layout and liar are generated on the next first reveal.

## Full Intended Feature Set

**Core game**
- Random board generation with a safe first click.
- Reveal, flag, true-value flood fill, and exactly one persistent liar.
- Limited verification with a visible verified marker.
- Five lives, win and defeat detection, end-of-game liar reveal.
- On-screen display of lives, verifications left, mine count, flag count, current mode (reveal or verify), and game status.
- New Game button and a short on-screen explanation of the rules and controls.
- Debug mode (see criterion 1) so the rules can be tested on fixed boards.
- Web version in HTML, CSS, and JavaScript.

**Intended extensions (will probably not be reached in Phase 1)**
- Difficulty selection, e.g. Easy (9 x 9, 10 mines) and Medium (12 x 12, 24 mines).
- Elapsed-time display (informational only, no deadline).
- Gentle sound effects with a mute button.
- A player-controlled "suspicious" marker, separate from flags and verification.
- A guaranteed-solvable board generator. It would need a solver that considers every possible liar location and offset, not just one where all clues are honest. Without it, random boards may require guessing, and the game should not claim otherwise.

## Acceptance Criteria

1. The game has a debug mode (for example a URL parameter like `?debug=1`) that shows every cell's true value, displayed value, mine status, and liar status, and can load a fixed board layout. Criteria below that say "controlled board" use this.
2. The default game shows 81 covered cells in a 9 x 9 grid. After the first reveal, exactly 10 distinct cells are mines.
3. The first reveal is never a mine, tested at a corner, an edge, and an interior cell.
4. Left-click reveals a covered unflagged cell. Right-click toggles a flag on a covered cell without opening the browser context menu. Left-clicking a flagged cell does nothing.
5. Each safe cell's true value equals its actual neighboring mine count, including diagonals and board edges.
6. After generation, exactly one safe cell's displayed value differs from its true value, by exactly 1. Every other safe cell displays its true value. Across many generated boards, true-0 cells and the first-clicked cell are sometimes the liar.
7. On controlled boards: a true 0 liar displays 1, a true 8 liar displays 7, and a liar with true value 1 to 7 may show either +1 or -1. The liar's position and original value do not change during play or verification.
8. Revealing a true-0 cell expands the connected zero region and its safe boundary without opening any mine or flagged cell.
9. A true-0 liar displaying 1 still expands. A true-1 liar displaying 0 does not expand and visibly shows "0".
10. A valid verification reduces the verifications-left counter by exactly 1, shows the cell's true value, and adds a persistent verified marker. Clicking a covered cell, a mine, or an already verified cell in verify mode uses nothing. Cancelling verify mode uses nothing. At 0 left, verification cannot be used.
11. Verifying the liar shows its true value and does not create a new liar. Verifying any cell does not open its neighbors.
12. The first 4 distinct mine hits each remove 1 life and play continues. The 5th causes defeat. Clicking a previously hit mine removes no life. Other cells' true and displayed values do not change after a hit.
13. Revealing the last non-mine cell causes victory, even with unflagged mines or an unverified liar. Flagging every mine without revealing every safe cell does not cause victory.
14. After victory or defeat: reveal, flag, and verify are disabled, remaining mines are shown, and the liar is highlighted with its true and original displayed value. This works for an unopened liar and for an already verified liar.
15. New Game restores lives to 5, verifications to 3, clears flags and the result, and generates a new layout and liar only on the next first reveal.
16. The screen explains the one-liar rule, the +1/-1 offset, true-value flood fill, how to verify, the lives rule, and the win condition. Lives, verifications left, flag count, mode, and status always match the actual game state.

## Priorities

**Most important (build first):** criteria 1 to 9. These cover the board, the first-click rule, true versus displayed values, the liar, and the reveal/flag/flood-fill loop. Without them there is no game.

**Next:** criteria 10 to 15 (verification, lives, win and defeat, end reveal, New Game), then 16 (on-screen explanations).

**Extensions** (after all criteria above work): difficulty selection, then the timer, sound, and suspicious marker. The guaranteed-solvable generator is the largest risk and is not required.

**If time runs short, cut in this order:** solvable generator, sound, timer, suspicious marker, difficulty selection. Keep one playable 9 x 9 configuration. Spend remaining time fixing the core rules and documenting what is unfinished.

Phase 1 is not expected to finish everything. The README will honestly report which criteria are met.