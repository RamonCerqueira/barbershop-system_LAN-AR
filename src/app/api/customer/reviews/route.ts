import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireCustomer } from '@/lib/customer-auth'
import { prisma } from '@/lib/prisma'
import { jsonResponse } from '@/lib/json'
import { apiError, HttpError } from '@/lib/http'

export async function POST(request: NextRequest) {
  try {
    const customer = await requireCustomer(request)
    const data = z.object({ appointmentId: z.string().min(1), rating: z.number().int().min(1).max(5), comment: z.string().trim().max(800) }).parse(await request.json())
    const appointment = await prisma.appointment.findFirst({ where: { id: data.appointmentId, customerAccountId: customer.id, status: 'COMPLETED' }, select: { companyId: true } })
    if (!appointment) throw new HttpError(403, 'A avaliação fica disponível após a conclusão de um atendimento da sua conta.')
    await prisma.customerReview.upsert({ where: { appointmentId: data.appointmentId }, create: { ...data, customerId: customer.id, companyId: appointment.companyId }, update: { rating: data.rating, comment: data.comment } })
    return jsonResponse({ success: true })
  } catch (error) { return apiError(error) }
}
