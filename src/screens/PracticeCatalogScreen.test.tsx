import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { practiceExercises } from '../practice/exercises'
import { TestRouter } from '../test/TestRouter'
import { PracticeCatalogScreen } from './PracticeCatalogScreen'

describe('PracticeCatalogScreen', () => {
  it('offers each curated exercise through the shared home action cards', () => {
    render(<TestRouter><PracticeCatalogScreen/></TestRouter>)

    expect(screen.getByRole('heading', { name: 'Learn a technique, one move at a time.' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Start a focused exercise' })).toBeInTheDocument()

    for (const exercise of practiceExercises) {
      const link = screen.getByRole('link', { name: new RegExp(exercise.title) })
      expect(link).toHaveAttribute('href', `/practice/${exercise.technique}/${exercise.id}`)
      expect(link).toHaveClass('home-action-card--practice')
      expect(link).toHaveTextContent(exercise.description)
    }

    expect(screen.getAllByRole('link')).toHaveLength(practiceExercises.length)
  })
})
