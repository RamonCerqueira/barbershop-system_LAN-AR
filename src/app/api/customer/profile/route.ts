import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireCustomer, publicCustomer } from '@/lib/customer-auth'
import { prisma } from '@/lib/prisma'
import { hashPassword, verifyPassword } from '@/lib/auth'
import { passwordInput, phoneInput } from '@/lib/validation'
import { apiError, HttpError } from '@/lib/http'
import { jsonResponse } from '@/lib/json'
import { rateLimit } from '@/lib/rate-limit'

export async function PATCH(request: NextRequest) {
  try {
    const customer = await requireCustomer(request)
    const data = z.object({ name: z.string().trim().min(2).max(100), phone: phoneInput, currentPassword: z.string().max(72).optional(), newPassword: passwordInput.optional() }).parse(await request.json())
    let password: string | undefined
    if (data.newPassword) {
      await rateLimit(request, 'customer-password', customer.id, 5)
      if (!data.currentPassword || !await verifyPassword(data.currentPassword, customer.password)) throw new HttpError(400, 'Senha atual incorreta.')
      password = await hashPassword(data.newPassword)
    }
    const updated = await prisma.$transaction(async tx => {
      const result = await tx.customerAccount.update({ where: { id: customer.id }, data: { name: data.name, phone: data.phone, password } })
      await tx.client.updateMany({ where: { customerAccountId: customer.id }, data: { fullName: data.name, phone: data.phone } })
      if (password) await tx.customerSession.deleteMany({ where: { customerId: customer.id } })
      return result
    })
    return jsonResponse({ customer: publicCustomer(updated), signInAgain: Boolean(password) })
  } catch (error) { return apiError(error) }
}
