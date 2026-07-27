import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { scannerSession } from '../scanner/session'

const cameraError = (error: unknown) => {
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError') return 'Camera permission was denied. Allow it in Safari settings, or choose a photo instead.'
  if (name === 'NotFoundError') return 'No camera is available on this device. Choose a photo instead.'
  return 'The camera could not start. Choose a photo instead.'
}

export function CameraScreen() {
  const video = useRef<HTMLVideoElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(() => scannerSession.getError())
  const [ready, setReady] = useState(false)
  const [starting, setStarting] = useState(false)
  const navigate = useNavigate()
  const secureCamera = window.isSecureContext && Boolean(navigator.mediaDevices?.getUserMedia)
  useEffect(() => () => stream.current?.getTracks().forEach((track) => track.stop()), [])
  const process = (file: File) => { scannerSession.setFile(file); navigate('/processing') }
  const enableCamera = async () => {
    if (!secureCamera) { setError('Live camera needs HTTPS. Use Choose photo on this local network URL, or open the HTTPS deployment.'); return }
    setStarting(true); setError(null)
    try {
      let value: MediaStream
      try { value = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false }) }
      catch { value = await navigator.mediaDevices.getUserMedia({ video: true, audio: false }) }
      stream.current?.getTracks().forEach((track) => track.stop())
      stream.current = value
      if (video.current) { video.current.srcObject = value; await video.current.play().catch(() => undefined); setReady(true) }
    } catch (cameraFailure) { setError(cameraError(cameraFailure)) } finally { setStarting(false) }
  }
  const capture = () => {
    const element = video.current
    if (!element || !element.videoWidth) return
    const canvas = document.createElement('canvas'); canvas.width = element.videoWidth; canvas.height = element.videoHeight
    canvas.getContext('2d')?.drawImage(element, 0, 0)
    canvas.toBlob((blob) => blob && process(new File([blob], `sudoku-${Date.now()}.jpg`, { type: 'image/jpeg' })), 'image/jpeg', 0.92)
  }
  return <section className="camera-screen"><div className="screen-heading"><p className="eyebrow">Step 1 of 3</p><h1>Frame the whole grid</h1><p>Use bright, even light. Keep all four corners inside the guide.</p></div><div className="camera-view"><video ref={video} muted playsInline aria-label="Camera preview"/><div className="alignment-guide" aria-hidden="true"/>{error && <div className="camera-error" role="alert">{error}</div>}</div><div className="camera-controls">{ready ? <button type="button" className="capture" onClick={capture}>Capture</button> : <button type="button" className="primary-action" onClick={enableCamera} disabled={starting}>{starting ? 'Starting camera…' : 'Enable camera'}</button>}<button type="button" className="text-button" onClick={() => input.current?.click()}>Choose photo</button>{scannerSession.getFile() && scannerSession.getError() && <button type="button" className="secondary-action" onClick={() => { scannerSession.clearError(); navigate('/processing') }}>Retry photo</button>}<input ref={input} className="sr-only" aria-label="Choose puzzle photo" type="file" accept="image/*,.heic,.heif" onChange={(event) => event.target.files?.[0] && process(event.target.files[0])}/></div></section>
}
