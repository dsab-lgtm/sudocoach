import type { ReactNode } from 'react'
import { BrandLogo } from './BrandLogo'
import { BackIcon } from './AppIcon'
import { IconButton } from './IconButton'

type BackAction = {
  label: string
  onClick: () => void
}

type TaskHeaderProps = {
  eyebrow: ReactNode
  title: ReactNode
  titleId?: string
  description?: ReactNode
  status?: ReactNode
  feedback?: ReactNode
  backAction?: BackAction
  actions?: ReactNode
}

/** Shared route header for focused tasks and full-screen puzzle workspaces. */
export function TaskHeader({ eyebrow, title, titleId, description, status, feedback, backAction, actions }: TaskHeaderProps) {
  return <div className="task-header">
    <div className="task-header__identity">
      <BrandLogo variant="compact"/>
      <div>
        <p className="task-header__eyebrow">{eyebrow}</p>
        <h1 id={titleId}>{title}</h1>
        {description && <p className="task-header__description">{description}</p>}
      </div>
    </div>
    <div className="task-header__actions">
      {status && <div className="task-header__status">{status}</div>}
      {actions}
      {backAction && <IconButton label={backAction.label} onClick={backAction.onClick}><BackIcon/></IconButton>}
    </div>
    {feedback && <div className="task-header__feedback">{feedback}</div>}
  </div>
}
