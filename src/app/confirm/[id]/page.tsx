'use client'

import { ClaimReservation } from '@/components/customer/ClaimReservation'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle, XCircle, Calendar, Clock, Scissors, MapPin, Copy, Check, QrCode, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

interface AppointmentDetails {
  id: string
  date: string
  time: string
  status: string
  price: number
  clientName: string
  serviceName: string
  duration: number
  employeeName: string
  companyName: string
  companyAddress: string
  companyPhone: string
  requirePrepaymentToConfirm?: boolean
  paymentDeadlineHours?: number
  cancellationDeadline?: number
  pix?: {
    key: string
    beneficiary: string
    bank: string
  } | null
}

export default function ConfirmAppointmentPage() {
  const params = useParams()
  const id = params?.id as string
  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [paymentNotified, setPaymentNotified] = useState(false)
  const [copiedPix, setCopiedPix] = useState(false)

  useEffect(() => {
    if (!id) return
    const token = new URLSearchParams(window.location.search).get('token')
    if (token) {
      sessionStorage.setItem('confirmation:' + id, token)
      window.history.replaceState(null, '', window.location.pathname)
    }
    fetch('/api/public/appointments/' + id, {
      headers: { 'X-Confirmation-Token': sessionStorage.getItem('confirmation:' + id) || '' }
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Agendamento não encontrado')
        return res.json()
      })
      .then((data) => setAppointment(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

    const handleAction = async (payload: { status?: 'CONFIRMED' | 'CANCELLED'; notifyPayment?: boolean }) => {
      setUpdating(true)
      setError('')
      try {
        const res = await fetch(`/api/public/appointments/${id}`, {
          method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'X-Confirmation-Token': sessionStorage.getItem('confirmation:' + id) || ''
          },
          body: JSON.stringify(payload)
        })
        const result = await res.json()
          if (!res.ok) {
            setError(result.error || 'Não foi possível atualizar o agendamento.')
            return
          }
          if (result.paymentNotified) {
            setPaymentNotified(true)
          } else if (result.status) {
            setAppointment((prev) => (prev ? { ...prev, status: result.status } : prev))
          }
        } finally {
          setUpdating(false)
        }
      }

  const handleCopyPix = async () => {
        if (!appointment?.pix?.key) return
        try {
          await navigator.clipboard.writeText(appointment.pix.key)
          setCopiedPix(true)
          setTimeout(() => setCopiedPix(false), 2500)
        } catch {
          // ignore
        }
      }

      if (loading) {
        return (
            <div className="dashboard-shell flex min-h-screen items-center justify-center text-white">
              Carregando dados do agendamento...
            </div>
            )
  }

  if (!appointment) {
    return (
                <div className="dashboard-shell flex min-h-screen flex-col items-center justify-center p-4 text-white">
                  <p className="mb-4 text-lg text-red-400">{error || 'Agendamento não encontrado'}</p>
                  <Link href="/cliente" className="text-[#f5b51b] hover:underline">
                    Ir para o Portal do Cliente
                  </Link>
                </div>
                )
  }

                const cancelHours = appointment.cancellationDeadline ?? 2
                const payHours = appointment.paymentDeadlineHours ?? 2

                return (
                    <div className="dashboard-shell flex min-h-screen items-center justify-center p-4 text-white">
                      <div className="w-full max-w-md space-y-5 rounded-[18px] border border-white/10 bg-gradient-to-br from-[#181d24] to-[#10141a] p-6 shadow-2xl">
                        <div className="text-center">
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#f5b51b]">
                            Confirmação de Horário
                          </p>
                          <h1 className="mt-1 text-2xl font-bold text-white">{appointment.companyName}</h1>
                        </div>

                          <ClaimReservation id={id} />
                          {error && (
                            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
                              {error}
                            </div>
                          )}

                          <div className="space-y-3 rounded-xl border border-white/10 bg-[#0d1117] p-4 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Cliente:</span>
                              <span className="font-semibold text-white">{appointment.clientName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="flex items-center gap-1 text-slate-400">
                                  <Scissors size={14} /> Serviço:
                                </span>
                                <span className="font-semibold text-white">{appointment.serviceName}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Profissional:</span>
                              <span className="font-semibold text-white">{appointment.employeeName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="flex items-center gap-1 text-slate-400">
                                  <Calendar size={14} /> Data:
                                </span>
                                <span className="font-semibold text-white">
                                  {new Date(appointment.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="flex items-center gap-1 text-slate-400">
                                  <Clock size={14} /> Horário:
                                </span>
                                <span className="font-semibold text-white">{appointment.time}</span>
                            </div>
                                <div className="flex justify-between border-t border-white/10 pt-2">
                                  <span className="text-slate-400">Valor:</span>
                                  <span className="font-bold text-[#f5b51b]">
                                    R$ {Number(appointment.price).toFixed(2)}
                                  </span>
                                </div>
                                  <div className="flex items-start gap-1.5 pt-1 text-xs text-slate-400">
                                    <MapPin size={14} className="mt-0.5 shrink-0 text-[#f5b51b]" />
                                    <span>{appointment.companyAddress}</span>
                                  </div>
                                </div>

                                {/* Pagamento PIX da barbearia (quando exigido para confirmar a vaga) */}
                                {appointment.status === 'SCHEDULED' && appointment.requirePrepaymentToConfirm && appointment.pix && (
                                  <div className="space-y-3 rounded-xl border border-[#f5b51b]/30 bg-[#f5b51b]/10 p-4 text-xs">
                                    <div className="flex items-center gap-2 font-bold text-[#f5b51b]">
                                      <QrCode size={16} />
                                      <span>Pagamento PIX para Confirmar a Vaga</span>
                                    </div>
                                    <p className="text-amber-100">
                                      Pague até <strong>{payHours} horas antes</strong> do seu horário. Caso não haja confirmação do pagamento pela barbearia até esse prazo, a vaga será cancelada automaticamente.
                                    </p>
                                    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/40 px-3 py-2">
                                      <div>
                                        <p className="text-[10px] text-slate-400">Chave PIX ({appointment.pix.beneficiary})</p>
                                        <p className="font-mono text-sm font-bold text-white">{appointment.pix.key}</p>
                                        {appointment.pix.bank && (
                                          <p className="text-[10px] text-slate-400">{appointment.pix.bank}</p>
                                        )}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={handleCopyPix}
                                        className="inline-flex items-center gap-1 rounded-lg bg-[#f5b51b] px-2.5 py-1.5 text-xs font-bold text-[#15120b]"
                                      >
                                        {copiedPix ? <Check size={13} /> : <Copy size={13} />}
                                        <span>{copiedPix ? 'Copiada' : 'Copiar'}</span>
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {appointment.status === 'CONFIRMED' ? (
                                      <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/15 p-4 text-center">
                                        <CheckCircle className="mx-auto mb-2 h-8 w-8 text-emerald-400" />
                                        <p className="font-semibold text-emerald-300">Vaga Confirmada!</p>
                                        <p className="mt-1 text-xs text-slate-300">
                                          Te esperamos no horário agendado.
                                        </p>
                                      </div>
                                      ) : appointment.status === 'CANCELLED' ? (
                                        <div className="rounded-xl border border-red-500/40 bg-red-500/15 p-4 text-center">
                                          <XCircle className="mx-auto mb-2 h-8 w-8 text-red-400" />
                                          <p className="font-semibold text-red-300">Agendamento Cancelado</p>
                                        </div>
                                        ) : (
                                          <div className="space-y-3">
                                            {paymentNotified && (
                                              <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-center text-xs text-sky-200">
                                                Aviso enviado! Aguarde o barbeiro confirmar o recebimento do PIX para liberar a vaga.
                                              </div>
                                            )}

                                            <div className="grid grid-cols-2 gap-3">
                                              <button
                                                disabled={updating}
                                                onClick={() => handleAction({ status: 'CANCELLED' })}
                                                className="rounded-xl border border-red-500/40 bg-red-600/20 px-4 py-3 text-xs font-semibold text-red-300 transition hover:bg-red-600/30 disabled:opacity-50"
                                              >
                                                Cancelar Horário
                                              </button>

                                              {appointment.requirePrepaymentToConfirm ? (
                                                <button
                                                  disabled={updating || paymentNotified}
                                                  onClick={() => handleAction({ notifyPayment: true })}
                                                  className="rounded-xl bg-gradient-to-r from-[#f5b51b] to-[#dc9b2d] px-4 py-3 text-xs font-bold text-[#15120b] transition hover:brightness-110 disabled:opacity-50"
                                                >
                                                  {paymentNotified ? 'Aviso Enviado' : 'Já Paguei o PIX'}
                                                </button>
                                              ) : (
                                                <button
                                                  disabled={updating}
                                                  onClick={() => handleAction({ status: 'CONFIRMED' })}
                                                  className="rounded-xl bg-emerald-600 px-4 py-3 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                                                >
                                                  Confirmar Presença
                                                </button>
                                              )}
                                            </div>

                                            <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                                              <AlertTriangle size={12} className="text-[#f5b51b]" />
                                              <span>Cancelamento permitido somente até {cancelHours}h antes do horário.</span>
                                            </p>
                                          </div>
        )}
                                        </div>
                                      </div>
                                      )
}
