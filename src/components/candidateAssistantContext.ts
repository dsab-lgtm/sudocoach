import { createContext, useContext } from 'react'
import type { CandidateMode } from '../engine/types'

export type CandidateAssistantContextValue = {
  error: string | null
  isLoading: boolean
  mode: CandidateMode
  setMode: (mode: CandidateMode) => Promise<void>
}

const fallbackContext: CandidateAssistantContextValue = { error: null, isLoading: false, mode: 'manual', setMode: async () => undefined }
export const CandidateAssistantContext = createContext<CandidateAssistantContextValue>(fallbackContext)
export const useCandidateAssistant = () => useContext(CandidateAssistantContext)
