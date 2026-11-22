'use client'

/* eslint-disable @next/next/no-img-element -- Customer uploads and private session images preserve original URLs. */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { CalendarDays, Compass, Heart, Scissors, UserRound, ArrowUpRight, Bell } from 'lucide-react'

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
  return <section className="cp-empty"><UserRound size={36} /><h2>Seu próximo corte começa aqui</h2><p>{message}</p><Link className="cp-button" href={`/cliente/entrar?next=${encodeURIComponent(pathname)}`}>Entrar ou criar conta<ArrowUpRight size={16} /></Link></section>
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
  return <Context.Provider value={{ customer, loading, favorites, refresh, favorite }}><div className="customer-portal">
    <header className="cp-header"><div className="cp-header-inner"><Link href="/cliente" className="cp-brand"><span><Scissors size={22} /></span><div>BARBER<span>PRO</span><small>SEU PRÓXIMO ESTILO</small></div></Link><nav className="cp-desktop-nav" aria-label="Portal do cliente">{navigation.map(item => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? 'page' : undefined}>{item.label}</Link>)}</nav><Link href="/cliente/avisos" className="cp-alert-link" aria-label="Avisos e lista de espera"><Bell size={21}/><span>Avisos</span></Link>{customer ? <Link href="/cliente/perfil" className="cp-account">{customer.avatarUrl ? <img src={customer.avatarUrl} alt="" /> : <UserRound size={18} />}<span>{customer.name.split(' ')[0]}</span></Link> : <Link href="/cliente/entrar" className="cp-login">Entrar<ArrowUpRight size={15} /></Link>}</div></header>
    <div className="cp-content">{children}</div>
    <footer className="cp-footer"><Scissors size={15} /><span>Seu estilo. Seu horário. Sua barbearia.</span><Link href="/">Conhecer BarberPro</Link></footer>
    <nav className="cp-mobile-nav" aria-label="Navegação do cliente">{navigation.map(item => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? 'page' : undefined}><item.icon size={21} /><span>{item.label}</span></Link>)}</nav>
  </div></Context.Provider>
}
