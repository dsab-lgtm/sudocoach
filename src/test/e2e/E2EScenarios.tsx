import { useEffect, useRef, useState, type ReactNode } from 'react'
import { gridFromString } from '../../engine/board'
import { ProcessingScreen } from '../../screens/ProcessingScreen'
import { ScanReviewScreen } from '../../screens/ScanReviewScreen'
import { SolverScreen } from '../../screens/SolverScreen'
import { scannerSession } from '../../scanner/session'
import { usePuzzleStore } from '../../store/puzzleStore'
import { portraitScanReviewFixture } from '../fixtures/scanReview'

const e2ePhoto = new File([`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
  <rect width="900" height="1200" fill="#f7f4ed"/>
  <rect x="110" y="230" width="680" height="680" fill="none" stroke="#0d1b2a" stroke-width="18"/>
  <path d="M337 230v680M563 230v680M110 457h680M110 683h680" stroke="#0d1b2a" stroke-width="12"/>
  <path d="M185 230v680M261 230v680M412 230v680M488 230v680M639 230v680M715 230v680M110 306h680M110 382h680M110 533h680M110 609h680M110 759h680M110 835h680" stroke="#52657a" stroke-width="4"/>
  <text x="450" y="110" text-anchor="middle" font-family="system-ui" font-size="42" fill="#0d1b2a">Synthetic scan fixture</text>
</svg>`], 'e2e-sudoku.svg', { type: 'image/svg+xml' })
const pendingScan = () => new Promise<never>(() => undefined)
const failedScan = () => Promise.reject(new Error('Synthetic scanner failure'))

function AfterSeed({ children, seed }: { children: ReactNode; seed: () => void }) {
  const [ready, setReady] = useState(false)
  const seedRef = useRef(seed)
  useEffect(() => {
    scannerSession.clear()
    seedRef.current()
    setReady(true)
    return () => scannerSession.clear()
  }, [])
  return ready ? <>{children}</> : null
}

export function E2EPendingProcessingScenario() {
  return <AfterSeed seed={() => scannerSession.setFile(e2ePhoto)}><ProcessingScreen scan={pendingScan}/></AfterSeed>
}

export function E2EFailedProcessingScenario() {
  return <AfterSeed seed={() => scannerSession.setFile(e2ePhoto)}><ProcessingScreen scan={failedScan}/></AfterSeed>
}

export function E2EScanReviewScenario() {
  return <AfterSeed seed={() => { scannerSession.setFile(e2ePhoto); scannerSession.setResult(portraitScanReviewFixture) }}><ScanReviewScreen/></AfterSeed>
}

export function E2ESolverScenario() {
  return <AfterSeed seed={() => usePuzzleStore.getState().setPuzzle(gridFromString(`
.34678912
672195348
198342567
859761423
426853791
713924856
961537284
287419635
345286179
`))}><SolverScreen/></AfterSeed>
}
