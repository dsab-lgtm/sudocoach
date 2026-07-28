import { gridFromString } from '../engine/board'
import type { SolverTechnique } from '../engine/types'

export type PracticeExercise = {
  id: string
  technique: Exclude<SolverTechnique, 'candidate-elimination'>
  title: string
  description: string
  grid: ReturnType<typeof gridFromString>
}

const exercise = (id: string, technique: PracticeExercise['technique'], title: string, description: string, grid: string): PracticeExercise => ({ id, technique, title, description, grid: gridFromString(grid) })

/** Curated, bundled exercises. Their expected first step is tested, never generated at runtime. */
export const practiceExercises: PracticeExercise[] = [
  exercise('naked-single-1', 'naked-single', 'Find the only candidate', 'Spot the forced value.', '....7....6721..3.8....4....85..6....4.6.5.7...1.92.85.96.53..8...7......3.5......'),
  exercise('hidden-single-1', 'hidden-single', 'Find the only home', 'Find the digit with one home.', '5.....9..6....5.48....425.7.5.7...23...8..7...1.......9......8....4..6..34.......'),
  exercise('pointing-pair-1', 'pointing-pair', 'Follow the pointing pair', 'Follow the locked candidate.', '.3..7........9.34....3.2...8.....4.34..8.3..1.13...85.....3.2.......9.....52..1..'),
  exercise('naked-pair-1', 'naked-pair', 'Spot the naked pair', 'Remove the paired candidates.', '.3.67.9.2.7....3....8......859...4..4.6.5..9....9....6..........8.41..3..4.2..1..'),
  exercise('box-line-reduction-1', 'box-line-reduction', 'Reduce from the line', 'Clear the box from the line.', '.3..789....2.95......3.2..7..9.....342....7...139..............28......5..52.....')
]

export const exerciseFor = (technique: string | undefined, id: string | undefined) =>
  practiceExercises.find((exercise) => exercise.technique === technique && exercise.id === id)
