import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { SudokuBoardInteractions, SudokuBoardPresentation, SudokuCellPresentation } from './puzzleViewTypes'
import { SudokuBoard } from './SudokuBoard'

type CellOverride = Partial<Omit<SudokuCellPresentation, 'state'>> & {
  state?: Partial<SudokuCellPresentation['state']>
}

const cell = (row: number, column: number) => screen.getByRole('gridcell', { name: new RegExp(`Row ${row}, column ${column}`) })

const baseCell = (): SudokuCellPresentation => ({
  value: null,
  fixed: false,
  notes: [],
  candidates: [],
  state: {
    selected: false,
    related: false,
    matching: false,
    hintTarget: false,
    hintSupporting: false,
    hintUnit: false,
    hintRevealed: false,
    removedCandidates: [],
    invalid: false,
    lowConfidence: false,
    scanCorrected: false,
    scanReview: null
  }
})

const presentation = (overrides: Record<string, CellOverride> = {}): SudokuBoardPresentation => ({
  cells: Array.from({ length: 9 }, (_, row) => Array.from({ length: 9 }, (_, col) => {
    const override = overrides[`${row}:${col}`]
    const base = baseCell()
    return { ...base, ...override, state: { ...base.state, ...override?.state } }
  }))
})

const interactions = (): SudokuBoardInteractions => ({
  onSelect: vi.fn(),
  onEnterDigit: vi.fn(),
  onToggleCandidate: vi.fn(),
  onErase: vi.fn(),
  onToggleNotes: vi.fn()
})

