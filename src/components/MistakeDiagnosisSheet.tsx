import type { MistakeDiagnosis } from '../engine/mistakeDiagnosis'
import { Button } from './Button'
import { Modal } from './Modal'

const titleFor = (kind: MistakeDiagnosis['kind']) => ({
  'invalid-source-clue': 'Source clues need correction',
  'direct-conflict': 'Direct conflict found',
  'candidate-exhaustion': 'A cell has no candidates',
  'solution-mismatch': 'Selected value is incorrect',
  'earlier-mistake': 'An earlier value needs attention',
  clear: 'Check complete'
})[kind]

export function MistakeDiagnosisSheet({ diagnosis, canUndo, onClear, onClose, onCorrectSource, onUndo }: {
  diagnosis: MistakeDiagnosis
  canUndo: boolean
  onClear: () => void
  onClose: () => void
  onCorrectSource: () => void
  onUndo: () => void
}) {
  const canClear = Boolean(diagnosis.primaryCell) && diagnosis.kind !== 'invalid-source-clue' && diagnosis.kind !== 'clear'
  return <Modal eyebrow="Puzzle check" title={titleFor(diagnosis.kind)} description={diagnosis.message} onClose={onClose}>
    {diagnosis.cells.length > 0 && <p>{diagnosis.cells.length} {diagnosis.cells.length === 1 ? 'cell is' : 'cells are'} highlighted on the board.</p>}
    <div className="modal-actions">
      {diagnosis.kind === 'invalid-source-clue' && <Button variant="secondary" onClick={onCorrectSource}>Correct source clues</Button>}
      {canClear && <Button variant="secondary" onClick={onClear}>Clear highlighted value</Button>}
      {canUndo && diagnosis.kind !== 'clear' && <Button variant="ghost" onClick={onUndo}>Undo last action</Button>}
      <Button variant="ghost" onClick={onClose}>Close</Button>
    </div>
  </Modal>
}
