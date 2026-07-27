export const DIGIT_MODEL_PREPROCESSING_VERSION = 'v2' as const
type SupportedPreprocessingVersion = 'v1' | typeof DIGIT_MODEL_PREPROCESSING_VERSION

export type DigitModelMetadata = {
  schemaVersion: 1
  modelStatus: 'production' | 'experimental'
  inputShape: [28, 28, 1]
  labels: [1, 2, 3, 4, 5, 6, 7, 8, 9]
  preprocessingVersion: SupportedPreprocessingVersion
  confidenceThresholds: { reject: number; review: number }
  metrics: { realPhotoAccuracy: number; minimumClassRecall: number; aggregate?: { meanAccuracy: number; worstAccuracy: number; meanMinimumClassRecall: number } }
  source: { trainingRun: string; sha256: string }
}

type ModelSignature = { inputs: Array<{ shape: Array<number | null> }>; outputs: Array<{ shape: Array<number | null> }> }

const labelsAreOrdered = (labels: number[]) => labels.length === 9 && labels.every((label, index) => label === index + 1)
const shapeEquals = (shape: Array<number | null> | undefined, expected: number[]) => Boolean(shape && shape.length === expected.length + 1 && shape.slice(1).every((value, index) => value === expected[index]))

export const isDigitModelMetadata = (value: unknown): value is DigitModelMetadata => {
  if (!value || typeof value !== 'object') return false
  const metadata = value as Partial<DigitModelMetadata>
  return metadata.schemaVersion === 1
    && (metadata.modelStatus === 'production' || metadata.modelStatus === 'experimental')
    && Array.isArray(metadata.inputShape) && metadata.inputShape.join(',') === '28,28,1'
    && Array.isArray(metadata.labels) && labelsAreOrdered(metadata.labels)
    && (metadata.preprocessingVersion === 'v1' || metadata.preprocessingVersion === DIGIT_MODEL_PREPROCESSING_VERSION)
    && typeof metadata.confidenceThresholds?.reject === 'number' && typeof metadata.confidenceThresholds.review === 'number'
    && metadata.confidenceThresholds.reject >= 0 && metadata.confidenceThresholds.reject < metadata.confidenceThresholds.review && metadata.confidenceThresholds.review <= 1
    && typeof metadata.metrics?.realPhotoAccuracy === 'number' && typeof metadata.metrics.minimumClassRecall === 'number'
    && typeof metadata.source?.trainingRun === 'string' && typeof metadata.source.sha256 === 'string'
}

export const modelMatchesMetadata = (model: ModelSignature, metadata: DigitModelMetadata) =>
  shapeEquals(model.inputs[0]?.shape, metadata.inputShape) && shapeEquals(model.outputs[0]?.shape, [9])
