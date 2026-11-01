import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from './prisma'
import { bookingInput } from './validation'
import { HttpError } from './http'
import { assertAvailable, assertTransition, BookingSettings, dayRange } from './booking-rules'
import { digest, opaqueToken } from './security'

export const appointmentInclude = { client: true, service: true, employee: true } as const
export function formatAppointment(a: Prisma.AppointmentGetPayload<{ include: typeof appointmentInclude }>) {
  return { id: a.id, date: a.date.toISOString().slice(0,10), rawDate: a.date, time: a.time, status: a.status, notes: a.notes || '', price: Number(a.price),
    duration: a.duration, clientId: a.clientId, clientName: a.client.fullName, clientPhone: a.client.phone, clientEmail: a.client.email || '',
    serviceId: a.serviceId, serviceName: a.serviceNameSnapshot || a.service.name, employeeId: a.employeeId, employeeName: a.employeeNameSnapshot || a.employee.name }
}
async function lock(tx: Prisma.TransactionClient, company: string, employee: string, date: string) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${company}),hashtext(${employee + ':' + date}))::text`
}
export async function createBooking(input: unknown, companyId: string, idempotency: string | null, publicBooking = false) {
  const data = bookingInput.parse(input)
  if (!idempotency || !/^[a-zA-Z0-9_-]{16,100}$/.test(idempotency)) throw new HttpError(400, 'Chave de operação obrigatória. Atualize a página e tente novamente.')
  return prisma.$transaction(async tx => {
    await lock(tx,companyId,data.employeeId,data.date)
    const previous = await tx.appointment.findUnique({ where: { idempotencyKey: companyId + ':' + idempotency }, include: appointmentInclude })
    if (previous) return { appointment: previous, confirmationToken: undefined, repeated: true }
    const [service,employee,settings,company] = await Promise.all([
      tx.service.findFirst({ where: { id: data.serviceId, companyId, isActive: true }, include: { serviceCosts: { where: { isActive: true } } } }),
      tx.employee.findFirst({ where: { id: data.employeeId, companyId, isActive: true, role: { in: ['BARBER','PODIATRY','MASSAGE'] } } }),
      tx.companySettings.findUnique({ where: { companyId } }), tx.company.findFirst({ where: { id: companyId, isActive: true } })
    ])
    if (!service || !employee || !settings || !company) throw new HttpError(404, 'Empresa, serviço ou profissional indisponível.')
    const occupied = await tx.appointment.findMany({ where: { companyId, employeeId: employee.id, date: dayRange(data.date), status: { notIn: ['CANCELLED','NO_SHOW'] } }, select: { time: true, duration: true } })
    assertAvailable(data.date,data.time,service.duration,settings as unknown as BookingSettings,occupied)
    let client
    if (data.clientId && !publicBooking) client = await tx.client.findFirst({ where: { id: data.clientId, companyId, isActive: true } })
    else {
      if (!data.clientName || !data.clientPhone) throw new HttpError(400, 'Nome e telefone são obrigatórios.')
      await lock(tx,companyId,'client',data.clientPhone)
      client = await tx.client.findFirst({ where: { companyId, phone: data.clientPhone, isActive: true } })
      if (!client) client = await tx.client.create({ data: { fullName: data.clientName, phone: data.clientPhone, email: data.clientEmail, companyId, rating: null } })
    }
    if (!client) throw new HttpError(404, 'Cliente indisponível.')
    const confirmationToken = opaqueToken()
    const appointment = await tx.appointment.create({ data: {
      companyId, clientId: client.id, serviceId: service.id, employeeId: employee.id, date: new Date(`${data.date}T12:00:00Z`), time: data.time,
      price: !publicBooking && data.price !== undefined ? data.price : service.price, duration: service.duration, notes: data.notes,
      status: (settings.appointmentConfig as { autoConfirm?: boolean }).autoConfirm ? 'CONFIRMED' : 'SCHEDULED',
      confirmationHash: digest(confirmationToken), confirmationExpiresAt: new Date(`${data.date}T23:59:59-03:00`), idempotencyKey: companyId + ':' + idempotency,
      serviceNameSnapshot: service.name, employeeNameSnapshot: employee.name,
      costSnapshot: service.serviceCosts.reduce((sum,cost)=>sum.plus(cost.costPerUse),new Prisma.Decimal(0)),
      commissionSnapshot: new Prisma.Decimal(!publicBooking && data.price !== undefined ? data.price : service.price).times(employee.commissionRate).dividedBy(100).toDecimalPlaces(2)
    }, include: appointmentInclude })
    await tx.notification.create({ data: { companyId, type: 'APPOINTMENT', title: 'Novo agendamento', message: `Agendamento recebido para ${data.date} às ${data.time}.` } })
    return { appointment, confirmationToken, repeated: false }
  }, { timeout: 15_000 })
}

const updateInput = bookingInput.partial().extend({ status: z.enum(['SCHEDULED','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED','NO_SHOW']).optional() })
export async function updateBooking(id: string, companyId: string, input: unknown) {
  const data = updateInput.parse(input)
  return prisma.$transaction(async tx => {
    await lock(tx,companyId,'appointment',id)
    const current = await tx.appointment.findFirst({ where: { id, companyId }, include: appointmentInclude })
    if (!current) throw new HttpError(404, 'Agendamento não encontrado.')
    const nextStatus = data.status || current.status
    assertTransition(current.status,nextStatus)
    const rescheduling = data.date !== undefined || data.time !== undefined || data.employeeId !== undefined || data.serviceId !== undefined || data.clientId !== undefined
    if (rescheduling && !['SCHEDULED','CONFIRMED'].includes(current.status)) throw new HttpError(409, 'Somente agendamentos futuros podem ser remarcados.')
    const date = data.date || current.date.toISOString().slice(0,10)
    const time = data.time || current.time
    const employeeId = data.employeeId || current.employeeId
    let duration = current.duration
    let price = data.price ?? current.price
    if (rescheduling) {
      await lock(tx,companyId,employeeId,date)
      const [service,employee,client,settings] = await Promise.all([
        tx.service.findFirst({ where: { id: data.serviceId || current.serviceId, companyId, isActive: true } }),
        tx.employee.findFirst({ where: { id: employeeId, companyId, isActive: true } }),
        tx.client.findFirst({ where: { id: data.clientId || current.clientId, companyId, isActive: true } }), tx.companySettings.findUnique({ where: { companyId } })
      ])
      if (!service || !employee || !client || !settings) throw new HttpError(404, 'Dados de agendamento indisponíveis.')
      if (data.serviceId && data.serviceId !== current.serviceId) { duration = service.duration; price = data.price ?? service.price }
      const occupied = await tx.appointment.findMany({ where: { id: { not: id }, companyId, employeeId, date: dayRange(date), status: { notIn: ['CANCELLED','NO_SHOW'] } }, select: { time: true, duration: true } })
      assertAvailable(date,time,duration,settings as unknown as BookingSettings,occupied)
    }
    const updated = await tx.appointment.update({ where: { id }, data: { date: new Date(`${date}T12:00:00Z`), time, employeeId, serviceId: data.serviceId, clientId: data.clientId, notes: data.notes, status: nextStatus, duration, price }, include: appointmentInclude })
    if (nextStatus === 'COMPLETED' && current.status !== 'COMPLETED') await tx.client.update({ where: { id: current.clientId }, data: { totalVisits: { increment: 1 } } })
    return updated
  }, { timeout: 15_000 })
}
