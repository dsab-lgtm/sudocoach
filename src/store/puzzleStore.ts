import { create } from 'zustand'
import { boardGivens, boardValues, cloneBoard, createBoard } from '../engine/board'
import type { Board, CellOrigin, CellPosition, Digit, Grid, SolverStep } from '../engine/types'
import { savePuzzle, type PuzzleRecord } from '../storage/database'
import { createId } from '../utils/createId'

type Snapshot = { board: Board }
type PuzzleState = {
  id: string | null
  board: Board
  original: Grid
  solution: Grid | undefined
  hintHistory: SolverStep[]
  createdAt: number | null
  selected: CellPosition | null
  undo: Snapshot[]
  redo: Snapshot[]
  setPuzzle: (grid: Grid, origin?: CellOrigin) => void
  setReviewGrid: (grid: Grid) => void
  select: (position: CellPosition | null) => void
  setValue: (position: CellPosition, value: Digit | null, origin?: CellOrigin) => void
  toggleNote: (position: CellPosition, value: Digit) => void
  applyStep: (step: SolverStep) => void
  setSolution: (solution: Grid) => void
  revealSolution: () => void
  undoMove: () => void
  redoMove: () => void
  restart: () => void
  persist: () => Promise<void>
  restore: (record: PuzzleRecord) => void
}

const defaultState = () => ({ board: createBoard(Array.from({ length: 9 }, () => Array(9).fill(null))), original: Array.from({ length: 9 }, () => Array(9).fill(null)) as Grid })
const writeHistory = (state: PuzzleState, board: Board): Pick<PuzzleState, 'board' | 'undo' | 'redo'> => ({ board, undo: [...state.undo, { board: cloneBoard(state.board) }].slice(-100), redo: [] })

export const usePuzzleStore = create<PuzzleState>((set, get) => ({
  id: null, ...defaultState(), solution: undefined, hintHistory: [], createdAt: null, selected: null, undo: [], redo: [],
  setPuzzle: (grid, origin = 'manual') => set({ id: createId(), board: createBoard(grid, origin), original: grid.map((row) => [...row]), solution: undefined, hintHistory: [], createdAt: Date.now(), selected: null, undo: [], redo: [] }),
  setReviewGrid: (grid) => set({ id: null, board: grid.map((row) => row.map((value) => ({ given: null, value, notes: [], origin: value ? 'scan' : undefined }))), original: Array.from({ length: 9 }, () => Array(9).fill(null)), solution: undefined, hintHistory: [], createdAt: null, selected: null, undo: [], redo: [] }),
  select: (selected) => set({ selected }),
  setValue: (position, value, origin = 'manual') => set((state) => {
    const cell = state.board[position.row][position.col]
    if (cell.given) return state
    const board = cloneBoard(state.board)
    board[position.row][position.col] = { ...cell, value, notes: value ? [] : cell.notes, origin: value ? origin : undefined }
    return writeHistory(state, board)
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
    if (step.action !== 'place-number' || !step.value || step.targetCells.length !== 1) return { hintHistory: [...state.hintHistory, step] }
    const position = step.targetCells[0]
    if (state.board[position.row][position.col].given) return state
    const board = cloneBoard(state.board)
    board[position.row][position.col] = { ...board[position.row][position.col], value: step.value, notes: [], origin: 'hint' }
    return { ...writeHistory(state, board), selected: position, hintHistory: [...state.hintHistory, step] }
  }),
  setSolution: (solution) => set({ solution }),
  revealSolution: () => set((state) => {
    if (!state.solution) return state
    const board = cloneBoard(state.board)
    for (let row = 0; row < 9; row += 1) for (let col = 0; col < 9; col += 1) if (!board[row][col].given) board[row][col] = { ...board[row][col], value: state.solution[row][col], notes: [], origin: 'solution' }
    return writeHistory(state, board)
  }),
  undoMove: () => set((state) => {
    const snapshot = state.undo.at(-1)
    return snapshot ? { board: cloneBoard(snapshot.board), undo: state.undo.slice(0, -1), redo: [...state.redo, { board: cloneBoard(state.board) }] } : state
  }),
  redoMove: () => set((state) => {
    const snapshot = state.redo.at(-1)
    return snapshot ? { board: cloneBoard(snapshot.board), redo: state.redo.slice(0, -1), undo: [...state.undo, { board: cloneBoard(state.board) }] } : state
  }),
  restart: () => set((state) => ({ ...defaultState(), board: createBoard(state.original), original: state.original.map((row) => [...row]), solution: state.solution, hintHistory: [], selected: null, undo: [], redo: [] })),
  persist: async () => {
    const state = get()
    if (!state.id) return
    const record: PuzzleRecord = { id: state.id, schemaVersion: 1, original: boardGivens(state.board), board: state.board, solution: state.solution, hintHistory: state.hintHistory, completed: boardValues(state.board).every((row) => row.every(Boolean)), createdAt: state.createdAt ?? Date.now(), updatedAt: Date.now() }
    await savePuzzle(record)
  },
  restore: (record) => set({ id: record.id, original: record.original, board: record.board, solution: record.solution, hintHistory: record.hintHistory, createdAt: record.createdAt, selected: null, undo: [], redo: [] })
}))
