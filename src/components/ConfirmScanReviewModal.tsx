export function ConfirmScanReviewModal({ detected, reviewed, acknowledged, onAcknowledged, onCancel, onContinue }: { detected: number; reviewed: number; acknowledged: boolean; onAcknowledged: (value: boolean) => void; onCancel: () => void; onContinue: () => void }) {
  return <div className="modal-backdrop" role="presentation"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="scan-review-title">
    <p className="eyebrow">One last check</p><h2 id="scan-review-title">Ready to use this puzzle?</h2>
    <p>The scanner suggested {detected} clues. You opened {reviewed} of them. Compare any uncertain values with the photo before continuing.</p>
    <label className="acknowledgement"><input type="checkbox" checked={acknowledged} onChange={(event) => onAcknowledged(event.target.checked)}/> I’ve checked the scanned clues I want to rely on.</label>
    <div className="modal-actions"><button type="button" className="text-button" onClick={onCancel}>Keep reviewing</button><button type="button" className="primary-action" disabled={!acknowledged} onClick={onContinue}>Continue to solver</button></div>
  </section></div>
}
