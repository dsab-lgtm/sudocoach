import { type ChangeEvent, type KeyboardEvent, useMemo, useRef } from 'react'
import { candidateKey, getCandidates } from '../engine/candidates'
import { boxIndex, isSamePosition } from '../engine/board'
import { validatePuzzle } from '../engine/validatePuzzle'
import { usePuzzleStore } from '../store/puzzleStore'
import type { CellPosition, Digit, SolverStep, UnitKind } from '../engine/types'

type Props = {
  readOnly?: boolean
  step?: SolverStep | null
  notesMode?: boolean
  onToggleNotes?: () => void
  /** Use real number inputs so touch devices open their native numeric keyboard. */
  nativeNumericInput?: boolean
  /** Controls whether entering a digit moves real DOM focus to the next cell. */
  autoAdvance?: boolean
  /** Calculated candidates are available to hints, but are opt-in visually. */
  showCandidates?: boolean
  /** Detected clues that need visual verification during scan review. */
  lowConfidenceCells?: readonly CellPosition[]
  /** Optional scan-review state; resolution is deliberately explicit in the parent UI. */
  scanReview?: { pending: readonly CellPosition[]; reviewed: readonly CellPosition[] }
}

const isInUnit = (position: CellPosition, kind: UnitKind, index: number) =>
  kind === 'row' ? position.row === index : kind === 'column' ? position.col === index : boxIndex(position) === index

