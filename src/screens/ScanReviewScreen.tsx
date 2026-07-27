import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { NumberPad } from '../components/NumberPad'
import { PuzzleWorkspace } from '../components/PuzzleWorkspace'
import { SudokuBoard } from '../components/SudokuBoard'
import { boardValues } from '../engine/board'
import { findSolutions } from '../engine/fullSolver'
import { validatePuzzle } from '../engine/validatePuzzle'
import { scannerSession } from '../scanner/session'
import { usePuzzleStore } from '../store/puzzleStore'

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
    if (!result) { navigate('/camera', { replace: true }); return }
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
  if (!result) return null

  const hasClues = board.some((row) => row.some((cell) => cell.value))
  const noCluesDetected = detectedClues.length === 0
  const gridDetected = result.image.bounds.size > 0
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
    if (!hasClues) { setError('Enter at least one starting clue before continuing.'); return }
    if (unresolved.length) { setError(`Confirm the ${unresolved.length} uncertain ${unresolved.length === 1 ? 'clue' : 'clues'} before continuing.`); selectNextUncertain(); return }
    const validation = validatePuzzle(boardValues(board))
    if (!validation.valid) { setError('Duplicate starting numbers are highlighted. Correct them before continuing.'); return }
    const grid = boardValues(board)
    const solutions = findSolutions(grid, 2)
    if (!solutions.length) { setError('This puzzle has no solution. Check the scanned clues.'); return }
    setPuzzle(grid, 'scan')
    usePuzzleStore.getState().setSolution(solutions[0])
    scannerSession.clear()
    navigate('/solve')
  }

  return <>
    <PuzzleWorkspace
      className="review-workspace"
      header={<div className="workspace-heading"><div><p className="eyebrow">Review scan</p><h1>Check uncertainty</h1><p>{unresolved.length ? `${unresolved.length} low-confidence ${unresolved.length === 1 ? 'clue needs' : 'clues need'} a look.` : 'All uncertain clues are resolved.'}</p></div>{error && <p className="form-error" role="alert">{error}</p>}{result.diagnostics.map((diagnostic) => <p className="diagnostic workspace-diagnostic" key={diagnostic.code}>{diagnostic.message}</p>)}{noCluesDetected && <p className="scan-recovery workspace-recovery" role="status">{gridDetected ? <><strong>No clues detected.</strong> Enter clues below or rescan with a brighter photo.</> : <><strong>No Sudoku grid detected.</strong> Rescan with the full grid in frame.</>}</p>}</div>}
      board={<div className="review-board-stack"><SudokuBoard showCandidates={false} lowConfidenceCells={lowConfidenceCells} scanReview={{ pending: unresolved.map(({ row, col }) => ({ row, col })), reviewed: reviewed.map(({ row, col }) => ({ row, col })) }}/><div className="review-status" role="status" aria-label="Scan review status"><span><strong>{detectedClues.length}</strong> scanned</span><span><strong>{reviewed.length}</strong> confirmed</span><span><strong>{unresolved.length}</strong> to review</span></div></div>}
      dock={<div className="review-dock"><NumberPad notesMode={false} onToggleNotes={() => undefined} showNotesToggle={false}/><div className="review-actions"><button type="button" onClick={() => setShowPhoto(true)} disabled={!scannerSession.preview()}>Compare photo</button><button type="button" onClick={resolveSelected} disabled={!selectedNeedsReview}>Confirm value</button><button type="button" onClick={selectNextUncertain} disabled={!unresolved.length}>Next uncertain</button><button type="button" className="primary-action" onClick={continueToSolver} disabled={!hasClues}>Continue</button></div><Link className="text-button rescan-link" to="/camera">Rescan puzzle</Link></div>}
    />
    {showPhoto && scannerSession.preview() && <div className="photo-modal-backdrop photo-sheet-backdrop" role="presentation" onClick={() => setShowPhoto(false)}><section className="photo-modal solver-sheet" role="dialog" aria-modal="true" aria-labelledby="photo-modal-title" onClick={(event) => event.stopPropagation()}><div className="photo-modal-header"><h2 id="photo-modal-title">Compare with original photo</h2><button type="button" className="icon-button" aria-label="Close photo" onClick={() => setShowPhoto(false)}>×</button></div><img src={scannerSession.preview() ?? ''} alt="Original puzzle photo"/></section></div>}
  </>
}
