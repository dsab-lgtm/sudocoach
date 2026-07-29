import { StatusBadge } from './StatusBadge'
import { TaskHeader } from './TaskHeader'

type EntryHeaderProps = {
  clueCount: number
  error: string | null
  hasConflicts: boolean
  onBack: () => void
}

export function EntryHeader({ clueCount, error, hasConflicts, onBack }: EntryHeaderProps) {
  const clueLabel = !clueCount ? 'Add the given clues only' : hasConflicts ? 'Resolve duplicate clues' : `${clueCount} ${clueCount === 1 ? 'clue is' : 'clues are'} ready to solve`
  const clueTone = hasConflicts ? 'error' : clueCount ? 'success' : 'neutral'

  return <TaskHeader
    eyebrow="Manual entry"
    title="Set up puzzle"
    description="Enter the given clues, then start solving."
    backAction={{ label: 'Back to home', onClick: onBack }}
    feedback={<div id="entry-feedback">{error ? <p className="form-error" role="alert">{error}</p> : <StatusBadge tone={clueTone}>{clueLabel}</StatusBadge>}</div>}
  />
}
