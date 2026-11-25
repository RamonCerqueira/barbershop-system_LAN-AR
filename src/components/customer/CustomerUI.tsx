import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

/** Presentation primitives scoped to the customer portal; no business behavior. */
export function CustomerPageHeading({ eyebrow, title, description, icon: Icon, children }: {
  eyebrow: string
  title: string
  description: string
  icon: LucideIcon
  children?: ReactNode
}) {
  return <div className="cp-page-heading">
    <div><span className="cp-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p>{children}</div>
    <span className="cp-page-symbol" aria-hidden="true"><Icon size={30} strokeWidth={1.4} /></span>
  </div>
}

export function CustomerEmptyState({ icon: Icon, title, description, children }: {
  icon: LucideIcon
  title: string
  description: string
  children: ReactNode
}) {
  return <section className="cp-empty"><span className="cp-empty-symbol" aria-hidden="true"><Icon size={34} strokeWidth={1.4} /></span><h2>{title}</h2><p>{description}</p><div className="cp-empty-actions">{children}</div></section>
}
