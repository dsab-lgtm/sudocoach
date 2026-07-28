import { createBoard, emptyGrid, gridFromString } from './board'
import { solve } from './fullSolver'
import { diagnoseMistake } from './mistakeDiagnosis'
import { describe, expect, it } from 'vitest'

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

describe('mistake diagnosis', () => {
  it('prioritizes invalid source clues and direct conflicts', () => {
    const invalid = emptyGrid()
    invalid[0][0] = 5
    invalid[0][1] = 5
    expect(diagnoseMistake({ board: createBoard(invalid), original: invalid }).kind).toBe('invalid-source-clue')

    const board = createBoard(emptyGrid())
    board[0][0].value = 8
    board[0][1].value = 8
    expect(diagnoseMistake({ board, original: emptyGrid() }).kind).toBe('direct-conflict')
  })

  it('finds exhausted candidates without requiring a solution comparison', () => {
    const board = createBoard(emptyGrid())
    for (let col = 0; col < 8; col += 1) board[0][col].value = (col + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
    board[1][8].value = 9
    expect(diagnoseMistake({ board, original: emptyGrid() }).kind).toBe('candidate-exhaustion')
  })

  it('distinguishes the selected mismatch from an earlier recorded mismatch', () => {
    const solution = solve(puzzle)!
    const board = createBoard(puzzle)
    board[0][2] = { ...board[0][2], value: 1, origin: 'manual', valueEntrySequence: 2 }
    board[0][3] = { ...board[0][3], value: 2, origin: 'manual', valueEntrySequence: 1 }
    expect(diagnoseMistake({ board, original: puzzle, solution, solutionStatus: 'unique', selected: { row: 0, col: 2 } }).kind).toBe('solution-mismatch')
    const earlier = diagnoseMistake({ board, original: puzzle, solution, solutionStatus: 'unique', selected: { row: 8, col: 8 } })
    expect(earlier.kind).toBe('earlier-mistake')
    expect(earlier.primaryCell).toEqual({ row: 0, col: 3 })
  })

  it('does not claim a mismatch for an ambiguous puzzle', () => {
    const board = createBoard(emptyGrid())
    board[0][0].value = 1
    expect(diagnoseMistake({ board, original: emptyGrid(), solution: emptyGrid(), solutionStatus: 'ambiguous' }).kind).toBe('clear')
  })
})
