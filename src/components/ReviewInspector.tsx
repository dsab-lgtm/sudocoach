import { Button } from './Button'
import { ScanValidationSummary } from './ScanValidationSummary'
import type { SolutionStatus } from '../engine/types'

type ReviewInspectorProps = {
  pending: number
  corrected: boolean
  added: boolean
  highConfidenceCount: number
  canAcceptHighConfidence: boolean
  canConfirm: boolean
  canContinue: boolean
  canRedo: boolean
  canUndo: boolean
  hasClues: boolean
  hasConflicts: boolean
  hasRiskItems: boolean
  validationStatus: SolutionStatus | 'checking'
  onAcceptHighConfidence: () => void
  onConfirm: () => void
  onContinue: () => void
  onNext: () => void
  onRedo: () => void
  onUndo: () => void
}

export function ReviewInspector({ pending, corrected, added, highConfidenceCount, canAcceptHighConfidence, canConfirm, canContinue, canRedo, canUndo, hasClues, hasConflicts, hasRiskItems, validationStatus, onAcceptHighConfidence, onConfirm, onContinue, onNext, onRedo, onUndo }: ReviewInspectorProps) {
  const showValidation = !pending || hasConflicts || validationStatus === 'unsolvable' || validationStatus === 'ambiguous'

  return <section className="review-inspector" aria-label="Review controls">
    <div className="review-inspector__actions">
      <Button variant="primary" disabled={!canConfirm} onClick={onConfirm}>{added ? 'Confirm added clue' : corrected ? 'Confirm correction' : 'Confirm value'}</Button>
      <Button variant="secondary" disabled={!pending} onClick={onNext}>Next needs review</Button>
    </div>
    {canAcceptHighConfidence && <div className="review-inspector__batch"><Button variant="secondary" onClick={onAcceptHighConfidence}>Accept {highConfidenceCount} high-confidence suggestions</Button><p>Other clues stay individual.</p></div>}
    {(canUndo || canRedo) && <div className="review-inspector__utility">
      {canUndo && <Button variant="ghost" onClick={onUndo}>Undo</Button>}
      {canRedo && <Button variant="ghost" onClick={onRedo}>Redo</Button>}
    </div>}
    {showValidation && <div className="review-inspector__status" aria-live="polite"><ScanValidationSummary hasClues={hasClues} hasConflicts={hasConflicts} hasRiskItems={hasRiskItems} status={validationStatus}/>{!canContinue && <p className="review-inspector__incomplete">Resolve the puzzle status before continuing.</p>}</div>}
    {canContinue && <Button variant="primary" onClick={onContinue}>Continue to solver</Button>}
  </section>
}
