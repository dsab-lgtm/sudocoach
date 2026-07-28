import type { ReactNode } from 'react'
import type { FeedbackTone } from './feedbackContext'

export function InlineFeedback({ children, className = '', tone = 'info' }: { children: ReactNode; className?: string; tone?: FeedbackTone }) {
  return <p className={`inline-feedback inline-feedback--${tone} ${className}`.trim()} role={tone === 'error' ? 'alert' : 'status'} aria-atomic="true">{children}</p>
}
