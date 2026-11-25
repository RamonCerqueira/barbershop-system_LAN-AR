'use client'

import { SaasModal } from '@/components/ui/SaasModal'

import type { Plan } from '@prisma/client'
import { SUBSCRIPTION_PLANS, AVAILABLE_PLANS } from '@/lib/plans'

import { useState, useEffect, useCallback } from 'react'
import {
  Bell,
  Building2,
  CheckCircle,
  CheckCircle2,
  Clock3,
  Crown,
  DollarSign,
  Download,
  Edit,
  Eye,
  FileCheck2,
  LogOut,
  QrCode,
  RefreshCw,
  Search,
  Send,
  Trash2,
  TrendingUp,
  XCircle
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import { formatCurrencyBRL } from '@/lib/masks'
import { SaasAlert, SaasField, saasInputClass } from '@/components/ui/SaasUI'

interface CompanyItem {
  id: string
  name: string
  owner: string
  email: string
  phone: string
  cpf: string
  address: string
  plan: Plan
  planPrice: number
  isActive: boolean
  status: string
  subscriptionStatus?: string
  subscriptionDaysRemaining?: number
  subscriptionExpiresAt?: string
  joinDate: string
  counts: {
    users: number
    clients: number
    appointments: number
    employees: number
    services: number
  }
}

interface AdminPaymentItem {
  contractAcceptance: {id:string;kind:string;documentHash:string;acceptedAt:string}|null
  id: string
  companyId: string
  plan: Plan
  amount: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  pixKey: string
  pixBeneficiary: string
  pixBank: string
  payerNote: string | null
  hasProof: boolean
  proofFileName: string | null
  submittedAt: string
  reviewedAt: string | null
  reviewedByName: string | null
  rejectionReason: string | null
  periodStart: string | null
  periodEnd: string | null
  company: {
    id: string
    name: string
    fullName: string
    email: string
    phone: string
    cpf: string
  }
  subscription: {
    effectiveStatus: string
    daysRemaining: number
  }
}

interface NotificationLogItem {
  id: string
  companyId: string
  type: string
  referenceDate: string
  channel: string
  status: string
  recipient: string
  message: string
  sentAt: string
  company?: { id: string; name: string; email: string }
}

export default function AdminDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'overview' | 'payments' | 'notifications'>('overview')
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [searchTerm, setSearchTerm] = useState('')
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL')
  const [loading, setLoading] = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [cronRunning, setCronRunning] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [systemStats, setSystemStats] = useState({
    totalCompanies: 0,
    activeCompanies: 0,
    monthlyRevenue: 0,
    totalUsers: 0,
    totalAppointments: 0,
    totalTransactedVolume: 0
  })

  const [companies, setCompanies] = useState<CompanyItem[]>([])
  const [monthlyRevenue, setMonthlyRevenue] = useState<
    { month: string; revenue: number; companies: number }[]
  >([])

  const [payments, setPayments] = useState<AdminPaymentItem[]>([])
  const [paymentCounts, setPaymentCounts] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    approvedVolume: 0
  })
  const [notificationLogs, setNotificationLogs] = useState<NotificationLogItem[]>([])

  const [selectedCompany, setSelectedCompany] = useState<CompanyItem | null>(null)
  const [editingCompany, setEditingCompany] = useState<CompanyItem | null>(null)
  const [rejectingPayment, setRejectingPayment] = useState<AdminPaymentItem | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  const loadAdminData = useCallback(async () => {
    setLoading(true)
    try {
      const [overviewRes, paymentsRes] = await Promise.all([
        apiFetch(`/api/admin/overview?period=${selectedPeriod}`),
        apiFetch('/api/admin/payments')
      ])

      if (overviewRes.ok) {
        const data = await overviewRes.json()
        if (data.systemStats) setSystemStats(data.systemStats)
        if (Array.isArray(data.companies)) setCompanies(data.companies)
        if (Array.isArray(data.monthlyRevenue)) setMonthlyRevenue(data.monthlyRevenue)
      }

      if (paymentsRes.ok) {
        const payData = await paymentsRes.json()
        if (payData.counts) setPaymentCounts(payData.counts)
        if (Array.isArray(payData.payments)) setPayments(payData.payments)
        if (Array.isArray(payData.notificationLogs)) setNotificationLogs(payData.notificationLogs)
      }
    } catch (error) {
      console.error('Erro ao carregar painel Super Admin:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedPeriod])

  useEffect(() => {
    void loadAdminData()
  }, [loadAdminData])

  const handleToggleCompanyActive = async (company: CompanyItem) => {
    try {
      const res = await apiFetch(`/api/admin/companies/${company.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !company.isActive })
      })
      if (res.ok) {
        await loadAdminData()
      }
    } catch (error) {
      console.error('Erro ao alterar status da empresa:', error)
    }
  }

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCompany) return
    try {
      const res = await apiFetch(`/api/admin/companies/${editingCompany.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editingCompany.name,
          fullName: editingCompany.owner,
          email: editingCompany.email,
          phone: editingCompany.phone,
          plan: editingCompany.plan,
          isActive: editingCompany.isActive
        })
      })
      if (res.ok) {
        setEditingCompany(null)
        setFeedback({ type: 'success', text: 'Dados da empresa atualizados com sucesso.' })
        await loadAdminData()
      }
    } catch (error) {
      console.error('Erro ao salvar empresa:', error)
    }
  }

  const handleDeleteCompany = async (id: string) => {
    if (!confirm('Tem certeza que deseja suspender/desativar esta barbearia?')) return
    try {
      const res = await apiFetch(`/api/admin/companies/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setFeedback({ type: 'success', text: 'Barbearia suspensa com sucesso.' })
        await loadAdminData()
      }
    } catch (error) {
      console.error('Erro ao excluir empresa:', error)
    }
  }

  const handleApprovePayment = async (payment: AdminPaymentItem) => {
    if (
      !confirm(
        `Confirmar o recebimento do PIX de ${formatCurrencyBRL(payment.amount)} para "${payment.company.name}" e liberar o plano ${getPlanName(payment.plan)}?`
      )
    ) {
      return
    }
    setActionLoadingId(payment.id)
    setFeedback(null)
    try {
      const res = await apiFetch(`/api/admin/payments/${payment.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'APPROVE' })
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Erro ao aprovar pagamento')
      setFeedback({ type: 'success', text: body.message || 'Pagamento aprovado e acesso liberado!' })
      await loadAdminData()
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Erro ao aprovar pagamento.' })
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleRejectPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rejectingPayment || rejectionReason.trim().length < 3) return
    setActionLoadingId(rejectingPayment.id)
    setFeedback(null)
    try {
      const res = await apiFetch(`/api/admin/payments/${rejectingPayment.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          action: 'REJECT',
          rejectionReason: rejectionReason.trim()
        })
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Erro ao rejeitar pagamento')
      setRejectingPayment(null)
      setRejectionReason('')
      setFeedback({ type: 'success', text: 'Pagamento rejeitado e cliente notificado.' })
      await loadAdminData()
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Erro ao rejeitar pagamento.' })
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleRunReminders = async () => {
    setCronRunning(true)
    setFeedback(null)
    try {
      const res = await apiFetch('/api/cron/subscriptions', { method: 'POST' })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Falha ao executar rotina')
      setFeedback({
        type: 'success',
        text: `Rotina executada (${body.executedAtBr}): ${body.examined} empresa(s) analisada(s), ${body.remindersDispatched} lembrete(s) enviado(s), ${body.blockedCount} bloqueio(s) aplicado(s).`
      })
      await loadAdminData()
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Erro ao executar rotina diária.' })
    } finally {
      setCronRunning(false)
    }
  }

  const handleExportCsv = () => {
    const headers = ['ID', 'Barbearia', 'Proprietário', 'Email', 'Plano', 'Valor', 'Ativa', 'Assinatura', 'Data Cadastro']
    const rows = companies.map((c) => [
      c.id,
      `"${c.name}"`,
      `"${c.owner}"`,
      c.email,
      c.plan,
      Number(c.planPrice).toFixed(2),
      c.isActive ? 'Sim' : 'Não',
      c.subscriptionStatus || 'TRIAL',
      c.joinDate
    ])
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `barberpro-empresas-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  const getPlanName = (plan: string) => SUBSCRIPTION_PLANS[plan as Plan]?.name || plan

  const formatBr = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—'

  const filteredCompanies = companies.filter(
    (company) =>
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredPayments = payments.filter((p) => {
    const matchesStatus = paymentFilter === 'ALL' || p.status === paymentFilter
    const matchesTerm =
      !searchTerm ||
      p.company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.company.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.company.email.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesStatus && matchesTerm
  })

  return (
    <div className="dashboard-shell min-h-screen text-white">
      {/* Header */}
      <header className="dashboard-topbar sticky top-0 z-30 border-b">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#f5b51b]/40 bg-[#15191f] text-[#f5b51b]">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-black tracking-[0.14em] text-white">
                BARBER<span className="text-[#f5b51b]">PRO</span>
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f5b51b]">
                Painel SuperAdmin
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                activeTab === 'overview'
                  ? 'bg-gradient-to-r from-[#f5b51b] to-[#dc9b2d] text-[#15120b]'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              Empresas & Métricas
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                activeTab === 'payments'
                  ? 'bg-gradient-to-r from-[#f5b51b] to-[#dc9b2d] text-[#15120b]'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <QrCode size={14} />
              <span>Pagamentos PIX</span>
              {paymentCounts.pending > 0 && (
                <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {paymentCounts.pending}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                activeTab === 'notifications'
                  ? 'bg-gradient-to-r from-[#f5b51b] to-[#dc9b2d] text-[#15120b]'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <Bell size={14} />
              <span>Lembretes</span>
            </button>

            <button
              onClick={loadAdminData}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/10"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Atualizar
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-300"
            >
              <LogOut size={15} />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 p-6">
        {feedback && (
          <SaasAlert
            variant={feedback.type}
            title={feedback.type === 'success' ? 'Operação concluída' : 'Erro na operação'}
            message={feedback.text}
          />
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          <div className="bd-stat-card">
            <div className="bd-stat-icon is-blue">
              <Building2 size={30} />
            </div>
            <div className="bd-stat-copy">
              <strong>{systemStats.totalCompanies}</strong>
              <span>Total de Barbearias</span>
            </div>
            <p className="bd-stat-note is-green">{systemStats.activeCompanies} ativas</p>
          </div>

          <div className="bd-stat-card">
            <div className="bd-stat-icon is-gold">
              <QrCode size={30} />
            </div>
            <div className="bd-stat-copy">
              <strong>{paymentCounts.pending}</strong>
              <span>PIX Pendentes</span>
            </div>
            <p className="bd-stat-note">
              {formatCurrencyBRL(paymentCounts.approvedVolume)} aprovados
            </p>
          </div>

          <div className="bd-stat-card">
            <div className="bd-stat-icon is-green">
              <DollarSign size={30} />
            </div>
            <div className="bd-stat-copy">
              <strong>{formatCurrencyBRL(systemStats.monthlyRevenue)}</strong>
              <span>MRR Estimado</span>
            </div>
            <p className="bd-stat-note">{systemStats.totalUsers} usuários no sistema</p>
          </div>

          <div className="bd-stat-card">
            <div className="bd-stat-icon is-purple">
              <TrendingUp size={30} />
            </div>
            <div className="bd-stat-copy">
              <strong>{formatCurrencyBRL(systemStats.totalTransactedVolume)}</strong>
              <span>Volume Transacionado</span>
            </div>
            <p className="bd-stat-note">{systemStats.totalAppointments} agendamentos</p>
          </div>
        </div>

        {/* ABA 1: EMPRESAS & MÉTRICAS */}
        {activeTab === 'overview' && (
          <>
            <div className="bd-panel">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">
                  Evolução da receita contratada estimada
                </h3>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="rounded-xl border border-white/10 bg-[#0d1117] px-3 py-1.5 text-sm text-white"
                >
                  <option value="month">Últimos 6 meses</option>
                  <option value="year">Anual</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-6">
                {monthlyRevenue.map((item) => (
                  <div
                    key={item.month}
                    className="rounded-xl border border-white/10 bg-[#0d1117] p-4 text-center"
                  >
                    <p className="text-xs text-slate-400">{item.month}</p>
                    <p className="mt-1 text-base font-bold text-emerald-400">
                      {formatCurrencyBRL(item.revenue)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.companies} barbearia(s)
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bd-panel overflow-hidden p-0">
              <div className="flex flex-col justify-between gap-4 border-b border-white/10 p-6 sm:flex-row sm:items-center">
                <h3 className="text-lg font-semibold text-white">
                  Empresas Cadastradas ({filteredCompanies.length})
                </h3>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={16}
                    />
                    <input
                      type="text"
                      placeholder="Buscar empresas..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="rounded-xl border border-white/10 bg-[#0d1117] py-2 pl-9 pr-4 text-sm text-white"
                    />
                  </div>

                  <button
                    onClick={handleExportCsv}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#f5b51b] to-[#dc9b2d] px-4 py-2 text-xs font-bold text-[#15120b]"
                  >
                    <Download size={15} />
                    <span>Exportar CSV</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#0d1117] text-xs uppercase text-slate-400">
                    <tr>
                      <th className="px-6 py-3 text-left">Barbearia</th>
                      <th className="px-6 py-3 text-left">Proprietário</th>
                      <th className="px-6 py-3 text-left">Plano</th>
                      <th className="px-6 py-3 text-left">Assinatura</th>
                      <th className="px-6 py-3 text-left">Status Conta</th>
                      <th className="px-6 py-3 text-left">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredCompanies.map((company) => (
                      <tr key={company.id} className="hover:bg-white/[0.02]">
                        <td className="px-6 py-4">
                          <div className="font-medium text-white">{company.name}</div>
                          <div className="text-xs text-slate-400">{company.email}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-200">{company.owner}</td>
                        <td className="px-6 py-4">
                          <span className="rounded-full bg-[#f5b51b]/15 px-2.5 py-0.5 text-xs font-semibold text-[#f5b51b]">
                            {getPlanName(company.plan)} ({formatCurrencyBRL(company.planPrice)})
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs">
                          <div className="font-semibold text-white">
                            {company.subscriptionStatus || 'TRIAL'}
                          </div>
                          <div className="text-slate-400">
                            Vence: {formatBr(company.subscriptionExpiresAt)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleToggleCompanyActive(company)}
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                              company.isActive
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : 'bg-red-500/15 text-red-400'
                            }`}
                          >
                            {company.isActive ? (
                              <>
                                <CheckCircle size={13} /> Ativa
                              </>
                            ) : (
                              <>
                                <XCircle size={13} /> Suspensa
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setSelectedCompany(company)}
                              className="p-1.5 text-sky-400 hover:text-sky-300"
                              title="Ver detalhes"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => setEditingCompany(company)}
                              className="p-1.5 text-[#f5b51b] hover:text-amber-300"
                              title="Editar"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteCompany(company.id)}
                              className="p-1.5 text-red-400 hover:text-red-300"
                              title="Suspender"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ABA 2: PAGAMENTOS PIX */}
        {activeTab === 'payments' && (
          <div className="bd-panel overflow-hidden p-0">
            <div className="flex flex-col justify-between gap-4 border-b border-white/10 p-6 sm:flex-row sm:items-center">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                  <FileCheck2 size={20} className="text-[#f5b51b]" />
                  <span>Gerenciamento de Pagamentos PIX</span>
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Confira o comprovante na Caixa Econômica Federal antes de liberar o acesso.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setPaymentFilter(status)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                      paymentFilter === status
                        ? 'bg-[#f5b51b] text-[#15120b]'
                        : 'bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {status === 'ALL'
                      ? 'Todos'
                      : status === 'PENDING'
                        ? `Pendentes (${paymentCounts.pending})`
                        : status === 'APPROVED'
                          ? `Aprovados (${paymentCounts.approved})`
                          : `Rejeitados (${paymentCounts.rejected})`}
                  </button>
                ))}
              </div>
            </div>

            {filteredPayments.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-400">
                Nenhuma solicitação de pagamento encontrada para este filtro.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#0d1117] text-xs uppercase text-slate-400">
                    <tr>
                      <th className="px-5 py-3 text-left">Cliente / Barbearia</th>
                      <th className="px-5 py-3 text-left">Plano & Valor</th>
                      <th className="px-5 py-3 text-left">Solicitado em</th>
                      <th className="px-5 py-3 text-left">Comprovante</th>
                      <th className="px-5 py-3 text-left">Status</th>
                      <th className="px-5 py-3 text-left">Ações / Auditoria</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-white/[0.02]">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-white">{p.company.name}</div>
                          <div className="text-xs text-slate-400">
                            {p.company.fullName} • {p.company.email}
                          </div>
                          {p.payerNote && (
                            <div className="mt-1 text-xs text-amber-200/80">
                              Obs: {p.payerNote}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-semibold text-white">{getPlanName(p.plan)}</div>
                          <div className="font-bold text-[#f5b51b]">
                            {formatCurrencyBRL(p.amount)}
                          </div>
                          {p.contractAcceptance && <a href={`/api/contracts/${p.contractAcceptance.id}?download=true`} className="mt-2 block text-xs text-amber-300 underline">Contrato / aditivo aceito</a>}
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-300">
                          {formatBr(p.submittedAt)}
                        </td>
                        <td className="px-5 py-4">
                          {p.hasProof ? (
                            <a
                              href={`/api/subscription/proof/${p.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg bg-sky-500/15 px-2.5 py-1 text-xs font-semibold text-sky-300 hover:bg-sky-500/25"
                            >
                              <Eye size={13} /> Abrir
                            </a>
                          ) : (
                            <span className="text-xs text-slate-500">Sem anexo</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {p.status === 'PENDING' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-[#f5b51b]">
                              <Clock3 size={12} /> Pendente
                            </span>
                          )}
                          {p.status === 'APPROVED' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                              <CheckCircle2 size={12} /> Aprovado
                            </span>
                          )}
                          {p.status === 'REJECTED' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-semibold text-red-400">
                              <XCircle size={12} /> Rejeitado
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {p.status === 'PENDING' ? (
                            <div className="flex items-center gap-2">
                              <button
                                disabled={actionLoadingId === p.id}
                                onClick={() => handleApprovePayment(p)}
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                              >
                                Aprovar
                              </button>
                              <button
                                disabled={actionLoadingId === p.id}
                                onClick={() => {
                                  setRejectingPayment(p)
                                  setRejectionReason('')
                                }}
                                className="rounded-lg bg-red-600/80 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-50"
                              >
                                Rejeitar
                              </button>
                            </div>
                          ) : (
                            <div className="text-xs text-slate-400">
                              {p.status === 'APPROVED'
                                ? `Por ${p.reviewedByName || 'SuperAdmin'} em ${formatBr(p.reviewedAt)} • Vence ${formatBr(p.periodEnd)}`
                                : `Rejeitado em ${formatBr(p.reviewedAt)}: ${p.rejectionReason || ''}`}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ABA 3: LEMBRETES & NOTIFICAÇÕES */}
        {activeTab === 'notifications' && (
          <div className="bd-panel overflow-hidden p-0">
            <div className="flex flex-col justify-between gap-4 border-b border-white/10 p-6 sm:flex-row sm:items-center">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                  <Bell size={20} className="text-[#f5b51b]" />
                  <span>Histórico de Lembretes Automáticos (Fuso Brasília)</span>
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Lembretes de 7, 4 e 1 dia antes do vencimento, dia do vencimento, atraso, aprovação e bloqueio.
                </p>
              </div>
              <button
                onClick={handleRunReminders}
                disabled={cronRunning}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#f5b51b] to-[#dc9b2d] px-4 py-2 text-xs font-bold text-[#15120b] disabled:opacity-50"
              >
                <Send size={14} />
                <span>{cronRunning ? 'Executando rotina...' : 'Executar Rotina Diária Agora'}</span>
              </button>
            </div>

            {notificationLogs.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-400">
                Nenhuma notificação de assinatura registrada ainda.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#0d1117] text-xs uppercase text-slate-400">
                    <tr>
                      <th className="px-5 py-3 text-left">Data/Hora</th>
                      <th className="px-5 py-3 text-left">Barbearia</th>
                      <th className="px-5 py-3 text-left">Tipo</th>
                      <th className="px-5 py-3 text-left">Canal</th>
                      <th className="px-5 py-3 text-left">Status</th>
                      <th className="px-5 py-3 text-left">Mensagem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {notificationLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/[0.02]">
                        <td className="px-5 py-3.5 text-xs text-slate-300">
                          {new Date(log.sentAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                        </td>
                        <td className="px-5 py-3.5 font-medium text-white">
                          {log.company?.name || log.companyId}
                        </td>
                        <td className="px-5 py-3.5 text-xs font-semibold text-[#f5b51b]">
                          {log.type}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-300">{log.channel}</td>
                        <td className="px-5 py-3.5 text-xs">
                          <span
                            className={`rounded-full px-2 py-0.5 font-semibold ${
                              log.status === 'SENT'
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : log.status === 'SKIPPED'
                                  ? 'bg-slate-500/20 text-slate-300'
                                  : 'bg-red-500/15 text-red-400'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="max-w-md truncate px-5 py-3.5 text-xs text-slate-400">
                          {log.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Detalhes da Empresa */}
      {selectedCompany && (
        <SaasModal title={<>{selectedCompany.name}</>} description="Gerencie os dados da barbearia e sua assinatura." icon="company" onClose={() => setSelectedCompany(null)}>
            <div className="space-y-2 text-sm text-slate-300">
              <p><strong>Responsável:</strong> {selectedCompany.owner}</p>
              <p><strong>CPF:</strong> {selectedCompany.cpf}</p>
              <p><strong>Email:</strong> {selectedCompany.email}</p>
              <p><strong>Telefone:</strong> {selectedCompany.phone}</p>
              <p><strong>Endereço:</strong> {selectedCompany.address}</p>
              <p><strong>Assinatura:</strong> {selectedCompany.subscriptionStatus || 'TRIAL'}</p>
              <p><strong>Cadastro:</strong> {selectedCompany.joinDate}</p>
            </div>
          </SaasModal>
      )}

      {/* Modal Editar Empresa */}
      {editingCompany && (
        <SaasModal title={<>Editar Barbearia</>} description="Gerencie os dados da barbearia e sua assinatura." icon="company" onClose={() => setEditingCompany(null)}>
            <form onSubmit={handleUpdateCompany} className="space-y-4">
              <SaasField label="Nome da Barbearia" required>
                <input
                  type="text"
                  required
                  value={editingCompany.name}
                  onChange={(e) => setEditingCompany({ ...editingCompany, name: e.target.value })}
                  className={saasInputClass}
                />
              </SaasField>
              <SaasField label="Proprietário" required>
                <input
                  type="text"
                  required
                  value={editingCompany.owner}
                  onChange={(e) => setEditingCompany({ ...editingCompany, owner: e.target.value })}
                  className={saasInputClass}
                />
              </SaasField>
              <SaasField label="Plano" hint="Mudanças exigem contrato ou aditivo aceito pela barbearia e aprovação do pagamento correspondente.">
                <select
                  disabled
                  value={editingCompany.plan}
                  onChange={(e) =>
                    setEditingCompany({
                      ...editingCompany,
                      plan: e.target.value as CompanyItem['plan']
                    })
                  }
                  className={saasInputClass}
                >
                  {AVAILABLE_PLANS.map(plan => <option key={plan.code} value={plan.code}>{plan.name} ({formatCurrencyBRL(plan.price)})</option>)}
                </select>
              </SaasField>
              <div className="flex justify-end space-x-3 pt-2 saas-modal-actions">
                <button
                  type="button"
                  onClick={() => setEditingCompany(null)}
                  className="rounded-xl px-4 py-2 text-sm text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-[#f5b51b] to-[#dc9b2d] px-4 py-2 text-sm font-bold text-[#15120b]"
                >
                  Salvar
                </button>
              </div>
            </form>
          </SaasModal>
      )}

      {/* Modal Rejeitar Pagamento */}
      {rejectingPayment && (
        <SaasModal title={<>Rejeitar Pagamento PIX</>} tone="danger" description="Gerencie os dados da barbearia e sua assinatura." icon="company" onClose={() => setRejectingPayment(null)}>
            <p className="mb-4 text-xs text-slate-400">
              Barbearia: <strong className="text-white">{rejectingPayment.company.name}</strong> ({formatCurrencyBRL(rejectingPayment.amount)})
            </p>
            <form onSubmit={handleRejectPayment} className="space-y-4">
              <SaasField label="Motivo da Rejeição" required>
                <textarea
                  required
                  minLength={3}
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Ex: Comprovante ilegível ou transferência não localizada na conta."
                  className={saasInputClass}
                />
              </SaasField>
              <div className="flex justify-end space-x-3 saas-modal-actions">
                <button
                  type="button"
                  onClick={() => setRejectingPayment(null)}
                  className="rounded-xl px-4 py-2 text-sm text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoadingId === rejectingPayment.id}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-50"
                >
                  Confirmar Rejeição
                </button>
              </div>
            </form>
          </SaasModal>
      )}
    </div>
  )
}
