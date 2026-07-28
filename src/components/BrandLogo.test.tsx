import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BrandLogo } from './BrandLogo'

describe('BrandLogo', () => {
  it('renders the SudoCoach wordmark with both supplied marks in automatic mode', () => {
    const { container } = render(<BrandLogo/>)
    expect(screen.getByText('SudoCoach')).toHaveClass('brand-logo__wordmark')
    expect(container.querySelector('.brand-logo--auto')).toBeInTheDocument()
    expect(container.querySelector('.brand-logo__mark--light')).toHaveAttribute('src', '/brand/logo-mark.svg')
    expect(container.querySelector('.brand-logo__mark--dark')).toHaveAttribute('src', '/brand/logo-mark-dark.svg')
  })

  it('keeps the compact dark mark named for assistive technology', () => {
    const { container } = render(<BrandLogo variant="compact" tone="dark"/>)
    expect(screen.getByText('SudoCoach')).toHaveClass('sr-only')
    expect(document.querySelector('.brand-logo--dark')).toBeInTheDocument()
    expect(container.querySelector('.brand-logo__mark')).toHaveAttribute('src', '/brand/logo-mark-dark.svg')
  })

  it('keeps the light asset available as an explicit override', () => {
    const { container } = render(<BrandLogo tone="light"/>)
    expect(container.querySelector('.brand-logo--light')).toBeInTheDocument()
    expect(container.querySelector('.brand-logo__mark')).toHaveAttribute('src', '/brand/logo-mark.svg')
  })
})
