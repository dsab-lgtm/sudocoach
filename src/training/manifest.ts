import type { Digit, Grid } from '../engine/types'

export type PreparationImage = {
  sourceFile: string
  sourceSha256: string
  preparedFile: string
  preparedSha256: string
}

export type ManifestEntry = PreparationImage & { clues: string; annotatedAt: string }

const hash = (value: unknown) => typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value)

export const parsePreparationIndex = (text: string): Map<string, PreparationImage> => {
  const value = JSON.parse(text) as { schemaVersion?: number; images?: unknown[] }
  if (value.schemaVersion !== 1 || !Array.isArray(value.images)) throw new Error('Expected the preparation index created by the local script.')
  const images = value.images.map((candidate) => {
    const image = candidate as Partial<PreparationImage>
    if (!image.sourceFile || !image.preparedFile || !hash(image.sourceSha256) || !hash(image.preparedSha256)) throw new Error('Preparation index contains an invalid photo record.')
    return image as PreparationImage
  })
  return new Map(images.map((image) => [image.preparedFile, image]))
}

export const gridToClues = (grid: Grid) => grid.flat().map((value) => value ?? 0).join('')

export const cluesToGrid = (clues: string): Grid => {
  if (!/^[0-9.]{81}$/.test(clues)) throw new Error('Clues must be an 81-character Sudoku string.')
  return Array.from({ length: 9 }, (_, row) => Array.from({ length: 9 }, (_, col) => {
    const clue = clues[row * 9 + col]
    return clue === '0' || clue === '.' ? null : Number(clue) as Digit
  }))
}
