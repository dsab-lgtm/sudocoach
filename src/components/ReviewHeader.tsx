import type { ScanDiagnostic } from '../scanner/types'
import { InlineFeedback } from './InlineFeedback'
import { TaskHeader } from './TaskHeader'

type ReviewHeaderProps = {
  diagnostics: readonly ScanDiagnostic[]
  error: string | null
  gridDetected: boolean
  noCluesDetected: boolean
  onBack: () => void
  reviewedCount: number
  detectedCount: number
}

export function ReviewHeader({ diagnostics, error, gridDetected, noCluesDetected, onBack, reviewedCount, detectedCount }: ReviewHeaderProps) {
  const message = detectedCount ? `${reviewedCount} of ${detectedCount} reviewed` : 'No scanned clues yet'

  return <TaskHeader
    eyebrow="Review scan"
    title="Check clues"
    description={<span role="status" aria-live="polite">{message}</span>}
    backAction={{ label: 'Back to home', onClick: onBack }}
    feedback={<>
      {error && <p className="form-error" role="alert">{error}</p>}
      {diagnostics.map((diagnostic) => <p className="diagnostic workspace-diagnostic" key={diagnostic.code}>{diagnostic.message}</p>)}
      {noCluesDetected && <InlineFeedback className="scan-recovery workspace-recovery">{gridDetected ? <><strong>No clues detected.</strong> Enter clues below or rescan with a brighter photo.</> : <><strong>No Sudoku grid detected.</strong> Rescan with the full grid in frame.</>}</InlineFeedback>}
    </>}
  />
}
