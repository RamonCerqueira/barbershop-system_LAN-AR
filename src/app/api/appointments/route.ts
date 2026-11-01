import { jsonResponse } from '@/lib/json'
import { createBooking, formatAppointment } from '@/lib/bookings'
import { apiError } from '@/lib/http'
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
    const dateParam = searchParams.get('date')
    const monthParam = searchParams.get('month') // YYYY-MM
    const statusParam = searchParams.get('status')
    const employeeIdParam = searchParams.get('employeeId')
    const search = searchParams.get('search')?.trim() || ''

    const dateFilter: any = {}
    if (dateParam) {
      const [y, m, d] = dateParam.split('-').map(Number)
      dateFilter.gte = new Date(y, m - 1, d, 0, 0, 0, 0)
      dateFilter.lte = new Date(y, m - 1, d, 23, 59, 59, 999)
    } else if (monthParam) {
      const [y, m] = monthParam.split('-').map(Number)
      dateFilter.gte = new Date(y, m - 1, 1, 0, 0, 0, 0)
      dateFilter.lte = new Date(y, m, 0, 23, 59, 59, 999)
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        companyId: auth.companyId,
        ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
        ...(statusParam && statusParam !== 'ALL' ? { status: statusParam as any } : {}),
        ...(employeeIdParam && employeeIdParam !== 'ALL'
          ? { employeeId: employeeIdParam }
          : {}),
        ...(search
          ? {
              OR: [
                { client: { fullName: { contains: search, mode: 'insensitive' } } },
                { client: { phone: { contains: search, mode: 'insensitive' } } },
                { service: { name: { contains: search, mode: 'insensitive' } } }
              ]
            }
          : {})
      },
      include: {
        client: true,
        service: true,
        employee: true
      },
      orderBy: [{ date: 'asc' }, { time: 'asc' }]
    })

    const formatted = appointments.map((apt) => ({
      id: apt.id,
      date: apt.date.toISOString().split('T')[0],
      rawDate: apt.date,
      time: apt.time,
      status: apt.status,
      notes: apt.notes || '',
      price: apt.price,
      duration: apt.duration,
      clientId: apt.clientId,
      clientName: apt.client.fullName,
      clientPhone: apt.client.phone,
      clientEmail: apt.client.email || '',
      serviceId: apt.serviceId,
      serviceName: apt.service.name,
      employeeId: apt.employeeId,
      employeeName: apt.employee.name,
      confirmationLink: undefined
    }))

    return jsonResponse(formatted)
  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error)
    return jsonResponse({ error: 'Erro ao buscar agendamentos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth?.companyId) return jsonResponse({ error: 'Não autorizado' }, { status: 401 })
    const result = await createBooking(await request.json(), auth.companyId, request.headers.get('idempotency-key'))
    const token = result.confirmationToken
    return jsonResponse({ ...formatAppointment(result.appointment), confirmationLink: token ? '/confirm/' + result.appointment.id + '?token=' + token : undefined }, { status: result.repeated ? 200 : 201 })
  } catch (error) { return apiError(error) }
}
