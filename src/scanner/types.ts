import type { CellPosition, Digit, Grid } from '../engine/types'

export type ScanErrorCode = 'grid-not-found' | 'low-quality-image' | 'unsupported-image' | 'cancelled' | 'model-unavailable' | 'model-experimental'
export type ScanCell = CellPosition & { value: Digit | null; confidence: number; inkRatio: number }
export type ScanDiagnostic = { code: ScanErrorCode; message: string; recoverable: boolean }
export type ScanResult = {
  grid: Grid
  cells: ScanCell[]
  image: { width: number; height: number; bounds: { x: number; y: number; size: number } }
  diagnostics: ScanDiagnostic[]
  modelStatus?: 'production' | 'experimental'
}

export type ScannerRequest = { id: string; type: 'scan'; image: { width: number; height: number; pixels: ArrayBuffer } }
export type ScannerCancel = { id: string; type: 'cancel' }
export type ScannerMessage = ScannerRequest | ScannerCancel
export type ScannerResponse = { id: string; type: 'result'; result: ScanResult } | { id: string; type: 'error'; error: string }
