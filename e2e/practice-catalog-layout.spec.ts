import { expect, test } from '@playwright/test'

const viewports = [
  { width: 320, height: 640 },
  { width: 768, height: 900 },
  { width: 1024, height: 900 },
  { width: 1440, height: 1000 },
]

for (const viewport of viewports) {
  test(`keeps the practice catalogue calm and readable at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport)
    await page.goto('/#/practice')

    const catalogue = page.locator('.practice-catalog')
    const grid = page.locator('.practice-catalog__grid')
    const cards = page.locator('.practice-catalog__grid .home-action-card')

    await expect(catalogue).toBeVisible()
    await expect(cards).toHaveCount(5)
    await catalogue.screenshot({ path: testInfo.outputPath(`practice-catalog-${viewport.width}.png`) })

    const metrics = await grid.evaluate((element) => {
      const gridRect = element.getBoundingClientRect()
      const cards = Array.from(element.querySelectorAll<HTMLElement>('.home-action-card')).map((card) => {
        const rect = card.getBoundingClientRect()
        return { left: Math.round(rect.left), width: rect.width }
      })

      return {
        width: gridRect.width,
        scrollWidth: element.scrollWidth,
        columns: new Set(cards.map((card) => card.left)).size,
        cards,
      }
    })

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width)
    expect(metrics.scrollWidth).toBeLessThanOrEqual(Math.ceil(metrics.width))
    expect(Math.min(...metrics.cards.map((card) => card.width))).toBeGreaterThan(0)
    expect(metrics.columns).toBe(viewport.width < 768 ? 1 : 2)

    if (viewport.width >= 1024) {
      const bounds = await catalogue.evaluate((element) => {
        const rect = element.getBoundingClientRect()
        return { center: rect.left + rect.width / 2, width: rect.width }
      })

      expect(bounds.width).toBeLessThanOrEqual(1080)
      expect(bounds.center).toBeCloseTo(viewport.width / 2, 0)
    }
  })
}
