import { grayImageFromRgba, type GrayImage } from './grayImage'
import type { ScanResult, ScannerResponse } from './types'
import { createId } from '../utils/createId'

const MAX_EDGE = 1400

const decodeError = (file: File) => new Error(
  /heic|heif/i.test(file.type) || /\.hei[cf]$/i.test(file.name)
    ? 'This iPhone photo could not be decoded locally. Choose a JPEG or set Camera > Formats to Most Compatible.'
    : 'This image could not be decoded. Choose another JPEG or PNG photo.'
)

const canvasFor = (width: number, height: number) => {
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.floor(width * scale))
  canvas.height = Math.max(1, Math.floor(height * scale))
  return canvas
}

const imageElementFor = (file: File): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file)
  const image = new Image()
  image.onload = () => { URL.revokeObjectURL(url); resolve(image) }
  image.onerror = () => { URL.revokeObjectURL(url); reject(decodeError(file)) }
  image.src = url
})

const decodeToGray = async (file: File): Promise<GrayImage> => {
  let source: CanvasImageSource
  let width: number
  let height: number
  let bitmap: ImageBitmap | undefined
  try {
    bitmap = await createImageBitmap(file)
    source = bitmap; width = bitmap.width; height = bitmap.height
  } catch {
    const image = await imageElementFor(file)
    source = image; width = image.naturalWidth; height = image.naturalHeight
  }
  const canvas = canvasFor(width, height)
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Your browser could not create an image canvas.')
  context.drawImage(source, 0, 0, canvas.width, canvas.height)
  bitmap?.close()
  return grayImageFromRgba(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height)
}

const scanInWorker = (image: GrayImage, signal?: AbortSignal): Promise<ScanResult> => {
  const worker = new Worker(new URL('./scanner.worker.ts', import.meta.url), { type: 'module' })
  const id = createId()
  const workerPixels = image.pixels.slice()
  return new Promise((resolve, reject) => {
    const cancel = () => { worker.postMessage({ id, type: 'cancel' }); worker.terminate(); reject(new DOMException('Scan cancelled', 'AbortError')) }
    signal?.addEventListener('abort', cancel, { once: true })
    worker.onerror = () => { worker.terminate(); signal?.removeEventListener('abort', cancel); reject(new Error('Scanner worker is unavailable.')) }
    worker.onmessage = ({ data }: MessageEvent<ScannerResponse>) => {
      worker.terminate()
      signal?.removeEventListener('abort', cancel)
      if (data.type === 'error') reject(new Error(data.error)); else resolve(data.result)
    }
    worker.postMessage({ id, type: 'scan', image: { width: image.width, height: image.height, pixels: workerPixels.buffer } }, [workerPixels.buffer])
  })
}

/** Decodes on the page for Safari compatibility, then prefers a worker when available. */
export const scanFile = async (file: File, signal?: AbortSignal): Promise<ScanResult> => {
  if (!file.type.startsWith('image/') && !/\.(jpe?g|png|heic|heif)$/i.test(file.name)) throw new Error('Choose an image file to scan.')
  const image = await decodeToGray(file)
  if (signal?.aborted) throw new DOMException('Scan cancelled', 'AbortError')
  if (typeof Worker !== 'undefined') {
    try { return await scanInWorker(image, signal) } catch (error) { if ((error as Error).name === 'AbortError') throw error }
  }
  if (signal?.aborted) throw new DOMException('Scan cancelled', 'AbortError')
  const { scanGrayImageOnMainThread } = await import('./mainFallback')
  return scanGrayImageOnMainThread(image)
}
