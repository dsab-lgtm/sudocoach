import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'
import { IconButton } from './IconButton'

describe('Button', () => {
  it('keeps native keyboard focus and activates through its button control', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Continue</Button>)
    const button = screen.getByRole('button', { name: 'Continue' })
    button.focus()
    fireEvent.keyDown(button, { key: 'Enter' })
    expect(button).toHaveFocus()
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does not activate when disabled', () => {
    const onClick = vi.fn()
    render(<Button disabled onClick={onClick}>Continue</Button>)
    const button = screen.getByRole('button', { name: 'Continue' })
    expect(button).toBeDisabled()
    fireEvent.click(button)
    fireEvent.keyDown(button, { key: 'Enter' })
    expect(onClick).not.toHaveBeenCalled()
  })
})

describe('IconButton', () => {
  it('requires and exposes an accessible name', () => {
    render(<IconButton label="Close dialog"><span aria-hidden="true">×</span></IconButton>)
    expect(screen.getByRole('button', { name: 'Close dialog' })).toBeInTheDocument()
  })
})
