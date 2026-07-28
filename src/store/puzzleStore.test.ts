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

  it('preserves manual notes through value entry and makes cleanup undoable', () => {
    usePuzzleStore.getState().setPuzzle(emptyGrid())
    usePuzzleStore.getState().toggleNote({ row: 0, col: 0 }, 4)
    usePuzzleStore.getState().setValue({ row: 0, col: 0 }, 5)
    expect(usePuzzleStore.getState().board[0][0].notes).toEqual([4])
    usePuzzleStore.getState().setValue({ row: 0, col: 0 }, null)
    usePuzzleStore.getState().setValue({ row: 0, col: 1 }, 4)
    expect(usePuzzleStore.getState().cleanupManualNotes()).toBe(1)
    expect(usePuzzleStore.getState().board[0][0].notes).toEqual([])
    usePuzzleStore.getState().undoMove()
    expect(usePuzzleStore.getState().board[0][0].notes).toEqual([4])
  })

  it('records an accepted candidate elimination separately from manual notes', () => {
    usePuzzleStore.getState().setPuzzle(emptyGrid())
    usePuzzleStore.getState().toggleNote({ row: 0, col: 2 }, 1)
    usePuzzleStore.getState().applyStep(eliminationStep)
    expect(usePuzzleStore.getState().board[0][2].notes).toEqual([1])
    expect(usePuzzleStore.getState().board[0][2].assistantExcluded).toEqual([1, 2])
    usePuzzleStore.getState().undoMove()
    expect(usePuzzleStore.getState().board[0][2].assistantExcluded).toEqual([])
  })
})
