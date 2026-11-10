# Prompt Log

## Tools and models

- Coding agent: OpenAI Codex, based on GPT-6. The exact model variant was not exposed in this conversation. Repository work used file-editing tools and terminal commands, with Node's built-in assert for tests. Browser testing was attempted but blocked; some UI checks instead used DOM test doubles.
- Claude (claude.ai): used to plan the project, check the scope of the idea, help turn my design decisions into SPEC.md text, and draft the step-by-step prompts below. This Claude history is reported by the author in the Step 8 request; the Claude conversation is not included here.

## Notes

The coding-agent prompts below are copied verbatim from this chat. Results summarize what actually happened. Step 8 is the request to create this log.

## Prompts to the coding agent

### Step 1: skeleton

```text
You are working in the repo `liar-minesweeper`. Read SPEC.md in full first. It is the author's design and must not be edited.

Task: create ONLY the project skeleton for a browser-based Liar Minesweeper. Do not implement game logic yet.

Create these files:
- index.html: loads style.css and the JS files below as ES modules via <script type="module" src="js/main.js">. Contains an empty board container, a status bar (lives, verifications left, mines, flags, mode, status), a Verify button, a New Game button, and a short rules/controls text area. Elements need clear ids.
- style.css: minimal readable layout only (relaxed, light style as described in SPEC.md). No heavy styling.
- js/board.js: pure board logic with no DOM access. Export stub functions with clear names and doc comments, each with a TODO describing exactly what to implement, for: createEmptyBoard, placeMinesAvoidingCell, computeTrueValues, chooseLiar, computeDisplayedValue (true 0 -> 1, true 8 -> 7, otherwise +1 or -1 at random), revealCell (flood fill based on TRUE values).
- js/game.js: game state (lives = 5, verificationsLeft = 3, mode, status) and stub functions for newGame, handleReveal, handleFlag, handleVerify, with TODOs.
- js/ui.js: stub functions that render game state to the page and attach click handlers (left-click reveal, right-click flag with context menu disabled), with TODOs.
- js/main.js: entry point that imports the modules and starts a new game.

Rules:
- Use descriptive names such as trueValue, displayedValue, isLiar, isMine, isRevealed, isFlagged, isVerified.
- Comments should explain WHY, not what. Leave TODO comments where the next step belongs.
- Do not implement any game rules yet. Do not create README.md or prompt_log.md. Do not modify SPEC.md.
- When done, list the files you created and what each one is responsible for.
```

Result: Created the six requested files with static markup, minimal styling, initial state, documented stubs, and startup calls; no game logic was implemented. JavaScript syntax checks passed, and SPEC.md was unchanged.

### Step 2: board logic and tests

```text
Read SPEC.md first (do not edit it), then js/board.js. Keep the existing file structure, function names and signatures from the skeleton. Do not rename anything or rewrite other files.

Task: implement the TODOs in js/board.js ONLY. It must stay pure logic with no DOM access.

Implement exactly these rules from SPEC.md:
1. Board is 9x9 with exactly 10 mines. Mines are placed on the first reveal, never on the first-clicked cell (its neighbors are NOT protected).
2. Each non-mine cell's trueValue is its number of neighboring mines, including diagonals, handled correctly at edges and corners.
3. Right after mines and true values exist, choose exactly one liar uniformly at random among ALL non-mine cells (including true-0 cells and the first-clicked cell).
4. The liar's displayedValue is trueValue +1 or -1 with equal probability, except trueValue 0 -> 1 and trueValue 8 -> 7. Every other non-mine cell has displayedValue equal to trueValue. Store the liar's originalDisplayedValue permanently so it can be shown on the end screen. The liar's position and original displayed value never change.
5. revealCell does flood fill using TRUE values, not displayed values. Revealing a cell whose trueValue is 0 opens the connected region of unflagged trueValue-0 cells plus the unflagged safe cells bordering that region. Never reveal a mine or a flagged cell by flood fill. A true-0 liar displaying 1 still expands. A true-1 liar displaying 0 does not expand.
6. A flagged cell cannot be revealed. Revealing a mine marks it revealed and reports that a mine was hit (do not decide lives or defeat here; that belongs in game.js).

Also add:
- A function to build a board from a fixed layout for testing: given a list of mine coordinates, a liar coordinate and a liar displayed value, produce the same board structure as normal generation. This will later power the debug mode.
- A test file js/board.test.js runnable with `node js/board.test.js` (use only Node's built-in assert, no packages). Tests must cover: exactly 10 mines; first click safe at a corner, an edge and an interior cell (run each many times); trueValue correctness on a small hand-made fixed layout including edges and diagonals; exactly one liar whose displayed value differs from trueValue by exactly 1 over many generated boards; a true-0 liar shows 1; a true-8 liar shows 7; flood fill opens the expected cells on a fixed layout and skips flagged cells; a true-0 liar showing 1 still expands; a true-1 liar showing 0 does not expand.

Rules:
- Use descriptive names, comments that explain WHY, and keep remaining TODOs where later work belongs.
- Do not touch SPEC.md, index.html, style.css, game.js, ui.js or main.js.
- When done, run the tests, paste the output, and list the exact functions you changed.
```

