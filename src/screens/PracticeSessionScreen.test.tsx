import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PracticeSessionScreen } from './PracticeSessionScreen'

describe('PracticeSessionScreen', () => {
  it('keeps a curated exercise separate and explains its supported technique', () => {
    render(<MemoryRouter initialEntries={['/practice/naked-single/naked-single-1']}><Routes><Route path="/practice/:technique/:exerciseId" element={<PracticeSessionScreen/>}/></Routes></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Find the only candidate' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Explain technique' }))
    expect(screen.getAllByText(/naked single/i).length).toBeGreaterThan(1)
  })

  it('keeps an incorrect check result visible and announces it', () => {
    render(<MemoryRouter initialEntries={['/practice/naked-single/naked-single-1']}><Routes><Route path="/practice/:technique/:exerciseId" element={<PracticeSessionScreen/>}/></Routes></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Check move' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Not yet. Check the highlighted technique and try again.')
    expect(screen.getByRole('gridcell', { name: /Row 1, column 1/ })).toHaveClass('has-feedback--diagnosis')
  })
})
