import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { emailInput, passwordInput } from '@/lib/validation'
import { digest, opaqueToken } from '@/lib/security'
import { hashPassword } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { isMailConfigured, sendRecoveryMail } from '@/lib/mail'
import { jsonResponse } from '@/lib/json'
import { apiError, HttpError } from '@/lib/http'

export async function POST(request: NextRequest) {
  try {
    const { email } = z.object({ email: emailInput }).parse(await request.json())
    await rateLimit(request, 'customer-recovery', email, 3)
    if (!isMailConfigured()) throw new HttpError(503, 'Recuperação por e-mail temporariamente indisponível. Contate o suporte.')
    const customer = await prisma.customerAccount.findUnique({ where: { email } })
    if (customer) {
      const token = opaqueToken()
      const record = await prisma.$transaction(async tx => {
        await tx.customerPasswordReset.deleteMany({ where: { customerId: customer.id } })
        return tx.customerPasswordReset.create({ data: { customerId: customer.id, tokenHash: digest(token), expiresAt: new Date(Date.now() + 900000) } })
      })
      try { await sendRecoveryMail(email, token) } catch { await prisma.customerPasswordReset.deleteMany({ where: { id: record.id } }); throw new HttpError(503, 'Não foi possível enviar o e-mail agora. Tente novamente mais tarde.') }
    }
    return jsonResponse({ message: 'Se houver uma conta com esse e-mail, enviaremos um código válido por 15 minutos.' })
  } catch (error) { return apiError(error) }
}
export async function PUT(request: NextRequest) {
  try {
    const { token, password } = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/), password: passwordInput }).parse(await request.json())
    await rateLimit(request, 'customer-reset', '', 10)
    const hashed = await hashPassword(password)
    await prisma.$transaction(async tx => {
      const reset = await tx.customerPasswordReset.findUnique({ where: { tokenHash: digest(token) } })
      if (!reset || reset.usedAt || reset.expiresAt <= new Date()) throw new HttpError(400, 'Código inválido ou expirado.')
      const changed = await tx.customerPasswordReset.updateMany({ where: { id: reset.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } })
      if (!changed.count) throw new HttpError(400, 'Código inválido ou expirado.')
      await tx.customerAccount.update({ where: { id: reset.customerId }, data: { password: hashed } })
      await tx.customerSession.deleteMany({ where: { customerId: reset.customerId } })
    })
    return jsonResponse({ message: 'Senha atualizada! Entre novamente na sua conta.' })
  } catch (error) { return apiError(error) }
}
