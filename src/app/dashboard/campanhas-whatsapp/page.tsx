'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  MessageSquare,
  Send,
  Users,
  CheckCircle,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  Zap
} from 'lucide-react'
import { WhatsAppCampaign, WhatsAppCampaignLog } from '@/types'
import { apiFetch } from '@/lib/api'

interface EligibleClient {
  id: string
  name: string
  phone: string
  lastVisit: string
  daysSinceLastVisit: number
  totalVisits: number
}

export default function CampanhasWhatsApp() {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'logs' | 'clients'>('campaigns')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<WhatsAppCampaign | null>(null)
  const [campaigns, setCampaigns] = useState<WhatsAppCampaign[]>([])
  const [logs, setLogs] = useState<WhatsAppCampaignLog[]>([])
  const [eligibleClients, setEligibleClients] = useState<EligibleClient[]>([])
  const [loading, setLoading] = useState(true)

  const [formData, setFormData] = useState({
    name: '',
    message: '',
    triggerDays: 15,
    isActive: true
  })

  const fetchCampaignsData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/api/whatsapp-campaigns')
      if (res.ok) {
        const data = await res.json()
        setCampaigns(Array.isArray(data.campaigns) ? data.campaigns : [])
        setLogs(Array.isArray(data.logs) ? data.logs : [])
        setEligibleClients(Array.isArray(data.eligibleClients) ? data.eligibleClients : [])
      }
    } catch (err) {
      console.error('Erro ao buscar campanhas WhatsApp:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCampaignsData()
  }, [fetchCampaignsData])

  const openModal = (campaign?: WhatsAppCampaign) => {
    if (campaign) {
      setEditingCampaign(campaign)
      setFormData({
        name: campaign.name,
        message: campaign.message || campaign.messageTemplate || '',
        triggerDays: campaign.triggerDays || campaign.recurrenceInterval || 15,
        isActive: campaign.isActive
      })
    } else {
      setEditingCampaign(null)
      setFormData({
        name: '',
        message:
          'Olá {nome}! Já faz {dias} dias desde seu último corte na {barbearia}. Que tal agendar seu horário desta semana?',
        triggerDays: 15,
        isActive: true
      })
    }
    setShowCreateModal(true)
  }

  const handleSaveCampaign = async () => {
    if (!formData.name || !formData.message) return

    try {
      const res = editingCampaign
        ? await apiFetch(`/api/whatsapp-campaigns/${editingCampaign.id}`, {
          method: 'PATCH',
          body: JSON.stringify(formData)
        })
        : await apiFetch('/api/whatsapp-campaigns', {
          method: 'POST',
          body: JSON.stringify(formData)
        })

      if (res.ok) {
        setShowCreateModal(false)
        await fetchCampaignsData()
      }
    } catch (err) {
      console.error('Erro ao salvar campanha:', err)
    }
  }

  const handleToggleActive = async (campaign: WhatsAppCampaign) => {
    try {
      const res = await apiFetch(`/api/whatsapp-campaigns/${campaign.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !campaign.isActive })
      })
      if (res.ok) {
        await fetchCampaignsData()
      }
    } catch (err) {
      console.error('Erro ao pausar/ativar campanha:', err)
    }
  }

  const handleTriggerNow = async (campaign: WhatsAppCampaign) => {
    try {
      const res = await apiFetch(`/api/whatsapp-campaigns/${campaign.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ trigger: true })
      })
      if (res.ok) {
        const result = await res.json()
        alert(`${result.queuedCount} mensagem(ns) na fila. A entrega será confirmada pelo provedor.`)
        await fetchCampaignsData()
      }
    } catch (err) {
      console.error('Erro ao disparar campanha:', err)
    }
  }

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta campanha?')) return
    try {
      const res = await apiFetch(`/api/whatsapp-campaigns/${id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        setCampaigns((prev) => prev.filter((c) => c.id !== id))
      }
    } catch (err) {
      console.error('Erro ao excluir campanha:', err)
    }
  }

  const totalSent = campaigns.reduce((sum, c) => sum + (c.totalSent || 0), 0)
  const totalResponses = campaigns.reduce((sum, c) => sum + (c.responses || 0), 0)
  const totalConversions = campaigns.reduce((sum, c) => sum + (c.conversions || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Campanhas de Recorrência WhatsApp
          </h1>
          <p className="text-sm text-gray-400">
            Configure lembretes automáticos e disparos para clientes inativos
          </p>
        </div>

        <button
          onClick={() => openModal()}
          className="inline-flex items-center px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium"
        >
          <Plus size={18} className="mr-2" />
          Nova Campanha
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Mensagens Enviadas</p>
            <p className="text-2xl font-bold text-white">{totalSent}</p>
          </div>
          <Send className="h-7 w-7 text-blue-400" />
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Respostas</p>
            <p className="text-2xl font-bold text-green-400">{totalResponses}</p>
          </div>
          <MessageSquare className="h-7 w-7 text-green-400" />
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Leituras / Conversões</p>
            <p className="text-2xl font-bold text-orange-400">{totalConversions}</p>
          </div>
          <CheckCircle className="h-7 w-7 text-orange-400" />
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Clientes Elegíveis</p>
            <p className="text-2xl font-bold text-purple-400">
              {eligibleClients.length}
            </p>
          </div>
          <Users className="h-7 w-7 text-purple-400" />
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="border-b border-gray-700 px-6 flex space-x-8">
          {(
            [
              { id: 'campaigns', label: `Campanhas (${campaigns.length})` },
              { id: 'logs', label: `Histórico de Envios (${logs.length})` },
              { id: 'clients', label: `Clientes para Retorno (${eligibleClients.length})` }
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-gray-400 hover:text-white'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-8 text-gray-400">Carregando...</div>
          ) : activeTab === 'campaigns' ? (
            <div className="space-y-4">
              {campaigns.length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  Nenhuma campanha criada ainda.
                </p>
              ) : (
                campaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="p-5 bg-gray-900 border border-gray-700 rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-white">
                          {campaign.name}
                        </h3>
                        <span
                          className={`px-2.5 py-0.5 text-xs rounded-full ${campaign.isActive
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-700 text-gray-400'
                            }`}
                        >
                          {campaign.isActive ? 'Ativa' : 'Pausada'}
                        </span>
                        <span className="text-xs text-orange-400 bg-orange-500/10 px-2.5 py-0.5 rounded-full">
                          Disparo após {campaign.triggerDays} dias
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 bg-gray-800 p-3 rounded-lg border border-gray-700">
                        {campaign.message}
                      </p>
                      <div className="flex items-center gap-6 text-xs text-gray-400">
                        <span>Enviadas: {campaign.totalSent}</span>
                        <span>Respostas: {campaign.responses}</span>
                        {campaign.lastSent && (
                          <span>
                            Último disparo:{' '}
                            {new Date(campaign.lastSent).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTriggerNow(campaign)}
                        className="px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-medium flex items-center gap-1"
                        title="Disparar agora para clientes"
                      >
                        <Zap size={14} /> Disparar Agora
                      </button>
                      <button
                        onClick={() => openModal(campaign)}
                        className="p-2 text-blue-400 hover:text-blue-300 bg-gray-800 rounded-lg"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleToggleActive(campaign)}
                        className="p-2 text-yellow-400 hover:text-yellow-300 bg-gray-800 rounded-lg"
                      >
                        {campaign.isActive ? <Pause size={16} /> : <Play size={16} />}
                      </button>
                      <button
                        onClick={() => handleDeleteCampaign(campaign.id)}
                        className="p-2 text-red-400 hover:text-red-300 bg-gray-800 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : activeTab === 'logs' ? (
            <div className="space-y-3">
              {logs.length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  Nenhum envio registrado até o momento.
                </p>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 bg-gray-900 border border-gray-700 rounded-lg flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {log.clientName} ({log.clientPhone}) —{' '}
                        <span className="text-orange-400">{log.campaignName}</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-1">{log.message}</p>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400">
                        {log.status}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(log.sentAt).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {eligibleClients.length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  Nenhum cliente com mais de 7 dias sem retorno no momento.
                </p>
              ) : (
                eligibleClients.map((client) => (
                  <div
                    key={client.id}
                    className="p-4 bg-gray-900 border border-gray-700 rounded-lg flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-white">{client.name}</p>
                      <p className="text-xs text-gray-400">
                        {client.phone} • {client.daysSinceLastVisit} dias desde a última
                        visita
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const clean = client.phone.replace(/\D/g, '')
                        const waPhone =
                          clean.startsWith('55') && clean.length >= 12
                            ? clean
                            : `55${clean}`
                        window.open(
                          `https://wa.me/${waPhone}?text=${encodeURIComponent(
                            `Olá ${client.name}! Sentimos sua falta aqui na barbearia. Vamos agendar seu próximo horário?`
                          )}`,
                          '_blank'
                        )
                      }}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs rounded-lg flex items-center gap-1"
                    >
                      <Send size={13} /> Chamar no WhatsApp
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Criar/Editar Campanha */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              {editingCampaign ? 'Editar Campanha' : 'Nova Campanha WhatsApp'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  Nome da Campanha *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  placeholder="Ex: Lembrete de Corte 20 Dias"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  Dias após último atendimento *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.triggerDays}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      triggerDays: parseInt(e.target.value, 10) || 15
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  Mensagem (use {'{nome}'}, {'{dias}'}, {'{barbearia}'}) *
                </label>
                <textarea
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-400"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveCampaign}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium"
              >
                Salvar Campanha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
