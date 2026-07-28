import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BrandLogo } from '../components/BrandLogo'
import { Button } from '../components/Button'
import { CameraGuide } from '../components/CameraGuide'
import { IconButton } from '../components/IconButton'
import { StatusBadge } from '../components/StatusBadge'
import { Surface } from '../components/Surface'
import { scannerSession } from '../scanner/session'

const cameraError = (error: unknown) => {
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError') return 'Camera permission was denied. Allow it in your browser settings, or choose an image instead.'
  if (name === 'NotFoundError') return 'No camera is available on this device. Choose an image instead.'
  return 'The camera could not start. Choose an image instead.'
}

function BackIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m14 5-7 7 7 7M7 12h12" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"/></svg>
}

function CameraIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 8h4l1.5-2h5L16 8h4v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"/></svg>
}

export function CameraScreen() {
  const video = useRef<HTMLVideoElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const errorRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(() => scannerSession.getError() ? 'We could not process the selected image. Choose another image or try it again.' : null)
  const [ready, setReady] = useState(false)
  const [starting, setStarting] = useState(false)
  const navigate = useNavigate()
  const secureCamera = window.isSecureContext && Boolean(navigator.mediaDevices?.getUserMedia)

  useEffect(() => () => stream.current?.getTracks().forEach((track) => track.stop()), [])
  useEffect(() => { if (error) errorRef.current?.focus() }, [error])

  const processFile = (file: File) => {
    scannerSession.setFile(file)
    navigate('/processing')
  }

  const enableCamera = async () => {
    if (!secureCamera) {
      setError('Live camera needs HTTPS. Choose an image on this network URL, or open the HTTPS deployment.')
      return
    }
    setStarting(true)
    setError(null)
    try {
      let value: MediaStream
      try { value = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false }) }
      catch { value = await navigator.mediaDevices.getUserMedia({ video: true, audio: false }) }
      stream.current?.getTracks().forEach((track) => track.stop())
      stream.current = value
      if (video.current) {
        video.current.srcObject = value
        await video.current.play().catch(() => undefined)
        setReady(true)
      }
    } catch (cameraFailure) {
      setError(cameraError(cameraFailure))
    } finally {
      setStarting(false)
    }
  }

  const capture = () => {
    const element = video.current
    if (!element || !element.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = element.videoWidth
    canvas.height = element.videoHeight
    const context = canvas.getContext('2d')
    if (!context) {
      setError('The camera image could not be prepared. Choose an image instead.')
      return
    }
    context.drawImage(element, 0, 0)
    canvas.toBlob((blob) => {
      if (blob) processFile(new File([blob], `sudoku-${Date.now()}.jpg`, { type: 'image/jpeg' }))
      else setError('The camera image could not be prepared. Choose an image instead.')
    }, 'image/jpeg', 0.92)
  }

  const chooseFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) processFile(file)
  }

  const retrySelectedFile = () => {
    scannerSession.clearError()
    setError(null)
    navigate('/processing')
  }

  return <section className="camera-screen" aria-labelledby="camera-title">
    <header className="camera-heading">
      <div className="camera-heading__title"><span aria-hidden="true"><BrandLogo variant="compact"/></span><div><p className="eyebrow">Scan a puzzle</p><h1 id="camera-title">Capture the whole grid</h1><p>Take a photo or choose one you already have. Images stay on this device and are processed locally.</p></div></div>
      <IconButton label="Back to home" onClick={() => navigate('/')}><BackIcon/></IconButton>
    </header>
    <div className="camera-layout">
      <Surface className="camera-capture" elevation="raised">
        <div className={`camera-view ${ready ? 'camera-view--ready' : ''}`}>
          <video ref={video} muted playsInline aria-label="Live camera preview"/>
          <div className="alignment-guide" aria-hidden="true"/>
          {!ready && <div className="camera-view__placeholder"><CameraIcon/><span>Camera preview appears here</span></div>}
        </div>
        <div className="camera-capture__status"><StatusBadge tone={ready ? 'success' : 'neutral'}>{ready ? 'Camera ready' : 'Choose a capture source'}</StatusBadge>{ready && <span>Keep the grid inside the guide.</span>}</div>
        <div className="camera-controls">
          {ready
            ? <Button variant="primary" className="camera-capture__button" onClick={capture}><CameraIcon/>Capture photo</Button>
            : <Button variant="primary" className="camera-capture__button" onClick={enableCamera} disabled={starting}><CameraIcon/>{starting ? 'Starting camera...' : 'Take a photo'}</Button>}
          <Button variant="secondary" onClick={() => input.current?.click()}>Choose existing image</Button>
          <Button variant="ghost" onClick={() => navigate('/manual')}>Enter manually</Button>
          {scannerSession.getFile() && scannerSession.getError() && <Button variant="ghost" className="camera-controls__retry" onClick={retrySelectedFile}>Try selected image again</Button>}
          <input ref={input} className="sr-only" aria-label="Choose an existing puzzle image" type="file" accept="image/*,.heic,.heif" onChange={chooseFile}/>
        </div>
        {error && <div ref={errorRef} className="camera-error" role="alert" tabIndex={-1}>{error}</div>}
      </Surface>
      <CameraGuide/>
    </div>
  </section>
}
