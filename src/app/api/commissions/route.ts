import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { apiError } from '@/lib/http'
import { jsonResponse } from '@/lib/json'
import { prisma } from '@/lib/prisma'
import { requireCompanySubscriptionAccess } from '@/lib/subscription'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth || !auth.companyId) {
      return jsonResponse({ error: 'Não autorizado' }, { status: 401 })
    }
    await requireCompanySubscriptionAccess(auth.companyId)

    const { searchParams } = new URL(request.url)
    const now = new Date()
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    const defaultEnd = now.toISOString().slice(0, 10)

    const startDate = searchParams.get('startDate') || defaultStart
    const endDate = searchParams.get('endDate') || defaultEnd
    const employeeId = searchParams.get('employeeId')

    const start = new Date(`${startDate}T00:00:00.000Z`)
    const end = new Date(`${endDate}T23:59:59.999Z`)

    const [employees, appointments] = await Promise.all([
      prisma.employee.findMany({
        where: {
          companyId: auth.companyId,
          ...(employeeId && employeeId !== 'ALL' ? { id: employeeId } : {})
        },
        orderBy: { name: 'asc' }
      }),
      prisma.appointment.findMany({
        where: {
          companyId: auth.companyId,
          status: 'COMPLETED',
          date: { gte: start, lte: end },
          ...(employeeId && employeeId !== 'ALL' ? { employeeId } : {})
        },
        include: {
          service: { select: { name: true } },
          client: { select: { fullName: true } }
        },
        orderBy: [{ date: 'desc' }, { time: 'desc' }]
      })
    ])

    const summary = employees.map((emp) => {
      const empApts = appointments.filter((a) => a.employeeId === emp.id)
      const rate = Number(emp.commissionRate || 0)
      const grossRevenue = empApts.reduce((sum, a) => sum + Number(a.price), 0)
      const totalCommission = empApts.reduce((sum, a) => {
        const snap = Number(a.commissionSnapshot || 0)
        return sum + (snap > 0 ? snap : (Number(a.price) * rate) / 100)
      }, 0)

      return {
        employeeId: emp.id,
        employeeName: emp.name,
        role: emp.role,
        commissionRate: rate,
        salary: Number(emp.salary || 0),
        completedAppointments: empApts.length,
        grossRevenue: Number(grossRevenue.toFixed(2)),
        totalCommission: Number(totalCommission.toFixed(2))
      }
    })

    const totals = {
      completedAppointments: summary.reduce((s, r) => s + r.completedAppointments, 0),
      grossRevenue: Number(summary.reduce((s, r) => s + r.grossRevenue, 0).toFixed(2)),
      totalCommission: Number(summary.reduce((s, r) => s + r.totalCommission, 0).toFixed(2))
    }

    return jsonResponse({
      period: { startDate, endDate },
      totals,
      summary,
      details: appointments.map((a) => ({
        id: a.id,
        date: a.date.toISOString().slice(0, 10),
        time: a.time,
        employeeId: a.employeeId,
        employeeName: a.employeeNameSnapshot,
        serviceName: a.serviceNameSnapshot || a.service.name,
        clientName: a.client.fullName,
        price: Number(a.price),
        commission: Number(a.commissionSnapshot || 0)
      }))
    })
  } catch (error) {
    return apiError(error)
  }
}
