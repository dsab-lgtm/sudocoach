import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { emptyGrid } from '../engine/board'
import { scannerSession } from '../scanner/session'
import { usePuzzleStore } from '../store/puzzleStore'
import { photographedPuzzleScanResult, photographedPuzzleSolution } from '../test/fixtures/photographedPuzzle'
import type { ScanResult } from '../scanner/types'
import { ScanReviewScreen } from './ScanReviewScreen'

const experimentalResult: ScanResult = {
  grid: [[5, 3, null, null, null, null, null, null, null], ...Array.from({ length: 8 }, () => Array(9).fill(null))],
  cells: [{ row: 0, col: 0, value: 5, confidence: 0.98, inkRatio: 0.2 }, { row: 0, col: 1, value: 3, confidence: 0.62, inkRatio: 0.2 }],
  image: { width: 900, height: 900, bounds: { x: 0, y: 0, size: 900 } },
  diagnostics: [],
  modelStatus: 'production'
}

const emptyResult: ScanResult = {
  grid: Array.from({ length: 9 }, () => Array(9).fill(null)),
  cells: [],
  image: { width: 900, height: 900, bounds: { x: 0, y: 0, size: 900 } },
  diagnostics: [{ code: 'model-unavailable', message: 'The digit model is unavailable.', recoverable: true }]
}

afterEach(() => { scannerSession.clear(); usePuzzleStore.getState().setReviewGrid(emptyGrid()); vi.unstubAllGlobals() })

describe('ScanReviewScreen uncertainty workflow', () => {
  it('requires explicit confirmation for low-confidence clues and never resolves on focus', () => {
    scannerSession.setResult(experimentalResult)
    render(<MemoryRouter><ScanReviewScreen /></MemoryRouter>)
    expect(screen.getByRole('status')).toHaveTextContent('2 scanned')
    expect(screen.getByRole('status')).toHaveTextContent('1 to review')

    const uncertain = screen.getByRole('gridcell', { name: /Row 1, column 2: 3, scan review pending/ })
    fireEvent.focus(uncertain)
    expect(screen.getByRole('gridcell', { name: /Row 1, column 2: 3, scan review pending/ })).toHaveClass('is-scan-pending')
    fireEvent.click(uncertain)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm value' }))
    expect(screen.getByRole('status')).toHaveTextContent('1 confirmed')
    expect(screen.getByRole('status')).toHaveTextContent('0 to review')
  })

  it('directs the player to the next uncertain clue before allowing continuation', () => {
    scannerSession.setResult(experimentalResult)
    render(<MemoryRouter><ScanReviewScreen /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Confirm the 1 uncertain clue')
    expect(screen.getByRole('gridcell', { name: /Row 1, column 2: 3, scan review pending/ })).toHaveAttribute('aria-selected', 'true')
  })

  it('keeps an empty scan in manual recovery until a clue is entered', async () => {
    scannerSession.setResult(emptyResult)
    render(<MemoryRouter><ScanReviewScreen /></MemoryRouter>)
    const continueButton = screen.getByRole('button', { name: 'Continue' })
    expect(continueButton).toBeDisabled()
    fireEvent.click(screen.getByRole('gridcell', { name: /Row 1, column 1, empty/ }))
    fireEvent.click(screen.getByRole('button', { name: '7' }))
    await waitFor(() => expect(continueButton).toBeEnabled())
  })

  it('shows the original photo in a comparison sheet', () => {
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:puzzle-photo', revokeObjectURL: () => undefined })
    scannerSession.setFile(new File(['photo'], 'puzzle.jpg', { type: 'image/jpeg' }))
    scannerSession.setResult(experimentalResult)
    render(<MemoryRouter><ScanReviewScreen /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Compare photo' }))
    expect(screen.getByRole('dialog', { name: 'Compare with original photo' })).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Compare with original photo' }).querySelector('img')).toHaveAttribute('src', 'blob:puzzle-photo')
    fireEvent.click(screen.getByRole('button', { name: 'Close photo' }))
    expect(screen.queryByRole('dialog', { name: 'Compare with original photo' })).not.toBeInTheDocument()
  })

  it('accepts a reviewed photographed puzzle and navigates to the solver', async () => {
    scannerSession.setResult({ ...photographedPuzzleScanResult, cells: photographedPuzzleScanResult.cells.map((cell) => ({ ...cell, confidence: 0.98 })) })
    render(
      <MemoryRouter initialEntries={['/review']}>
        <Routes><Route path="/review" element={<ScanReviewScreen/>}/><Route path="/solve" element={<p>Solver destination</p>}/></Routes>
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await screen.findByText('Solver destination')
    expect(scannerSession.getResult()).toBeNull()
    expect(usePuzzleStore.getState().solution).toEqual(photographedPuzzleSolution)
  })
})
