import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { emptyGrid, gridFromString } from '../engine/board'
import { usePuzzleStore } from '../store/puzzleStore'
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

const renderSolver = () => render(<MemoryRouter><SolverScreen /></MemoryRouter>)

describe('SolverScreen control dock', () => {
  beforeEach(() => act(() => { usePuzzleStore.getState().setPuzzle(nearlyComplete) }))
  afterEach(() => act(() => { usePuzzleStore.getState().setPuzzle(emptyGrid()) }))

  it('keeps compact controls together and makes notes and unavailable history clear', () => {
    renderSolver()
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled()
    expect(screen.getAllByRole('button', { name: 'Notes' })).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Check' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('gridcell', { name: 'Row 1, column 1, empty' }))
    fireEvent.click(screen.getByRole('button', { name: 'Notes' }))
    expect(screen.getByRole('button', { name: 'Notes' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/Notes on/)).toBeInTheDocument()
  })

  it('checks conflicts without comparing entries to the solution', () => {
    act(() => { usePuzzleStore.getState().setPuzzle(emptyGrid()) })
    renderSolver()
    const first = screen.getByRole('gridcell', { name: 'Row 1, column 1, empty' })
    fireEvent.click(first)
    fireEvent.click(screen.getByRole('button', { name: '9' }))
    fireEvent.click(screen.getByRole('button', { name: 'Check' }))
    expect(screen.getByRole('status')).toHaveTextContent('No conflicts found.')

    fireEvent.click(screen.getByRole('gridcell', { name: 'Row 1, column 2, empty' }))
    fireEvent.click(screen.getByRole('button', { name: '9' }))
    fireEvent.click(screen.getByRole('button', { name: 'Check' }))
    expect(screen.getByRole('status')).toHaveTextContent('2 conflicting cells highlighted.')
    expect(screen.getByRole('gridcell', { name: /Row 1, column 1: 9/ })).toHaveClass('is-conflict')
    fireEvent.click(screen.getByRole('gridcell', { name: 'Row 1, column 3, empty' }))
    fireEvent.click(screen.getByRole('button', { name: '1' }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('highlights the hinted cell, applies its progressive suggested move, and supports undo and redo', () => {
    renderSolver()
    fireEvent.click(screen.getByRole('button', { name: 'Hint' }))
    const hint = screen.getByRole('dialog', { name: 'Hint' })
    expect(hint).toBeInTheDocument()
    expect(screen.getByRole('gridcell', { name: /Row 1, column 1, empty, hint target/ })).toHaveClass('is-hint-target')
    expect(document.querySelector('.hint-cell-marker')).toHaveTextContent('Hint')
    fireEvent.click(within(hint).getByRole('button', { name: 'More detail' }))
    fireEvent.click(within(hint).getByRole('button', { name: 'More detail' }))
    fireEvent.click(within(hint).getByRole('button', { name: 'Apply 5' }))
    expect(screen.queryByRole('dialog', { name: 'Hint' })).not.toBeInTheDocument()
    expect(screen.getByRole('gridcell', { name: /Row 1, column 1: 5/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(screen.getByRole('gridcell', { name: 'Row 1, column 1, empty' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Redo' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }))
    expect(screen.getByRole('gridcell', { name: /Row 1, column 1: 5/ })).toBeInTheDocument()
  })

  it('keeps restart and reveal behind More, with the spoiler confirmation retained', () => {
    renderSolver()
    fireEvent.click(screen.getByRole('button', { name: 'More' }))
    const more = screen.getByRole('dialog', { name: 'More actions' })
    expect(more).toBeInTheDocument()
    fireEvent.click(within(more).getByRole('button', { name: 'Full solution' }))
    expect(screen.getByRole('dialog', { name: 'Reveal the full solution?' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog', { name: 'Reveal the full solution?' })).not.toBeInTheDocument()
  })
})
