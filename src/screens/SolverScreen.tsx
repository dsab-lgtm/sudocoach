import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConfirmSolutionModal } from '../components/ConfirmSolutionModal'
import { HintPanel } from '../components/HintPanel'
import { NumberPad } from '../components/NumberPad'
import { PuzzleWorkspace } from '../components/PuzzleWorkspace'
import { SolverMoreModal } from '../components/SolverMoreModal'
import { SudokuBoard } from '../components/SudokuBoard'
import { boardValues } from '../engine/board'
import { getNextLogicalStep } from '../engine/logicalSolver'
import { solve } from '../engine/fullSolver'
import { validatePuzzle } from '../engine/validatePuzzle'
import { usePuzzleStore } from '../store/puzzleStore'

export function SolverScreen() {
  const navigate = useNavigate(); const [notes, setNotes] = useState(false); const [hintLevel, setHintLevel] = useState(0); const [showHint, setShowHint] = useState(false); const [showMore, setShowMore] = useState(false); const [showReveal, setShowReveal] = useState(false); const [checkStatus, setCheckStatus] = useState<string | null>(null)
  const board = usePuzzleStore((state) => state.board); const solution = usePuzzleStore((state) => state.solution); const applyStep = usePuzzleStore((state) => state.applyStep); const setSolution = usePuzzleStore((state) => state.setSolution); const revealSolution = usePuzzleStore((state) => state.revealSolution); const undo = usePuzzleStore((state) => state.undoMove); const redo = usePuzzleStore((state) => state.redoMove); const persist = usePuzzleStore((state) => state.persist); const undoCount = usePuzzleStore((state) => state.undo.length); const redoCount = usePuzzleStore((state) => state.redo.length); const selected = usePuzzleStore((state) => state.selected)
  const step = useMemo(() => hintLevel ? getNextLogicalStep(boardValues(board)) : null, [board, hintLevel])
  useEffect(() => { if (!solution && board.some((row) => row.some((cell) => cell.value))) { const found = solve(boardValues(board)); if (found) setSolution(found) } }, [board, setSolution, solution])
  useEffect(() => { const timeout = window.setTimeout(() => { persist().catch(() => undefined) }, 300); return () => window.clearTimeout(timeout) }, [board, persist])
  useEffect(() => { setCheckStatus(null) }, [board])
  const reveal = () => { revealSolution(); setShowReveal(false) }
  const restart = () => { usePuzzleStore.getState().restart(); setHintLevel(0) }
  const openHint = () => { setHintLevel((level) => level || 1); setShowHint(true) }
  const runCheck = () => {
    const conflicts = validatePuzzle(boardValues(board)).conflicts.length
    setCheckStatus(conflicts ? `${conflicts} conflicting ${conflicts === 1 ? 'cell' : 'cells'} highlighted.` : 'No conflicts found.')
  }
  return <>
    <PuzzleWorkspace
      className="solver-workspace"
      header={<div className="solver-header"><div><p className="eyebrow">Solve</p><h1>Keep going</h1><p className="solver-context">{selected ? `Row ${selected.row + 1}, column ${selected.col + 1}${notes ? ' · Notes on' : ''}` : 'Choose a square to begin'}</p></div><button className="icon-button" type="button" aria-label="Back to home" onClick={() => navigate('/')}>×</button></div>}
      board={<SudokuBoard step={showHint ? step : null} notesMode={notes} onToggleNotes={() => setNotes(!notes)} showCandidates={false}/>} 
      dock={<div className="solver-dock"><NumberPad notesMode={notes} onToggleNotes={() => setNotes(!notes)} showNotesToggle={false}/><div className="solver-actions"><button type="button" className={notes ? 'active' : ''} onClick={() => setNotes(!notes)} aria-pressed={notes}>Notes</button><button type="button" disabled={!undoCount} onClick={undo}>Undo</button><button type="button" disabled={!redoCount} onClick={redo}>Redo</button><button type="button" onClick={openHint}>Hint</button><button type="button" onClick={runCheck}>Check</button><button type="button" onClick={() => setShowMore(true)}>More</button></div>{checkStatus && <p className="check-status" role="status">{checkStatus}</p>}</div>}
    />
    {showHint && <div className="modal-backdrop solver-sheet-backdrop" role="presentation"><section className="modal solver-sheet" role="dialog" aria-modal="true" aria-label="Hint"><HintPanel step={step} level={hintLevel} onLevel={setHintLevel} onApply={() => { if (step) applyStep(step); setHintLevel(0); setShowHint(false) }}/><div className="modal-actions"><button type="button" className="text-button" onClick={() => setShowHint(false)}>Close hint</button></div></section></div>}
    {showMore && <SolverMoreModal onClose={() => setShowMore(false)} onRestart={restart} onReveal={() => setShowReveal(true)}/>} {showReveal && <ConfirmSolutionModal onCancel={() => setShowReveal(false)} onReveal={reveal}/>} 
  </>
}
