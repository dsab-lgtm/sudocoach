import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TaskHeader } from './TaskHeader'

describe('TaskHeader', () => {
  it('provides a semantic title, status feedback, and labelled back control', () => {
    const onBack = vi.fn()
    render(<TaskHeader
      eyebrow="Solve a puzzle"
      title="Review your grid"
      description="Check every given before continuing."
      status={<span role="status">3 conflicts</span>}
      feedback={<p>Try the highlighted cells.</p>}
      backAction={{ label: 'Back to home', onClick: onBack }}
    />)

    expect(screen.getByRole('heading', { name: 'Review your grid' })).toBeInTheDocument()
    expect(screen.getByText('Solve a puzzle')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('3 conflicts')
    expect(screen.getByText('Try the highlighted cells.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Back to home' }))
    expect(onBack).toHaveBeenCalledOnce()
  })
})
