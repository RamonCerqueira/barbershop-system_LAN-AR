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

    const [campaigns, logs, clientsWithAppointments] = await Promise.all([
      prisma.whatsAppCampaign.findMany({
        where: { companyId: auth.companyId },
        include: {
          campaignLogs: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.whatsAppCampaignLog.findMany({
        where: {
          campaign: { companyId: auth.companyId }
        },
        include: {
          campaign: true,
          client: true
        },
        orderBy: { sentAt: 'desc' },
        take: 100
      }),
      prisma.client.findMany({
        where: { companyId: auth.companyId, isActive: true },
        include: {
          appointments: {
            orderBy: { date: 'desc' },
            take: 1
          }
        }
      })
    ])

    const formattedCampaigns = campaigns.map((c) => {
      const totalSent = c.campaignLogs.length
      const responses = c.campaignLogs.filter((l) => l.status === 'REPLIED').length
      const conversions = c.campaignLogs.filter((l) =>
        ['READ', 'REPLIED'].includes(l.status)
      ).length

      return {
        id: c.id,
        name: c.name,
        message: c.message,
        messageTemplate: c.message,
        triggerDays: c.triggerDays,
        recurrenceInterval: c.triggerDays,
        lastSent: c.lastSent,
        isActive: c.isActive,
        createdAt: c.createdAt,
        totalSent,
        responses,
        conversions
      }
    })

    const companyName = auth.companyName || 'nossa barbearia'

    const formattedLogs = logs.map((l) => ({
      id: l.id,
      campaignId: l.campaignId,
      campaignName: l.campaign.name,
      clientId: l.clientId,
      clientName: l.client.fullName,
      clientPhone: l.client.phone,
      message: (l.response || l.campaign.message)
        .replace(/\{nome\}/gi, l.client.fullName)
        .replace(/\{dias\}/gi, String(l.campaign.triggerDays))
        .replace(/\{barbearia\}/gi, companyName),
      sentAt: l.sentAt,
      status: l.status,
      response: l.response,
      errorMessage: l.errorMessage
    }))

    const now = new Date()
    const eligibleClients = clientsWithAppointments
      .map((client) => {
        const lastApt = client.appointments[0]
        const refDate = lastApt ? new Date(lastApt.date) : new Date(client.createdAt)
        const daysSinceLastVisit = Math.floor(
          (now.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24)
        )
        return {
          id: client.id,
          name: client.fullName,
          phone: client.phone,
          lastVisit: refDate.toISOString(),
          daysSinceLastVisit,
          totalVisits: client.totalVisits
        }
      })
      .filter((c) => c.daysSinceLastVisit >= 7)

    return jsonResponse({
      campaigns: formattedCampaigns,
      logs: formattedLogs,
      eligibleClients
    })
  } catch (error) {
    console.error('Erro ao buscar campanhas WhatsApp:', error)
    return jsonResponse(
      { error: 'Erro ao buscar campanhas do WhatsApp' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth || !auth.companyId) {
      return jsonResponse({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const name = body.name
    const message = body.message || body.messageTemplate
    const triggerDays = Number(body.triggerDays ?? body.recurrenceInterval ?? 15)
    const isActive = body.isActive !== undefined ? Boolean(body.isActive) : true

    if (!name || !message) {
      return jsonResponse(
        { error: 'Nome e mensagem da campanha são obrigatórios' },
        { status: 400 }
      )
    }

    const created = await prisma.whatsAppCampaign.create({
      data: {
        name: String(name).trim(),
        message: String(message).trim(),
        triggerDays,
        isActive,
        companyId: auth.companyId
      }
    })

    return jsonResponse(
      {
        id: created.id,
        name: created.name,
        message: created.message,
        messageTemplate: created.message,
        triggerDays: created.triggerDays,
        recurrenceInterval: created.triggerDays,
        lastSent: created.lastSent,
        isActive: created.isActive,
        createdAt: created.createdAt,
        totalSent: 0,
        responses: 0,
        conversions: 0
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Erro ao criar campanha WhatsApp:', error)
    return jsonResponse(
      { error: 'Erro ao criar campanha do WhatsApp' },
      { status: 500 }
    )
  }
}
