import * as tf from '@tensorflow/tfjs'
import type { Digit } from '../engine/types'
import { preprocessDigit } from './digitPreprocess'
import { isDigitModelMetadata, modelMatchesMetadata, type DigitModelMetadata } from './modelMetadata'

type LoadedDigitModel = { model: tf.LayersModel; metadata: DigitModelMetadata }
let modelPromise: Promise<LoadedDigitModel | null> | null = null

const legacyPreprocess = (pixels: number[][]) => {
  const height = pixels.length; const width = pixels[0]?.length ?? 0
  const points: Array<{ x: number; y: number }> = []
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) if (pixels[y][x] < 175) points.push({ x, y })
  const values = new Float32Array(28 * 28)
  if (!points.length) return values
  const left = Math.max(0, Math.min(...points.map((point) => point.x)) - 1); const right = Math.min(width - 1, Math.max(...points.map((point) => point.x)) + 1)
  const top = Math.max(0, Math.min(...points.map((point) => point.y)) - 1); const bottom = Math.min(height - 1, Math.max(...points.map((point) => point.y)) + 1)
  const crop = pixels.slice(top, bottom + 1).map((row) => row.slice(left, right + 1))
  for (let y = 0; y < 28; y += 1) for (let x = 0; x < 28; x += 1) values[y * 28 + x] = 1 - crop[Math.min(crop.length - 1, Math.floor(y * crop.length / 28))][Math.min(crop[0].length - 1, Math.floor(x * crop[0].length / 28))] / 255
  return values
}

const loadModel = () => {
  if (!modelPromise) modelPromise = Promise.all([
    tf.loadLayersModel(`${import.meta.env.BASE_URL}models/sudoku-digits/model.json`),
    fetch(`${import.meta.env.BASE_URL}models/sudoku-digits/metadata.json`).then((response) => response.ok ? response.json() : Promise.reject(new Error('Missing model metadata.')))
  ]).then(([model, metadata]) => isDigitModelMetadata(metadata) && modelMatchesMetadata(model, metadata) ? { model, metadata } : null).catch(() => null)
  return modelPromise
}

/** Exported for preprocessing-parity regression tests and offline model tooling. */
export const preprocessDigitForModel = (pixels: number[][]) => preprocessDigit(pixels).input

let templates: Float32Array[] | null = null
const generatedTemplates = () => {
  if (templates) return templates
  const canvas = new OffscreenCanvas(56, 56)
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return []
  templates = Array.from({ length: 9 }, (_, index) => {
    context.fillStyle = '#fff'; context.fillRect(0, 0, 56, 56)
    context.fillStyle = '#000'; context.font = 'bold 45px Arial'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(String(index + 1), 28, 29)
    const data = context.getImageData(0, 0, 56, 56).data
    const raster = Array.from({ length: 56 }, (_, y) => Array.from({ length: 56 }, (_, x) => data[(y * 56 + x) * 4]))
    return preprocessDigit(raster).input
  })
  return templates
}

const templateFallback = (pixels: number[][]): { value: Digit | null; confidence: number } => {
  const input = preprocessDigit(pixels).input
  const options = generatedTemplates()
  let winner = -1; let score = -1
  for (let index = 0; index < options.length; index += 1) {
    let dot = 0; let inputNorm = 0; let templateNorm = 0
    for (let point = 0; point < input.length; point += 1) { dot += input[point] * options[index][point]; inputNorm += input[point] ** 2; templateNorm += options[index][point] ** 2 }
    const similarity = dot / Math.sqrt(Math.max(1e-9, inputNorm * templateNorm))
    if (similarity > score) { score = similarity; winner = index }
  }
  return score < 0.34 ? { value: null, confidence: Math.max(0, score) } : { value: (winner + 1) as Digit, confidence: Math.max(0, Math.min(0.72, score)) }
}

/** Classifies a cropped, grid-line-free digit. The model labels are 1 through 9. */
export const recognizeDigit = async (pixels: number[][]): Promise<{ value: Digit | null; confidence: number; modelReady: boolean; modelStatus?: DigitModelMetadata['modelStatus'] }> => {
  const preprocessed = preprocessDigit(pixels)
  const loaded = await loadModel()
  if (loaded?.metadata.preprocessingVersion === 'v1') {
    const legacy = legacyPreprocess(pixels)
    if (!Math.max(...legacy)) return { value: null, confidence: 1, modelReady: true, modelStatus: loaded.metadata.modelStatus }
    const input = tf.tensor4d(legacy, [1, 28, 28, 1]); const prediction = loaded.model.predict(input) as tf.Tensor
    const probabilities = await prediction.data(); input.dispose(); prediction.dispose()
    let bestIndex = 0
    for (let index = 1; index < probabilities.length; index += 1) if (probabilities[index] > probabilities[bestIndex]) bestIndex = index
    const confidence = probabilities[bestIndex]
    return { value: confidence >= loaded.metadata.confidenceThresholds.reject ? (bestIndex + 1) as Digit : null, confidence, modelReady: true, modelStatus: loaded.metadata.modelStatus }
  }
  if (!preprocessed.hasInk) return { value: null, confidence: 1, modelReady: true }
  if (!loaded) return { ...templateFallback(pixels), modelReady: false }
  const input = tf.tensor4d(preprocessed.input, [1, 28, 28, 1])
  const prediction = loaded.model.predict(input) as tf.Tensor
  const probabilities = await prediction.data()
  input.dispose(); prediction.dispose()
  let bestIndex = 0
  for (let index = 1; index < probabilities.length; index += 1) if (probabilities[index] > probabilities[bestIndex]) bestIndex = index
  const confidence = probabilities[bestIndex]
  return { value: confidence >= loaded.metadata.confidenceThresholds.reject ? (bestIndex + 1) as Digit : null, confidence, modelReady: true, modelStatus: loaded.metadata.modelStatus }
}
