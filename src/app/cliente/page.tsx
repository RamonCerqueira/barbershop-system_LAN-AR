'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  MapPin,
  Star,
  Clock,
  Phone,
  Search,
  Calendar,
  User,
  Scissors,
  Home,
  History
} from 'lucide-react'
import Link from 'next/link'

interface Barbershop {
  id: string
  name: string
  address: string
  phone: string
  rating: number
  reviewCount: number
  priceRange: string
  isOpen: boolean
  services: { id: string; name: string; price: number; duration: number }[]
}

interface ClientAppointment {
  id: string
  barbershopId: string
  barbershopName: string
  barbershopPhone: string
  service: string
  barber: string
  date: string
  time: string
  price: number
  status: string
}

export default function ClienteApp() {
  const [activeTab, setActiveTab] = useState<'home' | 'appointments' | 'profile'>('home')
  const [searchTerm, setSearchTerm] = useState('')
  const [barbershops, setBarbershops] = useState<Barbershop[]>([])
  const [appointments, setAppointments] = useState<ClientAppointment[]>([])
  const [loading, setLoading] = useState(true)

  const [profile, setProfile] = useState({
    name: '',
    phone: '',
    email: ''
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('barberpro_client_profile')
      if (saved) {
        try {
          setProfile(JSON.parse(saved))
        } catch {
          // ignore
        }
      }
    }
  }, [])

  const loadBarbershops = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/public/barbershops?search=${encodeURIComponent(searchTerm)}`
      )
      if (res.ok) {
        setBarbershops(await res.json())
      }
    } catch (err) {
      console.error('Erro ao buscar barbearias:', err)
    } finally {
      setLoading(false)
    }
  }, [searchTerm])

  const loadMyAppointments = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (profile.phone) params.set('phone', profile.phone)
      const res = await fetch(`/api/public/appointments?${params.toString()}`)
      if (res.ok) {
        setAppointments(await res.json())
      }
    } catch (err) {
      console.error('Erro ao buscar agendamentos do cliente:', err)
    }
  }, [profile.phone])

  useEffect(() => {
    loadBarbershops()
  }, [loadBarbershops])

  useEffect(() => {
    if (activeTab === 'appointments') {
      loadMyAppointments()
    }
  }, [activeTab, loadMyAppointments])

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    localStorage.setItem('barberpro_client_profile', JSON.stringify(profile))
    alert('Perfil atualizado! Seus agendamentos serão vinculados a este telefone.')
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-24">
      {/* Header */}
      <header className="bg-black border-b border-gray-800 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-orange-500">
            BarberPro
          </Link>
          <span className="text-xs text-gray-400">Portal de Agendamento Online</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-4">
        {activeTab === 'home' && (
          <div className="space-y-6">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Buscar barbearias ou serviços..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {loading ? (
              <div className="text-center py-12 text-gray-400">
                Buscando barbearias no banco de dados...
              </div>
            ) : barbershops.length === 0 ? (
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center text-gray-400">
                Nenhuma barbearia encontrada.
              </div>
            ) : (
              <div className="space-y-4">
                {barbershops.map((shop) => (
                  <div
                    key={shop.id}
                    className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-white">{shop.name}</h3>
                        <p className="text-sm text-gray-400 flex items-center gap-1 mt-1">
                          <MapPin size={14} className="text-orange-400" />
                          {shop.address}
                        </p>
                      </div>
                      <div className="flex items-center bg-orange-500/20 text-orange-400 px-2.5 py-1 rounded-full text-xs font-bold">
                        <Star size={13} className="fill-current mr-1" />
                        {shop.rating}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {shop.services.slice(0, 4).map((s) => (
                        <span
                          key={s.id}
                          className="px-2.5 py-1 bg-gray-900 border border-gray-700 text-gray-300 text-xs rounded-lg"
                        >
                          {s.name} • R$ {s.price.toFixed(2)}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Phone size={13} /> {shop.phone}
                      </span>
                      <Link
                        href={`/cliente/barbearia/${shop.id}`}
                        className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Agendar Horário
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'appointments' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">Meus Agendamentos</h2>
            {appointments.length === 0 ? (
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center text-gray-400">
                <Calendar className="h-12 w-12 text-gray-600 mx-auto mb-2" />
                O histórico requer verificação de identidade. Para consultar um atendimento, use o link privado recebido na reserva.
              </div>
            ) : (
              appointments.map((apt) => (
                <div
                  key={apt.id}
                  className="bg-gray-800 border border-gray-700 rounded-xl p-5 flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-bold text-white">{apt.barbershopName}</h4>
                    <p className="text-sm text-gray-300 flex items-center gap-1 mt-1">
                      <Scissors size={14} className="text-orange-400" />
                      {apt.service} com {apt.barber}
                    </p>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                      <Clock size={13} />
                      {new Date(apt.date + 'T12:00:00').toLocaleDateString('pt-BR')} às{' '}
                      {apt.time}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-orange-400">
                      R$ {apt.price.toFixed(2)}
                    </p>
                    <Link
                      href={`/confirm/${apt.id}`}
                      className="text-xs text-blue-400 hover:underline mt-1 inline-block"
                    >
                      Gerenciar →
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-white">Meus Dados para Agendamento</h2>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Seu Nome</label>
                <input
                  type="text"
                  required
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  Seu Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  required
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Seu E-mail</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium"
              >
                Salvar Dados
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 px-6 py-3">
        <div className="max-w-md mx-auto flex justify-around">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center text-xs ${
              activeTab === 'home' ? 'text-orange-500' : 'text-gray-400'
            }`}
          >
            <Home size={20} />
            <span className="mt-1">Barbearias</span>
          </button>
          <button
            onClick={() => setActiveTab('appointments')}
            className={`flex flex-col items-center text-xs ${
              activeTab === 'appointments' ? 'text-orange-500' : 'text-gray-400'
            }`}
          >
            <History size={20} />
            <span className="mt-1">Agendamentos</span>
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center text-xs ${
              activeTab === 'profile' ? 'text-orange-500' : 'text-gray-400'
            }`}
          >
            <User size={20} />
            <span className="mt-1">Perfil</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
