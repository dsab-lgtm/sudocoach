import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NumberPad } from '../components/NumberPad'
import { PuzzleWorkspace } from '../components/PuzzleWorkspace'
import { SudokuBoard } from '../components/SudokuBoard'
import { emptyGrid } from '../engine/board'
import { findSolutions } from '../engine/fullSolver'
import { validatePuzzle } from '../engine/validatePuzzle'
import { usePuzzleStore } from '../store/puzzleStore'

export function ManualEntryScreen() {
  const navigate = useNavigate(); const [error, setError] = useState<string | null>(null)
  const setPuzzle = usePuzzleStore((state) => state.setPuzzle); const board = usePuzzleStore((state) => state.board); const select = usePuzzleStore((state) => state.select)
  useEffect(() => { setPuzzle(emptyGrid()); select({ row: 0, col: 0 }) }, [setPuzzle, select])
  const confirm = () => { const grid = board.map((row) => row.map((cell) => cell.value)); const valid = validatePuzzle(grid); if (!valid.valid) { setError('Duplicate numbers are highlighted. Correct them before continuing.'); return }; const solution = findSolutions(grid, 2); if (!solution.length) { setError('This puzzle has no solution.'); return }; setPuzzle(grid); usePuzzleStore.getState().setSolution(solution[0]); navigate('/solve') }
  return <PuzzleWorkspace
    className="entry-workspace"
    header={<div className="workspace-heading"><div><p className="eyebrow">Manual entry</p><h1>Enter clues</h1><p>Tap a square, then use the keypad.</p></div>{error && <p className="form-error" role="alert">{error}</p>}</div>}
    board={<SudokuBoard showCandidates={false}/>} 
    dock={<><NumberPad notesMode={false} onToggleNotes={() => undefined} showNotesToggle={false}/><button type="button" className="primary-action workspace-primary-action" onClick={confirm}>Start solving</button></>}
  />
}
