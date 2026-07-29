import type { ReactNode } from 'react'

type ScanReviewWorkspaceProps = {
  header: ReactNode
  source: ReactNode
  board: ReactNode
  inspector: ReactNode
  keypad: ReactNode
}

/** A scan-specific workspace keeps the source image visible without changing Solver. */
export function ScanReviewWorkspace({ header, source, board, inspector, keypad }: ScanReviewWorkspaceProps) {
  return <section className="scan-review-workspace">
    <div className="scan-review-workspace__scroll">
      <header className="scan-review-workspace__header">{header}</header>
      <aside className="scan-review-workspace__source">{source}</aside>
      <main className="scan-review-workspace__board">{board}</main>
      <aside className="scan-review-workspace__inspector">{inspector}</aside>
    </div>
    <footer className="scan-review-workspace__keypad">{keypad}</footer>
  </section>
}
