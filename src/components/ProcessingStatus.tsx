import { StatusBadge } from './StatusBadge'
import { Surface } from './Surface'

type ProcessingStatusProps = {
  fileName: string
  previewUrl: string | null
}

export function ProcessingStatus({ fileName, previewUrl }: ProcessingStatusProps) {
  return <Surface className="processing-status" elevation="raised" aria-labelledby="processing-title">
    <div className="processing-status__indicator" aria-hidden="true"><span className="loader"/></div>
    <StatusBadge tone="accent">Processing locally</StatusBadge>
    <p className="eyebrow">Preparing your puzzle</p>
    <h2 id="processing-title">Reading your Sudoku</h2>
    <p className="processing-status__message" role="status" aria-live="polite" aria-atomic="true">Your image is being processed on this device.</p>
    {previewUrl && <Surface className="processing-preview"><img src={previewUrl} alt={`Selected puzzle image: ${fileName}`}/><span>{fileName}</span></Surface>}
    <ol className="processing-steps" aria-label="What happens next">
      <li>Find the puzzle grid</li>
      <li>Read the given digits</li>
      <li>Prepare your review</li>
    </ol>
  </Surface>
}
