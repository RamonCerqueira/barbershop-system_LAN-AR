import { NextRequest } from 'next/server'
import { getAuthUser } from './auth'
import { HttpError } from './http'
import { requireCompanySubscriptionAccess } from './subscription'
import { prisma } from './prisma'
import { Prisma } from '@prisma/client'

export async function requireOperator(request: NextRequest) {
  const auth = await getAuthUser(request)
  if (!auth?.companyId) throw new HttpError(401, 'Entre na conta administrativa.')
  if (!['ADMIN', 'MANAGER'].includes(auth.role || '')) throw new HttpError(403, 'Acesso restrito à administração.')
  await requireCompanySubscriptionAccess(auth.companyId)
  return auth as typeof auth & { companyId: string }
}
export type DepositConfig = { noShowDepositEnabled?: boolean; noShowThreshold?: number; depositPercent?: number; pixKey?: string; requirePrepaymentToConfirm?: boolean; paymentDeadlineHours?: number }
export async function depositPolicy(tx: Prisma.TransactionClient | typeof prisma, companyId: string, client: { id: string; requireDeposit: boolean } | null, price: Prisma.Decimal | number, config: DepositConfig) {
  const noShows = client ? await tx.appointment.count({ where: { companyId, clientId: client.id, status: 'NO_SHOW' } }) : 0
  const required = Boolean(config.requirePrepaymentToConfirm || client?.requireDeposit || config.noShowDepositEnabled && noShows >= Math.max(1, Number(config.noShowThreshold) || 2))
  const percent = Math.min(100, Math.max(1, Number(config.depositPercent) || 30))
  return { required, noShows, percent, amount: required ? new Prisma.Decimal(price).times(percent).div(100).toDecimalPlaces(2).toNumber() : 0 }
}
