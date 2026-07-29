import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { emptyGrid } from '../engine/board'
import { scannerSession } from '../scanner/session'
import { usePuzzleStore } from '../store/puzzleStore'
import { photographedPuzzleSolution } from '../test/fixtures/photographedPuzzle'
import { portraitScanReviewFixture } from '../test/fixtures/scanReview'
import { TestRouter } from '../test/TestRouter'
import type { Digit } from '../engine/types'
import type { ScanResult } from '../scanner/types'
import { ScanReviewScreen } from './ScanReviewScreen'

const productionResult: ScanResult = {
  grid: [[5, 3, null, null, null, null, null, null, null], ...Array.from({ length: 8 }, () => Array(9).fill(null))],
  cells: [
    { row: 0, col: 0, value: 5, confidence: .98, inkRatio: .2, sourceRegion: { points: [{ x: 0, y: 0 }, { x: .1, y: 0 }, { x: .1, y: .1 }, { x: 0, y: .1 }] } },
    { row: 0, col: 1, value: 3, confidence: .62, inkRatio: .2, sourceRegion: { points: [{ x: .1, y: 0 }, { x: .2, y: 0 }, { x: .2, y: .1 }, { x: .1, y: .1 }] } }
  ],
  image: { width: 900, height: 900, bounds: { x: 0, y: 0, size: 900 } },
  diagnostics: [],
  modelStatus: 'production',
  confidencePolicy: { reviewThreshold: .8 }
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
  modelStatus: 'production',
  confidencePolicy: { reviewThreshold: .8 }
}

const uniqueResult: ScanResult = {
  grid: photographedPuzzleSolution.map((row, rowIndex) => row.map((value, col) => rowIndex === 8 && col === 8 ? null : value)),
  cells: photographedPuzzleSolution.flatMap((row, rowIndex) => row.flatMap((value, col) => rowIndex === 8 && col === 8 ? [] : [{ row: rowIndex, col, value, confidence: .99, inkRatio: .2 }])),
  image: { width: 900, height: 900, bounds: { x: 0, y: 0, size: 900 } },
  diagnostics: [],
  modelStatus: 'production',
  confidencePolicy: { reviewThreshold: .8 }
}

const renderReview = async () => {
  render(<TestRouter><ScanReviewScreen /></TestRouter>)
  await waitFor(() => expect(usePuzzleStore.getState().selected).not.toBeNull())
}

afterEach(() => {
  cleanup()
  scannerSession.clear()
  act(() => usePuzzleStore.getState().setReviewGrid(emptyGrid()))
  vi.unstubAllGlobals()
})

