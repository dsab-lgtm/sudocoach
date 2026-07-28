import type { ScanDiagnostic } from '../scanner/types'
import { BrandLogo } from './BrandLogo'
import { IconButton } from './IconButton'
import { InlineFeedback } from './InlineFeedback'

type ReviewHeaderProps = {
  diagnostics: readonly ScanDiagnostic[]
  error: string | null
  gridDetected: boolean
  noCluesDetected: boolean
  onBack: () => void
  reviewedCount: number
  detectedCount: number
}

function BackIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M14.5 5 7.5 12l7 7M8 12h9" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9"/>
  </svg>
}

export function ReviewHeader({ diagnostics, error, gridDetected, noCluesDetected, onBack, reviewedCount, detectedCount }: ReviewHeaderProps) {
  const message = detectedCount ? `${reviewedCount} of ${detectedCount} reviewed` : 'No scanned clues yet'

  return <div className="review-header">
    <div className="review-header__identity">
      <BrandLogo variant="compact"/>
      <div>
        <p className="review-header__eyebrow">Review scan</p>
        <h1>Check clues</h1>
        <p role="status" aria-live="polite">{message}</p>
      </div>
    </div>
    <IconButton label="Back to home" onClick={onBack}>
      <BackIcon/>
    </IconButton>
    <div className="review-header__feedback">
      {error && <p className="form-error" role="alert">{error}</p>}
      {diagnostics.map((diagnostic) => <p className="diagnostic workspace-diagnostic" key={diagnostic.code}>{diagnostic.message}</p>)}
      {noCluesDetected && <InlineFeedback className="scan-recovery workspace-recovery">{gridDetected ? <><strong>No clues detected.</strong> Enter clues below or rescan with a brighter photo.</> : <><strong>No Sudoku grid detected.</strong> Rescan with the full grid in frame.</>}</InlineFeedback>}
    </div>
  </div>
}
