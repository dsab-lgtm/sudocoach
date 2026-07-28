import { cloneGrid } from './board'
import { candidatesFor } from './candidates'
import { validatePuzzle } from './validatePuzzle'
import type { CellPosition, Grid, SolutionStatus } from './types'

const chooseCell = (grid: Grid): CellPosition | null => {
  let best: CellPosition | null = null
  let bestLength = 10
  for (let row = 0; row < 9; row += 1) for (let col = 0; col < 9; col += 1) {
    if (grid[row][col]) continue
    const length = candidatesFor(grid, { row, col }).length
    if (length < bestLength) { best = { row, col }; bestLength = length }
  }
  return best
}

const search = (grid: Grid, solutions: Grid[], limit: number): void => {
  if (solutions.length >= limit) return
  const cell = chooseCell(grid)
  if (!cell) { solutions.push(cloneGrid(grid)); return }
  for (const value of candidatesFor(grid, cell)) {
    grid[cell.row][cell.col] = value
    search(grid, solutions, limit)
    grid[cell.row][cell.col] = null
    if (solutions.length >= limit) return
  }
}

export const findSolutions = (grid: Grid, limit = 2): Grid[] => {
  if (!validatePuzzle(grid).valid) return []
  const solutions: Grid[] = []
  search(cloneGrid(grid), solutions, Math.max(1, limit))
  return solutions
}

export const countSolutions = (grid: Grid, limit = 2) => findSolutions(grid, limit).length
export const solve = (grid: Grid): Grid | null => findSolutions(grid, 1)[0] ?? null

export type SolutionAnalysis = {
  status: Exclude<SolutionStatus, 'unknown'>
  solution?: Grid
}

/** Never treats the first solution as authoritative when the puzzle is ambiguous. */
export const analyzeSolutions = (grid: Grid): SolutionAnalysis => {
  if (!validatePuzzle(grid).valid) return { status: 'invalid' }
  const solutions = findSolutions(grid, 2)
  if (!solutions.length) return { status: 'unsolvable' }
  if (solutions.length > 1) return { status: 'ambiguous' }
  return { status: 'unique', solution: solutions[0] }
}
