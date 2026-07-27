import type { Board, BoardCell, CellPosition, Digit, Grid, Value } from './types'

export const emptyGrid = (): Grid => Array.from({ length: 9 }, () => Array<Value>(9).fill(null))

export const cloneGrid = (grid: Grid): Grid => grid.map((row) => [...row])

export const gridFromString = (input: string): Grid => {
  const values = input.replace(/[^0-9.]/g, '')
  if (values.length !== 81) throw new Error('A Sudoku grid must contain 81 cells.')
  return Array.from({ length: 9 }, (_, row) =>
    Array.from({ length: 9 }, (_, col) => {
      const value = values[row * 9 + col]
      return value === '.' || value === '0' ? null : Number(value) as Digit
    })
  )
}

export const createBoard = (givens: Grid, origin: BoardCell['origin'] = 'manual'): Board =>
  givens.map((row) => row.map((given) => ({ given, value: given, notes: [], origin: given ? origin : undefined })))

export const cloneBoard = (board: Board): Board => board.map((row) => row.map((cell) => ({ ...cell, notes: [...cell.notes] })))

export const boardValues = (board: Board): Grid => board.map((row) => row.map((cell) => cell.value))
export const boardGivens = (board: Board): Grid => board.map((row) => row.map((cell) => cell.given))

export const isSamePosition = (a: CellPosition, b: CellPosition) => a.row === b.row && a.col === b.col
export const boxIndex = ({ row, col }: CellPosition) => Math.floor(row / 3) * 3 + Math.floor(col / 3)
export const cellLabel = ({ row, col }: CellPosition) => `row ${row + 1}, column ${col + 1}`

export const peersFor = ({ row, col }: CellPosition): CellPosition[] => {
  const result: CellPosition[] = []
  for (let index = 0; index < 9; index += 1) {
    result.push({ row, col: index }, { row: index, col })
  }
  const boxRow = Math.floor(row / 3) * 3
  const boxCol = Math.floor(col / 3) * 3
  for (let boxR = boxRow; boxR < boxRow + 3; boxR += 1) {
    for (let boxC = boxCol; boxC < boxCol + 3; boxC += 1) result.push({ row: boxR, col: boxC })
  }
  return result.filter((position, index, all) => !isSamePosition(position, { row, col }) && all.findIndex((p) => isSamePosition(p, position)) === index)
}
