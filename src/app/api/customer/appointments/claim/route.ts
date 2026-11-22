import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireCustomer } from '@/lib/customer-auth'
import { prisma } from '@/lib/prisma'
import { digest } from '@/lib/security'
import { jsonResponse } from '@/lib/json'
import { apiError, HttpError } from '@/lib/http'

export async function POST(request: NextRequest) {
  try {
    const customer = await requireCustomer(request)
    const data = z.object({ id: z.string().min(1), token: z.string().regex(/^[a-f0-9]{64}$/) }).parse(await request.json())
    const result = await prisma.appointment.updateMany({ where: { id: data.id, confirmationHash: digest(data.token), confirmationExpiresAt: { gt: new Date() }, OR: [{ customerAccountId: null }, { customerAccountId: customer.id }] }, data: { customerAccountId: customer.id } })
    if (!result.count) throw new HttpError(404, 'Reserva indisponível para vincular. Use o link privado válido recebido na reserva.')
    return jsonResponse({ success: true })
  } catch (error) { return apiError(error) }
}
