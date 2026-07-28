import { createBoard, emptyGrid } from './board'
import { applyAssistantElimination, auditManualNotes, effectiveCandidates, getCandidateState, removeStaleManualNotes } from './candidates'
import type { SolverStep } from './types'
import { describe, expect, it } from 'vitest'

const removal: SolverStep = {
  technique: 'naked-pair', action: 'remove-candidate', targetCells: [{ row: 0, col: 2 }], supportingCells: [{ row: 0, col: 0 }, { row: 0, col: 1 }], focusUnits: [{ kind: 'row', index: 0 }], removedCandidates: [1, 2], explanation: 'Remove pair.'
}

describe('candidate assistant state', () => {
  it('audits stale manual notes without changing them until cleanup is explicit', () => {
    const grid = emptyGrid()
    grid[0][1] = 4
    const board = createBoard(grid)
    board[0][0].notes = [4, 7]

    expect(auditManualNotes(grid, board)).toEqual([{ position: { row: 0, col: 0 }, stale: [4] }])
    expect(board[0][0].notes).toEqual([4, 7])
    expect(removeStaleManualNotes(grid, board)[0][0].notes).toEqual([7])
  })

  it('keeps manual notes separate while an explained elimination changes only generated candidates', () => {
    const board = createBoard(emptyGrid())
    board[0][2].notes = [1]
    const updated = applyAssistantElimination(board, removal)
    const state = getCandidateState(emptyGrid(), updated).get('0:2')

    expect(updated[0][2].notes).toEqual([1])
    expect(updated[0][2].assistantExcluded).toEqual([1, 2])
    expect(state?.manual).toEqual([1])
    expect(effectiveCandidates(getCandidateState(emptyGrid(), updated)).get('0:2')).not.toContain(1)
  })
})
