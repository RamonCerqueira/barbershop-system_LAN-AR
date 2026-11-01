'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle, XCircle, Calendar, Clock, Scissors, MapPin } from 'lucide-react'
import Link from 'next/link'

interface AppointmentDetails {
  id: string
  date: string
  time: string
  status: string
  price: number
  clientName: string
  serviceName: string
  duration: number
  employeeName: string
  companyName: string
  companyAddress: string
  companyPhone: string
}

export default function ConfirmAppointmentPage() {
  const params = useParams()
  const id = params?.id as string
  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    const token = new URLSearchParams(window.location.search).get('token')
    if (token) { sessionStorage.setItem('confirmation:' + id, token); window.history.replaceState(null,'',window.location.pathname) }
    fetch('/api/public/appointments/' + id, { headers: { 'X-Confirmation-Token': sessionStorage.getItem('confirmation:' + id) || '' } })
      .then(async (res) => {
        if (!res.ok) throw new Error('Agendamento não encontrado')
        return res.json()
      })
      .then((data) => setAppointment(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  const handleAction = async (status: 'CONFIRMED' | 'CANCELLED') => {
    setUpdating(true)
    try {
      const res = await fetch(`/api/public/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Confirmation-Token': sessionStorage.getItem('confirmation:' + id) || '' },
        body: JSON.stringify({ status })
      })
      const result = await res.json()
      if (!res.ok) { setError(result.error || 'Não foi possível alterar o agendamento.'); return }
      if (res.ok) {
        const updated = result
        setAppointment((prev) => (prev ? { ...prev, status: updated.status } : prev))
      }
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        Carregando dados do agendamento...
      </div>
    )
  }

  if (error || !appointment) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
        <p className="text-red-400 text-lg mb-4">{error || 'Agendamento não encontrado'}</p>
        <Link href="/cliente" className="text-orange-500 hover:underline">
          Ir para o Portal do Cliente
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-orange-500">{appointment.companyName}</h1>
          <p className="text-sm text-gray-400 mt-1">Confirmação de Agendamento</p>
        </div>

        <div className="bg-gray-900 rounded-xl p-4 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Cliente:</span>
            <span className="font-semibold text-white">{appointment.clientName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400 flex items-center gap-1">
              <Scissors size={14} /> Serviço:
            </span>
            <span className="font-semibold text-white">{appointment.serviceName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Profissional:</span>
            <span className="font-semibold text-white">{appointment.employeeName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400 flex items-center gap-1">
              <Calendar size={14} /> Data:
            </span>
            <span className="font-semibold text-white">
              {new Date(appointment.date + 'T12:00:00').toLocaleDateString('pt-BR')}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400 flex items-center gap-1">
              <Clock size={14} /> Horário:
            </span>
            <span className="font-semibold text-white">{appointment.time}</span>
          </div>
          <div className="flex justify-between border-t border-gray-800 pt-2">
            <span className="text-gray-400">Valor:</span>
            <span className="font-bold text-orange-400">
              R$ {appointment.price.toFixed(2)}
            </span>
          </div>
          <div className="text-xs text-gray-400 flex items-start gap-1 pt-1">
            <MapPin size={14} className="shrink-0 mt-0.5" />
            <span>{appointment.companyAddress}</span>
          </div>
        </div>

        {appointment.status === 'CONFIRMED' ? (
          <div className="p-4 bg-green-500/20 border border-green-500/40 rounded-xl text-center">
            <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
            <p className="font-semibold text-green-300">Presença Confirmada!</p>
            <p className="text-xs text-gray-300 mt-1">
              Te esperamos no horário agendado.
            </p>
          </div>
        ) : appointment.status === 'CANCELLED' ? (
          <div className="p-4 bg-red-500/20 border border-red-500/40 rounded-xl text-center">
            <XCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
            <p className="font-semibold text-red-300">Agendamento Cancelado</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button
              disabled={updating}
              onClick={() => handleAction('CANCELLED')}
              className="py-3 px-4 bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 rounded-xl font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              disabled={updating}
              onClick={() => handleAction('CONFIRMED')}
              className="py-3 px-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-medium transition-colors"
            >
              Confirmar Presença
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

