type ReviewSummaryProps = {
  detected: number
  reviewed: number
  added: number
  unresolved: number
}

export function ReviewSummary({ detected, reviewed, added, unresolved }: ReviewSummaryProps) {
  return <p className="review-summary" role="status" aria-label="Scan review status"><strong>{reviewed} / {detected} confirmed</strong><span aria-hidden="true"> · </span><span>{unresolved} remaining</span>{added > 0 && <><span aria-hidden="true"> · </span><span>{added} added</span></>}</p>
}
