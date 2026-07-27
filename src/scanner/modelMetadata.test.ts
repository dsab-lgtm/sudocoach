import { describe, expect, it } from 'vitest'
import { DIGIT_MODEL_PREPROCESSING_VERSION, isDigitModelMetadata, modelMatchesMetadata } from './modelMetadata'

const metadata = {
  schemaVersion: 1 as const,
  modelStatus: 'production' as const,
  inputShape: [28, 28, 1] as [28, 28, 1],
  labels: [1, 2, 3, 4, 5, 6, 7, 8, 9] as [1, 2, 3, 4, 5, 6, 7, 8, 9],
  preprocessingVersion: DIGIT_MODEL_PREPROCESSING_VERSION,
  confidenceThresholds: { reject: 0.55, review: 0.8 },
  metrics: { realPhotoAccuracy: 0.97, minimumClassRecall: 0.95 },
  source: { trainingRun: 'test', sha256: 'abc' }
}

describe('digit-model metadata', () => {
  it('accepts the deployed model contract', () => expect(isDigitModelMetadata(metadata)).toBe(true))
  it('requires an explicit production or experimental status', () => expect(isDigitModelMetadata({ ...metadata, modelStatus: 'preview' })).toBe(false))
  it('requires ordered one-through-nine labels', () => expect(isDigitModelMetadata({ ...metadata, labels: [0, 1, 2, 3, 4, 5, 6, 7, 8] })).toBe(false))
  it('checks TensorFlow input and output shapes', () => {
    expect(modelMatchesMetadata({ inputs: [{ shape: [null, 28, 28, 1] }], outputs: [{ shape: [null, 9] }] }, metadata)).toBe(true)
    expect(modelMatchesMetadata({ inputs: [{ shape: [null, 784] }], outputs: [{ shape: [null, 9] }] }, metadata)).toBe(false)
  })
})
