import { describe, expect, it, vi } from 'vitest'

vi.mock('./digitModel', () => ({ recognizeDigits: vi.fn(async (cells: readonly number[][][]) => cells.map((pixels) => {
  const hasInk = pixels.some((row) => row.some((pixel) => pixel < 100))
  return hasInk ? { value: 6, confidence: 0.99, modelReady: true, modelStatus: 'experimental' } : { value: null, confidence: .98, modelReady: true, modelStatus: 'experimental' }
})) }))

import { scanGrayImage, sourceRegionFor } from './imagePipeline'

describe('scanner grid segmentation', () => {
  it('keeps grid borders out of cells and locates a centred synthetic clue', async () => {
    const size = 180
    const pixels = new Uint8ClampedArray(size * size).fill(255)
    const set = (x: number, y: number, value = 0) => { pixels[y * size + x] = value }
    for (let line = 0; line <= 9; line += 1) for (let point = 0; point < size; point += 1) { set(line * 20, point); set(point, line * 20) }
    for (let y = 44; y < 56; y += 1) for (let x = 44; x < 52; x += 1) set(x, y)
    const result = await scanGrayImage({ pixels, width: size, height: size })
    expect(result.cells).toHaveLength(81)
    expect(result.grid[2][2]).toBe(6)
    expect(result.grid[0][0]).toBeNull()
    const region = result.cells[0].sourceRegion
    expect(region?.points[0]).toEqual({ x: 0, y: 0 })
    expect(region?.points[1].x).toBeGreaterThan(0)
    expect(region?.points[1].x).toBeLessThan(.12)
    expect(region?.points[2].y).toBeGreaterThan(0)
    expect(region?.points[2].y).toBeLessThan(.12)
  })

  it('maps rectified cells back through the detected source quadrilateral', () => {
    const region = sourceRegionFor(0, 0, { pixels: new Uint8ClampedArray(100 * 100), width: 100, height: 100 }, { x: 0, y: 0, size: 100 }, [
      { x: 10, y: 20 }, { x: 80, y: 12 }, { x: 90, y: 88 }, { x: 16, y: 92 }
    ])
    expect(region?.points[0]).toEqual({ x: .1, y: .2 })
    expect(region?.points).toHaveLength(4)
    expect(region?.points.every((point) => point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1)).toBe(true)
  })

  it('normalizes rectified source regions against the original portrait image', () => {
    const region = sourceRegionFor(0, 0, { pixels: new Uint8ClampedArray(200 * 400), width: 200, height: 400 }, { x: 0, y: 0, size: 900 }, [
      { x: 20, y: 80 }, { x: 180, y: 80 }, { x: 180, y: 320 }, { x: 20, y: 320 }
    ])
    expect(region?.points[0]).toEqual({ x: .1, y: .2 })
    expect(region?.points[1].x).toBeCloseTo(.19, 2)
  })

  it('keeps a high-ink cell empty when a blank-aware model rejects it', async () => {
    const size = 180
    const pixels = new Uint8ClampedArray(size * size).fill(255)
    for (let line = 0; line <= 9; line += 1) for (let point = 0; point < size; point += 1) pixels[point * size + line * 20] = pixels[line * 20 * size + point] = 0
    for (let y = 44; y < 56; y += 1) for (let x = 44; x < 52; x += 1) pixels[y * size + x] = 0
    const { recognizeDigits } = await import('./digitModel')
    vi.mocked(recognizeDigits).mockImplementation(async (cells) => cells.map(() => ({ value: null, confidence: .97, modelReady: true, modelStatus: 'experimental' })))
    const result = await scanGrayImage({ pixels, width: size, height: size })
    expect(result.grid[2][2]).toBeNull()
    expect(result.cells.find((cell) => cell.row === 2 && cell.col === 2)?.inkRatio).toBeGreaterThan(0)
  })

  it('reports grid detection, batched recognition, and review preparation in order', async () => {
    const size = 180
    const pixels = new Uint8ClampedArray(size * size).fill(255)
    for (let line = 0; line <= 9; line += 1) for (let point = 0; point < size; point += 1) pixels[point * size + line * 20] = pixels[line * 20 * size + point] = 0
    const { recognizeDigits } = await import('./digitModel')
    vi.mocked(recognizeDigits).mockImplementation(async (cells) => cells.map(() => ({ value: null, confidence: .98, modelReady: true, modelStatus: 'experimental' })))
    const progress: string[] = []

    await scanGrayImage({ pixels, width: size, height: size }, (event) => progress.push(`${event.stage}:${event.completed ?? ''}`))

    expect(vi.mocked(recognizeDigits)).toHaveBeenCalledWith(expect.any(Array))
    expect(vi.mocked(recognizeDigits).mock.calls.at(-1)?.[0]).toHaveLength(81)
    expect(progress).toEqual(['grid-detection:', 'recognizing:0', 'recognizing:81', 'preparing-review:'])
  })
})
