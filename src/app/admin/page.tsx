'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Building2,
  DollarSign,
  Users,
  TrendingUp,
  Search,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Download,
  Crown,
  LogOut,
  RefreshCw
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api'

interface CompanyItem {
  id: string
  name: string
  owner: string
  email: string
  phone: string
  cpf: string
  address: string
  plan: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL'
  planPrice: number
  isActive: boolean
  status: string
  joinDate: string
  counts: {
    users: number
    clients: number
    appointments: number
    employees: number
    services: number
  }
}

export default function AdminDashboard() {
  const router = useRouter()
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

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

  const [selectedCompany, setSelectedCompany] = useState<CompanyItem | null>(null)
  const [editingCompany, setEditingCompany] = useState<CompanyItem | null>(null)

  const loadAdminData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch(`/api/admin/overview?period=${selectedPeriod}`)
      if (res.ok) {
        const data = await res.json()
        if (data.systemStats) setSystemStats(data.systemStats)
        if (Array.isArray(data.companies)) setCompanies(data.companies)
        if (Array.isArray(data.monthlyRevenue)) setMonthlyRevenue(data.monthlyRevenue)
      }
    } catch (error) {
      console.error('Erro ao carregar painel Super Admin:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedPeriod])

  useEffect(() => {
    loadAdminData()
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
        await loadAdminData()
      }
    } catch (error) {
      console.error('Erro ao salvar empresa:', error)
    }
  }

  const handleDeleteCompany = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta barbearia e todos os seus dados?'))
      return
    try {
      const res = await apiFetch(`/api/admin/companies/${id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        await loadAdminData()
      }
    } catch (error) {
      console.error('Erro ao excluir empresa:', error)
    }
  }

  const handleExportCsv = () => {
    const headers = ['ID', 'Barbearia', 'Proprietário', 'Email', 'Plano', 'Valor', 'Ativa', 'Data Cadastro']
    const rows = companies.map((c) => [
      c.id,
      `"${c.name}"`,
      `"${c.owner}"`,
      c.email,
      c.plan,
      c.planPrice.toFixed(2),
      c.isActive ? 'Sim' : 'Não',
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

  const getPlanName = (plan: string) => {
    switch (plan) {
      case 'MONTHLY':
        return 'Mensal'
      case 'QUARTERLY':
        return 'Trimestral'
      case 'ANNUAL':
        return 'Anual'
      default:
        return plan
    }
  }

  const filteredCompanies = companies.filter(
    (company) =>
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-black border-b border-gray-800">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Crown className="h-8 w-8 text-orange-500" />
              <div className="text-2xl font-bold text-orange-500">BarberPro</div>
            </div>
            <span className="text-gray-600">|</span>
            <h1 className="text-lg font-semibold text-white">
              Painel Super Administrativo (PostgreSQL)
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={loadAdminData}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm flex items-center gap-2"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              Atualizar
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 text-gray-300 hover:text-red-400 transition-colors text-sm"
            >
              <LogOut size={18} />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-8 max-w-7xl mx-auto">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total de Barbearias</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {systemStats.totalCompanies}
                </p>
              </div>
              <Building2 className="h-8 w-8 text-blue-400" />
            </div>
            <p className="text-xs text-green-400 mt-3">
              {systemStats.activeCompanies} ativas no sistema
            </p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">MRR (Assinaturas SaaS)</p>
                <p className="text-3xl font-bold text-green-400 mt-1">
                  R$ {systemStats.monthlyRevenue.toFixed(2)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-400" />
            </div>
            <p className="text-xs text-gray-400 mt-3">Receita contratada estimada · cobrança manual</p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Usuários Cadastrados</p>
                <p className="text-3xl font-bold text-purple-400 mt-1">
                  {systemStats.totalUsers}
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-400" />
            </div>
            <p className="text-xs text-gray-400 mt-3">
              {systemStats.totalAppointments} agendamentos totais
            </p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Volume Transacionado</p>
                <p className="text-3xl font-bold text-orange-400 mt-1">
                  R$ {systemStats.totalTransactedVolume.toFixed(2)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-400" />
            </div>
            <p className="text-xs text-gray-400 mt-3">Soma das vendas nas barbearias</p>
          </div>
        </div>

        {/* Revenue Evolution */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">
              Evolução da receita contratada estimada
            </h3>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white"
            >
              <option value="month">Últimos 6 meses</option>
              <option value="year">Anual</option>
            </select>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
            {monthlyRevenue.map((item) => (
              <div
                key={item.month}
                className="p-4 bg-gray-900 border border-gray-700 rounded-lg text-center"
              >
                <p className="text-xs text-gray-400">{item.month}</p>
                <p className="text-lg font-bold text-green-400 mt-1">
                  R$ {item.revenue.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {item.companies} barbearia(s)
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Companies Table */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-lg font-semibold text-white">
              Empresas Cadastradas ({filteredCompanies.length})
            </h3>

            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Buscar empresas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white"
                />
              </div>

              <button
                onClick={handleExportCsv}
                className="flex items-center space-x-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                <Download size={16} />
                <span>Exportar CSV</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-900/60 text-xs text-gray-400 uppercase">
                <tr>
                  <th className="px-6 py-3 text-left">Barbearia</th>
                  <th className="px-6 py-3 text-left">Proprietário</th>
                  <th className="px-6 py-3 text-left">Plano</th>
                  <th className="px-6 py-3 text-left">Valor</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Clientes / Agenda</th>
                  <th className="px-6 py-3 text-left">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredCompanies.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-700/30">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{company.name}</div>
                      <div className="text-xs text-gray-400">{company.email}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-200">{company.owner}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 text-xs rounded-full bg-orange-500/20 text-orange-400 font-medium">
                        {getPlanName(company.plan)}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-white">
                      R$ {company.planPrice.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleCompanyActive(company)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                          company.isActive
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
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
                    <td className="px-6 py-4 text-xs text-gray-300">
                      {company.counts.clients} clientes • {company.counts.appointments}{' '}
                      agendamentos
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setSelectedCompany(company)}
                          className="p-1.5 text-blue-400 hover:text-blue-300"
                          title="Ver detalhes"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => setEditingCompany(company)}
                          className="p-1.5 text-orange-400 hover:text-orange-300"
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteCompany(company.id)}
                          className="p-1.5 text-red-400 hover:text-red-300"
                          title="Excluir"
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
      </div>

      {/* Modal Detalhes */}
      {selectedCompany && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">{selectedCompany.name}</h3>
              <button
                onClick={() => setSelectedCompany(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2 text-sm text-gray-300">
              <p>
                <strong>Responsável:</strong> {selectedCompany.owner}
              </p>
              <p>
                <strong>CPF:</strong> {selectedCompany.cpf}
              </p>
              <p>
                <strong>Email:</strong> {selectedCompany.email}
              </p>
              <p>
                <strong>Telefone:</strong> {selectedCompany.phone}
              </p>
              <p>
                <strong>Endereço:</strong> {selectedCompany.address}
              </p>
              <p>
                <strong>Data de Cadastro:</strong> {selectedCompany.joinDate}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Empresa */}
      {editingCompany && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-white mb-4">Editar Barbearia</h3>
            <form onSubmit={handleUpdateCompany} className="space-y-4">
              <input
                type="text"
                value={editingCompany.name}
                onChange={(e) =>
                  setEditingCompany({ ...editingCompany, name: e.target.value })
                }
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                placeholder="Nome da Barbearia"
              />
              <input
                type="text"
                value={editingCompany.owner}
                onChange={(e) =>
                  setEditingCompany({ ...editingCompany, owner: e.target.value })
                }
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                placeholder="Proprietário"
              />
              <select
                value={editingCompany.plan}
                onChange={(e) =>
                  setEditingCompany({
                    ...editingCompany,
                    plan: e.target.value as CompanyItem['plan']
                  })
                }
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
              >
                <option value="MONTHLY">Mensal (R$ 10,00)</option>
                <option value="QUARTERLY">Trimestral (R$ 30,00)</option>
                <option value="ANNUAL">Anual (R$ 120,00)</option>
              </select>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCompany(null)}
                  className="px-4 py-2 text-gray-400"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
