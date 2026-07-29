import { Link } from 'react-router-dom'
import { ForwardIcon, ManualEntryIcon, PuzzleIcon } from './AppIcon'
import { Surface } from './Surface'

type HomeActionCardProps = {
  description: string
  kind: 'scan' | 'manual' | 'practice'
  title: string
  to: string
}

function ActionMark({ kind }: Pick<HomeActionCardProps, 'kind'>) {
  if (kind === 'manual') return <ManualEntryIcon/>
  return <PuzzleIcon/>
}

/** A single link owns the full action card to keep the interaction valid and obvious. */
export function HomeActionCard({ description, kind, title, to }: HomeActionCardProps) {
  return <Link className={`home-action-card home-action-card--${kind}`} to={to}>
    <Surface elevation="raised">
      <span className="home-action-card__mark"><ActionMark kind={kind}/></span>
      <span><strong>{title}</strong><small>{description}</small></span>
      <span className="home-action-card__arrow" aria-hidden="true"><ForwardIcon/></span>
    </Surface>
  </Link>
}
