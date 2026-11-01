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
    const period = searchParams.get('period') || 'month'

    const now = new Date()
    let startDate = new Date(now.getFullYear(), now.getMonth(), 1)

    if (period === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else if (period === 'quarter') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1)
    } else if (period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1)
    }

    const services = await prisma.service.findMany({
      where: { companyId: auth.companyId },
      include: {
        serviceCosts: {
          where: { isActive: true }
        },
        appointments: {
          where: {
            date: { gte: startDate },
            status: 'COMPLETED'
          }
        }
      }
    })

    const rawMetrics = services.map((service) => {
      const totalAppointments = service.appointments.length
      const totalRevenue = service.appointments.reduce((sum, apt) => sum + Number(apt.price), 0)
      const averagePrice =
        totalAppointments > 0 ? totalRevenue / totalAppointments : Number(service.price)
      const totalCostPerService = service.serviceCosts.reduce(
        (sum, c) => sum + Number(c.costPerUse),
        0
      )
      const totalServiceCost = totalCostPerService * totalAppointments
      const netProfit = totalRevenue - totalServiceCost
      const profitMargin =
        totalRevenue > 0
          ? (netProfit / totalRevenue) * 100
          : Number(service.price) > 0
          ? ((Number(service.price) - totalCostPerService) / Number(service.price)) * 100
          : 0

      return {
        id: service.id,
        name: service.name,
        category: service.category || 'Geral',
        price: Number(service.price),
        duration: service.duration,
        totalRevenue,
        totalAppointments,
        averagePrice,
        totalCostPerService,
        netProfit,
        profitMargin,
        costs: service.serviceCosts.map((c) => ({
          id: c.id,
          serviceId: c.serviceId,
          itemName: c.itemName,
          item: c.itemName,
          costPerUse: c.costPerUse,
          unit: c.unit,
          supplier: c.supplier
        }))
      }
    })

    // Ordenar por faturamento decrescente para cálculo da Curva ABC
    rawMetrics.sort((a, b) => b.totalRevenue - a.totalRevenue)

    const grandTotalRevenue = rawMetrics.reduce((s, i) => s + i.totalRevenue, 0)
    const grandTotalAppointments = rawMetrics.reduce((s, i) => s + i.totalAppointments, 0)

    let cumulativeRevenuePct = 0
    const analysis = rawMetrics.map((item) => {
      const revenuePercentage =
        grandTotalRevenue > 0 ? (item.totalRevenue / grandTotalRevenue) * 100 : 0
      const appointmentsPercentage =
        grandTotalAppointments > 0
          ? (item.totalAppointments / grandTotalAppointments) * 100
          : 0

      cumulativeRevenuePct += revenuePercentage
      let abcClass: 'A' | 'B' | 'C' = 'C'
      if (cumulativeRevenuePct <= 80 || revenuePercentage >= 40) {
        abcClass = 'A'
      } else if (cumulativeRevenuePct <= 95 || revenuePercentage >= 15) {
        abcClass = 'B'
      }

      const trend: 'up' | 'down' | 'stable' =
        item.profitMargin >= 65 ? 'up' : item.profitMargin >= 40 ? 'stable' : 'down'

      return {
        ...item,
        revenuePercentage,
        appointmentsPercentage,
        abcClass,
        trend
      }
    })

    return jsonResponse(analysis)
  } catch (error) {
    console.error('Erro ao calcular análise ABC de serviços:', error)
    return jsonResponse(
      { error: 'Erro ao calcular análise de serviços' },
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
    const itemName = body.itemName || body.item
    const { serviceId, costPerUse, unit, supplier } = body

    if (!serviceId || !itemName || costPerUse === undefined || !unit) {
      return jsonResponse(
        { error: 'Serviço, item, custo por uso e unidade são obrigatórios' },
        { status: 400 }
      )
    }

    const service = await prisma.service.findFirst({
      where: { id: String(serviceId), companyId: auth.companyId }
    })

    if (!service) {
      return jsonResponse({ error: 'Serviço não encontrado' }, { status: 404 })
    }

    const newCost = await prisma.serviceCost.create({
      data: {
        serviceId: service.id,
        itemName: String(itemName).trim(),
        costPerUse: Number(costPerUse),
        unit: String(unit).trim(),
        supplier: supplier ? String(supplier).trim() : null
      }
    })

    return jsonResponse(
      {
        ...newCost,
        item: newCost.itemName
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Erro ao adicionar custo de serviço:', error)
    return jsonResponse(
      { error: 'Erro ao adicionar custo de serviço' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth || !auth.companyId) {
      return jsonResponse({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return jsonResponse({ error: 'ID do custo é obrigatório' }, { status: 400 })
    }

    const existingCost = await prisma.serviceCost.findFirst({
      where: {
        id,
        service: { companyId: auth.companyId }
      }
    })

    if (!existingCost) {
      return jsonResponse({ error: 'Custo não encontrado' }, { status: 404 })
    }

    await prisma.serviceCost.delete({ where: { id } })
    return jsonResponse({ success: true })
  } catch (error) {
    console.error('Erro ao excluir custo:', error)
    return jsonResponse({ error: 'Erro ao excluir custo' }, { status: 500 })
  }
}
