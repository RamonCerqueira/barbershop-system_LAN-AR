import { jsonResponse } from '@/lib/json'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth) {
      return jsonResponse({ error: 'Não autorizado' }, { status: 401 })
    }

    const where =
      auth.type === 'COMPANY_USER' && auth.companyId
        ? { companyId: auth.companyId }
        : {}

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 30
    })

    return jsonResponse(notifications)
  } catch (error) {
    console.error('Erro ao buscar notificações:', error)
    return jsonResponse({ error: 'Erro ao buscar notificações' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth) {
      return jsonResponse({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id, markAll } = await request.json()

    if (markAll && auth.companyId) {
      await prisma.notification.updateMany({
        where: { companyId: auth.companyId, isRead: false },
        data: { isRead: true }
      })
      return jsonResponse({ success: true })
    }

    if (id) {
      await prisma.notification.updateMany({
        where: {
          id,
          ...(auth.companyId ? { companyId: auth.companyId } : {})
        },
        data: { isRead: true }
      })
    }

    return jsonResponse({ success: true })
  } catch (error) {
    console.error('Erro ao atualizar notificação:', error)
    return jsonResponse({ error: 'Erro ao atualizar notificação' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth) {
      return jsonResponse({ error: 'Não autorizado' }, { status: 401 })
    }

    if (auth.companyId) {
      await prisma.notification.deleteMany({
        where: { companyId: auth.companyId }
      })
    }

    return jsonResponse({ success: true })
  } catch (error) {
    console.error('Erro ao limpar notificações:', error)
    return jsonResponse({ error: 'Erro ao limpar notificações' }, { status: 500 })
  }
}

