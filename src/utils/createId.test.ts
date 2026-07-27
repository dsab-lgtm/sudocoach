import { afterEach, describe, expect, it, vi } from 'vitest'
import { createId } from './createId'

afterEach(() => vi.unstubAllGlobals())

describe('createId', () => {
  it('uses Web Crypto random values when randomUUID is unavailable', () => {
    let seed = 0
    vi.stubGlobal('crypto', {
      getRandomValues: (bytes: Uint8Array) => {
        bytes.fill(seed++)
        return bytes
      }
    })

    const first = createId()
    const second = createId()

    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(second).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(second).not.toBe(first)
  })

  it('still creates distinct identifiers when Web Crypto is unavailable', () => {
    vi.stubGlobal('crypto', undefined)
    expect(createId()).toBeTruthy()
    expect(createId()).not.toBe(createId())
  })
})
