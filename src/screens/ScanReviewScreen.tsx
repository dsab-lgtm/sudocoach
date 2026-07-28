import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { NumberPad } from '../components/NumberPad'
import { PhotoComparisonSheet } from '../components/PhotoComparisonSheet'
import { PuzzleWorkspace } from '../components/PuzzleWorkspace'
import { ReviewHeader } from '../components/ReviewHeader'
import { ReviewSummary } from '../components/ReviewSummary'
import { ScanConfidenceLegend } from '../components/ScanConfidenceLegend'
import { SudokuBoard } from '../components/SudokuBoard'
import { boardValues } from '../engine/board'
import { findSolutions } from '../engine/fullSolver'
import { validatePuzzle } from '../engine/validatePuzzle'
import { scannerSession } from '../scanner/session'
import { usePuzzleStore } from '../store/puzzleStore'
import { usePuzzleBoardController } from './usePuzzleBoardController'

const cellKey = (row: number, col: number) => `${row}:${col}`

export function ScanReviewScreen() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [resolved, setResolved] = useState<Set<string>>(new Set())
  const [showPhoto, setShowPhoto] = useState(false)
  const result = scannerSession.getResult()
  const setReviewGrid = usePuzzleStore((state) => state.setReviewGrid)
  const setPuzzle = usePuzzleStore((state) => state.setPuzzle)
  const board = usePuzzleStore((state) => state.board)
  const selected = usePuzzleStore((state) => state.selected)
  const select = usePuzzleStore((state) => state.select)

  useEffect(() => {
    if (!result) {
      navigate('/camera', { replace: true })
      return
    }
    setReviewGrid(result.grid)
    select({ row: 0, col: 0 })
    setResolved(new Set())
    setError(null)
  }, [navigate, result, select, setReviewGrid])

  const detectedClues = useMemo(() => result?.cells.filter((cell) => cell.value && cell.inkRatio >= 0.018) ?? [], [result])
  const uncertainCells = useMemo(() => detectedClues.filter((cell) => cell.confidence < 0.8), [detectedClues])
  const unresolved = useMemo(() => uncertainCells.filter((cell) => !resolved.has(cellKey(cell.row, cell.col))), [resolved, uncertainCells])
  const lowConfidenceCells = useMemo(() => unresolved.map(({ row, col }) => ({ row, col })), [unresolved])
  const reviewed = useMemo(() => uncertainCells.filter((cell) => resolved.has(cellKey(cell.row, cell.col))), [resolved, uncertainCells])
  const corrected = useMemo(() => uncertainCells.filter((cell) => board[cell.row][cell.col].value !== cell.value).map(({ row, col }) => ({ row, col })), [board, uncertainCells])
  const puzzle = usePuzzleBoardController({ notesMode: false, lowConfidenceCells, scanReview: { pending: unresolved, reviewed, corrected } })

  useEffect(() => { setError(null) }, [board])

  if (!result) return null

  const hasClues = board.some((row) => row.some((cell) => cell.value))
  const noCluesDetected = detectedClues.length === 0
  const gridDetected = result.image.bounds.size > 0
  const previewUrl = scannerSession.preview()
  const selectedKey = selected && cellKey(selected.row, selected.col)
  const selectedNeedsReview = Boolean(selectedKey && unresolved.some((cell) => cellKey(cell.row, cell.col) === selectedKey))
  const resolveSelected = () => {
    if (!selected || !selectedNeedsReview) return
    setResolved((current) => new Set(current).add(cellKey(selected.row, selected.col)))
    setError(null)
  }
  const selectNextUncertain = () => {
    if (!unresolved.length) return
    const currentIndex = selected ? unresolved.findIndex((cell) => cell.row === selected.row && cell.col === selected.col) : -1
    const next = unresolved[(currentIndex + 1) % unresolved.length]
    select({ row: next.row, col: next.col })
  }
  const continueToSolver = () => {
    if (!hasClues) {
      setError('Enter at least one starting clue before continuing.')
      return
    }
    if (unresolved.length) {
      setError(`Confirm the ${unresolved.length} uncertain ${unresolved.length === 1 ? 'clue' : 'clues'} before continuing.`)
      selectNextUncertain()
      return
    }
    const validation = validatePuzzle(boardValues(board))
    if (!validation.valid) {
      setError('Duplicate starting numbers are highlighted. Correct them before continuing.')
      return
    }
    const grid = boardValues(board)
    const solutions = findSolutions(grid, 2)
    if (!solutions.length) {
      setError('This puzzle has no solution. Check the scanned clues.')
      return
    }
    setPuzzle(grid, 'scan')
    usePuzzleStore.getState().setSolution(solutions[0])
    scannerSession.clear()
    navigate('/solve')
  }

  return <>
    <PuzzleWorkspace
      className="review-workspace"
      header={<ReviewHeader diagnostics={result.diagnostics} error={error} gridDetected={gridDetected} noCluesDetected={noCluesDetected} onBack={() => navigate('/')} unresolvedCount={unresolved.length}/>}
      board={<div className="review-board-stack"><SudokuBoard presentation={puzzle.presentation} interactions={puzzle.boardInteractions} showCandidates={false}/><ReviewSummary detected={detectedClues.length} reviewed={reviewed.length} unresolved={unresolved.length}/></div>}
      dock={<div className="review-dock">
        <NumberPad notesMode={false} disabled={puzzle.isKeypadDisabled} allowedActions={puzzle.allowedActions} {...puzzle.numberPadInteractions} showNotesToggle={false}/>
        <div className="review-actions">
          <Button variant="secondary" disabled={!previewUrl} onClick={() => setShowPhoto(true)}>Compare photo</Button>
          <Button variant="secondary" disabled={!selectedNeedsReview} onClick={resolveSelected}>Confirm value</Button>
          <Button variant="ghost" disabled={!unresolved.length} onClick={selectNextUncertain}>Next uncertain</Button>
          <Button variant="primary" disabled={!hasClues} onClick={continueToSolver}>Continue</Button>
        </div>
        <ScanConfidenceLegend/>
        <Link className="text-button rescan-link" to="/camera">Rescan puzzle</Link>
      </div>}
    />
    {showPhoto && previewUrl && <PhotoComparisonSheet previewUrl={previewUrl} onClose={() => setShowPhoto(false)}/>}
  </>
}
