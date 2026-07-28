import { getNextLogicalStep } from '../engine/logicalSolver'
import { practiceExercises } from './exercises'
import { describe, expect, it } from 'vitest'

describe('curated practice exercises', () => {
  it('starts every bundled drill with its named explainable technique', () => {
    for (const exercise of practiceExercises) expect(getNextLogicalStep(exercise.grid)?.technique).toBe(exercise.technique)
  })
})
