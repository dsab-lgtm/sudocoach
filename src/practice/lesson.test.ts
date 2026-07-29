import { createBoard } from '../engine/board'
import { getNextLogicalStep } from '../engine/logicalSolver'
import { describe, expect, it } from 'vitest'
import { practiceExercises } from './exercises'
import { lessonFor, practicePresentation } from './lesson'

const stepFor = (id: string) => {
  const exercise = practiceExercises.find((candidate) => candidate.id === id)
  if (!exercise) throw new Error('Practice exercise is unavailable.')
  const step = getNextLogicalStep(exercise.grid)
  if (!step) throw new Error('Practice step is unavailable.')
  return { exercise, step, lesson: lessonFor(step) }
}

describe('practice lesson presentation', () => {
  it('keeps every opening board clean and supplies method-specific teaching metadata', () => {
    for (const exercise of practiceExercises) {
      const { step, lesson } = stepFor(exercise.id)
      const presentation = practicePresentation({ board: createBoard(exercise.grid), selected: { row: 0, col: 0 }, lesson, clueStage: 0 })

      expect(lesson.methodName).toBe(exercise.methodName)
      expect(lesson.teaching.invariant.length).toBeGreaterThan(30)
      expect(lesson.unitLabels).toHaveLength(step.focusUnits.length)
      expect(presentation.cells.flat().every((cell) => cell.candidateMarks?.length === 0)).toBe(true)
      expect(presentation.cells.flat().every((cell) => !cell.state.hintUnit && !cell.state.hintSupporting && !cell.state.hintTarget)).toBe(true)
    }
  })

  it('reveals units, then bounded evidence, without revealing the answer target', () => {
    for (const exercise of practiceExercises) {
      const { lesson } = stepFor(exercise.id)
      const board = createBoard(exercise.grid)
      const located = practicePresentation({ board, selected: { row: 0, col: 0 }, lesson, clueStage: 1 })
      const proof = practicePresentation({ board, selected: { row: 0, col: 0 }, lesson, clueStage: 2 })

      expect(located.cells.flat().some((cell) => cell.state.hintUnit)).toBe(true)
      expect(located.cells.flat().every((cell) => !cell.state.hintTarget)).toBe(true)
      expect(proof.cells.flat().some((cell) => (cell.candidateMarks?.length ?? 0) > 0)).toBe(true)
      expect(proof.cells.flat().filter((cell) => (cell.candidateMarks?.length ?? 0) > 0).length).toBeLessThan(12)
      expect(proof.cells.flat().every((cell) => !cell.state.hintTarget)).toBe(true)
    }
  })

  it('reveals every answer target only after the learner requests it', () => {
    for (const exercise of practiceExercises) {
      const { lesson } = stepFor(exercise.id)
      const presentation = practicePresentation({ board: createBoard(exercise.grid), selected: { row: 0, col: 0 }, lesson, clueStage: 3 })

      expect(presentation.cells.flat().filter((cell) => cell.state.hintTarget)).toHaveLength(lesson.targetTotal)
    }
  })

  it('keeps accepted removals visible while the rest of an elimination remains available', () => {
    const { step, lesson } = stepFor('pointing-pair-1')
    const board = createBoard(practiceExercises.find((exercise) => exercise.id === 'pointing-pair-1')!.grid)
    const firstTarget = lesson.targets[0]
    board[firstTarget.row][firstTarget.col].assistantExcluded = step.removedCandidates
    const presentation = practicePresentation({ board, selected: lesson.targets[1], lesson, clueStage: 2 })

    expect(presentation.cells[firstTarget.row][firstTarget.col].candidateMarks).toEqual(step.removedCandidates?.map((digit) => ({ digit, source: 'removed' })))
    expect(presentation.cells[lesson.targets[1].row][lesson.targets[1].col].candidateMarks).toEqual(step.removedCandidates?.map((digit) => ({ digit, source: 'generated' })))
  })
})
