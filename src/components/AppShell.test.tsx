import { fireEvent, render, screen, within } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { TestRouter } from '../test/TestRouter'
import { AppShell } from './AppShell'

function renderShell(initialEntries: string[]) {
  return render(<TestRouter initialEntries={initialEntries}><AppShell><Routes>
    <Route path="/" element={<h1>Home route</h1>}/>
    <Route path="/settings" element={<h1>Settings route</h1>}/>
    <Route path="/camera" element={<h1>Camera route</h1>}/>
    <Route path="/practice/naked-single/example" element={<h1>Practice session route</h1>}/>
    <Route path="/solve" element={<h1>Solver route</h1>}/>
    <Route path="/training/annotate" element={<h1>Training route</h1>}/>
  </Routes></AppShell></TestRouter>)
}

describe('AppShell', () => {
  it('provides current-page navigation and Settings access on non-puzzle routes', async () => {
    renderShell(['/'])
    const navigation = screen.getByRole('navigation', { name: 'Primary navigation' })
    expect(within(navigation).getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'SudoCoach home' })).toBeInTheDocument()

    fireEvent.click(within(navigation).getByRole('button', { name: 'Settings' }))
    expect(await screen.findByRole('heading', { name: 'Settings route' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Settings' })).toHaveAttribute('aria-current', 'page')
  })

  it('keeps the Training Annotation link development-only', () => {
    renderShell(['/'])
    const training = screen.queryByRole('link', { name: 'Training' })
    if (import.meta.env.DEV) expect(training).toBeInTheDocument()
    else expect(training).not.toBeInTheDocument()
  })

  it('omits the global top bar on puzzle routes', () => {
    renderShell(['/solve'])
    expect(screen.getByRole('main')).toHaveClass('app-shell--puzzle')
    expect(screen.queryByRole('navigation', { name: 'Primary navigation' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'SudoCoach home' })).not.toBeInTheDocument()
  })

  it.each(['/camera', '/practice/naked-single/example'])('uses task chrome without global navigation on %s', (path) => {
    renderShell([path])
    expect(screen.getByRole('main')).toHaveClass('app-shell--task')
    expect(screen.queryByRole('navigation', { name: 'Primary navigation' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'SudoCoach home' })).not.toBeInTheDocument()
  })
})
