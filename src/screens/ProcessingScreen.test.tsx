import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { scanFile } from '../scanner/client'
import { scannerSession } from '../scanner/session'
import { photographedPuzzleScanResult } from '../test/fixtures/photographedPuzzle'
import { TestRouter } from '../test/TestRouter'
import { ProcessingScreen } from './ProcessingScreen'

vi.mock('../scanner/client', () => ({ scanFile: vi.fn() }))

const mockScanFile = vi.mocked(scanFile)

function renderProcessing() {
  return render(<TestRouter initialEntries={['/processing']}><Routes>
    <Route path="/processing" element={<ProcessingScreen/>}/>
    <Route path="/review" element={<h1>Review destination</h1>}/>
    <Route path="/camera" element={<h1>Camera destination</h1>}/>
    <Route path="/manual" element={<h1>Manual destination</h1>}/>
  </Routes></TestRouter>)
}

function setPendingFile() {
  vi.stubGlobal('URL', { createObjectURL: () => 'blob:selected-image', revokeObjectURL: () => undefined })
  const file = new File(['image'], 'puzzle.jpg', { type: 'image/jpeg' })
  scannerSession.setFile(file)
  return file
}

afterEach(() => {
  cleanup()
  mockScanFile.mockReset()
  scannerSession.clear()
  vi.unstubAllGlobals()
})

describe('ProcessingScreen', () => {
  it('announces local processing, preserves the image preview, and transitions successful scans to review', async () => {
    const file = setPendingFile()
    mockScanFile.mockResolvedValue(photographedPuzzleScanResult)
    renderProcessing()

    expect(screen.getByRole('heading', { name: 'Reading your Sudoku' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Decoding your photo on this device.')
    expect(screen.getByRole('img', { name: `Selected puzzle image: ${file.name}` })).toHaveAttribute('src', 'blob:selected-image')
    expect(screen.getByText('Find the puzzle grid')).toBeInTheDocument()
    expect(screen.queryByText(/worker|OpenCV|TensorFlow|model/i)).not.toBeInTheDocument()

    expect(await screen.findByRole('heading', { name: 'Review destination' })).toBeInTheDocument()
    expect(scannerSession.getResult()).toBe(photographedPuzzleScanResult)
    expect(scannerSession.getError()).toBeNull()
  })

  it('keeps a failed session recoverable without exposing technical scanner details', async () => {
    setPendingFile()
    mockScanFile.mockRejectedValue(new Error('OpenCV worker failure: model.bin'))
    renderProcessing()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('We could not read this puzzle image')
    expect(alert).not.toHaveTextContent('OpenCV worker failure: model.bin')
    expect(alert).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Choose another image' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enter manually' })).toBeInTheDocument()
  })

  it('retries the same image and allows recovery by returning to Camera', async () => {
    setPendingFile()
    mockScanFile.mockRejectedValueOnce(new Error('unreadable')).mockResolvedValueOnce(photographedPuzzleScanResult)
    renderProcessing()
    await screen.findByRole('alert')
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('heading', { name: 'Review destination' })).toBeInTheDocument()
    expect(mockScanFile).toHaveBeenCalledTimes(2)

    setPendingFile()
    mockScanFile.mockRejectedValue(new Error('unreadable'))
    renderProcessing()
    await screen.findByRole('alert')
    fireEvent.click(screen.getByRole('button', { name: 'Choose another image' }))
    expect(await screen.findByRole('heading', { name: 'Camera destination' })).toBeInTheDocument()
    expect(scannerSession.getFile()).not.toBeNull()
  })

  it('cleans up an abandoned image before entering manual setup', async () => {
    setPendingFile()
    mockScanFile.mockRejectedValue(new Error('unreadable'))
    renderProcessing()
    await screen.findByRole('alert')
    fireEvent.click(screen.getByRole('button', { name: 'Enter manually' }))

    expect(await screen.findByRole('heading', { name: 'Manual destination' })).toBeInTheDocument()
    expect(scannerSession.getFile()).toBeNull()
    expect(scannerSession.getResult()).toBeNull()
  })

  it('cancels active processing and returns to Camera without dropping the selected image', async () => {
    const file = setPendingFile()
    let signal: AbortSignal | undefined
    mockScanFile.mockImplementation((_file, currentSignal) => {
      signal = currentSignal
      return new Promise(() => undefined)
    })
    renderProcessing()
    await waitFor(() => expect(mockScanFile).toHaveBeenCalledOnce())
    fireEvent.click(screen.getByRole('button', { name: 'Cancel and return to camera' }))

    expect(await screen.findByRole('heading', { name: 'Camera destination' })).toBeInTheDocument()
    expect(signal?.aborted).toBe(true)
    expect(scannerSession.getFile()).toBe(file)
  })

  it('aborts and ignores a late scanner result after unmount', async () => {
    setPendingFile()
    let resolveScan: (value: typeof photographedPuzzleScanResult) => void = () => undefined
    let signal: AbortSignal | undefined
    mockScanFile.mockImplementation((_file, currentSignal) => {
      signal = currentSignal
      return new Promise((resolve) => { resolveScan = resolve })
    })
    const view = renderProcessing()
    await waitFor(() => expect(mockScanFile).toHaveBeenCalledOnce())
    view.unmount()

    expect(signal?.aborted).toBe(true)
    await act(async () => resolveScan(photographedPuzzleScanResult))
    expect(scannerSession.getResult()).toBeNull()
  })

  it('announces scanner stages as they are reported', async () => {
    setPendingFile()
    let resolveScan: (value: typeof photographedPuzzleScanResult) => void = () => undefined
    mockScanFile.mockImplementation((_file, _signal, onProgress) => {
      onProgress?.({ stage: 'recognizing', completed: 12, total: 81 })
      return new Promise((resolve) => { resolveScan = resolve })
    })
    renderProcessing()

    expect(await screen.findByRole('status')).toHaveTextContent('Reading clues 12 of 81.')
    await act(async () => resolveScan(photographedPuzzleScanResult))
  })
})
