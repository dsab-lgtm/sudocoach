import type { ReactNode } from 'react'

type PuzzleWorkspaceProps = {
  className?: string
  header: ReactNode
  board: ReactNode
  dock: ReactNode
}

/**
 * The active puzzle screens share one mobile viewport. Keeping the board and
 * controls in named regions prevents the page itself becoming the interaction
 * surface on smaller phones.
 */
export function PuzzleWorkspace({ className = '', header, board, dock }: PuzzleWorkspaceProps) {
  return <section className={`puzzle-workspace ${className}`.trim()}>
    <header className="workspace-header">{header}</header>
    <div className="workspace-board-area">{board}</div>
    <footer className="workspace-dock">{dock}</footer>
  </section>
}
