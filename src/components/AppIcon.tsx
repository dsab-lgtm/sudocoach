import type { ComponentProps } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Grid3X3,
  MoreHorizontal,
  Pencil,
  Settings,
  X,
  type LucideIcon
} from 'lucide-react'

type AppIconProps = Omit<ComponentProps<LucideIcon>, 'aria-hidden' | 'focusable' | 'size' | 'strokeWidth'> & {
  icon: LucideIcon
  size?: number
}

/** Centralizes the optical treatment for non-brand UI icons. */
export function AppIcon({ icon: Icon, size = 20, ...props }: AppIconProps) {
  return <Icon {...props} aria-hidden="true" focusable="false" size={size} strokeWidth={1.8}/>
}

export function BackIcon() { return <AppIcon icon={ArrowLeft}/> }
export function ForwardIcon() { return <AppIcon icon={ArrowRight}/> }
export function CameraIcon() { return <AppIcon icon={Camera}/> }
export function SettingsIcon() { return <AppIcon icon={Settings}/> }
export function CloseIcon() { return <AppIcon icon={X}/> }
export function MoreIcon() { return <AppIcon icon={MoreHorizontal}/> }
export function PuzzleIcon() { return <AppIcon icon={Grid3X3}/> }
export function ManualEntryIcon() { return <AppIcon icon={Pencil}/> }