Result: Implemented the board functions, added createBoardFromFixedLayout and internal helpers, and created js/board.test.js. An initial flood-fill test had an incorrect fixture expectation; after correcting the fixture, all 16 tests passed, with only js/board.js and the new test file changed.

### Step 3: playable board and debug mode

```text
Read SPEC.md first (do not edit it), then js/board.js, js/game.js, js/ui.js,
js/main.js, index.html and style.css. Keep the existing file structure and
function names. js/board.js is already implemented and tested; do not change
its logic.

Task: make the 9x9 board playable in the browser, covering reveal, flag, and
debug mode only. Do NOT implement verification, lives, or win/defeat yet; leave
TODOs for those.

Implement:
1. js/game.js: newGame creates an empty 9x9 state (no mines yet). handleReveal
   generates the board on the FIRST reveal only (mines avoiding the clicked
   cell, true values, liar), then calls revealCell from board.js. handleFlag
   toggles a flag on a covered cell only. Track flag count and the total mine
   count (10) in state.
2. js/ui.js: render the 9x9 grid into the board container. Covered cells, flagged
   cells and revealed cells must look clearly different. A revealed true-0 cell
   with no lie shows blank; a liar that displays 0 shows an explicit "0". Show
   readable, gentle number colors. Left-click calls handleReveal, right-click
   calls handleFlag, and the browser context menu is disabled on the board.
   Update the status bar (mines, flags, mode, status) after every action. Lives
   and verifications-left can show their initial values (5 and 3).
3. New Game button resets state and re-renders. The new layout and liar are
   generated only on the next first reveal.
4. Debug mode: if the URL has ?debug=1, show for every cell its true value,
   displayed value, mine status and liar status (for example as small overlay
   text or a tooltip), and allow loading a fixed layout through the existing
   fixed-layout function in board.js (for example via URL parameters such as
   ?debug=1&mines=0,0;1,1&liar=4,4&shown=3). Document the exact URL format in
   a comment at the top of js/main.js.

Rules:
- Use descriptive names, comments that explain WHY, and TODO comments for
  verification, lives, and win/defeat.
- Do not touch SPEC.md or js/board.js logic. Do not create README.md or
  prompt_log.md.
- When done, list the files you changed and the exact URL I should open to test
  debug mode.
```

Result: Added deferred generation, reveal/flag controls, reset, grid rendering, and debug URL parsing/tooltips in js/game.js, js/ui.js, js/main.js, index.html, and style.css; the 16 board tests and additional game/UI checks passed. Browser verification was blocked by browser-session and local-server restrictions, so UI checks used DOM test doubles; verification, lives, and outcomes remained TODOs at this step.

### Step 4: lives, win/defeat, and end-of-game reveal

