'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Bell,
  Home,
  Calendar,
  CalendarDays,
  Scissors,
  DollarSign,
  Users,
  Award,
  Settings,
  BarChart2,
  MessageSquare,
  Menu,
  X,
  LogOut,
  UserRound,
  ChevronDown,
  Package,
  CreditCard,
  Lock,
  CalendarOff,
  Monitor,
  ShieldCheck
} from 'lucide-react'
import { format } from 'date-fns'
import { apiFetch } from '@/lib/api'

interface NotificationItem {
  id: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [showProfile, setShowProfile] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  const profileButtonRef = useRef<HTMLButtonElement>(null)
  const [showNotifications, setShowNotifications] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [userInfo, setUserInfo] = useState<{ name?: string; companyName?: string; email?: string; role?: string; avatarUrl?: string | null } | null>(null)
  const [branding, setBranding] = useState<{ name: string; logoUrl: string | null } | null>(null)
  const [subscriptionInfo, setSubscriptionInfo] = useState<{
    effectiveStatus: string
    isTrial: boolean
    isBlocked: boolean
    daysRemaining: number
    warningLevel: string
    message: string
  } | null>(null)
  const pathname = usePathname()
  const router = useRouter()

  const loadNotifications = useCallback(async () => {
    try {
      const [notifRes, subRes, brandRes, meRes] = await Promise.all([
        apiFetch('/api/notifications'),
        apiFetch('/api/subscription'),
        apiFetch('/api/settings/branding'),
        apiFetch('/api/auth/me')
      ])
      if (meRes.ok) {
        const account = await meRes.json()
        setUserInfo(account.user)
        localStorage.setItem('user', JSON.stringify(account.user))
      }
      if (brandRes.ok) setBranding(await brandRes.json())
      if (notifRes.ok) {
        const data = await notifRes.json()
        setNotifications(Array.isArray(data) ? data : [])
      }
      if (subRes.ok) {
        const subData = await subRes.json()
        if (subData?.subscription) {
          setSubscriptionInfo(subData.subscription)
        }
      }
    } catch (err) {
      console.error('Erro ao carregar notificações:', err)
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const rawUser = localStorage.getItem('user')
      if (rawUser) {
        try {
          setUserInfo(JSON.parse(rawUser))
        } catch {
          setUserInfo(null)
        }
      }
    }
    loadNotifications()
  }, [loadNotifications, pathname])

  useEffect(() => {
    setIsSidebarOpen(false)
    setShowProfile(false)
  }, [pathname])

  useEffect(() => {
    const refreshBranding = () => { void loadNotifications() }
    window.addEventListener('company-branding-updated', refreshBranding)
    window.addEventListener('profile-updated', refreshBranding)
    return () => {
      window.removeEventListener('company-branding-updated', refreshBranding)
      window.removeEventListener('profile-updated', refreshBranding)
    }
  }, [loadNotifications])

