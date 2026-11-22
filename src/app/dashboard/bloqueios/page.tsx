'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { CalendarOff, Plus, Trash2 } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import {
  SaasAlert,
  SaasField,
  SaasPageHeader,
  SaasSectionCard,
  SaasSubmitButton,
  saasInputClass
} from '@/components/ui/SaasUI'

interface EmployeeOption {
  id: string
  name: string
  role: string
  isActive: boolean
}

interface BlockRecord {
  id: string
  employeeId: string
  date: string
  startTime: string
  endTime: string
  reason: string | null
  employee: { id: string; name: string; role: string }
}

const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function BloqueiosPage() {
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [blocks, setBlocks] = useState<BlockRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [form, setForm] = useState({
    employeeId: '',
    date: todayStr(),
    endDate: todayStr(),
    startTime: '08:00',
    endTime: '18:00',
    reason: ''
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [empRes, blkRes] = await Promise.all([
        apiFetch('/api/employees'),
        apiFetch('/api/employee-blocks')
      ])
      if (empRes.ok) {
        const list = await empRes.json()
        const active = Array.isArray(list)
          ? list.filter((e: EmployeeOption) => e.isActive !== false && ['BARBER', 'PODIATRY', 'MASSAGE'].includes(e.role))
          : []
        setEmployees(active)
        setForm((prev) => ({ ...prev, employeeId: prev.employeeId || active[0]?.id || '' }))
      }
      if (blkRes.ok) {
        const b = await blkRes.json()
        setBlocks(Array.isArray(b) ? b : [])
      }
    } catch (err) {
      console.error('Erro ao carregar bloqueios:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    setFeedback(null)
    try {
      const res = await apiFetch('/api/employee-blocks', {
        method: 'POST',
        body: JSON.stringify(form)
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Erro ao registrar bloqueio')
      setFeedback({ type: 'success', text: 'Bloqueio de agenda registrado com sucesso.' })
      setForm((prev) => ({ ...prev, reason: '' }))
      await loadData()
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Erro ao salvar bloqueio.' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este bloqueio de agenda?')) return
    try {
      const res = await apiFetch(`/api/employee-blocks?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        setBlocks((prev) => prev.filter((b) => b.id !== id))
      }
    } catch (err) {
      console.error('Erro ao remover bloqueio:', err)
    }
  }

  return (
    <div className="space-y-6">
      <SaasPageHeader
        kicker="Agenda & Equipe"
        title="Bloqueios de Agenda e Folgas"
        subtitle="Defina folgas, férias ou ausências pontuais por profissional para impedir agendamentos nestes horários."
      />

      {feedback && <SaasAlert variant={feedback.type} message={feedback.text} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SaasSectionCard
          title="Novo Bloqueio / Folga"
          icon={<Plus size={20} />}
          className="lg:col-span-1"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <SaasField label="Profissional" required htmlFor="blk-emp">
              <select
                id="blk-emp"
                required
                value={form.employeeId}
                onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                className={saasInputClass}
              >
                <option value="ALL">Todos — fechar a barbearia</option><option value="">Selecione...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </SaasField>

            <SaasField label="Data" required htmlFor="blk-date">
              <input
                id="blk-date"
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value, endDate: form.endDate < e.target.value ? e.target.value : form.endDate })}
                className={saasInputClass}
              />
            </SaasField>

            <div className="grid grid-cols-2 gap-3">
              <SaasField label="Início" required htmlFor="blk-start">
                <input
                  id="blk-start"
                  type="time"
                  required
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  className={saasInputClass}
                />
              </SaasField>
              <SaasField label="Fim" required htmlFor="blk-end">
                <input
                  id="blk-end"
                  type="time"
                  required
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  className={saasInputClass}
                />
              </SaasField>
            </div>

            <SaasField label="Até a data (férias ou feriado)" htmlFor="blk-end-date"><input id="blk-end-date" type="date" required min={form.date} value={form.endDate} onChange={e=>setForm({...form,endDate:e.target.value})} className={saasInputClass}/></SaasField>
            <SaasField label="Motivo (opcional)" htmlFor="blk-reason">
              <input
                id="blk-reason"
                type="text"
                maxLength={200}
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="Ex: Folga semanal, médico, curso"
                className={saasInputClass}
              />
            </SaasField>

            <SaasSubmitButton loading={saving} loadingText="Registrando..." className="w-full">
              Bloquear Horário
            </SaasSubmitButton>
          </form>
        </SaasSectionCard>

        <SaasSectionCard
          title="Bloqueios Cadastrados"
          icon={<CalendarOff size={20} />}
          className="lg:col-span-2"
        >
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-400">Carregando bloqueios...</p>
          ) : blocks.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              Nenhum bloqueio de agenda cadastrado.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-white/10 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="py-3 pr-4">Profissional</th>
                    <th className="py-3 pr-4">Data</th>
                    <th className="py-3 pr-4">Horário</th>
                    <th className="py-3 pr-4">Motivo</th>
                    <th className="py-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {blocks.map((b) => (
                    <tr key={b.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 pr-4 font-medium text-white">{b.employee.name}</td>
                      <td className="py-3 pr-4 text-slate-300">
                        {new Date(`${b.date}T12:00:00Z`).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                      </td>
                      <td className="py-3 pr-4 font-semibold text-[#f5b51b]">
                        {b.startTime} – {b.endTime}
                      </td>
                      <td className="py-3 pr-4 text-slate-400">{b.reason || 'Indisponível'}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleDelete(b.id)}
                          className="rounded-lg p-1.5 text-red-400 hover:bg-red-500/10"
                          title="Remover bloqueio"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SaasSectionCard>
      </div>
    </div>
  )
}
