import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: ButtonVariant
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button({ children, className = '', type = 'button', variant = 'secondary', ...props }, ref) {
  return <button {...props} ref={ref} type={type} className={`ui-button ui-button--${variant} ${className}`.trim()}>{children}</button>
})
