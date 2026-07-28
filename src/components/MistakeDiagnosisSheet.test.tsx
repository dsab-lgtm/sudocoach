import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MistakeDiagnosisSheet } from './MistakeDiagnosisSheet'

describe('MistakeDiagnosisSheet', () => {
  it('offers explicit recovery rather than changing a value automatically', () => {
    const clear = vi.fn()
    const undo = vi.fn()
    render(<MistakeDiagnosisSheet diagnosis={{ kind: 'solution-mismatch', cells: [{ row: 0, col: 0 }], primaryCell: { row: 0, col: 0 }, message: 'Incorrect.', solutionStatus: 'unique' }} canUndo onClose={vi.fn()} onClear={clear} onCorrectSource={vi.fn()} onUndo={undo}/>)
    expect(screen.getByRole('dialog', { name: 'Selected value is incorrect' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Clear highlighted value' }))
    fireEvent.click(screen.getByRole('button', { name: 'Undo last action' }))
    expect(clear).toHaveBeenCalledOnce()
    expect(undo).toHaveBeenCalledOnce()
  })
})
