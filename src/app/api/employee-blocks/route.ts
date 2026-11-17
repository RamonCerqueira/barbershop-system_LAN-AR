import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth'
import { apiError, HttpError } from '@/lib/http'
import { jsonResponse } from '@/lib/json'
import { prisma } from '@/lib/prisma'
import { requireCompanySubscriptionAccess } from '@/lib/subscription'
import { dateInput, timeInput } from '@/lib/validation'

const blockInput = z.object({
  employeeId: z.string().min(1),
  date: dateInput,
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
    const auth = await getAuthUser(request)
    if (!auth || !auth.companyId) {
      return jsonResponse({ error: 'Não autorizado' }, { status: 401 })
    }
    await requireCompanySubscriptionAccess(auth.companyId)

    const body = blockInput.parse(await request.json())
    if (body.endTime <= body.startTime) {
      throw new HttpError(400, 'O horário final deve ser maior que o horário inicial.')
    }

    const employee = await prisma.employee.findFirst({
      where: { id: body.employeeId, companyId: auth.companyId, isActive: true }
    })
    if (!employee) {
      throw new HttpError(404, 'Profissional não encontrado ou inativo.')
    }

    const created = await prisma.employeeBlock.create({
      data: {
        companyId: auth.companyId,
        employeeId: body.employeeId,
        date: body.date,
        startTime: body.startTime,
        endTime: body.endTime,
        reason: body.reason || null
      },
      include: {
        employee: { select: { id: true, name: true, role: true } }
      }
    })

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
