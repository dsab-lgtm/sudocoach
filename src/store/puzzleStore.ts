import { create } from 'zustand'
import { boardGivens, boardValues, cloneBoard, createBoard } from '../engine/board'
import { applyAssistantElimination, auditManualNotes, removeStaleManualNotes } from '../engine/candidates'
import type { Board, CellOrigin, CellPosition, Digit, Grid, SolutionStatus, SolverStep } from '../engine/types'
import { savePuzzle, type PuzzleRecord } from '../storage/database'
import { createId } from '../utils/createId'

type Snapshot = { board: Board }
type PuzzleState = {
  id: string | null
  board: Board
  original: Grid
  solution: Grid | undefined
  solutionStatus: SolutionStatus
  hintHistory: SolverStep[]
  createdAt: number | null
  selected: CellPosition | null
  undo: Snapshot[]
  redo: Snapshot[]
  valueEntrySequence: number
  setPuzzle: (grid: Grid, origin?: CellOrigin) => void
  setReviewGrid: (grid: Grid) => void
  select: (position: CellPosition | null) => void
  setValue: (position: CellPosition, value: Digit | null, origin?: CellOrigin) => void
  toggleNote: (position: CellPosition, value: Digit) => void
  applyStep: (step: SolverStep) => void
  setSolution: (solution: Grid, status?: SolutionStatus) => void
  revealSolution: () => void
  cleanupManualNotes: () => number
  correctSourceClues: () => void
  undoMove: () => void
  redoMove: () => void
  restart: () => void
  persist: () => Promise<void>
  restore: (record: PuzzleRecord) => void
}

const defaultState = () => ({ board: createBoard(Array.from({ length: 9 }, () => Array(9).fill(null))), original: Array.from({ length: 9 }, () => Array(9).fill(null)) as Grid })
const writeHistory = (state: PuzzleState, board: Board): Pick<PuzzleState, 'board' | 'undo' | 'redo'> => ({ board, undo: [...state.undo, { board: cloneBoard(state.board) }].slice(-100), redo: [] })
const withoutAssistantExclusions = (board: Board) => board.map((row) => row.map((cell) => ({ ...cell, assistantExcluded: [] as Digit[] })))
const maxEntrySequence = (board: Board) => Math.max(0, ...board.flatMap((row) => row.map((cell) => cell.valueEntrySequence ?? 0)))
const normalizeRestoredRecord = (record: PuzzleRecord): PuzzleRecord => ({
  ...record,
  schemaVersion: 2,
  board: cloneBoard(record.board).map((row) => row.map((cell) => ({ ...cell, assistantExcluded: cell.assistantExcluded ?? [] }))),
  solutionStatus: record.solutionStatus ?? 'unknown',
  valueEntrySequence: record.valueEntrySequence ?? 0
})

