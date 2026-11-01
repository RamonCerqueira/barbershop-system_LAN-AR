import { jsonResponse } from '@/lib/json'
import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { digest, opaqueToken } from '@/lib/security'
import { apiError, HttpError } from '@/lib/http'
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthUser(request)
    if (!auth?.companyId) throw new HttpError(401,'Não autorizado')
    const { id } = await params
    const token = opaqueToken()
    const changed = await prisma.appointment.updateMany({ where: { id, companyId: auth.companyId, status: { in: ['SCHEDULED','CONFIRMED'] } }, data: { confirmationHash: digest(token), confirmationExpiresAt: new Date(Date.now() + 7 * 86_400_000) } })
    if (!changed.count) throw new HttpError(404,'Agendamento indisponível.')
    return jsonResponse({ confirmationLink: '/confirm/' + id + '?token=' + token, message: 'O novo link substitui o anterior.' })
  } catch (error) { return apiError(error) }
}
