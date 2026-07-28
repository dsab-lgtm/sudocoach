import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HomeActionCard } from '../components/HomeActionCard'
import { ResumePuzzleCard } from '../components/ResumePuzzleCard'
import { StatusBadge } from '../components/StatusBadge'
import { mostRecentPuzzle, type PuzzleRecord } from '../storage/database'
import { usePuzzleStore } from '../store/puzzleStore'

export function HomeScreen() {
  const navigate = useNavigate()
  const [savedPuzzle, setSavedPuzzle] = useState<PuzzleRecord | null>(null)
  const restore = usePuzzleStore((state) => state.restore)

  useEffect(() => {
    let current = true
    mostRecentPuzzle().then((record) => { if (current) setSavedPuzzle(record ?? null) }).catch(() => { if (current) setSavedPuzzle(null) })
    return () => { current = false }
  }, [])

  const resumePuzzle = () => {
    if (!savedPuzzle) return
    restore(savedPuzzle)
    navigate('/solve')
  }

  return <section className="home-screen" aria-labelledby="home-title">
    <header className="home-hero">
      <p className="eyebrow">SudoCoach</p>
      <h1 id="home-title">A clearer way to solve Sudoku.</h1>
      <p>SudoCoach helps you solve, understand, and improve at Sudoku.</p>
      <StatusBadge tone="accent">Offline-ready</StatusBadge>
    </header>
    {savedPuzzle && <ResumePuzzleCard record={savedPuzzle} onResume={resumePuzzle}/>}
    <section className="home-start" aria-labelledby="home-start-title">
      <div><p className="eyebrow">Start a puzzle</p><h2 id="home-start-title">Choose your setup</h2></div>
      <div className="home-start__actions">
        <HomeActionCard kind="scan" title="Scan puzzle" description="Capture a printed Sudoku and review the clues." to="/camera"/>
        <HomeActionCard kind="manual" title="Enter manually" description="Add the given clues yourself." to="/manual"/>
      </div>
    </section>
  </section>
}
