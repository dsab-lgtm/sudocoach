import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { ConfirmSolutionModal } from '../components/ConfirmSolutionModal'
import { HintPanel } from '../components/HintPanel'
import { Modal } from '../components/Modal'
import { NumberPad } from '../components/NumberPad'
import { PuzzleToolbar } from '../components/PuzzleToolbar'
import { PuzzleWorkspace } from '../components/PuzzleWorkspace'
import { SolverHeader } from '../components/SolverHeader'
import { SolverMoreModal } from '../components/SolverMoreModal'
import { SudokuBoard } from '../components/SudokuBoard'
import { boardValues } from '../engine/board'
import { solve } from '../engine/fullSolver'
import { getNextLogicalStep } from '../engine/logicalSolver'
import { validatePuzzle } from '../engine/validatePuzzle'
import { usePuzzleStore } from '../store/puzzleStore'
import { usePuzzleBoardController } from './usePuzzleBoardController'

export function SolverScreen() {
  const navigate = useNavigate()
  const [notes, setNotes] = useState(false)
  const [hintLevel, setHintLevel] = useState(0)
  const [showHint, setShowHint] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [showReveal, setShowReveal] = useState(false)
  const [checkStatus, setCheckStatus] = useState<string | null>(null)
  const board = usePuzzleStore((state) => state.board)
  const solution = usePuzzleStore((state) => state.solution)
  const applyStep = usePuzzleStore((state) => state.applyStep)
  const setSolution = usePuzzleStore((state) => state.setSolution)
  const revealSolution = usePuzzleStore((state) => state.revealSolution)
  const undo = usePuzzleStore((state) => state.undoMove)
  const redo = usePuzzleStore((state) => state.redoMove)
  const persist = usePuzzleStore((state) => state.persist)
  const undoCount = usePuzzleStore((state) => state.undo.length)
  const redoCount = usePuzzleStore((state) => state.redo.length)
  const selected = usePuzzleStore((state) => state.selected)
  const step = useMemo(() => hintLevel ? getNextLogicalStep(boardValues(board)) : null, [board, hintLevel])
  const puzzle = usePuzzleBoardController({ notesMode: notes, hintStep: showHint ? step : null })

  useEffect(() => {
    if (!solution && board.some((row) => row.some((cell) => cell.value))) {
      const found = solve(boardValues(board))
      if (found) setSolution(found)
    }
  }, [board, setSolution, solution])

  useEffect(() => {
    const timeout = window.setTimeout(() => { persist().catch(() => undefined) }, 300)
    return () => window.clearTimeout(timeout)
  }, [board, persist])

  useEffect(() => { setCheckStatus(null) }, [board])

  const reveal = () => {
    revealSolution()
    setShowReveal(false)
  }
  const restart = () => {
    usePuzzleStore.getState().restart()
    setHintLevel(0)
  }
  const openHint = () => {
    setHintLevel((level) => level || 1)
    setShowHint(true)
  }
  const runCheck = () => {
    const conflicts = validatePuzzle(boardValues(board)).conflicts.length
    setCheckStatus(conflicts ? `${conflicts} conflicting ${conflicts === 1 ? 'cell' : 'cells'} highlighted.` : 'No conflicts found.')
  }
  const activeSelection = selected ?? { row: 0, col: 0 }

  return <>
    <PuzzleWorkspace
      className="solver-workspace"
      header={<SolverHeader checkStatus={checkStatus} notesMode={notes} onBack={() => navigate('/')} selected={activeSelection}/>}
      board={<SudokuBoard presentation={puzzle.presentation} interactions={{ ...puzzle.boardInteractions, onToggleNotes: () => setNotes(!notes) }} notesMode={notes} showCandidates={false}/>}
      dock={<div className="solver-dock">
        <NumberPad notesMode={notes} disabled={puzzle.isKeypadDisabled} allowedActions={puzzle.allowedActions} {...puzzle.numberPadInteractions} onToggleNotes={() => setNotes(!notes)} showNotesToggle={false}/>
        <PuzzleToolbar canErase={puzzle.allowedActions.canErase} canRedo={Boolean(redoCount)} canUndo={Boolean(undoCount)} notesMode={notes} onCheck={runCheck} onErase={puzzle.numberPadInteractions.onErase} onHint={openHint} onMore={() => setShowMore(true)} onRedo={redo} onToggleNotes={() => setNotes(!notes)} onUndo={undo}/>
      </div>}
    />
    {showHint && <Modal eyebrow="SudoCoach" title="Hint" description="Reveal one focused clue at a time." onClose={() => setShowHint(false)}>
      <HintPanel step={step} level={hintLevel} onLevel={setHintLevel} onApply={() => { if (step) applyStep(step); setHintLevel(0); setShowHint(false) }}/>
      <div className="modal-actions"><Button variant="ghost" onClick={() => setShowHint(false)}>Close hint</Button></div>
    </Modal>}
    {showMore && <SolverMoreModal onClose={() => setShowMore(false)} onRestart={restart} onReveal={() => setShowReveal(true)}/>}
    {showReveal && <ConfirmSolutionModal onCancel={() => setShowReveal(false)} onReveal={reveal}/>}
  </>
}
