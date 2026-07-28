import { Link, useLocation } from 'react-router-dom'
import { AppNavigation } from './AppNavigation'
import { BrandLogo } from './BrandLogo'

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const puzzleRoute = ['/solve', '/manual', '/review'].includes(location.pathname)
  return <main className={`app-shell ${puzzleRoute ? 'app-shell--puzzle' : 'app-shell--standard'}`}>
    {!puzzleRoute && <header className="topbar"><Link className="brand" to="/" aria-label="SudoCoach home"><BrandLogo/></Link><AppNavigation pathname={location.pathname}/></header>}
    {children}
  </main>
}
