import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'

type Props = {
  children: ReactNode
  initialEntries?: string[]
}

/** Keeps test navigation aligned with the next React Router defaults. */
export function TestRouter({ children, initialEntries }: Props) {
  return <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={initialEntries}>{children}</MemoryRouter>
}
