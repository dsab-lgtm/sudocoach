import { gridFromString } from '../../engine/board'
import type { Grid } from '../../engine/types'
import type { ScanResult } from '../../scanner/types'

/** The Sudoku shown in IMG_4231.PNG, transcribed row by row. */
export const photographedPuzzle = gridFromString(`
  6....18..
  .....7..5
  .5.628..4
  38...6.4.
  .2185976.
  .7.4...82
  2..365.1.
  1..7.....
  ..41....8
`)

export const photographedPuzzleSolution: Grid = [
  [6, 4, 2, 5, 3, 1, 8, 7, 9],
  [8, 1, 3, 9, 4, 7, 6, 2, 5],
  [9, 5, 7, 6, 2, 8, 1, 3, 4],
  [3, 8, 9, 2, 7, 6, 5, 4, 1],
  [4, 2, 1, 8, 5, 9, 7, 6, 3],
  [5, 7, 6, 4, 1, 3, 9, 8, 2],
  [2, 9, 8, 3, 6, 5, 4, 1, 7],
  [1, 3, 5, 7, 8, 4, 2, 9, 6],
  [7, 6, 4, 1, 9, 2, 3, 5, 8]
]

export const photographedPuzzleScanResult: ScanResult = {
  grid: photographedPuzzle.map((row) => [...row]),
  cells: photographedPuzzle.flatMap((row, rowIndex) => row.flatMap((value, col) =>
    value ? [{ row: rowIndex, col, value, confidence: 0.99, inkRatio: 0.2 }] : []
  )),
  image: { width: 900, height: 900, bounds: { x: 0, y: 0, size: 900 } },
  diagnostics: [],
  modelStatus: 'production'
}
