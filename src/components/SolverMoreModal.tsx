export function SolverMoreModal({ onClose, onRestart, onReveal }: { onClose: () => void; onRestart: () => void; onReveal: () => void }) {
  return <div className="modal-backdrop" role="presentation"><section className="modal solver-more" role="dialog" aria-modal="true" aria-labelledby="solver-more-title">
    <p className="eyebrow">Puzzle options</p><h2 id="solver-more-title">More actions</h2>
    <button type="button" className="secondary-action wide" onClick={() => { onRestart(); onClose() }}>Restart puzzle</button>
    <button type="button" className="danger-outline wide" onClick={() => { onClose(); onReveal() }}>Full solution</button>
    <div className="modal-actions"><button type="button" className="text-button" onClick={onClose}>Close</button></div>
  </section></div>
}
