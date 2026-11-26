import { Prisma } from '@prisma/client'
import { HttpError } from './http'
import { evaluateCompanySubscription, requireCompanySubscriptionAccess } from './subscription'
import { planEntitlements, PlanFeature, SUBSCRIPTION_PLANS } from './plans'

export const SCHEDULABLE_ROLES = ['BARBER', 'PODIATRY', 'MASSAGE'] as const
export async function requirePlanFeature(companyId: string, feature: PlanFeature) {
  const sub = await requireCompanySubscriptionAccess(companyId)
  const entitlements = planEntitlements(sub.plan, sub.isTrial)
  if (!entitlements.features.includes(feature)) throw new HttpError(403, feature === 'whatsapp' && sub.isTrial ? 'WhatsApp disponível após a confirmação do pagamento do Profissional ou Elite.' : 'Este recurso não está incluído no seu plano. Consulte Assinatura & PIX.')
  return entitlements
}
export async function lockCompany(tx: Prisma.TransactionClient, companyId: string) {
  await tx.$queryRaw`SELECT id FROM companies WHERE id = ${companyId} FOR UPDATE`
}
export async function assertProfessionalCapacity(tx: Prisma.TransactionClient, companyId: string, excludeId?: string, targetPlan?: keyof typeof SUBSCRIPTION_PLANS, adding = true) {
  const company = await tx.company.findUniqueOrThrow({where:{id:companyId}})
  const now = new Date()
  const trial = !targetPlan && evaluateCompanySubscription(company, now).isTrial
  const plan = targetPlan || (company.pendingPlan && company.pendingPlanStartsAt && company.pendingPlanStartsAt <= now ? company.pendingPlan : company.plan)
  const limit = planEntitlements(plan, trial).professionals + company.additionalProfessionals
  const count = await tx.employee.count({where:{companyId,isActive:true,role:{in:[...SCHEDULABLE_ROLES]},...(excludeId?{id:{not:excludeId}}:{})}})
  // A paid pending downgrade also reserves the lower capacity.
  const pendingLimit = company.pendingPlan ? planEntitlements(company.pendingPlan).professionals + company.additionalProfessionals : limit
  if (count + (adding ? 1 : 0) > Math.min(limit, pendingLimit)) throw new HttpError(409, `O plano permite até ${Math.min(limit, pendingLimit)} profissionais ativos. Desative um profissional, altere o plano ou solicite ao administrador vagas adicionais de R$ 19,90/mês cada.`)
}
