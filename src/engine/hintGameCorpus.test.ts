import { boardValues, cloneBoard, createBoard } from './board'
import { applyAssistantElimination, effectiveCandidates, getCandidateState } from './candidates'
import { countSolutions } from './fullSolver'
import { getHintOutcome } from './hintEngine'
import type { Board, SolverStep } from './types'
import { boxLineReductionDrill, completeHintGames } from '../test/fixtures/hintGameCorpus'
import { describe, expect, it } from 'vitest'

const traceStep = (step: SolverStep) => step.action === 'place-number'
  ? `${step.technique}:${step.targetCells[0].row},${step.targetCells[0].col}=${step.value}`
  : `${step.technique}:${step.targetCells.map((target) => `${target.row},${target.col}`).join('|')}-${step.removedCandidates?.join(',')}`

const applyStep = (board: Board, step: SolverStep): Board => {
  if (step.action === 'remove-candidate') return applyAssistantElimination(board, step)
  const next = cloneBoard(board)
  const target = step.targetCells[0]
  next[target.row][target.col] = { ...next[target.row][target.col], value: step.value!, origin: 'hint' }
  return next
}

describe('hint game corpus', () => {
  it('replays every complete, unique game through its exact safe trace', () => {
    for (const game of completeHintGames) {
      expect(countSolutions(game.grid, 2), game.id).toBe(1)
      let board = createBoard(game.grid)
      const trace: string[] = []

      for (const expected of game.expectedTrace) {
        const candidateMap = effectiveCandidates(getCandidateState(boardValues(board), board))
        const outcome = getHintOutcome({ board, original: game.grid, solution: game.solution, solutionStatus: 'unique', candidateMap })
        expect(outcome.kind, `${game.id} before ${expected}`).toBe('step')
        if (outcome.kind !== 'step') throw new Error(`Expected a hint step for ${game.id}.`)
        const { step } = outcome
        trace.push(traceStep(step))
        expect(trace.at(-1), game.id).toBe(expected)
        if (step.action === 'place-number') expect(game.solution[step.targetCells[0].row][step.targetCells[0].col], game.id).toBe(step.value)
        else for (const target of step.targetCells) expect(step.removedCandidates, game.id).not.toContain(game.solution[target.row][target.col])
        board = applyStep(board, step)
      }

      expect(trace, game.id).toEqual(game.expectedTrace)
      expect(boardValues(board), game.id).toEqual(game.solution)
      expect(getHintOutcome({ board, original: game.grid, solution: game.solution, solutionStatus: 'unique' }), game.id).toEqual({ kind: 'complete' })
    }
  })

  it('replays the documented box-line reduction then reports the technique boundary', () => {
    let board = createBoard(boxLineReductionDrill.grid)
    const candidateMap = effectiveCandidates(getCandidateState(boardValues(board), board))
    const first = getHintOutcome({ board, original: boxLineReductionDrill.grid, candidateMap })
    expect(first.kind).toBe('step')
    if (first.kind !== 'step') throw new Error('Expected a box-line reduction.')
    expect(traceStep(first.step)).toBe(boxLineReductionDrill.expectedTrace[0])
    board = applyStep(board, first.step)

    expect(getHintOutcome({
      board,
      original: boxLineReductionDrill.grid,
      candidateMap: effectiveCandidates(getCandidateState(boardValues(board), board))
    })).toEqual({ kind: 'technique-limit' })
  })
})
