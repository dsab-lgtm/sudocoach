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

  it('routes guided candidates to recovery when a value blocks safe guidance', () => {
    const recover = vi.fn()
    render(<CandidateAssistantSheet
      mode="guided"
      staleCount={0}
      step={null}
      outcome={{ kind: 'recovery', diagnosis: { kind: 'earlier-mistake', cells: [{ row: 0, col: 2 }], primaryCell: { row: 0, col: 2 }, message: 'An earlier entered value is inconsistent with the verified solution.', solutionStatus: 'unique' } }}
      onClose={vi.fn()}
      onMode={vi.fn()}
      onCleanup={vi.fn()}
      onApplyStep={vi.fn()}
      onRecover={recover}
    />)

    fireEvent.click(screen.getByRole('button', { name: 'Review blocking value' }))
    expect(recover).toHaveBeenCalledOnce()
  })
})
