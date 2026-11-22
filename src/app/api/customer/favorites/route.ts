import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireCustomer } from '@/lib/customer-auth'
import { prisma } from '@/lib/prisma'
import { jsonResponse } from '@/lib/json'
import { apiError, HttpError } from '@/lib/http'

export async function GET(request: NextRequest) {
  try { const customer = await requireCustomer(request); return jsonResponse((await prisma.customerFavorite.findMany({ where: { customerId: customer.id }, select: { companyId: true } })).map(f => f.companyId), { headers: { 'Cache-Control': 'private, no-store' } }) }
  catch (error) { return apiError(error) }
}
export async function PUT(request: NextRequest) {
  try {
    const customer = await requireCustomer(request)
    const { companyId, favorite } = z.object({ companyId: z.string().min(1), favorite: z.boolean() }).parse(await request.json())
    if (!await prisma.company.findFirst({ where: { id: companyId, isActive: true }, select: { id: true } })) throw new HttpError(404, 'Barbearia não encontrada.')
    if (favorite) await prisma.customerFavorite.upsert({ where: { customerId_companyId: { customerId: customer.id, companyId } }, create: { customerId: customer.id, companyId }, update: {} })
    else await prisma.customerFavorite.deleteMany({ where: { customerId: customer.id, companyId } })
    return jsonResponse({ success: true })
  } catch (error) { return apiError(error) }
}
