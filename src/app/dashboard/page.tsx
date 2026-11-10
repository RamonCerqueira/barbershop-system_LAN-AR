'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  History,
  Scissors,
  Settings,
  Star,
  TrendingUp,
  Users,
  UserRoundPlus,
  ChartNoAxesColumnIncreasing,
  Zap
} from 'lucide-react'
import { apiFetch } from '@/lib/api'

interface DashboardStats {
  todayAppointments: number
  todayRevenue: number
  monthlyRevenue: number
  totalClients: number
  pendingAppointments: number
  completedAppointments: number
}

interface RecentAppointment {
  id: string
  clientName: string
  clientPhone: string
  service: string
  employee: string
  time: string
  status: string
  price: number
}

interface SaleRecord {
  id: string
  description: string
  amount: number | string
  status: string
  createdAt: string
  type: string
  client?: { fullName?: string } | null
}

interface NotificationRecord {
  id: string
  title: string
  message: string
  type: string
  createdAt: string
}

interface ClientRecord {
  rating: number | null
}

interface Activity {
  id: string
  label: string
  detail: string
  value?: number
  time: Date
  kind: 'payment' | 'appointment' | 'client' | 'other'
}

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
const shortDate = (date: Date) => new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(date).replace('.', '')
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()

const statusPresentation: Record<string, { label: string; className: string }> = {
  CONFIRMED: { label: 'Confirmado', className: 'status-confirmed' },
  SCHEDULED: { label: 'Agendado', className: 'status-scheduled' },
  IN_PROGRESS: { label: 'Em andamento', className: 'status-progress' },
  COMPLETED: { label: 'Concluído', className: 'status-completed' },
  CANCELLED: { label: 'Cancelado', className: 'status-cancelled' },
  NO_SHOW: { label: 'Não compareceu', className: 'status-cancelled' }
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [appointments, setAppointments] = useState<RecentAppointment[]>([])
  const [sales, setSales] = useState<SaleRecord[]>([])
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [clientRatings, setClientRatings] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const [dashboardRes, salesRes, notificationsRes, clientsRes] = await Promise.all([
        apiFetch('/api/dashboard'),
        apiFetch('/api/sales'),
        apiFetch('/api/notifications'),
        apiFetch('/api/clients')
      ])
      if (!dashboardRes.ok) throw new Error('Dashboard indisponível')
      const dashboard = await dashboardRes.json()
      setStats(dashboard.stats || null)
      setAppointments(Array.isArray(dashboard.recentAppointments) ? dashboard.recentAppointments : [])
      if (salesRes.ok) {
        const records = await salesRes.json()
        setSales(Array.isArray(records) ? records : [])
      }
      if (notificationsRes.ok) {
        const records = await notificationsRes.json()
        setNotifications(Array.isArray(records) ? records : [])
      }
      if (clientsRes.ok) {
        const records: ClientRecord[] = await clientsRes.json()
        setClientRatings(Array.isArray(records) ? records.map((client) => client.rating).filter((rating): rating is number => typeof rating === 'number' && Number.isFinite(rating) && rating >= 0 && rating <= 5) : [])
      }
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error)
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadDashboard() }, [loadDashboard])

  const weekDays = useMemo(() => {
    const today = new Date()
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6)
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
      const revenue = sales.reduce((sum, sale) => {
        const soldAt = new Date(sale.createdAt)
        const isSameDay = soldAt.getFullYear() === date.getFullYear() && soldAt.getMonth() === date.getMonth() && soldAt.getDate() === date.getDate()
        return sum + (isSameDay && ['COMPLETED', 'APPROVED'].includes(sale.status) ? Number(sale.amount) : 0)
      }, 0)
      return { key, date, revenue }
    })
  }, [sales])

  const maxRevenue = Math.max(...weekDays.map((day) => day.revenue), 1)
  const averageRating = clientRatings.length ? (clientRatings.reduce((sum, rating) => sum + rating, 0) / clientRatings.length).toFixed(1).replace('.', ',') : null

  const activities = useMemo<Activity[]>(() => {
    const fromNotifications: Activity[] = notifications.map((notification) => {
      const kind = notification.type === 'PAYMENT' ? 'payment' : notification.type === 'APPOINTMENT' ? 'appointment' : 'other'
      return { id: `notification-${notification.id}`, label: notification.title, detail: notification.message, time: new Date(notification.createdAt), kind }
    })
    const fromSales: Activity[] = sales.filter((sale) => ['COMPLETED', 'APPROVED'].includes(sale.status)).slice(0, 12).map((sale) => ({
      id: `sale-${sale.id}`,
      label: sale.client?.fullName ? `Pagamento recebido de ${sale.client.fullName}` : sale.description,
      detail: sale.description,
      value: Number(sale.amount),
      time: new Date(sale.createdAt),
      kind: 'payment'
    }))
    return [...fromNotifications, ...fromSales].sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 3)
  }, [notifications, sales])

  const formatTime = (date: Date) => new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date)

  return (
    <div className="barber-dashboard dashboard-page-enter">
      <section className="bd-summary-grid" aria-label="Indicadores do dia">
        <article className="bd-stat-card">
          <span className="bd-stat-icon is-blue"><CalendarDays size={35} /></span>
          <div className="bd-stat-copy"><strong>{loading ? '—' : stats?.todayAppointments ?? '—'}</strong><span>Agendamentos Hoje</span></div>
          <div className="bd-stat-note"><span className="is-green">{loading ? '—' : stats?.completedAppointments ?? '—'} concluídos</span><span>• {loading ? '—' : stats?.pendingAppointments ?? '—'} pendentes</span></div>
        </article>
        <article className="bd-stat-card">
          <span className="bd-stat-icon is-green"><Users size={35} /></span>
          <div className="bd-stat-copy"><strong>{loading ? '—' : stats?.totalClients ?? '—'}</strong><span>Clientes Cadastrados</span></div>
          <span className="bd-stat-note">Clientes ativos</span>
        </article>
        <article className="bd-stat-card">
          <span className="bd-stat-icon is-gold"><CircleDollarSign size={37} /></span>
          <div className="bd-stat-copy"><strong>{loading ? '—' : money(stats?.todayRevenue ?? 0)}</strong><span>Faturamento Hoje</span></div>
          <span className="bd-stat-note"><TrendingUp size={15} className="is-green" /> Vendas confirmadas</span>
        </article>
        <article className="bd-stat-card">
          <span className="bd-stat-icon is-purple"><Star size={35} fill="currentColor" /></span>
          <div className="bd-stat-copy"><strong>{averageRating || '—'}</strong><span>Avaliação dos Clientes</span></div>
          <span className="bd-stat-note">{clientRatings.length ? `${clientRatings.length} avaliações cadastradas` : 'Sem avaliações disponíveis'}</span>
        </article>
      </section>

      {loadError && <div className="bd-error" role="alert">Não foi possível carregar os dados do painel. <button onClick={() => void loadDashboard()}>Tentar novamente</button></div>}

      <section className="bd-middle-grid" aria-label="Resumo da operação">
        <article className="bd-panel bd-appointments">
          <header className="bd-panel-header"><h2><CalendarDays /> Agendamentos de Hoje</h2><Link href="/dashboard/agendamentos">Ver todos <ArrowRight size={17} /></Link></header>
          {loading ? <div className="bd-empty">Carregando agendamentos…</div> : appointments.length === 0 ? <div className="bd-empty">Nenhum agendamento registrado para hoje.</div> : (
            <div className="bd-appointment-list">
              {appointments.slice(0, 5).map((appointment) => {
                const status = statusPresentation[appointment.status] || { label: appointment.status, className: 'status-scheduled' }
                return <Link href="/dashboard/agendamentos" className="bd-appointment-row" key={appointment.id}>
                  <span className="bd-avatar">{initials(appointment.clientName || '?')}</span>
                  <span className="bd-appointment-person"><strong>{appointment.clientName}</strong><small>{appointment.service}</small></span>
                  <strong className="bd-appointment-time">{appointment.time}</strong>
                  <span className={`bd-status ${status.className}`}>{status.label}</span>
                  <span className="bd-appointment-more" aria-hidden="true">⋮</span>
                </Link>
              })}
            </div>
          )}
        </article>

        <article className="bd-panel bd-quick-actions">
          <header className="bd-panel-header bd-quick-heading"><h2><Zap /> Ações Rápidas</h2></header>
          <div className="bd-action-grid">
            <Link href="/dashboard/agendamentos" className="bd-action-card is-gold"><CalendarPlus /><span>Novo<br />Agendamento</span></Link>
            <Link href="/dashboard/clientes" className="bd-action-card is-blue"><UserRoundPlus /><span>Cadastrar<br />Cliente</span></Link>
            <Link href="/dashboard/servicos" className="bd-action-card is-gold"><Scissors /><span>Registrar<br />Serviço</span></Link>
            <Link href="/dashboard/caixa" className="bd-action-card is-blue"><CreditCard /><span>Registrar<br />Pagamento</span></Link>
            <Link href="/dashboard/analise-servicos" className="bd-action-card is-neutral"><ChartNoAxesColumnIncreasing /><span>Ver<br />Relatórios</span></Link>
            <Link href="/dashboard/configuracoes" className="bd-action-card is-neutral"><Settings /><span>Configurações</span></Link>
          </div>
        </article>

        <article className="bd-panel bd-revenue">
          <header className="bd-panel-header"><h2><ChartNoAxesColumnIncreasing /> Faturamento dos Últimos 7 Dias</h2><Link href="/dashboard/caixa" aria-label="Abrir caixa"><ArrowRight size={18} /></Link></header>
          <div className="bd-chart" role="img" aria-label="Faturamento diário dos últimos sete dias, calculado a partir de vendas confirmadas">
            <div className="bd-chart-axis"><span>{money(maxRevenue)}</span><span>{money(maxRevenue * .75)}</span><span>{money(maxRevenue * .5)}</span><span>{money(maxRevenue * .25)}</span><span>R$ 0</span></div>
            <div className="bd-chart-bars">
              {weekDays.map((day) => <div className="bd-chart-column" key={day.key}>
                <span className="bd-chart-value">{money(day.revenue)}</span>
                <div className="bd-chart-track"><div className="bd-chart-bar" style={{ height: `${day.revenue === 0 ? 2 : Math.max(6, (day.revenue / maxRevenue) * 100)}%` }} /></div>
                <span className="bd-chart-date">{shortDate(day.date)}</span>
              </div>)}
            </div>
          </div>
        </article>
      </section>

      <section className="bd-bottom-grid" aria-label="Atividade e divulgação">
        <article className="bd-panel bd-activity">
          <header className="bd-panel-header"><h2><History /> Atividade Recente</h2><Link href="/dashboard/caixa">Ver todas <ArrowRight size={17} /></Link></header>
          {loading ? <div className="bd-empty">Carregando atividade…</div> : activities.length === 0 ? <div className="bd-empty">Nenhuma atividade registrada recentemente.</div> : <div className="bd-activity-list">
            {activities.map((activity) => <div className="bd-activity-row" key={activity.id}>
              <span className={`bd-activity-icon ${activity.kind}`}>{activity.kind === 'payment' ? <CheckCircle2 /> : activity.kind === 'appointment' ? <CalendarDays /> : <Clock3 />}</span>
              <span className="bd-activity-description"><strong>{activity.label}</strong><small>{activity.detail}</small></span>
              {activity.value !== undefined && <strong className="bd-activity-value">{money(activity.value)}</strong>}
              <time>{formatTime(activity.time)}</time>
            </div>)}
          </div>}
        </article>

        <article className="bd-promo-banner">
          <div className="bd-promo-copy"><span className="bd-promo-eyebrow">EXPERIÊNCIA E ESTILO</span><h2>Barbearia Premium</h2><p>Cuidado, estilo e confiança<br />em um só lugar!</p><Link href="/dashboard/agendamentos">Agendar Agora <ArrowRight size={18} /></Link></div>
        </article>
      </section>
    </div>
  )
}
