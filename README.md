# Liar Minesweeper

A browser game in plain HTML, CSS, and JavaScript. Exactly one safe cell shows a clue off by one. You have five lives and three verifications; reveal every safe cell to win. Finding the liar is optional.

## Run

```sh
python3 -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000). Use HTTP rather than opening the HTML file directly: the game uses ES modules and a module Web Worker. No third-party dependencies or installation step is required.

## Difficulty and elapsed time

- **Easy:** 9 × 9, 10 mines.
- **Medium:** 12 × 12, 24 mines.
- Changing difficulty starts a fresh game. New Game keeps the selected difficulty.
- The clock stays at 00:00 before play, starts after generation on the first eligible reveal, freezes on victory or defeat, and resets on restart. There is no time limit.

You can also open `/?difficulty=medium` to start with Medium selected.

## Guaranteed-solvable generation

Every normal generated board has a certified deduction path from the chosen first click to victory, without mine hits and using at most three verifications. The solver considers every possible revealed liar and legal offset, an unseen liar, and a previously verified liar. It never assumes all unchecked clues are honest.

Generation simulates only actions justified by public clues and the known mine count. Uncertified candidates are rejected. A bounded, also-certified corner-layout fallback prevents indefinite waiting; its opening may clear the board immediately. The browser runs generation in a background worker so the controls stay responsive. Restarting or changing difficulty cancels the pending board.

The guarantee means a safe solution exists. Incorrect flags or arbitrary verification choices can still leave a player stuck. Custom debug fixtures remain exact and bypass the guarantee. See [the solver design and evidence](docs/solvability.md).

## Controls and rules

- **Left-click:** reveal a covered, unflagged cell. The first reveal is safe.
- **Right-click:** flag or unflag a covered cell. Flags are personal notes; the browser context menu is suppressed.
- **Verify:** toggle verification mode, then click a revealed, unverified safe cell. One of three charges shows its true value and a permanent check mark. Valid verification returns to reveal mode; cancellation and invalid targets cost nothing. Verification never opens neighbors.
- **New Game:** reset the board, lives, verifications, flags, result, and time. The next eligible reveal generates the layout.

Flood fill uses true values. A true-zero liar displaying 1 still expands; a true-one liar displaying 0 does not. Misleading zero is rendered explicitly, while an ordinary unverified zero is blank.

Each distinct mine hit costs one life; the fifth ends the game. Repeated hits are free. Reveal all safe cells to win; flags alone do not win. Both outcomes show every mine and the liar's true and original displayed values, then disable further play.

The page includes expandable rules and live lives, charges, mine/flag counts, mode, status, and elapsed time.

## Debug mode

Open `/?debug=1` for each cell's true value, displayed value, mine status, and liar status in its tooltip and accessible label.

A fixed layout uses zero-based coordinates:

```text
/?debug=1&mines=0,0;1,1&liar=4,4&shown=1
/?difficulty=medium&debug=1&mines=0,0;1,1&liar=11,11&shown=1
```

Supply `mines`, `liar`, and `shown` together. `mines=` allows no mines. Coordinates must fit the selected difficulty (0–8 on Easy, 0–11 on Medium). Mines must be distinct, the liar must be safe, and its shown value must be between 0 and 8 and differ from its true value by one. Custom fixtures may have a different mine count; the counter reflects that count.

The fixture loads on the first safe reveal. Clicking a fixture mine first requests a safe cell without generating the board. New Game retains the fixture. Selecting a difficulty clears the custom fixture and starts a normal certified game. The page identifies custom fixtures as exempt from solvability checking.

## Tests and verification

On Node 20 or later:

```sh
npm test
```

The explicit ES module configuration makes the test command portable on Node 20; the earlier extra command-line flag is no longer necessary.

The suite contains 68 behavior tests: 16 board tests, 26 game tests, 6 solver tests, 11 generator tests, and 9 extension tests. The solver tests additionally check 1,160 public observations against independently enumerated legal 2×3 worlds. Generator tests replay certificates and force the fallback at every first-click position on both difficulties (225 positions).

An independent code review also checked 47,359 deductions against 20,000 additional 3×3 observations with known mines and multiple verifications; all deductions were sound.

On November 10, 2026, all 16 original core acceptance criteria passed desktop in-app browser validation. The extension browser checks cover both rendered board sizes, worker-generated mine/liar counts and first-click safety, flags, verification, timer start/reset/freeze, and restart/difficulty behavior. Other browsers and mobile/touch behavior are not claimed tested.

## Code map

| File | Responsibility |
|---|---|
| `SPEC.md` | Rules and core/extension acceptance criteria. |
| `index.html`, `style.css` | Controls, counters, rules, and responsive board styling. |
| `js/board.js` | Board model, mine counts, liar selection, true-value flood fill, and fixed fixtures. |
| `js/game.js` | Difficulty presets, game state/actions, lives, outcomes, verification, and elapsed-time lifecycle. |
| `js/solver.js` | Conservative reasoning across all one-liar hypotheses using public observations. |
| `js/generator.js` | Candidate generation, solution certification, and certified bounded fallback. |
| `js/generator.worker.js` | Background generation entry point. |
| `js/ui.js` | Rendering, delegated events, dynamic grid columns, and timer text updates. |
| `js/main.js` | Debug URLs, worker lifecycle/cancellation, and page startup. |
| `js/*.test.js` | Core rules, solver soundness, certificate replay, difficulty, and timer tests. |

## Remaining optional features

Sound effects with mute and a player-controlled suspicious marker are not implemented. Difficulty selection, elapsed time, and guaranteed-solvable generation are implemented.
