import { z } from 'zod'
import { createBooking } from '@/lib/bookings'
import { rateLimit } from '@/lib/rate-limit'
import { NextRequest } from 'next/server'
import { requireCustomer } from '@/lib/customer-auth'
import { prisma } from '@/lib/prisma'
import { apiError } from '@/lib/http'
import { jsonResponse } from '@/lib/json'

export async function GET(request: NextRequest) {
  try {
    const customer = await requireCustomer(request)
    const appointments = await prisma.appointment.findMany({
      where: { customerAccountId: customer.id },
      select: { id: true, date: true, time: true, status: true, price: true, duration: true,
        serviceId: true, employeeId: true, serviceNameSnapshot: true, employeeNameSnapshot: true,
        company: { select: { id: true, name: true, phone: true, address: true, settings: { select: { appointmentConfig: true } } } },
        service: { select: { name: true } }, employee: { select: { name: true } }, review: { select: { rating: true, comment: true } } },
      orderBy: [{ date: 'desc' }, { time: 'desc' }], take: 300
    })
    return jsonResponse(appointments.map(a => {
      const config = (a.company.settings?.appointmentConfig || {}) as Record<string, unknown>
      return { id: a.id, date: a.date.toISOString().slice(0, 10), time: a.time, status: a.status, price: Number(a.price), duration: a.duration,
        companyId: a.company.id, companyName: a.company.name, companyPhone: a.company.phone, address: a.company.address,
        serviceId: a.serviceId, employeeId: a.employeeId, service: a.serviceNameSnapshot || a.service.name, professional: a.employeeNameSnapshot || a.employee.name,
        cancellationHours: Math.max(2, Number(config.cancellationDeadline) || 2), review: a.review,
        pix: a.status === 'SCHEDULED' && new Date(`${a.date.toISOString().slice(0,10)}T${a.time}:00-03:00`).getTime() - Date.now() > (Number(config.paymentDeadlineHours) || 2) * 3600000 && config.requirePrepaymentToConfirm && config.pixKey ? { key: String(config.pixKey), beneficiary: String(config.pixBeneficiary || a.company.name), bank: String(config.pixBank || ''), deadlineHours: Number(config.paymentDeadlineHours) || 2 } : null }
    }), { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return apiError(error) }
}

export async function POST(request: NextRequest) {
  try {
    const customer = await requireCustomer(request)
    await rateLimit(request, 'customer-booking', customer.id, 20, 3600)
    const body = await request.json()
    const { companyId } = z.object({ companyId: z.string().min(1) }).parse(body)
    const result = await createBooking({ ...body, clientName: customer.name, clientPhone: customer.phone, clientEmail: customer.email }, companyId, request.headers.get('idempotency-key'), true, customer.id)
    return jsonResponse({ id: result.appointment.id, status: result.appointment.status, repeated: result.repeated }, { status: result.repeated ? 200 : 201 })
  } catch (error) { return apiError(error) }
}
