import { useId } from 'react'
import type { ThemePreference } from '../styles/themePreference'

type ThemeControlProps = {
  disabled?: boolean
  onChange: (theme: ThemePreference) => void
  theme: ThemePreference
}

export function ThemeControl({ disabled = false, onChange, theme }: ThemeControlProps) {
  const controlId = useId()
  const descriptionId = useId()
  return <div className="theme-control">
    <label htmlFor={controlId}>Color theme</label>
    <p id={descriptionId}>System follows your device setting. Light and Dark stay fixed.</p>
    <select id={controlId} value={theme} disabled={disabled} aria-describedby={descriptionId} onChange={(event) => onChange(event.target.value as ThemePreference)}>
      <option value="system">Use device setting</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </div>
}
