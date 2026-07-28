import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { emptyGrid } from '../engine/board'
import { scannerSession } from '../scanner/session'
import { usePuzzleStore } from '../store/puzzleStore'
import { photographedPuzzleScanResult, photographedPuzzleSolution } from '../test/fixtures/photographedPuzzle'
import { TestRouter } from '../test/TestRouter'
import type { Digit } from '../engine/types'
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

const unsolvableResult: ScanResult = {
  grid: [[1, 2, 3, 4, 5, 6, 7, 8, null], [null, null, null, null, null, null, null, null, 9], ...Array.from({ length: 7 }, () => Array(9).fill(null))],
  cells: [...[1, 2, 3, 4, 5, 6, 7, 8].map((value, col) => ({ row: 0, col, value: value as Digit, confidence: .98, inkRatio: .2 })), { row: 1, col: 8, value: 9, confidence: .98, inkRatio: .2 }],
  image: { width: 900, height: 900, bounds: { x: 0, y: 0, size: 900 } },
  diagnostics: [],
  modelStatus: 'production'
}

const renderReview = async () => {
  render(<TestRouter><ScanReviewScreen /></TestRouter>)
  await waitFor(() => expect(usePuzzleStore.getState().selected).toEqual({ row: 0, col: 0 }))
}

afterEach(() => {
  cleanup()
  scannerSession.clear()
  act(() => usePuzzleStore.getState().setReviewGrid(emptyGrid()))
  vi.unstubAllGlobals()
})

describe('ScanReviewScreen uncertainty workflow', () => {
  it('requires explicit confirmation for low-confidence clues and never resolves on focus', async () => {
    scannerSession.setResult(experimentalResult)
    await renderReview()
    expect(screen.getByRole('status')).toHaveTextContent('2 scanned')
    expect(screen.getByRole('status')).toHaveTextContent('1 to review')

    const uncertain = screen.getByRole('gridcell', { name: /Row 1, column 2: 3, editable, scanned clue, scan review pending/ })
    fireEvent.focus(uncertain)
    expect(screen.getByRole('gridcell', { name: /Row 1, column 2: 3, editable, scanned clue, scan review pending/ })).toHaveClass('is-scan-pending')
    fireEvent.click(uncertain)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm value' }))
    expect(screen.getByRole('status')).toHaveTextContent('1 confirmed')
    expect(screen.getByRole('status')).toHaveTextContent('0 to review')
    expect(screen.getByRole('gridcell', { name: /Row 1, column 2: 3, editable, scanned clue, scan reviewed/ })).toHaveClass('is-scan-reviewed')
  })

  it('directs the player to the next uncertain clue before allowing continuation', async () => {
    scannerSession.setResult(experimentalResult)
    await renderReview()
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Confirm the 1 uncertain clue')
    expect(screen.getByRole('gridcell', { name: /Row 1, column 2: 3, editable, scanned clue, scan review pending/ })).toHaveAttribute('aria-selected', 'true')
  })

  it('marks an edited uncertain clue before and after explicit confirmation', async () => {
    scannerSession.setResult(experimentalResult)
    await renderReview()
    const uncertain = screen.getByRole('gridcell', { name: /Row 1, column 2: 3, editable, scanned clue, scan review pending/ })
    uncertain.focus()
    fireEvent.keyDown(uncertain, { key: '8', code: 'Digit8' })

    const corrected = screen.getByRole('gridcell', { name: /Row 1, column 2: 8, editable, scanned clue, corrected, scan review pending/ })
    expect(corrected).toHaveClass('is-scan-corrected', 'is-scan-pending')
    expect(corrected).toHaveTextContent('Edited')
    fireEvent.click(corrected)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm value' }))
    expect(screen.getByRole('gridcell', { name: /Row 1, column 2: 8, editable, scanned clue, corrected, scan reviewed/ })).toHaveClass('is-scan-reviewed')
  })

  it('keeps an empty scan in manual recovery until a clue is entered', async () => {
    scannerSession.setResult(emptyResult)
    await renderReview()
    const continueButton = screen.getByRole('button', { name: 'Continue' })
    expect(continueButton).toBeDisabled()
    fireEvent.click(screen.getByRole('gridcell', { name: /Row 1, column 1, empty/ }))
    fireEvent.click(screen.getByRole('button', { name: '7' }))
    await waitFor(() => expect(continueButton).toBeEnabled())
  })

  it('shows the original photo in an accessible comparison sheet and restores focus', async () => {
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:puzzle-photo', revokeObjectURL: () => undefined })
    scannerSession.setFile(new File(['photo'], 'puzzle.jpg', { type: 'image/jpeg' }))
    scannerSession.setResult(experimentalResult)
    await renderReview()
    const trigger = screen.getByRole('button', { name: 'Compare photo' })
    trigger.focus()
    fireEvent.click(trigger)
    expect(screen.getByRole('dialog', { name: 'Compare with original photo' })).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Compare with original photo' }).querySelector('img')).toHaveAttribute('src', 'blob:puzzle-photo')
    const close = screen.getByRole('button', { name: 'Close photo' })
    expect(close).toHaveFocus()
    fireEvent.keyDown(close, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Compare with original photo' })).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('keeps invalid and unsolvable scan results in review', async () => {
    scannerSession.setResult({ ...experimentalResult, cells: experimentalResult.cells.map((cell) => ({ ...cell, confidence: .98 })) })
    await renderReview()
    fireEvent.click(screen.getByRole('gridcell', { name: /Row 1, column 3, empty, editable/ }))
    fireEvent.click(screen.getByRole('button', { name: '5' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Duplicate starting numbers are highlighted')

    cleanup()
    scannerSession.clear()
    act(() => usePuzzleStore.getState().setReviewGrid(emptyGrid()))
    scannerSession.setResult(unsolvableResult)
    await renderReview()
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('alert')).toHaveTextContent('This puzzle has no solution')
  })

  it('accepts a reviewed photographed puzzle and navigates to the solver', async () => {
    scannerSession.setResult({ ...photographedPuzzleScanResult, cells: photographedPuzzleScanResult.cells.map((cell) => ({ ...cell, confidence: 0.98 })) })
    const clearSession = vi.spyOn(scannerSession, 'clear').mockImplementation(() => undefined)
    render(
      <TestRouter initialEntries={['/review']}>
        <Routes><Route path="/review" element={<ScanReviewScreen/>}/><Route path="/solve" element={<p>Solver destination</p>}/></Routes>
      </TestRouter>
    )

    await waitFor(() => expect(usePuzzleStore.getState().selected).toEqual({ row: 0, col: 0 }))

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await screen.findByText('Solver destination')
    expect(clearSession).toHaveBeenCalledOnce()
    clearSession.mockRestore()
    scannerSession.clear()
    expect(scannerSession.getResult()).toBeNull()
    expect(usePuzzleStore.getState().solution).toEqual(photographedPuzzleSolution)
  })
})
