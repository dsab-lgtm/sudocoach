import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusBadge } from './StatusBadge'

describe('StatusBadge', () => {
  it('keeps status text available when an icon is decorative', () => {
    render(<StatusBadge tone="success" icon={<span>✓</span>}>Puzzle saved</StatusBadge>)
    expect(screen.getByText('Puzzle saved')).toBeVisible()
    expect(screen.getByText('✓').parentElement).toHaveAttribute('aria-hidden', 'true')
  })
})
