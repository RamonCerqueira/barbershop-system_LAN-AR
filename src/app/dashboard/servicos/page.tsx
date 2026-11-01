'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Scissors,
  Plus,
  Edit,
  Trash2,
  Clock,
  DollarSign,
  Search
} from 'lucide-react'
import { apiFetch } from '@/lib/api'

interface Service {
  id: string
  name: string
  description: string | null
  category: string
  price: number
  duration: number
  isActive: boolean
  createdAt: string
}

export default function Servicos() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Cabelo',
    price: '',
    duration: '',
    isActive: true
  })

  const loadServices = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/api/services')
      if (res.ok) {
        const data = await res.json()
        setServices(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Erro ao buscar serviços:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadServices()
  }, [loadServices])

  const handleOpenModal = (service?: Service) => {
    if (service) {
      setEditingService(service)
      setFormData({
        name: service.name,
        description: service.description || '',
        category: service.category || 'Cabelo',
        price: service.price.toString(),
        duration: service.duration.toString(),
        isActive: service.isActive
      })
    } else {
      setEditingService(null)
      setFormData({
        name: '',
        description: '',
        category: 'Cabelo',
        price: '',
        duration: '',
        isActive: true
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingService(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        price: parseFloat(formData.price),
        duration: parseInt(formData.duration, 10),
        isActive: formData.isActive
      }

      const res = editingService
        ? await apiFetch(`/api/services/${editingService.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        })
        : await apiFetch('/api/services', {
          method: 'POST',
          body: JSON.stringify(payload)
        })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao salvar serviço')
      }

      await loadServices()
      handleCloseModal()
    } catch (error: any) {
      alert(error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este serviço do banco de dados?')) return
    try {
      const res = await apiFetch(`/api/services/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setServices((prev) => prev.filter((s) => s.id !== id))
      }
    } catch (error) {
      console.error('Erro ao excluir serviço:', error)
    }
  }

  const toggleServiceStatus = async (service: Service) => {
    try {
      const res = await apiFetch(`/api/services/${service.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !service.isActive })
      })
      if (res.ok) {
        const updated = await res.json()
        setServices((prev) => prev.map((s) => (s.id === service.id ? updated : s)))
      }
    } catch (error) {
      console.error('Erro ao alterar status do serviço:', error)
    }
  }

  const filteredServices = services.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.category || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const activeServices = services.filter((s) => s.isActive).length
  const averagePrice =
    services.length > 0
      ? services.reduce((sum, s) => sum + s.price, 0) / services.length
      : 0
  const averageDuration =
    services.length > 0
      ? services.reduce((sum, s) => sum + s.duration, 0) / services.length
      : 0

  return (
    <div className="space-y-6">
      {/* Actions Bar */}
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
            placeholder="Buscar serviços por nome, categoria ou descrição..."
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          <Plus size={20} className="mr-2" />
          Novo Serviço
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Total de Serviços</p>
              <p className="text-2xl font-bold text-white">{services.length}</p>
            </div>
            <div className="p-3 bg-blue-500/20 rounded-full">
              <Scissors className="h-6 w-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Serviços Ativos</p>
              <p className="text-2xl font-bold text-green-400">{activeServices}</p>
            </div>
            <div className="p-3 bg-green-500/20 rounded-full">
              <Scissors className="h-6 w-6 text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Preço Médio</p>
              <p className="text-2xl font-bold text-orange-400">
                R$ {averagePrice.toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-orange-500/20 rounded-full">
              <DollarSign className="h-6 w-6 text-orange-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Duração Média</p>
              <p className="text-2xl font-bold text-purple-400">
                {Math.round(averageDuration)} min
              </p>
            </div>
            <div className="p-3 bg-purple-500/20 rounded-full">
              <Clock className="h-6 w-6 text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando serviços do banco...</div>
      ) : filteredServices.length === 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-12 text-center text-gray-400">
          Nenhum serviço encontrado. Clique em &ldquo;Novo Serviço&rdquo; para cadastrar.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <div
              key={service.id}
              className="bg-gray-800 border border-gray-700 rounded-xl p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-white">{service.name}</h3>
                      <span className="text-xs px-2 py-0.5 bg-gray-700 text-gray-300 rounded">
                        {service.category || 'Geral'}
                      </span>
                    </div>
                    {service.description && (
                      <p className="text-sm text-gray-400 mt-1">{service.description}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 ml-2">
                    <button
                      onClick={() => handleOpenModal(service)}
                      className="text-blue-400 hover:text-blue-300 p-1"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(service.id)}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Preço:</span>
                    <span className="text-lg font-bold text-orange-400">
                      R$ {service.price.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Duração:</span>
                    <span className="text-sm font-medium text-white">
                      {service.duration} minutos
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Status:</span>
                    <button
                      onClick={() => toggleServiceStatus(service)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-full ${service.isActive
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                        }`}
                    >
                      {service.isActive ? 'Ativo' : 'Inativo'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-700 flex items-center justify-between text-xs text-gray-500">
                <span>
                  Criado em {new Date(service.createdAt).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              {editingService ? 'Editar Serviço' : 'Novo Serviço'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Nome do Serviço *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Ex: Corte Masculino"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Categoria
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="Cabelo">Cabelo</option>
                  <option value="Barba">Barba</option>
                  <option value="Combo">Combo</option>
                  <option value="Química / Tintura">Química / Tintura</option>
                  <option value="Estética">Estética</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  rows={3}
                  placeholder="Descrição opcional do serviço"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Preço (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="25.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Duração (min) *
                  </label>
                  <input
                    type="number"
                    min="5"
                    required
                    value={formData.duration}
                    onChange={(e) =>
                      setFormData({ ...formData, duration: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="30"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-gray-600 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-300">
                  Serviço ativo para agendamento
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  {saving ? 'Salvando...' : editingService ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
