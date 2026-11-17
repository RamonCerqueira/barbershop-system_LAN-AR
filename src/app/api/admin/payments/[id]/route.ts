import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth'
import { apiError } from '@/lib/http'
import { jsonResponse } from '@/lib/json'
import { brazilDateString, formatBrDate, reviewSubscriptionPayment, SUBSCRIPTION_PLANS } from '@/lib/subscription'
import { dispatchSubscriptionNotification } from '@/lib/subscription-reminders'

const reviewSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  rejectionReason: z.string().max(500).optional()
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(request)
    if (!auth || auth.type !== 'SYSTEM_OWNER') {
      return jsonResponse({ error: 'Acesso restrito ao Super Admin' }, { status: 403 })
    }

    const { id } = await params
    const body = reviewSchema.parse(await request.json())

    const result = await reviewSubscriptionPayment({
      paymentId: id,
      action: body.action,
      reviewerId: auth.id,
      reviewerName: auth.name,
      rejectionReason: body.rejectionReason
    })

    const planInfo = SUBSCRIPTION_PLANS[result.payment.plan]
    const dueDate = result.payment.periodEnd || new Date()

    await dispatchSubscriptionNotification({
      companyId: result.company.id,
      companyName: result.company.name,
      email: result.company.email,
      phone: result.company.phone,
      type: body.action === 'APPROVE' ? 'PAYMENT_APPROVED' : 'PAYMENT_REJECTED',
      referenceDate: brazilDateString(dueDate),
      planName: planInfo.name,
      dueDateFormatted: formatBrDate(dueDate),
      subscriptionPaymentId: result.payment.id,
      reason: body.rejectionReason
    }).catch((err) => console.error('Falha ao registrar notificação de revisão:', err))

    return jsonResponse({
      message:
        body.action === 'APPROVE'
          ? 'Pagamento aprovado e assinatura ativada com sucesso!'
          : 'Pagamento rejeitado.',
      payment: {
        ...result.payment,
        amount: Number(result.payment.amount)
      }
    })
  } catch (error) {
    return apiError(error)
  }
}
