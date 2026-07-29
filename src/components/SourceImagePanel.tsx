import { useMemo, useState, type PointerEvent } from 'react'
import type { CellPosition } from '../engine/types'
import type { ScanCell, SourcePoint, SourceRegion } from '../scanner/types'
import { Button } from './Button'
import { PhotoComparisonSheet } from './PhotoComparisonSheet'

type SourceImagePanelProps = {
  cells: readonly ScanCell[]
  previewUrl: string | null
  selected: CellPosition | null
  onSelectCell: (position: CellPosition) => void
  variant: 'reference' | 'selected-inspector'
}

const pointInRegion = (point: SourcePoint, region: SourceRegion) => {
  let inside = false
  const points = region.points
  for (let index = 0, previous = points.length - 1; index < points.length; previous = index++) {
    const current = points[index]; const prior = points[previous]
    if ((current.y > point.y) !== (prior.y > point.y) && point.x < (prior.x - current.x) * (point.y - current.y) / (prior.y - current.y) + current.x) inside = !inside
  }
  return inside
}

const regionBounds = (region: SourceRegion) => {
  const xs = region.points.map((point) => point.x); const ys = region.points.map((point) => point.y)
  return { left: Math.min(...xs), top: Math.min(...ys), right: Math.max(...xs), bottom: Math.max(...ys) }
}

/** Includes approximately one neighbouring Sudoku cell on every available side. */
const contextBounds = (region: SourceRegion) => {
  const bounds = regionBounds(region)
  const width = bounds.right - bounds.left; const height = bounds.bottom - bounds.top
  const left = Math.max(0, bounds.left - width); const top = Math.max(0, bounds.top - height)
  const right = Math.min(1, bounds.right + width); const bottom = Math.min(1, bounds.bottom + height)
  return { left, top, width: Math.max(.01, right - left), height: Math.max(.01, bottom - top) }
}

const selectedLabel = (selected: CellPosition | null) => selected ? `Row ${selected.row + 1}, column ${selected.col + 1}` : 'Select a cell'

export function SourceImagePanel({ cells, previewUrl, selected, onSelectCell, variant }: SourceImagePanelProps) {
  const [showPhotoDetail, setShowPhotoDetail] = useState(false)
  const [sourceAspect, setSourceAspect] = useState(1)
  const selectedCell = useMemo(() => selected ? cells.find((cell) => cell.row === selected.row && cell.col === selected.col) : undefined, [cells, selected])
  const selectedRegion = selectedCell?.sourceRegion
  const crop = selectedRegion ? contextBounds(selectedRegion) : null
  const hasGeometry = cells.some((cell) => cell.sourceRegion)
  const label = selectedLabel(selected)

  if (!previewUrl) return <section className={`source-image-panel source-image-panel--${variant} source-image-panel--unavailable`} aria-label="Source image"><p>Original image is unavailable for this scan.</p></section>

  const selectImageRegion = (event: PointerEvent<HTMLDivElement>) => {
    if (!hasGeometry) return
    const rect = event.currentTarget.getBoundingClientRect()
    const point = { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height }
    const match = cells.find((cell) => cell.sourceRegion && pointInRegion(point, cell.sourceRegion))
    if (match) onSelectCell({ row: match.row, col: match.col })
  }

  if (variant === 'reference') return <section className="source-image-panel source-image-panel--reference" aria-label="Original scan comparison">
    <div className="source-image-panel__heading">
      <div><p className="eyebrow">Source image</p><strong>{label}</strong></div>
      <Button variant="ghost" onClick={() => setShowPhotoDetail(true)}>Open photo viewer</Button>
    </div>
    <div className="source-image-panel__reference-image" onPointerDown={selectImageRegion} style={{ aspectRatio: sourceAspect }}>
      <img src={previewUrl} alt="Original Sudoku photo used for this scan" onLoad={(event) => setSourceAspect(event.currentTarget.naturalWidth / event.currentTarget.naturalHeight)}/>
      {selectedRegion && <svg className="source-image-panel__region" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true"><polygon points={selectedRegion.points.map((point) => `${point.x},${point.y}`).join(' ')}/></svg>}
    </div>
    <p className="source-image-panel__detail" role="status">{hasGeometry ? `Highlighted source area matches ${label.toLowerCase()}. Select a board cell or tap the photo to compare it.` : 'Exact cell mapping is unavailable for this scan.'}</p>
    {showPhotoDetail && <PhotoComparisonSheet previewUrl={previewUrl} selectedRegion={selectedRegion} selectedLabel={selectedRegion ? label.toLowerCase() : undefined} onClose={() => setShowPhotoDetail(false)}/>}
  </section>

  return <section className="source-image-panel source-image-panel--selected-inspector" aria-label="Selected clue inspector">
    <div className="source-image-panel__crop" style={{ aspectRatio: crop ? `${sourceAspect * crop.width} / ${crop.height}` : sourceAspect }}>
      <img src={previewUrl} alt={selectedRegion ? `Source context for ${label.toLowerCase()}` : 'Original Sudoku photo used for this scan'} onLoad={(event) => setSourceAspect(event.currentTarget.naturalWidth / event.currentTarget.naturalHeight)} style={crop ? { width: `${100 / crop.width}%`, height: 'auto', left: `${-crop.left / crop.width * 100}%`, top: `${-crop.top / crop.height * 100}%` } : undefined}/>
    </div>
    <div className="source-image-panel__selected-detail">
      <p className="eyebrow">Selected clue</p>
      <strong>{label}</strong>
      {selectedCell?.value ? <span>Scanned as {selectedCell.value} · {Math.round(selectedCell.confidence * 100)}% confidence</span> : <span>{selectedRegion ? 'No digit detected in this cell' : 'Compare this cell in the original image'}</span>}
      <Button variant="ghost" onClick={() => setShowPhotoDetail(true)}>View full image</Button>
    </div>
    {!selectedRegion && <p className="source-image-panel__detail" role="status">Exact cell mapping is unavailable; this is the full source image.</p>}
    {showPhotoDetail && <PhotoComparisonSheet previewUrl={previewUrl} selectedRegion={selectedRegion} selectedLabel={selectedRegion ? label.toLowerCase() : undefined} onClose={() => setShowPhotoDetail(false)}/>} 
  </section>
}
