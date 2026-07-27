import { useEffect, useState } from 'react'
import { database } from '../storage/database'

export function SettingsScreen() {
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system')
  useEffect(() => { document.documentElement.dataset.theme = theme; database.settings.put({ key: 'theme', value: theme }).catch(() => undefined) }, [theme])
  const clear = async () => { if (window.confirm('Delete all saved puzzles from this device?')) await database.puzzles.clear() }
  return <section className="settings"><p className="eyebrow">Preferences</p><h1>Settings</h1><label>Theme<select value={theme} onChange={(event) => setTheme(event.target.value as typeof theme)}><option value="system">Use device setting</option><option value="light">Light</option><option value="dark">Dark</option></select></label><label className="setting-toggle"><span>Automatic candidate notes</span><input type="checkbox" defaultChecked/></label><label>Default hint level<select defaultValue="1"><option value="1">Direction</option><option value="2">Explanation</option><option value="3">Reveal move</option></select></label><button type="button" className="danger-outline" onClick={clear}>Clear saved puzzles</button></section>
}
