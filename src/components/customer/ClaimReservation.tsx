'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { customerRequest } from './CustomerPortal'
import { CalendarPlus } from 'lucide-react'

export function ClaimReservation({ id }: { id: string }) {
  const router = useRouter()
  const [saved, setSaved] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('')
  return <div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-center"><p className="text-xs leading-relaxed text-slate-300">Guarde esta reserva na sua conta para acompanhar o atendimento e seu histórico.</p>{error && <p className="mt-2 text-xs text-red-300" role="alert">{error}</p>}{saved ? <Link href="/cliente/agendamentos" className="mt-3 inline-flex text-sm font-semibold text-amber-300">Ver na minha agenda</Link> : <button type="button" disabled={busy} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-400/10 px-4 py-2 text-xs font-semibold text-amber-300 disabled:opacity-40" onClick={async () => { setBusy(true); setError(''); try { const account = await customerRequest('/api/customer/auth'); if (!account.customer) { router.push(`/cliente/entrar?next=${encodeURIComponent('/confirm/' + id)}`); return } await customerRequest('/api/customer/appointments/claim', { method: 'POST', body: JSON.stringify({ id, token: sessionStorage.getItem('confirmation:' + id) || '' }) }); setSaved(true) } catch (failure) { setError(failure instanceof Error ? failure.message : 'Não foi possível salvar.') } finally { setBusy(false) } }}><CalendarPlus size={15} />{busy ? 'Salvando…' : 'Guardar na minha conta'}</button>}</div>
}
