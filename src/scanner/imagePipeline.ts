import type { Grid } from '../engine/types'
import { preprocessDigit } from './digitPreprocess'
import { recognizeDigits } from './digitModel'
import { type GrayImage } from './grayImage'
import { rectifyWithOpenCv, type SourceCorner } from './opencvGrid'
import type { ScanCell, ScanProgressListener, ScanResult, SourcePoint, SourceRegion } from './types'

const mean = (values: number[]) => values.reduce((total, value) => total + value, 0) / Math.max(values.length, 1)

type Bounds = { x: number; y: number; size: number }

const solveLinearSystem = (matrix: number[][], values: number[]) => {
  const augmented = matrix.map((row, index) => [...row, values[index]])
  for (let pivot = 0; pivot < augmented.length; pivot += 1) {
    let best = pivot
    for (let row = pivot + 1; row < augmented.length; row += 1) if (Math.abs(augmented[row][pivot]) > Math.abs(augmented[best][pivot])) best = row
    if (Math.abs(augmented[best][pivot]) < 1e-9) return null
    ;[augmented[pivot], augmented[best]] = [augmented[best], augmented[pivot]]
    const divisor = augmented[pivot][pivot]
    for (let column = pivot; column <= augmented.length; column += 1) augmented[pivot][column] /= divisor
    for (let row = 0; row < augmented.length; row += 1) {
      if (row === pivot) continue
      const factor = augmented[row][pivot]
      for (let column = pivot; column <= augmented.length; column += 1) augmented[row][column] -= factor * augmented[pivot][column]
    }
  }
  return augmented.map((row) => row.at(-1) ?? 0)
}

/** Maps the unit square back onto the detected source quadrilateral. */
const sourceProjector = (corners: readonly SourceCorner[]) => {
  const unitCorners: ReadonlyArray<[number, number]> = [[0, 0], [1, 0], [1, 1], [0, 1]]
  const matrix: number[][] = []
  const values: number[] = []
  unitCorners.forEach(([u, v], index) => {
    const { x, y } = corners[index]
    matrix.push([u, v, 1, 0, 0, 0, -x * u, -x * v]); values.push(x)
    matrix.push([0, 0, 0, u, v, 1, -y * u, -y * v]); values.push(y)
  })
  const coefficients = solveLinearSystem(matrix, values)
  if (!coefficients) return null
  return (u: number, v: number): SourcePoint => {
    const [a, b, c, d, e, f, g, h] = coefficients
    const denominator = g * u + h * v + 1
    return { x: (a * u + b * v + c) / denominator, y: (d * u + e * v + f) / denominator }
  }
}

export const sourceRegionFor = (row: number, col: number, image: GrayImage, bounds: Bounds, sourceCorners?: readonly SourceCorner[]): SourceRegion | undefined => {
  const project = sourceCorners ? sourceProjector(sourceCorners) : null
  const point = (u: number, v: number) => {
    const source = project ? project(u, v) : { x: bounds.x + u * bounds.size, y: bounds.y + v * bounds.size }
    return { x: Math.min(1, Math.max(0, source.x / image.width)), y: Math.min(1, Math.max(0, source.y / image.height)) }
  }
  const left = col / 9; const top = row / 9; const right = (col + 1) / 9; const bottom = (row + 1) / 9
  return { points: [point(left, top), point(right, top), point(right, bottom), point(left, bottom)] }
}

const gridLines = (image: GrayImage, bounds: Bounds, vertical: boolean) => {
  const average = mean([...image.pixels]); const threshold = Math.min(210, average * 0.86)
  const length = vertical ? image.width : image.height; const crossLength = vertical ? image.height : image.width
  const projection = Array.from({ length }, (_, primary) => {
    let dark = 0
    for (let secondary = 0; secondary < crossLength; secondary += 1) if (image.pixels[vertical ? secondary * image.width + primary : primary * image.width + secondary] < threshold) dark += 1
    return dark
  })
  const radius = Math.max(4, Math.round(bounds.size / 24))
  const lines = Array.from({ length: 10 }, (_, index) => {
    const expected = Math.round((vertical ? bounds.x : bounds.y) + index * bounds.size / 9)
    let best = expected
    for (let candidate = Math.max(0, expected - radius); candidate <= Math.min(length - 1, expected + radius); candidate += 1) if (projection[candidate] > projection[best]) best = candidate
    return best
  })
  const minimumGap = bounds.size / 18
  return lines.every((line, index) => index === 0 || line - lines[index - 1] >= minimumGap) ? lines : null
}

/** Finds the bounds of a mostly front-on, square printed Sudoku grid using dark-pixel projections. */
const detectSquareBounds = (image: GrayImage) => {
  const luminance = mean([...image.pixels])
  const threshold = Math.min(185, luminance * 0.78)
  const columns = Array.from({ length: image.width }, (_, x) => {
    let count = 0
    for (let y = 0; y < image.height; y += 1) if (image.pixels[y * image.width + x] < threshold) count += 1
    return count / image.height
  })
  const rows = Array.from({ length: image.height }, (_, y) => {
    let count = 0
    for (let x = 0; x < image.width; x += 1) if (image.pixels[y * image.width + x] < threshold) count += 1
    return count / image.width
  })
  const activeColumns = columns.map((value, index) => value > 0.055 ? index : -1).filter((value) => value >= 0)
  const activeRows = rows.map((value, index) => value > 0.055 ? index : -1).filter((value) => value >= 0)
  if (!activeColumns.length || !activeRows.length) return null
  const left = activeColumns[0]
  const right = activeColumns.at(-1) ?? left
  const top = activeRows[0]
  const bottom = activeRows.at(-1) ?? top
  const rawWidth = right - left + 1
  const rawHeight = bottom - top + 1
  const size = Math.min(rawWidth, rawHeight)
  if (size < Math.min(image.width, image.height) * 0.3 || Math.max(rawWidth, rawHeight) / size > 1.32) return null
  return { x: Math.max(0, Math.round(left + (rawWidth - size) / 2)), y: Math.max(0, Math.round(top + (rawHeight - size) / 2)), size }
}

