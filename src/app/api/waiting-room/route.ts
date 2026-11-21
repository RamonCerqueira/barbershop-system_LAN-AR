import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { jsonResponse } from '@/lib/json'
import { apiError, HttpError } from '@/lib/http'
import { opaqueToken } from '@/lib/security'
import { requireCompanySubscriptionAccess, brazilDateString } from '@/lib/subscription'
import { boardAppointments } from '@/lib/waiting-room'

async function authorize(request: NextRequest, adminOnly = false) {
  const user = await getAuthUser(request)
  if (!user?.companyId) throw new HttpError(401, 'Não autorizado.')
  if (adminOnly && user.role !== 'ADMIN') throw new HttpError(403, 'Somente o administrador pode configurar o painel.')
  await requireCompanySubscriptionAccess(user.companyId)
  return { ...user, companyId: user.companyId }
}

export async function GET(request: NextRequest) {
  try {
    const user = await authorize(request)
    const [company, appointments] = await Promise.all([
      prisma.company.findUniqueOrThrow({ where: { id: user.companyId }, select: { waitingRoomEnabled: true, waitingRoomToken: true, waitingRoomCalledId: true, waitingRoomCalledAt: true } }),
      boardAppointments(user.companyId)
    ])
    return jsonResponse({ enabled: company.waitingRoomEnabled, canConfigure: user.role === 'ADMIN',
      publicPath: company.waitingRoomEnabled && company.waitingRoomToken ? `/painel/${company.waitingRoomToken}` : null,
      calledId: company.waitingRoomCalledId, calledAt: company.waitingRoomCalledAt, date: brazilDateString(), appointments },
      { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return apiError(error) }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await authorize(request, true)
    const { action } = z.object({ action: z.enum(['ENABLE', 'DISABLE', 'ROTATE']) }).parse(await request.json())
    await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`board:${user.companyId}`}))`
      const company = await tx.company.findUniqueOrThrow({ where: { id: user.companyId } })
      await tx.company.update({ where: { id: user.companyId }, data: {
        ...(action === 'ENABLE' ? { waitingRoomEnabled: true, waitingRoomToken: company.waitingRoomToken || opaqueToken() } : {}),
        ...(action === 'DISABLE' ? { waitingRoomEnabled: false, waitingRoomCalledId: null, waitingRoomCalledAt: null } : {}),
        ...(action === 'ROTATE' ? { waitingRoomToken: opaqueToken() } : {})
      } })
    })
    return jsonResponse({ success: true })
  } catch (error) { return apiError(error) }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authorize(request)
    const { appointmentId } = z.object({ appointmentId: z.string().min(1) }).parse(await request.json())
    await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`board:${user.companyId}`}))`
      const appointment = await tx.appointment.findFirst({ where: { id: appointmentId, companyId: user.companyId } })
      if (!appointment || appointment.date.toISOString().slice(0, 10) !== brazilDateString() || !['SCHEDULED', 'CONFIRMED'].includes(appointment.status)) throw new HttpError(409, 'Selecione um atendimento de hoje que ainda esteja aguardando.')
      const company = await tx.company.findUniqueOrThrow({ where: { id: user.companyId } })
      if (!company.waitingRoomEnabled) throw new HttpError(409, 'Ative o painel antes de chamar um cliente.')
      await tx.company.update({ where: { id: user.companyId }, data: { waitingRoomCalledId: appointment.id, waitingRoomCalledAt: new Date() } })
    })
    return jsonResponse({ success: true })
  } catch (error) { return apiError(error) }
}
