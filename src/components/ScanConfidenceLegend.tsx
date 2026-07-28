export function ScanConfidenceLegend() {
  return <aside className="scan-confidence-legend" aria-label="Scan review markers">
    <span><i className="scan-confidence-legend__marker scan-confidence-legend__marker--pending" aria-hidden="true">!</i>Needs review</span>
    <span><i className="scan-confidence-legend__marker scan-confidence-legend__marker--corrected" aria-hidden="true">E</i>Edited</span>
    <span><i className="scan-confidence-legend__marker scan-confidence-legend__marker--reviewed" aria-hidden="true">✓</i>Confirmed</span>
  </aside>
}
