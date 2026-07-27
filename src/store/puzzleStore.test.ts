import { describe, expect, it } from 'vitest'
import { boardValues, emptyGrid } from '../engine/board'
import type { SolverStep } from '../engine/types'
import { usePuzzleStore } from './puzzleStore'

const eliminationStep: SolverStep = {
  technique: 'naked-pair', action: 'remove-candidate', targetCells: [{ row: 0, col: 2 }], supportingCells: [{ row: 0, col: 0 }, { row: 0, col: 1 }], focusUnits: [{ kind: 'row', index: 0 }], removedCandidates: [1, 2], explanation: 'Test elimination.'
}

describe('puzzleStore hint application', () => {
  it('records an elimination hint without changing any board values', () => {
    usePuzzleStore.getState().setPuzzle(emptyGrid())
    const before = boardValues(usePuzzleStore.getState().board)
    usePuzzleStore.getState().applyStep(eliminationStep)
    expect(boardValues(usePuzzleStore.getState().board)).toEqual(before)
    expect(usePuzzleStore.getState().hintHistory).toEqual([eliminationStep])
  })
})
