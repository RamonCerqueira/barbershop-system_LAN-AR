import { clientInput } from '@/lib/validation'
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
    const body = clientInput.partial().parse(await request.json())

    const existing = await prisma.client.findFirst({
      where: { id, companyId: auth.companyId }
    })

    if (!existing) {
      return jsonResponse({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    const updated = await prisma.client.update({
      where: { id },
      data: {
        fullName: body.fullName !== undefined ? String(body.fullName).trim() : existing.fullName,
        phone: body.phone !== undefined ? String(body.phone).trim() : existing.phone,
        email:
          body.email !== undefined
            ? body.email
              ? String(body.email).trim()
              : null
            : existing.email,
        address:
          body.address !== undefined
            ? body.address
              ? String(body.address).trim()
              : null
            : existing.address,
        birthDate:
          body.birthDate !== undefined
            ? body.birthDate
              ? new Date(body.birthDate)
              : null
            : existing.birthDate,
        notes:
          body.notes !== undefined
            ? body.notes
              ? String(body.notes).trim()
              : null
            : existing.notes,
        rating: body.rating !== undefined ? Number(body.rating) : existing.rating,
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

    const existing = await prisma.client.findFirst({
      where: { id, companyId: auth.companyId }
    })

    if (!existing) {
      return jsonResponse({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    await prisma.client.update({ where: { id }, data: { isActive: false } })
    return jsonResponse({ success: true })
  } catch (error) { return apiError(error) }
}

