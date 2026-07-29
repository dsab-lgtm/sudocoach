import { expect, test, type Locator } from '@playwright/test'

type BoardMetrics = {
  board: { width: number, height: number, scrollWidth: number, scrollHeight: number }
  cells: Array<{ width: number, height: number }>
}

async function measureBoard(board: Locator): Promise<BoardMetrics> {
  return board.evaluate((element) => {
    const boardRect = element.getBoundingClientRect()
    const cells = Array.from(element.querySelectorAll<HTMLElement>('.board-cell'))

    return {
      board: {
        width: boardRect.width,
        height: boardRect.height,
        scrollWidth: element.scrollWidth,
        scrollHeight: element.scrollHeight
      },
      cells: cells.map((cell) => {
        const rect = cell.getBoundingClientRect()
        return { width: rect.width, height: rect.height }
      })
    }
  })
}

function expectUniformCells(metrics: BoardMetrics) {
  const widths = metrics.cells.map((cell) => cell.width)
  const heights = metrics.cells.map((cell) => cell.height)

  expect(metrics.cells).toHaveLength(81)
  expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(0.5)
  expect(Math.max(...heights) - Math.min(...heights)).toBeLessThan(0.5)
  expect(metrics.board.scrollWidth).toBeLessThanOrEqual(Math.ceil(metrics.board.width))
  expect(metrics.board.scrollHeight).toBeLessThanOrEqual(Math.ceil(metrics.board.height))
}

test('keeps every Sudoku cell the same size after entering a clue', async ({ page }, testInfo) => {
  await page.goto('/#/manual')

  const board = page.getByRole('grid', { name: 'Sudoku puzzle' })
  await expect(board).toBeVisible()

  const before = await measureBoard(board)
  await board.screenshot({ path: testInfo.outputPath('board-before-entry.png') })

  await page.getByRole('button', { name: '5', exact: true }).click()
  await expect(page.getByRole('gridcell', { name: 'Row 1, column 1: 5, editable' })).toBeVisible()

  const after = await measureBoard(board)
  await board.screenshot({ path: testInfo.outputPath('board-after-entry.png') })

  expect(before.board.width).toBeCloseTo(before.board.height, 1)
  expect(after.board.width).toBeCloseTo(before.board.width, 1)
  expect(after.board.height).toBeCloseTo(before.board.height, 1)
  expectUniformCells(before)
  expectUniformCells(after)
})

test('keeps the Solver header inside the safe workspace without page scrolling', async ({ page }, testInfo) => {
  await page.goto('/#/solve')

  const header = page.locator('.solver-workspace .workspace-header')
  const board = page.getByRole('grid', { name: 'Sudoku puzzle' })
  const dock = page.locator('.solver-workspace .workspace-dock')

  await expect(header).toBeVisible()
  await expect(board).toBeVisible()
  await expect(dock).toBeVisible()

  const before = await page.evaluate(() => {
    const shell = document.querySelector<HTMLElement>('.app-shell')
    const workspace = document.querySelector<HTMLElement>('.solver-workspace')
    const header = document.querySelector<HTMLElement>('.solver-workspace .workspace-header')
    const scrollRoot = document.scrollingElement
    if (!shell || !workspace || !header || !scrollRoot) throw new Error('Solver workspace is unavailable.')

    const shellRect = shell.getBoundingClientRect()
    const headerRect = header.getBoundingClientRect()
    const shellStyle = window.getComputedStyle(shell)
    return {
      documentHeight: scrollRoot.scrollHeight,
      viewportHeight: window.innerHeight,
      headerTop: headerRect.top,
      safeContentTop: shellRect.top + Number.parseFloat(shellStyle.paddingTop),
      shellMinHeight: shellStyle.minHeight,
      workspaceHeight: workspace.getBoundingClientRect().height,
      shellContentHeight: shell.clientHeight - Number.parseFloat(shellStyle.paddingTop) - Number.parseFloat(shellStyle.paddingBottom)
    }
  })

  await page.evaluate(() => window.scrollTo({ top: 1000, behavior: 'instant' }))
  const after = await page.evaluate(() => ({ scrollY: window.scrollY, headerTop: document.querySelector<HTMLElement>('.solver-workspace .workspace-header')?.getBoundingClientRect().top }))

  await page.screenshot({ path: testInfo.outputPath('solver-safe-header.png'), fullPage: false })

  expect(before.documentHeight).toBeLessThanOrEqual(before.viewportHeight)
  expect(before.shellMinHeight).toBe('0px')
  expect(before.workspaceHeight).toBeCloseTo(before.shellContentHeight, 1)
  expect(before.headerTop).toBeGreaterThanOrEqual(before.safeContentTop - 0.5)
  expect(after.scrollY).toBe(0)
  expect(after.headerTop).toBeCloseTo(before.headerTop, 1)
})
