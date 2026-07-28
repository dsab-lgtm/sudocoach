import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { NumberPad } from '../components/NumberPad'
import { ReviewHeader } from '../components/ReviewHeader'
import { ReviewInspector } from '../components/ReviewInspector'
import { ScanReviewWorkspace } from '../components/ScanReviewWorkspace'
import { SourceImagePanel } from '../components/SourceImagePanel'
import { SudokuBoard } from '../components/SudokuBoard'
import { boardValues } from '../engine/board'
import { analyzeSolutions } from '../engine/fullSolver'
import type { CellPosition, Digit, SolutionStatus } from '../engine/types'
import { validatePuzzle } from '../engine/validatePuzzle'
import { scannerSession } from '../scanner/session'
import type { ScanCell } from '../scanner/types'
import { usePuzzleStore } from '../store/puzzleStore'
import { usePuzzleBoardController } from './usePuzzleBoardController'

const cellKey = (row: number, col: number) => `${row}:${col}`
const positionOf = ({ row, col }: CellPosition) => ({ row, col })
const clueCells = (cells: readonly ScanCell[]) => cells.filter((cell) => cell.value !== null && cell.inkRatio >= 0.018)

export function ScanReviewScreen() {
  const navigate = useNavigate()
  const [confirmedValues, setConfirmedValues] = useState<Map<string, Digit | null>>(new Map())
  const [validationStatus, setValidationStatus] = useState<SolutionStatus | 'checking'>('unknown')
  const result = scannerSession.getResult()
  const setReviewGrid = usePuzzleStore((state) => state.setReviewGrid)
  const setPuzzle = usePuzzleStore((state) => state.setPuzzle)
  const board = usePuzzleStore((state) => state.board)
  const selected = usePuzzleStore((state) => state.selected)
  const select = usePuzzleStore((state) => state.select)
  const undo = usePuzzleStore((state) => state.undoMove)
  const redo = usePuzzleStore((state) => state.redoMove)
  const canUndo = usePuzzleStore((state) => state.undo.length > 0)
  const canRedo = usePuzzleStore((state) => state.redo.length > 0)

  useEffect(() => {
    if (!result) {
      navigate('/camera', { replace: true })
      return
    }
    const first = clueCells(result.cells)[0]
    setReviewGrid(result.grid)
    select(first ? positionOf(first) : { row: 0, col: 0 })
    setConfirmedValues(new Map())
    setValidationStatus('unknown')
  }, [navigate, result, select, setReviewGrid])

  const values = useMemo(() => boardValues(board), [board])
  const immediateValidation = useMemo(() => validatePuzzle(values), [values])
  const hasClues = values.some((row) => row.some(Boolean))

  useEffect(() => {
    if (!hasClues) { setValidationStatus('unknown'); return }
    if (!immediateValidation.valid) { setValidationStatus('invalid'); return }
    setValidationStatus('checking')
    const timer = window.setTimeout(() => setValidationStatus(analyzeSolutions(values).status), 250)
    return () => window.clearTimeout(timer)
  }, [hasClues, immediateValidation.valid, values])

  const detectedClues = clueCells(result?.cells ?? [])
  const isConfirmed = (cell: ScanCell) => confirmedValues.get(cellKey(cell.row, cell.col)) === board[cell.row][cell.col].value && confirmedValues.has(cellKey(cell.row, cell.col))
  const pendingClues = detectedClues.filter((cell) => !isConfirmed(cell))
  const priorityClues = [...pendingClues].sort((left, right) => left.confidence - right.confidence || left.row - right.row || left.col - right.col)
  const confirmedClues = detectedClues.filter(isConfirmed)
  const corrected = detectedClues.filter((cell) => board[cell.row][cell.col].value !== cell.value).map(positionOf)
  const policyThreshold = result?.modelStatus === 'production' ? result.confidencePolicy?.reviewThreshold : undefined
  const highConfidenceClues = policyThreshold === undefined ? [] : pendingClues.filter((cell) => cell.confidence >= policyThreshold && board[cell.row][cell.col].value === cell.value)
  const selectedPending = Boolean(selected && pendingClues.some((cell) => cell.row === selected.row && cell.col === selected.col))
  const selectedCorrected = Boolean(selected && corrected.some((cell) => cell.row === selected.row && cell.col === selected.col))
  const puzzle = usePuzzleBoardController({
    notesMode: false,
    scanReview: {
      pending: [],
      reviewed: [],
      scanned: detectedClues.map(positionOf),
      needsReview: pendingClues.map(positionOf),
      confirmed: confirmedClues.map(positionOf),
      corrected
    }
  })

  if (!result) return null

  const confirmSelected = () => {
    if (!selected || !selectedPending) return
    setConfirmedValues((current) => new Map(current).set(cellKey(selected.row, selected.col), board[selected.row][selected.col].value))
  }
  const selectNext = () => {
    if (!priorityClues.length) return
    const currentIndex = selected ? priorityClues.findIndex((cell) => cell.row === selected.row && cell.col === selected.col) : -1
    select(positionOf(priorityClues[(currentIndex + 1) % priorityClues.length]))
  }
  const acceptHighConfidence = () => {
    if (!highConfidenceClues.length) return
    setConfirmedValues((current) => {
      const next = new Map(current)
      highConfidenceClues.forEach((cell) => next.set(cellKey(cell.row, cell.col), board[cell.row][cell.col].value))
      return next
    })
  }
  const continueToSolver = () => {
    if (pendingClues.length || !immediateValidation.valid || validationStatus !== 'unique') return
    const analysis = analyzeSolutions(values)
    if (analysis.status !== 'unique' || !analysis.solution) return
    setPuzzle(values, 'scan')
    usePuzzleStore.getState().setSolution(analysis.solution, analysis.status)
    scannerSession.clear()
    navigate('/solve')
  }
  const discardScan = (to: '/' | '/camera') => {
    scannerSession.clear()
    navigate(to)
  }

  return <ScanReviewWorkspace
    header={<ReviewHeader diagnostics={result.diagnostics} error={null} gridDetected={result.image.bounds.size > 0} noCluesDetected={!detectedClues.length} onBack={() => discardScan('/')} reviewedCount={confirmedClues.length} detectedCount={detectedClues.length}/>}
    source={<SourceImagePanel variant="reference" cells={result.cells} previewUrl={scannerSession.preview()} selected={selected} onSelectCell={select}/>}
    board={<SudokuBoard presentation={puzzle.presentation} interactions={puzzle.boardInteractions} showCandidates={false} autoAdvance={false} mode="scan-review" density="compact"/>}
    inspector={<SourceImagePanel variant="selected-inspector" cells={result.cells} previewUrl={scannerSession.preview()} selected={selected} onSelectCell={select}/>}
    keypad={<div className="scan-review-keypad"><NumberPad notesMode={false} disabled={puzzle.isKeypadDisabled} allowedActions={puzzle.allowedActions} {...puzzle.numberPadInteractions} showNotesToggle={false}/><ReviewInspector
        pending={pendingClues.length}
        corrected={selectedCorrected}
        canAcceptHighConfidence={highConfidenceClues.length > 0}
        canConfirm={selectedPending}
        canContinue={!pendingClues.length && immediateValidation.valid && validationStatus === 'unique'}
        canRedo={canRedo}
        canUndo={canUndo}
        hasClues={hasClues}
        hasConflicts={!immediateValidation.valid}
        validationStatus={validationStatus}
        onAcceptHighConfidence={acceptHighConfidence}
        onConfirm={confirmSelected}
        onContinue={continueToSolver}
        onNext={selectNext}
        onRedo={redo}
        onUndo={undo}
      /><Button variant="ghost" onClick={() => discardScan('/camera')}>Rescan puzzle</Button></div>}
  />
}