```text
Read SPEC.md first (do not edit it), then js/board.js, js/game.js, js/ui.js,
js/main.js, index.html and style.css. Keep the existing file structure and
function names. js/board.js logic is already tested; do not change it except
for adding small helper functions if truly needed.

Task: implement lives, win/defeat, and the end-of-game reveal. Do NOT implement
verification yet; leave its TODOs in place.

Implement exactly these rules from SPEC.md:
1. The player starts with 5 lives. Each NEWLY revealed mine costs 1 life. The
   5th distinct mine hit ends the game in defeat. The first 4 hits let play
   continue.
2. A hit mine stays visibly revealed. Clicking it again costs nothing. Hit mines
   still count as mines for all true values; no clue changes after a hit.
3. Revealing every non-mine cell wins the game, regardless of flags, remaining
   verifications, or whether the liar was found. Flagging every mine does NOT
   win. A flood fill that reveals the last safe cell also wins.
4. When the game ends (win or defeat): reveal, flag and verify actions are
   disabled; all remaining unrevealed mines are shown; the liar is highlighted
   showing BOTH its true value and its original displayed value, even if the
   liar was never opened.
5. The status bar shows lives left and the game status (playing / won / lost).
   Use friendly, light-hearted messages, with a playful message that names the
   liar on the end screen. No harsh colors or startling effects.
6. New Game restores lives to 5, verifications to 3, clears flags and the
   result, and generates a new layout and liar only on the next first reveal.

Also add:
- A test file js/game.test.js runnable with `node js/game.test.js` (Node's
  built-in assert only, no packages). game.js must therefore keep its state
  logic free of DOM access (rendering stays in ui.js). Use the fixed-layout
  function from board.js to build a controlled board. Tests must cover: first
  4 distinct mine hits remove 1 life each and play continues; the 5th causes
  defeat; clicking an already hit mine removes no life; revealing the last
  safe cell wins even with unflagged mines; flagging every mine without
  revealing all safe cells does not win; after win or defeat, reveal and flag
  do nothing; New Game restores lives and clears flags and result.

Rules:
- Use descriptive names, comments that explain WHY, and keep TODOs for
  verification.
- Do not touch SPEC.md. Do not create README.md or prompt_log.md.
- When done, run both test files (node js/board.test.js and node
  js/game.test.js), paste the output, and list the exact functions you changed.
```

Result: Implemented lives, canonical playing/won/lost status, end-game action locks, mine exposure, preserved liar result data, and the end-screen UI, and added js/game.test.js. All 16 board tests and 12 game tests passed, as did end-screen checks with DOM test doubles; verification remained unimplemented.

### Step 5: verification

```text
Read SPEC.md first (do not edit it), then js/board.js, js/game.js, js/ui.js,
js/main.js, index.html and style.css. Keep the existing file structure and
function names. Do not change existing behavior of reveal, flag, lives, or
win/defeat.

Task: implement verification. Follow these rules from SPEC.md exactly.

1. The player has 3 verifications per game (verificationsLeft in game state).
2. Clicking the Verify button turns on verification mode. Clicking Verify
   again cancels it and uses nothing. The status bar shows the current mode
   (reveal or verify).
3. In verification mode, clicking an already revealed, not-yet-verified SAFE
   cell uses exactly one verification. The cell then shows its TRUE value and
   a permanent visible "verified" marker (for example a small check mark or a
   border). Verification mode then turns off automatically.
4. Verifying the liar replaces its displayed value with its true value. No new
   liar is created. The liar's original displayed value must still be
   remembered for the end screen, and its isLiar flag and position never
   change.
5. Covered cells, mines (including hit mines), and already verified cells
   cannot be verified. Clicking them in verify mode uses nothing and does not
   change the counter. Decide sensibly whether verify mode stays on after such
   an invalid click, and note that choice in a code comment.
6. Verifying a cell does NOT reveal its neighbors and does NOT trigger flood
   fill, even if its true value is 0.
7. With 0 verifications left, the Verify button is disabled.
8. After win or defeat, verify is disabled (button disabled and clicks do
   nothing), and the end screen still highlights the liar with BOTH its true
   value and its original displayed value, including when the liar was
   already verified.
9. New Game restores verificationsLeft to 3, turns verify mode off, and clears
   all verified markers.
10. The verifications-left counter and mode in the status bar must always
    match the actual game state after every action.

Also add tests to js/game.test.js (Node's built-in assert only, state logic
must stay free of DOM access) using a controlled board built with the
fixed-layout function. Tests must cover: a valid verification reduces the
counter by exactly 1 and marks the cell verified; clicking a covered cell, a
mine, or an already verified cell in verify mode uses nothing; cancelling
verify mode uses nothing; at 0 left verification cannot be used; verifying the
liar shows its true value, keeps the same liar position, and keeps the
original displayed value; verifying a true-0 cell does not open any neighbors;
verification is disabled after win and after defeat; New Game restores 3
verifications and clears verified markers.

Rules:
- Use descriptive names, comments that explain WHY.
- Do not touch SPEC.md. Do not create README.md or prompt_log.md.
- When done, run node js/board.test.js and node js/game.test.js, paste the
  output, and list the exact functions you changed.
```

Result: Implemented verification mode, free cancellation, valid-target checking, clue correction with original values retained, permanent markers, and button/counter updates; invalid clicks keep verify mode on without spending a use. All 16 board tests and 25 game tests passed, along with verification UI checks using DOM test doubles.

### Step 6: on-screen explanation and status consistency

