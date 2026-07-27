import { boxIndex } from './board'
import type { CellPosition, Grid, ValidationResult } from './types'

const unitPositions = (kind: 'row' | 'column' | 'box', index: number): CellPosition[] => {
  if (kind === 'row') return Array.from({ length: 9 }, (_, col) => ({ row: index, col }))
  if (kind === 'column') return Array.from({ length: 9 }, (_, row) => ({ row, col: index }))
  const row = Math.floor(index / 3) * 3
  const col = (index % 3) * 3
  return Array.from({ length: 9 }, (_, offset) => ({ row: row + Math.floor(offset / 3), col: col + (offset % 3) }))
}

export const validatePuzzle = (grid: Grid): ValidationResult => {
  const conflicts = new Set<string>()
  const units: Array<'row' | 'column' | 'box'> = ['row', 'column', 'box']
  for (const kind of units) {
    for (let index = 0; index < 9; index += 1) {
      const values = new Map<number, CellPosition[]>()
      for (const position of unitPositions(kind, index)) {
        const value = grid[position.row][position.col]
        if (value) values.set(value, [...(values.get(value) ?? []), position])
      }
      values.forEach((positions) => {
        if (positions.length > 1) positions.forEach(({ row, col }) => conflicts.add(`${row}:${col}`))
      })
    }
  }
  return { valid: conflicts.size === 0, conflicts: [...conflicts].map((key) => {
    const [row, col] = key.split(':').map(Number)
    return { row, col }
  }) }
}

export const isComplete = (grid: Grid) => grid.every((row) => row.every(Boolean))
export const getBoxIndex = (position: CellPosition) => boxIndex(position)
