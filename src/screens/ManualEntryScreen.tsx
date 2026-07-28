import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { EntryHeader } from '../components/EntryHeader'
import { NumberPad } from '../components/NumberPad'
import { PuzzleWorkspace } from '../components/PuzzleWorkspace'
import { SudokuBoard } from '../components/SudokuBoard'
import { emptyGrid } from '../engine/board'
import { findSolutions } from '../engine/fullSolver'
import { validatePuzzle } from '../engine/validatePuzzle'
import { usePuzzleStore } from '../store/puzzleStore'
import { usePuzzleBoardController } from './usePuzzleBoardController'

export function ManualEntryScreen() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const setPuzzle = usePuzzleStore((state) => state.setPuzzle)
  const board = usePuzzleStore((state) => state.board)
  const select = usePuzzleStore((state) => state.select)
  const puzzle = usePuzzleBoardController({ notesMode: false })
  const clueCount = useMemo(() => board.flat().filter((cell) => cell.value).length, [board])
  const grid = useMemo(() => board.map((row) => row.map((cell) => cell.value)), [board])
  const validation = useMemo(() => validatePuzzle(grid), [grid])

  useEffect(() => {
    setPuzzle(emptyGrid())
    select({ row: 0, col: 0 })
  }, [setPuzzle, select])

  useEffect(() => { setError(null) }, [board])

  const confirm = () => {
    if (!clueCount) {
      setError('Enter at least one given clue before continuing.')
      return
    }
    if (!validation.valid) {
      setError('Duplicate numbers are highlighted. Correct them before continuing.')
      return
    }
    const solution = findSolutions(grid, 2)
    if (!solution.length) {
      setError('This puzzle has no solution.')
      return
    }
    setPuzzle(grid)
    usePuzzleStore.getState().setSolution(solution[0])
    select({ row: 0, col: 0 })
    navigate('/solve')
  }

  return <PuzzleWorkspace
    className="entry-workspace"
    header={<EntryHeader clueCount={clueCount} error={error} hasConflicts={!validation.valid} onBack={() => navigate('/')}/>}
    board={<SudokuBoard presentation={puzzle.presentation} interactions={puzzle.boardInteractions} showCandidates={false}/>}
    dock={<div className="entry-dock">
      <NumberPad notesMode={false} disabled={puzzle.isKeypadDisabled} allowedActions={puzzle.allowedActions} {...puzzle.numberPadInteractions} showNotesToggle={false}/>
      <Button variant="primary" className="entry-primary-action" aria-describedby="entry-feedback" onClick={confirm}>Start solving</Button>
    </div>}
  />
}
