import { createBoard, emptyGrid, gridFromString } from './board'
import { applyAssistantElimination, getCandidateState, effectiveCandidates, getCandidates } from './candidates'
import { solve } from './fullSolver'
import { getNextLogicalStep } from './logicalSolver'
import { getHintOutcome } from './hintEngine'
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

const nearlyComplete = gridFromString(`
.34678912
672195348
198342567
859761423
426853791
713924856
961537284
287419635
345286179
`)

describe('getHintOutcome', () => {
  it('pauses before hinting when a legal-looking entry disagrees with a verified unique solution', () => {
    const board = createBoard(puzzle)
    board[0][2] = { ...board[0][2], value: 1, origin: 'manual', valueEntrySequence: 1 }

    expect(getHintOutcome({ board, original: puzzle, solution: solve(puzzle)!, solutionStatus: 'unique' })).toMatchObject({
      kind: 'recovery',
      diagnosis: { kind: 'earlier-mistake', primaryCell: { row: 0, col: 2 } }
    })
  })

  it('falls back to legal candidates instead of exposing a stale assisted placement', () => {
    const board = createBoard(nearlyComplete)
    const staleCandidates = getCandidates(nearlyComplete)
    staleCandidates.set('0:0', [9])

    expect(getHintOutcome({ board, original: nearlyComplete, solution: solve(nearlyComplete)!, solutionStatus: 'unique', candidateMap: staleCandidates })).toMatchObject({
      kind: 'step',
      step: { action: 'place-number', targetCells: [{ row: 0, col: 0 }], value: 5 }
    })
  })

  it('never claims a mismatch for an ambiguous puzzle', () => {
    const board = createBoard(emptyGrid())
    board[0][0] = { ...board[0][0], value: 1, origin: 'manual', valueEntrySequence: 1 }

    expect(getHintOutcome({ board, original: emptyGrid() }).kind).not.toBe('recovery')
  })

  it('reports a completed board without requesting another logical step', () => {
    const solution = solve(puzzle)!
    expect(getHintOutcome({ board: createBoard(solution), original: puzzle, solution, solutionStatus: 'unique' })).toEqual({ kind: 'complete' })
  })

  it('reports the supported-technique limit after an accepted box-line reduction', () => {
    const drill = gridFromString('.3..789....2.95......3.2..7..9.....342....7...139..............28......5..52.....')
    const firstStep = getNextLogicalStep(drill)
    if (!firstStep) throw new Error('Expected the box-line drill to have a first step.')
    const board = applyAssistantElimination(createBoard(drill), firstStep)
    const candidateMap = effectiveCandidates(getCandidateState(drill, board))

    expect(getHintOutcome({ board, original: drill, candidateMap })).toEqual({ kind: 'technique-limit' })
  })
})
