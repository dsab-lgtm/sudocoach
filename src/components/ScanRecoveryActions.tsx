import { Button } from './Button'

type ScanRecoveryActionsProps = {
  onChooseAnother: () => void
  onEnterManually: () => void
  onRetry: () => void
}

export function ScanRecoveryActions({ onChooseAnother, onEnterManually, onRetry }: ScanRecoveryActionsProps) {
  return <div className="scan-recovery-actions">
    <Button variant="primary" onClick={onRetry}>Try again</Button>
    <Button variant="secondary" onClick={onChooseAnother}>Choose another image</Button>
    <Button variant="ghost" onClick={onEnterManually}>Enter manually</Button>
  </div>
}
