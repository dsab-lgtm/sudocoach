import { IconButton } from './IconButton'
import { Modal } from './Modal'

type PhotoComparisonSheetProps = {
  onClose: () => void
  previewUrl: string
}

function CloseIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="m7 7 10 10M17 7 7 17" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.9"/>
  </svg>
}

/** Keeps scan-photo presentation specialized while reusing modal focus behavior. */
export function PhotoComparisonSheet({ onClose, previewUrl }: PhotoComparisonSheetProps) {
  return <Modal eyebrow="Original scan" title="Compare with original photo" description="Use the photo to check the highlighted clues." onClose={onClose}>
    <div className="photo-comparison-sheet">
      <div className="photo-comparison-sheet__actions"><IconButton label="Close photo" onClick={onClose}><CloseIcon/></IconButton></div>
      <img src={previewUrl} alt="Original puzzle photo"/>
    </div>
  </Modal>
}
