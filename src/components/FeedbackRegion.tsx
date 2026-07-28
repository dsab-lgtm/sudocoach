import type { FeedbackMessage } from './feedbackContext'

type ActiveFeedback = FeedbackMessage & { id: number }

export function FeedbackRegion({ feedback }: { feedback: ActiveFeedback | null }) {
  if (!feedback) return null
  const assertive = feedback.priority === 'assertive' || feedback.tone === 'error'
  return <div className={`feedback-toast feedback-toast--${feedback.tone ?? 'info'}`} role={assertive ? 'alert' : 'status'} aria-live={assertive ? 'assertive' : 'polite'} aria-atomic="true">
    {feedback.message}
  </div>
}
