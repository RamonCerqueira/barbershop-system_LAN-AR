'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Search,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Star
} from 'lucide-react'
import { apiFetch } from '@/lib/api'

interface Client {
  id: string
  fullName: string
  email: string | null
  phone: string
  birthDate: string | null
  address: string | null
  notes: string | null
  totalVisits: number
  totalSpent: number
  lastVisit: string | null
  rating: number | null
  whatsappConsent?: boolean
  isActive: boolean
  createdAt: string
}

export default function Clientes() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    birthDate: '',
    address: '',
    notes: '',
    whatsappConsent: true,
    isActive: true
  })

  const loadClients = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/api/clients')
      if (res.ok) {
        const data = await res.json()
        setClients(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Erro ao buscar clientes:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadClients()
  }, [loadClients])

  const handleOpenModal = (client?: Client) => {
    if (client) {
      setEditingClient(client)
      setFormData({
        fullName: client.fullName,
        email: client.email || '',
        phone: client.phone,
        birthDate: client.birthDate
          ? new Date(client.birthDate).toISOString().split('T')[0]
          : '',
        address: client.address || '',
        notes: client.notes || '',
        whatsappConsent: Boolean(client.whatsappConsent),
        isActive: client.isActive
      })
    } else {
      setEditingClient(null)
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        birthDate: '',
        address: '',
        notes: '',
        whatsappConsent: true,
        isActive: true
      })
    }
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const res = editingClient
        ? await apiFetch(`/api/clients/${editingClient.id}`, {
            method: 'PUT',
            body: JSON.stringify(formData)
          })
        : await apiFetch('/api/clients', {
            method: 'POST',
            body: JSON.stringify(formData)
          })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao salvar cliente')
      }

      await loadClients()
      setShowModal(false)
    } catch (error: any) {
      alert(error.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este cliente do banco?')) return
    try {
      const res = await apiFetch(`/api/clients/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setClients((prev) => prev.filter((c) => c.id !== id))
      }
    } catch (error) {
      console.error('Erro ao excluir cliente:', error)
    }
  }

  const filteredClients = clients.filter(
    (c) =>
      c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalClients = clients.length
  const activeClients = clients.filter((c) => c.isActive).length
  const totalRevenue = clients.reduce((sum, c) => sum + (c.totalSpent || 0), 0)
  const averageVisits =
    clients.length > 0
      ? clients.reduce((sum, c) => sum + (c.totalVisits || 0), 0) / clients.length
      : 0

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar clientes por nome, telefone ou e-mail..."
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          <Plus size={20} className="mr-2" />
          Novo Cliente
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Total de Clientes</p>
            <p className="text-2xl font-bold text-white">{totalClients}</p>
          </div>
          <Users className="h-7 w-7 text-blue-400" />
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Clientes Ativos</p>
            <p className="text-2xl font-bold text-green-400">{activeClients}</p>
          </div>
          <Users className="h-7 w-7 text-green-400" />
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Receita Acumulada</p>
            <p className="text-2xl font-bold text-orange-400">
              R$ {totalRevenue.toFixed(2)}
            </p>
          </div>
          <Star className="h-7 w-7 text-orange-400" />
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Média de Visitas</p>
            <p className="text-2xl font-bold text-purple-400">
              {Math.round(averageVisits)}
            </p>
          </div>
          <Calendar className="h-7 w-7 text-purple-400" />
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-gray-400">Carregando clientes do banco...</div>
        ) : filteredClients.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            Nenhum cliente encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900/50 border-b border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Contato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Visitas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Total Gasto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Última Visita
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-700/40">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                          <span className="text-orange-400 font-semibold">
                            {client.fullName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-white">
                            {client.fullName}
                          </div>
                          {client.birthDate && (
                            <div className="text-xs text-gray-400">
                              Nasc:{' '}
                              {new Date(client.birthDate).toLocaleDateString('pt-BR', {
                                timeZone: 'UTC'
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-200 flex items-center">
                        <Phone size={14} className="mr-1 text-gray-400" />
                        {client.phone}
                      </div>
                      {client.email && (
                        <div className="text-xs text-gray-400 flex items-center mt-0.5">
                          <Mail size={12} className="mr-1" />
                          {client.email}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                      {client.totalVisits}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-400">
                      R$ {client.totalSpent.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {client.lastVisit
                        ? new Date(client.lastVisit).toLocaleDateString('pt-BR')
                        : 'Sem visitas'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => setSelectedClient(client)}
                          className="text-orange-400 hover:text-orange-300 text-xs"
                        >
                          Detalhes
                        </button>
                        <button
                          onClick={() => handleOpenModal(client)}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(client.id)}
                          className="text-red-400 hover:text-red-300"
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
        )}
      </div>

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Telefone *</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  Data de Nascimento
                </label>
                <input
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) =>
                    setFormData({ ...formData, birthDate: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Endereço</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Observações</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  rows={2}
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  id="whatsappConsent"
                  type="checkbox"
                  checked={formData.whatsappConsent}
                  onChange={(e) =>
                    setFormData({ ...formData, whatsappConsent: e.target.checked })
                  }
                  className="h-4 w-4 accent-orange-500 rounded"
                />
                <label htmlFor="whatsappConsent" className="text-sm text-gray-300 cursor-pointer">
                  Cliente autoriza comunicações e lembretes por WhatsApp
                </label>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-300 border border-gray-600 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  {editingClient ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Client Details Modal */}
      {selectedClient && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Detalhes do Cliente</h3>
              <button
                onClick={() => setSelectedClient(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <p className="text-white font-semibold text-base">
                {selectedClient.fullName}
              </p>
              <p className="text-gray-300 flex items-center gap-2">
                <Phone size={15} /> {selectedClient.phone}
              </p>
              {selectedClient.email && (
                <p className="text-gray-300 flex items-center gap-2">
                  <Mail size={15} /> {selectedClient.email}
                </p>
              )}
              {selectedClient.address && (
                <p className="text-gray-300 flex items-center gap-2">
                  <MapPin size={15} /> {selectedClient.address}
                </p>
              )}
              {selectedClient.notes && (
                <div className="p-3 bg-gray-900 rounded-lg text-gray-300">
                  <strong>Observações:</strong> {selectedClient.notes}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-700">
                <div className="bg-gray-900 p-3 rounded-lg text-center">
                  <p className="text-xl font-bold text-orange-400">
                    {selectedClient.totalVisits}
                  </p>
                  <p className="text-xs text-gray-400">Visitas</p>
                </div>
                <div className="bg-gray-900 p-3 rounded-lg text-center">
                  <p className="text-xl font-bold text-green-400">
                    R$ {selectedClient.totalSpent.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-400">Total Gasto</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
