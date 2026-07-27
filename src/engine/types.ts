export const SIZE = 9 as const
export type Digit = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
export type Value = Digit | null
export type Grid = Value[][]

export type CellPosition = { row: number; col: number }
export type UnitKind = 'row' | 'column' | 'box'
export type CellOrigin = 'scan' | 'manual' | 'hint' | 'solution'

export type BoardCell = {
  given: Value
  value: Value
  notes: Digit[]
  origin?: CellOrigin
}
export type Board = BoardCell[][]

export type SolverTechnique =
  | 'naked-single'
  | 'hidden-single'
  | 'candidate-elimination'
  | 'naked-pair'
  | 'pointing-pair'
  | 'box-line-reduction'

export type HintConstraint = {
  kind: UnitKind
  index: number
  values: Digit[]
}

export type SolverStep = {
  technique: SolverTechnique
  action: 'place-number' | 'remove-candidate'
  targetCells: CellPosition[]
  supportingCells: CellPosition[]
  focusUnits: Array<{ kind: UnitKind; index: number }>
  value?: Digit
  removedCandidates?: Digit[]
  /** The candidate facts used to explain this deduction to a player. */
  evidence?: {
    targetCandidates?: Digit[]
    constraints?: HintConstraint[]
  }
  explanation: string
}

export type ValidationResult = {
  valid: boolean
  conflicts: CellPosition[]
}

export const DIGITS: Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9]
