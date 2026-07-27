/// <reference lib="webworker" />
import { scanGrayImage } from './imagePipeline'
import type { ScannerMessage, ScannerResponse } from './types'

const cancelled = new Set<string>()
self.onmessage = async (event: MessageEvent<ScannerMessage>) => {
  const message = event.data
  if (message.type === 'cancel') { cancelled.add(message.id); return }
  try {
    const result = await scanGrayImage({ width: message.image.width, height: message.image.height, pixels: new Uint8ClampedArray(message.image.pixels) })
    if (cancelled.delete(message.id)) return
    const response: ScannerResponse = { id: message.id, type: 'result', result }
    self.postMessage(response)
  } catch (error) {
    const response: ScannerResponse = { id: message.id, type: 'error', error: error instanceof Error ? error.message : 'Could not process image.' }
    self.postMessage(response)
  }
}
