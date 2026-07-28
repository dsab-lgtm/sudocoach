import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CandidateAssistantSheet } from './CandidateAssistantSheet'

describe('CandidateAssistantSheet', () => {
  it('requires an explicit cleanup action and exposes a labelled mode selector', () => {
    const cleanup = vi.fn()
    render(<CandidateAssistantSheet mode="cleanup" staleCount={2} step={null} onClose={vi.fn()} onMode={vi.fn()} onCleanup={cleanup} onApplyStep={vi.fn()}/>)
    expect(screen.getByLabelText('Candidate assistance')).toHaveValue('cleanup')
    fireEvent.click(screen.getByRole('button', { name: 'Remove 2 stale notes' }))
    expect(cleanup).toHaveBeenCalledOnce()
  })
})
