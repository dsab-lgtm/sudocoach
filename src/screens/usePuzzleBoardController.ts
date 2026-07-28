import { useMemo } from 'react'
import { getCandidates } from '../engine/candidates'
import { boardValues, boxIndex, isSamePosition, peersFor } from '../engine/board'
import type { CellPosition, Digit, SolverStep, UnitKind } from '../engine/types'
import { validatePuzzle } from '../engine/validatePuzzle'
import type { NumberPadAllowedActions, NumberPadInteractions, SudokuBoardInteractions, SudokuBoardPresentation } from '../components/puzzleViewTypes'
import { usePuzzleStore } from '../store/puzzleStore'

type ScanReviewPresentation = {
  corrected?: readonly CellPosition[]
  pending: readonly CellPosition[]
  reviewed: readonly CellPosition[]
}

type Options = {
  notesMode: boolean
  hintStep?: SolverStep | null
  lowConfidenceCells?: readonly CellPosition[]
  scanReview?: ScanReviewPresentation
}

const initialPosition = { row: 0, col: 0 }
const positionKey = ({ row, col }: CellPosition) => `${row}:${col}`
const positionSet = (positions: readonly CellPosition[]) => new Set(positions.map(positionKey))
const isInUnit = (position: CellPosition, kind: UnitKind, index: number) =>
  kind === 'row' ? position.row === index : kind === 'column' ? position.col === index : boxIndex(position) === index

/**
 * Adapts persisted puzzle state into the interaction and presentation data
 * consumed by the store-free puzzle views.
 */
export function usePuzzleBoardController({ notesMode, hintStep = null, lowConfidenceCells = [], scanReview }: Options) {
  const board = usePuzzleStore((state) => state.board)
  const selected = usePuzzleStore((state) => state.selected)
  const select = usePuzzleStore((state) => state.select)
  const setValue = usePuzzleStore((state) => state.setValue)
  const toggleNote = usePuzzleStore((state) => state.toggleNote)
  const values = useMemo(() => boardValues(board), [board])
  const candidates = useMemo(() => getCandidates(values), [values])
  const conflicts = useMemo(() => positionSet(validatePuzzle(values).conflicts), [values])
  const focused = selected ?? initialPosition
  const related = useMemo(() => selected ? positionSet(peersFor(selected)) : new Set<string>(), [selected])
  const matching = useMemo(() => {
    if (!selected) return new Set<string>()
    const value = values[selected.row][selected.col]
    if (!value) return new Set<string>()
    return new Set(values.flatMap((row, rowIndex) => row.flatMap((cell, col) => cell === value ? [positionKey({ row: rowIndex, col })] : [])))
  }, [selected, values])
  const lowConfidence = useMemo(() => positionSet(lowConfidenceCells), [lowConfidenceCells])
  const pendingReview = useMemo(() => positionSet(scanReview?.pending ?? []), [scanReview])
  const reviewedReview = useMemo(() => positionSet(scanReview?.reviewed ?? []), [scanReview])
  const correctedReview = useMemo(() => positionSet(scanReview?.corrected ?? []), [scanReview])

  const presentation = useMemo<SudokuBoardPresentation>(() => ({
    cells: board.map((row, rowIndex) => row.map((cell, col) => {
      const position = { row: rowIndex, col }
      const key = positionKey(position)
      const hintTarget = Boolean(hintStep?.targetCells.some((item) => isSamePosition(item, position)))
      return {
        value: cell.value,
        fixed: Boolean(cell.given),
        notes: cell.notes,
        candidates: candidates.get(key) ?? [],
        origin: cell.origin,
        state: {
          selected: isSamePosition(focused, position),
          related: related.has(key),
          matching: matching.has(key),
          hintTarget,
          hintSupporting: Boolean(hintStep?.supportingCells.some((item) => isSamePosition(item, position))),
          hintUnit: Boolean(hintStep?.focusUnits.some((unit) => isInUnit(position, unit.kind, unit.index))),
          hintRevealed: hintTarget && hintStep?.action === 'place-number',
          removedCandidates: hintTarget && hintStep?.action === 'remove-candidate' ? hintStep.removedCandidates ?? [] : [],
          invalid: conflicts.has(key),
          lowConfidence: lowConfidence.has(key),
          scanCorrected: correctedReview.has(key),
          scanReview: pendingReview.has(key) ? 'pending' : reviewedReview.has(key) ? 'reviewed' : null
        }
      }
    }))
  }), [board, candidates, conflicts, correctedReview, focused, hintStep, lowConfidence, matching, pendingReview, related, reviewedReview])

  const onEnterDigit = (position: CellPosition, digit: Digit) => {
    if (board[position.row][position.col].given) return
    setValue(position, digit)
  }
  const onToggleCandidate = (position: CellPosition, digit: Digit) => {
    if (board[position.row][position.col].given) return
    toggleNote(position, digit)
  }
  const onErase = (position: CellPosition) => {
    if (board[position.row][position.col].given) return
    setValue(position, null)
  }
  const boardInteractions: SudokuBoardInteractions = {
    onSelect: select,
    onEnterDigit,
    onToggleCandidate,
    onErase
  }
  const isKeypadDisabled = !selected || Boolean(board[selected?.row ?? 0][selected?.col ?? 0].given)
  const allowedActions: NumberPadAllowedActions = {
    canEnterValue: !isKeypadDisabled,
    canErase: !isKeypadDisabled,
    canToggleNotes: true
  }
  const numberPadInteractions: NumberPadInteractions = {
    onValueEntry: (digit) => {
      if (!selected) return
      if (notesMode) onToggleCandidate(selected, digit); else onEnterDigit(selected, digit)
    },
    onErase: () => { if (selected) onErase(selected) }
  }

  return { board, selected, presentation, boardInteractions, isKeypadDisabled, allowedActions, numberPadInteractions }
}
