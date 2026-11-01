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

    const companyId = auth.companyId
    const now = new Date()

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    const [
      todayAppointmentsList,
      todaySales,
      monthSales,
      totalClients,
      monthlySalesRaw
    ] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          companyId,
          date: {
            gte: startOfToday,
            lte: endOfToday
          }
        },
        include: {
          client: true,
          service: true,
          employee: true
        },
        orderBy: { time: 'asc' }
      }),
      prisma.sale.aggregate({
        where: {
          companyId,
          status: { in: ['COMPLETED', 'APPROVED'] },
          createdAt: {
            gte: startOfToday,
            lte: endOfToday
          }
        },
        _sum: { amount: true }
      }),
      prisma.sale.aggregate({
        where: {
          companyId,
          status: { in: ['COMPLETED', 'APPROVED'] },
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        },
        _sum: { amount: true }
      }),
      prisma.client.count({
        where: { companyId, isActive: true }
      }),
      prisma.sale.findMany({
        where: {
          companyId,
          status: { in: ['COMPLETED', 'APPROVED'] },
          createdAt: {
            gte: new Date(now.getFullYear(), now.getMonth() - 5, 1)
          }
        },
        select: {
          amount: true,
          createdAt: true
        }
      })
    ])

    // Apenas recebimentos confirmados compõem a receita.
    const todaySalesSum = Number(todaySales._sum.amount || 0)
    const todayRevenue = todaySalesSum
    const monthlyRevenue = Number(monthSales._sum.amount || 0)

    const pendingAppointments = todayAppointmentsList.filter((a) =>
      ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'].includes(a.status)
    ).length
    const completedAppointments = todayAppointmentsList.filter(
      (a) => a.status === 'COMPLETED'
    ).length

    // Série dos últimos 6 meses para o gráfico
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    const revenueChart: { month: string; revenue: number }[] = []

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const m = d.getMonth()
      const y = d.getFullYear()
      const sum = monthlySalesRaw
        .filter((s) => {
          const sd = new Date(s.createdAt)
          return sd.getMonth() === m && sd.getFullYear() === y
        })
        .reduce((acc, s) => acc + Number(s.amount), 0)

      revenueChart.push({
        month: `${monthNames[m]}/${String(y).slice(-2)}`,
        revenue: sum
      })
    }

    return jsonResponse({
      stats: {
        todayAppointments: todayAppointmentsList.length,
        todayRevenue,
        monthlyRevenue,
        totalClients,
        pendingAppointments,
        completedAppointments
      },
      recentAppointments: todayAppointmentsList.map((apt) => ({
        id: apt.id,
        clientName: apt.client.fullName,
        clientPhone: apt.client.phone,
        service: apt.service.name,
        employee: apt.employee.name,
        time: apt.time,
        status: apt.status,
        price: apt.price
      })),
      revenueChart
    })
  } catch (error) {
    console.error('Erro ao carregar dashboard:', error)
    return jsonResponse({ error: 'Erro ao carregar dados do dashboard' }, { status: 500 })
  }
}

