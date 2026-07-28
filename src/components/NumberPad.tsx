import type { Digit, NumberPadAllowedActions, NumberPadInteractions } from './puzzleViewTypes'

export type NumberPadProps = NumberPadInteractions & {
  notesMode: boolean
  disabled: boolean
  allowedActions: NumberPadAllowedActions
  showNotesToggle?: boolean
}

export function NumberPad({ notesMode, disabled, allowedActions, onValueEntry, onErase, onToggleNotes, showNotesToggle = true }: NumberPadProps) {
  const press = (digit: Digit) => {
    if (disabled || !allowedActions.canEnterValue) return
    onValueEntry(digit)
  }
  return <div className="number-pad" aria-label="Number keypad">
    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => <button key={digit} type="button" onClick={() => press(digit as Digit)} aria-disabled={disabled || !allowedActions.canEnterValue}>{digit}</button>)}
    {showNotesToggle && <button type="button" className={notesMode ? 'active' : ''} onClick={() => { if (allowedActions.canToggleNotes) onToggleNotes?.() }} aria-disabled={!allowedActions.canToggleNotes} aria-pressed={notesMode}>Notes</button>}
    <button type="button" className={showNotesToggle ? '' : 'wide-key'} onClick={() => { if (!disabled && allowedActions.canErase) onErase() }} aria-disabled={disabled || !allowedActions.canErase}>Clear</button>
  </div>
}
