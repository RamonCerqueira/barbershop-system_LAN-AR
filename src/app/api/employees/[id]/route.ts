import { employeeInput } from '@/lib/validation'
import { apiError } from '@/lib/http'
import { jsonResponse } from '@/lib/json'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(request)
    if (!auth || !auth.companyId) {
      return jsonResponse({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = employeeInput.partial().parse(await request.json())

    const existing = await prisma.employee.findFirst({
      where: { id, companyId: auth.companyId }
    })

    if (!existing) {
      return jsonResponse({ error: 'Colaborador não encontrado' }, { status: 404 })
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

    const updated = await prisma.$transaction(async (tx) => {
      if (Array.isArray(body.specialties)) {
        await tx.employeeSpecialty.deleteMany({
          where: { employeeId: id }
        })

        const parsedSpecialties = body.specialties
          .map((s: any) => {
            if (typeof s === 'string') {
              return { employeeId: id, specialty: s.trim(), level: 'INTERMEDIATE' as const }
            }
            return {
              employeeId: id,
              specialty: String(s.specialty || s.name || '').trim(),
              level: (['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'].includes(s.level)
                ? s.level
                : 'INTERMEDIATE') as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT',
              isActive: s.isActive !== undefined ? Boolean(s.isActive) : true
            }
          })
          .filter((s: any) => s.specialty.length > 0)

        if (parsedSpecialties.length > 0) {
          await tx.employeeSpecialty.createMany({
            data: parsedSpecialties,
            skipDuplicates: true
          })
        }
      }

      return tx.employee.update({
        where: { id },
        data: {
          name: body.name !== undefined ? String(body.name).trim() : existing.name,
          email:
            body.email !== undefined
              ? body.email
                ? String(body.email).trim()
                : null
              : existing.email,
          phone: body.phone !== undefined ? String(body.phone).trim() : existing.phone,
          role:
            body.role && validRoles.includes(body.role) ? body.role : existing.role,
          customRole:
            body.customRole !== undefined
              ? body.customRole
                ? String(body.customRole).trim()
                : null
              : existing.customRole,
          salary: body.salary !== undefined ? Number(body.salary) : existing.salary,
          commissionRate:
            body.commissionRate !== undefined
              ? Number(body.commissionRate)
              : existing.commissionRate,
          hireDate: body.hireDate ? new Date(body.hireDate) : existing.hireDate,
          isActive: body.isActive !== undefined ? Boolean(body.isActive) : existing.isActive
        },
        include: {
          specialties: true
        }
      })
    })

    return jsonResponse(updated)
  } catch (error) { return apiError(error) }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser(request)
    if (!auth || !auth.companyId) {
      return jsonResponse({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params

    const existing = await prisma.employee.findFirst({
      where: { id, companyId: auth.companyId }
    })

    if (!existing) {
      return jsonResponse({ error: 'Colaborador não encontrado' }, { status: 404 })
    }

    await prisma.employee.update({ where: { id }, data: { isActive: false } })
    return jsonResponse({ success: true })
  } catch (error) { return apiError(error) }
}

