import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { ProcessingStatus } from '../components/ProcessingStatus'
import { ScanRecoveryActions } from '../components/ScanRecoveryActions'
import { Surface } from '../components/Surface'
import { scanFile } from '../scanner/client'
import { scannerSession } from '../scanner/session'

const recoveryMessage = 'We could not read this puzzle image. Try another clear photo, or enter the clues manually.'

export function ProcessingScreen() {
  const navigate = useNavigate()
  const failureRef = useRef<HTMLDivElement>(null)
  const [attempt, setAttempt] = useState(0)
  const [failed, setFailed] = useState(false)
  const file = scannerSession.getFile()

  useEffect(() => {
    if (!file) {
      navigate('/camera', { replace: true })
      return
    }

    let active = true
    const controller = new AbortController()
    scannerSession.clearError()
    setFailed(false)

    scanFile(file, controller.signal).then((result) => {
      if (!active || controller.signal.aborted) return
      scannerSession.setResult(result)
      scannerSession.clearError()
      navigate('/review', { replace: true })
    }).catch((error: unknown) => {
      if (!active || controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) return
      scannerSession.setError(error instanceof Error && error.message ? error.message : 'Could not process this photo.')
      setFailed(true)
    })

    return () => {
      active = false
      controller.abort()
    }
  }, [attempt, file, navigate])

  useEffect(() => { if (failed) failureRef.current?.focus() }, [failed])

  if (!file) return null

  const enterManually = () => {
    scannerSession.clear()
    navigate('/manual')
  }

  return <section className="processing" aria-labelledby="processing-title">
    {failed
      ? <div ref={failureRef} role="alert" tabIndex={-1}><Surface className="processing-failure" elevation="raised"><p className="eyebrow">Scan needs another look</p><h1 id="processing-title">We could not read this image</h1><p>{recoveryMessage}</p><ScanRecoveryActions onRetry={() => setAttempt((value) => value + 1)} onChooseAnother={() => navigate('/camera')} onEnterManually={enterManually}/></Surface></div>
      : <><ProcessingStatus fileName={file.name} previewUrl={scannerSession.preview()}/><Button variant="ghost" className="processing-cancel" onClick={() => navigate('/camera')}>Cancel and return to camera</Button></>}
  </section>
}
