import { Surface } from './Surface'

const guidance = [
  ['Include the whole grid', 'Keep all four corners in the frame.'],
  ['Keep it straight', 'Aim directly at the puzzle, not from an angle.'],
  ['Avoid glare and shadows', 'Use even light and clear contrast.']
]

export function CameraGuide() {
  return <Surface className="camera-guide">
    <h2>For a clean scan</h2>
    <ul>
      {guidance.map(([title, detail]) => <li key={title}><span className="camera-guide__marker" aria-hidden="true"/><span><strong>{title}</strong><small>{detail}</small></span></li>)}
    </ul>
  </Surface>
}
