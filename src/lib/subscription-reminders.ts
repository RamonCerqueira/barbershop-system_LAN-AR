import { prisma } from './prisma'
import { sendSubscriptionMail } from './mail'
import { queuePlatformMessage } from './messages'
import {
  brazilDateString,
  diffCalendarDaysBr,
  evaluateCompanySubscription,
  formatBrDate,
  SUBSCRIPTION_PLANS
} from './subscription'

export type SubscriptionNoticeType =
  | 'REMINDER_7D'
  | 'REMINDER_4D'
  | 'REMINDER_1D'
  | 'DUE_TODAY'
  | 'OVERDUE'
  | 'PAYMENT_APPROVED'
  | 'PAYMENT_REJECTED'
  | 'SUBSCRIPTION_BLOCKED'

function buildNoticeContent(params: {
  type: SubscriptionNoticeType
  companyName: string
  planName: string
  dueDateStr: string
  reason?: string
}) {
  switch (params.type) {
    case 'REMINDER_7D':
      return {
        subject: `Lembrete BarberPro: sua assinatura (${params.planName}) vence em 7 dias`,
        message: `Olá, ${params.companyName}! Sua assinatura do plano ${params.planName} vence em 7 dias (${params.dueDateStr}). Acesse o menu Assinatura para realizar o pagamento via PIX e manter seu acesso sem interrupções.`
      }
    case 'REMINDER_4D':
      return {
        subject: `Atenção BarberPro: vencimento em 4 dias (${params.dueDateStr})`,
        message: `Olá, ${params.companyName}! Faltam apenas 4 dias para o vencimento (${params.dueDateStr}) do seu plano ${params.planName}. Realize o pagamento via PIX no painel para evitar bloqueio.`
      }
    case 'REMINDER_1D':
      return {
        subject: `Urgente BarberPro: sua assinatura vence amanhã (${params.dueDateStr})`,
        message: `Olá, ${params.companyName}! Sua assinatura ${params.planName} vence amanhã (${params.dueDateStr}). Pague via PIX hoje mesmo pelo painel para não perder o acesso.`
      }
    case 'DUE_TODAY':
      return {
        subject: `Hoje é o vencimento da sua assinatura BarberPro (${params.dueDateStr})`,
        message: `Olá, ${params.companyName}! Hoje (${params.dueDateStr}) vence sua assinatura do plano ${params.planName}. Envie seu pagamento PIX pelo painel para continuar usando normalmente.`
      }
    case 'OVERDUE':
      return {
        subject: `Assinatura vencida — BarberPro`,
        message: `Olá, ${params.companyName}! Não identificamos o pagamento da sua assinatura ${params.planName} com vencimento em ${params.dueDateStr}. Regularize via PIX no painel para restabelecer o acesso.`
      }
    case 'PAYMENT_APPROVED':
      return {
        subject: `Pagamento aprovado! Assinatura ${params.planName} ativa — BarberPro`,
        message: `Ótima notícia, ${params.companyName}! Seu pagamento PIX para o plano ${params.planName} foi aprovado. Sua assinatura está ativa até ${params.dueDateStr}.`
      }
    case 'PAYMENT_REJECTED':
      return {
        subject: `Pagamento PIX não confirmado — BarberPro`,
        message: `Olá, ${params.companyName}. Seu pagamento PIX não pôde ser confirmado. Motivo: ${params.reason || 'comprovante inválido ou valor divergente'}. Envie um novo comprovante pelo painel.`
      }
    case 'SUBSCRIPTION_BLOCKED':
      return {
        subject: `Acesso bloqueado por falta de pagamento — BarberPro`,
        message: `Olá, ${params.companyName}. Seu acesso às funcionalidades do BarberPro foi bloqueado pois o período venceu em ${params.dueDateStr} sem confirmação de pagamento. Acesse a área de Assinatura para pagar via PIX.`
      }
  }
}

