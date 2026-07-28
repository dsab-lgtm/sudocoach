import type { CellOrigin, CellPosition, Digit, Value } from '../engine/types'

export type { CellPosition, Digit }

export type SudokuCellPresentation = {
  value: Value
  fixed: boolean
  notes: readonly Digit[]
  candidates: readonly Digit[]
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
    scanReview: 'pending' | 'reviewed' | null
  }
}

export type SudokuBoardPresentation = {
  cells: readonly (readonly SudokuCellPresentation[])[]
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
