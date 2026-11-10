'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Calendar,
  DollarSign,
  Users,
  Scissors,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  RefreshCw
} from 'lucide-react'
import Link from 'next/link'
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

interface RevenuePoint {
  month: string
  revenue: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    todayAppointments: 0,
    todayRevenue: 0,
    monthlyRevenue: 0,
    totalClients: 0,
    pendingAppointments: 0,
    completedAppointments: 0
  })
  const [recentAppointments, setRecentAppointments] = useState<RecentAppointment[]>([])
  const [revenueChart, setRevenueChart] = useState<RevenuePoint[]>([])
  const [loading, setLoading] = useState(true)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/api/dashboard')
      if (res.ok) {
        const data = await res.json()
        if (data.stats) setStats(data.stats)
        if (Array.isArray(data.recentAppointments)) {
          setRecentAppointments(data.recentAppointments)
        }
        if (Array.isArray(data.revenueChart)) {
          setRevenueChart(data.revenueChart)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
      case 'IN_PROGRESS':
        return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
      case 'COMPLETED':
        return 'bg-green-500/20 text-green-400 border border-green-500/30'
      case 'SCHEDULED':
        return 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
      case 'CANCELLED':
        return 'bg-red-500/20 text-red-400 border border-red-500/30'
      default:
        return 'bg-gray-500/20 text-gray-300'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'Confirmado'
      case 'IN_PROGRESS':
        return 'Em andamento'
      case 'COMPLETED':
        return 'Concluído'
      case 'SCHEDULED':
        return 'Agendado'
      case 'CANCELLED':
        return 'Cancelado'
      case 'NO_SHOW':
        return 'Não compareceu'
      default:
        return status
    }
  }

  const maxChartRevenue = Math.max(...revenueChart.map((r) => r.revenue), 100)

  return (
    <div className="space-y-6">
      <section className="dashboard-hero relative overflow-hidden rounded-[24px] p-6 sm:p-8 xl:p-9">
        <div className="relative z-10 flex h-full flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <span className="dashboard-kicker inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-black/25 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
              Resumo da operação
            </span>
            <h1 className="mt-4 text-3xl font-bold leading-tight text-white sm:text-4xl">Sua barbearia, em ritmo.</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
              Agenda, equipe e caixa em um só lugar. Veja o movimento de hoje e escolha seu próximo passo.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/dashboard/agendamentos-calendario"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-sm font-bold text-[#1a150b] shadow-lg shadow-black/20 hover:bg-amber-300"
            >
              <Calendar size={17} /> Abrir calendário
            </Link>
            <Link
              href="/dashboard/caixa"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-black/25 px-4 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/10"
            >
              <DollarSign size={17} /> Acessar caixa
            </Link>
            <button
              type="button"
              onClick={loadDashboard}
              disabled={loading}
              aria-label="Atualizar indicadores"
              title="Atualizar indicadores"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-black/25 text-slate-200 backdrop-blur hover:bg-white/10 disabled:opacity-50"
            >
              <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </section>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="dashboard-stat-card bg-gray-800 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Agendamentos Hoje</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.todayAppointments}</p>
            </div>
            <div className="p-3 bg-orange-500/20 rounded-full">
              <Calendar className="h-6 w-6 text-orange-500" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-400 font-medium">
              {stats.completedAppointments} concluídos
            </span>
            <span className="text-gray-500 ml-2">
              • {stats.pendingAppointments} pendentes
            </span>
          </div>
        </div>

        <div className="dashboard-stat-card bg-gray-800 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Receita Hoje</p>
              <p className="text-2xl font-bold text-white mt-1">
                R$ {stats.todayRevenue.toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-green-500/20 rounded-full">
              <DollarSign className="h-6 w-6 text-green-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-400">
            <TrendingUp className="h-4 w-4 text-green-400 mr-1" />
            <span>Vendas e serviços de hoje</span>
          </div>
        </div>

        <div className="dashboard-stat-card bg-gray-800 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Receita Mensal</p>
              <p className="text-2xl font-bold text-white mt-1">
                R$ {stats.monthlyRevenue.toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-blue-500/20 rounded-full">
              <TrendingUp className="h-6 w-6 text-blue-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-400">
            <span>Acumulado do mês atual</span>
          </div>
        </div>

        <div className="dashboard-stat-card bg-gray-800 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Total de Clientes</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.totalClients}</p>
            </div>
            <div className="p-3 bg-purple-500/20 rounded-full">
              <Users className="h-6 w-6 text-purple-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-400">
            <span>Clientes ativos cadastrados</span>
          </div>
        </div>
      </div>

      {/* Quick Actions & Today's Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Ações Rápidas</h3>
          <div className="space-y-3">
            <Link
              href="/dashboard/agendamentos"
              className="flex items-center p-3 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 rounded-lg transition-colors"
            >
              <Plus className="h-5 w-5 text-orange-500 mr-3" />
              <span className="font-medium text-white">Novo Agendamento</span>
            </Link>
            <Link
              href="/dashboard/clientes"
              className="flex items-center p-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg transition-colors"
            >
              <Users className="h-5 w-5 text-blue-400 mr-3" />
              <span className="font-medium text-white">Cadastrar Cliente</span>
            </Link>
            <Link
              href="/dashboard/servicos"
              className="flex items-center p-3 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-lg transition-colors"
            >
              <Scissors className="h-5 w-5 text-green-400 mr-3" />
              <span className="font-medium text-white">Adicionar Serviço</span>
            </Link>
            <Link
              href="/dashboard/caixa"
              className="flex items-center p-3 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-lg transition-colors"
            >
              <DollarSign className="h-5 w-5 text-purple-400 mr-3" />
              <span className="font-medium text-white">Abrir Caixa / Registrar Venda</span>
            </Link>
          </div>
        </div>

        <div className="lg:col-span-2 bg-gray-800 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Agendamentos de Hoje</h3>
            <Link
              href="/dashboard/agendamentos"
              className="text-orange-500 hover:text-orange-400 text-sm font-medium"
            >
              Ver agenda completa
            </Link>
          </div>

          {loading ? (
            <div className="py-12 text-center text-gray-400">Carregando agendamentos...</div>
          ) : recentAppointments.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              Nenhum agendamento registrado para hoje.
            </div>
          ) : (
            <div className="space-y-3">
              {recentAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-900/70 border border-gray-700 rounded-lg gap-3"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {appointment.status === 'COMPLETED' ? (
                        <CheckCircle className="h-5 w-5 text-green-400" />
                      ) : appointment.status === 'IN_PROGRESS' ? (
                        <Clock className="h-5 w-5 text-yellow-400" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-blue-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-white">{appointment.clientName}</p>
                      <p className="text-sm text-gray-400">
                        {appointment.service} • {appointment.employee}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end space-x-4">
                    <div className="text-right">
                      <p className="font-medium text-white">{appointment.time}</p>
                      <p className="text-sm text-orange-400 font-semibold">
                        R$ {appointment.price.toFixed(2)}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(
                        appointment.status
                      )}`}
                    >
                      {getStatusText(appointment.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Real Monthly Revenue Chart */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white">
              Evolução de Faturamento (Últimos 6 Meses)
            </h3>
            <p className="text-xs text-gray-400">
              Valores consolidados a partir das vendas concluídas no banco
            </p>
          </div>
          <Link
            href="/dashboard/analise-servicos"
            className="text-sm text-orange-400 hover:text-orange-300"
          >
            Ver Análise ABC →
          </Link>
        </div>

        <div className="grid grid-cols-6 gap-4 items-end h-56 pt-6 px-2">
          {revenueChart.map((item) => {
            const heightPct = Math.max(
              Math.round((item.revenue / maxChartRevenue) * 100),
              6
            )
            return (
              <div key={item.month} className="flex flex-col items-center h-full justify-end">
                <span className="text-xs text-gray-300 font-medium mb-2">
                  R$ {item.revenue.toFixed(0)}
                </span>
                <div className="w-full max-w-[56px] bg-gray-700/50 rounded-t-lg h-40 flex items-end overflow-hidden">
                  <div
                    style={{ height: `${heightPct}%` }}
                    className="w-full bg-gradient-to-t from-orange-600 to-orange-400 rounded-t-lg transition-all duration-300"
                  />
                </div>
                <span className="text-xs text-gray-400 mt-2 font-medium">{item.month}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
