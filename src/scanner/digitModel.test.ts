import { describe, expect, it } from 'vitest'
import { preprocessDigit } from './digitPreprocess'
import { preprocessDigitForModel, recognitionForProbabilities } from './digitModel'
import type { DigitModelMetadata } from './modelMetadata'

const blankAwareMetadata: DigitModelMetadata = {
  schemaVersion: 2,
  modelStatus: 'experimental',
  inputShape: [28, 28, 1],
  labels: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  preprocessingVersion: 'v2',
  confidenceThresholds: { reject: .6, review: .8 },
  calibration: { temperature: 1 },
  metrics: { realPhotoAccuracy: .8, minimumClassRecall: .6 },
  source: { trainingRun: 'test', sha256: 'test' }
}

describe('digit preprocessing', () => {
  it('centres usable ink and produces the 28×28 inverted model input', () => {
    const pixels = Array.from({ length: 24 }, (_, row) => Array.from({ length: 24 }, (_, column) => column >= 10 && column <= 13 && row >= 5 && row <= 18 ? 0 : 255))
    const output = preprocessDigitForModel(pixels)
    expect(output).toHaveLength(28 * 28)
    expect(Math.max(...output)).toBe(1)
    expect(Math.min(...output)).toBe(0)
    expect(preprocessDigit(pixels).hasInk).toBe(true)
  })

  it('rejects border-only grid-line leakage and blank cells', () => {
    const gridLine = Array.from({ length: 40 }, (_, row) => Array.from({ length: 40 }, (_, column) => row < 2 || column < 2 ? 0 : 255))
    expect(preprocessDigit(gridLine).hasInk).toBe(false)
    expect(preprocessDigit(Array.from({ length: 20 }, () => Array(20).fill(238))).hasInk).toBe(false)
  })

  it('maps a blank-aware model prediction to no digit and decodes digit labels', () => {
    expect(recognitionForProbabilities(blankAwareMetadata, [0.8, 0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.02]).value).toBeNull()
    expect(recognitionForProbabilities(blankAwareMetadata, [0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, .91])).toMatchObject({ value: 9, confidence: .91 })
  })
})
