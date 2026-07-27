import Dexie, { type EntityTable } from 'dexie'
import type { Board, Grid, SolverStep } from '../engine/types'

export type PuzzleRecord = {
  id: string
  schemaVersion: 1
  original: Grid
  board: Board
  solution?: Grid
  hintHistory: SolverStep[]
  completed: boolean
  createdAt: number
  updatedAt: number
}

export type SettingsRecord = { key: string; value: unknown }

class SudokuDatabase extends Dexie {
  puzzles!: EntityTable<PuzzleRecord, 'id'>
  settings!: EntityTable<SettingsRecord, 'key'>
  constructor() {
    super('sudocoach')
    this.version(1).stores({ puzzles: 'id, updatedAt, completed', settings: 'key' })
  }
}

export const database = new SudokuDatabase()
export const savePuzzle = (record: PuzzleRecord) => database.puzzles.put(record)
export const mostRecentPuzzle = () => database.puzzles.orderBy('updatedAt').last()
