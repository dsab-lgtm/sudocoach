import { createContext, useContext } from 'react'

export type FeedbackTone = 'success' | 'info' | 'error'
export type FeedbackPriority = 'polite' | 'assertive'

export type FeedbackMessage = {
  message: string
  tone?: FeedbackTone
  priority?: FeedbackPriority
}

export type FeedbackContextValue = {
  announce: (feedback: FeedbackMessage) => void
}

const fallbackContext: FeedbackContextValue = { announce: () => undefined }

export const FeedbackContext = createContext<FeedbackContextValue>(fallbackContext)
export const useFeedback = () => useContext(FeedbackContext)
