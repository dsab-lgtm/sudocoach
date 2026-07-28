import { Link, useNavigate } from 'react-router-dom'
import { IconButton } from './IconButton'

type AppNavigationProps = {
  pathname: string
}

function SettingsIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm0-5.5 1.1 2.1 2.3.5 1.6-1.5 1.8 1.8-1.5 1.6.5 2.3 2.1 1.1v2.2l-2.1 1.1-.5 2.3 1.5 1.6-1.8 1.8-1.6-1.5-2.3.5-1.1 2.1H9.8l-1.1-2.1-2.3-.5-1.6 1.5-1.8-1.8 1.5-1.6-.5-2.3L2 13.1v-2.2l2.1-1.1.5-2.3L3.1 6 4.9 4.2l1.6 1.5 2.3-.5L9.9 3H12Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6"/>
  </svg>
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
