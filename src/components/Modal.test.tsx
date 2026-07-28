import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Modal } from './Modal'

function ModalHarness() {
  const [open, setOpen] = useState(false)
  return <><button type="button" onClick={() => setOpen(true)}>Open dialog</button>{open && <Modal title="Dialog title" description="Dialog description" onClose={() => setOpen(false)}><button type="button">First action</button><button type="button">Last action</button></Modal>}</>
}

describe('Modal', () => {
  it('sets initial focus, contains Tab navigation, and links title and description', () => {
    render(<ModalHarness/>)
    fireEvent.click(screen.getByRole('button', { name: 'Open dialog' }))
    const dialog = screen.getByRole('dialog', { name: 'Dialog title' })
    const first = screen.getByRole('button', { name: 'First action' })
    const last = screen.getByRole('button', { name: 'Last action' })
    expect(first).toHaveFocus()
    expect(dialog).toHaveAttribute('aria-describedby')
    expect(screen.getByText('Dialog description').id).toBe(dialog.getAttribute('aria-describedby'))

    last.focus()
    fireEvent.keyDown(last, { key: 'Tab' })
    expect(first).toHaveFocus()
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true })
    expect(last).toHaveFocus()
  })

  it('closes on Escape and restores focus and body scroll', () => {
    render(<ModalHarness/>)
    const trigger = screen.getByRole('button', { name: 'Open dialog' })
    trigger.focus()
    fireEvent.click(trigger)
    expect(document.body.style.overflow).toBe('hidden')
    fireEvent.keyDown(screen.getByRole('button', { name: 'First action' }), { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(document.body.style.overflow).toBe('')
  })

  it('closes only when the backdrop itself is pressed', () => {
    render(<ModalHarness/>)
    fireEvent.click(screen.getByRole('button', { name: 'Open dialog' }))
    fireEvent.mouseDown(screen.getByRole('dialog', { name: 'Dialog title' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.mouseDown(screen.getByRole('presentation'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
