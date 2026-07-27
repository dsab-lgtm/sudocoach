import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { mostRecentPuzzle } from '../storage/database'
import { usePuzzleStore } from '../store/puzzleStore'

export function HomeScreen() {
  const [hasSaved, setHasSaved] = useState(false)
  const restore = usePuzzleStore((state) => state.restore)
  useEffect(() => { mostRecentPuzzle().then((record) => setHasSaved(Boolean(record))).catch(() => setHasSaved(false)) }, [])
  const continuePuzzle = async () => { const record = await mostRecentPuzzle(); if (record) restore(record) }
  return <section className="hero"><p className="eyebrow">Private · offline · on-device</p><h1>Turn a printed puzzle into your next move.</h1><p className="lede">Scan a Sudoku, review anything uncertain, then solve at your own pace.</p><div className="hero-actions"><Link className="primary-action" to="/camera">Scan puzzle</Link><Link className="secondary-action" to="/manual">Enter manually</Link>{hasSaved && <Link className="text-button" to="/solve" onClick={continuePuzzle}>Continue saved puzzle</Link>}</div><section className="privacy-note"><strong>Your photos stay on this device.</strong><span>We discard the source image after you confirm the puzzle.</span></section></section>
}
