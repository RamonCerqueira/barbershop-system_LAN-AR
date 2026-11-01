import { jsonResponse } from '@/lib/json'
import { registerSale } from '@/lib/sales'
import { apiError } from '@/lib/http'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth || !auth.companyId) {
      return jsonResponse({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')

    const dateFilter: any = {}
    if (dateParam) {
      const [y, m, d] = dateParam.split('-').map(Number)
      dateFilter.gte = new Date(y, m - 1, d, 0, 0, 0, 0)
      dateFilter.lte = new Date(y, m - 1, d, 23, 59, 59, 999)
    }

    const sales = await prisma.sale.findMany({
      where: {
        companyId: auth.companyId,
        ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {})
      },
      include: {
        client: true,
        appointment: {
          include: {
            service: true,
            employee: true
          }
        },
        saleItems: {
          include: {
            product: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return jsonResponse(sales)
  } catch (error) {
    console.error('Erro ao buscar vendas:', error)
    return jsonResponse({ error: 'Erro ao buscar vendas' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth?.companyId) return jsonResponse({ error: 'Não autorizado' }, { status: 401 })
    const result = await registerSale(await request.json(),auth.companyId,auth.id,request.headers.get('idempotency-key'))
    return jsonResponse(result.sale, { status: result.repeated ? 200 : 201 })
  } catch (error) { return apiError(error) }
}
