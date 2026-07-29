import { Link, useLocation } from 'react-router-dom'
import { AppNavigation } from './AppNavigation'
import { BrandLogo } from './BrandLogo'

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const e2eRoute = location.pathname.startsWith('/__e2e__/')
  const workspaceRoute = ['/solve', '/manual', '/review', '/__e2e__/review', '/__e2e__/solver'].includes(location.pathname)
  const taskRoute = workspaceRoute || e2eRoute || ['/camera', '/processing'].includes(location.pathname) || location.pathname.startsWith('/practice/')
  const mode = workspaceRoute ? 'workspace' : taskRoute ? 'task' : 'standard'
  return <main className={`app-shell app-shell--${mode} ${workspaceRoute ? 'app-shell--puzzle' : ''}`}>
    {mode === 'standard' && <header className="topbar"><Link className="brand" to="/" aria-label="SudoCoach home"><BrandLogo/></Link><AppNavigation pathname={location.pathname}/></header>}
    {children}
  </main>
}
