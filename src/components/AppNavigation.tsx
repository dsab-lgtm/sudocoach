import { Link, useNavigate } from 'react-router-dom'
import { SettingsIcon } from './AppIcon'
import { IconButton } from './IconButton'

type AppNavigationProps = {
  pathname: string
}

export function AppNavigation({ pathname }: AppNavigationProps) {
  const navigate = useNavigate()
  return <nav className="app-navigation" aria-label="Primary navigation">
    <Link aria-current={pathname === '/' ? 'page' : undefined} to="/">Home</Link>
    {import.meta.env.DEV && <Link aria-current={pathname === '/training/annotate' ? 'page' : undefined} className="app-navigation__development" to="/training/annotate">Training</Link>}
    <IconButton aria-current={pathname === '/settings' ? 'page' : undefined} label="Settings" onClick={() => navigate('/settings')}>
      <SettingsIcon/>
    </IconButton>
  </nav>
}