describe('ScanReviewScreen', () => {
  it('keeps a 24-clue review compact while bulk acceptance leaves one clue for the normal loop', async () => {
    scannerSession.setResult(portraitScanReviewFixture)
    await renderReview()
    expect(screen.getByRole('status', { name: 'Scan review status' })).toHaveTextContent('0 / 24 confirmed')
    fireEvent.click(screen.getByRole('button', { name: 'Accept 23 high-confidence suggestions' }))
    expect(screen.getByRole('status', { name: 'Scan review status' })).toHaveTextContent('23 / 24 confirmed')
    expect(screen.getByRole('status', { name: 'Scan review status' })).toHaveTextContent('1 remaining')
  })

  it('prioritizes lower-confidence clues and leaves them for individual confirmation after batch acceptance', async () => {
    scannerSession.setResult(productionResult)
    await renderReview()
    expect(screen.getByRole('status', { name: 'Scan review status' })).toHaveTextContent('0 / 2 confirmed')
    fireEvent.click(screen.getByRole('button', { name: 'Accept 1 high-confidence suggestions' }))
    expect(screen.getByRole('status', { name: 'Scan review status' })).toHaveTextContent('1 / 2 confirmed')
    fireEvent.click(screen.getByRole('button', { name: 'Next needs review' }))
    expect(screen.getByRole('gridcell', { name: /Row 1, column 2: 3.*scan review pending/ })).toHaveAttribute('aria-selected', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Confirm value' }))
    expect(screen.getByRole('status', { name: 'Scan review status' })).toHaveTextContent('2 / 2 confirmed')
    expect(screen.getByRole('gridcell', { name: /Row 1, column 2: 3.*scan confirmed/ })).toHaveClass('is-scan-confirmed')
  })

  it('offers explicit batch acceptance for experimental high-confidence clues without bypassing risk items', async () => {
    scannerSession.setResult({ ...productionResult, modelStatus: 'experimental' })
    await renderReview()
    expect(screen.getByRole('button', { name: 'Accept 1 high-confidence suggestions' })).toBeInTheDocument()
    expect(screen.queryByText(/Experimental digit model/)).not.toBeInTheDocument()
  })

  it('reopens a confirmed clue after editing and preserves confirmation through undo', async () => {
    scannerSession.setResult(productionResult)
    await renderReview()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm value' }))
    const selected = screen.getByRole('gridcell', { name: /Row 1, column 1: 5.*scan confirmed/ })
    selected.focus()
    fireEvent.keyDown(selected, { key: '8', code: 'Digit8' })
    expect(screen.getByRole('gridcell', { name: /Row 1, column 1: 8.*corrected.*scan review pending/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(screen.getByRole('gridcell', { name: /Row 1, column 1: 5.*scan confirmed/ })).toBeInTheDocument()
  })

  it('keeps a deleted scanner suggestion unresolved and advances after individual confirmation', async () => {
    scannerSession.setResult(productionResult)
    await renderReview()
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))

    expect(screen.getByRole('gridcell', { name: /Row 1, column 1, empty, editable, scanned clue, corrected, scan review pending/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm correction' }))
    expect(screen.getByRole('gridcell', { name: /Row 1, column 2: 3.*scan review pending/ })).toHaveAttribute('aria-selected', 'true')
  })

  it('keeps missed cells editable and describes an empty scan without opening a modal', async () => {
    scannerSession.setResult(emptyResult)
    await renderReview()
    expect(screen.queryByRole('button', { name: 'Continue to solver' })).not.toBeInTheDocument()
    expect(screen.getByText('Resolve the puzzle status before continuing.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('gridcell', { name: 'Row 1, column 1, empty, editable' }))
    fireEvent.click(screen.getByRole('button', { name: '7' }))
    expect(screen.getByRole('status', { name: 'Scan review status' })).toHaveTextContent('1 remaining')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows duplicate conflicts inline and identifies unsolvable reviewed scans', async () => {
    scannerSession.setResult({ ...productionResult, cells: productionResult.cells.map((cell) => ({ ...cell, confidence: .98 })) })
    await renderReview()
    fireEvent.click(screen.getByRole('gridcell', { name: 'Row 1, column 3, empty, editable' }))
    fireEvent.click(screen.getByRole('button', { name: '5' }))
    expect(screen.getByText('Duplicate clues need correction before the puzzle can be solved.')).toBeInTheDocument()

    cleanup()
    scannerSession.clear()
    act(() => usePuzzleStore.getState().setReviewGrid(emptyGrid()))
    scannerSession.setResult(unsolvableResult)
    await renderReview()
    fireEvent.click(screen.getByRole('button', { name: 'Accept 9 high-confidence suggestions' }))
    await screen.findByText('These clues cannot form a Sudoku. Recheck the source photo before continuing.')
  })

  it('keeps the source image in the review workspace and clears it when rescanning', async () => {
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:puzzle-photo', revokeObjectURL: () => undefined })
    scannerSession.setFile(new File(['photo'], 'puzzle.jpg', { type: 'image/jpeg' }))
    scannerSession.setResult(productionResult)
    const clearSession = vi.spyOn(scannerSession, 'clear')
    render(<TestRouter initialEntries={['/review']}><Routes><Route path="/review" element={<ScanReviewScreen/>}/><Route path="/camera" element={<p>Camera destination</p>}/></Routes></TestRouter>)
    await screen.findByRole('img', { name: 'Original Sudoku photo used for this scan' })
    expect(screen.getByText('Scanned as 5 · 98% confidence')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'View full image' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Rescan puzzle' }))
    expect(await screen.findByText('Camera destination')).toBeInTheDocument()
    expect(clearSession).toHaveBeenCalledOnce()
  })

  it('continues only after a unique production scan is explicitly bulk-accepted', async () => {
    scannerSession.setResult(uniqueResult)
    const clearSession = vi.spyOn(scannerSession, 'clear').mockImplementation(() => undefined)
    render(<TestRouter initialEntries={['/review']}><Routes><Route path="/review" element={<ScanReviewScreen/>}/><Route path="/solve" element={<p>Solver destination</p>}/></Routes></TestRouter>)
    await screen.findByRole('button', { name: 'Accept 80 high-confidence suggestions' })
    fireEvent.click(screen.getByRole('button', { name: 'Accept 80 high-confidence suggestions' }))
    await screen.findByText('Ready to solve: the reviewed clues have one solution.')
    fireEvent.click(screen.getByRole('button', { name: 'Continue to solver' }))
    await screen.findByText('Solver destination')
    expect(clearSession).toHaveBeenCalledOnce()
    expect(usePuzzleStore.getState().solution).toEqual(photographedPuzzleSolution)
  })

  it('requires a manually added clue to be confirmed and marks it on the board', async () => {
    scannerSession.setResult(productionResult)
    await renderReview()
    fireEvent.click(screen.getByRole('gridcell', { name: 'Row 1, column 3, empty, editable' }))
    fireEvent.click(screen.getByRole('button', { name: '4' }))

    expect(screen.getByRole('button', { name: 'Confirm added clue' })).toBeEnabled()
    expect(screen.getByRole('status', { name: 'Scan review status' })).toHaveTextContent('1 added')
    expect(screen.getByRole('gridcell', { name: /Row 1, column 3: 4.*manually added clue.*scan review pending/ })).toHaveClass('is-scan-added')

    fireEvent.click(screen.getByRole('button', { name: 'Confirm added clue' }))
    expect(screen.getByRole('status', { name: 'Scan review status' })).toHaveTextContent('1 / 2 confirmed')
    expect(screen.getByRole('gridcell', { name: /Row 1, column 3: 4.*manually added clue.*scan confirmed/ })).toHaveClass('is-scan-confirmed')
  })

  it('does not batch-accept low-ink scanner suggestions', async () => {
    scannerSession.setResult({ ...productionResult, cells: [{ ...productionResult.cells[0], inkRatio: .01 }] })
    await renderReview()

    expect(screen.queryByRole('button', { name: /Accept .*high-confidence/ })).not.toBeInTheDocument()
    expect(screen.getByRole('gridcell', { name: /Row 1, column 1: 5.*scan review pending/ })).toHaveClass('is-low-confidence')
  })
})
