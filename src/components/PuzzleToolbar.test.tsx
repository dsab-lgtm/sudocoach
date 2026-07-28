import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PuzzleToolbar } from './PuzzleToolbar'

const controls = () => ({
  onCheck: vi.fn(),
  onErase: vi.fn(),
  onHint: vi.fn(),
  onMore: vi.fn(),
  onRedo: vi.fn(),
  onToggleNotes: vi.fn(),
  onUndo: vi.fn()
})

describe('PuzzleToolbar', () => {
  it('exposes grouped puzzle actions and notes state through explicit callbacks', () => {
    const callbacks = controls()
    render(<PuzzleToolbar canErase canRedo={false} canUndo notesMode onCheck={callbacks.onCheck} onErase={callbacks.onErase} onHint={callbacks.onHint} onMore={callbacks.onMore} onRedo={callbacks.onRedo} onToggleNotes={callbacks.onToggleNotes} onUndo={callbacks.onUndo}/>)

    expect(screen.getByRole('navigation', { name: 'Puzzle controls' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Notes' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Notes' }))
    fireEvent.click(screen.getByRole('button', { name: 'Erase' }))
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Hint' }))
    fireEvent.click(screen.getByRole('button', { name: 'Check' }))
    fireEvent.click(screen.getByRole('button', { name: 'More puzzle actions' }))

    expect(callbacks.onToggleNotes).toHaveBeenCalledOnce()
    expect(callbacks.onErase).toHaveBeenCalledOnce()
    expect(callbacks.onUndo).toHaveBeenCalledOnce()
    expect(callbacks.onHint).toHaveBeenCalledOnce()
    expect(callbacks.onCheck).toHaveBeenCalledOnce()
    expect(callbacks.onMore).toHaveBeenCalledOnce()
  })
})
