# Difficulty, timer, and solvable boards implementation plan

**Goal:** Add Easy (9×9/10 mines), Medium (12×12/24 mines), elapsed time, and certified no-guessing generation, then push the tested changes to the user's repository.

**Architecture:** Keep the plain JavaScript application and DOM-free state. A conservative solver enumerates each possible revealed liar and offset, plus an unseen liar; only deductions valid in every remaining hypothesis are safe. Simulate legal reveals and up to three verifications to certify candidate boards. Run generation in a worker, reject uncertified candidates, and certify a bounded constructive fallback too.

**Spec:** Existing SPEC.md core rules and the three extensions explicitly requested on November 10, 2026. Existing custom debug fixtures remain exact and are exempt from the solvability guarantee.

**Decisions:** Difficulty changes start a new game. New Game retains the selected difficulty. Time starts after generation on the first eligible reveal, stops at victory/defeat, and resets on restart. Solvability means there exists a deduction path with no mine hits and no more than three verifications; it does not guarantee recovery after arbitrary wasted verifications or incorrect flags. Generation must never return an unchecked board. Work in the task's existing isolated checkout on a feature branch; publish by fast-forwarding main only after verification.

## Review focus

- Hidden mine/true/liar fields must never influence solver decisions; only revealed clues, verification results, total mines, and proven mines may do so.
- A timeout or incomplete deduction must reject a candidate, never count as a proof.
- Restart/difficulty changes during worker generation must invalidate the pending result.
- Time must stay zero before play, include elapsed wall time during play, and freeze at either outcome.
- Medium boards, debug coordinates, and CSS columns must use actual dimensions.

## Tasks

- [x] Write and observe failing solver tests, including ambiguous liar clues and an independent exhaustive small-board soundness check. Implement conservative hypothesis propagation and certification.
- [x] Write and observe failing generator tests for both sizes, every first-click region, bounded retries, and certified fallback. Implement generation and worker entry point.
- [x] Write and observe failing difficulty/timer/state tests. Integrate dimensions, elapsed time, cancellation-safe worker control, selector, and timer display. Provide a portable npm test command.
- [x] Run the full logic suite and browser tests for both difficulties, time lifecycle, verification, reset during generation, and preserved core controls. Update SPEC/README with the exact guarantee and evidence.
- [x] Request independent review and verify the final diff. Integration: commit the verified tree, fast-forward main, push, and return the GitHub link.

## Progress

- Baseline: 42 logic tests pass with Node 20's ES module flag; working tree clean at source commit 3e7ccc5.

- Solver/generator/difficulty/timer tests were observed failing before implementation, then passing.
- Independent review found no Critical/Important issues; its extra oracle validated 47,359 deductions.
- Removed two temporary API-availability assertions after the initial red phase; 68 meaningful behavior tests remain.

- Final verification: all 68 behavior tests pass; 21 extension browser checks pass, with no browser warning/error logs. Browser screenshots were inspected. Documentation records the bounded fallback and exact guarantee.
