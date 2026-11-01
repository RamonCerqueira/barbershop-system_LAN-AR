'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Send,
  Copy,
  Check,
  X,
  Phone,
  Scissors,
  User
} from 'lucide-react'
import { apiFetch } from '@/lib/api'

interface Appointment {
  id: string
  clientName: string
  clientPhone: string
  serviceName: string
  employeeName: string
  employeeId: string
  serviceId: string
  date: string
  time: string
  duration: number
  price: number
  status: 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
  notes?: string
  confirmationLink?: string
}

interface EmployeeOption {
  id: string
  name: string
  role?: string
  isActive?: boolean
}

interface ServiceOption {
  id: string
  name: string
  duration: number
  price: number
  isActive?: boolean
}

const statusColors: Record<string, string> = {
  SCHEDULED: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  CONFIRMED: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  IN_PROGRESS: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  COMPLETED: 'bg-green-500/20 text-green-300 border-green-500/40',
  CANCELLED: 'bg-red-500/20 text-red-300 border-red-500/40',
  NO_SHOW: 'bg-gray-600/30 text-gray-400 border-gray-600'
}

const statusTranslations: Record<string, string> = {
  SCHEDULED: 'Agendado',
  CONFIRMED: 'Confirmado',
  IN_PROGRESS: 'Em Andamento',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
  NO_SHOW: 'Não Compareceu'
}

const months = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro'
]

