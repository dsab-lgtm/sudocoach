import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { getNextLogicalStep } from '../engine/logicalSolver'
import { practiceExercises } from '../practice/exercises'
import { PracticeSessionScreen } from './PracticeSessionScreen'

const renderPractice = (path: string) => render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/practice/:technique/:exerciseId" element={<PracticeSessionScreen/>}/></Routes></MemoryRouter>)

const stepFor = (id: string) => {
  const exercise = practiceExercises.find((candidate) => candidate.id === id)
  if (!exercise) throw new Error('Practice exercise is unavailable.')
  const step = getNextLogicalStep(exercise.grid)
  if (!step) throw new Error('Practice step is unavailable.')
  return step
}

const revealProof = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Show next clue' }))
  fireEvent.click(screen.getByRole('button', { name: 'Show next clue' }))
}

describe('PracticeSessionScreen', () => {
  it('progressively shows units and proof without revealing the answer target', () => {
    renderPractice('/practice/naked-single/naked-single-1')

    expect(screen.getByRole('heading', { name: 'One possible value' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Check placement' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Show next clue' }))
    expect(screen.getAllByRole('gridcell', { name: /in the highlighted hint unit/ }).length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: 'Show next clue' }))
    expect(screen.queryByRole('gridcell', { name: /hint target/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reveal answer' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Check placement' })).toBeEnabled()
  })

  it('keeps an incorrect placement visible without changing the board', () => {
    renderPractice('/practice/naked-single/naked-single-1')
    revealProof()
    fireEvent.click(screen.getByRole('button', { name: 'Check placement' }))

    expect(screen.getByRole('alert')).toHaveTextContent('That cell is not forced by this pattern yet.')
    expect(screen.getByRole('gridcell', { name: 'Row 1, column 1, empty, selectable' })).toBeInTheDocument()
  })

  it('reveals the answer only on request, applies a correct placement, and offers the next lesson', () => {
    const target = stepFor('naked-single-1').targetCells[0]
    renderPractice('/practice/naked-single/naked-single-1')
    revealProof()
    fireEvent.click(screen.getByRole('button', { name: 'Reveal answer' }))
    expect(screen.getByRole('gridcell', { name: /hint target/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('gridcell', { name: new RegExp(`Row ${target.row + 1}, column ${target.col + 1}, empty, selectable`) }))
    fireEvent.click(screen.getByRole('button', { name: 'Check placement' }))

    expect(screen.getByText('Lesson complete')).toBeInTheDocument()
    expect(screen.getByText(/Next scan:/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Next lesson' })).toHaveAttribute('href', '/practice/hidden-single/hidden-single-1')
  })

  it('accepts candidate removals in any order and keeps progress on the coach', () => {
    const step = stepFor('pointing-pair-1')
    const lastTarget = step.targetCells[step.targetCells.length - 1]
    renderPractice('/practice/pointing-pair/pointing-pair-1')
    revealProof()
    fireEvent.click(screen.getByRole('gridcell', { name: new RegExp(`Row ${lastTarget.row + 1}, column ${lastTarget.col + 1}, empty, selectable`) }))
    fireEvent.click(screen.getByRole('button', { name: 'Check removals' }))

    expect(screen.getByText(`1 of ${step.targetCells.length}`)).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Find the remaining affected cells in any order.')
  })

  it('supports keyboard selection while the board is practice-only', () => {
    renderPractice('/practice/naked-single/naked-single-1')
    const firstCell = screen.getByRole('gridcell', { name: 'Row 1, column 1, empty, selectable' })
    fireEvent.keyDown(firstCell, { key: 'ArrowRight' })

    expect(screen.getByRole('gridcell', { name: 'Row 1, column 2, empty, selectable' })).toHaveAttribute('aria-selected', 'true')
  })
})
