import { Link } from 'react-router-dom'
import { Surface } from './Surface'

type HomeActionCardProps = {
  description: string
  kind: 'scan' | 'manual' | 'practice'
  title: string
  to: string
}

function ActionMark({ kind }: Pick<HomeActionCardProps, 'kind'>) {
  if (kind === 'scan') return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M8 4v16M16 4v16M4 8h16M4 16h16" fill="none" stroke="currentColor" strokeWidth="1.2"/><path d="m15.5 10.5 2.5 2.5-2.5 2.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"/></svg>
  if (kind === 'practice') return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M9.5 4v16M14.5 4v16M4 9.5h16M4 14.5h16" fill="none" stroke="currentColor" strokeWidth="1.2"/><path d="m9 12 2 2 4-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"/></svg>
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m5 18 2.1-5.2L15.8 4a2.2 2.2 0 0 1 3.1 3.1l-8.7 8.7L5 18Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"/><path d="m13.7 6.1 4.2 4.2M4 20h8" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8"/></svg>
}

/** A single link owns the full action card to keep the interaction valid and obvious. */
export function HomeActionCard({ description, kind, title, to }: HomeActionCardProps) {
  return <Link className={`home-action-card home-action-card--${kind}`} to={to}>
    <Surface elevation="raised">
      <span className="home-action-card__mark"><ActionMark kind={kind}/></span>
      <span><strong>{title}</strong><small>{description}</small></span>
      <span className="home-action-card__arrow" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M5 12h13m-5-5 5 5-5 5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9"/></svg></span>
    </Surface>
  </Link>
}
