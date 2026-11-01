import { serviceInput } from '@/lib/validation'
import { apiError } from '@/lib/http'
import { jsonResponse } from '@/lib/json'
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
    const search = searchParams.get('search')?.trim() || ''

    const services = await prisma.service.findMany({
      where: {
        companyId: auth.companyId,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { category: { contains: search, mode: 'insensitive' } }
              ]
            }
          : {})
      },
      include: {
        serviceCosts: true,
        _count: {
          select: { appointments: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return jsonResponse(services)
  } catch (error) { return apiError(error) }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth || !auth.companyId) {
      return jsonResponse({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = serviceInput.parse(await request.json())
    const { name, description, category, price, duration, isActive } = body

    if (!name || price === undefined || duration === undefined) {
      return jsonResponse(
        { error: 'Nome, preço e duração são obrigatórios' },
        { status: 400 }
      )
    }

    const service = await prisma.service.create({
      data: {
        name: String(name).trim(),
        description: description ? String(description).trim() : null,
        category: category ? String(category).trim() : 'Cabelo',
        price: Number(price),
        duration: Number(duration),
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        companyId: auth.companyId
      }
    })

    return jsonResponse(service, { status: 201 })
  } catch (error) { return apiError(error) }
}

