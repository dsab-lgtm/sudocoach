import type { Grid } from '../engine/types'
import { preprocessDigit } from './digitPreprocess'
import { recognizeDigit } from './digitModel'
import { type GrayImage } from './grayImage'
import { rectifyWithOpenCv } from './opencvGrid'
import type { ScanCell, ScanResult } from './types'

const mean = (values: number[]) => values.reduce((total, value) => total + value, 0) / Math.max(values.length, 1)

const gridLines = (image: GrayImage, bounds: { x: number; y: number; size: number }, vertical: boolean) => {
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

const classifyCells = async (image: GrayImage, bounds: { x: number; y: number; size: number }): Promise<{ cells: ScanCell[]; modelReady: boolean; modelStatus?: 'production' | 'experimental' }> => {
  const cells: ScanCell[] = []
  let modelReady = true
  let modelStatus: 'production' | 'experimental' | undefined
  const verticalLines = gridLines(image, bounds, true); const horizontalLines = gridLines(image, bounds, false)
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
    const preparation = preprocessDigit(pixels)
    const recognition = preparation.hasInk ? await recognizeDigit(pixels) : { value: null, confidence: 1, modelReady: true }
    if (!recognition.modelReady) modelReady = false
    if (recognition.modelStatus) modelStatus = recognition.modelStatus
    cells.push({ row, col, value: recognition.value, confidence: recognition.confidence, inkRatio: preparation.inkRatio })
  }
  return { cells, modelReady, modelStatus }
}

export const scanGrayImage = async (normalized: GrayImage): Promise<ScanResult> => {
  const rectified = await rectifyWithOpenCv(normalized)
  const working = rectified ?? normalized
  const bounds = rectified ? { x: 0, y: 0, size: rectified.width } : detectSquareBounds(working)
  if (!bounds) return {
    grid: Array.from({ length: 9 }, () => Array(9).fill(null)), cells: [], image: { width: working.width, height: working.height, bounds: { x: 0, y: 0, size: 0 } },
    diagnostics: [{ code: 'grid-not-found', message: 'We could not find a clear square Sudoku grid. Try a brighter, closer photo.', recoverable: true }]
  }
  const { cells, modelReady, modelStatus } = await classifyCells(working, bounds)
  const grid: Grid = Array.from({ length: 9 }, () => Array(9).fill(null))
  cells.forEach((cell) => { grid[cell.row][cell.col] = cell.value })
  return {
    grid, cells, image: { width: working.width, height: working.height, bounds },
    modelStatus,
    diagnostics: [
      ...(modelReady ? [] : [{ code: 'model-unavailable' as const, message: 'The digit model is unavailable, so enter or correct the clues manually.', recoverable: true }]),
      ...(modelStatus === 'experimental' ? [{ code: 'model-experimental' as const, message: 'Experimental digit model: inspect every detected clue before confirming.', recoverable: true }] : [])
    ]
  }
}
