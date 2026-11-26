import { lockCompany } from '@/lib/entitlements'
import { HttpError, apiError } from '@/lib/http'
import { evaluateCompanySubscription, settleScheduledPlan } from '@/lib/subscription'
import { planEntitlements, isAvailablePlan } from '@/lib/plans'
import { jsonResponse } from '@/lib/json'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

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
    const body = await request.json()

    await settleScheduledPlan(id)
    const existing = await prisma.company.findUnique({ where: { id } })
    if (!existing) {
      return jsonResponse({ error: 'Empresa não encontrada' }, { status: 404 })
    }

    if (body.plan !== undefined && body.plan !== existing.plan && !isAvailablePlan(body.plan)) {
      return jsonResponse({ error: 'Plano inválido' }, { status: 400 })
    }

    if (body.plan !== undefined && body.plan !== existing.plan) throw new HttpError(409,'Mudanças de plano exigem contrato ou aditivo aceito pela barbearia na página Assinatura & PIX. Aprove o pagamento correspondente para aplicar a alteração.')
    const newEmail = body.email !== undefined ? String(body.email).trim() : existing.email

    const updated = await prisma.$transaction(async (tx) => {
      await lockCompany(tx,id)
      const current = await tx.company.findUniqueOrThrow({where:{id}})
      if (body.plan !== undefined && body.plan !== current.plan) throw new HttpError(409,'O plano foi atualizado. Recarregue os dados; mudanças exigem aditivo aceito pela barbearia.')

      const additional = body.additionalProfessionals ?? current.additionalProfessionals
      if (!Number.isSafeInteger(additional) || additional < 0 || additional > 1000) throw new HttpError(400, 'Informe de 0 a 1000 vagas adicionais.')
      if (additional !== current.additionalProfessionals) {
        const pending = await tx.subscriptionPayment.count({where:{companyId:id,status:'PENDING'}})
        if (pending) throw new HttpError(409, 'Analise o PIX pendente antes de alterar os adicionais, para preservar o valor enviado pelo cliente.')
        const active = await tx.employee.count({where:{companyId:id,isActive:true,role:{in:['BARBER','PODIATRY','MASSAGE']}}})
        const trial = evaluateCompanySubscription(current).isTrial
        const limit = Math.min(planEntitlements(current.plan,trial).professionals,current.pendingPlan?planEntitlements(current.pendingPlan).professionals:Infinity) + additional
        if(active > limit) throw new HttpError(409, `Existem ${active} profissionais ativos; desative os excedentes antes de reduzir para ${limit} vagas.`)
        await tx.auditLog.create({data:{companyId:id,actorId:auth.id,action:`PROFESSIONAL_ADDONS_CHANGED:${current.additionalProfessionals}->${additional}`,entityId:id}})
      }
      const company = await tx.company.update({
        where: { id },
        data: {
          name: body.name !== undefined ? String(body.name).trim() : existing.name,
          fullName: body.fullName !== undefined ? String(body.fullName).trim() : existing.fullName,
          email: newEmail,
          phone: body.phone !== undefined ? String(body.phone).trim() : existing.phone,
          plan: current.plan,
          additionalProfessionals: additional,
          planPrice: current.planPrice,
          isActive: body.isActive !== undefined ? Boolean(body.isActive) : existing.isActive
        }
      })

      if (newEmail !== existing.email) {
        await tx.user.updateMany({
          where: { companyId: id, email: existing.email },
          data: { email: newEmail }
        })
      }

      return company
    })

    return jsonResponse(updated)
  } catch (error: any) {
    if (error instanceof HttpError) return apiError(error)
    console.error('Erro ao atualizar empresa pelo admin:', error)
    if (error.code === 'P2002') {
      return jsonResponse({ error: 'Este e-mail já está em uso por outra conta' }, { status: 409 })
    }
    return jsonResponse({ error: 'Erro ao atualizar empresa' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(request)
    if (!auth || auth.type !== 'SYSTEM_OWNER') {
      return jsonResponse({ error: 'Acesso restrito ao Super Admin' }, { status: 403 })
    }

    const { id } = await params
    await prisma.company.update({ where: { id }, data: { isActive: false } })
    return jsonResponse({ success: true })
  } catch (error) {
    console.error('Erro ao excluir empresa pelo admin:', error)
    return jsonResponse({ error: 'Erro ao excluir empresa' }, { status: 500 })
  }
}

