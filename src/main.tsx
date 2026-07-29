import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import { AppShell } from './components/AppShell'
import { CandidateAssistantProvider } from './components/CandidateAssistantProvider'
import { FeedbackProvider } from './components/FeedbackProvider'
import { ThemePreferenceProvider } from './components/ThemePreferenceProvider'
import { CameraScreen } from './screens/CameraScreen'
import { HomeScreen } from './screens/HomeScreen'
import { ManualEntryScreen } from './screens/ManualEntryScreen'
import { ProcessingScreen } from './screens/ProcessingScreen'
import { PracticeCatalogScreen } from './screens/PracticeCatalogScreen'
import { PracticeSessionScreen } from './screens/PracticeSessionScreen'
import { ScanReviewScreen } from './screens/ScanReviewScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { SolverScreen } from './screens/SolverScreen'
import { TrainingAnnotationScreen } from './screens/TrainingAnnotationScreen'
import { E2EFailedProcessingScenario, E2EPendingProcessingScenario, E2EScanReviewScenario, E2ESolverScenario } from './test/e2e/E2EScenarios'
import './styles/tokens.css'
import './styles.css'

const updateReadyEvent = 'sudocoach:update-ready'
const updateServiceWorker = registerSW({ onNeedRefresh() { window.dispatchEvent(new Event(updateReadyEvent)) } })
window.addEventListener(updateReadyEvent, () => {
  if (window.confirm('A new version of SudoCoach is ready. Update now?')) updateServiceWorker(true)
})

createRoot(document.getElementById('root')!).render(<StrictMode><ThemePreferenceProvider><CandidateAssistantProvider><FeedbackProvider><HashRouter><AppShell><Routes><Route path="/" element={<HomeScreen/>}/><Route path="/camera" element={<CameraScreen/>}/><Route path="/processing" element={<ProcessingScreen/>}/><Route path="/review" element={<ScanReviewScreen/>}/><Route path="/manual" element={<ManualEntryScreen/>}/><Route path="/solve" element={<SolverScreen/>}/><Route path="/practice" element={<PracticeCatalogScreen/>}/><Route path="/practice/:technique/:exerciseId" element={<PracticeSessionScreen/>}/><Route path="/settings" element={<SettingsScreen/>}/>{import.meta.env.DEV && <><Route path="/training/annotate" element={<TrainingAnnotationScreen/>}/><Route path="/__e2e__/processing/pending" element={<E2EPendingProcessingScenario/>}/><Route path="/__e2e__/processing/failed" element={<E2EFailedProcessingScenario/>}/><Route path="/__e2e__/review" element={<E2EScanReviewScenario/>}/><Route path="/__e2e__/solver" element={<E2ESolverScenario/>}/></>}</Routes></AppShell></HashRouter></FeedbackProvider></CandidateAssistantProvider></ThemePreferenceProvider></StrictMode>)
