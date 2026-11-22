'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Save,
  Upload,
  Trash2,
  MapPin,
  MessageSquare,
  Clock,
  Bell,
  Globe,
  QrCode,
  Copy
} from 'lucide-react'
import CompanyGallery from '@/components/CompanyGallery'
import WaitingRoomManager from '@/components/WaitingRoomManager'
import { Monitor } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { formatCEP, formatPhone } from '@/lib/masks'
import {
  SaasAlert,
  SaasField,
  SaasPageHeader,
  SaasSectionCard,
  SaasSubmitButton,
  saasInputClass
} from '@/components/ui/SaasUI'

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

const AMENITY_OPTIONS = [
  'Wi-Fi Grátis',
  'Ar-condicionado',
  'Estacionamento',
  'Café / Cerveja',
  'Acessibilidade',
  'Espaço Kids'
]

const PAYMENT_OPTIONS = ['PIX', 'Dinheiro', 'Cartão de Débito', 'Cartão de Crédito']

export default function Configuracoes() {
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoInputKey, setLogoInputKey] = useState(0)
  const [activeTab, setActiveTab] = useState('general')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

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
    city: '',
    neighborhood: '',
    zipCode: '',
    reference: '',
    instagram: '',
    latitude: -23.5505,
    longitude: -46.6333,
    showOnMap: true,
    amenities: [] as string[],
    acceptedPayments: ['PIX', 'Dinheiro', 'Cartão de Débito', 'Cartão de Crédito'] as string[]
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
    minAdvanceMinutes: 30,
    cancellationDeadline: 2,
    autoConfirm: false,
    allowOnlinePayment: true,
    requirePrepaymentToConfirm: false,
    paymentDeadlineHours: 2,
    pixKey: '',
    pixBeneficiary: '',
    pixBank: ''
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
        if (data.general) {
          setGeneralSettings((prev) => ({ ...prev, ...data.general }))
          setLogoUrl(data.general.logoUrl || null)
        }
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
    void loadSettings()
  }, [loadSettings])

  useEffect(() => {
    if (!logoFile) { setLogoPreview(''); return }
    const preview = URL.createObjectURL(logoFile)
    setLogoPreview(preview)
    return () => URL.revokeObjectURL(preview)
  }, [logoFile])

  const handleLogo = async (remove = false) => {
    if (uploadingLogo || (!remove && !logoFile)) return
    setUploadingLogo(true)
    setFeedback(null)
    try {
      const form = new FormData()
      if (logoFile) form.append('logo', logoFile)
      const res = await apiFetch('/api/settings/logo', { method: remove ? 'DELETE' : 'POST', ...(remove ? {} : { body: form }) })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Não foi possível atualizar a logomarca.')
      setLogoUrl(body.logoUrl)
      setLogoFile(null)
      setLogoInputKey(key => key + 1)
      window.dispatchEvent(new Event('company-branding-updated'))
      setFeedback({ type: 'success', text: body.message })
    } catch (error) {
      setFeedback({ type: 'error', text: error instanceof Error ? error.message : 'Erro ao atualizar logomarca.' })
    } finally { setUploadingLogo(false) }
  }

    const handleSave = async (e?: React.FormEvent) => {
      if (e) e.preventDefault()
      if (saving) return
      setSaving(true)
      setFeedback(null)
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

        const body = await res.json().catch(() => ({}))
        if (res.ok) {
          window.dispatchEvent(new Event('company-branding-updated'))
          setFeedback({ type: 'success', text: body.message || 'Configurações salvas com sucesso!' })
        } else {
          setFeedback({ type: 'error', text: body.error || 'Erro ao salvar configurações.' })
        }
      } catch (error) {
        console.error('Erro ao salvar configurações:', error)
        setFeedback({ type: 'error', text: 'Erro de conexão ao salvar configurações.' })
      } finally {
        setSaving(false)
      }
    }

    const copyMondayToWeekdays = () => {
      const mon = businessHours.monday
      setBusinessHours((prev) => ({
        ...prev,
        tuesday: { ...mon },
        wednesday: { ...mon },
        thursday: { ...mon },
        friday: { ...mon }
      }))
      setFeedback({ type: 'success', text: 'Horário de segunda-feira aplicado de terça a sexta-feira.' })
    }

    const toggleArrayItem = (field: 'amenities' | 'acceptedPayments', value: string) => {
      setLocationSettings((prev) => {
        const current = prev[field]
        const next = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value]
        return { ...prev, [field]: next }
      })
    }

    const tabs = [
      { id: 'general', label: 'Geral', icon: Globe },
      { id: 'display', label: 'Painel do Salão', icon: Monitor },
      { id: 'hours', label: 'Horários & Pausa', icon: Clock },
      { id: 'location', label: 'Busca Local & Vitrine', icon: MapPin },
      { id: 'appointments', label: 'Agendamentos & PIX', icon: QrCode },
      { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
      { id: 'notifications', label: 'Notificações', icon: Bell }
    ]

    if (loading) {
      return (
          <div className="space-y-4">
            <div className="h-20 animate-pulse rounded-2xl bg-white/5" />
            <div className="h-96 animate-pulse rounded-2xl bg-white/5" />
          </div>
          )
  }

          return (
              <form onSubmit={handleSave} className="space-y-6">
                <SaasPageHeader
                  kicker="Personalização da Barbearia"
                  title="Configurações Operacionais e Vitrine"
                  subtitle="Defina horários de atendimento, busca local, regras de cancelamento (2h) e recebimento via PIX."
                  actions={
                    <SaasSubmitButton loading={saving} loadingText="Salvando...">
                      <Save size={16} />
                      <span>Salvar Configurações</span>
                    </SaasSubmitButton>
                  }
                />

            {feedback && <SaasAlert variant={feedback.type} message={feedback.text} />}

              <SaasSectionCard className="p-0 overflow-hidden">
                {/* Tabs Navigation */}
                    <div className="overflow-x-auto border-b border-white/10">
                      <nav className="flex space-x-2 px-4 sm:px-6" aria-label="Abas de configuração">
                        {tabs.map((tab) => {
                          const Icon = tab.icon
                          const active = activeTab === tab.id
                          return (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => setActiveTab(tab.id)}
                              className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-4 text-xs font-semibold transition sm:text-sm ${active
                                  ? 'border-[#f5b51b] text-[#f5b51b]'
                                  : 'border-transparent text-slate-400 hover:text-white'
                                }`}
                            >
                              <Icon size={16} />
                              <span>{tab.label}</span>
                            </button>
                          )
                        })}
                      </nav>
                    </div>

                    <div className="p-6">
                      {/* ABA 1: GERAL */}
                      {activeTab === 'display' && <WaitingRoomManager compact />}
                      {activeTab === 'general' && (
                              <div className="space-y-5">
                                <div className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-[#0d1117] p-5 sm:flex-row sm:items-center">
                                  <div className="flex h-24 w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/20">
                                    {logoPreview || logoUrl ? (
                                      // eslint-disable-next-line @next/next/no-img-element -- Local upload preview and authenticated original image.
                                      <img src={logoPreview || logoUrl || ''} alt="Prévia da logomarca da barbearia" className="h-full w-full object-contain p-2" />
                                    ) : <span className="px-3 text-center text-xs text-slate-500">Sua logomarca</span>}
                                  </div>
                                  <div className="min-w-0 flex-1 space-y-3">
                                    <SaasField label="Logomarca da Barbearia" htmlFor="cfg-logo" hint="PNG, JPG ou WEBP, até 2 MB. A imagem aparece no topo do menu lateral.">
                                      <input key={logoInputKey} id="cfg-logo" type="file" accept="image/png,image/jpeg,image/webp" disabled={uploadingLogo} className={`${saasInputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-amber-400/15 file:px-3 file:py-1 file:text-amber-300`} onChange={e => {
                                        const file = e.target.files?.[0] || null
                                        if (file && (file.size > 2 * 1024 * 1024 || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type))) {
                                          setFeedback({ type: 'error', text: 'Selecione uma imagem PNG, JPG ou WEBP de até 2 MB.' })
                                          e.target.value = ''
                                          setLogoFile(null)
                                          return
                                        }
                                        setLogoFile(file)
                                      }} />
                                    </SaasField>
                                    <div className="flex flex-wrap gap-3">
                                      <button type="button" disabled={!logoFile || uploadingLogo} onClick={() => void handleLogo()} className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-black disabled:opacity-40"><Upload size={15} />{uploadingLogo ? 'Atualizando...' : 'Enviar logomarca'}</button>
                                      {logoUrl && <button type="button" disabled={uploadingLogo} onClick={() => void handleLogo(true)} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-xs text-slate-300 disabled:opacity-40"><Trash2 size={15} />Remover logomarca</button>}
                                    </div>
                                  </div>
                                </div>

                                <CompanyGallery />
                                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                  <SaasField label="Nome da Barbearia" required htmlFor="cfg-name">
                                    <input
                                      id="cfg-name"
                                      type="text"
                                      required
                                      value={generalSettings.name}
                                      onChange={(e) => setGeneralSettings({ ...generalSettings, name: e.target.value })}
                                      className={saasInputClass}
                                    />
                                </SaasField>

                                <SaasField label="Telefone / WhatsApp Público" required htmlFor="cfg-phone">
                                  <input
                                    id="cfg-phone"
                                    type="tel"
                                    required
                                    maxLength={15}
                                    value={generalSettings.phone}
                                    onChange={(e) =>
                      setGeneralSettings({...generalSettings, phone: formatPhone(e.target.value) })
                    }
                                  className={saasInputClass}
                                  placeholder="(11) 99999-9999"
                  />
                              </SaasField>

                              <SaasField label="E-mail da Barbearia" required htmlFor="cfg-email">
                                <input
                                  id="cfg-email"
                                  type="email"
                                  required
                                  value={generalSettings.email}
                                  onChange={(e) => setGeneralSettings({ ...generalSettings, email: e.target.value })}
                                  className={saasInputClass}
                                />
                            </SaasField>

                            <SaasField label="Website" htmlFor="cfg-site">
                              <input
                                id="cfg-site"
                                type="url"
                                value={generalSettings.website}
                                onChange={(e) => setGeneralSettings({ ...generalSettings, website: e.target.value })}
                                className={saasInputClass}
                                placeholder="https://suabarbearia.com.br"
                              />
                        </SaasField>
              </div>

                      <SaasField label="Endereço Completo" required htmlFor="cfg-address">
                        <input
                          id="cfg-address"
                          type="text"
                          required
                          value={generalSettings.address}
                          onChange={(e) => setGeneralSettings({ ...generalSettings, address: e.target.value })}
                          className={saasInputClass}
                        />
                    </SaasField>

                    <SaasField label="Descrição na Vitrine Pública" htmlFor="cfg-desc">
                      <textarea
                        id="cfg-desc"
                        rows={3}
                        value={generalSettings.description}
                        onChange={(e) => setGeneralSettings({ ...generalSettings, description: e.target.value })}
                        className={saasInputClass}
                      />
                  </SaasField>
                </div>
          )}

                      {/* ABA 2: HORÁRIOS & PAUSA */}
                      {activeTab === 'hours' && (
                        <div className="space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0d1117] p-3.5 text-xs text-slate-300">
                            <span>Configure os dias abertos, abertura, fechamento e horário de almoço/pausa (fuso de Brasília).</span>
                            <button
                              type="button"
                              onClick={copyMondayToWeekdays}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-[#f5b51b]/15 px-3 py-1.5 font-semibold text-[#f5b51b] hover:bg-[#f5b51b]/25"
                            >
                              <Copy size={13} />
                              <span>Aplicar Segunda para Ter–Sex</span>
                            </button>
                          </div>

              {daysOfWeek.map(({ key, label }) => {
                const day = businessHours[key] || {
                  isOpen: true,
                  openTime: '09:00',
                  closeTime: '19:00',
                  breakStart: '',
                  breakEnd: ''
                }
                return (
                  <div
                    key={key}
                    className="flex flex-col justify-between gap-4 rounded-xl border border-white/10 bg-[#0d1117] p-4 lg:flex-row lg:items-center"
                  >
                    <label className="flex min-w-[160px] cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={day.isOpen}
                        onChange={(e) =>
                          setBusinessHours({
                            ...businessHours,
                            [key]: { ...day, isOpen: e.target.checked }
                          })
                        }
                        className="h-4 w-4 accent-[#f5b51b]"
                      />
                      <span className="text-sm font-semibold text-white">{label}</span>
                    </label>

                    {day.isOpen ? (
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">Expediente:</span>
                          <input
                            type="time"
                            value={day.openTime}
                            onChange={(e) =>
                              setBusinessHours({
                                ...businessHours,
                                [key]: { ...day, openTime: e.target.value }
                              })
                            }
                            className="rounded-lg border border-white/10 bg-[#141920] px-2.5 py-1.5 text-white"
                          />
                          <span className="text-slate-400">até</span>
                          <input
                            type="time"
                            value={day.closeTime}
                            onChange={(e) =>
                              setBusinessHours({
                                ...businessHours,
                                [key]: { ...day, closeTime: e.target.value }
                              })
                            }
                            className="rounded-lg border border-white/10 bg-[#141920] px-2.5 py-1.5 text-white"
                          />
                        </div>

                        <div className="flex items-center gap-2 border-l border-white/10 pl-3">
                          <span className="text-slate-400">Intervalo/Almoço:</span>
                          <input
                            type="time"
                            value={day.breakStart || ''}
                            onChange={(e) =>
                              setBusinessHours({
                                ...businessHours,
                                [key]: { ...day, breakStart: e.target.value }
                              })
                            }
                            className="rounded-lg border border-white/10 bg-[#141920] px-2.5 py-1.5 text-white"
                          />
                          <span className="text-slate-400">até</span>
                          <input
                            type="time"
                            value={day.breakEnd || ''}
                            onChange={(e) =>
                              setBusinessHours({
                                ...businessHours,
                                [key]: { ...day, breakEnd: e.target.value }
                              })
                            }
                            className="rounded-lg border border-white/10 bg-[#141920] px-2.5 py-1.5 text-white"
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-slate-500">Fechado neste dia</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ABA 3: BUSCA LOCAL & VITRINE */}
          {activeTab === 'location' && (
            <div className="space-y-6">
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#f5b51b]/25 bg-[#f5b51b]/10 p-4">
                <input
                  type="checkbox"
                  checked={locationSettings.showOnMap}
                  onChange={(e) =>
                    setLocationSettings({ ...locationSettings, showOnMap: e.target.checked })
                  }
                  className="h-4 w-4 accent-[#f5b51b]"
                />
                <div className="text-sm">
                  <p className="font-semibold text-white">Exibir barbearia na busca pública (/cliente)</p>
                  <p className="text-xs text-slate-300">
                    Permite que clientes da sua região encontrem sua barbearia pela cidade, bairro ou serviços.
                  </p>
                </div>
              </label>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <SaasField label="Cidade" htmlFor="loc-city">
                  <input
                    id="loc-city"
                    type="text"
                    value={locationSettings.city}
                    onChange={(e) => setLocationSettings({ ...locationSettings, city: e.target.value })}
                    className={saasInputClass}
                    placeholder="Ex: São Paulo"
                  />
                </SaasField>

                <SaasField label="Bairro" htmlFor="loc-neighborhood">
                  <input
                    id="loc-neighborhood"
                    type="text"
                    value={locationSettings.neighborhood}
                    onChange={(e) =>
                      setLocationSettings({ ...locationSettings, neighborhood: e.target.value })
                    }
                    className={saasInputClass}
                    placeholder="Ex: Centro"
                  />
                </SaasField>

                <SaasField label="CEP" htmlFor="loc-zip">
                  <input
                    id="loc-zip"
                    type="text"
                    maxLength={9}
                    value={locationSettings.zipCode}
                    onChange={(e) =>
                      setLocationSettings({ ...locationSettings, zipCode: formatCEP(e.target.value) })
                    }
                    className={saasInputClass}
                    placeholder="00000-000"
                  />
                </SaasField>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <SaasField label="Ponto de Referência" htmlFor="loc-ref">
                  <input
                    id="loc-ref"
                    type="text"
                    value={locationSettings.reference}
                    onChange={(e) => setLocationSettings({ ...locationSettings, reference: e.target.value })}
                    className={saasInputClass}
                    placeholder="Ex: Próximo à praça central"
                  />
                </SaasField>

                <SaasField label="Instagram (@)" htmlFor="loc-ig">
                  <input
                    id="loc-ig"
                    type="text"
                    value={locationSettings.instagram}
                    onChange={(e) => setLocationSettings({ ...locationSettings, instagram: e.target.value })}
                    className={saasInputClass}
                    placeholder="@suabarbearia"
                  />
                </SaasField>

                <SaasField label="Latitude" htmlFor="loc-lat">
                  <input
                    id="loc-lat"
                    type="number"
                    step="any"
                    value={locationSettings.latitude}
                    onChange={(e) =>
                      setLocationSettings({
                        ...locationSettings,
                        latitude: parseFloat(e.target.value) || 0
                      })
                    }
                    className={saasInputClass}
                  />
                </SaasField>

                <SaasField label="Longitude" htmlFor="loc-lng">
                  <input
                    id="loc-lng"
                    type="number"
                    step="any"
                    value={locationSettings.longitude}
                    onChange={(e) =>
                      setLocationSettings({
                        ...locationSettings,
                        longitude: parseFloat(e.target.value) || 0
                      })
                    }
                    className={saasInputClass}
                  />
                </SaasField>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2.5">
                  <p className="text-xs font-semibold uppercase text-slate-300">Comodidades da Barbearia</p>
                  <div className="grid grid-cols-2 gap-2">
                    {AMENITY_OPTIONS.map((item) => (
                      <label
                        key={item}
                        className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-[#0d1117] px-3 py-2 text-xs text-slate-200"
                      >
                        <input
                          type="checkbox"
                          checked={locationSettings.amenities.includes(item)}
                          onChange={() => toggleArrayItem('amenities', item)}
                          className="h-4 w-4 accent-[#f5b51b]"
                        />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2.5">
                  <p className="text-xs font-semibold uppercase text-slate-300">Pagamentos Aceitos no Local</p>
                  <div className="grid grid-cols-2 gap-2">
                    {PAYMENT_OPTIONS.map((item) => (
                      <label
                        key={item}
                        className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-[#0d1117] px-3 py-2 text-xs text-slate-200"
                      >
                        <input
                          type="checkbox"
                          checked={locationSettings.acceptedPayments.includes(item)}
                          onChange={() => toggleArrayItem('acceptedPayments', item)}
                          className="h-4 w-4 accent-[#f5b51b]"
                        />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 4: AGENDAMENTOS & PIX DA BARBEARIA */}
          {activeTab === 'appointments' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
                <SaasField label="Intervalo da Grade (min)" htmlFor="apt-slot">
                  <input
                    id="apt-slot"
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
                    className={saasInputClass}
                  />
                </SaasField>

                <SaasField label="Máx. Dias Futuros" htmlFor="apt-adv">
                  <input
                    id="apt-adv"
                    type="number"
                    min="1"
                    value={appointmentSettings.advanceBookingDays}
                    onChange={(e) =>
                      setAppointmentSettings({
                        ...appointmentSettings,
                        advanceBookingDays: parseInt(e.target.value, 10) || 30
                      })
                    }
                    className={saasInputClass}
                  />
                </SaasField>

                <SaasField label="Antecedência Mín. (min)" htmlFor="apt-min">
                  <input
                    id="apt-min"
                    type="number"
                    min="0"
                    step="15"
                    value={appointmentSettings.minAdvanceMinutes}
                    onChange={(e) =>
                      setAppointmentSettings({
                        ...appointmentSettings,
                        minAdvanceMinutes: parseInt(e.target.value, 10) || 0
                      })
                    }
                    className={saasInputClass}
                  />
                </SaasField>

                <SaasField
                  label="Prazo Cancelamento (h)"
                  htmlFor="apt-cancel"
                  hint="Padrão recomendado: 2h antes."
                >
                  <input
                    id="apt-cancel"
                    type="number"
                    min="2"
                    value={appointmentSettings.cancellationDeadline}
                    onChange={(e) =>
                      setAppointmentSettings({
                        ...appointmentSettings,
                        cancellationDeadline: Math.max(2, parseInt(e.target.value, 10) || 2)
                      })
                    }
                    className={saasInputClass}
                  />
                </SaasField>
              </div>

                      {/* Regra de PIX até 2h antes para confirmar a vaga */}
                      <div className="space-y-4 rounded-2xl border border-[#f5b51b]/30 bg-[#0d1117] p-5">
                        <label className="flex cursor-pointer items-start gap-3">
                          <input
                            type="checkbox"
                            checked={appointmentSettings.requirePrepaymentToConfirm}
                            onChange={(e) =>
                              setAppointmentSettings({
                                ...appointmentSettings,
                        requirePrepaymentToConfirm: e.target.checked,
                                autoConfirm: e.target.checked ? false : appointmentSettings.autoConfirm
                              })
                            }
                            className="mt-1 h-4 w-4 accent-[#f5b51b]"
                          />
                          <div className="text-sm">
                            <p className="font-bold text-white">
                              Exigir pagamento PIX até {appointmentSettings.paymentDeadlineHours}h antes para confirmar a vaga
                            </p>
                            <p className="mt-0.5 text-xs text-slate-300">
                              O cliente recebe sua chave PIX para pagar e avisar. Você confirma manualmente no painel de Agendamentos. Se não for confirmado até 2h antes, a vaga é cancelada automaticamente.
                            </p>
                          </div>
                        </label>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                          <SaasField label="Chave PIX da Barbearia" htmlFor="pix-key">
                            <input
                              id="pix-key"
                              type="text"
                              value={appointmentSettings.pixKey}
                              onChange={(e) =>
                                setAppointmentSettings({ ...appointmentSettings, pixKey: e.target.value })
                              }
                              className={saasInputClass}
                              placeholder="CPF, CNPJ, E-mail ou Aleatória"
                            />
                          </SaasField>

                          <SaasField label="Beneficiário PIX" htmlFor="pix-ben">
                            <input
                              id="pix-ben"
                              type="text"
                              value={appointmentSettings.pixBeneficiary}
                              onChange={(e) =>
                                setAppointmentSettings({
                                  ...appointmentSettings,
                                  pixBeneficiary: e.target.value
                                })
                              }
                              className={saasInputClass}
                              placeholder="Nome do titular da conta"
                            />
                          </SaasField>

                          <SaasField label="Banco / Instituição" htmlFor="pix-bank">
                            <input
                              id="pix-bank"
                              type="text"
                              value={appointmentSettings.pixBank}
                              onChange={(e) =>
                                setAppointmentSettings({ ...appointmentSettings, pixBank: e.target.value })
                              }
                              className={saasInputClass}
                              placeholder="Ex: Nubank, Caixa, Itaú"
                            />
                          </SaasField>

                          <SaasField label="Prazo Pagamento (horas antes)" htmlFor="pix-deadline">
                            <input
                              id="pix-deadline"
                              type="number"
                              min="1"
                              value={appointmentSettings.paymentDeadlineHours}
                              onChange={(e) =>
                                setAppointmentSettings({
                                  ...appointmentSettings,
                                  paymentDeadlineHours: Math.max(1, parseInt(e.target.value, 10) || 2)
                                })
                              }
                              className={saasInputClass}
                            />
                          </SaasField>
                        </div>
                      </div>

                      <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-300">
                        <input
                          type="checkbox"
                          disabled={appointmentSettings.requirePrepaymentToConfirm}
                          checked={appointmentSettings.autoConfirm && !appointmentSettings.requirePrepaymentToConfirm}
                          onChange={(e) =>
                            setAppointmentSettings({ ...appointmentSettings, autoConfirm: e.target.checked })
                          }
                          className="h-4 w-4 accent-[#f5b51b]"
                        />
                        <span>
                          Confirmar agendamentos automaticamente ao receber reserva online (desativado quando exige PIX antecipado)
                        </span>
                      </label>
                  </div>
                )}

                {/* ABA 5: WHATSAPP */}
                {activeTab === 'whatsapp' && (
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <SaasField label="URL da API" htmlFor="wa-url">
                      <input
                        id="wa-url"
                        type="url"
                        value={whatsappSettings.apiUrl}
                        onChange={(e) => setWhatsappSettings({ ...whatsappSettings, apiUrl: e.target.value })}
                        className={saasInputClass}
                      />
                    </SaasField>
                    <SaasField label="Token de Acesso" htmlFor="wa-token">
                      <input
                        id="wa-token"
                        type="password"
                        value={whatsappSettings.apiToken}
                        onChange={(e) => setWhatsappSettings({ ...whatsappSettings, apiToken: e.target.value })}
                        className={saasInputClass}
                      />
                    </SaasField>
                    <SaasField label="Número do WhatsApp (com DDI 55)" htmlFor="wa-num">
                      <input
                        id="wa-num"
                        type="text"
                        value={whatsappSettings.phoneNumber}
                        onChange={(e) =>
                          setWhatsappSettings({ ...whatsappSettings, phoneNumber: e.target.value })
                        }
                        className={saasInputClass}
                      />
                    </SaasField>
                    <SaasField label="Antecedência do Lembrete (horas)" htmlFor="wa-hours">
                      <input
                        id="wa-hours"
                        type="number"
                        value={whatsappSettings.reminderHours}
                        onChange={(e) =>
                          setWhatsappSettings({
                            ...whatsappSettings,
                            reminderHours: parseInt(e.target.value, 10) || 24
                          })
                        }
                        className={saasInputClass}
                      />
                    </SaasField>
                  </div>
                )}

                {/* ABA 6: NOTIFICAÇÕES */}
                {activeTab === 'notifications' && (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {(
                        [
                          { key: 'notifyNewAppointments', label: 'Notificar novos agendamentos' },
                          { key: 'notifyCancellations', label: 'Notificar cancelamentos e liberações de vaga' },
                          { key: 'notifyPayments', label: 'Notificar avisos de pagamento PIX recebidos' },
                          { key: 'notifyLowStock', label: 'Notificar alerta de estoque baixo' },
                          { key: 'whatsappNotifications', label: 'Alertas via WhatsApp' },
                          { key: 'emailNotifications', label: 'Alertas via E-mail' }
                        ] as const
                      ).map((item) => (
                        <label
                          key={item.key}
                          className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-[#0d1117] p-4"
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
                            className="h-4 w-4 accent-[#f5b51b]"
                          />
                          <span className="text-sm text-white">{item.label}</span>
                        </label>
                      ))}
                    </div>
          )}
                  </div>
        </SaasSectionCard>
    </form >
  )
}
