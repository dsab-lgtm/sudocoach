import { Button } from './Button'
import { ScanValidationSummary } from './ScanValidationSummary'
import type { SolutionStatus } from '../engine/types'

type ReviewInspectorProps = {
  pending: number
  corrected: boolean
  canAcceptHighConfidence: boolean
  canConfirm: boolean
  canContinue: boolean
  canRedo: boolean
  canUndo: boolean
  hasClues: boolean
  hasConflicts: boolean
  validationStatus: SolutionStatus | 'checking'
  onAcceptHighConfidence: () => void
  onConfirm: () => void
  onContinue: () => void
  onNext: () => void
  onRedo: () => void
  onUndo: () => void
}

export function ReviewInspector({ pending, corrected, canAcceptHighConfidence, canConfirm, canContinue, canRedo, canUndo, hasClues, hasConflicts, validationStatus, onAcceptHighConfidence, onConfirm, onContinue, onNext, onRedo, onUndo }: ReviewInspectorProps) {
  return <section className="review-inspector" aria-label="Review controls">
    <div className="review-inspector__actions">
      <Button variant="secondary" disabled={!canConfirm} onClick={onConfirm}>{corrected ? 'Confirm correction' : 'Confirm value'}</Button>
      <Button variant="secondary" disabled={!pending} onClick={onNext}>Next needs review</Button>
    </div>
    <div className="review-inspector__utility">
      <Button variant="ghost" disabled={!canUndo} onClick={onUndo}>Undo</Button>
      <Button variant="ghost" disabled={!canRedo} onClick={onRedo}>Redo</Button>
      {canAcceptHighConfidence && <Button variant="ghost" onClick={onAcceptHighConfidence}>Accept high-confidence</Button>}
    </div>
    <div className="review-inspector__status" aria-live="polite"><ScanValidationSummary hasClues={hasClues} hasConflicts={hasConflicts} status={validationStatus}/>{!canContinue && <p className="review-inspector__incomplete">{pending ? `${pending} ${pending === 1 ? 'clue remains' : 'clues remain'} before you can continue.` : 'Resolve the puzzle status before continuing.'}</p>}</div>
    {canContinue && <Button variant="primary" onClick={onContinue}>Continue to solver</Button>}
  </section>
}
