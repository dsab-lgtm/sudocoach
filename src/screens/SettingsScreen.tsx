import { useState } from 'react'
import { AboutPanel } from '../components/AboutPanel'
import { Button } from '../components/Button'
import { CandidateModeControl } from '../components/CandidateModeControl'
import { ConfirmationDialog } from '../components/ConfirmationDialog'
import { useCandidateAssistant } from '../components/candidateAssistantContext'
import { SettingsSection } from '../components/SettingsSection'
import { ThemeControl } from '../components/ThemeControl'
import { Surface } from '../components/Surface'
import { database } from '../storage/database'
import { useThemePreference } from '../styles/themePreferenceContext'

export function SettingsScreen() {
  const { error: themeError, isLoading, setTheme, theme } = useThemePreference()
  const { error: candidateError, isLoading: candidateLoading, mode: candidateMode, setMode } = useCandidateAssistant()
  const [clearOpen, setClearOpen] = useState(false)
  const [clearError, setClearError] = useState<string | null>(null)
  const [clearStatus, setClearStatus] = useState<string | null>(null)
  const [clearing, setClearing] = useState(false)

  const closeClearModal = () => {
    if (clearing) return
    setClearError(null)
    setClearOpen(false)
  }

  const clearSavedPuzzles = async () => {
    setClearing(true)
    setClearError(null)
    try {
      await database.puzzles.clear()
      setClearOpen(false)
      setClearStatus('Saved puzzles cleared from this device.')
    } catch {
      setClearError('Saved puzzles could not be cleared. Try again.')
    } finally {
      setClearing(false)
    }
  }

  return <section className="settings-screen" aria-labelledby="settings-title">
    <header className="settings-screen__header"><p className="eyebrow">Preferences</p><h1 id="settings-title">Settings</h1><p>Choose how SudoCoach appears and manage the puzzles saved on this device.</p></header>

    <SettingsSection title="Appearance" description="Choose a theme that suits your environment.">
      <Surface className="settings-card" elevation="raised"><ThemeControl theme={theme} disabled={isLoading} onChange={(nextTheme) => { void setTheme(nextTheme) }}/>{isLoading && <p className="settings-inline-status" role="status">Loading saved appearance preference...</p>}{themeError && <p className="settings-inline-error" role="alert">{themeError}</p>}</Surface>
    </SettingsSection>

    <SettingsSection title="Solving assistance" description="Choose how candidate numbers support your own pencil notes.">
      <Surface className="settings-card" elevation="raised">
        <CandidateModeControl disabled={candidateLoading} mode={candidateMode} onChange={(nextMode) => { void setMode(nextMode) }}/>
        {candidateLoading && <p className="settings-inline-status" role="status">Loading candidate preference...</p>}
        {candidateError && <p className="settings-inline-error" role="alert">{candidateError}</p>}
      </Surface>
    </SettingsSection>

    <SettingsSection title="Data and privacy" description="Your saved puzzles stay on this device. Clearing them cannot be undone.">
      <Surface className="settings-card settings-data-action">
        <div><h3>Clear saved puzzles</h3><p id="clear-saved-puzzles-description">Remove every saved puzzle record from this device. Your theme preference, current unsaved puzzle, and scanner session stay unchanged.</p></div>
        <Button variant="danger" aria-describedby="clear-saved-puzzles-description" onClick={() => { setClearStatus(null); setClearOpen(true) }}>Clear saved puzzles</Button>
      </Surface>
      {clearStatus && <p className="settings-inline-status" role="status">{clearStatus}</p>}
    </SettingsSection>

    <SettingsSection title="About"><AboutPanel/></SettingsSection>

    {clearOpen && <ConfirmationDialog title="Clear saved puzzles?" description="This permanently removes all saved puzzle records from this device. Your theme preference, current unsaved puzzle, and scanner session stay unchanged." confirmLabel={clearing ? 'Clearing...' : 'Clear saved puzzles'} confirmDisabled={clearing} onCancel={closeClearModal} onConfirm={() => { void clearSavedPuzzles() }}>
      {clearError && <p className="settings-modal-error" role="alert">{clearError}</p>}
    </ConfirmationDialog>}
  </section>
}
