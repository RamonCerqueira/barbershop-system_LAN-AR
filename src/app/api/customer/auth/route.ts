import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { hashPassword, verifyPassword } from '@/lib/auth'
import { emailInput, passwordInput, phoneInput } from '@/lib/validation'
import { CUSTOMER_COOKIE, customerCookie, createCustomerSession, getCustomer, publicCustomer } from '@/lib/customer-auth'
import { digest, opaqueToken } from '@/lib/security'
import { jsonResponse } from '@/lib/json'
import { apiError, HttpError } from '@/lib/http'
import { rateLimit } from '@/lib/rate-limit'

const missingAccountHash = hashPassword(opaqueToken())

export async function GET(request: NextRequest) {
  try { const customer = await getCustomer(request); return jsonResponse({ customer: customer ? publicCustomer(customer) : null }, { headers: { 'Cache-Control': 'private, no-store' } }) }
  catch (error) { return apiError(error) }
}
export async function POST(request: NextRequest) {
  try {
    const data = z.discriminatedUnion('action', [
      z.object({ action: z.literal('REGISTER'), name: z.string().trim().min(2).max(100), email: emailInput, phone: phoneInput, password: passwordInput, acceptTerms: z.literal(true) }),
      z.object({ action: z.literal('LOGIN'), email: emailInput, password: z.string().min(1).max(72) })
    ]).parse(await request.json())
    await rateLimit(request, 'customer-auth', data.email, 8)
    await rateLimit(request, 'customer-auth-global', '', 60, 60)
    let customer
    if (data.action === 'REGISTER') {
      await rateLimit(request, 'customer-register', '', 30, 3600)
      const password = await hashPassword(data.password)
      customer = await prisma.customerAccount.create({ data: { name: data.name, email: data.email, phone: data.phone, password } })
    } else {
      customer = await prisma.customerAccount.findUnique({ where: { email: data.email } })
      const matches = await verifyPassword(data.password, customer?.password || await missingAccountHash)
      if (!customer || !matches) throw new HttpError(401, 'E-mail ou senha incorretos.')
    }
    const token = await createCustomerSession(customer.id)
    const response = jsonResponse({ customer: publicCustomer(customer) }, { status: data.action === 'REGISTER' ? 201 : 200 })
    response.cookies.set(CUSTOMER_COOKIE, token, customerCookie)
    return response
  } catch (error) { if ((error as { code?: string }).code === 'P2002') return apiError(new HttpError(409, 'Não foi possível cadastrar esse e-mail. Tente entrar ou recuperar sua senha.')); return apiError(error) }
}
export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get(CUSTOMER_COOKIE)?.value
    if (token) await prisma.customerSession.deleteMany({ where: { tokenHash: digest(token) } })
    const response = jsonResponse({ success: true })
    response.cookies.set(CUSTOMER_COOKIE, '', { ...customerCookie, maxAge: 0 })
    return response
  } catch (error) { return apiError(error) }
}
