import * as Dialog from '@radix-ui/react-dialog'
import { type ReactNode, type RefObject, useEffect, useRef } from 'react'
import { Surface } from './Surface'

type Props = {
  children: ReactNode
  description?: ReactNode
  initialFocusRef?: RefObject<HTMLElement | null>
  eyebrow?: ReactNode
  onClose: () => void
  title: ReactNode
}

export function Modal({ children, description, eyebrow, initialFocusRef, onClose, title }: Props) {
  const previousFocus = useRef<HTMLElement | null>(document.activeElement instanceof HTMLElement ? document.activeElement : null)

  useEffect(() => {
    const returnFocus = previousFocus.current
    return () => { if (returnFocus?.isConnected) returnFocus.focus() }
  }, [])

  return <Dialog.Root open onOpenChange={(open) => { if (!open) onClose() }}>
    <Dialog.Portal>
      <Dialog.Overlay className="ui-modal-backdrop" onPointerDown={onClose}/>
      <Dialog.Content className="ui-modal" onCloseAutoFocus={(event) => {
        const returnFocus = previousFocus.current
        if (returnFocus?.isConnected) {
          event.preventDefault()
          returnFocus.focus()
        }
      }} onOpenAutoFocus={(event) => {
        if (initialFocusRef?.current) {
          event.preventDefault()
          initialFocusRef.current.focus()
        }
      }}>
        <Surface elevation="raised" className="ui-modal__surface">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <Dialog.Title>{title}</Dialog.Title>
          {description && <Dialog.Description className="ui-modal__description">{description}</Dialog.Description>}
          {children}
        </Surface>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
