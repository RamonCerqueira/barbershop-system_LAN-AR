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
    return jsonResponse({ id: a.id, date: a.date.toISOString().slice(0,10), time: a.time, status: a.status, price: a.price, duration: a.duration, clientName: a.client.fullName, serviceName: a.service.name, employeeName: a.employee.name, companyName: a.company.name, companyAddress: a.company.address, companyPhone: a.company.phone })
  } catch (error) { return apiError(error) }
}
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await rateLimit(request,'public-confirmation','',30)
    const a = await authorized(request,(await params).id)
    const { status } = z.object({ status: z.enum(['CONFIRMED','CANCELLED']) }).parse(await request.json())
    assertTransition(a.status,status)
    if (a.status === status) return jsonResponse({ id: a.id,status })
    const hours = Number((a.company.settings?.appointmentConfig as { cancellationDeadline?: number })?.cancellationDeadline ?? 2)
    const instant = bookingInstant(a.date.toISOString().slice(0,10),a.time)
    if (instant <= new Date() || (status === 'CANCELLED' && instant.getTime() - Date.now() < hours * 3_600_000)) throw new HttpError(409,'O prazo para esta alteração terminou. Contate a barbearia.')
    await prisma.$transaction(async tx => {
      const changed = await tx.appointment.updateMany({ where: { id: a.id, status: a.status, confirmationHash: a.confirmationHash }, data: { status } })
      if (!changed.count) throw new HttpError(409,'O agendamento foi alterado. Atualize a página.')
      await tx.notification.create({ data: { companyId: a.companyId, type: 'APPOINTMENT', title: 'Agendamento atualizado pelo cliente', message: 'Status atualizado para ' + status } })
    })
    return jsonResponse({ id: a.id,status })
  } catch (error) { return apiError(error) }
}
