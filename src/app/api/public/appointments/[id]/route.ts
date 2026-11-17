import { jsonResponse } from '@/lib/json'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { digest } from '@/lib/security'
import { apiError, HttpError } from '@/lib/http'
import { assertTransition, bookingInstant } from '@/lib/booking-rules'
import { rateLimit } from '@/lib/rate-limit'
import { z } from 'zod'

async function authorized(request: NextRequest, id: string) {
  const token = request.headers.get('x-confirmation-token')
  if (!token || !/^[a-f0-9]{64}$/.test(token)) throw new HttpError(404,'Link inválido ou expirado.')
  const a = await prisma.appointment.findFirst({ where: { id, confirmationHash: digest(token), confirmationExpiresAt: { gt: new Date() }, company: { isActive: true } }, include: { client: true, service: true, employee: true, company: { include: { settings: true } } } })
  if (!a) throw new HttpError(404,'Link inválido ou expirado.')
  return a
}
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const a = await authorized(request,(await params).id)
    const cfg = (a.company.settings?.appointmentConfig as Record<string, unknown>) || {}
    const requirePrepayment = Boolean(cfg.requirePrepaymentToConfirm)
    const paymentDeadlineHours = Number(cfg.paymentDeadlineHours ?? 2)
    const cancellationDeadline = Number(cfg.cancellationDeadline ?? 2)
    const pix = cfg.pixKey
      ? {
          key: String(cfg.pixKey),
          beneficiary: String(cfg.pixBeneficiary || a.company.fullName),
          bank: String(cfg.pixBank || '')
        }
      : null

    return jsonResponse({
      id: a.id,
      date: a.date.toISOString().slice(0, 10),
      time: a.time,
      status: a.status,
      price: a.price,
      duration: a.duration,
      clientName: a.client.fullName,
      serviceName: a.service.name,
      employeeName: a.employee.name,
      companyName: a.company.name,
      companyAddress: a.company.address,
      companyPhone: a.company.phone,
      requirePrepaymentToConfirm: requirePrepayment,
      paymentDeadlineHours,
      cancellationDeadline,
      pix
    })
  } catch (error) { return apiError(error) }
}
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await rateLimit(request,'public-confirmation','',30)
    const a = await authorized(request,(await params).id)
    const body = z.object({
      status: z.enum(['CONFIRMED','CANCELLED']).optional(),
      notifyPayment: z.boolean().optional()
    }).parse(await request.json())

    const cfg = (a.company.settings?.appointmentConfig as Record<string, unknown>) || {}
    const requirePrepayment = Boolean(cfg.requirePrepaymentToConfirm)
    const hours = Number(cfg.cancellationDeadline ?? 2)
    const instant = bookingInstant(a.date.toISOString().slice(0,10),a.time)

    if (body.notifyPayment) {
      if (a.status !== 'SCHEDULED') throw new HttpError(409, 'Este agendamento não está aguardando pagamento.')
      await prisma.notification.create({
        data: {
          companyId: a.companyId,
          type: 'PAYMENT',
          title: 'Cliente informou pagamento PIX do agendamento',
          message: `${a.client.fullName} informou que pagou o PIX para o horário ${a.date.toISOString().slice(0,10)} às ${a.time} (${a.service.name}). Confira e confirme a vaga manualmente.`
        }
      })
      return jsonResponse({ id: a.id, status: a.status, paymentNotified: true })
    }

    if (!body.status) throw new HttpError(400, 'Ação obrigatória.')
    const status = body.status

    if (status === 'CONFIRMED' && requirePrepayment) {
      throw new HttpError(409, 'Esta barbearia confirma a vaga após conferir o pagamento via PIX. Avise o pagamento para análise.')
    }

    assertTransition(a.status,status)
    if (a.status === status) return jsonResponse({ id: a.id,status })
    if (instant <= new Date() || (status === 'CANCELLED' && instant.getTime() - Date.now() < hours * 3_600_000)) throw new HttpError(409,`O prazo para esta alteração terminou (limite de ${hours}h antes). Contate a barbearia.`)
    await prisma.$transaction(async tx => {
      const changed = await tx.appointment.updateMany({ where: { id: a.id, status: a.status, confirmationHash: a.confirmationHash }, data: { status } })
      if (!changed.count) throw new HttpError(409,'O agendamento foi alterado. Atualize a página.')
      await tx.notification.create({ data: { companyId: a.companyId, type: 'APPOINTMENT', title: 'Agendamento atualizado pelo cliente', message: 'Status atualizado para ' + status } })
    })
    return jsonResponse({ id: a.id,status })
  } catch (error) { return apiError(error) }
}
