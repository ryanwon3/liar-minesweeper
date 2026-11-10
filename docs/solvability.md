# What the solvability guarantee means

Each normal generated board has a certified path from the chosen first reveal to clearing all safe cells. That path needs no guesses, no mine hits, and at most three verifications. A player can still lose or block their own progress with incorrect flags or spent verifications. Custom debug fixtures bypass generation and are not claimed solvable.

## Public information boundary

`solver.js` accepts only dimensions, the total mine count, null for covered cells, visible clues for revealed cells, verification results, and already deduced mines. It receives no actual mine positions, true values of unchecked cells, or liar identity.

For each analysis it considers:

- Each revealed, unverified clue as the liar, with both legal true values one away from its displayed value.
- An unseen liar, in which case all revealed clues are honest. This relaxed hypothesis is retained even when its hidden location has not been established; that can prevent a deduction but cannot create false certainty.
- If a verification has exposed a difference from the original clue, the liar has been found, and every other clue is honest.

Within each hypothesis, neighboring mine sums and the global mine count are propagated using bounds and subset differences. Contradictory hypotheses are discarded. A covered cell is safe, or a mine, only if that conclusion is derived in every surviving hypothesis. Incomplete propagation deliberately leaves extra possibilities; it never treats failure to find a contradiction as a complete solution.

The actual board's hypothesis remains among these possibilities. Consequently, intersecting sound deductions cannot authorize a mine reveal. A verified clue may narrow the hypotheses; when deduction stalls, the simulator chooses a still-possible liar bordering unresolved cells, without consulting its hidden answer.

## Certification and bounded generation

`generator.js` simulates the chosen first reveal, then repeated deductions and legal verifications. Reveals use the game's true-value flood fill. Hidden truth is used only to execute action results, reject any mine hit, and check that every safe cell is clear. The returned certificate records each reveal and verification; the generator tests replay it independently against board mechanics.

Random candidates that stall, exceed the verification budget, or exceed the time budget are rejected. Generation tries up to 200 candidates within a 1.2-second search budget, then uses a compact corner layout and certifies that too. That fallback's connected safe opening may clear the board immediately. No unchecked random board is returned as a fallback.

The solver is conservative rather than complete: some genuinely solvable layouts will be rejected. Certification also filters the distribution of accepted mine layouts and liar locations.

The browser runs generation in a module Web Worker. New Game and difficulty changes terminate the pending worker, and stale result handlers cannot replace the current game. The elapsed clock starts when the accepted first reveal is applied, excluding generation time.

## Evidence

- The committed exhaustive small-board oracle enumerates legal 2×3 worlds and checks 1,160 observations, including verified clues, independently of the deduction engine.
- Generator tests replay certificates for Easy and Medium, and force the certified fallback at every first-click location on both sizes (225 positions total).
- An independent review additionally compared 47,359 deductions against 20,000 3×3 observations with known mines and multiple verified clues; no unsound deduction was found.
- State and browser checks cover difficulty reset, timer lifecycle, worker cancellation, and preserved reveal/flag/verification behavior.
