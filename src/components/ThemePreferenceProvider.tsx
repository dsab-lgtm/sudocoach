import { type ReactNode, useEffect, useRef, useState } from 'react'
import { database } from '../storage/database'
import { applyThemePreference, isThemePreference, type ThemePreference } from '../styles/themePreference'
import { ThemePreferenceContext } from '../styles/themePreferenceContext'

export type { ThemePreference } from '../styles/themePreference'

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeValue] = useState<ThemePreference>('system')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const writeVersion = useRef(0)

  useEffect(() => {
    let active = true
    database.settings.get('theme').then((record) => {
      if (!active) return
      const savedTheme = isThemePreference(record?.value) ? record.value : 'system'
      setThemeValue(savedTheme)
      applyThemePreference(savedTheme)
    }).catch(() => {
      if (active) {
        applyThemePreference('system')
        setError('Saved appearance preferences could not be loaded. Using your device setting instead.')
      }
    }).finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [])

  const setTheme = async (nextTheme: ThemePreference) => {
    const version = ++writeVersion.current
    setThemeValue(nextTheme)
    setError(null)
    applyThemePreference(nextTheme)
    try {
      await database.settings.put({ key: 'theme', value: nextTheme })
    } catch {
      if (writeVersion.current === version) setError('Your appearance preference could not be saved. It will apply for this visit only.')
    }
  }

  return <ThemePreferenceContext.Provider value={{ error, isLoading, setTheme, theme }}>{children}</ThemePreferenceContext.Provider>
}
