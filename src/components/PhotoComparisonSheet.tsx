import { IconButton } from './IconButton'
import { Modal } from './Modal'
import type { SourceRegion } from '../scanner/types'

type PhotoComparisonSheetProps = {
  onClose: () => void
  previewUrl: string
  selectedRegion?: SourceRegion
  selectedLabel?: string
}

function CloseIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="m7 7 10 10M17 7 7 17" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.9"/>
  </svg>
}

/** Keeps scan-photo presentation specialized while reusing modal focus behavior. */
export function PhotoComparisonSheet({ onClose, previewUrl, selectedRegion, selectedLabel }: PhotoComparisonSheetProps) {
  return <Modal eyebrow="Original scan" title="Compare with original photo" description={selectedLabel ? `The highlighted area is ${selectedLabel}.` : 'Use the photo to check the scanned clues.'} onClose={onClose}>
    <div className="photo-comparison-sheet">
      <div className="photo-comparison-sheet__actions"><IconButton label="Close photo" onClick={onClose}><CloseIcon/></IconButton></div>
      <div className="photo-comparison-sheet__image">
        <img src={previewUrl} alt="Original puzzle photo"/>
        {selectedRegion && <svg viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true"><polygon points={selectedRegion.points.map((point) => `${point.x},${point.y}`).join(' ')}/></svg>}
      </div>
    </div>
  </Modal>
}
