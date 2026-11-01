import { jsonResponse } from '@/lib/json'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth || auth.type !== 'SYSTEM_OWNER') {
      return jsonResponse({ error: 'Acesso restrito ao Super Admin' }, { status: 403 })
    }

    const [companies, totalUsers, totalAppointments, totalSales] = await Promise.all([
      prisma.company.findMany({
        include: {
          _count: {
            select: {
              users: true,
              clients: true,
              appointments: true,
              employees: true,
              services: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count(),
      prisma.appointment.count(),
      prisma.sale.aggregate({
        where: { status: { in: ['COMPLETED', 'APPROVED'] } },
        _sum: { amount: true }
      })
    ])

    const activeCompanies = companies.filter((c) => c.isActive).length
    const monthlyRevenue = companies
      .filter((c) => c.isActive)
      .reduce((acc, c) => {
        if (c.plan === 'MONTHLY') return acc + Number(c.planPrice)
        if (c.plan === 'QUARTERLY') return acc + Number(c.planPrice) / 3
        if (c.plan === 'ANNUAL') return acc + Number(c.planPrice) / 12
        return acc + Number(c.planPrice)
      }, 0)

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month'
    const monthsCount = period === 'year' ? 12 : 6

    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    const now = new Date()
    const revenueHistory: { month: string; revenue: number; companies: number }[] = []

    for (let i = monthsCount - 1; i >= 0; i--) {
      const endOfRefMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
      const activeUpToMonth = companies.filter(
        (c) => new Date(c.createdAt) <= endOfRefMonth && c.isActive
      )
      const rev = activeUpToMonth.reduce((sum, c) => {
        if (c.plan === 'QUARTERLY') return sum + Number(c.planPrice) / 3
        if (c.plan === 'ANNUAL') return sum + Number(c.planPrice) / 12
        return sum + Number(c.planPrice)
      }, 0)
      revenueHistory.push({
        month: `${monthNames[endOfRefMonth.getMonth()]}/${String(endOfRefMonth.getFullYear()).slice(-2)}`,
        revenue: Number(rev.toFixed(2)),
        companies: activeUpToMonth.length
      })
    }

    return jsonResponse({
      systemStats: {
        totalCompanies: companies.length,
        activeCompanies,
        monthlyRevenue: Number(monthlyRevenue.toFixed(2)),
        totalUsers,
        totalAppointments,
        totalTransactedVolume: totalSales._sum.amount || 0
      },
      companies: companies.map((c) => ({
        id: c.id,
        name: c.name,
        owner: c.fullName,
        email: c.email,
        phone: c.phone,
        cpf: c.cpf,
        address: c.address,
        plan: c.plan,
        planPrice: c.planPrice,
        isActive: c.isActive,
        status: c.isActive ? 'active' : 'suspended',
        joinDate: c.createdAt.toISOString().split('T')[0],
        counts: c._count
      })),
      monthlyRevenue: revenueHistory
    })
  } catch (error) {
    console.error('Erro ao buscar visão geral do admin:', error)
    return jsonResponse(
      { error: 'Erro ao carregar dados administrativos' },
      { status: 500 }
    )
  }
}

