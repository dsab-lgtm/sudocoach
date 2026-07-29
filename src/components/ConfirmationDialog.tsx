import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { type ReactNode, useEffect, useRef } from 'react'
import { Button } from './Button'
import { Surface } from './Surface'

type ConfirmationDialogProps = {
  title: ReactNode
  description: ReactNode
  confirmLabel: ReactNode
  cancelLabel?: ReactNode
  confirmVariant?: 'primary' | 'danger'
  confirmDisabled?: boolean
  children?: ReactNode
  onCancel: () => void
  onConfirm: () => void
}

/** Alert-dialog semantics for actions that are irreversible or destructive. */
export function ConfirmationDialog({ title, description, confirmLabel, cancelLabel = 'Cancel', confirmVariant = 'danger', confirmDisabled = false, children, onCancel, onConfirm }: ConfirmationDialogProps) {
  const previousFocus = useRef<HTMLElement | null>(document.activeElement instanceof HTMLElement ? document.activeElement : null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const returnFocus = previousFocus.current
    return () => { if (returnFocus?.isConnected) returnFocus.focus() }
  }, [])

  return <AlertDialog.Root open onOpenChange={(open) => { if (!open) onCancel() }}>
    <AlertDialog.Portal>
      <AlertDialog.Overlay className="ui-modal-backdrop"/>
      <AlertDialog.Content className="ui-modal" onCloseAutoFocus={(event) => {
        const returnFocus = previousFocus.current
        if (returnFocus?.isConnected) {
          event.preventDefault()
          returnFocus.focus()
        }
      }} onOpenAutoFocus={(event) => {
        event.preventDefault()
        cancelRef.current?.focus()
      }}>
        <Surface elevation="raised" className="ui-modal__surface">
          <AlertDialog.Title>{title}</AlertDialog.Title>
          <AlertDialog.Description className="ui-modal__description">{description}</AlertDialog.Description>
          {children}
          <div className="modal-actions">
            <Button ref={cancelRef} variant="ghost" onClick={onCancel}>{cancelLabel}</Button>
            <Button variant={confirmVariant} disabled={confirmDisabled} onClick={onConfirm}>{confirmLabel}</Button>
          </div>
        </Surface>
      </AlertDialog.Content>
    </AlertDialog.Portal>
  </AlertDialog.Root>
}
