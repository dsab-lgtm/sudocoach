import type { CellOrigin, CellPosition, Digit, Value } from '../engine/types'

export type { CellPosition, Digit }

export type BoardFeedbackKind =
  | 'value-entered'
  | 'candidate-added'
  | 'candidate-removed'
  | 'guided-change'
  | 'diagnosis'
  | 'recovered'
  | 'reapplied'

/** Ephemeral display-only feedback. It is intentionally not puzzle state. */
export type BoardFeedback = {
  id: number
  kind: BoardFeedbackKind
  cells: readonly CellPosition[]
  digits?: readonly Digit[]
}

export type SudokuCellPresentation = {
  value: Value
  fixed: boolean
  notes: readonly Digit[]
  candidates: readonly Digit[]
  candidateMarks?: readonly CandidateMark[]
  origin?: CellOrigin
  state: {
    selected: boolean
    related: boolean
    matching: boolean
    hintTarget: boolean
    hintSupporting: boolean
    hintUnit: boolean
    hintRevealed: boolean
    removedCandidates: readonly Digit[]
    invalid: boolean
    lowConfidence: boolean
    scanCorrected: boolean
    scanAdded: boolean
    scanReview: 'pending' | 'reviewed' | 'scanned' | 'needs-review' | 'confirmed' | null
  }
}

export type CandidateMark = {
  digit: Digit
  source: 'manual' | 'generated' | 'stale' | 'removed'
}

export type SudokuBoardPresentation = {
  cells: readonly (readonly SudokuCellPresentation[])[]
  feedback?: BoardFeedback | null
}

export type SudokuBoardInteractions = {
  onSelect: (position: CellPosition) => void
  onEnterDigit: (position: CellPosition, digit: Digit) => void
  onToggleCandidate: (position: CellPosition, digit: Digit) => void
  onErase: (position: CellPosition) => void
  onToggleNotes?: () => void
}

export type NumberPadAllowedActions = {
  canEnterValue: boolean
  canErase: boolean
  canToggleNotes: boolean
}

export type NumberPadInteractions = {
  onValueEntry: (digit: Digit) => void
  onErase: () => void
  onToggleNotes?: () => void
}
