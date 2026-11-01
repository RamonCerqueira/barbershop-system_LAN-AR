'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  MapPin,
  Star,
  Phone,
  Check,
  Scissors
} from 'lucide-react'
import Link from 'next/link'

interface Service {
  id: string
  name: string
  description: string
  price: number
  duration: number
  category: string
}

interface Barber {
  id: string
  name: string
  specialties: string[]
  rating: number
  experience: string
}

interface BarbershopDetail {
  id: string
  name: string
  address: string
  phone: string
  description: string
  rating: number
  reviewCount: number
  services: Service[]
  barbers: Barber[]
  availableTimes: string[]
  bookedSlots: { time: string; employeeId: string; duration: number }[]
}

const getLocalDateStr = (d = new Date()) => {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function BarbeariaDetalhes() {
  const params = useParams()
  const router = useRouter()
  const shopId = params?.id as string

  const [barbershop, setBarbershop] = useState<BarbershopDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null)
  const [selectedDate, setSelectedDate] = useState(() => getLocalDateStr())
  const [selectedTime, setSelectedTime] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [bookingKey, setBookingKey] = useState(() => crypto.randomUUID())
  useEffect(() => {
    setSelectedTime('')
    setBookingKey(crypto.randomUUID())
  }, [selectedDate, selectedService?.id, selectedBarber?.id])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('barberpro_client_profile')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (parsed.name) setClientName(parsed.name)
          if (parsed.phone) setClientPhone(parsed.phone)
        } catch {
          // ignore
        }
      }
    }
  }, [])

  const loadShop = useCallback(async () => {
    if (!shopId) return
    setLoading(true)
    try {
      const res = await fetch(
        `/api/public/barbershops/${shopId}?date=${selectedDate}&serviceId=${selectedService?.id || ""}`
      )
      if (res.ok) {
        const data = await res.json()
        setBarbershop(data)
      }
    } catch (err) {
      console.error('Erro ao buscar barbearia:', err)
    } finally {
      setLoading(false)
    }
  }, [shopId, selectedDate, selectedService?.id])

  useEffect(() => {
    loadShop()
  }, [loadShop])

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!barbershop || !selectedService || !selectedBarber || !selectedTime) {
      alert('Selecione serviço, profissional, data e horário.')
      return
    }
    if (!clientName.trim() || !clientPhone.trim()) {
      alert('Informe seu nome e telefone para confirmar o agendamento.')
      return
    }
    if (clientPhone.replace(/\D/g, '').length < 10) {
      alert('Informe um telefone válido com DDD (10 ou 11 dígitos).')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/public/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': bookingKey },
        body: JSON.stringify({
          companyId: barbershop.id,
          serviceId: selectedService.id,
          employeeId: selectedBarber.id,
          date: selectedDate,
          time: selectedTime,
          clientName,
          clientPhone,
          notes
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao agendar')
      }

      localStorage.setItem(
        'barberpro_client_profile',
        JSON.stringify({ name: clientName, phone: clientPhone })
      )

      alert('Agendamento realizado com sucesso no banco de dados!')
      router.push(data.confirmationUrl)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        Carregando barbearia...
      </div>
    )
  }

  if (!barbershop) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
        <p className="text-gray-400 mb-4">Barbearia não encontrada.</p>
        <Link href="/cliente" className="text-orange-500 hover:underline">
          Voltar para lista de barbearias
        </Link>
      </div>
    )
  }

  const availableSlotsForBarber = barbershop.availableTimes.filter((slot) => {
    if (!selectedBarber) return true
    return !barbershop.bookedSlots.some(
      (b) => ((Number(slot.slice(0, 2)) * 60 + Number(slot.slice(3))) < (Number(b.time.slice(0, 2)) * 60 + Number(b.time.slice(3))) + b.duration && (Number(b.time.slice(0, 2)) * 60 + Number(b.time.slice(3))) < (Number(slot.slice(0, 2)) * 60 + Number(slot.slice(3))) + (selectedService?.duration || 30)) && b.employeeId === selectedBarber.id
    )
  })

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-16">
      <header className="bg-black border-b border-gray-800 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center space-x-3">
          <Link href="/cliente" className="text-gray-300 hover:text-white">
            <ArrowLeft size={22} />
          </Link>
          <h1 className="text-lg font-bold text-white">{barbershop.name}</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-4 space-y-6">
        {/* Info Banner */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">{barbershop.name}</h2>
              <p className="text-sm text-gray-400 flex items-center gap-1 mt-1">
                <MapPin size={15} className="text-orange-400" /> {barbershop.address}
              </p>
              <p className="text-sm text-gray-400 flex items-center gap-1 mt-1">
                <Phone size={15} className="text-orange-400" /> {barbershop.phone}
              </p>
            </div>
            <div className="flex items-center bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full text-sm font-bold">
              <Star size={15} className="fill-current mr-1" />
              {barbershop.rating}
            </div>
          </div>
          <p className="text-sm text-gray-300">{barbershop.description}</p>
        </div>

        <form onSubmit={handleBooking} className="space-y-6">
          {/* 1. Escolha o Serviço */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">1. Escolha o Serviço</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {barbershop.services.map((service) => (
                <div
                  key={service.id}
                  onClick={() => setSelectedService(service)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedService?.id === service.id
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                    }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-white flex items-center gap-1.5">
                      <Scissors size={15} className="text-orange-400" />
                      {service.name}
                    </span>
                    <span className="font-bold text-orange-400">
                      R$ {service.price.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {service.duration} min • {service.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Escolha o Profissional */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">
              2. Escolha o Profissional
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {barbershop.barbers.map((barber) => (
                <div
                  key={barber.id}
                  onClick={() => setSelectedBarber(barber)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedBarber?.id === barber.id
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                    }`}
                >
                  <p className="font-semibold text-white">{barber.name}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {barber.specialties.join(', ') || 'Barbeiro Profissional'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Escolha Data e Horário */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">
              3. Escolha a Data e o Horário
            </h3>
            <input
              type="date"
              min={getLocalDateStr()}
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value)
                setSelectedTime('')
              }}
              className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
            />

            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-2">
              {availableSlotsForBarber.map((time) => (
                <button
                  type="button"
                  key={time}
                  onClick={() => setSelectedTime(time)}
                  className={`py-2 rounded-lg text-sm font-medium border ${selectedTime === time
                    ? 'bg-orange-500 border-orange-500 text-white'
                    : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-500'
                    }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Seus Dados */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">4. Seus Dados</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Seu Nome *</label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  placeholder="Nome completo"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  Seu WhatsApp *
                </label>
                <input
                  type="tel"
                  required
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">
                Observações (opcional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
              />
            </div>

            <button
              type="submit"
              disabled={
                submitting || !selectedService || !selectedBarber || !selectedTime
              }
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <Check size={18} />
              <span>
                {submitting ? 'Confirmando Agendamento...' : 'Confirmar Agendamento'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
