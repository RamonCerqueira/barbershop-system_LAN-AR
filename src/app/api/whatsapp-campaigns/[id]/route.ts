import { queueCampaign } from '@/lib/messages'
import { apiError } from '@/lib/http'
import { jsonResponse } from '@/lib/json'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(request)
    if (!auth || !auth.companyId) {
      return jsonResponse({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const existing = await prisma.whatsAppCampaign.findFirst({
      where: { id, companyId: auth.companyId },
      include: { company: true }
    })

    if (!existing) {
      return jsonResponse({ error: 'Campanha não encontrada' }, { status: 404 })
    }

    // Se for ação de disparo manual ("trigger": true), cria logs reais para clientes elegíveis
    if (body.trigger) return jsonResponse(await queueCampaign(id, auth.companyId))

    const updated = await prisma.whatsAppCampaign.update({
      where: { id },
      data: {
        name: body.name !== undefined ? String(body.name).trim() : existing.name,
        message:
          body.message !== undefined || body.messageTemplate !== undefined
            ? String(body.message || body.messageTemplate).trim()
            : existing.message,
        triggerDays:
          body.triggerDays !== undefined || body.recurrenceInterval !== undefined
            ? Number(body.triggerDays ?? body.recurrenceInterval)
            : existing.triggerDays,
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
    const existing = await prisma.whatsAppCampaign.findFirst({
      where: { id, companyId: auth.companyId }
    })

    if (!existing) {
      return jsonResponse({ error: 'Campanha não encontrada' }, { status: 404 })
    }

    await prisma.whatsAppCampaign.delete({ where: { id } })
    return jsonResponse({ success: true })
  } catch (error) { return apiError(error) }
}

