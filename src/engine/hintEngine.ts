import { boardGivens, boardValues } from './board'
import { getCandidates, type CandidateMap } from './candidates'
import { analyzeSolutions, type SolutionAnalysis } from './fullSolver'
import { getNextLogicalStep } from './logicalSolver'
import { diagnoseMistake, type MistakeDiagnosis } from './mistakeDiagnosis'
import type { Board, Grid, SolutionStatus, SolverStep } from './types'
import { isComplete } from './validatePuzzle'

export type HintOutcome =
  | { kind: 'step'; step: SolverStep }
  | { kind: 'recovery'; diagnosis: MistakeDiagnosis }
  | { kind: 'complete' }
  | { kind: 'technique-limit' }

type HintContext = {
  board: Board
  original?: Grid
  solution?: Grid
  solutionStatus?: SolutionStatus
  candidateMap?: CandidateMap
}

const stepMatchesSolution = (step: SolverStep, solution: Grid) => {
  if (step.action === 'place-number') {
    const target = step.targetCells[0]
    return Boolean(target && step.targetCells.length === 1 && step.value === solution[target.row][target.col])
  }
  return step.targetCells.every((target) => {
    const solvedValue = solution[target.row][target.col]
    return Boolean(solvedValue && step.removedCandidates?.length && !step.removedCandidates.includes(solvedValue))
  })
}

/**
 * Produces only safe player-facing guidance. A verified solution is a private
 * guard against a legal-looking wrong branch; it is never included in the outcome.
 */
export const getHintOutcome = ({ board, original = boardGivens(board), solution, solutionStatus = 'unknown', candidateMap }: HintContext): HintOutcome => {
  const sourceAnalysis: SolutionAnalysis = solutionStatus === 'unknown'
    ? analyzeSolutions(original)
    : solutionStatus === 'unique' ? { status: 'unique', solution }
      : { status: solutionStatus }
  const trustedSolution = sourceAnalysis.status === 'unique' ? solution ?? sourceAnalysis.solution : undefined
  const diagnosis = diagnoseMistake({ board, original, solution: trustedSolution, solutionStatus: sourceAnalysis.status, sourceAnalysis })
  if (diagnosis.kind !== 'clear') return { kind: 'recovery', diagnosis }

  const values = boardValues(board)
  if (isComplete(values)) return { kind: 'complete' }

  const proposed = getNextLogicalStep(values, candidateMap)
  if (!proposed) return { kind: 'technique-limit' }
  if (!trustedSolution || stepMatchesSolution(proposed, trustedSolution)) return { kind: 'step', step: proposed }

  // Candidate removals are a derived layer. If an old removal ever becomes unsafe,
  // ignore that layer and offer only a fresh legal deduction.
  const fresh = getNextLogicalStep(values, getCandidates(values))
  if (fresh && stepMatchesSolution(fresh, trustedSolution)) return { kind: 'step', step: fresh }
  return { kind: 'technique-limit' }
}
