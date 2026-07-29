import { StatusBadge } from './StatusBadge'

type ReviewSummaryProps = {
  detected: number
  reviewed: number
  added: number
  unresolved: number
}

export function ReviewSummary({ detected, reviewed, added, unresolved }: ReviewSummaryProps) {
  return <div className="review-summary" role="status" aria-label="Scan review status">
    <StatusBadge tone="neutral"><strong>{detected}</strong> scanned</StatusBadge>
    <StatusBadge tone="neutral"><strong>{added}</strong> added</StatusBadge>
    <StatusBadge tone="success"><strong>{reviewed}</strong> confirmed</StatusBadge>
    <StatusBadge tone={unresolved ? 'warning' : 'success'}><strong>{unresolved}</strong> to review</StatusBadge>
  </div>
}
