import { Plan, Prisma, SubscriptionStatus } from '@prisma/client'
import { prisma } from './prisma'
import { HttpError } from './http'

export const BRAZIL_TIMEZONE = 'America/Sao_Paulo'
export const TRIAL_DAYS = 7

export const PIX_PAYMENT_CONFIG = {
  key: '03207834566',
  keyType: 'CPF',
  beneficiary: 'Ramon Santos Cerqueira',
  institution: 'Caixa Econômica Federal'
} as const

export { SUBSCRIPTION_PLANS } from './plans'
import { SUBSCRIPTION_PLANS, AVAILABLE_PLANS, isAvailablePlan, quotePlan, subscriptionPeriodEnd } from './plans'

export function brazilDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BRAZIL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)
}

export function formatBrDate(date: Date | string | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: BRAZIL_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(d)
}

export function diffCalendarDaysBr(targetDate: Date, referenceDate: Date = new Date()): number {
  const targetStr = brazilDateString(targetDate)
  const refStr = brazilDateString(referenceDate)
  const targetUtc = Date.parse(`${targetStr}T12:00:00Z`)
  const refUtc = Date.parse(`${refStr}T12:00:00Z`)
  return Math.round((targetUtc - refUtc) / 86_400_000)
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000)
}

export interface SubscriptionEvaluation {
  effectiveStatus: SubscriptionStatus
  hasAccess: boolean
  isTrial: boolean
  isBlocked: boolean
  daysRemaining: number
  expiresAt: Date
  trialEndsAt: Date
  currentPeriodEnd: Date | null
  plan: Plan
  planName: string
  planPrice: number
  warningLevel: 'none' | 'info' | 'warning' | 'danger'
  message: string
}

export interface CompanySubscriptionSnapshot {
  id: string
  isActive: boolean
  plan: Plan
  planPrice: Prisma.Decimal | number
  subscriptionStatus: SubscriptionStatus
  trialStartedAt: Date
  trialEndsAt: Date | null
  subscriptionStartedAt: Date | null
  currentPeriodEnd: Date | null
  lastPaymentAt: Date | null
  createdAt: Date
}

export function evaluateCompanySubscription(
  company: CompanySubscriptionSnapshot,
  now: Date = new Date()
): SubscriptionEvaluation {
  const planInfo = SUBSCRIPTION_PLANS[company.plan] || SUBSCRIPTION_PLANS.MONTHLY
  const trialStart = company.trialStartedAt || company.createdAt
  const trialEndsAt = company.trialEndsAt || addDays(trialStart, TRIAL_DAYS)

  if (!company.isActive || company.subscriptionStatus === 'SUSPENDED') {
    return {
      effectiveStatus: 'SUSPENDED',
      hasAccess: false,
      isTrial: false,
      isBlocked: true,
      daysRemaining: 0,
      expiresAt: company.currentPeriodEnd || trialEndsAt,
      trialEndsAt,
      currentPeriodEnd: company.currentPeriodEnd,
      plan: company.plan,
      planName: planInfo.name,
      planPrice: planInfo.price,
      warningLevel: 'danger',
      message: 'Sua conta está suspensa. Entre em contato com o suporte ou regularize sua assinatura.'
    }
  }

  // Assinatura paga ativa ou vencida
  if (company.currentPeriodEnd) {
    const daysRemaining = diffCalendarDaysBr(company.currentPeriodEnd, now)
    const periodValid = company.currentPeriodEnd.getTime() > now.getTime()

    if (periodValid) {
      const warningLevel =
        daysRemaining <= 1 ? 'danger' : daysRemaining <= 4 ? 'warning' : daysRemaining <= 7 ? 'info' : 'none'
      const message =
        daysRemaining === 0
          ? 'Sua assinatura vence hoje. Realize o pagamento via PIX para evitar bloqueio.'
          : daysRemaining <= 7
            ? `Sua assinatura vence em ${daysRemaining} dia${daysRemaining > 1 ? 's' : ''} (${formatBrDate(company.currentPeriodEnd)}).`
            : `Assinatura ${planInfo.name} ativa até ${formatBrDate(company.currentPeriodEnd)}.`

      return {
        effectiveStatus: 'ACTIVE',
        hasAccess: true,
        isTrial: false,
        isBlocked: false,
        daysRemaining: Math.max(0, daysRemaining),
        expiresAt: company.currentPeriodEnd,
        trialEndsAt,
        currentPeriodEnd: company.currentPeriodEnd,
        plan: company.plan,
        planName: planInfo.name,
        planPrice: planInfo.price,
        warningLevel,
        message
      }
    }

    return {
      effectiveStatus: 'BLOCKED',
      hasAccess: false,
      isTrial: false,
      isBlocked: true,
      daysRemaining: 0,
      expiresAt: company.currentPeriodEnd,
      trialEndsAt,
      currentPeriodEnd: company.currentPeriodEnd,
      plan: company.plan,
      planName: planInfo.name,
      planPrice: planInfo.price,
      warningLevel: 'danger',
      message: `Sua assinatura venceu em ${formatBrDate(company.currentPeriodEnd)}. Realize o pagamento via PIX e aguarde a confirmação do administrador.`
    }
  }

  // Período gratuito de 7 dias (sem pagamento aprovado ainda)
  const trialDaysRemaining = diffCalendarDaysBr(trialEndsAt, now)
  const trialValid = trialEndsAt.getTime() > now.getTime()

  if (trialValid) {
    const remaining = Math.max(0, trialDaysRemaining)
    const warningLevel = remaining <= 1 ? 'danger' : remaining <= 4 ? 'warning' : 'info'
    const message =
      remaining === 0
        ? 'Último dia do seu período gratuito de 7 dias! Realize o pagamento via PIX para continuar utilizando o sistema.'
        : `Período gratuito ativo: resta${remaining > 1 ? 'm' : ''} ${remaining} dia${remaining > 1 ? 's' : ''} (até ${formatBrDate(trialEndsAt)}).`

    return {
      effectiveStatus: 'TRIAL',
      hasAccess: true,
      isTrial: true,
      isBlocked: false,
      daysRemaining: remaining,
      expiresAt: trialEndsAt,
      trialEndsAt,
      currentPeriodEnd: null,
      plan: company.plan,
      planName: planInfo.name,
      planPrice: planInfo.price,
      warningLevel,
      message
    }
  }

  return {
    effectiveStatus: 'BLOCKED',
    hasAccess: false,
    isTrial: false,
    isBlocked: true,
    daysRemaining: 0,
    expiresAt: trialEndsAt,
    trialEndsAt,
    currentPeriodEnd: null,
    plan: company.plan,
    planName: planInfo.name,
    planPrice: planInfo.price,
    warningLevel: 'danger',
    message:
      'Seu período gratuito de 7 dias foi encerrado. Realize o pagamento via PIX e aguarde a aprovação do administrador para liberar o acesso.'
  }
}

