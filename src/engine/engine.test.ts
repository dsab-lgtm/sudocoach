import { describe, expect, it } from 'vitest'
import { gridFromString } from './board'
import { getCandidates } from './candidates'
import { countSolutions, solve } from './fullSolver'
import { getNextLogicalStep } from './logicalSolver'
import { validatePuzzle } from './validatePuzzle'
import { photographedPuzzle, photographedPuzzleSolution } from '../test/fixtures/photographedPuzzle'

const puzzle = gridFromString(`
  53..7....
  6..195...
  .98....6.
  8...6...3
  4..8.3..1
  7...2...6
  .6....28.
  ...419..5
  ....8..79
`)

describe('Sudoku engine', () => {
  it('reports every duplicate starting clue', () => {
    const invalid = gridFromString(`
      55.......
      .........
      .........
      .........
      .........
      .........
      .........
      .........
      .........
    `)
    const result = validatePuzzle(invalid)
    expect(result.valid).toBe(false)
    expect(result.conflicts).toEqual(expect.arrayContaining([{ row: 0, col: 0 }, { row: 0, col: 1 }]))
  })

  it('finds the known unique solution deterministically', () => {
    const solution = solve(puzzle)
    expect(solution?.[0]).toEqual([5, 3, 4, 6, 7, 8, 9, 1, 2])
    expect(countSolutions(puzzle, 2)).toBe(1)
  })

  it('solves the photographed puzzle that was incorrectly rejected during scan review', () => {
    // This transcription permits multiple completions, but must never be rejected as unsolvable.
    expect(countSolutions(photographedPuzzle, 2)).toBeGreaterThan(0)
    expect(solve(photographedPuzzle)).toEqual(photographedPuzzleSolution)
  })

  it('derives candidates and returns a non-mutating next logical step', () => {
    expect(getCandidates(puzzle).get('0:2')).toEqual([1, 2, 4])
    const before = JSON.stringify(puzzle)
    const step = getNextLogicalStep(puzzle)
    expect(step).toMatchObject({ action: 'place-number', technique: 'naked-single' })
    expect(JSON.stringify(puzzle)).toBe(before)
  })
})
