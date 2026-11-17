'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Award, DollarSign, Download, Scissors } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { formatCurrencyBRL } from '@/lib/masks'
import { SaasPageHeader, SaasSectionCard, saasInputClass } from '@/components/ui/SaasUI'

interface CommissionSummaryRow {
  employeeId: string
  employeeName: string
  role: string
  commissionRate: number
  salary: number
  completedAppointments: number
  grossRevenue: number
  totalCommission: number
}

interface CommissionPayload {
  period: { startDate: string; endDate: string }
  totals: { completedAppointments: number; grossRevenue: number; totalCommission: number }
  summary: CommissionSummaryRow[]
}

export default function ComissoesPage() {
  const now = new Date()
  const [startDate, setStartDate] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  )
  const [endDate, setEndDate] = useState(now.toISOString().slice(0, 10))
  const [data, setData] = useState<CommissionPayload | null>(null)
  const [loading, setLoading] = useState(true)

  const loadCommissions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch(
        `/api/commissions?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
      )
      if (res.ok) {
        setData(await res.json())
      }
    } catch (err) {
      console.error('Erro ao carregar comissões:', err)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => {
    void loadCommissions()
  }, [loadCommissions])

  const handleExportCsv = () => {
    if (!data) return
    const headers = ['Profissional', 'Taxa (%)', 'Atendimentos Concluidos', 'Faturamento Bruto', 'Comissao a Pagar', 'Salario Base']
    const rows = data.summary.map((r) => [
      `"${r.employeeName}"`,
      r.commissionRate.toFixed(2),
      r.completedAppointments,
      r.grossRevenue.toFixed(2),
      r.totalCommission.toFixed(2),
      r.salary.toFixed(2)
    ])
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `comissoes-${startDate}-a-${endDate}.csv`
    a.click()
  }

  return (
    <div className="space-y-6">
      <SaasPageHeader
        kicker="Financeiro & Equipe"
        title="Fechamento de Comissões"
        subtitle="Apuração automática baseada nos atendimentos concluídos e no percentual de comissão de cada profissional."
        actions={
          <button
            onClick={handleExportCsv}
            disabled={!data}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#f5b51b] to-[#dc9b2d] px-4 py-2 text-xs font-bold text-[#15120b] disabled:opacity-50"
          >
            <Download size={15} />
            <span>Exportar CSV</span>
          </button>
        }
      />

      {/* Filtros de Período */}
      <SaasSectionCard>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:items-end">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase text-slate-300">
              Data Inicial
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={saasInputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase text-slate-300">
              Data Final
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={saasInputClass}
            />
          </div>
          <button
            onClick={loadCommissions}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Atualizar Apuração
          </button>
        </div>
      </SaasSectionCard>

      {/* Cards de Totais */}
      {data && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="bd-stat-card">
            <div className="bd-stat-icon is-blue">
              <Scissors size={28} />
            </div>
            <div className="bd-stat-copy">
              <strong>{data.totals.completedAppointments}</strong>
              <span>Atendimentos Concluídos</span>
            </div>
            <p className="bd-stat-note">No período selecionado</p>
          </div>

          <div className="bd-stat-card">
            <div className="bd-stat-icon is-green">
              <DollarSign size={28} />
            </div>
            <div className="bd-stat-copy">
              <strong>{formatCurrencyBRL(data.totals.grossRevenue)}</strong>
              <span>Faturamento Bruto</span>
            </div>
            <p className="bd-stat-note">Serviços executados</p>
          </div>

          <div className="bd-stat-card">
            <div className="bd-stat-icon is-gold">
              <Award size={28} />
            </div>
            <div className="bd-stat-copy">
              <strong>{formatCurrencyBRL(data.totals.totalCommission)}</strong>
              <span>Total em Comissões</span>
            </div>
            <p className="bd-stat-note">Valor a repassar à equipe</p>
          </div>
        </div>
      )}

      {/* Tabela por Profissional */}
      <SaasSectionCard title="Resumo por Profissional">
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-400">Calculando comissões...</p>
        ) : !data || data.summary.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            Nenhum profissional encontrado para apuração.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase text-slate-400">
                <tr>
                  <th className="py-3 pr-4">Profissional</th>
                  <th className="py-3 pr-4">Comissão (%)</th>
                  <th className="py-3 pr-4">Atendimentos</th>
                  <th className="py-3 pr-4">Faturamento</th>
                  <th className="py-3 pr-4">Comissão a Pagar</th>
                  <th className="py-3">Salário Base</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.summary.map((row) => (
                  <tr key={row.employeeId} className="hover:bg-white/[0.02]">
                    <td className="py-3.5 pr-4 font-semibold text-white">{row.employeeName}</td>
                    <td className="py-3.5 pr-4 text-slate-300">{row.commissionRate}%</td>
                    <td className="py-3.5 pr-4 text-white">{row.completedAppointments}</td>
                    <td className="py-3.5 pr-4 text-emerald-400">
                      {formatCurrencyBRL(row.grossRevenue)}
                    </td>
                    <td className="py-3.5 pr-4 font-bold text-[#f5b51b]">
                      {formatCurrencyBRL(row.totalCommission)}
                    </td>
                    <td className="py-3.5 text-slate-400">{formatCurrencyBRL(row.salary)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SaasSectionCard>
    </div>
  )
}
