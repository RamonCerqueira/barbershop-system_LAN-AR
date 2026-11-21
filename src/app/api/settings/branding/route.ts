import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { jsonResponse } from '@/lib/json'
import { apiError, HttpError } from '@/lib/http'
import { logoUrl } from '@/lib/company-logo'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth?.companyId) throw new HttpError(401, 'Não autorizado')
    const company = await prisma.company.findUnique({ where: { id: auth.companyId }, select: { name: true, logoPath: true } })
    if (!company) throw new HttpError(404, 'Empresa não encontrada')
    return jsonResponse({ name: company.name, logoUrl: logoUrl(company.logoPath) }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return apiError(error) }
}
