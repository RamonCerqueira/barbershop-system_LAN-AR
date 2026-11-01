import { jsonResponse } from '@/lib/json'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { emailInput, passwordInput } from '@/lib/validation'
import { hashPassword } from '@/lib/auth'
import { digest } from '@/lib/security'
import { rateLimit } from '@/lib/rate-limit'
import { apiError, HttpError } from '@/lib/http'

export async function POST(request: NextRequest) {
  try {
    const { email, code, newPassword } = z.object({ email: emailInput, code: z.string().regex(/^[a-f0-9]{64}$/), newPassword: passwordInput }).parse(await request.json())
    await rateLimit(request, 'reset-password', email, 5)
    const hashed = await hashPassword(newPassword)
    await prisma.$transaction(async tx => {
      const token = await tx.recoveryToken.findUnique({ where: { tokenHash: digest(code) } })
      if (!token || token.consumedAt || token.expiresAt <= new Date()) throw new HttpError(400, 'Código inválido ou expirado.')
      const where = { id: token.subjectId, email }
      const subject = token.subjectType === 'SYSTEM_OWNER' ? await tx.systemOwner.findFirst({ where }) : await tx.user.findFirst({ where })
      if (!subject) throw new HttpError(400, 'Código inválido ou expirado.')
      const claimed = await tx.recoveryToken.updateMany({ where: { id: token.id, consumedAt: null, expiresAt: { gt: new Date() } }, data: { consumedAt: new Date() } })
      if (claimed.count !== 1) throw new HttpError(400, 'Código inválido ou expirado.')
      if (token.subjectType === 'SYSTEM_OWNER') await tx.systemOwner.update({ where: { id: subject.id }, data: { password: hashed } })
      else await tx.user.update({ where: { id: subject.id }, data: { password: hashed } })
      await tx.authSession.updateMany({ where: { subjectId: subject.id, subjectType: token.subjectType, revokedAt: null }, data: { revokedAt: new Date() } })
    })
    return jsonResponse({ message: 'Senha atualizada. Entre novamente para continuar.' })
  } catch (error) { return apiError(error) }
}
