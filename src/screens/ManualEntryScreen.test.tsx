import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { emptyGrid } from '../engine/board'
import { usePuzzleStore } from '../store/puzzleStore'
import { TestRouter } from '../test/TestRouter'
import { ManualEntryScreen } from './ManualEntryScreen'
import { SolverScreen } from './SolverScreen'

afterEach(() => {
  vi.unstubAllGlobals()
  act(() => usePuzzleStore.getState().setReviewGrid(emptyGrid()))
})

describe('ManualEntryScreen', () => {
  it('renders when randomUUID is unavailable in an older browser', async () => {
    const getRandomValues = globalThis.crypto.getRandomValues.bind(globalThis.crypto)
    vi.stubGlobal('crypto', { getRandomValues })

    const { container } = render(
      <TestRouter initialEntries={['/manual']}>
        <Routes><Route path="/manual" element={<ManualEntryScreen/>}/></Routes>
      </TestRouter>
    )

    await waitFor(() => expect(usePuzzleStore.getState().id).toBeTruthy())
    expect(screen.getByRole('heading', { name: 'Set up puzzle' })).toBeInTheDocument()
    expect(screen.getByRole('grid', { name: 'Sudoku puzzle' })).toBeInTheDocument()
    expect(screen.getByRole('gridcell', { name: 'Row 1, column 1, empty, editable' })).toBeInTheDocument()
    expect(container.querySelector('.number-pad')).toBeInTheDocument()
    expect(container.querySelectorAll('.notes i')).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Start solving' })).toBeInTheDocument()
    expect(screen.getByText('Add the given clues only')).toBeInTheDocument()
  })

  it('accepts clue entry through the keyboard and reports setup readiness', async () => {
    render(<TestRouter initialEntries={['/manual']}><Routes><Route path="/manual" element={<ManualEntryScreen/>}/></Routes></TestRouter>)
    await waitFor(() => expect(usePuzzleStore.getState().selected).toEqual({ row: 0, col: 0 }))

    const target = screen.getByRole('gridcell', { name: 'Row 1, column 1, empty, editable' })
    target.focus()
    fireEvent.keyDown(target, { key: '5', code: 'Digit5' })

    expect(screen.getByRole('gridcell', { name: 'Row 1, column 1: 5, editable' })).toBeInTheDocument()
    expect(screen.getByText('1 clue is ready to solve')).toBeInTheDocument()
  })

  it('explains empty, duplicate, and unsolvable puzzle validation failures', async () => {
    render(<TestRouter initialEntries={['/manual']}><Routes><Route path="/manual" element={<ManualEntryScreen/>}/></Routes></TestRouter>)
    await waitFor(() => expect(usePuzzleStore.getState().selected).toEqual({ row: 0, col: 0 }))

    fireEvent.click(screen.getByRole('button', { name: 'Start solving' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Enter at least one given clue')
    expect(screen.getByRole('button', { name: 'Start solving' })).toHaveAttribute('aria-describedby', 'entry-feedback')

    fireEvent.click(screen.getByRole('button', { name: '5' }))
    fireEvent.click(screen.getByRole('gridcell', { name: 'Row 1, column 2, empty, editable' }))
    fireEvent.click(screen.getByRole('button', { name: '5' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start solving' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Duplicate numbers are highlighted')
    expect(screen.getByRole('gridcell', { name: /Row 1, column 1: 5, editable, conflicting/ })).toBeInTheDocument()

    act(() => {
      usePuzzleStore.getState().setPuzzle([
        [1, 2, 3, 4, 5, 6, 7, 8, null],
        [null, null, null, null, null, null, null, null, 9],
        ...Array.from({ length: 7 }, () => Array(9).fill(null))
      ])
      usePuzzleStore.getState().select({ row: 0, col: 0 })
    })
    fireEvent.click(screen.getByRole('button', { name: 'Start solving' }))
    expect(screen.getByRole('alert')).toHaveTextContent('This puzzle has no solution.')
  })

  it('starts the solver with the first cell selected and announced', async () => {
    render(
      <TestRouter initialEntries={['/manual']}>
        <Routes><Route path="/manual" element={<ManualEntryScreen/>}/><Route path="/solve" element={<SolverScreen/>}/></Routes>
      </TestRouter>
    )

    await waitFor(() => expect(usePuzzleStore.getState().selected).toEqual({ row: 0, col: 0 }))
    fireEvent.click(screen.getByRole('button', { name: '5' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start solving' }))

    await screen.findByRole('heading', { name: 'Sudoku' })
    expect(usePuzzleStore.getState().selected).toEqual({ row: 0, col: 0 })
    expect(screen.getByText('Row 1, column 1')).toBeInTheDocument()
    expect(screen.getByRole('gridcell', { name: 'Row 1, column 1: 5, fixed clue' })).toHaveAttribute('aria-selected', 'true')
  })
})
