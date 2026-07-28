import type { ReactNode } from 'react'

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'error'

type Props = {
  children: ReactNode
  icon?: ReactNode
  tone?: Tone
}

export function StatusBadge({ children, icon, tone = 'neutral' }: Props) {
  return <span className={`ui-status-badge ui-status-badge--${tone}`}>{icon && <span className="ui-status-badge__icon" aria-hidden="true">{icon}</span>}<span>{children}</span></span>
}
