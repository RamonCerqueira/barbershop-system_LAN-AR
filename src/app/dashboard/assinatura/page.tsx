'use client'

import Link from 'next/link'
import LegalAcceptance, {type LegalConsent} from '@/components/LegalAcceptance'
import type { Plan } from '@prisma/client'
import { SUBSCRIPTION_PLANS, isAvailablePlan, planEntitlements } from '@/lib/plans'

import React, { useCallback, useEffect, useState } from 'react'
import {
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  CreditCard,
  FileText,
  Lock,
  QrCode,
  ShieldCheck,
  Sparkles,
  Upload,
  XCircle
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { formatCurrencyBRL } from '@/lib/masks'
import {
  SaasAlert,
  SaasField,
  SaasPageHeader,
  SaasSectionCard,
  SaasSubmitButton,
  saasInputClass
} from '@/components/ui/SaasUI'

interface PlanOption {
  code: Plan
  name: string
  price: number
  basePrice: number
  discountPercent: number
  durationDays: number
  periodLabel: string
  description: string
}

interface PaymentRecord {
  contractAcceptance: {id:string;kind:string;documentHash:string;acceptedAt:string}|null
  id: string
  plan: Plan
  amount: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  pixKey: string
  pixBeneficiary: string
  pixBank: string
  payerNote: string | null
  proofFilePath: string | null
  proofFileName: string | null
  submittedAt: string
  reviewedAt: string | null
  reviewedByName: string | null
  rejectionReason: string | null
  periodEnd: string | null
}

interface SubscriptionPayload {
  company: { id: string; name: string; email: string; isActive: boolean }
  subscription: {
    effectiveStatus: 'TRIAL' | 'ACTIVE' | 'PENDING_PAYMENT' | 'PAST_DUE' | 'SUSPENDED' | 'BLOCKED'
    hasAccess: boolean
    isTrial: boolean
    isBlocked: boolean
    daysRemaining: number
    expiresAt: string
    trialEndsAt: string
    currentPeriodEnd: string | null
    plan: Plan
    planName: string
    planPrice: number
    warningLevel: 'none' | 'info' | 'warning' | 'danger'
    message: string
  }
  pix: {
    key: string
    keyType: string
    beneficiary: string
    institution: string
  }
  pendingPlan: Plan | null
  pendingPlanStartsAt: string | null
  plans: PlanOption[]
  payments: PaymentRecord[]
}

export default function AssinaturaPage() {
  const [data, setData] = useState<SubscriptionPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<Plan>('MONTHLY')
  const [payerNote, setPayerNote] = useState('')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [legalConsent,setLegalConsent]=useState<LegalConsent|null>(null)
  const updateConsent=useCallback((value:LegalConsent)=>setLegalConsent(value),[])
  const [submitting, setSubmitting] = useState(false)
  const [copiedPix, setCopiedPix] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isWelcome, setIsWelcome] = useState(false)

  const loadSubscription = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/api/subscription')
      if (res.ok) {
        const json: SubscriptionPayload = await res.json()
        setData(json)
        setSelectedPlan(isAvailablePlan(json.subscription.plan) ? json.subscription.plan : 'MONTHLY')
      }
    } catch (err) {
      console.error('Erro ao carregar assinatura:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('welcome') === '1') setIsWelcome(true)
    }
    void loadSubscription()
  }, [loadSubscription])

  const handleCopyPix = async () => {
    if (!data?.pix?.key) return
    try {
      await navigator.clipboard.writeText(data.pix.key)
      setCopiedPix(true)
      setTimeout(() => setCopiedPix(false), 2500)
    } catch {
      setFeedback({ type: 'error', text: 'Não foi possível copiar automaticamente. Copie a chave manualmente.' })
    }
  }

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setFeedback(null)
    setSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('plan', selectedPlan)
      formData.append('payerNote', payerNote.trim())
      formData.append('acceptContract',String(Boolean(legalConsent?.accepted && legalConsent.plan===selectedPlan)))
      formData.append('contractHash',legalConsent?.hash || '')
      formData.append('contractVersion',legalConsent?.version || '')
      if (proofFile) {
        formData.append('proof', proofFile)
      }

      const res = await apiFetch('/api/subscription/payments', {
        method: 'POST',
        body: formData
      })

      const body = await res.json()
      if (!res.ok) {
        throw new Error(body.error || 'Não foi possível registrar o pagamento.')
      }

      setPayerNote('')
      setProofFile(null)
      setFeedback({
        type: 'success',
        text: body.message || 'Pagamento PIX enviado! Aguarde a confirmação do administrador.'
      })
      await loadSubscription()
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Erro ao enviar solicitação de pagamento.'
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="h-20 animate-pulse rounded-2xl bg-white/5" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="h-72 animate-pulse rounded-2xl bg-white/5" />
          <div className="h-72 animate-pulse rounded-2xl bg-white/5" />
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <SaasAlert
        variant="error"
        title="Não foi possível carregar sua assinatura"
        message="Atualize a página ou tente novamente em instantes."
      />
    )
  }

  const { subscription, pix, plans, payments } = data
  const pendingPayment = payments.find((p) => p.status === 'PENDING')
  const activePlanObj = pendingPayment
    ? { ...SUBSCRIPTION_PLANS[pendingPayment.plan], basePrice: SUBSCRIPTION_PLANS[pendingPayment.plan].price, discountPercent: 0 }
    : plans.find((p) => p.code === selectedPlan) || plans[0]
  const trialProgress = subscription.isTrial
    ? Math.min(100, Math.max(8, Math.round(((7 - subscription.daysRemaining) / 7) * 100)))
    : 100

  const formatBr = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—'

  return (
    <div className="space-y-6">
      <SaasPageHeader
        kicker="Assinatura & Faturamento"
        title="Plano, Período Gratuito e Pagamento PIX"
        subtitle="Gerencie sua assinatura, acompanhe os dias restantes e envie comprovantes PIX com segurança."
      />

      {isWelcome && (
        <SaasAlert
          variant="success"
          title="Cadastro concluído com sucesso! Seus 7 dias gratuitos estão ativos."
          message={`Você já tem acesso completo ao sistema até ${formatBr(subscription.trialEndsAt)}. Se preferir, você já pode realizar o pagamento via PIX abaixo para garantir a continuidade após o período gratuito.`}
        />
      )}

      {subscription.isBlocked && (
        <SaasAlert
          variant="error"
          title="Acesso às funcionalidades bloqueado"
          message={subscription.message}
        />
      )}

      {!subscription.isBlocked && subscription.isTrial && (
        <SaasAlert
          variant={subscription.warningLevel === 'danger' ? 'warning' : 'info'}
          title={`Período de avaliação gratuita: ${subscription.daysRemaining} dia(s) restante(s)`}
          message={`Seu teste gratuito encerra em ${formatBr(subscription.trialEndsAt)}. Realize o pagamento via PIX antes do término para continuar utilizando o sistema sem interrupções.`}
        />
      )}

      {feedback && (
        <SaasAlert
          variant={feedback.type}
          title={feedback.type === 'success' ? 'Solicitação registrada' : 'Atenção'}
          message={feedback.text}
        />
      )}

      {/* Status atual da assinatura */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="mb-5 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5 text-sm text-slate-300">
        <p>Sete dias de teste com recursos Elite, sem WhatsApp automático. Após o teste, valem os recursos do plano pago. Semestral tem 10% e anual 15% de desconto; o total do ciclo é pago via PIX.</p>
        <p className="mt-2">Upgrade elegível semestral ou anual recebe 10% adicional nesta contratação. O upgrade libera recursos após aprovação e soma o ciclo ao período já pago. Reduções entram na próxima renovação e exigem adequar os profissionais ativos.</p>
        {data?.pendingPlan && <p className="mt-2 font-semibold text-amber-300">Mudança agendada: {SUBSCRIPTION_PLANS[data.pendingPlan].name}, a partir de {data.pendingPlanStartsAt ? new Date(data.pendingPlanStartsAt).toLocaleDateString('pt-BR') : 'sua renovação'}.</p>}
        <div className="mt-4 grid gap-3 md:grid-cols-3">{(['MONTHLY','PRO_MONTHLY','ELITE_MONTHLY'] as const).map(code=><div key={code} className="rounded-xl border border-white/10 p-3"><strong>{SUBSCRIPTION_PLANS[code].name.split(' — ')[0]}</strong><p className="mt-1">Até {planEntitlements(code).professionals} profissionais ativos.</p><p className="mt-1 text-xs">{code==='MONTHLY'?'Agenda, clientes, histórico, link e portal do cliente.':code==='PRO_MONTHLY'?'Tudo do Essencial, caixa, financeiro, comissões, produtos, estoque e 3.000 envios WhatsApp/mês.':'Tudo do Profissional, custos, Curva ABC de serviços, análises avançadas, campanhas e 6.000 envios WhatsApp/mês.'}</p></div>)}</div>
      </div>
      <SaasSectionCard
          title="Situação da Assinatura"
          icon={<ShieldCheck size={20} />}
          className="lg:col-span-1"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0d1117] p-3.5">
              <span className="text-xs font-medium text-slate-400">Status atual</span>
              {subscription.effectiveStatus === 'ACTIVE' && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-400">
                  <CheckCircle2 size={14} /> Assinatura Ativa
                </span>
              )}
              {subscription.effectiveStatus === 'TRIAL' && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-[#f5b51b]">
                  <Sparkles size={14} /> Avaliação 7 Dias
                </span>
              )}
              {(subscription.effectiveStatus === 'BLOCKED' || subscription.effectiveStatus === 'SUSPENDED') && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-3 py-1 text-xs font-bold text-red-400">
                  <Lock size={14} /> Acesso Bloqueado
                </span>
              )}
            </div>

            {subscription.isTrial && (
              <div className="space-y-2 rounded-xl border border-white/10 bg-[#0d1117] p-3.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Período gratuito de 7 dias</span>
                  <span className="font-bold text-[#f5b51b]">
                    {subscription.daysRemaining} dia(s) restante(s)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#f5b51b] to-[#dc9b2d] transition-all"
                    style={{ width: `${trialProgress}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Encerra em {formatBr(subscription.trialEndsAt)}
                </p>
              </div>
            )}

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-slate-400">Plano atual:</span>
                <span className="font-semibold text-white">{subscription.planName}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-slate-400">Valor do plano:</span>
                <span className="font-semibold text-[#f5b51b]">
                  {formatCurrencyBRL(subscription.planPrice)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">
                  {subscription.currentPeriodEnd ? 'Próximo vencimento:' : 'Fim da avaliação:'}
                </span>
                <span className="font-semibold text-white">
                  {formatBr(subscription.expiresAt)}
                </span>
              </div>
            </div>
          </div>
        </SaasSectionCard>

        {/* Dados para Pagamento PIX + Formulário */}
        <SaasSectionCard
          title="Pagamento via PIX"
          description="Transfira o valor do plano selecionado e envie a confirmação. A liberação ocorre após conferência do SUPERADMIN."
          icon={<QrCode size={20} />}
          className="lg:col-span-2"
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Dados PIX */}
            <div className="space-y-4 rounded-2xl border border-[#f5b51b]/25 bg-[#0d1117] p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#f5b51b]">
                  Dados Oficiais PIX
                </span>
                <CreditCard size={18} className="text-[#f5b51b]" />
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-slate-400">Chave PIX ({pix.keyType})</p>
                  <div className="mt-1 flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2">
                    <span className="font-mono text-base font-bold text-white">{pix.key}</span>
                    <button
                      type="button"
                      onClick={handleCopyPix}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#f5b51b]/15 px-2.5 py-1 text-xs font-semibold text-[#f5b51b] transition hover:bg-[#f5b51b]/25"
                    >
                      {copiedPix ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copiedPix ? 'Copiada!' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 border-t border-white/10 pt-3">
                  <div>
                    <p className="text-xs text-slate-400">Beneficiário</p>
                    <p className="font-semibold text-white">{pix.beneficiary}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Instituição</p>
                    <p className="font-semibold text-white">{pix.institution}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Descrição da Assinatura</p>
                    <p className="text-xs text-slate-200">{activePlanObj.description}</p>
                  </div>
                  <div className="mt-1 flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                    <span className="text-xs text-slate-300">Valor a pagar:</span>
                    <span className="text-lg font-extrabold text-[#f5b51b]">
                      {formatCurrencyBRL(pendingPayment ? pendingPayment.amount : activePlanObj.price)}
                      {activePlanObj.discountPercent > 0 && !pendingPayment && <span className="block text-xs">10% de desconto no upgrade (de {formatCurrencyBRL(activePlanObj.basePrice)})</span>}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Formulário de confirmação */}
            <form onSubmit={handleSubmitPayment} className="space-y-4">
              {pendingPayment ? (
                <SaasAlert
                  variant="warning"
                  title="Pagamento em análise"
                  message={`Você já enviou uma solicitação de pagamento (${formatCurrencyBRL(pendingPayment.amount)}) em ${formatBr(pendingPayment.submittedAt)}. Assim que o administrador confirmar o PIX, seu acesso será liberado automaticamente.`}
                />
              ) : (
                <>
                  <p className="text-xs text-slate-400">Upgrades para seis ou doze meses têm 10% de desconto na contratação. Renovações seguem o preço de tabela.</p>
                  <SaasField label="Escolha o Plano" required htmlFor="pix-plan">
                    <select
                      id="pix-plan"
                      value={selectedPlan}
                      onChange={(e) => setSelectedPlan(e.target.value as PlanOption['code'])}
                      className={saasInputClass}
                    >
                      {plans.map((p) => (
                        <option key={p.code} value={p.code}>
                          {p.name} — {formatCurrencyBRL(p.price)}{p.discountPercent ? " (10% de desconto)" : ""}
                        </option>
                      ))}
                    </select>
                  </SaasField>

                  <SaasField
                    label="Comprovante PIX (Opcional, recomendado)"
                    htmlFor="pix-proof"
                    hint="Formatos aceitos: PNG, JPG, WEBP ou PDF (máx. 5 MB)."
                  >
                    <label
                      htmlFor="pix-proof"
                      className="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-white/20 bg-[#090c10]/70 px-3.5 py-3 text-xs text-slate-300 transition hover:border-[#f5b51b]/60"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <Upload size={16} className="shrink-0 text-[#f5b51b]" />
                        <span className="truncate">
                          {proofFile
                            ? `${proofFile.name} (${Math.round(proofFile.size / 1024)} KB)`
                            : 'Selecionar arquivo de comprovante...'}
                        </span>
                      </span>
                      <input
                        id="pix-proof"
                        type="file"
                        accept=".png,.jpg,.jpeg,.webp,.pdf,image/png,image/jpeg,image/webp,application/pdf"
                        className="sr-only"
                        onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                      />
                    </label>
                  </SaasField>

                  <SaasField
                    label="Observação do Pagamento"
                    htmlFor="pix-note"
                    hint="Informe nome do pagador ou horário da transferência para agilizar a conferência."
                  >
                    <textarea
                      id="pix-note"
                      rows={2}
                      maxLength={500}
                      value={payerNote}
                      onChange={(e) => setPayerNote(e.target.value)}
                      placeholder="Ex: PIX enviado às 14:20 por João Silva"
                      className={saasInputClass}
                    />
                  </SaasField>

                  <LegalAcceptance plan={selectedPlan} onChange={updateConsent}/>
                  <SaasSubmitButton
                    disabled={!legalConsent?.accepted || legalConsent.plan!==selectedPlan}
                    loading={submitting}
                    loadingText="Enviando solicitação..."
                    className="w-full"
                  >
                    Informar Pagamento Realizado
                  </SaasSubmitButton>
                </>
              )}
            </form>
          </div>
        </SaasSectionCard>
      </div>

      <Link href="/dashboard/colaboradores" className="mr-5 inline-flex items-center gap-2 text-sm font-semibold text-amber-300">Adequar profissionais ao limite do plano</Link>
      <Link href="/dashboard/contratos" className="inline-flex items-center gap-2 text-sm font-semibold text-amber-300"><FileText size={18}/>Consultar contratos e aditivos aceitos</Link>
      {/* Histórico de Pagamentos */}
      <SaasSectionCard
        title="Histórico de Pagamentos da Assinatura"
        icon={<FileText size={20} />}
      >
        {payments.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            Nenhuma solicitação de pagamento registrada até o momento.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase text-slate-400">
                <tr>
                  <th className="py-3 pr-4">Data</th>
                  <th className="py-3 pr-4">Plano</th>
                  <th className="py-3 pr-4">Valor</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Comprovante</th>
                  <th className="py-3">Detalhes / Revisão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.02]">
                    <td className="py-3.5 pr-4 text-slate-300">{formatBr(p.submittedAt)}</td>
                    <td className="py-3.5 pr-4 font-medium text-white">
                      {SUBSCRIPTION_PLANS[p.plan]?.name || p.plan}
                    </td>
                    <td className="py-3.5 pr-4 font-semibold text-[#f5b51b]">
                      {formatCurrencyBRL(p.amount)}
                    </td>
                    <td className="py-3.5 pr-4">
                      {p.status === 'PENDING' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-[#f5b51b]">
                          <Clock3 size={12} /> Pendente
                        </span>
                      )}
                      {p.status === 'APPROVED' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                          <CheckCircle2 size={12} /> Aprovado
                        </span>
                      )}
                      {p.status === 'REJECTED' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-semibold text-red-400">
                          <XCircle size={12} /> Rejeitado
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 pr-4">
                      {p.proofFilePath ? (
                        <a
                          href={`/api/subscription/proof/${p.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-sky-400 underline hover:text-sky-300"
                        >
                          Ver comprovante
                        </a>
                      ) : (
                        <span className="text-xs text-slate-500">Sem anexo</span>
                      )}
                    </td>
                    <td className="py-3.5 text-xs text-slate-400">
                      {p.status === 'APPROVED' &&
                        `Aprovado por ${p.reviewedByName || 'SuperAdmin'} em ${formatBr(p.reviewedAt)} • Válido até ${formatBr(p.periodEnd)}`}
                      {p.status === 'REJECTED' && `Motivo: ${p.rejectionReason || 'Não informado'}`}
                      {p.status === 'PENDING' && (p.payerNote || 'Aguardando verificação do administrador')}
                      {p.contractAcceptance && <a href={`/api/contracts/${p.contractAcceptance.id}?download=true`} className="mt-2 block text-amber-300 underline">Baixar contrato / aditivo aceito</a>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SaasSectionCard>
    </div>
  )
}
