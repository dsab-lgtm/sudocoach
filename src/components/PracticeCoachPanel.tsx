import { Button } from './Button'
import type { FeedbackTone } from './feedbackContext'
import { InlineFeedback } from './InlineFeedback'
import { Surface } from './Surface'
import type { PracticeClueStage, PracticeLessonStep } from '../practice/lesson'
import { practiceClue, practiceTask } from '../practice/lesson'

const stageNames = ['Observe', 'Locate', 'Prove it', 'Answer'] as const

export function PracticeCoachPanel({ clueStage, lesson, completed, completedTargets, status, onCheck, onAdvanceClue, onRevealAnswer, onReplay }: {
  clueStage: PracticeClueStage
  lesson: PracticeLessonStep
  completed: boolean
  completedTargets: number
  status: { message: string; tone: FeedbackTone } | null
  onCheck: () => void
  onAdvanceClue: () => void
  onRevealAnswer: () => void
  onReplay: () => void
}) {
  const isRemoval = lesson.step.action === 'remove-candidate'
  const canCheck = clueStage >= 2
  return <Surface className="practice-coach" elevation="raised" role="region" aria-label="Practice coach">
    <div className="practice-coach__heading"><div><p className="eyebrow">Guided lesson</p><h2>{completed ? 'Lesson complete' : lesson.methodName}</h2></div>{isRemoval && <span className="practice-coach__count">{completedTargets} of {lesson.targetTotal}</span>}</div>
    {completed ? <>
      <p>{lesson.teaching.completion}</p>
      <p className="practice-coach__next-scan"><strong>Next scan:</strong> {lesson.teaching.nextScan}</p>
      <Button variant="secondary" onClick={onReplay}>Try this lesson again</Button>
    </> : <>
      {lesson.hasCandidatePrimer && clueStage === 0 && <div className="practice-coach__primer"><strong>Candidate notes</strong><p>Small digits are possibilities, not placed values. A crossed-out digit is no longer possible in that cell.</p></div>}
      <p className="practice-coach__invariant">{lesson.teaching.invariant}</p>
      <p className="practice-coach__task">{practiceTask(lesson, clueStage)}</p>
      {clueStage >= 1 && <div className="practice-coach__units" aria-label="Relevant Sudoku units"><span>Relevant units</span><div>{lesson.unitLabels.map((label) => <b key={label}>{label}</b>)}</div></div>}
      {clueStage >= 2 && <div className="practice-coach__legend" aria-label="Board guide"><span><i className="practice-coach__legend-unit"/>Relevant unit</span><span><i className="practice-coach__legend-evidence"/>Evidence cell</span>{clueStage === 3 && <span><i className="practice-coach__legend-target"/>Answer target</span>}</div>}
      <div className="practice-coach__clue" aria-live="polite"><span>{stageNames[clueStage]} · {clueStage + 1} of 4</span><p>{practiceClue(lesson, clueStage)}</p></div>
      {status && <InlineFeedback tone={status.tone}>{status.message}</InlineFeedback>}
      <div className="practice-coach__actions">
        {clueStage < 2 && <Button variant="secondary" onClick={onAdvanceClue}>Show next clue</Button>}
        {clueStage === 2 && <Button variant="secondary" onClick={onRevealAnswer}>Reveal answer</Button>}
        <Button variant="primary" disabled={!canCheck} onClick={onCheck}>{isRemoval ? 'Check removals' : 'Check placement'}</Button>
      </div>
    </>}
  </Surface>
}
