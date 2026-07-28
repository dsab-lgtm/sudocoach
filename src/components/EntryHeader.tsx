import { BrandLogo } from './BrandLogo'
import { IconButton } from './IconButton'
import { StatusBadge } from './StatusBadge'

type EntryHeaderProps = {
  clueCount: number
  error: string | null
  hasConflicts: boolean
  onBack: () => void
}

function BackIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M14.5 5 7.5 12l7 7M8 12h9" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9"/>
  </svg>
}

export function EntryHeader({ clueCount, error, hasConflicts, onBack }: EntryHeaderProps) {
  const clueLabel = !clueCount ? 'Add the given clues only' : hasConflicts ? 'Resolve duplicate clues' : `${clueCount} ${clueCount === 1 ? 'clue is' : 'clues are'} ready to solve`
  const clueTone = hasConflicts ? 'error' : clueCount ? 'success' : 'neutral'

  return <div className="entry-header">
    <div className="entry-header__identity">
      <BrandLogo variant="compact"/>
      <div>
        <p className="entry-header__eyebrow">Manual entry</p>
        <h1>Set up puzzle</h1>
        <p>Enter the given clues, then start solving.</p>
      </div>
    </div>
    <IconButton label="Back to home" onClick={onBack}>
      <BackIcon/>
    </IconButton>
    <div className="entry-header__feedback" id="entry-feedback">
      {error ? <p className="form-error" role="alert">{error}</p> : <StatusBadge tone={clueTone}>{clueLabel}</StatusBadge>}
    </div>
  </div>
}
