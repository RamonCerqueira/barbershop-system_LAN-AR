'use client'

import { useEffect, useId, useRef, type ReactNode } from 'react'
import { CalendarPlus, Users, Scissors, Package, Wallet, MessageSquare, Building2, KeyRound, BadgeCheck, X } from 'lucide-react'

const icons = { calendar: CalendarPlus, clients: Users, service: Scissors, product: Package, finance: Wallet, campaign: MessageSquare, company: Building2, security: KeyRound, team: BadgeCheck }

export function SaasModal({ title, description, icon = 'company', onClose, children, size = 'default', tone = 'default' }: {
  title: ReactNode
  description: string
  icon?: keyof typeof icons
  onClose: () => void
  children: ReactNode
  size?: 'default' | 'wide'
  tone?: 'default' | 'danger'
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  const Icon = icons[icon]

  useEffect(() => {
    const dialog = ref.current
    const previousOverflow = document.body.style.overflow
    dialog?.showModal()
    const firstField = dialog?.querySelector<HTMLElement>('input:not([type="hidden"]):not(:disabled), select:not(:disabled), textarea:not(:disabled)')
    firstField?.focus({ preventScroll: true })
    document.body.style.overflow = 'hidden'
    return () => {
      dialog?.close()
      document.body.style.overflow = previousOverflow
    }
  }, [])

  return (
    <dialog ref={ref} className={`saas-modal ${size === 'wide' ? 'saas-modal-wide' : ''} ${tone === 'danger' ? 'saas-modal-danger' : ''}`} aria-labelledby={titleId} aria-describedby={descriptionId}
      onCancel={event => { event.preventDefault(); onClose() }}
      onClick={event => {
        if (event.target !== event.currentTarget) return
        const rect = event.currentTarget.getBoundingClientRect()
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose()
      }}>
      <header className="saas-modal-header">
        <span className="saas-modal-symbol"><Icon size={23} strokeWidth={1.8} aria-hidden="true" /></span>
        <div className="saas-modal-heading">
          <h2 id={titleId}>{title}</h2>
          <p id={descriptionId}>{description}</p>
        </div>
        <button type="button" className="saas-modal-close" onClick={onClose} aria-label="Fechar janela"><X size={19} /></button>
      </header>
      <div className="saas-modal-body">{children}</div>
    </dialog>
  )
}
