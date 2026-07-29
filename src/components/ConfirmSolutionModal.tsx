import { ConfirmationDialog } from './ConfirmationDialog'

export function ConfirmSolutionModal({ onCancel, onReveal }: { onCancel: () => void; onReveal: () => void }) {
  return <ConfirmationDialog title="Reveal the full solution?" description="This fills every remaining cell and may spoil the puzzle." confirmLabel="Reveal solution" onCancel={onCancel} onConfirm={onReveal}/>
}