```text
Read SPEC.md first (do not edit it), then index.html, style.css, js/game.js,
js/ui.js and js/main.js. Keep the existing file structure and function names.
Do not change any game rules or logic in js/board.js or js/game.js.

Task: finish the on-screen explanation and make the displayed counters always
match the real game state.

1. Rules text in index.html: add a short, friendly, readable rules and controls
   section (in English, relaxed and light-hearted tone as described in
   SPEC.md) that explains ALL of the following:
   - Exactly one safe cell shows a wrong number.
   - The lie is off by exactly 1 (+1 or -1).
   - Flood fill uses TRUE values, so a cell that shows a wrong number can
     still expand or not expand; this can be a clue.
   - A liar that displays 0 shows an explicit "0", while an ordinary true-0
     cell is blank.
   - How to verify: click Verify, then click a revealed number; you have 3
     verifications per game; a verified cell shows its true value with a mark.
   - Lives: you have 5 lives, each newly revealed mine costs 1, and the 5th
     distinct mine hit ends the game.
   - Win condition: reveal every non-mine cell. Finding the liar is not
     required. Flags are just your own notes and are never checked.
   - Controls: left-click reveals, right-click flags.
   Keep it compact (for example in a collapsible <details> element or a short
   side panel) so the board stays the main focus.
2. Status bar: lives, verifications left, mine count, flag count, current mode
   (reveal or verify), and game status must all be updated by one single
   render function after EVERY action (reveal, flag, verify, mode toggle,
   win, defeat, New Game). Fix any place where a counter is only updated in
   some code paths. Do not store duplicate copies of these numbers; always
   read them from the game state.
3. Add a short comment near the render function explaining why everything is
   re-rendered from state.

Also add to js/game.test.js: a test that after a sequence of actions
(flag, unflag, reveal, mine hit, verify, New Game) the values the UI would
display (a state-summary function exported from game.js, with no DOM access)
equal the actual state. If such a function does not exist yet, add a small
getStatusSummary(state) function and use it from ui.js.

Rules:
- Use descriptive names, comments that explain WHY.
- Do not touch SPEC.md. Do not create README.md or prompt_log.md.
- When done, run node js/board.test.js and node js/game.test.js, paste the
  output, and list the exact functions and files you changed.
```

Result: Replaced the rules with a collapsible explanation, added the pure getStatusSummary helper, used it in renderStatus, and routed startup through the existing action/render wrapper without changing game rules. All 16 board tests and 26 game tests passed, and status-rendering checks with DOM test doubles also passed.

### Step 7: README handoff

```text
Read SPEC.md, then read ALL code files (index.html, style.css, js/*.js).
Do not edit SPEC.md or any code file.

Task: write README.md for a partner who will take over this repo in Phase 2
and has never seen it. It must be honest: describe only what is actually in
the code and what I report below. If you are unsure whether something works,
write "not verified" instead of claiming it.

Required sections:
1. What this is: two sentences on Liar Minesweeper (browser game, plain
   HTML/CSS/JavaScript, no dependencies, one safe cell shows a number off by
   exactly 1).
2. How to run: serve the folder with `python3 -m http.server 8000` and open
   http://localhost:8000 (ES modules do not work from double-clicking
   index.html). Debug mode URL format with an example. How to run the tests:
   `node js/board.test.js` and `node js/game.test.js`.
3. Controls: left-click reveal, right-click flag, Verify button, New Game.
4. Acceptance criteria status: a table of the 16 numbered criteria in SPEC.md
   with Done / Partial / Not done / Not verified and one short note each.
   Use ONLY my self-check results below, plus what the tests actually cover
   (read the test files to see). Do not mark anything Done that I did not
   mark Done.
5. Code map: each file and what it is responsible for, and where the key
   functions live (board generation, liar selection, flood fill, verification,
   lives and win/defeat, rendering, debug mode).
6. Next steps in priority order, based on the "Priorities" section of SPEC.md
   and on the criteria marked not done or partial.
7. Known bugs and shortcuts: only real, observed problems from my list below
   plus any TODO comments you find in the code. Mention that the random board
   generator can produce boards that require guessing and that no
   guaranteed-solvable generator exists.
8. A short note that SPEC.md is the source of truth for intended behavior and
   README.md describes actual progress.

Style: plain, concise, no marketing language, no emoji. Every sentence must be
true of the current repo.

When done, list any statement in the README you could not verify from the
code or my notes.
```

Result: Created README.md with run/debug instructions, controls, a code map, test coverage, priorities, and limitations; only that documentation file was added. The referenced self-check results and bug list were absent, so no criterion was marked Done; the 16 board and 26 game tests passed again, while browser behavior and other Node versions were recorded as not verified.