export function SudokuBoard({ readOnly = false, step, notesMode = false, onToggleNotes, nativeNumericInput = false, autoAdvance = true, showCandidates = false, lowConfidenceCells = [], scanReview }: Props) {
  const board = usePuzzleStore((state) => state.board)
  const selected = usePuzzleStore((state) => state.selected)
  const select = usePuzzleStore((state) => state.select)
  const setValue = usePuzzleStore((state) => state.setValue)
  const toggleNote = usePuzzleStore((state) => state.toggleNote)
  const cellRefs = useRef<Array<HTMLElement | null>>([])
  const conflicts = useMemo(() => validatePuzzle(board.map((row) => row.map((cell) => cell.value))).conflicts, [board])
  const candidates = useMemo(() => getCandidates(board.map((row) => row.map((cell) => cell.value))), [board])
  const focused = selected ?? { row: 0, col: 0 }
  const focusCell = (position: CellPosition) => {
    select(position)
    const element = cellRefs.current[position.row * 9 + position.col]
    if (!element) return
    try { element.focus({ preventScroll: true }) } catch { element.focus() }
  }
  const move = (position: CellPosition, rowDelta: number, colDelta: number) =>
    focusCell({ row: (position.row + rowDelta + 9) % 9, col: (position.col + colDelta + 9) % 9 })
  const advance = (position: CellPosition) =>
    focusCell({ row: position.col === 8 ? (position.row + 1) % 9 : position.row, col: (position.col + 1) % 9 })
  const isTarget = (position: CellPosition) => Boolean(step?.targetCells.some((cell) => isSamePosition(cell, position)))
  const isSupporting = (position: CellPosition) => Boolean(step?.supportingCells.some((cell) => isSamePosition(cell, position)))
  const isFocusedUnit = (position: CellPosition) => Boolean(step?.focusUnits.some((unit) => isInUnit(position, unit.kind, unit.index)))
  const onKeyDown = (position: CellPosition, event: KeyboardEvent<HTMLElement>) => {
    const arrows: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }
    if (arrows[event.key]) { event.preventDefault(); move(position, ...arrows[event.key]); return }
    if (event.key.toLowerCase() === 'n') { event.preventDefault(); onToggleNotes?.(); return }
    const keypadDigit = /^Numpad([1-9])$/.exec(event.code)?.[1]
    const digit = /^[1-9]$/.test(event.key) ? event.key : keypadDigit
    const cell = board[position.row][position.col]
    if (digit) {
      event.preventDefault()
      if (cell.given) return
      if (notesMode) toggleNote(position, Number(digit) as Digit); else { setValue(position, Number(digit) as Digit); if (autoAdvance) advance(position) }
      return
    }
    if (event.key === '0' || event.code === 'Numpad0' || event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault()
      if (!cell.given) setValue(position, null)
    }
  }

  const onNativeInput = (position: CellPosition, event: ChangeEvent<HTMLInputElement>) => {
    const entered = event.currentTarget.value.slice(-1)
    if (!entered) {
      setValue(position, null)
      return
    }
    if (!/^[1-9]$/.test(entered)) return
    setValue(position, Number(entered) as Digit)
    if (autoAdvance) advance(position)
  }

  return <div className="board" role="grid" aria-label="Sudoku puzzle">
    {board.flatMap((row, rowIndex) => row.map((cell, col) => {
      const position = { row: rowIndex, col }
      const conflict = conflicts.some((item) => isSamePosition(item, position))
      const value = cell.value
      const target = isTarget(position)
      const supporting = isSupporting(position)
      const lowConfidence = cell.origin === 'scan' && lowConfidenceCells.some((item) => isSamePosition(item, position))
      const pendingReview = scanReview?.pending.some((item) => isSamePosition(item, position))
      const reviewedScan = scanReview?.reviewed.some((item) => isSamePosition(item, position))
      const reviewLabel = pendingReview ? ', scan review pending' : reviewedScan ? ', scan reviewed' : ''
      const hintLabel = target ? ', hint target' : supporting ? ', hint supporting cell' : isFocusedUnit(position) ? ', in the highlighted hint unit' : ''
      const label = `Row ${rowIndex + 1}, column ${col + 1}${value ? `: ${value}` : ', empty'}${hintLabel}${reviewLabel}`
      const className = [
        'board-cell', cell.given ? 'is-given' : '', cell.origin === 'solution' ? 'is-solution' : '', cell.origin === 'hint' ? 'is-hint' : '', isSamePosition(focused, position) ? 'is-selected' : '', conflict ? 'is-conflict' : '', isFocusedUnit(position) ? 'is-hint-unit' : '', supporting ? 'is-hint-supporting' : '', target ? 'is-hint-target' : '', target && step?.action === 'place-number' ? 'is-hint-revealed' : '', cell.origin === 'scan' ? 'is-scan' : '', lowConfidence ? 'is-low-confidence' : '', pendingReview ? 'is-scan-pending' : '', reviewedScan ? 'is-scan-reviewed' : ''
      ].filter(Boolean).join(' ')
      const notes = cell.notes.length ? cell.notes : (showCandidates ? candidates.get(candidateKey(position)) ?? [] : [])
      const content = value ? <span>{value}</span> : notes.length ? <span className="notes" aria-hidden="true">{notes.map((note) => <i className={step?.action === 'remove-candidate' && step.removedCandidates?.includes(note) && target ? 'is-removed-candidate' : ''} key={note}>{note}</i>)}</span> : null

      if (nativeNumericInput) {
        return <label key={`${rowIndex}-${col}`} className={className}>
          <input
            ref={(element) => { cellRefs.current[rowIndex * 9 + col] = element }}
            role="gridcell"
            className={`native-board-input ${className}`}
            aria-label={`Enter digit for ${label}`}
            aria-selected={isSamePosition(focused, position)}
            disabled={readOnly || Boolean(cell.given)}
            inputMode="numeric"
            pattern="[1-9]*"
            tabIndex={isSamePosition(focused, position) ? 0 : -1}
            type="tel"
            value={value ?? ''}
            onFocus={() => select(position)}
            onKeyDown={(event) => onKeyDown(position, event)}
            onChange={(event) => onNativeInput(position, event)}
          />
          {content}{target && <span className="hint-cell-marker" aria-hidden="true">Hint</span>}{reviewedScan && <span className="scan-check" aria-hidden="true">✓</span>}
        </label>
      }

      return <button key={`${rowIndex}-${col}`} type="button" role="gridcell" ref={(element) => { cellRefs.current[rowIndex * 9 + col] = element }} disabled={readOnly} onClick={() => select(position)} onKeyDown={(event) => onKeyDown(position, event)} tabIndex={isSamePosition(focused, position) ? 0 : -1} aria-selected={isSamePosition(focused, position)} aria-label={label} className={className}>
        {content}{target && <span className="hint-cell-marker" aria-hidden="true">Hint</span>}{reviewedScan && <span className="scan-check" aria-hidden="true">✓</span>}
      </button>
    }))}
  </div>
}
