import { gridFromString } from '../../engine/board'
import type { Grid } from '../../engine/types'

const solution = gridFromString(`
534678912
672195348
198342567
859761423
426853791
713924856
961537284
287419635
345286179
`)

const trace = (steps: string) => steps.trim().split(/\s+/)

export type HintGame = {
  id: string
  grid: Grid
  solution: Grid
  expectedTrace: readonly string[]
}

/**
 * Unique benchmark games derived from a solved classic grid and verified with
 * countSolutions(..., 2). Each string fixes the complete deterministic trace.
 */
export const completeHintGames: readonly HintGame[] = [
  {
    id: 'classic-naked-single-51',
    grid: gridFromString('53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79'),
    solution,
    expectedTrace: trace(`
      naked-single:6,5=7 naked-single:7,7=3 naked-single:7,0=2 naked-single:7,2=7 naked-single:7,1=8 naked-single:2,0=1 naked-single:4,4=5 naked-single:5,3=9 naked-single:4,1=2 naked-single:3,3=7 naked-single:4,7=9 naked-single:4,6=7 naked-single:4,2=6 naked-single:8,0=3 naked-single:6,8=4 naked-single:6,4=3 naked-single:2,4=4
      naked-single:2,5=2 naked-single:2,8=7 naked-single:0,3=6 naked-single:8,5=6 naked-single:8,6=1 naked-single:0,5=8 naked-single:0,8=2 naked-single:1,7=4 naked-single:0,6=9 naked-single:1,2=2 naked-single:5,7=5 naked-single:3,6=4 naked-single:5,1=1 naked-single:5,2=3 naked-single:3,1=5 naked-single:8,1=4 naked-single:8,2=5
      naked-single:0,7=1 naked-single:5,6=8 naked-single:1,6=3 naked-single:6,3=5 naked-single:3,2=9 naked-single:2,6=5 naked-single:3,5=1 naked-single:6,2=1 naked-single:1,1=7 naked-single:2,3=3 naked-single:0,2=4 naked-single:1,8=8 naked-single:3,7=2 naked-single:5,5=4 naked-single:6,0=9 naked-single:7,6=6 naked-single:8,3=2
    `)
  },
  {
    id: 'hidden-single-cascade-51',
    grid: gridFromString('.....89..67.1........3.25.7..9.6...3.2..537...1...4.5...1.37..428...9.....5.8..79'),
    solution,
    expectedTrace: trace(`
      naked-single:6,0=9 naked-single:1,5=5 naked-single:3,5=1 naked-single:6,1=6 naked-single:8,5=6 hidden-single:0,3=6 hidden-single:2,7=6 hidden-single:2,0=1 hidden-single:7,8=5 naked-single:7,3=4 naked-single:7,4=1 naked-single:7,7=3 naked-single:7,6=6 naked-single:8,3=2 naked-single:8,6=1 naked-single:7,2=7 naked-single:6,3=5
      hidden-single:4,7=9 naked-single:4,3=8 naked-single:4,0=4 naked-single:3,1=5 naked-single:4,2=6 naked-single:4,8=1 naked-single:0,8=2 naked-single:1,8=8 naked-single:1,7=4 naked-single:5,8=6 naked-single:0,7=1 naked-single:1,4=9 naked-single:3,3=7 naked-single:3,0=8 naked-single:5,2=3 naked-single:0,2=4 naked-single:0,1=3 naked-single:0,0=5
      naked-single:5,4=2 naked-single:5,6=8 naked-single:2,1=9 naked-single:6,6=2 naked-single:1,2=2 naked-single:2,4=4 naked-single:3,6=4 naked-single:8,0=3 naked-single:3,7=2 naked-single:5,0=7 naked-single:0,4=7 naked-single:1,6=3 naked-single:2,2=8 naked-single:5,3=9 naked-single:6,7=8 naked-single:8,1=4
    `)
  },
  {
    id: 'naked-pair-cascade-49',
    grid: gridFromString('53467....67.1.5.4..98...5..8.9761.2...68.3.......24.....1..72.4.8.41...........79'),
    solution,
    expectedTrace: trace(`
      naked-single:2,5=2 naked-single:2,0=1 naked-single:2,3=3 naked-single:2,7=6 naked-single:2,8=7 naked-single:1,2=2 naked-single:2,4=4 hidden-single:8,6=1 hidden-single:7,0=2 hidden-single:4,1=2 hidden-single:5,1=1 hidden-single:8,3=2 hidden-single:0,8=2 hidden-single:4,8=1 hidden-single:6,0=9 naked-single:6,3=5 naked-single:6,1=6
      naked-single:5,3=9 naked-single:4,4=5 naked-single:4,7=9 hidden-single:7,2=7 hidden-single:8,5=6 naked-single:7,5=9 naked-single:0,5=8 naked-single:0,6=9 naked-single:0,7=1 naked-single:1,4=9 hidden-single:6,7=8 naked-single:6,4=3 naked-single:8,4=8 naked-pair:3,6|5,6|5,8-3,5 naked-single:3,6=4 naked-single:4,6=7 naked-single:3,1=5
      naked-single:5,2=3 naked-single:5,7=5 naked-single:3,8=3 naked-single:5,0=7 naked-single:1,8=8 naked-single:7,7=3 naked-single:7,6=6 naked-single:8,1=4 naked-single:5,6=8 naked-single:8,0=3 naked-single:5,8=6 naked-single:1,6=3 naked-single:4,0=4 naked-single:7,8=5 naked-single:8,2=5
    `)
  },
  {
    id: 'pointing-pair-cascade-49',
    grid: gridFromString('.............953..1.8.42.......61..3.268......1....8.696..37284....19635.45.8.1.9'),
    solution,
    expectedTrace: trace(`
      naked-single:1,1=7 naked-single:0,4=7 naked-single:2,8=7 naked-single:4,8=1 naked-single:6,3=5 naked-single:4,4=5 naked-single:7,1=8 naked-single:5,4=2 naked-single:8,7=7 naked-single:6,2=1 naked-single:8,5=6 naked-single:8,3=2 naked-single:8,0=3 naked-single:7,3=4 hidden-single:3,0=8 hidden-single:3,7=2 hidden-single:0,5=8
      naked-single:0,8=2 naked-single:1,8=8 hidden-single:5,2=3 naked-single:5,5=4 naked-single:4,5=3 pointing-pair:3,3|3,6-9 naked-single:3,3=7 naked-single:5,3=9 naked-single:5,7=5 naked-single:3,6=4 naked-single:3,2=9 naked-single:0,2=4 naked-single:1,2=2 naked-single:1,0=6 naked-single:0,0=5 naked-single:0,6=9 naked-single:2,7=6 naked-single:0,7=1
      naked-single:2,3=3 naked-single:0,1=3 naked-single:4,6=7 naked-single:4,0=4 naked-single:1,3=1 naked-single:1,7=4 naked-single:2,1=9 naked-single:5,0=7 naked-single:7,0=2 naked-single:0,3=6 naked-single:2,6=5 naked-single:3,1=5 naked-single:4,7=9 naked-single:7,2=7
    `)
  }
]

export const boxLineReductionDrill = {
  grid: gridFromString('.3..789....2.95......3.2..7..9.....342....7...139..............28......5..52.....'),
  expectedTrace: trace('box-line-reduction:6,0|6,1|8,0|8,1-7')
}
