import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ScanCell } from '../scanner/types'
import { SourceImagePanel } from './SourceImagePanel'

const cells: ScanCell[] = [{ row: 0, col: 0, value: 5, confidence: .9, inkRatio: .2, sourceRegion: { points: [{ x: .2, y: .2 }, { x: .3, y: .2 }, { x: .3, y: .3 }, { x: .2, y: .3 }] } }]

describe('SourceImagePanel', () => {
  it('renders a selected-cell context crop with one full-image action and matching overlay', () => {
    render(<SourceImagePanel variant="selected-inspector" cells={cells} previewUrl="blob:scan" selected={{ row: 0, col: 0 }} onSelectCell={() => undefined}/>)
    const crop = screen.getByRole('img', { name: 'Source context for row 1, column 1' })
    expect(crop).toHaveAttribute('src', 'blob:scan')
    expect(parseFloat(crop.style.width)).toBeCloseTo(333.33, 1)
    expect(screen.getByText('Scanned as 5 · 90% confidence')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'View full image' }))
    expect(screen.getByRole('dialog', { name: 'Compare with original photo' })).toBeInTheDocument()
    expect(document.querySelector('.photo-comparison-sheet__image polygon')).toHaveAttribute('points', '0.2,0.2 0.3,0.2 0.3,0.3 0.2,0.3')
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    expect(screen.getByRole('status')).toHaveTextContent('125% zoom')
    fireEvent.click(screen.getByRole('button', { name: 'Reset zoom' }))
    expect(screen.getByRole('status')).toHaveTextContent('100% zoom')
  })

  it('keeps the full source image undistorted and selects mapped regions in the desktop reference', async () => {
    const onSelectCell = vi.fn()
    const { container } = render(<SourceImagePanel variant="reference" cells={cells} previewUrl="blob:scan" selected={{ row: 0, col: 0 }} onSelectCell={onSelectCell}/>)
    expect(screen.getByRole('img', { name: 'Original Sudoku photo used for this scan' })).toHaveAttribute('src', 'blob:scan')
    const image = container.querySelector<HTMLDivElement>('.source-image-panel__reference-image')!
    image.getBoundingClientRect = () => new DOMRect(0, 0, 100, 100)
    fireEvent(image, new MouseEvent('pointerdown', { bubbles: true, clientX: 25, clientY: 25 }))
    await waitFor(() => expect(onSelectCell).toHaveBeenCalledWith({ row: 0, col: 0 }))
  })

  it('uses an honest full-image fallback for legacy scans without geometry', () => {
    render(<SourceImagePanel variant="selected-inspector" cells={[{ row: 0, col: 0, value: 5, confidence: .9, inkRatio: .2 }]} previewUrl="blob:scan" selected={{ row: 0, col: 0 }} onSelectCell={() => undefined}/>)
    expect(screen.getByText('Exact cell mapping is unavailable; this is the full source image.')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Original Sudoku photo used for this scan' })).toBeInTheDocument()
  })
})
