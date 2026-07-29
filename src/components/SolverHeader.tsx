import type { CellPosition } from '../engine/types'
import { StatusBadge } from './StatusBadge'
import { TaskHeader } from './TaskHeader'

type SolverHeaderProps = {
  checkStatus: string | null
  notesMode: boolean
  onBack: () => void
  selected: CellPosition
}

export function SolverHeader({ checkStatus, notesMode, onBack, selected }: SolverHeaderProps) {
  const context = `Row ${selected.row + 1}, column ${selected.col + 1}${notesMode ? ' · Notes on' : ''}`
  const statusTone = checkStatus?.includes('conflicting') ? 'error' : 'success'

  return <TaskHeader
    eyebrow="Solve"
    title="Sudoku"
    description={context}
    status={checkStatus && <span role="status"><StatusBadge tone={statusTone}>{checkStatus}</StatusBadge></span>}
    backAction={{ label: 'Back to home', onClick: onBack }}
  />
}
