import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const viewports = [
  { width: 320, height: 640 },
  { width: 390, height: 844 },
  { width: 768, height: 900 },
  { width: 1024, height: 900 },
  { width: 1440, height: 1000 }
]

const screens = [
  { name: 'home', url: '/#/' },
  { name: 'camera', url: '/#/camera' },
  { name: 'manual-entry', url: '/#/manual' },
  { name: 'solver', url: '/#/__e2e__/solver' },
  { name: 'processing-pending', url: '/#/__e2e__/processing/pending' },
  { name: 'processing-failed', url: '/#/__e2e__/processing/failed', waitFor: 'alert' },
  { name: 'scan-review', url: '/#/__e2e__/review', waitFor: 'grid' },
  { name: 'practice-catalog', url: '/#/practice' },
  { name: 'practice-lesson', url: '/#/practice/naked-single/naked-single-1' },
  { name: 'settings', url: '/#/settings' },
  { name: 'training', url: '/#/training/annotate' }
]

async function prepare(page: Page) {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
}

test.beforeEach(({ page: unusedPage }, testInfo) => {
  void unusedPage
  test.skip(testInfo.project.name !== 'mobile-320', 'This suite supplies its own target viewports.')
})

test.describe('Local visual regression', () => {
  test.skip(Boolean(process.env.CI), 'Visual screenshots are a local developer check, not a CI gate.')

  for (const viewport of viewports) {
    for (const screen of screens) {
      test(`${screen.name} is stable at ${viewport.width}px`, async ({ page }) => {
        await prepare(page)
        await page.setViewportSize(viewport)
        await page.goto(screen.url)
        if (screen.waitFor === 'alert') await expect(page.getByRole('alert')).toBeVisible()
        if (screen.waitFor === 'grid') await expect(page.getByRole('grid', { name: 'Sudoku puzzle' })).toBeVisible()
        await expect(page.locator('.app-shell')).toBeVisible()
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width)
        await expect(page).toHaveScreenshot(`${screen.name}-${viewport.width}.png`, { animations: 'disabled', fullPage: true })
      })
    }
  }
})

for (const screen of screens) {
  test(`${screen.name} has no serious accessibility violations`, async ({ page }) => {
    await prepare(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(screen.url)
    if (screen.waitFor === 'alert') await expect(page.getByRole('alert')).toBeVisible()
    if (screen.waitFor === 'grid') await expect(page.getByRole('grid', { name: 'Sudoku puzzle' })).toBeVisible()
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(results.violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')).toEqual([])
  })
}

test('manual entry supports keyboard entry and task-header navigation', async ({ page }) => {
  await prepare(page)
  await page.goto('/#/manual')
  const first = page.getByRole('gridcell', { name: 'Row 1, column 1, empty, editable' })
  await first.focus()
  await first.press('5')
  await expect(page.getByRole('gridcell', { name: 'Row 1, column 1: 5, editable' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Back to home' })).toHaveAttribute('aria-label', 'Back to home')
})

for (const viewport of viewports.slice(0, 2)) {
  test(`scan photo viewer stays bounded and keyboard-operable at ${viewport.width}px`, async ({ page }) => {
    await prepare(page)
    await page.setViewportSize(viewport)
    await page.goto('/#/__e2e__/review')
    const trigger = page.getByRole('button', { name: 'View full image' })
    await trigger.focus()
    await trigger.click()

    const dialog = page.getByRole('dialog', { name: 'Compare with original photo' })
    await expect(dialog).toBeVisible()
    const bounds = await dialog.boundingBox()
    expect(bounds).not.toBeNull()
    expect(bounds!.x).toBeGreaterThanOrEqual(0)
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width)
    expect(bounds!.y).toBeGreaterThanOrEqual(0)
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height)

    await page.getByRole('button', { name: 'Zoom in' }).click()
    await expect(page.getByText('125% zoom. Use the controls, wheel, or pinch to inspect the photo.')).toBeVisible()
    await page.locator('.ui-modal__surface').evaluate((element) => { element.scrollTop = element.scrollHeight })
    await expect(page.getByRole('button', { name: 'Close photo' })).toBeVisible()
    await page.getByRole('button', { name: 'Close photo' }).click()
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
  })
}

for (const viewport of viewports.slice(0, 2)) {
  test(`scan review keeps the action dock and rescan reachable at ${viewport.width}px`, async ({ page }) => {
    await prepare(page)
    await page.setViewportSize(viewport)
    await page.goto('/#/__e2e__/review')
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))

    await expect(page.getByRole('button', { name: 'Confirm value' })).toBeVisible()
    const rescan = page.getByRole('button', { name: 'Rescan puzzle' })
    await expect(rescan).toBeVisible()
    await rescan.click()
    await expect(page).toHaveURL(/#\/camera$/)
  })
}

test('destructive confirmation is an alert dialog and restores focus', async ({ page }) => {
  await prepare(page)
  await page.goto('/#/settings')
  const trigger = page.getByRole('button', { name: 'Clear saved puzzles' })
  await trigger.focus()
  await trigger.click()
  const dialog = page.getByRole('alertdialog', { name: 'Clear saved puzzles?' })
  await expect(dialog).toBeVisible()
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})
