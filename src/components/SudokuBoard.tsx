import { type ChangeEvent, type KeyboardEvent, useRef } from 'react'
import type { CellPosition, Digit, SudokuBoardInteractions, SudokuBoardPresentation } from './puzzleViewTypes'

export type SudokuBoardProps = {
  presentation: SudokuBoardPresentation
  interactions: SudokuBoardInteractions
  readOnly?: boolean
  notesMode?: boolean
  /** Use real number inputs so touch devices open their native numeric keyboard. */
  nativeNumericInput?: boolean
  /** Controls whether entering a digit moves real DOM focus to the next cell. */
  autoAdvance?: boolean
  showCandidates?: boolean
  mode?: 'default' | 'scan-review'
  density?: 'standard' | 'compact'
  /** Keeps board navigation and selection available while suppressing value edits. */
  selectionOnly?: boolean
  /** Practice has a coach-side answer reveal, so it does not need an in-cell badge over candidate marks. */
  showHintMarker?: boolean
}

export function SudokuBoard({ presentation, interactions, readOnly = false, notesMode = false, nativeNumericInput = false, autoAdvance = true, showCandidates = false, mode = 'default', density = 'standard', selectionOnly = false, showHintMarker = true }: SudokuBoardProps) {
  const cellRefs = useRef<Array<HTMLElement | null>>([])
  const focusCell = (position: CellPosition) => {
    interactions.onSelect(position)
    const element = cellRefs.current[position.row * 9 + position.col]
    if (!element) return
    try { element.focus({ preventScroll: true }) } catch { element.focus() }
  }
  const move = (position: CellPosition, rowDelta: number, colDelta: number) =>
    focusCell({ row: (position.row + rowDelta + 9) % 9, col: (position.col + colDelta + 9) % 9 })
  const advance = (position: CellPosition) =>
    focusCell({ row: position.col === 8 ? (position.row + 1) % 9 : position.row, col: (position.col + 1) % 9 })
  const onKeyDown = (position: CellPosition, event: KeyboardEvent<HTMLElement>) => {
    const arrows: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }
    if (arrows[event.key]) { event.preventDefault(); move(position, ...arrows[event.key]); return }
    if (selectionOnly) return
    if (event.key.toLowerCase() === 'n') { event.preventDefault(); interactions.onToggleNotes?.(); return }
    const keypadDigit = /^Numpad([1-9])$/.exec(event.code)?.[1]
    const digit = /^[1-9]$/.test(event.key) ? event.key : keypadDigit
    const cell = presentation.cells[position.row][position.col]
    if (digit) {
      event.preventDefault()
      if (cell.fixed || readOnly) return
      if (notesMode) interactions.onToggleCandidate(position, Number(digit) as Digit); else { interactions.onEnterDigit(position, Number(digit) as Digit); if (autoAdvance) advance(position) }
      return
    }
    if (event.key === '0' || event.code === 'Numpad0' || event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault()
      if (!cell.fixed && !readOnly) interactions.onErase(position)
    }
  }

  const onNativeInput = (position: CellPosition, event: ChangeEvent<HTMLInputElement>) => {
    if (selectionOnly || readOnly || presentation.cells[position.row][position.col].fixed) return
    const entered = event.currentTarget.value.slice(-1)
    if (!entered) {
      interactions.onErase(position)
      return
    }
    if (!/^[1-9]$/.test(entered)) return
    interactions.onEnterDigit(position, Number(entered) as Digit)
    if (autoAdvance) advance(position)
  }

  return <div className={`board board--${mode} board--${density}`} role="grid" aria-label="Sudoku puzzle" aria-rowcount={9} aria-colcount={9}>
    {presentation.cells.map((row, rowIndex) => <div className="board__row" role="row" key={rowIndex}>{row.map((cell, col) => {
      const position = { row: rowIndex, col }
      const value = cell.value
      const { state } = cell
      const feedback = presentation.feedback?.cells.some((item) => item.row === rowIndex && item.col === col) ? presentation.feedback : null
      const className = [
        'board-cell', col % 3 === 2 && col !== 8 ? 'is-region-right' : '', rowIndex % 3 === 2 && rowIndex !== 8 ? 'is-region-bottom' : '', cell.fixed ? 'is-given' : '', cell.origin === 'solution' ? 'is-solution' : '', cell.origin === 'hint' ? 'is-hint' : '', state.selected ? 'is-selected' : '', state.related ? 'is-related' : '', state.matching ? 'is-matching' : '', state.invalid ? 'is-conflict' : '', state.hintUnit ? 'is-hint-unit' : '', state.hintSupporting ? 'is-hint-supporting' : '', state.hintTarget ? 'is-hint-target' : '', state.hintRevealed ? 'is-hint-revealed' : '', cell.origin === 'scan' || state.scanReview || state.scanCorrected ? 'is-scan' : '', state.lowConfidence ? 'is-low-confidence' : '', state.scanCorrected ? 'is-scan-corrected' : '', state.scanReview === 'pending' || state.scanReview === 'needs-review' ? 'is-scan-pending' : '', state.scanReview === 'reviewed' || state.scanReview === 'confirmed' ? 'is-scan-reviewed' : '', state.scanReview ? `is-scan-${state.scanReview}` : '', feedback ? `has-feedback has-feedback--${feedback.kind}` : ''
      ].filter(Boolean).join(' ')
      const marks = cell.candidateMarks ?? []
      const notes = marks.length ? marks.map((mark) => mark.digit) : cell.notes.length ? cell.notes : (showCandidates ? cell.candidates : [])
      const cellStateLabel = cell.fixed ? 'fixed clue' : readOnly ? 'read-only' : selectionOnly ? 'selectable' : 'editable'
      const candidateLabel = !value && notes.length ? `, candidate values ${marks.length ? marks.map(({ digit, source }) => source === 'manual' ? digit : `${digit} ${source === 'stale' ? 'stale manual' : source === 'removed' ? 'guided removal' : 'generated'}`).join(', ') : notes.join(', ')}` : ''
      const scannedLabel = cell.origin === 'scan' || state.scanReview || state.scanCorrected ? ', scanned clue' : ''
      const correctedLabel = state.scanCorrected ? ', corrected' : ''
      const reviewLabel = state.scanReview === 'pending' || state.scanReview === 'needs-review' ? ', scan review pending' : state.scanReview === 'reviewed' ? ', scan reviewed' : state.scanReview === 'confirmed' ? ', scan confirmed' : state.scanReview === 'scanned' ? ', scanned and unreviewed' : ''
      const hintLabel = state.hintTarget ? ', hint target' : state.hintSupporting ? ', hint supporting cell' : state.hintUnit ? ', in the highlighted hint unit' : ''
      const conflictLabel = state.invalid ? ', conflicting' : ''
      const label = `Row ${rowIndex + 1}, column ${col + 1}${value ? `: ${value}` : ', empty'}, ${cellStateLabel}${candidateLabel}${scannedLabel}${correctedLabel}${conflictLabel}${hintLabel}${reviewLabel}`
      const feedbackDigits = feedback?.digits ?? []
      const content = value ? <span className={feedback?.kind === 'value-entered' ? 'board-value-feedback' : ''} key={feedback?.kind === 'value-entered' ? `value-${feedback.id}` : 'value'}>{value}</span> : notes.length ? <span className="notes" aria-hidden="true">{notes.map((note) => {
        const source = marks.find((mark) => mark.digit === note)?.source
        const className = [state.removedCandidates.includes(note) ? 'is-removed-candidate' : '', source ? `is-candidate-${source}` : '', feedback?.kind === 'candidate-added' && feedbackDigits.includes(note) ? 'is-candidate-feedback-add' : '', feedback?.kind === 'guided-change' && feedbackDigits.includes(note) ? 'is-candidate-feedback-guided' : ''].filter(Boolean).join(' ')
        return <i className={className} key={feedbackDigits.includes(note) ? `${note}-${feedback?.id}` : note}>{note}</i>
      })}</span> : null
      const removalOverlay = feedback?.kind === 'candidate-removed' && feedbackDigits.length ? <span className="notes notes-feedback-removal" aria-hidden="true">{feedbackDigits.map((digit) => <i key={`${digit}-${feedback.id}`}>{digit}</i>)}</span> : null
      const feedbackCue = feedback ? <span className="board-feedback-cue" key={`feedback-${feedback.id}`} aria-hidden="true"/> : null

      if (nativeNumericInput) {
        return <label key={`${rowIndex}-${col}`} className={className}>
          <input
            ref={(element) => { cellRefs.current[rowIndex * 9 + col] = element }}
            role="gridcell"
            className={`native-board-input ${className}`}
            aria-label={`Enter digit for ${label}`}
            aria-selected={state.selected}
            aria-readonly={Boolean(cell.fixed || readOnly || selectionOnly)}
            aria-invalid={state.invalid || undefined}
            disabled={readOnly || cell.fixed}
            inputMode="numeric"
            pattern="[1-9]*"
            tabIndex={state.selected ? 0 : -1}
            type="tel"
            value={value ?? ''}
            onFocus={() => interactions.onSelect(position)}
            onKeyDown={(event) => onKeyDown(position, event)}
            onChange={(event) => onNativeInput(position, event)}
          />
          {content}{removalOverlay}{feedbackCue}{showHintMarker && state.hintTarget && <span className="hint-cell-marker" aria-hidden="true">Hint</span>}{state.scanCorrected && <span className="scan-correction" aria-hidden="true">Edited</span>}{(state.scanReview === 'reviewed' || state.scanReview === 'confirmed') && <span className="scan-check" aria-hidden="true">✓</span>}
        </label>
      }

      return <button key={`${rowIndex}-${col}`} type="button" role="gridcell" ref={(element) => { cellRefs.current[rowIndex * 9 + col] = element }} disabled={readOnly} onClick={() => interactions.onSelect(position)} onKeyDown={(event) => onKeyDown(position, event)} tabIndex={state.selected ? 0 : -1} aria-selected={state.selected} aria-readonly={Boolean(cell.fixed || readOnly || selectionOnly)} aria-invalid={state.invalid || undefined} aria-label={label} className={className}>
        {content}{removalOverlay}{feedbackCue}{showHintMarker && state.hintTarget && <span className="hint-cell-marker" aria-hidden="true">Hint</span>}{state.scanCorrected && <span className="scan-correction" aria-hidden="true">Edited</span>}{(state.scanReview === 'reviewed' || state.scanReview === 'confirmed') && <span className="scan-check" aria-hidden="true">✓</span>}
      </button>
    })}</div>)}
  </div>
}