  useEffect(() => {
    if (!showProfile) return
    const outside = (event: PointerEvent) => { if (!profileRef.current?.contains(event.target as Node)) setShowProfile(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setShowProfile(false); profileButtonRef.current?.focus() } }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [showProfile])

  const unreadNotificationsCount = notifications.filter((n) => !n.isRead).length

  const markAsRead = async (id: string) => {
    try {
      const res = await apiFetch('/api/notifications', {
        method: 'PATCH',
        body: JSON.stringify({ id })
      })
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        )
      }
    } catch (err) {
      console.error('Erro ao marcar notificação como lida:', err)
    }
  }

  const clearAllNotifications = async () => {
    try {
      const res = await apiFetch('/api/notifications', { method: 'DELETE' })
      if (res.ok) {
        setNotifications([])
      }
    } catch (err) {
      console.error('Erro ao limpar notificações:', err)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
      router.push('/login')
    }
  }

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home, exact: true },
    { href: '/dashboard/agendamentos', label: 'Agendamentos', icon: Calendar, exact: true },
    { href: '/dashboard/clientes', label: 'Clientes', icon: Users, exact: false },
    { href: '/dashboard/servicos', label: 'Serviços', icon: Scissors, exact: false },
    { href: '/dashboard/colaboradores', label: 'Profissionais', icon: UserRound, exact: true },
    { href: '/dashboard/caixa', label: 'Financeiro', icon: DollarSign, exact: false },
    { href: '/dashboard/analise-servicos', label: 'Relatórios', icon: BarChart2, exact: false },
    { href: '/dashboard/assinatura', label: 'Assinatura & PIX', icon: CreditCard, exact: false },
    { href: '/dashboard/configuracoes', label: 'Configurações', icon: Settings, exact: false }
  ]
  const moreItems = [
    { href: '/dashboard/painel', label: 'Painel do Salão', icon: Monitor },
    { href: '/dashboard/agendamentos-calendario', label: 'Calendário', icon: CalendarDays },
    { href: '/dashboard/operacao', label: 'Operação & Clientes', icon: Users },
    { href: '/dashboard/bloqueios', label: 'Bloqueios & Folgas', icon: CalendarOff },
    { href: '/dashboard/comissoes', label: 'Comissões', icon: DollarSign },
    { href: '/dashboard/colaboradores-especialidades', label: 'Especialidades', icon: Award },
    { href: '/dashboard/produtos', label: 'Produtos', icon: Package },
    { href: '/dashboard/campanhas-whatsapp', label: 'Campanhas WhatsApp', icon: MessageSquare }
  ]
  const isDashboardHome = pathname === '/dashboard'
  const displayName = userInfo?.name?.trim().split(/\s+/)[0] || 'Admin'
  const today = new Date()

  return (
    <div className="dashboard-shell flex min-h-screen text-white">
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Fechar navegação"
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
        />
      )}
      {/* Sidebar */}
      <aside
        className={`dashboard-sidebar fixed inset-y-0 left-0 z-50 w-[252px] shrink-0 flex flex-col transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } md:translate-x-0 transition-transform duration-200 ease-in-out`}
      >
        <div className="dashboard-brand flex shrink-0 items-center justify-center border-b">
          <Link href="/dashboard" className="dashboard-brand-lockup" aria-label={`${branding?.name || userInfo?.companyName || 'Sua barbearia'}, início`}>
            {branding?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- Authenticated logo endpoint; preserve original proportions.
              <img src={branding.logoUrl} alt={`Logomarca ${branding.name}`} className="dashboard-company-logo" />
            ) : <span className="dashboard-brand-mark"><Scissors size={25} /></span>}
            <span className="dashboard-brand-company">{branding?.name || userInfo?.companyName || 'Sua barbearia'}</span>
            <span className="dashboard-brand-name">BARBER<span>PRO</span></span>
          </Link>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Fechar navegação"
            className="absolute right-2 top-2 rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-white md:hidden"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="dashboard-nav min-h-0 flex-1 overflow-y-auto px-3" aria-label="Navegação principal">
          <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Menu principal</p>
          <ul className="dashboard-nav-list">
            {[...navItems.slice(0, -1), ...moreItems.map(item => ({ ...item, exact: true })), ...(userInfo?.role === 'ADMIN' ? [navItems[navItems.length - 1]] : [])].map((item) => {
              const Icon = item.icon
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href)

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={`dashboard-nav-link group flex items-center rounded-[11px] px-3.5 transition-all duration-200 ${isActive
                      ? 'dashboard-nav-active text-white font-semibold'
                      : 'text-slate-400 hover:text-white'
                      }`}
                  >
                    <span className="dashboard-nav-icon mr-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors">
                      <Icon size={19} />
                    </span>
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="dashboard-sidebar-footer">
          <button
            onClick={handleLogout}
            className="flex w-full items-center rounded-xl px-3.5 py-3 text-sm text-slate-400 transition-all hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut size={18} className="mr-3" />
            Sair da Conta
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className={`dashboard-topbar sticky top-0 z-30 flex items-center justify-between border-b px-4 sm:px-6 xl:px-8 ${isDashboardHome ? 'dashboard-topbar-home' : 'py-3.5'}`}>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Abrir navegação"
              className="rounded-xl p-2 text-slate-400 transition hover:bg-white/5 hover:text-white md:hidden"
            >
              <Menu size={24} />
            </button>
            <div>
              {isDashboardHome ? <><h2 className="dashboard-welcome-title">Bem-vindo(a), {displayName}!</h2><p className="dashboard-welcome-subtitle">Aqui está o resumo do seu dia na barbearia.</p></> : <><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">Painel de gestão</p><h2 className="max-w-[44vw] truncate text-sm font-semibold text-white sm:max-w-none sm:text-base">{branding?.name || userInfo?.companyName || 'BarberPro'}</h2></>}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className={`items-center gap-2 text-xs font-medium text-slate-400 ${isDashboardHome ? 'dashboard-header-date' : 'hidden lg:flex'}`}>
              <CalendarDays size={isDashboardHome ? 22 : 15} className="text-amber-400" />
              <span>{isDashboardHome ? format(today, 'dd/MM/yyyy') : format(today, 'dd MMM yyyy')}{isDashboardHome && <small>{new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(today)}</small>}</span>
            </div>
            {userInfo?.name && (
              <div className="account-menu" ref={profileRef}>
                <button type="button" ref={profileButtonRef} className="account-trigger" onClick={() => { setShowProfile(open => !open); setShowNotifications(false) }} aria-expanded={showProfile} aria-controls="account-options" aria-label={`Conta de ${userInfo.name}`}>
                  <span className="account-avatar">{userInfo.avatarUrl ? <img src={userInfo.avatarUrl} alt="" /> : userInfo.name.trim().split(/\s+/).filter((_, index, names) => index === 0 || index === names.length - 1).map(name => name.charAt(0)).join('').toUpperCase() /* eslint-disable-line @next/next/no-img-element */}</span>
                  <span className="account-trigger-text"><strong>{userInfo.name}</strong><small>{userInfo.role === 'ADMIN' ? 'Administrador' : 'Gestor autorizado'}</small></span>
                  <ChevronDown size={15} className={showProfile ? 'rotate-180 text-amber-300' : 'text-slate-500'} />
                </button>
                {showProfile && <nav id="account-options" className="account-dropdown" aria-label="Opções da conta">
                  <div className="account-dropdown-heading"><strong>{userInfo.name}</strong><span>{userInfo.email}</span><small><ShieldCheck size={12} />Conta administrativa</small></div>
                  <Link href="/dashboard/perfil" onClick={() => setShowProfile(false)}><UserRound size={17} />Meu perfil</Link>
                  <Link href="/dashboard/agendamentos" onClick={() => setShowProfile(false)}><CalendarDays size={17} />Agendamentos</Link>
                  <Link href="/dashboard/painel" onClick={() => setShowProfile(false)}><Monitor size={17} />Painel do Salão</Link>
                  {userInfo.role === 'ADMIN' && <Link href="/dashboard/configuracoes" onClick={() => setShowProfile(false)}><Settings size={17} />Configurações</Link>}
                  <button type="button" onClick={handleLogout}><LogOut size={17} />Sair da conta</button>
                </nav>}
              </div>
            )}
            <div className="relative">
              <button
                onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false) }}
                aria-label={`Notificações${unreadNotificationsCount ? `, ${unreadNotificationsCount} não lidas` : ''}`}
                aria-expanded={showNotifications}
                className="relative rounded-xl p-2.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                <Bell size={19} />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-[#11151b] bg-amber-400 px-1 text-[9px] font-black leading-none text-[#17130a]">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="dashboard-notifications absolute right-0 z-50 mt-3 max-h-96 w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border shadow-2xl">
                  <div className="flex items-center justify-between border-b border-white/10 p-4">
                    <h3 className="text-sm font-semibold">Notificações</h3>
                    {notifications.length > 0 && (
                      <button
                        onClick={clearAllNotifications}
                        className="text-xs font-semibold text-amber-300 transition hover:text-amber-200"
                      >
                        Limpar todas
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <p className="p-6 text-center text-sm text-slate-400">
                      Nenhuma notificação no momento.
                    </p>
                  ) : (
                    <ul className="divide-y divide-white/5">
                      {notifications.map((notification) => (
                        <li
                          key={notification.id}
                          className={`p-4 transition-colors ${notification.isRead ? '' : 'bg-amber-400/5'
                            }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <p className="text-xs font-semibold text-amber-300">
                                {notification.title}
                              </p>
                              <p
                                className={`text-sm mt-0.5 ${notification.isRead
                                  ? 'text-slate-400'
                                  : 'text-white font-medium'
                                  }`}
                              >
                                {notification.message}
                              </p>
                            </div>
                            {!notification.isRead && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="shrink-0 text-xs font-semibold text-amber-300 hover:text-amber-200"
                              >
                                Lida
                              </button>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            {format(new Date(notification.createdAt), 'dd/MM/yyyy HH:mm')}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        <div className={`dashboard-content dashboard-page-enter flex-1 overflow-y-auto ${isDashboardHome ? 'dashboard-content-home' : 'p-4 sm:p-6 xl:p-8'}`}>
          {subscriptionInfo && !subscriptionInfo.isBlocked && (subscriptionInfo.isTrial || subscriptionInfo.daysRemaining <= 7) && pathname !== '/dashboard/assinatura' && (
            <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-[#f5b51b]/30 bg-[#181d24]/95 px-4 py-3 text-sm text-slate-200 shadow-lg sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5">
                <CreditCard size={18} className="shrink-0 text-[#f5b51b]" />
                <span>{subscriptionInfo.message}</span>
              </div>
              <Link
                href="/dashboard/assinatura"
                className="inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-[#f5b51b] to-[#dc9b2d] px-3.5 py-1.5 text-xs font-bold text-[#15120b] transition hover:brightness-110"
              >
                Pagar via PIX
              </Link>
            </div>
          )}

          {subscriptionInfo?.isBlocked && pathname !== '/dashboard/assinatura' ? (
            <div className="mx-auto my-10 max-w-xl rounded-[18px] border border-red-500/30 bg-gradient-to-br from-[#181d24] to-[#10141a] p-8 text-center shadow-2xl">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15 text-red-400">
                <Lock size={28} />
              </div>
              <h2 className="text-xl font-bold text-white">Acesso Temporariamente Bloqueado</h2>
              <p className="mt-2 text-sm text-slate-300">{subscriptionInfo.message}</p>
              <div className="mt-6 flex justify-center">
                <Link
                  href="/dashboard/assinatura"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#f5b51b] to-[#dc9b2d] px-6 py-3 text-sm font-bold text-[#15120b] transition hover:brightness-110"
                >
                  <CreditCard size={18} />
                  Regularizar Assinatura via PIX
                </Link>
              </div>
            </div>
          ) : (
            children
          )}
        </div>
      </main>
    </div>
  )
}
