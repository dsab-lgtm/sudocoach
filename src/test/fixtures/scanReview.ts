import type { Digit, Grid } from '../../engine/types'
import type { ScanCell, ScanResult, SourceRegion } from '../../scanner/types'

const solution: Grid = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9]
]

const regionFor = (row: number, col: number): SourceRegion => ({ points: [
  { x: col / 9, y: row / 9 }, { x: (col + 1) / 9, y: row / 9 },
  { x: (col + 1) / 9, y: (row + 1) / 9 }, { x: col / 9, y: (row + 1) / 9 }
] })

export function scanReviewFixture(clueCount = 24, orientation: 'portrait' | 'landscape' = 'portrait'): ScanResult {
  const cells: ScanCell[] = Array.from({ length: clueCount }, (_, index) => {
    const row = Math.floor(index / 9); const col = index % 9
    return { row, col, value: solution[row][col] as Digit, confidence: index === clueCount - 1 ? .62 : .98, inkRatio: .2, sourceRegion: regionFor(row, col) }
  })
  const grid = Array.from({ length: 9 }, () => Array<Digit | null>(9).fill(null))
  cells.forEach((cell) => { grid[cell.row][cell.col] = cell.value })
  const [width, height] = orientation === 'portrait' ? [900, 1400] : [1400, 900]
  return { grid, cells, image: { width, height, bounds: { x: 0, y: 0, size: Math.min(width, height) } }, diagnostics: [], modelStatus: 'production', confidencePolicy: { reviewThreshold: .8 } }
}

export const portraitScanReviewFixture = scanReviewFixture(24, 'portrait')
export const landscapeScanReviewFixture = scanReviewFixture(24, 'landscape')
