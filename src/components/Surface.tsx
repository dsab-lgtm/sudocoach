import type { HTMLAttributes, ReactNode } from 'react'

type Props = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
  elevation?: 'flat' | 'raised'
}

export function Surface({ children, className = '', elevation = 'flat', ...props }: Props) {
  return <div {...props} className={`ui-surface ui-surface--${elevation} ${className}`.trim()}>{children}</div>
}
