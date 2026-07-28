import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: ButtonVariant
}

export function Button({ children, className = '', type = 'button', variant = 'secondary', ...props }: Props) {
  return <button {...props} type={type} className={`ui-button ui-button--${variant} ${className}`.trim()}>{children}</button>
}
