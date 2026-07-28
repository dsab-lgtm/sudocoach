export const DIGIT_MODEL_PREPROCESSING_VERSION = 'v2' as const
type SupportedPreprocessingVersion = 'v1' | typeof DIGIT_MODEL_PREPROCESSING_VERSION

type ModelMetadataBase = {
  modelStatus: 'production' | 'experimental'
  inputShape: [28, 28, 1]
  preprocessingVersion: SupportedPreprocessingVersion
  confidenceThresholds: { reject: number; review: number }
  /** Optional post-hoc temperature applied to model probabilities at runtime. */
  calibration?: { temperature: number }
  metrics: { realPhotoAccuracy: number; minimumClassRecall: number; aggregate?: { meanAccuracy: number; worstAccuracy: number; meanMinimumClassRecall: number } }
  source: { trainingRun: string; sha256: string }
}

export type NineClassDigitModelMetadata = ModelMetadataBase & {
  schemaVersion: 1
  labels: [1, 2, 3, 4, 5, 6, 7, 8, 9]
}

export type BlankAwareDigitModelMetadata = ModelMetadataBase & {
  schemaVersion: 2
  labels: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
}

export type DigitModelMetadata = NineClassDigitModelMetadata | BlankAwareDigitModelMetadata

type ModelSignature = { inputs: Array<{ shape: Array<number | null> }>; outputs: Array<{ shape: Array<number | null> }> }

const labelsAreOrdered = (labels: unknown, start: number, count: number) => Array.isArray(labels) && labels.length === count && labels.every((label, index) => label === start + index)
const shapeEquals = (shape: Array<number | null> | undefined, expected: number[]) => Boolean(shape && shape.length === expected.length + 1 && shape.slice(1).every((value, index) => value === expected[index]))

export const isDigitModelMetadata = (value: unknown): value is DigitModelMetadata => {
  if (!value || typeof value !== 'object') return false
  const metadata = value as Partial<DigitModelMetadata>
  const validSchema = metadata.schemaVersion === 1
    ? labelsAreOrdered(metadata.labels, 1, 9)
    : metadata.schemaVersion === 2 && labelsAreOrdered(metadata.labels, 0, 10)
  return validSchema
    && (metadata.modelStatus === 'production' || metadata.modelStatus === 'experimental')
    && Array.isArray(metadata.inputShape) && metadata.inputShape.join(',') === '28,28,1'
    && (metadata.preprocessingVersion === 'v1' || metadata.preprocessingVersion === DIGIT_MODEL_PREPROCESSING_VERSION)
    && typeof metadata.confidenceThresholds?.reject === 'number' && typeof metadata.confidenceThresholds.review === 'number'
    && metadata.confidenceThresholds.reject >= 0 && metadata.confidenceThresholds.reject < metadata.confidenceThresholds.review && metadata.confidenceThresholds.review <= 1
    && (metadata.calibration === undefined || (typeof metadata.calibration.temperature === 'number' && Number.isFinite(metadata.calibration.temperature) && metadata.calibration.temperature > 0))
    && typeof metadata.metrics?.realPhotoAccuracy === 'number' && typeof metadata.metrics.minimumClassRecall === 'number'
    && typeof metadata.source?.trainingRun === 'string' && typeof metadata.source.sha256 === 'string'
}

export const modelMatchesMetadata = (model: ModelSignature, metadata: DigitModelMetadata) =>
  shapeEquals(model.inputs[0]?.shape, metadata.inputShape) && shapeEquals(model.outputs[0]?.shape, [metadata.labels.length])

export const isBlankAwareDigitModel = (metadata: DigitModelMetadata): metadata is BlankAwareDigitModelMetadata => metadata.schemaVersion === 2
