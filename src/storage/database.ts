import Dexie, { type EntityTable } from 'dexie'
import { cloneBoard } from '../engine/board'
import type { Board, Grid, SolutionStatus, SolverStep } from '../engine/types'

export type PuzzleRecord = {
  id: string
  schemaVersion: 1 | 2
  original: Grid
  board: Board
  solution?: Grid
  solutionStatus?: SolutionStatus
  valueEntrySequence?: number
  hintHistory: SolverStep[]
  completed: boolean
  createdAt: number
  updatedAt: number
}

/** Safely reads legacy saved puzzles without dropping a player's existing notes. */
export const normalizePuzzleRecord = (record: PuzzleRecord): PuzzleRecord => ({
  ...record,
  schemaVersion: 2,
  board: cloneBoard(record.board).map((row) => row.map((cell) => ({ ...cell, assistantExcluded: cell.assistantExcluded ?? [] }))),
  solutionStatus: record.solutionStatus ?? 'unknown',
  valueEntrySequence: record.valueEntrySequence ?? 0
})

export type SettingsRecord = { key: string; value: unknown }

class SudokuDatabase extends Dexie {
  puzzles!: EntityTable<PuzzleRecord, 'id'>
  settings!: EntityTable<SettingsRecord, 'key'>
  constructor() {
    super('sudocoach')
    this.version(1).stores({ puzzles: 'id, updatedAt, completed', settings: 'key' })
    this.version(2).stores({ puzzles: 'id, updatedAt, completed', settings: 'key' }).upgrade((transaction) =>
      transaction.table<PuzzleRecord>('puzzles').toCollection().modify((record) => { Object.assign(record, normalizePuzzleRecord(record)) })
    )
  }
}

export const database = new SudokuDatabase()
export const savePuzzle = (record: PuzzleRecord) => database.puzzles.put(normalizePuzzleRecord(record))
export const mostRecentPuzzle = async () => {
  const record = await database.puzzles.orderBy('updatedAt').last()
  return record ? normalizePuzzleRecord(record) : undefined
}
