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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(request)
    if (!auth || !auth.companyId) {
      return jsonResponse({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = productInput.partial().parse(await request.json())

    const existing = await prisma.product.findFirst({
      where: { id, companyId: auth.companyId }
    })

    if (!existing) {
      return jsonResponse({ error: 'Produto não encontrado' }, { status: 404 })
    }

    const mappedCategory =
      body.category !== undefined
        ? CATEGORY_MAP[String(body.category).toUpperCase()] || existing.category
        : existing.category

    const newStock =
      body.stock !== undefined
        ? Math.max(0, Number(body.stock))
        : existing.stock

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: body.name !== undefined ? String(body.name).trim() : existing.name,
        description:
          body.description !== undefined
            ? body.description
              ? String(body.description).trim()
              : null
            : existing.description,
        category: mappedCategory,
        price: body.price !== undefined ? Number(body.price) : existing.price,
        stock: newStock,
        minStock: body.minStock !== undefined ? Number(body.minStock) : existing.minStock,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : existing.isActive
      }
    })

    if (updated.stock <= updated.minStock && existing.stock > existing.minStock) {
      await prisma.notification.create({
        data: {
          title: 'Alerta de Estoque Baixo',
          message: `O produto "${updated.name}" atingiu estoque baixo (${updated.stock} un.).`,
          type: 'SYSTEM',
          companyId: auth.companyId
        }
      })
    }

    return jsonResponse(updated)
  } catch (error) { return apiError(error) }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(request)
    if (!auth || !auth.companyId) {
      return jsonResponse({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params

    const existing = await prisma.product.findFirst({
      where: { id, companyId: auth.companyId }
    })

    if (!existing) {
      return jsonResponse({ error: 'Produto não encontrado' }, { status: 404 })
    }

    await prisma.product.update({ where: { id }, data: { isActive: false } })
    return jsonResponse({ success: true })
  } catch (error) { return apiError(error) }
}

