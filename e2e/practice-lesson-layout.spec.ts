import { expect, test } from '@playwright/test'

const viewports = [
  { width: 320, height: 640 },
  { width: 390, height: 844 },
  { width: 768, height: 900 },
  { width: 1024, height: 900 },
  { width: 1440, height: 1000 },
]

for (const viewport of viewports) {
  test(`keeps the guided practice lesson readable at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport)
    await page.goto('/#/practice/naked-single/naked-single-1')

    const lesson = page.locator('.practice-lesson')
    const board = page.getByRole('grid', { name: 'Sudoku puzzle' })
    await expect(lesson).toBeVisible()
    await expect(board).toBeVisible()
    await lesson.screenshot({ path: testInfo.outputPath(`practice-initial-${viewport.width}.png`) })

    const initial = await board.evaluate((element) => {
      const rect = element.getBoundingClientRect()
      return { width: rect.width, height: rect.height, notes: element.querySelectorAll('.notes').length }
    })
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width)
    expect(initial.width).toBeCloseTo(initial.height, 1)
    expect(initial.width).toBeGreaterThanOrEqual(Math.min(280, viewport.width - 40))
    expect(initial.notes).toBe(0)

    await page.getByRole('button', { name: 'Show next clue' }).click()
    await page.getByRole('button', { name: 'Show next clue' }).click()
    const target = page.locator('.practice-lesson .board-cell.is-hint-target')
    await expect(target).toHaveCount(0)
    await expect(page.locator('.practice-lesson .notes')).toHaveCount(1)
    await lesson.screenshot({ path: testInfo.outputPath(`practice-evidence-${viewport.width}.png`) })

    await page.getByRole('button', { name: 'Reveal answer' }).click()
    await expect(target).toHaveCount(1)
    await expect(target.locator('.hint-cell-marker')).toHaveCount(0)
    await lesson.screenshot({ path: testInfo.outputPath(`practice-reveal-${viewport.width}.png`) })

    await target.click()
    await page.getByRole('button', { name: 'Check placement' }).click()
    await expect(page.getByText('Lesson complete')).toBeVisible()
    await lesson.screenshot({ path: testInfo.outputPath(`practice-complete-${viewport.width}.png`) })
  })
}
