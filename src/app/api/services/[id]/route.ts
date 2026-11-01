import { serviceInput } from '@/lib/validation'
import { apiError } from '@/lib/http'
import { jsonResponse } from '@/lib/json'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

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
    const body = serviceInput.partial().parse(await request.json())

    const existing = await prisma.service.findFirst({
      where: { id, companyId: auth.companyId }
    })

    if (!existing) {
      return jsonResponse({ error: 'Serviço não encontrado' }, { status: 404 })
    }

    const updated = await prisma.service.update({
      where: { id },
      data: {
        name: body.name !== undefined ? String(body.name).trim() : existing.name,
        description:
          body.description !== undefined
            ? body.description
              ? String(body.description).trim()
              : null
            : existing.description,
        category: body.category !== undefined ? String(body.category) : existing.category,
        price: body.price !== undefined ? Number(body.price) : existing.price,
        duration: body.duration !== undefined ? Number(body.duration) : existing.duration,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : existing.isActive
      }
    })

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

    const existing = await prisma.service.findFirst({
      where: { id, companyId: auth.companyId }
    })

    if (!existing) {
      return jsonResponse({ error: 'Serviço não encontrado' }, { status: 404 })
    }

    await prisma.service.update({ where: { id }, data: { isActive: false } })
    return jsonResponse({ success: true })
  } catch (error) { return apiError(error) }
}

