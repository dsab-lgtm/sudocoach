import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { emptyGrid } from '../engine/board'
import type { SolverStep } from '../engine/types'
import { usePuzzleStore } from '../store/puzzleStore'
import { SudokuBoard } from './SudokuBoard'

const cell = (row: number, column: number) => screen.getByRole('gridcell', { name: new RegExp(`Row ${row}, column ${column}`) })

beforeEach(() => {
  usePuzzleStore.getState().setPuzzle(emptyGrid())
  usePuzzleStore.getState().select({ row: 0, col: 0 })
})

describe('SudokuBoard keyboard controls', () => {
  it('wraps arrow navigation and moves DOM focus', () => {
    render(<SudokuBoard />)
    const first = cell(1, 1)
    first.focus()
    fireEvent.keyDown(first, { key: 'ArrowLeft' })
    expect(cell(1, 9)).toHaveFocus()
    fireEvent.keyDown(cell(1, 9), { key: 'ArrowUp' })
    expect(cell(9, 9)).toHaveFocus()
  })

  it('places keyboard digits and carries into the next row', () => {
    render(<SudokuBoard />)
    const finalColumn = cell(1, 9)
    fireEvent.click(finalColumn)
    finalColumn.focus()
    fireEvent.keyDown(finalColumn, { key: '4', code: 'Numpad4' })
    expect(cell(1, 9)).toHaveTextContent('4')
    expect(cell(2, 1)).toHaveFocus()
  })

  it('clears without moving and toggles notes mode with N', () => {
    const onToggleNotes = vi.fn()
    render(<SudokuBoard notesMode onToggleNotes={onToggleNotes} />)
    const first = cell(1, 1)
    first.focus()
    fireEvent.keyDown(first, { key: '5' })
    expect(usePuzzleStore.getState().board[0][0].notes).toEqual([5])
    fireEvent.keyDown(first, { key: 'n' })
    expect(onToggleNotes).toHaveBeenCalledOnce()
    fireEvent.keyDown(first, { key: 'Delete' })
    expect(first).toHaveFocus()
    expect(usePuzzleStore.getState().board[0][0].value).toBeNull()
  })

  it('does not alter or advance immutable givens', () => {
    const grid = emptyGrid(); grid[0][0] = 7
    usePuzzleStore.getState().setPuzzle(grid)
    usePuzzleStore.getState().select({ row: 0, col: 0 })
    render(<SudokuBoard />)
    const given = cell(1, 1)
    given.focus()
    fireEvent.keyDown(given, { key: '3' })
    expect(given).toHaveTextContent('7')
    expect(given).toHaveFocus()
  })

  it('keeps the board clear by default and layers hint states without exposing candidates', () => {
    const step: SolverStep = { technique: 'naked-pair', action: 'remove-candidate', targetCells: [{ row: 0, col: 0 }], supportingCells: [{ row: 0, col: 1 }], focusUnits: [{ kind: 'row', index: 0 }], removedCandidates: [1, 2], explanation: 'Test.' }
    const { container } = render(<SudokuBoard step={step} />)
    expect(cell(1, 1)).toHaveClass('is-hint-target', 'is-hint-unit')
    expect(cell(1, 2)).toHaveClass('is-hint-supporting', 'is-hint-unit')
    expect(cell(2, 1)).not.toHaveClass('is-hint-unit')
    expect(container.querySelectorAll('.notes i')).toHaveLength(0)
    expect(container.querySelectorAll('.is-removed-candidate')).toHaveLength(0)
  })

  it('uses stable native numeric inputs without advancing phone focus', () => {
    const { container } = render(<SudokuBoard nativeNumericInput autoAdvance={false} showCandidates={false} />)
    const input = screen.getByLabelText('Enter digit for Row 1, column 1, empty')
    expect(input).toHaveAttribute('inputmode', 'numeric')
    expect(input).toHaveAttribute('type', 'tel')
    expect(container.querySelector('.board-cell-input')).toBeNull()
    expect(container.querySelectorAll('.notes i')).toHaveLength(0)
    act(() => input.focus())
    fireEvent.change(input, { target: { value: '6' } })
    expect(usePuzzleStore.getState().board[0][0].value).toBe(6)
    expect(input).toHaveFocus()
    expect(screen.getByLabelText('Enter digit for Row 1, column 2, empty')).not.toHaveFocus()
  })
})
