import { jsonResponse } from '@/lib/json'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { emailInput } from '@/lib/validation'
import { digest, opaqueToken } from '@/lib/security'
import { rateLimit } from '@/lib/rate-limit'
import { apiError, HttpError } from '@/lib/http'
import { sendRecoveryMail } from '@/lib/mail'

export async function POST(request: NextRequest) {
  try {
    const { email } = z.object({ email: emailInput }).parse(await request.json())
    await rateLimit(request, 'password-recovery', email, 3)
    if (!process.env.SMTP_HOST || !process.env.SMTP_FROM) throw new HttpError(503, 'Recuperação por e-mail indisponível. Contate o administrador.')
    const [user, owner] = await Promise.all([prisma.user.findUnique({ where: { email } }), prisma.systemOwner.findUnique({ where: { email } })])
    const subject = owner || user
    if (subject) {
      const token = opaqueToken()
      const subjectType = owner ? 'SYSTEM_OWNER' : 'COMPANY_USER'
      await prisma.$transaction(async tx => {
        await tx.recoveryToken.deleteMany({ where: { subjectId: subject.id, subjectType } })
        await tx.recoveryToken.create({ data: { subjectId: subject.id, subjectType, tokenHash: digest(token), expiresAt: new Date(Date.now() + 15 * 60_000) } })
      })
      try { await sendRecoveryMail(email, token) } catch { console.error(JSON.stringify({ event: 'recovery_mail_failed' })) }
    }
    return jsonResponse({ message: 'Se a conta existir, enviaremos as instruções ao e-mail cadastrado.' })
  } catch (error) { return apiError(error) }
}
