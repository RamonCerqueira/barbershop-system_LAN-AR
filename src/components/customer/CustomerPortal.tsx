'use client'

/* eslint-disable @next/next/no-img-element -- Customer uploads and private session images preserve original URLs. */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { CalendarDays, Compass, Heart, Scissors, UserRound, ArrowUpRight, Bell, History, ShieldCheck } from 'lucide-react'
import { CustomerEmptyState } from './CustomerUI'

export type Customer = { id: string; name: string; phone: string; email: string; avatarUrl: string | null }
type Account = { customer: Customer | null; loading: boolean; favorites: string[]; refresh: () => Promise<void>; favorite: (id: string) => Promise<void> }
const Context = createContext<Account | null>(null)
export function useCustomer() { const value = useContext(Context); if (!value) throw new Error('Customer portal unavailable'); return value }
export async function customerRequest(url: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers)
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  if (options.method === 'POST' && !headers.has('Idempotency-Key')) headers.set('Idempotency-Key', crypto.randomUUID())
  const response = await fetch(url, { ...options, headers, credentials: 'include', cache: 'no-store' })
  const body = await response.json()
  if (response.status === 401 && typeof window !== 'undefined' && url.startsWith('/api/customer/')) window.dispatchEvent(new Event('customer-session-expired'))
  if (!response.ok) throw new Error(body.error || 'Não foi possível concluir. Tente novamente.')
  return body
}
export const brMoney = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
export const brDay = (date: string) => new Date(date.slice(0, 10) + 'T12:00:00Z').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Sao_Paulo' })
export function CustomerAccess({ message = 'Entre na sua conta para acompanhar seus agendamentos em qualquer aparelho.' }: { message?: string }) {
  const pathname = usePathname()
  return <CustomerEmptyState icon={UserRound} title="Seu próximo corte começa aqui" description={message}><Link className="cp-button" href={`/cliente/entrar?next=${encodeURIComponent(pathname)}`}>Entrar ou criar conta<ArrowUpRight size={16} /></Link></CustomerEmptyState>
}
export function CustomerPortal({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [favorites, setFavorites] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()
  const refresh = useCallback(async () => {
    try {
      const body = await customerRequest('/api/customer/auth')
      setCustomer(body.customer)
      setFavorites(body.customer ? await customerRequest('/api/customer/favorites') : [])
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { void refresh().catch(() => { setCustomer(null); setFavorites([]) }) }, [refresh])
  useEffect(() => { const expired = () => { setCustomer(null); setFavorites([]) }; window.addEventListener('customer-session-expired', expired); return () => window.removeEventListener('customer-session-expired', expired) }, [])
  async function favorite(id: string) {
    if (!customer) throw new Error('Entre na sua conta para salvar suas barbearias favoritas.')
    const next = !favorites.includes(id)
    await customerRequest('/api/customer/favorites', { method: 'PUT', body: JSON.stringify({ companyId: id, favorite: next }) })
    setFavorites(previous => next ? Array.from(new Set([...previous, id])) : previous.filter(value => value !== id))
  }
  const navigation = [{ href: '/cliente', label: 'Explorar', icon: Compass }, { href: '/cliente/favoritos', label: 'Favoritos', icon: Heart }, { href: '/cliente/agendamentos', label: 'Minha agenda', icon: CalendarDays }, { href: '/cliente/perfil', label: 'Meu perfil', icon: UserRound }]
  const active = (href: string) => pathname === href || href === '/cliente' && pathname.startsWith('/cliente/barbearia/') || href === '/cliente/agendamentos' && pathname === '/cliente/historico'
  const section = pathname === '/cliente' ? 'Descubra seu próximo destino' : pathname.startsWith('/cliente/barbearia/') ? 'Sua experiência começa aqui' : pathname === '/cliente/historico' ? 'Seu histórico de estilo' : pathname === '/cliente/avisos' ? 'Avisos e lista de espera' : pathname === '/cliente/favoritos' ? 'Seus lugares preferidos' : pathname === '/cliente/perfil' ? 'Seu espaço, do seu jeito' : pathname === '/cliente/agendamentos' ? 'Seus próximos momentos' : 'Bem-vindo ao seu próximo estilo'
  return <Context.Provider value={{ customer, loading, favorites, refresh, favorite }}><div className="customer-portal">
    <a className="cp-skip-link" href="#customer-content">Pular para o conteúdo</a>
    <aside className="cp-desktop-rail" aria-label="Navegação principal do cliente">
      <Link href="/cliente" className="cp-brand"><span><Scissors size={24} strokeWidth={1.6} /></span><div>BARBER<span>PRO</span><small>SEU TEMPO. SEU ESTILO.</small></div></Link>
      <p className="cp-rail-label">SEU ESPAÇO</p>
      <nav className="cp-desktop-nav" aria-label="Portal do cliente">{navigation.map(item => <Link key={item.href} href={item.href} aria-current={active(item.href) ? 'page' : undefined}><item.icon size={20} strokeWidth={1.7} /><span>{item.label}</span></Link>)}</nav>
      <div className="cp-rail-secondary"><Link href="/cliente/historico" aria-current={pathname === '/cliente/historico' ? 'page' : undefined}><History size={19} />Histórico de cortes</Link><Link href="/cliente/avisos" aria-current={pathname === '/cliente/avisos' ? 'page' : undefined}><Bell size={19} />Avisos e lista de espera</Link></div>
      <div className="cp-rail-signature"><Scissors size={26} strokeWidth={1.1} /><p>Um tempo para você.<br /><strong>Um estilo só seu.</strong></p><span>BARBERPRO · EXPERIÊNCIA DO CLIENTE</span></div>
    </aside>
    <div className="cp-workspace"><header className="cp-header"><div className="cp-header-inner"><Link href="/cliente" className="cp-brand cp-mobile-brand"><span><Scissors size={22} /></span><div>BARBER<span>PRO</span><small>SEU PRÓXIMO ESTILO</small></div></Link><div className="cp-header-context"><span>EXPERIÊNCIA BARBERPRO</span><strong>{section}</strong></div><div className="cp-header-actions"><Link href="/cliente/avisos" className="cp-alert-link" aria-label="Avisos e lista de espera" aria-current={pathname === '/cliente/avisos' ? 'page' : undefined}><Bell size={20}/><span>Avisos</span></Link>{customer ? <Link href="/cliente/perfil" className="cp-account">{customer.avatarUrl ? <img src={customer.avatarUrl} alt="" /> : <span className="cp-account-avatar">{customer.name.trim().slice(0,1).toLocaleUpperCase('pt-BR') || <UserRound size={18}/>}</span>}<span>{customer.name.split(' ')[0]}</span></Link> : <Link href="/cliente/entrar" className="cp-login">Entrar<ArrowUpRight size={15} /></Link>}</div></div></header>
    <main className="cp-content" id="customer-content" tabIndex={-1}>{children}</main>
    <footer className="cp-footer"><Scissors size={15} /><span>Seu estilo. Seu horário. Sua barbearia.</span><Link href="/">Conhecer BarberPro</Link></footer>
    <div className="cp-security-caption"><ShieldCheck size={14}/><span>Seus agendamentos, sempre com você.</span></div></div>
    <nav className="cp-mobile-nav" aria-label="Navegação do cliente">{navigation.map(item => <Link key={item.href} href={item.href} aria-current={active(item.href) ? 'page' : undefined}><span className="cp-nav-icon"><item.icon size={22} strokeWidth={1.7} /></span><span>{item.label}</span></Link>)}</nav>
  </div></Context.Provider>
}
