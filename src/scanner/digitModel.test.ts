import { describe, expect, it } from 'vitest'
import { preprocessDigit } from './digitPreprocess'
import { preprocessDigitForModel } from './digitModel'

describe('digit preprocessing', () => {
  it('centres usable ink and produces the 28×28 inverted model input', () => {
    const pixels = Array.from({ length: 24 }, (_, row) => Array.from({ length: 24 }, (_, column) => column >= 10 && column <= 13 && row >= 5 && row <= 18 ? 0 : 255))
    const output = preprocessDigitForModel(pixels)
    expect(output).toHaveLength(28 * 28)
    expect(Math.max(...output)).toBe(1)
    expect(Math.min(...output)).toBe(0)
    expect(preprocessDigit(pixels).hasInk).toBe(true)
  })

  it('rejects border-only grid-line leakage and blank cells', () => {
    const gridLine = Array.from({ length: 40 }, (_, row) => Array.from({ length: 40 }, (_, column) => row < 2 || column < 2 ? 0 : 255))
    expect(preprocessDigit(gridLine).hasInk).toBe(false)
    expect(preprocessDigit(Array.from({ length: 20 }, () => Array(20).fill(238))).hasInk).toBe(false)
  })
})
