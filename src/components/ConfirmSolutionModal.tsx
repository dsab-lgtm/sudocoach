import { Button } from './Button'
import { Modal } from './Modal'

export function ConfirmSolutionModal({ onCancel, onReveal }: { onCancel: () => void; onReveal: () => void }) {
  return <Modal eyebrow="Spoiler warning" title="Reveal the full solution?" description="This fills every remaining cell and may spoil the puzzle." onClose={onCancel}>
    <div className="modal-actions"><Button variant="ghost" onClick={onCancel}>Cancel</Button><Button variant="danger" onClick={onReveal}>Reveal solution</Button></div>
  </Modal>
}