const classifyCells = async (image: GrayImage, sourceImage: GrayImage, bounds: Bounds, sourceCorners?: readonly SourceCorner[], onProgress?: ScanProgressListener): Promise<{ cells: ScanCell[]; modelReady: boolean; modelStatus?: 'production' | 'experimental'; reviewThreshold?: number }> => {
  let modelReady = true
  let modelStatus: 'production' | 'experimental' | undefined
  let reviewThreshold: number | undefined
  const verticalLines = gridLines(image, bounds, true); const horizontalLines = gridLines(image, bounds, false)
  const segments: Array<{ row: number; col: number; pixels: number[][]; inkRatio: number }> = []
  for (let row = 0; row < 9; row += 1) for (let col = 0; col < 9; col += 1) {
    const left = verticalLines?.[col] ?? bounds.x + col * bounds.size / 9; const right = verticalLines?.[col + 1] ?? bounds.x + (col + 1) * bounds.size / 9
    const top = horizontalLines?.[row] ?? bounds.y + row * bounds.size / 9; const bottom = horizontalLines?.[row + 1] ?? bounds.y + (row + 1) * bounds.size / 9
    const padding = Math.max(2, Math.round(Math.min(right - left, bottom - top) * 0.14))
    const startX = Math.max(0, Math.floor(left + padding))
    const endX = Math.min(image.width, Math.ceil(right - padding))
    const startY = Math.max(0, Math.floor(top + padding))
    const endY = Math.min(image.height, Math.ceil(bottom - padding))
    const pixels: number[][] = []
    for (let y = startY; y < endY; y += 1) {
      const line: number[] = []
      for (let x = startX; x < endX; x += 1) {
        const value = image.pixels[y * image.width + x]
        line.push(value)
      }
      pixels.push(line)
    }
    segments.push({ row, col, pixels, inkRatio: preprocessDigit(pixels).inkRatio })
  }
  onProgress?.({ stage: 'recognizing', completed: 0, total: segments.length })
  const recognitions = await recognizeDigits(segments.map((segment) => segment.pixels))
  const cells: ScanCell[] = []
  recognitions.forEach((recognition, index) => {
    const segment = segments[index]
    if (!recognition.modelReady) modelReady = false
    if (recognition.modelStatus) modelStatus = recognition.modelStatus
    if (recognition.reviewThreshold !== undefined) reviewThreshold = recognition.reviewThreshold
    // OpenCV corners are measured in the decoded source image, not the
    // rectified 900px working image. Keep regions in that preview coordinate
    // system so portrait and landscape source evidence stays aligned.
    cells.push({ row: segment.row, col: segment.col, value: recognition.value, confidence: recognition.confidence, inkRatio: segment.inkRatio, sourceRegion: sourceRegionFor(segment.row, segment.col, sourceImage, bounds, sourceCorners) })
  })
  onProgress?.({ stage: 'recognizing', completed: segments.length, total: segments.length })
  return { cells, modelReady, modelStatus, reviewThreshold }
}

export const scanGrayImage = async (normalized: GrayImage, onProgress?: ScanProgressListener): Promise<ScanResult> => {
  onProgress?.({ stage: 'grid-detection' })
  const rectified = await rectifyWithOpenCv(normalized)
  const working = rectified ?? normalized
  const bounds = rectified ? { x: 0, y: 0, size: rectified.width } : detectSquareBounds(working)
  if (!bounds) return {
    grid: Array.from({ length: 9 }, () => Array(9).fill(null)), cells: [], image: { width: working.width, height: working.height, bounds: { x: 0, y: 0, size: 0 } },
    diagnostics: [{ code: 'grid-not-found', message: 'We could not find a clear square Sudoku grid. Try a brighter, closer photo.', recoverable: true }]
  }
  const { cells, modelReady, modelStatus, reviewThreshold } = await classifyCells(working, normalized, bounds, rectified?.sourceCorners, onProgress)
  const grid: Grid = Array.from({ length: 9 }, () => Array(9).fill(null))
  cells.forEach((cell) => { grid[cell.row][cell.col] = cell.value })
  onProgress?.({ stage: 'preparing-review' })
  return {
    grid, cells, image: { width: working.width, height: working.height, bounds },
    modelStatus,
    ...(reviewThreshold === undefined ? {} : { confidencePolicy: { reviewThreshold } }),
    diagnostics: [
      ...(modelReady ? [] : [{ code: 'model-unavailable' as const, message: 'The digit model is unavailable, so enter or correct the clues manually.', recoverable: true }])
    ]
  }
}
