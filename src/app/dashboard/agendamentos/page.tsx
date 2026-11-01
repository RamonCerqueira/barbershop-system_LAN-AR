'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Calendar,
  Plus,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Phone,
  Edit,
  Trash2,
  CalendarDays
} from 'lucide-react'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'

interface Appointment {
  id: string
  clientId: string
  clientName: string
  clientPhone: string
  serviceId: string
  serviceName: string
  employeeId: string
  employeeName: string
  date: string
  time: string
  duration: number
  price: number
  status: 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
  notes: string
}

interface SelectOption {
  id: string
  name: string
  fullName?: string
  phone?: string
  price?: number
}

const getLocalDateStr = (d = new Date()) => {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function Agendamentos() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [clients, setClients] = useState<SelectOption[]>([])
  const [services, setServices] = useState<SelectOption[]>([])
  const [employees, setEmployees] = useState<SelectOption[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedDate, setSelectedDate] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [searchTerm, setSearchTerm] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editingApt, setEditingApt] = useState<Appointment | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    clientId: '',
    clientName: '',
    clientPhone: '',
    serviceId: '',
    employeeId: '',
    date: getLocalDateStr(),
    time: '09:00',
    status: 'SCHEDULED',
    notes: ''
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedDate) params.set('date', selectedDate)
      if (statusFilter && statusFilter !== 'ALL') params.set('status', statusFilter)

      const [aptRes, cliRes, svcRes, empRes] = await Promise.all([
        apiFetch(`/api/appointments?${params.toString()}`),
        apiFetch('/api/clients'),
        apiFetch('/api/services'),
        apiFetch('/api/employees')
      ])

      if (aptRes.ok) setAppointments(await aptRes.json())
      if (cliRes.ok) setClients(await cliRes.json())
      if (svcRes.ok) setServices(await svcRes.json())
      if (empRes.ok) setEmployees(await empRes.json())
    } catch (error) {
      console.error('Erro ao carregar dados de agendamentos:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedDate, statusFilter])

  useEffect(() => {
    loadData()
  }, [loadData])

  const openModal = (apt?: Appointment) => {
    if (apt) {
      setEditingApt(apt)
      setFormData({
        clientId: apt.clientId,
        clientName: apt.clientName,
        clientPhone: apt.clientPhone,
        serviceId: apt.serviceId,
        employeeId: apt.employeeId,
        date: apt.date,
        time: apt.time,
        status: apt.status,
        notes: apt.notes || ''
      })
    } else {
      setEditingApt(null)
      setFormData({
        clientId: clients[0]?.id || '',
        clientName: '',
        clientPhone: '',
        serviceId: services[0]?.id || '',
        employeeId: employees[0]?.id || '',
        date: selectedDate || getLocalDateStr(),
        time: '09:00',
        status: 'SCHEDULED',
        notes: ''
      })
    }
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = editingApt
        ? await apiFetch(`/api/appointments/${editingApt.id}`, {
            method: 'PATCH',
            body: JSON.stringify(formData)
          })
        : await apiFetch('/api/appointments', {
            method: 'POST',
            body: JSON.stringify(formData)
          })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao salvar agendamento')
      }

      await loadData()
      setShowModal(false)
    } catch (error: any) {
      alert(error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const res = await apiFetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      })
      if (res.ok) {
        await loadData()
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este agendamento?')) return
    try {
      const res = await apiFetch(`/api/appointments/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setAppointments((prev) => prev.filter((a) => a.id !== id))
      }
    } catch (error) {
      console.error('Erro ao excluir agendamento:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-blue-500/20 text-blue-400'
      case 'IN_PROGRESS':
        return 'bg-yellow-500/20 text-yellow-400'
      case 'COMPLETED':
        return 'bg-green-500/20 text-green-400'
      case 'SCHEDULED':
        return 'bg-gray-500/20 text-gray-300'
      case 'CANCELLED':
        return 'bg-red-500/20 text-red-400'
      case 'NO_SHOW':
        return 'bg-orange-500/20 text-orange-400'
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-5 w-5 text-green-400" />
      case 'IN_PROGRESS':
        return <Clock className="h-5 w-5 text-yellow-400" />
      case 'CANCELLED':
      case 'NO_SHOW':
        return <XCircle className="h-5 w-5 text-red-400" />
      default:
        return <AlertCircle className="h-5 w-5 text-blue-400" />
    }
  }

  const filteredAppointments = appointments.filter((apt) => {
    const matchesSearch =
      apt.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.employeeName.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Buscar por cliente, serviço ou colaborador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
              />
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate('')}
                  className="text-xs text-gray-400 hover:text-white underline"
                >
                  Todas as datas
                </button>
              )}
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
            >
              <option value="ALL">Todos os status</option>
              <option value="SCHEDULED">Agendado</option>
              <option value="CONFIRMED">Confirmado</option>
              <option value="IN_PROGRESS">Em andamento</option>
              <option value="COMPLETED">Concluído</option>
              <option value="CANCELLED">Cancelado</option>
              <option value="NO_SHOW">Não compareceu</option>
            </select>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/dashboard/agendamentos-calendario"
              className="inline-flex items-center px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
            >
              <CalendarDays size={18} className="mr-2 text-orange-400" />
              Calendário
            </Link>
            <button
              onClick={() => openModal()}
              className="inline-flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              <Plus size={20} className="mr-2" />
              Novo Agendamento
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Agendamentos Listados</p>
            <p className="text-2xl font-bold text-white">{filteredAppointments.length}</p>
          </div>
          <Calendar className="h-8 w-8 text-orange-500" />
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Concluídos</p>
            <p className="text-2xl font-bold text-green-400">
              {filteredAppointments.filter((a) => a.status === 'COMPLETED').length}
            </p>
          </div>
          <CheckCircle className="h-8 w-8 text-green-400" />
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Receita Prevista / Realizada</p>
            <p className="text-2xl font-bold text-orange-400">
              R${' '}
              {filteredAppointments
                .filter((a) => a.status !== 'CANCELLED')
                .reduce((sum, a) => sum + a.price, 0)
                .toFixed(2)}
            </p>
          </div>
          <Clock className="h-8 w-8 text-blue-400" />
        </div>
      </div>

      {/* Appointments List */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">
            Agendamentos ({filteredAppointments.length})
          </h3>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-400">
            Carregando agendamentos do banco...
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <Calendar className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <p>Nenhum agendamento encontrado.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {filteredAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className="p-6 hover:bg-gray-700/30 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start space-x-4">
                    <div className="mt-1">{getStatusIcon(appointment.status)}</div>
                    <div>
                      <div className="flex flex-wrap items-center gap-3 mb-1">
                        <h4 className="text-base font-semibold text-white">
                          {appointment.clientName}
                        </h4>
                        <span
                          className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${getStatusColor(
                            appointment.status
                          )}`}
                        >
                          {getStatusText(appointment.status)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-300 mt-2">
                        <div>
                          <span className="text-gray-500">Serviço:</span>{' '}
                          {appointment.serviceName}
                        </div>
                        <div>
                          <span className="text-gray-500">Profissional:</span>{' '}
                          {appointment.employeeName}
                        </div>
                        <div className="flex items-center">
                          <Phone className="h-3.5 w-3.5 mr-1 text-gray-400" />
                          {appointment.clientPhone}
                        </div>
                      </div>

                      {appointment.notes && (
                        <p className="mt-2 text-xs text-gray-400 bg-gray-900/60 px-3 py-1.5 rounded">
                          Obs: {appointment.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between lg:justify-end gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-400">
                        {new Date(appointment.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </p>
                      <p className="text-lg font-bold text-white">{appointment.time}</p>
                      <p className="text-sm font-semibold text-orange-400">
                        R$ {appointment.price.toFixed(2)} ({appointment.duration} min)
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {appointment.status === 'SCHEDULED' && (
                        <button
                          onClick={() => handleStatusChange(appointment.id, 'CONFIRMED')}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg font-medium"
                        >
                          Confirmar
                        </button>
                      )}
                      {['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'].includes(
                        appointment.status
                      ) && (
                        <button
                          onClick={() => handleStatusChange(appointment.id, 'COMPLETED')}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs rounded-lg font-medium"
                        >
                          Concluir
                        </button>
                      )}
                      <button
                        onClick={() => openModal(appointment)}
                        className="p-2 text-blue-400 hover:text-blue-300 bg-gray-900 rounded-lg"
                        title="Editar"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(appointment.id)}
                        className="p-2 text-red-400 hover:text-red-300 bg-gray-900 rounded-lg"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Novo/Editar Agendamento */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-white mb-4">
              {editingApt ? 'Editar Agendamento' : 'Novo Agendamento'}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  Cliente Cadastrado
                </label>
                <select
                  value={formData.clientId}
                  onChange={(e) =>
                    setFormData({ ...formData, clientId: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                >
                  <option value="">+ Novo Cliente Rápido (preencher abaixo)</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName || c.name} — {c.phone}
                    </option>
                  ))}
                </select>
              </div>

              {!formData.clientId && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-gray-900/60 border border-gray-700 rounded-lg">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      Nome do Cliente *
                    </label>
                    <input
                      type="text"
                      required={!formData.clientId}
                      value={formData.clientName}
                      onChange={(e) =>
                        setFormData({ ...formData, clientName: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      Telefone / WhatsApp *
                    </label>
                    <input
                      type="text"
                      required={!formData.clientId}
                      value={formData.clientPhone}
                      onChange={(e) =>
                        setFormData({ ...formData, clientPhone: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Serviço *</label>
                  <select
                    required
                    value={formData.serviceId}
                    onChange={(e) =>
                      setFormData({ ...formData, serviceId: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  >
                    <option value="">Selecione um serviço</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (R$ {Number(s.price || 0).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-1">
                    Profissional *
                  </label>
                  <select
                    required
                    value={formData.employeeId}
                    onChange={(e) =>
                      setFormData({ ...formData, employeeId: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  >
                    <option value="">Selecione um profissional</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Horário *</label>
                  <input
                    type="time"
                    required
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  >
                    <option value="SCHEDULED">Agendado</option>
                    <option value="CONFIRMED">Confirmado</option>
                    <option value="IN_PROGRESS">Em andamento</option>
                    <option value="COMPLETED">Concluído</option>
                    <option value="CANCELLED">Cancelado</option>
                    <option value="NO_SHOW">Não compareceu</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">Observações</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                />
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
                  disabled={saving}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium"
                >
                  {saving ? 'Salvando...' : editingApt ? 'Salvar' : 'Agendar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
