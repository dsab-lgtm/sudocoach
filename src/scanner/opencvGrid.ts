/* OpenCV publishes a generated dynamic runtime surface rather than usable TS method types. */
/* eslint-disable @typescript-eslint/no-explicit-any */
type GrayImage = { pixels: Uint8ClampedArray; width: number; height: number }
export type SourceCorner = { x: number; y: number }
type Point = SourceCorner
export type RectifiedGrid = GrayImage & { sourceCorners: [SourceCorner, SourceCorner, SourceCorner, SourceCorner] }

export const RECTIFIED_BOARD_SIZE = 900

/** Returns top-left, top-right, bottom-right, bottom-left. */
export const orderCorners = (points: Point[]): [Point, Point, Point, Point] => {
  const bySum = [...points].sort((a, b) => a.x + a.y - (b.x + b.y))
  // y - x is smallest at top-right and largest at bottom-left. The previous
  // x - y ordering transposed every successfully rectified board.
  const byDifference = [...points].sort((a, b) => a.y - a.x - (b.y - b.x))
  return [bySum[0], byDifference[0], bySum[3], byDifference[3]]
}

const lineScore = (binary: Uint8Array, size: number) => {
  const projection = (vertical: boolean) => Array.from({ length: size }, (_, primary) => {
    let total = 0
    for (let secondary = 0; secondary < size; secondary += 1) total += binary[vertical ? secondary * size + primary : primary * size + secondary]
    return total / size
  })
  const peaks = (values: number[]) => Array.from({ length: 10 }, (_, line) => {
    const target = Math.round(line * (size - 1) / 9)
    let peak = 0
    for (let index = Math.max(0, target - 14); index <= Math.min(size - 1, target + 14); index += 1) peak = Math.max(peak, values[index])
    return peak
  }).reduce((total, value) => total + value, 0)
  return peaks(projection(true)) + peaks(projection(false))
}

const candidateScore = (cv: any, gray: any, corners: Point[], sourceArea: number) => {
  const ordered = orderCorners(corners)
  const from = cv.matFromArray(4, 1, cv.CV_32FC2, ordered.flatMap((point) => [point.x, point.y]))
  const to = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, RECTIFIED_BOARD_SIZE - 1, 0, RECTIFIED_BOARD_SIZE - 1, RECTIFIED_BOARD_SIZE - 1, 0, RECTIFIED_BOARD_SIZE - 1])
  const matrix = cv.getPerspectiveTransform(from, to); const warped = new cv.Mat(); const binary = new cv.Mat()
  try {
    cv.warpPerspective(gray, warped, matrix, new cv.Size(RECTIFIED_BOARD_SIZE, RECTIFIED_BOARD_SIZE), cv.INTER_LINEAR, cv.BORDER_REPLICATE)
    cv.adaptiveThreshold(warped, binary, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 31, 7)
    const score = lineScore(binary.data as Uint8Array, RECTIFIED_BOARD_SIZE)
    const pixels = new Uint8ClampedArray(warped.data)
    const area = Math.abs((corners[0].x * (corners[1].y - corners[3].y) + corners[1].x * (corners[2].y - corners[0].y) + corners[2].x * (corners[3].y - corners[1].y) + corners[3].x * (corners[0].y - corners[2].y)) / 2)
    return { score: score + 75 * area / sourceArea, pixels, sourceCorners: ordered }
  } finally {
    from.delete(); to.delete(); matrix.delete(); warped.delete(); binary.delete()
  }
}

/**
 * Finds several plausible board contours and selects the warp whose projections
 * contain all ten horizontal and vertical Sudoku lines.
 */
export const rectifyWithOpenCv = async (source: GrayImage): Promise<RectifiedGrid | null> => {
  try {
    const module = await import('@techstark/opencv-js')
    const loaded = ((module as { default?: unknown }).default ?? module) as { Mat?: unknown; onRuntimeInitialized?: () => void } | Promise<unknown>
    const cv = (loaded instanceof Promise ? await loaded : loaded.Mat ? loaded : await Promise.race([
      new Promise((resolve) => { loaded.onRuntimeInitialized = () => resolve(loaded) }),
      new Promise((resolve) => setTimeout(() => resolve(null), 5_000))
    ])) as any
    if (!cv?.Mat) return null
    const rgba = new Uint8ClampedArray(source.width * source.height * 4)
    for (let index = 0; index < source.pixels.length; index += 1) {
      const pixel = source.pixels[index]; const offset = index * 4
      rgba[offset] = pixel; rgba[offset + 1] = pixel; rgba[offset + 2] = pixel; rgba[offset + 3] = 255
    }
    const original = cv.matFromImageData(new ImageData(rgba, source.width, source.height))
    const gray = new cv.Mat(); const blurred = new cv.Mat(); const thresholded = new cv.Mat(); const contours = new cv.MatVector(); const hierarchy = new cv.Mat()
    try {
      cv.cvtColor(original, gray, cv.COLOR_RGBA2GRAY)
      cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0)
      cv.adaptiveThreshold(blurred, thresholded, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 31, 7)
      cv.findContours(thresholded, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE)
      const minimumArea = source.width * source.height * 0.035
      const candidates: Array<{ points: Point[]; area: number }> = []
      for (let index = 0; index < contours.size(); index += 1) {
        const contour = contours.get(index); const area = cv.contourArea(contour)
        if (area >= minimumArea) {
          const approximation = new cv.Mat()
          try {
            cv.approxPolyDP(contour, approximation, cv.arcLength(contour, true) * 0.02, true)
            if (approximation.rows === 4 && cv.isContourConvex(approximation)) {
              const data = approximation.data32S as Int32Array
              candidates.push({ points: Array.from({ length: 4 }, (_, point) => ({ x: data[point * 2], y: data[point * 2 + 1] })), area })
            }
          } finally { approximation.delete() }
        }
        contour.delete()
      }
      let best: { score: number; pixels: Uint8ClampedArray; sourceCorners: [SourceCorner, SourceCorner, SourceCorner, SourceCorner] } | null = null
      for (const candidate of candidates.sort((left, right) => right.area - left.area).slice(0, 30)) {
        const result = candidateScore(cv, gray, candidate.points, source.width * source.height)
        if (!best || result.score > best.score) best = result
      }
      // A valid ten-line grid scores well above a plain quadrilateral. Refuse
      // page edges, windows, and other square objects instead of guessing.
      return best && best.score >= 180 ? { pixels: best.pixels, width: RECTIFIED_BOARD_SIZE, height: RECTIFIED_BOARD_SIZE, sourceCorners: best.sourceCorners } : null
    } finally {
      original.delete(); gray.delete(); blurred.delete(); thresholded.delete(); contours.delete(); hierarchy.delete()
    }
  } catch { return null }
}
