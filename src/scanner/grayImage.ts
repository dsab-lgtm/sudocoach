export type GrayImage = { pixels: Uint8ClampedArray; width: number; height: number }

export const grayImageFromRgba = (source: Uint8ClampedArray, width: number, height: number): GrayImage => {
  const pixels = new Uint8ClampedArray(width * height)
  for (let index = 0; index < pixels.length; index += 1) {
    const offset = index * 4
    pixels[index] = Math.round(source[offset] * 0.299 + source[offset + 1] * 0.587 + source[offset + 2] * 0.114)
  }
  return { pixels, width, height }
}
