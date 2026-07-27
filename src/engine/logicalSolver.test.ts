import { describe, expect, it } from 'vitest'
import { getNextLogicalStep } from './logicalSolver'
import { photographedPuzzle } from '../test/fixtures/photographedPuzzle'

describe('getNextLogicalStep', () => {
  it('explains the photographed puzzle’s first naked single with row, column, and box evidence', () => {
    const step = getNextLogicalStep(photographedPuzzle)

    expect(step).toMatchObject({
      technique: 'naked-single',
      action: 'place-number',
      value: 9,
      targetCells: [{ row: 8, col: 4 }],
      evidence: {
        targetCandidates: [9],
        constraints: [
          { kind: 'row', index: 8, values: [4, 1, 8] },
          { kind: 'column', index: 4, values: [2, 5, 6] },
          { kind: 'box', index: 7, values: [3, 6, 5, 7, 1] }
        ]
      }
    })
  })

  it('returns the same scored logical move for repeated calls without changing the board', () => {
    const before = photographedPuzzle.map((row) => [...row])
    expect(getNextLogicalStep(photographedPuzzle)).toEqual(getNextLogicalStep(photographedPuzzle))
    expect(photographedPuzzle).toEqual(before)
  })
})