const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const formatLocalDate = (date: Date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function AgendamentosCalendario() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    formatLocalDate(new Date())
  )
  const [viewMode, setViewMode] = useState<'month' | 'day'>('month')
  const [selectedEmployee, setSelectedEmployee] = useState<string>('ALL')
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL')

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [services, setServices] = useState<ServiceOption[]>([])
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  const [newForm, setNewForm] = useState({
    clientName: '',
    clientPhone: '',
    serviceId: '',
    employeeId: '',
    date: formatLocalDate(new Date()),
    time: '10:00',
    notes: ''
  })

  const loadCalendarData = useCallback(async () => {
    try {
      const monthStr = `${currentDate.getFullYear()}-${String(
        currentDate.getMonth() + 1
      ).padStart(2, '0')}`

      const [aptRes, empRes, svcRes] = await Promise.all([
        apiFetch(`/api/appointments?month=${monthStr}`),
        apiFetch('/api/employees'),
        apiFetch('/api/services')
      ])

      if (aptRes.ok) setAppointments(await aptRes.json())
      if (empRes.ok) {
        const empData = await empRes.json()
        setEmployees(
          Array.isArray(empData)
            ? empData.filter(
              (e: EmployeeOption) =>
                e.isActive !== false &&
                (!e.role || ['BARBER', 'PODIATRY', 'MASSAGE'].includes(e.role))
            )
            : []
        )
      }
      if (svcRes.ok) {
        const svcData = await svcRes.json()
        setServices(Array.isArray(svcData) ? svcData.filter((s: ServiceOption) => s.isActive !== false) : [])
      }
    } catch (error) {
      console.error('Erro ao carregar calendário:', error)
    }
  }, [currentDate])

  useEffect(() => {
    loadCalendarData()
  }, [loadCalendarData])

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days: (Date | null)[] = []
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    return days
  }

  const formatDate = (date: Date) => formatLocalDate(date)

  const getAppointmentsForDate = (date: string) => {
    return appointments.filter((apt) => {
      const matchesDate = apt.date === date
      const matchesEmployee =
        selectedEmployee === 'ALL' || apt.employeeId === selectedEmployee
      const matchesStatus =
        selectedStatus === 'ALL' || apt.status === selectedStatus
      return matchesDate && matchesEmployee && matchesStatus
    })
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      const next = new Date(prev)
      next.setMonth(prev.getMonth() + (direction === 'prev' ? -1 : 1))
      return next
    })
  }

  const updateAppointmentStatus = async (
    appointmentId: string,
    newStatus: Appointment['status']
  ) => {
    try {
      const res = await apiFetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      })
      if (res.ok) {
        const updated = await res.json()
        setAppointments((prev) =>
          prev.map((a) => (a.id === appointmentId ? updated : a))
        )
        setSelectedAppointment(updated)
      } else {
        const err = await res.json().catch(() => ({}))
        alert(err.error || 'Alteração de status não permitida.')
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
    }
  }

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await apiFetch('/api/appointments', {
        method: 'POST',
        body: JSON.stringify(newForm)
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao agendar')
      }
      await loadCalendarData()
      setShowNewModal(false)
    } catch (error: any) {
      alert(error.message)
    }
  }

  const getConfirmationLink = async (id: string) => {
    const res = await apiFetch('/api/appointments/' + id + '/confirmation', { method: 'POST' })
    const body = await res.json()
    if (!res.ok) throw new Error(body.error || 'Falha ao gerar link')
    return window.location.origin + body.confirmationLink
  }
  const copyConfirmationLink = async (aptId: string) => {
    let fullUrl: string
    try { fullUrl = await getConfirmationLink(aptId) } catch (error) { alert(error instanceof Error ? error.message : 'Falha ao gerar link'); return }
    navigator.clipboard.writeText(fullUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const sendWhatsAppConfirmation = async (appointment: Appointment) => {
    let fullUrl: string
    try { fullUrl = await getConfirmationLink(appointment.id) } catch (error) { alert(error instanceof Error ? error.message : "Falha ao gerar link"); return }
    const message = `Olá ${appointment.clientName}! Confirme seu agendamento de ${appointment.serviceName
      } em ${new Date(appointment.date + 'T12:00:00').toLocaleDateString('pt-BR')} às ${appointment.time
      }: ${fullUrl}`


    const cleanPhone = appointment.clientPhone.replace(/\D/g, '')
    const waPhone =
      cleanPhone.startsWith('55') && cleanPhone.length >= 12
        ? cleanPhone
        : `55${cleanPhone}`
    window.open(
      `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`,
      '_blank'
    )
  }

  const days = getDaysInMonth(currentDate)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Calendário de Agendamentos</h1>
          <p className="text-sm text-gray-400">
            Visualize os horários por mês ou dia e envie links reais de confirmação
          </p>
        </div>
        <button
          onClick={() => {
            setNewForm({
              clientName: '',
              clientPhone: '',
              serviceId: services[0]?.id || '',
              employeeId: employees[0]?.id || '',
              date: selectedDate || formatLocalDate(new Date()),
              time: '10:00',
              notes: ''
            })
            setShowNewModal(true)
          }}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Novo Agendamento</span>
        </button>
      </div>

      {/* Controls */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 hover:bg-gray-700 rounded-lg text-gray-300"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-xl font-semibold text-white">
            {months[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 hover:bg-gray-700 rounded-lg text-gray-300"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white"
          >
            <option value="ALL">Todos os profissionais</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white"
          >
            <option value="ALL">Todos os status</option>
            <option value="SCHEDULED">Agendado</option>
            <option value="CONFIRMED">Confirmado</option>
            <option value="IN_PROGRESS">Em Andamento</option>
            <option value="COMPLETED">Concluído</option>
            <option value="CANCELLED">Cancelado</option>
          </select>

          <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 rounded text-sm font-medium ${viewMode === 'month' ? 'bg-orange-500 text-white' : 'text-gray-400'
                }`}
            >
              Mês
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1 rounded text-sm font-medium ${viewMode === 'day' ? 'bg-orange-500 text-white' : 'text-gray-400'
                }`}
            >
              Dia Selecionado
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'month' ? (
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <div className="grid grid-cols-7 bg-gray-900 border-b border-gray-700">
            {weekDays.map((day) => (
              <div
                key={day}
                className="p-3 text-center text-xs font-semibold text-gray-400 uppercase"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map((day, index) => {
              if (!day) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="h-32 border-r border-b border-gray-700 bg-gray-900/40"
                  />
                )
              }

              const dateString = formatDate(day)
              const dayAppointments = getAppointmentsForDate(dateString)
              const isToday = dateString === formatDate(new Date())
              const isSelected = dateString === selectedDate

              return (
                <div
                  key={dateString}
                  onClick={() => setSelectedDate(dateString)}
                  className={`h-32 border-r border-b border-gray-700 p-2 cursor-pointer hover:bg-gray-700/40 transition-colors ${isToday ? 'bg-orange-500/10' : ''
                    } ${isSelected ? 'ring-2 ring-inset ring-orange-500' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-sm font-semibold ${isToday ? 'text-orange-400' : 'text-gray-200'
                        }`}
                    >
                      {day.getDate()}
                    </span>
                    {dayAppointments.length > 0 && (
                      <span className="text-xs bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded-full">
                        {dayAppointments.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 overflow-y-auto max-h-20">
                    {dayAppointments.map((appointment) => (
                      <div
                        key={appointment.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedAppointment(appointment)
                        }}
                        className={`text-xs p-1 rounded border cursor-pointer truncate ${statusColors[appointment.status] || statusColors.SCHEDULED
                          }`}
                      >
                        <span className="font-semibold">{appointment.time}</span>{' '}
                        {appointment.clientName}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">
              Agenda de {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR')}
            </h3>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
            />
          </div>

          {getAppointmentsForDate(selectedDate).length === 0 ? (
            <p className="text-gray-400 py-8 text-center">
              Nenhum agendamento para esta data.
            </p>
          ) : (
            <div className="space-y-3">
              {getAppointmentsForDate(selectedDate).map((apt) => (
                <div
                  key={apt.id}
                  onClick={() => setSelectedAppointment(apt)}
                  className="p-4 bg-gray-900 border border-gray-700 rounded-lg flex items-center justify-between cursor-pointer hover:border-orange-500"
                >
                  <div>
                    <p className="text-white font-semibold">
                      {apt.time} — {apt.clientName}
                    </p>
                    <p className="text-sm text-gray-400">
                      {apt.serviceName} com {apt.employeeName}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 text-xs rounded-full border ${statusColors[apt.status]
                      }`}
                  >
                    {statusTranslations[apt.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selected Appointment Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Detalhes do Agendamento
              </h3>
              <button
                onClick={() => setSelectedAppointment(null)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Cliente:</span>
                  <p className="text-white font-medium flex items-center gap-1 mt-0.5">
                    <User size={14} /> {selectedAppointment.clientName}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Telefone:</span>
                  <p className="text-white font-medium flex items-center gap-1 mt-0.5">
                    <Phone size={14} /> {selectedAppointment.clientPhone}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Serviço:</span>
                  <p className="text-white font-medium flex items-center gap-1 mt-0.5">
                    <Scissors size={14} /> {selectedAppointment.serviceName}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Profissional:</span>
                  <p className="text-white font-medium mt-0.5">
                    {selectedAppointment.employeeName}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Data e Hora:</span>
                  <p className="text-white font-medium mt-0.5">
                    {new Date(selectedAppointment.date + 'T12:00:00').toLocaleDateString(
                      'pt-BR'
                    )}{' '}
                    às {selectedAppointment.time}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Valor:</span>
                  <p className="text-orange-400 font-bold mt-0.5">
                    R$ {selectedAppointment.price.toFixed(2)}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-2">
                  Alterar Status no Banco:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      'SCHEDULED',
                      'CONFIRMED',
                      'IN_PROGRESS',
                      'COMPLETED',
                      'CANCELLED',
                      'NO_SHOW'
                    ] as const
                  ).map((st) => (
                    <button
                      key={st}
                      onClick={() =>
                        updateAppointmentStatus(selectedAppointment.id, st)
                      }
                      className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border ${selectedAppointment.status === st
                        ? statusColors[st]
                        : 'bg-gray-900 text-gray-400 border-gray-700 hover:bg-gray-700'
                        }`}
                    >
                      {statusTranslations[st]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-700 pt-4">
                <label className="block text-xs text-gray-400 mb-2">
                  Link Público de Confirmação do Cliente:
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''
                      }/confirm/${selectedAppointment.id}`}
                    className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-xs text-gray-300"
                  />
                  <button
                    onClick={() => copyConfirmationLink(selectedAppointment.id)}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs flex items-center gap-1"
                  >
                    {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedLink ? 'Copiado' : 'Copiar'}</span>
                  </button>
                  <button
                    onClick={() => sendWhatsAppConfirmation(selectedAppointment)}
                    className="px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs flex items-center gap-1"
                  >
                    <Send size={14} />
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo Agendamento */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Novo Agendamento</h3>
            <form onSubmit={handleCreateAppointment} className="space-y-4">
              <input
                type="text"
                required
                placeholder="Nome do Cliente *"
                value={newForm.clientName}
                onChange={(e) => setNewForm({ ...newForm, clientName: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
              />
              <input
                type="text"
                required
                placeholder="Telefone / WhatsApp *"
                value={newForm.clientPhone}
                onChange={(e) => setNewForm({ ...newForm, clientPhone: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
              />
              <select
                required
                value={newForm.serviceId}
                onChange={(e) => setNewForm({ ...newForm, serviceId: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
              >
                <option value="">Selecione o Serviço *</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — R$ {s.price.toFixed(2)}
                  </option>
                ))}
              </select>
              <select
                required
                value={newForm.employeeId}
                onChange={(e) => setNewForm({ ...newForm, employeeId: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
              >
                <option value="">Selecione o Profissional *</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  required
                  value={newForm.date}
                  onChange={(e) => setNewForm({ ...newForm, date: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                />
                <input
                  type="time"
                  required
                  value={newForm.time}
                  onChange={(e) => setNewForm({ ...newForm, time: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 text-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg"
                >
                  Agendar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
