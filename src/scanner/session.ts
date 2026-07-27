import type { ScanResult } from './types'

let pendingFile: File | null = null
let pendingResult: ScanResult | null = null
let previewUrl: string | null = null
let pendingError: string | null = null

export const scannerSession = {
  setFile(file: File) { pendingFile = file; pendingResult = null; pendingError = null; if (previewUrl) URL.revokeObjectURL(previewUrl); previewUrl = URL.createObjectURL(file) },
  getFile: () => pendingFile,
  setResult(result: ScanResult) { pendingResult = result },
  getResult: () => pendingResult,
  preview: () => previewUrl,
  setError(error: string) { pendingError = error },
  getError: () => pendingError,
  clearError() { pendingError = null },
  clear() { pendingFile = null; pendingResult = null; pendingError = null; if (previewUrl) URL.revokeObjectURL(previewUrl); previewUrl = null }
}
