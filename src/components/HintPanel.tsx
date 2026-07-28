import { DIGITS, type HintConstraint, type SolverStep, type UnitKind } from '../engine/types'
import { Button } from './Button'

const unitName = (kind: UnitKind, index: number) => kind === 'box' ? `Box ${index + 1}` : `${kind[0].toUpperCase()}${kind.slice(1)} ${index + 1}`
const positionName = ({ row, col }: { row: number; col: number }) => `R${row + 1}C${col + 1}`
const constraintText = ({ kind, index, values }: HintConstraint) => `${unitName(kind, index)} contains ${values.length ? values.join(', ') : 'no placed values'}.`

const firstPrompt = (step: SolverStep) => {
  const target = positionName(step.targetCells[0])
  if (step.technique === 'naked-single') return `Check ${target}. Its highlighted row, column, and box leave only one candidate.`
  if (step.technique === 'hidden-single') return `Inspect the highlighted ${step.focusUnits[0].kind}. One digit has only one possible home.`
  if (step.technique === 'naked-pair') return 'Compare the two outlined cells. They share the same two candidates.'
  if (step.technique === 'pointing-pair') return 'Check where the highlighted candidate is confined inside the box.'
  return 'Check where the highlighted candidate is confined in the row or column.'
}

export function HintPanel({ step, level, onLevel, onApply }: { step: SolverStep | null; level: number; onLevel: (level: number) => void; onApply: () => void }) {
  if (!step) return <aside className="hint-panel"><strong>No logical move found</strong><p>Try checking candidate notes or reveal the full solution.</p></aside>
  const title = step.technique.replaceAll('-', ' ')
  return <aside className="hint-panel">
    <p className="eyebrow">Hint · {title}</p>
    <div className="hint-tokens" aria-label="Hint summary">
      <span className="hint-token technique-token">{title}</span>
      {level >= 2 && step.value && <span className="hint-token value-token">Only {step.value} fits</span>}
      {step.removedCandidates?.map((candidate) => <span className="hint-token remove-token" key={candidate}>Remove {candidate}</span>)}
      <span className="hint-token target-token">{step.targetCells.length} target{step.targetCells.length === 1 ? '' : 's'}</span>
    </div>
    <div className="hint-panel__detail" aria-live="polite">
      {level === 1 && <p>{firstPrompt(step)}</p>}
      {level >= 2 && <div className="hint-explanation"><p>{step.explanation}</p>{step.evidence?.constraints?.map((constraint) => <p className="hint-constraint" key={`${constraint.kind}:${constraint.index}`}>{constraintText(constraint)}</p>)}{step.technique === 'naked-single' && step.evidence?.targetCandidates && <p className="hint-conclusion">Together they eliminate {DIGITS.filter((digit) => !step.evidence?.targetCandidates?.includes(digit)).join(', ')}, leaving only <strong>{step.evidence.targetCandidates.join(', ')}</strong>.</p>}</div>}
      {level >= 3 && <p><strong>{step.action === 'place-number' ? `Reveal: place ${step.value} in ${positionName(step.targetCells[0])}.` : `Remove ${step.removedCandidates?.join(', ')} from the highlighted cells.`}</strong></p>}
    </div>
    <div className="hint-actions">
      {level < 3 && <Button variant="ghost" onClick={() => onLevel(level + 1)}>More detail</Button>}
      {level >= 3 && step.action === 'place-number' && <Button variant="primary" onClick={onApply}>Apply {step.value}</Button>}
    </div>
  </aside>
}
