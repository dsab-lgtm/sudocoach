import { peersFor } from './board'
import { cloneBoard } from './board'
import { DIGITS, type Board, type CellPosition, type Digit, type Grid, type SolverStep } from './types'

export type CandidateMap = Map<string, Digit[]>
export const candidateKey = ({ row, col }: CellPosition) => `${row}:${col}`

export const candidatesFor = (grid: Grid, position: CellPosition): Digit[] => {
  if (grid[position.row][position.col]) return []
  const used = new Set(peersFor(position).map((peer) => grid[peer.row][peer.col]).filter(Boolean))
  return DIGITS.filter((digit) => !used.has(digit))
}

export const getCandidates = (grid: Grid): CandidateMap => {
  const result: CandidateMap = new Map()
  for (let row = 0; row < 9; row += 1) for (let col = 0; col < 9; col += 1) {
    if (!grid[row][col]) result.set(candidateKey({ row, col }), candidatesFor(grid, { row, col }))
  }
  return result
}

export type CandidateAudit = {
  position: CellPosition
  stale: Digit[]
}

export type CandidateCellState = {
  legal: Digit[]
  generated: Digit[]
  manual: Digit[]
  staleManual: Digit[]
  excluded: Digit[]
}

export type CandidateState = Map<string, CandidateCellState>

/**
 * Keeps pencil notes independent from assistant output. Legal candidates are
 * always recalculated from the grid, while accepted eliminations only affect
 * the generated layer.
 */
export const getCandidateState = (grid: Grid, board: Board): CandidateState => {
  const legal = getCandidates(grid)
  const state: CandidateState = new Map()
  for (let row = 0; row < 9; row += 1) for (let col = 0; col < 9; col += 1) {
    const cell = board[row][col]
    if (cell.value) continue
    const position = { row, col }
    const values = legal.get(candidateKey(position)) ?? []
    const manual = [...cell.notes]
    const staleManual = manual.filter((digit) => !values.includes(digit))
    const excluded = (cell.assistantExcluded ?? []).filter((digit) => values.includes(digit))
    state.set(candidateKey(position), {
      legal: values,
      generated: values.filter((digit) => !excluded.includes(digit)),
      manual,
      staleManual,
      excluded
    })
  }
  return state
}

export const effectiveCandidates = (state: CandidateState): CandidateMap =>
  new Map([...state].map(([key, cell]) => [key, cell.generated]))

export const auditManualNotes = (grid: Grid, board: Board): CandidateAudit[] =>
  [...getCandidateState(grid, board)].flatMap(([key, cell]) => {
    if (!cell.staleManual.length) return []
    const [row, col] = key.split(':').map(Number)
    return [{ position: { row, col }, stale: cell.staleManual }]
  })

/** Returns a new board; callers decide when this explicit cleanup is committed. */
export const removeStaleManualNotes = (grid: Grid, board: Board): Board => {
  const result = cloneBoard(board)
  for (const audit of auditManualNotes(grid, board)) {
    const cell = result[audit.position.row][audit.position.col]
    cell.notes = cell.notes.filter((digit) => !audit.stale.includes(digit))
  }
  return result
}

/** Applies only candidate-removal deductions; place-number steps remain value actions. */
export const applyAssistantElimination = (board: Board, step: SolverStep): Board => {
  if (step.action !== 'remove-candidate' || !step.removedCandidates?.length) return cloneBoard(board)
  const result = cloneBoard(board)
  for (const target of step.targetCells) {
    const cell = result[target.row][target.col]
    if (cell.value || cell.given) continue
    cell.assistantExcluded = [...new Set([...(cell.assistantExcluded ?? []), ...step.removedCandidates])].sort() as Digit[]
  }
  return result
}
