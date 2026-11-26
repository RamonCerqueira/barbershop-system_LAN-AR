// Catálogo único para contratação, cobrança, administração e apresentação.
export const PLAN_CODES = ['MONTHLY', 'SEMIANNUAL', 'ANNUAL', 'PRO_MONTHLY', 'PRO_SEMIANNUAL', 'PRO_ANNUAL', 'ELITE_MONTHLY', 'ELITE_SEMIANNUAL', 'ELITE_ANNUAL'] as const
export type PlanCode = typeof PLAN_CODES[number]
export const SUBSCRIPTION_PLANS = {
  MONTHLY: { code: 'MONTHLY', name: 'Essencial — mês', price: 89.9, months: 1, rank: 0, durationDays: 30, periodLabel: 'mês', period: 'mês', description: 'Assinatura Essencial (mês)' },
  SEMIANNUAL: { code: 'SEMIANNUAL', name: 'Essencial — 6 meses', price: 485.46, months: 6, rank: 0, durationDays: 180, periodLabel: '6 meses', period: '6 meses', description: 'Assinatura Essencial (6 meses)' },
  ANNUAL: { code: 'ANNUAL', name: 'Essencial — 12 meses', price: 916.98, months: 12, rank: 0, durationDays: 365, periodLabel: '12 meses', period: '12 meses', description: 'Assinatura Essencial (12 meses)' },
  PRO_MONTHLY: { code: 'PRO_MONTHLY', name: 'Profissional — mês', price: 129.9, months: 1, rank: 1, durationDays: 30, periodLabel: 'mês', period: 'mês', description: 'Assinatura Profissional (mês)' },
  PRO_SEMIANNUAL: { code: 'PRO_SEMIANNUAL', name: 'Profissional — 6 meses', price: 701.46, months: 6, rank: 1, durationDays: 180, periodLabel: '6 meses', period: '6 meses', description: 'Assinatura Profissional (6 meses)' },
  PRO_ANNUAL: { code: 'PRO_ANNUAL', name: 'Profissional — 12 meses', price: 1324.98, months: 12, rank: 1, durationDays: 365, periodLabel: '12 meses', period: '12 meses', description: 'Assinatura Profissional (12 meses)' },
  ELITE_MONTHLY: { code: 'ELITE_MONTHLY', name: 'Elite — mês', price: 159.9, months: 1, rank: 2, durationDays: 30, periodLabel: 'mês', period: 'mês', description: 'Assinatura Elite (mês)' },
  ELITE_SEMIANNUAL: { code: 'ELITE_SEMIANNUAL', name: 'Elite — 6 meses', price: 863.46, months: 6, rank: 2, durationDays: 180, periodLabel: '6 meses', period: '6 meses', description: 'Assinatura Elite (6 meses)' },
  ELITE_ANNUAL: { code: 'ELITE_ANNUAL', name: 'Elite — 12 meses', price: 1630.98, months: 12, rank: 2, durationDays: 365, periodLabel: '12 meses', period: '12 meses', description: 'Assinatura Elite (12 meses)' },
  QUARTERLY: { code: 'QUARTERLY', name: 'Trimestral (legado)', price: 30, months: 3, rank: 0, durationDays: 90, periodLabel: 'trimestre', period: 'trimestre', description: 'Assinatura trimestral legada' }
} as const
export const AVAILABLE_PLANS = PLAN_CODES.map(code => SUBSCRIPTION_PLANS[code])
export function isAvailablePlan(value: string): value is PlanCode {
  return PLAN_CODES.some(code => code === value)
}
export const EXTRA_PROFESSIONAL_MONTHLY_PRICE = 19.9
export function quotePlan(current: keyof typeof SUBSCRIPTION_PLANS, target: PlanCode, hasPaidSubscription: boolean, additionalProfessionals = 0) {
  const from = SUBSCRIPTION_PLANS[current]
  const to = SUBSCRIPTION_PLANS[target]
  const upgrade = to.rank > from.rank || (to.rank === from.rank && to.months > from.months)
  const discountPercent = hasPaidSubscription && upgrade && to.months >= 6 ? 10 : 0
  const additionalAmount = additionalProfessionals * Math.round(EXTRA_PROFESSIONAL_MONTHLY_PRICE * 100) * to.months / 100
  return { ...to, basePrice: to.price, discountPercent, additionalProfessionals, additionalAmount, price: (Math.round(Math.round(to.price * 100) * (100 - discountPercent) / 100) + Math.round(additionalAmount * 100)) / 100 }
}

// Calendar months, clamped to the last day of the destination month.
export function subscriptionPeriodEnd(start: Date, code: keyof typeof SUBSCRIPTION_PLANS): Date {
  if (code === 'QUARTERLY') return new Date(start.getTime() + 90 * 86_400_000)
  const end = new Date(start)
  const day = end.getUTCDate()
  end.setUTCDate(1)
  end.setUTCMonth(end.getUTCMonth() + SUBSCRIPTION_PLANS[code].months)
  const lastDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate()
  end.setUTCDate(Math.min(day, lastDay))
  return end
}

export type PlanFeature = 'finance' | 'inventory' | 'commissions' | 'analytics' | 'whatsapp' | 'campaigns'
export const PLAN_ENTITLEMENTS = [
  { professionals: 2, whatsappMonthly: 0, features: [] as PlanFeature[] },
  { professionals: 5, whatsappMonthly: 3000, features: ['finance', 'inventory', 'commissions', 'whatsapp'] as PlanFeature[] },
  { professionals: 10, whatsappMonthly: 6000, features: ['finance', 'inventory', 'commissions', 'analytics', 'whatsapp', 'campaigns'] as PlanFeature[] }
] as const
export function planEntitlements(plan: keyof typeof SUBSCRIPTION_PLANS, trial = false) {
  const rank = trial ? 2 : SUBSCRIPTION_PLANS[plan].rank
  const entry = PLAN_ENTITLEMENTS[rank]
  return { ...entry, whatsappMonthly: trial ? 0 : entry.whatsappMonthly, features: entry.features.filter(f => !trial || (f !== 'whatsapp' && f !== 'campaigns')) }
}
export function featureForPath(path: string): PlanFeature | null {
  if (/^\/(api|dashboard)\/(sales|caixa|financeiro)(\/|$)/.test(path)) return 'finance'
  if (/^\/(api|dashboard)\/(products|produtos)(\/|$)/.test(path)) return 'inventory'
  if (/^\/(api|dashboard)\/(commissions|comissoes)(\/|$)/.test(path)) return 'commissions'
  if (/^\/(api|dashboard)\/(service-costs|analise-servicos|relatorios)(\/|$)/.test(path)) return 'analytics'
  if (/^\/(api|dashboard)\/(whatsapp-campaigns|campanhas-whatsapp)(\/|$)/.test(path)) return 'campaigns'
  if (/^\/api\/(send-whatsapp|whatsapp)(\/|$)/.test(path)) return 'whatsapp'
  return null
}
export const formatPlanMoney = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
