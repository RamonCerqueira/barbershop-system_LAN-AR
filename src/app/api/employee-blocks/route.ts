import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth'
import { apiError, HttpError } from '@/lib/http'
import { jsonResponse } from '@/lib/json'
import { prisma } from '@/lib/prisma'
import { requireCompanySubscriptionAccess } from '@/lib/subscription'
import { dateInput, timeInput } from '@/lib/validation'
import { requireOperator } from '@/lib/operations'
import { dayRange, minuteOfDay, overlaps } from '@/lib/booking-rules'

const blockInput = z.object({
  employeeId: z.string().min(1),
  date: dateInput,
  endDate: dateInput.optional(),
  startTime: timeInput,
  endTime: timeInput,
  reason: z.string().trim().max(200).optional()
})

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth || !auth.companyId) {
      return jsonResponse({ error: 'Não autorizado' }, { status: 401 })
    }
    await requireCompanySubscriptionAccess(auth.companyId)

    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')

    const blocks = await prisma.employeeBlock.findMany({
      where: {
        companyId: auth.companyId,
        ...(employeeId ? { employeeId } : {})
      },
      include: {
        employee: { select: { id: true, name: true, role: true } }
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }]
    })

    return jsonResponse(blocks)
  } catch (error) {
    return apiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireOperator(request)
    const body = blockInput.parse(await request.json())
    if (body.endTime <= body.startTime) {
      throw new HttpError(400, 'O horário final deve ser maior que o horário inicial.')
    }

    const employees = await prisma.employee.findMany({
      where: { ...(body.employeeId === 'ALL' ? {} : { id: body.employeeId }), companyId: auth.companyId, isActive: true, role: { in: ['BARBER','MASSAGE','PODIATRY'] } }
    })
    if (!employees.length) {
      throw new HttpError(404, 'Profissional não encontrado ou inativo.')
    }

    const end = body.endDate || body.date
    const days = Math.round((Date.parse(end) - Date.parse(body.date)) / 86400000)
    if (days < 0 || days > 365) throw new HttpError(400, 'Escolha um período de até um ano.')
    const created = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${auth.companyId}),hashtext(${'schedule:all'}))::text`
      const appointments = await tx.appointment.findMany({ where: { companyId: auth.companyId, employeeId: { in: employees.map(e=>e.id) }, date: { gte: dayRange(body.date).gte, lt: dayRange(end).lt }, status: { in: ['SCHEDULED','CONFIRMED','IN_PROGRESS'] } }, select: { time: true, duration: true } })
      if (appointments.some(a=>overlaps(minuteOfDay(a.time),a.duration,minuteOfDay(body.startTime),minuteOfDay(body.endTime)-minuteOfDay(body.startTime)))) throw new HttpError(409, 'Há atendimentos nesse período. Remarque ou cancele antes de bloquear; nenhum agendamento foi alterado.')
      const records = []
      for (let offset=0; offset<=days; offset++) {
        const date = new Date(Date.parse(body.date)+offset*86400000).toISOString().slice(0,10)
        for (const employee of employees) records.push({ companyId: auth.companyId, employeeId: employee.id, date, startTime: body.startTime, endTime: body.endTime, reason: body.reason || null })
      }
      return tx.employeeBlock.createMany({ data: records })
    }, { timeout: 15000 })

    return jsonResponse(created, { status: 201 })
  } catch (error) {
    return apiError(error)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth || !auth.companyId) {
      return jsonResponse({ error: 'Não autorizado' }, { status: 401 })
    }
    await requireCompanySubscriptionAccess(auth.companyId)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) throw new HttpError(400, 'ID do bloqueio obrigatório.')

    const deleted = await prisma.employeeBlock.deleteMany({
      where: { id, companyId: auth.companyId }
    })
    if (!deleted.count) {
      throw new HttpError(404, 'Bloqueio não encontrado.')
    }

    return jsonResponse({ success: true })
  } catch (error) {
    return apiError(error)
  }
}
