import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PracticeCoachPanel } from '../components/PracticeCoachPanel'
import type { SudokuBoardPresentation } from '../components/puzzleViewTypes'
import { SudokuBoard } from '../components/SudokuBoard'
import { createBoard } from '../engine/board'
import { getNextLogicalStep } from '../engine/logicalSolver'
import type { Board, CellPosition } from '../engine/types'
import { lessonFor, practicePresentation, type PracticeClueStage } from '../practice/lesson'
import { exerciseFor, nextExerciseFor, type PracticeExercise } from '../practice/exercises'

const initialSelection = { row: 0, col: 0 }
const samePosition = (left: CellPosition, right: CellPosition) => left.row === right.row && left.col === right.col
const positionKey = ({ row, col }: CellPosition) => `${row}:${col}`

function PracticeFocusTray({ presentation, clueStage }: { presentation: SudokuBoardPresentation; clueStage: PracticeClueStage }) {
  if (clueStage < 2) return null
  const cells = presentation.cells.flatMap((row, rowIndex) => row.flatMap((cell, col) => {
    const marks = cell.candidateMarks ?? []
    return marks.length ? [{ position: `R${rowIndex + 1}C${col + 1}`, digits: marks.map((mark) => mark.digit).join(' · '), removed: marks.every((mark) => mark.source === 'removed') }] : []
  }))
  if (!cells.length) return null
  return <section className="practice-focus-tray" aria-label="Magnified candidate evidence">
    <div><p className="eyebrow">Candidate detail</p><h2>Evidence at a readable size</h2></div>
    <div className="practice-focus-tray__cells">{cells.map((cell) => <div key={cell.position} className={cell.removed ? 'is-removed' : ''}><span>{cell.position}</span><strong>{cell.digits}</strong></div>)}</div>
  </section>
}

function PracticeLesson({ exercise }: { exercise: PracticeExercise }) {
  const [board, setBoard] = useState<Board>(() => createBoard(exercise.grid))
  const [selected, setSelected] = useState<CellPosition>(initialSelection)
  const [clueStage, setClueStage] = useState<PracticeClueStage>(0)
  const [completedTargetKeys, setCompletedTargetKeys] = useState<string[]>([])
  const [completed, setCompleted] = useState(false)
  const [status, setStatus] = useState<{ message: string; tone: 'success' | 'info' | 'error' } | null>(null)
  const step = useMemo(() => getNextLogicalStep(exercise.grid), [exercise])

  if (!step || step.technique !== exercise.technique) return <section className="practice-catalog"><h1>Practice exercise unavailable</h1><p>This exercise no longer matches a reliable logical step.</p><Link to="/practice">Return to practice</Link></section>

  const lesson = lessonFor(step)
  const presentation = practicePresentation({ board, selected, lesson, clueStage })
  const nextExercise = nextExerciseFor(exercise)
  const replay = () => {
    setBoard(createBoard(exercise.grid))
    setSelected(initialSelection)
    setClueStage(0)
    setCompletedTargetKeys([])
    setCompleted(false)
    setStatus(null)
  }
  const applyPlacement = () => {
    const placedValue = step.value
    if (!placedValue) return
    const target = lesson.targets[0]
    setBoard((current) => current.map((row, rowIndex) => row.map((cell, col) =>
      rowIndex === target.row && col === target.col ? { ...cell, value: placedValue, origin: 'hint' } : cell
    )))
    setCompleted(true)
    setStatus({ message: `Correct. ${placedValue} is the only legal value for that cell.`, tone: 'success' })
  }
  const applyRemoval = (target: CellPosition) => {
    const key = positionKey(target)
    const nextKeys = [...completedTargetKeys, key]
    setBoard((current) => current.map((row, rowIndex) => row.map((cell, col) => {
      if (rowIndex !== target.row || col !== target.col) return cell
      return { ...cell, assistantExcluded: [...new Set([...(cell.assistantExcluded ?? []), ...(step.removedCandidates ?? [])])] }
    })))
    setCompletedTargetKeys(nextKeys)
    const isComplete = nextKeys.length === lesson.targetTotal
    setCompleted(isComplete)
    setStatus({ message: isComplete
      ? `Correct. ${step.removedCandidates?.join(' and ')} have been cleared from every affected cell.`
      : `Correct. ${step.removedCandidates?.join(' and ')} cannot stay there. Find the remaining affected cells in any order.`, tone: 'success' })
  }
  const check = () => {
    if (clueStage < 2) return
    if (step.action === 'place-number') {
      if (samePosition(selected, lesson.targets[0])) applyPlacement()
      else setStatus({ message: 'That cell is not forced by this pattern yet. Use the visible evidence to find the only legal home.', tone: 'error' })
      return
    }
    const target = lesson.targets.find((candidate) => samePosition(candidate, selected))
    if (!target) {
      setStatus({ message: 'This cell is not affected by the highlighted pattern. Follow the locked candidate into the other unit.', tone: 'error' })
      return
    }
    if (completedTargetKeys.includes(positionKey(target))) {
      setStatus({ message: 'You already crossed out this candidate. Choose another affected cell.', tone: 'info' })
      return
    }
    applyRemoval(target)
  }

  return <section className="practice-lesson" aria-labelledby="practice-session-title">
    <header className="practice-lesson__header">
      <div><p className="eyebrow">Practice · {exercise.methodName}</p><h1 id="practice-session-title">{exercise.title}</h1><p>{exercise.description}</p></div>
      <Link to="/practice">Exit practice</Link>
    </header>
    <div className="practice-lesson__body">
      <section className="practice-lesson__board" aria-label="Practice board">
        <SudokuBoard
          presentation={presentation}
          interactions={{ onSelect: setSelected, onEnterDigit: () => undefined, onToggleCandidate: () => undefined, onErase: () => undefined }}
          selectionOnly
          showCandidates={false}
          showHintMarker={false}
        />
        <p className="practice-lesson__board-help">Select a cell, then check your {step.action === 'place-number' ? 'placement' : 'removals'}. Use the arrow keys to move around the grid.</p>
        <PracticeFocusTray presentation={presentation} clueStage={clueStage}/>
      </section>
      <aside className="practice-lesson__coach">
        <PracticeCoachPanel
          clueStage={clueStage}
          lesson={lesson}
          completed={completed}
          completedTargets={completedTargetKeys.length}
          status={status}
          onCheck={check}
          onAdvanceClue={() => setClueStage((stage) => Math.min(2, stage + 1) as PracticeClueStage)}
          onRevealAnswer={() => setClueStage(3)}
          onReplay={replay}
        />
        {completed && <nav className="practice-lesson__next" aria-label="Practice lesson navigation">
          {nextExercise ? <Link className="ui-button ui-button--primary" to={`/practice/${nextExercise.technique}/${nextExercise.id}`}>Next lesson</Link> : <Link className="ui-button ui-button--primary" to="/practice">Choose another method</Link>}
          <Link className="ui-button ui-button--ghost" to="/practice">Back to methods</Link>
        </nav>}
      </aside>
    </div>
  </section>
}

export function PracticeSessionScreen() {
  const { exerciseId, technique } = useParams()
  const exercise = exerciseFor(technique, exerciseId)
  if (!exercise) return <section className="practice-catalog"><h1>Practice exercise unavailable</h1><p>This exercise is not available.</p><Link to="/practice">Return to practice</Link></section>
  return <PracticeLesson key={exercise.id} exercise={exercise}/>
}
