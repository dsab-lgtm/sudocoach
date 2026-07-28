import { fireEvent, render, screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { scannerSession } from '../scanner/session'
import { TestRouter } from '../test/TestRouter'
import { CameraScreen } from './CameraScreen'

function renderCamera() {
  return render(<TestRouter initialEntries={['/camera']}><Routes>
    <Route path="/camera" element={<CameraScreen/>}/>
    <Route path="/processing" element={<h1>Processing destination</h1>}/>
    <Route path="/manual" element={<h1>Manual destination</h1>}/>
    <Route path="/" element={<h1>Home destination</h1>}/>
  </Routes></TestRouter>)
}

afterEach(() => {
  scannerSession.clear()
  vi.unstubAllGlobals()
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value: false })
})

describe('CameraScreen', () => {
  it('offers clear camera and existing-image sources with accessible capture guidance', () => {
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: false })
    renderCamera()

    expect(screen.getByRole('heading', { name: 'Capture the whole grid' })).toBeInTheDocument()
    expect(screen.getByText(/Images stay on this device and are processed locally/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Take a photo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Choose existing image' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back to home' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'For a clean scan' })).toBeInTheDocument()
    expect(screen.getByLabelText('Choose an existing puzzle image')).toHaveAttribute('accept', 'image/*,.heic,.heif')
    expect(screen.getByLabelText('Choose an existing puzzle image')).not.toHaveAttribute('capture')
  })

  it('stores an image selection and moves to Processing', async () => {
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:selected-image', revokeObjectURL: () => undefined })
    renderCamera()
    const file = new File(['image'], 'puzzle.jpg', { type: 'image/jpeg' })
    fireEvent.change(screen.getByLabelText('Choose an existing puzzle image'), { target: { files: [file] } })

    expect(await screen.findByRole('heading', { name: 'Processing destination' })).toBeInTheDocument()
    expect(scannerSession.getFile()).toBe(file)
  })

  it('does nothing when image selection is cancelled and allows the same selected image to be retried', async () => {
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:selected-image', revokeObjectURL: () => undefined })
    const view = renderCamera()
    fireEvent.change(screen.getByLabelText('Choose an existing puzzle image'), { target: { files: [] } })
    expect(scannerSession.getFile()).toBeNull()

    view.unmount()
    const selected = new File(['image'], 'puzzle.jpg', { type: 'image/jpeg' })
    scannerSession.setFile(selected)
    scannerSession.setError('Unreadable image')
    renderCamera()
    fireEvent.click(screen.getByRole('button', { name: 'Try selected image again' }))

    expect(await screen.findByRole('heading', { name: 'Processing destination' })).toBeInTheDocument()
    expect(scannerSession.getFile()).toBe(selected)
    expect(scannerSession.getError()).toBeNull()
  })

  it('keeps live camera unavailable on an insecure origin and announces the recovery', () => {
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: false })
    renderCamera()
    fireEvent.click(screen.getByRole('button', { name: 'Take a photo' }))

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Live camera needs HTTPS')
    expect(alert).toHaveFocus()
  })

  it('returns to Home with the labelled back action', async () => {
    renderCamera()
    fireEvent.click(screen.getByRole('button', { name: 'Back to home' }))
    expect(await screen.findByRole('heading', { name: 'Home destination' })).toBeInTheDocument()
  })
})
