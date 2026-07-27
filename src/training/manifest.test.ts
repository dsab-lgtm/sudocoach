import { describe, expect, it } from 'vitest'
import { cluesToGrid, gridToClues, parsePreparationIndex } from './manifest'

const sha = 'a'.repeat(64)

describe('private training manifest', () => {
  it('parses the prepared-image provenance index', () => {
    const index = parsePreparationIndex(JSON.stringify({ schemaVersion: 1, images: [{ sourceFile: 'IMG_1.HEIC', sourceSha256: sha, preparedFile: 'IMG_1.jpg', preparedSha256: sha }] }))
    expect(index.get('IMG_1.jpg')?.sourceFile).toBe('IMG_1.HEIC')
  })

  it('keeps 81-cell labels aligned with their board positions', () => {
    const clues = `1${'0'.repeat(79)}9`
    const grid = cluesToGrid(clues)
    expect(grid[0][0]).toBe(1)
    expect(grid[8][8]).toBe(9)
    expect(gridToClues(grid)).toBe(clues)
  })
})
