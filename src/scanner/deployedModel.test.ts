import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { isDigitModelMetadata } from './modelMetadata'

describe('bundled experimental model', () => {
  it('ships a validated metadata contract and weight shard', () => {
    const directory = resolve(process.cwd(), 'public/models/sudoku-digits')
    const metadata = JSON.parse(readFileSync(resolve(directory, 'metadata.json'), 'utf8'))
    expect(isDigitModelMetadata(metadata)).toBe(true)
    expect(metadata.modelStatus).toBe('experimental')
    expect(existsSync(resolve(directory, 'model.json'))).toBe(true)
    expect(existsSync(resolve(directory, 'group1-shard1of1.bin'))).toBe(true)
  })
})
