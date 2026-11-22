'use client'


import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { CalendarDays, CalendarPlus, Check, Copy, Download, History, MessageCircle, RefreshCw, Scissors, Star, X } from 'lucide-react'
import { brDay, brMoney, CustomerAccess, customerRequest, useCustomer } from './CustomerPortal'
import { availableSlots, brazilToday, type ShopDetail } from './ShopProfile'
import { SaasModal } from '@/components/ui/SaasModal'

type Reservation = { id: string; companyId: string; companyName: string; companyPhone: string; address: string; date: string; time: string; duration: number; status: string; price: number; service: string; professional: string; serviceId: string; employeeId: string; cancellationHours: number; review: { rating: number; comment: string } | null; pix: { key: string; beneficiary: string; bank: string; deadlineHours: number } | null }
const labels: Record<string, string> = { SCHEDULED: 'Aguardando confirmação', CONFIRMED: 'Confirmado', IN_PROGRESS: 'Em atendimento', COMPLETED: 'Concluído', CANCELLED: 'Cancelado', NO_SHOW: 'Não compareceu' }
const instant = (item: Reservation) => new Date(`${item.date}T${item.time}:00-03:00`).getTime()

function saveCalendar(item: Reservation) {
  const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const text = (value: string) => value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//BarberPro//Agendamentos//PT-BR', 'BEGIN:VEVENT', `UID:${item.id}@barberpro`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(new Date(instant(item)))}`, `DTEND:${stamp(new Date(instant(item) + item.duration * 60000))}`, `SUMMARY:${text(item.service + ' — ' + item.companyName)}`, `LOCATION:${text(item.address)}`, 'BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', 'DESCRIPTION:Lembrete de atendimento', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR']
  const url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' }))
  const link = document.createElement('a'); link.href = url; link.download = 'meu-atendimento.ics'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function CustomerAppointments({ history = false }: { history?: boolean }) {
  const { customer, loading: accountLoading } = useCustomer()
  const [items, setItems] = useState<Reservation[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false)
  const [modal, setModal] = useState<{ type: 'cancel' | 'reschedule' | 'review'; item: Reservation } | null>(null)
  const [date, setDate] = useState(brazilToday), [time, setTime] = useState(''), [availability, setAvailability] = useState<ShopDetail | null>(null), [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [rating, setRating] = useState(5), [comment, setComment] = useState(''), [modalError, setModalError] = useState('')
  const load = useCallback(async () => { const body = await customerRequest('/api/customer/appointments'); setItems(body); setLoading(false) }, [])
  useEffect(() => {
    if (!customer) { setItems([]); setLoading(false); return }
    let disposed = false
    const refresh = () => { void load().catch(failure => { if (!disposed) { setError(failure.message); setLoading(false) } }) }
    refresh(); const timer = setInterval(refresh, 30000)
    return () => { disposed = true; clearInterval(timer) }
  }, [customer, load])
  useEffect(() => { if (new URLSearchParams(window.location.search).get('success') === '1') setMessage('Reserva recebida! Acompanhe abaixo o status e as condições de confirmação.') }, [])
  useEffect(() => {
    if (modal?.type !== 'reschedule') return
    const controller = new AbortController(); setAvailability(null); setTime(''); setAvailabilityLoading(true)
    void customerRequest(`/api/public/barbershops/${modal.item.companyId}?${new URLSearchParams({ date, serviceId: modal.item.serviceId })}`, { signal: controller.signal }).then(setAvailability).catch(failure => { if (!controller.signal.aborted) setModalError(failure.message) }).finally(() => { if (!controller.signal.aborted) setAvailabilityLoading(false) })
    return () => controller.abort()
  }, [modal, date])
  function open(type: 'cancel' | 'reschedule' | 'review', item: Reservation) { setModalError(''); setDate(item.date >= brazilToday() ? item.date : brazilToday()); setTime(''); setRating(item.review?.rating || 5); setComment(item.review?.comment || ''); setModal({ type, item }) }
  async function action() {
    if (!modal || busy) return
    setBusy(true); setModalError('')
    try {
      if (modal.type === 'review') await customerRequest('/api/customer/reviews', { method: 'POST', body: JSON.stringify({ appointmentId: modal.item.id, rating, comment }) })
      else await customerRequest(`/api/customer/appointments/${modal.item.id}`, { method: 'PATCH', body: JSON.stringify(modal.type === 'cancel' ? { action: 'CANCEL' } : { action: 'RESCHEDULE', date, time }) })
      setMessage(modal.type === 'review' ? 'Avaliação salva! Obrigado por compartilhar sua experiência.' : modal.type === 'cancel' ? 'Agendamento cancelado.' : 'Horário atualizado!'); setModal(null); await load()
    } catch (failure) { setModalError(failure instanceof Error ? failure.message : 'Tente novamente.') }
    finally { setBusy(false) }
  }
  const active = (item: Reservation) => item.status === 'IN_PROGRESS' || ['SCHEDULED','CONFIRMED'].includes(item.status) && instant(item) > Date.now()
  const visible = items.filter(item => history ? !active(item) : active(item)).sort((a, b) => history ? instant(b) - instant(a) : instant(a) - instant(b))
  if (!accountLoading && !customer) return <CustomerAccess />
  const modalSlots = modal && availability ? availableSlots(availability, modal.item.employeeId, modal.item.duration) : []
  return <><div className="cp-page-heading"><span className="cp-eyebrow">SEU TEMPO, BEM CUIDADO</span><h1>{history ? 'Seu histórico de estilo' : 'Sua próxima experiência'}</h1><p>{history ? 'Relembre seus atendimentos, avalie e reserve novamente.' : 'Acompanhe suas reservas e organize seu próximo atendimento.'}</p></div><div className="cp-agenda-nav"><Link href="/cliente/agendamentos" aria-current={!history ? 'page' : undefined}><CalendarDays size={17} />Próximos horários</Link><Link href="/cliente/historico" aria-current={history ? 'page' : undefined}><History size={17} />Histórico</Link><Link href="/cliente" className="cp-secondary"><CalendarPlus size={16} />Novo agendamento</Link></div>
    {message && <p className="cp-success" role="status">{message}</p>}{error && <p className="cp-error" role="alert">{error}</p>}
    {loading || accountLoading ? <div className="cp-skeleton" /> : !visible.length ? <section className="cp-empty"><Scissors size={36} /><h2>{history ? 'Sua história começa no próximo corte' : 'Um horário esperando por você'}</h2><p>{history ? 'O histórico reúne reservas feitas com sua conta. Reservas antigas não são vinculadas automaticamente pelo telefone.' : 'Encontre sua barbearia e reserve um momento para cuidar de você.'}</p><Link className="cp-button" href="/cliente">Explorar barbearias</Link></section> : <div className="cp-appointments">{visible.map(item => {
      const canChange = ['SCHEDULED','CONFIRMED'].includes(item.status) && instant(item) - Date.now() >= item.cancellationHours * 3600000
      return <article className="cp-appointment" key={item.id}><div className="cp-appointment-main"><div className="cp-date-block"><span>{brDay(item.date)}</span><strong>{item.time}</strong></div><div className="cp-appointment-info"><span className={`cp-status cp-status-${item.status.toLowerCase()}`}>{labels[item.status]}</span><h2>{item.service}</h2><Link href={`/cliente/barbearia/${item.companyId}`}>{item.companyName}</Link><p>{item.professional} · {item.duration} min · {brMoney(item.price)}</p><p><MapPinText address={item.address} /></p></div></div><div className="cp-appointment-actions">{active(item) && <><button className="cp-secondary" type="button" onClick={() => saveCalendar(item)}><Download size={15} />Salvar na agenda</button>{canChange ? <><button className="cp-secondary" type="button" onClick={() => open('reschedule', item)}><RefreshCw size={15} />Remarcar</button><button className="cp-text-button" type="button" onClick={() => open('cancel', item)}><X size={15} />Cancelar</button></> : <a href={`https://wa.me/${item.companyPhone.replace(/\D/g, '').replace(/^(?!55)/, '55')}`} target="_blank" rel="noopener noreferrer" className="cp-secondary"><MessageCircle size={15} />Falar com a barbearia</a>}</>}{item.status === 'COMPLETED' && <button type="button" className="cp-secondary" onClick={() => open('review', item)}><Star size={15} />{item.review ? 'Editar avaliação' : 'Avaliar atendimento'}</button>}{history && <Link href={`/cliente/barbearia/${item.companyId}?${new URLSearchParams({ service: item.serviceId, professional: item.employeeId })}`} className="cp-button cp-button-small"><Scissors size={15} />Agendar novamente</Link>}</div>{active(item) && <p className="cp-note">Alterações pelo portal até {item.cancellationHours}h antes do atendimento.</p>}{active(item) && item.pix && <details className="cp-pix"><summary>PIX necessário para confirmar a vaga</summary><p>Pague até {item.pix.deadlineHours}h antes e aguarde a conferência da barbearia.</p><strong>{item.pix.beneficiary}</strong><span>{item.pix.bank}</span><code>{item.pix.key}</code><div><button className="cp-secondary" type="button" onClick={async () => { try { await navigator.clipboard.writeText(item.pix!.key); setMessage('Chave PIX copiada.') } catch { setError('Copie a chave PIX exibida acima.') } }}><Copy size={14} />Copiar chave</button><button className="cp-secondary" type="button" disabled={busy} onClick={async () => { setBusy(true); try { await customerRequest(`/api/customer/appointments/${item.id}`, { method: 'PATCH', body: JSON.stringify({ action: 'PAYMENT_NOTICE' }) }); setMessage('A barbearia foi avisada. Aguarde a conferência do pagamento.') } catch (failure) { setError(failure instanceof Error ? failure.message : 'Tente novamente.') } finally { setBusy(false) } }}><Check size={14} />Já fiz o PIX</button></div></details>}</article>
    })}</div>}
    {modal && <SaasModal title={modal.type === 'review' ? 'Como foi seu atendimento?' : modal.type === 'cancel' ? 'Cancelar este agendamento?' : 'Escolha um novo horário'} description={`${modal.item.service} · ${modal.item.companyName}`} icon="calendar" tone={modal.type === 'cancel' ? 'danger' : 'default'} onClose={() => { if (!busy) setModal(null) }}><div className="cp-form">{modalError && <p className="cp-error" role="alert">{modalError}</p>}{modal.type === 'cancel' ? <p className="cp-note">O horário será liberado para outros clientes. Caso tenha pago antecipadamente, combine o estorno diretamente com a barbearia.</p> : modal.type === 'review' ? <><div className="cp-review-picker" aria-label="Sua avaliação">{[1,2,3,4,5].map(value => <button type="button" aria-label={`${value} estrelas`} aria-pressed={rating === value} key={value} onClick={() => setRating(value)}><Star size={32} fill={value <= rating ? 'currentColor' : 'none'} /></button>)}</div><label>Conte sua experiência<textarea maxLength={800} rows={4} value={comment} onChange={e => setComment(e.target.value)} placeholder="Como foi o atendimento? Evite publicar dados pessoais." /></label></> : <><label>Nova data<input type="date" min={brazilToday()} max={new Date(Date.parse(brazilToday() + 'T12:00:00Z') + (availability?.advanceBookingDays || 30) * 86400000).toISOString().slice(0,10)} value={date} onChange={e => setDate(e.target.value)} /></label>{availabilityLoading ? <p>Consultando horários…</p> : modalSlots.length ? <div className="cp-time-grid">{modalSlots.map(value => <button type="button" aria-pressed={time === value} className={time === value ? 'selected' : ''} key={value} onClick={() => setTime(value)}>{value}</button>)}</div> : <p className="cp-note">Nenhum horário disponível. Escolha outra data.</p>}</>}<div className="saas-modal-actions justify-end"><button type="button" disabled={busy} onClick={() => setModal(null)}>Voltar</button><button type="button" className="bg-orange-500" disabled={busy || modal.type === 'reschedule' && (!time || !modalSlots.includes(time))} onClick={() => void action()}>{busy ? 'Salvando…' : modal.type === 'review' ? 'Publicar avaliação' : modal.type === 'cancel' ? 'Confirmar cancelamento' : 'Salvar novo horário'}</button></div></div></SaasModal>}
  </>
}
function MapPinText({ address }: { address: string }) { return <span>{address}</span> }
