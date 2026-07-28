import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { CandidateAssistantSheet } from '../components/CandidateAssistantSheet'
import { ConfirmSolutionModal } from '../components/ConfirmSolutionModal'
import { HintPanel } from '../components/HintPanel'
import { Modal } from '../components/Modal'
import { MistakeDiagnosisSheet } from '../components/MistakeDiagnosisSheet'
import { NumberPad } from '../components/NumberPad'
import { PuzzleToolbar } from '../components/PuzzleToolbar'
import { PuzzleWorkspace } from '../components/PuzzleWorkspace'
import { SolverHeader } from '../components/SolverHeader'
import { SolverMoreModal } from '../components/SolverMoreModal'
import { SudokuBoard } from '../components/SudokuBoard'
import { boardValues } from '../engine/board'
import { auditManualNotes, effectiveCandidates, getCandidateState } from '../engine/candidates'
import { analyzeSolutions } from '../engine/fullSolver'
import { getNextLogicalStep } from '../engine/logicalSolver'
import { diagnoseMistake, type MistakeDiagnosis } from '../engine/mistakeDiagnosis'
import { useCandidateAssistant } from '../components/candidateAssistantContext'
import { useFeedback } from '../components/feedbackContext'
import type { BoardFeedback, BoardFeedbackKind } from '../components/puzzleViewTypes'
import type { Board, CellPosition, Digit } from '../engine/types'
import { usePuzzleStore } from '../store/puzzleStore'
import { usePuzzleBoardController } from './usePuzzleBoardController'

const changedCells = (before: Board, after: Board): CellPosition[] => before.flatMap((row, rowIndex) => row.flatMap((cell, col) => {
  const next = after[rowIndex][col]
  return cell.value !== next.value || cell.notes.join() !== next.notes.join() || (cell.assistantExcluded ?? []).join() !== (next.assistantExcluded ?? []).join() ? [{ row: rowIndex, col }] : []
})).slice(0, 3)

