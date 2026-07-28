import { Button } from './Button'
import { Modal } from './Modal'

export function SolverMoreModal({ onClose, onRestart, onReveal }: { onClose: () => void; onRestart: () => void; onReveal: () => void }) {
  return <Modal eyebrow="Puzzle options" title="More actions" description="Choose what to do with this puzzle." onClose={onClose}>
    <Button variant="secondary" className="wide" onClick={() => { onRestart(); onClose() }}>Restart puzzle</Button>
    <Button variant="danger" className="wide" onClick={() => { onClose(); onReveal() }}>Full solution</Button>
    <div className="modal-actions"><Button variant="ghost" onClick={onClose}>Close</Button></div>
  </Modal>
}
