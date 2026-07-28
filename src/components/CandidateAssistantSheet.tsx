import type { CandidateMode, SolverStep } from '../engine/types'
import { Button } from './Button'
import { CandidateModeControl } from './CandidateModeControl'
import { Modal } from './Modal'

export function CandidateAssistantSheet({ mode, onClose, onMode, staleCount, step, onCleanup, onApplyStep }: {
  mode: CandidateMode
  onClose: () => void
  onMode: (mode: CandidateMode) => void
  staleCount: number
  step: SolverStep | null
  onCleanup: () => void
  onApplyStep: () => void
}) {
  const description = mode === 'manual' ? 'Only your pencil notes are shown.' : mode === 'cleanup' ? 'Review notes that are no longer legal before removing them.' : mode === 'guided' ? 'Use explainable logical steps to refine the generated layer.' : 'Legal candidates update automatically as values change.'
  return <Modal eyebrow="Candidate assistant" title="Candidates" description={description} onClose={onClose}>
    <CandidateModeControl mode={mode} onChange={onMode}/>
    {mode === 'cleanup' && <div className="candidate-sheet__action"><p role="status">{staleCount ? `${staleCount} stale manual ${staleCount === 1 ? 'note is' : 'notes are'} ready for review.` : 'All manual notes are currently legal.'}</p>{Boolean(staleCount) && <Button variant="secondary" onClick={onCleanup}>Remove {staleCount} stale notes</Button>}</div>}
    {mode === 'guided' && <div className="candidate-sheet__action"><p>{step ? step.explanation : 'No explained candidate step is available yet.'}</p>{step?.action === 'remove-candidate' && <Button variant="secondary" onClick={onApplyStep}>Apply explained removal</Button>}</div>}
    <div className="modal-actions"><Button variant="ghost" onClick={onClose}>Close</Button></div>
  </Modal>
}
