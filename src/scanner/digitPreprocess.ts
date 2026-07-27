/**
 * Version-two cell cleanup. It deliberately works on the original grayscale
 * cell rather than a page-wide threshold: camera shadows vary within a board.
 */
export type DigitPreprocessResult = { input: Float32Array; hasInk: boolean; inkRatio: number }

const OUTPUT_SIZE = 28
const CONTENT_SIZE = 20

const localInkMask = (pixels: number[][]) => {
  const height = pixels.length
  const width = pixels[0]?.length ?? 0
  const mask = Array.from({ length: height }, () => Array<boolean>(width).fill(false))
  const radius = Math.max(3, Math.floor(Math.min(width, height) / 7))
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    let total = 0; let count = 0
    for (let yy = Math.max(0, y - radius); yy <= Math.min(height - 1, y + radius); yy += 1) for (let xx = Math.max(0, x - radius); xx <= Math.min(width - 1, x + radius); xx += 1) {
      total += pixels[yy][xx]; count += 1
    }
    // Sauvola-like local thresholding, with a floor that avoids treating a
    // lightly shaded blank cell as ink.
    const threshold = Math.min(205, Math.max(70, total / Math.max(count, 1) - 18))
    mask[y][x] = pixels[y][x] < threshold
  }
  return mask
}

type Component = { points: Array<[number, number]>; minX: number; maxX: number; minY: number; maxY: number; touchesBorder: boolean }

const components = (mask: boolean[][]): Component[] => {
  const height = mask.length; const width = mask[0]?.length ?? 0
  const visited = Array.from({ length: height }, () => Array<boolean>(width).fill(false))
  const found: Component[] = []
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    if (!mask[y][x] || visited[y][x]) continue
    const queue: Array<[number, number]> = [[x, y]]; visited[y][x] = true
    const component: Component = { points: [], minX: x, maxX: x, minY: y, maxY: y, touchesBorder: false }
    while (queue.length) {
      const [pointX, pointY] = queue.pop()!
      component.points.push([pointX, pointY])
      component.minX = Math.min(component.minX, pointX); component.maxX = Math.max(component.maxX, pointX)
      component.minY = Math.min(component.minY, pointY); component.maxY = Math.max(component.maxY, pointY)
      component.touchesBorder ||= pointX === 0 || pointY === 0 || pointX === width - 1 || pointY === height - 1
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
        const nextX = pointX + offsetX; const nextY = pointY + offsetY
        if (!offsetX && !offsetY || nextX < 0 || nextY < 0 || nextX >= width || nextY >= height || visited[nextY][nextX] || !mask[nextY][nextX]) continue
        visited[nextY][nextX] = true; queue.push([nextX, nextY])
      }
    }
    found.push(component)
  }
  return found
}

const selectedComponent = (mask: boolean[][]) => {
  const height = mask.length; const width = mask[0]?.length ?? 0
  const minimumArea = Math.max(6, Math.round(width * height * 0.004))
  const centreX = (width - 1) / 2; const centreY = (height - 1) / 2
  // Perspective warp and imperfect line spacing can put a legitimate digit
  // close to a cell edge. Reject only edge-connected components that span an
  // entire cell dimension—the remaining grid lines—not every edge touch.
  const candidates = components(mask).filter((component) => component.points.length >= minimumArea
    && !(component.touchesBorder && (component.maxX - component.minX + 1 >= width * 0.9 || component.maxY - component.minY + 1 >= height * 0.9)))
  return candidates.sort((left, right) => {
    const score = (component: Component) => {
      const x = (component.minX + component.maxX) / 2; const y = (component.minY + component.maxY) / 2
      const distance = Math.hypot((x - centreX) / Math.max(width, 1), (y - centreY) / Math.max(height, 1))
      return component.points.length * (1 - Math.min(0.7, distance))
    }
    return score(right) - score(left)
  })[0]
}

const bilinear = (source: number[][], x: number, y: number) => {
  const x0 = Math.max(0, Math.min(source[0].length - 1, Math.floor(x))); const x1 = Math.max(0, Math.min(source[0].length - 1, x0 + 1))
  const y0 = Math.max(0, Math.min(source.length - 1, Math.floor(y))); const y1 = Math.max(0, Math.min(source.length - 1, y0 + 1))
  const dx = x - x0; const dy = y - y0
  return source[y0][x0] * (1 - dx) * (1 - dy) + source[y0][x1] * dx * (1 - dy) + source[y1][x0] * (1 - dx) * dy + source[y1][x1] * dx * dy
}

/** Produces a centred 28×28 inverted digit tensor and an independently useful blank decision. */
export const preprocessDigit = (pixels: number[][]): DigitPreprocessResult => {
  const input = new Float32Array(OUTPUT_SIZE * OUTPUT_SIZE)
  const height = pixels.length; const width = pixels[0]?.length ?? 0
  if (!height || !width) return { input, hasInk: false, inkRatio: 0 }
  const component = selectedComponent(localInkMask(pixels))
  if (!component) return { input, hasInk: false, inkRatio: 0 }
  const padding = 1
  const left = Math.max(0, component.minX - padding); const right = Math.min(width - 1, component.maxX + padding)
  const top = Math.max(0, component.minY - padding); const bottom = Math.min(height - 1, component.maxY + padding)
  const crop = pixels.slice(top, bottom + 1).map((row) => row.slice(left, right + 1))
  const cropHeight = crop.length; const cropWidth = crop[0].length
  const scale = Math.min(CONTENT_SIZE / cropWidth, CONTENT_SIZE / cropHeight)
  const renderedWidth = Math.max(1, Math.round(cropWidth * scale)); const renderedHeight = Math.max(1, Math.round(cropHeight * scale))
  const offsetX = Math.floor((OUTPUT_SIZE - renderedWidth) / 2); const offsetY = Math.floor((OUTPUT_SIZE - renderedHeight) / 2)
  for (let y = 0; y < renderedHeight; y += 1) for (let x = 0; x < renderedWidth; x += 1) {
    const sourceX = ((x + 0.5) / renderedWidth) * cropWidth - 0.5; const sourceY = ((y + 0.5) / renderedHeight) * cropHeight - 0.5
    input[(offsetY + y) * OUTPUT_SIZE + offsetX + x] = Math.max(0, Math.min(1, 1 - bilinear(crop, sourceX, sourceY) / 255))
  }
  return { input, hasInk: true, inkRatio: component.points.length / (width * height) }
}
