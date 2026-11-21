'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { BellRing, Check, CheckCircle2, Clock3, Copy, ExternalLink, Loader2, Monitor, Play, RefreshCw, Scissors, ShieldCheck } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { SaasAlert, SaasField, SaasPageHeader, SaasSectionCard, saasInputClass } from '@/components/ui/SaasUI'
import { SaasModal } from '@/components/ui/SaasModal'

type Appointment = { id: string; time: string; status: string; employeeId: string; client: { fullName: string }; employee: { name: string }; service: { name: string } }
type Board = { enabled: boolean; canConfigure: boolean; publicPath: string | null; calledId: string | null; appointments: Appointment[] }

export default function WaitingRoomManager({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<Board | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState('')
  const [copied, setCopied] = useState(false)
  const [filter, setFilter] = useState('ALL')
  const [rotate, setRotate] = useState(false)

  const load = useCallback(async (signal?: AbortSignal) => {
    const response = await apiFetch('/api/waiting-room', { signal })
    const body = await response.json()
    if (!response.ok) throw new Error(body.error || 'Não foi possível carregar o painel.')
    setData(body)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const refresh = () => { void load(controller.signal).catch(error => { if (!controller.signal.aborted) setFeedback({ type: 'error', text: error.message }) }) }
    refresh()
    const timer = setInterval(refresh, 10000)
    return () => { controller.abort(); clearInterval(timer) }
  }, [load])

  async function configure(action: 'ENABLE' | 'DISABLE' | 'ROTATE') {
    if (busy) return
    setBusy(action); setFeedback(null)
    try {
      const response = await apiFetch('/api/waiting-room', { method: 'PUT', body: JSON.stringify({ action }) })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error)
      await load()
      setRotate(false)
      setFeedback({ type: 'success', text: action === 'ENABLE' ? 'Painel ativado. Abra a tela de consulta ou compartilhe o link.' : action === 'DISABLE' ? 'Painel desativado. O link deixou de exibir os atendimentos.' : 'Link renovado. Os links anteriores foram invalidados.' })
    } catch (error) { setFeedback({ type: 'error', text: error instanceof Error ? error.message : 'Erro ao configurar o painel.' }) }
    finally { setBusy('') }
  }

  async function act(appointment: Appointment, action: 'CALL' | 'START' | 'FINISH') {
    if (busy) return
    setBusy(appointment.id); setFeedback(null)
    try {
      const response = action === 'CALL'
        ? await apiFetch('/api/waiting-room', { method: 'POST', body: JSON.stringify({ appointmentId: appointment.id }) })
        : await apiFetch(`/api/appointments/${appointment.id}`, { method: 'PATCH', body: JSON.stringify({ status: action === 'START' ? 'IN_PROGRESS' : 'COMPLETED' }) })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Não foi possível atualizar o atendimento.')
      await load()
      setFeedback({ type: 'success', text: action === 'CALL' ? 'Cliente chamado! A chamada aparecerá no painel por três minutos.' : action === 'START' ? 'Atendimento iniciado.' : 'Atendimento concluído.' })
    } catch (error) { setFeedback({ type: 'error', text: error instanceof Error ? error.message : 'Erro ao atualizar atendimento.' }) }
    finally { setBusy('') }
  }

  const employees = Array.from(new Map(data?.appointments.map(apt => [apt.employeeId, apt.employee.name]) || []).entries())
  const appointments = data?.appointments.filter(apt => filter === 'ALL' || apt.employeeId === filter) || []
  const button = 'inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40'
  return <div className="space-y-6">
    {!compact && <SaasPageHeader kicker="Organização do salão" title="Painel de atendimentos" subtitle="Controle as chamadas e os atendimentos. A tela compartilhada permite apenas consulta." actions={<Link href="/dashboard/agendamentos" className={button}><Clock3 size={16} />Agendamentos</Link>} />}
    {feedback && <SaasAlert variant={feedback.type} message={feedback.text} />}
    {!data ? <div className="flex items-center gap-3 rounded-2xl border border-white/10 p-6 text-slate-400"><Loader2 size={18} className="animate-spin" />Carregando painel…</div> : <>
      <SaasSectionCard title="Tela de consulta para o salão" icon={<Monitor size={21} />} description="Abra numa TV, tablet ou compartilhe o link com seus clientes. Não é necessário fazer login.">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3"><span className={`h-3 w-3 rounded-full ${data.enabled ? 'bg-emerald-400 shadow-[0_0_12px_#34d39955]' : 'bg-slate-600'}`} /><div><p className="text-sm font-semibold text-white">{data.enabled ? 'Painel disponível' : 'Painel desativado'}</p><p className="mt-1 text-xs text-slate-400">Barbeiros e clientes apenas visualizam a tela.</p></div></div>
          {data.canConfigure && <button type="button" className={`${button} ${!data.enabled ? '!border-amber-400/30 !bg-amber-400/10 !text-amber-300' : ''}`} disabled={Boolean(busy)} onClick={() => void configure(data.enabled ? 'DISABLE' : 'ENABLE')}><Monitor size={16} />{busy === 'ENABLE' || busy === 'DISABLE' ? 'Atualizando…' : data.enabled ? 'Desativar painel' : 'Ativar painel'}</button>}
        </div>
        {data.publicPath && <div className="mt-5 space-y-3 rounded-xl border border-white/10 bg-black/20 p-4"><label htmlFor="waiting-room-link" className="text-xs font-medium text-slate-300">Link da tela de consulta</label><input id="waiting-room-link" className={`${saasInputClass} mt-2`} readOnly value={typeof window !== 'undefined' ? `${window.location.origin}${data.publicPath}` : data.publicPath} onFocus={event => event.target.select()} /><div className="flex flex-wrap gap-2"><a href={data.publicPath} target="_blank" rel="noopener noreferrer" className={button}><ExternalLink size={15} />Abrir tela</a><button type="button" className={button} onClick={async () => { try { await navigator.clipboard.writeText(`${window.location.origin}${data.publicPath}`); setCopied(true); setTimeout(() => setCopied(false), 2500) } catch { setFeedback({ type: 'error', text: 'Selecione o link acima e copie manualmente.' }) } }}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? 'Copiado!' : 'Copiar link'}</button>{data.canConfigure && <button type="button" className={button} disabled={Boolean(busy)} onClick={() => setRotate(true)}><RefreshCw size={15} />Renovar link</button>}</div></div>}
        <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-slate-400"><ShieldCheck size={16} className="shrink-0 text-amber-300" />A tela pública mostra somente o nome abreviado do cliente, serviço, profissional e horário. Somente o administrador ativa, desativa ou renova o link.</p>
      </SaasSectionCard>
      {!compact && <SaasSectionCard title="Atendimentos de hoje" icon={<Scissors size={21} />} description="Chame o cliente quando chegar a vez dele e mantenha o andamento atualizado.">
        <div className="mb-5 grid gap-4 sm:grid-cols-3"><div className="rounded-xl border border-emerald-400/15 bg-emerald-400/5 p-4"><span className="text-xs text-slate-400">Em atendimento</span><p className="mt-1 text-2xl font-bold text-emerald-300">{data.appointments.filter(apt => apt.status === 'IN_PROGRESS').length}</p></div><div className="rounded-xl border border-amber-400/15 bg-amber-400/5 p-4"><span className="text-xs text-slate-400">Aguardando atendimento</span><p className="mt-1 text-2xl font-bold text-amber-300">{data.appointments.filter(apt => apt.status !== 'IN_PROGRESS').length}</p></div><SaasField label="Filtrar profissional" htmlFor="waiting-professional"><select id="waiting-professional" className={saasInputClass} value={filter} onChange={event => setFilter(event.target.value)}><option value="ALL">Todos os profissionais</option>{employees.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></SaasField></div>
        <div className="space-y-3">{appointments.length ? appointments.map(apt => <article key={apt.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-black/15 p-4 lg:flex-row lg:items-center"><div className="flex min-w-0 items-start gap-4"><time className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-base font-bold text-white">{apt.time}</time><div className="min-w-0"><h3 className="break-words text-sm font-semibold text-white">{apt.client.fullName}</h3><p className="mt-1 text-xs text-slate-400">{apt.service.name} · {apt.employee.name}</p><span className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${apt.status === 'IN_PROGRESS' ? 'bg-emerald-400/10 text-emerald-300' : 'bg-white/5 text-slate-300'}`}>{apt.status === 'IN_PROGRESS' ? 'Em atendimento' : apt.status === 'CONFIRMED' ? 'Confirmado' : 'Agendado'}</span></div></div><div className="flex shrink-0 flex-wrap gap-2">{apt.status !== 'IN_PROGRESS' ? <><button type="button" className={button} disabled={Boolean(busy) || !data.enabled} onClick={() => void act(apt, 'CALL')}><BellRing size={15} />{data.calledId === apt.id ? 'Chamar novamente' : 'Chamar cliente'}</button><button type="button" className={`${button} !border-amber-400/20 !text-amber-300`} disabled={Boolean(busy)} onClick={() => void act(apt, 'START')}><Play size={15} />Iniciar</button></> : <button type="button" className={`${button} !border-emerald-400/20 !text-emerald-300`} disabled={Boolean(busy)} onClick={() => void act(apt, 'FINISH')}><CheckCircle2 size={15} />Concluir</button>}</div></article>) : <div className="rounded-xl border border-dashed border-white/10 px-4 py-12 text-center text-sm text-slate-400">Nenhum atendimento ativo para este filtro. Novos agendamentos aparecerão automaticamente.</div>}</div>
      </SaasSectionCard>}
    </>}
    {rotate && <SaasModal title="Renovar link do painel" description="O link anterior deixará de funcionar imediatamente. Abra o novo link na TV e compartilhe com seus clientes." icon="company" onClose={() => { if (!busy) setRotate(false) }}><div className="saas-modal-actions justify-end"><button type="button" onClick={() => setRotate(false)} disabled={Boolean(busy)}>Cancelar</button><button type="button" className="bg-orange-500" disabled={Boolean(busy)} onClick={() => void configure('ROTATE')}>{busy ? 'Renovando…' : 'Renovar link'}</button></div></SaasModal>}
  </div>
}
