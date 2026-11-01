import { HttpError } from './http'

type DayHours = { isOpen?: boolean; openTime?: string; closeTime?: string; breakStart?: string; breakEnd?: string }
export type BookingSettings = { businessHours: Record<string, DayHours>; appointmentConfig: { advanceBookingDays?: number; slotDuration?: number; cancellationDeadline?: number; autoConfirm?: boolean } }
export const minuteOfDay = (time: string) => Number(time.slice(0,2)) * 60 + Number(time.slice(3))
export const overlaps = (a: number, durationA: number, b: number, durationB: number) => a < b + durationB && b < a + durationA
export const bookingInstant = (date: string, time: string) => new Date(`${date}T${time}:00-03:00`)
export const dayRange = (date: string) => ({ gte: new Date(`${date}T00:00:00Z`), lt: new Date(new Date(`${date}T00:00:00Z`).getTime() + 86_400_000) })

export function assertAvailable(date: string, time: string, duration: number, settings: BookingSettings, occupied: { time: string; duration: number }[], now = new Date()) {
  const day = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][new Date(`${date}T12:00:00Z`).getUTCDay()]
  const hours = settings.businessHours[day]
  const start = minuteOfDay(time)
  if (!hours?.isOpen || !hours.openTime || !hours.closeTime) throw new HttpError(400, 'A barbearia está fechada nesta data.')
  if (!Number.isInteger(duration) || duration < 1 || duration > 720) throw new HttpError(400, 'Duração inválida.')
  const instant = bookingInstant(date,time)
  if (instant <= now || instant.getTime() > now.getTime() + Number(settings.appointmentConfig.advanceBookingDays || 30) * 86_400_000) throw new HttpError(400, 'Data fora do período de agendamento.')
  if (start < minuteOfDay(hours.openTime) || start + duration > minuteOfDay(hours.closeTime)) throw new HttpError(400, 'O serviço precisa terminar dentro do horário de funcionamento.')
  const step = Number(settings.appointmentConfig.slotDuration || 30)
  if (!Number.isInteger(step) || step < 1 || (start - minuteOfDay(hours.openTime)) % step !== 0) throw new HttpError(400, 'Horário fora da grade de agendamento.')
  if (hours.breakStart && hours.breakEnd && overlaps(start, duration, minuteOfDay(hours.breakStart), minuteOfDay(hours.breakEnd) - minuteOfDay(hours.breakStart))) throw new HttpError(400, 'O serviço coincide com o intervalo.')
  if (occupied.some(other => overlaps(start,duration,minuteOfDay(other.time),other.duration))) throw new HttpError(409, 'Este profissional já possui um atendimento neste intervalo.')
}

const transitions: Record<string,string[]> = { SCHEDULED: ['CONFIRMED','CANCELLED','NO_SHOW','IN_PROGRESS'], CONFIRMED: ['IN_PROGRESS','CANCELLED','NO_SHOW'], IN_PROGRESS: ['COMPLETED'], COMPLETED: [], CANCELLED: [], NO_SHOW: [] }
export function assertTransition(from: string, to: string) {
  if (from !== to && !transitions[from]?.includes(to)) throw new HttpError(409, 'Alteração de status não permitida.')
}
