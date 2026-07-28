import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BrandLogo } from './BrandLogo'

describe('BrandLogo', () => {
  it('renders the SudoCoach wordmark and supplied light mark in the horizontal variant', () => {
    const { container } = render(<BrandLogo/>)
    expect(screen.getByText('SudoCoach')).toHaveClass('brand-logo__wordmark')
    expect(container.querySelector('.brand-logo__mark')).toHaveAttribute('src', '/brand/logo-mark.svg')
  })

  it('keeps the compact dark mark named for assistive technology', () => {
    const { container } = render(<BrandLogo variant="compact" tone="dark"/>)
    expect(screen.getByText('SudoCoach')).toHaveClass('sr-only')
    expect(document.querySelector('.brand-logo--dark')).toBeInTheDocument()
    expect(container.querySelector('.brand-logo__mark')).toHaveAttribute('src', '/brand/logo-mark-dark.svg')
  })
})
