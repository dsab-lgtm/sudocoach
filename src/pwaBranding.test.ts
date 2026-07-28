import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const source = (path: string) => readFileSync(resolve(root, path), 'utf8')
const icon = (path: string) => readFileSync(resolve(root, 'public/icons', path))
const legacyIdentity = new RegExp(['sudo' + 'scan', 'sudo' + 'solver'].join('|'), 'i')

const pngDimensions = (file: Buffer) => ({
  colorType: file[25],
  height: file.readUInt32BE(20),
  width: file.readUInt32BE(16)
})

describe('SudoCoach public branding', () => {
  it('keeps SudoCoach metadata and base-aware public icon links', () => {
    const html = source('index.html')
    const config = source('vite.config.ts')
    const packageMetadata = JSON.parse(source('package.json')) as { description?: string; name: string }

    expect(html).toContain('<title>SudoCoach</title>')
    expect(html).toContain('name="application-name" content="SudoCoach"')
    expect(html).toContain('name="apple-mobile-web-app-title" content="SudoCoach"')
    expect(html).toContain('href="%BASE_URL%icons/favicon.svg"')
    expect(html).toContain('href="%BASE_URL%icons/favicon-16.png"')
    expect(html).toContain('href="%BASE_URL%icons/favicon-32.png"')
    expect(html).toContain('href="%BASE_URL%icons/favicon-48.png"')
    expect(html).toContain('href="%BASE_URL%icons/apple-touch-icon.png"')
    expect(config).toContain("name: 'SudoCoach'")
    expect(config).toContain("short_name: 'SudoCoach'")
    expect(config).toContain("theme_color: '#0D1B2A'")
    expect(config).toContain("background_color: '#F7F4ED'")
    expect(config).toContain("start_url: '.'")
    expect(config).toContain("'icons/favicon.svg'")
    expect(config).toContain("'icons/favicon-16.png'")
    expect(config).toContain("'icons/favicon-32.png'")
    expect(config).toContain("'icons/favicon-48.png'")
    expect(config).toContain("{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' }")
    expect(config).toContain("{ src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }")
    expect(config).toContain("{ src: 'icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' }")
    expect(config).toContain("{ src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }")
    expect(packageMetadata.name).toBe('sudocoach')
    expect(packageMetadata.description).toContain('SudoCoach')
    expect(config).toContain("base: process.env.GITHUB_ACTIONS ? '/sudocoach/' : '/'")
    expect(config).toContain('sourcemap: false')
  })

  it('ships supplied production icon assets without design-board references', () => {
    const assets: Array<[string, number, number]> = [
      ['favicon-16.png', 16, 6],
      ['favicon-32.png', 32, 6],
      ['favicon-48.png', 48, 6],
      ['icon-192.png', 192, 6],
      ['icon-512.png', 512, 6],
      ['maskable-192.png', 192, 2],
      ['maskable-512.png', 512, 2],
      ['apple-touch-icon.png', 180, 6]
    ]

    expect(existsSync(resolve(root, 'public/icons/favicon.svg'))).toBe(true)
    expect(source('public/icons/favicon.svg')).toContain('viewBox="0 0 128 128"')
    expect(source('public/icons/favicon.svg')).not.toMatch(/docs\/design|sudocoach-(?:brand-board|mascot-states|icon-system|achievement-badges)/i)
    expect(existsSync(resolve(root, 'public/brand/logo-mark.svg'))).toBe(true)
    expect(existsSync(resolve(root, 'public/brand/logo-mark-dark.svg'))).toBe(true)
    for (const [name, size, colorType] of assets) {
      const image = icon(name)
      expect(image.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
      expect(pngDimensions(image)).toEqual({ width: size, height: size, colorType })
    }
  })

  it('uses only SudoCoach identifiers and keeps private working materials ignored', () => {
    const publicFiles = ['index.html', 'vite.config.ts', 'README.md', 'src/main.tsx', 'src/storage/database.ts', 'src/screens/TrainingAnnotationScreen.tsx']
    for (const path of publicFiles) expect(source(path)).not.toMatch(legacyIdentity)

    const main = source('src/main.tsx')
    const database = source('src/storage/database.ts')
    const ignored = source('.gitignore')
    expect(main).toContain("const updateReadyEvent = 'sudocoach:update-ready'")
    expect(main).toContain('A new version of SudoCoach is ready.')
    expect(database).toContain("super('sudocoach')")
    expect(ignored).toContain('/AGENTS.md')
    expect(ignored).toContain('/docs/design/')
  })
})
