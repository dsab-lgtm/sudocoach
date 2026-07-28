import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { NumberPad } from './NumberPad'

const renderNumberPad = (overrides: Partial<React.ComponentProps<typeof NumberPad>> = {}) => {
  const props = {
    notesMode: false,
    disabled: false,
    allowedActions: { canEnterValue: true, canErase: true, canToggleNotes: true },
    onValueEntry: vi.fn(),
    onErase: vi.fn(),
    onToggleNotes: vi.fn(),
    ...overrides
  }
  render(<NumberPad {...props}/>)
  return props
}

describe('NumberPad', () => {
  it('sends value and erase requests through explicit callbacks', () => {
    const props = renderNumberPad()
    fireEvent.click(screen.getByRole('button', { name: '6' }))
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(props.onValueEntry).toHaveBeenCalledWith(6)
    expect(props.onErase).toHaveBeenCalledOnce()
  })

  it('exposes and toggles note mode through its callback', () => {
    const props = renderNumberPad({ notesMode: true })
    const notes = screen.getByRole('button', { name: 'Notes' })
    expect(notes).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(notes)
    expect(props.onToggleNotes).toHaveBeenCalledOnce()
  })

  it('guards unavailable value and erase actions without changing keypad styling', () => {
    const props = renderNumberPad({ disabled: true })
    const digit = screen.getByRole('button', { name: '3' })
    const clear = screen.getByRole('button', { name: 'Clear' })
    expect(digit).toHaveAttribute('aria-disabled', 'true')
    expect(clear).toHaveAttribute('aria-disabled', 'true')
    expect(digit).not.toBeDisabled()
    fireEvent.click(digit)
    fireEvent.click(clear)
    expect(props.onValueEntry).not.toHaveBeenCalled()
    expect(props.onErase).not.toHaveBeenCalled()
  })

  it('respects individual allowed actions', () => {
    const props = renderNumberPad({ allowedActions: { canEnterValue: false, canErase: true, canToggleNotes: false } })
    fireEvent.click(screen.getByRole('button', { name: '5' }))
    fireEvent.click(screen.getByRole('button', { name: 'Notes' }))
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(props.onValueEntry).not.toHaveBeenCalled()
    expect(props.onToggleNotes).not.toHaveBeenCalled()
    expect(props.onErase).toHaveBeenCalledOnce()
  })
})
