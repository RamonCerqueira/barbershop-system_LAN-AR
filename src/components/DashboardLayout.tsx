'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Bell,
  Home,
  Calendar,
  CalendarDays,
  Briefcase,
  ShoppingCart,
  DollarSign,
  Users,
  Award,
  Settings,
  BarChart2,
  MessageSquare,
  Menu,
  X,
  LogOut
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
    { href: '/dashboard/agendamentos-calendario', label: 'Calendário', icon: CalendarDays, exact: true },
    { href: '/dashboard/servicos', label: 'Serviços', icon: Briefcase, exact: false },
    { href: '/dashboard/colaboradores', label: 'Colaboradores', icon: Users, exact: true },
    { href: '/dashboard/colaboradores-especialidades', label: 'Especialidades', icon: Award, exact: true },
    { href: '/dashboard/produtos', label: 'Produtos', icon: ShoppingCart, exact: false },
    { href: '/dashboard/caixa', label: 'Caixa / PDV', icon: DollarSign, exact: false },
    { href: '/dashboard/clientes', label: 'Clientes', icon: Users, exact: false },
    { href: '/dashboard/analise-servicos', label: 'Análise ABC', icon: BarChart2, exact: false },
    { href: '/dashboard/campanhas-whatsapp', label: 'Campanhas WhatsApp', icon: MessageSquare, exact: false },
    { href: '/dashboard/configuracoes', label: 'Configurações', icon: Settings, exact: false }
  ]

  return (
    <div className="flex min-h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-800 border-r border-gray-700 flex flex-col transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } md:relative md:translate-x-0 transition-transform duration-200 ease-in-out`}
      >
        <div className="p-6 flex items-center justify-between border-b border-gray-700">
          <div>
            <h1 className="text-2xl font-bold text-orange-500">BarberPro</h1>
            {userInfo?.companyName && (
              <p className="text-xs text-gray-400 truncate max-w-[180px] mt-1">
                {userInfo.companyName}
              </p>
            )}
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="mt-4 flex-1 overflow-y-auto">
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
                    className={`flex items-center px-6 py-3 text-sm transition-colors duration-200 ${isActive
                        ? 'bg-orange-600 text-white font-medium'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }`}
                  >
                    <Icon size={18} className="mr-3 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition-colors"
          >
            <LogOut size={18} className="mr-3" />
            Sair da Conta
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden text-gray-400 hover:text-white"
            >
              <Menu size={24} />
            </button>
            <h2 className="text-lg font-semibold text-white">
              {userInfo?.companyName
                ? `${userInfo.companyName} — Painel de Gestão`
                : 'Bem-vindo ao BarberPro!'}
            </h2>
          </div>

          <div className="flex items-center space-x-4">
            {userInfo?.name && (
              <span className="hidden sm:inline-block text-sm text-gray-300">
                Olá, <strong className="text-white">{userInfo.name}</strong>
              </span>
            )}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-400 hover:text-white transition-colors"
              >
                <Bell size={22} />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-gray-800 rounded-lg shadow-xl z-50 border border-gray-700 max-h-96 overflow-y-auto">
                  <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="text-sm font-semibold">Notificações</h3>
                    {notifications.length > 0 && (
                      <button
                        onClick={clearAllNotifications}
                        className="text-xs text-orange-400 hover:text-orange-300"
                      >
                        Limpar todas
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <p className="p-4 text-gray-400 text-sm text-center">
                      Nenhuma notificação no momento.
                    </p>
                  ) : (
                    <ul className="divide-y divide-gray-700">
                      {notifications.map((notification) => (
                        <li
                          key={notification.id}
                          className={`p-4 ${notification.isRead ? 'bg-gray-800' : 'bg-gray-700/60'
                            }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <p className="text-xs font-semibold text-orange-400">
                                {notification.title}
                              </p>
                              <p
                                className={`text-sm mt-0.5 ${notification.isRead
                                    ? 'text-gray-400'
                                    : 'text-white font-medium'
                                  }`}
                              >
                                {notification.message}
                              </p>
                            </div>
                            {!notification.isRead && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="shrink-0 text-orange-400 hover:text-orange-300 text-xs"
                              >
                                Lida
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
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

        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </main>
    </div>
  )
}
