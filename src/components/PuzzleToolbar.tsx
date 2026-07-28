import { Button } from './Button'
import { IconButton } from './IconButton'

export type PuzzleToolbarProps = {
  canErase: boolean
  canRedo: boolean
  canUndo: boolean
  notesMode: boolean
  onCheck: () => void
  onCandidates: () => void
  onErase: () => void
  onHint: () => void
  onMore: () => void
  onRedo: () => void
  onToggleNotes: () => void
  onUndo: () => void
}

function MoreIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <circle cx="5" cy="12" r="1.6" fill="currentColor"/>
    <circle cx="12" cy="12" r="1.6" fill="currentColor"/>
    <circle cx="19" cy="12" r="1.6" fill="currentColor"/>
  </svg>
}

/** Solver effects stay in the screen; this component only renders actions. */
export function PuzzleToolbar({ canErase, canRedo, canUndo, notesMode, onCandidates, onCheck, onErase, onHint, onMore, onRedo, onToggleNotes, onUndo }: PuzzleToolbarProps) {
  return <nav className="puzzle-toolbar" aria-label="Puzzle controls">
    <div className="puzzle-toolbar__group" role="group" aria-label="Entry controls">
      <Button variant="secondary" className={notesMode ? 'is-active' : ''} aria-pressed={notesMode} onClick={onToggleNotes}>Notes</Button>
      <Button variant="ghost" disabled={!canErase} onClick={onErase}>Erase</Button>
    </div>
    <div className="puzzle-toolbar__group" role="group" aria-label="History controls">
      <Button variant="ghost" disabled={!canUndo} onClick={onUndo}>Undo</Button>
      <Button variant="ghost" disabled={!canRedo} onClick={onRedo}>Redo</Button>
    </div>
    <div className="puzzle-toolbar__group" role="group" aria-label="Coaching controls">
      <Button variant="secondary" onClick={onCandidates}>Candidates</Button>
      <Button variant="secondary" onClick={onHint}>Hint</Button>
      <Button variant="secondary" onClick={onCheck}>Check</Button>
    </div>
    <IconButton className="puzzle-toolbar__more" label="More puzzle actions" onClick={onMore}>
      <MoreIcon/>
    </IconButton>
  </nav>
}
