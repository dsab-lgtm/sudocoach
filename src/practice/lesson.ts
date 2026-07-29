import type { SudokuBoardPresentation } from '../components/puzzleViewTypes'
import { boardValues, boxIndex, isSamePosition } from '../engine/board'
import { getCandidateState } from '../engine/candidates'
import type { Board, CellPosition, Digit, SolverStep, UnitKind } from '../engine/types'

/** The learner moves from seeing the board to seeing the proof, then may reveal the answer. */
export type PracticeClueStage = 0 | 1 | 2 | 3

type TeachingCopy = {
  invariant: string
  observation: string
  proof: (lesson: PracticeLessonStep) => string
  completion: string
  nextScan: string
}

export type PracticeLessonStep = {
  step: SolverStep
  targets: readonly CellPosition[]
  targetTotal: number
  methodName: string
  teaching: TeachingCopy
  unitLabels: readonly string[]
  hasCandidatePrimer: boolean
}

const positionKey = ({ row, col }: CellPosition) => `${row}:${col}`
const unitContains = (position: CellPosition, kind: UnitKind, index: number) =>
  kind === 'row' ? position.row === index : kind === 'column' ? position.col === index : boxIndex(position) === index

export const positionName = ({ row, col }: CellPosition) => `R${row + 1}C${col + 1}`

const unitName = ({ kind, index }: SolverStep['focusUnits'][number]) => kind === 'row' ? `Row ${index + 1}` : kind === 'column' ? `Column ${index + 1}` : `Box ${index + 1}`
const digits = (step: SolverStep) => step.action === 'place-number' ? (step.value ? `${step.value}` : 'this digit') : (step.removedCandidates ?? []).join(' and ')
const positions = (cells: readonly CellPosition[]) => cells.map(positionName).join(', ')

const teachingCopy: Record<PracticeLessonStep['step']['technique'], Omit<TeachingCopy, 'proof'>> & {
  [key: string]: Omit<TeachingCopy, 'proof'>
} = {
  'naked-single': {
    invariant: 'A naked single is a cell with only one legal candidate.',
    observation: 'Start with the values. One empty cell has been reduced to a single possibility.',
    completion: 'That cell is now solved because no other candidate can fit there.',
    nextScan: 'Scan nearby cells for another single remaining candidate.'
  },
  'hidden-single': {
    invariant: 'A hidden single is a digit with only one possible home in a unit.',
    observation: 'Start with the values. In one unit, a needed digit has only one home.',
    completion: 'That digit now has its required home in the highlighted unit.',
    nextScan: 'Look for another digit that appears in only one candidate position in a unit.'
  },
  'naked-pair': {
    invariant: 'A naked pair is two cells containing the same two candidates, so those digits leave every other cell in the unit.',
    observation: 'These small numbers are candidates: numbers that could still fit in an empty cell.',
    completion: 'The pair reserves those digits, so they have been removed from every other affected cell.',
    nextScan: 'Scan the unit again: an elimination may now expose a single or another pair.'
  },
  'pointing-pair': {
    invariant: 'A pointing pair confines a digit to one line inside a box, so that digit leaves the rest of the line.',
    observation: 'Follow one candidate from a box into its shared row or column.',
    completion: 'That digit is locked inside the box on one line, so it cannot appear elsewhere on that line.',
    nextScan: 'Check the affected line for a new single or a newly locked candidate.'
  },
  'box-line-reduction': {
    invariant: 'Box-line reduction confines a digit to one box along a line, so that digit leaves the other cells of the box.',
    observation: 'Follow one candidate from a line into its shared box.',
    completion: 'That digit is locked to the line within this box, so it cannot appear in the other box cells.',
    nextScan: 'Check the affected box for a new single or another candidate pattern.'
  },
  'candidate-elimination': {
    invariant: 'This pattern removes candidates without placing a digit yet.',
    observation: 'Study the highlighted units and candidate positions.',
    completion: 'The candidate removals make the puzzle more constrained.',
    nextScan: 'Look again for a forced placement.'
  }
}

const methodNames: Record<SolverStep['technique'], string> = {
  'naked-single': 'Naked single',
  'hidden-single': 'Hidden single',
  'naked-pair': 'Naked pair',
  'pointing-pair': 'Pointing pair',
  'box-line-reduction': 'Box-line reduction',
  'candidate-elimination': 'Candidate elimination'
}

