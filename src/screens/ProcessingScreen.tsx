import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { scanFile } from '../scanner/client'
import { scannerSession } from '../scanner/session'

export function ProcessingScreen() {
  const navigate = useNavigate()
  const [message, setMessage] = useState('Finding the puzzle grid…')
  useEffect(() => {
    const controller = new AbortController()
    const file = scannerSession.getFile()
    if (!file) { navigate('/camera', { replace: true }); return }
    const timer = window.setTimeout(() => setMessage('Reading printed digits…'), 600)
    scanFile(file, controller.signal).then((result) => { scannerSession.setResult(result); scannerSession.clearError(); navigate('/review', { replace: true }) }).catch((error: Error) => { if (error.name !== 'AbortError') { scannerSession.setError(error.message || 'Could not process this photo.'); navigate('/camera', { replace: true }) } })
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [navigate])
  return <section className="processing"><div className="loader" aria-hidden="true"/><p className="eyebrow">Processing locally</p><h1>{message}</h1><p>Your image never leaves this device.</p><button type="button" className="text-button" onClick={() => navigate('/camera')}>Cancel</button></section>
}
