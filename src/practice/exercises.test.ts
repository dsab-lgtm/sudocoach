import { getNextLogicalStep } from '../engine/logicalSolver'
import { nextExerciseFor, practiceExercises } from './exercises'
import { describe, expect, it } from 'vitest'

describe('curated practice exercises', () => {
  it('starts every bundled drill with its named explainable technique and a teachable action', () => {
    for (const exercise of practiceExercises) {
      const step = getNextLogicalStep(exercise.grid)
      expect(step?.technique).toBe(exercise.technique)
      expect(step?.targetCells.length).toBeGreaterThan(0)
      expect(step?.focusUnits.length).toBeGreaterThan(0)
      if (step?.action === 'place-number') expect(step.value).toBeTruthy()
      if (step?.action === 'remove-candidate') expect(step.removedCandidates?.length).toBeGreaterThan(0)
    }
  })

  it('orders the candidate lessons from pair recognition to locked candidates', () => {
    const nakedPair = practiceExercises.find((exercise) => exercise.technique === 'naked-pair')
    const pointingPair = practiceExercises.find((exercise) => exercise.technique === 'pointing-pair')
    if (!nakedPair || !pointingPair) throw new Error('Candidate practice exercises are unavailable.')

    expect(nextExerciseFor(nakedPair)?.technique).toBe('pointing-pair')
    expect(nextExerciseFor(pointingPair)?.technique).toBe('box-line-reduction')
  })
})
