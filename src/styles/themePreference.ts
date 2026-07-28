export type ThemePreference = 'system' | 'light' | 'dark'

export const isThemePreference = (value: unknown): value is ThemePreference => value === 'system' || value === 'light' || value === 'dark'

export const applyThemePreference = (theme: ThemePreference) => {
  document.documentElement.dataset.theme = theme
}
