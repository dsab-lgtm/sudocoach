import { usePuzzleStore } from '../store/puzzleStore'
import type { Digit } from '../engine/types'

export function NumberPad({ notesMode, onToggleNotes, showNotesToggle = true }: { notesMode: boolean; onToggleNotes: () => void; showNotesToggle?: boolean }) {
  const selected = usePuzzleStore((state) => state.selected)
  const board = usePuzzleStore((state) => state.board)
  const setValue = usePuzzleStore((state) => state.setValue)
  const toggleNote = usePuzzleStore((state) => state.toggleNote)
  const press = (digit: Digit) => {
    if (!selected || board[selected.row][selected.col].given) return
    if (notesMode) toggleNote(selected, digit); else setValue(selected, digit)
  }
  return <div className="number-pad" aria-label="Number keypad">
    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => <button key={digit} type="button" onClick={() => press(digit as Digit)}>{digit}</button>)}
    {showNotesToggle && <button type="button" className={notesMode ? 'active' : ''} onClick={onToggleNotes} aria-pressed={notesMode}>Notes</button>}
    <button type="button" className={showNotesToggle ? '' : 'wide-key'} onClick={() => selected && setValue(selected, null)}>Clear</button>
  </div>
}