export async function getCompanySubscriptionStatus(companyId: string) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      plan: true,
      planPrice: true,
      subscriptionStatus: true,
      trialStartedAt: true,
      trialEndsAt: true,
      subscriptionStartedAt: true,
      currentPeriodEnd: true,
      lastPaymentAt: true,
      createdAt: true
    }
  })

  if (!company) {
    throw new HttpError(404, 'Empresa não encontrada.')
  }

  const evaluation = evaluateCompanySubscription(company)

  const [payments, notificationLogs] = await Promise.all([
    prisma.subscriptionPayment.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 25
    }),
    prisma.subscriptionNotificationLog.findMany({
      where: { companyId },
      orderBy: { sentAt: 'desc' },
      take: 25
    })
  ])

  return {
    company: {
      id: company.id,
      name: company.name,
      email: company.email,
      isActive: company.isActive
    },
    subscription: evaluation,
    pix: PIX_PAYMENT_CONFIG,
    plans: AVAILABLE_PLANS.map(plan => quotePlan(company.plan, plan.code, Boolean(company.subscriptionStartedAt))),
    payments: payments.map((p) => ({
      ...p,
      amount: Number(p.amount)
    })),
    notificationLogs
  }
}

export async function requireCompanySubscriptionAccess(companyId: string) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      isActive: true,
      plan: true,
      planPrice: true,
      subscriptionStatus: true,
      trialStartedAt: true,
      trialEndsAt: true,
      subscriptionStartedAt: true,
      currentPeriodEnd: true,
      lastPaymentAt: true,
      createdAt: true
    }
  })

  if (!company) {
    throw new HttpError(404, 'Empresa não encontrada.')
  }

  const evaluation = evaluateCompanySubscription(company)
  if (!evaluation.hasAccess) {
    if (company.subscriptionStatus !== 'BLOCKED' && company.subscriptionStatus !== 'SUSPENDED') {
      await prisma.company.update({
        where: { id: company.id },
        data: { subscriptionStatus: 'BLOCKED' }
      }).catch(() => undefined)
    }
    throw new HttpError(402, evaluation.message)
  }

  return evaluation
}