export async function dispatchSubscriptionNotification(params: {
  companyId: string
  companyName: string
  email: string
  phone: string
  type: SubscriptionNoticeType
  referenceDate: string
  planName: string
  dueDateFormatted: string
  subscriptionPaymentId?: string
  reason?: string
}) {
  const { subject, message } = buildNoticeContent({
    type: params.type,
    companyName: params.companyName,
    planName: params.planName,
    dueDateStr: params.dueDateFormatted,
    reason: params.reason
  })

  const baseKey = `${params.companyId}:${params.type}:${params.referenceDate}:${params.subscriptionPaymentId || 'cycle'}`

  // 1. Canal IN_APP (com deduplicação garantida por índice único)
  const inAppKey = `${baseKey}:IN_APP`
  const existingInApp = await prisma.subscriptionNotificationLog.findUnique({
    where: { dedupKey: inAppKey }
  })
  if (!existingInApp) {
    await prisma.$transaction(async (tx) => {
      await tx.notification.create({
        data: {
          companyId: params.companyId,
          type: 'PAYMENT',
          title: subject,
          message
        }
      })
      await tx.subscriptionNotificationLog.create({
        data: {
          companyId: params.companyId,
          subscriptionPaymentId: params.subscriptionPaymentId || null,
          type: params.type,
          referenceDate: params.referenceDate,
          channel: 'IN_APP',
          status: 'SENT',
          recipient: params.companyName,
          message,
          dedupKey: inAppKey
        }
      })
    })
  }

  // 2. Canal EMAIL (se SMTP estiver configurado)
  const emailKey = `${baseKey}:EMAIL`
  const existingEmail = await prisma.subscriptionNotificationLog.findUnique({
    where: { dedupKey: emailKey }
  })
  if (!existingEmail && params.email) {
    let status: 'SENT' | 'SKIPPED' | 'FAILED' = 'SKIPPED'
    let errorMessage: string | null = null
    try {
      const res = await sendSubscriptionMail(params.email, subject, message)
      status = res.sent ? 'SENT' : 'SKIPPED'
      if (!res.sent) errorMessage = res.reason
    } catch (err: any) {
      status = 'FAILED'
      errorMessage = err?.message || 'Falha ao enviar e-mail'
    }
    await prisma.subscriptionNotificationLog.create({
      data: {
        companyId: params.companyId,
        subscriptionPaymentId: params.subscriptionPaymentId || null,
        type: params.type,
        referenceDate: params.referenceDate,
        channel: 'EMAIL',
        status,
        recipient: params.email,
        message,
        dedupKey: emailKey,
        errorMessage
      }
    })
  }

  // 3. Canal WHATSAPP (se provedor estiver configurado)
  const waKey = `${baseKey}:WHATSAPP`
  const existingWa = await prisma.subscriptionNotificationLog.findUnique({
    where: { dedupKey: waKey }
  })
  if (!existingWa && params.phone) {
    let status: 'SENT' | 'SKIPPED' | 'FAILED' = 'SKIPPED'
    let errorMessage: string | null = null
    if (process.env.WHATSAPP_API_URL && process.env.WHATSAPP_API_TOKEN) {
      try {
        await queuePlatformMessage(params.companyId, params.phone, message, waKey)
        status = 'SENT'
      } catch (err: any) {
        status = 'FAILED'
        errorMessage = err?.message || 'Falha ao enfileirar WhatsApp'
      }
    } else {
      errorMessage = 'Provedor WhatsApp não configurado'
    }
    await prisma.subscriptionNotificationLog.create({
      data: {
        companyId: params.companyId,
        subscriptionPaymentId: params.subscriptionPaymentId || null,
        type: params.type,
        referenceDate: params.referenceDate,
        channel: 'WHATSAPP',
        status,
        recipient: params.phone,
        message,
        dedupKey: waKey,
        errorMessage
      }
    })
  }

  return { notified: !existingInApp }
}

export async function runDailySubscriptionReminders(now: Date = new Date()) {
  const companies = await prisma.company.findMany({
    where: { isActive: true }
  })

  const todayBr = brazilDateString(now)
  let examined = 0
  let remindersDispatched = 0
  let blockedCount = 0

  for (const company of companies) {
    examined++
    const evaluation = evaluateCompanySubscription(company, now)
    const planInfo = SUBSCRIPTION_PLANS[evaluation.plan] || SUBSCRIPTION_PLANS.MONTHLY
    const dueDateStr = brazilDateString(evaluation.expiresAt)
    const dueDateFormatted = formatBrDate(evaluation.expiresAt)
    const diffDays = diffCalendarDaysBr(evaluation.expiresAt, now)

    let noticeType: SubscriptionNoticeType | null = null

    if (!evaluation.hasAccess && company.subscriptionStatus !== 'SUSPENDED') {
      if (company.subscriptionStatus !== 'BLOCKED') {
        await prisma.company.update({
          where: { id: company.id },
          data: { subscriptionStatus: 'BLOCKED' }
        })
        blockedCount++
        await dispatchSubscriptionNotification({
          companyId: company.id,
          companyName: company.name,
          email: company.email,
          phone: company.phone,
          type: 'SUBSCRIPTION_BLOCKED',
          referenceDate: dueDateStr,
          planName: planInfo.name,
          dueDateFormatted
        })
      }
      noticeType = 'OVERDUE'
    } else if (diffDays === 7) {
      noticeType = 'REMINDER_7D'
    } else if (diffDays === 4) {
      noticeType = 'REMINDER_4D'
    } else if (diffDays === 1) {
      noticeType = 'REMINDER_1D'
    } else if (diffDays === 0) {
      noticeType = 'DUE_TODAY'
    } else if (diffDays < 0) {
      noticeType = 'OVERDUE'
    }

    if (noticeType) {
      const ref = noticeType === 'OVERDUE' ? todayBr : dueDateStr
      const result = await dispatchSubscriptionNotification({
        companyId: company.id,
        companyName: company.name,
        email: company.email,
        phone: company.phone,
        type: noticeType,
        referenceDate: ref,
        planName: planInfo.name,
        dueDateFormatted
      })
      if (result.notified) remindersDispatched++
    }
  }

  return {
    executedAtBr: todayBr,
    examined,
    remindersDispatched,
    blockedCount
  }
}
