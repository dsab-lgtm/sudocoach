import { useRef, useState, type PointerEvent, type WheelEvent } from 'react'
import { IconButton } from './IconButton'
import { CloseIcon, ResetZoomIcon, ZoomInIcon, ZoomOutIcon } from './AppIcon'
import { Modal } from './Modal'
import type { SourceRegion } from '../scanner/types'

type PhotoComparisonSheetProps = {
  onClose: () => void
  previewUrl: string
  selectedRegion?: SourceRegion
  selectedLabel?: string
}

/** Keeps scan-photo presentation specialized while reusing modal focus behavior. */
export function PhotoComparisonSheet({ onClose, previewUrl, selectedRegion, selectedLabel }: PhotoComparisonSheetProps) {
  const [scale, setScale] = useState(1)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinchDistance = useRef<number | null>(null)
  const changeScale = (amount: number) => setScale((current) => Math.min(3, Math.max(1, Number((current + amount).toFixed(2)))))
  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey && Math.abs(event.deltaY) < 4) return
    event.preventDefault()
    changeScale(event.deltaY < 0 ? .2 : -.2)
  }
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const active = [...pointers.current.values()]
    if (active.length !== 2) return
    const distance = Math.hypot(active[0].x - active[1].x, active[0].y - active[1].y)
    if (pinchDistance.current) changeScale((distance - pinchDistance.current) / 180)
    pinchDistance.current = distance
  }
  const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId)
    if (pointers.current.size < 2) pinchDistance.current = null
  }

  return <Modal eyebrow="Original scan" title="Compare with original photo" description={selectedLabel ? `The highlighted area is ${selectedLabel}.` : 'Use the photo to check the scanned clues.'} onClose={onClose}>
    <div className="photo-comparison-sheet">
      <div className="photo-comparison-sheet__actions">
        <IconButton label="Zoom out" disabled={scale === 1} onClick={() => changeScale(-.25)}><ZoomOutIcon/></IconButton>
        <IconButton label="Reset zoom" disabled={scale === 1} onClick={() => setScale(1)}><ResetZoomIcon/></IconButton>
        <IconButton label="Zoom in" disabled={scale === 3} onClick={() => changeScale(.25)}><ZoomInIcon/></IconButton>
        <IconButton label="Close photo" onClick={onClose}><CloseIcon/></IconButton>
      </div>
      <p className="photo-comparison-sheet__zoom-status" role="status">{Math.round(scale * 100)}% zoom. Use the controls, wheel, or pinch to inspect the photo.</p>
      <div className="photo-comparison-sheet__viewport" onWheel={onWheel} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd}>
      <div className="photo-comparison-sheet__image" style={{ transform: `scale(${scale})` }}>
        <img src={previewUrl} alt="Original puzzle photo"/>
        {selectedRegion && <svg viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true"><polygon points={selectedRegion.points.map((point) => `${point.x},${point.y}`).join(' ')}/></svg>}
      </div>
      </div>
    </div>
  </Modal>
}
