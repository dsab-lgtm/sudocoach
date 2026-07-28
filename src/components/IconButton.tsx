import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { ButtonVariant } from './Button'

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'children'> & {
  children: ReactNode
  label: string
  variant?: ButtonVariant
}

export function IconButton({ children, className = '', label, type = 'button', variant = 'ghost', ...props }: Props) {
  return <button {...props} type={type} className={`ui-icon-button ui-icon-button--${variant} ${className}`.trim()} aria-label={label}>{children}</button>
}
