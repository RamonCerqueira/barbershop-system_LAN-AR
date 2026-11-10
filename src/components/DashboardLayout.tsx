'use client'

import React, { useState, useEffect, useCallback } from 'react'
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
  Crown,
  Package
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
  const [showNotifications, setShowNotifications] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [userInfo, setUserInfo] = useState<{ name?: string; companyName?: string } | null>(null)
  const [showMoreModules, setShowMoreModules] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const loadNotifications = useCallback(async () => {
    try {
      const res = await apiFetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setNotifications(Array.isArray(data) ? data : [])
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
  }, [pathname])

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
    { href: '/dashboard/configuracoes', label: 'Configurações', icon: Settings, exact: false }
  ]
  const moreItems = [
    { href: '/dashboard/agendamentos-calendario', label: 'Calendário', icon: CalendarDays },
    { href: '/dashboard/colaboradores-especialidades', label: 'Especialidades', icon: Award },
    { href: '/dashboard/produtos', label: 'Produtos', icon: Package },
    { href: '/dashboard/campanhas-whatsapp', label: 'Campanhas WhatsApp', icon: MessageSquare }
  ]
  const isDashboardHome = pathname === '/dashboard'
  const isMoreRoute = moreItems.some((item) => pathname.startsWith(item.href))
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
        <div className="dashboard-brand flex h-[210px] shrink-0 items-center justify-center border-b">
          <Link href="/dashboard" className="dashboard-brand-lockup" aria-label="BarberPro, início">
            <span className="dashboard-brand-mark"><Scissors size={31} /></span>
            <span className="dashboard-brand-name">BARBER<span>PRO</span></span>
            <span className="dashboard-brand-tagline">GESTÃO INTELIGENTE</span>
            {userInfo?.companyName && <span className="dashboard-brand-company">{userInfo.companyName}</span>}
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

        <nav className="dashboard-nav mt-[10px] flex-1 overflow-y-auto px-3" aria-label="Navegação principal">
          <p className="px-3 pb-2 pt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Menu principal</p>
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href)

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={`dashboard-nav-link group flex h-[51px] items-center rounded-[11px] px-3.5 text-[15px] transition-all duration-200 ${isActive
                        ? 'dashboard-nav-active text-white font-semibold'
                        : 'text-slate-400 hover:text-white'
                      }`}
                  >
                    <span className="dashboard-nav-icon mr-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors">
                      <Icon size={21} />
                    </span>
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
          <button type="button" className="dashboard-more-toggle" onClick={() => setShowMoreModules((open) => !open)} aria-expanded={showMoreModules || isMoreRoute}>
            <span>Mais módulos</span><ChevronDown size={15} className={showMoreModules || isMoreRoute ? 'rotate-180' : ''} />
          </button>
          {(showMoreModules || isMoreRoute) && <ul className="dashboard-more-list">
            {moreItems.map((item) => {
              const Icon = item.icon
              const active = pathname.startsWith(item.href)
              return <li key={item.href}><Link href={item.href} className={`dashboard-nav-link dashboard-more-link ${active ? 'dashboard-nav-active text-white font-semibold' : 'text-slate-400 hover:text-white'}`}><span className="dashboard-nav-icon"><Icon size={19} /></span>{item.label}</Link></li>
            })}
          </ul>}
        </nav>

        <div className="dashboard-sidebar-footer">
          <div className="dashboard-sidebar-promo"><Crown size={29} /><strong>Clientes satisfeitos<br />voltam sempre!</strong></div>
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
              {isDashboardHome ? <><h2 className="dashboard-welcome-title">Bem-vindo(a), {displayName}!</h2><p className="dashboard-welcome-subtitle">Aqui está o resumo do seu dia na barbearia.</p></> : <><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">Painel de gestão</p><h2 className="max-w-[44vw] truncate text-sm font-semibold text-white sm:max-w-none sm:text-base">{userInfo?.companyName || 'BarberPro'}</h2></>}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className={`items-center gap-2 text-xs font-medium text-slate-400 ${isDashboardHome ? 'dashboard-header-date' : 'hidden lg:flex'}`}>
              <CalendarDays size={isDashboardHome ? 22 : 15} className="text-amber-400" />
              <span>{isDashboardHome ? format(today, 'dd/MM/yyyy') : format(today, 'dd MMM yyyy')}{isDashboardHome && <small>{new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(today)}</small>}</span>
            </div>
            {userInfo?.name && (
              <div className={`items-center gap-2.5 border-l border-white/10 pl-4 ${isDashboardHome ? 'dashboard-profile' : 'hidden sm:flex'}`}>
                <span className="dashboard-profile-avatar">
                  {userInfo.name.trim().charAt(0).toUpperCase()}
                </span>
                <span className="max-w-36 truncate text-sm font-medium text-slate-200">{userInfo.name}</span>
                {isDashboardHome && <ChevronDown size={15} className="text-slate-400" />}
              </div>
            )}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
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

        <div className={`dashboard-content dashboard-page-enter flex-1 overflow-y-auto ${isDashboardHome ? 'dashboard-content-home' : 'p-4 sm:p-6 xl:p-8'}`}>{children}</div>
      </main>
    </div>
  )
}
