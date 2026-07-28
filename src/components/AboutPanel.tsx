import packageInfo from '../../package.json'
import { BrandLogo } from './BrandLogo'
import { StatusBadge } from './StatusBadge'
import { Surface } from './Surface'

export function AboutPanel() {
  return <Surface className="about-panel">
    <div className="about-panel__identity"><BrandLogo/><StatusBadge tone="accent">Offline-ready</StatusBadge></div>
    <p>Puzzles are saved on this device. Image scanning is processed locally.</p>
    <small>Version {packageInfo.version}</small>
  </Surface>
}
