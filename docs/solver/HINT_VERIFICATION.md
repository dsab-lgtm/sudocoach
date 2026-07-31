# Hint Verification

## Safety contract

Hints never extend an unsafe player branch. For a uniquely solvable puzzle,
the verified solution is used only as a private guard: a conflicting,
candidate-exhausting, or legal-looking incorrect value opens recovery instead
of revealing another deduction. Ambiguous puzzles retain local candidate
guidance and never receive an exact-value mismatch claim.

An accepted candidate removal remains available through coach-applied values.
A player placement, replacement, or erase resets the derived removal layer, so
the next explanation always starts from the player's edited board.

## Deterministic game corpus

`src/test/fixtures/hintGameCorpus.ts` records the clue grid, known unique
solution, and exact ordered steps for these complete games:

| Game | Steps | Techniques exercised |
| --- | ---: | --- |
| Classic singles | 51 | Naked single |
| Hidden-single cascade | 51 | Naked and hidden single |
| Naked-pair cascade | 49 | Naked/hidden single and naked pair |
| Pointing-pair cascade | 49 | Naked/hidden single and pointing pair |

The box-line-reduction drill records its exact claiming move, then asserts the
intentional supported-technique limit. It is not presented as unsolvable.

Every trace replays candidate removals as the application does, verifies the
source puzzle has one solution, checks every placement/removal against that
solution, and requires the completed board to match it exactly.

## Technique references

- [HoDoKu: Human Style Solving Techniques](https://hodoku.sourceforge.net/en/techniques.php)
- [HoDoKu: Simple Sudoku Technique Set](https://hodoku.sourceforge.net/en/docs_solv.php)
- [Box/Line Reduction worked definition](https://onsudoku.com/how-to-solve-sudoku/box-line-reduction/)

The supported hint set remains: naked single, hidden single, naked pair,
pointing pair, and box-line reduction. A valid game that needs a different
technique receives a clear boundary message rather than a claim that no Sudoku
solution exists.