const proofCopy = (step: SolverStep, unitLabels: readonly string[]) => {
  const unitText = unitLabels.join(' and ')
  if (step.technique === 'naked-single') return 'Only one candidate remains in one cell. Which cell must receive it?'
  if (step.technique === 'hidden-single') return `In ${unitText}, where can ${digits(step)} still go?`
  if (step.technique === 'naked-pair') return `The two outlined cells reserve ${digits(step)}. Which other cells in the unit must lose those candidates?`
  if (step.technique === 'pointing-pair') return `${digits(step)} is confined to the outlined positions in the box. Which cells on the shared line must lose it?`
  if (step.technique === 'box-line-reduction') return `${digits(step)} is confined to the outlined positions on the line. Which other cells in the box must lose it?`
  return 'Use the visible candidates to find the consequence of this pattern.'
}

/** Builds a teaching model from the existing deterministic solver step; it never changes puzzle state. */
export const lessonFor = (step: SolverStep): PracticeLessonStep => {
  const copy = teachingCopy[step.technique]
  const unitLabels = step.focusUnits.map(unitName)
  return {
    step,
    targets: step.targetCells,
    targetTotal: step.targetCells.length,
    methodName: methodNames[step.technique],
    teaching: { ...copy, proof: () => proofCopy(step, unitLabels) },
    unitLabels,
    hasCandidatePrimer: step.technique === 'naked-pair'
  }
}

export const practiceTask = (lesson: PracticeLessonStep, clueStage: PracticeClueStage) => {
  if (clueStage < 2) return 'Follow the clues to build the proof before checking your conclusion.'
  if (lesson.step.action === 'place-number') return `Which cell must receive ${digits(lesson.step)}?`
  return `Select every cell where ${digits(lesson.step)} can no longer stay.`
}

export const practiceClue = (lesson: PracticeLessonStep, stage: PracticeClueStage) => {
  if (stage === 0) return lesson.teaching.observation
  if (stage === 1) return `Study ${lesson.unitLabels.join(' and ')}. These are the units that establish the pattern.`
  if (stage === 2) return lesson.teaching.proof(lesson)
  const action = lesson.step.action === 'place-number'
    ? `${digits(lesson.step)} goes in ${positions(lesson.targets)}.`
    : `Remove ${digits(lesson.step)} from ${positions(lesson.targets)}.`
  return `Answer revealed: ${action}`
}

const evidenceDigits = (lesson: PracticeLessonStep, position: CellPosition): Digit[] => {
  const { step } = lesson
  if (step.action === 'place-number') {
    if (step.technique === 'hidden-single') return step.value && step.focusUnits.some((unit) => unitContains(position, unit.kind, unit.index)) ? [step.value] : []
    return lesson.targets.some((target) => isSamePosition(position, target)) ? step.evidence?.targetCandidates ?? (step.value ? [step.value] : []) : []
  }
  const relevant = lesson.targets.some((target) => isSamePosition(target, position)) || step.supportingCells.some((cell) => isSamePosition(cell, position))
  return relevant ? step.removedCandidates ?? [] : []
}

/** Creates a focused, display-only board for the lesson without touching puzzle state. */
export const practicePresentation = ({ board, selected, lesson, clueStage }: {
  board: Board
  selected: CellPosition
  lesson: PracticeLessonStep
  clueStage: PracticeClueStage
}): SudokuBoardPresentation => {
  const values = boardValues(board)
  const candidates = getCandidateState(values, board)
  const { step } = lesson
  const proofVisible = clueStage >= 2
  const answerRevealed = clueStage === 3
  return {
    cells: board.map((row, rowIndex) => row.map((cell, col) => {
      const position = { row: rowIndex, col }
      const candidate = candidates.get(positionKey(position))
      const relevant = evidenceDigits(lesson, position)
      const removed = candidate?.excluded ?? []
      const shown = proofVisible ? relevant.filter((digit) => candidate?.generated.includes(digit)) : []
      const candidateMarks = [...shown.map((digit) => ({ digit, source: 'generated' as const })), ...removed.map((digit) => ({ digit, source: 'removed' as const }))]
      const inFocus = clueStage >= 1 && step.focusUnits.some((unit) => unitContains(position, unit.kind, unit.index))
      const supporting = proofVisible && step.supportingCells.some((cell) => isSamePosition(cell, position))
      const hintTarget = answerRevealed && lesson.targets.some((target) => isSamePosition(position, target))
      return {
        value: cell.value,
        fixed: Boolean(cell.given),
        notes: [],
        candidates: [],
        candidateMarks,
        origin: cell.origin,
        state: {
          selected: isSamePosition(selected, position),
          related: false,
          matching: false,
          hintTarget,
          hintSupporting: supporting,
          hintUnit: inFocus,
          hintRevealed: Boolean(cell.value && cell.origin === 'hint'),
          removedCandidates: removed,
          invalid: false,
          lowConfidence: false,
          scanCorrected: false,
          scanReview: null
        }
      }
    }))
  }
}
