'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Save,
  MapPin,
  MessageSquare,
  Clock,
  Bell,
  Globe,
  CheckCircle
} from 'lucide-react'
import { apiFetch } from '@/lib/api'

interface BusinessHours {
  [key: string]: {
    isOpen: boolean
    openTime: string
    closeTime: string
    breakStart?: string
    breakEnd?: string
  }
}

const daysOfWeek = [
  { key: 'monday', label: 'Segunda-feira' },
  { key: 'tuesday', label: 'Terça-feira' },
  { key: 'wednesday', label: 'Quarta-feira' },
  { key: 'thursday', label: 'Quinta-feira' },
  { key: 'friday', label: 'Sexta-feira' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' }
]

export default function Configuracoes() {
  const [activeTab, setActiveTab] = useState('general')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedToast, setSavedToast] = useState(false)

  const [generalSettings, setGeneralSettings] = useState({
    name: '',
    description: '',
    phone: '',
    email: '',
    address: '',
    website: ''
  })

  const [whatsappSettings, setWhatsappSettings] = useState({
    apiUrl: 'https://api.whatsapp.com',
    apiToken: '',
    phoneNumber: '',
    autoSendConfirmation: true,
    autoSendReminder: true,
    reminderHours: 24
  })

  const [locationSettings, setLocationSettings] = useState({
    latitude: -23.5505,
    longitude: -46.6333,
    googleMapsApiKey: '',
    showOnMap: true,
    deliveryRadius: 5
  })

  const [businessHours, setBusinessHours] = useState<BusinessHours>({
    monday: { isOpen: true, openTime: '08:00', closeTime: '18:00', breakStart: '12:00', breakEnd: '13:00' },
    tuesday: { isOpen: true, openTime: '08:00', closeTime: '18:00', breakStart: '12:00', breakEnd: '13:00' },
    wednesday: { isOpen: true, openTime: '08:00', closeTime: '18:00', breakStart: '12:00', breakEnd: '13:00' },
    thursday: { isOpen: true, openTime: '08:00', closeTime: '18:00', breakStart: '12:00', breakEnd: '13:00' },
    friday: { isOpen: true, openTime: '08:00', closeTime: '20:00', breakStart: '12:00', breakEnd: '13:00' },
    saturday: { isOpen: true, openTime: '08:00', closeTime: '17:00', breakStart: '12:00', breakEnd: '13:00' },
    sunday: { isOpen: false, openTime: '09:00', closeTime: '15:00', breakStart: '12:00', breakEnd: '13:00' }
  })

  const [appointmentSettings, setAppointmentSettings] = useState({
    slotDuration: 30,
    advanceBookingDays: 30,
    cancellationDeadline: 2,
    autoConfirm: false,
    allowOnlinePayment: true,
    requireDeposit: false,
    depositPercentage: 20
  })

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    whatsappNotifications: true,
    pushNotifications: true,
    notifyNewAppointments: true,
    notifyCancellations: true,
    notifyPayments: true,
    notifyLowStock: true
  })

  const loadSettings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        if (data.general) setGeneralSettings((prev) => ({ ...prev, ...data.general }))
        if (data.businessHours && Object.keys(data.businessHours).length > 0) {
          setBusinessHours((prev) => ({ ...prev, ...data.businessHours }))
        }
        if (data.appointmentConfig) {
          setAppointmentSettings((prev) => ({ ...prev, ...data.appointmentConfig }))
        }
        if (data.whatsappConfig) {
          setWhatsappSettings((prev) => ({ ...prev, ...data.whatsappConfig }))
        }
        if (data.locationConfig) {
          setLocationSettings((prev) => ({ ...prev, ...data.locationConfig }))
        }
        if (data.notificationConfig) {
          setNotificationSettings((prev) => ({ ...prev, ...data.notificationConfig }))
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await apiFetch('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({
          general: generalSettings,
          businessHours,
          appointmentConfig: appointmentSettings,
          whatsappConfig: whatsappSettings,
          locationConfig: locationSettings,
          notificationConfig: notificationSettings
        })
      })

      if (res.ok) {
        setSavedToast(true)
        setTimeout(() => setSavedToast(false), 3000)
      } else {
        alert('Erro ao salvar configurações')
      }
    } catch (error) {
      console.error('Erro ao salvar configurações:', error)
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'general', label: 'Geral', icon: Globe },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
    { id: 'location', label: 'Localização', icon: MapPin },
    { id: 'hours', label: 'Horários', icon: Clock },
    { id: 'appointments', label: 'Agendamentos', icon: Clock },
    { id: 'notifications', label: 'Notificações', icon: Bell }
  ]

  if (loading) {
    return (
      <div className="py-12 text-center text-gray-400">
        Carregando configurações do banco...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Configurações da Barbearia</h1>
          <p className="text-sm text-gray-400">
            Todas as preferências são salvas diretamente no PostgreSQL
          </p>
        </div>

        <div className="flex items-center gap-3">
          {savedToast && (
            <span className="inline-flex items-center text-sm text-green-400">
              <CheckCircle size={16} className="mr-1" /> Salvo com sucesso!
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center px-5 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium transition-colors"
          >
            <Save size={18} className="mr-2" />
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        {/* Tabs Navigation */}
        <div className="border-b border-gray-700 overflow-x-auto">
          <nav className="flex space-x-6 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === tab.id
                      ? 'border-orange-500 text-orange-400'
                      : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                >
                  <Icon size={18} className="mr-2" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">
                    Nome da Barbearia
                  </label>
                  <input
                    type="text"
                    value={generalSettings.name}
                    onChange={(e) =>
                      setGeneralSettings({ ...generalSettings, name: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Telefone</label>
                  <input
                    type="tel"
                    value={generalSettings.phone}
                    onChange={(e) =>
                      setGeneralSettings({ ...generalSettings, phone: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={generalSettings.email}
                    onChange={(e) =>
                      setGeneralSettings({ ...generalSettings, email: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Website</label>
                  <input
                    type="url"
                    value={generalSettings.website}
                    onChange={(e) =>
                      setGeneralSettings({ ...generalSettings, website: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  Endereço Completo
                </label>
                <input
                  type="text"
                  value={generalSettings.address}
                  onChange={(e) =>
                    setGeneralSettings({ ...generalSettings, address: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Descrição</label>
                <textarea
                  rows={3}
                  value={generalSettings.description}
                  onChange={(e) =>
                    setGeneralSettings({
                      ...generalSettings,
                      description: e.target.value
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
          )}

          {activeTab === 'whatsapp' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">URL da API</label>
                  <input
                    type="url"
                    value={whatsappSettings.apiUrl}
                    onChange={(e) =>
                      setWhatsappSettings({ ...whatsappSettings, apiUrl: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">
                    Token de Acesso
                  </label>
                  <input
                    type="password"
                    value={whatsappSettings.apiToken}
                    onChange={(e) =>
                      setWhatsappSettings({
                        ...whatsappSettings,
                        apiToken: e.target.value
                      })
                    }
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">
                    Número do WhatsApp (com DDI 55)
                  </label>
                  <input
                    type="text"
                    value={whatsappSettings.phoneNumber}
                    onChange={(e) =>
                      setWhatsappSettings({
                        ...whatsappSettings,
                        phoneNumber: e.target.value
                      })
                    }
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">
                    Antecedência do Lembrete (horas)
                  </label>
                  <input
                    type="number"
                    value={whatsappSettings.reminderHours}
                    onChange={(e) =>
                      setWhatsappSettings({
                        ...whatsappSettings,
                        reminderHours: parseInt(e.target.value, 10) || 24
                      })
                    }
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'location' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={locationSettings.latitude}
                  onChange={(e) =>
                    setLocationSettings({
                      ...locationSettings,
                      latitude: parseFloat(e.target.value) || 0
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={locationSettings.longitude}
                  onChange={(e) =>
                    setLocationSettings({
                      ...locationSettings,
                      longitude: parseFloat(e.target.value) || 0
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
          )}

          {activeTab === 'hours' && (
            <div className="space-y-4">
              {daysOfWeek.map(({ key, label }) => {
                const day = businessHours[key] || {
                  isOpen: true,
                  openTime: '09:00',
                  closeTime: '19:00'
                }
                return (
                  <div
                    key={key}
                    className="flex flex-wrap items-center justify-between p-4 bg-gray-900 border border-gray-700 rounded-lg gap-4"
                  >
                    <label className="flex items-center space-x-3 min-w-[160px]">
                      <input
                        type="checkbox"
                        checked={day.isOpen}
                        onChange={(e) =>
                          setBusinessHours({
                            ...businessHours,
                            [key]: { ...day, isOpen: e.target.checked }
                          })
                        }
                        className="h-4 w-4 text-orange-500 rounded"
                      />
                      <span className="text-sm font-medium text-white">{label}</span>
                    </label>
                    {day.isOpen ? (
                      <div className="flex items-center space-x-3 text-sm">
                        <input
                          type="time"
                          value={day.openTime}
                          onChange={(e) =>
                            setBusinessHours({
                              ...businessHours,
                              [key]: { ...day, openTime: e.target.value }
                            })
                          }
                          className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white"
                        />
                        <span className="text-gray-400">até</span>
                        <input
                          type="time"
                          value={day.closeTime}
                          onChange={(e) =>
                            setBusinessHours({
                              ...businessHours,
                              [key]: { ...day, closeTime: e.target.value }
                            })
                          }
                          className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white"
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">Fechado</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {activeTab === 'appointments' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">
                    Intervalo Padrão de Horários (minutos)
                  </label>
                  <input
                    type="number"
                    min="10"
                    step="5"
                    value={appointmentSettings.slotDuration}
                    onChange={(e) =>
                      setAppointmentSettings({
                        ...appointmentSettings,
                        slotDuration: parseInt(e.target.value, 10) || 30
                      })
                    }
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">
                    Máximo de Dias para Agendamento Futuro
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={appointmentSettings.advanceBookingDays}
                    onChange={(e) =>
                      setAppointmentSettings({
                        ...appointmentSettings,
                        advanceBookingDays: parseInt(e.target.value, 10) || 30
                      })
                    }
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">
                    Prazo Limite para Cancelamento (horas)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={appointmentSettings.cancellationDeadline}
                    onChange={(e) =>
                      setAppointmentSettings({
                        ...appointmentSettings,
                        cancellationDeadline: parseInt(e.target.value, 10) || 2
                      })
                    }
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={appointmentSettings.autoConfirm}
                    onChange={(e) =>
                      setAppointmentSettings({
                        ...appointmentSettings,
                        autoConfirm: e.target.checked
                      })
                    }
                    className="h-4 w-4 text-orange-500 rounded"
                  />
                  <span className="text-sm text-gray-300">
                    Confirmar agendamentos automaticamente ao receber reserva online
                  </span>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={appointmentSettings.allowOnlinePayment}
                    onChange={(e) =>
                      setAppointmentSettings({
                        ...appointmentSettings,
                        allowOnlinePayment: e.target.checked
                      })
                    }
                    className="h-4 w-4 text-orange-500 rounded"
                  />
                  <span className="text-sm text-gray-300">
                    Permitir pagamento antecipado via PIX
                  </span>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(
                [
                  { key: 'notifyNewAppointments', label: 'Notificar novos agendamentos' },
                  { key: 'notifyCancellations', label: 'Notificar cancelamentos' },
                  { key: 'notifyPayments', label: 'Notificar pagamentos e PIX recebidos' },
                  { key: 'notifyLowStock', label: 'Notificar alerta de estoque baixo' },
                  { key: 'whatsappNotifications', label: 'Alertas via WhatsApp' },
                  { key: 'emailNotifications', label: 'Alertas via E-mail' }
                ] as const
              ).map((item) => (
                <label
                  key={item.key}
                  className="flex items-center space-x-3 p-4 bg-gray-900 border border-gray-700 rounded-lg"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(notificationSettings[item.key])}
                    onChange={(e) =>
                      setNotificationSettings({
                        ...notificationSettings,
                        [item.key]: e.target.checked
                      })
                    }
                    className="h-4 w-4 text-orange-500 rounded"
                  />
                  <span className="text-sm text-white">{item.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
