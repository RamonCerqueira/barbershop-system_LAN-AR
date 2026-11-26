import type { Company } from '@prisma/client'
import { digest } from './security'
import { HttpError } from './http'
import { CONTRACT_TEXT, CONTRACT_VERSION, PRIVACY_TEXT, PRIVACY_VERSION } from './legal-content'
import { SUBSCRIPTION_PLANS, quotePlan, planEntitlements, formatPlanMoney, type PlanCode } from './plans'

export type ContractActor = { id: string; name: string; email: string }
export type ContractConsent = { accepted: boolean; hash: string; version: string; actor: ContractActor }
const money = (amount: number) => 'R$ '+formatPlanMoney(amount)
function describePlan(plan: PlanCode) {
  const p = SUBSCRIPTION_PLANS[plan], e = planEntitlements(plan)
  return `${p.name}; ciclo de ${p.months} mês(es); até ${e.professionals} profissionais ativos agendáveis; ${e.whatsappMonthly ? e.whatsappMonthly.toLocaleString('pt-BR')+' envios WhatsApp/mês, com conexão por QR Code' : 'sem WhatsApp automático'}. Recursos: ${p.rank===0?'agenda, clientes, histórico, serviços, link de agendamento e portal do cliente':p.rank===1?'Essencial, caixa, financeiro, comissões, produtos e estoque básico':'Profissional, custos, rentabilidade, Curva ABC de serviços, análises avançadas e campanhas com consentimento'}.`
}
export function signupContract(plan: PlanCode) {
  const p = SUBSCRIPTION_PLANS[plan]
  const content = `${CONTRACT_TEXT}\n\nRESUMO DA ADESÃO AO TESTE\n${describePlan(plan)}\nTeste gratuito de sete dias, com gestão Elite e sem WhatsApp automático. Preço atual do plano escolhido para futura contratação: ${money(p.price)} por ${p.periodLabel}. O cadastro não efetua cobrança; a contratação paga exige confirmação e aceite das condições comerciais no painel.\n\n${PRIVACY_TEXT}`
  return {kind:'SIGNUP',version:CONTRACT_VERSION,privacyVersion:PRIVACY_VERSION,hash:digest(content),content,plan,amount:p.price}
}
export function commercialContract(company: Company, target: PlanCode, actor: ContractActor) {
  const current = company.pendingPlan && company.pendingPlanStartsAt && company.pendingPlanStartsAt <= new Date() ? company.pendingPlan : company.plan
  const from = SUBSCRIPTION_PLANS[current], to = SUBSCRIPTION_PLANS[target]
  const quote = quotePlan(current,target,Boolean(company.subscriptionStartedAt), company.additionalProfessionals)
  const kind = !company.subscriptionStartedAt ? 'SUBSCRIPTION' : to.rank>from.rank || to.rank===from.rank && to.months>from.months ? 'UPGRADE' : to.rank<from.rank || to.rank===from.rank && to.months<from.months ? 'DOWNGRADE' : 'RENEWAL'
  const end = company.currentPeriodEnd?.toISOString() || null
  const title = kind==='UPGRADE'?'ADITIVO DE UPGRADE':kind==='DOWNGRADE'?'ADITIVO DE DOWNGRADE':kind==='RENEWAL'?'INSTRUMENTO DE RENOVAÇÃO':'CONTRATAÇÃO PAGA'
  const content = `${title} — BARBERPRO\nVersão ${CONTRACT_VERSION}\n\nCONTRATANTE\n${company.name}; responsável cadastrado: ${company.fullName}; CPF ${company.cpf}; endereço ${company.address}; contato ${company.email}.\nAceitante: ${actor.name}, ${actor.email}, conta ${actor.id}, declarando poderes para representar o contratante.\n\nCONDIÇÕES COMERCIAIS\nPlano anterior: ${from.name}.\nPlano contratado: ${describePlan(target)}\nPreço-base do ciclo: ${money(quote.basePrice)}.\nDesconto adicional de upgrade nesta contratação: ${quote.discountPercent}%.\nProfissionais adicionais: ${quote.additionalProfessionals}, a R$ 19,90/mês cada; adicional deste ciclo de ${to.months} mês(es): ${money(quote.additionalAmount)}. Liberados pelo administrador e cobrados a partir desta renovação, sem cobrança retroativa. Limite total contratado: ${planEntitlements(target).professionals + quote.additionalProfessionals} profissionais ativos agendáveis.\nTotal a pagar: ${money(quote.price)}, via PIX sujeito a confirmação. O total inclui o desconto semestral ou anual do catálogo quando aplicável. Não é parcela mensal.\nRenovação futura: preço integral do ciclo então oferecido e expressamente aceito, sem repetição automática do desconto adicional.\n\nVIGÊNCIA\nPeríodo anteriormente pago registrado: ${end ? new Date(end).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})+' (Brasília)' : 'nenhum período pago vigente registrado'}.\n${kind==='DOWNGRADE'?'A redução passa a valer ao fim do período já pago, se ainda vigente quando o pagamento for confirmado; caso contrário, após a confirmação. Os limites inferiores de profissionais devem ser respeitados desde a contratação da redução.':'A contratação libera os benefícios após a confirmação do pagamento. O novo ciclo é acrescentado ao saldo pago que ainda estiver vigente, ou começa na confirmação quando não houver saldo.'}\nNão há conversão proporcional de saldo. As datas efetivas são registradas após a aprovação do pagamento e ficam disponíveis no histórico. Se houver mudança das condições antes do envio do pedido, será necessário atualizar e aceitar o instrumento novamente.\n\n${CONTRACT_TEXT}\n\n${PRIVACY_TEXT}\n\nEste instrumento altera somente o plano, ciclo, preço e vigência descritos neste resumo. Demais disposições anteriores válidas permanecem, sem renúncia a direitos legais.`
  return {kind,version:CONTRACT_VERSION,privacyVersion:PRIVACY_VERSION,hash:digest(content),content,plan:target,amount:quote.price,baseAmount:quote.basePrice,discountPercent:quote.discountPercent,fromPlan:current}
}
export function verifyContractConsent(consent: ContractConsent | undefined, document: {hash:string;version:string}) {
  if (!consent?.accepted) throw new HttpError(400,'Leia e aceite o contrato ou aditivo antes de continuar.')
  if (consent.version!==document.version || consent.hash!==document.hash) throw new HttpError(409,'As condições foram atualizadas. Leia o documento atual e aceite novamente.')
}
