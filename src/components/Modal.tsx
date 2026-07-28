import { type KeyboardEvent, type ReactNode, type RefObject, useEffect, useId, useRef } from 'react'
import { Surface } from './Surface'

type Props = {
  children: ReactNode
  description?: ReactNode
  initialFocusRef?: RefObject<HTMLElement | null>
  eyebrow?: ReactNode
  onClose: () => void
  title: ReactNode
}

const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Modal({ children, description, eyebrow, initialFocusRef, onClose, title }: Props) {
  const dialogRef = useRef<HTMLElement | null>(null)
  const previousFocus = useRef<HTMLElement | null>(document.activeElement instanceof HTMLElement ? document.activeElement : null)
  const titleId = useId()
  const descriptionId = useId()
  const focusable = () => [...(dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])]

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const returnFocus = previousFocus.current
    document.body.style.overflow = 'hidden'
    const target = initialFocusRef?.current ?? focusable()[0] ?? dialogRef.current
    target?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      if (returnFocus?.isConnected) returnFocus.focus()
    }
  }, [initialFocusRef])

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') { event.preventDefault(); onClose(); return }
    if (event.key !== 'Tab') return
    const targets = focusable()
    if (!targets.length) { event.preventDefault(); dialogRef.current?.focus(); return }
    const first = targets[0]
    const last = targets.at(-1)!
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); return }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }

  return <div className="ui-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose() }}>
    <section ref={dialogRef} className="ui-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} tabIndex={-1} onKeyDown={onKeyDown}>
      <Surface elevation="raised" className="ui-modal__surface">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 id={titleId}>{title}</h2>
        {description && <p id={descriptionId} className="ui-modal__description">{description}</p>}
        {children}
      </Surface>
    </section>
  </div>
}
