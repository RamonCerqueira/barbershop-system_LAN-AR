import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { apiError } from '@/lib/http'
import { jsonResponse } from '@/lib/json'
import { prisma } from '@/lib/prisma'
import { evaluateCompanySubscription } from '@/lib/subscription'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth || auth.type !== 'SYSTEM_OWNER') {
      return jsonResponse({ error: 'Acesso restrito ao Super Admin' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status')

    const [payments, notificationLogs] = await Promise.all([
      prisma.subscriptionPayment.findMany({
        where:
          statusFilter && ['PENDING', 'APPROVED', 'REJECTED'].includes(statusFilter)
            ? { status: statusFilter as 'PENDING' | 'APPROVED' | 'REJECTED' }
            : undefined,
        include: {
          company: {
            select: {
              id: true,
              name: true,
              fullName: true,
              email: true,
              phone: true,
              cpf: true,
              plan: true,
              planPrice: true,
              isActive: true,
              subscriptionStatus: true,
              trialStartedAt: true,
              trialEndsAt: true,
              subscriptionStartedAt: true,
              currentPeriodEnd: true,
              lastPaymentAt: true,
              createdAt: true
            }
          }
        },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        take: 150
      }),
      prisma.subscriptionNotificationLog.findMany({
        include: {
          company: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { sentAt: 'desc' },
        take: 60
      })
    ])

    const counts = {
      pending: payments.filter((p) => p.status === 'PENDING').length,
      approved: payments.filter((p) => p.status === 'APPROVED').length,
      rejected: payments.filter((p) => p.status === 'REJECTED').length,
      approvedVolume: payments
        .filter((p) => p.status === 'APPROVED')
        .reduce((acc, p) => acc + Number(p.amount), 0)
    }

    return jsonResponse({
      counts,
      payments: payments.map((p) => ({
        ...p,
        amount: Number(p.amount),
        hasProof: Boolean(p.proofFilePath),
        subscription: evaluateCompanySubscription(p.company)
      })),
      notificationLogs
    })
  } catch (error) {
    return apiError(error)
  }
}
