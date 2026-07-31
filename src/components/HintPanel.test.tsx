import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { getNextLogicalStep } from '../engine/logicalSolver'
import { photographedPuzzle } from '../test/fixtures/photographedPuzzle'
import { HintPanel } from './HintPanel'

const photographedStep = () => {
  const step = getNextLogicalStep(photographedPuzzle)
  if (!step) throw new Error('Expected a logical step for the photographed puzzle.')
  return step
}

describe('HintPanel', () => {
  it('teaches the target before exposing the answer', () => {
    render(<HintPanel outcome={{ kind: 'step', step: photographedStep() }} level={1} onLevel={vi.fn()} onApply={vi.fn()}/>)
    expect(screen.getByText(/Check R9C5/)).toBeInTheDocument()
    expect(screen.queryByText(/Only 9 fits/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apply 9' })).not.toBeInTheDocument()
  })

  it('shows the row, column, and box evidence before the reveal action', () => {
    render(<HintPanel outcome={{ kind: 'step', step: photographedStep() }} level={2} onLevel={vi.fn()} onApply={vi.fn()}/>)
    expect(screen.getByText('Only 9 fits')).toBeInTheDocument()
    expect(screen.getByText('Row 9 contains 4, 1, 8.')).toBeInTheDocument()
    expect(screen.getByText('Column 5 contains 2, 5, 6.')).toBeInTheDocument()
    expect(screen.getByText('Box 8 contains 3, 6, 5, 7, 1.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apply 9' })).not.toBeInTheDocument()
  })

  it('explains when the current technique set has reached its limit', () => {
    render(<HintPanel outcome={{ kind: 'technique-limit' }} level={1} onLevel={vi.fn()} onApply={vi.fn()}/>)

    expect(screen.getByText('No supported logical move found')).toBeInTheDocument()
    expect(screen.getByText(/Your current values are consistent/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Apply/ })).not.toBeInTheDocument()
  })
})
