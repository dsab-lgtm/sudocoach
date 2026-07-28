import { type ReactNode, useEffect, useRef, useState } from 'react'
import type { CandidateMode } from '../engine/types'
import { database } from '../storage/database'
import { CandidateAssistantContext } from './candidateAssistantContext'
const isCandidateMode = (value: unknown): value is CandidateMode => value === 'manual' || value === 'cleanup' || value === 'guided' || value === 'automatic'

export function CandidateAssistantProvider({ children }: { children: ReactNode }) {
  const [mode, setModeValue] = useState<CandidateMode>('manual')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const writeVersion = useRef(0)

  useEffect(() => {
    let active = true
    database.settings.get('candidate-mode').then((record) => {
      if (active && isCandidateMode(record?.value)) setModeValue(record.value)
    }).catch(() => { if (active) setError('Candidate assistance could not be loaded. Manual notes are active.') }).finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [])

  const setMode = async (nextMode: CandidateMode) => {
    const version = ++writeVersion.current
    setModeValue(nextMode)
    setError(null)
    try {
      await database.settings.put({ key: 'candidate-mode', value: nextMode })
    } catch {
      if (writeVersion.current === version) setError('Candidate assistance could not be saved. It will apply for this visit only.')
    }
  }

  return <CandidateAssistantContext.Provider value={{ error, isLoading, mode, setMode }}>{children}</CandidateAssistantContext.Provider>
}