describe('SudokuBoard keyboard controls', () => {
  it('wraps arrow navigation, moves DOM focus, and requests selection', () => {
    const controls = interactions()
    render(<SudokuBoard presentation={presentation({ '0:0': { state: { selected: true } } })} interactions={controls}/>)
    const first = cell(1, 1)
    first.focus()
    fireEvent.keyDown(first, { key: 'ArrowLeft' })
    expect(cell(1, 9)).toHaveFocus()
    expect(controls.onSelect).toHaveBeenLastCalledWith({ row: 0, col: 8 })
    fireEvent.keyDown(cell(1, 9), { key: 'ArrowUp' })
    expect(cell(9, 9)).toHaveFocus()
  })

  it('sends keyboard digits through the value callback and carries focus into the next row', () => {
    const controls = interactions()
    render(<SudokuBoard presentation={presentation({ '0:8': { state: { selected: true } } })} interactions={controls}/>)
    const finalColumn = cell(1, 9)
    finalColumn.focus()
    fireEvent.keyDown(finalColumn, { key: '4', code: 'Numpad4' })
    expect(controls.onEnterDigit).toHaveBeenCalledWith({ row: 0, col: 8 }, 4)
    expect(cell(2, 1)).toHaveFocus()
  })

  it('routes candidate, note-mode, and erase keys through explicit callbacks', () => {
    const controls = interactions()
    render(<SudokuBoard presentation={presentation({ '0:0': { state: { selected: true } } })} interactions={controls} notesMode/>)
    const first = cell(1, 1)
    first.focus()
    fireEvent.keyDown(first, { key: '5' })
    expect(controls.onToggleCandidate).toHaveBeenCalledWith({ row: 0, col: 0 }, 5)
    fireEvent.keyDown(first, { key: 'n' })
    expect(controls.onToggleNotes).toHaveBeenCalledOnce()
    fireEvent.keyDown(first, { key: 'Delete' })
    expect(controls.onErase).toHaveBeenCalledWith({ row: 0, col: 0 })
    expect(first).toHaveFocus()
  })

  it('does not send edit callbacks for fixed clues', () => {
    const controls = interactions()
    render(<SudokuBoard presentation={presentation({ '0:0': { value: 7, fixed: true, state: { selected: true } } })} interactions={controls}/>)
    const given = cell(1, 1)
    given.focus()
    fireEvent.keyDown(given, { key: '3' })
    fireEvent.keyDown(given, { key: 'Delete' })
    expect(controls.onEnterDigit).not.toHaveBeenCalled()
    expect(controls.onErase).not.toHaveBeenCalled()
    expect(given).toHaveFocus()
  })

  it('renders supplied hint states and removed candidates without deriving engine state', () => {
    const { container } = render(<SudokuBoard presentation={presentation({
      '0:0': { notes: [1, 2], state: { selected: true, hintTarget: true, hintUnit: true, removedCandidates: [1, 2] } },
      '0:1': { state: { related: true, matching: true, hintSupporting: true, hintUnit: true } }
    })} interactions={interactions()}/>)
    expect(cell(1, 1)).toHaveClass('is-hint-target', 'is-hint-unit')
    expect(cell(1, 2)).toHaveClass('is-related', 'is-matching', 'is-hint-supporting', 'is-hint-unit')
    expect(cell(2, 1)).not.toHaveClass('is-hint-unit')
    expect(container.querySelectorAll('.is-removed-candidate')).toHaveLength(2)
  })

  it('renders controller-supplied candidates only when requested', () => {
    render(<SudokuBoard presentation={presentation({ '0:0': { candidates: [2, 8], state: { selected: true } } })} interactions={interactions()} showCandidates/>)
    expect(cell(1, 1)).toHaveAccessibleName('Row 1, column 1, empty, editable, candidate values 2, 8')
  })

  it('uses stable native numeric inputs without advancing focus when configured', () => {
    const controls = interactions()
    const { container } = render(<SudokuBoard presentation={presentation({ '0:0': { state: { selected: true } } })} interactions={controls} nativeNumericInput autoAdvance={false} showCandidates={false}/>)
    const input = screen.getByLabelText('Enter digit for Row 1, column 1, empty, editable')
    expect(input).toHaveAttribute('inputmode', 'numeric')
    expect(input).toHaveAttribute('type', 'tel')
    expect(container.querySelector('.board-cell-input')).toBeNull()
    act(() => input.focus())
    fireEvent.change(input, { target: { value: '6' } })
    expect(controls.onEnterDigit).toHaveBeenCalledWith({ row: 0, col: 0 }, 6)
    expect(input).toHaveFocus()
    expect(screen.getByLabelText('Enter digit for Row 1, column 2, empty, editable')).not.toHaveFocus()
  })

  it('announces supplied fixed, editable, selected, conflicting, and candidate states', () => {
    render(<SudokuBoard presentation={presentation({
      '0:0': { value: 7, fixed: true, state: { invalid: true } },
      '0:1': { value: 7, state: { invalid: true } },
      '0:2': { notes: [2], state: { selected: true } }
    })} interactions={interactions()}/>)

    expect(screen.getByRole('grid', { name: 'Sudoku puzzle' })).toHaveAttribute('aria-rowcount', '9')
    expect(screen.getByRole('grid', { name: 'Sudoku puzzle' })).toHaveAttribute('aria-colcount', '9')
    expect(screen.getByRole('gridcell', { name: 'Row 1, column 1: 7, fixed clue, conflicting' })).toHaveAttribute('aria-readonly', 'true')
    const conflict = screen.getByRole('gridcell', { name: 'Row 1, column 2: 7, editable, conflicting' })
    expect(conflict).toHaveAttribute('aria-readonly', 'false')
    expect(conflict).toHaveAttribute('aria-invalid', 'true')
    expect(conflict).toHaveClass('is-conflict')
    const candidateCell = screen.getByRole('gridcell', { name: 'Row 1, column 3, empty, editable, candidate values 2' })
    expect(candidateCell).toHaveAttribute('aria-selected', 'true')
    expect(candidateCell).toHaveAttribute('aria-readonly', 'false')
    expect(candidateCell).toHaveClass('is-selected')
  })

  it('announces scanned, corrected, and confirmed review states without deriving them', () => {
    render(<SudokuBoard presentation={presentation({
      '0:0': { value: 4, origin: 'scan', state: { lowConfidence: true, scanReview: 'pending' } },
      '0:1': { value: 8, state: { scanCorrected: true, scanReview: 'reviewed' } }
    })} interactions={interactions()}/>)

    expect(cell(1, 1)).toHaveAccessibleName('Row 1, column 1: 4, editable, scanned clue, scan review pending')
    const corrected = cell(1, 2)
    expect(corrected).toHaveAccessibleName('Row 1, column 2: 8, editable, scanned clue, corrected, scan reviewed')
    expect(corrected).toHaveClass('is-scan', 'is-scan-corrected', 'is-scan-reviewed')
    expect(corrected).toHaveTextContent('Edited')
  })
})
