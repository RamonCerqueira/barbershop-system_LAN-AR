import { productInput } from '@/lib/validation'
import { apiError } from '@/lib/http'
import { jsonResponse } from '@/lib/json'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

const CATEGORY_MAP: Record<string, 'BEVERAGES' | 'SNACKS' | 'GAMES' | 'OTHER'> = {
  BEVERAGES: 'BEVERAGES',
  SNACKS: 'SNACKS',
  GAMES: 'GAMES',
  OTHER: 'OTHER',
  BEBIDAS: 'BEVERAGES',
  PETISCOS: 'SNACKS',
  JOGOS: 'GAMES',
  OUTROS: 'OTHER'
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth || !auth.companyId) {
      return jsonResponse({ error: 'Não autorizado' }, { status: 401 })
    }

    const products = await prisma.product.findMany({
      where: { companyId: auth.companyId },
      orderBy: { createdAt: 'desc' }
    })

    return jsonResponse(products)
  } catch (error) { return apiError(error) }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth || !auth.companyId) {
      return jsonResponse({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = productInput.parse(await request.json())
    const { name, description, category, price, stock, minStock, isActive } = body

    if (!name || price === undefined) {
      return jsonResponse(
        { error: 'Nome e preço são obrigatórios' },
        { status: 400 }
      )
    }

    const mappedCategory = CATEGORY_MAP[String(category || 'OTHER').toUpperCase()] || 'OTHER'

    const product = await prisma.product.create({
      data: {
        name: String(name).trim(),
        description: description ? String(description).trim() : null,
        category: mappedCategory,
        price: Number(price),
        stock: Number(stock ?? 0),
        minStock: Number(minStock ?? 5),
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        companyId: auth.companyId
      }
    })

    return jsonResponse(product, { status: 201 })
  } catch (error) { return apiError(error) }
}

