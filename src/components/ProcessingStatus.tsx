import { StatusBadge } from './StatusBadge'
import { Surface } from './Surface'
import type { ScanProgress } from '../scanner/types'

type ProcessingStatusProps = {
  fileName: string
  previewUrl: string | null
  progress: ScanProgress
}

const statusFor = (progress: ScanProgress) => {
  if (progress.stage === 'decoding') return { eyebrow: 'Preparing image', message: 'Decoding your photo on this device.', active: 0 }
  if (progress.stage === 'grid-detection') return { eyebrow: 'Finding the grid', message: 'Looking for the Sudoku boundaries.', active: 1 }
  if (progress.stage === 'recognizing') return { eyebrow: 'Reading clues', message: progress.total ? `Reading clues ${progress.completed ?? 0} of ${progress.total}.` : 'Reading the given clues.', active: 2 }
  return { eyebrow: 'Preparing review', message: 'Preparing the source photo and review checks.', active: 3 }
}

export function ProcessingStatus({ fileName, previewUrl, progress }: ProcessingStatusProps) {
  const status = statusFor(progress)
  return <Surface className="processing-status" elevation="raised" aria-labelledby="processing-title">
    <div className="processing-status__indicator" aria-hidden="true"><span className="loader"/></div>
    <StatusBadge tone="accent">Processing locally</StatusBadge>
    <p className="eyebrow">{status.eyebrow}</p>
    <h2 id="processing-title">Reading your Sudoku</h2>
    <p className="processing-status__message" role="status" aria-live="polite" aria-atomic="true">{status.message}</p>
    {previewUrl && <Surface className="processing-preview"><img src={previewUrl} alt={`Selected puzzle image: ${fileName}`}/><span>{fileName}</span></Surface>}
    <ol className="processing-steps" aria-label="What happens next">
      <li className={status.active >= 1 ? 'is-active' : ''}>Find the puzzle grid</li>
      <li className={status.active >= 2 ? 'is-active' : ''}>Read the given digits</li>
      <li className={status.active >= 3 ? 'is-active' : ''}>Prepare your review</li>
    </ol>
  </Surface>
}
