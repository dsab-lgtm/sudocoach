import { Button } from './Button'
import { Modal } from './Modal'

export function ConfirmScanReviewModal({ detected, reviewed, acknowledged, onAcknowledged, onCancel, onContinue }: { detected: number; reviewed: number; acknowledged: boolean; onAcknowledged: (value: boolean) => void; onCancel: () => void; onContinue: () => void }) {
  return <Modal eyebrow="One last check" title="Ready to use this puzzle?" description={`The scanner suggested ${detected} clues. You opened ${reviewed} of them. Compare any uncertain values with the photo before continuing.`} onClose={onCancel}>
    <label className="acknowledgement"><input type="checkbox" checked={acknowledged} onChange={(event) => onAcknowledged(event.target.checked)}/> I’ve checked the scanned clues I want to rely on.</label>
    <div className="modal-actions"><Button variant="ghost" onClick={onCancel}>Keep reviewing</Button><Button variant="primary" disabled={!acknowledged} onClick={onContinue}>Continue to solver</Button></div>
  </Modal>
}
