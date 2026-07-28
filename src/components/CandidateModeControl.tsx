import { useId } from 'react'
import type { CandidateMode } from '../engine/types'

export function CandidateModeControl({ disabled = false, mode, onChange }: { disabled?: boolean; mode: CandidateMode; onChange: (mode: CandidateMode) => void }) {
  const id = useId()
  return <div className="candidate-mode-control">
    <label htmlFor={id}>Candidate assistance</label>
    <p id={`${id}-description`}>Manual notes stay yours in every mode. Automatic candidates are calculated separately.</p>
    <select id={id} disabled={disabled} value={mode} aria-describedby={`${id}-description`} onChange={(event) => onChange(event.target.value as CandidateMode)}>
      <option value="manual">Manual notes</option>
      <option value="cleanup">Review stale notes</option>
      <option value="guided">Guided candidates</option>
      <option value="automatic">Automatic candidates</option>
    </select>
  </div>
}
