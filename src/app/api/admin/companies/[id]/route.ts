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

    const existing = await prisma.company.findUnique({ where: { id } })
    if (!existing) {
      return jsonResponse({ error: 'Empresa não encontrada' }, { status: 404 })
    }

    const planPrices: Record<string, number> = {
      MONTHLY: 10.0,
      QUARTERLY: 30.0,
      ANNUAL: 120.0
    }

    const newPlan =
      body.plan && ['MONTHLY', 'QUARTERLY', 'ANNUAL'].includes(body.plan)
        ? body.plan
        : existing.plan

    const newEmail = body.email !== undefined ? String(body.email).trim() : existing.email

    const updated = await prisma.$transaction(async (tx) => {
      const company = await tx.company.update({
        where: { id },
        data: {
          name: body.name !== undefined ? String(body.name).trim() : existing.name,
          fullName: body.fullName !== undefined ? String(body.fullName).trim() : existing.fullName,
          email: newEmail,
          phone: body.phone !== undefined ? String(body.phone).trim() : existing.phone,
          plan: newPlan as any,
          planPrice:
            body.planPrice !== undefined
              ? Number(body.planPrice)
              : body.plan
                ? planPrices[newPlan]
                : existing.planPrice,
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

