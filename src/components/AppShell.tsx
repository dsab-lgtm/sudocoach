import { Link, useLocation } from 'react-router-dom'

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  return <main className="app-shell"><header className="topbar"><Link className="brand" to="/">Sudo<span>Scan</span></Link><nav aria-label="Primary"><Link className={location.pathname === '/settings' ? 'selected' : ''} to="/settings">Settings</Link></nav></header>{children}</main>
}
