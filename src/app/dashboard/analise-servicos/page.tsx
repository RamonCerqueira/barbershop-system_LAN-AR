'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  Trash2,
  Calculator,
  PieChart
} from 'lucide-react'
import { ServiceAnalysis } from '@/types'
import { apiFetch } from '@/lib/api'

export default function AnaliseServicos() {
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [showCostModal, setShowCostModal] = useState(false)
  const [selectedService, setSelectedService] = useState<ServiceAnalysis | null>(null)
  const [servicesAnalysis, setServicesAnalysis] = useState<ServiceAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [newCost, setNewCost] = useState({
    itemName: '',
    costPerUse: 0,
    unit: 'ml',
    supplier: ''
  })

  const fetchServiceAnalysis = useCallback(async () => {
    setLoading(true)
    try {
      const response = await apiFetch(`/api/service-costs?period=${selectedPeriod}`)
      if (response.ok) {
        const data = await response.json()
        setServicesAnalysis(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Erro ao carregar análise de serviços:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedPeriod])

  useEffect(() => {
    fetchServiceAnalysis()
  }, [fetchServiceAnalysis])

  const handleAddCost = async () => {
    if (!selectedService || !newCost.itemName || newCost.costPerUse <= 0) return

    try {
      const response = await apiFetch('/api/service-costs', {
        method: 'POST',
        body: JSON.stringify({
          serviceId: selectedService.id,
          itemName: newCost.itemName,
          costPerUse: newCost.costPerUse,
          unit: newCost.unit,
          supplier: newCost.supplier
        })
      })

      if (response.ok) {
        const addedCost = await response.json()
        setNewCost({ itemName: '', costPerUse: 0, unit: 'ml', supplier: '' })
        setSelectedService((prev) =>
          prev
            ? {
                ...prev,
                costs: [...prev.costs, addedCost]
              }
            : null
        )
        await fetchServiceAnalysis()
      }
    } catch (err) {
      console.error('Erro ao adicionar custo:', err)
    }
  }

  const handleDeleteCost = async (costId: string) => {
    try {
      const res = await apiFetch(`/api/service-costs?id=${costId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        await fetchServiceAnalysis()
        if (selectedService) {
          setSelectedService((prev) =>
            prev
              ? {
                  ...prev,
                  costs: prev.costs.filter((c) => c.id !== costId)
                }
              : null
          )
        }
      }
    } catch (err) {
      console.error('Erro ao remover custo:', err)
    }
  }

  const totalRevenue = servicesAnalysis.reduce((sum, s) => sum + s.totalRevenue, 0)
  const totalNetProfit = servicesAnalysis.reduce((sum, s) => sum + s.netProfit, 0)
  const averageMargin =
    servicesAnalysis.length > 0
      ? servicesAnalysis.reduce((sum, s) => sum + s.profitMargin, 0) /
        servicesAnalysis.length
      : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Análise ABC de Serviços e Custos
          </h1>
          <p className="text-sm text-gray-400">
            Rentabilidade por serviço, insumos utilizados e classificação na Curva ABC
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
          >
            <option value="week">Última Semana</option>
            <option value="month">Último Mês</option>
            <option value="quarter">Último Trimestre</option>
            <option value="year">Último Ano</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Receita no Período</p>
            <p className="text-2xl font-bold text-white">
              R$ {totalRevenue.toFixed(2)}
            </p>
          </div>
          <DollarSign className="h-7 w-7 text-green-400" />
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Lucro Líquido</p>
            <p className="text-2xl font-bold text-green-400">
              R$ {totalNetProfit.toFixed(2)}
            </p>
          </div>
          <TrendingUp className="h-7 w-7 text-green-400" />
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Margem Média</p>
            <p className="text-2xl font-bold text-orange-400">
              {averageMargin.toFixed(1)}%
            </p>
          </div>
          <Calculator className="h-7 w-7 text-orange-400" />
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Serviços Analisados</p>
            <p className="text-2xl font-bold text-purple-400">
              {servicesAnalysis.length}
            </p>
          </div>
          <PieChart className="h-7 w-7 text-purple-400" />
        </div>
      </div>

      {/* ABC Classification Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(['A', 'B', 'C'] as const).map((cls) => {
          const items = servicesAnalysis.filter((s) => s.abcClass === cls)
          const color =
            cls === 'A'
              ? 'border-green-500/40 text-green-400'
              : cls === 'B'
              ? 'border-yellow-500/40 text-yellow-400'
              : 'border-red-500/40 text-red-400'

          return (
            <div
              key={cls}
              className={`bg-gray-800 border ${color} rounded-xl p-5 space-y-3`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white">Classe {cls}</h3>
                <span className="text-xs px-2 py-0.5 rounded bg-gray-900 text-gray-300">
                  {items.length} serviço(s)
                </span>
              </div>
              {items.length === 0 ? (
                <p className="text-xs text-gray-500">Nenhum serviço nesta faixa.</p>
              ) : (
                <div className="space-y-2">
                  {items.map((s) => (
                    <div
                      key={s.id}
                      className="flex justify-between text-sm bg-gray-900/60 p-2 rounded"
                    >
                      <span className="text-gray-200">{s.name}</span>
                      <span className="font-semibold text-white">
                        R$ {s.totalRevenue.toFixed(2)} ({s.revenuePercentage.toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Detailed Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">
            Detalhamento de Custos e Margens por Serviço
          </h3>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-400">
            Calculando análise ABC do banco...
          </div>
        ) : servicesAnalysis.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            Cadastre serviços na aba Serviços para analisar seus custos.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-900/60 text-gray-400 text-xs uppercase">
                <tr>
                  <th className="px-6 py-3 text-left">Serviço</th>
                  <th className="px-6 py-3 text-left">Curva</th>
                  <th className="px-6 py-3 text-left">Atendimentos</th>
                  <th className="px-6 py-3 text-left">Receita</th>
                  <th className="px-6 py-3 text-left">Custo / Uso</th>
                  <th className="px-6 py-3 text-left">Lucro Líquido</th>
                  <th className="px-6 py-3 text-left">Margem</th>
                  <th className="px-6 py-3 text-left">Insumos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {servicesAnalysis.map((service) => (
                  <tr key={service.id} className="hover:bg-gray-700/30">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{service.name}</div>
                      <div className="text-xs text-gray-400">{service.category}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          service.abcClass === 'A'
                            ? 'bg-green-500/20 text-green-400'
                            : service.abcClass === 'B'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        Classe {service.abcClass}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white">
                      {service.totalAppointments} ({service.appointmentsPercentage.toFixed(1)}%)
                    </td>
                    <td className="px-6 py-4 text-white font-medium">
                      R$ {service.totalRevenue.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-red-400">
                      R$ {service.totalCostPerService.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-green-400 font-semibold">
                      R$ {service.netProfit.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 font-medium text-orange-400">
                        {service.trend === 'up' ? (
                          <TrendingUp size={14} />
                        ) : (
                          <TrendingDown size={14} />
                        )}
                        {service.profitMargin.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          setSelectedService(service)
                          setShowCostModal(true)
                        }}
                        className="text-orange-400 hover:text-orange-300 font-medium text-xs flex items-center gap-1"
                      >
                        <Plus size={14} /> Insumos ({service.costs.length})
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Insumos do Serviço */}
      {showCostModal && selectedService && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Custos de Insumos — {selectedService.name}
              </h3>
              <button
                onClick={() => setShowCostModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {selectedService.costs.length > 0 && (
              <div className="space-y-2 mb-6 max-h-48 overflow-y-auto">
                {selectedService.costs.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-2.5 bg-gray-900 rounded-lg text-sm"
                  >
                    <div>
                      <span className="text-white font-medium">
                        {c.itemName || c.item}
                      </span>
                      <span className="text-xs text-gray-400 ml-2">
                        ({c.unit}) {c.supplier ? `• ${c.supplier}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-orange-400 font-semibold">
                        R$ {c.costPerUse.toFixed(2)}
                      </span>
                      <button
                        onClick={() => handleDeleteCost(c.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3 border-t border-gray-700 pt-4">
              <h4 className="text-sm font-medium text-gray-300">Adicionar Novo Insumo</h4>
              <input
                type="text"
                placeholder="Nome do item (Ex: Lâmina, Shampoo, Pomada)"
                value={newCost.itemName}
                onChange={(e) => setNewCost({ ...newCost, itemName: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Custo por uso (R$)"
                  value={newCost.costPerUse || ''}
                  onChange={(e) =>
                    setNewCost({
                      ...newCost,
                      costPerUse: parseFloat(e.target.value) || 0
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
                />
                <select
                  value={newCost.unit}
                  onChange={(e) => setNewCost({ ...newCost, unit: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
                >
                  <option value="ml">ml</option>
                  <option value="g">g</option>
                  <option value="unidade">Unidade</option>
                  <option value="aplicação">Aplicação</option>
                </select>
              </div>
              <input
                type="text"
                placeholder="Fornecedor (opcional)"
                value={newCost.supplier}
                onChange={(e) => setNewCost({ ...newCost, supplier: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
              />
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => setShowCostModal(false)}
                  className="px-4 py-2 text-sm text-gray-400"
                >
                  Fechar
                </button>
                <button
                  onClick={handleAddCost}
                  className="px-4 py-2 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium"
                >
                  Adicionar Custo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
