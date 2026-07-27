import { act, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { emptyGrid } from '../engine/board'
import { usePuzzleStore } from '../store/puzzleStore'
import { ManualEntryScreen } from './ManualEntryScreen'

afterEach(() => {
  vi.unstubAllGlobals()
  act(() => usePuzzleStore.getState().setReviewGrid(emptyGrid()))
})

describe('ManualEntryScreen', () => {
  it('renders when randomUUID is unavailable in an older browser', async () => {
    const getRandomValues = globalThis.crypto.getRandomValues.bind(globalThis.crypto)
    vi.stubGlobal('crypto', { getRandomValues })

    const { container } = render(
      <MemoryRouter initialEntries={['/manual']}>
        <Routes><Route path="/manual" element={<ManualEntryScreen/>}/></Routes>
      </MemoryRouter>
    )

    await waitFor(() => expect(usePuzzleStore.getState().id).toBeTruthy())
    expect(screen.getByRole('heading', { name: 'Enter clues' })).toBeInTheDocument()
    expect(screen.getByRole('grid', { name: 'Sudoku puzzle' })).toBeInTheDocument()
    expect(screen.getByRole('gridcell', { name: 'Row 1, column 1, empty' })).toBeInTheDocument()
    expect(container.querySelector('.number-pad')).toBeInTheDocument()
    expect(container.querySelectorAll('.notes i')).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Start solving' })).toBeInTheDocument()
  })
})