export async function submitPixPayment(params: {
  companyId: string
  plan: Plan
  payerNote?: string
  proofFilePath?: string | null
  proofFileName?: string | null
  proofMimeType?: string | null
}) {
  const planInfo = SUBSCRIPTION_PLANS[params.plan]
  if (!planInfo || !isAvailablePlan(params.plan)) {
    throw new HttpError(400, 'Plano selecionado inválido.')
  }

  return prisma.$transaction(async (tx) => {
    const company = await tx.company.findUnique({ where: { id: params.companyId } })
    if (!company) {
      throw new HttpError(404, 'Empresa não encontrada.')
    }

    const quote = quotePlan(company.plan, params.plan as import('./plans').PlanCode, Boolean(company.subscriptionStartedAt))

    const existingPending = await tx.subscriptionPayment.findFirst({
      where: {
        companyId: params.companyId,
        status: 'PENDING'
      },
      orderBy: { createdAt: 'desc' }
    })

    if (existingPending) {
      throw new HttpError(
        409,
        'Já existe um pagamento PIX pendente de análise para esta empresa. Aguarde a confirmação do administrador.'
      )
    }

    const payment = await tx.subscriptionPayment.create({
      data: {
        companyId: params.companyId,
        plan: planInfo.code,
        amount: quote.price,
        status: 'PENDING',
        paymentMethod: 'PIX',
        pixKey: PIX_PAYMENT_CONFIG.key,
        pixBeneficiary: PIX_PAYMENT_CONFIG.beneficiary,
        pixBank: PIX_PAYMENT_CONFIG.institution,
        payerNote: params.payerNote?.trim() || null,
        proofFilePath: params.proofFilePath || null,
        proofFileName: params.proofFileName || null,
        proofMimeType: params.proofMimeType || null
      }
    })

    await tx.notification.create({
      data: {
        companyId: params.companyId,
        type: 'PAYMENT',
        title: 'Pagamento PIX enviado para análise',
        message: `Recebemos sua solicitação de pagamento do plano ${planInfo.name} (${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(quote.price)}). O acesso será liberado após a confirmação pelo administrador.`
      }
    })

    return payment
  })
}

export async function reviewSubscriptionPayment(params: {
  paymentId: string
  action: 'APPROVE' | 'REJECT'
  reviewerId: string
  reviewerName: string
  rejectionReason?: string
}) {
  const now = new Date()

  if (params.action === 'REJECT' && (!params.rejectionReason || params.rejectionReason.trim().length < 3)) {
    throw new HttpError(400, 'Informe o motivo da rejeição do pagamento.')
  }

  return prisma.$transaction(async (tx) => {
    const payment = await tx.subscriptionPayment.findUnique({
      where: { id: params.paymentId },
      include: { company: true }
    })

    if (!payment) {
      throw new HttpError(404, 'Solicitação de pagamento não encontrada.')
    }

    if (payment.status !== 'PENDING') {
      throw new HttpError(409, 'Esta solicitação de pagamento já foi analisada anteriormente.')
    }

    if (params.action === 'REJECT') {
      const rejected = await tx.subscriptionPayment.update({
        where: { id: payment.id },
        data: {
          status: 'REJECTED',
          reviewedAt: now,
          reviewedById: params.reviewerId,
          reviewedByName: params.reviewerName,
          rejectionReason: params.rejectionReason!.trim()
        }
      })

      await tx.auditLog.create({
        data: {
          companyId: payment.companyId,
          actorId: params.reviewerId,
          action: 'SUBSCRIPTION_PAYMENT_REJECTED',
          entityId: payment.id
        }
      })

      await tx.notification.create({
        data: {
          companyId: payment.companyId,
          type: 'PAYMENT',
          title: 'Pagamento PIX não aprovado',
          message: `Seu pagamento PIX não foi confirmado. Motivo: ${params.rejectionReason!.trim()}`
        }
      })

      return { payment: rejected, company: payment.company }
    }

    const planInfo = SUBSCRIPTION_PLANS[payment.plan]
    const baseStart =
      payment.company.currentPeriodEnd && payment.company.currentPeriodEnd.getTime() > now.getTime()
        ? payment.company.currentPeriodEnd
        : now
    const periodEnd = subscriptionPeriodEnd(baseStart, payment.plan)

    const approved = await tx.subscriptionPayment.update({
      where: { id: payment.id },
      data: {
        status: 'APPROVED',
        reviewedAt: now,
        reviewedById: params.reviewerId,
        reviewedByName: params.reviewerName,
        periodStart: baseStart,
        periodEnd
      }
    })

    const updatedCompany = await tx.company.update({
      where: { id: payment.companyId },
      data: {
        isActive: true,
        plan: payment.plan,
        planPrice: SUBSCRIPTION_PLANS[payment.plan].price,
        subscriptionStatus: 'ACTIVE',
        subscriptionStartedAt: payment.company.subscriptionStartedAt || now,
        currentPeriodEnd: periodEnd,
        lastPaymentAt: now
      }
    })

    await tx.auditLog.create({
      data: {
        companyId: payment.companyId,
        actorId: params.reviewerId,
        action: 'SUBSCRIPTION_PAYMENT_APPROVED',
        entityId: payment.id
      }
    })

    await tx.notification.create({
      data: {
        companyId: payment.companyId,
        type: 'PAYMENT',
        title: 'Pagamento PIX aprovado!',
        message: `Seu plano ${planInfo.name} foi confirmado com sucesso. Próximo vencimento em ${formatBrDate(periodEnd)}.`
      }
    })

    return { payment: approved, company: updatedCompany }
  })
}
