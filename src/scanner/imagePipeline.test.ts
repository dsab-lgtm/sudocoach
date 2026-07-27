import { describe, expect, it, vi } from 'vitest'

vi.mock('./digitModel', () => ({ recognizeDigit: vi.fn(async () => ({ value: 6, confidence: 0.99, modelReady: true, modelStatus: 'experimental' })) }))

import { scanGrayImage } from './imagePipeline'

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
  })
})
