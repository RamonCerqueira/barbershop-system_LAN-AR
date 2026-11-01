'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DollarSign,
  Plus,
  CreditCard,
  Smartphone,
  Banknote,
  TrendingUp,
  Search,
  Check,
  X,
  Clock,
  CheckCircle
} from 'lucide-react'
import { apiFetch } from '@/lib/api'

const getLocalDateStr = (d = new Date()) => {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

interface SaleRecord {
  id: string
  type: 'SERVICE' | 'PRODUCT'
  description: string
  amount: number
  paymentMethod: 'CASH' | 'PIX' | 'DEBIT_CARD' | 'CREDIT_CARD'
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED'
  proofUrl?: string | null
  appointmentId?: string | null
  clientId?: string | null
  createdAt: string
  client?: { fullName: string; phone: string } | null
  appointment?: {
    time: string
    service?: { name: string }
    employee?: { name: string }
  } | null
}

interface AppointmentItem {
  id: string
  clientId: string
  clientName: string
  clientPhone: string
  serviceName: string
  employeeName: string
  price: number
  time: string
  date: string
  status: string
}

interface ProductItem {
  id: string
  name: string
  price: number
  stock: number
}

export default function Caixa() {
  const [sales, setSales] = useState<SaleRecord[]>([])
  const [appointments, setAppointments] = useState<AppointmentItem[]>([])
  const [products, setProducts] = useState<ProductItem[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedDate, setSelectedDate] = useState(() => getLocalDateStr())
  const [showSaleModal, setShowSaleModal] = useState(false)
  const [showPixValidation, setShowPixValidation] = useState(false)

  // Modal de venda
  const [saleMode, setSaleMode] = useState<'APPOINTMENT' | 'PRODUCT'>('APPOINTMENT')
  const [searchClient, setSearchClient] = useState('')
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentItem | null>(
    null
  )
  const [selectedProductId, setSelectedProductId] = useState('')
  const [productQty, setProductQty] = useState(1)
  const [customDescription, setCustomDescription] = useState('')
  const [customAmount, setCustomAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<
    'CASH' | 'PIX' | 'DEBIT_CARD' | 'CREDIT_CARD'
  >('CASH')
  const [pixProofDataUrl, setPixProofDataUrl] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  const loadCashierData = useCallback(async () => {
    setLoading(true)
    try {
      const [salesRes, aptRes, prodRes] = await Promise.all([
        apiFetch(`/api/sales?date=${selectedDate}`),
        apiFetch(`/api/appointments?date=${selectedDate}`),
        apiFetch('/api/products')
      ])

      if (salesRes.ok) setSales(await salesRes.json())
      if (aptRes.ok) setAppointments(await aptRes.json())
      if (prodRes.ok) setProducts(await prodRes.json())
    } catch (error) {
      console.error('Erro ao carregar dados do caixa:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  useEffect(() => {
    loadCashierData()
  }, [loadCashierData])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setPixProofDataUrl(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleRegisterSale = async () => {
    setSubmitting(true)
    try {
      let payload: any = {
        paymentMethod,
        proofUrl: paymentMethod === 'PIX' && pixProofDataUrl ? pixProofDataUrl : null,
        status:
          paymentMethod === 'PIX' && pixProofDataUrl ? 'PENDING' : 'COMPLETED'
      }

      if (saleMode === 'APPOINTMENT') {
        if (selectedAppointment) {
          payload = {
            ...payload,
            type: 'SERVICE',
            description: `${selectedAppointment.serviceName} - ${selectedAppointment.clientName}`,
            amount: selectedAppointment.price,
            appointmentId: selectedAppointment.id,
            clientId: selectedAppointment.clientId
          }
        } else {
          if (!customDescription || !customAmount) {
            alert('Selecione um agendamento ou informe descrição e valor.')
            setSubmitting(false)
            return
          }
          payload = {
            ...payload,
            type: 'SERVICE',
            description: customDescription,
            amount: parseFloat(customAmount)
          }
        }
      } else {
        const prod = products.find((p) => p.id === selectedProductId)
        if (!prod) {
          alert('Selecione um produto.')
          setSubmitting(false)
          return
        }
        if (productQty <= 0 || prod.stock < productQty) {
          alert(`Estoque insuficiente para ${prod.name}. Disponível: ${prod.stock}`)
          setSubmitting(false)
          return
        }
        payload = {
          ...payload,
          type: 'PRODUCT',
          description: `${productQty}x ${prod.name}`,
          amount: prod.price * productQty,
          items: [
            {
              productId: prod.id,
              quantity: productQty,
              unitPrice: prod.price
            }
          ]
        }
      }

      const res = await apiFetch('/api/sales', {
        method: 'POST',
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao registrar venda')
      }

      await loadCashierData()
      setShowSaleModal(false)
      setSelectedAppointment(null)
      setCustomDescription('')
      setCustomAmount('')
      setPixProofDataUrl('')
    } catch (error: any) {
      alert(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleValidatePix = async (
    saleId: string,
    status: 'APPROVED' | 'REJECTED'
  ) => {
    try {
      const res = await apiFetch(`/api/sales/${saleId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      })
      if (res.ok) {
        await loadCashierData()
      }
    } catch (error) {
      console.error('Erro ao validar PIX:', error)
    }
  }

  const confirmedSales = sales.filter((s) =>
    ['COMPLETED', 'APPROVED'].includes(s.status)
  )
  const pendingPixSales = sales.filter(
    (s) => s.paymentMethod === 'PIX' && s.status === 'PENDING'
  )

  const totalRevenue = confirmedSales.reduce((sum, s) => sum + s.amount, 0)
  const serviceRevenue = confirmedSales
    .filter((s) => s.type === 'SERVICE')
    .reduce((sum, s) => sum + s.amount, 0)
  const productRevenue = confirmedSales
    .filter((s) => s.type === 'PRODUCT')
    .reduce((sum, s) => sum + s.amount, 0)

  const paymentTotals = confirmedSales.reduce(
    (acc, s) => {
      acc[s.paymentMethod] = (acc[s.paymentMethod] || 0) + s.amount
      return acc
    },
    {} as Record<string, number>
  )

  const filteredAppointments = appointments.filter(
    (apt) =>
      apt.status !== 'CANCELLED' &&
      (apt.clientName.toLowerCase().includes(searchClient.toLowerCase()) ||
        apt.serviceName.toLowerCase().includes(searchClient.toLowerCase()))
  )

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'CASH':
        return 'Dinheiro'
      case 'PIX':
        return 'PIX'
      case 'DEBIT_CARD':
        return 'Cartão de Débito'
      case 'CREDIT_CARD':
        return 'Cartão de Crédito'
      default:
        return method
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
          />
          <span className="text-sm text-gray-400">
            Movimento de{' '}
            {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR')}
          </span>
        </div>

        <div className="flex items-center space-x-3">
          {pendingPixSales.length > 0 && (
            <button
              onClick={() => setShowPixValidation(true)}
              className="inline-flex items-center px-4 py-2 bg-yellow-500 text-black font-medium rounded-lg hover:bg-yellow-400 transition-colors"
            >
              <Clock size={18} className="mr-2" />
              PIX Pendentes ({pendingPixSales.length})
            </button>
          )}
          <button
            onClick={() => setShowSaleModal(true)}
            className="inline-flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            <Plus size={20} className="mr-2" />
            Registrar Venda / Recebimento
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Receita Total Confirmada</p>
            <p className="text-2xl font-bold text-green-400">
              R$ {totalRevenue.toFixed(2)}
            </p>
          </div>
          <DollarSign className="h-8 w-8 text-green-400" />
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Serviços</p>
            <p className="text-2xl font-bold text-blue-400">
              R$ {serviceRevenue.toFixed(2)}
            </p>
          </div>
          <TrendingUp className="h-8 w-8 text-blue-400" />
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Produtos</p>
            <p className="text-2xl font-bold text-orange-400">
              R$ {productRevenue.toFixed(2)}
            </p>
          </div>
          <DollarSign className="h-8 w-8 text-orange-400" />
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Transações</p>
            <p className="text-2xl font-bold text-purple-400">{sales.length}</p>
          </div>
          <CreditCard className="h-8 w-8 text-purple-400" />
        </div>
      </div>

      {/* Payment Methods Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {(['CASH', 'PIX', 'DEBIT_CARD', 'CREDIT_CARD'] as const).map((method) => (
          <div
            key={method}
            className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center justify-between"
          >
            <span className="text-sm text-gray-300">
              {getPaymentMethodLabel(method)}
            </span>
            <span className="font-bold text-white">
              R$ {(paymentTotals[method] || 0).toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      {/* Sales List */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">
            Histórico de Vendas do Dia ({sales.length})
          </h3>
        </div>
        {loading ? (
          <div className="py-12 text-center text-gray-400">Carregando caixa...</div>
        ) : sales.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            Nenhuma venda registrada nesta data.
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {sales.map((sale) => (
              <div
                key={sale.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-700/30"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{sale.description}</span>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${sale.type === 'SERVICE'
                        ? 'bg-blue-500/20 text-blue-300'
                        : 'bg-orange-500/20 text-orange-300'
                        }`}
                    >
                      {sale.type === 'SERVICE' ? 'Serviço' : 'Produto'}
                    </span>
                    {sale.status === 'PENDING' && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-500/20 text-yellow-300">
                        PIX Pendente
                      </span>
                    )}
                    {sale.status === 'REJECTED' && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-300">
                        PIX Rejeitado
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {getPaymentMethodLabel(sale.paymentMethod)} •{' '}
                    {new Date(sale.createdAt).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-400">
                    R$ {sale.amount.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Registrar Venda */}
      {showSaleModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Registrar Recebimento / Venda
              </h3>
              <button
                onClick={() => setShowSaleModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex gap-2 mb-6">
              <button
                type="button"
                onClick={() => setSaleMode('APPOINTMENT')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${saleMode === 'APPOINTMENT'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-900 text-gray-400'
                  }`}
              >
                Atendimento / Serviço
              </button>
              <button
                type="button"
                onClick={() => setSaleMode('PRODUCT')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${saleMode === 'PRODUCT'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-900 text-gray-400'
                  }`}
              >
                Venda de Produto (Estoque)
              </button>
            </div>

            {saleMode === 'APPOINTMENT' ? (
              <div className="space-y-4">
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                  <input
                    type="text"
                    placeholder="Buscar agendamento do dia..."
                    value={searchClient}
                    onChange={(e) => setSearchClient(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  />
                </div>

                {filteredAppointments.length > 0 && (
                  <div className="max-h-44 overflow-y-auto space-y-2">
                    {filteredAppointments.map((apt) => (
                      <div
                        key={apt.id}
                        onClick={() => setSelectedAppointment(apt)}
                        className={`p-3 rounded-lg border cursor-pointer flex justify-between items-center ${selectedAppointment?.id === apt.id
                          ? 'border-orange-500 bg-orange-500/10'
                          : 'border-gray-700 bg-gray-900'
                          }`}
                      >
                        <div>
                          <p className="text-sm font-medium text-white">
                            {apt.time} — {apt.clientName}
                          </p>
                          <p className="text-xs text-gray-400">
                            {apt.serviceName} ({apt.employeeName})
                          </p>
                        </div>
                        <span className="text-sm font-bold text-orange-400">
                          R$ {apt.price.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {!selectedAppointment && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-700">
                    <input
                      type="text"
                      placeholder="Ou descrição avulsa do serviço"
                      value={customDescription}
                      onChange={(e) => setCustomDescription(e.target.value)}
                      className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
                    />
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Valor R$"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">
                    Selecione o Produto
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  >
                    <option value="">Escolha um produto...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — R$ {p.price.toFixed(2)} (Estoque: {p.stock})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Quantidade</label>
                  <input
                    type="number"
                    min="1"
                    value={productQty}
                    onChange={(e) => setProductQty(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  />
                </div>
              </div>
            )}

            {/* Payment Method */}
            <div className="mt-6">
              <label className="block text-sm text-gray-300 mb-2">
                Forma de Pagamento
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(
                  [
                    { id: 'CASH', label: 'Dinheiro', icon: Banknote },
                    { id: 'PIX', label: 'PIX', icon: Smartphone },
                    { id: 'DEBIT_CARD', label: 'Débito', icon: CreditCard },
                    { id: 'CREDIT_CARD', label: 'Crédito', icon: CreditCard }
                  ] as const
                ).map((pm) => {
                  const Icon = pm.icon
                  return (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setPaymentMethod(pm.id)}
                      className={`p-3 rounded-lg border flex flex-col items-center gap-1 text-xs font-medium ${paymentMethod === pm.id
                        ? 'border-orange-500 bg-orange-500/20 text-white'
                        : 'border-gray-700 bg-gray-900 text-gray-400'
                        }`}
                    >
                      <Icon size={18} />
                      <span>{pm.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {paymentMethod === 'PIX' && (
              <div className="mt-4 p-4 bg-gray-900 border border-gray-700 rounded-lg">
                <label className="block text-xs text-gray-400 mb-2">
                  Anexar Comprovante PIX (opcional — se anexado, vai para fila de validação):
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="text-xs text-gray-300"
                />
              </div>
            )}

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setShowSaleModal(false)}
                className="px-4 py-2 text-gray-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleRegisterSale}
                className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium"
              >
                {submitting ? 'Registrando...' : 'Confirmar Recebimento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Validação PIX */}
      {showPixValidation && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Validação de Comprovantes PIX ({pendingPixSales.length})
              </h3>
              <button
                onClick={() => setShowPixValidation(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {pendingPixSales.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <CheckCircle className="h-10 w-10 text-green-400 mx-auto mb-2" />
                Todos os comprovantes PIX foram validados!
              </div>
            ) : (
              <div className="space-y-4">
                {pendingPixSales.map((pix) => (
                  <div
                    key={pix.id}
                    className="p-4 bg-gray-900 border border-gray-700 rounded-lg space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-white">{pix.description}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(pix.createdAt).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <span className="text-lg font-bold text-orange-400">
                        R$ {pix.amount.toFixed(2)}
                      </span>
                    </div>

                    {pix.proofUrl && (
                      <div className="bg-gray-800 p-2 rounded border border-gray-700">
                        {/* Uso de <img> nativo para suportar dataURL/blob sem erro de dimensões do Next Image */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={pix.proofUrl}
                          alt="Comprovante PIX"
                          className="max-h-56 mx-auto rounded object-contain"
                        />
                      </div>
                    )}

                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => handleValidatePix(pix.id, 'REJECTED')}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs flex items-center gap-1"
                      >
                        <X size={14} /> Rejeitar
                      </button>
                      <button
                        onClick={() => handleValidatePix(pix.id, 'APPROVED')}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs flex items-center gap-1"
                      >
                        <Check size={14} /> Aprovar PIX
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
