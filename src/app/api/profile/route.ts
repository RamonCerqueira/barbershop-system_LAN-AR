import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getAuthUser, hashPassword, verifyPassword } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { passwordInput } from '@/lib/validation'
import { jsonResponse } from '@/lib/json'
import { apiError, HttpError } from '@/lib/http'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth?.companyId) throw new HttpError(401, 'Não autorizado.')
    return jsonResponse({ name: auth.name, email: auth.email, role: auth.role, companyName: auth.companyName, avatarUrl: auth.avatarUrl }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return apiError(error) }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth?.companyId) throw new HttpError(401, 'Não autorizado.')
    const data = z.object({ name: z.string().trim().min(2).max(100), currentPassword: z.string().max(72).optional(), newPassword: passwordInput.optional() }).parse(await request.json())
    const user = await prisma.user.findUniqueOrThrow({ where: { id: auth.id } })
    let password: string | undefined
    if (data.newPassword) {
      await rateLimit(request, 'profile-password', auth.id, 5)
      if (!data.currentPassword || !await verifyPassword(data.currentPassword, user.password)) throw new HttpError(400, 'Senha atual incorreta.')
      password = await hashPassword(data.newPassword)
    }
    await prisma.$transaction(async tx => {
      await tx.user.update({ where: { id: auth.id }, data: { name: data.name, password } })
      if (password) await tx.authSession.updateMany({ where: { subjectId: auth.id, subjectType: 'COMPANY_USER', id: { not: auth.sessionId } }, data: { revokedAt: new Date() } })
    })
    return jsonResponse({ message: password ? 'Perfil e senha atualizados. Outras sessões foram encerradas.' : 'Perfil atualizado.' })
  } catch (error) { return apiError(error) }
}
