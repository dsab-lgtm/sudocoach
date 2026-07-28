import { useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { HintPanel } from '../components/HintPanel'
import { InlineFeedback } from '../components/InlineFeedback'
import { NumberPad } from '../components/NumberPad'
import { PuzzleWorkspace } from '../components/PuzzleWorkspace'
import { SudokuBoard } from '../components/SudokuBoard'
import type { BoardFeedback } from '../components/puzzleViewTypes'
import { boardValues, createBoard } from '../engine/board'
import { getCandidateState } from '../engine/candidates'
import { getNextLogicalStep } from '../engine/logicalSolver'
import type { Board, CellPosition, Digit } from '../engine/types'
import { exerciseFor } from '../practice/exercises'

const samePosition = (left: CellPosition, right: CellPosition) => left.row === right.row && left.col === right.col

export function PracticeSessionScreen() {
  const { exerciseId, technique } = useParams()
  const exercise = exerciseFor(technique, exerciseId)
  const [board, setBoard] = useState<Board>(() => exercise ? createBoard(exercise.grid) : createBoard(Array.from({ length: 9 }, () => Array(9).fill(null))))
  const [selected, setSelected] = useState<CellPosition>({ row: 0, col: 0 })
  const [showExplanation, setShowExplanation] = useState(false)
  const [status, setStatus] = useState<{ message: string; tone: 'success' | 'error' } | null>(null)
  const [boardFeedback, setBoardFeedback] = useState<BoardFeedback | null>(null)
  const feedbackSequence = useRef(0)
  const values = useMemo(() => boardValues(board), [board])
  const candidateState = useMemo(() => getCandidateState(values, board), [board, values])
  const step = useMemo(() => exercise ? getNextLogicalStep(exercise.grid) : null, [exercise])

  if (!exercise || !step || step.technique !== exercise.technique) return <section className="practice-catalog"><h1>Practice exercise unavailable</h1><p>This exercise no longer matches a reliable logical step.</p><Link to="/practice">Return to practice</Link></section>

  const onEnterDigit = (position: CellPosition, digit: Digit) => {
    if (board[position.row][position.col].given) return
    setBoard((current) => current.map((row, rowIndex) => row.map((cell, col) => rowIndex === position.row && col === position.col ? { ...cell, value: digit, origin: 'manual' } : cell)))
  }
  const presentation = {
    cells: board.map((row, rowIndex) => row.map((cell, col) => {
      const candidate = candidateState.get(`${rowIndex}:${col}`)
      return {
        value: cell.value,
        fixed: Boolean(cell.given),
        notes: cell.notes,
        candidates: candidate?.generated ?? [],
        candidateMarks: candidate?.generated.map((digit) => ({ digit, source: 'generated' as const })) ?? [],
        origin: cell.origin,
        state: { selected: selected.row === rowIndex && selected.col === col, related: false, matching: false, hintTarget: false, hintSupporting: false, hintUnit: false, hintRevealed: false, removedCandidates: [], invalid: false, lowConfidence: false, scanCorrected: false, scanReview: null }
      }
    }))
  }
  const check = () => {
    if (step.action === 'place-number') {
      const target = step.targetCells[0]
      const correct = values[target.row][target.col] === step.value
      setStatus(correct ? { message: 'Correct. You found the logical move.', tone: 'success' } : { message: 'Not yet. Check the highlighted technique and try again.', tone: 'error' })
      setBoardFeedback({ id: ++feedbackSequence.current, kind: correct ? 'recovered' : 'diagnosis', cells: correct ? [target] : [selected] })
      return
    }
    const correct = step.targetCells.some((target) => samePosition(target, selected))
    setStatus(correct ? { message: 'Correct target. This candidate can be removed there.', tone: 'success' } : { message: 'Choose one target cell where the candidate can be removed.', tone: 'error' })
    setBoardFeedback({ id: ++feedbackSequence.current, kind: correct ? 'recovered' : 'diagnosis', cells: [selected] })
  }
  const selectedCell = board[selected.row][selected.col]
  return <PuzzleWorkspace
    className="practice-workspace"
    header={<header className="practice-session__header"><div><p className="eyebrow">Practice · {exercise.technique.replaceAll('-', ' ')}</p><h1>{exercise.title}</h1>{status ? <InlineFeedback tone={status.tone}>{status.message}</InlineFeedback> : <p>Find the next logical step, then check your choice.</p>}</div><Link to="/practice">Exit practice</Link></header>}
    board={<SudokuBoard presentation={{ ...presentation, feedback: boardFeedback }} interactions={{ onSelect: setSelected, onEnterDigit, onToggleCandidate: () => undefined, onErase: (position) => setBoard((current) => current.map((row, rowIndex) => row.map((cell, col) => rowIndex === position.row && col === position.col ? { ...cell, value: null } : cell))) }} showCandidates/>}
    dock={<div className="practice-dock"><NumberPad notesMode={false} disabled={Boolean(selectedCell.given)} allowedActions={{ canEnterValue: !selectedCell.given, canErase: !selectedCell.given, canToggleNotes: false }} onValueEntry={(digit) => onEnterDigit(selected, digit)} onErase={() => setBoard((current) => current.map((row, rowIndex) => row.map((cell, col) => rowIndex === selected.row && col === selected.col ? { ...cell, value: null } : cell)))} showNotesToggle={false}/><div className="practice-dock__actions"><Button variant="secondary" onClick={() => setShowExplanation((current) => !current)}>{showExplanation ? 'Hide explanation' : 'Explain technique'}</Button><Button variant="primary" onClick={check}>Check move</Button></div>{showExplanation && <div className="practice-explanation"><HintPanel step={step} level={2} onLevel={() => undefined} onApply={() => undefined}/></div>}</div>}
  />
}
