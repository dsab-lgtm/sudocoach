import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import { AppShell } from './components/AppShell'
import { ThemePreferenceProvider } from './components/ThemePreferenceProvider'
import { CameraScreen } from './screens/CameraScreen'
import { HomeScreen } from './screens/HomeScreen'
import { ManualEntryScreen } from './screens/ManualEntryScreen'
import { ProcessingScreen } from './screens/ProcessingScreen'
import { ScanReviewScreen } from './screens/ScanReviewScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { SolverScreen } from './screens/SolverScreen'
import { TrainingAnnotationScreen } from './screens/TrainingAnnotationScreen'
import './styles/tokens.css'
import './styles.css'

const updateReadyEvent = 'sudocoach:update-ready'
const updateServiceWorker = registerSW({ onNeedRefresh() { window.dispatchEvent(new Event(updateReadyEvent)) } })
window.addEventListener(updateReadyEvent, () => {
  if (window.confirm('A new version of SudoCoach is ready. Update now?')) updateServiceWorker(true)
})

createRoot(document.getElementById('root')!).render(<StrictMode><ThemePreferenceProvider><HashRouter><AppShell><Routes><Route path="/" element={<HomeScreen/>}/><Route path="/camera" element={<CameraScreen/>}/><Route path="/processing" element={<ProcessingScreen/>}/><Route path="/review" element={<ScanReviewScreen/>}/><Route path="/manual" element={<ManualEntryScreen/>}/><Route path="/solve" element={<SolverScreen/>}/><Route path="/settings" element={<SettingsScreen/>}/>{import.meta.env.DEV && <Route path="/training/annotate" element={<TrainingAnnotationScreen/>}/>}</Routes></AppShell></HashRouter></ThemePreferenceProvider></StrictMode>)
