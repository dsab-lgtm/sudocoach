export function ConfirmSolutionModal({ onCancel, onReveal }: { onCancel: () => void; onReveal: () => void }) {
  return <div className="modal-backdrop" role="presentation"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="reveal-title">
    <p className="eyebrow">Spoiler warning</p><h2 id="reveal-title">Reveal the full solution?</h2><p>This fills every remaining cell and may spoil the puzzle.</p>
    <div className="modal-actions"><button type="button" className="text-button" onClick={onCancel}>Cancel</button><button type="button" className="danger" onClick={onReveal}>Reveal solution</button></div>
  </section></div>
}
