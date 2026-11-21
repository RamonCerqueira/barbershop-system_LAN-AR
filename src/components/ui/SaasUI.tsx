'use client'

import React from 'react'
import { AlertCircle, CheckCircle2, Info, AlertTriangle, Loader2, UserRound, Scissors, CalendarDays, Clock3, Phone, Mail, MapPin, Wallet, FileText, Tag, Package, BadgeCheck, Link2, AlignLeft, LockKeyhole } from 'lucide-react'

export function SaasPageHeader({
  kicker,
  title,
  subtitle,
  actions
}: {
  kicker?: string
  title: string
  subtitle?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {kicker && (
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#f5b51b]">
            {kicker}
          </p>
        )}
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-[#a0a9b6]">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  )
}

export function SaasSectionCard({
  title,
  description,
  icon,
  children,
  className = ''
}: {
  title?: string
  description?: string
  icon?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-[18px] border border-white/[0.085] bg-gradient-to-br from-[#181d24] to-[#10141a] p-6 shadow-[0_12px_34px_rgba(0,0,0,0.18)] ${className}`}
    >
      {(title || description) && (
        <div className="mb-5 border-b border-white/[0.07] pb-4">
          {title && (
            <h2 className="flex items-center gap-2.5 text-lg font-semibold text-white">
              {icon && <span className="text-[#f5b51b]">{icon}</span>}
              <span>{title}</span>
            </h2>
          )}
          {description && <p className="mt-1 text-xs text-[#a0a9b6]">{description}</p>}
        </div>
      )}
      {children}
    </section>
  )
}

function fieldIcon(label: string) {
  if (/senha|código|token/i.test(label)) return LockKeyhole
  if (/email|e-mail/i.test(label)) return Mail
  if (/telefone|whatsapp|celular/i.test(label)) return Phone
  if (/cliente|nome|responsável|barbearia/i.test(label)) return UserRound
  if (/profissional|colaborador|especialidade/i.test(label)) return BadgeCheck
  if (/serviço/i.test(label)) return Scissors
  if (/data|nascimento|dia/i.test(label)) return CalendarDays
  if (/horário|hora|duração|intervalo|minuto/i.test(label)) return Clock3
  if (/valor|preço|custo|pagamento|salário|comissão|pix/i.test(label)) return Wallet
  if (/endereço|cidade|bairro|cep|local/i.test(label)) return MapPin
  if (/produto|estoque|quantidade/i.test(label)) return Package
  if (/status|categoria|tipo/i.test(label)) return Tag
  if (/site|url|link/i.test(label)) return Link2
  if (/observa|descrição|mensagem/i.test(label)) return AlignLeft
  return FileText
}

export function SaasFieldLabel({ children, className = '', iconLabel, ...props }: React.LabelHTMLAttributes<HTMLLabelElement> & { iconLabel?: string }) {
  const text = React.Children.toArray(children).filter(child => typeof child === 'string').join(' ')
  const Icon = fieldIcon(iconLabel || text)
  return <label {...props} className={`saas-field-label ${className}`}><Icon size={14} strokeWidth={1.8} aria-hidden="true" /><span>{children}</span></label>
}

export function SaasField({
  label,
  required,
  hint,
  error,
  htmlFor,
  children
}: {
  label: string
  required?: boolean
  hint?: string
  error?: string
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <SaasFieldLabel
        iconLabel={label}
        htmlFor={htmlFor}
        className="text-slate-300"
      >
        <span>
          {label}
          {required && <span className="ml-1 text-[#f5b51b]" aria-hidden="true">*</span>}
        </span>
      </SaasFieldLabel>
      {children}
      {hint && !error && <p className="text-[11px] text-[#8f98a3]">{hint}</p>}
      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-xs font-medium text-red-400">
          <AlertCircle size={13} className="shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}

export function SaasAlert({
  variant = 'info',
  title,
  message,
  action
}: {
  variant?: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
  action?: React.ReactNode
}) {
  const styles = {
    success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
    error: 'border-red-500/30 bg-red-500/10 text-red-200',
    warning: 'border-amber-500/35 bg-amber-500/10 text-amber-100',
    info: 'border-sky-500/30 bg-sky-500/10 text-sky-100'
  }
  const icons = {
    success: <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />,
    error: <AlertCircle size={18} className="shrink-0 text-red-400" />,
    warning: <AlertTriangle size={18} className="shrink-0 text-[#f5b51b]" />,
    info: <Info size={18} className="shrink-0 text-sky-400" />
  }

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${styles[variant]}`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{icons[variant]}</div>
        <div className="text-sm">
          {title && <p className="font-semibold text-white">{title}</p>}
          <p className="opacity-90">{message}</p>
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function SaasSubmitButton({
  loading,
  loadingText = 'Salvando...',
  children,
  disabled,
  className = ''
}: {
  loading?: boolean
  loadingText?: string
  children: React.ReactNode
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f5b51b] to-[#dc9b2d] px-5 py-2.5 text-sm font-bold text-[#15120b] shadow-[0_8px_20px_rgba(245,181,27,0.2)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      <span className="inline-flex items-center justify-center gap-2">{loading ? loadingText : children}</span>
    </button>
  )
}

export const saasInputClass =
  'saas-input w-full rounded-xl border border-white/10 bg-[#090c10]/80 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 transition focus:border-[#f4b640] focus:outline-none focus:ring-2 focus:ring-[#f4b640]/20'
