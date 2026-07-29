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
const clueCells = (cells: readonly ScanCell[]) => cells.filter((cell) => cell.value !== null)
const reviewGrid = (cells: readonly ScanCell[]) => {
  const grid = Array.from({ length: 9 }, () => Array<Digit | null>(9).fill(null))
  clueCells(cells).forEach((cell) => { grid[cell.row][cell.col] = cell.value })
  return grid
}
type ReviewDecision = { value: Digit | null; mode: 'individual' | 'batch' }
type ReviewItem = { position: CellPosition; kind: 'scanner' | 'added'; cell?: ScanCell }

export function ScanReviewScreen() {
  const navigate = useNavigate()
  const [decisions, setDecisions] = useState<Map<string, ReviewDecision>>(new Map())
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
  const detectedClues = useMemo(() => clueCells(result?.cells ?? []), [result])

  useEffect(() => {
    if (!result) {
      navigate('/camera', { replace: true })
      return
    }
    const first = clueCells(result.cells)[0]
    setReviewGrid(reviewGrid(result.cells))
    select(first ? positionOf(first) : { row: 0, col: 0 })
    setDecisions(new Map())
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

  const isConfirmed = (position: CellPosition, value: Digit | null) => decisions.get(cellKey(position.row, position.col))?.value === value
  const pendingClues = detectedClues.filter((cell) => !isConfirmed(cell, board[cell.row][cell.col].value))
  const confirmedClues = detectedClues.filter((cell) => isConfirmed(cell, board[cell.row][cell.col].value))
  const corrected = detectedClues.filter((cell) => board[cell.row][cell.col].value !== cell.value).map(positionOf)
  const detectedKeys = new Set(detectedClues.map((cell) => cellKey(cell.row, cell.col)))
  const addedClues = board.flatMap((row, rowIndex) => row.flatMap((cell, col) =>
    cell.value && cell.origin === 'manual' && !detectedKeys.has(cellKey(rowIndex, col)) ? [{ row: rowIndex, col, value: cell.value }] : []
  ))
  const pendingAdded = addedClues.filter((cell) => !isConfirmed(cell, cell.value))
  const confirmedAdded = addedClues.filter((cell) => isConfirmed(cell, cell.value))
  const policyThreshold = result?.confidencePolicy?.reviewThreshold
  const isBatchEligible = (cell: ScanCell) => policyThreshold !== undefined
    && cell.confidence >= policyThreshold
    && cell.inkRatio >= 0.018
    && board[cell.row][cell.col].value === cell.value
  const highConfidenceClues = pendingClues.filter(isBatchEligible)
  const riskClues = pendingClues.filter((cell) => !isBatchEligible(cell))
  const pendingItems: ReviewItem[] = [
    ...pendingAdded.map((item) => ({ position: positionOf(item), kind: 'added' as const })),
    ...pendingClues.map((cell) => ({ position: positionOf(cell), kind: 'scanner' as const, cell }))
  ]
  const priorityItems: ReviewItem[] = [
    ...pendingAdded.map((item) => ({ position: positionOf(item), kind: 'added' as const })),
    ...riskClues.sort((left, right) => left.confidence - right.confidence || left.inkRatio - right.inkRatio || left.row - right.row || left.col - right.col).map((cell) => ({ position: positionOf(cell), kind: 'scanner' as const, cell }))
  ]
  const selectedPending = Boolean(selected && pendingItems.some((item) => item.position.row === selected.row && item.position.col === selected.col))
  const selectedAdded = Boolean(selected && pendingAdded.some((cell) => cell.row === selected.row && cell.col === selected.col))
  const selectedCorrected = Boolean(selected && corrected.some((cell) => cell.row === selected.row && cell.col === selected.col))
  const reviewedCount = confirmedClues.length + confirmedAdded.length
  const lowConfidence = detectedClues.filter((cell) => !isBatchEligible(cell)).map(positionOf)
  const puzzle = usePuzzleBoardController({
    notesMode: false,
    lowConfidenceCells: lowConfidence,
    scanReview: {
      added: addedClues.map(positionOf),
      pending: [],
      reviewed: [],
      scanned: detectedClues.map(positionOf),
      needsReview: [...pendingClues, ...pendingAdded].map(positionOf),
      confirmed: [...confirmedClues, ...confirmedAdded].map(positionOf),
      corrected
    }
  })

  if (!result) return null

  const confirmSelected = () => {
    if (!selected || !selectedPending) return
    const currentPosition = { ...selected }
    setDecisions((current) => new Map(current).set(cellKey(currentPosition.row, currentPosition.col), { value: board[currentPosition.row][currentPosition.col].value, mode: 'individual' }))
    const next = [...priorityItems, ...pendingItems].find((item) => item.position.row !== currentPosition.row || item.position.col !== currentPosition.col)
    if (next) select(next.position)
  }
  const selectNext = () => {
    const queue = priorityItems.length ? priorityItems : pendingItems
    if (!queue.length) return
    const currentIndex = selected ? queue.findIndex((item) => item.position.row === selected.row && item.position.col === selected.col) : -1
    select(queue[(currentIndex + 1) % queue.length].position)
  }
  const acceptHighConfidence = () => {
    if (!highConfidenceClues.length) return
    setDecisions((current) => {
      const next = new Map(current)
      highConfidenceClues.forEach((cell) => next.set(cellKey(cell.row, cell.col), { value: board[cell.row][cell.col].value, mode: 'batch' }))
      return next
    })
    const next = priorityItems.find((item) => item.kind === 'added' || !highConfidenceClues.some((cell) => cell.row === item.position.row && cell.col === item.position.col))
    if (next) select(next.position)
  }
  const continueToSolver = () => {
    if (pendingItems.length || !immediateValidation.valid || validationStatus !== 'unique') return
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
    header={<ReviewHeader diagnostics={result.diagnostics} error={null} gridDetected={result.image.bounds.size > 0} noCluesDetected={!detectedClues.length} onBack={() => discardScan('/')} reviewedCount={reviewedCount} detectedCount={detectedClues.length} addedCount={addedClues.length} unresolvedCount={pendingItems.length}/>}
    source={<SourceImagePanel variant="reference" cells={result.cells} previewUrl={scannerSession.preview()} selected={selected} onSelectCell={select}/>}
    board={<SudokuBoard presentation={puzzle.presentation} interactions={puzzle.boardInteractions} showCandidates={false} autoAdvance={false} mode="scan-review" density="compact"/>}
    inspector={<SourceImagePanel variant="selected-inspector" cells={result.cells} previewUrl={scannerSession.preview()} selected={selected} onSelectCell={select}/>}
    keypad={<div className="scan-review-keypad"><NumberPad notesMode={false} disabled={puzzle.isKeypadDisabled} allowedActions={puzzle.allowedActions} {...puzzle.numberPadInteractions} showNotesToggle={false}/><ReviewInspector
        pending={pendingItems.length}
        corrected={selectedCorrected}
        added={selectedAdded}
        highConfidenceCount={highConfidenceClues.length}
        canAcceptHighConfidence={highConfidenceClues.length > 0}
        canConfirm={selectedPending}
        canContinue={!pendingItems.length && immediateValidation.valid && validationStatus === 'unique'}
        canRedo={canRedo}
        canUndo={canUndo}
        hasClues={hasClues}
        hasConflicts={!immediateValidation.valid}
        hasRiskItems={lowConfidence.length > 0 || addedClues.length > 0 || corrected.length > 0}
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
