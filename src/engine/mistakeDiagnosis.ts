import { boardGivens, boardValues } from './board'
import { getCandidates } from './candidates'
import { analyzeSolutions, type SolutionAnalysis } from './fullSolver'
import type { Board, CellPosition, Grid, SolutionStatus } from './types'
import { validatePuzzle } from './validatePuzzle'

export type MistakeKind = 'invalid-source-clue' | 'direct-conflict' | 'candidate-exhaustion' | 'solution-mismatch' | 'earlier-mistake' | 'clear'

export type MistakeDiagnosis = {
  kind: MistakeKind
  cells: CellPosition[]
  primaryCell?: CellPosition
  message: string
  solutionStatus: SolutionStatus
}

const samePosition = (left: CellPosition, right: CellPosition) => left.row === right.row && left.col === right.col
const cellPositions = (board: Board, predicate: (row: number, col: number) => boolean) =>
  board.flatMap((row, rowIndex) => row.flatMap((_, col) => predicate(rowIndex, col) ? [{ row: rowIndex, col }] : []))

/** Uses only validated source and solution facts; ambiguity never yields a mismatch claim. */
export const diagnoseMistake = ({ board, original = boardGivens(board), selected, solution, solutionStatus = 'unknown', sourceAnalysis: cachedSourceAnalysis }: {
  board: Board
  original?: Grid
  selected?: CellPosition | null
  solution?: Grid
  solutionStatus?: SolutionStatus
  sourceAnalysis?: SolutionAnalysis
}): MistakeDiagnosis => {
  const sourceValidation = validatePuzzle(original)
  const sourceAnalysis = cachedSourceAnalysis ?? analyzeSolutions(original)
  if (!sourceValidation.valid || sourceAnalysis.status === 'unsolvable') return {
    kind: 'invalid-source-clue', cells: sourceValidation.conflicts, primaryCell: sourceValidation.conflicts[0],
    message: sourceValidation.valid ? 'The original clues cannot form a valid Sudoku solution.' : 'Some original clues conflict with each other.', solutionStatus: sourceAnalysis.status
  }
  const values = boardValues(board)
  const conflicts = validatePuzzle(values).conflicts
  if (conflicts.length) return {
    kind: 'direct-conflict', cells: conflicts, primaryCell: selected && conflicts.some((cell) => samePosition(cell, selected)) ? selected : conflicts[0],
    message: `${conflicts.length} conflicting ${conflicts.length === 1 ? 'cell' : 'cells'} highlighted.`, solutionStatus
  }
  const exhausted = [...getCandidates(values)].flatMap(([key, candidates]) => {
    if (candidates.length) return []
    const [row, col] = key.split(':').map(Number)
    return [{ row, col }]
  })
  if (exhausted.length) return {
    kind: 'candidate-exhaustion', cells: exhausted, primaryCell: selected && exhausted.some((cell) => samePosition(cell, selected)) ? selected : exhausted[0],
    message: 'At least one empty cell has no legal candidate. An earlier value is blocking it.', solutionStatus
  }
  const trustedSolution = solutionStatus === 'unique' ? solution : undefined
  if (trustedSolution) {
    const mismatches = cellPositions(board, (row, col) => !board[row][col].given && Boolean(board[row][col].value) && board[row][col].value !== trustedSolution[row][col])
    if (selected && mismatches.some((cell) => samePosition(cell, selected))) return {
      kind: 'solution-mismatch', cells: [selected], primaryCell: selected,
      message: 'The selected value does not match this puzzle’s verified unique solution.', solutionStatus
    }
    if (mismatches.length) {
      const ordered = [...mismatches].sort((left, right) => {
        const leftSequence = board[left.row][left.col].valueEntrySequence
        const rightSequence = board[right.row][right.col].valueEntrySequence
        if (leftSequence !== undefined && rightSequence !== undefined) return leftSequence - rightSequence
        if (leftSequence !== undefined) return -1
        if (rightSequence !== undefined) return 1
        return left.row - right.row || left.col - right.col
      })
      const primaryCell = ordered[0]
      return {
        kind: 'earlier-mistake', cells: mismatches, primaryCell,
        message: board[primaryCell.row][primaryCell.col].valueEntrySequence !== undefined ? 'An earlier entered value is inconsistent with the verified solution.' : 'An entered value may be responsible; its original entry order was not saved.', solutionStatus
      }
    }
  }
  return { kind: 'clear', cells: [], message: solutionStatus === 'ambiguous' ? 'No direct conflict was found. This puzzle has multiple solutions, so exact value checking is unavailable.' : 'No mistake was found with the available checks.', solutionStatus }
}
