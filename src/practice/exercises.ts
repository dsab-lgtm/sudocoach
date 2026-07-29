import { gridFromString } from '../engine/board'
import type { SolverTechnique } from '../engine/types'

export type PracticeExercise = {
  id: string
  technique: Exclude<SolverTechnique, 'candidate-elimination'>
  group: 'foundations' | 'candidate-patterns'
  methodName: string
  title: string
  description: string
  grid: ReturnType<typeof gridFromString>
}

export const practiceGroups = [
  { id: 'foundations' as const, title: 'Foundations', description: 'Build confidence with the first moves every solver learns.' },
  { id: 'candidate-patterns' as const, title: 'Candidate patterns', description: 'Use candidate positions to make clean eliminations.' }
]

const exercise = (id: string, technique: PracticeExercise['technique'], group: PracticeExercise['group'], methodName: string, title: string, description: string, grid: string): PracticeExercise => ({ id, technique, group, methodName, title, description, grid: gridFromString(grid) })

/** Curated, bundled exercises. Their expected first step is tested, never generated at runtime. */
export const practiceExercises: PracticeExercise[] = [
  exercise('naked-single-1', 'naked-single', 'foundations', 'Naked single', 'One possible value', 'Place a value when a cell has only one legal candidate.', '....7....6721..3.8....4....85..6....4.6.5.7...1.92.85.96.53..8...7......3.5......'),
  exercise('hidden-single-1', 'hidden-single', 'foundations', 'Hidden single', 'One home for a digit', 'Find the digit that has only one possible cell in a unit.', '5.....9..6....5.48....425.7.5.7...23...8..7...1.......9......8....4..6..34.......'),
  exercise('naked-pair-1', 'naked-pair', 'candidate-patterns', 'Naked pair', 'Paired candidates', 'Use two matching candidate pairs to clear the rest of their unit.', '.3.67.9.2.7....3....8......859...4..4.6.5..9....9....6..........8.41..3..4.2..1..'),
  exercise('pointing-pair-1', 'pointing-pair', 'candidate-patterns', 'Pointing pair', 'Box points to a line', 'Follow a candidate confined to one line inside its box.', '.3..7........9.34....3.2...8.....4.34..8.3..1.13...85.....3.2.......9.....52..1..'),
  exercise('box-line-reduction-1', 'box-line-reduction', 'candidate-patterns', 'Box-line reduction', 'Line reduces a box', 'Use a line-confined candidate to clear the rest of its box.', '.3..789....2.95......3.2..7..9.....342....7...139..............28......5..52.....')
]

export const exerciseFor = (technique: string | undefined, id: string | undefined) =>
  practiceExercises.find((exercise) => exercise.technique === technique && exercise.id === id)

export const nextExerciseFor = (exercise: PracticeExercise) => {
  const index = practiceExercises.findIndex((candidate) => candidate.id === exercise.id)
  return index < 0 ? undefined : practiceExercises[index + 1]
}
