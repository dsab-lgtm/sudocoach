import { type ReactNode, useId } from 'react'

type SettingsSectionProps = {
  children: ReactNode
  description?: ReactNode
  title: string
}

export function SettingsSection({ children, description, title }: SettingsSectionProps) {
  const titleId = useId()
  return <section className="settings-section" aria-labelledby={titleId}>
    <div className="settings-section__heading"><h2 id={titleId}>{title}</h2>{description && <p>{description}</p>}</div>
    {children}
  </section>
}
