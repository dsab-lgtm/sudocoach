import type { CellPosition } from '../engine/types'
import { BrandLogo } from './BrandLogo'
import { IconButton } from './IconButton'
import { StatusBadge } from './StatusBadge'

type SolverHeaderProps = {
  checkStatus: string | null
  notesMode: boolean
  onBack: () => void
  selected: CellPosition
}

function BackIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M14.5 5 7.5 12l7 7M8 12h9" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9"/>
  </svg>
}

export function SolverHeader({ checkStatus, notesMode, onBack, selected }: SolverHeaderProps) {
  const context = `Row ${selected.row + 1}, column ${selected.col + 1}${notesMode ? ' · Notes on' : ''}`
  const statusTone = checkStatus?.includes('conflicting') ? 'error' : 'success'

  return <div className="solver-header">
    <div className="solver-header__identity">
      <BrandLogo variant="compact"/>
      <div>
        <p className="solver-header__eyebrow">Solve</p>
        <h1>Sudoku</h1>
        <p className="solver-context">{context}</p>
      </div>
    </div>
    <div className="solver-header__actions">
      {checkStatus && <span className="solver-header__status" role="status"><StatusBadge tone={statusTone}>{checkStatus}</StatusBadge></span>}
      <IconButton label="Back to home" onClick={onBack}>
        <BackIcon/>
      </IconButton>
    </div>
  </div>
}
