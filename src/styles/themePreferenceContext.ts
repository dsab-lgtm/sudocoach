import { createContext, useContext } from 'react'
import type { ThemePreference } from './themePreference'

export type ThemePreferenceContextValue = {
  error: string | null
  isLoading: boolean
  setTheme: (theme: ThemePreference) => Promise<void>
  theme: ThemePreference
}

export const ThemePreferenceContext = createContext<ThemePreferenceContextValue | null>(null)

export function useThemePreference() {
  const value = useContext(ThemePreferenceContext)
  if (!value) throw new Error('useThemePreference must be used within ThemePreferenceProvider')
  return value
}
