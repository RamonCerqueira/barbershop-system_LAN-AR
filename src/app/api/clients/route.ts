import { clientInput } from '@/lib/validation'
import { apiError } from '@/lib/http'
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

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim() || ''

    const clients = await prisma.client.findMany({
      where: {
        companyId: auth.companyId,
        ...(search
          ? {
              OR: [
                { fullName: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } }
              ]
            }
          : {})
      },
      include: {
        appointments: {
          orderBy: { date: 'desc' },
          take: 1,
          select: { date: true, status: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const formatted = clients.map((c) => ({
      ...c,
      lastVisit: c.appointments[0]?.date || null
    }))

    return jsonResponse(formatted)
  } catch (error) { return apiError(error) }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth || !auth.companyId) {
      return jsonResponse({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = clientInput.parse(await request.json())
    const { fullName, phone, email, address, birthDate, notes, rating, whatsappConsent, isActive } = body

    if (!fullName || !phone) {
      return jsonResponse(
        { error: 'Nome completo e telefone são obrigatórios' },
        { status: 400 }
      )
    }

    const client = await prisma.client.create({
      data: {
        fullName: String(fullName).trim(),
        phone: String(phone).trim(),
        email: email ? String(email).trim() : null,
        address: address ? String(address).trim() : null,
        birthDate: birthDate ? new Date(birthDate) : null,
        notes: notes ? String(notes).trim() : null,
        rating: rating !== undefined ? Number(rating) : null,
        whatsappConsent: whatsappConsent !== undefined ? Boolean(whatsappConsent) : false,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        companyId: auth.companyId
      }
    })

    return jsonResponse(client, { status: 201 })
  } catch (error) { return apiError(error) }
}

