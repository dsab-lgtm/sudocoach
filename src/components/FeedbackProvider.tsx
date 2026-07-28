import { type ReactNode, useEffect, useRef, useState } from 'react'
import { FeedbackContext, type FeedbackMessage } from './feedbackContext'
import { FeedbackRegion } from './FeedbackRegion'

type ActiveFeedback = FeedbackMessage & { id: number }

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [feedback, setFeedback] = useState<ActiveFeedback | null>(null)
  const nextId = useRef(0)

  const announce = (next: FeedbackMessage) => {
    setFeedback({ ...next, id: ++nextId.current })
  }

  useEffect(() => {
    if (!feedback || feedback.priority === 'assertive' || feedback.tone === 'error') return
    const timeout = window.setTimeout(() => setFeedback((current) => current?.id === feedback.id ? null : current), 4000)
    return () => window.clearTimeout(timeout)
  }, [feedback])

  return <FeedbackContext.Provider value={{ announce }}>
    {children}
    <FeedbackRegion feedback={feedback}/>
  </FeedbackContext.Provider>
}
