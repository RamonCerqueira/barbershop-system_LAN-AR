import { digest } from './security'
import { commercialContract, verifyContractConsent, type ContractConsent } from './contracts'
import { planEntitlements } from './plans'
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
  pendingPlan?: Plan | null
  pendingPlanStartsAt?: Date | null
  lastPaymentAt: Date | null
  createdAt: Date
}

export function evaluateCompanySubscription(
  company: CompanySubscriptionSnapshot,
  now: Date = new Date()
): SubscriptionEvaluation {
  if (company.pendingPlan && company.pendingPlanStartsAt && company.pendingPlanStartsAt <= now) company = { ...company, plan: company.pendingPlan }
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

export async function settleScheduledPlan(companyId: string) {
  await prisma.$executeRaw`UPDATE companies SET "plan" = "pendingPlan", "planPrice" = COALESCE("pendingPlanPrice", "planPrice"), "pendingPlanPrice" = NULL, "pendingPlan" = NULL, "pendingPlanStartsAt" = NULL, "updatedAt" = (NOW() AT TIME ZONE 'UTC') WHERE id = ${companyId} AND "pendingPlan" IS NOT NULL AND "pendingPlanStartsAt" <= (NOW() AT TIME ZONE 'UTC')`
}

export async function getCompanySubscriptionStatus(companyId: string) {
  await settleScheduledPlan(companyId)
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      plan: true,
      planPrice: true,
      additionalProfessionals: true,
      subscriptionStatus: true,
      trialStartedAt: true,
      trialEndsAt: true,
      subscriptionStartedAt: true,
      currentPeriodEnd: true,
      pendingPlan: true,
      pendingPlanStartsAt: true,
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
      include:{contractAcceptance:{select:{id:true,kind:true,documentHash:true,acceptedAt:true}}},
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
    additionalProfessionals: company.additionalProfessionals,
    entitlements: { ...planEntitlements(evaluation.plan, evaluation.isTrial), professionals: planEntitlements(evaluation.plan, evaluation.isTrial).professionals + company.additionalProfessionals },
    professionalCapacity: Math.min(planEntitlements(evaluation.plan,evaluation.isTrial).professionals,company.pendingPlan?planEntitlements(company.pendingPlan).professionals:Infinity) + company.additionalProfessionals,
    pendingPlan: company.pendingPlan,
    pendingPlanStartsAt: company.pendingPlanStartsAt,
    pix: PIX_PAYMENT_CONFIG,
    plans: AVAILABLE_PLANS.map(plan => quotePlan(evaluation.plan, plan.code, Boolean(company.subscriptionStartedAt), company.additionalProfessionals)),
    payments: payments.map((p) => ({
      ...p,
      amount: Number(p.amount)
    })),
    notificationLogs
  }
}