export const usePuzzleStore = create<PuzzleState>((set, get) => ({
  id: null, ...defaultState(), solution: undefined, solutionStatus: 'unknown', hintHistory: [], createdAt: null, selected: null, undo: [], redo: [], valueEntrySequence: 0,
  setPuzzle: (grid, origin = 'manual') => set({ id: createId(), board: createBoard(grid, origin), original: grid.map((row) => [...row]), solution: undefined, solutionStatus: 'unknown', hintHistory: [], createdAt: Date.now(), selected: null, undo: [], redo: [], valueEntrySequence: 0 }),
  setReviewGrid: (grid) => set({ id: null, board: grid.map((row) => row.map((value) => ({ given: null, value, notes: [], assistantExcluded: [], origin: value ? 'scan' : undefined }))), original: Array.from({ length: 9 }, () => Array(9).fill(null)), solution: undefined, solutionStatus: 'unknown', hintHistory: [], createdAt: null, selected: null, undo: [], redo: [], valueEntrySequence: 0 }),
  select: (selected) => set({ selected }),
  setValue: (position, value, origin = 'manual') => set((state) => {
    const cell = state.board[position.row][position.col]
    if (cell.given || cell.value === value) return state
    // A player edit can invalidate an earlier candidate proof, while a coach
    // placement is monotonic and may safely continue the guided chain.
    const board = origin === 'manual' ? withoutAssistantExclusions(cloneBoard(state.board)) : cloneBoard(state.board)
    const nextSequence = value && origin === 'manual' ? state.valueEntrySequence + 1 : state.valueEntrySequence
    board[position.row][position.col] = {
      ...cell,
      value,
      // Keep manual notes so a temporary value never destroys player work.
      notes: [...cell.notes],
      assistantExcluded: [],
      origin: value ? origin : undefined,
      valueEntrySequence: value && origin === 'manual' ? nextSequence : value ? cell.valueEntrySequence : undefined
    }
    return { ...writeHistory(state, board), valueEntrySequence: nextSequence }
  }),
  toggleNote: (position, value) => set((state) => {
    const cell = state.board[position.row][position.col]
    if (cell.given || cell.value) return state
    const board = cloneBoard(state.board)
    const notes = cell.notes.includes(value) ? cell.notes.filter((note) => note !== value) : [...cell.notes, value].sort() as Digit[]
    board[position.row][position.col] = { ...cell, notes }
    return writeHistory(state, board)
  }),
  applyStep: (step) => set((state) => {
    if (step.action === 'remove-candidate') {
      const board = applyAssistantElimination(state.board, step)
      if (JSON.stringify(board) === JSON.stringify(state.board)) return { hintHistory: [...state.hintHistory, step] }
      return { ...writeHistory(state, board), hintHistory: [...state.hintHistory, step] }
    }
    if (!step.value || step.targetCells.length !== 1) return { hintHistory: [...state.hintHistory, step] }
    const position = step.targetCells[0]
    if (state.board[position.row][position.col].given) return state
    const board = cloneBoard(state.board)
    board[position.row][position.col] = { ...board[position.row][position.col], value: step.value, notes: [...board[position.row][position.col].notes], assistantExcluded: [], origin: 'hint' }
    return { ...writeHistory(state, board), selected: position, hintHistory: [...state.hintHistory, step] }
  }),
  setSolution: (solution, solutionStatus = 'unknown') => set({ solution, solutionStatus }),
  revealSolution: () => set((state) => {
    if (!state.solution) return state
    const board = withoutAssistantExclusions(cloneBoard(state.board))
    for (let row = 0; row < 9; row += 1) for (let col = 0; col < 9; col += 1) if (!board[row][col].given) board[row][col] = { ...board[row][col], value: state.solution[row][col], notes: [...board[row][col].notes], assistantExcluded: [], origin: 'solution' }
    return writeHistory(state, board)
  }),
  cleanupManualNotes: () => {
    const state = get()
    const stale = auditManualNotes(boardValues(state.board), state.board)
    if (!stale.length) return 0
    set((current) => writeHistory(current, removeStaleManualNotes(boardValues(current.board), current.board)))
    return stale.reduce((count, item) => count + item.stale.length, 0)
  },
  correctSourceClues: () => set((state) => ({
    ...defaultState(),
    id: createId(),
    board: state.original.map((row) => row.map((value) => ({ given: null, value, notes: [], assistantExcluded: [], origin: value ? 'scan' : undefined }))),
    original: Array.from({ length: 9 }, () => Array(9).fill(null)) as Grid,
    solution: undefined,
    solutionStatus: 'unknown',
    hintHistory: [],
    createdAt: Date.now(),
    selected: null,
    undo: [],
    redo: [],
    valueEntrySequence: 0
  })),
  undoMove: () => set((state) => {
    const snapshot = state.undo.at(-1)
    return snapshot ? { board: cloneBoard(snapshot.board), undo: state.undo.slice(0, -1), redo: [...state.redo, { board: cloneBoard(state.board) }] } : state
  }),
  redoMove: () => set((state) => {
    const snapshot = state.redo.at(-1)
    return snapshot ? { board: cloneBoard(snapshot.board), redo: state.redo.slice(0, -1), undo: [...state.undo, { board: cloneBoard(state.board) }] } : state
  }),
  restart: () => set((state) => ({ ...defaultState(), board: createBoard(state.original), original: state.original.map((row) => [...row]), solution: state.solution, solutionStatus: state.solutionStatus, hintHistory: [], selected: null, undo: [], redo: [], valueEntrySequence: 0 })),
  persist: async () => {
    const state = get()
    if (!state.id) return
    const record: PuzzleRecord = { id: state.id, schemaVersion: 2, original: boardGivens(state.board), board: state.board, solution: state.solution, solutionStatus: state.solutionStatus, valueEntrySequence: state.valueEntrySequence, hintHistory: state.hintHistory, completed: boardValues(state.board).every((row) => row.every(Boolean)), createdAt: state.createdAt ?? Date.now(), updatedAt: Date.now() }
    await savePuzzle(record)
  },
  restore: (record) => {
    const restored = normalizeRestoredRecord(record)
    set({ id: restored.id, original: restored.original, board: restored.board, solution: restored.solution, solutionStatus: restored.solutionStatus ?? 'unknown', hintHistory: restored.hintHistory, createdAt: restored.createdAt, selected: null, undo: [], redo: [], valueEntrySequence: Math.max(restored.valueEntrySequence ?? 0, maxEntrySequence(restored.board)) })
  }
}))
