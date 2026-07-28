import type { PuzzleRecord } from '../storage/database'
import { Button } from './Button'
import { StatusBadge } from './StatusBadge'
import { Surface } from './Surface'

type ResumePuzzleCardProps = {
  onResume: () => void
  record: PuzzleRecord
}

const formatDate = (timestamp: number) => new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(timestamp))

export function ResumePuzzleCard({ onResume, record }: ResumePuzzleCardProps) {
  const filledCells = record.board.flat().filter((cell) => cell.value).length
  const status = record.completed ? 'Completed' : 'In progress'

  return <section className="resume-puzzle-card" aria-labelledby="resume-puzzle-title">
    <Surface elevation="raised">
      <div className="resume-puzzle-card__header">
        <div><p className="eyebrow">Resume</p><h2 id="resume-puzzle-title">Saved puzzle</h2></div>
        <StatusBadge tone={record.completed ? 'success' : 'accent'}>{status}</StatusBadge>
      </div>
      <p className="resume-puzzle-card__summary">{filledCells} of 81 cells filled</p>
      <time className="resume-puzzle-card__updated" dateTime={new Date(record.updatedAt).toISOString()}>Updated {formatDate(record.updatedAt)}</time>
      <Button variant="primary" onClick={onResume}>Resume puzzle</Button>
    </Surface>
  </section>
}
