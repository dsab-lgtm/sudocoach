import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FeedbackProvider } from './FeedbackProvider'
import { useFeedback } from './feedbackContext'

function FeedbackHarness() {
  const { announce } = useFeedback()
  return <>
    <button type="button" onClick={() => announce({ message: 'Notes removed.', tone: 'success' })}>Success</button>
    <button type="button" onClick={() => announce({ message: 'Scan failed.', tone: 'error' })}>Error</button>
  </>
}

describe('FeedbackRegion', () => {
  afterEach(() => vi.useRealTimers())

  it('replaces polite feedback and dismisses it after four seconds', () => {
    vi.useFakeTimers()
    render(<FeedbackProvider><FeedbackHarness/></FeedbackProvider>)

    fireEvent.click(screen.getByRole('button', { name: 'Success' }))
    expect(screen.getByRole('status')).toHaveTextContent('Notes removed.')
    act(() => vi.advanceTimersByTime(4000))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('uses an assertive alert for errors', () => {
    render(<FeedbackProvider><FeedbackHarness/></FeedbackProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Error' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Scan failed.')
  })
})
