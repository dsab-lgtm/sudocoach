import { describe, expect, it } from 'vitest'
import { orderCorners } from './opencvGrid'

describe('grid corner ordering', () => {
  it('maps a quadrilateral to top-left, top-right, bottom-right, bottom-left', () => {
    const ordered = orderCorners([{ x: 880, y: 850 }, { x: 110, y: 105 }, { x: 125, y: 870 }, { x: 900, y: 120 }])
    expect(ordered).toEqual([{ x: 110, y: 105 }, { x: 900, y: 120 }, { x: 880, y: 850 }, { x: 125, y: 870 }])
  })
})
