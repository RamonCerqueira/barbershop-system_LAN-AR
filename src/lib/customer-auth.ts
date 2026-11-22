import { NextRequest } from 'next/server'
import { prisma } from './prisma'
import { digest, opaqueToken } from './security'
import { HttpError } from './http'

export const CUSTOMER_COOKIE = 'barberpro_customer'
export const customerCookie = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', maxAge: 30 * 86400 }
export async function createCustomerSession(customerId: string) {
  const token = opaqueToken()
  await prisma.customerSession.create({ data: { customerId, tokenHash: digest(token), expiresAt: new Date(Date.now() + customerCookie.maxAge * 1000) } })
  return token
}
export async function getCustomer(request: NextRequest) {
  const token = request.cookies.get(CUSTOMER_COOKIE)?.value
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null
  const session = await prisma.customerSession.findUnique({ where: { tokenHash: digest(token) }, include: { customer: true } })
  return session && session.expiresAt > new Date() ? session.customer : null
}
export async function requireCustomer(request: NextRequest) {
  const customer = await getCustomer(request)
  if (!customer) throw new HttpError(401, 'Entre na sua conta para continuar.')
  return customer
}
export function publicCustomer(customer: { id: string; name: string; email: string; phone: string; avatarPath: string | null }) {
  return { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone, avatarUrl: customer.avatarPath ? `/api/customer/avatar?v=${customer.avatarPath}` : null }
}
