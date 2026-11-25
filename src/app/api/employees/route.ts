import { lockCompany, assertProfessionalCapacity, SCHEDULABLE_ROLES } from '@/lib/entitlements'
import { employeeInput } from '@/lib/validation'
import { apiError } from '@/lib/http'
import { jsonResponse } from '@/lib/json'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { requireCompanySubscriptionAccess } from '@/lib/subscription'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth || !auth.companyId) {
      return jsonResponse({ error: 'Não autorizado' }, { status: 401 })
    }
    // The administrator can inspect and deactivate excess records even after expiry.
    const employees = await prisma.employee.findMany({
      where: { companyId: auth.companyId },
      include: {
        specialties: true,
        _count: {
          select: { appointments: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return jsonResponse(employees)
  } catch (error) { return apiError(error) }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth || !auth.companyId) {
      return jsonResponse({ error: 'Não autorizado' }, { status: 401 })
    }
    await requireCompanySubscriptionAccess(auth.companyId)

    const body = employeeInput.parse(await request.json())
    const {
      name,
      email,
      phone,
      role,
      customRole,
      salary,
      commissionRate,
      hireDate,
      isActive,
      specialties
    } = body

    if (!name || !phone) {
      return jsonResponse(
        { error: 'Nome e telefone do colaborador são obrigatórios' },
        { status: 400 }
      )
    }

    const validRoles = [
      'BARBER',
      'ADMIN',
      'MARKETING',
      'GENERAL_SERVICES',
      'PODIATRY',
      'MASSAGE',
      'OTHER'
    ]
    const resolvedRole = validRoles.includes(role || "BARBER") ? (role || 'BARBER') : 'BARBER'

    const parsedSpecialties: { specialty: string; level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT' }[] =
      Array.isArray(specialties)
        ? specialties
            .map((s: any) => {
              if (typeof s === 'string') {
                return { specialty: s.trim(), level: 'INTERMEDIATE' as const }
              }
              return {
                specialty: String(s.specialty || s.name || '').trim(),
                level: (['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'].includes(s.level)
                  ? s.level
                  : 'INTERMEDIATE') as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT'
              }
            })
            .filter((s) => s.specialty.length > 0)
        : []

    const employee = await prisma.$transaction(async tx => {
      await lockCompany(tx, auth.companyId!)
      if (isActive !== false && SCHEDULABLE_ROLES.some(r => r === resolvedRole)) await assertProfessionalCapacity(tx, auth.companyId!)
      return tx.employee.create({
      data: {
        name: String(name).trim(),
        email: email ? String(email).trim() : null,
        phone: String(phone).trim(),
        role: resolvedRole as any,
        customRole: customRole ? String(customRole).trim() : null,
        salary: salary !== undefined ? Number(salary) : 0,
        commissionRate: commissionRate !== undefined ? Number(commissionRate) : 0,
        hireDate: hireDate ? new Date(hireDate) : new Date(),
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        companyId: auth.companyId!,
        specialties: {
          create: parsedSpecialties
        }
      },
      include: {
        specialties: true
      }
    })

    })

    return jsonResponse(employee, { status: 201 })
  } catch (error) { return apiError(error) }
}

