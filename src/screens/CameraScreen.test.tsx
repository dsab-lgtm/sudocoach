import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { scannerSession } from '../scanner/session'
import { CameraScreen } from './CameraScreen'

afterEach(() => { scannerSession.clear(); Object.defineProperty(window, 'isSecureContext', { configurable: true, value: false }) })

describe('CameraScreen recovery', () => {
  it('keeps live camera disabled on an insecure LAN origin and exposes a regular image chooser', () => {
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: false })
    render(<MemoryRouter><CameraScreen /></MemoryRouter>)
    const input = screen.getByLabelText('Choose puzzle photo')
    expect(input).not.toHaveAttribute('capture')
    fireEvent.click(screen.getByRole('button', { name: 'Enable camera' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Live camera needs HTTPS')
  })
})
