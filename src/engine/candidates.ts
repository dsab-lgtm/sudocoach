import { peersFor } from './board'
import { DIGITS, type CellPosition, type Digit, type Grid } from './types'

export type CandidateMap = Map<string, Digit[]>
export const candidateKey = ({ row, col }: CellPosition) => `${row}:${col}`

export const candidatesFor = (grid: Grid, position: CellPosition): Digit[] => {
  if (grid[position.row][position.col]) return []
  const used = new Set(peersFor(position).map((peer) => grid[peer.row][peer.col]).filter(Boolean))
  return DIGITS.filter((digit) => !used.has(digit))
}

export const getCandidates = (grid: Grid): CandidateMap => {
  const result: CandidateMap = new Map()
  for (let row = 0; row < 9; row += 1) for (let col = 0; col < 9; col += 1) {
    if (!grid[row][col]) result.set(candidateKey({ row, col }), candidatesFor(grid, { row, col }))
  }
  return result
}