export async function requireCompanySubscriptionAccess(companyId: string) {
  await settleScheduledPlan(companyId)
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      isActive: true,
      plan: true,
      planPrice: true,
      additionalProfessionals: true,
      subscriptionStatus: true,
      trialStartedAt: true,
      trialEndsAt: true,
      subscriptionStartedAt: true,
      currentPeriodEnd: true,
      pendingPlan: true,
      pendingPlanStartsAt: true,
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
  legalAcceptance: ContractConsent
}) {
  const planInfo = SUBSCRIPTION_PLANS[params.plan]
  if (!planInfo || !isAvailablePlan(params.plan)) {
    throw new HttpError(400, 'Plano selecionado inválido.')
  }

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM companies WHERE id = ${params.companyId} FOR UPDATE`
    const company = await tx.company.findUnique({ where: { id: params.companyId } })
    if (!company) {
      throw new HttpError(404, 'Empresa não encontrada.')
    }

    if (company.pendingPlan && company.pendingPlanStartsAt && company.pendingPlanStartsAt > new Date()) throw new HttpError(409, 'Existe uma mudança de plano já paga e agendada. Aguarde sua vigência antes de contratar outro ciclo.')
    const effective = evaluateCompanySubscription(company)
    const quote = quotePlan(effective.plan, params.plan as import('./plans').PlanCode, Boolean(company.subscriptionStartedAt), company.additionalProfessionals)

    const activeProfessionals = await tx.employee.count({where:{companyId:company.id,isActive:true,role:{in:['BARBER','PODIATRY','MASSAGE']}}})
    const cap = planEntitlements(params.plan).professionals + company.additionalProfessionals
    if (activeProfessionals > cap) throw new HttpError(409, `Este plano permite até ${cap} profissionais ativos. Desative os excedentes antes de enviar o pagamento.`)
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

    if (!params.legalAcceptance) throw new HttpError(400,'Aceite do contrato obrigatório.')
    const document = commercialContract(company,params.plan as import('./plans').PlanCode,params.legalAcceptance.actor)
    verifyContractConsent(params.legalAcceptance,document)
    const payment = await tx.subscriptionPayment.create({
      data: {
        companyId: params.companyId,
        plan: planInfo.code,
        amount: quote.price,
        additionalProfessionals: quote.additionalProfessionals,
        additionalAmount: quote.additionalAmount,
        baseAmount: quote.basePrice,
        discountPercent: quote.discountPercent,
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

    if (document && params.legalAcceptance) await tx.contractAcceptance.create({data:{companyId:company.id,actorId:params.legalAcceptance.actor.id,actorName:params.legalAcceptance.actor.name,actorEmail:params.legalAcceptance.actor.email,kind:document.kind,version:document.version,privacyVersion:document.privacyVersion,documentHash:document.hash,content:document.content,plan:payment.plan,amount:payment.amount,paymentId:payment.id}})
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
      include: { company: true, contractAcceptance:true }
    })

    if (!payment) {
      throw new HttpError(404, 'Solicitação de pagamento não encontrada.')
    }

    await tx.$queryRaw`SELECT id FROM companies WHERE id = ${payment.companyId} FOR UPDATE`
    const lockedCompany = await tx.company.findUniqueOrThrow({where:{id:payment.companyId}})
    payment.company = lockedCompany
    const freshPayment = await tx.subscriptionPayment.findUniqueOrThrow({where:{id:payment.id}})
    if (freshPayment.status !== 'PENDING') {
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

    const acceptance = payment.contractAcceptance
    // Historical requests predate versioned acceptance. Never fabricate an old signature or reprice them.
    // New requests cannot be created through the service/API without verified consent.
    if (acceptance && (digest(acceptance.content)!==acceptance.documentHash || acceptance.plan !== payment.plan || Number(acceptance.amount)!==Number(payment.amount))) throw new HttpError(409,'As condições do pagamento não correspondem ao contrato aceito.')
    const planInfo = SUBSCRIPTION_PLANS[payment.plan]
    const baseStart =
      payment.company.currentPeriodEnd && payment.company.currentPeriodEnd.getTime() > now.getTime()
        ? payment.company.currentPeriodEnd
        : now
    const effectivePlan = evaluateCompanySubscription(payment.company, now).plan
    const from = SUBSCRIPTION_PLANS[effectivePlan], to = SUBSCRIPTION_PLANS[payment.plan]
    const downgrade = baseStart > now && (to.rank < from.rank || to.rank === from.rank && to.months < from.months)
    if (payment.additionalProfessionals !== payment.company.additionalProfessionals) throw new HttpError(409, 'Os adicionais foram alterados após o envio. Solicite um novo pagamento com o valor atualizado.')
    const cap = planEntitlements(payment.plan).professionals + payment.additionalProfessionals
    const count = await tx.employee.count({where:{companyId:payment.companyId,isActive:true,role:{in:['BARBER','PODIATRY','MASSAGE']}}})
    if (count > cap) throw new HttpError(409, `Desative profissionais excedentes antes de aprovar este plano (limite: ${cap}).`)
    if (payment.company.pendingPlan && payment.company.pendingPlanStartsAt && payment.company.pendingPlanStartsAt > now) throw new HttpError(409, 'Já existe uma mudança paga agendada para esta empresa.')
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
        plan: downgrade ? effectivePlan : payment.plan,
        pendingPlan: downgrade ? payment.plan : null,
        pendingPlanPrice: downgrade ? payment.amount : null,
        pendingPlanStartsAt: downgrade ? baseStart : null,
        planPrice: downgrade ? payment.company.planPrice : payment.amount,
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
        message: `Seu plano ${planInfo.name} foi confirmado com sucesso.${downgrade ? ` A redução entra em vigor em ${formatBrDate(baseStart)}.` : ''} Próximo vencimento em ${formatBrDate(periodEnd)}.`
      }
    })

    return { payment: approved, company: updatedCompany }
  })
}
