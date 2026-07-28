import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { emptyGrid, gridFromString } from '../engine/board'
import type { PuzzleRecord } from '../storage/database'
import { usePuzzleStore } from '../store/puzzleStore'
import { TestRouter } from '../test/TestRouter'
import { SolverScreen } from './SolverScreen'

const nearlyComplete = gridFromString(`
.34678912
672195348
198342567
859761423
426853791
713924856
961537284
287419635
345286179
`)

const renderSolver = () => render(<TestRouter><SolverScreen /></TestRouter>)
const cell = (row: number, column: number) => screen.getByRole('gridcell', { name: new RegExp(`Row ${row}, column ${column}`) })

describe('SolverScreen puzzle behavior', () => {
  beforeEach(() => act(() => { usePuzzleStore.getState().setPuzzle(nearlyComplete) }))
  afterEach(() => act(() => { usePuzzleStore.getState().setPuzzle(emptyGrid()) }))

  it('shows the compact Solver header and R1C1 fallback before a store selection exists', () => {
    renderSolver()

    expect(screen.getByText('SudoCoach')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sudoku' })).toBeInTheDocument()
    expect(screen.getByText('Row 1, column 1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back to home' })).toBeInTheDocument()
    expect(cell(1, 1)).toHaveAttribute('aria-selected', 'true')
  })

  it('selects a cell and enters a value with the number pad', () => {
    renderSolver()
    const target = cell(1, 1)
    fireEvent.click(target)
    expect(target).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Row 1, column 1')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '5' }))
    expect(cell(1, 1)).toHaveAccessibleName('Row 1, column 1: 5, editable')
    expect(usePuzzleStore.getState().board[0][0].value).toBe(5)
  })

  it('enters the same value with the keyboard and advances selection', () => {
    act(() => { usePuzzleStore.getState().setPuzzle(emptyGrid()); usePuzzleStore.getState().select({ row: 0, col: 0 }) })
    renderSolver()
    const target = cell(1, 1)
    target.focus()
    fireEvent.keyDown(target, { key: '5', code: 'Digit5' })

    expect(cell(1, 1)).toHaveAccessibleName('Row 1, column 1: 5, editable')
    expect(cell(1, 2)).toHaveFocus()
    expect(screen.getByText('Row 1, column 2')).toBeInTheDocument()
  })

  it('does not edit fixed clues through the keyboard or number pad', () => {
    renderSolver()
    const given = screen.getByRole('gridcell', { name: 'Row 1, column 2: 3, fixed clue' })
    fireEvent.click(given)
    fireEvent.keyDown(given, { key: '9', code: 'Digit9' })
    fireEvent.click(screen.getByRole('button', { name: '9' }))

    expect(given).toHaveTextContent('3')
    expect(usePuzzleStore.getState().board[0][1].value).toBe(3)
    expect(screen.getByRole('button', { name: 'Erase' })).toBeDisabled()
  })

  it('adds and removes candidate notes with the number pad', () => {
    act(() => { usePuzzleStore.getState().setPuzzle(emptyGrid()); usePuzzleStore.getState().select({ row: 0, col: 0 }) })
    renderSolver()
    fireEvent.click(screen.getByRole('button', { name: 'Notes' }))
    fireEvent.click(screen.getByRole('button', { name: '4' }))
    expect(cell(1, 1)).toHaveAccessibleName('Row 1, column 1, empty, editable, candidate values 4')
    expect(cell(1, 1)).toHaveClass('has-feedback--candidate-added')

    fireEvent.click(screen.getByRole('button', { name: '4' }))
    expect(cell(1, 1)).toHaveAccessibleName('Row 1, column 1, empty, editable')
    expect(cell(1, 1)).toHaveClass('has-feedback--candidate-removed')
    expect(cell(1, 1).querySelector('.notes-feedback-removal')).toHaveTextContent('4')
    expect(usePuzzleStore.getState().board[0][0].notes).toEqual([])
  })

  it('undoes and redoes a normal player move', () => {
    act(() => { usePuzzleStore.getState().setPuzzle(emptyGrid()); usePuzzleStore.getState().select({ row: 0, col: 0 }) })
    renderSolver()
    fireEvent.click(screen.getByRole('button', { name: '6' }))
    expect(cell(1, 1)).toHaveClass('has-feedback--value-entered')
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(cell(1, 1)).toHaveAccessibleName('Row 1, column 1, empty, editable')
    expect(cell(1, 1)).toHaveClass('has-feedback--recovered')
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }))
    expect(cell(1, 1)).toHaveAccessibleName('Row 1, column 1: 6, editable')
    expect(cell(1, 1)).toHaveClass('has-feedback--reapplied')
  })

  it('reports and exposes conflicting values without comparing them to the solution', () => {
    act(() => { usePuzzleStore.getState().setPuzzle(emptyGrid()); usePuzzleStore.getState().select({ row: 0, col: 0 }) })
    renderSolver()
    fireEvent.click(screen.getByRole('button', { name: '9' }))
    fireEvent.click(cell(1, 2))
    fireEvent.click(screen.getByRole('button', { name: '9' }))
    fireEvent.click(screen.getByRole('button', { name: 'Check' }))

    expect(screen.getByRole('status')).toHaveTextContent('2 conflicting cells highlighted.')
    expect(cell(1, 1)).toHaveClass('is-conflict')
    expect(cell(1, 1)).toHaveClass('has-feedback--diagnosis')
    expect(cell(1, 1)).toHaveAttribute('aria-invalid', 'true')
    expect(cell(1, 1)).toHaveAccessibleName('Row 1, column 1: 9, editable, conflicting')
  })

  it('requests a progressive hint, applies it, and supports undo and redo', () => {
    renderSolver()
    fireEvent.click(screen.getByRole('button', { name: 'Hint' }))
    const hint = screen.getByRole('dialog', { name: 'Hint' })
    expect(hint).toBeInTheDocument()
    expect(cell(1, 1)).toHaveClass('is-hint-target')
    fireEvent.click(within(hint).getByRole('button', { name: 'More detail' }))
    fireEvent.click(within(hint).getByRole('button', { name: 'More detail' }))
    fireEvent.click(within(hint).getByRole('button', { name: 'Apply 5' }))
    expect(cell(1, 1)).toHaveAccessibleName('Row 1, column 1: 5, editable')
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(cell(1, 1)).toHaveAccessibleName('Row 1, column 1, empty, editable')
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }))
    expect(cell(1, 1)).toHaveAccessibleName('Row 1, column 1: 5, editable')
  })

  it('closes the focused hint sheet and restores focus to its trigger', () => {
    renderSolver()
    const trigger = screen.getByRole('button', { name: 'Hint' })
    trigger.focus()
    fireEvent.click(trigger)

    const hint = screen.getByRole('dialog', { name: 'Hint' })
    expect(screen.getByText('Reveal one focused clue at a time.')).toBeInTheDocument()
    fireEvent.click(within(hint).getByRole('button', { name: 'Close hint' }))

    expect(screen.queryByRole('dialog', { name: 'Hint' })).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(cell(1, 1)).not.toHaveClass('is-hint-target')
  })

  it('opens the remaining puzzle actions from the accessible toolbar control', () => {
    renderSolver()
    fireEvent.click(screen.getByRole('button', { name: 'More puzzle actions' }))
    expect(screen.getByRole('dialog', { name: 'More actions' })).toBeInTheDocument()
  })

  it('renders a restored puzzle with its persisted givens, values, and notes', () => {
    const grid = emptyGrid()
    grid[0][0] = 5
    act(() => {
      usePuzzleStore.getState().setPuzzle(grid)
      usePuzzleStore.getState().setValue({ row: 0, col: 1 }, 3)
      usePuzzleStore.getState().toggleNote({ row: 0, col: 2 }, 7)
      const state = usePuzzleStore.getState()
      const record: PuzzleRecord = {
        id: 'persisted-puzzle', schemaVersion: 1, original: grid, board: state.board, solution: undefined, hintHistory: [], completed: false, createdAt: 1, updatedAt: 2
      }
      state.restore(record)
    })

    renderSolver()
    expect(screen.getByRole('gridcell', { name: 'Row 1, column 1: 5, fixed clue' })).toBeInTheDocument()
    expect(screen.getByRole('gridcell', { name: 'Row 1, column 2: 3, editable' })).toBeInTheDocument()
    expect(screen.getByRole('gridcell', { name: 'Row 1, column 3, empty, editable, candidate values 7' })).toBeInTheDocument()
  })
})
