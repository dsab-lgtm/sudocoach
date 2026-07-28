import { act, fireEvent, render, screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createBoard, emptyGrid } from '../engine/board'
import type { PuzzleRecord } from '../storage/database'
import { mostRecentPuzzle } from '../storage/database'
import { usePuzzleStore } from '../store/puzzleStore'
import { TestRouter } from '../test/TestRouter'
import { HomeScreen } from './HomeScreen'

vi.mock('../storage/database', () => ({ mostRecentPuzzle: vi.fn() }))

const recentPuzzle = vi.mocked(mostRecentPuzzle)

const savedPuzzle = (completed = false): PuzzleRecord => {
  const grid = emptyGrid()
  grid[0][0] = 5
  const board = createBoard(grid)
  board[0][1] = { given: null, value: 3, notes: [], origin: 'manual' }
  return { id: 'saved-puzzle', schemaVersion: 1, original: grid, board, solution: undefined, hintHistory: [], completed, createdAt: Date.UTC(2026, 0, 1), updatedAt: Date.UTC(2026, 0, 2) }
}

afterEach(() => {
  recentPuzzle.mockReset()
  act(() => usePuzzleStore.getState().setReviewGrid(emptyGrid()))
})

describe('HomeScreen', () => {
  it('shows the launch actions without a resume card when no puzzle is stored', async () => {
    recentPuzzle.mockResolvedValue(undefined)
    render(<TestRouter><HomeScreen/></TestRouter>)

    expect(await screen.findByRole('heading', { name: 'A clearer way to solve Sudoku.' })).toBeInTheDocument()
    expect(screen.getByText('SudoCoach helps you solve, understand, and improve at Sudoku.')).toBeInTheDocument()
    expect(screen.getByText('Offline-ready')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Scan puzzle/ })).toHaveAttribute('href', '/camera')
    expect(screen.getByRole('link', { name: /Enter manually/ })).toHaveAttribute('href', '/manual')
    expect(screen.queryByRole('heading', { name: 'Saved puzzle' })).not.toBeInTheDocument()
  })

  it('summarizes and restores the latest stored puzzle before navigating to Solver', async () => {
    const record = savedPuzzle()
    recentPuzzle.mockResolvedValue(record)
    render(<TestRouter initialEntries={['/']}><Routes><Route path="/" element={<HomeScreen/>}/><Route path="/solve" element={<h1>Solver destination</h1>}/></Routes></TestRouter>)

    expect(await screen.findByRole('heading', { name: 'Saved puzzle' })).toBeInTheDocument()
    expect(screen.getByText('In progress')).toBeInTheDocument()
    expect(screen.getByText('2 of 81 cells filled')).toBeInTheDocument()
    expect(screen.getByText(/Updated/)).toHaveAttribute('datetime', new Date(record.updatedAt).toISOString())
    fireEvent.click(screen.getByRole('button', { name: 'Resume puzzle' }))

    expect(await screen.findByRole('heading', { name: 'Solver destination' })).toBeInTheDocument()
    expect(usePuzzleStore.getState().id).toBe(record.id)
    expect(usePuzzleStore.getState().board[0][1].value).toBe(3)
    expect(recentPuzzle).toHaveBeenCalledOnce()
  })

  it('keeps a completed stored puzzle available to resume', async () => {
    recentPuzzle.mockResolvedValue(savedPuzzle(true))
    render(<TestRouter><HomeScreen/></TestRouter>)

    expect(await screen.findByText('Completed')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Resume puzzle' })).toBeInTheDocument()
  })
})