export function SolverScreen() {
  const navigate = useNavigate()
  const [notes, setNotes] = useState(false)
  const [hintLevel, setHintLevel] = useState(0)
  const [showHint, setShowHint] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [showCandidates, setShowCandidates] = useState(false)
  const [diagnosis, setDiagnosis] = useState<MistakeDiagnosis | null>(null)
  const [showReveal, setShowReveal] = useState(false)
  const [checkStatus, setCheckStatus] = useState<string | null>(null)
  const [boardFeedback, setBoardFeedback] = useState<BoardFeedback | null>(null)
  const feedbackSequence = useRef(0)
  const lastHintFeedback = useRef<string | null>(null)
  const board = usePuzzleStore((state) => state.board)
  const solution = usePuzzleStore((state) => state.solution)
  const solutionStatus = usePuzzleStore((state) => state.solutionStatus)
  const original = usePuzzleStore((state) => state.original)
  const applyStep = usePuzzleStore((state) => state.applyStep)
  const setSolution = usePuzzleStore((state) => state.setSolution)
  const revealSolution = usePuzzleStore((state) => state.revealSolution)
  const undo = usePuzzleStore((state) => state.undoMove)
  const redo = usePuzzleStore((state) => state.redoMove)
  const persist = usePuzzleStore((state) => state.persist)
  const cleanupManualNotes = usePuzzleStore((state) => state.cleanupManualNotes)
  const correctSourceClues = usePuzzleStore((state) => state.correctSourceClues)
  const undoCount = usePuzzleStore((state) => state.undo.length)
  const redoCount = usePuzzleStore((state) => state.redo.length)
  const selected = usePuzzleStore((state) => state.selected)
  const { mode: candidateMode, setMode } = useCandidateAssistant()
  const { announce } = useFeedback()
  const triggerBoardFeedback = (kind: BoardFeedbackKind, cells: readonly CellPosition[], digits?: readonly Digit[]) => {
    if (!cells.length) return
    setBoardFeedback({ id: ++feedbackSequence.current, kind, cells, digits })
  }
  const effectiveCandidateMap = useMemo(() => effectiveCandidates(getCandidateState(boardValues(board), board)), [board])
  const step = useMemo(() => hintLevel || candidateMode === 'guided' ? getNextLogicalStep(boardValues(board), effectiveCandidateMap) : null, [board, candidateMode, effectiveCandidateMap, hintLevel])
  const puzzle = usePuzzleBoardController({ notesMode: notes, candidateMode, hintStep: showHint ? step : null, feedback: boardFeedback, onFeedback: triggerBoardFeedback })
  const staleCount = useMemo(() => auditManualNotes(boardValues(board), board).reduce((count, item) => count + item.stale.length, 0), [board])

  useEffect(() => {
    if (!solution && original.some((row) => row.some(Boolean))) {
      const analysis = analyzeSolutions(original)
      if (analysis.solution) setSolution(analysis.solution, analysis.status)
      else setSolution(boardValues(board), analysis.status)
    }
  }, [board, original, setSolution, solution])

  useEffect(() => {
    const timeout = window.setTimeout(() => { persist().catch(() => undefined) }, 300)
    return () => window.clearTimeout(timeout)
  }, [board, persist])

  useEffect(() => { setCheckStatus(null) }, [board])

  useEffect(() => {
    if (!showHint || !step) {
      lastHintFeedback.current = null
      return
    }
    const key = `${hintLevel}:${step.action}:${step.targetCells.map(({ row, col }) => `${row}:${col}`).join(',')}`
    if (lastHintFeedback.current === key) return
    lastHintFeedback.current = key
    setBoardFeedback({ id: ++feedbackSequence.current, kind: 'guided-change', cells: step.targetCells, digits: step.removedCandidates ?? (step.value ? [step.value] : []) })
  }, [hintLevel, showHint, step])

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
    const result = diagnoseMistake({ board, original, selected, solution, solutionStatus })
    setCheckStatus(result.message)
    setDiagnosis(result)
    triggerBoardFeedback('diagnosis', result.cells)
  }
  const undoWithFeedback = () => {
    const before = usePuzzleStore.getState().board
    undo()
    const changed = changedCells(before, usePuzzleStore.getState().board)
    triggerBoardFeedback('recovered', changed)
    if (changed.length) announce({ message: 'Last action undone.', tone: 'success' })
  }
  const redoWithFeedback = () => {
    const before = usePuzzleStore.getState().board
    redo()
    const changed = changedCells(before, usePuzzleStore.getState().board)
    triggerBoardFeedback('reapplied', changed)
    if (changed.length) announce({ message: 'Last action reapplied.', tone: 'info' })
  }
  const activeSelection = selected ?? { row: 0, col: 0 }

  return <>
    <PuzzleWorkspace
      className="solver-workspace"
      header={<SolverHeader checkStatus={checkStatus} notesMode={notes} onBack={() => navigate('/')} selected={activeSelection}/>}
      board={<SudokuBoard presentation={puzzle.presentation} interactions={{ ...puzzle.boardInteractions, onToggleNotes: () => setNotes(!notes) }} notesMode={notes} showCandidates={candidateMode !== 'manual'}/>}
      dock={<div className="solver-dock">
        <NumberPad notesMode={notes} disabled={puzzle.isKeypadDisabled} allowedActions={puzzle.allowedActions} {...puzzle.numberPadInteractions} onToggleNotes={() => setNotes(!notes)} showNotesToggle={false}/>
        <PuzzleToolbar canErase={puzzle.allowedActions.canErase} canRedo={Boolean(redoCount)} canUndo={Boolean(undoCount)} notesMode={notes} onCandidates={() => setShowCandidates(true)} onCheck={runCheck} onErase={puzzle.numberPadInteractions.onErase} onHint={openHint} onMore={() => setShowMore(true)} onRedo={redoWithFeedback} onToggleNotes={() => setNotes(!notes)} onUndo={undoWithFeedback}/>
      </div>}
    />
    {showHint && <Modal eyebrow="SudoCoach" title="Hint" description="Reveal one focused clue at a time." onClose={() => setShowHint(false)}>
      <HintPanel step={step} level={hintLevel} onLevel={setHintLevel} onApply={() => { if (step) { applyStep(step); triggerBoardFeedback('guided-change', step.targetCells, step.removedCandidates ?? (step.value ? [step.value] : [])) }; setHintLevel(0); setShowHint(false) }}/>
      <div className="modal-actions"><Button variant="ghost" onClick={() => setShowHint(false)}>Close hint</Button></div>
    </Modal>}
    {showCandidates && <CandidateAssistantSheet
      mode={candidateMode}
      staleCount={staleCount}
      step={step}
      onClose={() => setShowCandidates(false)}
      onMode={(mode) => { void setMode(mode) }}
      onCleanup={() => {
        const stale = auditManualNotes(boardValues(board), board)
        const count = cleanupManualNotes()
        triggerBoardFeedback('candidate-removed', stale.map((item) => item.position).slice(0, 3))
        setCheckStatus(`${count} stale ${count === 1 ? 'note was' : 'notes were'} removed.`)
        announce({ message: `${count} stale ${count === 1 ? 'note was' : 'notes were'} removed.`, tone: 'success' })
        setShowCandidates(false)
      }}
      onApplyStep={() => {
        if (step) {
          applyStep(step)
          triggerBoardFeedback('guided-change', step.targetCells, step.removedCandidates ?? (step.value ? [step.value] : []))
        }
        setShowCandidates(false)
      }}
    />}
    {diagnosis && <MistakeDiagnosisSheet
      diagnosis={diagnosis}
      canUndo={Boolean(undoCount)}
      onClose={() => setDiagnosis(null)}
      onUndo={() => { undoWithFeedback(); setDiagnosis(null) }}
      onClear={() => {
        if (diagnosis.primaryCell) {
          usePuzzleStore.getState().setValue(diagnosis.primaryCell, null)
          triggerBoardFeedback('recovered', [diagnosis.primaryCell])
          announce({ message: 'Highlighted value cleared.', tone: 'success' })
        }
        setDiagnosis(null)
      }}
      onCorrectSource={() => {
        correctSourceClues()
        setDiagnosis(null)
        setCheckStatus('Original values are now editable for correction.')
      }}
    />}
    {showMore && <SolverMoreModal onClose={() => setShowMore(false)} onRestart={restart} onReveal={() => setShowReveal(true)}/>}
    {showReveal && <ConfirmSolutionModal onCancel={() => setShowReveal(false)} onReveal={reveal}/>}
  </>
}
