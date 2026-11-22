import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireCustomer } from '@/lib/customer-auth'
import { prisma } from '@/lib/prisma'
import { updateBooking } from '@/lib/bookings'
import { dateInput, timeInput } from '@/lib/validation'
import { apiError, HttpError } from '@/lib/http'
import { jsonResponse } from '@/lib/json'
import { rateLimit } from '@/lib/rate-limit'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const customer = await requireCustomer(request)
    const { id } = await params
    const data = z.discriminatedUnion('action', [z.object({ action: z.literal('CANCEL') }), z.object({ action: z.literal('RESCHEDULE'), date: dateInput, time: timeInput }), z.object({ action: z.literal('PAYMENT_NOTICE') })]).parse(await request.json())
    const appointment = await prisma.appointment.findFirst({ where: { id, customerAccountId: customer.id }, select: { companyId: true, status: true, date: true, time: true, company: { select: { settings: { select: { appointmentConfig: true } } } } } })
    if (!appointment) throw new HttpError(404, 'Agendamento não encontrado.')
    if (data.action === 'PAYMENT_NOTICE') {
      await rateLimit(request, 'customer-payment-notice', id, 3, 3600)
      const config = appointment.company.settings?.appointmentConfig as { pixKey?: string; requirePrepaymentToConfirm?: boolean; paymentDeadlineHours?: number } | null
      if (!config?.requirePrepaymentToConfirm || !config.pixKey || appointment.status !== 'SCHEDULED' || new Date(`${appointment.date.toISOString().slice(0,10)}T${appointment.time}:00-03:00`).getTime() - Date.now() <= Math.max(1, Number(config.paymentDeadlineHours) || 2) * 3600000) throw new HttpError(409, 'Este atendimento não está disponível para aviso de PIX.')
      await prisma.notification.create({ data: { companyId: appointment.companyId, type: 'PAYMENT', title: 'Cliente informou pagamento PIX', message: `O cliente informou o pagamento do agendamento ${id}. Confira a transferência antes de confirmar a vaga.` } })
    } else await updateBooking(id, appointment.companyId, data.action === 'CANCEL' ? { status: 'CANCELLED' } : { date: data.date, time: data.time }, customer.id)
    return jsonResponse({ success: true })
  } catch (error) { return apiError(error) }
}
