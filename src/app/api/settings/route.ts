import { jsonResponse } from '@/lib/json'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth || !auth.companyId) {
      return jsonResponse({ error: 'Não autorizado' }, { status: 401 })
    }

    const [company, settings] = await Promise.all([
      prisma.company.findUnique({ where: { id: auth.companyId } }),
      prisma.companySettings.findUnique({ where: { companyId: auth.companyId } })
    ])

    if (!company) {
      return jsonResponse({ error: 'Empresa não encontrada' }, { status: 404 })
    }

    return jsonResponse({
      general: {
        name: company.name,
        email: company.email,
        phone: company.phone,
        address: company.address,
        fullName: company.fullName,
        cpf: company.cpf,
        plan: company.plan,
        description:
          (settings?.locationConfig as any)?.description ||
          'Barbearia moderna com atendimento de excelência',
        website: (settings?.locationConfig as any)?.website || ''
      },
      businessHours: settings?.businessHours || {},
      appointmentConfig: settings?.appointmentConfig || {},
      whatsappConfig: { ...((settings?.whatsappConfig as Record<string, unknown>) || {}), apiToken: '', apiUrl: '' },
      locationConfig: settings?.locationConfig || {},
      notificationConfig: settings?.notificationConfig || {}
    })
  } catch (error) {
    console.error('Erro ao carregar configurações:', error)
    return jsonResponse({ error: 'Erro ao carregar configurações' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth || !auth.companyId) {
      return jsonResponse({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const {
      general,
      businessHours,
      appointmentConfig,
      whatsappConfig,
      locationConfig,
      notificationConfig
    } = body

    if (whatsappConfig) { delete whatsappConfig.apiToken; delete whatsappConfig.apiUrl }
    const updated = await prisma.$transaction(async (tx) => {
      if (general) {
        const currentCompany = await tx.company.findUnique({
          where: { id: auth.companyId! }
        })
        const nextEmail = general.email ? String(general.email).trim() : undefined

        await tx.company.update({
          where: { id: auth.companyId! },
          data: {
            name: general.name ? String(general.name).trim() : undefined,
            email: nextEmail,
            phone: general.phone ? String(general.phone).trim() : undefined,
            address: general.address ? String(general.address).trim() : undefined
          }
        })

        if (currentCompany && nextEmail && nextEmail !== currentCompany.email) {
          await tx.user.updateMany({
            where: { companyId: auth.companyId!, email: currentCompany.email },
            data: { email: nextEmail }
          })
        }
      }

      const previousSettings = await tx.companySettings.findUnique({ where: { companyId: auth.companyId! } })
      const mergedLocation = {
        ...((previousSettings?.locationConfig as Record<string, unknown>) || {}),
        ...(locationConfig || {}),
        ...(general?.description !== undefined ? { description: String(general.description) } : {}),
        ...(general?.website !== undefined ? { website: String(general.website) } : {})
      }

      return tx.companySettings.upsert({
        where: { companyId: auth.companyId! },
        update: {
          businessHours: businessHours ?? undefined,
          appointmentConfig: appointmentConfig ?? undefined,
          whatsappConfig: whatsappConfig ?? undefined,
          locationConfig: mergedLocation,
          notificationConfig: notificationConfig ?? undefined
        },
        create: {
          companyId: auth.companyId!,
          businessHours: businessHours || {},
          appointmentConfig: appointmentConfig || {},
          whatsappConfig: whatsappConfig || {},
          locationConfig: mergedLocation,
          notificationConfig: notificationConfig || {}
        }
      })
    })

    return jsonResponse({
      message: 'Configurações salvas no banco de dados com sucesso!',
      settings: { ...updated, whatsappConfig: { ...((updated.whatsappConfig as Record<string, unknown>) || {}), apiToken: undefined, apiUrl: undefined } }
    })
  } catch (error: any) {
    console.error('Erro ao salvar configurações:', error)
    if (error.code === 'P2002') {
      return jsonResponse(
        { error: 'Este e-mail já está sendo utilizado por outra empresa' },
        { status: 409 }
      )
    }
    return jsonResponse({ error: 'Erro ao salvar configurações' }, { status: 500 })
  }
}

